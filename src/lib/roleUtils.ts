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
  if (!roleName) return '';
  const raw = roleName.trim().toLowerCase();
  if (raw === 'receptionist' || raw === 'reception') return 'reception';
  if (raw === 'doctor' || raw === 'doctors') return 'doctor';
  if (
    raw === 'superadmin' ||
    raw === 'super admin' ||
    raw === 'super_admin' ||
    raw === 'super-admin'
  ) {
    return 'superadmin';
  }
  if (raw === 'admin') return 'admin';
  if (raw === 'hr' || raw === 'human resources') return 'hr';
  return raw
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
