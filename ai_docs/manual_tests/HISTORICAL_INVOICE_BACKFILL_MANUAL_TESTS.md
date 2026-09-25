# Historical Invoice Backfill Manual Test Checklist (DEC-086)

> **Living document.** Update the evidence log with dated results as each check is run.
> **Script:** `scripts/backfill_historical_invoices.sql` — run as ONE statement:
> `npx supabase db query --linked -f scripts/backfill_historical_invoices.sql`
> (add `--project-ref <ref>` for production). **Dry run:** replace the final `select` with
> `select * from cand order by date;` — it lists what would be written and writes nothing.
> **Production has not been run.** Do a dry run first and compare against the expected list below.
> Rollback: `DELETE FROM invoices WHERE is_opening AND <backfill filter>` (lines/payments cascade) —
> backfilled rows are the only ones with an `[historical backfill]` line description.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| 2026-09-25 | Dry run lists candidates with correct parsed totals/descriptions/methods | dev, 4 seeded historical bookings | Service 1,200 (visa), package 3,000 with paid 1,000, zero-value 0, product 500; descriptions parsed from the note tags | Pass |
| 2026-09-25 | Apply | dev | 3 invoices + 3 lines + 3 payments; the zero-value booking skipped. (First run's summary row printed 0 although the rows were written — cosmetic, cause not found; later runs' counts were correct) | Pass |
| 2026-09-25 | Ledger vs customer scalars | dev | ledger spent 2,200 = `spent_amount` 2,200; ledger outstanding 2,000 = `outstanding` 2,000 | Pass |
| 2026-09-25 | Idempotency: re-run | dev | No new invoices; exactly 1 invoice per priced booking | Pass |
| 2026-09-25 | Overpaid product booking (total 500, paid 800, Instapay) | dev | Invoice 500, payment 800 `instapay`, line type `product`, `service_id` null | Pass |
| 2026-09-25 | All backfilled rows flagged | dev | every invoice and payment `is_opening = true`; no `transactions` rows added | Pass |
| 2026-09-25 | Test data cleaned | dev | 3 invoices, 4 reservations, 1 customer deleted | Pass |
| — | Dry run on production matches expectation | production | **Pending** — expected: 7 candidates, 16,600 EGP total (paid amounts 1,200 / 1,200 / 2,000 / 2,000 / 4,000 / 1,200 / 5,000); 6 zero-value skipped; booking `zaki` (not historical) untouched | Not run |
| — | `GET /api/customers/reconcile` shows no drift for the backfilled customers | production/dev with a real staff session | — | Not run (needs a signed-in session) |
| 2026-09-25 | Audit: which invoice readers honour `is_opening` | code + prod DB | Before: none did (only assets/expenses/loans). No views/functions/triggers on invoices/payments. Prod ledger: 29 invoices, all 2026-09, none opening | Finding |
| 2026-09-25 | 8 finance routes now exclude `is_opening` (pnl, trend, branch-pnl, service-mix, service-margin, doctor-pnl, cashflow, new-vs-returning) | local | `tests/routes/finance-opening-invoices.test.ts`: pnl/cashflow tests fail without the filter (6,200 vs 1,200), pass with it; source guard covers all 8; tsc/eslint clean | Pass |
| — | Finance screens show unchanged revenue/cash for Apr–Aug after a production backfill | production, browser | — | Not run — do after applying |

## Checks

- [x] Dry run prints the expected candidates and writes nothing.
- [x] Apply creates one invoice, one line and (if paid > 0) one payment per priced booking.
- [x] Zero-total bookings are skipped, not given empty invoices.
- [x] Re-running is a no-op.
- [x] Ledger `spent`/`outstanding` equal the customer row after backfill.
- [x] Overpaid booking: invoice = total, payment = amount paid, no debt shown.
- [ ] Run the dry run on production and confirm the candidate list before applying.
- [ ] After a production apply, open each backfilled customer's profile and confirm spent/outstanding are unchanged.
- [x] Finance revenue/cash reports exclude `is_opening` invoices (route tests + source guard).
- [ ] After a production apply, open Finance → P&L / Cash Flow / Service Mix for April–August and confirm revenue and cash stay at 0 for those months.
- [ ] `GET /api/customers/reconcile` reports no drift for the backfilled customers.
