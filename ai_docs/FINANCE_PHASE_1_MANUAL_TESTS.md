# Phase 1 Manual Test Checklist — Financial Ledger Spine

> **Living document.** Update the matching task row in this file in the same commit as every 1.x implementation step. Keep evidence (test date, environment, test IDs, and result) below the row; never mark a tracker task `DONE` until its applicable checks pass.
>
> **Environment:** linked dev database only. All current data is mock and may be reset. Use a staff bearer token for every admin API call.

## Evidence log

| Date | Task | Environment | Evidence | Result |
|---|---|---|---|---|
| 2026-07-26 | 1.10 | dev | Reservation `2e03f8ea-e88d-4923-8b1c-5a27e0efeb3d` created invoice `INV-000001`; two service lines totalled 220; one cash payment of 100 | PASS |

## Per-task checklist

### 1.1–1.6 — Ledger and package schema

- [x] **1.1 `invoices`:** Verify table, sequence, indexes, and RLS through the linked schema; insert a valid issued invoice and confirm duplicate `invoice_no` fails.
- [x] **1.2 `invoice_lines`:** Insert service and product lines; confirm invoice deletion cascades and invalid `line_type` fails.
- [x] **1.3 `payments`:** Insert one receipt per allowed method; confirm invalid method fails and invoice deletion cascades.
- [x] **1.4 `wallet_txns`:** Insert `in` and `out` movements; confirm a zero/negative amount fails.
- [x] **1.5 `packages` / `package_items`:** Create active and inactive package definitions; confirm package-item deletion cascades with the package.
- [x] **1.6 customer package tables:** Create an entitlement with multiple items; verify package/session FKs and the `invoice_lines.package_id` FK exist.

### 1.7–1.9 — Pure ledger and package calculations

- [x] **1.7:** Run `npx.cmd tsx scratch/phase1ledgercheck.ts`; verify invoice total and tax cases pass.
- [x] **1.8:** Run `npx.cmd tsx scratch/phase1packagecheck.ts`; verify recognised plus deferred revenue equals the package price exactly.
- [x] **1.9:** Record passing regression output in the implementation commit.

### 1.10 — Booking checkout invoice dual-write

- [x] Complete a staff checkout for a booking with two services and a non-zero payment.
- [x] Query `invoices`, `invoice_lines`, and `payments` by `reservation_id`; confirm one issued invoice, each service line, and one receipt.
- [x] Confirm `sum(invoice_lines.line_total) = invoices.grand_total` and payment amount equals checkout payment.
- [x] Confirm the pre-existing reservation/customer settlement path still runs (`amount_paid`, `amount_left`, `spent_amount`, `outstanding`, and wallet behavior).
- [ ] Complete an already-completed booking with an additional payment; confirm a new payment attaches to the existing invoice without duplicate service lines.
- [ ] Complete a booking with no linked customer; record and approve the intended no-invoice behavior before changing it.

### 1.11 — POS-sale invoice dual-write

- [ ] Sell one in-stock product through the staff POS flow.
- [ ] Confirm one native `product_sales` row, stock reduced exactly once, and existing `customers.spent_amount` behavior remains unchanged.
- [ ] Confirm one product invoice line has the sold product, quantity, unit price, and total; confirm the payment method and receiving employee are correct.
- [ ] Repeat using a branch name and a non-cash supported payment method; confirm the invoice branch and payment enum mapping.
- [ ] Force or inspect a ledger-write failure only in dev; confirm the native POS sale still succeeds and the failure is logged.

### 1.12 — Package sale endpoint

- [ ] Create an active package with at least two configured service items and a validity period.
- [ ] POST `/api/packages/sell` as staff; confirm response `201` and one invoice, package line, cash payment, customer package, and entitlement item per definition.
- [ ] Confirm `expires_at` equals purchase time plus `validity_days`, `qty_used = 0`, and `qty_total = qty_remaining`.
- [ ] Try an inactive package, missing customer, empty package, zero-quantity package item, and a mismatched restricted branch; confirm each is rejected without partial records.
- [ ] Confirm an unrestricted package uses the request branch when supplied and a restricted package uses/matches its configured branch.

### 1.13 — Consume package session and recognise revenue

- [ ] Before implementation, record the selected durable revenue-recognition table/record and its audit fields here.
- [ ] Consume one entitled session as staff; confirm exactly one entitlement item decrements/increments and no second customer-facing invoice is created.
- [ ] Verify the recognition amount is the pro-rata amount; after several sessions, verify recognised plus deferred equals `price_paid` exactly.
- [ ] Try consuming after all sessions are used, after expiry, and for another customer's entitlement; confirm safe rejection.
- [ ] Test manual extension; confirm `expires_at`, `extended_by_employee_id`, and `extended_at` are set.

### 1.14 — Ledger-derived balances and reconciliation

- [ ] Run reconciliation for every dev customer; compare invoice/payment/wallet sums against legacy scalars and record discrepancies.
- [ ] Verify unpaid invoices increase receivables; later payments decrease them; wallet `in`/`out` produces the expected balance.
- [ ] Verify no user-facing balance reads cut over until reconciliation is approved.

### 1.15 — Opening balances

- [ ] Run the import with a disposable, balanced fixture covering cash, receivables, wallet credit, packages, assets, and loans.
- [ ] Confirm all records use `is_opening = true`, share the intended as-of date, and are included exactly once on re-run.
- [ ] Confirm patient receivables come from the supplied audit fixture, not legacy `customers.outstanding`.

### 1.16 — Contract rollup

- [ ] Confirm every Phase 1 endpoint and side effect is described in `API_CONTRACT.md`.
- [ ] Confirm every completed task above has dated evidence and that the tracker status/commit hash agree.
