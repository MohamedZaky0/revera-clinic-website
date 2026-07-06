import { supabaseServer } from './supabaseServer';

export async function verifyHrAccess(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) {
      return { error: 'No authorization token provided', status: 401 };
    }

    // Verify token and fetch auth user
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token);

    if (authError || !user) {
      return { error: authError?.message || 'Invalid session', status: 401 };
    }

    const email = user.email || '';

    // 1. Superadmin bypass
    if (email.toLowerCase() === 'superadmin@revera.com') {
      return { isAuthorized: true, role: 'superadmin', user };
    }

    // 2. Fetch employee role
    const { data: employee, error: empError } = await supabaseServer
      .from('employee_accounts')
      .select('id, role_name')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (empError || !employee) {
      return { error: 'Unauthorized: Access restricted to registered staff.', status: 403 };
    }

    const role = (employee.role_name || '').toLowerCase();
    if (role === 'admin' || role === 'hr') {
      return { isAuthorized: true, role: employee.role_name, employeeId: employee.id, user };
    }

    return { error: 'Forbidden: Insufficient privileges.', status: 403 };
  } catch (err: any) {
    console.error('HR auth verification failed:', err);
    return { error: 'Internal auth verification error', status: 500 };
  }
}
