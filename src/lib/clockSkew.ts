/**
 * RISK-130: a computer whose clock is about an hour out (typically a wrong time zone fixed "by
 * eye" by setting the time by hand) makes every freshly issued login token look expired to the
 * browser, so every request refreshes it; Supabase then answers 429 and the login is dropped.
 *
 * The server's clock is the reference: compare it with this computer's using the HTTP `Date`
 * header of any same-origin response. The header has one-second precision and the answer arrives
 * a moment after it was stamped, so only a clearly large gap counts as a problem.
 */
export const CLOCK_SKEW_WARN_MS = 5 * 60 * 1000;

/** This computer's clock minus the server's, in ms (positive = this computer is ahead); null if unreadable. */
export function clockSkewMs(serverDateHeader: string | null | undefined, localNow: number = Date.now()): number | null {
  if (!serverDateHeader) return null;
  const server = Date.parse(serverDateHeader);
  if (!Number.isFinite(server)) return null;
  return localNow - server;
}

export function isClockSkewed(skewMs: number | null | undefined, limitMs: number = CLOCK_SKEW_WARN_MS): boolean {
  return typeof skewMs === 'number' && Number.isFinite(skewMs) && Math.abs(skewMs) >= limitMs;
}

/** Whole hours and minutes of the gap, rounded to the nearest minute. */
export function splitSkew(skewMs: number): { hours: number; minutes: number; ahead: boolean } {
  const totalMinutes = Math.round(Math.abs(skewMs) / 60000);
  return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60, ahead: skewMs > 0 };
}
