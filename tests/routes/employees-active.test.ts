/**
 * DEC-117: employee accounts can be switched Inactive. An inactive account keeps its role and
 * records but has no access: staff-access checks and /api/auth/me refuse it, and the Supabase Auth
 * user is banned. An admin may now deactivate / delete other accounts (not superadmins, not self).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseFake } from '../helpers/supabaseFake';

const USER_ADMIN = 'u-aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const EMP_ADMIN = 'e-aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const EMP_OTHER_ADMIN = 'e-bbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const EMP_RECEPTION = 'e-ccccccc-cccc-cccc-cccc-cccccccccccc';
const EMP_SUPER = 'e-ddddddd-dddd-dddd-dddd-dddddddddddd';

const fake = createSupabaseFake();
const mockDb = fake.db;
const mockUpdateUser = vi.fn();
const mockDeleteUser = vi.fn();

vi.mock('fs', async (importOriginal) => {
  const actual: any = await importOriginal();
  const stub = { ...actual, existsSync: () => false, mkdirSync: () => undefined, writeFileSync: () => undefined };
  return { ...stub, default: stub };
});

vi.mock('@/lib/supabaseServer', () => ({
  supabaseServer: {
    auth: {
      getUser: (...args: any[]) => fake.authGetUser(...args), getClaims: (...args: any[]) => fake.authGetClaims(...args),
      admin: {
        updateUserById: (...args: any[]) => mockUpdateUser(...args),
        deleteUser: (...args: any[]) => mockDeleteUser(...args),
        getUserById: () => Promise.resolve({ data: { user: { email_confirmed_at: null } }, error: null }),
      },
    },
    from: (table: string) => fake.client.from(table),
    rpc: (name: string, args?: any) => fake.client.rpc(name, args),
  },
}));

import { PATCH, DELETE } from '@/app/api/employees/route';
import { DELETE as DELETE_PROVIDER } from '@/app/api/providers/route';
import { GET as GET_ROLES } from '@/app/api/roles/route';
import { GET as GET_ME } from '@/app/api/auth/me/route';
import { checkAccountAction, isSuperadminAccount } from '@/lib/accountActivation';

function req(method: string, url: string, body?: any): Request {
  return new Request(`http://localhost:3000${url}`, {
    method,
    headers: new Headers({ 'content-type': 'application/json', Authorization: 'Bearer t' }),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function seed() {
  fake.authGetUser.mockResolvedValue({ data: { user: { id: USER_ADMIN, email: 'admin@clinic.test' } }, error: null });
  mockDb.roles.push(
    { name: 'admin', permissions: [], workspace: 'standard' },
    { name: 'receptionist', permissions: [], workspace: 'standard' },
    { name: 'superadmin', permissions: [], workspace: 'standard' },
  );
  mockDb.employee_accounts.push(
    { id: EMP_ADMIN, employee_id: 'admin@clinic.test', email: 'admin@clinic.test', name: 'Me Admin', role_name: 'admin', auth_user_id: USER_ADMIN },
    { id: EMP_OTHER_ADMIN, employee_id: 'other@clinic.test', email: 'other@clinic.test', name: 'Other Admin', role_name: 'admin', auth_user_id: 'u-other' },
    { id: EMP_RECEPTION, employee_id: 'desk@clinic.test', email: 'desk@clinic.test', name: 'Desk', role_name: 'receptionist', auth_user_id: 'u-desk' },
    { id: EMP_SUPER, employee_id: 'superadmin', email: 'super@clinic.test', name: 'Owner', role_name: 'superadmin', auth_user_id: 'u-super' },
  );
}

const row = (id: string) => mockDb.employee_accounts.find((e: any) => e.id === id);

beforeEach(() => {
  vi.clearAllMocks();
  fake.reset();
  for (const t of ['employee_accounts', 'roles', 'providers']) fake.seed(t, []);
  mockUpdateUser.mockResolvedValue({ data: { user: {} }, error: null });
  mockDeleteUser.mockResolvedValue({ data: {}, error: null });
});

describe('inactive accounts have no access', () => {
  it('a staff-protected endpoint refuses an inactive admin with 403', async () => {
    seed();
    row(EMP_ADMIN).is_active = false;
    const res = await GET_ROLES(req('GET', '/api/roles'));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toMatch(/inactive/i);
  });

  it('the same admin works while active (and when the flag is missing on an old row)', async () => {
    seed();
    expect((await GET_ROLES(req('GET', '/api/roles'))).status).toBe(200);
    row(EMP_ADMIN).is_active = true;
    expect((await GET_ROLES(req('GET', '/api/roles'))).status).toBe(200);
  });

  it('/api/auth/me answers 403 with a machine-readable code', async () => {
    seed();
    row(EMP_ADMIN).is_active = false;
    const res = await GET_ME(req('GET', '/api/auth/me'));
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe('account_inactive');
  });
});

describe('PATCH /api/employees isActive', () => {
  it('an admin can deactivate another admin: flag off, role kept, sign-in banned', async () => {
    seed();
    const res = await PATCH(req('PATCH', '/api/employees', { id: EMP_OTHER_ADMIN, isActive: false }));
    expect(res.status).toBe(200);
    expect(row(EMP_OTHER_ADMIN).is_active).toBe(false);
    expect(row(EMP_OTHER_ADMIN).role_name).toBe('admin');
    expect(mockUpdateUser).toHaveBeenCalledWith('u-other', expect.objectContaining({ ban_duration: '876000h' }));
  });

  it('activating lifts the ban first and then sets the flag', async () => {
    seed();
    row(EMP_RECEPTION).is_active = false;
    const res = await PATCH(req('PATCH', '/api/employees', { id: EMP_RECEPTION, isActive: true }));
    expect(res.status).toBe(200);
    expect(row(EMP_RECEPTION).is_active).toBe(true);
    expect(mockUpdateUser).toHaveBeenCalledWith('u-desk', expect.objectContaining({ ban_duration: 'none' }));
  });

  it('if the ban cannot be lifted the account is NOT marked active', async () => {
    seed();
    row(EMP_RECEPTION).is_active = false;
    mockUpdateUser.mockResolvedValue({ data: null, error: { message: 'auth down' } });
    const res = await PATCH(req('PATCH', '/api/employees', { id: EMP_RECEPTION, isActive: true }));
    expect(res.status).toBe(502);
    expect(row(EMP_RECEPTION).is_active).toBe(false);
  });

  it('if the ban cannot be applied the account is still inactive (the flag is what every request checks)', async () => {
    seed();
    mockUpdateUser.mockResolvedValue({ data: null, error: { message: 'auth down' } });
    const res = await PATCH(req('PATCH', '/api/employees', { id: EMP_RECEPTION, isActive: false }));
    expect(res.status).toBe(200);
    expect(row(EMP_RECEPTION).is_active).toBe(false);
    expect((await res.json()).authSynced).toBe(false);
  });

  it('a superadmin account cannot be deactivated', async () => {
    seed();
    const res = await PATCH(req('PATCH', '/api/employees', { id: EMP_SUPER, isActive: false }));
    expect(res.status).toBe(403);
    expect(row(EMP_SUPER).is_active).toBeUndefined();
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('nobody can deactivate their own account', async () => {
    seed();
    const res = await PATCH(req('PATCH', '/api/employees', { id: EMP_ADMIN, isActive: false }));
    expect(res.status).toBe(400);
    expect(row(EMP_ADMIN).is_active).toBeUndefined();
  });
});

describe('DELETE /api/employees by an admin', () => {
  it('an admin can now delete another admin account (permanent)', async () => {
    seed();
    const res = await DELETE(req('DELETE', `/api/employees?id=${EMP_OTHER_ADMIN}&mode=hard`));
    expect(res.status).toBe(200);
    expect(row(EMP_OTHER_ADMIN)).toBeUndefined();
    expect(mockDeleteUser).toHaveBeenCalledWith('u-other');
  });

  it('soft delete now means Inactive: the role is kept and sign-in is banned', async () => {
    seed();
    const res = await DELETE(req('DELETE', `/api/employees?id=${EMP_RECEPTION}&mode=soft`));
    expect(res.status).toBe(200);
    expect(row(EMP_RECEPTION).is_active).toBe(false);
    expect(row(EMP_RECEPTION).role_name).toBe('receptionist');
    expect(mockUpdateUser).toHaveBeenCalledWith('u-desk', expect.objectContaining({ ban_duration: '876000h' }));
  });

  it('a superadmin account cannot be deleted, by anyone', async () => {
    seed();
    const res = await DELETE(req('DELETE', `/api/employees?id=${EMP_SUPER}&mode=hard`));
    expect(res.status).toBe(403);
    expect(row(EMP_SUPER)).toBeDefined();
  });

  it('nobody can delete their own account', async () => {
    seed();
    const res = await DELETE(req('DELETE', `/api/employees?id=${EMP_ADMIN}&mode=hard`));
    expect(res.status).toBe(400);
    expect(row(EMP_ADMIN)).toBeDefined();
  });

  it('a non-admin caller is still refused', async () => {
    seed();
    fake.authGetUser.mockResolvedValue({ data: { user: { id: 'u-desk', email: 'desk@clinic.test' } }, error: null });
    const res = await DELETE(req('DELETE', `/api/employees?id=${EMP_OTHER_ADMIN}&mode=hard`));
    expect(res.status).toBe(403);
    expect(row(EMP_OTHER_ADMIN)).toBeDefined();
  });
});

describe('checkAccountAction', () => {
  it('recognises superadmin accounts by role or by the owner employee_id', () => {
    expect(isSuperadminAccount({ id: '1', role_name: 'SuperAdmin' })).toBe(true);
    expect(isSuperadminAccount({ id: '1', role_name: 'admin', employee_id: 'superadmin' })).toBe(true);
    expect(isSuperadminAccount({ id: '1', role_name: 'admin' })).toBe(false);
  });

  it('allows activating yourself in principle (a no-op) but never deactivating or deleting', () => {
    const me = { employeeId: 'x' };
    const target = { id: 'x', role_name: 'admin' };
    expect(checkAccountAction(me, target, 'activate').ok).toBe(true);
    expect(checkAccountAction(me, target, 'deactivate').ok).toBe(false);
    expect(checkAccountAction(me, target, 'delete').ok).toBe(false);
  });
});

describe('a doctor follows their account (DEC-118)', () => {
  const provider = (id: string) => mockDb.providers.find((p: any) => p.id === id);

  it('switching the account off takes the matching provider off the booking lists, and on again restores it', async () => {
    seed();
    mockDb.providers.push({ id: 'p-desk', name: 'Desk', phone: null, active: true });
    const off = await PATCH(req('PATCH', '/api/employees', { id: EMP_RECEPTION, isActive: false }));
    expect(off.status).toBe(200);
    expect((await off.json()).providerSync).toBe('updated');
    expect(provider('p-desk').active).toBe(false);

    const on = await PATCH(req('PATCH', '/api/employees', { id: EMP_RECEPTION, isActive: true }));
    expect(on.status).toBe(200);
    expect(provider('p-desk').active).toBe(true);
  });

  it('matches the name regardless of case', async () => {
    seed();
    mockDb.providers.push({ id: 'p-desk', name: 'DESK', phone: null, active: true });
    await PATCH(req('PATCH', '/api/employees', { id: EMP_RECEPTION, isActive: false }));
    expect(provider('p-desk').active).toBe(false);
  });

  it('with two providers of the same name, only the one with the same phone is changed', async () => {
    seed();
    row(EMP_RECEPTION).phone = '0100';
    mockDb.providers.push(
      { id: 'p-a', name: 'Desk', phone: '0100', active: true },
      { id: 'p-b', name: 'Desk', phone: '0200', active: true },
    );
    await PATCH(req('PATCH', '/api/employees', { id: EMP_RECEPTION, isActive: false }));
    expect(provider('p-a').active).toBe(false);
    expect(provider('p-b').active).toBe(true);
  });

  it('when it cannot tell which provider is the person, it changes none (but the account is still switched off)', async () => {
    seed();
    mockDb.providers.push(
      { id: 'p-a', name: 'Desk', phone: '0100', active: true },
      { id: 'p-b', name: 'Desk', phone: '0200', active: true },
    );
    const res = await PATCH(req('PATCH', '/api/employees', { id: EMP_RECEPTION, isActive: false }));
    expect(res.status).toBe(200);
    expect((await res.json()).providerSync).toBe('ambiguous');
    expect(row(EMP_RECEPTION).is_active).toBe(false);
    expect(provider('p-a').active).toBe(true);
    expect(provider('p-b').active).toBe(true);
  });

  it('an employee with no provider row is simply switched off', async () => {
    seed();
    const res = await PATCH(req('PATCH', '/api/employees', { id: EMP_RECEPTION, isActive: false }));
    expect(res.status).toBe(200);
    expect((await res.json()).providerSync).toBe('none');
  });

  it('soft and permanent delete also take the doctor off the lists, keeping the provider row', async () => {
    seed();
    mockDb.providers.push({ id: 'p-desk', name: 'Desk', phone: null, active: true });
    await DELETE(req('DELETE', `/api/employees?id=${EMP_RECEPTION}&mode=soft`));
    expect(provider('p-desk').active).toBe(false);

    provider('p-desk').active = true;
    await DELETE(req('DELETE', `/api/employees?id=${EMP_RECEPTION}&mode=hard`));
    expect(row(EMP_RECEPTION)).toBeUndefined();
    expect(provider('p-desk')).toBeDefined();
    expect(provider('p-desk').active).toBe(false);
  });

  it('soft-deleting a doctor from the Doctors screen switches the account off and keeps the role', async () => {
    seed();
    fake.authGetUser.mockResolvedValue({ data: { user: { id: 'u-super', email: 'super@clinic.test' } }, error: null });
    mockDb.providers.push({ id: 'p-desk', name: 'Desk', phone: null, active: true });
    const res = await DELETE_PROVIDER(req('DELETE', '/api/providers?id=p-desk&mode=soft'));
    expect(res.status).toBe(200);
    expect(provider('p-desk').active).toBe(false);
    expect(row(EMP_RECEPTION).is_active).toBe(false);
    expect(row(EMP_RECEPTION).role_name).toBe('receptionist');
    expect(mockUpdateUser).toHaveBeenCalledWith('u-desk', expect.objectContaining({ ban_duration: '876000h' }));
  });

  it('that soft delete leaves another employee who merely shares the name alone', async () => {
    seed();
    fake.authGetUser.mockResolvedValue({ data: { user: { id: 'u-super', email: 'super@clinic.test' } }, error: null });
    mockDb.employee_accounts.push({ id: 'e-twin', employee_id: 'twin@clinic.test', email: 'twin@clinic.test', name: 'Desk', role_name: 'receptionist', auth_user_id: 'u-twin', phone: '0999' });
    row(EMP_RECEPTION).phone = '0100';
    mockDb.providers.push({ id: 'p-desk', name: 'Desk', phone: '0100', active: true });
    await DELETE_PROVIDER(req('DELETE', '/api/providers?id=p-desk&mode=soft'));
    expect(row(EMP_RECEPTION).is_active).toBe(false);
    expect(row('e-twin').is_active).toBeUndefined();
    expect(row('e-twin').role_name).toBe('receptionist');
  });
});
