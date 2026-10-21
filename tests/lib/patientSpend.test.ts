import { describe, it, expect } from 'vitest';
import { totalPaidFromBookings } from '@/lib/patientSpend';

describe('totalPaidFromBookings (DEC-121)', () => {
  it('adds up the paid amounts of delivered bookings, in both field spellings', () => {
    expect(totalPaidFromBookings([
      { status: 'completed', amountPaid: 1500 },
      { status: 'completed', amount_paid: '1200' },
      { status: 'confirmed', amountPaid: 300 },
    ])).toBe(3000);
  });

  it('a patient who paid in full but whose bookings carry no price field is no longer 0', () => {
    // the reservation shape from the API: paid and left only, no price / totalPrice
    const bookings = [
      { status: 'completed', amountPaid: 10000, amountLeft: 0 },
      { status: 'completed', amountPaid: 500, amountLeft: 0 },
    ];
    expect(totalPaidFromBookings(bookings)).toBe(10500);
  });

  it('counts what was paid, not what was billed: an unpaid balance adds nothing', () => {
    expect(totalPaidFromBookings([{ status: 'completed', amountPaid: 1500, amountLeft: 100 }])).toBe(1500);
    expect(totalPaidFromBookings([{ status: 'completed', amountPaid: 0, amountLeft: 2820 }])).toBe(0);
  });

  it('ignores cancelled, rejected, no-show and pending bookings', () => {
    expect(totalPaidFromBookings([
      { status: 'cancelled', amountPaid: 400 },
      { status: 'rejected', amountPaid: 400 },
      { status: 'no_show', amountPaid: 400 },
      { status: 'pending', amountPaid: 400 },
    ])).toBe(0);
  });

  it('is safe with missing, blank, negative or invalid amounts', () => {
    expect(totalPaidFromBookings([
      { status: 'completed' },
      { status: 'completed', amountPaid: null },
      { status: 'completed', amountPaid: '' },
      { status: 'completed', amountPaid: -50 },
      { status: 'completed', amountPaid: 'abc' },
      { status: 'completed', amountPaid: 80.5 },
    ])).toBe(80.5);
  });

  it('status matching ignores case and spaces; an empty list is 0', () => {
    expect(totalPaidFromBookings([{ status: ' Completed ', amountPaid: 10 }])).toBe(10);
    expect(totalPaidFromBookings([])).toBe(0);
  });
});
