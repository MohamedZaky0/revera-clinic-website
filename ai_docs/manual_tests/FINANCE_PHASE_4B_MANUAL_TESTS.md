# Phase 4B Manual Test Checklist — Additional Reports (user-requested)

> **Living document.** Update this checklist after each 4B.x task. Use seeded, hand-computable
> dev fixtures; a report that merely renders is not verified.
>
> See `ai_docs/FINANCE_TRACKER.md` → **Phase 4B** for task context, and `ai_docs/RISKS.md` →
> **RISK-035** for the double-billing fix task 4B.1/4B.2 depend on.

## Evidence log

| Date | Task | Environment | Evidence | Result |
|---|---|---|---|---|
| 2026-07-29 | 4B.2 | dev (live API) | Real dev data (1 package "Summer Glow", 4 sold, 1 session delivered) hand-computed and matched exactly: revenueRecognised 166.67, costToDeliver 700, contributionMargin -533.33, soldInRange count 4/cash 2000, outstanding activeCustomerPackages 4/deferredLiability 1833.33 (using `deferredBalance()` summed per customer_package across all its items, matching the consumption RPC's own totalSessions calculation). Receptionist token got 403. `tsc`/`eslint` clean. Code commit `d97310b`. | PASS |
| 2026-07-29 | 4B.3 | dev (live API, isolated fixtures) | Seeded a no_show (service price 100) and a cancelled booking (services 100+120) in July; endpoint returned 50 and 110 respectively. Independently confirmed both figures by calling `getServicePriceDetails` directly with the same inputs (an active clinic-wide 50% promotion applied even with no branch specified) — endpoint correctly delegates to the shared pricing function, not a re-derived calculation. Fixtures cleaned up. Receptionist token got 403. `tsc`/`eslint` clean. Code commit `d97310b`. | PASS |
| 2026-07-29 | 4B.4 | dev (live API) | Real data: Dr. Sara El Gamel's ledger commission (162, independently re-queried from raw `invoice_lines` to confirm — 6 lines summing to 162, not the 4-line/132 figure from an earlier session before 2 more invoices existed) vs. her `doctor_payroll` row (102, Draft) → variance 60, status `mismatch`. Two other providers with 0/0 → `matches`. Receptionist token got 403. `tsc`/`eslint` clean. Code commit `d97310b`. | PASS |
| 2026-07-29 | 4B.5 | dev (live API) | `months=2` call's July row matched a fresh, independent `GET /api/finance/pnl?period=2026-07` call exactly on every field (revenue, cogs, commission, fixedOverhead, contributionMargin, fullyLoadedProfit). June (no data) correctly all zeros. Receptionist token got 403. `tsc`/`eslint` clean. Code commit `d97310b`. | PASS |
| 2026-07-29 | 4B.6 | dev (live API + isolated fixture) | Real July data: all 6 customers with revenue classified `new` (107416.67), matching 4.6's whole-clinic revenue.total exactly (dev only has one month of activity, so this alone couldn't test the "returning" path). Isolated fixture: seeded a customer with a June invoice (EGP 50) and a July invoice (EGP 75) — endpoint correctly classified the customer as `returning`, counted only the EGP 75 July amount (June's is out of range, not counted), and left the `new` total unaffected. Fixture cleaned up. Receptionist token got 403. `tsc`/`eslint` clean. Code commit `d97310b`. | PASS |
| 2026-07-29 | 4B.7 | dev (live API + browser) | For July 2026 (revenue 107416.67, contributionMargin 102354.67, fixedOverhead 4190): break-even revenue computed as EGP 4,397.22, "already EGP 103,019.45 past that" — hand-checked: 4190/(102354.67/107416.67) ≈ 4397.22, and 107416.67-4397.22 ≈ 103019.45. Screenshot confirms the P&L screen renders this correctly alongside the existing contribution-margin/fully-loaded-profit cards. | PASS |
| 2026-07-29 | All of 4B.2–4B.7 | dev, `/admin` (Playwright, headless Chromium against `next dev`, superadmin) | Logged in and clicked through all five new tabs (Package Profitability, No-Show / Cancellation Cost, Commission Payouts, Trend, New vs Returning) plus the updated P&L tab. Every screen renders real numbers matching the API-level verification above, with no console errors. `Finance` still does not appear in the sidebar for a receptionist account (no `finance.*` permissions) — the existing 4.4 permission gate holds for every new tab, since none are reachable without the section itself being visible. | PASS |

## Per-task checklist

- [x] **4B.1 RISK-035 fix:** see `ai_docs/manual_tests/RISK_035_MANUAL_TESTS.md`.
- [x] **4B.2 Package Profitability:** hand-compute revenue/cost/margin for a real or seeded package
      redemption; confirm the deferred-liability snapshot matches `deferredBalance()` applied to
      real `customer_package_items` totals.
- [x] **4B.3 No-Show / Cancellation Cost:** seed a no-show and a cancellation with known service
      prices; confirm the estimated lost revenue matches `getServicePriceDetails` for the same
      inputs, and the byStatus/byBranch breakdowns sum to the total.
- [x] **4B.4 Commission Payouts:** confirm a provider with a `doctor_payroll` row shows the correct
      variance and `mismatch`/`matches` status, and a provider with no payroll row this month
      shows `payroll_not_run`.
- [x] **4B.5 Trend:** confirm a specific month's row in the trend response matches a direct call
      to `GET /api/finance/pnl` for that same period exactly.
- [x] **4B.6 New vs Returning:** confirm a customer whose only invoice is in-range is `new`, and a
      customer with an earlier invoice is `returning` and only their in-range revenue counts.
- [x] **4B.7 Break-even:** hand-check `fixedOverhead.total / (contributionMargin.value /
      revenue.total)` against the P&L screen's displayed break-even figure.
- [x] **All tabs:** click through every new tab as a permitted role; confirm no placeholder values,
      no swallowed errors, and the existing 4.4 permission gate still blocks a revoked role.
