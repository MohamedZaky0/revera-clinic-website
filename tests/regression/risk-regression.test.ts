/**
 * Regression tests for RISK-038…RISK-050.
 *
 * Each test corresponds to a real defect that reached the running system.
 * Named so the risk number is obvious in test output.
 *
 * Per the brief: "prove each test can fail." For every test here, I temporarily
 * inverted the assertion locally, confirmed it went red, then restored it.
 * Confirmed per-test below.
 */
import { describe, it, expect } from 'vitest';
import { computeSettledBalances } from '@/lib/billing';
import { isOwnIdentity } from '@/lib/customerIdentity';
import { recognisedRevenueSoFar, deferredBalance } from '@/lib/packages';
import { getSessionStaleness } from '@/lib/services';

describe('RISK-043: getSessionStaleness — null started_at → no fabricated duration', () => {
  // Confirmed fail: when inverted to expect(elapsedMs).not.toBeNull() → fails because
  // getSessionStaleness returns elapsedMs: null for null started_at.
  it('null started_at with past booking date → stale, elapsedMs null, elapsedLabel null', () => {
    const result = getSessionStaleness('started', null, '2026-08-10', undefined, new Date('2026-08-17T12:00:00Z'));
    expect(result.isStale).toBe(true);
    expect(result.elapsedMs).toBe(null);
    expect(result.elapsedLabel).toBe(null);
  });
});

describe('RISK-043: completed booking is never stale regardless of age', () => {
  // Confirmed fail: when inverted to expect(result.isStale).toBe(true) → fails because
  // getSessionStaleness returns NOT_STALE for any status other than started/in_progress.
  it('completed with 8h-old started_at → not stale', () => {
    const result = getSessionStaleness(
      'completed',
      '2026-08-17T04:00:00Z',
      '2026-08-17',
      undefined,
      new Date('2026-08-17T12:00:00Z')
    );
    expect(result.isStale).toBe(false);
  });
});

describe('RISK-043: stale threshold boundary — not stale at 1h, stale at 3h (2h threshold)', () => {
  // Confirmed fail: when the 1h assertion was inverted to expect(true) → fails because
  // 1h < 2h threshold → not stale. When the 3h assertion was inverted to expect(false) →
  // fails because 3h > 2h threshold → stale.
  it('1h ago with 2h threshold → not stale', () => {
    const result = getSessionStaleness(
      'started',
      '2026-08-17T11:00:00Z',
      '2026-08-17',
      2 * 60 * 60 * 1000,
      new Date('2026-08-17T12:00:00Z')
    );
    expect(result.isStale).toBe(false);
  });

  it('3h ago with 2h threshold → stale', () => {
    const result = getSessionStaleness(
      'started',
      '2026-08-17T09:00:00Z',
      '2026-08-17',
      2 * 60 * 60 * 1000,
      new Date('2026-08-17T12:00:00Z')
    );
    expect(result.isStale).toBe(true);
  });
});

describe('RISK-012: computeSettledBalances re-fire idempotency', () => {
  // Confirmed fail: when inverted to expect(result.spent).not.toBe(500) → fails because
  // identical deltas on wasCompleted:true produce zero change.
  it('re-fired with identical inputs on wasCompleted: true → no change', () => {
    const result = computeSettledBalances({
      current: { wallet: 100, spent: 500, outstanding: 200 },
      wasCompleted: true,
      oldPaid: 200,
      oldLeft: 300,
      newPaid: 200,
      newLeft: 300,
    });
    expect(result.spent).toBe(500);
    expect(result.outstanding).toBe(200);
    expect(result.wallet).toBe(100);
  });
});

describe('RISK-049: isOwnIdentity — null customer and mismatched phone return false', () => {
  // Confirmed fail: when inverted to expect(true) → fails because isOwnIdentity
  // returns false for null customer and for mismatched phone.
  it('null customer → false', () => {
    expect(isOwnIdentity({ id: 'user-1', phone: '01035595691' }, null)).toBe(false);
  });

  it('mismatched phone → false', () => {
    expect(
      isOwnIdentity(
        { id: 'user-1', phone: '01035595691' },
        { mobile: '01222222222' }
      )
    ).toBe(false);
  });
});

describe('DEC-023: recognisedRevenueSoFar + deferredBalance === price_paid', () => {
  // Confirmed fail: when inverted to expect(sum).not.toBe(1000) → fails because
  // deferredBalance is the complement of recognisedRevenueSoFar, so the sum is exact.
  it('1000/6 package after 2 sessions: 333.34 + 666.66 = 1000.00', () => {
    const pricePaid = 1000;
    const qtyTotal = 6;
    const qtyUsed = 2;
    const qtyRemaining = qtyTotal - qtyUsed;

    const recognised = recognisedRevenueSoFar(pricePaid, qtyUsed, qtyTotal);
    const deferred = deferredBalance(pricePaid, qtyRemaining, qtyTotal);
    const sum = recognised + deferred;

    expect(sum).toBe(pricePaid);
  });
});

/**
 * RISK-039 (payment status display rules) and RISK-044 (summary card scoping) live
 * inline in AdminBookingsView.tsx's row mapper / stats useMemo and are NOT exported.
 * Per the brief: "Do not refactor application code to make it testable in this brief;
 * that is Phase 1's job." These are reported as "requires Phase 1 extraction to test."
 *
 * RISK-042 (wallet zero-delta, insufficient balance) lives in src/lib/wallet.ts which
 * imports supabaseServer — it is not a pure function. Testing it requires mocking
 * Supabase, which overlaps with TASK-0.4. Reported as "requires mock setup; covered
 * in TASK-0.4 scope."
 *
 * RISK-038 (session total discarded), RISK-040 (orphaned bookings), RISK-041 (admin
 * booking no payment), RISK-045 (prescription save), RISK-046 (checked_in fallback),
 * RISK-047 (hardcoded doctor), RISK-048 (pulse counter), RISK-050 (PATCH auth gate) —
 * all live in component render logic or route handlers that are not exported as pure
 * functions. Reported as "requires Phase 1 extraction or route-level test harness."
 */
