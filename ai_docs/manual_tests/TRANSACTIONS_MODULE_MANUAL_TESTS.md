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
| 8 | Completing a booking now records service_charge + payment automatically | | | | |
| 9 | Selling a product / package records its transaction automatically | | | | |
| 10 | Today's Payments counts only cash; Estimated line shows the charged total | | | | |
| 11 | Refund cumulative cap + cross-patient rejection + destination choice | | | | |
| 12 | Settle Balance allocates against real bookings, not just the aggregate | | | | |

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

---

## Second pass — automatic ledger, refunds, settlement (2026-08-29)

Added after the deep business-logic audit. Checks 1–7 above cover the manual form; these cover the
automatic recording and the new flows.

- [ ] **8.** Complete a real booking through the normal checkout with a partial payment (e.g. a 500
      service, pay 300). Then open that patient's **Transactions History** tab. You must see **two**
      new rows: a `service_charge` for 500 (what they were billed) and a `payment` for 300 (what
      they handed over). Both must show as source **automatic**. Before this pass the tab stayed
      empty no matter how many visits a patient had.
- [ ] **8b.** Re-open and re-save that same completed booking (or re-fire the checkout). Confirm
      **no duplicate** transaction rows appear — still exactly one charge and one payment.
- [ ] **9.** Sell a product to a patient (Patients → profile → Sell Product) and sell a package.
      Confirm each appears in that patient's Transactions History automatically.
- [ ] **10.** On Admin → Transactions, check the **Today's Payments** card. It must equal only real
      cash movement today (payments + outstanding settlements + wallet top-ups, minus refunds) — a
      `service_charge` from check 8 must **not** inflate it. Underneath it, the smaller **"Estimated
      today"** line should show the full value charged today including that service charge.
- [ ] **11.** Refund checks, in order against a single 500 payment:
  - Refund 200 → succeeds.
  - Try to refund another 400 → must be **rejected**, telling you only 300 is left.
  - Refund the remaining 300 → succeeds.
  - Try to refund anything more → must be rejected as **fully refunded**.
  - Pick a refund and choose **Wallet Credit** as the destination → confirm the patient's wallet
    balance actually increases by that amount and a wallet ledger row is written. Repeat with
    **Cash Back** → wallet must be untouched.
  - Try selecting an original transaction that belongs to a **different patient** (via the API
    directly if the UI prevents it) → must be rejected.
- [ ] **12.** Settle Balance (the main one — this is what prevents the double-counting):
  - Find a patient with outstanding debt from a completed booking. Note the booking's remaining
    amount.
  - Patients → 3-dots → **Settle Balance** → pay part of it.
  - Confirm: the patient's Outstanding drops by that amount, **and** the underlying booking's own
    `amount_left` drops by the same amount (check the booking, not just the patient row). This is
    the whole point — if only the patient total moved, the bug is back.
  - Confirm a `payments` row was appended to that booking's existing invoice (no second invoice).
  - Confirm an `outstanding_payment` row appears in the patient's Transactions History.
  - With several unpaid bookings, confirm the payment clears the **oldest first**.
  - If the patient's recorded debt is larger than their unpaid bookings account for, confirm the
    modal warns you that part of it **could not be allocated** rather than silently reducing the
    balance.
