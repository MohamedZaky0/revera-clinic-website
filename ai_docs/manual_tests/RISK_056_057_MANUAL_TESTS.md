# RISK-056 / RISK-057 Manual Test Checklist — Doctor Session Billing & Invoice Itemization

> **Living document.** Update this file with dated dev evidence as each check is run.
> **Environment:** live `dev.reveraclinics.com`, real doctor + reception logins, a real booking
> carried end-to-end through Approve → Check-in → Start Session → Complete Treatment → Pay & Settle.
> Neither bug is catchable by `tsc`/`eslint`/unit tests — both only reproduce against the actual
> completed-session data flow.
>
> Full reasoning and code pointers are in `ai_docs/RISKS.md` → **RISK-056** and **RISK-057**. This
> file is just the click-through checklist referenced from there.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| 2026-08-17 | RISK-056: base price dropped before fix | dev, doctor portal (Ongoing Session) | Therapeutic Laser (110 EGP) booking showed "Primary Reserved Service: 0 EGP" / "Base Service: 0 EGP" before touching the service dropdown; after adding a 700 EGP product, "Final Invoice" read 700 EGP, not 810. | CONFIRMED (bug) |
| 2026-08-17 | RISK-056: fixed, redeployed, reloaded | dev, doctor portal | Same booking after redeploy: "Base Service: 110 EGP" on load (no dropdown interaction needed); after adding the same product, "Final Invoice: 810 EGP". | PASS |
| 2026-08-17 | RISK-056: Complete Treatment persisted correctly | dev (live API check) | `GET /api/reservations` for the booking after Complete Treatment: `status: "completed"`, `amountPaid: 6`, `amountLeft: 804` (810 − 6). `notes` contains `[Invoice Total Updated]: 810 EGP (Base: 110 EGP + Consumables: 700 EGP)`. | PASS |
| 2026-08-17 | RISK-057: invoice PDF missing product line, first fix | dev, reception "View Invoice & Print PDF" | Before fix: one line item (Therapeutic Laser, 110 EGP), Subtotal 110 EGP, "Amount Paid: 810 EGP" with no line explaining the gap. After fix + redeploy: two line items (Therapeutic Laser 110 EGP, "k (Add-on)" 700 EGP), Subtotal 810 EGP, Amount Paid 810 EGP. | PASS |
| 2026-08-17 | RISK-057: drawer Price Details total, first fix | dev, reception booking-details drawer | Before fix: "Total Price: 110 EGP" while Session Paid/Outstanding correctly showed 810/0 — inconsistent. After fix: "Products & Consumables: +700 EGP", "Total Price: 810 EGP", matching Session Paid. | PASS |
| 2026-08-17 | RISK-057: drawer Products panel, second fix (found while re-verifying the first) | dev, reception booking-details drawer | Same booking still showed "No products added" in the "Products & Session Consumables" panel after the first fix landed — a third, independent copy of the same regex logic. After the second fix + redeploy: panel lists "k" with "Doctor Session" tag, Qty 1 x 700 EGP. | PASS |
| 2026-08-17 | `tsc --noEmit` / `eslint` clean after all three edits | dev repo | No new errors on `src/app/admin/page.tsx` or `src/components/admin/DoctorAccountView.tsx`. | PASS |

## Per-check list — RISK-056 (base service price)

- [ ] Start a fresh session for a booking whose service was **never** changed via the "Selected
      Patient Service (Changeable)" dropdown (the common case).
- [ ] On the doctor portal's Ongoing Session screen, before adding anything, confirm "Primary
      Reserved Service" and "Base Service" both show the service's real price, not 0 EGP.
- [ ] Add a product and/or additional service; confirm "Final Invoice" = base + products +
      additional services + pulses (not missing the base amount).
- [ ] Click Complete Treatment; confirm the resulting `amountLeft` on the reservation equals the
      correct total minus `amountPaid` (check via Patients → Booking History or the booking-details
      drawer's Session Outstanding figure).
- [ ] Separately, confirm changing the service via the dropdown still works and still produces the
      correct total (this interaction was already correct before the fix — regression-check only).

## Per-check list — RISK-057 (invoice/drawer itemization)

- [ ] Complete a session with at least one doctor-added product (Products Used In Treatment on the
      doctor portal).
- [ ] Open the booking from reception (Bookings → Calendar/Today's Schedule): confirm the "Price
      Details" card's Total Price includes the product cost, not just the base service.
- [ ] In the same drawer, confirm the **"Products & Session Consumables"** panel lists the product
      by name with the right qty/unit price/total and an "Doctor Session" tag — not "No products
      added".
- [ ] Click "View Invoice & Print PDF": confirm the product appears as its own line item (labeled
      "`<name>` (Add-on)"), and Subtotal equals Amount Paid (or the correct outstanding balance if
      not fully settled) — no unexplained gap between the line items and the totals.
- [ ] Repeat with **two or more** products added in the same session — confirm all of them appear as
      separate line items in both the drawer panel and the invoice, not just the first one matched.
- [ ] Repeat with extra device pulses added (no product) — confirm the existing `[Extra Device
      Pulses]` parsing still works unaffected by this change (regression-check only).
