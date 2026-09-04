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

    let serviceRevenue = 0;
    let productRevenue = 0;
    let cogs = 0;
    let commission = 0;
    let costedLineCount = 0;
    let uncostedLineCount = 0;
    let commissionedLineCount = 0;
    let uncommissionedLineCount = 0;
    const serviceRevenueByServiceId = new Map<number, number>();
    const productRevenueByProductId = new Map<string, number>();

    if (invoiceIds.length > 0) {
      const { data: lines, error: linesError } = await supabaseServer
        .from('invoice_lines')
        .select('line_type, line_total, cogs_snapshot, commission_snapshot, service_id, product_id')
        .in('invoice_id', invoiceIds);
      if (linesError) throw linesError;

      for (const line of lines || []) {
        const lineTotal = Number(line.line_total || 0);
        if (line.line_type === 'service') {
          serviceRevenue += lineTotal;
          if (line.service_id !== null && line.service_id !== undefined) {
            const sid = Number(line.service_id);
            serviceRevenueByServiceId.set(sid, (serviceRevenueByServiceId.get(sid) || 0) + lineTotal);
          }
        } else if (line.line_type === 'product') {
          productRevenue += lineTotal;
          if (line.product_id) {
            productRevenueByProductId.set(
              line.product_id,
              (productRevenueByProductId.get(line.product_id) || 0) + lineTotal
            );
          }
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

    // Break service/product revenue down by category — a lump "revenue" total hides exactly the
    // question a clinic owner asks first ("which category actually made this").
    const serviceIds = Array.from(serviceRevenueByServiceId.keys());
    let serviceCatById = new Map<number, string | null>();
    if (serviceIds.length > 0) {
      const { data: services, error: servicesError } = await supabaseServer
        .from('services')
        .select('id, cat')
        .in('id', serviceIds);
      if (servicesError) throw servicesError;
      serviceCatById = new Map((services || []).map((s: any) => [Number(s.id), s.cat || null]));
    }
    const serviceCatKeys = Array.from(new Set(Array.from(serviceCatById.values()).filter(Boolean))) as string[];
    let categoryLabelByKey = new Map<string, string>();
    if (serviceCatKeys.length > 0) {
      const { data: categories, error: categoriesError } = await supabaseServer
        .from('categories')
        .select('key, en')
        .in('key', serviceCatKeys);
      if (categoriesError) throw categoriesError;
      categoryLabelByKey = new Map((categories || []).map((c: any) => [c.key, c.en]));
    }
    const servicesByCategory = new Map<string, number>();
    for (const [sid, amount] of serviceRevenueByServiceId) {
      const catKey = serviceCatById.get(sid);
      const label = catKey ? categoryLabelByKey.get(catKey) || catKey : 'Uncategorized';
      servicesByCategory.set(label, round2((servicesByCategory.get(label) || 0) + amount));
    }

    const productIds = Array.from(productRevenueByProductId.keys());
    let productCategoryById = new Map<string, string | null>();
    if (productIds.length > 0) {
      const { data: products, error: productsError } = await supabaseServer
        .from('inventory_products')
        .select('id, category')
        .in('id', productIds);
      if (productsError) throw productsError;
      productCategoryById = new Map((products || []).map((p: any) => [p.id, p.category || null]));
    }
    const productsByCategory = new Map<string, number>();
    for (const [pid, amount] of productRevenueByProductId) {
      const label = productCategoryById.get(pid) || 'Uncategorized';
      productsByCategory.set(label, round2((productsByCategory.get(label) || 0) + amount));
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

    const revenue = round2(serviceRevenue + productRevenue + packageRevenueRecognised);
    cogs = round2(cogs);
    commission = round2(commission);

    // Fixed overhead: expenses + depreciation + loan interest (task 3.7 — interest_part only,
    // never installment, which includes the principal balance-sheet movement). Expenses broken
    // down by category — same reasoning as the revenue split above.
    let expensesQuery = supabaseServer
      .from('expenses')
      .select('amount, category_id')
      .gte('incurred_on', range.fromDate)
      .lt('incurred_on', range.toDateExclusive);
    if (branchId) expensesQuery = expensesQuery.eq('branch_id', branchId);
    const { data: expenseRows, error: expensesError } = await expensesQuery;
    if (expensesError) throw expensesError;
    const expensesTotal = round2((expenseRows || []).reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0));

    const expenseCategoryIds = Array.from(
      new Set((expenseRows || []).map((row: any) => row.category_id).filter(Boolean))
    );
    let expenseCategoryNameById = new Map<string, string>();
    if (expenseCategoryIds.length > 0) {
      const { data: expenseCategories, error: expenseCategoriesError } = await supabaseServer
        .from('expense_categories')
        .select('id, name')
        .in('id', expenseCategoryIds);
      if (expenseCategoriesError) throw expenseCategoriesError;
      expenseCategoryNameById = new Map((expenseCategories || []).map((c: any) => [c.id, c.name]));
    }
    const expensesByCategoryMap = new Map<string, number>();
    for (const row of expenseRows || []) {
      const label = row.category_id ? expenseCategoryNameById.get(row.category_id) || 'Unknown category' : 'Uncategorized';
      expensesByCategoryMap.set(label, round2((expensesByCategoryMap.get(label) || 0) + Number(row.amount || 0)));
    }

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
        services: {
          total: round2(serviceRevenue),
          byCategory: Array.from(servicesByCategory.entries()).map(([category, amount]) => ({ category, amount })),
        },
        products: {
          total: round2(productRevenue),
          byCategory: Array.from(productsByCategory.entries()).map(([category, amount]) => ({ category, amount })),
        },
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
        expenses: {
          total: expensesTotal,
          byCategory: Array.from(expensesByCategoryMap.entries()).map(([category, amount]) => ({ category, amount })),
        },
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
