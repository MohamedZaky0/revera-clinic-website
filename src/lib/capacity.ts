/**
 * Pure capacity/utilization arithmetic for PROPOSAL-002 Phase 5 (Capacity & Optimization).
 *
 * No `supabaseServer` calls in this file — same convention as every other src/lib/*.ts money
 * module (ledger.ts, packages.ts, costing.ts, customerBalances.ts). Callers fetch the rows; these
 * functions only compute. See ai_docs/PROPOSALS.md "Phase 5 — Capacity & optimization" for the
 * exact formulas and ai_docs/FINANCE_TRACKER.md task 5.5.
 */

export interface ShiftWindow {
  start: string; // "HH:MM"
  end: string; // "HH:MM"
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Total clinical-room minutes available for one branch on one day:
 * (clinical rooms with status='available') × branch open minutes for that day.
 * `rooms` must already be scoped to the branch in question — this function has no notion of
 * branch_id or dates, matching the other pure-function libs' convention of doing zero fetching.
 */
export function roomMinutes(rooms: { status: string }[], branchOpenMinutes: number): number {
  const availableRooms = rooms.filter((r) => r.status === 'available').length;
  return availableRooms * Math.max(0, branchOpenMinutes);
}

/**
 * Total doctor minutes available on one day: the sum of every scheduled provider's shift
 * lengths. The caller is responsible for excluding a provider's shifts entirely on a date they
 * hold a `holiday_calendar` row — this function only sums whatever shifts it is given, it does
 * not know about holidays/leave.
 */
export function doctorMinutes(providerShifts: ShiftWindow[][]): number {
  let total = 0;
  for (const shifts of providerShifts) {
    for (const shift of shifts) {
      total += Math.max(0, timeToMinutes(shift.end) - timeToMinutes(shift.start));
    }
  }
  return total;
}

/** The binding constraint on how much clinical time can actually be delivered in a day. */
export function bottleneckMinutes(roomMinutesValue: number, doctorMinutesValue: number): number {
  return Math.min(roomMinutesValue, doctorMinutesValue);
}

/**
 * booked_minutes / bottleneck_minutes. Throws on a non-positive bottleneck — same
 * divide-by-input convention as `breakEvenRevenue`, `costPerPulse`, `recognisedRevenuePerSession`:
 * a day with zero available capacity has no meaningful utilization figure (0/0 is undefined, not
 * 0), and silently returning 0 or Infinity would misreport "fully idle" or "impossible" as if they
 * were the same measured thing. Callers (task 5.9's route) must check `bottleneckMinutes > 0`
 * before calling this and report "no capacity that day" explicitly instead.
 */
export function utilization(bookedMinutes: number, bottleneckMinutesValue: number): number {
  if (!Number.isFinite(bottleneckMinutesValue) || bottleneckMinutesValue <= 0) {
    throw new Error(`utilization: bottleneckMinutes must be a positive number, got ${bottleneckMinutesValue}`);
  }
  return bookedMinutes / bottleneckMinutesValue;
}
