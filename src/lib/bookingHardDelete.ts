import { supabaseServer } from '@/lib/supabaseServer';
import { bookingMoneyShare, removeBookingFromFigures, round2, type PatientFigures } from '@/lib/bookingDeletion';

/**
 * Permanent delete of ONE booking, with everything that belongs to it (DEC-133 / RISK-139).
 *
 * The old route ran a bare `delete from reservations`. Postgres then left the patient's payment rows
 * in `transactions` with reservation_id NULL, the booking's ledger invoice (and its payments) as an
 * orphan, and never took the booking out of customers.spent_amount / outstanding /
 * number_of_bookings. Total Spend, Outstanding and the bookings count therefore kept showing a
 * booking that no longer existed.
 *
 * Supabase offers no multi-statement transaction from the API, so this is an ordered sequence with
 * an undo for every step that can be undone:
 *
 *   1. read everything (nothing is written if any read fails)
 *   2. patient figures: guarded write (only if they still hold the values just read)   -- undoable
 *   3. package sessions this booking consumed: give them back                          -- undoable
 *   4. the booking's payment rows (transactions)                                       -- undoable (re-insert)
 *   5. the booking                                                                     -- the commit point
 *   6. the booking's ledger invoice(s); their payments and lines go with them
 *
 * A failure in 2-5 undoes the earlier steps and reports that nothing was deleted. After step 5 the
 * booking is gone for good, so a failure in step 6 is only reported (the invoice ids are named) and
 * the delete still counts as done.
 *
 * Deliberately NOT removed: wallet-type transactions (the wallet balance is not reversed, so the
 * ledger row must keep describing it), product sales, medical records, prescriptions and laser
 * pulse logs (all just lose their link to the booking, as before), and pulse-package usage.
 */

export interface HardDeleteActor {
  id?: string | null;
  email?: string | null;
}

export type HardDeleteOutcome =
  | { ok: true; status: 200; body: Record<string, any> }
  | { ok: false; status: number; body: Record<string, any> };

const WALLET_TYPES = new Set(['wallet_topup', 'wallet_deduction']);

export type Undo = { label: string; run: () => Promise<string | null> };

function fail(status: number, error: string, extra: Record<string, any> = {}): HardDeleteOutcome {
  return { ok: false, status, body: { error, ...extra } };
}

export async function runUndo(undos: Undo[]): Promise<string[]> {
  const failures: string[] = [];
  for (const u of [...undos].reverse()) {
    try {
      const err = await u.run();
      if (err) failures.push(`${u.label}: ${err}`);
    } catch (e: any) {
      failures.push(`${u.label}: ${e?.message || String(e)}`);
    }
  }
  return failures;
}

export function eqOrNull(query: any, column: string, raw: unknown) {
  return raw === null || raw === undefined ? query.is(column, null) : query.eq(column, raw);
}

