import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { requireAdministratorAccess, requireAuthenticatedUser, requireStaffAccess } from '@/lib/access';
import { isOwnIdentity } from '@/lib/customerIdentity';
import { recordWalletMovement, setAbsoluteWalletBalance } from '@/lib/wallet';

/**
 * This route has two legitimate caller populations: staff (reception/admin, full access)
 * and patients (self-lookup / self-registration during OTP login — AuthModal.tsx,
 * profile/page.tsx). There is no patient login separate from Supabase Auth, so a patient
 * caller here is "authenticated but not staff", not "unauthenticated" — a blanket
 * requireStaffAccess check would 403 every patient. See RISK-018 / FINANCE_TRACKER 0.10.
 */
export type Caller =
  | { kind: 'staff' }
  | { kind: 'patient'; user: { id: string; email?: string | null; phone?: string | null } }
  | { kind: 'unauthenticated'; error: string; status: 401 | 403 | 500 };

/** Exported so other patient-and-staff-facing routes (e.g. /api/reservations GET) reuse this
 *  exact classification instead of re-implementing the staff-then-patient fallback. */
export async function classifyCaller(req: Request): Promise<Caller> {
  const staffResult = await requireStaffAccess(req);
  if (!('error' in staffResult)) return { kind: 'staff' };
  if (staffResult.status === 401) {
    return { kind: 'unauthenticated', error: staffResult.error, status: staffResult.status };
  }
  // 403 ("Staff access is required") or 500 here still means the bearer token was a
  // valid Supabase session — re-check as a plain authenticated user before rejecting.
  const userResult = await requireAuthenticatedUser(req);
  if ('error' in userResult) {
    return { kind: 'unauthenticated', error: userResult.error, status: userResult.status };
  }
  return { kind: 'patient', user: userResult.user };
}

