import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from('branches')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error('GET /api/branches error:', err);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, ...fields } = body;

    if (id) {
      // Update existing branch
      const { data, error } = await supabaseServer
        .from('branches')
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    } else {
      // Create new branch
      const { data, error } = await supabaseServer
        .from('branches')
        .insert({ ...fields })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    }
  } catch (err: any) {
    console.error('POST /api/branches error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const { error } = await supabaseServer
      .from('branches')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('DELETE /api/branches error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
