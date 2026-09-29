/**
 * DEC-098: several packages on one historical (Add/Edit Previous Booking) booking. The multi-package form
 * arrived with four defects (guessed price, pre-launch pulse history deleted by a 0, packages added while
 * editing never created, no ownership/duplicate check). These tests pin the corrected behaviour against the
 * stored rows, not just the status codes.
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

import { POST, PATCH } from '@/app/api/reservations/previous/route';
import { normalizeIncomingPackages } from '@/lib/historicalPackages';

const USER_ID = 'staff-user';
const EMP_ID = 'emp-1';
const PHONE = '01012345678';
const DATE = '2026-05-11';

function req(method: 'POST' | 'PATCH', body: any): Request {
  return new Request('http://localhost:3000/api/reservations/previous', {
    method,
    headers: new Headers({ 'content-type': 'application/json', Authorization: 'Bearer staff-token' }),
    body: JSON.stringify(body),
  });
}
const base = (o: Record<string, any> = {}) => ({ patientPhone: PHONE, patientName: 'Amira Test', date: DATE, ...o });
const rows = (t: string) => (fake.db[t] || []) as any[];

function as(role: string) {
  fake.seed('employee_accounts', [{ id: EMP_ID, auth_user_id: USER_ID, role_name: role, name: 'Staff', email: 's@test.com' }]);
  fake.seed('roles', [{ name: role, permissions: [] }]);
}

const existingPulses = (o: Record<string, any> = {}) => ({
  customerPackageId: 'cp-1', packageId: 'pulses-10k', packageName: '10,000 Pulses', source: 'existing', price: 0,
  packageType: 'pulses', totalPulses: 10000, pulsesUsed: 0, pulsesRemaining: 7000, ...o,
});
const catalogPulses = (o: Record<string, any> = {}) => ({
  packageId: 'pulses-5k', packageName: '5,000 Pulses', source: 'catalog', price: 6000,
  packageType: 'pulses', totalPulses: 5000, pulsesUsed: 0, pulsesRemaining: 5000, ...o,
});

function seedPatientWithPackage() {
  fake.seed('customers', [
    { id: 'c1', name: 'Amira Test', mobile: PHONE, spent_amount: 0, outstanding: 0, wallet_balance: 0, number_of_bookings: 0 },
    { id: 'c2', name: 'Other Patient', mobile: '01099990000', spent_amount: 0, outstanding: 0, wallet_balance: 0 },
  ]);
  fake.seed('customer_packages', [
    { id: 'cp-1', customer_id: 'c1', package_id: 'pulses-10k', package_type: 'pulses', total_pulses: 10000, pulses_used: 3000, pulses_remaining: 7000, status: 'active', price_paid: 10000, price_pending: false },
    { id: 'cp-other', customer_id: 'c2', package_id: 'pulses-10k', package_type: 'pulses', total_pulses: 10000, pulses_used: 0, pulses_remaining: 10000, status: 'active', price_paid: 10000, price_pending: false },
  ]);
}

beforeEach(() => {
  fake.reset();
  for (const t of [
    'reservations', 'customers', 'providers', 'products', 'reservation_products', 'product_sales',
    'customer_packages', 'customer_package_items', 'package_items', 'package_pulse_usage', 'wallet_txns',
    'transactions', 'transaction_audit_logs', 'invoices', 'invoice_lines', 'payments',
  ]) fake.seed(t, []);
  fake.authGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
  as('reception');
  fake.seed('services', [{ id: 15, en: 'Laser Face', ar: 'ليزر وجه', price: 1200 }]);
  fake.seed('packages', [
    { id: 'pulses-10k', name: '10,000 Pulses', price: 10000, validity_days: 365, package_type: 'pulses', total_pulses: 10000 },
    { id: 'pulses-5k', name: '5,000 Pulses', price: 6000, validity_days: 365, package_type: 'pulses', total_pulses: 5000 },
  ]);
  let txnSeq = 1;
  let invSeq = 100;
  fake.setRpc('next_transaction_seq', () => ({ data: txnSeq++, error: null }));
  fake.setRpc('next_invoice_no', () => ({ data: invSeq++, error: null }));
});

describe('normalizeIncomingPackages', () => {
  it('uses the packages array when present', () => {
    const out = normalizeIncomingPackages({ packages: [existingPulses({ pulsesUsed: 500 }), catalogPulses()], packageId: 'ignored' });
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ customerPackageId: 'cp-1', requestedPulsesUsed: 500, clientPrice: 0 });
    expect(out[1]).toMatchObject({ customerPackageId: null, packageId: 'pulses-5k', clientPrice: 6000 });
  });

  it('falls back to the legacy single-package fields', () => {
    const out = normalizeIncomingPackages({ packageId: 'pulses-10k', packagePulsesTotal: 10000, packagePulsesUsed: 3000, packagePulsesRemaining: 7000 });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ packageId: 'pulses-10k', requestedType: 'pulses', requestedPulsesUsed: 3000, requestedPulsesRemaining: 7000 });
    expect(normalizeIncomingPackages({})).toEqual([]);
  });
});

describe('POST with several packages', () => {
  it('updates the existing package and creates the new one with its price pending (the sent price is ignored)', async () => {
    seedPatientWithPackage();
    const res = await POST(req('POST', base({
      invoiceValue: 6000, actualSpent: 6000,
      packages: [existingPulses({ pulsesUsed: 500, pulsesRemaining: 6500 }), catalogPulses()],
    })));
    expect(res.status).toBe(200);

    const cp1 = rows('customer_packages').find((r) => r.id === 'cp-1');
    expect(cp1).toMatchObject({ pulses_remaining: 6500, pulses_used: 3500 });

    const created = rows('customer_packages').filter((r) => r.package_id === 'pulses-5k');
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({ customer_id: 'c1', price_paid: 0, price_pending: true, total_pulses: 5000, pulses_remaining: 5000 });

    const json = await res.json();
    expect(json.packages).toHaveLength(2);
    expect(json.package).toEqual(json.packages[0]);
  });

  it('a package-only booking with one new package takes the entered invoice value as its price, not the catalog/sent price', async () => {
    const res = await POST(req('POST', base({ invoiceValue: 5000, actualSpent: 5000, packages: [catalogPulses({ price: 6000 })] })));
    expect(res.status).toBe(200);
    expect(rows('customer_packages')[0]).toMatchObject({ package_id: 'pulses-5k', price_paid: 5000, price_pending: false });
  });

  it('a service plus a package cannot split the invoice value, so the package price stays pending', async () => {
    const res = await POST(req('POST', base({ serviceId: 15, invoiceValue: 7000, actualSpent: 7000, packages: [catalogPulses()] })));
    expect(res.status).toBe(200);
    expect(rows('customer_packages')[0]).toMatchObject({ price_paid: 0, price_pending: true });
  });

  it('the same patient package attached twice is rejected before anything is written', async () => {
    seedPatientWithPackage();
    const res = await POST(req('POST', base({ invoiceValue: 1000, actualSpent: 500, packages: [existingPulses(), existingPulses()] })));
    expect(res.status).toBe(400);
    expect((await res.json()).field).toBe('packages');
    expect(rows('reservations')).toHaveLength(0);
    expect(rows('customers').find((c) => c.id === 'c1')).toMatchObject({ outstanding: 0, spent_amount: 0, number_of_bookings: 0 });
    expect(rows('invoices')).toHaveLength(0);
  });

  it("another patient's package is rejected before anything is written", async () => {
    seedPatientWithPackage();
    const res = await POST(req('POST', base({ invoiceValue: 1000, actualSpent: 1000, packages: [existingPulses({ customerPackageId: 'cp-other' })] })));
    expect(res.status).toBe(400);
    expect(rows('reservations')).toHaveLength(0);
    expect(rows('customers').find((c) => c.id === 'c1')).toMatchObject({ spent_amount: 0 });
    expect(rows('customer_packages').find((r) => r.id === 'cp-other')).toMatchObject({ pulses_remaining: 10000 });
  });

  it('a brand-new patient cannot have an existing package attached', async () => {
    seedPatientWithPackage();
    const res = await POST(req('POST', base({ patientPhone: '01055554444', packages: [existingPulses()] })));
    expect(res.status).toBe(400);
    expect(rows('customers')).toHaveLength(2);
  });
});

describe('pre-launch pulse history (RISK-106) holds only what was used before the system', () => {
  function seedUsage() {
    seedPatientWithPackage();
    fake.seed('package_pulse_usage', [
      { id: 'u-live', customer_package_id: 'cp-1', reservation_id: 'res-live', quantity_used: 1000, remaining_after: 7000, used_by: 'Nour' },
      { id: 'u-pre', customer_package_id: 'cp-1', reservation_id: null, quantity_used: 2000, remaining_after: 8000, used_by: 'Pre-launch usage' },
    ]);
  }

  it('a historical session of 500 pulses: pre-launch row = everything used (3500) minus the live booking (1000)', async () => {
    seedUsage();
    const res = await POST(req('POST', base({ packages: [existingPulses({ pulsesUsed: 500, pulsesRemaining: 6500 })] })));
    expect(res.status).toBe(200);

    const usage = rows('package_pulse_usage');
    const pre = usage.filter((u) => u.reservation_id == null && u.used_by === 'Pre-launch usage');
    expect(pre).toHaveLength(1);
    expect(pre[0]).toMatchObject({ quantity_used: 2500, remaining_after: 6500 });
    expect(usage.find((u) => u.id === 'u-live')).toMatchObject({ quantity_used: 1000 });
    const total = usage.reduce((s, u) => s + Number(u.quantity_used), 0);
    expect(total).toBe(rows('customer_packages').find((r) => r.id === 'cp-1').pulses_used); // rows add up to pulses_used
  });

  it('a session that used 0 pulses keeps the pre-launch row (it is not deleted)', async () => {
    seedUsage();
    const res = await POST(req('POST', base({ packages: [existingPulses({ pulsesUsed: 0, pulsesRemaining: 7000 })] })));
    expect(res.status).toBe(200);
    const pre = rows('package_pulse_usage').filter((u) => u.used_by === 'Pre-launch usage');
    expect(pre).toHaveLength(1);
    expect(pre[0].quantity_used).toBe(2000);
  });
});

describe('PATCH with packages', () => {
  async function createBooking(o: Record<string, any> = {}) {
    const res = await POST(req('POST', base({ invoiceValue: 1000, actualSpent: 1000, ...o })));
    expect(res.status).toBe(200);
    return (await res.json()).booking.id as string;
  }

  it('a package added while editing is created; sending the same edit again does not create a second', async () => {
    const id = await createBooking();
    as('superadmin');
    const edit = { id, invoiceValue: 7000, actualSpent: 1000, packages: [catalogPulses()] };

    const first = await PATCH(req('PATCH', edit));
    expect(first.status).toBe(200);
    let created = rows('customer_packages').filter((r) => r.package_id === 'pulses-5k');
    expect(created).toHaveLength(1);
    // Package-only booking with one new package: the entered invoice value is its price (DEC-088 item 6).
    expect(created[0]).toMatchObject({ price_pending: false, price_paid: 7000, purchased_at: `${DATE}T12:00:00Z` });

    const again = await PATCH(req('PATCH', edit));
    expect(again.status).toBe(200);
    created = rows('customer_packages').filter((r) => r.package_id === 'pulses-5k');
    expect(created).toHaveLength(1);
  });

  it('two packages and invoice 1000 → 1500: the patient is charged the 500 difference exactly once', async () => {
    const id = await createBooking();
    const customerId = rows('customers')[0].id;
    rows('customer_packages').push(
      { id: 'cp-a', customer_id: customerId, package_id: 'pulses-10k', package_type: 'pulses', total_pulses: 10000, pulses_used: 0, pulses_remaining: 10000, status: 'active' },
      { id: 'cp-b', customer_id: customerId, package_id: 'pulses-5k', package_type: 'pulses', total_pulses: 5000, pulses_used: 0, pulses_remaining: 5000, status: 'active' },
    );
    as('superadmin');
    const res = await PATCH(req('PATCH', {
      id, invoiceValue: 1500, actualSpent: 1000,
      packages: [
        existingPulses({ customerPackageId: 'cp-a', pulsesRemaining: 9500, pulsesUsed: 500 }),
        { ...catalogPulses(), customerPackageId: 'cp-b', source: 'existing', price: 0, pulsesUsed: 200, pulsesRemaining: 4800 },
      ],
    }));
    expect(res.status).toBe(200);
    const customer = rows('customers').find((c) => c.id === customerId);
    expect(Number(customer.outstanding)).toBe(500);
    expect(Number(customer.spent_amount)).toBe(1000);
    expect(rows('customer_packages').find((r) => r.id === 'cp-a')).toMatchObject({ pulses_remaining: 9500 });
    expect(rows('customer_packages').find((r) => r.id === 'cp-b')).toMatchObject({ pulses_remaining: 4800 });
  });

  it("another patient's package is rejected and the booking is left unchanged", async () => {
    const id = await createBooking();
    rows('customers').push({ id: 'c-x', name: 'X', mobile: '01077776666' });
    rows('customer_packages').push({ id: 'cp-x', customer_id: 'c-x', package_id: 'pulses-10k', package_type: 'pulses', total_pulses: 10000, pulses_used: 0, pulses_remaining: 10000, status: 'active' });
    const before = { ...rows('reservations').find((r) => r.id === id) };
    as('superadmin');

    const res = await PATCH(req('PATCH', { id, invoiceValue: 9000, actualSpent: 9000, packages: [existingPulses({ customerPackageId: 'cp-x' })] }));
    expect(res.status).toBe(400);
    const after = rows('reservations').find((r) => r.id === id);
    expect(after.amount_paid).toBe(before.amount_paid);
    expect(after.notes).toBe(before.notes);
    expect(rows('customer_packages').find((r) => r.id === 'cp-x')).toMatchObject({ pulses_remaining: 10000 });
  });
});
