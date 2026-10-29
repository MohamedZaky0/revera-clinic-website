/**
 * RISK-142 / DEC-138: POST /api/customers/settle-debt must be all-or-nothing and race-safe.
 *
 * The first version of the per-session settlement (DEC-136) wrote in this order:
 *   booking amount_paid/amount_left  ->  payment row + transaction (errors only logged)  ->  patient scalars
 * so a failed payment write left a booking shown as paid with no money record behind it, a failure
 * half way through a multi-booking settlement stayed half applied, and the patient's
 * `outstanding` / `spent_amount` were written back as absolute numbers computed from an earlier
 * read, so two settlements at the same moment lost one of the updates.
 *
 * These tests inject failures and concurrent writes through `fakeWithHook` and check the final
 * state of every table, not only the response.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseFake } from '../helpers/supabaseFake';
import { fakeWithHook, type FaultCall } from '../helpers/supabaseFaults';

const fake = createSupabaseFake();
let hook: ((call: FaultCall) => any) | null = null;
const faultyFrom = fakeWithHook(fake, (call) => (hook ? hook(call) : undefined));

vi.mock('@/lib/supabaseServer', () => ({
  supabaseServer: {
    auth: { getUser: (...args: any[]) => fake.authGetUser(...args), getClaims: (...args: any[]) => fake.authGetClaims(...args) },
    from: (table: string) => faultyFrom(table),
    rpc: (name: string, args?: any) => fake.client.rpc(name, args),
  },
}));

import { POST } from '@/app/api/customers/settle-debt/route';

const CUSTOMER_ID = 'cust-1';
const EMP_ID = 'emp-1';
const USER_ID = 'user-1';

function makeReq(body: any): Request {
  return new Request('http://localhost:3000/api/customers/settle-debt', {
    method: 'POST',
    headers: new Headers({ 'content-type': 'application/json', Authorization: 'Bearer staff-token' }),
    body: JSON.stringify(body),
  });
}

function seedUnpaidBooking(id: string, date: string, paid: number, left: number, opts: { invoice?: boolean } = {}) {
  fake.db.reservations.push({
    id, date, status: 'completed', customer_id: CUSTOMER_ID,
    amount_paid: paid, amount_left: left, doctor_name: 'Dr. Sara',
  });
  if (opts.invoice !== false) {
    fake.db.invoices.push({
      id: `inv-${id}`, reservation_id: id, status: 'issued',
      invoice_no: `INV-${id}`, customer_id: CUSTOMER_ID, branch_id: null, grand_total: paid + left,
    });
  }
}

const booking = (id: string) => fake.rows('reservations').find((r) => r.id === id)!;
const customer = () => fake.rows('customers')[0];
const FAIL = { error: { message: 'boom' } };

/** Nothing the failed settlement wrote may remain anywhere. */
function expectNoMoneyRecords() {
  expect(fake.rows('payments')).toHaveLength(0);
  expect(fake.rows('transactions')).toHaveLength(0);
}

let txnSeq = 1001;

beforeEach(() => {
  fake.reset();
  hook = null;
  txnSeq = 1001;
  fake.setRpc('next_transaction_seq', () => ({ data: txnSeq++, error: null }));
  for (const t of ['customers', 'reservations', 'invoices', 'payments', 'employee_accounts', 'roles', 'transactions']) {
    fake.seed(t, []);
  }
  fake.authGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
  fake.seed('employee_accounts', [{ id: EMP_ID, auth_user_id: USER_ID, role_name: 'reception', email: 'r@test.com' }]);
  fake.seed('roles', [{ name: 'reception', permissions: [] }]);
});

