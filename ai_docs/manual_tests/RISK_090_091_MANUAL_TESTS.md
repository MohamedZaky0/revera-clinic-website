# RISK-090 / 091 / 092 / 093 Manual Test Checklist — Package Lookup Auth, `customerId`, Package Sale, New Booking Purchase

> Covers RISK-090 (no auth on `GET /api/customers/packages`), RISK-091 (`?customerId=` ignored), RISK-092
> (`/api/packages/sell` invoice status 500) and RISK-093 (New Booking billed for an unsold package).
>
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
| 2026-09-21 | Issue 1 repro (before fix) — new patient buys a package in New Booking | Local dev, dev DB, test patient `ZZTEST` (01099990001) | Laser Hair Removal → Option 3 → `pulses v2` (10,000 pulses, 1,000 EGP) → confirm. Console: `POST /api/customers` **401**, `POST /api/packages/sell` **404**. Booking was still created: `amountPaid` 1000, note "Purchasing New Pulses Package", patient created, **0 packages**, no error shown. | REPRODUCED |
| 2026-09-21 | Same flow after the auth-token fix | `ZZTEST2` (…0002) | `POST /api/customers` **201**, but `POST /api/packages/sell` **500**: `invoices_status_check` violated (route wrote `paid`). New guard fired correctly: alert "package could not be added … booking was not created and nothing was charged", nothing billed. | REPRODUCED (2nd cause) |
| 2026-09-21 | Same flow after the invoice-status fix | `ZZTEST3` (…0003) | Sale 201, booking created, note has `[Customer Package ID]`. Patient package: `pulses v2`, total 10,000, remaining 10,000, used 0, active, paid 1,000; patient `spent` 1,000. | PASS |
| 2026-09-21 | Issue 2 — session on the just-bought package | `ZZTEST3` | Check In → Start Session → End Session, Delivered Pulses **2,500**: package **10,000 → 7,500**, history `2500→7500`, booking completed, 0 outstanding. | PASS |
| 2026-09-21 | Issue 2 — existing package, new "Pay via Package" booking (the reported scenario) | `ZZTEST3` | Booking note `[Laser Package Redemption]: pulses v2 (7,500 pulses remaining)` (no Customer Package ID, so completion must use the `?customerId=` lookup). Session with **2,500** pulses: **7,500 → 5,000**, history `2500→5000`, `2500→7500` (deducted once per session), booking completed, 0 EGP charged. | PASS |
| 2026-09-21 | Issue 1 — EXISTING patient with no package buys a package in New Booking | `ZZTEST4` (…0004), driven by a Haiku subagent, then re-checked directly against the API by the lead | Step 1: plain Option 1 booking created the patient (0 packages). Step 2: same phone → "Patient found", Option 3, `pulses v2` (1,000 EGP): `POST /api/packages/sell` **201**, **no** new `POST /api/customers`. API: one package `pulses v2`, total 10,000 / remaining 10,000 / used 0 / active / paid 1,000; booking approved, paid 1,000, note has `[Customer Package ID]`. Only ZZTEST4 was created. | PASS |

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
- [x] **Booking details modal → complete a package-paid laser session** for a patient who already holds a package: the balance is deducted. — Verified 2026-09-21 (7,500 → 5,000), see Evidence log.

### The two reported end-to-end issues

- [x] **Issue 1 — a package bought during New Booking appears under the patient's Purchased Packages.** Brand-new patient → Option 3 → buy `pulses v2` → confirm; the package is listed (10,000 / active / 1,000 paid) and the booking note carries its ID. — Verified 2026-09-21 after RISK-092/093 (the original cause was those two, **not** the `customerId` param).
- [x] **Issue 1, existing patient** (has a patient record but no package): same flow, the package is credited. — Verified 2026-09-21 (`ZZTEST4`), no extra `POST /api/customers`, see Evidence log.
- [ ] **Issue 1, Checkout variant — doctor portal.** In the doctor session screen, switch a no-package patient to Option 3, pick a package to buy, end the session, confirm the package appears in the profile. Needs a doctor login; not run. It uses the same `/api/packages/sell` route fixed in RISK-092.
- [x] **Issue 2 — pulses used in a package-paid session are deducted.** Patient with an active package, "Pay via Package", session with 2,500 pulses → balance drops by exactly 2,500. — Verified 2026-09-21 (10,000 → 7,500, then 7,500 → 5,000).
- [x] The deduction happens **once**: each session added exactly one history entry.
- [x] Public-site patient booking that buys a package: **N/A** — the public flow (`src/components/BookingModal.tsx`) contains no package code at all, so there is nothing to test.

### Test data left in the dev database (2026-09-21)

The four test patients (`ZZTEST`, `ZZTEST2`, `ZZTEST3`, `ZZTEST4` PulsePatient — phones 01099990001/2/3/4) were **deactivated** (soft delete) and all 5 test reservations were deleted by exact ID. Not removable through the API (ledger rows): the invoice(s) written by the package sale and by the two session checkouts, with their invoice lines and payments (the single 1,000 EGP package payment) — exact row counts not checked, the matching `transactions` rows, the `ZZTEST3` `customer_packages` row (`pulses v2`, now 5,000 remaining) with its pulse-usage history and the `ZZTEST4` `customer_packages` row (`pulses v2`, 10,000 remaining, 1,000 EGP paid), and a `customer_package_pulses` entry in `page_settings`. Remove them in Supabase if a clean dev DB is wanted.
