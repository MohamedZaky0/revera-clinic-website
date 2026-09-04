// Regression check for src/lib/depreciation.ts (PROPOSAL-002 Phase 3, task 3.8/3.9).
//
//   npx tsx scratch/phase3depreciationcheck.ts
//
// Run after touching src/lib/depreciation.ts.
import { monthlyDepreciation, bookValueAfter, amortizeLoanPayment } from '../src/lib/depreciation';

let failed = 0;

function check(label: string, got: number | boolean, want: number | boolean) {
  const ok = got === want;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(52)} got=${got} want=${want}`);
}

function checkThrows(label: string, fn: () => void) {
  let threw = false;
  try { fn(); } catch { threw = true; }
  if (!threw) failed++;
  console.log(`${threw ? 'PASS' : 'FAIL'}  ${label.padEnd(52)} got=${threw} want=true`);
}

// --- monthlyDepreciation ---

check(
  'straight-line: (cost - salvage) / life',
  monthlyDepreciation(50000, 5000, 60),
  750
);
checkThrows('usefulLifeMonths <= 0 throws', () => monthlyDepreciation(50000, 5000, 0));
checkThrows('salvageValue > cost throws', () => monthlyDepreciation(1000, 2000, 12));
checkThrows('negative cost throws', () => monthlyDepreciation(-100, 0, 12));

// --- bookValueAfter ---

check(
  'book value after partial depreciation',
  bookValueAfter(50000, 30000, 5000),
  20000
);
check(
  'clamps at salvageValue when accumulated exceeds cost - salvage',
  bookValueAfter(50000, 999999, 5000),
  5000
);
check(
  'zero accumulated depreciation returns full cost',
  bookValueAfter(50000, 0, 5000),
  50000
);
checkThrows('bookValueAfter: salvageValue > cost throws', () => bookValueAfter(1000, 0, 2000));

// --- amortizeLoanPayment: single-period hand-checked case ---

{
  const r = amortizeLoanPayment(10000, 12, 900); // 1%/month on 10,000 = 100 interest
  check('amortize: interestPart = balance x monthly rate', r.interestPart, 100);
  check('amortize: principalPart = installment - interest', r.principalPart, 800);
  check('amortize: balanceAfter = balance - principalPart', r.balanceAfter, 9200);
}

checkThrows('amortize: installment <= 0 throws', () => amortizeLoanPayment(10000, 12, 0));
checkThrows(
  'amortize: installment below period interest throws',
  () => amortizeLoanPayment(10000, 12, 50) // interest is 100, payment of 50 can't even cover it
);
checkThrows('amortize: negative balance throws', () => amortizeLoanPayment(-1, 12, 500));

// --- amortizeLoanPayment: final-period overshoot clamps balanceAfter at 0 ---

{
  // Only 300 left owing; a full installment would overshoot it. The final payoff is the entire
  // remaining balance (300) as principal, plus this period's interest (3) — both comfortably
  // covered by the 900 installment; principalPart clamps at the outstanding balance itself, not
  // at balance-minus-interest, since interest is a separate charge on top of paying off principal.
  const r = amortizeLoanPayment(300, 12, 900);
  check('final period: principalPart capped at remaining balance', r.principalPart, 300);
  check('final period: balanceAfter clamps at exactly 0', r.balanceAfter, 0);
}

// --- amortizeLoanPayment: zero-rate loan, full schedule sums to exactly the principal ---
//
// The regression check task 3.9 explicitly asks for: simulate a complete amortization schedule
// and confirm the sum of every period's principalPart equals the original principal exactly, not
// off by a rounding cent. A zero-rate loan removes interest rounding as a variable while still
// exercising the same telescoping-subtraction structure every period uses.
{
  const principal = 12000;
  const termMonths = 12;
  const installment = 1000; // evenly divides 12000 / 12
  let balance = principal;
  let principalSum = 0;
  for (let period = 0; period < termMonths; period++) {
    const r = amortizeLoanPayment(balance, 0, installment);
    principalSum += r.principalPart;
    balance = r.balanceAfter;
  }
  check('zero-rate full schedule: principal sums exactly', principalSum, principal);
  check('zero-rate full schedule: final balance is exactly 0', balance, 0);
}

// --- amortizeLoanPayment: nonzero-rate schedule — the telescoping identity holds generally ---
//
// Σ principalPart must equal (starting balance − final balance) by construction, regardless of
// whether the chosen installment happens to amortize the loan to exactly zero — this is the
// invariant the "derived by subtraction, never independently rounded" design is supposed to
// guarantee, checked structurally rather than against a pre-computed expected total.
{
  const startingBalance = 100000;
  const annualRate = 12;
  const installment = 4750;
  let balance = startingBalance;
  let principalSum = 0;
  for (let period = 0; period < 24; period++) {
    if (balance <= 0) break;
    const r = amortizeLoanPayment(balance, annualRate, installment);
    principalSum += r.principalPart;
    balance = r.balanceAfter;
  }
  const impliedTotal = round2(startingBalance - balance);
  // round2() the accumulated sum before comparing — each individual principalPart is exactly
  // 2-decimal-clean, but JS floating-point += across 24 additions drifts by ~1e-11 (binary floats
  // can't exactly represent most decimal fractions), the same class of drift any real caller
  // summing many periods for a report would also hit. The per-period math itself has no drift;
  // only the naive accumulation does — round the final display value, not each intermediate.
  check('nonzero-rate schedule: principal sum matches balance reduction exactly', round2(principalSum), impliedTotal);
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

console.log(failed === 0 ? '\nALL PASS' : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
