import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { verifyHrAccess } from '@/lib/auth';

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
  // Allow any employee session to log their missing state
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
