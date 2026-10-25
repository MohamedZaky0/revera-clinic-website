import { supabaseServer } from './supabaseServer';
import { verifyAccessToken } from './verifyToken';

export async function verifyHrAccess(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) {
      return { error: 'No authorization token provided', status: 401 };
    }

    // RISK-134: identity is verified locally (or from a short cache), not by an Auth-server call
    // per request. The is_active / role lookups below stay on the database, on every request.
    const verified = await verifyAccessToken(token, supabaseServer);

    if (!verified.ok) {
      return { error: verified.message || 'Invalid session', status: verified.reason === 'unavailable' ? 503 : 401 };
    }
    const user = verified.user;

    // 1. Superadmin bypass
    // Superadmin access is resolved from the registered employee role below.

    // 2. Fetch employee role
    const { data: employee, error: empError } = await supabaseServer
      .from('employee_accounts')
      .select('id, role_name, is_active')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (empError || !employee) {
      return { error: 'Unauthorized: Access restricted to registered staff.', status: 403 };
    }

    if (employee.is_active === false) {
      return { error: 'This account is inactive. Contact an administrator.', status: 403 };
    }

    const role = (employee.role_name || '').toLowerCase();
    if (role === 'superadmin' || role === 'admin' || role === 'hr') {
      return { isAuthorized: true, role: employee.role_name, employeeId: employee.id, user };
    }

    return { error: 'Forbidden: Insufficient privileges.', status: 403 };
  } catch (err: any) {
    console.error('HR auth verification failed:', err);
    return { error: 'Internal auth verification error', status: 500 };
  }
}
