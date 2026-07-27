# API_CONTRACT.md — Revera Clinics API Endpoints

> **Last Updated:** 2026-07-27
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

**Response:** `ServiceRow[]` — `{ id, en, ar, img, cat, unit, price, sortOrder, duration, descriptionEn, descriptionAr, isShared, enableReminder, branchPricing, visible, active, createdAt }`

---

## POST /api/services

Upsert one or many services.

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

**Response:** `ReservationRow[]` — `{ id, serviceId, date, requestedTime, name, email, phone, notes, status, timeSlot, sessionType, doctorName, createdAt, branchId, customerId }`

---

## POST /api/reservations

Creates a new reservation with status 'pending'.

**Body:** `{ serviceId, date, requestedTime?, name, email, phone, notes?, sessionType?, branchId?, customerId? }`

Required: serviceId, date, name, email, phone.

**Response:** Created reservation, status 201

---

## PATCH /api/reservations?id={id}

Updates a reservation. Supports three modes:

**Approve:** `{ action: "approve", timeSlot, doctorName? }`
- Validates: day not fully booked (< 8 approved), time slot not already taken
- Sets status to 'approved', assigns timeSlot

**Reject:** `{ action: "reject" }`
- Sets status to 'rejected'

**Generic update (includes checkout/wallet adjustments):** `{ status?, notes?, doctorName?, sessionType?, amountPaid?, amountLeft?, walletDeposit?, walletWithdrawal?, consumptionOverrides? }`
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

After a successful native `product_sales` insert, the route additively attempts to create one issued product invoice, invoice line, and payment row. A ledger-write failure is logged and does not roll back or fail the established POS sale path.

**Response:** `{ success: true, sale: ProductSaleRecord, sales: ProductSaleRecord[] }` (`200`), or
`{ success: false, error }` (`404` for a non-existent customer, `400` for missing/invalid required fields)

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

Creates one purchase, its lines, and matching inbound `stock_movements`. `total` is derived on the server from the lines; all referenced products and an optional supplier must exist.

**Response:** `{ purchase, lines }`, status 201.

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
