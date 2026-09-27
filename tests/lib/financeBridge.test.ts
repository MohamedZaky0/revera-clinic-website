/**
 * DEC-088 item 9: the cash -> revenue bridge and the deferred package balance are pure arithmetic over rows the
 * routes fetch, so they are tested here without a database.
 */
import { describe, it, expect } from 'vitest';
import {
  computeRevenueBridge,
  packageCashReceived,
  computeDeferredBreakdown,
  type DeferredPackageInput,
} from '@/lib/financeBridge';

describe('computeRevenueBridge', () => {
  it("the owner's example: 50,000 collected, 40,000 of it for undelivered packages, 10,000 earned", () => {
    const b = computeRevenueBridge({ cashReceived: 50000, packageCashReceived: 40000, packageRecognised: 0, revenueEarned: 10000 });
    expect(b).toEqual({ cashReceived: 50000, packageCashReceived: 40000, packageRecognised: 0, revenueEarned: 10000, otherTiming: 0 });
  });

  it('adds back package revenue earned this month from packages paid for earlier', () => {
    const b = computeRevenueBridge({ cashReceived: 10000, packageCashReceived: 0, packageRecognised: 3000, revenueEarned: 13000 });
    expect(b.otherTiming).toBe(0);
  });

  it('other timing is the honest residual: billed-but-unpaid services raise revenue above cash', () => {
    const b = computeRevenueBridge({ cashReceived: 5000, packageCashReceived: 0, packageRecognised: 0, revenueEarned: 8000 });
    expect(b.otherTiming).toBe(3000);
  });

  it('other timing can be negative: cash collected this month for services billed earlier', () => {
    const b = computeRevenueBridge({ cashReceived: 9000, packageCashReceived: 0, packageRecognised: 0, revenueEarned: 6000 });
    expect(b.otherTiming).toBe(-3000);
  });

  it('the four lines always add up to the revenue figure (no rounding drift)', () => {
    const b = computeRevenueBridge({ cashReceived: 1000.1, packageCashReceived: 333.33, packageRecognised: 166.67, revenueEarned: 900.05 });
    const sum = b.cashReceived - b.packageCashReceived + b.packageRecognised + b.otherTiming;
    expect(Math.round(sum * 100) / 100).toBe(b.revenueEarned);
  });
});

describe('packageCashReceived', () => {
  const invoices = [
    { id: 'pkg-only', grandTotal: 5000 },
    { id: 'mixed', grandTotal: 2000 },
    { id: 'service-only', grandTotal: 1000 },
    { id: 'zero', grandTotal: 0 },
  ];
  const lines = [
    { invoiceId: 'pkg-only', lineType: 'package', lineTotal: 5000 },
    { invoiceId: 'mixed', lineType: 'package', lineTotal: 1500 },
    { invoiceId: 'mixed', lineType: 'service', lineTotal: 500 },
    { invoiceId: 'service-only', lineType: 'service', lineTotal: 1000 },
  ];

  it('counts a package sale invoice fully and a mixed invoice by its package share', () => {
    const payments = [
      { invoiceId: 'pkg-only', amount: 5000 },
      { invoiceId: 'mixed', amount: 2000 },
      { invoiceId: 'service-only', amount: 1000 },
    ];
    // 5,000 + 2,000 × (1,500 / 2,000) = 6,500
    expect(packageCashReceived(invoices, lines, payments)).toBe(6500);
  });

  it('a part payment on a package invoice is counted in proportion — only what was actually received', () => {
    expect(packageCashReceived(invoices, lines, [{ invoiceId: 'pkg-only', amount: 1200 }])).toBe(1200);
  });

  it('ignores service-only invoices, zero-total invoices and payments on unknown invoices', () => {
    expect(packageCashReceived(invoices, lines, [
      { invoiceId: 'service-only', amount: 1000 },
      { invoiceId: 'zero', amount: 50 },
      { invoiceId: 'ghost', amount: 999 },
    ])).toBe(0);
  });

  it('never counts more than the payment (share is capped at 1 even if package lines exceed the total)', () => {
    expect(packageCashReceived(
      [{ id: 'odd', grandTotal: 1000 }],
      [{ invoiceId: 'odd', lineType: 'package', lineTotal: 1500 }],
      [{ invoiceId: 'odd', amount: 400 }]
    )).toBe(400);
  });
});

function pulsesPkg(over: Partial<DeferredPackageInput> = {}): DeferredPackageInput {
  return {
    id: 'p1', customerName: 'Mona', packageName: '10,000 Pulses', packageType: 'pulses', status: 'active', expiresAt: null,
    pricePaid: 5000, pricePending: false, totalPulses: 10000, pulsesRemaining: 6000, items: [], ...over,
  };
}
function servicesPkg(over: Partial<DeferredPackageInput> = {}): DeferredPackageInput {
  return {
    id: 's1', customerName: 'Sara', packageName: 'Body Bundle', packageType: 'services', status: 'active', expiresAt: null,
    pricePaid: 1100, pricePending: false, totalPulses: 0, pulsesRemaining: 0,
    items: [
      { serviceId: 1, serviceName: 'Underarm', qtyTotal: 5, qtyRemaining: 5 },
      { serviceId: 2, serviceName: 'Full Body', qtyTotal: 6, qtyRemaining: 6 },
    ], ...over,
  };
}

