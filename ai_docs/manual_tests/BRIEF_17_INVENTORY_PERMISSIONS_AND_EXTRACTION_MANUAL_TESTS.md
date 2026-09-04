# Brief 17 — Inventory Permission Enforcement + Extraction Manual Test Checklist

> **Living document.** Update with dated dev evidence as each check is run.
> **Context:** Brief 17 (`ai_docs/WINDSURF_BRIEFS.md`) had two parts: Part 1 wired the 4
> pre-existing `PERMISSION_STRUCTURE` keys (`inventory.view`/`.manage_devices`/`.manage_products`/
> `.manage_suppliers`) into real `hasPermission` checks across the whole Inventory screen (which had
> zero before); Part 2 extracted the ~1,530-line screen into
> `src/components/admin/inventory/{AdminInventoryView,InventoryDevicesTab,InventoryProductsTab,
> DeviceAuditLogsModal}.tsx` plus wiring the pre-existing `SupplierManagementScreen.tsx` family into
> the same permission model.
>
> **Environment:** admin panel → Inventory. Language toggle in the sidebar header.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| 2026-08-20 | All 3 sub-tabs render with real data | localhost:3000, full-access account | Devices (2 real devices, pulse counters, thresholds), Products (2 real products, stock stats, filters), Suppliers (1 real supplier) all loaded correctly | Pass |
| 2026-08-20 | Add Device modal | Devices tab, full-access account | Opens with all fields (name, model, serial, category, branch, pulse count, thresholds, replacement cost, notes) | Pass |
| 2026-08-20 | Device Audit Logs modal | Devices tab, full-access account | Opens with 4 real audit entries (pulse-count changes, status changes, timestamps, "Performed By") | Pass |
| 2026-08-20 | `inventoryProducts` shared-state finding respected | Code review | `page.tsx` passes `products={inventoryProducts}` / `onRefreshProducts={fetchInventoryProducts}` into `AdminInventoryView` — confirmed not duplicated into a locally-owned copy | Pass |
| 2026-08-20 | Permission-gating pattern present in all 3 write surfaces | Code review | `canManage ? "inline-flex" : "hidden"` (or `canManage &&`) confirmed in `InventoryDevicesTab.tsx`, `InventoryProductsTab.tsx`, `SuppliersScreen.tsx`, `PurchasesScreen.tsx`; hard product-delete additionally requires `canManage && isSuperadmin` | Pass |
| | **View-only account sees read-only, no write buttons** | | Needs a second login with only `inventory.view` granted (no `.manage_*` keys) | **Pending — no restricted test account available this pass** |
| | Arabic mode (Brief 20, not yet done) | | Not in scope for Brief 17 | N/A |

## Per-check list

### Read baseline — all roles that can reach the screen

- [x] Devices tab: device list, pulse-counter stats cards, search, filter all load.
- [x] Products tab: product list, stock stats (Total/Active/Low Stock/Valuation), category/status
      filters, "Product Sales History" sub-tab all load.
- [x] Suppliers tab: Suppliers sub-tab and Purchases sub-tab both load.
- [x] Device Audit Logs modal opens from the Devices tab with real history.

### Write actions — full-access account, confirm nothing broke

- [x] "Add Device" button opens the Add Device modal with all fields.
- [ ] Actually save a new device and confirm it appears in the list (not just that the modal opens).
- [ ] "Add Item" (Products) opens correctly and a save actually persists.
- [ ] Edit an existing device / product and confirm the change saves.
- [ ] "Sell Product" flow (visible on the `k` product row) still works end-to-end.
- [ ] "Add Supplier" opens and saves correctly.
- [ ] Product soft-delete and (as superadmin) hard-delete both still work.

### Permission gating — the actual point of Part 1, needs a second account

- [ ] Log in as (or temporarily grant) a role with **only** `inventory.view`, no `.manage_devices`/
      `.manage_products`/`.manage_suppliers`. Confirm: all 3 tabs still show their lists, but every
      Add/Edit/Delete button is hidden (not just disabled) on all 3 tabs.
- [ ] Grant `inventory.manage_devices` only. Confirm devices' write buttons appear, products' and
      suppliers' stay hidden.
- [ ] Repeat for `inventory.manage_products` and `inventory.manage_suppliers` individually.
- [ ] Confirm nav-level access is unchanged: `admin`/`HR` roles still see the Inventory sidebar item
      automatically regardless of these granular keys (per `permittedSidebarItems`, not touched by
      this brief).

### Regression

- [x] `npx tsc --noEmit` — clean (verified 2026-08-20, 0 errors).
- [x] `npm run test` — 597 passed, 6 expected fail (verified 2026-08-20, matches baseline).
- [x] `npx eslint` on all touched files — 0 errors (205 pre-existing-pattern warnings, no new ones
      introduced; a handful of genuinely-unused vars in `InventoryProductsTab.tsx` traced back to
      pre-existing dead code — see note below, not a regression).

## Known, pre-existing, not introduced by this brief

- `InventoryProductsTab.tsx` has an orphaned `handleSearchPatientByPhone` function (plus
  `sellPatientPhone`/`searchPatientAttempted` state) with zero call sites — confirmed via
  `git log -S` that this was already dead code in the pre-extraction `page.tsx`, moved verbatim.
  Same shape as Brief 15's dead Attendance-tab finding. Not fixed here (extraction brief, no
  behaviour change); flagged for whoever eventually cleans up dead code in this area.
