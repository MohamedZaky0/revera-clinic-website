/**
 * DEC-140 / RISK-144: a prescription is linked to a booking only when that reservation really
 * exists, and the "no prescription for this booking" fallback never returns a prescription that
 * belongs to another booking.
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

const CUST_ID = 'cust-1';
const BOOKING_A = 'a0000000-0000-0000-0000-00000000000a';
const BOOKING_B = 'b0000000-0000-0000-0000-00000000000b';
const UNKNOWN_UUID = 'c0000000-0000-0000-0000-0000000000cc';
const DAY = '2026-10-28';

function seedStaffAuth() {
  fake.authGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
  fake.seed('employee_accounts', [{ id: 'emp-1', auth_user_id: 'user-1', role_name: 'doctor', email: 'doc@test.com' }]);
  fake.seed('roles', [{ name: 'doctor', permissions: [] }]);
}

function postReq(body: any): Request {
  return new Request('http://localhost:3000/api/prescriptions', {
    method: 'POST',
    headers: new Headers({ 'content-type': 'application/json', Authorization: 'Bearer staff-token' }),
    body: JSON.stringify(body),
  });
}

function rxRow(over: Record<string, any>) {
  return {
    id: 'rx-x',
    booking_id: null,
    customer_id: CUST_ID,
    patient_name: 'Sara Ahmed',
    diagnosis: 'Dx',
    medications: [],
    is_latest: true,
    date: DAY,
    created_at: '2026-10-28T10:00:00Z',
    ...over,
  };
}

async function getRx(qs: string) {
  const res = await GET(
    new Request(`http://localhost:3000/api/prescriptions?${qs}`, {
      headers: new Headers({ Authorization: 'Bearer staff-token' }),
    }),
  );
  expect(res.status).toBe(200);
  return (await res.json()) as any[];
}

describe('GET: the customer fallback never returns another booking\'s prescription', () => {
  beforeEach(() => {
    fake.reset();
    seedStaffAuth();
  });

  it('two bookings the same day do not see each other\'s prescriptions', async () => {
    fake.seed('prescriptions', [rxRow({ id: 'rx-A', booking_id: BOOKING_A, diagnosis: 'Booking A diagnosis' })]);

    expect(await getRx(`bookingId=${BOOKING_B}&customerId=${CUST_ID}&date=${DAY}`)).toEqual([]);
    expect((await getRx(`bookingId=${BOOKING_A}&customerId=${CUST_ID}&date=${DAY}`)).map((r) => r.id)).toEqual(['rx-A']);
  });

  it('booking B gets only the unlinked prescription, not booking A\'s, when both exist', async () => {
    fake.seed('prescriptions', [
      rxRow({ id: 'rx-A', booking_id: BOOKING_A, created_at: '2026-10-28T12:00:00Z' }),
      rxRow({ id: 'rx-orphan', booking_id: null, created_at: '2026-10-28T09:00:00Z' }),
    ]);

    const forB = await getRx(`bookingId=${BOOKING_B}&customerId=${CUST_ID}&date=${DAY}`);
    expect(forB.map((r) => r.id)).toEqual(['rx-orphan']);
  });

  it('without a date the fallback still never returns a prescription linked to another booking', async () => {
    fake.seed('prescriptions', [
      rxRow({ id: 'rx-A', booking_id: BOOKING_A }),
      rxRow({ id: 'rx-old-A', booking_id: BOOKING_A, date: '2026-09-01' }),
      rxRow({ id: 'rx-orphan', booking_id: null }),
    ]);

    const forB = await getRx(`bookingId=${BOOKING_B}&customerId=${CUST_ID}`);
    expect(forB.map((r) => r.id)).toEqual(['rx-orphan']);
  });

  it('an unlinked prescription of a different date, or of a different patient, is not returned', async () => {
    fake.seed('prescriptions', [
      rxRow({ id: 'rx-other-day', booking_id: null, date: '2026-10-20' }),
      rxRow({ id: 'rx-other-patient', booking_id: null, customer_id: 'cust-2' }),
    ]);

    expect(await getRx(`bookingId=${BOOKING_B}&customerId=${CUST_ID}&date=${DAY}`)).toEqual([]);
  });

  it('a booking with its own prescription gets only that one (no unlinked rows mixed in)', async () => {
    fake.seed('prescriptions', [rxRow({ id: 'rx-B', booking_id: BOOKING_B }), rxRow({ id: 'rx-orphan', booking_id: null })]);

    const forB = await getRx(`bookingId=${BOOKING_B}&customerId=${CUST_ID}&date=${DAY}`);
    expect(forB.map((r) => r.id)).toEqual(['rx-B']);
  });

  it('querying by customerId alone (patient history) is unchanged and returns every prescription', async () => {
    fake.seed('prescriptions', [rxRow({ id: 'rx-A', booking_id: BOOKING_A }), rxRow({ id: 'rx-orphan', booking_id: null })]);

    const all = await getRx(`customerId=${CUST_ID}`);
    expect(all.map((r) => r.id).sort()).toEqual(['rx-A', 'rx-orphan']);
  });
});

describe('POST: booking_id is attached only when the reservation exists', () => {
  beforeEach(() => {
    fake.reset();
    seedStaffAuth();
    fake.seed('prescriptions', []);
    fake.seed('reservations', [{ id: BOOKING_A, customer_id: CUST_ID, date: DAY, status: 'started' }]);
  });

  const base = { customer_id: CUST_ID, patient_name: 'Sara Ahmed', diagnosis: 'Dx', date: DAY };

  it('attaches a real booking id (verified against reservations) in the response and the table', async () => {
    const res = await POST(postReq({ ...base, booking_id: BOOKING_A }));
    expect(res.status).toBe(201);
    expect((await res.json()).booking_id).toBe(BOOKING_A);
    expect(fake.rows('prescriptions')[0].booking_id).toBe(BOOKING_A);
  });

  it('an unknown (well-formed) booking id still saves the prescription, unlinked', async () => {
    const res = await POST(postReq({ ...base, booking_id: UNKNOWN_UUID }));
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.id).toBeTruthy();
    expect(data.booking_id).toBeNull();
    expect(fake.rows('prescriptions')).toHaveLength(1);
    expect(fake.rows('prescriptions')[0].booking_id).toBeNull();
  });

  it.each(['undefined', 'null', '   ', 'not-a-uuid', '1780826201251-408'])(
    'junk booking id %j still saves the prescription, unlinked',
    async (junk) => {
      const res = await POST(postReq({ ...base, booking_id: junk }));
      expect(res.status).toBe(201);
      expect((await res.json()).booking_id).toBeNull();
      expect(fake.rows('prescriptions')[0].booking_id).toBeNull();
    },
  );

  it('does not query reservations at all for a non-UUID id (no 22P02 round trip)', async () => {
    const orig = fake.client.from.bind(fake.client);
    const spy = vi.spyOn(fake.client, 'from').mockImplementation((name: string) => orig(name));
    try {
      await POST(postReq({ ...base, booking_id: 'not-a-uuid' }));
      expect(spy.mock.calls.map((c) => c[0])).not.toContain('reservations');
    } finally {
      spy.mockRestore();
    }
  });

  it('does exactly one reservation existence lookup for a UUID id', async () => {
    const orig = fake.client.from.bind(fake.client);
    const spy = vi.spyOn(fake.client, 'from').mockImplementation((name: string) => orig(name));
    try {
      await POST(postReq({ ...base, booking_id: BOOKING_A }));
      expect(spy.mock.calls.filter((c) => c[0] === 'reservations')).toHaveLength(1);
    } finally {
      spy.mockRestore();
    }
  });

  it('syncs follow_up_date to the reservation only when the reservation exists', async () => {
    await POST(postReq({ ...base, booking_id: UNKNOWN_UUID, follow_up_date: '2026-11-10' }));
    expect(fake.rows('reservations')[0].follow_up_date).toBeUndefined();

    await POST(postReq({ ...base, booking_id: BOOKING_A, follow_up_date: '2026-11-10' }));
    expect(fake.rows('reservations')[0].follow_up_date).toBe('2026-11-10');
  });

  /** Make the first prescriptions INSERT that carries booking_id fail with `error`. */
  function failFirstLinkedInsert(error: { code?: string; message: string }) {
    const orig = fake.client.from.bind(fake.client);
    let failed = false;
    return vi.spyOn(fake.client, 'from').mockImplementation((name: string) => {
      const b = orig(name);
      if (name !== 'prescriptions') return b;
      const origInsert = b.insert.bind(b);
      b.insert = (rows: any) => {
        if (!failed && !Array.isArray(rows) && rows.booking_id) {
          failed = true;
          return { select: () => ({ single: async () => ({ data: null, error }) }) };
        }
        return origInsert(rows);
      };
      return b;
    });
  }

  it('keeps the graceful fallback: a foreign-key rejection (booking deleted in between) saves it unlinked', async () => {
    const spy = failFirstLinkedInsert({
      code: '23503',
      message: 'insert or update on table "prescriptions" violates foreign key constraint "prescriptions_booking_id_fkey"',
    });
    try {
      const res = await POST(postReq({ ...base, booking_id: BOOKING_A }));
      expect(res.status).toBe(201);
      expect(fake.rows('prescriptions')).toHaveLength(1);
      expect(fake.rows('prescriptions')[0].booking_id ?? null).toBeNull();
      expect((await res.json()).booking_id ?? null).toBeNull();
    } finally {
      spy.mockRestore();
    }
  });

  it('keeps the graceful fallback: an older database without the booking_id column still saves it', async () => {
    const spy = failFirstLinkedInsert({
      code: 'PGRST204',
      message: "Could not find the 'booking_id' column of 'prescriptions' in the schema cache",
    });
    try {
      const res = await POST(postReq({ ...base, booking_id: BOOKING_A }));
      expect(res.status).toBe(201);
      expect(fake.rows('prescriptions')).toHaveLength(1);
    } finally {
      spy.mockRestore();
    }
  });

  it('a new version of a linked prescription keeps the original link when the request id is unknown', async () => {
    fake.seed('prescriptions', [rxRow({ id: 'rx-v1', booking_id: BOOKING_A, root_prescription_id: 'rx-v1', version: 1 })]);
    const res = await POST(postReq({ ...base, id: 'rx-v1', booking_id: UNKNOWN_UUID, diagnosis: 'Edited' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.version).toBe(2);
    expect(data.booking_id).toBe(BOOKING_A);
  });
});