describe('a failed money record never leaves a paid booking (finding 1)', () => {
  beforeEach(() => {
    fake.seed('customers', [{ id: CUSTOMER_ID, outstanding: 200, spent_amount: 300 }]);
    seedUnpaidBooking('res-1', '2026-01-01', 300, 200);
  });

  it('targeted booking: the payment row cannot be written -> 500, booking and patient untouched', async () => {
    hook = (c) => (c.table === 'payments' && c.op === 'insert' ? FAIL : undefined);

    const res = await POST(makeReq({ customerId: CUSTOMER_ID, amount: 200, reservationId: 'res-1' }));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/nothing was changed/i);
    expect(body.success).toBeUndefined();
    expect(booking('res-1').amount_paid).toBe(300);
    expect(booking('res-1').amount_left).toBe(200);
    expect(customer().outstanding).toBe(200);
    expect(customer().spent_amount).toBe(300);
    expectNoMoneyRecords();
  });

  it('targeted booking: the transaction row cannot be written -> the payment row is taken back out', async () => {
    hook = (c) => (c.table === 'transactions' && c.op === 'insert' ? FAIL : undefined);

    const res = await POST(makeReq({ customerId: CUSTOMER_ID, amount: 200, reservationId: 'res-1' }));

    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/nothing was changed/i);
    expect(booking('res-1').amount_left).toBe(200);
    expect(customer().outstanding).toBe(200);
    expectNoMoneyRecords();
  });

  it('a void invoice never receives the payment: only the transaction is recorded (RISK-143)', async () => {
    fake.seed('invoices', [{ id: 'inv-void', reservation_id: 'res-1', invoice_no: 'INV-000900', status: 'void', customer_id: CUSTOMER_ID, branch_id: null, created_at: '2026-01-02T00:00:00Z' }]);

    const res = await POST(makeReq({ customerId: CUSTOMER_ID, amount: 200, reservationId: 'res-1' }));

    expect(res.status).toBe(200);
    expect(fake.rows('payments')).toHaveLength(0);
    expect(fake.rows('transactions')).toHaveLength(1);
    expect(booking('res-1').amount_left).toBe(0);
    expect(customer().outstanding).toBe(0);
  });

  it('a booking without an invoice records only the transaction, and a failure there changes nothing', async () => {
    fake.seed('invoices', []);
    hook = (c) => (c.table === 'transactions' && c.op === 'insert' ? FAIL : undefined);

    const res = await POST(makeReq({ customerId: CUSTOMER_ID, amount: 200, reservationId: 'res-1' }));

    expect(res.status).toBe(500);
    expect(booking('res-1').amount_left).toBe(200);
    expect(customer().outstanding).toBe(200);
    expectNoMoneyRecords();
  });

  it('the booking balance cannot be written -> payment and transaction are taken back out', async () => {
    hook = (c) => (c.table === 'reservations' && c.op === 'update' ? FAIL : undefined);

    const res = await POST(makeReq({ customerId: CUSTOMER_ID, amount: 200, reservationId: 'res-1' }));

    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/nothing was changed/i);
    expect(booking('res-1').amount_left).toBe(200);
    expect(customer().outstanding).toBe(200);
    expectNoMoneyRecords();
  });

  it("the patient's figures cannot be written -> booking restored, payment and transaction taken back out", async () => {
    hook = (c) => (c.table === 'customers' && c.op === 'update' ? FAIL : undefined);

    const res = await POST(makeReq({ customerId: CUSTOMER_ID, amount: 200, reservationId: 'res-1' }));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/nothing was changed/i);
    expect(booking('res-1').amount_paid).toBe(300);
    expect(booking('res-1').amount_left).toBe(200);
    expect(customer().outstanding).toBe(200);
    expect(customer().spent_amount).toBe(300);
    expectNoMoneyRecords();
  });

  it('when the undo itself fails the response says exactly what is still applied', async () => {
    hook = (c) => {
      if (c.table === 'customers' && c.op === 'update') return FAIL;
      if (c.table === 'payments' && c.op === 'delete') return FAIL; // the undo cannot remove the payment row
      return undefined;
    };

    const res = await POST(makeReq({ customerId: CUSTOMER_ID, amount: 200, reservationId: 'res-1' }));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.partial).toBe(true);
    expect(body.error).toMatch(/could not be undone/i);
    expect(body.undoFailures.join(' ')).toMatch(/payment/i);
    expect(body.applied).toEqual([expect.objectContaining({ reservationId: 'res-1', amount: 200, leftover: ['payment row'] })]);
    // The booking itself was restored; the stray payment row is what is left, and it is named.
    expect(booking('res-1').amount_left).toBe(200);
    expect(fake.rows('payments')).toHaveLength(1);
  });
});

