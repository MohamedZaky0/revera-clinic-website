import { supabaseServer } from '@/lib/supabaseServer';

/**
 * DEC-113: whether an employee is a doctor is a property of their role (`roles.workspace`), not of
 * their department label or of the letters "doc" appearing in a name. These helpers are the server
 * side of that rule.
 */

/** Lower-cased names of every role whose workspace is 'doctor'. */
export async function getDoctorRoleNames(): Promise<Set<string>> {
  const { data, error } = await supabaseServer
    .from('roles')
    .select('name')
    .eq('workspace', 'doctor');
  if (error) throw error;
  return new Set((data || []).map((r: any) => String(r.name || '').trim().toLowerCase()).filter(Boolean));
}

/**
 * DEC-114: an employee is a doctor when their role has the doctor workspace OR the account is
 * flagged `is_also_doctor` (an admin who also treats patients keeps the admin role).
 */
export async function isDoctorEmployee(roleName: string | null | undefined, isAlsoDoctor: unknown): Promise<boolean> {
  if (isAlsoDoctor === true) return true;
  return isDoctorRole(roleName);
}

/** True when `roleName` (any casing) is a doctor-workspace role. */
export async function isDoctorRole(roleName: string | null | undefined): Promise<boolean> {
  const clean = String(roleName || '').trim().toLowerCase();
  if (!clean) return false;
  return (await getDoctorRoleNames()).has(clean);
}
