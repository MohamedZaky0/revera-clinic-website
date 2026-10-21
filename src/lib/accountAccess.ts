import { supabaseServer } from '@/lib/supabaseServer';
import { AUTH_BAN_DURATION } from '@/lib/accountActivation';

/**
 * Server-side effects of switching an employee account Inactive / Active (DEC-117, DEC-118).
 * The pure rules about who may do it live in accountActivation.ts.
 */

/** Switch the matching Supabase Auth user on or off. Returns false when it could not be done. */
export async function setAuthUserBanned(authUserId: string | null | undefined, banned: boolean): Promise<boolean> {
  if (!authUserId) return true;
  try {
    const { error } = await supabaseServer.auth.admin.updateUserById(authUserId, {
      ban_duration: banned ? AUTH_BAN_DURATION : 'none',
    } as any);
    if (error) {
      console.warn('Could not update the auth ban for an employee account:', error.message);
      return false;
    }
    return true;
  } catch (e: any) {
    console.warn('Could not update the auth ban for an employee account:', e?.message || e);
    return false;
  }
}

function likeEscape(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export type ProviderSyncResult = 'updated' | 'none' | 'ambiguous';

/**
 * A doctor whose account is Inactive must not be bookable: turn the matching `providers` row off
 * (and back on with the account). Booking pickers, the availability API and the public booking
 * already hide providers with `active = false`, so doing it once here covers all of them.
 *
 * providers and employee_accounts are linked only by name / phone (no foreign key), so the match
 * follows the same policy as the rest of the app: a unique name match, narrowed by phone when
 * several share the name; and when it is still not one person, nothing is changed.
 */
export async function setProviderActiveForEmployee(
  employee: { name?: string | null; phone?: string | null },
  active: boolean,
): Promise<ProviderSyncResult> {
  try {
    let id: string | null = null;

    if (employee.name) {
      const { data: byName } = await supabaseServer
        .from('providers')
        .select('id, name, phone')
        .ilike('name', likeEscape(employee.name.trim()));
      const rows = byName || [];
      if (rows.length === 1) {
        id = rows[0].id;
      } else if (rows.length > 1) {
        const byPhone = employee.phone ? rows.filter((r: any) => r.phone && r.phone === employee.phone) : [];
        if (byPhone.length === 1) id = byPhone[0].id;
        else return 'ambiguous';
      }
    }

    if (!id && employee.phone) {
      const { data: byPhone } = await supabaseServer
        .from('providers')
        .select('id')
        .eq('phone', employee.phone);
      if (byPhone && byPhone.length === 1) id = byPhone[0].id;
      else if (byPhone && byPhone.length > 1) return 'ambiguous';
    }

    if (!id) return 'none';

    const { error } = await supabaseServer.from('providers').update({ active }).eq('id', id);
    if (error) {
      console.warn('Could not sync the provider status with the employee account:', error.message);
      return 'none';
    }
    return 'updated';
  } catch (e: any) {
    console.warn('Could not sync the provider status with the employee account:', e?.message || e);
    return 'none';
  }
}

/**
 * The reverse link, used when a doctor is soft-deleted from the Doctors screen: switch the matching
 * employee account Inactive (role and records kept). Only done for a single unambiguous match; the
 * old code overwrote role_name for EVERY employee sharing the name.
 */
export async function deactivateEmployeeForProvider(provider: { name?: string | null; phone?: string | null }): Promise<boolean> {
  try {
    if (!provider.name) return false;
    const { data: rows } = await supabaseServer
      .from('employee_accounts')
      .select('id, name, phone, employee_id, role_name, auth_user_id')
      .ilike('name', likeEscape(provider.name.trim()));
    let matches = rows || [];
    if (matches.length > 1 && provider.phone) matches = matches.filter((r: any) => r.phone === provider.phone);
    if (matches.length !== 1) return false;
    const target = matches[0];
    // never touch a superadmin account from here
    if (String(target.role_name || '').toLowerCase().replace(/[\s_-]+/g, '') === 'superadmin' || target.employee_id === 'superadmin') return false;
    const { error } = await supabaseServer.from('employee_accounts').update({ is_active: false }).eq('id', target.id);
    if (error) return false;
    await setAuthUserBanned(target.auth_user_id, true);
    return true;
  } catch (e: any) {
    console.warn('Could not deactivate the employee account of a deactivated doctor:', e?.message || e);
    return false;
  }
}
