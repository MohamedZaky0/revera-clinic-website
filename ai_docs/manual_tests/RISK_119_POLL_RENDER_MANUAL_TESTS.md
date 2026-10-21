# RISK-119 — Polls & Shell Re-Renders No Longer Refetch Or Flash Tables — Manual Test Checklist

> **Living document.** Update with dated evidence as each check is run.
> Full reasoning: `ai_docs/RISKS.md` -> **RISK-119**. Automated coverage: `tests/lib/pollEqual.test.ts` (helper only).
> Everything below needs a real logged-in browser; none of it has been run yet.
> This continues RISK-118: that fix stopped tab switches reloading tables; this one stops the
> shell's own polls and re-renders doing it.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| 2026-10-19 | Section survives reload (RISK-118) | local dev, `feat/brief-36-admin-refresh` @ 8d245bd, superadmin | Click Patients -> URL `?section=Patients`; reload -> still on Patients (an extra `lang=en` from another component is preserved) | Pass |
| 2026-10-19 | Devices tab idle 70 s: repeat requests / spinner | A/B: `dev` @ 9cb86ba (before Brief 36) vs branch | Before: 15 `/api/inventory/devices` requests, spinner reappeared 6x, shell re-rendered 14x. After: 0 devices requests (15 s polls still ran 5x), spinner 0x. Measured with browser resource timing + a React commit hook, not the Profiler | Pass |
| 2026-10-19 | Bookings idle ~40 s: re-renders from the 3 s poll | same A/B | Before: `AdminBookingsView` re-rendered 36x, shell 8x. After (36 s): both 0x, while the 3 s poll kept running (12 ticks per 34 s). A small ~12 KB component (clock-like) renders ~1.7x/s on both | Pass |
| 2026-10-19 | Simulated return to the tab (visibilitychange x3) | branch | One `/api/auth/me` (first re-announcement after >5 min), none for the next two; no customers / inventory / employees refetch. Not a real tab switch, a dispatched event. Baseline showed no `/api/auth/me` either because its last verification was <5 min old, so this is not an A/B for RISK-118 | Pass (weak) |
| 2026-10-19 | Writes: real changes still reach the screen (owner confirmed the DB is test data) | branch, superadmin | New pending booking created through `POST /api/reservations`: visible in Bookings -> Pending after 16.9 s (that list is fed by the shell's 15 s poll, unchanged by this work). `PATCH` status to rejected: gone from Pending after 7.3 s. Both test rows then deleted (0 left) | Pass |
| 2026-10-19 | Devices writes through the UI | branch | Create Device: row visible in 1.3 s, spinner flashes 0, 2 requests (POST + quiet refetch). Update Pulses to 1234: new value visible in 1.3 s, spinner flashes 0. Test device `ZZ_B36_TEST_DEVICE` remains in the test DB: the app has no way to delete a device | Pass |
| 2026-10-19 | Failed polls keep the rows (server unreachable) | branch, superadmin | Pending list showed 2 rows; the dev server was stopped for 45 s (8 failed `/api/*` attempts, at least 2 shell poll ticks): still 2 rows, same badge, nothing blanked. Server restarted, page reloaded, row back with Approve/Reject. Only the shell's `/api` polls were failing in this test; the Bookings view's direct Supabase poll stayed reachable | Pass |
| 2026-10-19 | UI Approve flow | branch | Approve on a pending booking, slot 10:00 and the default doctor, Confirm: row left Pending immediately, DB status `approved` with slot `10:00`, Pending badge 2 -> 1. Test booking deleted afterwards (0 left) | Pass |
| 2026-10-19 | Reset Counter and Edit Device through the UI | branch | Reset Counter: count back to 0 in 1.9 s, spinner flashes 0, success notice. Edit Device (rename): new name visible in 1.8 s, spinner flashes 0, success notice | Pass |
| 2026-10-20 | Doctor portal idle 44 s (via admin sidebar Doctor view) | local dev, `feat/doctor-portal-memo` merged with `dev`, superadmin | 3 s poll kept running (21 `/api/reservations` requests); commits that re-rendered the shell or `DoctorAccountView`: 0. Only a small ticker component (12 KB) re-rendered | Pass |
| 2026-10-20 | Real change reaches the doctor screen; switch both ways | same | New booking (doctorName `saif`) appeared after 8.4 s (poll 3 s plus `?limit=250` responses of 2-5 s on dev; the poll does not wait for the previous request, so slow responses overlap). Test booking deleted. Doctor view -> Back to Admin view -> Doctor view -> Back all worked, session intact | Pass |
| 2026-10-20 | Audit Logs modal: idle, refresh, offline | local dev, superadmin, test DB | Opened with 26 rows; Refresh: 1 request, 0 spinner flashes, rows never below 26; ~33 s idle with 4 shell polls: no extra audit request. Server stopped, Refresh pressed: still 26 rows | Pass |
| 2026-10-20 | Products tab idle 34 s; sell a product | same | No `/api/inventory/products` or `/sales` request while idle. Created a retail product via API, sold 1 through the Sell dialog: history 0 -> 1 with 0 spinner flashes (took 18 s, slow upstream), stock 5 -> 4. Product soft-deleted afterwards; the sale row and its ledger entries remain in the test DB | Pass |
| 2026-10-20 | Loading state where it should be; empty state; branch switch | same | First open of Inventory: loading row shown once, then the table. Devices search with no match: "No clinic devices found", no stuck spinner. Created a second branch to test switching: Bookings data changed (Pending 1 -> none, rows 4 -> 1) but no spinner element was visible there; Devices is not branch-scoped, so no loading row (expected). Branch deleted afterwards | Pass (spinner on Bookings branch switch not observable) |
| 2026-10-20 | Booking details modal through poll ticks; Save Note | same | Modal open ~15 s over several 3 s ticks: same DOM node, identical text, 0 DOM mutations. Edit Note -> Save Note: PATCH, then `fetchRequests` and `fetchAllReservations` both fired; DB `reception_notes` saved | Pass |
| 2026-10-20 | Non-status change from another tab reaches the open table | same | `PATCH amountPaid 40` via API while Bookings was open: row changed Unpaid -> Partially Paid after 6.4 s (poll 3 s plus slow responses) | Pass |
| 2026-10-20 | Reject on the Pending list | same | Row vanished in 0.1 s but the database status stayed `pending_deposit` and the booking was back in Pending after reload. See RISK-122. (Existing behaviour; identical code before Brief 36) | FAIL (RISK-122) |
| 2026-10-20 | HR missing-attendance alert via the 30 s poll | same | `POST /api/hr/alerts`: red banner "Employee reception went missing" appeared on the admin screen within 43 s; Dismiss Alert cleared it (0 left) | Pass |
| 2026-10-20 | New Booking form -> save | same | Filled a new patient, 2 services, 21 Oct 04:15 PM, Confirm & Create: returned to Bookings after 10.6 s (slow upstream) and the new row (Confirmed, EGP 170) was in All Appointments. The booking and the patient record it created were deleted afterwards | Pass |
| 2026-10-20 | Doctor portal: clinical note typing across polls | same, Doctor view | Started a booking for this doctor, typed into the clinical note for 28 s (15 edits, ~9 poll ticks): no resets, same textarea element | Pass |
| 2026-10-20 | Doctor portal: session ended by reception | same | `PATCH status completed`: Schedule tab showed Completed, but the Ongoing Session panel was still showing the patient and note box 30 s later. See RISK-123 | FAIL (RISK-123) |
| 2026-10-21 | RISK-123 fix: session ended by reception (re-test) | local dev, `fix/risk-123-stale-doctor-session`, Doctor view | Started booking: panel opened in 0.3 s and stayed through 14 s of polls. `PATCH status completed`: panel closed in 2.1 s and shows "Waiting for Receptionist to Start Session" | Pass |
| 2026-10-20 | Doctor portal Sign Out | same | Sign out? dialog -> Confirm: landed on `/login`, session key gone, no "unexpected logout" banner | Pass |
| 2026-10-20 | Schedule view refetch after a write (regression list) | code | `calendarView` is only ever set to `Calendar` or `List`; Schedule is unreachable from the UI, so the item does not apply | N/A |
| 2026-10-20 | NOT tested | | Hour-long token rotation and the 1 h idle logout (not reachable in a session), permission changes reaching an open tab (needs a second role), CSV export and print (a download and a print dialog), Reset/Edit/Add device and Approve were tested earlier, Profiler (component names minified; counted by hook count and source size) | Pending |

## Devices tab stays quiet while idle
- [ ] Log in at `/admin`, open Inventory -> Devices, wait for the table to load. Open dev tools -> Network, filter `inventory/devices`. Leave it idle for at least 60 s (covers four 15 s poll ticks): **no repeat request** and **no "Loading" spinner row** in the table.
- [ ] React DevTools Profiler: record 60 s idle on the same screen — the Devices table does not commit again after the first load (poll ticks that found nothing new produce no commits).
- [ ] Open the device Audit Logs modal, refresh it once, leave it open through a poll tick: the log list does not flash its spinner.
- [ ] Products tab -> sales history: same idle check, no repeat `/api/inventory/products/sales` request visible per poll tick.

## Writes still refresh the table (quietly)
- [ ] Add a device: the table updates and shows the new row **without** a full loading-row flash.
- [ ] Edit a device, update its pulse count, reset its pulse counter: each still refreshes the table quietly and shows the change.
- [ ] In Products, sell a product: the sales history list updates without flashing.
- [ ] In the Audit Logs modal, press the refresh icon: new entries appear (the list keeps showing while it refetches).

## Loading state still appears when it should
- [ ] Switch branch while on Inventory -> Devices: the loading row shows and the list is replaced by the new branch's devices.
- [ ] First load of Inventory on a fresh login: loading row shows as before.
- [ ] An empty table (e.g. a branch with no devices) still shows its loading then empty state — not stuck on spinner.

## A failed refetch keeps the rows
- [ ] On Devices, dev tools -> Offline for ~20 s (covers a poll), then online: the device rows never blank out; they update again after reconnect.
- [ ] Same on the Audit Logs modal.

## Poll changes still reach the UI immediately
- [ ] Approve a pending booking from another tab/user (or a second browser): it appears in Bookings within one poll tick — the equality check must not swallow a real change.
- [ ] Create a booking as a patient on the public site: it shows under Pending Approvals on the next poll without a manual reload.
- [ ] Trigger an HR missing-attendance alert; the 30 s poll picks it up.

## Memoized views behave identically
- [ ] Open a booking's details modal, leave it open through a poll tick: no flicker, the modal's contents stay put.
- [ ] While the details modal is open, edit notes and save: still saves and refreshes the lists (`fetchRequests`/`fetchAllReservations` are now useCallback-wrapped — confirm they still fire).
- [ ] On Bookings: approve a booking (openApprove path), reject a booking, export CSV, print — each works as before.
- [ ] Profiler on Bookings: approve one booking — `AdminBookingsView` commits when `allReservations` actually changes, and does not commit on unrelated shell state changes (e.g. opening/closing an unrelated modal).

## The 3 s Bookings / Doctor pollers (Part B2)
- [ ] Bookings screen open and idle 60 s: Profiler shows no `AdminBookingsView` commit caused by a poll tick (the view still commits on real data changes and on its own user interactions).
- [ ] Approve a pending booking: the table updates within one tick — the key-compare must not swallow a real change.
- [ ] Reject a booking, create a booking on the public site, mark a prescription follow-up: each still appears without a manual reload.
- [ ] Local optimistic update check: perform an action that patches a row in place (e.g. set a follow-up date), then let a poll tick pass — the patch is not flickered back to stale server data, and genuinely different server data still replaces it.
- [ ] Doctor account (`/doctor`) idle 60 s: its reservations list does not re-render on identical ticks; a real booking change still appears within ~3 s.
- [ ] Edit a booking's notes / amount paid on another tab while Bookings is open — it appears on the next tick (these keys are in the compare list; confirm a non-status field change is not missed).

## Doctor portal (memoized view; needs a login whose role or department is doctor)
- [ ] Log in as a doctor, open Schedule (or any tab) and leave it idle 60 s. React commit hook / Profiler: `DoctorAccountView` does not re-render on poll ticks that return identical reservations (the 3 s poll still runs).
- [ ] A real change (reception checks a patient in or approves a booking) shows on the doctor's screen within ~3 s.
- [ ] Start a session and type in the clinical note box for 30 s: the text is never reset or overwritten by a poll tick.
- [ ] Logout button in the doctor portal still signs out and lands on `/login` (the shell now calls `handleLogout` through a ref).
- [ ] Open another tab as reception and approve/complete a booking: the doctor's active-session banner appears and disappears correctly.

## Regressions to look for
- [ ] The 15 s poll still runs after an access-token rotation (~1 h in): bookings keep updating, no 401 loop (RISK-053 path — fetchers are now `useCallback`, the poll effect still re-arms on token change).
- [ ] Schedule view (`calendarView === "Schedule"`) still refetches its day's reservations after a booking write (`fetchAllReservations` side-sync).
- [ ] Branch switch still triggers a spinner + fresh data on Bookings and Inventory.
- [ ] New Booking -> save returns to Bookings and shows the booking.
