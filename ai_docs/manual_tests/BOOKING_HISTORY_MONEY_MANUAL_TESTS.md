# DEC-119 — Booking History: Service Price, Paid, Outstanding — Manual Test Checklist

> **Living document.** Update with dated evidence as each check is run.
> Full reasoning: `ai_docs/DECISIONS.md` -> **DEC-119**. Automated coverage: `tests/lib/bookingMoney.test.ts` (the arithmetic) and `tests/components/patients/CustomerProfileBookingHistoryMoney.test.tsx` (the table).
> Use test data only. Where: Patients -> open a patient -> **Booking History** tab.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| 2026-10-21 | Helper arithmetic and table rendering | automated (Vitest) | Helper tests and table render tests pass (see the commit message for counts) | Pass |
| 2026-10-21 | Live browser check of the tab (EN and AR, desktop and narrow screen) | not run | The agent could not log in to a live admin | Pending |

## Columns and layout
- [ ] The table shows, in order: Date / Slot, Service, Provider, Room, **Service Price**, **Paid**, **Outstanding**, Payment, Status.
- [ ] Amounts have thousands separators (e.g. `1,250`) and the `EGP` unit; unknown values show a dash.
- [ ] Switch the language to Arabic: the three headers read "سعر الخدمة", "المدفوع", "المتبقي"; the column order mirrors (RTL) and the numbers stay aligned.
- [ ] On a narrow screen the table scrolls sideways; nothing overlaps.
- [ ] Outstanding above 0 is shown in red; 0 is not.

## Values (create test bookings for a test patient)
- [ ] New unpaid booking (price 500): Price 500, Paid 0, Outstanding 500.
- [ ] Booking with a deposit of 100 on a price of 500: Price 500, Paid 100, Outstanding 400.
- [ ] Completed booking paid in full: Outstanding 0, Price = Paid.
- [ ] Completed booking with a partial payment (paid 700 of 1,000): Price 1,000, Paid 700, Outstanding 300. After "Settle Debt" for 300, the same row shows Paid 1,000, Outstanding 0.
- [ ] Completed booking with an add-on product or a discount at checkout: Price equals the final invoice total, not the catalog price.
- [ ] Cancel a booking that had a deposit: Service Price shows "Not delivered", Paid 0 (refunded to wallet), Outstanding 0.
- [ ] Mark a booking no-show: Service Price shows "Not delivered", Paid = the kept deposit, Outstanding 0.
- [ ] Reject a pending website request: Service Price "Not delivered", Outstanding 0 (not the price it was created with).
- [ ] A laser/package session paid by a package: the price cell says "Covered by package"; Paid 0, Outstanding 0. A package session that also had an extra charge shows the real numbers.
- [ ] A booking added with "Add Previous Booking" with an invoice value of 500 and 300 paid: Price 500, Paid 300, Outstanding 200.
- [ ] Old booking with no recorded balance (if one exists): Price and Outstanding show a dash, never 0.
- [ ] Row click still opens the booking details; the Payment and Status badges are unchanged.
