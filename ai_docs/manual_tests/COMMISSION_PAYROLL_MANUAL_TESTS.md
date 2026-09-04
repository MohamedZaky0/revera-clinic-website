# Commission → Doctor Payroll — Manual Test Checklist

Covers the "doctor finishes a session → commission is earned → HR sees it in payroll → HR marks it
paid" flow, plus the customer-side settlement that happens on the same completion event.

Automated coverage for the pure/route logic now lives in `tests/lib/costing.test.ts` and
`tests/routes/doctor-payroll.test.ts`. This file covers what those cannot: the real database, the
real admin UI, and the ordering of steps a human actually performs.

Related: RISK-015 (payroll is not an immutable ledger), RISK-016 (billed vs collected revenue).

## Evidence log

| # | Check | Result | Evidence (screenshot / note) | Date | Tester |
|---|---|---|---|---|---|
| 1 | Commission snapshot written at completion | | | | |
| 2 | Percentage commission matches configured rate | | | | |
| 3 | Fixed commission ignores service price | | | | |
| 4 | Per-service commission override wins over provider default | | | | |
| 5 | `none` commission type earns 0 | | | | |
| 6 | Payroll run picks up only completed sessions | | | | |
| 7 | Payroll attributes to the right doctor | | | | |
| 8 | Re-running payroll for the same month does not duplicate | | | | |
| 9 | Marking payroll Paid stamps a payment date | | | | |
| 10 | Customer balance settles on the same completion | | | | |
| 11 | Wallet is drawn down when used at checkout | | | | |
| 12 | Outstanding recorded when the customer underpays | | | | |
| 13 | Paying off outstanding later does not double-count | | | | |
| 14 | Cancelling/no-show does not earn commission | | | | |
| 15 | Session completed after payout changes a Paid figure (known gap) | | | | |

## Setup

- [ ] A provider (doctor) exists with `commission_type = percentage`, `commission_value = 15`,
      and a known `fixed_salary`.
- [ ] A second provider exists, so cross-doctor attribution can be checked.
- [ ] At least one service exists with a known price (e.g. 500 EGP).
- [ ] A test customer exists with a known starting wallet balance, spent, and outstanding.

## Doctor side — commission is earned at completion

- [ ] **1.** Book the test service for the test customer with the test doctor. Mark the booking
      `completed` from Reception. Then, in the database, confirm an `invoices` row exists for that
      reservation and its `invoice_lines` row has a non-NULL `commission_snapshot`.
- [ ] **2.** With `commission_type = percentage` and `commission_value = 15` on a 500 EGP service,
      `commission_snapshot` is **75.00**.
- [ ] **3.** Change the doctor to `commission_type = fixed`, `commission_value = 150`. Complete a
      new booking on a differently-priced service. `commission_snapshot` is **150.00** — the
      service price does not affect it.
- [ ] **4.** Set a per-service commission override on the doctor for one specific service (a
      different type/value from their default). Complete a booking for that service. The snapshot
      follows the **override**, not the provider default.
- [ ] **5.** Set the doctor to `commission_type = none`. Complete a booking. `commission_snapshot`
      is **0**, and the doctor's payroll commission does not increase.
- [ ] **14.** Create a booking, then cancel it (and separately, mark one as no-show). Confirm no
      commission is attributed for either — they never reach `completed`.

## HR side — payroll picks it up

- [ ] **6.** Go to **HR → Doctor Payroll** and run payroll for the month containing the completed
      bookings. The doctor's `completed_services_count` counts only bookings whose status is
      `completed` — pending, confirmed, cancelled, and no-show bookings are excluded.
- [ ] **7.** With two doctors having completed sessions in the same month, each doctor's
      `total_commission_earned` reflects only their own sessions. No commission from the other
      doctor appears on either row.
- [ ] **8.** Run payroll for the same month a second time. Confirm there is still exactly **one**
      payroll row per doctor for that month (upsert, not duplicate), and the figures are refreshed
      rather than doubled.
- [ ] **9.** Mark the payroll row **Paid**. Confirm the status shows Paid in the UI and a payment
      date is recorded. Reload the page and confirm it persists.
- [ ] **15.** *(Known defect — RISK-015. The correct result is described here; the system currently
      does the opposite, so this check is expected to FAIL until the defect is fixed.)* After
      marking a row Paid, complete one more booking for that same doctor in that same month, then
      edit the payroll row again (any change). **Correct behaviour: the Paid commission total does
      not change** — the new session belongs to a later payroll run, and a paid figure is a record
      of money that already left the clinic. Record the number you actually observe.

## Customer side — money settles on the same completion

- [ ] **10.** Note the customer's wallet / spent / outstanding before completing a booking.
      Complete a booking where the customer pays the full amount. Confirm `spent` increases by
      exactly the amount paid and `outstanding` does not change.
- [ ] **11.** Complete a booking where part of the payment is taken from the customer's wallet.
      Confirm the wallet balance drops by that amount, `spent` includes the wallet-funded portion,
      and a `wallet_txns` ledger row was written for the movement.
- [ ] **12.** Complete a booking where the customer pays less than the total. Confirm `outstanding`
      increases by exactly the unpaid remainder shown on the booking.
- [ ] **13.** For the booking from check 12, record a later payment against the outstanding amount.
      Confirm `outstanding` drops by that payment and `spent` rises by it — and that the original
      completion is not counted a second time (totals move by the delta only, not the full amount
      again).
