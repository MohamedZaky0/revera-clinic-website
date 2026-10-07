/**
 * Multi-product support in previous/historical bookings (POST/PATCH /api/reservations/previous).
 * Verifies:
 *  - Multiple products recorded in reservation_products and product_sales
 *  - Invoice totals and ledger description include multiple products
 *  - Edit mode (PATCH) support for updating products
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

const USER_ID = 'staff-user';
const EMP_ID = 'emp-1';

function staffReq(method: 'POST' | 'PATCH', body: any): Request {
  return new Request('http://localhost:3000/api/reservations/previous', {
    method,
    headers: new Headers({ 'content-type': 'application/json', Authorization: 'Bearer staff-token' }),
    body: JSON.stringify(body),
  });
}

function baseBody(overrides: Record<string, any> = {}) {
  return { patientPhone: '01012345678', patientName: 'Amira Test', date: '2026-05-11', ...overrides };
}

const rows = (t: string) => (fake.db[t] || []) as any[];

beforeEach(() => {
  fake.reset();
  for (const t of [
    'reservations', 'customers', 'providers', 'products', 'packages', 'package_items', 'reservation_products',
    'product_sales', 'customer_packages', 'customer_package_items', 'wallet_txns', 'transactions',
    'transaction_audit_logs', 'invoices', 'invoice_lines', 'payments',
  ]) {
    fake.seed(t, []);
  }
  fake.authGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
  fake.seed('employee_accounts', [{ id: EMP_ID, auth_user_id: USER_ID, role_name: 'reception', name: 'Nour', email: 'n@test.com' }]);
  fake.seed('roles', [{ name: 'reception', permissions: [] }]);
  fake.seed('services', [{ id: 15, en: 'Laser Face', ar: '???? ???', price: 1200 }]);
  fake.seed('products', [
    { id: 'prod-1', name: 'Hydrating Cleanser', selling_price: 350, price: 350 },
    { id: 'prod-2', name: 'SPF 50 Sunscreen', selling_price: 450, price: 450 },
    { id: 'prod-3', name: 'Vitamin C Serum', selling_price: 600, price: 600 },
  ]);
  let txnSeq = 1;
  let invSeq = 100;
  fake.setRpc('next_transaction_seq', () => ({ data: txnSeq++, error: null }));
  fake.setRpc('next_invoice_no', () => ({ data: invSeq++, error: null }));
});

describe('POST /api/reservations/previous with multiple products', () => {
  it('creates reservation with multiple products attached to reservation_products and product_sales', async () => {
    const res = await POST(
      staffReq(
        'POST',
        baseBody({
          serviceId: 15,
          products: [
            { id: 'prod-1', name: 'Hydrating Cleanser', price: 350 },
            { id: 'prod-2', name: 'SPF 50 Sunscreen', price: 450 },
          ],
          invoiceValue: 2000,
          actualSpent: 2000,
          paymentType: 'Cash',
        })
      )
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);

    // Verify reservation created
    const booking = rows('reservations')[0];
    expect(booking).toBeDefined();
    expect(booking.notes).toContain('Products: Hydrating Cleanser, SPF 50 Sunscreen');

    // Verify reservation_products has service + 2 products
    const resProducts = rows('reservation_products');
    expect(resProducts).toHaveLength(3); // 1 service + 2 products
    const prodLines = resProducts.filter((rp) => rp.line_type === 'product');
    expect(prodLines).toHaveLength(2);
    expect(prodLines[0]).toMatchObject({ product_id: 'prod-1', description: 'Hydrating Cleanser', total: 350 });
    expect(prodLines[1]).toMatchObject({ product_id: 'prod-2', description: 'SPF 50 Sunscreen', total: 450 });

    // Verify product_sales entries
    const sales = rows('product_sales');
    expect(sales).toHaveLength(2);
    expect(sales[0]).toMatchObject({ product_id: 'prod-1', product_name: 'Hydrating Cleanser', total_price: 350 });
    expect(sales[1]).toMatchObject({ product_id: 'prod-2', product_name: 'SPF 50 Sunscreen', total_price: 450 });

    // Verify transaction description
    const txns = rows('transactions');
    expect(txns).toHaveLength(1);
    expect(txns[0].description).toContain('Products: Hydrating Cleanser, SPF 50 Sunscreen');

    // Verify ledger invoice
    const invLines = rows('invoice_lines');
    expect(invLines).toHaveLength(1);
    expect(invLines[0].description).toContain('Products: Hydrating Cleanser, SPF 50 Sunscreen');
  });

  it('handles product IDs only by auto-resolving prices and names from database', async () => {
    const res = await POST(
      staffReq(
        'POST',
        baseBody({
          productIds: ['prod-2', 'prod-3'],
          invoiceValue: 1050,
          actualSpent: 1050,
          paymentType: 'Visa',
        })
      )
    );

    expect(res.status).toBe(200);
    const prodLines = rows('reservation_products').filter((rp) => rp.line_type === 'product');
    expect(prodLines).toHaveLength(2);
    expect(prodLines[0]).toMatchObject({ product_id: 'prod-2', description: 'SPF 50 Sunscreen', unit_price: 450 });
    expect(prodLines[1]).toMatchObject({ product_id: 'prod-3', description: 'Vitamin C Serum', unit_price: 600 });
  });

  it('maintains backward compatibility with legacy single productId and productName', async () => {
    const res = await POST(
      staffReq(
        'POST',
        baseBody({
          productId: 'prod-1',
          productName: 'Hydrating Cleanser',
          invoiceValue: 350,
          actualSpent: 350,
        })
      )
    );

    expect(res.status).toBe(200);
    const prodLines = rows('reservation_products').filter((rp) => rp.line_type === 'product');
    expect(prodLines).toHaveLength(1);
    expect(prodLines[0]).toMatchObject({ product_id: 'prod-1', description: 'Hydrating Cleanser', unit_price: 350 });
    expect(rows('reservations')[0].notes).toContain('Product: Hydrating Cleanser');
  });
});

describe('PATCH /api/reservations/previous with multiple products', () => {
  it('updates historical booking with multiple products as superadmin', async () => {
    // 1. Create booking first
    const createRes = await POST(
      staffReq(
        'POST',
        baseBody({
          serviceId: 15,
          products: [{ id: 'prod-1', name: 'Hydrating Cleanser', price: 350 }],
          invoiceValue: 1550,
          actualSpent: 1550,
        })
      )
    );
    const { booking } = await createRes.json();

    // 2. Switch to superadmin role
    fake.seed('employee_accounts', [{ id: EMP_ID, auth_user_id: USER_ID, role_name: 'superadmin', name: 'Admin', email: 'admin@revera.com' }]);
    fake.seed('roles', [{ name: 'superadmin', permissions: ['all'] }]);

    // 3. Update with multiple products
    const patchRes = await PATCH(
      staffReq(
        'PATCH',
        {
          id: booking.id,
          patientPhone: '01012345678',
          patientName: 'Amira Test',
          date: '2026-05-11',
          serviceId: 15,
          products: [
            { id: 'prod-1', name: 'Hydrating Cleanser', price: 350 },
            { id: 'prod-2', name: 'SPF 50 Sunscreen', price: 450 },
            { id: 'prod-3', name: 'Vitamin C Serum', price: 600 },
          ],
          invoiceValue: 2600,
          actualSpent: 2600,
          paymentType: 'InstaPay',
        }
      )
    );

    expect(patchRes.status).toBe(200);
    const patchJson = await patchRes.json();
    expect(patchJson.success).toBe(true);

    const updated = rows('reservations').find((r) => r.id === booking.id);
    expect(updated.notes).toContain('Products: Hydrating Cleanser, SPF 50 Sunscreen, Vitamin C Serum');
  });
});
