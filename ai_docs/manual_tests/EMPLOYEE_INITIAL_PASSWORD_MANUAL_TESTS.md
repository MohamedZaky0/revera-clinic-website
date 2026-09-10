# Employee Initial Password — Manual Test Checklist

> **Living document.** Update this file with dated dev evidence as each check is run.
> **Environment:** run against dev first. The production repeat matters here — the whole point of
> this change is that production SMTP is unreliable, so "works on dev" proves little on its own.
>
> Full reasoning and code pointers are in `ai_docs/RISKS.md` → **RISK-083**. This file is just the
> click-through checklist referenced from there.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| | | | | |

## Per-check list

### Password path — the new behaviour

- [ ] Admin → Employees → **Add Employee**. Confirm an **Initial Password** field appears under the
      name/email row, with the hint explaining that leaving it blank sends an invite instead.
- [ ] Fill name, email, role, and a strong password (e.g. `Clinic#2026x`). Save.
- [ ] Confirm the new row appears in the roster with a green **Active** badge — **not** amber
      *Invited*. This is the headline behaviour: no email round-trip.
- [ ] Query the database: `select email_confirmed_at from auth.users where email = '<the email>'`.
      Confirm it is **not null**.
- [ ] Sign out. Sign in at `/admin` as that new employee using the exact password entered. Confirm
      the login succeeds and lands on the dashboard — no "Invalid Login Credentials".
- [ ] Confirm the signed-in employee sees only what their role allows (e.g. add them as
      `receptionist` and confirm no Finance/HR access).

### The employee changes their own password

- [ ] Still signed in as the new employee, go to Profile → Password. Change the password.
- [ ] Sign out, sign in with the **new** password. Confirm success.
- [ ] Sign in with the **old** admin-set password. Confirm it is now rejected.

### Password strength is enforced on both sides

- [ ] In Add Employee, enter a weak password (`12345678`) and save. Confirm the form blocks it with
      the strength message and **no** request is sent (check the Network tab — no POST).
- [ ] Bypass the UI: `POST /api/employees` with a staff-admin bearer token and
      `{"email":"...","name":"...","roleName":"...","password":"12345678"}`. Confirm a **400** with
      `field: "password"`, and confirm **no** `auth.users` row and **no** `employee_accounts` row
      were created for that email.
- [ ] Confirm the accepted rule matches `/auth/setup`: 8+ chars, upper, lower, digit, symbol.

### Invite path — must still work unchanged

- [ ] Add an employee and leave **Initial Password blank**. Save.
- [ ] Confirm the roster shows the amber **Invited** badge, and `auth.users.email_confirmed_at` is
      `null` for that address.
- [ ] Confirm the invitation email arrives (this is the step that fails without custom SMTP — if it
      does not arrive, record that as the SMTP gap, not as a regression in this change).
- [ ] Open the emailed link, set a password at `/auth/setup`, and confirm the badge flips to
      **Active** and login works.
- [ ] Confirm **Resend invite** still appears for rows in the Invited state and still sends.

### Rollback and duplicate safety

- [ ] Add an employee with a password using an email that **already exists** in
      `employee_accounts`. Confirm a clear "already exists" error and that the existing account is
      untouched (role, password, and `auth_user_id` unchanged).
- [ ] Add an employee with a password using an email that exists in `customers`. Confirm it is
      rejected with the customer-account message.
- [ ] Force the `employee_accounts` insert to fail (e.g. a role that is deleted mid-request) and
      confirm the just-created `auth.users` row is deleted too — no orphaned auth user is left
      behind. This is the failure mode that produced the broken `saif@superadmin.com` account.

### Form hygiene

- [ ] Add an employee with a password, save, then click **Add Employee** again. Confirm the password
      field is **empty** — the previous hire's password must not persist into the next form.
- [ ] Open **Edit** on an existing employee. Confirm the Initial Password field is **not** shown
      (it only applies at creation).

### Arabic

- [ ] Switch the admin panel to Arabic. Confirm the Initial Password label, placeholder, hint, and
      the strength error are all translated and read correctly right-to-left.

---

## Section 2 — Legacy role labels resolve to the right sidebar screens (RISK-084)

> Added 2026-09-05 after a production report: an account on the `admin` role saw only Bookings,
> Services, Settings and Logout. See `ai_docs/RISKS.md` → **RISK-084**.

### Reproduce the original fault (do this first, on a role you can throw away)

- [ ] In Role Management create a role whose permissions are exactly the five legacy labels:
      `Bookings`, `Customers`, `Providers`, `Services`, `Settings`.
- [ ] Assign it to a test employee and sign in as them.
- [ ] **Before the fix** the sidebar shows only Bookings, Services, Settings, Logout — Patients and
      Doctors are missing even though `Customers` and `Providers` are granted.

### Confirm the fix

- [ ] With the same legacy role, confirm the sidebar now also shows **Patients** and **Doctors**.
- [ ] Open both screens and confirm they load rather than bouncing to another tab.
- [ ] Confirm the still-ungranted screens stay hidden — Inventory, Employees, HR, Transactions,
      Reports, Finance, Marketing, Customer Support, Dashboard. The fix must widen exactly two
      screens, not open everything.

### Confirm nothing else regressed

- [ ] A role with modern granular keys only (e.g. `customers.view`, `providers.edit`) still sees
      Patients and Doctors, exactly as before.
- [ ] A role with **neither** `Customers`/`customers` nor any `customers.*` key does **not** see
      Patients. Same for Doctors/providers.
- [ ] `superadmin` still sees every screen.
- [ ] A receptionist-style role sees only its own screens — no Finance, no HR.
- [ ] Sign in as a role with no permissions at all and confirm the app lands somewhere sane
      (first permitted item / Logout) rather than a blank screen.

### The proper cure for the data

- [ ] Open Role Management → `admin` → re-tick the intended permissions and save. Confirm the role's
      stored `permissions` now contain granular dotted keys, not the legacy coarse labels.
- [ ] Re-check that account's sidebar reflects exactly what was ticked.
