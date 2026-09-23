/**
 * Route-level tests for GET /api/customers/packages — RISK-090: this handler had no auth check at
 * all (only PATCH called requireStaffAccess), so anyone could pass a phone number and read that
 * patient's packages, prices paid, laser-pulse usage history and product balances.
 *
 * auth-sweep.test.ts already asserts the 401/403 shape for this route, but it calls handlers with
 * NO query params — so it cannot prove the real leak (valid params, no token) is closed. These
 * tests do, and also pin the positive path so the guard can't quietly over-block staff.
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

import { GET } from '@/app/api/customers/packages/route';

const USER_ID = 'staff-user';
const CUSTOMER_ID = '11111111-1111-4111-8111-111111111111';
const PHONE = '01012345678';

function req(query: string, token?: string): Request {
  const headers = new Headers();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return new Request(`http://localhost:3000/api/customers/packages?${query}`, { headers });
}

function seedStaffAuth() {
  fake.authGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
  fake.seed('employee_accounts', [{ id: 'emp-1', auth_user_id: USER_ID, role_name: 'reception' }]);
  fake.seed('roles', [{ name: 'reception', permissions: [] }]);
}

function seedPatientData() {
  fake.seed('customers', [{ id: CUSTOMER_ID, mobile: PHONE }]);
  fake.seed('customer_packages', [
    {
      id: 'cp-1',
      customer_id: CUSTOMER_ID,
      package_id: 'pk-1',
      status: 'active',
      purchased_at: '2026-09-01T10:00:00Z',
      expires_at: '2027-09-01T10:00:00Z',
      price_paid: 4500,
    },
  ]);
}

beforeEach(() => {
  fake.reset();
  seedPatientData();
});

describe('GET /api/customers/packages — authentication (RISK-090)', () => {
  it('rejects a request with no token even when a valid customer_id is supplied, and returns no package data', async () => {
    const res = await GET(req(`customer_id=${CUSTOMER_ID}`));
    expect(res.status).toBe(401);
    const body = JSON.stringify(await res.json());
    expect(body).not.toContain('cp-1');
    expect(body).not.toContain('4500');
  });

  it('rejects a phone-number lookup with no token (the enumeration vector — any phone, no login)', async () => {
    const res = await GET(req(`mobile=${PHONE}`));
    expect(res.status).toBe(401);
    expect(JSON.stringify(await res.json())).not.toContain('cp-1');
  });

  it('checks auth before validating params, so an unauthenticated caller learns nothing about the route shape', async () => {
    const res = await GET(req(''));
    expect(res.status).toBe(401);
  });

  it('rejects a signed-in patient (valid session, no employee_accounts row) with 403', async () => {
    fake.authGetUser.mockResolvedValue({ data: { user: { id: 'patient-user' } }, error: null });
    const res = await GET(req(`customer_id=${CUSTOMER_ID}`, 'patient-token'));
    expect(res.status).toBe(403);
    expect(JSON.stringify(await res.json())).not.toContain('cp-1');
  });
});

describe('GET /api/customers/packages — staff access still works', () => {
  it('returns the patient\'s packages for a staff session, looked up by customer_id', async () => {
    seedStaffAuth();
    const res = await GET(req(`customer_id=${CUSTOMER_ID}`, 'staff-token'));
    expect(res.status).toBe(200);
    const { packages } = await res.json();
    expect(packages).toHaveLength(1);
    expect(packages[0]).toMatchObject({ id: 'cp-1', packageId: 'pk-1', status: 'active', pricePaid: 4500 });
  });

  // RISK-091: BookingDetailsModal, DoctorAccountView, DoctorOngoingSessionTab and admin/page.tsx all look a
  // patient's package up with `?customerId=` (camelCase). The route used to read only `customer_id`,
  // so every one of those calls got a 400 and the callers — which only act on `res.ok` — silently
  // skipped "is this package already sold?" and "which package do I deduct pulses from?".
  it('accepts the camelCase `customerId` param the UI callers actually send', async () => {
    seedStaffAuth();
    const res = await GET(req(`customerId=${CUSTOMER_ID}`, 'staff-token'));
    expect(res.status).toBe(200);
    const { packages } = await res.json();
    expect(packages.map((p: any) => p.id)).toEqual(['cp-1']);
  });

  it('finds the same package by mobile number alone', async () => {
    seedStaffAuth();
    const res = await GET(req(`mobile=${PHONE}`, 'staff-token'));
    expect(res.status).toBe(200);
    const { packages } = await res.json();
    expect(packages.map((p: any) => p.id)).toEqual(['cp-1']);
  });

  it('still returns 400 (after the auth check) when staff supply neither customer_id nor mobile', async () => {
    seedStaffAuth();
    const res = await GET(req('', 'staff-token'));
    expect(res.status).toBe(400);
  });

  it('does not include retail product balances as packages', async () => {
    seedStaffAuth();
    fake.seed('customer_product_balances', [
      {
        id: 'cpb-1',
        customer_id: CUSTOMER_ID,
        product_name: 'Retinol Anti-Aging Serum',
        purchased_quantity: 1,
        remaining_quantity: 1,
        status: 'Active',
      },
    ]);
    const res = await GET(req(`customer_id=${CUSTOMER_ID}`, 'staff-token'));
    expect(res.status).toBe(200);
    const { packages } = await res.json();
    expect(packages).toHaveLength(1);
    expect(packages[0].id).toBe('cp-1');
    expect(packages.some((p: any) => p.packageName === 'Retinol Anti-Aging Serum')).toBe(false);
  });
});

