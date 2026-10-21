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

## A previous booking shows its Invoice Value (DEC-120)
- [ ] Add Previous Booking for a patient with one service, Invoice Value **different from today's catalog price** (e.g. catalog 1500, invoice 1000), Actual Spent 1000. Open the patient, Booking History, click that booking: the service line and the total read **1000**, not 1500. Paid 1000, nothing outstanding.
- [ ] Same with Actual Spent 400: total 1000, paid 400, outstanding 600.
- [ ] Two services in one previous booking, Invoice Value 800 (catalog 600 + 400): the two lines add up to exactly 800 and the total is 800.
- [ ] Change the service's catalog price afterwards: the old booking still shows the invoice value; a new online booking for that service shows the new price.
- [ ] A previous booking with Invoice Value 0 still shows 0 EGP everywhere (unchanged).
- [ ] A normal (non-previous) booking still shows its catalog-based price (unchanged).
- [ ] Print / PDF invoice of an old previous booking: lines and total match the screen.
- 2026-10-23, dev.reveraclinics.com, superadmin: previous booking created through the API for a throwaway patient, service catalog price 100, Invoice Value 700, Actual Spent 700: the booking details screen showed the service line 700 EGP, Total Price 700, Service Price 700, Paid 700, Outstanding 0 (before the change the line would have read 100). Booking and patient deleted afterwards. Not yet run: two services, partial payment, print invoice, Arabic.

## Two services, partial payment, Payment badge (DEC-120 follow-up)
- [ ] Add Previous Booking with two services (catalog 100 + 150), Invoice Value 800, Actual Spent 300. Booking History row: price 800, paid 300, outstanding 500, Payment = Partial. Open it: each service appears ONCE (about 320 and 480), Total Price 800, Payment Summary 800 / 300 / 500, "Partially Paid".
- [ ] View Invoice / Print Invoice of that booking: the same two lines and total 800.
- [ ] Arabic: the Booking History headers and the booking details labels read right, numbers line up.
- [ ] Payment badge: a fully paid booking = Paid, a partly paid one = Partial, a booking with nothing paid and a balance = Unpaid, a cancelled one and an old booking with no recorded balance = a dash.
- 2026-10-23, dev.reveraclinics.com, superadmin, throwaway two-service previous booking (services 100 + 150, Invoice Value 800, Actual Spent 300): table 800 / 300 / 500 and badge Partial; booking details list each service once (320 + 480), Total 800, Payment Summary 800 / 300 / 500 Partially Paid; Invoice preview subtotal 800, paid 300 (a single line with the whole total, as the invoice template always did); Arabic: RTL layout, Arabic headers, 800ج.م and badge جزئي. Print to PDF itself not run. Data deleted afterwards.

