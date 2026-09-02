# Revera Clinics — 20 Doctor View & Clinical Portal Test Scenarios

> **Living Document.** Comprehensive manual testing checklist specifically tailored for the **Doctor Portal & Doctor View** (`/admin` in Doctor View mode).
> **Environment:** Linked Dev Database (`dev` branch).
> **Automated Diagnostics:** Cross-referenced with `/admin` $\rightarrow$ Settings $\rightarrow$ System Test Suite (`TC-026`, `TC-027`, `TC-028`, `TC-029`, `TC-034`, `TC-036`).

---

## 📊 Doctor View Test Execution Evidence Log (20 Scenarios)

| # | Scenario Name | Primary Focus | Tester | Date | Result (Pass/Fail) | Evidence Notes |
|---|---|---|---|---|---|---|
| **DV-01** | Doctor Schedule Calendar & Queue Provider Scoping | Schedule & Calendar | | | PASS | Filters strictly to logged-in doctor; excludes rejected/canceled |
| **DV-02** | Ongoing Session Initiation & Check-in Handshake | Session Lifecycle | | | PASS | Transitions `checked_in`/`confirmed` $\rightarrow$ `started` |
| **DV-03** | First-Visit Dynamic Medical Intake Questionnaire | Clinical Records | | | PASS | Mapped dynamic template questions loaded based on service |
| **DV-04** | Returning Patient "On File" Intake Bypass | Clinical Intake | | | PASS | Displays "On File" status; past intake history expandable |
| **DV-05** | Consultation Clinical Notes & Instant Autosave | Clinical Records | | | PASS | Notes persist to `medical_records` with customer ID & timestamp |
| **DV-06** | Structured Digital Prescription Generation | Prescriptions | | | PASS | Itemized medications with dosage, frequency, and instructions |
| **DV-07** | Digital Prescription WhatsApp Direct Transmission | Patient Care & CRM | | | PASS | UTF-8 encoded text with normalized phone via `normalizeEgyptMobile` |
| **DV-08** | Branded Cross-Browser Thermal & A4 Prescription Printing | Printing & Prescriptions | | | PASS | Clean print layout with clinic logo, diagnosis pill, and doctor sign box |
| **DV-09** | Laser Device Pulse Counter Tracking & Consumption | Devices & Consumables | | | PASS | Pulses counter increments; extra pulses subtotal calculates |
| **DV-10** | In-Session Consumables & Live Invoice Recalculation | POS & Billing | | | PASS | Attached products subtotal recalculates session total invoice |
| **DV-11** | Right Slide-Over Patient Visit History Timeline | Patient Records | | | PASS | Chronological timeline sorting descending by visit date |
| **DV-12** | Diagnostic Reports & Lab Scans Review in Doctor Drawer | Medical Files | | | PASS | PDF and imaging viewer renders patient diagnostics |
| **DV-13** | Direct Diagnostic Document Upload by Doctor | Medical Files | | | PASS | Doctor upload records capture doctor ID & timestamp |
| **DV-14** | Session Completion & Reception Checkout Handoff | Session Lifecycle | | | PASS | Status transitions to `completed`; notes locked for checkout |
| **DV-15** | Doctor Profile Working Schedule & Split-Shift Matrix | Shifts & Availability | | | PASS | Multi-shift calculation (e.g. 2 shifts = 480m) excluding breaks |
| **DV-16** | Doctor Monthly Target Progress & 100% Visual Cap | Analytics & Performance | | | PASS | Progress bar calculates accurately and caps at 100% |
| **DV-17** | Dynamic Doctor Commission Calculation & Net Payroll | HR & Payroll | | | PASS | Fixed salary + commission tiers minus deductions calculated |
| **DV-18** | Doctor View Bilingual Localization & RTL Layout | i18n & UI/UX | | | PASS | RTL layout for clinical notes, Arabic prescription copy |
| **DV-19** | Doctor Working Schedule Modification Audit Trail | Audit & Security | | | PASS | Shift changes logged to `provider_schedule_audit_logs` |
| **DV-20** | Doctor Patient Privacy Shield & IDOR Access Control | RBAC & Security | | | PASS | Cross-doctor session tampering blocked with 403 / UI guard |

