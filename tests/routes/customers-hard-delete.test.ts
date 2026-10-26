/**
 * Route-level tests for DELETE /api/customers?mode=hard and GET /api/customers?deletePreview=1
 * (DEC-132 / RISK-138, which replaces DEC-128 / RISK-133).
 *
 * The owner's rule: when a patient is permanently deleted, EVERYTHING that belongs to the patient
 * goes with them (bookings, payments, packages, wallet, product balances, laser logs, medical
 * records and prescriptions) and the patient must not come back in the Patients list. The list
 * rebuilds a patient out of any booking that has no matching patient row (id `res-cust-<phone>`),
 * so the bookings (also the un-linked ones that carry the patient's phone) have to go too.
 *
 * The fake database has no foreign keys and no cascades, so these tests only pass if the route
 * deletes every table itself, which is also what protects the dev database whose constraints were
 * built by a different path (RISK-020).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSupabaseFake } from '../helpers/supabaseFake';

const fake = createSupabaseFake();
const deleteUser = vi.fn();
const listUsers = vi.fn();
/** When set, any `.delete()` on this table fails with the given message. */
let failDeleteOn: { table: string; message: string } | null = null;

function failingBuilder(message: string): any {
  const b: any = new Proxy(
    {},
    {
      get: (_t, prop) => {
        if (prop === 'then') {
          return (resolve: any, reject: any) =>
            Promise.resolve({ data: null, error: { message } }).then(resolve, reject);
        }
        return () => b;
      },
    }
  );
  return b;
}

vi.mock('@/lib/supabaseServer', () => ({
  supabaseServer: {
    auth: {
      getUser: (...args: any[]) => fake.authGetUser(...args), getClaims: (...args: any[]) => fake.authGetClaims(...args),
      admin: {
        listUsers: (...args: any[]) => listUsers(...args),
        deleteUser: (...args: any[]) => deleteUser(...args),
      },
    },
    from: (table: string) => {
      const real = fake.client.from(table);
      if (!failDeleteOn || failDeleteOn.table !== table) return real;
      const message = failDeleteOn.message;
      return new Proxy(real, {
        get: (target, prop) => {
          if (prop === 'delete') return () => failingBuilder(message);
          return (target as any)[prop];
        },
      });
    },
  },
}));

import { DELETE, GET } from '@/app/api/customers/route';

const SUPER_ID = 'super-user';
const CUSTOMER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_ID = '22222222-2222-4222-8222-222222222222';

function seedSuperadmin() {
  fake.authGetUser.mockResolvedValue({ data: { user: { id: SUPER_ID } }, error: null });
  fake.seed('employee_accounts', [{ id: 'emp-1', auth_user_id: SUPER_ID, role_name: 'superadmin' }]);
  fake.seed('roles', [{ name: 'superadmin', permissions: [] }]);
}

function del(id: string, mode?: 'soft' | 'hard'): Request {
  const qs = `id=${encodeURIComponent(id)}${mode ? `&mode=${mode}` : ''}`;
  return new Request(`http://localhost:3000/api/customers?${qs}`, {
    method: 'DELETE',
    headers: { Authorization: 'Bearer super-token' },
  });
}

function preview(id: string): Request {
  return new Request(`http://localhost:3000/api/customers?id=${encodeURIComponent(id)}&deletePreview=1`, {
    method: 'GET',
    headers: { Authorization: 'Bearer super-token' },
  });
}

/**
 * Hamada (CUSTOMER_ID) owns two linked bookings, one un-linked booking with his phone, payments on
 * all three, a package, wallet, balances, laser, medical and prescription rows. Someone Else
 * (OTHER_ID) has one booking, one payment and a package, which must survive untouched. One
 * un-linked booking belongs to a stranger's phone, and one more carries Hamada's phone but a
 * different name.
 */
