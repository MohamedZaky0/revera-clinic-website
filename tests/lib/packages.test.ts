import { describe, it, expect } from 'vitest';
import {
  recognisedRevenuePerSession,
  recognisedRevenueSoFar,
  deferredBalance,
  isExpired,
  resolveExpiry,
} from '@/lib/packages';

describe('recognisedRevenuePerSession', () => {
  it('divides price evenly across sessions', () => {
    expect(recognisedRevenuePerSession(1000, 6)).toBe(166.67);
  });

  it('rounds to 2 decimal places', () => {
    expect(recognisedRevenuePerSession(100, 3)).toBe(33.33);
  });

  it('throws on totalSessions <= 0', () => {
    expect(() => recognisedRevenuePerSession(1000, 0)).toThrow();
    expect(() => recognisedRevenuePerSession(1000, -1)).toThrow();
  });
});

describe('recognisedRevenueSoFar', () => {
  it('returns 0 when qtyUsed is 0', () => {
    expect(recognisedRevenueSoFar(1000, 0, 6)).toBe(0);
  });

  it('returns full price when qtyUsed >= qtyTotal', () => {
    expect(recognisedRevenueSoFar(1000, 6, 6)).toBe(1000);
    expect(recognisedRevenueSoFar(1000, 10, 6)).toBe(1000);
  });

  it('computes per-session * qtyUsed', () => {
    expect(recognisedRevenueSoFar(1000, 2, 6)).toBe(333.34);
  });
});

describe('deferredBalance', () => {
  it('returns 0 when qtyRemaining <= 0', () => {
    expect(deferredBalance(1000, 0, 6)).toBe(0);
    expect(deferredBalance(1000, -1, 6)).toBe(0);
  });

  it('returns full price when qtyRemaining >= qtyTotal', () => {
    expect(deferredBalance(1000, 6, 6)).toBe(1000);
  });

  it('is the complement of recognisedRevenueSoFar (DEC-023 rounding rule)', () => {
    // 1000 / 6 = 166.67 per session; 2 used → 333.34 recognised; 4 remaining → 666.66 deferred
    // 333.34 + 666.66 = 1000.00 exactly — NOT 1000.01
    const pricePaid = 1000;
    const qtyTotal = 6;
    const qtyUsed = 2;
    const qtyRemaining = qtyTotal - qtyUsed;

    const recognised = recognisedRevenueSoFar(pricePaid, qtyUsed, qtyTotal);
    const deferred = deferredBalance(pricePaid, qtyRemaining, qtyTotal);

    expect(recognised).toBe(333.34);
    expect(deferred).toBe(666.66);
    expect(recognised + deferred).toBe(pricePaid);
  });

  it('sum holds after 3 sessions too', () => {
    const pricePaid = 1000;
    const qtyTotal = 6;
    const qtyUsed = 3;
    const qtyRemaining = qtyTotal - qtyUsed;

    const recognised = recognisedRevenueSoFar(pricePaid, qtyUsed, qtyTotal);
    const deferred = deferredBalance(pricePaid, qtyRemaining, qtyTotal);

    expect(recognised + deferred).toBe(pricePaid);
  });

  it('sum holds after 5 sessions (last session)', () => {
    const pricePaid = 1000;
    const qtyTotal = 6;
    const qtyUsed = 5;
    const qtyRemaining = qtyTotal - qtyUsed;

    const recognised = recognisedRevenueSoFar(pricePaid, qtyUsed, qtyTotal);
    const deferred = deferredBalance(pricePaid, qtyRemaining, qtyTotal);

    expect(recognised + deferred).toBe(pricePaid);
  });
});

describe('isExpired', () => {
  it('returns false when no expiry set', () => {
    expect(isExpired(null, new Date())).toBe(false);
    expect(isExpired(undefined, new Date())).toBe(false);
  });

  it('returns true when expiry is in the past', () => {
    expect(isExpired('2026-01-01', new Date('2026-08-17'))).toBe(true);
  });

  it('returns false when expiry is in the future', () => {
    expect(isExpired('2026-12-31', new Date('2026-08-17'))).toBe(false);
  });

  it('accepts Date objects', () => {
    expect(isExpired(new Date('2026-01-01'), new Date('2026-08-17'))).toBe(true);
  });
});

describe('resolveExpiry', () => {
  it('returns recognise_revenue action', () => {
    expect(resolveExpiry({ onExpiry: 'recognise_revenue' }, new Date('2026-08-17'))).toEqual({
      action: 'recognise_revenue',
    });
  });

  it('returns extend action with new expiry date', () => {
    const result = resolveExpiry({ onExpiry: 'extend', extensionDays: 30 }, new Date('2026-08-17T00:00:00Z'));
    if (result.action === 'extend') {
      expect(result.newExpiresAt).toBe('2026-09-16T00:00:00.000Z');
    } else {
      expect.fail('expected extend action');
    }
  });

  it('throws when onExpiry is extend but extensionDays is missing/0', () => {
    expect(() => resolveExpiry({ onExpiry: 'extend' }, new Date())).toThrow();
    expect(() => resolveExpiry({ onExpiry: 'extend', extensionDays: 0 }, new Date())).toThrow();
  });
});
