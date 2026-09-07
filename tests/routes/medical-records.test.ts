/**
 * Route-level tests for /api/medical-records — RISK-081 / CORRUPT-D03.
 *
 * medical_records used to be UNIQUE(customer_id), so a second visit's intake form silently
 * overwrote the first visit's baseline data with no way to recover it. It is now
 * UNIQUE(customer_id, reservation_id): one row per visit, plus at most one reservation_id-less
 * "patient profile" row for the visit-independent edit from MedicalFormModal.tsx.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createSupabaseFake } from '../helpers/supabaseFake';

const fake = createSupabaseFake();

vi.mock('@/lib/supabaseServer', () => ({
  supabaseServer: {
    auth: { getUser: (...args: any[]) => fake.authGetUser(...args) },
    from: (table: string) => fake.client.from(table),
    rpc: (name: string, args?: any) => fake.client.rpc(name, args),
  },
}));

import { GET, POST } from '@/app/api/medical-records/route';

const CUSTOMER_ID = 'cust-1';
const USER_ID = 'user-1';
const EMP_ID = 'emp-1';

function staffReq(url: string, opts: { method?: string; body?: any } = {}) {
  const headers = new Headers({ 'content-type': 'application/json', Authorization: 'Bearer staff-token' });
  return new Request(url, {
    method: opts.method || 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
}

beforeEach(() => {
  fake.reset();
  fake.authGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
  fake.seed('employee_accounts', [{ id: EMP_ID, auth_user_id: USER_ID, role_name: 'doctor', email: 'doc@test.com' }]);
  fake.seed('roles', [{ name: 'doctor', permissions: [] }]);
});

describe('POST /api/medical-records — per-visit history', () => {
  it('a second visit (new reservation_id) does not overwrite the first visit\'s row', async () => {
    await POST(staffReq('http://localhost/api/medical-records', {
      method: 'POST',
      body: { customer_id: CUSTOMER_ID, reservation_id: 'res-1', allergies: 'Penicillin' },
    }));
    await POST(staffReq('http://localhost/api/medical-records', {
      method: 'POST',
      body: { customer_id: CUSTOMER_ID, reservation_id: 'res-2', allergies: 'None' },
    }));

    expect(fake.db.medical_records).toHaveLength(2);
    const visit1 = fake.db.medical_records.find((r: any) => r.reservation_id === 'res-1');
    const visit2 = fake.db.medical_records.find((r: any) => r.reservation_id === 'res-2');
    expect(visit1?.allergies).toBe('Penicillin');
    expect(visit2?.allergies).toBe('None');
  });

  it('re-saving the same visit (same reservation_id) updates that one row, not a new one', async () => {
    await POST(staffReq('http://localhost/api/medical-records', {
      method: 'POST',
      body: { customer_id: CUSTOMER_ID, reservation_id: 'res-1', allergies: 'Draft answer' },
    }));
    await POST(staffReq('http://localhost/api/medical-records', {
      method: 'POST',
      body: { customer_id: CUSTOMER_ID, reservation_id: 'res-1', allergies: 'Final answer' },
    }));

    expect(fake.db.medical_records).toHaveLength(1);
    expect(fake.db.medical_records[0].allergies).toBe('Final answer');
  });

  it('a visit-scoped save and a profile-level save (no reservation_id) do not collide', async () => {
    await POST(staffReq('http://localhost/api/medical-records', {
      method: 'POST',
      body: { customer_id: CUSTOMER_ID, allergies: 'Profile-level baseline' },
    }));
    await POST(staffReq('http://localhost/api/medical-records', {
      method: 'POST',
      body: { customer_id: CUSTOMER_ID, reservation_id: 'res-1', allergies: 'This visit only' },
    }));

    expect(fake.db.medical_records).toHaveLength(2);
    const profileRow = fake.db.medical_records.find((r: any) => !r.reservation_id);
    const visitRow = fake.db.medical_records.find((r: any) => r.reservation_id === 'res-1');
    expect(profileRow?.allergies).toBe('Profile-level baseline');
    expect(visitRow?.allergies).toBe('This visit only');
  });

  it('repeated profile-level saves (no reservation_id) update one row, not a new one every time', async () => {
    await POST(staffReq('http://localhost/api/medical-records', {
      method: 'POST',
      body: { customer_id: CUSTOMER_ID, allergies: 'First edit' },
    }));
    await POST(staffReq('http://localhost/api/medical-records', {
      method: 'POST',
      body: { customer_id: CUSTOMER_ID, allergies: 'Second edit' },
    }));

    expect(fake.db.medical_records).toHaveLength(1);
    expect(fake.db.medical_records[0].allergies).toBe('Second edit');
  });
});

describe('GET /api/medical-records', () => {
  it('with no reservationId, returns the most recently updated row for the customer', async () => {
    fake.seed('medical_records', [
      { id: 'mr-1', customer_id: CUSTOMER_ID, reservation_id: 'res-1', allergies: 'Old visit', updated_at: '2026-01-01T00:00:00Z' },
      { id: 'mr-2', customer_id: CUSTOMER_ID, reservation_id: 'res-2', allergies: 'Latest visit', updated_at: '2026-02-01T00:00:00Z' },
    ]);
    const res = await GET(staffReq(`http://localhost/api/medical-records?customerId=${CUSTOMER_ID}`));
    const body = await res.json();
    expect(body.form.allergies).toBe('Latest visit');
  });

  it('with a reservationId, returns that specific visit\'s row even if it is not the latest', async () => {
    fake.seed('medical_records', [
      { id: 'mr-1', customer_id: CUSTOMER_ID, reservation_id: 'res-1', allergies: 'Old visit', updated_at: '2026-01-01T00:00:00Z' },
      { id: 'mr-2', customer_id: CUSTOMER_ID, reservation_id: 'res-2', allergies: 'Latest visit', updated_at: '2026-02-01T00:00:00Z' },
    ]);
    const res = await GET(staffReq(`http://localhost/api/medical-records?customerId=${CUSTOMER_ID}&reservationId=res-1`));
    const body = await res.json();
    expect(body.form.allergies).toBe('Old visit');
  });

  it('does not error when a customer has multiple rows and no reservationId is given', async () => {
    // This is the exact regression this fix must not reintroduce: .single() throws on >1 rows.
    fake.seed('medical_records', [
      { id: 'mr-1', customer_id: CUSTOMER_ID, reservation_id: 'res-1', allergies: 'A', updated_at: '2026-01-01T00:00:00Z' },
      { id: 'mr-2', customer_id: CUSTOMER_ID, reservation_id: 'res-2', allergies: 'B', updated_at: '2026-02-01T00:00:00Z' },
      { id: 'mr-3', customer_id: CUSTOMER_ID, reservation_id: null, allergies: 'C', updated_at: '2026-01-15T00:00:00Z' },
    ]);
    const res = await GET(staffReq(`http://localhost/api/medical-records?customerId=${CUSTOMER_ID}`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.form.allergies).toBe('B');
  });
});
