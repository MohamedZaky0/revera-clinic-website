import { describe, it, expect, vi, beforeEach } from 'vitest';

const getSession = vi.fn();
let authListener: ((event: string, session: any) => void) | null = null;

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: (...a: any[]) => getSession(...a),
      onAuthStateChange: (cb: (event: string, session: any) => void) => {
        authListener = cb;
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
    },
  },
}));

import { getAuthHeaders, resetAuthHeadersCache } from '@/lib/authHeaders';

describe('getAuthHeaders shares one session lookup (RISK-130)', () => {
  beforeEach(() => {
    resetAuthHeadersCache();
    getSession.mockReset();
    getSession.mockResolvedValue({ data: { session: { access_token: 'tok-1' } } });
  });

  it('several callers at once cause a single getSession, and all get the token', async () => {
    const results = await Promise.all([getAuthHeaders(), getAuthHeaders(), getAuthHeaders(), getAuthHeaders()]);
    expect(getSession).toHaveBeenCalledTimes(1);
    for (const h of results) {
      expect(h.Authorization).toBe('Bearer tok-1');
      expect(h['Content-Type']).toBe('application/json');
    }
  });

  it('a call right afterwards reuses it; a refreshed token replaces it; a sign-out forgets it', async () => {
    await getAuthHeaders();
    expect((await getAuthHeaders()).Authorization).toBe('Bearer tok-1');
    expect(getSession).toHaveBeenCalledTimes(1);

    authListener?.('TOKEN_REFRESHED', { access_token: 'tok-2' });
    expect((await getAuthHeaders()).Authorization).toBe('Bearer tok-2');
    expect(getSession).toHaveBeenCalledTimes(1);

    authListener?.('SIGNED_OUT', null);
    getSession.mockResolvedValue({ data: { session: null } });
    const loggedOut = await getAuthHeaders();
    expect(getSession).toHaveBeenCalledTimes(2);
    expect(loggedOut.Authorization).toBeUndefined();
  });

  it('a different person signing in is never sent with the previous token', async () => {
    await getAuthHeaders();
    authListener?.('SIGNED_IN', { access_token: 'tok-other' });
    getSession.mockResolvedValue({ data: { session: { access_token: 'tok-other' } } });
    expect((await getAuthHeaders()).Authorization).toBe('Bearer tok-other');
    expect(getSession).toHaveBeenCalledTimes(2);
  });

  it('a failed lookup is not remembered as a token', async () => {
    getSession.mockRejectedValueOnce(new Error('boom'));
    await expect(getAuthHeaders()).rejects.toThrow('boom');
    getSession.mockResolvedValue({ data: { session: { access_token: 'tok-3' } } });
    expect((await getAuthHeaders()).Authorization).toBe('Bearer tok-3');
  });
});
