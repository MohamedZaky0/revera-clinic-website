# TESTING.md — Testing Strategy

> **Last Updated:** 2026-09-30
> **Corrected 2026-09-30 (was stale since 2026-08-03):** this file used to say there is no automated
> test suite. That has not been true for a while — a real **Vitest** suite exists (`package.json`'s
> `"test": "vitest run"`) with ~1,270 tests across ~70 files under `tests/lib/`, `tests/routes/` and
> `tests/components/` (route-handler tests using a shared in-memory Supabase fake, jsdom tests for
> components, and pure-function unit tests for `src/lib/*`). **Treat this file's date and the actual
> test tree (`ls tests/`) as more current than any older doc line claiming otherwise, including
> elsewhere in this file's own prose below where it wasn't fully reconciled.** This file now documents
> four layers, not three.

---

## The four layers

### Layer 0 — Automated tests (Vitest, every change)

```bash
npx vitest run              # full suite
npx vitest run <file path>  # one file, while iterating
npm test                    # same as `npx vitest run`
```

- `tests/lib/*.test.ts` — pure-function unit tests for `src/lib/*` (billing, ledger, capacity,
  laserDeficit, historicalInvoice, historicalPackages, access, etc.).
- `tests/routes/*.test.ts` — route-handler tests. Each mocks `@/lib/supabaseServer` with the shared
  fake at `tests/helpers/supabaseFake.ts` (`.seed()`, `.rows()`, `.setRpc()`, filter chaining) and
  calls the real exported `GET`/`POST`/`PATCH`/`DELETE` handler directly — no server process, no
  network. This is the layer that actually verifies authorization checks, stored-row shapes, and
  ledger/balance arithmetic against something more exacting than a manual click-through.
- `tests/components/*.test.tsx` — jsdom + Testing Library tests for admin React components.
- **Convention, not optional:** a test asserts *correct* business behaviour, never whatever the code
  happens to do today. A known bug gets `it.fails(...)` referencing its `RISK-NNN`, never `it.skip`.
  Five such expected-failures exist in the suite right now — `npx vitest run` reporting "N passed | 5
  expected fail" is the suite being green, not a problem to chase.
- A change to money/authorization/data-integrity logic should come with a test in this layer, not
  only a `scratch/` script or a manual checklist — this layer is what actually runs on every future
  change, the other two do not.

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
  bugs on their own — Layer 0 is what catches those now; historically (before Layer 0 existed) most
  entries in `RISKS.md` were bugs that typechecked and built cleanly.

### Layer 2 — Scratch regression scripts (semi-automated, ad hoc — mostly superseded by Layer 0)

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

Still fully in force — Layer 0's route/component tests do not click through the real browser, so this
layer still catches everything only a human driving the actual UI can catch (see below).

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
1. `tsc`/`eslint` are clean on every touched file (Layer 1), and `npx vitest run` is green — no new
   failures, and no test weakened/deleted to make it pass (Layer 0).
2. If the change touches money, authorization, or data-integrity logic, a Vitest test exists for it
   (Layer 0) — a `scratch/` script is no longer the default for this; write one only for something
   that genuinely needs a live dev-database round trip Layer 0's fake can't stand in for.
3. A manual test checklist file exists under `ai_docs/manual_tests/` for the feature (Layer 3),
   even if live-browser verification is still outstanding — in that case say so explicitly in the
   Dev Notes block rather than implying it was verified. **Typecheck and Vitest passing is not the
   same as a human confirming the feature works in the real UI.**

---

## Gaps in this approach (be honest about them)

- **No CI.** Nothing runs Layer 0/1 automatically on push/PR — it depends on whoever's making the
  change running `npx vitest run` / `npm run check` themselves before committing. There is no branch
  protection enforcing it either, and this repo's history shows uncommitted work (including doc
  edits) getting silently lost when a concurrent session resets/checks out the shared working tree —
  committing promptly is not optional discipline here, it is the only thing standing between "done"
  and "gone."
- **No coverage tracking of any kind** — "tested" currently means "a Vitest test and/or a manual
  checklist exists for this specific scenario," not any measured percentage of code paths.
- **Layer 0's route tests use a fake Supabase client**, not the real database — they verify the
  handler's logic (what it reads, writes, and rejects) but not real Postgres behaviour (actual CHECK
  constraints, actual FK cascades, actual RLS). A handler can pass every Layer 0 test and still fail
  live against a real constraint the fake doesn't model — this has happened (see RISK-108's fixed
  column-name bugs, which the original test didn't catch because the fake never validated column
  names). Real dev-database verification (Layer 2's `scratch/` scripts, or a manual Layer 3 pass) is
  still how schema-level correctness gets checked.
- **Layer 2 scripts run against live dev data**, not fixtures/seeds — a script's assertions can
  silently stop being meaningful if the dev database's data shape drifts (e.g. a script that
  assumes a specific customer/booking exists). None of them currently document their data
  preconditions inline.
- **No load/perf/security testing layer at all.** `SECURITY.md`'s per-route audit (§3) was done by
  hand, via grep — Layer 0 now has some authorization tests (e.g.
  `tests/routes/finance-records-auth.test.ts`, `tests/routes/reports-permissions.test.ts`,
  `tests/lib/access.test.ts`), but coverage is not universal across every route; a newly added route
  can still ship with no authorization test at all.
- **Nothing here validates against the `main`/production database** — all layers assume you are
  pointed at dev. `RISKS.md` RISK-020 documents that dev and main have already diverged in schema in
  the past; a Layer 0/2/3 pass on dev is not proof of anything on main until a migration is actually
  applied there too.
