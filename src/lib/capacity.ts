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

/**
 * Shared route-facing helpers below — pure transforms over already-fetched rows (no
 * `supabaseServer` calls), used by both /api/finance/capacity (5.9) and /api/finance/service-mix
 * (5.10) so the two routes can never silently disagree on what "a provider's day" or "the days in
 * this range" means.
 */

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// `branches.service_hours` does not actually exist on the live table despite being documented
// (confirmed by direct query while building task 5.9) and the page_settings('home').footer.
// serviceHours fallback is also empty on this dev DB. /api/availability's own hardcoded default
// (09:00-20:00 every day) is what actually governs clinic hours today, so capacity math uses the
// same default for consistency — computed room capacity must agree with what /api/availability
// actually offers, not a different assumed schedule.
export const DEFAULT_OPEN_MINUTES_PER_DAY = 11 * 60; // 09:00-20:00

export function getDayShiftWindows(dayConfig: any): ShiftWindow[] {
  if (dayConfig?.shifts && Array.isArray(dayConfig.shifts) && dayConfig.shifts.length > 0) {
    return dayConfig.shifts.filter((s: any) => s?.start && s?.end);
  }
  if (dayConfig?.start && dayConfig?.end) {
    return [{ start: dayConfig.start, end: dayConfig.end }];
  }
  return [];
}

export function getProviderDayConfig(provider: any, weekday: string, branchIdForSchedule?: string | null): any {
  const wdh = provider.working_days_hours;
  if (!wdh) return null;
  let config = wdh;
  if (wdh.branch_schedules && branchIdForSchedule && wdh.branch_schedules[branchIdForSchedule]) {
    config = wdh.branch_schedules[branchIdForSchedule];
  }
  if (config.in_person) return config.in_person[weekday] || null;
  return config[weekday] || null;
}

export function isProviderCompatibleWithBranch(provider: any, branchId: string): boolean {
  const wdh = provider.working_days_hours;
  if (wdh && typeof wdh === 'object' && Array.isArray(wdh.branch_ids)) {
    return wdh.branch_ids.includes(branchId);
  }
  return !provider.branch_id || provider.branch_id === branchId;
}

/** Every 'YYYY-MM-DD' date from fromDate to toDateInclusive, both inclusive. */
export function dateRangeDays(fromDate: string, toDateInclusive: string): string[] {
  const days: string[] = [];
  const cursor = new Date(`${fromDate}T00:00:00.000Z`);
  const end = new Date(`${toDateInclusive}T00:00:00.000Z`);
  while (cursor.getTime() <= end.getTime()) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

export interface DayCapacityFigures {
  date: string;
  roomMinutes: number;
  doctorMinutes: number;
  bottleneckMinutes: number;
}

/**
 * Day-by-day roomMinutes/doctorMinutes/bottleneckMinutes for one branch across a date range,
 * given already-fetched rooms/providers/holiday exclusions. Shared by both 5.9 and 5.10 so a
 * sellable-capacity calculation (5.10) always agrees with the capacity report (5.9) it is derived
 * from.
 */
export function computeBranchDays(
  days: string[],
  branchId: string,
  availableRoomCount: number,
  branchClosedDates: Set<string>,
  compatibleProviders: { id: string; working_days_hours: any }[],
  providerHolidayDates: Map<string, Set<string>>
): DayCapacityFigures[] {
  return days.map((date) => {
    const dateObj = new Date(`${date}T00:00:00.000Z`);
    const weekday = WEEKDAYS[dateObj.getUTCDay()];

    const branchClosed = branchClosedDates.has(date);
    const dayRoomMinutes = branchClosed
      ? 0
      : roomMinutes(Array.from({ length: availableRoomCount }, () => ({ status: 'available' })), DEFAULT_OPEN_MINUTES_PER_DAY);

    const providerShiftsForDay: ShiftWindow[][] = [];
    for (const provider of compatibleProviders) {
      if (providerHolidayDates.get(provider.id)?.has(date)) continue;
      const dayConfig = getProviderDayConfig(provider, weekday, branchId);
      if (!dayConfig || !dayConfig.isOpen) continue;
      const windows = getDayShiftWindows(dayConfig);
      if (windows.length > 0) providerShiftsForDay.push(windows);
    }
    const dayDoctorMinutes = doctorMinutes(providerShiftsForDay);

    return {
      date,
      roomMinutes: dayRoomMinutes,
      doctorMinutes: dayDoctorMinutes,
      bottleneckMinutes: bottleneckMinutes(dayRoomMinutes, dayDoctorMinutes),
    };
  });
}
