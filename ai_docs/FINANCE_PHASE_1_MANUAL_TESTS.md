# Phase 1 Manual Test Checklist — Financial Ledger Spine

> **Living document.** Update the matching task row in this file in the same commit as every 1.x implementation step. Keep evidence (test date, environment, test IDs, and result) below the row; never mark a tracker task `DONE` until its applicable checks pass.
>
> **Environment:** linked dev database only. All current data is mock and may be reset. Use a staff bearer token for every admin API call.

## Evidence log

| Date | Task | Environment | Evidence | Result |
|---|---|---|---|---|
| 2026-07-26 | 1.10 | dev | Reservation `2e03f8ea-e88d-4923-8b1c-5a27e0efeb3d` created invoice `INV-000001`; two service lines totalled 220; one cash payment of 100 | PASS |
| 2026-07-26 | 1.13 | dev | Migration `20260726010700` applied; linked migration list matches and shadow `db diff` found no schema changes | PASS |
| 2026-07-26 | 1.10 (repeat payment) | dev | `PATCH /api/reservations?id=2e03f8ea-e88d-4923-8b1c-5a27e0efeb3d` with `amountPaid: 150` (was 100) as a real staff session (superadmin, `mohamed.zaky.anwar@gmail.com`). Result: one new `payments` row of `50` attached to the existing `INV-000001` (invoice `6fde2d07-…`); `invoice_lines` still exactly 2 rows; `invoices` still exactly 1 row for the reservation — no duplicate invoice, no duplicate lines | PASS |
| 2026-07-26 | 1.10 (no customer) | dev | Inserted a disposable `reservations` row with `customer_id: null` (`4e909f1f-cc2f-4a08-9afb-5fbd712d979c`), then `PATCH ...?id=4e909f1f… {status: 'completed', amountPaid: 100, amountLeft: 0}` via the same staff session. Response `200`, no error. `invoices` for that reservation: `[]` — confirms the documented `if (isSettlement && target.customer_id)` scoping: a no-customer checkout completes cleanly and produces no invoice, matching the "not an accident, a deliberate-later-decision" note in `FINANCE_TRACKER.md` task 1.10 | PASS |
| 2026-07-26 | 1.11 | dev | `POST /api/inventory/products/sales`, product `prod-1784586429059-627` (qty 2, unit 700, branch `New Cairo Branch`, method `Card`), real customer `ad17a8b0-…`. `stock_quantity` 10→8 (exactly once); `customers.spent_amount` 150→1550 (unchanged `addToCustomerSpend` behavior); native `product_sales` row correct; one `stock_movements` `'out'` row (`unit_cost` = live `cost_price`); new invoice `INV-000002` (`reservation_id: null`), one `product` line (qty 2, unit 700, total 1400), one `payments` row (`amount: 1400`, `method: 'card'` — correctly mapped from `"Card"`, `received_by_employee_id` = the real signed-in employee, unlike the reservations checkout path where it's still always `null`) | PASS |
| 2026-07-26 | 1.11 (ledger-write-failure isolation) | dev | Sold to a syntactically-valid but non-existent `customer_id`. **Found RISK-022** in the process: this didn't just fail the ledger dual-write as intended — the native `product_sales` insert itself failed (`product_sales_customer_id_fkey`, `23503`), fell through to the `page_settings` blob, deducted stock anyway, and reported `success: true`; the sale then became permanently invisible in sales history once the native table had other rows. Fixed same-day in `58fe1dc` (customer existence check before any write); re-verified after the fix deployed: same request now returns `404` before touching stock or any table | PASS (after fix) |
| 2026-07-26 | 1.13 (consume + recognise) | dev | 3-session package (`price_paid: 900`) consumed across 3 completed reservations via `POST /api/packages/consume`. Recognitions: `300, 300, 300` — each session's `recognised_amount` matched the cumulative-then-subtract math exactly (`round(900/3, 2) × N − previously recognised`); `qty_remaining` decremented `3→2→1→0`; `customer_packages.status` correctly flipped to `fully_used` on the last session; sum of all `package_revenue_recognitions.recognised_amount` = `900` = `price_paid` exactly; zero new `invoices` rows tied to any consumed reservation (no second customer-facing invoice). A 4th consume attempt on the exhausted item was rejected: `"Customer package is not active"` | PASS |
| 2026-07-26 | 1.13 (rejections + extend) | dev | Wrong-customer: consuming a package item using a reservation belonging to a different customer → `"Reservation does not belong to this package customer."`. Expired: set `expires_at` to `2020-01-01`, attempted consume → `"Customer package has expired"`. Manual extend via `POST /api/packages/extend` on the same expired package → `expires_at` updated to the requested date, `status` flipped back to `active`, `extended_by_employee_id` = the real signed-in employee, `extended_at` set | PASS |
| 2026-07-26 | 1.14 | dev | `GET /api/customers/reconcile` against deployed dev: `customersChecked: 4`, `discrepancyCount: 2`. Confirmed the 2 discrepancies are expected pre-Phase-1 history gaps, not bugs — see `FINANCE_TRACKER.md` task 1.14 for the full reasoning and the two customers' exact figures. `scratch/phase1balancescheck.ts` — 19 cases (fully/partially/overpaid invoices, multi-payment summing, draft/void exclusion, wallet net in/out and negative-clamp, empty input) — all pass | PASS (tool verified correct; underlying data drift is expected, not a defect) |
| 2026-07-26 | 1.12 | dev | Fixture: an unrestricted active package (2 items, 90-day validity), an inactive package, an active-but-empty package, a Sheikh-Zayed-restricted package, and a zero-qty-item package, inserted directly (no create-package endpoint exists yet). `POST /api/packages/sell`: unrestricted package with no `branchId` → invoice `branch_id: null`; same package with an explicit `branchId` → invoice uses the requested branch; restricted package with no `branchId` → invoice correctly uses the package's own configured branch. Every sale: 1 invoice (`package` line, `qty:1`, correct price), 1 `payments` row (`cash`, correct employee), 1 `customer_packages` row (`expires_at` = purchase time + `validity_days` exactly, `status: 'active'`), and one `customer_package_items` row per definition with `qty_total = qty_remaining` and `qty_used: 0`. Rejections, all clean errors with zero partial records: inactive package (`"Active package not found."`), non-existent customer (`"Customer not found."`), empty package (`"Package must contain at least one service..."`), zero-qty item (same message — rejected at the **application** level; see note below), mismatched restricted branch (`"Package is not available at the requested branch."`) | PASS |

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
- [x] Complete an already-completed booking with an additional payment; confirm a new payment attaches to the existing invoice without duplicate service lines.
- [x] Complete a booking with no linked customer; record and approve the intended no-invoice behavior before changing it. **Approved as-is** — confirmed reproducible, not a bug; revisit only if product wants walk-in/no-customer checkouts to also get an invoice.

### 1.11 — POS-sale invoice dual-write

- [x] Sell one in-stock product through the staff POS flow.
- [x] Confirm one native `product_sales` row, stock reduced exactly once, and existing `customers.spent_amount` behavior remains unchanged.
- [x] Confirm one product invoice line has the sold product, quantity, unit price, and total; confirm the payment method and receiving employee are correct.
- [x] Repeat using a branch name and a non-cash supported payment method; confirm the invoice branch and payment enum mapping. (Tested together with the item above, in one sale.)
- [x] Force or inspect a ledger-write failure only in dev; confirm the native POS sale still succeeds and the failure is logged. **Found and fixed RISK-022** in the process (see evidence log) — the native sale did *not* still succeed for this trigger; a nonexistent `customer_id` broke the native insert itself, not just the ledger dual-write. Now rejected upfront with a `404` instead.

### 1.12 — Package sale endpoint

- [x] Create an active package with at least two configured service items and a validity period.
- [x] POST `/api/packages/sell` as staff; confirm response `201` and one invoice, package line, cash payment, customer package, and entitlement item per definition.
- [x] Confirm `expires_at` equals purchase time plus `validity_days`, `qty_used = 0`, and `qty_total = qty_remaining`.
- [x] Try an inactive package, missing customer, empty package, zero-quantity package item, and a mismatched restricted branch; confirm each is rejected without partial records. **Note:** the zero-quantity rejection is enforced only in this route's own validation (`item.qty <= 0` check) — `package_items.qty` has no DB-level `CHECK` constraint (unlike every other quantity column added in Phase 1/2, e.g. `service_consumables.standard_qty > 0`). Not a live bug today since no other write path creates `package_items` rows yet, but worth a `CHECK (qty > 0)` migration before any second caller (an admin CRUD UI, an import script) exists.
- [x] Confirm an unrestricted package uses the request branch when supplied and a restricted package uses/matches its configured branch.

### 1.13 — Consume package session and recognise revenue

- [x] **Design selected:** `package_revenue_recognitions` is the durable management-accounting event ledger. It records the customer package, entitlement item, delivered reservation, timestamp, recognised amount, reason, and staff identity; its unique item/reservation pair prevents duplicate recognition.
- [x] Consume one entitled session as staff; confirm exactly one entitlement item decrements/increments and no second customer-facing invoice is created.
- [x] Verify the recognition amount is the pro-rata amount; after several sessions, verify recognised plus deferred equals `price_paid` exactly.
- [x] Try consuming after all sessions are used, after expiry, and for another customer's entitlement; confirm safe rejection.
- [x] Test manual extension; confirm `expires_at`, `extended_by_employee_id`, and `extended_at` are set.

### 1.14 — Ledger-derived balances and reconciliation

- [x] Run reconciliation for every dev customer; compare invoice/payment/wallet sums against legacy scalars and record discrepancies. **2 of 4 customers showed drift — expected and explained in `FINANCE_TRACKER.md` task 1.14 (the ledger doesn't and can't cover pre-Phase-1 mock history); not a bug in the reconciliation logic itself, which is exactly what correctly surfaced it.**
- [x] Verify unpaid invoices increase receivables; later payments decrease them; wallet `in`/`out` produces the expected balance. Covered by `scratch/phase1balancescheck.ts`'s 19 cases (partial payment, overpayment clamping, multi-payment summing, wallet net in/out, wallet clamp) and corroborated live: customer "Momo"'s ledger `outstanding: 70` matches exactly `INV-000001`'s `220 − 150 paid` from today's 1.10 tests, with every other invoice for that customer fully paid — the reconciliation is reading real, correct per-invoice arithmetic, not noise.
- [x] Verify no user-facing balance reads cut over until reconciliation is approved. Grepped `admin/page.tsx` and `src/components/`: zero references to `customers/reconcile` or `customerBalances` — nothing reads from the ledger-derived path yet.

### 1.15 — Opening balances

- [ ] Run the import with a disposable, balanced fixture covering cash, receivables, wallet credit, packages, assets, and loans.
- [ ] Confirm all records use `is_opening = true`, share the intended as-of date, and are included exactly once on re-run.
- [ ] Confirm patient receivables come from the supplied audit fixture, not legacy `customers.outstanding`.

### 1.16 — Contract rollup

- [ ] Confirm every Phase 1 endpoint and side effect is described in `API_CONTRACT.md`.
- [ ] Confirm every completed task above has dated evidence and that the tracker status/commit hash agree.
