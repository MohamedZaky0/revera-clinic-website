/**
 * DEC-114: an admin (any standard role) can also be a doctor. The account keeps its role; the
 * `is_also_doctor` flag makes the person a provider and moves them from staff payroll to Doctor
 * Payroll. Covers POST and PATCH /api/employees, the providers auto-sync and GET /api/hr/payroll.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseFake } from '../helpers/supabaseFake';

const USER_SUPER = 'u-bbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const EMP_SUPER = 'e-bbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const EMP_TARGET = 'e-ccccccc-cccc-cccc-cccc-cccccccccccc';
const NEW_AUTH_USER = 'u-nnnnnn-nnnn-nnnn-nnnn-nnnnnnnnnnnn';

const fake = createSupabaseFake();
const mockDb = fake.db;
const mockCreateUser = vi.fn();
const mockUpdateUser = vi.fn();
// The dev project has no employee_accounts.working_days_hours column, so the route's first insert
// fails there and it retries without that column. This switch reproduces that.
let missingWorkingDaysColumn = false;

// The route keeps a local JSON copy of working schedules; never let a test write into data/.
vi.mock('fs', async (importOriginal) => {
  const actual: any = await importOriginal();
  const stub = { ...actual, existsSync: () => false, mkdirSync: () => undefined, writeFileSync: () => undefined };
  return { ...stub, default: stub };
});

vi.mock('@/lib/supabaseServer', () => ({
  supabaseServer: {
    auth: {
      getUser: (...args: any[]) => fake.authGetUser(...args),
      admin: {
        createUser: (...args: any[]) => mockCreateUser(...args),
        inviteUserByEmail: vi.fn(),
        deleteUser: vi.fn(),
        updateUserById: (...args: any[]) => mockUpdateUser(...args),
        listUsers: () => Promise.resolve({ data: { users: [] }, error: null }),
      },
    },
    from: (table: string) => {
      const q: any = fake.client.from(table);
      if (table === 'employee_accounts' && missingWorkingDaysColumn) {
        const realInsert = q.insert.bind(q);
        q.insert = (payload: any) =>
          payload && 'working_days_hours' in payload
            ? { select: () => ({ single: async () => ({ data: null, error: { message: 'column working_days_hours does not exist' } }) }) }
            : realInsert(payload);
      }
      return q;
    },
    rpc: (name: string, args?: any) => fake.client.rpc(name, args),
  },
}));

import { POST as POST_EMPLOYEES, PATCH as PATCH_EMPLOYEES } from '@/app/api/employees/route';
import { GET as GET_PAYROLL } from '@/app/api/hr/payroll/route';

const STRONG_PASSWORD = 'Aa1!aaaa';

function req(method: 'POST' | 'PATCH', body: any): Request {
  return new Request('http://localhost:3000/api/employees', {
    method,
    headers: new Headers({ 'content-type': 'application/json', Authorization: 'Bearer t' }),
    body: JSON.stringify(body),
  });
}

function seed() {
  fake.authGetUser.mockResolvedValue({ data: { user: { id: USER_SUPER } }, error: null });
  mockDb.employee_accounts.push({
    id: EMP_SUPER, employee_id: 'superadmin', email: 'super@clinic.test',
    role_name: 'superadmin', auth_user_id: USER_SUPER,
  });
  mockDb.roles.push(
    { name: 'superadmin', permissions: [], workspace: 'standard' },
    { name: 'admin', permissions: [], workspace: 'standard' },
    { name: 'doctor', permissions: [], workspace: 'doctor' },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  fake.reset();
  missingWorkingDaysColumn = false;
  for (const t of ['employee_accounts', 'roles', 'customers', 'providers', 'hr_payroll']) fake.seed(t, []);
  mockCreateUser.mockResolvedValue({ data: { user: { id: NEW_AUTH_USER } }, error: null });
  mockUpdateUser.mockResolvedValue({ data: { user: {} }, error: null });
});

describe('POST /api/employees - also a doctor', () => {
  it('an admin flagged as also a doctor keeps the admin role and gets a provider row', async () => {
    seed();
    const res = await POST_EMPLOYEES(req('POST', {
      email: 'owner@clinic.test', name: 'Dr Owner', roleName: 'admin', department: 'Reception',
      password: STRONG_PASSWORD, isAlsoDoctor: true,
    }));
    expect(res.status).toBe(201);
    const emp = mockDb.employee_accounts.find((e: any) => e.email === 'owner@clinic.test');
    expect(emp?.role_name).toBe('admin');
    expect(emp?.is_also_doctor).toBe(true);
    expect(mockDb.providers.map((p: any) => p.name)).toEqual(['Dr Owner']);
  });

  it('keeps the flag when the first insert fails and the route retries without working_days_hours', async () => {
    seed();
    missingWorkingDaysColumn = true;
    const res = await POST_EMPLOYEES(req('POST', {
      email: 'retry@clinic.test', name: 'Dr Retry', roleName: 'admin', password: STRONG_PASSWORD,
      isAlsoDoctor: true, workingDaysHours: { Sunday: { isOpen: true, start: '09:00', end: '17:00' } },
    }));
    expect(res.status).toBe(201);
    expect(mockDb.employee_accounts.find((e: any) => e.email === 'retry@clinic.test')?.is_also_doctor).toBe(true);
  });

  it('an admin without the flag gets no provider row and no flag', async () => {
    seed();
    const res = await POST_EMPLOYEES(req('POST', {
      email: 'plain@clinic.test', name: 'Plain Admin', roleName: 'admin', password: STRONG_PASSWORD,
    }));
    expect(res.status).toBe(201);
    expect(mockDb.providers).toHaveLength(0);
    expect(mockDb.employee_accounts.find((e: any) => e.email === 'plain@clinic.test')?.is_also_doctor).toBeUndefined();
  });

  it('the flag is not stored for a doctor-workspace role, which is a doctor already', async () => {
    seed();
    const res = await POST_EMPLOYEES(req('POST', {
      email: 'dr@clinic.test', name: 'Dr Real', roleName: 'doctor', password: STRONG_PASSWORD, isAlsoDoctor: true,
    }));
    expect(res.status).toBe(201);
    expect(mockDb.employee_accounts.find((e: any) => e.email === 'dr@clinic.test')?.is_also_doctor).toBeUndefined();
    expect(mockDb.providers).toHaveLength(1);
  });

  it('a non-boolean flag is ignored', async () => {
    seed();
    const res = await POST_EMPLOYEES(req('POST', {
      email: 'odd@clinic.test', name: 'Odd', roleName: 'admin', password: STRONG_PASSWORD, isAlsoDoctor: 'yes',
    }));
    expect(res.status).toBe(201);
    expect(mockDb.providers).toHaveLength(0);
  });
});

describe('PATCH /api/employees - also a doctor', () => {
  function seedTarget(extra: Record<string, any> = {}) {
    mockDb.employee_accounts.push({
      id: EMP_TARGET, employee_id: 'adm2@clinic.test', email: 'adm2@clinic.test', name: 'Dr Edit',
      role_name: 'admin', auth_user_id: 'u-x', ...extra,
    });
  }

  it('ticking the flag on an existing admin saves it and creates the provider', async () => {
    seed(); seedTarget();
    const res = await PATCH_EMPLOYEES(req('PATCH', { id: EMP_TARGET, isAlsoDoctor: true }));
    expect(res.status).toBe(200);
    expect(mockDb.employee_accounts.find((e: any) => e.id === EMP_TARGET)?.is_also_doctor).toBe(true);
    expect(mockDb.providers.map((p: any) => p.name)).toEqual(['Dr Edit']);
  });

  it('a later edit that does not mention the flag keeps it and still syncs the provider', async () => {
    seed(); seedTarget({ is_also_doctor: true });
    const res = await PATCH_EMPLOYEES(req('PATCH', { id: EMP_TARGET, phone: '01012345678' }));
    expect(res.status).toBe(200);
    expect(mockDb.employee_accounts.find((e: any) => e.id === EMP_TARGET)?.is_also_doctor).toBe(true);
    expect(mockDb.providers).toHaveLength(1);
  });

  it('unticking the flag clears it and does not create a provider', async () => {
    seed(); seedTarget({ is_also_doctor: true });
    const res = await PATCH_EMPLOYEES(req('PATCH', { id: EMP_TARGET, isAlsoDoctor: false }));
    expect(res.status).toBe(200);
    expect(mockDb.employee_accounts.find((e: any) => e.id === EMP_TARGET)?.is_also_doctor).toBe(false);
    expect(mockDb.providers).toHaveLength(0);
  });
});

describe('GET /api/hr/payroll - also a doctor', () => {
  it('leaves an also-a-doctor admin out of staff payroll but keeps a plain admin', async () => {
    seed();
    mockDb.employee_accounts.push(
      { id: 'e1', name: 'Plain Admin', role_name: 'admin', is_also_doctor: false },
      { id: 'e2', name: 'Dr Owner', role_name: 'admin', is_also_doctor: true },
      { id: 'e3', name: 'Dr Real', role_name: 'doctor' },
    );
    mockDb.hr_payroll.push(
      { id: 'p1', month: '2026-10', employee_id: 'e1', employee_accounts: { id: 'e1', role_name: 'admin', is_also_doctor: false } },
      { id: 'p2', month: '2026-10', employee_id: 'e2', employee_accounts: { id: 'e2', role_name: 'admin', is_also_doctor: true } },
      { id: 'p3', month: '2026-10', employee_id: 'e3', employee_accounts: { id: 'e3', role_name: 'doctor' } },
    );
    const res = await GET_PAYROLL(new Request('http://localhost:3000/api/hr/payroll', {
      headers: new Headers({ Authorization: 'Bearer t' }),
    }));
    expect(res.status).toBe(200);
    const rows = await res.json();
    expect(rows.map((r: any) => r.id)).toEqual(['p1']);
  });
});
