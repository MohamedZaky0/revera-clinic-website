# Revera Clinics — 15 End-to-End System Test Scenarios

> **Living Document.** Comprehensive manual testing checklist covering all core clinical, administrative, financial, operational, and security workflows.
> **Environment:** Linked Dev Database (`dev` branch).
> **Automated Diagnostics:** Cross-referenced with `/admin` $\rightarrow$ Settings $\rightarrow$ System Test Suite (`TC-001` through `TC-039`).

---

## 📊 Test Execution Evidence Log

| # | Scenario Name | Primary Domain | Tester | Date | Result (Pass/Fail) | Evidence Notes |
|---|---|---|---|---|---|---|
| **1** | Full Appointment Lifecycle & Session Flow | Bookings & Operations | | | | |
| **2** | New Patient Auto-Detection & Medical Record Intake | Patients & Clinical | | | | |
| **3** | Doctor Portal Clinical Notes, Prescriptions & Pulses | Doctor Portal & Devices | | | | |
| **4** | Split Payments, Outstanding Debt & Ledger Settlement | Billing & Ledger | | | | |
| **5** | Product & Package Sales with Redemption Engine | Inventory & Packages | | | | |
| **6** | Granular Action-Level RBAC & Menu Security | RBAC & Security | | | | |
| **7** | Financial Refunds, Cumulative Caps & Wallet Routing | Finance & Accounting | | | | |
| **8** | Receptionist Shift Tracking & GPS Geofence Check-in | Reception & HR | | | | |
| **9** | Doctor Shift Management & Closed-Slot Guard | Scheduling & Availability | | | | |
| **10** | Historical / Previous Booking Intake Engine | Bookings & Migrations | | | | |
| **11** | Staff & Doctor Commission Payroll Engine | HR & Payroll | | | | |
| **12** | Fixed Asset Depreciation & Capital Expense Tracking | Assets & Accounting | | | | |
| **13** | Multi-Branch Inventory & Stock Reorder Alerts | Inventory & Devices | | | | |
| **14** | Customer Support Inquiries & Helpdesk Lifecycle | Support & CRM | | | | |
| **15** | Bilingual Localization (EN / AR) & RTL UI Engine | UI / UX & i18n | | | | |

---

## 🧪 Detailed Scenario Checklists

---

### Scenario 1: Full Appointment Lifecycle & Session Flow
**Domain:** Bookings & Operations  
**Automated Reference:** `TC-003`, `TC-025`, `TC-030`

- [ ] **1.1 Booking Creation:** Navigate to **Admin $\rightarrow$ Bookings $\rightarrow$ + New Booking**. Select an active patient, branch, doctor, service, and a valid future time slot. Click **Create Booking**. Verify the appointment is created in `pending` or `approved` status.
- [ ] **1.2 Confirmation:** In **Admin Bookings View**, locate the reservation in the queue or calendar and click **Approve / Confirm**. Verify the status badge updates to `confirmed`.
- [ ] **1.3 Patient Arrival (Check In):** When the patient arrives at the clinic, click **Check In**. Verify the status transitions to `checked_in`.
- [ ] **1.4 Clinical Execution:** Log in as the assigned doctor, navigate to **Doctor Portal**, locate the checked-in reservation, and click **Start Session** (status transitions to `started`). Complete the consultation notes and click **Complete Session** (status transitions to `completed`).
- [ ] **1.5 Invoicing & Checkout:** Return to Reception / Admin, open **Settle Payment / Checkout**, settle the full balance via **Credit Card**, and click **Print Invoice**.
- [ ] **1.6 Verification:** Confirm the booking is marked as fully paid, the invoice record is persisted in Supabase, and the top daily revenue metrics update.

---

### Scenario 2: New Patient Auto-Detection & Medical Record Intake
**Domain:** Patients & Clinical Intake  
**Automated Reference:** `TC-016`, `TC-034`, `TC-035`

