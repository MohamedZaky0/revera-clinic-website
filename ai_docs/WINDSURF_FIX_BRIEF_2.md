# Windsurf Fix Brief 2 — Wallet Ledger (RISK-042) & API Authorization (RISK-036)

> **Read this entire file before writing a single line of code.**
> Both problems have already been investigated and root-caused. The diagnosis is correct and the
> line references were verified on the current `dev` branch. Your job is to apply the specified
> changes — **not** to re-diagnose, redesign, or improve anything else.

This is a follow-up to `ai_docs/WINDSURF_FIX_BRIEF.md`. Everything in that file's **HARD RULES**
section still applies in full. The most important ones, repeated because they were partially
violated last time:

1. **Do not create new files** unless a task explicitly says "create".
2. **Do not refactor, rename, or reformat** anything you were not told to change. Do not "fix"
   unrelated lint warnings — a `let` that could be `const` in untouched code stays as it is.
3. **Do not invent database columns or tables.** Everything you need already exists — this brief
   names each one. If something appears to be missing, **STOP and report**.
4. **Never fabricate a fallback value.** Unknown means `null`/`—`, never a plausible-looking guess.
5. **Never report success on a failure path.**
6. **One task = one commit.** Run `npx tsc --noEmit` and `npx eslint <touched files>` after each;
   both must show **0 errors** on the files you touched before moving on.
7. **If the code does not match what this brief describes, STOP** and report the discrepancy rather
   than applying the change somewhere that "looks close enough".
8. **Do not modify** `ai_docs/*`, `ROADMAP.md`, `TODO.md`, `FUTURE_FEATURES.md`, `AI_PIPELINE.md`.

**Migrations:** none of these tasks needs one. Every table and column referenced here already
exists. If you conclude otherwise, **STOP and report** — do not write a migration on your own
initiative.

---

# PART A — RISK-036: API routes with no server-side authorization

## The situation

`src/lib/access.ts` already provides everything needed. Read it first. Three helpers:

| Helper | Guarantees | Returns |
|---|---|---|
| `requireAuthenticatedUser(req)` | a valid Supabase session (patient **or** staff) | `{ user }` or `{ error, status }` |
| `requireStaffAccess(req)` | caller has an `employee_accounts` row | `{ access }` or `{ error, status }` |
| `requireAdministratorAccess(req)` | role is `superadmin` or `admin` | `{ access }` or `{ error, status }` |

The established call pattern, copied from `src/app/api/packages/sell/route.ts:40-43`:

```ts
const access = await requireStaffAccess(req);
if ('error' in access) {
  return NextResponse.json({ error: access.error }, { status: access.status });
}
```

Twelve routes currently call **none** of these — verified 2026-08-16, every one has zero auth calls:

`medical-records`, `prescriptions`, `branches`, `categories`, `providers`, `rooms`,
`service-rooms`, `terms`, `clinic-settings`, `page-settings`, `customer-avatars`,
`provider-attendance`.

## The constraint that makes this non-trivial — read carefully

**Several of these GET endpoints are consumed by the public marketing site and the public booking
page, by visitors who are not logged in at all.** Locking down GET on those breaks the public
website. Verified public consumers:

| Route | Public consumer |
|---|---|
| `branches` | `BookingModal.tsx`, `ContactPageContent.tsx`, `profile/page.tsx` |
| `providers` | `BookingModal.tsx` |
| `terms` | `BookingModal.tsx`, `TermsModal.tsx` |
| `page-settings` | `BookingModal.tsx` |

So the rule is **per-method, not per-route**: the read stays open where the public site needs it;
the writes get locked down. Do not apply a blanket guard to a whole file.

## TASK-A1 — Lock down PHI routes completely (highest severity)

**Files:** `src/app/api/medical-records/route.ts`, `src/app/api/prescriptions/route.ts`

Both expose GET, POST and DELETE with no auth. This is patient medical data — anyone who knows or
guesses a `customer_id` can currently read, overwrite or delete another patient's records.

**Do this:** guard **every** exported method (GET, POST, DELETE) in both files with
`requireStaffAccess`. No public consumer exists for either route — verified, they are called only
from admin/doctor components.

**Do NOT** use `requireAuthenticatedUser` here. A logged-in *patient* satisfies that check (patient
OTP login is real Supabase Auth), which would let any patient read any other patient's records.

## TASK-A2 — Lock down writes on config/CMS routes, leave public reads open

**Files (write methods only):**

