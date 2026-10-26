/**
 * The sentence the superadmin reads before permanently deleting a patient (DEC-132).
 */
import { describe, it, expect } from 'vitest';
import { describeDeletionCounts, hasAnythingToDelete, type PatientDeletionCounts } from '@/lib/customerDeletionText';

const none: PatientDeletionCounts = {
  bookings: 0,
  payments: 0,
  paymentsAmount: 0,
  packages: 0,
  walletEntries: 0,
  productBalances: 0,
  laserSessions: 0,
  clinicalRecords: 0,
};

describe('describeDeletionCounts', () => {
  it('lists only what is present, with the payment total', () => {
    const text = describeDeletionCounts({ ...none, bookings: 3, payments: 2, paymentsAmount: 2700, packages: 3 }, 'en');
    expect(text).toBe('3 bookings, 2 payment records (2,700 EGP) and 3 packages');
  });

  it('uses the singular for one', () => {
    expect(describeDeletionCounts({ ...none, bookings: 1, walletEntries: 1 }, 'en')).toBe('1 booking and 1 wallet entry');
  });

  it('leaves out the amount when there is none', () => {
    expect(describeDeletionCounts({ ...none, payments: 1 }, 'en')).toBe('1 payment record');
  });

  it('says nothing is attached when there is nothing', () => {
    expect(describeDeletionCounts(none, 'en')).toBe('');
    expect(hasAnythingToDelete(none)).toBe(false);
  });

  it('has an Arabic version with the same numbers', () => {
    const text = describeDeletionCounts({ ...none, bookings: 3, payments: 2, paymentsAmount: 2700 }, 'ar');
    expect(text).toContain('3');
    expect(text).toContain('2,700');
    expect(text).toMatch(/[؀-ۿ]/);
    expect(text).not.toMatch(/booking/);
  });

  it('counts the amount alone as nothing to list, but the patient record is always deleted', () => {
    expect(hasAnythingToDelete({ ...none, paymentsAmount: 50 })).toBe(false);
    expect(hasAnythingToDelete({ ...none, clinicalRecords: 1 })).toBe(true);
  });
});
