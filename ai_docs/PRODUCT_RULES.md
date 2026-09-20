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

### Global Ending Session & Receptionist Clinical Finalization Engine
**Enforced in:** `src/components/admin/settings/BookingSettingsView.tsx`, `src/components/admin/bookings/BookingDetailsModal.tsx`, `src/components/admin/DoctorAccountView.tsx`, `src/app/admin/page.tsx` (`TC-055`)

- **Configuration:** Admin Settings -> Booking Settings (`page_settings.home.booking.globalEndingSession`, default `false`).
- **Zero-Reload Reactivity:** Settings updates immediately trigger `window.dispatchEvent(new CustomEvent('revera-settings-change'))`, propagating live state to all open modals, drawers, and tabs instantly without requiring a page refresh.
- **Receptionist Booking Modal Integration:** When `globalEndingSession === true` and a booking is active (`status === 'started'`), the static "● Treatment In Session" badge in the Session Flow card of `BookingDetailsModal.tsx` is transformed into an interactive **"End Session"** action button.
- **Clinical Intake & Finalization Screen (`viewMode === "end_session"`):**
  - **Back Navigation:** Top-left `< Back to Booking Details` button returns to `"details"` view without ending the treatment session or discarding entered data.
  - **Medical Intake & History:** Integrates dynamic service-specific intake templates (`/api/medical-records/templates`), on-file status badges, and fallback intake fields (Skin type, Allergies, Daily medications, Chronic conditions, Previous treatments). Strictly blocks session finalization for first-visit patients if intake is missing.
  - **Clinical Procedure Notes:** Dedicated textarea for procedure observations and clinical recommendations, persisted directly to `reservations.doctorNotes`.
  - **Digital Prescription Writer:** Clinical diagnosis, dynamic medications array (Name, Dosage, Frequency, Duration), instructions, WhatsApp transmission, and branded print PDF generation.
  - **Primary & Additional Services Manager:** Live primary service switcher, additional services selector with linked equipment devices, and automated pulse summation.
  - **Products & Consumables Manager:** Live stock verification, attached products deduction, and automatic sales logging via `POST /api/inventory/products/sales`.
  - **Real-Time Doctor Sync:** Session termination persists all records, deducts device pulses (`PUT /api/inventory/devices`), records line items (`POST /api/reservation-products`), and patches the reservation to `status: 'completed'`. Doctor view Postgres realtime channel immediately clears the ongoing treatment session on the doctor's screen with zero page reload.
  - **System Test Suite:** Validated automatically via Diagnostic Test Case `TC-055` in the Admin Settings System Test Suite.

---

### Doctor Prescription Follow-Up Visits & Reception Reminders Engine
**Enforced in:** `DoctorOngoingSessionTab.tsx`, `AdminBookingsView.tsx`, `POST /api/prescriptions`, `PATCH /api/reservations`
- **Clinical Follow-Up Specification:** Doctors can toggle *"Requires Follow-Up / Consultation?"* during active treatment sessions in `DoctorOngoingSessionTab.tsx`. Doctors choose from quick interval presets (`+3 Days`, `+1 Week`, `+2 Weeks`, `+1 Month`) or pick a custom date (`follow_up_date`) and add clinical instructions.
- **Persistence:** Submitting the prescription saves `follow_up_date` to `prescriptions` table via `POST /api/prescriptions` and syncs `followUpDate` to the booking via `PATCH /api/reservations`.
- **Reception Calendar Indicator (Not a Confirmed Reservation):** Follow-ups are surfaced in the Reception Calendar (`AdminBookingsView.tsx`) with clear non-reservation badging (**"Follow-Up Reminder (Not a Reservation)" / "تذكير متابعة (ليست حجزاً)"**) and calendar date dots so receptionists clearly know the patient is recommended for follow-up and does not occupy a confirmed appointment slot yet.
- **Receptionist Outreach & 1-Click Conversion:** Provides receptionists with direct tools to contact the patient 1–2 days prior to the follow-up date:
  1. **WhatsApp Reminder:** Generates a pre-filled WhatsApp message with doctor name, recommended follow-up date, and service details.
  2. **Call Patient:** Direct phone dialing (`tel:`).
  3. **Convert to Full Booking ("تحويل لحجز مؤكد"):** Launches the booking flow so receptionists can lock in the appointment with a single click.
