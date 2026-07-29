import { NextResponse } from 'next/server';
import { requireStaffAccess, hasFinancePermission } from '@/lib/access';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

const PERIOD_RE = /^\d{4}-\d{2}$/;

function monthBounds(period: string): { fromDate: string; toDateExclusive: string } {
  const [yearStr, monthStr] = period.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr); // 1-12
  const fromDateObj = new Date(Date.UTC(year, month - 1, 1));
  const toExclusiveObj = new Date(Date.UTC(year, month, 1));
  return {
    fromDate: fromDateObj.toISOString().slice(0, 10),
    toDateExclusive: toExclusiveObj.toISOString().slice(0, 10),
  };
}

/**
 * GET /api/finance/budget-vs-actual?period=YYYY-MM[&branchId=&categoryId=]
 *
 * Joins each `budget_lines` row for the period against actual `expenses` incurred in the same
 * category/branch/period. `variance = budgeted - actual`: positive means under budget, negative
 * means over. See FINANCE_TRACKER.md task 4.11.
 */
export async function GET(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!hasFinancePermission(access.access, 'finance.manage_expenses')) {
    return NextResponse.json({ error: 'Finance budget access is required.' }, { status: 403 });
  }

  try {
    const url = new URL(req.url);
    const period = url.searchParams.get('period');
    const branchId = url.searchParams.get('branchId');
    const categoryId = url.searchParams.get('categoryId');
    if (!period || !PERIOD_RE.test(period)) {
      return NextResponse.json({ error: "period is required and must be 'YYYY-MM'." }, { status: 400 });
    }
    const { fromDate, toDateExclusive } = monthBounds(period);

    let budgetQuery = supabaseServer.from('budget_lines').select('id, category_id, branch_id, budgeted').eq('period', period);
    if (branchId) budgetQuery = budgetQuery.eq('branch_id', branchId);
    if (categoryId) budgetQuery = budgetQuery.eq('category_id', categoryId);
    const { data: budgetLines, error: budgetError } = await budgetQuery;
    if (budgetError) throw budgetError;

    const categoryIds = Array.from(new Set((budgetLines || []).map((row: any) => row.category_id)));
    let categoriesById = new Map<string, any>();
    if (categoryIds.length > 0) {
      const { data: categories, error: categoriesError } = await supabaseServer
        .from('expense_categories')
        .select('id, name')
        .in('id', categoryIds);
      if (categoriesError) throw categoriesError;
      categoriesById = new Map((categories || []).map((c: any) => [c.id, c]));
    }

    // All expenses in the period once, then aggregated per (category, branch) in memory —
    // avoids one query per budget line and lets a clinic-wide (branch_id IS NULL) budget line
    // sum expenses across every branch for that category.
    let expenseQuery = supabaseServer
      .from('expenses')
      .select('category_id, branch_id, amount')
      .gte('incurred_on', fromDate)
      .lt('incurred_on', toDateExclusive);
    if (branchId) expenseQuery = expenseQuery.eq('branch_id', branchId);
    if (categoryId) expenseQuery = expenseQuery.eq('category_id', categoryId);
    const { data: expenseRows, error: expenseError } = await expenseQuery;
    if (expenseError) throw expenseError;

    const actualByCategory = new Map<string, number>(); // clinic-wide, all branches
    const actualByCategoryBranch = new Map<string, number>(); // key: `${categoryId}::${branchId}`
    for (const row of expenseRows || []) {
      const amount = Number(row.amount || 0);
      actualByCategory.set(row.category_id, (actualByCategory.get(row.category_id) || 0) + amount);
      if (row.branch_id) {
        const key = `${row.category_id}::${row.branch_id}`;
        actualByCategoryBranch.set(key, (actualByCategoryBranch.get(key) || 0) + amount);
      }
    }

    const items = (budgetLines || []).map((line: any) => {
      const budgeted = Number(line.budgeted || 0);
      const actual = line.branch_id
        ? actualByCategoryBranch.get(`${line.category_id}::${line.branch_id}`) || 0
        : actualByCategory.get(line.category_id) || 0;
      const variance = round2(budgeted - actual);

      return {
        budgetLineId: line.id,
        categoryId: line.category_id,
        categoryName: categoriesById.get(line.category_id)?.name || 'Unknown category',
        branchId: line.branch_id || null,
        period,
        budgeted: round2(budgeted),
        actual: round2(actual),
        variance,
        status: variance >= 0 ? 'under_or_on_budget' : 'over_budget',
      };
    });

    // Categories with real spend in the period but no budget line at all — surfaced separately
    // rather than silently omitted, same reasoning as 4.6/4.9's "excluded, not dropped" flags.
    const budgetedCategoryIds = new Set((budgetLines || []).map((line: any) => line.category_id));
    const unbudgetedCategoryIds = Array.from(actualByCategory.keys()).filter((id) => !budgetedCategoryIds.has(id));
    let unbudgetedCategoriesById = new Map<string, any>();
    if (unbudgetedCategoryIds.length > 0) {
      const { data: unbudgetedCats, error: unbudgetedError } = await supabaseServer
        .from('expense_categories')
        .select('id, name')
        .in('id', unbudgetedCategoryIds);
      if (unbudgetedError) throw unbudgetedError;
      unbudgetedCategoriesById = new Map((unbudgetedCats || []).map((c: any) => [c.id, c]));
    }
    const unbudgeted = unbudgetedCategoryIds.map((id) => ({
      categoryId: id,
      categoryName: unbudgetedCategoriesById.get(id)?.name || 'Unknown category',
      actual: round2(actualByCategory.get(id) || 0),
    }));

    return NextResponse.json({ period, branchId: branchId || null, items, unbudgeted });
  } catch (error: any) {
    console.error('GET /api/finance/budget-vs-actual error:', error);
    return NextResponse.json({ error: error.message || 'Unable to compute budget vs actual.' }, { status: 500 });
  }
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
