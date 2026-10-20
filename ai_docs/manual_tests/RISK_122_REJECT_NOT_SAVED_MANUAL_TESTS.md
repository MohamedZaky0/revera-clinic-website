# RISK-122 — Reject On The Pending List Is Saved (Not Just Hidden) — Manual Test Checklist

> **Living document.** Update with dated evidence as each check is run.
> Full reasoning: `ai_docs/RISKS.md` -> **RISK-122**. Automated coverage: `tests/components/bookings/AdminBookingsView.test.tsx` (the view only; the shell handler needs a browser).
> Needs a logged-in staff account; use test data only.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| 2026-10-20 | Reject is saved | local dev, `fix/risk-122-reject-not-saved` @ cb3b2b3, superadmin, test DB | Pending booking rejected in the UI: gone in 0.6 s (waits for the API), database status `rejected` (before the fix `pending_deposit`), not back after 2 poll ticks or a reload, All Appointments shows Canceled | Pass |
| 2026-10-20 | Failed save is not hidden; retry | same | Server stopped, Reject clicked: alert "The request could not be rejected (connection problem). Nothing was changed, please try again.", row stayed, badge unchanged. Server back, Reject again: gone in 1.7 s, status `rejected` | Pass |
| 2026-10-20 | Approve then Cancel the dialog (suspected side issue) | same | Row vanished from the Pending table while the badge still said Pending 1 and the database stayed `pending_deposit`; back only after reload. Tracked as RISK-124 | FAIL (RISK-124, existing) |
| 2026-10-20 | RISK-124 fix: Approve then Cancel the dialog | local dev, `fix/risk-124-approve-hides-row`, superadmin, test DB | Row stayed in the Pending table, badge unchanged (Pending 1) | Pass |
| 2026-10-20 | RISK-124 fix: Approve then Confirm approve | same | Database `approved`, slot `10:00`; row left Pending after 4.3 s (save + refetch on slow responses), badge emptied | Pass |
| 2026-10-20 | NOT tested | | Rejecting a booking that has already started (server returns 400; message not exercised), Approve confirm path after this change (unchanged code) | Pending |

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
- [ ] Click Approve, then Cancel in the approve dialog: the booking stays listed in Pending (RISK-124, fixed).
