# Pulse Revenue Recognition Manual Test Checklist (DEC-088 / RISK-104)

> **Living document.** Update the evidence log with dated results as each check is run.
> **Migration:** `supabase/migrations/20260925000000_pulse_revenue_recognition.sql` (idempotent, additive; the whole file
> can be re-run). **Applied to dev 2026-09-25. NOT applied to production** — the owner applies it.
> **Order on production:** (1) apply the migration; (2) run `scripts/backfill_pulse_revenue_recognition_dry_run.sql`
> (SELECT only) and read it; (3) run `scripts/backfill_pulse_revenue_recognition.sql`. Never make a dry run by calling
> the catch-up function — it writes.
> **Rollback:** the migration only adds a column, a nullable relaxation, a column/index/constraint and three functions;
> `consume_package_pulses` keeps its signature. To roll back, restore the previous `consume_package_pulses` body from
> `20260922000000_package_pulse_balance_to_columns.sql` and `DELETE FROM package_revenue_recognitions WHERE
> package_pulse_usage_id IS NOT NULL`.
>
> Scope of this first release: recognition on consume, the catch-up/backfill functions, the `price_pending` column.
> **Not built yet:** the Finance bridge + deferred-balance breakdown (DEC-088 item 9), the "Enter invoice value" action
> and badge (item 6 UI), the previous-bookings route setting `price_pending` (item 6), and expiry breakage (item 5).

## Evidence log

The in-memory `supabaseFake` cannot run PL/pgSQL, so this feature is verified against the real dev database (as Brief 34B was).

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| 2026-09-25 | Apply migration | dev | `db push --linked` applied `20260925000000`; only that migration was pending | Pass |
| 2026-09-25 | Re-run the whole migration (`db query -f`) | dev | No error — idempotent | Pass |
| 2026-09-25 | Consume 1,000 of 3,000 pulses on a 5,000 EGP package (booking A) | dev, disposable package | `recognised` = 1,666.67 | Pass |
| 2026-09-25 | Replay the same booking | dev | `already_deducted = true`, `recognised = 0`, no new row | Pass |
| 2026-09-25 | Second 1,000 (booking B); third 1,000 (booking C) | dev | 1,666.66 then 1,666.67 → total exactly **5,000.00** at depletion, `status = fully_used` | Pass |
| 2026-09-25 | Consume with NO booking | dev | pulses deducted, `recognised = 0`, no recognition row (its share stays deferred) | Pass |
| 2026-09-25 | Clamp: request 5,000 with 500 remaining | dev | `consumed = 500` | Pass |
| 2026-09-25 | **Orphan later linked to a booking + catch-up** — first version of the function | dev | recognised 0 for the orphan; package total 4,166.67 not 5,000 — the linked-only cumulative rule lost the share | **Failed — fixed** (range-based amounts) |
| 2026-09-25 | Same scenario after the fix | dev | catch-up recognises the orphan's 833.33; second catch-up 0; package total **5,000.00** | Pass |
| 2026-09-25 | `price_pending` package: consume | dev | `recognised = 0`, usage still recorded, pulses deducted | Pass |
| 2026-09-25 | Confirm the price, then catch-up | dev | catch-up recognises 1,666.67 (1 row); second run 0 | Pass |
| 2026-09-25 | Concurrency: three overlapping consumes on one 3,000-pulse package | dev, 3 CLI processes staggered 3 s | used 3,000, 3 usage rows, 3 recognitions, total **5,000.00**; each got a distinct amount (1,666.67 / 1,666.66 / 1,666.67). The row lock serialises them | Pass |
| 2026-09-25 | Function ACL (`has_function_privilege`) | dev | `consume_package_pulses`, `recognise_pulse_usage`, `recognise_package_pulses_catchup`: `anon` = false, `authenticated` = false, `service_role` = true, SECURITY DEFINER = false | Pass |
| 2026-09-25 | Recognitions usable by the P&L join | dev | every row has `reservation_id` and `recognised_at`; reports sum by `recognised_at` | Pass |
| 2026-09-25 | Dev test data removed | dev | disposable customer, 4 packages, 12 reservations deleted; 0 leftover recognitions/usage | Pass |
| 2026-09-25 | **Repeatable DB test** `scripts/db_tests/pulse_revenue_recognition.test.sql` (12 groups: sum = price at depletion, replay, awkward rounding, orphan + link + catch-up, pending price, zero price, out-of-order linking, three refusals, CHECK + unique constraints, usage and reservation cascades, **services-package regression through `consume_customer_package_session`**, function ACL) | dev, one transaction always rolled back | `PASS: 36 assertions (rolled back)`, run twice, nothing left behind. Writing it caught a wrong expectation of mine (1,000 over 3 pulses gives 333.33 / 333.34 / 333.33, still 1,000.00); the code was right | Pass |
| 2026-09-25 | Backfill dry run on dev | dev | 10 legacy usage rows, all `SKIP (no booking - stays deferred until linked)` | Pass |
| — | Backfill dry run on production | production | Cannot run until the migration is applied (the dry run reads `price_pending`) | Not run |
| — | Apply migration + backfill on production | production | — | **Not run** |
| — | Finance P&L "package revenue" line moves after a real laser session; Cash Flow does not | dev/production, browser (signed-in) | — | **Not run** — needs a signed-in session |

## Checks

- [x] A consume recognises a pro-rata share in the same transaction.
- [x] Replaying a consume recognises nothing twice.
- [x] The sum of recognitions equals `price_paid` exactly at depletion.
- [x] A consume with no booking recognises nothing and does not fail.
- [x] A pending price recognises nothing; confirming it and running the catch-up recognises the consumed pulses.
- [x] Linking an orphan usage to a booking and running the catch-up recognises its share.
- [x] Concurrent consumes on one package serialise and total correctly.
- [x] The three functions are `service_role` only.
- [x] Services (non-pulses) packages still recognise revenue through the old function after the table change (regression).
- [x] The automated DB test passes on dev, twice: `npx supabase db query --linked -f scripts/db_tests/pulse_revenue_recognition.test.sql` → expect the error text `PASS: 36 assertions (rolled back)`.
- [ ] Apply the migration to production; run the dry run and confirm it lists only the expected usage row(s).
- [ ] Run the backfill on production; confirm `package_revenue_recognitions` gained only those rows.
- [ ] Do one real laser consume from the doctor screen against a booking: Finance → P&L revenue rises by the pro-rata amount; Cash Flow is unchanged.
- [ ] A doctor consume from the patient profile with no booking: succeeds, no recognition (expected).
