# RISK-035 Manual Test Checklist — Package Redemption Double-Billing

> **Living document.** Update this file with dated dev evidence as each check is run.
> **Environment:** linked dev database. All current data is mock and may be reset. Use a staff
> bearer token for every staff-side check below.
>
> Full reasoning and code pointers are in `ai_docs/RISKS.md` → **RISK-035**. This file is just the
> click-through checklist referenced from there.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| 2026-07-29 | Automated end-to-end check | dev (live API, `scratch/risk035_check.ts`) | Isolated service/customer/reservation fixture, completed checkout with `redeemedServiceIds` set: invoice written (audit trail preserved), `line_total`/`grand_total` both 0, `cogs_snapshot` still computed correctly, no `payments` row created, `GET /api/finance/receivables-aging` does not list it as outstanding. 10/10 assertions pass. Fixtures cleaned up. | PASS |
| 2026-07-29 | No-regression check | dev (live API) | A normal checkout with no `redeemedServiceIds` for a fresh fixture still charges full price: `grand_total` 250, `line_total` 250, `discount` 0, a `payments` row for 250 created. Unaffected by this change. | PASS |
| 2026-07-29 | Pre-existing bad data corrected | dev (direct query) | The one real package redemption in dev (`INV-000021`, reservation `962bfb01-...`) had its line/invoice totals corrected in place to match what the fix now produces (`line_total`/`grand_total` zeroed, `cogs_snapshot` 700 untouched). | PASS |
| | Full admin-UI click-through (see checklist below) | dev, `/admin` | | PENDING |

## Per-check list

- [x] Automated: isolated fixture, checkout with `redeemedServiceIds`, confirm invoice line is
      written at list price with a full discount (`line_total: 0`), `cogs_snapshot` still
      populated, no payment row created.
- [x] Automated: confirm `GET /api/finance/receivables-aging` does not list the redeemed invoice
      as an outstanding balance.
- [x] Automated: confirm a normal (non-redeemed) checkout is unaffected — still charges full price
      and creates a real payment row.
- [ ] **Live admin UI:** sell a package to a real test patient via the admin Packages flow
      (`POST /api/packages/sell`), confirming the package's `customer_package_items` are created
      with the right `qty_total`.
- [ ] Book and approve a reservation for a service covered by that package.
- [ ] At checkout, select the package redemption for that service (the UI already supports this —
      `redeemedPackageItems` in `admin/page.tsx`'s checkout modal) and complete the booking with
      the redeemed amount excluded from what's charged.
- [ ] Confirm the checkout completes successfully and, if a `redeemedPackageItems` entry existed,
      `/api/packages/consume` also succeeds (no "package redemption failed, please reconcile
      manually" alert).
- [ ] Query the resulting invoice directly: confirm `grand_total` is 0 for a fully-redeemed single-
      service booking (or correctly reduced for a mixed booking with some redeemed, some paid
      services), the redeemed line's description reads "(package redemption)", and its
      `cogs_snapshot`/`commission_snapshot` are populated if the service has a configured recipe.
- [ ] Open the Finance → P&L report for that period: confirm the package's revenue appears once
      (via `revenue.packageRecognised`), not twice.
- [ ] Open the Finance → Receivables Aging report: confirm the redeemed visit does **not** appear
      as an outstanding balance for that patient.
- [ ] Confirm the patient's remaining package balance (`qty_remaining` on `customer_package_items`)
      decremented correctly and is visible in their customer profile.
- [ ] Repeat with a **mixed** booking (one service redeemed via package, a second service paid in
      full in the same visit) — confirm the invoice has two lines, only the redeemed one is
      zeroed, `grand_total` equals just the paid service's price, and a `payments` row exists for
      exactly that amount.
