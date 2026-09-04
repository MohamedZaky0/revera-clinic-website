# Packages & Promotions Manual Test Checklist

> **Living document.** Update this file with dated dev evidence as each check is run.
> **Environment:** linked dev database. All current data is mock and may be reset. Use a staff
> bearer token (a real logged-in admin session) for every staff-side check below.
>
> Covers five pieces shipped 2026-07-28/29, in the order they should be tested (each depends on
> data from the last): (1) promotions actually charging the discounted price — RISK-030 in
> `ai_docs/RISKS.md`; (2) packages showing on the public site — DEC-034 in `ai_docs/DECISIONS.md`;
> (3) selling/redeeming a package from admin — DEC-035 in `ai_docs/DECISIONS.md`; (4) phone
> normalization + the existing-patient picker — RISK-032; (5) activating the "Marketing" nav
> section and extracting Promotions/re-parenting Packages — DEC-036. See `ai_docs/RISKS.md` →
> RISK-031 for a known architecture-debt item found while shipping (3), partially resolved by (5).

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| 2026-07-28 | Section 3, live test: sold a package to a real patient (3 services), booked one of the covered services, opened checkout | dev, real admin session | "Apply from package" never appeared. First suspected cause (real bug, fixed regardless): `GET /api/customers/packages` returned `customer_package_items.service_id` (a `bigint`) without the `Number(...)` coercion every other reader of this column applies — fixed in the API route and defensively at the comparison site. Retested, still failed — direct DB check (`scratch/check_hamada_package.ts`) found the **actual** cause: the test booking's phone was entered with a trailing space (`"01231456123 "`), so `POST /api/reservations`'s exact-match customer lookup (`.eq('mobile', phone)`) didn't match the existing "01231456123" customer the package was sold to and silently created a 5th duplicate "Hamada" customer instead — the booking's `customer_id` never matched the package owner's. Fixed by reusing `normalizeEgyptMobile()` (already existed in `src/lib/customerIdentity.ts`) in that lookup. | FAIL → both causes fixed, pending re-test on a fresh booking |
| 2026-07-29 | Section 1, live test: created a Promotion via the (newly-extracted) Promotions admin UI | dev, real admin session | Appeared to save in the UI but never persisted, and never showed on the public site. Direct DB check (`scratch/check_promotions.ts`) confirmed zero services had ever had a promotion in `branch_pricing`. Reproduced the exact failure directly (`scratch/test_promotion_upsert.ts`): Postgres 428C9 — `services.id` had regressed to `GENERATED ALWAYS AS IDENTITY` (see RISK-033), which rejects any upsert carrying an explicit `id`, i.e. every edit to an *existing* service. Fix written (`20260729000000_fix_services_id_identity_generation.sql`) but **not yet applied** — requires the user to run `npx supabase db push` (blocked from unattended DB migrations). | FAIL → fix written, pending migration apply + re-test |

## Per-check list

### 1. Promotions are enforced at deposit + checkout (RISK-030)

> **Run `npx supabase db push` first** (applies the pending `services.id` identity fix, RISK-033
> — without it, no promotion or service edit will actually persist, no matter what the UI shows).

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
- [ ] After redeeming, open that same patient's profile → Booking History tab → confirm the
      "Paid" column shows "0 EGP" plus a small "via {package name} (bought {date})" note, instead
      of an unexplained zero — this should stay accurate even if the package definition is later
      edited or deactivated, since it's sourced from `package_revenue_recognitions`, not the live
      package record.
- [ ] In the checkout modal's "Change" section (overpayment), confirm "Put change in customer's
      wallet" is **unchecked by default** — staff must opt in, not opt out.

### 4. Phone normalization + existing-patient picker (RISK-032)

- [ ] In "Add Manual Reservation", type a partial name or phone into the new "Select Existing
      Patient" search box → confirm matching patients from the already-loaded customer list appear,
      selecting one auto-fills name/email/phone and shows the "Linked to an existing patient
      record" note.
- [ ] Create that booking → confirm no new duplicate customer is created (check the Customers list
      count before/after), and the reservation's `customer_id` matches the selected patient's.
- [ ] Click "Unlink", then manually retype the same patient's phone number with a deliberate
      trailing space or leading `+20` → confirm the booking still resolves to the **same** existing
      customer (no duplicate), verifying the `normalizeEgyptMobile()` fix independent of the picker.
- [ ] Create a booking for a genuinely new phone number (no picker selection, no existing match) →
      confirm a new customer is still created normally (this feature is additive, not a regression
      of the fallback path).

### 5. Marketing nav section activated (DEC-036)

- [ ] As superadmin, confirm the sidebar shows "Marketing" (no longer greyed out/disabled) with a
      chevron; expanding it shows "Promotions" and "Packages"; the old standalone "Promotions"
      sidebar entry is gone.
- [ ] Click "Promotions" → confirm the same list/filters/add/edit/delete/toggle behavior as
      before the move (this must be identical — it's a pure relocation, not a rewrite).
- [ ] Click "Packages" → confirm the same `PackageAdminPanel` UI as before (previously under
      Services → "Package Offers"); confirm the Services tab bar no longer shows "Package Offers".
- [ ] As a non-superadmin role that currently has `services.*` permissions (or the literal
      `"Promotions"` permission string): confirm Marketing/Promotions/Packages are still visible —
      the permission-scope reuse (DEC-036) must not have changed who can see what.