describe('computeDeferredBreakdown', () => {
  it('pulses: price × remaining ÷ total', () => {
    const d = computeDeferredBreakdown([pulsesPkg()]);
    expect(d.pulses).toEqual({ packages: 1, pulsesRemaining: 6000, amount: 3000 });
    expect(d.total).toBe(3000);
    expect(d.pending.count).toBe(0);
  });

  it('services: the price is split across items by remaining sessions (5 Underarm + 6 Full Body of 11 sessions)', () => {
    const d = computeDeferredBreakdown([servicesPkg()]);
    expect(d.services).toEqual([
      { serviceId: 2, serviceName: 'Full Body', sessionsRemaining: 6, amount: 600 },
      { serviceId: 1, serviceName: 'Underarm', sessionsRemaining: 5, amount: 500 },
    ]);
    expect(d.total).toBe(1100);
  });

  it("the owner's example: 40,000 owed for 30,000 pulses + 5 Underarm sessions + 6 Full Body sessions", () => {
    const d = computeDeferredBreakdown([
      pulsesPkg({ id: 'a', pricePaid: 30000, totalPulses: 30000, pulsesRemaining: 30000 }),
      servicesPkg({ id: 'b', pricePaid: 10000 }),
    ]);
    expect(d.pulses.pulsesRemaining).toBe(30000);
    expect(d.services.map((s) => [s.serviceName, s.sessionsRemaining])).toEqual([['Full Body', 6], ['Underarm', 5]]);
    expect(d.total).toBe(40000);
  });

  it('a partly used services package only counts what is left', () => {
    const d = computeDeferredBreakdown([servicesPkg({ items: [
      { serviceId: 1, serviceName: 'Underarm', qtyTotal: 5, qtyRemaining: 2 },
      { serviceId: 2, serviceName: 'Full Body', qtyTotal: 6, qtyRemaining: 0 },
    ] })]);
    expect(d.services).toEqual([{ serviceId: 1, serviceName: 'Underarm', sessionsRemaining: 2, amount: 200 }]);
  });

  it('merges the same service across packages', () => {
    const d = computeDeferredBreakdown([servicesPkg({ id: 'a' }), servicesPkg({ id: 'b' })]);
    expect(d.services.find((s) => s.serviceId === 1)).toMatchObject({ sessionsRemaining: 10, amount: 1000 });
  });

  it('fully used, empty and zero-quota packages contribute nothing', () => {
    const d = computeDeferredBreakdown([
      pulsesPkg({ status: 'fully_used', pulsesRemaining: 0 }),
      pulsesPkg({ id: 'x', pulsesRemaining: 0 }),
      pulsesPkg({ id: 'y', totalPulses: 0, pulsesRemaining: 500 }),
    ]);
    expect(d.total).toBe(0);
    expect(d.pulses.packages).toBe(0);
  });

  it('a pending-price package is listed separately and never counted as 0 in the totals', () => {
    const d = computeDeferredBreakdown([
      pulsesPkg({ id: 'p', pricePaid: 0, pricePending: true, pulsesRemaining: 2500, totalPulses: 2500 }),
      servicesPkg({ id: 's', pricePaid: 0, pricePending: true }),
    ]);
    expect(d.total).toBe(0);
    expect(d.pulses.packages).toBe(0);
    expect(d.pending.count).toBe(2);
    expect(d.pending.packages).toEqual([
      { id: 'p', customerName: 'Mona', packageName: '10,000 Pulses', packageType: 'pulses', remaining: 2500 },
      { id: 's', customerName: 'Sara', packageName: 'Body Bundle', packageType: 'services', remaining: 11 },
    ]);
  });

  it('a package past its expiry stays deferred but is reported separately (breakage is not recognised yet)', () => {
    const now = new Date('2026-09-26T00:00:00Z');
    const d = computeDeferredBreakdown([
      pulsesPkg({ id: 'live', expiresAt: '2027-01-01T00:00:00Z' }),
      pulsesPkg({ id: 'lapsed', expiresAt: '2026-08-01T00:00:00Z' }),
      pulsesPkg({ id: 'flagged', status: 'expired', expiresAt: null }),
    ], now);
    expect(d.activeTotal).toBe(3000);
    expect(d.expiredTotal).toBe(6000);
    expect(d.total).toBe(9000);
  });

  it('empty input', () => {
    expect(computeDeferredBreakdown([])).toEqual({
      total: 0, activeTotal: 0, expiredTotal: 0,
      pulses: { packages: 0, pulsesRemaining: 0, amount: 0 }, services: [], pending: { count: 0, packages: [] },
    });
  });
});
