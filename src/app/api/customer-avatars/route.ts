import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    const { data, error } = await supabaseServer
      .from('page_settings')
      .select('value')
      .eq('key', 'customer_avatars')
      .maybeSingle();

    if (error) throw error;

    const avatarsMap = data?.value || {};

    if (id) {
      return NextResponse.json({ id, avatar_url: avatarsMap[id] || null });
    }

    return NextResponse.json(avatarsMap);
  } catch (err: any) {
    console.error('GET /api/customer-avatars error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, avatar_url } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const { data: existing } = await supabaseServer
      .from('page_settings')
      .select('value')
      .eq('key', 'customer_avatars')
      .maybeSingle();

    const currentMap = existing?.value || {};

    if (!avatar_url) {
      delete currentMap[id];
    } else {
      currentMap[id] = avatar_url;
    }

    const { error: saveErr } = await supabaseServer
      .from('page_settings')
      .upsert({
        key: 'customer_avatars',
        value: currentMap,
        updated_at: new Date().toISOString()
      });

    if (saveErr) throw saveErr;

    return NextResponse.json({ success: true, id, avatar_url: avatar_url || null });
  } catch (err: any) {
    console.error('POST /api/customer-avatars error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
