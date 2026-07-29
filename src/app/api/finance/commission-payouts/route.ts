import { NextResponse } from 'next/server';
import { requireStaffAccess, hasFinancePermission } from '@/lib/access';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

const PERIOD_RE = /^\d{4}-\d{2}$/;

function monthBounds(period: string): { fromIso: string; toIsoExclusive: string } {
  const [yearStr, monthStr] = period.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr); // 1-12
  return {
    fromIso: new Date(Date.UTC(year, month - 1, 1)).toISOString(),
    toIsoExclusive: new Date(Date.UTC(year, month, 1)).toISOString(),
  };
}

/**
 * GET /api/finance/commission-payouts?period=YYYY-MM
 *
 * Reconciliation view, not a duplicate of the HR payroll screen (`GET /api/hr/doctor-payroll`
 * already manages the actual payroll run). This answers: does what the booking ledger says a
 * doctor earned in commission this month match what payroll actually recorded for them, so a
 * mismatch (payroll not run yet, or drifted from a booking made/edited after the payroll run) is
 * visible before money changes hands -- the same kind of drift-detection
 * `GET /api/customers/reconcile` already does for patient balances.
 */
export async function GET(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!hasFinancePermission(access.access, 'finance.view_pnl')) {
    return NextResponse.json({ error: 'Finance P&L access is required.' }, { status: 403 });
  }

  try {
    const url = new URL(req.url);
    const period = url.searchParams.get('period');
    if (!period || !PERIOD_RE.test(period)) {
      return NextResponse.json({ error: "period is required and must be 'YYYY-MM'." }, { status: 400 });
    }
    const { fromIso, toIsoExclusive } = monthBounds(period);

    const { data: invoices, error: invoicesError } = await supabaseServer
      .from('invoices')
      .select('id')
      .eq('status', 'issued')
      .gte('issued_at', fromIso)
      .lt('issued_at', toIsoExclusive);
    if (invoicesError) throw invoicesError;
    const invoiceIds = (invoices || []).map((row: any) => row.id);

    const ledgerByProvider = new Map<string, number>();
    if (invoiceIds.length > 0) {
      const { data: lines, error: linesError } = await supabaseServer
        .from('invoice_lines')
        .select('provider_id, commission_snapshot')
        .in('invoice_id', invoiceIds)
        .not('provider_id', 'is', null)
        .not('commission_snapshot', 'is', null);
      if (linesError) throw linesError;
      for (const line of lines || []) {
        ledgerByProvider.set(
          line.provider_id,
          round2((ledgerByProvider.get(line.provider_id) || 0) + Number(line.commission_snapshot || 0))
        );
      }
    }

    const { data: payrollRows, error: payrollError } = await supabaseServer
      .from('doctor_payroll')
      .select('provider_id, total_commission_earned, status, payment_date')
      .eq('month', period);
    if (payrollError) throw payrollError;
    const payrollByProvider = new Map<string, any>((payrollRows || []).map((row: any) => [row.provider_id, row]));

    const allProviderIds = new Set<string>([...Array.from(ledgerByProvider.keys()), ...Array.from(payrollByProvider.keys())]);
    let providerNameById = new Map<string, string>();
    if (allProviderIds.size > 0) {
      const { data: providers, error: providersError } = await supabaseServer
        .from('providers')
        .select('id, name')
        .in('id', Array.from(allProviderIds));
      if (providersError) throw providersError;
      providerNameById = new Map((providers || []).map((p: any) => [p.id, p.name]));
    }

    const results = Array.from(allProviderIds).map((providerId) => {
      const ledgerCommission = round2(ledgerByProvider.get(providerId) || 0);
      const payroll = payrollByProvider.get(providerId);
      const payrollCommission = payroll ? round2(Number(payroll.total_commission_earned || 0)) : null;
      const variance = payrollCommission === null ? null : round2(ledgerCommission - payrollCommission);

      return {
        providerId,
        providerName: providerNameById.get(providerId) || 'Unknown provider',
        ledgerCommission,
        payroll: payroll
          ? { commission: payrollCommission, status: payroll.status, paymentDate: payroll.payment_date }
          : null,
        variance,
        status: !payroll ? 'payroll_not_run' : variance === 0 ? 'matches' : 'mismatch',
      };
    });

    results.sort((a, b) => b.ledgerCommission - a.ledgerCommission);

    return NextResponse.json({ period, providers: results });
  } catch (error: any) {
    console.error('GET /api/finance/commission-payouts error:', error);
    return NextResponse.json({ error: error.message || 'Unable to compute commission payouts.' }, { status: 500 });
  }
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
