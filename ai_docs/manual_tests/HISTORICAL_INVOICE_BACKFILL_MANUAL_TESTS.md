# Historical Invoice Backfill Manual Test Checklist (DEC-086)

> **Living document.** Update the evidence log with dated results as each check is run.
> **Dry run (read-only):** `scripts/backfill_historical_invoices_dry_run.sql` — run it first, same command.
> **Never make a dry run by editing the final SELECT of the real script** — Postgres executes
> data-modifying CTEs even when the final SELECT does not reference them, so that WRITES (this is what
> happened on dev on 2026-09-25; see the evidence log).
> **Script:** `scripts/backfill_historical_invoices.sql` — run as ONE statement:
> `npx supabase db query --linked -f scripts/backfill_historical_invoices.sql`
> (add `--project-ref <ref>` for production).
> **Production apply has not been run.** Compare the dry run against the expected list below first.
> Rollback: `DELETE FROM invoices WHERE is_opening AND <backfill filter>` (lines/payments cascade) —
> backfilled rows are the only ones with an `[historical backfill]` line description.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| 2026-09-25 | Dry run lists candidates with correct parsed totals/descriptions/methods | dev, 4 seeded historical bookings | Service 1,200 (visa), package 3,000 with paid 1,000, zero-value 0, product 500; descriptions parsed from the note tags | Pass |
| 2026-09-25 | Apply | dev | 3 invoices + 3 lines + 3 payments; zero-value booking skipped. The "apply" summary printed 0 because the earlier "dry run" (real script with the final SELECT swapped) had ALREADY written the rows — data-modifying CTEs run regardless. Dev-only, test data; production was not touched. Real read-only dry-run script added | Pass (dry-run method was wrong, now fixed) |
| 2026-09-25 | Ledger vs customer scalars | dev | ledger spent 2,200 = `spent_amount` 2,200; ledger outstanding 2,000 = `outstanding` 2,000 | Pass |
| 2026-09-25 | Idempotency: re-run | dev | No new invoices; exactly 1 invoice per priced booking | Pass |
| 2026-09-25 | Overpaid product booking (total 500, paid 800, Instapay) | dev | Invoice 500, payment 800 `instapay`, line type `product`, `service_id` null | Pass |
| 2026-09-25 | All backfilled rows flagged | dev | every invoice and payment `is_opening = true`; no `transactions` rows added | Pass |
| 2026-09-25 | Test data cleaned | dev | 3 invoices, 4 reservations, 1 customer deleted | Pass |
| 2026-09-25 | Dry run on production (read-only script) | production | 7 WOULD CREATE = 4,000 + 1,200 + 1,200 + 5,000 + 1,200 + 2,000 + 2,000 = 16,600 EGP (dates 04-16 .. 08-13); 6 SKIP (zero). Production invoices 29 before and 29 after, 0 opening rows — nothing written. `zaki` (not historical) not in the list | Pass |
| — | `GET /api/customers/reconcile` shows no drift for the backfilled customers | production/dev with a real staff session | — | Not run (needs a signed-in session) |
| 2026-09-25 | Audit: which invoice readers honour `is_opening` | code + prod DB | Before: none did (only assets/expenses/loans). No views/functions/triggers on invoices/payments. Prod ledger: 29 invoices, all 2026-09, none opening | Finding |
| 2026-09-25 | 8 finance routes now exclude `is_opening` (pnl, trend, branch-pnl, service-mix, service-margin, doctor-pnl, cashflow, new-vs-returning) | local | `tests/routes/finance-opening-invoices.test.ts`: pnl/cashflow tests fail without the filter (6,200 vs 1,200), pass with it; source guard covers all 8; tsc/eslint clean | Pass |
| 2026-09-25 | **Production apply** (real script, after the read-only dry run; finance exclusion already deployed on main) | production | invoices 29→36, invoice_lines 29→36, 7 `is_opening` invoices + 7 `is_opening` payments, `transactions` 32→32 (untouched), 6 zero-value skipped, 0 reservations with more than one invoice. Invoices by month: Apr 5,200 / May 1,200 / Jun 6,200 / Jul 2,000 / Aug 2,000 (all opening) + Sep 29 live 48,300 | Pass |
| 2026-09-25 | Ledger vs sources for the 3 customers | production | ledger spent = `reservations.amount_paid` = `transactions` payments for all three (Randa 6,400, Khaled 5,200, Zeinab 5,000), outstanding 0. **But `customers.spent_amount` disagrees for 2 of 3**: Zeinab 10,000 (ledger 5,000), Khaled 1,200 (ledger 5,200); Randa matches. Scalars were NOT touched by the backfill — pre-existing drift (RISK-012 family) | Finding — review, see below |
| 2026-09-25 | `customers.spent_amount` set to the ledger figure for the 2 drifted customers (owner decision: trust the ledger) | production, guarded UPDATE by id + old value | Zeinab 10,000 → 5,000, Khaled 1,200 → 5,200; Randa unchanged 6,400; all three now equal ledger, `reservations.amount_paid` and `transactions` | Pass |
| 2026-09-25 | Finance inputs audited from production data (Finance UI not opened: no signed-in session) | production, read-only SQL | Found the reporting gaps in RISK-104 (pulses revenue never recognised, 7,800 of manual payments not on the ledger, no doctor attribution, empty cost side) | Finding |
| — | Finance screens show unchanged revenue/cash for Apr–Aug after the production backfill | production, browser (signed-in finance user) | — | **Not run** — needs a signed-in session |

## Checks

- [x] Dry run prints the expected candidates and writes nothing.
- [x] Apply creates one invoice, one line and (if paid > 0) one payment per priced booking.
- [x] Zero-total bookings are skipped, not given empty invoices.
- [x] Re-running is a no-op.
- [x] Ledger `spent`/`outstanding` equal the customer row after backfill.
- [x] Overpaid booking: invoice = total, payment = amount paid, no debt shown.
- [x] Run the dry run on production and confirm the candidate list before applying.
- [ ] After a production apply, open each backfilled customer's profile and confirm spent/outstanding are unchanged.
- [x] Finance revenue/cash reports exclude `is_opening` invoices (route tests + source guard).
- [ ] After a production apply, open Finance → P&L / Cash Flow / Service Mix for April–August and confirm revenue and cash stay at 0 for those months.
- [ ] `GET /api/customers/reconcile` reports no drift for the backfilled customers.

## Add Previous Booking now writes its own invoice (RISK-102 fix)

Automated: `tests/routes/reservations-previous-invoice.test.ts` (15 tests: paid in full, part-paid package, zero value
skipped, value-less fallback to paid, overpaid product, unpaid balance, failure reported without failing the booking,
payment-method mapping); the route tests fail without the change. Live UI click-test not done (needs a signed-in session).

- [ ] Admin → Add Previous Booking: service booking, value 1,200, paid 1,200, method Visa. Booking saves and customer spent rises by 1,200. `select * from invoices where reservation_id = <id>` → 1 invoice, `is_opening = true`, 1,200, dated the booking date; 1 payment 1,200 `card`.
- [ ] Value 3,000, paid 1,000 (package): invoice 3,000, payment 1,000, customer `outstanding` +2,000 and ledger outstanding also 2,000.
- [ ] Value 0 and paid 0: booking saves, no invoice.
- [ ] `GET /api/customers/reconcile` shows no drift for a customer whose history was all entered through this screen.
- [ ] Finance → P&L / Cash Flow for the booking's month do not move.
