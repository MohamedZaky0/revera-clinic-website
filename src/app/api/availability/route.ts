import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

function formatDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const params = url.searchParams;
  const serviceId = params.get('serviceId');
  const days = Number(params.get('days') || '30');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dateKeys: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dateKeys.push(formatDate(d));
  }

  try {
    const conditions: string[] = [`status = 'approved'`, `date = ANY($1)`];
    const values: unknown[] = [dateKeys];
    let idx = 2;

    if (serviceId) {
      conditions.push(`service_id = $${idx++}`);
      values.push(Number(serviceId));
    }

    const sql = `
      SELECT date, time_slot
      FROM reservations
      WHERE ${conditions.join(' AND ')}
    `;

    const result = await query(sql, values);

    const rows = result.rows as Array<{ date: any; time_slot: string | null }>;

    // Group by date
    const groupedByDate = new Map<string, string[]>();
    for (const key of dateKeys) {
      groupedByDate.set(key, []);
    }
    for (const row of rows) {
      const key = String(row.date).slice(0, 10);
      if (groupedByDate.has(key)) {
        if (row.time_slot) groupedByDate.get(key)!.push(row.time_slot);
      }
    }

    const output = dateKeys.map((key) => {
      const slots = groupedByDate.get(key) ?? [];
      return { date: key, approvedCount: slots.length, approvedSlots: slots };
    });

    return NextResponse.json(output);
  } catch (err) {
    console.error('GET /api/availability error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
