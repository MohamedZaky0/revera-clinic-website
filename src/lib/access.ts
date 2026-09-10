import { supabaseServer } from "@/lib/supabaseServer";

export type StaffAccess = {
  user: { id: string; email?: string | null };
  employee: { id: string; employee_id?: string | null; email?: string | null; role_name?: string | null };
  role: string;
  permissions: string[];
};

export type AccessResult =
  | { access: StaffAccess }
  | { error: string; status: 401 | 403 | 500 };

export type AuthenticatedUserResult =
  | { user: { id: string; email?: string | null; phone?: string | null } }
  | { error: string; status: 401 | 500 };

export async function requireAuthenticatedUser(req: Request): Promise<AuthenticatedUserResult> {
  try {
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "").trim();
    if (!token) return { error: "Authentication is required.", status: 401 };

    const { data: authData, error: authError } = await supabaseServer.auth.getUser(token);
    if (authError || !authData.user) return { error: "Invalid or expired session.", status: 401 };

    return { user: authData.user };
  } catch (error) {
    console.error("Authentication verification failed:", error);
    return { error: "Unable to verify authentication.", status: 500 };
  }
}

export async function requireStaffAccess(req: Request): Promise<AccessResult> {
  try {
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "").trim();
    if (!token) return { error: "Authentication is required.", status: 401 };

    const { data: authData, error: authError } = await supabaseServer.auth.getUser(token);
    if (authError || !authData.user) return { error: "Invalid or expired session.", status: 401 };

    const { data: employee, error: employeeError } = await supabaseServer
      .from("employee_accounts")
      .select("id, employee_id, email, role_name")
      .eq("auth_user_id", authData.user.id)
      .maybeSingle();

    if (employeeError) throw employeeError;
    if (!employee) return { error: "Staff access is required.", status: 403 };

    const role = employee.role_name?.toLowerCase() || "";
    const { data: roleRecord, error: roleError } = await supabaseServer
      .from("roles")
      .select("permissions")
      .eq("name", employee.role_name)
      .maybeSingle();

    if (roleError) throw roleError;

    return {
      access: {
        user: authData.user,
        employee,
        role,
        permissions: Array.isArray(roleRecord?.permissions) ? roleRecord.permissions : [],
      },
    };
  } catch (error) {
    console.error("Staff access verification failed:", error);
    return { error: "Unable to verify staff access.", status: 500 };
  }
}

export function hasStaffPermission(access: StaffAccess, permission: string) {
  return access.role === "superadmin" || access.role === "admin" || access.permissions.includes(permission);
}

export function hasFinancePermission(access: StaffAccess, permission: string) {
  return access.role === "superadmin" || access.permissions.includes(permission);
}

/**
 * RISK-078 / RISK-081 CORRUPT-A10: the granular action-level permissions configured in
 * Role Management (src/components/admin/settings/RoleManagementView.tsx) were UI-only — every
 * mutating route for providers/services/inventory/customers-products checked only
 * `requireStaffAccess` (any authenticated employee, zero permission check), so unchecking e.g.
 * "Delete Doctor" for a role never stopped that role's own token from calling the API directly.
 *
 * Mirrors the coarse-category and create/edit/delete fallback chains from admin/page.tsx's
 * client-side `hasPermission()` for the categories covered by this fix (providers, services,
 * inventory) so a role granted the coarse category (as every pre-existing role is) keeps working
 * exactly as it did under `requireStaffAccess`, while a role missing both the granular key and the
 * coarse category is now actually rejected — not just hidden from in the UI.
 *
 * Deliberately superadmin-only bypass (like `hasFinancePermission`, unlike `hasStaffPermission`'s
 * automatic `admin` bypass): the whole point of the granular matrix is that `admin` is a role like
 * any other role in this system, checked against its own `permissions` array.
 */
export function hasGranularPermission(access: StaffAccess, permKey: string): boolean {
  if (access.role === "superadmin") return true;
  const perms = access.permissions;
  if (perms.includes(permKey)) return true;

  const category = permKey.split(".")[0];
  const coarseMap: Record<string, string[]> = {
    providers: ["Providers", "providers", "Doctors", "doctors"],
    services: ["Services", "services"],
    inventory: ["Inventory", "inventory"],
    customers: ["Customers", "customers", "Patients", "patients"],
  };
  const coarseKeys = coarseMap[category];
  if (coarseKeys && coarseKeys.some((k) => perms.includes(k))) return true;

  if (category === "providers") {
    if (
      ["providers.create", "providers.edit", "providers.action_edit", "providers.action_change_status", "providers.manage_schedule", "providers.commissions"].includes(permKey) &&
      (perms.includes("providers.create_edit") || perms.includes("providers.edit"))
    ) return true;
    if ((permKey === "providers.delete" || permKey === "providers.action_delete") && perms.includes("providers.delete")) return true;
  }

  if (category === "services") {
    if (
      ["services.create", "services.create_category", "services.edit", "services.edit_category", "services.action_edit", "services.action_toggle_status"].includes(permKey) &&
      (perms.includes("services.create_edit_delete") || perms.includes("services.edit") || perms.includes("services.create"))
    ) return true;
    if (
      ["services.delete", "services.delete_category", "services.action_delete"].includes(permKey) &&
      (perms.includes("services.create_edit_delete") || perms.includes("services.delete"))
    ) return true;
  }

  if (category === "inventory") {
    if (
      ["inventory.action_update_pulses", "inventory.action_reset_counter", "inventory.action_edit_device", "inventory.action_delete_device"].includes(permKey) &&
      perms.includes("inventory.manage_devices")
    ) return true;
    if (
      ["inventory.create_product", "inventory.edit_product", "inventory.adjust_stock", "inventory.delete_product"].includes(permKey) &&
      perms.includes("inventory.manage_products")
    ) return true;
    if (permKey === "inventory.manage_orders" && perms.includes("inventory.manage_suppliers")) return true;
  }

  return false;
}

export async function requireAdministratorAccess(req: Request): Promise<AccessResult> {
  const result = await requireStaffAccess(req);
  if ("error" in result) return result;
  if (result.access.role !== "superadmin" && result.access.role !== "admin") {
    return { error: "Administrator access is required.", status: 403 };
  }
  return result;
}

/**
 * Superadmin-only, no `admin` equivalence — unlike `requireAdministratorAccess`. Reserved for
 * permanent, irreversible destructive actions (hard-deleting a customer/provider/employee record)
 * where the soft-delete alternative exists precisely so routine account management doesn't need
 * this power. Added because the DELETE handlers for `customers`/`providers`/`employees` had grown
 * a `mode=soft|hard` split (see PRODUCT_RULES.md) that was documented as "superadmin can choose
 * between archiving and permanent removal" but was actually reachable by any `admin`
 * (`customers`/`employees`, via `requireAdministratorAccess`) or by any role granted the
 * `providers.delete` permission (`providers`, via `hasGranularPermission`) — the UI/docs claim and
 * the server's actual boundary had drifted apart, same shape as RISK-078.
 */
export async function requireSuperadminAccess(req: Request): Promise<AccessResult> {
  const result = await requireStaffAccess(req);
  if ("error" in result) return result;
  if (result.access.role !== "superadmin") {
    return { error: "Superadmin access is required for this action.", status: 403 };
  }
  return result;
}
