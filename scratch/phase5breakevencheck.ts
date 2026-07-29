// Regression check for src/lib/breakeven.ts (PROPOSAL-002 Phase 5, task 5.6).
//
//   npx tsx scratch/phase5breakevencheck.ts
import { breakEvenRevenue } from '../src/lib/breakeven';

let failed = 0;
function check(label: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(70)} got=${JSON.stringify(got)} want=${JSON.stringify(want)}`);
}
function checkTrue(label: string, ok: boolean, detail?: unknown) {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(70)}${detail !== undefined ? ' ' + JSON.stringify(detail) : ''}`);
}

// Hand-computed: fixed 4190 / ratio (102354.67/107416.67 = 0.952865...) -- same numbers used to
// verify the P&L screen's client-side break-even card (task 4B.7), confirming this library
// function agrees with that already-verified figure.
const ratio = 102354.67 / 107416.67;
check('breakEvenRevenue: matches the already-verified P&L screen figure (~4397.22)', breakEvenRevenue(4190, ratio), 4397.22);

check('breakEvenRevenue: simple round numbers (10000 fixed / 0.5 ratio)', breakEvenRevenue(10000, 0.5), 20000);
check('breakEvenRevenue: ratio of 1 (100% margin) equals fixed cost exactly', breakEvenRevenue(5000, 1), 5000);

let threwZero = false;
try {
  breakEvenRevenue(5000, 0);
} catch {
  threwZero = true;
}
checkTrue('breakEvenRevenue: throws on a zero ratio rather than returning Infinity', threwZero);

let threwNegative = false;
try {
  breakEvenRevenue(5000, -0.1);
} catch {
  threwNegative = true;
}
checkTrue('breakEvenRevenue: throws on a negative ratio', threwNegative);

console.log(failed === 0 ? '\nALL PASS' : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
