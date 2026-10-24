import { supabase } from "@/lib/supabaseClient";

/**
 * Builds the JSON + bearer-token headers every authenticated `/api/*` call needs.
 *
 * Every admin API route goes through `requireStaffAccess` (or a stricter guard), which reads the
 * Supabase access token off the Authorization header — a fetch without it is rejected with a 401
 * regardless of who is logged in. This has been a recurring source of "the feature silently does
 * nothing" bugs (RISK-021, RISK-076), so prefer this helper over hand-rolling the header.
 */
/**
 * RISK-130: `supabase.auth.getSession()` refreshes the login whenever the browser thinks the access
 * token is about to expire. On a computer whose clock is out by about an hour that is true for every
 * token, so each API call (and every 15 s poll, several screens at once) triggered its own refresh
 * until Supabase answered 429 and dropped the login. Callers now share one lookup, reused for a few
 * seconds; the token still changes whenever Supabase signs in, refreshes or signs out.
 */
const TOKEN_REUSE_MS = 15000;
let cachedToken: { token: string | null; at: number } | null = null;
let inFlight: Promise<string | null> | null = null;
let listening = false;

function listenForSessionChanges() {
  if (listening) return;
  listening = true;
  try {
    supabase.auth.onAuthStateChange((event: string, session: { access_token?: string } | null) => {
      cachedToken = event === "TOKEN_REFRESHED" && session?.access_token ? { token: session.access_token, at: Date.now() } : null;
    });
  } catch {
    /* no listener: every call looks the session up itself, exactly as before */
  }
}

/** For tests: forget the reused token. */
export function resetAuthHeadersCache() {
  cachedToken = null;
  inFlight = null;
}

async function currentAccessToken(): Promise<string | null> {
  listenForSessionChanges();
  if (cachedToken && Date.now() - cachedToken.at < TOKEN_REUSE_MS) return cachedToken.token;
  if (!inFlight) {
    inFlight = supabase.auth
      .getSession()
      .then(({ data: { session } }: { data: { session: { access_token?: string } | null } }) => {
        const token = session?.access_token ?? null;
        cachedToken = { token, at: Date.now() };
        return token;
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

export const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const token = await currentAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};
