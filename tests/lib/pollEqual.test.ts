import { describe, it, expect } from 'vitest';
import { pollDataEqual } from '@/lib/pollEqual';

describe('pollDataEqual', () => {
  it('treats two parsed copies of the same poll payload as equal', () => {
    const a = [{ id: 1, status: 'confirmed', amountPaid: 500 }];
    const b = [{ id: 1, status: 'confirmed', amountPaid: 500 }];
    expect(pollDataEqual(a, b)).toBe(true);
  });

  it('is false when a row field changed', () => {
    const a = [{ id: 1, status: 'confirmed' }];
    const b = [{ id: 1, status: 'checked_in' }];
    expect(pollDataEqual(a, b)).toBe(false);
  });

  it('is false when a row was added or removed', () => {
    const a = [{ id: 1 }, { id: 2 }];
    expect(pollDataEqual(a, [{ id: 1 }])).toBe(false);
    expect(pollDataEqual(a, [{ id: 1 }, { id: 2 }, { id: 3 }])).toBe(false);
  });

  it('is false when row order changed', () => {
    const a = [{ id: 1 }, { id: 2 }];
    const b = [{ id: 2 }, { id: 1 }];
    expect(pollDataEqual(a, b)).toBe(false);
  });

  it('short-circuits on the same reference and on null/undefined', () => {
    const shared = [{ id: 1 }];
    expect(pollDataEqual(shared, shared)).toBe(true);
    expect(pollDataEqual(null, null)).toBe(true);
    expect(pollDataEqual(undefined, undefined)).toBe(true);
    expect(pollDataEqual(null, [])).toBe(false);
    expect(pollDataEqual([], undefined)).toBe(false);
  });

  it('handles empty arrays and primitives', () => {
    expect(pollDataEqual([], [])).toBe(true);
    expect(pollDataEqual({}, {})).toBe(true);
    expect(pollDataEqual(0, 0)).toBe(true);
    expect(pollDataEqual('a', 'b')).toBe(false);
  });
});
