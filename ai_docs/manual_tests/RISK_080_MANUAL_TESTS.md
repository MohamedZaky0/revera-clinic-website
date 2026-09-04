# RISK-080 Manual Test Checklist — Unauthenticated API Routes Closed

> **Living document.** Update this file with dated dev evidence as each check is run.
> **Environment:** linked dev database first, then repeat the anonymous checks against the
> production deployment once `main` is live. Use a real logged-in session for the authenticated
> checks — a staff (reception) account and an administrator account, separately.
>
> Full reasoning and code pointers are in `ai_docs/RISKS.md` → **RISK-080**. This file is just the
> click-through checklist referenced from there.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| | | | | |

## Per-check list

### Anonymous callers are rejected

Run these with **no** Authorization header — an incognito browser tab, or `curl` with no auth.

- [ ] `GET /api/reservations/previous` returns **401**, and the body contains no `historicalBookings`
      array, no patient `name`, and no `phone` value.
- [ ] `POST /api/reservations/previous` with a valid-looking body (`patientPhone`, `patientName`,
      `date`) returns **401**. Then query `customers` and `reservations` and confirm **no** new row
      was created by that call.
- [ ] `GET /api/health/supabase` returns **401**, and the body contains no `checks` object.
- [ ] Confirm the public site is unaffected: open the booking modal as an anonymous visitor, pick a
      branch and a service, and reach the time-slot step. `GET /api/branches`, `GET /api/services`
      and `GET /api/availability` must all still return 200.

### Reception (staff, non-admin) can still do their job

Log in as a **reception** account.

- [ ] Admin → Bookings → **Add Previous Booking**. Fill in a phone that does **not** exist yet, a
      name, and a past date. Submit. Confirm the success state appears — not a generic error.
- [ ] Confirm in the database that the new `customers` row and the `reservations` row (status
      `completed`, `is_historical` true) were both created.
- [ ] Repeat with a phone that **does** already belong to an existing patient. Confirm the booking
      links to that existing customer and their `number_of_bookings` incremented by 1 — no duplicate
      patient created.
- [ ] Confirm the reception user can **not** reach `GET /api/health/supabase` — it should return
      **403** (administrator-only), not 200.

### Administrator checks

Log in as an **administrator** (or superadmin).

- [ ] Admin → System Test Suite → run **TC-038 (Historical & Previous Bookings Intake Engine)**.
      Confirm it reports **pass**, not a 401.
- [ ] Run **TC-001 (Supabase Database & Auth Health)**. Confirm it reports **pass**, not a 401/403.
- [ ] Call `GET /api/health/supabase` with the administrator token and read the response. Confirm
      each of the three `checks` entries has `present` and `source`, and that **no `valuePreview`
      field appears anywhere** in the body — in particular, no fragment of the service role key.

### Regression — the auth-header helper

- [ ] With the reception account, open the browser devtools Network tab and submit an Add Previous
      Booking. Confirm the request to `/api/reservations/previous` carries an
      `Authorization: Bearer …` header.
- [ ] Log out, then (without logging back in) navigate directly to the Add Previous Booking view if
      it is still reachable, and submit. Confirm the form surfaces an error rather than appearing to
      succeed while saving nothing.

### Known accepted gap — verify it is still only this

- [ ] `GET /api/auth/employee-email?email=<some staff email>` with no auth returns
      `{ "exists": true }`. This is **expected** — it is required by the login flow and is recorded
      as accepted in RISK-080. Confirm it returns only the boolean and **not** the employee's name,
      role, department, or ID.
- [ ] Confirm employee-ID login still works end to end: sign in to `/admin` using an **employee ID**
      (not an email address) plus password.
