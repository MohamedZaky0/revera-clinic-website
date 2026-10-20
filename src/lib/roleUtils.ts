/**
 * Utility functions for role mapping and URL routing in the clinic admin.
 */

/**
 * Normalizes an employee role name into a clean, URL-friendly slug.
 *
 * Rules:
 * - "Receptionist" / "reception" -> "reception"
 * - "Doctor" / "doctors" -> "doctor"
 * - "Super Admin" / "superadmin" / "super_admin" -> "superadmin"
 * - "Admin" / "admin" -> "admin"
 * - "HR" / "Human Resources" -> "hr"
 * - Other custom roles -> sanitized lowercase kebab-case slug
 */
export type RoleWorkspace = 'standard' | 'doctor';

export function normalizeWorkspace(value: unknown): RoleWorkspace {
  return value === 'doctor' ? 'doctor' : 'standard';
}

/**
 * `workspace` is the role's explicit setting (DEC-113). A role whose workspace is 'doctor' always
 * lives under /doctor, whatever it is called, so a clinic can name its doctor role "Consultant"
 * and still get the doctor screens.
 */
export function getRoleSlug(roleName: string | null | undefined, workspace?: string | null): string {
  if (workspace === 'doctor') return 'doctor';
  if (!roleName) return 'admin';
  const clean = roleName.trim().toLowerCase();
  if (clean === 'receptionist' || clean === 'reception') return 'reception';
  if (clean === 'doctor' || clean === 'doctors' || clean === 'physician') return 'doctor';
  if (clean === 'super admin' || clean === 'superadmin' || clean === 'super_admin') return 'superadmin';
  if (clean === 'admin' || clean === 'administrator') return 'admin';
  if (clean === 'hr' || clean === 'human resources') return 'hr';
  return clean.replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '');
}

export function getRoleDisplayName(roleSlugOrName: string | null | undefined, workspace?: string | null): string {
  if (!roleSlugOrName) return 'Staff';
  const slug = getRoleSlug(roleSlugOrName, workspace);
  if (slug === 'reception') return 'Reception';
  if (slug === 'doctor') return 'Doctor';
  if (slug === 'superadmin') return 'Super Admin';
  if (slug === 'admin') return 'Admin';
  if (slug === 'hr') return 'HR';
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function isPortalRoleMatch(
  userRole: string | null | undefined,
  portalRole: string | null | undefined,
  workspace?: string | null,
): boolean {
  const targetPortal = portalRole || 'admin';
  const userSlug = getRoleSlug(userRole, workspace);
  const portalSlug = getRoleSlug(targetPortal);
  if (userSlug === 'superadmin') return true;
  return userSlug === portalSlug;
}
