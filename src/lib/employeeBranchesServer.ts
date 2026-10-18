import { supabaseServer } from '@/lib/supabaseServer';
import { getEmployeeBranchIds } from '@/lib/employeeBranches';

/**
 * DEC-110: every branch an employee is assigned to, primary (`branch_id`) first.
 *
 * Reads `branch_ids` in its own query rather than adding it to the caller's column list on purpose:
 * the callers (attendance check-in, shift start) are on the critical path of a working day, and a
 * database that has not had the `branch_ids` migration applied yet would make their original
 * `select('id, branch_id, ...')` fail outright. Here a failed read degrades to the single primary
 * branch -- i.e. exactly the pre-multi-branch behaviour.
 */
export async function loadEmployeeBranchIds(
  employeeId: string,
  primaryBranchId: string | null | undefined
): Promise<string[]> {
  let stored: unknown = [];
  try {
    const { data, error } = await supabaseServer
      .from('employee_accounts')
      .select('branch_ids')
      .eq('id', employeeId)
      .maybeSingle();
    if (!error) stored = data?.branch_ids;
  } catch {
    // fall through to the primary branch only
  }
  return getEmployeeBranchIds({ branch_id: primaryBranchId ?? null, branch_ids: stored });
}
