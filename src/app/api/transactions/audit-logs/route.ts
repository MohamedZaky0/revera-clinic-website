import { NextResponse } from 'next/server';
import { requireStaffAccess, hasFinancePermission } from '@/lib/access';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  if (!hasFinancePermission(access.access, 'transactions.view')) {
    return NextResponse.json({ error: 'Transactions access is required.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const transactionId = searchParams.get('transactionId');
  const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '50', 10)));

  try {
    let query = supabaseServer
      .from('transaction_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (transactionId) {
      query = query.eq('transaction_id', transactionId);
    }

    const { data: logs, error } = await query;

    if (error) {
      console.error('transaction_audit_logs fetch error:', error.message);
      return NextResponse.json({ error: 'Failed to fetch audit logs.' }, { status: 500 });
    }

    return NextResponse.json({ logs: logs || [] });
  } catch (err: any) {
    console.error('GET /api/transactions/audit-logs error:', err?.message || err);
    return NextResponse.json({ error: 'Failed to fetch audit logs.' }, { status: 500 });
  }
}
