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

`serviceId`, `date`, `name`, `phone` are required. Missing any returns HTTP 400. `email` is optional (nullable); when omitted, the booking and linked customer are saved with `email: null`.

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

### Reception Dashboard & Staff Shift Geofence
**Enforced in:** `POST /api/reception/dashboard` (`action: "start_shift"`) (client trigger: `ReceptionDashboardView.tsx`)

- Controlled by `enableGpsShift` toggle under **Admin Settings -> Inactivity & Shift Settings** (`page_settings.home.inactivity.enableGpsShift`, default `true`).
- When `enableGpsShift === true`:
  - Browser geolocation (`latitude`, `longitude`, `accuracy`) is strictly required for all users (receptionists, employees, admins, superadmins).
  - Validates coordinates against the assigned branch (if assigned) and all active clinic branches within a 1000m tolerance.
  - If the user is outside the 1000m radius of all active clinic locations or no coordinates could be matched (`!isInsideLocation`), the request is strictly rejected with HTTP 400 (`out_of_location`) and no attendance row is created.
  - Surfaces real-time location verification errors both in the Start Shift modal and as an in-card alert banner.
- When `enableGpsShift === false`:
  - Staff can start shifts from anywhere without GPS restriction.

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
   - If an adjustment or refund is made, a **new transaction** is inserted on the actual date the refund occurs, preserving historical daily net totals for earlier dates.
2. **Strictly Limited Manual Transaction Creation (3 Allowed Types)**:
   - Staff manual transaction creation via `/admin -> Transactions -> New Transaction` or `Patient Profile -> Add Transaction` is strictly limited to 3 business options:
     1. **Refund**: Refunds positive completed payments (either to Cash Back or Wallet Credit). Requires selecting an existing completed transaction for the patient, with validation ensuring the refund amount does not exceed the remaining unrefunded balance. Decreases patient lifetime `spent_amount`.
     2. **Service Charge**: Standalone ad-hoc clinic charges (e.g. consultation, cancellation fee, administration charge). Requires patient, amount, payment method, and description. Increases patient lifetime `spent_amount`.
     3. **Product / Package Purchase**: Direct retail purchase of skincare products (`/api/inventory/products`) or clinic packages (`/api/packages`). Supports product/package selector, auto-calculated total (`price * quantity`), payment method, reference, and item metadata logging. Increases patient lifetime `spent_amount`.
   - **Explicitly Forbidden in Manual Creation**: Direct `Payment`, `Outstanding Payment` (settlement), `Wallet Top-up` / `Deposit`, `Wallet Withdrawal` / `Deduction`, and `Adjustment` are strictly rejected by the API (`POST /api/transactions`) and hidden in the UI. These are automated system actions handled exclusively via booking checkout, patient profile Settle Balance, or dedicated wallet workflows to prevent ledger desynchronization.
3. **Transaction Source Tracking & Filtering**:
   - Every transaction is tagged with `source: 'manual' | 'automatic'`.
   - System displays a distinct visual badge (`Source: Manual` vs `Source: Automatic`) in the transactions table, patient transaction history tab, and audit trail.
   - Filter bar supports `Source: All / Manual / Automatic`.
4. **Today's Net Payments**:
   - `Today's Net Payments = Completed Payments Today − Completed Refunds Today`.
   - Excludes pending and failed transactions.
5. **Outstanding Balance**:
   - `Outstanding = Sum of active unpaid customer debt obligations`.
6. **Wallet Balance & Refund Destinations**:
   - If a refund's destination is `wallet`, the refund amount is credited to `customers.wallet_balance` and logged to `wallet_txns` with `direction: 'in'`.
   - If `cash`, patient wallet is untouched.
   - Lifetime total spent (`spent_amount`) is decremented regardless of destination, clamped at 0.

---

## Historical & Previous Bookings Rules
**Enforced in:** `/api/reservations/previous`, `src/components/admin/bookings/AdminAddPreviousBookingView.tsx`, `AdminBookingsView.tsx`, `CustomerProfileDrawer.tsx`, `TransactionsView.tsx`, `src/app/admin/page.tsx`

1. **Multi-Access Point Launching**:
   - Accessible from 3 distinct locations across the administrative workspace:
     1. **Bookings Page**: via the 3-dots (`MoreVertical`) dropdown menu beside `+ New Booking`.
     2. **Patient Profile Drawer (`CustomerProfileDrawer.tsx`)**: via the dedicated `[🕒 Add Previous Booking]` top header action button and the Booking History tab header.
     3. **Transactions Page (`TransactionsView.tsx`)**: via the top action button group directly beside `New Transaction` and `Audit Logs`.
2. **Automatic Patient Data Prefill**:
   - When launched from a patient profile, `AdminAddPreviousBookingView` receives the customer object (`initialCustomer`) and automatically pre-populates and binds the patient's **Phone** (`mobile` / `phone`) and **Name** (`name`), immediately triggering the matching badge (`✓ Existing patient found: [Name]`) without requiring manual re-entry.
3. **Non-Disruption of Live Scheduling**:
   - Historical bookings are saved with `status = 'completed'`, `is_manual = true`, and `is_historical = true`.
   - Historical bookings never generate pending approval cards, upcoming appointment slot reservations, or doctor live calendar conflicts.
4. **Original Historical Date Preservation**:
   - The user-specified historical date (even years prior to system deployment) is preserved verbatim in `reservations.date` and `reservations.completed_at`.
