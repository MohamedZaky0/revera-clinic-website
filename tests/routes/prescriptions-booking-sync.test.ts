/**
 * Unit tests for digital prescription generation, versioning, and Booking Details sync.
 * Tests TC-105: non-UUID booking safety, customer fallback querying, and versioned updates.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseFake } from '../helpers/supabaseFake';

const fake = createSupabaseFake();

vi.mock('@/lib/supabaseServer', () => ({
  supabaseServer: {
    auth: {
      getUser: (...args: any[]) => fake.authGetUser(...args),
      getClaims: (...args: any[]) => fake.authGetClaims(...args),
    },
    from: (table: string) => fake.client.from(table),
    rpc: (name: string, args?: any) => fake.client.rpc(name, args),
  },
}));

import { GET, POST } from '@/app/api/prescriptions/route';

const EMP_ID = 'emp-1';
const USER_ID = 'user-1';
const CUST_ID = 'cust-1';
const UUID_BOOKING_ID = 'a0000000-0000-0000-0000-000000000001';
const NON_UUID_BOOKING_ID = '1780826201251-408';

function seedStaffAuth() {
  fake.authGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
  fake.seed('employee_accounts', [{ id: EMP_ID, auth_user_id: USER_ID, role_name: 'doctor', email: 'doc@test.com' }]);
  fake.seed('roles', [{ name: 'doctor', permissions: [] }]);
}

function makePostReq(body: any, withAuth = true): Request {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (withAuth) headers.set('Authorization', 'Bearer staff-token');
  return new Request('http://localhost:3000/api/prescriptions', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

function makeGetReq(url: string, withAuth = true): Request {
  const headers = new Headers();
  if (withAuth) headers.set('Authorization', 'Bearer staff-token');
  return new Request(url, {
    method: 'GET',
    headers,
  });
}

describe('POST /api/prescriptions - Booking Linkage & Non-UUID Safety', () => {
  beforeEach(() => {
    fake.reset();
    seedStaffAuth();
    fake.seed('prescriptions', []);
    fake.seed('reservations', [
      { id: UUID_BOOKING_ID, customer_id: CUST_ID, date: '2026-10-28', status: 'started' }
    ]);
  });

  it('saves prescription linked to a UUID booking_id', async () => {
    const payload = {
      booking_id: UUID_BOOKING_ID,
      customer_id: CUST_ID,
      patient_name: 'Sara Ahmed',
      diagnosis: 'Acne Vulgaris',
      medications: [{ name: 'Clindamycin', dosage: '1%', frequency: '2x daily', duration: '14 days' }],
      instructions: 'Apply thin layer',
      date: '2026-10-28',
    };

    const res = await POST(makePostReq(payload));
    expect(res.status).toBe(201);
    const data = await res.json();

    expect(data.id).toBeTruthy();
    expect(data.booking_id).toBe(UUID_BOOKING_ID);
    expect(data.customer_id).toBe(CUST_ID);
    expect(data.diagnosis).toBe('Acne Vulgaris');
    expect(data.medications).toHaveLength(1);
    expect(data.version).toBe(1);
    expect(data.is_latest).toBe(true);
  });

  it('safely handles non-UUID booking_id without throwing 22P02: saves the prescription unlinked and reports booking_id null', async () => {
    const payload = {
      booking_id: NON_UUID_BOOKING_ID,
      customer_id: CUST_ID,
      patient_name: 'Mona Ali',
      diagnosis: 'Post-Laser Care',
      medications: [{ name: 'Panthenol', dosage: 'Cream', frequency: '3x daily', duration: '5 days' }],
      date: '2026-10-28',
    };

    const res = await POST(makePostReq(payload));
    expect(res.status).toBe(201);
    const data = await res.json();

    expect(data.id).toBeTruthy();
    // DEC-140: the response reports what is stored, never a link that was not written.
    expect(data.booking_id).toBeNull();
    expect(fake.rows('prescriptions')[0].booking_id).toBeNull();
    expect(data.diagnosis).toBe('Post-Laser Care');
  });

  it('versions an existing prescription cleanly when id is provided', async () => {
    fake.seed('prescriptions', [
      {
        id: 'rx-v1',
        root_prescription_id: 'rx-v1',
        version: 1,
        is_latest: true,
        booking_id: UUID_BOOKING_ID,
        customer_id: CUST_ID,
        patient_name: 'Sara Ahmed',
        diagnosis: 'Acne Initial',
        medications: [{ name: 'Mupirocin', dosage: '2%' }],
        date: '2026-10-28',
      }
    ]);

    const editPayload = {
      id: 'rx-v1',
      booking_id: UUID_BOOKING_ID,
      customer_id: CUST_ID,
      patient_name: 'Sara Ahmed',
      diagnosis: 'Acne Follow-up Updated',
      medications: [{ name: 'Mupirocin', dosage: '2%' }, { name: 'Adapalene', dosage: '0.1%' }],
      date: '2026-10-28',
    };

    const res = await POST(makePostReq(editPayload));
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.version).toBe(2);
    expect(data.root_prescription_id).toBe('rx-v1');
    expect(data.parent_prescription_id).toBe('rx-v1');
    expect(data.is_latest).toBe(true);
    expect(data.medications).toHaveLength(2);
    expect(data.booking_id).toBe(UUID_BOOKING_ID);
  });
});

describe('GET /api/prescriptions - Booking Query & Customer Fallback', () => {
  beforeEach(() => {
    fake.reset();
    seedStaffAuth();
  });

  it('finds prescription directly by bookingId', async () => {
    fake.seed('prescriptions', [
      {
        id: 'rx-101',
        booking_id: UUID_BOOKING_ID,
        customer_id: CUST_ID,
        patient_name: 'Sara Ahmed',
        diagnosis: 'Dermatitis',
        medications: [{ name: 'Hydrocortisone', dosage: '1%' }],
        is_latest: true,
        date: '2026-10-28',
        created_at: '2026-10-28T10:00:00Z',
      }
    ]);

    const res = await GET(makeGetReq(`http://localhost:3000/api/prescriptions?bookingId=${UUID_BOOKING_ID}`));
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe('rx-101');
    expect(data[0].booking_id).toBe(UUID_BOOKING_ID);
  });

  it('falls back to customerId when bookingId has no direct match', async () => {
    // Prescription exists for this customer on this date, but booking_id was null/stripped
    fake.seed('prescriptions', [
      {
        id: 'rx-fallback-1',
        booking_id: null,
        customer_id: CUST_ID,
        patient_name: 'Sara Ahmed',
        diagnosis: 'Erythema',
        medications: [{ name: 'Fucicort', dosage: 'Cream' }],
        is_latest: true,
        date: '2026-10-28',
        created_at: '2026-10-28T11:00:00Z',
      }
    ]);

    const res = await GET(makeGetReq(`http://localhost:3000/api/prescriptions?bookingId=unknown-id&customerId=${CUST_ID}&date=2026-10-28`));
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe('rx-fallback-1');
    expect(data[0].diagnosis).toBe('Erythema');
  });
});
