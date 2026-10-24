import { describe, it, expect, vi } from 'vitest';
import { recoverFromInvoluntarySignOut } from '@/lib/authRecovery';

describe('recoverFromInvoluntarySignOut (RISK-114)', () => {
  it('recovers with a fresh session when the captured refresh_token still works', async () => {
    const refreshSession = vi.fn().mockResolvedValue({
      data: { session: { access_token: 'new-token', refresh_token: 'rotated-token' } },
      error: null,
    });
    const result = await recoverFromInvoluntarySignOut({ auth: { refreshSession } }, 'old-refresh-token');

    expect(result.recovered).toBe(true);
    expect(result).toMatchObject({ recovered: true, session: { access_token: 'new-token' } });
    expect(refreshSession).toHaveBeenCalledWith({ refresh_token: 'old-refresh-token' });
  });

  it('gives up cleanly when there is no captured refresh_token to retry with (e.g. first load)', async () => {
    const refreshSession = vi.fn();
    const result = await recoverFromInvoluntarySignOut({ auth: { refreshSession } }, null);

    expect(result).toEqual({ recovered: false, reason: 'no_last_token' });
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it('gives up cleanly when Supabase rejects the retry (the token was genuinely dead, not just a transient race)', async () => {
    const refreshSession = vi.fn().mockResolvedValue({
      data: { session: null },
      error: { message: 'Invalid Refresh Token: Already Used' },
    });
    const result = await recoverFromInvoluntarySignOut({ auth: { refreshSession } }, 'already-used-token');

    expect(result).toEqual({ recovered: false, reason: 'refresh_failed' });
  });

  it('gives up cleanly, not throws, when the refresh call itself errors (network failure during the retry)', async () => {
    const refreshSession = vi.fn().mockRejectedValue(new Error('network down'));
    const result = await recoverFromInvoluntarySignOut({ auth: { refreshSession } }, 'some-token');

    expect(result).toEqual({ recovered: false, reason: 'refresh_failed' });
  });

  it('does not report recovered when the SDK resolves with no error but also no session', async () => {
    const refreshSession = vi.fn().mockResolvedValue({ data: { session: null }, error: null });
    const result = await recoverFromInvoluntarySignOut({ auth: { refreshSession } }, 'some-token');

    expect(result).toEqual({ recovered: false, reason: 'refresh_failed' });
  });
});

// ── RISK-117: verifyStaffSession + logout reasons ─────────────────────────────

import { verifyStaffSession, recordLogoutReason, consumeLogoutReason, clearLogoutReason, describeLogoutReason } from '@/lib/authRecovery';

function res(status: number, body: any = {}) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

function deps(overrides: Record<string, any> = {}) {
  return {
    session: { access_token: 'stale' },
    fetchMe: vi.fn(),
    refreshSession: vi.fn(),
    sleep: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('verifyStaffSession', () => {
  it('a 200 verifies on the first try', async () => {
    const d = deps();
    d.fetchMe.mockResolvedValue(res(200, { role: 'receptionist' }));
    const out = await verifyStaffSession(d);
    expect(out).toEqual({ status: 'ok', me: { role: 'receptionist' }, session: { access_token: 'stale' } });
    expect(d.refreshSession).not.toHaveBeenCalled();
  });

  it('a 403 is final immediately — no refresh, no retry', async () => {
    const d = deps();
    d.fetchMe.mockResolvedValue(res(403));
    expect(await verifyStaffSession(d)).toEqual({ status: 'unauthorized', httpStatus: 403 });
    expect(d.refreshSession).not.toHaveBeenCalled();
    expect(d.fetchMe).toHaveBeenCalledTimes(1);
  });

  it('a 401 on a stale access token refreshes once and succeeds with the fresh token (the false-logout case)', async () => {
    const d = deps();
    d.fetchMe.mockResolvedValueOnce(res(401)).mockResolvedValueOnce(res(200, { role: 'admin' }));
    d.refreshSession.mockResolvedValue({ data: { session: { access_token: 'fresh' } }, error: null });
    const out = await verifyStaffSession(d);
    expect(out).toEqual({ status: 'ok', me: { role: 'admin' }, session: { access_token: 'fresh' } });
    expect(d.fetchMe).toHaveBeenNthCalledWith(2, 'fresh');
    expect(d.refreshSession).toHaveBeenCalledTimes(1);
  });

  it('a 401 that persists after a successful refresh is final, and refreshes only once (no loop)', async () => {
    const d = deps();
    d.fetchMe.mockResolvedValue(res(401));
    d.refreshSession.mockResolvedValue({ data: { session: { access_token: 'fresh' } }, error: null });
    expect(await verifyStaffSession(d)).toEqual({ status: 'unauthorized', httpStatus: 401 });
    expect(d.refreshSession).toHaveBeenCalledTimes(1);
  });

  it('a 401 where the refresh token itself is refused (4xx) is final', async () => {
    const d = deps();
    d.fetchMe.mockResolvedValue(res(401));
    d.refreshSession.mockResolvedValue({ data: { session: null }, error: { status: 400, message: 'Invalid Refresh Token' } });
    expect(await verifyStaffSession(d)).toEqual({ status: 'unauthorized', httpStatus: 401 });
  });

  it('a 401 where the refresh could not be attempted (network / 5xx) is transient, not a logout', async () => {
    const net = deps();
    net.fetchMe.mockResolvedValue(res(401));
    net.refreshSession.mockRejectedValue(new Error('Failed to fetch'));
    expect(await verifyStaffSession(net)).toEqual({ status: 'transient' });

    const fivexx = deps();
    fivexx.fetchMe.mockResolvedValue(res(401));
    fivexx.refreshSession.mockResolvedValue({ data: { session: null }, error: { status: 503 } });
    expect(await verifyStaffSession(fivexx)).toEqual({ status: 'transient' });
  });

  it('retries a 503 and succeeds, waiting between attempts', async () => {
    const d = deps();
    d.fetchMe.mockResolvedValueOnce(res(503)).mockResolvedValueOnce(res(500)).mockResolvedValueOnce(res(200, { role: 'doctor' }));
    const out = await verifyStaffSession(d);
    expect(out.status).toBe('ok');
    expect(d.sleep).toHaveBeenNthCalledWith(1, 1000);
    expect(d.sleep).toHaveBeenNthCalledWith(2, 3000);
  });

  it('a server that keeps failing ends as transient after the retries (session is kept, never "unauthorized")', async () => {
    const d = deps();
    d.fetchMe.mockResolvedValue(res(503));
    expect(await verifyStaffSession(d)).toEqual({ status: 'transient' });
    expect(d.fetchMe).toHaveBeenCalledTimes(3);
  });

  it('a network failure on every attempt is transient', async () => {
    const d = deps();
    d.fetchMe.mockRejectedValue(new Error('Failed to fetch'));
    expect(await verifyStaffSession(d)).toEqual({ status: 'transient' });
  });

  it('no session at all is unauthorized without any request', async () => {
    const d = deps({ session: null });
    expect(await verifyStaffSession(d)).toEqual({ status: 'unauthorized', httpStatus: 401 });
    expect(d.fetchMe).not.toHaveBeenCalled();
  });
});

describe('logout reasons', () => {
  function fakeStorage() {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), raw: m };
  }

  it('records a reason and hands it back exactly once', () => {
    const s = fakeStorage();
    recordLogoutReason('revera', 'session_rejected', { storage: s });
    expect(consumeLogoutReason('revera', s)).toBe('session_rejected');
    expect(consumeLogoutReason('revera', s)).toBeNull();
  });

  it('onlyIfEmpty keeps the more specific reason that was written first', () => {
    const s = fakeStorage();
    recordLogoutReason('revera', 'inactivity', { storage: s });
    recordLogoutReason('revera', 'session_ended', { storage: s, onlyIfEmpty: true });
    expect(consumeLogoutReason('revera', s)).toBe('inactivity');
  });

  it('a deliberate logout clears it, and a reason older than a day or an unknown value is ignored', () => {
    const s = fakeStorage();
    recordLogoutReason('revera', 'inactivity', { storage: s });
    clearLogoutReason('revera', s);
    expect(consumeLogoutReason('revera', s)).toBeNull();

    s.setItem('revera_last_logout_reason', JSON.stringify({ reason: 'inactivity', at: Date.now() - 25 * 3600 * 1000 }));
    expect(consumeLogoutReason('revera', s)).toBeNull();
    s.setItem('revera_last_logout_reason', JSON.stringify({ reason: 'made_up', at: Date.now() }));
    expect(consumeLogoutReason('revera', s)).toBeNull();
    s.setItem('revera_last_logout_reason', 'not json');
    expect(consumeLogoutReason('revera', s)).toBeNull();
  });

  it('every reason has a message for the login page', () => {
    for (const r of ['inactivity', 'session_rejected', 'wrong_portal', 'session_ended'] as const) {
      expect(describeLogoutReason(r).length).toBeGreaterThan(10);
    }
  });
});

describe('deliberate logout broadcast between tabs', () => {
  function fakeStorage() {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
  }

  it('is seen by another tab right after the logout, and not before it or long after', async () => {
    const { broadcastDeliberateLogout, wasDeliberateLogoutRecently } = await import('@/lib/authRecovery');
    const s = fakeStorage();
    expect(wasDeliberateLogoutRecently('revera', 15000, s)).toBe(false);
    broadcastDeliberateLogout('revera', s);
    expect(wasDeliberateLogoutRecently('revera', 15000, s)).toBe(true);
    s.setItem('revera_deliberate_logout_at', String(Date.now() - 60000));
    expect(wasDeliberateLogoutRecently('revera', 15000, s)).toBe(false);
  });

  it('ignores garbage and a timestamp from the future', async () => {
    const { wasDeliberateLogoutRecently } = await import('@/lib/authRecovery');
    const s = fakeStorage();
    s.setItem('revera_deliberate_logout_at', 'abc');
    expect(wasDeliberateLogoutRecently('revera', 15000, s)).toBe(false);
    s.setItem('revera_deliberate_logout_at', String(Date.now() + 60000));
    expect(wasDeliberateLogoutRecently('revera', 15000, s)).toBe(false);
  });
});

describe('idle detection across tabs', () => {
  function fakeStorage() {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
  }

  it('a tab that was never touched is NOT idle while another tab is in use', async () => {
    const { writeSharedActivity, lastActivityAcrossTabs, isIdleExpired, IDLE_LOGOUT_MS } = await import('@/lib/authRecovery');
    const s = fakeStorage();
    const now = 10_000_000_000;
    const backgroundTabLast = now - 2 * IDLE_LOGOUT_MS; // idle for two hours in its own right
    expect(isIdleExpired(now, lastActivityAcrossTabs(backgroundTabLast, 'revera', now, s))).toBe(true);

    writeSharedActivity('revera', now - 5 * 60 * 1000, s); // the other tab was used 5 minutes ago
    const last = lastActivityAcrossTabs(backgroundTabLast, 'revera', now, s);
    expect(last).toBe(now - 5 * 60 * 1000);
    expect(isIdleExpired(now, last)).toBe(false);
  });

  it('really idle in every tab still expires after the limit', async () => {
    const { writeSharedActivity, lastActivityAcrossTabs, isIdleExpired, IDLE_LOGOUT_MS } = await import('@/lib/authRecovery');
    const s = fakeStorage();
    const now = 10_000_000_000;
    writeSharedActivity('revera', now - IDLE_LOGOUT_MS - 1000, s);
    expect(isIdleExpired(now, lastActivityAcrossTabs(now - IDLE_LOGOUT_MS - 5000, 'revera', now, s))).toBe(true);
  });

  it('the limit is exclusive on the low side and inclusive at exactly one hour', async () => {
    const { isIdleExpired, IDLE_LOGOUT_MS } = await import('@/lib/authRecovery');
    expect(isIdleExpired(IDLE_LOGOUT_MS - 1, 0)).toBe(false);
    expect(isIdleExpired(IDLE_LOGOUT_MS, 0)).toBe(true);
  });

  it('ignores a garbage or far-future stored time instead of staying logged in forever', async () => {
    const { lastActivityAcrossTabs } = await import('@/lib/authRecovery');
    const s = fakeStorage();
    const now = 10_000_000_000;
    s.setItem('revera_last_activity_at', 'abc');
    expect(lastActivityAcrossTabs(123, 'revera', now, s)).toBe(123);
    s.setItem('revera_last_activity_at', String(now + 24 * 3600 * 1000));
    expect(lastActivityAcrossTabs(123, 'revera', now, s)).toBe(123);
  });
});

describe('auth trail and logout detail (why did the session end?)', () => {
  function fakeStorage() {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
  }

  it('keeps only the latest entries, each stamped with the time', async () => {
    const { pushAuthTrail, readAuthTrail } = await import('@/lib/authRecovery');
    const s = fakeStorage();
    for (let i = 1; i <= 20; i++) pushAuthTrail('revera', `event ${i}`, { storage: s });
    const trail = readAuthTrail('revera', s);
    expect(trail).toHaveLength(15);
    expect(trail[0]).toMatch(/^\d{2}:\d{2}:\d{2} event 6$/);
    expect(trail[14]).toMatch(/event 20$/);
  });

  it('a broken or non-list stored trail reads as empty instead of throwing', async () => {
    const { readAuthTrail, pushAuthTrail } = await import('@/lib/authRecovery');
    const s = fakeStorage();
    s.setItem('revera_auth_trail', 'not json');
    expect(readAuthTrail('revera', s)).toEqual([]);
    s.setItem('revera_auth_trail', JSON.stringify({ a: 1 }));
    expect(readAuthTrail('revera', s)).toEqual([]);
    pushAuthTrail('revera', 'after garbage', { storage: s });
    expect(readAuthTrail('revera', s)).toHaveLength(1);
  });

  it('the detail written with a reason comes back with it, once', async () => {
    const { consumeLogoutNotice } = await import('@/lib/authRecovery');
    const s = fakeStorage();
    recordLogoutReason('revera', 'session_ended', { storage: s, detail: '10:01:02 [abc] SIGNED_OUT session=no' });
    expect(consumeLogoutNotice('revera', s)).toEqual({ reason: 'session_ended', detail: '10:01:02 [abc] SIGNED_OUT session=no' });
    expect(consumeLogoutNotice('revera', s)).toBeNull();
  });

  it('a reason recorded without detail has none, and consumeLogoutReason still returns just the reason', async () => {
    const { consumeLogoutNotice } = await import('@/lib/authRecovery');
    const s = fakeStorage();
    recordLogoutReason('revera', 'inactivity', { storage: s });
    expect(consumeLogoutNotice('revera', s)).toEqual({ reason: 'inactivity' });
    recordLogoutReason('revera', 'inactivity', { storage: s, detail: 'x' });
    expect(consumeLogoutReason('revera', s)).toBe('inactivity');
  });
});
