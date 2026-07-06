import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { verifyHrAccess } from '@/lib/auth';

function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export async function GET(req: Request) {
  const auth = await verifyHrAccess(req);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { data: attendance, error } = await supabaseServer
      .from('hr_attendance')
      .select('*, employee_accounts(id, name, email, department, role_name)')
      .order('date', { ascending: false });

    if (error) throw error;
    return NextResponse.json(attendance);
  } catch (err: any) {
    console.error('GET /api/hr/attendance error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  // Allow any employee to check in
  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '').trim();

  if (!token) {
    return NextResponse.json({ error: 'No authorization token provided' }, { status: 401 });
  }

  const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  try {
    const { employeeId, latitude, longitude } = await req.json();

    if (!employeeId || latitude === undefined || longitude === undefined) {
      return NextResponse.json({ error: 'Missing required parameters.' }, { status: 400 });
    }

    // 1. Fetch employee branch details
    const { data: employee, error: empErr } = await supabaseServer
      .from('employee_accounts')
      .select('id, branch_id, email')
      .eq('id', employeeId)
      .maybeSingle();

    if (empErr || !employee) {
      return NextResponse.json({ error: 'Employee not found.' }, { status: 404 });
    }

    // Bypass check-in location restrictions for the owner/superadmin account
    if (employee.email?.toLowerCase() === 'superadmin@revera.com') {
      const { data, error } = await supabaseServer
        .from('hr_attendance')
        .upsert({
          employee_id: employeeId,
          date: new Date().toISOString().split('T')[0],
          latitude,
          longitude,
          status: 'Present'
        }, { onConflict: 'employee_id, date' })
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json(data);
    }

    if (!employee.branch_id) {
      return NextResponse.json({ error: 'No branch assigned to employee. Check-in location cannot be verified.' }, { status: 400 });
    }

    // Fetch branch coordinates
    const { data: branch, error: bErr } = await supabaseServer
      .from('branches')
      .select('latitude, longitude, name_en')
      .eq('id', employee.branch_id)
      .single();

    if (bErr || !branch) {
      return NextResponse.json({ error: 'Assigned branch details not found.' }, { status: 404 });
    }

    if (!branch.latitude || !branch.longitude) {
      // If branch has no coordinates configured, allow check-in by default
      const { data, error } = await supabaseServer
        .from('hr_attendance')
        .upsert({
          employee_id: employeeId,
          date: new Date().toISOString().split('T')[0],
          latitude,
          longitude,
          status: 'Present'
        }, { onConflict: 'employee_id, date' })
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json(data);
    }

    // Compute distance
    const dist = getDistanceInMeters(
      Number(latitude),
      Number(longitude),
      Number(branch.latitude),
      Number(branch.longitude)
    );

    console.log(`Employee checkin distance to ${branch.name_en}: ${dist} meters`);

    // Verify distance: limit to 500 meters
    if (dist > 500) {
      return NextResponse.json({ error: 'not_in_location', message: 'You are not in the right location for the attendance.' }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from('hr_attendance')
      .upsert({
        employee_id: employeeId,
        date: new Date().toISOString().split('T')[0],
        latitude,
        longitude,
        status: 'Present'
      }, { onConflict: 'employee_id, date' })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('POST /api/hr/attendance error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}
