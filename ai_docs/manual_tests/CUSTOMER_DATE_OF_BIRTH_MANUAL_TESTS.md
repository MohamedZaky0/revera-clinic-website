# Customer Date of Birth Manual Test Checklist — DOB + age derived from it

> **Living document.** Update this file with dated dev evidence as each check is run.
> **Environment:** linked dev database.
> Full reasoning and code pointers are in `ai_docs/DECISIONS.md` → **DEC-041** (original
> `date_of_birth` column decision) and `ai_docs/DB_SCHEMA.md` → `customers.age` / `customers.date_of_birth`.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| 2026-10-04 | Add Patient: set DOB 1995-05-15, "today" 2026-10-04 | dev (browser) | Age field auto-showed 31, read-only, "Calculated from date of birth" note | Pass |
| 2026-10-04 | Save "DOB Test Patient" with the above DOB | dev (browser) | Saved; Patients Directory count went 22→23 | Pass |
| 2026-10-04 | Open "DOB Test Patient"'s profile → Personal Info tab | dev (browser) | Shows "DATE OF BIRTH: 15 May 1995" and "AGE: 31" | Pass |

## Per-check list

### Add Patient — new customer, no DOB
- [ ] Open Patients → Add Patient. Confirm Age is a free, editable number input and Date of Birth is empty.
- [ ] Type an age (e.g. 40), leave DOB empty, save. Confirm the saved profile shows Age 40 and Date of Birth "—".

### Add Patient — new customer, with DOB
- [x] Set a Date of Birth. Confirm Age becomes read-only, shows the correct computed value, and the "Calculated from date of birth" caption appears.
- [ ] Try to pick a future date in the Date of Birth field — confirm the browser's native date picker max blocks it (field is capped at today).
- [x] Save. Confirm the profile's Personal Info tab shows both the Date of Birth (formatted) and the correctly computed Age.

### Edit Patient — adding a DOB to an old age-only record
- [ ] Open an existing patient that has an `age` value but no Date of Birth (e.g. "Hamada Test" or any pre-existing record). Confirm Age shows as the stored free-entry value and is editable.
- [ ] Set a Date of Birth and save. Confirm the profile now shows Age computed from the new DOB, and re-opening Edit shows Age as read-only/computed (the legacy age value should no longer reappear as an independent editable number).

### Edit Patient — existing DOB record
- [ ] Open the "DOB Test Patient" record created above. Confirm Date of Birth pre-fills with the saved value and Age shows read-only/computed, matching the profile display.

### Birthday-boundary correctness (no browser needed — already covered by `tests/lib/age.test.ts`, re-verify manually once)
- [ ] Pick a patient whose birthday is today (or set a test DOB to today minus N years) and confirm the computed age matches a manual calculation, not off by one.

### Arabic / RTL
- [ ] Switch the admin panel to Arabic. Confirm "تاريخ الميلاد (اختياري)" and "محسوب من تاريخ الميلاد" render correctly in the Add/Edit form, and "تاريخ الميلاد"/"العمر" render correctly in the profile drawer.
