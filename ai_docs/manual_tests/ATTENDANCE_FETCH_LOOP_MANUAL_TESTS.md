# RISK-135 — Doctors > Attendance Fetch Loop — Manual Test Checklist

> **Living document.** Update with dated evidence as each check is run.
> Full reasoning: `ai_docs/RISKS.md` -> **RISK-135**. Automated coverage: `tests/components/doctor/useProviderFormAttendance.test.tsx` (hook mounted with a mocked `fetch`).
> Use test data only. "Network" below means the browser dev tools, filtered to `provider-attendance`.
> Who can reach the Attendance tab: only staff whose role has `providers.attendance` but **not** `providers.view` (the permission effect switches them to it). Superadmin and ordinary doctor-list roles never see it, so use a test role set up that way.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| 2026-10-25 | Hook test suite against the fixed code | local, `fix/attendance-fetch-loop`, Vitest | 7 of 7 pass | Pass |
| 2026-10-25 | Same suite against the old hook | local, same branch, old file restored temporarily | 6 of 7 fail (the request count never settles) | Fails as expected |
| | Network check in a real browser (below) | | | Pending |

## Open and idle
- [ ] Sign in as a test user whose role has Attendance but not Doctors view, open Doctors. Network shows **one** `GET /api/provider-attendance?date=<today>` on open.
- [ ] Leave the page idle for a full minute: no further `provider-attendance` requests.
- [ ] Navigate to another admin screen and wait a minute: still no further `provider-attendance` requests.

## Date change
- [ ] Change the selected date (if the date control is reachable): exactly one new request with `date=<new date>`, then idle again.

## Save still refreshes
- [ ] Mark a provider Present / Absent / On Leave: one `POST /api/provider-attendance`, then one `GET` right after it. The row shows the new status.
- [ ] Mark two providers quickly one after the other: the final screen shows both saved statuses (no stale row left behind).

## Does not break
- [ ] Superadmin: Doctors screen loads and works as before, and no `provider-attendance` requests are made at all.
- [ ] A failed `GET` (turn the network off and reload the tab) logs one console error and does not keep retrying.
