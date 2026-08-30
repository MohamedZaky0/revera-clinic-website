# ai_docs — Revera Clinics Agent Knowledge Base

> **Last Updated:** 2026-08-17
> **Branch:** dev (these docs do not belong on main/production)
> **Maintained by:** Project manager. Updated whenever architecture, decisions, or risks change.

This folder is the single source of truth for any AI agent, LLM coding tool (Cursor, Windsurf, GitHub Copilot, Claude Code, etc.), or human developer who needs to understand this codebase before touching it.

**Rule: Read before you write.** Do not make assumptions about what is built, what decisions were made, or what patterns to follow without reading the relevant files below first.

---

## Reading Order (start here)

Follow this order on first contact with this codebase:

```
1. PROJECT.md        → What is this system, who uses it, deployment model
2. ARCHITECTURE.md   → Tech stack, folder structure, data flow, patterns
3. DB_SCHEMA.md      → Database tables, columns, relationships
4. PRODUCT_RULES.md  → Business logic enforced in code (not aspirational)
5. DECISIONS.md      → Why things are built the way they are
6. RISKS.md          → Known problems and the files/lines they live in
```

After that, check task-specific files:

```
7. API_CONTRACT.md      → When touching API routes or writing new endpoints
8. SECURITY.md          → Before adding a route, or touching auth/RLS/middleware
9. TESTING.md           → Before deciding a task is "done" — what verification is actually expected
10. PROPOSALS.md        → Before starting any refactor (must read before executing)
11. FINANCE_TRACKER.md  → Only when working inside the Finance module (PROPOSAL-002)
```

---

## File Index

