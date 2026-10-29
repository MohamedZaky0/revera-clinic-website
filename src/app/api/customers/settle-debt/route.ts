import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { requireStaffAccess } from '@/lib/access';
import { applySettlement, findReservationInvoice, type SettlementItem } from '@/lib/debtSettlement';
import { round2 } from '@/lib/bookingDeletion';

export const dynamic = 'force-dynamic';

/**
 * GET /api/customers/settle-debt?customerId=...
 *
 * Returns the customer's current outstanding balance and an itemized breakdown of all
 * unpaid sessions and bookings carrying an amount_left > 0.
 * If called with no customerId, returns diagnostic operational status for System Test Suite.
 */
export async function GET(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const url = new URL(req.url);
  const customerId = url.searchParams.get('customerId');

  if (!customerId) {
    return NextResponse.json({
      success: true,
      status: 'operational',
      message: 'Debt settlement endpoint operational',
    });
  }

  try {
    const { data: customer, error: custErr } = await supabaseServer
      .from('customers')
      .select('id, name, mobile, outstanding, spent_amount')
      .eq('id', customerId)
      .maybeSingle();

    if (custErr) {
      console.error('GET settle-debt customer lookup error:', custErr.message);
      return NextResponse.json({ error: 'Could not look up the patient.' }, { status: 500 });
    }
    if (!customer) {
      return NextResponse.json({ error: 'Patient could not be found.' }, { status: 404 });
    }

    // Query unpaid reservations (amount_left > 0), excluding cancelled and rejected
    const { data: unpaidRes, error: resErr } = await supabaseServer
      .from('reservations')
      .select('id, date, time_slot, requested_time, service_id, service_ids, doctor_name, amount_paid, amount_left, status, notes')
      .eq('customer_id', customerId)
      .gt('amount_left', 0)
      .not('status', 'in', '("cancelled","rejected")')
      .order('date', { ascending: true });

    if (resErr) {
      console.error('GET settle-debt reservations error:', resErr.message);
      return NextResponse.json({ error: 'Could not load unpaid bookings.' }, { status: 500 });
    }

    // Fallback by phone if customer has mobile
    let phoneRes: any[] = [];
    if (customer.mobile) {
      const existingIds = new Set((unpaidRes || []).map((r: any) => r.id));
      const { data: byPhone } = await supabaseServer
        .from('reservations')
        .select('id, date, time_slot, requested_time, service_id, service_ids, doctor_name, amount_paid, amount_left, status, notes')
        .eq('phone', customer.mobile)
        .gt('amount_left', 0)
        .not('status', 'in', '("cancelled","rejected")')
        .order('date', { ascending: true });

      phoneRes = (byPhone || []).filter((r: any) => !existingIds.has(r.id));
    }

    const allUnpaidRes = [...(unpaidRes || []), ...phoneRes];

    // Batch resolve service names
    const allSvcIds = Array.from(new Set(
      allUnpaidRes.flatMap((r: any) => {
        if (Array.isArray(r.service_ids) && r.service_ids.length > 0) return r.service_ids.map(Number);
        if (r.service_id) return [Number(r.service_id)];
        return [];
      })
    ));

    const svcMap: Record<number, string> = {};
    if (allSvcIds.length > 0) {
      const { data: svcRows } = await supabaseServer
        .from('services')
        .select('id, en, ar')
        .in('id', allSvcIds);
      if (svcRows) {
        for (const s of svcRows) {
          svcMap[s.id] = s.en || s.ar || `Service #${s.id}`;
        }
      }
    }

    // Batch resolve invoice numbers for reservations
    const resIds = allUnpaidRes.map((r: any) => r.id);
    const invMap: Record<string, string> = {};
    if (resIds.length > 0) {
      const { data: invRows } = await supabaseServer
        .from('invoices')
        .select('id, invoice_no, reservation_id')
        .in('reservation_id', resIds);
      if (invRows) {
        for (const inv of invRows) {
          if (inv.reservation_id) invMap[inv.reservation_id] = inv.invoice_no;
        }
      }
    }

    const unpaidFromRes = allUnpaidRes.map((r: any) => {
      const sIds: number[] = Array.isArray(r.service_ids) && r.service_ids.length > 0
        ? r.service_ids.map(Number)
        : (r.service_id ? [Number(r.service_id)] : []);
      const sNames = sIds.map((id) => svcMap[id] || `Service #${id}`).join(', ');
      const paid = Number(r.amount_paid || 0);
      const left = Number(r.amount_left || 0);
      const total = paid + left;

      return {
        id: r.id,
        type: 'reservation',
        date: r.date,
        time: r.time_slot || r.requested_time || null,
        serviceName: sNames || 'Consultation / Service',
        doctorName: r.doctor_name || 'Dr. Assigned',
        totalPrice: total,
        amountPaid: paid,
        amountLeft: left,
        status: r.status,
        invoiceNo: invMap[r.id] || null,
      };
    });

    // Also query unpaid issued invoices (standalone or not already in reservations)
    const existingResIds = new Set(allUnpaidRes.map((r: any) => r.id));
    const { data: issuedInvoices } = await supabaseServer
      .from('invoices')
      .select('id, invoice_no, grand_total, status, reservation_id, customer_id, created_at')
      .eq('customer_id', customerId)
      .eq('status', 'issued')
      .order('created_at', { ascending: true });

    const unpaidFromInvoices: any[] = [];
    if (issuedInvoices && issuedInvoices.length > 0) {
      const invIds = issuedInvoices.map((inv: any) => inv.id);
      const { data: payRows } = await supabaseServer
        .from('payments')
        .select('invoice_id, amount')
        .in('invoice_id', invIds);

      const payMap: Record<string, number> = {};
      for (const p of payRows || []) {
        payMap[p.invoice_id] = (payMap[p.invoice_id] || 0) + Number(p.amount || 0);
      }

      for (const inv of issuedInvoices) {
        if (inv.reservation_id && existingResIds.has(inv.reservation_id)) {
          continue;
        }
        const grandTotal = Number(inv.grand_total || 0);
        const paid = Number(payMap[inv.id] || 0);
        const left = Math.max(0, grandTotal - paid);
        if (left > 0) {
          unpaidFromInvoices.push({
            id: inv.id,
            type: 'invoice',
            date: inv.created_at ? inv.created_at.split('T')[0] : '',
            time: null,
            serviceName: inv.invoice_no ? `Invoice ${inv.invoice_no}` : 'Issued Invoice',
            doctorName: null,
            totalPrice: grandTotal,
            amountPaid: paid,
            amountLeft: left,
            status: 'issued',
            invoiceNo: inv.invoice_no || null,
          });
        }
      }
    }

    const unpaidSessions = [...unpaidFromRes, ...unpaidFromInvoices];

    return NextResponse.json({
      customer: {
        id: customer.id,
        name: customer.name,
        outstanding: Number(customer.outstanding || 0),
        spentAmount: Number(customer.spent_amount || 0),
      },
      unpaidSessions,
    });
  } catch (err: any) {
    console.error('GET /api/customers/settle-debt error:', err?.message || err);
    return NextResponse.json({ error: 'Could not fetch unpaid sessions.' }, { status: 500 });
  }
}