- [ ] **2.1 Auto-Detection Trigger:** Navigate to **Admin $\rightarrow$ Bookings $\rightarrow$ + New Booking** and enter a new 11-digit phone number (e.g. `01099998877`).
- [ ] **2.2 Customer Intake Expansion:** When prompted with *"Patient Account: Does the patient have an account?"*, click **Yes / Create Profile**. Verify the intake form expands with National ID, Gender, Age, and 3-part address (City, Street, Building).
- [ ] **2.3 Booking & Profile Save:** Select a service mapped to a custom intake form (e.g., "Laser Hair Removal") and submit the booking. Confirm the profile is written to `customers` with 0 initial debt/spent.
- [ ] **2.4 First-Visit Dynamic Medical Form:** Open the appointment in **Doctor Ongoing Session**. Verify that the dynamic intake questions specific to "Laser Hair Removal" (Fitzpatrick skin scale, contraindications) appear. Fill and save the intake.
- [ ] **2.5 Returning Patient Skip Logic:** Create a second booking for the same patient. Open the session in Doctor Portal and verify the intake form displays **"On File / Returning Patient"**, avoiding duplicate intake entries.

---

### Scenario 3: Doctor Portal Clinical Notes, Prescriptions & Pulses
**Domain:** Doctor Portal & Inventory Consumption  
**Automated Reference:** `TC-007`, `TC-018`, `TC-028`, `TC-029`

- [ ] **3.1 Session Inspection:** Open an active appointment from **Doctor Portal $\rightarrow$ Calendar / Queue**.
- [ ] **3.2 Clinical Notes Isolation:** Add clinical treatment notes (e.g., *"Laser fluence 18J, spot size 15mm, 3 passes"*). Save and verify the note persists to `medical_records`.
- [ ] **3.3 Digital Prescriptions:** Open the Prescription sub-tab. Add 2 medications with dosage, frequency, and instructions.
- [ ] **3.4 WhatsApp & Print Delivery:** Click **Send via WhatsApp** (verify pre-filled `wa.me` text link opens) and click **Print Prescription** (verify branded cross-browser PDF generation).
- [ ] **3.5 Pulse Counter Deduction:** In the Device Pulse Counter section, record 450 pulses used. Complete the session.
- [ ] **3.6 Inventory Verification:** Confirm `inventory_devices` pulses counter increments by exactly 450.

---

### Scenario 4: Split Payments, Outstanding Debt & Ledger Settlement
**Domain:** Billing, Wallet & Double-Entry Ledger  
**Automated Reference:** `TC-024`, `TC-037`

- [ ] **4.1 Split Tender Checkout:** For an appointment costing $1,500\text{ EGP}$, where the patient has $500\text{ EGP}$ wallet credit, apply $500\text{ EGP}$ from **Wallet** and $600\text{ EGP}$ from **Cash** (leaving $400\text{ EGP}$ unpaid). Submit checkout.
- [ ] **4.2 Customer Balance Check:** Open **Patients $\rightarrow$ Profile** for this customer: verify `wallet_balance = 0`, `spent_amount = 1100`, and `outstanding = 400`.
- [ ] **4.3 Ledger Validation:** Open the patient's **Transactions History** tab. Verify two automatic records exist: `service_charge` ($1,500\text{ EGP}$) and `payment` ($1,100\text{ EGP}$).
- [ ] **4.4 Settle Balance Action:** Click **3-dots $\rightarrow$ Settle Balance**. Settle the $400\text{ EGP}$ debt via **Card**.
- [ ] **4.5 Verification:** Confirm the patient's `outstanding` balance resets to $0\text{ EGP}$, `spent_amount` updates to $1,500\text{ EGP}$, the original booking invoice is marked paid, and an `outstanding_payment` transaction is added to the ledger without duplicate charging.

---

### Scenario 5: Product & Package Sales with Redemption Engine
**Domain:** Inventory POS & Multi-Session Packages  
**Automated Reference:** `TC-006`, `TC-017`

