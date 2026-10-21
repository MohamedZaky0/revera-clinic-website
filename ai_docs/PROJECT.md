# PROJECT.md — Revera Clinics Website & Admin System

> **Last Updated:** 2026-10-21 — re-audited against `dev` (stack versions, roles and portals, deployment model, API and
> test counts, known gaps). Engineering detail lives in `ARCHITECTURE.md`, `DB_SCHEMA.md`, `SECURITY.md`
> and `API_CONTRACT.md`; this file is the orientation page. Where a number below could drift (table count, route
> count, test count) it says how to re-measure it instead of promising it stays true.
> **Audited from:** live source code, cross-checked against `supabase/migrations/`.

---

## What Is This System?

A clinic management platform built for Revera Clinics (the first, reference client) and designed to be delivered as
one single-tenant instance per clinic. A Next.js (App Router) application with two faces:

1. **Public website** — the clinic's patient-facing site: hero slider, services catalog, packages, about, contact, ad
   landing pages, the booking modal and page, and patient sign-in (real phone/OTP through Supabase Auth).
2. **Staff panel** at `/admin` (and role portals such as `/doctor`) — bookings, reception, the doctor's session and
   schedule, patient records, laser-pulse and package engines, inventory and POS, HR and payroll, a real Finance
   section and a Reports section, role management, and website CMS. See `PRODUCT_SPECS.md` for the feature map with
   `LIVE`/`BETA`/`DEMO`/`PLANNED` status.

---

## Who Uses It?

| Role | Access | What They Do |
|---|---|---|
| Superadmin (clinic owner) | `/admin`, can open the doctor view | Everything, including permanent deletes and role changes |
| Admin | `/admin` | Manage bookings, services, providers, staff accounts (active/inactive, delete), CMS; finance only with an explicit permission grant |
| Doctor | `/doctor` portal (a role whose workspace is "doctor", DEC-113) | Own schedule, today's queue, live session, prescriptions, own profile and pay |
| Reception | `/admin` (standard workspace) | Create/approve bookings, checkout and settlement, reception dashboard |
| HR | `/admin` | Payroll, leaves, attendance, performance reviews |
| Custom roles | `/admin` or a role URL | Whatever the role's permission list grants (Role Management) |
| Patients / visitors | Public pages, `/profile` | Browse, book, sign in with phone OTP, see their own profile and wallet |

An admin can also be a doctor (`employee_accounts.is_also_doctor`, DEC-114). An account can be switched inactive
(`is_active`, DEC-117): it keeps its role and history but has no access.

---

## Current Deployment Model

- **Single-tenant, one Supabase project per clinic** (DEC-001). No `org_id` / `tenant_id`; `branch` is the topmost scoping unit.
- **Two environments for Revera:** `main` is **production** (live clinic data; the cutover to production happened in
  September 2026) and `dev` is the test environment with its own Supabase project. Schema changes reach production only
  when the owner applies the migration there; verify against the database, not the migration file (RISK-020).
- **Hosted on Vercel** (functions in Dublin `dub1`, next to Supabase eu-west-1, DEC-116). Database: Supabase (PostgreSQL).
- **Tables:** the access check (`scripts/check-anon-access.mjs`) counted 64 on both dev and production on 2026-10-21. `DB_SCHEMA.md`
  is the column-level reference; trust its table list, not a number written here.
- **Fork-per-client** for clients 2, 3, …: a copy of this codebase and a separate Supabase project per clinic, client
  values in `src/config/client.ts` (PROPOSAL-001, done). Multi-tenant SaaS is deferred to roughly the 10-client mark.
  Run `scripts/check-anon-access.mjs` on every new clinic project before handing it over.
- `ai_docs/` lives on the `dev` branch only and is not merged to `main`.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Database | Supabase (PostgreSQL), service-role access from API routes only; the browser holds the public anon key and has no table access (RLS, RISK-128) |
| Auth (patient) | Phone/OTP through Supabase Auth (real, RISK-003) |
| Auth (staff) | Supabase email/password at `/admin`; `employee_accounts` + `roles` give role and permissions; `GET /api/auth/me` returns them; every API route checks access server-side (see `SECURITY.md`) |
| Attendance | GPS geofence check-in per branch (800 m); admin/superadmin bypass |
| i18n | Public site: `LanguageContext` (EN/AR). Admin: its own `lang` state + `adminTranslations` |
| Tests | Vitest (jsdom for components), see `TESTING.md` |
| Icons / fonts | lucide-react; Marcellus (heading), Sora (body) |

---

## Repository Structure

```
src/
  app/            — pages (public site, /admin shell, role portals, landing pages, auth callbacks) and api/ route handlers
  components/     — public-site components; components/admin/ holds every admin section (the /admin page only composes them)
  lib/            — server and shared logic: access/auth helpers, money and ledger maths, packages and laser pulses, costing
  config/client.ts— per-client values (name, phone, WhatsApp, URLs, GTM id)
  contexts/       — LanguageContext
  middleware.ts   — bearer-token check for a short list of admin API prefixes
data/             — local JSON used only by a few legacy fallbacks (ARCHITECTURE.md → Dual-Storage Pattern)
supabase/migrations/ — SQL migration history (applied by hand; see its README)
scripts/          — SQL backfills, rollback-only DB tests, check-anon-access.mjs
scratch/          — dev scripts (seed, regression checks)
tests/            — Vitest: lib/, routes/, components/, regression/, helpers/
ai_docs/          — this documentation
```

`src/app/admin/page.tsx` is the shell and composer (about 11.7k lines as of 2026-10-21, down from 27.7k); do not add new
section logic to it (DEC-027). The route groups under `src/app/api/` (84 handlers on `dev` at this date) are listed in
`ARCHITECTURE.md`, method by method in `API_CONTRACT.md`, and by who may call them in `SECURITY.md`.

---

## Critical Known Gaps

- **Security posture:** every API route checks access in its own handler (`SECURITY.md` is the route-by-route table and
  lists the few routes that are public on purpose). The browser login gate alone is never sufficient. The "allow all" RLS
  policies that exposed staff, payroll and prescriptions to the public key were closed on 2026-10-21 (RISK-128).
- **Still mock UI** (hardcoded arrays, not Supabase): consultation notes, treatment plans, before/after photos, Refunds,
  Shipping, and the Customer Support ticket inbox. Finance, Reports and Marketing are real (DEC-097); Prescriptions, Payroll,
  Inventory and POS are real Supabase tables.
- **Services and categories are database-primary** (RISK-025); `serviceStore.ts` is only a client cache/toggle helper. Do not
  extend it (RISK-004).
- `customers` and `reservations` are linked: `reservations.customer_id` is a real FK to `customers.id` (`ON DELETE SET NULL`).
- Employee attendance relies on browser geolocation; GPS spoofing is not mitigated (RISK-006).
- The booking invoice PDF is generated client-side; print behaviour varies by browser.
- **Open risks:** the register in `RISKS.md` (status index at its top) is the list; at this date nine are open, among them
  RISK-104 (Finance revenue/cash reconciliation on production) and RISK-103 (unverified marketing claims on the laser landing pages).
- **Documented ahead of code:** the reception bot (`/api/bot/*`, its knowledge-base tables) is described in
  `ARCHITECTURE.md` and `DB_SCHEMA.md` but its code and migration are not committed to `dev` yet.
