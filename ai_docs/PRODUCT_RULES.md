# PRODUCT_RULES.md — Revera Clinics Business Rules (Enforced in Code)

> **Last Updated:** 2026-06-27
> **Source:** Confirmed from live code only — no speculation
> **Previous content was for a different project — discarded entirely**

---

## What This File Is

This file documents business logic that is **actually enforced in the codebase today**.
It is not a wishlist or aspirational spec. If a rule is not enforced in code, it is not listed here.

---

## Booking / Scheduling Rules

### Daily capacity cap — 8 bookings per service per day per branch
**Enforced in:** `src/app/api/reservations/route.ts` — PATCH approve action

When approving a reservation, the system counts existing approved reservations for the same
`service_id`, `date`, and `branch_id`. If count >= 8, the approval is rejected with:
`{ error: 'Day is fully booked' }` (HTTP 400).

```
If (approved bookings for service+date+branch) >= 8 → reject approval
```

Branch matching: if reservation has a `branch_id`, filter by branch. If null, filter by `branch_id IS NULL`.

---

### Time slot uniqueness — one booking per 15-min slot per service per day per branch
**Enforced in:** `src/app/api/reservations/route.ts` — PATCH approve action

When approving with a `timeSlot`, the system checks if any other approved booking for the same
service+date+branch already occupies that slot. If yes, returns:
`{ error: 'Time slot already taken' }` (HTTP 400).

---

### Slot duration-aware availability
**Enforced in:** `src/app/api/availability/route.ts`

The availability endpoint checks whether a contiguous block of 15-min slots equal to the
service's duration is free. A service with duration 1:00 Hour needs 4 consecutive free
15-min slots.

Operating hours are 09:00–20:00 (44 slots × 15 min). Defined in `src/lib/services.ts:ALL_15MIN_SLOTS`.

---

### Required booking fields
**Enforced in:** `POST /api/reservations`

`serviceId`, `date`, `name`, `email`, `phone` are required. Missing any returns HTTP 400.

---

### Default session type
**Enforced in:** `POST /api/reservations`

If `sessionType` is not provided, defaults to `'in_person'`.

---

## Service Catalog Rules

### Service duration format
**Enforced in:** `src/lib/services.ts:getDurationInMinutes()`

Duration strings are parsed from formats: `'1:30 Hours'`, `'30 mins'`, `'1:30'`. Default fallback
if unparseable: 30 minutes.

---

### Service visibility and active flags
**Confirmed in schema:** `services.visible` and `services.active` columns exist.
**Note:** No enforcement of these flags on the public website was confirmed in code during audit.
The admin panel displays them but patient-facing queries (`GET /api/services`) return all services
without filtering by visible/active.

---

## Admin Panel Rules

### Authentication — Supabase email/password
**Enforced in:** `src/app/admin/page.tsx` — `useEffect` on mount

On load, the admin page calls `supabase.auth.getSession()`. If no session exists, it renders a full-screen login form instead of the panel. On successful login, it calls `GET /api/auth/me` (Bearer token) to retrieve the employee's role and permissions.

**Superadmin bypass:** `superadmin@revera.com` → always returns full permissions without any DB lookup. This is hardcoded in `/api/auth/me`.

---

### Roles and permissions
**Enforced in:** `src/app/admin/page.tsx` + `/api/auth/me`

Each employee has a `role_name` referencing the `roles` table. Each role has a `permissions` string array. The admin panel uses this array to show/hide sections. Known permission strings: `'Bookings'`, `'Customers'`, `'Providers'`, `'Services'`, `'Settings'`.

---

### Employee invite flow
**Enforced in:** `POST /api/employees` + `src/app/auth/callback/page.tsx`

New employees are invited via Supabase Auth invite email (not a manual password). They click the invite link → `/auth/callback` → set their own password → redirected to `/admin?setup=true`. The admin page prompts them to complete setup on first login.

---

### Superadmin account is protected
**Enforced in:** `DELETE /api/employees` and `DELETE /api/roles`

Attempting to delete `employee_id = 'superadmin'` or `role name = 'superadmin'` returns HTTP 400.

---

### Admin can hard-delete all reservations
**Enforced in:** `DELETE /api/reservations?id=all`

Deletes all rows from the reservations table. No soft-delete. No confirmation beyond the UI.

---

## localStorage Keys (Revera-branded)

Service state on the admin side persists to localStorage under these keys:
- `revera_service_toggles`
- `revera_dynamic_services`
- `revera_dynamic_categories`

These keys will need changing when forking for client #2.

---

## What Is NOT Enforced (But May Be Assumed)

The following are **not currently enforced in code**:
- Patient phone OTP verification (auth modal is UI-only, OTP is simulated)
- Service visible/active flags filtering public service list
- API-level authentication (all `/api/` routes are callable without a token except `/api/auth/me`)
- Package/session tracking (not built)
- Payment processing (not wired to any payment gateway)
- Automated reminders (enable_reminder flag exists on services but no sending logic found)
- Customers linked to reservations (no FK; booking name/phone is not auto-matched to a customer record)
