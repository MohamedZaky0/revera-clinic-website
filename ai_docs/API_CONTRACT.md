# API_CONTRACT.md — Revera Clinics API Endpoints

> **Last Updated:** 2026-07-29
> **Base:** Next.js App Router API routes under `/app/api/`
> **Auth:** Server-side bearer-token validation is enabled on selected sensitive routes (including employee, role, payroll, reservation PATCH/DELETE, product-sales mutations, and every Phase 3 expenses/assets/loans route); coverage is not yet universal. All routes use the Supabase service role key server-side
> **Previous content was for a different project — discarded entirely**

---

## Conventions

- All routes return JSON.
- Errors return `{ "error": "message" }` with appropriate HTTP status.
- All routes are under `/api/` (relative to the app root).
- No versioning prefix.

---

## GET /api/health/supabase

Diagnostics: checks which Supabase env vars are present and previews their values.

**Response:** `{ supabaseUrl: {...}, serviceRoleKey: {...}, anonKey: {...} }`

---

## GET /api/branches

Returns all branches ordered by `sort_order`.

**Response:** `Branch[]`

---

## POST /api/branches

Create or update a branch. If body contains `id`, updates that branch. Otherwise creates new.

**Body:** Branch fields (name_en, name_ar, address_en, address_ar, phone, maps_embed, maps_link, status, sort_order, service_hours)

**Response:** Created or updated `Branch`

---

## DELETE /api/branches?id={id}

Deletes a branch by ID.

**Response:** `{ success: true }`

---

## GET /api/categories

Returns all categories ordered by `sort_order`.

**Response:** `CategoryRow[]` — `{ key, en, ar, sortOrder }`

---

## POST /api/categories

Upsert one or many categories.

**Body:** Single category object OR array of category objects (`{ key, en, ar, sortOrder }`)

**Response:** Upserted category/categories

---

## DELETE /api/categories?key={key}

Deletes a category by its key.

**Response:** `{ success: true, message: "Category deleted" }`

---

## GET /api/services

Returns all services ordered by `sort_order`.

**Response:** `ServiceRow[]` — `{ id, en, ar, img, cat, unit, price, sortOrder, duration, duration_minutes, descriptionEn, descriptionAr, isShared, enableReminder, branchPricing, visible, active, createdAt }`

`duration_minutes` (nullable, integer) — **Added 2026-07-25**, prefer this over the legacy free-text
`duration`; see `DB_SCHEMA.md`.

---

## POST /api/services

Upsert one or many services. `id` is only included on an existing service being re-saved — see
`services.id`'s note in `DB_SCHEMA.md` (RISK-033: this column's identity mode matters for upsert).

**Body:** Single service object OR array (all fields from ServiceRow)

**Response:** Upserted service(s)

---

## DELETE /api/services?id={id}

Deletes a service by numeric ID.

**Response:** `{ success: true, message: "Service deleted" }`

---

## GET /api/providers

Returns all providers ordered by name. Seeds defaults into Supabase if empty. Falls back to `data/providers.json` on DB error.

**Response:** `ProviderRow[]` — `{ id, name, bookings, services, more, rating }`

---

## POST /api/providers

Creates a new provider. Falls back to JSON file on DB error.

**Body:** `{ name, services?, rating?, more? }`

**Response:** Created provider, status 201

---

## PATCH /api/providers?id={id}

Updates a provider. Falls back to JSON file on DB error.

**Body:** `{ name?, services?, rating?, more? }`

**Response:** Updated provider

---

## DELETE /api/providers?id={id}

Deletes a provider. Falls back to JSON file on DB error.

**Response:** `{ success: true }`

---

## GET /api/page-settings

Returns the `value` JSONB of the `page_settings` row with `key='home'`. Seeds defaults if empty. Falls back to `data/page_settings.json` on DB error.

**Response:** Page settings object (hero slides, about content, etc.)

---

## POST /api/page-settings

Upserts the `page_settings` row (`key='home'`, `value=body`). Falls back to JSON file on DB error.

**Body:** Full page settings object

**Response:** `{ success: true }`

---

## GET /api/reservations

Returns reservations. Filterable by query params.

**Query params:**
- `status` — 'pending', 'approved', 'rejected', 'confirmed', 'started', 'completed', 'cancelled'
- `serviceId` — numeric service ID
- `date` — YYYY-MM-DD
- `branchId` — UUID
- `phone` — Patient phone filter (returns only matched bookings)
- `customerId` — UUID customer identifier filter

**Response:** `ReservationRow[]` — `{ id, serviceId, serviceIds, date, requestedTime, name, email, phone, notes, status, timeSlot, sessionType, createdAt, isManual, branchId, customerId, amountPaid, amountLeft, roomId, rooms, createdByEmployeeId, services, doctorName, providerId, followUpDate }`

---

## POST /api/reservations

Creates a new reservation. Status is `'pending'`, or `'pending_deposit'` when a deposit
percentage is configured and the booking isn't manual (`isManual` not set).

**Body:** `{ serviceId, date, requestedTime?, name, email, phone, notes?, sessionType?, branchId?, doctorName?, createdByEmployeeId?, isManual?, customerId? }`

Required: serviceId, date, name, email, phone.

`customerId`, if provided and it resolves to a real existing customer, links the reservation to
that customer directly — bypassing the phone-based lookup/creation below entirely (used by the
admin "Select Existing Patient" search picker). Otherwise the customer is looked up by phone
(normalized via `normalizeEgyptMobile()`, trims + `+20`/`20` prefix — RISK-032) or created if no
match.