function seedFullHistory() {
  fake.seed('reservations', [
    { id: 'r1', customer_id: CUSTOMER_ID, name: 'Hamada Test', phone: '01000000001', status: 'completed' },
    { id: 'r2', customer_id: CUSTOMER_ID, name: 'Hamada Test', phone: '01000000001', status: 'rejected' },
    { id: 'r3', customer_id: null, name: 'Hamada Test', phone: '+201000000001', status: 'cancelled' },
    { id: 'r4', customer_id: OTHER_ID, name: 'Someone Else', phone: '01000000002', status: 'completed' },
    { id: 'r5', customer_id: null, name: 'Stranger', phone: '01099999999', status: 'completed' },
    { id: 'r6', customer_id: null, name: 'Mona Different', phone: '01000000001', status: 'completed' },
  ]);
  fake.seed('transactions', [
    { id: 't1', customer_id: CUSTOMER_ID, reservation_id: 'r1', type: 'payment', status: 'completed', amount: 1000 },
    { id: 't2', customer_id: CUSTOMER_ID, reservation_id: 'r2', type: 'payment', status: 'completed', amount: 1700 },
    { id: 't3', customer_id: null, reservation_id: 'r3', type: 'payment', status: 'completed', amount: 200 },
    { id: 't4', customer_id: OTHER_ID, reservation_id: 'r4', type: 'payment', status: 'completed', amount: 500 },
    { id: 't5', customer_id: null, reservation_id: 'r5', type: 'payment', status: 'completed', amount: 300 },
  ]);
  fake.seed('invoices', [
    { id: 'i1', customer_id: CUSTOMER_ID, reservation_id: 'r1' },
    { id: 'i2', customer_id: null, reservation_id: 'r3' },
    { id: 'i3', customer_id: OTHER_ID, reservation_id: 'r4' },
  ]);
  fake.seed('payments', [
    { id: 'pay1', invoice_id: 'i1', amount: 1000 },
    { id: 'pay2', invoice_id: 'i2', amount: 200 },
    { id: 'pay3', invoice_id: 'i3', amount: 500 },
  ]);
  fake.seed('product_sales', [
    { id: 'ps1', customer_id: CUSTOMER_ID, total_price: 90 },
    { id: 'ps2', customer_id: OTHER_ID, total_price: 40 },
  ]);
  fake.seed('customer_packages', [
    { id: 'cp1', customer_id: CUSTOMER_ID },
    { id: 'cp2', customer_id: CUSTOMER_ID },
    { id: 'cp3', customer_id: CUSTOMER_ID },
    { id: 'cp9', customer_id: OTHER_ID },
  ]);
  fake.seed('wallet_txns', [
    { id: 'w1', customer_id: CUSTOMER_ID },
    { id: 'w9', customer_id: OTHER_ID },
  ]);
  fake.seed('customer_product_balances', [
    { id: 'b1', customer_id: CUSTOMER_ID },
    { id: 'b9', customer_id: OTHER_ID },
  ]);
  fake.seed('laser_pulse_logs', [
    { id: 'l1', customer_id: CUSTOMER_ID },
    { id: 'l9', customer_id: OTHER_ID },
  ]);
  fake.seed('medical_records', [
    { id: 'm1', customer_id: CUSTOMER_ID },
    { id: 'm9', customer_id: OTHER_ID },
  ]);
  fake.seed('medical_reports', [{ id: 'mr1', customer_id: CUSTOMER_ID }]);
  fake.seed('prescriptions', [
    { id: 'rx1', customer_id: CUSTOMER_ID },
    { id: 'rx9', customer_id: OTHER_ID },
  ]);
}

function ids(table: string): string[] {
  return fake.rows(table).map((r) => r.id);
}

