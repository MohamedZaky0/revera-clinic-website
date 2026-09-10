/**
 * Route-level tests for POST /api/employees.
 *
 * Two findings, both fixed in the same change these tests were written for:
 *
 * 1. Privilege escalation on create. PATCH /api/employees carried the RISK-069 guard ("only a
 *    superadmin may grant the admin/superadmin tier") and POST did not. An admin who could not
 *    promote an existing employee could simply create a new one at `superadmin` -- and since the
 *    password path creates the account already confirmed, sign straight in as it. The role
 *    dropdown hides those options from non-superadmins, but that is a UI filter, not a guard.
 *    `tests/routes/roles-employees.test.ts` covers the PATCH half; this file covers POST.
 *
 * 2. Doctor -> providers sync matched on `name`, so a second doctor with the same name UPDATEd the
 *    first one's provider row (overwriting commission config, services, branch, salary), and an
 *    ambiguous match threw into a log-only catch that still returned 201 -- leaving a doctor who
 *    could never be booked.
 *
 * Structure follows `tests/routes/roles-employees.test.ts` (supabase fake, seeded auth).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseFake } from '../helpers/supabaseFake';

const USER_ADMIN = 'u-aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const USER_SUPER = 'u-bbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const EMP_ADMIN = 'e-aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const EMP_SUPER = 'e-bbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const NEW_AUTH_USER = 'u-nnnnnn-nnnn-nnnn-nnnn-nnnnnnnnnnnn';

const fake = createSupabaseFake();
const mockDb = fake.db;
const mockAuthGetUser = fake.authGetUser;
const mockCreateUser = vi.fn();
const mockInviteUser = vi.fn();
const mockDeleteUser = vi.fn();

vi.mock('@/lib/supabaseServer', () => ({
  supabaseServer: {
    auth: {
      getUser: (...args: any[]) => fake.authGetUser(...args),
      admin: {
        createUser: (...args: any[]) => mockCreateUser(...args),
        inviteUserByEmail: (...args: any[]) => mockInviteUser(...args),
        deleteUser: (...args: any[]) => mockDeleteUser(...args),
        listUsers: () => Promise.resolve({ data: { users: [] }, error: null }),
      },
    },
    from: (table: string) => fake.client.from(table),
    rpc: (name: string, args?: any) => fake.client.rpc(name, args),
  },
}));

import { POST as POST_EMPLOYEES } from '@/app/api/employees/route';

const STRONG_PASSWORD = 'Aa1!aaaa';

function postReq(body: any, token = 'caller-token'): Request {
  const headers = new Headers({ 'content-type': 'application/json' });
  headers.set('Authorization', `Bearer ${token}`);
  return new Request('http://localhost:3000/api/employees', {
    method: 'POST', headers, body: JSON.stringify(body),
  });
}

function seedAdminAuth() {
  mockAuthGetUser.mockResolvedValue({ data: { user: { id: USER_ADMIN } }, error: null });
  mockDb.employee_accounts.push({
    id: EMP_ADMIN, employee_id: 'ADM-001', email: 'admin@clinic.test',
    role_name: 'admin', auth_user_id: USER_ADMIN,
  });
}

function seedSuperadminAuth() {
  mockAuthGetUser.mockResolvedValue({ data: { user: { id: USER_SUPER } }, error: null });
  mockDb.employee_accounts.push({
    id: EMP_SUPER, employee_id: 'superadmin', email: 'super@clinic.test',
    role_name: 'superadmin', auth_user_id: USER_SUPER,
  });
}

/** Every role the tests reference has to exist -- the route rejects unknown roles before anything else. */
function seedRoles() {
  mockDb.roles.push({ name: 'admin', permissions: [] });
  mockDb.roles.push({ name: 'superadmin', permissions: [] });
  mockDb.roles.push({ name: 'receptionist', permissions: [] });
  mockDb.roles.push({ name: 'doctor', permissions: [] });
}

beforeEach(() => {
  vi.clearAllMocks();
  fake.reset();
  for (const t of ['employee_accounts', 'roles', 'customers', 'providers']) fake.seed(t, []);
  mockCreateUser.mockResolvedValue({ data: { user: { id: NEW_AUTH_USER } }, error: null });
  mockInviteUser.mockResolvedValue({ data: { user: { id: NEW_AUTH_USER } }, error: null });
  mockDeleteUser.mockResolvedValue({ data: {}, error: null });
});

