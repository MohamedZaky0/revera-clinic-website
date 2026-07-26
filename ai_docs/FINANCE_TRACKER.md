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

## All existing data is mock

Every reservation, customer, sale and inventory row in the database is development test data.
Production has never gone live (confirmed 2026-07-25). Consequences:

- **You can freely reset, wipe or reshape data.** Nothing in there needs preserving.
- **No backfill is being built** (DEC-026, supersedes DEC-020). Real data begins at go-live.
- Current `stock_quantity` values are wrong from the old double-deduction bug — and it does not
  matter, because they are fictional anyway.
- What *is* being built is the **opening-balance import** (DEC-024): a real clinic's day-one cash,
  stock, patient debts, wallet credit and undelivered packages. That is not history, and it is the
  only import in scope.

---

## Ground truth you must not assume (read before touching schema)

**A migration file existing in `supabase/migrations/` does not by itself prove database state.**
The linked dev database now tracks all 32 confirmed migrations in
`supabase_migrations.schema_migrations`, but every schema claim must still be verified against the
live DB. This has already caused one wrong doc entry — see RISK-020.

```sql
select table_name, column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public' and table_name = '<table>'
order by ordinal_position;
```

### Live database state — dev re-verified 2026-07-26; main remains the 2026-07-25 snapshot

| | dev DB | main DB |
|---|---|---|
| Migration history | `20260726000000` baseline recorded | Not reconciled |
| Schema evidence | Direct linked `db dump` | **2026-07-25 snapshot** |
| `reservations.date` type | `text` | **`date`** |
| `reservations.service_ids` | present | **absent** |
| `reservations.created_by_employee_id` | present | **absent** |
| `reservations.is_manual` | present | **absent** |

**Production is not live yet** — no real patient data is at risk today. The divergence bites at
merge time and at every new clinic (DEC-001 = one Supabase project per client).

**Confirmed in the dev schema dump:** RLS is enabled, `medical_records`, `medical_reports`,
`customer_product_balances`, `product_sales.customer_id`, `reservations.provider_id`, and
`services.duration_minutes` exist. `admin_roles` also exists in dev but has no migration; it is now
documented in `DB_SCHEMA.md`. `employees` remains observed only in main and has not been
re-queried.

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
| 0.5 | Fix `customers.outstanding` never decrementing | `DONE` | Claude | `see 0.5 below` |
| 0.6 | Fix `product_sales` route column mapping | `DONE` | Claude | `23e0e5e`, `8108b82` |
| 0.7 | Add `provider_id` FK to `reservations` | `DONE` | Claude | verified against dev schema dump 2026-07-26 |
| 0.8 | Add `services.duration_minutes` numeric | `DONE` | Claude | verified against dev schema dump 2026-07-26 |
| 0.9 | Correct `ai_docs` drift | `DONE` | Claude | `9b4c3e7`, `3cf1c8a`, `1c3d151` |
| 0.10 | Protect money-mutating API routes | `DONE` | Claude | `see 0.10 below` |

**Phase 0 summary:** 10 of 11 tasks `DONE`. 0.10 is complete — reservations, customers (with
per-identity scoping for patients), and every admin-only inventory/product-balance route are all
authenticated, with every caller verified to send the right token. The dev migration baseline is
adopted, replay-verified, and its bookkeeping matches the live database exactly (a drift where
`20260726000100` was applied live but not recorded was found and repaired during this session — see
0.0). The only remaining task is 0.0(f): a separate main-database schema review and cutover to the
baseline, deferred because `main` is not live and this is real, distinct work.

---

### 0.0 — Fix the migration pipeline (RISK-020) — WIP

| Step | Status |
|---|---|
| a. Supabase CLI configured and linked to dev | `DONE` |
| b. Silent-fallback insert chain removed | `DONE` |
| c. Dev migration history replaced with the active baseline entry | `DONE` |
| d. Direct linked dev schema dump captured and verified | `DONE` |
| e. Replace the out-of-order legacy sequence with a reviewed clean baseline from that dump | `DONE` — `20260726000000_dev_schema_baseline.sql`; shadow replay has no diff |
| f. Bring the main DB up to the clean baseline and verify parity | `TODO` — requires separate main database review and cutover |

**Measured 2026-07-26:** `supabase migration repair` replaced the 32 legacy dev history entries
with `20260726000000`. `supabase migration list --linked` shows that baseline as the sole matching
local and remote entry. `npx supabase db pull --schema public` provisions a shadow database, applies
the baseline, and finds no schema diff; its non-zero "No schema changes found" result is the CLI's
expected no-op outcome.

The dump is now the reviewed `20260726000000_dev_schema_baseline.sql`; the 32 legacy files are
archived under `_legacy/`, and linked dev migration metadata records only the baseline. The CLI
shadow replay applies it and finds no schema diff.

`admin_roles` is present in dev, has no migration or application caller, and is documented in
`DB_SCHEMA.md`. `employees` remains observed only in main and needs a direct main-schema review
before main is reconciled.

**Drift found and repaired 2026-07-26 (second pass).** A new migration,
`20260726000100_add_customer_auth_user_id.sql`, had been applied directly to the live dev database
but `supabase migration list --linked` still showed it as unrecorded (`remote: ""`) — the exact
class of bug this task exists to prevent, caught immediately because it was checked rather than
assumed. Confirmed via `supabase db diff --linked`: a shadow database with both migrations applied
produces **no diff** against the live remote schema, meaning the schema change was already live;
only the bookkeeping was missing. Repaired with
`supabase migration repair --status applied 20260726000100` (safe here specifically because the
migration is idempotent — `IF NOT EXISTS` throughout — so no risk of a duplicate-apply error).
`supabase migration list --linked` now shows both `20260726000000` and `20260726000100` matching
local and remote exactly.

**(b) — what was removed and why.** `src/app/api/reservations/route.ts` previously retried a failed
insert after deleting `is_manual` and `created_by_employee_id`, then again after also deleting
`rooms` and `doctor_name`, and — worst of all — **silently rewrote status `pending_deposit` to
`pending`** before reporting success. On a database missing any of those columns that produced a
booking with no employee attribution, no doctor, no rooms and **no deposit requirement**, while the
API response still told the UI a deposit was due. This is the mechanism that kept RISK-020 invisible.

It now fails loudly, logging the error code and the payload keys.

### Applied and verified in dev

The direct dev dump confirms these migrations' effects:

| Migration | Verified effect |
|---|---|
| `20260722140000_enable_row_level_security.sql` | RLS enabled on public tables |
| `20260725120000_backfill_medical_and_product_balance_tables.sql` | `medical_records`, `medical_reports`, and `customer_product_balances` exist |
| `20260725160000_add_customer_id_to_product_sales.sql` | `product_sales.customer_id` exists |
| `20260725170000_ensure_reservation_status_check.sql` | `pending_deposit` is accepted by `reservations_status_check` |
| `20260725180000_add_provider_id_and_duration_minutes.sql` | `reservations.provider_id`, its foreign key/index, and `services.duration_minutes` with its check exist |

**Follow-up verification:** manually exercise Bookings, Customers, Services, Inventory, and
Employees through API-backed screens. With RLS enabled, any direct anon-key table access will return
zero rows or fail and must be moved server-side.

**Still outstanding:** sales written before the POS fix remain in `page_settings` under
`product_sales_history`; DEC-026 says all existing data is mock, so decide whether to discard rather
than backfill them.
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

### 0.5 — Patient debt only grows (RISK-012) — DONE

The maths moved out of the route into **`src/lib/billing.ts` → `computeSettledBalances()`**, a pure
function. It is money arithmetic and does not belong inline in a request handler; it is also where
Phase 1's ledger maths should land.

**Deltas, not absolutes.** Balances are now computed against the reservation row as it was *before*
the update:
- Debt exists only once the service is delivered — before completion `amount_left` is merely "not
  paid yet". So the completion transition books the whole remaining balance as debt, and a later
  payment books only the change.
- Wallet movements arrive as deltas from the checkout modal, so they apply **only** on the
  completion transition; re-sending them later is ignored and logged.
- Negative results clamp at 0 and are logged.

The settlement now also triggers when money fields change on an already-completed booking, not only
when `status: 'completed'` is sent.

**Regression check:** `npx tsx scratch/billingcheck.ts` — 15 assertions, all passing. Covers first
completion, later payment clearing the debt, a replayed identical PATCH being a no-op, wallet-funded
payment, overpayment to wallet, replayed wallet movement, and overpaying a debt.

> ### Feature gap found while fixing this — NOT a bug, and NOT fixed
>
> `outstanding` can now decrease, but **nothing in the admin UI lets a patient pay off a balance.**
> Only two flows send money fields: "mark deposit paid" (sends `status: 'pending'`, correctly no
> debt yet) and checkout (`status: 'completed'`). There is no "settle outstanding" screen at all.
>
> So patient debt still only ever accumulates in practice — the server just no longer makes that
> inevitable. **A settle-debt flow needs building.** Phase 1's payments ledger is the natural home;
> until then, debt figures will keep drifting upward.

**Original diagnosis, kept for reference:**

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

### 0.6 — `product_sales` route column mapping (RISK-014) — DONE

`20260725160000_add_customer_id_to_product_sales.sql` was run against dev on 2026-07-25 (confirmed
in the applied-migrations checklist above). POS sales now persist to `product_sales` correctly.

**Still open, low priority:** sales recorded before this fix are sitting in the `page_settings`
blob (key `product_sales_history`) and have never been migrated into the table. Given all current
data is mock (DEC-026), this is not worth doing — it only matters if real pre-fix sales data
existed, which it does not.

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

### 0.7 / 0.8 — Schema additions for finance — DONE

`20260725180000_add_provider_id_and_duration_minutes.sql` was run against the linked **dev**
database and verified from a live schema dump on 2026-07-26. The dump confirms both columns, the
`reservations_provider_id_fkey` foreign key, `reservations_provider_id_idx`, and
`services_duration_minutes_check`.

**0.7 — `reservations.provider_id`** uuid FK → `providers.id ON DELETE SET NULL`, indexed,
backfilled from `doctor_name`.

- `doctor_name` stays as a **denormalised snapshot** on purpose: it is what was recorded at the
  time, and an invoice must not change because a provider row was edited later.
- `resolveProviderId()` in the reservations route populates it on **create, approve and update**.
- It resolves only when the name matches **exactly one** provider. No match or an ambiguous match
  leaves NULL and logs — a wrong link misattributes doctor cost silently, which is worse than a
  visible gap. The backfill uses the same rule.
- Doctor payroll still matches on the name string (`hr/doctor-payroll/route.ts:172`). Switching it
  to `provider_id` is follow-up work, not part of this task.

**0.8 — `services.duration_minutes`** integer, CHECK `> 0 AND <= 1440`, backfilled by parsing
`duration` with the same rules as `getDurationInMinutes()`.

- New `getServiceDurationMinutes(service)` in `src/lib/services.ts` prefers the numeric column and
  falls back to parsing the text. **All 9 call sites now use it** — availability, reservations,
  admin and BookingModal.
- `duration_minutes` added to `ServiceItem`, and to the three server-side `select`s that previously
  fetched only `duration`.
- The backfill leaves NULL where the text was absent or unparseable rather than writing a
  30-minute guess. A NULL is visible; a wrong number is not.

> **Why this mattered:** `duration` is unvalidated free text and `getDurationInMinutes` silently
> returns 30 for anything it cannot parse — so "45" or "1 hr" quietly became a 30-minute session.
> Every seeded service had no duration at all, so **every capacity and room-utilisation figure so
> far assumed 30 minutes for every service.** Phase 5 capacity analysis and the room-minutes
> overhead allocation (DEC-015) both depend on this being real.

**Original diagnosis, kept for reference:**

---

### 0.10 — Money-mutating routes are unauthenticated (RISK-018) — PARTIAL

**Done, safely:**
- `DELETE /api/reservations` (both `?id=all` and single-id) → `requireAdministratorAccess`.
  Verified zero admin-UI callers exist for this method on this route — nothing could regress.
- `POST /api/inventory/products/sales` → `requireStaffAccess`. Both real callers
  (`handleConfirmSellProduct`, `handleAddProductToPatient` in `admin/page.tsx`) sent no
  `Authorization` header and would have 401'd; both were updated to send
  `Bearer ${session.access_token}`, matching the pattern already used elsewhere
  (`admin/page.tsx:2233` etc). `GET` on the same route is untouched — the admin's
  `fetchProductSalesHistory` sends no auth header either, and protecting `GET` too was out of
  scope for this pass.

**Completed 2026-07-26:**
- All admin `PATCH /api/reservations` callers now send the authenticated session token.
- `PATCH /api/reservations` now calls `requireStaffAccess` for every mutation except the narrow
  public deposit declaration from `BookingModal.tsx`: only a `pending_deposit` row may receive
  `{ status: 'pending', amountPaid, amountLeft, notes? }` without a staff token.
- This secures approval, rejection, checkout, lifecycle transitions, notes, service edits and
  employee-attribution updates without breaking the public booking payment flow.

**Completed 2026-07-26, second pass — `/api/customers` and the remaining inventory/product-balance
routes:**