- **System Test Suite:** Validated automatically via Diagnostic Test Case `TC-060` in the Admin Settings System Test Suite.

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

6. **Reception Follow-Up Reminders & Pre-Filled Booking Engine (`TC-060` & `TC-061`)**:
   - **Doctor Follow-Up Intent**: When completing a session or issuing a digital prescription, doctors record an optional follow-up target date (`follow_up_date`) and clinical instructions (`follow_up_instructions`).
   - **Lead Time Window**: Follow-up reminders appear on the receptionist's bookings view before the target date according to `booking.followUpLeadDays` configured in Booking Settings (`/admin` -> Settings -> Booking Settings, default 2 days). Reminder appearance date = `targetDate - followUpLeadDays`.
   - **Full-Width Sleek Notification Banner**: Active follow-up reminders are rendered at the top of the receptionist bookings view spanning 100% width, styled as a sleek Indigo alert banner directly below any active treatment session alerts.
   - **1-Click Pre-Filled Booking Conversion**: Clicking **"+ Convert to Full Booking"** automatically opens the New Booking view (`AdminNewBookingView.tsx`) with pre-populated patient details (matching database profile and loading active packages/balances), recommending doctor (`selectedDoctorId`), service (`selectedServiceId`), appointment date, and clinical notes.
   - **Mini-Calendar Dots**: Dates with active follow-up reminder alerts display distinct Indigo dots on the calendar date grid.

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

1. **Admin Shell & Navigation Drawer**:
   - Mobile navigation drawer width is responsive (`w-[280px] max-w-[85vw] md:w-[220px]`).
   - Aside drawer containers must use `fixed inset-y-0 start-0 top-0 bottom-0 z-50 md:z-30 h-full min-h-screen min-h-[100dvh] max-h-screen md:h-screen md:max-h-screen md:translate-x-0` ensuring 100% full viewport height coverage across dynamic mobile address bars and embedded viewports without bottom cutoffs.
   - On desktop, the main content wrapper uses `flex-1 flex flex-col min-w-0 max-w-full md:ps-[220px]` (padding-inline-start), permanently locking the sidebar to the viewport so the sidebar never scrolls away or reveals background gaps when page content scrolls down.
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

---

## Prescription Versioning & Immutable History Audit Rules
**Enforced in:** `src/app/api/prescriptions/route.ts`, `src/components/admin/patients/useCustomerProfile.ts`, `src/components/admin/patients/CustomerProfileDrawer.tsx`, `src/components/admin/doctor/modals/DoctorPatientHistoryDrawer.tsx`, `src/components/admin/translations.ts`, `supabase/migrations/20260915180000_add_prescription_versioning.sql`.

1. **Immutable History on Prescription Edit**:
   - Editing an existing prescription must **never delete or mutate** previous version records in place.
   - Every edit inserts a new prescription row with incremented version (`version = previous.version + 1`), sets `is_latest = true`, and links `parent_prescription_id` to the immediate ancestor and `root_prescription_id` to the v1 original root.
   - The previous version is updated to `is_latest = false` to preserve the historical audit record.
2. **Clinician & Staff Attribution**:
   - Every prescription version captures the prescribing/modifying doctor's identity (`doctor_name` and `doctor_id`).
3. **Prescription History Drawer & Read-Only Audit**:
   - The Patient Profile Prescriptions tab provides a **Prescription History** action on every prescription record.
   - Clicking **Prescription History** opens a dedicated chronological version timeline modal displaying each historical version with its version pill, date/time, doctor attribution, diagnosis, medications list, and general notes.
   - Previous versions are strictly read-only and marked with `Read-Only History` badges and audit notice banners.
   - Each historical version can be individually printed using standard clinic prescription templates.
