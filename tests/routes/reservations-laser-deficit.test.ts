/**
 * Brief 35 / DEC-079: POST/GET /api/reservations/laser-deficit — reception checkout is the
 * only place a laser-pulse deficit is resolved. Covers: server-side deficit computation
 * (never trusted from the body), both choices, reservation-level idempotency, the no-package
 * / equal-balance / expired / missing-quota / unresolvable-rate refusal cases, and auth.
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

import { GET, POST } from '@/app/api/reservations/laser-deficit/route';

const RES_ID = '11111111-1111-1111-1111-111111111111';
const CUSTOMER_ID = '22222222-2222-2222-2222-222222222222';
const PKG_ID = '33333333-3333-3333-3333-333333333333';
const CATALOG_PKG_ID = '44444444-4444-4444-4444-444444444444';
const EMP_ID = '55555555-5555-5555-5555-555555555555';
const USER_ID = '66666666-6666-6666-6666-666666666666';

function staffReq(body?: any): Request {
  return new Request('http://localhost:3000/api/reservations/laser-deficit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer staff-token' },
    body: JSON.stringify(body ?? {}),
  });
}
function staffGet(): Request {
  return new Request(`http://localhost:3000/api/reservations/laser-deficit?reservationId=${RES_ID}`, {
    headers: { Authorization: 'Bearer staff-token' },
  });
}

function seedStaff() {
  fake.authGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
  fake.seed('employee_accounts', [{ id: EMP_ID, auth_user_id: USER_ID, role_name: 'reception', email: 'r@test.com' }]);
  fake.seed('roles', [{ name: 'reception', permissions: [] }]);
}

// Simulates the real consume_package_pulses RPC against the fake tables:
// idempotent on (customer_package_id, reservation_id), clamps at pulses_remaining.
function registerConsumeRpc() {
  fake.setRpc('consume_package_pulses', (args: any) => {
    const pkg = fake.db['customer_packages']?.find((p: any) => p.id === args.p_customer_package_id);
    if (!pkg) return { data: null, error: { message: 'customer package not found' } };
    const existing = (fake.db['package_pulse_usage'] || []).find(
      (u: any) => u.customer_package_id === pkg.id && u.reservation_id === args.p_reservation_id
    );
    if (existing) {
      return {
        data: {
          consumed: 0, requested: args.p_qty, remaining: pkg.pulses_remaining,
          already_deducted: true, used_total: pkg.pulses_used, total_pulses: pkg.total_pulses,
        },
        error: null,
      };
    }
    if (Number(pkg.pulses_remaining || 0) <= 0) {
      return { data: null, error: { message: 'package has 0 remaining pulses' } };
    }
    const consumed = Math.min(args.p_qty, Math.max(0, pkg.pulses_remaining));
    pkg.pulses_used = Number(pkg.pulses_used || 0) + consumed;
    pkg.pulses_remaining = Number(pkg.pulses_remaining || 0) - consumed;
    if (pkg.pulses_remaining <= 0) pkg.status = 'fully_used';
    (fake.db['package_pulse_usage'] ||= []).push({
      id: `ppu-${(fake.db['package_pulse_usage'].length || 0) + 1}`,
      customer_package_id: pkg.id, reservation_id: args.p_reservation_id,
      quantity_used: consumed, remaining_after: pkg.pulses_remaining,
    });
    return {
      data: {
        consumed, requested: args.p_qty, remaining: pkg.pulses_remaining,
        already_deducted: false, used_total: pkg.pulses_used, total_pulses: pkg.total_pulses,
      },
      error: null,
    };
  });
}

function seedReservation(overrides: Record<string, any> = {}) {
  fake.seed('reservations', [{
    id: RES_ID, customer_id: CUSTOMER_ID, status: 'in_progress',
    delivered_pulses: 10000, laser_payment_mode: 'PACKAGE',
    laser_price_per_pulse: null, notes: '',
    laser_deficit_resolution: null, laser_deficit_pulses: null,
    ...overrides,
  }]);
}

function seedPackage(overrides: Record<string, any> = {}) {
  fake.seed('customer_packages', [{
    id: PKG_ID, customer_id: CUSTOMER_ID, package_id: CATALOG_PKG_ID,
    package_type: 'pulses', total_pulses: 5000, pulses_used: 0,
    pulses_remaining: 5000, status: 'active', expires_at: null,
    purchased_at: '2026-01-01',
    ...overrides,
  }]);
}

beforeEach(() => {
  fake.reset();
  seedStaff();
  registerConsumeRpc();
});

describe('GET /api/reservations/laser-deficit', () => {
  it('reports delivered, remaining, deficit and the resolved rate', async () => {
    seedReservation();
    seedPackage({ pulses_remaining: 0, pulses_used: 5000 });
    fake.seed('package_pulse_usage', [{
      id: 'u1', customer_package_id: PKG_ID, reservation_id: RES_ID, quantity_used: 5000,
    }]);

    const res = await GET(staffGet());
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toMatchObject({
      resolved: false, deficitPulses: 5000, deliveredPulses: 10000,
      remainingPulses: 0, sourceCustomerPackageId: PKG_ID,
    });
  });

  it('reports already-resolved when the marker is set', async () => {
    seedReservation({ laser_deficit_resolution: 'PAY_PER_PULSE', laser_deficit_pulses: 5000 });
    seedPackage({ pulses_remaining: 0, pulses_used: 5000 });
    const res = await GET(staffGet());
    const data = await res.json();
    expect(data.resolved).toBe(true);
    expect(data.resolution).toBe('PAY_PER_PULSE');
  });
});

describe('POST /api/reservations/laser-deficit', () => {
  it('rejects unauthenticated calls with 401', async () => {
    const res = await POST(new Request('http://localhost:3000/api/reservations/laser-deficit', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reservationId: RES_ID, choice: 'PAY_PER_PULSE' }),
    }));
    expect(res.status).toBe(401);
  });

  it('computes the deficit server-side — a body claiming 0 does not shrink it', async () => {
    seedReservation({ laser_price_per_pulse: 2 });
    seedPackage({ pulses_remaining: 0, pulses_used: 5000 });
    fake.seed('package_pulse_usage', [{
      id: 'u1', customer_package_id: PKG_ID, reservation_id: RES_ID, quantity_used: 5000,
    }]);

    const res = await POST(staffReq({ reservationId: RES_ID, choice: 'PAY_PER_PULSE', deficitPulses: 0 }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.deficitPulses).toBe(5000);
    expect(data.invoiceDelta).toBe(10000); // 5000 × 2 EGP, not 0
  });

  it('PAY_PER_PULSE writes one deficit line at the resolved rate and sets the marker', async () => {
    seedReservation({ laser_price_per_pulse: 2 });
    seedPackage({ pulses_remaining: 0, pulses_used: 5000 });
    fake.seed('package_pulse_usage', [{
      id: 'u1', customer_package_id: PKG_ID, reservation_id: RES_ID, quantity_used: 5000,
    }]);

    const res = await POST(staffReq({ reservationId: RES_ID, choice: 'PAY_PER_PULSE', paymentMethod: 'card' }));
    expect(res.status).toBe(200);

    const lines = fake.rows('reservation_products');
    expect(lines).toHaveLength(1);
    // added_by_role must be one of the real CHECK constraint's values ('doctor_session' |
    // 'receptionist') — 'receptionist_checkout' passed the fake silently but violated the real
    // constraint on every PAY_PER_PULSE resolution (confirmed live, 2026-09-24).
    expect(lines[0]).toMatchObject({ qty: 5000, unit_price: 2, line_type: 'device_pulses', added_by_role: 'receptionist' });
    expect(fake.rows('reservations')[0].laser_deficit_resolution).toBe('PAY_PER_PULSE');
    expect(fake.rows('reservations')[0].laser_deficit_pulses).toBe(5000);
  });

  it('PAY_PER_PULSE adds the charge to amount_left exactly once, so checkout actually collects it', async () => {
    // Live finding: the deficit line was written but amount_left stayed 0, so the checkout modal
    // showed 0 due and the drawer showed "Paid" — the 10,000 EGP was never collected.
    seedReservation({ laser_price_per_pulse: 2, amount_left: 300 });
    seedPackage({ pulses_remaining: 0, pulses_used: 5000 });
    fake.seed('package_pulse_usage', [{
      id: 'u1', customer_package_id: PKG_ID, reservation_id: RES_ID, quantity_used: 5000,
    }]);

    const first = await POST(staffReq({ reservationId: RES_ID, choice: 'PAY_PER_PULSE' }));
    expect(first.status).toBe(200);
    expect(Number(fake.rows('reservations')[0].amount_left)).toBe(300 + 5000 * 2);

    const repeat = await POST(staffReq({ reservationId: RES_ID, choice: 'PAY_PER_PULSE' }));
    expect((await repeat.json()).alreadyResolved).toBe(true);
    expect(Number(fake.rows('reservations')[0].amount_left)).toBe(300 + 5000 * 2);
  });

  it('recomputes and resolves the deficit on retry after the source package already flipped to fully_used', async () => {
    // Reproduces the live 2026-09-24 finding: an earlier attempt's consume step succeeded (draining
    // the package to fully_used) but a later step failed before the marker was written. A retry
    // must still find the deficit via package_pulse_usage, not report noActivePackage/deficit 0
    // just because the package is no longer 'active'.
    seedReservation({ laser_price_per_pulse: 2 });
    seedPackage({ pulses_remaining: 0, pulses_used: 5000, status: 'fully_used' });
    fake.seed('package_pulse_usage', [{
      id: 'u1', customer_package_id: PKG_ID, reservation_id: RES_ID, quantity_used: 3000,
    }]);

    const getRes = await GET(staffGet());
    const getData = await getRes.json();
    expect(getData.deficitPulses).toBe(7000); // 10000 delivered - 3000 already consumed - 0 remaining
    expect(getData.noActivePackage).toBe(false);
    expect(getData.sourceCustomerPackageId).toBe(PKG_ID);

    const res = await POST(staffReq({ reservationId: RES_ID, choice: 'PAY_PER_PULSE' }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.deficitPulses).toBe(7000);
    expect(data.consumedFromSourcePackage).toBe(0); // already drained — must not attempt to consume again
    expect(fake.rows('reservations')[0].laser_deficit_resolution).toBe('PAY_PER_PULSE');
    expect(fake.rows('reservation_products')).toHaveLength(1);
  });

  it('PAY_PER_PULSE consumes the remaining balance first when the doctor consume never ran', async () => {
    seedReservation({ laser_price_per_pulse: 2 });
    seedPackage(); // 5000 remaining, no usage row yet

    const res = await POST(staffReq({ reservationId: RES_ID, choice: 'PAY_PER_PULSE' }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.deficitPulses).toBe(5000);
    expect(data.consumedFromSourcePackage).toBe(5000);
    const pkg = fake.rows('customer_packages')[0];
    expect(pkg.pulses_remaining).toBe(0);
    expect(pkg.status).toBe('fully_used');
  });

  it('BUY_NEW_PACKAGE sells once, deducts the deficit from the new package, sets the marker', async () => {
    seedReservation();
    seedPackage({ pulses_remaining: 0, pulses_used: 5000 });
    fake.seed('package_pulse_usage', [{
      id: 'u1', customer_package_id: PKG_ID, reservation_id: RES_ID, quantity_used: 5000,
    }]);
    fake.seed('packages', [{
      id: CATALOG_PKG_ID, name: 'Pulses 20k', branch_id: null, price: 6000,
      tax_rate: 0, validity_days: 365, active: true, package_type: 'pulses', total_pulses: 20000,
    }]);
    fake.seed('customers', [{ id: CUSTOMER_ID, name: 'Test Patient', outstanding: 0 }]);

    const res = await POST(staffReq({
      reservationId: RES_ID, choice: 'BUY_NEW_PACKAGE',
      packageId: CATALOG_PKG_ID, paymentMethod: 'card',
    }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.customerPackageId).toBeTruthy();

    const newPkg = fake.rows('customer_packages').find((p: any) => p.id === data.customerPackageId);
    expect(newPkg.total_pulses).toBe(20000);
    expect(newPkg.pulses_used).toBe(5000);
    expect(newPkg.pulses_remaining).toBe(15000);
    expect(fake.rows('invoices')).toHaveLength(1);
    expect(fake.rows('reservations')[0].laser_deficit_resolution).toBe('BUY_NEW_PACKAGE');
  });

  it('a second call is a no-op returning the first resolution', async () => {
    seedReservation({ laser_price_per_pulse: 2 });
    seedPackage({ pulses_remaining: 0, pulses_used: 5000 });
    fake.seed('package_pulse_usage', [{
      id: 'u1', customer_package_id: PKG_ID, reservation_id: RES_ID, quantity_used: 5000,
    }]);

    await POST(staffReq({ reservationId: RES_ID, choice: 'PAY_PER_PULSE' }));
    const res2 = await POST(staffReq({ reservationId: RES_ID, choice: 'BUY_NEW_PACKAGE', packageId: CATALOG_PKG_ID }));
    const data2 = await res2.json();
    expect(res2.status).toBe(200);
    expect(data2.alreadyResolved).toBe(true);
    expect(data2.resolution).toBe('PAY_PER_PULSE');
    expect(fake.rows('reservation_products')).toHaveLength(1); // no second line
  });

  it('a booking resolved before the marker columns (legacy deficit tag) is already resolved', async () => {
    seedReservation({
      notes: '[Laser Package Redemption]: Existing package exhausted. Excess 5000 pulses charged per pulse @ 2 EGP',
      laser_deficit_resolution: null,
    });
    seedPackage({ pulses_remaining: 0, pulses_used: 5000 });
    const res = await POST(staffReq({ reservationId: RES_ID, choice: 'PAY_PER_PULSE' }));
    const data = await res.json();
    expect(data.alreadyResolved).toBe(true);
    expect(data.resolution).toBe('LEGACY');
    expect(fake.rows('reservation_products')).toHaveLength(0);
  });

  it('no active package at all → no deficit, no prompt, no writes', async () => {
    seedReservation();
    const res = await POST(staffReq({ reservationId: RES_ID, choice: 'PAY_PER_PULSE' }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.deficitPulses).toBe(0);
    expect(data.noActivePackage).toBe(true);
    expect(fake.rows('reservation_products')).toHaveLength(0);
  });

  it('exactly-equal balance → deficit 0, no marker written', async () => {
    seedReservation({ delivered_pulses: 5000 });
    seedPackage(); // 5000 remaining covers all 5000
    const res = await POST(staffReq({ reservationId: RES_ID, choice: 'PAY_PER_PULSE' }));
    const data = await res.json();
    expect(data.deficitPulses).toBe(0);
    expect(fake.rows('reservations')[0].laser_deficit_resolution).toBeNull();
  });

  it('unresolvable per-pulse rate → 400, nothing written', async () => {
    seedReservation(); // laser_price_per_pulse null, no notes rate, no page_settings home
    seedPackage({ pulses_remaining: 0, pulses_used: 5000 });
    fake.seed('package_pulse_usage', [{
      id: 'u1', customer_package_id: PKG_ID, reservation_id: RES_ID, quantity_used: 5000,
    }]);

    const res = await POST(staffReq({ reservationId: RES_ID, choice: 'PAY_PER_PULSE' }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: expect.stringContaining('rate') });
    expect(fake.rows('reservation_products')).toHaveLength(0);
    expect(fake.rows('reservations')[0].laser_deficit_resolution).toBeNull();
  });

  it('expired source package → 400, nothing written', async () => {
    seedReservation({ laser_price_per_pulse: 2 });
    seedPackage({ pulses_remaining: 0, pulses_used: 5000, expires_at: '2020-01-01T00:00:00Z' });
    const res = await POST(staffReq({ reservationId: RES_ID, choice: 'PAY_PER_PULSE' }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: expect.stringContaining('expired') });
    expect(fake.rows('reservation_products')).toHaveLength(0);
  });

  it('source package with unconfigured quota → 400, never a guessed total', async () => {
    seedReservation({ laser_price_per_pulse: 2 });
    seedPackage({ total_pulses: 0, pulses_remaining: 0, pulses_used: 0 });
    const res = await POST(staffReq({ reservationId: RES_ID, choice: 'PAY_PER_PULSE' }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: expect.stringContaining('pulse quota') });
  });

  it('rejects a malformed reservationId before touching the DB', async () => {
    const res = await POST(staffReq({ reservationId: 'not-a-uuid', choice: 'PAY_PER_PULSE' }));
    expect(res.status).toBe(400);
  });
});

describe('PAY_PER_PULSE writes the deficit into the invoice ledger (RISK-100)', () => {
  // Live finding: the cash was on reservations/customers but no invoices/payments/transactions row
  // existed, because a fully package-covered doctor completion writes no invoice and the checkout's
  // append-a-payment path silently no-ops without one.
  let invSeq = 1;
  let txnSeq = 1;
  beforeEach(() => {
    invSeq = 1;
    txnSeq = 1;
    fake.setRpc('next_invoice_no', () => ({ data: invSeq++, error: null }));
    fake.setRpc('next_transaction_seq', () => ({ data: txnSeq++, error: null }));
    fake.seed('invoices', []);
    fake.seed('invoice_lines', []);
    fake.seed('transactions', []);
    seedPackage({ pulses_remaining: 0, pulses_used: 5000 });
    fake.seed('package_pulse_usage', [{
      id: 'u1', customer_package_id: PKG_ID, reservation_id: RES_ID, quantity_used: 5000,
    }]);
  });

  it('creates the invoice, its line and a service_charge transaction when a completed booking has none', async () => {
    seedReservation({ status: 'completed', laser_price_per_pulse: 2, branch_id: 'branch-1' });

    const res = await POST(staffReq({ reservationId: RES_ID, choice: 'PAY_PER_PULSE' }));
    expect(res.status).toBe(200);

    const invoices = fake.rows('invoices');
    expect(invoices).toHaveLength(1);
    expect(invoices[0]).toMatchObject({
      reservation_id: RES_ID, customer_id: CUSTOMER_ID, status: 'issued', grand_total: 10000, invoice_no: 'INV-000001',
    });
    const lines = fake.rows('invoice_lines');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ invoice_id: invoices[0].id, qty: 5000, unit_price: 2, line_total: 10000 });
    const txns = fake.rows('transactions');
    expect(txns).toHaveLength(1);
    expect(txns[0]).toMatchObject({ type: 'service_charge', amount: 10000, invoice_id: invoices[0].id });
    // the deficit reservation_products row is marked invoiced so a later completion cannot re-bill it
    expect(fake.rows('reservation_products')[0].invoiced_at).toBeTruthy();
  });

  it('is idempotent - a repeat resolve creates no second invoice, line or transaction', async () => {
    seedReservation({ status: 'completed', laser_price_per_pulse: 2 });
    await POST(staffReq({ reservationId: RES_ID, choice: 'PAY_PER_PULSE' }));
    // simulate a retry that got past the marker (e.g. the marker write had failed)
    fake.rows('reservations')[0].laser_deficit_resolution = null;
    const again = await POST(staffReq({ reservationId: RES_ID, choice: 'PAY_PER_PULSE' }));
    expect(again.status).toBe(200);
    expect(fake.rows('invoices')).toHaveLength(1);
    expect(fake.rows('invoice_lines')).toHaveLength(1);
    expect(fake.rows('transactions')).toHaveLength(1);
    expect(Number(fake.rows('reservations')[0].amount_left)).toBe(10000);
  });

  it('adds the line to an existing invoice and recomputes its totals from its lines', async () => {
    seedReservation({ status: 'completed', laser_price_per_pulse: 2 });
    fake.seed('invoices', [{
      id: 'inv-1', invoice_no: 'INV-000900', reservation_id: RES_ID, customer_id: CUSTOMER_ID,
      status: 'issued', subtotal: 150, discount_total: 150, grand_total: 0,
    }]);
    fake.seed('invoice_lines', [{
      id: 'l0', invoice_id: 'inv-1', description: 'Laser Hair Removal (package redemption)',
      qty: 1, unit_price: 150, discount: 150, line_total: 0,
    }]);

    const res = await POST(staffReq({ reservationId: RES_ID, choice: 'PAY_PER_PULSE' }));
    expect(res.status).toBe(200);

    expect(fake.rows('invoices')).toHaveLength(1);
    expect(fake.rows('invoice_lines')).toHaveLength(2);
    expect(fake.rows('invoices')[0]).toMatchObject({ subtotal: 10150, discount_total: 150, grand_total: 10000 });
  });

  it('writes nothing to the ledger while the booking is not completed yet (completion writes the invoice)', async () => {
    seedReservation({ status: 'in_progress', laser_price_per_pulse: 2 });
    const res = await POST(staffReq({ reservationId: RES_ID, choice: 'PAY_PER_PULSE' }));
    expect(res.status).toBe(200);
    expect(fake.rows('invoices')).toHaveLength(0);
    expect(fake.rows('invoice_lines')).toHaveLength(0);
    expect(fake.rows('transactions')).toHaveLength(0);
  });
});
