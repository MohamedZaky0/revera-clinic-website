import { describe, it, expect } from 'vitest';
import { computeBookingMoney, formatMoneyCell, parseNotedInvoiceTotal } from '@/lib/bookingMoney';

describe('computeBookingMoney (DEC-119)', () => {
  it('unpaid pending booking: price is paid + left, nothing paid, all outstanding', () => {
    expect(computeBookingMoney({ status: 'pending', amountPaid: 0, amountLeft: 500 })).toEqual({
      price: 500, paid: 0, outstanding: 500, priceNote: null,
    });
  });

  it('deposit paid: price = deposit + remaining balance', () => {
    expect(computeBookingMoney({ status: 'pending', amountPaid: 100, amountLeft: 400 })).toEqual({
      price: 500, paid: 100, outstanding: 400, priceNote: null,
    });
  });

  it('partial payment on a completed booking keeps the leftover as outstanding', () => {
    expect(computeBookingMoney({ status: 'completed', amountPaid: 700, amountLeft: 300 })).toEqual({
      price: 1000, paid: 700, outstanding: 300, priceNote: null,
    });
  });

  it('fully paid completed booking: outstanding 0, price = paid', () => {
    expect(computeBookingMoney({ status: 'completed', amountPaid: 800, amountLeft: 0 })).toEqual({
      price: 800, paid: 800, outstanding: 0, priceNote: null,
    });
  });

  it('accepts snake_case row fields and numeric strings', () => {
    expect(computeBookingMoney({ status: 'confirmed', amount_paid: '250', amount_left: '750' })).toEqual({
      price: 1000, paid: 250, outstanding: 750, priceNote: null,
    });
  });

  it('missing amount_left stays unknown instead of becoming 0 (never shows Paid / 0 owed)', () => {
    expect(computeBookingMoney({ status: 'approved', amountPaid: 100, amountLeft: null })).toEqual({
      price: null, paid: 100, outstanding: null, priceNote: null,
    });
    expect(computeBookingMoney({ status: 'approved' })).toEqual({
      price: null, paid: null, outstanding: null, priceNote: null,
    });
  });

  it('a negative or non-numeric paid amount is shown as unknown', () => {
    expect(computeBookingMoney({ status: 'completed', amountPaid: -50, amountLeft: 100 }).paid).toBeNull();
    expect(computeBookingMoney({ status: 'completed', amountPaid: 'abc', amountLeft: 100 }).paid).toBeNull();
  });

  describe('cancelled / rejected / no-show', () => {
    it('cancelled: no price, nothing owed, paid as stored (0 after the deposit refund)', () => {
      expect(computeBookingMoney({ status: 'cancelled', amountPaid: 0, amountLeft: 0 })).toEqual({
        price: null, paid: 0, outstanding: 0, priceNote: 'not_delivered',
      });
    });

    it('rejected request keeps no stale balance even if it still carries its creation-time left', () => {
      expect(computeBookingMoney({ status: 'rejected', amountPaid: 0, amountLeft: 500 })).toEqual({
        price: null, paid: 0, outstanding: 0, priceNote: 'not_delivered',
      });
    });

    it('no-show: deposit stays visible as Paid, nothing further owed', () => {
      expect(computeBookingMoney({ status: 'no_show', amountPaid: 100, amountLeft: 0 })).toEqual({
        price: null, paid: 100, outstanding: 0, priceNote: 'not_delivered',
      });
    });
  });

  describe('package-covered sessions', () => {
    it('billed 0 and covered by a package: price is flagged, not shown as a fake 0', () => {
      expect(computeBookingMoney({ status: 'completed', amountPaid: 0, amountLeft: 0 }, { packageCovered: true })).toEqual({
        price: null, paid: 0, outstanding: 0, priceNote: 'package',
      });
    });

    it('package session with an extra charge shows the real numbers', () => {
      expect(computeBookingMoney({ status: 'completed', amountPaid: 50, amountLeft: 150 }, { packageCovered: true })).toEqual({
        price: 200, paid: 50, outstanding: 150, priceNote: null,
      });
    });

    it('0 + 0 without package cover is unknown, not a free service', () => {
      expect(computeBookingMoney({ status: 'completed', amountPaid: 0, amountLeft: 0 })).toEqual({
        price: null, paid: 0, outstanding: 0, priceNote: null,
      });
    });
  });

  describe('historical bookings', () => {
    it('uses the invoice value recorded in the notes as the price', () => {
      const r = computeBookingMoney({
        status: 'completed', amountPaid: 300, amountLeft: 200,
        notes: '[Historical Booking] Invoice Value: 500 EGP',
      });
      expect(r).toEqual({ price: 500, paid: 300, outstanding: 200, priceNote: null });
    });

    it('derives outstanding from the noted total when amount_left is missing', () => {
      const r = computeBookingMoney({
        status: 'completed', amountPaid: 300, amountLeft: null, is_historical: true,
        notes: '[Invoice Total]: 500 EGP',
      });
      expect(r).toEqual({ price: 500, paid: 300, outstanding: 200, priceNote: null });
    });

    it('does not let derived outstanding go negative when paid exceeds the noted total', () => {
      const r = computeBookingMoney({
        status: 'completed', amountPaid: 600, amountLeft: null, is_historical: true,
        notes: 'Invoice Value: 500 EGP',
      });
      expect(r.outstanding).toBe(0);
    });

    it('an explicit zero-value historical booking shows 0, not unknown', () => {
      const r = computeBookingMoney({
        status: 'completed', amountPaid: 0, amountLeft: 0, isHistorical: true,
        notes: '[Historical Booking] [Invoice Total]: 0 EGP',
      });
      expect(r.price).toBe(0);
    });

    it('ignores an invoice-looking note on a non-historical booking', () => {
      const r = computeBookingMoney({
        status: 'completed', amountPaid: 100, amountLeft: 100, notes: 'Invoice Value: 999 EGP',
      });
      expect(r.price).toBe(200);
    });
  });

  it('passes a stored negative balance through as-is (the data says so), and derives price from paid + left', () => {
    expect(computeBookingMoney({ status: 'completed', amountPaid: 700, amountLeft: -200 })).toEqual({
      price: 500, paid: 700, outstanding: -200, priceNote: null,
    });
  });
});

describe('parseNotedInvoiceTotal', () => {
  it('reads both note formats and returns null otherwise', () => {
    expect(parseNotedInvoiceTotal('x [Invoice Total]: 1200.5 EGP')).toBe(1200.5);
    expect(parseNotedInvoiceTotal('Invoice Value: 80 EGP')).toBe(80);
    expect(parseNotedInvoiceTotal('nothing here')).toBeNull();
    expect(parseNotedInvoiceTotal(null)).toBeNull();
  });
});

describe('formatMoneyCell', () => {
  it('formats with thousands separators and a placeholder for unknown', () => {
    expect(formatMoneyCell(1250)).toBe('1,250');
    expect(formatMoneyCell(0)).toBe('0');
    expect(formatMoneyCell(99.5)).toBe('99.5');
    expect(formatMoneyCell(null)).toBe('—');
    expect(formatMoneyCell(undefined)).toBe('—');
    expect(formatMoneyCell(NaN)).toBe('—');
  });
});
