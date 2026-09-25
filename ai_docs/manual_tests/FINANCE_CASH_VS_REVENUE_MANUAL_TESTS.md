# Finance: Cash vs Revenue Bridge and Deferred Package Balance Manual Test Checklist (DEC-088 item 9)

> **Living document.** Update the evidence log with dated results as each check is run.
> **Scope:** Finance → P&L now shows (1) a "From cash received to revenue earned" bridge under the headline tiles,
> (2) a "Package balance owed to customers" card, and the two headline tiles are labelled **"Revenue earned · الإيراد المُحقَّق"**
> (P&L) and **"Cash received · المقبوض"** (Cash Flow). New APIs: `GET /api/finance/revenue-bridge?period=&branchId=` and
> `GET /api/finance/deferred-packages`. **No database change.** Built and tested on dev; **not merged to `main`, not deployed to production.**

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| 2026-09-26 | Arithmetic: `tests/lib/financeBridge.test.ts` | local | 18 tests — the owner's example (50,000 collected, 40,000 for undelivered packages → 10,000 earned), residual "other timing" (positive and negative), lines always sum to revenue, package share of a mixed invoice, part payments, pending packages listed not counted, expired-but-deferred reported separately, the "40,000 = 30,000 pulses + 5 Underarm + 6 Full Body" breakdown | Pass |
| 2026-09-26 | Routes: `tests/routes/finance-bridge-routes.test.ts` | local | 9 — cash for the month excludes backfilled (`is_opening`), void and other-month payments (8,000 cash / 6,500 package cash from the fixture), branch filter, empty month, finance permission (403 for reception), malformed period | Pass |
| 2026-09-26 | Cards: `tests/components/Finance/FinanceBridgeCards.test.tsx` | local, jsdom | 8 — bridge rows and bilingual labels, branch passed through, residual shown, server error shown instead of a wrong bridge; deferred total + summary sentence, pending list with where to fix it, expired note, error | Pass |
| 2026-09-26 | `tsc` clean; eslint clean on the new files; full vitest 1107 passed, the same 7 unrelated failures | local | | Pass |
| 2026-09-26 | Real-data sanity, September 2026, **production** (read-only SQL replicating the routes) | production | cash received 45,950; paid for packages 44,150; package revenue recognised 0; revenue earned 1,750 (products) → bridge: 45,950 − 44,150 + 0 + **other timing −50** = 1,750. Deferred balance: **0 owed, 5 packages pending** (Randa 2, Khaled 2, Zeinab 1), 0 pulses counted | Consistent — see the findings |
| 2026-09-26 | Real-data sanity, **dev** | dev | cash 19,915; package cash 19,000; recognised 0; revenue 1,051; deferred 9,380 EGP over 93,800 pulses | Consistent |
| — | **Click-test in the real UI** (Finance → P&L: bridge, deferred card, relabelled tiles; Finance → Cash Flow tile label) | dev, browser, signed-in finance user | — | **Not run** — needs a signed-in session |

## Findings from the production numbers (2026-09-26)

- **Package cash (44,150) has no matching deferred balance.** Production has 16 live invoices carrying a `package` line
  (46,550 EGP) but only 6 `customer_packages` rows, 5 of which are price-pending and 1 fully used. So most package cash
  in September cannot be explained by packages that still exist — those invoices look like test sales whose packages were
  removed, or package invoices created without a customer package. The bridge will show 44,150 as "paid for packages, not
  yet delivered" next to a deferred card that says nothing is owed. **Needs the owner's review of the September package
  invoices before the screen is trusted on production.**
- **"Other timing" of −50** is a service-type invoice paid 50 against a 0 grand total (zero-cost package sessions).

## Checks

- [x] The bridge lines add up to the revenue figure above them (unit-tested, including rounding).
- [x] Backfilled historical invoices never enter the cash side of the bridge.
- [x] Packages with no confirmed price are listed separately, never counted as 0.
- [ ] Finance → P&L → pick a month with package sales: the bridge and the deferred card render; the "Revenue earned" tile equals the bridge's last line.
- [ ] Switch the branch filter: cash and package cash change; the deferred card stays clinic-wide (it says "all branches").
- [ ] Finance → Cash Flow: the first tile reads "Cash received · المقبوض" and equals the bridge's first line for the same month/branch.
- [ ] A reception-role user cannot load either endpoint (403) and the cards show the error instead of numbers.
- [ ] After staff enter the real invoice values for the 5 pending packages (patient profile → Packages → "Enter value"), the deferred card moves them out of "no invoice value yet" into the owed total.
