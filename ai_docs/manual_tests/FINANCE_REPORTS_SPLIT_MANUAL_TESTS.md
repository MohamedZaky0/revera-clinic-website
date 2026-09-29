# Finance / Reports Split (DEC-097) — Manual Test Checklist

> Automated coverage: `tests/routes/reports-permissions.test.ts`, `tests/components/reports/ReportsSection.test.tsx`,
> `tests/components/Finance/FinanceSection.test.tsx`. Environment: dev first, then production after merge.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| | | | | |

## 1. Finance section

- [ ] As **superadmin**, open Finance. Tabs are grouped: **Overview** · **Records** (Expenses, Assets & Depreciation,
      Loans) · **Statements** (P&L, Cash Flow, Receivables Aging, Commission Payouts). Nothing else.
- [ ] Budget vs Actual is **not** shown (hidden by DEC-097, planned for later study).
- [ ] Each remaining tab loads without a console error.
- [ ] Switch the admin language to Arabic → Finance title, group headings and tab labels are Arabic.

## 2. Reports section

- [ ] Sidebar → **Reports**. The old page with "+18.2% vs last month" and invented doctors is gone.
- [ ] Groups: **Performance** (Trend, Service Margins, Doctor / Branch P&L, Package Profitability) · **Operations**
      (Capacity, Service Mix, No-Show / Cancellations) · **Patients** (New vs Returning). Each loads real data.
- [ ] The numbers on each moved report match what the same report showed inside Finance before the change
      (same month, same branch).
- [ ] Arabic: title "التقارير", Arabic group headings and tabs, right-to-left layout.

## 3. Permissions

- [ ] The existing **admin** role (has `finance.*`) sees both Finance and Reports with all tabs.
- [ ] Create a test role with only **View Operational Reports** → sidebar shows Reports (not Finance); only the
      Capacity tab is visible. Delete the role afterwards.
- [ ] Create a test role with only **View Financial Reports** → Reports shows every tab except Capacity; Finance is
      not in the sidebar; opening `/api/finance/pnl` with that token returns 403.
- [ ] Receptionist: neither Finance nor Reports in the sidebar.
- [ ] Known limitation: a legacy role holding only one of `finance.view_pnl` / `finance.view_margins` (and no
      `reports.*` key) sees all financial report tabs, but some return a permission error. No production role is in
      this state (checked 2026-09-29: admin holds all `finance.*`).

## 4. Reception dashboard link

- [ ] Reception dashboard → "View transactions" opens **Transactions** (it used to open Finance).

## 5. Finance Overview (rebuilt, Step 3)

- [ ] Finance → Overview shows a **Month** and **Branch** selector, defaulting to the current month / all branches.
- [ ] Tiles: Revenue earned, Cash received, Contribution margin, Profit after overheads, Expenses this month,
      Net cash flow, Owed by patients, Prepaid packages not yet delivered; plus Total asset cost and Total loans.
- [ ] Each value equals the same figure on its own screen for the same month/branch: Revenue/margin/profit/expenses
      = P&L; Cash received = the P&L's cash bridge card; Net cash flow = Cash Flow; Owed by patients = Receivables Aging
      total; Prepaid packages = the P&L's deferred packages card.
- [ ] With no expenses recorded for the month, the note "No expenses recorded this month" appears.
- [ ] When some sales have no cost recorded (current production state), the amber "profit is overstated" warning appears.
- [ ] Change the month → every tile reloads for that month (Owed by patients and Prepaid packages stay "as of today").
- [ ] Arabic: labels are Arabic, amounts read "12,345 ج.م".
- [ ] No tile ever shows a made-up 0: if a figure fails to load it shows "—".
