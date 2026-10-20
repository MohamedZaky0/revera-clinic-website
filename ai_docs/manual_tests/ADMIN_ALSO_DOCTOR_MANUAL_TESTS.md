# Admin Who Is Also A Doctor: Manual Test Checklist

> Reasoning: `ai_docs/DECISIONS.md` -> DEC-114. Automated coverage: `tests/routes/employees-also-doctor.test.ts`. The form and screens have no component test, so the checks below need a person.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| 2026-10-21 | Checkbox shows for role admin, ticking shows the doctor sections | dev.reveraclinics.com (superadmin test account) | Browser pane, DOM check | Pass |
| 2026-10-21 | Create admin with the box ticked and the DEFAULT schedule (In-Clinic and Online both 09:00-17:00) | dev.reveraclinics.com | Saved without the overlap warning (after DEC-115); DB: role `admin`, `is_also_doctor = true`, 1 `providers` row. First attempt saved the flag as false because the insert retry path dropped it (fixed in dd99192) | Pass after fix |
| 2026-10-21 | Edit the same person, tick the box, Save Changes | dev.reveraclinics.com | DB `is_also_doctor = true`, still 1 provider row (no duplicate); appears in the Doctors screen | Pass |
| | Doctor view with that account, payroll split, unticking, a second login | | Not run yet | Pending |

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
- [ ] An admin who is NOT flagged does not see "Doctor view" in the sidebar footer. A flagged admin does. The superadmin always does.
- [ ] Untick the flag for an admin who had the Doctor view open, reload: back in the admin shell, no Doctor view button.
- [ ] Log in as that admin, open Doctor view: their own schedule and sessions load (not empty after the first seconds), and Back to Admin view returns.

## Payroll
- [ ] HR -> Payroll no longer lists that person; Doctor Payroll does. Run Payroll for a month: no staff payroll row is created for them.
- [ ] A plain admin (box not ticked) is still in the staff payroll.

## Shift overlap (DEC-115)
- [ ] Add a doctor (or tick the box on an admin) and leave the default schedule (In-Clinic 09:00-17:00 and Online 09:00-17:00, same branch): it saves, no "Shift Overlap" warning.
- [ ] Add a second In-Clinic shift 12:00-15:00 on the same day: the warning still appears.
- [ ] Give the doctor two branches with In-Clinic 09:00-17:00 at both on the same day: the warning still appears.

## Loading screen (RISK-121)
- [ ] Log in and reload: the panel appears right after the short "Verifying administrator session..." screen, without waiting for the Employees list. Open Employees straight away: the list is there or shows its loading state, never an empty table forever.
- [ ] With the browser's Network tab set to block or slow `/api/employees` (request blocking or Slow 3G), reload: the dashboard still opens; only the screens that need employees wait.
- [ ] Log in as a doctor-workspace account: the Doctor Portal opens right away (name may show the email for a moment, then the real name).
- [ ] Employees: every person who has signed in shows Active (green), only people who never accepted the invitation show Invited. Compare with Supabase Auth if unsure.
- [ ] Employees loads in a few seconds on the first visit after a deploy (cold server), not tens of seconds.

