# Brief 34 Manual Test Checklist — Laser Package Deficit Safety Net

> **Living document.** Update the evidence table with dated dev results as each check is run.
> **Environment:** linked dev database with the Brief 34 migration applied by the owner. Use a real
> staff session and disposable test bookings/packages only.
>
> Full reasoning and code pointers are in `ai_docs/RISKS.md` → **RISK-094**.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| | | | | |

## Per-check list

### Migration and reservation snapshots

- [ ] Apply `supabase/migrations/20260921000000_add_laser_settlement_columns_to_reservations.sql` manually in the dev environment; confirm it is idempotent on a second run.
- [ ] Complete one `SERVICE`, one `PER_PULSE`, and one `PACKAGE` laser reservation; confirm `laser_payment_mode` stores the selected mode without assigning a value to historical rows.
- [ ] For the per-pulse reservation, confirm `laser_price_per_pulse` stores the agreed rate and `delivered_pulses` stores the delivered count.
- [ ] Against an intentionally unmigrated test schema, trigger the 42703 compatibility path and confirm the response contains `warning` and `droppedColumns`, and the server log prints the same stripped-column list.

### Package consumption boundary and idempotency

- [ ] Give a package 5,000 remaining pulses and request 10,000; confirm exactly 5,000 are consumed, remaining becomes 0, and the response reports `consumed: 5000` and `requested: 10000`.
- [ ] Repeat the same consume request with the same `booking_id`; confirm `alreadyDeducted: true` and no second deduction.
- [ ] Try zero, negative, expired, unknown UUID, and already-depleted packages; confirm each returns a visible 400 error and no balance changes.
- [ ] Consume from a valid synthetic package ID present in the legacy pulse store; confirm it succeeds without a Postgres 22P02 UUID error.

### Choice 3A fails closed

- [ ] Doctor → active laser session → Option 3, using a package with fewer remaining pulses than delivered; select **Buy New Package**.
- [ ] Use a nonexistent catalog package ID, or block `POST /api/packages/sell`; confirm the real server error is shown, the session remains open, the old package balance is unchanged, and no `New Package:` reservation-product line is created.
- [ ] Allow the sale but block the new-package pulse deduction; confirm the message states that the package was sold but the deficit is unresolved, the old package remains unchanged, and the session remains open.
- [ ] Allow sale and deficit deduction but block the invoice-line request; confirm the message states which deficit pulses were deducted, no old-package deduction occurs, and the session remains open.
- [ ] Allow sale, deficit deduction, and invoice line but block old-package consumption; confirm the message lists the completed steps and says the old package pulses were not fully deducted.
- [ ] Let all settlement steps succeed but fail the final reservation completion request; confirm the message reports the exact old- and new-package pulse deductions and the reservation remains incomplete.
- [ ] Run the success path; confirm order is sale → new-package deficit deduction → `New Package:` line → old-package deduction → reservation completion.

### Per-pulse rate resolution

- [ ] Reservation with `laser_price_per_pulse` set and a different Booking Settings default: confirm the reservation snapshot wins in doctor completion, receptionist ending, and invoice generation.
- [ ] Reservation without a snapshot and Booking Settings `defaultPricePerPulse` configured: confirm the clinic default is used.
- [ ] Legacy reservation with neither snapshot nor configured default but an `@ N EGP/pulse` note: confirm the legacy note is used.
- [ ] Reservation with no rate in any source: confirm doctor and receptionist actions are blocked with `Per-pulse rate not configured — set it in Booking Settings`, no invoice line is written, and the reservation is not completed.
- [ ] Confirm no affected flow silently uses 1 EGP per pulse.

### Known follow-ups deliberately outside Brief 34

- [ ] Record that concurrent package deductions still use the shared `page_settings.customer_package_pulses` JSON blob; do not treat this checklist as proof that the cross-patient lost-update race is fixed.
- [ ] Compare package deduction pulses with device-counter pulses when non-laser additional services contain a pulse value; record any mismatch for the queued follow-up rather than changing behavior here.
- [ ] Confirm a catalog pulse package with no real pulse quota is visibly rejected; do not infer quota from its name.
