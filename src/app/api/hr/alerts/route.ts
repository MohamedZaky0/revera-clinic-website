import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { verifyHrAccess } from '@/lib/auth';
import { requireStaffAccess } from '@/lib/access';

export async function GET(req: Request) {
  const auth = await verifyHrAccess(req);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { data: alerts, error } = await supabaseServer
      .from('hr_missing_alerts')
      .select('*, employee_accounts(id, name, email, department, role_name)')
      .eq('resolved', false)
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return NextResponse.json(alerts);
  } catch (err: any) {
    console.error('GET /api/hr/alerts error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  // RISK-063: any registered staff member may log their own missing state - but must be
  // staff, not just any authenticated session (a patient account was previously able to
  // submit these). requireStaffAccess confirms an employee_accounts row without restricting
  // by role, matching the original "any logged in employee" intent.
  const access = await requireStaffAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const { employeeId } = await req.json();
    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID is required.' }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from('hr_missing_alerts')
      .insert({
        employee_id: employeeId,
        timestamp: new Date().toISOString(),
        resolved: false
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    console.error('POST /api/hr/alerts error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const auth = await verifyHrAccess(req);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id, resolved } = await req.json();
    if (!id || resolved === undefined) {
      return NextResponse.json({ error: 'Alert ID and resolved status are required.' }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from('hr_missing_alerts')
      .update({ resolved })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('PATCH /api/hr/alerts error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}
