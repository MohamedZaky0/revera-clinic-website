import { isAuthApiError, isAuthRetryableFetchError } from "@supabase/supabase-js";

/**
 * RISK-134: verify a staff bearer token without asking the Supabase Auth server on every request.
 *
 * `auth.getUser(token)` is one HTTP call to `/auth/v1/user` per API request, which on production
 * added up to ~68,000 Auth requests an hour and, with the stall guard repeating slow reads (RISK-131),
 * kept the Nano instance Unhealthy.
 *
 * `auth.getClaims(token)` (read from @supabase/auth-js 2.108.1, GoTrueClient.getClaims):
 *  - ES256 / RS256 token WITH a `kid`: signature verified locally with WebCrypto against the project's
 *    JWKS (fetched once, kept ~10 min per process). Steady state: ZERO Auth-server calls.
 *  - HS* (legacy shared secret) token, no `kid`, empty JWKS or a `kid` the JWKS does not list: falls
 *    back to `getUser(token)`, one Auth-server call. There is NO gain for a project still on the legacy
 *    HS256 secret except through the cache below.
 *  - It rejects expired tokens (no leeway) but does NOT check iss, aud, role, sub or is_anonymous, and it
 *    THROWS raw exceptions for some malformed tokens instead of returning an error. This wrapper checks
 *    all of that and turns every throw into a verdict.
 *
 * Cost control on top of that:
 *  - successful checks are cached (SHA-256 of the token as key, never the raw token, never logged) for
 *    TOKEN_CACHE_TTL_MS or until the token expires, bounded to MAX_CACHE_ENTRIES; concurrent checks of
 *    the same token share one call. A cache hit never reaches the Auth server.
 *  - "Auth server unreachable" is remembered for a few seconds so a burst does not each retry it.
 *  - a bogus `kid` costs a JWKS fetch plus a /user call (the library has no negative cache), so unproven
 *    key ids are probed at most MAX_UNPROVEN_KIDS_PER_MINUTE times a minute and a kid that failed is
 *    refused from memory for UNKNOWN_KID_COOLDOWN_MS.
 *
 * Nothing here retries: the client passed in already carries the stall guard (createStallGuardFetch),
 * and a second retry layer would multiply calls to an Auth server that is already struggling.
 *
 * A token is only proof of identity. An inactive employee (DEC-117) is refused by the database lookup
 * in requireStaffAccess / verifyHrAccess / auth/me on every request, whatever this returns.
 */

/** Successful checks are remembered this long (never longer than the token's own expiry). */
export const TOKEN_CACHE_TTL_MS = 60_000;
/** "Auth server unreachable" is remembered briefly so a burst of requests does not each retry it. */
export const UNAVAILABLE_CACHE_TTL_MS = 3_000;
export const MAX_CACHE_ENTRIES = 500;
/** A key id that failed verification is refused without any network call for this long. */
export const UNKNOWN_KID_COOLDOWN_MS = 60_000;
/** Distinct never-seen key ids allowed to trigger a JWKS refresh / Auth fallback per minute (a real rotation needs 1). */
export const MAX_UNPROVEN_KIDS_PER_MINUTE = 5;
const MAX_KID_ENTRIES = 100;

export type VerifiedUser = { id: string; email: string | null; phone: string | null };

export type TokenVerification =
  | { ok: true; user: VerifiedUser }
  /** `invalid`: the token is bad (401). `unavailable`: could not be judged right now (503, keep the session). */
  | { ok: false; reason: "invalid" | "unavailable"; message: string };

/** The only part of a Supabase client this helper needs. */
export type ClaimsClient = {
  auth: { getClaims: (jwt: string) => Promise<{ data: { claims?: any } | null; error: any }> };
};

export type VerifyOptions = {
  /** Project URL used to pin the token issuer (`<url>/auth/v1`). Defaults to NEXT_PUBLIC_SUPABASE_URL. */
  supabaseUrl?: string;
};