| File | Guard these | Leave GET open |
|---|---|---|
| `src/app/api/branches/route.ts` | POST, DELETE | yes |
| `src/app/api/providers/route.ts` | POST, PATCH, DELETE | yes |
| `src/app/api/terms/route.ts` | POST, PUT, DELETE | yes |
| `src/app/api/page-settings/route.ts` | POST | yes |
| `src/app/api/categories/route.ts` | POST, DELETE | yes |
| `src/app/api/rooms/route.ts` | POST, PATCH, DELETE | yes |
| `src/app/api/service-rooms/route.ts` | POST | yes |
| `src/app/api/clinic-settings/route.ts` | POST | yes |
| `src/app/api/customer-avatars/route.ts` | POST | yes |
| `src/app/api/provider-attendance/route.ts` | POST | yes |

Use `requireAdministratorAccess` for `branches`, `categories`, `terms`, `page-settings`,
`clinic-settings` — these define the clinic and its public-facing content; a receptionist should not
be able to rewrite the Terms & Conditions or deface the marketing site.

Use `requireStaffAccess` for `providers`, `rooms`, `service-rooms`, `customer-avatars`,
`provider-attendance` — day-to-day operational data that non-admin staff legitimately maintain.

`categories` and `clinic-settings` have **no public consumer** — verified. Their GETs may also be
guarded with `requireStaffAccess`. If guarding either GET breaks anything in the admin UI, **STOP
and report** rather than reverting silently.

## TASK-A3 — Verify nothing broke

The admin UI must send the auth header on every newly-guarded call. Many admin fetches already do
this via `getAuthHeaders()` (`src/components/admin/doctor/utils.ts`) or an
`authenticatedJsonHeaders` value in `src/app/admin/page.tsx`.

**Do this:** for every route you guarded, grep for its callers and confirm each write call sends an
`Authorization` header. Where one does not, add it using whichever of those two existing mechanisms
that file already uses. **Do not invent a third auth-header helper.**

**Report explicitly:** a list of every call site you checked, and which ones needed a header added.
This is the step most likely to break the admin panel — an unauthenticated admin write will now
return 401 instead of silently succeeding. Take it seriously.

---

# PART B — RISK-042: wallet ledger and package sales

## The situation

Three customer-level scalars are the numbers the admin UI actually displays: `customers.spent_amount`,
`customers.outstanding`, `customers.wallet_balance`. The `wallet_txns` table exists and is fully
specified in `ai_docs/DB_SCHEMA.md` — but **nothing has ever written a row to it.** Verified: it is
read in exactly one place (`src/app/api/customers/reconcile/route.ts:33`) and inserted nowhere.

Consequences today:
- `src/lib/customerBalances.ts:77-79` derives the ledger wallet balance purely from `wallet_txns`,
  so it is always `0` for every customer.
- `GET /api/customers/reconcile` therefore reports a wallet mismatch for essentially every customer
  who ever had a refunded deposit. The wallet column of that report is currently noise, not signal.
- Package sales write a correct `invoices`/`invoice_lines`/`payments` set but never touch any of the
  three scalars, so package revenue is invisible in "Total Spent".

## TASK-B1 — Write a `wallet_txns` row at every point the wallet moves

There are exactly **four** places `customers.wallet_balance` is written. Verified 2026-08-16 — if
you find a fifth, **STOP and report it**:

| # | File:line | What it does |
|---|---|---|
| 1 | `src/app/api/reservations/route.ts:1022` | cancel → refund deposit into wallet (**in**) |
| 2 | `src/app/api/reservations/route.ts:1256` | settlement via `computeSettledBalances` (either direction) |
| 3 | `src/app/api/inventory/products/sales/route.ts:175` | POS sale paid from wallet (**out**) |
| 4 | `src/app/api/customers/route.ts:194,216` | staff setting the balance manually, as an absolute value |

**Do this:** create one shared helper — put it in `src/lib/wallet.ts` (**create this file**) —
that writes a `wallet_txns` row *and* updates `customers.wallet_balance` together, then call it from
all four sites instead of the current bare `.update({ wallet_balance })`.

The `wallet_txns` columns are fixed by the schema; use them exactly as documented in
`ai_docs/DB_SCHEMA.md`:
- `direction` is `'in'` or `'out'` — **the sign lives in `direction`, never in `amount`**
- `amount` has a `CHECK > 0` constraint — a zero or negative amount will be rejected by the database
- `reason` is `NOT NULL` — pass a short, specific string (e.g. `'deposit refund on cancellation'`,
  `'POS sale payment'`, `'manual adjustment by staff'`)
