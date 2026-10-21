# RISK-126 — Bookings And Doctor Polls: No Browser Table Reads, One Request At A Time — Manual Test Checklist

> **Living document.** Update with dated evidence as each check is run.
> Full reasoning: `ai_docs/RISKS.md` -> **RISK-126**. Automated coverage: `tests/components/bookings/AdminBookingsView.test.tsx` (follow-up reminders poll) and `tests/components/doctor/DoctorAccountView.test.tsx` (reservations poll).
> Use test data only. "Network" below means the browser dev tools, or `performance.getEntriesByType('resource')` in the console.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| 2026-10-21 | Bookings screen: no direct Supabase requests; prescriptions cadence | local dev, `fix/bookings-poll-3s`, superadmin, test DB | 64 s window: `/api/prescriptions` at 0, 15, 30, 45, 60 s; 0 requests to `*.supabase.co`; no visibility events | Pass |
| 2026-10-21 | Doctor portal poll, no stacking | same, Doctor view | 54 s window: reservations request every 3 s (18), durations 260-2448 ms, never more than 1 in flight | Pass |
| 2026-10-21 | Real changes still reach the doctor | same | Started booking opened Ongoing Session in 1.0 s; completion closed it in 3.0 s; test data deleted | Pass |
| 2026-10-21 | NOT tested | | A genuinely hidden browser tab (the pane cannot hide itself on demand; covered by unit tests), a production database with row-level security off on `reservations` | Pending |

## Bookings screen
- [ ] Open Bookings, Network filtered to `supabase.co`: **no** requests at all while it sits open for a minute.
- [ ] `GET /api/prescriptions` runs once on load and then about every 15 s (not every 3 s).
- [ ] Switch to another browser tab for a minute and back: no requests while away, and one refresh right after you return.
- [ ] A patient's follow-up appointment (prescription with a follow-up date) still appears in the reminders; a new one appears within ~15 s or right away when it is saved.
- [ ] A new booking from the public site shows under Pending Approvals within the shell's 15 s poll; approving, rejecting and creating bookings still behave as in RISK-122/125.
- [ ] Bookings, calendar and the doctor/service filters list the same doctors as before (they now come from the props only).

## Doctor portal
- [ ] With the Doctor view open, a reservations request starts about every 3 s; when a response is slow (throttle the network), the next tick waits instead of stacking: never two reservations requests at once.
- [ ] Hidden tab: no reservations requests while hidden; one immediately on return.
- [ ] Reception starts a session for this doctor: the Ongoing Session panel opens within a few seconds; completing it closes the panel (RISK-123).

## Production check (needs the production anon key, run by the owner)
- [ ] Run `curl -s "<prod url>/rest/v1/reservations?select=id&limit=1" -H "apikey: <anon key>" -H "Authorization: Bearer <anon key>"`. It should return `[]`. If it returns rows, row-level security is off on production and that is a patient-data exposure to fix first.
