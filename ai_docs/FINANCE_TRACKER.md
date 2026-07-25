# FINANCE_TRACKER.md — PROPOSAL-002 Execution Tracker

> **Purpose:** a single place where anyone working on the Finance module can see what is done,
> what is in progress, what is blocked, and exactly what each task requires.
> **More than one developer is working in this codebase.** Update this file in the same commit as
> the code change — a task is not done until its row here says so and names the commit.

**Read first:** `PROPOSALS.md` → PROPOSAL-002 (the plan) · `RISKS.md` → RISK-010…RISK-020 (why) ·
`DECISIONS.md` → DEC-014…DEC-025 (what was decided and why).

---

## Status legend

| | meaning |
|---|---|
| `TODO` | not started |
| `WIP` | in progress — check the Owner column before starting |
| `DONE` | merged, with the commit hash recorded |
| `BLOCKED` | cannot proceed; blocker named in the row |
| `NEEDS-DB` | code is merged but a migration must be run against the live database |

---

## Ground truth you must not assume (read before touching schema)

**A migration file existing in `supabase/migrations/` proves nothing about any database.**
There is no migration state tracking; SQL is pasted by hand into the Supabase SQL Editor.
This has already caused one wrong doc entry — see RISK-020. **Always verify against the live DB:**

```sql
select table_name, column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public' and table_name = '<table>'
order by ordinal_position;
```

### Live database state, verified 2026-07-25

| | dev DB | main DB |
|---|---|---|
| Tables | 26 | 19 |
| Schema current through | ~2026-07-20 | **~2026-07-05** |
| `reservations.date` type | `text` | **`date`** |
| `reservations.service_ids` | present | **absent** |
| `reservations.created_by_employee_id` | present | **absent** |
| `reservations.is_manual` | present | **absent** |

**Production is not live yet** — no real patient data is at risk today. The divergence bites at
merge time and at every new clinic (DEC-001 = one Supabase project per client).

**Migrations known NOT to have been applied to the dev DB:**

| Migration | Effect of it being unapplied |
|---|---|
| `20260722140000_enable_row_level_security.sql` | RLS is off on `reservations`, `customers`, `services`, `providers`, `branches`, `page_settings` and others |
| `20260725120000_backfill_medical_and_product_balance_tables.sql` | `medical_records`, `medical_reports`, `customer_product_balances` do not exist; those routes are silently running on JSON-file fallback |

**Tables that exist live but are in no migration and no doc:** `admin_roles` (both DBs),
`employees` (main only). Do not assume they are unused before checking.

---

## Phase 0 — Verify & repair

Nothing in Phases 1–5 should start before Phase 0 is `DONE`. Reporting built on these inputs
would be confidently wrong, which is worse than absent (DEC-019).

| ID | Task | Status | Owner | Commit |
|---|---|---|---|---|
| 0.0 | Fix the migration pipeline — see below | `WIP` | Claude | `see below` |
| 0.1 | Verify live DB against migrations | `DONE` | Claude | `1c3d151` |
| 0.2 | Fix server-side branch pricing | `DONE` | Claude | `see 0.2/0.3 below` |
| 0.3 | Fix client-side branch pricing | `DONE` | Claude | `see 0.2/0.3 below` |
| 0.4 | Fix double stock deduction | `DONE` | Claude | `see 0.4 below` |
| 0.5 | Fix `customers.outstanding` never decrementing | `TODO` | — | — |
| 0.6 | Fix `product_sales` route column mapping | `DONE` | Claude | `23e0e5e`, `8108b82` |
| 0.7 | Add `provider_id` FK to `reservations` | `TODO` | — | — |
| 0.8 | Add `services.duration_minutes` numeric | `TODO` | — | — |
| 0.9 | Correct `ai_docs` drift | `DONE` | Claude | `9b4c3e7`, `3cf1c8a`, `1c3d151` |
| 0.10 | Protect money-mutating API routes | `TODO` | — | — |

---

### 0.0 — Fix the migration pipeline (RISK-020) — WIP

