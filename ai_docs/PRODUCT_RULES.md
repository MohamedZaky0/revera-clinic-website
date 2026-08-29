# PRODUCT_RULES.md — Revera Clinics Business Rules (Enforced in Code)

> **Last Updated:** 2026-07-30
> **Source:** Confirmed from live code only — no speculation
> **2026-07-30 Update:** Added Doctor & Receptionist Session Workflows, Patient Medical Records Intake Requirements, Session Products & Pulses calculation, and Admin Customer Balances formulas.

---

## What This File Is

This file documents business logic that is **actually enforced in the codebase today**.
It is not a wishlist or aspirational spec. If a rule is not enforced in code, it is not listed here.

---

## Booking / Scheduling Rules

### ~~Daily capacity cap — 8 bookings per service per day per branch~~ — REMOVED 2026-07-25

**This rule was never enforced.** It violated this file's own contract (only rules actually
enforced in code belong here) and was carried for weeks.

`src/app/api/reservations/route.ts` was read in full: the PATCH approve block (lines 345–523)
contains **no count check of any kind**. The only `8` relating to bookings is
`src/components/BookingModal.tsx:1066`, a client-side check that is dead code — the `disabledDates`
map it reads is populated as `isAvailable === false ? 99 : 0` (`BookingModal.tsx:356-358`), so it
only ever holds 0 or 99, never an actual count.

Do not plan capacity work around an 8-per-day ceiling; it does not exist.

---

### ~~Time slot uniqueness per service~~ — REMOVED 2026-07-25

**This constraint was deliberately dropped**, not lost. See
`supabase/migrations/20260705141243_setup_rooms_schema.sql:104-105`, with the comment
"to allow multiple bookings per slot in different rooms".

**What IS enforced:** a `room_id` can be assigned only once per date + time_slot when status is
`'approved'` — unique partial index `reservations_unique_room_slot`. Note the approve-time conflict
query (`src/app/api/reservations/route.ts:407-412`) filters by date and status but **not** by
branch; this is currently correct only because `room_id` is globally unique across branches.

---

### Doctor double-booking is NOT prevented
**Confirmed 2026-07-25:** `src/app/api/reservations/route.ts:509-520` writes `doctor_name` with no
validation against `working_days_hours` or existing bookings. Doctor conflict checking exists only
in the read-only `/api/availability` (lines 305–345). An admin approving from the panel can
double-book a doctor, so any doctor-utilization figure derived from `reservations` may exceed 100%.

---

### Slot duration-aware availability
**Enforced in:** `src/app/api/availability/route.ts`

The availability endpoint checks whether a contiguous block of 15-min slots equal to the
service's duration is free. A service with duration 1:00 Hour needs 4 consecutive free
15-min slots.

Operating hours are defined by the branch's specific `service_hours` table configuration when a `branchId` is specified. If not specified or no branch-specific hours are set, the global clinic-wide hours (09:00–20:00) defined in `src/lib/services.ts:ALL_15MIN_SLOTS` are used as a fallback.

---

### Required booking fields
**Enforced in:** `POST /api/reservations`

`serviceId`, `date`, `name`, `email`, `phone` are required. Missing any returns HTTP 400.

---

### Default session type
**Enforced in:** `POST /api/reservations`

If `sessionType` is not provided, defaults to `'in_person'`.

---

### Booking origin badge
**Enforced in:** `POST /api/reservations`

Public website bookings are tagged with `origin: 'website'` and displayed with an origin badge in the admin list.

---

### Booking step flow & MD3 Date/Time Pickers
**Enforced in:** `src/components/BookingModal.tsx`, `MaterialDatePicker.tsx`, `MaterialTimePicker.tsx`

The public website patient booking flow is consolidated into 3 main steps (or 2 steps if deposit percentage is 0):
1. **Service & Schedule (`Service & Schedule` / `الخدمة والموعد`)**: Combines session type selection (In-Clinic vs Online), branch selection, service category & service dropdown, and inline Material Design 3 style custom Date & Time pickers.
   - **Date Picker (`MaterialDatePicker.tsx`)**: MD3 full month calendar with date header, month switcher (`<` `>`), weekday grid, and brand-styled day selector (`var(--cr-primary)` `#414E36`).
   - **Time Picker (`MaterialTimePicker.tsx`)**: MD3 digital display (`HH:MM` with AM/PM toggle) paired with interactive radial analog clock dial and toggleable quick slots grid.
