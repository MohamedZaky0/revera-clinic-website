import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

/**
 * Parses dynamic or standard ISO date formats to a raw YYYY-MM-DD string.
 */
function fmtDate(d: unknown): string {
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10); // already a YYYY-MM-DD string
}

function mapRow(r: any) {
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
  };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const params = url.searchParams;
  const status = params.get('status');
  const serviceId = params.get('serviceId');
  const date = params.get('date');

  try {
    let query = getSupabaseServer()
      .from('reservations')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }
    if (serviceId) {
      query = query.eq('service_id', Number(serviceId));
    }
    if (date) {
      query = query.eq('date', date);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json((data || []).map(mapRow));
  } catch (err) {
    console.error('GET /api/reservations error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  const { serviceId, date, requestedTime, name, email, phone, notes, sessionType } = body;

  if (!serviceId || !date || !name || !email || !phone) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const { data, error } = await getSupabaseServer()
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
        session_type: sessionType || 'in_person'
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

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

  const body = await req.json();
  const { action, timeSlot, status, doctorName, notes, sessionType } = body;

  try {
    const { data: target, error: getErr } = await getSupabaseServer()
      .from('reservations')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (getErr) throw getErr;
    if (!target) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (action === 'approve') {
      if (!timeSlot) return NextResponse.json({ error: 'Missing timeSlot' }, { status: 400 });

      const { count: approvedCount, error: countErr } = await getSupabaseServer()
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .eq('service_id', target.service_id)
        .eq('date', target.date)
        .eq('status', 'approved');

      if (countErr) throw countErr;
      if ((approvedCount || 0) >= 8) {
        return NextResponse.json({ error: 'Day is fully booked' }, { status: 400 });
      }

      const { count: slotCount, error: slotErr } = await getSupabaseServer()
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .eq('service_id', target.service_id)
        .eq('date', target.date)
        .eq('status', 'approved')
        .eq('time_slot', timeSlot);

      if (slotErr) throw slotErr;
      if ((slotCount || 0) > 0) {
        return NextResponse.json({ error: 'Time slot already taken' }, { status: 400 });
      }

      const { data: updated, error: updateErr } = await getSupabaseServer()
        .from('reservations')
        .update({
          status: 'approved',
          time_slot: timeSlot,
          doctor_name: doctorName || null
        })
        .eq('id', id)
        .select()
        .single();

      if (updateErr) throw updateErr;
      return NextResponse.json(mapRow(updated));

    } else if (action === 'reject') {
      const { data: updated, error: updateErr } = await getSupabaseServer()
        .from('reservations')
        .update({ status: 'rejected' })
        .eq('id', id)
        .select()
        .single();

      if (updateErr) throw updateErr;
      return NextResponse.json(mapRow(updated));

    } else if (status || notes !== undefined || doctorName !== undefined || sessionType !== undefined) {
      const updates: Record<string, any> = {};
      if (status) updates.status = status;
      if (notes !== undefined) updates.notes = notes;
      if (doctorName !== undefined) updates.doctor_name = doctorName;
      if (sessionType !== undefined) updates.session_type = sessionType;

      const { data: updated, error: updateErr } = await getSupabaseServer()
        .from('reservations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateErr) throw updateErr;
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
      const { error } = await getSupabaseServer()
        .from('reservations')
        .delete()
        .not('id', 'is', null);

      if (error) throw error;
      return NextResponse.json({ success: true, message: 'All reservations cleared' });
    }

    const { data, error } = await getSupabaseServer()
      .from('reservations')
      .delete()
      .eq('id', id)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Reservation deleted' });
  } catch (err) {
    console.error('DELETE /api/reservations error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
