import { computeCommission, consumptionCost, costPerPulse } from '../src/lib/costing';

let failed = 0;
function check(label: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(52)} got=${JSON.stringify(got)} want=${JSON.stringify(want)}`);
}

check('consumption cost sums snapshots', consumptionCost([
  { qty: 2, unitCostSnapshot: 12.5 },
  { qty: 1.5, unitCostSnapshot: 8 },
]), 37);
check('empty consumption costs zero', consumptionCost([]), 0);
check('cost per pulse', costPerPulse(5000, 100000), 0.05);
check('fixed commission', computeCommission(1000, 'fixed', 150), 150);
check('percentage commission', computeCommission(1000, 'percentage', 12.5), 125);
check('combined commission', computeCommission(1000, 'both', 10, 75), 175);
check('no commission', computeCommission(1000, 'none', 100), 0);

let threw = false;
try {
  costPerPulse(100, 0);
} catch {
  threw = true;
}
check('zero rated pulses throws', threw, true);

threw = false;
try {
  consumptionCost([{ qty: -1, unitCostSnapshot: 10 }]);
} catch {
  threw = true;
}
check('negative consumption qty throws', threw, true);

console.log(failed === 0 ? '\nALL PASS' : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
