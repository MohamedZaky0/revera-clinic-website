import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
    }

    const { data: employee, error } = await supabaseServer
      .from('employee_accounts')
      .select('email')
      .eq('employee_id', id.trim())
      .maybeSingle();

    if (error) throw error;

    if (!employee) {
      return NextResponse.json({ error: 'Employee account not found' }, { status: 404 });
    }

    return NextResponse.json({ email: employee.email });
  } catch (err: any) {
    console.error('GET /api/auth/employee-email error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
