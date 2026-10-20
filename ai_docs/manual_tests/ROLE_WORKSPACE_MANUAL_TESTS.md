# Role Workspace (Doctor Screens Chosen By The Role): Manual Test Checklist

> Reasoning: `ai_docs/DECISIONS.md` -> DEC-113; bug: `ai_docs/RISKS.md` -> RISK-120. Automated coverage: `tests/lib/roleUtils.test.ts` (workspace), `tests/routes/roles-workspace.test.ts`, `tests/routes/employees-post-escalation.test.ts` (doctor sync cases). The screens themselves have no component test, so the checks below need a person.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| | Everything below | | Not run yet | Pending |

## Before testing
- [ ] Migration `20261020000000_add_workspace_to_roles.sql` applied to the database being tested (dev: applied 2026-10-20; production: before deploying the code).
- [ ] Role Management shows a "Doctor workspace" badge on the `doctor` role.

## Role Management
- [ ] Create a role "Consultant" with Workspace = Doctor and a few clinical permissions: it saves and shows the badge.
- [ ] Create a role with Workspace = Standard: no badge.
- [ ] Re-save an existing doctor role from an old open tab (or save only permissions): it stays Doctor.
- [ ] Arabic: the labels read right and the badge shows "مساحة الطبيب".

## Add / edit employee
- [ ] Add Employee: the role list shows the Doctor roles with "(doctor screens)". Picking one shows the doctor sections (schedule, services, commissions) and hides the shift/target box; picking a standard role does the opposite.
- [ ] Changing Department does NOT change the Role, and changing Role does NOT change the Department.
- [ ] Save a new doctor with role `doctor`: no "Role does not exist" error; the doctor appears in Doctors / providers and in New Booking's doctor list.
- [ ] A role containing the letters "doc" that is Standard (e.g. "docsreviewer") does not show the doctor sections.
- [ ] On a database with no doctor-workspace role: the amber hint appears under the role select.
- [ ] Edit an existing doctor, save: still synced to providers.

## Login and routing
- [ ] Log in as a doctor-workspace account (e.g. the two dev doctors): lands on `/doctor` with the doctor sidebar. A "Back to Admin view" button is NOT shown.
- [ ] Log in as a "Consultant" account: same, even though the role name is not "doctor".
- [ ] Log in as a receptionist whose department is "Doctors": lands on the normal reception shell, not the doctor screens.
- [ ] Log in as admin: lands on `/admin`. Visiting `/doctor` is refused as before.

## Switching views (admin and superadmin only)
- [ ] The admin sidebar footer shows "Doctor view" between the profile and Logout. Click it: the doctor screens open for that account (its own schedule), URL unchanged.
- [ ] The doctor sidebar shows "Back to Admin view". Click it: back to the admin shell on the section it left.
- [ ] Reload while in the doctor view: stays in the doctor view. Log out and in as another admin in the same tab: starts in the admin view.
- [ ] Receptionist / HR / doctor accounts never see "Doctor view".

## HR payroll
- [ ] HR -> Payroll lists no employee whose role is a doctor-workspace role; Doctor Payroll still lists them.
- [ ] Run Payroll for a month: no row is created for a doctor-workspace employee.
