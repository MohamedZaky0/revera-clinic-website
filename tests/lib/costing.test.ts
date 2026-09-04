import { describe, it, expect } from 'vitest';
import { computeCommission, consumptionCost, costPerPulse } from '@/lib/costing';

describe('computeCommission', () => {
  it('type "none" → always 0 regardless of base/value', () => {
    expect(computeCommission(1000, 'none', 50)).toBe(0);
    expect(computeCommission(0, 'none', 0)).toBe(0);
  });

  it('type "fixed" → returns value, ignores base entirely', () => {
    expect(computeCommission(1000, 'fixed', 150)).toBe(150);
    expect(computeCommission(0, 'fixed', 150)).toBe(150);
  });

  it('type "percentage" → base * value / 100, ignores fixedComponent', () => {
    expect(computeCommission(1000, 'percentage', 20)).toBe(200);
    expect(computeCommission(1000, 'percentage', 20, 999)).toBe(200);
  });

  it('type "both" → fixedComponent + base * value / 100', () => {
    expect(computeCommission(1000, 'both', 10, 50)).toBe(150); // 50 + 100
  });

  it('type "both" with fixedComponent omitted → defaults to 0', () => {
    expect(computeCommission(1000, 'both', 10)).toBe(100);
  });

  it('rounds to 2 decimal places', () => {
    // 333.335 * 10 / 100 = 33.3335 → rounds to 33.33 or 33.34 depending on float repr
    expect(computeCommission(333.33, 'percentage', 33.333)).toBe(111.11);
  });

  it('doctor-completes-session scenario: percentage commission on a 500 EGP service at 15%', () => {
    // Exactly the "doctor finishes with a patient" case: commission_snapshot written
    // at completion time (src/app/api/reservations/route.ts:264) for a service-level
    // line item, using the provider's (or per-service override's) commission config.
    expect(computeCommission(500, 'percentage', 15)).toBe(75);
  });

  it('unsupported type at runtime (bad DB data) throws rather than silently returning 0', () => {
    expect(() => computeCommission(1000, 'bogus' as any, 10)).toThrow(/Unsupported commission type/);
  });

  it('negative base throws — a discount/refund must not produce a negative commission here', () => {
    expect(() => computeCommission(-100, 'percentage', 10)).toThrow(/base must be a finite number/);
  });

  it('negative commission value throws', () => {
    expect(() => computeCommission(1000, 'percentage', -5)).toThrow(/value must be a finite number/);
  });

  it('negative fixedComponent throws even when type does not use it directly', () => {
    expect(() => computeCommission(1000, 'percentage', 10, -1)).toThrow(/fixedComponent must be a finite number/);
  });

  it('non-finite base (NaN/Infinity) throws', () => {
    expect(() => computeCommission(NaN, 'fixed', 10)).toThrow();
    expect(() => computeCommission(Infinity, 'percentage', 10)).toThrow();
  });
});

describe('consumptionCost', () => {
  it('sums qty * unitCostSnapshot across entries', () => {
    expect(
      consumptionCost([
        { qty: 2, unitCostSnapshot: 10 },
        { qty: 3, unitCostSnapshot: 5 },
      ])
    ).toBe(35);
  });

  it('empty entries → 0', () => {
    expect(consumptionCost([])).toBe(0);
  });

  it('rounds to 2 decimal places', () => {
    expect(consumptionCost([{ qty: 3, unitCostSnapshot: 0.333 }])).toBe(1);
  });

  it('negative qty throws', () => {
    expect(() => consumptionCost([{ qty: -1, unitCostSnapshot: 10 }])).toThrow(/qty must be a finite number/);
  });

  it('negative unitCostSnapshot throws', () => {
    expect(() => consumptionCost([{ qty: 1, unitCostSnapshot: -10 }])).toThrow(/unitCostSnapshot must be a finite number/);
  });
});

describe('costPerPulse', () => {
  it('divides lamp replacement cost by rated pulses', () => {
    expect(costPerPulse(1000, 100)).toBe(10);
  });

  it('rounds to 2 decimal places', () => {
    expect(costPerPulse(100, 3)).toBe(33.33);
  });

  it('zero ratedPulses throws (division by zero guarded explicitly)', () => {
    expect(() => costPerPulse(1000, 0)).toThrow(/ratedPulses must be a finite number greater than 0/);
  });

  it('negative ratedPulses throws', () => {
    expect(() => costPerPulse(1000, -5)).toThrow(/ratedPulses must be a finite number greater than 0/);
  });

  it('negative lampReplacementCost throws', () => {
    expect(() => costPerPulse(-1000, 100)).toThrow(/lampReplacementCost must be a finite number/);
  });
});
