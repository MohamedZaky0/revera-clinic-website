import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { verifyAccessToken } from '@/lib/verifyToken';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) {
      return NextResponse.json({ error: 'No authorization token provided' }, { status: 401 });
    }

    // RISK-134: verified locally (or from a short cache) instead of one Auth-server call per request.
    const verified = await verifyAccessToken(token, supabaseServer);

    // RISK-113: a transient failure reaching Supabase's own auth server (network blip, brief
    // outage) used to be treated identically to "this token is genuinely invalid" - both returned
    // 401, and the client (admin/page.tsx, DEC-102) signs the staff member out and redirects to
    // /login on any 401/403. This call runs again on every background token refresh (roughly
    // hourly), not just at login, so a single bad moment on a flaky connection forced a real,
    // working session to log out. Supabase's SDK already tells apart "couldn't verify right now"
    // from "verified as invalid": verifyAccessToken() reports reason 'unavailable' (built on
    // isAuthRetryableFetchError) only for the former. Answer with 503, not 401 - the client's
    // existing non-401/403 branch already preserves the session and the next scheduled refresh
    // re-checks, exactly as it already does for a plain 500.
    if (!verified.ok && verified.reason === 'unavailable') {
      return NextResponse.json(
        { error: 'Could not verify the session right now. Please try again.' },
        { status: 503 }
      );
    }

    if (!verified.ok) {
      return NextResponse.json({ error: verified.message || 'Invalid or expired session' }, { status: 401 });
    }
    const user = verified.user;

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

    // DEC-117: an inactive account is refused here too (the client signs the person out with a clear
    // reason), not only on the data endpoints.
    if (employee.is_active === false) {
      return NextResponse.json(
        { error: 'This account is inactive. Contact an administrator.', code: 'account_inactive' },
        { status: 403 }
      );
    }

    const rawRole = (employee.role_name || '').toLowerCase().trim();
    const cleanRole = rawRole.replace(/[\s_-]+/g, '');
    const normalizedRole = cleanRole === 'superadmin' ? 'superadmin' : (cleanRole === 'admin' ? 'admin' : employee.role_name);

    // 2. Query roles table to get permissions
    const { data: role, error: roleError } = await supabaseServer
      .from('roles')
      .select('permissions, workspace')
      .ilike('name', employee.role_name || '')
      .maybeSingle();

    if (roleError) throw roleError;

    return NextResponse.json({
      id: employee.id,
      role: normalizedRole,
      department: employee.department,
      // DEC-113: the role's explicit workspace; the client no longer infers the doctor view from names.
      workspace: role?.workspace === 'doctor' ? 'doctor' : 'standard',
      // DEC-114: this person also treats patients, so the Doctor view switch is offered to them.
      isAlsoDoctor: employee.is_also_doctor === true,
      permissions: Array.isArray(role?.permissions) ? role.permissions : [],
      email: employee.email || email,
      employeeId: employee.employee_id
    });
  } catch (err: any) {
    console.error('GET /api/auth/me error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
