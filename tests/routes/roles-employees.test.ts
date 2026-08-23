/**
 * Route-level tests for POST /api/roles and PATCH /api/employees — the two
 * permission-critical endpoints surfaced by Brief 25 Part 3.
 *
 * 1. PATCH /api/employees role change: the UI guards the <select> with a
 *    client-side `adminRole === "superadmin"` check, but the server route only
 *    requires `requireAdministratorAccess` (admin OR superadmin). An admin can
 *    PATCH another account's `role_name` — privilege escalation. This is a real
 *    finding (RISK-069), not a hypothetical: the test is marked `it.fails` per
 *    the repo convention so a future tightening shows up.
 *
 * 2. POST /api/roles permission-key validation: the route validates only
 *    `Array.isArray(permissions)` — nothing checks the strings are real
 *    `PERMISSION_STRUCTURE` keys. A typo'd key is stored silently and then
 *    never matches in `hasPermission`. Also `it.fails`.
 *
 * Structure follows `tests/routes/packages-consume.test.ts` (supabase fake,
 * seeded auth, the `it.fails` convention).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseFake } from '../helpers/supabaseFake';

// ── Fixed ids ─────────────────────────────────────────────────────────────────
const USER_ADMIN = 'u-aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const USER_SUPER = 'u-bbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const EMP_ADMIN = 'e-aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const EMP_SUPER = 'e-bbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const EMP_TARGET = 'e-ccccccc-cccc-cccc-cccc-cccccccccccc';
const USER_TARGET_AUTH = 'u-dddddd-dddd-dddd-dddd-dddddddddddd';

const fake = createSupabaseFake();
const mockDb = fake.db;
const mockAuthGetUser = fake.authGetUser;
const mockAuthAdminUpdateUser = vi.fn();

vi.mock('@/lib/supabaseServer', () => ({
  supabaseServer: {
    auth: {
      getUser: (...args: any[]) => fake.authGetUser(...args),
      admin: {
        updateUserById: (...args: any[]) => mockAuthAdminUpdateUser(...args),
      },
    },
    from: (table: string) => fake.client.from(table),
    rpc: (name: string, args?: any) => fake.client.rpc(name, args),
  },
}));

import { POST as POST_ROLES } from '@/app/api/roles/route';
import { PATCH as PATCH_EMPLOYEES } from '@/app/api/employees/route';

// ── Helpers ───────────────────────────────────────────────────────────────────

function rolesReq(body: any, token: string | null = 'admin-token'): Request {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return new Request('http://localhost:3000/api/roles', {
    method: 'POST', headers, body: JSON.stringify(body),
  });
}

function employeesPatchReq(body: any, token: string | null = 'admin-token'): Request {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return new Request('http://localhost:3000/api/employees', {
    method: 'PATCH', headers, body: JSON.stringify(body),
  });
}

/** Seed an admin (non-superadmin) caller — role "admin" with limited permissions. */
function seedAdminAuth() {
  mockAuthGetUser.mockResolvedValue({ data: { user: { id: USER_ADMIN } }, error: null });
  mockDb.employee_accounts.push({
    id: EMP_ADMIN, employee_id: 'ADM-001', email: 'admin@clinic.test',
    role_name: 'admin', auth_user_id: USER_ADMIN,
  });
  mockDb.roles.push({ name: 'admin', permissions: ['bookings.view_calendar'] });
}

/** Seed a superadmin caller. */
function seedSuperadminAuth() {
  mockAuthGetUser.mockResolvedValue({ data: { user: { id: USER_SUPER } }, error: null });
  mockDb.employee_accounts.push({
    id: EMP_SUPER, employee_id: 'superadmin', email: 'super@clinic.test',
    role_name: 'superadmin', auth_user_id: USER_SUPER,
  });
  mockDb.roles.push({ name: 'superadmin', permissions: [] });
}

