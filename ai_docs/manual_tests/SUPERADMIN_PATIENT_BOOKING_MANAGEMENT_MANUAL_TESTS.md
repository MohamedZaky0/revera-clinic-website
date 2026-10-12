# Superadmin Patient & Booking Management — Manual Test Checklist

> **Living document.** Update this file with dated dev/production evidence as each check is run.
> Full reasoning: `ai_docs/DECISIONS.md` → **DEC-103**. Related fixes found along the way:
> `ai_docs/RISKS.md` → **RISK-115** (dev DB schema drift that blocked every patient edit) and
> **RISK-116** (`DELETE /api/reservations` guard tightened to superadmin-only).

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| 2026-10-10 | Feature A — save a superadmin name edit | dev (`dev.reveraclinics.com` backing DB) | Renamed "DOB Test Patient" → "DOB Test Patient Renamed"; `POST /api/customers` → 200; confirmed via search that the new name persisted | Pass |
| 2026-10-10 | Feature B — hard delete a patient | dev | Hard-deleted "DOB Test Patient Renamed"; `DELETE /api/customers?...&mode=hard` → 200; confirmed via direct DB query (`SELECT ... WHERE mobile = '01099991234'`) returned 0 rows | Pass |
| 2026-10-10 | Feature C — soft delete a booking | dev | Soft-deleted a 0 EGP completed booking under "Hamada Test"; `DELETE /api/reservations?...&mode=soft` → 200; confirmed via direct DB query that `reservations.status` is now `cancelled` | Pass |
| 2026-10-10 | RISK-115 regression — any patient edit, not just superadmin | dev | Root cause (`customers.auth_user_id` missing despite migration history saying otherwise) fixed directly against the dev DB; same save flow re-tested and succeeded | Pass |

## Background (plain language)

Three related gaps, reported together: (1) a superadmin could never fix a typo in a patient's name
because the Name field was always locked, even for them; (2) there was no way to delete a patient
anywhere in the UI, even though a complete delete confirmation screen for it already existed in the
code — it just had no button wired to open it; (3) there was no way to delete a booking at all. All
three are now superadmin-only actions, matching the rest of the app's convention that destructive
actions require the top role.

## Per-check list

### Feature A — Name field unlocked for superadmin only

- [ ] Log in as a **non-superadmin** staff account (`admin`/`reception`/etc.), open an existing
      patient's Edit Profile. Confirm the Name field is still locked/read-only and shows the original
      "cannot be edited" message — this must be unchanged from before.
- [ ] Log in as **superadmin**, open the same patient's Edit Profile. Confirm:
  - [ ] The amber "Superadmin override: you can edit this customer's name" banner appears.
  - [ ] The Name field is editable (not greyed out, no lock icon).
  - [ ] Changing the name and clicking Save Changes succeeds (watch for a 200 on
        `POST /api/customers` in Network tab) and the new name is reflected immediately in the
        Patients list and the patient's profile header.
- [ ] As superadmin, open a patient and leave the Name field unchanged but edit something else
      (phone, notes). Confirm the save still succeeds and the name is untouched — the unlock must not
      force a rename on unrelated edits.

### Feature B — Delete Patient (superadmin only)

- [ ] As **non-superadmin**, open any patient profile. Confirm there is **no** "Delete Patient" button
      anywhere on the page.
- [ ] As **superadmin**, open a patient profile. Confirm a red "Delete Patient" button appears next to
      "Edit Profile".
- [ ] Click it on a **disposable test patient** (not a real clinic patient). Confirm the confirmation
      modal opens showing:
  - [ ] "Soft Delete (Deactivate)" — labelled as preserving records.
  - [ ] "Hard Delete (Permanent Removal)" — labelled as irreversible.
  - [ ] The correct patient's name in the modal body.
- [ ] Test **Soft Delete** on one disposable patient: confirm the patient becomes inactive
      (`active = false`) but still appears in records/search as inactive, and their invoices/wallet
      history/packages are untouched.
- [ ] Test **Hard Delete** on a separate disposable patient: confirm the patient disappears from the
      Patients list entirely, and from the database (not just hidden in the UI). Confirm the profile
      view closes automatically after a successful hard delete triggered from inside it.
- [ ] After a hard delete, check any reservation that referenced that patient: confirm it is not
      itself deleted, and does not crash the Bookings or Patients views (the route nulls
      `reservations.customer_id` defensively before deleting the customer row).
  - **Known follow-on quirk (not a regression from this change, worth a separate look):** the
    Patients Directory can reconstruct a pseudo-patient row from a leftover reservation tied to the
    deleted patient's phone number (synthetic id like `res-cust-<phone>`), and opening that
    pseudo-patient's Prescriptions/Records-adjacent calls (e.g. `package-redemptions`) 500s because
    the synthetic id isn't a real UUID. Confirm this doesn't block core navigation; flag separately if
    it needs its own fix.

### Feature C — Delete Booking (superadmin only)

- [ ] As **non-superadmin**, open any Booking Details modal. Confirm there is **no** "Delete Booking"
      button.
- [ ] As **superadmin**, open a booking's details. Confirm the red "Delete Booking" button appears
      next to "Edit Previous Booking" — **on both a historical and a non-historical (upcoming)
      booking** — this was deliberately made available for any booking status, not just past ones.
- [ ] Click it on a **disposable test booking**. Confirm the same soft/hard choice modal used
      elsewhere in the app opens, naming the correct patient.
- [ ] Test **Soft Delete**: confirm the booking's status becomes `cancelled` (reversible — check it
      still exists in the database with the new status), the modal closes, and the booking list
      refreshes without it in the active view.
- [ ] Test **Hard Delete** on a separate disposable booking: confirm it is permanently removed from
      the database (not just hidden) and does not appear after a full page refresh.
- [ ] Confirm deleting a booking does not affect the patient's other bookings, wallet, or invoices.
- [ ] Specifically re-test the original complaint: a booking with status **"Completed"** that
      previously could not be cancelled/deleted via the old status dropdown — confirm it can now be
      deleted (soft or hard) via this new button.

### Regression — RISK-115 (dev DB column drift)

- [ ] On dev, as **any** staff role (not just superadmin), edit any field on any existing patient and
      save. Confirm it succeeds with a 200, not a 500 — this bug blocked every patient edit, not just
      the new superadmin-only paths, so it must be re-verified broadly, not just for these 3 features.
- [ ] If this regresses again, check first whether `customers.auth_user_id` physically exists on the
      target DB (`information_schema.columns`), not just whether `supabase migration list` reports the
      migration as applied — the two can disagree (see RISK-115 for why).

### Production confirmation

- [ ] After this ships to production, repeat the Feature A/B/C happy-path checks above against
      `www.reveraclinics.com` using a real but disposable/test patient and booking — do **not** test
      Hard Delete against production data the clinic actually relies on. Record the outcome here with
      a date.
- [ ] Confirm production's `customers.auth_user_id` column and its two constraints are present
      (already confirmed once, 2026-10-10, via direct query against the `Revera-clinics` Supabase
      project — re-check only if another patient-edit 500 is ever reported on production).
