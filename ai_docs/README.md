# ai_docs — Revera Clinics Agent Knowledge Base

> **Last Updated:** 2026-08-04
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
| `TESTING.md` | The actual testing approach (there is no automated test suite): static checks (`npm run check`), ad hoc `scratch/*.ts` regression scripts, and the `manual_tests/` checklist format — plus what "Done" requires per `CLAUDE.md` | The testing approach itself changes (e.g. a real test framework is introduced) |
| `PROPOSALS.md` | Proposed refactors awaiting approval — do not execute without review | A new refactor is proposed; an approved proposal is completed (mark it done) |
| `FINANCE_TRACKER.md` | Execution tracker for `PROPOSALS.md` → PROPOSAL-002 (the Finance & Management Accounting module) — task-by-task status, what's done/blocked, exact requirements per task | Any Finance-module task's status changes; read `PROPOSALS.md` PROPOSAL-002 and `RISKS.md` RISK-010…RISK-020 first, per this file's own header |
| `AGENTS.md` | Quick-start rules for AI agents specifically | Agent workflow changes; new rules for what agents must/must not do. **Known stale as of 2026-08-03** — written 2026-07-21, predates the auth/RLS hardening work and the fork-per-client framing now in `CLAUDE.md`; treat its security/single-tenant claims as superseded by `CLAUDE.md` and `SECURITY.md`, not as current fact |

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

## Project Status Snapshot (as of 2026-07-20)

### What Is Actually Built and Working
- Public website (homepage, about, services, contact, blog stub)
- Patient Profile (`/profile`) — persistent customer profile details, wallet ledgers, and visit logs history
- Booking modal (MD3 Date & Time pickers, single-step Service+Date+Time selection) → `reservations` table (real Supabase writes with customer_id links)
- Admin Bookings view — modular component (`src/components/admin/bookings/AdminBookingsView.tsx`) housing 3 view tabs (Calendar Month Grid, Operations List View, and Daily Schedule Grid) with 4 analytic status cards, full filter drawer, pending approval banner, inline actions, patient drawer integration, and CSV export functionality.
- Doctor Portal Schedule & Patients Tab — dual view system (Month/Day Calendar & Queue List), global bilingual EN/AR toggle, Centered Inspect Session Modal, rejected/cancelled booking filtering, clean doctor notes isolation, integrated Patient Medical Record Intake with clinical notes, customer-indexed medical record caching, saved Digital Prescription display in visit history, Service-based pulse counter with additional services manager, and Patient Full Visit History Drawer positioned beside the doctor sidebar on desktop screens (refactored into modular sub-components under `src/components/admin/doctor/`)
- Comprehensive User Profile View — modular component (`src/components/admin/UserProfileView.tsx`) unified across both Doctor View and Admin View featuring top employee header with photo upload overlay, 6 quick stat cards, numbered Personal Information (Section 1 - display First Name, Last Name, Email, Phone, Address with Edit modal restricted to Email, Phone, Address and persisted to database via `/api/employees`), Work Information (Section 2 - view-only with Department set to "Doctor" / "Receptionist", Break Time removed, all assigned clinic branches resolved from `branches` table, stripped parenthesized annotations, and working days/hours parsed strictly from database response objects), 6-metric Attendance Summary (Section 3 - queried live from `hr_attendance` without hardcoded fallbacks), Payroll Summary (Section 4 - queried live from `doctor_payroll`, `providers`, `employee_accounts`, and `reservations` with dynamic Doctor Payroll commission support, fixed salary, monthly target, target progress, and Net Salary), and Change Password modal (Print Profile button removed). Removed Refresh button from Doctor View sidebar in `DoctorSidebar.tsx`. Removed Profile from Settings sub-menu in Admin Sidebar and added a top header Profile button right beside the Branch selector dropdown.
- Full View New Booking Page — dedicated modular page component (`src/components/admin/bookings/AdminNewBookingView.tsx`) replacing modal popups when clicking New Booking in Admin. Features interactive patient autocomplete search bar with real-time dropdown selection from `customers` table, fallback service title extraction (`s.en || s.name || s.title || s.name_en || s.title_en || s.ar`), dynamic doctor shift time slots with booked slot filtering from `reservations`, active package redemption status from `customer_packages`, appointment summary card, and split submit actions (`Create Booking`, `Create & Print`, and `Create & Send WhatsApp`).
- Booking lifecycle stages: `pending → approved → confirmed → started → completed`
- Customer Wallet Ledgers — real writes updating spent_amount, outstanding, and wallet_balance during checkout
- Payment settlement drawer inside admin booking details
- Booking invoice popup + PDF printing inside admin
- Branch-specific service hours (separate schedules for Sheikh Zayed / New Cairo stored in database and enforced in booking availability)
- Service catalog CRUD (with drag-sort, bilingual names, branch pricing)
- Branch management CRUD
- Website CMS — hero slides (EN/AR) editable via admin
- Provider records (doctors) — basic CRUD
- Employee attendance with GPS geofence check-in (500m radius, widened to 800m on Jul 8)
- Employee accounts and roles (`employee_accounts` + `roles` tables) with `/api/auth/me` permission lookup
- Superadmin/admin bypass for daily GPS check-in
- WhatsApp confirmation step for website bookings (English only)
- Booking origin badges (website vs other sources)

