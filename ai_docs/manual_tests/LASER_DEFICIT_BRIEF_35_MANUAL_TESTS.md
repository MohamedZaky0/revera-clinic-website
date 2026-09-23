# Brief 35 Manual Test Checklist — Reception-Only Laser Pulse Deficit Resolution (DEC-079 / DEC-080)

> **Living document.** Update this file with dated dev evidence as each check is run.
> **Environment:** linked dev database. Requires the Brief 34B migrations (applied 2026-09-23)
> **and** `supabase/migrations/20260923000000_add_laser_deficit_resolution_to_reservations.sql`
> (written by the assistant, **owner must apply** — without it the route resolves but the marker
> never persists; the route returns an explicit 500 in that case, so checkout cannot silently
> proceed).
>
> Reasoning is in `ai_docs/DECISIONS.md` → **DEC-079 / DEC-080** and `ai_docs/RISKS.md` →
> **RISK-095 / RISK-097**. This file is just the click-through checklist.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| | | | | |

## Per-check list

### Doctor screen is record-only (DEC-079)

- [ ] Start a PACKAGE-mode laser session for a patient with an active pulses package. On the doctor's ongoing-session screen, confirm Option 3 shows **only** a "Pulses Used in This Session" input (with 500/1000/2000/5000 presets) — no package name, no balance/used/remaining display, no catalog picker, no "Buy New Package"/"Pay per Pulse" choice.
- [ ] Enter a pulse count **larger than the remaining balance**. Confirm one neutral amber line appears ("Recorded pulses exceed the package balance. Reception will resolve this at checkout.") — with no prices and no buttons.
- [ ] Complete the session from the doctor screen. Confirm `package_pulse_usage` has one row for this reservation capped at the old balance (clamped consume, unchanged), and **no** new `invoices`/`invoice_lines` rows and no `New Package:` or `Excess Laser Pulses Deficit` row in `reservation_products` were written by the doctor path.

### Reception checkout — pay-per-pulse (main checkout modal)

- [ ] With delivered = 10,000 and package balance = 5,000, open reception checkout. Confirm the deficit panel shows Delivered 10,000 / Balance 5,000 / **Deficit 5,000** above the totals.
- [ ] Try **Confirm checkout** without resolving — confirm it is blocked with an alert naming the unresolved deficit and the booking does not complete.
- [ ] Choose **Pay Per Pulse** and resolve. Confirm: exactly one `reservation_products` row (`line_type=device_pulses`, qty = deficit, unit_price = resolved rate); source package `pulses_remaining` = 0; `reservations.laser_deficit_resolution = 'PAY_PER_PULSE'`, `laser_deficit_pulses` = 5,000.
- [ ] Confirm checkout now succeeds and the invoice total includes `deficit × rate`.
- [ ] Reopen the booking — confirm the panel shows "already resolved" and no second charge can be created.

### Reception checkout — buy new package

- [ ] Repeat the scenario on a fresh booking; this time choose **Buy New Package**, pick a real catalog pulses package (e.g. 20,000 pulses @ 6,000 EGP), choose a real payment method, resolve.
- [ ] Confirm: new `customer_packages` row exists with `pulses_remaining = total − deficit`; a `payments`/`invoices` record exists for the package price under the chosen method (not hardcoded `cash`); the deficit usage row exists in `package_pulse_usage` against the **new** package; marker = `'BUY_NEW_PACKAGE'`.
- [ ] Confirm checkout completes and the invoice shows the package price.

### BookingDetailsModal end-session flow (same behavior, second surface)

- [ ] Book and start a PACKAGE-mode laser session; in the booking drawer's end-session view, confirm the same deficit panel renders above the Final Session Invoice summary.
- [ ] Confirm **Confirm & End Session** is blocked while the deficit is unresolved, then resolves identically via the panel (repeat once with each choice).

### Failure and refusal cases

- [ ] Unset the clinic default per-pulse rate AND use a booking with no `laser_price_per_pulse` snapshot and no `@ X EGP/pulse` notes — choose Pay Per Pulse → resolve fails 400 with "Per-pulse rate not configured", and nothing is written (no line, no marker).
- [ ] POST `/api/reservations/laser-deficit` twice in a row (or double-click Resolve) — the second call returns `{ alreadyResolved: true }` with the first resolution; no second invoice line or package sale.
- [ ] POST with a missing `packageId` for BUY_NEW_PACKAGE → 400, nothing sold.
- [ ] POST with a non-UUID `reservationId` → 400.
- [ ] Booking whose package has `total_pulses = 0` (quota never configured) → 400 naming the missing quota, no guessed numbers anywhere.
- [ ] Booking resolved before the marker columns (notes contain a `[Laser Package Redemption]`/`[Laser Settlement]` tag mentioning excess/deficit) → POST returns `alreadyResolved: true, resolution: 'LEGACY'`, no writes.
- [ ] Booking with **no** active package → GET/POST report `noActivePackage`, no deficit prompt, no writes.

### Regression

- [ ] A PACKAGE-mode booking whose delivered pulses fit the balance (deficit = 0) → no panel, checkout works exactly as before.
- [ ] PER_PULSE and non-laser bookings check out unchanged.
- [ ] In-booking package purchase (booking created with "purchasing new package") still auto-sells through `BookingDetailsModal` end-session as before.
