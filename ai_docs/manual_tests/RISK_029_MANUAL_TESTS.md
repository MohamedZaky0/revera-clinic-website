# RISK-029 Manual Test Checklist — Deposit-Aware Checkout, Cancel/No-Show, Postpone

> **Living document.** Update this file with dated dev evidence as each check is run.
> **Environment:** linked dev database. All current data is mock and may be reset. Use a staff
> bearer token (a real logged-in admin session) for every check below.
>
> Full reasoning and code pointers are in `ai_docs/RISKS.md` → **RISK-029**. This file is just the
> click-through checklist referenced from there.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| | | | | |

## Per-check list

### Checkout charges the remaining balance, not the full price again

- [ ] Book a service with a deposit (`depositPercentage > 0` in Booking Settings) through the public site, and complete the "declare deposit paid" step.
- [ ] In admin, open that booking and start the checkout (Payment Settlement modal). Confirm it shows a **Total Cost / Deposit Already Paid / Balance Due** breakdown — not just the full price.
- [ ] Collect the full Balance Due and complete checkout. Query `customers.spent_amount` for that patient — confirm it equals the **full service price** (deposit + balance), not just the balance collected at checkout.
- [ ] Repeat, but collect only **half** of the Balance Due at checkout. Confirm `customers.outstanding` increases by the unpaid remainder (real patient debt), and `spent_amount` reflects deposit + partial payment only.
- [ ] Book and complete a service with **no deposit** (manual booking, or `depositPercentage = 0`). Confirm checkout behaves exactly as before this fix — full price shown, full price charged.

### Cancel refunds the deposit

- [ ] Take a booking that has a deposit already paid (`pending`, `approved`, or `confirmed` status — not yet `started`/`completed`). Note the customer's current wallet balance and the reservation's `amount_paid`.
- [ ] Click **Cancel** in the booking drawer, confirm the prompt.
- [ ] Confirm: booking status is now `cancelled`; `reservations.amount_paid` and `amount_left` are both `0`; `customers.wallet_balance` increased by exactly the amount that was in `amount_paid` before cancelling.
- [ ] Click **Cancel** again on the same (already-cancelled) booking — confirm it does **not** refund a second time (idempotency).
- [ ] Try to Cancel a `started` or `completed` booking — confirm it's rejected with a clear error, not silently accepted.

### No Show forfeits the deposit

- [ ] Take a different booking with a deposit already paid. Note the customer's current `spent_amount`.
- [ ] Click **No Show**, confirm the prompt (wording should make clear the deposit is *not* refunded).
- [ ] Confirm: booking status is now `no_show`; `reservations.amount_paid` is **unchanged** (deposit stays on record, not zeroed); `amount_left` is `0`; `customers.spent_amount` increased by exactly the deposit amount (forfeited as revenue).
- [ ] Confirm `customers.wallet_balance` did **not** change (no refund happened).
- [ ] Click **No Show** again on the same booking — confirm no double-forfeit.

### Postpone — reschedule with a known date

- [ ] On an active booking, click **Postpone** → "I know the new date" → pick a new date/time → submit.
- [ ] Confirm the booking's `date`/`time_slot` updated to the new values, status is unchanged (still whatever it was — e.g. `approved`), and no money moved (`amount_paid`/`amount_left` untouched).

### Postpone — follow-up later

- [ ] On a different active booking, click **Postpone** → "Not sure yet" → pick a follow-up date → submit.
- [ ] Confirm the booking's status is now `postponed`, `follow_up_date` is set, and the original `date`/`time_slot` are left as-is (stale, not cleared).
- [ ] Confirm the booking appears under the **Postponed** status filter in the bookings list.
- [ ] Re-open that postponed booking, click **Postpone** again → this time pick a known date/time → submit. Confirm status returns to `approved`, the new `date`/`time_slot` are set, and `follow_up_date` is cleared back to null.
- [ ] Try to Postpone a `completed`, `cancelled`, or `no_show` booking — confirm it's rejected with a clear error.

### Related, found in the same testing pass (separate risks, same session)

- [ ] **RISK-028** (customer name/email sync): book twice with the same phone number under two different names. Confirm the `customers` row's `name`/`email` reflect the **second** booking, not the first.
- [ ] **RISK-027** (checkout stock/pulse deduction): define a consumables recipe for a service, note a product's stock, complete a booking for that service, confirm the product's `stock_quantity` actually decreased by the recipe's `standard_qty`. Same check with a `service_devices` link — confirm `inventory_devices.current_pulse_count` increased by `pulses_per_session`.
