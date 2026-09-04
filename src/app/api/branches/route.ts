import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { requireAdministratorAccess } from '@/lib/access';

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
  const access = await requireAdministratorAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const body = await req.json();
    const { id, ...fields } = body;

    if (id) {
      // 1. Try updating existing branch
      const { data, error } = await supabaseServer
        .from('branches')
        .update(fields)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        return NextResponse.json(data);
      }

      console.warn("Supabase branches update error, attempting upsert:", error);

      // 2. Try upserting if row was not found or update failed
      const { data: upsertData, error: upsertError } = await supabaseServer
        .from('branches')
        .upsert({ id, ...fields })
        .select()
        .single();

      if (!upsertError && upsertData) {
        return NextResponse.json(upsertData);
      }

      // Both attempts failed (e.g. a column in `fields` doesn't exist on the table) — this used
      // to fall through to `NextResponse.json({ id, ...fields })` with a 200, which echoed the
      // submitted payload back as if it had saved, when nothing was actually persisted. See
      // RISK-037: that silent success is exactly why branches.service_hours' missing column went
      // unnoticed. Surface the real failure instead.
      console.error("Supabase branches upsert also failed:", upsertError);
      return NextResponse.json(
        { error: (upsertError && upsertError.message) || (error && error.message) || 'Failed to save branch' },
        { status: 500 }
      );
    } else {
      // Create new branch
      const { data, error } = await supabaseServer
        .from('branches')
        .insert(fields)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    }
  } catch (err: any) {
    console.error('POST /api/branches error:', err);
    return NextResponse.json({ error: err.message || 'Failed to save branch' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const access = await requireAdministratorAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

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
