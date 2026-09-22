# Windsurf Briefs — Revera clinic platform

**One file for all Windsurf work briefs.** New briefs get appended as a new section here; do not
create separate brief files. Completed briefs stay as a short archived record at the bottom.

Standing rules live in `.windsurf/rules/*.md` (loaded automatically) and `.windsurf/MEMORIES.md`.
**Those apply to every brief in this file and are not repeated here.** Read them first.

---

# ACTIVE BRIEF

## Brief 34 — Laser package deficit: safety net before the feature

**Read first:** `ai_docs/DECISIONS.md` DEC-062, DEC-064, DEC-066, DEC-067, DEC-069, DEC-072;
`ai_docs/RISKS.md` RISK-089 … RISK-093; `ai_docs/DB_SCHEMA.md` → `reservations`, `customer_packages`,
`laser_pulse_logs`.

**Why this exists.** The tracker says "Partial Package Balance Coverage & Excess Pulse Billing — not
started." It is not. A deficit engine shipped 2026-09-20/21 (DEC-064, DEC-072) and already clamps the
balance to 0 and offers the doctor a 3A/3B choice. What it does *not* have is a single automated
test, a migration for the columns it writes, or a failure path a human can see. **This brief adds no
user-facing behaviour.** It makes the existing engine safe to build Brief 35 on top of.

### Investigation findings — verify each before you change it

1. **The clamp is real and correct.** `src/app/api/customers/packages/route.ts:462` —
   `actualDeduct = Math.min(qtyToDeduct, Math.max(0, pkgPulses.remaining_pulses))`; the response
   returns both `consumed` and `requested` (`:518-524`). Requirement step 1 ("consume to 0") is met
   server-side. **No caller reads `consumed` vs `requested`** — grep the four call sites
   (`DoctorAccountView.tsx:1303,1373,1421`, `BookingDetailsModal.tsx:1295`, `admin/page.tsx:9584`)
   and confirm.
2. **The pulse balance's primary store is a JSON blob, not a column.**
   `route.ts:19-48` — `getPackagePulsesStore()` / `savePackagePulsesStore()` read and upsert the
   whole `page_settings` row `key = 'customer_package_pulses'`. The real columns
   (`customer_packages.pulses_used` / `pulses_remaining`, migration
   `20260920030000_add_package_type_and_total_pulses_to_packages.sql`) are written afterwards
   best-effort inside a `try/catch` that only `console.warn`s (`:489-516`). Two concurrent PATCHes
   read-modify-write the same blob and the later one wins. **Do not extend this pattern**
   (CLAUDE.md rule 7 / RISK-004). Do not migrate it off the blob in this brief either — record it as
   a new RISK entry with the evidence above and leave it.
3. **Idempotency already exists and is keyed on `booking_id`** (`:448-459`): a second consume for the
   same booking returns `{ alreadyDeducted: true }` without deducting — regardless of quantity.
   Brief 35 depends on this; confirm it still behaves that way after your changes.
4. **Two fabricated defaults on the pulse path.** `route.ts:423-428` invents `10000` total pulses when
   the package row has none; `DoctorOngoingSessionTab.tsx:631-641` parses the package *name* for a
   pulse count and falls back to `10000`. Both are rule-1 violations. **Report them; fix only the
   route one** (see item 5) — the name-parsing one needs a product decision.
5. **Schema drift is worse than three columns.** `laser_payment_mode`, `laser_price_per_pulse`,
   `delivered_pulses` are written at `src/app/api/reservations/route.ts:1664-1667` and read in ~30
   places, and exist in **no** migration and **not** in `DB_SCHEMA.md`. Separately,
   `DoctorAccountView.tsx:1610-1611` sends `total_price` **and** `price` — neither column exists on
   `reservations` (`.windsurf/rules/10-database.md` names `reservations.price` explicitly as a column
   that never existed). So the 42703 strip-and-retry at `route.ts:1800-1850` fires on **every doctor
   session completion**, and its strip list also drops `doctor_notes`, `reception_notes`,
   `actual_duration_minutes` and `follow_up_*` — columns that **do** exist. Brief 33's doctor note is
   being silently discarded today. Verify this claim yourself before acting on it.
6. **`|| 1` EGP/pulse, four sites:** `reservations/route.ts:386-392` and `:1689-1696`,
   `DoctorAccountView.tsx:1455`, `:1556`, `:1584`, `BookingDetailsModal.tsx:1348-1355`. Money path.

### Scope — each item labelled