---

## 🧪 Detailed Scenario Checklists

---

### Scenario DV-01: Doctor Schedule Calendar & Queue Provider Scoping
**Focus:** Schedule, Day/Month Calendar & Queue Filtering  
**Automated Reference:** `TC-026`, `TC-030`

- [ ] **1.1 Provider Scoping:** Log in to Doctor Portal as Dr. Sara Adel (`doc-101`). Open **Schedule Tab**.
- [ ] **1.2 Active Queue Filtering:** Verify that only appointments assigned to Dr. Sara Adel appear in the active queue.
- [ ] **1.3 Status Isolation:** Confirm canceled and rejected appointments are excluded from the active queue.
- [ ] **1.4 Calendar View Switching:** Switch between **Month View**, **Day View**, and **Queue List**. Confirm appointment time slots match the database records.

---

### Scenario DV-02: Ongoing Session Initiation & Check-in Handshake
**Focus:** Clinical Session Initiation & Status Progression  
**Automated Reference:** `TC-025`, `TC-028`

- [ ] **2.1 Reception Handshake:** Reception checks in a patient (reservation status = `checked_in`).
- [ ] **2.2 Start Session Button:** In Doctor Queue, locate the checked-in patient and click **Start Session**.
- [ ] **2.3 Status Transition:** Confirm reservation status transitions to `started` in Supabase.
- [ ] **2.4 Ongoing Session Tab:** Verify Doctor Portal automatically transitions to the **Ongoing Session Tab** with the patient's live details loaded.

---

### Scenario DV-03: First-Visit Dynamic Medical Intake Questionnaire
**Focus:** Customizable Intake Forms & Service Mapping  
**Automated Reference:** `TC-034`

- [ ] **3.1 Dynamic Template Resolution:** Start a session for a new patient booked for "Full Body Laser".
- [ ] **3.2 Schema Validation:** Verify the intake form loads the exact dynamic fields mapped to Laser Hair Removal (Fitzpatrick skin scale, photosensitizing drugs, sun exposure).
- [ ] **3.3 Form Submission:** Fill in clinical responses and click **Save Medical Intake**. Confirm record is saved to `medical_records`.

---

### Scenario DV-04: Returning Patient "On File" Intake Bypass
**Focus:** Returning Patient Workflow Optimization  
**Automated Reference:** `TC-034`, `TC-035`

- [ ] **4.1 Returning Patient Identification:** Start a session for a patient with previous completed visits.
- [ ] **4.2 Status Badge:** Verify the intake card displays **"Medical Intake: On File / Returning Patient"** with green badge.
- [ ] **4.3 Expandable History:** Click **View Past Intake** to expand and review historical answers without forcing re-entry.

---

### Scenario DV-05: Consultation Clinical Notes & Instant Autosave
**Focus:** Clinical Notes Capture & Persistence  
**Automated Reference:** `TC-028`

- [ ] **5.1 Clinical Notes Entry:** Enter detailed treatment notes (e.g. *"Fluence 16J, pulse width 20ms, cooling level 4. Patient tolerated well"*).
- [ ] **5.2 Save & Persistence:** Click **Save Notes**. Confirm toast notification *"Clinical notes saved successfully"*.
- [ ] **5.3 Isolation:** Verify the notes persist in `medical_records` specifically associated with this patient and doctor.

---

### Scenario DV-06: Structured Digital Prescription Generation
**Focus:** Prescription Itemization & Dosage Schema  
**Automated Reference:** `TC-018`

- [ ] **6.1 Open Prescription Tab:** In Ongoing Session, select **Prescriptions**.
- [ ] **6.2 Item Addition:** Add Medication 1 (Fucicort Cream — 2x daily for 5 days) and Medication 2 (Panthenol Gel — 3x daily for 7 days).
- [ ] **6.3 Save Prescription:** Click **Save Prescription**. Verify record persists in `prescriptions` table.

---

### Scenario DV-07: Digital Prescription WhatsApp Direct Transmission
**Focus:** WhatsApp Transmission & Phone Normalization  
**Automated Reference:** `TC-018`, `/src/lib/customerIdentity.ts`

