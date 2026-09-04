import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { requireStaffAccess } from '@/lib/access';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const date = url.searchParams.get('date');
  if (!date) return NextResponse.json({ error: 'Missing date parameter' }, { status: 400 });

  try {
    const { data, error } = await supabaseServer
      .from('provider_attendance')
      .select('*')
      .eq('date', date);

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err: any) {
    console.error('GET /api/provider-attendance error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const body = await req.json();
    const { providerId, date, status, checkIn, checkOut, notes } = body;

    if (!providerId || !date || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from('provider_attendance')
      .upsert({
        provider_id: providerId,
        date,
        status,
        check_in: checkIn || null,
        check_out: checkOut || null,
        notes: notes || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'provider_id,date' })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('POST /api/provider-attendance error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}
