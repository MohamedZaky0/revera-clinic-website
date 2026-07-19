# DB_SCHEMA.md — Revera Clinics Database Schema

> **Last Updated:** 2026-07-14
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

customers
  └──< prescriptions (customer_id FK)
  └──< reservations (customer_id FK)
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

### `prescriptions`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key, default gen_random_uuid() |
| `customer_id` | uuid | FK → customers.id, on delete cascade |
| `patient_name` | text | Patient name |
| `date` | date | Date of prescription, default CURRENT_DATE |
| `diagnosis` | text | Diagnosis text, nullable |
| `medications` | JSONB | Array of `{ name, dosage, instructions }`, default '[]' |
| `general_notes` | text | Public general notes, nullable |
| `doctor_notes` | text | Doctor-confidential notes, nullable |
| `follow_up_date` | date | Follow-up appointment date, nullable |
| `created_at` | timestamptz | default now() |
| `updated_at` | timestamptz | default now() |

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
| `id` | UUID | Primary key |
| `name` | text | Doctor name |
| `phone` | text | Contact phone, nullable |
| `gender` | text | 'Male' or 'Female', nullable |
| `age` | integer | Age, nullable |
| `specialty` | text | Medical specialty, nullable |
| `national_id` | text | National ID card number, nullable |
| `working_days_hours` | JSONB | Weekly schedule with optional multi-shifts array: `shifts?: { start, end }[]` |
| `online_working_days_hours` | JSONB | Weekly schedule for online video appointments |
| `branch_id` | UUID | FK → branches.id, default branch |
| `branch_ids` | JSONB | Array of branch UUIDs the doctor works at |
| `branch_schedules` | JSONB | Branch-specific override schedules |
| `fixed_salary` | numeric | Monthly salary component |
| `commission_type` | text | 'none', 'percentage', or 'fixed' |
| `commission_value` | numeric | Commission rate or flat amount |
| `services` | JSONB | Array of service names they perform |
| `rating` | numeric | Rating score (1-5) |
| `image` | text | Profile image URL, nullable |
| `start_date` | date | Hiring date, nullable |

---

### `employee_accounts`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `email` | text | Login email, unique |
| `name` | text | Full name |
| `phone` | text | Phone, nullable |
| `role` | text | 'admin', 'HR', 'Receptionist', etc. |
| `department` | text | 'Reception', 'Nursing', 'Administration', etc. |
| `shift` | text | 'Day', 'Night', or custom ranges |
| `salary` | numeric | Monthly basic salary |
| `national_id` | text | National ID number, nullable |
| `national_id_front` | text | Base64 or URL to ID front photo |
| `national_id_back` | text | Base64 or URL to ID back photo |
| `address` | text | Street address details |
| `contract_file` | text | File URL or Base64 binary representing contract document / files JSON |
| `contract_file_name` | text | Name of contract file |
| `required_target_amount` | numeric | Monthly revenue target to achieve |
| `bonus_percentage` | numeric | Achieved target reward percentage |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

---

### `employee_notes`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `employee_id` | UUID | FK → employee_accounts.id |
| `note` | text | Content of administrative note |
| `created_by` | UUID | FK → employee_accounts.id |
| `created_at` | timestamptz | |

---

### `hr_payroll`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `employee_id` | UUID | FK → employee_accounts.id |
| `month` | text | Month string (e.g. '2026-07') |
| `basic_salary` | numeric | Monthly base |
| `bonuses` | numeric | Achieved revenue target bonuses or manually input |
| `deductions` | numeric | Salary deductions |
| `net_salary` | numeric | Calculated net salary |
| `status` | text | 'Draft' or 'Paid' |
| `payment_date` | timestamptz | Date of payment, nullable |
| `target_amount_snapshot` | numeric | Target configuration copy for that month |
| `bonus_percentage_snapshot` | numeric | Bonus configuration copy for that month |
| `achieved_revenue` | numeric | Logged revenue generated by employee bookings |
| `calculated_bonus` | numeric | Target reward payout calculated |

---

### `hr_attendance`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `employee_id` | UUID | FK → employee_accounts.id |
| `date` | date | Attendance date |
| `check_in_time` | timestamptz | Clock in timestamp |
| `latitude` | numeric | GPS latitude coordinates |
| `longitude` | numeric | GPS longitude coordinates |
| `status` | text | 'Present', 'Late', or 'Absent' |

---

### `hr_leave_requests`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `employee_id` | UUID | FK → employee_accounts.id |
| `leave_type` | text | 'Sick', 'Annual', 'Casual', 'Unpaid' |
| `start_date` | date | Start of leave |
| `end_date` | date | End of leave |
| `days_count` | integer | Total count of calendar days |
| `reason` | text | Reason context |
| `status` | text | 'Pending', 'Approved', 'Rejected' |
| `approved_by` | UUID | FK → employee_accounts.id |

---

### `hr_performance_reviews`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `employee_id` | UUID | FK → employee_accounts.id |
| `reviewer_id` | UUID | FK → employee_accounts.id |
| `review_date` | date | Date of review |
| `rating` | integer | 1 to 5 stars rating |
| `comments` | text | Detailed comments |
| `goals` | text | Performance goals set |

---

### `hr_missing_alerts`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `employee_id` | UUID | FK → employee_accounts.id |
| `timestamp` | timestamptz | Time missing alert was generated |
| `resolved` | boolean | Is the alert resolved by admin |

---

### `provider_schedule_audit_logs`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `provider_id` | UUID | FK → providers.id |
| `provider_name` | text | Logged doctor name |
| `changed_by` | text | Admin email who changed it |
| `action` | text | Update actions context |
| `previous_schedule` | JSONB | Previous calendar state |
| `new_schedule` | JSONB | Applied calendar state |
| `created_at` | timestamptz | Log creation time |

---

### `page_settings`

| Column | Type | Notes |
|---|---|---|
| `key` | text | Primary key; only 'home' and settings keys used |
| `value` | JSONB | Full page content or configurations store |
| `updated_at` | timestamptz | |

---

## Notes on Schema Gaps

- Persistent patient records are stored in the `customers` table, and connected to `reservations` via `customer_id`.
- The `providers` table is used to store Doctor profiles and working shifts schedules (both in-clinic and online).
- No RLS (Row Level Security) policies are currently enforced on admin API queries, since the Next.js API routes use the Supabase service role key.