**Closed-day guard (RISK-034):** rejected with `400` if `date` falls on a weekday the branch (or,
absent a branch, the default clinic hours) has marked closed — unless `isManual` is `true` (staff
manual bookings can override to schedule a deliberate one-off exception).

**Response:** Created reservation, status 201

---

## PATCH /api/reservations?id={id}

Updates a reservation. Supports three modes:

**Approve:** `{ action: "approve", timeSlot, doctorName?, date? }`
- `date` (optional) lets staff change the appointment date at approval time — not just the time
  slot — reusing the same field the `postpone` action already accepts. Defaults to the
  reservation's existing `date` if omitted. Added so a request landing on an unavailable/closed
  day (RISK-034) doesn't leave staff stuck with no valid slot to approve.
- Validates room availability for the (possibly new) date and time slot; assigns a compatible
  clinical room
- Sets status to 'approved', assigns `timeSlot`, `date`, `doctorName`/`providerId`, `roomId`

**Reject:** `{ action: "reject" }`
- Sets status to 'rejected'

**Cancel:** `{ action: "cancel" }`
- Requires a staff bearer token. Blocked once the booking is `completed`; idempotent (re-firing on an already-`cancelled`/`no_show` booking is a no-op).
- Refunds any deposit already paid (`amount_paid`) to `customers.wallet_balance`, then sets the reservation's `amount_paid`/`amount_left` to 0 and status to `'cancelled'` (RISK-029). Does nothing if `amount_paid` is 0 (e.g. no deposit was ever collected).

**No-show:** `{ action: "no_show" }`
- Same guards as Cancel. Forfeits any deposit already paid — adds it to `customers.spent_amount` instead of refunding it — sets `amount_left` to 0 (nothing further owed for an undelivered service), and status to `'no_show'`. `amount_paid` is left as-is (it was kept, not refunded).

**Postpone:** `{ action: "postpone", date?, timeSlot?, followUpDate? }`
- Requires a staff bearer token. Blocked if the booking is `completed`, `cancelled`, or `no_show`.
- If `date` is given: this is a real reschedule — updates `date` (and `time_slot` if `timeSlot` is also given), clears `follow_up_date`, and returns the booking to `'approved'` if it was `'postponed'`. No money moves.
- Else if `followUpDate` is given: sets status to `'postponed'` and stores `follow_up_date` as a reminder — the existing `date`/`time_slot` are left untouched but should be treated as stale until the booking is actually rescheduled via the path above.
- One of `date` or `followUpDate` is required.

**Generic update (includes checkout/wallet adjustments):** `{ status?, notes?, doctorName?, sessionType?, amountPaid?, amountLeft?, walletDeposit?, walletWithdrawal?, consumptionOverrides?, date? }`
- `date` (paired with `timeSlot`) reschedules the booking directly, independent of the `postpone` action above — this is the general-purpose "edit booking date/time" path.
- Requires a staff bearer token and updates any combination of those fields
- Transitioning to status `'completed'` triggers patient balance ledger calculations and an additive invoice, invoice-line, and payment write; the pre-existing reservation and customer balance updates remain unchanged
- A later `amountPaid` change on an already-`completed` reservation appends one more payment row to that reservation's existing invoice, rather than creating a duplicate invoice or duplicate service lines
- `consumptionOverrides` (optional, shaped as `{ [serviceId]: { [productId]: qty } }`, task 2.11): when the completed booking's services have configured `service_consumables`/`service_devices` recipes, the additive Phase 2 side effects create `consumption_entries`/`stock_movements` rows and snapshot material + device pulse COGS and provider commission onto the corresponding `invoice_lines`. A per-line costing failure (e.g. an unconfigured device rating) is logged and leaves only that line's `cogs_snapshot`/`commission_snapshot` `NULL` — it does not affect other lines on the same checkout or fail the checkout itself

**Public deposit self-report exception:** A booking in `pending_deposit` may be updated without a
staff token only with `{ status: "pending", amountPaid, amountLeft, notes? }`. This supports the
public booking payment-declaration flow; every other PATCH shape requires staff access.

**Response:** Updated reservation

---

## DELETE /api/reservations?id={id}

Deletes a reservation. Pass `id=all` to delete all reservations.

**Response:** `{ success: true, message: "..." }`

---

## GET /api/availability?serviceId={id}&branchId={id}&days={n}

Returns availability for the next `days` days (default 30) for a given service + branch.

For each date: counts approved bookings, calculates whether at least one contiguous block
of free 15-minute slots exists to fit the service's duration. Uses branch-specific service hours if available.

**Response:** Array of `{ date, approvedCount, approvedSlots, isAvailable }`

---

## GET /api/inventory/products

Requires a staff bearer token. Returns every product (dual-storage: native `inventory_products`
table if populated, else a `page_settings` JSON blob, seeded with defaults on first read).

**Response:** `{ products: ProductItem[] }` — `{ id, name, arabic_name?, category, branch_id?, sku?, unit, purchase_price, selling_price, stock_quantity, min_reorder_quantity, status, role, notes?, created_at, updated_at }`

`role` (`'retail' | 'consumable' | 'both'`, **added task 3B.3**, DEC-021) — whether this product is
sold to patients, consumed in services, or both; filters the recipe picker in
`POST /api/service-consumables` and is enforced at checkout by `applyCheckoutCosting`.

---

## POST /api/inventory/products

Requires a staff bearer token. Creates a product.

**Body:** `{ name, arabic_name?, category?, branch_id?, sku?, unit?, purchase_price, selling_price, stock_quantity?, min_reorder_quantity?, status?, role?, notes? }`

Required: `name`, `purchase_price`, `selling_price`. `role` must be one of `retail`/`consumable`/`both`
if provided (defaults `retail`). `status` auto-forces to `'Out of Stock'` if `stock_quantity` is 0.

