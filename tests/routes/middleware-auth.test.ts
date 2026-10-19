/**
 * src/middleware.ts guards a few admin API prefixes by asking Supabase's /auth/v1/user whether the
 * bearer token is valid. RISK-117: it used to answer 401 for ANY non-ok reply from Supabase (a rate
 * limit, an outage) or throw on a network error, and a 401 reads to the client as "your session is
 * over". Only an answer that says the token is bad may be a 401.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '@/middleware';

const originalFetch = global.fetch;

function req(headers: Record<string, string> = {}, path = '/api/employees') {
  return new NextRequest(`http://localhost:3000${path}`, { headers });
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

  it('Supabase says the token is valid → request continues', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 })) as any;
    const res = await middleware(req({ authorization: 'Bearer good' }));
    expect(res.status).toBe(200);
  });

  it('Supabase says the token is bad (401/403) → 401', async () => {
    for (const status of [401, 403]) {
      global.fetch = vi.fn().mockResolvedValue(new Response('{}', { status })) as any;
      expect((await middleware(req({ authorization: 'Bearer bad' }))).status).toBe(401);
    }
  });

  it('a rate limit or an upstream failure is 503, not a 401 logout signal', async () => {
    for (const status of [429, 500, 502, 503]) {
      global.fetch = vi.fn().mockResolvedValue(new Response('{}', { status })) as any;
      expect((await middleware(req({ authorization: 'Bearer good' }))).status).toBe(503);
    }
  });

  it('Supabase unreachable (fetch throws) is 503 instead of an unhandled error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network down')) as any;
    expect((await middleware(req({ authorization: 'Bearer good' }))).status).toBe(503);
  });

  it('unprotected API paths are untouched', async () => {
    const f = vi.fn();
    global.fetch = f as any;
    const res = await middleware(req({}, '/api/services'));
    expect(res.status).toBe(200);
    expect(f).not.toHaveBeenCalled();
  });
});