- `invoice_id` is nullable — set it where an invoice exists (site 3), leave null where none does

**Site 4 is the awkward one.** Staff set an absolute balance, not a delta. Convert it: read the
current balance, compute `delta = new - current`, and write a txn with
`direction = delta > 0 ? 'in' : 'out'` and `amount = Math.abs(delta)`. **If `delta` is 0, write no
row at all** — `amount` must be `> 0` or the insert fails.

**Site 2 already computes a settled wallet figure** via `computeSettledBalances` in
`src/lib/billing.ts`. Do **not** change that function's arithmetic — it is deliberately delta-based
and idempotent, and was verified correct. Only add the ledger write alongside the scalar update it
already performs.

**Ordering matters:** update the scalar and insert the txn so that a failure cannot leave them
disagreeing. Insert the `wallet_txns` row **first**; if it fails, do not update the scalar and
surface the error. A ledger row with no scalar update is recoverable; a scalar change with no ledger
row is the exact drift this task exists to eliminate.

**No migration is needed for this task.** The table is already created by
`supabase/migrations/20260726010300_create_wallet_txns.sql` — verified 2026-08-16. Do not write a
migration for `wallet_txns`, and do not alter that file.

## TASK-B2 — Backfill is out of scope

Historical wallet movements that happened before this change have no ledger rows and cannot be
reconstructed — there is no record of when or why they occurred. **Do not attempt a backfill, and do
not invent opening-balance rows.** (`wallet_txns.is_opening` exists for a deliberate opening-balance
import under DEC-024; that is a separate, unrelated decision. Leave it alone.)

Just note in your report that pre-existing balances will show as ledger drift until an opening-balance
import is done separately.

## TASK-B3 — Package sales must update the customer scalars

**File:** `src/app/api/packages/sell/route.ts`

Two defects in the same handler:

1. **The scalars are never updated (~lines 100-177).** After the `payments` insert succeeds, add
   `spent_amount += totals.grandTotal` on the customer. Follow the read-then-write shape of
   `addToCustomerSpend()` in `src/app/api/inventory/products/sales/route.ts:121-149` — do not invent
   a different pattern.
2. **`payments.method` is hardcoded `'cash'` (~line 171)** regardless of how the patient actually
   paid, so payment-method reporting is wrong for every package sale ever recorded.

   Fix: accept a `paymentMethod` field on the request body (the handler currently destructures only
   `{ customerId, packageId, branchId }` at ~line 46) and pass it through. The `payments.method`
   CHECK constraint allows exactly: `'cash'`, `'card'`, `'wallet'`, `'instapay'`, `'transfer'`.
   Validate against that list and reject anything else with a 400. Default to `'cash'` when the field
   is absent, so existing callers keep working.

   **If `paymentMethod` is `'wallet'`**, it must behave like the POS path: check the balance up front
   and refuse the sale with a 409 if it is short, then deduct via the TASK-B1 helper. Copy the guard
   shape from `src/app/api/inventory/products/sales/route.ts` (the `payingFromWallet` block, ~line
   443) — do not write a different one.

3. **Update the admin caller** so a receptionist can pick the payment method when selling a package.
   Find the component that calls `/api/packages/sell`, add a method selector matching the styling of
   the inputs already in that form, and send the chosen value. **Do not redesign the form.**

**Do NOT** touch `outstanding` here — a package is paid in full at point of sale, so there is no
outstanding balance to create. If you believe otherwise, **STOP and report** instead of writing it.

## TASK-B4 — Confirm reconcile now works

After B1 and B3, `GET /api/customers/reconcile` should stop reporting phantom wallet mismatches for
customers whose wallet movements all post-date this change.

**Do not change `src/lib/customerBalances.ts` or the reconcile route** — they were verified correct;
they were reading an empty table, which B1 fixes. Just confirm by reading the code that the shapes
line up, and say so in your report. If they do not line up, **STOP and report** rather than editing
either file.

---

# REPORTING — required after every task

- Files changed, one line each on what changed and why.
- Output of `npx tsc --noEmit` and `npx eslint <touched files>`.
- **TASK-A3 specifically:** the full list of call sites checked and which needed an auth header.
- **TASK-B1 specifically:** confirmation that exactly four wallet write sites were found, or details
  of any fifth.
- Anything you were told to STOP on, quoted exactly, with what you actually found.
- Anything you chose not to change, and why.

**If you are unsure about anything, stop and ask. A stopped task is recoverable; a wrong change
applied across twelve route files is not.**
