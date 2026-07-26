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

> ## ⏸ PAUSED 2026-07-26 — read this before doing anything else in Phase 1+
>
> On explicit user instruction, code execution stopped after task 1.10 (checkout invoice
> dual-write — see that section for its exact unfinished state) mid-way through. **The next
> session's first job is NOT to keep writing Phase 1 code.** It is to break Phase 2, 3, 4 and 5
> into the same kind of tracked micro-tasks this file already has for Phase 1 — see each phase's
> outline in `PROPOSALS.md` for the starting material. **Only once all five phases are broken down
> this way should code execution resume**, picking up wherever it is genuinely needed most (which
> may still be finishing 1.10's live verification — see that section — not necessarily Phase 2).
>
> This mirrors why Phase 0 was broken into 0.0–0.10 before any of it was touched, and why Phase 1
> was broken into 1.1–1.16 before this session wrote a single migration: planning the whole unit
> first is what let each individual task stay small, reviewable, and safe to hand to a different
> model without re-deriving context. Do the same for 2–5 before writing more implementation code.

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
| 1.10 | Wire booking checkout (`PATCH /api/reservations`, `status: 'completed'`) to dual-write an invoice | 1.1–1.4, 1.7 | `WIP` — code written, statically verified, **not exercised against a live checkout** | Claude | `see 1.10 below` |
| 1.11 | Wire POS sale (`POST /api/inventory/products/sales`) to dual-write an invoice | 1.1–1.4, 1.7 | `TODO` — not started | — | — |
| 1.12 | New endpoint: sell a package (`POST /api/packages/sell` or similar) | 1.5, 1.6, 1.8 | `TODO` | — | — |
| 1.13 | New endpoint: consume a package session, recognise revenue pro-rata | 1.12 | `TODO` | — | — |
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

## 1.10 — Wire booking checkout to dual-write an invoice — WIP, needs live verification

> **STOP AND READ FIRST if you are resuming this task.** The session that wrote this went no
> further than what is described below, on explicit user instruction to stop and re-plan the
> remaining phases before writing more code (see the note at the very top of this tracker file
> about the 2026-07-26 pause). Do not assume this is finished just because code exists.

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

**NOT done — this is why the row is `WIP`, not `DONE`:**
- **Never exercised against the live checkout flow.** No test runner exists in this project and
  this environment cannot click through the admin panel in a browser. Nobody has confirmed that
  completing a real booking actually produces a correct `invoices` + `invoice_lines` + `payments`
  row in the dev database, or that `reservations.amount_paid` / `customers.spent_amount` are
  unchanged from before this task — which is the entire point of "dual-write, additive only."
  **Do this before marking 1.10 `DONE`:** complete a real booking checkout (or as close to
  end-to-end as available tooling allows) and verify both halves — the ledger rows exist AND the
  pre-existing values are untouched.
- `received_by_employee_id` on both the initial payment and the later-payment path is currently
  always `null` — the PATCH body carries no "who is processing this checkout" field today
  (`createdByEmployeeId` is a different thing, the booking's original creator). Attributing
  cashier identity needs either a new request field or reading it from the auth token
  (`requireStaffAccess`'s result is validated but discarded earlier in this handler, not
  currently threaded through to here).
- Invoice writing is scoped inside `if (isSettlement && target.customer_id)` — a checkout with no
  linked customer record produces no invoice. This matches the existing scope of the customer
  balance settlement code right above it, but is worth a deliberate decision later, not an
  accident to discover.

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

## 1.11 — Wire POS sale to dual-write an invoice

**Depends on 1.1–1.4, 1.7.** **Where:** `src/app/api/inventory/products/sales/route.ts`, the
`POST` handler, after the existing `product_sales` insert (`mapSaleToDbRow`/`insertedDb`).

**What:** same dual-write pattern as 1.10 — one invoice, one `line_type: 'product'` line, one
payment row per POS sale — additive, does not touch the existing `product_sales` write or the
`addToCustomerSpend` call from task 0.6/RISK-016.

**Update `API_CONTRACT.md`:** note the side effect, same as 1.10.

**Verify:** same standard as 1.10 — a POS sale still behaves exactly as after task 0.6, plus now
also produces a ledger row.

---

## 1.12 — New endpoint: sell a package

**Depends on 1.5, 1.6, 1.8.** **Where:** new `src/app/api/packages/sell/route.ts` (or fold into
an existing customer/POS route if that reads more naturally once you're looking at the actual
call sites — use judgement, but document the choice in `API_CONTRACT.md` either way).

**What:** `POST` body: `customerId`, `packageId`, `branchId?`. Creates: an `invoice` +
`invoice_line` (`line_type: 'package'`) for the sale, a `payments` row, a `customer_packages` row
(`price_paid`, `expires_at = now() + validity_days`), and one `customer_package_items` row per
`package_items` entry (`qty_total = qty_remaining = package_items.qty`, `qty_used = 0`).
**Books cash received, not revenue** — the invoice line's `line_total` is the sale amount, but
per DEC-023 no portion of it is "earned" yet; that only happens in 1.13, per session delivered.

**Update `DB_SCHEMA.md`:** none. **Update `API_CONTRACT.md`:** document the new endpoint fully
(request/response shape), matching the existing style in that file for other endpoints.

---

## 1.13 — New endpoint: consume a package session

**Depends on 1.12.** **Where:** new route, or a new action on an existing one — again use
judgement on the exact shape, document the choice.

**What:** given a `customer_package_items` row and a delivered session, decrement
`qty_remaining` / increment `qty_used`, and recognise
`recognisedRevenuePerSession(price_paid, qty_total)` of revenue for that one session (exactly how
this "recognition" is recorded — a new invoice? a note on the original invoice? — needs a decision
at implementation time; the safest default given DEC-014's "management accounting, not
bookkeeping" stance is a small revenue-recognition record referencing the original
`customer_package_items` row, not a second customer-facing invoice). Also implement the manual
per-customer **extend** action here (DEC-025): sets a new `expires_at` on `customer_packages`,
records `extended_by_employee_id`/`extended_at`, available regardless of the package's
`on_expiry` default.

**Update `API_CONTRACT.md`.**

**Verify:** the invariant from 1.9's package test case, now end-to-end: sell a 6-session package
for 1000, consume 2, confirm recognised + deferred still sum to 1000.

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
