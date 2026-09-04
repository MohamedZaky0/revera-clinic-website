import { NextResponse } from 'next/server';
import { requireStaffAccess } from '@/lib/access';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

const VALID_KINDS = ['fixed', 'variable'];

export async function GET(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    const { data, error } = await supabaseServer
      .from('expense_categories')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('GET /api/expenses/categories error:', error);
    return NextResponse.json({ error: error.message || 'Unable to load expense categories.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    const { name, kind, parentId } = await req.json();
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'name is required.' }, { status: 400 });
    }
    if (!VALID_KINDS.includes(kind)) {
      return NextResponse.json({ error: `kind must be one of: ${VALID_KINDS.join(', ')}.` }, { status: 400 });
    }
    if (parentId) {
      const { data: parent, error: parentError } = await supabaseServer
        .from('expense_categories')
        .select('id')
        .eq('id', parentId)
        .maybeSingle();
      if (parentError) throw parentError;
      if (!parent) return NextResponse.json({ error: 'Parent category not found.' }, { status: 404 });
    }

    const { data, error } = await supabaseServer
      .from('expense_categories')
      .insert({ name: name.trim(), kind, parent_id: parentId || null })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/expenses/categories error:', error);
    return NextResponse.json({ error: error.message || 'Unable to create expense category.' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id query param is required.' }, { status: 400 });

  try {
    const { name, kind, parentId } = await req.json();
    const updates: Record<string, any> = {};

    if (name !== undefined) {
      if (!name || typeof name !== 'string') {
        return NextResponse.json({ error: 'name must be a non-empty string.' }, { status: 400 });
      }
      updates.name = name.trim();
    }
    if (kind !== undefined) {
      if (!VALID_KINDS.includes(kind)) {
        return NextResponse.json({ error: `kind must be one of: ${VALID_KINDS.join(', ')}.` }, { status: 400 });
      }
      updates.kind = kind;
    }
    if (parentId !== undefined) {
      if (parentId === id) {
        return NextResponse.json({ error: 'A category cannot be its own parent.' }, { status: 400 });
      }
      if (parentId) {
        const { data: parent, error: parentError } = await supabaseServer
          .from('expense_categories')
          .select('id')
          .eq('id', parentId)
          .maybeSingle();
        if (parentError) throw parentError;
        if (!parent) return NextResponse.json({ error: 'Parent category not found.' }, { status: 404 });
      }
      updates.parent_id = parentId || null;
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update.' }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from('expense_categories')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Expense category not found.' }, { status: 404 });
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('PATCH /api/expenses/categories error:', error);
    return NextResponse.json({ error: error.message || 'Unable to update expense category.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id query param is required.' }, { status: 400 });

  try {
    const { data, error } = await supabaseServer
      .from('expense_categories')
      .delete()
      .eq('id', id)
      .select();
    if (error) {
      if (error.code === '23503') {
        return NextResponse.json(
          { error: 'This category still has expenses or recurring expenses against it. Re-categorize or delete those first.' },
          { status: 409 }
        );
      }
      throw error;
    }
    if (!data || data.length === 0) return NextResponse.json({ error: 'Expense category not found.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /api/expenses/categories error:', error);
    return NextResponse.json({ error: error.message || 'Unable to delete expense category.' }, { status: 500 });
  }
}
