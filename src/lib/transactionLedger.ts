import { supabaseServer } from '@/lib/supabaseServer';
import { formatInvoiceNo } from '@/lib/ledger';

/**
 * Records a row in `transactions` — the customer-facing financial history shown in
 * Admin → Transactions and the patient profile's Transactions tab.
 *
 * ## Why this exists
 * The `transactions` table was introduced with the Financial Transactions module, but nothing
 * except the manual-entry form ever wrote to it — the checkout, deposits, product sales and
 * package sales all moved real money without leaving a trace here (RISK-076). A patient with ten
 * completed visits showed zero transactions. This helper is what the operational flows call so the
 * ledger reflects what actually happened, with `source: 'automatic'` distinguishing those rows from
 * hand-entered historical ones.
 *
 * ## Amount sign convention
 * `amount` is signed and mirrors the manual route: positive when value flows toward the clinic (a
 * charge raised, cash received, wallet credited), negative when it flows back to the patient (a
 * refund, a wallet draw-down). Callers pass the sign explicitly rather than having it inferred.
 *
 * ## Failure policy: non-fatal, by design
 * A ledger write must never sink the operation it is describing — a patient is standing at the
 * desk and their checkout has already moved real money in `invoices`/`payments`/`customers`.
 * Errors are logged loudly and swallowed, matching how `provider_schedule_audit_logs` and checkout
 * costing are already treated in this codebase. The trade-off is explicit: a missing history row is
 * recoverable (it can be rebuilt from the invoice ledger), a failed checkout is not.
 *
 * ## Idempotency is the caller's responsibility
 * This helper always inserts. Call it only from a code path that itself runs once per real event —
 * e.g. next to a `payments` insert that is already guarded against re-firing. Calling it from an
 * unguarded path will duplicate financial history.
 */
export async function recordTransaction(input: RecordTransactionInput): Promise<void> {
  try {
    await writeTransactionRow(input, false);
  } catch (err: any) {
    if (err instanceof TransactionInsertError) {
      console.error('recordTransaction: failed to insert transaction row (non-fatal):', err.message);
    } else {
      console.error('recordTransaction: unexpected failure (non-fatal):', err);
    }
  }
}

/**
 * Same insert as `recordTransaction`, but the caller learns whether it worked.
 *
 * Returns the new row's `id` (so the caller can undo it), `null` when there was nothing to record
 * (a zero or non-numeric amount), and THROWS when the insert fails. Use it only where the ledger row
 * is part of an operation that must be all-or-nothing (the debt settlement, DEC-138), never for the
 * "history must not sink the checkout" cases `recordTransaction` exists for.
 */
export async function recordTransactionStrict(input: RecordTransactionInput): Promise<string | null> {
  return writeTransactionRow(input, true);
}

export interface RecordTransactionInput {
  type:
    | 'payment'
    | 'outstanding_payment'
    | 'refund'
    | 'wallet_topup'
    | 'wallet_deduction'
    | 'service_charge'
    | 'product_purchase'
    | 'adjustment';
  amount: number;
  description: string;
  customerId?: string | null;
  branchId?: string | null;
  invoiceId?: string | null;
  reservationId?: string | null;
  paymentMethod?: string;
  status?: 'completed' | 'pending' | 'outstanding' | 'refunded' | 'failed';
  source?: 'manual' | 'automatic';
  referenceNo?: string | null;
  reason?: string | null;
  createdByEmployeeId?: string | null;
  createdByName?: string | null;
  occurredAt?: string | null;
}

class TransactionInsertError extends Error {}

async function writeTransactionRow(
  {
    type,
    amount,
    description,
    customerId,
    branchId,
    invoiceId,
    reservationId,
    paymentMethod = 'cash',
    status = 'completed',
    source = 'automatic',
    referenceNo,
    reason,
    createdByEmployeeId,
    createdByName,
    occurredAt,
  }: RecordTransactionInput,
  returnId: boolean
): Promise<string | null> {
  if (!amount || Number.isNaN(Number(amount))) return null;

  const { data: seqVal, error: seqErr } = await supabaseServer.rpc('next_transaction_seq');
  const txnId = (seqErr || seqVal == null)
    ? `TXN-${String(Date.now()).slice(-6)}`
    : `TXN-${String(Number(seqVal)).padStart(6, '0')}`;
  if (seqErr || seqVal == null) {
    console.warn('recordTransaction: next_transaction_seq failed, using fallback transaction ID:', seqErr);
  }

  const finalReferenceNo = referenceNo?.trim() || null;

  const insert = supabaseServer.from('transactions').insert({
    transaction_id: txnId,
    branch_id: branchId ?? null,
    customer_id: customerId ?? null,
    invoice_id: invoiceId ?? null,
    reservation_id: reservationId ?? null,
    type,
    description,
    payment_method: paymentMethod || 'cash',
    amount: Number(amount),
    status: status || 'completed',
    source: source || 'automatic',
    reference_no: finalReferenceNo,
    reason: reason ?? null,
    created_by_employee_id: createdByEmployeeId ?? null,
    created_by_name: createdByName ?? null,
    occurred_at: occurredAt ?? new Date().toISOString(),
  });

  // The non-fatal path keeps the plain insert it always had; only the strict path asks for the id.
  if (!returnId) {
    const { error } = await insert;
    if (error) throw new TransactionInsertError(error.message);
    return null;
  }
  const { data: inserted, error } = await insert.select('id').single();
  if (error) throw new TransactionInsertError(error.message);
  return inserted?.id ?? null;
}
