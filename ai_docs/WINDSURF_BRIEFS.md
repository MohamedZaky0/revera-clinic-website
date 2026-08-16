# Windsurf Briefs — Revera clinic platform

**One file for all Windsurf work briefs.** New briefs get appended as a new section here; do not
create separate brief files. Completed briefs stay as a short archived record at the bottom.

Standing rules live in `.windsurf/rules/*.md` (loaded automatically) and `.windsurf/MEMORIES.md`.
**Those apply to every brief in this file and are not repeated here.** Read them first.

---

# ACTIVE BRIEF — Phase 0: Test Infrastructure & Regression Net

**Context:** `ai_docs/ADMIN_REFACTOR_AND_I18N_PLAN.md` Phase 0. This must land *before* any
componentization of `src/app/admin/page.tsx` begins. The point of this brief is to build the safety
net that makes the later refactor survivable — not to change any product behaviour.

**Absolute rule for this brief: do not modify a single line of application code.** You are adding
tests and test configuration only. If a test you write fails, that is a finding to **report**, not
a licence to edit the code under test. A failing test here may well be a real bug we want to know
about — silently "fixing" it destroys that signal.

The only files you may create or edit:
- `package.json` (scripts + devDependencies only)
- `vitest.config.ts` (new)
- anything under `tests/` (new)

---

## TASK-0.1 — Install and wire the test runner

Currently there is **no test runner at all**: `package.json` has `dev`, `build`, `start`, `lint`,
`typecheck`, `check` — and no test script. The only existing "tests" are ad-hoc scripts in
`scratch/` run manually with `npx tsx`.

**Do this:**

1. Add dev dependencies: `vitest`, `@vitest/coverage-v8`.
   Do **not** add React/DOM testing libraries in this brief — every test here is pure-function or
   HTTP-level. Component testing is Phase 3 and out of scope.
2. Create `vitest.config.ts` at the repo root: `environment: 'node'`, include `tests/**/*.test.ts`,
   and make the `@/` alias resolve to `src/` exactly as `tsconfig.json` does. Read `tsconfig.json`
   for the existing path mapping — match it, don't invent one.
3. Add scripts:
   - `"test": "vitest run"`
   - `"test:watch": "vitest"`
4. Update `"check"` to `npm run lint && npm run typecheck && npm run test && npm run build`.
   Put `test` **before** `build` — it is much faster, so failures surface sooner.

**Verify:** `npm run test` runs and reports zero tests without erroring.

**Do NOT:** set up CI, GitHub Actions, Playwright, or coverage thresholds. Not in this brief.

---

## TASK-0.2 — Unit tests for the pure logic

These functions hold the money and scheduling correctness. All are pure or near-pure, so they test
cleanly with no mocking. Exported names below were verified against the source on 2026-08-17 — if
one doesn't match what you find, **STOP and report** rather than testing something else.

Create one file per module under `tests/lib/`.

### `src/lib/billing.ts` → `computeSettledBalances(input)`
The single most important function in the system. Signature at `billing.ts:56`; inputs are
`{ current: {wallet, spent, outstanding}, wasCompleted, oldPaid, oldLeft, newPaid, newLeft,
walletDeposit?, walletWithdrawal? }`.

Cover:
- **First completion** (`wasCompleted: false`): outstanding increases by `newLeft`, spent by `newPaid`.
- **Re-firing on an already-completed booking** (`wasCompleted: true`): deltas are
  `newLeft - oldLeft` and `newPaid - oldPaid` — i.e. paying down a balance later adjusts, it does
  not double-count. **This is the RISK-012 regression; it must be covered explicitly.**
- **Wallet ignored when already completed**: `walletDeposit`/`walletWithdrawal` are zeroed and
  `walletIgnored` is `true`.
- **Clamping**: results never go below 0, and `clamped` is `true` when any raw value was negative.
- A withdrawal adds to `spent` (see line 70) — assert that, it is easy to get backwards.

### `src/lib/customerIdentity.ts` → `normalizeEgyptMobile`, `isOwnIdentity`
This is **access-control logic** — a wrong answer here exposes one patient's data to another
(RISK-049). `scratch/identitycheck.ts` already exists; promote its cases into a real test and extend.

