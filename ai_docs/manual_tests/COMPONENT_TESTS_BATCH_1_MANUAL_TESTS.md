# Component Tests Batch 1 — Manual Test Checklist

> **Living document.** Update this file with dated dev evidence as each check is run.
> **Environment:** linked dev database / real browser. The automated suite (`tests/components/**`)
> exercises these components with `fetchFake`/`supabaseFake` — a real render but a fake network and
> a fake Supabase client. This checklist covers what those fakes cannot prove: real API wiring, real
> Supabase RLS enforcement with the anon key, and real-clock/timezone behaviour.
>
> Covers: `AdminBookingsView`, `DoctorAccountView`, `UserProfileView`,
> `DoctorProfileDetailsView`, `DoctorOngoingSessionTab`, `Finance/AssetsScreen`,
> `Finance/NewVsReturningScreen` — see `ai_docs/TEST_COVERAGE_INVENTORY.md` module 12 for what the
> automated suite already covers per component.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| | | | | |

## Per-check list

### AdminBookingsView — approve/reject (direct Supabase write, not an API route)

- [ ] As a staff user with a pending booking request, click **Pending** → **Approve** on a request. Confirm the reservation's `status` becomes `approved` in the DB and the booking disappears from the Pending list.
- [ ] Same for **Reject** → confirm `status` becomes `rejected`.
- [ ] With browser devtools open, confirm the approve/reject click does **not** produce a `PATCH /api/reservations` network request — it should be a direct Supabase REST call (`/rest/v1/reservations`), confirming the RISK-019 drift noted in `ai_docs/TEST_COVERAGE_INVENTORY.md` module 12 is real in production, not just in the fake.
- [ ] Approve a booking that is already `completed` (edit its status directly in the DB first). Confirm the UI's Approve button — unlike `PATCH /api/reservations`'s guarded transitions — does not reject this; note whether that is acceptable.

### AdminBookingsView — payment status column

- [ ] Find or create a reservation with `amount_paid` and `amount_left` both null. Confirm the Payment column shows **"—"**, not "Paid" or "Unpaid" (RISK-039 regression check).
- [ ] Confirm a reservation with `amount_paid = 0` shows **"Unpaid"**.
- [ ] Confirm a reservation with `amount_paid > 0` and `amount_left > 0` shows **"Partially Paid"**.
- [ ] Confirm a reservation with `amount_paid > 0` and `amount_left = 0` shows **"Paid"**.

### UserProfileView — payroll figures and the timezone bug

- [ ] **Confirm the machine/browser is set to Africa/Cairo (or any UTC+ timezone) for this check** — the bug does not reproduce in UTC or negative-offset timezones.
- [ ] As a doctor with a `doctor_payroll` row for the current month, open Profile. Confirm whether the displayed **Fixed / Basic Salary** and **Net Salary** reflect that row's `fixed_salary`/`calculated_commission`/`deductions`, or silently fall back to the `providers` row's defaults (the bug: `monthStr` resolves to *last* month in Cairo's timezone, so the current month's `doctor_payroll` row is never matched). See `tests/components/UserProfileView.test.tsx`'s `it.fails` test and the module 12 write-up in `ai_docs/TEST_COVERAGE_INVENTORY.md` for the code-level explanation.
- [ ] If the bug reproduces, this needs a RISK id logged in `ai_docs/RISKS.md` before it's fixed — check whether one was assigned since this checklist was written.
- [ ] As a staff member, confirm **Target Progress** shows revenue from reservations in the current calendar month (Cairo time) — not last month's, not next month's — near the 1st of the month specifically (the boundary the bug affects).

### UserProfileView — password change

- [ ] Attempt a password change with a 5-character password → confirm the inline error and no request sent.
- [ ] Attempt with mismatched confirm field → confirm the inline error.
- [ ] Successfully change password → confirm actual re-login works with the new password (the automated test only asserts the callback was invoked with the right value, not that auth actually accepts it).

### DoctorAccountView — checkout (`handleCompleteTreatment`)

- [ ] As a doctor with an active/started session, add an additional service and a product in the Ongoing Session tab, then click **Complete Treatment**. Confirm: the reservation's `status` becomes `completed`, `amount_left` reflects the full invoice total (base + add-ons) minus whatever was already paid, product stock decremented, and (if a device was used) `inventory_devices.current_pulse_count` incremented.
- [ ] Confirm the success alert appears and the Ongoing Session tab returns to the waiting state.
- [ ] Force a failure (e.g. temporarily revoke the doctor's token) and confirm the error alert shows the server's message, not a generic one, and the reservation is **not** marked completed.

### DoctorProfileDetailsView — CSV export

- [ ] From a doctor's profile (admin view), apply a status filter, then click **Export**. Open the downloaded CSV and confirm it contains only the filtered rows, correctly quoted (patient names/services with commas don't break columns), and the filename is `<Doctor_Name>_Visit_History.csv`.

### Finance/AssetsScreen — depreciation posting

- [ ] Click **Post Depreciation**, enter a period already posted. Confirm it reports 0 posted / N skipped rather than double-posting (the component test only proves the POST payload and the alert copy, not the server's idempotency — cross-check against `ai_docs/manual_tests` for the assets endpoint if one exists, or the finance module in `TEST_COVERAGE_INVENTORY.md`).
- [ ] Delete an asset that has posted depreciation entries. Confirm the server's actual behaviour (refuse / soft-delete / cascade) matches what module 8 of `TEST_COVERAGE_INVENTORY.md` expects.

### Finance/NewVsReturningScreen

- [ ] Switch the Branch filter and confirm the revenue figures actually change to that branch's numbers (not silently showing all-branches data) — the automated test proves the request is sent with the right `branchId`, not that the server honors it.
