// Regression check for the RISK-012 customer-balance fix.
//
//   npx tsx scratch/billingcheck.ts
//
// There is no test runner in this project, so this stands in as an executable check for
// computeSettledBalances. Before the fix, `outstanding` only ever grew — case 2 below
// could not reduce it, and case 3 (re-firing the same PATCH) double-counted everything.
//
// Run it after touching src/lib/billing.ts.
import { computeSettledBalances, type CustomerBalances } from '../src/lib/billing';

const zero: CustomerBalances = { wallet: 0, spent: 0, outstanding: 0 };
let failed = 0;

function check(label: string, got: number, want: number) {
  const ok = got === want;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(46)} got=${got} want=${want}`);
}

// 1. Service costs 1000. Booking made, nothing paid. Patient pays 600 at checkout.
const c1 = computeSettledBalances({
  current: zero, wasCompleted: false,
  oldPaid: 0, oldLeft: 1000, newPaid: 600, newLeft: 400,
});
check('completion: spent', c1.spent, 600);
check('completion: outstanding', c1.outstanding, 400);
check('completion: wallet', c1.wallet, 0);

// 2. Patient later pays the remaining 400. THIS IS THE BUG THAT WAS FIXED.
const c2 = computeSettledBalances({
  current: { wallet: 0, spent: 600, outstanding: 400 }, wasCompleted: true,
  oldPaid: 600, oldLeft: 400, newPaid: 1000, newLeft: 0,
});
check('later payment: spent', c2.spent, 1000);
check('later payment: outstanding clears', c2.outstanding, 0);

// 3. The exact same completed PATCH fires twice — must be a no-op.
const c3 = computeSettledBalances({
  current: { wallet: 0, spent: 600, outstanding: 400 }, wasCompleted: true,
  oldPaid: 600, oldLeft: 400, newPaid: 600, newLeft: 400,
});
check('replayed PATCH: spent unchanged', c3.spent, 600);
check('replayed PATCH: outstanding unchanged', c3.outstanding, 400);

// 4. Paying partly from wallet: 1000 service, 300 from wallet, 700 cash.
const c4 = computeSettledBalances({
  current: { wallet: 500, spent: 0, outstanding: 0 }, wasCompleted: false,
  oldPaid: 0, oldLeft: 1000, newPaid: 700, newLeft: 0, walletWithdrawal: 300,
});
check('wallet pay: wallet drops', c4.wallet, 200);
check('wallet pay: spent counts both', c4.spent, 1000);
check('wallet pay: no debt', c4.outstanding, 0);

// 5. Overpayment change saved to wallet.
const c5 = computeSettledBalances({
  current: zero, wasCompleted: false,
  oldPaid: 0, oldLeft: 1000, newPaid: 1000, newLeft: 0, walletDeposit: 200,
});
check('overpay: change to wallet', c5.wallet, 200);

// 6. Wallet movement re-sent on an already-completed booking must be ignored.
const c6 = computeSettledBalances({
  current: { wallet: 500, spent: 600, outstanding: 400 }, wasCompleted: true,
  oldPaid: 600, oldLeft: 400, newPaid: 600, newLeft: 400, walletWithdrawal: 300,
});
check('replayed wallet: unchanged', c6.wallet, 500);
console.log(`${c6.walletIgnored ? 'PASS' : 'FAIL'}  ${'replayed wallet: flagged'.padEnd(46)} walletIgnored=${c6.walletIgnored}`);
if (!c6.walletIgnored) failed++;

// 7. Overpaying an existing debt must clamp at zero, not go negative.
const c7 = computeSettledBalances({
  current: { wallet: 0, spent: 600, outstanding: 400 }, wasCompleted: true,
  oldPaid: 600, oldLeft: 400, newPaid: 1200, newLeft: -200,
});
check('overpay debt: clamped', c7.outstanding, 0);
console.log(`${c7.clamped ? 'PASS' : 'FAIL'}  ${'overpay debt: flagged'.padEnd(46)} clamped=${c7.clamped}`);
if (!c7.clamped) failed++;

console.log(failed === 0 ? '\nALL PASS' : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
