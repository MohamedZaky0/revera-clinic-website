// Regression check for the RISK-011 branch-pricing fix.
//
//   npx tsx scratch/pricecheck.ts
//
// There is no test runner in this project, so this stands in as an executable check for
// getEffectiveServicePrice. It is meaningful, not decorative: before the fix, the first
// case below returned 800 (the isDefault entry) instead of 1200, because a branch UUID was
// used as if it were a branch name and never matched any branchPricing entry.
//
// Run it after touching anything in src/lib/services.ts price resolution.
import { getEffectiveServicePrice } from '../src/lib/services';

const branches = [
  { id: '11111111-2222-3333-4444-555555555555', name_en: 'New Cairo', name_ar: 'القاهرة الجديدة' },
  { id: '99999999-8888-7777-6666-555555555555', name_en: 'Sheikh Zayed', name_ar: 'الشيخ زايد' },
];

const service = {
  price: 1000,
  branchPricing: [
    { name: 'New Cairo', price: 1200, isDefault: false },
    { name: 'Sheikh Zayed', price: 800, isDefault: true },
  ],
};

const cases: Array<[string, number, number]> = [
  ['UUID of New Cairo + list', getEffectiveServicePrice(service, branches[0].id, branches), 1200],
  ['UUID of Sheikh Zayed + list', getEffectiveServicePrice(service, branches[1].id, branches), 800],
  ['name passed directly', getEffectiveServicePrice(service, 'New Cairo'), 1200],
  ['name via list', getEffectiveServicePrice(service, 'Sheikh Zayed', branches), 800],
  ['arabic name via list', getEffectiveServicePrice(service, 'القاهرة الجديدة', branches), 1200],
  ['unknown UUID -> isDefault', getEffectiveServicePrice(service, '00000000-0000-0000-0000-000000000000', branches), 800],
  ['no branch -> isDefault', getEffectiveServicePrice(service, null, branches), 800],
  ['no branchPricing at all', getEffectiveServicePrice({ price: 1000, branchPricing: null }, branches[0].id, branches), 1000],
  ['branchPricing as {} object', getEffectiveServicePrice({ price: 1000, branchPricing: {} as any }, branches[0].id, branches), 1000],
];

let failed = 0;
for (const [label, got, want] of cases) {
  const ok = got === want;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(30)} got=${got} want=${want}`);
}

const promo = {
  price: 1000,
  branchPricing: [
    { name: 'New Cairo', price: 1000, isDefault: true, promotion: { enabled: true, type: 'percentage', value: 25 } },
  ],
};
const p = getEffectiveServicePrice(promo, branches[0].id, branches);
console.log(`${p === 750 ? 'PASS' : 'FAIL'}  ${'25% promo on branch price'.padEnd(30)} got=${p} want=750`);
if (p !== 750) failed++;

console.log(failed === 0 ? '\nALL PASS' : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
