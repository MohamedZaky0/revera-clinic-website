/**
 * RISK-114: Supabase's own client can fire a `SIGNED_OUT` auth event with no deliberate
 * `supabase.auth.signOut()` call from this app at all — most commonly when its own background
 * token refresh fails, which happens for real on a refresh-token rotation collision when the same
 * staff login is open in more than one browser tab/window (each tab refreshes independently off
 * the same stored refresh token; Supabase only lets that token be used once). Treating every
 * `SIGNED_OUT` as "show the login screen" bounced staff off the admin panel mid-booking or
 * mid-edit, with nothing actually wrong with their login.
 *
 * This is the pure recovery decision, extracted out of `src/app/admin/page.tsx` so it can be
 * tested directly: given the real `refresh_token` from the last session this page actually held
 * (captured proactively, since by the time `SIGNED_OUT` fires the SDK has already cleared its own
 * stored session), try exchanging it for a fresh session before giving up and treating the
 * sign-out as final.
 */
export interface RefreshSessionClient {
  auth: {
    refreshSession: (args: { refresh_token: string }) => Promise<{ data: { session: any | null }; error: any }>;
  };
}

export type AuthRecoveryResult =
  | { recovered: true; session: any }
  | { recovered: false; reason: 'no_last_token' | 'refresh_failed' };

export async function recoverFromInvoluntarySignOut(
  supabaseClient: RefreshSessionClient,
  lastRefreshToken: string | null | undefined
): Promise<AuthRecoveryResult> {
  if (!lastRefreshToken) {
    return { recovered: false, reason: 'no_last_token' };
  }

  try {
    const { data, error } = await supabaseClient.auth.refreshSession({ refresh_token: lastRefreshToken });
    if (!error && data?.session) {
      return { recovered: true, session: data.session };
    }
    return { recovered: false, reason: 'refresh_failed' };
  } catch {
    return { recovered: false, reason: 'refresh_failed' };
  }
}

/**
 * RISK-117: `/api/auth/me` answering 401 used to sign the person out on the spot. A 401 does not
 * always mean the login is dead: the access token held in memory can be stale (laptop asleep or
 * offline past its one-hour life, a clock that is off) while the refresh token is perfectly good.
 * Likewise any failure other than 401/403 (cold start, brief network loss) left the page with a
 * session but no role, and the shell then bounced to /login as if signed out.
 *
 * This is that decision as a pure function: verify once; on 401 force one token refresh and verify
 * again before calling it final; on anything else retry a couple of times and then report
 * "transient" so the caller keeps the session instead of leaving.
 */
export type StaffSessionVerification =
  | { status: 'ok'; me: any; session: any }
  | { status: 'unauthorized'; httpStatus: number }
  | { status: 'transient' };

