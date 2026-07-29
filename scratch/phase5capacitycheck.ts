// Regression check for src/lib/capacity.ts (PROPOSAL-002 Phase 5, task 5.5).
//
//   npx tsx scratch/phase5capacitycheck.ts
import { roomMinutes, doctorMinutes, bottleneckMinutes, utilization } from '../src/lib/capacity';

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

// 1. roomMinutes: only 'available' rooms count, each gets the full branch open window.
check(
  'roomMinutes: 2 available + 1 on_cleaning, 600 open minutes',
  roomMinutes([{ status: 'available' }, { status: 'available' }, { status: 'on_cleaning' }], 600),
  1200
);
check('roomMinutes: no rooms at all', roomMinutes([], 600), 0);
check('roomMinutes: negative open minutes clamped to 0 (branch effectively closed)', roomMinutes([{ status: 'available' }], -30), 0);

// 2. doctorMinutes: sum of every provider's shift lengths, including split shifts.
check(
  'doctorMinutes: one provider, single 8h shift (9-17)',
  doctorMinutes([[{ start: '09:00', end: '17:00' }]]),
  480
);
check(
  'doctorMinutes: one provider, split shift (9-13, 16-20) = 4h + 4h, not the collapsed 9-20 = 11h',
  doctorMinutes([[{ start: '09:00', end: '13:00' }, { start: '16:00', end: '20:00' }]]),
  480
);
check(
  'doctorMinutes: two providers, one single-shift one split-shift',
  doctorMinutes([
    [{ start: '09:00', end: '17:00' }],
    [{ start: '09:00', end: '13:00' }, { start: '16:00', end: '20:00' }],
  ]),
  960
);
check('doctorMinutes: no providers scheduled', doctorMinutes([]), 0);

// 3. bottleneckMinutes: must pick the MINIMUM, not sum or average, in both directions.
check('bottleneckMinutes: room-constrained (rooms 300 < doctors 960)', bottleneckMinutes(300, 960), 300);
check('bottleneckMinutes: doctor-constrained (rooms 1200 > doctors 480)', bottleneckMinutes(1200, 480), 480);
check('bottleneckMinutes: equal', bottleneckMinutes(600, 600), 600);
check('bottleneckMinutes: zero doctors -> zero bottleneck regardless of rooms', bottleneckMinutes(1200, 0), 0);

// 4. utilization: plain division, and must throw (not silently return 0/Infinity) on a
//    non-positive bottleneck -- same divide-by-input convention as breakEvenRevenue.
check('utilization: 300 booked of 600 bottleneck', utilization(300, 600), 0.5);
check('utilization: fully booked', utilization(600, 600), 1);
check('utilization: overbooked past the bottleneck is reported as-is, not clamped', utilization(720, 600), 1.2);

let threw = false;
try {
  utilization(100, 0);
} catch {
  threw = true;
}
checkTrue('utilization: throws on zero bottleneck rather than returning Infinity/NaN', threw);

let threw2 = false;
try {
  utilization(100, -50);
} catch {
  threw2 = true;
}
checkTrue('utilization: throws on negative bottleneck', threw2);

console.log(failed === 0 ? '\nALL PASS' : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
