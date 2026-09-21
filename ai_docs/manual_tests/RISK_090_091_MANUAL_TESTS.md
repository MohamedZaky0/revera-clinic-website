# RISK-090 / RISK-091 Manual Test Checklist — `GET /api/customers/packages` Auth + `customerId` Param

> **Living document.** Update this file with dated dev evidence as each check is run.
> **Environment:** linked dev database. Use a real logged-in staff session (e.g. a `superadmin` or
> `reception` account) for every authenticated check below.
>
> Full reasoning and code pointers are in `ai_docs/RISKS.md` → **RISK-090** (no auth) and
> **RISK-091** (`?customerId=` was ignored, so every UI lookup silently 400'd). This file is just the
> click-through checklist referenced from there.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| 2026-09-21 | Unauthenticated calls are rejected | Local dev (`localhost:3000`), dev DB, `finance-test@revera.com` | Fetch with **no** `Authorization` header: `?customer_id=<uuid>` → 401, `?mobile=<phone>` → 401, no params → 401. | PASS |
| 2026-09-21 | Staff calls still work, both param spellings | same | Staff bearer token: `?customer_id=<uuid>` → 200, `?customerId=<uuid>` → 200 (was 400 before RISK-091), no params → 400. | PASS |
| 2026-09-21 | Real package data returned | same | **Not run** — none of the 14 dev customers has any `customer_packages` rows, so both spellings returned `[]`. Needs a sold package first (see the outstanding end-to-end section). | NOT RUN |

## Per-check list

### Authentication (RISK-090)

- [x] With no token, `GET /api/customers/packages?customer_id=<a real customer uuid>` returns **401** and no package data.
- [x] With no token, `GET /api/customers/packages?mobile=<a real patient phone>` returns **401** (this is the "anyone can look up any phone" vector).
- [x] With no token and no params, it returns **401** (not a 400 that reveals the route's shape).
- [ ] Log in as a **patient** account (a Supabase user with no `employee_accounts` row), take its token, and call the route — expect **403**.
- [x] With a staff token, the same requests return **200**.

### Callers still work with the auth requirement (RISK-090)

- [ ] **New Booking** (`AdminNewBookingView`): pick a patient who has a package, confirm the package/pulse-balance badge still appears. (This screen previously sent **no** token; it now sends the session token. Network tab: the `/api/customers/packages` request carries an `Authorization` header and returns 200.)
- [ ] **Doctor portal → Ongoing session**: open an active session for a patient with a pulses package, confirm the package selector still populates.
- [ ] **Booking details modal / Checkout**: open a booking for a patient with a package and confirm nothing regressed (no new console 401s).

### `customerId` param (RISK-091)

- [x] `GET /api/customers/packages?customerId=<uuid>` (camelCase, as the UI sends it) returns **200**, not 400.
- [ ] Network tab, **Booking details modal → complete a package-paid laser session**: the lookup request `/api/customers/packages?customerId=…` returns 200 and is followed by `PATCH /api/customers/packages` (`consume_package_pulses`).

### Outstanding: the two reported end-to-end issues (NOT yet re-verified)

RISK-091 is a strong candidate root cause for both, but neither has been reproduced/re-tested through the UI, and the dev DB currently has no patient with a package. Run these before closing either issue:

- [ ] **Issue 1 — package purchased during booking/checkout must appear under the patient's Purchased Packages.** New Booking → patient with no laser package → 3rd payment option (Pay via Package) → buy a new package in the prompt → complete booking + payment. Open that patient's profile → the package is listed under **Purchased Packages**. Repeat the purchase from the **Checkout** screen.
- [ ] **Issue 2 — pulses used in a package-paid session must be deducted.** Patient with an active pulses package (e.g. 10,000). New Booking, laser service, **Pay via Package**. Run a session using 2,500 pulses and complete it. The package's remaining balance is **7,500** in the patient's profile (and in `GET /api/customers/packages`).
- [ ] Confirm the deduction happens **once** — completing/refreshing the session again does not deduct a second time.