2. **Confirm (`Confirm` / `تأكيد`)**: Summary of reservation, optional doctor selection, patient name/email/phone, notes, and Terms & Conditions.
3. **Payment (`Payment` / `الدفع`)**: InstaPay / Mobile Wallet deposit submission (when deposit percentage > 0).

---

### Booking lifecycle stages
**Enforced in:** `src/app/admin/page.tsx` + `PATCH /api/reservations`

Valid statuses include: `pending`, `approved`, `rejected`, `confirmed`, `started`, `completed`, `cancelled`. UI enforces stage progression for action buttons.

---

### Booking cancellation constraints
**Enforced in:** `PATCH /api/reservations` and `src/app/admin/page.tsx`

Cancellation sets `status` to `'cancelled'` and optionally records `cancelled_reason`. Completed bookings cannot be cancelled.

---

## Service Catalog Rules

### Service duration format
**Enforced in:** `src/lib/services.ts:getDurationInMinutes()`

Duration strings are parsed from formats: `'1:30 Hours'`, `'30 mins'`, `'1:30'`. Default fallback
if unparseable: 30 minutes.

---

### Service visibility and active flags
**Confirmed in schema:** `services.visible` and `services.active` columns exist.
**Note:** No enforcement of these flags on the public website was confirmed in code during audit.
The admin panel displays them but patient-facing queries (`GET /api/services`) return all services
without filtering by visible/active.

---

## Admin Panel Rules

### ~~No authentication on admin panel~~ — STALE, corrected 2026-07-25

`/admin` **does** have a Supabase email/password login gate (see "Admin login and role lookup"
below, and DEC-010). This entry predated it and contradicted the rest of this file.

**The accurate statement:** selected sensitive API mutations validate a bearer token in their
handlers. `PATCH /api/reservations` requires `requireStaffAccess` except for its narrowly scoped
public deposit self-report; `DELETE /api/reservations` requires an administrator; and payroll,
roles, employees, and product-sales mutations have route-level checks. Coverage is not universal:
`/api/customers`, inventory, and customer-product routes still require their own authorization
review. See RISK-018.

---

### Admin can hard-delete all reservations
**Enforced in:** `DELETE /api/reservations?id=all`

Deletes all rows from the reservations table. No soft-delete. No confirmation beyond the UI.

---

### Admin login and role lookup
**Enforced in:** `src/app/admin/page.tsx` + `GET /api/auth/me`

- Login uses Supabase Auth email/password.
- `superadmin@revera.com` bypasses employee lookup and receives full permissions.
- All other users: session token sent to `/api/auth/me`, which looks up `employee_accounts` + `roles` and returns `permissions` array.
- Server-side token validation is partial; sensitive routes must enforce it in their handlers.

---

### Provider attendance geofence
**Enforced in:** `POST /api/hr/attendance` (client trigger: `src/app/admin/page.tsx` geolocation check-in effect)

- Requires branch coordinates (`lat`, `lng`) configured on the branch (resolved from `maps_link` when present).
- Calculates distance between employee GPS location and branch coordinates.
- If distance > 800m, check-in is rejected and logged with status `Out of Location`.
- Two separate bypasses exist:
  - **Client-side:** the browser skips calling the check-in API entirely when `adminRole === 'superadmin'` AND the logged-in employee has no `branch_id` assigned (global superadmins with no branch).
  - **Server-side:** the route itself always allows check-in (no distance check) when the employee's email is exactly `superadmin@revera.com`, regardless of role or branch.
- Note: `POST /api/provider-attendance` is a separate, unrelated route — it just upserts an admin-set manual status/check-in-out time for a provider, with no geolocation logic at all.

---

### Coming-soon sidebar sections are superadmin-only
**Enforced in:** `src/app/admin/page.tsx` (`SIDEBAR_ITEMS`, `permittedSidebarItems`)

