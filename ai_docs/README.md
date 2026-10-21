# ai_docs — Revera Clinics Agent Knowledge Base

> **Last Updated:** 2026-10-21 (full audit of every file in this folder against `dev`: stale statements corrected, the status snapshot rewritten, the file index completed)
> **Branch:** dev (these docs do not belong on main/production)
> **Maintained by:** Project manager. Updated whenever architecture, decisions, or risks change.

This folder is the single source of truth for any AI agent, LLM coding tool (Cursor, Windsurf, GitHub Copilot, Claude Code, etc.), or human developer who needs to understand this codebase before touching it.

**Rule: Read before you write.** Do not make assumptions about what is built, what decisions were made, or what patterns to follow without reading the relevant files below first.

---

## Reading Order (start here)

Follow this order on first contact with this codebase:

```
1. PROJECT.md        → What is this system, who uses it, deployment model
2. ARCHITECTURE.md   → Tech stack, folder structure, data flow, patterns
3. DB_SCHEMA.md      → Database tables, columns, relationships
4. PRODUCT_RULES.md  → Business logic enforced in code (not aspirational)
5. DECISIONS.md      → Why things are built the way they are
6. RISKS.md          → Known problems and the files/lines they live in
```

After that, check task-specific files:

```
7. API_CONTRACT.md      → When touching API routes or writing new endpoints
8. SECURITY.md          → Before adding a route, or touching auth/RLS/middleware
9. TESTING.md           → Before deciding a task is "done" — what verification is actually expected
10. PROPOSALS.md        → Before starting any refactor (must read before executing)
11. FINANCE_TRACKER.md  → Only when working inside the Finance module (PROPOSAL-002)
```

---

## File Index

