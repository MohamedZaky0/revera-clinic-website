# Comprehensive System Corruptions & Architectural Audit

> **Document Type:** System Audit & Defect Catalog  
> **Status:** Active Reference  
> **Last Updated:** 2026-09-04  
> **Audited Modules:** User View (Public Website & Booking), Admin View (Operations & Finance), Doctor View (Clinical Intake & Portal), Database & API Security  
> **Rule Compliance:** Strictly documents all corrupted, broken, fragile, or un-synchronized subsystems across the entire codebase without applying premature code modifications.

---

## Executive Summary

A comprehensive architectural and functional audit of the Revera Clinic codebase has identified systemic issues, data integrity risks, and state synchronization corruptions across all three primary interfaces (**User View**, **Admin View**, and **Doctor View**), as well as the underlying **Database and API Security** layers.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           REVERA CLINIC SYSTEM HEALTH                            │
├─────────────────────────┬──────────────────────────┬─────────────────────────────┤
│        USER VIEW        │        ADMIN VIEW        │         DOCTOR VIEW         │
│  7 Critical Corruptions │  16 Critical Corruptions │    7 Critical Corruptions   │
│  - Broken availability  │  - Monolithic 573KB page │    - Template lookup bug    │
│  - Past-closing slots   │  - Scalar ledger drift   │    - 1-to-1 intake wipe     │
│  - Abandoned deposits   │  - Unenforced RBAC API   │    - Duplicate Rx rows      │
│  - Bad WhatsApp URL     │  - Room collisions       │    - Missing provider link  │
├─────────────────────────┴──────────────────────────┴─────────────────────────────┤
│                       DATABASE & API ARCHITECTURE LAYER                          │
│  - PHI Endpoints Lacking Role Guards (`/api/medical-records`, `/api/prescriptions`)│
│  - DB Schema Drift & Legacy Migrations Divergence (RISK-020)                    │
│  - Non-Atomic Customer Balances & TOCTOU Race Conditions                        │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. User View & Patient Portal Corruptions

### 1.1 User Booking Flow (`BookingModal.tsx`, `BookingPageClient.tsx`, `/api/availability`, `/api/reservations`)

#### [CORRUPT-U01] `/api/availability` SQL Column Mismatch Silently Breaks Doctor Availability
- **Location:** `src/app/api/availability/route.ts:178-185`
- **Root Cause:** The endpoint executes:
  ```ts
  const { data: fullSvc } = await supabaseServer
    .from('services')
    .select('name')
    .eq('id', Number(serviceId))
    .maybeSingle();
  if (fullSvc) {
    selectedServiceNameEn = fullSvc.name;
  }
  ```
  The `services` PostgreSQL table does **not** have a `name` column — it defines `en` and `ar`. PostgREST returns an error or empty result, causing `selectedServiceNameEn` to evaluate to `""` (empty string).
- **Impact:** Downstream doctor filtering compares `doc.services.includes(selectedServiceNameEn)` against `""`. All doctors assigned to the service are filtered out, corrupting available time slots and showing inaccurate availability or false "no doctor available" states.

#### [CORRUPT-U02] Missing Service Duration Boundary Check Allows Bookings Past Closing Time
- **Location:** `src/components/BookingModal.tsx:855-860`
- **Root Cause:** The client-side slot filter evaluates:
  ```ts
  return slot24 >= start && slot24 < end && !taken && !isPast;
  ```
  It does **not** check `slot24_minutes + service_duration_minutes <= end_minutes`.
- **Impact:** If a service takes 60 minutes and clinic hours end at 20:00, the user can select 19:45, booking an appointment that overruns clinic closing hours by 45 minutes.

#### [CORRUPT-U03] Multi-Interval Slot Collision Gap
- **Location:** `src/components/BookingModal.tsx:857` vs `src/app/api/availability/route.ts`
- **Root Cause:** `filteredTimeSlots` checks `!takenSlots.includes(slot24)`. If an existing booking runs for 45 minutes starting at 14:00 (occupying 14:00, 14:15, 14:30), but a candidate 45-minute booking is tested for 13:30 (occupying 13:30, 13:45, 14:00), the client does not check if the candidate's end time collides with existing appointments unless `availability` explicitly flags every overlapping 15-minute chunk.

