import { supabaseServer } from '@/lib/supabaseServer';

/**
 * Write a wallet_txns ledger row and update customers.wallet_balance together.
 *
 * Ordering: the ledger row is inserted first. If it fails the scalar is not
 * updated and the error surfaces. A ledger row with no scalar update is
 * recoverable; a scalar change with no ledger row is the exact drift this
 * helper exists to eliminate.
 *
 * @param customerId  UUID of the customer
 * @param direction   'in' (credit) or 'out' (debit)
 * @param amount      positive number — the CHECK constraint rejects <= 0
 * @param reason      short description, NOT NULL in the schema
 * @param newBalance  the absolute wallet_balance to write on the customer row
 * @param invoiceId   optional invoice UUID to link the txn to
 */
export async function recordWalletMovement({
  customerId,
  direction,
  amount,
  reason,
  newBalance,
  invoiceId,
}: {
  customerId: string;
  direction: 'in' | 'out';
  amount: number;
  reason: string;
  newBalance: number;
  invoiceId?: string | null;
}): Promise<void> {
  // amount must be > 0 per the DB CHECK constraint; caller must not call with 0
  if (amount <= 0) {
    throw new Error(`wallet_txns amount must be > 0, got ${amount}`);
  }

  const { error: txnError } = await supabaseServer
    .from('wallet_txns')
    .insert({
      customer_id: customerId,
      direction,
      amount,
      reason,
      invoice_id: invoiceId ?? null,
    });

  if (txnError) {
    throw new Error(`Failed to insert wallet_txns row: ${txnError.message}`);
  }

  const { error: updateError } = await supabaseServer
    .from('customers')
    .update({ wallet_balance: newBalance, updated_at: new Date().toISOString() })
    .eq('id', customerId);

  if (updateError) {
    throw new Error(`Failed to update customer wallet_balance: ${updateError.message}`);
  }
}

/**
 * Handle the "staff sets an absolute balance" case (Site 4).
 *
 * Reads the current balance, computes the delta, and writes a single ledger
 * row. If delta is 0 no row is written (amount CHECK > 0 would reject it).
 * Still updates the scalar so any other fields in the same update are applied.
 */
export async function setAbsoluteWalletBalance({
  customerId,
  newBalance,
}: {
  customerId: string;
  newBalance: number;
}): Promise<void> {
  const { data: customer, error: readErr } = await supabaseServer
    .from('customers')
    .select('wallet_balance')
    .eq('id', customerId)
    .maybeSingle();

  if (readErr) {
    throw new Error(`Failed to read customer wallet_balance: ${readErr.message}`);
  }

  const currentBalance = Number(customer?.wallet_balance || 0);
  const delta = newBalance - currentBalance;

  if (delta !== 0) {
    await recordWalletMovement({
      customerId,
      direction: delta > 0 ? 'in' : 'out',
      amount: Math.abs(delta),
      reason: 'manual adjustment by staff',
      newBalance,
    });
  } else {
    // No wallet movement, but still update the scalar in case it is part of a
    // broader customer update (the caller writes other fields too).
    const { error: updateError } = await supabaseServer
      .from('customers')
      .update({ wallet_balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', customerId);
    if (updateError) {
      throw new Error(`Failed to update customer wallet_balance: ${updateError.message}`);
    }
  }
}
