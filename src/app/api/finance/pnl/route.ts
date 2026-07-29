import { NextResponse } from 'next/server';
import { requireStaffAccess, hasFinancePermission } from '@/lib/access';
import { supabaseServer } from '@/lib/supabaseServer';
import { resolveDateRange } from '@/lib/financeReportRange';

export const dynamic = 'force-dynamic';

/**
 * GET /api/finance/pnl?branchId=&period=YYYY-MM
 * GET /api/finance/pnl?branchId=&from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Whole-range profit & loss. See FINANCE_TRACKER.md task 4.6 and DECISIONS.md DEC-015/DEC-021/
 * DEC-023 for the accounting rules this implements.
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

    // Revenue + COGS + commission: from invoice_lines on issued invoices in range.
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

    let serviceProductRevenue = 0;
    let cogs = 0;
    let commission = 0;
    let costedLineCount = 0;
    let uncostedLineCount = 0;
    let commissionedLineCount = 0;
    let uncommissionedLineCount = 0;

    if (invoiceIds.length > 0) {
      const { data: lines, error: linesError } = await supabaseServer
        .from('invoice_lines')
        .select('line_type, line_total, cogs_snapshot, commission_snapshot')
        .in('invoice_id', invoiceIds);
      if (linesError) throw linesError;

      for (const line of lines || []) {
        if (line.line_type === 'service' || line.line_type === 'product') {
          serviceProductRevenue += Number(line.line_total || 0);
        }
        // cogs_snapshot / commission_snapshot are NULL for lines never costed (Phase 2 not run
        // yet, or a product-only line no costing path ever touches) — unknown, not zero.
        if (line.cogs_snapshot === null || line.cogs_snapshot === undefined) {
          uncostedLineCount++;
        } else {
          cogs += Number(line.cogs_snapshot);
          costedLineCount++;
        }
        if (line.commission_snapshot === null || line.commission_snapshot === undefined) {
          uncommissionedLineCount++;
        } else {
          commission += Number(line.commission_snapshot);
          commissionedLineCount++;
        }
      }
    }

    // Package revenue recognised in range (DEC-023) — NOT the package's original invoice_lines
    // line, which books cash received, not revenue.
    let recognitionQuery = supabaseServer
      .from('package_revenue_recognitions')
      .select('recognised_amount, reservation_id, reservations!inner(branch_id)')
      .gte('recognised_at', range.fromIso)
      .lt('recognised_at', range.toIsoExclusive);
    if (branchId) recognitionQuery = recognitionQuery.eq('reservations.branch_id', branchId);
    const { data: recognitions, error: recognitionsError } = await recognitionQuery;
    if (recognitionsError) throw recognitionsError;
    const packageRevenueRecognised = (recognitions || []).reduce(
      (sum: number, row: any) => sum + Number(row.recognised_amount || 0),
      0
    );

    const revenue = round2(serviceProductRevenue + packageRevenueRecognised);
    cogs = round2(cogs);
    commission = round2(commission);

    // Fixed overhead: expenses + depreciation + loan interest (task 3.7 — interest_part only,
    // never installment, which includes the principal balance-sheet movement).
    let expensesQuery = supabaseServer
      .from('expenses')
      .select('amount')
      .gte('incurred_on', range.fromDate)
      .lt('incurred_on', range.toDateExclusive);
    if (branchId) expensesQuery = expensesQuery.eq('branch_id', branchId);
    const { data: expenseRows, error: expensesError } = await expensesQuery;
    if (expensesError) throw expensesError;
    const expensesTotal = round2((expenseRows || []).reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0));

    // Depreciation is asset-scoped; a branch filter means "assets belonging to that branch."
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
      depreciationTotal = round2((depRows || []).reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0));
    }

    // Loans carry no branch_id anywhere in the schema — interest cannot be attributed to a
    // branch. Included only in the whole-clinic total; explicitly excluded (and flagged, not
    // silently dropped) when branchId is given.
    let loanInterestTotal = 0;
    let loanInterestExcluded = false;
    if (branchId) {
      loanInterestExcluded = true;
    } else {
      const { data: scheduleRows, error: scheduleError } = await supabaseServer
        .from('loan_schedule')
        .select('interest_part')
        .in('period', range.periods);
      if (scheduleError) throw scheduleError;
      loanInterestTotal = round2((scheduleRows || []).reduce((sum: number, row: any) => sum + Number(row.interest_part || 0), 0));
    }

    const fixedOverhead = round2(expensesTotal + depreciationTotal + loanInterestTotal);

    // DEC-015: contribution margin is the primary, no-fixed-cost-allocation decision metric;
    // fully-loaded profit is the secondary full-cost view. Both computed here at the
    // whole-range/whole-branch level, so no room-minute allocation is needed (that basis only
    // matters when splitting fixed cost across individual services/sessions).
    const contributionMargin = round2(revenue - cogs - commission);
    const fullyLoadedProfit = round2(contributionMargin - fixedOverhead);

    return NextResponse.json({
      range: { label: range.label, from: range.fromDate, to: range.toDateInclusive },
      branchId: branchId || null,
      revenue: {
        total: revenue,
        servicesAndProducts: round2(serviceProductRevenue),
        packageRecognised: round2(packageRevenueRecognised),
      },
      cogs: {
        total: cogs,
        costedLineCount,
        uncostedLineCount,
        partiallyCosted: uncostedLineCount > 0,
      },
      commission: {
        total: commission,
        commissionedLineCount,
        uncommissionedLineCount,
        partiallyCommissioned: uncommissionedLineCount > 0,
      },
      fixedOverhead: {
        total: fixedOverhead,
        expenses: expensesTotal,
        depreciation: depreciationTotal,
        loanInterest: loanInterestTotal,
        loanInterestExcluded,
      },
      views: {
        contributionMargin: {
          value: contributionMargin,
          formula: 'revenue - cogs - commission',
          label: 'Primary — use for service-mix and pricing decisions (DEC-015). No fixed-cost allocation.',
        },
        fullyLoadedProfit: {
          value: fullyLoadedProfit,
          formula: 'contributionMargin - fixedOverhead',
          label: 'Secondary — full-cost curiosity view (DEC-015). Not for per-service decisions.',
        },
      },
    });
  } catch (error: any) {
    console.error('GET /api/finance/pnl error:', error);
    return NextResponse.json({ error: error.message || 'Unable to compute P&L.' }, { status: 500 });
  }
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
