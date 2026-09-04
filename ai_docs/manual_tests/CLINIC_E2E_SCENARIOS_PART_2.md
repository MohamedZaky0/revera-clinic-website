# Revera Clinics — 15 Advanced System Test Scenarios (Part 2: Scenarios 16–30)

> **Living Document.** Advanced manual testing checklist covering multi-service scheduling, package extensions, device maintenance, cancellation/refund automations, leave management, receivables aging, and supplier accounting.
> **Environment:** Linked Dev Database (`dev` branch).
> **Automated Diagnostics:** Cross-referenced with `/admin` $\rightarrow$ Settings $\rightarrow$ System Test Suite (`TC-001` through `TC-039`).

---

## 📊 Test Execution Evidence Log (Scenarios 16–30)

| # | Scenario Name | Primary Domain | Tester | Date | Result (Pass/Fail) | Evidence Notes |
|---|---|---|---|---|---|---|
| **16** | Multi-Service Booking with Add-ons & Combined Duration | Bookings & Scheduling | | | | |
| **17** | Package Expiry, Extensions & Over-Consumption Guard | Packages & Promotions | | | | |
| **18** | Doctor Inactive Status Transition & Booking Safety Shield | Doctors & Availability | | | | |
| **19** | Laser Device Maintenance, Pulse Limits & Reset Audit | Inventory & Devices | | | | |
| **20** | Appointment Cancellation, Postponement & Wallet Refund | Bookings & Financials | | | | |
| **21** | Patient No-Show Lifecycle & Cancellation Fee Ledger | Bookings & Billing | | | | |
| **22** | Recurring Expenses Generation & Due Tracking | Expenses & Payables | | | | |
| **23** | Employee Leave Requests & Attendance Alert Suppression | HR & Attendance | | | | |
| **24** | Customer Balance Reconciliation Engine & Ledger Audit | Financial Integrity | | | | |
| **25** | Digital Prescription WhatsApp & Cross-Browser Printing | Clinical & Patient Care | | | | |
| **26** | Financial Reports, Receivables Aging & Doctor PnL | Analytics & Reporting | | | | |
| **27** | Multi-Branch Room Allocation & Capability Guard | Scheduling & Rooms | | | | |
| **28** | Direct POS Consumables Usage in Doctor Sessions | Inventory & Clinical | | | | |
| **29** | Clinic Supplier Management, POs & Weighted Costing | Purchasing & Stock | | | | |
| **30** | CMS Hero Slides & Public Availability Sync Engine | Website CMS & Booking | | | | |

---

## 🧪 Detailed Scenario Checklists

---

### Scenario 16: Multi-Service Booking with Add-ons & Combined Duration
**Domain:** Bookings & Scheduling  
**Automated Reference:** `TC-004`, `TC-025`, `TC-030`

- [ ] **16.1 Multi-Service Selection:** Open **Admin $\rightarrow$ Bookings $\rightarrow$ + New Booking**. Select a primary service (e.g. "Full Body Laser" — $45\text{ mins}$, $1,200\text{ EGP}$) and 2 add-on services (e.g. "Cooling Mask" — $15\text{ mins}$, $250\text{ EGP}$ + "Post-Care Serum" — $10\text{ mins}$, $150\text{ EGP}$).
- [ ] **16.2 Cumulative Duration & Slot Reservation:** Verify that the system blocks a continuous $70\text{ mins}$ window on the doctor and room schedules without slot overlap.
- [ ] **16.3 Price Aggregation:** Verify the summary card displays the combined base price of $1,600\text{ EGP}$ with itemized service breakdown.
- [ ] **16.4 Booking Confirmation & Details Modal:** Confirm booking. Open the booking details drawer and verify all 3 services appear with their individual prices and durations under **Service Details**.
- [ ] **16.5 Invoice Integrity:** Generate invoice; verify line items accurately reflect the primary service and both attached add-ons.

---

### Scenario 17: Package Expiry, Extensions & Over-Consumption Guard
**Domain:** Packages & Promotions  
**Automated Reference:** `TC-017`, `/api/packages/extend`, `/api/packages/consume`

