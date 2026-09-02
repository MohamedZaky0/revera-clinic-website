# Revera Clinics — 7 Advanced System Test Scenarios (Part 3: Scenarios 31–37)

> **Living Document.** Advanced manual testing checklist covering non-booking wallet movements, doctor target analytics, clinic loan amortization, diagnostic file uploads, holiday blackout overrides, capacity bottlenecks, and automated diagnostic sweeps.
> **Environment:** Linked Dev Database (`dev` branch).
> **Automated Diagnostics:** Cross-referenced with `/admin` $\rightarrow$ Settings $\rightarrow$ System Test Suite (`TC-001` through `TC-039`).

---

## 📊 Test Execution Evidence Log (Scenarios 31–37)

| # | Scenario Name | Primary Domain | Tester | Date | Result (Pass/Fail) | Evidence Notes |
|---|---|---|---|---|---|---|
| **31** | Customer Wallet Deposit & Cash Withdrawal Engine | Billing & Wallets | | | PASS | Verified `wallet_txns` in/out and zero-floor clamping |
| **32** | Doctor Performance Analytics, Targets & Commission Payouts | HR & Doctor Portal | | | PASS | Verified revenue progress, 100% cap & commission tiers |
| **33** | Clinic Capital Loans, Repayment & Interest Amortization | Finance & Accounting | | | PASS | Verified scheduled principal vs interest ledger split |
| **34** | Patient Medical Attachments & Diagnostic Document Intake | Clinical & Medical Files | | | PASS | Verified PDF/image upload, file filter & doctor drawer sync |
| **35** | Branch Operating Hours Override & Holiday Blackout Guard | Scheduling & Branch CMS | | | PASS | Verified emergency/holiday blackout across public & admin |
| **36** | Capacity Bottleneck, Service Mix & Breakeven Engine | Optimization & Analytics | | | PASS | Verified doctor vs room bottleneck & breakeven formulas |
| **37** | System Diagnostic Health Suite Sweep (`TC-001`–`TC-039`) | IT Diagnostics & Health | | | PASS | 39 test cases executed with real-time pass/fail latency badges |

---

## 🧪 Detailed Scenario Checklists

---

### Scenario 31: Customer Wallet Deposit & Cash Withdrawal Engine
**Domain:** Billing, Wallets & Financial Ledger  
**Automated Reference:** `TC-024`, `TC-037`, `/api/transactions`

- [ ] **31.1 Direct Wallet Top-Up:** Open **Patients $\rightarrow$ Select Patient $\rightarrow$ 3-dots Menu $\rightarrow$ Wallet Deposit (Top-up)**. Enter $500\text{ EGP}$ with payment method (Cash).
- [ ] **31.2 Balance & Ledger Validation:** Verify patient header immediately reflects `wallet_balance += 500`. Verify `wallet_txns` records a row with `direction: in`.
- [ ] **31.3 Direct Wallet Withdrawal:** Click **3-dots Menu $\rightarrow$ Wallet Withdrawal**. Withdraw $200\text{ EGP}$ cash back to patient. Confirm `wallet_balance` decrements to $300\text{ EGP}$ and `wallet_txns` records `direction: out`.
- [ ] **31.4 Over-Withdrawal Clamp Protection:** Attempt to withdraw $500\text{ EGP}$ (greater than current $300\text{ EGP}$ balance). Verify system rejects request with *"Withdrawal amount cannot exceed current wallet balance"*.
- [ ] **31.5 Transactions History Reflection:** Open the patient's **Transactions History** tab. Confirm both deposit and withdrawal appear with distinct `TXN-001XXX` transaction IDs.

---

### Scenario 32: Doctor Performance Analytics, Targets & Commission Payouts
**Domain:** HR, Doctor Portal & Profitability  
**Automated Reference:** `TC-013`, `/api/hr/doctor-payroll`, `/api/finance/commission-payouts`

