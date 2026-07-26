// Regression check for the Phase 1 ledger arithmetic (src/lib/ledger.ts).
//
//   npx tsx scratch/phase1ledgercheck.ts
//
// Run this after touching src/lib/ledger.ts. See ai_docs/FINANCE_TRACKER.md task 1.9.
import { buildInvoiceLine, buildInvoiceTotals, taxPortion, formatInvoiceNo } from '../src/lib/ledger';

let failed = 0;
function check(label: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(46)} got=${JSON.stringify(got)} want=${JSON.stringify(want)}`);
}

// 1. A simple service line.
const l1 = buildInvoiceLine({ lineType: 'service', description: 'Laser Full Body', qty: 1, unitPrice: 1200, serviceId: 5, providerId: 'doc-1' });
check('simple line total', l1.line_total, 1200);
check('simple line keeps service_id', l1.service_id, 5);
check('simple line keeps provider_id', l1.provider_id, 'doc-1');
check('simple line has null product_id', l1.product_id, null);

// 2. A discounted product line.
const l2 = buildInvoiceLine({ lineType: 'product', description: 'Moisturizer', qty: 2, unitPrice: 150, discount: 50, productId: 'prod-1' });
check('discounted line total (2*150-50)', l2.line_total, 250);

// 3. Discount larger than the line value must clamp at 0, not go negative.
const l3 = buildInvoiceLine({ lineType: 'product', description: 'Sample', qty: 1, unitPrice: 20, discount: 100 });
check('over-discounted line clamps to 0', l3.line_total, 0);

// 4. qty <= 0 must throw.
let threw = false;
try {
  buildInvoiceLine({ lineType: 'service', description: 'Bad', qty: 0, unitPrice: 100 });
} catch {
  threw = true;
}
check('zero qty throws', threw, true);

// 5. Multi-line invoice totals — the arithmetic invariant that matters most: subtotal minus
// discountTotal must exactly equal grandTotal, even across several lines with their own
// discounts and fractional-cent rounding.
const lines = [
  buildInvoiceLine({ lineType: 'service', description: 'A', qty: 1, unitPrice: 999.99 }),
  buildInvoiceLine({ lineType: 'service', description: 'B', qty: 3, unitPrice: 333.33, discount: 10 }),
  buildInvoiceLine({ lineType: 'product', description: 'C', qty: 2, unitPrice: 75.5, discount: 5.5 }),
];
const totals = buildInvoiceTotals(lines);
check(
  'subtotal - discountTotal === grandTotal',
  Math.round((totals.subtotal - totals.discountTotal) * 100) / 100,
  totals.grandTotal
);
check('grandTotal is the sum of line totals', totals.grandTotal, Math.round(lines.reduce((s, l) => s + l.line_total, 0) * 100) / 100);

// 6. Tax portion of a tax-inclusive amount, e.g. 14% VAT baked into 114.
check('taxPortion of 114 gross at 14%', taxPortion(114, 0.14), 14);
check('taxPortion at 0% rate is 0', taxPortion(500, 0), 0);

// 7. Invoice number formatting.
check('formatInvoiceNo pads to 6 digits', formatInvoiceNo(42), 'INV-000042');
check('formatInvoiceNo does not truncate large values', formatInvoiceNo(1234567), 'INV-1234567');

console.log(failed === 0 ? '\nALL PASS' : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
