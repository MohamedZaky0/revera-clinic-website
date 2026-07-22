# DB_SCHEMA.md — Revera Clinics Database Schema

> **Last Updated:** 2026-07-21
> **Database:** Supabase (PostgreSQL)
> **Audited from:** `supabase/migrations/*.sql` (full read, not grep), cross-checked against live API routes
> **Previous content was for a different project — discarded entirely**

Migration history (run manually via Supabase SQL Editor, see `supabase/migrations/README.md`)
lives in `supabase/migrations/`. This file is the current-state reference; that folder is the
change log. Keep both in sync — see "When to Update These Docs" in `ai_docs/README.md`.

---

## Important: Schema Answer

**`branch` is the topmost scoping unit. There is NO org/tenant layer above it.**

No `org_id`, `tenant_id`, or equivalent column exists on any table. Multi-tenancy is not
implemented. The current deployment is single-tenant (Revera only).

---

## Entity Overview

```
branches
  └──< reservations (branch_id FK, nullable)
  └──< services (via branch_pricing JSON field, not a FK)
  └──< employee_accounts (branch_id FK, nullable)
  └──< providers (branch_id FK, nullable)
  └──< rooms (branch_id FK)

services
  └──< reservations (service_id FK, legacy single-service; service_ids[] array is the current multi-service field)
  └──< service_rooms (service_id FK) >──┐
                                         │
rooms                                   │
  └──< service_rooms (room_id FK) ──────┘
  └──< reservations (room_id FK, nullable; rooms[] array also used for multi-room bookings)

categories
  (no FK to branches — global)

providers (doctors)
  (no FK to branches until 2026-06-26; branch_id added then — still nullable/global-capable)
  └──< provider_attendance (provider_id FK)
  └──< doctor_payroll (provider_id FK)
  └──< provider_schedule_audit_logs (provider_id FK)

customers
  └──< reservations (customer_id FK, nullable)
  └──< prescriptions (customer_id FK)

page_settings
  (key/value CMS store — key='home' for homepage content; also reused as a JSON fallback
  store for inventory_products / inventory_devices when those tables are empty)

employee_accounts
  └──> roles (role_name FK → roles.name — NOT a UUID FK, it's a text FK on the name column)
  └──> branches (branch_id FK, nullable)
  └──< hr_payroll (employee_id FK)
  └──< hr_leave_requests (employee_id FK)
  └──< hr_performance_reviews (employee_id FK)
  └──< hr_attendance (employee_id FK)
  └──< hr_missing_alerts (employee_id FK)
  └──< employee_notes (employee_id FK)

roles
  (permission array; referenced by employee_accounts.role_name)

inventory_products
  └──< product_sales (product_id FK, nullable)

inventory_devices
  └──< device_maintenance_history (device_id FK)
```

---

## Table Definitions

All table structures are read directly from `supabase/migrations/*.sql` (every `CREATE TABLE`
and `ALTER TABLE ... ADD COLUMN` across the full migration history), cross-checked against the
API routes that query them.

---

### `branches`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `name_en` | text | English branch name |
| `name_ar` | text | Arabic branch name |
| `address_en` | text | English address |
| `address_ar` | text | Arabic address |
| `phone` | text | nullable |
| `maps_embed` | text | Google Maps iframe embed code, nullable |
| `maps_link` | text | Google Maps URL, nullable |
| `status` | text | 'active' or 'inactive' |
| `sort_order` | integer | Display order |
| `service_hours` | JSONB | Array of `{day, dayAr, isOpen, openTime, closeTime}`, nullable — per-branch operating hours used by availability |
| `latitude` | numeric | Branch GPS coordinate, nullable — used for employee attendance geofencing |
| `longitude` | numeric | Branch GPS coordinate, nullable — used for employee attendance geofencing |
| `created_at` | timestamptz | nullable |
| `updated_at` | timestamptz | nullable |

---