| Step | Status |
|---|---|
| a. Supabase CLI configured (`supabase init`, generic `project_id`) | `DONE` |
| b. Silent-fallback insert chain removed | `DONE` |
| c. Migration `README.md` rewritten with the CLI runbook | `DONE` |
| d. **`supabase link` + `supabase db pull` to establish the baseline** | `TODO` — needs credentials |
| e. Move the 30 legacy files to `_legacy/`, update `DB_SCHEMA.md` to the baseline | `TODO` — blocked on (d) |
| f. Bring the main DB up to the baseline | `TODO` — blocked on (e) |

**(d) is yours to run — it needs the database password, which I must not handle.**

`link` succeeded. `db pull` then failed with *"The remote database's migration history does not
match local files"*, which is expected: the CLI has never been used on this project, so the remote
`supabase_migrations.schema_migrations` table is empty while 31 files exist locally.

> ### Do NOT run the repair commands the CLI printed
>
> It offers to mark **all 31** migrations as `applied`. **Four of them have not been applied** — we
> measured this. Marking them applied would make `db push` skip them forever, permanently locking in
> the drift and hiding it again. That is the exact failure this task exists to eliminate.

**Mark applied only the 27 that genuinely ran** (everything up to and including the 2026-07-20
inventory schema — verified by the presence of their tables and columns in the live dev DB):

```bash
for v in 20260624015717 20260625001607 20260625002536 20260626073345 20260626081049 \
         20260626081641 20260626214919 20260626215946 20260705141242 20260705141243 \
         20260705141244 20260705171941 20260705180607 20260706081326 20260706090122 \
         20260706091942 20260706174841 20260707132614 20260709154350 20260711204540 \
         20260712003001 20260712230858 20260713172113 20260715202002 20260715202003 \
         20260719162731 20260720164008 ; do
  npx supabase migration repair --status applied "$v"
done
```

**Leave these four out** — they must remain unapplied so `db push` picks them up:
`20260722140000` · `20260725120000` · `20260725160000` · `20260725170000`

Then:
```bash
npx supabase db pull --schema public   # baseline from the live database
```

> One caveat on `20260711204540` (adds `pending_deposit` to the status CHECK): we never confirmed it
> ran. It is in the repair list anyway because `20260725170000` restates that constraint
> unconditionally and *is* in the push set — so the constraint ends up correct either way.

When reviewing the pulled baseline, decide what `admin_roles` and `employees` are — they exist live,
in no migration and in no doc.

**(b) — what was removed and why.** `src/app/api/reservations/route.ts` previously retried a failed
insert after deleting `is_manual` and `created_by_employee_id`, then again after also deleting
`rooms` and `doctor_name`, and — worst of all — **silently rewrote status `pending_deposit` to
`pending`** before reporting success. On a database missing any of those columns that produced a
booking with no employee attribution, no doctor, no rooms and **no deposit requirement**, while the
API response still told the UI a deposit was due. This is the mechanism that kept RISK-020 invisible.

It now fails loudly, logging the error code and the payload keys.

> **Consequence to expect:** if the dev database's `reservations_status_check` constraint predates
> `20260711204540`, deposit bookings will now **fail visibly** instead of being silently downgraded.
> `20260725170000_ensure_reservation_status_check.sql` restates the constraint with all eight
> statuses and is the fix. Run it together with the others below.

### Migrations pending — run these against dev, then update this table

**Push in this order.** The first three are additive and safe; the RLS one is not, and had a
blocker that is now cleared.

**All four were run against the dev database on 2026-07-25 via the SQL Editor and reported
success.** Recorded from the operator's report, not from a schema re-query — see the verification
query below and tick it off once confirmed.

| # | Migration | Ran? | Against | Notes |
|---|---|---|---|---|
| 1 | `20260725160000_add_customer_id_to_product_sales.sql` | ✅ 2026-07-25 | dev | Unblocks RISK-014 — POS sales now persist to `product_sales` |
| 2 | `20260725170000_ensure_reservation_status_check.sql` | ✅ 2026-07-25 | dev | `pending_deposit` accepted; safe now that the silent fallback is gone |
| 3 | `20260725120000_backfill_medical_and_product_balance_tables.sql` | ✅ 2026-07-25 | dev | The 3 missing tables now exist; those routes are off JSON fallback |
| 4 | `20260722140000_enable_row_level_security.sql` | ✅ 2026-07-25 | dev | RLS now on for every public table |

