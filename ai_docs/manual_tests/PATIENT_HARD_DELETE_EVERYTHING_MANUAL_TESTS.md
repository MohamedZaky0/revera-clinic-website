# Patient Hard Delete (Deletes Everything): Manual Test Checklist

> Reasoning: `ai_docs/DECISIONS.md` -> DEC-132 (supersedes DEC-128); related: `ai_docs/RISKS.md` -> RISK-138, RISK-133. Automated coverage: `tests/routes/customers-hard-delete.test.ts` (route level, in-memory database, no foreign keys) and `tests/lib/customerDeletionText.test.ts`. The dialog has no component test and the in-memory database cannot prove the real foreign keys, so the checks below need a person. **Use throwaway test patients only, on dev first.** This delete cannot be undone. Log in as a **superadmin**.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| 2026-10-25 | Foreign keys that point at `customers`, `reservations`, `invoices`, `transactions` (SELECT only) | production database | All `SET NULL` or `CASCADE`; none restricts a delete | Confirmed |
| 2026-10-25 | Route behaviour with an in-memory database | vitest | `tests/routes/customers-hard-delete.test.ts`, `tests/lib/customerDeletionText.test.ts` | Pass |
| | Everything below in a browser | | Not run yet | Pending |

## Before testing
- [ ] Logged in as superadmin. Make throwaway patients on dev: **A** (nothing attached), **B** (2 bookings, one with a payment, plus a package and a wallet top-up), **C** (a different patient with a booking and a payment, to prove it is untouched), **D** (a booking made for a phone number that has no patient record: appears in Patients as a booking-derived entry).
- [ ] Note C's bookings, Transactions and package before starting.

## Dialog and preview
- [ ] Patients -> open B -> Delete. The dialog briefly says "Checking what would be deleted...", then the **Hard Delete** card becomes clickable.
- [ ] Click **Hard Delete**. A red box appears: "This will permanently delete: 2 bookings, N payment records (X EGP), 1 package, 1 wallet entry" with numbers matching what B really has (compare with B's profile and Transactions).
- [ ] The delete only happens after the second button "Yes, permanently delete everything" is clicked. Cancel closes the dialog and nothing is deleted.
- [ ] Switch the admin language to Arabic: the dialog, the list of counts and the button are in Arabic and read right-to-left.
- [ ] Soft Delete (Deactivate) is still one click and keeps everything.
- [ ] If the preview fails (stop the network): a red message says permanent delete is unavailable; the Hard Delete card stays disabled.

## Patient with history (B)
- [ ] After confirming: the dialog closes, B is gone from Patients, and stays gone after a reload (it does not come back as a booking-derived entry).
- [ ] B's bookings are gone from Bookings (all statuses), B's payments are gone from Transactions, B's package is gone, B's wallet history is gone.
- [ ] If B had a login (signed up on the website), that login no longer works. A staff login with the same phone or e-mail is never removed.
- [ ] Server log has one line starting `patient hard delete:` with the counts.

## Another patient is untouched (C)
- [ ] C is still in Patients with the same bookings, payments, package and wallet as noted before.

## Patient with nothing attached (A)
- [ ] Hard delete works, the preview says "No bookings, payments or other records are attached to this patient", A is gone after a reload.

## Booking-derived entry (D)
- [ ] Open D (no patient record) -> Delete -> Hard Delete. The preview counts its bookings and payments. After confirming, the entry disappears and stays gone after a reload; its bookings and their payments are gone.
- [ ] Soft Delete on a booking-derived entry answers with a clear message ("no patient record ... use Hard Delete") and changes nothing.

## Edge cases
- [ ] A patient with an un-linked booking with the same phone and name (create via the public booking form without logging in): the booking is deleted with the patient and the patient does not return.
- [ ] An un-linked booking with the same phone but clearly another name: it is kept, the dialog says how many, and it may show as a separate entry afterwards.
- [ ] Two patient rows sharing a phone: deleting one does not delete the other's bookings.
- [ ] Two superadmins deleting the same throwaway patient: the second gets "Patient not found. Refresh the list."
- [ ] If a deletion step fails (simulate on dev by blocking a table): the message names the step, the patient is still in the list, and deleting again finishes the job.
- [ ] As an `admin` (not superadmin) the API answers 403 for both the preview and the delete.
- [ ] Finance pages after deleting B: income of B is gone from reports (expected, by decision).
