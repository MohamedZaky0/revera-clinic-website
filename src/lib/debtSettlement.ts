import { supabaseServer } from '@/lib/supabaseServer';
import { recordTransactionStrict } from '@/lib/transactionLedger';
import { formatInvoiceNo } from '@/lib/ledger';
import { round2 } from '@/lib/bookingDeletion';
import { eqOrNull } from '@/lib/bookingHardDelete';

/**
 * The write half of POST /api/customers/settle-debt (DEC-138 / RISK-142).
 *
 * DEC-136 wrote the booking balance first, recorded the payment afterwards inside a try/catch that
 * only logged, and then wrote the patient's `outstanding` / `spent_amount` as absolute numbers
 * computed from a read taken at the start of the request. Three things followed:
 *
 *   - a payment row or transaction that failed to write left a booking shown as PAID with no money
 *     record behind it (the ledger and the booking disagreed);
 *   - a failure half way through a multi-booking (FIFO) settlement left the earlier bookings paid;
 *   - two settlements for the same patient at the same moment, or any other route moving those two
 *     numbers in between, silently lost one of the updates.
 *
 * Supabase offers no multi-statement transaction from the API, so this is an ordered sequence with an
 * undo for every step, in the style of `bookingHardDelete.ts`:
 *
 *   for each allocation, in order:
 *     1. the money record: the `payments` row (when the booking/invoice has an invoice) and the
 *        `transactions` row. Errors are NOT swallowed here.
 *     2. the booking's balance, written only if the booking still holds the numbers that were read
 *        (compare-and-set on amount_paid + amount_left)
 *   after the last allocation:
 *     3. the patient's figures, a compare-and-set on the values just read; on a conflict the figures
 *        are re-read and the same delta is applied again (a few attempts), so two settlements that
 *        overlap both count.
 *
 * Step 3 is the commit point. A failure anywhere before it undoes every earlier write and reports
 * that nothing was changed. If an undo step itself fails the response says `partial: true` and lists
 * exactly which allocations are still applied and which rows are left over.
 *
 * Money first, booking second: if the process dies between the two, the books show a payment that
 * the booking does not (visible, and it matches the cash actually taken) instead of a booking marked
 * paid with nothing to show for it.
 *
 * No migration is needed. A Postgres function (`outstanding = outstanding - x`) would make step 3 a
 * single statement, but the guarded update plus retry gives the same result without a schema change
 * the team cannot apply from here.
 */

export interface InvoiceRef {
  id: string;
  invoice_no: string | null;
  customer_id: string | null;
  branch_id: string | null;
}

export type SettlementItem =
  | {
      kind: 'reservation';
      id: string;
      portion: number;
      date: string | null;
      paidBefore: number;
      leftBefore: number;
      branchId: string | null;
      /** The invoice the payment row is attached to; null = record only the transaction. */
      invoice: InvoiceRef | null;
    }
  | {
      kind: 'invoice';
      id: string;
      portion: number;
      date: string | null;
      invoiceNo: string | null;
    };

export interface AppliedAllocation {
  reservationId: string;
  amount: number;
  date: string | null;
  /** Reservation items only. */
  newPaid?: number;
  newLeft?: number;
}

export interface SettleParams {
  customer: { id: string; outstanding: unknown; spent_amount: unknown };
  items: SettlementItem[];
  paymentMethod: string;
  paymentReference: string | null;
  employeeId: string | null;
  employeeBranchId: string | null;
}

export type SettleOutcome =
  | { ok: true; settled: number; outstandingAfter: number; applied: AppliedAllocation[] }
  | { ok: false; status: number; body: Record<string, any> };

const MAX_FIGURE_ATTEMPTS = 5;

/**
 * The invoice a payment against this booking is attached to: the newest one, the same lookup
 * `appendPaymentToExistingInvoice` (reservations route) has always used. A read error is returned,
 * not swallowed, so the caller can refuse before anything is written.
 */
export async function findReservationInvoice(
  reservationId: string
): Promise<{ invoice: InvoiceRef | null; error: string | null }> {
  const { data, error } = await supabaseServer
    .from('invoices')
    .select('id, invoice_no, customer_id, branch_id')
    .eq('reservation_id', reservationId)
    // only an issued invoice can take a payment; a void one must never (RISK-143, same rule as appendPaymentToExistingInvoice)
    .eq('status', 'issued')
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) return { invoice: null, error: error.message };
  const row = data && data.length > 0 ? data[0] : null;
  return { invoice: row ? { id: row.id, invoice_no: row.invoice_no ?? null, customer_id: row.customer_id ?? null, branch_id: row.branch_id ?? null } : null, error: null };
}

interface ItemState {
  item: SettlementItem;
  paymentId: string | null;
  transactionId: string | null;
  bookingWritten: { newPaid: number; newLeft: number } | null;
}

