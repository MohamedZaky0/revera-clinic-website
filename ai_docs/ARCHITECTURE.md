# ARCHITECTURE.md — Revera Clinics System Architecture

> **Last Updated:** 2026-07-25
> **Audited from:** live source code, cross-checked against `supabase/migrations/` (all previous content was for a different project — discarded)

---

## Stack

| Concern | Technology |
|---|---|
| Framework | Next.js 15 (App Router), TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui + CSS custom properties |
| Database | Supabase (PostgreSQL) |
| Storage | Supabase primary; local JSON fallback (`data/`) for providers + page_settings |
| Auth (admin) | Supabase Auth (email + password). Login form rendered in-page; session checked on mount via `supabase.auth.getSession()`. Employee role + permissions fetched from `employee_accounts` + `roles` tables via `/api/auth/me`. Hardcoded bypass: `superadmin@revera.com` → full permissions, no DB lookup. **Note:** `/api/*` routes are unprotected on the server side; the gate is browser-only. |
| Auth (patient) | Phone/OTP modal — UI-only; OTP is `setTimeout`-simulated, no real SMS |
| i18n | Custom `LanguageContext` (EN/AR, RTL/LTR) |
| Icons | lucide-react |
| Fonts | Google Fonts via next/font (Marcellus heading, Sora body) |
| Deployment | Vercel |

---

## Folder Structure

```
src/
├── app/
│   ├── layout.tsx                 Root layout: metadata, font vars, LanguageProvider
│   ├── page.tsx                   Homepage
│   ├── about/page.tsx
│   ├── services/page.tsx
│   ├── blog/page.tsx
│   ├── contact/page.tsx
│   ├── admin/page.tsx             Legacy admin shell/composer (browser login gate only; do not add new section logic here)
│   ├── profile/page.tsx           Patient profile + wallet + visit history
│   ├── auth/callback/page.tsx     Supabase auth callback: handles invite + recovery hash, redirects to /admin
│   └── api/
│       ├── reservations/route.ts  GET/POST/PATCH/DELETE bookings
│       ├── availability/route.ts  GET slot availability per service+branch
│       ├── services/route.ts      GET/POST/DELETE service catalog
│       ├── categories/route.ts    GET/POST/DELETE categories
│       ├── branches/route.ts      GET/POST/DELETE branches
│       ├── providers/route.ts     GET/POST/PATCH/DELETE providers (Supabase + JSON fallback)
│       ├── page-settings/route.ts GET/POST CMS content (Supabase + JSON fallback)
│       ├── clinic-settings/       GET/POST page_settings by key (alias for page-settings)
│       ├── customers/route.ts     GET/POST/DELETE customer records
│       ├── employees/route.ts     GET/POST/DELETE employee accounts + Supabase Auth invites
│       ├── roles/route.ts         GET/POST/DELETE roles with permissions array
│       ├── provider-attendance/   GET/POST provider check-in/out by date
│       ├── auth/me/route.ts       Verify JWT → return role + permissions from DB
│       ├── auth/employee-email/   Lookup employee email by employee_id
│       ├── rooms/route.ts         GET/POST/PATCH/DELETE rooms (per-branch clinical/admin rooms)
│       ├── service-rooms/route.ts GET/POST/DELETE service↔room junction
│       ├── prescriptions/route.ts GET/POST prescriptions (Supabase, local JSON fallback on error)
│       ├── hr/payroll/            GET/POST monthly payroll runs for employee_accounts
│       ├── hr/doctor-payroll/     GET/POST monthly payroll runs for providers (fixed+commission)
│       ├── hr/leaves/             GET/POST/PATCH leave requests
│       ├── hr/attendance/         GET/POST employee GPS check-in/out (800m geofence)
│       ├── hr/performance/        GET/POST performance reviews
│       ├── hr/alerts/             GET/POST missing-checkin alerts
│       ├── employees/notes/       GET/POST administrative employee notes
│       ├── providers/schedule-audit-logs/  GET provider schedule change history
│       ├── inventory/products/    GET/POST/PUT inventory products (+ /sales for POS transactions)
│       ├── inventory/devices/     GET/POST devices (+ /[id]/reset-pulses for maintenance)
│       ├── customers/products/    GET/POST/PATCH customer product purchase balances (`customer_product_balances` table, dual-storage with `page_settings` — fixed 2026-07-25, see DB_SCHEMA.md)
│       ├── medical-records/       GET/POST intake form + reports (`medical_records`/`medical_reports` tables — migration backfilled 2026-07-25)
│       ├── customer-avatars/      GET/POST avatar images — stored in `page_settings` (key `customer_avatars`), not a dedicated table
│       └── health/supabase/       Env var diagnostics
│
├── components/                   Public website UI components and admin submodules
│   ├── admin/                     Required location for every new admin section; legacy sections are extracted here incrementally
│   ├── Navbar.tsx
│   ├── HeroSlider.tsx
│   ├── ServicesSection.tsx        Services catalog + WhatsApp CTA
│   ├── HomeServicesSection.tsx    Homepage variant of services
│   ├── BookingModal.tsx           Patient booking flow (3 steps → reservations table)
│   ├── AuthModal.tsx              Patient phone/OTP login (UI-only, no backend wiring)
│   ├── AuthRedirectHandler.tsx    Detects invite/recovery hash on any page → redirects to /auth/callback
│   ├── SiteFooter.tsx
│   └── [other page sections]
│
├── lib/
│   ├── supabaseClient.ts          Browser Supabase client (anon key)
│   ├── supabaseServer.ts          Server Supabase client (service role key)
│   ├── services.ts                Static SERVICES array + CATEGORY_LABELS + 15-min slot logic
│   ├── serviceStore.ts            localStorage ↔ Supabase sync for services/categories/toggles
│   ├── translations.ts            Full EN/AR translation strings (~700 lines)
│   ├── image.ts                   Image compression utility
│   └── utils.ts                   cn() Tailwind helper
│
├── contexts/
│   └── LanguageContext.tsx        EN/AR state, isRTL flag, typed t() accessor
│
└── types/index.ts                 Branch, Translation, ServiceCard, BlogPost interfaces

public/images/                    Static assets (logo, heroes, service images, doctors)
data/                             JSON fallbacks (providers.json, page_settings.json, prescriptions.json)
scratch/                          Dev/seed scripts (not production code)
supabase/migrations/              SQL migration history (manual — run via Supabase SQL Editor, see its README)
```