### `customers`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `name` | text | Customer full name |
| `mobile` | text | Mobile number, unique |
| `gender` | text | 'Male' or 'Female', nullable |
| `email` | text | Email, unique, nullable |
| `number_of_bookings` | integer | Count of bookings, default 0 |
| `registration_date` | timestamptz | Date of registration, default now() |
| `active` | boolean | Is customer active, default true |
| `spent_amount` | numeric | Total spent amount, default 0 |
| `outstanding` | numeric | Outstanding patient debt, default 0 |
| `wallet_balance` | numeric | Customer wallet credit balance, default 0 |
| `area` | text | Address area, nullable |
| `location_name` | text | location name, nullable |
| `street_name` | text | Street name, nullable |
| `building_no` | text | Building number, nullable |
| `floor_no` | text | Floor number, nullable |
| `note` | text | Administrative customer notes, nullable |
| `age` | integer | Customer age, nullable |
| `national_id` | text | National ID card number, unique, nullable |
| `address` | text | Detailed address string, nullable |
| `referral` | text | Referral source, nullable |
| `occupation` | text | Job title/occupation, nullable |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

---

### `reservations`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `service_id` | bigint | Legacy single-service FK → services.id; superseded by `service_ids[]` but still populated |
| `service_ids` | bigint[] | Array of service IDs for multi-service bookings, default `{}` — backfilled from `service_id` |
| `date` | text | Booking date (YYYY-MM-DD), stored as text not `date` type |
| `requested_time` | text | Patient-requested time (free text), nullable |
| `name` | text | Patient full name |
| `email` | text | Patient email |
| `phone` | text | Patient phone |
| `notes` | text | Patient notes, default '' |
| `status` | text | `'pending_deposit'`, `'pending'`, `'approved'`, `'confirmed'`, `'started'`, `'completed'`, `'cancelled'`, `'rejected'` — enforced via CHECK constraint `reservations_status_check` |
| `time_slot` | text | Assigned 15-min slot (e.g., '09:00'), nullable — set on approve |
| `session_type` | text | Default `'in_person'` |
| `origin` | text | Booking source, e.g., 'website' — displayed as badge |
| `is_manual` | boolean | Default false — true when created by staff in admin rather than via public booking |
| `cancelled_reason` | text | Reason for cancellation, nullable |
| `doctor_name` | text | Assigned doctor name, nullable |
| `amount_paid` | numeric | Default 0 |
| `amount_left` | numeric | nullable |
| `branch_id` | UUID | FK → branches.id, nullable |
| `customer_id` | UUID | FK → customers.id, nullable |
| `room_id` | UUID | FK → rooms.id, nullable |
| `rooms` | uuid[] | Array of room IDs for multi-room bookings, default `{}` |
| `created_by_employee_id` | UUID | FK → employee_accounts.id, nullable — who created the booking (for HR revenue-target attribution) |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Business rules enforced in code:**
- Max 8 approved bookings per service per day per branch (checked in PATCH approve action)
- A time_slot can only be assigned once per service per date per branch
- A `room_id` can only be assigned once per date+time_slot when status is `'approved'` (unique partial index `reservations_unique_room_slot`)

---

### `services`

| Column | Type | Notes |
|---|---|---|
| `id` | bigint | Primary key, identity |
| `en` | text | English name |
| `ar` | text | Arabic name |
| `img` | text | Image path |
| `cat` | text | Category key (FK-by-convention → categories.key) |
| `unit` | text | 'session', etc. |
| `price` | numeric | Default 0 |
| `sort_order` | integer | |
| `duration` | text | e.g., '1:00 Hours', '30 mins' |
| `description_en` | text | nullable |
| `description_ar` | text | nullable |
| `is_shared` | boolean | Default false |
| `enable_reminder` | boolean | Default true |
| `branch_pricing` | JSONB | Array of `{name, price, visible, status, isDefault}`, default `{}` |
| `visible` | boolean | default true |
| `active` | boolean | default true |
| `created_at` | timestamptz | |

---

### `categories`

| Column | Type | Notes |
|---|---|---|
| `key` | text | Primary key (e.g., 'dermatology', 'gynecology') |
| `en` | text | English label |
| `ar` | text | Arabic label |
| `sort_order` | integer | Display order |

---

### `providers` (doctors)

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `name` | text | Doctor name |
| `bookings_count` | integer | Total booking count, default 0 |
| `services` | JSONB | Array of service name strings, default `[]` |
| `more_count` | integer | Additional services count, default 0 |
| `rating` | numeric | Default 0 |
| `image` | text | nullable |
| `phone` | text | nullable |
| `gender` | text | 'Male' or 'Female', nullable |
| `age` | integer | nullable |
| `specialty` | text | nullable |
| `national_id` | text | nullable |
| `working_days_hours` | JSONB | nullable — per-doctor schedule |
| `branch_id` | UUID | FK → branches.id, nullable |
| `start_date` | date | nullable |
| `fixed_salary` | numeric | Default 0 |
| `commission_type` | text | Default `'none'` |
| `commission_value` | numeric | Default 0 |
| `created_at` | timestamptz | |