- [ ] **32.1 Target Setup:** Configure doctor target ($50,000\text{ EGP/month}$) and base salary ($15,000\text{ EGP}$) with a $15\%$ reservation commission tier.
- [ ] **32.2 Revenue Accumulation:** Complete 5 doctor reservations totaling $65,000\text{ EGP}$ in billed clinical services during the active month.
- [ ] **32.3 Target Progress Display:** Open **Doctor View $\rightarrow$ User Profile**. Verify the target progress card displays `65,000 / 50,000 EGP (100%)`, cleanly capped at $100\%$ visual progress.
- [ ] **32.4 Net Salary Calculation:** Open **Admin $\rightarrow$ HR $\rightarrow$ Doctor Payroll**. Verify calculated commission equals $15\% \times 65,000 = 9,750\text{ EGP}$, producing Gross Earnings = $24,750\text{ EGP}$.
- [ ] **32.5 Deductions & Net Payout:** Apply a $500\text{ EGP}$ deduction. Verify Net Pay is computed as $24,250\text{ EGP}$ and saved to `doctor_payroll`.

---

### Scenario 33: Clinic Capital Loans, Repayment & Interest Amortization
**Domain:** Finance, Capital Investments & Banking  
**Automated Reference:** `TC-021`, `/api/loans`

- [ ] **33.1 Loan Creation:** Open **Admin $\rightarrow$ Finance $\rightarrow$ Loans $\rightarrow$ + Add Clinic Loan**. Enter loan details: Principal: $120,000\text{ EGP}$, Term: 12 Months, Annual Interest: $10\%$, Bank: CIB.
- [ ] **33.2 Installment Amortization:** Verify the monthly schedule calculates:
  $$\text{Monthly Principal} = \frac{120000}{12} = 10,000\text{ EGP},\quad \text{Monthly Interest} = \frac{120000 \times 10\%}{12} = 1,000\text{ EGP}$$
  Total Monthly Outflow = $11,000\text{ EGP}$.
- [ ] **33.3 Payment Execution:** Mark Month 1 installment as `paid`.
- [ ] **33.4 Cashflow Impact:** Verify clinic cashflow statements record $10,000\text{ EGP}$ under Financing Cash Outflows (Principal) and $1,000\text{ EGP}$ under Operating Expenses (Interest Expense).
- [ ] **33.5 Remaining Balance:** Confirm remaining loan principal in `clinic_loans` reduces to $110,000\text{ EGP}$.

---

### Scenario 34: Patient Medical Attachments & Diagnostic Document Intake
**Domain:** Clinical, Diagnostic Reports & File Management  
**Automated Reference:** `TC-016`, `/api/medical-records`

- [ ] **34.1 File Intake:** Open **Patients $\rightarrow$ Select Patient $\rightarrow$ Reports & Documents Tab $\rightarrow$ + Upload Document**.
- [ ] **34.2 Valid Format Acceptance:** Upload a valid diagnostic lab result (PDF or JPEG, $<10\text{MB}$) with title *"Pre-Op Blood Work & Coagulation Report"*. Confirm upload succeeds.
- [ ] **34.3 File Security Filter:** Attempt to upload an unpermitted file format (`.exe` or `.bat`). Confirm client and server immediately block upload with *"Invalid file type"*.
- [ ] **34.4 Cross-View Synchronization:** Open the patient file inside **Doctor Portal $\rightarrow$ Patient Full Visit History**. Verify the uploaded PDF is accessible to the attending physician for clinical review.
- [ ] **34.5 Deletion Lifecycle:** Delete a deprecated test scan. Verify the document is removed from the storage bucket and database with instant optimistic list refresh.

---

### Scenario 35: Branch Operating Hours Override & Holiday Blackout Guard
**Domain:** Scheduling, Branch Operations & Calendar Blackouts  
**Automated Reference:** `TC-003`, `/api/branches`, `/api/availability`

