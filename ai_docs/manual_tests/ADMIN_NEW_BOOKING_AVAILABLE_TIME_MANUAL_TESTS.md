# New Booking — Available Time Dropdown Manual Test Checklist

> **Living document.** Update this file with dated dev evidence as each check is run.
> **Environment:** dev branch, admin dashboard, logged in as any role that can reach
> Admin → Bookings → New Booking.
>
> Scope: the Available Time control now uses 15-minute start-time intervals. Selecting a
> service start time reserves the contiguous 15-minute blocks required by that service duration;
> those occupied blocks are rendered disabled in the dropdown.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| | | | | |

## Per-check list

### Reference UI and dropdown behavior

- [ ] Open New Booking from Bookings → New Booking. Confirm the Available Time field is a
      compact outlined trigger with a clock icon and chevron.
- [ ] Open the trigger. Confirm the floating panel has the Available Time heading, service
      duration label, Clear Selection action, and a responsive four-column time grid.
- [ ] Confirm the grid uses 15-minute increments (for example 09:00, 09:15, 09:30, 09:45)
      rather than only half-hour increments.
- [ ] Click outside the panel. Confirm it closes without changing the selected start time.
- [ ] Confirm the selected start time uses the dark-green selected state with a check icon.

### Duration-aware blocking

- [ ] Select a service with a 30-minute duration. Select 09:00 AM and confirm 09:15 AM is
      disabled as part of the selected appointment duration, while a free 09:30 AM start remains
      selectable.
- [ ] Select a service with a 60-minute duration. Select 09:00 AM and confirm 09:15 AM,
      09:30 AM, and 09:45 AM are disabled; confirm the selected 09:00 AM start remains active.
- [ ] Select a service whose duration is not an exact multiple of 15 minutes. Confirm the UI
      blocks the ceiling number of 15-minute intervals required to contain the service.
- [ ] Switch to a service with a different duration. Confirm the available start times and the
      disabled duration blocks recalculate without retaining stale blocked slots.
- [ ] Confirm existing booked/occupied slots and their duration blocks remain disabled.
- [ ] Click Clear Selection. Confirm the trigger returns to its placeholder and the service's
      valid start times become selectable again.

### Booking submission and regression

- [ ] Select one valid start time and create a booking. Confirm the confirmation summary shows
      one start time and the selected service duration, not multiple independently selected slots.
- [ ] Confirm the created reservation stores the selected start time as a single `requestedTime`
      / `time_slot` value.
- [ ] Confirm changing the session type refreshes availability and does not enable slots that do
      not fit the selected service duration.
- [ ] Repeat the UI checks in Arabic. Confirm the new labels are translated and the dropdown
      remains usable in RTL mode.
- [ ] Confirm closed days, unavailable doctors, past times, and fully occupied schedules still
      show the existing empty-state warning.
- [ ] Run `npx.cmd tsc --noEmit` — 0 errors.
- [ ] Run `npx.cmd eslint src/components/admin/bookings/AdminNewBookingView.tsx src/components/admin/translations.ts` — 0 errors.
