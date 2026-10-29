# Settle Debt Safety: Manual Test Checklist

> Reasoning: `ai_docs/DECISIONS.md` -> DEC-138; related: `ai_docs/RISKS.md` -> RISK-142, DEC-136. Automated coverage: `tests/routes/settle-debt-safety.test.ts` (route level, in-memory database with injected failures and overlapping requests) and `tests/routes/settle-debt.test.ts`. The failure and overlap cases cannot be produced by clicking, so the browser checks below only confirm the normal path, the error text and that the numbers agree on every screen. Use a throwaway test patient on **dev** only. No migration is needed for this change.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| 2026-10-29 | Route behaviour with injected write failures and overlapping requests | vitest | `tests/routes/settle-debt-safety.test.ts`: 18 cases, 15 failed against the old route, all 18 pass after; `settle-debt.test.ts` 22 pass | Pass |
| 2026-10-29 | `npx tsc --noEmit -p .` and `npx vitest run` | local | tsc clean; 114 files, 1839 passed, 4 expected fail | Pass |
| | Everything below in a browser | | Not run yet | Pending |

## Before testing
- [ ] Log in on dev as a user with `customers.action_settle_balance`. Make a throwaway patient **T** with three completed bookings: A (oldest, total 300, paid 100, 200 left), B (total 500, nothing paid, 500 left), C (total 400, paid 300, 100 left). Each should have its invoice (made through checkout). T's Outstanding should be 800 and Total Spend 400. Note the Transactions rows of T.
- [ ] Also note a second patient **U** with some debt: it must not change in any check below.

## One booking
- [ ] Patient profile -> Settle Balance -> pick booking A -> pay 120 cash. Success message "Settled EGP 120 for session on ...".
- [ ] Booking A now shows paid 220, left 80, payment status Partially Paid. T's Outstanding 680, Total Spend 520.
- [ ] A's invoice shows one new payment of 120 (cash). Transactions shows one new `outstanding_payment` of 120 for T, linked to A's invoice, and its reference matches the payment's.
- [ ] Pay the remaining 80 on A: A shows Paid, Outstanding 600.

## All sessions (oldest first)
- [ ] Settle Balance -> All Sessions -> pay 550. B (500 left) and C (100 left) are the debts left. The oldest booking by date is cleared first, then the next; the response/dialog lists the allocations in that order. After: Outstanding down by 550 (600 -> 50) and Total Spend up by 550.
- [ ] Transactions: one new `outstanding_payment` row per booking touched, amounts adding up to 550. Each touched invoice has one new payment row. U unchanged.
- [ ] Pay more than the total outstanding: refused with "Amount exceeds the outstanding balance", nothing changes anywhere.
- [ ] Pay more than one booking's balance while that booking is selected: refused with "Amount exceeds the session outstanding balance", nothing changes.

## A standalone (package) invoice
- [ ] Sell T a package on credit (invoice with a balance, no booking). Settle Balance -> pick the invoice -> pay part: a new payment row on that invoice, one `outstanding_payment` transaction, T's Outstanding down and Total Spend up by the amount. Pay the rest: the invoice is fully paid.

## Two staff at once (the lost update)
- [ ] Open the same patient in two browsers (two staff accounts, or two windows). In both, pick different bookings. Press Settle in both within a second (second window: type the amount first, then click both quickly). Both must say "Settled". T's Outstanding is down by the sum of both and Total Spend is up by the sum (reload to be sure). Neither amount is missing.
- [ ] Same, but both windows pick the SAME booking and the full balance. Exactly one says "Settled"; the other shows "This booking changed while this was running ... Open the patient again and retry." The booking is paid once, there is one payment row and one transaction for it, and the patient's figures moved once.

## Failure text (cannot be forced from the screen; check the wording if a developer reproduces it)
- [ ] A failed settlement reads "... The payment was not applied and nothing was changed." and the booking, invoice payments, Transactions and the patient's figures are exactly as before.
- [ ] If the text says "some steps already done could not be undone", stop: do not retry; give the developer the `undoFailures` / `applied` lines from the response (browser network tab -> response of `POST /api/customers/settle-debt`), then check that booking's payment rows and Transactions by hand.

## Not changed (confirm quickly)
- [ ] The Settle Balance dialog layout, the session picker, the zero-debt notice and the permission gating behave as before (DEC-136).
- [ ] A patient with no debt still gets "This patient has no outstanding balance to settle."
