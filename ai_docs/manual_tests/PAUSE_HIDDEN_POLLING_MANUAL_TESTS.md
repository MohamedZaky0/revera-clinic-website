# RISK-136 — Pause Hidden Polling — Manual Test Checklist

> **Living document.** Update with dated evidence as each check is run.
> Full reasoning: `ai_docs/RISKS.md` -> **RISK-136**, `ai_docs/DECISIONS.md` -> **DEC-130**.
> Automated coverage: `tests/components/visiblePoll.test.tsx`, `tests/lib/adminDirectory.test.ts`, `tests/lib/pausedPollingWiring.test.ts`, `tests/components/doctor/DoctorAccountView.test.tsx`.
> Use a test or staging environment and test accounts only. Do not run this against production data you cannot afford to touch (the checks only read).

## How to count requests for one idle tab (before / after)

1. Open the admin in a normal browser window, sign in, wait for the first load to finish.
2. Open the dev tools Network tab. Tick "Preserve log". In the filter box type `/api/` and, when a check says so, narrower text such as `reservations`, `hr/alerts`, `roles`, `employees`.
3. Click the clear (circle with a line) button, then leave the tab alone, **visible and in front**, for exactly 2 minutes with a stopwatch. Do not click anything.
4. Read the request count at the bottom of the Network tab ("N requests"). Divide by 2 to get requests per minute.
5. For a hidden tab: clear the log, switch to another browser tab (or another window that fully covers it) for exactly 2 minutes, switch back. Note the count that arrived while you were away (rows whose timestamp, if you enable the Waterfall or Time column, is inside the away period) and the count that arrives in the first 2 seconds after you return.
6. To compare with the old behaviour, repeat on `origin/dev` before this change (or on production, read only) and write both numbers in the evidence table.

Expected numbers (estimates from the code; the measured values go in the table):

| Tab | Before (per min) | After (per min) |
|---|---|---|
| Admin or superadmin, visible, idle | about 10 (8 reservations + 2 hr/alerts) | about 10 |
| Admin, hidden | about 10 | 0 |
| Doctor account, visible, idle | about 28 | about 4 |
| Doctor account, hidden | about 8 | 0 |
| Reception, visible, idle | about 8 | about 8 |

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| 2026-10-25 | Unit tests: poll helper, directory loader, wiring, doctor cadence | local, `perf/pause-hidden-polling`, Vitest | all pass | Pass |
| | Admin tab visible, idle 2 min (below) | | | Pending |
| | Admin tab hidden 2 min (below) | | | Pending |
| | Doctor account visible and hidden (below) | | | Pending |
| | Reception account: roles/employees requests (below) | | | Pending |

## Admin / superadmin, visible
- [ ] Idle for 2 minutes: `reservations` requests come in pairs about every 15 s (one with `status=pending`, one without), `hr/alerts` about every 30 s. Total about 20 requests for the 2 minutes.
- [ ] No `/api/roles` or `/api/employees` requests during the idle period (they load once after login and again only when you open Employees, Role Management or Profile).
- [ ] New website booking request created by someone else still appears under Pending Approvals within about 15 s.

## Admin / superadmin, hidden tab
- [ ] Switch to another tab for 2 minutes: **no** `reservations` and **no** `hr/alerts` requests are made while away.
- [ ] Switch back after more than 30 s: within about 1 s one `reservations?status=pending...`, one `reservations?branchId=...` and one `hr/alerts` request fire, the screen shows current data, and the 15 s / 30 s rhythm resumes.
- [ ] Switch away and back within about 5 s: no extra request fires (data is still fresh).
- [ ] Leave the tab hidden for 10 minutes: still no requests; the browser's task manager shows no network activity for it.

## Missing-attendance alerts (admin / HR)
- [ ] With a test employee who triggered an inactivity alert, the red alert banner appears for an admin who has the tab visible within about 30 s, and appears immediately after switching back to a tab that was hidden for a while.

## Doctor account
- [ ] Sign in as a doctor, stay on the Schedule, idle and visible for 2 minutes: about 8 requests to `/api/reservations` (one every 15 s), and **none** of the shell's `reservations?status=pending&branchId=...` pair.
- [ ] The `/api/reservations` request has no `limit` parameter.
- [ ] Hidden for 2 minutes: no `reservations` requests; one request when the tab is shown again.
- [ ] Reception starts a session for this doctor: the doctor's screen picks it up within about 15 s (it used to be 3 s); the doctor's own Start / Complete actions refresh at once.
- [ ] Superadmin who is also a doctor: switch to Doctor view, wait 30 s: no `reservations?status=pending...` pair. Switch back to the admin view: the pair fires once at once and the Pending Approvals and Bookings lists are current.

## Reception and other non-admin roles
- [ ] Sign in as reception. Network filter `roles|employees`: **zero** requests after login, and zero when clicking through Dashboard, Bookings, Patients, Profile.
- [ ] No 403 rows in the Network tab for `/api/roles` or `/api/employees`.
- [ ] The screens reception uses still load (bookings, patients, schedule).

## Admin: lists still load
- [ ] Sign in as admin or superadmin: `/api/roles` and `/api/employees` are requested once each after login; Employees and Role Management show their data.
- [ ] Add or edit an employee: the list refreshes afterwards (one new `/api/employees` request).
- [ ] If a request returns 500 (stop the server for a moment): one retry about 2 s later, then an error in the console, no endless loop. A 403 is never retried.
