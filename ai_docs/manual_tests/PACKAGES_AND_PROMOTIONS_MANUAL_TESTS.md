# Packages & Promotions Manual Test Checklist

> **Living document.** Update this file with dated dev evidence as each check is run.
> **Environment:** linked dev database. All current data is mock and may be reset. Use a staff
> bearer token (a real logged-in admin session) for every staff-side check below.
>
> Covers three pieces shipped 2026-07-28, in the order they should be tested (each depends on data
> from the last): (1) promotions actually charging the discounted price — RISK-030 in
> `ai_docs/RISKS.md`; (2) packages showing on the public site — DEC-034 in `ai_docs/DECISIONS.md`;
> (3) selling/redeeming a package from admin — DEC-035 in `ai_docs/DECISIONS.md`. See
> `ai_docs/RISKS.md` → RISK-031 for a known architecture-debt item found while shipping (3),
> unrelated to correctness.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| 2026-07-28 | Section 3, live test: sold a package to a real patient (3 services), booked one of the covered services, opened checkout | dev, real admin session | "Apply from package" never appeared — no checkbox, no deposit-conflict note either, for a booking confirmed tied to the correct customer (no duplicate customer record). Root-caused to `src/app/api/customers/packages/route.ts` returning `customer_package_items.service_id` (a `bigint` column) without the `Number(...)` coercion every other reader of this column already applies (`packages/route.ts`, 4 call sites) — so `it.serviceId === id` in the checkout modal's redeemable-item match always failed on a type mismatch. Fixed: coerced in the API route, and defensively coerced both sides again at the comparison site in `admin/page.tsx`. | FAIL → fixed, pending re-test |

## Per-check list

### 1. Promotions are enforced at deposit + checkout (RISK-030)

- [ ] In admin → Services → Promotions, set an active percentage or fixed discount on one service
      at one branch.
- [ ] Book that service for that branch through the public site. Confirm the Step 2/3 deposit
      breakdown in `BookingModal` shows the **discounted** price, and after "paying" the deposit,
      the reservation's `amount_paid`/`amount_left` in the DB reflect the discounted total.
- [ ] In admin, open a `pending_deposit` booking for that same service/branch → confirm "Mark
      Deposit as Paid" shows and charges the discounted deposit.
- [ ] Complete a checkout for that service → confirm the resulting `invoices`/`invoice_lines` rows
      have a non-zero `discount`/`discount_total`, with `unit_price` equal to the pre-discount
      price and `line_total` equal to what was actually charged.

### 2. Packages show on the public site (DEC-034)

- [ ] In admin → Services → Package Offers, create a package with an Arabic name, "Show on
      Website" checked, "Active" checked, priced below the sum of its included services' prices.
- [ ] Visit `/` and `/services` → confirm the new Packages section appears right after Services,
      showing a "SAVE X EGP" badge, and that name/items/CTA text switch correctly with the site's
      language toggle.
- [ ] Uncheck "Show on Website" (keep "Active" checked) → confirm the package disappears from
      both public pages but is still usable in admin/POS (`active` unaffected — confirms the two
      flags are properly decoupled).
- [ ] Click the CTA → confirm it opens WhatsApp with a message mentioning the package name.
- [ ] Create a package priced at or above its à la carte total → confirm it shows a plain price
      with no savings badge.

### 3. Selling and redeeming a package from admin (DEC-035)

- [ ] From a customer's profile → new "Packages" tab, click "Sell Package to Patient", pick an
      active package, confirm it sells (an `invoices`/`invoice_lines`/`payments` row is created,
      same as any other sale) and appears under "Active" with correct remaining counts per
      service.
- [ ] Open that customer's booking detail drawer for one of the package's included services →
      confirm the informational banner shows the active package (and any active promotion on that
      service, from check 1).
- [ ] Start a manual booking creation for that same customer's phone number → confirm the same
      banner appears once the phone lookup resolves a match, and once a service is picked.
- [ ] Complete that booking through checkout with **no deposit collected** → confirm "Apply from
      package" is offered on the matching line, checking it removes that line's price from the
      total, the completing PATCH still succeeds, and afterward:
  - [ ] The package's `qty_remaining` for that service decremented by 1 (recheck the Packages tab).
  - [ ] A `package_revenue_recognitions` row exists for that reservation.
  - [ ] `customers.spent_amount`/`outstanding` reflect only the non-redeemed amount actually
        charged.
- [ ] Repeat with a booking that already has a deposit paid → confirm "Apply from package" is
      **not** offered, and the explanatory note about deposits is shown instead.
- [ ] Confirm a line with an active promotion (check 1) shows its badge in the checkout modal
      alongside/independent of any package redemption checkbox, and that a redeemed line is not
      also discounted by its promotion (redemption fully waives the line — it's one or the other,
      never both, on the same line).
- [ ] Force a redemption failure (e.g. redeem the last remaining session for a service twice in
      quick succession from two tabs) → confirm the checkout still completes and charges
      correctly, and staff see a clear alert naming the failed redemption rather than a silent
      failure or a rolled-back checkout.
