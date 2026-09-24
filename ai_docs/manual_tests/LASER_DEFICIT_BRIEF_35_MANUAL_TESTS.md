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
| 2026-09-24 | Apply marker migration | dev | `db push --linked` → `20260923000000` applied; columns confirmed via `information_schema.columns` | Pass |
| 2026-09-24 | Set a test clinic default rate | dev | `page_settings.home.booking.defaultPricePerPulse = 5` | Setup |
| 2026-09-24 | PAY_PER_PULSE — first attempt | dev, disposable reservation (delivered 5,000, balance 3,000) | `500 { error: "... violates check constraint \"reservation_products_added_by_role_check\"" }` | **Failed, real bug found** |
| 2026-09-24 | Root cause + fix | — | `addedByRole: 'receptionist_checkout'` sent, but the CHECK only allows `'doctor_session'`/`'receptionist'`. Changed to `'receptionist'`. | Fixed |
| 2026-09-24 | Retry after the fix | dev, same reservation | `{ success:true, deficitPulses:0, noActivePackage:true }` — **silently reported nothing to resolve** despite a real unbilled 2,000-pulse deficit (the first attempt's consume had already drained the source package to `fully_used`) | **Failed, second real bug found** |
| 2026-09-24 | Root cause + fix | — | `computeDeficitState`'s package lookup only considers `status='active'` packages; a package this reservation already drained is invisible once `fully_used`. Added `packageAlreadyTouchedForReservation()` (queries `package_pulse_usage` by `reservation_id`) as the priority source. | Fixed |
| 2026-09-24 | Retry after both fixes | dev, same reservation | GET: `deficitPulses:2000, consumedForThisReservation:3000`. POST: `{resolution:"PAY_PER_PULSE", deficitPulses:2000, invoiceDelta:10000}`. DB: marker set, one `reservation_products` row (2000 × 5 = 10,000 EGP, `added_by_role='receptionist'`) | Pass |
| 2026-09-24 | Idempotent repeat (PAY_PER_PULSE) | dev, same reservation | `{alreadyResolved:true, resolution:"PAY_PER_PULSE"}`; `reservation_products` row count still 1 | Pass |
| 2026-09-24 | BUY_NEW_PACKAGE, fresh reservation (delivered 4,000, balance 1,000) | dev | POST → `{resolution:"BUY_NEW_PACKAGE", deficitPulses:3000, consumedFromSourcePackage:1000}`. New `customer_packages` row: `total_pulses:20000, pulses_used:3000, pulses_remaining:17000, price_paid:2000`. Real `invoices` row (`status:issued, grand_total:2000`) + `payments` row (`amount:2000, method:cash`). Marker set correctly. | Pass |
| 2026-09-24 | Idempotent repeat (BUY_NEW_PACKAGE) | dev, same reservation | `{alreadyResolved:true, resolution:"BUY_NEW_PACKAGE"}` | Pass |
| 2026-09-24 | Unauthenticated / not-found / bad UUID | dev | 401 (no token) / 404 (random UUID) / 400 (`"not-a-uuid"`) | Pass |
| 2026-09-24 | No-deficit case (delivered 500, balance 10,000) | dev | GET `deficitPulses:0`; POST consumes normally (500), writes **no** marker, **no** `reservation_products` row | Pass |
| 2026-09-24 | No-active-package case | dev, customer with zero packages | GET/POST: `noActivePackage:true, deficitPulses:0` — no fabricated deficit | Pass |
| 2026-09-24 | Unresolvable-rate refusal | dev, cleared `defaultPricePerPulse` to `null` | GET `resolvedRate:null`; POST → `400 "Per-pulse rate not configured — set it in Booking Settings."`; **package was already drained by the pre-check consume step** (known/documented ordering — see RISK-097), no marker written | Pass (refusal correct; consume-before-rate-check ordering is the accepted RISK-097 trade-off) |
| 2026-09-24 | Retry the above after configuring the rate | dev, same reservation | Correctly recomputed the deficit against the already-drained package (via the `packageAlreadyTouchedForReservation` fix) and resolved — `invoiceDelta:10000` | Pass |
| 2026-09-24 | Expired-package refusal | dev, package with `expires_at` in the past, `status='active'` | GET `expired:true`; POST → `400 "The source pulses package is expired."`; package untouched (`pulses_used:0`) — refused **before** any consume, unlike the rate case | Pass |
| 2026-09-24 | Doctor screen source check | local repo, `DoctorOngoingSessionTab.tsx` Option 3 block | Delivered-pulses input + 500/1000/2000/5000 presets; when `packageDeficit > 0`, one neutral amber line ("Recorded pulses exceed the package balance. Reception will resolve this at checkout."); no package name/balance/price/choice anywhere in the block | Pass |
| 2026-09-24 | Test-data cleanup | dev | All disposable customers/reservations/customer_packages/invoices/payments/invoice_lines/reservation_products deleted; `count(*)` on the 5 test mobile numbers = 0 | Pass |
| 2026-09-24 | Full regression | local repo | `tsc` 0 errors, `vitest` 1037/5 (unaffected by the 2 fixes), `eslint` 0 errors, `next build` succeeds | Pass |

**Not done in this pass:** the browser click-through items below (opening the actual Checkout
modal / BookingDetailsModal end-session panel and clicking through `LaserDeficitPrompt`, starting a
real doctor session end-to-end). The route itself — every branch, every failure mode, and the two
real bugs found — was exercised directly and thoroughly at the API/DB level instead, which is what
surfaced both defects; the UI wiring (`LaserDeficitPrompt`'s render gate, the pre-money-write GET
check) was confirmed by source review, not by clicking. Left as an explicit follow-up.

## Per-check list

### Doctor screen is record-only (DEC-079)

- [x] Start a PACKAGE-mode laser session for a patient with an active pulses package. On the doctor's ongoing-session screen, confirm Option 3 shows **only** a "Pulses Used in This Session" input (with 500/1000/2000/5000 presets) — no package name, no balance/used/remaining display, no catalog picker, no "Buy New Package"/"Pay per Pulse" choice. *(Confirmed by direct source read, not a live click-through — see Evidence log.)*
- [x] Enter a pulse count **larger than the remaining balance**. Confirm one neutral amber line appears ("Recorded pulses exceed the package balance. Reception will resolve this at checkout.") — with no prices and no buttons. *(Confirmed by source read.)*
- [ ] Complete the session from the doctor screen. Confirm `package_pulse_usage` has one row for this reservation capped at the old balance (clamped consume, unchanged), and **no** new `invoices`/`invoice_lines` rows and no `New Package:` or `Excess Laser Pulses Deficit` row in `reservation_products` were written by the doctor path. *(Not done — needs a live doctor-session click-through.)*

### Reception checkout — pay-per-pulse (main checkout modal)

- [x] With delivered = 10,000 and package balance = 5,000, open reception checkout. Confirm the deficit panel shows Delivered 10,000 / Balance 5,000 / **Deficit 5,000** above the totals. *(Equivalent server-side math verified directly against the route: delivered 5,000/balance 3,000 → deficit 2,000, and delivered 4,000/balance 1,000 → deficit 3,000. UI rendering of the panel itself not click-tested.)*
- [ ] Try **Confirm checkout** without resolving — confirm it is blocked with an alert naming the unresolved deficit and the booking does not complete. *(Not click-tested; the underlying GET-check gate was confirmed present in `page.tsx` by source review.)*
- [x] Choose **Pay Per Pulse** and resolve. Confirm: exactly one `reservation_products` row (`line_type=device_pulses`, qty = deficit, unit_price = resolved rate); source package `pulses_remaining` = 0; `reservations.laser_deficit_resolution = 'PAY_PER_PULSE'`, `laser_deficit_pulses` matches. (Done via direct API call, not the UI button — see Evidence log.)
- [ ] Confirm checkout now succeeds and the invoice total includes `deficit × rate`. *(Not click-tested — this is the main Checkout modal's own invoice total, not the deficit route's own response, which was verified.)*
- [x] Reopen the booking — confirm the panel shows "already resolved" and no second charge can be created. *(Verified via a direct repeat POST — `alreadyResolved:true`, no duplicate row — not via re-opening the UI panel.)*

### Reception checkout — buy new package

- [x] Repeat the scenario on a fresh booking; this time choose **Buy New Package**, pick a real catalog pulses package, choose a real payment method, resolve. *(Done via direct API call — see Evidence log.)*
- [x] Confirm: new `customer_packages` row exists with `pulses_remaining = total − deficit`; a `payments`/`invoices` record exists for the package price under the chosen method (not hardcoded `cash`); the deficit usage row exists in `package_pulse_usage` against the **new** package; marker = `'BUY_NEW_PACKAGE'`.
- [ ] Confirm checkout completes and the invoice shows the package price. *(The package-sale invoice itself was confirmed; the surrounding Checkout modal's own display was not click-tested.)*

### BookingDetailsModal end-session flow (same behavior, second surface)

- [ ] Book and start a PACKAGE-mode laser session; in the booking drawer's end-session view, confirm the same deficit panel renders above the Final Session Invoice summary. *(Not done — needs a live click-through of this specific surface.)*
- [ ] Confirm **Confirm & End Session** is blocked while the deficit is unresolved, then resolves identically via the panel (repeat once with each choice). *(Not done.)*

### Failure and refusal cases

- [x] Unset the clinic default per-pulse rate AND use a booking with no `laser_price_per_pulse` snapshot and no `@ X EGP/pulse` notes — choose Pay Per Pulse → resolve fails 400 with "Per-pulse rate not configured", and nothing is written (no line, no marker). Note: the source package's clamped consume step still runs before this check (documented RISK-097 ordering) — confirmed the retry after configuring the rate now recovers correctly.
- [x] POST `/api/reservations/laser-deficit` twice in a row — the second call returns `{ alreadyResolved: true }` with the first resolution; no second invoice line or package sale. (Verified for both choices.)
- [ ] POST with a missing `packageId` for BUY_NEW_PACKAGE → 400, nothing sold. *(Not done this pass.)*
- [x] POST with a non-UUID `reservationId` → 400.
- [ ] Booking whose package has `total_pulses = 0` (quota never configured) → 400 naming the missing quota, no guessed numbers anywhere. *(Not done this pass — covered by Brief 34B's equivalent test for the underlying RPC.)*
- [ ] Booking resolved before the marker columns (notes contain a `[Laser Package Redemption]`/`[Laser Settlement]` tag mentioning excess/deficit) → POST returns `alreadyResolved: true, resolution: 'LEGACY'`, no writes. *(Not done this pass — covered by the automated route test suite.)*
- [x] Booking with **no** active package → GET/POST report `noActivePackage`, no deficit prompt, no writes.

### Regression

- [x] A PACKAGE-mode booking whose delivered pulses fit the balance (deficit = 0) → no panel, checkout works exactly as before. (Verified at the API level — no marker, no extra line, normal consume.)
- [ ] PER_PULSE and non-laser bookings check out unchanged. *(Not done this pass — out of this route's scope; unaffected by these changes.)*
- [ ] In-booking package purchase (booking created with "purchasing new package") still auto-sells through `BookingDetailsModal` end-session as before. *(Not done this pass.)*
