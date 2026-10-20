# Admin Who Is Also A Doctor: Manual Test Checklist

> Reasoning: `ai_docs/DECISIONS.md` -> DEC-114. Automated coverage: `tests/routes/employees-also-doctor.test.ts`. The form and screens have no component test, so the checks below need a person.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| | Everything below | | Not run yet | Pending |

## Before testing
- [ ] Migration `20261021000000_add_is_also_doctor_to_employee_accounts.sql` applied to the database being tested (dev first, production before deploying the code).

## Add / edit employee
- [ ] Add Employee with role `admin`: a checkbox "This person also treats patients (doctor)" is shown. With role `doctor` it is NOT shown.
- [ ] Tick it: the doctor sections (speciality, weekly shifts, services, commissions) appear and the shift/target box disappears. Untick: back to normal.
- [ ] Save a new admin with it ticked: the person appears in the Doctors screen and in New Booking's doctor list; their login still lands on the admin shell with the admin permissions.
- [ ] Edit an existing admin, tick it, save: same result. Reopen Edit: the box is still ticked.
- [ ] Edit that person later without touching the box (change a phone number): the box stays ticked, the doctor is still there.
- [ ] Untick and save: no error; the doctor row stays in Doctors (deactivate it there if needed).

## Doctor view
- [ ] Log in as that admin, open Doctor view: their own schedule and sessions load (not empty after the first seconds), and Back to Admin view returns.

## Payroll
- [ ] HR -> Payroll no longer lists that person; Doctor Payroll does. Run Payroll for a month: no staff payroll row is created for them.
- [ ] A plain admin (box not ticked) is still in the staff payroll.

## Shift overlap (DEC-115)
- [ ] Add a doctor (or tick the box on an admin) and leave the default schedule (In-Clinic 09:00-17:00 and Online 09:00-17:00, same branch): it saves, no "Shift Overlap" warning.
- [ ] Add a second In-Clinic shift 12:00-15:00 on the same day: the warning still appears.
- [ ] Give the doctor two branches with In-Clinic 09:00-17:00 at both on the same day: the warning still appears.

