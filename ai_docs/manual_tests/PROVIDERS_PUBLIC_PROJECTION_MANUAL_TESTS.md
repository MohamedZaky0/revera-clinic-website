# RISK-140 — Doctors Endpoint Public Projection — Manual Test Checklist

> **Living document.** Update with dated evidence as each check is run.
> Full reasoning: `ai_docs/RISKS.md` -> **RISK-140**, `ai_docs/DECISIONS.md` -> **DEC-134**. Automated coverage: `tests/routes/providers-public-projection.test.ts`, `tests/components/doctor/useProviderFormToken.test.tsx`, `tests/routes/public-read-caching.test.ts`.
> Use test data only. Replace `BASE` below with the preview or local URL under test (for example `http://localhost:3000`). Never paste a real staff token into a shared note; use `<token>` in the evidence log.
> Status when this file was written: **fixed on dev, not yet on production, not yet checked in a browser.** After deploying, repeat the anonymous checks against production.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| 2026-10-26 | Route and component tests, full suite, `tsc`, `eslint` | local, `fix/providers-public-projection` | all pass | Pass |
| | Anonymous curl (below) | | | Pending |
| | Junk / expired token curl (below) | | | Pending |
| | Staff login: Doctors screen (below) | | | Pending |
| | Public booking popup (below) | | | Pending |
| | Anonymous curl against production after deploy | production | | Pending |

## 1. Anonymous check (no login)
Run: `curl -i BASE/api/providers`
- [ ] Status 200.
- [ ] Each doctor object has exactly these keys and no others: `id`, `name`, `specialty`, `image`, `services`, `rating`, `active`, `branchId`, `workingDaysHours`.
- [ ] The text of the whole response contains none of: `phone`, `email`, `nationalId`, `national_id`, `fixedSalary`, `salary`, `commission`, `serviceCommissions`, `bookings`, `employmentType`, `languages`, `sessionType`, `age`, `gender`, `startDate`. (Quick check: `curl -s BASE/api/providers | grep -i -E "phone|email|national|salary|commission"` prints nothing.)
- [ ] Inside `workingDaysHours` only `branch_ids`, `branch_schedules` (and per day `isOpen`, `start`, `end`, `shifts`) appear; no `email`, no `languages`.
- [ ] On a Vercel preview/production: headers include `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` and `Vary: Authorization`. On `next dev` the header is present but nothing caches it.

## 2. Junk, empty and expired token (must behave like anonymous, never an error)
- [ ] `curl -i -H "Authorization: Bearer junk" BASE/api/providers`: status 200, same public key set as above, `Cache-Control: private, no-store`.
- [ ] `curl -i -H "Authorization: Bearer " BASE/api/providers`: status 200, public key set.
- [ ] Take an old access token (a staff token from a session that has since expired, or one you edited) and send it: status 200, public key set, not 401 and not 500.
- [ ] Log in as a patient (customer, not an employee) on the public site, copy that session's access token from DevTools > Application, and send it: status 200 and the public key set (no salaries).

## 3. Staff login: the Doctors screen shows the full data
1. Sign in to `/admin` with a staff account that can see Doctors.
2. Open DevTools > Network, filter `providers`, hard reload `/admin`.
- [ ] The `GET /api/providers` request has an `Authorization: Bearer ...` header, status 200, response header `Cache-Control: private, no-store`.
- [ ] The response objects include `phone`, `email`, `nationalId`, `fixedSalary`, `commissionType`, `commissionValue`, `serviceCommissions` and `bookings`.
- [ ] Open the Doctors screen: the table shows the same phones, booking counts and specialties as before the change. Open one doctor's profile: salary, commission settings and national id are filled in (not 0 / empty).
- [ ] Edit that doctor, change only the specialty, save. Afterwards the salary and commission fields are unchanged (this guards against saving blanks from a reduced list).
- [ ] Change a doctor's Active status (Change Status), then reload: the list shows the new status and the salary is still filled in.
- [ ] Open Employees > edit an employee who is also a doctor, save: the Doctors screen still lists them with their salary.
- [ ] Doctor payroll and commission screens that use the doctor list still show their amounts.

## 4. Public booking popup still works
- [ ] Signed out, open the public site, open the booking popup, choose a service, a branch and a date: the "Select Doctor (Optional)" list shows only doctors who work that day and offer that service, as before.
- [ ] A doctor set Inactive in the admin appears in the popup exactly as before (the response still carries `active: false` for them; this change did not alter who the popup lists).
- [ ] Complete a test booking with a chosen doctor: the booking saves with that doctor's name.
- [ ] In DevTools the popup's `GET /api/providers` has no `Authorization` header and the response has the public key set.

## 5. Auto-sync now needs a staff session (behaviour change)
- [ ] On a test database, give a test employee a doctor-workspace role directly in the database (or switch a role's workspace to `doctor`) so they have no `providers` row. Load a public page: no new row appears in `providers`. Open `/admin` as staff: the doctor now exists in `providers` and in the Doctors list.

## 6. Other
- [ ] `curl -i -H "Authorization: Bearer <staff token>" BASE/api/providers` from a terminal returns the full response (with `bookings`, `fixedSalary`, ...). After you deactivate that employee account (Employees > Inactive), the same call returns the public key set.
- [ ] Production, after deploy: repeat section 1 and confirm no salary or national id comes back. Tell the owner the endpoint exposed this data before the fix (RISK-140).
