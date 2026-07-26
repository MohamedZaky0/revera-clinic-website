// Regression check for the Phase 1 package/deferred-revenue arithmetic (src/lib/packages.ts).
//
//   npx tsx scratch/phase1packagecheck.ts
//
// The single most important invariant in this whole phase: recognised revenue plus remaining
// deferred balance must always sum back to exactly what the patient paid. Run this after
// touching src/lib/packages.ts. See ai_docs/FINANCE_TRACKER.md task 1.9.
import {
  recognisedRevenuePerSession,
  recognisedRevenueSoFar,
  deferredBalance,
  isExpired,
  resolveExpiry,
} from '../src/lib/packages';

let failed = 0;
function check(label: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(50)} got=${JSON.stringify(got)} want=${JSON.stringify(want)}`);
}

// 1. A 6-session package for 1000: recognise 2 delivered, 4 remain deferred.
const pricePaid = 1000;
const totalSessions = 6;
const perSession = recognisedRevenuePerSession(pricePaid, totalSessions);
check('recognised per session (1000/6)', perSession, 166.67);

const recognisedFor2 = recognisedRevenueSoFar(pricePaid, 2, totalSessions);
check('recognised so far for 2 delivered', recognisedFor2, 333.34);
const deferredFor4 = deferredBalance(pricePaid, 4, totalSessions);
check('deferred balance for 4 remaining', deferredFor4, 666.66);

// THE INVARIANT: recognised (for delivered sessions) + deferred (for remaining) must equal
// what was paid, to the cent — a rounding bug here would silently create or destroy money.
// This is exactly the bug this check caught on the first implementation attempt: rounding
// recognised and deferred independently produced 1000.01 instead of 1000.
check('recognised(2) + deferred(4) === price_paid', Math.round((recognisedFor2 + deferredFor4) * 100) / 100, pricePaid);

// 2. Fully delivered: no liability left.
check('deferred balance at 0 remaining', deferredBalance(pricePaid, 0, totalSessions), 0);

// 2b. Nothing delivered yet: the whole price is deferred, none recognised.
check('deferred balance at full remaining === price_paid', deferredBalance(pricePaid, totalSessions, totalSessions), pricePaid);
check('recognised so far at 0 delivered', recognisedRevenueSoFar(pricePaid, 0, totalSessions), 0);
check('recognised so far at full delivery equals price_paid', recognisedRevenueSoFar(pricePaid, totalSessions, totalSessions), pricePaid);

// 3. Zero-session package must throw, not divide by zero.
let threw = false;
try {
  recognisedRevenuePerSession(500, 0);
} catch {
  threw = true;
}
check('recognisedRevenuePerSession(x, 0) throws', threw, true);

threw = false;
try {
  deferredBalance(500, 3, 0);
} catch {
  threw = true;
}
check('deferredBalance(x, y, 0) throws', threw, true);

// 4. Expiry checks.
const now = new Date('2026-08-01T00:00:00.000Z');
check('past date is expired', isExpired('2026-07-01T00:00:00.000Z', now), true);
check('future date is not expired', isExpired('2026-09-01T00:00:00.000Z', now), false);
check('null expiry never expires', isExpired(null, now), false);

// 5. resolveExpiry — breakage default.
check(
  "on_expiry='recognise_revenue' resolves to breakage",
  resolveExpiry({ onExpiry: 'recognise_revenue' }, now),
  { action: 'recognise_revenue' }
);

// 6. resolveExpiry — extend default, verify the new date is exactly N days later.
const currentExpiry = new Date('2026-07-01T00:00:00.000Z');
const extendResult = resolveExpiry({ onExpiry: 'extend', extensionDays: 30 }, currentExpiry);
const expectedExtended = new Date('2026-07-31T00:00:00.000Z').toISOString();
check("on_expiry='extend' adds extension_days", extendResult, { action: 'extend', newExpiresAt: expectedExtended });

// 7. Misconfigured extend policy (no extension_days) must throw rather than silently no-op.
threw = false;
try {
  resolveExpiry({ onExpiry: 'extend', extensionDays: null }, now);
} catch {
  threw = true;
}
check("on_expiry='extend' with no extension_days throws", threw, true);

console.log(failed === 0 ? '\nALL PASS' : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