4. **Tooltips & Internationalization**:
   - *Edit Prescription*: "Update this prescription. Previous versions will remain available in history." / "تعديل هذه الروشتة. ستبقى النسخ السابقة محفوظة في السجل."
   - *Prescription History*: "View previous versions of this prescription." / "عرض النسخ السابقة من هذه الروشتة."
5. **Automated Diagnostic Verification**:
   - Verified under System Test Suite test case `TC-056` (`Prescription Versioning & Immutable History Audit Engine`).

---

## Receptionist Booking Control & Booked Service Editing Rules
**Enforced in:** `src/app/api/reservations/route.ts`, `src/components/admin/bookings/BookingDetailsModal.tsx`, `src/components/admin/translations.ts`.

1. **Full Receptionist Booking Status Lifecycle Control**:
   - Receptionists and authorized staff have direct, single-click control over booking status transitions across the entire lifecycle: `pending`, `confirmed` / `approved`, `checked_in` / arrived, `started` / in-progress, `completed`, `cancelled`, and `no_show`.
   - The interactive status selector is available directly in the modal header and session flow card.
   - Cancel and No-Show transitions require explicit confirmation to avoid accidental cancellations.

2. **Booked Service Replacement On Patient Arrival**:
   - Receptionists can edit or replace the assigned clinical service directly when the patient arrives at the clinic or from the Booking Details drawer.
   - A dedicated **Change Service** action opens a structured Service Picker with real-time search, category filtering, and effective branch pricing.

3. **Financial Integrity & Automatic Recalculation**:
   - Previously paid amounts (`amount_paid` or deposit amounts) are **100% preserved** and never reset or overwritten during a service replacement.
   - The new service's price is resolved dynamically according to the booking's assigned branch (`getEffectiveServicePrice` / branch price overrides).
   - The invoice total is recalculated: `total_price = new_service_price + attached_products_cost`.
   - Remaining balance due is automatically updated: `amount_left = Math.max(0, total_price - amount_paid)`.
   - If the new service price is lower than or equal to the amount already paid, `amount_left` becomes 0 (and the invoice is treated as fully settled).

4. **Price Confirmation Dialog**:
   - Prior to committing the change, the system displays a clear, bilingual comparative dialog showing:
     - Old Service & Old Price
     - New Service & New Price
     - Paid Amount (Preserved & Protected)
     - Recalculated Remaining Due
     - Financial reassurance notice explaining the automatic adjustment.

5. **Audit Logging & Historical Traceability**:
   - Changing a service automatically appends an immutable audit entry to `notes`:
     `[Service Changed by {user} on {timestamp}]: {oldServiceName} ({oldPrice} EGP) ➔ {newServiceName} ({newPrice} EGP)`.

6. **Automated Diagnostic Verification**:
   - Verified under System Test Suite test case `TC-057` (`Receptionist Booking Control & Service Editing Engine`).

---

## User Profile Working Details & Schedule Visualization Engine Rules
**Enforced in:** `src/components/admin/UserProfileView.tsx`, `src/components/admin/translations.ts`, `src/app/admin/page.tsx`, `src/components/admin/DoctorAccountView.tsx`.

1. **Zero-Dash Guarantee for Schedule Information**:
   - Working Days and Working Hours must **never** display empty dashes (`—`) in employee or doctor profiles.
   - When no custom working schedule is found in the database, the system automatically resolves to the clinic's standard operating schedule (**Saturday – Thursday**, **10:00 AM – 08:00 PM**, **Friday Off**).

