import { NextResponse } from 'next/server';
import { requireStaffAccess, hasFinancePermission } from '@/lib/access';
import { supabaseServer } from '@/lib/supabaseServer';
import { resolveDateRange } from '@/lib/financeReportRange';

export const dynamic = 'force-dynamic';

/**
 * GET /api/finance/new-vs-returning?period=YYYY-MM[&branchId=]
 * GET /api/finance/new-vs-returning?from=YYYY-MM-DD&to=YYYY-MM-DD[&branchId=]
 *
 * Splits the range's revenue (same definition as 4.6's P&L: service/product invoice_lines +
 * package revenue recognised in range) by whether each contributing customer is new or
 * returning -- "new" means their earliest-ever issued invoice falls inside this range; anyone
 * whose first invoice predates the range is "returning", even if this is their first visit in a
 * while. Answers "should we spend on acquiring new patients or on retaining existing ones,"
 * which no other Phase 4 report does -- everything else groups revenue by service/doctor/branch,
 * never by whether the patient is new.
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
      .select('id, customer_id')
      .eq('status', 'issued')
      .gte('issued_at', range.fromIso)
      .lt('issued_at', range.toIsoExclusive);
    if (branchId) invoiceQuery = invoiceQuery.eq('branch_id', branchId);
    const { data: invoices, error: invoicesError } = await invoiceQuery;
    if (invoicesError) throw invoicesError;
    const customerByInvoiceId = new Map<string, string | null>((invoices || []).map((row: any) => [row.id, row.customer_id]));
    const invoiceIds = Array.from(customerByInvoiceId.keys());

    const revenueByCustomer = new Map<string, number>();
    function addRevenue(customerId: string | null | undefined, amount: number) {
      const key = customerId || 'walk_in';
      revenueByCustomer.set(key, round2((revenueByCustomer.get(key) || 0) + amount));
    }

    if (invoiceIds.length > 0) {
      const { data: lines, error: linesError } = await supabaseServer
        .from('invoice_lines')
        .select('invoice_id, line_type, line_total')
        .in('invoice_id', invoiceIds)
        .in('line_type', ['service', 'product']);
      if (linesError) throw linesError;
      for (const line of lines || []) {
        addRevenue(customerByInvoiceId.get(line.invoice_id), Number(line.line_total || 0));
      }
    }

    let recognitionQuery = supabaseServer
      .from('package_revenue_recognitions')
      .select('recognised_amount, customer_packages!inner(customer_id, package_id), reservations!inner(branch_id)')
      .gte('recognised_at', range.fromIso)
      .lt('recognised_at', range.toIsoExclusive);
    if (branchId) recognitionQuery = recognitionQuery.eq('reservations.branch_id', branchId);
    const { data: recognitions, error: recognitionsError } = await recognitionQuery;
    if (recognitionsError) throw recognitionsError;
    for (const r of recognitions || []) {
      addRevenue((r as any).customer_packages?.customer_id, Number(r.recognised_amount || 0));
    }

    const customerIds = Array.from(revenueByCustomer.keys()).filter((id) => id !== 'walk_in');

    // Earliest-ever issued invoice per customer, across all time -- not range-scoped. Fetch every
    // issued invoice for these customers and take the min client-side rather than N queries.
    const firstInvoiceAt = new Map<string, string>();
    if (customerIds.length > 0) {
      const { data: allInvoices, error: allInvoicesError } = await supabaseServer
        .from('invoices')
        .select('customer_id, issued_at')
        .eq('status', 'issued')
        .in('customer_id', customerIds)
        .order('issued_at', { ascending: true });
      if (allInvoicesError) throw allInvoicesError;
      for (const inv of allInvoices || []) {
        if (!firstInvoiceAt.has(inv.customer_id)) firstInvoiceAt.set(inv.customer_id, inv.issued_at);
      }
    }

    let newRevenue = 0;
    let returningRevenue = 0;
    let newCustomerCount = 0;
    let returningCustomerCount = 0;
    let walkInRevenue = 0;

    for (const [customerId, amount] of revenueByCustomer) {
      if (customerId === 'walk_in') {
        walkInRevenue += amount;
        continue;
      }
      const firstAt = firstInvoiceAt.get(customerId);
      const isNew = !!firstAt && firstAt >= range.fromIso;
      if (isNew) {
        newRevenue += amount;
        newCustomerCount++;
      } else {
        returningRevenue += amount;
        returningCustomerCount++;
      }
    }

    return NextResponse.json({
      range: { label: range.label, from: range.fromDate, to: range.toDateInclusive },
      branchId: branchId || null,
      new: { revenue: round2(newRevenue), customerCount: newCustomerCount },
      returning: { revenue: round2(returningRevenue), customerCount: returningCustomerCount },
      walkIn: { revenue: round2(walkInRevenue), note: 'Invoices with no linked customer_id.' },
    });
  } catch (error: any) {
    console.error('GET /api/finance/new-vs-returning error:', error);
    return NextResponse.json({ error: error.message || 'Unable to compute new vs returning revenue.' }, { status: 500 });
  }
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
