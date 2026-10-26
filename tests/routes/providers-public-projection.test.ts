/**
 * RISK-140 / DEC-134: GET /api/providers no longer hands staff-only data to anonymous callers.
 *
 *  - no Authorization header                 -> public projection (allow-list), shared-cacheable
 *  - junk token / expired token              -> public projection, NOT 401/500, private no-store
 *  - valid token of a non-staff user         -> public projection
 *  - valid staff token                       -> the full response, unchanged
 *  - the token check itself failing (503)    -> that error, never a degraded list
 *  - the anonymous path does no staff-only work: no reservations / employee_accounts reads, no writes
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthRetryableFetchError } from '@supabase/supabase-js';
import { createSupabaseFake } from '../helpers/supabaseFake';
import { PUBLIC_PROVIDER_KEYS } from '@/lib/publicProvider';

const fake = createSupabaseFake();

vi.mock('@/lib/supabaseServer', () => {
  const server = {
    auth: { getUser: (...args: any[]) => fake.authGetUser(...args), getClaims: (...args: any[]) => fake.authGetClaims(...args) },
    from: (table: string) => fake.client.from(table),
    rpc: (name: string, args?: any) => fake.client.rpc(name, args),
  };
  return { supabaseServer: server, getSupabaseServer: () => server };
});

import { GET } from '@/app/api/providers/route';

const USER_ADMIN = 'u-admin-0000-0000-0000-000000000001';
const USER_PATIENT = 'u-patient-000-0000-0000-000000000002';
const PUBLIC_CACHE = 'public, s-maxage=60, stale-while-revalidate=300';

const SECRET_NEEDLES = [
  'phone', 'email', 'nationalId', 'national_id', 'fixedSalary', 'fixed_salary', 'salary',
  'commission', 'serviceCommissions', 'service_commissions', 'bookings', 'employmentType',
  'employment_type', 'languages', 'sessionType', 'session_type', '"gender"', '"age"',
  '01099998888', 'dr.secret@clinic.test', '29801011234567', '9000', '777',
];

function get(authorization?: string): Request {
  const headers = new Headers();
  if (authorization !== undefined) headers.set('Authorization', authorization);
  return new Request('http://localhost:3000/api/providers', { headers });
}

function b64url(o: object) {
  return Buffer.from(JSON.stringify(o)).toString('base64url');
}
/** A JWT-shaped token whose exp is in the past: the verifier refuses it without any network call. */
function expiredToken() {
  return `${b64url({ alg: 'ES256', typ: 'JWT', kid: 'k1' })}.${b64url({ sub: USER_ADMIN, exp: Math.floor(Date.now() / 1000) - 3600 })}.sig`;
}

function seedDoctor() {
  fake.seed('providers', [
    {
      id: 'pr1',
      name: 'Dr Secret',
      services: ['Laser', 'Facial'],
      more_count: 0,
      rating: 4.5,
      image: '/img/dr.png',
      phone: '01099998888',
      gender: 'Female',
      age: 41,
      specialty: 'Dermatology',
      national_id: '29801011234567',
      branch_id: 'b1',
      start_date: '2020-01-01',
      fixed_salary: 9000,
      commission_type: 'percentage',
      commission_value: 20,
      commission_base: 'gross',
      commission_fixed_component: 777,
      service_commissions: [{ service: 'Laser', type: 'percentage', value: 30 }],
      active: true,
      working_days_hours: {
        email: 'dr.secret@clinic.test',
        employment_type: 'Full Time',
        languages: ['Arabic'],
        session_type: 'both',
        branch_ids: ['b1'],
        branch_schedules: {
          b1: {
            in_person: {
              Monday: { isOpen: true, start: '09:00', end: '17:00', breakStart: '13:00', salary: 5, shifts: [{ start: '09:00', end: '12:00', note: 'x' }] },
              Tuesday: { isOpen: false, start: '09:00', end: '17:00' },
            },
            online: { Monday: { isOpen: true, start: '18:00', end: '20:00' } },
            extraSecret: 'nope',
          },
        },
        topSecret: 'nope',
      },
    },
  ]);
  fake.seed('reservations', [
    { doctor_name: 'Dr Secret', status: 'approved' },
    { doctor_name: 'dr secret', status: 'completed' },
    { doctor_name: 'Dr Secret', status: 'rejected' },
  ]);
  fake.seed('roles', [{ name: 'admin', permissions: [], workspace: 'standard' }]);
  fake.seed('employee_accounts', [
    { id: 'e-admin', employee_id: 'ADM-001', email: 'admin@clinic.test', role_name: 'admin', auth_user_id: USER_ADMIN, is_active: true },
  ]);
}

