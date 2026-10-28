import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { requireStaffAccess } from '@/lib/access';
import { appendPaymentToExistingInvoice } from '@/app/api/reservations/route';
import { recordTransaction } from '@/lib/transactionLedger';
import { formatInvoiceNo } from '@/lib/ledger';

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
      .select('id, name, outstanding, spent_amount')
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
      .select('id, date, time_slot, requested_time, service_id, service_ids, doctor_name, amount_paid, amount_left, total_price, price, status, notes')
      .eq('customer_id', customerId)
      .gt('amount_left', 0)
      .not('status', 'in', '("cancelled","rejected")')
      .order('date', { ascending: true });

    if (resErr) {
      console.error('GET settle-debt reservations error:', resErr.message);
      return NextResponse.json({ error: 'Could not load unpaid bookings.' }, { status: 500 });
    }

    // Batch resolve service names
    const allSvcIds = Array.from(new Set(
      (unpaidRes || []).flatMap((r: any) => {
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
    const resIds = (unpaidRes || []).map((r: any) => r.id);
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

    const unpaidSessions = (unpaidRes || []).map((r: any) => {
      const sIds: number[] = Array.isArray(r.service_ids) && r.service_ids.length > 0
        ? r.service_ids.map(Number)
        : (r.service_id ? [Number(r.service_id)] : []);
      const sNames = sIds.map((id) => svcMap[id] || `Service #${id}`).join(', ');
      const paid = Number(r.amount_paid || 0);
      const left = Number(r.amount_left || 0);
      const total = Number(r.total_price || r.price || (paid + left));

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

        const portion = parsedAmount;
        const newPaid = Number(targetRes.amount_paid || 0) + portion;
        const newLeft = owed - portion;

        const { error: updErr } = await supabaseServer
          .from('reservations')
          .update({ amount_paid: newPaid, amount_left: newLeft })
          .eq('id', targetRes.id);

        if (updErr) {
          console.error(`settle-debt failed to update target reservation ${targetRes.id}:`, updErr.message);
          return NextResponse.json({ error: 'Failed to update reservation balance.' }, { status: 500 });
        }

        try {
          const appended = await appendPaymentToExistingInvoice(
            targetRes.id,
            portion,
            access.access.employee?.id || null,
            paymentMethod,
            body.paymentReference || null
          );
          if (!appended) {
            await recordTransaction({
              type: 'outstanding_payment',
              amount: portion,
              description: `Balance settlement for reservation ${targetRes.id.slice(0, 8)}`,
              customerId,
              branchId: targetRes.branch_id || (access.access.employee as any)?.branch_id || null,
              reservationId: targetRes.id,
              paymentMethod: paymentMethod || 'cash',
              referenceNo: body.paymentReference || null,
              createdByEmployeeId: access.access.employee?.id || null,
              status: 'completed',
              source: 'automatic',
            });
          }
        } catch (payErr) {
          console.error(`settle-debt failed to append payment for reservation ${targetRes.id} (non-fatal):`, payErr);
        }

        const settled = portion;
        const newOutstanding = Math.max(0, currentOutstanding - settled);
        const { error: balErr } = await supabaseServer
          .from('customers')
          .update({
            outstanding: newOutstanding,
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
          unallocated: 0,
          outstandingAfter: newOutstanding,
          allocations: [{ reservationId: targetRes.id, amount: settled, date: targetRes.date ?? null }],
          targetSession: { id: targetRes.id, newPaid, newLeft },
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
        const invOwed = Math.max(0, Number(targetInv.grand_total || 0) - totalPaid);
        if (invOwed <= 0) {
          return NextResponse.json({ error: 'The selected invoice is already fully paid.' }, { status: 400 });
        }
        if (parsedAmount > invOwed) {
          return NextResponse.json({
            error: `Amount exceeds invoice balance of EGP ${invOwed.toLocaleString()}.`,
          }, { status: 400 });
        }

        let effectiveRef = body.paymentReference || null;
        if (!effectiveRef) {
          const { data: seqVal } = await supabaseServer.rpc('next_invoice_no');
          if (seqVal != null) effectiveRef = formatInvoiceNo(Number(seqVal));
        }

        const portion = parsedAmount;
        try {
          await supabaseServer.from('payments').insert({
            invoice_id: targetInv.id,
            amount: portion,
            method: paymentMethod,
            reference: effectiveRef,
            received_by_employee_id: access.access.employee?.id || null,
          });
          await recordTransaction({
            type: 'outstanding_payment',
            amount: portion,
            description: `Balance settlement for invoice ${targetInv.invoice_no || ''}`.trim(),
            customerId,
            branchId: (access.access.employee as any)?.branch_id || null,
            invoiceId: targetInv.id,
            paymentMethod: paymentMethod || 'cash',
            referenceNo: effectiveRef,
            createdByEmployeeId: access.access.employee?.id || null,
            status: 'completed',
            source: 'automatic',
          });
        } catch (payErr) {
          console.error(`settle-debt failed to append payment for invoice ${targetInv.id}:`, payErr);
        }

        const settled = portion;
        const newOutstanding = Math.max(0, currentOutstanding - settled);
        await supabaseServer
          .from('customers')
          .update({
            outstanding: newOutstanding,
            spent_amount: Number(customer.spent_amount || 0) + settled,
            updated_at: new Date().toISOString(),
          })
          .eq('id', customerId);

        return NextResponse.json({
          success: true,
          settled,
          unallocated: 0,
          outstandingAfter: newOutstanding,
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
        const appended = await appendPaymentToExistingInvoice(
          r.id,
          portion,
          access.access.employee?.id || null,
          paymentMethod,
          body.paymentReference || null
        );
        if (!appended) {
          await recordTransaction({
            type: 'outstanding_payment',
            amount: portion,
            description: `Balance settlement for reservation ${r.id.slice(0, 8)}`,
            customerId,
            branchId: r.branch_id || (access.access.employee as any)?.branch_id || null,
            reservationId: r.id,
            paymentMethod: paymentMethod || 'cash',
            referenceNo: body.paymentReference || null,
            createdByEmployeeId: access.access.employee?.id || null,
            status: 'completed',
            source: 'automatic',
          });
        }
      } catch (payErr) {
        console.error(`settle-debt failed to append payment for reservation ${r.id} (non-fatal):`, payErr);
      }

      applied.push({ reservationId: r.id, amount: portion, date: r.date ?? null });
      remaining -= portion;
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
        const invOwed = Math.max(0, Number(inv.grand_total || 0) - totalPaid);
        if (invOwed <= 0) continue;

        const portion = Math.min(invOwed, remaining);
        let effectiveRef = body.paymentReference || null;
        if (!effectiveRef) {
          const { data: seqVal } = await supabaseServer.rpc('next_invoice_no');
          if (seqVal != null) effectiveRef = formatInvoiceNo(Number(seqVal));
        }

        try {
          await supabaseServer.from('payments').insert({
            invoice_id: inv.id,
            amount: portion,
            method: paymentMethod,
            reference: effectiveRef,
            received_by_employee_id: access.access.employee?.id || null,
          });
          await recordTransaction({
            type: 'outstanding_payment',
            amount: portion,
            description: `Balance settlement for invoice ${inv.invoice_no || ''}`.trim(),
            customerId,
            branchId: (access.access.employee as any)?.branch_id || null,
            invoiceId: inv.id,
            paymentMethod: paymentMethod || 'cash',
            referenceNo: effectiveRef,
            createdByEmployeeId: access.access.employee?.id || null,
            status: 'completed',
            source: 'automatic',
          });
        } catch (payErr) {
          console.error(`settle-debt failed to append payment for invoice ${inv.id}:`, payErr);
        }

        applied.push({ reservationId: inv.id, amount: portion, date: inv.created_at ?? null });
        remaining -= portion;
      }
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
