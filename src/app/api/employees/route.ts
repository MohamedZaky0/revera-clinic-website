import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function GET() {
  try {
    const { data: employees, error } = await supabaseServer
      .from('employee_accounts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(employees || []);
  } catch (err: any) {
    console.error('GET /api/employees error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, name, roleName } = body;

    // ── Validate inputs ──────────────────────────────────────────────────────
    if (!email || !name || !roleName) {
      return NextResponse.json(
        { error: 'Full name, email address, and role are all required.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName  = name.trim();

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    // ── Verify role exists ───────────────────────────────────────────────────
    const { data: roleData, error: roleError } = await supabaseServer
      .from('roles')
      .select('name')
      .eq('name', roleName)
      .maybeSingle();

    if (roleError) throw roleError;
    if (!roleData) {
      return NextResponse.json(
        { error: `Role '${roleName}' does not exist. Please create it first.` },
        { status: 400 }
      );
    }

    // ── Prevent duplicate email ──────────────────────────────────────────────
    const { data: existingEmp, error: existError } = await supabaseServer
      .from('employee_accounts')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (existError) throw existError;
    if (existingEmp) {
      return NextResponse.json(
        { error: `An account with the email '${cleanEmail}' already exists.` },
        { status: 400 }
      );
    }

    // ── Send Supabase invitation email ───────────────────────────────────────
    // The invited user receives an official link to set their own password.
    const { data: inviteData, error: inviteError } = await supabaseServer.auth.admin.inviteUserByEmail(
      cleanEmail,
      {
        data: {
          full_name: cleanName,
          role: roleName,
        },
      }
    );

    if (inviteError) throw inviteError;

    const authUserId = inviteData.user?.id;
    if (!authUserId) {
      throw new Error('Failed to retrieve user ID from invitation.');
    }

    // ── Insert record into employee_accounts ─────────────────────────────────
    const { data: newEmployee, error: insertError } = await supabaseServer
      .from('employee_accounts')
      .insert({
        auth_user_id: authUserId,
        employee_id: cleanEmail,   // use real email as the unique identifier
        email: cleanEmail,
        name: cleanName,
        role_name: roleName,
      })
      .select()
      .single();

    if (insertError) {
      // Rollback: delete the auth user so they aren't orphaned
      await supabaseServer.auth.admin.deleteUser(authUserId);
      throw insertError;
    }

    return NextResponse.json(newEmployee, { status: 201 });
  } catch (err: any) {
    console.error('POST /api/employees error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Employee account ID is required' }, { status: 400 });
    }

    // 1. Fetch employee to get auth_user_id
    const { data: employee, error: fetchError } = await supabaseServer
      .from('employee_accounts')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!employee) {
      return NextResponse.json({ error: 'Employee account not found' }, { status: 404 });
    }

    if (employee.employee_id === 'superadmin') {
      return NextResponse.json({ error: 'Cannot delete superadmin account' }, { status: 400 });
    }

    // 2. Delete from Supabase Auth
    if (employee.auth_user_id) {
      const { error: deleteAuthError } = await supabaseServer.auth.admin.deleteUser(employee.auth_user_id);
      if (deleteAuthError) {
        console.warn('Failed to delete auth user, proceeding with database record removal:', deleteAuthError.message);
      }
    }

    // 3. Delete from database table
    const { error: deleteDbError } = await supabaseServer
      .from('employee_accounts')
      .delete()
      .eq('id', id);

    if (deleteDbError) throw deleteDbError;

    return NextResponse.json({ message: 'Employee account deleted successfully' });
  } catch (err: any) {
    console.error('DELETE /api/employees error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}
