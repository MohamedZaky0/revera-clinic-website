import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { requireStaffAccess } from '@/lib/access';
import { isIsoDate } from '@/lib/profileData';

// The signed-in person's own attendance rows between two dates (UserProfileView). HR and admins read
// everyone's through /api/hr/attendance; this one never takes an employee id from the request.
export async function GET(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  if (!isIsoDate(from) || !isIsoDate(to)) {
    return NextResponse.json({ error: 'from and to must be dates in YYYY-MM-DD format.' }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseServer
      .from('hr_attendance')
      .select('*')
      .eq('employee_id', access.access.employee.id)
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: false });
    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err: any) {
    console.error('GET /api/profile/attendance error:', err);
    return NextResponse.json({ error: 'Could not load attendance.' }, { status: 500 });
  }
}
