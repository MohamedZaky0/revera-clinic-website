# Test Coverage Inventory

A complete sweep of every module in the system: what each user action actually triggers, which
tables it writes, and what needs a test. Built by tracing UI buttons → API endpoints → table writes,
not by reading feature docs.

**Scale of the surface:** 71 API route files / **153 HTTP handlers**, 26 `src/lib` modules,
~31,500 lines of components (of which `src/app/admin/page.tsx` alone is 26,807 lines with 401
`onClick` handlers).

**Covered today:** 7 of 26 lib modules; **9 of 153 handlers** have a real route-level test
(`/api/hr/doctor-payroll` GET/POST/PATCH, `/api/reservations` PATCH fully + GET/POST auth-shape,
`/api/reception/dashboard` GET/POST, `/api/packages/consume` POST), plus auth-shape-only assertions
on 4 more routes. Component tests: 7 of the P0 money components (module 12) have real
render/interaction tests as of this sweep. No E2E.

**Update 2026-08-22** — a 58-commit non-Windsurf merge landed feature work (bookings, billing,
checkout, reception, attendance) straight onto `dev`, outside this test net. Re-running the suite
against it surfaced 7 hard failures. What that pass changed:
- **RISK-012 regressed and was re-fixed** (`05c5136` → `8f8c2dd`): the wallet double-application
  guard in `computeSettledBalances`. Caught only by the existing pure-function test; there was no
  route-level equivalent, so one was added and verified by inverting the fix (reverting `billing.ts`
  and confirming the new test goes red).
- **Geofenced Start Shift** (`e5e788a`) had zero coverage despite being the only start-shift path
  the live UI calls. 5 real tests added + 2 `it.fails` gaps pinned (see module 2).
- **`/api/packages/consume`** endpoint wiring covered for the first time (15 tests), which is how
  **RISK-065** was found — `e79a691` silently dropped the "service must be on the booking" guard.
- 4 new `it.fails` markers total, all naming a RISK id and source line. Suite: **617 passing,
  10 expected fail, 0 failures.**

## How to read this

Each flow is written as **Trigger → endpoint → tables written**. That chain is the unit of testing:
a test is worth writing where a wrong result would move money, corrupt a balance, or silently lose a
record.

| Priority | Meaning |
|---|---|
| **P0** | Money or stock moves. A silent bug here is discovered by a customer or a doctor complaining. |
| **P1** | Derived numbers people make decisions on (P&L, payroll, reports). Wrong = wrong decision. |
| **P2** | Access control and data integrity. Wrong = data leak or corruption. |
| **P3** | CRUD and presentation. Wrong = annoying, not dangerous. |

## The rule every test in this repo follows

**A test asserts what the system *should* do, never what it currently does.** Expected values come
from the business rule — what a doctor, receptionist, or accountant would say is correct — not from
running the code and recording the output. A test written by copying current behaviour turns a bug
into a specification, and the next person to fix it gets a red suite telling them they broke
something.

This means some tests describe behaviour that does not work yet. That is the point: the suite is a
specification *and* a defect list. To keep it usable as a regression gate at the same time:

> A test for behaviour that is known-broken is marked **`it.fails(...)`**, with a comment naming the
> RISK id and the source line responsible.

`it.fails` inverts the result: while the bug exists the test fails and vitest reports it as
**"expected fail"**, so the suite stays green and the gap stays visible in the output. The moment
someone fixes the bug the test starts passing and `it.fails` turns **red** — the signal to delete
the marker and let the test guard the fixed behaviour for real.

So the suite goes red in exactly two situations, both of which deserve attention: a regression was
introduced, or a known bug was fixed and its marker needs removing. Never `it.skip` for this — a
skipped test proves nothing and is invisible.

Worked example: `tests/routes/doctor-payroll.test.ts`, the RISK-015 immutability test.

---

## Findings from this sweep

Four things surfaced while tracing the flows. They are not test gaps — they are defects that the
missing tests would have caught. Per the rule above, each gets a test asserting the **correct**
behaviour, marked `it.fails` until the defect is fixed.

### F-1 — `/api/reception/dashboard` POST has no authentication at all (P0, security) — FIXED