/**
 * POST /api/customers/settle-debt
 *
 * Collects a walk-in debt payment and allocates it against:
 * 1. A specific session/booking if `reservationId` is provided.
 * 2. Oldest-first (FIFO) unpaid bookings if `reservationId` is omitted.
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

  const { customerId, amount, paymentMethod = 'cash', note, reservationId } = body;

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

    const employeeId = access.access.employee?.id || null;
    const employeeBranchId = (access.access.employee as any)?.branch_id || null;
    const paymentReference = body.paymentReference || null;

    // Reads first, writes last: the plan below is built from reads only. Nothing is written until
    // applySettlement runs, and it writes the money record before the booking balance and the
    // patient's figures, and undoes everything if any step fails (DEC-138).
    const run = async (items: SettlementItem[]) =>
      applySettlement({
        customer: { id: customer.id, outstanding: customer.outstanding, spent_amount: customer.spent_amount },
        items,
        paymentMethod,
        paymentReference,
        employeeId,
        employeeBranchId,
      });

    // ── Targeted Settlement: Specific session requested ──
    if (reservationId && reservationId !== 'all') {
      const { data: targetRes, error: targetErr } = await supabaseServer
        .from('reservations')
        .select('id, date, amount_paid, amount_left, doctor_name, branch_id')
        .eq('id', reservationId)
        .eq('customer_id', customerId)
        .maybeSingle();

      if (targetErr) {
        console.error('settle-debt target reservation lookup error:', targetErr.message);
        return NextResponse.json({ error: 'Failed to look up selected booking.' }, { status: 500 });
      }

      if (targetRes) {
        const owed = Number(targetRes.amount_left || 0);
        if (owed <= 0) {
          return NextResponse.json({ error: 'The selected session is already fully paid.' }, { status: 400 });
        }
        if (parsedAmount > owed) {
          return NextResponse.json({
            error: `Amount exceeds the session outstanding balance of EGP ${owed.toLocaleString()}.`,
          }, { status: 400 });
        }

        const { invoice, error: invLookupErr } = await findReservationInvoice(targetRes.id);
        if (invLookupErr) {
          console.error('settle-debt invoice lookup error:', invLookupErr);
          return NextResponse.json({ error: 'Could not look up the booking\'s invoice. Nothing was changed.' }, { status: 500 });
        }

        const outcome = await run([{
          kind: 'reservation',
          id: targetRes.id,
          portion: parsedAmount,
          date: targetRes.date ?? null,
          paidBefore: Number(targetRes.amount_paid || 0),
          leftBefore: owed,
          branchId: targetRes.branch_id || null,
          invoice,
        }]);
        if (!outcome.ok) return NextResponse.json(outcome.body, { status: outcome.status });

        const settled = outcome.settled;
        const applied = outcome.applied[0];
        return NextResponse.json({
          success: true,
          settled,
          unallocated: 0,
          outstandingAfter: outcome.outstandingAfter,
          allocations: [{ reservationId: targetRes.id, amount: settled, date: targetRes.date ?? null }],
          targetSession: { id: targetRes.id, newPaid: applied.newPaid, newLeft: applied.newLeft },
          paymentMethod,
          note: note || null,
          message: `Settled EGP ${settled.toLocaleString()} for session on ${targetRes.date || ''}.`,
        });
      }

      // Check if target is an issued standalone invoice
      const { data: targetInv } = await supabaseServer
        .from('invoices')
        .select('id, invoice_no, grand_total, created_at')
        .eq('id', reservationId)
        .eq('customer_id', customerId)
        .maybeSingle();

      if (targetInv) {
        const { data: payRows } = await supabaseServer
          .from('payments')
          .select('amount')
          .eq('invoice_id', targetInv.id);
        const totalPaid = (payRows || []).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
        const invOwed = Math.max(0, round2(Number(targetInv.grand_total || 0) - totalPaid));
        if (invOwed <= 0) {
          return NextResponse.json({ error: 'The selected invoice is already fully paid.' }, { status: 400 });
        }
        if (parsedAmount > invOwed) {
          return NextResponse.json({
            error: `Amount exceeds invoice balance of EGP ${invOwed.toLocaleString()}.`,
          }, { status: 400 });
        }

        const outcome = await run([{
          kind: 'invoice',
          id: targetInv.id,
          portion: parsedAmount,
          date: targetInv.created_at ?? null,
          invoiceNo: targetInv.invoice_no ?? null,
        }]);
        if (!outcome.ok) return NextResponse.json(outcome.body, { status: outcome.status });

        const settled = outcome.settled;
        return NextResponse.json({
          success: true,
          settled,
          unallocated: 0,
          outstandingAfter: outcome.outstandingAfter,
          allocations: [{ reservationId: targetInv.id, amount: settled, date: targetInv.created_at ?? null }],
          paymentMethod,
          note: note || null,
          message: `Settled EGP ${settled.toLocaleString()} for invoice ${targetInv.invoice_no || ''}.`,
        });
      }

      return NextResponse.json({ error: 'Selected booking or invoice could not be found for this patient.' }, { status: 404 });
    }

    // ── FIFO Settlement: Allocate across unpaid bookings oldest first ──
    const { data: unpaid, error: resErr } = await supabaseServer
      .from('reservations')
      .select('id, date, amount_paid, amount_left, doctor_name, branch_id')
      .eq('customer_id', customerId)
      .gt('amount_left', 0)
      .not('status', 'in', '("cancelled","rejected")')
      .order('date', { ascending: true });

    if (resErr) {
      console.error('settle-debt reservations lookup error:', resErr.message);
      return NextResponse.json({ error: 'Could not load the patient\'s unpaid bookings.' }, { status: 500 });
    }

    let remaining = parsedAmount;
    const plan: SettlementItem[] = [];
    // Money this plan will put on each invoice, so the invoice pass below does not count a booking's
    // own invoice a second time.
    const plannedOnInvoice = new Map<string, number>();

    for (const r of unpaid || []) {
      if (remaining <= 0) break;
      const owed = Number(r.amount_left || 0);
      if (owed <= 0) continue;

      const portion = round2(Math.min(owed, remaining));
      const { invoice, error: invLookupErr } = await findReservationInvoice(r.id);
      if (invLookupErr) {
        console.error('settle-debt invoice lookup error:', invLookupErr);
        return NextResponse.json({ error: 'Could not look up a booking\'s invoice. Nothing was changed.' }, { status: 500 });
      }
      if (invoice) plannedOnInvoice.set(invoice.id, round2((plannedOnInvoice.get(invoice.id) || 0) + portion));
      plan.push({
        kind: 'reservation',
        id: r.id,
        portion,
        date: r.date ?? null,
        paidBefore: Number(r.amount_paid || 0),
        leftBefore: owed,
        branchId: r.branch_id || null,
        invoice,
      });
      remaining = round2(remaining - portion);
    }

    if (remaining > 0) {
      // Check for package invoices or other issued invoices with unpaid balance
      const { data: issuedInvoices } = await supabaseServer
        .from('invoices')
        .select('id, invoice_no, grand_total, created_at')
        .eq('customer_id', customerId)
        .eq('status', 'issued')
        .order('created_at', { ascending: true });

      for (const inv of issuedInvoices || []) {
        if (remaining <= 0) break;
        const { data: payRows } = await supabaseServer
          .from('payments')
          .select('amount')
          .eq('invoice_id', inv.id);
        const totalPaid = (payRows || []).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
        const invOwed = Math.max(0, round2(Number(inv.grand_total || 0) - totalPaid - (plannedOnInvoice.get(inv.id) || 0)));
        if (invOwed <= 0) continue;

        const portion = round2(Math.min(invOwed, remaining));
        plan.push({
          kind: 'invoice',
          id: inv.id,
          portion,
          date: inv.created_at ?? null,
          invoiceNo: inv.invoice_no ?? null,
        });
        remaining = round2(remaining - portion);
      }
    }

    if (plan.length === 0) {
      return NextResponse.json({
        error: 'No unpaid bookings were found to settle this payment against.',
      }, { status: 400 });
    }

    // Every allocation is applied, or none is (and the response says so).
    const outcome = await run(plan);
    if (!outcome.ok) return NextResponse.json(outcome.body, { status: outcome.status });

    const settled = outcome.settled;
    return NextResponse.json({
      success: true,
      settled,
      unallocated: remaining,
      outstandingAfter: outcome.outstandingAfter,
      allocations: outcome.applied.map((a) => ({ reservationId: a.reservationId, amount: a.amount, date: a.date })),
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
