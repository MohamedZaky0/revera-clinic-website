/**
 * Shared-cache headers for the PUBLIC read endpoints (RISK-137 / DEC-131).
 *
 * Every public page view used to cost ~8 PostgREST queries because nothing was cached. A response
 * that is identical for every anonymous caller can safely sit in the CDN for a minute; a response
 * produced for a caller who sent credentials must never be shared.
 *
 *  - No Authorization header  -> `public, s-maxage=60, stale-while-revalidate=300`
 *  - Authorization present    -> `private, no-store` (staff always read fresh data)
 *  - no request object at all -> `private, no-store` (cannot prove the caller is anonymous)
 *
 * `Vary: Authorization` is always set so a shared cache keeps the two variants apart.
 * Only use this on 200 responses built from the database; never on error or fallback bodies.
 */
export const PUBLIC_READ_CACHE_CONTROL = 'public, s-maxage=60, stale-while-revalidate=300';
export const NO_SHARED_CACHE_CONTROL = 'private, no-store';

/** True when the caller sent an Authorization header at all (any scheme, valid, blank or junk). */
export function hasAuthorization(req?: Request | null): boolean {
  if (!req) return true; // unknown caller: treat as credentialed so we never cache it
  return req.headers.has('authorization');
}

/** Response headers for a successful public read. */
export function publicReadHeaders(req?: Request | null): Record<string, string> {
  return {
    'Cache-Control': hasAuthorization(req) ? NO_SHARED_CACHE_CONTROL : PUBLIC_READ_CACHE_CONTROL,
    Vary: 'Authorization',
  };
}