export async function GET(req: Request) {
  const caller = await classifyCaller(req);
  if (caller.kind === 'unauthenticated') {
    return NextResponse.json({ error: caller.error }, { status: caller.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const mobile = searchParams.get('mobile');
    const email = searchParams.get('email');

    if (caller.kind === 'patient' && !mobile && !email) {
      // The unfiltered branch below returns every customer — never for a patient caller.
      return NextResponse.json({ error: 'Staff access is required.' }, { status: 403 });
    }

    if (mobile || email) {
      let query = supabaseServer.from('customers').select('*');
      query = mobile ? query.eq('mobile', mobile) : query.eq('email', email!);
      const { data, error } = await query.maybeSingle();
      if (error) throw error;

      if (caller.kind === 'patient') {
        if (!isOwnIdentity(caller.user, data)) {
          // A patient guessing another patient's mobile/email must not see their record.
          return NextResponse.json(null);
        }
        if (data && !data.auth_user_id) {
          // Backfill now that ownership is confirmed, so future lookups are exact
          // (auth_user_id) rather than re-derived from phone/email string matching.
          await supabaseServer.from('customers').update({ auth_user_id: caller.user.id }).eq('id', data.id);
        }
      }

      return NextResponse.json(data || null);
    }

    // Optional staff-only autocomplete filters. Both are opt-in, so the existing "return every
    // customer" behaviour every other caller relies on is unchanged when they're absent.
    const search = (searchParams.get('search') || '').trim();
    const limitParam = searchParams.get('limit');

    let listQuery = supabaseServer
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (search) {
      const escaped = search.replace(/[%,()]/g, '');
      if (escaped) {
        listQuery = listQuery.or(`name.ilike.%${escaped}%,mobile.ilike.%${escaped}%`);
      }
    }
    if (limitParam) {
      const parsed = parseInt(limitParam, 10);
      if (!isNaN(parsed) && parsed > 0) listQuery = listQuery.limit(Math.min(parsed, 100));
    }

    const { data: rows, error } = await listQuery;

    if (error) throw error;
    return NextResponse.json(rows || []);
  } catch (err) {
    console.error('GET /api/customers error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const caller = await classifyCaller(req);
  if (caller.kind === 'unauthenticated') {
    return NextResponse.json({ error: caller.error }, { status: caller.status });
  }

  let body: any;
  try {
    body = await req.json();
  } catch (err) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const {
    id,
    name,
    mobile,
    gender,
    email,
    active,
    spent_amount,
    outstanding,
    wallet_balance,
    area,
    location_name,
    street_name,
    building_no,
    floor_no,
    note,
    age,
    national_id,
    address,
    referral,
    occupation
  } = body;

  if (!name || !mobile) {
    return NextResponse.json({ error: 'Name and Mobile number are required' }, { status: 400 });
  }

  let existing: { id: string; auth_user_id: string | null; mobile: string | null; email: string | null } | null = null;
  if (id) {
    const { data, error } = await supabaseServer
      .from('customers')
      .select('id, auth_user_id, mobile, email')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    existing = data;
  }

  if (caller.kind === 'patient') {
    // A patient may only write their own record — by id when editing, or by matching
    // identity when creating. Without this, any authenticated patient could overwrite
    // another patient's profile by passing their id, or register a profile impersonating
    // someone else's phone/email.
    const owns = id ? isOwnIdentity(caller.user, existing) : isOwnIdentity(caller.user, { mobile, email });
    if (!owns) {
      return NextResponse.json(
        { error: 'You may only create or edit your own profile.' },
        { status: 403 }
      );
    }
  }

  if (email) {
    const cleanEmail = email.trim().toLowerCase();
    const { data: employeeCheck, error: empCheckError } = await supabaseServer
      .from('employee_accounts')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (empCheckError) throw empCheckError;
    if (employeeCheck) {
      return NextResponse.json(
        { error: 'This email is registered as an administrator/employee account and cannot be used for a customer profile.' },
        { status: 400 }
      );
    }
  }

  const customerData: Record<string, any> = {
    name,
    mobile,
    gender: gender || null,
    email: email || null,
    active: active ?? true,
    area: area || null,
    location_name: location_name || null,
    street_name: street_name || null,
    building_no: building_no || null,
    floor_no: floor_no || null,
    note: note || null,
    age: age ? Number(age) : null,
    national_id: national_id || null,
    address: address || null,
    referral: referral || null,
    occupation: occupation || null,
    updated_at: new Date().toISOString()
  };

  const staffWalletValue = Number(wallet_balance || 0);

  if (caller.kind === 'patient') {
    // Financial fields are never patient-writable, regardless of what the request body
    // contains — a patient must not be able to set their own wallet_balance or erase
    // outstanding debt by POSTing arbitrary values. Keep whatever is already stored.
    customerData.auth_user_id = caller.user.id;
  } else {
    // Staff path — unchanged from before this endpoint required authentication.
    customerData.spent_amount = Number(spent_amount || 0);
    customerData.outstanding = Number(outstanding || 0);
    // wallet_balance is handled via the ledger helper below, not as a bare scalar write
  }

  try {
    let result;
    if (id) {
      const { data, error } = await supabaseServer
        .from('customers')
        .update(customerData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      result = data;

      // Write a wallet_txns ledger row when staff sets wallet_balance on an existing customer
      if (caller.kind === 'staff') {
        await setAbsoluteWalletBalance({ customerId: id, newBalance: staffWalletValue });
      }
    } else {
      const initialWallet = caller.kind === 'staff' ? staffWalletValue : 0;
      const { data, error } = await supabaseServer
        .from('customers')
        .insert({
          ...customerData,
          spent_amount: caller.kind === 'staff' ? Number(spent_amount || 0) : 0,
          outstanding: caller.kind === 'staff' ? Number(outstanding || 0) : 0,
          wallet_balance: initialWallet,
          registration_date: new Date().toISOString(),
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      result = data;

      // For a brand-new customer with non-zero wallet, write the opening ledger row
      if (caller.kind === 'staff' && initialWallet > 0) {
        await recordWalletMovement({
          customerId: result.id,
          direction: 'in',
          amount: initialWallet,
          reason: 'manual adjustment by staff',
          newBalance: initialWallet,
        });
      }
    }

    return NextResponse.json(result, { status: id ? 200 : 201 });
  } catch (err: any) {
    console.error('POST /api/customers error:', err);
    if (err.code === '23505') {
      const field = err.message?.includes('mobile') ? 'Mobile number' : 'Email address';
      return NextResponse.json({ error: `${field} already exists for another customer.` }, { status: 400 });
    }
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const access = await requireAdministratorAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }

    // 1. Fetch customer email and mobile before deleting them
    const { data: customer, error: fetchError } = await supabaseServer
      .from('customers')
      .select('email, mobile')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (customer) {
      // 2. Lookup and delete from Supabase Auth
      try {
        const { data: { users }, error: listError } = await supabaseServer.auth.admin.listUsers({
          perPage: 1000
        });
        if (!listError && users) {
          const authUser = users.find((u: any) =>
            (customer.email && u.email?.toLowerCase() === customer.email.toLowerCase()) ||
            (customer.mobile && u.phone === customer.mobile) ||
            (customer.mobile && u.phone === `+20${customer.mobile.startsWith('0') ? customer.mobile.slice(1) : customer.mobile}`)
          );

          if (authUser) {
            console.log(`Deleting auth user: ${authUser.id} for email ${authUser.email}`);
            const { error: deleteAuthError } = await supabaseServer.auth.admin.deleteUser(authUser.id);
            if (deleteAuthError) {
              console.error(`Failed to delete auth user ${authUser.id}:`, deleteAuthError);
            }
          }
        }
      } catch (authErr) {
        console.error("Error looking up/deleting auth user:", authErr);
      }
    }

    // 3. Set customer_id to null in all reservations referencing this customer to avoid foreign key violation
    const { error: updateError } = await supabaseServer
      .from('reservations')
      .update({ customer_id: null })
      .eq('customer_id', id);

    if (updateError) throw updateError;

    // 4. Delete the customer
    const { error: deleteError } = await supabaseServer
      .from('customers')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ message: 'Customer deleted successfully' });
  } catch (err: any) {
    console.error('DELETE /api/customers error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}
