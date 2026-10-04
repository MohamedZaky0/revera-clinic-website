# ARCHITECTURE.md — Revera Clinics System Architecture

> **Last Updated:** 2026-09-30 — Stack, Folder Structure, Data Flow, Supabase Tables, Dual-Storage,
> Brand Tokens and i18n sections re-audited against the current code (this reconciles two independent
> passes made the same day: the Auth-row/header fix in commit `f449423`, and a separate pass covering
> everything else that was never committed before this).
> **Audited from:** live source code, cross-checked against `supabase/migrations/` (all previous content was for a different project — discarded)

---

## Stack

| Concern | Technology |
|---|---|
| Framework | Next.js 15 (App Router), TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui + CSS custom properties |
| Database | Supabase (PostgreSQL) |
| Storage | Supabase is the source of truth. A few legacy routes still fall back to local JSON in `data/` (see Dual-Storage Pattern) — that fallback does not work on Vercel (read-only filesystem) |
| Auth (admin) | Supabase Auth (email + password). Login form rendered in-page; session checked on mount via `supabase.auth.getSession()`. Employee role + permissions fetched from `employee_accounts` + `roles` tables via `/api/auth/me`. The `superadmin@revera.com` hardcoded bypass no longer exists in the code (RISK-008, mitigated 2026-07-22). **Server-side enforcement:** `src/middleware.ts` validates the bearer token against Supabase for `/api/employees`, `/api/hr/*`, `/api/roles` and `/api/providers/schedule-audit-logs`. Every other route enforces access in its own handler through the helpers in `src/lib/access.ts` (`requireStaffAccess`, `requireAdministratorAccess`, `requireSuperadminAccess`, `requireFinanceAccess`, `hasGranularPermission`) or `requireBotSecret` (`src/lib/botAuth.ts`, n8n bot routes). Coverage is broad but per-route, not universal — `SECURITY.md` has the route-by-route table and the intentionally public routes. The browser login gate alone is never sufficient. |
| Auth (patient) | Phone/OTP modal — **real**, not simulated, since 2026-07-22 (RISK-003 resolved): `AuthModal.tsx` calls `supabase.auth.signInWithOtp`/`verifyOtp` directly; the old `123456` demo bypass is gone. **Note:** `CLAUDE.md`'s hard rule 4 ("Patient OTP auth is UI-only / simulated") is stale and contradicts this — flagged for Mohamed to update, not edited here. |
| i18n | Public site: custom `LanguageContext` (EN/AR, RTL/LTR). Admin panel: its own `lang` state + `adminTranslations` (EN/AR) |
| Icons | lucide-react |
| Fonts | Google Fonts via next/font (Marcellus heading, Sora body) |
| Automation | n8n reception bot reads via `/api/bot/*` (shared-secret) and `/api/reception/dashboard`; its knowledge base and chat memory live in Supabase |
| Tests | Vitest (`tests/`), rollback-only SQL tests (`scripts/db_tests/`) — see `TESTING.md` |
| Deployment | Vercel |

---

## Folder Structure

Grouped by area rather than file-by-file: the API tree has ~90 route handlers and the admin
components ~90 files, so a full listing goes stale within a week. Use `Glob`/`ls` for the exact
list; this section says where things live and what the conventions are.

