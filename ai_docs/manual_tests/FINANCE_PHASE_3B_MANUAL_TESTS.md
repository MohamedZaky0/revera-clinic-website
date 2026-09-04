# Phase 3B Manual Test Checklist — Configuration & Data-Entry UI

> **Living document.** Update this file with dated dev evidence in the same commit as every 3B.x task.

> **This phase is UI-heavy, so `tsc`/`eslint`/scratch-script evidence is necessary but never
> sufficient.** Every task here must be exercised **in a browser against the dev database** before
> its row is ticked — the whole point of the phase is that a human operator can do something they
> could not do before, and only a browser check proves that. Record the role logged in as, since
> several of these surfaces are permission-gated.

## Evidence log

| Date | Task | Environment | Evidence | Result |
|---|---|---|---|---|
| 2026-07-27 | (audit) | local working tree | Pre-phase gap audit that produced this phase: grepped `admin/page.tsx` (27,606 lines) and every relevant API route for the Phase 0–3 config columns. Confirmed 0 UI references to `duration_minutes`/`role`/`lamp_replacement_cost`/`max_pulses_limit`/`commission_base`/`commission_fixed_component`/`service_consumables`/`service_devices`/`pulses_per_session`; confirmed `/api/services` ignores `duration_minutes` on both read and write; confirmed `role` absent from the products route; confirmed `lamp_replacement_cost` absent from the devices mapper; confirmed no `/api/suppliers` and no `/api/packages` CRUD route; confirmed 6 unreachable mock screens (only 1 of which RISK-017 catalogues); confirmed `cost_price` is **already** fully wired as `purchase_price` and is not a gap. Full table in `FINANCE_TRACKER.md` → Phase 3B | N/A — audit only |

## Per-task checklist

- [ ] **3B.0 DECISIONS.md repair:** `grep -c '^<<<<<<<\|^=======$\|^>>>>>>>' ai_docs/DECISIONS.md` returns 0 for the whole file; DEC-027 reads as one coherent entry; no remaining duplicate DEC numbers beyond the documented DEC-014/DEC-032 relationship.
- [ ] **3B.1 Module scaffold:** `src/components/admin/` exists and renders inside the admin shell; diff review confirms **no new section-level `useState` was added to `admin/page.tsx`** (a growing state count there means this task failed its own purpose).
- [ ] **3B.2 Service duration:** Set a service to 45 minutes in the UI; re-query and confirm `duration_minutes = 45` (not 30, not NULL); confirm `getServiceDurationMinutes()` returns 45; confirm 0 and 2000 are rejected with a readable message, not a raw Postgres CHECK error.
- [ ] **3B.3 Product role:** Set a product to `consumable`; confirm it persists; confirm it then appears in 3B.5's recipe picker and that a `retail`-only product does not.
- [ ] **3B.4 Device lamp cost:** Set lamp cost and rated pulses; confirm both persist to the **`inventory_devices` table**, not only the `page_settings` blob (check the table directly — this route writes both); confirm a device-recipe booking produces a non-zero cost snapshot matching `costPerPulse × pulses_per_session`.
- [ ] **3B.5 Consumables recipe:** Define a 2-product recipe; complete a booking for that service; confirm `invoice_lines.cogs_snapshot` equals the hand-computed `Σ (standard_qty × cost snapshot)` and is no longer `NULL`; confirm the product picker is filtered to `role IN ('consumable','both')`.
- [ ] **3B.6 Service device/pulses:** Attach a device at a known pulses-per-session; complete a booking; confirm the device cost snapshot equals `costPerPulse × pulses_per_session` exactly.
- [ ] **3B.7 Doctor commission:** Configure a doctor as `both` with a fixed component and an explicit base; complete a booking; confirm `invoice_lines.commission_snapshot` matches the hand-computed figure and `GET /api/hr/doctor-payroll` reflects it. **Confirm both duplicate form copies were updated** (or that a single shared component now backs both) — verify by editing commission from each entry point in the UI, not by reading the diff.
- [ ] **3B.8 Packages:** Define a package with 2 services; sell it via `POST /api/packages/sell`; confirm `customer_packages`/`customer_package_items` match the definition exactly; confirm `validity_days` sets the expiry and `on_expiry` behaves per DEC-025.
- [ ] **3B.9 Suppliers:** Create a supplier; confirm `POST /api/purchases` accepts it as `supplierId`; confirm a bogus id still returns the 404 `'Supplier not found.'`; confirm no pre-formatted currency strings were reintroduced from the mock's shape.
- [ ] **3B.10 Purchases:** Record a purchase of 10 units; confirm exactly one inbound `stock_movements` row per line; confirm `GET /api/inventory/products/reconcile` shows the derived quantity up by exactly 10; confirm the client does **not** send a computed `total`.
- [ ] **3B.11 Mock cleanup:** `tsc`/`eslint` clean; grep returns zero references to `MOCK_SUPPLIERS`, `MOCK_PURCHASES`, `MOCK_BATCHES` (note `MOCK_PURCHASES` had a second reference outside its own block — confirm both are gone); the real 3B.9/3B.10 screens still render.
- [ ] **3B.12 Contract rollup:** Every new endpoint documented, **and** every route whose response mapper changed (`/api/services`, `/api/inventory/products`, `/api/inventory/devices`) has its documented shape updated — the half a rollup usually misses, since the endpoint list looks unchanged.
