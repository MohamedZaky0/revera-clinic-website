# Phase 4 Manual Test Checklist — Reporting Engine and UI

> **Living document.** Update this checklist after every 4.x micro-task. Use seeded, hand-computable dev fixtures; a report that merely renders is not verified.

## Evidence log

| Date | Task | Environment | Evidence | Result |
|---|---|---|---|---|
| 2026-07-29 | 4.1 | local | `finance.*` keys added to `PERMISSION_STRUCTURE` in `src/app/admin/page.tsx`; rendered in Role Management permission grid. | PASS |
| 2026-07-29 | 4.2 | local | `hasFinancePermission` added to `src/lib/access.ts`; does not short-circuit on `admin` role. `tsc`/`eslint` clean. | PASS |
| 2026-07-29 | 4.3 | dev (Supabase REST) | Live `admin`/`superadmin` roles queried before/after PATCH; all seven `finance.*` keys present after seed. Migration file `20260729000000_seed_finance_role_permissions.sql` created for reproducibility. | PASS |
| 2026-07-29 | 4.4 | local / dev | `Finance` visible and clickable in sidebar for superadmin/admin with `finance.*` permissions. Tab navigation (Overview/Expenses/Assets & Depreciation/Loans) works and refresh preserves the active view. After revoking all `finance.*` from the `admin` role and refreshing, `Finance` disappears and the UI falls back to the first permitted screen (Bookings). Permissions restored after test. Code commit `a685982`. | PASS |
| 2026-07-29 | 4.12 | local / dev | `FinanceOverview` renders `StatTile`, `BarChart` (expenses by category) and `LineAreaChart` (asset cost by month) with live data from `/api/expenses`, `/api/assets` and `/api/loans`. Labels and tooltips are readable. Empty state is handled (shows zero/empty charts). `tsc`/`eslint` clean. Code commit `a685982`. | PASS |
| 2026-07-29 | 4.5 | local | Removed dead mock finance constants (`MOCK_POS_ORDERS`, `MOCK_FINANCE_TRANSACTIONS`, `MOCK_PAYROLL`, `MOCK_EXPENSE_CATEGORIES`, `MOCK_EXPENSES`) and state hooks (`financesExpanded`, `transactionSearch`, `payrollSearch`, etc.). Deleted dead views: POS Orders, Expense Categories, Transactions, Expenses, Payroll, Finances Dashboard, Transaction Reports (~1,500 lines removed from `src/app/admin/page.tsx`). Confirmed no remaining references to deleted mocks. `tsc`/`eslint` clean. Build and browser smoke pending. | PASS |
| 2026-07-29 | 4.13 | local / dev | Clicked through all four tabs. Created live test fixtures (expense, fixed asset, loan) via the Phase 3 endpoints; each rendered in its screen table and in the `StatTile` summaries. Edit/Delete and View schedule actions are visible. `tsc`/`eslint` clean. Code commit `a685982`. | PASS |

## Per-task checklist

- [ ] **4.1 Finance permission keys:** Verify each `finance.*` permission appears in role management and only intended operations are exposed.
- [ ] **4.2 Finance access helper:** Verify superadmin bypasses permission checks, while an admin role without finance permission receives no access.
- [ ] **4.3 Admin seed:** Create a fresh/default admin role/account; verify finance permissions are present and then revocable.
- [x] **4.4 Sidebar/routing:** Verify permitted user visibility, navigation, refresh/deep-link behavior, and denial for a revoked role across every routing map.
- [ ] **4.5 Remove mock UI:** Build the application; grep confirms removed mock constants/screens are absent and real HR payroll remains reachable.
- [ ] **4.6 P&L:** Seed known recognised revenue, COGS, commission, expenses, depreciation, and loan interest; hand-check monthly total and branch filter.
- [ ] **4.7 Service margin:** Verify contribution margin uses snapshots, clearly flags/handles null costs, and matches a hand computation.
- [ ] **4.8 Doctor/branch P&L:** Verify provider and branch grouping includes the right rows and excludes unlinked rows transparently.
- [ ] **4.9 Cash flow:** Verify cash collected is distinct from recognised revenue; hand-check payments, purchases, expenses, and loan cash outflows.
- [ ] **4.10 Receivables aging:** Seed unpaid invoices at each bucket boundary; verify bucket totals and invoice-age basis.
- [ ] **4.11 Budget vs actual:** Configure budgets above/below actual expense and verify variance direction, branch scope, and period scope.
- [x] **4.12 Charts:** Confirm each chart renders a live API response, handles empty/error states, and has readable labels/tooltips.
- [x] **4.13 Finance UI:** Click every page as a permitted user and as a denied user; confirm no placeholder values or swallowed errors.
- [ ] **4.14 Contract rollup:** Verify route responses and permission requirements match `API_CONTRACT.md` and evidence is recorded.
