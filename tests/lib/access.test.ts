/**
 * Unit tests for hasGranularPermission — RISK-078 / RISK-081 CORRUPT-A10.
 *
 * Mirrors (for the categories it covers) the client-side hasPermission() fallback chains in
 * admin/page.tsx, so a role granted the coarse category — every pre-existing role — keeps working
 * exactly as it did under the old requireStaffAccess-only (any staff) guard, while a role missing
 * both the granular key and the coarse category is now actually rejected server-side, not just
 * hidden from in the UI.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hasGranularPermission, hasStaffPermission, hasFinancePermission, requireStaffAccess, type StaffAccess } from '@/lib/access';
import { createSupabaseFake } from '../helpers/supabaseFake';

const fake = createSupabaseFake();

vi.mock('@/lib/supabaseServer', () => ({
  supabaseServer: {
    auth: { getUser: (...args: any[]) => fake.authGetUser(...args) },
    from: (table: string) => fake.client.from(table),
  },
}));

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

describe('role normalization and exact matching', () => {
  function staffRequest(token: string): Request {
    return new Request('http://localhost:3000/api/test', {
      method: 'GET',
      headers: new Headers({ Authorization: `Bearer ${token}` }),
    });
  }

  beforeEach(() => {
    fake.reset();
  });

  it('role name "Super Admin" normalizes to "superadmin"', async () => {
    fake.authGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    fake.seed('employee_accounts', [{ id: 'emp-1', auth_user_id: 'user-1', role_name: 'Super Admin', email: 'x@test.com' }]);
    fake.seed('roles', [{ name: 'Super Admin', permissions: [] }]);

    const result = await requireStaffAccess(staffRequest('token'));
    expect('access' in result && result.access.role).toBe('superadmin');
  });

  it('role name "super_admin" normalizes to "superadmin"', async () => {
    fake.authGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    fake.seed('employee_accounts', [{ id: 'emp-1', auth_user_id: 'user-1', role_name: 'super_admin', email: 'x@test.com' }]);
    fake.seed('roles', [{ name: 'super_admin', permissions: [] }]);

    const result = await requireStaffAccess(staffRequest('token'));
    expect('access' in result && result.access.role).toBe('superadmin');
  });

  it('role name "SUPER-ADMIN" normalizes to "superadmin"', async () => {
    fake.authGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    fake.seed('employee_accounts', [{ id: 'emp-1', auth_user_id: 'user-1', role_name: 'SUPER-ADMIN', email: 'x@test.com' }]);
    fake.seed('roles', [{ name: 'SUPER-ADMIN', permissions: [] }]);

    const result = await requireStaffAccess(staffRequest('token'));
    expect('access' in result && result.access.role).toBe('superadmin');
  });

  it('role name "Supervisor" is NOT superadmin and has no automatic permissions', async () => {
    fake.authGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    fake.seed('employee_accounts', [{ id: 'emp-1', auth_user_id: 'user-1', role_name: 'Supervisor', email: 'x@test.com' }]);
    fake.seed('roles', [{ name: 'Supervisor', permissions: [] }]);

    const result = await requireStaffAccess(staffRequest('token'));
    expect('access' in result).toBe(true);
    if ('access' in result) {
      expect(result.access.role).toBe('supervisor');
      expect(hasStaffPermission(result.access, 'bookings.view')).toBe(false);
      expect(hasFinancePermission(result.access, 'finance.view_pnl')).toBe(false);
      expect(hasGranularPermission(result.access, 'providers.delete')).toBe(false);
    }
  });

  it('role name "Reception Supervisor" with explicit permission grants that permission only', async () => {
    fake.authGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    fake.seed('employee_accounts', [{ id: 'emp-1', auth_user_id: 'user-1', role_name: 'Reception Supervisor', email: 'x@test.com' }]);
    fake.seed('roles', [{ name: 'Reception Supervisor', permissions: ['finance.view_pnl'] }]);

    const result = await requireStaffAccess(staffRequest('token'));
    expect('access' in result).toBe(true);
    if ('access' in result) {
      expect(hasFinancePermission(result.access, 'finance.view_pnl')).toBe(true);
      expect(hasFinancePermission(result.access, 'finance.manage_expenses')).toBe(false);
    }
  });

  it('role name "Admin" normalizes to "admin"', async () => {
    fake.authGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    fake.seed('employee_accounts', [{ id: 'emp-1', auth_user_id: 'user-1', role_name: 'Admin', email: 'x@test.com' }]);
    fake.seed('roles', [{ name: 'Admin', permissions: [] }]);

    const result = await requireStaffAccess(staffRequest('token'));
    expect('access' in result && result.access.role).toBe('admin');
  });

  it('role name "admin" normalizes to "admin"', async () => {
    fake.authGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    fake.seed('employee_accounts', [{ id: 'emp-1', auth_user_id: 'user-1', role_name: 'admin', email: 'x@test.com' }]);
    fake.seed('roles', [{ name: 'admin', permissions: [] }]);

    const result = await requireStaffAccess(staffRequest('token'));
    expect('access' in result && result.access.role).toBe('admin');
  });

  it('role name "Sub-admin" is NOT "admin"', async () => {
    fake.authGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    fake.seed('employee_accounts', [{ id: 'emp-1', auth_user_id: 'user-1', role_name: 'Sub-admin', email: 'x@test.com' }]);
    fake.seed('roles', [{ name: 'Sub-admin', permissions: [] }]);

    const result = await requireStaffAccess(staffRequest('token'));
    expect('access' in result).toBe(true);
    if ('access' in result) {
      expect(result.access.role).toBe('sub-admin');
    }
  });
});
