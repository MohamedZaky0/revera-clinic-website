# DB_SCHEMA.md — Revera Clinics Database Schema

> **Last Updated:** 2026-06-27
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

services
  └──< reservations (service_id FK)

categories
  (no FK to branches — global)

providers
  (no FK to branches — global, but services[] JSON array references service names)
  └──< provider_attendance (provider_id FK)

page_settings
  (key/value CMS store — key='home' for homepage content; other keys used by clinic-settings)

customers
  (standalone — no FK to branches or reservations)

employee_accounts
  (linked to Supabase Auth via auth_user_id; role_name is a soft FK to roles.name)

roles
  (permissions array drives what each employee sees in admin panel)
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
| `created_at` | timestamptz | nullable |
| `updated_at` | timestamptz | nullable |

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
| `status` | text | 'pending', 'approved', 'rejected' |
| `time_slot` | text | Assigned 15-min slot (e.g., '09:00'), nullable — set on approve |
| `session_type` | text | 'in_person' or 'online' |
| `doctor_name` | text | Assigned doctor name, nullable |
| `branch_id` | UUID | FK → branches.id, nullable |
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

---

### `customers`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `name` | text | Full name (required) |
| `mobile` | text | Phone number (required, unique) |
| `email` | text | nullable, unique |
| `gender` | text | nullable |
| `age` | integer | nullable |
| `national_id` | text | nullable |
| `address` | text | nullable |
| `referral` | text | Referral source, nullable |
| `occupation` | text | nullable |
| `active` | boolean | default true |
| `spent_amount` | numeric | default 0 |
| `outstanding` | numeric | default 0 |
| `area` | text | nullable |
| `location_name` | text | nullable |
| `street_name` | text | nullable |
| `building_no` | text | nullable |
| `floor_no` | text | nullable |
| `note` | text | nullable |
| `registration_date` | timestamptz | set on insert |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Note:** Customer `active` status is calculated dynamically from recent bookings (last 2 weeks), not a manually set flag.

---

### `employee_accounts`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `auth_user_id` | UUID | FK → Supabase Auth `auth.users.id` |
| `employee_id` | text | Unique identifier (email address used as value) |
| `email` | text | Must match Supabase Auth email |
| `name` | text | Full name |
| `role_name` | text | Soft FK → `roles.name` |
| `created_at` | timestamptz | |

**Superadmin bypass:** `superadmin@revera.com` is handled in `/api/auth/me` without a DB lookup — it always returns full permissions regardless of any DB record.

Protected: `employee_id = 'superadmin'` cannot be deleted via API.

---

### `roles`

| Column | Type | Notes |
|---|---|---|
| `name` | text | Primary key (lowercase alphanumeric, no spaces) |
| `permissions` | JSONB | Array of permission strings (e.g., `["Bookings", "Customers"]`) |
| `updated_at` | timestamptz | |

Known permission strings (from `/api/auth/me` superadmin default): `'Bookings'`, `'Customers'`, `'Providers'`, `'Services'`, `'Settings'`.

Protected: `name = 'superadmin'` cannot be deleted via API.

---

### `provider_attendance`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `provider_id` | text/UUID | FK → providers |
| `date` | date | YYYY-MM-DD |
| `status` | text | e.g., 'present', 'absent', 'late' |
| `check_in` | text | Time string, nullable |
| `check_out` | text | Time string, nullable |
| `notes` | text | nullable |
| `updated_at` | timestamptz | |

Unique constraint: `(provider_id, date)` — upserted on conflict.

---

## Notes on Schema Gaps

- No RLS (Row Level Security) policies confirmed — Supabase service role key is used server-side for all operations, bypassing RLS.
- `reservations.branch_id` is nullable — reservations without a branch are treated as "no branch" and are filtered separately.
- `customers` is not linked to `reservations` — there is no FK connecting a booking to a customer record. They are parallel data.
- `employee_accounts.role_name` is a soft FK (string match) to `roles.name` — no DB-level FK constraint enforced.
