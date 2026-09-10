# Admin Services — Duration Label Manual Test Checklist

> **Living document.** Update this file with dated dev evidence as each check is run.
> **Environment:** dev branch, admin dashboard, logged in as a role with `services.create`/
> `services.edit` permission. Admin → Services.
>
> Context: the Services edit/add form used to have two independent duration controls — a
> free-text "Duration" dropdown (`"1:00 Hours"` etc.) and a numeric "Duration (minutes)" field —
> that could disagree, because only the dropdown's own `onChange` kept them in sync and the Edit
> form populated the dropdown from a different source (`svc.duration`, or a hardcoded `"1:00
> Hours"` fallback) than the minutes field (`duration_minutes`, the value actually used by
> availability/collision checks). Two real services (`Skin Dermatology Clinics`, `Skin Care
> Treatments`) ended up showing "1:00 Hours" while their real `duration_minutes` was 30. Fix makes
> the "Duration" label a read-only value derived live from the minutes field — one source of
> truth, no possible disagreement.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| | | | | |

## Per-check list

### Add New Service

- [ ] Admin → Services → pick a category → **Add Service**. Confirm "Duration (minutes)" defaults
      to `60` and the read-only "Duration" label below it reads "1:00 Hours".
- [ ] Change the minutes field to `15`. Confirm the label updates immediately to "0:15 Hours" —
      no separate dropdown to pick, no way to set a value it disagrees with.
- [ ] Try `45`, `90`, `120`. Confirm the label always matches (`0:45 Hours`, `1:30 Hours`,
      `2:00 Hours`).
- [ ] Try a non-preset value like `40`. Confirm the label still renders sensibly ("0:40 Hours")
      instead of breaking or falling back to a wrong preset.
- [ ] Save the new service. Confirm the created row's `duration_minutes` matches what was typed,
      and re-opening Edit shows the same minutes + matching label.

### Fix the two known-bad services

- [ ] Edit **Skin Dermatology Clinics**. Confirm "Duration (minutes)" now honestly shows `30`
      (the real stored value) and the label reads "0:30 Hours" — not the old misleading
      "1:00 Hours".
- [ ] If the intended real duration is 60 minutes, set the minutes field to `60`, confirm the
      label updates to "1:00 Hours", and Save. Re-open Edit and confirm it now persists as 60/
      "1:00 Hours" consistently.
- [ ] Repeat for **Skin Care Treatments**.
- [ ] After saving, re-run (or manually re-check) the availability engine for that service —
      confirm the number of 15-minute slots it blocks now matches the corrected duration (e.g.
      4 consecutive slots for 60 minutes, not 2).

### Regression — every other service

- [ ] Open Edit on a handful of other services (ones that were never touched, e.g. from
      Gynecology/Physiotherapy/Osteopathy categories). Confirm the label now shows "0:30 Hours"
      (matching their real `duration_minutes=30`) instead of the old fake "1:00 Hours" default.
- [ ] Confirm saving one of these untouched services without changing anything doesn't alter its
      `duration_minutes` (no accidental overwrite from opening/closing the modal).
- [ ] Confirm the New Booking duration badge (separate earlier fix) reflects these corrected
      values for the two services once their `duration_minutes` is fixed.
