/**
 * Route-level tests for DELETE /api/reservations?mode=hard (DEC-133 / RISK-139).
 *
 * The bug: a permanent booking delete only ran `delete from reservations`. Postgres then set
 * `transactions.reservation_id` to NULL, so the patient's payments stayed as orphans, and
 * customers.spent_amount / outstanding / number_of_bookings were never reversed, so Total Spend,
 * Outstanding and the bookings count kept showing a booking that no longer existed.
 *
 * Rule now: a hard delete of ONE booking removes the booking's own payment rows and ledger invoice,
 * takes the booking's share out of the patient's stored figures, and only then reports success.
 * Soft delete and `id=all` are unchanged.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseFake } from '../helpers/supabaseFake';

const fake = createSupabaseFake();

/** `delete:<table>` / `update:<table>` / `insert:<table>` entries make that operation answer with an error. */
const failing = new Set<string>();

function errorBuilder(): any {
  const result = { data: null, error: { message: 'simulated write failure' } };
  const proxy: any = new Proxy(function () {}, {
    get(_t, prop) {
      if (prop === 'then') return (res: any, rej: any) => Promise.resolve(result).then(res, rej);
      if (prop === 'single' || prop === 'maybeSingle') return async () => result;
      return () => proxy;
    },
  });
  return proxy;
}

function fromWithFailures(table: string) {
  const builder = fake.client.from(table);
  for (const op of ['delete', 'update', 'insert'] as const) {
    const original = builder[op].bind(builder);
    builder[op] = (...args: any[]) => (failing.has(`${op}:${table}`) ? errorBuilder() : original(...args));
  }
  return builder;
}

vi.mock('@/lib/supabaseServer', () => ({
  supabaseServer: {
    auth: { getUser: (...args: any[]) => fake.authGetUser(...args) },
    from: (table: string) => fromWithFailures(table),
    rpc: (name: string, args?: any) => fake.client.rpc(name, args),
  },
}));

import { DELETE } from '@/app/api/reservations/route';

const SUPER_ID = 'super-user';
const CUST = 'cust-hazem';
const OTHER_CUST = 'cust-other';
const BOOKING_A = 'res-a'; // completed, paid 1200, left 0
const BOOKING_B = 'res-b'; // completed, paid 1500, left 100
const BOOKING_C = 'res-c'; // completed, paid 0, left 2820

function seedSuperadmin() {
  fake.authGetUser.mockResolvedValue({ data: { user: { id: SUPER_ID } }, error: null });
  fake.seed('employee_accounts', [{ id: 'emp-1', auth_user_id: SUPER_ID, role_name: 'superadmin' }]);
  fake.seed('roles', [{ name: 'superadmin', permissions: [] }]);
}

function del(id: string, mode?: 'soft' | 'hard'): Request {
  const qs = `id=${encodeURIComponent(id)}${mode ? `&mode=${mode}` : ''}`;
  return new Request(`http://localhost:3000/api/reservations?${qs}`, {
    method: 'DELETE',
    headers: { Authorization: 'Bearer super-token' },
  });
}

function customer() {
  return fake.rows('customers').find((c) => c.id === CUST)!;
}

beforeEach(() => {
  fake.reset();
  failing.clear();
  seedSuperadmin();
  fake.seed('customers', [
    { id: CUST, name: 'hazem al hadary', mobile: '01000000001', spent_amount: 2700, outstanding: 2920, wallet_balance: 0, number_of_bookings: 3 },
    { id: OTHER_CUST, name: 'Someone Else', mobile: '01000000002', spent_amount: 500, outstanding: 0, wallet_balance: 50, number_of_bookings: 1 },
  ]);
  fake.seed('reservations', [
    { id: BOOKING_A, customer_id: CUST, status: 'completed', amount_paid: 1200, amount_left: 0 },
    { id: BOOKING_B, customer_id: CUST, status: 'completed', amount_paid: 1500, amount_left: 100 },
    { id: BOOKING_C, customer_id: CUST, status: 'completed', amount_paid: 0, amount_left: 2820 },
    { id: 'res-other', customer_id: OTHER_CUST, status: 'completed', amount_paid: 500, amount_left: 0 },
  ]);
  fake.seed('invoices', [
    { id: 'inv-a', invoice_no: 'INV-000083', reservation_id: BOOKING_A, customer_id: CUST, grand_total: 1200 },
    { id: 'inv-b', invoice_no: 'INV-000084', reservation_id: BOOKING_B, customer_id: CUST, grand_total: 1600 },
    { id: 'inv-other', invoice_no: 'INV-000090', reservation_id: 'res-other', customer_id: OTHER_CUST, grand_total: 500 },
  ]);
  fake.seed('payments', [
    { id: 'pay-a', invoice_id: 'inv-a', amount: 1200 },
    { id: 'pay-b', invoice_id: 'inv-b', amount: 1500 },
    { id: 'pay-other', invoice_id: 'inv-other', amount: 500 },
  ]);
  fake.seed('transactions', [
    { id: 't-a', transaction_id: 'TXN-001073', type: 'payment', amount: 1200, reservation_id: BOOKING_A, customer_id: CUST },
    { id: 't-b', transaction_id: 'TXN-001074', type: 'payment', amount: 1500, reservation_id: BOOKING_B, customer_id: CUST },
    { id: 't-other', transaction_id: 'TXN-001075', type: 'payment', amount: 500, reservation_id: 'res-other', customer_id: OTHER_CUST },
    { id: 't-free', transaction_id: 'TXN-001076', type: 'payment', amount: 80, reservation_id: null, customer_id: CUST },
  ]);
});

