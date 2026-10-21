import { describe, it, expect } from 'vitest';
import { allocateServicePrices } from '@/lib/historicalServicePrices';

const sum = (a: number[]) => Math.round(a.reduce((x, y) => x + y, 0) * 100) / 100;

describe('allocateServicePrices (DEC-120)', () => {
  it('a single service takes exactly the invoice value, whatever the catalog says now', () => {
    expect(allocateServicePrices([1500], 1000)).toEqual([1000]);
    expect(allocateServicePrices([400], 1000)).toEqual([1000]);
  });

  it('several services share the invoice value in proportion to their catalog prices and add up exactly', () => {
    const out = allocateServicePrices([600, 400], 800);
    expect(out).toEqual([480, 320]);
    expect(sum(out)).toBe(800);
  });

  it('absorbs rounding in the last line so the total is exact', () => {
    const out = allocateServicePrices([100, 100, 100], 100);
    expect(sum(out)).toBe(100);
    expect(out[0]).toBe(33.33);
    expect(out[2]).toBe(33.34);
  });

  it('splits equally when the catalog gives no basis (zero or missing prices)', () => {
    expect(allocateServicePrices([0, 0], 500)).toEqual([250, 250]);
    expect(allocateServicePrices([NaN, 0], 300)).toEqual([150, 150]);
  });

  it('a zero or invalid invoice value gives zero lines, never a negative or NaN', () => {
    expect(allocateServicePrices([500, 300], 0)).toEqual([0, 0]);
    expect(allocateServicePrices([500], -10)).toEqual([0]);
    expect(allocateServicePrices([500], NaN)).toEqual([0]);
  });

  it('no services, nothing to allocate', () => {
    expect(allocateServicePrices([], 500)).toEqual([]);
  });
});
