import { NextResponse } from 'next/server';
import { requireStaffAccess, hasFinancePermission } from '@/lib/access';
import { supabaseServer } from '@/lib/supabaseServer';
import { resolveDateRange } from '@/lib/financeReportRange';
import { getServiceDurationMinutes } from '@/lib/services';
import {
  isProviderCompatibleWithBranch,
  dateRangeDays,
  computeBranchDays,
} from '@/lib/capacity';
import { breakEvenRevenue } from '@/lib/breakeven';
import {
  rankByContributionMarginPerMinute,
  sellableCapacity,
  allocateGreedy,
  maxPotentialRevenue,
  gapToPotential,
} from '@/lib/serviceMix';

export const dynamic = 'force-dynamic';

const LOST_STATUSES = ['no_show', 'cancelled'];

async function computeBottleneckMinutes(branchIds: string[], days: string[]): Promise<number> {
  if (branchIds.length === 0) return 0;

  const { data: allRooms, error: roomsError } = await supabaseServer
    .from('rooms')
    .select('id, branch_id, status, type')
    .eq('type', 'clinical')
    .in('branch_id', branchIds);
  if (roomsError) throw roomsError;

  const { data: allProviders, error: providersError } = await supabaseServer
    .from('providers')
    .select('id, branch_id, working_days_hours');
  if (providersError) throw providersError;

  const { data: holidayRows, error: holidayError } = await supabaseServer
    .from('holiday_calendar')
    .select('branch_id, provider_id, date')
    .gte('date', days[0])
    .lte('date', days[days.length - 1]);
  if (holidayError) throw holidayError;

  let total = 0;
  for (const branchId of branchIds) {
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
    total += byDay.reduce((sum, d) => sum + d.bottleneckMinutes, 0);
  }
  return total;
}

/**
 * GET /api/finance/service-mix?period=YYYY-MM[&branchId=]
 * GET /api/finance/service-mix?from=YYYY-MM-DD&to=YYYY-MM-DD[&branchId=]
 *
 * Break-even revenue, services ranked by contribution margin per bottleneck minute, the
 * greedy-optimal allocation of this period's sellable capacity, max potential revenue, and the
 * gap to potential decomposed into idle capacity / suboptimal mix / no-shows-and-cancellations.
 * Gated finance.view_margins (this is a margin-optimization report; it also draws on P&L and
 * capacity figures computed fresh here, not fetched from those other endpoints, matching this
 * codebase's per-endpoint aggregation convention). See ai_docs/FINANCE_TRACKER.md task 5.10.
 *
 * `monthlyDemandCap` per service is this period's ACTUAL delivered session count -- there is no
 * demand-forecasting model in this codebase, so "realistic monthly demand" is honestly defined as
 * "what was actually demanded/delivered recently," not a fabricated growth projection (DEC-014).
 * This means the optimizer can only ever recommend reallocating IDLE capacity toward
 * already-proven-demand services, never inventing demand that hasn't been observed.
 *
 * The idle-capacity/suboptimal-mix/no-shows decomposition is a first-order estimate, not a
 * precise accounting split -- PROPOSALS.md itself frames the gap decomposition as a reporting aid
 * for "what should we fix first," not a formula with one uniquely correct answer. If the idle +
 * no-show estimates alone exceed the total gap, suboptimalMix is reported as 0 (not negative) and
 * `mixEstimateExceededGap` is set so a caller can see that happened rather than silently clamping.
 */
