/**
 * Route-level tests for POST /api/customers/settle-debt — a patient walking in to pay down what
 * they owe, with no new booking involved.
 *
 * This closes the gap RISK-012 flagged (the settlement math could reduce `customers.outstanding`,
 * but no screen ever triggered it) without repeating RISK-076's mistake: the naive version just
 * decrements the scalar, which corrupts the books because the underlying reservations still say
 * `amount_left = X` and the next touch of those bookings recomputes from them. These tests pin the
 * allocation behaviour that keeps the two in step.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseFake } from '../helpers/supabaseFake';

const fake = createSupabaseFake();

vi.mock('@/lib/supabaseServer', () => ({
  supabaseServer: {
    auth: { getUser: (...args: any[]) => fake.authGetUser(...args) },
    from: (table: string) => fake.client.from(table),
    rpc: (name: string, args?: any) => fake.client.rpc(name, args),
  },
}));

import { POST } from '@/app/api/customers/settle-debt/route';

const CUSTOMER_ID = 'cust-1';
const EMP_ID = 'emp-1';
const USER_ID = 'user-1';

function makeReq(body: any, withAuth = true): Request {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (withAuth) headers.set('Authorization', 'Bearer staff-token');
  return new Request('http://localhost:3000/api/customers/settle-debt', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

function seedStaffAuth() {
  fake.authGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
  fake.seed('employee_accounts', [{ id: EMP_ID, auth_user_id: USER_ID, role_name: 'reception', email: 'r@test.com' }]);
  fake.seed('roles', [{ name: 'reception', permissions: [] }]);
}

/** A completed booking carrying unpaid balance, plus the issued invoice it belongs to. */
function seedUnpaidBooking(id: string, date: string, paid: number, left: number) {
  fake.db.reservations.push({
    id, date, status: 'completed', customer_id: CUSTOMER_ID,
    amount_paid: paid, amount_left: left, doctor_name: 'Dr. Sara',
  });
  fake.db.invoices.push({
    id: `inv-${id}`, reservation_id: id, status: 'issued',
    invoice_no: `INV-${id}`, customer_id: CUSTOMER_ID, branch_id: null,
  });
}

let txnSeq = 1001;

beforeEach(() => {
  fake.reset();
  txnSeq = 1001;
  fake.setRpc('next_transaction_seq', () => ({ data: txnSeq++, error: null }));
  for (const t of ['customers', 'reservations', 'invoices', 'payments', 'employee_accounts', 'roles', 'transactions']) {
    fake.seed(t, []);
  }
  seedStaffAuth();
});

describe('auth and validation', () => {
  it('no Authorization header → 401', async () => {
    const res = await POST(makeReq({ customerId: CUSTOMER_ID, amount: 100 }, false));
    expect(res.status).toBe(401);
  });

  it('missing customerId → 400', async () => {
    const res = await POST(makeReq({ amount: 100 }));
    expect(res.status).toBe(400);
  });

  it.each([0, -5, NaN])('amount %s → 400', async (amount) => {
    const res = await POST(makeReq({ customerId: CUSTOMER_ID, amount }));
    expect(res.status).toBe(400);
  });

  it('unknown patient → 404', async () => {
    const res = await POST(makeReq({ customerId: 'nope', amount: 100 }));
    expect(res.status).toBe(404);
  });

  it('a patient with no debt → 400, nothing is written', async () => {
    fake.seed('customers', [{ id: CUSTOMER_ID, outstanding: 0, spent_amount: 500 }]);
    const res = await POST(makeReq({ customerId: CUSTOMER_ID, amount: 100 }));
    expect(res.status).toBe(400);
    expect(fake.rows('payments')).toHaveLength(0);
  });

  it('paying more than is owed → 400, nothing is written', async () => {
    fake.seed('customers', [{ id: CUSTOMER_ID, outstanding: 200, spent_amount: 500 }]);
    seedUnpaidBooking('res-1', '2026-01-01', 300, 200);
    const res = await POST(makeReq({ customerId: CUSTOMER_ID, amount: 500 }));
    expect(res.status).toBe(400);
    expect(fake.rows('payments')).toHaveLength(0);
    expect(fake.rows('customers')[0].outstanding).toBe(200);
  });
});