```
src/
├── middleware.ts                  Bearer-token check (Supabase /auth/v1/user) for a short list of admin API prefixes; matcher is /api/:path*
├── app/
│   ├── layout.tsx                 Root layout: metadata, font vars, LanguageProvider, mounts GlobalBookingModal (Quick Book popup)
│   ├── page.tsx, about/, services/, blog/, contact/, privacy/, terms/   Public marketing pages
│   ├── book/page.tsx              Dedicated booking page (DEC-040) — renders BookingModal variant="page"
│   ├── laser-tagamoa/, laser-men-tagamoa/, laser-tagamoa/dark-skin/     Ad landing pages (LaserLanding variants, components/landing/)
│   ├── login/page.tsx             Staff login entry
│   ├── profile/page.tsx           Patient profile + wallet + visit history
│   ├── auth/callback/, auth/setup/   Supabase invite/recovery callback and first-password setup
│   ├── admin/page.tsx             Admin shell/composer (~11k lines): login gate, sidebar, section routing. Do not add new section logic here
│   ├── admin/[role]/, [role]/     Role-portal routes (e.g. doctor portal) — both just render AdminPage with portalRole
│   └── api/                       Route handlers, grouped below
│
├── components/
│   ├── admin/                     Required home for every admin section (legacy sections are extracted here incrementally)
│   │   ├── Finance/               Finance section: overview, expenses, assets, loans, budget, cash flow, commission payouts, deferred packages
│   │   ├── reports/               Reports section (DEC-097): capacity, service mix/margin, doctor/branch P&L, package profitability, new-vs-returning, no-show cost
│   │   ├── bookings/  patients/  doctor/  employees/  hr/  inventory/  services/  packages/  transactions/  reception/  marketing/  settings/  support/
│   │   ├── DoctorAccountView.tsx, UserProfileView.tsx
│   │   └── translations.ts        adminTranslations (EN/AR) — admin panel copy
│   ├── landing/                   Ad-landing components (LaserLanding, tracking, fonts)
│   ├── ui/                        Small shared primitives (button, date/time pickers)
│   └── *.tsx                      Public-site sections (Navbar, HeroSlider, ServicesSection, BookingModal, BookingPageClient, GlobalBookingModal, AuthModal, AuthRedirectHandler, SiteFooter, …)
│
├── lib/                           Server + shared logic. Money/stock/pulse maths lives here as pure functions so it can be unit-tested:
│   ├── supabaseClient.ts / supabaseServer.ts   Browser (anon) vs server (service role) clients
│   ├── access.ts, auth.ts, authHeaders.ts, roleUtils.ts   Authorization helpers (see SECURITY.md)
│   ├── botAuth.ts, botTools.ts    Reception-bot shared-secret check and response shaping
│   ├── billing.ts, ledger.ts, transactionLedger.ts, financeBridge.ts, wallet.ts, customerBalances.ts, historicalInvoice.ts   Invoicing / payments / ledger
│   ├── packages.ts, historicalPackages.ts, laserRate.ts, laserDeficit.ts   Packages and laser pulses
│   ├── costing.ts, inventoryBalances.ts, depreciation.ts, expenses.ts, breakeven.ts, capacity.ts, serviceMix.ts, providerCommissions.ts, financeReportRange.ts   Costing, stock and Finance/Reports maths
│   ├── customerIdentity.ts        Patient identity matching
│   ├── services.ts, serviceStore.ts   Service types/slot logic; serviceStore is now only a client-side cache/toggle helper (services are DB-primary — RISK-025)
│   ├── translations.ts            Public-site EN/AR strings (~750 lines)
│   └── landing*.ts, printUtils.ts, geo.ts, image.ts, utils.ts, fetchCache.ts   Misc helpers
│
├── config/client.ts               Per-client values (name, phone, WhatsApp, URLs, GTM id, storage prefix) — edited per fork (PROPOSAL-001, executed 2026-09-30, DEC-099)
├── contexts/LanguageContext.tsx   Public-site EN/AR state, isRTL flag, typed t() accessor
└── types/index.ts                 Shared interfaces

public/images/                     Static assets
data/                              Local JSON used only by the legacy fallbacks listed under Dual-Storage Pattern
scratch/                           Dev/seed/check scripts (not production code)
scripts/                           One-off SQL backfills and rollback-only DB tests (scripts/db_tests/)
tests/                             Vitest: lib/, routes/, components/, regression/, helpers/ (see TESTING.md)
supabase/migrations/               SQL migration history (~67 files; applied with the Supabase CLI — see its README)
```

### API route groups (`src/app/api/`)

| Group | Routes | Notes |
|---|---|---|
| Booking | `reservations` (+ `previous`, `laser-deficit`), `reservation-products`, `availability`, `rooms`, `service-rooms` | Public booking + admin bookings; `reservations/previous` is staff-only (RISK-080) |
| Catalog | `services`, `categories`, `branches`, `service-consumables`, `service-devices`, `packages` (+ `sell`, `consume`, `extend`), `terms` | GET public where the site needs it; writes are staff/granular-permission gated |
| People | `customers` (+ `packages`, `package-redemptions`, `products`, `reconcile`, `settle-debt`), `customer-avatars`, `medical-records` (+ `templates`), `prescriptions`, `providers` (+ `schedule-audit-logs`), `provider-attendance` | Patient identity-scoped checks on `customers`; PHI routes are staff-only |
| Staff / HR | `employees` (+ `notes`), `roles`, `hr/*` (payroll, doctor-payroll, leaves, attendance, performance, alerts), `auth/me`, `auth/employee-email` | Covered by `src/middleware.ts` and handler checks |
| Money | `invoices`, `transactions` (+ `audit-logs`), `expenses` (+ `categories`, `recurring`, `generate-due`), `assets` (+ `post-depreciation`), `loans`, `purchases`, `suppliers` | Finance-permission gated (RISK-107/108/109) |
| Inventory | `inventory/products` (+ `sales`, `reconcile`), `inventory/devices` (+ `[id]/reset-pulses`, `audit-logs`), `laser-pulses` | POS, stock and device pulse counters |
| Analytics | `finance/*` (pnl, cashflow, receivables-aging, budget-vs-actual, doctor-pnl, branch-pnl, service-margin, service-mix, capacity, trend, …) | Read-only aggregates behind the Finance and Reports sections |
| CMS | `page-settings`, `clinic-settings` (alias), `translate` | Public-site content (JSONB in `page_settings`) |
| Bot | `bot/*` (availability, branches, doctors, packages, products, services, settings, terms), `reception/dashboard` | n8n reception bot; `bot/*` uses `requireBotSecret`, not user JWTs |
| Ops | `health/supabase` | Env-var diagnostics |

