# Phase 3 Manual Test Checklist — Overheads, Assets, Liabilities

> **Living document.** Update this file with dated dev evidence in the same commit as every 3.x task.

## Evidence log

| Date | Task | Environment | Evidence | Result |
|---|---|---|---|---|
| 2026-07-26 | 3.1–3.7 | dev | All 7 migrations (`20260726170000`–`20260726170600`) applied via `supabase db push --linked`; `supabase migration list --linked` shows local/remote matching exactly. Every `CHECK` constraint tested directly and confirmed rejecting its invalid value; every `ON DELETE` behavior (`SET NULL` ×2, `RESTRICT`, `CASCADE` ×2) confirmed by direct test; both `UNIQUE` constraints confirmed rejecting a duplicate post. The deferred `expenses.recurring_id` FK (task 3.3) confirmed to actually exist by deleting a `recurring_expenses` row and observing `recurring_id` become `NULL` on the referencing `expenses` row. All test fixtures cleaned up — 0 residual rows in all 7 tables | PASS |

## Per-task checklist

- [x] **3.1 Expense categories:** Create fixed, variable, and nested categories; reject invalid kinds and verify parent behavior. `kind: 'bogus'` rejected; parent/child created, parent deleted, child's `parent_id` correctly became `null`.
- [x] **3.2 Expenses:** Create a dated branch expense; confirm category deletion is restricted while the expense exists. `amount: 0` rejected; deleting a category with an expense against it correctly failed (`RESTRICT`).
- [x] **3.3 Recurring expenses:** Generate one recurrence; verify the template remains editable while the posted expense stays immutable and the deferred FK works. `cadence: 'daily'` rejected; the deferred `expenses.recurring_id` FK confirmed live (see evidence log). **Not yet applicable:** "posted expense stays immutable" and "generate one recurrence" describe task 3.10's endpoint behavior, which doesn't exist yet — re-verify once built.
- [x] **3.4 Fixed assets:** Create assets in each category and attach a medical device; verify opening accumulated depreciation is preserved. `category: 'bogus'` rejected; asset created and correctly linked via `device_id` to a real `inventory_devices` row. **Not yet applicable:** "opening accumulated depreciation" requires the opening-balance import (task 1.15/DEC-024), deliberately deferred — no opening asset exists yet to test against.
- [x] **3.5 Depreciation entries:** Post one month twice; verify idempotency and that book value never falls below salvage value. `UNIQUE (asset_id, period)` confirmed rejecting a same-period duplicate insert (the DB-level backstop) and `CASCADE` confirmed on asset deletion. **Not yet applicable:** "idempotency" as an endpoint behavior (check-then-skip, not just rely on the DB error) and the salvage-value floor are task 3.8/3.11's job — re-verify once built.
- [x] **3.6 Loans:** Create a loan with original terms and an opening remaining balance; verify the selected starting balance is correct. `principal: 0` rejected; a loan with real terms created successfully. **Not yet applicable:** "opening remaining balance" is DEC-024's opening-loan-schedule concept (deliberately deferred alongside 1.15) — nothing to select yet.
- [x] **3.7 Loan schedule:** Confirm duplicate loan/period rows are rejected and schedule totals reconcile to principal. `UNIQUE (loan_id, period)` confirmed rejecting a duplicate; `CASCADE` confirmed on loan deletion. **Not yet applicable:** "schedule totals reconcile to principal" needs `generateSchedule()` (task 3.8), which doesn't exist yet.
- [ ] **3.8 Depreciation/amortization library:** Run regression checks for straight-line depreciation, invalid salvage/life input, interest split, and negative-amortization rejection.
- [ ] **3.9 Regression suite:** Record all Phase 3 scratch-check results.
- [ ] **3.10 Expenses endpoints:** Exercise create/read/update/delete and recurring generation with both allowed and denied roles.
- [ ] **3.11 Asset/depreciation endpoints:** Post three monthly periods; hand-check amount, status transition, and book value.
- [ ] **3.12 Loan endpoints:** Create a loan and compare every generated period with a hand-worked amortization example.
- [ ] **3.13 Contract rollup:** Confirm every Phase 3 route is documented and every completed task has evidence.