Cover: `+20...` / `20...` / `0...` all normalise equal; `auth_user_id` takes precedence when present;
phone match and email match (case-insensitive) as fallbacks; **a `null` customer returns `false`**;
a non-matching phone returns `false` (never a false positive).

### `src/lib/packages.ts` → `recognisedRevenuePerSession`, `recognisedRevenueSoFar`, `deferredBalance`, `isExpired`, `resolveExpiry`
Cover the documented rounding rule from `DB_SCHEMA.md`: for a 1000/6 package, recognised + deferred
must equal `price_paid` **exactly** — `deferredBalance` is the complement of `recognisedRevenueSoFar`,
not an independent calculation. The doc cites 333.34 + 666.67 = 1000.01 as the bug this prevents.
Assert the sum, not just the parts.

### `src/lib/ledger.ts` → `buildInvoiceLine`, `buildInvoiceTotals`, `taxPortion`, `formatInvoiceNo`
Totals are **tax-inclusive** (DEC-021). Cover: line totals after discount; `taxPortion` derived as
`gross × rate / (1 + rate)`; zero tax rate; `formatInvoiceNo` zero-padding.

### `src/lib/services.ts` → `getServiceDurationMinutes`, `getEffectiveServicePrice`, `getSessionStaleness`, `normaliseTo24hSlot`
- `getServiceDurationMinutes`: prefers `duration_minutes`, falls back to parsing the legacy free-text
  `duration` ("1:00 Hours", "30 mins"), returns null/0 for unparseable rather than guessing.
- `getEffectiveServicePrice`: branch-specific pricing wins over base price; falls back to base when
  the branch has no entry. (RISK-011 lived here.)
- `getSessionStaleness`: see TASK-0.3 below — covered there.

### `src/lib/customerBalances.ts` → `computeLedgerBalances`
Cover: only `issued` invoices count; outstanding is `grand_total - paid` floored at 0 per invoice;
wallet is `sum(in) - sum(out)` clamped at 0 with `walletClamped` set when it would have gone negative.

---

## TASK-0.3 — Regression tests for the RISK-038…050 defects

**This is the highest-value task in the brief.** Each test below corresponds to a real defect that
reached the running system. One test each, named so the risk number is obvious
(e.g. `risk-039-no-fabricated-payment-status.test.ts`).

Several of these live in component render logic rather than a pure function. **Where the logic is
not currently extractable without editing application code, write the test against the pure function
if one exists — and if it does not, SKIP that test and report it in your "could not test" list.**
Do not refactor application code to make it testable in this brief; that is Phase 1's job.

| # | Assertion | Risk |
|---|---|---|
| 1 | `getSessionStaleness('started', null, <yesterday>)` → stale with `elapsedMs === null` and `elapsedLabel === null` — never a fabricated duration | RISK-043 |
| 2 | `getSessionStaleness('completed', <8h ago>)` → **not** stale, regardless of age | RISK-043 |
| 3 | `getSessionStaleness('started', <1h ago>, _, 2h threshold)` → not stale; at 3h → stale | RISK-043 |
| 4 | `computeSettledBalances` re-fired with identical inputs on `wasCompleted: true` → no change (idempotent) | RISK-012 |
| 5 | `isOwnIdentity(user, null)` → `false`; mismatched phone → `false` | RISK-049 |
| 6 | `recognisedRevenueSoFar + deferredBalance === price_paid` for 1000/6 after 2 sessions | DEC-023 |

For the payment-status rule (RISK-039 — `amountLeft: null` must render `"—"` and never `"Paid"`, and
`status === 'completed'` must never imply paid): that logic currently lives inline in
`AdminBookingsView.tsx`'s row mapper and is **not** exported. Do **not** extract it in this brief.
Report it as "requires Phase 1 extraction to test" — it is a planned outcome of the refactor, not a
gap you should close now.

**Critical requirement — prove each test can fail.** For every test in this task, temporarily break
the assertion locally (invert it), confirm it goes red, then restore it. A regression test that
cannot fail is decoration. **State in your report that you did this**, per test. Do not commit any
inverted assertion.

---

