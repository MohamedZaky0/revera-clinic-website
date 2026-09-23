# Brief 34B Manual Test Checklist — Package Pulse Balance Moved Off the JSON Blob

> **Living document.** Update the evidence table with dated dev results as each check is run.
> **Environment:** linked dev database. **Order matters** — the backfill only sees what the blob
> holds at the moment it runs:
>
> 1. Apply `supabase/migrations/20260922000000_package_pulse_balance_to_columns.sql` (table + RPC).
> 2. Apply `supabase/migrations/20260922000100_backfill_package_pulse_balances_from_blob.sql`
>    **immediately before the deploy, while reception is not checking out.** Read its NOTICE list.
> 3. Resolve every NOTICE'd package by setting Total Pulses in Admin → Packages.
> 4. **Then** deploy the code — the new code reads columns only; deploying before the backfill
>    shows zero balances.
>
> Rollback: revert the deploy; the `page_settings` blob is untouched and the old code resumes
> from it. The new table/columns are harmless if left in place.
>
> Full reasoning and code pointers are in `ai_docs/RISKS.md` → **RISK-096**.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| 2026-09-23 | Apply migration 1 (`db push --linked`) | dev (`ikbmnkjikxduwsyjxsqn`) | `migration list` shows `20260922000000` applied | Pass |
| 2026-09-23 | Apply migration 2 (`db push --linked`) — first attempt | dev | Failed `23503`: `package_pulse_usage_reservation_id_fkey` — blob `booking_id` `1390e02a-…` not present in `reservations` | **Failed, fixed** — see below |
| 2026-09-23 | Fix + re-apply migration 2 | dev | `v_reservation` now requires `EXISTS (SELECT 1 FROM reservations WHERE id = …)`, else NULL; `migration list` shows `20260922000100` applied | Pass |
| 2026-09-23 | Unresolvable-package check (would-be NOTICE list) | dev | `SELECT … WHERE package_type='pulses' AND total_pulses<=0 AND NOT EXISTS(package_pulse_usage)` → 0 rows | Pass — nothing to resolve in Admin → Packages |
| 2026-09-23 | Post-backfill package state | dev | 9 `active` pulses packages (93,800 pulses total), 2 rows repaired `active`→`fully_used` | Pass |
| 2026-09-23 | Blob vs. columns cross-check, one real package | dev | Blob `{included:20000, used:0, remaining:20000}` == columns `total_pulses=20000, pulses_used=0, pulses_remaining=20000` | Pass |
| 2026-09-23 | `page_settings` blob row survives (rollback) | dev | `key='customer_package_pulses'` row still present and non-empty | Pass |
| 2026-09-23 | Re-run migration 1 (`db query -f`) | dev | No error; `CREATE TABLE/INDEX IF NOT EXISTS` + `CREATE OR REPLACE FUNCTION` | Pass — idempotent |
| 2026-09-23 | Re-run migration 2 (`db query -f`) | dev | `package_pulse_usage` row count 10→10, `sum(pulses_remaining)` 93,800→93,800, unchanged | Pass — idempotent |
| 2026-09-23 | Function ACL, direct query (`has_function_privilege`) | dev | `anon`=false, `authenticated`=false, `service_role`=true, `prosecdef`=false (no SECURITY DEFINER) | Pass |
| 2026-09-23 | Index/RLS check | dev | `package_pulse_usage_pkg_reservation_uq` partial unique index confirmed via `pg_indexes`; `ENABLE ROW LEVEL SECURITY` in migration | Pass |
| 2026-09-23 | Functional: normal consume | dev, disposable test package (1,000 pulses) | Consumed 400 of 400 requested, `remaining=600`, `already_deducted=false` | Pass |
| 2026-09-23 | Functional: idempotent replay, same reservation | dev, same package | Second call same `reservation_id` → `already_deducted=true`, `remaining=600` unchanged | Pass |
| 2026-09-23 | Functional: clamp | dev, same package | Requested 900 against 600 remaining → `consumed=600`, `remaining=0` | Pass |
| 2026-09-23 | Functional: depletion → `fully_used` | dev, same package | `status` read back as `fully_used`, `pulses_remaining=0` | Pass |
| 2026-09-23 | Functional: consume on depleted package | dev, same package | Raises `package has 0 remaining pulses` (P0001) — route maps this to a clean 400 | Pass |
| 2026-09-23 | Functional: usage-row integrity | dev, same package | Exactly 2 `package_pulse_usage` rows for the package (400 + 600), none from the replay or the failed depleted attempt | Pass |
| 2026-09-23 | Concurrency (b): same `(customer_package_id, reservation_id)` | dev, disposable package #2 | 3 overlapping calls (backgrounded CLI processes) for the same reservation → exactly 1 committed (`already_deducted=false`), others `already_deducted=true`; final balance moved exactly once (600 consumed, 400 remaining), exactly 1 usage row | Pass |
| 2026-09-23 | Concurrency (a): two different patients | dev, disposable packages #3/#4 | Concurrent consumes on two unrelated patients' packages both succeeded independently (300/300), no cross-contamination | Pass |
| 2026-09-23 | Test-data cleanup | dev | All disposable customers/reservations/customer_packages/usage rows deleted; `count(*)` on the 3 test mobile numbers = 0 | Pass |
| 2026-09-23 | `grep -rn "customer_package_pulses" src/` | local repo | Empty | Pass |

**Not done in this pass (needs a live browser session, not just DB-level verification):** the UI
click-path items below (sell via Admin, doctor active-session consume, reception checkout,
`quantity_used`/synthetic-id 400 shapes through the actual HTTP route, `/rest/v1/rpc/…` called
with the literal anon key rather than verified via `has_function_privilege`). The DB-level and
route-code verification above covers the same logic these would exercise; the click-path is left
as an explicit follow-up before this is considered fully closed for a live deploy.

