# API_CONTRACT.md — Revera Clinics API Endpoints

> **Last Updated:** 2026-06-26
> **Base:** Next.js App Router API routes under `/app/api/`
> **Auth:** None — all routes use the Supabase service role key server-side; no user auth on API layer
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
