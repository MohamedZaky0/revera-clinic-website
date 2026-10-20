/**
 * Who may switch an employee account Inactive / Active, or delete it (DEC-117).
 *
 * The caller has already passed requireAdministratorAccess (admin or superadmin). These rules decide
 * which accounts that caller may touch:
 *   - superadmin accounts are never touched through this path (they are hidden from the Employees
 *     screen and have every permission without being listed);
 *   - nobody deactivates or deletes their own account. Because the caller is always an active
 *     admin-tier account, this alone also guarantees the clinic is never left without one: whoever
 *     removes an admin is a different, still-active admin or superadmin.
 */

export type AccountAction = 'activate' | 'deactivate' | 'delete';

export interface ActionCaller {
  /** employee_accounts.id of the person making the request */
  employeeId: string | null | undefined;
}

export interface ActionTarget {
  id: string;
  role_name?: string | null;
  employee_id?: string | null;
}

export type ActionCheck = { ok: true } | { ok: false; status: number; error: string };

function normRole(role: string | null | undefined): string {
  return String(role || '').toLowerCase().trim().replace(/[\s_-]+/g, '');
}

export function isSuperadminAccount(target: ActionTarget): boolean {
  return normRole(target.role_name) === 'superadmin' || target.employee_id === 'superadmin';
}

export function checkAccountAction(caller: ActionCaller, target: ActionTarget, action: AccountAction): ActionCheck {
  if (isSuperadminAccount(target)) {
    return { ok: false, status: 403, error: 'Superadmin accounts cannot be changed from here.' };
  }
  if (action !== 'activate' && caller.employeeId && caller.employeeId === target.id) {
    return {
      ok: false,
      status: 400,
      error: action === 'delete' ? 'You cannot delete your own account.' : 'You cannot deactivate your own account.',
    };
  }
  return { ok: true };
}

/** Supabase Auth ban durations: a long ban is how an Auth user is switched off, 'none' lifts it. */
export const AUTH_BAN_DURATION = '876000h';
