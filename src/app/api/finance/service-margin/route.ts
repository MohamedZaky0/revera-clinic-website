import { NextResponse } from 'next/server';
import { requireStaffAccess, hasFinancePermission } from '@/lib/access';
import { supabaseServer } from '@/lib/supabaseServer';
import { resolveDateRange } from '@/lib/financeReportRange';
import { getServiceDurationMinutes } from '@/lib/services';

export const dynamic = 'force-dynamic';

/**
 * GET /api/finance/service-margin?period=YYYY-MM[&branchId=&serviceId=]
 * GET /api/finance/service-margin?from=YYYY-MM-DD&to=YYYY-MM-DD[&branchId=&serviceId=]
 *
 * Per-service contribution margin, per DEC-015's primary metric — no fixed-cost allocation.
 * See FINANCE_TRACKER.md task 4.7. Also surfaces the raw (non-per-minute) margin per service,
 * since a non-specialist owner needs both "how much do we make per session of X" and the
 * per-minute ranking figure Phase 5's service-mix optimizer (task 5.7) will consume.
 */
export async function GET(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!hasFinancePermission(access.access, 'finance.view_margins')) {
    return NextResponse.json({ error: 'Finance margin access is required.' }, { status: 403 });
  }

  try {
    const url = new URL(req.url);
    const branchId = url.searchParams.get('branchId');
    const serviceIdFilter = url.searchParams.get('serviceId');
    const range = resolveDateRange({
      period: url.searchParams.get('period'),
      from: url.searchParams.get('from'),
      to: url.searchParams.get('to'),
    });

    let invoiceQuery = supabaseServer
      .from('invoices')
      .select('id')
      .eq('status', 'issued')
      .gte('issued_at', range.fromIso)
      .lt('issued_at', range.toIsoExclusive);
    if (branchId) invoiceQuery = invoiceQuery.eq('branch_id', branchId);
    const { data: invoices, error: invoicesError } = await invoiceQuery;
    if (invoicesError) throw invoicesError;
    const invoiceIds = (invoices || []).map((row: any) => row.id);

    type Agg = {
      revenueTotal: number;
      costedRevenueTotal: number;
      cogsTotal: number;
      commissionTotal: number;
      sessionCount: number;
      costedSessionCount: number;
    };
    const byService = new Map<number, Agg>();

    if (invoiceIds.length > 0) {
      let lineQuery = supabaseServer
        .from('invoice_lines')
        .select('service_id, line_total, cogs_snapshot, commission_snapshot')
        .eq('line_type', 'service')
        .in('invoice_id', invoiceIds)
        .not('service_id', 'is', null);
      if (serviceIdFilter) lineQuery = lineQuery.eq('service_id', Number(serviceIdFilter));
      const { data: lines, error: linesError } = await lineQuery;
      if (linesError) throw linesError;

      for (const line of lines || []) {
        const serviceId = Number(line.service_id);
        const agg = byService.get(serviceId) || {
          revenueTotal: 0,
          costedRevenueTotal: 0,
          cogsTotal: 0,
          commissionTotal: 0,
          sessionCount: 0,
          costedSessionCount: 0,
        };
        agg.sessionCount++;
        agg.revenueTotal += Number(line.line_total || 0);

        // A line needs BOTH snapshots to compute a real contribution margin — mixing a real
        // number with a NULL treated as zero would overstate margin, the exact failure mode
        // 4.6's "NULL means unknown, not zero" rule exists to prevent.
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

    const results = serviceIds
      .map((serviceId) => {
        const agg = byService.get(serviceId)!;
        const service = servicesById.get(serviceId);
        const durationMinutes = getServiceDurationMinutes(service);
        const durationIsFallback = !(
          service &&
          Number.isFinite(Number(service.duration_minutes)) &&
          Number(service.duration_minutes) > 0
        );

        const contributionMarginTotal = round2(agg.costedRevenueTotal - agg.cogsTotal - agg.commissionTotal);
        const contributionMarginPerSession =
          agg.costedSessionCount > 0 ? round2(contributionMarginTotal / agg.costedSessionCount) : null;
        const cmPerMinute =
          contributionMarginPerSession !== null && durationMinutes > 0
            ? round2(contributionMarginPerSession / durationMinutes)
            : null;

        return {
          serviceId,
          serviceName: service?.en || 'Unknown service',
          durationMinutes,
          durationIsFallback,
          sessionCount: agg.sessionCount,
          costedSessionCount: agg.costedSessionCount,
          partiallyCosted: agg.costedSessionCount < agg.sessionCount,
          revenueTotal: round2(agg.revenueTotal),
          contributionMarginTotal,
          contributionMarginPerSession,
          cmPerMinute,
        };
      })
      .sort((a, b) => (b.cmPerMinute ?? -Infinity) - (a.cmPerMinute ?? -Infinity));

    return NextResponse.json({
      range: { label: range.label, from: range.fromDate, to: range.toDateInclusive },
      branchId: branchId || null,
      services: results,
    });
  } catch (error: any) {
    console.error('GET /api/finance/service-margin error:', error);
    return NextResponse.json({ error: error.message || 'Unable to compute service margin.' }, { status: 500 });
  }
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