- [ ] **5.1 Retail Product Sale:** Open **Patients $\rightarrow$ Sell Product**. Sell 2 units of a retail product (initial stock: 10). Verify stock drops to 8 in `inventory_products`.
- [ ] **5.2 Package Purchase:** Sell a "5 Sessions Hydrafacial" package to the patient.
- [ ] **5.3 Package Balance Verification:** Open the patient's **Purchased Packages** tab and confirm 5 remaining sessions are recorded under `customer_packages`.
- [ ] **5.4 Package Redemption Booking:** Open **New Booking**, select this patient, and pick "Hydrafacial". Verify the system detects the package and applies **Package Redemption** (price = $0\text{ EGP}$).
- [ ] **5.5 Session Deduction:** Complete the appointment. Confirm the package balance decrements from 5 to 4 sessions.

---

### Scenario 6: Granular Action-Level RBAC & Menu Security
**Domain:** RBAC & Authorization Boundaries  
**Automated Reference:** `TC-002`, `TC-011`, `TC-039`

- [ ] **6.1 Role Definition:** In **Settings $\rightarrow$ Role Management**, create a role *"FrontDesk_Restricted"*. Enable `bookings.view` and `bookings.create`, but disable `bookings.cancel` and all `finance.*` permissions.
- [ ] **6.2 Staff Account Assignment:** Assign this role to a test employee and log in as that employee.
- [ ] **6.3 UI Control Gating:** Open the Bookings view and confirm the **Cancel Booking** button and 3-dots cancellation menu item are hidden.
- [ ] **6.4 Direct API Gating:** Attempt to submit `POST /api/transactions` or `DELETE /api/reservations` using an API client with this staff token.
- [ ] **6.5 Security Verification:** Confirm the API rejects the request with HTTP `403 Forbidden` (`"Insufficient permissions"`).

---

### Scenario 7: Financial Refunds, Cumulative Caps & Wallet Routing
**Domain:** Financial Transactions & Audit Compliance  
**Automated Reference:** `TC-037`

- [ ] **7.1 Refund Initiation:** Open **Admin $\rightarrow$ Transactions $\rightarrow$ New Manual Transaction**. Select **Transaction Type: Refund** and link an existing $1,000\text{ EGP}$ payment.
- [ ] **7.2 Reason Requirement:** Attempt submission with an empty reason field. Verify rejection with error *"Refund reason required"*.
- [ ] **7.3 Cap Validation:** Attempt to refund $1,200\text{ EGP}$. Verify rejection with error *"Refund cannot exceed original transaction amount of 1,000 EGP"*.
- [ ] **7.4 Wallet Destination:** Enter $400\text{ EGP}$, select destination **Wallet Credit**, provide a reason, and submit. Confirm patient's wallet balance increases by $400\text{ EGP}$.
- [ ] **7.5 Remaining Balance Cap:** Attempt a second refund on the same transaction for $700\text{ EGP}$. Verify system rejects because only $600\text{ EGP}$ refundable balance remains.
- [ ] **7.6 Sequential ID:** Confirm the refund is assigned a sequential ID (e.g. `TXN-001042`).

---

### Scenario 8: Receptionist Shift Tracking & GPS Geofence Check-in
**Domain:** Reception Workspace & HR Attendance  
**Automated Reference:** `TC-015`, `TC-031`, `TC-032`, `TC-033`

- [ ] **8.1 Shift Check-in Modal:** Log in as Receptionist and navigate to **Reception Dashboard**. Confirm the **Start Shift** modal appears on initial load.
- [ ] **8.2 Out-of-Bounds Rejection:** Mock a GPS location $>800\text{m}$ away from the clinic coordinates and click **Start Shift**. Confirm clock-in is blocked with an out-of-bounds error.
- [ ] **8.3 Valid Clock-in:** Provide valid coordinates within $800\text{m}$ and confirm clock-in. Verify shift status changes to **"On Shift"** and the elapsed timer begins.
- [ ] **8.4 Real-Time Alerts Drawer:** Expand the **Notifications & Alerts** drawer. Confirm active alerts for low stock, maintenance due, and expired consumables are listed.
- [ ] **8.5 Attendance Persistence:** Confirm an attendance record is created in `hr_attendance` with exact timestamp, coordinates, and employee ID.

