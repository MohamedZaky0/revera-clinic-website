# DB_SCHEMA.md — Revera Clinics Database Schema

> **Last Updated:** 2026-07-20
> **Database:** Supabase (PostgreSQL)
> **Audited from:** live API routes + TypeScript types (no migration files exist in the repo)
> **Previous content was for a different project — discarded entirely**

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
  └──< provider_attendance (branch_id FK)

services
  └──< reservations (service_id FK)

categories
  (no FK to branches — global)

providers
  (no FK to branches — global, but services[] JSON array references service names)
  └──< provider_attendance (provider_id FK)

page_settings
  (key/value CMS store — key='home' for homepage content)

employee_accounts
  └──> roles (role_id FK)
  └──> branches (branch_id FK, nullable)

roles
  (permission array; referenced by employee_accounts.role_id)
```

---

## Table Definitions

All table structures are inferred from API routes and TypeScript types since no `.sql` migration
files exist in the repository.

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
| `service_hours` | JSONB | Array of branch-specific hours, nullable |
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
| `service_id` | integer | FK → services.id |
| `date` | date | Booking date (YYYY-MM-DD) |
| `requested_time` | text | Patient-requested time (free text), nullable |
| `name` | text | Patient full name |
| `email` | text | Patient email |
| `phone` | text | Patient phone |
| `notes` | text | Patient notes |
| `status` | text | 'pending', 'approved', 'rejected', 'confirmed', 'started', 'completed', 'cancelled' |
| `time_slot` | text | Assigned 15-min slot (e.g., '09:00'), nullable — set on approve |
| `session_type` | text | 'in_person' or 'online' |
| `origin` | text | Booking source, e.g., 'website' — displayed as badge |
| `cancelled_reason` | text | Reason for cancellation, nullable |
| `doctor_name` | text | Assigned doctor name, nullable |
| `branch_id` | UUID | FK → branches.id, nullable |
| `customer_id` | UUID | FK → customers.id, nullable |
| `created_at` | timestamptz | |

**Business rules enforced in code:**
- Max 8 approved bookings per service per day per branch (checked in PATCH approve action)
- A time_slot can only be assigned once per service per date per branch

---

### `services`

| Column | Type | Notes |
|---|---|---|
| `id` | integer | Primary key |
| `en` | text | English name |
| `ar` | text | Arabic name |
| `img` | text | Image path |
| `cat` | text | Category key (FK-by-convention → categories.key) |
| `unit` | text | 'session', etc. |
| `price` | numeric | nullable |
| `sort_order` | integer | |
| `duration` | text | e.g., '1:00 Hours', '30 mins' |
| `description_en` | text | nullable |
| `description_ar` | text | nullable |
| `is_shared` | boolean | |
| `enable_reminder` | boolean | |
| `branch_pricing` | JSONB | Array of `{name, price, visible, status, isDefault}` |
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

### `providers`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID or text | Primary key |
| `name` | text | Doctor name |
| `bookings_count` | integer | Total booking count |
| `services` | JSONB | Array of service name strings |
| `more_count` | integer | Additional services count |
| `rating` | numeric | |

---

### `page_settings`

| Column | Type | Notes |
|---|---|---|
| `key` | text | Primary key; only 'home' used currently |
| `value` | JSONB | Full page content tree (hero slides EN+AR, about, results, etc.) |
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
| `id` | UUID | Primary key; mirrors Supabase Auth user ID |
| `email` | text | Supabase Auth email |
| `name` | text | Display name |
| `role_id` | UUID | FK → roles.id |
| `branch_id` | UUID | FK → branches.id, nullable |
| `active` | boolean | Default true |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

---

### `roles`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `name` | text | Role name, e.g., 'superadmin', 'admin', 'receptionist' |
| `permissions` | JSONB | Array of permission strings |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

---

### `provider_attendance`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `provider_id` | UUID/text | FK → providers.id |
| `branch_id` | UUID | FK → branches.id |
| `date` | date | Attendance date |
| `check_in` | timestamptz | Nullable |
| `check_out` | timestamptz | Nullable |
| `location` | JSONB | `{ lat, lng, distance_meters }` captured at check-in |
| `status` | text | e.g., 'checked_in', 'checked_out', 'absent' |
| `notes` | text | Nullable |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

---

## Notes on Schema Gaps

- Persistent patient records are stored in the `customers` table, and connected to `reservations` via `customer_id`.
- No `staff` table. Providers are stored with minimal fields (name, services list, rating).
- No `shifts` or `availability` table. Availability is calculated by scanning reservations.
- No RLS (Row Level Security) policies confirmed — Supabase service role key is used server-side for all operations, bypassing RLS.
- `reservations.branch_id` is nullable — reservations without a branch are treated as "no branch" and are filtered separately.
