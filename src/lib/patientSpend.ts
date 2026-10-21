/**
 * What a patient has actually spent, worked out from their bookings (DEC-121).
 *
 * The patients list and the profile card used to add up `r.price || r.totalPrice` for each booking.
 * A reservation has no such field (it stores `amount_paid` and `amount_left`), so that sum was
 * always 0 and "Total Spend" showed only whatever sat in `customers.spent_amount`. For a patient
 * whose bookings were entered through "Add Previous Booking" (most of the old data) that column
 * was never filled, so someone who had paid in full showed 0.
 *
 * Spend is money received, so it is the sum of the paid amounts, not of what was billed (billed
 * includes the unpaid part). Only delivered bookings count: a cancelled or rejected booking is
 * either refunded (paid set back to 0) or never happened.
 */
const COUNTED_STATUSES = new Set(['approved', 'confirmed', 'completed', 'started']);

export interface PaidAmountSource {
  status?: string | null;
  amountPaid?: number | string | null;
  amount_paid?: number | string | null;
}

export function totalPaidFromBookings(bookings: PaidAmountSource[]): number {
  let sum = 0;
  for (const b of bookings) {
    if (!COUNTED_STATUSES.has(String(b?.status || '').toLowerCase().trim())) continue;
    const paid = Number(b.amountPaid ?? b.amount_paid ?? 0);
    if (Number.isFinite(paid) && paid > 0) sum += paid;
  }
  return Math.round(sum * 100) / 100;
}

/**
 * What a patient still owes on bookings that were actually delivered (DEC-121).
 *
 * `customers.outstanding` is a stored total kept up to date by several flows (settle debt, previous
 * bookings, package sales) and it drifts: on production it differed from the bookings' own balances
 * for 8 of 102 patients, in both directions. The balances left on the bookings are what the Booking
 * History table shows, so the card and the list now show the larger of the two (never less than what
 * the bookings say is owed, and package debts that exist only in the stored total are kept).
 *
 * Only completed bookings count: a confirmed or approved booking that has not happened yet may have
 * a balance, but that is not a debt until the service is delivered.
 */
export interface LeftAmountSource {
  status?: string | null;
  amountLeft?: number | string | null;
  amount_left?: number | string | null;
}

export function totalOutstandingFromBookings(bookings: LeftAmountSource[]): number {
  let sum = 0;
  for (const b of bookings) {
    if (String(b?.status || '').toLowerCase().trim() !== 'completed') continue;
    const left = Number(b.amountLeft ?? b.amount_left ?? 0);
    if (Number.isFinite(left) && left > 0) sum += left;
  }
  return Math.round(sum * 100) / 100;
}
