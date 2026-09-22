# Brief 34 Manual Test Checklist — Laser Package Deficit Safety Net

> **Living document.** Update the evidence table with dated dev results as each check is run.
> **Environment:** linked dev database with the Brief 34 migration applied by the owner. Use a real
> staff session and disposable test bookings/packages only.
>
> Full reasoning and code pointers are in `ai_docs/RISKS.md` → **RISK-094** (the overall safety net)
> and **RISK-095** (a regression this live pass found in RISK-094's own rate-resolution fix).

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| 2026-09-22 | Migration applied to dev | `revera-dev-test` (`ikbmnkjikxduwsyjxsqn`), via `npx supabase db push --linked` | All 7 pending migrations (including `20260921000000_...laser_settlement_columns...`) applied cleanly in one pass; `migration list` showed 0 unapplied afterward. Idempotency is by construction (`ADD COLUMN IF NOT EXISTS` + guarded `DO $$` constraint block, same shape as the existing `packages_package_type_check` pattern) — not separately re-run. | PASS |
| 2026-09-22 | Choice 3A fails closed — all 4 injected failures | Real doctor account (`ZZTEST Doctor Brief34`, department `Doctors`), real patient (`ZZTEST5 BriefDoctor`), real package drained to 200/10,000 remaining, session delivering 500 pulses (300 deficit), Choice 3A. Each of the 4 steps (sell, new-package deduction, invoice line, old-package consumption) was blocked in turn by intercepting `window.fetch` for that one endpoint. | **Sell blocked:** alert verbatim "SIMULATED: package sale failed for test Nothing was charged and the session was not completed."; DB confirmed 0 packages sold, old package still 200, reservation still `started`. **Deduction blocked:** alert "The new package was sold, but the 300-pulse deficit was not fully deducted..."; DB: new package created with 10,000/10,000 untouched, old package still 200, `started`. **Invoice-line blocked:** alert "...300 deficit pulses were deducted, but its session invoice line was not saved..."; DB: new package correctly shows 300 used, old package still 200 (untouched), `started`. **Old-package-consumption blocked:** alert "...invoice line was saved, but the old package's 200 pulses were not fully deducted..."; DB: new package 300 used, old package still 200, `started`. | PASS (4/4) |
| 2026-09-22 | Choice 3A — final completion PATCH itself fails | Same scenario, all settlement steps allowed to succeed, only the final `PATCH /api/reservations {status:'completed'}` blocked | DB confirmed: new package correctly deducted 300, **old package correctly consumed to 0** (all settlement steps really did succeed), reservation correctly stayed `started`. (Alert text not captured this run — a page reload raced the read — but the DB state is the authoritative check and it is correct.) | PASS |
| 2026-09-22 | Choice 3A — genuine success path | First live attempt hit **RISK-095** (see below) and failed with a false "Per-pulse rate not configured". After the RISK-095 fix, re-verified directly against `PATCH /api/reservations` with real Choice-3A-shaped notes (`[Laser Package Redemption]: ...Purchased new package...` + `[Laser Settlement]: ...covered via New Pulses Package...`), no rate configured anywhere in the environment | `200`, `status: "completed"`. Negative control in the same pass: identical request but with genuine per-pulse-mode notes (`...charged per pulse...`) still correctly returned `400 Per-pulse rate not configured`. | PASS (after fix) |
| 2026-09-22 | **RISK-095 found and fixed**: 3A completion wrongly required a per-pulse rate | Discovered during the success-path check above | `isPerPulseMode` in both `writeCheckoutInvoice` and the `PATCH` handler (`src/app/api/reservations/route.ts`) treated the mere presence of the universal `[Laser Settlement]` notes tag as "needs a rate". Fixed to key on the phrase `charged per pulse`, which only the two rate-using branches (plain per-pulse, and Choice 3B) actually write. 6 new tests in `tests/routes/reservations-patch.test.ts`; 3 confirmed to fail without the fix. | RESOLVED |
| 2026-09-22 | Package consumption clamp (approximation of the 5,000/10,000 example) | Same test package, direct API | Drained 9,800/10,000 via `consume_package_pulses`; response `consumed: 9800`, `remaining_pulses: 200`. Did not separately repeat with the checklist's exact 10,000-request-against-5,000-remaining numbers — covered instead by the automated `tests/routes/packages-consume-pulses.test.ts` (Brief 34 item 2), not re-run live with these exact numbers. | PARTIAL |

## Per-check list

### Migration and reservation snapshots

- [x] Apply `supabase/migrations/20260921000000_add_laser_settlement_columns_to_reservations.sql` manually in the dev environment; confirm it is idempotent on a second run. — Applied 2026-09-22 (as part of all 7 pending migrations); idempotency is by construction, not re-run live. See Evidence log.
- [ ] Complete one `SERVICE`, one `PER_PULSE`, and one `PACKAGE` laser reservation; confirm `laser_payment_mode` stores the selected mode without assigning a value to historical rows.
- [ ] For the per-pulse reservation, confirm `laser_price_per_pulse` stores the agreed rate and `delivered_pulses` stores the delivered count.
- [ ] Against an intentionally unmigrated test schema, trigger the 42703 compatibility path and confirm the response contains `warning` and `droppedColumns`, and the server log prints the same stripped-column list.

### Package consumption boundary and idempotency

- [~] Give a package 5,000 remaining pulses and request 10,000; confirm exactly 5,000 are consumed, remaining becomes 0, and the response reports `consumed: 5000` and `requested: 10000`. — Approximated live 2026-09-22 with different numbers (9,800/10,000); exact numbers covered by the automated `packages-consume-pulses.test.ts` instead. See Evidence log.
- [ ] Repeat the same consume request with the same `booking_id`; confirm `alreadyDeducted: true` and no second deduction.
- [ ] Try zero, negative, expired, unknown UUID, and already-depleted packages; confirm each returns a visible 400 error and no balance changes.
- [ ] Consume from a valid synthetic package ID present in the legacy pulse store; confirm it succeeds without a Postgres 22P02 UUID error.

### Choice 3A fails closed

- [x] Doctor → active laser session → Option 3, using a package with fewer remaining pulses than delivered; select **Buy New Package**. — Done live 2026-09-22 with a real doctor account and patient.
- [x] Use a nonexistent catalog package ID, or block `POST /api/packages/sell`; confirm the real server error is shown, the session remains open, the old package balance is unchanged, and no `New Package:` reservation-product line is created. — Verified 2026-09-22, see Evidence log.
- [x] Allow the sale but block the new-package pulse deduction; confirm the message states that the package was sold but the deficit is unresolved, the old package remains unchanged, and the session remains open. — Verified 2026-09-22, see Evidence log.
- [x] Allow sale and deficit deduction but block the invoice-line request; confirm the message states which deficit pulses were deducted, no old-package deduction occurs, and the session remains open. — Verified 2026-09-22, see Evidence log.
- [x] Allow sale, deficit deduction, and invoice line but block old-package consumption; confirm the message lists the completed steps and says the old package pulses were not fully deducted. — Verified 2026-09-22, see Evidence log.
- [x] Let all settlement steps succeed but fail the final reservation completion request; confirm the message reports the exact old- and new-package pulse deductions and the reservation remains incomplete. — Verified 2026-09-22 against the DB (alert text not captured that run); see Evidence log.
- [x] Run the success path; confirm order is sale → new-package deficit deduction → `New Package:` line → old-package deduction → reservation completion. — This is exactly what surfaced **RISK-095**: the first live attempt failed at the last step with a false "Per-pulse rate not configured". Re-verified after the fix (see Evidence log) via a direct, realistic `PATCH /api/reservations` call rather than a fresh UI click-through (the UI's package dropdown was left stale by the repeated failure-injection runs above) — a full UI click-through of the clean success path is still worth doing once.

### Per-pulse rate resolution

- [ ] Reservation with `laser_price_per_pulse` set and a different Booking Settings default: confirm the reservation snapshot wins in doctor completion, receptionist ending, and invoice generation.
- [ ] Reservation without a snapshot and Booking Settings `defaultPricePerPulse` configured: confirm the clinic default is used.
- [ ] Legacy reservation with neither snapshot nor configured default but an `@ N EGP/pulse` note: confirm the legacy note is used.
- [x] Reservation with no rate in any source: confirm doctor and receptionist actions are blocked with `Per-pulse rate not configured — set it in Booking Settings`, no invoice line is written, and the reservation is not completed. — Verified 2026-09-22 for the genuine per-pulse case (still correctly blocks). Also where **RISK-095** was found: this used to incorrectly block Choice 3A too, which needs no rate at all — fixed, see Evidence log.
- [ ] Confirm no affected flow silently uses 1 EGP per pulse.

### Known follow-ups deliberately outside Brief 34

- [ ] Record that concurrent package deductions still use the shared `page_settings.customer_package_pulses` JSON blob; do not treat this checklist as proof that the cross-patient lost-update race is fixed.
- [ ] Compare package deduction pulses with device-counter pulses when non-laser additional services contain a pulse value; record any mismatch for the queued follow-up rather than changing behavior here.
- [ ] Confirm a catalog pulse package with no real pulse quota is visibly rejected; do not infer quota from its name.
