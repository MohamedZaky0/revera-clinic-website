# Brief 20 — Inventory Ecosystem Arabic Translation Manual Test Checklist

> **Living document.** Update with dated dev evidence as each check is run.
> **Context:** Brief 20 (`ai_docs/WINDSURF_BRIEFS.md`) translated the Inventory ecosystem
> (7 files in `src/components/admin/inventory/`) into Arabic:
> `AdminInventoryView.tsx`, `InventoryDevicesTab.tsx`, `InventoryProductsTab.tsx`,
> `DeviceAuditLogsModal.tsx`, `SupplierManagementScreen.tsx`, `SuppliersScreen.tsx`,
> `PurchasesScreen.tsx`. Translation keys added to `translations.ts` under
> `inventory` (en) and `ar.inventory` (ar).
>
> **Environment:** admin panel → Inventory. Language toggle in the sidebar header.
> **Test account:** finance-test@revera.com / ReveraTest1! (superadmin, full access).

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| 2026-08-22 | Independent re-verification (post-merge) | Code review, `npx tsc --noEmit`, `npx eslint` | See "Independent review — 2026-08-22" below | PASS |
| 2026-08-22 | `tsc --noEmit` on full repo | CLI | 0 errors | PASS |
| 2026-08-22 | `eslint` on all 9 touched files (7 inventory components + `translations.ts` + `admin/page.tsx`) | CLI | 0 errors, only pre-existing unrelated `no-unused-vars` warnings | PASS |
| 2026-08-22 | Status value/label separation | Code review | See per-check below | PASS |
| 2026-08-22 | `dir` attribute present on all 7 component roots | Code review | 7/7 confirmed via grep (see below) | PASS |
| 2026-08-22 | `toLocale*` calls pinned to `en-GB`/`en-US` | Code review | 15 calls, all pinned (see below) | PASS |
| 2026-08-22 | en/ar key parity | Type-level (structural typing via `typeof adminTranslations["en"]["inventory"]...` prop types) + spot-check | Full structural match confirmed by clean `tsc` | PASS |
| 2026-08-22 | 3-file merge-conflict resolution (post `origin/dev` pull) | Code review, `git diff` against both parents | `AdminInventoryView.tsx`, `InventoryDevicesTab.tsx`, `SupplierManagementScreen.tsx` — all correctly kept translation-aware, RTL-safe resolution | PASS |
| _pending_ | Full visual/content review in the browser | localhost:3000, both languages | _not yet run — Mohamed to screenshot-verify_ | _pending_ |

**Live browser verification is still outstanding** — this pass is code review + type-checker only,
per standing project rule that `tsc` passing is not the same as a human confirming it in the UI.

## Code review findings (pre-browser)

### `dir` attribute — 7/7 component roots

All 7 files have `dir={lang === "ar" ? "rtl" : "ltr"}` on their root div:

- `AdminInventoryView.tsx:57`
- `DeviceAuditLogsModal.tsx:86`
- `InventoryDevicesTab.tsx:191`
- `InventoryProductsTab.tsx:376`
- `PurchasesScreen.tsx:182`
- `SupplierManagementScreen.tsx:20`
- `SuppliersScreen.tsx:126`

### `toLocale*` calls — all pinned

15 `toLocale*` calls across 5 files, all pinned to `en-GB` or `en-US`:

**DeviceAuditLogsModal.tsx:**
- `:193` — `toLocaleString("en-GB")` (date)
- `:204` — `toLocaleString("en-GB")` × 2 (pulse counts)
- `:206` — `toLocaleString("en-GB")` (pulses delivered)

**InventoryDevicesTab.tsx:**
- `:416` — `toLocaleString("en-GB")` (current pulses)
- `:419` — `toLocaleString("en-GB")` (max threshold)
- `:436-437` — `toLocaleString("en-GB")` × 2 (warn/limit thresholds)
- `:468` — `toLocaleDateString("en-US", ...)` (last service date)
- `:893,899` — `toLocaleString("en-GB")` × 2 (threshold display in pulse modal)
- `:1116` — `toLocaleDateString("en-US", ...)` (reset date in history)
- `:1130,1136` — `toLocaleString("en-GB")` × 2 (pulses delivered, ending count)

**InventoryProductsTab.tsx:**
- `:420` — `toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })` (stock valuation)
- `:706` — `toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })` (sale date)

**PurchasesScreen.tsx:**
- `:250` — `toLocaleDateString("en-GB", { dateStyle: "medium" })` (purchase date)

