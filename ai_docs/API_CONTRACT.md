# API_CONTRACT.md — Revera Clinics API Endpoints

> **Last Updated:** 2026-06-27
> **Base:** Next.js App Router API routes under `/app/api/`
> **Auth:** All routes use the Supabase **service role key** server-side (no per-request user auth on API layer). The admin page enforces Supabase session client-side before calling these routes. `/api/auth/me` is the exception — it accepts a Bearer token and validates it.
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

**Body:** Branch fields (name_en, name_ar, address_en, address_ar, phone, maps_embed, maps_link, status, sort_order)

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
- `status` — 'pending', 'approved', 'rejected'
- `serviceId` — numeric service ID
- `date` — YYYY-MM-DD
- `branchId` — UUID

**Response:** `ReservationRow[]` — `{ id, serviceId, date, requestedTime, name, email, phone, notes, status, timeSlot, sessionType, doctorName, createdAt, branchId }`

---

## POST /api/reservations

Creates a new reservation with status 'pending'.

**Body:** `{ serviceId, date, requestedTime?, name, email, phone, notes?, sessionType?, branchId? }`

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

**Generic update:** `{ status?, notes?, doctorName?, sessionType? }`
- Updates any combination of those fields

**Response:** Updated reservation

---

## DELETE /api/reservations?id={id}

Deletes a reservation. Pass `id=all` to delete all reservations.

**Response:** `{ success: true, message: "..." }`

---

## GET /api/availability?serviceId={id}&branchId={id}&days={n}

Returns availability for the next `days` days (default 30) for a given service + branch.

For each date: counts approved bookings, calculates whether at least one contiguous block
of free 15-minute slots exists to fit the service's duration.

**Response:** Array of `{ date, approvedCount, approvedSlots, isAvailable }`

---

## GET /api/customers

Returns all customers ordered by `created_at` desc. Optionally filter by `?mobile={phone}` or `?email={email}` (returns single match or null).

**Response:** `CustomerRow[]` or single `CustomerRow | null`

---

## POST /api/customers

Create or update a customer. If body contains `id`, updates that customer. Otherwise creates new.

**Body:** `{ id?, name, mobile, gender?, email?, active?, spent_amount?, outstanding?, area?, location_name?, street_name?, building_no?, floor_no?, note?, age?, national_id?, address?, referral?, occupation? }`

Required: `name`, `mobile`.

**Response:** Created/updated customer (201 on create, 200 on update)

**Errors:** 400 if mobile or email already exists for another customer (unique constraint).

---

## DELETE /api/customers?id={id}

Deletes a customer by ID.

**Response:** `{ message: "Customer deleted successfully" }`

---

## GET /api/employees

Returns all employee accounts ordered by `created_at` desc.

**Response:** `EmployeeAccount[]`

---

## POST /api/employees

Invites a new employee via Supabase Auth and creates an `employee_accounts` record.

**Body:** `{ email, name, roleName }`

All fields required. `roleName` must match an existing role in the `roles` table.

**Flow:**
1. Validates inputs + checks role exists + checks email not already registered
2. Calls `supabaseServer.auth.admin.inviteUserByEmail()` → sends invite email
3. Inserts row into `employee_accounts` with `auth_user_id` from invite
4. On insert failure: rolls back by deleting the auth user

**Response:** New employee account, status 201

---

## DELETE /api/employees?id={id}

Deletes an employee account (from `employee_accounts` table + Supabase Auth).

**Errors:** 400 if trying to delete `employee_id = 'superadmin'`.

**Response:** `{ message: "Employee account deleted successfully" }`

---

## GET /api/roles

Returns all roles ordered by name.

**Response:** `Role[]` — `{ name, permissions, updated_at }`

---

## POST /api/roles

Upserts a role. Cleans name to lowercase alphanumeric (no spaces).

**Body:** `{ name, permissions: string[] }`

**Response:** Upserted role

---

## DELETE /api/roles?name={name}

Deletes a role by name.

**Errors:** 400 if `name = 'superadmin'`.

**Response:** `{ message: "Role '{name}' deleted successfully" }`

---

## GET /api/provider-attendance?date={YYYY-MM-DD}

Returns all attendance records for the given date.

**Response:** `AttendanceRecord[]`

---

## POST /api/provider-attendance

Upserts an attendance record for a provider on a given date.

**Body:** `{ providerId, date, status, checkIn?, checkOut?, notes? }`

Required: `providerId`, `date`, `status`.

Unique constraint: `(provider_id, date)` — existing record is updated.

**Response:** Upserted record

---

## GET /api/clinic-settings?key={key}

Reads a single row from `page_settings` by key. Returns the `value` JSONB or `null`.

**Response:** `value` object | `null`

---

## POST /api/clinic-settings

Upserts a row in `page_settings`.

**Body:** `{ key, value }`

**Response:** Upserted row

---

## GET /api/auth/me

Validates a Supabase JWT and returns the authenticated employee's role and permissions.

**Auth:** `Authorization: Bearer {supabase_access_token}`

**Logic:**
1. `supabaseServer.auth.getUser(token)` — verifies token
2. If email is `superadmin@revera.com` → returns hardcoded full permissions (no DB lookup)
3. Otherwise: lookup `employee_accounts` by `auth_user_id` → lookup `roles` by `role_name`

**Response:** `{ role, permissions: string[], email, employeeId }`

**Errors:** 401 if no/invalid token; 403 if no employee_accounts record for the user

---

## GET /api/auth/employee-email?id={employee_id}

Looks up an employee's email address by their `employee_id` string.

Used during login when an employee enters their employee ID instead of email — the admin
page fetches the real email, then signs in with Supabase using that email.

**Response:** `{ email: string }`

**Errors:** 400 if no id; 404 if employee not found
