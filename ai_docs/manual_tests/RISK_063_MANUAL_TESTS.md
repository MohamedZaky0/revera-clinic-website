# RISK-063 — HR Write Endpoints Weak-Auth Gap — Manual Test Checklist

Automated coverage: `tests/routes/auth-sweep.test.ts` asserts the correct behavior (403 for an
authenticated non-staff caller) for all four affected handlers as `it.fails` — they currently pass
through instead of rejecting, which is exactly the defect. This checklist proves the same thing
against a real Supabase project with a real patient account, and gives the fix a pass/fail check
once it lands.

## Evidence log

| # | Check | Result | Evidence | Date | Tester |
|---|---|---|---|---|---|
| 1 | Patient token → POST /api/hr/alerts | | | | |
| 2 | Patient token → POST /api/hr/attendance | | | | |
| 3 | Patient token → PATCH /api/hr/attendance | | | | |
| 4 | Patient token → POST /api/hr/leaves | | | | |
| 5 | Post-fix: legitimate employee flows still work | | | | |

## Checks

Prerequisite: a patient (customer) account with a valid logged-in session, and its bearer token.

- [ ] **1.** With the patient's token, `POST /api/hr/alerts` with any `employee_id`. **Before the
      fix:** succeeds and writes a row to `hr_missing_alerts`. **After the fix:** must return 403.
- [ ] **2.** With the patient's token, `POST /api/hr/attendance` (start a shift) for any
      `employee_id`. **Before the fix:** succeeds and writes/updates `hr_attendance`. **After the
      fix:** 403.
- [ ] **3.** With the patient's token, `PATCH /api/hr/attendance` (end a shift) for any
      `employee_id`. Same expectation as check 2.
- [ ] **4.** With the patient's token, `POST /api/hr/leaves` submitting a leave request under any
      `employee_id`. **Before the fix:** succeeds and writes to `hr_leave_requests`. **After the
      fix:** 403.
- [ ] **5.** After the fix lands, log in as a real employee (reception/HR/doctor) and confirm the
      normal attendance clock-in/out and leave-request flows in the admin UI still work — the fix
      must not accidentally lock out legitimate staff along with patients.