---

## Data Flow

### Public Website (patient-facing)
```
Browser → Next.js page → LanguageContext (EN/AR) → component
    → GET /api/services (or /api/categories, /api/page-settings)
    → supabaseServer → Supabase
```
- Booking: `BookingModal` → `POST /api/reservations`
- Auth: `AuthModal` → real Supabase Auth OTP (`signInWithOtp`/`verifyOtp`), not UI-only

### Admin Panel
```
Browser → /admin/page.tsx (client component)
    → supabase.auth.getSession() → if no session → render login form
    → on login → supabase.auth.signInWithPassword()
    → GET /api/auth/me (Bearer token) → role + permissions
    → fetch() → Next.js API routes → supabaseServer → Supabase
```
- Every admin fetch sends the session's bearer token; sections are separate components under `components/admin/` that receive data/handlers from the shell
- Reservations loaded on mount via `GET /api/reservations`
- Services/categories are database-primary: `loadServicesFromApi`/`syncServicesToApi` and the category helpers call `/api/services` and `/api/categories` (RISK-025). `serviceStore.ts` remains only as a client-side cache/toggle helper — do not extend it (RISK-004)
- Branch data: `GET /api/branches`; page settings: `GET|POST /api/page-settings`
- Customers, employees, roles, providers, attendance: `/api/customers`, `/api/employees`, `/api/roles`, `/api/providers`, `/api/provider-attendance`
- Money flows go through `invoices` → `payments` → `transactions`; Finance (`/api/finance/*`, `/api/expenses`, `/api/assets`, `/api/loans`) and Reports read from those, not from mock arrays. Still mock UI: consultation notes, treatment plans, before/after photos, Refunds, Shipping (see `DB_SCHEMA.md`)

### Reception Bot (n8n)
```
WhatsApp/chat → n8n workflow → GET /api/bot/* (x-bot-secret via requireBotSecret) → supabaseServer → Supabase
              → kb_reception_documents (vector search) · reception_chat_histories (memory) · bot_guardrail_log
Staff view: /api/reception/dashboard → ReceptionDashboardView
```

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
| `admin_roles` | Live-dev-only legacy role table (no migration creates it) — see DB_SCHEMA.md | No |
| `invoices` | Billing header per visit/sale; source of truth for revenue and amounts owed | Yes |
| `invoice_lines` | Line items of an invoice (services, products, package sales) | Via `invoices` |
| `payments` | Money received against an invoice (cash/card/wallet), one row per payment | Via `invoices` |
| `wallet_txns` | Customer wallet ledger (top-ups, spends, refunds) | No |
| `packages` | Sellable package catalog (prepaid bundles of services) | No |
| `package_items` | Services and quantities/pulses included in a catalog package | Via `packages` |
| `customer_packages` | A package purchased by a customer, with its remaining balance | No |
| `customer_package_items` | Per-service remaining balance inside a purchased package | Via `customer_packages` |
| `package_revenue_recognitions` | Revenue recognised as package sessions/pulses are consumed (DEC-088) | Via `customer_packages` |
| `service_consumables` | Stock products a service consumes per session (recipe) | No |
| `consumption_entries` | Actual stock consumed when a session is completed | Yes |
| `stock_movements` | Inventory movement ledger (purchases, consumption, sales, adjustments) | Yes |
| `suppliers` | Vendors stock is bought from | No |
| `purchases` / `purchase_lines` | Supplier purchase invoices and their lines; drive stock-in and supplier payables | Yes |
| `service_devices` | Junction: which devices a service uses | Via `services` |
| `reservation_products` | Products attached to a booking before it is invoiced (DEC-042) | Via `reservations` |
| `expense_categories` | Expense category tree for the Finance section | No |
| `expenses` | Operating expense records | Yes |
| `recurring_expenses` | Templates for indefinitely recurring costs (rent, utilities, licences) | Yes |
| `fixed_assets` | Fixed asset register | Yes |
| `depreciation_entries` | Monthly depreciation postings per fixed asset | Via `fixed_assets` |
| `loans` | Loan register | No |
| `loan_schedule` | Repayment schedule rows per loan | Via `loans` |
| `budget_lines` | Monthly budget targets per category | Yes |
| `holiday_calendar` | Clinic holidays used by capacity/attendance maths | No |
| `refused_demand` | Schema-only — turned-away demand log, no UI or route yet | Yes |
| `transactions` | Unified money-movement ledger (Finance Overview source) | Yes |
| `transaction_audit_logs` | Audit trail of edits/voids to `transactions` | Via `transactions` |
| `laser_pulse_logs` | Per-session laser pulse usage log | Via device / booking |
| `package_pulse_usage` | Pulse consumption per purchased package, written by `consume_package_pulses` | Via `customer_packages` |
| `kb_reception_documents` | Embedded knowledge-base chunks for the reception bot | No |
| `reception_chat_histories` | Reception bot conversation memory, one row per message | No |
| `bot_guardrail_log` | Reception bot guardrail log: what was blocked or answered | No |