2. **Multi-Source Schedule Normalization**:
   - The schedule engine recursively normalizes all data representations:
     - Nested `branch_schedules` per branch ID
     - Direct `in_person` and `online` nodes
     - Multi-shift arrays (`shifts: [{ start: "...", end: "..." }]`)
     - Pre-formatted text shifts (e.g., `"09:00 AM to 05:00 PM"`, `"10:00 AM to 08:00 PM"`)
     - 24-hour time strings (`"09:00"`, `"17:00"`) converted into clean 12-hour AM/PM format (`"09:00 AM – 05:00 PM"` in English, `"09:00 ص – 05:00 م"` in Arabic).

3. **Background Database Auto-Enrichment**:
   - If schedule props are not fully pre-populated by parent views, `UserProfileView` performs client-side lookups against `employee_accounts` and `providers` to retrieve complete working days, hours, and branch assignments.

4. **Modern 7-Day Interactive Weekly Schedule Matrix**:
   - Section 2 (**Work Information & Weekly Schedule**) displays an interactive 7-day visual grid (Saturday through Friday) with:
     - **Active Days**: Emerald active pill with checkmark, 12-hour formatted time slot badges, and daily hours duration.
     - **Off Days**: Clean muted card with coffee/moon icon and `Off Day` / `Rest Day` badge.
     - **Today Indicator**: Dynamic highlighting of the current day of the week with a prominent `Today` badge.
     - **Header Badges**: Shift badge with Sun/Moon/Clock icons, Total Weekly Working Hours counter (`X hrs/week`), and Active Days count (`X Days Active`).
     - **Attribute Cards**: 6 modern structured cards for Department, Employment Type, Assigned Branches, Active Working Days, Daily Working Hours, and Weekly Off Day.
     - **Branch Schedule Switcher**: Seamless branch tab switcher when staff is assigned to multiple branches with distinct operating hours.

5. **Automated Diagnostic Verification**:
   - Verified under System Test Suite test case `TC-058` (`User Profile Working Details & Schedule Visualization Engine`).

---

## Doctor Started Session Propagation & Real-Time Synchronization Engine Rules
**Enforced in:** `src/app/api/reservations/route.ts`, `src/components/admin/DoctorAccountView.tsx`, `src/components/admin/doctor/tabs/DoctorOngoingSessionTab.tsx`, `src/components/admin/doctor/tabs/DoctorScheduleTab.tsx`.

1. **Composite Doctor Resolution in API (`/api/reservations`)**:
   - When querying reservations by doctor (`doctorId` or `doctorName`), the backend must resolve both the `provider_id` (from `providers` or linked `employee_accounts`) and the doctor's display name.
   - The query matches reservations using a composite OR filter: `provider_id.eq.${resolvedProvId}` OR `doctor_name.ilike.%${cleanName}%`.
   - Arabic (`د.`, `دكتور`) and English (`Dr.`) titles are stripped during matching to guarantee zero false negative misses.

2. **Real-time Postgres Subscription Normalization**:
   - When a receptionist or admin starts a session (`status = 'started'`), Supabase `postgres_changes` emits a payload with raw table rows.
   - `DoctorAccountView` filters the event using `isDoctorMatch(payload.new)` and normalizes missing joined fields (`service_name` resolved from `servicesList`, `room_name`, `time_slot`).
   - If the booking status is `started`, `in_progress`, `active`, or `in treatment`, it immediately populates `activeSessionBooking`.

3. **Global Live Session Pulse Banner**:
   - When an active session is detected and the doctor is on any tab other than Ongoing Session (`schedule`, `patients`, `analytics`), a glowing Live Active Session Pulse Banner is rendered at the top of the main view with:
     - Live pulse animation icon (`Play` with glowing pulse)
     - Patient name, service title, scheduled time, and treatment room
     - 1-click **Open Ongoing Session** action button jumping directly to the Ongoing Session tab.

4. **Queue & Schedule Tab Started Highlighting**:
   - On the Doctor Schedule Tab (Calendar Agenda & Queue List), appointments in `started` or `in_progress` status are highlighted with an active glowing pill and direct **Open Session** action buttons.

