# Employee Creation — Role Guard & Doctor Sync Manual Test Checklist

> **Living document.** Update this file with dated dev evidence as each check is run.
> **Environment:** linked dev database. You need **two** logged-in accounts — one `admin` (not
> superadmin) and one `superadmin` — because the whole point is that they can do different things.
> Several checks must be run as a **direct API call**, not through the UI: the bug being guarded
> against is precisely that the UI hides an option the server used to allow.
>
> Reasoning and code pointers are in `ai_docs/RISKS.md` → **RISK-085**.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| | | | | |

## Per-check list

### The escalation is closed (must be tested via the API, not the UI)

Get an `admin` account's bearer token from devtools, then `POST /api/employees` directly.

- [ ] Body `{"email":"esc1@test.local","name":"Esc","roleName":"superadmin","password":"Aa1!aaaa"}`
      with the **admin** token returns **403** with "Only the superadmin can grant admin or
      superadmin access."
- [ ] Confirm nothing was created: no `employee_accounts` row for that email, and no user in
      Supabase → Authentication → Users.
- [ ] Repeat with `"roleName":"admin"` — same 403, nothing created.
- [ ] Repeat with `"roleName":"SuperAdmin"` (mixed case) — still 403. The guard is case-insensitive;
      a differently-cased role name must not slip past it.
- [ ] Repeat all three with a **superadmin** token: `admin` should succeed (**201**).

### Ordinary hiring still works

- [ ] As **admin**, add a receptionist through the UI with a password. Confirm 201, the roster shows
      **Active** (not Invited), and the person can sign in immediately with that password.
- [ ] As **admin**, confirm the role dropdown still offers every operational role and only hides
      `admin`/`superadmin`.
- [ ] As **superadmin**, confirm the dropdown offers `admin` and `superadmin` too.
- [ ] Edit an existing employee's role as **admin** — confirm operational roles still save, and that
      changing someone to `admin`/`superadmin` is still refused (this is the PATCH half, RISK-069,
      which must not have regressed).

### Doctor creation — the name collision

- [ ] Note an existing doctor's commission setup (type, value, fixed salary, services, branch).
      Record the numbers.
- [ ] Add a **new** employee with department `Doctors`, **the exact same full name**, but a
      different national ID and phone.
- [ ] Confirm the response is 201 and that **two** provider rows now exist with that name.
- [ ] Re-check the original doctor's commission type, value, fixed salary, services and branch —
      every one must be **unchanged**. (Before the fix, the new hire's values overwrote them.)
- [ ] Confirm both doctors appear separately in Admin → Doctors and in the booking flow.

### Doctor creation — same person, matched correctly

- [ ] Take an existing provider row and note its `national_id`.
- [ ] Add an employee with department `Doctors` using **that same national ID** and a new salary.
- [ ] Confirm **no** second provider row was created and the existing row's `fixed_salary` updated
      to the new value.

### Doctor creation — ambiguity is refused, not swallowed

- [ ] Deliberately create two provider rows sharing one `national_id` (insert directly in Supabase).
- [ ] Add an employee with department `Doctors` using that national ID.
- [ ] Confirm the request fails with an error naming the duplicate — **not** a silent 201.
- [ ] Confirm the rollback was complete: **no** `employee_accounts` row for that email, and **no**
      leftover user in Supabase → Authentication → Users. This is the important half — before the
      fix this path returned success and left a doctor who could never be booked.
- [ ] Clean up the duplicate provider rows afterwards.

### Doctor creation — the ordinary paths

- [ ] Add a doctor with **no** national ID and **no** phone. Confirm 201 and that a provider row was
      created (matching has nothing to match on, so it must insert, not fail).
- [ ] Add a **receptionist**. Confirm 201 and that **no** provider row was created.
- [ ] Confirm a newly created doctor is immediately selectable in the public booking flow and in
      Admin → Bookings → New Booking.
