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

/** Map free-text payment type into the `transactions.payment_method` CHECK set. */
export function mapTransactionPaymentMethod(
  paymentType: string | null | undefined
): 'cash' | 'card' | 'bank_transfer' | 'wallet' | 'instapay' | 'vodafone_cash' | 'other' {
  const p = String(paymentType || '').toLowerCase();
  if (/card|visa|mastercard/.test(p)) return 'card';
  if (p.includes('instapay')) return 'instapay';
  if (p.includes('wallet')) return 'wallet';
  if (p.includes('transfer') || p.includes('bank')) return 'bank_transfer';
  if (p.includes('vodafone') || p.includes('vodafone_cash')) return 'vodafone_cash';
  if (p.includes('cash')) return 'cash';
  if (!p || p === '') return 'cash';
  return 'other';
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
    input.productName ? (input.productName.includes(',') ? `Products: ${input.productName}` : `Product: ${input.productName}`) : null,
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

/**
 * DEC-088 item 6 / RISK-106: a historical package can arrive with pulses already used before the clinic
 * started using the system — entered as a plain number on the Add/Edit Previous Booking screen
 * (`packagePulsesUsed`), separate from the "Enter invoice value" flow's own pre-launch-pulses field
 * (`confirm_historical_package_price`). Both must leave the same trail: exactly one `package_pulse_usage`
 * row with `reservation_id = NULL` (so revenue recognition — which requires a booking — never fires for
 * it, per DEC-088 item 10) tagged `used_by = 'Pre-launch usage'`. Without this row the pulses vanish from
 * package_pulse_usage entirely: `consume_package_pulses`'s clamp and `recognise_pulse_usage`'s range-based
 * amounts both read the package's usage history, so a "used" figure written straight onto
 * `customer_packages.pulses_used` with no matching usage row is invisible to both — it isn't part of the
 * deferred balance (correct) and it can never be recognised as revenue later either (a real loss of
 * information, not merely deferred).
 *
 * Idempotent and safe to call on every save of the same booking: at most one such row per package: an
 * unchanged or zero quantity is a no-op or a delete, not a second row that would double the usage total.
 */
export async function syncPreLaunchPulseUsage(input: {
  customerPackageId: string;
  quantityUsed: number;
  remainingAfter: number;
  purchasedAt: string;
}): Promise<{ status: 'synced' | 'failed'; error?: string }> {
  const qty = Math.max(0, Math.floor(input.quantityUsed));
  const remaining = Math.max(0, Math.floor(input.remainingAfter));
  try {
    const { data: existing, error: findErr } = await supabaseServer
      .from('package_pulse_usage')
      .select('id')
      .eq('customer_package_id', input.customerPackageId)
      .is('reservation_id', null)
      .eq('used_by', 'Pre-launch usage')
      .maybeSingle();
    if (findErr) throw findErr;

    if (qty <= 0) {
      if (existing?.id) {
        const { error: delErr } = await supabaseServer.from('package_pulse_usage').delete().eq('id', existing.id);
        if (delErr) throw delErr;
      }
      return { status: 'synced' };
    }

    if (existing?.id) {
      const { error: updErr } = await supabaseServer
        .from('package_pulse_usage')
        .update({ quantity_used: qty, remaining_after: remaining })
        .eq('id', existing.id);
      if (updErr) throw updErr;
    } else {
      const { error: insErr } = await supabaseServer.from('package_pulse_usage').insert({
        customer_package_id: input.customerPackageId,
        reservation_id: null,
        quantity_used: qty,
        remaining_after: remaining,
        used_by: 'Pre-launch usage',
        notes: 'Pulses used before the clinic started using the system (entered on the Add/Edit Previous Booking screen)',
        created_at: input.purchasedAt,
      });
      if (insErr) throw insErr;
    }
    return { status: 'synced' };
  } catch (err: any) {
    return { status: 'failed', error: err?.message || String(err) };
  }
}