5. **Automated Diagnostic Verification**:
   - Verified under System Test Suite test case `TC-059` (`Doctor View Real-time Started Session Detection & Synchronization Engine`).

---

## Follow-Up Visit Management & Clinical Prescription Engine Rules
**Enforced in:** `src/app/api/prescriptions/route.ts`, `src/app/api/reservations/route.ts`, `src/components/admin/bookings/AdminBookingsView.tsx`, `src/components/admin/doctor/tabs/DoctorOngoingSessionTab.tsx`, `src/components/admin/bookings/BookingDetailsModal.tsx`.

1. **Universal Follow-Up Availability in Prescription Writers**:
   - The interactive Follow-Up Visit toggle card is ubiquitously embedded in:
     - Doctor View Active Session (`DoctorOngoingSessionTab.tsx`)
     - Reception Clinical Finalization & Global Ending Session (`BookingDetailsModal.tsx` inline prescription form)
     - Booking Details Drawer Standalone Prescription Modal (`BookingDetailsModal.tsx` modal)
   - Features quick interval presets: `+3 Days`, `+1 Week`, `+2 Weeks`, `+1 Month`, alongside an explicit date picker (with `min` set to today) and clinical instructions/reason input.

2. **Persistence and Automatic Calendar Synchronization**:
   - When a prescription is saved with follow-up enabled (`follow_up_date`), it is recorded in the `prescriptions` table and automatically propagated to the parent `reservations` record (`follow_up_date` / `followUpDate`).
   - In Reception Calendar (`AdminBookingsView.tsx`), dates with pending follow-up visits display an indigo calendar dot (`#6366F1`) and are distinguished from full reservations.

3. **Receptionist Follow-Up Action Hub & Notification Layout**:
   - Follow-up entries are rendered in a dedicated **Follow-Up Reminders** notification banner positioned right under stale session alerts matching treatment-in-session styling featuring:
     - Clear 2-line layout: Top line displays **Patient Name** with the **Target Date badge**, and underneath line displays **Doctor Name**, **Follow-Up indicator**, **Patient Phone Number**, and **Doctor Clinical Instructions/Notes**.
     - 1-click WhatsApp reminder template generator with localized patient greeting and follow-up reason.
     - Direct Phone Call action button (`tel:` link).
     - 1-click **Convert to Full Booking / تحويل لحجز مؤكد** action that carries full patient profile, recommending doctor, service, target date, and clinical instructions directly into the New Booking form (`AdminNewBookingView.tsx`) and confirmation summary.
     - **Configurable Lead Time & Overdue Visibility**: Configured in Booking Settings (`followUpLeadDays`, default 2 days). On Today's view, all pending reminders whose reminder date has arrived (`fu.reminderDate <= today`) are displayed (including overdue follow-ups up to 90 days). When browsing specific future or past calendar dates, the banner displays follow-ups active for that selected window.
     - **Origin Booking Exclusion Guarantee**: The appointment/session where the doctor created the follow-up is unconditionally excluded from satisfying its own reminder (`fu.bookingId && String(r.id) === String(fu.bookingId) -> return false`), preventing false premature dismissals.
     - **Automatic Dismissal**: A follow-up reminder is immediately dismissed when the receptionist clicks "+ Convert to Full Booking" or when a separate active reservation is scheduled for that patient during the follow-up target window.
     - **Real-Time Synchronization**: `AdminBookingsView.tsx` subscribes to Supabase realtime `postgres_changes` on `prescriptions` and `reservations` and window custom events (`revera-prescription-change`, `revera-booking-change`), seamlessly merging client Supabase queries with authenticated `/api/prescriptions` endpoints.
     - **Booking Details Drawer**: Converted follow-up clinical notes and instructions are prominently displayed inside the Booking Information card in `BookingDetailsModal.tsx`.

