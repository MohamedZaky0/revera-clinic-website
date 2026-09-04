import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { requireStaffAccess } from '@/lib/access';

export async function GET(req: Request) {
  try {
    const { data, error } = await supabaseServer
      .from('rooms')
      .select('*, branches(name_en, name_ar)')
      .order('name', { ascending: true });

    if (error) throw error;

    const formatted = data.map((r: any) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      status: r.status,
      branchId: r.branch_id,
      branchNameEn: r.branches?.name_en || '',
      branchNameAr: r.branches?.name_ar || '',
      createdAt: r.created_at,
    }));

    return NextResponse.json(formatted);
  } catch (err: any) {
    console.error('GET /api/rooms error:', err);
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
    const { name, type, status, branchId } = body;

    if (!name || !type || !branchId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from('rooms')
      .insert({
        name,
        type,
        status: status || 'available',
        branch_id: branchId
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    console.error('POST /api/rooms error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing room ID' }, { status: 400 });

  try {
    const body = await req.json();
    const { name, type, status, branchId } = body;

    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name;
    if (type !== undefined) updates.type = type;
    if (status !== undefined) updates.status = status;
    if (branchId !== undefined) updates.branch_id = branchId;

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseServer
      .from('rooms')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('PATCH /api/rooms error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing room ID' }, { status: 400 });

  try {
    const { error } = await supabaseServer
      .from('rooms')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true, message: 'Room deleted successfully' });
  } catch (err: any) {
    console.error('DELETE /api/rooms error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}