type CacheEntry = { result: TokenVerification; expiresAt: number };

const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<TokenVerification>>();
const provenKids = new Set<string>();
const badKids = new Map<string, number>(); // kid -> refused until
const probedKids = new Map<string, number>(); // kid -> first probe time in the current minute

/** Forget everything remembered (tests, and a hook if sessions ever need to be revoked at once). */
export function clearTokenCache(): void {
  cache.clear();
  inFlight.clear();
  provenKids.clear();
  badKids.clear();
  probedKids.clear();
}

/** SHA-256 hex of the token: the cache is never keyed by, and nothing logs, the raw token. */
async function fingerprint(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

function trimMap<K, V>(map: Map<K, V>, max: number) {
  while (map.size >= max) {
    const oldest = map.keys().next().value;
    if (oldest === undefined) break;
    map.delete(oldest);
  }
}

function remember(key: string, result: TokenVerification, expiresAt: number) {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const now = Date.now();
    for (const [k, v] of cache) if (v.expiresAt <= now) cache.delete(k);
    trimMap(cache, MAX_CACHE_ENTRIES); // still full: drop the oldest insertions
  }
  cache.set(key, { result, expiresAt });
}

function isUnavailable(error: unknown): boolean {
  if (isAuthRetryableFetchError(error)) return true;
  // The Auth server answered but is rate-limiting or failing: says nothing about this token.
  return isAuthApiError(error) && (error.status === 429 || error.status >= 500);
}

/** Decode one base64url JWT segment as JSON, or null. (atob exists in Node and the Edge runtime.) */
function decodeSegment(segment: string | undefined): Record<string, any> | null {
  if (!segment) return null;
  try {
    const b64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const value = JSON.parse(new TextDecoder().decode(bytes));
    return value && typeof value === "object" ? value : null;
  } catch {
    return null;
  }
}

function audienceOk(aud: unknown): boolean {
  return aud === "authenticated" || (Array.isArray(aud) && aud.includes("authenticated"));
}