`src/app/api/reception/dashboard/route.ts:192` exposes `start_shift` / `end_shift` and never checks
an `Authorization` header — it is the only mutating endpoint in the system with zero auth. Anyone who
can reach the URL can clock any employee in or out. This is the endpoint behind the reception
shift buttons.

**Fixed 2026-08-19 — see RISK-059.** Both GET and POST now require `requireStaffAccess`, restricted
to `receptionist`/`hr`/`admin`/`superadmin`.

### F-2 — Same endpoint clocks in the *wrong person* when `employeeId` is omitted (P0) — FIXED

At `:207-211`, if no `employeeId` is supplied it falls back to `ilike("department", "Reception")`
with `.limit(1)` — the first Reception employee in arbitrary DB order. Two receptionists on shift
means one silently records the other's attendance, which then feeds `hr_payroll`.

**Fixed 2026-08-19 — see RISK-059.** POST resolves the employee from the authenticated session
instead; a receptionist can only act on their own record, HR/admin/superadmin may target another
via an explicit `employeeId`.

### F-3 — `start_shift` wipes an existing `check_out_time` (P0, idempotency) — FIXED

At `:224-238`, `start_shift` upserts `check_out_time: null` on conflict of `(employee_id, date)`.
Re-firing it after a shift already ended erases the end time, leaving an open shift for that day.

**Fixed 2026-08-19 — see RISK-059.** `start_shift` now checks today's existing row first: rejects
with 409 if the shift already ended, no-ops if already in progress, only upserts a fresh row when
none exists.

### F-4 — The entire checkout money calculation lives inside a JSX closure (P0, untestable)

`src/app/admin/page.tsx:25960-25998` computes `walletDeduction`, `netDue`, `changeAmount`,
`remainingAmount`, and `totalPaidIncludingDeposit` inline inside the render body, then PATCHes the
result to the server. The server trusts these numbers. This is the single most financially sensitive
calculation in the product and it **cannot be tested without extracting it** into `src/lib/`.
Extraction should be the first task of the P0 work, not an afterthought.

---

## 1. Booking & Reservations — P0

The busiest module: `/api/reservations` is called from **29 sites** in the UI.

### New Booking (public + admin)

| Trigger | Endpoint | Tables written |
|---|---|---|
| Public `BookingModal` submit | `POST /api/reservations` | `reservations` |
| Admin `AdminNewBookingView:491` | `POST /api/reservations` | `reservations` |
| Slot picker loads | `GET /api/availability` | — (read) |

**Scenarios to test:**
- Booking a slot that is already taken is rejected, not double-booked.
- Booking outside working hours / on a holiday is rejected.
- Room, device, and provider are all checked for conflicts — not just the provider.
- A booking with `serviceIds` (multi-service) reserves capacity for the total duration, not one slot.
- Deposit amount is stored on the reservation and is *not* yet counted as revenue.
- The same payload submitted twice does not create two reservations.
- A booking for a phone number that matches an existing customer links to that `customer_id`
  instead of creating a duplicate customer.
- Public POST stays public (no token required) — already asserted in `tests/routes/auth.test.ts`.

### Status transitions (the button chain)

**Covered** — `tests/routes/reservations-patch.test.ts` (52 tests): every action below, plus the
settlement/invoice/costing path in the Checkout section, plus the three patient self-service
bypass shapes. Remaining gaps that need a real database or browser are in
`ai_docs/manual_tests/RESERVATIONS_PATCH_MANUAL_TESTS.md` (the `checked_in` CHECK-constraint
fallback, real concurrent-booking races, and full-page browser verification).

Every transition is a `PATCH /api/reservations?id=…` from a different button:

| Button | UI location | Payload |
|---|---|---|
| Approve | `admin/page.tsx:7388, 7500` | `action: "approve"` |
| Reject | `admin/page.tsx:7510, 23271` | `action: "reject"` |
| Check in | `admin/page.tsx:23391` | `status: "checked_in"` |
| Start session | `admin/page.tsx:23429` | `status: "started"` |
| Cancel | `admin/page.tsx:23539` | `action: "cancel"` |
| No-show | `admin/page.tsx:23560` | `action: "no_show"` |
| Postpone / reschedule | `admin/page.tsx:25885` | `action: "postpone"` |
| **Complete (checkout)** | `admin/page.tsx:25994` | `status: "completed"` + money |

