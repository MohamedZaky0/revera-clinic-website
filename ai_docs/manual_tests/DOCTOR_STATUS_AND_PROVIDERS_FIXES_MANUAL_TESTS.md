# RISK-075 — Doctor Status & Providers API Fixes — Manual Test Checklist

Covers the fix for RISK-075 (`ai_docs/RISKS.md`): the `providers.active` column was missing a
migration, three layers of silent fallback masked that failure, `POST /api/providers` wrote to
nonexistent columns entirely, and several UI regressions landed in the same commit range
(Delete Doctor removed, customer financial fields locked, doctor photo un-removable, status badge
color mismatch). Automated coverage: `tsc`/`eslint`/`vitest` all pass, but none of them exercise a
real Supabase write — this checklist proves the actual persistence behavior.

## Evidence log

| # | Check | Result | Evidence | Date | Tester |
|---|---|---|---|---|---|
| 1 | Add Doctor persists to Supabase, not `data/providers.json` | | | | |
| 2 | Toggle doctor status → survives a hard reload | | | | |
| 3 | Two same-named doctors → editing one leaves the other untouched | | | | |
| 4 | PATCH with an unknown provider id → 404, no phantom row created | | | | |
| 5 | New customer with a nonzero opening wallet/spent/outstanding saves | | | | |
| 6 | Existing customer's financial fields stay read-only | | | | |
| 7 | Delete Doctor visible for `providers.delete`, hidden without it | | | | |
| 8 | Clearing all branches on a doctor's schedule → `branch_id` goes NULL | | | | |
| 9 | Editing a doctor's email/employment type alone doesn't wipe their schedule | | | | |
| 10 | Remove Photo clears and persists | | | | |
| 11 | Doctor status badge is the same color on all three screens | | | | |

## Checks

- [ ] **1.** Add a brand-new doctor via the "Add Doctor" flow (fill name, email, employment type,
      languages, session type, a schedule). Confirm the created doctor shows up after a hard reload
      (not just optimistically in local state) — this proves the write landed in Supabase, not
      `data/providers.json`. If deployed to Vercel, also confirm the request does **not** return a
      500 (the old bug: `fs.writeFileSync` throws on Vercel's read-only filesystem when the
      Supabase insert fails).
- [ ] **2.** Open Doctors → 3-dots menu → Change Status on an existing doctor, toggle to Inactive.
      Hard-reload the page (not just re-render). The doctor must still show Inactive — before the
      fix, it silently reverted to Active because the write never reached the real `providers` table.
- [ ] **3.** Create two doctors with the exact same name (or find/create this condition). Edit one
      of them (change salary or national ID) and save. Confirm only that one doctor's record
      changed — the other must be untouched. Before the fix, an id-lookup miss would silently
      overwrite every doctor sharing that name.
- [ ] **4.** Using a REST client (or browser devtools), send a `PATCH /api/providers?id=<a
      nonexistent uuid>` with any body and a valid staff auth token. Must return **404**, not 200.
      Confirm `data/providers.json` did **not** gain a new phantom entry with that id.
- [ ] **5.** Add a new customer/patient and set a nonzero starting Wallet, Spent, and Outstanding
      value in the Financial Information section. Save, then reopen the customer profile and
      confirm all three values persisted.
- [ ] **6.** Open an **existing** customer's edit form. Confirm Wallet/Spent/Outstanding are
      displayed read-only (greyed out, not editable) — this fix must not have accidentally made
      them editable in edit mode too.
- [ ] **7.** As a role with `providers.delete` permission, open a doctor's 3-dots menu and confirm
      both "Change Status" and "Delete Doctor" are visible. As a role with only `providers.edit`
      (no delete), confirm only "Change Status" shows.
- [ ] **8.** Edit a doctor's working schedule so no branch is selected for any day (or explicitly
      clear all branch assignments) and save. Query the doctor's record (or check the Doctors table
      branch column) and confirm `branch_id` is now null/cleared, not still pointing at the old
      branch.
- [ ] **9.** Edit only a doctor's email or employment type (a PATCH that does **not** touch the
      schedule) and save. Confirm the doctor's working schedule (days/hours/branch assignments) is
      unchanged afterward — this proves the merge fix, not a wholesale replace, is in effect.
- [ ] **10.** Open a doctor's edit form, upload a photo, save, then reopen and click "Remove" next
      to Change Photo. Confirm the avatar reverts to the initial-letter placeholder and that this
      persists after saving/reloading (not just cleared in local state).
- [ ] **11.** View the same doctor's status badge on: the Doctors table, the doctor's profile page,
      and inside the edit-doctor form's summary card. All three should render the identical color
      (emerald for Active, red for Inactive) — including the small presence dot on the profile page,
      which used to be hardcoded green regardless of actual status.
