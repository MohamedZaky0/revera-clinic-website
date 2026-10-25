# Booking Hard Delete Cascade: Manual Test Checklist

> Reasoning: `ai_docs/DECISIONS.md` -> DEC-133; related: `ai_docs/RISKS.md` -> RISK-139. Automated coverage: `tests/routes/reservations-hard-delete-cascade.test.ts` (route level, in-memory database) and `tests/lib/bookingDeletion.test.ts`. The dialog and the Patients list have no component test, so the checks below need a person. Use a throwaway test patient on **dev** only. Log in as a **superadmin** (booking delete is superadmin only). No migration is needed for this change.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| 2026-10-25 | Foreign keys that point at `reservations` / `transactions` (SELECT only) | production database | `transactions.reservation_id`, `invoices.reservation_id`, `package_pulse_usage`, `laser_pulse_logs`, `medical_records`, `prescriptions` are SET NULL; `reservation_products`, `consumption_entries`, `package_revenue_recognitions` are CASCADE; `payments` and `invoice_lines` cascade from `invoices` | Cause confirmed |
| 2026-10-25 | Reported patient after the owner's delete (SELECT only) | production database | 0 bookings; 2 transactions with no booking (TXN-001073 1200, TXN-001074 1500); 3 invoices with no booking, 2 payments; customers row spent 2700, outstanding 2920, bookings 3 | Cause confirmed |
| 2026-10-25 | Route behaviour with an in-memory database | vitest | `tests/routes/reservations-hard-delete-cascade.test.ts`: 23 cases, 18 failed before the fix, 23 pass after | Pass |
| | Everything below in a browser | | Not run yet | Pending |

## Before testing
- [ ] Superadmin login on dev. Make a throwaway patient **T** with: booking 1 (completed, paid in full, say 1,200), booking 2 (completed, paid 1,500 of 1,600, so 100 left), booking 3 (completed, nothing paid, 2,820 left) and one more booking 4 (confirmed with a 300 deposit, not completed). Note T's Total Spend, Outstanding and Bookings in the profile and in the Patients list (expected 2,700 / 2,920 / 4 if made through "Add Previous Booking" and checkout).
- [ ] Also note another patient **U** with at least one paid booking, and the Transactions screen total for T and U.

## The dialog
- [ ] Bookings -> open booking 2 -> Delete. Under **Hard Delete** the text says that the booking's payments and invoice are deleted too, shows "EGP 1,500 paid on this booking", and says Total Spend, Outstanding and the bookings count go down. It is not the old "Linked records will be cleaned or unlinked." sentence.
- [ ] Switch the language to Arabic: the same sentence appears in Arabic with the amount, right-to-left, no broken layout.
- [ ] Delete a different record type that uses the same dialog (a patient): its Hard Delete text is unchanged.

## Hard delete of booking 2
- [ ] Choose Hard Delete. The dialog closes and the booking disappears from the list.
- [ ] Transactions: the 1,500 payment of booking 2 is gone; T's other payments and all of U's are still there.
- [ ] T's profile and the Patients list now show Total Spend 1,200, Outstanding 2,820, Bookings 3 (reload to be sure). U's figures are unchanged.
- [ ] Finance: the booking's invoice is no longer in the invoice list; the other invoices are.

## The other bookings
- [ ] Hard delete booking 4 (confirmed, deposit): Total Spend and Outstanding do not change, Bookings goes down by 1.
- [ ] Hard delete booking 3: Outstanding drops by 2,820.
- [ ] Hard delete booking 1: Total Spend goes to 0, Outstanding 0, Bookings 0. T shows no money anywhere.
- [ ] Wallet on T never moved during any of this.

## Soft delete and other modes
- [ ] Soft Delete on a booking of U (use a copy): the booking shows as cancelled, its payments, invoice and U's figures are unchanged.

## Package session given back
- [ ] Sell T a package of 3 sessions of a service, book and complete a session through the normal flow (consumes 1 of 3). Hard delete that booking: the package shows 3 of 3 remaining again (and Active if it had been fully used).
- [ ] A session entered through "Add Previous Booking" with a package, and a laser pulse package, are NOT given back (known limit, RISK-139): the package keeps showing them used.

## Failure and permissions
- [ ] As an `admin` or receptionist (not superadmin) the Delete button is not offered; the API answers 403 (unchanged).
- [ ] Two superadmins hard-deleting the same booking: the second gets "Not found", not a success message.
- [ ] Look at the server log for the delete: one `[audit] booking hard delete ...` line with the transaction ids and amounts and the figures before and after.
