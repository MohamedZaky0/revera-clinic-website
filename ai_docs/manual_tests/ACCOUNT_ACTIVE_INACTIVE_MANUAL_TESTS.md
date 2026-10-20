# Employee Accounts: Active / Inactive And Admin Delete: Manual Test Checklist

> Reasoning: `ai_docs/DECISIONS.md` -> DEC-117; related: `ai_docs/RISKS.md` -> RISK-124. Automated coverage: `tests/routes/employees-active.test.ts`. The screens have no component test, so the checks below need a person. Use a throwaway account, never a real colleague.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| 2026-10-22 | Toggle switch on a throwaway receptionist, confirm dialog, row dims, badge Inactive, no Resend | dev.reveraclinics.com (superadmin test account) | Browser pane + DB: `is_active=false`, `role_name` still `receptionist`, Auth user banned | Pass |
| 2026-10-22 | Sign in as the inactive account | dev.reveraclinics.com | Login page: "This account is inactive. Contact an administrator to get access back." | Pass |
| 2026-10-22 | Switch it on again, sign in again | dev.reveraclinics.com | No confirm dialog; DB `is_active=true`, ban lifted; login lands on /reception | Pass |
| 2026-10-22 | Delete the throwaway account (hard) | dev.reveraclinics.com | employee row, Auth user and provider row all gone | Pass |
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
