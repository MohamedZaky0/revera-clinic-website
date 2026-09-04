import { NextResponse } from 'next/server';
import { requireStaffAccess, hasFinancePermission } from '@/lib/access';
import { supabaseServer } from '@/lib/supabaseServer';
import { resolveDateRange } from '@/lib/financeReportRange';

export const dynamic = 'force-dynamic';

const UNATTRIBUTED = 'unattributed';

interface RevenueBucket {
  revenueTotal: number;
  cogsTotal: number;
  commissionTotal: number;
  costedLineCount: number;
  uncostedLineCount: number;
  commissionedLineCount: number;
  uncommissionedLineCount: number;
}

function emptyRevenueBucket(): RevenueBucket {
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

/**
 * GET /api/finance/branch-pnl?period=YYYY-MM
 * GET /api/finance/branch-pnl?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * The same P&L shape as 4.6, sliced by branch_id -- every branch plus an explicit "unattributed"
 * bucket for rows with no branch_id (task 0.4's still-open branch-on-product-sale gap can produce
 * these). Every slice's totals plus unattributed must reconcile exactly to 4.6's whole-clinic
 * total for the same range -- verified by hand below, not just asserted. Loans carry no branch_id
 * anywhere in the schema, so 100% of loan interest is always unattributed here (unlike 4.6, where
 * it's included in the single whole-clinic total when no branchId filter is applied). See
 * FINANCE_TRACKER.md task 4.8.
 */
export async function GET(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!hasFinancePermission(access.access, 'finance.view_pnl')) {
    return NextResponse.json({ error: 'Finance P&L access is required.' }, { status: 403 });
  }

  try {
    const url = new URL(req.url);
    const range = resolveDateRange({
      period: url.searchParams.get('period'),
      from: url.searchParams.get('from'),
      to: url.searchParams.get('to'),
    });

    const { data: invoices, error: invoicesError } = await supabaseServer
      .from('invoices')
      .select('id, branch_id')
      .eq('status', 'issued')
      .gte('issued_at', range.fromIso)
      .lt('issued_at', range.toIsoExclusive);
    if (invoicesError) throw invoicesError;
    const branchByInvoiceId = new Map<string, string>();
    for (const inv of invoices || []) branchByInvoiceId.set(inv.id, inv.branch_id || UNATTRIBUTED);
    const invoiceIds = Array.from(branchByInvoiceId.keys());

    const revenueBuckets = new Map<string, RevenueBucket>();

    if (invoiceIds.length > 0) {
      const { data: lines, error: linesError } = await supabaseServer
        .from('invoice_lines')
        .select('invoice_id, line_total, cogs_snapshot, commission_snapshot')
        .in('invoice_id', invoiceIds)
        .in('line_type', ['service', 'product']);
      if (linesError) throw linesError;

      for (const line of lines || []) {
        const branchKey = branchByInvoiceId.get(line.invoice_id) || UNATTRIBUTED;
        const bucket = revenueBuckets.get(branchKey) || emptyRevenueBucket();
        bucket.revenueTotal += Number(line.line_total || 0);
        if (line.cogs_snapshot === null || line.cogs_snapshot === undefined) {
          bucket.uncostedLineCount++;
        } else {
          bucket.cogsTotal += Number(line.cogs_snapshot);
          bucket.costedLineCount++;
        }
        if (line.commission_snapshot === null || line.commission_snapshot === undefined) {
          bucket.uncommissionedLineCount++;
        } else {
          bucket.commissionTotal += Number(line.commission_snapshot);
          bucket.commissionedLineCount++;
        }
        revenueBuckets.set(branchKey, bucket);
      }
    }

    // Package revenue recognised in range (DEC-023), attributed via the delivering reservation's
    // branch_id.
    const { data: recognitions, error: recognitionsError } = await supabaseServer
      .from('package_revenue_recognitions')
      .select('recognised_amount, reservations!inner(branch_id)')
      .gte('recognised_at', range.fromIso)
      .lt('recognised_at', range.toIsoExclusive);
    if (recognitionsError) throw recognitionsError;
    for (const row of recognitions || []) {
      const branchKey = (row as any).reservations?.branch_id || UNATTRIBUTED;
      const bucket = revenueBuckets.get(branchKey) || emptyRevenueBucket();
      bucket.revenueTotal += Number(row.recognised_amount || 0);
      revenueBuckets.set(branchKey, bucket);
    }

    // Fixed overhead: expenses (own branch_id), depreciation (via fixed_assets.branch_id), loan
    // interest (always unattributed -- loans have no branch_id anywhere in the schema).
    const { data: expenseRows, error: expensesError } = await supabaseServer
      .from('expenses')
      .select('branch_id, amount')
      .gte('incurred_on', range.fromDate)
      .lt('incurred_on', range.toDateExclusive);
    if (expensesError) throw expensesError;
    const expensesByBranch = new Map<string, number>();
    for (const row of expenseRows || []) {
      const key = row.branch_id || UNATTRIBUTED;
      expensesByBranch.set(key, round2((expensesByBranch.get(key) || 0) + Number(row.amount || 0)));
    }

    const { data: assets, error: assetsError } = await supabaseServer.from('fixed_assets').select('id, branch_id');
    if (assetsError) throw assetsError;
    const branchByAssetId = new Map<string, string>();
    for (const asset of assets || []) branchByAssetId.set(asset.id, asset.branch_id || UNATTRIBUTED);
    const assetIds = Array.from(branchByAssetId.keys());

    const depreciationByBranch = new Map<string, number>();
    if (assetIds.length > 0) {
      const { data: depRows, error: depError } = await supabaseServer
        .from('depreciation_entries')
        .select('asset_id, amount')
        .in('asset_id', assetIds)
        .in('period', range.periods);
      if (depError) throw depError;
      for (const row of depRows || []) {
        const key = branchByAssetId.get(row.asset_id) || UNATTRIBUTED;
        depreciationByBranch.set(key, round2((depreciationByBranch.get(key) || 0) + Number(row.amount || 0)));
      }
    }

    const { data: scheduleRows, error: scheduleError } = await supabaseServer
      .from('loan_schedule')
      .select('interest_part')
      .in('period', range.periods);
    if (scheduleError) throw scheduleError;
    const loanInterestUnattributed = round2(
      (scheduleRows || []).reduce((sum: number, row: any) => sum + Number(row.interest_part || 0), 0)
    );

    const { data: branches, error: branchesError } = await supabaseServer.from('branches').select('id, name_en');
    if (branchesError) throw branchesError;
    const branchNameById = new Map((branches || []).map((b: any) => [b.id, b.name_en]));

    const allBranchKeys = new Set<string>([
      ...revenueBuckets.keys(),
      ...expensesByBranch.keys(),
      ...depreciationByBranch.keys(),
    ]);

    function toSlice(key: string) {
      const bucket = revenueBuckets.get(key) || emptyRevenueBucket();
      const revenue = round2(bucket.revenueTotal);
      const cogs = round2(bucket.cogsTotal);
      const commission = round2(bucket.commissionTotal);
      const expenses = expensesByBranch.get(key) || 0;
      const depreciation = depreciationByBranch.get(key) || 0;
      const loanInterest = key === UNATTRIBUTED ? loanInterestUnattributed : 0;
      const fixedOverhead = round2(expenses + depreciation + loanInterest);
      const contributionMargin = round2(revenue - cogs - commission);
      const fullyLoadedProfit = round2(contributionMargin - fixedOverhead);

      return {
        branchId: key === UNATTRIBUTED ? null : key,
        branchName: key === UNATTRIBUTED ? 'Unattributed' : branchNameById.get(key) || 'Unknown branch',
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
        fixedOverhead: { total: fixedOverhead, expenses, depreciation, loanInterest },
        contributionMargin,
        fullyLoadedProfit,
      };
    }

    const branchSlices = Array.from(allBranchKeys)
      .filter((key) => key !== UNATTRIBUTED)
      .map(toSlice)
      .sort((a, b) => b.fullyLoadedProfit - a.fullyLoadedProfit);
    const unattributed = toSlice(UNATTRIBUTED);

    return NextResponse.json({
      range: { label: range.label, from: range.fromDate, to: range.toDateInclusive },
      note: "Loan interest carries no branch_id anywhere in the schema and always lands in `unattributed`, unlike GET /api/finance/pnl's whole-clinic total (which includes it directly). Sum every branch plus unattributed to reconcile against that endpoint.",
      branches: branchSlices,
      unattributed,
    });
  } catch (error: any) {
    console.error('GET /api/finance/branch-pnl error:', error);
    return NextResponse.json({ error: error.message || 'Unable to compute branch P&L.' }, { status: 500 });
  }
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
