import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { requireStaffAccess } from '@/lib/access';
import { cleanPersonName, findProviderForEmployee, isIsoDate, sumTargetRevenue, TARGET_REVENUE_STATUSES } from '@/lib/profileData';

// What the profile screen needs for the signed-in person's pay summary and target progress: their own
// employee row, their provider row and the month's doctor_payroll row (doctors), and the money collected on
// their own bookings between two dates. `view=doctor` counts bookings assigned to them, `view=staff` the
// ones they created. Never takes an employee or provider id from the request.
export async function GET(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const view = searchParams.get('view') === 'doctor' ? 'doctor' : 'staff';
  if (!isIsoDate(from) || !isIsoDate(to)) {
    return NextResponse.json({ error: 'from and to must be dates in YYYY-MM-DD format.' }, { status: 400 });
  }
  const month = from.slice(0, 7);

  try {
    const { data: employee, error: employeeError } = await supabaseServer
      .from('employee_accounts')
      .select('*')
      .eq('id', access.access.employee.id)
      .maybeSingle();
    if (employeeError) throw employeeError;
    if (!employee) return NextResponse.json({ error: 'Employee record not found.' }, { status: 404 });

    const provider = await findProviderForEmployee(employee);

    let doctorPayroll: any = null;
    if (provider?.id) {
      const { data, error } = await supabaseServer
        .from('doctor_payroll')
        .select('*')
        .eq('provider_id', provider.id)
        .eq('month', month)
        .limit(1);
      if (error) throw error;
      doctorPayroll = Array.isArray(data) && data.length > 0 ? data[0] : null;
    }

    const { data: reservations, error: reservationsError } = await supabaseServer
      .from('reservations')
      .select('amount_paid, status, date, doctor_name, provider_id, created_by_employee_id')
      .gte('date', from)
      .lte('date', to)
      .in('status', TARGET_REVENUE_STATUSES);
    if (reservationsError) throw reservationsError;

    const targetRevenue = sumTargetRevenue(reservations || [], {
      view,
      employeeId: employee.id,
      providerId: provider?.id ?? null,
      cleanName: cleanPersonName(employee.name),
    });

    return NextResponse.json({ employee, provider, doctorPayroll, targetRevenue });
  } catch (err: any) {
    console.error('GET /api/profile/payroll error:', err);
    return NextResponse.json({ error: 'Could not load the pay summary.' }, { status: 500 });
  }
}
