import { NextResponse } from 'next/server';
import { requireStaffAccess } from '@/lib/access';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    const url = new URL(req.url);
    const branchId = url.searchParams.get('branchId');
    const categoryId = url.searchParams.get('categoryId');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    let query = supabaseServer.from('expenses').select('*').order('incurred_on', { ascending: false });
    if (branchId) query = query.eq('branch_id', branchId);
    if (categoryId) query = query.eq('category_id', categoryId);
    if (from) query = query.gte('incurred_on', from);
    if (to) query = query.lte('incurred_on', to);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('GET /api/expenses error:', error);
    return NextResponse.json({ error: error.message || 'Unable to load expenses.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    const { categoryId, branchId, incurredOn, amount, vendor, note, isOpening } = await req.json();
    if (!categoryId) return NextResponse.json({ error: 'categoryId is required.' }, { status: 400 });
    if (typeof incurredOn !== 'string' || !DATE_RE.test(incurredOn) || Number.isNaN(new Date(incurredOn).getTime())) {
      return NextResponse.json({ error: "incurredOn must be a valid 'YYYY-MM-DD' date." }, { status: 400 });
    }
    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return NextResponse.json({ error: 'amount must be a positive number.' }, { status: 400 });
    }

    const [categoryResult, branchResult] = await Promise.all([
      supabaseServer.from('expense_categories').select('id').eq('id', categoryId).maybeSingle(),
      branchId
        ? supabaseServer.from('branches').select('id').eq('id', branchId).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);
    if (categoryResult.error) throw categoryResult.error;
    if (!categoryResult.data) return NextResponse.json({ error: 'Expense category not found.' }, { status: 404 });
    if (branchResult.error) throw branchResult.error;
    if (branchId && !branchResult.data) return NextResponse.json({ error: 'Branch not found.' }, { status: 404 });

    const { data, error } = await supabaseServer
      .from('expenses')
      .insert({
        category_id: categoryId,
        branch_id: branchId || null,
        incurred_on: incurredOn,
        amount: amountNum,
        vendor: vendor ? String(vendor).trim() : null,
        note: note ? String(note).trim() : null,
        is_opening: Boolean(isOpening),
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/expenses error:', error);
    return NextResponse.json({ error: error.message || 'Unable to create expense.' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id query param is required.' }, { status: 400 });

  try {
    const { categoryId, branchId, incurredOn, amount, vendor, note } = await req.json();
    const updates: Record<string, any> = {};

    if (categoryId !== undefined) {
      const { data: category, error: categoryError } = await supabaseServer
        .from('expense_categories')
        .select('id')
        .eq('id', categoryId)
        .maybeSingle();
      if (categoryError) throw categoryError;
      if (!category) return NextResponse.json({ error: 'Expense category not found.' }, { status: 404 });
      updates.category_id = categoryId;
    }
    if (branchId !== undefined) {
      if (branchId) {
        const { data: branch, error: branchError } = await supabaseServer
          .from('branches')
          .select('id')
          .eq('id', branchId)
          .maybeSingle();
        if (branchError) throw branchError;
        if (!branch) return NextResponse.json({ error: 'Branch not found.' }, { status: 404 });
      }
      updates.branch_id = branchId || null;
    }
    if (incurredOn !== undefined) {
      if (typeof incurredOn !== 'string' || !DATE_RE.test(incurredOn) || Number.isNaN(new Date(incurredOn).getTime())) {
        return NextResponse.json({ error: "incurredOn must be a valid 'YYYY-MM-DD' date." }, { status: 400 });
      }
      updates.incurred_on = incurredOn;
    }
    if (amount !== undefined) {
      const amountNum = Number(amount);
      if (!Number.isFinite(amountNum) || amountNum <= 0) {
        return NextResponse.json({ error: 'amount must be a positive number.' }, { status: 400 });
      }
      updates.amount = amountNum;
    }
    if (vendor !== undefined) updates.vendor = vendor ? String(vendor).trim() : null;
    if (note !== undefined) updates.note = note ? String(note).trim() : null;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update.' }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from('expenses')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Expense not found.' }, { status: 404 });
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('PATCH /api/expenses error:', error);
    return NextResponse.json({ error: error.message || 'Unable to update expense.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id query param is required.' }, { status: 400 });

  try {
    const { data, error } = await supabaseServer.from('expenses').delete().eq('id', id).select();
    if (error) throw error;
    if (!data || data.length === 0) return NextResponse.json({ error: 'Expense not found.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /api/expenses error:', error);
    return NextResponse.json({ error: error.message || 'Unable to delete expense.' }, { status: 500 });
  }
}
