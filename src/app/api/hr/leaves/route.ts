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
    const { data: leaves, error } = await supabaseServer
      .from('hr_leave_requests')
      .select('*, employee_accounts:employee_accounts!hr_leave_requests_employee_id_fkey(id, name, email, department, role_name)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(leaves);
  } catch (err: any) {
    console.error('GET /api/hr/leaves error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  // RISK-063: any registered staff member can submit a leave request - but must be staff,
  // not just any authenticated session (a patient account was previously able to submit
  // these). requireStaffAccess confirms an employee_accounts row without restricting by
  // role, matching the original "any logged in employee" intent.
  const access = await requireStaffAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const { employeeId, leaveType, startDate, endDate, reason } = await req.json();

    if (!employeeId || !leaveType || !startDate || !endDate) {
      return NextResponse.json({ error: 'Missing required parameters.' }, { status: 400 });
    }

    // Calculate days count
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const { data, error } = await supabaseServer
      .from('hr_leave_requests')
      .insert({
        employee_id: employeeId,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        days_count: diffDays,
        reason: reason || null,
        status: 'Pending'
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    console.error('POST /api/hr/leaves error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  // Only HR/Admin can approve/reject
  const auth = await verifyHrAccess(req);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id, status, approvedBy } = await req.json();
    if (!id || !status) {
      return NextResponse.json({ error: 'Request ID and Status are required.' }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from('hr_leave_requests')
      .update({
        status,
        approved_by: approvedBy || null
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('PATCH /api/hr/leaves error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}