describe('DELETE /api/reservations?mode=hard : what goes with the booking', () => {
  it('deletes the booking and ITS payments, and leaves every other booking and payment alone', async () => {
    const res = await DELETE(del(BOOKING_B, 'hard'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(fake.rows('reservations').map((r) => r.id)).not.toContain(BOOKING_B);
    expect(fake.rows('reservations').map((r) => r.id)).toEqual(expect.arrayContaining([BOOKING_A, BOOKING_C, 'res-other']));

    // the payment records of this booking are gone, nobody else's
    expect(fake.rows('transactions').map((t) => t.id).sort()).toEqual(['t-a', 't-free', 't-other']);
    // its ledger invoice is gone, the others stay. (Rows in `payments` and `invoice_lines` go with their
    // invoice through ON DELETE CASCADE in Postgres; the fake does not simulate foreign keys.)
    expect(fake.rows('invoices').map((i) => i.id).sort()).toEqual(['inv-a', 'inv-other']);
    expect(fake.rows('payments').map((p) => p.id)).toEqual(expect.arrayContaining(['pay-a', 'pay-other']));
  });

  it('answers with what was removed: transaction ids and amounts, invoice numbers', async () => {
    const res = await DELETE(del(BOOKING_B, 'hard'));
    const body = await res.json();

    expect(body.removed.transactions).toEqual([
      expect.objectContaining({ transactionId: 'TXN-001074', amount: 1500, type: 'payment' }),
    ]);
    expect(body.removed.transactionsTotal).toBe(1500);
    expect(body.removed.invoices).toEqual([expect.objectContaining({ invoiceNo: 'INV-000084' })]);
    expect(body.removed.payments).toBe(1);
  });

  it('writes a one-line audit with the transaction ids and amounts', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    await DELETE(del(BOOKING_B, 'hard'));
    const lines = info.mock.calls.map((c) => c.join(' '));
    info.mockRestore();
    const audit = lines.find((l) => l.includes(BOOKING_B) && l.includes('TXN-001074'));
    expect(audit).toBeTruthy();
    expect(audit).toMatch(/1500/);
  });

  it('takes exactly the booking\'s share out of the patient\'s figures (paid, left, count)', async () => {
    await DELETE(del(BOOKING_B, 'hard'));
    expect(customer()).toMatchObject({ spent_amount: 1200, outstanding: 2820, number_of_bookings: 2, wallet_balance: 0 });

    const other = fake.rows('customers').find((c) => c.id === OTHER_CUST)!;
    expect(other).toMatchObject({ spent_amount: 500, outstanding: 0, number_of_bookings: 1, wallet_balance: 50 });
  });

  it('deleting all three of the patient\'s bookings one by one brings every figure back to zero', async () => {
    for (const id of [BOOKING_A, BOOKING_B, BOOKING_C]) {
      expect((await DELETE(del(id, 'hard'))).status).toBe(200);
    }
    expect(customer()).toMatchObject({ spent_amount: 0, outstanding: 0, number_of_bookings: 0 });
    expect(fake.rows('transactions').map((t) => t.id).sort()).toEqual(['t-free', 't-other']);
  });

  it('a booking that was never completed gives back no money, only its place in the count', async () => {
    fake.seed('reservations', [
      ...fake.rows('reservations'),
      { id: 'res-conf', customer_id: CUST, status: 'confirmed', amount_paid: 300, amount_left: 700 },
    ]);
    fake.seed('customers', fake.rows('customers').map((c) => (c.id === CUST ? { ...c, number_of_bookings: 4 } : c)));

    await DELETE(del('res-conf', 'hard'));
    expect(customer()).toMatchObject({ spent_amount: 2700, outstanding: 2920, number_of_bookings: 3 });
  });

  it('a no-show keeps its forfeited deposit in spend, so deleting it takes that deposit out', async () => {
    fake.seed('reservations', [
      ...fake.rows('reservations'),
      { id: 'res-ns', customer_id: CUST, status: 'no_show', amount_paid: 200, amount_left: 0 },
    ]);
    await DELETE(del('res-ns', 'hard'));
    expect(customer()).toMatchObject({ spent_amount: 2500, outstanding: 2920, number_of_bookings: 2 });
  });

  it('never drives a stored figure below zero', async () => {
    fake.seed('customers', fake.rows('customers').map((c) => (c.id === CUST ? { ...c, spent_amount: 100, outstanding: 0, number_of_bookings: 0 } : c)));
    await DELETE(del(BOOKING_B, 'hard'));
    expect(customer()).toMatchObject({ spent_amount: 0, outstanding: 0, number_of_bookings: 0 });
  });

  it('does not touch the wallet', async () => {
    fake.seed('customers', fake.rows('customers').map((c) => (c.id === CUST ? { ...c, wallet_balance: 777 } : c)));
    await DELETE(del(BOOKING_B, 'hard'));
    expect(customer().wallet_balance).toBe(777);
  });

  it('keeps wallet-type transactions linked to the booking (the wallet itself is not reversed)', async () => {
    fake.seed('transactions', [
      ...fake.rows('transactions'),
      { id: 't-wallet', transaction_id: 'TXN-001077', type: 'wallet_topup', amount: 40, reservation_id: BOOKING_B, customer_id: CUST },
    ]);
    const body = await (await DELETE(del(BOOKING_B, 'hard'))).json();
    expect(fake.rows('transactions').map((t) => t.id)).toContain('t-wallet');
    expect(body.removed.walletTransactionsKept).toBe(1);
  });

  it('also removes a payment recorded against the booking\'s invoice only (no reservation_id on it)', async () => {
    fake.seed('transactions', [
      ...fake.rows('transactions'),
      { id: 't-inv', transaction_id: 'TXN-001078', type: 'outstanding_payment', amount: 50, reservation_id: null, invoice_id: 'inv-b', customer_id: CUST },
    ]);
    await DELETE(del(BOOKING_B, 'hard'));
    expect(fake.rows('transactions').map((t) => t.id)).not.toContain('t-inv');
  });

  it('gives back the package session this booking consumed (the exact inverse of the consume step)', async () => {
    fake.seed('customer_packages', [{ id: 'cp-1', customer_id: CUST, status: 'fully_used', expires_at: null }]);
    fake.seed('customer_package_items', [{ id: 'cpi-1', customer_package_id: 'cp-1', qty_total: 3, qty_used: 3, qty_remaining: 0 }]);
    fake.seed('package_revenue_recognitions', [
      { id: 'prr-1', customer_package_id: 'cp-1', customer_package_item_id: 'cpi-1', reservation_id: BOOKING_B, reason: 'session', recognised_amount: 100 },
    ]);
    const body = await (await DELETE(del(BOOKING_B, 'hard'))).json();

    expect(fake.rows('customer_package_items')[0]).toMatchObject({ qty_used: 2, qty_remaining: 1 });
    expect(fake.rows('customer_packages')[0].status).toBe('active');
    expect(body.removed.packageSessionsRestored).toBe(1);
  });
});

describe('DELETE /api/reservations?mode=hard : edge cases', () => {
  it('a booking with no patient and no payments still deletes', async () => {
    fake.seed('reservations', [...fake.rows('reservations'), { id: 'res-anon', customer_id: null, status: 'pending', amount_paid: 0 }]);
    const res = await DELETE(del('res-anon', 'hard'));
    expect(res.status).toBe(200);
    expect(fake.rows('reservations').map((r) => r.id)).not.toContain('res-anon');
    // nobody's figures moved
    expect(customer()).toMatchObject({ spent_amount: 2700, outstanding: 2920, number_of_bookings: 3 });
    expect((await res.json()).customer).toBeNull();
  });

  it('answers 404 and changes nothing for a booking that does not exist', async () => {
    const res = await DELETE(del('nope', 'hard'));
    expect(res.status).toBe(404);
    expect(fake.rows('transactions')).toHaveLength(4);
    expect(customer().spent_amount).toBe(2700);
  });

  it('is superadmin-only', async () => {
    fake.seed('employee_accounts', [{ id: 'emp-2', auth_user_id: SUPER_ID, role_name: 'receptionist' }]);
    fake.seed('roles', [{ name: 'receptionist', permissions: [] }]);
    const res = await DELETE(del(BOOKING_B, 'hard'));
    expect(res.status).toBe(403);
    expect(fake.rows('reservations').map((r) => r.id)).toContain(BOOKING_B);
    expect(fake.rows('transactions')).toHaveLength(4);
  });

  it('hard is still the default mode when none is given', async () => {
    await DELETE(del(BOOKING_B));
    expect(fake.rows('transactions').map((t) => t.id)).not.toContain('t-b');
  });
});

describe('DELETE /api/reservations?mode=hard : a failing step', () => {
  it('when deleting the payments fails, nothing is changed and the booking stays', async () => {
    failing.add('delete:transactions');
    const res = await DELETE(del(BOOKING_B, 'hard'));
    expect(res.status).toBe(500);
    expect(fake.rows('reservations').map((r) => r.id)).toContain(BOOKING_B);
    expect(fake.rows('transactions')).toHaveLength(4);
    expect(customer()).toMatchObject({ spent_amount: 2700, outstanding: 2920, number_of_bookings: 3 });
  });

  it('when deleting the booking itself fails, the payments are put back and the figures restored', async () => {
    failing.add('delete:reservations');
    const res = await DELETE(del(BOOKING_B, 'hard'));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toMatch(/nothing was deleted|not deleted/i);
    expect(fake.rows('reservations').map((r) => r.id)).toContain(BOOKING_B);
    expect(fake.rows('transactions').map((t) => t.id).sort()).toEqual(['t-a', 't-b', 't-free', 't-other']);
    expect(fake.rows('transactions').find((t) => t.id === 't-b')).toMatchObject({ transaction_id: 'TXN-001074', amount: 1500, reservation_id: BOOKING_B });
    expect(customer()).toMatchObject({ spent_amount: 2700, outstanding: 2920, number_of_bookings: 3 });
  });

  it('when the patient\'s figures cannot be updated, nothing is deleted', async () => {
    failing.add('update:customers');
    const res = await DELETE(del(BOOKING_B, 'hard'));
    expect(res.status).toBe(500);
    expect(fake.rows('reservations').map((r) => r.id)).toContain(BOOKING_B);
    expect(fake.rows('transactions')).toHaveLength(4);
    expect(fake.rows('invoices')).toHaveLength(3);
  });

  it('refuses (409) and changes nothing when the patient\'s figures changed while deleting', async () => {
    // a stale read: the figures change between the read and the guarded write
    const realFrom = fake.client.from;
    let armed = true;
    fake.client.from = (table: string) => {
      const b = realFrom(table);
      if (table === 'customers') {
        const origUpdate = b.update.bind(b);
        b.update = (vals: any) => {
          if (armed) {
            armed = false;
            const row = fake.db['customers'].find((c) => c.id === CUST)!;
            row.spent_amount = 9999;
          }
          return origUpdate(vals);
        };
      }
      return b;
    };
    try {
      const res = await DELETE(del(BOOKING_B, 'hard'));
      expect(res.status).toBe(409);
      expect(fake.rows('reservations').map((r) => r.id)).toContain(BOOKING_B);
      expect(fake.rows('transactions')).toHaveLength(4);
    } finally {
      fake.client.from = realFrom;
    }
  });

  it('if the booking is gone but its invoice could not be removed, it still succeeds and says which invoice is left', async () => {
    failing.add('delete:invoices');
    const res = await DELETE(del(BOOKING_B, 'hard'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(fake.rows('reservations').map((r) => r.id)).not.toContain(BOOKING_B);
    expect(body.warnings.join(' ')).toMatch(/INV-000084/);
  });
});

describe('DELETE /api/reservations : the other modes are unchanged', () => {
  it('soft delete only cancels: payments, invoices and figures stay', async () => {
    const res = await DELETE(del(BOOKING_B, 'soft'));
    expect(res.status).toBe(200);
    expect(fake.rows('reservations').find((r) => r.id === BOOKING_B)?.status).toBe('cancelled');
    expect(fake.rows('transactions')).toHaveLength(4);
    expect(fake.rows('invoices')).toHaveLength(3);
    expect(customer()).toMatchObject({ spent_amount: 2700, outstanding: 2920, number_of_bookings: 3 });
  });

  it('id=all clears the bookings and does NOT cascade into payments or patient figures', async () => {
    const res = await DELETE(del('all', 'hard'));
    expect(res.status).toBe(200);
    expect(fake.rows('reservations')).toHaveLength(0);
    expect(fake.rows('transactions')).toHaveLength(4);
    expect(customer()).toMatchObject({ spent_amount: 2700, outstanding: 2920, number_of_bookings: 3 });
  });
});
