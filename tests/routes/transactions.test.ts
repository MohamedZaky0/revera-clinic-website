/**
 * Route-level tests for GET/POST /api/transactions — the Financial Transactions & Daily Ledger
 * module (RISK-076: see ai_docs/RISKS.md).
 *
 * Requirements & Validations:
 *  - Manual creation is strictly limited to 3 allowed transaction types:
 *    `refund`, `service_charge`, `product_purchase`.
 *  - Prohibited from manual creation: `payment`, `outstanding_payment`, `wallet_topup`,
 *    `wallet_deduction`, `adjustment` (these are automated through bookings, settlement, and wallet flows).
 *  - GET /api/transactions supports filtering by `source` ('all' | 'manual' | 'automatic'),
 *    `dateRange`, `type`, `paymentMethod`, `status`, `branchId`, `amountRange`, `customerId`, and `search`.
 *  - Permission guards: `transactions.view` for GET, `transactions.create` for POST,
 *    and `transactions.refund` additionally required for refunds.
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

import { GET, POST } from '@/app/api/transactions/route';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const CUSTOMER_ID = 'cust-1';
const EMP_ID = 'emp-1';
const USER_ID = 'user-1';

function makeReq(method: 'GET' | 'POST', opts: { query?: string; body?: any; headers?: Record<string, string> } = {}): Request {
  const headers = new Headers(opts.headers);
  headers.set('content-type', 'application/json');
  const qs = opts.query ? `?${opts.query}` : '';
  return new Request(`http://localhost:3000/api/transactions${qs}`, {
    method,
    headers,
    body: method === 'POST' ? JSON.stringify(opts.body ?? {}) : undefined,
  });
}

function staffReq(method: 'GET' | 'POST', opts: { query?: string; body?: any } = {}) {
  return makeReq(method, { ...opts, headers: { Authorization: 'Bearer staff-token' } });
}

function noAuthReq(method: 'GET' | 'POST', opts: { query?: string; body?: any } = {}) {
  return makeReq(method, opts);
}

/** Seeds an authenticated staff member with the given role/permissions. */
function seedStaffAuth(role: string, permissions: string[] = []) {
  fake.authGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
  fake.seed('employee_accounts', [{ id: EMP_ID, auth_user_id: USER_ID, role_name: role, email: 'staff@test.com' }]);
  fake.seed('roles', [{ name: role, permissions }]);
}

let seqCounter = 1001;

beforeEach(() => {
  fake.reset();
  seqCounter = 1001;
  fake.setRpc('next_transaction_seq', () => ({ data: seqCounter++, error: null }));
  for (const t of ['transactions', 'transaction_audit_logs', 'customers', 'employee_accounts', 'roles', 'branches', 'wallet_txns']) {
    fake.seed(t, []);
  }
});

// ── Auth / permission guard ──────────────────────────────────────────────────

