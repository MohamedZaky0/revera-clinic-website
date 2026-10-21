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