## TASK-0.4 — Route-level authorization tests

This is the class of defect that produced RISK-049 (an unauthenticated caller could read every
patient's name, phone, email and booking history) and it went unnoticed through two prior audits.
Tests here are the durable fix.

Test `GET`/`POST`/`PATCH`/`DELETE` on the guarded routes for the **shape** of the auth response —
no live database required. Assert the status code and that no data body is returned:

- **No `Authorization` header** → `401`, and the body contains no records.
- **Valid patient token, staff-only route** (e.g. `medical-records`, `prescriptions`) → `403`.
- **Patient token, `GET /api/reservations` with no `phone`/`customerId` filter** → `403`
  (the shape that used to return the entire table).
- **Patient token, `GET /api/reservations?phone=<someone else's>`** → empty array, **never** another
  patient's rows.
- **Public reads stay public** — `GET` on `branches`, `providers`, `terms`, `page-settings` with no
  token → `200`. If any of these starts returning 401, the public website is broken; this test is the
  alarm.
- **`POST /api/reservations` with no token** → succeeds (public booking is intentional).

**On mocking:** mock `@/lib/supabaseServer` and `@/lib/access` at the module boundary so no real
network or database is touched. If you find that a given route cannot be tested without a live
Supabase connection, **STOP and report which** — do not stand up a database, and do not add
credentials to the repo.

---

## Reporting for this brief

Beyond the standard reporting rules, state explicitly:

1. `npm run test` output — counts, and the full list of test names.
2. `npx tsc --noEmit` and `npx eslint` output (0 errors required).
3. **Per test in TASK-0.3: confirmation that you saw it fail when inverted.**
4. Any test you could not write, and the specific reason (most likely: logic not exported / needs
   Phase 1 extraction). This list is expected to be non-empty — it becomes Phase 1 input.
5. **Any test that failed against the current code.** Report it with the actual vs expected value.
   Do **not** fix the underlying code. A genuine failure here is a real find and we will triage it
   together.
6. Confirmation that you changed **no application code** — `git diff --stat` should show only
   `package.json`, `vitest.config.ts`, and files under `tests/`.

---
---

# ARCHIVE — completed briefs

Kept as a short record only. Full detail of what was found and fixed lives in `ai_docs/RISKS.md`
(RISK-038 … RISK-050), which is the authoritative account.

### Brief 1 — Reception ↔ Doctor workflow defects (completed 2026-08-16)
Nine tasks covering RISK-038 (session total silently discarded — no `price` column),
RISK-039 (fabricated payment status / doctor / room), RISK-040 (orphaned & duplicate public
bookings), RISK-041 (admin booking captured no payment; unreachable fallback insert reported
success), RISK-045 (prescription save reported success on failure), RISK-047 (hardcoded doctor and
discarded requested time on approve), RISK-048 (ungated pulse counter, missing out-of-stock).

Review outcome: five defects found in the delivered work and fixed separately — a nullable column
coerced to 0 (reintroducing the "Paid" bug in narrower form), a React stale-closure read after the
setter that populates it, one numbered sub-point silently skipped, cache invalidation applied to 2
of ~20 call sites, and a PATCH payload missing fields the user can still change.

### Brief 2 — Wallet ledger & API authorization (completed 2026-08-16/17)
RISK-042: `wallet_txns` was never written by anything; POS wallet payments never deducted the
balance; package sales never updated `spent_amount` and hardcoded `payments.method` to `'cash'`.
Fixed via a shared `src/lib/wallet.ts` helper used at all four wallet write sites.
RISK-036: twelve routes with no server-side authorization, guarded **per method** so the public
site's unauthenticated reads keep working.

Review outcome: implementation was correct in every detail checked. One documentation error
(a claim that a defect was unfixed when it had been fixed) and one unrequested file deletion,
both corrected.

**What both briefs missed, and why the Phase 0 net exists:** neither review caught that
`GET /api/reservations` had no auth at all (RISK-049), or that Brief 1's public-booking PATCH calls
were being silently rejected with 401 by a pre-existing gate, meaning the bug they fixed was never
actually fixed (RISK-050). Both were found later by direct re-examination. Code review and a green
build did not surface either one — tests would have.
