// Regression check for computeDerivedStockQuantity (PROPOSAL-002 Phase 2, task 2.12).
//
//   npx tsx scratch/phase2stockcheck.ts
//
// Run after touching src/lib/inventoryBalances.ts.
import { computeDerivedStockQuantity, type LedgerStockMovement } from '../src/lib/inventoryBalances';

let failed = 0;

function check(label: string, got: number, want: number) {
  const ok = got === want;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(46)} got=${got} want=${want}`);
}

check('empty movements: zero', computeDerivedStockQuantity([]), 0);

check(
  'single "in" movement: qty itself',
  computeDerivedStockQuantity([{ direction: 'in', qty: 10 }]),
  10
);

check(
  'single "out" movement: negative qty',
  computeDerivedStockQuantity([{ direction: 'out', qty: 3 }]),
  -3
);

check(
  'mixed in/out: nets correctly',
  computeDerivedStockQuantity([
    { direction: 'in', qty: 10 },
    { direction: 'out', qty: 4 },
    { direction: 'in', qty: 2 },
  ]),
  8
);

check(
  'all-out with no opening "in": stays negative, not clamped',
  computeDerivedStockQuantity([
    { direction: 'out', qty: 2 },
    { direction: 'out', qty: 5 },
  ]),
  -7
);

check(
  'fractional quantities round to 2dp',
  computeDerivedStockQuantity([
    { direction: 'in', qty: 1.005 },
    { direction: 'in', qty: 1.005 },
  ]),
  2.01
);

console.log(failed === 0 ? '\nALL PASS' : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
