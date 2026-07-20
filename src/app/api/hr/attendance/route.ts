import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { verifyHrAccess } from '@/lib/auth';
import https from 'https';

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

function getFinalUrl(targetUrl: string): Promise<string> {
  return new Promise((resolve) => {
    try {
      const options = {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 5000
      };

      const req = https.get(targetUrl, options, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          resolve(getFinalUrl(res.headers.location));
        } else {
          resolve(targetUrl);
        }
      });
      
      req.on('error', () => {
        resolve(targetUrl);
      });
      
      req.on('timeout', () => {
        req.destroy();
        resolve(targetUrl);
      });
    } catch (e) {
      resolve(targetUrl);
    }
  });
}

async function extractCoordsFromMapsLink(mapsLink: string) {
  if (!mapsLink) return null;
  try {
    const finalUrl = await getFinalUrl(mapsLink);
    
    // Pattern 1: /@30.001242,31.451330
    const regexAt = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
    const matchAt = finalUrl.match(regexAt);
    if (matchAt) {
      return { latitude: parseFloat(matchAt[1]), longitude: parseFloat(matchAt[2]) };
    }
    
    // Pattern 2: !3d30.0192534!4d31.4913222 (high-accuracy place pin)
    const regexPlace = /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/;
    const matchPlace = finalUrl.match(regexPlace);
    if (matchPlace) {
      return { latitude: parseFloat(matchPlace[1]), longitude: parseFloat(matchPlace[2]) };
    }

    // Pattern 3: ?q=30.001242,31.451330
    const regexQ = /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/;
    const matchQ = finalUrl.match(regexQ);
    if (matchQ) {
      return { latitude: parseFloat(matchQ[1]), longitude: parseFloat(matchQ[2]) };
    }
  } catch (err) {
    console.error("Error resolving maps link coordinates:", err);
  }
  return null;
}

