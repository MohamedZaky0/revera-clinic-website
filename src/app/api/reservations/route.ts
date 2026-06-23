import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

/**
 * pg returns DATE columns as JavaScript Date objects set to UTC midnight.
 * toISOString().slice(0,10) on a UTC-midnight Date is always correct (no tz shift).
 * String() on a Date gives "Mon Jun 22 ..." which breaks everything — never use that.
 */
function fmtDate(d: unknown): string {
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10); // already a YYYY-MM-DD string
}

function mapRow(r: Record<string, any>) {
  return {
    id: r.id,
    serviceId: r.service_id,
    date: fmtDate(r.date),
    requestedTime: r.requested_time,
    name: r.name,
    email: r.email,
    phone: r.phone,
    notes: r.notes,
    status: r.status,
    timeSlot: r.time_slot,
    sessionType: r.session_type,
    doctorName: r.doctor_name,
    createdAt: r.created_at,
    branchId: r.branch_id ?? null,
    customerId: r.customer_id ?? null,
  };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const params = url.searchParams;
  const status = params.get('status');
  const serviceId = params.get('serviceId');
  const date = params.get('date');
  const branchId = params.get('branchId');

  try {
    let q = supabaseServer
      .from('reservations')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) q = q.eq('status', status);
    if (serviceId) q = q.eq('service_id', Number(serviceId));
    if (date) q = q.eq('date', date);
    if (branchId) q = q.eq('branch_id', branchId);

    const { data: rows, error } = await q;

    if (error) throw error;
    return NextResponse.json(rows ? rows.map(mapRow) : []);
  } catch (err) {
    console.error('GET /api/reservations error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { serviceId, date, requestedTime, name, email, phone, notes, sessionType, branchId } = body;

    if (!serviceId || !date || !name || !email || !phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Lookup or create customer profile
    let customerId: string | null = null;
    try {
      const { data: customer, error: customerError } = await supabaseServer
        .from('customers')
        .select('id, number_of_bookings')
        .eq('mobile', phone)
        .maybeSingle();

      if (customerError) {
        console.error('Customer lookup error:', customerError);
      }

      if (customer) {
        customerId = customer.id;
        const newBookings = (customer.number_of_bookings || 0) + 1;
        await supabaseServer
          .from('customers')
          .update({ number_of_bookings: newBookings })
          .eq('id', customerId);
      } else {
        const { data: newCustomer, error: createError } = await supabaseServer
          .from('customers')
          .insert({
            name,
            mobile: phone,
            email: email || null,
            registration_date: new Date().toISOString(),
            active: true,
            spent_amount: 0,
            outstanding: 0,
            number_of_bookings: 1,
          })
          .select('id')
          .single();

        if (createError) {
          console.error('Customer creation error:', createError);
        } else if (newCustomer) {
          customerId = newCustomer.id;
        }
      }
    } catch (custErr) {
      console.error('Customer integration error:', custErr);
    }

    // 2. Insert reservation linked to customer
    const { data, error } = await supabaseServer
      .from('reservations')
      .insert({
        service_id: Number(serviceId),
        date,
        requested_time: requestedTime || null,
        name,
        email,
        phone,
        notes: notes || '',
        status: 'pending',
        time_slot: null,
        session_type: sessionType || 'in_person',
        branch_id: branchId || null,
        customer_id: customerId,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(mapRow(data), { status: 201 });
  } catch (err) {
    console.error('POST /api/reservations error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  try {
    const body = await req.json();
    const { action, timeSlot, status, doctorName, notes, sessionType } = body;

    const { data: target, error: findError } = await supabaseServer
      .from('reservations')
      .select('*')
      .eq('id', id)
      .single();

    if (findError || !target) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (action === 'approve') {
      if (!timeSlot) return NextResponse.json({ error: 'Missing timeSlot' }, { status: 400 });

      let bookedQuery = supabaseServer
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .eq('service_id', target.service_id)
        .eq('date', target.date)
        .eq('status', 'approved');

      if (target.branch_id) {
        bookedQuery = bookedQuery.eq('branch_id', target.branch_id);
      } else {
        bookedQuery = bookedQuery.is('branch_id', null);
      }

      const { count: bookedCount, error: countError1 } = await bookedQuery;

      if (countError1) throw countError1;
      if (Number(bookedCount || 0) >= 8) {
        return NextResponse.json({ error: 'Day is fully booked' }, { status: 400 });
      }

      let slotQuery = supabaseServer
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .eq('service_id', target.service_id)
        .eq('date', target.date)
        .eq('status', 'approved')
        .eq('time_slot', timeSlot);

      if (target.branch_id) {
        slotQuery = slotQuery.eq('branch_id', target.branch_id);
      } else {
        slotQuery = slotQuery.is('branch_id', null);
      }

      const { count: slotCount, error: countError2 } = await slotQuery;

      if (countError2) throw countError2;
      if (Number(slotCount || 0) > 0) {
        return NextResponse.json({ error: 'Time slot already taken' }, { status: 400 });
      }

      const { data: updated, error: updateError } = await supabaseServer
        .from('reservations')
        .update({
          status: 'approved',
          time_slot: timeSlot,
          doctor_name: doctorName || null
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;
      return NextResponse.json(mapRow(updated));

    } else if (action === 'reject') {
      const { data: updated, error: updateError } = await supabaseServer
        .from('reservations')
        .update({ status: 'rejected' })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;
      return NextResponse.json(mapRow(updated));

    } else if (status || notes !== undefined || doctorName !== undefined || sessionType !== undefined) {
      const updates: Record<string, any> = {};
      if (status) updates.status = status;
      if (notes !== undefined) updates.notes = notes;
      if (doctorName !== undefined) updates.doctor_name = doctorName;
      if (sessionType !== undefined) updates.session_type = sessionType;

      const { data: updated, error: updateError } = await supabaseServer
        .from('reservations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;
      return NextResponse.json(mapRow(updated));
    } else {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (err) {
    console.error('PATCH /api/reservations error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  try {
    if (id === 'all') {
      const { error } = await supabaseServer
        .from('reservations')
        .delete()
        .neq('status', 'nonexistent_status_to_delete_all_rows');
      
      if (error) throw error;
      return NextResponse.json({ success: true, message: 'All reservations cleared' });
    }

    const { data: deleted, error: deleteError } = await supabaseServer
      .from('reservations')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (deleteError || !deleted) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Reservation deleted' });
  } catch (err) {
    console.error('DELETE /api/reservations error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
