import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * pg returns DATE columns as JavaScript Date objects set to UTC midnight.
 * toISOString().slice(0,10) on a UTC-midnight Date is always correct (no tz shift).
 * String() on a Date gives "Mon Jun 22 ..." which breaks everything — never use that.
 */
function fmtDate(d: unknown): string {
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10); // already a YYYY-MM-DD string
}

function mapRow(r: Record<string, unknown>) {
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

  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (status)    { conditions.push(`status = $${idx++}`);     values.push(status); }
  if (serviceId) { conditions.push(`service_id = $${idx++}`); values.push(Number(serviceId)); }
  if (date)      { conditions.push(`date = $${idx++}`);       values.push(date); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `SELECT * FROM reservations ${where} ORDER BY created_at DESC`;

  try {
    const result = await query(sql, values);
    return NextResponse.json(result.rows.map(mapRow));
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

  const sql = `
    INSERT INTO reservations (service_id, date, requested_time, name, email, phone, notes, status, time_slot, session_type)
    VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NULL, $8)
    RETURNING *
  `;
  const values = [
    Number(serviceId), 
    date, 
    requestedTime || null, 
    name, 
    email, 
    phone, 
    notes || '', 
    sessionType || 'in_person'
  ];

  try {
    const result = await query(sql, values);
    return NextResponse.json(mapRow(result.rows[0]), { status: 201 });
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
    const found = await query('SELECT * FROM reservations WHERE id = $1', [id]);
    if (found.rows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const target = found.rows[0];

    if (action === 'approve') {
      if (!timeSlot) return NextResponse.json({ error: 'Missing timeSlot' }, { status: 400 });

      const bookedRes = await query(
        `SELECT COUNT(*) FROM reservations WHERE service_id = $1 AND date = $2 AND status = 'approved'`,
        [target.service_id, target.date]
      );
      if (Number(bookedRes.rows[0].count) >= 8) {
        return NextResponse.json({ error: 'Day is fully booked' }, { status: 400 });
      }

      const slotRes = await query(
        `SELECT COUNT(*) FROM reservations WHERE service_id = $1 AND date = $2 AND status = 'approved' AND time_slot = $3`,
        [target.service_id, target.date, timeSlot]
      );
      if (Number(slotRes.rows[0].count) > 0) {
        return NextResponse.json({ error: 'Time slot already taken' }, { status: 400 });
      }

      const updated = await query(
        `UPDATE reservations SET status = 'approved', time_slot = $1, doctor_name = $2 WHERE id = $3 RETURNING *`,
        [timeSlot, doctorName || null, id]
      );
      return NextResponse.json(mapRow(updated.rows[0]));

    } else if (action === 'reject') {
      const updated = await query(
        `UPDATE reservations SET status = 'rejected' WHERE id = $1 RETURNING *`,
        [id]
      );
      return NextResponse.json(mapRow(updated.rows[0]));

    } else if (status || notes !== undefined || doctorName !== undefined || sessionType !== undefined) {
      const fields: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      if (status) {
        fields.push(`status = $${idx++}`);
        values.push(status);
      }
      if (notes !== undefined) {
        fields.push(`notes = $${idx++}`);
        values.push(notes);
      }
      if (doctorName !== undefined) {
        fields.push(`doctor_name = $${idx++}`);
        values.push(doctorName);
      }
      if (sessionType !== undefined) {
        fields.push(`session_type = $${idx++}`);
        values.push(sessionType);
      }

      values.push(id);
      const updated = await query(
        `UPDATE reservations SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
        values
      );
      return NextResponse.json(mapRow(updated.rows[0]));
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
      await query('TRUNCATE TABLE reservations RESTART IDENTITY');
      return NextResponse.json({ success: true, message: 'All reservations cleared' });
    }
    const deleted = await query('DELETE FROM reservations WHERE id = $1 RETURNING *', [id]);
    if (deleted.rows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Reservation deleted' });
  } catch (err) {
    console.error('DELETE /api/reservations error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
