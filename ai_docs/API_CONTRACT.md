# API_CONTRACT.md — Revera Clinics API Endpoints

> **Last Updated:** 2026-07-26
> **Base:** Next.js App Router API routes under `/app/api/`
> **Auth:** Server-side bearer-token validation is enabled on selected sensitive routes (including employee, role, payroll, reservation PATCH/DELETE, and product-sales mutations); coverage is not yet universal. All routes use the Supabase service role key server-side
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

**Generic update (includes checkout/wallet adjustments):** `{ status?, notes?, doctorName?, sessionType?, amountPaid?, amountLeft?, walletDeposit?, walletWithdrawal? }`
- Requires a staff bearer token and updates any combination of those fields
- Transitioning to status `'completed'` triggers patient balance ledger calculations and an additive invoice, invoice-line, and payment write; the pre-existing reservation and customer balance updates remain unchanged

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

Required: `product_id`, `customer_id`, and positive `quantity`.

After a successful native `product_sales` insert, the route additively attempts to create one issued product invoice, invoice line, and payment row. A ledger-write failure is logged and does not roll back or fail the established POS sale path.

**Response:** `{ success: true, sale: ProductSaleRecord, sales: ProductSaleRecord[] }`

---

## POST /api/packages/sell

Requires a staff bearer token. Sells an active package to an existing customer.

**Body:** `{ customerId, packageId, branchId? }`

The requested branch must match the package's branch when the package is branch-restricted. The route creates an issued package invoice, one package invoice line, one cash payment, a `customer_packages` entitlement expiring after the package's `validity_days`, and one `customer_package_items` entitlement per configured package item.

**Response:** `{ invoice, customerPackage, packageItems }`, status 201.

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

## GET /api/auth/me

Verifies the Bearer JWT and returns the employee's role + permissions from `employee_accounts` + `roles`.

**Headers:** `Authorization: Bearer <supabase-jwt>`

**Response:** `{ user, employee, role, permissions }`

---

## GET /api/auth/employee-email?employeeId={id}

Looks up the Supabase Auth email for a given `employee_id`.

**Response:** `{ email }`