function asStaff() {
  fake.authGetUser.mockResolvedValue({ data: { user: { id: USER_ADMIN, email: 'admin@clinic.test' } }, error: null });
}

beforeEach(() => {
  fake.reset();
  seedDoctor();
  fake.authGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'invalid JWT' } });
});

function expectPublicShape(body: any[]) {
  expect(body).toHaveLength(1);
  expect(Object.keys(body[0]).sort()).toEqual([...PUBLIC_PROVIDER_KEYS].sort());
  expect(body[0]).toEqual({
    id: 'pr1',
    name: 'Dr Secret',
    specialty: 'Dermatology',
    image: '/img/dr.png',
    services: ['Laser', 'Facial'],
    rating: 4.5,
    active: true,
    branchId: 'b1',
    workingDaysHours: {
      branch_ids: ['b1'],
      branch_schedules: {
        b1: {
          in_person: {
            Monday: { isOpen: true, start: '09:00', end: '17:00', shifts: [{ start: '09:00', end: '12:00' }] },
            Tuesday: { isOpen: false, start: '09:00', end: '17:00' },
          },
          online: { Monday: { isOpen: true, start: '18:00', end: '20:00' } },
        },
      },
    },
  });
  // Nothing secret anywhere in the serialized JSON, nested included.
  const json = JSON.stringify(body);
  for (const needle of SECRET_NEEDLES) {
    expect(json, `leaked "${needle}"`).not.toContain(needle);
  }
  expect(json).not.toContain('extraSecret');
  expect(json).not.toContain('topSecret');
  expect(json).not.toContain('breakStart');
}

describe('GET /api/providers: anonymous callers', () => {
  it('no Authorization header: exactly the allow-listed keys, shared-cacheable', async () => {
    const res = await GET(get());
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe(PUBLIC_CACHE);
    expect(res.headers.get('Vary')).toBe('Authorization');
    expectPublicShape(await res.json());
  });

  it('does no staff-only work: no reservations or employee_accounts reads, no writes', async () => {
    // A doctor-flagged employee with no providers row: the staff auto-sync would insert one.
    fake.seed('employee_accounts', [
      { id: 'e-new', name: 'New Doc', phone: '0100', salary: 5000, role_name: 'nurse', is_also_doctor: true },
    ]);
    const fromSpy = vi.spyOn(fake.client, 'from');
    const res = await GET(get());
    expect(res.status).toBe(200);
    const tables = fromSpy.mock.calls.map((c) => c[0]);
    expect(tables).toEqual(['providers']);
    expect(fake.rows('providers')).toHaveLength(1);
    fromSpy.mockRestore();
  });

  it('a junk token gets the public projection (not 401/500), private no-store', async () => {
    const res = await GET(get('Bearer not-a-real-token'));
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
    expectPublicShape(await res.json());
  });

  it('an empty bearer value gets the public projection', async () => {
    const res = await GET(get('Bearer '));
    expect(res.status).toBe(200);
    expectPublicShape(await res.json());
  });

  it('an expired token gets the public projection, private no-store', async () => {
    const res = await GET(get(`Bearer ${expiredToken()}`));
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
    expectPublicShape(await res.json());
  });

  it('a valid token of a NON-staff user (patient) gets the public projection', async () => {
    fake.authGetUser.mockResolvedValue({ data: { user: { id: USER_PATIENT, email: 'patient@example.test' } }, error: null });
    const res = await GET(get('Bearer patient-token'));
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
    expectPublicShape(await res.json());
  });

  it('a valid token of an INACTIVE staff account gets the public projection', async () => {
    asStaff();
    fake.seed('employee_accounts', [
      { id: 'e-admin', employee_id: 'ADM-001', email: 'admin@clinic.test', role_name: 'admin', auth_user_id: USER_ADMIN, is_active: false },
    ]);
    const res = await GET(get('Bearer inactive-token'));
    expect(res.status).toBe(200);
    expectPublicShape(await res.json());
  });

  it('a new column added to providers does not appear in the public response (allow-list, not deny-list)', async () => {
    const rows = fake.rows('providers');
    fake.seed('providers', [{ ...rows[0], iban: 'EG000000000000000', home_address: 'secret street' }]);
    const res = await GET(get());
    const json = JSON.stringify(await res.json());
    expect(json).not.toContain('iban');
    expect(json).not.toContain('EG0000');
    expect(json).not.toContain('home_address');
    expect(json).not.toContain('secret street');
  });

  it('an inactive doctor stays in the list with active=false and null schedule stays null', async () => {
    fake.seed('providers', [{ id: 'pr2', name: 'Dr Off', active: false, working_days_hours: null }]);
    const body = await (await GET(get())).json();
    expect(body[0]).toMatchObject({ id: 'pr2', name: 'Dr Off', active: false, workingDaysHours: null, services: [], rating: 0, branchId: null });
  });

  it('with no providers rows the (nonexistent) JSON fallback still yields an empty list, uncached', async () => {
    fake.seed('providers', []);
    const res = await GET(get());
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control') || '').not.toContain('public');
  });
});

