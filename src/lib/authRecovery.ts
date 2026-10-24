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
  | { status: 'unauthorized'; httpStatus: number; code?: string }
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
      // DEC-117: /api/auth/me says why when the account has been switched Inactive.
      let code: string | undefined;
      try {
        code = (await res.json())?.code;
      } catch {
        /* no body: keep the generic reason */
      }
      return { status: 'unauthorized', httpStatus: 403, code };
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
export type LogoutReason = 'inactivity' | 'session_rejected' | 'wrong_portal' | 'session_ended' | 'account_inactive';

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

export function recordLogoutReason(
  prefix: string,
  reason: LogoutReason,
  opts: { onlyIfEmpty?: boolean; storage?: StorageLike; detail?: string } = {}
): void {
  const store = safeStorage(opts.storage);
  if (!store) return;
  try {
    const key = `${prefix}${LOGOUT_REASON_KEY_SUFFIX}`;
    if (opts.onlyIfEmpty && store.getItem(key)) return;
    store.setItem(key, JSON.stringify({ reason, at: Date.now(), ...(opts.detail ? { detail: opts.detail.slice(0, 2000) } : {}) }));
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

/** Reads and removes the stored reason (and the technical detail kept with it); ignores anything older than a day. */
export function consumeLogoutNotice(prefix: string, storage?: StorageLike): { reason: LogoutReason; detail?: string } | null {
  const store = safeStorage(storage);
  if (!store) return null;
  try {
    const key = `${prefix}${LOGOUT_REASON_KEY_SUFFIX}`;
    const raw = store.getItem(key);
    store.removeItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.at !== 'number' || Date.now() - parsed.at > 24 * 3600 * 1000) return null;
    if (!['inactivity', 'session_rejected', 'wrong_portal', 'session_ended', 'account_inactive'].includes(parsed.reason)) return null;
    return { reason: parsed.reason, ...(typeof parsed.detail === 'string' && parsed.detail ? { detail: parsed.detail } : {}) };
  } catch {
    return null;
  }
}

export function consumeLogoutReason(prefix: string, storage?: StorageLike): LogoutReason | null {
  return consumeLogoutNotice(prefix, storage)?.reason ?? null;
}

/**
 * A short, shared trail of what this browser's auth session went through (events Supabase fired,
 * whether the tab was visible, the outcome of a recovery attempt). "Your session ended unexpectedly"
 * says nothing about WHY on a computer where it keeps happening; the trail is written into the
 * login-page notice when that happens, so the cause can be read off the screen instead of guessed.
 * It lives in localStorage so every open tab of the browser writes to the same list. It never holds
 * tokens, emails or any patient data - only event names, yes/no flags and error messages.
 */
const AUTH_TRAIL_KEY_SUFFIX = '_auth_trail';
const AUTH_TRAIL_MAX = 15;

export function readAuthTrail(prefix: string, storage?: StorageLike): string[] {
  try {
    const raw = safeStorage(storage)?.getItem(`${prefix}${AUTH_TRAIL_KEY_SUFFIX}`);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x: unknown): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function pushAuthTrail(prefix: string, text: string, opts: { storage?: StorageLike; now?: number } = {}): void {
  try {
    const store = safeStorage(opts.storage);
    if (!store) return;
    const at = new Date(opts.now ?? Date.now());
    const hhmmss = [at.getHours(), at.getMinutes(), at.getSeconds()].map((n) => String(n).padStart(2, '0')).join(':');
    const next = [...readAuthTrail(prefix, store), `${hhmmss} ${text}`.slice(0, 160)].slice(-AUTH_TRAIL_MAX);
    store.setItem(`${prefix}${AUTH_TRAIL_KEY_SUFFIX}`, JSON.stringify(next));
  } catch {
    /* the trail is a convenience only */
  }
}

export function clearAuthTrail(prefix: string, storage?: StorageLike): void {
  try {
    safeStorage(storage)?.removeItem(`${prefix}${AUTH_TRAIL_KEY_SUFFIX}`);
  } catch {
    /* ignore */
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
    case 'account_inactive':
      return 'This account has been made inactive, so you were signed out. Contact an administrator to get access back.';
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

/**
 * Idle detection across tabs. Each tab used to watch only its own mouse and keyboard, so a tab left
 * in the background while the person worked in another tab of the same app counted as idle: after
 * an hour it signed the whole browser out (the session is shared), and for non-admin staff it raised
 * a false "inactive" alert. Every tab now also publishes its activity here and the idle check uses
 * the latest activity seen in any tab.
 */
export const IDLE_LOGOUT_MS = 60 * 60 * 1000;
const ACTIVITY_KEY_SUFFIX = '_last_activity_at';

export function writeSharedActivity(prefix: string, now: number = Date.now(), storage?: StorageLike): void {
  try {
    safeStorage(storage)?.setItem(`${prefix}${ACTIVITY_KEY_SUFFIX}`, String(now));
  } catch {
    /* ignore */
  }
}

/** Latest activity of this tab and of any other tab. A stored time in the future is ignored. */
export function lastActivityAcrossTabs(localLast: number, prefix: string, now: number = Date.now(), storage?: StorageLike): number {
  try {
    const shared = Number(safeStorage(storage)?.getItem(`${prefix}${ACTIVITY_KEY_SUFFIX}`));
    if (Number.isFinite(shared) && shared > 0 && shared <= now + 5000) {
      return Math.max(localLast, shared);
    }
  } catch {
    /* ignore */
  }
  return localLast;
}

export function isIdleExpired(now: number, lastActivity: number, limitMs: number = IDLE_LOGOUT_MS): boolean {
  return now - lastActivity >= limitMs;
}
