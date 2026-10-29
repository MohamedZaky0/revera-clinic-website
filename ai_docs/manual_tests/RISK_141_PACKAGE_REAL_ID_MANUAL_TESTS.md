# RISK-141 — Historical-Booking Packages Read By Real Id, Not Notes Text — Manual Test Checklist

> **Living document.** Update with dated evidence as each check is run.
> Full reasoning: `ai_docs/RISKS.md` -> **RISK-141**. Precedent: RISK-038/RISK-057 (same defect class for products).
> Requires migration `20261026000000_add_package_links_to_reservation_products.sql` applied first — it is UNAPPLIED.
> Everything below needs a real logged-in browser and dev DB access; none of it has been run yet.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| | | | | |

## Stopgap (Part D — already on `dev`)
- [ ] Edit Previous Booking on a booking whose package name no longer matches any catalog or patient package (rename a catalog package, record a booking, then edit it): no `invalid input syntax for type uuid` crash — the unmatched package card shows the amber warning and the rest of the booking saves.
- [ ] Same scenario where the package name matches nothing at all: booking saves without the package, warning visible.

## New booking writes real ids (needs migration applied)
- [ ] Add Previous Booking with a **catalog** package: in `reservation_products`, the `Package: …` row has `package_id` = the catalog id and `customer_package_id` NULL.
- [ ] Add Previous Booking attaching an **existing patient package**: the row has both `package_id` and `customer_package_id`.
- [ ] Edit that booking (change service/date/payment, leave the package alone), save, reopen: exactly ONE `Package:` line exists and still carries the ids — no duplicates.

## Read by id, not by name
- [ ] Rename the package in Admin → Packages, then Edit the booking again: the attached package shows the **new** catalog name (proves it's read by id, not the stale text in notes).
- [ ] For a booking created after this fix, blank out `reservations.notes` in the DB, then Edit: the package still loads correctly with zero notes parsing involved.

## Fallback still works for pre-migration rows
- [ ] A booking whose package line was written before the migration (`package_id` NULL, `description` = `Package: <name>` matching the catalog): Edit loads the package via the fallback and saves fine — and the re-save replaces the legacy line with an id-linked one (no duplicate `Package:` rows).
- [ ] A pre-migration booking whose package name matches nothing: warning shown, rest of the booking saves, no crash.

## Non-package lines untouched
- [ ] A booking with a product attached: after Edit+save the product `reservation_products` rows are unchanged (delete only targets `additional_service` package rows).
- [ ] A live (non-historical) booking: PATCH /api/reservations/previous still rejects it with 409 — doctor-session add-ons are never touched.

## Regressions to look for
- [ ] Customer packages, pulse usage audit rows, wallet/balance settlement and the invoice behave exactly as before on create and edit (the new code path only touches `reservation_products` rows).
- [ ] Invoice line for the package still renders the `Package: <name>` description.