describe('auth guard', () => {
  it('GET with no Authorization header → 401', async () => {
    const res = await GET(noAuthReq('GET'));
    expect(res.status).toBe(401);
  });

  it('POST with no Authorization header → 401', async () => {
    const res = await POST(noAuthReq('POST', { body: { transaction_type: 'service_charge', customer_id: CUSTOMER_ID, amount: 100, description: 'Consultation' } }));
    expect(res.status).toBe(401);
  });

  it('GET is rejected for staff without transactions.view (RISK-076)', async () => {
    seedStaffAuth('receptionist', []);
    const res = await GET(staffReq('GET'));
    expect(res.status).toBe(403);
  });

  it('GET succeeds for staff granted transactions.view', async () => {
    seedStaffAuth('receptionist', ['transactions.view']);
    const res = await GET(staffReq('GET'));
    expect(res.status).toBe(200);
  });

  it('GET succeeds for superadmin regardless of granted permissions (RISK-076)', async () => {
    seedStaffAuth('superadmin', []);
    const res = await GET(staffReq('GET'));
    expect(res.status).toBe(200);
  });

  it('POST is rejected for staff without transactions.create (RISK-076)', async () => {
    seedStaffAuth('receptionist', []);
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 0, outstanding: 0, spent_amount: 0 }]);
    const res = await POST(staffReq('POST', { body: { transaction_type: 'service_charge', customer_id: CUSTOMER_ID, amount: 100, description: 'Consultation' } }));
    expect(res.status).toBe(403);
  });

  it('a service_charge succeeds for staff granted only transactions.create, no transactions.refund', async () => {
    seedStaffAuth('receptionist', ['transactions.create']);
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 0, outstanding: 0, spent_amount: 0 }]);
    const res = await POST(staffReq('POST', { body: { transaction_type: 'service_charge', customer_id: CUSTOMER_ID, amount: 100, description: 'Consultation fee' } }));
    expect(res.status).toBe(200);
  });

  it('a refund is rejected for staff with transactions.create but not transactions.refund (RISK-076)', async () => {
    seedStaffAuth('receptionist', ['transactions.create']);
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 0, outstanding: 0, spent_amount: 500 }]);
    const res = await POST(staffReq('POST', {
      body: { transaction_type: 'refund', customer_id: CUSTOMER_ID, amount: 100, reason: 'test' },
    }));
    expect(res.status).toBe(403);
  });

  it('a refund succeeds for staff granted both transactions.create and transactions.refund', async () => {
    seedStaffAuth('receptionist', ['transactions.create', 'transactions.refund']);
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 0, outstanding: 0, spent_amount: 500 }]);
    const res = await POST(staffReq('POST', {
      body: { transaction_type: 'refund', customer_id: CUSTOMER_ID, amount: 100, reason: 'test' },
    }));
    expect(res.status).toBe(200);
  });
});

// ── POST validation ───────────────────────────────────────────────────────────

describe('POST — request validation & allowed types', () => {
  beforeEach(() => seedStaffAuth('superadmin', []));

  it('missing transaction_type → 400', async () => {
    const res = await POST(staffReq('POST', { body: { customer_id: CUSTOMER_ID, amount: 100 } }));
    expect(res.status).toBe(400);
  });

  it('unknown transaction_type → 400', async () => {
    const res = await POST(staffReq('POST', { body: { transaction_type: 'not_a_real_type', customer_id: CUSTOMER_ID, amount: 100 } }));
    expect(res.status).toBe(400);
  });

  it('manual "payment" is rejected → 400 (automated via bookings/checkout only)', async () => {
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 0, outstanding: 0, spent_amount: 0 }]);
    const res = await POST(staffReq('POST', { body: { transaction_type: 'payment', customer_id: CUSTOMER_ID, amount: 100 } }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/direct payments are recorded automatically/i);
  });

  it('manual "outstanding_payment" is rejected → 400 (automated via Settle Balance only)', async () => {
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 0, outstanding: 400, spent_amount: 1000 }]);
    const res = await POST(staffReq('POST', {
      body: { transaction_type: 'outstanding_payment', customer_id: CUSTOMER_ID, amount: 300 },
    }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/settle balance/i);
  });

  it('manual "wallet_topup" is rejected → 400 (automated via patient wallet workflow)', async () => {
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 0, outstanding: 0, spent_amount: 0 }]);
    const res = await POST(staffReq('POST', { body: { transaction_type: 'wallet_topup', customer_id: CUSTOMER_ID, amount: 200 } }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/wallet deposits and deductions are automated/i);
  });

  it('manual "wallet_deduction" is rejected → 400 (automated via patient wallet workflow)', async () => {
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 500, outstanding: 0, spent_amount: 0 }]);
    const res = await POST(staffReq('POST', { body: { transaction_type: 'wallet_deduction', customer_id: CUSTOMER_ID, amount: 200 } }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/wallet deposits and deductions are automated/i);
  });

  it('manual "adjustment" is rejected → 400', async () => {
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 0, outstanding: 0, spent_amount: 0 }]);
    const res = await POST(staffReq('POST', { body: { transaction_type: 'adjustment', customer_id: CUSTOMER_ID, amount: 100 } }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/manual balance adjustments are not permitted/i);
  });

  it.each([0, -50, NaN])('amount %s → 400', async (amount) => {
    const res = await POST(staffReq('POST', { body: { transaction_type: 'service_charge', customer_id: CUSTOMER_ID, amount, description: 'Test' } }));
    expect(res.status).toBe(400);
  });

  it('missing customer_id → 400', async () => {
    const res = await POST(staffReq('POST', { body: { transaction_type: 'service_charge', amount: 100, description: 'Test' } }));
    expect(res.status).toBe(400);
  });

  it('an unknown customer_id → 404, not treated as a query failure', async () => {
    const res = await POST(staffReq('POST', { body: { transaction_type: 'service_charge', customer_id: 'does-not-exist', amount: 100, description: 'Test' } }));
    expect(res.status).toBe(404);
  });
});

