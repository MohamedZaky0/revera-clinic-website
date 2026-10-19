# New Booking: Date Of Birth In The New-Patient Intake: Manual Test Checklist

> Reasoning: `ai_docs/DECISIONS.md` -> DEC-112. Automated coverage: `tests/lib/age.test.ts` (`ageFieldsForSave`). The form itself has no component test, so the checks below need a person.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| | Everything below | | Not run yet | Pending |

## New patient from New Booking
- [ ] Bookings -> New Booking, type a phone number that is not in the system, answer "No" to "does the patient already have an account": the intake shows **Date of Birth** and **Age** side by side.
- [ ] Pick a birth date: Age fills in by itself, becomes read-only (grey) and a note says it is calculated. The picker does not allow a future date.
- [ ] Create the booking. Open the new patient in Patients: the birth date is saved and shown, and the age on the profile matches.
- [ ] Clear the birth date and type an age (e.g. 28) instead: it still saves as an age (legacy path), no birth date.
- [ ] Leave both empty: the patient is created with neither, and booking still works.
- [ ] Arabic: labels read "تاريخ الميلاد" and the calendar icon sits on the correct side.

## Existing patient
- [ ] Search an existing patient that has a birth date: the intake (if opened) shows it pre-filled and the age calculated.
- [ ] Select patient A (with a birth date), then clear the phone and pick patient B (without one): B's intake must NOT show A's birth date.