**Response:** Created product, status 201

---

## PUT /api/inventory/products

Requires a staff bearer token. Updates a product — only fields present in the body change.

**Body:** `{ id, ...any ProductItem field }`

**Response:** Updated product

---

## DELETE /api/inventory/products?id={id}

Requires a staff bearer token.

**Response:** `{ success: true, id }`

---

## GET /api/inventory/products/sales

Requires a staff bearer token. Returns product-sale history.

**Response:** `{ success: true, sales: ProductSaleRecord[] }`

---

## POST /api/inventory/products/sales

Requires a staff bearer token. Records a retail product sale, deducts stock, and updates the existing customer spend scalar.

**Body:** `{ product_id, product_name?, product_sku?, customer_id, customer_name?, customer_mobile?, customer_email?, quantity, unit_price?, total_amount?, branch_name?, sold_by?, payment_method?, notes? }`

Required: `product_id`, `customer_id`, and positive `quantity`. **Updated 2026-07-26 (RISK-022 fix):**
`customer_id` must resolve to an existing `customers` row, checked **before** any stock or ledger
write — a non-existent `customer_id` now returns `404` rather than silently deducting stock and
losing the sale record (`product_sales.customer_id` has an FK; a bad id previously failed that
insert only, fell back to a `page_settings` blob, and still reported success).

**Updated 2026-07-27 (RISK-024 fix):** `quantity` is now also checked against the product's current
`inventory_products.stock_quantity` before any write — selling more than is in stock returns `409`
instead of recording the sale and letting `deductInventoryStock` silently clamp stock to 0.

After a successful native `product_sales` insert, the route additively attempts to create one issued product invoice, invoice line, and payment row. A ledger-write failure is logged and does not roll back or fail the established POS sale path.

**Response:** `{ success: true, sale: ProductSaleRecord, sales: ProductSaleRecord[] }` (`200`), or
`{ success: false, error }` (`404` for a non-existent customer, `409` for insufficient stock, `400` for missing/invalid required fields)

---

## GET /api/inventory/devices

Requires a staff bearer token. Returns every clinic device (dual-storage: native
`inventory_devices` table if populated, else a `page_settings` blob), with `status` recomputed
live from pulse counts vs. thresholds (`'Optimal' | 'Warning' | 'Maintenance Due'`, or
`'Out of Service'` if manually set).

**Response:** `{ devices: [...], history: [...] }` — each device:
`{ id, name, model, serial_number, category, branch_id, initial_pulse_count, current_pulse_count, total_lifetime_pulses, warning_threshold_1, maintenance_threshold_2, lamp_replacement_cost, warning_1_notified, warning_2_notified, last_maintenance_date, status, notes, created_at, updated_at }`

`lamp_replacement_cost` + `maintenance_threshold_2` (**added task 3B.4**) — read by
`applyCheckoutCosting` in `/api/reservations` to snapshot `lamp_replacement_cost /
max_pulses_limit × pulses_per_session` onto the invoice line's COGS. The real
`inventory_devices` table only stores `total_pulses`/`max_pulses_limit` (see `DB_SCHEMA.md`) —
`normalizeDeviceRow()` in this route maps those to the blob-shape field names
(`current_pulse_count`/`maintenance_threshold_2`) every other reader of this route expects.

---

## POST /api/inventory/devices

Requires a staff bearer token. Registers a device; writes a `'Device Created'` audit log entry.

**Body:** `{ name, model?, serial_number?, category?, branch_id?, initial_pulse_count?, warning_threshold_1?, maintenance_threshold_2?, lamp_replacement_cost?, notes? }`

Required: `name`. `lamp_replacement_cost` must be a non-negative number if provided.

**Response:** Created device, status 201

---

## PUT /api/inventory/devices

Requires a staff bearer token. Updates a device — only fields present in the body change.

**Body:** `{ id, ...any device field }`

**Response:** Updated device

---

## GET /api/inventory/devices/audit-logs

Requires a staff bearer token. Returns the full maintenance/pulse-reset/creation audit trail for
**all** devices (no filtering by device — the caller filters client-side), newest first. Reads the
native `device_maintenance_history` table if populated, else a `page_settings` blob fallback.

**Response:** `DeviceAuditLog[]` — `{ id, device_id, device_name, type, action_type, performed_by, date, starting_pulse_count?, ending_pulse_count?, pulses_delivered?, pulses_added?, reason?, notes?, details?, created_at }`

---

## POST /api/inventory/devices/audit-logs

Requires a staff bearer token. Records one audit log entry (used internally by device creation,
pulse resets, and maintenance edits — not typically called directly from the UI).

**Body:** Any subset of `DeviceAuditLog` fields (all optional; `recordDeviceAuditLog()` fills
sensible defaults for missing ones).

**Response:** Created log entry, status 201

---

## GET /api/packages

Public — no auth check, same convention as `GET /api/services` (returns everything unfiltered;
active/`showOnWebsite` filtering for the public site happens client-side in `PackagesSection.tsx`).
Returns every package definition with its items.

**Response:** `[{ id, name, nameAr, branchId, price, taxRate, validityDays, onExpiry, extensionDays, active, showOnWebsite, items: [{ id, serviceId, serviceName, serviceNameAr, qty }] }]`

---

## POST /api/packages

Requires a staff bearer token. Creates a package definition.

**Body:** `{ name, nameAr?, branchId?, price, taxRate, validityDays, onExpiry, extensionDays, active, showOnWebsite, items: [{ serviceId, qty }] }`

