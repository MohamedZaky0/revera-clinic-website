import { NextResponse } from 'next/server';
import { requireStaffAccess, hasFinancePermission } from '@/lib/access';
import { supabaseServer } from '@/lib/supabaseServer';
import { resolveDateRange } from '@/lib/financeReportRange';
import { getServiceDurationMinutes } from '@/lib/services';
import { roomMinutes, doctorMinutes, bottleneckMinutes, utilization, type ShiftWindow } from '@/lib/capacity';

export const dynamic = 'force-dynamic';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// `branches.service_hours` does not actually exist on the live table despite being documented
// (confirmed by direct query while building this endpoint -- a real drift, tracked separately,
// not something this task fixes) and the page_settings('home').footer.serviceHours fallback is
// also empty on this dev DB. /api/availability's own hardcoded default (09:00-20:00 every day) is
// what actually governs clinic hours today, so this endpoint uses the same default for
// consistency -- room capacity computed here must agree with what /api/availability actually
// offers, not a different assumed schedule.
const DEFAULT_OPEN_MINUTES_PER_DAY = 11 * 60; // 09:00-20:00

function getDayShiftWindows(dayConfig: any): ShiftWindow[] {
  if (dayConfig?.shifts && Array.isArray(dayConfig.shifts) && dayConfig.shifts.length > 0) {
    return dayConfig.shifts.filter((s: any) => s?.start && s?.end);
  }
  if (dayConfig?.start && dayConfig?.end) {
    return [{ start: dayConfig.start, end: dayConfig.end }];
  }
  return [];
}

function getProviderDayConfig(provider: any, weekday: string): any {
  const wdh = provider.working_days_hours;
  if (!wdh) return null;
  let config = wdh;
  if (wdh.branch_schedules && provider.__branchIdForSchedule && wdh.branch_schedules[provider.__branchIdForSchedule]) {
    config = wdh.branch_schedules[provider.__branchIdForSchedule];
  }
  if (config.in_person) return config.in_person[weekday] || null;
  return config[weekday] || null;
}

function isProviderCompatibleWithBranch(provider: any, branchId: string): boolean {
  const wdh = provider.working_days_hours;
  if (wdh && typeof wdh === 'object' && Array.isArray(wdh.branch_ids)) {
    return wdh.branch_ids.includes(branchId);
  }
  return !provider.branch_id || provider.branch_id === branchId;
}

