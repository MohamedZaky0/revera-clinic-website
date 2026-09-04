# TESTING.md — Testing Strategy

> **Last Updated:** 2026-08-03
> **Reality check:** there is no automated test suite (no Jest/Vitest/Playwright/Cypress in
> `package.json`). This file documents the testing approach that actually exists — three layers,
> none of which is "unit tests" in the conventional sense — and where each one's evidence lives.
> Don't assume test coverage from this file's existence; assume it from the actual per-feature
> evidence in `ai_docs/manual_tests/` and the checks described below.

---

## The three layers

### Layer 1 — Static checks (automated, every change)

```bash
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm run build       # next build
npm run check       # all three, in order
```

- Run `npm run typecheck` (or `npx tsc --noEmit -p tsconfig.json` scoped to touched files) after
  every non-trivial edit. This catches type mismatches across the dual-storage pattern, missing
  fields on `NextResponse.json()` payloads, etc.
- `npm run lint` catches unused vars, `prefer-const`, and similar. **Do not fix pre-existing lint
  errors incidentally while touching a file for something else** — verify whether an error existed
  before your change (`git show HEAD:<file> | npx eslint --stdin --stdin-filename <file>`) before
  deciding whether it's in scope.
- These three catch type/syntax/build errors. They catch **zero** business-logic or data-integrity
  bugs — most entries in `RISKS.md` are bugs that typechecked and built cleanly.

### Layer 2 — Scratch regression scripts (semi-automated, ad hoc)

`scratch/*.ts`, run directly against the linked dev database via `npx tsx scratch/<name>.ts`
(uses real Supabase env vars from `.env.local` — **always confirm you're pointed at dev, never
main/production, before running one**).

These are not a formal test framework — no shared runner, no assertions library, no CI wiring.
Each is a standalone script written during a specific bug fix to reproduce and verify it, named
after what it checks (e.g. `identitycheck.ts`, `pricecheck.ts`, `billingcheck.ts`,
`phase5servicemixendpointcheck.ts`). The convention, established across the Finance Phase 1–5 work
and the RISK-018 identity fix:

1. When fixing a bug that involves data/calculation correctness (not just UI), write a `scratch/`
   script that exercises the actual code path (calls the real API route or the real pure-function
   library) against a small set of representative cases, including the specific case that was
   broken.
2. Print pass/fail per case rather than throwing on first failure, so one run shows the full
   picture.
3. Keep the script after the fix lands — it becomes a regression check. `RISK-018`'s fix note
   explicitly re-ran `pricecheck.ts` and `billingcheck.ts` (written for earlier, unrelated fixes)
   as regression checks alongside the new `identitycheck.ts`, because the identity fix touched
   code those scripts already covered.
4. **These scripts are not auto-discovered or auto-run.** There's no `npm test` that sweeps
   `scratch/`. If you fix something these scripts cover, you have to know to re-run the relevant
   ones by name — check `RISKS.md`'s entry for the area you're touching for which scripts exist.

This layer covers **pure calculation and API-contract correctness** — pricing, billing, identity
scoping, capacity/breakeven/service-mix math, stock/pulse deduction math. It does not cover UI
rendering, click-through flows, or anything requiring a real browser session.

### Layer 3 — Manual browser test checklists (human-run, per feature)

`ai_docs/manual_tests/*.md` — one file per feature or fix, each following the same format
(established by `RISK_029_MANUAL_TESTS.md`, `FINANCE_PHASE_3B_MANUAL_TESTS.md`):

```markdown
# <FEATURE> Manual Test Checklist — <short description>

> **Living document.** Update this file with dated dev evidence as each check is run.
> **Environment:** linked dev database. ...
> Full reasoning and code pointers are in `ai_docs/RISKS.md` → **RISK-XXX** (or `DECISIONS.md`).

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|

## Per-check list

### <Scenario name>
- [ ] Step-by-step click-through instruction, phrased as an action + an explicit expected
      outcome (state, DB value, or UI text to confirm) — not just "test the feature."
```

**Per `CLAUDE.md`'s working agreement, this is mandatory for every feature/fix, not optional for
"small" ones.** Create a new file, or append a new numbered section to an existing one if the work
continues an already-tracked feature (the `FINANCE_PHASE_*` files are the pattern for a
multi-session feature). Reference the checklist file from the relevant `RISKS.md`/`DECISIONS.md`
entry, and as the "Test Note" line in the Dev Notes block handed back to the user.

**What this layer catches that Layers 1–2 can't:** anything involving real click-through UX,
cross-component state (e.g. does a Cancel actually refund into the visible wallet balance), and
anything that only manifests through the actual admin/public UI rather than a direct API call.

**What it does not give you:** repeatability without a human. A checklist file is evidence a check
was run once, on one date, by one person — not a guarantee it stays true after the next change.
Treat an old, un-updated checklist as **unverified against current code**, not as passing.

---

## What "Done" requires (per `CLAUDE.md`)

A task is `Status: Done` only when:
1. `tsc`/`eslint` are clean on every touched file (Layer 1).
2. If the change touches calculation/data-integrity logic, a `scratch/` regression script exists
   and was run (Layer 2) — write one if none of the existing ones cover the new case.
3. A manual test checklist file exists under `ai_docs/manual_tests/` for the feature (Layer 3),
   even if live-browser verification is still outstanding — in that case say so explicitly in the
   Dev Notes block rather than implying it was verified. **Typecheck passing is not the same as a
   human confirming the feature works.**

---

## Gaps in this approach (be honest about them)

- **No CI.** Nothing runs Layer 1 automatically on push/PR — it depends on whoever's making the
  change running `npm run check` themselves. There is no branch protection enforcing it either.
- **No coverage tracking of any kind** — "tested" currently means "a `scratch/` script and/or a
  manual checklist exists for this specific scenario," not any measured percentage of code paths.
- **Layer 2 scripts run against live dev data**, not fixtures/seeds — a script's assertions can
  silently stop being meaningful if the dev database's data shape drifts (e.g. a script that
  assumes a specific customer/booking exists). None of them currently document their data
  preconditions inline.
- **No load/perf/security testing layer at all.** `SECURITY.md`'s per-route audit (§3) was done by
  hand, once, via grep — not by any repeatable check. If you fix an authorization gap, there is
  currently nothing that would catch a regression back to "no auth" later.
- **Nothing here validates against the `main`/production database** — all three layers assume you
  are pointed at dev. `RISKS.md` RISK-020 documents that dev and main have already diverged in
  schema; a checklist passing on dev is not proof of anything on main.

If a real automated suite is ever introduced (Jest/Vitest for pure functions like `src/lib/`
calculators, Playwright for the booking/checkout flows), Layer 2's `scratch/` scripts are the
natural seed for unit-test cases — most already isolate the exact input/output pairs that mattered.