- Marketing, Customer Support, Reports, and Finance are placeholder sidebar entries (`comingSoon: true`) with no page behind them.
- Rendered disabled, greyed out, unclickable, with a "Coming Soon" hover tooltip.
- Filtered out of `permittedSidebarItems` for every role except `superadmin`.

---

## localStorage Keys (Revera-branded)

Service state on the admin side persists to localStorage under these keys:
- `revera_service_toggles`
- `revera_dynamic_services`
- `revera_dynamic_categories`

These keys will need changing when forking for client #2.

---

## Inventory Product Roles & Sales Restrictions
**Enforced in:** `src/app/admin/page.tsx` and `POST /api/inventory/products/sales`

- Products with `role === 'consumable'` are marked as "Consumable (used in services only)".
- Standalone retail sale of consumable products to patients is strictly blocked:
  - In `src/app/admin/page.tsx` products list table, the **Sell Product** action button is disabled with label `"Consumable Only"` and tooltip `"Consumable Only (Used in services only, not for retail sale)"`.
  - In `handleOpenSellProductModal`, opening the retail POS modal is blocked with an alert.
  - In retail product select dropdowns, consumable items are filtered out.
  - In `POST /api/inventory/products/sales`, server-side validation checks `role === 'consumable'` and rejects the transaction with HTTP 400.

---

## Customer Wallet Rules
**Enforced in:** `PATCH /api/reservations` (checkout/settlement action)

When completing a reservation, the receptionist processes a payment settlement. If the reservation's status is updated to `'completed'`, the linked customer's profile is updated:
- **Wallet Balance**: Decreased by any `walletWithdrawal` amount used for payment and increased by any `walletDeposit` (overpayment change saved to wallet).
- **Total Spent**: Increased by the amount paid plus any wallet balance used to offset the cost. Customer's lifetime total spent (`spent_amount`) only increases when payment is actually settled.
- **Outstanding Debt**: Increased by any unpaid session remainder (`effectiveAmountLeft = totalCost - amountPaid`). When a session treatment is completed without payment, the unpaid session amount is added to `customer.outstanding`. Upon invoice settlement, `customer.outstanding` is reduced and `customer.spent_amount` is increased.

---

## What Is NOT Enforced (But May Be Assumed)

The following are **not currently enforced in code**:
- Patient phone OTP verification (auth modal is UI-only, OTP is simulated)
- Service visible/active flags filtering public service list
- Package redemption on a booking that already has a deposit paid — deposits are booking-level, not
  per-service, so waiving a service's price after cash was collected against it would need
  refund/reversal logic that isn't built. Redemption is disabled (with an explanatory note) for any
  checkout where `amountPaid > 0` before that checkout. (Package/session tracking itself **is**
  built — see `customer_packages`/`customer_package_items` in `DB_SCHEMA.md`, wired to UI 2026-07-28.)
- External Payment Gateway processing (payments are logged as cash/card settlements in the admin dashboard ledger only)
- Automated reminders (enable_reminder flag exists on services but no sending logic found)
- Server-side auth validation on `/api/*` routes (browser login gate only)

---

## Receptionist & Doctor Session Workflow Rules
**Enforced in:** `src/app/admin/page.tsx`, `src/components/admin/DoctorAccountView.tsx`, `PATCH /api/reservations`

1. **Session Control**:
   - Receptionist clicks **"Start Session"** to begin patient treatment (transitions booking status to `ongoing`).
   - Receptionist **cannot** end treatment sessions. Treatment ending is strictly performed by the Doctor via **"Complete Treatment"**.
   - Upon session completion by the Doctor, the booking status transitions from `ongoing` to `completed`, and the Receptionist interface presents the **"Pay & Settle Invoice"** button.

2. **Session Date Navigation & Booking Info**:
   - Doctor Portal schedule features a structured date selector (**Yesterday**, **Today**, **Tomorrow**, Date Picker).
   - "Open Session" action button is replaced with `<Info /> Info` modal button to view booking details inline without navigating away.

3. **Patient Medical Record / Clinical Intake**:
   - Returning patients display their real medical record history on file fetched from `/api/medical-records`.
   - First-time patients without an existing record **must** have an intake form submitted by the Doctor before completing treatment.

