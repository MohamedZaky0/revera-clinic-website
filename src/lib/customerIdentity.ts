/**
 * Identity matching for the patient-facing side of /api/customers.
 *
 * Extracted so it is testable in isolation — see scratch/identitycheck.ts. This is
 * access-control logic (deciding whether a caller may read/write a given customer row),
 * so it should not be buried inline in a route handler. See RISK-018 / FINANCE_TRACKER 0.10.
 */

export interface AuthUser {
  id: string;
  email?: string | null;
  phone?: string | null;
}

export interface CustomerIdentity {
  auth_user_id?: string | null;
  mobile?: string | null;
  email?: string | null;
}

/** "+201035595691" and "01035595691" must compare equal; Supabase Auth stores E.164. */
export function normalizeEgyptMobile(raw?: string | null): string {
  if (!raw) return '';
  let m = raw.trim();
  if (m.startsWith('+20')) m = '0' + m.slice(3);
  else if (m.startsWith('20') && m.length > 10) m = '0' + m.slice(2);
  return m;
}

/**
 * Does this Supabase-authenticated user own this customer row?
 *
 * Prefers the durable `auth_user_id` link once a row has one. Falls back to matching
 * normalized phone or lowercased email for rows created before that link existed (every
 * row today, until GET backfills it — see the route). An empty/null customer never matches,
 * so an unknown mobile/email lookup returns false rather than a false positive.
 */
export function isOwnIdentity(user: AuthUser, customer: CustomerIdentity | null): boolean {
  if (!customer) return false;
  if (customer.auth_user_id) return customer.auth_user_id === user.id;

  const userMobile = normalizeEgyptMobile(user.phone);
  const customerMobile = normalizeEgyptMobile(customer.mobile);
  if (userMobile && customerMobile && userMobile === customerMobile) return true;

  if (user.email && customer.email && user.email.toLowerCase() === customer.email.toLowerCase()) return true;

  return false;
}