describe('standalone invoice settlement (finding 1, second branch)', () => {
  beforeEach(() => {
    fake.seed('customers', [{ id: CUSTOMER_ID, outstanding: 400, spent_amount: 0 }]);
    fake.db.invoices.push({
      id: 'inv-pkg', reservation_id: null, status: 'issued', invoice_no: 'INV-PKG',
      customer_id: CUSTOMER_ID, branch_id: null, grand_total: 400, created_at: '2026-02-01',
    });
  });

  it('settles an invoice: payment row, transaction and patient figures all move', async () => {
    const res = await POST(makeReq({ customerId: CUSTOMER_ID, amount: 150, reservationId: 'inv-pkg' }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.settled).toBe(150);
    expect(body.outstandingAfter).toBe(250);
    expect(body.allocations).toEqual([{ reservationId: 'inv-pkg', amount: 150, date: '2026-02-01' }]);
    expect(fake.rows('payments')).toHaveLength(1);
    expect(fake.rows('transactions')).toHaveLength(1);
    expect(customer().outstanding).toBe(250);
    expect(customer().spent_amount).toBe(150);
  });

  it('a failed payment insert no longer lets the patient figures drop', async () => {
    hook = (c) => (c.table === 'payments' && c.op === 'insert' ? FAIL : undefined);

    const res = await POST(makeReq({ customerId: CUSTOMER_ID, amount: 150, reservationId: 'inv-pkg' }));

    expect(res.status).toBe(500);
    expect(customer().outstanding).toBe(400);
    expect(customer().spent_amount).toBe(0);
    expectNoMoneyRecords();
  });

  it("a failed patient-figures update is an error and takes the payment back out", async () => {
    hook = (c) => (c.table === 'customers' && c.op === 'update' ? FAIL : undefined);

    const res = await POST(makeReq({ customerId: CUSTOMER_ID, amount: 150, reservationId: 'inv-pkg' }));

    expect(res.status).toBe(500);
    expect(customer().outstanding).toBe(400);
    expectNoMoneyRecords();
  });
});

describe('FIFO settlement is all-or-nothing (finding 1, loop)', () => {
  beforeEach(() => {
    fake.seed('customers', [{ id: CUSTOMER_ID, outstanding: 300, spent_amount: 0 }]);
    seedUnpaidBooking('res-a', '2026-01-01', 0, 100);
    seedUnpaidBooking('res-b', '2026-02-01', 0, 100);
    seedUnpaidBooking('res-c', '2026-03-01', 0, 100);
  });

  it('a failure on the second booking undoes the first and reports that nothing was applied', async () => {
    let paymentInserts = 0;
    hook = (c) => {
      if (c.table === 'payments' && c.op === 'insert') {
        paymentInserts += 1;
        if (paymentInserts === 2) return FAIL;
      }
      return undefined;
    };

    const res = await POST(makeReq({ customerId: CUSTOMER_ID, amount: 300 }));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/nothing was changed/i);
    expect(body.success).toBeUndefined();
    for (const id of ['res-a', 'res-b', 'res-c']) {
      expect(booking(id).amount_paid).toBe(0);
      expect(booking(id).amount_left).toBe(100);
    }
    expect(customer().outstanding).toBe(300);
    expect(customer().spent_amount).toBe(0);
    expectNoMoneyRecords();
  });

  it('a failure on the second booking whose undo also fails names the allocation that is still applied', async () => {
    let paymentInserts = 0;
    hook = (c) => {
      if (c.table === 'payments' && c.op === 'insert') {
        paymentInserts += 1;
        if (paymentInserts === 2) return FAIL;
      }
      if (c.table === 'reservations' && c.op === 'update' && c.payload?.amount_left === 100) return FAIL; // restoring res-a fails
      return undefined;
    };

    const res = await POST(makeReq({ customerId: CUSTOMER_ID, amount: 300 }));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.partial).toBe(true);
    expect(body.applied).toEqual([expect.objectContaining({ reservationId: 'res-a', amount: 100, leftover: ['booking balance'] })]);
    expect(body.undoFailures.length).toBeGreaterThan(0);
    // The booking could not be restored, so its payment and transaction are deliberately KEPT:
    // booking and ledger still agree with each other (res-a is simply paid), and res-b / res-c are untouched.
    expect(booking('res-a').amount_left).toBe(0);
    expect(fake.rows('payments')).toHaveLength(1);
    expect(fake.rows('transactions')).toHaveLength(1);
    expect(booking('res-b').amount_left).toBe(100);
    // The patient's figures were never touched, so the report is the whole story.
    expect(customer().outstanding).toBe(300);
  });

  it('settles every booking when nothing fails, with the same response shape as before', async () => {
    const res = await POST(makeReq({ customerId: CUSTOMER_ID, amount: 250 }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ success: true, settled: 250, unallocated: 0, outstandingAfter: 50, paymentMethod: 'cash' });
    expect(body.allocations).toEqual([
      { reservationId: 'res-a', amount: 100, date: '2026-01-01' },
      { reservationId: 'res-b', amount: 100, date: '2026-02-01' },
      { reservationId: 'res-c', amount: 50, date: '2026-03-01' },
    ]);
    expect(fake.rows('payments')).toHaveLength(3);
    expect(fake.rows('transactions')).toHaveLength(3);
    expect(customer().outstanding).toBe(50);
    expect(customer().spent_amount).toBe(250);
  });

  it("does not count a booking's own invoice a second time when money is left over", async () => {
    // res-a's invoice still shows 100 unpaid before this settlement; paying res-a clears it, so the
    // invoice pass must not allocate the leftover 50 to the same invoice again.
    fake.seed('customers', [{ id: CUSTOMER_ID, outstanding: 150, spent_amount: 0 }]);
    fake.seed('reservations', []);
    fake.seed('invoices', []);
    seedUnpaidBooking('res-a', '2026-01-01', 0, 100);

    const res = await POST(makeReq({ customerId: CUSTOMER_ID, amount: 150 }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.settled).toBe(100);
    expect(body.unallocated).toBe(50);
    expect(fake.rows('payments')).toHaveLength(1);
    expect(customer().outstanding).toBe(50);
  });
});

