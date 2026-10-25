import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { requireAdministratorAccess, requireAuthenticatedUser, requireStaffAccess, requireSuperadminAccess, type StaffAccess } from '@/lib/access';
import { isOwnIdentity, normalizeEgyptMobile } from '@/lib/customerIdentity';
import { recordWalletMovement, setAbsoluteWalletBalance } from '@/lib/wallet';
import { UUID_REGEX, countPatientHistory, derivedPhoneFragment, describeBlockers, hasBlockingHistory } from '@/lib/customerDeletion';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * This route has two legitimate caller populations: staff (reception/admin, full access)
 * and patients (self-lookup / self-registration during OTP login — AuthModal.tsx,
 * profile/page.tsx). There is no patient login separate from Supabase Auth, so a patient
 * caller here is "authenticated but not staff", not "unauthenticated" — a blanket
 * requireStaffAccess check would 403 every patient. See RISK-018 / FINANCE_TRACKER 0.10.
 */
export type Caller =
  | { kind: 'staff'; access: StaffAccess }
  | { kind: 'patient'; user: { id: string; email?: string | null; phone?: string | null } }
  | { kind: 'unauthenticated'; error: string; status: 401 | 403 | 500 };

/** Exported so other patient-and-staff-facing routes (e.g. /api/reservations GET) reuse this
 *  exact classification instead of re-implementing the staff-then-patient fallback. */