function dateRangeDays(fromDate: string, toDateInclusive: string): string[] {
  const days: string[] = [];
  const cursor = new Date(`${fromDate}T00:00:00.000Z`);
  const end = new Date(`${toDateInclusive}T00:00:00.000Z`);
  while (cursor.getTime() <= end.getTime()) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

interface DayFigures {
  date: string;
  roomMinutes: number;
  doctorMinutes: number;
  bottleneckMinutes: number;
}

function computeBranchDays(
  days: string[],
  branchId: string,
  availableRoomCount: number,
  branchClosedDates: Set<string>,
  compatibleProviders: any[],
  providerHolidayDates: Map<string, Set<string>>
): DayFigures[] {
  return days.map((date) => {
    const dateObj = new Date(`${date}T00:00:00.000Z`);
    const weekday = WEEKDAYS[dateObj.getUTCDay()];

    const branchClosed = branchClosedDates.has(date);
    const dayRoomMinutes = branchClosed ? 0 : roomMinutes(
      Array.from({ length: availableRoomCount }, () => ({ status: 'available' })),
      DEFAULT_OPEN_MINUTES_PER_DAY
    );

    const providerShiftsForDay: ShiftWindow[][] = [];
    for (const provider of compatibleProviders) {
      if (providerHolidayDates.get(provider.id)?.has(date)) continue;
      const dayConfig = getProviderDayConfig({ ...provider, __branchIdForSchedule: branchId }, weekday);
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

/**
 * GET /api/finance/capacity?period=YYYY-MM[&branchId=]
 * GET /api/finance/capacity?from=YYYY-MM-DD&to=YYYY-MM-DD[&branchId=]
 *
 * Per branch (or every active branch, summed and broken out), for the selected date range:
 * roomMinutes/doctorMinutes/bottleneckMinutes (task 5.5, day-by-day then summed), bookedMinutes
 * (duration_minutes of reservations with completed_at set in range, per task 5.1/5.5), utilization,
 * and a no-show rate (no_show vs completed reservations by appointment date). Gated
 * finance.view_capacity. See ai_docs/FINANCE_TRACKER.md task 5.9.
 *
 * Historical `bookedMinutes`/utilization will read as 0 for any date before 2026-07-29 --
 * `completed_at` is a brand new column (task 5.1) with no backfill (DEC-026: all current data is
 * mock, backfilling test data is not worth doing). This is honest, not a bug: real utilization
 * accrues going forward as bookings are completed through the fixed lifecycle.
 */
export async function GET(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!hasFinancePermission(access.access, 'finance.view_capacity')) {
    return NextResponse.json({ error: 'Finance capacity access is required.' }, { status: 403 });
  }

  try {
    const url = new URL(req.url);
    const branchIdParam = url.searchParams.get('branchId');
    const range = resolveDateRange({
      period: url.searchParams.get('period'),
      from: url.searchParams.get('from'),
      to: url.searchParams.get('to'),
    });
    const days = dateRangeDays(range.fromDate, range.toDateInclusive);

    let branchQuery = supabaseServer.from('branches').select('id, name_en').eq('status', 'active');
    if (branchIdParam) branchQuery = branchQuery.eq('id', branchIdParam);
    const { data: branches, error: branchesError } = await branchQuery;
    if (branchesError) throw branchesError;
    if (!branches || branches.length === 0) {
      return NextResponse.json({ error: branchIdParam ? 'Branch not found.' : 'No active branches.' }, { status: 404 });
    }

    const { data: allRooms, error: roomsError } = await supabaseServer
      .from('rooms')
      .select('id, branch_id, status, type')
      .eq('type', 'clinical');
    if (roomsError) throw roomsError;

    const { data: allProviders, error: providersError } = await supabaseServer
      .from('providers')
      .select('id, branch_id, working_days_hours');
    if (providersError) throw providersError;

    const { data: holidayRows, error: holidayError } = await supabaseServer
      .from('holiday_calendar')
      .select('branch_id, provider_id, date')
      .gte('date', range.fromDate)
      .lte('date', range.toDateInclusive);
    if (holidayError) throw holidayError;

    const { data: completedReservations, error: completedError } = await supabaseServer
      .from('reservations')
      .select('branch_id, service_id, service_ids, completed_at')
      .not('completed_at', 'is', null)
      .gte('completed_at', range.fromIso)
      .lt('completed_at', range.toIsoExclusive);
    if (completedError) throw completedError;

    const { data: statusRows, error: statusError } = await supabaseServer
      .from('reservations')
      .select('branch_id, status')
      .gte('date', range.fromDate)
      .lte('date', range.toDateInclusive)
      .in('status', ['completed', 'no_show']);
    if (statusError) throw statusError;

    const { data: allServices, error: servicesError } = await supabaseServer
      .from('services')
      .select('id, duration, duration_minutes');
    if (servicesError) throw servicesError;
    const durationByServiceId = new Map<number, number>();
    for (const s of allServices || []) durationByServiceId.set(s.id, getServiceDurationMinutes(s));

    function branchSlice(branchId: string, branchName: string): {
      branchId: string;
      branchName: string;
      roomMinutes: number;
      doctorMinutes: number;
      bottleneckMinutes: number;
      bookedMinutes: number;
      utilization: number | null;
      noShowRate: number | null;
      noShowCount: number;
      completedCount: number;
      byDay: DayFigures[];
    } {
      const availableRoomCount = (allRooms || []).filter((r: any) => r.branch_id === branchId && r.status === 'available').length;
      const branchClosedDates = new Set<string>(
        (holidayRows || []).filter((h: any) => h.branch_id === branchId && !h.provider_id).map((h: any) => String(h.date))
      );
      const compatibleProviders = (allProviders || []).filter((p: any) => isProviderCompatibleWithBranch(p, branchId));
      const providerHolidayDates = new Map<string, Set<string>>();
      for (const h of holidayRows || []) {
        if (!h.provider_id) continue;
        if (h.branch_id && h.branch_id !== branchId) continue;
        if (!providerHolidayDates.has(h.provider_id)) providerHolidayDates.set(h.provider_id, new Set());
        providerHolidayDates.get(h.provider_id)!.add(h.date);
      }

      const byDay = computeBranchDays(days, branchId, availableRoomCount, branchClosedDates, compatibleProviders, providerHolidayDates);
      const roomMinutesTotal = byDay.reduce((sum, d) => sum + d.roomMinutes, 0);
      const doctorMinutesTotal = byDay.reduce((sum, d) => sum + d.doctorMinutes, 0);
      const bottleneckMinutesTotal = byDay.reduce((sum, d) => sum + d.bottleneckMinutes, 0);

      let bookedMinutesTotal = 0;
      for (const r of completedReservations || []) {
        if (r.branch_id !== branchId) continue;
        const serviceIds: number[] = Array.isArray(r.service_ids) && r.service_ids.length > 0 ? r.service_ids : r.service_id ? [r.service_id] : [];
        for (const sid of serviceIds) bookedMinutesTotal += durationByServiceId.get(sid) ?? 30;
      }

      const branchStatusRows = (statusRows || []).filter((r: any) => r.branch_id === branchId);
      const noShowCount = branchStatusRows.filter((r: any) => r.status === 'no_show').length;
      const completedCount = branchStatusRows.filter((r: any) => r.status === 'completed').length;
      const noShowRate = noShowCount + completedCount > 0 ? round4(noShowCount / (noShowCount + completedCount)) : null;

      let utilizationValue: number | null = null;
      if (bottleneckMinutesTotal > 0) {
        utilizationValue = round4(utilization(bookedMinutesTotal, bottleneckMinutesTotal));
      }

      return {
        branchId,
        branchName,
        roomMinutes: roomMinutesTotal,
        doctorMinutes: doctorMinutesTotal,
        bottleneckMinutes: bottleneckMinutesTotal,
        bookedMinutes: bookedMinutesTotal,
        utilization: utilizationValue,
        noShowRate,
        noShowCount,
        completedCount,
        byDay,
      };
    }

    const byBranch: ReturnType<typeof branchSlice>[] = branches.map((b: any) => branchSlice(b.id, b.name_en));

    const clinicWide = {
      roomMinutes: byBranch.reduce((s, b) => s + b.roomMinutes, 0),
      doctorMinutes: byBranch.reduce((s, b) => s + b.doctorMinutes, 0),
      bottleneckMinutes: byBranch.reduce((s, b) => s + b.bottleneckMinutes, 0),
      bookedMinutes: byBranch.reduce((s, b) => s + b.bookedMinutes, 0),
      noShowCount: byBranch.reduce((s, b) => s + b.noShowCount, 0),
      completedCount: byBranch.reduce((s, b) => s + b.completedCount, 0),
    };
    const clinicUtilization = clinicWide.bottleneckMinutes > 0 ? round4(utilization(clinicWide.bookedMinutes, clinicWide.bottleneckMinutes)) : null;
    const clinicNoShowRate =
      clinicWide.noShowCount + clinicWide.completedCount > 0
        ? round4(clinicWide.noShowCount / (clinicWide.noShowCount + clinicWide.completedCount))
        : null;

    return NextResponse.json({
      range: { label: range.label, from: range.fromDate, to: range.toDateInclusive },
      branchId: branchIdParam || null,
      assumedOpenMinutesPerDay: DEFAULT_OPEN_MINUTES_PER_DAY,
      note:
        'branches.service_hours does not exist on the live schema -- every day is assumed open 09:00-20:00, matching /api/availability\'s own default. bookedMinutes/utilization only reflect bookings completed since completed_at started being written (2026-07-29) -- no historical backfill.',
      clinicWide: { ...clinicWide, utilization: clinicUtilization, noShowRate: clinicNoShowRate },
      byBranch,
    });
  } catch (error: any) {
    console.error('GET /api/finance/capacity error:', error);
    return NextResponse.json({ error: error.message || 'Unable to compute capacity.' }, { status: 500 });
  }
}

function round4(n: number): number {
  return Math.round((n + Number.EPSILON) * 10000) / 10000;
}
