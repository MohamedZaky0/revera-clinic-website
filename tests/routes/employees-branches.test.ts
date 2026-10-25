/**
 * Route-level tests for multi-branch employee assignment (DEC-110).
 *
 * An employee can now belong to several branches. `employee_accounts.branch_id` stays the primary
 * branch (so every consumer written for one branch keeps working) and the new `branch_ids` array holds
 * the full, ordered assignment. These tests pin the rules of POST / PATCH / GET /api/employees:
 *
 *   - several branches can be saved, primary = first;
 *   - an empty selection is rejected, and so are duplicates, unknown ids and non-array input;
 *   - a NEW assignment to an inactive branch is rejected;
 *   - an assignment the employee already has to a branch that has since gone inactive is PRESERVED
 *     (editing a phone number, or adding a second branch, must not force them off it);
 *   - a legacy single `branchId` request still works, and an employee with only the legacy column set
 *     (no `branch_ids`, a row written before the migration) reads back correctly;
 *   - validation happens before the auth user is created, so a rejected request leaves nothing behind.
 *
 * Structure follows `tests/routes/employees-post-escalation.test.ts` (supabase fake, seeded auth).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseFake } from '../helpers/supabaseFake';

const USER_ADMIN = 'u-aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const EMP_ADMIN = 'e-aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const NEW_AUTH_USER = 'u-nnnnnn-nnnn-nnnn-nnnn-nnnnnnnnnnnn';
const EMP_TARGET = 'e-ccccccc-cccc-cccc-cccc-cccccccccccc';

const B_ZAYED = 'b-zayed';
const B_COMPOUND = 'b-compound';
const B_CAIRO = 'b-cairo';
const B_OLD = 'b-old-inactive';

const fake = createSupabaseFake();
const mockDb = fake.db;
const mockCreateUser = vi.fn();
const mockInviteUser = vi.fn();
const mockDeleteUser = vi.fn();

vi.mock('@/lib/supabaseServer', () => ({
  supabaseServer: {
    auth: {
      getUser: (...args: any[]) => fake.authGetUser(...args), getClaims: (...args: any[]) => fake.authGetClaims(...args),
      admin: {
        createUser: (...args: any[]) => mockCreateUser(...args),
        inviteUserByEmail: (...args: any[]) => mockInviteUser(...args),
        deleteUser: (...args: any[]) => mockDeleteUser(...args),
        updateUserById: () => Promise.resolve({ data: {}, error: null }),
        listUsers: () => Promise.resolve({ data: { users: [] }, error: null }),
        getUserById: () => Promise.resolve({ data: { user: { email_confirmed_at: null } }, error: null }),
      },
    },
    from: (table: string) => fake.client.from(table),
    rpc: (name: string, args?: any) => fake.client.rpc(name, args),
  },
}));

import { GET, POST, PATCH } from '@/app/api/employees/route';

const STRONG_PASSWORD = 'Aa1!aaaa';

function req(method: 'POST' | 'PATCH' | 'GET', body?: any): Request {
  const headers = new Headers({ 'content-type': 'application/json' });
  headers.set('Authorization', 'Bearer caller-token');
  return new Request('http://localhost:3000/api/employees', {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function newHire(extra: Record<string, any> = {}) {
  return {
    email: 'new.hire@clinic.test',
    name: 'New Hire',
    roleName: 'receptionist',
    password: STRONG_PASSWORD,
    ...extra,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  fake.reset();
  fake.authGetUser.mockResolvedValue({ data: { user: { id: USER_ADMIN } }, error: null });
  fake.seed('employee_accounts', [
    { id: EMP_ADMIN, employee_id: 'ADM-001', email: 'admin@clinic.test', role_name: 'admin', auth_user_id: USER_ADMIN },
  ]);
  fake.seed('roles', [
    { name: 'admin', permissions: [] },
    { name: 'receptionist', permissions: [] },
    { name: 'doctor', permissions: [], workspace: 'doctor' },
  ]);
  fake.seed('customers', []);
  fake.seed('providers', []);
  fake.seed('page_settings', []);
  fake.seed('branches', [
    { id: B_ZAYED, name_en: 'Zayed', status: 'active' },
    { id: B_COMPOUND, name_en: 'Compound', status: 'active' },
    { id: B_CAIRO, name_en: 'New Cairo', status: 'active' },
    { id: B_OLD, name_en: 'Old Branch', status: 'inactive' },
  ]);
  mockCreateUser.mockResolvedValue({ data: { user: { id: NEW_AUTH_USER } }, error: null });
  mockInviteUser.mockResolvedValue({ data: { user: { id: NEW_AUTH_USER } }, error: null });
  mockDeleteUser.mockResolvedValue({ data: {}, error: null });
});

function savedHire() {
  return mockDb.employee_accounts.find((e: any) => e.email === 'new.hire@clinic.test');
}

describe('POST /api/employees — branch assignment (DEC-110)', () => {
  it('saves several branches; the first is the primary branch_id', async () => {
    const res = await POST(req('POST', newHire({ branchIds: [B_COMPOUND, B_ZAYED, B_CAIRO] })));

    expect(res.status).toBe(201);
    const row = savedHire();
    expect(row.branch_id).toBe(B_COMPOUND);
    expect(row.branch_ids).toEqual([B_COMPOUND, B_ZAYED, B_CAIRO]);
    const json = await res.json();
    expect(json.branch_ids).toEqual([B_COMPOUND, B_ZAYED, B_CAIRO]);
  });

  it('rejects an empty selection, before any auth user exists', async () => {
    const res = await POST(req('POST', newHire({ branchIds: [] })));

    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/at least one branch/i);
    expect(mockCreateUser).not.toHaveBeenCalled();
    expect(savedHire()).toBeUndefined();
  });

  it('rejects a legacy empty branchId the same way', async () => {
    const res = await POST(req('POST', newHire({ branchId: '' })));
    expect(res.status).toBe(400);
    expect(mockCreateUser).not.toHaveBeenCalled();
  });

  it('rejects an inactive branch for a new employee', async () => {
    const res = await POST(req('POST', newHire({ branchIds: [B_ZAYED, B_OLD] })));

    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/inactive/i);
    expect(mockCreateUser).not.toHaveBeenCalled();
    expect(savedHire()).toBeUndefined();
  });

  it('rejects a branch id that does not exist', async () => {
    const res = await POST(req('POST', newHire({ branchIds: [B_ZAYED, 'b-missing'] })));

    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/does not exist/i);
    expect(mockCreateUser).not.toHaveBeenCalled();
  });

  it('rejects duplicate branch ids', async () => {
    const res = await POST(req('POST', newHire({ branchIds: [B_ZAYED, B_ZAYED] })));

    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/more than once/i);
    expect(mockCreateUser).not.toHaveBeenCalled();
  });

  it('rejects a non-array branchIds', async () => {
    const res = await POST(req('POST', newHire({ branchIds: B_ZAYED })));
    expect(res.status).toBe(400);
  });

  it('still accepts the legacy single branchId (backward compat)', async () => {
    const res = await POST(req('POST', newHire({ branchId: B_ZAYED })));

    expect(res.status).toBe(201);
    const row = savedHire();
    expect(row.branch_id).toBe(B_ZAYED);
    expect(row.branch_ids).toEqual([B_ZAYED]);
  });

  it('a request that names no branch at all (Role Management provisioning) still creates a branch-less account', async () => {
    const res = await POST(req('POST', newHire()));

    expect(res.status).toBe(201);
    const row = savedHire();
    expect(row.branch_id).toBeNull();
    expect(row.branch_ids).toEqual([]);
  });

  it('a doctor is synced to providers on the primary branch', async () => {
    const res = await POST(req('POST', newHire({
      roleName: 'doctor',
      department: 'Doctors',
      phone: '01000000001',
      branchIds: [B_CAIRO, B_ZAYED],
    })));

    expect(res.status).toBe(201);
    expect(mockDb.providers).toHaveLength(1);
    expect(mockDb.providers[0].branch_id).toBe(B_CAIRO);
  });
});

describe('PATCH /api/employees — branch assignment (DEC-110)', () => {
  function seedTarget(extra: Record<string, any> = {}) {
    mockDb.employee_accounts.push({
      id: EMP_TARGET, employee_id: 'EMP-002', email: 'target@clinic.test', name: 'Target',
      role_name: 'receptionist', auth_user_id: 'u-target', phone: '0100', ...extra,
    });
  }
  const target = () => mockDb.employee_accounts.find((e: any) => e.id === EMP_TARGET);

  it('replaces the assignment with several branches, primary first', async () => {
    seedTarget({ branch_id: B_ZAYED, branch_ids: [B_ZAYED] });

    const res = await PATCH(req('PATCH', { id: EMP_TARGET, branchIds: [B_CAIRO, B_ZAYED] }));

    expect(res.status).toBe(200);
    expect(target().branch_id).toBe(B_CAIRO);
    expect(target().branch_ids).toEqual([B_CAIRO, B_ZAYED]);
  });

  it('rejects an empty selection and leaves the employee untouched', async () => {
    seedTarget({ branch_id: B_ZAYED, branch_ids: [B_ZAYED] });

    const res = await PATCH(req('PATCH', { id: EMP_TARGET, branchIds: [] }));

    expect(res.status).toBe(400);
    expect(target().branch_id).toBe(B_ZAYED);
    expect(target().branch_ids).toEqual([B_ZAYED]);
  });

  it('rejects newly assigning an inactive branch', async () => {
    seedTarget({ branch_id: B_ZAYED, branch_ids: [B_ZAYED] });

    const res = await PATCH(req('PATCH', { id: EMP_TARGET, branchIds: [B_ZAYED, B_OLD] }));

    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/inactive/i);
    expect(target().branch_ids).toEqual([B_ZAYED]);
  });

  it('preserves an existing assignment to a branch that has since gone inactive', async () => {
    seedTarget({ branch_id: B_OLD, branch_ids: [B_OLD, B_ZAYED] });

    // Re-saving the same set (what the edit form sends) must pass even though B_OLD is inactive now.
    const res = await PATCH(req('PATCH', { id: EMP_TARGET, branchIds: [B_OLD, B_ZAYED, B_CAIRO] }));

    expect(res.status).toBe(200);
    expect(target().branch_id).toBe(B_OLD);
    expect(target().branch_ids).toEqual([B_OLD, B_ZAYED, B_CAIRO]);
  });

  it('lets the inactive assignment be removed, but then it cannot be added back', async () => {
    seedTarget({ branch_id: B_OLD, branch_ids: [B_OLD, B_ZAYED] });

    const removed = await PATCH(req('PATCH', { id: EMP_TARGET, branchIds: [B_ZAYED] }));
    expect(removed.status).toBe(200);
    expect(target().branch_ids).toEqual([B_ZAYED]);

    const readded = await PATCH(req('PATCH', { id: EMP_TARGET, branchIds: [B_ZAYED, B_OLD] }));
    expect(readded.status).toBe(400);
  });

  it('a legacy employee row (branch_id only, no branch_ids) keeps its branch when another field is edited', async () => {
    seedTarget({ branch_id: B_ZAYED });

    const res = await PATCH(req('PATCH', { id: EMP_TARGET, phone: '01099999999' }));

    expect(res.status).toBe(200);
    expect(target().phone).toBe('01099999999');
    expect(target().branch_id).toBe(B_ZAYED);
    expect((await res.json()).branch_ids).toEqual([B_ZAYED]);
  });

  it('a legacy employee on an inactive branch can be edited without touching the branch', async () => {
    seedTarget({ branch_id: B_OLD });

    const res = await PATCH(req('PATCH', { id: EMP_TARGET, name: 'Renamed' }));

    expect(res.status).toBe(200);
    expect(target().branch_id).toBe(B_OLD);
  });

  it('a legacy employee on an inactive branch may re-send that branch (stored via branch_id only)', async () => {
    seedTarget({ branch_id: B_OLD });

    const res = await PATCH(req('PATCH', { id: EMP_TARGET, branchIds: [B_OLD, B_COMPOUND] }));

    expect(res.status).toBe(200);
    expect(target().branch_ids).toEqual([B_OLD, B_COMPOUND]);
  });

  it('still accepts the legacy single branchId (backward compat)', async () => {
    seedTarget({ branch_id: B_ZAYED, branch_ids: [B_ZAYED] });

    const res = await PATCH(req('PATCH', { id: EMP_TARGET, branchId: B_COMPOUND }));

    expect(res.status).toBe(200);
    expect(target().branch_id).toBe(B_COMPOUND);
    expect(target().branch_ids).toEqual([B_COMPOUND]);
  });

  it('rejects a legacy branchId of null/empty instead of silently clearing the branch', async () => {
    seedTarget({ branch_id: B_ZAYED, branch_ids: [B_ZAYED] });

    const res = await PATCH(req('PATCH', { id: EMP_TARGET, branchId: null }));

    expect(res.status).toBe(400);
    expect(target().branch_id).toBe(B_ZAYED);
  });

  it('a doctor edit syncs the primary branch to providers', async () => {
    seedTarget({ role_name: 'doctor', department: 'Doctors', branch_id: B_ZAYED, branch_ids: [B_ZAYED], name: 'Dr Target' });
    mockDb.providers.push({ id: 'p-1', name: 'Dr Target', phone: '0100', branch_id: B_ZAYED });

    const res = await PATCH(req('PATCH', { id: EMP_TARGET, branchIds: [B_COMPOUND, B_ZAYED] }));

    expect(res.status).toBe(200);
    expect(mockDb.providers.find((p: any) => p.id === 'p-1').branch_id).toBe(B_COMPOUND);
  });
});

describe('GET /api/employees — branch_ids is always present', () => {
  it('returns branch_ids primary-first, falling back to branch_id for a pre-migration row', async () => {
    mockDb.employee_accounts.push(
      { id: 'e-legacy', employee_id: 'L-1', email: 'legacy@clinic.test', role_name: 'receptionist', branch_id: B_ZAYED, created_at: '2026-01-01' },
      { id: 'e-multi', employee_id: 'M-1', email: 'multi@clinic.test', role_name: 'receptionist', branch_id: B_CAIRO, branch_ids: [B_CAIRO, B_ZAYED], created_at: '2026-01-02' },
      { id: 'e-none', employee_id: 'N-1', email: 'none@clinic.test', role_name: 'receptionist', branch_id: null, branch_ids: [], created_at: '2026-01-03' },
    );

    const res = await GET(req('GET'));
    const rows: any[] = await res.json();
    const by = (id: string) => rows.find((r) => r.id === id);

    expect(by('e-legacy').branch_ids).toEqual([B_ZAYED]);
    expect(by('e-multi').branch_ids).toEqual([B_CAIRO, B_ZAYED]);
    expect(by('e-none').branch_ids).toEqual([]);
  });
});