// ── POST — transaction_id generation ──────────────────────────────────────────

describe('POST — transaction_id generation', () => {
  beforeEach(() => seedStaffAuth('superadmin', []));

  it('formats the id from the real transaction_seq RPC, not a random number', async () => {
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 0, outstanding: 0, spent_amount: 0 }]);
    const res = await POST(staffReq('POST', { body: { transaction_type: 'service_charge', customer_id: CUSTOMER_ID, amount: 100, description: 'Admin fee' } }));
    const body = await res.json();
    expect(body.transaction.transaction_id).toBe('TXN-001001');
  });

  it('two transactions in a row get sequential, non-colliding ids', async () => {
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 0, outstanding: 0, spent_amount: 0 }]);
    const res1 = await POST(staffReq('POST', { body: { transaction_type: 'service_charge', customer_id: CUSTOMER_ID, amount: 100, description: 'Fee 1' } }));
    const res2 = await POST(staffReq('POST', { body: { transaction_type: 'service_charge', customer_id: CUSTOMER_ID, amount: 100, description: 'Fee 2' } }));
    const [body1, body2] = [await res1.json(), await res2.json()];
    expect(body1.transaction.transaction_id).not.toBe(body2.transaction.transaction_id);
    expect(body2.transaction.transaction_id).toBe('TXN-001002');
  });
});

// ── POST — service_charge ─────────────────────────────────────────────────────

describe('POST — service_charge', () => {
  beforeEach(() => seedStaffAuth('superadmin', []));

  it('requires a description', async () => {
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 0, outstanding: 0, spent_amount: 0 }]);
    const res = await POST(staffReq('POST', { body: { transaction_type: 'service_charge', customer_id: CUSTOMER_ID, amount: 150 } }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/description is required/i);
  });

  it('increases spent_amount, sets source manual and status completed', async () => {
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 100, outstanding: 50, spent_amount: 500 }]);
    const res = await POST(staffReq('POST', {
      body: {
        transaction_type: 'service_charge',
        customer_id: CUSTOMER_ID,
        amount: 250,
        description: 'Late cancellation fee',
        payment_method: 'card',
        reference_no: 'REF-789',
      },
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.transaction.amount).toBe(250);
    expect(body.transaction.status).toBe('completed');
    expect(body.transaction.source).toBe('manual');
    expect(body.transaction.description).toBe('Late cancellation fee');
    expect(body.transaction.reference_no).toBe('REF-789');

    const customer = fake.rows('customers').find((c) => c.id === CUSTOMER_ID)!;
    expect(customer.spent_amount).toBe(750);
    expect(customer.wallet_balance).toBe(100);
    expect(customer.outstanding).toBe(50);
  });
});

// ── POST — product_purchase ───────────────────────────────────────────────────

describe('POST — product_purchase', () => {
  beforeEach(() => seedStaffAuth('superadmin', []));

  it('increases spent_amount and formats description with item name and quantity', async () => {
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 0, outstanding: 0, spent_amount: 300 }]);
    const res = await POST(staffReq('POST', {
      body: {
        transaction_type: 'product_purchase',
        customer_id: CUSTOMER_ID,
        amount: 400,
        item_type: 'product',
        item_id: 'prod-123',
        item_name: 'Hyaluronic Acid Serum',
        quantity: 2,
        unit_price: 200,
        payment_method: 'cash',
      },
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.transaction.amount).toBe(400);
    expect(body.transaction.status).toBe('completed');
    expect(body.transaction.source).toBe('manual');
    expect(body.transaction.description).toBe('Hyaluronic Acid Serum (Qty: 2)');

    const customer = fake.rows('customers').find((c) => c.id === CUSTOMER_ID)!;
    expect(customer.spent_amount).toBe(700);

    const logs = fake.rows('transaction_audit_logs');
    expect(logs).toHaveLength(1);
    expect(logs[0].details).toMatchObject({
      transaction_type: 'product_purchase',
      item_name: 'Hyaluronic Acid Serum',
      quantity: 2,
      unit_price: 200,
    });
  });
});

