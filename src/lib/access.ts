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

export async function requireAdministratorAccess(req: Request): Promise<AccessResult> {
  const result = await requireStaffAccess(req);
  if ("error" in result) return result;
  if (result.access.role !== "superadmin" && result.access.role !== "admin") {
    return { error: "Administrator access is required.", status: 403 };
  }
  return result;
}
