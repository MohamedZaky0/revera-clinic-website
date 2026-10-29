# Prescriptions: Booking Link And Same-Day Fallback: Manual Test Checklist

> Reasoning: `ai_docs/DECISIONS.md` -> DEC-140 (amends DEC-137); risk: `ai_docs/RISKS.md` -> RISK-144. Automated coverage: `tests/routes/prescriptions-booking-link.test.ts`, `tests/routes/prescriptions-booking-link-local.test.ts`, `tests/lib/prescriptionBooking.test.ts`, `tests/routes/prescriptions-booking-sync.test.ts`.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| | Two bookings of one patient on the same day: each shows only its own prescription | dev.reveraclinics.com | | Not run yet |
| | Prescription written in a doctor session appears in that booking's details at once | dev.reveraclinics.com | | Not run yet |
| | Older prescription without a booking is still offered, and only when the booking has none of its own | dev.reveraclinics.com | | Not run yet |

## Setup
Use a test patient. Create two bookings for that patient on the same date (booking A and booking B), with the same or different doctors.

## Checks
- [ ] Start booking A as the doctor, write a diagnosis and one medication, press Save Prescription. Open booking A in Booking Details (reception): the PRESCRIPTION card shows that diagnosis and medication without reloading the page.
- [ ] Open booking B (same patient, same day, no prescription written): the PRESCRIPTION card is empty. It does NOT show booking A's diagnosis or medication.
- [ ] Start booking B as the doctor: the prescription form is empty (no pre-filled diagnosis from booking A). Write a different diagnosis and save. Booking A still shows its own diagnosis, booking B shows its own.
- [ ] In booking B, press Edit on the prescription and save a change: booking B now shows version 2; booking A's prescription is unchanged (still version 1, same text).
- [ ] Patient profile / prescription history (by patient, no booking): both prescriptions are listed.
- [ ] Network tab, open booking B before it has a prescription: the `GET /api/prescriptions?bookingId=...&customerId=...&date=...` response is `[]`, not booking A's prescription.
- [ ] Older prescription without a booking (a row whose `booking_id` is empty in Supabase, same patient and date, only readable by looking at the table): open a booking of that patient and date that has no prescription of its own: that older prescription is offered. After booking B gets its own prescription, booking B no longer shows the older one.
- [ ] A prescription with a follow-up date, saved from a booking: that booking's follow-up date in the booking details is updated (the link was written).
- [ ] Complete Treatment in the doctor session with prescription fields filled but without pressing Save Prescription (DEC-137 auto-save): the prescription is saved and shows in the booking details.
- [ ] Save a prescription for a patient with no booking at all (prescription screen, no booking selected): it saves normally and appears in the patient's list.
- [ ] No console errors and no 500 responses on `/api/prescriptions` during all of the above.

## Not testable from the UI (covered by the automated tests only)
- An unknown or deleted booking id sent to `POST /api/prescriptions` saves the prescription unlinked and answers `booking_id: null`.
- A booking deleted between the existence check and the insert (foreign key rejection) saves the prescription unlinked.
- An older database without the `booking_id` column still saves the prescription.
- The local JSON fallback (`data/prescriptions.json`, only when the `prescriptions` table is missing) follows the same rule.
