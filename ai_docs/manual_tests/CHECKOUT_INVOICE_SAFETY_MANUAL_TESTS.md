# Checkout Invoice Safety Manual Test Checklist (DEC-139 / RISK-143)

> **Living document.** Update this file with dated dev evidence as each check is run.
> **Environment:** linked dev database (browser, staff login). Do not run against production.
> Request: after a code review of commit 23f103b, make the invoice that already exists at checkout safe to rewrite, only let an `issued` invoice take a payment, and stop writing the invalid invoice status `paid`.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| | | | | |

## Per-check list

### A. Manual booking creates a real invoice (was silently skipped when fully paid)
- [ ] Admin -> Bookings -> New booking (manual), service 500 EGP, enter amount paid 500 (fully paid). Save. Open the booking -> View Invoice: it shows an `INV-xxxxxx` number, one service line of 500, and the payment of 500.
- [ ] Repeat with amount paid 200 (partial): invoice exists, one line of 500, payment of 200.
- [ ] Repeat with amount paid 0: invoice exists with its line and no payment.
- [ ] Repeat with amount paid 800 on a 500 service (overpayment): invoice exists; the extra 300 is credited to the patient's wallet; no error on screen.
- [ ] `select status, count(*) from invoices group by status` (read-only, dev) shows only `issued` for the new rows, never `paid`.

### B. Checkout over the booking-time invoice
- [ ] Take the partially paid manual booking from A (200 paid). Start it, complete it, pay the remaining 300 at checkout. The booking still has ONE invoice with the same `INV-` number, ONE authoritative line, totals 500; Payments show two rows (200 and 300) with two different references.
- [ ] Transactions tab for the patient: one service charge of 500, the 200 booking payment, the 300 checkout payment; no duplicates.
- [ ] A service with a consumable recipe: after checkout the invoice line has COGS and commission filled in (costing ran on the new line).

### C. Payments after completion
- [ ] On a completed booking with a balance, settle part of it (Patients -> profile -> Settle Balance, or the booking drawer). The payment is appended to the existing `issued` invoice with a new unique `INV-` reference and an `outstanding_payment` history row.
- [ ] Settle a second time: a third distinct reference; no duplicate references across the invoice's payments.
- [ ] Overpay a settled (fully paid) invoice by a small amount: still accepted on the same invoice (an `issued` invoice stays payable).
- [ ] Void the invoice of a completed booking (database / admin tool available on dev), then settle a balance: NO payment row is added to the void invoice; the money appears only as a standalone `outstanding_payment` transaction for the patient.

### D. Failure behaviour (automated; browser check only if a fault can be injected)
- [ ] Automated (`tests/routes/checkout-invoice-safety.test.ts`): when inserting the new invoice lines fails the old lines and totals remain; when deleting the old lines fails the new lines are rolled back and the header restored.
- [ ] Automated: a failing or throwing `next_invoice_no` does not fail the payment; the reference falls back to `<invoice no>-P<n>`.
- [ ] If the server log shows `Manual booking invoice lines insert failed`, confirm the booking was still created, no empty invoice exists for it, and opening View Invoice creates a complete one.

### E. Invoice view
- [ ] View Invoice on a booking that has no invoice yet and is already fully paid: the invoice is created on first view (status `issued`), with its line and a payment equal to the amount paid; no error in the console / server log about `invoices_status_check`.

## Out of scope / unchanged
- An overpayment still stores a payment row larger than the invoice total (the surplus goes to the wallet separately).
- Invoice numbers skipped by the old failing inserts are not renumbered.