function strOrNull(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

/** Supabase user ids are UUIDs; this stays permissive on shape (letters, digits, dash, underscore) but strict on junk. */
const SUBJECT_RE = /^[A-Za-z0-9_-]{1,128}$/;

function expectedIssuer(options: VerifyOptions): string | null {
  const base = (options.supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
  return base ? `${base}/auth/v1` : null;
}

const invalid = (message: string): TokenVerification => ({ ok: false, reason: "invalid", message });
const INVALID_SESSION = "Invalid or expired session";

/** Checks getClaims does not do. Returns the verdict and the expiry (seconds) for cache lifetime. */
function judgeClaims(claims: any, options: VerifyOptions): { result: TokenVerification; exp?: number } {
  if (!claims || typeof claims !== "object") return { result: invalid(INVALID_SESSION) };

  const sub = strOrNull(claims.sub);
  if (!sub || !SUBJECT_RE.test(sub)) return { result: invalid("Invalid session: no subject") };
  if (!audienceOk(claims.aud)) return { result: invalid("Invalid session: wrong audience") };
  if (claims.role !== "authenticated") return { result: invalid("Invalid session: wrong role") };
  if (claims.is_anonymous === true) return { result: invalid("Invalid session: anonymous user") };
  const issuer = expectedIssuer(options);
  if (issuer && claims.iss !== issuer) return { result: invalid("Invalid session: wrong issuer") };
  const exp = typeof claims.exp === "number" ? claims.exp : NaN;
  // getClaims already rejects expired tokens; this also refuses one that carries no expiry at all.
  if (!Number.isFinite(exp) || exp * 1000 <= Date.now()) return { result: invalid(INVALID_SESSION) };

  return {
    result: { ok: true, user: { id: sub, email: strOrNull(claims.email), phone: strOrNull(claims.phone) } },
    exp,
  };
}

/** For an asymmetric token carrying a kid we have never seen verify: may we spend network on it? */
function gateUnprovenKid(kid: string): boolean {
  const now = Date.now();
  const until = badKids.get(kid);
  if (until !== undefined) {
    if (until > now) return false;
    badKids.delete(kid);
  }
  for (const [k, at] of probedKids) if (now - at > 60_000) probedKids.delete(k);
  if (!probedKids.has(kid)) {
    if (probedKids.size >= MAX_UNPROVEN_KIDS_PER_MINUTE) return false;
    probedKids.set(kid, now);
  }
  return true;
}

async function verifyUncached(
  token: string,
  client: ClaimsClient,
  options: VerifyOptions,
): Promise<{ result: TokenVerification; exp?: number }> {
  // A missing client (env not configured) is a server fault, not a bad token: let the caller answer 500.
  if (typeof client?.auth?.getClaims !== "function") throw new Error("Supabase client is not configured");

  // What getClaims will route on, read without trusting it: an expired token is refused here with no
  // network, and an asymmetric token with an unproven kid is rate-limited.
  const parts = token.split(".");
  const header = parts.length === 3 ? decodeSegment(parts[0]) : null;
  const payload = parts.length === 3 ? decodeSegment(parts[1]) : null;
  if (payload && typeof payload.exp === "number" && payload.exp * 1000 <= Date.now()) {
    return { result: invalid(INVALID_SESSION) };
  }
  const kid =
    header && typeof header.kid === "string" && typeof header.alg === "string" && !header.alg.startsWith("HS") && header.alg !== "none"
      ? header.kid
      : null;
  const unproven = kid !== null && !provenKids.has(kid);
  if (unproven && kid && !gateUnprovenKid(kid)) return { result: invalid(INVALID_SESSION) };

  let response: Awaited<ReturnType<ClaimsClient["auth"]["getClaims"]>>;
  try {
    response = await client.auth.getClaims(token);
  } catch {
    // getClaims returns AuthErrors but THROWS anything else (alg none with a kid, PS256, an RS256 header
    // against an EC key, a non-JSON payload...), and all of that comes from the token itself. Network
    // failures never reach here (they come back as AuthRetryableFetchError).
    if (unproven) markBadKid(kid);
    return { result: invalid(INVALID_SESSION) };
  }

  const { data, error } = response;
  if (error) {
    if (isUnavailable(error)) {
      return { result: { ok: false, reason: "unavailable", message: "Could not verify the session right now. Please try again." } };
    }
    if (unproven) markBadKid(kid);
    return { result: invalid(typeof error?.message === "string" && error.message ? error.message : INVALID_SESSION) };
  }

  if (unproven && kid) {
    provenKids.add(kid);
    badKids.delete(kid);
    probedKids.delete(kid);
  }
  return judgeClaims(data?.claims, options);
}

function markBadKid(kid: string | null) {
  if (!kid) return;
  trimMap(badKids, MAX_KID_ENTRIES);
  badKids.set(kid, Date.now() + UNKNOWN_KID_COOLDOWN_MS);
}

/**
 * Verify a bearer token. Never throws for a bad or unverifiable token; only for a server fault
 * (callers keep their existing try/catch -> 500).
 */
export async function verifyAccessToken(
  token: string,
  client: ClaimsClient,
  options: VerifyOptions = {},
): Promise<TokenVerification> {
  if (!token) return invalid("Authentication is required.");

  const key = await fingerprint(token);
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.result;
  if (hit) cache.delete(key);

  const pending = inFlight.get(key);
  if (pending) return pending;

  const run = (async () => {
    const { result, exp } = await verifyUncached(token, client, options);
    const now = Date.now();
    if (result.ok) {
      remember(key, result, Math.min(now + TOKEN_CACHE_TTL_MS, (exp as number) * 1000));
    } else if (result.reason === "unavailable") {
      remember(key, result, now + UNAVAILABLE_CACHE_TTL_MS);
    }
    return result;
  })().finally(() => {
    inFlight.delete(key);
  });
  inFlight.set(key, run);
  return run;
}