// ── POST — refund ─────────────────────────────────────────────────────────────

describe('POST — refund', () => {
  beforeEach(() => seedStaffAuth('superadmin', []));

  it('requires a reason', async () => {
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 0, outstanding: 0, spent_amount: 500 }]);
    const res = await POST(staffReq('POST', { body: { transaction_type: 'refund', customer_id: CUSTOMER_ID, amount: 100 } }));
    expect(res.status).toBe(400);
  });

  it('records a negative amount, status refunded, and decreases spent_amount', async () => {
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 0, outstanding: 0, spent_amount: 500 }]);
    const res = await POST(staffReq('POST', {
      body: { transaction_type: 'refund', customer_id: CUSTOMER_ID, amount: 200, reason: 'Patient cancelled' },
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.transaction.amount).toBe(-200);
    expect(body.transaction.status).toBe('refunded');
    expect(body.transaction.source).toBe('manual');
    const customer = fake.rows('customers').find((c) => c.id === CUSTOMER_ID)!;
    expect(customer.spent_amount).toBe(300);
  });

  it('rejects a refund amount exceeding the linked original transaction', async () => {
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 0, outstanding: 0, spent_amount: 500 }]);
    fake.seed('transactions', [{ id: 'orig-1', amount: 300, status: 'completed', customer_id: CUSTOMER_ID }]);
    const res = await POST(staffReq('POST', {
      body: { transaction_type: 'refund', customer_id: CUSTOMER_ID, amount: 400, reason: 'test', related_transaction_id: 'orig-1' },
    }));
    expect(res.status).toBe(400);
  });

  it('rejects a refund against another patient\'s transaction', async () => {
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 0, outstanding: 0, spent_amount: 500 }]);
    fake.seed('transactions', [{ id: 'orig-1', amount: 300, status: 'completed', customer_id: 'someone-else' }]);
    const res = await POST(staffReq('POST', {
      body: { transaction_type: 'refund', customer_id: CUSTOMER_ID, amount: 100, reason: 'test', related_transaction_id: 'orig-1' },
    }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/different patient/i);
  });

  it('rejects an unknown related_transaction_id with 404', async () => {
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 0, outstanding: 0, spent_amount: 500 }]);
    const res = await POST(staffReq('POST', {
      body: { transaction_type: 'refund', customer_id: CUSTOMER_ID, amount: 100, reason: 'test', related_transaction_id: 'nope' },
    }));
    expect(res.status).toBe(404);
  });

  it('caps refunds cumulatively — a second refund can only take what is left', async () => {
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 0, outstanding: 0, spent_amount: 500 }]);
    fake.seed('transactions', [
      { id: 'orig-1', amount: 300, status: 'completed', customer_id: CUSTOMER_ID },
      { id: 'ref-1', amount: -200, type: 'refund', status: 'refunded', customer_id: CUSTOMER_ID, related_transaction_id: 'orig-1' },
    ]);

    const tooMuch = await POST(staffReq('POST', {
      body: { transaction_type: 'refund', customer_id: CUSTOMER_ID, amount: 150, reason: 'test', related_transaction_id: 'orig-1' },
    }));
    expect(tooMuch.status).toBe(400);
    expect((await tooMuch.json()).error).toMatch(/already refunded/i);

    const exactRemainder = await POST(staffReq('POST', {
      body: { transaction_type: 'refund', customer_id: CUSTOMER_ID, amount: 100, reason: 'test', related_transaction_id: 'orig-1' },
    }));
    expect(exactRemainder.status).toBe(200);
  });

  it('rejects any further refund once the original is fully refunded', async () => {
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 0, outstanding: 0, spent_amount: 500 }]);
    fake.seed('transactions', [
      { id: 'orig-1', amount: 300, status: 'completed', customer_id: CUSTOMER_ID },
      { id: 'ref-1', amount: -300, type: 'refund', status: 'refunded', customer_id: CUSTOMER_ID, related_transaction_id: 'orig-1' },
    ]);
    const res = await POST(staffReq('POST', {
      body: { transaction_type: 'refund', customer_id: CUSTOMER_ID, amount: 50, reason: 'test', related_transaction_id: 'orig-1' },
    }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/fully refunded/i);
  });

  it('refund_destination "cash" leaves the wallet untouched', async () => {
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 100, outstanding: 0, spent_amount: 500 }]);
    await POST(staffReq('POST', {
      body: { transaction_type: 'refund', customer_id: CUSTOMER_ID, amount: 200, reason: 'test', refund_destination: 'cash' },
    }));
    const customer = fake.rows('customers').find((c) => c.id === CUSTOMER_ID)!;
    expect(customer.wallet_balance).toBe(100);
    expect(customer.spent_amount).toBe(300);
    expect(fake.rows('wallet_txns')).toHaveLength(0);
  });

  it('refund_destination "wallet" credits the wallet and writes a ledger row', async () => {
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 100, outstanding: 0, spent_amount: 500 }]);
    await POST(staffReq('POST', {
      body: { transaction_type: 'refund', customer_id: CUSTOMER_ID, amount: 200, reason: 'test', refund_destination: 'wallet' },
    }));
    const customer = fake.rows('customers').find((c) => c.id === CUSTOMER_ID)!;
    expect(customer.wallet_balance).toBe(300);
    expect(customer.spent_amount).toBe(300);
    expect(fake.rows('wallet_txns')).toMatchObject([{ direction: 'in', amount: 200 }]);
  });

  it('does not let spent_amount go negative on an over-large refund with no linked original', async () => {
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 0, outstanding: 0, spent_amount: 100 }]);
    const res = await POST(staffReq('POST', {
      body: { transaction_type: 'refund', customer_id: CUSTOMER_ID, amount: 300, reason: 'test' },
    }));
    expect(res.status).toBe(200);
    const customer = fake.rows('customers').find((c) => c.id === CUSTOMER_ID)!;
    expect(customer.spent_amount).toBe(0);
  });
});

