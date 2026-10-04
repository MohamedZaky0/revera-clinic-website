# Services — Deleted/Inactive Branch Pricing Manual Test Checklist

> **Living document.** Update this file with dated dev evidence as each check is run.
> **Environment:** linked dev database.
> **Bug reported by Mohamed (2026-10-04):** deleting branches down to one still showed every
> historical branch's price in the Services screen — both in dev (after deleting branches) and on
> the live system (services carried pricing for a branch that had since been set Inactive).
> **Root cause:** `DELETE /api/branches` only removes the row from `branches` — it never touches
> `services.branch_pricing`, a denormalized JSON array keyed by branch *name*, not id. Nothing
> filtered that array against the live branches list before displaying or re-saving it.
> **Fix:** `AdminServicesView.tsx`'s Services table and `admin/page.tsx`'s `editService()` now both
> filter `branchPricing` down to branches currently `status === "active"` before displaying or
> loading it into the edit form, so stale entries stop showing and stop being perpetuated on save.
> This is display/edit-form filtering only — existing `branch_pricing` rows in the database are not
> bulk-migrated; they get pruned the next time each service is individually edited and saved.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| 2026-10-04 | Services list, with Branches showing only 1 active branch | dev (browser, same account/data Mohamed described) | "Branches" column showed only "New Cairo Branch" for every service | Pass |
| 2026-10-04 | Edit Service modal open/close on a service with historical multi-branch pricing | dev (browser) | Opened cleanly, no console error, fields populated correctly | Pass |

## Per-check list

- [x] With only one active branch, confirm the Services table's "Branches" column shows that one branch for every service — no stale/deleted branch names.
- [ ] Reactivate a second branch (Settings → Branches → a currently-inactive one, if any exists) and confirm it starts appearing again for services that have a genuine price entry for it (not just appearing from nothing).
- [ ] Set a branch to Inactive (without deleting it) and confirm its price row disappears from the Services table immediately, without needing to re-save any service.
- [x] Open Edit Service on a service whose stored `branch_pricing` includes a now-deleted/inactive branch. Confirm the modal opens without error.
- [ ] Save that edited service. Re-check the Services table — confirm the stale branch is still gone (filtering survives a save, doesn't get re-introduced).
- [ ] Add a brand-new service while only one branch is active. Confirm its default branch-pricing entry is named after the real active branch, not a hardcoded "Zayed".
- [ ] Confirm the public booking site's price (`getEffectiveServicePrice` in `src/lib/services.ts`) is unaffected by this change — this fix only touches the admin Services screen's display/edit-load path, not the public pricing resolution logic. **Flagged separately, not fixed here:** that function's `isDefault` fallback doesn't check whether the matched branch is still active; revisit if a wrong price is ever reported on the public site, not just in admin.