export async function hardDeleteBooking(reservationId: string, actor: HardDeleteActor = {}): Promise<HardDeleteOutcome> {
  // ── 1. Read ────────────────────────────────────────────────────────────────
  const { data: booking, error: bookingErr } = await supabaseServer
    .from('reservations')
    .select('id, customer_id, status, amount_paid, amount_left, date')
    .eq('id', reservationId)
    .maybeSingle();
  if (bookingErr) {
    console.error('hardDeleteBooking: booking read failed:', bookingErr.message);
    return fail(500, 'Database error. Nothing was deleted.');
  }
  if (!booking) return fail(404, 'Not found');

  let customer: any = null;
  if (booking.customer_id) {
    const { data, error } = await supabaseServer
      .from('customers')
      .select('id, spent_amount, outstanding, number_of_bookings')
      .eq('id', booking.customer_id)
      .maybeSingle();
    if (error) {
      console.error('hardDeleteBooking: patient read failed:', error.message);
      return fail(500, 'Database error. Nothing was deleted.');
    }
    customer = data;
  }

  const { data: invoiceRows, error: invErr } = await supabaseServer
    .from('invoices')
    .select('id, invoice_no')
    .eq('reservation_id', reservationId);
  if (invErr) {
    console.error('hardDeleteBooking: invoice read failed:', invErr.message);
    return fail(500, 'Database error. Nothing was deleted.');
  }
  const invoices: Array<{ id: string; invoice_no: string | null }> = invoiceRows || [];
  const invoiceIds = invoices.map((i) => i.id);

  let paymentCount = 0;
  if (invoiceIds.length > 0) {
    const { data, error } = await supabaseServer.from('payments').select('id').in('invoice_id', invoiceIds);
    if (error) {
      console.error('hardDeleteBooking: payments read failed:', error.message);
      return fail(500, 'Database error. Nothing was deleted.');
    }
    paymentCount = (data || []).length;
  }

  const { data: byReservation, error: txErr1 } = await supabaseServer
    .from('transactions')
    .select('*')
    .eq('reservation_id', reservationId);
  if (txErr1) {
    console.error('hardDeleteBooking: transactions read failed:', txErr1.message);
    return fail(500, 'Database error. Nothing was deleted.');
  }
  let byInvoice: any[] = [];
  if (invoiceIds.length > 0) {
    const { data, error } = await supabaseServer.from('transactions').select('*').in('invoice_id', invoiceIds);
    if (error) {
      console.error('hardDeleteBooking: transactions read failed:', error.message);
      return fail(500, 'Database error. Nothing was deleted.');
    }
    byInvoice = data || [];
  }
  const seen = new Set<string>();
  const linkedTxns: any[] = [];
  for (const t of [...(byReservation || []), ...byInvoice]) {
    if (seen.has(String(t.id))) continue;
    seen.add(String(t.id));
    linkedTxns.push(t);
  }
  const txnsToDelete = linkedTxns.filter((t) => !WALLET_TYPES.has(String(t.type)));
  const walletTxnsKept = linkedTxns.length - txnsToDelete.length;

  const { data: recognitionRows, error: recErr } = await supabaseServer
    .from('package_revenue_recognitions')
    .select('id, customer_package_id, customer_package_item_id, reason')
    .eq('reservation_id', reservationId);
  if (recErr) {
    console.error('hardDeleteBooking: package recognitions read failed:', recErr.message);
    return fail(500, 'Database error. Nothing was deleted.');
  }
  const sessionsByItem = new Map<string, number>();
  for (const r of recognitionRows || []) {
    if (r.reason !== 'session' || !r.customer_package_item_id) continue;
    const key = String(r.customer_package_item_id);
    sessionsByItem.set(key, (sessionsByItem.get(key) || 0) + 1);
  }

  const undos: Undo[] = [];
  const abort = async (status: number, message: string, detail: string): Promise<HardDeleteOutcome> => {
    console.error(`hardDeleteBooking: ${detail} (reservation ${reservationId})`);
    const undoFailures = await runUndo(undos);
    if (undoFailures.length > 0) {
      console.error('hardDeleteBooking: UNDO FAILED, data is partly changed:', undoFailures);
      return fail(
        status,
        `${message} The booking was not deleted, but some earlier steps could not be undone; tell the developer before retrying.`,
        { partial: true, undoFailures }
      );
    }
    return fail(status, `${message} The booking was not deleted and nothing was changed.`);
  };

  // ── 2. Patient figures (guarded) ───────────────────────────────────────────
  let figuresBefore: PatientFigures | null = null;
  let figuresAfter: PatientFigures | null = null;
  let clamped = false;
  if (customer) {
    figuresBefore = {
      spent: Number(customer.spent_amount || 0),
      outstanding: Number(customer.outstanding || 0),
      bookings: Number(customer.number_of_bookings || 0),
    };
    const reversed = removeBookingFromFigures(figuresBefore, bookingMoneyShare(booking));
    figuresAfter = reversed.next;
    clamped = reversed.clamped;

    if (
      figuresAfter.spent !== figuresBefore.spent ||
      figuresAfter.outstanding !== figuresBefore.outstanding ||
      figuresAfter.bookings !== figuresBefore.bookings
    ) {
      let q: any = supabaseServer
        .from('customers')
        .update({
          spent_amount: figuresAfter.spent,
          outstanding: figuresAfter.outstanding,
          number_of_bookings: figuresAfter.bookings,
          updated_at: new Date().toISOString(),
        })
        .eq('id', customer.id);
      q = eqOrNull(q, 'spent_amount', customer.spent_amount);
      q = eqOrNull(q, 'outstanding', customer.outstanding);
      q = eqOrNull(q, 'number_of_bookings', customer.number_of_bookings);
      const { data: updated, error } = await q.select('id');
      if (error) {
        console.error('hardDeleteBooking: patient figures update failed:', error.message);
        return fail(500, "The patient's figures could not be updated. The booking was not deleted and nothing was changed.");
      }
      if (!updated || updated.length === 0) {
        return fail(
          409,
          "The patient's figures changed while this was running. The booking was not deleted and nothing was changed; open it again and retry.",
          { code: 'PATIENT_FIGURES_CHANGED' }
        );
      }
      const original = { ...customer };
      undos.push({
        label: "restore the patient's figures",
        run: async () => {
          const { error: e } = await supabaseServer
            .from('customers')
            .update({
              spent_amount: original.spent_amount,
              outstanding: original.outstanding,
              number_of_bookings: original.number_of_bookings,
            })
            .eq('id', original.id);
          return e ? e.message : null;
        },
      });
    }
  }

  // ── 3. Package sessions this booking consumed ──────────────────────────────
  let sessionsRestored = 0;
  const touchedPackages = new Set<string>();
  for (const [itemId, count] of sessionsByItem) {
    const { data: item, error } = await supabaseServer
      .from('customer_package_items')
      .select('id, customer_package_id, qty_used, qty_remaining')
      .eq('id', itemId)
      .maybeSingle();
    if (error) return abort(500, 'A package session could not be given back.', `package item read failed: ${error.message}`);
    if (!item || Number(item.qty_used) < count) continue; // nothing safe to give back for this item

    const { data: changed, error: upErr } = await supabaseServer
      .from('customer_package_items')
      .update({ qty_used: Number(item.qty_used) - count, qty_remaining: Number(item.qty_remaining) + count })
      .eq('id', itemId)
      .eq('qty_used', item.qty_used)
      .eq('qty_remaining', item.qty_remaining)
      .select('id');
    if (upErr) return abort(500, 'A package session could not be given back.', `package item update failed: ${upErr.message}`);
    if (!changed || changed.length === 0) {
      return abort(409, 'A package changed while this was running.', 'package item changed concurrently');
    }
    sessionsRestored += count;
    touchedPackages.add(String(item.customer_package_id));
    const original = { ...item };
    undos.push({
      label: 'take the package session back',
      run: async () => {
        const { error: e } = await supabaseServer
          .from('customer_package_items')
          .update({ qty_used: original.qty_used, qty_remaining: original.qty_remaining })
          .eq('id', original.id);
        return e ? e.message : null;
      },
    });
  }
  for (const packageId of touchedPackages) {
    const { data: pkg } = await supabaseServer
      .from('customer_packages')
      .select('id, status, expires_at')
      .eq('id', packageId)
      .maybeSingle();
    if (!pkg || pkg.status !== 'fully_used') continue;
    if (pkg.expires_at && new Date(pkg.expires_at).getTime() < Date.now()) continue;
    const { error } = await supabaseServer
      .from('customer_packages')
      .update({ status: 'active' })
      .eq('id', packageId)
      .eq('status', 'fully_used');
    if (error) return abort(500, 'A package could not be reopened.', `package status update failed: ${error.message}`);
    undos.push({
      label: 'close the package again',
      run: async () => {
        const { error: e } = await supabaseServer.from('customer_packages').update({ status: 'fully_used' }).eq('id', packageId);
        return e ? e.message : null;
      },
    });
  }

  // ── 4. The booking's payment rows ──────────────────────────────────────────
  if (txnsToDelete.length > 0) {
    const ids = txnsToDelete.map((t) => t.id);
    const { error } = await supabaseServer.from('transactions').delete().in('id', ids).select('id');
    if (error) return abort(500, 'The booking\'s payments could not be deleted.', `transactions delete failed: ${error.message}`);
    const captured = txnsToDelete.map((t) => ({ ...t }));
    undos.push({
      label: "put the booking's payments back",
      run: async () => {
        const { error: e } = await supabaseServer.from('transactions').insert(captured);
        return e ? e.message : null;
      },
    });
  }

  // ── 5. The booking (commit point) ──────────────────────────────────────────
  const { data: deleted, error: delErr } = await supabaseServer
    .from('reservations')
    .delete()
    .eq('id', reservationId)
    .select('id');
  if (delErr) return abort(500, 'The booking could not be deleted.', `reservation delete failed: ${delErr.message}`);
  if (!deleted || deleted.length === 0) return abort(404, 'The booking no longer exists.', 'reservation delete removed no row');

  // ── 6. The booking's ledger invoice(s) ─────────────────────────────────────
  const warnings: string[] = [];
  const removedInvoices: Array<{ id: string; invoiceNo: string | null }> = [];
  if (invoiceIds.length > 0) {
    let lastError = '';
    let removed = false;
    for (let attempt = 0; attempt < 2 && !removed; attempt++) {
      const { error } = await supabaseServer.from('invoices').delete().in('id', invoiceIds).select('id');
      if (error) lastError = error.message;
      else removed = true;
    }
    if (removed) {
      for (const i of invoices) removedInvoices.push({ id: i.id, invoiceNo: i.invoice_no ?? null });
    } else {
      const names = invoices.map((i) => i.invoice_no || i.id).join(', ');
      warnings.push(
        `The booking was deleted, but its invoice ${names} could not be removed and now has no booking (${lastError}). Remove it from the finance records.`
      );
      console.error('hardDeleteBooking: invoice cleanup failed:', lastError, invoiceIds);
    }
  }
  if (clamped) warnings.push("One of the patient's figures was lower than this booking's share and was set to 0.");

  const removedTxns = txnsToDelete.map((t) => ({
    id: t.id,
    transactionId: t.transaction_id ?? null,
    type: t.type ?? null,
    amount: Number(t.amount || 0),
  }));
  const transactionsTotal = round2(removedTxns.reduce((s, t) => s + t.amount, 0));

  console.info(
    `[audit] booking hard delete reservation=${reservationId} by=${actor.email || actor.id || 'unknown'} ` +
      `patient=${booking.customer_id ?? 'none'} status=${booking.status} ` +
      `transactions=${removedTxns.length} total=${transactionsTotal} ` +
      `[${removedTxns.map((t) => `${t.transactionId || t.id}:${t.amount}`).join(', ')}] ` +
      `invoices=${removedInvoices.map((i) => i.invoiceNo || i.id).join('|') || 0} payments=${removedInvoices.length ? paymentCount : 0} ` +
      `walletTxnsKept=${walletTxnsKept} packageSessionsRestored=${sessionsRestored} ` +
      (figuresBefore && figuresAfter
        ? `spent ${figuresBefore.spent}->${figuresAfter.spent} outstanding ${figuresBefore.outstanding}->${figuresAfter.outstanding} bookings ${figuresBefore.bookings}->${figuresAfter.bookings}`
        : 'no patient linked')
  );

  return {
    ok: true,
    status: 200,
    body: {
      success: true,
      message: 'Reservation permanently deleted',
      removed: {
        transactions: removedTxns,
        transactionsTotal,
        walletTransactionsKept: walletTxnsKept,
        invoices: removedInvoices,
        payments: removedInvoices.length ? paymentCount : 0,
        packageSessionsRestored: sessionsRestored,
      },
      customer: figuresBefore && figuresAfter ? { id: booking.customer_id, before: figuresBefore, after: figuresAfter } : null,
      ...(warnings.length ? { warnings } : {}),
    },
  };
}
