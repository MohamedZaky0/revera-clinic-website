/**
 * Route-level tests for GET/POST /api/transactions — the Financial Transactions & Daily Ledger
 * module (RISK-076: see ai_docs/RISKS.md).
 *
 * Requirements & Validations:
 *  - Manual creation supports `refund`, `service_charge`, `product_purchase`, and (DEC-105) the
 *    money-movement types `payment`/`outstanding_payment` (needs `transactions.manual_payment`) and
 *    `wallet_topup`/`wallet_deduction` (needs `transactions.manual_wallet`) — superadmin always,
 *    other roles only via an exact grant in Role Management. `adjustment` stays rejected.
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
    auth: { getUser: (...args: any[]) => fake.authGetUser(...args), getClaims: (...args: any[]) => fake.authGetClaims(...args) },
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

  it('manual "payment" by superadmin is recorded as a manual payment row', async () => {
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 0, outstanding: 0, spent_amount: 0 }]);
    const res = await POST(staffReq('POST', { body: { transaction_type: 'payment', customer_id: CUSTOMER_ID, amount: 100 } }));
    expect(res.status).toBe(200);
    const row = fake.rows('transactions')[0];
    expect(row.type).toBe('payment');
    expect(row.source).toBe('manual');
  });

  it('manual "outstanding_payment" by superadmin reduces the patient debt', async () => {
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 0, outstanding: 400, spent_amount: 1000 }]);
    const res = await POST(staffReq('POST', { body: { transaction_type: 'outstanding_payment', customer_id: CUSTOMER_ID, amount: 300 } }));
    expect(res.status).toBe(200);
    expect(fake.rows('customers')[0].outstanding).toBe(100);
  });

  it('manual "wallet_topup" by superadmin credits the wallet', async () => {
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 0, outstanding: 0, spent_amount: 0 }]);
    const res = await POST(staffReq('POST', { body: { transaction_type: 'wallet_topup', customer_id: CUSTOMER_ID, amount: 200 } }));
    expect(res.status).toBe(200);
    expect(fake.rows('customers')[0].wallet_balance).toBe(200);
  });

  it('manual "wallet_deduction" by superadmin debits the wallet but cannot exceed the balance', async () => {
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 500, outstanding: 0, spent_amount: 0 }]);
    const ok = await POST(staffReq('POST', { body: { transaction_type: 'wallet_deduction', customer_id: CUSTOMER_ID, amount: 200 } }));
    expect(ok.status).toBe(200);
    expect(fake.rows('customers')[0].wallet_balance).toBe(300);
    const tooMuch = await POST(staffReq('POST', { body: { transaction_type: 'wallet_deduction', customer_id: CUSTOMER_ID, amount: 999 } }));
    expect(tooMuch.status).toBe(400);
  });

  it('manual "adjustment" is still rejected → 400 (use the patient balance adjustment tools)', async () => {
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 0, outstanding: 0, spent_amount: 0 }]);
    const res = await POST(staffReq('POST', { body: { transaction_type: 'adjustment', customer_id: CUSTOMER_ID, amount: 100 } }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/not supported/i);
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

// ── GET — filter hardening (branchId injection, Cairo custom-range bounds) ───

describe('GET — branchId validation', () => {
  const BRANCH_A = '7e08ed2a-74bd-49fe-8300-ee363a1b04eb';
  beforeEach(() => seedStaffAuth('superadmin', []));

  it('rejects a branchId carrying extra PostgREST filter syntax → 400', async () => {
    const res = await GET(staffReq('GET', { query: `branchId=${encodeURIComponent('x,branch_id.not.is.null')}` }));
    expect(res.status).toBe(400);
  });

  it('rejects a non-UUID branchId → 400', async () => {
    const res = await GET(staffReq('GET', { query: 'branchId=not-a-uuid' }));
    expect(res.status).toBe(400);
  });

  it('a valid branch UUID returns that branch plus unassigned (branch_id null) rows only', async () => {
    fake.seed('transactions', [
      { id: 't1', transaction_id: 'TXN-1', type: 'payment', amount: 10, status: 'completed', branch_id: BRANCH_A, occurred_at: '2026-01-15T10:00:00Z' },
      { id: 't2', transaction_id: 'TXN-2', type: 'payment', amount: 20, status: 'completed', branch_id: null, occurred_at: '2026-01-15T11:00:00Z' },
      { id: 't3', transaction_id: 'TXN-3', type: 'payment', amount: 30, status: 'completed', branch_id: 'other-branch', occurred_at: '2026-01-15T12:00:00Z' },
    ]);
    const res = await GET(staffReq('GET', { query: `branchId=${BRANCH_A}` }));
    expect(res.status).toBe(200);
    const ids = (await res.json()).transactions.map((t: any) => t.id).sort();
    expect(ids).toEqual(['t1', 't2']);
  });
});

describe('GET — custom date range uses Cairo day boundaries', () => {
  beforeEach(() => seedStaffAuth('superadmin', []));

  async function idsFor(start: string, end: string) {
    const res = await GET(staffReq('GET', { query: `dateRange=custom&startDate=${start}&endDate=${end}` }));
    expect(res.status).toBe(200);
    return (await res.json()).transactions.map((t: any) => t.id).sort();
  }

  it('winter (UTC+2): 2026-01-15 spans 2026-01-14T22:00Z to 2026-01-15T21:59:59Z', async () => {
    fake.seed('transactions', [
      { id: 'before', type: 'payment', amount: 1, status: 'completed', occurred_at: '2026-01-14T21:30:00Z' },
      { id: 'in-early', type: 'payment', amount: 1, status: 'completed', occurred_at: '2026-01-14T22:30:00Z' },
      { id: 'in-late', type: 'payment', amount: 1, status: 'completed', occurred_at: '2026-01-15T21:30:00Z' },
      { id: 'after', type: 'payment', amount: 1, status: 'completed', occurred_at: '2026-01-15T22:30:00Z' },
    ]);
    expect(await idsFor('2026-01-15', '2026-01-15')).toEqual(['in-early', 'in-late']);
  });

  it('summer (UTC+3, DST): 2026-07-15 spans 2026-07-14T21:00Z to 2026-07-15T20:59:59Z', async () => {
    fake.seed('transactions', [
      { id: 'before', type: 'payment', amount: 1, status: 'completed', occurred_at: '2026-07-14T20:30:00Z' },
      { id: 'in-early', type: 'payment', amount: 1, status: 'completed', occurred_at: '2026-07-14T21:30:00Z' },
      { id: 'in-late', type: 'payment', amount: 1, status: 'completed', occurred_at: '2026-07-15T20:30:00Z' },
      { id: 'after', type: 'payment', amount: 1, status: 'completed', occurred_at: '2026-07-15T21:30:00Z' },
    ]);
    expect(await idsFor('2026-07-15', '2026-07-15')).toEqual(['in-early', 'in-late']);
  });

  it('a malformed startDate/endDate → 400 instead of a 500 from Date parsing', async () => {
    const res = await GET(staffReq('GET', { query: 'dateRange=custom&startDate=garbage&endDate=2026-01-15' }));
    expect(res.status).toBe(400);
  });
});

// ── POST — manual payment & wallet permissions (DEC-105) ─────────────────────

describe('POST — manual payment & wallet movements need an explicit Role Management grant', () => {
  const body = (type: string, amount = 100) => ({ body: { transaction_type: type, customer_id: CUSTOMER_ID, amount } });
  beforeEach(() => {
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 500, outstanding: 400, spent_amount: 0 }]);
  });

  it.each(['payment', 'outstanding_payment', 'wallet_topup', 'wallet_deduction'])(
    '%s → 403 for staff with only transactions.create',
    async (type) => {
      seedStaffAuth('receptionist', ['transactions.create']);
      const res = await POST(staffReq('POST', body(type)));
      expect(res.status).toBe(403);
      expect(fake.rows('transactions')).toHaveLength(0);
    },
  );

  it('transactions.manual_payment unlocks payment and outstanding_payment, not wallet movements', async () => {
    seedStaffAuth('receptionist', ['transactions.create', 'transactions.manual_payment']);
    expect((await POST(staffReq('POST', body('payment')))).status).toBe(200);
    expect((await POST(staffReq('POST', body('outstanding_payment')))).status).toBe(200);
    expect((await POST(staffReq('POST', body('wallet_topup')))).status).toBe(403);
    expect((await POST(staffReq('POST', body('wallet_deduction')))).status).toBe(403);
  });

  it('transactions.manual_wallet unlocks wallet_topup and wallet_deduction, not payments', async () => {
    seedStaffAuth('receptionist', ['transactions.create', 'transactions.manual_wallet']);
    expect((await POST(staffReq('POST', body('wallet_topup')))).status).toBe(200);
    expect((await POST(staffReq('POST', body('wallet_deduction')))).status).toBe(200);
    expect((await POST(staffReq('POST', body('payment')))).status).toBe(403);
    expect((await POST(staffReq('POST', body('outstanding_payment')))).status).toBe(403);
  });

  it('a coarse "Finance" role label is not enough — the two keys are exact-grant only', async () => {
    seedStaffAuth('receptionist', ['Finance']);
    expect((await POST(staffReq('POST', body('payment')))).status).toBe(403);
    expect((await POST(staffReq('POST', body('wallet_topup')))).status).toBe(403);
    expect((await POST(staffReq('POST', body('service_charge') as any))).status).not.toBe(403);
  });

  it('the manual_* keys do not replace transactions.create', async () => {
    seedStaffAuth('receptionist', ['transactions.manual_payment']);
    expect((await POST(staffReq('POST', body('payment')))).status).toBe(403);
  });

  it('service_charge is unaffected by the new keys', async () => {
    seedStaffAuth('receptionist', ['transactions.create']);
    const res = await POST(staffReq('POST', { body: { transaction_type: 'service_charge', customer_id: CUSTOMER_ID, amount: 100, description: 'Consultation' } }));
    expect(res.status).toBe(200);
  });
});

// ── POST — auto reference number must not consume invoice numbers ────────────

describe('POST — blank reference_no gets an RCT- receipt number', () => {
  beforeEach(() => {
    seedStaffAuth('superadmin', []);
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 0, outstanding: 0, spent_amount: 0 }]);
  });

  const charge = (extra: Record<string, unknown> = {}) => ({
    body: { transaction_type: 'service_charge', customer_id: CUSTOMER_ID, amount: 100, description: 'Consultation', ...extra },
  });

  it('derives RCT-<n> from its own sequence value (same n as its TXN id)', async () => {
    const res = await POST(staffReq('POST', charge()));
    expect(res.status).toBe(200);
    const row = fake.rows('transactions')[0];
    expect(row.transaction_id).toBe('TXN-001001');
    expect(row.reference_no).toBe('RCT-001001');
  });

  it('never calls next_invoice_no — invoice numbering must not get gaps from manual transactions', async () => {
    const invoiceRpc = vi.fn(() => ({ data: 9999, error: null }));
    fake.setRpc('next_invoice_no', invoiceRpc);
    await POST(staffReq('POST', charge()));
    await POST(staffReq('POST', charge({ reference_no: '   ' })));
    expect(invoiceRpc).not.toHaveBeenCalled();
    expect(fake.rows('transactions').every((r: any) => /^RCT-\d{6}$/.test(r.reference_no))).toBe(true);
  });

  it('keeps a reference the staff member typed', async () => {
    await POST(staffReq('POST', charge({ reference_no: 'PAPER-77' })));
    expect(fake.rows('transactions')[0].reference_no).toBe('PAPER-77');
  });
});
