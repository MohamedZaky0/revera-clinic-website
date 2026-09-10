/**
 * Route-level proof for RISK-078 / RISK-081 CORRUPT-A10: DELETE /api/providers and
 * DELETE /api/services used to accept any authenticated staff member's token regardless of the
 * granular permission a role editor configured in Role Management — this is the concrete example
 * cited in both RISK entries. Confirms the wiring end-to-end (real HTTP-shaped requests through the
 * real route handlers), not just the hasGranularPermission unit itself.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createSupabaseFake } from '../helpers/supabaseFake';

const fake = createSupabaseFake();

vi.mock('@/lib/supabaseServer', () => ({
  supabaseServer: { auth: { getUser: (...args: any[]) => fake.authGetUser(...args) }, from: (t: string) => fake.client.from(t) },
  getSupabaseServer: () => ({ auth: { getUser: (...args: any[]) => fake.authGetUser(...args) }, from: (t: string) => fake.client.from(t) }),
}));

import { DELETE as deleteProvider } from '@/app/api/providers/route';
import { DELETE as deleteService } from '@/app/api/services/route';

const USER_ID = 'user-1';
const EMP_ID = 'emp-1';

function delReq(path: string, id: string) {
  return new Request(`http://localhost${path}?id=${id}`, {
    method: 'DELETE',
    headers: { Authorization: 'Bearer staff-token' },
  });
}

function seedStaff(roleName: string, permissions: string[]) {
  fake.authGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
  fake.seed('employee_accounts', [{ id: EMP_ID, auth_user_id: USER_ID, role_name: roleName, email: 'staff@test.com' }]);
  fake.seed('roles', [{ name: roleName, permissions }]);
}

beforeEach(() => {
  fake.reset();
});

describe('DELETE /api/providers — permission enforcement', () => {
  // Provider delete (soft archive or hard permanent removal, both via this one endpoint) was
  // narrowed to superadmin-only: it used to accept any role granted the coarse "Providers"
  // category or the granular "providers.delete" key via hasGranularPermission, which contradicted
  // the documented "superadmin can choose between soft/hard delete" boundary for this specific
  // destructive action. See requireSuperadminAccess in src/lib/access.ts.
  it('a receptionist role with no providers permission at all is rejected with 403', async () => {
    seedStaff('receptionist', []);
    fake.seed('providers', [{ id: 'doc-1', name: 'Dr. Sara' }]);
    const res = await deleteProvider(delReq('/api/providers', 'doc-1'));
    expect(res.status).toBe(403);
    expect(fake.db.providers.find((p: any) => p.id === 'doc-1')).toBeTruthy();
  });

  it('a role granted the coarse "Providers" category is still rejected — only superadmin may delete a doctor', async () => {
    seedStaff('front-desk-lead', ['Providers']);
    fake.seed('providers', [{ id: 'doc-1', name: 'Dr. Sara' }]);
    const res = await deleteProvider(delReq('/api/providers', 'doc-1'));
    expect(res.status).toBe(403);
    expect(fake.db.providers.find((p: any) => p.id === 'doc-1')).toBeTruthy();
  });

  it('an "admin" role (not superadmin) is also rejected', async () => {
    seedStaff('admin', ['Providers', 'providers.delete']);
    fake.seed('providers', [{ id: 'doc-1', name: 'Dr. Sara' }]);
    const res = await deleteProvider(delReq('/api/providers', 'doc-1'));
    expect(res.status).toBe(403);
  });

  it('superadmin can always delete regardless of permissions array', async () => {
    seedStaff('superadmin', []);
    fake.seed('providers', [{ id: 'doc-1', name: 'Dr. Sara' }]);
    const res = await deleteProvider(delReq('/api/providers', 'doc-1'));
    expect(res.status).toBe(200);
  });
});

describe('DELETE /api/services — permission enforcement', () => {
  it('a role with no services permission is rejected', async () => {
    seedStaff('receptionist', []);
    fake.seed('services', [{ id: 1, en: 'Facial' }]);
    const res = await deleteService(delReq('/api/services', '1'));
    expect(res.status).toBe(403);
  });

  it('a role granted "services.delete" can delete', async () => {
    seedStaff('services-manager', ['services.delete']);
    fake.seed('services', [{ id: 1, en: 'Facial' }]);
    const res = await deleteService(delReq('/api/services', '1'));
    expect(res.status).toBe(200);
  });
});
