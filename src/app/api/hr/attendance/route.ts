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