---

### `page_settings`

| Column | Type | Notes |
|---|---|---|
| `key` | text | Primary key. `'home'` = homepage content. Also used as a JSON snapshot fallback for `inventory_products` / `inventory_devices` when those tables are empty (dual-storage pattern). |
| `value` | JSONB | Full content tree for the given key |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Structure of `value` for key='home':**
```json
{
  "hero": {
    "slides": [ { "welcome", "heading", "description", "bookBtn", "rating", "reviewCount", "image" } ],
    "slides_ar": [ { same fields in Arabic } ]
  }
}
```
The full page content structure mirrors the `Translation` type in `src/types/index.ts`.

---

### `employee_accounts`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `auth_user_id` | UUID | Unique, nullable — mirrors Supabase Auth user ID |
| `employee_id` | text | Unique, human-readable staff ID |
| `role_name` | text | FK → `roles.name` (text FK, **not** a `role_id` UUID FK) |
| `email` | text | Unique, Supabase Auth email |
| `name` | text | Display name, nullable |
| `phone` | text | nullable |
| `department` | text | Default `'Reception'` |
| `shift` | text | Default `'Day'` — `"Day"`, `"Night"`, or custom time range string |
| `salary` | numeric | Default 0 |
| `branch_id` | UUID | FK → branches.id, nullable |
| `national_id` | text | nullable |
| `national_id_front` | text | Base64 data or image URL, nullable |
| `national_id_back` | text | Base64 data or image URL, nullable |
| `address` | text | nullable |
| `required_target_amount` | numeric | Default 0, CHECK >= 0 — monthly target used for bonus calc |
| `bonus_percentage` | numeric | Default 0, CHECK 0–100 |
| `target_type` | text | Default `'reservations'`, CHECK IN (`'reservations'`, `'revenue'`) |
| `bonus_type` | text | Default `'percentage'`, CHECK IN (`'percentage'`, `'fixed'`) |
| `contract_file` | text | nullable |
| `contract_file_name` | text | nullable |
| `created_at` | timestamptz | |

**Note:** an `active` boolean column was referenced in earlier versions of this doc but is not
created by any migration in `supabase/migrations/` — could not be confirmed against live code
either. Treat as unconfirmed; verify directly in Supabase before relying on it.

---

### `roles`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `name` | text | Unique. Role name, e.g., 'superadmin', 'admin', 'receptionist' — this is what `employee_accounts.role_name` references |
| `permissions` | text[] | Array of permission strings |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

---

### `provider_attendance`

Doctor/provider daily attendance — distinct from `hr_attendance` (employee GPS check-in, below).

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `provider_id` | UUID | FK → providers.id, cascade delete |
| `date` | date | NOT NULL |
| `status` | text | CHECK IN (`'Present'`, `'Absent'`, `'On Leave'`) |
| `check_in` | time | nullable — time-of-day only, not a full timestamp |
| `check_out` | time | nullable |
| `notes` | text | nullable |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

Unique constraint on `(provider_id, date)`. No `branch_id` or GPS `location` column — this table
has no geolocation fields; that logic lives in `hr_attendance` (employee attendance) instead.

---

### `rooms`

**Added 2026-07-05.** Physical rooms per branch, used for room-based booking assignment.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `name` | text | e.g. "Laser Room NC 1" |
| `type` | text | CHECK IN (`'clinical'`, `'administrative'`) |
| `status` | text | Default `'available'`, CHECK IN (`'available'`, `'on_cleaning'`, `'needs_cleaning'`, `'has_issue'`) |
| `branch_id` | UUID | FK → branches.id, cascade delete |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

---

### `service_rooms`

**Added 2026-07-05.** Junction table — which rooms a service can be booked into.

| Column | Type | Notes |
|---|---|---|
| `service_id` | bigint | FK → services.id, cascade delete |
| `room_id` | UUID | FK → rooms.id, cascade delete |

Composite primary key `(service_id, room_id)`.

---

### `hr_payroll`

