import { computeSettledBalances } from '../src/lib/billing';

/**
 * Regression check for RISK-029: checkout must charge only the remaining balance after a
 * deposit, and the deposit must fold into customers.spent_amount at completion (not be lost).
 */

let failures = 0;
function assertEqual(label: string, actual: number, expected: number) {
  if (actual !== expected) {
    console.error(`FAIL: ${label} — expected ${expected}, got ${actual}`);
    failures++;
  } else {
    console.log(`PASS: ${label}`);
  }
}

// Case 1: 30% deposit (36) already paid on a 120 EGP service; staff collects the remaining 84
// in full at checkout.
{
  const result = computeSettledBalances({
    current: { wallet: 0, spent: 0, outstanding: 0 },
    wasCompleted: false,
    oldPaid: 36,
    oldLeft: 84,
    newPaid: 36 + 84, // depositAlreadyPaid + amountPaidNum, per the checkout modal fix
    newLeft: 0,
  });
  assertEqual('Case 1 — spent includes deposit + checkout payment', result.spent, 120);
  assertEqual('Case 1 — fully settled, no outstanding', result.outstanding, 0);
}

// Case 2: same deposit, but staff only collects half the remaining balance (42 of 84) —
// the other 42 becomes real patient debt.
{
  const result = computeSettledBalances({
    current: { wallet: 0, spent: 0, outstanding: 0 },
    wasCompleted: false,
    oldPaid: 36,
    oldLeft: 84,
    newPaid: 36 + 42,
    newLeft: 84 - 42,
  });
  assertEqual('Case 2 — spent is deposit + partial payment', result.spent, 78);
  assertEqual('Case 2 — outstanding is the unpaid remainder', result.outstanding, 42);
}

// Case 3: no deposit at all (isManual booking, or depositPercentage = 0) — must behave exactly
// as before this fix.
{
  const result = computeSettledBalances({
    current: { wallet: 0, spent: 0, outstanding: 0 },
    wasCompleted: false,
    oldPaid: 0,
    oldLeft: 120,
    newPaid: 0 + 120,
    newLeft: 0,
  });
  assertEqual('Case 3 — no-deposit booking still settles in full', result.spent, 120);
  assertEqual('Case 3 — no-deposit booking has no outstanding', result.outstanding, 0);
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log('\nAll checks passed.');