export interface VerifyStaffSessionDeps {
  session: { access_token: string } | null | undefined;
  /** GET /api/auth/me with the given access token; resolves to the raw Response, or throws on network failure. */
  fetchMe: (accessToken: string) => Promise<{ ok: boolean; status: number; json: () => Promise<any> }>;
  /** supabase.auth.refreshSession() using the stored refresh token. */
  refreshSession: () => Promise<{ data: { session: any | null }; error: any }>;
  sleep?: (ms: number) => Promise<void>;
  /** Waits (ms) between retries of a transient failure. */
  retryDelaysMs?: number[];
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function verifyStaffSession(deps: VerifyStaffSessionDeps): Promise<StaffSessionVerification> {
  const sleep = deps.sleep ?? defaultSleep;
  const delays = deps.retryDelaysMs ?? [1000, 3000];
  let session: any = deps.session;
  if (!session?.access_token) return { status: 'unauthorized', httpStatus: 401 };

  let refreshedAlready = false;

  for (let attempt = 0; ; attempt++) {
    let res: { ok: boolean; status: number; json: () => Promise<any> } | null = null;
    try {
      res = await deps.fetchMe(session.access_token);
    } catch {
      res = null; // network failure
    }

    if (res?.ok) {
      return { status: 'ok', me: await res.json(), session };
    }
    if (res && res.status === 403) {
      return { status: 'unauthorized', httpStatus: 403 };
    }

    if (res && res.status === 401) {
      if (refreshedAlready) return { status: 'unauthorized', httpStatus: 401 };
      refreshedAlready = true;
      try {
        const { data, error } = await deps.refreshSession();
        if (!error && data?.session?.access_token) {
          session = data.session;
          continue; // verify again with the fresh token
        }
        // The refresh token itself was refused (4xx) = the login really is over. Anything else
        // (network, 5xx) says nothing about the login.
        const status = Number(error?.status);
        if (status >= 400 && status < 500) return { status: 'unauthorized', httpStatus: 401 };
        return { status: 'transient' };
      } catch {
        return { status: 'transient' };
      }
    }

    // network failure, 5xx or any other non-auth answer: retry, then give up as transient
    if (attempt >= delays.length) return { status: 'transient' };
    await sleep(delays[attempt]);
  }
}

/**
 * Why the staff member was last sent to /login without clicking Logout. Written just before the
 * redirect and shown (once) on the login page, so "it logged me out" can be reported with a cause
 * instead of a guess. A deliberate Logout clears it.
 */
export type LogoutReason = 'inactivity' | 'session_rejected' | 'wrong_portal' | 'session_ended';

const LOGOUT_REASON_KEY_SUFFIX = '_last_logout_reason';

interface StorageLike {
  getItem: (k: string) => string | null;
  setItem: (k: string, v: string) => void;
  removeItem: (k: string) => void;
}

function safeStorage(storage?: StorageLike): StorageLike | null {
  if (storage) return storage;
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function recordLogoutReason(prefix: string, reason: LogoutReason, opts: { onlyIfEmpty?: boolean; storage?: StorageLike } = {}): void {
  const store = safeStorage(opts.storage);
  if (!store) return;
  try {
    const key = `${prefix}${LOGOUT_REASON_KEY_SUFFIX}`;
    if (opts.onlyIfEmpty && store.getItem(key)) return;
    store.setItem(key, JSON.stringify({ reason, at: Date.now() }));
  } catch {
    /* storage blocked: the notice is a convenience only */
  }
}

export function clearLogoutReason(prefix: string, storage?: StorageLike): void {
  try {
    safeStorage(storage)?.removeItem(`${prefix}${LOGOUT_REASON_KEY_SUFFIX}`);
  } catch {
    /* ignore */
  }
}

/** Reads and removes the stored reason; ignores anything older than a day. */
export function consumeLogoutReason(prefix: string, storage?: StorageLike): LogoutReason | null {
  const store = safeStorage(storage);
  if (!store) return null;
  try {
    const key = `${prefix}${LOGOUT_REASON_KEY_SUFFIX}`;
    const raw = store.getItem(key);
    store.removeItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.at !== 'number' || Date.now() - parsed.at > 24 * 3600 * 1000) return null;
    return ['inactivity', 'session_rejected', 'wrong_portal', 'session_ended'].includes(parsed.reason) ? parsed.reason : null;
  } catch {
    return null;
  }
}

export function describeLogoutReason(reason: LogoutReason): string {
  switch (reason) {
    case 'inactivity':
      return 'You were signed out after an hour without activity.';
    case 'session_rejected':
      return 'The server rejected your session even after a refresh, so you were signed out. If this keeps happening, check that this computer\'s date and time are correct.';
    case 'wrong_portal':
      return 'This account belongs to a different portal. Sign in from your own portal.';
    case 'session_ended':
      return 'Your session ended unexpectedly. Please sign in again.';
  }
}

/**
 * A deliberate Logout in one tab empties the shared stored session, which every other open tab of
 * this browser sees as a SIGNED_OUT it did not cause. Those tabs must follow the logout, not try to
 * "recover" the session that was just ended on purpose, and must not call it unexpected. The tab
 * that logs out leaves a short-lived timestamp for the others to read.
 */
const LOGOUT_BROADCAST_KEY_SUFFIX = '_deliberate_logout_at';

export function broadcastDeliberateLogout(prefix: string, storage?: StorageLike): void {
  try {
    safeStorage(storage)?.setItem(`${prefix}${LOGOUT_BROADCAST_KEY_SUFFIX}`, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function wasDeliberateLogoutRecently(prefix: string, withinMs = 15000, storage?: StorageLike): boolean {
  try {
    const raw = safeStorage(storage)?.getItem(`${prefix}${LOGOUT_BROADCAST_KEY_SUFFIX}`);
    const at = Number(raw);
    return Number.isFinite(at) && at > 0 && Date.now() - at >= 0 && Date.now() - at <= withinMs;
  } catch {
    return false;
  }
}
