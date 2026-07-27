import { NextResponse } from 'next/server';
import { requireStaffAccess } from '@/lib/access';
import { supabaseServer } from '@/lib/supabaseServer';
import { nextCadenceDate } from '@/lib/expenses';

export const dynamic = 'force-dynamic';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Generates exactly one `expenses` row per active, due `recurring_expenses` template and
 * advances that template's `next_due_on` by exactly one cadence step (task 3.10). Deliberately
 * one period per call, not a catch-up loop — idempotent against being called twice the same day
 * because `next_due_on` moves into the future on the first call. An operator (or a future cron)
 * calling this daily catches up naturally; calling it once for a template overdue by several
 * periods only advances one period at a time, by design.
 */
export async function POST(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    const body = await req.json().catch(() => ({}));
    const asOf = typeof body?.asOf === 'string' && DATE_RE.test(body.asOf) ? body.asOf : todayDateString();

    const { data: due, error: dueError } = await supabaseServer
      .from('recurring_expenses')
      .select('*')
      .eq('active', true)
      .lte('next_due_on', asOf);
    if (dueError) throw dueError;

    const generated: any[] = [];
    for (const template of due || []) {
      const { data: expense, error: expenseError } = await supabaseServer
        .from('expenses')
        .insert({
          category_id: template.category_id,
          branch_id: template.branch_id,
          incurred_on: template.next_due_on,
          amount: template.amount,
          recurring_id: template.id,
        })
        .select()
        .single();
      if (expenseError) throw expenseError;

      const advancedDueOn = nextCadenceDate(template.next_due_on, template.cadence);
      const { error: advanceError } = await supabaseServer
        .from('recurring_expenses')
        .update({ next_due_on: advancedDueOn })
        .eq('id', template.id);
      if (advanceError) throw advanceError;

      generated.push(expense);
    }

    return NextResponse.json({ generated, count: generated.length });
  } catch (error: any) {
    console.error('POST /api/expenses/generate-due error:', error);
    return NextResponse.json({ error: error.message || 'Unable to generate due expenses.' }, { status: 500 });
  }
}
