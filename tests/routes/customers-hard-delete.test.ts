/**
 * Route-level tests for DELETE /api/customers (DEC-128 / RISK-133).
 *
 * The bug: "Hard Delete" on a patient that has bookings removed the `customers` row and just set
 * `reservations.customer_id` to NULL. The admin Patients list also builds an entry for every booking
 * whose patient has no customer row (page.tsx, "reservation-derived" patients, id `res-cust-<phone>`),
 * so the patient came straight back after the list refreshed. A hard delete on such an entry sent the
 * non-UUID id to Postgres and either errored obscurely or, in the fake, "succeeded" doing nothing.
 *
 * The rule now: a hard delete either really removes the patient (only when no booking / payment /
 * package / wallet history hangs off it) or answers 409 naming what blocks it. It never reports
 * success without removing a row.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseFake } from '../helpers/supabaseFake';

const fake = createSupabaseFake();
const deleteUser = vi.fn();
const listUsers = vi.fn();

vi.mock('@/lib/supabaseServer', () => ({
  supabaseServer: {
    auth: {
      getUser: (...args: any[]) => fake.authGetUser(...args),
      admin: {
        listUsers: (...args: any[]) => listUsers(...args),
        deleteUser: (...args: any[]) => deleteUser(...args),
      },
    },
    from: (table: string) => fake.client.from(table),
  },
}));

import { DELETE } from '@/app/api/customers/route';

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

beforeEach(() => {
  fake.reset();
  deleteUser.mockReset();
  listUsers.mockReset();
  deleteUser.mockResolvedValue({ error: null });
  listUsers.mockResolvedValue({ data: { users: [] }, error: null });
  seedSuperadmin();
  fake.seed('customers', [
    { id: CUSTOMER_ID, name: 'Hamada Test', mobile: '01000000001', email: null, active: true, auth_user_id: null },
    { id: OTHER_ID, name: 'Someone Else', mobile: '01000000002', email: null, active: true, auth_user_id: null },
  ]);
});

describe('DELETE /api/customers?mode=hard', () => {
  it('refuses, and removes nothing, when the patient has bookings', async () => {
    fake.seed('reservations', [
      { id: 'r1', customer_id: CUSTOMER_ID, name: 'Hamada Test', phone: '01000000001', status: 'rejected' },
      { id: 'r2', customer_id: CUSTOMER_ID, name: 'Hamada Test', phone: '01000000001', status: 'completed' },
    ]);

    const res = await DELETE(del(CUSTOMER_ID, 'hard'));
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toMatch(/2 bookings/);
    expect(body.blockers.bookings).toBe(2);
    // The row is still there and the bookings are still linked: nothing was half-done.
    expect(fake.rows('customers').map((c) => c.id)).toContain(CUSTOMER_ID);
    expect(fake.rows('reservations').every((r) => r.customer_id === CUSTOMER_ID)).toBe(true);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('refuses when the patient has payments, even with no bookings, and says how many', async () => {
    fake.seed('transactions', [
      { id: 't1', customer_id: CUSTOMER_ID },
      { id: 't2', customer_id: CUSTOMER_ID },
    ]);
    fake.seed('invoices', [{ id: 'i1', customer_id: CUSTOMER_ID }]);

    const res = await DELETE(del(CUSTOMER_ID, 'hard'));
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.blockers.payments).toBe(3);
    expect(body.error).toMatch(/3 payment records/);
    expect(fake.rows('customers').map((c) => c.id)).toContain(CUSTOMER_ID);
  });

  it('refuses when the patient has packages or wallet history', async () => {
    fake.seed('customer_packages', [{ id: 'p1', customer_id: CUSTOMER_ID }]);
    fake.seed('wallet_txns', [{ id: 'w1', customer_id: CUSTOMER_ID }]);

    const res = await DELETE(del(CUSTOMER_ID, 'hard'));
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.blockers.packages).toBe(1);
    expect(body.blockers.walletEntries).toBe(1);
  });

  it('does not count another patient\'s history as a blocker', async () => {
    fake.seed('reservations', [{ id: 'r9', customer_id: OTHER_ID, name: 'Someone Else', phone: '01000000002' }]);

    const res = await DELETE(del(CUSTOMER_ID, 'hard'));

    expect(res.status).toBe(200);
    expect(fake.rows('customers').map((c) => c.id)).toEqual([OTHER_ID]);
    // The other patient's booking is untouched.
    expect(fake.rows('reservations')[0].customer_id).toBe(OTHER_ID);
  });

  it('really deletes a patient with no history, and the row is gone afterwards', async () => {
    const res = await DELETE(del(CUSTOMER_ID, 'hard'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.message).toMatch(/permanently deleted/i);
    expect(fake.rows('customers').map((c) => c.id)).toEqual([OTHER_ID]);
  });

  it('defaults to hard when no mode is sent', async () => {
    fake.seed('reservations', [{ id: 'r1', customer_id: CUSTOMER_ID, name: 'Hamada Test', phone: '01000000001' }]);
    const res = await DELETE(del(CUSTOMER_ID));
    expect(res.status).toBe(409);
  });

  it('answers 404, not success, when the patient does not exist', async () => {
    const res = await DELETE(del('33333333-3333-4333-8333-333333333333', 'hard'));
    expect(res.status).toBe(404);
    expect(fake.rows('customers')).toHaveLength(2);
  });

  it('removes the linked login only after the patient row is gone, using auth_user_id when set', async () => {
    fake.seed('customers', [
      { id: CUSTOMER_ID, name: 'Hamada Test', mobile: '01000000001', email: null, active: true, auth_user_id: 'auth-abc' },
    ]);

    const res = await DELETE(del(CUSTOMER_ID, 'hard'));

    expect(res.status).toBe(200);
    expect(deleteUser).toHaveBeenCalledWith('auth-abc');
    expect(fake.rows('customers')).toHaveLength(0);
  });

  it('keeps the login when the patient is refused', async () => {
    fake.seed('customers', [
      { id: CUSTOMER_ID, name: 'Hamada Test', mobile: '01000000001', email: null, active: true, auth_user_id: 'auth-abc' },
    ]);
    fake.seed('reservations', [{ id: 'r1', customer_id: CUSTOMER_ID, name: 'Hamada Test', phone: '01000000001' }]);

    const res = await DELETE(del(CUSTOMER_ID, 'hard'));

    expect(res.status).toBe(409);
    expect(deleteUser).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/customers on a reservation-derived patient (id res-cust-...)', () => {
  it('says the patient only exists because of bookings, and changes nothing', async () => {
    // No customers row for this phone: the Patients list shows it only because of these bookings.
    fake.seed('reservations', [
      { id: 'r1', customer_id: null, name: 'Orphan Test', phone: '+201016302772', status: 'rejected' },
      { id: 'r2', customer_id: null, name: 'Orphan Test', phone: '01016302772', status: 'cancelled' },
      { id: 'r3', customer_id: CUSTOMER_ID, name: 'Hamada Test', phone: '01000000001' },
    ]);

    const res = await DELETE(del('res-cust-01016302772', 'hard'));
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.blockers.bookings).toBe(2);
    expect(body.error).toMatch(/no patient record/i);
    expect(body.error).toMatch(/Bookings/);
    expect(fake.rows('reservations')).toHaveLength(3);
    expect(fake.rows('customers')).toHaveLength(2);
  });

  it('is also refused for a soft delete (there is no row to deactivate)', async () => {
    fake.seed('reservations', [{ id: 'r1', customer_id: null, name: 'Orphan Test', phone: '01016302772' }]);
    const res = await DELETE(del('res-cust-01016302772', 'soft'));
    expect(res.status).toBe(409);
  });

  it('answers 400 for an id that is neither a patient UUID nor a derived id', async () => {
    const res = await DELETE(del('not-an-id', 'hard'));
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/customers?mode=soft', () => {
  it('deactivates and keeps the row and its history', async () => {
    fake.seed('reservations', [{ id: 'r1', customer_id: CUSTOMER_ID, name: 'Hamada Test', phone: '01000000001' }]);
    const res = await DELETE(del(CUSTOMER_ID, 'soft'));
    expect(res.status).toBe(200);
    const row = fake.rows('customers').find((c) => c.id === CUSTOMER_ID)!;
    expect(row.active).toBe(false);
    expect(fake.rows('reservations')[0].customer_id).toBe(CUSTOMER_ID);
  });

  it('answers 404 when the patient does not exist', async () => {
    const res = await DELETE(del('33333333-3333-4333-8333-333333333333', 'soft'));
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/customers access', () => {
  it('stays superadmin-only', async () => {
    fake.seed('employee_accounts', [{ id: 'emp-1', auth_user_id: SUPER_ID, role_name: 'admin' }]);
    fake.seed('roles', [{ name: 'admin', permissions: [] }]);
    const res = await DELETE(del(CUSTOMER_ID, 'hard'));
    expect(res.status).toBe(403);
    expect(fake.rows('customers')).toHaveLength(2);
  });
});