---

## Data Flow

### Public Website (patient-facing)
```
Browser → Next.js page → LanguageContext (EN/AR) → component
    → GET /api/services (or /api/categories, /api/page-settings)
    → supabaseServer → Supabase
```
- Booking: `BookingModal` → `POST /api/reservations`
- Auth: `AuthModal` → phone/OTP UI only, no actual backend call

### Admin Panel
```
Browser → /admin/page.tsx (client component)
    → supabase.auth.getSession() → if no session → render login form
    → on login → supabase.auth.signInWithPassword()
    → GET /api/auth/me (Bearer token) → role + permissions
    → fetch() → Next.js API routes → supabaseServer → Supabase
```
- Reservations loaded on mount via `GET /api/reservations`
- Services/categories loaded from localStorage first (seeded from SERVICES constant),
  then synced to Supabase on save via `/api/services` and `/api/categories`
- Branch data: `GET /api/branches`
- Page settings: `GET|POST /api/page-settings`
- Customer records: `GET|POST|DELETE /api/customers`
- Employee accounts: `GET|POST|DELETE /api/employees`
- Roles: `GET|POST|DELETE /api/roles`
- Provider attendance: `GET|POST /api/provider-attendance`

**Auth flow for invited employees:**
1. Admin invites employee → `POST /api/employees` → Supabase sends invite email
2. Employee clicks link → `/auth/callback?next=/admin` → `AuthCallbackPage` reads token from hash
3. Supabase session established → redirect to `/admin?setup=true`
4. Admin page detects `setup=true` → prompts employee to set password