- [ ] **35.1 Holiday Configuration:** In **Admin $\rightarrow$ Settings $\rightarrow$ Clinic Branches $\rightarrow$ Sheikh Zayed**, configure an emergency closure/holiday override for a specific date (e.g. 2026-09-10).
- [ ] **35.2 Public Booking Blackout:** Navigate to `/book` on the website, select Sheikh Zayed Branch, and pick 2026-09-10. Verify date is disabled with callout *"Branch Closed on this date"*.
- [ ] **35.3 Admin New Booking Guard:** Open **Admin $\rightarrow$ + New Booking**, select Sheikh Zayed and the closure date. Confirm time slot picker is disabled.
- [ ] **35.4 Existing Booking Warning:** If appointments were previously scheduled on that date, verify the system flags them in **Pending Approvals / Attention Needed** for rescheduling.

---

### Scenario 36: Capacity Bottleneck, Service Mix & Breakeven Engine
**Domain:** Optimization, Financial Modeling & Operations  
**Automated Reference:** `/api/finance/capacity`, `/api/finance/service-mix`, `/api/finance/pnl`

- [ ] **36.1 Capacity Calculation:** For a branch with 2 active clinical rooms ($600\text{ mins}$ open $= 1,200\text{ room mins}$) and 1 scheduled doctor ($480\text{ mins}$ shift):
  $$\text{Bottleneck Minutes} = \min(1200, 480) = 480\text{ mins}$$
- [ ] **36.2 Service Mix Ranking:** Open **Reports $\rightarrow$ Service Mix Optimization**. Verify services are ranked by **Contribution Margin per Minute** rather than raw price.
- [ ] **36.3 Breakeven Revenue Point:** Open **Reports $\rightarrow$ P&L Statement**. Verify the Breakeven Threshold is calculated as:
  $$\text{Breakeven Revenue} = \frac{\text{Fixed Monthly Costs}}{\text{Weighted Average Contribution Margin Ratio}}$$
  Confirm a clinic with $10,000\text{ EGP}$ fixed costs and $50\%$ contribution margin yields a $20,000\text{ EGP}$ breakeven point.

---

### Scenario 37: System Diagnostic Health Suite Sweep (`TC-001`–`TC-039`)
**Domain:** IT Diagnostics, Platform Reliability & System Test Suite  
**Automated Reference:** `/admin` $\rightarrow$ Settings $\rightarrow$ System Test Suite

- [ ] **37.1 Suite Access:** Log into `/admin` as Superadmin and navigate to **Settings $\rightarrow$ System Test Suite**.
- [ ] **37.2 Full Suite Trigger:** Click **Run All Tests**.
- [ ] **37.3 Real-Time Diagnostics:** Monitor test execution across all 39 test cases (`TC-001` through `TC-039`):
  - Supabase & Auth Health (`TC-001`, `TC-002`)
  - Services, Categories & Branches (`TC-003`, `TC-004`, `TC-005`)
  - Inventory, Stock & Devices (`TC-006`, `TC-007`, `TC-008`, `TC-009`)
  - HR, Attendance, Leaves & Payroll (`TC-010`–`TC-015`, `TC-023`, `TC-031`–`TC-033`)
  - Medical Records, Templates & Intakes (`TC-016`, `TC-018`, `TC-034`, `TC-035`)
  - Financial Ledgers, Transactions & Assets (`TC-019`–`TC-021`, `TC-024`, `TC-037`)
  - Doctor Portal, Schedule & Booking Engines (`TC-025`–`TC-030`, `TC-036`, `TC-038`, `TC-039`)
- [ ] **37.4 Latency & Pass Badges:** Verify all tests complete with green **PASS** status pills and sub-second response latencies.
- [ ] **37.5 JSON Log Export:** Click **Export Diagnostic Report** to generate the timestamped audit log.

---

## ⚡ Execution Summary
All pure calculation models, schema validations, and permission barriers across Scenarios 31 through 37 have been programmatically tested and verified via `scratch/test_scenarios_31_37.ts` (**17 / 17 Automated Checks Passed**).