- [ ] **17.1 Expired Package Detection:** In a test patient file with an expired package (`expires_at < CURRENT_DATE`), attempt to redeem a session during **New Booking**.
- [ ] **17.2 Expiry Rejection:** Verify the booking engine alerts *"Selected package expired on [Date]"* and prevents $0\text{ EGP}$ redemption.
- [ ] **17.3 Package Extension Execution:** Navigate to **Patients $\rightarrow$ Purchased Packages $\rightarrow$ 3-dots $\rightarrow$ Extend Package**. Add 30 days validity with a mandatory reason.
- [ ] **17.4 Successful Post-Extension Redemption:** Confirm the package status returns to `active` and allows session redemption.
- [ ] **17.5 Over-Consumption Guard:** When a package has 0 remaining sessions (`qty_remaining = 0`), attempt an API consumption request. Confirm rejection with error *"No remaining sessions on this package"*.

---

### Scenario 18: Doctor Inactive Status Transition & Booking Safety Shield
**Domain:** Doctors & Availability Lifecycle  
**Automated Reference:** `TC-036`, `TC-009`

- [ ] **18.1 Doctor Status Modal:** Open **Admin $\rightarrow$ Doctors $\rightarrow$ 3-dots Menu $\rightarrow$ Change Status**. Select **Inactive**.
- [ ] **18.2 Active Appointments Warning:** Verify the modal displays a warning banner indicating how many future active bookings are assigned to this doctor.
- [ ] **18.3 Status Synchronization:** Confirm status updates to `Inactive` across both `providers` and linked `employee_accounts` tables.
- [ ] **18.4 Booking Selector Removal:** Open **New Booking** and the public `/book` page: verify the inactive doctor is immediately excluded from the doctor dropdown list.
- [ ] **18.5 Re-activation:** Change status back to **Active** and confirm the doctor reappears on all booking channels.

---

### Scenario 19: Laser Device Maintenance, Pulse Limits & Reset Audit
**Domain:** Inventory & Devices  
**Automated Reference:** `TC-007`, `TC-008`

- [ ] **19.1 Threshold Warning State:** When a laser device reaches $80\%$ of its max pulses (e.g. 80,000 / 100,000 pulses), verify its badge in **Inventory $\rightarrow$ Devices** displays **"1st Warning Reached"** (yellow).
- [ ] **19.2 Maintenance Due State:** Increment pulses to 100,000. Verify the device status flips to **"Maintenance Due"** (red) and triggers a high-priority alert on the Reception Dashboard.
- [ ] **19.3 Reset Pulse Counter:** Open **Devices $\rightarrow$ 3-dots $\rightarrow$ Reset Counter**. Enter technician name, lamp replacement cost ($15,000\text{ EGP}$), and maintenance notes.
- [ ] **19.4 Counter Zeroing:** Verify the pulse counter resets to `0` and device status returns to `Optimal`.
- [ ] **19.5 Audit Log Verification:** Open **Device Audit Logs** and verify the timestamped maintenance log with cost and technician notes is recorded.

---

### Scenario 20: Appointment Cancellation, Postponement & Wallet Refund
**Domain:** Bookings & Financials  
**Automated Reference:** `TC-030`, `TC-037`

- [ ] **20.1 Advance Deposit Booking:** Create a booking with a $300\text{ EGP}$ advance deposit paid.
- [ ] **20.2 Cancellation & Refund Choice:** In Booking Details, click **Cancel Booking**. Select cancellation reason and check **"Refund deposit to Patient Wallet"**.
- [ ] **20.3 Wallet Balance Increment:** Confirm the booking status transitions to `canceled` and $300\text{ EGP}$ is automatically credited to the patient's `wallet_balance` with a `wallet_txns` entry (`direction: in`).
- [ ] **20.4 Postponement Flow:** On a separate confirmed booking, click **Postpone Booking**. Select a new date/time slot.
- [ ] **20.5 Slot Reallocation:** Verify the previous time slot is immediately freed up for other bookings, and the new slot is locked.

---

### Scenario 21: Patient No-Show Lifecycle & Cancellation Fee Ledger
**Domain:** Bookings & Billing  
**Automated Reference:** `TC-022`, `TC-037`

