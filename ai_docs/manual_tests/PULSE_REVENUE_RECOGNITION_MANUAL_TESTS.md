# Pulse Revenue Recognition Manual Test Checklist (DEC-088 / RISK-104)

> **Living document.** Update the evidence log with dated results as each check is run.
> **Migration:** `supabase/migrations/20260925000000_pulse_revenue_recognition.sql` (idempotent, additive; the whole file
> can be re-run). **Applied to dev and to production 2026-09-25.** The backfill has NOT been run on production (see the evidence log).
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
| 2026-09-25 | **Apply migration on production** | production (`whmukkypceuizscpjcdo`) | `migration list`: 64 = 64, none mismatched, last `20260925000000`; only that migration was pending. Objects: `price_pending` col, `package_pulse_usage_id` col, `customer_package_item_id` nullable, CHECK + unique index present, 3 functions, exposed to anon/authenticated = 0; recognitions 0, pending packages 0 | Pass |
| 2026-09-25 | Rollback-only DB test on production | production | `PASS: 36 assertions (rolled back)`; afterwards 0 test customers, 0 recognitions, usage rows 1, packages 6 (unchanged) | Pass |
| 2026-09-25 | Backfill dry run on production (read-only) | production | exactly 1 row: `WOULD RECOGNISE 2,000.00` for the 2,500-pulse package fully used on booking `98277042…` (the `zaki` booking, dated 2026-09-26, which also has no invoice — RISK-101). Nothing else | Reviewed — **not applied** |
| 2026-09-25 | Run the backfill on production | production | **Decided NOT to run:** the owner confirmed the `zaki` booking is test data, and it is the only row the backfill would touch. The migration and functions are live, so real laser consumption from now on is recognised automatically | Not needed |
| 2026-09-25 | What the `zaki` test data touches on production (read-only) | production | reservation `98277042…` (paid 2,000), customer package `de947a26…` (2,500 pulses fully used, price 2,000), 1 pulse usage row (2,500), customer `zaki` (spent 4,000, 1 booking); no invoice, no transaction linked to the reservation. Not deleted — deleting production data needs an explicit instruction | Finding |
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
- [x] Apply the migration to production; run the dry run and confirm it lists only the expected usage row(s).
- [ ] Run the backfill on production; confirm `package_revenue_recognitions` gained only those rows.
- [ ] Do one real laser consume from the doctor screen against a booking: Finance → P&L revenue rises by the pro-rata amount; Cash Flow is unchanged.
- [ ] A doctor consume from the patient profile with no booking: succeeds, no recognition (expected).

## Finding on production data (2026-09-25)

5 of the 6 `customer_packages` on production are typed `package_type = 'services'` with `total_pulses = 0`, although their catalog packages are pulses packages ("2,500 Pulses" x2, "10,000 Pulses" x3), and their `price_paid` is the catalog price (2,000 / 8,000). They came from `POST /api/reservations/previous`, which does not set `package_type`/`total_pulses` and stores the catalog price. Consequences: their remaining pulses cannot be tracked or consumed, and no revenue can be recognised for them. **Fixed in code 2026-09-25** (dev): `POST /api/reservations/previous` now reads the catalog `package_type`/`total_pulses` and sets the price to the entered invoice value only for a package-only booking, otherwise `price_pending = true` with `price_paid = 0` (never the catalog price); it returns `package: { created, pricePending, packageType, totalPulses, error? }`. Tests: `tests/routes/reservations-previous-package.test.ts` (9, 7 fail without the change). **Existing production rows are repaired by `scripts/repair_historical_pulses_packages.sql`** (dry run first: `..._dry_run.sql`) — dry run on production 2026-09-25 lists exactly the 5 packages (Randa 2 x 2,500 Pulses, Khaled 2 x 10,000, Zeinab 1 x 10,000); script tested on dev with fixtures (repairs only the mis-typed one, idempotent, leaves real pulses and services packages alone). **Not yet applied to production; route change not yet on main.** Still to build: the badge and the "Enter invoice value" action.

## Production repair applied (2026-09-25)

`scripts/repair_historical_pulses_packages.sql` was run on production after a fresh dry run (5 x WOULD REPAIR) and the
route fix was merged to `main` (`bd740e6`; full suite green on main's own tree, 918 passed).

| Package | Catalog | Before (type / quota / remaining / price_paid / pending) | After |
|---|---|---|---|
| b579b41e… | 2,500 Pulses | services / 0 / 0 / 2,000 / false | pulses / 2,500 / 2,500 / 0 / **pending** |
| a6fd7137… | 2,500 Pulses | services / 0 / 0 / 2,000 / false | pulses / 2,500 / 2,500 / 0 / **pending** |
| 3146b0ca… | 10,000 Pulses | services / 0 / 0 / 8,000 / false | pulses / 10,000 / 10,000 / 0 / **pending** |
| f36b5f4d… | 10,000 Pulses | services / 0 / 0 / 8,000 / false | pulses / 10,000 / 10,000 / 0 / **pending** |
| 4cda7c8d… | 10,000 Pulses | services / 0 / 0 / 8,000 / false | pulses / 10,000 / 10,000 / 0 / **pending** |

The sixth package (`de947a26…`, 2,500 pulses, fully used, price 2,000) was correctly left alone. A second run changed nothing.
The remaining balance is the full catalog quota — pulses used before the clinic went live are unknown and must be adjusted by staff.
Their price stays pending (no revenue is recognised for them) until staff enter the real invoice value.

**Rollback (restores the exact pre-repair values):**
```sql
update public.customer_packages set package_type = 'services', total_pulses = 0, pulses_used = 0, pulses_remaining = 0,
       price_pending = false,
       price_paid = case id when 'b579b41e-c52a-4fb1-8495-42196043dcaf' then 2000 when 'a6fd7137-6a9a-4fd3-a116-694f851d20d1' then 2000 else 8000 end
 where id in ('b579b41e-c52a-4fb1-8495-42196043dcaf','a6fd7137-6a9a-4fd3-a116-694f851d20d1','3146b0ca-0400-4792-beb7-b0652ac90ddf',
              'f36b5f4d-02c5-41d1-aa31-3108e37d6aa4','4cda7c8d-8c9f-4220-be52-a15a4656d819');
```

- [x] Repair script applied on production; second run a no-op; the fully-used package untouched.
- [ ] Customer profile (Randa, Khaled, Zeinab): their packages now show pulse balances (2,500 / 10,000) instead of a services package with no sessions.
- [ ] Staff review each package's remaining pulses and enter the real invoice value (needs the "Enter invoice value" action — not built yet).
