/**
 * Ledger-derived customer balances (PROPOSAL-002 Phase 1, task 1.14).
 *
 * `src/lib/billing.ts`'s `computeSettledBalances()` is the interim, delta-maintained version of
 * these same three numbers, applied against a mutable scalar on the `customers` row. This module
 * is the "this is the cutover" version task 1.14 describes: the same numbers, derived fresh from
 * `invoices` / `payments` / `wallet_txns` instead of accumulated as deltas. Pure functions only —
 * no `supabaseServer` import, matching `ledger.ts` / `packages.ts` / `costing.ts` — the caller
 * fetches the rows and this module only does the arithmetic.
 *
 * Not yet wired into any user-facing read. Per the task's own caution: "do not read from the
 * ledger for anything user-facing before this task is done and verified, or the two sources of
 * truth can disagree silently." This module and its reconciliation endpoint
 * (`GET /api/customers/reconcile`) exist to prove the ledger-derived numbers agree with the
 * existing delta-maintained scalars, not to replace what the admin UI currently reads.
 */

export interface LedgerBalances {
  outstanding: number;
  spent: number;
  wallet: number;
  /** True when a raw wallet balance went negative and was clamped — worth investigating. */
  walletClamped: boolean;
}

export interface LedgerInvoice {
  id: string;
  grandTotal: number;
  status: 'draft' | 'issued' | 'void';
}

export interface LedgerPayment {
  invoiceId: string;
  amount: number;
}

export interface LedgerWalletTxn {
  direction: 'in' | 'out';
  amount: number;
}

/**
 * Derive `outstanding` (unpaid receivables), `spent` (cash actually collected), and
 * `wallet` (net wallet credit) from raw ledger rows for one customer.
 *
 * - `outstanding` sums, per issued invoice, `max(0, grandTotal − paymentsForThatInvoice)` — an
 *   overpaid invoice contributes 0, not a negative receivable (overpayment is a wallet/credit
 *   concern, not a reduction in what other invoices owe).
 * - `spent` sums every payment against an issued invoice — this matches the existing scalar's
 *   cash-collected intent (RISK-016), not a billed/accrual figure.
 * - Draft and void invoices are excluded from both — a void invoice was never really billed.
 */
export function computeLedgerBalances(
  invoices: LedgerInvoice[],
  payments: LedgerPayment[],
  walletTxns: LedgerWalletTxn[]
): LedgerBalances {
  const issuedInvoiceIds = new Set(
    invoices.filter((invoice) => invoice.status === 'issued').map((invoice) => invoice.id)
  );

  const paidByInvoice = new Map<string, number>();
  for (const payment of payments) {
    if (!issuedInvoiceIds.has(payment.invoiceId)) continue;
    paidByInvoice.set(payment.invoiceId, (paidByInvoice.get(payment.invoiceId) || 0) + Number(payment.amount));
  }

  let outstanding = 0;
  let spent = 0;
  for (const invoice of invoices) {
    if (!issuedInvoiceIds.has(invoice.id)) continue;
    const paid = paidByInvoice.get(invoice.id) || 0;
    spent += paid;
    outstanding += Math.max(0, Number(invoice.grandTotal) - paid);
  }

  const rawWallet = walletTxns.reduce((total, txn) => {
    return total + (txn.direction === 'in' ? Number(txn.amount) : -Number(txn.amount));
  }, 0);

  return {
    outstanding: round2(outstanding),
    spent: round2(spent),
    wallet: round2(Math.max(0, rawWallet)),
    walletClamped: rawWallet < 0,
  };
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
