/**
 * DEC-140: which of the prescriptions returned by `GET /api/prescriptions?bookingId=...` may be shown
 * for a booking. The API already returns only prescriptions linked to that booking, or (when the
 * booking has none) the same patient's prescriptions saved without any booking. This is the
 * client-side guard for the same rule: a prescription linked to a DIFFERENT booking is never shown,
 * and the first entry of an unfiltered list is never blindly assumed to belong to this booking.
 */
export function prescriptionsForBooking<T extends { booking_id?: unknown }>(
  list: T[] | null | undefined,
  bookingId: string | number | null | undefined,
): T[] {
  if (!Array.isArray(list)) return [];
  const id = bookingId == null ? '' : String(bookingId);
  return list.filter((rx) => {
    const linked = rx?.booking_id;
    return linked == null || linked === '' || String(linked) === id;
  });
}

/** The prescription to pre-fill for a booking: its own first, otherwise an unlinked one. */
export function pickPrescriptionForBooking<T extends { booking_id?: unknown }>(
  list: T[] | null | undefined,
  bookingId: string | number | null | undefined,
): T | null {
  const usable = prescriptionsForBooking(list, bookingId);
  const id = bookingId == null ? '' : String(bookingId);
  return usable.find((rx) => rx.booking_id != null && String(rx.booking_id) === id) || usable[0] || null;
}
