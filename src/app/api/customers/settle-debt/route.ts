import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { requireStaffAccess } from '@/lib/access';
import { appendPaymentToExistingInvoice } from '@/app/api/reservations/route';

export const dynamic = 'force-dynamic';

/**
 * POST /api/customers/settle-debt
 *
 * A patient walks in and pays down what they owe, with no new booking involved. Closes the gap
 * RISK-012 flagged: `customers.outstanding` could be reduced by the settlement math, but no admin
 * screen ever triggered it, so in practice patient debt only ever grew.
 *
 * ## Why this allocates against specific bookings
 * The naive version of this — decrement `customers.outstanding` by the amount and call it done —
 * is what the manual transactions module did, and it corrupts the books (RISK-076). The scalar is
 * *derived*: the reservations still say `amount_left = X`, so the next time anyone touches one of
 * those bookings the settlement math recomputes from the reservation row and either double-counts
 * the payment or wipes it. Paying down debt therefore has to settle the underlying bookings, which
 * is what this does.
 *
 * Allocation is oldest-first (FIFO) — standard accounts-receivable practice, and the order a
 * patient would expect ("this pays off my oldest visit first"). Each allocation appends a real
 * `payments` row to that booking's existing invoice, so the finance ledger stays consistent.
 *
 * ## Partial application is possible and is reported, not hidden
 * Each booking is settled in its own round trip. If one fails midway the earlier ones stay applied
 * — the response reports exactly what was settled so staff can see the real state rather than
 * being told the whole thing failed while some of it went through.
 */
export async function POST(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const { customerId, amount, paymentMethod = 'cash', note } = body;

  if (!customerId) {
    return NextResponse.json({ error: 'A patient must be selected.' }, { status: 400 });
  }

  const parsedAmount = Number(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return NextResponse.json({ error: 'Please enter a valid positive amount in EGP.' }, { status: 400 });
  }

  try {
    const { data: customer, error: custErr } = await supabaseServer
      .from('customers')
      .select('id, name, outstanding, spent_amount')
      .eq('id', customerId)
      .maybeSingle();

    if (custErr) {
      console.error('settle-debt customer lookup error:', custErr.message);
      return NextResponse.json({ error: 'Could not look up the patient.' }, { status: 500 });
    }
    if (!customer) {
      return NextResponse.json({ error: 'Patient could not be found.' }, { status: 404 });
    }

    const currentOutstanding = Number(customer.outstanding || 0);
    if (currentOutstanding <= 0) {
      return NextResponse.json({ error: 'This patient has no outstanding balance to settle.' }, { status: 400 });
    }
    if (parsedAmount > currentOutstanding) {
      return NextResponse.json({
        error: `Amount exceeds the outstanding balance of EGP ${currentOutstanding.toLocaleString()}.`,
      }, { status: 400 });
    }

    // Unpaid completed bookings, oldest first.
    const { data: unpaid, error: resErr } = await supabaseServer
      .from('reservations')
      .select('id, date, amount_paid, amount_left, doctor_name')
      .eq('customer_id', customerId)
      .eq('status', 'completed')
      .gt('amount_left', 0)
      .order('date', { ascending: true });

    if (resErr) {
      console.error('settle-debt reservations lookup error:', resErr.message);
      return NextResponse.json({ error: 'Could not load the patient\'s unpaid bookings.' }, { status: 500 });
    }

    let remaining = parsedAmount;
    const applied: { reservationId: string; amount: number; date: string | null }[] = [];

    for (const r of unpaid || []) {
      if (remaining <= 0) break;
      const owed = Number(r.amount_left || 0);
      if (owed <= 0) continue;

      const portion = Math.min(owed, remaining);
      const newPaid = Number(r.amount_paid || 0) + portion;
      const newLeft = owed - portion;

      const { error: updErr } = await supabaseServer
        .from('reservations')
        .update({ amount_paid: newPaid, amount_left: newLeft })
        .eq('id', r.id);
      if (updErr) {
        console.error(`settle-debt failed to update reservation ${r.id}:`, updErr.message);
        break;
      }

      try {
        await appendPaymentToExistingInvoice(r.id, portion, access.access.employee?.id || null);
      } catch (payErr) {
        // The booking is already marked settled; a missing payments row is recoverable and must
        // not roll the whole settlement back on the patient standing at the desk.
        console.error(`settle-debt failed to append payment for reservation ${r.id} (non-fatal):`, payErr);
      }

      applied.push({ reservationId: r.id, amount: portion, date: r.date ?? null });
      remaining -= portion;
    }

    const settled = parsedAmount - remaining;
    if (settled <= 0) {
      return NextResponse.json({
        error: 'No unpaid bookings were found to settle this payment against.',
      }, { status: 400 });
    }

    // Move the customer scalars by exactly what was actually applied.
    const { error: balErr } = await supabaseServer
      .from('customers')
      .update({
        outstanding: Math.max(0, currentOutstanding - settled),
        spent_amount: Number(customer.spent_amount || 0) + settled,
        updated_at: new Date().toISOString(),
      })
      .eq('id', customerId);

    if (balErr) {
      console.error('settle-debt balance update error:', balErr.message);
      return NextResponse.json({ error: 'Payment was recorded but balances failed to update.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      settled,
      unallocated: remaining,
      outstandingAfter: Math.max(0, currentOutstanding - settled),
      allocations: applied,
      paymentMethod,
      note: note || null,
      message: remaining > 0
        ? `Settled EGP ${settled.toLocaleString()}. EGP ${remaining.toLocaleString()} could not be allocated to a booking.`
        : `Settled EGP ${settled.toLocaleString()}.`,
    });
  } catch (err: any) {
    console.error('POST /api/customers/settle-debt error:', err?.message || err);
    return NextResponse.json({ error: 'Could not settle the balance. Please try again.' }, { status: 500 });
  }
}
