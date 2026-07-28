# CLAUDE.md — Clinic Platform (product name TBD)

> Claude Code loads this file at the start of every session. Keep it short.
> Full context lives in `ai_docs/` — read those before non-trivial work (order at bottom).

## What this is
A clinic management platform: public marketing website + `/admin` panel, on
Next.js 15 (App Router) + TypeScript + Supabase, deployed on Vercel.
It is a **generic, reusable product**, delivered as **one single-tenant instance per clinic**.
**Revera Clinics is the first / reference client — not the product.** The product name is
not chosen yet. Do not bake "Revera" into anything new (see rules 2 below).

## Delivery model — do not change without a decision logged in DECISIONS.md
- **Fork-per-client**, separate Supabase project per clinic (DEC-001). NOT multi-tenant SaaS.
- Multi-tenant/SaaS is deferred to ~10 clients. Do **not** add `org_id` / `tenant_id`.
- `branch` is the topmost scoping unit. There is no tenant layer above it.

## Hard rules
1. No new raw hex colors in components. Use `var(--cr-primary)` / `var(--cr-accent)` from `globals.css`.
2. No hardcoded "Revera", phone numbers, WhatsApp links, or logo paths in components.
   UI copy → `src/lib/translations.ts`; client-specific values → `src/config/client.ts` (PROPOSAL-001).
3. `/admin` has a **browser login gate only**. `/api/*` routes are NOT auth-validated server-side.
   Do not assume any middleware protects them.
4. Patient OTP auth is **UI-only / simulated** — no real SMS, no session, no user created.
5. Real vs mock: **trust `ai_docs/DB_SCHEMA.md`, not memory or older doc lines.**
   Real Supabase tables: prescriptions, payroll (hr_payroll + doctor_payroll), inventory
   (products/devices), POS (product_sales). Still mock UI (hardcoded arrays): consultation notes,
   treatment plans, before/after photos, the Finances Dashboard aggregate view, Refunds, Shipping.
6. Any schema change → add a file to `supabase/migrations/` AND update `DB_SCHEMA.md` in the
   same change. The migrations folder and DB_SCHEMA.md must never drift apart.
7. Do not extend the `serviceStore.ts` "localStorage as primary" pattern (RISK-004).
8. Leave `ROADMAP.md`, `TODO.md`, `FUTURE_FEATURES.md`, `AI_PIPELINE.md` empty — managed externally.

## Read before you write — `ai_docs/`, in this order
PROJECT → ARCHITECTURE → DB_SCHEMA → PRODUCT_RULES → DECISIONS → RISKS
Task-specific: `API_CONTRACT.md` (API work) · `PROPOSALS.md` (start here for any
fork / "make it work for any clinic" refactor — PROPOSAL-001 is the plan).

## Working agreement
- Planning happens in the Claude.ai project; execution happens here in Claude Code.
- Log every architectural/strategic decision in `DECISIONS.md`; new risks in `RISKS.md`;
  mark items in `PROPOSALS.md` done when the refactor lands.
- `ai_docs/` lives on the `dev` branch. Do not merge it to `main`.
- **After finishing any task, give a Dev Notes block** (user pastes it into their own external
  tracker, then tests the feature in the browser and screenshots it) with:
  - **Title** — short task name.
  - **Dev Notes** — bullet list, one per file touched: path, what changed, one line on why that
    specific choice was made (not a restatement of the diff).
  - **What** — one line, what the feature does.
  - **Why** — the **business/clinic reason it matters** (what a doctor/reception/manager can now do,
    or what breaks/goes untracked without it) — not an internal-code reason like "closes a gap left
    by an earlier task."
  - **Where** — where to find it in the UI.
  - **Module**, **Status** (Done once `tsc`/`eslint` are clean on touched files; note explicitly if
    live-browser verification is still outstanding, since typecheck passing is not the same as a
    human confirming it works).
  - **Manual Testing Checklist** — every Dev Notes block must include (or point to) a full,
    click-through manual test checklist for the feature just shipped, written to a dedicated
    `ai_docs/*_MANUAL_TESTS.md` file (create one per feature/fix, or append a new numbered section
    to an existing one if the work is a continuation of an already-tracked feature — follow the
    format already established by `RISK_029_MANUAL_TESTS.md` / `FINANCE_PHASE_3B_MANUAL_TESTS.md`:
    an "Evidence log" table + a per-check `- [ ]` list). Reference that file from the relevant
    `RISKS.md`/`DECISIONS.md` entry the same way RISK-029/RISK-030 do. This applies to every
    feature going forward, not just risk fixes.
