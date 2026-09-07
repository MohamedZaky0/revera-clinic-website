/**
 * Unit tests for hasGranularPermission — RISK-078 / RISK-081 CORRUPT-A10.
 *
 * Mirrors (for the categories it covers) the client-side hasPermission() fallback chains in
 * admin/page.tsx, so a role granted the coarse category — every pre-existing role — keeps working
 * exactly as it did under the old requireStaffAccess-only (any staff) guard, while a role missing
 * both the granular key and the coarse category is now actually rejected server-side, not just
 * hidden from in the UI.
 */
import { describe, it, expect } from 'vitest';
import { hasGranularPermission, type StaffAccess } from '@/lib/access';

function access(role: string, permissions: string[] = []): StaffAccess {
  return { user: { id: 'u1' }, employee: { id: 'e1' }, role, permissions };
}

describe('hasGranularPermission', () => {
  it('superadmin bypasses every check regardless of permissions', () => {
    expect(hasGranularPermission(access('superadmin', []), 'providers.delete')).toBe(true);
  });

  it('a plain "admin" role with no matching permission is rejected — no automatic bypass', () => {
    expect(hasGranularPermission(access('admin', []), 'providers.delete')).toBe(false);
  });

  it('an exact granular permission string matches', () => {
    expect(hasGranularPermission(access('receptionist', ['providers.delete']), 'providers.delete')).toBe(true);
  });

  describe('providers', () => {
    it('coarse "Providers" grants every providers.* action', () => {
      const a = access('custom-role', ['Providers']);
      expect(hasGranularPermission(a, 'providers.create')).toBe(true);
      expect(hasGranularPermission(a, 'providers.edit')).toBe(true);
      expect(hasGranularPermission(a, 'providers.delete')).toBe(true);
    });

    it('legacy "Doctors" label also grants providers.* (pre-granular-rollout roles)', () => {
      expect(hasGranularPermission(access('custom-role', ['Doctors']), 'providers.edit')).toBe(true);
    });

    it('"providers.edit" also satisfies the 3-dots action_edit / action_change_status keys', () => {
      const a = access('custom-role', ['providers.edit']);
      expect(hasGranularPermission(a, 'providers.action_edit')).toBe(true);
      expect(hasGranularPermission(a, 'providers.action_change_status')).toBe(true);
      expect(hasGranularPermission(a, 'providers.delete')).toBe(false);
    });

    it('edit permission alone does not grant delete', () => {
      expect(hasGranularPermission(access('custom-role', ['providers.edit']), 'providers.delete')).toBe(false);
    });
  });

  describe('services', () => {
    it('coarse "Services" grants create/edit/delete', () => {
      const a = access('custom-role', ['Services']);
      expect(hasGranularPermission(a, 'services.create')).toBe(true);
      expect(hasGranularPermission(a, 'services.delete')).toBe(true);
    });

    it('"services.create_edit_delete" (legacy coarse action) grants both edit and delete', () => {
      const a = access('custom-role', ['services.create_edit_delete']);
      expect(hasGranularPermission(a, 'services.edit')).toBe(true);
      expect(hasGranularPermission(a, 'services.delete')).toBe(true);
    });

    it('create-only permission does not grant delete', () => {
      expect(hasGranularPermission(access('custom-role', ['services.create']), 'services.delete')).toBe(false);
    });
  });

  describe('inventory', () => {
    it('coarse "Inventory" grants product and device management', () => {
      const a = access('custom-role', ['Inventory']);
      expect(hasGranularPermission(a, 'inventory.create_product')).toBe(true);
      expect(hasGranularPermission(a, 'inventory.manage_devices')).toBe(true);
    });

    it('"inventory.manage_products" grants create/edit/adjust/delete product sub-actions', () => {
      const a = access('custom-role', ['inventory.manage_products']);
      expect(hasGranularPermission(a, 'inventory.create_product')).toBe(true);
      expect(hasGranularPermission(a, 'inventory.edit_product')).toBe(true);
      expect(hasGranularPermission(a, 'inventory.adjust_stock')).toBe(true);
      expect(hasGranularPermission(a, 'inventory.delete_product')).toBe(true);
    });

    it('"inventory.manage_devices" grants the device 3-dots sub-actions', () => {
      const a = access('custom-role', ['inventory.manage_devices']);
      expect(hasGranularPermission(a, 'inventory.action_update_pulses')).toBe(true);
      expect(hasGranularPermission(a, 'inventory.action_reset_counter')).toBe(true);
      expect(hasGranularPermission(a, 'inventory.action_edit_device')).toBe(true);
      expect(hasGranularPermission(a, 'inventory.action_delete_device')).toBe(true);
    });

    it('device permission does not leak into product permission', () => {
      expect(hasGranularPermission(access('custom-role', ['inventory.manage_devices']), 'inventory.create_product')).toBe(false);
    });
  });

  describe('customers', () => {
    it('coarse "Customers" or "Patients" grants customers.* actions', () => {
      expect(hasGranularPermission(access('custom-role', ['Customers']), 'customers.edit')).toBe(true);
      expect(hasGranularPermission(access('custom-role', ['Patients']), 'customers.edit')).toBe(true);
    });
  });

  it('an unrelated category permission does not leak across categories', () => {
    expect(hasGranularPermission(access('custom-role', ['Bookings']), 'providers.delete')).toBe(false);
  });
});
