# New Booking Form — Duration Badge Manual Test Checklist

> **Living document.** Update this file with dated dev evidence as each check is run.
> **Environment:** dev branch, admin dashboard, logged in as any role that can reach
> Admin → Bookings → New Booking.
>
> Context: `totalDurationMinutes` in `AdminNewBookingView.tsx` computed
> `Number(duration || duration_minutes) || 30`. `duration` is the legacy free-text column
> (e.g. `"1:30 Hours"`), so `Number()` on it is always `NaN` and `duration_minutes` — the real
> numeric column, already used by the availability engine and both room-collision checks — was
> never actually read. The badge silently showed `30 min` per selected slot for every service.
> Fix swaps in the shared `getServiceDurationMinutes()` helper from `@/lib/services`.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| | | | | |

## Per-check list

### Badge shows the real duration, not a flat 30 min

- [ ] In Admin → Services, confirm (or set) a service with `duration_minutes` clearly different
      from 30 — e.g. a 90-minute service (`"1:30 Hours"` / `90`).
- [ ] In New Booking, select that service, pick a doctor/date/branch, and select **1** time slot.
      Confirm the badge under the slots grid reads "1 slot selected • 90 mins" — not "• 30 mins".
- [ ] Select a **second** slot (2 total). Confirm the badge updates to "2 slots selected •
      180 mins" (slots × real per-slot duration, not slots × 30).
- [ ] Switch the Service dropdown to a different service with a different `duration_minutes`
      (e.g. 45). Confirm the badge recalculates immediately using the new service's duration,
      still against the same number of selected slots.

### Regression — services with only legacy `duration` text (no `duration_minutes`)

- [ ] Find or create a service where `duration_minutes` is null/0 but the legacy `duration` text
      field is set (e.g. `"1:00 Hours"`). Confirm the badge still resolves to the parsed value
      (60 mins) via the `getDurationInMinutes()` text-parsing fallback inside
      `getServiceDurationMinutes()` — not a hardcoded 30.
- [ ] Find or create a service where **both** `duration` and `duration_minutes` are empty/null.
      Confirm the badge falls back to 30 mins per slot (the documented default), not `NaN` or
      a blank value.

### Regression — unrelated behavior unaffected

- [ ] Confirm the badge is still purely informational: complete a booking and confirm the
      created reservation's stored fields are unaffected by this change (this value is never
      sent to the API).
- [ ] Confirm the required-field highlighting fix (red borders on Phone/First Name/Service/
      Doctor/time slots) from the earlier fix in the same file still works correctly — this
      change only touched the `totalDurationMinutes` line and the `ServiceItem` interface.
- [ ] Run a full booking with multiple selected slots end-to-end and confirm the summary modal
      and submission still work normally (no console errors from the new `getServiceDurationMinutes`
      import).