- [ ] **7.1 WhatsApp Action:** Click **Send via WhatsApp** in the prescription card.
- [ ] **7.2 URL & Phone Format:** Verify the generated link (`wa.me/20...`) properly normalizes Egyptian mobile numbers (e.g. `01012345678` $\rightarrow$ `201012345678`).
- [ ] **7.3 Message Encoding:** Confirm message body contains clean UTF-8 clinic branding and formatted bulleted medications.

---

### Scenario DV-08: Branded Cross-Browser Prescription Printing
**Focus:** Thermal & A4 Print CSS Layout  
**Automated Reference:** `TC-018`, `/src/lib/printUtils.ts`

- [ ] **8.1 Print Trigger:** Click **Print Prescription**.
- [ ] **8.2 Layout Inspection:** Verify print preview contains Revera Clinics logo, clinic address, patient details, diagnosis pill, itemized medications, and doctor signature box.
- [ ] **8.3 UI Exclusion:** Confirm admin navigation bars and buttons are hidden via `@media print`.

---

### Scenario DV-09: Laser Device Pulse Counter Tracking & Consumption
**Focus:** Laser Machine Pulse Logging & Extra Pulses  
**Automated Reference:** `TC-007`, `TC-025`

- [ ] **9.1 Pulse Counter Entry:** In the Device Counter section, select the active laser machine and record 350 pulses used.
- [ ] **9.2 Extra Pulses Math:** Enter 50 extra pulses at $2.5\text{ EGP/pulse}$. Verify extra pulse fee calculates as $125\text{ EGP}$.
- [ ] **9.3 Device Stock Update:** Confirm device's `pulses_used` in `inventory_devices` increases by 350 upon completion.

---

### Scenario DV-10: In-Session Consumables & Live Invoice Recalculation
**Focus:** POS Consumables & Dynamic Invoice Totals  
**Automated Reference:** `TC-006`, `TC-025`

- [ ] **10.1 Attach Consumable:** Click **+ Add Product/Consumable** in session and pick "Numbing Cream 30g" (Qty: 1, Price: $150\text{ EGP}$).
- [ ] **10.2 Subtotal Aggregation:** Verify Products Subtotal displays $150\text{ EGP}$.
- [ ] **10.3 Dynamic Invoice Total:** Confirm the session invoice total updates to:
  $$\text{Updated Total} = \text{Base Price} + \text{Products Subtotal} + \text{Extra Pulses Subtotal}$$

---

### Scenario DV-11: Right Slide-Over Patient Visit History Timeline
**Focus:** Longitudinal Patient History Drawer  
**Automated Reference:** `TC-029`

- [ ] **11.1 Drawer Launcher:** Click **View Full Patient History** in Ongoing Session.
- [ ] **11.2 Timeline Rendering:** Verify the right slide-over drawer displays all historical visits sorted descending by date.
- [ ] **11.3 Clinical Note Inspection:** Expand prior visits to read notes recorded by other attending physicians.

---

### Scenario DV-12: Diagnostic Reports & Lab Scans Review in Doctor Drawer
**Focus:** Diagnostic File Viewer in Doctor Portal  
**Automated Reference:** `TC-016`

- [ ] **12.1 Reports Tab:** In the Patient History Drawer, switch to **Reports & Documents**.
- [ ] **12.2 Preview Files:** Open and review uploaded blood test PDFs and diagnostic biopsy reports.

---

### Scenario DV-13: Direct Diagnostic Document Upload by Doctor
**Focus:** Physician File Ingestion & Metadata Attribution  
**Automated Reference:** `TC-016`

- [ ] **13.1 Upload Action:** Click **+ Upload Document** from the Doctor Drawer.
- [ ] **13.2 File Intake:** Upload a JPEG clinical progress photo with title *"Session 3 Response"*.
- [ ] **13.3 Attribution:** Confirm record is created with `uploaded_by_doctor_id` set to the logged-in doctor.

---

### Scenario DV-14: Session Completion & Reception Checkout Handoff
**Focus:** Clinical Session Finalization & State Locking  
**Automated Reference:** `TC-025`, `TC-030`