Every file that exists in this folder is listed below — nothing is left unexplained. If a new
`.md` file is added to `ai_docs/`, add a row for it here in the same change (this is itself a
`CLAUDE.md`-rule: docs must never silently drift from what's actually in the folder).

### Core Context (always read)

| File | Purpose | Update When |
|---|---|---|
| `PROJECT.md` | System overview — what it is, who uses it, stack, known gaps | Deployment model changes, new users/roles added, major gaps resolved |
| `ARCHITECTURE.md` | Full stack, folder structure, data flow, brand token system, i18n | New folders/patterns introduced, Supabase tables added, auth added |
| `DB_SCHEMA.md` | All Supabase tables with columns, types, and relationships | Any schema change (add table, add column, change type) — must match `supabase/migrations/` |
| `PRODUCT_RULES.md` | Business logic **actually enforced in code** — nothing aspirational | Any time a rule is added, removed, or changed in an API route or component |
| `DECISIONS.md` | Decision log (ADR-style) — what was decided, why, what was rejected. Entries are numbered `DEC-NNN`; check the last number used before adding a new one to avoid a duplicate ID | Any architectural or strategic decision is made or reversed |
| `RISKS.md` | Risk register — known problems with file/line references, numbered `RISK-NNN`. This is the *log* (what broke, when, why it was fixed) | New risks found; existing risks mitigated; hardcoded values changed |

### Task-Specific (read when relevant)

| File | Purpose | Update When |
|---|---|---|
| `API_CONTRACT.md` | All API routes — methods, params, responses | Any API route added, changed, or deleted |
| `SECURITY.md` | **Current-state snapshot** of the auth model: what `middleware.ts`/`access.ts` actually check, a per-route table of which routes are role-gated vs. open, RLS posture, secrets handling, and a checklist for adding a new route safely. Complements `RISKS.md` — that file is the history of security bugs found and fixed; this file is "what's true right now," so you don't have to reconstruct it from `RISKS.md`'s narrative | Any route's auth changes; a new unauthenticated gap is found (log it in `RISKS.md` too); `middleware.ts`/`access.ts` change; RLS policy changes |
| `TESTING.md` | The actual testing approach — a real **Vitest** suite (91 files, ~1,500 tests on 2026-10-21) plus static checks (`npm run check`), ad hoc `scratch/*.ts` regression scripts, and the `manual_tests/` checklist format — plus what "Done" requires per `CLAUDE.md`. Updated 2026-10-21 | A testing layer is added/removed, or its role changes |
| `PROPOSALS.md` | Proposed refactors awaiting approval — do not execute without review | A new refactor is proposed; an approved proposal is completed (mark it done) |
| `FINANCE_TRACKER.md` | Execution tracker for `PROPOSALS.md` → PROPOSAL-002 (the Finance & Management Accounting module) — task-by-task status, what's done/blocked, exact requirements per task | Any Finance-module task's status changes; read `PROPOSALS.md` PROPOSAL-002 and `RISKS.md` RISK-010…RISK-020 first, per this file's own header |
| `AGENTS.md` | Quick-start rules for AI agents specifically | Agent workflow changes; new rules for what agents must/must not do. Rewritten 2026-10-21 (the earlier version said API routes were unauthenticated and patient auth was non-functional); `CLAUDE.md` at the repo root is the short version and wins if the two disagree |
| `WINDSURF_BRIEFS.md` | **The single file for all Windsurf work briefs** — one active brief at the top, completed ones archived at the bottom. Do not create separate brief files. Standing rules it relies on live in `.windsurf/rules/*.md` and `.windsurf/MEMORIES.md` (repo root, loaded automatically by Windsurf), both written from defects actually found in this codebase | A new brief is written, or an active one completes (move it to the archive section) |
| `ADMIN_REFACTOR_AND_I18N_PLAN.md` | Phased plan to make the admin panel bilingual: test net → componentize `admin/page.tsx` (started at 27.7k lines, 606 `useState`, ~50 sections; **down to 11.3k lines as of 2026-09-30** as sections keep getting extracted, see `ARCHITECTURE.md`) → per-component Arabic → broader automated testing. Explains why translation cannot safely come first | A phase completes, or an open decision at the bottom of the file is answered |
| `SYSTEM_CORRUPTIONS_AND_AUDIT.md` | Master defect catalog and architectural audit documenting corruptions across User View, Admin View, Doctor View, and Database/API architecture | New corruptions identified, architectural audits performed, or cataloged subsystems remediated |
| `PRODUCT_SPECS.md` | **External-facing product spec for marketing/sales agents**: positioning, target market, capability map with `LIVE`/`BETA`/`DEMO`/`PLANNED` status per feature, differentiators, known gaps, vision, commercial-model discussion, messaging guardrails. Not an engineering doc | A feature changes status (e.g. `DEMO`→`LIVE`), pricing is decided, the product is named, or a new market is targeted |

### Point-in-time records (kept for history; do not treat as current)

| File | What it is |
|---|---|
| `TEST_COVERAGE_INVENTORY.md` | A sweep of every module, route and table write as of 2026-09-07 (71 route files, 153 handlers, a 26.8k-line admin page). Counts and file sizes in it are out of date; the method (trace UI → API → table writes) is still useful when planning tests |

### Manual test evidence (not narrative docs — click-through records)

| Location | Purpose |
|---|---|
| `manual_tests/*.md` | One file per feature/fix (e.g. `RISK_029_MANUAL_TESTS.md`, `FINANCE_PHASE_3B_MANUAL_TESTS.md`) — an evidence-log table plus a per-scenario `- [ ]` checklist, per the format `TESTING.md` documents. Referenced from the `RISKS.md`/`DECISIONS.md` entry for that feature, and as the Test Note in every Dev Notes block |

### Externally Managed (do not populate here)

| File | Why it is empty |
|---|---|
| `ROADMAP.md` | Managed in an external tracker — editing here creates two sources of truth |
| `TODO.md` | Same as above |
| `FUTURE_FEATURES.md` | Same as above |
| `AI_PIPELINE.md` | No AI pipeline exists in the codebase as of last audit |

---

## Project Status Snapshot (as of 2026-10-21)

> Replaces the 2026-07-20 feature list that used to be here, which was badly stale (it predated the Finance and Reports
> sections, the laser-pulse engine, the role workspaces and more). The old list is in git history (`git show 7e9c7e2:ai_docs/README.md`).
> The capability map with `LIVE`/`BETA`/`DEMO`/`PLANNED` tags is `PRODUCT_SPECS.md`; day-to-day status is in `DECISIONS.md`
> (what was decided and built) and `RISKS.md` (what is open).

### What is built (real Supabase-backed unless noted)
- Public website: home, about, services, packages, contact, blog stub, ad landing pages, booking modal and booking page, patient phone/OTP sign-in and profile with wallet.
- Staff panel (`/admin`, role portals such as `/doctor`): bookings and scheduling, reception dashboard and checkout, doctor portal (schedule, live session, intake forms, prescriptions), patient records, laser-pulse and package engines, inventory and POS, HR (employees, shifts, attendance, leaves, performance, payroll for staff and doctors), role management with action-level permissions, website CMS.
- Finance (records and statements) and Reports (capacity, service mix and margin, doctor and branch P&L, package profitability, new vs returning, no-show cost) — DEC-097.
- Accounts: Active/Inactive switch, admins can manage other admins' accounts, an admin can also be a doctor (DEC-117, DEC-114).
- Security: every API route checks access on the server (`SECURITY.md`); row-level security is closed on all 64 tables of dev and production (RISK-128).

### Still mock UI (hardcoded arrays, not Supabase)
- Consultation notes, treatment plans, before/after photos, Refunds, Shipping, the Customer Support ticket inbox.

### Not built
- Automated SMS / WhatsApp reminders (WhatsApp is click-to-send), online card payment, waitlist, e-invoicing (ZATCA / Egypt ETA), patient mobile app.
- The reception bot's workflow and `/api/bot/*` code are not committed to `dev` yet (`ARCHITECTURE.md`, `DB_SCHEMA.md` describe them ahead of the code).

### Open items worth knowing about
- The list is the status index at the top of `RISKS.md` (nine open at this date). Two to note: RISK-104 (Finance revenue and cash on production, not re-measured) and RISK-103 (unverified marketing claims and inactive conversion tracking on the laser landing pages).
- Dead browser table reads remain in `AdminNewBookingView.tsx` and the `reservation_products` reads (RISK-128 "Not covered"); RLS blocks them, so they return nothing.
- Public reads that were never decided on: `GET /api/provider-attendance`, `/api/packages`, `/api/providers` (`SECURITY.md` §6).

---

## Architecture in One Paragraph

Next.js 16 (App Router) + React 19 + TypeScript on Vercel. One app serves the public Revera website, the `/admin` panel and the role portals. Supabase (PostgreSQL) is the database, reached through a service role key from the API routes only. **Row-level security is on for every `public` table, and no table has an open policy** (the "allow all" policies were closed on 2026-10-21, RISK-128; `node scripts/check-anon-access.mjs` measures any project). RLS is a backstop against the public browser key, not an authorization layer: the service role bypasses it, so per-route authorization in `access.ts` / `auth.ts` / `middleware.ts` is what decides who may call what; see `SECURITY.md`. Brand colors are CSS custom properties in `globals.css`. UI copy (EN/AR) lives in `src/lib/translations.ts` (public) and `src/components/admin/translations.ts` (admin). The admin shell `src/app/admin/page.tsx` is about 11.7k lines as of 2026-10-21 (down from 27.7k); sections live in `src/components/admin/` (DEC-027), so do not add new section logic to `page.tsx`.

---

## Key Rules for Agents and LLM Tools

1. **Do not add raw hex colors** (`#414E36`, `#C4AE7C`) to components. Use `var(--cr-primary)` and `var(--cr-accent)` from `globals.css`.
2. **Do not hardcode "Revera"** in component strings, metadata, or alt text. It goes in `src/lib/translations.ts`, and client-specific values in `src/config/client.ts` (PROPOSAL-001, executed 2026-09-30).
3. **Do not hardcode phone numbers or WhatsApp links** inline. Use `src/config/client.ts` (PROPOSAL-001).
4. **Do not treat mock UI sections as real features.** As of 2026-10-21: consultation notes, treatment plans, before/after photos, Refunds, Shipping and the Customer Support ticket inbox are backed by hardcoded arrays. Everything else listed in the status snapshot is real; verify against `DB_SCHEMA.md` rather than trusting this line.
5. **`branch` is the topmost scoping unit.** There is no `org_id` or `tenant_id`. Do not introduce one without a decision logged in `DECISIONS.md`.
6. **Do not add localStorage writes** for admin data. The existing `serviceStore.ts` pattern (localStorage as primary, Supabase as secondary) is a known risk (RISK-004) — do not extend it.
7. **Before any refactor touching hardcoded values**, read `PROPOSALS.md` first — a centralization plan already exists.
8. **`/admin` itself is a client-side gate; the API is not.** Do not rely on the login screen as a boundary: every `/api/*` handler enforces access itself (`SECURITY.md` §3). Never read a table from the browser with the anon key (RLS is closed, RISK-128); add an authenticated API route.
9. **Any schema change must add a file to `supabase/migrations/`** (see that folder's README for naming/idempotency rules) **and** update `DB_SCHEMA.md` in the same change. The migrations folder and `DB_SCHEMA.md` must never drift apart — one is the change log, the other is the current-state reference, and both are read by agents.
10. **New admin sections must be separate submodules.** Do not add a new section's view, state, or data orchestration to `src/app/admin/page.tsx`. Add it under `src/components/admin/` (with focused hooks/utilities as needed) and have the page compose it. This rule remains mandatory while the legacy Booking, Customer, Doctor, and other existing sections are progressively extracted from `page.tsx`; do not perform a large-bang rewrite.

---

## When to Update These Docs

| Trigger | Files to Update |
|---|---|
| New Supabase table or column added | `supabase/migrations/` (new `.sql` file), `DB_SCHEMA.md`, `ARCHITECTURE.md` |
| New API route added or changed | `API_CONTRACT.md` |
| New business rule enforced in code | `PRODUCT_RULES.md` |
| Architectural decision made | `DECISIONS.md` |
| New risk identified (hardcoding, security, data integrity) | `RISKS.md` |
| New route added, or a route's auth changes | `SECURITY.md` §3 route table (and `API_CONTRACT.md`) — if it's a newly-found *gap*, also log it in `RISKS.md` |
| Testing approach changes (e.g. a real test framework is introduced) | `TESTING.md` |
| Mock section becomes real (Supabase-backed) | `PROJECT.md` status snapshot + `PRODUCT_RULES.md` |
| Admin auth added | `PROJECT.md`, `ARCHITECTURE.md`, `SECURITY.md`, `RISKS.md` (close RISK-002), `DECISIONS.md` |
| A migration is applied to an environment (dev, production, a client's project) | The `RISKS.md` / `DECISIONS.md` entry that introduced it (say where and when it was applied), `DB_SCHEMA.md` if it was waiting, and re-run `scripts/check-anon-access.mjs` if it touched RLS |
| A risk changes status | Move the entry to the matching section of `RISKS.md` and update the counts in its status summary |
| PROPOSAL-001 executed | `PROPOSALS.md` (mark done), `RISKS.md` (close RISK-001), `ARCHITECTURE.md` |
| Fork for new client created | `DECISIONS.md` (log the new client), `PROPOSALS.md` (confirm PROPOSAL-001 was applied) |

---

## Folder Location Note

This folder (`ai_docs/`) lives on the **`dev` branch only**. It is not part of the production build on `main`. Do not merge it to `main`.