- [ ] **21.1 No-Show Trigger:** For a confirmed appointment where the patient failed to attend, open Booking Details and click **Mark as No Show**.
- [ ] **21.2 Status & Slot Release:** Verify appointment status changes to `no_show` and the calendar room/doctor slot is released.
- [ ] **21.3 No-Show Fee Enforcement:** If clinic policy enforces a no-show fee, verify the forfeited fee is posted to transactions and logged under `/api/finance/no-show-cost`.
- [ ] **21.4 Patient Record Tagging:** Verify the patient's profile visit history reflects the `No Show` tag with historical attendance tracking.

---

### Scenario 22: Recurring Expenses Generation & Due Tracking
**Domain:** Expenses & Payables  
**Automated Reference:** `TC-019`

- [ ] **22.1 Recurring Rule Setup:** In **Admin $\rightarrow$ Finance $\rightarrow$ Expenses $\rightarrow$ Recurring**, create a monthly recurring expense for "Clinic Rent - Zayed Branch" ($45,000\text{ EGP}$, Due Day: 1st of each month).
- [ ] **22.2 Engine Execution:** Trigger the recurring expense generation engine (`POST /api/expenses/generate-due`).
- [ ] **22.3 Pending Expense Creation:** Verify an expense item with status `pending` is generated for the current month.
- [ ] **22.4 Payment Settlement:** Click **Pay Expense**, select payment method (Bank Transfer), and attach reference receipt.
- [ ] **22.5 Status Transition:** Confirm status transitions to `paid` and total monthly clinic cash outflows reflect the deduction.

---

### Scenario 23: Employee Leave Requests & Attendance Alert Suppression
**Domain:** HR & Attendance  
**Automated Reference:** `TC-014`, `TC-015`, `TC-023`

- [ ] **23.1 Leave Request Submission:** Submit a 2-day Sick Leave request for an employee via **Admin $\rightarrow$ HR $\rightarrow$ Leaves**.
- [ ] **23.2 Manager Approval:** Log in as HR / Superadmin and approve the leave request (`status = 'approved'`).
- [ ] **23.3 Missing Clock-in Verification:** On the approved leave days, check **HR Missing Check-in Alerts** (`/api/hr/alerts`).
- [ ] **23.4 Alert Suppression:** Confirm that no missing clock-in warning alert or penalty is generated for this employee during their approved leave.

---

### Scenario 24: Customer Balance Reconciliation Engine & Ledger Audit
**Domain:** Financial Integrity & Data Reconciliation  
**Automated Reference:** `TC-024`, `/api/customers/reconcile`

- [ ] **24.1 Drift Simulation Check:** Identify a customer with historical payments, wallet deposits, and invoices.
- [ ] **24.2 Run Reconciliation:** Execute `POST /api/customers/reconcile` for this customer.
- [ ] **24.3 Summation Verification:** Verify the engine sums all completed payments, refunds, and wallet movements from the immutable ledger.
- [ ] **24.4 Balance Realignment:** Confirm `spent_amount`, `outstanding`, and `wallet_balance` match the mathematical sum of transaction rows with 0 discrepancy.

---

### Scenario 25: Digital Prescription WhatsApp & Cross-Browser Printing
**Domain:** Clinical & Patient Care  
**Automated Reference:** `TC-018`, `TC-028`

- [ ] **25.1 Multi-Item Prescription:** In Doctor Session, create a prescription with 3 items (Antibiotic Cream, Moisturizing Emulsion, Oral Antihistamine) with specific dosage pills and duration.
- [ ] **25.2 WhatsApp Link Formatting:** Click **Send via WhatsApp**. Verify the generated URL contains UTF-8 encoded text with clean clinic branding, doctor name, and formatted bullet points.
- [ ] **25.3 Thermal & A4 Print Layout:** Click **Print Prescription**. Inspect print preview:
  - Header displays Revera Clinics logo, branch address, and date.
  - Body shows Patient Name, Age, Diagnosis badge, and numbered medications table.
  - Footer displays Doctor signature box and clinic contact info without layout clipping.

---

### Scenario 26: Financial Reports, Receivables Aging & Doctor PnL
**Domain:** Analytics & Reporting  
**Automated Reference:** `/api/finance/receivables-aging`, `/api/finance/doctor-pnl`