5. **Patient Matching & Automatic Profile Creation**:
   - Matches existing patients by phone number (normalizing Egyptian formats `+201...`, `00201...`, `201...` to `01...`).
   - If matched, links the historical reservation to `customer_id` and increments `number_of_bookings`.
   - If no patient matches the phone number, a new patient record is automatically created in `customers` (`active = true`, `number_of_bookings = 1`) and linked.
6. **Field Optionality**:
   - `patientPhone`, `patientName`, and `date` are mandatory.
   - `doctor`, `service`, and `paymentType` are optional and can remain empty without failing creation.
7. **Patient & Booking History Visibility & Automated Verification**:
   - The historical reservation is displayed in the patient's Profile Booking History, the Transactions list, and the All Appointments directory.
   - Verified under System Test Suite `TC-038` and `TC-047`.

---

## Role-Based Access Control (RBAC) & Granular Action-Level Permissions Rules
**Enforced in:** `src/app/admin/page.tsx`, `src/components/admin/settings/RoleManagementView.tsx`, `src/components/admin/translations.ts`, and individual view components (UI visibility) — **and, as of RISK-078/RISK-081 CORRUPT-A10 (2026-09-07), `src/lib/access.ts`'s `hasGranularPermission()` at the route level for `providers`, `services`, `inventory/products`, `inventory/devices`, and `customers/products`** (mutating verbs only). Before that fix, every rule below described UI behavior only — a role could have a button hidden and still perform the action via a direct API call. `employees` and `roles` remain `requireAdministratorAccess`-gated only (no granular distinction), which is intentional per RISK-069, not an oversight. See `ai_docs/SECURITY.md` §3a for the current per-route inventory.

1. **Superadmin Immunity**:
   - Users with `adminRole === 'superadmin'` possess blanket authorization across all navigation sections, APIs, action buttons, and 3-dots menus regardless of the `permissions` array.
2. **Multi-Tier Hierarchical Fallback**:
   - When checking an action-level permission (e.g., `bookings.action_print_schedule`, `providers.action_edit`, `inventory.action_update_pulses`), `hasPermission` automatically falls back to parent permissions (e.g. `bookings.view_calendar`, `providers.edit`, `inventory.manage_devices`) or the coarse category permission (e.g. `Bookings`, `Providers`, `Inventory`) if granular sub-keys are not explicitly defined.
   - Preserves complete backward compatibility for existing roles configured prior to the granular matrix rollout.
3. **Dynamic 3-Dots Menu Concealment**:
   - When every individual action inside a 3-dots (`MoreVertical`) dropdown evaluates to `false` for the current user's role, the entire trigger button is suppressed from rendering. No empty or broken menus are ever shown to unauthorized staff.
4. **Parent-Child Synchronization in Role Editor**:
   - Selecting a category header or section parent in `RoleManagementView` automatically selects all underlying granular permissions.
   - De-selecting all child actions automatically deselects the parent, ensuring the stored `permissions` array accurately reflects granular intent.
5. **Coverage Across All 15 Subsystems**:
   - RBAC rules strictly cover all 15 clinic categories: Dashboard & Reception, Bookings Management, Patient Management, Doctor Management, Services Catalog, Inventory & Devices, Employees & Staff, HR & Payroll, Financial Transactions, Marketing & Campaigns, Customer Support, Reports & Analytics, Finance & Accounting, Doctor Portal & Clinical Intake, and Settings & System Control.

---

## Multi-Service Public Booking (RISK-081 CORRUPT-U06)
**Enforced in:** `src/components/BookingModal.tsx`, `src/app/api/availability/route.ts`, `src/app/api/reservations/route.ts`.

1. **One Primary Service, Any Number Of Additional Services**:
   - The public booking flow requires exactly one primary service (`serviceId`) and accepts zero or more `additionalServiceIds` on top of it, added via a pill picker shown once a primary service is chosen.
   - Every downstream single-service assumption in `BookingModal.tsx` (doctor filtering, operating-hours calculation) keys off the *combined* set of selected services, not just the primary.
2. **Combined Price & Duration**:
   - Price and duration shown to the patient, the deposit calculated from them, and the amount charged server-side are all summed across every selected service — never the primary service alone.
3. **One Doctor, One Room, Covers Every Selected Service**:
   - A doctor is only offered as a choice (client-side) or matched (server-side, `/api/availability`) if their `services` list covers *every* selected service, not just one.
   - A room is only assigned if it is mapped (`service_rooms`) to *every* selected service (intersection), both for automatic availability computation and for a manual/reception-created booking's room assignment.
4. **`service_ids` Is The Source Of Truth**:
   - The created `reservations` row stores the full, deduped list in `service_ids` (with `service_id` kept as the first entry for backward compatibility with any code still reading it as a scalar) — the same column `/admin` and the booking PATCH/checkout flow already read for admin-created multi-service bookings.

---

## Medical Records Are Per-Visit, Not Per-Customer (RISK-081 CORRUPT-D03)
**Enforced in:** `src/app/api/medical-records/route.ts`, `supabase/migrations/20260907000000_add_reservation_id_to_medical_records.sql`.

