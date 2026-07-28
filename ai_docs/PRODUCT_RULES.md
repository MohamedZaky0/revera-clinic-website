# PRODUCT_RULES.md — Revera Clinics Business Rules (Enforced in Code)

> **Last Updated:** 2026-07-25
> **Source:** Confirmed from live code only — no speculation
> **Previous content was for a different project — discarded entirely**
> **2026-07-25:** three entries were removed or corrected after a full read of
> `src/app/api/reservations/route.ts` — the 8-per-day cap and the per-service slot-uniqueness rule
> were never enforced, and the "no admin authentication" entry was stale. Struck-through headings
> are kept deliberately so the false rules are not silently re-added.

---

## What This File Is

This file documents business logic that is **actually enforced in the codebase today**.
It is not a wishlist or aspirational spec. If a rule is not enforced in code, it is not listed here.

---

## Booking / Scheduling Rules

### ~~Daily capacity cap — 8 bookings per service per day per branch~~ — REMOVED 2026-07-25

**This rule was never enforced.** It violated this file's own contract (only rules actually
enforced in code belong here) and was carried for weeks.

`src/app/api/reservations/route.ts` was read in full: the PATCH approve block (lines 345–523)
contains **no count check of any kind**. The only `8` relating to bookings is
`src/components/BookingModal.tsx:1066`, a client-side check that is dead code — the `disabledDates`
map it reads is populated as `isAvailable === false ? 99 : 0` (`BookingModal.tsx:356-358`), so it
only ever holds 0 or 99, never an actual count.

Do not plan capacity work around an 8-per-day ceiling; it does not exist.

---

### ~~Time slot uniqueness per service~~ — REMOVED 2026-07-25

**This constraint was deliberately dropped**, not lost. See
`supabase/migrations/20260705141243_setup_rooms_schema.sql:104-105`, with the comment
"to allow multiple bookings per slot in different rooms".

**What IS enforced:** a `room_id` can be assigned only once per date + time_slot when status is
`'approved'` — unique partial index `reservations_unique_room_slot`. Note the approve-time conflict
query (`src/app/api/reservations/route.ts:407-412`) filters by date and status but **not** by
branch; this is currently correct only because `room_id` is globally unique across branches.

---

### Doctor double-booking is NOT prevented
**Confirmed 2026-07-25:** `src/app/api/reservations/route.ts:509-520` writes `doctor_name` with no
validation against `working_days_hours` or existing bookings. Doctor conflict checking exists only
in the read-only `/api/availability` (lines 305–345). An admin approving from the panel can
double-book a doctor, so any doctor-utilization figure derived from `reservations` may exceed 100%.

---

### Slot duration-aware availability
**Enforced in:** `src/app/api/availability/route.ts`

The availability endpoint checks whether a contiguous block of 15-min slots equal to the
service's duration is free. A service with duration 1:00 Hour needs 4 consecutive free
15-min slots.

Operating hours are defined by the branch's specific `service_hours` table configuration when a `branchId` is specified. If not specified or no branch-specific hours are set, the global clinic-wide hours (09:00–20:00) defined in `src/lib/services.ts:ALL_15MIN_SLOTS` are used as a fallback.

---

### Required booking fields
**Enforced in:** `POST /api/reservations`

`serviceId`, `date`, `name`, `email`, `phone` are required. Missing any returns HTTP 400.

---

### Default session type
**Enforced in:** `POST /api/reservations`

If `sessionType` is not provided, defaults to `'in_person'`.

---

### Booking origin badge
**Enforced in:** `POST /api/reservations`

Public website bookings are tagged with `origin: 'website'` and displayed with an origin badge in the admin list.

---

### Booking step flow & MD3 Date/Time Pickers
**Enforced in:** `src/components/BookingModal.tsx`, `MaterialDatePicker.tsx`, `MaterialTimePicker.tsx`

The public website patient booking flow is consolidated into 3 main steps (or 2 steps if deposit percentage is 0):
1. **Service & Schedule (`Service & Schedule` / `الخدمة والموعد`)**: Combines session type selection (In-Clinic vs Online), branch selection, service category & service dropdown, and inline Material Design 3 style custom Date & Time pickers.
   - **Date Picker (`MaterialDatePicker.tsx`)**: MD3 full month calendar with date header, month switcher (`<` `>`), weekday grid, and brand-styled day selector (`var(--cr-primary)` `#414E36`).
   - **Time Picker (`MaterialTimePicker.tsx`)**: MD3 digital display (`HH:MM` with AM/PM toggle) paired with interactive radial analog clock dial and toggleable quick slots grid.
2. **Confirm (`Confirm` / `تأكيد`)**: Summary of reservation, optional doctor selection, patient name/email/phone, notes, and Terms & Conditions.
3. **Payment (`Payment` / `الدفع`)**: InstaPay / Mobile Wallet deposit submission (when deposit percentage > 0).

---

### Booking lifecycle stages
**Enforced in:** `src/app/admin/page.tsx` + `PATCH /api/reservations`

Valid statuses include: `pending`, `approved`, `rejected`, `confirmed`, `started`, `completed`, `cancelled`. UI enforces stage progression for action buttons.

---

### Booking cancellation constraints
**Enforced in:** `PATCH /api/reservations` and `src/app/admin/page.tsx`

