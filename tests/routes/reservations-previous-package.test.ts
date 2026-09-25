/**
 * DEC-088 item 6 / production finding 2026-09-25: POST /api/reservations/previous used to store a historical
 * pulses package as package_type 'services' with total_pulses 0 (so its pulses could never be tracked or
 * consumed) and price_paid = the CATALOG price whatever was charged. Now: the catalog decides the package type
 * and quota, and the price is the entered invoice value only for a package-only booking — otherwise it is left
 * pending (price_pending) for staff to enter, never defaulted to the catalog price.
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

import { POST } from '@/app/api/reservations/previous/route';

const USER_ID = 'staff-user';

function staffPost(body: any): Request {
  return new Request('http://localhost:3000/api/reservations/previous', {
    method: 'POST',
    headers: new Headers({ 'content-type': 'application/json', Authorization: 'Bearer staff-token' }),
    body: JSON.stringify(body),
  });
}
const body = (o: Record<string, any> = {}) => ({ patientPhone: '01012345678', patientName: 'Amira Test', date: '2026-05-11', ...o });
const rows = (t: string) => (fake.db[t] || []) as any[];

beforeEach(() => {
  fake.reset();
  for (const t of [
    'reservations', 'customers', 'providers', 'products', 'packages', 'package_items', 'reservation_products',
    'product_sales', 'customer_packages', 'customer_package_items', 'wallet_txns', 'transactions',
    'invoices', 'invoice_lines', 'payments',
  ]) fake.seed(t, []);
  fake.authGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
  fake.seed('employee_accounts', [{ id: 'emp-1', auth_user_id: USER_ID, role_name: 'reception', name: 'Nour', email: 'n@test.com' }]);
  fake.seed('roles', [{ name: 'reception', permissions: [] }]);
  fake.seed('services', [{ id: 15, en: 'Laser Face', ar: 'ليزر وجه', price: 1200 }]);
  fake.seed('packages', [
    { id: 'pulses-10k', name: '10,000 Pulses', price: 8000, validity_days: 365, package_type: 'pulses', total_pulses: 10000 },
    { id: 'pulses-unset', name: 'Pulses (no quota)', price: 3000, validity_days: 365, package_type: 'pulses', total_pulses: 0 },
    { id: 'svc-pkg', name: 'Laser 6 Sessions', price: 3000, validity_days: 365, package_type: 'services', total_pulses: 0 },
  ]);
  fake.seed('package_items', [{ package_id: 'svc-pkg', service_id: 15, qty: 6 }]);
  let txnSeq = 1;
  let invSeq = 1;
  fake.setRpc('next_transaction_seq', () => ({ data: txnSeq++, error: null }));
  fake.setRpc('next_invoice_no', () => ({ data: invSeq++, error: null }));
});

describe('historical package: type and quota come from the catalog', () => {
  it('a pulses package is created as pulses with the catalog quota and the full balance', async () => {
    const res = await POST(staffPost(body({ packageId: 'pulses-10k', invoiceValue: 4000, actualSpent: 4000 })));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(rows('customer_packages')).toHaveLength(1);
    expect(rows('customer_packages')[0]).toMatchObject({
      package_id: 'pulses-10k',
      package_type: 'pulses',
      total_pulses: 10000,
      pulses_used: 0,
      pulses_remaining: 10000,
      status: 'active',
    });
    expect(json.package).toMatchObject({ created: true, packageType: 'pulses', totalPulses: 10000, pricePending: false });
    expect(rows('customer_package_items')).toHaveLength(0);
  });

  it('a catalog pulses package with no quota configured is created as pulses with 0 (refuses consumption, honestly)', async () => {
    const res = await POST(staffPost(body({ packageId: 'pulses-unset', invoiceValue: 3000, actualSpent: 3000 })));
    const json = await res.json();
    expect(rows('customer_packages')[0]).toMatchObject({ package_type: 'pulses', total_pulses: 0, pulses_remaining: 0 });
    expect(json.package).toMatchObject({ packageType: 'pulses', totalPulses: 0 });
  });

  it('a services package keeps its items and is not typed as pulses', async () => {
    await POST(staffPost(body({ packageId: 'svc-pkg', invoiceValue: 3000, actualSpent: 3000 })));
    const cp = rows('customer_packages')[0];
    expect(cp.package_type).toBeUndefined();
    expect(cp.total_pulses).toBeUndefined();
    expect(rows('customer_package_items')).toHaveLength(1);
    expect(rows('customer_package_items')[0]).toMatchObject({ service_id: 15, qty_total: 6, qty_remaining: 6 });
  });
});

describe('historical package: the price is entered or pending, never the catalog price', () => {
  it('package-only with an invoice value: price_paid = the entered value (not the catalog 8,000)', async () => {
    await POST(staffPost(body({ packageId: 'pulses-10k', invoiceValue: 4000, actualSpent: 4000 })));
    expect(rows('customer_packages')[0]).toMatchObject({ price_paid: 4000, price_pending: false });
  });

  it('package-only, invoice value NOT entered: price is pending and price_paid is 0 — not the catalog price', async () => {
    const res = await POST(staffPost(body({ packageId: 'pulses-10k', actualSpent: 4000 })));
    const json = await res.json();
    expect(rows('customer_packages')[0]).toMatchObject({ price_paid: 0, price_pending: true });
    expect(json.package.pricePending).toBe(true);
  });

  it('mixed booking (service + package): the value cannot be split, so the package price is pending', async () => {
    await POST(staffPost(body({ serviceId: 15, packageId: 'pulses-10k', invoiceValue: 2000, actualSpent: 2000 })));
    expect(rows('customer_packages')[0]).toMatchObject({ price_paid: 0, price_pending: true });
  });

  it('mixed booking (product + package): pending', async () => {
    await POST(staffPost(body({ productName: 'Serum', packageId: 'svc-pkg', invoiceValue: 3500, actualSpent: 3500 })));
    expect(rows('customer_packages')[0]).toMatchObject({ price_paid: 0, price_pending: true });
  });

  it('the booking, balances and ledger invoice are unaffected by a pending package price', async () => {
    const res = await POST(staffPost(body({ packageId: 'pulses-10k', actualSpent: 4000 })));
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.ledger.status).toBe('created');
    expect(rows('invoices')[0].grand_total).toBe(4000);
    expect(rows('customers')[0].spent_amount).toBe(4000);
  });
});

describe('a booking without a package is unaffected', () => {
  it('returns package = null and creates no package row', async () => {
    const res = await POST(staffPost(body({ serviceId: 15, invoiceValue: 1200, actualSpent: 1200 })));
    const json = await res.json();
    expect(json.package).toBeNull();
    expect(rows('customer_packages')).toHaveLength(0);
  });
});
