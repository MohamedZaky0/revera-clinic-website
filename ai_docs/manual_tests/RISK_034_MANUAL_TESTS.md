# RISK-034 Manual Test Checklist — Closed-Day Booking Guard

> **Living document.** Update this file with dated dev evidence as each check is run.
> **Environment:** linked dev database. All current data is mock and may be reset. Use a staff
> bearer token for every staff-side check below.
>
> Full reasoning and code pointers are in `ai_docs/RISKS.md` → **RISK-034**. This file is just the
> click-through checklist referenced from there.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| 2026-07-29 | Live-reported: patient booked Friday 2026-07-31 (New Cairo branch closed Fridays) | dev, public site | Booking created with status `pending`; staff could not approve. Root-caused to `BookingModal.tsx`'s `getDayOperatingHours()` only checking clinic closure in the `!found` branch — a doctor with a same-weekday schedule entry bypassed it entirely. Fixed client-side (closure check now unconditional) and added a server-side guard in `POST /api/reservations` (rejects non-manual bookings on a closed day). | FAIL → fixed, pending re-test |

## Per-check list

- [ ] Confirm a branch's `service_hours` has Friday marked closed (`isOpen: false`) — check via
      Settings → Branches, or the branch's `service_hours` column directly.
- [ ] On the public site, select that branch and a service, then try to pick a Friday date in the
      calendar → confirm Friday is disabled/unselectable, even if a doctor's own schedule has a
      Friday entry.
- [ ] Confirm no available time slots render for Friday even if a date is somehow selected.
- [ ] Directly `POST /api/reservations` with a Friday `date` for that branch (bypassing the UI
      entirely, e.g. via curl/Postman) with `isManual` omitted or `false` → confirm it's rejected
      with a `400` and a clear "clinic is closed on Fridays" message, not silently created.
- [ ] Repeat the same direct `POST` with `isManual: true` → confirm it **is** allowed (staff
      override path), so admin's manual booking creation isn't blocked from scheduling a
      deliberate exception.
- [ ] Confirm a booking for a genuinely open day (e.g. Saturday, if open) still books normally
      end-to-end — this is a guard against a false-positive regression, not a new restriction on
      valid dates.
- [ ] Reject/cancel the pre-existing bad test booking for 2026-07-31 via the normal admin
      "Reject" action, since no direct DB cleanup was performed for it.
