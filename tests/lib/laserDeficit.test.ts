import { describe, expect, it } from 'vitest';
import {
  computeDeficitInvoiceImpact,
  computePackageDeficit,
  resolveDeliveredPulses,
} from '@/lib/laserDeficit';

describe('laser deficit arithmetic', () => {
  it('computes the tracker example: 10,000 delivered, 5,000 remaining, 5,000 deficit', () => {
    const deliveredPulses = resolveDeliveredPulses(5_000, 5_000);
    const deficitPulses = computePackageDeficit({
      deliveredPulses,
      remainingPulses: 5_000,
      hasActivePackage: true,
    });

    expect(deliveredPulses).toBe(10_000);
    expect(deficitPulses).toBe(5_000);
  });

  it('returns zero when delivered pulses exactly equal the balance', () => {
    expect(computePackageDeficit({ deliveredPulses: 5_000, remainingPulses: 5_000, hasActivePackage: true })).toBe(0);
  });

  it('returns the full delivery as deficit when the active package has zero remaining', () => {
    expect(computePackageDeficit({ deliveredPulses: 5_000, remainingPulses: 0, hasActivePackage: true })).toBe(5_000);
  });

  it('preserves a one-pulse deficit', () => {
    expect(computePackageDeficit({ deliveredPulses: 5_001, remainingPulses: 5_000, hasActivePackage: true })).toBe(1);
  });

  it('suppresses the deficit when there is no active package', () => {
    expect(computePackageDeficit({ deliveredPulses: 5_000, remainingPulses: 0, hasActivePackage: false })).toBe(0);
  });

  it('normalizes fractional and negative pulse inputs to non-negative integers', () => {
    expect(resolveDeliveredPulses(10.9, -4)).toBe(10);
    expect(computePackageDeficit({ deliveredPulses: -1, remainingPulses: -5, hasActivePackage: true })).toBe(0);
  });

  it('charges the selected new package price for choice 3A', () => {
    expect(computeDeficitInvoiceImpact({
      deficitPulses: 5_000,
      choice: 'BUY_NEW_PACKAGE',
      pricePerPulse: 5,
      newPackagePrice: 7_000,
    })).toBe(7_000);
  });

  it('charges deficit multiplied by the pulse rate for choice 3B', () => {
    expect(computeDeficitInvoiceImpact({
      deficitPulses: 5_000,
      choice: 'PAY_PER_PULSE',
      pricePerPulse: 5,
      newPackagePrice: 7_000,
    })).toBe(25_000);
  });

  it('never creates a negative invoice impact', () => {
    expect(computeDeficitInvoiceImpact({
      deficitPulses: -5,
      choice: 'PAY_PER_PULSE',
      pricePerPulse: -1,
      newPackagePrice: -100,
    })).toBe(0);
    expect(computeDeficitInvoiceImpact({
      deficitPulses: 5,
      choice: 'BUY_NEW_PACKAGE',
      pricePerPulse: 1,
      newPackagePrice: -100,
    })).toBe(0);
  });
});