// ── POST — audit trail ────────────────────────────────────────────────────────

describe('POST — audit log', () => {
  beforeEach(() => seedStaffAuth('superadmin', []));

  it('writes a transaction_audit_logs row referencing the created transaction', async () => {
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 0, outstanding: 0, spent_amount: 0 }]);
    const res = await POST(staffReq('POST', {
      body: { transaction_type: 'service_charge', customer_id: CUSTOMER_ID, amount: 100, description: 'Test audit' },
    }));
    const body = await res.json();
    const logs = fake.rows('transaction_audit_logs');
    expect(logs).toHaveLength(1);
    expect(logs[0].transaction_id).toBe(body.transaction.id);
    expect(logs[0].action).toBe('created_manual_transaction');
  });
});

// ── GET — tests ──────────────────────────────────────────────────────────────

describe('GET — transactions list and stats', () => {
  beforeEach(() => seedStaffAuth('superadmin', []));

  it('an empty transactions table returns an empty list and real zero stats', async () => {
    const res = await GET(staffReq('GET'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.transactions).toEqual([]);
    expect(body.total).toBe(0);
    expect(body.stats.totalOutstanding).toBe(0);
    expect(body.stats.totalWalletBalance).toBe(0);
    expect(body.stats.todayNetPayments).toBe(0);
  });

  it('does not insert anything into the transactions table as a side effect of GET', async () => {
    await GET(staffReq('GET'));
    expect(fake.rows('transactions')).toHaveLength(0);
  });

  it('totalOutstanding/totalWalletBalance sum only positive balances across customers', async () => {
    fake.seed('customers', [
      { id: 'c1', wallet_balance: 100, outstanding: 50, spent_amount: 0 },
      { id: 'c2', wallet_balance: 0, outstanding: 0, spent_amount: 0 },
      { id: 'c3', wallet_balance: 200, outstanding: 300, spent_amount: 0 },
    ]);
    const res = await GET(staffReq('GET'));
    const body = await res.json();
    expect(body.stats.totalOutstanding).toBe(350);
    expect(body.stats.outstandingCount).toBe(2);
    expect(body.stats.totalWalletBalance).toBe(300);
    expect(body.stats.activeWalletCount).toBe(2);
  });

  it('a customerId filter returns patient-specific stats', async () => {
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 250, outstanding: 75, spent_amount: 900 }]);
    fake.seed('transactions', [
      { id: 't1', transaction_id: 'TXN-000001', customer_id: CUSTOMER_ID, type: 'service_charge', amount: 100, status: 'completed', description: 'x', payment_method: 'cash', source: 'manual', occurred_at: new Date().toISOString() },
    ]);
    const res = await GET(staffReq('GET', { query: `customerId=${CUSTOMER_ID}` }));
    const body = await res.json();
    expect(body.stats.patientOutstanding).toBe(75);
    expect(body.stats.patientWalletBalance).toBe(250);
    expect(body.stats.patientTransactionsCount).toBe(1);
  });

  it('filters by source (manual vs automatic)', async () => {
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 0, outstanding: 0, spent_amount: 0 }]);
    fake.seed('transactions', [
      { id: 't1', transaction_id: 'TXN-000001', customer_id: CUSTOMER_ID, type: 'service_charge', amount: 100, status: 'completed', description: 'Manual Fee', payment_method: 'cash', source: 'manual', occurred_at: new Date().toISOString() },
      { id: 't2', transaction_id: 'TXN-000002', customer_id: CUSTOMER_ID, type: 'payment', amount: 500, status: 'completed', description: 'Auto Booking Payment', payment_method: 'cash', source: 'automatic', occurred_at: new Date().toISOString() },
    ]);

    const resManual = await GET(staffReq('GET', { query: 'source=manual' }));
    const bodyManual = await resManual.json();
    expect(bodyManual.transactions).toHaveLength(1);
    expect(bodyManual.transactions[0].source).toBe('manual');

    const resAuto = await GET(staffReq('GET', { query: 'source=automatic' }));
    const bodyAuto = await resAuto.json();
    expect(bodyAuto.transactions).toHaveLength(1);
    expect(bodyAuto.transactions[0].source).toBe('automatic');
  });

  it('searches by transaction_id, description, or reference_no', async () => {
    fake.seed('customers', [{ id: CUSTOMER_ID, name: 'Layla Hassan', mobile: '01012345678', wallet_balance: 0, outstanding: 0, spent_amount: 0 }]);
    fake.seed('transactions', [
      {
        id: 't1',
        transaction_id: 'TXN-000999',
        customer_id: CUSTOMER_ID,
        customer: { id: CUSTOMER_ID, name: 'Layla Hassan', mobile: '01012345678' },
        type: 'service_charge',
        amount: 100,
        status: 'completed',
        description: 'Facial consultation',
        reference_no: 'BANK-REF-123',
        payment_method: 'cash',
        source: 'manual',
        occurred_at: new Date().toISOString(),
      },
    ]);

    const resSearchId = await GET(staffReq('GET', { query: 'search=000999' }));
    expect((await resSearchId.json()).transactions).toHaveLength(1);

    const resSearchDesc = await GET(staffReq('GET', { query: 'search=facial' }));
    expect((await resSearchDesc.json()).transactions).toHaveLength(1);

    const resSearchRef = await GET(staffReq('GET', { query: 'search=BANK-REF' }));
    expect((await resSearchRef.json()).transactions).toHaveLength(1);

    const resSearchPatient = await GET(staffReq('GET', { query: 'search=layla' }));
    expect((await resSearchPatient.json()).transactions).toHaveLength(1);

    const resSearchNone = await GET(staffReq('GET', { query: 'search=nonexistent' }));
    expect((await resSearchNone.json()).transactions).toHaveLength(0);
  });
});
