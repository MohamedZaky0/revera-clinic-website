# Finance Access, Historical Booking Edit & Role Names — Manual Test Checklist

> Covers RISK-107 (finance record permissions), RISK-108 (editing a historical booking) and RISK-109
> (exact role-name matching). Environment: dev (`revera-dev-test`) first, production only after dev passes.
> Automated coverage: `tests/routes/finance-records-auth.test.ts`, `tests/routes/reservations-previous-edit.test.ts`,
> `tests/lib/access.test.ts`, `tests/lib/billing.test.ts`, `tests/lib/historicalInvoice.test.ts`.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| | | | | |

## 1. Finance record permissions (RISK-107)

- [ ] Log in as a **receptionist**. Finance is not in the sidebar. In the browser console run
      `fetch('/api/expenses', { headers: { Authorization: 'Bearer ' + <session token> } }).then(r => r.status)` → **403**.
- [ ] Same for `/api/assets` and `/api/loans` → 403.
- [ ] Log in as **superadmin** → Finance → Expenses: list loads, add an expense, edit it, delete it. All succeed.
- [ ] Finance → Assets & Depreciation and Loans load and can be edited as superadmin.
- [ ] Create a test role with only **View P&L** (`finance.view_pnl`) → the Expenses list loads, but saving a new expense
      shows an error (403). Delete the test role afterwards.
- [ ] Budget vs Actual loads for a role with only `finance.view_pnl`.

## 2. Editing a historical booking (RISK-108)

Prepare: as reception, Add Previous Booking for a test patient — invoice value **1000**, paid **1000**, cash.
Note the patient's Total Spend / Outstanding / Wallet in the profile.

- [ ] As **superadmin**, edit that booking: invoice value **1500**, paid 1000 → saves. Patient profile: Outstanding
      **+500**, Total Spend unchanged, Wallet unchanged.
- [ ] Transactions page: the booking's payment row still shows **1000**, with a TXN number.
- [ ] Edit again: paid **600** → Total Spend drops by 400, Outstanding rises by 400; the transaction row shows 600.
- [ ] Edit again: paid **0** → the booking's payment row disappears from Transactions; Outstanding reflects the full value.
- [ ] Try changing the **phone** in the edit form → a clear error, nothing saved.
- [ ] As **admin** (not superadmin) or receptionist, the edit is refused.
- [ ] Open a normal (non-historical, live) booking's id against the edit endpoint → refused ("Only historical bookings…").
- [ ] Laser marker safety: on a historical booking linked to a pulses package, edit only the notes → the package
      balance and pulse history in the patient profile are unchanged afterwards.
- [ ] New historical booking with **paid 800 and no invoice value** → the patient's Wallet does **not** increase
      (previously it was credited 800).
- [ ] New historical booking with payment type **Bank Transfer** → Transactions shows it as bank transfer (previously
      the row was silently missing).
- [ ] Finance → Cash Flow for that month: historical edits do **not** add cash (they are opening balances).

## 3. Role names (RISK-109)

- [ ] Settings → Role Management: create a role named **"Supervisor"** with only Bookings view. Assign it to a test
      employee, log in → they see only Bookings, not Finance, Settings or Employees. Delete the role afterwards.
- [ ] Existing superadmin accounts still have full access after deploy.
- [ ] Receptionist can still "Enter invoice value" for a historical package with a pending price.