1. **A Visit's Intake Form Is Scoped To That Visit**:
   - When a save includes a `reservation_id` (the doctor's active-session intake save), the row is keyed on `(customer_id, reservation_id)` — a second visit never overwrites the first visit's baseline data; it creates its own row.
2. **A Patient-Profile Edit Has No `reservation_id`**:
   - `MedicalFormModal.tsx` (opened from the customer profile page, not tied to any specific visit) saves with `reservation_id` omitted, and is upserted against the single `reservation_id IS NULL` row for that customer — this is deliberately a different concept from a visit's clinical intake.
3. **Reads Default To "Most Recent"**:
   - `GET /api/medical-records?customerId=` with no `reservationId` returns whichever row (profile or any visit) was most recently updated, so doctor-session prefill still shows the patient's latest known baseline.
   - Pass `?reservationId=` to fetch one specific visit's intake data.

---

## Role-Based Dynamic URL Routing & Portal Login Isolation
**Enforced in:** `src/lib/roleUtils.ts`, `src/app/[role]/page.tsx`, `src/app/admin/page.tsx`.

1. **Direct Role Portal URLs (`/<role>`)**:
   - The system routes staff directly to their clean role portal without `/admin/` prefix:
     - Receptionist accounts: `/reception`
     - Doctor accounts: `/doctor`
     - Superadmin accounts: `/superadmin`
     - Admin accounts: `/admin`
     - Custom staff roles: `/<role-slug>` (e.g. `/hr`, `/nurse`, `/accountant`).
2. **Role Portal Login Isolation**:
   - Staff navigating to a specific role portal (e.g. `/admin`, `/reception`, `/doctor`, `/superadmin`, or `/<role-slug>`) can only log in if their assigned role matches that portal.
   - The `/admin` portal strictly accepts **Admin** accounts (and **Superadmin**), rejecting non-admin staff (e.g., Receptionist or Doctor logging in at `/admin`) with: `"Access denied: This portal is exclusively for Admin accounts. Please sign in at your designated portal (/reception)."`.
   - `superadmin` accounts retain universal access across all portals.
3. **Seamless Session Synchronization**:
   - On login, the browser URL cleanly reflects `/${roleSlug}` (or `/admin` for admins).
   - On logout from a role portal, the URL preserves the portal path (e.g. `/reception`) for convenient re-login.
4. **Automated Diagnostic Verification**:
   - Verified under System Test Suite test case `TC-045` (`Role-Based URL Routing & Account Navigation Engine`).

---

## Customer Portal Header Login Button Visibility & Page Settings Toggle
**Enforced in:** `src/components/Navbar.tsx`, `src/components/admin/settings/HomePageSettingsView.tsx`, `src/app/admin/page.tsx`, `src/app/api/page-settings/route.ts`, `data/page_settings.json`.

1. **Deactivated by Default in Customer View**:
   - The customer login and profile button in the public website header (`Navbar.tsx` desktop and mobile menus) is deactivated (`showCustomerLogin: false`) by default.
2. **Dynamic Admin Page Settings Toggle**:
   - Administrators can activate or deactivate the customer login button via Admin Settings -> Pages Settings -> Home (`Customer Portal & Login Button` switch card).
   - Saved under `header.showCustomerLogin` in `page_settings` (`/api/page-settings`).
3. **Automated Diagnostic Verification**:
   - Verified under System Test Suite test case `TC-046` (`Customer Portal Header Login Settings Engine`).

---

## Core System-Locked Roles & Permissions Protection
**Enforced in:** `src/components/admin/settings/RoleManagementView.tsx`, `src/app/api/roles/route.ts`.

1. **Superadmin Root Role Is Permanently Locked**:
   - The root owner role (`superadmin`) is permanently locked from deletion to guarantee system access integrity.
   - Operational roles (`admin`, `reception`, `receptionist`, `doctor`, and all custom roles) are fully unlocked, customizable, and manageable by administrators in Role Management.
   - Deletion buttons for `superadmin` are disabled and replaced with the `System Locked` indicator in Role Management.
   - `DELETE /api/roles?name=superadmin` rejects deletion attempts targeting `superadmin` with a `400 Bad Request` error.

---

## Superadmin Dual Deletion Engine (Soft Delete vs Hard Delete)
**Enforced in:** `src/contexts/AlertConfirmContext.tsx`, `src/app/api/customers/route.ts`, `src/app/api/employees/route.ts`, `src/app/api/providers/route.ts`, `src/app/api/services/route.ts`, `src/app/api/reservations/route.ts`, `src/app/admin/page.tsx`.

1. **Dual Deletion Options for Super Administrators**:
   - When a Super Admin triggers a delete action on core entities (Patients, Employees, Doctors, Services, Bookings), they are presented with two explicit choices:
     - **Soft Delete (Deactivate / Archive)**: Deactivates and archives the record while preserving all associated financial transactions, historical bookings, medical reports, prescriptions, invoices, and audit logs.
     - **Hard Delete (Permanent Removal)**: Permanently purges the record from Supabase tables and auth systems.
2. **Automated Diagnostic Verification**:
   - Verified under System Test Suite test case `TC-048` (`Superadmin Dual Delete (Soft vs Hard) & Core System Role Locking Engine`).

---

## New Booking Multi-Slot Selection & Financial Calculation Rules
**Enforced in:** `src/components/admin/bookings/AdminNewBookingView.tsx`, `src/app/api/reservations/route.ts`.

1. **Multi-Slot Selection Engine**:
   - Receptionists and admins can select one or multiple time slots for an appointment from interactive time chips.
   - Selected slots automatically calculate and display the total session duration (e.g. 2 slots = 60 mins).
   - The selected slots are joined and stored in `requested_time` and `time_slot`.
2. **Form Field Ordering**:
   - In Appointment Details (Card 2), **Available Time** is positioned directly before **Session Type** (In Person vs Online).
3. **Financial Section & Breakdown**:
   - Side-by-side **Booking Value (EGP)** and **Amount Paid Now (EGP)** inputs with browser spin arrows removed and clean visual placeholders.
   - Auto-calculates `bookingValue = servicePrice * slotsCount` with support for manual receptionist override.
   - Live **Remaining Value** (`bookingValue - amountPaidNow`) displayed in real-time with status badges (Fully Settled / Due on Visit / Credit Balance) and detailed in the Booking Confirmation Summary modal.

---

## Reception Dashboard Shift Lifecycle & Operational Rules
**Enforced in:** `src/components/admin/reception/ReceptionDashboardView.tsx`, `src/app/api/reception/dashboard/route.ts`, `src/components/admin/translations.ts`.

1. **Dynamic Shift State Architecture**:
   - One unified dashboard dynamically adapting across 3 distinct shift states:
     - **State 1 (Not Started / Start of Day)**: Displays greeting, scheduled shift hours, Overview KPIs, Quick Actions (`+ New Booking`, `+ New Patient`), Attention Needed alerts, today's bookings table with 3-dots action menu, and a prominent green `Start Shift` button.
     - **State 2 (In Progress / During Day)**: Displays live elapsed shift timer, actual clock-in time, real-time KPI metrics, operational action grid, today's schedule table with 3-dots action menu, and an `End Shift` button.
     - **State 3 (Completed / End of Day)**: Replaces live operational queues with a comprehensive End of Day Review including total worked duration, Today's Performance cards (Completed, Cancelled, No-Shows), and Payments Received breakdown (Cash, InstaPay, Visa, Wallet, Total).
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
   - If an adjustment or refund is made, a **new transaction** is inserted on the actual date the refund occurs, preserving historical daily net totals for earlier dates.
2. **Strictly Limited Manual Transaction Creation (3 Allowed Types)**:
   - Staff manual transaction creation via `/admin -> Transactions -> New Transaction` or `Patient Profile -> Add Transaction` is strictly limited to 3 business options:
     1. **Refund**: Refunds positive completed payments (either to Cash Back or Wallet Credit). Requires selecting an existing completed transaction for the patient, with validation ensuring the refund amount does not exceed the remaining unrefunded balance. Decreases patient lifetime `spent_amount`.
     2. **Service Charge**: Standalone ad-hoc clinic charges (e.g. consultation, cancellation fee, administration charge). Requires patient, amount, payment method, and description. Increases patient lifetime `spent_amount`.
     3. **Product / Package Purchase**: Direct retail purchase of skincare products (`/api/inventory/products`) or clinic packages (`/api/packages`). Supports product/package selector, auto-calculated total (`price * quantity`), payment method, reference, and item metadata logging. Increases patient lifetime `spent_amount`.
   - **Explicitly Forbidden in Manual Creation**: Direct `Payment`, `Outstanding Payment` (settlement), `Wallet Top-up` / `Deposit`, `Wallet Withdrawal` / `Deduction`, and `Adjustment` are strictly rejected by the API (`POST /api/transactions`) and hidden in the UI. These are automated system actions handled exclusively via booking checkout, patient profile Settle Balance, or dedicated wallet workflows to prevent ledger desynchronization.
3. **Transaction Source Tracking & Filtering**:
   - Every transaction is tagged with `source: 'manual' | 'automatic'`.
   - System displays a distinct visual badge (`Source: Manual` vs `Source: Automatic`) in the transactions table, patient transaction history tab, and audit trail.
   - Filter bar supports `Source: All / Manual / Automatic`.
4. **Today's Net Payments**:
   - `Today's Net Payments = Completed Payments Today − Completed Refunds Today`.
   - Excludes pending and failed transactions.
5. **Outstanding Balance**:
   - `Outstanding = Sum of active unpaid customer debt obligations`.
6. **Wallet Balance & Refund Destinations**:
   - If a refund's destination is `wallet`, the refund amount is credited to `customers.wallet_balance` and logged to `wallet_txns` with `direction: 'in'`.
   - If `cash`, patient wallet is untouched.
   - Lifetime total spent (`spent_amount`) is decremented regardless of destination, clamped at 0.

---

## Historical & Previous Bookings Rules
**Enforced in:** `/api/reservations/previous`, `src/components/admin/bookings/AdminAddPreviousBookingView.tsx`, `AdminBookingsView.tsx`, `CustomerProfileDrawer.tsx`, `TransactionsView.tsx`, `src/app/admin/page.tsx`

1. **Multi-Access Point Launching**:
   - Accessible from 3 distinct locations across the administrative workspace:
     1. **Bookings Page**: via the 3-dots (`MoreVertical`) dropdown menu beside `+ New Booking`.
     2. **Patient Profile Drawer (`CustomerProfileDrawer.tsx`)**: via the dedicated `[🕒 Add Previous Booking]` top header action button and the Booking History tab header.
     3. **Transactions Page (`TransactionsView.tsx`)**: via the top action button group directly beside `New Transaction` and `Audit Logs`.
2. **Automatic Patient Data Prefill**:
   - When launched from a patient profile, `AdminAddPreviousBookingView` receives the customer object (`initialCustomer`) and automatically pre-populates and binds the patient's **Phone** (`mobile` / `phone`) and **Name** (`name`), immediately triggering the matching badge (`✓ Existing patient found: [Name]`) without requiring manual re-entry.
3. **Non-Disruption of Live Scheduling**:
   - Historical bookings are saved with `status = 'completed'`, `is_manual = true`, and `is_historical = true`.
   - Historical bookings never generate pending approval cards, upcoming appointment slot reservations, or doctor live calendar conflicts.
4. **Original Historical Date Preservation**:
   - The user-specified historical date (even years prior to system deployment) is preserved verbatim in `reservations.date` and `reservations.completed_at`.
5. **Patient Matching & Automatic Profile Creation**:
   - Matches existing patients by phone number (normalizing Egyptian formats `+201...`, `00201...`, `201...` to `01...`).
   - If matched, links the historical reservation to `customer_id` and increments `number_of_bookings`.
   - If no patient matches the phone number, a new patient record is automatically created in `customers` (`active = true`, `number_of_bookings = 1`) and linked.
6. **Field Optionality**:
   - `patientPhone`, `patientName`, and `date` are mandatory.
   - `doctor`, `service`, and `paymentType` are optional and can remain empty without failing creation.
7. **Patient & Booking History Visibility & Automated Verification**:
   - The historical reservation is displayed in the patient's Profile Booking History, the Transactions list, and the All Appointments directory.
   - Verified under System Test Suite `TC-038` and `TC-047`.

---

## Role-Based Access Control (RBAC) & Granular Action-Level Permissions Rules
**Enforced in:** `src/app/admin/page.tsx`, `src/components/admin/settings/RoleManagementView.tsx`, `src/components/admin/translations.ts`, and individual view components (UI visibility) — **and, as of RISK-078/RISK-081 CORRUPT-A10 (2026-09-07), `src/lib/access.ts`'s `hasGranularPermission()` at the route level for `providers`, `services`, `inventory/products`, `inventory/devices`, and `customers/products`** (mutating verbs only). Before that fix, every rule below described UI behavior only — a role could have a button hidden and still perform the action via a direct API call. `employees` and `roles` remain `requireAdministratorAccess`-gated only (no granular distinction), which is intentional per RISK-069, not an oversight. See `ai_docs/SECURITY.md` §3a for the current per-route inventory.

1. **Superadmin Immunity**:
   - Users with `adminRole === 'superadmin'` possess blanket authorization across all navigation sections, APIs, action buttons, and 3-dots menus regardless of the `permissions` array.
2. **Multi-Tier Hierarchical Fallback**:
   - When checking an action-level permission (e.g., `bookings.action_print_schedule`, `providers.action_edit`, `inventory.action_update_pulses`), `hasPermission` automatically falls back to parent permissions (e.g. `bookings.view_calendar`, `providers.edit`, `inventory.manage_devices`) or the coarse category permission (e.g. `Bookings`, `Providers`, `Inventory`) if granular sub-keys are not explicitly defined.
   - Preserves complete backward compatibility for existing roles configured prior to the granular matrix rollout.
3. **Dynamic 3-Dots Menu Concealment**:
   - When every individual action inside a 3-dots (`MoreVertical`) dropdown evaluates to `false` for the current user's role, the entire trigger button is suppressed from rendering. No empty or broken menus are ever shown to unauthorized staff.
4. **Parent-Child Synchronization in Role Editor**:
   - Selecting a category header or section parent in `RoleManagementView` automatically selects all underlying granular permissions.
   - De-selecting all child actions automatically deselects the parent, ensuring the stored `permissions` array accurately reflects granular intent.
5. **Coverage Across All 15 Subsystems**:
   - RBAC rules strictly cover all 15 clinic categories: Dashboard & Reception, Bookings Management, Patient Management, Doctor Management, Services Catalog, Inventory & Devices, Employees & Staff, HR & Payroll, Financial Transactions, Marketing & Campaigns, Customer Support, Reports & Analytics, Finance & Accounting, Doctor Portal & Clinical Intake, and Settings & System Control.

---

## Multi-Service Public Booking (RISK-081 CORRUPT-U06)
**Enforced in:** `src/components/BookingModal.tsx`, `src/app/api/availability/route.ts`, `src/app/api/reservations/route.ts`.

1. **One Primary Service, Any Number Of Additional Services**:
   - The public booking flow requires exactly one primary service (`serviceId`) and accepts zero or more `additionalServiceIds` on top of it, added via a pill picker shown once a primary service is chosen.
   - Every downstream single-service assumption in `BookingModal.tsx` (doctor filtering, operating-hours calculation) keys off the *combined* set of selected services, not just the primary.
2. **Combined Price & Duration**:
   - Price and duration shown to the patient, the deposit calculated from them, and the amount charged server-side are all summed across every selected service — never the primary service alone.
3. **One Doctor, One Room, Covers Every Selected Service**:
   - A doctor is only offered as a choice (client-side) or matched (server-side, `/api/availability`) if their `services` list covers *every* selected service, not just one.
   - A room is only assigned if it is mapped (`service_rooms`) to *every* selected service (intersection), both for automatic availability computation and for a manual/reception-created booking's room assignment.
4. **`service_ids` Is The Source Of Truth**:
   - The created `reservations` row stores the full, deduped list in `service_ids` (with `service_id` kept as the first entry for backward compatibility with any code still reading it as a scalar) — the same column `/admin` and the booking PATCH/checkout flow already read for admin-created multi-service bookings.

---

## Medical Records Are Per-Visit, Not Per-Customer (RISK-081 CORRUPT-D03)
**Enforced in:** `src/app/api/medical-records/route.ts`, `supabase/migrations/20260907000000_add_reservation_id_to_medical_records.sql`.

1. **A Visit's Intake Form Is Scoped To That Visit**:
   - When a save includes a `reservation_id` (the doctor's active-session intake save), the row is keyed on `(customer_id, reservation_id)` — a second visit never overwrites the first visit's baseline data; it creates its own row.
2. **A Patient-Profile Edit Has No `reservation_id`**:
   - `MedicalFormModal.tsx` (opened from the customer profile page, not tied to any specific visit) saves with `reservation_id` omitted, and is upserted against the single `reservation_id IS NULL` row for that customer — this is deliberately a different concept from a visit's clinical intake.
3. **Reads Default To "Most Recent"**:
   - `GET /api/medical-records?customerId=` with no `reservationId` returns whichever row (profile or any visit) was most recently updated, so doctor-session prefill still shows the patient's latest known baseline.
   - Pass `?reservationId=` to fetch one specific visit's intake data.

---

## Role-Based Dynamic URL Routing & Portal Login Isolation
**Enforced in:** `src/lib/roleUtils.ts`, `src/app/[role]/page.tsx`, `src/app/admin/page.tsx`.

1. **Direct Role Portal URLs (`/<role>`)**:
   - The system routes staff directly to their clean role portal without `/admin/` prefix:
     - Receptionist accounts: `/reception`
     - Doctor accounts: `/doctor`
     - Superadmin accounts: `/superadmin`
     - Admin accounts: `/admin`
     - Custom staff roles: `/<role-slug>` (e.g. `/hr`, `/nurse`, `/accountant`).
2. **Role Portal Login Isolation**:
   - Staff navigating to a specific role portal (e.g. `/admin`, `/reception`, `/doctor`, `/superadmin`, or `/<role-slug>`) can only log in if their assigned role matches that portal.
   - The `/admin` portal strictly accepts **Admin** accounts (and **Superadmin**), rejecting non-admin staff (e.g., Receptionist or Doctor logging in at `/admin`) with: `"Access denied: This portal is exclusively for Admin accounts. Please sign in at your designated portal (/reception)."`.
   - `superadmin` accounts retain universal access across all portals.
3. **Seamless Session Synchronization**:
   - On login, the browser URL cleanly reflects `/${roleSlug}` (or `/admin` for admins).
   - On logout from a role portal, the URL preserves the portal path (e.g. `/reception`) for convenient re-login.
4. **Automated Diagnostic Verification**:
   - Verified under System Test Suite test case `TC-045` (`Role-Based URL Routing & Account Navigation Engine`).

---

## Customer Portal Header Login Button Visibility & Page Settings Toggle
**Enforced in:** `src/components/Navbar.tsx`, `src/components/admin/settings/HomePageSettingsView.tsx`, `src/app/admin/page.tsx`, `src/app/api/page-settings/route.ts`, `data/page_settings.json`.

1. **Deactivated by Default in Customer View**:
   - The customer login and profile button in the public website header (`Navbar.tsx` desktop and mobile menus) is deactivated (`showCustomerLogin: false`) by default.
2. **Dynamic Admin Page Settings Toggle**:
   - Administrators can activate or deactivate the customer login button via Admin Settings -> Pages Settings -> Home (`Customer Portal & Login Button` switch card).
   - Saved under `header.showCustomerLogin` in `page_settings` (`/api/page-settings`).
3. **Automated Diagnostic Verification**:
   - Verified under System Test Suite test case `TC-046` (`Customer Portal Header Login Settings Engine`).

---

## Core System-Locked Roles & Permissions Protection
**Enforced in:** `src/components/admin/settings/RoleManagementView.tsx`, `src/app/api/roles/route.ts`.

1. **Superadmin Root Role Is Permanently Locked**:
   - The root owner role (`superadmin`) is permanently locked from deletion to guarantee system access integrity.
   - Operational roles (`admin`, `reception`, `receptionist`, `doctor`, and all custom roles) are fully unlocked, customizable, and manageable by administrators in Role Management.
   - Deletion buttons for `superadmin` are disabled and replaced with the `System Locked` indicator in Role Management.
   - `DELETE /api/roles?name=superadmin` rejects deletion attempts targeting `superadmin` with a `400 Bad Request` error.

---

## Superadmin Dual Deletion Engine (Soft Delete vs Hard Delete)
**Enforced in:** `src/contexts/AlertConfirmContext.tsx`, `src/app/api/customers/route.ts`, `src/app/api/employees/route.ts`, `src/app/api/providers/route.ts`, `src/app/api/services/route.ts`, `src/app/api/reservations/route.ts`, `src/app/admin/page.tsx`.

1. **Dual Deletion Options for Super Administrators**:
   - When a Super Admin triggers a delete action on core entities (Patients, Employees, Doctors, Services, Bookings), they are presented with two explicit choices:
     - **Soft Delete (Deactivate / Archive)**: Deactivates and archives the record while preserving all associated financial transactions, historical bookings, medical reports, prescriptions, invoices, and audit logs.
     - **Hard Delete (Permanent Removal)**: Permanently purges the record from Supabase tables and auth systems.
2. **Automated Diagnostic Verification**:
   - Verified under System Test Suite test case `TC-048` (`Superadmin Dual Delete (Soft vs Hard) & Core System Role Locking Engine`).

---

## New Booking Multi-Slot Selection & Financial Calculation Rules
**Enforced in:** `src/components/admin/bookings/AdminNewBookingView.tsx`, `src/app/api/reservations/route.ts`.

1. **Multi-Slot Selection Engine**:
   - Receptionists and admins can select one or multiple time slots for an appointment from interactive time chips.
   - Selected slots automatically calculate and display the total session duration (e.g. 2 slots = 60 mins).
   - The selected slots are joined and stored in `requested_time` and `time_slot`.
2. **Form Field Ordering**:
   - In Appointment Details (Card 2), **Available Time** is positioned directly before **Session Type** (In Person vs Online).
3. **Financial Section & Breakdown**:
   - Side-by-side **Booking Value (EGP)** and **Amount Paid Now (EGP)** inputs with browser spin arrows removed and clean visual placeholders.
   - Auto-calculates `bookingValue = servicePrice * slotsCount` with support for manual receptionist override.
   - Live **Remaining Value** (`bookingValue - amountPaidNow`) displayed in real-time with status badges (Fully Settled / Due on Visit / Credit Balance) and detailed in the Booking Confirmation Summary modal.

---

## Reception Dashboard Shift Lifecycle & Operational Rules
**Enforced in:** `src/components/admin/reception/ReceptionDashboardView.tsx`, `src/app/api/reception/dashboard/route.ts`, `src/components/admin/translations.ts`.

1. **Dynamic Shift State Architecture**:
   - One unified dashboard dynamically adapting across 3 distinct shift states:
     - **State 1 (Not Started / Start of Day)**: Displays greeting, scheduled shift hours, Overview KPIs, Quick Actions (`+ New Booking`, `+ New Patient`), Attention Needed alerts, today's bookings table with 3-dots action menu, and a prominent green `Start Shift` button.
     - **State 2 (In Progress / During Day)**: Displays live elapsed shift timer, actual clock-in time, real-time KPI metrics, operational action grid, today's schedule table with 3-dots action menu, and an `End Shift` button.
     - **State 3 (Completed / End of Day)**: Replaces live operational queues with a comprehensive End of Day Review including total worked duration, Today's Performance cards (Completed, Cancelled, No-Shows), and Payments Received breakdown (Cash, InstaPay, Visa, Wallet, Total).
2. **End Shift Confirmation Dialog**:
   - Opening the End Shift modal calculates and renders live shift analytics:
     - **Shift Summary**: Actual start/end time and total worked duration.
     - **Today's Performance**: Real database counts for Completed, Cancelled, and No-Shows.
     - **Payments Received**: Real breakdown aggregated across `transactions` and `payments` tables for Cash, InstaPay, Visa/Card, Wallet, and Total Payments.
     - **Warning Alert Banner**: Displays warning if uncompleted/pending bookings remain.
3. **Zero Fake Data Policy**:
   - All KPIs, booking rows, doctors, services, performance metrics, and payment amounts are queried live from Supabase tables (`hr_attendance`, `reservations`, `transactions`, `payments`, `employee_accounts`, `providers`, `services`).
4. **Bilingual Localization (EN / AR)**:
   - Complete dictionary parity across English and Arabic under `reception.dashboard` in `translations.ts` with RTL layout support.
5. **Automated Diagnostic Verification**:
   - Verified under System Test Suite test case `TC-050` (`Reception Dashboard Shift State & Performance Metrics Engine`).

---

## Unified Staff Login & Public Customer Dropdown Real-Time Sync Rules
**Enforced in:** `src/components/Navbar.tsx`, `src/app/login/page.tsx`, `src/components/admin/settings/HomePageSettingsView.tsx`, `src/app/api/auth/me/route.ts`, `src/lib/roleUtils.ts`.

1. **Shaded Customer Login Preservation**:
   - When the "Customer Portal & Login Button" toggle in Admin Settings -> Pages Settings -> Home is deactivated (`showCustomerLogin: false`), the customer login button in the public website header (`Navbar.tsx`) is **NOT removed**.
   - Instead, the customer login option is visually **shaded / grayed out** (`opacity-50`, disabled cursor, "Deactivated" / "معطل" badge) to indicate disabled status while maintaining clean layout symmetry.
2. **Instant Multi-Tab & Same-Tab Real-Time Sync**:
   - Toggle updates in `HomePageSettingsView.tsx` broadcast immediately via 3 redundant channels:
     - `window.dispatchEvent(new CustomEvent("revera-settings-change", { detail: { showCustomerLogin } }))` (same-tab immediate DOM update).
     - `new BroadcastChannel("revera_channel").postMessage(...)` (cross-tab lightweight messaging).
     - `localStorage.setItem("revera_settings_sync", ...)` (native cross-tab storage listener).
   - Navbar updates live without requiring any page reload.
3. **Public Navigation Login Dropdown**:
   - The desktop and mobile navigation header features an interactive Login dropdown:
     - **Option 1 (Patient & Customer Login)**: Opens patient authentication modal / profile when active; displays shaded disabled state when deactivated in settings.
     - **Option 2 (Clinic Staff & Doctors Portal)**: Links to `/login`.
4. **Unified Staff Login Portal (`/login`)**:
   - Single unified login portal for all clinic staff (Doctors, Receptionists, Administrators, SuperAdmins, HR).
   - Accepts Email Address or Employee ID (`REV-XXXX`), checks customer email exclusions, and authenticates via Supabase Auth.
   - Automatically inspects the authenticated role via `/api/auth/me` and routes the user to their designated role portal (`/${getRoleSlug(role)}` e.g. `/admin`, `/doctor`, `/reception`, `/superadmin`).
   - Already-authenticated staff visiting `/login` are automatically redirected to their active workspace without showing credentials prompt.
5. **Automated Diagnostic Verification**:
   - Verified under System Test Suite test case `TC-051` (`Unified Staff Login & Customer Dropdown Real-Time Sync Engine`).

---

## Reception & Non-Doctor Staff Weekly Shifts & Department Synchronization Rules
**Enforced in:** `src/components/admin/employees/AdminEmployeesView.tsx`, `src/app/api/employees/route.ts`, `src/components/admin/translations.ts`.

1. **Weekly Working Days Shift Schedule Matrix**:
   - Receptionists and non-doctor staff configure their schedules using the full weekly working days matrix (Sunday through Saturday).
   - Each weekday supports an `isOpen` working status checkbox, start and end time pickers, multi-shift additions (`+ Add Shift`), and removal of extra shifts (`Trash2`).
2. **Single-Branch & In-Clinic Scoping**:
   - Unlike Doctors who can be assigned to multiple branches and provide online consultations, Receptionists and operational staff are strictly bound to a **single assigned branch** and operate **exclusively in-clinic** (multi-branch selector and online consultation tabs are hidden).
3. **Bidirectional Department & Role Synchronization**:
   - When switching the department dropdown to `"Doctors"`, the system role automatically synchronizes to `"Doctor"` (or the primary doctor role from `rolesList`), revealing the doctor & medical configuration section.
   - When switching the department back to `"Receptionist"` (or other non-doctor departments), the system role automatically reverts to a non-doctor role (e.g. `"receptionist"`), cleanly hiding the doctor section and restoring the staff weekly shifts configuration.
   - Conversely, changing the system role dropdown synchronizes the department dropdown in both directions.
4. **Summary Shift String & Working Schedule Compilation**:
   - On submission, the matrix schedule is compiled into `workingDaysHours` and summarized into a human-readable `shift` string (`"09:00 AM to 05:00 PM"`, `"Multi-Shift Schedule"`, or `"Off"`) for backward compatibility with `employee_accounts.shift` and attendance reporting.
5. **Automated Diagnostic Verification**:
   - Verified under System Test Suite test case `TC-053` (`Reception & Staff Weekly Shift Configuration Engine`).

---

## Responsive Layout & Mobile Staff Views Standards
**Enforced in:** `src/app/admin/page.tsx`, `AdminBookingsView.tsx`, `ReceptionDashboardView.tsx`, `PatientsDirectoryView.tsx`, `CustomerProfileDrawer.tsx`, `AdminEmployeesView.tsx`, `TransactionsView.tsx`, `InventoryDevicesTab.tsx`, `InventoryProductsTab.tsx`, `AdminServicesView.tsx`, `AdminHrView.tsx`, `AdminNewBookingView.tsx`, `AdminAddPreviousBookingView.tsx`, `UserProfileView.tsx`.

1. **Mobile Admin Shell & Navigation Drawer**:
   - Mobile navigation drawer width is responsive (`w-[280px] max-w-[85vw] md:w-[220px]`).
   - Aside drawer containers must use `fixed inset-y-0 start-0 top-0 bottom-0 z-50 h-full min-h-screen min-h-[100dvh] max-h-screen md:max-h-screen md:sticky md:top-0 md:h-screen` ensuring 100% full viewport height coverage across dynamic mobile address bars and embedded viewports without bottom cutoffs.
   - The scrollable `<nav>` flex container must include `flex-1 min-h-0 space-y-1 overflow-y-auto` to allow proper inner scrolling and prevent flex container height distortion.
   - Every sidebar item and submenu link must trigger `setSidebarOpen(false)` on click to auto-dismiss the drawer on mobile viewports.
   - Sticky top header elements adapt gracefully on `< 640px` screens: branch dropdown uses `max-w-[130px] sm:max-w-[200px] truncate`, Profile button hides text (`hidden sm:inline`), and gaps/paddings scale down to `gap-1.5 sm:gap-3` and `px-2 sm:px-4`.
2. **Table Container Scoping & Minimum Widths**:
   - All administrative data tables must be wrapped in `<div className="overflow-x-auto ...">` with explicit minimum table widths (`min-w-[700px]` to `min-w-[950px]`).
   - `overflow-hidden` must never be applied directly to a table container without an `overflow-x-auto` wrapper, preventing crushed columns and content clipping.
3. **Adaptive Card Paddings & Grid Scaling**:
   - Section containers and dashboard cards must use adaptive padding classes (`p-4 sm:p-6 md:p-8`) instead of rigid large paddings (`p-8`).
   - Card grids must scale progressively from mobile to desktop (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`).
4. **Automated Diagnostic Verification**:
   - Verified under System Test Suite test case `TC-054` (`Responsive Staff Views & Mobile Layout Engine`).