Every file that exists in this folder is listed below — nothing is left unexplained. If a new
`.md` file is added to `ai_docs/`, add a row for it here in the same change (this is itself a
`CLAUDE.md`-rule: docs must never silently drift from what's actually in the folder).

### Core Context (always read)

| File | Purpose | Update When |
|---|---|---|
| `PROJECT.md` | System overview — what it is, who uses it, stack, known gaps | Deployment model changes, new users/roles added, major gaps resolved |
| `ARCHITECTURE.md` | Full stack, folder structure, data flow, brand token system, i18n | New folders/patterns introduced, Supabase tables added, auth added |
| `DB_SCHEMA.md` | All Supabase tables with columns, types, and relationships | Any schema change (add table, add column, change type) — must match `supabase/migrations/` |
| `PRODUCT_RULES.md` | Business logic **actually enforced in code** — nothing aspirational | Any time a rule is added, removed, or changed in an API route or component |
| `DECISIONS.md` | Decision log (ADR-style) — what was decided, why, what was rejected. Entries are numbered `DEC-NNN`; check the last number used before adding a new one to avoid a duplicate ID | Any architectural or strategic decision is made or reversed |
| `RISKS.md` | Risk register — known problems with file/line references, numbered `RISK-NNN`. This is the *log* (what broke, when, why it was fixed) | New risks found; existing risks mitigated; hardcoded values changed |

### Task-Specific (read when relevant)

| File | Purpose | Update When |
|---|---|---|
| `API_CONTRACT.md` | All API routes — methods, params, responses | Any API route added, changed, or deleted |
| `SECURITY.md` | **Current-state snapshot** of the auth model: what `middleware.ts`/`access.ts` actually check, a per-route table of which routes are role-gated vs. open, RLS posture, secrets handling, and a checklist for adding a new route safely. Complements `RISKS.md` — that file is the history of security bugs found and fixed; this file is "what's true right now," so you don't have to reconstruct it from `RISKS.md`'s narrative | Any route's auth changes; a new unauthenticated gap is found (log it in `RISKS.md` too); `middleware.ts`/`access.ts` change; RLS policy changes |
| `TESTING.md` | The actual testing approach (there is no automated test suite): static checks (`npm run check`), ad hoc `scratch/*.ts` regression scripts, and the `manual_tests/` checklist format — plus what "Done" requires per `CLAUDE.md` | The testing approach itself changes (e.g. a real test framework is introduced) |
| `PROPOSALS.md` | Proposed refactors awaiting approval — do not execute without review | A new refactor is proposed; an approved proposal is completed (mark it done) |
| `FINANCE_TRACKER.md` | Execution tracker for `PROPOSALS.md` → PROPOSAL-002 (the Finance & Management Accounting module) — task-by-task status, what's done/blocked, exact requirements per task | Any Finance-module task's status changes; read `PROPOSALS.md` PROPOSAL-002 and `RISKS.md` RISK-010…RISK-020 first, per this file's own header |
| `AGENTS.md` | Quick-start rules for AI agents specifically | Agent workflow changes; new rules for what agents must/must not do. **Known stale as of 2026-08-03** — written 2026-07-21, predates the auth/RLS hardening work and the fork-per-client framing now in `CLAUDE.md`; treat its security/single-tenant claims as superseded by `CLAUDE.md` and `SECURITY.md`, not as current fact |
| `WINDSURF_BRIEFS.md` | **The single file for all Windsurf work briefs** — one active brief at the top, completed ones archived at the bottom. Do not create separate brief files. Standing rules it relies on live in `.windsurf/rules/*.md` and `.windsurf/MEMORIES.md` (repo root, loaded automatically by Windsurf), both written from defects actually found in this codebase | A new brief is written, or an active one completes (move it to the archive section) |
| `ADMIN_REFACTOR_AND_I18N_PLAN.md` | Phased plan to make the admin panel bilingual: test net → componentize `admin/page.tsx` (27.7k lines, 606 `useState`, ~50 sections) → per-component Arabic → broader automated testing. Explains why translation cannot safely come first | A phase completes, or an open decision at the bottom of the file is answered |

### Manual test evidence (not narrative docs — click-through records)

| Location | Purpose |
|---|---|
| `manual_tests/*.md` | One file per feature/fix (e.g. `RISK_029_MANUAL_TESTS.md`, `FINANCE_PHASE_3B_MANUAL_TESTS.md`) — an evidence-log table plus a per-scenario `- [ ]` checklist, per the format `TESTING.md` documents. Referenced from the `RISKS.md`/`DECISIONS.md` entry for that feature, and as the Test Note in every Dev Notes block |

### Externally Managed (do not populate here)

| File | Why it is empty |
|---|---|
| `ROADMAP.md` | Managed in an external tracker — editing here creates two sources of truth |
| `TODO.md` | Same as above |
| `FUTURE_FEATURES.md` | Same as above |
| `AI_PIPELINE.md` | No AI pipeline exists in the codebase as of last audit |

---

## Project Status Snapshot (as of 2026-07-20)

### What Is Actually Built and Working
- Public website (homepage, about, services, contact, blog stub)
- Patient Profile (`/profile` & `/admin` Patient Profile view) — persistent customer profile details, wallet ledgers, and visit logs history (simplified profile header to display strictly patient name and active/inactive status badge, removed redundant Profile Status field from personal info grid, divided single address block into 3 distinct fields: City, Street, and Building across profile view and edit modal, redesigned Edit/Add Customer Profile interface (`CustomerFormModal.tsx`) with modern section cards, pale green circular icon badges, locked customer name banner in edit mode, prefix icons on all inputs, smart WhatsApp checkbox toggle, 3-column address & financial balance grids, and top/bottom action buttons, unified Purchased Products & Cart history to seamlessly aggregate and display products attached/purchased during clinical session reservations alongside direct POS sales with Channel/Source indicators, and upgraded all tab navigation bars across Patient Profile, Inventory, HR, Employees, and Finance into sleek segmented pill containers with primary green active states, smooth hover transitions, and icons).
- Customers List (`/admin` Customers view) — removed redundant inner uppercase gold section headers (`Personal Profile`, `Booking History`, `Patient Product Balances & Cart`, `Purchased Packages`, `Patient Profile Details`) from Patient Profile tabs and edit modal cards, removed outer white card background wrapper from Patients Directory header so title and search controls float directly on page background, positioned icon-only Filter button (`<Filter />`) directly beside search bar, consolidated standalone Export and Import top header buttons into a single 3-dots (`MoreVertical`) dropdown menu positioned to the far right of `+ Add Patient` with outside click dismissal, swapped `Total Patients` counter badge to the top header right container, updated table row actions from a pencil icon button to a 3-dots (`MoreVertical`) dropdown action menu (`Edit Patient` & `View Profile`), removed avatar circle icon, Info button, and standalone `Phone` & `Email` columns from table, formatted phone number and email address as clean subtitles directly under the Customer name, removed the `Created At` column and added real `Last Booking Date` (formatted with date on top and appointment time underneath) and real `Outstanding` balance (with colored badges: red for debt > 0, green for 0 debt), added interactive column sorting (`↑↓`), made the entire table row clickable (`cursor-pointer`) to open patient profile history, and updated empty state `colSpan` to 6.
- Staff & Employees List (`/admin` Employees view) — removed standalone `ID` column, updated table container and header design to match Customers and Doctors tables (`rounded-2xl border border-[#414E36]/10 bg-white shadow-sm`, `bg-[#F9F9F7]` header with `text-[11px]` font), updated avatar badge, and styled action buttons with circular pill borders and icons.
- Doctors / Providers List (`/admin` Doctors view & `DoctorProfileDetailsView.tsx`) — removed outer white card background wrapper so header controls float directly on page background, positioned icon-only Filter button directly beside search input, added a dedicated search bar directly above the table filtering doctors by name and specialty, made the entire table row clickable (`cursor-pointer`) to inspect doctor profile details, removed standalone Info button, updated 3-dots (`MoreVertical`) dropdown action menu to include `Edit Doctor` and `Change Status` (opening a dedicated `DoctorStatusModal` with doctor info card, side-by-side Active/Inactive radio option cards, booking warning banner, and instant status synchronization across `providers` and linked `employee_accounts`), converted static `+X More` tag into an interactive expansion button toggling all assigned doctor services inline with a `Show Less` option, added `Status` column (`Active`/`Inactive` pill badges) to the table, updated empty state `colSpan` to 6, integrated Personal Information grid (Specialty, Employment Type, Languages, Rating) directly into top profile hero card, removed separate Branches card, made Working Schedule full width with an interactive Branch selector dropdown to filter working hours per specific branch, added direct `Edit Doctor` action button to the profile details header, and completely redesigned the Edit Doctor page structure (`ProviderFormFields.tsx`) into a top Doctor Summary Hero Card (real avatar initials/photo, name, active badge, Employee ID, specialty, employment type, languages, rating) followed by 3 structured white cards: (1) Personal Information (real photo upload with size limit note, email, phone number, languages checkboxes, name, specialty, Egyptian National ID with real parser badge, gender, auto-calculated age/DOB, start date, rating), (2) Work Information (employment type dropdown, interactive branch tag selector, session type radio options for In-Clinic / Online / Both, fixed salary, and commission editor), and (3) Working Schedule (matrix table with working toggle switches, multiple shifts with start/end time pickers up to 3 shifts, break times, shift delete actions, branch schedule switcher, and session mode tabs).
- Services Manager (`/admin` Services view) — styled `+ Add Category` and `+ Add Service` buttons with primary green color (`bg-[#414E36] text-[#FBFBF9]`), positioned icon-only `Filter` button directly beside search input with an interactive Status filter drawer (`All`, `Active Only`, `Inactive Only`), combined service row status toggle switch and edit button into a single 3-dots (`MoreVertical`) dropdown action menu (`Edit Service`, `Activate/Deactivate`, `Delete Service`), and moved the red Delete button in the Edit Service modal away from the top-right `X` close button to the bottom-left of the modal footer to prevent accidental deletion.
- Inventory & Devices (`/admin` Inventory view) — redesigned 4 summary cards (`Total Devices`, `Optimal Status`, `1st Warning Reached`, `Maintenance Due`) to match the exact Booking page analysis card style (`rounded-2xl bg-white p-5 border shadow-sm hover:shadow-md`, top uppercase title with icon box, and large `text-3xl font-black` metric value with bottom subtitle badge), removed outer rounded background container from search bar, placed icon-only Filter button (`<Filter />`) directly beside search input, consolidated exposed Branch and Status dropdowns into an interactive Filter drawer, grouped all device row actions (`Update Pulses`, `Reset Counter`, `View History`, `Edit Device`) into a single compact 3-dots (`MoreVertical`) dropdown menu with outside click dismissal, and integrated real-time inventory stock deduction whenever products or session consumables are attached from booking details or used during doctor treatment sessions via `/api/reservation-products`.
- Booking modal (MD3 Date & Time pickers, single-step Service+Date+Time selection) → `reservations` table (real Supabase writes with customer_id links)
- Admin Bookings view — modular component (`src/components/admin/bookings/AdminBookingsView.tsx`) bound strictly to real database reservations from Supabase (set `Calendar View` as the default main view mode alongside `Pending Approvals` and the new comprehensive `All Appointments` Directory View featuring instant patient/phone/ID search, interactive status/doctor filtering, custom-styled columns: Appointment ID, Date & Time, Patient Avatar, Phone, Service, Doctor Avatar, Room, Status Pill, Payment Badge, Amount, and Action controls with full pagination; added `formatDisplayTime` helper to format all 24h and unformatted time slots into 12h AM/PM strings consistently, applied `table-fixed` with balanced percentage column width allocations, compact badge sizes, and `overflow-hidden` so all table columns fit 100% within the container width with zero horizontal scrolling and zero text or badge overlap, removed standalone Phone table column and formatted phone number as a clean subtitle directly under the Patient name, removed hardcoded demo appointments, removed fake fallback pending approval items & Booking ID column from Pending Approvals table, updated Approve/Reject table actions to clean icon-only Check and X buttons with object-reference set tracking for instant row removal, resolved modal/drawer stacking between booking details and invoice/checkout modals, removed redundant standalone Cancel Booking section block from booking details drawer, enabled Check In button for all approved/confirmed bookings in Session Flow with fail-safe DB constraint fallback & migration `20260810000000_add_checked_in_reservation_status.sql`, integrated `close-admin-dropdowns` event bus ensuring mutual exclusivity between Quick Creation, Notifications, and Bookings More dropdown menus, positioned the Pending Approvals table container directly under the 4 Booking Analysis cards with Approve/Reject actions and pagination, enabled smooth page scrolling on Pending Approvals button click, enabled full-row clickability via `setViewingBooking` to open the comprehensive Booking Details drawer/modal with accurate Base Service, Additional Services, and Products & Consumables itemized price breakdown, updated invoice preview & print PDF to include all rendered additional services and products excluding zero-cost pulse counter records, added Digital Prescriptions record display inside Booking Details drawer with instant WhatsApp transmission to the patient's phone number and branded cross-browser prescription PDF printing, relocated the View Mode toggle (`Pending` / `Calendar View` / `All Appointments`) directly above the calendar and table grid section, removed duplicate set of analytic summary cards, and placed the `+ New Booking` button directly beside the 3-dots options menu button).
- Doctor Portal Schedule & Patients Tab — dual view system (Month/Day Calendar & Queue List), global bilingual EN/AR toggle, Centered Inspect Session Modal, rejected/cancelled booking filtering, clean doctor notes isolation, integrated Patient Medical Record Intake with clinical notes, customer-indexed medical record caching, saved Digital Prescription display in visit history, Service-based pulse counter with additional services manager, and Patient Full Visit History Drawer positioned beside the doctor sidebar on desktop screens (refactored into modular sub-components under `src/components/admin/doctor/`)
- Comprehensive User Profile View — modular component (`src/components/admin/UserProfileView.tsx`) unified across both Doctor View and Admin View featuring top employee header with photo upload overlay, 6 quick stat cards, numbered Personal Information (Section 1 - display First Name, Last Name, Email, Phone, Address with Edit modal restricted to Email, Phone, Address and persisted to database via `/api/employees`), Work Information (Section 2 - view-only with Department set to "Doctor" / "Receptionist", Break Time removed, all assigned clinic branches resolved from `branches` table, stripped parenthesized annotations, and working days/hours parsed strictly from database response objects), 6-metric Attendance Summary (Section 3 - queried live from `hr_attendance` without hardcoded fallbacks), Payroll Summary (Section 4 - queried live from `doctor_payroll`, `providers`, `employee_accounts`, and `reservations` with dynamic Doctor Payroll commission support, fixed salary, monthly target, target progress, and Net Salary), and Change Password modal (Print Profile button removed). Removed Refresh button from Doctor View sidebar in `DoctorSidebar.tsx`. Removed Profile from Settings sub-menu in Admin Sidebar and added a top header Profile button right beside the Branch selector dropdown.
- Full View New Booking Page — dedicated modular page component (`src/components/admin/bookings/AdminNewBookingView.tsx`) replacing modal popups when clicking New Booking in Admin. Branch selection is automatically derived and synchronized from top navbar selection (for super admins) or assigned employee branch (for receptionists), and room is automatically assigned (manual Branch and Room dropdown selectors removed from Appointment Details form), available time slots are rendered as an interactive drop list selection (`<select>`) where reserved slots (`(Booked)`) and past time slots (`(Past)`) are automatically closed and disabled, connects to `POST /api/reservations` with manual room fallback logic (`isManual: true`), receives `dbCustomers`, `branches`, and `rooms` arrays from `page.tsx` with an integrated "Browse All Patients" dropdown button positioned directly beside the Phone Number label, real-time database patient autocomplete filtering directly inside the Phone Number field, fallback service title extraction (`s.en || s.name || s.title || s.name_en || s.title_en || s.ar`), dynamic doctor shift time slots with booked slot filtering from `reservations`, active package redemption status from `customer_packages`, single full Create Booking submit button (removed redundant inline appointment summary card), and an interactive Confirmation Booking Summary popup modal triggered on click to review patient, branch, room, doctor, service, session type, price, and date/time details before final creation.
- Booking lifecycle stages: `pending → approved → confirmed → checked_in → started → completed`
- Granular Role Management & Action-Level Access Control Matrix (`/admin` -> Settings -> Role Management) — comprehensive multi-tier RBAC system spanning 15 distinct functional categories (Dashboard & Reception, Bookings Management, Patient Management, Doctor Management, Services Catalog, Inventory & Devices, Employees & Staff, HR & Payroll, Financial Transactions, Marketing & Campaigns, Customer Support, Reports & Analytics, Finance & Accounting, Doctor Portal & Clinical Intake, Settings & System Control) with 100+ granular, action-level permission checkboxes (including top action buttons, table row actions, and 3-dots `MoreVertical` dropdown items across all admin views). Features hierarchical fallback preserving backward compatibility for coarse roles, seamless bilingual EN/AR labels, smart parent-child auto-toggle, and automated diagnostic verification under test case `TC-039`.
- Customer Wallet Ledgers — real writes updating spent_amount, outstanding, and wallet_balance during checkout
- Payment settlement drawer inside admin booking details
- Booking invoice popup + PDF printing inside admin
- Branch-specific service hours (separate schedules for Sheikh Zayed / New Cairo stored in database and enforced in booking availability)
- Service catalog CRUD (with drag-sort, bilingual names, branch pricing)
- Branch management CRUD
- Website CMS — hero slides (EN/AR) editable via admin
- Provider records (doctors) — basic CRUD
- Employee attendance (GPS geofence check-in lock overlay disabled per user request)
- Employee accounts and roles (`employee_accounts` + `roles` tables) with `/api/auth/me` permission lookup and expanded 12-category Role Management permissions matrix (Bookings, Customers, Doctors, Services, Employees, Inventory, HR, Marketing, Support, Reports, Settings, Finance)
- Superadmin/admin bypass for daily GPS check-in
- WhatsApp confirmation step for website bookings (English only)
- Compact Admin & Doctor Sidebar UI — redesigned sidebars in `src/app/admin/page.tsx`, `DoctorSidebar.tsx`, and `DoctorPatientHistoryDrawer.tsx` from `280px` down to a sleeker `220px` width with optimized container paddings (`px-3.5 py-5`), compact logo size (`h-10 w-10`), smaller item icon boxes (`h-8 w-8`, `size={16}`), and text sizes (`text-xs font-semibold`), maximizing horizontal dashboard screen area for core content.
- Refined Booking Views & Top Analytic Cards (`src/components/admin/bookings/AdminBookingsView.tsx`) — exactly 4 top summary cards calculated strictly daily across all booking views (Calendar, Pending Approvals, All Appointments Directory): (1) Today's Appointments with bottom-right next appointment time subtitle (`Next: HH:MM AM/PM`), (2) Upcoming with `Today` subtitle, (3) Completed with total daily revenue subtitle (`EGP XXX`), and (4) Canceled with `Today` subtitle. Removed redundant "Branch" subtitle under branch name, left-aligned "Actions" header and button group to match table column alignment, removed patient and doctor avatar/initial picture icons from both the main bookings table and pending approvals table, removed redundant Actions column/Eye icon button from main appointments table (entire row is clickable), removed hardcoded header background color (`bg-[#F5F3EF]/95`) and bottom border to float top greeting bar seamlessly on page background, updated mini-calendar day hover and selection highlights to strictly circular shapes on day numbers without outer rectangular borders, and made the entire row clickable to open full booking details with `e.stopPropagation()` event handling on action buttons.
- Redesigned Booking Details Modal (`src/app/admin/page.tsx`) — modernized booking details popup with 2-column structure matching clinical dashboard specifications: Left Column features (1) Patient Information with direct 'View Patient' profile launcher (resolving patient ID/phone/name and transitioning seamlessly into the full Patient Profile Drawer), (2) 3-Metric Summary cards (Service, Date & Time, Session Type), (3) Doctor & Location details with room and branch indicators, (4) Service Details with dynamic service additions and Total Price tally, (5) Products & Consumables + Detailed Prescriptions card (displaying distinct Diagnosis badge, numbered itemized medications list with dosage pills, frequency & duration breakdown, instruction notes, and quick WhatsApp/Print actions), and (6) Booking Information metadata (Booked By, Booking Source, Created At). Right Column features (1) Session Flow status cards with dynamic workflow triggers (Confirm, Check In, Start Session, Settle Invoice), (2) Other Actions (Postpone, Cancel, No Show), (3) Payment Summary with itemized totals, live payment status badge, View Invoice and Print Invoice actions, and (4) Dedicated Booking & Clinical Notes Card situated directly under Payment Summary with inline Add/Edit note capabilities and instant persistence.
- Strict Closed Day & Closed/Past Slot Booking Guard (`AdminNewBookingView.tsx` & `/api/reservations`) — full frontend and backend protection against booking on closed days (branch service hours and doctor working days), already booked slots, or past time slots. On closed days or when all slots are booked/past, dropdown is disabled with warning callout ("No available time slots on this date") and submission is prevented. Server-side validation rejects past dates/times, closed branch weekdays, and doctor time slot conflicts with explicit 400 Bad Request error codes.
- New Patient Account Auto-Detection & Comprehensive Profile Intake (`AdminNewBookingView.tsx`) — typing an unrecorded phone number (>= 10 digits) automatically triggers the "Patient Account: Does the patient already have an account?" prompt. When confirmed ("Yes"), expands full patient profile intake including Gender, National ID, Age, Occupation, Referral Source, Address Details (City/Area, Street, Building, Floor/Apt), and Financial details (Wallet Balance, Total Spent, Outstanding Balance), automatically creating and linking the patient profile upon booking confirmation.
- Unified Reports & Documents in Doctor Patient View (`DoctorPatientHistoryDrawer.tsx` & `/api/medical-records`) — integrated a dedicated Reports & Documents tab inside the Doctor's patient view drawer in full sync with the Receptionist / Admin patient profile view. Doctors can view all lab results, diagnostic scans, and external clinical documents uploaded by receptionists or previous doctors, directly upload new documents with `MedicalReportModal`, and delete reports with real-time updates.
- Customizable Medical Record Intake Templates & Multi-Service Mapping (`MedicalRecordsSettingsView.tsx`, `/api/medical-records/templates`, & `DoctorOngoingSessionTab.tsx`) — introduces dynamic medical record intake forms configured under Admin Settings -> Medical Records. Clinic administrators can build custom intake templates with arbitrary dynamic fields (Fitzpatrick skin scale, photosensitizing medication, laser contraindications, injection history, etc.), assign each template to one or multiple clinic services, and mark default templates with robust authenticated session token headers across all template management and intake submission endpoints (`/api/medical-records` and `/api/medical-records/templates`). In Doctor Ongoing Sessions, the intake form automatically selects and displays the exact customized intake questions mapped to the active booking's selected service. The medical intake is strictly required only on the patient's **First Visit**; for returning patients with previous visits or recorded files, the system defaults to "On File" / "Returning Patient" status without forcing redundant intake re-entry. Tested via System Test Suite `TC-034`.
- Reception Dashboard (`src/components/admin/reception/ReceptionDashboardView.tsx` & `/api/reception/dashboard`) — dedicated receptionist workspace module featuring live shift attendance metrics (`Today's Shift` with real-time elapsed time counter, check-in/out timestamps, and Start/End shift toggle persisted to `hr_attendance`), collapsible `Notifications & Alerts` section (tracking Low Stock, Maintenance Due, Maintenance Overdue, Expired Items, and Maintenance Completed with quick 'View All Alerts' modal & filters), today's bookings overview (`Bookings` summary cards & detailed today reservations table with time, patient name, doctor name, service, and status), performance overview (`Today's Summary` with scheduled, confirmed rate, completed, and status), activity timeline (`Recent Activities`), and an automated Start Shift popup modal on initial load with faded background backdrop, waving hand avatar 👋, and strict geofence verification (requiring working location coordinates within 800m before setting status to "On Shift"). Tested via System Test Suite `TC-031`, `TC-032`, & `TC-033`.
- Financial Transactions Dashboard & Manual Ledger Engine (`src/components/admin/transactions/TransactionsView.tsx`, `NewManualTransactionView.tsx`, `PatientTransactionsHistoryTab.tsx`, `/api/transactions`, & `/api/transactions/audit-logs`) — dedicated clinic-wide financial transactions dashboard featuring 3 real-time overview cards (Today's Net Payments = Completed Payments Today − Completed Refunds Today, Total Outstanding debt, Total Wallet Balances), multi-criteria filters (Date, Type, Payment Method, Status, Branch, Amount), sortable transactions table with pagination & CSV export, complete New Manual Transaction creation workflow with dynamic calculation banners (outstanding payment limits, refund validation against original payments, wallet deposit/withdrawal calculators), and Patient Profile Transactions History tab. Tested via System Test Suite `TC-037`.
- Add Previous / Historical Booking Intake Engine (`src/components/admin/bookings/AdminAddPreviousBookingView.tsx`, `AdminBookingsView.tsx`, `src/app/admin/page.tsx`, & `/api/reservations/previous`) — dedicated workflow for manually recording historical bookings that occurred before joining Revera Clinics, accessible from the 3-dots menu beside '+ New Booking'. Features patient phone autocomplete matching against `customers` table with automatic new customer profile creation when not found, preserving original historical date, optional doctor, service, and payment method attribution, non-interfering `status = 'completed'` and `is_historical = true` preventing any disruption to live appointment availability or calendar queues, full EN/AR localization, and diagnostic verification via System Test Suite `TC-038`.
- Booking origin badges (website vs other sources)

### Disabled Placeholder Nav Items (Coming Soon, superadmin-only)
- Sidebar entries: Marketing, Customer Support, Reports, Finance
- No page/functionality behind any of them — `disabled`, greyed out, "Coming Soon" tooltip
- Only visible to `adminRole === 'superadmin'`; filtered out for every other role
- Not the same as the mock-UI "Finances Dashboard" below — see RISK-005 for the naming collision

### What Is Mock UI Only (hardcoded data, not Supabase)
- Clinical: consultation notes, treatment plans, before/after photos (prescriptions itself is real — corrected 2026-07-21, see DB_SCHEMA.md)
- Billing metrics: overall billing analytics reports are mock (but individual customer ledgers, and now Payroll/Inventory/POS, are real — corrected 2026-07-21)
- All marketing: WhatsApp is external `wa.me` links only; no campaigns or templates
- Notification templates
- Full RBAC enforcement on API routes (selected sensitive routes validate bearer tokens, but coverage is not universal)

### Critical Gaps (do not assume these work)
- **API authorization is still incomplete** — most finance/inventory-relevant routes are now role-gated (RISK-018, RISK-021), but `medical-records`, `prescriptions`, and several config/CMS routes (`branches`, `categories`, `providers`, `rooms`, `terms`, `page-settings`, `customer-avatars`, `provider-attendance`) have **no server-side authorization at all** — see `SECURITY.md` §3 and RISK-036 (found 2026-08-03, not yet fixed)
- **Patient auth is real, not simulated** — corrected 2026-07-22 (RISK-003). `AuthModal` sends/verifies OTPs through actual Supabase Auth; there is no `123456` demo bypass anymore. Do not trust the older claim that this is UI-only
- Doctor shifts and availability — not built; derived only from existing bookings
- Waitlist — not built

---

## Architecture in One Paragraph

Next.js 15 (App Router) + TypeScript on Vercel. Single app serving both the public Revera website and the `/admin` panel. Supabase (PostgreSQL) as the database, accessed via a service role key from all API routes. **RLS is enabled on every `public` table as of 2026-07-25** (`20260722140000_enable_row_level_security.sql`), though it's a backstop against accidental anon-key access, not an authorization layer — the service role key bypasses it entirely, so per-route authorization in `access.ts`/`middleware.ts` is what actually matters; see `SECURITY.md` for the full current picture. Brand colors centralized in `globals.css` as CSS custom properties — but many components bypass these with raw hex Tailwind JIT classes (see RISK-001 in `RISKS.md`). All UI copy (EN/AR) lives in `src/lib/translations.ts`. The admin panel is a single ~550KB client component at `src/app/admin/page.tsx`.

---

## Key Rules for Agents and LLM Tools

1. **Do not add raw hex colors** (`#414E36`, `#C4AE7C`) to components. Use `var(--cr-primary)` and `var(--cr-accent)` from `globals.css`.
2. **Do not hardcode "Revera"** in component strings, metadata, or alt text. It goes in `src/lib/translations.ts` or will move to `src/config/client.ts` after PROPOSAL-001 is approved.
3. **Do not hardcode phone numbers or WhatsApp links** inline. See PROPOSAL-001 in `PROPOSALS.md`.
4. **Do not treat mock UI sections as real features.** As of 2026-07-21: consultation notes, treatment plans, before/after photos, the Finances Dashboard aggregate reporting view, Refunds, and Shipping are backed by hardcoded arrays. Prescriptions, Payroll, Inventory, and POS are now real Supabase tables — see `DB_SCHEMA.md` (this list was wrong before 2026-07-21; verify against `DB_SCHEMA.md` rather than trusting this line going forward).
5. **`branch` is the topmost scoping unit.** There is no `org_id` or `tenant_id`. Do not introduce one without a decision logged in `DECISIONS.md`.
6. **Do not add localStorage writes** for admin data. The existing `serviceStore.ts` pattern (localStorage as primary, Supabase as secondary) is a known risk (RISK-004) — do not extend it.
7. **Before any refactor touching hardcoded values**, read `PROPOSALS.md` first — a centralization plan already exists.
8. **The admin panel has no auth.** Do not assume any middleware protects `/admin`.
9. **Any schema change must add a file to `supabase/migrations/`** (see that folder's README for naming/idempotency rules) **and** update `DB_SCHEMA.md` in the same change. The migrations folder and `DB_SCHEMA.md` must never drift apart — one is the change log, the other is the current-state reference, and both are read by agents.
10. **New admin sections must be separate submodules.** Do not add a new section's view, state, or data orchestration to `src/app/admin/page.tsx`. Add it under `src/components/admin/` (with focused hooks/utilities as needed) and have the page compose it. This rule remains mandatory while the legacy Booking, Customer, Doctor, and other existing sections are progressively extracted from `page.tsx`; do not perform a large-bang rewrite.

---

## When to Update These Docs

| Trigger | Files to Update |
|---|---|
| New Supabase table or column added | `supabase/migrations/` (new `.sql` file), `DB_SCHEMA.md`, `ARCHITECTURE.md` |
| New API route added or changed | `API_CONTRACT.md` |
| New business rule enforced in code | `PRODUCT_RULES.md` |
| Architectural decision made | `DECISIONS.md` |
| New risk identified (hardcoding, security, data integrity) | `RISKS.md` |
| New route added, or a route's auth changes | `SECURITY.md` §3 route table (and `API_CONTRACT.md`) — if it's a newly-found *gap*, also log it in `RISKS.md` |
| Testing approach changes (e.g. a real test framework is introduced) | `TESTING.md` |
| Mock section becomes real (Supabase-backed) | `PROJECT.md` status snapshot + `PRODUCT_RULES.md` |
| Admin auth added | `PROJECT.md`, `ARCHITECTURE.md`, `SECURITY.md`, `RISKS.md` (close RISK-002), `DECISIONS.md` |
| PROPOSAL-001 executed | `PROPOSALS.md` (mark done), `RISKS.md` (close RISK-001), `ARCHITECTURE.md` |
| Fork for new client created | `DECISIONS.md` (log the new client), `PROPOSALS.md` (confirm PROPOSAL-001 was applied) |

---

## Folder Location Note

This folder (`ai_docs/`) lives on the **`dev` branch only**. It is not part of the production build on `main`. Do not merge it to `main`.
