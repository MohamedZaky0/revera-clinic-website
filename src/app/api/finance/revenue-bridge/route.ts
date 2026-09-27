import { NextResponse } from 'next/server';
import { requireStaffAccess, hasFinancePermission } from '@/lib/access';
import { supabaseServer } from '@/lib/supabaseServer';
import { resolveDateRange } from '@/lib/financeReportRange';
import { EXCLUDE_OPENING_INVOICES } from '@/lib/ledger';
import { packageCashReceived } from '@/lib/financeBridge';

export const dynamic = 'force-dynamic';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * GET /api/finance/revenue-bridge?branchId=&period=YYYY-MM   (or from=&to=)
 *
 * DEC-088 item 9: the two figures the P&L bridge needs that the P&L itself does not return — cash received in the
 * period (the same definition as /api/finance/cashflow: payments on live issued invoices) and how much of it paid for
 * packages (deferred, not yet earned). Revenue earned and package revenue recognised come from /api/finance/pnl; the
 * screen combines them with `computeRevenueBridge`.
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
      .select('id, grand_total')
      .eq('status', 'issued')
      .or(EXCLUDE_OPENING_INVOICES);
    if (branchId) invoiceQuery = invoiceQuery.eq('branch_id', branchId);
    const { data: invoices, error: invoicesError } = await invoiceQuery;
    if (invoicesError) throw invoicesError;
    const invoiceIds = (invoices || []).map((row: any) => row.id);

    let cashReceived = 0;
    let packageCash = 0;
    if (invoiceIds.length > 0) {
      const { data: payments, error: paymentsError } = await supabaseServer
        .from('payments')
        .select('invoice_id, amount')
        .in('invoice_id', invoiceIds)
        .gte('received_at', range.fromIso)
        .lt('received_at', range.toIsoExclusive);
      if (paymentsError) throw paymentsError;
      cashReceived = (payments || []).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);

      const paidInvoiceIds = Array.from(new Set((payments || []).map((p: any) => p.invoice_id)));
      if (paidInvoiceIds.length > 0) {
        const { data: lines, error: linesError } = await supabaseServer
          .from('invoice_lines')
          .select('invoice_id, line_type, line_total')
          .in('invoice_id', paidInvoiceIds)
          .eq('line_type', 'package');
        if (linesError) throw linesError;
        packageCash = packageCashReceived(
          (invoices || []).map((i: any) => ({ id: i.id, grandTotal: Number(i.grand_total || 0) })),
          (lines || []).map((l: any) => ({ invoiceId: l.invoice_id, lineType: l.line_type, lineTotal: Number(l.line_total || 0) })),
          (payments || []).map((p: any) => ({ invoiceId: p.invoice_id, amount: Number(p.amount || 0) }))
        );
      }
    }

    return NextResponse.json({
      range: { label: range.label, from: range.fromDate, to: range.toDateInclusive },
      branchId: branchId || null,
      cashReceived: round2(cashReceived),
      packageCashReceived: round2(packageCash),
    });
  } catch (error: any) {
    console.error('GET /api/finance/revenue-bridge failed:', error);
    return NextResponse.json({ error: error?.message || 'Unable to compute the revenue bridge.' }, { status: 500 });
  }
}
