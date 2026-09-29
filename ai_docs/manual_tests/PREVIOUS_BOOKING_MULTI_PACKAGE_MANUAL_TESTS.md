# Previous Booking — Several Packages (DEC-098) — Manual Test Checklist

> Automated coverage: `tests/routes/reservations-previous-multi-package.test.ts`,
> `tests/routes/reservations-previous-package.test.ts`, `tests/routes/reservations-previous-edit.test.ts`.
> Environment: dev first, production after merge.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| | | | | |

## 1. Adding a historical booking with packages

- [ ] Patient who already has a pulses package: Add Previous Booking → attach the existing package, enter 500 pulses used
      in the session → save. Patient profile: remaining pulses dropped by 500.
- [ ] Same booking also attaches a **new** catalog package → after save the new package appears on the patient with
      **price pending** ("Enter invoice value" available), not the catalog price.
- [ ] A booking with **only one new package** and an invoice value of 5,000 → the package's price is 5,000 (not the
      catalog price), no "pending" flag.
- [ ] Try attaching the same existing package twice → refused with an error, nothing saved.
- [ ] Finance → P&L → prepaid packages card: the patient's remaining pulses are counted at the right value (not the full
      package), and no revenue appears this month for the historical usage.

## 2. Editing a historical booking (superadmin)

- [ ] Edit a booking and add a package → the package is created on the patient. Save the same edit again → still only one.
- [ ] Edit a booking with two packages and raise the invoice value by 500 → the patient's outstanding rises by exactly 500.
- [ ] Edit with the session pulses set to 0 → the package's "used before the system" history is still there (remaining
      pulses and the deferred value do not jump back to the full package).

## 3. Regressions

- [ ] A historical booking with invoice 0 and paid 0 shows as **Paid** in Bookings / Booking Details / patient profile
      (b299751).
- [ ] The "remaining pulses" field on the form is read-only and follows total − used (7daf4f1).
