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
| 2026-10-19 | NOT tested | | Network-offline behaviour (keep rows on failed poll), writes (approve/create booking, add/edit device, reset pulses) because the database may hold real data, Doctor portal poll, Profiler component names (bundle names are minified; components identified by hook count and source size) | Pending |

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

## Regressions to look for
- [ ] The 15 s poll still runs after an access-token rotation (~1 h in): bookings keep updating, no 401 loop (RISK-053 path — fetchers are now `useCallback`, the poll effect still re-arms on token change).
- [ ] Schedule view (`calendarView === "Schedule"`) still refetches its day's reservations after a booking write (`fetchAllReservations` side-sync).
- [ ] Branch switch still triggers a spinner + fresh data on Bookings and Inventory.
- [ ] New Booking -> save returns to Bookings and shows the booking.
