# RISK-076 — Financial Transactions Module — Manual Test Checklist

Automated coverage: `tests/routes/transactions.test.ts` (38 tests) covers the route logic against
a fake Supabase client, and `tests/routes/auth-sweep.test.ts` covers the staff-auth boundary. Neither
can prove the fix against the *real* database schema (the fake doesn't validate column names) —
this checklist proves that against a real Supabase project with real customer data.

## Evidence log

| # | Check | Result | Evidence | Date | Tester |
|---|---|---|---|---|---|
| 1 | Opening Transactions on a fresh/empty table shows a real empty state, no fake rows written | | | | |
| 2 | Manual payment/outstanding/wallet/refund/adjustment transactions all persist correctly | | | | |
| 3 | Transaction IDs are sequential (TXN-001001, 001002, ...), never collide | | | | |
| 4 | Adjustment actually changes the patient's wallet balance | | | | |
| 5 | A staff role without `transactions.*` permissions cannot use the API directly | | | | |
| 6 | Refund validation (reason required, cannot exceed original) | | | | |
| 7 | Patient Transactions History tab shows real data matching the ledger | | | | |

## Checks

- [ ] **1.** With the `transactions` table empty (or a fresh Supabase project before this feature
      has ever been used), open Admin → Transactions. Must show "No transactions found." — **not**
      a list of ~9 transactions you never created. Afterward, query `transactions` directly (or
      reopen the screen) and confirm the table is still empty — opening the screen must never
      itself insert rows.
- [ ] **2.** For an existing patient with a known wallet balance, outstanding balance, and spend:
  - Create a **Payment** — confirm `spent_amount` increases by the amount, wallet/outstanding
    unchanged.
  - Create an **Outstanding Payment** for less than or equal to their current outstanding — confirm
    `outstanding` decreases and `spent_amount` increases by the same amount. Try an amount greater
    than their outstanding — must be rejected with a clear error, not silently clamped or a 500.
  - Create a **Wallet Deposit (Top-up)** — confirm `wallet_balance` increases and a `wallet_txns`
    row is written (`direction: in`).
  - Create a **Wallet Withdrawal** for less than or equal to their wallet balance — confirm
    `wallet_balance` decreases and a `wallet_txns` row is written (`direction: out`). Try an amount
    greater than their wallet balance — must be rejected.
  - Create a **Refund** — reason is required (try submitting without one, must be rejected).
    Confirm the transaction records a **negative** amount and status `refunded`, and
    `spent_amount` decreases (not below zero).
- [ ] **3.** Create several manual transactions in a row (of any type) and confirm each gets a
      distinct, sequential `transaction_id` (`TXN-001001`, `TXN-001002`, ...) — not random numbers,
      no duplicates or gaps from a failed insert retry.
- [ ] **4.** Create an **Adjustment** (increase) for a patient — confirm their `wallet_balance`
      actually increases by the amount, and a `wallet_txns` row is written. Create an Adjustment
      (decrease) — confirm the wallet decreases (clamped at 0, cannot go negative). Before this fix,
      an adjustment was recorded as a transaction row but the wallet never actually moved — confirm
      this is no longer the case.
- [ ] **5.** Using Settings → Roles, create or use a role that has **no** `transactions.*`
      permissions granted. Log in as (or impersonate via a test token for) an employee with that
      role and confirm: `GET /api/transactions` → 403, `POST /api/transactions` → 403. Grant
      `transactions.create` only (not `transactions.refund`) and confirm a `payment` transaction
      succeeds but a `refund` or `adjustment` is rejected with 403. Grant `transactions.refund` too
      and confirm refunds/adjustments now succeed.
- [ ] **6.** From a patient's Transactions History tab, start a refund against a specific prior
      transaction. Try refunding more than that original transaction's amount — must be rejected
      with a clear "cannot exceed the original payment" error.
- [ ] **7.** Open a patient's profile → Transactions History tab. Confirm the transactions shown
      match what's actually in the `transactions` table for that patient (spot-check 2-3 against a
      direct DB query), and that `totalSpent`/`patientOutstanding`/`patientWalletBalance` shown
      match the patient's real `customers` row — not the old hardcoded demo values (3250 / 400 /
      1000).