**Confirm with a re-query before trusting the above:**
```sql
select tablename, rowsecurity from pg_tables
where schemaname = 'public' order by tablename;   -- expect rowsecurity = true everywhere

select count(*) from information_schema.columns
where table_name = 'product_sales' and column_name = 'customer_id';   -- expect 1

select table_name from information_schema.tables
where table_schema = 'public'
  and table_name in ('medical_records','medical_reports','customer_product_balances');  -- expect 3
```

**Post-run regression check — required, since RLS on `public` is new:**
Bookings · Customers · Services · Inventory · Employees. Every read must now go through an API
route using the service role. Anything that returns empty or fails is a table being read with the
anon key and must be moved server-side.

**Still outstanding:** sales written before the fix are sitting in `page_settings`
(key `product_sales_history`) and have not been migrated into `product_sales`. Decide whether to
backfill them and record the decision here.

> ### The RLS migration had a blocker — now cleared, but verify before running
>
> `src/app/admin/page.tsx` used to write to `customers` **directly from the browser** with the anon
> key (`supabase.from("customers").update({ spent_amount })`). Enabling RLS on `customers` with no
> policies would have made that update affect zero rows **while still reporting success** — silent
> data loss, exactly the class of bug this phase exists to remove.
>
> That write is now server-side in `POST /api/inventory/products/sales`. There is no remaining
> `.from(...)` table access in any client component — confirm before running step 4:
> ```bash
> grep -rnE "\.from\(['\"]" src/ --include=*.tsx
> ```
> This should return nothing. If it returns a real call, fix it first.
>
> After running step 4, most tables have RLS on with **zero policies**, i.e. service-role-only.
> Every read must go through an API route. Re-test the admin panel end to end.

**Verify 0.0 complete when:** a fresh Supabase project can be provisioned with one command, and
`supabase_migrations.schema_migrations` lists every applied file.

---

### 0.2 / 0.3 — Branch pricing has never worked (RISK-011) — DONE

**Fixed.** Both bugs, plus a third found while fixing them.

- **Client** (`src/lib/services.ts`): added a shared `resolveBranchName()` helper, now used by both
  `getEffectiveServicePrice` and `getServicePriceDetails`, which carried identical copies of the
  broken logic. It resolves an id by **string** comparison against `branchesList` (ids are UUIDs;
  the old code used `Number(b.id) === Number(key)`, i.e. `NaN === NaN`), falls back to matching a
  name in `name` / `name_en` / `name_ar`, and — critically — returns `null` rather than pretending
  a UUID or a numeric id is a branch name.
- **Server** (`src/app/api/reservations/route.ts`): `.eq('id', branchId)` instead of
  `Number(branchId)`, and `select('name_en, name_ar')` instead of a `name` column that does not
  exist.
- **Third bug:** the branch lookup discarded its Supabase `error`. That is why a query against a
  non-existent column stayed silent. It is now logged, as is a branch id that resolves to nothing.

**Verified end to end:** `branchPricing[].name` is written as `b.name_en`
(`admin/page.tsx:1561`), and `resolveBranchName` returns `name_en` for a `Branch` — which has no
`name` field — so both sides key on the same string.

**Regression check:** `npx tsx scratch/pricecheck.ts` — 10 cases, all passing. Meaningful rather
than decorative: the first case returned 800 instead of 1200 before the fix.

**Original diagnosis, kept for reference:**

**Server** — `src/app/api/reservations/route.ts:198-206`
```
.eq('id', Number(branchId))   // branches.id is uuid → Number(uuid) is NaN
.select('name')               // no such column; it is name_en / name_ar
```
`targetBranchName` is therefore always null.

**Client** — `src/lib/services.ts:137-147`
```
if (typeof branchNameOrId === 'string' && isNaN(Number(branchNameOrId)))
    targetBranchName = branchNameOrId;
```
A UUID is a non-numeric string, so the UUID itself is used as the branch *name* and never matches
`branchPricing[].name`. The `branchesList` lookup at `:140-146` is unreachable for UUID ids.

**Also:** `services.branch_pricing` is `jsonb NOT NULL DEFAULT '{}'` — an empty **object** — while
all consuming code guards with `Array.isArray()`. Any service never touched in the pricing UI
silently falls back to `services.price`.