- **`/api/customers` GET/POST now require authentication, with per-identity scoping — not a
  blanket staff gate.** Patients call this route directly (no separate patient login exists;
  `AuthModal.tsx` self-lookup during OTP login, `profile/page.tsx` self-service), so a blanket
  `requireStaffAccess` would 403 every patient. **This was caught mid-fix**: an earlier attempt in
  this session did exactly that — gated both methods behind `requireStaffAccess` without updating
  any caller — which would have broken patient login/registration entirely had it shipped. Fixed
  properly instead:
  - `classifyCaller()` tries `requireStaffAccess` first; on a 403 (valid session, not staff) it
    falls back to `requireAuthenticatedUser` (any valid Supabase session) rather than rejecting.
  - A **patient caller is scoped to their own record only**, via `isOwnIdentity()` in the new
    `src/lib/customerIdentity.ts`. This matters: naively allowing "any authenticated user" through
    would let one patient read or overwrite another patient's profile — including debt, wallet
    balance and address — by guessing or brute-forcing a mobile number (IDOR). `isOwnIdentity()`
    prefers the new `customers.auth_user_id` link once a row has one, and falls back to normalized
    phone / lowercased email for the rows that predate it (every row today) — see
    `20260726000100_add_customer_auth_user_id.sql`. `GET` backfills `auth_user_id` the first time
    ownership is confirmed, so later lookups no longer depend on string matching.
  - A patient may look up or write **only their own** record: `GET` with no `mobile`/`email`
    (the full customer list) is staff-only; a lookup for someone else's identity returns `null`
    rather than their data; `POST` with an `id` requires the existing row to resolve to the caller,
    and `POST` without an `id` requires the submitted `mobile`/`email` to match the caller.
  - **Financial fields are never patient-writable.** `spent_amount`, `outstanding` and
    `wallet_balance` are only taken from the request body on the staff path; a patient POST cannot
    set or clear their own debt or wallet balance no matter what the body contains.
  - All 7 patient-facing call sites across `AuthModal.tsx` (4) and `profile/page.tsx` (2 + a new
    `authHeaders()` helper, since that page has no live session listener and reads the persisted
    session via `supabase.auth.getSession()`) now send `Authorization: Bearer <token>`.
  - Regression check: `npx tsx scratch/identitycheck.ts` — 10 cases, all passing, including the
    IDOR case (an unrelated customer's phone/email must never match).
- **`DELETE /api/customers`** → `requireAdministratorAccess` (unchanged from the first pass).
- **`requireAuthenticatedUser`** added to `src/lib/access.ts` — "some valid Supabase session",
  without the staff/`employee_accounts` lookup `requireStaffAccess` does. This is the primitive
  patient-facing routes need; routes with no patient caller should keep using `requireStaffAccess`.
- **`/api/inventory/products` (GET/POST/PUT/DELETE), `/api/inventory/devices` (GET/POST/PUT),
  `/api/inventory/devices/[id]/reset-pulses` (POST), `/api/customers/products`
  (GET/POST/PATCH)** → all `requireStaffAccess`. Verified **no patient-facing caller exists for
  any of these** (grepped every public-facing component and page), so a blanket staff gate is safe
  and correct here, unlike `/api/customers`. Verified all ~17 admin call sites across these five
  route groups already send `Authorization` (most via the `authenticatedJsonHeaders` helper).

**Verification done before closing this task:**
1. `npx tsc --noEmit` and `npx eslint` on every touched file — clean (pre-existing warnings/errors
   elsewhere in `admin/page.tsx` and `profile/page.tsx` confirmed via `git stash` to predate this
   work).
2. `npx tsx scratch/pricecheck.ts`, `scratch/billingcheck.ts`, `scratch/identitycheck.ts` — all pass.
3. Grepped every current call site of every touched route to confirm headers match what each route
   now requires — not just the sites a given commit's diff happened to touch.

**Still open, deliberately out of scope for this task:**
- `GET /api/inventory/products/sales` and `GET /api/customers` (the full-list branch) stay
  staff-scoped but their own callers were reviewed only for the routes' *mutating* methods; a wider
  audit of every `GET` in the app was not undertaken.
- Manually click through the full admin booking lifecycle (create → approve → reject → checkout →
  edit) and the patient OTP login/registration flow in a browser — not possible in this pass.

**Original diagnosis, kept for reference:**

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
7. **Update the matching manual-test checklist in the same commit as every micro-task.** Use
   `FINANCE_PHASE_1_MANUAL_TESTS.md`, `FINANCE_PHASE_2_MANUAL_TESTS.md`,
   `FINANCE_PHASE_3_MANUAL_TESTS.md`, `FINANCE_PHASE_4_MANUAL_TESTS.md`, or
   `FINANCE_PHASE_5_MANUAL_TESTS.md`; record the test date, environment, IDs/fixture, and result
   after each manual verification. A phase is not fully tested until its checklist is complete.

---

## Open questions

| Question | Needed by | Status |
|---|---|---|
| VAT treatment — medical services exempt vs retail products taxable | Phase 1 | Awaiting the clinic's accountant. Design works either way (DEC-021) |
| Cutover date for exact data | End of Phase 2 | Decide nearer the time; should be the first day of a month (DEC-020) |
| Currency configuration | Phase 4 | `EGP` is a hardcoded string throughout; belongs in `src/config/client.ts` per PROPOSAL-001 |
| Whether `admin_roles` / `employees` tables are live or dead | Phase 0.0 | Unknown — found in the live DBs, in no migration and no doc |

---

# Phase 1 — Financial Ledger Spine

> ## ✅ Phase 2–5 now broken into micro-tasks (2026-07-26) — read this before writing code
>
> The pause note below (kept, struck through, for the reasoning) asked for Phase 2, 3, 4 and 5 to
> be broken into the same kind of tracked micro-tasks Phase 1 already had, before any more
> implementation code is written. That breakdown is now done — see "Phase 2 — Cost of Delivery",
> "Phase 3 — Overheads, Assets, Liabilities", "Phase 4 — Reporting Engine + UI" and "Phase 5 —
> Capacity & Optimization" below. **Code execution may now resume**, picking up wherever it is
> genuinely needed most — which may still be finishing 1.10's live verification (see that section)
> rather than starting Phase 2 tasks in strict numeric order. Dependency columns in each phase's
> task table say what must exist first; they do not mandate a stricter order beyond that.
>
> **Note on how this section came to exist:** two sessions independently wrote this same Phase 2–5
> breakdown in parallel from the same starting point and both tried to push. The version merged
> into this file is primarily the more detailed of the two, plus one addition grafted in from the
> other during reconciliation — task 2.15 (`service_devices`), which closes a real gap: task 2.9's
> `costPerPulse()` was defined in both drafts but never actually called anywhere without it. If a
> task here references something that seems to assume a different numbering than you expected,
> this merge is why — the task table and dependency columns are the source of truth, not memory of
> either original draft.
>
> ~~On explicit user instruction, code execution stopped after task 1.10 (checkout invoice
> dual-write — see that section for its exact unfinished state) mid-way through. The next
> session's first job is NOT to keep writing Phase 1 code. It is to break Phase 2, 3, 4 and 5
> into the same kind of tracked micro-tasks this file already has for Phase 1 — see each phase's
> outline in `PROPOSALS.md` for the starting material. Only once all five phases are broken down
> this way should code execution resume, picking up wherever it is genuinely needed most (which
> may still be finishing 1.10's live verification — see that section — not necessarily Phase 2).~~
>
> This mirrors why Phase 0 was broken into 0.0–0.10 before any of it was touched, and why Phase 1
> was broken into 1.1–1.16 before that session wrote a single migration: planning the whole unit
> first is what let each individual task stay small, reviewable, and safe to hand to a different
> model without re-deriving context.

> **Status as of 2026-07-26: WIP.** Broken into micro-tasks below so any model — a fresh
> session, a different AI, a human — can pick up exactly one task, know precisely what file to
> touch and why, and leave the tracker in a state where the next task is equally clear. Do not
> skip ahead: later tasks depend on earlier ones existing, and the dependency column says which.
>
> **Read before starting any 1.x task:** `PROPOSALS.md` → PROPOSAL-002 Phase 1 (the target shape) ·
> `DECISIONS.md` → DEC-021 (tax-inclusive pricing), DEC-023 (packages/deferred revenue), DEC-024
> (opening balances), DEC-025 (package expiry), DEC-026 (no backfill — all current data is mock).
>
> **Ground rule carried over from Phase 0, non-negotiable here too:** every schema task updates
> `DB_SCHEMA.md` **in the same commit** (CLAUDE.md hard rule 6). Every new table **explicitly
> enables RLS with no policies** (service-role-only) — money tables are never touched from the
> browser. Never mark a row `DONE` without having run `npx tsc --noEmit`, `npx eslint` on the
> touched files, and (where pure logic was added) a `scratch/*.ts` regression script, exactly the
> pattern used throughout Phase 0.

## Phase 1 task table

| ID | Task | Depends on | Status | Owner | Commit |
|---|---|---|---|---|---|
| 1.1 | Migration: `invoices` table | — | `DONE` | Claude | `864d750` |
| 1.2 | Migration: `invoice_lines` table | 1.1 | `DONE` | Claude | `864d750` |
| 1.3 | Migration: `payments` table | 1.1 | `DONE` | Claude | `864d750` |
| 1.4 | Migration: `wallet_txns` table | 1.1 | `DONE` | Claude | `864d750` |
| 1.5 | Migration: `packages` + `package_items` tables | — | `DONE` | Claude | `864d750` |
| 1.6 | Migration: `customer_packages` + `customer_package_items` tables, backfill `invoice_lines.package_id` FK | 1.2, 1.5 | `DONE` | Claude | `864d750` |
| 1.7 | Library: `src/lib/ledger.ts` — invoice/line/payment builders (pure functions) | 1.1–1.4 (schema shape only, no runtime dependency) | `DONE` | Claude | `see 1.7-1.9 below` |
| 1.8 | Library: `src/lib/packages.ts` — deferred-revenue recognition math (pure functions) | 1.5, 1.6 (schema shape only) | `DONE` | Claude | `see 1.7-1.9 below` |
| 1.9 | Regression checks for 1.7 and 1.8 | 1.7, 1.8 | `DONE` | Claude | `see 1.7-1.9 below` |
| 1.10 | Wire booking checkout (`PATCH /api/reservations`, `status: 'completed'`) to dual-write an invoice | 1.1–1.4, 1.7 | `DONE` | Claude | `aed3793` |
| 1.11 | Wire POS sale (`POST /api/inventory/products/sales`) to dual-write an invoice | 1.1–1.4, 1.7 | `DONE` | Claude | `58fe1dc` |
| 1.12 | New endpoint: sell a package (`POST /api/packages/sell` or similar) | 1.5, 1.6, 1.8 | `WIP` — code written; pending live package-sale verification | Claude | — | — |
| 1.13 | New endpoint: consume a package session, recognise revenue pro-rata | 1.12 | `WIP` — migration applied to dev; pending live endpoint verification | Claude | — |
| 1.14 | `src/lib/customerBalances.ts` — derive `outstanding`/`spent_amount`/`wallet_balance` from the ledger + reconciliation endpoint | 1.1–1.4, 1.10, 1.11 | `TODO` | — | — |
| 1.15 | Opening-balance import (DEC-024) | 1.1, 1.3, 1.4, 1.6 | `TODO` | — | — |
| 1.16 | `API_CONTRACT.md` update for every new/changed endpoint | rolling, alongside 1.10–1.15 | `TODO` | — | — |

**"Dual-write" in 1.10/1.11 means additive, not a cutover.** The existing `amount_paid` /
`amount_left` / `customers.spent_amount` writes keep running exactly as today; the new ledger
tables get written to *in parallel*. Nothing existing can regress, because nothing existing is
being removed yet. The cutover — making the old columns *derived* instead of independently
written — is 1.14, done only once the ledger has been proven correct by real data flowing through
1.10/1.11. This mirrors how `20260725160000` added `product_sales.customer_id` without touching
any existing column, and how the reservations PATCH gate in 0.10 was reverted and rebuilt rather
than shipped half-working — small reversible steps, not a flag-day rewrite of money-handling code.

---

## 1.1 — Migration: `invoices`

**What:** new table, the anchor every other Phase 1 table hangs off.
**Where:** `supabase/migrations/<timestamp>_create_invoices.sql`

```sql
CREATE TABLE IF NOT EXISTS public.invoices (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no      text UNIQUE NOT NULL,
  reservation_id  uuid REFERENCES public.reservations(id) ON DELETE SET NULL,
  customer_id     uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  branch_id       uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  issued_at       timestamptz NOT NULL DEFAULT now(),
  subtotal        numeric NOT NULL DEFAULT 0,
  discount_total  numeric NOT NULL DEFAULT 0,
  grand_total     numeric NOT NULL DEFAULT 0,
  status          text NOT NULL DEFAULT 'issued' CHECK (status IN ('draft','issued','void')),
  is_opening      boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS public.invoice_no_seq START 1;

CREATE INDEX IF NOT EXISTS invoices_customer_id_idx ON public.invoices (customer_id);
CREATE INDEX IF NOT EXISTS invoices_reservation_id_idx ON public.invoices (reservation_id);
CREATE INDEX IF NOT EXISTS invoices_issued_at_idx ON public.invoices (issued_at);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
```

**Why `reservation_id` is nullable:** a retail-only POS sale (no booking involved) still needs an
invoice. Why `grand_total` has no separate tax column: DEC-021 — prices are stored tax-inclusive
with `tax_rate` on the *line*, not the invoice; a tax split is always derivable
(`tax = gross × rate / (1 + rate)`) without needing it stored redundantly at invoice level.
`invoice_no` is generated in application code as `'INV-' || lpad(nextval(...)::text, 6, '0')` —
keep the sequence in SQL (gap-free-enough, no race condition) but the formatting in TypeScript,
matching this codebase's existing style of app-generated human-readable IDs (`REP-<timestamp>`,
`sale-<timestamp>-<rand>`) rather than a Postgres-side formatting function.

**Update `DB_SCHEMA.md` in the same commit:** add an `### invoices` section under a new
`## Phase 1 — Financial Ledger` heading (create it if this is the first Phase 1 table documented),
following the exact column-table format used for every other table in that file.

**Verify:** `npx supabase db diff --linked` after running the migration shows only this table added.
Mark `DONE` here and give the commit hash; mark `NEEDS-DB` if the migration file is written but not
yet run against dev, and say so explicitly — do not leave the row ambiguous.

---

## 1.2 — Migration: `invoice_lines`

**Depends on 1.1.** **Where:** `supabase/migrations/<timestamp>_create_invoice_lines.sql`

```sql
CREATE TABLE IF NOT EXISTS public.invoice_lines (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id           uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  line_type            text NOT NULL CHECK (line_type IN ('service','product','package')),
  service_id           bigint REFERENCES public.services(id) ON DELETE SET NULL,
  product_id           text REFERENCES public.inventory_products(id) ON DELETE SET NULL,
  package_id           uuid,  -- FK added in 1.6, once public.packages exists
  description          text NOT NULL,
  qty                  numeric NOT NULL DEFAULT 1,
  unit_price           numeric NOT NULL DEFAULT 0,
  discount             numeric NOT NULL DEFAULT 0,
  tax_rate             numeric NOT NULL DEFAULT 0,
  line_total           numeric NOT NULL DEFAULT 0,
  cogs_snapshot        numeric,
  commission_snapshot  numeric,
  provider_id          uuid REFERENCES public.providers(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invoice_lines_invoice_id_idx ON public.invoice_lines (invoice_id);
CREATE INDEX IF NOT EXISTS invoice_lines_provider_id_idx ON public.invoice_lines (provider_id);

ALTER TABLE public.invoice_lines ENABLE ROW LEVEL SECURITY;
```

**Why `package_id` has no FK constraint yet:** `public.packages` does not exist until 1.5/1.6, and
migrations run in order — this is the same pattern used for `product_sales.customer_id`
(`20260725160000`), added by `ALTER TABLE` once the referenced table exists. **Task 1.6 must add
the FK constraint** (`ALTER TABLE invoice_lines ADD CONSTRAINT ... FOREIGN KEY (package_id)
REFERENCES packages(id) ON DELETE SET NULL`) — do not forget this or the column is silently
unenforced forever.

**Why `cogs_snapshot`/`commission_snapshot` are nullable, not `NOT NULL DEFAULT 0`:** Phase 1 alone
cannot populate them correctly — COGS needs Phase 2's `service_consumables` recipe and
commission needs a doctor's contract terms applied at issue time. A `NULL` here honestly says "not
yet costed," which is different from a `0` meaning "this line genuinely has no cost." Do not
default these to 0 in 1.10/1.11; leave them `NULL` until Phase 2 wires real values in.

**Update `DB_SCHEMA.md`:** add `### invoice_lines` under the same Phase 1 heading, and note the
FK caveat above so nobody "fixes" the missing constraint by mistake before 1.6.

---

## 1.3 — Migration: `payments`

**Depends on 1.1.** **Where:** `supabase/migrations/<timestamp>_create_payments.sql`

```sql
CREATE TABLE IF NOT EXISTS public.payments (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id               uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  received_at              timestamptz NOT NULL DEFAULT now(),
  amount                   numeric NOT NULL,
  method                   text NOT NULL DEFAULT 'cash'
                             CHECK (method IN ('cash','card','wallet','instapay','transfer')),
  received_by_employee_id  uuid REFERENCES public.employee_accounts(id) ON DELETE SET NULL,
  reference                text,
  is_opening               boolean NOT NULL DEFAULT false,
  created_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payments_invoice_id_idx ON public.payments (invoice_id);
CREATE INDEX IF NOT EXISTS payments_received_at_idx ON public.payments (received_at);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
```

**Why this table exists at all — the thing it fixes:** today `reservations.amount_paid` is one
mutable number, so a booking paid in two installments (a deposit, then the remainder weeks later)
can never show *when* each part was paid or *how* (cash vs card vs wallet). `payments` is one row
per receipt. `SUM(amount) WHERE invoice_id = X` reconstructs the running total; the individual rows
give the history that a single column structurally cannot.

**Update `DB_SCHEMA.md`:** add `### payments`.

---

## 1.4 — Migration: `wallet_txns`

**Depends on 1.1.** **Where:** `supabase/migrations/<timestamp>_create_wallet_txns.sql`

```sql
CREATE TABLE IF NOT EXISTS public.wallet_txns (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  occurred_at  timestamptz NOT NULL DEFAULT now(),
  direction    text NOT NULL CHECK (direction IN ('in','out')),
  amount       numeric NOT NULL CHECK (amount > 0),
  reason       text NOT NULL,
  invoice_id   uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  is_opening   boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wallet_txns_customer_id_idx ON public.wallet_txns (customer_id);

ALTER TABLE public.wallet_txns ENABLE ROW LEVEL SECURITY;
```

**Why this fixes RISK-012/016 permanently, not just patches it:** `customers.wallet_balance` is
today overwritten with a computed scalar on every checkout (fixed to use deltas in `billing.ts`,
task 0.5) — but top-ups, spends and change-deposits are still indistinguishable after the write.
`wallet_txns` is one row per movement; `wallet_balance` becomes `SUM(CASE WHEN direction='in' THEN
amount ELSE -amount END)`, auditable and reconstructable, not just correctly-computed-going-forward.

**Update `DB_SCHEMA.md`:** add `### wallet_txns`.

---

## 1.5 — Migration: `packages` + `package_items`

**No dependency on 1.1–1.4** (can be done in parallel with them).
**Where:** `supabase/migrations/<timestamp>_create_packages.sql`

```sql
CREATE TABLE IF NOT EXISTS public.packages (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL,
  branch_id        uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  price            numeric NOT NULL DEFAULT 0,
  tax_rate         numeric NOT NULL DEFAULT 0,
  validity_days    integer NOT NULL DEFAULT 90,
  on_expiry        text NOT NULL DEFAULT 'extend'
                     CHECK (on_expiry IN ('recognise_revenue','extend')),
  extension_days   integer,
  active           boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.package_items (
  package_id  uuid NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  service_id  bigint NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  qty         integer NOT NULL DEFAULT 1,
  PRIMARY KEY (package_id, service_id)
);

ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_items ENABLE ROW LEVEL SECURITY;
```

**`branch_id` nullable** = package sellable at every branch when unset, matching how `providers`
and `reservations` already treat a null branch as "not branch-restricted."
**`on_expiry`/`extension_days`** implement DEC-025 (breakage-vs-extend) as a per-package default;
task 1.13's per-customer manual extend action overrides this default when used.

**Update `DB_SCHEMA.md`:** add `### packages` and `### package_items`.

---

## 1.6 — Migration: `customer_packages` + `customer_package_items`, backfill the `invoice_lines.package_id` FK

**Depends on 1.2, 1.5.** **Where:** `supabase/migrations/<timestamp>_create_customer_packages.sql`

```sql
CREATE TABLE IF NOT EXISTS public.customer_packages (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id               uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  package_id                uuid REFERENCES public.packages(id) ON DELETE SET NULL,
  invoice_id                uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  purchased_at              timestamptz NOT NULL DEFAULT now(),
  expires_at                timestamptz,
  price_paid                numeric NOT NULL DEFAULT 0,
  status                    text NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active','expired','fully_used')),
  is_opening                boolean NOT NULL DEFAULT false,
  extended_by_employee_id   uuid REFERENCES public.employee_accounts(id) ON DELETE SET NULL,
  extended_at               timestamptz,
  created_at                timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.customer_package_items (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_package_id    uuid NOT NULL REFERENCES public.customer_packages(id) ON DELETE CASCADE,
  service_id             bigint NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  qty_total              integer NOT NULL DEFAULT 0,
  qty_used               integer NOT NULL DEFAULT 0,
  qty_remaining          integer NOT NULL DEFAULT 0,
  created_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_packages_customer_id_idx ON public.customer_packages (customer_id);
CREATE INDEX IF NOT EXISTS cpi_customer_package_id_idx ON public.customer_package_items (customer_package_id);

ALTER TABLE public.customer_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_package_items ENABLE ROW LEVEL SECURITY;

-- Backfill the FK deferred in 1.2, now that packages exists.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoice_lines_package_id_fkey'
  ) THEN
    ALTER TABLE public.invoice_lines
      ADD CONSTRAINT invoice_lines_package_id_fkey
      FOREIGN KEY (package_id) REFERENCES public.packages(id) ON DELETE SET NULL;
  END IF;
END $$;
```

**Update `DB_SCHEMA.md`:** add `### customer_packages` and `### customer_package_items`; edit the
`invoice_lines.package_id` row to remove the "FK added later" caveat now that it's true.

**Verify all of 1.1–1.6 together:** `npx supabase db diff --linked` shows exactly these 8 tables
added and nothing else; re-run `npx tsx scratch/pricecheck.ts`, `billingcheck.ts`, `identitycheck.ts`
to confirm nothing in Phase 0's work was disturbed (none of these migrations touch existing tables,
so this should trivially pass — running it is the check that it actually is trivial).

---

## 1.7 — Library: `src/lib/ledger.ts` — DONE

Implemented as planned: `formatInvoiceNo`, `buildInvoiceLine`, `buildInvoiceTotals`, `taxPortion`.
One deviation worth noting — `buildInvoiceLine` **throws** on `qty <= 0` or `unitPrice < 0` rather
than silently accepting them, matching the "throw on nonsense input" convention `computeSettledBalances`
(task 0.5) and `resolveBranchName` (task 0.2/0.3) already established.

---

## 1.8 — Library: `src/lib/packages.ts` — DONE

Implemented with one addition beyond the original plan and one corrected formula:

- **Added `recognisedRevenueSoFar(pricePaid, qtyUsed, qtyTotal)`** — not in the original spec.
  Needed once `deferredBalance` was rewritten (see below) to be its counterpart.
- **`deferredBalance` does NOT use the formula originally specified here**
  (`pricePaid * qtyRemaining / qtyTotal`). That formula rounds independently from
  `recognisedRevenuePerSession` and can drift by a cent — caught by the regression check in 1.9
  on the very first run (see below). `deferredBalance` now computes the **complement**:
  `pricePaid − recognisedRevenueSoFar(...)`, which guarantees the two numbers always sum to
  `pricePaid` exactly, by construction rather than by hoping two roundings cancel out.
- `resolveExpiry`'s second parameter is `currentExpiresAt: Date`, not a `customerPackage` object
  — simpler, and the caller already has the date without needing to pass a wrapper object.

**Update `DB_SCHEMA.md`:** the `customer_package_items` section's formula note was rewritten to
describe the complement-based approach and explain why the naive one is wrong.

