import { NextResponse } from 'next/server';
import { requireStaffAccess, hasFinancePermission } from '@/lib/access';
import { supabaseServer } from '@/lib/supabaseServer';
import { resolveDateRange } from '@/lib/financeReportRange';
import { getServicePriceDetails } from '@/lib/services';

export const dynamic = 'force-dynamic';

const LOST_STATUSES = ['no_show', 'cancelled', 'postponed'] as const;

/**
 * GET /api/finance/no-show-cost?period=YYYY-MM[&branchId=]
 * GET /api/finance/no-show-cost?from=YYYY-MM-DD&to=YYYY-MM-DD[&branchId=]
 *
 * Count and estimated lost revenue for reservations that never delivered: no_show, cancelled,
 * postponed (RISK-029's three non-completion outcomes). "Estimated" because this is list price
 * at the time of the report, not a stored snapshot of what would have been charged (unlike a
 * completed booking's real invoice_lines) -- deliberately labeled as such in the response and UI
 * rather than presented with false precision. See FINANCE_TRACKER.md's plain-language,
 * non-accountant-owner standard (DEC-014): this is the number that answers "should we require a
 * deposit," not an accounting-grade figure.
 */
export async function GET(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!hasFinancePermission(access.access, 'finance.view_capacity')) {
    return NextResponse.json({ error: 'Finance capacity access is required.' }, { status: 403 });
  }

  try {
    const url = new URL(req.url);
    const branchId = url.searchParams.get('branchId');
    // reservations.date is a text 'YYYY-MM-DD' column (RISK-020) -- date-string range comparison,
    // not the timestamptz bounds resolveDateRange also produces.
    const range = resolveDateRange({
      period: url.searchParams.get('period'),
      from: url.searchParams.get('from'),
      to: url.searchParams.get('to'),
    });

    let query = supabaseServer
      .from('reservations')
      .select('id, status, date, service_id, service_ids, branch_id, name')
      .in('status', LOST_STATUSES)
      .gte('date', range.fromDate)
      .lt('date', range.toDateExclusive);
    if (branchId) query = query.eq('branch_id', branchId);
    const { data: reservations, error: reservationsError } = await query;
    if (reservationsError) throw reservationsError;

    const allServiceIds = new Set<number>();
    for (const r of reservations || []) {
      const ids: number[] =
        Array.isArray(r.service_ids) && r.service_ids.length > 0 ? r.service_ids : r.service_id ? [r.service_id] : [];
      ids.forEach((id) => allServiceIds.add(Number(id)));
    }

    let servicesById = new Map<number, any>();
    if (allServiceIds.size > 0) {
      const { data: services, error: servicesError } = await supabaseServer
        .from('services')
        .select('id, en, price, branch_pricing')
        .in('id', Array.from(allServiceIds));
      if (servicesError) throw servicesError;
      servicesById = new Map((services || []).map((s: any) => [Number(s.id), s]));
    }

    let branchesById = new Map<string, any>();
    const { data: branches, error: branchesError } = await supabaseServer.from('branches').select('id, name_en');
    if (branchesError) throw branchesError;
    branchesById = new Map((branches || []).map((b: any) => [b.id, b]));

    interface Bucket {
      count: number;
      estimatedLostRevenue: number;
    }
    const byStatus = new Map<string, Bucket>();
    const byBranch = new Map<string, Bucket>();
    let totalCount = 0;
    let totalEstimatedLostRevenue = 0;

    for (const r of reservations || []) {
      const ids: number[] =
        Array.isArray(r.service_ids) && r.service_ids.length > 0 ? r.service_ids : r.service_id ? [r.service_id] : [];
      const branchName = r.branch_id ? branchesById.get(r.branch_id)?.name_en || null : null;

      const value = ids.reduce((sum, id) => {
        const service = servicesById.get(Number(id));
        if (!service) return sum;
        const priceDetails = getServicePriceDetails(
          { price: service.price !== null ? Number(service.price) : 0, branchPricing: service.branch_pricing },
          branchName
        );
        return sum + priceDetails.discountedPrice;
      }, 0);

      totalCount++;
      totalEstimatedLostRevenue += value;

      const statusBucket = byStatus.get(r.status) || { count: 0, estimatedLostRevenue: 0 };
      statusBucket.count++;
      statusBucket.estimatedLostRevenue += value;
      byStatus.set(r.status, statusBucket);

      const branchKey = r.branch_id || 'unattributed';
      const branchBucket = byBranch.get(branchKey) || { count: 0, estimatedLostRevenue: 0 };
      branchBucket.count++;
      branchBucket.estimatedLostRevenue += value;
      byBranch.set(branchKey, branchBucket);
    }

    return NextResponse.json({
      range: { label: range.label, from: range.fromDate, to: range.toDateInclusive },
      branchId: branchId || null,
      totalCount: totalCount,
      totalEstimatedLostRevenue: round2(totalEstimatedLostRevenue),
      byStatus: Object.fromEntries(
        LOST_STATUSES.map((s) => [
          s,
          { count: byStatus.get(s)?.count || 0, estimatedLostRevenue: round2(byStatus.get(s)?.estimatedLostRevenue || 0) },
        ])
      ),
      byBranch: Array.from(byBranch.entries()).map(([id, bucket]) => ({
        branchId: id === 'unattributed' ? null : id,
        branchName: id === 'unattributed' ? 'Unattributed' : branchesById.get(id)?.name_en || 'Unknown branch',
        count: bucket.count,
        estimatedLostRevenue: round2(bucket.estimatedLostRevenue),
      })),
    });
  } catch (error: any) {
    console.error('GET /api/finance/no-show-cost error:', error);
    return NextResponse.json({ error: error.message || 'Unable to compute no-show cost.' }, { status: 500 });
  }
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
