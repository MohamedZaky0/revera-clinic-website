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
| | | | | |

## Per-check list

### Migration 1 — table and function

- [ ] Apply `20260922000000_package_pulse_balance_to_columns.sql`; confirm `package_pulse_usage` exists, RLS enabled, and the partial unique index on `(customer_package_id, reservation_id) WHERE reservation_id IS NOT NULL` exists. Re-run it; confirm idempotent.
- [ ] Call `/rest/v1/rpc/consume_package_pulses` with the **anon** key; confirm it is denied (permission denied / 401-style error, not executed).
- [ ] SQL review: `FOR UPDATE` present on the customer_packages select; no `SECURITY DEFINER`; `REVOKE`/`GRANT` present; `least()` clamp; `greatest(0, …)`; status only ever `'fully_used'`; function is `CREATE OR REPLACE` (re-creatable).

### Backfill — migration 2

- [ ] Apply `20260922000100_backfill_package_pulse_balances_from_blob.sql`; read every `NOTICE` line and record the listed `customer_packages.id`s here.
- [ ] For a package that had blob entry `{included_pulses: N, used_pulses: U, remaining_pulses: R}`: confirm columns now read `total_pulses=N, pulses_used=U, pulses_remaining=R`.
- [ ] For a package whose blob remaining was 0 but whose row was still `status='active'` (the old `'completed'` CHECK violation): confirm it is now `fully_used`.
- [ ] Confirm the blob's `usage_history[]` entries appear in `package_pulse_usage` with `booking_id` mapped to `reservation_id` (non-UUID booking ids become NULL reservation_id).
- [ ] Re-run migration 2; confirm no balances change and no duplicate usage rows.
- [ ] Confirm `page_settings` row `key='customer_package_pulses'` still exists untouched (rollback).

### Consume behavior — contract preserved

- [ ] Sell a pulses package (Total Pulses 10,000) to a test patient → patient profile shows 10,000/10,000.
- [ ] Doctor → active session → Option 3 → deliver 4,000 → profile shows 6,000 and `package_pulse_usage` has one row with `remaining_after=6000`.
- [ ] Reception checkout the same booking (which re-consumes on the same `booking_id`) → balance is **still** 6,000 and exactly one usage row exists for that reservation.
- [ ] Deliver 6,000 more on a new booking → package reads 0, status `fully_used`, and it no longer offers itself for redemption in New Booking or the doctor's package dropdown — but still appears under the profile's History tab.
- [ ] Request more than remaining → `consumed` < `requested`, balance clamps to 0.
- [ ] `quantity_used` 0 or negative → 400. Expired package → 400. Unknown package UUID → 400. Synthetic (non-UUID) package id → 400, no Postgres 22P02 in the response or server log. Same for a non-UUID `booking_id`.
- [ ] Create a pulses package with Total Pulses left at 0 → selling it refuses with "This package has no pulse quota configured — set Total Pulses in Admin → Packages" and writes no invoice/package rows.

### Concurrency — the whole point of the brief

- [ ] **(a) Cross-patient:** fire two `consume_package_pulses` PATCHes for **different** patients at the same moment (two browser tabs or two backgrounded `curl`s) → confirm **both** balances moved and both usage rows exist.
- [ ] **(b) Same booking:** fire two PATCHes for the **same** `customer_package_id` + `reservation_id` simultaneously → confirm exactly **one** usage row exists and the balance moved once.

### Regression checks

- [ ] `grep -rn "customer_package_pulses" src/` returns nothing (only migrations and `ai_docs/*` may mention it).
- [ ] GET `/api/customers/packages?customerId=…` returns identical field names as before (`packageType`, `totalPulses`, `includedPulses`, `usedPulses`, `pulsesRemaining`, `remainingPulses`, `pulseUsageHistory`, `items`).
- [ ] A pulses package row that never had a blob entry and has a real `total_pulses` shows that quota in the profile (previously it reported 0/0 because the primary select couldn't see the columns).