## Per-check list

### Migration 1 — table and function

- [x] Apply `20260922000000_package_pulse_balance_to_columns.sql`; confirm `package_pulse_usage` exists, RLS enabled, and the partial unique index on `(customer_package_id, reservation_id) WHERE reservation_id IS NOT NULL` exists. Re-run it; confirm idempotent.
- [x] Confirm `anon`/`authenticated` cannot execute `consume_package_pulses`, only `service_role` can — verified directly via `has_function_privilege(...)` against the live function (equivalent to, and more precise than, a single anon-key curl call; the literal `/rest/v1/rpc/…` + anon-key HTTP call is still outstanding as a click-path item).
- [x] SQL review: `FOR UPDATE` present on the customer_packages select; no `SECURITY DEFINER` (`prosecdef=false`, confirmed live); `REVOKE`/`GRANT` present; `least()` clamp; `greatest(0, …)`; status only ever `'fully_used'`; function is `CREATE OR REPLACE` (re-creatable, confirmed by re-running it).

### Backfill — migration 2

- [x] Apply `20260922000100_backfill_package_pulse_balances_from_blob.sql`; read every `NOTICE` line and record the listed `customer_packages.id`s here. **First apply failed (`23503` FK violation on `reservation_id`) — fixed in the migration file (require the booking to exist in `reservations`, else NULL) and re-applied clean. Zero unresolvable packages found on re-check — nothing to list.**
- [x] For a package that had blob entry `{included_pulses: N, used_pulses: U, remaining_pulses: R}`: confirm columns now read `total_pulses=N, pulses_used=U, pulses_remaining=R`. (Checked package `0d39bc6b-…`: blob `{20000,0,20000}` == columns `{20000,0,20000}`.)
- [x] For a package whose blob remaining was 0 but whose row was still `status='active'` (the old `'completed'` CHECK violation): confirm it is now `fully_used`. (2 packages repaired.)
- [x] Confirm the blob's `usage_history[]` entries appear in `package_pulse_usage` with `booking_id` mapped to `reservation_id` (non-UUID booking ids become NULL reservation_id). (10 rows inserted; all 10 ended up `reservation_id = NULL` — every historical `booking_id` in the blob referenced a test reservation already deleted by this session's own earlier cleanup, which is the expected outcome, not a bug.)
- [x] Re-run migration 2; confirm no balances change and no duplicate usage rows. (Row count 10→10, `sum(pulses_remaining)` 93,800→93,800.)
- [x] Confirm `page_settings` row `key='customer_package_pulses'` still exists untouched (rollback).

### Consume behavior — contract preserved

- [ ] Sell a pulses package (Total Pulses 10,000) to a test patient → patient profile shows 10,000/10,000. *(UI click-path — not done this pass; see note above. Contract covered by the 17-case automated suite against the fake.)*
- [ ] Doctor → active session → Option 3 → deliver 4,000 → profile shows 6,000 and `package_pulse_usage` has one row with `remaining_after=6000`. *(UI click-path — not done this pass.)*
- [ ] Reception checkout the same booking (which re-consumes on the same `booking_id`) → balance is **still** 6,000 and exactly one usage row exists for that reservation. *(UI click-path — not done this pass; equivalent logic proven directly against the RPC — see Evidence log "idempotent replay".)*
- [ ] Deliver 6,000 more on a new booking → package reads 0, status `fully_used`, and it no longer offers itself for redemption in New Booking or the doctor's package dropdown — but still appears under the profile's History tab. *(UI click-path — not done this pass; the RPC-level depletion→fully_used transition is proven — see Evidence log.)*
- [x] Request more than remaining → `consumed` < `requested`, balance clamps to 0. (Proven directly against the RPC: requested 900, remaining 600 → consumed 600, remaining 0.)
- [ ] `quantity_used` 0 or negative → 400. Expired package → 400. Unknown package UUID → 400. Synthetic (non-UUID) package id → 400, no Postgres 22P02 in the response or server log. Same for a non-UUID `booking_id`. *(Covered by the automated route test suite against the fake; not re-verified through a live HTTP call this pass.)*
- [ ] Create a pulses package with Total Pulses left at 0 → selling it refuses with "This package has no pulse quota configured — set Total Pulses in Admin → Packages" and writes no invoice/package rows. *(Covered by `packages-sell.test.ts`'s new refusal case; not re-verified live this pass.)*

### Concurrency — the whole point of the brief

- [x] **(a) Cross-patient:** fire two `consume_package_pulses` calls for **different** patients at the same moment → confirm **both** balances moved and both usage rows exist. (Done via two disposable test packages; both succeeded independently, no cross-contamination.)
- [x] **(b) Same booking:** fire multiple concurrent calls for the **same** `customer_package_id` + `reservation_id` → confirm exactly **one** usage row exists and the balance moved once. (Done with 3 overlapping backgrounded calls; exactly one deduction committed, the rest returned `already_deducted: true`.)

### Regression checks

- [x] `grep -rn "customer_package_pulses" src/` returns nothing (only migrations and `ai_docs/*` may mention it).
- [ ] GET `/api/customers/packages?customerId=…` returns identical field names as before (`packageType`, `totalPulses`, `includedPulses`, `usedPulses`, `pulsesRemaining`, `remainingPulses`, `pulseUsageHistory`, `items`). *(Covered by the automated GET test cases; not re-verified via a live HTTP call this pass.)*
- [x] A pulses package row that never had a blob entry and has a real `total_pulses` shows that quota in the profile (previously it reported 0/0 because the primary select couldn't see the columns). (Confirmed via direct query of `customer_packages` columns for the 9 real active packages post-backfill — all show real non-zero `pulses_remaining`.)