describe('allocation against real bookings', () => {
  it('settles a single booking in full and moves the customer balances', async () => {
    fake.seed('customers', [{ id: CUSTOMER_ID, outstanding: 200, spent_amount: 300 }]);
    seedUnpaidBooking('res-1', '2026-01-01', 300, 200);

    const res = await POST(makeReq({ customerId: CUSTOMER_ID, amount: 200 }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.settled).toBe(200);
    expect(body.unallocated).toBe(0);
    expect(body.outstandingAfter).toBe(0);

    // The booking itself is settled — not just the aggregate.
    const booking = fake.rows('reservations').find((r) => r.id === 'res-1')!;
    expect(booking.amount_paid).toBe(500);
    expect(booking.amount_left).toBe(0);

    const customer = fake.rows('customers')[0];
    expect(customer.outstanding).toBe(0);
    expect(customer.spent_amount).toBe(500);
  });

  it('appends a real payments row to the booking\'s existing invoice', async () => {
    fake.seed('customers', [{ id: CUSTOMER_ID, outstanding: 200, spent_amount: 300 }]);
    seedUnpaidBooking('res-1', '2026-01-01', 300, 200);

    await POST(makeReq({ customerId: CUSTOMER_ID, amount: 200 }));

    const payments = fake.rows('payments').filter((p) => p.invoice_id === 'inv-res-1');
    expect(payments).toHaveLength(1);
    expect(payments[0].amount).toBe(200);
  });

  it('allocates oldest-first across several bookings', async () => {
    fake.seed('customers', [{ id: CUSTOMER_ID, outstanding: 500, spent_amount: 0 }]);
    seedUnpaidBooking('res-old', '2026-01-01', 0, 200);
    seedUnpaidBooking('res-new', '2026-03-01', 0, 300);

    const res = await POST(makeReq({ customerId: CUSTOMER_ID, amount: 250 }));
    const body = await res.json();
    expect(body.settled).toBe(250);

    // Oldest cleared entirely, remainder lands on the newer one.
    const oldB = fake.rows('reservations').find((r) => r.id === 'res-old')!;
    const newB = fake.rows('reservations').find((r) => r.id === 'res-new')!;
    expect(oldB.amount_left).toBe(0);
    expect(newB.amount_left).toBe(250); // 300 - 50
    expect(newB.amount_paid).toBe(50);
  });

  it('a partial payment leaves the rest of the debt intact', async () => {
    fake.seed('customers', [{ id: CUSTOMER_ID, outstanding: 500, spent_amount: 0 }]);
    seedUnpaidBooking('res-1', '2026-01-01', 0, 500);

    await POST(makeReq({ customerId: CUSTOMER_ID, amount: 200 }));

    const booking = fake.rows('reservations').find((r) => r.id === 'res-1')!;
    expect(booking.amount_paid).toBe(200);
    expect(booking.amount_left).toBe(300);
    expect(fake.rows('customers')[0].outstanding).toBe(300);
  });

  it('records the settlement in the customer\'s transaction history', async () => {
    fake.seed('customers', [{ id: CUSTOMER_ID, outstanding: 200, spent_amount: 300 }]);
    seedUnpaidBooking('res-1', '2026-01-01', 300, 200);

    await POST(makeReq({ customerId: CUSTOMER_ID, amount: 200 }));

    const settlements = fake.rows('transactions').filter((t) => t.type === 'outstanding_payment');
    expect(settlements).toHaveLength(1);
    expect(settlements[0].amount).toBe(200);
    expect(settlements[0].customer_id).toBe(CUSTOMER_ID);
  });

  it('reports money it could not allocate rather than silently absorbing it', async () => {
    // Outstanding says 300, but only 100 of it is traceable to an unpaid booking — the kind of
    // drift RISK-012's inflated figures produce.
    fake.seed('customers', [{ id: CUSTOMER_ID, outstanding: 300, spent_amount: 0 }]);
    seedUnpaidBooking('res-1', '2026-01-01', 0, 100);

    const res = await POST(makeReq({ customerId: CUSTOMER_ID, amount: 300 }));
    const body = await res.json();

    expect(body.settled).toBe(100);
    expect(body.unallocated).toBe(200);
    expect(body.message).toMatch(/could not be allocated/i);
    // Only what was really applied moves the scalars.
    expect(fake.rows('customers')[0].outstanding).toBe(200);
    expect(fake.rows('customers')[0].spent_amount).toBe(100);
  });

  it('a debt with no unpaid bookings at all → 400, balances untouched', async () => {
    fake.seed('customers', [{ id: CUSTOMER_ID, outstanding: 300, spent_amount: 0 }]);
    const res = await POST(makeReq({ customerId: CUSTOMER_ID, amount: 100 }));
    expect(res.status).toBe(400);
    expect(fake.rows('customers')[0].outstanding).toBe(300);
  });

  it('only touches the paying patient\'s own bookings', async () => {
    fake.seed('customers', [
      { id: CUSTOMER_ID, outstanding: 200, spent_amount: 0 },
      { id: 'other', outstanding: 999, spent_amount: 0 },
    ]);
    seedUnpaidBooking('res-mine', '2026-01-01', 0, 200);
    fake.db.reservations.push({
      id: 'res-theirs', date: '2025-01-01', status: 'completed', customer_id: 'other',
      amount_paid: 0, amount_left: 999,
    });

    await POST(makeReq({ customerId: CUSTOMER_ID, amount: 200 }));

    expect(fake.rows('reservations').find((r) => r.id === 'res-theirs')!.amount_left).toBe(999);
    expect(fake.rows('customers').find((c) => c.id === 'other')!.outstanding).toBe(999);
  });
});