export async function GET(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!hasFinancePermission(access.access, 'finance.view_margins')) {
    return NextResponse.json({ error: 'Finance margin access is required.' }, { status: 403 });
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

    let branchQuery = supabaseServer.from('branches').select('id').eq('status', 'active');
    if (branchIdParam) branchQuery = branchQuery.eq('id', branchIdParam);
    const { data: branches, error: branchesError } = await branchQuery;
    if (branchesError) throw branchesError;
    const branchIds = (branches || []).map((b: any) => b.id);

    // --- Per-service margin data (same aggregation as task 4.7's service-margin) -----------------
    let invoiceQuery = supabaseServer
      .from('invoices')
      .select('id')
      .eq('status', 'issued')
      .gte('issued_at', range.fromIso)
      .lt('issued_at', range.toIsoExclusive);
    if (branchIdParam) invoiceQuery = invoiceQuery.eq('branch_id', branchIdParam);
    const { data: invoices, error: invoicesError } = await invoiceQuery;
    if (invoicesError) throw invoicesError;
    const invoiceIds = (invoices || []).map((row: any) => row.id);

    type Agg = { revenueTotal: number; costedRevenueTotal: number; cogsTotal: number; commissionTotal: number; sessionCount: number; costedSessionCount: number };
    const byService = new Map<number, Agg>();
    let allLineRevenueTotal = 0;
    let allLineCogsTotal = 0;
    let allLineCommissionTotal = 0;

    if (invoiceIds.length > 0) {
      const { data: lines, error: linesError } = await supabaseServer
        .from('invoice_lines')
        .select('service_id, line_type, line_total, cogs_snapshot, commission_snapshot')
        .in('invoice_id', invoiceIds);
      if (linesError) throw linesError;

      for (const line of lines || []) {
        if (line.line_type === 'service' || line.line_type === 'product') allLineRevenueTotal += Number(line.line_total || 0);
        if (line.cogs_snapshot !== null && line.cogs_snapshot !== undefined) allLineCogsTotal += Number(line.cogs_snapshot);
        if (line.commission_snapshot !== null && line.commission_snapshot !== undefined) allLineCommissionTotal += Number(line.commission_snapshot);

        if (line.line_type !== 'service' || line.service_id === null || line.service_id === undefined) continue;
        const serviceId = Number(line.service_id);
        const agg = byService.get(serviceId) || { revenueTotal: 0, costedRevenueTotal: 0, cogsTotal: 0, commissionTotal: 0, sessionCount: 0, costedSessionCount: 0 };
        agg.sessionCount++;
        agg.revenueTotal += Number(line.line_total || 0);
        const hasCogs = line.cogs_snapshot !== null && line.cogs_snapshot !== undefined;
        const hasCommission = line.commission_snapshot !== null && line.commission_snapshot !== undefined;
        if (hasCogs && hasCommission) {
          agg.costedSessionCount++;
          agg.costedRevenueTotal += Number(line.line_total || 0);
          agg.cogsTotal += Number(line.cogs_snapshot);
          agg.commissionTotal += Number(line.commission_snapshot);
        }
        byService.set(serviceId, agg);
      }
    }

    // Package sessions delivered in range also count toward actual service revenue for the gap
    // comparison, matching 4.6/trend's revenue definition.
    let recognitionQuery = supabaseServer
      .from('package_revenue_recognitions')
      .select('recognised_amount, reservations!inner(branch_id)')
      .gte('recognised_at', range.fromIso)
      .lt('recognised_at', range.toIsoExclusive);
    if (branchIdParam) recognitionQuery = recognitionQuery.eq('reservations.branch_id', branchIdParam);
    const { data: recognitions, error: recognitionsError } = await recognitionQuery;
    if (recognitionsError) throw recognitionsError;
    const packageRevenueRecognised = (recognitions || []).reduce((sum: number, row: any) => sum + Number(row.recognised_amount || 0), 0);
    allLineRevenueTotal += packageRevenueRecognised;

    const serviceIds = Array.from(byService.keys());
    let servicesById = new Map<number, any>();
    if (serviceIds.length > 0) {
      const { data: services, error: servicesError } = await supabaseServer
        .from('services')
        .select('id, en, duration_minutes, duration, price')
        .in('id', serviceIds);
      if (servicesError) throw servicesError;
      servicesById = new Map((services || []).map((s: any) => [Number(s.id), s]));
    }

    const rankable = serviceIds
      .map((serviceId) => {
        const agg = byService.get(serviceId)!;
        const service = servicesById.get(serviceId);
        const durationMinutes = getServiceDurationMinutes(service);
        const contributionMarginTotal = round2(agg.costedRevenueTotal - agg.cogsTotal - agg.commissionTotal);
        const contributionMarginPerSession = agg.costedSessionCount > 0 ? round2(contributionMarginTotal / agg.costedSessionCount) : null;
        const cmPerMinute = contributionMarginPerSession !== null && durationMinutes > 0 ? round2(contributionMarginPerSession / durationMinutes) : null;
        return {
          id: serviceId,
          serviceName: service?.en || 'Unknown service',
          durationMinutes,
          price: Number(service?.price || 0),
          revenueTotal: round2(agg.revenueTotal),
          sessionCount: agg.sessionCount,
          cmPerMinute,
        };
      })
      .filter((s) => s.cmPerMinute !== null && s.durationMinutes > 0) as {
        id: number; serviceName: string; durationMinutes: number; price: number; revenueTotal: number; sessionCount: number; cmPerMinute: number;
      }[];

    const ranked = rankByContributionMarginPerMinute(rankable);

    // --- Capacity (task 5.5/5.9's own math, computed fresh here) -----------------------------
    const bottleneckMinutesTotal = await computeBottleneckMinutes(branchIds, days);

    // Undelivered package minutes -- clinic-wide (customer_packages carries no branch_id of its
    // own), summed via the same qty_remaining/qty_total totals the redemption RPC itself uses.
    const { data: activeCustomerPackages, error: cpError } = await supabaseServer
      .from('customer_packages')
      .select('id, price_paid, expires_at, status')
      .eq('status', 'active');
    if (cpError) throw cpError;
    let undeliveredPackageMinutes = 0;
    if ((activeCustomerPackages || []).length > 0) {
      const cpIds = (activeCustomerPackages || []).map((cp: any) => cp.id);
      const { data: cpItems, error: cpItemsError } = await supabaseServer
        .from('customer_package_items')
        .select('customer_package_id, service_id, qty_remaining')
        .in('customer_package_id', cpIds);
      if (cpItemsError) throw cpItemsError;
      const { data: itemServices, error: itemServicesError } = await supabaseServer
        .from('services')
        .select('id, duration, duration_minutes')
        .in('id', Array.from(new Set((cpItems || []).map((i: any) => i.service_id))).length > 0
          ? Array.from(new Set((cpItems || []).map((i: any) => i.service_id)))
          : [-1]);
      if (itemServicesError) throw itemServicesError;
      const itemServiceDuration = new Map<number, number>();
      for (const s of itemServices || []) itemServiceDuration.set(s.id, getServiceDurationMinutes(s));
      for (const item of cpItems || []) {
        const qtyRemaining = Number(item.qty_remaining || 0);
        if (qtyRemaining <= 0) continue;
        undeliveredPackageMinutes += qtyRemaining * (itemServiceDuration.get(item.service_id) ?? 30);
      }
    }

    const sellable = sellableCapacity(bottleneckMinutesTotal, undeliveredPackageMinutes);

    // monthlyDemandCap: honestly "what was actually delivered this period" (see docstring) --
    // NOT a forecast.
    const allocatable = ranked.map((s) => ({ id: s.id, cmPerMinute: s.cmPerMinute, durationMinutes: s.durationMinutes, monthlyDemandCap: s.sessionCount }));
    const allocation = allocateGreedy(allocatable, sellable.sellableMinutes);

    const pricesById: Record<string, number> = {};
    for (const s of ranked) pricesById[String(s.id)] = s.price;
    const potential = maxPotentialRevenue(allocation, pricesById);

    const actualServiceRevenue = round2(rankable.reduce((sum, s) => sum + s.revenueTotal, 0));
    const gap = gapToPotential(potential, actualServiceRevenue);

    // --- Gap decomposition (first-order estimate, see docstring) -----------------------------
    const actualBookedMinutes = rankable.reduce((sum, s) => sum + s.sessionCount * s.durationMinutes, 0);
    const idleMinutes = Math.max(0, sellable.sellableMinutes - actualBookedMinutes);
    const actualAvgCmPerMinute = actualBookedMinutes > 0
      ? round2((rankable.reduce((sum, s) => sum + (s.cmPerMinute * s.sessionCount * s.durationMinutes), 0)) / actualBookedMinutes)
      : 0;
    const idleCapacityValue = round2(idleMinutes * actualAvgCmPerMinute);

    let noShowLostRevenue = 0;
    {
      let lostQuery = supabaseServer
        .from('reservations')
        .select('service_id, service_ids, status')
        .gte('date', range.fromDate)
        .lte('date', range.toDateInclusive)
        .in('status', LOST_STATUSES);
      if (branchIdParam) lostQuery = lostQuery.eq('branch_id', branchIdParam);
      const { data: lostRows, error: lostError } = await lostQuery;
      if (lostError) throw lostError;
      const { data: allServices, error: allServicesError } = await supabaseServer.from('services').select('id, price');
      if (allServicesError) throw allServicesError;
      const priceByServiceId = new Map<number, number>((allServices || []).map((s: any) => [s.id, Number(s.price || 0)]));
      for (const r of lostRows || []) {
        const ids: number[] = Array.isArray(r.service_ids) && r.service_ids.length > 0 ? r.service_ids : r.service_id ? [r.service_id] : [];
        for (const sid of ids) noShowLostRevenue += priceByServiceId.get(sid) ?? 0;
      }
      noShowLostRevenue = round2(noShowLostRevenue);
    }

    const idlePlusNoShow = round2(idleCapacityValue + noShowLostRevenue);
    const mixEstimateExceededGap = idlePlusNoShow > gap;
    const suboptimalMixValue = mixEstimateExceededGap ? 0 : round2(gap - idlePlusNoShow);

    // --- Break-even (task 5.6), same fixed-cost/revenue/CM accounting as 4.6/trend ------------
    let expensesQuery = supabaseServer.from('expenses').select('amount').gte('incurred_on', range.fromDate).lt('incurred_on', range.toDateExclusive);
    if (branchIdParam) expensesQuery = expensesQuery.eq('branch_id', branchIdParam);
    const { data: expenseRows, error: expensesError } = await expensesQuery;
    if (expensesError) throw expensesError;
    const expensesTotal = (expenseRows || []).reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0);

    let assetQuery = supabaseServer.from('fixed_assets').select('id');
    if (branchIdParam) assetQuery = assetQuery.eq('branch_id', branchIdParam);
    const { data: assets, error: assetsError } = await assetQuery;
    if (assetsError) throw assetsError;
    const assetIds = (assets || []).map((row: any) => row.id);
    let depreciationTotal = 0;
    if (assetIds.length > 0) {
      const { data: depRows, error: depError } = await supabaseServer.from('depreciation_entries').select('amount').in('asset_id', assetIds).in('period', range.periods);
      if (depError) throw depError;
      depreciationTotal = (depRows || []).reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0);
    }
    let loanInterestTotal = 0;
    if (!branchIdParam) {
      const { data: scheduleRows, error: scheduleError } = await supabaseServer.from('loan_schedule').select('interest_part').in('period', range.periods);
      if (scheduleError) throw scheduleError;
      loanInterestTotal = (scheduleRows || []).reduce((sum: number, row: any) => sum + Number(row.interest_part || 0), 0);
    }
    const fixedOverhead = round2(expensesTotal + depreciationTotal + loanInterestTotal);
    const totalRevenue = round2(allLineRevenueTotal);
    const totalContributionMargin = round2(allLineRevenueTotal - allLineCogsTotal - allLineCommissionTotal);
    const cmRatio = totalRevenue > 0 ? totalContributionMargin / totalRevenue : 0;

    let breakEven: number | null = null;
    if (cmRatio > 0) {
      breakEven = breakEvenRevenue(fixedOverhead, cmRatio);
    }

    return NextResponse.json({
      range: { label: range.label, from: range.fromDate, to: range.toDateInclusive },
      branchId: branchIdParam || null,
      note:
        'monthlyDemandCap per service is this period\'s actual delivered session count, not a forecast -- see the endpoint doc. The idle/mix/no-show decomposition is a first-order estimate, not an exact accounting split.',
      breakEven: { value: breakEven, fixedOverhead, cmRatio: round2(cmRatio * 100) },
      rankedServices: ranked,
      capacity: { bottleneckMinutes: bottleneckMinutesTotal, undeliveredPackageMinutes, sellableMinutes: sellable.sellableMinutes, sellableClampedAtZero: sellable.clamped },
      allocation,
      maxPotentialRevenue: potential,
      actualServiceRevenue,
      gapToPotential: gap,
      gapDecomposition: {
        idleCapacityValue,
        suboptimalMixValue,
        noShowLostRevenue,
        mixEstimateExceededGap,
      },
    });
  } catch (error: any) {
    console.error('GET /api/finance/service-mix error:', error);
    return NextResponse.json({ error: error.message || 'Unable to compute service mix.' }, { status: 500 });
  }
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