export async function GET(req: Request) {
  const auth = await verifyHrAccess(req);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId') || searchParams.get('employee_id');
    const month = searchParams.get('month'); // YYYY-MM

    let query = supabaseServer
      .from('hr_attendance')
      .select('*, employee_accounts(id, name, email, department, role_name, shift)')
      .order('date', { ascending: false });

    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const startDate = `${month}-01`;
      const year = parseInt(month.split('-')[0], 10);
      const m = parseInt(month.split('-')[1], 10);
      const lastDay = new Date(year, m, 0).getDate();
      const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;
      query = query.gte('date', startDate).lte('date', endDate);
    }

    const { data: attendance, error } = await query;

    if (error) throw error;

    // Fetch approved leave requests to display leave status dynamically
    let leavesQuery = supabaseServer
      .from('hr_leave_requests')
      .select('employee_id, start_date, end_date, leave_type, reason, status')
      .eq('status', 'Approved');

    if (employeeId) {
      leavesQuery = leavesQuery.eq('employee_id', employeeId);
    }

    const { data: leaves } = await leavesQuery;
    const approvedLeaves = leaves || [];

    const enriched = (attendance || []).map((rec: any) => {
      const matchLeave = approvedLeaves.find((l: any) => {
        if (l.employee_id !== rec.employee_id) return false;
        const rDate = rec.date; // YYYY-MM-DD
        return rDate >= l.start_date && rDate <= l.end_date;
      });

      const shiftStr = rec.employee_accounts?.shift || 'Day';
      const isNight = shiftStr.toLowerCase().includes('night') || shiftStr.toLowerCase().includes('pm');
      
      const scheduledInLabel = isNight ? '05:00 PM' : '09:00 AM';
      const scheduledOutLabel = isNight ? '01:00 AM' : '05:00 PM';
      const scheduledStartHour = isNight ? 17 : 9;
      const scheduledEndHour = isNight ? 1 : 17;

      let late_minutes = 0;
      let early_leave_minutes = 0;
      let overtime_minutes = 0;
      let worked_minutes = 0;

      if (rec.check_in_time) {
        const inDate = new Date(rec.check_in_time);
        const inHour = inDate.getHours();
        const inMin = inDate.getMinutes();
        const actualInTotalMin = inHour * 60 + inMin;
        const scheduledInTotalMin = scheduledStartHour * 60;

        if (actualInTotalMin > scheduledInTotalMin) {
          late_minutes = actualInTotalMin - scheduledInTotalMin;
        }

        if (rec.check_out_time) {
          const outDate = new Date(rec.check_out_time);
          const outHour = outDate.getHours();
          const outMin = outDate.getMinutes();
          let actualOutTotalMin = outHour * 60 + outMin;
          let scheduledOutTotalMin = scheduledEndHour * 60;

          if (isNight && actualOutTotalMin < 12 * 60) {
            actualOutTotalMin += 24 * 60; // Next morning
          }
          if (isNight && scheduledOutTotalMin < 12 * 60) {
            scheduledOutTotalMin += 24 * 60;
          }

          const rawDurationMs = outDate.getTime() - inDate.getTime();
          const rawWorkedMin = Math.max(0, Math.floor(rawDurationMs / (1000 * 60)));

          // Parse mid-shift leaves if present
          const midShiftLeaves: any[] = Array.isArray(rec.mid_shift_leaves) ? rec.mid_shift_leaves : [];
          const combinedMidShiftMin = midShiftLeaves.reduce((sum: number, ev: any) => sum + (Number(ev.duration_minutes) || 0), 0);

          worked_minutes = Math.max(0, rawWorkedMin - combinedMidShiftMin);

          if (actualOutTotalMin < scheduledOutTotalMin) {
            early_leave_minutes = scheduledOutTotalMin - actualOutTotalMin;
          } else if (actualOutTotalMin > scheduledOutTotalMin) {
            overtime_minutes = actualOutTotalMin - scheduledOutTotalMin;
          } else if (worked_minutes > 480) {
            overtime_minutes = worked_minutes - 480;
          }
        }
      }

      const midShiftLeavesList: any[] = Array.isArray(rec.mid_shift_leaves) ? rec.mid_shift_leaves : [];
      const combinedMidShiftMin = midShiftLeavesList.reduce((sum: number, ev: any) => sum + (Number(ev.duration_minutes) || 0), 0);

      return {
        ...rec,
        leave_status: matchLeave ? `Yes (${matchLeave.leave_type})` : 'No',
        leave_request_details: matchLeave || null,
        scheduled_in: scheduledInLabel,
        scheduled_out: scheduledOutLabel,
        late_minutes,
        early_leave_minutes,
        overtime_minutes,
        worked_minutes,
        mid_shift_leaves: midShiftLeavesList,
        combined_mid_shift_duration_minutes: combinedMidShiftMin
      };
    });

    return NextResponse.json(enriched);
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
          check_in_time: new Date().toISOString(),
          latitude,
          longitude,
          status: 'Present'
        }, { onConflict: 'employee_id,date' })
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json(data);
    }

    if (!employee.branch_id) {
      return NextResponse.json({ error: 'no_branch', message: 'No branch assigned to employee.' }, { status: 400 });
    }

    // Fetch branch coordinates and maps link
    const { data: branch, error: bErr } = await supabaseServer
      .from('branches')
      .select('latitude, longitude, maps_link, name_en')
      .eq('id', employee.branch_id)
      .single();

    if (bErr || !branch) {
      return NextResponse.json({ error: 'Branch details not found.' }, { status: 404 });
    }

    let targetLat = branch.latitude ? Number(branch.latitude) : null;
    let targetLng = branch.longitude ? Number(branch.longitude) : null;

    // Dynamically extract coordinates from the branch maps link for high accuracy
    if (branch.maps_link) {
      const parsedCoords = await extractCoordsFromMapsLink(branch.maps_link);
      if (parsedCoords) {
        targetLat = parsedCoords.latitude;
        targetLng = parsedCoords.longitude;
        console.log(`Resolved maps_link coords for ${branch.name_en}: ${targetLat}, ${targetLng}`);
      }
    }

    if (!targetLat || !targetLng) {
      return NextResponse.json(
        { error: 'no_location_configured', message: `No GPS coordinates or Google Maps link configured for branch: ${branch.name_en || 'Assigned Branch'}.` },
        { status: 400 }
      );
    }

    // Compute distance between employee and branch
    const dist = getDistanceInMeters(
      Number(latitude),
      Number(longitude),
      targetLat,
      targetLng
    );

    console.log(`Employee checkin distance to ${branch.name_en}: ${dist.toFixed(0)} meters`);

    // Outside the 800m radius — log attendance as "Out of Location" and return error so frontend can warn
    if (dist > 800) {
      // Still record the attempt with Out of Location status
      await supabaseServer
        .from('hr_attendance')
        .upsert({
          employee_id: employeeId,
          date: new Date().toISOString().split('T')[0],
          check_in_time: new Date().toISOString(),
          latitude,
          longitude,
          status: 'Out of Location'
        }, { onConflict: 'employee_id,date' });

      return NextResponse.json(
        { error: 'not_in_location', message: 'You are not in the right location for the attendance.', distance: Math.round(dist) },
        { status: 400 }
      );
    }

    // Within range — log as Present
    const { data, error } = await supabaseServer
      .from('hr_attendance')
      .upsert({
        employee_id: employeeId,
        date: new Date().toISOString().split('T')[0],
        check_in_time: new Date().toISOString(),
        latitude,
        longitude,
        status: 'Present'
      }, { onConflict: 'employee_id,date' })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('POST /api/hr/attendance error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
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
    const { employeeId } = await req.json();

    if (!employeeId) {
      return NextResponse.json({ error: 'Missing required parameters.' }, { status: 400 });
    }

    const dateStr = new Date().toISOString().split('T')[0];

    const { data, error } = await supabaseServer
      .from('hr_attendance')
      .update({
        check_out_time: new Date().toISOString()
      })
      .eq('employee_id', employeeId)
      .eq('date', dateStr)
      .select()
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json(data || { success: true });
  } catch (err: any) {
    console.error('PATCH /api/hr/attendance error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}
