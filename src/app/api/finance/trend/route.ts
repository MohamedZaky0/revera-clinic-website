import { NextResponse } from 'next/server';
import { requireStaffAccess, hasFinancePermission } from '@/lib/access';
import { supabaseServer } from '@/lib/supabaseServer';
import { resolveDateRange } from '@/lib/financeReportRange';

export const dynamic = 'force-dynamic';

const MAX_MONTHS = 24;

/**
 * GET /api/finance/trend?months=6[&branchId=]
 *
 * The same revenue/cogs/commission/fixedOverhead/contributionMargin/fullyLoadedProfit accounting
 * as GET /api/finance/pnl (task 4.6), one row per month for the last `months` months (default 6,
 * max 24) ending with the current month -- every other Phase 4 report is single-period only, so
 * "are we growing or shrinking" has no view at all without this. Deliberately a simpler shape
 * than 4.6 (no category breakdowns, no partiallyCosted line counts) since this is a chart data
 * source, not a full P&L -- click into a specific month's full P&L on that screen for the detail.
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
    const monthsParam = Number(url.searchParams.get('months') || 6);
    const months = Number.isFinite(monthsParam) && monthsParam > 0 ? Math.min(Math.floor(monthsParam), MAX_MONTHS) : 6;

    const now = new Date();
    const periods: string[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      periods.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
    }

    const rows = await Promise.all(periods.map((period) => computeMonthTotals(period, branchId)));

    return NextResponse.json({ branchId: branchId || null, months: rows });
  } catch (error: any) {
    console.error('GET /api/finance/trend error:', error);
    return NextResponse.json({ error: error.message || 'Unable to compute trend.' }, { status: 500 });
  }
}

async function computeMonthTotals(period: string, branchId: string | null) {
  const range = resolveDateRange({ period });

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

  let revenue = 0;
  let cogs = 0;
  let commission = 0;
  if (invoiceIds.length > 0) {
    const { data: lines, error: linesError } = await supabaseServer
      .from('invoice_lines')
      .select('line_type, line_total, cogs_snapshot, commission_snapshot')
      .in('invoice_id', invoiceIds);
    if (linesError) throw linesError;
    for (const line of lines || []) {
      if (line.line_type === 'service' || line.line_type === 'product') revenue += Number(line.line_total || 0);
      if (line.cogs_snapshot !== null && line.cogs_snapshot !== undefined) cogs += Number(line.cogs_snapshot);
      if (line.commission_snapshot !== null && line.commission_snapshot !== undefined) commission += Number(line.commission_snapshot);
    }
  }

  let recognitionQuery = supabaseServer
    .from('package_revenue_recognitions')
    .select('recognised_amount, reservations!inner(branch_id)')
    .gte('recognised_at', range.fromIso)
    .lt('recognised_at', range.toIsoExclusive);
  if (branchId) recognitionQuery = recognitionQuery.eq('reservations.branch_id', branchId);
  const { data: recognitions, error: recognitionsError } = await recognitionQuery;
  if (recognitionsError) throw recognitionsError;
  revenue += (recognitions || []).reduce((sum: number, row: any) => sum + Number(row.recognised_amount || 0), 0);

  let expensesQuery = supabaseServer
    .from('expenses')
    .select('amount')
    .gte('incurred_on', range.fromDate)
    .lt('incurred_on', range.toDateExclusive);
  if (branchId) expensesQuery = expensesQuery.eq('branch_id', branchId);
  const { data: expenseRows, error: expensesError } = await expensesQuery;
  if (expensesError) throw expensesError;
  const expensesTotal = (expenseRows || []).reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0);

  let assetQuery = supabaseServer.from('fixed_assets').select('id');
  if (branchId) assetQuery = assetQuery.eq('branch_id', branchId);
  const { data: assets, error: assetsError } = await assetQuery;
  if (assetsError) throw assetsError;
  const assetIds = (assets || []).map((row: any) => row.id);

  let depreciationTotal = 0;
  if (assetIds.length > 0) {
    const { data: depRows, error: depError } = await supabaseServer
      .from('depreciation_entries')
      .select('amount')
      .in('asset_id', assetIds)
      .in('period', range.periods);
    if (depError) throw depError;
    depreciationTotal = (depRows || []).reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0);
  }

  let loanInterestTotal = 0;
  if (!branchId) {
    const { data: scheduleRows, error: scheduleError } = await supabaseServer
      .from('loan_schedule')
      .select('interest_part')
      .in('period', range.periods);
    if (scheduleError) throw scheduleError;
    loanInterestTotal = (scheduleRows || []).reduce((sum: number, row: any) => sum + Number(row.interest_part || 0), 0);
  }

  const fixedOverhead = round2(expensesTotal + depreciationTotal + loanInterestTotal);
  revenue = round2(revenue);
  cogs = round2(cogs);
  commission = round2(commission);
  const contributionMargin = round2(revenue - cogs - commission);
  const fullyLoadedProfit = round2(contributionMargin - fixedOverhead);

  return { period, revenue, cogs, commission, fixedOverhead, contributionMargin, fullyLoadedProfit };
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
