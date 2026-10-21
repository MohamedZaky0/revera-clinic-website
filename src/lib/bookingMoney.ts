/**
 * Per-booking money figures for the patient profile's Booking History table (DEC-119).
 *
 * A `reservations` row has NO stored total: `total_price` / `price` are not columns on that table
 * (the PATCH route tries to write them and drops them when the column is missing), and
 * `GET /api/reservations` does not return them. The only money the row carries is
 * `amount_paid` and `amount_left`, and the rest of the app already treats them as
 * `total = paid + left` (AdminBookingsView's `rawAmt` fallback and BookingDetailsModal's
 * `totalPrice` floor both use that sum):
 *   - public booking, deposit paid:  amountPaid = deposit, amountLeft = price - deposit
 *   - admin booking:                 amountPaid = paid now, amountLeft = total - paid now
 *   - checkout:                      amount_left = invoice total (services + add-ons - discounts) - paid
 *   - settle-debt:                   moves the same amount from left to paid, so the sum is stable
 * So this module does not recompute prices from the service catalog. It reads the two stored
 * numbers and says "unknown" (null) when it cannot know, never a guessed number.
 *
 * Cancelled / rejected / no-show bookings were never delivered: the cancel and no-show actions in
 * the reservations route set amount_left to 0 ("nothing is owed"), and a rejected request can still
 * carry the left it was created with. So outstanding is 0 for those and there is no service price.
 */

export interface BookingMoneyInput {
  status?: string | null;
  amountPaid?: number | string | null;
  amount_paid?: number | string | null;
  amountLeft?: number | string | null;
  amount_left?: number | string | null;
  notes?: string | null;
  isHistorical?: boolean | null;
  is_historical?: boolean | null;
}

export interface BookingMoney {
  /** Total price of the booking. null = unknown or not applicable (see `priceNote`). */
  price: number | null;
  /** Amount already paid. null = the booking has no recorded paid amount. */
  paid: number | null;
  /** Amount still owed. null = the booking has no recorded balance. */
  outstanding: number | null;
  /**
   * Why `price` is null when it is not simply unknown:
   *  - 'not_delivered': cancelled / rejected / no-show, the service never happened
   *  - 'package': the session was covered by a package the patient already bought, so this
   *    booking itself was billed 0
   */
  priceNote: 'not_delivered' | 'package' | null;
}

const NOT_DELIVERED = new Set(['cancelled', 'canceled', 'rejected', 'no_show']);

/** The "Invoice Value / Invoice Total" line "Add Previous Booking" writes into the notes. */
const NOTED_INVOICE_TOTAL = /\[Invoice Total\]:\s*(\d+(?:\.\d+)?)\s*EGP|Invoice Value:\s*(\d+(?:\.\d+)?)\s*EGP/i;

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function parseNotedInvoiceTotal(notes: string | null | undefined): number | null {
  const m = String(notes || '').match(NOTED_INVOICE_TOTAL);
  if (!m) return null;
  return toNumberOrNull(m[1] ?? m[2]);
}

export function computeBookingMoney(
  reservation: BookingMoneyInput,
  options: { packageCovered?: boolean } = {}
): BookingMoney {
  const status = String(reservation.status || '').toLowerCase();

  const rawPaid = toNumberOrNull(reservation.amountPaid ?? reservation.amount_paid);
  // A negative paid amount is not a real payment; show "unknown" rather than echo it.
  const paid = rawPaid !== null && rawPaid >= 0 ? rawPaid : null;
  // amount_left is nullable in the DB. null must stay "unknown" - coercing it to 0 would show a
  // booking whose balance was never recorded as fully settled.
  const left = toNumberOrNull(reservation.amountLeft ?? reservation.amount_left);

  if (NOT_DELIVERED.has(status)) {
    return { price: null, paid, outstanding: 0, priceNote: 'not_delivered' };
  }

  const isHistorical = Boolean(
    reservation.isHistorical ||
      reservation.is_historical ||
      String(reservation.notes || '').includes('[Historical Booking]')
  );
  const notedTotal = isHistorical ? parseNotedInvoiceTotal(reservation.notes) : null;

  let price: number | null = null;
  if (notedTotal !== null) {
    price = notedTotal;
  } else if (paid !== null && left !== null) {
    const sum = paid + left;
    price = sum > 0 ? sum : null;
  }

  let outstanding: number | null = left;
  if (outstanding === null && notedTotal !== null && paid !== null) {
    outstanding = Math.max(0, notedTotal - paid);
  }

  const priceNote = price === null && options.packageCovered ? 'package' : null;

  return { price, paid, outstanding, priceNote };
}

/** "1,250" for a number, an em dash placeholder for unknown. Western digits so columns line up in both languages. */
export function formatMoneyCell(value: number | null | undefined, placeholder = '—'): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return placeholder;
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
}