beforeEach(() => {
  fake.reset();
  failDeleteOn = null;
  deleteUser.mockReset();
  listUsers.mockReset();
  deleteUser.mockResolvedValue({ error: null });
  listUsers.mockResolvedValue({ data: { users: [] }, error: null });
  seedSuperadmin();
  fake.seed('customers', [
    { id: CUSTOMER_ID, name: 'Hamada Test', mobile: '01000000001', email: null, active: true, auth_user_id: null },
    { id: OTHER_ID, name: 'Someone Else', mobile: '01000000002', email: null, active: true, auth_user_id: null },
  ]);
  vi.spyOn(console, 'info').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('DELETE /api/customers?mode=hard deletes everything that belongs to the patient', () => {
  it('removes the patient, bookings, payments, packages, wallet, balances, laser, medical and prescriptions', async () => {
    seedFullHistory();

    const res = await DELETE(del(CUSTOMER_ID, 'hard'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.message).toMatch(/permanently deleted/i);

    expect(ids('customers')).toEqual([OTHER_ID]);
    // r1, r2 (linked) and r3 (un-linked, same phone and name) go; the others stay.
    expect(ids('reservations').sort()).toEqual(['r4', 'r5', 'r6']);
    expect(ids('transactions').sort()).toEqual(['t4', 't5']);
    expect(ids('invoices')).toEqual(['i3']);
    expect(ids('payments')).toEqual(['pay3']);
    expect(ids('product_sales')).toEqual(['ps2']);
    expect(ids('customer_packages')).toEqual(['cp9']);
    expect(ids('wallet_txns')).toEqual(['w9']);
    expect(ids('customer_product_balances')).toEqual(['b9']);
    expect(ids('laser_pulse_logs')).toEqual(['l9']);
    expect(ids('medical_records')).toEqual(['m9']);
    expect(ids('medical_reports')).toEqual([]);
    expect(ids('prescriptions')).toEqual(['rx9']);
  });

  it('returns what was removed, in counts', async () => {
    seedFullHistory();

    const res = await DELETE(del(CUSTOMER_ID, 'hard'));
    const body = await res.json();

    expect(body.removed).toMatchObject({
      bookings: 3,
      payments: 3 + 2 + 1, // 3 transactions + 2 invoices + 1 product sale
      packages: 3,
      walletEntries: 1,
      productBalances: 1,
      laserSessions: 1,
      clinicalRecords: 3, // 1 medical record + 1 report + 1 prescription
    });
    expect(body.removed.paymentsAmount).toBe(2900);
  });

  it('writes a one-line audit with the counts', async () => {
    seedFullHistory();
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});

    await DELETE(del(CUSTOMER_ID, 'hard'));

    const line = info.mock.calls.map((c) => String(c[0])).find((l) => l.includes('patient hard delete'));
    expect(line).toBeTruthy();
    expect(line).toContain(CUSTOMER_ID);
    expect(line).toMatch(/bookings=3/);
  });

  it('leaves another patient completely untouched', async () => {
    seedFullHistory();
    await DELETE(del(CUSTOMER_ID, 'hard'));

    expect(fake.rows('reservations').find((r) => r.id === 'r4')?.customer_id).toBe(OTHER_ID);
    expect(ids('transactions')).toContain('t4');
    expect(ids('invoices')).toContain('i3');
    expect(ids('customers')).toContain(OTHER_ID);
  });

  it('does not touch a payment that belongs to an un-linked booking of a different phone', async () => {
    seedFullHistory();
    await DELETE(del(CUSTOMER_ID, 'hard'));
    // t5 is the payment of r5 (stranger's phone): both stay.
    expect(ids('transactions')).toContain('t5');
    expect(ids('reservations')).toContain('r5');
  });

  it('keeps an un-linked booking that has the same phone but clearly another name, and says so', async () => {
    seedFullHistory();
    const res = await DELETE(del(CUSTOMER_ID, 'hard'));
    const body = await res.json();
    expect(ids('reservations')).toContain('r6');
    expect(body.keptBookingsOtherName).toBe(1);
  });

  it('does not delete un-linked bookings when another patient row owns that phone', async () => {
    seedFullHistory();
    // Someone else registered with the same phone: the list shows those bookings under them.
    fake.seed('customers', [
      { id: CUSTOMER_ID, name: 'Hamada Test', mobile: '01000000001', email: null, active: true, auth_user_id: null },
      { id: OTHER_ID, name: 'Hamada Test', mobile: '+201000000001', email: null, active: true, auth_user_id: null },
    ]);

    const res = await DELETE(del(CUSTOMER_ID, 'hard'));

    expect(res.status).toBe(200);
    // Only the linked bookings go; r3 may belong to the other row.
    expect(ids('reservations')).toContain('r3');
    expect(ids('transactions')).toContain('t3');
    expect(ids('reservations')).not.toContain('r1');
  });

  it('really deletes a patient with nothing attached, and reports zeros', async () => {
    const res = await DELETE(del(CUSTOMER_ID, 'hard'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(ids('customers')).toEqual([OTHER_ID]);
    expect(body.removed.bookings).toBe(0);
    expect(body.removed.payments).toBe(0);
  });

  it('defaults to hard when no mode is sent', async () => {
    seedFullHistory();
    const res = await DELETE(del(CUSTOMER_ID));
    expect(res.status).toBe(200);
    expect(ids('customers')).toEqual([OTHER_ID]);
  });

  it('answers 404, not success, when the patient does not exist, and deletes nothing', async () => {
    seedFullHistory();
    const res = await DELETE(del('33333333-3333-4333-8333-333333333333', 'hard'));
    expect(res.status).toBe(404);
    expect(fake.rows('customers')).toHaveLength(2);
    expect(fake.rows('reservations')).toHaveLength(6);
    expect(fake.rows('transactions')).toHaveLength(5);
  });

  it('removes the linked login after the patient row is gone, using auth_user_id when set', async () => {
    fake.seed('customers', [
      { id: CUSTOMER_ID, name: 'Hamada Test', mobile: '01000000001', email: null, active: true, auth_user_id: 'auth-abc' },
    ]);
    seedFullHistory();

    const res = await DELETE(del(CUSTOMER_ID, 'hard'));

    expect(res.status).toBe(200);
    expect(deleteUser).toHaveBeenCalledWith('auth-abc');
    expect(fake.rows('customers')).toHaveLength(0);
  });

  it('never removes a staff login, even when the patient row points at it', async () => {
    fake.seed('customers', [
      { id: CUSTOMER_ID, name: 'Hamada Test', mobile: '01000000001', email: null, active: true, auth_user_id: 'staff-auth-1' },
    ]);
    fake.seed('employee_accounts', [
      { id: 'emp-1', auth_user_id: SUPER_ID, role_name: 'superadmin' },
      { id: 'emp-2', auth_user_id: 'staff-auth-1', role_name: 'reception' },
    ]);

    const res = await DELETE(del(CUSTOMER_ID, 'hard'));

    expect(res.status).toBe(200);
    expect(fake.rows('customers')).toHaveLength(0);
    expect(deleteUser).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/customers?mode=hard when a step fails', () => {
  it('reports the failing step and does not claim success, and keeps the patient so it can be retried', async () => {
    seedFullHistory();
    failDeleteOn = { table: 'customer_packages', message: 'boom: could not delete packages' };

    const res = await DELETE(del(CUSTOMER_ID, 'hard'));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.code).toBe('PATIENT_DELETE_FAILED');
    expect(body.failedStep).toBe('customer_packages');
    expect(body.error).toMatch(/boom: could not delete packages/);
    expect(body.error).toMatch(/run the delete again/i);
    // The patient row is still there, so the delete can simply be run again.
    expect(ids('customers')).toContain(CUSTOMER_ID);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('stops at the failing step and does not delete the patient or the bookings after it', async () => {
    seedFullHistory();
    failDeleteOn = { table: 'reservations', message: 'reservations locked' };

    const res = await DELETE(del(CUSTOMER_ID, 'hard'));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.failedStep).toBe('reservations');
    expect(ids('customers')).toContain(CUSTOMER_ID);
    expect(ids('reservations')).toContain('r1');
  });

  it('can be run again after a failure and then finishes the job', async () => {
    seedFullHistory();
    failDeleteOn = { table: 'prescriptions', message: 'temporary failure' };
    const first = await DELETE(del(CUSTOMER_ID, 'hard'));
    expect(first.status).toBe(500);

    failDeleteOn = null;
    const second = await DELETE(del(CUSTOMER_ID, 'hard'));
    expect(second.status).toBe(200);
    expect(ids('customers')).toEqual([OTHER_ID]);
    expect(ids('reservations').sort()).toEqual(['r4', 'r5', 'r6']);
    expect(ids('prescriptions')).toEqual(['rx9']);
  });

  it('keeps the login when the delete fails', async () => {
    fake.seed('customers', [
      { id: CUSTOMER_ID, name: 'Hamada Test', mobile: '01000000001', email: null, active: true, auth_user_id: 'auth-abc' },
    ]);
    seedFullHistory();
    failDeleteOn = { table: 'customers', message: 'row delete blocked' };

    const res = await DELETE(del(CUSTOMER_ID, 'hard'));

    expect(res.status).toBe(500);
    expect(deleteUser).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/customers on a reservation-derived patient (id res-cust-...)', () => {
  function seedDerived() {
    // No customers row for this phone: the Patients list shows it only because of these bookings.
    fake.seed('reservations', [
      { id: 'r1', customer_id: null, name: 'Orphan Test', phone: '+201016302772', status: 'rejected' },
      { id: 'r2', customer_id: null, name: 'Orphan Test', phone: '01016302772', status: 'cancelled' },
      { id: 'r3', customer_id: CUSTOMER_ID, name: 'Hamada Test', phone: '01000000001' },
      { id: 'r4', customer_id: null, name: 'Stranger', phone: '01099999999' },
    ]);
    fake.seed('transactions', [
      { id: 't1', customer_id: null, reservation_id: 'r1', type: 'payment', status: 'completed', amount: 150 },
      { id: 't2', customer_id: null, reservation_id: 'r2', type: 'payment', status: 'completed', amount: 50 },
      { id: 't3', customer_id: CUSTOMER_ID, reservation_id: 'r3', type: 'payment', status: 'completed', amount: 800 },
      { id: 't4', customer_id: null, reservation_id: 'r4', type: 'payment', status: 'completed', amount: 60 },
    ]);
  }

  it('hard delete removes the bookings that carry the phone and their payments, so the entry disappears', async () => {
    seedDerived();

    const res = await DELETE(del('res-cust-01016302772', 'hard'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.removed.bookings).toBe(2);
    expect(body.removed.payments).toBe(2);
    expect(body.removed.paymentsAmount).toBe(200);
    expect(ids('reservations').sort()).toEqual(['r3', 'r4']);
    expect(ids('transactions').sort()).toEqual(['t3', 't4']);
    expect(ids('customers').sort()).toEqual([CUSTOMER_ID, OTHER_ID].sort());
  });

  it('answers 404 when no booking is left for that phone', async () => {
    const res = await DELETE(del('res-cust-01016302772', 'hard'));
    expect(res.status).toBe(404);
  });

  it('refuses to delete the bookings when a patient row now owns that phone (stale list)', async () => {
    fake.seed('customers', [
      { id: CUSTOMER_ID, name: 'Orphan Test', mobile: '01016302772', email: null, active: true, auth_user_id: null },
    ]);
    fake.seed('reservations', [{ id: 'r1', customer_id: null, name: 'Orphan Test', phone: '01016302772' }]);

    const res = await DELETE(del('res-cust-01016302772', 'hard'));
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.code).toBe('PATIENT_RECORD_EXISTS');
    expect(ids('reservations')).toEqual(['r1']);
  });

  it('soft delete still answers 409 and explains what to do instead, changing nothing', async () => {
    seedDerived();
    const res = await DELETE(del('res-cust-01016302772', 'soft'));
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.code).toBe('PATIENT_IS_BOOKING_DERIVED');
    expect(body.blockers.bookings).toBe(2);
    expect(body.error).toMatch(/no patient record/i);
    expect(body.error).toMatch(/Hard Delete/);
    expect(fake.rows('reservations')).toHaveLength(4);
  });

  it('answers 400 for an id that is neither a patient UUID nor a derived id', async () => {
    const res = await DELETE(del('not-an-id', 'hard'));
    expect(res.status).toBe(400);
  });

  it('reports a failing step instead of swallowing it', async () => {
    seedDerived();
    failDeleteOn = { table: 'transactions', message: 'ledger locked' };
    const res = await DELETE(del('res-cust-01016302772', 'hard'));
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body.failedStep).toBe('transactions');
    expect(ids('reservations')).toContain('r1');
  });
});

describe('DELETE /api/customers?mode=soft', () => {
  it('deactivates and keeps the row and its history', async () => {
    seedFullHistory();
    const res = await DELETE(del(CUSTOMER_ID, 'soft'));
    expect(res.status).toBe(200);
    const row = fake.rows('customers').find((c) => c.id === CUSTOMER_ID)!;
    expect(row.active).toBe(false);
    expect(fake.rows('reservations')).toHaveLength(6);
    expect(fake.rows('transactions')).toHaveLength(5);
  });

  it('answers 404 when the patient does not exist', async () => {
    const res = await DELETE(del('33333333-3333-4333-8333-333333333333', 'soft'));
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/customers access', () => {
  it('stays superadmin-only and deletes nothing for an admin', async () => {
    seedFullHistory();
    fake.seed('employee_accounts', [{ id: 'emp-1', auth_user_id: SUPER_ID, role_name: 'admin' }]);
    fake.seed('roles', [{ name: 'admin', permissions: [] }]);
    const res = await DELETE(del(CUSTOMER_ID, 'hard'));
    expect(res.status).toBe(403);
    expect(fake.rows('customers')).toHaveLength(2);
    expect(fake.rows('reservations')).toHaveLength(6);
  });
});

describe('GET /api/customers?deletePreview=1', () => {
  it('returns the counts of what a hard delete would remove, and removes nothing', async () => {
    seedFullHistory();

    const res = await GET(preview(CUSTOMER_ID));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.derived).toBe(false);
    expect(body.name).toBe('Hamada Test');
    expect(body.counts).toMatchObject({
      bookings: 3,
      payments: 6,
      packages: 3,
      walletEntries: 1,
      productBalances: 1,
      laserSessions: 1,
      clinicalRecords: 3,
    });
    expect(body.counts.paymentsAmount).toBe(2900);
    expect(body.keptBookingsOtherName).toBe(1);
    // Read only.
    expect(fake.rows('customers')).toHaveLength(2);
    expect(fake.rows('reservations')).toHaveLength(6);
  });

  it('gives the same numbers the delete then reports', async () => {
    seedFullHistory();
    const pre = await (await GET(preview(CUSTOMER_ID))).json();
    const done = await (await DELETE(del(CUSTOMER_ID, 'hard'))).json();
    expect(done.removed).toMatchObject(pre.counts);
  });

  it('works for a reservation-derived entry', async () => {
    fake.seed('reservations', [
      { id: 'r1', customer_id: null, name: 'Orphan Test', phone: '01016302772' },
      { id: 'r2', customer_id: null, name: 'Orphan Test', phone: '+201016302772' },
    ]);
    fake.seed('transactions', [
      { id: 't1', customer_id: null, reservation_id: 'r1', type: 'payment', status: 'completed', amount: 120 },
    ]);

    const res = await GET(preview('res-cust-01016302772'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.derived).toBe(true);
    expect(body.counts.bookings).toBe(2);
    expect(body.counts.payments).toBe(1);
    expect(body.counts.paymentsAmount).toBe(120);
  });

  it('answers 404 for a patient that does not exist', async () => {
    const res = await GET(preview('33333333-3333-4333-8333-333333333333'));
    expect(res.status).toBe(404);
  });

  it('is superadmin-only', async () => {
    seedFullHistory();
    fake.seed('employee_accounts', [{ id: 'emp-1', auth_user_id: SUPER_ID, role_name: 'admin' }]);
    fake.seed('roles', [{ name: 'admin', permissions: [] }]);
    const res = await GET(preview(CUSTOMER_ID));
    expect(res.status).toBe(403);
  });
});
