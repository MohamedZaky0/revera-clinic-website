import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

function mapProviderRow(r: any) {
  return {
    id: r.id,
    name: r.name,
    bookings: r.bookings_count,
    services: r.services || [],
    more: r.more_count,
    rating: Number(r.rating || 0),
  };
}

function mapProviderToDb(p: any) {
  return {
    id: p.id || undefined,
    name: p.name,
    bookings_count: p.bookings || 0,
    services: p.services || [],
    more_count: p.more || 0,
    rating: p.rating || 0,
  };
}

export async function GET(req: Request) {
  try {
    const { data, error } = await getSupabaseServer()
      .from('providers')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return NextResponse.json((data || []).map(mapProviderRow));
  } catch (err) {
    console.error('GET /api/providers error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const isArray = Array.isArray(body);
    const providersToUpsert = isArray ? body.map(mapProviderToDb) : [mapProviderToDb(body)];

    const { data, error } = await getSupabaseServer()
      .from('providers')
      .upsert(providersToUpsert)
      .select();

    if (error) throw error;
    return NextResponse.json(isArray ? data.map(mapProviderRow) : mapProviderRow(data[0]), { status: 201 });
  } catch (err) {
    console.error('POST /api/providers error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  try {
    const { data, error } = await getSupabaseServer()
      .from('providers')
      .delete()
      .eq('id', id)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Provider deleted' });
  } catch (err) {
    console.error('DELETE /api/providers error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