function fail(status: number, error: string, extra: Record<string, any> = {}): SettleOutcome {
  return { ok: false, status, body: { error, ...extra } };
}

function describe(item: SettlementItem): AppliedAllocation {
  return { reservationId: item.id, amount: item.portion, date: item.date };
}

export async function applySettlement(params: SettleParams): Promise<SettleOutcome> {
  const { customer, items, paymentMethod, paymentReference, employeeId, employeeBranchId } = params;
  const settled = round2(items.reduce((sum, i) => sum + i.portion, 0));
  const states: ItemState[] = [];

  /** Undo one allocation. Returns what is still in place afterwards (empty = fully undone). */
  const undoItem = async (st: ItemState, failures: string[]): Promise<string[]> => {
    const leftover: string[] = [];
    const attempt = async (label: string, run: () => PromiseLike<{ data?: any; error: { message: string } | null }>) => {
      try {
        const { error } = await run();
        if (error) {
          failures.push(`${label} (${st.item.id}): ${error.message}`);
          return false;
        }
        return true;
      } catch (e: any) {
        failures.push(`${label} (${st.item.id}): ${e?.message || String(e)}`);
        return false;
      }
    };

    if (st.bookingWritten && st.item.kind === 'reservation') {
      const it = st.item;
      const w = st.bookingWritten;
      let restored = false;
      try {
        const { data, error } = await supabaseServer
          .from('reservations')
          .update({ amount_paid: it.paidBefore, amount_left: it.leftBefore })
          .eq('id', it.id)
          .eq('amount_paid', w.newPaid)
          .eq('amount_left', w.newLeft)
          .select('id');
        if (error) failures.push(`restore the booking balance (${it.id}): ${error.message}`);
        else if (!data || data.length === 0) failures.push(`restore the booking balance (${it.id}): the booking changed in the meantime`);
        else restored = true;
      } catch (e: any) {
        failures.push(`restore the booking balance (${it.id}): ${e?.message || String(e)}`);
      }
      if (!restored) {
        // The booking still says "paid". Keep its payment and transaction too, so the booking and the
        // ledger at least agree with each other; the allocation is reported as still applied.
        leftover.push('booking balance');
        return leftover;
      }
    }
    if (st.transactionId) {
      const id = st.transactionId;
      const ok = await attempt('remove the transaction row', () => supabaseServer.from('transactions').delete().eq('id', id).select('id'));
      if (!ok) leftover.push('transaction row');
    }
    if (st.paymentId) {
      const id = st.paymentId;
      const ok = await attempt('remove the payment row', () => supabaseServer.from('payments').delete().eq('id', id).select('id'));
      if (!ok) leftover.push('payment row');
    }
    return leftover;
  };

  const abort = async (status: number, message: string, detail: string, extra: Record<string, any> = {}): Promise<SettleOutcome> => {
    console.error(`settle-debt: ${detail} (patient ${customer.id})`);
    const undoFailures: string[] = [];
    const stillApplied: Array<AppliedAllocation & { leftover: string[] }> = [];
    for (const st of [...states].reverse()) {
      const leftover = await undoItem(st, undoFailures);
      if (leftover.length > 0) stillApplied.unshift({ ...describe(st.item), leftover });
    }
    if (undoFailures.length > 0) {
      console.error('settle-debt: UNDO FAILED, data is partly changed:', undoFailures);
      return fail(
        status,
        `${message} The settlement was cancelled, but some steps already done could not be undone, so part of this payment is still recorded. Tell the developer before retrying; the details list what is left.`,
        { partial: true, undoFailures, applied: stillApplied, ...extra }
      );
    }
    return fail(status, `${message} The payment was not applied and nothing was changed.`, extra);
  };

  // ── Allocations: money record first, then the booking balance ──────────────
  for (const item of items) {
    const st: ItemState = { item, paymentId: null, transactionId: null, bookingWritten: null };
    states.push(st);

    let invoiceId: string | null;
    let invoiceNo: string | null;
    let txnCustomerId: string | null = customer.id;
    let txnBranchId: string | null;
    let description: string;
    let reservationId: string | null = null;

    if (item.kind === 'reservation') {
      invoiceId = item.invoice?.id ?? null;
      invoiceNo = item.invoice?.invoice_no ?? null;
      reservationId = item.id;
      if (item.invoice) {
        txnCustomerId = item.invoice.customer_id || customer.id;
        txnBranchId = item.invoice.branch_id ?? null;
        description = `Balance settlement for invoice ${invoiceNo || ''}`.trim();
      } else {
        txnBranchId = item.branchId || employeeBranchId || null;
        description = `Balance settlement for reservation ${item.id.slice(0, 8)}`;
      }
    } else {
      invoiceId = item.id;
      invoiceNo = item.invoiceNo;
      txnBranchId = employeeBranchId || null;
      description = `Balance settlement for invoice ${invoiceNo || ''}`.trim();
    }

    // The reference shown on the receipt. Only drawn when a payment row exists to carry it.
    let reference = paymentReference;
    if (invoiceId) {
      if (!reference) {
        const { data: seqVal } = await supabaseServer.rpc('next_invoice_no');
        if (seqVal != null) reference = formatInvoiceNo(Number(seqVal));
      }
      const { data: pay, error: payErr } = await supabaseServer
        .from('payments')
        .insert({
          invoice_id: invoiceId,
          amount: item.portion,
          method: paymentMethod || 'cash',
          reference,
          received_by_employee_id: employeeId,
        })
        .select('id')
        .single();
      if (payErr || !pay?.id) {
        return abort(500, 'The payment could not be recorded.', `payment insert failed for ${item.id}: ${payErr?.message || 'no row returned'}`);
      }
      st.paymentId = String(pay.id);
    }

    try {
      st.transactionId = await recordTransactionStrict({
        type: 'outstanding_payment',
        amount: item.portion,
        description,
        customerId: txnCustomerId,
        branchId: txnBranchId,
        invoiceId,
        reservationId,
        paymentMethod: paymentMethod || 'cash',
        referenceNo: reference,
        createdByEmployeeId: employeeId,
        status: 'completed',
        source: 'automatic',
      });
    } catch (e: any) {
      return abort(500, 'The payment could not be added to the transaction history.', `transaction insert failed for ${item.id}: ${e?.message || e}`);
    }

    if (item.kind === 'reservation') {
      const newPaid = round2(item.paidBefore + item.portion);
      const newLeft = round2(item.leftBefore - item.portion);
      const { data: changed, error: updErr } = await supabaseServer
        .from('reservations')
        .update({ amount_paid: newPaid, amount_left: newLeft })
        .eq('id', item.id)
        .eq('amount_paid', item.paidBefore)
        .eq('amount_left', item.leftBefore)
        .select('id');
      if (updErr) {
        return abort(500, 'The booking balance could not be updated.', `booking update failed for ${item.id}: ${updErr.message}`);
      }
      if (!changed || changed.length === 0) {
        return abort(
          409,
          'This booking changed while this was running (someone else paid or edited it). Open the patient again and retry.',
          `booking ${item.id} changed concurrently`,
          { code: 'BOOKING_CHANGED' }
        );
      }
      st.bookingWritten = { newPaid, newLeft };
    }
  }

  // ── The patient's figures (commit point): compare-and-set, re-applied on conflict ──
  let currentOutstanding: unknown = customer.outstanding;
  let currentSpent: unknown = customer.spent_amount;
  for (let attempt = 1; attempt <= MAX_FIGURE_ATTEMPTS; attempt++) {
    const nextOutstanding = Math.max(0, round2(Number(currentOutstanding || 0) - settled));
    const nextSpent = round2(Number(currentSpent || 0) + settled);

    let q: any = supabaseServer
      .from('customers')
      .update({ outstanding: nextOutstanding, spent_amount: nextSpent, updated_at: new Date().toISOString() })
      .eq('id', customer.id);
    q = eqOrNull(q, 'outstanding', currentOutstanding);
    q = eqOrNull(q, 'spent_amount', currentSpent);
    const { data: updated, error } = await q.select('id');
    if (error) {
      return abort(500, "The patient's figures could not be updated.", `patient figures update failed: ${error.message}`);
    }
    if (updated && updated.length > 0) {
      return {
        ok: true,
        settled,
        outstandingAfter: nextOutstanding,
        applied: states.map((s) => {
          const base = describe(s.item);
          return s.bookingWritten ? { ...base, newPaid: s.bookingWritten.newPaid, newLeft: s.bookingWritten.newLeft } : base;
        }),
      };
    }

    // Someone else moved the figures since they were read: read them again and re-apply our delta.
    const { data: fresh, error: readErr } = await supabaseServer
      .from('customers')
      .select('id, outstanding, spent_amount')
      .eq('id', customer.id)
      .maybeSingle();
    if (readErr) {
      return abort(500, "The patient's figures could not be re-read.", `patient figures re-read failed: ${readErr.message}`);
    }
    if (!fresh) {
      return abort(404, 'The patient no longer exists.', 'patient vanished during settlement');
    }
    currentOutstanding = fresh.outstanding;
    currentSpent = fresh.spent_amount;
  }

  return abort(
    409,
    "The patient's figures kept changing while this was running.",
    `patient figures changed on every one of ${MAX_FIGURE_ATTEMPTS} attempts`,
    { code: 'PATIENT_FIGURES_CHANGED' }
  );
}