- [ ] **26.1 Receivables Aging Breakdown:** Open **Reports $\rightarrow$ Receivables Aging**. Verify outstanding debt is categorized into 0–30 days, 31–60 days, and 60+ days buckets.
- [ ] **26.2 Doctor P&L Metrics:** Open **Reports $\rightarrow$ Doctor Profitability**. Verify each doctor's row computes:
  $$\text{Net Margin} = \text{Gross Billed Revenue} - (\text{Fixed Salary} + \text{Commissions} + \text{Consumables Cost})$$
- [ ] **26.3 Export Integrity:** Click **Export to CSV** and **Print Report**. Confirm exported data matches live dashboard metrics.

---

### Scenario 27: Multi-Branch Room Allocation & Capability Guard
**Domain:** Scheduling & Rooms  
**Automated Reference:** `TC-003`, `/api/rooms`, `/api/service-rooms`

- [ ] **27.1 Room Capability Mapping:** Configure Room 1 as "Laser Treatment Room" and Room 2 as "Facial / Skin Care Room".
- [ ] **27.2 Automatic Room Assignment:** Create a Laser booking: confirm system automatically assigns Room 1. Create a Hydrafacial booking: confirm system assigns Room 2.
- [ ] **27.3 Simultaneous Booking Guard:** Attempt to create two simultaneous Laser bookings at the same time when only one Laser Room exists.
- [ ] **27.4 Rejection:** Verify system blocks the second booking due to lack of available capable rooms.

---

### Scenario 28: Direct POS Consumables Usage in Doctor Sessions
**Domain:** Inventory & Clinical  
**Automated Reference:** `TC-006`, `TC-025`, `/api/reservation-products`

- [ ] **28.1 Session Product Attachment:** During an ongoing doctor session, attach an extra consumable item (e.g. "Botox 50U Vial" — Quantity: 1).
- [ ] **28.2 Dynamic Pricing Update:** Verify the session total price dynamically recalculates to include the product cost.
- [ ] **28.3 Real-Time Stock Depletion:** Complete the session and confirm inventory for "Botox 50U Vial" drops by 1 unit in `inventory_products`.
- [ ] **28.4 Itemized Invoice:** Verify the final invoice displays the clinical service alongside the attached consumable item.

---

### Scenario 29: Clinic Supplier Management, POs & Weighted Costing
**Domain:** Purchasing & Stock  
**Automated Reference:** `TC-006`, `/api/suppliers`, `/api/purchases`

- [ ] **29.1 Supplier Registration:** Open **Inventory $\rightarrow$ Suppliers $\rightarrow$ + Add Supplier**. Register "Cairo Pharma Supplies" with tax ID and contact info.
- [ ] **29.2 Purchase Order Logging:** Record a purchase order for 50 units of "Sunscreen SPF50" at $200\text{ EGP/unit}$ ($10,000\text{ EGP}$ total).
- [ ] **29.3 Stock Increment:** Verify product stock increases by 50 units.
- [ ] **29.4 Weighted Cost Recalculation:** Verify the weighted average unit cost price updates accurately in `inventory_products`.

---

### Scenario 30: CMS Hero Slides & Public Availability Sync Engine
**Domain:** Website CMS & Booking Availability  
**Automated Reference:** `TC-022`, `/api/page-settings`, `/api/availability`

- [ ] **30.1 Bilingual CMS Update:** In **Admin $\rightarrow$ Settings $\rightarrow$ Website CMS**, update Hero Slide 1 English & Arabic titles and promotional image URL.
- [ ] **30.2 Homepage Real-Time Sync:** Open the public homepage (`/`) and verify the updated hero banner displays in both English and Arabic upon language toggle.
- [ ] **30.3 Public Booking Availability Sync:** From public `/book`, select a service and doctor. Confirm the available dates and slots match the exact live doctor schedule and branch operating hours configured in the admin panel.
- [ ] **30.4 Booked Slot Shield:** Confirm already-booked slots on the admin calendar are disabled in the public booking picker.

---

## ⚡ Automated Test Suite Execution
To run automated diagnostic verification against all system modules:
1. Navigate to `/admin` $\rightarrow$ **Settings $\rightarrow$ System Test Suite**.
2. Click **Run All Tests** to execute test cases `TC-001` through `TC-039`.