**`branch` is the topmost scoping unit. There is no org/tenant layer above it.**

---

## Dual-Storage Pattern

Most routes are Supabase-only. These still carry a local-JSON fallback under `data/` (try Supabase →
on error use the file; some seed defaults when Supabase is empty):

| Route | File | Notes |
|---|---|---|
| `providers` | `data/providers.json` | Seeds defaults when the table is empty |
| `page-settings` (and `clinic-settings`) | `data/page_settings.json` | Seeds defaults |
| `prescriptions` | `data/prescriptions.json` | |
| `medical-records` | `data/medical_records.json`, `data/medical_reports.json` | |
| `laser-pulses` | `data/laser_pulses.json` | Also has a `page_settings` fallback step |
| `employees` | `data/employee_schedules.json` | Working-hours map |

`medical-records/templates` is **Supabase-only** (RISK-086) — its old `data/medical_record_templates.json` is
dead. On Vercel the filesystem is read-only, so a fallback write silently fails and the JSON can
diverge from the database (split-brain, RISK-020/086). Do not add new dual-storage routes; remove
these fallbacks route by route as each table is confirmed in production.

---

## Brand Token System

Brand colors are CSS custom properties in `src/app/globals.css` (`:root`):

```css
--color-brand-primary: #414E36;   /* Deep Olive Green */    --cr-primary: var(--color-brand-primary);
--color-brand-dark:    #1F251A;                              --cr-dark:    var(--color-brand-dark);
--color-brand-secondary: #5A6A51; /* Muted Sage Olive */
--color-brand-sand:    #F2EFE9;                              --cr-divider: var(--color-brand-sand);
--color-brand-light:   #FBFBF9;                              --cr-white:   var(--color-brand-light);
--color-brand-tint:    #EDF1EC;                              --cr-secondary: var(--color-brand-tint);
--color-brand-accent:  #C4AE7C;   /* Warm Royal Gold */     --cr-accent:  var(--color-brand-accent);
--color-brand-primary-hover: #2E3A26;
/* plus --cr-error, --cr-success, --cr-dark-divider and the shadcn semantic aliases (--primary, --card, …) */
```

New code must use `var(--cr-primary)` / `var(--cr-accent)` (project rule 1). **Resolved 2026-09-30
(PROPOSAL-001, DEC-099):** the seven mapped brand literals (`#414E36`, `#C4AE7C`, `#1F251A`,
`#5A6A51`, `#F2EFE9`, `#EDF1EC`, `#FBFBF9`) no longer occur anywhere in `src/**/*.ts(x)` — every
component that used them now references the CSS custom properties above. See `RISKS.md` → RISK-001
for what remains out of scope (translation-catalog content, legal Terms text, a few
unparameterized fields like the printed contact email and the wallet-payment number).

---

## i18n Architecture

- **Public site:** `LanguageContext` holds `language` ("en"|"ar"), `isRTL` and a typed `t` accessor; `src/lib/translations.ts` exports `Record<"en"|"ar", Translation>` with all public UI copy.
- **Admin panel:** independent of `LanguageContext`. `AdminPage` keeps its own `lang` state (persisted in `localStorage` under `${CLIENT.storagePrefix}_admin_lang`), sets `dir` to `rtl`/`ltr` on its containers, and reads copy from `adminTranslations[lang]` in `src/components/admin/translations.ts` (~5.6k lines). Sections are translated incrementally — labels missing from the dictionary fall back to the English key (`ADMIN_REFACTOR_AND_I18N_PLAN.md`).
- Page `<head>` metadata is hardcoded in English per page (the ad landing pages use `landingMetadata()`); it is not driven by translations.
