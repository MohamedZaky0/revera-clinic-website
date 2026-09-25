/**
 * DEC-086 / RISK-102: POST /api/reservations/previous now writes the ledger invoice + payment for a
 * historical booking (is_opening = true), so the ledger-derived customer figures agree with the
 * customer scalars the route already maintains. Mirrors scripts/backfill_historical_invoices.sql.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseFake } from '../helpers/supabaseFake';
import { computeLedgerBalances } from '@/lib/customerBalances';
import { mapPaymentMethod } from '@/lib/historicalInvoice';

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
const EMP_ID = 'emp-1';

function staffPost(body: any): Request {
  return new Request('http://localhost:3000/api/reservations/previous', {
    method: 'POST',
    headers: new Headers({ 'content-type': 'application/json', Authorization: 'Bearer staff-token' }),
    body: JSON.stringify(body),
  });
}

function body(overrides: Record<string, any> = {}) {
  return { patientPhone: '01012345678', patientName: 'Amira Test', date: '2026-05-11', ...overrides };
}

const rows = (t: string) => (fake.db[t] || []) as any[];

beforeEach(() => {
  fake.reset();
  for (const t of [
    'reservations', 'customers', 'providers', 'products', 'packages', 'package_items', 'reservation_products',
    'product_sales', 'customer_packages', 'customer_package_items', 'wallet_txns', 'transactions',
    'invoices', 'invoice_lines', 'payments',
  ]) {
    fake.seed(t, []);
  }
  fake.authGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
  fake.seed('employee_accounts', [{ id: EMP_ID, auth_user_id: USER_ID, role_name: 'reception', name: 'Nour', email: 'n@test.com' }]);
  fake.seed('roles', [{ name: 'reception', permissions: [] }]);
  fake.seed('services', [{ id: 15, en: 'Laser Face', ar: 'ليزر وجه', price: 1200 }]);
  fake.seed('packages', [{ id: 'pkg-1', name: 'Laser 6 Sessions', price: 3000, validity_days: 365 }]);
  let txnSeq = 1;
  let invSeq = 100;
  fake.setRpc('next_transaction_seq', () => ({ data: txnSeq++, error: null }));
  fake.setRpc('next_invoice_no', () => ({ data: invSeq++, error: null }));
});

describe('historical booking writes its ledger invoice', () => {
  it('paid in full: one opening invoice + line + payment, dated to the booking, no extra transaction', async () => {
    const res = await POST(staffPost(body({ serviceId: 15, invoiceValue: 1200, actualSpent: 1200, paymentType: 'Visa' })));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ledger.status).toBe('created');

    expect(rows('invoices')).toHaveLength(1);
    const inv = rows('invoices')[0];
    expect(inv).toMatchObject({ status: 'issued', is_opening: true, grand_total: 1200, subtotal: 1200, discount_total: 0 });
    expect(inv.invoice_no).toBe('INV-000100');
    expect(inv.issued_at).toBe('2026-05-11T12:00:00Z');
    expect(inv.reservation_id).toBe(json.booking.id);

    expect(rows('invoice_lines')).toHaveLength(1);
    expect(rows('invoice_lines')[0]).toMatchObject({ line_type: 'service', service_id: 15, line_total: 1200 });
    expect(rows('invoice_lines')[0].description).toBe('Laser Face [historical backfill]');

    expect(rows('payments')).toHaveLength(1);
    expect(rows('payments')[0]).toMatchObject({ amount: 1200, method: 'card', is_opening: true, received_by_employee_id: EMP_ID });

    // The cash side is already recorded in `transactions` by the route — exactly one, not two.
    expect(rows('transactions').filter((t) => t.type === 'payment')).toHaveLength(1);
  });

  it('part-paid package: invoice is the full value, payment the paid part; ledger outstanding equals the customer scalar', async () => {
    const res = await POST(staffPost(body({ packageId: 'pkg-1', invoiceValue: 3000, actualSpent: 1000, paymentType: 'cash' })));
    const json = await res.json();
    expect(json.ledger.status).toBe('created');
    expect(rows('invoice_lines')[0]).toMatchObject({ line_type: 'package', service_id: null, line_total: 3000 });
    expect(rows('payments')[0].amount).toBe(1000);

    const customer = rows('customers')[0];
    const ledger = computeLedgerBalances(
      rows('invoices').map((i) => ({ id: i.id, grandTotal: i.grand_total, status: i.status })),
      rows('payments').map((p) => ({ invoiceId: p.invoice_id, amount: p.amount })),
      []
    );
    expect(ledger.spent).toBe(customer.spent_amount);
    expect(ledger.outstanding).toBe(customer.outstanding);
    expect(ledger.outstanding).toBe(2000);
  });

  it('zero value and zero paid: nothing is written', async () => {
    const res = await POST(staffPost(body({ serviceId: 15 })));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ledger).toEqual({ status: 'skipped', reason: 'zero_total' });
    expect(rows('invoices')).toHaveLength(0);
    expect(rows('payments')).toHaveLength(0);
  });

  it('no invoice value entered: the total falls back to what was paid', async () => {
    await POST(staffPost(body({ serviceId: 15, actualSpent: 800 })));
    expect(rows('invoices')[0].grand_total).toBe(800);
    expect(rows('payments')[0].amount).toBe(800);
  });

  it('overpaid product: invoice = value, payment = paid, ledger shows credit not debt', async () => {
    await POST(staffPost(body({ productName: 'Serum', invoiceValue: 500, actualSpent: 800, paymentType: 'Instapay' })));
    expect(rows('invoices')[0].grand_total).toBe(500);
    expect(rows('invoice_lines')[0]).toMatchObject({ line_type: 'product', service_id: null });
    expect(rows('payments')[0]).toMatchObject({ amount: 800, method: 'instapay' });
    const ledger = computeLedgerBalances(
      rows('invoices').map((i) => ({ id: i.id, grandTotal: i.grand_total, status: i.status })),
      rows('payments').map((p) => ({ invoiceId: p.invoice_id, amount: p.amount })),
      []
    );
    expect(ledger.outstanding).toBe(0);
  });

  it('unpaid balance only (value entered, nothing paid): invoice written, no payment row', async () => {
    await POST(staffPost(body({ serviceId: 15, invoiceValue: 700 })));
    expect(rows('invoices')[0].grand_total).toBe(700);
    expect(rows('payments')).toHaveLength(0);
  });

  it('a failure writing the invoice does not fail the booking and is reported, leaving no orphan invoice', async () => {
    fake.setRpc('next_invoice_no', () => ({ data: null, error: { message: 'sequence unavailable' } }));
    const res = await POST(staffPost(body({ serviceId: 15, invoiceValue: 1200, actualSpent: 1200 })));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.ledger.status).toBe('failed');
    expect(json.ledger.error).toContain('sequence unavailable');
    expect(rows('reservations')).toHaveLength(1);
    expect(rows('invoices')).toHaveLength(0);
    expect(rows('payments')).toHaveLength(0);
  });
});

describe('mapPaymentMethod stays inside the payments.method CHECK set', () => {
  it.each([
    ['Visa', 'card'],
    ['mastercard', 'card'],
    ['InstaPay', 'instapay'],
    ['Wallet', 'wallet'],
    ['bank transfer', 'transfer'],
    ['Vodafone Cash', 'cash'],
    ['something odd', 'cash'],
    [null, 'cash'],
  ])('%s -> %s', (input, expected) => {
    expect(mapPaymentMethod(input as any)).toBe(expected);
  });
});