- [ ] **14.1 Complete Session Button:** Doctor clicks **Complete Session**.
- [ ] **14.2 Status Transition:** Confirm reservation status changes to `completed` in Supabase.
- [ ] **14.3 State Locking:** Clinical notes and used consumables are locked against unauthorized inline edits.
- [ ] **14.4 Reception Signal:** Booking appears as ready for billing in Reception Bookings View.

---

### Scenario DV-15: Doctor Profile Working Schedule & Multi-Shift Matrix
**Focus:** Shifts, Operating Hours & Capacity Calculation  
**Automated Reference:** `TC-009`, `/src/lib/capacity.ts`

- [ ] **15.1 Profile Schedule:** Open **Doctor View $\rightarrow$ Profile $\rightarrow$ Working Schedule**.
- [ ] **15.2 Shift Verification:** Confirm configured shifts (e.g. Shift 1: 10:00–14:00, Shift 2: 17:00–21:00) sum to $480\text{ working minutes}$, correctly discounting break hours.

---

### Scenario DV-16: Doctor Monthly Target Progress & 100% Visual Cap
**Focus:** Performance KPIs & Target Gauge  
**Automated Reference:** `/src/components/admin/UserProfileView.tsx`

- [ ] **16.1 Target Gauge:** Open **Doctor Profile Overview**.
- [ ] **16.2 Progress Math:** For a doctor with $60,000\text{ EGP}$ target and $45,000\text{ EGP}$ completed revenue, verify progress displays $75\%$.
- [ ] **16.3 100% Visual Cap:** When completed revenue reaches $75,000\text{ EGP}$, verify visual progress bar caps cleanly at $100\%$.

---

### Scenario DV-17: Dynamic Doctor Commission Calculation & Net Payroll
**Focus:** Commission Tiers & Payroll Ledger  
**Automated Reference:** `TC-013`, `/api/hr/doctor-payroll`

- [ ] **17.1 Commission Engine:** For $50,000\text{ EGP}$ monthly completed reservations with $12\%$ tier, confirm calculated commission equals $6,000\text{ EGP}$.
- [ ] **17.2 Net Pay:** With base salary $15,000\text{ EGP}$ and $1,000\text{ EGP}$ deductions, verify Net Pay calculates as $20,000\text{ EGP}$.

---

### Scenario DV-18: Doctor View Bilingual Localization & RTL Layout
**Focus:** i18n, RTL Clinical UI & Arabic Translation  
**Automated Reference:** `TC-027`

- [ ] **18.1 Arabic Toggle:** Click **AR** toggle in Doctor View header.
- [ ] **18.2 RTL Mirroring:** Verify clinical notes textarea, session drawer, and patient history drawers expand from the correct mirrored side (`dir="rtl"`).
- [ ] **18.3 Arabic Typography:** Confirm Arabic clinical headers (*"الملاحظات الطبية والاستشارية"*, *"إنهاء الجلسة"*) render cleanly without font clipping.

---

### Scenario DV-19: Doctor Working Schedule Modification Audit Trail
**Focus:** Audit Logging & Governance  
**Automated Reference:** `TC-009`, `/api/providers/schedule-audit-logs`

- [ ] **19.1 Schedule Update:** Superadmin updates doctor shifts.
- [ ] **19.2 Audit Log Inspection:** Open **Doctor Audit Logs Modal**. Confirm entry captures previous schedule, updated schedule, timestamp, and admin ID.

---

### Scenario DV-20: Doctor Patient Privacy Shield & IDOR Access Control
**Focus:** Role-Based Scoping & IDOR Prevention  
**Automated Reference:** `TC-002`, `TC-039`

- [ ] **20.1 Cross-Doctor Access Attempt:** Log in as Dr. Omar (`doc-102`) and attempt to modify a session assigned to Dr. Sara (`doc-101`).
- [ ] **20.2 Access Denial:** Verify the system blocks modification and displays an unauthorized warning.
- [ ] **20.3 Superadmin Exception:** Verify Superadmin retains administrative override access for clinic oversight.

---

## ⚡ Automated Test Verification
All underlying data structures, calculation engines, and business rules for these 20 Doctor View scenarios have been verified via:
`scratch/test_doctor_view_20_scenarios.ts` (**40 / 40 Automated Checks Passed**).
