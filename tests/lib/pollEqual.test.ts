import { describe, it, expect } from 'vitest';
import { pollDataEqual, pollRowsEqualByKeys } from '@/lib/pollEqual';

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

describe('pollRowsEqualByKeys', () => {
  const KEYS = ['id', 'status', 'amount_paid', 'service_ids'];

  it('treats re-fetched copies of the same rows as equal', () => {
    const a = [{ id: 1, status: 'confirmed', amount_paid: 500, service_ids: [1, 2] }];
    const b = [{ id: 1, status: 'confirmed', amount_paid: 500, service_ids: [1, 2] }];
    expect(pollRowsEqualByKeys(a, b, KEYS)).toBe(true);
  });

  it('is false when a listed key differs on any row', () => {
    const a = [{ id: 1, status: 'confirmed' }, { id: 2, status: 'pending' }];
    const b = [{ id: 1, status: 'confirmed' }, { id: 2, status: 'started' }];
    expect(pollRowsEqualByKeys(a, b, KEYS)).toBe(false);
  });

  it('is false on reorder and on length change', () => {
    const a = [{ id: 1 }, { id: 2 }];
    expect(pollRowsEqualByKeys(a, [{ id: 2 }, { id: 1 }], KEYS)).toBe(false);
    expect(pollRowsEqualByKeys(a, [{ id: 1 }], KEYS)).toBe(false);
  });

  it('compares array-valued cells element-wise', () => {
    const a = [{ id: 1, service_ids: [1, 2] }];
    expect(pollRowsEqualByKeys(a, [{ id: 1, service_ids: [1, 2] }], KEYS)).toBe(true);
    expect(pollRowsEqualByKeys(a, [{ id: 1, service_ids: [2, 1] }], KEYS)).toBe(false);
    expect(pollRowsEqualByKeys(a, [{ id: 1, service_ids: [1, 2, 3] }], KEYS)).toBe(false);
  });

  it('ignores differences in unlisted keys', () => {
    const a = [{ id: 1, status: 'x', created_at: 't1' }];
    const b = [{ id: 1, status: 'x', created_at: 't2' }];
    expect(pollRowsEqualByKeys(a, b, KEYS)).toBe(true);
  });

  it('is false for non-array or mismatched inputs and true for shared reference', () => {
    const shared = [{ id: 1 }];
    expect(pollRowsEqualByKeys(shared, shared, KEYS)).toBe(true);
    expect(pollRowsEqualByKeys(null, [], KEYS)).toBe(false);
    expect(pollRowsEqualByKeys([], undefined, KEYS)).toBe(false);
    expect(pollRowsEqualByKeys([null], [{}], KEYS)).toBe(false);
  });
});