describe('the patient figures survive a concurrent change (finding 2)', () => {
  it("a change made between the read and the write is kept: the update is re-applied on the fresh numbers", async () => {
    fake.seed('customers', [{ id: CUSTOMER_ID, outstanding: 500, spent_amount: 0 }]);
    seedUnpaidBooking('res-1', '2026-01-01', 0, 500);

    // Another request settles 50 elsewhere right before this request writes the patient's figures.
    let interfered = false;
    hook = (c) => {
      if (!interfered && c.table === 'customers' && c.op === 'update') {
        interfered = true;
        const row = fake.db.customers[0];
        row.outstanding = 450;
        row.spent_amount = 50;
      }
      return undefined;
    };

    const res = await POST(makeReq({ customerId: CUSTOMER_ID, amount: 200, reservationId: 'res-1' }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(customer().outstanding).toBe(250); // 450 - 200, not 500 - 200
    expect(customer().spent_amount).toBe(250); // 50 + 200, not 0 + 200
    expect(body.outstandingAfter).toBe(250);
  });

  it('two settlements of one patient at the same moment both count', async () => {
    fake.seed('customers', [{ id: CUSTOMER_ID, outstanding: 500, spent_amount: 0 }]);
    seedUnpaidBooking('res-a', '2026-01-01', 0, 200);
    seedUnpaidBooking('res-b', '2026-02-01', 0, 300);

    // Hold both requests at their first write to the patient until each has read the old figures,
    // so they genuinely overlap (the in-memory database would otherwise happen to serialise them).
    let arrived = 0;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    hook = async (c) => {
      if (c.table === 'customers' && c.op === 'update') {
        arrived += 1;
        if (arrived >= 2) release();
        if (arrived <= 2) await Promise.race([gate, new Promise((r) => setTimeout(r, 200))]);
      }
      return undefined;
    };

    const [r1, r2] = await Promise.all([
      POST(makeReq({ customerId: CUSTOMER_ID, amount: 200, reservationId: 'res-a' })),
      POST(makeReq({ customerId: CUSTOMER_ID, amount: 300, reservationId: 'res-b' })),
    ]);

    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(customer().outstanding).toBe(0);
    expect(customer().spent_amount).toBe(500);
    expect(booking('res-a').amount_left).toBe(0);
    expect(booking('res-b').amount_left).toBe(0);
    expect(fake.rows('payments')).toHaveLength(2);
  });

  it('two settlements racing for the SAME booking: one is paid, the other is refused, the money is not doubled', async () => {
    fake.seed('customers', [{ id: CUSTOMER_ID, outstanding: 200, spent_amount: 0 }]);
    seedUnpaidBooking('res-1', '2026-01-01', 0, 200);

    // Both requests must have read "200 left" before either writes anything.
    let arrived = 0;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    hook = async (c) => {
      if (c.table === 'payments' && c.op === 'insert') {
        arrived += 1;
        if (arrived >= 2) release();
        if (arrived <= 2) await Promise.race([gate, new Promise((r) => setTimeout(r, 200))]);
      }
      return undefined;
    };

    const results = await Promise.all([
      POST(makeReq({ customerId: CUSTOMER_ID, amount: 200, reservationId: 'res-1' })),
      POST(makeReq({ customerId: CUSTOMER_ID, amount: 200, reservationId: 'res-1' })),
    ]);
    const statuses = results.map((r) => r.status).sort();

    expect(statuses).toEqual([200, 409]);
    expect(booking('res-1').amount_paid).toBe(200);
    expect(booking('res-1').amount_left).toBe(0);
    expect(fake.rows('payments')).toHaveLength(1);
    expect(fake.rows('transactions')).toHaveLength(1);
    expect(customer().outstanding).toBe(0);
    expect(customer().spent_amount).toBe(200);
  });

  it('a booking that changed under the request is a 409 and everything is undone', async () => {
    fake.seed('customers', [{ id: CUSTOMER_ID, outstanding: 200, spent_amount: 0 }]);
    seedUnpaidBooking('res-1', '2026-01-01', 0, 200);

    let interfered = false;
    hook = (c) => {
      if (!interfered && c.table === 'reservations' && c.op === 'update') {
        interfered = true;
        fake.db.reservations[0].amount_left = 120; // someone else already took 80
        fake.db.reservations[0].amount_paid = 80;
      }
      return undefined;
    };

    const res = await POST(makeReq({ customerId: CUSTOMER_ID, amount: 200, reservationId: 'res-1' }));

    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/changed while this was running/i);
    expect(booking('res-1').amount_left).toBe(120);
    expect(booking('res-1').amount_paid).toBe(80);
    expectNoMoneyRecords();
    expect(customer().outstanding).toBe(200);
  });

  it('figures that keep changing exhaust the retries: 409, everything undone, nothing half written', async () => {
    fake.seed('customers', [{ id: CUSTOMER_ID, outstanding: 500, spent_amount: 0 }]);
    seedUnpaidBooking('res-1', '2026-01-01', 0, 500);

    hook = (c) => {
      if (c.table === 'customers' && c.op === 'update') {
        const row = fake.db.customers[0];
        row.outstanding = Number(row.outstanding) - 1; // somebody else keeps writing
      }
      return undefined;
    };

    const res = await POST(makeReq({ customerId: CUSTOMER_ID, amount: 200, reservationId: 'res-1' }));

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe('PATIENT_FIGURES_CHANGED');
    expect(body.error).toMatch(/nothing was changed/i);
    expect(booking('res-1').amount_left).toBe(500);
    expect(booking('res-1').amount_paid).toBe(0);
    expectNoMoneyRecords();
  });
});
