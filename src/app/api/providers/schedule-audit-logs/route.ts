import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from('provider_schedule_audit_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn("Could not load provider schedule audit logs:", error.message);
      return NextResponse.json([]);
    }

    return NextResponse.json(data || []);
  } catch (err: any) {
    console.error('GET /api/providers/schedule-audit-logs error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}