Cancellation sets `status` to `'cancelled'` and optionally records `cancelled_reason`. Completed bookings cannot be cancelled.

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

### ~~No authentication on admin panel~~ — STALE, corrected 2026-07-25

`/admin` **does** have a Supabase email/password login gate (see "Admin login and role lookup"
below, and DEC-010). This entry predated it and contradicted the rest of this file.

**The accurate statement:** selected sensitive API mutations validate a bearer token in their
handlers. `PATCH /api/reservations` requires `requireStaffAccess` except for its narrowly scoped
public deposit self-report; `DELETE /api/reservations` requires an administrator; and payroll,
roles, employees, and product-sales mutations have route-level checks. Coverage is not universal:
`/api/customers`, inventory, and customer-product routes still require their own authorization
review. See RISK-018.

---

### Admin can hard-delete all reservations
**Enforced in:** `DELETE /api/reservations?id=all`

Deletes all rows from the reservations table. No soft-delete. No confirmation beyond the UI.

---

### Admin login and role lookup
**Enforced in:** `src/app/admin/page.tsx` + `GET /api/auth/me`

- Login uses Supabase Auth email/password.
- `superadmin@revera.com` bypasses employee lookup and receives full permissions.
- All other users: session token sent to `/api/auth/me`, which looks up `employee_accounts` + `roles` and returns `permissions` array.
- Server-side token validation is partial; sensitive routes must enforce it in their handlers.

---

### Provider attendance geofence
**Enforced in:** `POST /api/hr/attendance` (client trigger: `src/app/admin/page.tsx` geolocation check-in effect)

- Requires branch coordinates (`lat`, `lng`) configured on the branch (resolved from `maps_link` when present).
- Calculates distance between employee GPS location and branch coordinates.
- If distance > 800m, check-in is rejected and logged with status `Out of Location`.
- Two separate bypasses exist:
  - **Client-side:** the browser skips calling the check-in API entirely when `adminRole === 'superadmin'` AND the logged-in employee has no `branch_id` assigned (global superadmins with no branch).
  - **Server-side:** the route itself always allows check-in (no distance check) when the employee's email is exactly `superadmin@revera.com`, regardless of role or branch.
- Note: `POST /api/provider-attendance` is a separate, unrelated route — it just upserts an admin-set manual status/check-in-out time for a provider, with no geolocation logic at all.

---

### Coming-soon sidebar sections are superadmin-only
**Enforced in:** `src/app/admin/page.tsx` (`SIDEBAR_ITEMS`, `permittedSidebarItems`)

- Marketing, Customer Support, Reports, and Finance are placeholder sidebar entries (`comingSoon: true`) with no page behind them.
- Rendered disabled, greyed out, unclickable, with a "Coming Soon" hover tooltip.
- Filtered out of `permittedSidebarItems` for every role except `superadmin`.

---

## localStorage Keys (Revera-branded)

Service state on the admin side persists to localStorage under these keys:
- `revera_service_toggles`
- `revera_dynamic_services`
- `revera_dynamic_categories`

These keys will need changing when forking for client #2.

---

## Inventory Product Roles & Sales Restrictions
**Enforced in:** `src/app/admin/page.tsx` and `POST /api/inventory/products/sales`

- Products with `role === 'consumable'` are marked as "Consumable (used in services only)".
- Standalone retail sale of consumable products to patients is strictly blocked:
  - In `src/app/admin/page.tsx` products list table, the **Sell Product** action button is disabled with label `"Consumable Only"` and tooltip `"Consumable Only (Used in services only, not for retail sale)"`.
  - In `handleOpenSellProductModal`, opening the retail POS modal is blocked with an alert.
  - In retail product select dropdowns, consumable items are filtered out.
  - In `POST /api/inventory/products/sales`, server-side validation checks `role === 'consumable'` and rejects the transaction with HTTP 400.

---

## Customer Wallet Rules
**Enforced in:** `PATCH /api/reservations` (checkout/settlement action)

When completing a reservation, the receptionist processes a payment settlement. If the reservation's status is updated to `'completed'`, the linked customer's profile is updated:
- **Wallet Balance**: Decreased by any `walletWithdrawal` amount used for payment and increased by any `walletDeposit` (overpayment change saved to wallet).
- **Total Spent**: Increased by the amount paid plus any wallet balance used to offset the cost.
- **Outstanding Debt**: Increased by any unpaid remainder (`amountLeft`).

---

## What Is NOT Enforced (But May Be Assumed)

The following are **not currently enforced in code**:
- Patient phone OTP verification (auth modal is UI-only, OTP is simulated)
- Service visible/active flags filtering public service list
- Package redemption on a booking that already has a deposit paid — deposits are booking-level, not
  per-service, so waiving a service's price after cash was collected against it would need
  refund/reversal logic that isn't built. Redemption is disabled (with an explanatory note) for any
  checkout where `amountPaid > 0` before that checkout. (Package/session tracking itself **is**
  built — see `customer_packages`/`customer_package_items` in `DB_SCHEMA.md`, wired to UI 2026-07-28.)
- External Payment Gateway processing (payments are logged as cash/card settlements in the admin dashboard ledger only)
- Automated reminders (enable_reminder flag exists on services but no sending logic found)
- Server-side auth validation on `/api/*` routes (browser login gate only)