export async function classifyCaller(req: Request): Promise<Caller> {
  const staffResult = await requireStaffAccess(req);
  if (!('error' in staffResult)) return { kind: 'staff', access: staffResult.access };
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
      if (mobile) {
        const cleanMobile = normalizeEgyptMobile(mobile);
        const mobileVariants = Array.from(new Set([
          mobile.trim(),
          cleanMobile,
          cleanMobile ? '+20' + cleanMobile.replace(/^0/, '') : '',
          cleanMobile ? '20' + cleanMobile.replace(/^0/, '') : '',
          cleanMobile ? '0020' + cleanMobile.replace(/^0/, '') : ''
        ])).filter(Boolean);
        query = query.in('mobile', mobileVariants);
      } else {
        query = query.eq('email', email!);
      }
      const { data: rows, error } = await query.limit(1);
      if (error) throw error;
      const data = rows && rows.length > 0 ? rows[0] : null;

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
    return NextResponse.json(rows || [], {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });
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
    date_of_birth,
    national_id,
    address,
    referral,
    occupation
  } = body;

  if (!name || !mobile) {
    return NextResponse.json({ error: 'Name and Mobile number are required' }, { status: 400 });
  }

  let cleanDob: string | null = null;
  if (date_of_birth) {
    const parsed = /^\d{4}-\d{2}-\d{2}$/.test(date_of_birth) ? new Date(`${date_of_birth}T00:00:00Z`) : null;
    if (!parsed || Number.isNaN(parsed.getTime()) || parsed.getTime() > Date.now()) {
      return NextResponse.json({ error: 'Date of birth must be a valid date, not in the future' }, { status: 400 });
    }
    cleanDob = date_of_birth;
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

  const cleanEmail = (email && typeof email === 'string' && email.trim()) ? email.trim().toLowerCase() : null;

  if (cleanEmail) {
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
    email: cleanEmail,
    active: active ?? true,
    area: area || null,
    location_name: location_name || null,
    street_name: street_name || null,
    building_no: building_no || null,
    floor_no: floor_no || null,
    note: note || null,
    // A real date_of_birth supersedes the legacy free-entry age snapshot (DEC-041) — once one
    // exists, age is always derived from it (never re-stored as a stale integer).
    age: cleanDob ? null : (age ? Number(age) : null),
    date_of_birth: cleanDob,
    national_id: national_id || null,
    address: address || null,
    referral: referral || null,
    occupation: occupation || null,
    updated_at: new Date().toISOString()
  };

  const isStaff = caller.kind === 'staff';
  const isSuperadmin = isStaff && caller.access?.role === 'superadmin';
  const staffWalletValue = Number(wallet_balance || 0);

  if (caller.kind === 'patient') {
    // Financial fields are never patient-writable, regardless of what the request body
    // contains — a patient must not be able to set their own wallet_balance or erase
    // outstanding debt by POSTing arbitrary values. Keep whatever is already stored.
    customerData.auth_user_id = caller.user.id;
  } else if (id) {
    // Editing existing customer: Only superadmins are allowed to directly override financial metrics.
    // Standard staff edits (e.g. updating phone/notes) preserve existing financial balances.
    if (isSuperadmin) {
      if (spent_amount !== undefined) customerData.spent_amount = Number(spent_amount || 0);
      if (outstanding !== undefined) customerData.outstanding = Number(outstanding || 0);
    }
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

      // Write a wallet_txns ledger row when superadmin adjusts wallet_balance on an existing customer
      if (isSuperadmin && wallet_balance !== undefined) {
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
  // Soft (deactivate) and hard (permanent) delete are both superadmin-only — an `admin` caller
  // would otherwise pass requireAdministratorAccess and be able to permanently remove a patient
  // record, contradicting the documented "superadmin can choose" boundary.
  const access = await requireSuperadminAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const mode = searchParams.get('mode') || 'hard';

    if (!id) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }

    // The Patients list also shows "patients" that exist only because a booking carries their name
    // and phone (id `res-cust-<phone>`). There is no customers row behind those, so there is nothing
    // to delete or deactivate: the entry goes away when its bookings do (DEC-128 / RISK-133).
    if (!UUID_REGEX.test(id)) {
      const fragment = derivedPhoneFragment(id);
      if (!fragment) {
        return NextResponse.json(
          { error: 'This entry has no patient record and no phone number to trace its bookings by. Find its bookings in the Bookings screen and delete them there.' },
          { status: 400 }
        );
      }
      const { data: orphanBookings, error: orphanErr } = await supabaseServer
        .from('reservations')
        .select('id')
        .is('customer_id', null)
        .ilike('phone', `%${fragment}`);
      if (orphanErr) throw orphanErr;
      const bookings = Array.isArray(orphanBookings) ? orphanBookings.length : 0;
      if (bookings === 0) {
        return NextResponse.json({ error: 'This patient no longer exists. Refresh the list.' }, { status: 404 });
      }
      return NextResponse.json(
        {
          error:
            `This patient has no patient record. It only appears in the list because of ${bookings} ${bookings === 1 ? 'booking' : 'bookings'} ` +
            `that carry this name and phone number, so there is nothing to ${mode === 'soft' ? 'deactivate' : 'delete'} here. ` +
            `Delete or cancel ${bookings === 1 ? 'that booking' : 'those bookings'} from the Bookings screen and the entry disappears.`,
          code: 'PATIENT_IS_BOOKING_DERIVED',
          blockers: { bookings },
        },
        { status: 409 }
      );
    }

    if (mode === 'soft') {
      const { data: updated, error: softErr } = await supabaseServer
        .from('customers')
        .update({ active: false })
        .eq('id', id)
        .select()
        .maybeSingle();

      if (softErr) throw softErr;
      if (!updated) {
        return NextResponse.json({ error: 'Patient not found. Refresh the list.' }, { status: 404 });
      }
      return NextResponse.json({ message: 'Customer soft-deleted (deactivated) successfully', data: updated });
    }

    // 1. The patient must exist, otherwise "deleted successfully" would be a lie.
    const { data: customer, error: fetchError } = await supabaseServer
      .from('customers')
      .select('email, mobile, auth_user_id')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!customer) {
      return NextResponse.json({ error: 'Patient not found. Refresh the list.' }, { status: 404 });
    }

    // 2. Refuse while any history hangs off the patient. Postgres would not: it un-links bookings
    //    and payments and wipes the rest, and the un-linked bookings rebuild the patient in the list.
    const blockers = await countPatientHistory(id);
    if (hasBlockingHistory(blockers)) {
      return NextResponse.json(
        {
          error:
            `This patient cannot be permanently deleted: they have ${describeBlockers(blockers)}. ` +
            'Permanent delete is only for a patient with no bookings, payments, packages, wallet or medical history. ' +
            'Use Soft Delete (Deactivate) to hide the patient and keep that history.',
          code: 'PATIENT_HAS_HISTORY',
          blockers,
        },
        { status: 409 }
      );
    }

    // 3. Delete the row and check that a row was really removed.
    const { data: removed, error: deleteError } = await supabaseServer
      .from('customers')
      .delete()
      .eq('id', id)
      .select('id');

    if (deleteError) {
      if ((deleteError as any).code === '23503') {
        return NextResponse.json(
          { error: 'This patient is still referenced by other records and cannot be permanently deleted. Use Soft Delete (Deactivate) instead.', code: 'PATIENT_HAS_HISTORY' },
          { status: 409 }
        );
      }
      throw deleteError;
    }
    if (!Array.isArray(removed) || removed.length === 0) {
      return NextResponse.json(
        { error: 'The patient could not be deleted: the database removed no rows. Nothing was changed.' },
        { status: 500 }
      );
    }

    // 4. Only now remove the patient's login, so a refused or failed delete never costs them access.
    //    Best effort: the patient row is already gone and a leftover login does no harm.
    try {
      let authUserId: string | null = customer.auth_user_id || null;
      if (!authUserId) {
        const { data: { users }, error: listError } = await supabaseServer.auth.admin.listUsers({
          perPage: 1000
        });
        if (!listError && users) {
          const match = users.find((u: any) =>
            (customer.email && u.email?.toLowerCase() === customer.email.toLowerCase()) ||
            (customer.mobile && u.phone === customer.mobile) ||
            (customer.mobile && u.phone === `+20${customer.mobile.startsWith('0') ? customer.mobile.slice(1) : customer.mobile}`)
          );
          authUserId = match?.id || null;
        }
      }

      if (authUserId) {
        // Never remove a staff login, whatever the phone or email matching found.
        const { data: staffRow } = await supabaseServer
          .from('employee_accounts')
          .select('id')
          .eq('auth_user_id', authUserId)
          .maybeSingle();
        if (staffRow) {
          console.warn(`DELETE /api/customers: not removing auth user ${authUserId}, it belongs to a staff account`);
        } else {
          const { error: deleteAuthError } = await supabaseServer.auth.admin.deleteUser(authUserId);
          if (deleteAuthError) {
            console.error(`Failed to delete auth user ${authUserId}:`, deleteAuthError);
          }
        }
      }
    } catch (authErr) {
      console.error('Error looking up/deleting auth user:', authErr);
    }

    return NextResponse.json({ message: 'Customer permanently deleted successfully' });
  } catch (err: any) {
    console.error('DELETE /api/customers error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}
