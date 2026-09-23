/**
 * Route-level tests for POST /api/packages/sell — RISK-092: the route wrote the invoice status as
 * 'paid' / 'partially_paid', but the schema is `CHECK (status IN ('draft','issued','void'))`
 * (supabase/migrations/20260726010000_create_invoices.sql). Postgres rejected every package sale that
 * had money attached with a 500, so buying a pulses package during New Booking / Checkout never
 * created the patient's package even though the booking went on to charge for it.
 *
 * `supabaseFake` does not enforce CHECK constraints, so the constraint itself is asserted here by
 * checking the written value against the allowed set. Confirmed to fail against the old code.
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

import { POST } from '@/app/api/packages/sell/route';

// invoices.status CHECK constraint, copied from 20260726010000_create_invoices.sql.
const ALLOWED_INVOICE_STATUSES = ['draft', 'issued', 'void'];

const USER_ID = 'staff-user';
const CUSTOMER_ID = '11111111-1111-4111-8111-111111111111';
const PACKAGE_ID = '22222222-2222-4222-8222-222222222222';

function sellReq(body: Record<string, any>): Request {
  return new Request('http://localhost:3000/api/packages/sell', {
    method: 'POST',
    headers: { 'content-type': 'application/json', Authorization: 'Bearer staff-token' },
    body: JSON.stringify(body),
  });
}

let txnSeq = 1;

beforeEach(() => {
  fake.reset();
  txnSeq = 1;
  fake.setRpc('next_transaction_seq', () => ({ data: txnSeq++, error: null }));
  fake.authGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
  fake.seed('employee_accounts', [{ id: 'emp-1', auth_user_id: USER_ID, role_name: 'reception' }]);
  fake.seed('roles', [{ name: 'reception', permissions: [] }]);
  fake.seed('customers', [
    { id: CUSTOMER_ID, name: 'Test Patient', mobile: '01099990001', spent_amount: 0, wallet_balance: 0, outstanding: 0 },
  ]);
  fake.seed('packages', [
    {
      id: PACKAGE_ID, name: 'pulses v2', branch_id: null, price: 1000, tax_rate: 0,
      validity_days: 365, active: true, package_type: 'pulses', total_pulses: 10000,
    },
  ]);
  for (const t of ['package_items', 'invoices', 'invoice_lines', 'payments', 'customer_packages', 'customer_package_items', 'page_settings', 'transactions']) {
    fake.seed(t, []);
  }
});

describe('POST /api/packages/sell — invoice status must satisfy the schema (RISK-092)', () => {
  it('a fully paid pulses package writes an allowed invoice status and creates the patient\'s package', async () => {
    const res = await POST(sellReq({ customerId: CUSTOMER_ID, packageId: PACKAGE_ID, amountPaid: 1000 }));
    expect(res.status).toBe(201);

    const invoices = fake.rows('invoices');
    expect(invoices).toHaveLength(1);
    expect(ALLOWED_INVOICE_STATUSES).toContain(invoices[0].status);

    const cps = fake.rows('customer_packages');
    expect(cps).toHaveLength(1);
    expect(cps[0]).toMatchObject({
      customer_id: CUSTOMER_ID, package_id: PACKAGE_ID, package_type: 'pulses',
      total_pulses: 10000, pulses_remaining: 10000, pulses_used: 0, status: 'active',
    });
  });

  it('a partial payment also writes an allowed status, and the unpaid part becomes patient outstanding', async () => {
    const res = await POST(sellReq({ customerId: CUSTOMER_ID, packageId: PACKAGE_ID, amountPaid: 400 }));
    expect(res.status).toBe(201);

    expect(ALLOWED_INVOICE_STATUSES).toContain(fake.rows('invoices')[0].status);
    expect(fake.rows('payments')[0].amount).toBe(400);
    const patient = fake.rows('customers')[0];
    expect(patient.spent_amount).toBe(400);
    expect(patient.outstanding).toBe(600);
  });

  it('an unpaid sale (amountPaid 0) still works and records no payment', async () => {
    const res = await POST(sellReq({ customerId: CUSTOMER_ID, packageId: PACKAGE_ID, amountPaid: 0 }));
    expect(res.status).toBe(201);
    expect(ALLOWED_INVOICE_STATUSES).toContain(fake.rows('invoices')[0].status);
    expect(fake.rows('payments')).toHaveLength(0);
    expect(fake.rows('customers')[0].outstanding).toBe(1000);
  });

  it('records the payment against the invoice and stores the pulse quota for the new package', async () => {
    await POST(sellReq({ customerId: CUSTOMER_ID, packageId: PACKAGE_ID, amountPaid: 1000 }));

    const invoice = fake.rows('invoices')[0];
    expect(fake.rows('payments')[0]).toMatchObject({ invoice_id: invoice.id, amount: 1000, method: 'cash' });

    // Brief 34B: the balance lives on the customer_packages columns, not the page_settings blob.
    expect(fake.rows('customer_packages')[0]).toMatchObject({
      total_pulses: 10000, pulses_remaining: 10000, pulses_used: 0, package_type: 'pulses',
    });
    expect(fake.rows('page_settings').some((r) => r.key === 'customer_package_pulses')).toBe(false);
  });
});

describe('POST /api/packages/sell — pulse quota must be real (Brief 34B)', () => {
  it('refuses a pulses-type package with no configured total_pulses and writes nothing', async () => {
    fake.seed('packages', [{
      id: PACKAGE_ID, name: 'Laser Pulses Custom', branch_id: null, price: 1000, tax_rate: 0,
      validity_days: 365, active: true, package_type: 'pulses', total_pulses: 0,
    }]);

    const res = await POST(sellReq({ customerId: CUSTOMER_ID, packageId: PACKAGE_ID, amountPaid: 1000 }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: expect.stringContaining('pulse quota') });
    expect(fake.rows('customer_packages')).toHaveLength(0);
    expect(fake.rows('invoices')).toHaveLength(0);
  });

  it('allows selling a services package that has laser in its name if it has items', async () => {
    fake.seed('packages', [{
      id: PACKAGE_ID, name: 'Laser Full Body 3x', branch_id: null, price: 1500, tax_rate: 0,
      validity_days: 180, active: true, package_type: 'services', total_pulses: 0,
    }]);
    fake.seed('package_items', [{ package_id: PACKAGE_ID, service_id: 101, qty: 3 }]);

    const res = await POST(sellReq({ customerId: CUSTOMER_ID, packageId: PACKAGE_ID, amountPaid: 1500 }));
    expect(res.status).toBe(201);
    const cps = fake.rows('customer_packages');
    expect(cps).toHaveLength(1);
    expect(cps[0]).toMatchObject({
      package_type: 'services',
      total_pulses: 0,
      pulses_remaining: 0,
    });
    const cpItems = fake.rows('customer_package_items');
    expect(cpItems).toHaveLength(1);
    expect(cpItems[0]).toMatchObject({
      service_id: 101,
      qty_total: 3,
      qty_remaining: 3,
    });
  });

  it('resolves pulses from package name or packages_meta when total_pulses column is zero', async () => {
    fake.seed('packages', [{
      id: PACKAGE_ID, name: '5000 Laser Pulses', branch_id: null, price: 2000, tax_rate: 0,
      validity_days: 365, active: true, package_type: 'pulses', total_pulses: 0,
    }]);

    const res = await POST(sellReq({ customerId: CUSTOMER_ID, packageId: PACKAGE_ID, amountPaid: 2000 }));
    expect(res.status).toBe(201);
    const cps = fake.rows('customer_packages');
    expect(cps).toHaveLength(1);
    expect(cps[0]).toMatchObject({
      package_type: 'pulses',
      total_pulses: 5000,
      pulses_remaining: 5000,
    });
  });
});

describe('POST /api/packages/sell — customer resolution', () => {
  it('404s for a customer id that resolves to no patient, and creates nothing', async () => {
    const res = await POST(sellReq({ customerId: 'nobody', packageId: PACKAGE_ID, amountPaid: 1000 }));
    expect(res.status).toBe(404);
    expect(fake.rows('customer_packages')).toHaveLength(0);
    expect(fake.rows('invoices')).toHaveLength(0);
  });

  it('resolves a phone number to the existing patient instead of failing', async () => {
    const res = await POST(sellReq({ customerId: '01099990001', packageId: PACKAGE_ID, amountPaid: 1000 }));
    expect(res.status).toBe(201);
    expect(fake.rows('customer_packages')[0].customer_id).toBe(CUSTOMER_ID);
  });
});
