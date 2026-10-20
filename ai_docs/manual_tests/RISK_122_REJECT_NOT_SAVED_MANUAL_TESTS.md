# RISK-122 — Reject On The Pending List Is Saved (Not Just Hidden) — Manual Test Checklist

> **Living document.** Update with dated evidence as each check is run.
> Full reasoning: `ai_docs/RISKS.md` -> **RISK-122**. Automated coverage: `tests/components/bookings/AdminBookingsView.test.tsx` (the view only; the shell handler needs a browser).
> Needs a logged-in staff account; use test data only.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| | | | | |

## The rejection is saved
- [ ] Create a pending booking (public booking form, or `POST /api/reservations`). Bookings -> Pending: click Reject. The row disappears.
- [ ] Reload the page: the booking is **not** back in Pending. In the database / All Appointments its status is `rejected`.
- [ ] Wait through two 15 s poll ticks without reloading: the row does not come back.

## A failed save is not hidden
- [ ] Stop the server (or go offline) and click Reject: an alert says the request could not be rejected, and the row **stays** in the Pending list.
- [ ] Start the server again and click Reject: it now works and the row goes.
- [ ] Reject a booking that has already started (via API: set it to `started`, then try Reject if it is visible): the server refuses with "Cannot cancel a booking that has already started" and the screen shows that message, the row stays.

## Neighbouring behaviour is unchanged
- [ ] Approve from Pending still opens the approve dialog and confirming it approves the booking.
- [ ] After a successful reject, the Pending badge count drops by one and All Appointments shows the booking as rejected.
- [ ] Suspected (RISK-122 note): click Approve, then Cancel in the approve dialog. Check whether the booking is still listed in Pending, and whether it is back after a reload.
