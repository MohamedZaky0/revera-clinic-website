import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json({ error: 'Missing key parameter' }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from('page_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json(data ? data.value : null);
  } catch (err: any) {
    console.error('GET /api/clinic-settings error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { key, value } = body;

    if (!key || !value) {
      return NextResponse.json({ error: 'Missing key or value' }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from('page_settings')
      .upsert({
        key,
        value,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('POST /api/clinic-settings error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}
