/**
 * src/middleware.ts guards a few admin API prefixes.
 *
 * RISK-117 (earlier): it asked Supabase's /auth/v1/user whether the bearer token was valid, and a rate
 * limit or outage there used to read as "your session is over" (401).
 * RISK-134 (now): it makes NO network call. It refuses only what is plainly unusable (no token, not a
 * 3-part JWT, past its exp); the route handler of every protected prefix verifies the token properly
 * with src/lib/verifyToken.ts and then checks the employee row. So Supabase being slow, rate-limiting or
 * down can no longer turn into a 401 (or a 503) from the middleware at all, which is what RISK-117's
 * tests asserted for the old fetch; they are kept below in their new form (fetch never called).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '@/middleware';
import { createEs256Signer, makeHsToken, validClaims } from '../helpers/jwt';

const originalFetch = global.fetch;

function req(headers: Record<string, string> = {}, path = '/api/employees') {
  return new NextRequest(`http://localhost:3000${path}`, { headers });
}

function bearer(token: string) {
  return { authorization: `Bearer ${token}` };
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe('middleware auth gate', () => {
  it('no Authorization header → 401 without calling Supabase', async () => {
    const f = vi.fn();
    global.fetch = f as any;
    const res = await middleware(req());
    expect(res.status).toBe(401);
    expect(f).not.toHaveBeenCalled();
  });

  it('a well-formed, unexpired token → request continues, with no call to Supabase', async () => {
    const f = vi.fn();
    global.fetch = f as any;
    const res = await middleware(req(bearer(makeHsToken())));
    expect(res.status).toBe(200);
    expect(f).not.toHaveBeenCalled();
  });

  it('an ES256 token also passes without any call to Supabase (the handler does the real check)', async () => {
    const f = vi.fn();
    global.fetch = f as any;
    const signer = await createEs256Signer();
    const res = await middleware(req(bearer(await signer.sign(validClaims()))));
    expect(res.status).toBe(200);
    expect(f).not.toHaveBeenCalled();
  });

  it('RISK-117 kept: Supabase being rate-limited, failing or unreachable cannot become a 401 or 503 here', async () => {
    for (const status of [401, 403, 429, 500, 502, 503]) {
      const f = vi.fn().mockResolvedValue(new Response('{}', { status }));
      global.fetch = f as any;
      expect((await middleware(req(bearer(makeHsToken())))).status).toBe(200);
      expect(f).not.toHaveBeenCalled();
    }
    const down = vi.fn().mockRejectedValue(new Error('network down'));
    global.fetch = down as any;
    expect((await middleware(req(bearer(makeHsToken())))).status).toBe(200);
    expect(down).not.toHaveBeenCalled();
  });

  it('an expired token → 401 without calling Supabase', async () => {
    const f = vi.fn();
    global.fetch = f as any;
    const token = makeHsToken(validClaims({ exp: Math.floor(Date.now() / 1000) - 10 }));
    expect((await middleware(req(bearer(token)))).status).toBe(401);
    expect(f).not.toHaveBeenCalled();
  });

  it('a token with no exp → 401', async () => {
    const claims = validClaims();
    delete claims.exp;
    expect((await middleware(req(bearer(makeHsToken(claims))))).status).toBe(401);
  });

  it.each([
    ['not a jwt', 'not-a-jwt'],
    ['two segments', 'aaaa.bbbb'],
    ['four segments', 'a.b.c.d'],
    ['payload that is not json', 'e30.bm90LWpzb24.c2ln'],
    ['characters outside base64url', 'a$a.b$b.c$c'],
  ])('malformed token (%s) → 401 without calling Supabase', async (_name, token) => {
    const f = vi.fn();
    global.fetch = f as any;
    expect((await middleware(req(bearer(token)))).status).toBe(401);
    expect(f).not.toHaveBeenCalled();
  });

  it('every protected prefix is gated', async () => {
    for (const path of ['/api/employees', '/api/employees/notes', '/api/hr/payroll', '/api/roles', '/api/providers/schedule-audit-logs']) {
      expect((await middleware(req({}, path))).status, path).toBe(401);
    }
  });

  it('unprotected API paths are untouched', async () => {
    const f = vi.fn();
    global.fetch = f as any;
    const res = await middleware(req({}, '/api/services'));
    expect(res.status).toBe(200);
    expect(f).not.toHaveBeenCalled();
  });
});
