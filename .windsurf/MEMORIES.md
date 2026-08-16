# Windsurf memories — Revera clinic platform

Paste these into Windsurf's Memories, or keep this file open as context. They are project facts
that are expensive to rediscover and dangerous to guess at.

---

**M1 — What this project is.** A clinic management platform: public marketing site + `/admin` panel,
Next.js App Router + TypeScript + Supabase, on Vercel. It is a **generic, reusable product**
delivered as one single-tenant instance per clinic. Revera is the first client, not the product.
Delivery model is **fork-per-client with a separate Supabase project per clinic** (DEC-001) — it is
NOT multi-tenant. Never add `org_id` / `tenant_id`. `branch` is the topmost scoping unit.

**M2 — Read before writing.** `ai_docs/` in this order: PROJECT → ARCHITECTURE → DB_SCHEMA →
PRODUCT_RULES → DECISIONS → RISKS. Plus `API_CONTRACT.md` for API work and `SECURITY.md` for auth
work. `ai_docs/DB_SCHEMA.md` beats memory and beats older lines in other docs.

**M3 — `ai_docs/RISKS.md` is the defect ledger.** RISK-001…RISK-050 document real bugs, most with
root cause and fix. Before "fixing" something, check whether it is already logged — and if a task
touches an area, read that area's risk entries first. They exist precisely so the same class of bug
isn't reintroduced.

**M4 — The schema-drift problem.** This codebase has repeatedly had code referencing DB columns that
were never created — `reservations.price`, `reservations.payment_status`, `branches.service_hours`.
Each failed silently. Always verify a column exists in `DB_SCHEMA.md` before using it. If it's
missing, stop and report rather than substituting something else.

**M5 — camelCase boundary.** DB is snake_case; `mapRow()` in `src/app/api/reservations/route.ts`
returns camelCase to API callers. Components consuming API responses use `serviceId`, `amountPaid`,
`amountLeft`, `startedAt`. Components reading Supabase directly get snake_case. Mixing these up
produces `undefined` with no error — it has already caused a real bug.

**M6 — Auth is per-method, not per-route.** `POST /api/reservations` is intentionally public (public
booking). `GET` on the same route is not. Public site reads `branches`, `providers`, `terms`,
`page-settings`, `services`, `categories` unauthenticated — their GETs must stay open, their writes
must not. Helpers live in `src/lib/access.ts`; HR uses `verifyHrAccess` in `src/lib/auth.ts`.

**M7 — Patient login is real Supabase Auth.** So `requireAuthenticatedUser` is satisfied by a
patient. Anything exposing another person's data needs `requireStaffAccess`. For routes serving both
populations, use `classifyCaller()` (exported from `src/app/api/customers/route.ts`) plus
`isOwnIdentity()` — and never trust an identifier from the query string.

**M8 — Money paths.** Wallet changes go through `src/lib/wallet.ts` (`recordWalletMovement`), never a
bare `wallet_balance` update. `computeSettledBalances()` in `src/lib/billing.ts` is correct and
delta-based — don't modify it. Payment state is derived from `amountPaid`/`amountLeft`, never from
`status`.

**M9 — Two fragile files.** `src/app/admin/page.tsx` (~27,700 lines, ~606 `useState`, ~50 sections in
one component) and `src/components/BookingModal.tsx`. Both have a history of subtle regressions.
Smallest possible change, no opportunistic refactoring. A componentization plan for the admin page
exists at `ai_docs/ADMIN_REFACTOR_AND_I18N_PLAN.md` — follow it rather than improvising a split.

**M10 — Migrations are never applied by the assistant.** Write the `.sql` file under
`supabase/migrations/`, update `DB_SCHEMA.md` in the same commit, and tell the owner it is unapplied.
Never run `supabase db push` or execute SQL directly. Never backfill historical rows with guessed
values.

**M11 — Verification is not optional.** `npx tsc --noEmit` and `npx eslint <touched files>` must show
0 errors on touched files before reporting done; `npm run build` too for routing/import changes.
Paste the real output. Typecheck passing is **not** the same as the feature working — say explicitly
when browser verification is still outstanding.

**M12 — Hard product rules.** No new raw hex colors in components (use `var(--cr-primary)` /
`var(--cr-accent)` from `globals.css`). No hardcoded "Revera", phone numbers, WhatsApp links or logo
paths — UI copy goes in `src/lib/translations.ts`, client-specific values in `src/config/client.ts`.
`/admin` has a browser login gate only. Leave `ROADMAP.md`, `TODO.md`, `FUTURE_FEATURES.md`,
`AI_PIPELINE.md` empty — they are managed externally.

**M13 — Scope discipline.** Do only what the task lists. Report out-of-scope findings instead of
fixing them. No unrequested refactors, renames, reformatting, or file deletions. If the task says
STOP on a condition, stop — a halted task is cheap, a wrong change across many files is not.

**M14 — Known-good patterns to copy rather than reinvent.** Auth guard shape:
`src/app/api/packages/sell/route.ts`. Auth headers: `authenticatedJsonHeaders` (admin page) or
`getAuthHeaders()` (`src/components/admin/doctor/utils.ts`). Customer spend update:
`addToCustomerSpend()` in `src/app/api/inventory/products/sales/route.ts`. Translation pattern:
`src/components/admin/doctor/translations.ts` + `doctorTranslations[lang]`.
