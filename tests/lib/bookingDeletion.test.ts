import { describe, it, expect } from 'vitest';
import { bookingMoneyShare, removeBookingFromFigures, bookingHardDeleteWarning } from '@/lib/bookingDeletion';

describe('bookingMoneyShare (DEC-133)', () => {
  it('a completed booking contributed what it was paid and what it still owes', () => {
    expect(bookingMoneyShare({ status: 'completed', amount_paid: 1500, amount_left: 100 })).toEqual({ spent: 1500, outstanding: 100 });
  });
  it('a no-show contributed its kept deposit, and owes nothing', () => {
    expect(bookingMoneyShare({ status: 'no_show', amount_paid: 200, amount_left: 0 })).toEqual({ spent: 200, outstanding: 0 });
    expect(bookingMoneyShare({ status: 'No-Show', amount_paid: 200, amount_left: 50 })).toEqual({ spent: 200, outstanding: 0 });
  });
  it.each(['pending', 'pending_deposit', 'approved', 'confirmed', 'checked_in', 'started', 'cancelled', 'rejected', 'postponed'])(
    'a %s booking contributed no money to the stored totals',
    (status) => {
      expect(bookingMoneyShare({ status, amount_paid: 300, amount_left: 700 })).toEqual({ spent: 0, outstanding: 0 });
    }
  );
  it('treats missing, negative or non-numeric amounts as 0', () => {
    expect(bookingMoneyShare({ status: 'completed', amount_paid: null, amount_left: 'x' })).toEqual({ spent: 0, outstanding: 0 });
    expect(bookingMoneyShare({ status: 'completed', amount_paid: -5, amount_left: -1 })).toEqual({ spent: 0, outstanding: 0 });
  });
  it('accepts numeric strings (numeric columns)', () => {
    expect(bookingMoneyShare({ status: 'completed', amount_paid: '1200.50', amount_left: '0' })).toEqual({ spent: 1200.5, outstanding: 0 });
  });
});

describe('removeBookingFromFigures', () => {
  it('subtracts the share and one booking', () => {
    const r = removeBookingFromFigures({ spent: 2700, outstanding: 2920, bookings: 3 }, { spent: 1500, outstanding: 100 });
    expect(r.next).toEqual({ spent: 1200, outstanding: 2820, bookings: 2 });
    expect(r.clamped).toBe(false);
  });
  it('clamps at zero and says so', () => {
    const r = removeBookingFromFigures({ spent: 100, outstanding: 0, bookings: 0 }, { spent: 1500, outstanding: 100 });
    expect(r.next).toEqual({ spent: 0, outstanding: 0, bookings: 0 });
    expect(r.clamped).toBe(true);
  });
  it('rounds to 2 decimals', () => {
    const r = removeBookingFromFigures({ spent: 100.3, outstanding: 0, bookings: 1 }, { spent: 0.1, outstanding: 0 });
    expect(r.next.spent).toBe(100.2);
  });
});

describe('bookingHardDeleteWarning', () => {
  it('says the payments go too, in English and in Arabic', () => {
    expect(bookingHardDeleteWarning(false, 1500)).toMatch(/payments and invoice.*EGP 1,500/);
    expect(bookingHardDeleteWarning(true, 1500)).toMatch(/مدفوعات.*1,500/);
  });
  it('uses generic wording without an amount', () => {
    expect(bookingHardDeleteWarning(false)).not.toMatch(/EGP/);
    expect(bookingHardDeleteWarning(true, 0)).not.toMatch(/ج\.م/);
  });
});
