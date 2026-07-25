# AGENTS.md — AI Agent Instructions for Revera Clinics

> **Last Updated:** 2026-07-21

## Read First

Before making any code changes:

1. Read `PROJECT.md` — understand what this system is and who it serves.
2. Read `ARCHITECTURE.md` — understand the tech stack and file structure.
3. Read `PRODUCT_RULES.md` — understand what business logic is actually enforced in code.
4. Read `DECISIONS.md` — understand what decisions have already been made and why.
5. Read `RISKS.md` — understand known risks before making changes that touch hardcoded values.
6. Read task-specific documents from `README.md` before changing an API, schema, or proposed refactor.

## Documentation and Delivery Rules

- Treat `ai_docs/` as the source of truth: update the relevant document whenever a completed change affects architecture, schema, API contracts, enforced business rules, decisions, risks, or project status.
- After each completed change, validate it, commit it, and push it. Do not push until `npm run build` succeeds with no compiler errors.
- Keep changes to the minimum required. Reuse existing functions, components, and endpoints before creating new ones; do not duplicate logic.
- All **new admin sections** must be implemented as separate submodules under `src/components/admin/` (plus focused hooks/utilities where appropriate) and composed by `src/app/admin/page.tsx`. Do not add new section-level UI, state, or data orchestration to the legacy page. Progressively extract Booking, Customer, Doctor, and the other existing sections without a large-bang rewrite.
- Design UI/UX for non-technical users: use clear labels, obvious actions, and the fewest necessary steps.

## Key Facts to Keep in Mind

- This is a **single-tenant** clinic management system for Revera Clinics only.
- The **admin panel (`/admin`) has a browser login gate** via Supabase Auth + `employee_accounts`/`roles`, but **API routes are not protected** — direct HTTP calls to `/api/*` are unauthenticated.
- Prescriptions, Payroll (`hr_payroll`/`doctor_payroll`), Inventory (products/devices), and POS (`product_sales`) are **real Supabase-backed features** as of 2026-07-20/21 — do not treat them as mock. What's still mock UI only (hardcoded arrays, not Supabase): consultation notes, treatment plans, before/after photos, the Finances Dashboard aggregate reporting view, Refunds, Shipping. See `DB_SCHEMA.md` for the verified table list.
- **Patient auth is non-functional** — the OTP flow is UI-only.
- Provider attendance uses **browser geolocation + 800m geofence**; it can be spoofed and is bypassed for admin/superadmin roles.
- **`branch` is the topmost scoping unit.** There is no org/tenant layer.
- The `translations.ts` file is the single source of truth for all UI copy (EN/AR). Do not hardcode strings in components.
- Brand colors are defined as CSS custom properties in `globals.css`. Use `var(--cr-primary)` and `var(--cr-accent)` — do not add new raw hex inline values.
- `superadmin@revera.com` is a hardcoded admin bypass; change it when forking.

## Fork-per-Client Context

If you are working on a fork for a new client (not Revera), see `PROPOSALS.md` for the
plan to centralize client-specific values. Do not start a fork without reading that file.
