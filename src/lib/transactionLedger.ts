import { supabaseServer } from '@/lib/supabaseServer';

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
export async function recordTransaction({
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
}: {
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
}): Promise<void> {
  try {
    if (!amount || Number.isNaN(Number(amount))) return;

    const { data: seqVal, error: seqErr } = await supabaseServer.rpc('next_transaction_seq');
    if (seqErr || seqVal == null) {
      console.error('recordTransaction: next_transaction_seq failed (transaction not recorded):', seqErr);
      return;
    }

    const { error: insertErr } = await supabaseServer.from('transactions').insert({
      transaction_id: `TXN-${String(Number(seqVal)).padStart(6, '0')}`,
      branch_id: branchId ?? null,
      customer_id: customerId ?? null,
      invoice_id: invoiceId ?? null,
      reservation_id: reservationId ?? null,
      type,
      description,
      payment_method: paymentMethod,
      amount: Number(amount),
      status,
      source,
      reference_no: referenceNo ?? null,
      reason: reason ?? null,
      created_by_employee_id: createdByEmployeeId ?? null,
      created_by_name: createdByName ?? null,
      occurred_at: occurredAt ?? new Date().toISOString(),
    });

    if (insertErr) {
      console.error('recordTransaction: failed to insert transaction row (non-fatal):', insertErr.message);
    }
  } catch (err) {
    console.error('recordTransaction: unexpected failure (non-fatal):', err);
  }
}