**Scenarios to test — one per transition:**
- `started` sets `started_at` **once**; a later money-only PATCH does not reset the clock (RISK-043).
- `completed` sets `completed_at` and computes `actual_duration_minutes` from `started_at`; when
  `started_at` is null no duration is fabricated.
- Cancel and no-show are **rejected** on an already-completed booking.
- Cancel/no-show fired twice does not refund or forfeit the deposit twice (RISK-029).
- Postpone is rejected on completed / cancelled / no-show bookings.
- Postpone *with* a new date reschedules without entering `postponed` limbo; without one it sets
  `postponed` and keeps the stale date.
- Every transition is idempotent when re-fired with the same payload.

### Checkout — the money event (highest priority in the system)

**Covered at the route level** — `tests/routes/reservations-patch.test.ts` exercises
`writeCheckoutInvoice`/`applyCheckoutCosting` directly (invoice + line + payment writes, commission
snapshot, consumable stock deduction) for the server side of checkout. **F-4 still blocks the
client-side money math** described below — nothing in `admin/page.tsx`'s checkout modal itself is
testable yet.

One PATCH triggers all of this:

**Trigger:** Checkout confirm → `PATCH /api/reservations` (`status: completed`) → writes
`reservations`, `invoices`, `invoice_lines`, `payments`, `customers`, `wallet_txns`,
`consumption_entries`, `stock_movements`, `inventory_products`, `inventory_devices`,
`reservation_products`.

Then the UI separately fires `POST /api/packages/consume` per redeemed package item.

**Scenarios to test:**
- An `invoices` row + one `invoice_lines` row per service is written exactly once.
- `cogs_snapshot` and `commission_snapshot` are written per line (commission math itself is now
  covered by `tests/lib/costing.test.ts`).
- Customer pays in full → `spent` up by the amount, `outstanding` unchanged.
- Customer underpays → `outstanding` up by exactly the remainder.
- Customer pays from wallet → `wallet_balance` down, a `wallet_txns` row written, `spent` includes
  the wallet-funded portion.
- Change given back to wallet → `wallet_balance` up, ledger row written.
- Deposit already collected is included in the total paid, not dropped
  (`admin/page.tsx:25985` — the comment there is truncated mid-sentence, worth re-reading).
- Re-firing completion does not double-count anything (RISK-012) — **now covered at the route level
  too** (`tests/routes/reservations-patch.test.ts`), including the wallet movement specifically,
  which is the half that actually regressed in `05c5136`. Verified by inverting the fix.
- Consumables are deducted from `inventory_products` and a `stock_movements` row is written.
- Device pulse counters increment.
- Completion still succeeds when the costing/invoice step fails (it is deliberately non-fatal) —
  and the failure is logged, not swallowed.
- Package redemption failure does not roll back the completed checkout.

**Blocker:** F-4 above. Extract the checkout math from `admin/page.tsx` into `src/lib/checkout.ts`
first, then these become straightforward.

---

## 2. Reception & Shifts — P0

| Trigger | Endpoint | Tables written |
|---|---|---|
| Dashboard loads | `GET /api/reception/dashboard` | — (read) |
| **Start shift** | `POST /api/reception/dashboard` | `hr_attendance` |
| **End shift** | `POST /api/reception/dashboard` | `hr_attendance` |

**Covered** — `tests/routes/reception-dashboard.test.ts` (19 tests + 2 `it.fails`). F-1/F-2/F-3
fixed 2026-08-19, see RISK-059. Manual click-through: `ai_docs/manual_tests/RISK_059_MANUAL_TESTS.md`.

**Geofence, added 2026-08-22.** `e5e788a` made this route the only start-shift path the UI calls —
the older `POST /api/hr/attendance` that RISK-006 documents is no longer invoked from the frontend
at all. Now covered: inside-radius check-in records its coordinates; outside-radius is refused with
no row written; missing and out-of-range coordinates are each refused distinctly; a branchless
superadmin bypasses the check by design. Two gaps pinned as `it.fails`:
- **GPS `accuracy` is never validated** (RISK-006) — destructured at `route.ts:358` and never read,
  so a check-in reporting a 5km error radius is accepted like a 5m one, which makes the 800m radius
  meaningless on coarse (wifi/cell) positioning. RISKS.md claims a 100m ceiling is enforced; it is
  not, on either route. Left unfixed on 2026-08-22 — the real threshold is a product decision.