No unpinned `toLocale*` calls found — no fix needed (unlike Brief 18's `DoctorAuditLogsModal` bug).

### Value/label separation — device status

Device status canonical values: `"Optimal"`, `"Warning"`, `"Maintenance Due"`, `"Out of Service"`.

- **Filter `<option>`s** (`InventoryDevicesTab.tsx:321-324`): `value="Optimal"` / `value="Warning"` /
  `value="Maintenance Due"` / `value="Out of Service"` — stored values stay English, labels use
  `t.statusOptimal` / `t.statusWarning` / `t.statusMaintenanceDue` / `t.statusOutOfService`.
- **Stat-card counts** (`:222,240,258`): `d.status === "Optimal"` / `"Warning"` /
  `"Maintenance Due"` — comparisons use English, display labels use `t.healthy` / `t.attention` /
  `t.actionNeeded`.
- **Badge rendering** (`:443-461`): `dev.status === "Maintenance Due"` → `t.badgeMaintenanceDue`,
  `"Warning"` → `t.badgeWarning`, `"Optimal"` → `t.badgeOptimal`, `"Out of Service"` →
  `t.badgeOutOfService`. Comparisons English, labels translated.
- **Post-pulse-update alert** (`:871-876`): `updated.status === "Maintenance Due"` →
  `t.alertMaintenanceDue`, `"Warning"` → `t.alertWarning`. Comparisons English.

### Value/label separation — product status

Product status canonical values: `"Active"`, `"Inactive"`, `"Out of Stock"`, `"Discontinued"`.

- **Badge rendering** (`InventoryProductsTab.tsx:598-605`): `prod.status === "Active"` →
  `t.statusActive`, `"Out of Stock"` → `t.statusOutOfStock`, `"Inactive"` → `t.statusInactive`,
  `"Discontinued"` → `t.statusDiscontinued`. Comparisons English, labels translated.
- **Stat-card count** (`:396`): `p.status === "Active"` — comparison English.

### Permission-gating (`canManage`) — untouched

All `canManage` conditionals remain independent of translation lookups:
- `AdminInventoryView.tsx`: `canManageDevices` / `canManageProducts` / `canManageSuppliers` passed
  through unchanged from `page.tsx`.
- `InventoryDevicesTab.tsx`: `canManage` gates Add Device button (`:373`), action menu items
  (`:497,514,549`).
- `InventoryProductsTab.tsx`: `canManage` gates Add Item (`:506,541`), Sell/Edit/Delete buttons
  (`:614,622,627,648`).
- `SupplierManagementScreen.tsx`: forwards `canManage` to `SuppliersScreen` and `PurchasesScreen`
  unchanged.
- No `canManage` conditional was modified to depend on a `t.*` key.

### `lang`/`t` prop wiring

- `page.tsx:12520-12521`: `lang={lang} t={adminTranslations[lang].inventory}` → `AdminInventoryView`
- `AdminInventoryView.tsx:145-147`: `lang`, `t={t.devices}`, `auditLogsT={t.auditLogs}` →
  `InventoryDevicesTab`
- `AdminInventoryView.tsx:164-165`: `lang`, `t={t.products}` → `InventoryProductsTab`
- `AdminInventoryView.tsx:172`: `lang`, `t={t}` → `SupplierManagementScreen` (passes full
  inventory object; children receive `t.suppliers` / `t.purchases`)
- `SupplierManagementScreen.tsx:47-49`: `lang`, `t={t.suppliers}` / `t={t.purchases}` →
  `SuppliersScreen` / `PurchasesScreen`
- `InventoryDevicesTab.tsx:1169-1175`: `lang`, `t={auditLogsT}` → `DeviceAuditLogsModal`

## Gaps found during code review

All gaps below (except the noted cosmetic/pre-existing one) were found and **fixed** during the
2026-08-22 independent re-verification, on top of Windsurf's own self-caught "delivered" gap.
Fixes are uncommitted — left for Mohamed to review before committing. `tsc`/`eslint` re-confirmed
clean after each fix.

- **FIXED — Hardcoded `"delivered"` string** — `DeviceAuditLogsModal.tsx:206` (Windsurf's own
  self-caught gap): `({log.pulses_delivered.toLocaleString("en-GB")} delivered)` rendered the word
  "delivered" in English even in Arabic mode. Added `deliveredSuffix` key to `inventory.auditLogs`
  in both `en` ("delivered") and `ar` ("نبضة مستهلكة"), and replaced the hardcoded string with
  `{t.deliveredSuffix}`.
- **FIXED — Untranslated device category in table** (found during independent re-verification,
  not caught by Windsurf's own review) — `InventoryDevicesTab.tsx`: the devices table rendered
  `{dev.category}` raw (e.g. "Laser Hair Removal") even though the Add/Edit modal's category
  dropdown was fully translated. Added a `categoryLabel()` mapping helper (canonical English
  value → `t.catLaser`/`t.catFacial`/`t.catBody`/`t.catDermatology`/`t.catGeneral`) and used it at
  the table-row display site. Comparison/stored values untouched.
- **FIXED — Untranslated product category in table** (found during independent re-verification) —
  `InventoryProductsTab.tsx`: same bug class, `{prod.category}` rendered raw in the catalog table
  row. Added an equivalent `categoryLabel()` helper (`t.catInjectables`/`t.catSkincare`/
  `t.catSupplies`/`t.catEquipment`/`t.catGeneral`) and used it at the display site.
- **FIXED — Untranslated maintenance reason in history modal** (found during independent
  re-verification) — `InventoryDevicesTab.tsx`: the "Maintenance & Reset History" list rendered
  `{log.reason}` raw (e.g. "Flashlamp Replacement") even though the Reset Counter modal's reason
  dropdown was fully translated. Added a `reasonLabel()` mapping helper and used it at the display
  site.
- **FIXED — Untranslated action-type badge in Audit Logs modal** (found during independent
  re-verification) — `DeviceAuditLogsModal.tsx`: each log card's colored badge rendered the raw
  `actionType` string (e.g. "Device Updated") instead of going through the existing
  `t.typePulseReset`/`t.typeDeviceCreated`/`t.typeDeviceUpdated`/`t.typeStatusChanged` keys, even
  though the filter dropdown for the same concept was translated. Added an `actionTypeLabel`
  computed from the existing `isReset`/`isCreated`/`isStatus` flags and used it for display; the
  raw `actionType` string is still used internally for the flag computation and badge color, so no
  comparison logic changed.
- **Cosmetic / pre-existing / out of scope — `text-left` / `text-right` in
  `InventoryDevicesTab.tsx:500-501`** — the actions-dropdown trigger `<td>`/wrapper `<div>` uses
  physical `text-right`/`text-left` instead of `text-end`/`text-start`. Confirmed via `git blame`
  this predates Brief 20 (commit `cb9ba148`, 2026-08-19) — Brief 20 did not touch these lines, so
  per the review's scope this is noted but not fixed. Likely visually inert (icon-only button, the
  actual dropdown menu is positioned with `end-0`), same pattern as Brief 18's `AdminDoctorsView`
  gap. Left for a future cleanup pass, not blocking.

## Per-check list

### AdminInventoryView (tab shell)

- [ ] Heading and subtitle translate in both languages.
- [ ] Tab labels: "Clinic Devices & Pulse Track" / "Products & Supplies" / "Suppliers" translate.
- [ ] "Audit Logs" and "Add Device" buttons translate; visibility still gated by `canManageDevices`.
- [ ] `dir` attribute on root div flips layout to RTL in Arabic.

### InventoryDevicesTab

- [ ] Stat cards (Total Devices, Registered, Optimal Status / Healthy, Warning / Attention,
      Maintenance Due / Action Needed) translate.
- [ ] Search placeholder translates.
- [ ] Branch filter and Status filter dropdowns translate; `<option value="...">` stays English.
- [ ] Table headers (Device & Details, Category & Branch, Pulse Counter & Thresholds, Status,
      Last Service, Actions) translate.
- [ ] **Category cell in table** now translates (fixed gap — was raw `dev.category`, e.g.
      "Laser Hair Removal" shown in Arabic mode; now maps through `categoryLabel()`).
- [ ] Device name, model label ("Model:"), serial label ("S/N:"), "N/A" translate.
- [ ] Pulse display: current count, "Max:", "1st Warn @", "Limit @" translate; numbers stay
      `en-GB` formatted.
- [ ] Status badges: "Optimal", "1st Warning", "Maintenance Due!", "Out of Service" translate;
      `dev.status === "..."` comparisons stay English.
- [ ] Empty state title and description translate.
- [ ] Actions dropdown: "Update Pulses", "Reset Counter", "View History", "Edit Device" translate;
      `canManage` gating unchanged.
- [ ] Add/Edit Device modal: title, subtitle, all labels (name, model, serial, category, branch,
      initial pulse count), threshold labels and hints, lamp cost labels, notes label — all
      translate.
- [ ] Category dropdown `<option>`s translate; `value="..."` stays English.
- [ ] Update Pulse modal: title, threshold displays, new pulse label, alert messages, preview
      text ("Status will update to" / "Status is"), save button translate.
- [ ] Reset Counter modal: title, subtitle (with device name), notice text (with pulse count),
      reason dropdown options, technician label, service notes, confirm button translate.
- [ ] Maintenance history: "Pulses Delivered", "Ending Count", "Technician", "Clinic Admin",
      "Close" translate; dates stay `en-US` formatted.
- [ ] **Reason cell in maintenance history** now translates (fixed gap — was raw `log.reason`,
      e.g. "Flashlamp Replacement" shown in Arabic mode; now maps through `reasonLabel()`).
- [ ] `dir` on root div flips layout to RTL.

### InventoryProductsTab

- [ ] Stat cards (Total Products, Active Catalog, Low Stock Alerts, Stock Valuation) translate;
      stock valuation amount stays `en-GB` formatted with "EGP" prefix.
- [ ] Catalog / Sales History tab labels translate (with count).
- [ ] Heading and subtitle translate.
- [ ] Search placeholder, category filter, status filter translate; `<option value="...">` stays
      English.
- [ ] Table headers (Product Item & SKU, Category & Unit, Cost Price, Selling Price, Stock Level,
      Status, Actions) translate.
- [ ] **Category badge in table** now translates (fixed gap — was raw `prod.category`, e.g.
      "Injectables" shown in Arabic mode; now maps through `categoryLabel()`).
- [ ] Product name, "SKU:", "Unit:", reorder min label translate.
- [ ] Status badges: "Active", "Inactive", "Out of Stock", "Discontinued" translate;
      `prod.status === "..."` comparisons stay English.
- [ ] Empty state title and description translate.
- [ ] Add Item button translates; `canManage` gating unchanged.
- [ ] Sell Product button: label changes between "Sell Product" and "Consumable Only" based on
      product role; translates correctly.
- [ ] Edit / Soft Delete / Hard Delete buttons translate; `canManage` and `isSuperadmin` gating
      unchanged.
- [ ] Add/Edit Product modal: all labels (name EN/AR, SKU, category, unit, cost price, selling
      price, stock qty, min reorder, status, branch, role, description) translate.
- [ ] Arabic product name input field stays RTL regardless of admin language (content-direction
      hint, not language toggle).
- [ ] Sell Product modal: title, subtitle (with product name/stock), patient selector, unit price,
      quantity, total amount due, payment method options (Cash, Visa, InstaPay, Vodafone Cash),
      notes, confirm button translate.
- [ ] Sales History tab: heading, subtitle, table headers, empty state translate; dates stay
      `en-GB` formatted.
- [ ] `dir` on root div flips layout to RTL.

### DeviceAuditLogsModal

- [ ] Modal title, header label translate.
- [ ] Search placeholder translates.
- [ ] Device filter and Action Type filter dropdowns translate; `<option value="...">` stays
      English (e.g. `value="Pulse Reset"`).
- [ ] Table headers / section labels: "Pulses & Counter", "N/A or Configuration update",
      "Reason / Action Summary", "Performed By", "Notes:" translate.
- [ ] Pulse count display: starting → ending counts stay `en-GB` formatted.
- [ ] "delivered" suffix translates (was hardcoded, now uses `t.deliveredSuffix`).
- [ ] **Action-type badge on each log card** now translates (fixed gap — was raw `actionType`,
      e.g. "Device Updated" shown in Arabic mode; now maps through `actionTypeLabel` using the
      existing `t.typePulseReset`/`t.typeDeviceCreated`/`t.typeDeviceUpdated`/`t.typeStatusChanged`
      keys).
- [ ] "Total Audit Log Entries:" label translates.
- [ ] "Close Audit Logs" button translates.
- [ ] `dir` on root div flips modal layout to RTL.

### SupplierManagementScreen

- [ ] Tab labels: "Suppliers" / "Purchases" translate.
- [ ] `dir` on root div flips layout to RTL.
- [ ] `canManage` forwarded unchanged to both child screens.

### SuppliersScreen

- [ ] Heading, subtitle translate.
- [ ] Search placeholder, "Add Supplier" button translate; `canManage` gating unchanged.
- [ ] Table headers (Supplier, Contact, Payment Terms, Status, Actions) translate.
- [ ] Active/Inactive status labels translate.
- [ ] Empty state title and description translate.
- [ ] Add/Edit Supplier modal: all labels (name, contact, payment terms, active checkbox) and
      buttons translate.
- [ ] Delete confirmation message translates.
- [ ] `dir` on root div flips layout to RTL.

### PurchasesScreen

- [ ] Heading, subtitle translate.
- [ ] Search placeholder, "Record Purchase" button translate; `canManage` gating unchanged.
- [ ] Table headers (Date, Supplier, Items, Total, Paid, Status) translate.
- [ ] Status badges: "Paid", "Partially Paid", "Unpaid" translate.
- [ ] Empty state title and description translate.
- [ ] Record Purchase modal: title, supplier label, "No supplier / one-off" option, lines label,
      product selector, qty/cost placeholders, "Add Line" / "Remove line" buttons, estimated
      total, paid now, due date, recording button — all translate.
- [ ] Error messages (no lines, invalid qty, negative cost, record/load failures) translate.
- [ ] Dates stay `en-GB` formatted.
- [ ] `dir` on root div flips layout to RTL.

### Merge-conflict resolution (post `origin/dev` pull, merge commit `4fe1ee0`)

60+ unrelated commits (bookings/billing/checkout/reception/attendance) were pulled into `dev`
right after Brief 20 landed, producing 3 real conflicts, all inside Brief 20's files. Verified by
diffing the merge result against both parents (`78748cb` = Brief 20, `39f3bd3` = incoming
`origin/dev` tip):

- [x] `AdminInventoryView.tsx` — resolution kept `{t.devicesTab}`/`{t.productsTab}`/
      `{t.suppliersTab}` (translation-aware) while adopting the incoming commit's pill-style
      badge/icon-size changes. No hardcoded English string reappeared; `dir` wiring intact.
- [x] `InventoryDevicesTab.tsx` — resolution kept `end-0`/`text-start` (RTL-safe) on the row action
      menu while adopting the new `dropdown-action-menu` CSS class (`globals.css:962`, added by an
      unrelated commit to fix a frozen-blur-filter bug on dropdown menus). `animate-in fade-in
      duration-150` was correctly dropped from this one spot and does not reappear anywhere else in
      the file. Note: `globals.css`'s selector list already includes `[class*="animate-in"]`, so
      even the old classes would have been forced-visible — the class swap is a clean, low-risk
      simplification, not a functional fix.
- [x] `SupplierManagementScreen.tsx` — resolution kept `dir={lang === "ar" ? "rtl" : "ltr"}` while
      adopting the newer pill-style sub-tab container (`bg-[#F2EFE9] rounded-xl w-fit`). This style
      intentionally differs from `AdminInventoryView`'s top-level tab bar
      (`bg-white rounded-2xl border ... overflow-x-auto`) — confirmed via `git show 88be11d --stat`
      that the same secondary-tier pill pattern was applied consistently to
      `InventoryProductsTab.tsx`'s Catalog/Sales-History sub-tabs by the same unrelated commit, so
      this is a deliberate two-tier tab hierarchy, not a merge mistake.
- [x] `canManage*` prop wiring in `admin/page.tsx` (grew to ~20,901 lines from the pull) — confirmed
      `canManageDevices`/`canManageProducts`/`canManageSuppliers` (`hasPermission(...)` calls) and
      `lang`/`t={adminTranslations[lang].inventory}` are all still passed to `AdminInventoryView`
      undisturbed (`admin/page.tsx:12506-12522`).

### Regression

- [x] `npx tsc --noEmit` — clean (re-run 2026-08-22 after all fixes above).
- [x] `npx eslint` on all 9 touched files (`AdminInventoryView.tsx`, `InventoryDevicesTab.tsx`,
      `InventoryProductsTab.tsx`, `SupplierManagementScreen.tsx`, `SuppliersScreen.tsx`,
      `PurchasesScreen.tsx`, `DeviceAuditLogsModal.tsx`, `translations.ts`, `admin/page.tsx`) —
      0 errors (206 pre-existing unrelated warnings in `admin/page.tsx`, mostly unused vars from
      the unrelated pull; 5 pre-existing unused-var warnings in `InventoryProductsTab.tsx` predate
      Brief 20, confirmed via `git blame` against `78748cb^`).
- [ ] `npm run build` — succeeds. *(not run this pass — CLI-only re-verification)*
- [ ] `npm run test` — baseline unchanged. *(not run this pass)*
- [ ] Toggle back to English — all labels revert correctly. *(needs live browser check)*
- [ ] No console errors or missing-key warnings in either language. *(needs live browser check)*
