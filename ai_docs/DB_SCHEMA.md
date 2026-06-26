# DB_SCHEMA.md — Revera Clinics Database Schema

> **Last Updated:** 2026-06-26
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

page_settings
  (key/value CMS store — key='home' for homepage content)
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

## Notes on Schema Gaps

- No `patients` or `users` table confirmed in the database. Patient info is collected per-reservation (name/email/phone) only — no persistent patient records.
- No `staff` table. Providers are stored with minimal fields (name, services list, rating).
- No `shifts` or `availability` table. Availability is calculated by scanning reservations.
- No RLS (Row Level Security) policies confirmed — Supabase service role key is used server-side for all operations, bypassing RLS.
- `reservations.branch_id` is nullable — reservations without a branch are treated as "no branch" and are filtered separately.
