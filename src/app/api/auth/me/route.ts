import { NextResponse } from 'next/server';
import { isAuthRetryableFetchError } from '@supabase/supabase-js';
import { supabaseServer } from '@/lib/supabaseServer';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) {
      return NextResponse.json({ error: 'No authorization token provided' }, { status: 401 });
    }

    // Verify token and fetch auth user
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token);

    // RISK-113: a transient failure reaching Supabase's own auth server (network blip, brief
    // outage) used to be treated identically to "this token is genuinely invalid" - both returned
    // 401, and the client (admin/page.tsx, DEC-102) signs the staff member out and redirects to
    // /login on any 401/403. This call runs again on every background token refresh (roughly
    // hourly), not just at login, so a single bad moment on a flaky connection forced a real,
    // working session to log out. Supabase's SDK already tells apart "couldn't verify right now"
    // from "verified as invalid": isAuthRetryableFetchError() is true only for the former. Answer
    // with 503, not 401 - the client's existing non-401/403 branch already preserves the session
    // and the next scheduled refresh re-checks, exactly as it already does for a plain 500.
    if (authError && isAuthRetryableFetchError(authError)) {
      return NextResponse.json(
        { error: 'Could not verify the session right now. Please try again.' },
        { status: 503 }
      );
    }

    if (authError || !user) {
      return NextResponse.json({ error: authError?.message || 'Invalid or expired session' }, { status: 401 });
    }

    const email = user.email || '';

    // 1. Query employee_accounts table for the role mapping
    let { data: employee, error: empError } = await supabaseServer
      .from('employee_accounts')
      .select('*')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (empError) throw empError;

    // Fallback: Check by email if auth_user_id was not linked yet
    if (!employee && email) {
      const userEmail = email.trim().toLowerCase();
      const { data: empByEmail, error: empEmailError } = await supabaseServer
        .from('employee_accounts')
        .select('*')
        .ilike('email', userEmail)
        .maybeSingle();

      if (empEmailError) throw empEmailError;
      if (empByEmail) {
        employee = empByEmail;
        // Auto-link auth_user_id if null/unlinked
        if (!empByEmail.auth_user_id) {
          await supabaseServer
            .from('employee_accounts')
            .update({ auth_user_id: user.id })
            .eq('id', empByEmail.id);
        }
      }
    }

    if (!employee) {
      // Check if this email is registered as a customer
      if (email) {
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
      }

      return NextResponse.json({ error: 'Unauthorized: No employee profile linked to this user.' }, { status: 403 });
    }

    const rawRole = (employee.role_name || '').toLowerCase().trim();
    const cleanRole = rawRole.replace(/[\s_-]+/g, '');
    const normalizedRole = cleanRole === 'superadmin' ? 'superadmin' : (cleanRole === 'admin' ? 'admin' : employee.role_name);

    // 2. Query roles table to get permissions
    const { data: role, error: roleError } = await supabaseServer
      .from('roles')
      .select('permissions')
      .ilike('name', employee.role_name || '')
      .maybeSingle();

    if (roleError) throw roleError;

    return NextResponse.json({
      id: employee.id,
      role: normalizedRole,
      department: employee.department,
      permissions: Array.isArray(role?.permissions) ? role.permissions : [],
      email: employee.email || email,
      employeeId: employee.employee_id
    });
  } catch (err: any) {
    console.error('GET /api/auth/me error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
