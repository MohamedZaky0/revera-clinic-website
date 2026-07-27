import { NextResponse } from 'next/server';
import { requireStaffAccess } from '@/lib/access';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

const VALID_CADENCES = ['monthly', 'quarterly', 'yearly'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    const url = new URL(req.url);
    const activeOnly = url.searchParams.get('active') === 'true';

    let query = supabaseServer.from('recurring_expenses').select('*').order('next_due_on', { ascending: true });
    if (activeOnly) query = query.eq('active', true);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('GET /api/expenses/recurring error:', error);
    return NextResponse.json({ error: error.message || 'Unable to load recurring expenses.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    const { categoryId, branchId, amount, cadence, nextDueOn } = await req.json();
    if (!categoryId) return NextResponse.json({ error: 'categoryId is required.' }, { status: 400 });

    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return NextResponse.json({ error: 'amount must be a positive number.' }, { status: 400 });
    }
    if (!VALID_CADENCES.includes(cadence)) {
      return NextResponse.json({ error: `cadence must be one of: ${VALID_CADENCES.join(', ')}.` }, { status: 400 });
    }
    if (typeof nextDueOn !== 'string' || !DATE_RE.test(nextDueOn) || Number.isNaN(new Date(nextDueOn).getTime())) {
      return NextResponse.json({ error: "nextDueOn must be a valid 'YYYY-MM-DD' date." }, { status: 400 });
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
      .from('recurring_expenses')
      .insert({
        category_id: categoryId,
        branch_id: branchId || null,
        amount: amountNum,
        cadence,
        next_due_on: nextDueOn,
        active: true,
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/expenses/recurring error:', error);
    return NextResponse.json({ error: error.message || 'Unable to create recurring expense.' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id query param is required.' }, { status: 400 });

  try {
    const { categoryId, branchId, amount, cadence, nextDueOn, active } = await req.json();
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
    if (amount !== undefined) {
      const amountNum = Number(amount);
      if (!Number.isFinite(amountNum) || amountNum <= 0) {
        return NextResponse.json({ error: 'amount must be a positive number.' }, { status: 400 });
      }
      updates.amount = amountNum;
    }
    if (cadence !== undefined) {
      if (!VALID_CADENCES.includes(cadence)) {
        return NextResponse.json({ error: `cadence must be one of: ${VALID_CADENCES.join(', ')}.` }, { status: 400 });
      }
      updates.cadence = cadence;
    }
    if (nextDueOn !== undefined) {
      if (typeof nextDueOn !== 'string' || !DATE_RE.test(nextDueOn) || Number.isNaN(new Date(nextDueOn).getTime())) {
        return NextResponse.json({ error: "nextDueOn must be a valid 'YYYY-MM-DD' date." }, { status: 400 });
      }
      updates.next_due_on = nextDueOn;
    }
    if (active !== undefined) updates.active = Boolean(active);

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update.' }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from('recurring_expenses')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Recurring expense not found.' }, { status: 404 });
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('PATCH /api/expenses/recurring error:', error);
    return NextResponse.json({ error: error.message || 'Unable to update recurring expense.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id query param is required.' }, { status: 400 });

  try {
    const { data, error } = await supabaseServer.from('recurring_expenses').delete().eq('id', id).select();
    if (error) throw error;
    if (!data || data.length === 0) return NextResponse.json({ error: 'Recurring expense not found.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /api/expenses/recurring error:', error);
    return NextResponse.json({ error: error.message || 'Unable to delete recurring expense.' }, { status: 500 });
  }
}