### Disabled Placeholder Nav Items (Coming Soon, superadmin-only)
- Sidebar entries: Marketing, Customer Support, Reports, Finance
- No page/functionality behind any of them — `disabled`, greyed out, "Coming Soon" tooltip
- Only visible to `adminRole === 'superadmin'`; filtered out for every other role
- Not the same as the mock-UI "Finances Dashboard" below — see RISK-005 for the naming collision

### What Is Mock UI Only (hardcoded data, not Supabase)
- Clinical: consultation notes, treatment plans, before/after photos (prescriptions itself is real — corrected 2026-07-21, see DB_SCHEMA.md)
- Billing metrics: overall billing analytics reports are mock (but individual customer ledgers, and now Payroll/Inventory/POS, are real — corrected 2026-07-21)
- All marketing: WhatsApp is external `wa.me` links only; no campaigns or templates
- Notification templates
- Full RBAC enforcement on API routes (selected sensitive routes validate bearer tokens, but coverage is not universal)

### Critical Gaps (do not assume these work)
- **API authorization is still incomplete** — most finance/inventory-relevant routes are now role-gated (RISK-018, RISK-021), but `medical-records`, `prescriptions`, and several config/CMS routes (`branches`, `categories`, `providers`, `rooms`, `terms`, `page-settings`, `customer-avatars`, `provider-attendance`) have **no server-side authorization at all** — see `SECURITY.md` §3 and RISK-036 (found 2026-08-03, not yet fixed)
- **Patient auth is real, not simulated** — corrected 2026-07-22 (RISK-003). `AuthModal` sends/verifies OTPs through actual Supabase Auth; there is no `123456` demo bypass anymore. Do not trust the older claim that this is UI-only
- Doctor shifts and availability — not built; derived only from existing bookings
- Waitlist — not built

---

## Architecture in One Paragraph

Next.js 15 (App Router) + TypeScript on Vercel. Single app serving both the public Revera website and the `/admin` panel. Supabase (PostgreSQL) as the database, accessed via a service role key from all API routes. **RLS is enabled on every `public` table as of 2026-07-25** (`20260722140000_enable_row_level_security.sql`), though it's a backstop against accidental anon-key access, not an authorization layer — the service role key bypasses it entirely, so per-route authorization in `access.ts`/`middleware.ts` is what actually matters; see `SECURITY.md` for the full current picture. Brand colors centralized in `globals.css` as CSS custom properties — but many components bypass these with raw hex Tailwind JIT classes (see RISK-001 in `RISKS.md`). All UI copy (EN/AR) lives in `src/lib/translations.ts`. The admin panel is a single ~550KB client component at `src/app/admin/page.tsx`.

---

## Key Rules for Agents and LLM Tools

1. **Do not add raw hex colors** (`#414E36`, `#C4AE7C`) to components. Use `var(--cr-primary)` and `var(--cr-accent)` from `globals.css`.
2. **Do not hardcode "Revera"** in component strings, metadata, or alt text. It goes in `src/lib/translations.ts` or will move to `src/config/client.ts` after PROPOSAL-001 is approved.
3. **Do not hardcode phone numbers or WhatsApp links** inline. See PROPOSAL-001 in `PROPOSALS.md`.
4. **Do not treat mock UI sections as real features.** As of 2026-07-21: consultation notes, treatment plans, before/after photos, the Finances Dashboard aggregate reporting view, Refunds, and Shipping are backed by hardcoded arrays. Prescriptions, Payroll, Inventory, and POS are now real Supabase tables — see `DB_SCHEMA.md` (this list was wrong before 2026-07-21; verify against `DB_SCHEMA.md` rather than trusting this line going forward).
5. **`branch` is the topmost scoping unit.** There is no `org_id` or `tenant_id`. Do not introduce one without a decision logged in `DECISIONS.md`.
6. **Do not add localStorage writes** for admin data. The existing `serviceStore.ts` pattern (localStorage as primary, Supabase as secondary) is a known risk (RISK-004) — do not extend it.
7. **Before any refactor touching hardcoded values**, read `PROPOSALS.md` first — a centralization plan already exists.
8. **The admin panel has no auth.** Do not assume any middleware protects `/admin`.
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
| PROPOSAL-001 executed | `PROPOSALS.md` (mark done), `RISKS.md` (close RISK-001), `ARCHITECTURE.md` |
| Fork for new client created | `DECISIONS.md` (log the new client), `PROPOSALS.md` (confirm PROPOSAL-001 was applied) |

---

## Folder Location Note

This folder (`ai_docs/`) lives on the **`dev` branch only**. It is not part of the production build on `main`. Do not merge it to `main`.
