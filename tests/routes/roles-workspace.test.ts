/**
 * DEC-113: a role carries an explicit `workspace` ('standard' | 'doctor') that decides which
 * screens it opens. These tests cover the server half: POST /api/roles accepts and validates it,
 * GET /api/auth/me returns it, and the helpers that answer "is this a doctor role?".
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseFake } from '../helpers/supabaseFake';

const USER_SUPER = 'u-bbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const EMP_SUPER = 'e-bbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const USER_DOC = 'u-dddddd-dddd-dddd-dddd-dddddddddddd';

const fake = createSupabaseFake();
const mockDb = fake.db;

vi.mock('@/lib/supabaseServer', () => ({
  supabaseServer: {
    auth: { getUser: (...args: any[]) => fake.authGetUser(...args) },
    from: (table: string) => fake.client.from(table),
    rpc: (name: string, args?: any) => fake.client.rpc(name, args),
  },
}));

import { POST as POST_ROLES } from '@/app/api/roles/route';
import { GET as GET_ME } from '@/app/api/auth/me/route';
import { getDoctorRoleNames, isDoctorRole } from '@/lib/roleWorkspace';

function rolesReq(body: any): Request {
  return new Request('http://localhost:3000/api/roles', {
    method: 'POST',
    headers: new Headers({ 'content-type': 'application/json', Authorization: 'Bearer t' }),
    body: JSON.stringify(body),
  });
}

function meReq(): Request {
  return new Request('http://localhost:3000/api/auth/me', {
    headers: new Headers({ Authorization: 'Bearer t' }),
  });
}

function seedSuperadmin() {
  fake.authGetUser.mockResolvedValue({ data: { user: { id: USER_SUPER } }, error: null });
  mockDb.employee_accounts.push({
    id: EMP_SUPER, employee_id: 'superadmin', email: 'super@clinic.test',
    role_name: 'superadmin', auth_user_id: USER_SUPER,
  });
  mockDb.roles.push({ name: 'superadmin', permissions: [], workspace: 'standard' });
}

beforeEach(() => {
  vi.clearAllMocks();
  fake.reset();
  for (const t of ['employee_accounts', 'roles']) fake.seed(t, []);
});

describe('POST /api/roles - workspace', () => {
  it('stores the chosen workspace', async () => {
    seedSuperadmin();
    const res = await POST_ROLES(rolesReq({ name: 'Consultant', permissions: ['clinical.fill_intake'], workspace: 'doctor' }));
    expect(res.status).toBe(200);
    const saved = mockDb.roles.find((r: any) => r.name === 'consultant');
    expect(saved?.workspace).toBe('doctor');
  });

  it('rejects an unknown workspace value', async () => {
    seedSuperadmin();
    const res = await POST_ROLES(rolesReq({ name: 'weird', permissions: [], workspace: 'surgeon' }));
    expect(res.status).toBe(400);
    expect(mockDb.roles.find((r: any) => r.name === 'weird')).toBeUndefined();
  });

  it('keeps the stored workspace when an older client saves without sending one', async () => {
    seedSuperadmin();
    mockDb.roles.push({ name: 'consultant', permissions: [], workspace: 'doctor', locked: false });
    const res = await POST_ROLES(rolesReq({ name: 'consultant', permissions: ['clinical.fill_intake'] }));
    expect(res.status).toBe(200);
    expect(mockDb.roles.find((r: any) => r.name === 'consultant')?.workspace).toBe('doctor');
  });
});

describe('GET /api/auth/me - workspace', () => {
  function seedDoctor(roleName: string) {
    fake.authGetUser.mockResolvedValue({ data: { user: { id: USER_DOC, email: 'doc@clinic.test' } }, error: null });
    mockDb.employee_accounts.push({
      id: 'e-doc', employee_id: 'DOC-1', email: 'doc@clinic.test', role_name: roleName,
      department: 'Reception', auth_user_id: USER_DOC,
    });
  }

  it('returns doctor for a doctor-workspace role, whatever it is called', async () => {
    mockDb.roles.push({ name: 'consultant', permissions: ['clinical.fill_intake'], workspace: 'doctor' });
    seedDoctor('consultant');
    const body = await (await GET_ME(meReq())).json();
    expect(body.workspace).toBe('doctor');
  });

  it('returns standard for a standard role even when the department says Doctors', async () => {
    mockDb.roles.push({ name: 'receptionist', permissions: [], workspace: 'standard' });
    seedDoctor('receptionist');
    mockDb.employee_accounts[0].department = 'Doctors';
    const body = await (await GET_ME(meReq())).json();
    expect(body.workspace).toBe('standard');
  });

  it('returns standard when the role row predates the column', async () => {
    mockDb.roles.push({ name: 'legacy', permissions: [] });
    seedDoctor('legacy');
    const body = await (await GET_ME(meReq())).json();
    expect(body.workspace).toBe('standard');
  });
});

describe('roleWorkspace helpers', () => {
  it('lists only doctor-workspace roles, lower-cased', async () => {
    mockDb.roles.push(
      { name: 'Consultant', permissions: [], workspace: 'doctor' },
      { name: 'receptionist', permissions: [], workspace: 'standard' },
      { name: 'docsreviewer', permissions: [] },
    );
    expect([...(await getDoctorRoleNames())]).toEqual(['consultant']);
    expect(await isDoctorRole('CONSULTANT')).toBe(true);
    expect(await isDoctorRole('docsreviewer')).toBe(false);
    expect(await isDoctorRole(null)).toBe(false);
  });
});