4. **Automated Diagnostic Verification**:
   - Verified under System Test Suite test cases `TC-060` & `TC-061` (`Clinical Prescription Follow-Up Visit & Reception Calendar Integration Engine`).

---

## Laser Per-Pulse Calculation & Invoice Settlement Engine Rules
**Enforced in:** `src/components/admin/bookings/BookingDetailsModal.tsx`, `src/app/admin/page.tsx`, `src/lib/printUtils.ts`, `src/app/api/reservations/route.ts`, `src/components/admin/doctor/tabs/DoctorOngoingSessionTab.tsx`.

1. **Per-Pulse Pricing Formula**:
   - When a booking is established in `PER_PULSE` mode (Option 2: Pay per Pulse), all laser services delivered during the session (both Primary Booked Service and Additional Services) are charged dynamically based on delivered pulses:
     $$\text{Price} = \text{delivered\_pulses} \times \text{agreed\_price\_per\_pulse}$$
   - Non-laser services rendered in the same session retain their standard catalog / branch pricing.
   - Example: Primary laser service (250 pulses) + Additional laser service (250 pulses) @ 1 EGP/pulse = 500 EGP subtotal, rather than catalog prices.
   - `writeCheckoutInvoice` in `src/app/api/reservations/route.ts` recognizes per-pulse mode and writes accurate line totals into the invoice ledger.

2. **Booking Details Modal Payment Mode & Settlement Display**:
   - The standard Booking Details Modal (`BookingDetailsModal.tsx`) clearly displays the session payment method:
     - **Top Laser Per-Pulse Settlement Banner**: Amber banner with `Zap` icon, agreed pulse rate (`@ ${rate} EGP/pulse`), full bilingual agreement text, and Total Pulses Delivered counter badge.
     - **3-Metrics Row (Card C)**: "Session Type & Payment Mode" card with explicit `Pay per Pulse (@ ${rate} EGP)` indicator and `Per Pulse` badge.
     - **Service Details Card**: Shows primary and additional laser services with delivered pulse badges, live multipliers `(${pulses} pulses × ${rate} EGP)`, and accurate total price.
     - **Payment Summary Card**: Includes a dedicated `Payment Mode` row displaying `⚡ Pay per Pulse (@ ${rate} EGP)`.

3. **Laser Settlement Agreement Notice**:
   - In ending session finalization, checkout settlement, invoice preview modal, and printed invoice PDFs, an explicit golden Laser Settlement Notice is rendered:
     - **English**: `Settled that laser services in this session are charged per pulse (500 pulses × 1 EGP = 500 EGP)`
     - **Arabic**: `تم الاتفاق على أن تكون خدمات الليزر في هذه الجلسة مدفوعة بنظام حساب النبضات (500 نبضة × 1 ج.م = 500 ج.م)`
   - Structured notes tags `[Laser Settlement]: ...` and `[Laser Pulses Delivered]: ...` are automatically persisted to `reservations.notes`.

4. **Safe Additional Service & Primary Pulses Note Parsing**:
   - `parseAdditionalServiceLine` extracts service names, quantities, unit prices, totals, and pulses without regex leakage or corruption from `, Pulses: <num>` suffixes.
   - `extractPrimaryPulses` accurately parses primary delivered pulses from structured strings (`[Laser Pulses Delivered]: Primary: <N> pulses...`), preventing fallback to static catalog prices.

5. **Automated Diagnostic Verification**:
   - Verified under System Test Suite test case `TC-071` (`Laser Per-Pulse Dynamic Calculation & Invoice Settlement Engine`).

---

## Laser Pulses Package Purchase & Quota Engine Rules
**Enforced in:** `src/app/api/packages/sell/route.ts`, `src/app/api/packages/route.ts`, `src/app/api/customers/packages/route.ts`, `src/components/admin/patients/CustomerProfileDrawer.tsx`, `src/components/admin/packages/PackageAdminPanel.tsx`.

