import { supabaseServer } from '@/lib/supabaseServer';
import { buildInvoiceLine, buildInvoiceTotals, formatInvoiceNo } from '@/lib/ledger';

/**
 * DEC-086 / RISK-102: a historical booking (added through POST /api/reservations/previous) needs the
 * same invoice + payment the one-time script `scripts/backfill_historical_invoices.sql` writes, so the
 * ledger-derived customer figures stay in step with the customer scalars. Keep the two in agreement:
 *  - one `issued` invoice dated the booking's completion, one summary line, one payment if paid > 0;
 *  - flagged `is_opening = true` so revenue / margin / cash-flow reports exclude it;
 *  - total 0 -> nothing to write;
 *  - NO `transactions` row (the route already records the cash side there — a second one double-counts).
 */

export interface HistoricalInvoiceInput {
  reservationId: string;
  customerId: string;
  branchId: string | null;
  serviceId: number | null;
  /** ISO timestamp the booking is dated (the route uses `<date>T12:00:00Z`). */
  occurredAt: string;
  /** Invoice value the receptionist entered (0 when they entered none). */
  invoiceValue: number;
  amountPaid: number;
  serviceName: string | null;
  packageName: string | null;
  productName: string | null;
  paymentType: string | null;
  employeeId: string | null;
}

export type HistoricalInvoiceResult =
  | { status: 'created'; invoiceId: string; invoiceNo: string; total: number; paid: number }
  | { status: 'skipped'; reason: 'zero_total' }
  | { status: 'failed'; error: string };

/** Map free-text payment type into the `payments.method` CHECK set. */
export function mapPaymentMethod(paymentType: string | null | undefined): 'cash' | 'card' | 'wallet' | 'instapay' | 'transfer' {
  const p = String(paymentType || '').toLowerCase();
  if (/card|visa|mastercard/.test(p)) return 'card';
  if (p.includes('instapay')) return 'instapay';
  if (p.includes('wallet')) return 'wallet';
  if (p.includes('transfer')) return 'transfer';
  return 'cash';
}

export async function writeHistoricalBookingInvoice(input: HistoricalInvoiceInput): Promise<HistoricalInvoiceResult> {
  // Same rule as the script: the entered invoice value, else what was paid.
  const total = input.invoiceValue > 0 ? input.invoiceValue : input.amountPaid;
  if (!(total > 0)) return { status: 'skipped', reason: 'zero_total' };

  const hasPackage = Boolean(input.packageName);
  const hasProductOnly = Boolean(input.productName) && !input.serviceId && !hasPackage;
  const parts = [
    input.serviceName,
    input.packageName ? `Package: ${input.packageName}` : null,
    input.productName ? `Product: ${input.productName}` : null,
  ].filter(Boolean);
  const description = `${parts.length ? parts.join(', ') : 'Historical booking'} [historical backfill]`;

  const line = buildInvoiceLine({
    lineType: hasPackage ? 'package' : hasProductOnly ? 'product' : 'service',
    description,
    qty: 1,
    unitPrice: total,
    serviceId: hasPackage || hasProductOnly ? undefined : input.serviceId ?? undefined,
  });
  const totals = buildInvoiceTotals([line]);

  let invoiceId: string | null = null;
  try {
    const { data: seqValue, error: seqErr } = await supabaseServer.rpc('next_invoice_no');
    if (seqErr) throw seqErr;
    const invoiceNo = formatInvoiceNo(Number(seqValue));

    const { data: created, error: invErr } = await supabaseServer
      .from('invoices')
      .insert({
        invoice_no: invoiceNo,
        reservation_id: input.reservationId,
        customer_id: input.customerId,
        branch_id: input.branchId,
        issued_at: input.occurredAt,
        subtotal: totals.subtotal,
        discount_total: totals.discountTotal,
        grand_total: totals.grandTotal,
        status: 'issued',
        is_opening: true,
      })
      .select('id')
      .single();
    if (invErr) throw invErr;
    invoiceId = (created as any).id as string;

    const { error: lineErr } = await supabaseServer.from('invoice_lines').insert({ ...line, invoice_id: invoiceId });
    if (lineErr) throw lineErr;

    if (input.amountPaid > 0) {
      const { error: payErr } = await supabaseServer.from('payments').insert({
        invoice_id: invoiceId,
        received_at: input.occurredAt,
        amount: input.amountPaid,
        method: mapPaymentMethod(input.paymentType),
        received_by_employee_id: input.employeeId,
        reference: 'historical backfill',
        is_opening: true,
      });
      if (payErr) throw payErr;
    }

    return { status: 'created', invoiceId, invoiceNo, total: totals.grandTotal, paid: input.amountPaid };
  } catch (err: any) {
    // Never leave a half-written invoice behind: lines/payments cascade with the invoice.
    if (invoiceId) {
      await supabaseServer.from('invoices').delete().eq('id', invoiceId);
    }
    return { status: 'failed', error: err?.message || String(err) };
  }
}