**(1) Migration + schema doc — DELIBERATE FIX.**
New `supabase/migrations/YYYYMMDDHHMMSS_add_laser_settlement_columns_to_reservations.sql`, idempotent
(`ADD COLUMN IF NOT EXISTS`), all three nullable, **no DEFAULT** (a default fabricates a mode/rate for
every historical booking):
`laser_payment_mode text` + a `DO $ … pg_constraint` guarded CHECK in `('SERVICE','PER_PULSE','PACKAGE')`
(same shape as `20260920030000`'s `packages_package_type_check`); `laser_price_per_pulse numeric`;
`delivered_pulses integer`. Update `DB_SCHEMA.md`'s `reservations` table in the same commit.
**Do not** add `price` or `total_price` — instead stop sending them: `DoctorAccountView.tsx:1610-1611`
keeps `total_price`-shaped intent only if a real column exists; it does not, so remove both keys and
say so in your report. Do not apply the migration; state in the report that it is unapplied.
**42703 retry:** keep it (unmigrated forks exist) but make it loud — log the stripped key list and
return the dropped columns in the response body so the caller can surface "saved, but N fields were
not persisted." Never report the requested state as stored (`.windsurf/rules/20-api-auth.md`).

**(2) Route tests for `consume_package_pulses` — BEHAVIOR-PRESERVING.**
New `tests/routes/packages-consume-pulses.test.ts`, using `tests/helpers/supabaseFake.ts` and the
mock/fixture style of `tests/routes/reservations-patch.test.ts`. Note `tests/routes/packages-consume.test.ts`
covers the *old* per-session `/api/packages/consume` route — different endpoint, do not touch it.
Cases: quantity > remaining clamps to remaining and returns `consumed < requested`; exactly-equal;
already-0 → 400; `quantity_used <= 0` → 400; expired package → 400 (`:416-421`); non-UUID / synthetic
package id skips the DB lookup without throwing 22P02 (`:401`); unknown UUID; repeat call with the same
`booking_id` returns `alreadyDeducted` and does not deduct twice; unauthenticated → 401 (the route
guard, RISK-090).

**(3) Extract the deficit arithmetic — BEHAVIOR-PRESERVING, mechanical.**
New `src/lib/laserDeficit.ts`: pure functions for what `DoctorOngoingSessionTab.tsx:610-675` computes
inline — `resolveDeliveredPulses`, `computePackageDeficit({ deliveredPulses, remainingPulses, hasActivePackage })`,
and `computeDeficitInvoiceImpact({ deficitPulses, choice, pricePerPulse, newPackagePrice })` returning
the 3A/3B charge. Call them from the component; no other change to the JSX or handlers.
`tests/lib/laserDeficit.test.ts` must cover the 5,000 / 10,000 / 5,000 example from the tracker,
equal balance → 0 deficit, 0 remaining, 1-pulse deficit, no-active-package (`isNoActivePackage`
suppresses deficit today — preserve that), and integer/negative inputs.
**Flag, do not fix:** `totalLaserDeliveredPulses` (`:627`) counts only laser additional services while
`totalSessionPulses` (`:675`) counts all of them, so the number sent to the package and the number sent
to the device counter can disagree. Report it.

**(4) Silent partial failure in 3A — DELIBERATE FIX.**
`DoctorAccountView.tsx:1392-1453`: the old package is consumed first (`:1367-1388`), then
`POST /api/packages/sell`; when `sellRes.ok` is false, `newCustPkgId` stays `null`, the deficit is
**never deducted**, and execution still falls through to `:1436-1450` which posts a
`New Package: …` invoice line at full price. The `catch` at `:1451` only `console.error`s, and
`handleCompleteTreatment` is invoked un-awaited from `DoctorOngoingSessionTab.tsx:834`, so the doctor
sees the success alert either way. Net result today: **patient billed for a package that was never
sold, deficit unresolved.** Required order and behaviour:
sell → read `customerPackage.id` → deduct deficit from the new package → post the invoice line →
only then consume the old package to 0 and complete the session. If the sell step fails, abort before
any invoice line is written, show the real server error (no success alert), leave the session
**not completed** so it can be retried, and state in the UI that nothing was charged. If a later step
fails after the old package was consumed, say exactly which pulses were deducted and that the deficit
is unresolved. Write down, in the PR, the system state after a failure at each step.

**(5) Remove the `|| 1` rate — DELIBERATE FIX.**
Resolution chain, in order: reservation snapshot (`laser_price_per_pulse`) → clinic default
(`page_settings` key `home` → `booking.defaultPricePerPulse`, seeded 5, edited in Booking Settings —
see `admin/page.tsx:3911`, `DoctorOngoingSessionTab.tsx:265-266`) → **unresolved**. Never 1, never a
regex-scraped rate as the primary source (keep the `notes` regex only as a legacy read for bookings
that predate the columns, and say so in a comment). Unresolved means: the API returns a real error
and writes no line; the UI blocks the action with "per-pulse rate not configured — set it in Booking
Settings", not a silent 1 EGP. Apply at all six sites listed in finding 6.

### Deliberately not in scope
Moving the pulse balance off the `page_settings` blob. The checkout/receptionist prompt (Brief 35).
FIFO across multiple active packages. Where the master per-pulse price should live (device vs service
vs clinic default) — an open product decision; a future *Brief C* will cover it, so resolve the rate
**only** through the chain above and hardcode nothing that presumes an answer.
Do not touch `src/lib/billing.ts`, `ledger.ts`, `wallet.ts`, `customerBalances.ts`.

### Method
Land each numbered item as its own commit, in order (1) → (5). Items (1)–(3) are additive or behaviour-preserving and must be green (`npm run check`) before you start (4) and (5), which are deliberate behaviour fixes. Do not batch them. Keep the diff in `DoctorAccountView.tsx` / `BookingDetailsModal.tsx` / `reservations/route.ts` limited to the lines each item names.

### Verification
`npm run check` green. New tests: `tests/routes/packages-consume-pulses.test.ts`,
`tests/lib/laserDeficit.test.ts`. No existing test weakened, skipped or deleted — if one now fails,
that is a finding to report, not a test to edit. Browser click-path: Doctor → active session →
Option 3 (Pulses Package) on a patient whose package has **fewer** pulses remaining than you enter as
delivered → the amber deficit card appears → pick "Buy new package" with a package id that does not
exist (or block the request in devtools) → confirm the session is **not** completed, a real error is
shown, and no `New Package:` line appears on the booking's invoice.

### Report back
Status of each of the 5 numbered items separately. The migration is unapplied — say so. Which of the
findings above you confirmed and which you found stale. The stripped-column list the 42703 path now
logs. The list of call sites you checked for the rate chain. Plus the standing convention: Dev Notes
block, `ai_docs/manual_tests/LASER_DEFICIT_BRIEF_34_MANUAL_TESTS.md` (follow `RISK_029_MANUAL_TESTS.md`:
Evidence log table + `- [ ]` checks), and a new `RISKS.md` entry (next free id is **RISK-094**)
referencing that file.

---
---

# QUEUED BRIEFS

> **Do not start Brief 34B until Brief 34 has landed and been reviewed.**

## Brief 34B — Laser package pulses: move the balance off the JSON blob

**Read first:** Brief 34 in this file (land it first — this brief assumes `src/lib/laserDeficit.ts`
exists). Then `.windsurf/rules/00-core.md` (rule 1), `10-database.md`, `20-api-auth.md`;
`ai_docs/DB_SCHEMA.md` → `customer_packages`, `packages`, `laser_pulse_logs`, `page_settings`;
`ai_docs/DECISIONS.md` DEC-062, DEC-064, DEC-072; `ai_docs/RISKS.md` RISK-004, RISK-086, RISK-090…093.
Then `src/app/api/customers/packages/route.ts` and `src/app/api/packages/sell/route.ts` end to end.

**Why this exists.** Every patient's pulse balance in the whole clinic lives in **one** `page_settings`
row. Every consume reads that row, mutates one key, and writes the whole row back. Two receptionists
checking out two *different* patients at the same moment can silently erase one deduction — the clinic
gives away laser pulses it was paid for and nothing anywhere records it. Brief 34 deliberately left
this alone. Mohamed has now decided to fix it **before** Brief 35, because Brief 35 wants to build its
checkout operation on this store's idempotency guard. **No user-facing behaviour changes.** The API
response contract, the GET field names and the UI stay identical; only where the number lives changes.

### Investigation findings — verify each before you change it

1. **The blob is the primary store.** `src/app/api/customers/packages/route.ts:19-48` —
   `getPackagePulsesStore()` / `savePackagePulsesStore()` read and upsert the whole `page_settings`
   row `key = 'customer_package_pulses'`, a map `{ [customerPackageId]: { included_pulses,
   used_pulses, remaining_pulses, usage_history[] } }`. The consume path (`:394-525`) reads the map
   (`:380`), mutates one entry (`:470-485`), upserts the whole map (`:486`). Read-modify-write across
   all patients. **This is the CLAUDE.md rule 7 / RISK-004 pattern. Do not extend it — remove it.**
2. **The save cannot fail loudly, and cannot even fail quietly correctly.** `:36-48` wraps the upsert
   in `try/catch` and `console.warn`s. But supabase-js **returns** `{ error }`, it does not throw — and
   the code never destructures `error` at all. So a rejected upsert is invisible: the endpoint returns
   `success: true` with a balance that was never stored. Same shape at `:20-33` for the read.
3. **The native columns are written blind, after the fact.** `customer_packages.total_pulses /
   pulses_used / pulses_remaining` exist (`supabase/migrations/20260920030000_…sql`) and are updated
   best-effort at `:489-516` — again inside a `try/catch` around a call that returns `{error}` instead
   of throwing. **The update at `:497` and `:508` sets `status: 'completed'`, but the real CHECK is
   `status IN ('active','expired','fully_used')`** (`supabase/migrations/20260726010500_create_customer_packages.sql:19-20`).
   So on depletion the **whole** UPDATE is rejected and the native row keeps stale pulses **and** stays
   `active` — exactly when the package is exhausted. Confirm this yourself.
4. **The doc is the root cause of (3).** `ai_docs/DB_SCHEMA.md` has **two** `customer_packages`
   sections. The first (~`:990`) is correct. The second (~`:1435`, added 2026-09-20) states
   `status … ('active','expired','completed')`, omits `pulses_used`, and invents `package_name`,
   `purchase_date`, `expiry_date`, `services jsonb` — none of which are in any migration. The
   `laser_pulse_logs` block (~`:1378`) likewise lists `additional_reason` and `session_date`; the
   migration has `additional_pulses_reason`, `created_at`, `updated_at`. **Deduplicating and correcting
   these two blocks is in scope** (rule: DB_SCHEMA.md is the single source of truth).
5. **GET is blob-first and its primary query cannot see the columns.** `:129-137`'s select list is
   `id, customer_id, package_id, status, purchased_at, expires_at, price_paid, packages(…),
   customer_package_items(…)` — no `package_type`, no `total_pulses`, no `pulses_*`. `:140-150` prefers
   `pulseStore[row.id]` and only then falls back to `(row as any).total_pulses`, which is always
   `undefined` on this path. (The *secondary* fallback at `:189-193` does `select('*')`, so it reads
   them — your fix must cover both branches.) Net: a real pulses package with no blob entry reports
   `totalPulses: 0, remainingPulses: 0` today.
6. **Idempotency lives inside the blob.** `:448-459` scans `usage_history[].booking_id`. Brief 35
   plans to depend on it. It must survive this brief with the same response shape.
7. **Fabricated totals — rule 1 violations, four sites not three.**
   `customers/packages/route.ts:423-428` → `|| 10000`. `packages/sell/route.ts:302` →
   `Number(pkg.total_pulses || 0) || Number(pkgMeta?.totalPulses || 0) || extractedPulsesFromName || 1000`
   — **two** fabrications on one line, the name regex being `:192-205`. `src/app/api/packages/route.ts:191-203`
   parses the package *name* (`/(\d+)\s*k\b/` × 1000). `DoctorOngoingSessionTab.tsx:631-641` parses the
   name of `selectedNewPackageToBuy` (the **catalog** package, from `GET /api/packages` — not the
   patient's `customer_packages` row) with a final `10000`. `AdminNewBookingView.tsx:1317` and `:2225`
   have their own `|| 10000`.
8. **`POST /api/packages/sell:343-366` writes the blob too** — and `tests/routes/packages-sell.test.ts:107`
   asserts on it, so that test changes with you.
9. **`/api/laser-pulses` is not a balance store** — verify and then leave it alone. It writes an audit
   log three ways: local disk `data/laser_pulses.json` (`route.ts:59-66`, read-only on Vercel, RISK-086
   precedent), `page_settings` key `laser_pulse_logs`, then `upsert` into the native table (`:122`).
   Its `id` is `` `lpl-${Date.now()}-…` `` (`:243`) while `laser_pulse_logs.id` is `uuid` — so that
   upsert fails 22P02 **every time** and is swallowed at `:125`. Assume the native table is empty.
   **Report this; do not fix it here.**

### Scope — each item labelled

**(1) Usage table + atomic consume function — DELIBERATE FIX.**
New `supabase/migrations/YYYYMMDDHHMMSS_package_pulse_balance_to_columns.sql`, idempotent
(`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `pg_constraint`-guarded constraints, per
`20260920030000`'s shape):
- `public.package_pulse_usage` — `id uuid pk default gen_random_uuid()`,
  `customer_package_id uuid NOT NULL REFERENCES customer_packages(id) ON DELETE CASCADE`,
  `reservation_id uuid REFERENCES reservations(id) ON DELETE SET NULL`, `quantity_used integer NOT NULL`,
  `remaining_after integer NOT NULL`, `used_by text`, `treatment_area text`, `notes text`,
  `created_at timestamptz NOT NULL DEFAULT now()`; index on `customer_package_id`; RLS enabled like its
  neighbours; **`CREATE UNIQUE INDEX … ON package_pulse_usage (customer_package_id, reservation_id)
  WHERE reservation_id IS NOT NULL`**. Do **not** reuse `laser_pulse_logs`: it is customer-scoped, has
  no `customer_package_id`, no uniqueness, and per finding 9 is effectively never written.
- `public.consume_package_pulses(p_customer_package_id uuid, p_qty integer, p_reservation_id uuid,
  p_used_by text, p_treatment_area text, p_notes text)` — `plpgsql`, `SECURITY INVOKER` (the default — the route calls it with the service-role client, which needs no elevated rights), `SET search_path = public`, followed by `REVOKE ALL ON FUNCTION … FROM PUBLIC, anon, authenticated;` and `GRANT EXECUTE ON FUNCTION … TO service_role;`. **Why:** PostgREST exposes every function in `public` at `/rest/v1/rpc/…` to anyone holding the anon key, and that key ships in the browser bundle — without the REVOKE anyone could drain any patient's pulses. `public.next_invoice_no()` (`20260726010600`) is the shape precedent (plpgsql function called via `supabaseServer.rpc`) but it has **no** grants at all, which is harmless for a sequence and unacceptable here — do not copy that part. One transaction:
  `SELECT … FROM customer_packages WHERE id = p_customer_package_id FOR UPDATE` (the row lock is what
  makes concurrent consumes serialise — a bare `UPDATE … WHERE pulses_remaining > 0 RETURNING` is
  atomic for the decrement but cannot carry the idempotency read and the usage insert in the same
  statement); if a `package_pulse_usage` row already exists for `(id, reservation_id)` return it with
  `already_deducted := true` and change nothing; else `v_consumed := least(p_qty, greatest(pulses_remaining, 0))`;
  `UPDATE customer_packages SET pulses_used = pulses_used + v_consumed, pulses_remaining = greatest(0, pulses_remaining - v_consumed),
  status = CASE WHEN pulses_remaining - v_consumed <= 0 THEN 'fully_used' ELSE status END`; insert the
  usage row; `RETURN` `(consumed, requested, remaining, already_deducted, used_total, total_pulses)`.
  **`'fully_used'`, never `'completed'`** — see finding 3. Raise (so the route can 400) on: package not
  found, `expires_at < now()`, `pulses_remaining <= 0`, `total_pulses <= 0` (unknown total → error, not a
  guess), `p_qty <= 0`. **Do not apply the migration** (`10-database.md`); say so in the report.

**(2) Consume route on the RPC — DELIBERATE FIX, contract-preserving.**
`customers/packages/route.ts`: delete `getPackagePulsesStore`/`savePackagePulsesStore` and every use.
`action: 'consume_package_pulses' | 'deduct_pulses'` becomes one `supabaseServer.rpc('consume_package_pulses', …)`
whose `{ data, error }` is **destructured and checked** — an error is a real HTTP error, never
`success: true`. The response body keeps **exactly** today's keys: `success, consumed, requested,
remainingPulses, alreadyDeducted, packagePulses` — and the 400s for `quantity_used <= 0` (`:396`),
0 remaining (`:463-468`) and expired (`:416-421`). `packagePulses` is now built from the columns +
the `package_pulse_usage` rows (`{ included_pulses, used_pulses, remaining_pulses, usage_history[] }`,
same field names) so the 5 callers keep working untouched: `DoctorAccountView.tsx:1299/1369/1417`,
`BookingDetailsModal.tsx:1291`, `admin/page.tsx:9580`. Non-UUID/synthetic ids must still 400 cleanly without a 22P02 (`:401`); the same applies to `booking_id` / `reservationId` when present but not a UUID — 400, never a 22P02 leaking from the RPC cast. `action: 'set_included_pulses'` writes `total_pulses`/`pulses_remaining` on
the row instead of the blob. Delete the `|| 10000` at `:427`.

**(3) GET reads the columns — DELIBERATE FIX.**
Add `package_type, total_pulses, pulses_used, pulses_remaining` to the select at `:131-135`, drop
`pulseStore` from both mapping branches, source `pulseUsageHistory` from `package_pulse_usage`
(one batched query by `customer_package_id in (…)`). **Every response field name stays**: `packageType,
totalPulses, includedPulses, usedPulses, pulsesRemaining, remainingPulses, pulseUsageHistory, items, …`.

**(4) Sell route — DELIBERATE FIX.**
`packages/sell/route.ts`: delete `:343-366` (the blob write). Keep the column writes at `:312-314`.
Replace `:302` with: `packages.total_pulses` only. If a pulses-type package has `total_pulses <= 0`,
**refuse** with a real 400 ("this package has no pulse quota configured — set Total Pulses in Admin →
Packages") and write nothing — no name regex, no `1000`. Update `tests/routes/packages-sell.test.ts:107`
to assert the `customer_packages` columns instead of the blob.

**(5) Unknown total never becomes a number in the UI — DELIBERATE FIX.**
`DoctorOngoingSessionTab.tsx:631-641`: `newPackageTotalPulses` comes from the catalog package's real
`total_pulses` only; when it is 0/absent, block the 3A "buy new package" choice with "this package has
no pulse quota configured — set it in Admin → Packages" and surface no number. Assuming Brief 34 has
landed, the arithmetic now lives in `src/lib/laserDeficit.ts`: its `computeDeficitInvoiceImpact({ …,
newPackagePrice })` gains no new input — what changes is the **source** feeding
`newPackageTotalPulses` at the call site, which must be `number | null` and propagate `null` as a block,
not a default. Also remove the `|| 10000` at `AdminNewBookingView.tsx:1317` and `:2225`, and the
name-parse at `src/app/api/packages/route.ts:191-203` (return the real `total_pulses`, `0` if unset —
the UI decides what to show).

**(6) Backfill + docs — DELIBERATE FIX.**
Second migration file, idempotent and safe when the blob row is absent, `NULL`, or malformed: for each `customer_packages` row that has a blob entry **and no `package_pulse_usage` rows yet** (i.e. not yet touched by the new code), set `total_pulses/pulses_used/pulses_remaining` from the blob **unconditionally — the blob wins** — set `status = 'fully_used'` when the blob's remaining is 0 (this also repairs rows the CHECK violation left `active`), and insert its `usage_history[]` into `package_pulse_usage` with `ON CONFLICT DO NOTHING`. **Why blob-wins, not "fill only zeros":** the blob is today's source of truth (GET is blob-first) and finding 3 means the native columns are stale *exactly for exhausted packages* — a fill-only-zeros rule would leave a depleted package showing its pre-depletion balance and hand out free pulses. **Why the "no usage rows yet" guard:** it makes the migration safe to re-run *before* the deploy and impossible to overwrite balances the new code has already moved. Anything unresolvable — no blob entry **and**
`total_pulses = 0` on a `package_type='pulses'` row — is **listed via `RAISE NOTICE`**, one line per
`customer_packages.id`, and left alone. **Never guess a total.** Do not delete the `page_settings` row
(it is the rollback). Update both `customer_packages` blocks in `DB_SCHEMA.md` into one correct block
(finding 4), fix the `laser_pulse_logs` block, and add `package_pulse_usage` — same commit.

**After this brief, `grep -rn "customer_package_pulses" src/` must return nothing.** Only the two
migrations and `ai_docs/*` may mention it. **Do not keep a transition-window dual write** — a second
writer re-introduces exactly the race we are removing; the owner's ordering below makes it unnecessary.

**(7) Depleted packages stop looking usable — DELIBERATE FIX.**
Now that depletion actually persists as `'fully_used'`, check every `status === 'active'` filter reads
correctly: `admin/page.tsx:537`, `:9254`, `:9574`; `AdminNewBookingView.tsx:702`;
`CustomerProfileDrawer.tsx:1649`, `:1671`; `DoctorOngoingSessionTab.tsx:227-241`;
`BookingDetailsModal.tsx:1283`; `DoctorAccountView.tsx:1356`. A `fully_used` package must not appear as
selectable for redemption; it must still appear in history. **Also fix `src/app/api/packages/consume/route.ts:143`**,
which writes the same illegal `'completed'` — that one line only, nothing else in that route.

### Deliberately not in scope
FEFO / draining several active packages (Brief D) — but `consume_package_pulses` takes **one**
`customer_package_id` and must be safe to call in a loop, so FEFO is additive later, not a redesign.
The checkout deficit prompt (Brief 35). The master per-pulse price (Brief C). The legacy
`[Laser Settlement]` / `[Laser Package Redemption]` notes tags — keep writing them, unchanged.
Migrating the doctor flow (Brief D). `/api/laser-pulses` (report only, finding 9).
`src/lib/billing.ts`, `ledger.ts`, `wallet.ts`, `customerBalances.ts`.

### Method
One commit per numbered item, in order (1)→(7). (1) is additive SQL. (2)(3)(4) must be green
(`npm run check`) before (5)(6)(7). Keep each diff to the lines the item names.

### Verification
`npm run check` green; `npx tsc --noEmit` and `npx eslint` output pasted. New
`tests/routes/packages-consume-pulses-columns.test.ts` using `tests/helpers/supabaseFake.ts` with
`fake.setRpc('consume_package_pulses', …)` (style: `tests/routes/reservations-patch.test.ts`).
**Be honest: the fake cannot prove atomicity.** It *can* prove: the route calls the RPC and never
touches `page_settings` (assert no `page_settings` read/write occurs); the response keys and values
match the old contract in every branch; clamp (`consumed < requested`); exactly-equal; 0 remaining →
400; expired → 400; `quantity_used <= 0` → 400; non-UUID id → 400, no 22P02; unknown id → 404/400;
repeat call with the same `reservation_id` returns `alreadyDeducted: true` and does not deduct;
depletion writes `'fully_used'`; unauthenticated → 401. Atomicity gets **two manual checks** instead:
(a) fire two PATCHes for **different** patients simultaneously (e.g. two browser tabs, or two `curl`s
backgrounded) and confirm both balances moved; (b) fire two PATCHes for the **same** reservation
simultaneously and confirm exactly one usage row exists and the balance moved once. Plus an
**SQL review checklist** in the PR: `FOR UPDATE` present; no `SECURITY DEFINER`; `REVOKE`/`GRANT` present, and calling `/rest/v1/rpc/consume_package_pulses` with the **anon** key is denied (test it); the unique index is partial on
`reservation_id IS NOT NULL`; `least()` clamp; `greatest(0, …)`; status only ever `'fully_used'`;
function idempotent to re-create; migration re-runnable.
Browser click-path: Admin → Packages → create a pulses package with Total Pulses 10,000 → sell it to a
test patient → Patient profile shows 10,000/10,000 → Doctor → active session → Option 3 → deliver 4,000
→ profile shows 6,000 → reception Checkout the same booking (which consumes again on the same
`booking_id`) → balance is **still** 6,000, one usage row → deliver 6,000 more → package reads 0 and its
status is `fully_used`, and it no longer offers itself for redemption in New Booking or the doctor tab.
Then: create a pulses package with Total Pulses left at 0 → selling it must refuse with a real error.

### Report back
Status of each of the 7 items separately. Which findings you confirmed, which were stale. **Both
migrations are unapplied — say so**, and state the exact order the owner must run things:
(i) apply migration 1 (table + function + columns), (ii) apply migration 2 (backfill) **immediately before the deploy, while reception is not checking out** — the old code keeps consuming into the blob until the deploy, and the backfill only sees what the blob holds at that moment — and read its NOTICE list, (iii) resolve every listed package by setting Total Pulses in Admin → Packages,
(iv) **then** deploy the code — the new code reads columns only, so deploying before the backfill shows
zero balances. Rollback: revert the deploy; the `page_settings` blob is untouched and the old code
resumes from it; the new table and columns are harmless if left in place. List the NOTICE-able cases
you could not resolve from code. The `grep -rn "customer_package_pulses" src/` output (must be empty).
Every `status === 'active'` site you checked for item (7). Plus the standing convention: Dev Notes
block, `ai_docs/manual_tests/LASER_PULSE_BALANCE_BRIEF_34B_MANUAL_TESTS.md` (follow
`RISK_029_MANUAL_TESTS.md`: Evidence log table + `- [ ]` checks), and a new `RISKS.md` entry — next
free id is **RISK-096** (RISK-094 is reserved by Brief 34; RISK-095 was already used by the
2026-09-22 per-pulse rate-guard fix — verify against `RISKS.md` before writing regardless) —
covering the cross-patient read-modify-write race, the invisible save failure, and the
`status: 'completed'` CHECK violation, referencing that file.

---

> **Do not start Brief 35 until Briefs 34 and 34B have landed and been reviewed.** It depends on Brief 34's migration, `src/lib/laserDeficit.ts` and the per-pulse rate chain, and on Brief 34B's `package_pulse_usage` table and `consume_package_pulses` function — the new server operation must call that RPC, never write pulse balances itself.

## Brief 35 — Receptionist checkout owns the pulse deficit; the doctor screen only records pulses

**Rewritten 2026-09-22 under DEC-079 — read that decision first.** Mohamed decided the doctor has no
business selling packages or making payment choices: patients pay reception, not the doctor. The prior
draft of this brief (reception as a backstop for a doctor-made 3A/3B choice) is superseded. This
version makes reception checkout the **only** place a laser-pulse deficit is resolved, and **removes**
the doctor-side 3A/3B choice UI that Brief 34 shipped — it does not defer that removal to a future
brief.

**Read first:** `ai_docs/DECISIONS.md` DEC-079 (this brief's mandate), then Briefs 34 and 34B in this
file (this depends on Brief 34's migration, `src/lib/laserDeficit.ts` and the rate chain, and on
Brief 34B's `package_pulse_usage` table and `consume_package_pulses` function — the new server
operation must call that RPC and never write pulse balances itself; do not start until both have
landed). Then DEC-069, DEC-072 item 5, DEC-075, and `src/app/api/packages/sell/route.ts` end to end.

**What this delivers.** The doctor's active-session screen records **only** how many pulses were
delivered — no package name, no balance, no price, no "buy new package" / "pay per pulse" choice, and
no write to `invoices`/`invoice_lines`/`customer_packages` from that screen. At checkout (both the
main Checkout modal and the "end session" flow in `BookingDetailsModal.tsx`), when delivered pulses
exceed the patient's remaining pulses-package balance and the deficit has not yet been resolved, the
receptionist is prompted to either (a) sell a new package — the deficit comes out of it and its price
goes on the invoice — or (b) bill the deficit out of pocket at the resolved per-pulse rate. Today
neither the doctor's choice nor reception's is authoritative and reliable: the doctor's 3A/3B writes
were the subject of RISK-095, and reception silently absorbs the deficit (see findings below). After
this brief there is exactly one deficit-resolution path, and it lives at reception.

### Investigation findings — verify before designing

1. **Checkout already consumes pulses, and already loses the deficit.**
   `src/app/admin/page.tsx:9547-9599` (inside `handleConfirmCheckout`, defined `:9509`, modal at
   `:9203`) resolves the patient's first active pulses package and PATCHes `consume_package_pulses`
   for the full delivered count. The server clamps to the remaining balance (Brief 34, finding 1), the
   response is discarded, and the excess is never billed. As of Brief 34B the clamp happens inside the
   Postgres function `public.consume_package_pulses`, not in the route; the response contract is
   unchanged. `BookingDetailsModal.tsx:1219-1311` does the same thing in the receptionist "end session"
   flow. **Both are silent-clamp sites and both are reception surfaces** — neither may stop at "surface
   the clamp"; both must route through the new server operation and prompt.
2. **The consume happens *after* the money PATCH.** `:9512-9524` writes
   `status/amountPaid/amountLeft/wallet…` first; the pulse consume is at `:9547`. A deficit discovered
   at `:9547` therefore cannot reach the invoice. **The prompt must be resolved before the money is
   computed**, not appended after.
3. **Totals are computed inline, in the modal, from `notes` regex** (`:9340-9484`), and there is an
   existing user-visible failure convention to copy: `consumeFailures` → the alert at `:9611-9614`.
4. **`/api/packages/sell` is the right server primitive to reuse.** It is `requireStaffAccess`-guarded,
   re-resolves the package price server-side from the `packages` row (`:141`), writes
   `invoices` + `invoice_lines` + `customer_packages` (with `total_pulses`/`pulses_remaining`) +
   `payments` with the **real** `method` (`:387-392`) + customer balances, supports partial
   `amountPaid`, and has rollback helpers at `:30-42`. Brief 34B removed that `|| 1000` pulse fallback:
   `/api/packages/sell` now refuses a pulses package whose `packages.total_pulses` is 0. The
   buy-new-package choice must surface that refusal to the receptionist, not retry. Also note every
   current caller hardcodes `paymentMethod: "cash"` (`DoctorAccountView.tsx:1287`, `:1405`,
   `BookingDetailsModal.tsx:1258`); the new path must pass what the receptionist actually collected.
5. **Deficit is computed against ONE package.** `DoctorOngoingSessionTab.tsx:611` currently picks a
   doctor-selected package for display purposes only (that selection UI is removed by this brief —
   see scope item below); `page.tsx:9572` and `BookingDetailsModal.tsx:1282` both pick the first active
   one with `remaining > 0`. (Re-grep these line numbers after Brief 34B item (7) touches those
   filters; a depleted package is now `fully_used`, so "first active" and "first active with
   `remaining > 0`" finally agree.) There is no FIFO across several packages. **Follow the existing
   behaviour** (single package, explicitly chosen at checkout when there is more than one) and log the
   "should it drain all active packages first?" question as a decision for Mohamed — it is Brief D,
   below.
6. **The doctor-side 3A/3B choice is exactly what DEC-079 removes.**
   `DoctorAccountView.tsx:1392-1479` (`handleCompleteTreatment`'s deficit branch, hardened by Brief 34
   item 4) currently: consumes the old package, calls `POST /api/packages/sell`, deducts the deficit
   from the new package, and posts a `New Package: …` invoice line — all from the doctor's screen, all
   before reception ever sees the booking. `DoctorOngoingSessionTab.tsx:610-675` computes and displays
   the deficit, the package balance, and the resolved per-pulse price to the doctor so they can choose.
   Per DEC-079 this entire choice — the UI, the price/balance display, and the `/api/packages/sell`
   call and invoice-line write it triggers — is out of place on the doctor's screen and must be
   removed, not preserved as a parallel path. What the doctor screen keeps: the delivered-pulses input,
   and the existing clamped consume against the source package (Brief 34B's RPC, unchanged) so the
   package's `pulses_used`/`pulses_remaining` stay accurate in real time. What it loses: any number
   that implies a price, any package-selection or "buy new package" control, and any code path that can
   write an invoice line.

### Design requirements

**Server-first, one operation.** New `POST /api/reservations/laser-deficit` (or an `action` on an
existing route — justify whichever you pick). `requireStaffAccess`. Body carries **only the choice**:
`{ reservationId, choice: 'BUY_NEW_PACKAGE' | 'PAY_PER_PULSE', packageId?, sourceCustomerPackageId?,
paymentMethod?, amountPaid? }`. The server does all of: re-read delivered pulses and the package
balance, compute the deficit with `src/lib/laserDeficit.ts`, consume the source package down to 0 (this
consume already happened once from the doctor screen at the clamped amount — this call must be safe to
run when that consume has already occurred, i.e. it resolves the *remaining, unconsumed* deficit, not
the full delivered count again), then either call the same logic as `/api/packages/sell`
(re-resolving the package price from the `packages` row — never a client-supplied price,
`.windsurf/rules/30-react-and-money.md` rule 6) and deduct the deficit from the new package, or write a
single `reservation_products` deficit line at the rate from Brief 34's chain. Client sends no amounts.
If the rate is unresolvable, refuse with a real error — no 1 EGP.

**Idempotency, keyed by reservation.** The consume is protected by
`UNIQUE(customer_package_id, reservation_id)` on `package_pulse_usage` (Brief 34B): a repeat call
returns the first result and deducts nothing. That guard still does **not** protect the invoice line or
the package sale, so the reservation-level marker below is still required. Add a persisted, queryable
marker: a real column (`reservations.laser_deficit_resolution text` + `laser_deficit_pulses integer`,
nullable, no default, idempotent migration + `DB_SCHEMA.md` in the same commit). The legacy
`[Laser Settlement]` / `[Laser Package Redemption]` notes tags written by
`DoctorAccountView.tsx:1575-1590` **stop being written by the deficit branch** under this brief (that
branch no longer exists — see scope item below); treat any tag already present on older bookings as a
**legacy read-only fallback** for the marker on bookings created before this column exists, and say in
the PR how you decide between the two. A second call for the same reservation returns the first
result, changes nothing, and the UI says "already resolved". Because the doctor screen no longer
resolves anything, there is no "already resolved by the doctor" case to design for — resolution only
ever happens once, at reception, through this one operation.

**Cases the design must state an answer for:** a package with an unknown total (`total_pulses = 0`) —
refuse with Brief 34B's error, never compute a deficit against a guessed total; no active package at
all (no deficit — this is the "initial purchase" path, out of scope, must not prompt); exactly-equal
balance (no deficit, no prompt); multiple active packages (receptionist picks; no doctor-made default
exists anymore, so default to the same "first active" resolution `page.tsx`/`BookingDetailsModal.tsx`
already use); expired package (`route.ts:416-421` refuses — surface it, do not silently skip); mixed
sessions with non-laser services on the same invoice (DEC-069 — the deficit line is additive, other
lines untouched); partial payment (DEC-075 — never collapse the booking total below
`amountPaid + amountLeft`); wallet / outstanding via the existing helpers only. `payments.method` must
be the real method.

**UI — reception gets the prompt, the doctor screen gets a plain number.** New
`src/components/admin/bookings/LaserDeficitPrompt.tsx`: shows delivered pulses, remaining balance,
deficit, the two choices, the resolved rate and the resulting invoice delta. It is rendered inside the
Checkout modal **before** the totals block (`page.tsx` ~`:9470`), and confirming checkout is blocked
while an unresolved deficit exists. The diff in `src/app/admin/page.tsx` should be an import, a small
amount of state, one conditional render and one guard in `handleConfirmCheckout` — nothing else.
`BookingDetailsModal.tsx:1219-1311`'s "end session" flow gets the **same** `LaserDeficitPrompt`, gated
the same way, before that flow's own status/payment write — this is a change of substance, not the
"surface the clamp only" treatment the prior draft specified, per finding 1.
On the doctor screen, `DoctorOngoingSessionTab.tsx`'s pulses input keeps recording delivered pulses and
triggers the existing clamped consume; when the clamp reports `consumed < requested`, show one neutral,
non-monetary line — e.g. "Recorded pulses exceed the package balance. Reception will resolve this at
checkout." — with no balance number, no package name, and no button. Do not restructure either big
file beyond these additions.

### Scope — doctor-side removal, spelled out

**DELIBERATE FIX, and it is in scope for this brief, not deferred.**
- `DoctorAccountView.tsx:1392-1479` (`handleCompleteTreatment`'s deficit branch): delete the
  `POST /api/packages/sell` call, the deficit-deduction-from-new-package call, and the
  `New Package: …` invoice-line write. Completion keeps doing the delivered-pulses consume against the
  source package (clamped, unchanged) and completes the session; it does not sell anything and does not
  write invoice lines.
- `DoctorOngoingSessionTab.tsx:610-675`: delete the 3A/3B choice UI, the package-selection control, and
  the balance/price display. Keep `resolveDeliveredPulses`/whatever of `src/lib/laserDeficit.ts`'s
  helpers are still needed to detect "delivered exceeds remaining" for the neutral notice above — that
  detection stays, the monetary UI built on top of it goes.
- `DoctorAccountView.tsx:1575-1590`'s `[Laser Settlement]` / `[Laser Package Redemption]` tag-writing
  is deleted along with the branch that wrote it, per the point above — say explicitly in the PR that
  this is a deletion, not a behavior-preserving refactor, since Brief 34/34B both treated those tags as
  a thing to keep writing.
- State plainly in the PR: this discards real, working code Brief 34 shipped two days prior. That is
  the intended outcome of DEC-079, not a regression to explain away.

### Deliberately not in scope
FEFO (earliest-expiry-first) across packages — Brief D, now scoped to reception's single path only
(see Queued below, updated under DEC-079). The master-rate decision (future Brief C).
`src/lib/billing.ts`, `ledger.ts`, `wallet.ts`, `customerBalances.ts`, `computeSettledBalances()`.

### Method
Order matters because this brief both adds a resolution path and removes the only one that exists
today. Land in this order so there is never a window where a deficit can occur with nothing able to
resolve it: (1) the migration + server operation + `LaserDeficitPrompt` + wiring into
`page.tsx`'s Checkout modal and `BookingDetailsModal.tsx`'s end-session flow, verified working end to
end; **then, only after that is green and manually verified,** (2) the doctor-side removal described
above. Do not land (2) before (1) is confirmed working.

### Verification
`npm run check` green. New `tests/routes/reservations-laser-deficit.test.ts` (fake-Supabase style,
per `tests/routes/reservations-patch.test.ts`): deficit computed server-side and not trusted from the
body; buy-new-package choice sells, deducts and invoices once; pay-per-pulse choice writes one line at
the resolved rate; second call is a no-op returning the first result; no-package and equal-balance
produce no deficit; unresolvable rate → error, no writes; expired source package → error;
unauthenticated → 401; the same suite covers `BookingDetailsModal.tsx`'s end-session call path, not
just the Checkout modal's. A jsdom test for `LaserDeficitPrompt.tsx` only (do not add one for
`page.tsx`). A test asserting `DoctorAccountView.tsx`'s completion path no longer calls
`/api/packages/sell` and writes no invoice line, to lock in the removal.
Browser click-path: book a laser service in Package mode for a patient with 5,000 pulses left →
doctor records 10,000 delivered — the doctor screen shows only the neutral notice, no numbers, no
choice → reception opens Checkout → the deficit prompt appears showing 5,000 → pick pay-per-pulse → the
invoice gains one 5,000 × rate line and the package reads 0 → reopen Checkout → "already resolved", no
second line, balance still 0. Repeat with buy-new-package. Repeat both through
`BookingDetailsModal.tsx`'s end-session flow instead of the Checkout modal.

### Report back
Which route shape you chose and why. The exact marker column(s) and how they interact with the legacy
`notes` tags. The answer you implemented for each bullet under "Cases the design must state an answer
for". Every file you touched in `page.tsx` / `BookingDetailsModal.tsx` / `DoctorAccountView.tsx` /
`DoctorOngoingSessionTab.tsx`, line-counted, with the doctor-side deletions itemized separately from
the reception-side additions. The migration is unapplied — say so. Plus the standing convention: Dev
Notes block, `ai_docs/manual_tests/LASER_DEFICIT_BRIEF_35_MANUAL_TESTS.md`, a `DECISIONS.md` entry for
the server-operation + marker design (referencing DEC-079), and a `RISKS.md` entry for anything you
found and did not fix.

### Queued, not yet written

- **Brief C — master per-pulse price location** (device vs service vs clinic default). Product decision pending. Briefs 34/34B/35 resolve the rate only through the fallback chain (reservation snapshot → clinic default → error) so they stay valid whichever is chosen.
- **Brief D — FEFO across active packages.** Under DEC-079 there is only one deficit-resolution path (reception's), so Brief D no longer needs to "unify" anything — it only extends Brief 35's server operation to drain **all** of a patient's active pulses packages, earliest expiry first, calling Brief 34B's `consume_package_pulses` once per package in a loop.
- Translation of the Pages Settings tabs extracted in Brief 27 is also an obvious next brief, not yet written.

### Decisions log for Mohamed

**Decided:**
- The doctor's screen never sells packages, never shows package pricing, and never chooses how a
  deficit is paid — reception's checkout is the only place that happens → **DEC-079**, this brief.
- FEFO across active packages, earliest expiry first → **Brief D**, applied to reception's single path
  (no longer "doctor and checkout paths together" — there is only one path after this brief).
- Move the pulse balance off the `page_settings` blob → **Brief 34B**.
- Package total pulses come from the real `total_pulses` column only; unknown is an error the user resolves in Admin → Packages, never a guess → **Brief 34B** items (4)/(5).

**Still open (do NOT decide these in code):**
1. Where the master per-pulse price lives (Brief C).
2. `packages.total_pulses` is `NOT NULL DEFAULT 0`, so "unset" and "zero" are indistinguishable. Brief 34B assumes 0 = unset and refuses. Confirm no legitimate zero-quota pulses package exists.
3. The live DB cannot be inspected from code: `DB_SCHEMA.md` had a duplicate, wrong `customer_packages` block (columns no migration creates). Brief 34B assumes the migrations are right and the doc was wrong; if the live DB was hand-edited the backfill changes.
4. Whether the doctor screen needs the neutral "reception will resolve this" notice at all, or whether
   silence is preferable — implemented here as a notice per DEC-079's spirit ("the doctor should still
   know to tell the patient"), but Mohamed should confirm this is the right amount of doctor-facing
   signal, not too little or too much.
---
---

# ARCHIVE — completed briefs

Kept as a short record only. Full detail of what was found and fixed lives in `ai_docs/RISKS.md`
(RISK-038 … RISK-050), which is the authoritative account.

### Not a brief — fixes to Windsurf's Financial Transactions module (commit `22419c3`, 2026-08-28) — found by review, fixed directly same day

Mohamed explicitly asked for extra scrutiny on this one given it moves real money. Full account:
**RISK-076** in `RISKS.md`. Five compounding defects, none caught before shipping because the
module had zero automated tests:

1. **`customers.outstanding_balance` referenced throughout — that column has never existed** (the
   real one is `outstanding`). Broke the customer join in `GET`, the stats query, and the customer
   lookup in `POST` — every real request against this feature failed, and the failures were
   swallowed rather than surfaced.
2. **`transaction_id` was `Math.random()`**, not the `transaction_seq` sequence the migration
   created for exactly this purpose — a real collision risk against a `UNIQUE` column.
3. **`GET` wrote 9 fabricated "demo" transactions into the real table**, attached to real customer
   ids, the first time the screen opened on an empty table — plus hardcoded fallback stats matching
   those same demo numbers, and a fabricated fallback audit log on query error.
4. **`adjustment` transactions were logged but never changed any customer balance** — the
   customer-balance-update branch simply didn't exist for that type.
5. **The granular `transactions.view`/`create`/`refund` permissions added to `RoleManagementView.tsx`
   in the same commit were never checked anywhere** — pure UI decoration; any staff member could hit
   the API directly regardless of what they'd been granted.

**Worth knowing for future work touching money:**
- Before writing to or reading from any table column, double check it against `ai_docs/DB_SCHEMA.md`
  (and ideally the live schema) — a wrong column name fails the whole query, and if the error is
  swallowed (a `console.warn` instead of returning it) the feature just silently does nothing.
- Never seed "demo" or placeholder data into a real table from a GET handler as a fallback for "no
  data yet" — render an empty state client-side instead. This is doubly true for a financial ledger.
- When a new permission is added to `RoleManagementView.tsx`, it isn't enforced anywhere by itself —
  the API route has to actually call `hasFinancePermission(access, 'the.permission')`.
- Every signed-amount transaction type needs a real branch in the balance-update logic — a type that
  compiles and validates but silently no-ops on the actual money movement is the most dangerous kind
  of bug in this class of feature.

### Not a brief — fixes to Windsurf's Doctor Status / Doctor Edit / Patients redesign work (10 commits, 2026-08-25) — found by review, fixed directly 2026-08-27

No brief was issued for this — Windsurf delivered the Doctor Status feature, the doctor edit page
redesign, and the Patients directory redesign independently (commits `08a7648`…`3c6d6c1`). An 8-angle
code review against that range found 10 confirmed bugs (2 more surfaced during the fix itself), fixed
directly rather than sent back as a brief given the severity. Full account: **RISK-075** in
`RISKS.md`, decision on scope: **DEC-045** in `DECISIONS.md`.

**Worth knowing for future work in this area** (so the same shapes don't recur):
- **New `providers`/`employee_accounts` fields need a real migration before the API writes to
  them.** The Doctor Status feature wrote `active` to both tables with no migration for either —
  every write silently failed and fell back to a local JSON file (`data/providers.json`), so the
  feature looked like it worked in manual testing but never persisted. Same root cause separately
  broke `POST /api/providers` entirely (four fields written as columns that don't exist → 500 in
  production, since Vercel's filesystem is read-only for the JSON fallback). Check
  `ai_docs/DB_SCHEMA.md` against `supabase/migrations/` before assuming a field exists on a table.
- **Don't fall back to matching by `name` when an id-scoped lookup misses.** `providers.name` and
  `employee_accounts.name` have no unique constraints — a by-name fallback update can silently
  overwrite or misattribute a different row if two records share a name. Prefer a hard 404/error over
  a guess.
- **A merge should start from the stored value, not `{}`, when the caller didn't send that field.**
  The schedule-merge PATCH logic rebuilt `working_days_hours` from only the fields present in the
  current request, which meant a status-only or extras-only PATCH could silently wipe a doctor's
  branch assignments. Fetch and spread the existing row when a field is optional in the request.
- Swapping one action for another in a menu (e.g. "Delete" → "Change Status") should keep both if
  they serve different purposes — deleting a genuinely duplicate/erroneous record still needs a path.

### Brief 33 — Give doctor and reception notes their own columns instead of sharing `reservations.notes` (completed 2026-08-24)

Landed in one commit (`7d60b6b`), after one round of review. First submission left the doctor side
writing both the new `doctorNotes` column **and** the old `notes` field (with the bracketed tags) —
flagged back with Mohamed's explicit instruction to close it the same way reception was closed.
Final version does exactly that: `handleSaveClinicalNote`/`handleCompleteTreatment`
(`DoctorAccountView.tsx`) now write `doctorNotes` only, and the `sessionAddonsSummary` bracketed-tag
string-building was genuinely **deleted**, not just stopped from being read — confirmed by diff, not
by the commit message. Reception's side was already clean from the first submission. Reads
(`cleanBookingNotes`, the doctor drawers, the "Booking Notes" block) all correctly prefer the new
columns with a fallback to regex-cleaned legacy `notes` for pre-migration bookings.

**One deliberate exception, verified reasonable, not a corner cut:** `autoSyncServicesToBooking`
(`DoctorOngoingSessionTab.tsx`) still writes bracketed tags into `notes` on every mid-session
service addition. This is a genuinely different concern from the doctor's typed clinical note — a
real-time sync so `additionalServices` state survives a page reload *before* the doctor has saved or
completed anything, paired with the restore-parsing logic a few lines above it. Left as-is
correctly; redesigning that mechanism was never in this brief's scope.

Independently re-verified: `tsc`/`eslint`/`vitest` clean (631 passing, unchanged). The migration
(`20260824020000_add_doctor_reception_notes_to_reservations.sql`) is applied — Mohamed approved and
ran `supabase db push` directly (which also caught and re-synced 8 other pending migrations from
2026-08-03 onward that had drifted out of the dev database's tracking history after an account/link
switch — see `RISKS.md` → RISK-020's 2026-08-24 update). Confirmed `doctor_notes`/`reception_notes`
exist as real columns via a direct schema query.

### Brief 33 body (original ask, for reference)

**Why this matters now, not just cleanup:** Mohamed asked directly whether doctor/reception notes
are actually being saved, since he'd only seen them in the UI. They are — verified by tracing every
save path to a real `PATCH /api/reservations` call — but both write into the **same single
`reservations.notes` text column**, interleaved with auto-generated bracketed tags
(`[Products Used During Session]:`, `[Invoice Total Updated]:`, etc.), and every reader has to
regex-strip those tags back out to show a human a clean note. This brief separates them into their
own columns. **Not urgent to the point of blocking go-live, but worth doing before Reception/Doctor
lean on notes daily** — the current shape is real, not fake, but fragile.

### Every save/read site, traced directly — read this before writing any code

**Doctor's clinical notes — two write sites, same shape:**
- `src/components/admin/DoctorAccountView.tsx:745` `handleSaveClinicalNote()` — mid-session "Save
  Doctor Notes" button. Builds `fullNotes = (clinicalNote || "") + sessionAddonsSummary` (the
  bracketed-tag block for `additionalServices`/`usedProducts`/`extraPulsesCount`), then
  `PATCH /api/reservations?id=X` with `{ notes: fullNotes }`.
- `src/components/admin/DoctorAccountView.tsx:868` `handleCompleteTreatment()` — same
  `finalNotes = clinicalNote + sessionAddonsSummary` pattern, PATCHes `{ notes: finalNotes,
  status: "completed", amountLeft: ... }` on session completion.
- Textarea itself: `DoctorOngoingSessionTab.tsx:768-774`, bound to `clinicalNote`/`setClinicalNote`
  (both passed down as props from `DoctorAccountView.tsx:278`).

**Reception's booking notes — one write site:**
- `src/app/admin/page.tsx:5386` `saveNotes(newNotes)` — `PATCH /api/reservations?id=X` with
  `{ status: viewingBooking.status, notes: newNotes }`. Called from the booking-details drawer's
  "Save Note" button (`page.tsx:8742-8756`), gated by `hasPermission("bookings.edit")`. On save, it
  regex-extracts any existing bracketed tags from the old `notes` value
  (`page.tsx:8746`, matches `[Products Used|Additional Services|Device Pulses|Extra Device|Invoice
  Total|Total Invoice|Added Product|Added Service]`) and re-appends them after the user's typed
  text — this exists specifically because reception's free text and the auto-generated tags
  currently *have* to coexist in the same field.

**Display-side proof this is already fragile:** `page.tsx:8688` `cleanBookingNotes` — a 9-step
regex-stripping IIFE that removes every known bracketed-tag pattern just to show the human-readable
note back to a receptionist. `DoctorOngoingSessionTab.tsx:778-781` shows the raw
`activeSessionBooking.notes` unstripped, in a "Booking Notes" read-only block — a doctor viewing an
active session currently sees the tags too, reception doesn't (different code paths, inconsistent
today).

**Important, verify-don't-assume finding: the bracketed tags may already be fully redundant.**
`persistSessionLineItems()` (`DoctorAccountView.tsx:801`, called from both `handleSaveClinicalNote`
and `handleCompleteTreatment` before the notes PATCH) already writes `usedProducts`/
`additionalServices`/device-pulse usage to `POST /api/reservation-products` — the real, structured
DEC-042 table. If that's the actual source of truth read everywhere that matters (checkout's
`writeCheckoutInvoice`, the Brief 32 ledger path), then `sessionAddonsSummary` string-building in
both doctor handlers is dead weight duplicating data already captured properly, kept only because
nobody removed it after DEC-042 landed. **Confirm this before deleting it** — grep every reader of
`reservations.notes` (not just the four sites above; there may be others, e.g. print/export
templates) to make sure nothing still depends on parsing those tags out of `notes` specifically,
especially for bookings predating `reservation_products`' existence.

### The fix

1. **Migration**: add `doctor_notes text` and `reception_notes text` (both nullable, no default) to
   `reservations`. Update `DB_SCHEMA.md` in the same commit, per the standing CLAUDE.md rule.
2. **Doctor writes**: `handleSaveClinicalNote`/`handleCompleteTreatment` PATCH `doctor_notes:
   clinicalNote` instead of folding it into `notes`. If the redundancy finding above checks out,
   drop the `sessionAddonsSummary` string-building entirely (simplify, don't just stop calling it —
   dead code that still runs is worse than code that's gone). If it doesn't check out, say why in
   the PR and keep it, but still stop writing free text into `notes`.
3. **Reception writes**: `saveNotes`/the booking-details drawer PATCH `reception_notes: newNotes`
   instead of `notes`. Drop the tag-preservation regex-extraction at `page.tsx:8746` — becomes
   unnecessary once reception notes have their own clean column with nothing else sharing it.
4. **Reads**: `cleanBookingNotes` (`page.tsx:8688`) and the "Booking Notes" block in
   `DoctorOngoingSessionTab.tsx:778-781` both switch to reading `doctor_notes`/`reception_notes`
   directly — no more regex-stripping needed once the columns are clean by construction.
5. **Backward compatibility — additive, not destructive, same discipline as every ledger migration
   this project has done (`FINANCE_TRACKER.md`'s "additive, then cutover"):** `reservations.notes`
   itself is **not removed or migrated**. Old bookings keep whatever's already in `notes`
   (`doctor_notes`/`reception_notes` will be `NULL` for them). Decide explicitly whether the UI
   should show old `notes` content as a labeled "legacy note" for bookings that predate this
   migration, or just show nothing until a note is added in the new column — say which, and why, in
   the PR. **Do not touch** the old invoice-modal fallback's notes-regex-parsing
   (`page.tsx`, the `{invoiceBooking && ...}` block Brief 32 explicitly preserved) — that still
   needs to read the historical `notes` field exactly as it does today for pre-ledger bookings.

**Verify:** a doctor's mid-session note and a reception note on the same booking no longer overwrite
or concatenate with each other (today, since both PATCH the same `notes` field, whichever saves
last effectively wins for anything not tag-shaped — confirm this is actually a live bug worth
mentioning, or that some existing merge logic already prevents it, before/while writing the fix).
`tsc`/`eslint`/`vitest` clean. Manual test: doctor writes a note, saves; reception separately adds a
note on the same booking; both are visible, distinct, and neither clobbered the other.

---

### Brief 32 — Bookings screen's invoice modal: read the real ledger instead of live-recomputing (RISK-010 remainder) (completed 2026-08-24)

Landed in one commit (`f2aa6db`). Independently re-verified: `tsc` clean, `vitest` unaffected (631
passing, 11 expected fail). `eslint` had two real errors on the new file
(`src/app/api/invoices/route.ts:59-60`, `serviceNameMap`/`productNameMap` declared `let` but never
reassigned) — fixed directly as a small, mechanical, obviously-safe `let`→`const` change (the
objects' properties are mutated, the bindings themselves never reassigned); `eslint` clean after.

New `GET /api/invoices?reservationId=X` (`src/app/api/invoices/route.ts`) matches the required
auth pattern exactly — `requireStaffAccess` + `supabaseServer`, same shape as
`reservation-products/route.ts` — and filters `.neq('status', 'void')`. Confirmed directly in
`supabase/migrations/20260726010000_create_invoices.sql:40` and
`20260726010100_create_invoice_lines.sql:40` that both `invoices` and `invoice_lines` have RLS
enabled with zero `CREATE POLICY` statements anywhere in the migrations — the service-role
endpoint is genuinely required, not just cautious.

**Fallback path — the highest-risk part of this brief — verified byte-for-byte, not just by
reading:** diffed the pre-commit and post-commit versions of `src/app/admin/page.tsx` from the
`// 1. Calculate service cost` line through the end of the invoice modal (463 lines) and they are
**identical**. The entire old live-compute/notes-regex-parsing block (`Additional Services Used`,
`Added Product`, `getEffectiveServicePrice`, all five regex formats) still exists untouched and
still runs whenever `ledgerInvoice` is `null`. The new ledger-backed branch is a separate `if
(ledgerInvoice) { return (...) }` inserted before the old code, not a replacement of it.

`amountPaid`/`amountLeft` in the new ledger branch use the exact same reservation-sourced
computation (`invoiceBooking.amountPaid`/`amount_paid`, `.amountLeft`/`amount_left`) copied
verbatim from the fallback branch — confirmed not pointed at any ledger/`payments` data, per the
brief's explicit out-of-scope instruction.

**Went beyond the brief's minimum ask on the bilingual-description question (brief item 5):**
rather than just documenting a decision to accept English-only `invoice_lines.description`, the
endpoint joins `service_id`/`product_id` back to `services.ar`/`inventory_products.name_ar` and
returns both `nameEn`/`nameAr` per line, so the modal's existing Arabic-name display keeps working
for ledger-backed invoices too — a strictly better outcome than the brief required, and documented
in the commit message.

**Not independently live-verified** — the admin panel's login gate blocks Claude from confirming
visually (entering credentials is off-limits); this review rests on the diff, the migration files,
and the automated test/lint/typecheck run, not a live browser check of the modal itself.

### Brief 32 body (original ask, for reference)

**Scope: the Booking Invoice Modal only** — `src/app/admin/page.tsx`, the
`{invoiceBooking && (() => { ... })()}` block, currently ~10903–11194 (re-measure before starting).
**Not a rewrite of that block** — it stays as the fallback path for bookings that predate the
ledger. See `RISKS.md` → **RISK-010** (now Partially Resolved) for the full history.

**What's already real, verified by reading the actual checkout code, not assumed:**
`writeCheckoutInvoice()` (`src/app/api/reservations/route.ts:284` onward) already runs on every
booking completion and correctly writes a complete `invoices` + `invoice_lines` snapshot — base
services (`services.en`/price at that moment, 323–343) **and** any additional
products/services/device-pulses attached via `reservation_products` (DEC-042, 354–399) — into
immutable rows. **This already fully replaces what the modal's notes-regex-parsing block is trying
to reconstruct** (5 different regex formats across ~10968–11153, itself a "safety net & historical
support" fallback per its own comment) for any booking completed since `writeCheckoutInvoice` has
had the DEC-042 fold-in (verify the exact commit/date this landed — bookings completed before that
point may have an `invoices` row with only service lines, not attached products; treat those the
same as "no invoice" for this brief's purposes, i.e. still fall back).

**The gap:** the modal never queries `invoices`/`invoice_lines` at all — it always rebuilds
everything from `invoiceBooking.serviceIds` re-priced live via `getEffectiveServicePrice()`
(10908–10910) plus the notes-regex fallback. For any booking that already has a real invoice
sitting in the database, the modal is silently ignoring the correct, immutable historical data and
showing today's re-derived numbers instead.

**Fix, additive not destructive:**
1. **New endpoint**, e.g. `GET /api/invoices?reservationId=X` — `requireStaffAccess`-gated (same
   pattern as `reservation-products/route.ts`), using `supabaseServer` (service role). **Required**
   — `invoices`/`invoice_lines` have RLS enabled with **zero policies** (confirmed by reading
   `supabase/migrations/20260726010000_create_invoices.sql:40`, no `CREATE POLICY` anywhere for
   either table), so a client-side `supabase.from('invoices')...` call from the browser would
   always return zero rows. No existing endpoint does this single-reservation lookup — the closest
   are bulk reads inside the finance report endpoints (`pnl`, `package-profitability`), not
   reusable here. Return the `invoices` row plus its `invoice_lines` (a single query with a join,
   or two queries — either is fine), `status != 'void'` only.
2. **In the modal**, before building `baseServicesList`/parsing notes: call this endpoint for
   `invoiceBooking.id`. If a non-void invoice comes back:
   - Render each `invoice_lines` row directly — `description` (English only, see below),
     `qty`, `unit_price`, `line_total` — instead of `baseServicesList`/
     `invoiceAdditionalServicesList`/`invoiceProductsList`.
   - Totals come from `invoices.subtotal`/`discount_total`/`grand_total`, not the
     `totalCost`/`allInvoiceItems.reduce(...)` computation (11157–11186).
   - **`invoice_lines.description` is English-only** (built as `svc.en || ...` at
     `reservations/route.ts:337`, no Arabic column on the table) — the current modal shows
     bilingual `name`/`nameAr` per line. Decide explicitly whether to join `service_id`/`product_id`
     back to `services`/`inventory_products` for the Arabic name, or accept English-only on this
     specific invoice-view path, and say which in the PR — don't silently drop bilingual display
     without noting it.
   - `amountPaid`/`amountLeft` (11171–11176) **stay sourced from the reservation exactly as
     today** — do not point these at `payments` or attempt any further cutover; that's explicitly
     out of scope (see `FINANCE_TRACKER.md`'s "additive, then cutover" discipline — 1.14 cut
     `outstanding`/`spent_amount`/`wallet_balance` over already, `amount_paid`/`amount_left`
     themselves have not been, and this brief doesn't change that).
   - If no invoice comes back (404/empty — pre-ledger booking, or a booking still in a
     non-completed status), **fall back to the entire existing block completely unchanged** —
     `baseServicesList`, the notes-parsing, the reconciliation-fallback logic, all of it. Do not
     delete or "clean up" that code; it's still load-bearing for old data.

**Verify:** a freshly-completed booking's invoice modal renders identically (or better — real
attached-product lines that the notes-parser might have missed) whether read live or reopened
later, and specifically that **editing a service's price after the fact no longer changes an
already-issued invoice's displayed total** — the direct proof this fix actually closes the gap.
Test against both a booking old enough to have no `invoices` row (fallback path exercised) and one
completed after this lands (ledger path exercised). No `tsc`/`eslint`/`vitest` regressions.

---

### Brief 31 — Admin sidebar: translate nav labels and mirror it to RTL (completed 2026-08-24)

Landed in one commit (`e72d7d8`). Independently re-verified: `tsc`/`eslint` clean, `vitest`
unaffected (631 passing). Value/label separation held exactly as required — confirmed
`setActiveNav`/`key=`/`.includes(activeNav)` all still compare against the English `label` strings
(grepped, unchanged), only the rendered `<span>` text routes through `adminTranslations[lang]
.sidebar[label] || label`. All 31 suggested translations landed verbatim. Both RTL sub-problems
correctly separated and solved: `dir` added to the `<aside>` itself for content mirroring, `start-0`
+ a flipped mobile slide transform (`translate-x-full` in RTL vs `-translate-x-full` in LTR) for the
mobile position, and — correctly identifying the nuance the brief flagged rather than guessing —
`dir` also added to the outer grid container so the 220px sidebar column actually swaps to the right
on desktop.

**One real regression found on review, fixed directly (not sent back — small, mechanical, and
Windsurf had already verified their own scope thoroughly):** adding `dir` to the grid container
cascades `direction: rtl` down through `<main>` (a sibling of `<aside>` inside that same grid, and
the container for *every* admin screen) to any screen that doesn't set its own `dir` — confirmed by
grep that `PromotionsAdminPanel.tsx` and `PackageAdminPanel.tsx` both have multiple
`flex items-center justify-between` rows with no `dir` of their own, and that the Top Navigation Bar
(`page.tsx:5809`, branch dropdown/Profile button/hamburger, explicitly out of this brief's scope)
has the same shape. Any of these would have silently mirrored — icon/button order flipping — while
their text stayed English, the moment `lang` was set to Arabic, even though nobody translated or
tested them. Fixed by adding `dir="ltr"` to `<main>` (`page.tsx:5807`) to reset the ambient
direction at the content-area boundary: the grid's own `direction` still governs column *ordering*
(a property of the grid container, independent of what direction its items declare), so the sidebar
still swaps sides correctly, while every untranslated screen — and the explicitly-out-of-scope top
bar — stays pinned to its current, correct LTR layout regardless of `lang`. Every already-translated
screen is unaffected, since each already sets its own `dir` on its own root, which overrides the
inherited value either way. Re-verified `tsc`/`eslint`/`vitest` clean after the fix.

**Not independently live-verified** — the admin panel's login gate blocks Claude from confirming
visually (entering credentials is off-limits); this review rests on precise static analysis (the
exact CSS/cascade mechanism was traced and reasoned through explicitly, not assumed) plus
Windsurf's own reported live browser verification for the parts within their stated scope.

### Brief 31 body (original ask, for reference)

**Scope: `src/app/admin/page.tsx` lines 5528–5805 only** — the sidebar `<aside>` (5538–5805), its
mobile backdrop, and the outer shell `<div className="grid ... grid-cols-[220px_1fr]">` (5530) that
positions it. Not a separate component — it's inline in `page.tsx` and always has been; grepped the
whole block for `dir=`, `adminTranslations`, `t.` — **zero hits**. Every other screen in this i18n
series (Employees, HR, Role Management, the 7 Settings screens, Reception Dashboard, User Profile)
has been extracted and translated; this is the one piece of chrome visible on *every single admin
screen* that never got touched, because it was never anyone's "screen" to extract.

**Read this before writing a single line — the value/label trap that will break the whole file if
missed.** `SIDEBAR_ITEMS` (214–229) and both submenu arrays (Settings' 14 items at ~5642–5658,
Marketing's 2 at 5728–5729) use `label` as **both** the display text **and** the canonical key:
`onClick={() => setActiveNav(item.label)}` (5773, 5674, 5737) sets `activeNav` to that exact
English string, and **dozens of `activeNav === "Bookings"` / `.includes(activeNav)` checks
throughout the rest of this 11,000-line file** — the entire `{activeNav === "X" && (...)}` render
gate pattern this whole admin panel is built on — compare against it verbatim. **Translating
`item.label`/`sub.label` directly would silently break every one of those comparisons** (nothing
would render, no error, no crash — the exact class of bug this project's value/label rule exists to
prevent). **Do not touch:** `SIDEBAR_ITEMS`, the two submenu arrays, `setActiveNav(...)` calls, the
`.filter(sub => ...)` permission logic (5659–5666), `key={item.label}` / `key={sub.label}`, or any
`activeNav === "..."` / `.includes(activeNav)` comparison anywhere in the file. **Only** the 3
render sites — `<span className="truncate">{item.label}</span>` (5796), `{item.label}` inside the
Settings/Marketing parent buttons (5716, 5619-area), and `<span className="truncate">{sub.label}</span>`
(5682, 5745) — get wrapped in a label→translation lookup with the English label as a safe fallback
for anything unmapped (`comingSoon` items, the `title={isComingSoon ? "Coming Soon" : undefined}`
tooltip too).

**RTL mirroring — two separate problems, verify both live, don't assume one fix covers both:**

1. **Content inside the sidebar** (icon/label order, text alignment) — straightforward: add
   `dir={lang === "ar" ? "rtl" : "ltr"}` to the `<aside>` itself (5538), same pattern every other
   screen uses on its own root. Convert the physical classes inside it to logical: `text-left` →
   `text-start` (5619, 5675, 5702, 5738, 5776 — 5 sites, one per button type), `pl-2 pr-1` →
   `ps-2 pe-1` (submenu containers, 5643 and 5726), `border-l-[3px] ... pl-2 rounded-l-none` →
   `border-s-[3px] ... ps-2 rounded-s-none` (the active-sub-item accent bar, 5677 and 5740 — same
   fix, two identical sites), `pr-0.5` → `pe-0.5` (the `<nav>` scroll-gutter padding, 5594).

2. **The sidebar's own position on screen** — this is the actual "stuck on the left" bug reported,
   and it's structurally different from #1, don't conflate them. Two sub-cases:
   - **Mobile** (`fixed inset-y-0 left-0`, 5538, plus the `translate-x-0`/`-translate-x-full`
     slide toggle at 5539): `position: fixed` elements are positioned relative to the *viewport*,
     completely outside the grid — no amount of `dir` on the aside itself will move a `fixed`
     element with a physical `left-0`. Needs the logical `start-0` (Tailwind `inset-inline-start-0`
     via the `start-0` utility) instead, which resolves against the *aside's own* `direction` (set
     by #1's `dir` attribute) — and the slide-in transform needs to flip too: closed state should
     translate off-screen toward the *end* side in RTL, not always `-translate-x-full` (that's
     always "toward the left" regardless of direction; in RTL the sidebar visually sits on the
     right, so its closed state should push it further right, not left — check whether
     `rtl:translate-x-full` / `ltr:-translate-x-full` conditional variants or a `lang`-driven
     ternary is the cleaner way to express that in this codebase's existing Tailwind config).
   - **Desktop** (`md:sticky`, in-flow inside `grid-cols-[220px_1fr]`, 5530): sticky elements *do*
     stay in normal flow, so whether the 220px column visually ends up on the left or right depends
     on the **grid container's own `direction`**, not the aside's. The grid `<div>` (5530) is a
     level above where the "dir on the component's own root" convention normally applies — but
     nothing else currently sets direction anywhere above the aside, so on desktop the grid may
     currently render LTR-ordered regardless of `lang`. **Verify live**: at `md:` width and above,
     does the 220px column move to the right when Arabic is selected once `dir` is on the aside, or
     does the grid need its own `dir` too? Don't guess — check in the browser at both breakpoints
     before deciding where the fix actually needs to live.

**Not part of this brief:** the top navigation bar (branch dropdown, Profile button, hamburger —
starts at 5807) is separate chrome with its own scope; leave it for a follow-up if it turns out to
need the same treatment.

---

### Brief 30 — Public site: replace Brief 29's `cookies()` fix with a static-preserving inline script (completed 2026-08-23)

Landed in one commit (`b5e5988`), matching the spec closely: `layout.tsx` reverted to a plain
(non-`async`) component, `cookies()`/`next/headers` import removed, replaced with the exact
synchronous inline `<script>` pattern specified (as a hoisted `DIR_SCRIPT` constant rather than
inlined each render — a clean touch). `globals.css` got `html[dir="rtl"]` added **alongside**
`body.rtl` (kept, not removed) — matches the "don't assume globals.css is the only place, don't
remove without checking" instruction.

Independently re-verified: `tsc`/`eslint` clean, `vitest` unaffected (631 passing), production
build's route table shows `/`, `/about`, `/contact`, `/services`, `/profile`, `/blog` all back to
`○` (static) — confirmed directly, not just trusted the commit message. `/book` alone stays `ƒ`
(dynamic), but for a reason that has nothing to do with this fix: it independently reads
`searchParams` in its own page component, which forces dynamic rendering on its own regardless of
cookies — correctly, the commit message didn't claim `/book` as restored. Inspected the actual
prerendered `index.html` output directly (not just the build's summary table) and confirmed the
inline script is genuinely present in the static HTML, coexisting correctly with the
`metadata`-export-generated `<title>` in the same `<head>`.

See `DECISIONS.md` → **DEC-044**'s closing note — the interim dynamic-rendering tradeoff it
documented is now fully closed, no outstanding cost.

### Brief 30 body (original ask, for reference)

**Not a bug fix — Brief 29 already shipped and works.** This is a follow-up to remove its accepted
side effect: `layout.tsx` calling `cookies()` (`src/app/layout.tsx`) forces the entire public site
into per-request dynamic rendering. Confirmed in the build's route table:
`/`, `/about`, `/services`, `/contact`, `/book`, `/profile` all now show `ƒ` (dynamic) where they
were `○` (static) before Brief 29. See `DECISIONS.md` → **DEC-044** for the full reasoning on why
this was accepted short-term rather than blocking Brief 29 on this rewrite.

**The fix:** replace the server-side cookie read with a synchronous inline `<script>` — no `async`,
no `defer` — as the first element inside `<head>`, reading `document.cookie` directly (available
immediately, before any paint) and setting `document.documentElement.lang`/`dir` before the browser
renders anything. Same pattern `next-themes`-style libraries use to prevent a flash of the wrong
theme; here it prevents the flash of wrong text direction, without needing any server-side
per-request logic at all.

**Two files:**
1. `src/app/layout.tsx` — revert to a plain (non-`async`) component, no `cookies()` import, no
   `next/headers`. Add the inline script as the first child of a literal `<head>` element (Next.js
   App Router allows rendering `<head>` directly in the root layout). Something like:
   ```tsx
   <script dangerouslySetInnerHTML={{ __html: `
     (function() {
       try {
         var m = document.cookie.match(/(?:^|; )cr-language=([^;]*)/);
         var lang = (m && decodeURIComponent(m[1])) === 'ar' ? 'ar' : 'en';
         document.documentElement.lang = lang;
         document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
       } catch (e) {}
     })();
   `}} />
   ```
   `<html lang="en">` stays as the static server-rendered fallback (matches the fallback the client
   `getInitialLanguage()` already uses when no cookie exists) — the script corrects it before paint
   when a cookie is present.
2. `src/app/globals.css` — `body.rtl { direction: rtl; text-align: right; }` (currently ~line 100)
   depends on `document.body.className` being set, which the early head script can't safely do
   (`<body>` may not exist yet when a head script runs). Change the selector to key off the `dir`
   attribute on `<html>` instead — e.g. `html[dir="rtl"] { direction: rtl; text-align: right; }` (or
   `html[dir="rtl"] body { ... }` if keeping it body-scoped) — so it applies the moment the script
   sets `<html dir>`, without depending on body markup order at all. Keep the existing `.rtl`
   class-based rule too if anything else in the codebase still reads it — grep for `\.rtl\b` and
   `body\.rtl` across `src/` before removing anything, don't assume `globals.css` is the only place.

**`LanguageContext.tsx`'s existing cookie write (added in Brief 29) stays as-is** — the head script
reads the same `cr-language` cookie Brief 29 already writes; no change needed there.

**Verify:** production build route table shows `○` (static) again for all six routes listed above;
`tsc`/`eslint`/`vitest` clean; live check in the browser — hard refresh with Arabic selected should
show zero visible LTR flash, same as after Brief 29, but this time without the dynamic-rendering
cost. Confirm the `body.rtl` selector change didn't silently break anything else in globals.css that
depended on the class specifically (grep first, per above).

---

### Brief 29 — Public site: fix LTR flash on Arabic via server-side `<html dir>` (completed 2026-08-23)

Landed in one commit (`9420b1b`), exactly the fix path specified: `LanguageContext.tsx` now writes
a `cr-language` cookie alongside the existing `localStorage` write; `layout.tsx` became an `async`
Server Component that reads that cookie via `cookies()` and renders `<html lang dir>`/`<body
className>` from it, replacing the hardcoded `lang="en"`. Independently re-verified: `tsc`/`eslint`
clean, `vitest` unaffected (631 passing), production build succeeds.

**Real, disclosed architectural tradeoff — worth flagging to Mohamed, not a defect:** calling
`cookies()` inside `layout.tsx` opts the entire route into per-request dynamic rendering. Confirmed
directly in the build output: `/`, `/about`, `/services`, `/contact`, `/book`, and `/profile` all
now show `ƒ` (dynamic, server-rendered on demand) where they would previously have been `○`
(static, prerendered). This is inherent to any real fix for a per-visitor-cookie-driven `dir`
attribute — there is no way to vary static HTML per request without either dynamic rendering or a
more fragile middleware HTML rewrite — so this isn't a implementation shortcoming, it's the actual
cost of the fix. On Vercel this trades CDN-edge-cached static delivery for a server function
invocation on every public-page view. Given this is a clinic marketing site (not high-traffic
e-commerce), likely an acceptable tradeoff, but it's a real hosting-cost/performance change that
should be a conscious decision, not a silent side effect — flag for Mohamed to confirm/log in
`DECISIONS.md` if accepted.

**Not yet done:** the 4 hardcoded Arabic/English ternaries in `Navbar.tsx` (430, 459, 741, 767)
flagged as a low-priority cleanup nit — untouched, as expected (brief said don't block on it).

**Still not live-verified** — the dev environment's port 3000 conflict with an unrelated Docker
Chatwoot container was still present at review time; the CSS-mirroring reasoning (`flex-row` under
inherited `direction: rtl`) was independently re-confirmed by reading `globals.css` again but not
visually confirmed in a running browser.

### Brief 29 body (original ask, for reference)

**Scope: the public marketing site (`src/components/Navbar.tsx`, `src/contexts/LanguageContext.tsx`,
`src/app/layout.tsx`) — not the admin panel.** Mohamed reported the Navbar doesn't visually go RTL
when the site is set to Arabic. Investigated directly (couldn't get a live repro — the dev
environment's port 3000 is currently claimed by an unrelated Docker container, Chatwoot, not the
Next.js app — so this is grounded in reading the actual mechanism end to end, not a screenshot;
**reproduce this first**, per the note below, before assuming the diagnosis below is complete).

**Root cause, traced precisely:**
1. `src/app/layout.tsx:39-44` — `<html lang="en" ... suppressHydrationWarning>` is **hardcoded**,
   no `dir` attribute at all (defaults to `ltr`). `<body suppressHydrationWarning ...>` likewise has
   no server-rendered class.
2. `src/contexts/LanguageContext.tsx:24-32` — `getInitialLanguage()` explicitly returns `"en"`
   whenever `typeof window === "undefined"`, i.e. **every server render, unconditionally**, before
   ever checking the `?lang=` query param or the stored preference — both of which only exist
   client-side.
3. `src/contexts/LanguageContext.tsx:68-78` — `document.documentElement.dir` / `document.body.className`
   are set **only inside a `useEffect`**, i.e. only after the client mounts and this effect runs.
4. Persistence is `localStorage.setItem("cr-language", ...)` (line 73) — server-inaccessible by
   design, so there is no way for step 1 to know the visitor's language even in principle without a
   change.

**Consequence:** on every fresh load / hard refresh — even with `?lang=ar` in the URL, even with
`cr-language=ar` already in `localStorage` from a previous visit — the server always renders
English/LTR first. The whole page, Navbar included, is briefly LTR, then snaps to RTL once React
hydrates and the effect runs. The `suppressHydrationWarning` on both `<html>` and `<body>` exists
specifically to silence the console warning this mismatch would otherwise throw — a strong signal
this was a known, accepted tradeoff at the time, not an oversight introduced since. This is the
classic "flash of wrong direction" SSR anti-pattern, not a CSS bug.

**What's *not* the problem, checked and ruled out:** `body.rtl { direction: rtl; text-align: right;
}` (`globals.css:100-103`) is real and correctly wired — once `dir`/`className` actually get set,
`Navbar.tsx`'s three `flex-row` containers (`<nav>` line 138, desktop `<ul>` line 148, right-controls
`<div>` line 218) should mirror automatically, since CSS `flex-direction: row` is direction-relative
per spec — no `row-reverse` needed. Grepped `globals.css` for any rule that resets `direction` back
to `ltr` broadly: the only such rule (`direction: ltr !important`, line 347) is narrowly scoped to
`[dir="rtl"] a[href^="tel:"] / .phone-number / .ltr-num / .ltr-text / input[type=tel] / input[type=number]`
— phone numbers and numeric inputs staying LTR in RTL mode is intentional, not the bug. **Confirm
this live once the fix lands** — the reasoning holds on paper but was not visually verified.

**Fix — make the server aware of the language before first paint:**
1. In `LanguageContext.tsx`, alongside the existing `localStorage.setItem("cr-language", language)`
   (line 73), also write a cookie (`document.cookie = "cr-language=" + language + "; path=/;
   max-age=31536000"`) so the value is readable server-side too.
2. In `layout.tsx` (already a Server Component — no `"use client"` at the top, can call `cookies()`
   from `next/headers` directly), read that cookie and render `<html lang={lang} dir={dir}>`
   accordingly for the initial response, instead of the hardcoded `lang="en"`.
3. Keep `getInitialLanguage()`'s existing client-side logic as-is for the `?lang=` query-param
   override and first-ever-visit fallback (no cookie yet) — this is additive, not a replacement.
4. `src/middleware.ts` currently only matches `/api/:path*` (line 54) — this fix does **not** need
   middleware; `cookies()` in a Server Component is enough. Don't widen the middleware matcher for
   this.

**Minor, unrelated cleanup found alongside — low priority, don't block the main fix on it:**
`Navbar.tsx` has 4 hardcoded Arabic/English ternaries instead of going through `t.nav` like every
other label in the file: `isRTL ? "إكمال الملف" : "Complete Profile"` (430), `isRTL ? "خروج" :
"Logout"` (459), `isRTL ? "إكمال الملف الشخصي" : "Complete Profile"` (741), `isRTL ? "تسجيل الخروج" :
"Logout"` (767). `t.nav.logout` already exists in both languages (`src/lib/translations.ts:14`,
`:379`-adjacent) and could directly replace 459/767 (note: 459 and 767 use *different* Arabic
phrasing for "Logout" at desktop vs. mobile — check `t.nav.logout`'s exact Arabic wording matches
the intended UX before swapping either in). `completeProfile` has no existing key in either `nav`
namespace — would need adding to `src/lib/translations.ts` if fixed. This is a chrome-string
consistency nit, not a functional bug — output is already correct in both languages, just bypasses
the shared translation object.

---

### Brief 28 — Reception scope completion: translate `ReceptionDashboardView` + `UserProfileView` (completed 2026-08-23)

Landed in one commit (`46b8b45`). Independently re-verified: `tsc`/`eslint`/`vitest` clean (631
passing, 11 expected fail), en/ar key parity for both new namespaces (`reception.dashboard`,
`userProfile`) confirmed by evaluating `adminTranslations` at runtime. All 3 real findings from the
brief were correctly handled: alert `title` resolved client-side via a `type`→label map (API's raw
title discarded, `message` correctly left untranslated with the limitation not silently dropped);
the 5 geolocation error strings converted to error-code state resolved at render time via
`t.errors[code]`, not set-time; the `attendanceStatus`/option-dropdown/`toLocaleTimeString`
value-label and locale-pinning fixes in Part B all landed exactly as specified, including both
`isDoctorView` label variants. `navItems` dead code correctly left untouched per instruction.

**Two small gaps found on review, both fixed directly (not sent back — Windsurf had already moved
on, and both were mechanical):** one of the 5 flagged physical-direction classes (`pr-1` in the
all-alerts modal, line 864) was missed — converted to `pe-1`. `DoctorAccountView.tsx` imported
`adminTranslations` directly for `UserProfileView`'s `t` prop with an `as any` cast, instead of
building the shape from `doctorTranslations` as the brief specified — functionally correct (the
shared `userProfile` object already carries both `isDoctorView` label variants) but the exact
cross-system coupling + type-safety bypass the brief said to avoid. Rather than duplicating ~80
already-shared strings into `doctorTranslations` for no practical gain, kept the `adminTranslations`
reuse (the content is genuinely language-neutral, not admin-specific) but replaced `as any` with a
proper cast against `UserProfileView`'s own exported `UserProfileViewTranslations` interface, so a
future shape drift between the two fails typecheck instead of silently passing.

### Brief 28 body (original ask, for reference)

**Both screens are already their own components — no extraction needed, translation only.** Both
are reachable by Reception today: `ReceptionDashboardView` is Reception's own landing screen
(`activeNav === "Dashboard"`, `page.tsx:7248`); `UserProfileView` is reached via the "Profile"
button in the top header (`page.tsx:5817–5824`) — that button is **unconditional, not gated by
`permittedSidebarItems`/role at all**, so every logged-in user including Reception sees and can
click it. Both are squarely inside the existing "Reception-first" DEC-043 scope even though
neither was named in the original scope list — confirm the finding, not a new scope decision.

### Part A — `ReceptionDashboardView.tsx` (`src/components/admin/reception/ReceptionDashboardView.tsx`, 931 lines)

Add `lang: "en" | "ar"` and a `t` prop (typed off a new `adminTranslations[...].reception.dashboard`
namespace) to the props interface (currently 6 props, none language-related — line 35–43). Wire
from the single call site, `page.tsx:7248`. Add `dir={lang === "ar" ? "rtl" : "ltr"}` to the root
`<div className="space-y-4 pb-8">` (line 302), same pattern as every other translated screen in
this series.

**~55–65 chrome strings** across 6 sections + 2 modals: Today's Shift card (311–380), Notifications
& Alerts (395–488), Bookings overview incl. 5 metric labels + 5 table headers (499–636),
Today's Summary (649–691), Recent Activities (702–736), the Start-Shift popup modal (740–798), and
the All-Alerts modal incl. 4 filter-pill labels (800–928).

**Value/label separation is already correctly shaped — translate labels only, values untouched:**
`alert.type` (`low_stock`/`expired_item`/`maintenance_due`/`maintenance_overdue`/
`maintenance_completed`, compared at 427–431 and 853–857), `row.status` (`confirmed`/`checked_in`/
`completed`/`cancelled`/`rejected`, compared at 549, 559, 569, 597), and `shiftInfo.status`
(`started`/`ended`/`not_started`, compared at 322, 363, 378, 687) are all canonical and only drive
badge color/icon selection or a separately-hardcoded label string — normal label-only translation,
no bug to fix.

**Real finding — alert `title`/`message` are generated server-side, not in this component.**
`GET /api/reception/dashboard` (`src/app/api/reception/dashboard/route.ts:218–297`) hardcodes
`title: "Low Stock"`, `"Expired Item"`, `"Maintenance Overdue"`, `"Maintenance Due"`,
`"Maintenance Completed"`, and builds `message` server-side with interpolated English fragments
(`` `${p.name} – Only ${stock} ${p.unit || "units"} remaining` ``, etc.) — no `lang` param, no
alternate-language branch. Translating this component alone will **not** localize alert content.
**Do this:** map `alert.type` client-side to `t.alerts[type].title` and discard the API's raw
`title` string (the enum is already clean, same shape as the status/type maps above). **Do not**
attempt to translate `message` — it embeds dynamic data assembled server-side and doing it properly
needs an API change (a `lang` param + translated templates), which is out of scope for this brief.
Leave `message` in English and note this as a known, deliberate limitation in the PR — do not
silently drop the field or half-translate it.

**Real finding — 5 hardcoded location/geolocation error strings are set into state, not looked up
at render time.** `handleStartShiftWithLocation` (144–205) and its error branches set
`locationError` directly to hardcoded English sentences (148, 181, 183, 185, 190, 198, 200 — note
197–201 sets the identical string on both `PERMISSION_DENIED` and the `else` branch, so it's really
one message covering two paths). **Store an error code in state instead** (e.g.
`"permission_denied" | "out_of_location" | "generic"`), resolve to `t.errors[code]` **at render**,
not at set-time — the same shape fix as this project's recurring value/label bug class, just with
state instead of a prop.

**5 physical-direction Tailwind classes to convert to logical** (the layout will mis-mirror in RTL
otherwise): `ml-4` → `ms-4` (479, 898), `text-left` → `text-start` (578, 760), `pr-1` → `pe-1` (848).

**Leave untouched:** `toLocaleTimeString("en-US", {...})` at line 284 — already correctly pinned,
matches project convention. **Flag, don't translate or delete:** the `navItems` array (line
251–260) is declared but never rendered anywhere in this file — dead code, out of scope here.

### Part B — `UserProfileView.tsx` (`src/components/admin/UserProfileView.tsx`, 1,145 lines)

**Shared between two unrelated translation systems — read this before touching the props
interface.** Exactly 2 call sites: `page.tsx:6530` (admin/Reception's own Profile screen,
`isDoctorView` defaults false, would use `adminTranslations`) and `DoctorAccountView.tsx:1188`
(Doctor Portal's profile tab, `isDoctorView={true}`, uses the separate `doctorTranslations`
system). **Do not import `adminTranslations` into this file and type its `t` prop off it** — that
either breaks the Doctor Portal call site's typing or forces it to import an unrelated module.
Instead define a local interface in this file (e.g. `UserProfileViewTranslations`) listing exactly
the keys the component renders, and have each caller build/pass that shape from its own source:
`page.tsx` from `adminTranslations[lang].profile...`, `DoctorAccountView.tsx` from
`doctorTranslations[lang]...`. Add `lang`/`t` to the props interface (56–63) and `dir={lang === "ar"
? "rtl" : "ltr"}` to the root.

**`isDoctorView`-conditional labels need both variants in the shared interface, not one generic
key** — found so far: `displayRole`/`displayEmployeeId`/`displayDepartment` fallbacks (150, 151,
155), `"Doctor Payroll Summary"` vs `"Payroll Summary"` (864), `"Commissions & Bonuses"` vs
`"Bonuses"` (889). **Grep for more `isDoctorView ?` sites before starting** — this list is from a
partial read, not exhaustive.

**Real finding, same value/label bug class as `emp.shift` in Brief 23:** line 1122 renders raw
`{log.status}` directly — the attendance table's status badge (1118–1122) already switches color
correctly on the canonical value (`"Present"`/`"Late"`/`"Overtime"`/else) but then prints that same
raw English value as the visible label. Needs a `t.attendanceStatus[log.status]`-style lookup with
a safe fallback, same shape as `t.profile.shiftLabel()` from Brief 23.

**Real finding — two `<option>` dropdowns use the English label as the stored value.**
`attendancePeriod`/`payrollPeriod` filters (788–790, 874–876): `<option value="This Month">This
Month</option>`, `"Last Month"`, `"This Year"` — six sites total, values and labels identical
strings. **Keep `value=` exactly as-is** (canonical, compared elsewhere against these exact
strings) and translate only the visible option text — do not translate the `value` attribute.

**Real finding — `toLocaleTimeString` at lines 313–314 is unpinned** (`new Date(...).
toLocaleTimeString([], {...})` — empty locale array means "browser default", not a fixed locale).
Every other `toLocale*` call in this file (885, 890, 895, 902, 908, 920, all `.toLocaleString()`
for EGP amounts) is already implicitly using the default too, but these two explicitly pass `[]`,
which reads as intentional and is exactly the unpinned-locale risk this project's `toLocale*` audit
convention checks for in every brief. **Pin both to `"en-US"`**, matching the rest of the file and
every other screen's convention — do this as part of this brief regardless of translation, it's not
an i18n change, it's closing the same class of bug already fixed elsewhere.

**1 physical-direction class:** `text-center sm:text-left` (558) → `sm:text-start`.

**No test required** — same as every other Phase-2-only translation brief in this series (Briefs 6,
12, 13, 14, 18, 19, 23, 24, 25 Part 2). Manual test checklist still required per CLAUDE.md, covering
both screens and both `isDoctorView` states for Part B.

---

### Brief 27 — Pages Settings: extract in 3 ordered sub-PRs (completed 2026-08-23)

Landed as 3 separate commits, smallest-first as specified: `29defa7` (Services →
`ServicesPageSettingsView`), `9fa5954` (Home → `HomePageSettingsView`), `bb26f3c` (About Us →
`AboutUsPageSettingsView`). Independently re-verified: `tsc`/`eslint`/`vitest` clean (625/12,
unchanged), zero `useState` in any of the 3 new files (all state genuinely stayed lifted in
`page.tsx`, nothing forked), `savePageSettings`/`handleAutoTranslate` shared via props exactly as
required, all 21 hardcoded `dir=` content-direction hints present and untouched (12 in Services + 9
in About Us, 0 in Home — correct, Home has none), `pageSettingsLangTab` confirmed never conflated
with admin `lang` (zero references to `lang` in any of the 3 new files), `translations.ts` and
`RISKS.md` both untouched (correct — translation deferred, no new defects introduced).

**One process deviation, not blocking:** the brief explicitly said the mojibake'd `➜` (`âž"`) in the
Hero Slider's 4 per-slide translate buttons should be confirmed via `git log -S` and *not* fixed
inside this extraction PR. `HomePageSettingsView.tsx` ships with the correct `→` character instead
— the mojibake was silently fixed during extraction, undocumented in the commit message. The fix
itself is harmless (a real display bug, now gone), but the brief's explicit "don't fix it here,
track it separately" instruction wasn't followed. Noting for the record; no revert needed.

Same pattern as Brief 26: the `usePageSettings`/`useBranchState` hooks the brief suggested were
never wired in — all 3 components stayed purely presentational (props only), which satisfies the
actual no-duplication goal without the suggested mechanism. Both hook files remain unused in the
tree.

### Brief 26 — the 7 small Settings screens: extract, then translate, then test (completed 2026-08-23)

Landed as one combined commit (`76106a5`, extraction + translation + Part 3 test — not the
3-separate-commits shape the brief asked for, but each part independently verifiable within it).
Independently re-verified: `tsc`/`eslint`/`vitest` clean (625 passing, 12 expected fail), en/ar key
parity for `settingsScreens` confirmed by evaluating `adminTranslations` at runtime, the Part 3
shallow-merge test genuinely grounded (ran it — `it.fails` fails for the documented reason, a
companion `it` proves the shallow merge is fine at the top level, confirming the mechanism), the
four state clusters and both cross-component couplings (`handleSaveBookingSettings`/
`TermsManagerView`, `handleSaveDepartments`/Role Management) preserved exactly as required, and
value/label separation (Branches `status`, numeric `<select>`s) all correct. RISK-071/072/073
correctly written and slotted into the reorganized RISKS.md structure.

**One gap found on first review, not accepted at the time: none of the 7 components set `dir` on
their own root** — `lang` was threaded through as a prop but never read by 5 of 7 (confirmed by
ESLint's `no-unused-vars`), and the other 2 only used it for bilingual content selection, never
direction. Every prior translated screen in this series (Role Management, Employees, HR) sets
`dir={lang === "ar" ? "rtl" : "ltr"}` on its own root; these seven were the first to skip it —
Arabic text would render but the layout (flex ordering, grid columns, Deposit's indent rail) stayed
LTR-pinned. **Fixed directly (commit `f189d01`) rather than sent back to Windsurf**, since Windsurf
had already moved on to Brief 27 and the fix was a mechanical one-line-per-file addition (plus
swapping Deposit's physical `pl-3 border-l-2` to logical `ps-3 border-s-2`) — re-verified clean
after the fix (`tsc`/`eslint` both 0 errors/warnings on the touched lines).

`usePageSettings.ts`/`useBranchState.ts` were built per the brief's suggested shared-hook mechanism
but never wired in — the 7 components ended up purely presentational instead (zero `fetch()` calls
of their own), which satisfies the brief's actual concern (no duplicated load/save logic) even
though not via the suggested mechanism. Two files sit unused in the tree as a result; not blocking,
worth a cleanup pass later.

### Brief 1 — Reception ↔ Doctor workflow defects (completed 2026-08-16)
Nine tasks covering RISK-038 (session total silently discarded — no `price` column),
RISK-039 (fabricated payment status / doctor / room), RISK-040 (orphaned & duplicate public
bookings), RISK-041 (admin booking captured no payment; unreachable fallback insert reported
success), RISK-045 (prescription save reported success on failure), RISK-047 (hardcoded doctor and
discarded requested time on approve), RISK-048 (ungated pulse counter, missing out-of-stock).

Review outcome: five defects found in the delivered work and fixed separately — a nullable column
coerced to 0 (reintroducing the "Paid" bug in narrower form), a React stale-closure read after the
setter that populates it, one numbered sub-point silently skipped, cache invalidation applied to 2
of ~20 call sites, and a PATCH payload missing fields the user can still change.


### Brief 2 — Wallet ledger & API authorization (completed 2026-08-16/17)
RISK-042: `wallet_txns` was never written by anything; POS wallet payments never deducted the
balance; package sales never updated `spent_amount` and hardcoded `payments.method` to `'cash'`.
Fixed via a shared `src/lib/wallet.ts` helper used at all four wallet write sites.
RISK-036: twelve routes with no server-side authorization, guarded **per method** so the public
site's unauthenticated reads keep working.

Review outcome: implementation was correct in every detail checked. One documentation error
(a claim that a defect was unfixed when it had been fixed) and one unrequested file deletion,
both corrected.

**What both briefs missed, and why the Phase 0 net exists:** neither review caught that
`GET /api/reservations` had no auth at all (RISK-049), or that Brief 1's public-booking PATCH calls
were being silently rejected with 401 by a pre-existing gate, meaning the bug they fixed was never
actually fixed (RISK-050). Both were found later by direct re-examination. Code review and a green
build did not surface either one — tests would have.

### Brief 3 — Phase 0: test infrastructure & regression net (completed 2026-08-17)
Installed Vitest, wired `npm run test` into `check`. 107 tests across 8 files: pure-logic coverage
for `billing.ts`, `customerIdentity.ts`, `packages.ts`, `ledger.ts`, `services.ts`,
`customerBalances.ts`; a named regression suite for RISK-012/043/049/DEC-023; and route-level auth
tests that import the real `GET`/`POST` handlers with `supabaseServer` mocked at the module boundary.
Deferred (logic not exported as pure functions, needs Phase 1 extraction): RISK-038…048, 050.

Review outcome: matched the report in every number checked — 107 tests, 0 type errors, no
application code touched. Went further than the brief's own "invert and confirm" requirement for
the one test that matters most: temporarily reverted the actual RISK-049 fix in
`src/app/api/reservations/route.ts` to its pre-fix, fully-open state and confirmed
`tests/routes/auth.test.ts` catches it — the same route a real PII leak reached production through,
now with a test that would have caught it the first time.

### Brief 4 — Phase 1 pattern-proving PR: extract Clinic Profile Settings (completed 2026-08-17)
Extracted `activeNav === "Clinic Profile"` from `admin/page.tsx` (8 `useState` calls,
`handleSaveClinicProfile`, ~90 lines of JSX) into
`src/components/admin/settings/ClinicProfileSettingsView.tsx`, taking one prop
(`authenticatedJsonHeaders`), per DEC-027/DEC-043. Moved verbatim — no behaviour change. Confirmed
RISK-058 (fields never hydrate from saved data) and RISK-001 (hardcoded Revera defaults) both left
untouched as required, both already logged separately.

Review outcome: matched the report in every number checked — diff is 2 insertions/117 deletions on
`page.tsx` (a pure structural move), `tsc --noEmit` 0 errors, `eslint` 0 errors (133 pre-existing
warnings, unchanged), `vitest run` 107/107 passing, all independently re-run rather than trusted
from the report. Proves the mechanical extract-and-test loop works — Phase 1 moves on to the
Reception wave next.

### Brief 5 — Phase 1, Reception wave: extract Patients in 4 ordered sub-PRs (completed 2026-08-17)
Scoping this brief found DEC-043's Reception wave was already 2/4 done before it was written —
`New Booking` and `Bookings` were both already extracted (`AdminNewBookingView.tsx`,
`AdminBookingsView.tsx`), and `activeNav === "Point of Sale"` turned out to be dead mock UI (hard
coded `MOCK_PRODUCTS`, no persistence, "Complete Payment" is just an `alert()`) — not the real POS,
which is the `product_sales`-backed "Sell Product" flow embedded inside Patients. Flagged as a
separate open product question, out of scope here.

That left Patients (~2,041 lines) as the entire remaining scope, mapped into 5 mutually-exclusive
regions and split into 4 ordered sub-PRs (smallest/most self-contained first), each its own commit:
Medical Report Modal (`MedicalReportModal.tsx`, ~88 lines), Medical Form/Intake Modal
(`MedicalFormModal.tsx`, ~239 lines), Customer Create/Edit Form (`CustomerFormModal.tsx`, 20 state
vars + save handler + 2 open handlers), Patients Directory/List Table
(`PatientsDirectoryView.tsx`, presentational, all shared state via props). Sub-PR 5 (the ~1,280-line
Customer Profile Drawer, which owns `viewingCustomerProfile` — 82 references file-wide) was
deliberately left out, needing its own investigation-then-brief cycle rather than the same template.

Review outcome: all 4 sub-PRs independently re-verified against the actual repo, not trusted from
the report — `tsc --noEmit` 0 errors, `eslint` 0 errors (137 warnings, consistent with pre-existing
patterns), `vitest run` 107/107 passing on the final combined state, all 4 component files present,
`admin/page.tsx` down from 27,733 to 26,763 lines. One process note: commits for Sub-PR 2 and 3
ended up commingled with an unrelated parallel workstream's changes (DEC-042's `reservation_products`
migration + API wiring, being built in the same working tree at the same time) — content in both was
correct and independently verified, but commit-message attribution for those two is not clean. Not
rewritten — pushed as-is per explicit direction, given the risk of rewriting history while a second
process might still be committing to the same branch.

### Brief 6 — Phase 2 setup + pattern-proving translation: MedicalReportModal (completed 2026-08-17)
Scoping this brief found two things worth correcting before it started: `DoctorAccountView`'s `lang`
state (the plan's own cited reference pattern) has no `localStorage` persistence at all, despite the
plan's own 2.2 calling for it — added as a deliberate improvement, not copied as-is. Separately,
`admin/page.tsx` already had a dead `lang` state (`useState<"EN"|"AR">("EN")`, never read, `setLang`
never called) — same shape of gap as `attachedProducts` (DEC-042), scaffolding declared and
abandoned. Replaced it rather than adding a second one, with lowercase `en`/`ar` matching Doctor
Portal and the public `LanguageContext`'s convention.

Delivered: admin-local `lang` state with `localStorage` persistence (`revera_admin_lang`), a
language toggle in the sidebar visually matching `DoctorSidebar`'s existing one, new
`src/components/admin/translations.ts` (`adminTranslations`, namespaced `patients.*`), and
`MedicalReportModal.tsx` fully translated — all 15 hardcoded strings (enumerated by reading the file
directly, not guessed) replaced with `t.*` lookups, `dir` attribute added, RTL audited (no
direction-sensitive Tailwind classes present).

Review outcome: matched the report in every number and file checked — diff touched exactly the 3
expected files, `tsc --noEmit` 0 errors, `eslint` 0 errors (131 warnings, pre-existing patterns),
`vitest run` 107/107 passing, `grep '>[A-Z]'` on the translated file returns 0 matches, all
independently re-run against the actual repo rather than trusted from the report. Proves the
translation mechanism end-to-end — next 3 Brief 5 components repeat Part B only, Part A's setup
doesn't need redoing.

### Briefs 7-9 — Phase 2 Reception translations: MedicalFormModal, CustomerFormModal,
PatientsDirectoryView (completed 2026-08-17)

Translated the remaining 3 Brief-5-extracted Patients components into Arabic, repeating Brief 6's
Part B pattern: `MedicalFormModal.tsx` (skin-type/concern value-label separation via
`t.skinTypes[...]`/`t.concerns[...]` lookups, stored values kept English), `CustomerFormModal.tsx`
(~40 strings, Gender dropdown, 8-option Referral Source dropdown), `PatientsDirectoryView.tsx`
(purely presentational, first component in the rollout with real RTL-sensitive Tailwind).

**Reported complete, independent re-verification found 3 gaps — the same failure shape DEC-043's
own "Correction to the plan's own framing" section had already flagged once (Doctor Portal:
extracted but not actually translated).** This is the second occurrence of that pattern:
1. Brief 8's Gender-dropdown fix was skipped — `<option value="Male">Male / ذكر</option>` (the
   pre-existing cramped-bilingual hack the brief explicitly said to fix) was left unchanged.
2. Value/label separation was never added for Brief 7's skin-type/concern buttons or Brief 8's
   referral-source options — raw English `.map()`-ed directly into the button/option label instead
   of going through a lookup object. Stored values were correctly still English (no data-shape
   regression) — only the display layer was wrong.
3. Brief 9's flagged RTL items (`left-3.5`/`pl-10 pr-4` on the search bar, `text-left` on table
   headers and both dropdown menus) were all still present, untouched, despite the brief calling
   this out explicitly as needing browser confirmation.

Review outcome: all 3 gaps closed in a follow-up pass. Two same-pattern items were also found and
fixed in the same pass, beyond the original 3: `MedicalFormModal.tsx`'s scrollable-content padding
(`pr-1` → `pe-1`, logical property) and `PatientsDirectoryView.tsx`'s filter-panel Gender/Status/
Referral `<option>` labels (translation keys already existed in `translations.ts` — added when the
gaps report was written — but were never wired into the JSX until this pass). `tsc --noEmit` 0
errors, `vitest run` 107/107 passing, all independently re-run against the actual repo. Manual test
checklist: `ai_docs/manual_tests/ADMIN_I18N_BRIEFS_7_9_GAPS_MANUAL_TESTS.md`. **Note for whoever
writes Brief 11+:** this is now the second time "extracted and reported translated" turned out to
mean "extracted, and the report overstated how much was actually translated" — treat completion
reports on this rollout with the same skepticism DEC-043 already recommended for the Doctor Portal.

### Brief 10 — Sub-PR 5: move `viewingCustomerProfile` state out of `admin/page.tsx` (completed 2026-08-19)

Moved `viewingCustomerProfile`/`setViewingCustomerProfile` and its ~15 supporting effects/handlers
(prescriptions, medical records, product balances, package sell/redeem, add-product, print) into a
new `src/components/admin/patients/useCustomerProfile.ts` hook, confirming Brief 5's own
investigation note that this state is not actually cross-section shared. `admin/page.tsx` down by
625 lines; the 5-tab, ~1,280-line Profile Drawer JSX itself stays in `page.tsx` as scoped —
deliberately not touched, that's Brief 11.

Review outcome: mechanical extraction dropped one line versus the original —
`setEditingPrescription(null)` in the drawer-close cleanup effect was missing, found by diffing the
moved block against the original line-for-line rather than trusting the report's "no behaviour
changes" claim. Not independently exploitable (`handleStartCreatePrescription`/
`handleStartEditPrescription` both reset the value before it's ever read in a save), but restored
before commit to match the brief's own requirement exactly. Browser-verified live per the brief's
"highest-PII-risk move" note: opened a patient, started an unsaved prescription draft with a
distinctive marker string, navigated to a different patient without saving, confirmed the draft did
not leak into the new patient's form (diagnosis field empty, name field correctly scoped to the new
patient). All 5 Profile Drawer tabs (Personal Info, Booking History, Prescriptions & Records,
Purchased Products & Cart, Purchased Packages) confirmed loading real data in the browser, not just
`tsc`. `tsc --noEmit` 0 errors, `eslint` 0 new errors (one pre-existing-pattern warning in the new
hook file — missing `authenticatedJsonHeaders` dep, same shape as the original, not introduced by
this move). The 5 vitest failures present in the working tree at commit time are unrelated —
Reception-dashboard/doctor-payroll test files from a separate, already-in-progress workstream that
predates this brief; confirmed via grep that none reference `viewingCustomerProfile` or
`useCustomerProfile`.

### Brief 11 — Sub-PR 5 Part 2: extract Customer Profile Drawer JSX out of `admin/page.tsx` (completed 2026-08-19)

Moved the ~1,300-line drawer block (5 tabs, 3 inline modals: log usage, add product, sell package)
out of `admin/page.tsx` into `src/components/admin/patients/CustomerProfileDrawer.tsx`, receiving
Brief 10's hook output as props rather than re-calling `useCustomerProfile()` — `page.tsx` keeps its
one call for the two `activeNav`-dependent effects Brief 10 left there. No translation in this
brief, per the extract-then-translate split; that's Brief 12.

Review outcome: structurally correct — `tsc --noEmit` 0 errors, all 5 tabs and all 3 nested modals
independently browser-verified loading real patient data and opening correctly (log usage modal
verified by code read only, since it needs a patient with an existing product balance to trigger and
none was on hand; the other 4 tabs + 2 modals were exercised live). **Report explicitly admitted
browser verification was skipped** ("Playwright MCP server crashed mid-session, from killing all
node processes") and asked for manual verification instead of doing it — done independently rather
than accepted as-is. Side note: killing "all node processes" also killed an unrelated project's dev
server that happened to be running on the same port; not this repo's process to kill, worth knowing
for next time.

Found one real ESLint **error** (not a warning) in the new file — `react-hooks/purity` flagging a
`Date.now()` call during render in the Purchase History date column. Traced via `git log -S` to a
commit predating this whole Windsurf-briefs effort — pre-existing, not introduced by this
extraction. The reason it surfaced now: `page.tsx` at 25k+ lines was too large for the React
Compiler's purity checker to analyze (confirmed — 0 errors on the pre-extraction file despite the
identical line existing in it), so it silently never fired there; the newly-isolated, reasonably-
sized component is analyzable and caught it. Fixed to match the codebase's existing "never
fabricate, show em-dash" convention (RISK-039) instead of reading the render-time clock as a
fallback — browser-verified the empty-state path still renders correctly. `vitest run`: 597 passed,
6 expected fail, 0 unexpected (matches the report's number, independently re-run).


### Brief 12 — Phase 2: translate `CustomerProfileDrawer.tsx` to Arabic (completed 2026-08-19)

Translated the 1,539-line Profile Drawer (5 tabs + 3 inline modals) via a new
`patients.customerProfileDrawer` namespace in `translations.ts`. All 18 RTL-sensitive Tailwind
classes converted to logical properties exactly as scoped (`text-right`×10 → `text-end`,
`text-left`×5 → `text-start`, `right-1`×2 → `end-1`, `ml-2` → `ms-2`); all 7 placeholders
translated; `dir` applied on the component root only. Reused the existing
`medicalFormModal` skinTypes/concerns lookups rather than duplicating them.

Review outcome: the translation itself held up under checks that caught real gaps in Briefs 7-9 —
`grep '>[A-Z][a-z]'` returns 0, en/ar key parity is exact (345 keys each, verified by script, no
one-sided keys rendering `undefined`), every `toLocale*` call left on `en-GB`/`en-US` per DEC-043
(confirmed by diffing the commit: only surrounding copy changed, never a locale argument), and
value/label separation is correct throughout — payment methods keep `value="cash"` with Arabic
labels, reservation status goes through a lookup with the raw value still passed to
`getStatusBadgeClass()`, and stored skin-type/status values are unchanged.

**Two gaps found and closed.** (1) The package-history status badge still rendered
`String(pkg.status).replace("_"," ")` — the raw DB value — so an expired/used-up package showed
English text on an otherwise fully Arabic screen. The brief's own `>[A-Z][a-z]` scope grep could
not see it because it is an interpolated expression, not literal JSX text; this is precisely the
"the grep count is a floor, not a total — enumerate by reading" caveat the brief wrote in advance.
Fixed with the same lookup-plus-fallback shape already used for reservation status, so an
unrecognised status degrades to the old rendering instead of blank. Not exercisable in the browser
(needs a patient holding a non-`active` package; none available) — flagged as Pending in the
checklist rather than claimed as verified. (2) The manual test checklist required by the brief's
exit criteria and by CLAUDE.md was not written; written now as
`ai_docs/manual_tests/BRIEF_12_PROFILE_DRAWER_I18N_MANUAL_TESTS.md`.

Browser-verified independently in both languages: all 5 tabs and the Add Product / Sell Package
modals render fully Arabic, booking status shows `مكتمل` while the record keeps `completed`,
dates/money stay Western (`18 Aug 2026`, `2360 EGP`), and English mode reverts cleanly. `tsc` 0
errors, `eslint` 0 errors, `vitest` 597 passed / 6 expected fail (baseline unchanged).

**Process note:** Windsurf began Brief 13 in the same working tree while this verification was
running, so its in-progress `bookings.adminBookingsView` keys were already sitting uncommitted in
`translations.ts` — the same file this fix touches. Rather than repeat Brief 5's commit
commingling, only this change's own hunks were staged (built against `HEAD` and staged via
`update-index`), leaving Brief 13's work untouched in the working tree for its own commit.

### Brief 13 — Phase 2: translate `AdminBookingsView.tsx` to Arabic (completed 2026-08-19)

Added `lang`/`t` props (this component had none before), a `bookings.adminBookingsView` namespace —
the first top-level namespace beyond `patients` — and wired it through `admin/page.tsx`'s single
render site (there is only one; the brief's own note about "a second render site around ~21804"
was a mistake made while writing the brief, mixing this component up with `AdminNewBookingView`,
which genuinely does render twice — corrected here, not a gap in the delivered work).

Review outcome: this was the highest value/label-separation risk in the rollout so far — the exact
component RISK-054 broke once already — and it held up. `getStatusConfig()`/`getPaymentStyle()`
switch on the raw canonical status/payment value and return only the translated label; every
comparison and both `supabase.update({ status: ... })` call sites are untouched English literals,
confirmed by grep rather than assumed. All 15 `toLocale*` calls left on `en-GB`/`en-US`. Sweep for
remaining hardcoded strings/RTL classes: 0/0. en/ar key parity: 345/345 against the commit as
authored. `tsc`/`eslint` clean, `vitest` 597 passed unchanged. Browser-verified live in both
languages via a full page-text dump — every card, table header, legend label (all 8 statuses), and
the one live row's badges (`مؤكد`/`مدفوع جزئياً`) translated correctly while `Wednesday, 19 August
2026` and `09:00 AM` stayed English; English mode reverts cleanly. The report's own manual test
checklist was accurate and well-scoped — given a dated independent-evidence table rather than
rewritten.

**Process note, not a content defect:** the work arrived committed as part of a single ~2,550-line
commit that also swept in an entirely separate, already-in-progress test-coverage workstream
(Finance/doctor component tests, `fetchFake` helpers, `vitest.config.ts`, package dependency
changes, `.claude/launch.json`) — the same commingling pattern as Brief 5, at larger scale. Not yet
pushed at the time this was found, so safely un-commingled locally: soft-reset, then staged only
this brief's 4 actual files. `translations.ts` needed extra care since Brief 14 was being written
concurrently in the same file — extracted just the `adminBookingsView` block via brace-depth-aware
parsing (a naive string-anchor insertion attempt first landed the block outside the `en`/`ar`
objects entirely, caught by `tsc` before it was staged) and staged that exact blob through git
plumbing, leaving Brief 14's in-progress `adminNewBookingView` additions untouched in the working
tree.

### Brief 14 — Phase 2: translate `AdminNewBookingView.tsx` to Arabic (completed 2026-08-19)

Added `lang`/`t` props, extended the `bookings` namespace with `adminNewBookingView`, wired both
of `page.tsx`'s render sites (this component genuinely does render twice, unlike Bookings). Also
fixed a pre-existing bilingual-hack pattern in the Session Type radio cards (same shape as the
Gender-dropdown issue Briefs 7-8 found) — now clean single labels per language instead of
"In Person / في العيادة"-style concatenation.

Review outcome: `grep '>[A-Z][a-z]'` and RTL-sensitive-class sweeps both 0; 6 of 7 placeholders
translated via `tr.*`, the 7th (`placeholder="0"` on the Amount Paid Now field) correctly left as a
literal digit, not copy, per DEC-043. All 3 `toLocale*` calls confirmed untouched by diffing the
commit. Session type (`in_person`/`online`) and every DB id in the booking payload confirmed still
canonical English. No service names duplicated into `translations.ts` — pulled from the DB's own
`en`/`ar` columns as the brief required. en/ar key parity 410/410 across the whole file. `tsc`/
`eslint` clean (0 errors), `vitest` 597/603 unchanged. Browser-verified live in both languages:
opened New Booking from the Bookings-tab entry point, full form (patient info, appointment details,
session type, notes, amount) renders fully Arabic with Arabic service names pulled correctly from
the DB, English reverts cleanly. The report's manual test checklist was thorough and accurate,
matching the actual wiring exactly (correctly notes 2 render sites, not 1).

**Process note, same pattern as Briefs 13/14 before it:** landed in another oversized commit
(~2,900 lines) sweeping in the same unrelated test-coverage workstream. This one was **already
pushed to `origin/dev`** by the time it was found — could not be safely un-commingled without a
force-push to shared history, which was not done. Content verified correct independently of the
commit hygiene issue. This is now the **third** time in a row a brief's commit has swept in
unrelated content; worth raising as a process question rather than continuing to silently absorb it
each time.

### Brief 15 — Phase 1: extract `Doctors` from `admin/page.tsx` (completed 2026-08-19)

Split into the 4 ordered sub-PRs exactly as scoped: `DoctorAuditLogsModal.tsx` (independent, moved
first), `useProviderForm.ts` (the ~31 shared `providerForm*` fields plus the dead Attendance
plumbing — confirmed moved **verbatim**, not dropped or "finished"), `ProviderFormModal.tsx`, and
`AdminDoctorsView.tsx`. `useProviderForm()` is called exactly once in `page.tsx` and passed as a
single prop to both consumers — no double-hook-call trap. `DoctorServiceCommissionEditor` still
imported from its one canonical location by all three call sites (page.tsx's remaining Services
block, `AdminDoctorsView`, `ProviderFormModal`) — not duplicated.

Review outcome: `tsc`/`eslint` clean (0 errors) across all 4 new files plus `page.tsx`, `vitest`
597/603 unchanged. Browser-verified live: doctors list renders with real data; Audit Logs modal
opens with real schedule-change history (`saifuldeen Naser`, `UPDATED` badges, timestamps); the
inline Edit Doctor view opens with correct per-doctor hydration confirmed via direct DOM inspection
(name and phone fields pre-filled from the actual record, not the placeholder — an empty Specialty
field on one doctor was a red herring, that doctor's own record genuinely has no specialty set, not
a hydration bug — confirmed by comparing against the record's own Profile Details view).

### Brief 16 — Phase 1: extract `Services` from `admin/page.tsx` (completed 2026-08-19)

Single-component extraction into `AdminServicesView.tsx` as scoped — no hook needed, confirmed
self-contained. `localServices`/`setLocalServices`/`syncServicesToApi` passed as props, not moved
(shared with `PromotionsAdminPanel`, per the brief's own flag). `ServiceRecipeEditor`/
`ServiceDeviceEditor`/`DoctorServiceCommissionEditor` all still wired correctly.

Review outcome: `tsc`/`eslint` clean (0 errors), `vitest` 597/603 unchanged. Browser-verified live:
services list renders with real branch pricing; "Add Service" modal opens with the full bilingual
form (Service Name EN/AR, English/Arabic Description, category, duration, price) working correctly.

**Found, not caused, by this extraction — logged as RISK-064:** the "Add New Category" modal has
only one input (English name); `newCategoryNameAr` exists in state/props but was never wired to any
JSX, so every category created there gets a permanently blank Arabic name. Confirmed pre-existing
by diffing the pre-extraction commit — this dead-state pattern already existed in `page.tsx` before
Brief 16 touched it, moved verbatim. Not fixed here (a real feature gap, not a mechanical-extraction
fix); see `ai_docs/RISKS.md` RISK-064 for the exact fix needed.

**Process note:** Briefs 15 and 16 arrived in a single commit mislabeled only as "BRIEF 16",
touching both features' code in the same `page.tsx` diff (16,149 lines changed). Unlike prior
commingling incidents, this one is not cleanly separable after the fact — both extractions
genuinely modified the same file in the same pass, and manually splitting a diff this size would
risk introducing an error that a clean file-level un-commingling wouldn't. Not pushed at the time
this was found, so the option existed, but a risky manual split was judged worse than an accurately
relabeled single commit; verified independently either way. **This is the fourth commingled/
mislabeled commit in a row** (Briefs 5, 13, 14, and now 15+16) — flagged to Mohamed as a pattern
worth addressing at the process level, not something to keep silently absorbing per-brief.

### Brief 17 — Wire Inventory permission enforcement, then extract from `admin/page.tsx` (completed 2026-08-20)

Landed as 5 clean, correctly-labeled commits — Part 1 (permission wiring), Part 2.1 (Device Audit
Logs modal), Part 2.2-2.3 (Devices/Products sub-tabs), Part 2.4 (`AdminInventoryView` wrapper) —
first properly-separated commit sequence since the commingling pattern started at Brief 5.

Review outcome: the 4 permission keys wired exactly as scoped — `canManage` (renamed at each
component boundary from the semantically-named `canManageDevices`/`canManageProducts`/
`canManageSuppliers` booleans computed once in `page.tsx`) gates every write surface in
`InventoryDevicesTab.tsx`, `InventoryProductsTab.tsx`, `SuppliersScreen.tsx`, and
`PurchasesScreen.tsx` via the same `canManage ? "inline-flex" : "hidden"` pattern Services already
used; hard product-delete additionally requires `canManage && isSuperadmin`, unchanged from before.
The read baseline is correctly unconditional — the whole section isn't gated behind any permission,
only the write buttons are. The `inventoryProducts` shared-state finding from the brief was
respected: `page.tsx` passes it (and `fetchInventoryProducts`) down as props, not duplicated into a
locally-owned copy that would have silently diverged from what `useCustomerProfile.ts` (Brief 10/11)
depends on. `tsc`/`eslint` clean (0 errors), `vitest` 597/603 unchanged. Browser-verified live: all
3 tabs (Devices, Products, Suppliers) load real data, Add Device modal opens with all fields, Device
Audit Logs modal shows real history (pulse-count/status changes with timestamps and "Performed By").

**One check not completed this pass, marked Pending rather than assumed:** browser-verifying that a
genuinely restricted account (only `inventory.view`, no `.manage_*` keys) actually renders
read-only — no second test account with that permission shape was available. The code-level pattern
match is the same one already proven correct for Services, giving high confidence, but that is not
the same as watching it render for a real restricted session — flagged in
`ai_docs/manual_tests/BRIEF_17_INVENTORY_PERMISSIONS_AND_EXTRACTION_MANUAL_TESTS.md` as an open item.

**Found, not caused, by this extraction:** `InventoryProductsTab.tsx` carries an orphaned
`handleSearchPatientByPhone` function and two supporting state variables with zero call sites —
confirmed via `git log -S` that this was already dead code in `page.tsx` before Brief 17 touched it,
moved verbatim. Same shape as Brief 15's dead Attendance-tab plumbing; not a new RISK entry, just
noted for whoever eventually does dead-code cleanup in this area.

### Brief 18 — Deduplicate the shared provider-form body, then translate the Doctors ecosystem (completed 2026-08-20)

Landed as 2 clean commits: Part 0 (extract `ProviderFormFields.tsx`), Part 1 (translate all 4
files). Part 0 delivered exactly what it set out to — the ~390-line form body duplicated
byte-for-byte between `AdminDoctorsView.tsx` and `ProviderFormModal.tsx` (confirmed identical by
diffing the Gender `<select>` block character-for-character before starting) now lives once, and
the Gender value/label-separation site count dropped from 3 to 2 as a direct consequence, exactly
as the brief predicted.

Review outcome: `tsc`/`eslint` clean (0 errors), `vitest` 597/603 unchanged, en/ar key parity exact
(477/477) against the commit as authored. The `toLocaleString()` bug (unpinned, silently following
the browser's own locale) is fixed, pinned to `en-GB`. Browser-verified live in both languages:
Doctors list, Edit Doctor inline view (Gender, Session Type, all fields), RTL mirroring on the full
form, clean revert to English.

**Two gaps found and closed, neither structural:** (1) the row-actions dropdown wrapper in
`AdminDoctorsView.tsx` still used `text-left` while its own inner menu correctly used `text-start`
— almost certainly visually inert (icon-only button) but fixed to match the brief's own bar.
(2) The working-schedule day labels (`{day}`, rendered straight from `Object.keys(activeSched)`)
had no translation lookup at all — "Sunday" through "Saturday" stayed English even in Arabic mode.
Not something the brief anticipated when written, and not catchable by `grep '>[A-Z][a-z]'` (an
interpolated expression, not literal JSX text) — found only by reading the actual Arabic render.
Fixed with a `dayNames` lookup added to `providerFormFields`, with the underlying `day` key
(correctly still the canonical English weekday name used to index the schedule object) left
untouched. Manual test checklist: `ai_docs/manual_tests/BRIEF_18_DOCTORS_DEDUP_AND_I18N_MANUAL_TESTS.md`.

### Brief 19 — Phase 2: translate `AdminServicesView.tsx` to Arabic (completed 2026-08-20)

Landed as 1 clean commit. Content and translation quality reviewed directly by Mohamed in the
browser rather than independently re-walked string-by-string — his own read of live Arabic UI text
is faster and more reliable than a code-side check for that specific judgment. Mechanical checks run
on top: `tsc`/`eslint` clean (0 errors, only pre-existing unused-var warnings), `vitest` 597/603
unchanged, en/ar key parity exact (567/567) across the whole `translations.ts`. Status value/label
separation confirmed correct — `<option value="Active">{t.activeOnly}</option>` keeps the stored
value canonical. The 2 pre-existing hardcoded `dir="rtl"` attributes on the Arabic Service Name/
Description text inputs (content-direction hints, not the language toggle) are unaffected, as
expected.

**Found, not caused, by this brief:** a `"Def"` badge abbreviation (default branch-price indicator,
2 occurrences) and a hardcoded `"Zayed:"` fallback label (used only when `svc.branchPricing` isn't
an array) both remain untranslated. Confirmed via diff against the pre-Brief-19 commit that both
already existed before this brief touched the file — not a regression. Low impact, not blocking;
worth a follow-up pass whenever this table is next touched. Manual test checklist:
`ai_docs/manual_tests/BRIEF_19_SERVICES_I18N_MANUAL_TESTS.md`.

### Brief 20 — Phase 2: translate the Inventory ecosystem to Arabic (completed 2026-08-22)

Landed as 1 commit (`78748cb`) covering all 6 target files. Independently re-verified after an
unrelated 60+-commit pull from `origin/dev` landed on top of it and produced 3 merge conflicts
inside Brief 20's own files (`AdminInventoryView.tsx`, `InventoryDevicesTab.tsx`,
`SupplierManagementScreen.tsx`) — all 3 hand-resolved keeping the translation-aware, RTL-safe side
while adopting the unrelated commits' newer pill-style tab UI and a `dropdown-action-menu` CSS fix;
resolution independently re-reviewed and confirmed clean.

Review outcome: `tsc`/`eslint` clean (0 errors) on all 9 touched files, `canManage`/`lang`/`t` prop
wiring intact end-to-end post-merge, dir attribute present on all 7 component roots, `toLocale*`
calls pinned, en/ar key parity structurally proven (props typed as
`typeof adminTranslations["en"]["inventory"]...`, so a missing key is a compile error).

**5 gaps found and fixed, same recurring value/label-in-an-interpolated-expression pattern as
Brief 18's day-names bug** — invisible to `grep '>[A-Z][a-z]'` because none of these are literal
JSX text:
1. Device category shown raw in the devices table (`{dev.category}` → e.g. "Laser Hair Removal" in
   Arabic mode). Fixed with a `categoryLabel()` mapping helper in `InventoryDevicesTab.tsx`.
2. Product category shown raw in the catalog table — same fix pattern in `InventoryProductsTab.tsx`.
3. Maintenance reason shown raw in the reset-history modal (`{log.reason}`) — fixed with a
   `reasonLabel()` helper, `InventoryDevicesTab.tsx`.
4. `DeviceAuditLogsModal.tsx`'s action-type badge rendered the raw `actionType` string instead of
   the already-translated `t.typeXxx` keys — fixed by deriving the label from the existing
   `isReset`/`isCreated`/`isStatus` flags.
5. Hardcoded English word `"delivered"` in a parenthetical pulse-count suffix (Windsurf's own
   self-caught gap, already listed in its draft checklist) — fixed by adding a `deliveredSuffix`
   key to both `en`/`ar`.

All 5 fixes preserve canonical-English stored/compared values — only display sites changed.
Committed separately as `d36753c`. Content and translation quality verified directly by Mohamed in
the browser. Manual test checklist: `ai_docs/manual_tests/BRIEF_20_INVENTORY_I18N_MANUAL_TESTS.md`.

**Reception-first scope is now fully translated** (Bookings, New Booking, Patients, Doctors,
Services, Inventory) — see `ADMIN_REFACTOR_AND_I18N_PLAN.md` for what's next.

### Brief 21 — Phase 1: extract the Employees admin section from `page.tsx` (completed 2026-08-22)

Landed as 1 commit (`34d01a4`), 2,989-line diff (2,949 deletions on `page.tsx`, matching the
~2,225-line block plus surrounding scaffolding). Independently re-verified: `tsc`/`eslint` clean
(0 errors, 267 pre-existing warnings), `vitest` 618/9 unchanged, and every state/handler category
the brief specified traced by grep across both files — every "moves in" identifier fully absent
from `page.tsx`, every "must stay a prop" identifier single-sourced in `page.tsx` and destructured
as a prop (not forked), and the 3 explicitly-out-of-scope handlers (`handleCreateEmployee`,
`handleUpdateEmployeeRole`, `handleSaveDepartments`) confirmed untouched. The permission gate,
both known value/label-separation bugs, and the duplicate `checkShiftOverlaps`/schedule-editor
logic were all moved verbatim, not silently fixed — as instructed. Browser-verified live: Employees
list/profile/Attendance Insights tab, Role Management's "Provision Employee Credentials" form
(confirms `newEmployeeName`/`Email`/`Role` are still correctly shared, not forked), and HR's
Workforce Directory (confirms the 3-way `employeesList` share survived).

**One correct deviation from the brief's literal text, not a bug:** `viewingEmployee` itself (not
just its notes/bookings) stayed lifted in `page.tsx` instead of moving fully into the component —
necessary, because HR's own Payroll tab "View Details" button calls `setViewingEmployee` directly, a
real cross-section dependency the original investigation missed. Brief 22 (queued next) already
assumes this and asks for `setViewingEmployee` to be passed into the future HR component the same
way. Manual test checklist: `ai_docs/manual_tests/BRIEF_21_EMPLOYEES_EXTRACTION_MANUAL_TESTS.md`.

### Brief 22 — Phase 1: extract the HR admin section from `page.tsx` (completed 2026-08-22)

Landed as 1 commit (`c7fb113`), 1,795-line deletion from `page.tsx` into a 1,901-line
`src/components/admin/hr/AdminHrView.tsx`. Independently re-verified: `tsc` clean, `vitest` 618/9
unchanged.

The brief's central risk — that HR lives in **two non-contiguous spans**, the main block plus an
Edit Target modal ~4,300 lines away — was handled correctly: both moved into the one component,
`page.tsx` keeps only the `editingTargetEmployee` state declaration and its prop pass, and the two
adjacent-but-unrelated modals (`presenceModalOpen` / `locationWarningOpen`, which belong to the
global inactivity monitor) were left untouched as instructed. Browser-verified live: all 7 sub-tabs
render, and Targets → Edit Target opens the moved modal with its inputs bound — the exact path that
would have broken had the two spans been extracted independently.

Permission gating preserved verbatim: still `activeNav === "HR"` alone, with zero
`hasPermission`/`adminRole` anywhere inside the new component — deliberately looser than Employees,
and not "fixed" during a zero-behaviour-change move. The known Payroll status-filter bug
(`AdminHrView.tsx:338-339`, "Pending" and "Overdue" are identical conditions so both return the same
rows) was likewise preserved rather than silently corrected, as the brief required — it remains open
and is flagged for a future fix, not a translation brief. Manual test checklist:
`ai_docs/manual_tests/BRIEF_22_HR_EXTRACTION_MANUAL_TESTS.md`.

### Brief 23 — Phase 2: translate `AdminEmployeesView.tsx` to Arabic (completed 2026-08-22)

First submission was reviewed and rejected: the live "View Employee Details" drawer's Basic Info
and Work tabs were never wired to translation keys that already existed and were already correctly
used in the print function in the same file — print got it right, the live view didn't. Also still
present: the exact `emp.shift` raw-value bug the brief itself had already called out (3 sites).
Findings written into this file's `## Brief 23` entry with exact line numbers rather than a
re-do request.

Fixed in commit `3efe21f`, alongside Brief 24's fix. Re-verified independently: `tsc`/`eslint`/
`vitest` clean (0 errors, warning count unchanged — no new ones), en/ar key parity confirmed by
evaluating `adminTranslations` at runtime (a grep-based check gives false positives on any key
whose value is a function), and every previously-raw site re-traced by hand. The 3 `emp.shift`
sites now route through a new `t.profile.shiftLabel()` function that translates recognized values
and passes anything else through unchanged — comparison sites (`=== "Night"`, `.includes(...)`)
still compare the raw canonical value throughout. Browser-verified live in both languages: the
Employees list table's shift badge, and the profile drawer's Basic Info and Work tabs, including a
row with a genuinely custom (non-Day/Night) shift value correctly falling through the label
function unchanged in both languages — confirms the fallback design, not a gap. Manual test
checklist: `ai_docs/manual_tests/BRIEF_23_EMPLOYEES_TRANSLATION_MANUAL_TESTS.md`.

### Brief 24 — Phase 2: translate `AdminHrView.tsx` to Arabic (completed 2026-08-22)

Landed cleanly apart from one contained gap: the Payroll tab's department filter dropdown had 5
hardcoded English `<option>` labels. Fixed in the same commit as Brief 23 (`3efe21f`) — `value=`
stays canonical (`Doctors`/`Nursing`/`Admin`/`Reception`/`Lab`, still compared against
`pay.department` elsewhere), only the visible text now routes through `t.payroll.deptDoctors`
etc. `dir` wiring was correct from the first submission, including on the physically-detached Edit
Target modal, which isn't DOM-nested under the component root and needed its own attribute — got
that right without it being called out. `tsc`/`eslint`/`vitest` clean, en/ar key parity confirmed
at runtime. Browser-verified live: the department filter shows Arabic labels while its underlying
`value`s are unchanged. Manual test checklist:
`ai_docs/manual_tests/BRIEF_24_HR_TRANSLATION_MANUAL_TESTS.md`.

### Brief 25 — Role Management: extract, then translate, then test (completed 2026-08-23)

Landed as 3 correctly-separated commits (`7a85428` extraction, `a1d2487` translation, `e979732`
tests) — the brief's own requirement, followed exactly. Independently re-verified: `tsc`/`eslint`/
`vitest` clean (624 passing, 11 expected fail), every state/handler placement the brief specified
individually confirmed by grep (nothing left behind that should have moved, nothing moved that
should have stayed a shared prop — including the non-contiguous `newDeptInput`), the known
3-layer permission-mismatch defect preserved rather than silently "fixed," and the
`PERMISSION_STRUCTURE` key→label translation (69 strings, the brief's central concern) correctly
implemented with a safe raw-value fallback — verified live in the browser in both languages.

**Part 3 found a real, confirmed Critical vulnerability while writing its own tests, exactly as
intended.** RISK-069: `PATCH /api/employees` lets any `admin`-role caller (not just `superadmin`)
change another account's `role_name` to `superadmin` — the only guard checks the *target* isn't
already the system owner, never the *caller's* role. Independently re-verified by reading
`requireAdministratorAccess` directly (it admits `admin` OR `superadmin`) and the PATCH handler's
actual guard. Correctly left unfixed and merely logged, per the brief's explicit scope boundary —
this needs a product decision, not a one-line brief-scope-creep fix.

**One more finding, from this review, not from the brief:** RISK-070 — a handful of pre-existing
roles (`Admin`/`Receptionist`/`Superadmin`) store coarse, undotted permission strings instead of
`PERMISSION_STRUCTURE`'s granular keys, so their "Allowed Modules" chips show some untranslated raw
English words. Confirmed as a data issue, not a code defect — the translation's own documented
fallback (pass an unrecognized value through unchanged) is what's firing. Manual test checklist:
`ai_docs/manual_tests/BRIEF_25_ROLE_MANAGEMENT_MANUAL_TESTS.md`.