**Added 2026-07-06.** Monthly payroll runs for `employee_accounts` (front-desk/admin staff —
doctors use `doctor_payroll` instead).

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `employee_id` | UUID | FK → employee_accounts.id, cascade delete |
| `month` | text | Format `'YYYY-MM'` |
| `basic_salary` | numeric | Default 0 |
| `bonuses` | numeric | Default 0 |
| `deductions` | numeric | Default 0 |
| `net_salary` | numeric | Default 0 |
| `status` | text | Default `'Draft'` — `'Draft'` or `'Paid'` |
| `payment_date` | timestamptz | nullable |
| `target_amount_snapshot` | numeric | Default 0 — target at time payroll was run |
| `bonus_percentage_snapshot` | numeric | Default 0 |
| `target_type_snapshot` | text | Default `'reservations'` |
| `bonus_type_snapshot` | text | Default `'percentage'` |
| `achieved_revenue` | numeric | Default 0 |
| `calculated_bonus` | numeric | Default 0 |
| `created_at` | timestamptz | |

Unique constraint on `(employee_id, month)`. RLS enabled (public read/write policies + service_role).
Confirmed wired to real reads/writes via `GET/POST /api/hr/payroll`.

---

### `doctor_payroll`

**Added 2026-07-15.** Monthly payroll runs for `providers` (doctors) — fixed salary + commission,
separate from `hr_payroll`.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `provider_id` | UUID | FK → providers.id, cascade delete |
| `month` | text | Format `'YYYY-MM'` |
| `fixed_salary` | numeric | Default 0 |
| `commission_type` | text | Default `'none'` |
| `commission_value` | numeric | Default 0 |
| `completed_services_count` | integer | Default 0 |
| `total_commission_earned` | numeric | Default 0 |
| `net_salary` | numeric | Default 0 |
| `status` | text | Default `'Draft'` — `'Draft'` or `'Paid'` |
| `payment_date` | timestamptz | nullable |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

Unique constraint on `(provider_id, month)`. RLS disabled. Confirmed wired to real reads/writes
via `/api/hr/doctor-payroll`.

---

### `hr_leave_requests`

**Added 2026-07-06.**

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `employee_id` | UUID | FK → employee_accounts.id, cascade delete |
| `leave_type` | text | e.g. Sick, Annual, Casual, Unpaid |
| `start_date` | date | NOT NULL |
| `end_date` | date | NOT NULL |
| `days_count` | integer | NOT NULL |
| `reason` | text | nullable |
| `status` | text | Default `'Pending'` — Pending, Approved, Rejected |
| `approved_by` | UUID | FK → employee_accounts.id, nullable |
| `created_at` | timestamptz | |

Confirmed wired to real reads/writes via `/api/hr/leaves`.

---

### `hr_performance_reviews`

**Added 2026-07-06.**

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `employee_id` | UUID | FK → employee_accounts.id, cascade delete |
| `reviewer_id` | UUID | FK → employee_accounts.id, nullable |
| `review_date` | date | NOT NULL |
| `rating` | integer | CHECK 1–5 |
| `comments` | text | nullable |
| `goals` | text | nullable |
| `created_at` | timestamptz | |

Confirmed wired to real reads/writes via `/api/hr/performance`.

---

### `hr_attendance`

**Added 2026-06-26, extended 2026-07-06 and 2026-07-12.** Employee GPS check-in — distinct from
`provider_attendance` (doctors, no GPS).

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `employee_id` | UUID | FK → employee_accounts.id, cascade delete |
| `date` | date | Default `CURRENT_DATE` |
| `check_in_time` | timestamptz | Default now() |
| `check_out_time` | timestamptz | nullable — added 2026-07-12 |
| `latitude` | numeric | nullable — captured at check-in |
| `longitude` | numeric | nullable — captured at check-in |
| `status` | text | Default `'Present'` — Present, Late, Out of Location |
| `created_at` | timestamptz | |

Unique constraint on `(employee_id, date)`. Distance-vs-branch-coordinates check (800m geofence)
computed server-side in `POST /api/hr/attendance` — see RISK-006 in `RISKS.md`.

---

### `hr_missing_alerts`

**Added 2026-06-26.** Alerts for employees who missed check-in.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `employee_id` | UUID | FK → employee_accounts.id, cascade delete |
| `timestamp` | timestamptz | Default now() |
| `resolved` | boolean | Default false |
| `created_at` | timestamptz | |

