/**
 * Utility functions for role mapping and URL routing in Revera Admin.
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
export function getRoleSlug(roleName: string | null | undefined): string {
  if (!roleName) return 'admin';
  const clean = roleName.trim().toLowerCase();
  if (clean === 'receptionist' || clean === 'reception') return 'reception';
  if (clean === 'doctor' || clean === 'doctors' || clean === 'physician') return 'doctor';
  if (clean === 'super admin' || clean === 'superadmin' || clean === 'super_admin') return 'superadmin';
  if (clean === 'admin' || clean === 'administrator') return 'admin';
  if (clean === 'hr' || clean === 'human resources') return 'hr';
  return clean.replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '');
}

export function getRoleDisplayName(roleSlugOrName: string | null | undefined): string {
  if (!roleSlugOrName) return 'Staff';
  const slug = getRoleSlug(roleSlugOrName);
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

export function isPortalRoleMatch(userRole: string | null | undefined, portalRole: string | null | undefined): boolean {
  if (!portalRole) return true;
  const userSlug = getRoleSlug(userRole);
  const portalSlug = getRoleSlug(portalRole);
  if (!portalSlug) return true;
  if (userSlug === 'superadmin') return true;
  return userSlug === portalSlug;
}
