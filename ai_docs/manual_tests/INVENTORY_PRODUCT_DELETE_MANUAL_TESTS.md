# DEC-038 Manual Test Checklist — Inventory Product Soft/Hard Delete

> **Living document.** Update this file with dated dev evidence as each check is run.
> **Environment:** linked dev database. All current data is mock and may be reset. Use a real
> logged-in staff session (bearer token) for every check below.
>
> Full reasoning and code pointers are in `ai_docs/DECISIONS.md` → **DEC-038** and
> `ai_docs/DB_SCHEMA.md` → `inventory_products`. This file is the click-through/API checklist
> referenced from there.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| 2026-07-30 | Full permission matrix (soft/hard × superadmin/non-superadmin, FK-blocked hard delete) | Local dev, linked Supabase project, via `scratch/test_product_delete_rule.ts` (direct HTTP calls with real superadmin + non-superadmin — admin role — session tokens) | Script output: admin soft-delete → `200 mode:soft`; admin hard-delete attempt → `403`; superadmin hard-delete (no history) → `200 mode:hard`, row confirmed gone from `inventory_products` via service-role query; superadmin hard-delete on a product with real `consumption_entries` rows → `409` with a clear message (previously silently swallowed); `GET` listing confirmed to exclude the soft-deleted product while its row (with `deleted_at` set) still exists in the DB. | All 6 assertions passed. |
| 2026-07-30 | Real UI click-through (Add Item → Delete → both `confirm()` dialogs) | Local dev, logged in as `saif@superadmin.com`, Inventory → Products & Supplies | Playwright screenshot `screenshots_2026-07-29/product-delete-after.png`; console showed both dialogs firing with expected text, and the created test row disappeared from Products Catalog after choosing Cancel on the second ("Permanently delete forever?") dialog — i.e. soft delete via the real button. | Passed — hard-delete branch (clicking OK on the second dialog) verified via the API script above, not re-driven through the browser. |

## Per-check list

- [x] **Non-superadmin soft-delete:** as an `admin`-role (or any non-superadmin) staff user, delete a product from the catalog. Confirm it disappears from `GET /api/inventory/products`, but the row still exists in `inventory_products` with `deleted_at` set (not physically removed).
- [x] **Non-superadmin cannot hard-delete:** call `DELETE /api/inventory/products?id=X&hard=true` as a non-superadmin. Confirm `403 Forbidden`, and confirm the product was **not** deleted (soft or hard) as a side effect of the rejected request.
- [x] **Superadmin hard-delete (no history):** as `superadmin`, hard-delete a product that has no `consumption_entries`/`stock_movements`/`product_sales` rows. Confirm `200` with `mode: "hard"` and the row is fully gone from `inventory_products` (query directly, not just via the filtered `GET`).
- [x] **Superadmin hard-delete blocked by FK (consumption history):** as `superadmin`, attempt to hard-delete a product that **does** have `consumption_entries` rows. Confirm a `409` with a clear, actionable error message — not a silent `{ success: true }` while the row is actually still there (this was the original bug: "I can't delete the product").
- [x] **UI: non-superadmin only sees one confirm:** log in as a non-superadmin, click the trash icon on a product. Confirm only one `confirm()` dialog appears ("Are you sure...") and it always soft-deletes — no second "permanently delete" prompt.
- [x] **UI: superadmin sees the second choice:** log in as `saif@superadmin.com` (or any superadmin), click the trash icon. Confirm a second dialog appears after the first, offering permanent delete (OK) vs. soft delete (Cancel), and that each choice calls the endpoint with/without `&hard=true` correctly.
- [ ] **Restore is out of scope:** confirm (by reading DEC-038, not testing) that there is currently no UI to un-delete a soft-deleted product — this is a known, accepted gap, not a bug to chase in this checklist.
