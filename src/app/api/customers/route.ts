import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function GET() {
  try {
    const { data: rows, error } = await supabaseServer
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(rows || []);
  } catch (err) {
    console.error('GET /api/customers error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
