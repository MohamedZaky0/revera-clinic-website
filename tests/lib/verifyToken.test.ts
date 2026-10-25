/**
 * RISK-134: src/lib/verifyToken.ts verifies bearer tokens without a per-request call to the
 * Supabase Auth server.
 *
 * These tests use the REAL supabase-js client (so the real `getClaims` code runs: WebCrypto
 * signature check against a JWKS, expiry check, and the getUser fallback for HS256) with only the
 * network stubbed. The ES256 key pair is generated per run; no real project, key or secret is used.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createClient, AuthRetryableFetchError } from '@supabase/supabase-js';
import {
  verifyAccessToken,
  clearTokenCache,
  TOKEN_CACHE_TTL_MS,
  UNAVAILABLE_CACHE_TTL_MS,
  MAX_UNPROVEN_KIDS_PER_MINUTE,
} from '@/lib/verifyToken';
import { createEs256Signer, makeHsToken, makeRawToken, validClaims, futureExp, type Es256Signer } from '../helpers/jwt';

let signer: Es256Signer;
let otherSigner: Es256Signer; // same kid, different key: a forged signature
let hostCounter = 0;

type Calls = { jwks: number; user: number; other: string[] };

function makeClient(opts: {
  jwks?: () => Response | Promise<Response>;
  user?: () => Response | Promise<Response>;
} = {}) {
  hostCounter += 1;
  // A distinct host per client: auth-js keeps the JWKS in a process-wide cache keyed by the host.
  const url = `https://verifytoken${hostCounter}.supabase.co`;
  const calls: Calls = { jwks: 0, user: 0, other: [] };
  const fetchStub = vi.fn(async (input: any) => {
    const target = String(typeof input === 'string' ? input : input?.url ?? input);
    if (target.endsWith('/auth/v1/.well-known/jwks.json')) {
      calls.jwks += 1;
      return opts.jwks ? opts.jwks() : new Response(JSON.stringify(signer.jwks), { status: 200 });
    }
    if (target.endsWith('/auth/v1/user')) {
      calls.user += 1;
      return opts.user
        ? opts.user()
        : new Response(JSON.stringify({ id: 'user-1', aud: 'authenticated', email: 'staff@example.com' }), { status: 200 });
    }
    calls.other.push(target);
    return new Response('{}', { status: 404 });
  });
  const client = createClient(url, 'anon-placeholder', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: fetchStub as any },
  });
  return { client, calls, fetchStub };
}

const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

beforeEach(async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'; // validClaims() carries this project's issuer
  clearTokenCache();
  signer ??= await createEs256Signer('kid-main');
  otherSigner ??= await createEs256Signer('kid-main');
});

afterEach(() => {
  vi.useRealTimers();
  if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
});

describe('verifyAccessToken - ES256 (asymmetric signing keys): verified locally', () => {
  it('accepts a valid token, returns id/email/phone, and never calls the Auth user endpoint', async () => {
    const { client, calls } = makeClient();
    const token = await signer.sign(validClaims({ sub: 'u-42', email: 'a@b.com', phone: '201001234567' }));
    const result = await verifyAccessToken(token, client);
    expect(result).toEqual({ ok: true, user: { id: 'u-42', email: 'a@b.com', phone: '201001234567' } });
    expect(calls.user).toBe(0);
    expect(calls.jwks).toBe(1);
  });

  it('keeps the JWKS: a second, different token costs no Auth call and no JWKS fetch', async () => {
    const { client, calls } = makeClient();
    await verifyAccessToken(await signer.sign(), client);
    await verifyAccessToken(await signer.sign(validClaims({ sub: 'someone-else' })), client);
    expect(calls.user).toBe(0);
    expect(calls.jwks).toBe(1);
  });

  it('rejects an expired token before any network call', async () => {
    const { client, fetchStub } = makeClient();
    const token = await signer.sign(validClaims({ exp: Math.floor(Date.now() / 1000) - 5 }));
    const result = await verifyAccessToken(token, client);
    expect(result).toMatchObject({ ok: false, reason: 'invalid' });
    expect(fetchStub).not.toHaveBeenCalled();
  });

  it('rejects a token with no expiry', async () => {
    const { client } = makeClient();
    const claims = validClaims();
    delete claims.exp;
    expect(await verifyAccessToken(await signer.sign(claims), client)).toMatchObject({ ok: false, reason: 'invalid' });
  });

  it('rejects a validly signed token whose audience is not "authenticated"', async () => {
    const { client } = makeClient();
    for (const aud of ['anon', 'service', undefined, '']) {
      clearTokenCache();
      const claims = validClaims({ aud });
      if (aud === undefined) delete claims.aud;
      const result = await verifyAccessToken(await signer.sign(claims), client);
      expect(result, `aud=${String(aud)}`).toMatchObject({ ok: false, reason: 'invalid' });
    }
  });

  it('accepts an audience list that contains "authenticated"', async () => {
    const { client } = makeClient();
    const result = await verifyAccessToken(await signer.sign(validClaims({ aud: ['x', 'authenticated'] })), client);
    expect(result.ok).toBe(true);
  });

  it('rejects a validly signed token with no subject (or an empty one)', async () => {
    const { client } = makeClient();
    const noSub = validClaims();
    delete noSub.sub;
    expect(await verifyAccessToken(await signer.sign(noSub), client)).toMatchObject({ ok: false, reason: 'invalid' });
    expect(await verifyAccessToken(await signer.sign(validClaims({ sub: '' })), client)).toMatchObject({ ok: false, reason: 'invalid' });
  });

  it('rejects a token signed by a different key that claims the same key id', async () => {
    const { client } = makeClient();
    const forged = await otherSigner.sign();
    expect(await verifyAccessToken(forged, client)).toMatchObject({ ok: false, reason: 'invalid' });
  });

  it('a token whose key id is not in the JWKS is handed to the Auth server, which decides (one call)', async () => {
    const { client, calls } = makeClient({ user: () => new Response(JSON.stringify({ msg: 'invalid JWT' }), { status: 401 }) });
    const stranger = await (await createEs256Signer('kid-unknown')).sign();
    expect(await verifyAccessToken(stranger, client)).toMatchObject({ ok: false, reason: 'invalid' });
    expect(calls.user).toBe(1);
  });

  it('JWKS endpoint unreachable is "unavailable" (503 path), not "invalid" (401 path)', async () => {
    const { client } = makeClient({ jwks: () => { throw new TypeError('fetch failed'); } });
    const result = await verifyAccessToken(await signer.sign(), client);
    expect(result).toMatchObject({ ok: false, reason: 'unavailable' });
  });
});

describe('verifyAccessToken - claims getClaims does not check itself', () => {
  it.each([
    ['wrong issuer (another project)', { iss: 'https://other.supabase.co/auth/v1' }],
    ['no issuer', { iss: undefined }],
    ['role anon', { role: 'anon' }],
    ['role service_role', { role: 'service_role' }],
    ['anonymous sign-in user', { is_anonymous: true }],
    ['subject with junk characters', { sub: "x' or '1'='1" }],
    ['subject far too long', { sub: 'a'.repeat(200) }],
    ['subject not a string', { sub: 12345 }],
  ])('ES256, validly signed, but %s is refused', async (_name, patch) => {
    const { client } = makeClient();
    const claims = validClaims(patch as any);
    for (const k of Object.keys(patch)) if ((patch as any)[k] === undefined) delete claims[k];
    expect(await verifyAccessToken(await signer.sign(claims), client)).toMatchObject({ ok: false, reason: 'invalid' });
  });

  it('the same checks apply to a token the Auth server vouched for (HS256 fallback)', async () => {
    const { client } = makeClient();
    expect(await verifyAccessToken(makeHsToken(validClaims({ iss: 'https://other.supabase.co/auth/v1' })), client)).toMatchObject({ ok: false });
    expect(await verifyAccessToken(makeHsToken(validClaims({ role: 'anon' })), client)).toMatchObject({ ok: false });
    expect(await verifyAccessToken(makeHsToken(validClaims({ is_anonymous: true })), client)).toMatchObject({ ok: false });
  });

  it('a caller may pin the issuer explicitly', async () => {
    const { client } = makeClient();
    const token = await signer.sign(validClaims({ iss: 'https://custom.example.org/auth/v1' }));
    expect(await verifyAccessToken(token, client, { supabaseUrl: 'https://custom.example.org/' })).toMatchObject({ ok: true });
  });
});

describe('verifyAccessToken - tokens that make getClaims throw instead of returning an error', () => {
  it.each([
    ['alg none with a kid', { alg: 'none', typ: 'JWT', kid: 'kid-main' }, ''],
    ['PS256 (unsupported algorithm)', { alg: 'PS256', typ: 'JWT', kid: 'kid-main' }, 'c2ln'],
    ['RS256 header against the EC key', { alg: 'RS256', typ: 'JWT', kid: 'kid-main' }, 'c2ln'],
    ['ES256 header with a signature of the wrong length', { alg: 'ES256', typ: 'JWT', kid: 'kid-main' }, 'c2ln'],
  ])('%s is invalid (401 path), never an unhandled error', async (_name, header, sig) => {
    const { client } = makeClient({ user: () => new Response(JSON.stringify({ msg: 'invalid JWT' }), { status: 401 }) });
    const token = makeRawToken(header, validClaims(), sig);
    await expect(verifyAccessToken(token, client)).resolves.toMatchObject({ ok: false, reason: 'invalid' });
  });

  it('a payload that is not JSON is invalid', async () => {
    const { client } = makeClient();
    const token = `${Buffer.from(JSON.stringify({ alg: 'ES256', kid: 'kid-main' })).toString('base64url')}.${Buffer.from('not json').toString('base64url')}.c2ln`;
    await expect(verifyAccessToken(token, client)).resolves.toMatchObject({ ok: false, reason: 'invalid' });
  });
});

describe('verifyAccessToken - bogus key ids do not amplify Auth/JWKS traffic', () => {
  const unknownKidUser = () => new Response(JSON.stringify({ msg: 'invalid JWT' }), { status: 401 });

  it('a kid that failed is refused from memory afterwards (no JWKS fetch, no /user call)', async () => {
    const { client, calls } = makeClient({ user: unknownKidUser });
    const bogus = (n: number) => makeRawToken({ alg: 'ES256', typ: 'JWT', kid: 'bogus-kid' }, validClaims({ jti: n }), 'c2ln');
    expect(await verifyAccessToken(bogus(1), client)).toMatchObject({ ok: false });
    const before = { ...calls };
    for (let i = 2; i < 12; i++) expect(await verifyAccessToken(bogus(i), client)).toMatchObject({ ok: false, reason: 'invalid' });
    expect(calls).toEqual(before);
  });

  it('a flood of different random kids is capped per minute', async () => {
    const { client, calls } = makeClient({ user: unknownKidUser });
    for (let i = 0; i < 50; i++) {
      const t = makeRawToken({ alg: 'ES256', typ: 'JWT', kid: `random-${i}` }, validClaims(), 'c2ln');
      expect(await verifyAccessToken(t, client)).toMatchObject({ ok: false });
    }
    expect(calls.user).toBeLessThanOrEqual(MAX_UNPROVEN_KIDS_PER_MINUTE);
  });

  it('an expired token with a never-seen kid does not poison that kid for real tokens', async () => {
    const { client } = makeClient();
    const expired = await signer.sign(validClaims({ exp: Math.floor(Date.now() / 1000) - 60 }));
    expect(await verifyAccessToken(expired, client)).toMatchObject({ ok: false });
    expect((await verifyAccessToken(await signer.sign(), client)).ok).toBe(true);
  });

  it('a kid that verified once is never rate-limited again (normal traffic is unaffected)', async () => {
    const { client } = makeClient();
    for (let i = 0; i < 30; i++) expect((await verifyAccessToken(await signer.sign(validClaims({ sub: `u${i}` })), client)).ok).toBe(true);
  });

  it('an Auth outage while probing a new kid is not remembered as a bad kid', async () => {
    let down = true;
    const { client } = makeClient({
      jwks: () => (down ? new Response('{}', { status: 503 }) : new Response(JSON.stringify(signer.jwks), { status: 200 })),
    });
    expect(await verifyAccessToken(await signer.sign(), client)).toMatchObject({ reason: 'unavailable' });
    down = false;
    expect((await verifyAccessToken(await signer.sign(validClaims({ sub: 'other' })), client)).ok).toBe(true);
  });
});

describe('verifyAccessToken - malformed input', () => {
  it.each([
    ['empty string', ''],
    ['not a jwt', 'not-a-jwt'],
    ['two segments', 'aaaa.bbbb'],
    ['three segments of garbage', 'aaaa.bbbb.cccc'],
    ['valid base64url but not json', 'e30.bm90LWpzb24.c2ln'],
    ['non-base64url characters', 'a$a.b$b.c$c'],
    ['four segments', 'a.b.c.d'],
  ])('%s is invalid and never reaches the network', async (_name, token) => {
    const { client, fetchStub } = makeClient();
    const result = await verifyAccessToken(token, client);
    expect(result).toMatchObject({ ok: false, reason: 'invalid' });
    expect(fetchStub).not.toHaveBeenCalled();
  });
});

describe('verifyAccessToken - HS256 (legacy shared secret): one Auth call, then cached', () => {
  it('asks the Auth server once for a token it cannot verify locally', async () => {
    const { client, calls } = makeClient();
    const result = await verifyAccessToken(makeHsToken(validClaims({ sub: 'hs-user' })), client);
    expect(result).toEqual({ ok: true, user: { id: 'hs-user', email: 'staff@example.com', phone: null } });
    expect(calls.user).toBe(1);
    expect(calls.jwks).toBe(0);
  });

  it('a cache hit makes no Auth call and does not even reach getClaims', async () => {
    const { client, calls } = makeClient();
    const spy = vi.spyOn(client.auth, 'getClaims');
    const token = makeHsToken();
    for (let i = 0; i < 20; i++) expect((await verifyAccessToken(token, client)).ok).toBe(true);
    expect(calls.user).toBe(1);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('simultaneous checks of the same token share one Auth call', async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const { client, calls } = makeClient({
      user: async () => {
        await gate;
        return new Response(JSON.stringify({ id: 'user-1' }), { status: 200 });
      },
    });
    const token = makeHsToken();
    const all = Promise.all(Array.from({ length: 12 }, () => verifyAccessToken(token, client)));
    release();
    const results = await all;
    expect(results.every((r) => r.ok)).toBe(true);
    expect(calls.user).toBe(1);
  });

  it('asks again once the cache entry is older than the TTL', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const { client, calls } = makeClient();
    const token = makeHsToken();
    await verifyAccessToken(token, client);
    vi.setSystemTime(Date.now() + TOKEN_CACHE_TTL_MS - 1000);
    await verifyAccessToken(token, client);
    expect(calls.user).toBe(1);
    vi.setSystemTime(Date.now() + 2000);
    await verifyAccessToken(token, client);
    expect(calls.user).toBe(2);
  });

  it('never keeps a result past the token\'s own expiry', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const { client, calls } = makeClient();
    const token = makeHsToken(validClaims({ exp: futureExp(20) }));
    expect((await verifyAccessToken(token, client)).ok).toBe(true);
    vi.setSystemTime(Date.now() + 25_000);
    expect(await verifyAccessToken(token, client)).toMatchObject({ ok: false, reason: 'invalid' });
    expect(calls.user).toBe(1); // refused as expired locally, no second call
  });

  it('the Auth server saying 401 is "invalid" and is not cached as valid', async () => {
    let status = 401;
    const { client, calls } = makeClient({
      user: () => new Response(JSON.stringify({ code: status, error_code: 'bad_jwt', msg: 'invalid JWT' }), { status }),
    });
    const token = makeHsToken();
    expect(await verifyAccessToken(token, client)).toMatchObject({ ok: false, reason: 'invalid' });
    status = 200;
    // Same token now accepted by the server (e.g. clock/permission change): not poisoned by the earlier no.
    const ok = makeClient();
    expect((await verifyAccessToken(token, ok.client)).ok).toBe(true);
    expect(calls.user).toBe(1);
  });

  it('a revoked or tampered HS256 token the Auth server rejects is refused', async () => {
    const { client } = makeClient({ user: () => new Response(JSON.stringify({ msg: 'session not found' }), { status: 403 }) });
    expect(await verifyAccessToken(makeHsToken(), client)).toMatchObject({ ok: false, reason: 'invalid' });
  });

  it('a validly answered HS256 token with the wrong audience is still refused', async () => {
    const { client } = makeClient();
    expect(await verifyAccessToken(makeHsToken(validClaims({ aud: 'anon' })), client)).toMatchObject({ ok: false, reason: 'invalid' });
  });

  it('the anon key (a legacy HS256 token with role anon and no subject) is refused', async () => {
    const { client } = makeClient();
    const anonLike = makeHsToken({ iss: 'supabase', ref: 'abc', role: 'anon', iat: 1, exp: futureExp(100000) });
    expect(await verifyAccessToken(anonLike, client)).toMatchObject({ ok: false, reason: 'invalid' });
  });
});

describe('verifyAccessToken - transient failures map to "unavailable" (RISK-113 503 path)', () => {
  it('Auth server unreachable (network error)', async () => {
    const { client } = makeClient({ user: () => { throw new TypeError('fetch failed'); } });
    expect(await verifyAccessToken(makeHsToken(), client)).toMatchObject({ ok: false, reason: 'unavailable' });
  });

  it.each([429, 500, 502, 503, 504])('Auth server answering %i', async (status) => {
    const { client } = makeClient({ user: () => new Response('{}', { status }) });
    expect(await verifyAccessToken(makeHsToken(), client)).toMatchObject({ ok: false, reason: 'unavailable' });
  });

  it('a retryable error from the client (as the SDK reports it) is "unavailable"', async () => {
    const fakeClient = {
      auth: { getClaims: vi.fn(async () => ({ data: null, error: new AuthRetryableFetchError('down', 503) })) },
    };
    expect(await verifyAccessToken('any-token', fakeClient)).toMatchObject({ ok: false, reason: 'unavailable' });
  });

  it('is remembered only briefly: a burst does not each hit a struggling Auth server, but recovery is quick', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    let down = true;
    const { client, calls } = makeClient({
      user: () => (down ? new Response('{}', { status: 503 }) : new Response(JSON.stringify({ id: 'user-1' }), { status: 200 })),
    });
    const token = makeHsToken();
    for (let i = 0; i < 5; i++) expect(await verifyAccessToken(token, client)).toMatchObject({ reason: 'unavailable' });
    expect(calls.user).toBe(1);
    down = false;
    vi.setSystemTime(Date.now() + UNAVAILABLE_CACHE_TTL_MS + 100);
    expect((await verifyAccessToken(token, client)).ok).toBe(true);
    expect(calls.user).toBe(2);
  });

  it('a failure is never remembered as a success', async () => {
    const { client } = makeClient({ user: () => new Response('{}', { status: 503 }) });
    const token = makeHsToken();
    await verifyAccessToken(token, client);
    expect((await verifyAccessToken(token, client)).ok).toBe(false);
  });
});

describe('verifyAccessToken - cache hygiene', () => {
  function fakeValidClient() {
    const getClaims = vi.fn(async (token: string) => ({
      data: { claims: validClaims({ sub: `sub-of-${token}` }) },
      error: null,
    }));
    return { client: { auth: { getClaims } }, getClaims };
  }

  it('is bounded: after far more tokens than the limit, the oldest are asked again', async () => {
    const { client, getClaims } = fakeValidClient();
    for (let i = 0; i < 700; i++) await verifyAccessToken(`token-${i}`, client);
    getClaims.mockClear();
    await verifyAccessToken('token-0', client); // evicted
    expect(getClaims).toHaveBeenCalledTimes(1);
    getClaims.mockClear();
    await verifyAccessToken('token-699', client); // recent: still cached
    expect(getClaims).not.toHaveBeenCalled();
  });

  it('keeps two different tokens apart', async () => {
    const { client } = fakeValidClient();
    const a = await verifyAccessToken('token-a', client);
    const b = await verifyAccessToken('token-b', client);
    expect(a.ok && b.ok && a.user.id !== b.user.id).toBe(true);
  });

  it('does not log the token', async () => {
    const spies = [vi.spyOn(console, 'log'), vi.spyOn(console, 'warn'), vi.spyOn(console, 'error')];
    const { client } = makeClient({ user: () => new Response('{}', { status: 503 }) });
    const token = makeHsToken();
    await verifyAccessToken(token, client);
    for (const s of spies) {
      expect(JSON.stringify(s.mock.calls)).not.toContain(token);
      s.mockRestore();
    }
  });

  it('anything getClaims throws (undecodable token parts, key/algorithm mismatch) is an invalid token', async () => {
    const client = { auth: { getClaims: vi.fn(async () => { throw new Error('Invalid UTF-8 sequence'); }) } };
    expect(await verifyAccessToken('x', client)).toMatchObject({ ok: false, reason: 'invalid' });
  });

  it('a missing Supabase client is a server fault: thrown, so the caller answers 500, not 401', async () => {
    await expect(verifyAccessToken('x', null as any)).rejects.toThrow('not configured');
  });
});