describe('GET /api/providers: staff callers', () => {
  it('a valid staff token gets the full response, unchanged, private no-store', async () => {
    asStaff();
    const res = await GET(get('Bearer staff-token'));
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({
      id: 'pr1',
      name: 'Dr Secret',
      bookings: 2,
      services: ['Laser', 'Facial'],
      more: 0,
      rating: 4.5,
      image: '/img/dr.png',
      phone: '01099998888',
      email: 'dr.secret@clinic.test',
      employmentType: 'Full Time',
      languages: ['Arabic'],
      sessionType: 'both',
      active: true,
      gender: 'Female',
      age: 41,
      specialty: 'Dermatology',
      nationalId: '29801011234567',
      branchId: 'b1',
      startDate: '2020-01-01',
      fixedSalary: 9000,
      commissionType: 'percentage',
      commissionValue: 20,
      commissionBase: 'gross',
      commissionFixedComponent: 777,
      serviceCommissions: [{ service: 'Laser', type: 'percentage', value: 30 }],
    });
    expect(body[0].workingDaysHours.topSecret).toBe('nope');
  });

  it('keeps the employee -> provider auto-sync for staff callers', async () => {
    asStaff();
    fake.seed('employee_accounts', [
      { id: 'e-admin', employee_id: 'ADM-001', email: 'admin@clinic.test', role_name: 'admin', auth_user_id: USER_ADMIN, is_active: true },
      { id: 'e-new', name: 'New Doc', phone: '0100', salary: 5000, role_name: 'nurse', is_also_doctor: true },
    ]);
    const res = await GET(get('Bearer staff-token'));
    const body = await res.json();
    expect(body.map((p: any) => p.name).sort()).toEqual(['Dr Secret', 'New Doc']);
    expect(fake.rows('providers').map((p) => p.name).sort()).toEqual(['Dr Secret', 'New Doc']);
  });

  it('when the token check cannot be completed (503) it answers 503 instead of a degraded list', async () => {
    fake.authGetUser.mockResolvedValue({ data: { user: null }, error: new AuthRetryableFetchError('network', 0) });
    const res = await GET(get('Bearer staff-token'));
    expect(res.status).toBe(503);
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
    const body = await res.json();
    expect(Array.isArray(body)).toBe(false);
  });
});