describe('POST /api/employees — privilege escalation on create (RISK-069)', () => {
  it('a non-superadmin admin cannot create a new account at superadmin', async () => {
    seedAdminAuth();
    seedRoles();

    const res = await POST_EMPLOYEES(postReq({
      email: 'new@clinic.test', name: 'New Hire', roleName: 'superadmin', password: STRONG_PASSWORD,
    }));

    expect(res.status).toBe(403);
    // Nothing may be left behind: no auth user, no employee row.
    expect(mockCreateUser).not.toHaveBeenCalled();
    expect(mockDb.employee_accounts.some((e: any) => e.email === 'new@clinic.test')).toBe(false);
  });

  it('a non-superadmin admin cannot create a new account at admin', async () => {
    seedAdminAuth();
    seedRoles();

    const res = await POST_EMPLOYEES(postReq({
      email: 'new2@clinic.test', name: 'New Hire', roleName: 'admin', password: STRONG_PASSWORD,
    }));

    expect(res.status).toBe(403);
    expect(mockDb.employee_accounts.some((e: any) => e.email === 'new2@clinic.test')).toBe(false);
  });

  it('the guard is case-insensitive — "SuperAdmin" is still refused', async () => {
    seedAdminAuth();
    seedRoles();
    mockDb.roles.push({ name: 'SuperAdmin', permissions: [] });

    const res = await POST_EMPLOYEES(postReq({
      email: 'new3@clinic.test', name: 'New Hire', roleName: 'SuperAdmin', password: STRONG_PASSWORD,
    }));

    expect(res.status).toBe(403);
  });

  it('a superadmin CAN create an admin', async () => {
    seedSuperadminAuth();
    seedRoles();

    const res = await POST_EMPLOYEES(postReq({
      email: 'newadmin@clinic.test', name: 'New Admin', roleName: 'admin', password: STRONG_PASSWORD,
    }));

    expect(res.status).toBe(201);
    expect(mockDb.employee_accounts.some((e: any) => e.email === 'newadmin@clinic.test')).toBe(true);
  });

  it('an admin can still create ordinary staff — the guard is not a blanket block', async () => {
    seedAdminAuth();
    seedRoles();

    const res = await POST_EMPLOYEES(postReq({
      email: 'recep@clinic.test', name: 'Front Desk', roleName: 'receptionist', password: STRONG_PASSWORD,
    }));

    expect(res.status).toBe(201);
    expect(mockDb.employee_accounts.some((e: any) => e.email === 'recep@clinic.test')).toBe(true);
  });
});

describe('POST /api/employees — doctor to providers sync', () => {
  it('does not overwrite an existing doctor who merely shares a name', async () => {
    seedSuperadminAuth();
    seedRoles();
    mockDb.providers.push({
      id: 'p-existing', name: 'Ahmed Mohamed', national_id: '11111111111111',
      phone: '01000000001', fixed_salary: 9000, commission_type: 'percentage', commission_value: 20,
    });

    const res = await POST_EMPLOYEES(postReq({
      email: 'ahmed2@clinic.test', name: 'Ahmed Mohamed', roleName: 'doctor', department: 'Doctors',
      password: STRONG_PASSWORD, nationalId: '22222222222222', phone: '01000000002', salary: 5000,
    }));

    expect(res.status).toBe(201);
    // A second provider row, not an overwrite of the first.
    expect(mockDb.providers).toHaveLength(2);
    const original = mockDb.providers.find((p: any) => p.id === 'p-existing')!;
    expect(original.fixed_salary).toBe(9000);
    expect(original.commission_value).toBe(20);
  });

  it('updates the existing provider when the national ID is the same person', async () => {
    seedSuperadminAuth();
    seedRoles();
    mockDb.providers.push({
      id: 'p-same', name: 'Sara Adel', national_id: '33333333333333', fixed_salary: 1000,
    });

    const res = await POST_EMPLOYEES(postReq({
      email: 'sara@clinic.test', name: 'Sara Adel', roleName: 'doctor', department: 'Doctors',
      password: STRONG_PASSWORD, nationalId: '33333333333333', salary: 7000,
    }));

    expect(res.status).toBe(201);
    expect(mockDb.providers).toHaveLength(1);
    expect(mockDb.providers[0].fixed_salary).toBe(7000);
  });

  it('refuses and rolls back when the identifier matches more than one doctor', async () => {
    seedSuperadminAuth();
    seedRoles();
    mockDb.providers.push({ id: 'p-dup-1', name: 'Dup One', national_id: '44444444444444' });
    mockDb.providers.push({ id: 'p-dup-2', name: 'Dup Two', national_id: '44444444444444' });

    const res = await POST_EMPLOYEES(postReq({
      email: 'dup@clinic.test', name: 'Dup Three', roleName: 'doctor', department: 'Doctors',
      password: STRONG_PASSWORD, nationalId: '44444444444444',
    }));

    // The old code returned 201 here and left a doctor who could never be booked.
    expect(res.status).toBe(500);
    // And nothing survives: no employee row, and the auth user is cleaned up.
    expect(mockDb.employee_accounts.some((e: any) => e.email === 'dup@clinic.test')).toBe(false);
    expect(mockDeleteUser).toHaveBeenCalledWith(NEW_AUTH_USER);
  });

  it('creates a provider row for a doctor with no national ID or phone', async () => {
    seedSuperadminAuth();
    seedRoles();

    const res = await POST_EMPLOYEES(postReq({
      email: 'newdoc@clinic.test', name: 'Brand New', roleName: 'doctor', department: 'Doctors',
      password: STRONG_PASSWORD,
    }));

    expect(res.status).toBe(201);
    expect(mockDb.providers).toHaveLength(1);
    expect(mockDb.providers[0].name).toBe('Brand New');
  });

  it('does not touch providers for a non-doctor hire', async () => {
    seedSuperadminAuth();
    seedRoles();

    const res = await POST_EMPLOYEES(postReq({
      email: 'desk@clinic.test', name: 'Front Desk', roleName: 'receptionist',
      department: 'Reception', password: STRONG_PASSWORD,
    }));

    expect(res.status).toBe(201);
    expect(mockDb.providers).toHaveLength(0);
  });
});
