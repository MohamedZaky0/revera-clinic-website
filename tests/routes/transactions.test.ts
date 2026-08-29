/**
 * Route-level tests for GET/POST /api/transactions — the Financial Transactions & Daily Ledger
 * module (RISK-076: see ai_docs/RISKS.md). Written alongside a fix for a set of real bugs found
 * by code review, before this module had any automated coverage at all:
 *
 *  - GET/POST both queried `customers.outstanding_balance`, a column that has never existed
 *    (the real column is `outstanding`) — the customer join in GET and the customer lookup in
 *    POST both failed on every real request.
 *  - `transaction_id` was a random 4-digit number instead of the `transaction_seq` sequence the
 *    migration created for exactly this purpose — a realistic collision risk against the column's
 *    UNIQUE constraint.
 *  - GET silently wrote 9 fabricated "demo" transactions into the real `transactions` table,
 *    attached to real customer ids, the first time the screen was opened on an empty table.
 *  - `adjustment` transactions were recorded in the ledger but never actually changed any customer
 *    balance field.
 *  - Neither route checked the granular `transactions.view` / `transactions.create` /
 *    `transactions.refund` permissions defined in RoleManagementView — any staff member could hit
 *    the API directly regardless of what they'd been granted.
 *
 * Per the project convention (ai_docs/TEST_COVERAGE_INVENTORY.md, "The rule every test in this
 * repo follows"): every test here asserts what the route *should* do, now that it does it.
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
    const res = await POST(noAuthReq('POST', { body: { transaction_type: 'payment', customer_id: CUSTOMER_ID, amount: 100 } }));
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
    const res = await POST(staffReq('POST', { body: { transaction_type: 'payment', customer_id: CUSTOMER_ID, amount: 100 } }));
    expect(res.status).toBe(403);
  });

  it('a payment succeeds for staff granted only transactions.create, no transactions.refund', async () => {
    seedStaffAuth('receptionist', ['transactions.create']);
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 0, outstanding: 0, spent_amount: 0 }]);
    const res = await POST(staffReq('POST', { body: { transaction_type: 'payment', customer_id: CUSTOMER_ID, amount: 100 } }));
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

  it('an adjustment is rejected for staff with transactions.create but not transactions.refund (RISK-076)', async () => {
    seedStaffAuth('receptionist', ['transactions.create']);
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 0, outstanding: 0, spent_amount: 0 }]);
    const res = await POST(staffReq('POST', {
      body: { transaction_type: 'adjustment', customer_id: CUSTOMER_ID, amount: 100, reason: 'correction' },
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

describe('POST — request validation', () => {
  beforeEach(() => seedStaffAuth('superadmin', []));

  it('missing transaction_type → 400', async () => {
    const res = await POST(staffReq('POST', { body: { customer_id: CUSTOMER_ID, amount: 100 } }));
    expect(res.status).toBe(400);
  });

  it('unknown transaction_type → 400, not a 500 from the DB CHECK constraint (RISK-076)', async () => {
    const res = await POST(staffReq('POST', { body: { transaction_type: 'not_a_real_type', customer_id: CUSTOMER_ID, amount: 100 } }));
    expect(res.status).toBe(400);
  });

  it.each([0, -50, NaN])('amount %s → 400', async (amount) => {
    const res = await POST(staffReq('POST', { body: { transaction_type: 'payment', customer_id: CUSTOMER_ID, amount } }));
    expect(res.status).toBe(400);
  });

  it('a patient-required type with no customer_id → 400', async () => {
    const res = await POST(staffReq('POST', { body: { transaction_type: 'wallet_topup', amount: 100 } }));
    expect(res.status).toBe(400);
  });

  it('an unknown customer_id → 404, not treated as a query failure', async () => {
    const res = await POST(staffReq('POST', { body: { transaction_type: 'payment', customer_id: 'does-not-exist', amount: 100 } }));
    expect(res.status).toBe(404);
  });
});

// ── POST — transaction_id generation ──────────────────────────────────────────

describe('POST — transaction_id generation (RISK-076)', () => {
  beforeEach(() => seedStaffAuth('superadmin', []));

  it('formats the id from the real transaction_seq RPC, not a random number', async () => {
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 0, outstanding: 0, spent_amount: 0 }]);
    const res = await POST(staffReq('POST', { body: { transaction_type: 'payment', customer_id: CUSTOMER_ID, amount: 100 } }));
    const body = await res.json();
    expect(body.transaction.transaction_id).toBe('TXN-001001');
  });

  it('two transactions in a row get sequential, non-colliding ids', async () => {
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 0, outstanding: 0, spent_amount: 0 }]);
    const res1 = await POST(staffReq('POST', { body: { transaction_type: 'payment', customer_id: CUSTOMER_ID, amount: 100 } }));
    const res2 = await POST(staffReq('POST', { body: { transaction_type: 'payment', customer_id: CUSTOMER_ID, amount: 100 } }));
    const [body1, body2] = [await res1.json(), await res2.json()];
    expect(body1.transaction.transaction_id).not.toBe(body2.transaction.transaction_id);
    expect(body2.transaction.transaction_id).toBe('TXN-001002');
  });
});

// ── POST — business logic per transaction type ────────────────────────────────

describe('POST — payment', () => {
  beforeEach(() => seedStaffAuth('superadmin', []));

  it('increases spent_amount, leaves wallet/outstanding untouched', async () => {
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 100, outstanding: 50, spent_amount: 500 }]);
    const res = await POST(staffReq('POST', { body: { transaction_type: 'payment', customer_id: CUSTOMER_ID, amount: 200 } }));
    expect(res.status).toBe(200);
    const customer = fake.rows('customers').find((c) => c.id === CUSTOMER_ID)!;
    expect(customer.spent_amount).toBe(700);
    expect(customer.wallet_balance).toBe(100);
    expect(customer.outstanding).toBe(50);
  });
});

describe('POST — outstanding_payment', () => {
  beforeEach(() => seedStaffAuth('superadmin', []));

  it('decreases outstanding and increases spent by the paid amount', async () => {
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 0, outstanding: 400, spent_amount: 1000 }]);
    const res = await POST(staffReq('POST', { body: { transaction_type: 'outstanding_payment', customer_id: CUSTOMER_ID, amount: 300 } }));
    expect(res.status).toBe(200);
    const customer = fake.rows('customers').find((c) => c.id === CUSTOMER_ID)!;
    expect(customer.outstanding).toBe(100);
    expect(customer.spent_amount).toBe(1300);
  });

  it('rejects an amount exceeding the current outstanding balance (uses the real `outstanding` column, not `outstanding_balance`)', async () => {
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 0, outstanding: 100, spent_amount: 0 }]);
    const res = await POST(staffReq('POST', { body: { transaction_type: 'outstanding_payment', customer_id: CUSTOMER_ID, amount: 150 } }));
    expect(res.status).toBe(400);
    const customer = fake.rows('customers').find((c) => c.id === CUSTOMER_ID)!;
    expect(customer.outstanding).toBe(100); // unchanged
  });
});

describe('POST — wallet_topup', () => {
  beforeEach(() => seedStaffAuth('superadmin', []));

  it('increases wallet_balance and writes an "in" wallet_txns row', async () => {
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 200, outstanding: 0, spent_amount: 0 }]);
    const res = await POST(staffReq('POST', { body: { transaction_type: 'wallet_topup', customer_id: CUSTOMER_ID, amount: 500 } }));
    expect(res.status).toBe(200);
    const customer = fake.rows('customers').find((c) => c.id === CUSTOMER_ID)!;
    expect(customer.wallet_balance).toBe(700);
    const txns = fake.rows('wallet_txns');
    expect(txns).toHaveLength(1);
    expect(txns[0]).toMatchObject({ direction: 'in', amount: 500 });
  });
});

describe('POST — wallet_deduction', () => {
  beforeEach(() => seedStaffAuth('superadmin', []));

  it('decreases wallet_balance and writes an "out" wallet_txns row', async () => {
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 500, outstanding: 0, spent_amount: 0 }]);
    const res = await POST(staffReq('POST', { body: { transaction_type: 'wallet_deduction', customer_id: CUSTOMER_ID, amount: 200 } }));
    expect(res.status).toBe(200);
    const customer = fake.rows('customers').find((c) => c.id === CUSTOMER_ID)!;
    expect(customer.wallet_balance).toBe(300);
    const txns = fake.rows('wallet_txns');
    expect(txns).toHaveLength(1);
    expect(txns[0]).toMatchObject({ direction: 'out', amount: 200 });
  });

  it('rejects a deduction exceeding the available wallet balance', async () => {
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 100, outstanding: 0, spent_amount: 0 }]);
    const res = await POST(staffReq('POST', { body: { transaction_type: 'wallet_deduction', customer_id: CUSTOMER_ID, amount: 150 } }));
    expect(res.status).toBe(400);
    const customer = fake.rows('customers').find((c) => c.id === CUSTOMER_ID)!;
    expect(customer.wallet_balance).toBe(100); // unchanged
    expect(fake.rows('wallet_txns')).toHaveLength(0);
  });
});

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

  it('rejects a refund against another patient\'s transaction (RISK-076)', async () => {
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 0, outstanding: 0, spent_amount: 500 }]);
    fake.seed('transactions', [{ id: 'orig-1', amount: 300, status: 'completed', customer_id: 'someone-else' }]);
    const res = await POST(staffReq('POST', {
      body: { transaction_type: 'refund', customer_id: CUSTOMER_ID, amount: 100, reason: 'test', related_transaction_id: 'orig-1' },
    }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/different patient/i);
  });

  it('rejects an unknown related_transaction_id with 404 rather than silently allowing it', async () => {
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 0, outstanding: 0, spent_amount: 500 }]);
    const res = await POST(staffReq('POST', {
      body: { transaction_type: 'refund', customer_id: CUSTOMER_ID, amount: 100, reason: 'test', related_transaction_id: 'nope' },
    }));
    expect(res.status).toBe(404);
  });

  // The same payment could previously be refunded over and over, each time up to its full value.
  it('caps refunds cumulatively — a second refund can only take what is left (RISK-076)', async () => {
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 0, outstanding: 0, spent_amount: 500 }]);
    fake.seed('transactions', [
      { id: 'orig-1', amount: 300, status: 'completed', customer_id: CUSTOMER_ID },
      // 200 of the 300 has already been refunded.
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
    expect(customer.wallet_balance).toBe(300); // 100 + 200 credited back
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

describe('POST — adjustment (RISK-076: previously recorded but never applied to any balance)', () => {
  beforeEach(() => seedStaffAuth('superadmin', ['transactions.refund']));

  it('requires a description or reason', async () => {
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 0, outstanding: 0, spent_amount: 0 }]);
    const res = await POST(staffReq('POST', { body: { transaction_type: 'adjustment', customer_id: CUSTOMER_ID, amount: 100 } }));
    expect(res.status).toBe(400);
  });

  it('increase: credits the wallet and writes an "in" wallet_txns row', async () => {
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 100, outstanding: 0, spent_amount: 0 }]);
    const res = await POST(staffReq('POST', {
      body: { transaction_type: 'adjustment', customer_id: CUSTOMER_ID, amount: 50, adjustment_direction: 'increase', reason: 'goodwill credit' },
    }));
    expect(res.status).toBe(200);
    const customer = fake.rows('customers').find((c) => c.id === CUSTOMER_ID)!;
    expect(customer.wallet_balance).toBe(150);
    expect(fake.rows('wallet_txns')).toMatchObject([{ direction: 'in', amount: 50 }]);
  });

  it('decrease: debits the wallet, clamped at zero, and writes an "out" wallet_txns row', async () => {
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 30, outstanding: 0, spent_amount: 0 }]);
    const res = await POST(staffReq('POST', {
      body: { transaction_type: 'adjustment', customer_id: CUSTOMER_ID, amount: 50, adjustment_direction: 'decrease', reason: 'correcting a data-entry error' },
    }));
    expect(res.status).toBe(200);
    const customer = fake.rows('customers').find((c) => c.id === CUSTOMER_ID)!;
    expect(customer.wallet_balance).toBe(0);
    expect(fake.rows('wallet_txns')).toMatchObject([{ direction: 'out', amount: 50 }]);
  });
});

// ── POST — audit trail ────────────────────────────────────────────────────────

describe('POST — audit log', () => {
  beforeEach(() => seedStaffAuth('superadmin', []));

  it('writes a transaction_audit_logs row referencing the created transaction', async () => {
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 0, outstanding: 0, spent_amount: 0 }]);
    const res = await POST(staffReq('POST', { body: { transaction_type: 'payment', customer_id: CUSTOMER_ID, amount: 100 } }));
    const body = await res.json();
    const logs = fake.rows('transaction_audit_logs');
    expect(logs).toHaveLength(1);
    expect(logs[0].transaction_id).toBe(body.transaction.id);
    expect(logs[0].action).toBe('created_manual_transaction');
  });
});

// ── GET — no fabricated data (RISK-076) ───────────────────────────────────────

describe('GET — does not fabricate data on an empty table (RISK-076)', () => {
  beforeEach(() => seedStaffAuth('superadmin', []));

  it('an empty transactions table returns an empty list, not 9 seeded demo rows', async () => {
    const res = await GET(staffReq('GET'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.transactions).toEqual([]);
    expect(body.total).toBe(0);
  });

  it('does not insert anything into the transactions table as a side effect of GET', async () => {
    await GET(staffReq('GET'));
    expect(fake.rows('transactions')).toHaveLength(0);
  });

  it('stats reflect real (zero) data, not the hardcoded demo numbers', async () => {
    const res = await GET(staffReq('GET'));
    const body = await res.json();
    expect(body.stats.totalOutstanding).toBe(0);
    expect(body.stats.totalWalletBalance).toBe(0);
    expect(body.stats.todayNetPayments).toBe(0);
  });
});

describe('GET — stats computed from real customer/transaction data', () => {
  beforeEach(() => seedStaffAuth('superadmin', []));

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

  it('a customerId filter returns patient-specific stats using the real outstanding column', async () => {
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 250, outstanding: 75, spent_amount: 900 }]);
    fake.seed('transactions', [
      { id: 't1', transaction_id: 'TXN-000001', customer_id: CUSTOMER_ID, type: 'payment', amount: 100, status: 'completed', description: 'x', payment_method: 'cash', source: 'manual', occurred_at: new Date().toISOString() },
    ]);
    const res = await GET(staffReq('GET', { query: `customerId=${CUSTOMER_ID}` }));
    const body = await res.json();
    expect(body.stats.patientOutstanding).toBe(75);
    expect(body.stats.patientWalletBalance).toBe(250);
    expect(body.stats.patientTransactionsCount).toBe(1);
  });
});
