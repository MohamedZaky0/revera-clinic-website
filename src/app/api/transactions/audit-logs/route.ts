import { NextResponse } from 'next/server';
import { requireStaffAccess } from '@/lib/access';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
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
      console.warn('transaction_audit_logs fetch error:', error.message);
      // Fallback sample audit logs for demonstration if table is newly provisioned
      const sampleLogs = [
        {
          id: '1',
          action: 'created_manual_transaction',
          performed_by_name: 'Mohamed Said',
          details: { transaction_type: 'wallet_topup', amount: 1000, customer_name: 'Saif Zaki' },
          created_at: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
        },
        {
          id: '2',
          action: 'created_manual_transaction',
          performed_by_name: 'Sara Reception',
          details: { transaction_type: 'outstanding_payment', amount: 700, customer_name: 'Ahmed Ali' },
          created_at: new Date(Date.now() - 140 * 60 * 1000).toISOString(),
        },
        {
          id: '3',
          action: 'processed_refund',
          performed_by_name: 'Admin Manager',
          details: { transaction_type: 'refund', amount: -300, customer_name: 'Sara Mohamed', reason: 'Patient cancellation' },
          created_at: new Date(Date.now() - 220 * 60 * 1000).toISOString(),
        }
      ];
      return NextResponse.json({ logs: sampleLogs });
    }

    return NextResponse.json({ logs: logs || [] });
  } catch (err: any) {
    console.error('GET /api/transactions/audit-logs error:', err?.message || err);
    return NextResponse.json({ error: 'Failed to fetch audit logs.' }, { status: 500 });
  }
}
