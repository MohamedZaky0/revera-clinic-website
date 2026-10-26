/**
 * RISK-134: the three staff gates (requireStaffAccess, verifyHrAccess, GET /api/auth/me) now verify the
 * bearer token locally (src/lib/verifyToken.ts) instead of calling the Auth server on every request.
 *
 * What must NOT change, proved here with a token that has a REAL valid ES256 signature:
 *  - DEC-117: an inactive employee is refused on the very next request, even with a perfectly valid
 *    token and even when that token's verification is cached (the database row is read every time).
 *  - an unknown person, an expired or forged token is refused;
 *  - RISK-113: an Auth server that cannot be reached is 503, never a 401 that logs a working session out.
 * Only the network is stubbed: the real supabase-js client runs the real getClaims.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseFake } from '../helpers/supabaseFake';
import { createEs256Signer, makeHsToken, validClaims, type Es256Signer } from '../helpers/jwt';
import { clearTokenCache } from '@/lib/verifyToken';

const fake = createSupabaseFake();
const state: { client: any } = { client: null };

vi.mock('@/lib/supabaseServer', () => ({
  supabaseServer: {
    auth: {
      getUser: (...args: any[]) => state.client.auth.getUser(...args),
      getClaims: (...args: any[]) => state.client.auth.getClaims(...args),
    },
    from: (table: string) => fake.client.from(table),
  },
}));

import { requireStaffAccess } from '@/lib/access';
import { verifyHrAccess } from '@/lib/auth';
import { GET as authMe } from '@/app/api/auth/me/route';

const URL_BASE = 'https://localjwt.supabase.co';
let signer: Es256Signer;
let userEndpointCalls = 0;
let jwksCalls = 0;
let userEndpointStatus = 200;
const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

function claims(overrides: Record<string, unknown> = {}) {
  return validClaims({ iss: `${URL_BASE}/auth/v1`, sub: 'auth-user-1', email: 'staff@example.com', ...overrides });
}

function reqWith(token: string, path = '/api/x'): Request {
  return new Request(`http://localhost:3000${path}`, { headers: { Authorization: `Bearer ${token}` } });
}

function seedEmployee(overrides: Record<string, unknown> = {}) {
  fake.seed('employee_accounts', [
    {
      id: 'emp-1',
      employee_id: 'E-1',
      email: 'staff@example.com',
      role_name: 'Admin',
      auth_user_id: 'auth-user-1',
      is_active: true,
      ...overrides,
    },
  ]);
  fake.seed('roles', [{ name: 'Admin', permissions: ['*'], workspace: 'standard' }]);
}

beforeEach(async () => {
  fake.reset(); // also clears the token cache
  signer ??= await createEs256Signer('kid-local');
  userEndpointCalls = 0;
  jwksCalls = 0;
  userEndpointStatus = 200;
  process.env.NEXT_PUBLIC_SUPABASE_URL = URL_BASE;
  state.client = createClient(URL_BASE, 'anon-placeholder', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: (async (input: any) => {
        const target = String(typeof input === 'string' ? input : input?.url ?? input);
        if (target.endsWith('/auth/v1/.well-known/jwks.json')) {
          jwksCalls += 1;
          return new Response(JSON.stringify(signer.jwks), { status: 200 });
        }
        if (target.endsWith('/auth/v1/user')) {
          userEndpointCalls += 1;
          return new Response(JSON.stringify({ id: 'auth-user-1', msg: 'x' }), { status: userEndpointStatus });
        }
        return new Response('{}', { status: 404 });
      }) as any,
    },
  });
});

afterEach(() => {
  if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
});

describe('staff gates with a locally verified (ES256) token', () => {
  it('an active employee gets access, with zero Auth-server user calls', async () => {
    seedEmployee();
    const token = await signer.sign(claims());
    const result = await requireStaffAccess(reqWith(token));
    expect('access' in result && result.access.employee.id).toBe('emp-1');
    expect('access' in result && result.access.user).toEqual({ id: 'auth-user-1', email: 'staff@example.com' });
    expect(userEndpointCalls).toBe(0);
    expect(jwksCalls).toBe(1);
    await requireStaffAccess(reqWith(await signer.sign(claims({ jti: 'second' }))));
    expect(jwksCalls).toBe(1); // the key set is kept: a second token costs no network at all
    expect(userEndpointCalls).toBe(0);
  });

  it('DEC-117: a valid-signature token for an INACTIVE employee is refused by requireStaffAccess (403)', async () => {
    seedEmployee({ is_active: false });
    const result = await requireStaffAccess(reqWith(await signer.sign(claims())));
    expect(result).toMatchObject({ status: 403 });
    expect('error' in result && result.error).toMatch(/inactive/i);
  });

  it('DEC-117: ... by verifyHrAccess (403)', async () => {
    seedEmployee({ is_active: false });
    const result: any = await verifyHrAccess(reqWith(await signer.sign(claims())));
    expect(result.status).toBe(403);
    expect(result.error).toMatch(/inactive/i);
  });

  it('DEC-117: ... and by GET /api/auth/me (403 account_inactive)', async () => {
    seedEmployee({ is_active: false });
    const res = await authMe(reqWith(await signer.sign(claims()), '/api/auth/me'));
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe('account_inactive');
  });

  it('DEC-117: deactivating an employee takes effect on the very next request even though the token check is cached', async () => {
    seedEmployee();
    const token = await signer.sign(claims());
    expect('access' in (await requireStaffAccess(reqWith(token)))).toBe(true);
    expect('access' in (await requireStaffAccess(reqWith(token)))).toBe(true); // second one: token verification from cache
    fake.seed('employee_accounts', [{ ...fake.rows('employee_accounts')[0], is_active: false }]);
    expect(await requireStaffAccess(reqWith(token))).toMatchObject({ status: 403 });
    expect(await verifyHrAccess(reqWith(token))).toMatchObject({ status: 403 });
    expect((await authMe(reqWith(token, '/api/auth/me'))).status).toBe(403);
  });

  it('GET /api/auth/me returns the profile of an active employee', async () => {
    seedEmployee();
    const res = await authMe(reqWith(await signer.sign(claims()), '/api/auth/me'));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ id: 'emp-1', role: 'admin' });
    expect(userEndpointCalls).toBe(0);
  });

  it('a validly signed token for someone who is not staff is refused (403)', async () => {
    seedEmployee();
    const stranger = await signer.sign(claims({ sub: 'someone-else', email: 'nobody@example.com' }));
    expect(await requireStaffAccess(reqWith(stranger))).toMatchObject({ status: 403 });
  });

  it('expired, forged and wrong-audience tokens are 401 and never reach the employee table', async () => {
    seedEmployee();
    const other = await createEs256Signer('kid-local'); // same kid, different key
    const bad = [
      await signer.sign(claims({ exp: Math.floor(Date.now() / 1000) - 5 })),
      await other.sign(claims()),
      await signer.sign(claims({ aud: 'anon' })),
      'garbage',
    ];
    for (const token of bad) {
      expect(await requireStaffAccess(reqWith(token))).toMatchObject({ status: 401 });
      expect(await verifyHrAccess(reqWith(token))).toMatchObject({ status: 401 });
      expect((await authMe(reqWith(token, '/api/auth/me'))).status).toBe(401);
    }
  });

  it('no token at all is 401', async () => {
    expect(await requireStaffAccess(new Request('http://localhost:3000/api/x'))).toMatchObject({ status: 401 });
  });
});

describe('legacy HS256 token: one Auth call, then the cache; the employee row is still read each time', () => {
  it('inactive is refused even though the Auth server accepted the token', async () => {
    seedEmployee({ is_active: false });
    const token = makeHsToken(claims());
    expect(await requireStaffAccess(reqWith(token))).toMatchObject({ status: 403 });
    expect(await requireStaffAccess(reqWith(token))).toMatchObject({ status: 403 });
    expect(userEndpointCalls).toBe(1);
  });

  it('five requests with one token cost one Auth call', async () => {
    seedEmployee();
    const token = makeHsToken(claims());
    for (let i = 0; i < 5; i++) expect('access' in (await requireStaffAccess(reqWith(token)))).toBe(true);
    expect(userEndpointCalls).toBe(1);
  });
});

describe('RISK-113: a transient failure reaching Supabase is 503, not a 401 that logs the session out', () => {
  it.each([429, 500, 502, 503])('Auth server answering %i', async (status) => {
    seedEmployee();
    userEndpointStatus = status;
    const token = makeHsToken(claims());
    expect(await requireStaffAccess(reqWith(token))).toMatchObject({ status: 503 });
    expect(await verifyHrAccess(reqWith(token))).toMatchObject({ status: 503 });
    const res = await authMe(reqWith(token, '/api/auth/me'));
    expect(res.status).toBe(503);
    expect((await res.json()).error).not.toMatch(/invalid|expired/i);
  });

  it('the Auth server rejecting an HS256 token is still a plain 401', async () => {
    seedEmployee();
    userEndpointStatus = 401;
    const token = makeHsToken(claims());
    expect(await requireStaffAccess(reqWith(token))).toMatchObject({ status: 401 });
    expect((await authMe(reqWith(token, '/api/auth/me'))).status).toBe(401);
  });

  it('the JWKS endpoint being down is 503 for an ES256 token', async () => {
    seedEmployee();
    state.client = createClient('https://jwksdown.supabase.co', 'anon-placeholder', {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: (async () => { throw new TypeError('fetch failed'); }) as any },
    });
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://jwksdown.supabase.co';
    const token = await signer.sign(claims({ iss: 'https://jwksdown.supabase.co/auth/v1' }));
    expect(await requireStaffAccess(reqWith(token))).toMatchObject({ status: 503 });
    clearTokenCache();
    expect((await authMe(reqWith(token, '/api/auth/me'))).status).toBe(503);
  });
});
