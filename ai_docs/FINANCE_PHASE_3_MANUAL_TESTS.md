# Phase 3 Manual Test Checklist — Overheads, Assets, Liabilities

> **Living document.** Update this file with dated dev evidence in the same commit as every 3.x task.

## Evidence log

| Date | Task | Environment | Evidence | Result |
|---|---|---|---|---|

## Per-task checklist

- [ ] **3.1 Expense categories:** Create fixed, variable, and nested categories; reject invalid kinds and verify parent behavior.
- [ ] **3.2 Expenses:** Create a dated branch expense; confirm category deletion is restricted while the expense exists.
- [ ] **3.3 Recurring expenses:** Generate one recurrence; verify the template remains editable while the posted expense stays immutable and the deferred FK works.
- [ ] **3.4 Fixed assets:** Create assets in each category and attach a medical device; verify opening accumulated depreciation is preserved.
- [ ] **3.5 Depreciation entries:** Post one month twice; verify idempotency and that book value never falls below salvage value.
- [ ] **3.6 Loans:** Create a loan with original terms and an opening remaining balance; verify the selected starting balance is correct.
- [ ] **3.7 Loan schedule:** Confirm duplicate loan/period rows are rejected and schedule totals reconcile to principal.
- [ ] **3.8 Depreciation/amortization library:** Run regression checks for straight-line depreciation, invalid salvage/life input, interest split, and negative-amortization rejection.
- [ ] **3.9 Regression suite:** Record all Phase 3 scratch-check results.
- [ ] **3.10 Expenses endpoints:** Exercise create/read/update/delete and recurring generation with both allowed and denied roles.
- [ ] **3.11 Asset/depreciation endpoints:** Post three monthly periods; hand-check amount, status transition, and book value.
- [ ] **3.12 Loan endpoints:** Create a loan and compare every generated period with a hand-worked amortization example.
- [ ] **3.13 Contract rollup:** Confirm every Phase 3 route is documented and every completed task has evidence.
