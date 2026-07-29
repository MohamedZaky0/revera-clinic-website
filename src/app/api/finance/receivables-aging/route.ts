import { NextResponse } from 'next/server';
import { requireStaffAccess, hasFinancePermission } from '@/lib/access';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

type Bucket = '0-30' | '31-60' | '61-90' | '90+';

function bucketFor(ageDays: number): Bucket {
  if (ageDays <= 30) return '0-30';
  if (ageDays <= 60) return '31-60';
  if (ageDays <= 90) return '61-90';
  return '90+';
}

/**
 * GET /api/finance/receivables-aging[?branchId=&asOf=YYYY-MM-DD]
 *
 * Standard receivables aging report (task 4.10) — every customer with outstanding > 0, bucketed
 * by age since the invoice that created the debt. Built on the task 1.14 ledger derivation
 * (per-issued-invoice `max(0, grandTotal - paid)`, matching computeLedgerBalances' logic), not
 * the pre-1.14 `customers.outstanding` scalar — that inherits RISK-012's inflated figures.
 */
export async function GET(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!hasFinancePermission(access.access, 'finance.view_cashflow')) {
    return NextResponse.json({ error: 'Finance receivables access is required.' }, { status: 403 });
  }

  try {
    const url = new URL(req.url);
    const branchId = url.searchParams.get('branchId');
    const asOfParam = url.searchParams.get('asOf');
    if (asOfParam && (!DATE_RE.test(asOfParam) || Number.isNaN(new Date(asOfParam).getTime()))) {
      return NextResponse.json({ error: "asOf must be a valid 'YYYY-MM-DD' date." }, { status: 400 });
    }
    const asOf = asOfParam ? new Date(`${asOfParam}T00:00:00.000Z`) : new Date();

    let invoiceQuery = supabaseServer
      .from('invoices')
      .select('id, invoice_no, customer_id, branch_id, issued_at, grand_total')
      .eq('status', 'issued');
    if (branchId) invoiceQuery = invoiceQuery.eq('branch_id', branchId);
    const { data: invoices, error: invoicesError } = await invoiceQuery;
    if (invoicesError) throw invoicesError;
    const invoiceIds = (invoices || []).map((row: any) => row.id);

    const paidByInvoice = new Map<string, number>();
    if (invoiceIds.length > 0) {
      const { data: payments, error: paymentsError } = await supabaseServer
        .from('payments')
        .select('invoice_id, amount')
        .in('invoice_id', invoiceIds);
      if (paymentsError) throw paymentsError;
      for (const payment of payments || []) {
        paidByInvoice.set(
          payment.invoice_id,
          (paidByInvoice.get(payment.invoice_id) || 0) + Number(payment.amount || 0)
        );
      }
    }

    const outstandingInvoices: Array<{ invoice: any; outstanding: number }> = (invoices || [])
      .map((invoice: any) => {
        const paid = paidByInvoice.get(invoice.id) || 0;
        const outstanding = round2(Math.max(0, Number(invoice.grand_total || 0) - paid));
        return { invoice, outstanding };
      })
      .filter((row: { invoice: any; outstanding: number }) => row.outstanding > 0);

    const customerIds = Array.from(
      new Set(
        outstandingInvoices
          .map((row: { invoice: any; outstanding: number }) => row.invoice.customer_id)
          .filter(Boolean)
      )
    );
    let customersById = new Map<string, any>();
    if (customerIds.length > 0) {
      const { data: customers, error: customersError } = await supabaseServer
        .from('customers')
        .select('id, name')
        .in('id', customerIds);
      if (customersError) throw customersError;
      customersById = new Map((customers || []).map((c: any) => [c.id, c]));
    }

    const buckets: Record<Bucket, number> = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
    const items = outstandingInvoices.map(({ invoice, outstanding }: { invoice: any; outstanding: number }) => {
      const issuedAt = new Date(invoice.issued_at);
      const ageDays = Math.max(0, Math.floor((asOf.getTime() - issuedAt.getTime()) / MS_PER_DAY));
      const bucket = bucketFor(ageDays);
      buckets[bucket] = round2(buckets[bucket] + outstanding);

      return {
        customerId: invoice.customer_id || null,
        customerName: invoice.customer_id ? customersById.get(invoice.customer_id)?.name || 'Unknown' : 'Walk-in / no customer record',
        invoiceId: invoice.id,
        invoiceNo: invoice.invoice_no,
        issuedAt: invoice.issued_at,
        outstanding,
        ageDays,
        bucket,
      };
    });

    const totalOutstanding = round2(items.reduce((sum: number, item: { outstanding: number }) => sum + item.outstanding, 0));

    return NextResponse.json({
      asOf: asOf.toISOString().slice(0, 10),
      branchId: branchId || null,
      totalOutstanding,
      buckets,
      items,
    });
  } catch (error: any) {
    console.error('GET /api/finance/receivables-aging error:', error);
    return NextResponse.json({ error: error.message || 'Unable to compute receivables aging.' }, { status: 500 });
  }
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
