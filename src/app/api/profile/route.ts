import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { requireStaffAccess } from '@/lib/access';
import { getEmployeeBranchIds } from '@/lib/employeeBranches';
import { getEmployeeWorkingSchedulesMap } from '@/lib/employeeSchedules';
import { findProviderForEmployee } from '@/lib/profileData';

// The signed-in person's own employee record and, when they are a doctor, their provider record.
// Replaces the direct browser reads of employee_accounts / providers in UserProfileView and
// DoctorAccountView (RISK-128). Only ever the caller's own data: nothing here takes an id from the request.
export async function GET(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    const { data: employee, error } = await supabaseServer
      .from('employee_accounts')
      .select('*')
      .eq('id', access.access.employee.id)
      .maybeSingle();
    if (error) throw error;
    if (!employee) return NextResponse.json({ error: 'Employee record not found.' }, { status: 404 });

    const schedulesMap = await getEmployeeWorkingSchedulesMap();
    const savedSchedule =
      employee.working_days_hours ||
      schedulesMap[employee.id] ||
      (employee.employee_id ? schedulesMap[employee.employee_id] : null) ||
      (employee.email ? schedulesMap[String(employee.email).toLowerCase()] : null) ||
      (employee.name ? schedulesMap[String(employee.name).toLowerCase()] : null) ||
      null;

    const provider = await findProviderForEmployee(employee);

    return NextResponse.json({
      employee: {
        ...employee,
        branch_ids: getEmployeeBranchIds(employee),
        working_days_hours: savedSchedule,
        workingDaysHours: savedSchedule,
      },
      provider,
    });
  } catch (err: any) {
    console.error('GET /api/profile error:', err);
    return NextResponse.json({ error: 'Could not load the profile.' }, { status: 500 });
  }
}