Required: `name`, at least one item with a positive integer `qty`. `nameAr` (Added 2026-07-28,
`20260728010000_packages_public_display_fields.sql`) has no fallback — the public site shows the
English name in Arabic view if unset. `showOnWebsite` (same migration) is independent of `active`
— see `packages.show_on_website` in `DB_SCHEMA.md`.

**Response:** Created package object, status 201.

---

## PATCH /api/packages

Requires a staff bearer token. Updates a package definition. `id` required in the body; replaces
all items if an `items` array is present, otherwise leaves items unchanged.

**Response:** Updated package object.

---

## DELETE /api/packages?id={id}

Requires a staff bearer token. Refuses (`409`) if any `customer_packages` row already references
this package — mark it inactive instead.

**Response:** `{ message: 'Package deleted successfully.' }`

---

## POST /api/packages/sell

Requires a staff bearer token. Sells an active package to an existing customer.

**Body:** `{ customerId, packageId, branchId? }`

The requested branch must match the package's branch when the package is branch-restricted. The route creates an issued package invoice, one package invoice line, one cash payment, a `customer_packages` entitlement expiring after the package's `validity_days`, and one `customer_package_items` entitlement per configured package item.

**Response:** `{ invoice, customerPackage, packageItems }`, status 201.

---

## POST /api/purchases

Requires a staff bearer token.

**Body:** `{ supplierId?, purchasedAt?, lines: [{ productId, qty, unitCost }], paid?, dueDate? }`

Creates one purchase, its lines, and matching inbound `stock_movements`. `total` is derived on the server from the lines; all referenced products and an optional supplier must exist. For each line, also increases that product's `stock_quantity` by `qty` and overwrites its `purchase_price` with `unitCost` (DEC-033, last-cost basis) — applied sequentially per line, not concurrently.

**Response:** `{ purchase, lines }`, status 201.

---

## GET /api/purchases

Requires a staff bearer token. Returns every row in `purchases`, newest first, with the supplier name and each line's product name embedded.

**Response:** `{ purchases: Purchase[] }` — each purchase includes `suppliers: { name }` and `purchase_lines: [{ id, product_id, qty, unit_cost, inventory_products: { name } }]`.

---

## GET /api/service-consumables?serviceId={id}

Requires a staff bearer token. Returns the standard consumables recipe for one service, with each product's name/unit embedded.

**Response:** `{ consumables: [{ service_id, product_id, standard_qty, inventory_products: { name, unit } }] }`

---

## POST /api/service-consumables

Requires a staff bearer token. Replaces the entire recipe for a service — deletes existing `service_consumables` rows for `serviceId`, then inserts the given `items` (empty array clears the recipe).

**Body:** `{ serviceId, items: [{ productId, standardQty }] }`

Each item requires a positive `standardQty` and no duplicate `productId` within the same request. Every referenced product must exist and have `role IN ('consumable', 'both')` — a `retail`-only product is rejected with a 400 naming the product, since `applyCheckoutCosting` (`/api/reservations`) enforces the same rule at checkout time and would otherwise fail bookings for this service instead of failing the save.

**Response:** `{ success: true }`

---

## GET /api/service-devices?serviceId={id}

Requires a staff bearer token. Returns which devices are attached to a service and their `pulses_per_session`, with each device's name embedded.

**Response:** `{ deviceLinks: [{ service_id, device_id, pulses_per_session, inventory_devices: { name } }] }`

---

## POST /api/service-devices

Requires a staff bearer token. Replaces every device attached to a service — deletes existing `service_devices` rows for `serviceId`, then inserts the given `items` (empty array detaches all devices).

**Body:** `{ serviceId, items: [{ deviceId, pulsesPerSession }] }`

Each item requires a positive whole-number `pulsesPerSession` and no duplicate `deviceId` within the same request. Every referenced device must exist in `inventory_devices`.

**Response:** `{ success: true }`

---

## GET /api/suppliers

Requires a staff bearer token. Returns every row in `suppliers`, ordered by `name`.

**Response:** `{ suppliers: Supplier[] }`

---

## POST /api/suppliers

Requires a staff bearer token. Creates a supplier.

**Body:** `{ name, contact?, payment_terms?, active? }`

Required: `name`. `active` defaults to `true`.

**Response:** Created `Supplier` object, status 201.

---

## PUT /api/suppliers

Requires a staff bearer token. Updates a supplier. Only fields present in the body are changed.

**Body:** `{ id, name?, contact?, payment_terms?, active? }`

Required: `id`. 404 if no supplier matches.

**Response:** Updated `Supplier` object.

---

## DELETE /api/suppliers?id={id}

Requires a staff bearer token. Deletes a supplier.

**409** if any `purchases` row references this supplier (`supplier_id` is `ON DELETE SET NULL` at the
DB level, so the route blocks the delete rather than letting it silently orphan purchase history) —
mark the supplier inactive instead via `PUT`.

**Response:** `{ success: true, id }`

---

## POST /api/packages/consume

Requires a staff bearer token. Consumes one entitled package service from a completed reservation.

**Body:** `{ customerPackageItemId, reservationId }`

The reservation must be completed, belong to the entitlement's customer, and include the entitled service. The route atomically increments `qty_used`, decrements `qty_remaining`, creates one `package_revenue_recognitions` event, and marks the customer package `fully_used` when no sessions remain. A duplicate item/reservation consumption is rejected.

**Response:** `{ consumption }`

---

## POST /api/packages/extend

Requires a staff bearer token. Manually extends an active or expired customer package.

**Body:** `{ customerPackageId, expiresAt }`

`expiresAt` must be a future timestamp. The package becomes active and records the extending employee and time.

**Response:** `{ customerPackage }`

---

## GET /api/customers