---

### Scenario 9: Doctor Shift Management & Closed-Slot Guard
**Domain:** Scheduling, Doctor Working Hours & Booking Safeguards  
**Automated Reference:** `TC-009`, `TC-036`

- [ ] **9.1 Multi-Shift Schedule:** Navigate to **Admin $\rightarrow$ Doctors $\rightarrow$ Edit Doctor $\rightarrow$ Working Schedule**. Configure Monday with Shift 1 (10:00 AM - 02:00 PM) and Shift 2 (05:00 PM - 09:00 PM). Mark Tuesday as Off. Save changes.
- [ ] **9.2 Closed Day Guard:** Open **New Booking**, select this doctor, and pick Tuesday. Verify the time slot dropdown is disabled with *"No available time slots on this date"*.
- [ ] **9.3 Break Period Guard:** Select Monday. Verify slots between 02:00 PM and 05:00 PM are omitted or disabled.
- [ ] **9.4 Conflict Prevention:** Book the 11:00 AM slot. Attempt to create another booking for the same doctor at 11:00 AM. Confirm rejection on both frontend and `/api/reservations` backend.

---

### Scenario 10: Historical / Previous Booking Intake Engine
**Domain:** Historical Data Ingestion & Live System Preservation  
**Automated Reference:** `TC-038`

- [ ] **10.1 Historical Modal Access:** In **Admin $\rightarrow$ Bookings**, click the 3-dots menu next to `+ New Booking` and select **Add Previous Booking**.
- [ ] **10.2 Entry & Patient Matching:** Enter a historical date (e.g. 6 months ago), patient phone, doctor, service, and payment amount. Submit the form.
- [ ] **10.3 Queue Non-Interference:** Check today's **Calendar View** and **Pending Approvals**. Confirm the historical booking does not disrupt current appointment queues.
- [ ] **10.4 Metric Isolation:** Confirm today's active booking count and today's revenue cards are not inflated by historical entries.
- [ ] **10.5 Profile History:** Open the patient's profile: confirm the historical visit and transaction are preserved in their lifetime history.

---

### Scenario 11: Staff & Doctor Commission Payroll Engine
**Domain:** HR, Fixed Salaries & Tiered Commission Calculations  
**Automated Reference:** `TC-010`, `TC-012`, `TC-013`

- [ ] **11.1 Commission Configuration:** Configure a doctor with base salary $10,000\text{ EGP}$ + $15\%$ commission on completed bookings. Configure a receptionist with fixed salary $6,000\text{ EGP}$.
- [ ] **11.2 Completed Revenue Accumulation:** Complete 4 bookings under the doctor totaling $20,000\text{ EGP}$ in the current month.
- [ ] **11.3 Commission Calculation:** Open **Admin $\rightarrow$ HR $\rightarrow$ Doctor Payroll**. Verify commission is calculated as $15\% \times 20,000 = 3,000\text{ EGP}$ (Gross: $13,000\text{ EGP}$).
- [ ] **11.4 Adjustments:** Add a deduction of $500\text{ EGP}$ to the doctor and a bonus of $1,000\text{ EGP}$ to the receptionist in **Staff Payroll**.
- [ ] **11.5 Net Pay Verification:** Verify doctor's Net Pay = $12,500\text{ EGP}$ and receptionist's Net Pay = $7,000\text{ EGP}$. Generate and save monthly payroll sheet.

---

### Scenario 12: Fixed Asset Depreciation & Capital Expense Tracking
**Domain:** Asset Valuation & Accounting Ledgers  
**Automated Reference:** `TC-019`, `TC-020`

