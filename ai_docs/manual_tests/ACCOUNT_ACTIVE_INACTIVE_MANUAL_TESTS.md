# Employee Accounts: Active / Inactive And Admin Delete: Manual Test Checklist

> Reasoning: `ai_docs/DECISIONS.md` -> DEC-117; related: `ai_docs/RISKS.md` -> RISK-124. Automated coverage: `tests/routes/employees-active.test.ts`. The screens have no component test, so the checks below need a person. Use a throwaway account, never a real colleague.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| 2026-10-22 | Toggle switch on a throwaway receptionist, confirm dialog, row dims, badge Inactive, no Resend | dev.reveraclinics.com (superadmin test account) | Browser pane + DB: `is_active=false`, `role_name` still `receptionist`, Auth user banned | Pass |
| 2026-10-22 | Sign in as the inactive account | dev.reveraclinics.com | Login page: "This account is inactive. Contact an administrator to get access back." | Pass |
| 2026-10-22 | Switch it on again, sign in again | dev.reveraclinics.com | No confirm dialog; DB `is_active=true`, ban lifted; login lands on /reception | Pass |
| 2026-10-22 | Delete the throwaway account (hard) | dev.reveraclinics.com | employee row, Auth user and provider row all gone | Pass |
| 2026-10-23 | Throwaway doctor: account switched off with the toggle, then on, then hard delete | dev.reveraclinics.com | `/api/providers`: `active` true -> false (account off) -> true (account on); after hard delete the account and login are gone and the provider row stays with `active = false` | Pass (data level) |
| | Doctor missing from the New Booking doctor list and the website booking after the switch | | Not clicked through (those pickers already filter on `providers.active`); the New Booking section link did not open that screen in my test | Pending |
| | Already-signed-in session cut after being switched off (two browsers), admin (not superadmin) caller, own-row switch disabled, mobile/Arabic | | Not run yet (covered by unit tests only: `employees-active.test.ts`) | Pending |

## Before testing
- [ ] Migration `20261022000000_add_is_active_to_employee_accounts.sql` applied to the database being tested (dev first, production before deploying the code).
- [ ] Two accounts to use: one logged-in **admin**, and one throwaway account (e.g. a receptionist or a second admin) you can also log into from another browser.

## The toggle
- [ ] Employees: every row (not superadmin) has a small switch before the pencil; on = Active. The switch on **your own row** is greyed out.
- [ ] Turn a throwaway account off: a confirmation explains they lose all access and are signed out; confirm. The row dims, the badge reads "Inactive", and the "Resend" button is gone.
- [ ] Turn it back on: no confirmation, badge returns to Active / Invited, nothing else changed (same role, same branch, same salary).
- [ ] Mobile width: the same switch appears on the card with the word Active / Inactive next to it.
- [ ] Arabic: the tooltip and the badge read right.

## "Inactive means no access"
- [ ] Log the throwaway account in on another browser, then switch it off from the admin: within a moment its next click or refresh sends it to /login with "This account has been made inactive...". Nothing loads in the meantime (no data screens).
- [ ] Try to log in as the inactive account: the login page says the account is inactive (Auth ban), never a generic "invalid credentials".
- [ ] Switch it on again: it can log in normally and lands on the same screen as before.
- [ ] (Optional, technical) call any staff API with the inactive account's token: `403` "This account is inactive".

## Who can do what
- [ ] As an admin: switch off, switch on and delete **another admin** account. All work.
- [ ] As an admin you cannot find any superadmin row in Employees (hidden), so none can be switched off or deleted from the screen.
- [ ] Deleting an account from the trash button: admin sees the "delete this account" confirmation and it works; the person is gone from the list and cannot log in.
- [ ] As a receptionist (no admin role) none of this is reachable: the Employees screen or the actions are not available.

## Soft delete (superadmin dialog)
- [ ] As the superadmin, choose "Soft delete" for a throwaway account: it now shows as Inactive with its role intact (before, its role became `inactive`). Switching it on restores it.

## A doctor follows their account (DEC-118)
- [ ] Take a doctor (throwaway) who is bookable: they appear in New Booking's doctor list and on the website booking.
- [ ] Switch their account off in Employees: they disappear from New Booking's doctor list and from the website booking; the Doctors screen shows them as Inactive; existing bookings with them are untouched.
- [ ] Switch the account on again: they are back in both lists and Active on the Doctors screen.
- [ ] Soft delete from the Doctors screen (superadmin): the doctor goes Inactive, their employee account is now Inactive with its role intact (not `inactive`).
- [ ] An admin who is also a doctor (is_also_doctor): switching their account off removes them from the doctor lists too.

## Doctor portal first load (RISK-127)
- 2026-10-21, dev.reveraclinics.com, superadmin Doctor view, reload and sample the numbers every 200 ms for 8 s: all 40 samples read 0 Patients / 0 Sessions from the first one (before the fix the first render read 29 / 26). Pass for the superadmin; not yet seen with a real doctor account that has bookings.
- [ ] Log in as a doctor (or open Doctor view as the superadmin) and reload on the Schedule tab several times: at no moment do you see patients, counts or sessions that are not yours; before your data arrives the numbers are 0 / empty, never someone else's.
- [ ] Patients tab and Analytics tab, same check right after a reload.