#### [CORRUPT-U04] Deposit Abandonment & Unaccounted Financial Drift
- **Location:** `src/components/BookingModal.tsx:721-755`, `src/components/BookingModal.tsx:758-828`, `src/app/api/reservations/route.ts:917-921`
- **Root Cause:**
  1. When `depositPercentage > 0`, `POST /api/reservations` immediately inserts a row with `status = 'pending_deposit'`.
  2. If the patient abandons at Step 3 (closes tab, cancels), the booking remains orphaned in the database.
  3. When the patient completes payment in Step 3, `handlePayDeposit()` updates `reservations` via `PATCH` with `status: 'pending'` and `amountPaid: depAmount`. However, it **does not** create a corresponding row in the `transactions` or `payments` table.
- **Impact:** Receptionist sees a pre-paid deposit on the reservation, but the clinic-wide transaction ledger has zero record of the incoming deposit cash flow until full checkout occurs.

#### [CORRUPT-U05] Egyptian Mobile Trunk Prefix Bug in WhatsApp Confirmation Link
- **Location:** `src/components/BookingModal.tsx:798-800`
- **Root Cause:**
  ```ts
  const cleanWhatsapp = clinicWhatsapp.replace(/[^0-9]/g, "");
  const whatsappLink = `https://wa.me/${cleanWhatsapp || CLIENT.whatsappNumber}?text=...`;
  ```
  If `clinicWhatsapp` is stored as `+20 01035595691`, `replace(/[^0-9]/g, "")` produces `2001035595691` (retaining the national trunk `0` after country code `20`).
- **Impact:** Egyptian WhatsApp international format requires `2010...` (no trunk zero). The generated `wa.me/2001035595691` URL fails to open the clinic chat, stranding the patient on payment verification.

#### [CORRUPT-U06] Single-Service Limitation on Public Booking vs Multi-Service Backend
- **Location:** `src/components/BookingModal.tsx:76`, `src/app/book/page.tsx`
- **Root Cause:** The public UI supports only a single `serviceId`, while `/admin` and `/api/reservations` support multi-service arrays (`service_ids[]`). Patients cannot book package combinations or multiple treatments in a single reservation session.

#### [CORRUPT-U07] Timezone Inconsistency in Past Slot Validation
- **Location:** `src/components/BookingModal.tsx:850-858` vs `src/app/api/reservations/route.ts:640-669`
- **Root Cause:** Client-side uses browser local time (`new Date()`), whereas server-side enforces `Africa/Cairo` timezone (`isPastDateTime`). If a user abroad books an appointment, valid upcoming Egypt slots can be rejected by the client or past Egypt slots permitted.

---

### 1.2 Patient Authentication & Profile (`AuthModal.tsx`, `/profile/page.tsx`, `/api/customers`)

#### [CORRUPT-U08] Dual Auth State & `localStorage` Coupling
- **Location:** `src/app/profile/page.tsx:112-127`, `src/components/BookingModal.tsx:231-241`
- **Root Cause:** The patient profile relies on `localStorage.getItem("revera_user")` to determine user state. If a patient logs in via Supabase Auth on another tab or clears local storage, the profile page fails to hydrate patient data despite a valid JWT session.

#### [CORRUPT-U09] Unlinked Customer Profiles (`auth_user_id` Null)
- **Location:** `src/app/api/customers/route.ts:16-55`, `src/app/profile/page.tsx:80-95`
- **Root Cause:** Walk-in patients registered by receptionist or booked via phone do not have `auth_user_id` set. When the patient later signs up via OTP, `isOwnIdentity` must fall back to mobile number matching. If phone formatting differs (+20 vs 010), the profile appears empty.

---

## 2. Admin View & Operations Corruptions

### 2.1 Monolithic Architecture & State Complexity (`src/app/admin/page.tsx`)

#### [CORRUPT-A01] Monolithic 11,600+ Line Page Component
- **Location:** `src/app/admin/page.tsx` (573 KB, 11,692 lines)
- **Root Cause:** Contains over 600 `useState` declarations, 40+ sub-panels, inline modals, and global event listeners in a single React component.
- **Impact:**
  1. Babel code generator deoptimizes styling due to exceeding the 500KB threshold.
  2. Any state update causes cascading re-renders across all admin modules.
  3. Memory leaks and race conditions during rapid navigation.

---

### 2.2 Bookings & Schedule Management (`AdminBookingsView.tsx`, `AdminNewBookingView.tsx`, `/api/reservations`)

#### [CORRUPT-A02] Display Status Leaking into State Machine (RISK-054)
- **Location:** `src/components/admin/bookings/AdminBookingsView.tsx` vs `src/app/admin/page.tsx`
- **Root Cause:** `AdminBookingsView` normalizes raw statuses for display (`approved → confirmed`, `started → in_progress`). If normalized objects are passed into action modals, status checks (`status === 'started'`) fail to match, breaking action buttons like "Start Treatment" or "Checkout".

#### [CORRUPT-A03] Room Collision Risk on Manual Bookings
- **Location:** `src/components/admin/bookings/AdminNewBookingView.tsx`, `src/app/api/reservations/route.ts:912-960`
- **Root Cause:** Manual bookings created with `isManual: true` do not strictly lock the assigned room against concurrent bookings in the same time slot, allowing overlapping clinical room occupancy.

#### [CORRUPT-A04] Split State: Doctor Completion vs Receptionist Checkout
- **Location:** `src/components/admin/doctor/tabs/DoctorOngoingSessionTab.tsx` vs `src/app/admin/page.tsx`
- **Root Cause:** Completing a session in Doctor View updates status to `completed` and attaches clinical notes. However, it does not execute payment collection. In Admin Bookings View, the booking appears as `completed` while having an unsettled balance (`amountLeft > 0`), creating confusion over whether checkout was completed.

---

### 2.3 Patient Balances & Financial Ledgers (`CustomerProfileDrawer.tsx`, `/api/transactions`, `/api/customers/settle-debt`)

#### [CORRUPT-A05] Scalar Balance Drift vs Underlying Transaction Ledger
- **Location:** `src/app/api/customers/route.ts`, `src/app/api/transactions/route.ts`, `src/lib/billing.ts`
- **Root Cause:** `customers.wallet_balance`, `customers.outstanding`, and `customers.spent_amount` are stored as denormalized scalar columns. If a network interruption occurs between invoice generation and transaction recording, scalar balances drift from the sum of ledger entries.

#### [CORRUPT-A06] TOCTOU Non-Atomic Customer Balance Updates
- **Location:** `src/app/api/transactions/route.ts:250-320`
- **Root Cause:** Endpoints read current balance with `SELECT`, compute `newBalance = currentBalance ± amount` in Node.js, and write back with `UPDATE`.
- **Impact:** Two concurrent requests (e.g. simultaneous checkout and wallet deposit) race against each other; one balance update is silently overwritten.

#### [CORRUPT-A07] Manual Transactions Disconnected from Finance P&L
- **Location:** `src/components/admin/transactions/NewManualTransactionView.tsx`, `src/app/api/transactions/route.ts`
- **Root Cause:** Manual transactions update `customers` balance columns and `transactions` table, but do **not** generate `invoices` or `invoice_lines` rows. Consequently, manual adjustments do not appear in P&L or Finance reports.

---

### 2.4 Doctors, Services & Inventory Management

#### [CORRUPT-A08] Inactive Doctors Still Bookable in Public Availability API
- **Location:** `src/app/api/availability/route.ts:200-350`
- **Root Cause:** While `providers.active` column exists (RISK-075), `/api/availability` does not filter out `active === false` providers when computing available calendar slots.

#### [CORRUPT-A09] "Add New Category" Missing Arabic Name Input (RISK-064)
- **Location:** `src/components/admin/services/CategoryManagerView.tsx`
- **Root Cause:** The modal form captures only an English category title, inserting `ar: ""` into the `categories` table. Categories created via admin display blank in Arabic view.

#### [CORRUPT-A10] Granular RBAC Permissions Are UI-Only (RISK-078)
- **Location:** `src/components/admin/settings/RoleManagementView.tsx` vs `src/app/api/*`
- **Root Cause:** Over 100 action-level permission checkboxes exist in Role Management, but backend API routes only verify coarse `requireStaffAccess` (any employee account). A receptionist can directly call doctor payroll, expense deletion, or inventory reset endpoints via HTTP requests.

---

### 2.5 Reception Workspace & Shift Attendance Location Verification

#### [CORRUPT-A11] Shift Start Location Verification Bypass (Always Starts Shift Even When Out of Location)
- **Location:** `src/app/api/reception/dashboard/route.ts:416-485`, `src/components/admin/reception/ReceptionDashboardView.tsx:148-209`
- **Root Cause:**
  1. **Unresolved Branch Coordinates Fallthrough Bug:** In `POST /api/reception/dashboard`, `resolveBranchCoordinates(branch)` parses `branch.latitude`, `branch.longitude`, `maps_embed`, or `maps_link`. If branches in the database have null GPS columns or unparseable map links, `resolveBranchCoordinates` returns `null`. Consequently, `minimumDistance` remains initialized to `Infinity` and `isInsideLocation` remains `false`.
     The rejection guard at line 475 checks:
     ```ts
     if (candidateBranches.length > 0 && !isInsideLocation && minimumDistance !== Infinity) {
       return NextResponse.json(
         { success: false, error: "out_of_location", message: "You must be in a working location to start your shift." },
         { status: 400 }
       );
     }
     ```
     Because `minimumDistance !== Infinity` evaluates to `false` when coordinates cannot be resolved, the guard fails to trigger. Execution falls through to the Supabase `hr_attendance.upsert()` block (line 487), returning `200 OK` and starting the shift regardless of the user's actual physical distance from the clinic.
  2. **Role & Branch Null Bypass:** Line 416 checks `if (!isSuperadmin || employeeRecord?.branch_id)`. If an employee account has a missing/null `branch_id` or `isSuperadmin` is true, the entire geolocation verification block is bypassed.
  3. **All-Branches Fallback:** If an employee's assigned branch is not set, lines 451-457 fall back to candidate branches across the entire clinic network. If any single branch has unconfigured coordinates, the `Infinity` fallthrough allows clock-in from any location.
- **Impact:** Receptionists and staff can start shifts and clock in while physically outside the clinic location (from home or en route), completely bypassing geofence attendance controls and corrupting `hr_attendance` tracking and downstream `hr_payroll` hours calculation.

---

## 3. Doctor View & Clinical Intake Corruptions

### 3.1 Portal Schedule & Session Queue (`DoctorScheduleTab.tsx`, `DoctorQueueListView.tsx`)

#### [CORRUPT-D01] Orphaned Appointments on Null Provider ID
- **Location:** `src/components/admin/doctor/tabs/DoctorScheduleTab.tsx:45-90`
- **Root Cause:** Doctor schedule filters reservations by `provider_id === doctor.id` or `doctor_name.toLowerCase() === doctor.name.toLowerCase()`. If a reservation was created with `doctor_name = "Dr. Sara"` while provider is named `"Sara"`, and `provider_id` was left null, the reservation is completely invisible in the doctor's portal.

---

### 3.2 Ongoing Treatment & Medical Record Intake (`DoctorOngoingSessionTab.tsx`, `/api/medical-records`)

#### [CORRUPT-D02] Intake Template Service Matching Mismatch
- **Location:** `src/components/admin/doctor/tabs/DoctorOngoingSessionTab.tsx:165-175`
- **Root Cause:** Matches service via `s.name === serviceName || s.title === serviceName || s.title_en === serviceName`. The database `services` schema uses `en` and `ar`.
- **Impact:** Dynamic medical record intake templates fail to match the active service, falling back to generic default templates.

#### [CORRUPT-D03] 1-to-1 Medical Record Overwrite on Returning Patients
- **Location:** `src/app/api/medical-records/route.ts:170-195`
- **Root Cause:** `medical_records` table enforces a `UNIQUE(customer_id)` constraint. When a doctor saves a new intake form on visit #2, `upsert` overwrites the initial baseline intake data from visit #1 instead of maintaining historical records.

#### [CORRUPT-D04] Duplicate Prescription Insertions on Multi-Save
- **Location:** `src/components/admin/doctor/tabs/DoctorOngoingSessionTab.tsx:210-250`, `src/app/api/prescriptions/route.ts`
- **Root Cause:** `POST /api/prescriptions` does not check for an existing prescription matching the current `reservation_id`. Clicking "Save Prescription" multiple times creates duplicate prescription records in the database.

#### [CORRUPT-D05] Base Service Price Dropped from Invoice (RISK-056)
- **Location:** `src/components/admin/DoctorAccountView.tsx:640-660`
- **Root Cause:** When `activeSessionBooking` lacks a flat `.price` property (it uses nested `services: { price }`), `baseBookingPrice` evaluates to `0` unless the doctor manually re-selects the service in the dropdown. Completing the session invoices only for add-on products, rendering the medical service free of charge.

#### [CORRUPT-D06] Doctor Commission Loss on Missing `provider_id`
- **Location:** `src/app/api/hr/doctor-payroll/route.ts:80-140`
- **Root Cause:** Doctor payroll queries completed reservations by `provider_id`. Historical or web bookings that recorded only `doctor_name` without resolving `provider_id` are skipped by the payroll engine, under-calculating doctor earnings.

#### [CORRUPT-D07] Test Suite Regression on Doctor Profile Details (`DoctorProfileDetailsView.test.tsx`)
- **Location:** `tests/components/doctor/DoctorProfileDetailsView.test.tsx`
- **Root Cause:** Following the recent UI redesign of `DoctorProfileDetailsView.tsx` (unifying the hero summary and visit logs), the test suite's DOM selector queries (`getByRole('button', { name: '2' })`, `getByTitle('View Visit Details')`, CSV export mock triggers) were not synchronized with the new component layout, resulting in 9 failing unit tests during `npm run test`.

---

## 4. Database, API & Architectural Corruptions

### 4.1 Security & Unprotected PHI Routes (`SECURITY.md`)

#### [CORRUPT-S01] Unauthenticated Medical & Clinical Routes (PHI Exposure)
- **Location:** `src/app/api/medical-records/route.ts`, `src/app/api/prescriptions/route.ts`
- **Root Cause:** Neither endpoint verifies caller role or session ownership. Anyone with knowledge of a `customer_id` can fetch, modify, or delete patient clinical intake records and prescriptions via raw HTTP requests.

#### [CORRUPT-S02] Unauthenticated CMS & Configuration Mutating Routes
- **Location:** `/api/branches`, `/api/categories`, `/api/rooms`, `/api/terms`, `/api/clinic-settings`
- **Root Cause:** Open `POST`, `PATCH`, and `DELETE` handlers lack `requireAdministratorAccess`, allowing unauthenticated public modification of clinic infrastructure.

---

### 4.2 Database Schema Drift (RISK-020)

#### [CORRUPT-S03] Migration History Disconnected from Live Database
- **Location:** `supabase/migrations/` vs live database schema
- **Root Cause:** Database migrations in `supabase/migrations/` were historically not tracked via Supabase migration tables (`schema_migrations`). Columns added manually or via ad-hoc scripts created divergence between local development baselines and production schemas.

---

## 5. Master Cross-View Corruption Matrix

| Ref ID | Subsystem | File Location | Root Cause / Defect | Severity |
|---|---|---|---|---|
| **CORRUPT-U01** | User Booking | `src/app/api/availability/route.ts:179` | SQL query selects non-existent `services.name` column | **Critical** |
| **CORRUPT-U02** | User Booking | `src/components/BookingModal.tsx:855` | Slot filter ignores service duration vs closing hours | **High** |
| **CORRUPT-U03** | User Booking | `src/components/BookingModal.tsx:857` | Multi-slot intervals do not check overlapping collision spans | **Medium** |
| **CORRUPT-U04** | User Booking | `src/components/BookingModal.tsx:721` | Orphaned `pending_deposit` rows; deposit missing from ledger | **High** |
| **CORRUPT-U05** | User Booking | `src/components/BookingModal.tsx:798` | Malformed WhatsApp URL (`wa.me/20010...`) with trunk 0 | **Medium** |
| **CORRUPT-U06** | User Booking | `src/components/BookingModal.tsx:76` | UI restricted to single service; backend supports array | **Low** |
| **CORRUPT-U07** | User Booking | `src/components/BookingModal.tsx:850` | Client vs Cairo server clock mismatch on past slots | **Medium** |
| **CORRUPT-U08** | Patient Auth | `src/app/profile/page.tsx:112` | Profile hydration coupled to `localStorage.revera_user` | **High** |
| **CORRUPT-U09** | Patient Auth | `src/app/api/customers/route.ts:16` | Missing `auth_user_id` on reception-created patient records | **Medium** |
| **CORRUPT-A01** | Admin View | `src/app/admin/page.tsx` | Monolithic 11,600+ line component, 600+ useState hooks | **High** |
| **CORRUPT-A02** | Admin View | `src/components/admin/bookings/AdminBookingsView.tsx` | Display status remap (`in_progress`) breaks action switches | **High** |
| **CORRUPT-A03** | Admin View | `src/app/api/reservations/route.ts:912` | Manual booking bypasses room collision validation | **Medium** |
| **CORRUPT-A04** | Admin View | `src/components/admin/doctor/tabs/DoctorOngoingSessionTab.tsx` | Doctor session completed before receptionist checkout | **Medium** |
| **CORRUPT-A05** | Admin View | `src/app/api/customers/route.ts` | Denormalized customer balances drift from ledger | **High** |
| **CORRUPT-A06** | Admin View | `src/app/api/transactions/route.ts:250` | TOCTOU non-atomic balance updates race under load | **High** |
| **CORRUPT-A07** | Admin View | `src/components/admin/transactions/NewManualTransactionView.tsx` | Manual transactions bypass invoice ledger & P&L | **Medium** |
| **CORRUPT-A08** | Admin View | `src/app/api/availability/route.ts` | Inactive doctors (`active = false`) still bookable | **Medium** |
| **CORRUPT-A09** | Admin View | `src/components/admin/services/CategoryManagerView.tsx` | "Add Category" modal lacks Arabic name input | **Low** |
| **CORRUPT-A10** | Admin View | `src/components/admin/settings/RoleManagementView.tsx` | Granular action permissions exist only in UI, not API | **Critical** |
| **CORRUPT-A11** | Reception & HR | `src/app/api/reception/dashboard/route.ts:416` | Shift start location check bypassed on unconfigured/unresolved branch coords | **High** |
| **CORRUPT-D01** | Doctor View | `src/components/admin/doctor/tabs/DoctorScheduleTab.tsx` | Bookings without `provider_id` missing from doctor portal | **High** |
| **CORRUPT-D02** | Doctor View | `src/components/admin/doctor/tabs/DoctorOngoingSessionTab.tsx:165` | Intake template service matcher checks `s.name` instead of `s.en` | **High** |
| **CORRUPT-D03** | Doctor View | `src/app/api/medical-records/route.ts:170` | 1-to-1 table constraint overwrites visit history on repeat intake | **High** |
| **CORRUPT-D04** | Doctor View | `src/components/admin/doctor/tabs/DoctorOngoingSessionTab.tsx:210` | Multi-save inserts duplicate prescription records | **Medium** |
| **CORRUPT-D05** | Doctor View | `src/components/admin/DoctorAccountView.tsx:640` | Base service price drops to 0 unless manually changed in UI | **High** |
| **CORRUPT-D06** | Doctor View | `src/app/api/hr/doctor-payroll/route.ts:80` | Doctor commission skipped when reservation lacks `provider_id` | **High** |
| **CORRUPT-D07** | Doctor View | `tests/components/doctor/DoctorProfileDetailsView.test.tsx` | Test suite selector mismatch against redesigned doctor profile view | **Medium** |
| **CORRUPT-S01** | Security | `src/app/api/medical-records/route.ts` | PHI medical records accessible without role authorization | **Critical** |
| **CORRUPT-S02** | Security | `src/app/api/branches/route.ts` | Clinic configuration CRUD endpoints lack admin auth | **High** |
| **CORRUPT-S03** | Architecture | `supabase/migrations/` | Migration tracking drift between dev and production DB | **High** |

---

## 6. Verification & Architectural Action Plan

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           RECOMMENDED REMEDIATION PHASES                         │
├──────────────────────────────────────────────────────────────────────────────────┤
│ Phase 1: Critical Security & Patient PHI Hardening (CORRUPT-S01, S02, A10)       │
│ Phase 2: User Booking & Availability Engine Alignment (CORRUPT-U01 to U07)       │
│ Phase 3: Clinical Intake History & Doctor Flow Fixes (CORRUPT-D01 to D06)        │
│ Phase 4: Financial Ledger Atomicity & Reconciliation (CORRUPT-A05, A06, A07)     │
│ Phase 5: Admin Component Decomposition & Modularization (CORRUPT-A01, A02)       │
└──────────────────────────────────────────────────────────────────────────────────┘
```

> **Note for Future Implementation:** When implementing fixes for the items cataloged above, all changes must follow standard repository development protocols:
> 1. Verify all static type checks (`npx tsc --noEmit`) and linter checks (`npx eslint`).
> 2. Run the automated test suite (`npx vitest run`).
> 3. Verify clean production compilation (`npm run build`).
> 4. Ensure every newly modified feature is registered in the Admin Settings System Test Suite (`/admin -> Settings -> System Test Suite`).
