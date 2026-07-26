# Phase 2 Manual Test Checklist — Cost of Delivery

> **Living document.** Update this checklist in the same commit as each 2.x task. Execute schema checks against linked dev, then record an evidence row before a task becomes `DONE`.

## Evidence log

| Date | Task | Environment | Evidence | Result |
|---|---|---|---|---|
| 2026-07-26 | 2.1–2.8, 2.15 | dev | Migrations `20260726010800`–`20260726011600` applied; linked migration list matches and shadow `db diff` found no schema changes | PASS |
| 2026-07-26 | 2.9–2.10 | local | `npx.cmd tsx scratch/phase2costingcheck.ts` passed all material, pulse, and commission cases | PASS |
| 2026-07-26 | 2.1 | dev | New `inventory_products` row with no `role` specified → defaulted to `retail`; `UPDATE ... SET role = 'bogus'` → rejected by `inventory_products_role_check` | PASS |
| 2026-07-26 | 2.2 | dev | Recipe created for a disposable service/product pair; duplicate `(service_id, product_id)` insert rejected by `service_consumables_service_id_product_id_key`; deleting the service cascaded to 0 remaining recipe rows | PASS |
| 2026-07-26 | 2.3 | dev | `consumption_entries.unit_cost_snapshot` recorded as `100` (the product's `cost_price` at that moment); `cost_price` then changed live to `999`; re-read snapshot still `100` — confirms it is a true snapshot, not a live join | PASS |
| 2026-07-26 | 2.4 | dev | `qty: 0` and `qty: -5` both rejected by `stock_movements_qty_check`; `direction: 'sideways'` rejected by `stock_movements_direction_check`; a valid `direction: 'in'` row inserted successfully | PASS |
| 2026-07-26 | 2.5 | dev | Supplier created; a `purchases` row referencing it created; supplier deleted; `purchases.supplier_id` correctly became `null` (`ON DELETE SET NULL`), not blocked and not orphaned | PASS |
| 2026-07-26 | 2.6 | dev | Purchase with 2 lines (`5×300`, `2×100`) — line total hand-check `1700` matched; `due_date` round-tripped correctly; an invalid `product_id` on a line rejected by `purchase_lines_product_id_fkey` | PASS |
| 2026-07-26 | 2.7 | dev | Set `lamp_replacement_cost: 5000` on a real device with `max_pulses_limit: 100000`; read back correctly; `costPerPulse(5000, 100000) = 0.05`, matching `src/lib/costing.ts`'s formula | PASS |
| 2026-07-26 | 2.8 | dev | `commission_type: 'bogus_type'` rejected by `providers_commission_type_check`; `commission_base: 'bogus_base'` rejected by `providers_commission_base_check`; a valid `commission_type: 'both'`, `commission_base: 'net_of_materials'` row inserted successfully | PASS |

## Per-task checklist

- [x] **2.1 Product role:** Verify existing products default to `retail`; reject any role outside `retail`, `consumable`, or `both`.
- [x] **2.2 Service consumables:** Create a service recipe; confirm duplicate service/product rows fail and deleting a service cleans up its recipe.
- [x] **2.3 Consumption entries:** Record standard and edited consumption; verify snapshots do not change when current product cost changes.
- [x] **2.4 Stock movements:** Insert `in` and `out` movements for each allowed reason; reject zero/negative quantities and invalid directions.
- [x] **2.5 Suppliers:** Create/edit/delete a supplier; verify purchase references retain their intended integrity behavior.
- [x] **2.6 Purchases and lines:** Record a supplier purchase with multiple lines; verify totals, due-date handling, and product references.
- [x] **2.7 Device lamp cost:** Set a replacement cost and validate the existing pulse-limit denominator is correct for a real device.
- [x] **2.8 Provider commission configuration:** Validate commission type/base constraints and reject invalid contract combinations.
- [x] **2.9 Costing library:** `scratch/phase2costingcheck.ts` covers material, pulse, fixed, percentage, both, none, and invalid-input scenarios.
- [x] **2.10 Regression suite:** Passing output recorded in the evidence log.
- [ ] **2.11 Checkout costing:** Complete a booking with a recipe and commission; verify consumption entries, stock movements, COGS snapshot, commission snapshot, and no duplicate legacy stock deduction.
- [ ] **2.12 Stock cutover:** Reconcile every tested product's legacy stock with stock-movement sum before switching reads; verify sales, consumption, purchase, adjustment, and shrinkage all affect the derived value.
- [ ] **2.13 Purchase endpoint:** POST a purchase; confirm `purchases`/`purchase_lines` and one inbound `stock_movements` row per line, with `total` matching a hand calculation of `Σ qty × unitCost`. **Note:** as implemented, this endpoint does not touch `inventory_products.cost_price` or compute a weighted-average cost — per `FINANCE_TRACKER.md` task 2.13, that is explicitly out of scope here (`stock_movements` only) and deferred to task 2.12's stock-quantity cutover, which itself doesn't cover `cost_price` either. If a weighted-average `cost_price` update is wanted before then, that's new scope to add to 2.13, not something to expect from the current code.
- [ ] **2.14 Payroll provider link:** Rename a provider after completed sessions; verify payroll still attributes historic commission by `provider_id`.
- [ ] **2.15 Device pulse costing:** Complete a device-backed service; confirm correct pulse deduction and cost snapshot, including a no-device service costing zero.
- [ ] **2.16 Contract rollup:** Confirm every new route/side effect is documented and each completed row has evidence.
