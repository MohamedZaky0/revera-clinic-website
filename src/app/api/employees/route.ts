import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { requireAdministratorAccess, requireSuperadminAccess } from '@/lib/access';
import { normalizeServiceCommissions } from '@/lib/providerCommissions';


// Mirrors the rule enforced at /auth/setup (src/app/auth/setup/page.tsx) so an admin-set password
// and a self-set one can never diverge in strength.
const STRONG_PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const PRIVILEGED_ROLES = ['admin', 'superadmin'];

/**
 * RISK-069: an admin may assign and edit any operational role, but only a superadmin may grant the
 * admin/superadmin tier itself.
 *
 * Shared by POST and PATCH deliberately. PATCH carried this check and POST did not, so an admin who
 * could not promote an existing employee could just create a new one at `superadmin` instead --
 * with a password of their choosing, since the account is created already confirmed. The role
 * dropdown hides those two options from non-superadmins, but that is a UI filter, not a guard.
 */
function deniesRoleGrant(callerRole: string, targetRole: unknown): boolean {
  if (typeof targetRole !== 'string' || !targetRole) return false;
  return PRIVILEGED_ROLES.includes(targetRole.trim().toLowerCase()) && callerRole !== 'superadmin';
}

export async function GET(req: Request) {
  const access = await requireAdministratorAccess(req);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });
  try {
    const { data: employees, error } = await supabaseServer
      .from('employee_accounts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Fetch auth users using the service_role client to check email_confirmed_at
    const { data: authData, error: authError } = await supabaseServer.auth.admin.listUsers();
    
    const confirmedMap = new Map<string, string | null>();
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
      requiredTargetAmount: emp.required_target_amount !== null ? Number(emp.required_target_amount) : 0,
      bonusPercentage: emp.bonus_percentage !== null ? Number(emp.bonus_percentage) : 0,
      targetType: emp.target_type || 'reservations',
      bonusType: emp.bonus_type || 'percentage',
      email_confirmed_at: emp.auth_user_id ? confirmedMap.get(emp.auth_user_id) : null
    }));

    return NextResponse.json(enrichedEmployees);
  } catch (err: any) {
    console.error('GET /api/employees error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const access = await requireAdministratorAccess(req);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    const body = await req.json();
    const { email, name, roleName, phone, department, shift, salary, nationalId, nationalIdFront, nationalIdBack, address, branchId, contractFile, contractFileName, requiredTargetAmount, bonusPercentage, targetType, bonusType, password: rawPassword } = body;

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

    if (deniesRoleGrant(access.access.role, roleName)) {
      return NextResponse.json(
        { error: 'Only the superadmin can grant admin or superadmin access.' },
        { status: 403 }
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

    // Two ways to create the auth user:
    //
    //   password given -> create it outright, already confirmed. The account is usable the moment
    //                     this request returns: `email_confirmed_at` is set, so the roster shows
    //                     Active rather than Invited, and the person can sign in with the password
    //                     the admin hands them. They change it themselves later from
    //                     Profile -> Password.
    //   no password    -> the original invite flow: Supabase emails a link, the invitee sets their
    //                     own password at /auth/setup, and only then does the account confirm.
    //
    // The password path exists because the invite path is only as reliable as the project's SMTP.
    // On Supabase's built-in sender, invites to non-team addresses are throttled and quietly fail
    // to arrive, which strands every new hire on Invited with no way to sign in. Reception and
    // doctors are onboarded in person anyway, so requiring a working mailbox is a poor gate.
    let authUserId: string | undefined;

    if (rawPassword) {
      if (typeof rawPassword !== 'string' || !STRONG_PASSWORD_RE.test(rawPassword)) {
        return NextResponse.json(
          {
            error:
              'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a symbol.',
            field: 'password',
          },
          { status: 400 }
        );
      }

      const { data: createdUser, error: createError } = await supabaseServer.auth.admin.createUser({
        email: cleanEmail,
        password: rawPassword,
        email_confirm: true,
        user_metadata: {
          full_name: cleanName,
          role: roleName,
        },
      });

      if (createError) throw createError;
      authUserId = createdUser.user?.id;
      if (!authUserId) {
        throw new Error('Failed to retrieve user ID from the created account.');
      }
    } else {
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

      authUserId = inviteData.user?.id;
      if (!authUserId) {
        throw new Error('Failed to retrieve user ID from invitation.');
      }
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
        contract_file: contractFile || null,
        contract_file_name: contractFileName || null,
        required_target_amount: requiredTargetAmount ? Number(requiredTargetAmount) : 0,
        bonus_percentage: bonusPercentage ? Number(bonusPercentage) : 0,
        target_type: targetType || 'reservations',
        bonus_type: bonusType || 'percentage',
      })
      .select()
      .single();

    if (insertError) {
      await supabaseServer.auth.admin.deleteUser(authUserId);
      throw insertError;
    }

    const mapped = newEmployee ? {
      ...newEmployee,
      requiredTargetAmount: newEmployee.required_target_amount !== null ? Number(newEmployee.required_target_amount) : 0,
      bonusPercentage: newEmployee.bonus_percentage !== null ? Number(newEmployee.bonus_percentage) : 0,
      targetType: newEmployee.target_type || 'reservations',
      bonusType: newEmployee.bonus_type || 'percentage'
    } : null;

    // Sync with providers table if department/role is Doctor.
    //
    // A doctor who exists in employee_accounts but not in providers is invisible to booking and to
    // the schedule, so this step is part of creating the doctor, not a nice-to-have afterwards.
    // It used to be wrapped in a catch that only logged, which meant that failure returned 201 and
    // reception had no way to know the doctor would never appear. It now rolls the whole creation
    // back instead -- see the catch at the end of this block.
    const isDoctor = (department && (department.toLowerCase().includes('doc') || department.toLowerCase() === 'doctors')) || (roleName && roleName.toLowerCase().includes('doc'));
    if (isDoctor) {
      try {
        const providerPayload = {
          name: cleanName,
          services: Array.isArray(body.services) ? body.services : [],
          rating: body.rating ? Number(body.rating) : 5,
          phone: phone || null,
          specialty: body.specialty || null,
          national_id: nationalId || null,
          branch_id: branchId || null,
          fixed_salary: salary ? Number(salary) : 0,
          commission_type: body.commission_type || 'none',
          commission_value: body.commission_value ? Number(body.commission_value) : 0,
          commission_base: body.commission_base || 'gross',
          commission_fixed_component: body.commission_fixed_component ? Number(body.commission_fixed_component) : 0,
          service_commissions: normalizeServiceCommissions(body.service_commissions),
          working_days_hours: body.workingDaysHours || null,
          bookings_count: 0,
          more_count: Math.max(0, (body.services || []).length - 2)
        };

        // Match only on identifiers that belong to one human: national ID first, then phone.
        //
        // The previous matcher was `.or(name.ilike.<name>, phone.eq.<phone>)`, which matched on
        // name. Two doctors called "Ahmed Mohamed" is ordinary in a clinic, and a name hit made
        // this UPDATE the existing provider -- silently overwriting the first doctor's commission
        // config, services, branch and salary with the second one's. It also used `.maybeSingle()`,
        // which throws when more than one row matches; that throw landed in the log-only catch and
        // the request still returned 201.
        //
        // Same rule the codebase already applies to `reservations.provider_id` (RISK-015): refuse
        // to guess when the match is ambiguous, because a wrong link corrupts attribution silently.
        const cleanNationalId = typeof nationalId === 'string' ? nationalId.trim() : '';
        const cleanPhone = typeof phone === 'string' ? phone.trim() : '';

        let existingProviderId: string | null = null;
        for (const [column, value] of [['national_id', cleanNationalId], ['phone', cleanPhone]] as const) {
          if (!value) continue;
          const { data: matches, error: matchError } = await supabaseServer
            .from('providers')
            .select('id')
            .eq(column, value)
            .limit(2);
          if (matchError) throw matchError;
          if (!matches || matches.length === 0) continue;
          if (matches.length > 1) {
            throw new Error(
              `More than one doctor already has ${column} '${value}'. Resolve the duplicate in Doctors before adding this employee.`
            );
          }
          existingProviderId = matches[0].id;
          break;
        }

        if (existingProviderId) {
          const { error: updateError } = await supabaseServer
            .from('providers')
            .update(providerPayload)
            .eq('id', existingProviderId);
          if (updateError) throw updateError;
        } else {
          const { error: providerInsertError } = await supabaseServer
            .from('providers')
            .insert(providerPayload);
          if (providerInsertError) throw providerInsertError;
        }
      } catch (provErr: any) {
        // Roll the whole creation back rather than leaving a doctor who can never be booked.
        // Order matters: remove the employee row first, then the auth user, so a failure partway
        // through cannot leave an employee_accounts row pointing at a deleted auth user.
        await supabaseServer.from('employee_accounts').delete().eq('id', newEmployee.id);
        if (authUserId) await supabaseServer.auth.admin.deleteUser(authUserId);
        console.error('Failed to sync doctor employee to providers table:', provErr);
        return NextResponse.json(
          {
            error:
              provErr?.message ||
              'The employee was created but could not be registered as a doctor, so nothing was saved. Please try again.',
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(mapped, { status: 201 });
  } catch (err: any) {
    console.error('POST /api/employees error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const access = await requireAdministratorAccess(req);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    const body = await req.json();
    const { id, roleName, name, phone, department, shift, salary, nationalId, nationalIdFront, nationalIdBack, address, branchId, contractFile, contractFileName, requiredTargetAmount, bonusPercentage, targetType, bonusType, resendInvite } = body;

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

    if (!resendInvite && (roleName || name !== undefined || phone !== undefined || department !== undefined || shift !== undefined || salary !== undefined || nationalId !== undefined || nationalIdFront !== undefined || nationalIdBack !== undefined || address !== undefined || branchId !== undefined || requiredTargetAmount !== undefined || bonusPercentage !== undefined || targetType !== undefined || bonusType !== undefined)) {
      const updates: Record<string, any> = {};
      if (roleName) {
        if (employee.employee_id === 'superadmin') {
          return NextResponse.json({ error: 'Cannot modify the role of the system owner account.' }, { status: 400 });
        }
        // RISK-069, via the same helper POST uses — see deniesRoleGrant above.
        if (deniesRoleGrant(access.access.role, roleName)) {
          return NextResponse.json({ error: 'Only the superadmin can grant admin or superadmin access.' }, { status: 403 });
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
      if (contractFile !== undefined) updates.contract_file = contractFile;
      if (contractFileName !== undefined) updates.contract_file_name = contractFileName;
      if (requiredTargetAmount !== undefined) updates.required_target_amount = Number(requiredTargetAmount);
      if (bonusPercentage !== undefined) updates.bonus_percentage = Number(bonusPercentage);
      if (targetType !== undefined) updates.target_type = targetType;
      if (bonusType !== undefined) updates.bonus_type = bonusType;

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

      const mapped = updatedEmp ? {
        ...updatedEmp,
        requiredTargetAmount: updatedEmp.required_target_amount !== null ? Number(updatedEmp.required_target_amount) : 0,
        bonusPercentage: updatedEmp.bonus_percentage !== null ? Number(updatedEmp.bonus_percentage) : 0,
        targetType: updatedEmp.target_type || 'reservations',
        bonusType: updatedEmp.bonus_type || 'percentage'
      } : null;

      // Sync updated employee to providers table if department/role is Doctor
      const effectiveDept = department !== undefined ? department : employee.department;
      const effectiveRole = roleName !== undefined ? roleName : employee.role_name;
      const isDoctor = (effectiveDept && (effectiveDept.toLowerCase().includes('doc') || effectiveDept.toLowerCase() === 'doctors')) || (effectiveRole && effectiveRole.toLowerCase().includes('doc'));

      if (isDoctor) {
        try {
          const docName = name !== undefined ? name : employee.name;
          const docPhone = phone !== undefined ? phone : employee.phone;
          const docSalary = salary !== undefined ? salary : employee.salary;
          const docBranchId = branchId !== undefined ? branchId : employee.branch_id;
          const docNationalId = nationalId !== undefined ? nationalId : employee.national_id;

          const { data: existingProvider } = await supabaseServer
            .from('providers')
            .select('id')
            .or(`name.ilike.${docName},phone.eq.${docPhone || 'none'}`)
            .maybeSingle();

          const providerPayload: Record<string, any> = {
            name: docName,
            ...(body.services !== undefined ? { services: body.services } : {}),
            ...(body.specialty !== undefined ? { specialty: body.specialty } : {}),
            ...(body.rating !== undefined ? { rating: Number(body.rating) } : {}),
            ...(body.workingDaysHours !== undefined ? { working_days_hours: body.workingDaysHours } : {}),
            ...(body.commission_type !== undefined ? { commission_type: body.commission_type } : {}),
            ...(body.commission_value !== undefined ? { commission_value: Number(body.commission_value) } : {}),
            ...(body.commission_base !== undefined ? { commission_base: body.commission_base } : {}),
            ...(body.commission_fixed_component !== undefined ? { commission_fixed_component: Number(body.commission_fixed_component) } : {}),
            ...(body.service_commissions !== undefined ? { service_commissions: normalizeServiceCommissions(body.service_commissions) } : {}),
            ...(docPhone !== undefined ? { phone: docPhone } : {}),
            ...(docNationalId !== undefined ? { national_id: docNationalId } : {}),
            ...(docBranchId !== undefined ? { branch_id: docBranchId || null } : {}),
            ...(docSalary !== undefined ? { fixed_salary: Number(docSalary) } : {})
          };

          if (existingProvider) {
            await supabaseServer.from('providers').update(providerPayload).eq('id', existingProvider.id);
          } else {
            await supabaseServer.from('providers').insert({
              name: docName,
              services: body.services || [],
              rating: body.rating ? Number(body.rating) : 5,
              phone: docPhone || null,
              specialty: body.specialty || null,
              national_id: docNationalId || null,
              branch_id: docBranchId || null,
              fixed_salary: docSalary ? Number(docSalary) : 0,
              commission_type: body.commission_type || 'none',
              commission_value: body.commission_value ? Number(body.commission_value) : 0,
              commission_base: body.commission_base || 'gross',
              commission_fixed_component: body.commission_fixed_component ? Number(body.commission_fixed_component) : 0,
              service_commissions: normalizeServiceCommissions(body.service_commissions),
              working_days_hours: body.workingDaysHours || null,
              bookings_count: 0,
              more_count: Math.max(0, (body.services || []).length - 2)
            });
          }
        } catch (provErr) {
          console.error('Failed to sync updated doctor employee to providers table:', provErr);
        }
      }

      return NextResponse.json(mapped);
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
  // Soft (deactivate) and hard (permanent) delete are both superadmin-only — an `admin` caller
  // would otherwise pass requireAdministratorAccess and be able to permanently remove an employee
  // account, contradicting the documented "superadmin can choose" boundary.
  const access = await requireSuperadminAccess(req);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const mode = searchParams.get('mode') || 'hard';

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

    if (mode === 'soft') {
      // Soft delete: deactivate role / mark inactive to revoke operational access while preserving payroll, attendance & historical records
      const { data: updated, error: softErr } = await supabaseServer
        .from('employee_accounts')
        .update({ role_name: 'inactive' })
        .eq('id', id)
        .select()
        .single();

      if (softErr) throw softErr;
      return NextResponse.json({ message: 'Employee account soft-deleted (deactivated) successfully', data: updated });
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

    return NextResponse.json({ message: 'Employee account permanently deleted successfully' });
  } catch (err: any) {
    console.error('DELETE /api/employees error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}
