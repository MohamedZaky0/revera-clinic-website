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
