// Regression check for computeLedgerBalances (PROPOSAL-002 Phase 1, task 1.14).
//
//   npx tsx scratch/phase1balancescheck.ts
//
// Run after touching src/lib/customerBalances.ts.
import { computeLedgerBalances, type LedgerInvoice, type LedgerPayment, type LedgerWalletTxn } from '../src/lib/customerBalances';

let failed = 0;

function check(label: string, got: number | boolean, want: number | boolean) {
  const ok = got === want;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(46)} got=${got} want=${want}`);
}

// Case 1 — fully paid invoice.
{
  const invoices: LedgerInvoice[] = [{ id: 'inv1', grandTotal: 220, status: 'issued' }];
  const payments: LedgerPayment[] = [{ invoiceId: 'inv1', amount: 220 }];
  const r = computeLedgerBalances(invoices, payments, []);
  check('fully paid: outstanding is 0', r.outstanding, 0);
  check('fully paid: spent equals total', r.spent, 220);
}

// Case 2 — partially paid invoice.
{
  const invoices: LedgerInvoice[] = [{ id: 'inv1', grandTotal: 220, status: 'issued' }];
  const payments: LedgerPayment[] = [{ invoiceId: 'inv1', amount: 100 }];
  const r = computeLedgerBalances(invoices, payments, []);
  check('partial: outstanding is the remainder', r.outstanding, 120);
  check('partial: spent equals amount paid', r.spent, 100);
}

// Case 3 — overpaid invoice clamps outstanding at 0, still counts full cash collected.
{
  const invoices: LedgerInvoice[] = [{ id: 'inv1', grandTotal: 100, status: 'issued' }];
  const payments: LedgerPayment[] = [{ invoiceId: 'inv1', amount: 150 }];
  const r = computeLedgerBalances(invoices, payments, []);
  check('overpaid: outstanding clamps at 0', r.outstanding, 0);
  check('overpaid: spent counts full cash collected', r.spent, 150);
}

// Case 4 — multiple payments on one invoice sum correctly.
{
  const invoices: LedgerInvoice[] = [{ id: 'inv1', grandTotal: 300, status: 'issued' }];
  const payments: LedgerPayment[] = [
    { invoiceId: 'inv1', amount: 100 },
    { invoiceId: 'inv1', amount: 100 },
  ];
  const r = computeLedgerBalances(invoices, payments, []);
  check('multi-payment: outstanding sums both payments', r.outstanding, 100);
  check('multi-payment: spent sums both payments', r.spent, 200);
}

// Case 5 — draft and void invoices are excluded entirely.
{
  const invoices: LedgerInvoice[] = [
    { id: 'inv1', grandTotal: 220, status: 'issued' },
    { id: 'inv2', grandTotal: 999, status: 'draft' },
    { id: 'inv3', grandTotal: 999, status: 'void' },
  ];
  const payments: LedgerPayment[] = [{ invoiceId: 'inv1', amount: 100 }];
  const r = computeLedgerBalances(invoices, payments, []);
  check('draft/void excluded: outstanding only counts issued', r.outstanding, 120);
  check('draft/void excluded: spent only counts issued', r.spent, 100);
}

// Case 6 — a payment against a void invoice's id is ignored (defensive; should not occur in
// practice, but a payment row referencing a non-issued invoice must not silently count).
{
  const invoices: LedgerInvoice[] = [{ id: 'inv2', grandTotal: 999, status: 'void' }];
  const payments: LedgerPayment[] = [{ invoiceId: 'inv2', amount: 500 }];
  const r = computeLedgerBalances(invoices, payments, []);
  check('payment against void invoice ignored: outstanding', r.outstanding, 0);
  check('payment against void invoice ignored: spent', r.spent, 0);
}

// Case 7 — wallet nets in/out correctly.
{
  const wallet: LedgerWalletTxn[] = [
    { direction: 'in', amount: 200 },
    { direction: 'out', amount: 50 },
  ];
  const r = computeLedgerBalances([], [], wallet);
  check('wallet: nets in minus out', r.wallet, 150);
  check('wallet: not clamped when positive', r.walletClamped, false);
}

// Case 8 — wallet going negative clamps at 0 and flags it, rather than reporting a negative
// balance (a genuine data problem, not something to hide, but not something to crash on either).
{
  const wallet: LedgerWalletTxn[] = [
    { direction: 'in', amount: 50 },
    { direction: 'out', amount: 200 },
  ];
  const r = computeLedgerBalances([], [], wallet);
  check('wallet: clamps at 0 when net negative', r.wallet, 0);
  check('wallet: clamped flag set', r.walletClamped, true);
}

// Case 9 — no rows at all returns all zeros, no throw.
{
  const r = computeLedgerBalances([], [], []);
  check('empty: outstanding is 0', r.outstanding, 0);
  check('empty: spent is 0', r.spent, 0);
  check('empty: wallet is 0', r.wallet, 0);
}

console.log(failed === 0 ? '\nALL PASS' : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
