# PROJECT.md — Revera Clinics Website & Admin System

> **Last Updated:** 2026-09-30 (partial — "Critical Known Gaps" section corrected; the rest of this
> file predates the Finance module, the `/admin` auth hardening and the Finance/Reports split and has
> not been re-audited line by line. Trust `ai_docs/DB_SCHEMA.md`, `SECURITY.md` and `PRODUCT_SPECS.md`
> over this file where they disagree.)
> **Audited from:** live source code, cross-checked against `supabase/migrations/` (no trust placed in stub files)

---

## What Is This System?

A Next.js (App Router) web application serving two purposes:

1. **Public Website** — Revera Clinics' patient-facing marketing site: hero slider, services catalog, about, contact, blog stub, booking modal, and patient auth modal.
2. **Admin Panel** — Internal management interface at `/admin` for the clinic owner/receptionist: bookings management, service/category CRUD, branch management, provider records, and website CMS (page content editing).

---

## Who Uses It?

| Role | Access | What They Do |
|---|---|---|
| Clinic owner / admin | `/admin`, Supabase email/password login | Manage bookings, services, providers, branches, page content, finance |
| Receptionist | `/admin` | Approve/reject/create bookings, view customer list |
| Patients / website visitors | Public pages | Browse services, read about clinic, submit booking request |

---

## Current Deployment Model

- **Single-tenant:** One Supabase project, one deployment — exclusively for Revera Clinics.
- **Hosted on Vercel** (Next.js, App Router).
- **Database:** Supabase (PostgreSQL) — 60+ tables as of 2026-09-30 (the Finance module alone added
  invoices/invoice_lines/payments/wallet_txns/expenses/fixed_assets/loans and more). Full current list
  with columns: `ai_docs/DB_SCHEMA.md` — trust that file's own table count, not the number on this line.
- **No multi-tenancy.** No org/tenant layer in the schema.

---

## Fork-per-Client Plan (Deferred)

For clients #2, #3, etc., the plan is to **duplicate/fork this codebase** per client:
- Separate Supabase project per client
- Edit theme/colors/copy per client
- No shared SaaS infrastructure

This is explicitly NOT a multi-tenant SaaS build. That decision is gated to approximately the 10-client mark. See `DECISIONS.md` for rationale.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Database | Supabase (PostgreSQL) |
| Auth (patient) | Phone/OTP modal — UI-only in current code (OTP not wired to real SMS) |
| Admin auth | Supabase email/password — login form rendered in `/admin`, session checked on mount; employees invited via Supabase Auth; roles/permissions from `employee_accounts` + `roles` tables; `/api/auth/me` returns role + permissions |
| Attendance | GPS geofence check-in per branch with 800m radius; admin/superadmin bypass |
| i18n | Custom LanguageContext (EN/AR) with translations.ts |
| Icons | lucide-react |
| Fonts | Marcellus (heading), Sora (body) |

---

## Repository Structure

