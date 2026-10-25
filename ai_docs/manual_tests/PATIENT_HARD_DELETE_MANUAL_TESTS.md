# Patient Hard Delete: Manual Test Checklist

> Reasoning: `ai_docs/DECISIONS.md` -> DEC-128; related: `ai_docs/RISKS.md` -> RISK-133. Automated coverage: `tests/routes/customers-hard-delete.test.ts` (route level, in-memory database). The dialog and the Patients list have no component test, so the checks below need a person. Use throwaway test patients only, on dev first. Log in as a **superadmin** (patient delete is superadmin only).

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| 2026-10-25 | Production state of the reported patient "Hamada Test" (SELECT only) | production database | No `customers` row; 1 rejected booking with that name and `customer_id` NULL (the only unlinked booking in the database), 1 transaction linked to that booking; no packages, wallet, invoices, product sales, medical records, prescriptions or login | Cause confirmed (the entry on screen is made from that booking) |
| 2026-10-25 | Route behaviour with an in-memory database | vitest | `tests/routes/customers-hard-delete.test.ts`: 15 cases, 11 failed before the fix, 15 pass after | Pass |
| | Everything below in a browser | | Not run yet | Pending |

## Before testing
- [ ] Logged in as superadmin. Make three throwaway patients on dev: **A** (no bookings at all), **B** (one booking, any status), **C** (one booking with a payment recorded).

## Patient with no history (A)
- [ ] Patients -> open A -> Delete -> **Hard Delete (Permanent Removal)**. The dialog closes, the patient is gone from the list at once.
- [ ] Reload the page: A is still gone (it does not come back).
- [ ] If A had a login (signed up on the website), that login no longer works.

## Patient with bookings or payments (B, C)
- [ ] Open B -> Delete -> Hard Delete. A message says the patient cannot be permanently deleted because of "1 booking" (and for C also "1 payment record"), and suggests Soft Delete. The patient stays in the list. The dialog stays open.
- [ ] Open B's profile: the booking is still there and still linked to B (visits and totals unchanged).
- [ ] Use **Soft Delete (Deactivate)** on B: B shows as inactive, the booking is still linked, nothing is lost.
- [ ] If B or C has a login: it still works after the refused hard delete.

## A patient that exists only because of a booking (no patient record)
- [ ] Make a booking for a phone number that has no patient record (or find an entry like "Hamada Test" on production after the fix). Open it in Patients -> Delete -> Hard Delete (or Soft Delete).
- [ ] The message says the patient has no patient record and appears only because of N booking(s), and to delete or cancel them from the Bookings screen. No database error text ("invalid input syntax for type uuid") appears.
- [ ] Bookings -> open that booking -> delete it (superadmin). Back in Patients after a refresh, the entry is gone. Any payment that was linked to that booking stays in Transactions (with no booking), as before.

## Other
- [ ] As an `admin` (not superadmin) the Delete button is not offered and the API answers 403 (unchanged).
- [ ] The two descriptions in the Delete Customer dialog no longer say "linked appointments are unlinked".
- [ ] Two superadmins deleting the same throwaway patient: the second gets "Patient not found. Refresh the list." (not a success message).