Confirmed wired to real reads/writes via `/api/hr/alerts`.

---

### `employee_notes`

**Added 2026-07-15.** Administrative notes/reminders about an employee.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `employee_id` | UUID | FK → employee_accounts.id, cascade delete |
| `note` | text | NOT NULL |
| `created_by` | UUID | FK → employee_accounts.id, nullable |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

Confirmed wired to real reads/writes via `/api/employees/notes`.

---

### `provider_schedule_audit_logs`

**Added 2026-07-12.** Audit trail for changes to a doctor's working schedule.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `provider_id` | UUID | FK → providers.id, cascade delete |
| `provider_name` | text | NOT NULL — denormalized snapshot |
| `changed_by` | text | NOT NULL |
| `action` | text | NOT NULL |
| `previous_schedule` | JSONB | nullable |
| `new_schedule` | JSONB | nullable |
| `created_at` | timestamptz | NOT NULL |

Confirmed wired via `/api/providers/schedule-audit-logs`.

---

### `prescriptions`

**Added 2026-07-13.** Real Supabase table — **not mock UI** (superseded the earlier "mock only"
claim in `PROJECT.md`/`AGENTS.md`/`RISKS.md`, corrected 2026-07-21).

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `customer_id` | UUID | FK → customers.id, cascade delete |
| `patient_name` | text | NOT NULL — denormalized snapshot |
| `date` | date | Default `CURRENT_DATE` |
| `diagnosis` | text | nullable |
| `medications` | JSONB | Array of `{name, dosage, instructions}`, default `[]` |
| `general_notes` | text | nullable |
| `doctor_notes` | text | nullable — shown only to doctors, not printed |
| `follow_up_date` | date | nullable |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

Confirmed wired to real reads/writes via `/api/prescriptions` (falls back to a local
`data/prescriptions.json` file only if the Supabase call itself errors, not as a primary store).
Note: consultation notes, treatment plans, and before/after photos are **still mock UI** — only
prescriptions (diagnosis/medications/follow-up) got a real table.

---

### `inventory_products`

**Added 2026-07-20.** Real Supabase table — **not mock UI** (corrected 2026-07-21, see note above).

| Column | Type | Notes |
|---|---|---|
| `id` | text | Primary key |
| `name` | text | NOT NULL |
| `sku` | text | nullable |
| `category` | text | nullable |
| `price` | numeric | Default 0 — selling price |
| `cost_price` | numeric | Default 0 — purchase price |
| `stock_quantity` | integer | Default 0 |
| `min_stock_alert` | integer | Default 5 |
| `unit` | text | Default `'pcs'` |
| `status` | text | Default `'In Stock'` |
| `branch_name` | text | nullable — stored as a name string, not a `branch_id` FK |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

RLS enabled, public "allow all" policy. Confirmed wired via `/api/inventory/products` — dual-storage:
reads real table first, falls back to a `page_settings` JSON snapshot (key `'inventory_products'`)
only when the table is empty, then seeds the real table from it.

---

### `product_sales`

**Added 2026-07-20.** Point-of-sale transaction log. Real Supabase table — **not mock UI**.

| Column | Type | Notes |
|---|---|---|
| `id` | text | Primary key |
| `product_id` | text | FK → inventory_products.id, nullable on delete |
| `product_name` | text | NOT NULL — denormalized snapshot |
| `sku` | text | nullable |
| `quantity` | integer | Default 1 |
| `unit_price` | numeric | Default 0 |
| `total_price` | numeric | Default 0 |
| `customer_name` | text | nullable |
| `customer_phone` | text | nullable |
| `customer_email` | text | nullable |
| `cashier_name` | text | nullable |
| `branch_name` | text | nullable |
| `payment_method` | text | Default `'Cash'` |
| `notes` | text | nullable |
| `sale_date` | timestamptz | Default now() |
| `created_at` | timestamptz | |

Confirmed wired via `/api/inventory/products/sales` (the admin POS flow writes here). Note: the
"Finances Dashboard" analytics view still uses a separate hardcoded `MOCK_POS_ORDERS` constant for
its ledger display — the underlying sale records are real, the aggregate reporting UI is not.

---

### `inventory_devices`

**Added 2026-07-20.** Laser/medical equipment tracking (pulse counters). Real Supabase table —
**not mock UI**.

