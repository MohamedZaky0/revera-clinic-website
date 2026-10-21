# RISK-127 — Close The Open "Allow All" RLS Policies — Manual Test Checklist

> **Living document.** Update with dated evidence as each check is run.
> Full reasoning: `ai_docs/RISKS.md` -> **RISK-127**. Migration: `supabase/migrations/20261023000000_close_open_rls_policies.sql`. Check tool: `scripts/check-anon-access.mjs`.
> The migration has **not been applied to any database yet**. Apply it to dev first.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| 2026-10-21 | Which tables the browser key can read, before | test database | `scripts/check-anon-access.mjs`: 13 of 64 tables readable (device_maintenance_history 25 rows, employee_accounts 11, hr_attendance 27, hr_leave_requests 5, hr_missing_alerts 1, hr_payroll 3, hr_performance_reviews 1, inventory_devices 3, inventory_products 5, prescriptions 11, product_sales 1, roles 4, terms_and_conditions 9) | Done (finding) |
| 2026-10-21 | Migration logic on a throwaway Postgres (PGlite) with the real baseline policies | local, nothing written to any real database | Before: anon read/insert/update/delete rows on 13 tables. After: closed tables deny everything for anon and authenticated; `employee_accounts` / `hr_attendance` read only; second run changes nothing; ALL-only `hr_attendance` keeps read; RLS-off table is closed; service role unaffected | Pass |
| | Apply to dev, rerun the script | | | Pending |
| | Walk the screens below on dev | | | Pending |
| | Run the script on production | | | Pending |

## Before applying
- [ ] Run the check script against **production** (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` set to production's values). Note which tables are readable; if `reservations`, `customers` or `providers` are readable there, that is the first thing to fix.

## After applying to dev
- [ ] Rerun `node scripts/check-anon-access.mjs`: only `employee_accounts` and `hr_attendance` are listed (kept on purpose for now), plus any non-sensitive table you decided to leave.
- [ ] Using the anon key, an insert, update or delete on `employee_accounts` and `roles` is refused (for example with `curl -X DELETE "<url>/rest/v1/roles?id=eq.<id>"` on a **test** row; it must delete nothing).

## Screens that must keep working (they go through the API / service role, so nothing should change)
- [ ] Prescriptions: the doctor writes one, reception sees it in the patient profile and booking details; follow-up reminders on Bookings show up (within 15 s).
- [ ] Inventory: Devices (add, update pulses, reset, history, audit logs) and Products (add, sell, sales history).
- [ ] HR: payroll, leave requests, performance reviews, missing-attendance alert banner, attendance.
- [ ] Employees and Role Management: create, edit and deactivate an employee, create and edit a role; the doctor/reception/admin logins still land in the right workspace.
- [ ] Terms & Conditions page on the public site and in Settings.
- [ ] Staff profile screen (`UserProfileView`) still shows the employee details and attendance (these two tables stay readable until their reads move to the API).
- [ ] Doctor portal finds its provider record (it reads `employee_accounts` with the browser key).

## Known and accepted change
- [ ] Realtime events for `prescriptions` no longer reach the browser. Confirm the Bookings follow-up list still refreshes within 15 s and right after a prescription is saved.

## Follow-up (not part of this migration)
- [ ] Move the browser reads of `employee_accounts` and `hr_attendance` (`UserProfileView.tsx`, `DoctorAccountView.tsx`) to authenticated API routes, then run the two `DROP POLICY` statements in the migration header and re-run the script: nothing with data should be listed.
