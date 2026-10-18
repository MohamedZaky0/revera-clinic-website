/**
 * Employee <-> branch assignment helpers (DEC-110).
 *
 * An employee can work at more than one branch. The data model is deliberately additive:
 *
 *   - `employee_accounts.branch_id`   stays the employee's PRIMARY (default) branch. Every consumer that
 *                                     predates multi-branch keeps reading this column and keeps working.
 *   - `employee_accounts.branch_ids`  uuid[] holding ALL assigned branches, primary first.
 *
 * `branch_ids[0]` and `branch_id` are written together by `/api/employees`, but nothing in the database
 * forces them to agree (other code paths still write `branch_id` on its own), so readers must go through
 * `getEmployeeBranchIds()` rather than trusting either column in isolation.
 *
 * Pure functions only -- no Supabase import -- so the same module is used by the API route, server
 * consumers, and client components.
 */

export interface BranchLike {
  id: string;
  status?: string | null;
}

/** A branch can be handed out as a NEW assignment only while it is `active`. */
export function isActiveBranch(branch: BranchLike | null | undefined): boolean {
  return !!branch && branch.status === 'active';
}

/**
 * The employee's assigned branch ids, primary first, de-duplicated, empty strings removed.
 *
 * - `branch_id` is always first when set, even if `branch_ids` is empty or stale (a legacy row, or a
 *   write that only touched `branch_id`).
 * - The rest follow in `branch_ids` order.
 * - An employee with neither column set returns `[]`.
 */
export function getEmployeeBranchIds(
  emp: { branch_id?: string | null; branch_ids?: unknown } | null | undefined
): string[] {
  if (!emp) return [];
  const out: string[] = [];
  const push = (v: unknown) => {
    if (typeof v !== 'string') return;
    const id = v.trim();
    if (id && !out.includes(id)) out.push(id);
  };
  push(emp.branch_id);
  if (Array.isArray(emp.branch_ids)) emp.branch_ids.forEach(push);
  return out;
}

export type BranchSelectionResult =
  | { ok: true; ids: string[]; primary: string }
  | { ok: false; error: string };

/**
 * Resolve what the caller asked for into an ordered id list, without touching the database.
 *
 * Accepts the new `branchIds` array, or the legacy single `branchId` (treated as `[branchId]`).
 * Returns `null` when the request mentions neither (so a PATCH that only edits a phone number, or the
 * Role Management "provision" POST that has never sent a branch, is left alone).
 * `branchIds` wins when both are present; the first entry is the primary branch.
 */
export function readRequestedBranchIds(body: {
  branchIds?: unknown;
  branchId?: unknown;
}): { requested: false } | { requested: true; raw: unknown[] } {
  if (body.branchIds !== undefined) {
    if (!Array.isArray(body.branchIds)) return { requested: true, raw: [] };
    return { requested: true, raw: body.branchIds };
  }
  if (body.branchId !== undefined) {
    return { requested: true, raw: body.branchId ? [body.branchId] : [] };
  }
  return { requested: false };
}

/**
 * Validate a requested assignment against the real `branches` rows.
 *
 * Rules:
 *  - at least one branch;
 *  - every id is a non-empty string, and no id appears twice;
 *  - every id exists;
 *  - every id that is NOT already assigned to this employee (`alreadyAssigned`) must be `active`.
 *    An employee keeps an assignment to a branch that has since been deactivated, so editing their
 *    phone number or adding a second branch never forces them off it -- but nobody can be newly
 *    assigned to an inactive branch.
 */
export function validateBranchSelection(
  raw: unknown[],
  branchRows: BranchLike[],
  alreadyAssigned: string[] = []
): BranchSelectionResult {
  if (raw.length === 0) {
    return { ok: false, error: 'At least one branch is required.' };
  }

  const ids: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'string' || !entry.trim()) {
      return { ok: false, error: 'Branch ids must be non-empty strings.' };
    }
    const id = entry.trim();
    if (ids.includes(id)) {
      return { ok: false, error: `Branch '${id}' was selected more than once.` };
    }
    ids.push(id);
  }

  const byId = new Map(branchRows.map((b) => [String(b.id), b]));
  for (const id of ids) {
    const row = byId.get(id);
    if (!row) {
      return { ok: false, error: `Branch '${id}' does not exist.` };
    }
    if (!isActiveBranch(row) && !alreadyAssigned.includes(id)) {
      return { ok: false, error: `Branch '${id}' is inactive and cannot be newly assigned.` };
    }
  }

  return { ok: true, ids, primary: ids[0] };
}

// ---------------------------------------------------------------------------------------------
// Form helpers (Add / Edit Employee). Kept here, as pure functions, so the rules the checkbox list
// follows are unit-tested rather than living only inside a 3,500-line component.
// ---------------------------------------------------------------------------------------------

/**
 * The branches the Add/Edit Employee picker offers: every ACTIVE branch, plus any inactive branch the
 * employee is already assigned to (`originalIds`) so that assignment stays visible -- and removable --
 * instead of silently vanishing from the form. An inactive branch the employee is not on is never offered.
 */
export function branchesOfferedFor<T extends BranchLike>(branches: T[], originalIds: string[] = []): T[] {
  return branches.filter((b) => isActiveBranch(b) || originalIds.includes(b.id));
}

/** Tick / untick one branch. Ticking appends (so the first ticked branch stays the primary). */
export function toggleBranchSelection(selected: string[], id: string): string[] {
  return selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
}

/** Move one already-selected branch to the front, making it the primary branch. */
export function makePrimaryBranch(selected: string[], id: string): string[] {
  if (!selected.includes(id)) return selected;
  return [id, ...selected.filter((x) => x !== id)];
}

/**
 * The branches to pre-tick when editing an existing employee.
 *
 * Starts from the employee's own assignment (primary first). Doctors created before DEC-110 kept their
 * extra branches only inside the provider's `working_days_hours.branch_ids`; for an employee with at
 * most one stored branch those extras are merged in, so opening and re-saving a legacy multi-branch
 * doctor does not quietly drop a branch from their booking availability. Provider-only branches that
 * are now inactive are left out (they could not be re-assigned), and ids that no longer exist at all are
 * discarded.
 */
export function resolveEditBranchSelection(
  emp: { branch_id?: string | null; branch_ids?: unknown } | null | undefined,
  branches: BranchLike[],
  providerBranchIds: string[] = []
): string[] {
  const own = getEmployeeBranchIds(emp);
  let ids = own;
  if (own.length <= 1) {
    const extras = providerBranchIds.filter((id) => {
      if (own.includes(id)) return false;
      const row = branches.find((b) => b.id === id);
      return isActiveBranch(row);
    });
    ids = [...own, ...extras];
  }
  return ids.filter((id) => branches.some((b) => b.id === id));
}

/** Human-readable list of an employee's branches, primary first, for tables and cards. */
export function formatEmployeeBranchNames(
  emp: { branch_id?: string | null; branch_ids?: unknown } | null | undefined,
  branches: Array<{ id: string; name_en?: string; name_ar?: string }>,
  lang: 'en' | 'ar' = 'en'
): string {
  const names = getEmployeeBranchIds(emp)
    .map((id) => {
      const b = branches.find((x) => x.id === id);
      if (!b) return '';
      return (lang === 'ar' ? b.name_ar || b.name_en : b.name_en || b.name_ar) || '';
    })
    .filter(Boolean);
  return names.join(lang === 'ar' ? '، ' : ', ');
}
