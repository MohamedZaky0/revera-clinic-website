import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function GET() {
  try {
    const { data: employees, error } = await supabaseServer
      .from('employee_accounts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Fetch auth users using the service_role client to check email_confirmed_at
    const { data: authData, error: authError } = await supabaseServer.auth.admin.listUsers();
    
    let confirmedMap = new Map<string, string | null>();
    if (!authError && authData?.users) {
      authData.users.forEach((u: any) => {
        if (u.id) {
          confirmedMap.set(u.id, u.email_confirmed_at || u.confirmed_at || null);
        }
      });
    } else if (authError) {
      console.warn("Failed to fetch auth users list for confirmation check:", authError.message);
    }

    const enrichedEmployees = (employees || []).map((emp: any) => ({
      ...emp,
      email_confirmed_at: emp.auth_user_id ? confirmedMap.get(emp.auth_user_id) : null
    }));

    return NextResponse.json(enrichedEmployees);
  } catch (err: any) {
    console.error('GET /api/employees error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, name, roleName, phone, department, shift, salary, nationalId, nationalIdFront, nationalIdBack, address, branchId } = body;

    if (!email || !name || !roleName) {
      return NextResponse.json(
        { error: 'Full name, email address, and role are all required.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName  = name.trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

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

    const { data: customerCheck, error: custCheckError } = await supabaseServer
      .from('customers')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (custCheckError) throw custCheckError;
    if (customerCheck) {
      return NextResponse.json(
        { error: `This email is already registered as a customer account and cannot be added as an employee.` },
        { status: 400 }
      );
    }

    const requestUrl = new URL(req.url);
    const siteUrl = requestUrl.origin;
    console.log('Sending invitation to:', cleanEmail, 'with redirectTo:', `${siteUrl}/auth/callback?next=/auth/setup`);
    const { data: inviteData, error: inviteError } = await supabaseServer.auth.admin.inviteUserByEmail(
      cleanEmail,
      {
        redirectTo: `${siteUrl}/auth/callback?next=/auth/setup`,
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

    const { data: newEmployee, error: insertError } = await supabaseServer
      .from('employee_accounts')
      .insert({
        auth_user_id: authUserId,
        employee_id: cleanEmail,
        email: cleanEmail,
        name: cleanName,
        role_name: roleName,
        phone: phone || null,
        department: department || 'Reception',
        shift: shift || 'Day',
        salary: salary ? Number(salary) : 0,
        national_id: nationalId || null,
        national_id_front: nationalIdFront || null,
        national_id_back: nationalIdBack || null,
        address: address || null,
        branch_id: branchId || null,
      })
      .select()
      .single();

    if (insertError) {
      await supabaseServer.auth.admin.deleteUser(authUserId);
      throw insertError;
    }

    return NextResponse.json(newEmployee, { status: 201 });
  } catch (err: any) {
    console.error('POST /api/employees error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, roleName, name, phone, department, shift, salary, nationalId, nationalIdFront, nationalIdBack, address, branchId, resendInvite } = body;

    if (!id) {
      return NextResponse.json({ error: 'Employee ID is required.' }, { status: 400 });
    }

    const { data: employee, error: fetchError } = await supabaseServer
      .from('employee_accounts')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!employee) {
      return NextResponse.json({ error: 'Employee account not found.' }, { status: 404 });
    }

    if (!resendInvite && (roleName || name !== undefined || phone !== undefined || department !== undefined || shift !== undefined || salary !== undefined || nationalId !== undefined || nationalIdFront !== undefined || nationalIdBack !== undefined || address !== undefined || branchId !== undefined)) {
      const updates: Record<string, any> = {};
      if (roleName) {
        if (employee.employee_id === 'superadmin') {
          return NextResponse.json({ error: 'Cannot modify the role of the system owner account.' }, { status: 400 });
        }
        const { data: roleExists, error: roleCheckError } = await supabaseServer
          .from('roles')
          .select('name')
          .eq('name', roleName)
          .maybeSingle();

        if (roleCheckError) throw roleCheckError;
        if (!roleExists) {
          return NextResponse.json({ error: `Role '${roleName}' does not exist.` }, { status: 400 });
        }
        updates.role_name = roleName;
      }

      if (name !== undefined) updates.name = name;
      if (phone !== undefined) updates.phone = phone;
      if (department !== undefined) updates.department = department;
      if (shift !== undefined) updates.shift = shift;
      if (salary !== undefined) updates.salary = Number(salary);
      if (nationalId !== undefined) updates.national_id = nationalId;
      if (nationalIdFront !== undefined) updates.national_id_front = nationalIdFront;
      if (nationalIdBack !== undefined) updates.national_id_back = nationalIdBack;
      if (address !== undefined) updates.address = address;
      if (branchId !== undefined) updates.branch_id = branchId || null;

      const { data: updatedEmp, error: updateError } = await supabaseServer
        .from('employee_accounts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      if (roleName && employee.auth_user_id) {
        await supabaseServer.auth.admin.updateUserById(
          employee.auth_user_id,
          { user_metadata: { role: roleName } }
        ).catch((err: any) => {
          console.warn("Failed to update user auth metadata role:", err);
        });
      }

      return NextResponse.json(updatedEmp);
    }

    // 2. Resend invitation to an employee whose invite expired (fallback if roleName not provided)
    const requestUrl = new URL(req.url);
    const siteUrl = requestUrl.origin;

    if (employee.auth_user_id) {
      await supabaseServer.auth.admin.deleteUser(employee.auth_user_id).catch(() => {});
    }

    const { data: inviteData, error: inviteError } = await supabaseServer.auth.admin.inviteUserByEmail(
      employee.email,
      {
        redirectTo: `${siteUrl}/auth/callback?next=/auth/setup`,
        data: {
          full_name: employee.name,
          role: employee.role_name,
        },
      }
    );

    if (inviteError) throw inviteError;

    const newAuthUserId = inviteData.user?.id;
    if (newAuthUserId) {
      await supabaseServer
        .from('employee_accounts')
        .update({ auth_user_id: newAuthUserId })
        .eq('id', id);
    }

    return NextResponse.json({ message: 'Invitation re-sent successfully.' });
  } catch (err: any) {
    console.error('PATCH /api/employees error:', err);
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

    if (employee.auth_user_id) {
      const { error: deleteAuthError } = await supabaseServer.auth.admin.deleteUser(employee.auth_user_id);
      if (deleteAuthError) {
        console.warn('Failed to delete auth user, proceeding with database record removal:', deleteAuthError.message);
      }
    }

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
