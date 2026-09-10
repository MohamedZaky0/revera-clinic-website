import { describe, it, expect } from 'vitest';
import { getRoleSlug, getRoleDisplayName, isPortalRoleMatch } from '@/lib/roleUtils';

describe('roleUtils - Portal Isolation and Role Mapping', () => {
  describe('getRoleSlug', () => {
    it('normalizes role variations', () => {
      expect(getRoleSlug('Receptionist')).toBe('reception');
      expect(getRoleSlug('reception')).toBe('reception');
      expect(getRoleSlug('Doctor')).toBe('doctor');
      expect(getRoleSlug('doctors')).toBe('doctor');
      expect(getRoleSlug('Super Admin')).toBe('superadmin');
      expect(getRoleSlug('superadmin')).toBe('superadmin');
      expect(getRoleSlug('Admin')).toBe('admin');
      expect(getRoleSlug('administrator')).toBe('admin');
      expect(getRoleSlug('HR')).toBe('hr');
      expect(getRoleSlug(null)).toBe('admin');
      expect(getRoleSlug(undefined)).toBe('admin');
    });
  });

  describe('isPortalRoleMatch', () => {
    it('/admin portal accepts ONLY admin and superadmin accounts', () => {
      // /admin portal (explicit portalRole='admin' or omitted/undefined)
      expect(isPortalRoleMatch('admin', 'admin')).toBe(true);
      expect(isPortalRoleMatch('admin', undefined)).toBe(true);
      expect(isPortalRoleMatch('superadmin', 'admin')).toBe(true);
      expect(isPortalRoleMatch('superadmin', undefined)).toBe(true);

      // Other roles are rejected at /admin
      expect(isPortalRoleMatch('receptionist', 'admin')).toBe(false);
      expect(isPortalRoleMatch('receptionist', undefined)).toBe(false);
      expect(isPortalRoleMatch('reception', 'admin')).toBe(false);
      expect(isPortalRoleMatch('doctor', 'admin')).toBe(false);
      expect(isPortalRoleMatch('doctor', undefined)).toBe(false);
      expect(isPortalRoleMatch('hr', 'admin')).toBe(false);
    });

    it('/reception portal accepts receptionist/reception and superadmin accounts', () => {
      expect(isPortalRoleMatch('receptionist', 'reception')).toBe(true);
      expect(isPortalRoleMatch('reception', 'reception')).toBe(true);
      expect(isPortalRoleMatch('superadmin', 'reception')).toBe(true);

      expect(isPortalRoleMatch('admin', 'reception')).toBe(false);
      expect(isPortalRoleMatch('doctor', 'reception')).toBe(false);
    });

    it('/doctor portal accepts doctor and superadmin accounts', () => {
      expect(isPortalRoleMatch('doctor', 'doctor')).toBe(true);
      expect(isPortalRoleMatch('physician', 'doctor')).toBe(true);
      expect(isPortalRoleMatch('superadmin', 'doctor')).toBe(true);

      expect(isPortalRoleMatch('admin', 'doctor')).toBe(false);
      expect(isPortalRoleMatch('receptionist', 'doctor')).toBe(false);
    });

    it('/superadmin portal accepts ONLY superadmin accounts', () => {
      expect(isPortalRoleMatch('superadmin', 'superadmin')).toBe(true);

      expect(isPortalRoleMatch('admin', 'superadmin')).toBe(false);
      expect(isPortalRoleMatch('receptionist', 'superadmin')).toBe(false);
      expect(isPortalRoleMatch('doctor', 'superadmin')).toBe(false);
    });
  });
});
