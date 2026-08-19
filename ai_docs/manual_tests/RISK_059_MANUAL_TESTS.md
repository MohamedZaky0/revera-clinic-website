# RISK-059 Manual Test Checklist — Reception Shift Auth, Wrong-Employee Fallback, Idempotency

> **Living document.** Update this file with dated dev evidence as each check is run.
> **Environment:** linked dev database. All current data is mock and may be reset. Use a
> `receptionist` bearer token unless a check says otherwise.
>
> Full reasoning and code pointers are in `ai_docs/RISKS.md` → **RISK-059**. This file is just the
> click-through checklist referenced from there.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| 2026-08-19 | Automated route coverage | `tests/routes/reception-dashboard.test.ts` (in-memory fake) | 14/14 tests pass: auth guard (401/403/200), start/end shift happy path, F-3 idempotency (409 on restart-after-end, no-op on restart-while-open), F-2 employee resolution (two-receptionist session scoping, HR override). | PASS |
| 2026-08-19 | `tsc --noEmit` / `eslint` on touched files | local | Clean — 0 type errors, 0 new lint errors (pre-existing warnings elsewhere in `admin/page.tsx` untouched). | PASS |
| | Full admin-UI click-through (see checklist below) | dev, `/admin` | | PENDING |

## Setup

- [ ] Two employee accounts with `role_name = 'receptionist'`, `department = 'Reception'` exist in
      dev (e.g. "Receptionist A" and "Receptionist B"), each with their own login.
- [ ] One HR/admin account exists for the override checks.
- [ ] One doctor (or any non-reception/non-HR role) account exists for the negative auth checks.

## F-1 — Authentication is actually required

- [ ] Open browser dev tools on the Reception Dashboard screen and confirm the `GET
      /api/reception/dashboard` request carries an `Authorization: Bearer <token>` header (this was
      previously missing entirely).
- [ ] Log out (clear the session/local storage) and call `POST /api/reception/dashboard` directly
      (e.g. via curl/Postman) with `{"action":"start_shift"}` and **no** `Authorization` header.
      Confirm **401**, and confirm no new `hr_attendance` row was written.
- [ ] Call the same request with a valid **doctor** token. Confirm **403** and no row written.
- [ ] Log in as Receptionist A in the admin UI. Confirm the Dashboard screen loads normally (no
      silent failure from the new guard) and shows Receptionist A's own name/target/bookings.

## F-2 — Shift actions clock in the right person

- [ ] Log in as Receptionist A. Click **Start Shift**. Confirm `hr_attendance` gets a row for
      Receptionist A's `employee_id` and today's date — not Receptionist B's.
- [ ] In a second browser/incognito session, log in as Receptionist B. Click **Start Shift**.
      Confirm a **separate** `hr_attendance` row is created for Receptionist B, and Receptionist A's
      row from the previous check is untouched.
- [ ] Confirm each receptionist's own dashboard shows their own shift status/elapsed time, not the
      other's.
- [ ] As HR/admin, call `POST /api/reception/dashboard` with an explicit `employeeId` for
      Receptionist A (correcting a missed clock-in on her behalf). Confirm it succeeds and writes to
      Receptionist A's row, demonstrating the manager-override path still works.

## F-3 — Ending a shift is not undone by a stray Start Shift click

- [ ] As Receptionist A, click **Start Shift**, then **End Shift**. Confirm `hr_attendance.
      check_out_time` is set and the dashboard shows shift status "ended".
- [ ] Click **Start Shift** again (simulating a double-click or accidental re-press after the shift
      already ended). Confirm the request is rejected (409, "already ended" message shown or logged
      — the UI may need a follow-up to surface this gracefully) and `check_out_time` on today's row
      is **still set**, not wiped back to null.
- [ ] Confirm tomorrow, a fresh **Start Shift** for the same employee works normally (new date row).
- [ ] Click **End Shift** with no prior **Start Shift** today (fresh employee, no row). Confirm a
      clear error is returned/shown, not a generic failure/500.

## Regression

- [ ] Confirm the Reception Dashboard's booking list, monthly target, and progress bar still render
      correctly for an authenticated receptionist (the `GET` handler's data logic itself was not
      changed, only the queries were repointed at `supabaseServer` and a guard was added in front).
- [ ] Confirm HR's own view of `/api/reception/dashboard?employeeId=<any receptionist>` (if used
      anywhere in the HR screens) still returns that receptionist's data correctly.
