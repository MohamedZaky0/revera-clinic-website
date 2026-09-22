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

    const employeeLookup = await supabaseServer
      .from("employee_accounts")
      .select("id, employee_id, email, role_name, auth_user_id")
      .eq("auth_user_id", authData.user.id)
      .maybeSingle();
    let employee = employeeLookup.data;
    const employeeError = employeeLookup.error;

    if (employeeError) throw employeeError;

    // Fallback: Check by email if auth_user_id was not linked yet
    if (!employee && authData.user.email) {
      const userEmail = authData.user.email.trim().toLowerCase();
      const { data: empByEmail, error: empEmailError } = await supabaseServer
        .from("employee_accounts")
        .select("id, employee_id, email, role_name, auth_user_id")
        .ilike("email", userEmail)
        .maybeSingle();

      if (empEmailError) throw empEmailError;
      if (empByEmail) {
        employee = empByEmail;
        // Auto-link auth_user_id if null/unlinked
        if (!empByEmail.auth_user_id) {
          await supabaseServer
            .from("employee_accounts")
            .update({ auth_user_id: authData.user.id })
            .eq("id", empByEmail.id);
        }
      }
    }

    if (!employee) return { error: "Staff access is required.", status: 403 };

    const rawRole = (employee.role_name || "").toLowerCase().trim();
    const cleanRole = rawRole.replace(/[\s_-]+/g, "");
    const normalizedRole = (cleanRole === "superadmin" || rawRole.includes("super"))
      ? "superadmin"
      : (cleanRole === "admin" ? "admin" : rawRole);

    const { data: roleRecord, error: roleError } = await supabaseServer
      .from("roles")
      .select("permissions")
      .ilike("name", employee.role_name || "")
      .maybeSingle();

    if (roleError) throw roleError;

    return {
      access: {
        user: authData.user,
        employee,
        role: normalizedRole,
        permissions: Array.isArray(roleRecord?.permissions) ? roleRecord.permissions : [],
      },
    };
  } catch (error) {
    console.error("Staff access verification failed:", error);
    return { error: "Unable to verify staff access.", status: 500 };
  }
}

export function hasStaffPermission(access: StaffAccess, permission: string) {
  const normRole = (access.role || "").toLowerCase().trim().replace(/[\s_-]+/g, "");
  return normRole === "superadmin" || normRole.includes("super") || normRole === "admin" || access.permissions.includes(permission);
}

export function hasFinancePermission(access: StaffAccess, permission: string) {
  const normRole = (access.role || "").toLowerCase().trim().replace(/[\s_-]+/g, "");
  return normRole === "superadmin" || normRole.includes("super") || access.permissions.includes(permission);
}

/**
 * RISK-078 / RISK-081 CORRUPT-A10: the granular action-level permissions configured in
 * Role Management (src/components/admin/settings/RoleManagementView.tsx).
 */
export function hasGranularPermission(access: StaffAccess, permKey: string): boolean {
  const normRole = (access.role || "").toLowerCase().trim().replace(/[\s_-]+/g, "");
  if (normRole === "superadmin" || normRole.includes("super")) return true;
  const perms = access.permissions || [];
  if (perms.includes("*") || perms.includes(permKey)) return true;

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
      (perms.includes("providers.create_edit") || perms.includes("providers.edit") || perms.includes("providers.create"))
    ) return true;
    if ((permKey === "providers.delete" || permKey === "providers.action_delete") && perms.includes("providers.delete")) return true;
  }

  if (category === "services") {
    if (
      ["services.create", "services.create_category", "services.edit", "services.edit_category", "services.action_edit", "services.action_toggle_status"].includes(permKey) &&
      (perms.includes("services.create_edit_delete") || perms.includes("services.edit") || perms.includes("services.create") || perms.includes("services.manage"))
    ) return true;
    if (
      ["services.delete", "services.delete_category", "services.action_delete"].includes(permKey) &&
      (perms.includes("services.create_edit_delete") || perms.includes("services.delete") || perms.includes("services.manage"))
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