4. **Session Products & Extra Device Pulses**:
   - Doctors can add session consumables/skincare products (`/api/inventory/products`) and extra device pulses (`/api/inventory/devices`) directly within the session notes view.
   - Session add-ons dynamically update the booking's `amount_left` and total invoice price in real time.
   - In the Receptionist Payment Settlement checkout modal, session add-ons are displayed as line items under **Session Add-ons & Consumables** and included in `totalCost` and `balanceDue`.

5. **Customer Information & Financials in Booking Details Drawer**:
   - **Customer Information Card**: Displays the customer's account-level lifetime metrics across all reservations:
     - **Wallet Balance**: Customer's stored wallet credit (`customerRecord.wallet_balance`).
     - **Total Spent (All Visits)**: Customer's total spent across all completed visits (`customerRecord.spent_amount`).
     - **Outstanding (All Visits)**: Customer's total debt across all visits (`customerRecord.outstanding`).
   - **Price Details & Session Financials Card**: Displays this specific session's breakdown:
     - **Total Price**: Total cost for the session services and add-ons (`cost EGP`).
     - **Session Paid**: Actual amount paid so far for this specific session (`amountPaid EGP`).
     - **Session Outstanding**: Remaining balance owed for this specific session (`amountLeft EGP` / `cost - amountPaid EGP`).
    - Upon completing payment settlement checkout, Session Paid is updated to total price, Session Outstanding drops to 0 EGP, Customer Total Spent increases by settled payment, and Customer Outstanding is reduced by settled amount.

---

## Financial Transactions & Manual Ledger Rules
**Enforced in:** `/api/transactions`, `src/components/admin/transactions/`, `src/components/admin/patients/PatientTransactionsHistoryTab.tsx`

1. **Immutability of Financial Records**:
   - Completed financial transactions are **never modified or directly deleted**.
   - If an adjustment or refund is made, a **new transaction** is inserted on the actual date the refund/adjustment occurs, preserving historical daily net totals for earlier dates.
2. **Today's Net Payments**:
   - `Today's Net Payments = Completed Payments Today − Completed Refunds Today`.
   - Excludes pending and failed transactions.
3. **Outstanding Balance**:
   - `Outstanding = Sum of active unpaid customer debt obligations`.
   - Recording an `outstanding_payment` transaction decreases the patient's outstanding balance up to the maximum current debt.
4. **Wallet Balance Calculations**:
   - `Wallet Top-up` / `Wallet Deposit` increases the patient's wallet balance.
   - `Wallet Deduction` / `Wallet Withdrawal` decreases the patient's wallet balance and cannot exceed available wallet funds.
5. **Refund Validation**:
   - Requires selecting a completed original transaction.
   - Refund amount cannot exceed the original eligible payment.
   - Mandatory refund reason recorded in audit trail.

---

## Historical & Previous Bookings Rules
**Enforced in:** `/api/reservations/previous`, `src/components/admin/bookings/AdminAddPreviousBookingView.tsx`, `AdminBookingsView.tsx`

1. **Non-Disruption of Live Scheduling**:
   - Historical bookings are saved with `status = 'completed'`, `is_manual = true`, and `is_historical = true`.
   - Historical bookings never generate pending approval cards, upcoming appointment slot reservations, or doctor live calendar conflicts.
2. **Original Historical Date Preservation**:
   - The user-specified historical date (even years prior to system deployment) is preserved verbatim in `reservations.date` and `reservations.completed_at`.
3. **Patient Matching & Automatic Profile Creation**:
   - Matches existing patients by phone number (normalizing Egyptian formats `+201...`, `00201...`, `201...` to `01...`).
   - If matched, links the historical reservation to `customer_id` and increments `number_of_bookings`.
   - If no patient matches the phone number, a new patient record is automatically created in `customers` (`active = true`, `number_of_bookings = 1`) and linked.
4. **Field Optionality**:
   - `patientPhone`, `patientName`, and `date` are mandatory.
   - `doctor`, `service`, and `paymentType` are optional and can remain empty without failing creation.
5. **Patient & Booking History Visibility**:
   - The historical reservation is displayed in the patient's Profile Booking History and the All Appointments directory.