```
src/
  app/
    page.tsx              — Homepage
    layout.tsx            — Root layout + metadata
    admin/page.tsx        — Admin panel shell/composer (11.3k lines as of 2026-09-30, down from
                            27.7k — most sections are extracted into src/components/admin/, see
                            ARCHITECTURE.md; do not add new section logic here, DEC-027)
    profile/page.tsx      — Patient profile + wallet + visit history
    auth/callback/page.tsx — Supabase invite/recovery redirect handler
    about/page.tsx
    services/page.tsx
    blog/page.tsx
    contact/page.tsx
    api/
      reservations/       — Booking CRUD + lifecycle/payment/wallet
      availability/       — Slot availability check
      services/           — Service catalog CRUD
      categories/         — Category CRUD
      branches/           — Branch CRUD
      providers/          — Provider CRUD (Supabase + JSON fallback)
      page-settings/      — CMS content CRUD (Supabase + JSON fallback)
      clinic-settings/    — Alias for page_settings by key
      customers/          — Customer profile CRUD
      employees/          — Employee accounts + Supabase Auth invites
      roles/               — Role definitions with permissions
      provider-attendance/ — Daily provider check-in/out
      auth/me/             — Verify JWT + return role/permissions
      auth/employee-email/ — Lookup employee email by employee_id
      rooms/, service-rooms/ — Room CRUD + service↔room junction
      prescriptions/       — Real Supabase table (not mock — see DB_SCHEMA.md)
      hr/payroll/, hr/doctor-payroll/ — Monthly payroll (staff / doctors, separately)
      hr/leaves/, hr/attendance/, hr/performance/, hr/alerts/ — HR suite (real Supabase)
      employees/notes/     — Administrative employee notes
      providers/schedule-audit-logs/ — Doctor schedule change history
      inventory/products/, inventory/devices/ — Real Supabase inventory + POS (not mock)
      customers/products/, medical-records/ — real Supabase tables, migration backfilled 2026-07-25 (see DB_SCHEMA.md)
      customer-avatars/ — stored in `page_settings` (key `customer_avatars`), not a dedicated table
      health/supabase/    — Env/connection diagnostics
  components/             — All public website components
  lib/
    supabaseClient.ts     — Browser Supabase client
    supabaseServer.ts     — Server-side Supabase client (service role)
    services.ts           — Static service/category definitions + slot logic
    serviceStore.ts       — localStorage ↔ Supabase sync for services/categories
    translations.ts       — Full EN/AR translation strings (large file)
    image.ts              — Image compression utility
    utils.ts              — cn() helper
  types/index.ts          — Branch, Translation, ServiceCard, BlogPost types
  contexts/LanguageContext.tsx
data/
  providers.json          — JSON fallback for providers
  page_settings.json      — JSON fallback for page settings
public/images/            — Static images (logo, heroes, services, doctors)
ai_docs/                  — This documentation folder
scratch/                  — Dev scripts (DB seed, test queries)
supabase/migrations/      — SQL migration history (manual — see its README)
```

---

## Critical Known Gaps

- **Corrected 2026-09-30 (was stale):** admin auth is **not** "client-side login gate only" anymore.
  Real Supabase email/password auth plus per-route server-side authorization exist across most of
  `/api/*` (`requireStaffAccess`/`requireAdministratorAccess`/`requireSuperadminAccess`/
  `requireFinanceAccess`/`hasGranularPermission`) — see `SECURITY.md` for the current, route-by-route
  picture; do not trust this line's 2026-07-25 claim.
- Patient OTP auth is **real**, not simulated — through actual Supabase Auth (RISK-003, resolved
  2026-07-22). Do not trust an older claim that it is UI-only.
- **Corrected 2026-07-21:** Prescriptions, Payroll (both `hr_payroll` and `doctor_payroll`), Inventory (products/devices), and POS (`product_sales`) are **real Supabase tables with real API routes** — see `DB_SCHEMA.md`. They were previously mislabeled mock UI in this doc; that was wrong as of the 2026-07-20/21 migrations.
- Still genuinely mock UI (hardcoded constant arrays, not Supabase): consultation notes, treatment plans, before/after photos (clinical, not the `prescriptions` table), Refunds, Shipping, and the Customer Support ticket inbox. The old "Finances Dashboard" mock view no longer exists — Finance is real (see below).
- **Corrected 2026-09-30 (was stale — DEC-011 is superseded, not current):** Finance, Reports and
  Marketing are no longer disabled placeholders — they are real, built-out sections (Finance: records
  + statements, DEC-097; Reports: performance/operations/patient analysis, also DEC-097; Marketing:
  packages + promotions). Customer Support remains a disabled/mock stub. See `PRODUCT_SPECS.md` for
  the current, marketing-facing status of every feature (`LIVE`/`BETA`/`DEMO`/`PLANNED` tags).
- localStorage is used as primary storage for services/categories on the admin side (Supabase is secondary/fallback in several places).
- **Corrected 2026-09-30 (was stale):** `customers` and `reservations` **are** linked —
  `reservations.customer_id` is a real FK to `customers.id` (`ON DELETE SET NULL`), added in the
  `20260726000000_dev_schema_baseline.sql` migration. See `DB_SCHEMA.md`.
- Employee attendance relies on browser geolocation — GPS spoofing is not mitigated.
- Booking invoice PDF is generated client-side; print behavior varies by browser.