---

## Supabase Tables (confirmed from `supabase/migrations/` + API routes)

See `DB_SCHEMA.md` for full column-level detail — this is a purpose summary only, kept short
so it doesn't drift; update both when a table is added.

| Table | Purpose | Branch-scoped? |
|---|---|---|
| `reservations` | All bookings | Yes — `branch_id` column |
| `services` | Service catalog | Via `branch_pricing` JSON field |
| `categories` | Service categories | No |
| `branches` | Clinic branches | Root entity |
| `providers` | Doctors/staff | Yes — `branch_id` column (added 2026-06-26) |
| `page_settings` | CMS content (JSONB) | No — multiple keys; also used as a JSON fallback store for several other tables (dual-storage pattern) |
| `customers` | Patient/customer records with demographics | No |
| `employee_accounts` | Admin/staff accounts linked to Supabase Auth | Yes — `branch_id` column |
| `roles` | Role definitions with permissions array | No |
| `provider_attendance` | Daily check-in/out per doctor (no GPS) | No |
| `rooms` | Physical rooms per branch, for room-based booking | Yes |
| `service_rooms` | Junction: which rooms a service can use | Via `rooms` |
| `hr_payroll` | Monthly payroll runs for `employee_accounts` | No |
| `doctor_payroll` | Monthly payroll runs for `providers` (fixed+commission) | No |
| `hr_leave_requests` | Employee leave requests | No |
| `hr_performance_reviews` | Employee performance reviews | No |
| `hr_attendance` | Employee GPS check-in/out (800m geofence) | Via `employee_accounts.branch_id` |
| `hr_missing_alerts` | Missed-checkin alerts | No |
| `employee_notes` | Administrative notes about an employee | No |
| `provider_schedule_audit_logs` | Audit trail for doctor schedule changes | No |
| `prescriptions` | Real (not mock) — diagnosis/medications/follow-up per customer | No |
| `inventory_products` | Real (not mock) — product catalog + stock | Via `branch_name` (text, not FK) |
| `product_sales` | Real (not mock) — POS transaction log | Via `branch_name` (text, not FK) |
| `inventory_devices` | Real (not mock) — laser/medical equipment + pulse counters | Via `branch_name` (text, not FK) |
| `device_maintenance_history` | Maintenance/pulse-reset log per device | No |
| `medical_records` | Medical intake form, one row per customer | No |
| `medical_reports` | Uploaded medical reports/files per customer | No |
| `customer_product_balances` | Retail product units purchased vs. used per customer | No |

**`branch` is the topmost scoping unit. There is no org/tenant layer above it.**

---

## Dual-Storage Pattern

Several routes (providers, page-settings) use Supabase as primary with local JSON fallback:
1. Try Supabase read/write
2. On error → fall back to `data/*.json`
3. On empty Supabase → seed defaults, return them

This was a development convenience and creates a split-brain risk in production.

---

## Brand Token System

Brand colors are defined as CSS custom properties in `src/app/globals.css`:

```css
:root {
  --color-brand-primary: #414E36;    /* Deep Olive Green */
  --color-brand-accent:  #C4AE7C;    /* Warm Royal Gold */
  --color-brand-dark:    #1F251A;
  --color-brand-sand:    #F2EFE9;
  --color-brand-light:   #FBFBF9;
  /* aliases: --cr-primary, --cr-accent, --cr-dark, etc. */
}
```

**Problem:** Many components bypass the CSS variables and use raw hex inline (Tailwind JIT classes like `bg-[#414E36]`). See `RISKS.md` → RISK-001 and `PROPOSALS.md` for the fix plan.

---

## i18n Architecture

- `LanguageContext` holds `language` ("en"|"ar"), `isRTL`, and `t` (typed translation accessor).
- `translations.ts` exports `Record<"en"|"ar", Translation>` — all UI copy is here.
- The admin panel forces `dir="ltr"` and `lang="en"` on mount, bypassing the context.
- Page `<head>` metadata is hardcoded in English per page (not driven by translations).
