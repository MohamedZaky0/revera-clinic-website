# New Booking Form — Required Field Validation Manual Test Checklist

> **Living document.** Update this file with dated dev evidence as each check is run.
> **Environment:** dev branch, admin dashboard, logged in as any role that can reach
> Admin → Bookings → New Booking.
>
> Context: `handleOpenSummaryModal` in `AdminNewBookingView.tsx` validated required fields but only
> surfaced a generic `alert()` popup — the offending field itself had no visual indication, so the
> user had no way to tell which field was empty. Fix adds a `formErrors` state that highlights the
> specific field (red border + inline message) and clears itself as soon as that field is fixed.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| | | | | |

## Per-check list

### Phone / First Name

- [ ] Leave Phone empty, fill everything else, click **Continue/Review**. Confirm the phone input
      gets a red border + red "This field is required." text under it, in addition to the existing
      alert popup.
- [ ] Type a digit into Phone. Confirm the red border and message disappear immediately (before
      re-submitting).
- [ ] Repeat the same two checks for First Name.
- [ ] Leave both Phone and First Name empty and submit — confirm **both** fields highlight at once.

### Service / Doctor

- [ ] If the service list is non-empty, a service is auto-selected by default — confirm no false
      positive error shows on initial load.
- [ ] Manually force the Service `<select>` to no value (e.g. via a branch/service combination with
      zero services) and submit. Confirm the select gets a red border + inline required message.
- [ ] Repeat for Doctor.
- [ ] Pick a value in the errored dropdown — confirm the red state clears immediately.

### Time slots

- [ ] Pick a date/doctor/branch combination with available slots, submit without selecting any slot.
      Confirm the slots grid gets a red border and an inline "Please select at least one available
      time slot." message appears below it (in addition to the existing alert).
- [ ] Click any slot. Confirm the red border and inline message clear immediately.
- [ ] Pick a date where the branch/doctor is closed (0 available slots) — confirm the existing amber
      "closed" banner still renders normally (this path is unrelated to the new red validation state
      and must not regress).

### Regression — existing alert-based flow untouched

- [ ] Confirm the same `alert()` popups still fire with their original translated text (EN and AR)
      for every case above — this change is additive, not a replacement of the existing alerts.
- [ ] Confirm the Arabic (RTL) layout still reads correctly — error text and red borders should not
      shift the field layout or break RTL alignment.
- [ ] Complete a full booking successfully after fixing all flagged fields — confirm the summary
      modal opens and the booking submits normally (no leftover error state blocking submission).
