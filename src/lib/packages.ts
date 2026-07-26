/**
 * Pure package / deferred-revenue arithmetic for the PROPOSAL-002 Phase 1 financial ledger.
 *
 * No `supabaseServer` calls in this file — same reasoning as src/lib/ledger.ts. See
 * ai_docs/DECISIONS.md DEC-023 (packages are deferred revenue, recognised per session) and
 * DEC-025 (expired package sessions convert to revenue or the package is extended), and
 * ai_docs/FINANCE_TRACKER.md "Phase 1 — Financial Ledger Spine" task 1.8.
 */

/**
 * Revenue recognised for ONE session delivered out of a package.
 *
 * A package spreads its price evenly across its sessions — DEC-023 chose pro-rata specifically
 * because it is the version of this math a non-accountant clinic owner can sanity-check by hand
 * (DEC-014). Throws on totalSessions <= 0 rather than returning Infinity/NaN: a package with no
 * sessions is a data error upstream (in `packages`/`package_items`), not a valid state to price.
 */
export function recognisedRevenuePerSession(pricePaid: number, totalSessions: number): number {
  if (!Number.isFinite(totalSessions) || totalSessions <= 0) {
    throw new Error(
      `recognisedRevenuePerSession: totalSessions must be a positive number, got ${totalSessions}`
    );
  }
  return round2(pricePaid / totalSessions);
}

/**
 * The deferred-revenue liability for one customer_package_items row — money already collected
 * for sessions not yet delivered. Sum across a customer's rows for their total deferred balance.
 *
 * Computed as the COMPLEMENT of revenue recognised so far (`price_paid - recognised_so_far`),
 * not as its own independent `price_paid * qty_remaining / qty_total`. Rounding the two sides
 * separately can silently create or destroy a cent — e.g. a 1000 EGP / 6-session package rounds
 * to 166.67 per session; 2 sessions recognised (333.34) plus 4 remaining independently rounded
 * (666.67) sums to 1000.01, not 1000. Deriving deferred as the remainder guarantees
 * `recognised_so_far + deferred === price_paid` by construction, the way every real accounting
 * system allocates a rounding remainder to the last bucket rather than rounding each bucket on
 * its own. Caught by scratch/phase1packagecheck.ts — do not "simplify" this back to the
 * independent formula.
 */
export function deferredBalance(pricePaid: number, qtyRemaining: number, qtyTotal: number): number {
  if (!Number.isFinite(qtyTotal) || qtyTotal <= 0) {
    throw new Error(`deferredBalance: qtyTotal must be a positive number, got ${qtyTotal}`);
  }
  if (qtyRemaining <= 0) return 0;
  if (qtyRemaining >= qtyTotal) return round2(pricePaid);

  const qtyUsed = qtyTotal - qtyRemaining;
  const recognisedSoFar = recognisedRevenueSoFar(pricePaid, qtyUsed, qtyTotal);
  return round2(pricePaid - recognisedSoFar);
}

/**
 * Total revenue recognised across ALL sessions delivered so far for one package — the
 * counterpart to `deferredBalance`. Exposed separately so callers (and the regression check)
 * can verify `recognisedRevenueSoFar(...) + deferredBalance(...) === price_paid` without
 * reaching into `deferredBalance`'s internals.
 */
export function recognisedRevenueSoFar(pricePaid: number, qtyUsed: number, qtyTotal: number): number {
  if (qtyUsed <= 0) return 0;
  const perSession = recognisedRevenuePerSession(pricePaid, qtyTotal);
  return round2(perSession * qtyUsed);
}

export function isExpired(expiresAt: string | Date | null | undefined, asOf: Date): boolean {
  if (!expiresAt) return false; // no expiry set — never expires
  const expiry = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  return expiry.getTime() < asOf.getTime();
}

export type ExpiryResolution =
  | { action: 'recognise_revenue' }
  | { action: 'extend'; newExpiresAt: string };

/**
 * Resolves an expired package against its DEFAULT policy (`packages.on_expiry`). Only call this
 * once `isExpired()` has confirmed the package is actually past due — it does not check that
 * itself, so it can be reused for a "what would happen if this expired today" preview.
 *
 * The manual per-customer extend action (task 1.13) does NOT go through this function — DEC-025
 * treats it as a distinct, explicit override of the default, not something this resolver should
 * ever be asked to produce on its own.
 */
export function resolveExpiry(
  pkg: { onExpiry: 'recognise_revenue' | 'extend'; extensionDays?: number | null },
  currentExpiresAt: Date
): ExpiryResolution {
  if (pkg.onExpiry === 'recognise_revenue') {
    return { action: 'recognise_revenue' };
  }

  if (!pkg.extensionDays || pkg.extensionDays <= 0) {
    throw new Error(
      "resolveExpiry: on_expiry is 'extend' but extension_days is not set to a positive number — " +
        'fix the package configuration before it can expire.'
    );
  }

  const extended = new Date(currentExpiresAt.getTime());
  extended.setUTCDate(extended.getUTCDate() + pkg.extensionDays);

  return { action: 'extend', newExpiresAt: extended.toISOString() };
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