1. **Zero-Item Pulses Package Exemption**:
   - Pulses packages do not require linked service items (`package_items.length === 0`).
   - `/api/packages/sell` recognizes any package with 0 items, `package_type === 'pulses'`, or `total_pulses > 0` as a valid Laser Pulses Package and never triggers the `"Package must contain at least one service with a positive quantity."` validation blocker.

2. **Schema-Resilient Metadata Synchronization**:
   - Package types (`services` vs `pulses`) and included total pulses are mirrored to `page_settings` under key `packages_meta` on package creation (`POST`) and updates (`PATCH`), and enriched automatically on `GET /api/packages`.
   - When a laser pulses package is sold, pulse quotas (`total_pulses`, `pulses_remaining`) are initialized in `customer_packages` and stored in `page_settings` under key `customer_package_pulses` for seamless ecosystem access across doctor sessions, receptionist intake, and customer profiles.

3. **Customer Profile Package & Quota Display**:
   - In the Sell Package drawer modal (`CustomerProfileDrawer.tsx`), laser pulses packages display their quota (e.g. `⚡ 10,000 Pulses`) in the dropdown and an Included Pulses Quota card in the package preview.
   - In the Active Packages list (Patient Profile Tab 5), laser pulses packages render an interactive pulse quota card with `Zap` icon, badge, remaining/total pulse counters, and a visual progress bar.

4. **Automated Diagnostic Verification**:
   - Verified under System Test Suite test case `TC-070` (`Package Types & Laser Pulses Package Engine`).

---

## Laser Pulses Package Redemption & Resilient Session Completion Rules
**Enforced in:** `src/app/api/reservations/route.ts`, `src/app/api/customers/packages/route.ts`, `src/app/api/reservation-products/route.ts`, `src/components/admin/DoctorAccountView.tsx`, `src/components/admin/bookings/BookingDetailsModal.tsx`.

1. **Schema-Resilient Session Ending (No 42703 Database Errors)**:
   - When ending or completing a session via `PATCH /api/reservations`, the backend wraps updates in a multi-stage fallback. If Postgres returns error code `42703` (missing column on `reservations` table), extended columns (`laser_payment_mode`, `laser_price_per_pulse`, `delivered_pulses`, `actual_duration_minutes`, `doctor_notes`, `reception_notes`, `follow_up_notes`, `follow_up_date`, `total_price`, `price`) are stripped and the update retries cleanly without failing.
   - Updates always preserve core booking lifecycle fields (`status: 'completed'`, `notes`, `amount_paid`, `amount_left`, `service_id`).

2. **UUID-Guarded Customer Package Queries (No 22P02 Syntax Errors)**:
   - `PATCH /api/customers/packages` guards against non-UUID package IDs (e.g. synthetic `pb-...` or `temp-pkg-...`) before querying `customer_packages` table with `.eq('id', pkgId)`.
   - Pulse store operations (`consume_package_pulses`) operate reliably across all package identifier formats, updating `page_settings.customer_package_pulses` and logging usage history.

3. **0 EGP Package Redemption Service Line & Zero Phantom Charges**:
   - When a session is settled in `PACKAGE` mode, `writeCheckoutInvoice` treats the base laser service as fully covered by package redemption (`100% discount, line_total = 0`), preventing phantom receivables or duplicate charges.
   - In `persistSessionLineItems`, device pulses for prepaid packages or standard inclusion are recorded with `unitPrice: 0` so hardware pulse counter entries are never billed as billable addon products.

4. **Flexible Reservation Products Payload Normalization**:
   - `/api/reservation-products` accepts parameter aliases seamlessly (`description` / `productName` / `name`, `qty` / `quantity`, `unitPrice` / `unit_price` / `price`) and supports all staff roles (`doctor_session`, `receptionist`, `receptionist_global_ending`).

5. **Automated Diagnostic Verification**:
   - Verified under System Test Suite test case `TC-072` (`Laser Pulses Package Redemption & Session Completion Engine`).


