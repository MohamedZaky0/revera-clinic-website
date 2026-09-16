# RISK-088 Manual Test Checklist — Add Service (`POST /api/services`) Create Path

> **Living document.** Update this file with dated dev evidence as each check is run.
> **Environment:** linked dev database. Use a staff bearer token (a real logged-in admin session,
> `superadmin` or a role granted the "Services" category / `services.create`) for every check below.
>
> Full reasoning and code pointers are in `ai_docs/RISKS.md` → **RISK-088**. This file is just the
> click-through checklist referenced from there.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| 2026-09-17 | Add Service to a category with existing services | Local dev (`localhost:57422`), `finance-test@revera.com` | Pre-fix: `POST /api/services` → 500, server log `null value in column "id" ... violates not-null constraint`. Post-fix: 201, new row ("Test Diagnostic Service", id 57) appeared in the Dermatology & Aesthetic list at EGP 150. Deleted afterward to leave the shared dev DB clean. | PASS |

## Per-check list

### Adding a brand-new service works

- [ ] Open Admin → Services. Pick a category that already has at least one service in it (this is the exact shape that triggered the bug — a mixed array of existing + new rows).
- [ ] Click **Add Service** on that category, fill in Category, Duration, Session Type, Name (EN), Name (AR), Price, and click **Save**.
- [ ] Confirm the modal closes and the new service appears in the list immediately, with a real (non-zero) `ID` column value and the price/name you entered.
- [ ] Reload the page (hard refresh). Confirm the new service is still there — i.e. it actually persisted to the DB, not just optimistic local state.

### Adding to a category with zero existing services still works

- [ ] Create a brand-new category (or find one with 0 services), click **Add Service**, save. Confirm it works the same way (this path was never broken — the array sent has only one row either way — but worth confirming as a control case).

### Editing an existing service still works (this path was never broken)

- [ ] Open an existing service, change its price or name, save. Confirm the change persists after a reload, and no duplicate row was created.

### Adding while other services in the same category are simultaneously being edited/reordered

- [ ] Drag-reorder a category's services (changes `sortOrder` for several rows), then immediately click **Add Service** and save a new one in the same category. Confirm both the reorder and the new service persisted correctly (regression check for the split upsert/insert logic not dropping any row from the batch).

### Permission boundary unaffected by this fix

- [ ] Log in as a role with no "Services" permission at all. Confirm **Add Service** is rejected (403 in network tab / no new row created) — the permission check in `POST /api/services` was not touched by this fix.

### Related callers of the same bulk-sync endpoint

- [ ] **Promotions** (`PromotionsAdminPanel.tsx`): apply a promotion that adjusts service prices and save. Confirm it still saves correctly (this caller only ever sends existing services with real ids, so it should be unaffected, but confirm no regression).
- [ ] **Packages'** included-services picker: create/edit a package that references services. Confirm service data used by the picker is unaffected.
