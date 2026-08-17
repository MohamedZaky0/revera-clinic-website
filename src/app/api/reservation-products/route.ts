import { NextResponse } from 'next/server';
import { requireStaffAccess } from '@/lib/access';
import { supabaseServer } from '@/lib/supabaseServer';
import { buildInvoiceLine } from '@/lib/ledger';

/**
 * DEC-042: creates a real reservation_products row for a product/additional-service/device-pulses
 * entry added to a reservation, replacing the free-text `[Products Used During Session]: ...`
 * sentence previously appended to `notes` (RISK-038, RISK-057). Called from two UI surfaces —
 * the doctor portal's Ongoing Session screen and the reception booking-details drawer's own
 * "+ Add Product" action — distinguished by the required `addedByRole` field, since the server
 * has no other way to know which surface a staff member is acting from.
 *
 * Does not touch `reservations.amount_paid`/`amount_left` itself — the caller is responsible for
 * that (same as before), typically via a separate PATCH /api/reservations call, since only the
 * caller knows the full picture of everything currently attached to the booking (this row plus
 * whatever else was already there).
 */

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const body = await req.json();
    const { reservationId, lineType, productId, serviceId, description, qty, unitPrice, addedByRole } = body;

    if (!reservationId || !lineType || !description || !addedByRole) {
      return NextResponse.json(
        { error: 'reservationId, lineType, description and addedByRole are required.' },
        { status: 400 }
      );
    }
    if (!['product', 'additional_service', 'device_pulses'].includes(lineType)) {
      return NextResponse.json({ error: 'Invalid lineType.' }, { status: 400 });
    }
    if (!['doctor_session', 'receptionist'].includes(addedByRole)) {
      return NextResponse.json({ error: 'Invalid addedByRole.' }, { status: 400 });
    }

    const qtyNum = Number(qty) || 1;
    const unitPriceNum = Number(unitPrice) || 0;
    const total = Math.max(0, qtyNum * unitPriceNum);

    const { data: reservation, error: resError } = await supabaseServer
      .from('reservations')
      .select('id, status, provider_id')
      .eq('id', reservationId)
      .maybeSingle();
    if (resError) throw resError;
    if (!reservation) return NextResponse.json({ error: 'Reservation not found.' }, { status: 404 });

    const { data: inserted, error: insertError } = await supabaseServer
      .from('reservation_products')
      .insert({
        reservation_id: reservationId,
        line_type: lineType,
        product_id: productId || null,
        service_id: serviceId || null,
        description,
        qty: qtyNum,
        unit_price: unitPriceNum,
        total,
        added_by_employee_id: access.access.employee.id,
        added_by_role: addedByRole,
      })
      .select()
      .single();
    if (insertError) throw insertError;

    // A line added to a reservation that's already completed and invoiced (e.g. reception editing
    // a settled booking) has no future completion event to be picked up by — writeCheckoutInvoice
    // only runs once, at the status -> 'completed' transition. Fold it into the existing invoice
    // immediately instead of leaving it stranded, mirroring appendPaymentToExistingInvoice's
    // append-don't-recreate pattern for late payments.
    if (reservation.status === 'completed') {
      try {
        const { data: invoice, error: invError } = await supabaseServer
          .from('invoices')
          .select('id')
          .eq('reservation_id', reservationId)
          .eq('status', 'issued')
          .maybeSingle();
        if (invError) throw invError;

        if (invoice) {
          // cogs_snapshot/commission_snapshot deliberately left unset (NULL) here, matching
          // invoice_lines' own "not yet costed" convention (DB_SCHEMA.md) — ad-hoc lines added
          // outside the normal completion flow don't run through applyCheckoutCosting's
          // service_consumables/service_devices recipe lookup. Known gap, not silently pretended
          // away; revisit if this proves to matter in practice.
          const line = buildInvoiceLine({
            lineType: 'product',
            description,
            qty: qtyNum,
            unitPrice: unitPriceNum,
            serviceId: serviceId || undefined,
            providerId: reservation.provider_id ?? undefined,
          });
          const { error: lineError } = await supabaseServer
            .from('invoice_lines')
            .insert({ ...line, invoice_id: invoice.id });
          if (lineError) throw lineError;

          await supabaseServer
            .from('reservation_products')
            .update({ invoiced_at: new Date().toISOString() })
            .eq('id', inserted.id);
        }
      } catch (lateInvoiceError) {
        // Non-fatal: the reservation_products row itself was created successfully above. A late
        // invoice-line append failing shouldn't roll that back — log it for manual reconciliation,
        // same posture as the checkout route's own dual-write try/catch.
        console.error('Failed to append late invoice_lines row for reservation_products (non-fatal):', lateInvoiceError, '| reservation:', reservationId);
      }
    }

    return NextResponse.json({
      id: inserted.id,
      name: inserted.description,
      qty: inserted.qty,
      unitPrice: inserted.unit_price,
      total: inserted.total,
      addedBy: inserted.added_by_role === 'doctor_session' ? 'Doctor Session' : 'Receptionist',
    });
  } catch (error: any) {
    console.error('POST /api/reservation-products error:', error);
    return NextResponse.json({ error: error.message || 'Unable to add line item.' }, { status: 500 });
  }
}