- [ ] **12.1 Asset Creation:** Open **Admin $\rightarrow$ Finance $\rightarrow$ Assets $\rightarrow$ + Add Asset**. Enter a Laser Machine with purchase price $120,000\text{ EGP}$, useful life 60 months (5 years), salvage value $0\text{ EGP}$.
- [ ] **12.2 Straight-Line Math Check:** Verify monthly depreciation is calculated as $\frac{120000 - 0}{60} = 2,000\text{ EGP/month}$.
- [ ] **12.3 Post Depreciation Run:** Execute the monthly depreciation endpoint (`POST /api/assets/post-depreciation`).
- [ ] **12.4 Financial Ledger Posting:** Check **Expenses Ledger**: confirm a non-cash expense of $2,000\text{ EGP}$ under "Asset Depreciation" is created.
- [ ] **12.5 Book Value Reduction:** Confirm asset book value in `clinic_assets` is reduced to $118,000\text{ EGP}$.

---

### Scenario 13: Multi-Branch Inventory & Stock Reorder Alerts
**Domain:** Multi-Branch Stock Isolation & Reorder Triggers  
**Automated Reference:** `TC-006`, `TC-033`

- [ ] **13.1 Stock Scoping:** In **Admin $\rightarrow$ Inventory $\rightarrow$ Products**, set stock for "Hyaluronic Gel" at Sheikh Zayed Branch = 6 units (Min Alert Threshold = 5) and New Cairo Branch = 20 units.
- [ ] **13.2 Stock Deduction via Sessions:** Perform 2 clinical sessions in Sheikh Zayed consuming 1 unit each (stock drops to 4).
- [ ] **13.3 Branch Alert Inspection:** Select Sheikh Zayed in the top branch switcher. Open **Reception Dashboard $\rightarrow$ Notifications & Alerts**: verify low stock warning appears.
- [ ] **13.4 Branch Isolation Verification:** Switch branch to New Cairo: verify no low stock alert is displayed for this item.

---

### Scenario 14: Customer Support Inquiries & Helpdesk Lifecycle
**Domain:** Patient CRM & Support Ticket Management  
**Automated Reference:** `TC-002`, Role Matrix Category 11

- [ ] **14.1 Ticket Creation:** Open **Admin $\rightarrow$ Customer Support $\rightarrow$ + New Ticket**. Select patient, channel (**WhatsApp**), category (**Billing Query**), and priority (**Urgent**).
- [ ] **14.2 Assignment & Progress:** Assign ticket to a staff member and transition status from `open` to `in_progress`.
- [ ] **14.3 Resolution Notes:** Add internal resolution notes (*"Explained partial invoice and settled balance"*).
- [ ] **14.4 Ticket Resolution & CSAT:** Mark status as `resolved` and submit a 5-star customer satisfaction score.
- [ ] **14.5 Metrics Update:** Verify top KPI summary cards (Open Tickets, In Progress, Resolved, Satisfaction Rate) update dynamically.

---

### Scenario 15: Bilingual Localization (EN / AR) & RTL UI Engine
**Domain:** Internationalization & RTL Layout Integrity  
**Automated Reference:** `TC-027`

- [ ] **15.1 Language Toggle:** Click the **EN / AR** toggle button in the top navigation header. Verify `document.documentElement.dir` updates to `rtl`.
- [ ] **15.2 Arabic Typography & Layout:** Verify Arabic font rendering and right-to-left layout across:
  - **Bookings View & Calendar:** Day names, time slots (`ص / م`), and currency (`ج.م` / `EGP`).
  - **Doctor Portal:** Clinical session drawer, medical history slide-over, and prescription tables.
  - **Role Management Matrix:** Permission categories and descriptions in Arabic.
- [ ] **15.3 Reversal & Integrity:** Toggle back to English. Confirm zero text clipping, horizontal overflow, or displaced action menus in either language.

---

## ⚡ Automated Test Suite Execution
To run automated diagnostic verification against the backend API routes and schemas for these scenarios:
1. Log into `/admin` as Superadmin.
2. Navigate to **Settings $\rightarrow$ System Test Suite**.
3. Click **Run All Tests** to execute test cases `TC-001` through `TC-039`.