**Verify:** set a branch-specific price, book into that branch, confirm the booking and the printed
invoice both use it. Today they do not.

---

### 0.4 — Double stock deduction (RISK-013) — DONE

**Decision: `POST /api/inventory/products/sales` owns stock movement.** It is the only place
`deductInventoryStock` is now called. `POST /api/customers/products` records what a patient *owns*
and no longer touches stock — both admin flows call the two endpoints together, so a single
deduction happens in each.

> If you ever add a caller that creates a patient balance **without** recording a sale, deduct
> stock there or the count will drift. The constraint is documented in the route itself.

Also removed: `handleConfirmSellProduct` PUT the entire catalog to `/api/inventory/products` after
each sale. That call **always returned 400** ("Product ID is required" — the handler expects a
single product object, not `{products: [...]}`) and its response was never checked. Had it ever
worked it would have been a *third* deduction path, overwriting the server's stock with a
client-computed figure. The optimistic local update remains for immediate UI feedback, followed by
`fetchInventoryProducts()` to reconcile with the server.

`PATCH /api/customers/products` (log usage) correctly does **not** deduct — the patient already
owns those units.

**Still open — `branch_name` on sales.** Not wired, and deliberately not faked. There is no branch
context anywhere in the sell flow, `inventory_products.branch_id` is hardcoded `null` in the
mapper, and `branch_name` is never written. Per-branch product P&L needs products associated with
branches first; that is its own task, not a line in this one.

**Verify:** sell 2 units of a product with known stock; stock drops by exactly 2, in the DB not
just the UI.

**Original diagnosis, kept for reference:**

`src/app/admin/page.tsx:3690-3773` calls `POST /api/inventory/products/sales`, which deducts stock
at `sales/route.ts:124`, **and then** calls `POST /api/customers/products`, which deducts the same
quantity again at `customers/products/route.ts:189`. `handleAddProductToPatient`
(`admin/page.tsx:3608-3644`) does the same two calls in reverse order.

Selling 2 units removes 4. Decide which route owns the deduction and remove the other.

Related, same file: `deductInventoryStock` matches by id **or** case-insensitive name and rewrites
the whole catalog per sale (`inventory/products/route.ts:242-244`) — concurrent sales lose updates.

**Verify:** sell 2 units of a product with known stock; stock drops by exactly 2.

---

### 0.5 — Patient debt only grows (RISK-012)

`src/app/api/reservations/route.ts:580`: `newOutstanding = currentOutstanding + amountLeft`.
No code path anywhere decrements it when a patient later pays.

The PATCH endpoint also trusts client-supplied `amountPaid` / `amountLeft` / `walletDeposit` /
`walletWithdrawal` verbatim with no idempotency (`:541-542, 575-576`) — re-firing the same
completed PATCH double-counts `spent_amount` and `outstanding`.

**Note:** Phase 1 makes these balances derived from the ledger, which fixes this structurally.
The Phase 0 fix is the stopgap so current data stops degrading in the meantime.

**Verify:** complete a booking leaving a balance, then settle it; `outstanding` returns to its
prior value. Re-firing the same PATCH does not change any balance twice.

---

### 0.6 — `product_sales` route column mapping (RISK-014) — code merged, `NEEDS-DB`

> **ACTION REQUIRED — run this migration against the dev database:**
> `supabase/migrations/20260725160000_add_customer_id_to_product_sales.sql`
> Until it is run, POS inserts still fail and still fall through to `page_settings` — i.e. no
> regression, but no fix either. **Change this row to `DONE` once it has been run, and say which
> database it was run against.**
>
> Also still open after this: sales already sitting in the `page_settings` blob
> (key `product_sales_history`) have not been migrated into the table. Decide whether to backfill
> them or leave them, and record the decision here.

**What was changed** (`src/app/api/inventory/products/sales/route.ts`):
- `mapSaleToDbRow` / `mapDbRowToSale` translate between the API contract and the real columns.
  **The API contract is deliberately unchanged** — the admin UI reads `total_amount`,
  `product_sku`, `customer_mobile` directly.
