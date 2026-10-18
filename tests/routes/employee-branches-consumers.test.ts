/**
 * Server-side consumers of an employee's branch, once an employee can have several (DEC-110).
 *
 * `employee_accounts.branch_id` stays the primary branch; `branch_ids` is the full assignment.
 * Two routes act on "the employee's branch":
 *
 *  - POST /api/hr/attendance  (GPS check-in, 800 m radius). The employee must be near THEIR branch.
 *    With several branches, near ANY of them is enough -- otherwise someone who works at both sites
 *    could only ever clock in at the primary one, which defeats assigning them to both.
 *  - GET /api/reception/dashboard  names the employee's branch. A multi-branch employee sees the
 *    branch they are currently working in (passed as ?branchId=) if it is one of theirs.
 *
 * Single-branch behaviour -- including a row written before `branch_ids` existed -- must be unchanged.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseFake } from '../helpers/supabaseFake';

const fake = createSupabaseFake();

vi.mock('@/lib/supabaseServer', () => ({
  supabaseServer: {
    auth: { getUser: (...args: any[]) => fake.authGetUser(...args) },
    from: (table: string) => fake.client.from(table),
  },
}));

import { POST as ATTENDANCE_POST } from '@/app/api/hr/attendance/route';
import { GET as DASHBOARD_GET } from '@/app/api/reception/dashboard/route';

const USER = 'b1111111-1111-1111-1111-111111111111';
const EMP = 'a1111111-1111-1111-1111-111111111111';

// Two clinics ~ 12 km apart; "far" is a third point nowhere near either.
const ZAYED = { id: 'br-zayed', name_en: 'Zayed', name_ar: 'زايد', latitude: 30.0444, longitude: 31.2357 };
const CAIRO = { id: 'br-cairo', name_en: 'New Cairo', name_ar: 'القاهرة الجديدة', latitude: 30.1500, longitude: 31.4000 };
const FAR = { latitude: 31.2000, longitude: 29.9500 };

function checkIn(lat: number, lng: number) {
  return ATTENDANCE_POST(
    new Request('http://localhost:3000/api/hr/attendance', {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: 'Bearer t' },
      body: JSON.stringify({ employeeId: EMP, latitude: lat, longitude: lng, accuracy: 10 }),
    })
  );
}

function seedEmployee(extra: Record<string, any>) {
  fake.authGetUser.mockResolvedValue({ data: { user: { id: USER } }, error: null });
  fake.seed('employee_accounts', [
    { id: EMP, email: 'staff@clinic.test', employee_id: 'S-1', role_name: 'receptionist', department: 'Reception', auth_user_id: USER, ...extra },
  ]);
}

beforeEach(() => {
  vi.clearAllMocks();
  fake.reset();
  fake.seed('branches', [ZAYED, CAIRO]);
  fake.seed('hr_attendance', []);
  fake.seed('roles', [{ name: 'receptionist', permissions: [] }]);
  fake.seed('reservations', []);
  fake.seed('providers', []);
  fake.seed('services', []);
  fake.seed('page_settings', []);
});

describe('POST /api/hr/attendance — GPS check-in with several branches', () => {
  it('a multi-branch employee can check in at their SECOND branch', async () => {
    seedEmployee({ branch_id: 'br-zayed', branch_ids: ['br-zayed', 'br-cairo'] });

    const res = await checkIn(CAIRO.latitude, CAIRO.longitude);

    expect(res.status).toBe(200);
    expect(fake.rows('hr_attendance')[0].status).toBe('Present');
  });

  it('...and at their primary branch', async () => {
    seedEmployee({ branch_id: 'br-zayed', branch_ids: ['br-zayed', 'br-cairo'] });

    const res = await checkIn(ZAYED.latitude, ZAYED.longitude);

    expect(res.status).toBe(200);
    expect(fake.rows('hr_attendance')[0].status).toBe('Present');
  });

  it('still refuses a multi-branch employee who is near neither of their branches', async () => {
    seedEmployee({ branch_id: 'br-zayed', branch_ids: ['br-zayed', 'br-cairo'] });

    const res = await checkIn(FAR.latitude, FAR.longitude);

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('not_in_location');
    expect(fake.rows('hr_attendance')[0].status).toBe('Out of Location');
  });

  it('a single-branch employee is still tied to that one branch (standing at another branch is refused)', async () => {
    seedEmployee({ branch_id: 'br-zayed', branch_ids: ['br-zayed'] });

    const res = await checkIn(CAIRO.latitude, CAIRO.longitude);

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('not_in_location');
  });

  it('a row written before branch_ids existed (branch_id only) behaves exactly as before', async () => {
    seedEmployee({ branch_id: 'br-zayed' });

    expect((await checkIn(ZAYED.latitude, ZAYED.longitude)).status).toBe(200);
    fake.seed('hr_attendance', []);
    const away = await checkIn(CAIRO.latitude, CAIRO.longitude);
    expect(away.status).toBe(400);
    expect((await away.json()).error).toBe('not_in_location');
  });

  it('an employee with no branch at all is told so', async () => {
    seedEmployee({ branch_id: null, branch_ids: [] });

    const res = await checkIn(ZAYED.latitude, ZAYED.longitude);

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('no_branch');
  });

  it('measures against the branches that HAVE a location when another assigned branch has none', async () => {
    fake.seed('branches', [ZAYED, { id: 'br-nolocation', name_en: 'Pop-up', latitude: null, longitude: null }]);
    seedEmployee({ branch_id: 'br-nolocation', branch_ids: ['br-nolocation', 'br-zayed'] });

    const res = await checkIn(ZAYED.latitude, ZAYED.longitude);

    expect(res.status).toBe(200);
  });

  it('reports no_location_configured (naming the primary branch) when none of their branches has a location', async () => {
    fake.seed('branches', [{ id: 'br-nolocation', name_en: 'Pop-up', latitude: null, longitude: null }]);
    seedEmployee({ branch_id: 'br-nolocation', branch_ids: ['br-nolocation'] });

    const res = await checkIn(ZAYED.latitude, ZAYED.longitude);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('no_location_configured');
    expect(body.message).toContain('Pop-up');
  });
});

describe('GET /api/reception/dashboard — which branch is named', () => {
  async function branchNameFor(query: string) {
    const res = await DASHBOARD_GET(
      new Request(`http://localhost:3000/api/reception/dashboard?employeeId=${EMP}${query}`, {
        headers: { Authorization: 'Bearer t' },
      })
    );
    expect(res.status).toBe(200);
    return (await res.json()).receptionist;
  }

  it('names the primary branch by default', async () => {
    seedEmployee({ branch_id: 'br-zayed', branch_ids: ['br-zayed', 'br-cairo'] });
    const r = await branchNameFor('');
    expect(r.branchNameEn).toBe('Zayed');
  });

  it('names the branch the employee is currently working in, when it is one of theirs', async () => {
    seedEmployee({ branch_id: 'br-zayed', branch_ids: ['br-zayed', 'br-cairo'] });
    const r = await branchNameFor('&branchId=br-cairo');
    expect(r.branchNameEn).toBe('New Cairo');
    expect(r.branchId).toBe('br-cairo');
  });

  it('ignores a requested branch that is NOT one of theirs and keeps their primary', async () => {
    seedEmployee({ branch_id: 'br-zayed', branch_ids: ['br-zayed'] });
    const r = await branchNameFor('&branchId=br-cairo');
    expect(r.branchNameEn).toBe('Zayed');
    expect(r.branchId).toBe('br-zayed');
  });
});