/** Seed a target employee whose role the caller will try to change. */
function seedTargetEmployee() {
  mockDb.employee_accounts.push({
    id: EMP_TARGET, employee_id: 'EMP-002', email: 'target@clinic.test',
    role_name: 'receptionist', auth_user_id: USER_TARGET_AUTH,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  fake.reset();
  for (const t of ['employee_accounts', 'roles']) {
    fake.seed(t, []);
  }
  mockAuthAdminUpdateUser.mockResolvedValue({ data: { user: {} }, error: null });
});

// ── Test 1: PATCH /api/employees — privilege escalation ───────────────────────

describe('PATCH /api/employees role change — privilege escalation (RISK-069)', () => {
  /*
   * The route at src/app/api/employees/route.ts:219 uses requireAdministratorAccess,
   * which admits both "admin" and "superadmin". The only role-change guard is
   * `employee.employee_id === 'superadmin'` (line 245) — protecting the superadmin
   * account from being changed, but NOT preventing a non-superadmin admin from
   * escalating another account to superadmin.
   *
   * The UI (RoleManagementView.tsx) gates the <select> with client-side
   * `adminRole === "superadmin"`, but that is bypassable. The server should
   * reject role changes from non-superadmin callers.
   */

  it('a non-superadmin admin cannot change another account\'s role_name', async () => {
    seedAdminAuth();
    seedTargetEmployee();
    // The target role must exist in the roles table for the route to accept it.
    mockDb.roles.push({ name: 'superadmin', permissions: [] });

    const res = await PATCH_EMPLOYEES(
      employeesPatchReq({ id: EMP_TARGET, roleName: 'superadmin' }),
    );

    // Should be rejected with 403 — but currently it succeeds (200).
    expect(res.status).toBe(403);

    // The target's role should be unchanged.
    const target = mockDb.employee_accounts.find((e: any) => e.id === EMP_TARGET)!;
    expect(target.role_name).toBe('receptionist');
  });

  it('a superadmin can change another account\'s role_name', async () => {
    seedSuperadminAuth();
    seedTargetEmployee();
    mockDb.roles.push({ name: 'manager', permissions: ['bookings.view_calendar'] });

    const res = await PATCH_EMPLOYEES(
      employeesPatchReq({ id: EMP_TARGET, roleName: 'manager' }),
    );

    expect(res.status).toBe(200);
    const target = mockDb.employee_accounts.find((e: any) => e.id === EMP_TARGET)!;
    expect(target.role_name).toBe('manager');
  });

  it('blocks changing the superadmin account\'s role regardless of caller', async () => {
    seedSuperadminAuth();
    // The target IS the superadmin account.
    mockDb.employee_accounts.push({
      id: EMP_SUPER, employee_id: 'superadmin', email: 'super@clinic.test',
      role_name: 'superadmin', auth_user_id: USER_SUPER,
    });
    mockDb.roles.push({ name: 'receptionist', permissions: [] });

    const res = await PATCH_EMPLOYEES(
      employeesPatchReq({ id: EMP_SUPER, roleName: 'receptionist' }),
    );

    expect(res.status).toBe(400);
  });
});

// ── Test 2: POST /api/roles — permission-key validation ───────────────────────

describe('POST /api/roles — permission-key validation', () => {
  /*
   * The route at src/app/api/roles/route.ts:30 validates only
   * `Array.isArray(permissions)`. Nothing checks the strings are real
   * PERMISSION_STRUCTURE keys. A typo'd key (e.g. "bookings.vew_calendar") is
   * stored silently and then never matches in `hasPermission` — a role that
   * looks configured in the UI but grants nothing.
   */

  it.fails('rejects unknown permission keys', async () => {
    seedSuperadminAuth();

    const res = await POST_ROLES(
      rolesReq({
        name: 'testrole',
        permissions: ['bookings.view_calendar', 'bookings.vew_calendar'],
      }),
    );

    // Should be rejected with 400 — but currently it succeeds (200).
    expect(res.status).toBe(400);
  });

  it('accepts a role with valid permission keys', async () => {
    seedSuperadminAuth();

    const res = await POST_ROLES(
      rolesReq({
        name: 'testrole',
        permissions: ['bookings.view_calendar', 'customers.view'],
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe('testrole');
    expect(body.permissions).toEqual(['bookings.view_calendar', 'customers.view']);
  });

  it('rejects a role with no name', async () => {
    seedSuperadminAuth();

    const res = await POST_ROLES(
      rolesReq({ name: '', permissions: ['bookings.view_calendar'] }),
    );

    expect(res.status).toBe(400);
  });

  it('rejects a role with non-array permissions', async () => {
    seedSuperadminAuth();

    const res = await POST_ROLES(
      rolesReq({ name: 'testrole', permissions: 'bookings.view_calendar' }),
    );

    expect(res.status).toBe(400);
  });
});
