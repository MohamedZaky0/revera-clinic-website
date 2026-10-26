/**
 * RISK-128: the staff profile screens read employee_accounts, providers, hr_attendance, doctor_payroll and
 * reservations straight from the browser with the public key. Those reads now go through these routes, which
 * only ever return the signed-in caller's own data: no id is taken from the request.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseFake } from '../helpers/supabaseFake';

const fake = createSupabaseFake();
const mockDb = fake.db;

vi.mock('fs', async (importOriginal) => {
  const actual: any = await importOriginal();
  const stub = { ...actual, existsSync: () => false };
  return { ...stub, default: stub };
});

vi.mock('@/lib/supabaseServer', () => ({
  supabaseServer: {
    auth: { getUser: (...args: any[]) => fake.authGetUser(...args), getClaims: (...args: any[]) => fake.authGetClaims(...args) },
    from: (table: string) => fake.client.from(table),
  },
}));

import { GET as GET_PROFILE } from '@/app/api/profile/route';
import { GET as GET_ATTENDANCE } from '@/app/api/profile/attendance/route';
import { GET as GET_PAYROLL } from '@/app/api/profile/payroll/route';

const MY_USER = 'u-me';
const MY_EMP = 'e-me';
const OTHER_EMP = 'e-other';
const MY_PROVIDER = 'p-me';

function get(path: string, withToken = true): Request {
  return new Request(`http://localhost:3000${path}`, {
    headers: withToken ? new Headers({ Authorization: 'Bearer t' }) : new Headers(),
  });
}

beforeEach(() => {
  fake.reset();
  for (const t of ['employee_accounts', 'roles', 'providers', 'hr_attendance', 'doctor_payroll', 'reservations', 'page_settings']) fake.seed(t, []);
  fake.authGetUser.mockResolvedValue({ data: { user: { id: MY_USER } }, error: null });
  mockDb.roles.push({ name: 'reception', permissions: [] });
  mockDb.employee_accounts.push(
    { id: MY_EMP, employee_id: 'EMP-1', name: 'Dr. Sara Adel', email: 'sara@clinic.test', phone: '0100', role_name: 'reception', auth_user_id: MY_USER, salary: 9000, required_target_amount: 50000, working_days_hours: null },
    { id: OTHER_EMP, employee_id: 'EMP-2', name: 'Other Person', email: 'other@clinic.test', phone: '0111', role_name: 'reception', auth_user_id: 'u-other', salary: 12000 },
  );
});

describe('GET /api/profile', () => {
  it('rejects a request with no token', async () => {
    const res = await GET_PROFILE(get('/api/profile', false));
    expect(res.status).toBe(401);
  });

  it('returns the caller\'s own employee row and never anybody else\'s', async () => {
    const res = await GET_PROFILE(get('/api/profile'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.employee.id).toBe(MY_EMP);
    expect(body.employee.salary).toBe(9000);
    expect(JSON.stringify(body)).not.toContain('Other Person');
  });

  it('ignores an id passed in the query string', async () => {
    const res = await GET_PROFILE(get(`/api/profile?id=${OTHER_EMP}&employeeId=${OTHER_EMP}`));
    const body = await res.json();
    expect(body.employee.id).toBe(MY_EMP);
  });

  it('attaches the provider row that belongs to the caller (matched by phone, then name)', async () => {
    mockDb.providers.push(
      { id: 'p-x', name: 'Unrelated Doctor', phone: '0999' },
      { id: MY_PROVIDER, name: 'Sara Adel', phone: '0100', fixed_salary: 15000 },
    );
    const res = await GET_PROFILE(get('/api/profile'));
    const body = await res.json();
    expect(body.provider?.id).toBe(MY_PROVIDER);
  });

  // The provider row's salary and payroll are shown to the caller, so a wrong match would show one person
  // another person's pay. Only an exact, unique link counts.
  it('does not match a provider whose name merely contains the employee\'s name or e-mail prefix', async () => {
    mockDb.employee_accounts.find((e: any) => e.id === MY_EMP)!.name = 'Sara';
    mockDb.employee_accounts.find((e: any) => e.id === MY_EMP)!.phone = '0100';
    mockDb.providers.push({ id: 'p-long', name: 'Saraya Mahmoud', phone: '0777', fixed_salary: 40000 });
    const body = await (await GET_PROFILE(get('/api/profile'))).json();
    expect(body.provider).toBeNull();
  });

  it('matches by exact name ignoring honorifics and case when there is no phone link', async () => {
    mockDb.employee_accounts.find((e: any) => e.id === MY_EMP)!.phone = null;
    mockDb.providers.push({ id: MY_PROVIDER, name: 'DR. sara adel', phone: '0555' });
    const body = await (await GET_PROFILE(get('/api/profile'))).json();
    expect(body.provider?.id).toBe(MY_PROVIDER);
  });

  it('does not guess between two providers that share the caller\'s phone', async () => {
    mockDb.providers.push(
      { id: 'p-a', name: 'First Doctor', phone: '0100' },
      { id: 'p-b', name: 'Second Doctor', phone: '0100' },
    );
    mockDb.employee_accounts.find((e: any) => e.id === MY_EMP)!.name = 'Nobody Matching';
    const body = await (await GET_PROFILE(get('/api/profile'))).json();
    expect(body.provider).toBeNull();
  });

  it('does not hand another doctor\'s payroll to the caller through a loose match', async () => {
    mockDb.employee_accounts.find((e: any) => e.id === MY_EMP)!.name = 'Sara';
    mockDb.providers.push({ id: 'p-long', name: 'Saraya Mahmoud', phone: '0777', fixed_salary: 40000 });
    mockDb.doctor_payroll.push({ id: 'dpx', provider_id: 'p-long', month: '2026-10', fixed_salary: 40000 });
    const body = await (await GET_PAYROLL(get('/api/profile/payroll?from=2026-10-01&to=2026-10-31&view=doctor'))).json();
    expect(body.provider).toBeNull();
    expect(body.doctorPayroll).toBeNull();
  });

  it('returns provider null when the caller is not a doctor', async () => {
    mockDb.providers.push({ id: 'p-x', name: 'Unrelated Doctor', phone: '0999' });
    const body = await (await GET_PROFILE(get('/api/profile'))).json();
    expect(body.provider).toBeNull();
  });

  it('is refused for an inactive account', async () => {
    mockDb.employee_accounts.find((e: any) => e.id === MY_EMP)!.is_active = false;
    const res = await GET_PROFILE(get('/api/profile'));
    expect(res.status).toBe(403);
  });
});

describe('GET /api/profile/attendance', () => {
  beforeEach(() => {
    mockDb.hr_attendance.push(
      { id: 'a1', employee_id: MY_EMP, date: '2026-10-05', status: 'Present' },
      { id: 'a2', employee_id: MY_EMP, date: '2026-10-20', status: 'Late' },
      { id: 'a3', employee_id: MY_EMP, date: '2026-09-30', status: 'Present' },
      { id: 'a4', employee_id: OTHER_EMP, date: '2026-10-06', status: 'Present' },
    );
  });

  it('returns only the caller\'s rows inside the date range, newest first', async () => {
    const res = await GET_ATTENDANCE(get('/api/profile/attendance?from=2026-10-01&to=2026-10-31'));
    expect(res.status).toBe(200);
    const rows = await res.json();
    expect(rows.map((r: any) => r.id)).toEqual(['a2', 'a1']);
  });

  it('never returns another employee\'s rows even when asked for one', async () => {
    const res = await GET_ATTENDANCE(get(`/api/profile/attendance?from=2026-10-01&to=2026-10-31&employeeId=${OTHER_EMP}&employee_id=${OTHER_EMP}`));
    const rows = await res.json();
    expect(rows.every((r: any) => r.employee_id === MY_EMP)).toBe(true);
  });

  it('rejects a missing or malformed date range', async () => {
    expect((await GET_ATTENDANCE(get('/api/profile/attendance'))).status).toBe(400);
    expect((await GET_ATTENDANCE(get('/api/profile/attendance?from=10/01/2026&to=2026-10-31'))).status).toBe(400);
  });

  it('rejects a request with no token', async () => {
    const res = await GET_ATTENDANCE(get('/api/profile/attendance?from=2026-10-01&to=2026-10-31', false));
    expect(res.status).toBe(401);
  });
});

describe('GET /api/profile/payroll', () => {
  beforeEach(() => {
    mockDb.providers.push({ id: MY_PROVIDER, name: 'Sara Adel', phone: '0100', fixed_salary: 15000, target_amount: 80000 });
    mockDb.doctor_payroll.push(
      { id: 'dp1', provider_id: MY_PROVIDER, month: '2026-10', fixed_salary: 15000, commission_value: 1200 },
      { id: 'dp2', provider_id: MY_PROVIDER, month: '2026-09', fixed_salary: 14000 },
      { id: 'dp3', provider_id: 'p-someone-else', month: '2026-10', fixed_salary: 99999 },
    );
    mockDb.reservations.push(
      { id: 'r1', date: '2026-10-05', status: 'completed', amount_paid: 800, provider_id: MY_PROVIDER, doctor_name: 'Dr. Sara Adel', created_by_employee_id: OTHER_EMP },
      { id: 'r2', date: '2026-10-06', status: 'approved', amount_paid: 200, provider_id: null, doctor_name: 'Dr. Sara Adel', created_by_employee_id: OTHER_EMP },
      { id: 'r3', date: '2026-10-07', status: 'cancelled', amount_paid: 500, provider_id: MY_PROVIDER, doctor_name: 'Dr. Sara Adel' },
      { id: 'r4', date: '2026-09-30', status: 'completed', amount_paid: 400, provider_id: MY_PROVIDER, doctor_name: 'Dr. Sara Adel' },
      { id: 'r5', date: '2026-10-08', status: 'completed', amount_paid: 300, provider_id: 'p-someone-else', doctor_name: 'Dr. Other', created_by_employee_id: MY_EMP },
      { id: 'r6', date: '2026-10-09', status: 'completed', amount_paid: 1000, provider_id: 'p-x', doctor_name: 'Dr. X', created_by_employee_id: OTHER_EMP },
    );
  });

  it('returns the caller\'s own employee, provider and the month\'s doctor payroll row', async () => {
    const res = await GET_PAYROLL(get('/api/profile/payroll?from=2026-10-01&to=2026-10-31&view=doctor'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.employee.id).toBe(MY_EMP);
    expect(body.provider.id).toBe(MY_PROVIDER);
    expect(body.doctorPayroll.id).toBe('dp1');
  });

  it('doctor view counts only paid, non-cancelled bookings assigned to the caller inside the range', async () => {
    const body = await (await GET_PAYROLL(get('/api/profile/payroll?from=2026-10-01&to=2026-10-31&view=doctor'))).json();
    // r1 (800, by provider id) + r2 (200, by doctor name); not r3 (cancelled), r4 (September), r5/r6 (other doctors)
    expect(body.targetRevenue).toBe(1000);
  });

  it('staff view counts the bookings the caller created', async () => {
    const body = await (await GET_PAYROLL(get('/api/profile/payroll?from=2026-10-01&to=2026-10-31&view=staff'))).json();
    expect(body.targetRevenue).toBe(300);
  });

  it('does not add up everybody\'s bookings when the caller has nothing to match on', async () => {
    mockDb.providers.length = 0;
    mockDb.employee_accounts.find((e: any) => e.id === MY_EMP)!.name = 'Employee';
    const body = await (await GET_PAYROLL(get('/api/profile/payroll?from=2026-10-01&to=2026-10-31&view=doctor'))).json();
    expect(body.provider).toBeNull();
    expect(body.targetRevenue).toBe(0);
  });

  it('rejects a missing date range and an unauthenticated request', async () => {
    expect((await GET_PAYROLL(get('/api/profile/payroll'))).status).toBe(400);
    expect((await GET_PAYROLL(get('/api/profile/payroll?from=2026-10-01&to=2026-10-31', false))).status).toBe(401);
  });
});
