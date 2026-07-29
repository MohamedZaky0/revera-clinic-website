// Regression check for src/lib/serviceMix.ts (PROPOSAL-002 Phase 5, task 5.7).
//
//   npx tsx scratch/phase5servicemixcheck.ts
import {
  rankByContributionMarginPerMinute,
  sellableCapacity,
  allocateGreedy,
  maxPotentialRevenue,
  gapToPotential,
} from '../src/lib/serviceMix';

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

// --- 1. Ranking: PROPOSALS.md's own worked example --------------------------------------------
// "A 60%-margin service that occupies the only laser room for two hours is worse than a 40%-margin
// service that takes twenty minutes." Laser has by far the bigger CM per session (600 vs 120) but
// the LOWER CM per minute (5 vs 6) -- ranking must go by per-minute value, not per-session value
// or margin percentage, or this test would put Laser first.
const laser = { id: 'laser', cmPerMinute: 5 }; // 600 CM / 120 min
const quick = { id: 'quick', cmPerMinute: 6 }; // 120 CM / 20 min
const ranked = rankByContributionMarginPerMinute([laser, quick]);
check('rank: lower-total-margin, short-duration service ranks ahead of the high-CM laser service', ranked.map((s) => s.id), ['quick', 'laser']);
check('rank: is a new array, does not mutate the input order', [laser, quick].map((s) => s.id), ['laser', 'quick']);

// --- 2. sellableCapacity: DEC-023 netting, clamps at 0 rather than going negative --------------
check('sellableCapacity: nets out undelivered package minutes', sellableCapacity(600, 100), { sellableMinutes: 500, clamped: false });
check('sellableCapacity: undelivered exceeds bottleneck -> clamped at 0, not negative', sellableCapacity(600, 900), { sellableMinutes: 0, clamped: true });
check('sellableCapacity: exactly equal -> 0, not clamped (boundary is not negative)', sellableCapacity(600, 600), { sellableMinutes: 0, clamped: false });

// --- 3. allocateGreedy: demand cap respected, stops on exhaustion, truncates (no overshoot) ----
const rankedForAlloc = [
  { id: 'quick', cmPerMinute: 6, durationMinutes: 20, monthlyDemandCap: 10 },
  { id: 'laser', cmPerMinute: 5, durationMinutes: 120, monthlyDemandCap: 5 },
];
const allocation = allocateGreedy(rankedForAlloc, 130);
check('allocateGreedy: quick gets 6 sessions (120 of 130 min), laser gets 0 (only 10 min left, needs 120)', allocation, [
  { serviceId: 'quick', sessionsAllocated: 6 },
]);

// Demand cap binds even though capacity remains and this service ranks first.
const rankedCapBinding = [
  { id: 'quick', cmPerMinute: 6, durationMinutes: 20, monthlyDemandCap: 2 }, // only 2 sessions of real demand
  { id: 'laser', cmPerMinute: 5, durationMinutes: 120, monthlyDemandCap: 5 },
];
const allocationCapBinding = allocateGreedy(rankedCapBinding, 1000);
check(
  'allocateGreedy: top-ranked service capped at its own realistic demand (2), remaining capacity flows to next service',
  allocationCapBinding,
  [
    { serviceId: 'quick', sessionsAllocated: 2 },
    { serviceId: 'laser', sessionsAllocated: 5 },
  ]
);

check('allocateGreedy: zero sellable minutes -> no allocation', allocateGreedy(rankedForAlloc, 0), []);
check(
  'allocateGreedy: a service with zero duration is skipped rather than dividing by zero',
  allocateGreedy([{ id: 'bad', cmPerMinute: 10, durationMinutes: 0, monthlyDemandCap: 5 }], 100),
  []
);

// --- 4. Composition end-to-end: rank -> net -> allocate -> revenue -> gap ----------------------
// A units mismatch (minutes vs sessions) would first surface here, not in any single function.
const bottleneck = 150;
const undeliveredPackageMinutes = 20;
const sellable = sellableCapacity(bottleneck, undeliveredPackageMinutes);
check('composition: sellable minutes', sellable, { sellableMinutes: 130, clamped: false });

const composedRanked = rankByContributionMarginPerMinute([
  { id: 'laser', cmPerMinute: 5, durationMinutes: 120, monthlyDemandCap: 5 },
  { id: 'quick', cmPerMinute: 6, durationMinutes: 20, monthlyDemandCap: 10 },
]);
const composedAllocation = allocateGreedy(composedRanked, sellable.sellableMinutes);
check('composition: allocation (quick ranked first, gets 6 of the 130 sellable minutes)', composedAllocation, [
  { serviceId: 'quick', sessionsAllocated: 6 },
]);

const prices: Record<string, number> = { quick: 150, laser: 1000 };
const potential = maxPotentialRevenue(composedAllocation, prices);
check('composition: max potential revenue = 6 sessions x 150', potential, 900);

const gap = gapToPotential(potential, 500);
check('composition: gap to potential = 900 - 500', gap, 400);

const potentialMissingPrice = maxPotentialRevenue(composedAllocation, {});
check('maxPotentialRevenue: an allocated service missing from the price map contributes 0, not an error', potentialMissingPrice, 0);

console.log(failed === 0 ? '\nALL PASS' : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
