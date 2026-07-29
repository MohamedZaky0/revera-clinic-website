import { NextResponse } from 'next/server';
import { requireStaffAccess, hasFinancePermission } from '@/lib/access';
import { supabaseServer } from '@/lib/supabaseServer';
import { resolveDateRange } from '@/lib/financeReportRange';

export const dynamic = 'force-dynamic';

const PAYMENT_METHODS = ['cash', 'card', 'wallet', 'instapay', 'transfer'];

/**
 * GET /api/finance/cashflow?period=YYYY-MM[&branchId=]
 * GET /api/finance/cashflow?from=YYYY-MM-DD&to=YYYY-MM-DD[&branchId=]
 *
 * Cash actually received vs. cash actually paid out — deliberately a DIFFERENT number from
 * 4.6's P&L revenue (RISK-016: "a finance module defining revenue as collected cash will
 * disagree with bonus figures already paid to staff"). See FINANCE_TRACKER.md task 4.9. This
 * endpoint's numbers are cash movement, not profit — do not substitute them for 4.6's revenue
 * anywhere in the UI (task 4.13/4.15).
 */
export async function GET(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!hasFinancePermission(access.access, 'finance.view_cashflow')) {
    return NextResponse.json({ error: 'Finance cash flow access is required.' }, { status: 403 });
  }

  try {
    const url = new URL(req.url);
    const branchId = url.searchParams.get('branchId');
    const range = resolveDateRange({
      period: url.searchParams.get('period'),
      from: url.searchParams.get('from'),
      to: url.searchParams.get('to'),
    });

    // Cash received: payments against issued invoices in range. Branch attribution comes from
    // the invoice, not the payment row itself (payments carries no branch_id).
    let invoiceQuery = supabaseServer
      .from('invoices')
      .select('id')
      .eq('status', 'issued');
    if (branchId) invoiceQuery = invoiceQuery.eq('branch_id', branchId);
    const { data: invoices, error: invoicesError } = await invoiceQuery;
    if (invoicesError) throw invoicesError;
    const invoiceIds = (invoices || []).map((row: any) => row.id);

    const receivedByMethod: Record<string, number> = Object.fromEntries(PAYMENT_METHODS.map((m) => [m, 0]));
    let cashReceived = 0;
    if (invoiceIds.length > 0) {
      const { data: payments, error: paymentsError } = await supabaseServer
        .from('payments')
        .select('amount, method, received_at, invoice_id')
        .in('invoice_id', invoiceIds)
        .gte('received_at', range.fromIso)
        .lt('received_at', range.toIsoExclusive);
      if (paymentsError) throw paymentsError;
      for (const payment of payments || []) {
        const amount = Number(payment.amount || 0);
        cashReceived += amount;
        const method = payment.method && PAYMENT_METHODS.includes(payment.method) ? payment.method : 'cash';
        receivedByMethod[method] += amount;
      }
    }

    // Cash paid out: expenses (branch-scoped), purchases.paid (no branch_id anywhere in the
    // schema — excluded and flagged, not silently guessed at, when branchId is given), loan
    // installment by scheduled period (also clinic-wide, same reasoning).
    let expensesQuery = supabaseServer
      .from('expenses')
      .select('amount')
      .gte('incurred_on', range.fromDate)
      .lt('incurred_on', range.toDateExclusive);
    if (branchId) expensesQuery = expensesQuery.eq('branch_id', branchId);
    const { data: expenseRows, error: expensesError } = await expensesQuery;
    if (expensesError) throw expensesError;
    const expensesPaid = round2((expenseRows || []).reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0));

    let purchasesPaid = 0;
    let purchasesExcluded = false;
    if (branchId) {
      purchasesExcluded = true;
    } else {
      const { data: purchaseRows, error: purchasesError } = await supabaseServer
        .from('purchases')
        .select('paid')
        .gte('purchased_at', range.fromIso)
        .lt('purchased_at', range.toIsoExclusive);
      if (purchasesError) throw purchasesError;
      purchasesPaid = round2((purchaseRows || []).reduce((sum: number, row: any) => sum + Number(row.paid || 0), 0));
    }

    let loanInstallmentsPaid = 0;
    let loanInstallmentsExcluded = false;
    if (branchId) {
      loanInstallmentsExcluded = true;
    } else {
      const { data: scheduleRows, error: scheduleError } = await supabaseServer
        .from('loan_schedule')
        .select('installment')
        .in('period', range.periods);
      if (scheduleError) throw scheduleError;
      loanInstallmentsPaid = round2(
        (scheduleRows || []).reduce((sum: number, row: any) => sum + Number(row.installment || 0), 0)
      );
    }

    const cashPaidOut = round2(expensesPaid + purchasesPaid + loanInstallmentsPaid);
    const netCashFlow = round2(cashReceived - cashPaidOut);

    return NextResponse.json({
      range: { label: range.label, from: range.fromDate, to: range.toDateInclusive },
      branchId: branchId || null,
      note: 'Cash movement, not accrual revenue/profit — see GET /api/finance/pnl for the P&L view. The two are deliberately different numbers (RISK-016).',
      cashReceived: { total: round2(cashReceived), byMethod: receivedByMethod },
      cashPaidOut: {
        total: cashPaidOut,
        expenses: expensesPaid,
        purchases: purchasesPaid,
        purchasesExcluded,
        loanInstallments: loanInstallmentsPaid,
        loanInstallmentsExcluded,
      },
      netCashFlow,
    });
  } catch (error: any) {
    console.error('GET /api/finance/cashflow error:', error);
    return NextResponse.json({ error: error.message || 'Unable to compute cash flow.' }, { status: 500 });
  }
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
