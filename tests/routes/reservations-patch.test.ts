/**
 * Route-level tests for PATCH /api/reservations — the busiest and most financially sensitive
 * endpoint in the system (29 UI call sites per ai_docs/TEST_COVERAGE_INVENTORY.md module 1).
 *
 * Covers every status-transition button (approve/reject/cancel/no-show/postpone) and the
 * checkout/completion path: customer balance settlement, wallet movement, invoice + invoice_lines
 * writing, and per-line commission/COGS costing.
 *
 * Per the project convention (ai_docs/TEST_COVERAGE_INVENTORY.md, "The rule every test in this
 * repo follows"): every test here asserts what the route *should* do. Where the route is known to
 * do something else, the test is marked `it.fails` with the responsible RISK id and line — not
 * written to match the current (wrong) output.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSupabaseFake } from '../helpers/supabaseFake';

const fake = createSupabaseFake();

vi.mock('@/lib/supabaseServer', () => ({
  supabaseServer: {
    auth: { getUser: (...args: any[]) => fake.authGetUser(...args) },
    from: (table: string) => fake.client.from(table),
    rpc: (name: string, args?: any) => fake.client.rpc(name, args),
  },
}));

import { GET, PATCH } from '@/app/api/reservations/route';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const RES_ID = 'res-1';
const CUSTOMER_ID = 'cust-1';
const PROVIDER_ID = 'prov-1';
const BRANCH_ID = 'branch-1';
const EMP_ID = 'emp-1';
const USER_ID = 'user-1';
const SERVICE_ID = 10;

function baseReservation(overrides: Record<string, any> = {}) {
  return {
    id: RES_ID,
    status: 'confirmed',
    date: '2026-01-10',
    time_slot: '10:00',
    requested_time: '10:00',
    name: 'Test Patient',
    email: 'patient@test.com',
    phone: '01035595691',
    notes: '',
    session_type: 'in_person',
    branch_id: BRANCH_ID,
    customer_id: CUSTOMER_ID,
    amount_paid: 0,
    amount_left: null,
    room_id: null,
    rooms: [],
    created_by_employee_id: null,
    doctor_name: 'Dr. Sara',
    provider_id: PROVIDER_ID,
    follow_up_date: null,
    started_at: null,
    actual_duration_minutes: null,
    completed_at: null,
    cancelled_at: null,
    approved_at: null,
    service_id: SERVICE_ID,
    service_ids: [SERVICE_ID],
    is_manual: false,
    ...overrides,
  };
}

function makeReq(opts: { id?: string; body?: any; headers?: Record<string, string> } = {}): Request {
  const headers = new Headers(opts.headers);
  headers.set('content-type', 'application/json');
  const qs = opts.id ? `?id=${opts.id}` : '';
  return new Request(`http://localhost:3000/api/reservations${qs}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(opts.body ?? {}),
  });
}

function staffReq(opts: { id?: string; body?: any } = {}) {
  return makeReq({ ...opts, headers: { Authorization: 'Bearer staff-token' } });
}

function noAuthReq(opts: { id?: string; body?: any } = {}) {
  return makeReq(opts);
}

function seedStaffAuth() {
  fake.authGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
  fake.seed('employee_accounts', [{ id: EMP_ID, auth_user_id: USER_ID, role_name: 'reception', email: 'r@test.com' }]);
  fake.seed('roles', [{ name: 'reception', permissions: [] }]);
}

let txnSeq = 1001;

beforeEach(() => {
  fake.reset();
  txnSeq = 1001;
  // The checkout now also records customer-facing transaction rows (RISK-076), which pull their
  // human-readable id from this sequence exactly as invoices do.
  fake.setRpc('next_transaction_seq', () => ({ data: txnSeq++, error: null }));
  for (const t of [
    'reservations', 'customers', 'employee_accounts', 'roles', 'providers', 'branches', 'rooms',
    'service_rooms', 'services', 'reservation_products', 'invoices', 'invoice_lines', 'payments',
    'service_consumables', 'service_devices', 'inventory_products', 'inventory_devices',
    'consumption_entries', 'stock_movements', 'device_maintenance_history', 'page_settings',
    'transactions',
  ]) {
    fake.seed(t, []);
  }
});

// ── Auth guard ────────────────────────────────────────────────────────────────

describe('auth guard', () => {
  it('no id → 400 regardless of auth', async () => {
    const res = await PATCH(noAuthReq({ body: { status: 'confirmed' } }));
    expect(res.status).toBe(400);
  });

  it('unknown id → 404', async () => {
    const res = await PATCH(staffReq({ id: 'does-not-exist', body: { status: 'confirmed' } }));
    expect(res.status).toBe(404);
  });

  it('a staff-shaped edit with no Authorization header → 401', async () => {
    fake.seed('reservations', [baseReservation({ status: 'pending' })]);
    const res = await PATCH(noAuthReq({ id: RES_ID, body: { status: 'confirmed' } }));
    expect(res.status).toBe(401);
  });

  it('a non-staff-shaped body still requires staff access — arbitrary extra fields are not a bypass', async () => {
    fake.seed('reservations', [baseReservation({ status: 'pending_deposit' })]);
    // Same fields as the legitimate patient self-report shape, plus one extra field.
    const res = await PATCH(
      noAuthReq({ id: RES_ID, body: { status: 'pending', amountPaid: 100, amountLeft: 0, hacked: true } })
    );
    expect(res.status).toBe(401);
  });
});

describe('patient self-service bypass — only for a reservation still in pending_deposit', () => {
  it('deposit self-report needs no staff token', async () => {
    fake.seed('reservations', [baseReservation({ status: 'pending_deposit', amount_paid: 0, amount_left: 500 })]);
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 0, spent_amount: 0, outstanding: 0 }]);
    const res = await PATCH(
      noAuthReq({ id: RES_ID, body: { status: 'pending', amountPaid: 100, amountLeft: 400 } })
    );
    expect(res.status).toBe(200);
  });

  it('self-cancel ("Cancel & Return") needs no staff token', async () => {
    fake.seed('reservations', [baseReservation({ status: 'pending_deposit' })]);
    const res = await PATCH(noAuthReq({ id: RES_ID, body: { status: 'cancelled' } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('cancelled');
  });

  it('self-update (re-submitting step 2) needs no staff token', async () => {
    fake.seed('reservations', [baseReservation({ status: 'pending_deposit' })]);
    const res = await PATCH(noAuthReq({ id: RES_ID, body: { name: 'Corrected Name', notes: 'x' } }));
    expect(res.status).toBe(200);
  });

  it('the same self-report shape on a booking that already left pending_deposit requires staff auth', async () => {
    fake.seed('reservations', [baseReservation({ status: 'confirmed', amount_paid: 100, amount_left: 400 })]);
    const res = await PATCH(
      noAuthReq({ id: RES_ID, body: { status: 'pending', amountPaid: 150, amountLeft: 350 } })
    );
    expect(res.status).toBe(401);
  });
});

// ── Terminal-state guards ────────────────────────────────────────────────────

describe('a started session cannot be cancelled or rejected', () => {
  beforeEach(() => {
    seedStaffAuth();
    fake.seed('reservations', [baseReservation({ status: 'started', started_at: '2026-01-10T09:00:00Z' })]);
  });

  it('reject is blocked', async () => {
    const res = await PATCH(staffReq({ id: RES_ID, body: { action: 'reject' } }));
    expect(res.status).toBe(400);
  });

  it('cancel is blocked', async () => {
    const res = await PATCH(staffReq({ id: RES_ID, body: { action: 'cancel' } }));
    expect(res.status).toBe(400);
  });

  it('no_show is blocked', async () => {
    const res = await PATCH(staffReq({ id: RES_ID, body: { action: 'no_show' } }));
    expect(res.status).toBe(400);
  });

  it('setting status directly to cancelled is blocked', async () => {
    const res = await PATCH(staffReq({ id: RES_ID, body: { status: 'cancelled' } }));
    expect(res.status).toBe(400);
  });
});

// ── action: reject ────────────────────────────────────────────────────────────

describe("action: reject", () => {
  it('sets status to rejected', async () => {
    seedStaffAuth();
    fake.seed('reservations', [baseReservation({ status: 'pending' })]);
    const res = await PATCH(staffReq({ id: RES_ID, body: { action: 'reject' } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('rejected');
  });
});

// ── action: cancel / no_show ──────────────────────────────────────────────────

describe('action: cancel — deposit handling', () => {
  beforeEach(() => seedStaffAuth());

  it('with a deposit paid, refunds it to the wallet and clears amount_paid/amount_left', async () => {
    fake.seed('reservations', [baseReservation({ status: 'pending', amount_paid: 100, amount_left: 400 })]);
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 50, spent_amount: 0, outstanding: 0 }]);

    const res = await PATCH(staffReq({ id: RES_ID, body: { action: 'cancel' } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('cancelled');
    expect(body.amount_paid ?? body.amountPaid).toBe(0);

    const customer = fake.rows('customers').find((c) => c.id === CUSTOMER_ID)!;
    expect(customer.wallet_balance).toBe(150); // 50 + 100 refunded
    const walletTxns = fake.rows('wallet_txns');
    expect(walletTxns).toHaveLength(1);
    expect(walletTxns[0]).toMatchObject({ direction: 'in', amount: 100 });
  });

  it('with no deposit paid, no wallet movement happens', async () => {
    fake.seed('reservations', [baseReservation({ status: 'pending', amount_paid: 0 })]);
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 50, spent_amount: 0, outstanding: 0 }]);
    await PATCH(staffReq({ id: RES_ID, body: { action: 'cancel' } }));
    expect(fake.rows('customers')[0].wallet_balance).toBe(50);
    expect(fake.rows('wallet_txns')).toHaveLength(0);
  });

  it('is rejected on an already-completed booking', async () => {
    fake.seed('reservations', [baseReservation({ status: 'completed' })]);
    const res = await PATCH(staffReq({ id: RES_ID, body: { action: 'cancel' } }));
    expect(res.status).toBe(400);
  });

  it('re-firing on an already-cancelled booking is a no-op — does not refund the deposit twice', async () => {
    fake.seed('reservations', [baseReservation({ status: 'cancelled', amount_paid: 0 })]);
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 150, spent_amount: 0, outstanding: 0 }]);
    const res = await PATCH(staffReq({ id: RES_ID, body: { action: 'cancel' } }));
    expect(res.status).toBe(200);
    expect(fake.rows('customers')[0].wallet_balance).toBe(150); // unchanged
    expect(fake.rows('wallet_txns')).toHaveLength(0);
  });
});

describe('action: no_show — the clinic keeps the deposit', () => {
  beforeEach(() => seedStaffAuth());

  it('with a deposit paid, recognises it as spend rather than refunding it', async () => {
    fake.seed('reservations', [baseReservation({ status: 'pending', amount_paid: 100, amount_left: 400 })]);
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 50, spent_amount: 500, outstanding: 0 }]);

    const res = await PATCH(staffReq({ id: RES_ID, body: { action: 'no_show' } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('no_show');
    expect(body.amount_paid ?? body.amountPaid).toBe(100); // kept, not refunded

    const customer = fake.rows('customers').find((c) => c.id === CUSTOMER_ID)!;
    expect(customer.spent_amount).toBe(600); // 500 + 100 kept as a cancellation fee
    expect(customer.wallet_balance).toBe(50); // unaffected — no wallet ledger row for a no-show
    expect(fake.rows('wallet_txns')).toHaveLength(0);
  });

  it('is rejected on an already-completed booking', async () => {
    fake.seed('reservations', [baseReservation({ status: 'completed' })]);
    const res = await PATCH(staffReq({ id: RES_ID, body: { action: 'no_show' } }));
    expect(res.status).toBe(400);
  });

  it('re-firing on an already-no_show booking does not charge the fee twice', async () => {
    fake.seed('reservations', [baseReservation({ status: 'no_show', amount_paid: 100 })]);
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 50, spent_amount: 600, outstanding: 0 }]);
    await PATCH(staffReq({ id: RES_ID, body: { action: 'no_show' } }));
    expect(fake.rows('customers')[0].spent_amount).toBe(600); // unchanged
  });
});

// ── action: postpone ──────────────────────────────────────────────────────────

describe('action: postpone', () => {
  beforeEach(() => seedStaffAuth());

  it('with a new date/time, reschedules without entering postponed limbo', async () => {
    fake.seed('reservations', [baseReservation({ status: 'confirmed', date: '2026-01-10', time_slot: '10:00' })]);
    const res = await PATCH(staffReq({ id: RES_ID, body: { action: 'postpone', date: '2026-01-15', timeSlot: '11:00' } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.date).toBe('2026-01-15');
    expect(body.timeSlot).toBe('11:00');
    expect(body.status).toBe('confirmed'); // unchanged — this is just a reschedule
  });

  it('with only a follow-up date, enters postponed limbo and keeps the stale date', async () => {
    fake.seed('reservations', [baseReservation({ status: 'confirmed', date: '2026-01-10' })]);
    const res = await PATCH(staffReq({ id: RES_ID, body: { action: 'postpone', followUpDate: '2026-01-20' } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('postponed');
    expect(body.date).toBe('2026-01-10'); // stale, left alone
    expect(body.followUpDate).toBe('2026-01-20');
  });

  it('rescheduling a postponed booking clears the limbo back to approved', async () => {
    fake.seed('reservations', [baseReservation({ status: 'postponed', follow_up_date: '2026-01-20' })]);
    const res = await PATCH(staffReq({ id: RES_ID, body: { action: 'postpone', date: '2026-01-25', timeSlot: '09:00' } }));
    const body = await res.json();
    expect(body.status).toBe('approved');
    expect(body.followUpDate).toBeNull();
  });

  it('neither a new date nor a follow-up date is an error', async () => {
    fake.seed('reservations', [baseReservation({ status: 'confirmed' })]);
    const res = await PATCH(staffReq({ id: RES_ID, body: { action: 'postpone' } }));
    expect(res.status).toBe(400);
  });

  it.each(['completed', 'cancelled', 'no_show'])('is rejected on a %s booking', async (status) => {
    fake.seed('reservations', [baseReservation({ status })]);
    const res = await PATCH(staffReq({ id: RES_ID, body: { action: 'postpone', followUpDate: '2026-02-01' } }));
    expect(res.status).toBe(400);
  });
});

// ── action: approve ───────────────────────────────────────────────────────────

describe('action: approve — room assignment', () => {
  beforeEach(() => {
    seedStaffAuth();
    fake.seed('services', [{ id: SERVICE_ID, duration: null, duration_minutes: 30, en: 'Facial', price: 500, branch_pricing: null }]);
    fake.seed('service_rooms', [
      { service_id: SERVICE_ID, room_id: 'room-1' },
      { service_id: SERVICE_ID, room_id: 'room-2' },
    ]);
    fake.seed('rooms', [
      { id: 'room-1', name: 'Room 1', type: 'clinical', status: 'available', branch_id: BRANCH_ID },
      { id: 'room-2', name: 'Room 2', type: 'clinical', status: 'available', branch_id: BRANCH_ID },
    ]);
  });

  it('missing timeSlot → 400', async () => {
    fake.seed('reservations', [baseReservation({ status: 'pending' })]);
    const res = await PATCH(staffReq({ id: RES_ID, body: { action: 'approve' } }));
    expect(res.status).toBe(400);
  });

  it('assigns a compatible, unoccupied room and marks approved', async () => {
    fake.seed('reservations', [baseReservation({ status: 'pending' })]);
    const res = await PATCH(staffReq({ id: RES_ID, body: { action: 'approve', timeSlot: '10:00' } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('approved');
    expect(['room-1', 'room-2']).toContain(body.roomId);
  });

  it('skips the occupied room and picks the free one', async () => {
    fake.seed('reservations', [
      baseReservation({ status: 'pending' }),
      // Another approved booking already holds room-1 at the same slot.
      baseReservation({
        id: 'res-other', status: 'approved', room_id: 'room-1', time_slot: '10:00',
        date: '2026-01-10', service_id: SERVICE_ID, service_ids: [SERVICE_ID],
      }),
    ]);
    const res = await PATCH(staffReq({ id: RES_ID, body: { action: 'approve', timeSlot: '10:00' } }));
    const body = await res.json();
    expect(body.roomId).toBe('room-2');
  });

  it('no compatible room free at that slot → 400 for a non-manual booking', async () => {
    fake.seed('reservations', [
      baseReservation({ status: 'pending', is_manual: false }),
      baseReservation({
        id: 'res-other-1', status: 'approved', room_id: 'room-1', time_slot: '10:00',
        date: '2026-01-10', service_id: SERVICE_ID, service_ids: [SERVICE_ID],
      }),
      baseReservation({
        id: 'res-other-2', status: 'approved', room_id: 'room-2', time_slot: '10:00',
        date: '2026-01-10', service_id: SERVICE_ID, service_ids: [SERVICE_ID],
      }),
    ]);
    const res = await PATCH(staffReq({ id: RES_ID, body: { action: 'approve', timeSlot: '10:00' } }));
    expect(res.status).toBe(400);
  });

  it('an online session skips room assignment entirely', async () => {
    fake.seed('reservations', [baseReservation({ status: 'pending', session_type: 'online' })]);
    const res = await PATCH(staffReq({ id: RES_ID, body: { action: 'approve', timeSlot: '10:00' } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.roomId).toBeNull();
    expect(body.status).toBe('approved');
  });
});

// ── generic status/field updates ──────────────────────────────────────────────

describe('generic PATCH — no recognised action and no updatable field', () => {
  it('returns 400 Unknown action', async () => {
    seedStaffAuth();
    fake.seed('reservations', [baseReservation({ status: 'confirmed' })]);
    const res = await PATCH(staffReq({ id: RES_ID, body: {} }));
    expect(res.status).toBe(400);
  });
});

describe('status: started', () => {
  beforeEach(() => seedStaffAuth());

  it('sets started_at on the transition into started', async () => {
    fake.seed('reservations', [baseReservation({ status: 'confirmed', started_at: null })]);
    const res = await PATCH(staffReq({ id: RES_ID, body: { status: 'started' } }));
    const body = await res.json();
    expect(body.startedAt).toBeTruthy();
  });

  it('a later money-only PATCH on an already-started booking does not reset started_at', async () => {
    const original = '2026-01-10T09:00:00.000Z';
    fake.seed('reservations', [baseReservation({ status: 'started', started_at: original })]);
    const res = await PATCH(staffReq({ id: RES_ID, body: { status: 'started', notes: 'still going' } }));
    const body = await res.json();
    expect(body.startedAt).toBe(original);
  });
});

describe('status: completed — duration and amount_left', () => {
  beforeEach(() => {
    seedStaffAuth();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-10T10:30:00.000Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('computes actual_duration_minutes from started_at to now', async () => {
    fake.seed('reservations', [
      baseReservation({ status: 'started', started_at: '2026-01-10T09:00:00.000Z', amount_paid: 500, amount_left: 0 }),
    ]);
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 0, spent_amount: 0, outstanding: 0 }]);
    const res = await PATCH(staffReq({ id: RES_ID, body: { status: 'completed', amountPaid: 500, amountLeft: 0 } }));
    const body = await res.json();
    expect(body.actualDurationMinutes).toBe(90); // 09:00 → 10:30
  });

  it('with no started_at recorded, does not fabricate a duration (RISK-043)', async () => {
    fake.seed('reservations', [baseReservation({ status: 'confirmed', started_at: null, amount_paid: 500, amount_left: 0 })]);
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 0, spent_amount: 0, outstanding: 0 }]);
    const res = await PATCH(staffReq({ id: RES_ID, body: { status: 'completed', amountPaid: 500, amountLeft: 0 } }));
    const body = await res.json();
    expect(body.actualDurationMinutes).toBeNull();
  });

  it('auto-calculates amount_left as total service cost minus amount paid when not supplied', async () => {
    fake.seed('reservations', [baseReservation({ status: 'confirmed', amount_paid: 0, amount_left: null })]);
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 0, spent_amount: 0, outstanding: 0 }]);
    fake.seed('services', [{ id: SERVICE_ID, price: 500, branch_pricing: null, en: 'Facial' }]);
    const res = await PATCH(staffReq({ id: RES_ID, body: { status: 'completed', amountPaid: 300 } }));
    const body = await res.json();
    expect(body.amountLeft).toBe(200); // 500 - 300
  });
});

// ── Settlement: customer balances on completion ──────────────────────────────

describe('settlement — customer balances on completion', () => {
  beforeEach(() => {
    seedStaffAuth();
    fake.seed('services', [{ id: SERVICE_ID, price: 500, branch_pricing: null, en: 'Facial' }]);
    fake.seed('branches', [{ id: BRANCH_ID, name_en: 'Downtown', name_ar: null }]);
    fake.seed('providers', [{
      id: PROVIDER_ID, commission_type: 'none', commission_value: 0,
      commission_fixed_component: 0, commission_base: 'gross', service_commissions: [],
    }]);
  });

  it('full cash payment: spent increases by the amount paid, outstanding unaffected', async () => {
    fake.seed('reservations', [baseReservation({ status: 'confirmed', amount_paid: 0, amount_left: null })]);
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 100, spent_amount: 500, outstanding: 0 }]);

    await PATCH(staffReq({ id: RES_ID, body: { status: 'completed', amountPaid: 500, amountLeft: 0 } }));

    const customer = fake.rows('customers').find((c) => c.id === CUSTOMER_ID)!;
    expect(customer.spent).toBeUndefined(); // sanity: field is spent_amount, not spent
    expect(customer.spent_amount).toBe(1000); // 500 + 500
    expect(customer.outstanding).toBe(0);
    expect(customer.wallet_balance).toBe(100); // untouched
  });

  it('underpayment: outstanding increases by exactly the unpaid remainder', async () => {
    fake.seed('reservations', [baseReservation({ status: 'confirmed', amount_paid: 0, amount_left: null })]);
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 0, spent_amount: 0, outstanding: 0 }]);

    await PATCH(staffReq({ id: RES_ID, body: { status: 'completed', amountPaid: 300, amountLeft: 200 } }));

    const customer = fake.rows('customers').find((c) => c.id === CUSTOMER_ID)!;
    expect(customer.spent_amount).toBe(300);
    expect(customer.outstanding).toBe(200);
  });

  it('wallet withdrawal at checkout draws down the wallet and counts toward spent, with a ledger row', async () => {
    fake.seed('reservations', [baseReservation({ status: 'confirmed', amount_paid: 0, amount_left: null })]);
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 100, spent_amount: 0, outstanding: 0 }]);

    await PATCH(staffReq({
      id: RES_ID,
      body: { status: 'completed', amountPaid: 470, amountLeft: 0, walletWithdrawal: 30 },
    }));

    const customer = fake.rows('customers').find((c) => c.id === CUSTOMER_ID)!;
    expect(customer.wallet_balance).toBe(70); // 100 - 30
    expect(customer.spent_amount).toBe(500); // 470 cash + 30 wallet-funded
    const walletTxns = fake.rows('wallet_txns');
    expect(walletTxns).toHaveLength(1);
    expect(walletTxns[0]).toMatchObject({ direction: 'out', amount: 30 });
  });

  it('wallet deposit (change given back) at checkout credits the wallet', async () => {
    fake.seed('reservations', [baseReservation({ status: 'confirmed', amount_paid: 0, amount_left: null })]);
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 0, spent_amount: 0, outstanding: 0 }]);

    await PATCH(staffReq({
      id: RES_ID,
      body: { status: 'completed', amountPaid: 520, amountLeft: 0, walletDeposit: 20 },
    }));

    const customer = fake.rows('customers').find((c) => c.id === CUSTOMER_ID)!;
    expect(customer.wallet_balance).toBe(20);
  });

  it('re-firing completion with identical amounts is idempotent — no double-counting (RISK-012)', async () => {
    fake.seed('reservations', [baseReservation({ status: 'completed', amount_paid: 500, amount_left: 0 })]);
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 100, spent_amount: 1000, outstanding: 0 }]);

    await PATCH(staffReq({ id: RES_ID, body: { status: 'completed', amountPaid: 500, amountLeft: 0 } }));

    const customer = fake.rows('customers').find((c) => c.id === CUSTOMER_ID)!;
    expect(customer.spent_amount).toBe(1000); // unchanged
    expect(customer.outstanding).toBe(0);
  });

  // The gap TEST_COVERAGE_INVENTORY.md module 1 names explicitly: "Re-firing completion does not
  // double-count anything (RISK-012 — covered at the pure-function level in
  // tests/lib/billing.test.ts, **not** at the route level)." The wallet half is the part that
  // actually regressed: commit 05c5136 dropped the `wasCompleted` guard in computeSettledBalances,
  // and because the checkout modal always sends walletDeposit/walletWithdrawal together with
  // status:"completed" in one PATCH, a retried or re-submitted checkout moved real money a second
  // time and wrote a duplicate ledger row. The pure-function test caught it; nothing at this level
  // would have. Restored in 8f8c2dd.
  it('re-firing completion does not apply the wallet movement a second time or duplicate its ledger row', async () => {
    fake.seed('reservations', [baseReservation({ status: 'completed', amount_paid: 500, amount_left: 0 })]);
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 100, spent_amount: 500, outstanding: 0 }]);

    await PATCH(staffReq({
      id: RES_ID,
      body: { status: 'completed', amountPaid: 500, amountLeft: 0, walletDeposit: 20, walletWithdrawal: 0 },
    }));

    const customer = fake.rows('customers').find((c) => c.id === CUSTOMER_ID)!;
    expect(customer.wallet_balance).toBe(100); // not 120 — the deposit was already applied
    expect(fake.rows('wallet_txns')).toHaveLength(0);
  });

  // RISK-031. Commit e79a691 removed the guard that blocked package redemption on a booking with a
  // deposit already collected. Its own deleted comment gave the reason: "deposits are booking-level,
  // not per-service, so waiving a service's price after cash was already taken against it would need
  // refund/reversal logic this feature doesn't build." No such logic was added.
  //
  // Mohamed's call 2026-08-22: redemption stays allowed, but the money that moves as a result must
  // leave an explicit reconciliation trail — right now the deposit simply resurfaces as generic
  // `changeAmount` and, if credited to the wallet, is logged with the same
  // "Change deposited into wallet from settlement" reason as any ordinary over-payment. Nothing
  // distinguishes "the patient overpaid" from "we took a deposit for a service a package then
  // covered", so it cannot be audited or explained to a patient later.
  it.fails('records a package-redemption reconciliation, distinct from ordinary over-payment change', async () => {
    // Deposit of 200 already taken; the service it was taken against is then covered by a package,
    // so the whole 200 comes back as change and is credited to the wallet.
    fake.seed('reservations', [baseReservation({ status: 'confirmed', amount_paid: 200, amount_left: null })]);
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 0, spent_amount: 0, outstanding: 0 }]);

    await PATCH(staffReq({
      id: RES_ID,
      body: {
        status: 'completed', amountPaid: 200, amountLeft: 0,
        walletDeposit: 200, redeemedServiceIds: [SERVICE_ID],
      },
    }));

    const walletTxns = fake.rows('wallet_txns');
    expect(walletTxns).toHaveLength(1);
    expect(walletTxns[0].reason).toMatch(/package/i);
  });

  it('paying down outstanding debt later moves only the delta, not the full new amount again', async () => {
    fake.seed('reservations', [baseReservation({ status: 'completed', amount_paid: 300, amount_left: 200 })]);
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 0, spent_amount: 300, outstanding: 200 }]);

    await PATCH(staffReq({ id: RES_ID, body: { amountPaid: 500, amountLeft: 0 } }));

    const customer = fake.rows('customers').find((c) => c.id === CUSTOMER_ID)!;
    expect(customer.spent_amount).toBe(500); // 300 + (500-300 delta)
    expect(customer.outstanding).toBe(0); // 200 + (0-200 delta)
  });
});

// ── Invoice writing on first completion ───────────────────────────────────────

describe('invoice writing on first completion', () => {
  beforeEach(() => {
    seedStaffAuth();
    fake.seed('services', [{ id: SERVICE_ID, price: 500, branch_pricing: null, en: 'Facial' }]);
    fake.seed('branches', [{ id: BRANCH_ID, name_en: 'Downtown', name_ar: null }]);
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 0, spent_amount: 0, outstanding: 0 }]);
    fake.seed('providers', [{
      id: PROVIDER_ID, commission_type: 'percentage', commission_value: 15,
      commission_fixed_component: 0, commission_base: 'gross', service_commissions: [],
    }]);
  });

  it('writes exactly one invoice and one invoice_lines row per service', async () => {
    fake.seed('reservations', [baseReservation({ status: 'confirmed', amount_paid: 0, amount_left: null })]);
    await PATCH(staffReq({ id: RES_ID, body: { status: 'completed', amountPaid: 500, amountLeft: 0 } }));

    const invoices = fake.rows('invoices').filter((i) => i.reservation_id === RES_ID);
    expect(invoices).toHaveLength(1);
    expect(invoices[0].grand_total).toBe(500);

    const lines = fake.rows('invoice_lines').filter((l) => l.invoice_id === invoices[0].id);
    expect(lines).toHaveLength(1);
    expect(lines[0].line_total).toBe(500);
  });

  it('writes commission_snapshot per line using the provider commission config', async () => {
    fake.seed('reservations', [baseReservation({ status: 'confirmed', amount_paid: 0, amount_left: null })]);
    await PATCH(staffReq({ id: RES_ID, body: { status: 'completed', amountPaid: 500, amountLeft: 0 } }));

    const invoice = fake.rows('invoices').find((i) => i.reservation_id === RES_ID)!;
    const line = fake.rows('invoice_lines').find((l) => l.invoice_id === invoice.id)!;
    expect(line.commission_snapshot).toBe(75); // 500 * 15%
  });

  it('writes a payments row for the amount actually paid', async () => {
    fake.seed('reservations', [baseReservation({ status: 'confirmed', amount_paid: 0, amount_left: null })]);
    await PATCH(staffReq({ id: RES_ID, body: { status: 'completed', amountPaid: 300, amountLeft: 200 } }));

    const invoice = fake.rows('invoices').find((i) => i.reservation_id === RES_ID)!;
    const payments = fake.rows('payments').filter((p) => p.invoice_id === invoice.id);
    expect(payments).toHaveLength(1);
    expect(payments[0].amount).toBe(300);
  });

  it('deducts consumable stock and writes a stock_movements row when the service has a recipe', async () => {
    fake.seed('inventory_products', [{ id: 'prod-1', name: 'Gel', cost_price: 2, role: 'consumable', stock_quantity: 100 }]);
    fake.seed('service_consumables', [{ service_id: SERVICE_ID, product_id: 'prod-1', standard_qty: 3 }]);
    fake.seed('reservations', [baseReservation({ status: 'confirmed', amount_paid: 0, amount_left: null })]);

    await PATCH(staffReq({ id: RES_ID, body: { status: 'completed', amountPaid: 500, amountLeft: 0 } }));

    const product = fake.rows('inventory_products').find((p) => p.id === 'prod-1')!;
    expect(product.stock_quantity).toBe(97); // 100 - 3
    const movements = fake.rows('stock_movements').filter((m) => m.product_id === 'prod-1');
    expect(movements).toHaveLength(1);
    expect(movements[0]).toMatchObject({ direction: 'out', qty: 3 });

    const invoice = fake.rows('invoices').find((i) => i.reservation_id === RES_ID)!;
    const line = fake.rows('invoice_lines').find((l) => l.invoice_id === invoice.id)!;
    expect(line.cogs_snapshot).toBe(6); // 3 * 2
  });

  it('a completed checkout succeeds even when costing fails — costing is non-fatal', async () => {
    // A recipe pointing at a product that doesn't exist should not sink the whole checkout.
    fake.seed('service_consumables', [{ service_id: SERVICE_ID, product_id: 'missing-product', standard_qty: 1 }]);
    fake.seed('reservations', [baseReservation({ status: 'confirmed', amount_paid: 0, amount_left: null })]);

    const res = await PATCH(staffReq({ id: RES_ID, body: { status: 'completed', amountPaid: 500, amountLeft: 0 } }));
    expect(res.status).toBe(200);
    const invoices = fake.rows('invoices').filter((i) => i.reservation_id === RES_ID);
    expect(invoices).toHaveLength(1); // invoice still written
  });

  it('re-firing completion does not write a second invoice for the same reservation', async () => {
    fake.seed('reservations', [baseReservation({ status: 'confirmed', amount_paid: 0, amount_left: null })]);
    await PATCH(staffReq({ id: RES_ID, body: { status: 'completed', amountPaid: 500, amountLeft: 0 } }));

    // Simulate the reservation now reading back as completed (as a second unrelated PATCH would see it).
    const completedRow = fake.rows('reservations').find((r) => r.id === RES_ID)!;
    fake.seed('reservations', [completedRow]);

    await PATCH(staffReq({ id: RES_ID, body: { status: 'completed', amountPaid: 500, amountLeft: 0 } }));
    expect(fake.rows('invoices').filter((i) => i.reservation_id === RES_ID)).toHaveLength(1);
  });

  it('a later payment against an already-completed booking appends to the existing invoice, not a new one', async () => {
    fake.seed('reservations', [baseReservation({ status: 'confirmed', amount_paid: 0, amount_left: null })]);
    await PATCH(staffReq({ id: RES_ID, body: { status: 'completed', amountPaid: 300, amountLeft: 200 } }));

    const completedRow = fake.rows('reservations').find((r) => r.id === RES_ID)!;
    fake.seed('reservations', [completedRow]);

    await PATCH(staffReq({ id: RES_ID, body: { amountPaid: 500, amountLeft: 0 } }));

    const invoices = fake.rows('invoices').filter((i) => i.reservation_id === RES_ID);
    expect(invoices).toHaveLength(1); // still one invoice
    const payments = fake.rows('payments').filter((p) => p.invoice_id === invoices[0].id);
    expect(payments.map((p) => p.amount).sort((a, b) => a - b)).toEqual([200, 300]); // original 300 + the 200 delta
  });
});

// ── Customer-facing transaction history (RISK-076) ───────────────────────────

// The `transactions` table is what Admin → Transactions and the patient profile's Transactions tab
// read. Before this, nothing but the manual-entry form ever wrote to it: a patient with ten
// completed visits showed an empty financial history. These assert the checkout now leaves a
// record — and, just as importantly, that it leaves exactly one.
describe('transaction history written on checkout', () => {
  beforeEach(() => {
    seedStaffAuth();
    fake.seed('services', [{ id: SERVICE_ID, price: 500, branch_pricing: null, en: 'Facial' }]);
    fake.seed('branches', [{ id: BRANCH_ID, name_en: 'Downtown', name_ar: null }]);
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 0, spent_amount: 0, outstanding: 0 }]);
    fake.seed('providers', [{
      id: PROVIDER_ID, commission_type: 'none', commission_value: 0,
      commission_fixed_component: 0, commission_base: 'gross', service_commissions: [],
    }]);
  });

  it('records the service charge and the payment as two separate rows', async () => {
    fake.seed('reservations', [baseReservation({ status: 'confirmed', amount_paid: 0, amount_left: null })]);
    await PATCH(staffReq({ id: RES_ID, body: { status: 'completed', amountPaid: 500, amountLeft: 0 } }));

    const txns = fake.rows('transactions');
    const charge = txns.find((t) => t.type === 'service_charge')!;
    const payment = txns.find((t) => t.type === 'payment')!;

    expect(charge).toBeTruthy();
    expect(charge.amount).toBe(500);
    expect(charge.customer_id).toBe(CUSTOMER_ID);
    expect(charge.reservation_id).toBe(RES_ID);
    expect(charge.source).toBe('automatic');

    expect(payment).toBeTruthy();
    expect(payment.amount).toBe(500);
    expect(payment.source).toBe('automatic');
  });

  it('an underpayment records the full charge but only the amount actually collected', async () => {
    fake.seed('reservations', [baseReservation({ status: 'confirmed', amount_paid: 0, amount_left: null })]);
    await PATCH(staffReq({ id: RES_ID, body: { status: 'completed', amountPaid: 300, amountLeft: 200 } }));

    const txns = fake.rows('transactions');
    expect(txns.find((t) => t.type === 'service_charge')!.amount).toBe(500);
    expect(txns.find((t) => t.type === 'payment')!.amount).toBe(300);
  });

  it('a completion with nothing paid records the charge and no payment row', async () => {
    fake.seed('reservations', [baseReservation({ status: 'confirmed', amount_paid: 0, amount_left: null })]);
    await PATCH(staffReq({ id: RES_ID, body: { status: 'completed', amountPaid: 0, amountLeft: 500 } }));

    const txns = fake.rows('transactions');
    expect(txns.filter((t) => t.type === 'service_charge')).toHaveLength(1);
    expect(txns.filter((t) => t.type === 'payment')).toHaveLength(0);
  });

  it('re-firing completion does not duplicate the history rows', async () => {
    fake.seed('reservations', [baseReservation({ status: 'confirmed', amount_paid: 0, amount_left: null })]);
    await PATCH(staffReq({ id: RES_ID, body: { status: 'completed', amountPaid: 500, amountLeft: 0 } }));

    const completedRow = fake.rows('reservations').find((r) => r.id === RES_ID)!;
    fake.seed('reservations', [completedRow]);
    await PATCH(staffReq({ id: RES_ID, body: { status: 'completed', amountPaid: 500, amountLeft: 0 } }));

    const txns = fake.rows('transactions');
    expect(txns.filter((t) => t.type === 'service_charge')).toHaveLength(1);
    expect(txns.filter((t) => t.type === 'payment')).toHaveLength(1);
  });

  it('paying down debt later records an outstanding_payment for the delta only', async () => {
    fake.seed('reservations', [baseReservation({ status: 'confirmed', amount_paid: 0, amount_left: null })]);
    await PATCH(staffReq({ id: RES_ID, body: { status: 'completed', amountPaid: 300, amountLeft: 200 } }));

    const completedRow = fake.rows('reservations').find((r) => r.id === RES_ID)!;
    fake.seed('reservations', [completedRow]);
    await PATCH(staffReq({ id: RES_ID, body: { amountPaid: 500, amountLeft: 0 } }));

    const settlements = fake.rows('transactions').filter((t) => t.type === 'outstanding_payment');
    expect(settlements).toHaveLength(1);
    expect(settlements[0].amount).toBe(200); // the delta, not the new cumulative total
  });

  it('every recorded row gets a distinct sequential transaction_id', async () => {
    fake.seed('reservations', [baseReservation({ status: 'confirmed', amount_paid: 0, amount_left: null })]);
    await PATCH(staffReq({ id: RES_ID, body: { status: 'completed', amountPaid: 500, amountLeft: 0 } }));

    const ids = fake.rows('transactions').map((t) => t.transaction_id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('TXN-001001');
  });

  // A deposit is cash in the drawer the day it is handed over, but the invoice does not exist
  // until checkout — so it used to surface nowhere until completion, understating the till on
  // every day a deposit was taken.
  it('records the deposit on the day it is paid, not weeks later at checkout', async () => {
    fake.seed('reservations', [baseReservation({ status: 'pending_deposit', amount_paid: 0, amount_left: 500 })]);

    await PATCH(staffReq({ id: RES_ID, body: { status: 'pending', amountPaid: 150, amountLeft: 350 } }));

    const txns = fake.rows('transactions');
    expect(txns).toHaveLength(1);
    expect(txns[0]).toMatchObject({ type: 'payment', amount: 150, reservation_id: RES_ID });
    expect(txns[0].description).toMatch(/deposit/i);
  });

  it('the later checkout records only the remaining balance, so the deposit is not counted twice', async () => {
    fake.seed('reservations', [baseReservation({ status: 'pending_deposit', amount_paid: 0, amount_left: 500 })]);
    await PATCH(staffReq({ id: RES_ID, body: { status: 'pending', amountPaid: 150, amountLeft: 350 } }));

    // Booking now carries the deposit; complete it for the full 500.
    const afterDeposit = fake.rows('reservations').find((r) => r.id === RES_ID)!;
    fake.seed('reservations', [{ ...afterDeposit, status: 'confirmed' }]);
    await PATCH(staffReq({ id: RES_ID, body: { status: 'completed', amountPaid: 500, amountLeft: 0 } }));

    const payments = fake.rows('transactions').filter((t) => t.type === 'payment');
    // 150 on deposit day + 350 at checkout = 500 collected, counted once.
    expect(payments.map((p) => p.amount).sort((a, b) => a - b)).toEqual([150, 350]);
    expect(payments.reduce((s, p) => s + p.amount, 0)).toBe(500);

    // The invoice itself is still owed and paid the full 500 — only the history is split.
    const invoice = fake.rows('invoices').find((i) => i.reservation_id === RES_ID)!;
    expect(fake.rows('payments').filter((p) => p.invoice_id === invoice.id)[0].amount).toBe(500);
  });

  it('a deposit does not move spent/outstanding — the service has not been delivered yet', async () => {
    fake.seed('reservations', [baseReservation({ status: 'pending_deposit', amount_paid: 0, amount_left: 500 })]);
    fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 0, spent_amount: 0, outstanding: 0 }]);

    await PATCH(staffReq({ id: RES_ID, body: { status: 'pending', amountPaid: 150, amountLeft: 350 } }));

    const customer = fake.rows('customers').find((c) => c.id === CUSTOMER_ID)!;
    expect(customer.spent_amount).toBe(0);
    expect(customer.outstanding).toBe(0);
  });

  it('a ledger failure does not break the checkout — the money still moves', async () => {
    // The transaction recorder is deliberately non-fatal: a patient is at the desk and the
    // invoice/payment/balance writes have already happened.
    fake.setRpc('next_transaction_seq', () => ({ data: null, error: { message: 'sequence unavailable' } }));
    fake.seed('reservations', [baseReservation({ status: 'confirmed', amount_paid: 0, amount_left: null })]);

    const res = await PATCH(staffReq({ id: RES_ID, body: { status: 'completed', amountPaid: 500, amountLeft: 0 } }));

    expect(res.status).toBe(200);
    expect(fake.rows('invoices').filter((i) => i.reservation_id === RES_ID)).toHaveLength(1);
    expect(fake.rows('customers').find((c) => c.id === CUSTOMER_ID)!.spent_amount).toBe(500);
    expect(fake.rows('transactions')).toHaveLength(0); // recorded nothing, broke nothing
  });
});

// ── GET / POST smoke (auth boundary only — full coverage is a separate task) ─

describe('GET /api/reservations — caller scoping smoke test', () => {
  it('an unauthenticated request is rejected, not given every reservation', async () => {
    fake.seed('reservations', [baseReservation()]);
    const res = await GET(new Request('http://localhost:3000/api/reservations'));
    expect(res.status).not.toBe(200);
  });
});
