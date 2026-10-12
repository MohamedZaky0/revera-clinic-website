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
