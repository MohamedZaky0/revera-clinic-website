/**
 * What a booking contributed to its patient's stored figures, and what the patient's wording
 * should say when that booking is permanently deleted (DEC-133).
 *
 * `customers.spent_amount`, `customers.outstanding` and `customers.number_of_bookings` are running
 * totals, moved by deltas in several routes. Deleting a booking has to move them back by exactly
 * that booking's share, and must NOT recompute them from the remaining bookings (the same totals
 * also hold product sales, package sales, wallet top-ups and manual adjustments that no booking
 * knows about).
 *
 * How a booking got into the totals (read from the code that writes them):
 *  - count:        +1 when the booking is created (POST /api/reservations, POST /api/reservations/previous),
 *                  whatever its status. Never moved again, not even on cancel.
 *  - spent:        + amount_paid when the booking is completed (computeSettledBalances), and later payments
 *                  against it add to both the booking's amount_paid and the total (settle-debt, PATCH).
 *                  A no-show adds its kept deposit (amount_paid) at that moment. A deposit on a booking that
 *                  is still pending/confirmed/started is NOT in the total yet; a cancelled one is refunded to
 *                  the wallet and its amount_paid is set back to 0.
 *  - outstanding:  + amount_left when the booking is completed, reduced by later settlements (which also lower
 *                  the booking's amount_left). Bookings that have not happened yet owe nothing.
 *
 * So the booking's share is read from its own row: amount_paid for a completed or no-show booking,
 * amount_left for a completed one, and one place in the count.
 *
 * Not reversible from the booking row, so deliberately not touched: the wallet. A previous booking
 * that was underpaid may have used wallet credit before adding debt (settlePaymentMismatch), and an
 * overpayment may have settled other debt or credited the wallet; the amounts of those side effects
 * are not stored with the booking.
 */

export interface BookingMoneySource {
  status?: string | null;
  amount_paid?: number | string | null;
  amount_left?: number | string | null;
}

export interface BookingShare {
  spent: number;
  outstanding: number;
}

export interface PatientFigures {
  spent: number;
  outstanding: number;
  bookings: number;
}

const SPENT_STATUSES = new Set(['completed', 'no_show']);

function normStatus(status: unknown): string {
  return String(status || '').toLowerCase().trim().replace(/[\s-]+/g, '_');
}

function money(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function bookingMoneyShare(booking: BookingMoneySource): BookingShare {
  const status = normStatus(booking.status);
  return {
    spent: SPENT_STATUSES.has(status) ? round2(money(booking.amount_paid)) : 0,
    outstanding: status === 'completed' ? round2(money(booking.amount_left)) : 0,
  };
}

/** The patient's figures after the booking is taken out. Nothing goes below zero. */
export function removeBookingFromFigures(
  current: PatientFigures,
  share: BookingShare
): { next: PatientFigures; clamped: boolean } {
  const rawSpent = current.spent - share.spent;
  const rawOutstanding = current.outstanding - share.outstanding;
  const rawBookings = current.bookings - 1;
  return {
    next: {
      spent: round2(Math.max(0, rawSpent)),
      outstanding: round2(Math.max(0, rawOutstanding)),
      bookings: Math.max(0, rawBookings),
    },
    clamped: rawSpent < 0 || rawOutstanding < 0 || rawBookings < 0,
  };
}

/**
 * The sentence the superadmin sees under "Hard Delete" for a booking. `paid` is the booking's
 * amount_paid when the screen has it.
 */
export function bookingHardDeleteWarning(isRTL: boolean, paid?: number | null): string {
  const amount = Number(paid || 0);
  if (isRTL) {
    const money = amount > 0 ? ` (المدفوع على هذا الحجز: ${amount.toLocaleString("en-US")} ج.م)` : "";
    return (
      "الحذف النهائي يحذف أيضاً مدفوعات هذا الحجز وفاتورته" + money +
      " ويُعدّل إجمالي إنفاق المريض والمبلغ المستحق وعدد حجوزاته. لا يمكن التراجع عن ذلك."
    );
  }
  const money = amount > 0 ? ` (EGP ${amount.toLocaleString("en-US")} paid on this booking)` : "";
  return (
    "Permanently deleting also deletes this booking's payments and invoice" + money +
    ", and lowers the patient's Total Spend, Outstanding and bookings count by this booking's share. This cannot be undone."
  );
}
