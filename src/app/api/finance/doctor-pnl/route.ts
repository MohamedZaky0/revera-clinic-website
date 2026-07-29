import { NextResponse } from 'next/server';
import { requireStaffAccess, hasFinancePermission } from '@/lib/access';
import { supabaseServer } from '@/lib/supabaseServer';
import { resolveDateRange } from '@/lib/financeReportRange';

export const dynamic = 'force-dynamic';

interface Bucket {
  revenueTotal: number;
  cogsTotal: number;
  commissionTotal: number;
  costedLineCount: number;
  uncostedLineCount: number;
  commissionedLineCount: number;
  uncommissionedLineCount: number;
}

function emptyBucket(): Bucket {
  return {
    revenueTotal: 0,
    cogsTotal: 0,
    commissionTotal: 0,
    costedLineCount: 0,
    uncostedLineCount: 0,
    commissionedLineCount: 0,
    uncommissionedLineCount: 0,
  };
}

function addLine(bucket: Bucket, lineTotal: number, cogs: number | null | undefined, commission: number | null | undefined) {
  bucket.revenueTotal += lineTotal;
  if (cogs === null || cogs === undefined) {
    bucket.uncostedLineCount++;
  } else {
    bucket.cogsTotal += Number(cogs);
    bucket.costedLineCount++;
  }
  if (commission === null || commission === undefined) {
    bucket.uncommissionedLineCount++;
  } else {
    bucket.commissionTotal += Number(commission);
    bucket.commissionedLineCount++;
  }
}

/**
 * GET /api/finance/doctor-pnl?period=YYYY-MM[&branchId=]
 * GET /api/finance/doctor-pnl?from=YYYY-MM-DD&to=YYYY-MM-DD[&branchId=]
 *
 * Contribution margin (DEC-015's primary metric) sliced by provider_id — the concrete report
 * RISK-015 exists to make trustworthy. Uses invoice_lines.provider_id and, for package sessions,
 * reservations.provider_id via package_revenue_recognitions.reservation_id — never doctor_name
 * string matching. No fixed-overhead/fully-loaded view: this codebase has no established basis
 * for allocating rent/depreciation/loan interest to an individual doctor (DEC-015 only defines a
 * room-minutes allocation for services/sessions, not providers), so this endpoint stops at
 * contribution margin, same as 4.7's service-margin. See FINANCE_TRACKER.md task 4.8.
 */
export async function GET(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!hasFinancePermission(access.access, 'finance.view_pnl')) {
    return NextResponse.json({ error: 'Finance P&L access is required.' }, { status: 403 });
  }

  try {
    const url = new URL(req.url);
    const branchId = url.searchParams.get('branchId');
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

    const buckets = new Map<string, Bucket>(); // key: provider_id, or 'unattributed'
    const UNATTRIBUTED = 'unattributed';

    if (invoiceIds.length > 0) {
      const { data: lines, error: linesError } = await supabaseServer
        .from('invoice_lines')
        .select('line_total, cogs_snapshot, commission_snapshot, provider_id')
        .in('invoice_id', invoiceIds)
        .in('line_type', ['service', 'product']);
      if (linesError) throw linesError;

      for (const line of lines || []) {
        const key = line.provider_id || UNATTRIBUTED;
        const bucket = buckets.get(key) || emptyBucket();
        addLine(bucket, Number(line.line_total || 0), line.cogs_snapshot, line.commission_snapshot);
        buckets.set(key, bucket);
      }
    }

    // Package revenue recognised in range (DEC-023), attributed via the delivering reservation's
    // provider_id — package_revenue_recognitions carries no provider_id of its own.
    let recognitionQuery = supabaseServer
      .from('package_revenue_recognitions')
      .select('recognised_amount, reservations!inner(branch_id, provider_id)')
      .gte('recognised_at', range.fromIso)
      .lt('recognised_at', range.toIsoExclusive);
    if (branchId) recognitionQuery = recognitionQuery.eq('reservations.branch_id', branchId);
    const { data: recognitions, error: recognitionsError } = await recognitionQuery;
    if (recognitionsError) throw recognitionsError;
    for (const row of recognitions || []) {
      const providerId = (row as any).reservations?.provider_id || null;
      const key = providerId || UNATTRIBUTED;
      const bucket = buckets.get(key) || emptyBucket();
      // Package recognitions have no per-line cogs/commission snapshot of their own.
      bucket.revenueTotal += Number(row.recognised_amount || 0);
      buckets.set(key, bucket);
    }

    const providerIds = Array.from(buckets.keys()).filter((k) => k !== UNATTRIBUTED);
    let providerNameById = new Map<string, string>();
    if (providerIds.length > 0) {
      const { data: providers, error: providersError } = await supabaseServer
        .from('providers')
        .select('id, name')
        .in('id', providerIds);
      if (providersError) throw providersError;
      providerNameById = new Map((providers || []).map((p: any) => [p.id, p.name]));
    }

    function toSlice(providerId: string, bucket: Bucket) {
      const revenue = round2(bucket.revenueTotal);
      const cogs = round2(bucket.cogsTotal);
      const commission = round2(bucket.commissionTotal);
      return {
        providerId: providerId === UNATTRIBUTED ? null : providerId,
        providerName: providerId === UNATTRIBUTED ? 'Unattributed' : providerNameById.get(providerId) || 'Unknown provider',
        revenue: { total: revenue },
        cogs: {
          total: cogs,
          costedLineCount: bucket.costedLineCount,
          uncostedLineCount: bucket.uncostedLineCount,
          partiallyCosted: bucket.uncostedLineCount > 0,
        },
        commission: {
          total: commission,
          commissionedLineCount: bucket.commissionedLineCount,
          uncommissionedLineCount: bucket.uncommissionedLineCount,
          partiallyCommissioned: bucket.uncommissionedLineCount > 0,
        },
        contributionMargin: round2(revenue - cogs - commission),
      };
    }

    const providersSlices = Array.from(buckets.entries())
      .filter(([key]) => key !== UNATTRIBUTED)
      .map(([providerId, bucket]) => toSlice(providerId, bucket))
      .sort((a, b) => b.contributionMargin - a.contributionMargin);

    const unattributedBucket = buckets.get(UNATTRIBUTED) || emptyBucket();
    const unattributed = toSlice(UNATTRIBUTED, unattributedBucket);

    return NextResponse.json({
      range: { label: range.label, from: range.fromDate, to: range.toDateInclusive },
      branchId: branchId || null,
      note: 'Contribution margin only (DEC-015 primary metric) -- no fixed-overhead allocation basis exists per doctor.',
      providers: providersSlices,
      unattributed,
    });
  } catch (error: any) {
    console.error('GET /api/finance/doctor-pnl error:', error);
    return NextResponse.json({ error: error.message || 'Unable to compute doctor P&L.' }, { status: 500 });
  }
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
