import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { CLIENT } from '@/config/client';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) {
      return NextResponse.json({ error: 'No authorization token provided' }, { status: 401 });
    }

    // Verify token and fetch auth user
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: authError?.message || 'Invalid or expired session' }, { status: 401 });
    }

    const email = user.email || '';

    // Verify this email is not registered as a customer
    const { data: customerCheck, error: custCheckError } = await supabaseServer
      .from('customers')
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (custCheckError) throw custCheckError;
    if (customerCheck) {
      return NextResponse.json(
        { error: 'This email is registered as a customer and cannot be used for administrator access.' },
        { status: 403 }
      );
    }

    // 1. Check if user is the superadmin bypass
    if (email.toLowerCase() === CLIENT.superadminEmail.toLowerCase()) {
      return NextResponse.json({
        role: 'superadmin',
        permissions: ['Bookings', 'Customers', 'Providers', 'Services', 'Settings'],
        email,
        employeeId: 'superadmin'
      });
    }

    // 2. Query employee_accounts table for the role mapping
    const { data: employee, error: empError } = await supabaseServer
      .from('employee_accounts')
      .select('*')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (empError) throw empError;

    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized: No employee profile linked to this user.' }, { status: 403 });
    }

    // 3. Query roles table to get permissions
    const { data: role, error: roleError } = await supabaseServer
      .from('roles')
      .select('permissions')
      .eq('name', employee.role_name)
      .maybeSingle();

    if (roleError) throw roleError;

    return NextResponse.json({
      id: employee.id,
      role: employee.role_name,
      permissions: role?.permissions || [],
      email: employee.email,
      employeeId: employee.employee_id
    });
  } catch (err: any) {
    console.error('GET /api/auth/me error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