| Column | Type | Notes |
|---|---|---|
| `id` | text | Primary key |
| `name` | text | NOT NULL |
| `serial_number` | text | nullable |
| `model` | text | nullable |
| `branch_name` | text | nullable |
| `status` | text | Default `'Active'` |
| `total_pulses` | integer | Default 0 |
| `remaining_pulses` | integer | Default 0 |
| `max_pulses_limit` | integer | Default 0 |
| `last_maintenance_date` | timestamptz | nullable |
| `next_maintenance_date` | timestamptz | nullable |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

Confirmed wired via `/api/inventory/devices` and `/api/inventory/devices/[id]/reset-pulses`.

---

### `device_maintenance_history`

**Added 2026-07-20.** Maintenance/pulse-reset log per device.

| Column | Type | Notes |
|---|---|---|
| `id` | text | Primary key |
| `device_id` | text | FK → inventory_devices.id, cascade delete |
| `device_name` | text | NOT NULL — denormalized snapshot |
| `type` | text | Default `'Pulse Reset'` |
| `pulses_added` | integer | Default 0 |
| `notes` | text | nullable |
| `performed_by` | text | nullable |
| `date` | timestamptz | Default now() |
| `created_at` | timestamptz | |

---

## Schema Drift: Tables Queried by Code With No Migration File

Found while auditing this doc against `supabase/migrations/` (2026-07-21). These three tables
are queried by live API routes but were never created by any script in `supabase/migrations/` —
they exist in the live database only because someone ran ad-hoc SQL or created them via the
Supabase Table Editor UI outside the tracked migration history. **Whoever touches these next
should write a proper migration file for them** (see `supabase/migrations/README.md`) so they
stop being drift.

### `medical_records` (one row per customer — intake form)
Columns inferred from `src/app/api/medical-records/route.ts` upsert payload: `customer_id`
(unique, onConflict target), `skin_type`, `main_concerns` (array), `other_concerns_details`,
`has_previous_treatments` (bool), `previous_treatments_details`, `has_medical_conditions` (bool),
`medical_conditions_details`, `is_taking_medication` (bool), `medication_details`, `allergies`,
`updated_at`, `created_by_role`, `created_by_name`. Falls back to `data/medical_records.json` on
Supabase error (file-based, not the `page_settings` dual-storage pattern used elsewhere).

### `medical_reports` (many rows per customer — uploaded files/reports)
Columns inferred from the same route: `id` (text, `REP-<timestamp>` format), `customer_id`,
`title`, `description`, `file_url`, `doctor_name`, `date`, `created_at`. Falls back to
`data/medical_reports.json` on Supabase error.

### `customer_product_balances` (product units purchased vs. used per customer)
Columns inferred from `src/app/api/customers/products/route.ts`: `id`, `customer_id`,
`customer_name`, `customer_mobile`, `product_id`, `product_name`, `product_sku`,
`purchased_quantity`, `used_quantity`, `remaining_quantity`, `unit_price`, `total_amount`,
`status` (`'Active'`/`'Depleted'`), `created_at`, `updated_at`, `usage_history` (JSON array of
`{id, quantity_used, used_at, used_by, notes}`). Unlike the two tables above, this one **does**
follow the dual-storage pattern — falls back to a `page_settings` JSON snapshot (key
`'customer_product_balances'`) when the native table errors or is empty, same as
`inventory_products`.

---

## Notes on Schema Gaps

- Persistent patient records are stored in the `customers` table, and connected to `reservations` via `customer_id`.
- No `staff` table. Providers are stored with minimal fields (name, services list, rating) plus payroll/schedule fields added later.
- No `shifts` or `availability` table for providers. Availability is calculated by scanning reservations.
- Most tables have RLS **disabled** (service role key bypasses it anyway from the server). A subset (`roles`, `employee_accounts`, `hr_*`, `employee_notes`, `prescriptions`, `inventory_*`, `product_sales`) has RLS **enabled** with permissive "allow all"/public policies — functionally equivalent to disabled, since the policies don't restrict by role.
- `reservations.branch_id` is nullable — reservations without a branch are treated as "no branch" and are filtered separately.
- `reservations.date` is stored as `text`, not a native `date` column.
- Still genuinely mock UI (no table exists): consultation notes, treatment plans, before/after photos, Finances Dashboard aggregate reporting, Refunds, Shipping. See `PROJECT.md` and `RISKS.md` RISK-005 for the current, corrected list.