- **No branch coordinates configured → check-in accepted from anywhere.** The older route was
  deliberately changed to block this (`dd600cd`, "fail check-in and block if branch location
  coordinates are not configured in db"); this one guards its refusal behind
  `candidateBranches.length > 0` and so does the opposite.

**Scenarios to test:**
- **No token → 401.** ✅ Fixed — see F-1/RISK-059.
- Non-reception/non-HR token → 403. ✅ Fixed.
- `start_shift` writes `check_in_time` and status `Present` for today.
- `end_shift` writes `check_out_time` for today's row only.
- **`start_shift` on an already-ended shift does not erase `check_out_time`.** ✅ Fixed — see F-3.
- **With two Reception employees and no `employeeId`, the request does not silently pick the wrong
  one.** ✅ Fixed — see F-2.
- `end_shift` with no open shift returns a clear error rather than a 500.
- An invalid `action` returns 400 without touching `hr_attendance`.

---

## 3. Doctor Workspace — P0/P1

| Trigger | Endpoint | Tables written |
|---|---|---|
| Ongoing session loads devices | `GET /api/service-devices` | — |
| **Save prescription** | `POST /api/prescriptions` | `prescriptions` |
| Patient history drawer | `GET /api/medical-records` | — |
| Doctor schedule edit | `PATCH /api/providers` | `providers`, `provider_schedule_audit_logs` |
| Doctor attendance | `POST /api/provider-attendance` | `provider_attendance` |

Note: the doctor's "close session" button is **not** a doctor-side endpoint — it routes through the
same `PATCH /api/reservations` checkout described in module 1. The doctor screen writes prescriptions
and notes; the money is settled by Reception.

**Scenarios to test:**
- A doctor can only read medical records for patients they are actually treating.
- Prescription POST requires a staff token; a patient token is rejected.
- Prescription is linked to the right reservation and patient.
- Schedule change writes an audit-log row (who changed what, when).
- `GET /api/prescriptions` for another patient's records returns empty, not data.

---

## 4. Packages — P0

| Trigger | Endpoint | Tables written |
|---|---|---|
| Sell package | `POST /api/packages/sell` | `customer_packages`, `customer_package_items`, `invoices`, `invoice_lines`, `payments`, `customers` |
| Redeem at checkout | `POST /api/packages/consume` | `customer_package_items`, `reservations` |
| Extend expiry | `POST /api/packages/extend` | `customer_packages` |
| Package CRUD | `GET/POST/PATCH/DELETE /api/packages` | `packages`, `package_items` |

**Scenarios to test:**
- Selling a package creates one `customer_package_items` row per included session, at the right
  quantities.
- Sale money is booked as **deferred revenue**, not immediately recognised (this is what
  `package_revenue_recognitions` exists for).
- Consuming a session decrements remaining count by exactly 1.
- Consuming an already-exhausted item is rejected.
- Consuming an **expired** package is rejected.
- Consuming the same `customerPackageItemId` twice for the same reservation does not double-decrement.
- Revenue is recognised as sessions are consumed — `recognisedRevenueSoFar` / `deferredBalance` are
  already unit-tested in `tests/lib/packages.test.ts`. **Endpoint wiring now covered for
  `/api/packages/consume`** — `tests/routes/packages-consume.test.ts` (14 tests + 1 `it.fails`):
  auth, both id validations, exact-one decrement, exhausted-item refusal, non-completed-reservation
  refusal, package auto-close on last session, cross-patient refusal, phone-match fallback with
  `customer_id` backfill, the RPC-succeeds branch (asserting it does *not* also apply the fallback
  and double-spend), and the `reservation_products` fallback for mid-visit additional services.
  `/api/packages/sell` and `/api/packages/extend` remain uncovered.
- **RISK-065 (found by the above):** `e79a691` dropped the "service must be on the booking" guard —
  a session can be burned for a service never delivered on that visit. Pinned as `it.fails`.
- Extending expiry does not change remaining session counts or recognised revenue.

---

## 5. Finance / P&L — P1 (14 endpoints, zero tests)

Every finance screen is a read-only endpoint aggregating the ledger. None has a test. The tables each
one reads (traced from source):

| Endpoint | Reads |
|---|---|
| `/api/finance/pnl` | `invoices`, `invoice_lines`, `expenses`, `expense_categories`, `fixed_assets`, `depreciation_entries`, `loan_schedule`, `package_revenue_recognitions`, `inventory_products`, `services`, `categories` |
| `/api/finance/cashflow` | `invoices`, `payments`, `expenses`, `expense_categories`, `purchases`, `loan_schedule` |
| `/api/finance/branch-pnl` | `invoices`, `invoice_lines`, `expenses`, `branches`, `fixed_assets`, `depreciation_entries`, `loan_schedule`, `package_revenue_recognitions` |
| `/api/finance/doctor-pnl` | `invoices`, `invoice_lines`, `providers`, `package_revenue_recognitions` |
| `/api/finance/service-margin` | `invoices`, `invoice_lines`, `services` |
| `/api/finance/service-mix` | 15 tables — the widest aggregate in the system |
| `/api/finance/receivables-aging` | `invoices`, `payments`, `customers` |
| `/api/finance/commission-payouts` | `doctor_payroll`, `invoices`, `invoice_lines`, `providers` |
| `/api/finance/package-profitability` | `packages`, `customer_packages`, `customer_package_items`, `invoices`, `invoice_lines`, `package_revenue_recognitions` |
| `/api/finance/budget-vs-actual` | `budget_lines`, `expenses`, `expense_categories` |
| `/api/finance/trend` | `invoices`, `invoice_lines`, `expenses`, `fixed_assets`, `depreciation_entries`, `loan_schedule`, `package_revenue_recognitions` |
| `/api/finance/capacity` | `reservations`, `providers`, `rooms`, `services`, `branches`, `holiday_calendar` |
| `/api/finance/no-show-cost` | `reservations`, `services`, `branches` |
| `/api/finance/new-vs-returning` | `invoices`, `invoice_lines`, `package_revenue_recognitions` |

**Scenarios to test — these apply to nearly all of them:**
- **Void and draft invoices are excluded** from every revenue figure.
- **Date range boundaries are inclusive/exclusive consistently** — a transaction exactly on the
  start or end date lands in exactly one period.
- An empty range returns zeros, not `null`/`NaN`, and does not 500.
- Branch filter actually filters; an unknown branch returns zeros rather than everything.
- **Cash-basis vs accrual-basis do not get mixed** (RISK-016): `cashflow` uses `payments`,
  `pnl` uses `invoice_lines`. A test should pin which is which so a future edit cannot quietly swap them.
- Deferred package revenue appears in P&L only as it is recognised, never at sale time.
- Depreciation for the period is included exactly once.
- **The same period reconciles across endpoints**: `pnl` revenue and `branch-pnl` summed across all
  branches agree; `doctor-pnl` summed across doctors agrees with service revenue. This
  cross-endpoint agreement test is the highest-value one in this module.
- Rounding: totals equal the sum of their own line items to 2 decimal places.
- Auth: every finance endpoint rejects a non-finance staff token.

---

## 6. HR & Payroll — P0/P1

| Trigger | Endpoint | Tables written | Coverage |
|---|---|---|---|
| Run doctor payroll | `POST /api/hr/doctor-payroll` | `doctor_payroll` | **Covered** |
| Mark doctor paid | `PATCH /api/hr/doctor-payroll` | `doctor_payroll` | **Covered** |
| Run staff payroll | `POST /api/hr/payroll` | `hr_payroll` | None |
| Mark staff paid | `PATCH /api/hr/payroll` | `hr_payroll` | None |
| Attendance | `GET/POST/PATCH /api/hr/attendance` | `hr_attendance` | Auth only (RISK-063 open — see module 10) |
| Leaves | `GET/POST/PATCH /api/hr/leaves` | `hr_leave_requests` | Auth only (RISK-063 open) |
| Performance | `/api/hr/performance` | `hr_performance` | Auth only |
| Alerts | `/api/hr/alerts` | `hr_alerts` | Auth only (RISK-063 open) |

**Scenarios to test (staff payroll):**
- `achieved_revenue` holds **revenue**, not a count, when `target_type_snapshot='reservations'`
  (RISK-016 says it currently holds a count — the test should assert the intended behaviour and
  will fail until fixed).
- Bonus is calculated against the target correctly at, just below, and just above the threshold.
- A doctor who is also an employee is not double-counted across `hr_payroll` and `doctor_payroll`
  (RISK-015, open).
- Re-running payroll for the same month upserts, not duplicates.
- Leave days reduce attendance-derived pay correctly.
- Attendance check-out before check-in is rejected.

---

## 7. Inventory, POS & Purchasing — P0

| Trigger | Endpoint | Tables written |
|---|---|---|
| Sell product (POS) | `POST /api/inventory/products/sales` | `product_sales`, `invoices`, `invoice_lines`, `payments`, `inventory_products`, `stock_movements`, `customers` |
| Product CRUD | `GET/POST/PUT/DELETE /api/inventory/products` | `inventory_products` |
| Stock reconcile | `GET /api/inventory/products/reconcile` | — |
| Record purchase | `POST /api/purchases` | `purchases`, `purchase_lines`, `inventory_products`, `stock_movements` |
| Device CRUD | `GET/POST/PUT /api/inventory/devices` | `inventory_devices` |
| Reset pulses | `POST /api/inventory/devices/[id]/reset-pulses` | `inventory_devices`, `device_audit_logs` |
| Assign product to patient | `POST/PATCH /api/customers/products` | `customer_products` |

**Scenarios to test:**
- A sale decrements stock by exactly the quantity sold and writes one `stock_movements` row.
- Selling more than available stock is rejected — stock never goes negative.
- Selling the last unit flips status to `Out of Stock`.
- A sale writes an invoice + payment so it reaches P&L (retail revenue must not be invisible to finance).
- A purchase increments stock and updates weighted-average cost correctly.
- `reconcile` reports zero drift when `stock_movements` and `inventory_products` agree, and reports
  the exact drift when they do not.
- Pulse reset writes an audit-log row with the previous count.
- Deleting a product that has sales history is refused or soft-deleted, never silently orphaning rows.

---

## 8. Expenses, Assets & Loans — P1

| Trigger | Endpoint | Tables written |
|---|---|---|
| Expense CRUD | `/api/expenses` | `expenses` |
| Recurring expense CRUD | `/api/expenses/recurring` | `recurring_expenses` |
| **Generate due expenses** | `POST /api/expenses/generate-due` | `expenses` |
| Asset CRUD | `/api/assets` | `fixed_assets` |
| **Post depreciation** | `POST /api/assets/post-depreciation` | `depreciation_entries`, `fixed_assets` |
| Loan CRUD | `/api/loans` | `loans`, `loan_schedule` |

**Scenarios to test:**
- `generate-due` run twice in the same period does **not** create duplicate expenses — this is the
  classic double-charge bug.
- `generate-due` respects each recurring expense's start date, frequency, and end date.
- `post-depreciation` for a month already posted is a no-op, not a second entry.
- Depreciation stops once an asset is fully depreciated — accumulated never exceeds cost.
- Loan schedule principal + interest sums to the total repayment.
- An expense dated outside the reporting period does not appear in that period's P&L.

---

## 9. Customers & Identity — P0/P2

| Trigger | Endpoint | Tables written |
|---|---|---|
| Customer CRUD | `/api/customers` | `customers` |
| Reconcile balances | `GET /api/customers/reconcile` | — |
| Package redemptions view | `GET /api/customers/package-redemptions` | — |
| Avatar upload | `POST /api/customer-avatars` | `customer_avatars` |

**Scenarios to test:**
- Two bookings with the same phone number resolve to one customer, not two
  (`customerIdentity.ts` is unit-tested; the **endpoint** is not).
- Phone normalisation handles `+20` / `0020` / leading-zero variants as the same person.
- `reconcile` reports zero drift when the ledger and the denormalised scalars agree, and the exact
  delta when they do not — this is the safety net for every balance bug above.
- Deleting a customer with financial history is refused, not cascaded.
- A patient token cannot read another patient's record.

---

## 10. Auth & Access Control — P2

`src/lib/auth.ts` and `src/lib/access.ts` gate everything.

**Covered** — `tests/routes/auth-sweep.test.ts`: a single table-driven registry over 149 of the
153 handlers, asserting two dimensions per guarded route — no token → 401, and an authenticated
non-staff (patient) session → 403 — plus a "confirmed-public reads stay public" check for the
handful that are intentionally unguarded. 286 assertions from one registry, not 153 hand-written
tests, and it fails loudly the moment a new route is added without updating the registry (a sanity
test pins the exact row count).

**A note on `CLAUDE.md` rule 3:** it states `/api/*` routes are not auth-validated server-side. This
sweep found that to be **out of date** — every route file now calls a guard except the confirmed
intentionally-public ones (`/api/auth/employee-email`, `/api/branches` GET, `/api/services` GET,
`/api/terms` GET, `/api/providers` GET, `/api/page-settings` GET, `/api/packages` GET,
`/api/availability`, `/api/health/supabase`, `/api/customer-avatars` GET — each either explicitly
commented "public" or plainly needed by the unauthenticated marketing site). `/api/reception/
dashboard`'s hole (F-1/F-2/F-3) was fixed 2026-08-19, see RISK-059. Rule 3 in `CLAUDE.md` should be
rewritten to reflect this.

**New finding from building the sweep — RISK-063 (open):** `POST /api/hr/alerts`,
`POST`/`PATCH /api/hr/attendance`, and `POST /api/hr/leaves` each inline a check for *a valid
Supabase session* but never verify that session belongs to actual staff (no `employee_accounts`
lookup) — unlike every GET in those same three files, which correctly use `verifyHrAccess`. An
authenticated patient can currently submit HR attendance/leave/alert rows. Asserted as `it.fails`
in the sweep; see RISK-063 for the fix (swap the inline check for `verifyHrAccess`).

**Open product question, not guessed at in the sweep:** `provider-attendance` GET, `rooms` GET, and
`service-rooms` GET have no auth guard and no comment establishing intent — unlike the confirmed-
public list above, these return staff scheduling/room data, not marketing content. Whether they
should be public is a product call; flagged here rather than asserted either way.

---

## 11. Settings, Content & Public Site — P3

`/api/services`, `/api/branches`, `/api/rooms`, `/api/providers`, `/api/roles`, `/api/categories`,
`/api/terms`, `/api/page-settings`, `/api/clinic-settings`, `/api/suppliers`,
`/api/service-consumables`, `/api/service-devices`, `/api/service-rooms`, `/api/translate`,
`/api/employees`, `/api/employees/notes`, `/api/medical-records`.

**Scenarios to test:**
- CRUD round-trips (create → read → update → delete).
- Deleting a service that is referenced by bookings or packages is refused.
- Service price change does **not** retroactively alter already-issued invoices — the snapshot holds.
- Required-field validation returns 400, not 500.
- Public reads stay public (partly covered already).

---

## 12. Components (`src/components/**`, excluding `src/app/admin/page.tsx`)

Component-level tests (vitest + jsdom + React Testing Library, `tests/components/**/*.test.tsx`)
render each component, interact via `@testing-library/user-event`, and assert on rendered output
plus the exact `fetch()` calls fired (`tests/helpers/fetchFake.ts`, mirroring
`tests/helpers/supabaseFake.ts`'s "actually apply the request, throw loudly on anything
unimplemented" philosophy). `src/app/admin/page.tsx` is excluded — it is being split into these
same components by a separate, parallel effort; testing it directly would be testing code about to
move.

**Finding from this sweep — RISK-019 doc drift:** RISK-019 states *"no client component reads or
writes a Supabase table any more"* since commit `8108b82`. That is no longer true. Three of the
seven P0 components below (`AdminBookingsView`, `UserProfileView`, `DoctorAccountView`) read and
**write** `reservations`/`providers`/`branches`/`doctor_payroll`/`employee_accounts` directly from
the browser via `@/lib/supabaseClient` (the anon-key client) — salary, commission, and target-revenue
figures, and the booking approve/reject buttons, never touch an API route at all. RISK-019's
"residual risk" paragraph already flags permissive RLS policies on `employee_accounts`/`hr_*`/
`doctor_payroll` as functionally open with the anon key; this sweep confirms live, current-code call
sites hitting exactly that gap, not just policy config. RISK-019 needs a correction pass, and the
approve/reject write path bypassing `PATCH /api/reservations` (module 1's documented status-transition
guards — e.g. rejecting an already-completed booking) is worth a follow-up look.

**New finding — unlogged timezone bug in `UserProfileView.tsx`:** `getDateRange()` builds
`monthStr` from `new Date(year, month, 1).toISOString().split("T")[0]`. `new Date(...)` is local
midnight; `.toISOString()` converts to UTC. In any timezone ahead of UTC — including Africa/Cairo,
this clinic's own timezone — local midnight on the 1st is still the previous day in UTC, so
`monthStr` silently resolves to **last month**. `doctor_payroll` is looked up with
`.eq("month", monthStr)`, so a doctor's current-month payroll (fixed salary, commission, deductions)
is looked up under the wrong month for the whole clinic's timezone. Reproduced directly in this
sandbox (Europe/Berlin, UTC+2) via `tests/components/UserProfileView.test.tsx`, marked `it.fails`
pending a RISK id. The same `getDateRange`-shaped pattern (`new Date(y, m, 1).toISOString()`) is
worth grepping for elsewhere in the codebase — this file is very unlikely to be the only place it
was written.

| Component | Priority | Coverage | Notes |
|---|---|---|---|
| `admin/bookings/AdminBookingsView.tsx` | P0 | **Covered** (10 tests) | Payment-status derivation matrix (RISK-039 regression guard), doctor-name resolution, approve/reject — direct Supabase writes, not `PATCH /api/reservations`. |
| `admin/DoctorAccountView.tsx` | P0 | **Covered** (4 tests) | `handleCompleteTreatment`'s checkout PATCH (`amountLeft` calc, status transition), rejected/cancelled booking filtering, patient dedup. |
| `admin/UserProfileView.tsx` | P0 | **Covered** (10 tests, 1 `it.fails`) | Doctor/staff net-salary math, target-progress %, password-change validation. Direct Supabase reads only (no `fetch()` at all in this file). |
| `admin/doctor/DoctorProfileDetailsView.tsx` | P0 | **Covered** (12 tests) | Doctor→reservation matching, search/status/date filters, pagination, CSV export payload. No fetch/Supabase — pure prop-driven display+filter logic. |
| `admin/doctor/tabs/DoctorOngoingSessionTab.tsx` | P0 | **Covered** (11 tests) | Additional-service subtotal/pulses math, `/api/service-devices` default-pulses lookup, inline prescription POST. |
| `admin/Finance/AssetsScreen.tsx` | P0 | **Covered** (11 tests) | Total cost/book-value/depreciation math, add/edit/delete validation (salvage ≤ cost), post-depreciation flow. |
| `admin/Finance/NewVsReturningScreen.tsx` | P0 | **Covered** (9 tests) | New-patient revenue share %, walk-in note visibility, branch filter refetch. |

**Remaining `src/components/**` surface** (P1 finance/reporting screens, then P2/P3 CRUD and
presentational components) is not yet swept file-by-file the way the API modules above are — that
sweep is future work, to be done as component test batches land.

---

## Recommended order

1. ~~Route tests for `PATCH /api/reservations`~~ — **done** (52 tests,
   `tests/routes/reservations-patch.test.ts`).
2. **Extract the checkout math** out of `admin/page.tsx` into `src/lib/` (F-4), then unit-test it.
   The server side of checkout is now covered; the client-side money math is still not.
3. ~~**Fix and test `/api/reception/dashboard`** (F-1, F-2, F-3) — smallest file, three real bugs,
   and it is the shift flow.~~ **Done 2026-08-19 — see RISK-059.**
4. **Table-driven auth test** across all 153 handlers (module 10) — cheap, wide, and catches every
   future unguarded route.
5. **Packages endpoints** (module 4) — deferred revenue is the easiest thing to get quietly wrong.
6. **Finance cross-endpoint reconciliation test** (module 5) — one test that proves the P&L,
   branch P&L, and doctor P&L agree for the same period.
7. Everything else by priority label.