Returns all customers, or a single customer matching the queried params.

**Query params:**
- `mobile` — Retrieve a single customer matching this mobile number
- `email` — Retrieve a single customer matching this email

**Response:** Single `Customer` object, or `Customer[]` array

---

## POST /api/customers

Creates or updates a customer profile record.

**Body:** `{ id?, name, mobile, gender?, email?, active?, spent_amount?, outstanding?, wallet_balance?, area?, location_name?, street_name?, building_no?, floor_no?, note?, age?, national_id?, address?, referral?, occupation? }`

Required: `name`, `mobile`. If `id` is present, updates the existing customer. Otherwise creates a new record.

**Response:** Created or updated `Customer` object, status 201 (created) or 200 (updated)

---

## DELETE /api/customers?id={id}

Deletes a customer profile record. Nullifies references in `reservations` to prevent foreign key violations, and deletes the linked account in Supabase Auth if applicable.

**Response:** `{ message: "Customer deleted successfully" }`

---

## GET /api/customers/packages?customer_id={id}

Requires a staff bearer token. Lists everything one customer has bought under the packages
feature — `customer_packages` joined with `packages` (name/name_ar) and `customer_package_items`
(joined with `services` for en/ar names), every status (`active`/`expired`/`fully_used`) included.
Callers filter client-side to what they need — mirrors the "return everything, filter in the UI"
convention already used by `GET /api/services` and `GET /api/packages`.

**Response:** `{ packages: [{ id, packageId, packageName, packageNameAr, status, purchasedAt, expiresAt, pricePaid, items: [{ id, serviceId, serviceName, serviceNameAr, qtyTotal, qtyUsed, qtyRemaining }] }] }`

---

## GET /api/customers/package-redemptions?customer_id={id}

Requires a staff bearer token. For one customer's booking history: which reservations were paid
for (fully or partially) by redeeming a package session, which package that was, and when it was
originally bought — joins `package_revenue_recognitions` back to `customer_packages`/`packages`,
filtered to that customer. Lets the Booking History table show *why* a visit shows 0 EGP paid
instead of leaving it unexplained, and stays accurate even if the package is later edited/
discontinued, since it's sourced from the recognition event record, not the live package row.

**Response:** `{ redemptions: [{ reservationId, recognisedAmount, recognisedAt, packageName, packageNameAr, packagePurchasedAt }] }`

---

## GET /api/customers/reconcile

**Staff-only** (`requireStaffAccess`). PROPOSAL-002 Phase 1, task 1.14 — read-only, writes nothing.
For every customer, derives `outstanding`/`spent`/`wallet` fresh from `invoices`/`payments`/
`wallet_txns` (`src/lib/customerBalances.ts`) and compares against the currently-authoritative
`customers.outstanding`/`spent_amount`/`wallet_balance` scalars, flagging any mismatch. This is a
comparison tool proving the ledger-derived numbers agree with the delta-maintained scalars — no
read path has cut over to trusting the ledger's numbers yet; see the note on those three columns in
`DB_SCHEMA.md`.

**Response:**
```json
{
  "customersChecked": 12,
  "discrepancyCount": 1,
  "allMatched": false,
  "discrepancies": [
    {
      "customerId": "…",
      "customerName": "…",
      "ledger": { "outstanding": 120, "spent": 100, "wallet": 0, "walletClamped": false },
      "scalar": { "outstanding": 1860, "spent": 100, "wallet": 0 },
      "matches": false
    }
  ]
}
```

---

## GET /api/inventory/products/reconcile

**Staff-only** (`requireStaffAccess`). PROPOSAL-002 Phase 2, task 2.12 — read-only, writes nothing.
For every product, derives `stock_quantity` fresh from `stock_movements`
(`src/lib/inventoryBalances.ts`) and compares against the currently-authoritative
`inventory_products.stock_quantity` scalar, flagging any mismatch. Same comparison-only role as
`GET /api/customers/reconcile` (task 1.14) — no read path has cut over to trusting the derived
value yet; see the note on `stock_quantity` in `DB_SCHEMA.md`.

**Response:**
```json
{
  "productsChecked": 2,
  "discrepancyCount": 2,
  "allMatched": false,
  "discrepancies": [
    {
      "productId": "…",
      "productName": "k",
      "derived": -2,
      "scalar": 8,
      "matches": false
    }
  ]
}
```

---

## GET /api/clinic-settings?key={key}

Alias for `/api/page-settings` — returns the `value` JSONB for the given key.

**Response:** `{ key, value }`

---

## POST /api/clinic-settings?key={key}

Alias for `/api/page-settings` — upserts the `value` JSONB for the given key.

**Body:** Full page settings object

**Response:** `{ success: true }`

---

## GET /api/employees

Returns all employee accounts with role and branch info.

**Response:** `EmployeeAccount[]`

---

## POST /api/employees

Creates an employee account and sends a Supabase Auth invite email.

**Body:** `{ name, email, role_id, branch_id?, active? }`

**Response:** Created employee account

---

## DELETE /api/employees?id={id}

Deletes an employee account and the linked Supabase Auth user.

**Response:** `{ success: true }`

---

## GET /api/roles

Returns all roles with their permission arrays.

**Response:** `Role[]`

---

## POST /api/roles

Creates or updates a role.

**Body:** `{ id?, name, permissions }`

**Response:** Upserted role

---

## DELETE /api/roles?id={id}

Deletes a role by ID.

**Response:** `{ success: true }`

---

## GET /api/provider-attendance?date={YYYY-MM-DD}

Returns all provider attendance records for a date. No geolocation involved — this is an
admin-set manual status/time entry per provider, distinct from `/api/hr/attendance` below.

