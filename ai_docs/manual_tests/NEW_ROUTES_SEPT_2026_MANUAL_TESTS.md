# New Routes Found With Zero Test Coverage (Sept 2026 Sweep) — Manual Test Checklist

Context: pulled `dev` after a ~4-week gap and re-swept the API surface for anything added since the
last test-coverage pass. Three routes had shipped with **no test coverage at all** — not even the
table-driven auth sweep's registry knew they existed: `GET /api/invoices`,
`GET/POST /api/reservations/previous`, and the `medical-records/templates` CRUD. Automated coverage
now exists (`tests/routes/invoices.test.ts`, `tests/routes/reservations-previous.test.ts`,
`tests/routes/medical-records-templates.test.ts`, plus registry rows in `auth-sweep.test.ts`). This
checklist covers what the fakes can't: real Supabase behavior, the local-file fallback on a real
filesystem, and the actual Booking Invoice Modal / Add Previous Booking UI flows.

**2026-09-17 update (RISK-087):** the wallet/outstanding allocation math behind checks 2 and 3
below was extracted from an inline block in the route into `settlePaymentMismatch()`
(`src/lib/billing.ts`) — a pure refactor, no behavior change, confirmed by the existing automated
suite passing unchanged before and after. Checks 2 and 3 still exercise it end-to-end; no new check
was needed.

## Evidence log

| # | Check | Result | Evidence | Date | Tester |
|---|---|---|---|---|---|
| 1 | Booking Invoice Modal shows the frozen invoice, not live prices | | | | |
| 2 | Add Previous Booking — new patient, underpaid | | | | |
| 3 | Add Previous Booking — existing patient, overpaid with existing debt | | | | |
| 4 | Add Previous Booking — product + package attached | | | | |
| 5 | Medical record templates — create, set default, delete | | | | |
| 6 | Medical record templates survive a server restart (local file persists) | | | | |

## Checks

- [ ] **1.** Open the Booking Invoice Modal for a completed booking, then go change that service's
      price in Settings. Reopen the modal. **Correct:** the invoice still shows the original price —
      it must not silently re-price a booking that already happened.
- [ ] **2.** Use "Add Previous Booking" for a phone number that has never booked before, entering an
      invoice value higher than the amount actually paid. Confirm: a new patient profile is created,
      the reservation shows as completed, and the patient's Outstanding balance in their profile
      matches (invoice value − amount paid).
- [ ] **3.** Use "Add Previous Booking" for an existing patient who already has an outstanding
      balance, entering a payment that exceeds this visit's cost by more than that existing debt.
      Confirm: their outstanding balance clears to zero and the excess lands in their wallet balance
      — check both figures in their profile, not just one.
- [ ] **4.** Add a previous booking with both a product and a package attached. Confirm: the product
      appears in the patient's product history, the package appears as an active package on their
      profile with the correct remaining session counts, and both product and package are visible on
      the reservation's line items (not just the service).
- [ ] **5.** In Medical Record Templates, create a new template, mark it as the default, then try to
      delete the *previous* default. Confirm the deletion succeeds now that it's no longer the
      default (only the current default should be protected). Then try deleting the new default while
      other templates remain — confirm that is blocked.
- [ ] **6.** *(2026-09-17: RISK-086 fixed — the route no longer touches the filesystem at all, so
      this check now verifies the fix rather than hunting for the original bug.)* On the actual
      deployed environment (not local `next dev`): create a new custom medical record template,
      then immediately edit it, then delete it — all three in the same session. Confirm each step
      succeeds. This is the exact sequence that used to 404 on edit/delete once Vercel's read-only
      filesystem was involved (see RISK-086); it should now just work since there is only one store
      (Supabase) left to read from.