- `id` is generated (`sale-<ts>-<rand>`); the column is a `text` PK with no default.
- `branch_name` and `customer_email` are now accepted and persisted. **The callers at
  `admin/page.tsx:3630` and `:3706` do not yet send `branch_name`** — wire that up as part of 0.4,
  otherwise per-branch product P&L stays impossible.
- The read guard now requires `dbSales.length > 0` before trusting the table.
- A failed insert is logged before falling back, instead of failing over silently.

**Original diagnosis, kept for reference:**

The live table matches its migration exactly. **The route is what is wrong.**

| Route sends | Live column |
|---|---|
| `product_sku` | `sku` |
| `customer_mobile` | `customer_phone` |
| `total_amount` | `total_price` |
| `sold_by` | `cashier_name` |
| `customer_id` | *no such column* |
| *(never sent)* | `id` — `text` PK, no default |
| *(never sent)* | `branch_name` |

Every insert fails and falls through to the `page_settings` blob (key `product_sales_history`),
while `getStoredSalesData` (`:32-34`) treats the empty table as authoritative because an empty
array is truthy. Sales are written to one store and read from another.

**Constraint:** the admin UI reads `sale.total_amount`, `sale.product_sku` and
`sale.customer_mobile` (`admin/page.tsx:11664, 18038, 18046`). **Keep the API contract unchanged**
and translate at the DB boundary with mappers — do not rename fields in the UI.

**Verify:** make a POS sale, then confirm the row exists in `product_sales` (not only in
`page_settings`), and that the sales history list renders it.

---

### 0.7 / 0.8 — Schema additions for finance

- **0.7** `reservations.provider_id` uuid FK → `providers.id`, backfilled from `doctor_name`.
  Keep `doctor_name` as a denormalized snapshot. Doctor cost attribution is currently a
  lowercased string match (`hr/doctor-payroll/route.ts:172`) — a rename silently detaches history
  (RISK-015).
- **0.8** `services.duration_minutes` numeric, backfilled from the free-text `duration`.
  `getDurationInMinutes` (`src/lib/services.ts:1-34`) falls back to 30 minutes for anything it
  cannot parse, and every seeded service has a NULL duration — so **every capacity number today
  assumes 30 minutes for every service.**

---

### 0.10 — Money-mutating routes are unauthenticated (RISK-018)

`/api/reservations` PATCH (mutates `amount_paid`), `/api/inventory/products/sales`,
`/api/inventory/products` and `/api/customers` are not in `PROTECTED_API_PREFIXES`
(`src/middleware.ts:5`) and import no auth helper.

**Protecting a route needs both steps:**
1. Add the prefix to `PROTECTED_API_PREFIXES` — this only proves the caller is *some* valid
   Supabase user, not that they are staff.
2. Call `requireAdministratorAccess` (`src/lib/access.ts:58`) inside the handler.

---

## Conventions for this workstream

1. **Verify schema against the live DB before writing SQL.** See the query at the top.
2. **Any schema change = a migration file + a `DB_SCHEMA.md` update in the same commit**
   (CLAUDE.md hard rule 6). Mark the tracker row `NEEDS-DB` until the migration has actually been
   run, and say which database it was run against.
3. **Never state applied state you have not measured.** This file exists partly because that
   mistake was already made once.
4. **No new raw hex colors; no hardcoded "Revera"** (CLAUDE.md rules 1 and 2). Note the existing
   admin UI violates rule 1 throughout — match the rule, not the surrounding code.
5. New tables must **explicitly enable RLS** in their own migration. The blanket enable migration
   is a one-shot `DO` block, not a trigger, and has not been applied anyway.
6. Update this file in the same commit as the change it describes.

---

## Open questions

| Question | Needed by | Status |
|---|---|---|
| VAT treatment — medical services exempt vs retail products taxable | Phase 1 | Awaiting the clinic's accountant. Design works either way (DEC-021) |
| Cutover date for exact data | End of Phase 2 | Decide nearer the time; should be the first day of a month (DEC-020) |
| Currency configuration | Phase 4 | `EGP` is a hardcoded string throughout; belongs in `src/config/client.ts` per PROPOSAL-001 |
| Whether `admin_roles` / `employees` tables are live or dead | Phase 0.0 | Unknown — found in the live DBs, in no migration and no doc |