---

## 1.9 — Regression checks for 1.7/1.8 — DONE

`scratch/phase1ledgercheck.ts` (13 cases) and `scratch/phase1packagecheck.ts` (15 cases),
kept as two files per the established one-concern-per-script convention.

**This is not a formality — the package check caught a real bug on its first run.** The initial
`deferredBalance` implementation (`pricePaid * qtyRemaining / qtyTotal`, exactly as originally
specified in this tracker) produced, for a 1000 EGP / 6-session package with 2 sessions delivered:
`recognised = round(166.67 × 2) = 333.34` and `deferred = round(1000 × 4/6) = 666.67`, summing to
**1000.01** — one cent created from nowhere. Fixed by deriving `deferredBalance` as the complement
of `recognisedRevenueSoFar` instead of computing it independently; see 1.8 above. The corrected
check now asserts `recognised + deferred === price_paid` exactly and would fail loudly if this
regresses.

**Update `DB_SCHEMA.md`:** done as part of 1.8's entry above.

---

## 1.10 — Wire booking checkout to dual-write an invoice — DONE, fully live-verified

> This task's two remaining edge cases (repeat payment on an already-completed booking, and a
> no-customer checkout) were listed below as "follow-up observations, do not block completion" —
> reasonable at the time, but they were still unverified theory, not measured fact. Both were
> exercised live against dev on 2026-07-26 (see the added evidence below and
> `FINANCE_PHASE_1_MANUAL_TESTS.md`'s 1.10 rows) using a real staff session
> (`mohamed.zaky.anwar@gmail.com`, `superadmin`) obtained via `scratch/get_session_token.ts`
> against the deployed `dev.reveraclinics.com` environment — not just the pure functions or a
> single first-completion case.

**Done:**
- `writeCheckoutInvoice()` and `appendPaymentToExistingInvoice()` implemented in
  `src/app/api/reservations/route.ts`, called from the settlement block, additive only —
  confirmed by reading the diff that `computeSettledBalances` and the existing
  `reservations.amount_paid`/`customers.spent_amount` writes are byte-for-byte unchanged.
- A new migration, `20260726010600_create_next_invoice_no_rpc.sql`, wrapping `nextval()` in a
  `next_invoice_no()` RPC — PostgREST cannot call the built-in `nextval()` directly, and reading
  "last invoice_no + 1" client-side would race under concurrent checkouts. Applied to dev and
  verified with `npx supabase db diff --linked` (no schema changes found).
- Distinguishes first-time completion (writes a full invoice + service lines + payment) from a
  later debt payment on an already-completed booking (appends one more `payments` row to the
  *existing* invoice for that reservation, found by `reservation_id`, rather than creating a
  second invoice with duplicate service lines).
- `npx tsc --noEmit` clean, `npx eslint` clean, and all five `scratch/*.ts` regression scripts
  (`pricecheck`, `billingcheck`, `identitycheck`, `phase1ledgercheck`, `phase1packagecheck`)
  still pass — these test the pure functions this code calls, not this route in isolation.
- **Live dev checkout verified 2026-07-26:** completing reservation
  `2e03f8ea-e88d-4923-8b1c-5a27e0efeb3d` created issued invoice `INV-000001`, two service lines
  (`100 + 120 = 220`), and one cash payment of `100`. The post-checkout reservation reports
  `amount_paid = 100` and the customer reports `spent_amount = 100`; together with the separate
  settlement and ledger-write paths in the handler, this confirms the ledger write did not replace
  the existing settlement path.

**Follow-up observations (do not block completion):**
- The verified booking's legacy `amount_left = 900` and customer `outstanding = 1860` do not match
  its new ledger-derived unpaid amount (`220 − 100 = 120`). This is an expected two-sources-of-truth
  observation before task 1.14's cutover, not a reason to mutate the old scalars here; retain it as
  reconciliation evidence for 1.14.
- `received_by_employee_id` on both the initial payment and the later-payment path is currently
  always `null` — the PATCH body carries no "who is processing this checkout" field today
  (`createdByEmployeeId` is a different thing, the booking's original creator). Attributing
  cashier identity needs either a new request field or reading it from the auth token
  (`requireStaffAccess`'s result is validated but discarded earlier in this handler, not
  currently threaded through to here). **Still open** — the two live checks below confirm this by
  observation (`received_by_employee_id: null` on both payment rows), not just by reading the code.
- Invoice writing is scoped inside `if (isSettlement && target.customer_id)` — a checkout with no
  linked customer record produces no invoice. This matches the existing scope of the customer
  balance settlement code right above it, but is worth a deliberate decision later, not an
  accident to discover. **Verified live 2026-07-26 and approved as-is** — see below.

**Live-verified 2026-07-26 (the two remaining checklist items from `FINANCE_PHASE_1_MANUAL_TESTS.md`):**
- **Repeat payment on an already-completed booking:** `PATCH /api/reservations?id=2e03f8ea-…`
  with `amountPaid: 150` (was `100`) against the already-completed booking from the first live
  check above. Result: one new `payments` row of `50` (the delta) attached to the **same**
  `INV-000001`; `invoice_lines` unchanged at 2 rows; exactly 1 invoice still exists for the
  reservation. Confirms `appendPaymentToExistingInvoice()` does what its name says — no duplicate
  invoice, no duplicate service lines.
- **Checkout with no linked customer:** inserted a disposable reservation with `customer_id: null`
  (`4e909f1f-cc2f-4a08-9afb-5fbd712d979c`), then completed it via the same staff session
  (`amountPaid: 100`). Response was a clean `200`, no error thrown. `invoices` for that reservation
  is `[]` — confirms the `if (isSettlement && target.customer_id)` gate behaves exactly as
  documented: the checkout still succeeds, it just produces no ledger row. **Approved as the
  intended behavior for now** — a walk-in/no-customer checkout getting its own invoice (with no
  customer to bill) is a real product decision, not a bug, and is deferred rather than assumed.

**Depends on 1.1–1.4, 1.7.** **Where:** `src/app/api/reservations/route.ts`, the
`status === 'completed'` branch (the same block task 0.5's `computeSettledBalances` call lives in).

**What:** when a booking transitions to `completed`, additionally:
1. Build invoice lines from `serviceIds`/`service_id` and their resolved price
   (`getEffectiveServicePrice`, task 0.2/0.3's fixed version), via `buildInvoiceLine`.
2. `INSERT` into `invoices` (with `reservation_id`, `customer_id`, `branch_id`), then
   `invoice_lines`, then a `payments` row for `amountPaid` if positive.
3. **Do not remove or change** the existing `computeSettledBalances` call or the
   `reservations.amount_paid`/`amount_left` writes — those keep running exactly as before. This
   step is additive only, per the dual-write note at the top of this Phase 1 section.
4. Wrap the ledger writes so a failure **does not fail the checkout itself** — log the error and
   return the existing checkout response unchanged; a missing invoice can be reconciled later, but
   a checkout that silently fails because ledger-writing broke would be a new, worse regression
   than the one this phase is fixing. (This tension — ledger writes should eventually be
   authoritative, not best-effort — is exactly why 1.14's cutover is a separate, later step done
   only once this has been proven reliable.)

**Update `DB_SCHEMA.md`:** none (no schema change). **Update `API_CONTRACT.md`** to note that a
completed checkout now also produces an invoice — document the response shape if it changes (it
should not; this is a side effect, not a new field).

**Verify:** complete a real booking checkout against dev (or as close to end-to-end as this
environment allows) and confirm a matching `invoices`/`invoice_lines`/`payments` row exists,
*and* confirm `reservations.amount_paid` and `customers.spent_amount` are unchanged from Phase 0's
behavior — this task must be provably zero-regression on the existing path.

---

## 1.11 — Wire POS sale to dual-write an invoice — DONE, fully live-verified

**Done:** `POST /api/inventory/products/sales` now writes an issued invoice, one product line, and
one payment row after the native `product_sales` insert succeeds. It uses the authenticated staff
member's `employee_accounts.id` for `received_by_employee_id`, resolves `branch_name` to the
optional branch UUID, and maps the existing POS payment method into the payments-table enum. The
invoice write is additive and best-effort: the established product-sale, stock-deduction, and
`addToCustomerSpend` paths continue unchanged if it fails. `API_CONTRACT.md` documents the side
effect.

**Live-verified 2026-07-26** against deployed dev (`dev.reveraclinics.com`) using a real staff
session — see `FINANCE_PHASE_1_MANUAL_TESTS.md` for the full evidence. A real sale (qty 2, branch
name, card payment) produced exactly the expected `product_sales`/`stock_movements`/`invoices`/
`invoice_lines`/`payments` rows, with `received_by_employee_id` correctly attributed to the real
signed-in staff member — notably **better** than the reservations-checkout path (task 1.10), where
that field is still always `null`.

**Found and fixed RISK-022 while testing this task's last checklist item** ("force a ledger-write
failure, confirm the native sale still succeeds"): a non-existent `customer_id` didn't just fail
the ledger dual-write — it failed the **native** `product_sales` insert too (an FK violation),
silently fell through to the `page_settings` blob while still reporting `success: true`, and
deducted real stock for a sale that then became permanently invisible in sales history. Fixed by
validating `customer_id` exists before any write, in the same commit as this verification. See
`RISKS.md` RISK-022 for the full writeup, including a second, related-but-unfixed bug found in the
process (the `page_settings` fallback silently discards its own prior entries on repeated
failures — not triggerable via this specific path anymore, but still broken for other causes of a
failed native insert).

**Depends on 1.1–1.4, 1.7.** **Where:** `src/app/api/inventory/products/sales/route.ts`, the
`POST` handler, after the existing `product_sales` insert (`mapSaleToDbRow`/`insertedDb`).

**Verify:** run a real POS sale against dev and confirm the additive ledger rows use the expected
product, quantity, unit price, customer, optional branch, payment method, and receiving employee.

---

## 1.12 — New endpoint: sell a package — WIP, needs live verification

**Done:** `POST /api/packages/sell` is staff-only and accepts `customerId`, `packageId`, and an
optional `branchId`. It validates the active package, customer, package-item quantities, and any
branch restriction; creates the package invoice, line, payment, package entitlement, and one
entitlement item per configured package service. It derives invoice totals from the configured
package price/tax rate and sets package expiry from `validity_days`. The endpoint cleans up its
newly-created package/invoice records when a later write fails. `API_CONTRACT.md` documents the
request and response.

**Not done:** it has not been exercised against a live package sale. Do not mark this task `DONE`
until one sale creates the expected invoice, payment, customer-package, and entitlement-item rows,
with the configured branch restriction and expiry verified.

**Depends on 1.5, 1.6, 1.8.** **Where:** `src/app/api/packages/sell/route.ts`.

**Books cash received, not revenue** — the invoice line's `line_total` is the sale amount, but
per DEC-023 no portion of it is "earned" yet; that only happens in 1.13, per session delivered.

---

## 1.13 — New endpoint: consume a package session — WIP, needs live verification

**Implementation update (2026-07-26):** recognition is a durable
`package_revenue_recognitions` event, never a second customer-facing invoice. The new
`20260726010700_create_package_revenue_recognitions.sql` migration adds the event ledger and
transactional `consume_customer_package_session(...)` RPC. `POST /api/packages/consume` verifies
that the completed reservation belongs to the same customer and includes the entitled service before
calling it; `POST /api/packages/extend` records a manual future expiry and the responsible employee.
The new unique item/reservation pair prevents duplicate consumption. The migration was applied to
linked dev on 2026-07-26; `supabase migration list --linked` matches local/remote through
`20260726010700`, and `supabase db diff --linked` found no schema changes. Live endpoint flows must
still be tested before this task can be marked `DONE`.

**Depends on 1.12.** **Where:** new route, or a new action on an existing one — again use
judgement on the exact shape, document the choice.

**What:** consume one entitled service session only after its matching reservation is completed.
The transactional RPC increments `qty_used`, decrements `qty_remaining`, creates one
`package_revenue_recognitions` event, and marks the package `fully_used` when no entitlement remains.
It calculates each event as the delta between complement-safe recognised totals, so final-session
rounding can never over-recognise the package price. The manual extend endpoint sets a future
`expires_at`, restores an expired package to active, and records the staff member/time.

**Update `API_CONTRACT.md`.**

**Verify:** after applying the migration, sell a 6-session package for 1000 EGP, consume two
completed matching reservations, and confirm recognised plus deferred remains exactly 1000. Reject
duplicate, expired, exhausted, customer-mismatched, and service-mismatched consumption; verify a
manual extension records `expires_at`, `extended_by_employee_id`, and `extended_at`.

---

## 1.14 — Derive customer balances from the ledger

**Depends on 1.1–1.4, and real data flowing through 1.10/1.11 for at least a trial period —
do not attempt this the same day as 1.10/1.11.** **Where:** new `src/lib/customerBalances.ts`,
plus a reconciliation endpoint (e.g. `POST /api/customers/reconcile` or per-customer on read).

**What:** pure functions computing `outstanding`/`spent_amount`/`wallet_balance` from
`SUM()` queries over `invoices`/`payments`/`wallet_txns`, matching the intent of
`computeSettledBalances` (task 0.5) but sourced from the ledger instead of applied as deltas to a
stored scalar. **This is the cutover** — once trusted, this replaces the direct writes in 0.5's
settlement code and in 1.10/1.11's `addToCustomerSpend`-style calls. Until this task, those direct
writes are still the source of truth; do not read from the ledger for anything user-facing before
this task is done and verified, or the two sources of truth can disagree silently.

**Update `DB_SCHEMA.md`:** note on the `customers` table that `outstanding`/`spent_amount`/
`wallet_balance` are now derived-and-cached (or fully computed on read — decide which at
implementation time and document it), not independently written.

**Verify:** for every customer in dev, the ledger-derived balance must equal the
delta-maintained scalar balance before cutover — write this comparison as a one-off script, not a
permanent regression check (it's a migration-correctness check, not ongoing behavior).

---

## 1.15 — Opening-balance import (DEC-024)

**Depends on 1.1, 1.3, 1.4, 1.6.** **Where:** new admin-only endpoint or a one-time script —
this runs once per clinic at setup, not routinely, so a script under `scratch/` invoked manually
by staff/an operator is defensible instead of a full UI, at least for the first clinic.

**What:** for each opening balance (cash, patient receivables, wallet credit, undelivered package
sessions, supplier payables, asset book values, loan remaining balances — the full list is in
`PROPOSALS.md`'s "Data a clinic must supply at setup"), write into the **same ledgers** as normal
operation with `is_opening = true` and a shared `as_of` date. **Patient receivables must come from
a physical audit, never from the current `customers.outstanding` column** — DEC-024 is explicit
that column is not trustworthy as verified opening data (RISK-012's legacy, even after the 0.5 fix,
because pre-0.5 data may already be wrong).

**Update `DB_SCHEMA.md` and `API_CONTRACT.md`** if a real endpoint is built rather than a script.

---

## 1.16 — `API_CONTRACT.md` rollup

Not a separate implementation task — a checklist to run once 1.10–1.15 are done, confirming every
new/changed endpoint from this phase is documented there, not just described in this tracker.
Close this out last.

---

# Phase 2 — Cost of Delivery

> **Do not start Phase 2 before Phase 1 is genuinely done** (task 1.10's live verification at
> minimum — see that section). Phase 2's `cogs_snapshot`/`commission_snapshot` writes land inside
> the same checkout code path 1.10 built; building on top of unverified code compounds the risk
> instead of containing it (DEC-019).
>
> **Read before starting any 2.x task:** `PROPOSALS.md` → PROPOSAL-002 Phase 2 (the target shape) ·
> `RISKS.md` → RISK-013 (double stock deduction, still has an open concurrency issue), RISK-014,
> RISK-015 (doctor cost attribution by name string), RISK-016 (two conflicting revenue
> definitions) · `DECISIONS.md` → DEC-016 (consumable recipe, editable at completion), DEC-018
> (per-doctor configurable commission with an explicit base), DEC-021 (tax-inclusive prices,
> product dual role).
>
> **Ground rule carried over from Phase 0/1, non-negotiable here too:** every schema task updates
> `DB_SCHEMA.md` **in the same commit** (CLAUDE.md hard rule 6). Every new table **explicitly
> enables RLS with no policies**. Never mark a row `DONE` without `npx tsc --noEmit`, `npx eslint`
> on touched files, and (where pure logic was added) a `scratch/*.ts` regression script.

## Phase 2 task table

| ID | Task | Depends on | Status | Owner | Commit |
|---|---|---|---|---|---|
| 2.1 | Migration: `inventory_products.role` column | — | `DONE` — applied dev | Claude | pending commit |
| 2.2 | Migration: `service_consumables` table (recipe/BOM) | — | `DONE` — applied dev | Claude | pending commit |
| 2.3 | Migration: `consumption_entries` table | 2.2 | `DONE` — applied dev | Claude | pending commit |
| 2.4 | Migration: `stock_movements` table | — | `DONE` — applied dev | Claude | pending commit |
| 2.5 | Migration: `suppliers` table | — | `DONE` — applied dev | Claude | pending commit |
| 2.6 | Migration: `purchases` + `purchase_lines` tables | 2.5, 2.4 | `DONE` — applied dev | Claude | pending commit |
| 2.7 | Migration: `inventory_devices.lamp_replacement_cost` column | — | `DONE` — applied dev | Claude | pending commit |
| 2.8 | Migration: provider commission config | — | `DONE` — applied dev | Claude | pending commit |
| 2.9 | Library: `src/lib/costing.ts` — consumption cost, pulse cost, commission math | 2.1–2.8 | `DONE` | Claude | pending commit |
| 2.10 | Regression checks for 2.9 | 2.9 | `DONE` | Claude | pending commit |
| 2.11 | Checkout recipe consumption and invoice cost/commission snapshots | 1.10, 2.2, 2.3, 2.9 | `WIP` — implemented; pending live verification | Claude | pending commit |
| 2.12 | Cut `stock_quantity` over to derive from `stock_movements` | 2.4, 2.11 | `BLOCKED` — requires a trial period of reconciled movement data | — | — |
| 2.13 | `POST /api/purchases` | 2.5, 2.6 | `WIP` — implemented; pending live verification | Claude | pending commit |
| 2.14 | Doctor payroll uses `provider_id` | 0.7, 2.8, 2.9 | `WIP` — durable identity fix implemented; pending snapshot/live verification | Claude | pending commit |
| 2.15 | `service_devices` and checkout pulse cost | 2.7, 2.9, 2.11 | `WIP` — implemented; pending live verification | Claude | pending commit |
| 2.16 | `API_CONTRACT.md` rollup for Phase 2 | rolling | `WIP` — current endpoints documented; close after verification | Claude | pending commit |

**Same "additive, then cutover" discipline as Phase 1.** 2.11 is additive — it populates the two
columns Phase 1 deliberately left `NULL` (see task 1.2's note) without touching anything else on
the checkout path. 2.12 is the only genuine cutover in this phase, and it is scoped last and
separately for exactly the reason 1.14 is separate from 1.10/1.11: `stock_quantity` is read by
the live Inventory screen today, so the read path must not flip to the derived value until
`stock_movements` has been proven to reconstruct it correctly.

---

## 2.1 — Migration: `inventory_products.role`

**Where:** `supabase/migrations/<timestamp>_add_inventory_products_role.sql`

```sql
ALTER TABLE public.inventory_products
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'retail'
    CHECK (role IN ('retail', 'consumable', 'both'));
```

**Why (DEC-021):** the same stock item can be sold to a patient (`product_sales` → revenue) or
consumed inside a service (`service_consumables` → cost). Today `inventory_products` has no way
to say which — DEC-021 chose one gross tax-inclusive price per item serving both roles rather
than two pricing regimes for the same SKU. `DEFAULT 'retail'` is deliberate: every existing row is
mock POS-catalog data (DEC-026), and defaulting to the role that matches today's actual usage
(nothing currently reads this column for consumption) means the migration itself changes no
observable behavior — 2.2/2.3 are what start using it.

**Update `DB_SCHEMA.md`:** add the `role` row to the existing `### inventory_products` table.

---

## 2.2 — Migration: `service_consumables`

**Where:** `supabase/migrations/<timestamp>_create_service_consumables.sql`

```sql
CREATE TABLE IF NOT EXISTS public.service_consumables (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id   bigint NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  product_id   text NOT NULL REFERENCES public.inventory_products(id) ON DELETE CASCADE,
  standard_qty numeric NOT NULL CHECK (standard_qty > 0),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (service_id, product_id)
);

CREATE INDEX IF NOT EXISTS service_consumables_service_id_idx
  ON public.service_consumables (service_id);

ALTER TABLE public.service_consumables ENABLE ROW LEVEL SECURITY;
```

**Why (DEC-016, RISK cited: nothing links a service to what it consumes today — confirmed by grep
across `src/` and `supabase/migrations/` in the 2026-07-25 audit, PROPOSALS.md Phase 2):** this is
the recipe/BOM — "one laser session standardly uses 2 units of gel and 1 disposable tip." Without
it, per-session material cost cannot exist and P&L must fall back to unallocated monthly purchase
totals (the explicit fallback DEC-016 accepts until recipes are defined).

**Why `product_id` requires `role IN ('consumable', 'both')` is NOT a DB constraint:** enforcing it
in SQL would need a trigger or a check subquery Postgres cannot express as a plain `CHECK`.
Validate it in the API route that writes this table instead (task 2.9/2.11's caller) — reject a
`product_id` whose `role = 'retail'` with a clear error, and document the omission here so nobody
"fixes" it by adding a broken CHECK.

**Update `DB_SCHEMA.md`:** add `### service_consumables` under a new `## Phase 2 — Cost of
Delivery (PROPOSAL-002)` heading (create it if this is the first Phase 2 table documented,
following the same header style as the existing `## Phase 1 — Financial Ledger` heading).

---

## 2.3 — Migration: `consumption_entries`

**Depends on 2.2.** **Where:** `supabase/migrations/<timestamp>_create_consumption_entries.sql`

```sql
CREATE TABLE IF NOT EXISTS public.consumption_entries (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id     uuid NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  product_id         text NOT NULL REFERENCES public.inventory_products(id) ON DELETE RESTRICT,
  qty                numeric NOT NULL CHECK (qty >= 0),
  unit_cost_snapshot numeric NOT NULL DEFAULT 0,
  was_edited         boolean NOT NULL DEFAULT false,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS consumption_entries_reservation_id_idx
  ON public.consumption_entries (reservation_id);
CREATE INDEX IF NOT EXISTS consumption_entries_product_id_idx
  ON public.consumption_entries (product_id);

ALTER TABLE public.consumption_entries ENABLE ROW LEVEL SECURITY;
```

**Why `unit_cost_snapshot`, not a live join to `inventory_products.cost_price`:** same reasoning as
`invoice_lines.cogs_snapshot`/`commission_snapshot` (task 1.2) — a later cost-price edit must not
retroactively change a completed session's recorded material cost. Snapshot at consumption time.

**Why `product_id` is `ON DELETE RESTRICT`, not `SET NULL` (unlike every other product FK in this
schema):** a consumption row with no product is meaningless cost data — it cannot be assigned a
`unit_cost_snapshot` for "nothing," and a silently-orphaned cost entry would corrupt COGS totals
without anyone noticing. If this becomes a real operational problem (a product genuinely needs
deleting after being consumed historically), soft-delete `inventory_products` instead of hard
deleting it — do not weaken this constraint as a workaround.

**Why `was_edited`:** DEC-016 explicitly allows staff to edit actual quantities away from the
recipe's `standard_qty` at completion time (waste, an unusually heavy session). This flag is what
makes "variance against standard" reportable later, per DEC-016's stated reason for the hybrid
design.

**Update `DB_SCHEMA.md`:** add `### consumption_entries`.

---

## 2.4 — Migration: `stock_movements`

**No dependency on 2.1–2.3** (can be done in parallel). **Where:**
`supabase/migrations/<timestamp>_create_stock_movements.sql`

```sql
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  text NOT NULL REFERENCES public.inventory_products(id) ON DELETE CASCADE,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  direction   text NOT NULL CHECK (direction IN ('in', 'out')),
  qty         numeric NOT NULL CHECK (qty > 0),
  unit_cost   numeric NOT NULL DEFAULT 0,
  reason      text NOT NULL CHECK (reason IN
                ('purchase', 'sale', 'consumption', 'adjustment', 'opening')),
  ref_id      uuid,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stock_movements_product_id_idx ON public.stock_movements (product_id);
CREATE INDEX IF NOT EXISTS stock_movements_occurred_at_idx ON public.stock_movements (occurred_at);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
```

**Why this fixes RISK-013 permanently, not just patches it (same pattern as `wallet_txns` fixing
RISK-012 in Phase 1):** today `stock_quantity` is a scalar rewritten in place by
`deductInventoryStock`, which "matches by id **or** case-insensitive name and rewrites the whole
catalog per sale" (RISK-013) — concurrent sales lose updates, and there is no audit trail of *why*
a quantity changed. `stock_movements` is one row per event; `stock_quantity` becomes
`SUM(CASE WHEN direction='in' THEN qty ELSE -qty END)`, which is what task 2.12 cuts the read path
over to. This also gives weighted-average cost and a shrinkage-reconciliation trail, both named
explicitly in PROPOSALS.md Phase 2.

**Why `ref_id` has no FK constraint and is `text`:** it points at whichever row caused the
movement — `purchase_lines.id`, `product_sales.id`, or `consumption_entries.id` depending on
`reason` — a polymorphic reference SQL cannot express as one FK. It is `text`, rather than the
original sketch's `uuid`, because the legacy `product_sales.id` is text (`sale-...`) while new
purchase and consumption IDs are UUIDs. Do not add a constraint here; validate the reference shape
in application code if it is ever needed for a join.

**Update `DB_SCHEMA.md`:** add `### stock_movements`, and add a note under the existing
`### inventory_products` entry that `stock_quantity` is mutated in place **until task 2.12**, at
which point this section must be updated to say it is derived.

---

## 2.5 — Migration: `suppliers`

**No dependency.** **Where:** `supabase/migrations/<timestamp>_create_suppliers.sql`

```sql
CREATE TABLE IF NOT EXISTS public.suppliers (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL,
  contact        text,
  payment_terms  text,
  active         boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
```

**Why:** PROPOSAL-002 Phase 2's sketch requires a supplier reference for `purchases`
(task 2.6) and lists "supplier payables" as an opening-balance line (DEC-024, item 14 in
PROPOSALS.md's setup-data list) — both need a real `suppliers` table to point at rather than a
free-text vendor name.

**Update `DB_SCHEMA.md`:** add `### suppliers`.

---

## 2.6 — Migration: `purchases` + `purchase_lines`

**Depends on 2.5** (FK) **and, informally, 2.4** (application code writing a purchase should also
write a matching `stock_movements` row with `reason='purchase'`, though the migration itself has
no schema dependency on `stock_movements`). **Where:**
`supabase/migrations/<timestamp>_create_purchases.sql`

```sql
CREATE TABLE IF NOT EXISTS public.purchases (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id  uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  total        numeric NOT NULL DEFAULT 0,
  paid         numeric NOT NULL DEFAULT 0,
  due_date     timestamptz,
  is_opening   boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.purchase_lines (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id  uuid NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  product_id   text NOT NULL REFERENCES public.inventory_products(id) ON DELETE RESTRICT,
  qty          numeric NOT NULL CHECK (qty > 0),
  unit_cost    numeric NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS purchases_supplier_id_idx ON public.purchases (supplier_id);
CREATE INDEX IF NOT EXISTS purchase_lines_purchase_id_idx ON public.purchase_lines (purchase_id);

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_lines ENABLE ROW LEVEL SECURITY;
```

**Why `total`/`unit_cost` are tax-inclusive with no separate tax column:** same DEC-021 reasoning
as `invoices`/`invoice_lines` — "purchase costs are likewise recorded gross... recorded cost is
what the clinic actually paid" (PROPOSALS.md Phase 2). No `tax_rate` column here because — unlike
sales — nothing downstream needs to split purchase tax out; if that changes, add it the same way
`invoice_lines.tax_rate` was added, as its own column, not by inference.

**Why `purchase_lines.product_id` is `ON DELETE RESTRICT`:** identical reasoning to
`consumption_entries.product_id` in task 2.3 — an orphaned purchase-cost line corrupts COGS/stock
valuation silently.

**Update `DB_SCHEMA.md`:** add `### purchases` and `### purchase_lines`.

**Verify all of 2.1–2.8 together:** `npx supabase db diff --linked` after running every migration
in this phase shows exactly the new columns/tables added and nothing else; re-run every existing
`scratch/*.ts` regression script (`pricecheck`, `billingcheck`, `identitycheck`,
`phase1ledgercheck`, `phase1packagecheck`) to confirm none of Phase 0/1's work was disturbed —
none of these migrations touch an existing Phase 0/1 table's columns, so this should trivially
pass; running it is the check that it actually is trivial, same pattern as task 1.6's verify step.

---

## 2.7 — Migration: `inventory_devices.lamp_replacement_cost`

**No dependency.** **Where:**
`supabase/migrations/<timestamp>_add_lamp_replacement_cost.sql`

```sql
ALTER TABLE public.inventory_devices
  ADD COLUMN IF NOT EXISTS lamp_replacement_cost numeric NOT NULL DEFAULT 0;
```

**Why:** PROPOSAL-002 Phase 2 defines `cost_per_pulse = lamp_replacement_cost / rated_pulses`, a
per-session variable cost for laser/device-based sessions, "consumed per session and snapshotted
onto the invoice line." `inventory_devices` already has `total_pulses` / `remaining_pulses` /
`max_pulses_limit` (confirmed in `DB_SCHEMA.md` → `### inventory_devices`) — treat
`max_pulses_limit` as the `rated_pulses` in that formula; there is no need for a second column
duplicating the same concept. `lamp_replacement_cost` is the one genuinely missing input: what it
costs to replace the consumable lamp/handpiece when it wears out, which is not the same number as
the device's original purchase price (that lives on `fixed_assets.cost`, task 3.4) — a laser unit
and its replaceable lamp are two different cost bases, and conflating them would understate
per-session cost every time a lamp is replaced without buying a whole new device.

**Update `DB_SCHEMA.md`:** add the `lamp_replacement_cost` row to the existing
`### inventory_devices` table, with a note distinguishing it from `fixed_assets.cost` (task 3.4)
for exactly the reason above — this is the row most likely to be "simplified" into a duplicate of
the asset's purchase cost by a future task if the distinction isn't written down here.

---

## 2.8 — Migration: `providers.commission_type` CHECK constraint + `commission_base`

**No dependency.** **Where:**
`supabase/migrations/<timestamp>_add_provider_commission_constraints.sql`

```sql
-- Verify existing values against the live DB first (see the query at the top of this file) —
-- DEC-018 notes commission_type has no CHECK today, so an unexpected value could exist.
ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS commission_base text NOT NULL DEFAULT 'gross'
    CHECK (commission_base IN ('gross', 'net_of_materials'));

ALTER TABLE public.providers
  ADD CONSTRAINT providers_commission_type_check
  CHECK (commission_type IN ('fixed', 'percentage', 'both', 'none'));
```

**Why (DEC-018):** `providers.commission_type` / `commission_value` exist today with **no database
CHECK constraint** — "only the admin `<select>` restricts it. Any unexpected value falls through
both branches in the payroll calculation and silently yields commission 0" (DEC-018, citing
`20260715202003_add_provider_payroll.sql:4`). DEC-018 also requires the commission **base**
(gross service price vs. net after materials) to become "explicit and stored... rather than
implied" — `commission_base` is that column. **Before adding the CHECK, query
`SELECT DISTINCT commission_type FROM providers` against the live dev DB** (per the Conventions
query at the top of this file) — if any row holds a value outside `fixed`/`percentage`/`both`, the
migration must also normalize it (a `UPDATE ... SET commission_type = 'none' WHERE commission_type
NOT IN (...)` line, or similar, added to this same file) or the `ADD CONSTRAINT` will fail outright
on a live row it cannot express. Document what you found in this file's row before marking it
`DONE`.

**Update `DB_SCHEMA.md`:** update the `### providers` table's `commission_type` row to note the
CHECK constraint now exists (it will currently be undocumented or documented as unconstrained —
verify and correct whichever is there), and add a `commission_base` row.

---

## 2.9 — Library: `src/lib/costing.ts`

**Depends on 2.1–2.8 for schema shape only** (same "no runtime dependency" pattern as task 1.7 —
pure functions, no `supabaseServer` import, matching the doc comment style already established in
`src/lib/ledger.ts` and `src/lib/packages.ts`).

**What:** pure functions —
- `consumptionCost(entries: {qty: number; unitCostSnapshot: number}[]): number` — sums material
  cost for a completed session's `consumption_entries`.
- `costPerPulse(lampReplacementCost: number, ratedPulses: number): number` — throws on
  `ratedPulses <= 0`, same "throw on nonsense input" convention as `buildInvoiceLine` (task 1.7)
  and `recognisedRevenuePerSession` (task 1.8) — a device with no rated pulse count is a data
  error, not a valid zero-cost state.
- `computeCommission(base: number, type: 'fixed' | 'percentage' | 'both' | 'none', value: number,
  fixedComponent?: number): number` — `base` is whichever number `commission_base` (task 2.8)
  resolved to (gross price, or price minus `consumptionCost`) for that line, computed by the
  caller before this function runs — this function does not know about `service_consumables` or
  invoices, only arithmetic. Matches DEC-018's "fixed / percentage / both" options exactly.

**Why this belongs in a pure library, not inline in a route handler:** identical reasoning to
`src/lib/billing.ts` (task 0.5) and `src/lib/ledger.ts` (task 1.7) — this is money arithmetic, and
the existing convention in this codebase is that money math lives in a tested pure function a
route calls, not inline in the handler.

**Update `DB_SCHEMA.md`:** none (no schema change — library only).

---

## 2.10 — Regression checks for 2.9

**Depends on 2.9.** **Where:** new `scratch/phase2costingcheck.ts`, following the one-file-per-
concern convention task 1.9 established (`phase1ledgercheck.ts` / `phase1packagecheck.ts` as two
separate files rather than one).

**What:** assert `consumptionCost` sums correctly and handles an empty array (zero, not NaN);
`costPerPulse` throws on `ratedPulses <= 0` and divides correctly otherwise; `computeCommission`
covers all four `commission_type` values including `'none'` (must return exactly 0, not throw —
DEC-018 lists `none` as a valid configured state, e.g. a salaried doctor with no commission) and
`'both'` (must sum the fixed and percentage components, not pick one).

**Update `DB_SCHEMA.md`:** none.

---

## 2.11 — Wire booking checkout to consume the recipe and snapshot cost/commission

**Depends on 1.10, 2.2, 2.3, 2.9.** **Where:** `src/app/api/reservations/route.ts`, the same
`status === 'completed'` settlement block task 1.10's `writeCheckoutInvoice()` lives in — this
task extends that function, it does not add a new one.

**What:** when `writeCheckoutInvoice()` builds `invoice_lines` for the completed booking's
services:
1. For each service line, look up its `service_consumables` rows, default the consumed quantity
   to `standard_qty`, and allow the checkout payload to override actual quantities per DEC-016
   (this is the "staff may edit at completion" hook — the exact request-field shape for an
   override is an implementation-time decision; document whatever is chosen in `API_CONTRACT.md`).
2. Insert one `consumption_entries` row per consumed product, with `unit_cost_snapshot` read from
   `inventory_products.cost_price` **at this moment** (not later), and `was_edited = true` if the
   quantity differs from `standard_qty`.
3. Also insert a `stock_movements` row per consumed product (`direction: 'out'`, `reason:
   'consumption'`, `ref_id` = the `consumption_entries.id`) — **this is additive alongside**,
   not instead of, whatever `stock_quantity` mutation Phase 0's task 0.4 already performs; do not
   remove that write here. The cutover to *derived* stock is task 2.12, done separately once this
   has real data flowing through it, mirroring exactly how task 1.14 is separated from 1.10/1.11.
4. Compute `cogs_snapshot = consumptionCost(...)` (task 2.9) and write it onto the corresponding
   `invoice_lines` row — this is the `NULL` column task 1.2 deliberately left for Phase 2 to fill.
   **Materials only at this point** — task 2.15 extends this same block to add device pulse cost
   into the same `cogs_snapshot` value; do not treat this step's output as the line's final cost
   until 2.15 has also landed.
5. Resolve the booking's `provider_id` (already populated by task 0.7's `resolveProviderId()`),
   look up that provider's `commission_type`/`commission_value`/`commission_base` (task 2.8), and
   write `computeCommission(...)` onto `invoice_lines.commission_snapshot`.
6. Wrap all of this in the same best-effort error handling task 1.10 established for ledger
   writes: log and continue, never fail the checkout itself over a costing-write error (task
   1.10's point 4 applies identically here — a missing cost snapshot can be reconciled later; a
   failed checkout because costing broke would be a new, worse regression).

**Update `DB_SCHEMA.md`:** none (no schema change; this task only starts writing to columns/tables
that already exist by this point). **Update `API_CONTRACT.md`:** document the checkout request
field(s) added for the quantity-override hook in point 1 above, and note that a completed checkout
now also writes `consumption_entries`/`stock_movements` rows and populates the two previously-NULL
`invoice_lines` columns — side effects, not new response fields (matching how task 1.10 documented
the invoice side effect).

**Verify:** exactly the same standard as task 1.10 — complete a real booking checkout against dev
and confirm `consumption_entries`, the new `stock_movements` rows, and the two now-populated
`invoice_lines` columns all exist and are correct, *and* confirm every Phase 0/1 write this task
runs alongside (`amount_paid`, `customers.spent_amount`, the Phase 1 invoice/payment rows, and
task 0.4's existing stock deduction) is unchanged — zero-regression on every existing path, not
just the new one.

---

## 2.12 — Cut `stock_quantity` over to derive from `stock_movements`

**Depends on 2.4, and real data flowing through 2.11 for at least a trial period — do not attempt
this the same day as 2.11, mirroring task 1.14's identical caution relative to 1.10/1.11.**
**Where:** `src/app/api/inventory/products/route.ts` (the route task 0.4's note already
identifies as the single owner of stock movement, `deductInventoryStock`), plus every other write
path from this phase that touches stock (`purchases` from task 2.13, `consumption` from 2.11).

**What:** replace direct `stock_quantity` mutation with a read computed as
`SUM(CASE WHEN direction='in' THEN qty ELSE -qty END) FROM stock_movements WHERE product_id = X`
(cached on read or fully computed — decide which at implementation time and document it, same
choice task 1.14 was left to make for customer balances). Every write path that used to mutate
`stock_quantity` directly (POS sale deduction from task 0.4, a purchase received, a consumption
entry) instead only writes a `stock_movements` row; the scalar column becomes either removed or a
denormalized cache kept in sync by the same write, not an independent source of truth.

**Update `DB_SCHEMA.md`:** update `### inventory_products`' `stock_quantity` row to say it is
derived-and-cached (or fully computed on read) from `stock_movements`, not independently written —
mirroring exactly the note task 1.14 requires for `customers.outstanding` etc.

**Verify:** for every product in dev, the `stock_movements`-derived quantity must equal the
scalar-maintained `stock_quantity` **before** cutover — write this comparison as a one-off script
(not a permanent regression check, per task 1.14's identical framing), and only then flip the read
path.

---

## 2.13 — New endpoint: record a purchase

**Depends on 2.5, 2.6.** **Where:** new `src/app/api/purchases/route.ts`.

**What:** `POST` body: `supplierId`, `purchasedAt?`, lines `[{productId, qty, unitCost}]`,
`paid?`, `dueDate?`. Creates one `purchases` row (`total` = sum of `qty × unitCost` across lines),
one `purchase_lines` row per line, and one `stock_movements` row per line
(`direction: 'in'`, `reason: 'purchase'`, `ref_id` = the `purchase_lines.id`). Protect with
`requireStaffAccess` (task 0.10's established pattern — this is a money/stock-mutating route with
no patient-facing caller, same category as `/api/inventory/products`).

**Update `DB_SCHEMA.md`:** none. **Update `API_CONTRACT.md`:** document the new endpoint fully,
matching the existing style in that file (see `## POST /api/branches` etc. for the format).

**Verify:** record a purchase; confirm `purchases`, `purchase_lines`, and the matching
`stock_movements` rows all exist, and (once 2.12 has cut over) that the affected product's derived
stock quantity increased by exactly the purchased qty.

---

## 2.14 — Doctor payroll: match by `provider_id`, not `doctor_name` string

**Depends on 0.7 (the `provider_id` FK already exists and is populated on create/approve/update),
2.8 (commission constraints), 2.9 (commission math).** **Where:**
`src/app/api/hr/doctor-payroll/route.ts` — the three name-string match sites confirmed still
present: `:70` (`isDocMatch`), `:172`, and `:279` (`isDocMatch` again), each doing
`r.doctor_name.trim().toLowerCase() === prov.name.trim().toLowerCase()`.

**What:** replace each of those three matches with `r.provider_id === prov.id`. This is RISK-015's
core fix: "a rename, a typo, a title prefix, or two doctors sharing a name silently detaches
historical commission with no error" — a durable FK cannot detach this way. A reservation whose
`provider_id` is `NULL` (task 0.7: this happens when the name matched zero or more than one
provider) is simply excluded from that provider's payroll, which is more honest than a fuzzy
string fallback re-attaching it to the wrong doctor — do not add a name-string fallback here.

**Also fold in, same file, same task (RISK-015's compounding issues):**
- Compute commission using `computeCommission()` (task 2.9) and the `invoice_lines.
  commission_snapshot` values task 2.11 now writes **per reservation**, rather than the current
  monthly-aggregate-only approach — this is what makes commission an inspectable per-session
  number instead of only a monthly total.
- Stop trusting `hr_payroll.achieved_revenue` as a summable revenue figure when its
  `target_type_snapshot='reservations'` — RISK-015 notes it "holds a **count**, not revenue" in
  that mode; leave a comment at the summation site pointing at this task and RISK-016 so it is not
  silently "fixed" back into a nonsense sum.

**Update `DB_SCHEMA.md`:** none. **Update `API_CONTRACT.md`:** note if the doctor-payroll response
shape changes (e.g. a new field surfacing per-reservation commission) — it should mostly be an
internal computation change, document only what actually changes in the response.

**Verify:** for a provider whose name has since been edited (rename in the `providers` table),
confirm their historical commission still attributes correctly via `provider_id` where it did not
before this fix.

**Implementation note (2026-07-26, code review):** landed in `4339a99` largely as specified, with
one consequence worth naming explicitly since it wasn't called out in that commit — all three
match sites also narrowed their status filter from `status IN ('approved', 'completed')` to
`status = 'completed'` only. This is not scope creep, it's a forced consequence of the commission
source change: `invoice_lines.commission_snapshot` is only ever written at checkout completion
(task 2.11/2.15), so an `approved`-but-not-yet-`completed` reservation has no snapshot to sum and
would otherwise count toward `completed_services_count` at zero commission, understating the
per-doctor average. Flagging here because it changes what current-month payroll shows for any
reservation sitting in `approved` — RISKS.md's RISK-015 entry has been updated to reference this
task; see there for the resolved/still-open split. `RISKS.md` — mark that update's own commit here
once this task's row is closed.

---

## 2.15 — Migration: `service_devices`; wire device pulse cost into checkout

**Added during a merge of two independently-written breakdowns of this same phase (2026-07-26) —
not in either original draft, flagged explicitly rather than silently folded in.** Task 2.9 defines
`costPerPulse(lampReplacementCost, ratedPulses)` and task 2.7 adds the `lamp_replacement_cost`
input it needs, but **no table anywhere records which service uses which device, or how many
pulses a session consumes** — without that link, `costPerPulse()` has no way to know it should run
for a given service line, and task 2.11's checkout wiring only ever calls `consumptionCost()`
(materials). Verified by grep: the only file touching `inventory_devices.total_pulses` /
`remaining_pulses` / `max_pulses_limit` is the admin devices route itself (manual edits and pulse
resets) — nothing in `src/` ties a pulse count to a reservation today. Left unaddressed, every
laser/device-based service's `cogs_snapshot` (task 2.11) would silently exclude its device cost
forever, understating true margin for exactly the services this module exists to get right.

**Depends on 2.7 (`lamp_replacement_cost`), 2.9 (`costPerPulse`), 2.11 (the checkout block this
task extends).** **Where:** `supabase/migrations/<timestamp>_create_service_devices.sql`

```sql
CREATE TABLE IF NOT EXISTS public.service_devices (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id          bigint NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  device_id           text NOT NULL REFERENCES public.inventory_devices(id) ON DELETE CASCADE,
  pulses_per_session  integer NOT NULL CHECK (pulses_per_session > 0),
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (service_id, device_id)
);

CREATE INDEX IF NOT EXISTS service_devices_service_id_idx ON public.service_devices (service_id);

ALTER TABLE public.service_devices ENABLE ROW LEVEL SECURITY;
```

**Why this mirrors `service_consumables` (task 2.2) exactly:** same shape, same reasoning — a
recipe of "this service standardly uses N pulses of this device." A service that uses no laser
device simply has no row here, and its pulse cost is 0, same as a service with no
`service_consumables` rows having no material cost.

**Checkout wiring, additive to task 2.11's block, same file
(`src/app/api/reservations/route.ts`):** for each completed service line with a matching
`service_devices` row, call `costPerPulse(device.lamp_replacement_cost, device.max_pulses_limit) ×
pulses_per_session` and **add** it into that line's `cogs_snapshot` alongside
`consumptionCost(...)` — both feed the same column, not two separate ones, since `cogs_snapshot` is
defined (task 1.2) as the line's total cost of goods, materials and device wear together. Does
**not** decrement `inventory_devices.remaining_pulses` — that stays exactly where task 2.12 left
it (unmutated by anything in this phase), consistent with the dual-write discipline every other
2.x write-path task follows: this task only adds a `cogs_snapshot` contribution, it does not touch
pulse-count bookkeeping.

**Open question this task surfaces, not answered here:** a session's *actual* pulse count could
differ from the standard recipe (a longer session, an equipment retry), same as consumables' DEC-016
edit-at-completion pattern. **Not built in this pass** — `pulses_per_session` is treated as fixed at
checkout. If staff need to log an actual pulse count per session, that needs its own
`device_consumption_entries`-shaped table, analogous to `consumption_entries` (task 2.3); revisit
if this turns out to matter in practice.

**Update `DB_SCHEMA.md`:** add `### service_devices` alongside the other Phase 2 tables, and a note
on the existing `cogs_snapshot` row (Phase 1 section) that it includes device pulse cost as of this
task, not materials alone. **Update `API_CONTRACT.md`:** note the extended checkout side effect,
same convention as every other additive task in this tracker.

**Verify:** complete a real booking for a service with a `service_devices` row; confirm
`cogs_snapshot` on the matching `invoice_lines` row equals `consumptionCost(...) +
costPerPulse(...) × pulses_per_session` exactly, and that `inventory_devices.remaining_pulses` is
unchanged by this task specifically.

**Implementation note (2026-07-26, code review + fix):** the initial `4339a99` implementation
wrapped all of `applyCheckoutCosting()` — every invoice line's consumption entries, stock
movements, and cost/commission snapshot writes — inside the single `try/catch` `writeCheckoutInvoice`
already used to keep costing failures from failing the checkout itself (task 1.10's non-fatal
pattern). That meant one bad line — a `service_devices` row pointing at a device still at its
`max_pulses_limit = 0` default (the column's default value, so a very likely real state for any
device whose rating hasn't been entered yet), or a recipe referencing a product still at its
`role = 'retail'` default (task 2.1) — would throw out of the whole function and leave
`cogs_snapshot`/`commission_snapshot` `NULL` for **every** line on that invoice, not just the
misconfigured one. Fixed same-day by moving the `try/catch` inside the per-line loop: each
invoice line is now costed and failure-isolated independently, so a bad device rating or an
unready recipe only blanks that one line, and every correctly-configured line on the same
checkout still gets its real `cogs_snapshot`/`commission_snapshot`.

---

## 2.16 — `API_CONTRACT.md` rollup

Not a separate implementation task — a checklist to run once 2.11–2.15 are done, confirming every
new/changed endpoint from this phase is documented there. Close this out last, same pattern as
task 1.16.

---

# Phase 3 — Overheads, Assets, Liabilities

> **Depends on nothing in Phase 2 structurally** — these tables are new and isolated, exactly as
> DEC-019 notes: "The expense/asset/liability tables (Phase 3) are new and isolated, so the repair
> work is concentrated entirely on the revenue side." Phase 3 **can start in parallel with Phase 2**
> once Phase 1 is genuinely done, and does not need to wait on Phase 2's completion — but Phase 4's
> P&L reporting needs both, so sequencing them in parallel rather than serially shortens the path
> to a usable Finance screen.
>
> **Read before starting any 3.x task:** `PROPOSALS.md` → PROPOSAL-002 Phase 3 (the target shape) ·
> `DECISIONS.md` → DEC-015 (contribution margin primary / fully-loaded secondary, room-minutes
> allocation basis), DEC-017 (per-branch asset register, straight-line depreciation).
>
> **Ground rule, same as every phase:** schema change = migration + `DB_SCHEMA.md` update in the
> same commit; new tables enable RLS with no policies; regression scripts for any pure function.

## Phase 3 task table

| ID | Task | Depends on | Status | Owner | Commit |
|---|---|---|---|---|---|
| 3.1 | Migration: `expense_categories` table | — | `TODO` | — | — |
| 3.2 | Migration: `expenses` table | 3.1 | `TODO` | — | — |
| 3.3 | Migration: `recurring_expenses` table | 3.1 | `TODO` | — | — |
| 3.4 | Migration: `fixed_assets` table | — | `TODO` | — | — |
| 3.5 | Migration: `depreciation_entries` table | 3.4 | `TODO` | — | — |
| 3.6 | Migration: `loans` table | — | `TODO` | — | — |
| 3.7 | Migration: `loan_schedule` table | 3.6 | `TODO` | — | — |
| 3.8 | Library: `src/lib/depreciation.ts` — straight-line depreciation + loan amortization (pure functions) | 3.4–3.7 (schema shape only) | `TODO` | — | — |
| 3.9 | Regression checks for 3.8 | 3.8 | `TODO` | — | — |
| 3.10 | New endpoints: expenses CRUD + recurring-expense generation | 3.1–3.3 | `TODO` | — | — |
| 3.11 | New endpoints: fixed assets CRUD + monthly depreciation posting | 3.4, 3.5, 3.8 | `TODO` | — | — |
| 3.12 | New endpoints: loans CRUD + schedule generation | 3.6, 3.7, 3.8 | `TODO` | — | — |
| 3.13 | `API_CONTRACT.md` rollup for Phase 3 | rolling, alongside 3.10–3.12 | `TODO` | — | — |

---

## 3.1 — Migration: `expense_categories`

**Where:** `supabase/migrations/<timestamp>_create_expense_categories.sql`

```sql
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  kind       text NOT NULL CHECK (kind IN ('fixed', 'variable')),
  parent_id  uuid REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
```

**Why `kind` matters:** DEC-015's contribution-margin-primary model depends on distinguishing
fixed overhead (rent, salaries, depreciation, loan interest — allocated by room-minutes in the
*secondary* fully-loaded view only) from variable cost (which, per DEC-015, is **only** doctor
commission and per-session materials — both already live elsewhere, in `invoice_lines`, not here).
Every row created under `expenses`/`recurring_expenses` is therefore fixed overhead by
construction of this module's scope — `kind` exists mainly so the category tree itself stays
self-describing and a future variable-expense category (should one ever legitimately arise) is
not silently miscategorized.

**Why `parent_id` is self-referencing:** lets "Utilities" have children "Electricity" / "Water" /
"Internet" without a second table, matching how `categories`/`service_ids` elsewhere in this
schema favor a flat table over a rigid hierarchy.

**Update `DB_SCHEMA.md`:** add `### expense_categories` under a new `## Phase 3 — Overheads,
Assets, Liabilities (PROPOSAL-002)` heading.

---

## 3.2 — Migration: `expenses`

**Depends on 3.1.** **Where:** `supabase/migrations/<timestamp>_create_expenses.sql`

```sql
CREATE TABLE IF NOT EXISTS public.expenses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id   uuid NOT NULL REFERENCES public.expense_categories(id) ON DELETE RESTRICT,
  branch_id     uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  incurred_on   date NOT NULL,
  amount        numeric NOT NULL CHECK (amount > 0),
  vendor        text,
  note          text,
  recurring_id  uuid,
  is_opening    boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS expenses_category_id_idx ON public.expenses (category_id);
CREATE INDEX IF NOT EXISTS expenses_branch_id_idx ON public.expenses (branch_id);
CREATE INDEX IF NOT EXISTS expenses_incurred_on_idx ON public.expenses (incurred_on);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
```

**Why `category_id` is `ON DELETE RESTRICT`, unlike most FKs in this schema:** deleting a category
that still has expense rows against it would silently strip every one of those rows out of every
category-grouped report. Forcing the delete to fail (or forcing a re-category first) is the
correct default for a table whose entire purpose is grouping money by category — matches the same
reasoning already applied to `consumption_entries.product_id` (task 2.3) and
`purchase_lines.product_id` (task 2.6).

**Why `recurring_id` has no FK constraint (yet):** `recurring_expenses` (task 3.3) is created
after this table in dependency order but the two are mutually referential in spirit (a recurring
expense generates dated `expenses` rows, and each generated row should point back at its
template) — same deferred-FK pattern already used for `invoice_lines.package_id` in task 1.2. Add
the constraint (`ALTER TABLE expenses ADD CONSTRAINT ... FOREIGN KEY (recurring_id) REFERENCES
recurring_expenses(id) ON DELETE SET NULL`) inside task 3.3's migration once that table exists —
do not forget it there, the same warning task 1.2 gave for `package_id`.

**Update `DB_SCHEMA.md`:** add `### expenses`, noting the deferred `recurring_id` FK caveat.

---

## 3.3 — Migration: `recurring_expenses`

**Depends on 3.1.** **Where:**
`supabase/migrations/<timestamp>_create_recurring_expenses.sql`

```sql
CREATE TABLE IF NOT EXISTS public.recurring_expenses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id  uuid NOT NULL REFERENCES public.expense_categories(id) ON DELETE RESTRICT,
  branch_id    uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  amount       numeric NOT NULL CHECK (amount > 0),
  cadence      text NOT NULL CHECK (cadence IN ('monthly', 'quarterly', 'yearly')),
  next_due_on  date NOT NULL,
  active       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS recurring_expenses_next_due_on_idx
  ON public.recurring_expenses (next_due_on) WHERE active;

-- Backfill the FK deferred in 3.2, now that recurring_expenses exists.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'expenses_recurring_id_fkey'
  ) THEN
    ALTER TABLE public.expenses
      ADD CONSTRAINT expenses_recurring_id_fkey
      FOREIGN KEY (recurring_id) REFERENCES public.recurring_expenses(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;
```

**Why this exists as a template table rather than pre-generating a year of `expenses` rows:**
rent/utilities/software licenses (PROPOSALS.md's setup-data item 2) recur indefinitely; a template
plus an on-demand or scheduled "generate due expenses" step (task 3.10) is the same pattern
`packages`/`customer_packages` already uses (a definition table plus an instance table) rather
than a new pattern for this phase alone.

**Update `DB_SCHEMA.md`:** add `### recurring_expenses`; edit the `### expenses` entry's
`recurring_id` row to remove the "FK added later" caveat now that it's true — same wording pattern
task 1.6 used for `invoice_lines.package_id`.

---

## 3.4 — Migration: `fixed_assets`

**No dependency on 3.1–3.3.** **Where:**
`supabase/migrations/<timestamp>_create_fixed_assets.sql`

```sql
CREATE TABLE IF NOT EXISTS public.fixed_assets (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id          uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  category           text NOT NULL CHECK (category IN
                       ('furniture', 'medical_device', 'it', 'leasehold_improvement')),
  name               text NOT NULL,
  purchased_on       date NOT NULL,
  cost               numeric NOT NULL CHECK (cost >= 0),
  useful_life_months integer NOT NULL CHECK (useful_life_months > 0),
  salvage_value      numeric NOT NULL DEFAULT 0,
  status             text NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active', 'disposed', 'fully_depreciated')),
  device_id          text REFERENCES public.inventory_devices(id) ON DELETE SET NULL,
  is_opening         boolean NOT NULL DEFAULT false,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fixed_assets_branch_id_idx ON public.fixed_assets (branch_id);
CREATE INDEX IF NOT EXISTS fixed_assets_device_id_idx ON public.fixed_assets (device_id);

ALTER TABLE public.fixed_assets ENABLE ROW LEVEL SECURITY;
```

**Why `device_id` (DEC-017):** "`inventory_devices` links to it via `fixed_assets.device_id`, so a
laser is simultaneously an operational device and a depreciating asset." `inventory_devices.id` is
`text` (confirmed in `DB_SCHEMA.md`), hence `device_id text` here, not `uuid`. This is distinct
from `inventory_devices.lamp_replacement_cost` (task 2.7) — `fixed_assets.cost` is what the whole
device cost to buy; `lamp_replacement_cost` is what its consumable lamp costs to replace. Do not
conflate the two when wiring either field.

**Why `is_opening`:** every other Phase 1/2 money table carries this flag for DEC-024's opening
balance import; `fixed_assets` needs it too because the opening-balance data explicitly includes
"assets with accumulated depreciation to date" (DEC-024) and PROPOSALS.md setup-data item 1 —
an asset a clinic already owns at go-live is entered here with `is_opening = true`, and its
opening `depreciation_entries` rows (task 3.5) carry the accumulated depreciation so far.

**Update `DB_SCHEMA.md`:** add `### fixed_assets`, cross-referencing the `### inventory_devices`
entry's new `lamp_replacement_cost` row (task 2.7) to make the cost-basis distinction explicit in
both places.

---

## 3.5 — Migration: `depreciation_entries`

**Depends on 3.4.** **Where:**
`supabase/migrations/<timestamp>_create_depreciation_entries.sql`

```sql
CREATE TABLE IF NOT EXISTS public.depreciation_entries (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id          uuid NOT NULL REFERENCES public.fixed_assets(id) ON DELETE CASCADE,
  period            text NOT NULL,  -- 'YYYY-MM'
  amount            numeric NOT NULL DEFAULT 0,
  book_value_after  numeric NOT NULL DEFAULT 0,
  is_opening        boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (asset_id, period)
);

CREATE INDEX IF NOT EXISTS depreciation_entries_asset_id_idx
  ON public.depreciation_entries (asset_id);

ALTER TABLE public.depreciation_entries ENABLE ROW LEVEL SECURITY;
```

**Why `period` is `text` ('YYYY-MM'), not a `date`:** matches this schema's existing precedent of
storing period keys as formatted text where the value is inherently a month, not a specific day
(`reservations.date` is `text` for a different reason, but the broader codebase convention of
app-formatted string keys — `invoice_no`, `sale-<ts>-<rand>` — extends naturally here). A
`UNIQUE (asset_id, period)` constraint prevents double-posting the same asset's depreciation for
the same month, which is the concrete failure this table exists to make structurally impossible.

**Why `book_value_after` is stored, not recomputed on read:** posting depreciation is an
irreversible monthly event (task 3.11's posting endpoint) — storing the resulting book value
alongside the amount posted means a later report never has to replay the entire depreciation
history of every asset to answer "what is this asset worth today," and it makes each row
self-auditing (`book_value_after` this month must equal last month's `book_value_after` minus this
row's `amount`, a cheap sanity check `depreciation.ts`'s regression test, task 3.9, should assert).

**Update `DB_SCHEMA.md`:** add `### depreciation_entries`.

---

## 3.6 — Migration: `loans`

**No dependency.** **Where:** `supabase/migrations/<timestamp>_create_loans.sql`

```sql
CREATE TABLE IF NOT EXISTS public.loans (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lender        text NOT NULL,
  principal     numeric NOT NULL CHECK (principal > 0),
  annual_rate   numeric NOT NULL DEFAULT 0,
  term_months   integer NOT NULL CHECK (term_months > 0),
  started_on    date NOT NULL,
  installment   numeric NOT NULL DEFAULT 0,
  is_opening    boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
```

**Why `principal` is the *original* amount, and opening loans still use it, not a "remaining
balance" column here:** DEC-024 is explicit that a clinic's opening loan data must record "loans
at **remaining** balance, not original principal" — but that remaining balance is represented as
the *first row* of that loan's `loan_schedule` (task 3.7), not as a second column on `loans`
itself. A loan taken out before go-live is entered with its true original `principal`/
`started_on`/`term_months`, and the opening `loan_schedule` rows (`is_opening = true`) are seeded
starting from whatever balance remains as of the opening date — this keeps `loans` a single
honest record of the loan's real terms rather than splitting "original" and "remaining" across two
places that could disagree.

**Update `DB_SCHEMA.md`:** add `### loans`.

---

## 3.7 — Migration: `loan_schedule`

**Depends on 3.6.** **Where:** `supabase/migrations/<timestamp>_create_loan_schedule.sql`

```sql
CREATE TABLE IF NOT EXISTS public.loan_schedule (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id         uuid NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  period          text NOT NULL,  -- 'YYYY-MM'
  installment     numeric NOT NULL DEFAULT 0,
  interest_part   numeric NOT NULL DEFAULT 0,
  principal_part  numeric NOT NULL DEFAULT 0,
  balance_after   numeric NOT NULL DEFAULT 0,
  is_opening      boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (loan_id, period)
);

CREATE INDEX IF NOT EXISTS loan_schedule_loan_id_idx ON public.loan_schedule (loan_id);

ALTER TABLE public.loan_schedule ENABLE ROW LEVEL SECURITY;
```

**Why the interest/principal split matters (PROPOSALS.md Phase 3):** "Loan installments split into
interest (P&L expense) and principal (balance reduction)" — only `interest_part` is a real expense
in the P&L; `principal_part` is a balance-sheet movement (this loan's liability shrinking), not a
cost. Reporting the whole `installment` as an expense would overstate the clinic's costs every
month it is paying down a loan.

**Update `DB_SCHEMA.md`:** add `### loan_schedule`.

**Verify all of 3.1–3.7 together:** `npx supabase db diff --linked` shows exactly these 7 tables
(plus the deferred FK from 3.3) added and nothing else; re-run every prior phase's `scratch/*.ts`
regression scripts to confirm nothing upstream was disturbed — same verify pattern as tasks 1.6
and the 2.1–2.8 group verify.

---

## 3.8 — Library: `src/lib/depreciation.ts`

**Depends on 3.4–3.7 for schema shape only.** **Where:** new `src/lib/depreciation.ts`, same pure-
function-only convention as `ledger.ts`/`packages.ts`/`costing.ts`.

**What:** pure functions —
- `monthlyDepreciation(cost: number, salvageValue: number, usefulLifeMonths: number): number` —
  straight-line: `(cost − salvage) / useful_life_months` (DEC-017, PROPOSALS.md Phase 3). Throws
  on `usefulLifeMonths <= 0`, same convention as every other divide-by-input function in this
  codebase (`recognisedRevenuePerSession`, `costPerPulse`).
- `bookValueAfter(cost: number, accumulatedDepreciation: number): number` — clamped so it never
  goes below `salvageValue` (an asset fully depreciated stops depreciating further — needed so a
  monthly posting job run past an asset's useful life does not keep subtracting).
- `amortizeLoanPayment(balance: number, annualRate: number, installment: number): {interestPart:
  number; principalPart: number; balanceAfter: number}` — standard amortization: interest on the
  outstanding balance for the period, the remainder of the installment reduces principal.

**Update `DB_SCHEMA.md`:** none (library only).

---

## 3.9 — Regression checks for 3.8

**Depends on 3.8.** **Where:** new `scratch/phase3depreciationcheck.ts`.

**What:** assert `monthlyDepreciation` matches the formula for a known cost/salvage/life triple;
`bookValueAfter` clamps at `salvageValue` and does not go negative past full depreciation; a
simulated full amortization schedule for a sample loan sums `principalPart` across every period to
exactly the original `principal` (the same "must sum to the whole by construction" invariant task
1.9's `phase1packagecheck.ts` caught a real bug on — apply the same complement-based-sum discipline
here rather than trusting independently-rounded per-period figures to add up).

**Update `DB_SCHEMA.md`:** none.

---

## 3.10 — New endpoints: expenses CRUD + recurring-expense generation

**Depends on 3.1–3.3.** **Where:** new `src/app/api/expenses/route.ts` (CRUD on `expenses` and
`expense_categories`) and a generation step for `recurring_expenses` — either a new
`POST /api/expenses/generate-due` endpoint callable on demand, or invoked at the top of the
expenses `GET` handler for any `recurring_expenses` row past its `next_due_on` (decide at
implementation time; document the choice in `API_CONTRACT.md`, same latitude task 1.12/1.13 were
given for their endpoint shape). Protect with `requireStaffAccess`.

**What "generate due" means:** for every `active` `recurring_expenses` row with `next_due_on <=
today`, insert a matching `expenses` row (`recurring_id` set) and advance `next_due_on` by one
`cadence` step. Must be idempotent against being called twice the same day — do not double-insert
if `next_due_on` has already been advanced past today.

**Update `DB_SCHEMA.md`:** none. **Update `API_CONTRACT.md`:** document both endpoint groups.

**Verify:** create a monthly recurring expense with `next_due_on` in the past; trigger generation;
confirm exactly one `expenses` row is created and `next_due_on` advances by exactly one month;
trigger generation again immediately and confirm no duplicate row appears.

---

## 3.11 — New endpoints: fixed assets CRUD + monthly depreciation posting

**Depends on 3.4, 3.5, 3.8.** **Where:** new `src/app/api/assets/route.ts` (CRUD), plus a posting
endpoint (e.g. `POST /api/assets/post-depreciation`) or script — same "script is defensible for a
once-a-month operator action" latitude task 1.15 was given for the opening-balance import, though
an endpoint is more likely correct here since this runs every month indefinitely, not once per
clinic. Protect with `requireStaffAccess` (or `requireAdministratorAccess` — decide based on
whether this should be reception-triggerable or admin-only, and document the choice).

**What:** for every `active` `fixed_assets` row with no `depreciation_entries` row for the current
`period`, compute `monthlyDepreciation()` (task 3.8) and insert one `depreciation_entries` row,
using the prior period's `book_value_after` (or `cost` if this is the asset's first posting) as
the basis for `bookValueAfter()`. Flip `status` to `'fully_depreciated'` once book value reaches
`salvage_value`. Must be idempotent per asset per period — the `UNIQUE (asset_id, period)`
constraint from task 3.5 is the backstop, but the endpoint should check first and skip rather than
rely on a DB error to prevent double-posting.

**Update `DB_SCHEMA.md`:** none. **Update `API_CONTRACT.md`:** document both endpoint groups.

**Verify:** post depreciation for a sample asset twice in the same period; confirm only one
`depreciation_entries` row exists for that asset/period pair and `book_value_after` is correct.

---

## 3.12 — New endpoints: loans CRUD + schedule generation

**Depends on 3.6, 3.7, 3.8.** **Where:** new `src/app/api/loans/route.ts` (CRUD on `loans`), plus
schedule generation — on loan creation, generate the full `loan_schedule` for `term_months`
periods using `amortizeLoanPayment()` (task 3.8) chained period over period from `principal`.
Protect with `requireStaffAccess`/`requireAdministratorAccess` (same latitude as 3.11).

**What an opening loan's schedule looks like:** per task 3.6's note, an opening loan's schedule is
seeded starting from the clinic's actual remaining balance as of the opening date, with earlier
periods (before go-live) either omitted or marked `is_opening = true` as a single lump entry —
decide at implementation time and document which, since this is the one place DEC-024's "remaining
balance, not original principal" requirement actually gets expressed in this schema (see task
3.6's reasoning for why `loans.principal` itself stays the true original amount).

**Update `DB_SCHEMA.md`:** none. **Update `API_CONTRACT.md`:** document the endpoint and the
opening-loan schedule-seeding behavior chosen above.

**Verify:** create a loan; confirm the generated schedule's `principal_part` sums to exactly
`principal` across all periods (task 3.9's regression check verifies the pure function; this
verifies the endpoint actually calls it correctly end to end) and the final period's
`balance_after` is 0 (or within a cent, documented if so).

---

## 3.13 — `API_CONTRACT.md` rollup

Checklist task, same pattern as 1.16/2.16 — confirm every new/changed Phase 3 endpoint is
documented. Close this out last.

---

# Phase 4 — Reporting Engine + UI

> **Depends on Phase 1 (ledger data to report on) and Phase 2 (cost data for margin reporting).**
> Phase 3's expense/asset/loan data is needed for the fully-loaded and P&L views specifically
> (4.6, 4.11) but not for every Phase 4 task — the permission-wiring and dead-code-deletion tasks
> (4.1–4.5) have no data dependency and can start as soon as Phase 1 is done, in parallel with
> Phase 2/3.
>
> **Read before starting any 4.x task:** `PROPOSALS.md` → PROPOSAL-002 Phase 4 (the target shape) ·
> `RISKS.md` → RISK-005 (naming collision: the *old* "Finances Dashboard" mock panel is a different
> thing from this Finance section — do not conflate them), RISK-017 (the ~4,000 dead mock-JSX
> lines and every trap inside them) · `DECISIONS.md` → DEC-022 (finance permissions grantable AND
> revocable), DEC-027 (new admin sections are modular submodules, not more code in
> `admin/page.tsx`).
>
> **Ground rule, same as every phase:** any schema change (none expected in this phase except
> possibly 4.11's budget table) gets a `DB_SCHEMA.md` update in the same commit; every new
> `/api/finance/*` route is added to `API_CONTRACT.md`; regression scripts for any pure
> aggregation logic pulled out into a library.

## Phase 4 task table

| ID | Task | Depends on | Status | Owner | Commit |
|---|---|---|---|---|---|
| 4.1 | `PERMISSION_STRUCTURE`: add `finance.*` keys | — | `TODO` | — | — |
| 4.2 | `hasFinancePermission` helper — short-circuits on `superadmin` only | — | `TODO` | — | — |
| 4.3 | Seed the `admin` role's permissions with `finance.*` by default | 4.1 | `TODO` | — | — |
| 4.4 | Wire the Finance sidebar entry through all 4 permission maps, as a `src/components/admin/Finance/` module | 4.1, 4.2, DEC-027 | `TODO` | — | — |
| 4.5 | Delete the ~4,000 lines of dead mock finance JSX | 4.4 (Finance nav must work before the old block is removed) | `TODO` | — | — |
| 4.6 | `GET /api/finance/pnl` — monthly P&L | 1.10, 1.11, 1.14, 2.11, 3.10–3.12 | `TODO` | — | — |
| 4.7 | `GET /api/finance/service-margin` — per-service contribution margin | 2.9, 2.11 | `TODO` | — | — |
| 4.8 | `GET /api/finance/doctor-pnl`, `GET /api/finance/branch-pnl` | 2.14, 4.6 | `TODO` | — | — |
| 4.9 | `GET /api/finance/cashflow` | 1.1–1.4, 3.10, 3.12 | `TODO` | — | — |
| 4.10 | `GET /api/finance/receivables-aging` | 1.14 | `TODO` | — | — |
| 4.11 | Migration: `budget_lines` table + `GET /api/finance/budget-vs-actual` | 3.1 | `TODO` | — | — |
| 4.12 | Chart library selection + base chart components | — | `TODO` | — | — |
| 4.13 | UI: Finance dashboard pages under `src/components/admin/Finance/` | 4.4, 4.6–4.12 | `TODO` | — | — |
| 4.14 | `API_CONTRACT.md` rollup for Phase 4 | rolling, alongside 4.6–4.11 | `TODO` | — | — |

---

## 4.1 — `PERMISSION_STRUCTURE`: add `finance.*` keys

**Where:** `src/app/admin/page.tsx`, the `PERMISSION_STRUCTURE` array (currently at `:404-465`,
verify the current line number before editing — this file changes often). Add a new group
following the exact `{category, prefix, items: [{key, label}]}` shape already used by every other
entry (e.g. `"Bookings Management"` / `"bookings"` at `:406-416`):

```ts
{
  category: "Finance",
  prefix: "finance",
  items: [
    { key: "finance.view_pnl", label: "View P&L" },
    { key: "finance.view_margins", label: "View Service/Doctor/Branch Margins" },
    { key: "finance.view_cashflow", label: "View Cash Flow" },
    { key: "finance.manage_expenses", label: "Manage Expenses & Recurring Expenses" },
    { key: "finance.manage_assets", label: "Manage Fixed Assets & Depreciation" },
    { key: "finance.manage_loans", label: "Manage Loans" },
    { key: "finance.view_capacity", label: "View Capacity & Service Mix" },
  ]
}
```

**Why (DEC-022):** "`PERMISSION_STRUCTURE`... also has no `finance.*`... keys at all" today — this
is the literal first step DEC-022 lists. The exact item list above is a starting proposal, not
gospel — split or merge items at implementation time if the real UI ends up needing finer or
coarser grants, but keep the `finance.` prefix so task 4.2's helper and the sidebar-wiring maps in
task 4.4 all key off the same namespace.

**Update `DB_SCHEMA.md`:** none. **Update `API_CONTRACT.md`:** none (this is UI-layer permission
config, not an API contract).

---

## 4.2 — `hasFinancePermission` helper

**Where:** `src/lib/access.ts`, alongside the existing `hasStaffPermission` (`:73-75`).

```ts
export function hasFinancePermission(access: StaffAccess, permission: string) {
  return access.role === "superadmin" || access.permissions.includes(permission);
}
```

**Why this cannot just be `hasStaffPermission` (DEC-022, and the practical risk it names
explicitly):** `hasStaffPermission` "short-circuits true for **any** `admin` role... Any role named
`admin` passes **every** permission check and the permissions array is ignored entirely. Finance
could be granted but never revoked from an admin." The stated requirement is that Finance is
"grantable AND revocable" — reusing the existing helper would silently violate that the moment any
role is named `admin`, which "would otherwise expose every employee's salary and every service's
margin, silently." Every server-side Finance route (4.6–4.11) and every client-side Finance gate
(4.4) must call this helper, never `hasStaffPermission`, for a `finance.*` check.

**Update `DB_SCHEMA.md`:** none.

---

## 4.3 — Seed the `admin` role's permissions with `finance.*` by default

**Depends on 4.1.** **Where:** wherever the `admin` role's `permissions` array is seeded or
migrated — check both `supabase/migrations/` (a data-seed migration, if that's how `roles` rows
are currently populated) and any admin-UI default-role logic in `src/app/admin/page.tsx`'s role
management section. **Verify against the live DB first** (per the Conventions query at the top of
this file) which mechanism actually owns the `admin` role's current permissions array before
choosing where to add the seed — do not guess.

**What:** append every `finance.*` key from task 4.1 to the `admin` role's stored `permissions`
array, so admins have Finance visibility **by default** (the stated requirement) while remaining
revocable via task 4.2's helper (the mechanism that makes revocation actually work, unlike
`hasStaffPermission`).

**Update `DB_SCHEMA.md`:** none, unless this is done via a data-migration file, in which case note
it under the `### roles` table entry that the `admin` row's default `permissions` includes
`finance.*` as of this migration.

**Verify:** query the live `admin` role's `permissions` column after this change and confirm every
`finance.*` key from 4.1 is present; then remove one key via the Role Permission settings UI and
confirm a `superadmin`-authored check (task 4.2) actually revokes it for that admin, unlike the
old `hasStaffPermission` behavior.

---

## 4.4 — Wire the Finance sidebar entry through all 4 permission maps

**Depends on 4.1, 4.2. Per DEC-027, this must be built as a new `src/components/admin/Finance/`
submodule, not more code inside `admin/page.tsx`.** **Where, exactly 4 places** (DEC-022 names
this exact count, and RISK-017/DEC-022 both flag the existing `Rooms` entry as proof this is easy
to get wrong):

1. `SIDEBAR_ITEMS` (`:159-174` as of this writing — verify current line) — remove `comingSoon:
   true` from the `{ label: "Finance", icon: CircleDollarSign, comingSoon: true }` entry (`:171`).
   **This alone is not sufficient**: `permittedSidebarItems` (step 3 below) unconditionally
   filters out any item still carrying `comingSoon: true` regardless of permissions, so leaving it
   set would make every later step in this task invisible with no error.
2. `hasPermission`'s `parentScreenMap` (two separate literal copies exist — confirmed at `:686-692`
   and `:711-719` as of this writing, each a `Record<string, string>` mapping a legacy screen name
   to a permission-key prefix). Add `"finance": "Finance"` and `"Finance": "finance"` to the
   respective copies (the two maps run in opposite key/value directions — check which is which
   before editing, do not assume symmetry).
3. `permittedSidebarItems`'s own `parentScreenMap` (`:711-719`) — same addition as above; this may
   be the same literal object as step 2's second copy, or a third copy — **verify by reading the
   current file**, since PROPOSALS.md's own audit already found these maps drift independently.
4. The redirect effect's `parentScreenMap` (`:2103-2109` as of this writing) — same addition again.

**Then, and only then, build `src/components/admin/Finance/`** (DEC-027): a focused submodule
exporting the Finance section's top-level component, composed into `admin/page.tsx`'s render only
at the point where `activeNav === "Finance"` is checked — the shell must not gain new section-
level state or view code, per DEC-027's explicit prohibition. Task 4.13 builds the actual screens
inside this module; this task's job is only to make the module reachable and permission-gated
correctly.

**Why this is its own task, separate from 4.13's UI build:** RISK-017 and DEC-022 both cite the
existing `Rooms` sidebar entry as a live example of exactly this wiring being incomplete
("gated on a permission that does not exist... so no non-superadmin can ever see it") — getting
the plumbing right and verified *before* building screens on top of it avoids debugging "why can't
I see Finance" and "is my P&L query wrong" as one tangled problem.

**Update `DB_SCHEMA.md`:** none. **Update `API_CONTRACT.md`:** none (client-side routing/permission
wiring, not an API change).

**Verify:** as a `superadmin`, confirm Finance appears and is clickable. As an `admin` (with the
default permissions from task 4.3), confirm it still appears. Revoke every `finance.*` permission
from that admin's role via Role Permission settings and confirm Finance disappears from their
sidebar and a direct navigation attempt (if reachable via `setActiveNav` some other way) redirects
via the effect at step 4 rather than rendering. This is the concrete DEC-022 acceptance test.

---

## 4.5 — Delete the ~4,000 lines of dead mock finance JSX

**Depends on 4.4** (the real Finance nav must exist and work before the orphaned block is safe to
remove — otherwise there is a window with no Finance section reachable at all). **Where:**
`src/app/admin/page.tsx` — the `activeNav === "Finances Dashboard"` block (`:21799` as of this
writing) and everything RISK-017 catalogs as belonging to it: `MOCK_POS_ORDERS` (`:352`),
`MOCK_FINANCE_TRANSACTIONS` (`:376`), `MOCK_PAYROLL` (`:395`), the Finance→Payroll screen with its
dead "Run Payroll" button, the Batch Management fake-profit-margin column, "Export Gross Report"
and "Filter" buttons with no `onClick`, and the `financesExpanded` state (`:3295` as of this
writing) that RISK-017 already confirmed gates nothing (`activeNav` alone controls the block).

**What:** delete all of it. Per RISK-017: "It is unreachable (no `setActiveNav` path leads to
it)... none of it can be re-pointed at numeric DB values without rewriting every render site" —
this is not salvageable UI, and DEC-014/DEC-011's original stub intent was always to replace it,
not extend it. **Before deleting, grep the whole file once more for each of the constant names
above** to confirm no new reference has been added since the 2026-07-25 audit — RISK-017's line
numbers will have drifted by the time this task is executed, and a fresh grep is cheap insurance
against deleting something that gained a real caller in the meantime.

**Update `DB_SCHEMA.md`:** none. **Update `API_CONTRACT.md`:** none (removes dead client code
only; these mock views never called any API route).

**Verify:** `npx tsc --noEmit` and `npx eslint` clean after deletion; grep confirms zero remaining
references to `MOCK_POS_ORDERS`, `MOCK_FINANCE_TRANSACTIONS`, `MOCK_PAYROLL`, and
`financesExpanded`; the real Finance section from task 4.4 still renders correctly (this task must
not accidentally delete anything task 4.4 added — they touch overlapping territory in the same
file, review the diff carefully).

---

## 4.6 — `GET /api/finance/pnl`

**Depends on 1.10, 1.11 (revenue lines exist), 1.14 (customer balances trustworthy), 2.11 (COGS
snapshotted), 3.10–3.12 (expenses/depreciation/loan-interest exist).** **Where:** new
`src/app/api/finance/pnl/route.ts`.

**What:** `GET` with `?branchId=&from=&to=` (or a `?period=YYYY-MM` shorthand — decide and
document). SQL-side aggregation (PROPOSALS.md is explicit this must not be a client-side
`.reduce()` the way every current admin number is computed) over:
- Revenue: `SUM(invoice_lines.line_total)` grouped by `line_type`, for invoices in range.
- Package breakage/recognition: revenue recognised via `customer_package_items` consumption in
  range (from task 1.13) plus any breakage recognised on expiry (DEC-025) — must not double-count
  against the package's original `invoice_lines` line, which books cash received, not revenue
  (DEC-023's core rule — this endpoint is where getting that distinction wrong would first become
  visible, since it is the one place both numbers are read together).
- COGS: `SUM(invoice_lines.cogs_snapshot)` for the same range (`NULL` values from lines never
  costed must be treated as unknown, not zero — surface a "partially costed" indicator rather than
  silently understating COGS).
- Commission: `SUM(invoice_lines.commission_snapshot)`.
- Fixed overhead: `SUM(expenses.amount)` for the range + `SUM(depreciation_entries.amount)` for
  the range + `SUM(loan_schedule.interest_part)` for the range (per task 3.7, **not**
  `installment` — the principal portion is a balance-sheet movement, not a P&L expense).
- Contribution margin and fully-loaded profit as the two DEC-015 views, computed from the above,
  clearly labeled which is which in the response per DEC-015's "the UI must label clearly which is
  for decisions and which is for full-cost curiosity."

**Update `DB_SCHEMA.md`:** none. **Update `API_CONTRACT.md`:** document the endpoint fully —
query params, response shape for both DEC-015 views, matching the existing file's format.

**Verify:** for a known set of test invoices/expenses in dev, hand-compute the expected P&L and
confirm the endpoint's numbers match exactly — this is the same "meaningful, not decorative"
regression discipline every prior phase's `scratch/*.ts` checks used, applied here as a manual
verification since this endpoint is SQL-aggregation-heavy rather than pure-function-heavy.

---

## 4.7 — `GET /api/finance/service-margin`

**Depends on 2.9, 2.11.** **Where:** new `src/app/api/finance/service-margin/route.ts`.

**What:** per service, `CM_per_minute` exactly as PROPOSAL-002 Phase 5 defines it —
`(price − materials − commission − pulse_cost) / duration_minutes(s)` — computed from
`invoice_lines` joined to `services.duration_minutes` (task 0.8) for a date range. This is listed
under Phase 5 in PROPOSALS.md but is fundamentally a *reporting* query, not a *capacity* one — it
belongs here because Phase 5's service-mix optimizer (task 5.7) consumes this same per-minute
figure as an input; building it once in Phase 4 and having 5.7 call it avoids duplicating the
margin formula in two places. Also surface the raw (non-per-minute) contribution margin per
service, since a non-specialist owner needs both the ranking metric and the plain "how much do we
make per session of X" number (DEC-015's stated labeling concern applies here too).

**Update `DB_SCHEMA.md`:** none. **Update `API_CONTRACT.md`:** document fully.

**Verify:** confirm a service with a known price/recipe/duration produces the hand-computed
`CM_per_minute`.

---

## 4.8 — `GET /api/finance/doctor-pnl`, `GET /api/finance/branch-pnl`

**Depends on 2.14 (provider_id-based commission attribution), 4.6.** **Where:** new
`src/app/api/finance/doctor-pnl/route.ts` and `src/app/api/finance/branch-pnl/route.ts`.

**What:** the same P&L shape as 4.6, sliced by `provider_id` and `branch_id` respectively.
Doctor P&L must use the task 2.14 fix (`provider_id`, not `doctor_name` string matching) — this is
the concrete report RISK-015 existed to make trustworthy; do not reintroduce name-string matching
here even as a shortcut. Branch P&L needs `branch_id` on every revenue/cost row it sums — note
task 0.4's still-open gap ("`branch_name` on sales. Not wired... there is no branch context
anywhere in the sell flow") means product-sale lines may be unattributable to a branch until that
gap is separately closed; if so, this endpoint must surface an explicit "unattributed" bucket
rather than silently omitting those sales from every branch's total (the totals across branches
plus "unattributed" must reconcile to the whole-clinic total from 4.6, or the discrepancy is a bug
in this endpoint, not a rounding artifact to wave away).

**Update `DB_SCHEMA.md`:** none. **Update `API_CONTRACT.md`:** document both endpoints.

**Verify:** for both endpoints, sum every slice and confirm it reconciles exactly to 4.6's
whole-clinic total for the same date range (accounting for any explicit "unattributed" bucket).

---

## 4.9 — `GET /api/finance/cashflow`

**Depends on 1.1–1.4 (`payments` rows are the cash-received side), 3.10 (expense payment dates),
3.12 (loan installment cash outflow).** **Where:** new `src/app/api/finance/cashflow/route.ts`.

**What:** cash **received** (`SUM(payments.amount)` by `received_at`, by `method`) vs cash **paid
out** (`expenses.amount` by `incurred_on`, `purchases.paid` by `purchased_at`, loan
`installment` by scheduled period) over a date range. This is deliberately a *different* number
from 4.6's P&L revenue — RISK-016 exists precisely because "a finance module defining revenue as
collected cash will disagree with bonus figures already paid to staff." Label this endpoint's
numbers as cash movement, not profit, and do not let its output be silently substituted for 4.6's
P&L revenue anywhere in the UI (task 4.13) — the two must be visibly distinct views, per DEC-014's
goal of a module a non-accountant can actually understand rather than one that quietly conflates
two different meanings of "revenue."

**Update `DB_SCHEMA.md`:** none. **Update `API_CONTRACT.md`:** document, explicitly noting the
cash-vs-accrual distinction from 4.6 in the endpoint's description so a future reader of this file
does not conflate the two either.

**Verify:** total cash in minus total cash out over a range matches a hand-tallied sum of the
underlying `payments`/`expenses`/`purchases`/`loan_schedule` rows for the same range.

---

## 4.10 — `GET /api/finance/receivables-aging`

**Depends on 1.14 (customer balances derived from the ledger, not the legacy scalar).** **Where:**
new `src/app/api/finance/receivables-aging/route.ts`.

**What:** for every customer with `outstanding > 0` (per the task 1.14 derivation, not the
pre-1.14 scalar — this endpoint must not be built before 1.14 lands or it inherits RISK-012's
inflated figures), bucket the outstanding balance by age since the invoice/settlement that created
it (e.g. 0-30 / 31-60 / 61-90 / 90+ days) — the standard "receivables aging" report PROPOSALS.md's
Phase 4 report list names explicitly.

**Update `DB_SCHEMA.md`:** none. **Update `API_CONTRACT.md`:** document fully.

**Verify:** for a test customer with a known unpaid invoice from a known date, confirm it lands in
the correct age bucket.

---

## 4.11 — Migration: `budget_lines` + `GET /api/finance/budget-vs-actual`

**Depends on 3.1 (expense categories to budget against).** **Where:**
`supabase/migrations/<timestamp>_create_budget_lines.sql`, then new
`src/app/api/finance/budget-vs-actual/route.ts`.

```sql
CREATE TABLE IF NOT EXISTS public.budget_lines (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id   uuid NOT NULL REFERENCES public.expense_categories(id) ON DELETE CASCADE,
  branch_id     uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  period        text NOT NULL,  -- 'YYYY-MM'
  budgeted      numeric NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category_id, branch_id, period)
);

ALTER TABLE public.budget_lines ENABLE ROW LEVEL SECURITY;
```

**Why this table wasn't in PROPOSALS.md's Phase 3 sketch but is needed here:** PROPOSALS.md's data
setup list names "Monthly budget per expense category — makes budget-vs-actual work immediately"
(item 19) as optional setup data, but no table to hold it exists anywhere in the Phase 1–3
sketches. Without it, the "budget vs actual" report PROPOSALS.md's Phase 4 explicitly lists cannot
be built at all — this task adds the minimal table the report needs, scoped to exactly what it
uses (one budgeted number per category/branch/month), not a general budgeting system.

**What the endpoint does:** for a given period, join `budget_lines.budgeted` against
`SUM(expenses.amount)` actually incurred in that category/branch/period, returning the variance.

**Update `DB_SCHEMA.md`:** add `### budget_lines` under the Phase 3 heading (it is schema support
for a Phase 3 category, even though the report consuming it is Phase 4 — cross-reference both
phases in the entry so a future reader isn't confused about which phase "owns" it). **Update
`API_CONTRACT.md`:** document the endpoint.

**Verify:** enter a budget line and a matching expense; confirm the endpoint's variance
calculation is exactly `budgeted − actual`.

---

## 4.12 — Chart library selection + base chart components

**No data dependency — can be done any time in this phase.** **Where:** a new dependency in
`package.json`, plus `src/components/admin/Finance/charts/` (per DEC-027's modular-submodule
requirement — chart components are section-level view code and must not land in `admin/page.tsx`).

**What:** PROPOSALS.md is explicit: "**Charting is from zero.** No library is installed; the one
existing 'chart' is 40 lines of literal SVG `<rect>` with baked-in pixel coordinates" — that dead
code is deleted by task 4.5, not reused. Select and install a charting library (evaluate for
bundle size and Next.js/React 18+ compatibility with whatever this project's current React version
is — check `package.json` before choosing), and build the minimal reusable set task 4.13's screens
will need: a line/area chart (trend over time), a bar chart (per-service/per-doctor/per-branch
comparison), and a simple stat-tile component for headline numbers — matching the kind of
componentization DEC-027 asks new sections to have from the start rather than growing organically
inside a page file.

**Update `DB_SCHEMA.md`:** none. **Update `API_CONTRACT.md`:** none (frontend-only).

**Verify:** each base chart component renders correctly with representative sample data in
isolation (a Storybook-less manual check is acceptable per this project's existing tooling — note
in the row whether a live browser check was actually done, per this file's "never state applied
state you have not measured" convention).

---

## 4.13 — UI: Finance dashboard pages

**Depends on 4.4 (the section is reachable and permission-gated), 4.6–4.11 (the data to render),
4.12 (chart components).** **Where:** `src/components/admin/Finance/` — one focused file per
screen (P&L, Service Margins, Doctor/Branch P&L, Cash Flow, Receivables Aging, Budget vs Actual,
Expenses management, Assets & Depreciation, Loans), composed under the Finance section's top-level
component from task 4.4. Per DEC-027, none of this may be added to `admin/page.tsx` itself.

**What:** wire each screen to its corresponding `/api/finance/*` endpoint from tasks 4.6–4.11, using
task 4.12's chart components, with DEC-015's contribution-margin/fully-loaded distinction visibly
labeled everywhere both numbers appear together (the concrete implementation of DEC-015's stated
UI requirement) and 4.9's cash-vs-accrual distinction from P&L kept visibly separate (the concrete
implementation of RISK-016's warning). Since this is a "non-accountant clinic owner" audience
(DEC-014), prefer plain labels over accounting jargon throughout.

**Update `DB_SCHEMA.md`:** none. **Update `API_CONTRACT.md`:** none (consumes existing documented
endpoints; if a screen reveals a response-shape gap in one of 4.6–4.11, fix the endpoint's contract
doc in that task's own commit, not silently here).

**Verify:** per this session's "test the golden path... in a browser" standard (not just
`tsc`/`eslint`) — start the dev server, log in as a permitted role, and click through every screen
this task adds, confirming real dev data renders correctly and the permission gate from 4.4 still
holds (a revoked role cannot reach these screens by URL or otherwise).

---

## 4.14 — `API_CONTRACT.md` rollup

Checklist task, same pattern as every prior phase's closing task. Close this out last.

---

# Phase 5 — Capacity & Optimization

> **Depends on Phase 1 (packages, for netting out committed capacity per DEC-023), Phase 2
> (per-service contribution margin, task 4.7, itself dependent on 2.9/2.11), and Phase 4's
> reporting patterns (5.9/5.10 are `/api/finance/*` routes built the same way as 4.6–4.11).**
> This is the last phase and the one PROPOSALS.md itself flags as requiring schema work most
> phases don't: "Requires fixing two things first" before capacity math is meaningful at all —
> see 5.1/5.4 below.
>
> **Read before starting any 5.x task:** `PROPOSALS.md` → PROPOSAL-002 Phase 5 (the target shape,
> including the worked capacity/break-even/service-mix formulas) · `DECISIONS.md` → DEC-015
> (contribution margin is the ranking metric), DEC-023 (committed package capacity must be netted
> out, not treated as sellable).
>
> **Ground rule, same as every phase:** schema change = migration + `DB_SCHEMA.md` update in the
> same commit; new tables enable RLS with no policies; regression scripts for any pure function.

## Phase 5 task table

| ID | Task | Depends on | Status | Owner | Commit |
|---|---|---|---|---|---|
| 5.1 | Migration: reservation status-transition timestamps + `no_show` status | — | `TODO` | — | — |
| 5.2 | Migration: holiday/leave calendar table | — | `TODO` | — | — |
| 5.3 | Migration: `refused_demand` table | — | `TODO` | — | — |
| 5.4 | Fix provider `shifts[]` collapse in `/api/availability` | — | `TODO` | — | — |
| 5.5 | Library: `src/lib/capacity.ts` — room/doctor minutes, bottleneck, utilization (pure functions) | 5.1, 5.4 (schema/data shape only) | `TODO` | — | — |
| 5.6 | Library: `src/lib/breakeven.ts` — break-even revenue (pure functions) | 4.6 (fixed cost inputs), 4.7 (contribution margin ratio) | `TODO` | — | — |
| 5.7 | Library: `src/lib/serviceMix.ts` — CM/minute ranking, greedy allocation, sellable-capacity netting | 4.7, 5.5, 1.13 (undelivered package sessions) | `TODO` | — | — |
| 5.8 | Regression checks for 5.5–5.7 | 5.5, 5.6, 5.7 | `TODO` | — | — |
| 5.9 | `GET /api/finance/capacity` | 5.1–5.5, 5.8 | `TODO` | — | — |
| 5.10 | `GET /api/finance/service-mix` | 5.6, 5.7, 5.8 | `TODO` | — | — |
| 5.11 | `API_CONTRACT.md` rollup for Phase 5, plus final `FINANCE_TRACKER.md` close-out check | rolling | `TODO` | — | — |

---

## 5.1 — Migration: reservation status-transition timestamps + `no_show`

**No dependency.** **Where:** `supabase/migrations/<timestamp>_add_reservation_timestamps.sql`

```sql
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS approved_at   timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at  timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at  timestamptz;

-- Verify the live constraint name and current allowed values first (per the Conventions
-- query at the top of this file) before dropping/recreating it.
ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_status_check;
ALTER TABLE public.reservations ADD CONSTRAINT reservations_status_check
  CHECK (status IN ('pending_deposit', 'pending', 'approved', 'confirmed', 'started',
                     'completed', 'cancelled', 'rejected', 'no_show'));
```

**Why (PROPOSALS.md Phase 5, "Data the system must start capturing" items 11-12):**
"Utilization... Needs a `no_show` status and status-transition timestamps (`approved_at`,
`completed_at`, `cancelled_at`) — none exist today." Confirmed against the current
`### reservations` entry in `DB_SCHEMA.md`: only `created_at`/`updated_at` exist, and the status
CHECK list (verified above) has no `no_show` value. Without these, "booked minutes" (task 5.5) can
be computed from `duration_minutes`, but utilization *trends* (how fast does a slot get approved,
how often is a completed booking actually completed on time) and no-show rate have no timestamp to
compute from.

**Application-code follow-up required, same task:** the PATCH handler in
`src/app/api/reservations/route.ts` must actually **write** `approved_at`/`completed_at`/
`cancelled_at` on the matching status transitions (mirroring how it already writes `updated_at`
implicitly) and must accept `'no_show'` as a valid status transition from the admin UI's booking
lifecycle actions — a migration alone does not populate these columns going forward. Note this
task therefore touches application code, not just a migration, unlike most other 5.x/earlier
schema tasks — call this out explicitly in the commit.

**Update `DB_SCHEMA.md`:** add the three new columns and the `no_show` status value to the existing
`### reservations` table entry, and correct the "Corrected 2026-07-25" notes section if it still
implies the status list is exactly the pre-this-task set.

**Verify:** approve, complete, cancel, and mark-no-show a test booking each; confirm the
corresponding timestamp column is set exactly once and the others remain NULL for that booking.

---

## 5.2 — Migration: holiday/leave calendar

**No dependency.** **Where:** `supabase/migrations/<timestamp>_create_holiday_calendar.sql`

```sql
CREATE TABLE IF NOT EXISTS public.holiday_calendar (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id    uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  provider_id  uuid REFERENCES public.providers(id) ON DELETE CASCADE,
  date         date NOT NULL,
  reason       text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CHECK (branch_id IS NOT NULL OR provider_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS holiday_calendar_date_idx ON public.holiday_calendar (date);

ALTER TABLE public.holiday_calendar ENABLE ROW LEVEL SECURITY;
```

**Why (PROPOSALS.md Phase 5):** "a holiday/leave calendar does not exist" is named as the second
of the "two things" required before capacity math is meaningful — without it, `room_minutes` /
`doctor_minutes` (task 5.5) overstate capacity on a day the clinic is closed or a doctor is on
leave, since today's calculation only knows about `branches`' regular open hours and providers'
regular `working_days_hours`/`shifts[]`, neither of which models exceptions.

**Why one table for both branch closures and doctor leave, distinguished by which FK is set (the
CHECK constraint enforces exactly one context, not both null and not both set is not enforced —
decide at implementation time whether a row can legitimately target both a specific branch AND a
specific provider, e.g. "Dr. X is on leave, but only at the New Cairo branch," and adjust the
CHECK if so):** a branch-wide closure (`branch_id` set, `provider_id` null) and one doctor's leave
day (`provider_id` set, `branch_id` null, or both if it's provider-at-one-branch-specific) are the
same *kind* of fact — "this capacity is not available on this date" — and task 5.5's room/doctor
minute calculation needs to check the same table for both cases rather than two.

**Update `DB_SCHEMA.md`:** add `### holiday_calendar` under a new `## Phase 5 — Capacity &
Optimization (PROPOSAL-002)` heading.

---

## 5.3 — Migration: `refused_demand`

**No dependency.** **Where:** `supabase/migrations/<timestamp>_create_refused_demand.sql`

```sql
CREATE TABLE IF NOT EXISTS public.refused_demand (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id     uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  service_id    bigint REFERENCES public.services(id) ON DELETE SET NULL,
  requested_at  timestamptz NOT NULL DEFAULT now(),
  reason        text NOT NULL DEFAULT 'no_slot' CHECK (reason IN ('no_slot', 'too_expensive', 'other')),
  note          text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS refused_demand_branch_id_idx ON public.refused_demand (branch_id);

ALTER TABLE public.refused_demand ENABLE ROW LEVEL SECURITY;
```

**Why (PROPOSALS.md's "Data the system must start capturing" item 18, called out as "the single
most important input for a capacity-expansion ROI case"):** "patients who found no free slot and
left. This leaves no trace today." This table has no read/write caller until an application
surface is built to log the event (e.g. `BookingModal.tsx` capturing "no available slot shown to a
patient who then abandoned"), which is deliberately **not** part of this task — this migration
only creates the structure; wiring a UI capture point is follow-up work, same pattern as `packages`
(task 1.5) existing before any endpoint wrote to it. Note that explicitly in the tracker row so it
is not mistaken for a finished feature once the table exists.

**Update `DB_SCHEMA.md`:** add `### refused_demand`, explicitly noting "schema-only, no write
caller yet" — the same honesty pattern the existing Phase 1 heading in `DB_SCHEMA.md` used
("these tables exist and are **schema-only**") before Phase 1's application wiring landed.

**Verify all of 5.1–5.3 together:** `npx supabase db diff --linked` shows exactly these changes;
re-run every prior phase's `scratch/*.ts` regression scripts.

---

## 5.4 — Fix provider `shifts[]` collapse in `/api/availability`

**No schema dependency.** **Where:** `src/app/api/availability/route.ts`, confirmed at this
writing to still do exactly what PROPOSALS.md's audit found: `:311` and `:442` both compare
`slotTime` against `dayConfig.start`/`dayConfig.end` directly — a single window — while the actual
provider configuration (`src/app/admin/page.tsx`'s `newEmployeeWorkingDaysHours` state, confirmed
present) already carries a `shifts: Array<{start, end}>` per day, meaning a split-shift doctor
(e.g. 9am–1pm, then 4pm–8pm) is collapsed to a single 9am–8pm window that overstates their real
available minutes by however long the gap is.

**What:** at both `:311` and `:442` (and anywhere else `dayConfig.start`/`dayConfig.end` gate slot
generation in this file — grep the current file rather than trusting only these two line numbers),
iterate `dayConfig.shifts` (falling back to the single `start`/`end` window only when `shifts` is
absent or empty, matching the fallback already present in `admin/page.tsx`'s own shift-reading
logic at `:954-955`) instead of reading `start`/`end` directly.

**Why this must land before task 5.5, not after:** PROPOSALS.md is explicit that Phase 5's
`doctor_minutes` calculation "Requires fixing two things first: provider `shifts[]` are currently
collapsed to a single start..end window... overstating split-shift doctors." Building the capacity
library against the current buggy availability data would bake a real overstatement into every
utilization and break-even number downstream — DEC-019's "repair the foundation first" principle
applied to this specific phase, the same reason Phase 0 had to precede Phase 1.

**Update `DB_SCHEMA.md`:** none (no schema change — this is a read-path bug fix over existing
`working_days_hours` JSONB data). **Update `API_CONTRACT.md`:** update the
`## GET /api/availability?serviceId=...` entry only if the response shape changes (it should not —
this fixes which slots are computed as available, not the shape of the response describing them).

**Verify:** configure a test provider with two shifts on one day with a gap between them; confirm
`/api/availability` no longer offers slots inside the gap, and that the total available-minutes
figure for that provider on that day (once task 5.5 exists) matches the sum of the two shifts, not
the full collapsed window.

---

## 5.5 — Library: `src/lib/capacity.ts`

**Depends on 5.1 (timestamps for booked-minutes attribution), 5.4 (real shift data) for the data
shape these functions consume — the functions themselves are pure and schema-agnostic.** **Where:**
new `src/lib/capacity.ts`.

**What:** pure functions, matching PROPOSAL-002 Phase 5's formulas exactly —
- `roomMinutes(rooms: {status: string}[], branchOpenMinutes: number): number` —
  `Σ (clinical rooms, status='available') × branch open minutes`.
- `doctorMinutes(providerShifts: {start: string; end: string}[][]): number` —
  `Σ over scheduled providers of Σ shifts[].(end − start)`, consuming the per-provider shift
  arrays task 5.4 now correctly exposes, netted against `holiday_calendar` (task 5.2) entries for
  the date in question — the caller (task 5.9's route) is responsible for excluding a provider's
  shifts entirely on a day they hold a `holiday_calendar` row, so this function receives only the
  shifts that are actually available, not a raw unfiltered schedule.
- `bottleneckMinutes(roomMinutes: number, doctorMinutes: number): number` —
  `min(room_minutes, doctor_minutes)`.
- `utilization(bookedMinutes: number, bottleneckMinutes: number): number` —
  `booked_minutes / bottleneck_minutes`, where `bookedMinutes` sums `duration_minutes` (task 0.8)
  for reservations with `completed_at` set (task 5.1) in the period, excluding `cancelled`/
  `no_show` (also task 5.1) — booked-but-not-delivered time is not utilized time.

**Update `DB_SCHEMA.md`:** none.

---

## 5.6 — Library: `src/lib/breakeven.ts`

**Depends on 4.6 (fixed monthly cost inputs: opex + depreciation + fixed salaries + loan interest,
all already aggregated by the P&L endpoint) and 4.7 (weighted average contribution margin ratio).**
**Where:** new `src/lib/breakeven.ts`.

**What:** `breakEvenRevenue(fixedMonthly: number, weightedAvgContributionMarginRatio: number):
number` — `fixed_monthly / weighted_avg_contribution_margin_ratio`, exactly as PROPOSAL-002 Phase
5 specifies. Throws on a ratio `<= 0` (a clinic with zero or negative average contribution margin
has no finite break-even point — surfacing `Infinity` or a divide-by-zero silently would be a
worse failure than an explicit error the caller must handle, same convention as every other
divide-by-input function across this module: `costPerPulse`, `recognisedRevenuePerSession`,
`monthlyDepreciation`).

**Update `DB_SCHEMA.md`:** none.

---

## 5.7 — Library: `src/lib/serviceMix.ts`

**Depends on 4.7 (per-service `CM_per_minute`), 5.5 (`bottleneckMinutes`), 1.13 (undelivered
package session counts, needed for the netting step below).** **Where:** new
`src/lib/serviceMix.ts`.

**What:**
- `rankByContributionMarginPerMinute(services: {id, cmPerMinute: number}[]): typeof services` —
  descending sort. PROPOSALS.md's stated reason this ranking (not raw margin percentage) is
  correct: "a 60%-margin service that occupies the only laser room for two hours is worse than a
  40%-margin service that takes twenty minutes."
- `sellableCapacity(bottleneckMinutes: number, undeliveredPackageMinutes: number): number` —
  `bottleneck_minutes − Σ (undelivered package sessions × duration_minutes)`, implementing DEC-023's
  netting requirement exactly: "Committed capacity must be netted out... Undelivered package
  sessions are already-sold future chair time... Treating all capacity as available would overstate
  potential revenue and double-count money the clinic has already collected." `undeliveredPackageMinutes`
  is computed by the caller from `customer_package_items.qty_remaining × services.duration_minutes`
  summed across active, non-expired `customer_packages` — this function only does the subtraction.
- `allocateGreedy(rankedServices: {id, cmPerMinute, durationMinutes, monthlyDemandCap: number}[],
  sellableMinutes: number): {serviceId, sessionsAllocated: number}[]` — greedy fractional-knapsack
  allocation, each service capped by its `monthlyDemandCap` (realistic monthly demand, supplied by
  the caller — not computed here), consuming `sellableMinutes` in ranked order until exhausted.
  PROPOSALS.md states greedy allocation "is provably optimal for this problem shape (fractional
  knapsack)" — implement it as a straightforward greedy pass, do not add unneeded optimization
  machinery (branch-and-bound, ILP solvers) for a problem this formula already solves exactly.
- `maxPotentialRevenue(allocation: {serviceId, sessionsAllocated}[], pricesById: Record<string,
  number>): number` — `Σ sessions_i × price_i` over the optimal allocation.
- `gapToPotential(maxPotential: number, actualRevenue: number): number` — plain subtraction; the
  *decomposition* into idle capacity / suboptimal mix / no-shows PROPOSALS.md names is a reporting
  concern (task 5.10 combines this with 5.5's utilization and 5.1's `no_show` counts to build that
  breakdown), not something this single pure function needs to compute internally.

**Update `DB_SCHEMA.md`:** none.

---

## 5.8 — Regression checks for 5.5–5.7

**Depends on 5.5, 5.6, 5.7.** **Where:** `scratch/phase5capacitycheck.ts`,
`scratch/phase5breakevencheck.ts`, `scratch/phase5servicemixcheck.ts` — three files, one per
library, continuing the one-concern-per-script convention every prior phase's checks used.

**What, specifically worth asserting given where prior phases' checks caught real bugs:**
- `bottleneckMinutes` correctly picks the *minimum*, not a sum or average, of room/doctor minutes
  for both directions (room-constrained and doctor-constrained cases).
- `sellableCapacity` never goes negative when undelivered package minutes exceed bottleneck
  minutes (clamp at 0, log — matching the clamp-and-log convention `computeSettledBalances`,
  task 0.5, already established for a structurally similar "this could go below a sane floor"
  case).
- `allocateGreedy` respects `monthlyDemandCap` per service (does not over-allocate a service past
  realistic demand even if it has the best `cmPerMinute` and capacity remains) and correctly stops
  when `sellableMinutes` is exhausted mid-service (partial session allocation — decide and assert
  whether a fractional session is truncated down or the greedy pass allows a slight overshoot on
  the last item, matching true fractional-knapsack semantics either way, and document the choice
  in the function's own comment, not only in the test).
- `maxPotentialRevenue` and `gapToPotential` compose correctly against a known hand-computed
  scenario end to end (rank → net → allocate → revenue → gap), not just each function in
  isolation — the composition is where a units mismatch (minutes vs sessions) would first surface.

**Update `DB_SCHEMA.md`:** none.

---

## 5.9 — `GET /api/finance/capacity`

**Depends on 5.1–5.5, 5.8.** **Where:** new `src/app/api/finance/capacity/route.ts`, built the
same way as every `/api/finance/*` route from Phase 4 (SQL-side aggregation feeding the task 5.5
pure functions, `requireStaffAccess`/`hasFinancePermission` gated per task 4.2).

**What:** per branch per day (or an aggregated range), `roomMinutes`, `doctorMinutes`,
`bottleneckMinutes`, `bookedMinutes`, `utilization`, and a no-show rate from the task 5.1 status
timestamps. This is the direct data source for task 4.13's capacity screen (built in Phase 4's UI
module, since DEC-027 already established that structure — this phase adds no new UI location).

**Update `DB_SCHEMA.md`:** none. **Update `API_CONTRACT.md`:** document fully.

**Verify:** for a branch/day with a known room count, provider shift configuration, and completed
bookings, hand-compute expected `bottleneckMinutes` and `utilization` and confirm the endpoint
matches.

---

## 5.10 — `GET /api/finance/service-mix`

**Depends on 5.6, 5.7, 5.8.** **Where:** new `src/app/api/finance/service-mix/route.ts`.

**What:** `breakEvenRevenue`, the ranked service list, the greedy-optimal allocation,
`maxPotentialRevenue`, and `gapToPotential` decomposed into idle capacity (from 5.9's utilization
shortfall), suboptimal mix (actual allocation vs. optimal allocation for the same sellable
minutes), and no-shows/cancellations (from 5.1's status timestamps) — the three-way decomposition
PROPOSALS.md names as the point of computing the gap at all, not just its total.

**Update `DB_SCHEMA.md`:** none. **Update `API_CONTRACT.md`:** document fully, including the
decomposition's three named components in the response shape.

**Verify:** for a known scenario (fixed service list, prices, durations, actual bookings), confirm
the endpoint's optimal allocation and gap decomposition matches a hand-worked version of
PROPOSALS.md's worked example reasoning (the laser-room-vs-twenty-minute-service comparison) —
i.e. confirm the *ranking*, not just the *arithmetic*, is correct: a lower-margin-percentage,
short-duration service should be allocated ahead of a higher-margin-percentage, long-duration one
when `CM_per_minute` says so.

---

## 5.11 — `API_CONTRACT.md` rollup for Phase 5, plus final tracker close-out check

Checklist task, same pattern as every prior phase's closing task — confirm every new/changed Phase
5 endpoint is documented in `API_CONTRACT.md`. **Additionally, once this task closes Phase 5's own
rollup**, do one pass over the entire `FINANCE_TRACKER.md` file (all five phases) confirming: every
row that should say `NEEDS-DB` because its migration is written but unverified against a live
database actually says so; every `DONE` row names a commit; and the "Open questions" table near the
top of this file (VAT treatment, cutover date, currency configuration, `admin_roles`/`employees`
table status) has been revisited — some of those questions may have been answered by work done
across Phases 2–5 and should be updated or resolved rather than left stale.
