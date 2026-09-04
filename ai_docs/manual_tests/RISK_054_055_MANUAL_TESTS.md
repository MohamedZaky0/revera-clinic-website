# RISK-054 / RISK-055 Manual Test Checklist — Booking Status Leak & Stale Session Poll

> **Living document.** Update this file with dated dev evidence as each check is run.
> **Environment:** live `dev.reveraclinics.com` admin panel, real staff login (not a mock/local
> build). Both bugs only reproduce against the actual running app with a real Supabase session —
> neither is catchable by `tsc`/`eslint`/unit tests.
>
> Full reasoning and code pointers are in `ai_docs/RISKS.md` → **RISK-054** and **RISK-055**. This
> file is just the click-through checklist referenced from there.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| 2026-08-16 | RISK-055: reservations polling 401 loop | dev (live network tab) | `GET /api/reservations?status=pending&branchId=...` and `?branchId=...` returned a continuous stream of `401 {"error":"Invalid or expired session."}`, including immediately after a full page reload. | CONFIRMED (bug) |
| 2026-08-16 | RISK-055: token in `localStorage` was actually valid | dev (in-page `fetch` using the live `sb-*-auth-token` from `localStorage`) | Same URL, same instant, manually attached token → `200` with the real reservation data (including the RISK-053 test booking). Proves the failure was a stale closure, not an actually-expired session. | CONFIRMED (root cause) |
| 2026-08-16 | RISK-054: status leak reproduced | dev (Bookings → Today's Schedule → open the in-progress booking) | Modal badge read `IN_PROGRESS`; "Other Actions" panel still showed Postpone/Cancel/No Show for a session the doctor had already started. Raw API status for the same reservation was `started`. | CONFIRMED (bug) |
| 2026-08-16 | Both fixes applied, `tsc --noEmit` clean | dev repo | `npx tsc --noEmit -p .` produced no errors touching `src/app/admin/page.tsx`. | PASS |
| 2026-08-16 | Both fixes applied, `eslint` clean | dev repo | `npx eslint src/app/admin/page.tsx` — 0 errors, only pre-existing unrelated warnings (unused vars, `<img>` LCP hints). | PASS |
| | Full admin-UI click-through (see checklist below) | dev, `/admin` | | PENDING |

## Per-check list — RISK-055 (stale session poll)

- [ ] Log into `/admin` and leave the tab open and idle (not refreshed) for at least as long as it
      takes Supabase to perform a background token refresh (access tokens in this project are
      ~1 hour; leaving the tab open 60–90 minutes is the most direct repro).
- [ ] After that wait, without reloading, open **Pending Approvals** — confirm it still shows the
      real count of pending bookings (not 0 when pending bookings actually exist).
- [ ] Open a patient with existing bookings → **Booking History** — confirm records still appear
      (not "No booking history records found for this patient" when bookings actually exist).
- [ ] Watch the network tab during this window — confirm `GET /api/reservations...` calls continue
      returning `200`, not a growing run of `401 Invalid or expired session`.
- [ ] Create a *new* real pending booking (via `/book` or Admin → New Booking) while the admin tab
      has been open a while — confirm it appears in Pending Approvals within the 15-second poll
      window, without needing a manual page refresh.

## Per-check list — RISK-054 (status leak into booking-details modal)

- [ ] Approve a booking, then Check In, then Start Session (all from the reception `viewingBooking`
      modal, reachable via Pending Approvals or Patients → Booking History).
- [ ] With that booking now `started`, navigate to **Bookings → Calendar View → Today's Schedule**
      (or any other date via the calendar) and click the row for that booking.
- [ ] Confirm the modal badge reads the raw status (`STARTED`), not a display-remapped value like
      `IN_PROGRESS`.
- [ ] Confirm the amber **"Treatment In Session"** banner is visible (Session Flow card), not a
      blank/dead-end modal.
- [ ] Confirm the **"Other Actions"** panel (Postpone / Cancel / No Show) is **not** shown while the
      booking is `started` — those actions should only reappear once the session reaches a
      terminal-ish state again (e.g. after `completed`).
- [ ] Repeat for a booking sitting at `approved` (before Check In): opening it via Today's Schedule
      should show the same Check-In flow as opening it via Pending Approvals — both paths should be
      behaviorally identical now that both resolve the same raw record.
- [ ] Repeat for a `completed` booking opened via Today's Schedule: confirm "Pay & Settle Invoice" /
      "View Invoice & Print PDF" render correctly (this status wasn't remapped, but worth
      confirming the id-lookup fix didn't regress it).