**Response:** `provider_attendance[]`

---

## POST /api/provider-attendance

Upserts a manual attendance status for a provider (admin-entered, no geolocation check).

**Body:** `{ providerId, date, status, checkIn?, checkOut?, notes? }`

**Response:** Upserted `provider_attendance` row

---

## GET /api/hr/attendance

Returns all employee attendance records, joined with `employee_accounts` (id, name, email,
department, role_name). Requires HR access (`verifyHrAccess`).

**Headers:** `Authorization: Bearer <supabase-jwt>`

**Response:** `hr_attendance[]`

---

## POST /api/hr/attendance

Employee self check-in with GPS geofence enforcement (see `PRODUCT_RULES.md` — "Provider
attendance geofence" and `DECISIONS.md` DEC-009). Requires the employee's branch to have
resolvable coordinates. Rejects with `not_in_location` (400, includes `distance` in meters)
if the employee is > 800m from the branch. Bypassed entirely for `superadmin@revera.com`.

**Headers:** `Authorization: Bearer <supabase-jwt>` (any authenticated employee)

**Body:** `{ employeeId, latitude, longitude }`

**Response:** Upserted `hr_attendance` row, or `400` with `{ error, message, distance? }` on rejection

---

## PATCH /api/hr/attendance

Employee self check-out — records `check_out_time` for the employee's attendance row for today.

**Headers:** `Authorization: Bearer <supabase-jwt>`

**Body:** `{ employeeId }`

**Response:** Updated `hr_attendance` row

---

## GET /api/hr/doctor-payroll

Requires HR access (`verifyHrAccess`). Returns every stored `doctor_payroll` row, enriched with the
provider's current name/specialty and a freshly-computed commission for the row's month.

**Updated 2026-07-26 (task 2.14):** completed-reservation matching and commission are now
attributed via `provider_id` (`reservations.provider_id === providers.id`), not a case-insensitive
`doctor_name` string match — a provider rename no longer detaches historical commission (RISK-015).
`calculated_commission` sums real per-reservation `invoice_lines.commission_snapshot` values (task
2.11/2.15's checkout costing) rather than re-deriving commission live from `amount_paid +
amount_left`. Only reservations with `status: 'completed'` count (narrowed from
`'approved' OR 'completed'` — a necessary consequence, since `commission_snapshot` only exists once
checkout completes an invoice line).

**Response:** array of
`{ id, provider_id, month, fixed_salary, commission_type, commission_value, status, doctor: { id, name, specialty, employee_id }, fixed_salary_snapshot, commission_type_snapshot, commission_value_snapshot, reservations_count, calculated_commission, total_reservations_value, net_salary }`

---

## POST /api/hr/doctor-payroll

Requires HR access. Runs payroll for a given `month`, inserting one `doctor_payroll` row per
active provider using the same `provider_id`-based commission attribution as `GET` above.

**Body:** `{ month }` (`'YYYY-MM'`)

**Response:** Inserted `doctor_payroll` rows

---

## PATCH /api/hr/doctor-payroll

Requires HR access. Updates one `doctor_payroll` row by `id`. If `total_commission_earned` is not
explicitly supplied, it is recalculated the same way as `GET`/`POST` (`provider_id`-based, summed
from `commission_snapshot`) before being locked in.

**Body:** `{ id, fixed_salary?, total_commission_earned?, status?, ... }`

**Response:** Updated `doctor_payroll` row

---

## GET /api/auth/me

Verifies the Bearer JWT and returns the employee's role + permissions from `employee_accounts` + `roles`.

**Headers:** `Authorization: Bearer <supabase-jwt>`

**Response:** `{ user, employee, role, permissions }`

---

## GET /api/auth/employee-email?employeeId={id}

Looks up the Supabase Auth email for a given `employee_id`.

**Response:** `{ email }`

---

## GET /api/expenses/categories

Requires a staff bearer token. Returns all `expense_categories` ordered by name.

**Response:** `ExpenseCategory[]`

---

## POST /api/expenses/categories

Requires a staff bearer token. Creates an expense category.

**Body:** `{ name, kind: 'fixed' | 'variable', parentId? }`

`parentId`, if given, must reference an existing category.

**Response:** Created `ExpenseCategory`, status 201.

---

## PATCH /api/expenses/categories?id={id}

Requires a staff bearer token. Updates `name`, `kind` and/or `parentId` (any subset).

**Response:** Updated `ExpenseCategory`

---

## DELETE /api/expenses/categories?id={id}

Requires a staff bearer token. Deletes a category. Returns **409** if any `expenses` or
`recurring_expenses` rows still reference it (`category_id` is `ON DELETE RESTRICT`) — re-categorize
or delete those first.

**Response:** `{ success: true }`

---

## GET /api/expenses

Requires a staff bearer token. Returns `expenses` rows, most recent first.

**Query params:** `branchId?`, `categoryId?`, `from?` (incurred_on >=), `to?` (incurred_on <=)

**Response:** `Expense[]`

---

## POST /api/expenses

Requires a staff bearer token. Creates a dated expense.

**Body:** `{ categoryId, incurredOn: 'YYYY-MM-DD', amount, branchId?, vendor?, note?, isOpening? }`

`categoryId` (and `branchId`, if given) must reference existing rows.

**Response:** Created `Expense`, status 201.

---

## PATCH /api/expenses?id={id}

Requires a staff bearer token. Updates any subset of `categoryId`, `branchId`, `incurredOn`,
`amount`, `vendor`, `note`.

**Response:** Updated `Expense`

---

## DELETE /api/expenses?id={id}

Requires a staff bearer token.

**Response:** `{ success: true }`

---

## GET /api/expenses/recurring

Requires a staff bearer token. Returns `recurring_expenses` templates ordered by `next_due_on`.

**Query params:** `active=true` — only active templates

**Response:** `RecurringExpense[]`

---

## POST /api/expenses/recurring

Requires a staff bearer token. Creates a recurring-expense template.

**Body:** `{ categoryId, amount, cadence: 'monthly' | 'quarterly' | 'yearly', nextDueOn: 'YYYY-MM-DD', branchId? }`

**Response:** Created `RecurringExpense`, status 201.

---

## PATCH /api/expenses/recurring?id={id}

Requires a staff bearer token. Updates any subset of `categoryId`, `branchId`, `amount`, `cadence`,
`nextDueOn`, `active`.

**Response:** Updated `RecurringExpense`

---

## DELETE /api/expenses/recurring?id={id}

Requires a staff bearer token. Deleting a template sets `recurring_id` to `null` on any `expenses`
rows it previously generated (`ON DELETE SET NULL`) rather than deleting them.

**Response:** `{ success: true }`

---

## POST /api/expenses/generate-due

Requires a staff bearer token. For every `active` `recurring_expenses` row with `next_due_on <=`
today (or the optional `asOf` override), creates exactly one `expenses` row dated at the template's
current `next_due_on` and advances `next_due_on` by exactly one cadence step. Deliberately one
period per call, not a catch-up loop — safe to call twice the same day, since the first call's
advance moves `next_due_on` into the future. A template overdue by several periods needs several
calls (e.g. a daily cron), each catching up one more period.

**Body:** `{ asOf?: 'YYYY-MM-DD' }` — defaults to today

**Response:** `{ generated: Expense[], count }`

---

## GET /api/assets

Requires a staff bearer token. Returns `fixed_assets` rows with an added `current_book_value` field
(the latest `depreciation_entries.book_value_after` for that asset, or `cost` if none posted yet).

**Query params:** `branchId?`, `category?`, `status?`

**Response:** `(FixedAsset & { current_book_value: number })[]`

---

## POST /api/assets

Requires an **administrator** bearer token (not just staff — see FINANCE_TRACKER.md task 3.11 for
why assets/loans are administrator-gated while expenses, task 3.10, are staff-gated). Creates a
fixed asset.

**Body:** `{ category: 'furniture' | 'medical_device' | 'it' | 'leasehold_improvement', name, purchasedOn: 'YYYY-MM-DD', cost, usefulLifeMonths, salvageValue?, branchId?, deviceId?, isOpening? }`

`salvageValue` cannot exceed `cost`. `deviceId`, if given, must reference an existing
`inventory_devices` row.

**Response:** Created `FixedAsset`, status 201.

---

## PATCH /api/assets?id={id}

Requires an administrator bearer token. Updates any subset of `branchId`, `name`, `status`,
`deviceId` only — **`cost`/`usefulLifeMonths`/`salvageValue` are not editable after creation**,
since existing `depreciation_entries` rows were computed from those values; delete and recreate the
asset to correct a cost-basis mistake.

**Response:** Updated `FixedAsset`

---

## DELETE /api/assets?id={id}

Requires an administrator bearer token. Cascades to the asset's `depreciation_entries`.

**Response:** `{ success: true }`

---

## POST /api/assets/post-depreciation

Requires an administrator bearer token. For every `active` fixed asset with no
`depreciation_entries` row for the target period, posts one month of straight-line depreciation
(`src/lib/depreciation.ts`), clamped so book value never falls below `salvage_value`, and flips
`status` to `fully_depreciated` once it reaches that floor (at which point the asset is excluded
from all future runs, since it's no longer `active`). Checks for an existing row before inserting
rather than relying solely on the `UNIQUE (asset_id, period)` backstop — safe to call twice for the
same period.

**Body:** `{ period?: 'YYYY-MM' }` — defaults to the current month

**Response:** `{ period, posted: DepreciationEntry[], skipped: { assetId, reason }[] }`

---

## GET /api/loans

Requires a staff bearer token.

- Without `?id=`: returns all `loans` with an added `remaining_balance` field (the latest
  `loan_schedule.balance_after`, or `principal` if no schedule exists).
- With `?id={id}`: returns `{ loan, schedule }` — the loan and its full `loan_schedule`, ordered by
  period.

**Response:** `(Loan & { remaining_balance: number })[]` or `{ loan, schedule }`

---

## POST /api/loans

Requires an administrator bearer token. Creates a loan and generates its full `loan_schedule` in
the same request, chaining `amortizeLoanPayment()` (`src/lib/depreciation.ts`) period over period.
If `installment` can't even cover a period's interest, the schedule computation fails with 400
**before any database write** — no orphaned loan row is left behind.

**Body:** `{ lender, principal, termMonths, startedOn: 'YYYY-MM-DD', installment, annualRate? }`

**Opening loan (DEC-024 — "remaining balance, not original principal"):** pass
`isOpening: true, openingBalance, openingAsOf: 'YYYY-MM'`. `principal`/`startedOn`/`termMonths`
stay the loan's true original terms. The schedule's first row is a single lump `is_opening: true`
entry at `openingAsOf` (`installment/interest_part: 0`, `principal_part: principal - openingBalance`,
`balance_after: openingBalance`) representing everything before go-live, then normal amortized
periods continue from `openingBalance` onward. This is the "single lump entry" option — chosen over
enumerating every pre-go-live period, since DEC-026 means none of that history is being imported.

**Response:** `{ loan, schedule }`, status 201.

---

## PATCH /api/loans?id={id}

Requires an administrator bearer token. **Only `lender` is editable.** Attempting to change
`principal`/`annualRate`/`termMonths`/`startedOn`/`installment` is rejected with 400 — those would
invalidate the already-generated schedule; delete and recreate the loan instead.

**Response:** Updated `Loan`

---

## DELETE /api/loans?id={id}

Requires an administrator bearer token. Cascades to the loan's `loan_schedule`.

**Response:** `{ success: true }`

---

## GET /api/finance/pnl

Requires a staff bearer token **and** the `finance.view_pnl` permission (superadmin bypasses).
Whole-range profit & loss (task 4.6).

**Query params:** either `period` (`'YYYY-MM'`) or both `from`/`to` (`'YYYY-MM-DD'`, inclusive).
`branchId?` — when given, scopes invoices/expenses/depreciation to that branch; loan interest has
no branch attribution anywhere in the schema and is **excluded** (`fixedOverhead.loanInterestExcluded:
true`) rather than silently guessed at.

**Revenue** = `SUM(invoice_lines.line_total)` for `service`/`product` lines on `issued` invoices in
range, **plus** `SUM(package_revenue_recognitions.recognised_amount)` recognised in range (DEC-023
— a package's own `invoice_lines` line books cash received, not revenue, so it is excluded from
revenue to avoid double-counting).

**COGS/commission** = `SUM(invoice_lines.cogs_snapshot)` / `SUM(invoice_lines.commission_snapshot)`
for lines in range. `NULL` values (never costed) are excluded from the sum and counted separately
(`uncostedLineCount`/`uncommissionedLineCount`) rather than treated as zero — `partiallyCosted`/
`partiallyCommissioned` flag when any exist.

**Fixed overhead** = `expenses.amount` + `depreciation_entries.amount` + `loan_schedule.interest_part`
(never `installment` — its `principal_part` is a balance-sheet movement, not a P&L expense) for the
range.

**Response:**
```
{
  range: { label, from, to },
  branchId: string | null,
  revenue: { total, servicesAndProducts, packageRecognised },
  cogs: { total, costedLineCount, uncostedLineCount, partiallyCosted },
  commission: { total, commissionedLineCount, uncommissionedLineCount, partiallyCommissioned },
  fixedOverhead: { total, expenses, depreciation, loanInterest, loanInterestExcluded },
  views: {
    contributionMargin: { value, formula, label },   // DEC-015 primary — decisions
    fullyLoadedProfit: { value, formula, label }      // DEC-015 secondary — full-cost curiosity
  }
}
```

---

## GET /api/finance/service-margin

Requires a staff bearer token **and** the `finance.view_margins` permission (superadmin bypasses).
Per-service contribution margin (task 4.7) — the same `price − materials − commission − pulse_cost`
formula as DEC-015, per minute and per session.

**Query params:** either `period` (`'YYYY-MM'`) or both `from`/`to` (`'YYYY-MM-DD'`, inclusive).
`branchId?` scopes to invoices for that branch. `serviceId?` limits to one service.

For each service with at least one `line_type='service'` line on an `issued` invoice in range:
`contributionMarginPerSession = (SUM(line_total) − SUM(cogs_snapshot) − SUM(commission_snapshot))
/ costedSessionCount`, summed and divided once (not averaged per-line) for the same reason
`buildInvoiceTotals()` rounds once at the end. `cmPerMinute = contributionMarginPerSession /
durationMinutes`, using `getServiceDurationMinutes()` (prefers `services.duration_minutes`, falls
back to parsing `services.duration`; `durationIsFallback: true` flags when the fallback fired). A
line needs **both** `cogs_snapshot` and `commission_snapshot` non-null to count toward
`costedSessionCount` — mixing a real number with a NULL treated as zero would overstate margin.
Results sort by `cmPerMinute` descending.

**Response:**
```
{
  range: { label, from, to },
  branchId: string | null,
  services: [
    {
      serviceId, serviceName, durationMinutes, durationIsFallback,
      sessionCount, costedSessionCount, partiallyCosted,
      revenueTotal, contributionMarginTotal, contributionMarginPerSession, cmPerMinute
    }
  ]
}
```

---

## GET /api/finance/cashflow

Requires a staff bearer token **and** the `finance.view_cashflow` permission (superadmin bypasses).
Cash actually received vs. cash actually paid out (task 4.9) — **deliberately a different number
from `GET /api/finance/pnl`'s revenue** (RISK-016). Do not substitute one for the other in the UI.

**Query params:** either `period` (`'YYYY-MM'`) or both `from`/`to` (`'YYYY-MM-DD'`, inclusive).
`branchId?` scopes cash received (via the paid invoice's branch) and paid expenses to that branch.
`purchases` and `loans` carry no `branch_id` anywhere in the schema — both are **excluded** (flagged
via `purchasesExcluded`/`loanInstallmentsExcluded`) rather than silently guessed at when `branchId`
is given.

- **Cash received:** `SUM(payments.amount)` for payments against `issued` invoices in range, broken
  down `byMethod` (`cash`/`card`/`wallet`/`instapay`/`transfer`).
- **Cash paid out:** `expenses.amount` (by `incurred_on`) + `purchases.paid` (by `purchased_at`) +
  `loan_schedule.installment` (by scheduled period — the **whole** installment here, unlike 4.6's
  P&L, which uses only `interest_part`; the principal portion is real cash leaving the bank even
  though it isn't a P&L expense).

**Response:**
```
{
  range: { label, from, to },
  branchId: string | null,
  note: string,
  cashReceived: { total, byMethod: { cash, card, wallet, instapay, transfer } },
  cashPaidOut: { total, expenses, purchases, purchasesExcluded, loanInstallments, loanInstallmentsExcluded },
  netCashFlow
}
```
