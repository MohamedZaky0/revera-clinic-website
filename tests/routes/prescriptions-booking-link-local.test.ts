/**
 * DEC-140: the local JSON fallback of /api/prescriptions (used when the `prescriptions` table is
 * missing from Supabase) follows the same booking-link rule as the database path: a booking never
 * sees another booking's prescription; unlinked ones are still found.
 *
 * `process.cwd()` is pointed at a temp directory before the route is imported, so the route's
 * data/prescriptions.json lives outside the repository.
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createSupabaseFake } from '../helpers/supabaseFake';

const fake = createSupabaseFake();

/** A builder that answers every query with "relation does not exist" (PostgREST PGRST205). */
function missingTableBuilder(): any {
  const err = { code: 'PGRST205', message: "Could not find the table 'public.prescriptions' in the schema cache" };
  const result = { data: null, error: err };
  const b: any = new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === 'then') return (res: any, rej: any) => Promise.resolve(result).then(res, rej);
        if (prop === 'maybeSingle' || prop === 'single') return async () => result;
        return () => b;
      },
    },
  );
  return b;
}

vi.mock('@/lib/supabaseServer', () => ({
  supabaseServer: {
    auth: {
      getUser: (...args: any[]) => fake.authGetUser(...args),
      getClaims: (...args: any[]) => fake.authGetClaims(...args),
    },
    from: (table: string) => (table === 'prescriptions' ? missingTableBuilder() : fake.client.from(table)),
    rpc: (name: string, args?: any) => fake.client.rpc(name, args),
  },
}));

const CUST = 'cust-1';
const DAY = '2026-10-28';
const BOOKING_A = 'a0000000-0000-0000-0000-00000000000a';
const BOOKING_B = 'b0000000-0000-0000-0000-00000000000b';

let tmp: string;
let dataFile: string;
let GET: (req: Request) => Promise<Response>;
let POST: (req: Request) => Promise<Response>;

function headers() {
  return new Headers({ 'content-type': 'application/json', Authorization: 'Bearer staff-token' });
}
function writeLocal(rows: any[]) {
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  fs.writeFileSync(dataFile, JSON.stringify(rows), 'utf8');
}
function rx(over: Record<string, any>) {
  return {
    id: 'rx',
    booking_id: null,
    customer_id: CUST,
    patient_name: 'Sara',
    date: DAY,
    is_latest: true,
    created_at: '2026-10-28T10:00:00Z',
    ...over,
  };
}
async function getRx(qs: string) {
  const res = await GET(new Request(`http://localhost:3000/api/prescriptions?${qs}`, { headers: headers() }));
  expect(res.status).toBe(200);
  return (await res.json()) as any[];
}

beforeAll(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rx-local-'));
  dataFile = path.join(tmp, 'data', 'prescriptions.json');
  vi.spyOn(process, 'cwd').mockReturnValue(tmp);
  vi.resetModules();
  const mod = await import('@/app/api/prescriptions/route');
  GET = mod.GET;
  POST = mod.POST;
});

afterAll(() => {
  vi.restoreAllMocks();
  fs.rmSync(tmp, { recursive: true, force: true });
});

beforeEach(() => {
  fake.reset();
  fake.authGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
  fake.seed('employee_accounts', [{ id: 'emp-1', auth_user_id: 'user-1', role_name: 'doctor', email: 'd@t.com' }]);
  fake.seed('roles', [{ name: 'doctor', permissions: [] }]);
  fake.seed('reservations', []);
  writeLocal([]);
});

describe('DEC-140 local JSON fallback (prescriptions table missing)', () => {
  it('two bookings the same day do not see each other\'s prescriptions', async () => {
    writeLocal([rx({ id: 'rx-A', booking_id: BOOKING_A })]);
    expect(await getRx(`bookingId=${BOOKING_B}&customerId=${CUST}&date=${DAY}`)).toEqual([]);
    expect((await getRx(`bookingId=${BOOKING_A}&customerId=${CUST}&date=${DAY}`)).map((r) => r.id)).toEqual(['rx-A']);
  });

  it('an unlinked prescription (null booking_id) of the same patient and date is still found', async () => {
    writeLocal([rx({ id: 'rx-A', booking_id: BOOKING_A }), rx({ id: 'rx-orphan', booking_id: null })]);
    const forB = await getRx(`bookingId=${BOOKING_B}&customerId=${CUST}&date=${DAY}`);
    expect(forB.map((r) => r.id)).toEqual(['rx-orphan']);
  });

  it('without a date the fallback still excludes prescriptions linked to another booking', async () => {
    writeLocal([rx({ id: 'rx-A', booking_id: BOOKING_A }), rx({ id: 'rx-orphan' })]);
    const forB = await getRx(`bookingId=${BOOKING_B}&customerId=${CUST}`);
    expect(forB.map((r) => r.id)).toEqual(['rx-orphan']);
  });

  it('POST keeps the given booking id in local mode (no foreign key there) and that booking finds it', async () => {
    const res = await POST(
      new Request('http://localhost:3000/api/prescriptions', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          booking_id: '1780826201251-408',
          customer_id: CUST,
          patient_name: 'Sara',
          date: DAY,
          diagnosis: 'Dx',
        }),
      }),
    );
    expect(res.status).toBe(201);
    expect((await res.json()).booking_id).toBe('1780826201251-408');
    const found = await getRx(`bookingId=1780826201251-408&customerId=${CUST}&date=${DAY}`);
    expect(found).toHaveLength(1);
  });
});
