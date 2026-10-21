# AGENTS.md — AI Agent Instructions for Revera Clinics

> **Last Updated:** 2026-10-21 — rewritten after a full audit. The 2026-09-10 version said API routes are unauthenticated,
> patient auth is non-functional, `main` is not in production and the Finance module was not implemented; all four were
> wrong by then. `CLAUDE.md` (repo root) is the shorter version of this file and takes precedence if the two ever disagree.

## Read First

Before making any code changes:

1. Read `PROJECT.md` — what this system is, who uses it, the deployment model.
2. Read `ARCHITECTURE.md` — the stack, folder structure, data flow, API route groups.
3. Read `DB_SCHEMA.md` — tables and columns (and `supabase/migrations/README.md` before touching SQL).
4. Read `PRODUCT_RULES.md` — the business logic actually enforced in code.
5. Read `DECISIONS.md` — what was decided and why; the highest number in use at the time of writing is DEC-122.
6. Read `RISKS.md` — known problems; its status index at the top lists what is still open.
7. Read the task-specific file from `README.md`: `API_CONTRACT.md` for API work, `SECURITY.md` before adding a route or touching
   auth / RLS, `TESTING.md` before calling a task done, `PROPOSALS.md` before any refactor.

## Documentation and Delivery Rules

- Treat `ai_docs/` as the source of truth: update the relevant document in the same change whenever it affects architecture,
  schema, API contracts, enforced business rules, decisions, risks or project status. A schema change is a migration in
  `supabase/migrations/` **and** an update to `DB_SCHEMA.md`.
- Each `RISK-NNN` / `DEC-NNN` number is used once. Look at the last entry in `RISKS.md` / `DECISIONS.md` (and at other open
  branches) before taking the next number; two sessions have collided on numbers before.
- After each completed change run `npm run check` (lint, typecheck, tests, build), commit, and push. Do not push when `npm run build` fails.
- Keep changes to the minimum required. Reuse existing functions, components and endpoints; do not duplicate logic.
- All **new admin sections** are separate submodules under `src/components/admin/`, composed by `src/app/admin/page.tsx`. Do not add
  section-level UI, state or data orchestration to the legacy page.
- Design UI for non-technical users: clear labels, obvious actions, the fewest steps.
- Every feature or fix gets a manual test checklist in `ai_docs/manual_tests/` and, when it touches money, authorization or data
  integrity, a Vitest test (see `TESTING.md`).

## Key Facts to Keep in Mind

- **Single-tenant, one instance per clinic.** `branch` is the topmost scoping unit; there is no org/tenant layer. A new clinic is a
  fork with its own Supabase project (DEC-001). Run `node scripts/check-anon-access.mjs` on every new project.
- **Two environments.** `main` is production with live clinic data; `dev` is the test environment. `ai_docs/` lives on `dev` and
  is not merged to `main`. Do not infer the state of a database from a migration file; measure it (RISK-020).
- **Auth is enforced on the server.** `/admin` has a browser login gate, but that is not the boundary: each `/api/*` handler calls a
  helper from `src/lib/access.ts` or `src/lib/auth.ts`. `SECURITY.md` §3 lists every route and who may call it. A few routes are public on
  purpose (catalog reads, availability). The browser holds only the public anon key and must not read tables with it: row-level
  security is closed (RISK-128); add an API route instead.
- **Patient sign-in is real** phone/OTP through Supabase Auth. A patient token is a valid Supabase session but not staff; never use it as proof of staff.
- **Real vs mock.** Real Supabase features: bookings, patients, prescriptions, payroll (`hr_payroll`, `doctor_payroll`), inventory and POS,
  packages and laser pulses, invoices/payments/wallet/transactions, the Finance and Reports sections. Still mock UI (hardcoded arrays):
  consultation notes, treatment plans, before/after photos, Refunds, Shipping, the Customer Support ticket inbox. Trust `DB_SCHEMA.md`.
- **Services and categories are database-primary** (RISK-025). Do not extend the `serviceStore.ts` localStorage pattern (RISK-004).
- Provider attendance uses browser geolocation and an 800 m geofence; it can be spoofed and is bypassed for admin/superadmin (RISK-006).
- `translations.ts` (public) and `components/admin/translations.ts` (admin) hold the UI copy (EN/AR); do not hardcode strings in components.
- Brand colours are CSS custom properties in `globals.css`: use `var(--cr-primary)` / `var(--cr-accent)`, never raw hex. Client-specific values
  (name, phone, WhatsApp, URLs) live in `src/config/client.ts`.
- The doctor screens belong to a role's *workspace* (DEC-113), not to a name check. An admin can also be a doctor (`is_also_doctor`, DEC-114).
  An account can be inactive (`is_active`, DEC-117), which blocks all server access.

## Fork-per-Client Context

If you are working on a fork for a new client (not Revera), see `PROPOSALS.md` (PROPOSAL-001, executed 2026-09-30) and `src/config/client.ts`.
Do not start a fork without reading that file.
