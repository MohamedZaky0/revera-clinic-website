/**
 * Route-level tests for POST /api/inventory/products/sales — selling a retail product to a patient.
 *
 * Written alongside the RISK-076 product-sale fixes. The defect that mattered most: every product
 * guard in this route was written as `if (productForStockCheck && ...)`, so a `product_id` matching
 * no row skipped the deleted-product check, the consumable check and the stock check all at once.
 * `product_sales.product_id` is plain text with no foreign key, so the row inserted cleanly and
 * produced real revenue and a real invoice against a product that does not exist — and the admin UI
 * reached exactly that path by fabricating `prod-<timestamp>` whenever no product was picked.
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

import { POST } from '@/app/api/inventory/products/sales/route';

const CUSTOMER_ID = 'cust-1';
const PRODUCT_ID = 'prod-real';
const EMP_ID = 'emp-1';
const USER_ID = 'user-1';

function saleReq(body: any, withAuth = true): Request {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (withAuth) headers.set('Authorization', 'Bearer staff-token');
  return new Request('http://localhost:3000/api/inventory/products/sales', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

function baseSale(overrides: Record<string, any> = {}) {
  return {
    product_id: PRODUCT_ID,
    product_name: 'Sunscreen SPF 50',
    customer_id: CUSTOMER_ID,
    customer_name: 'Test Patient',
    customer_mobile: '01000000000',
    quantity: 2,
    unit_price: 100,
    total_amount: 200,
    sold_by: 'reception@test.com',
    ...overrides,
  };
}

let txnSeq = 1001;
let invSeq = 1;

beforeEach(() => {
  fake.reset();
  txnSeq = 1001;
  invSeq = 1;
  fake.setRpc('next_transaction_seq', () => ({ data: txnSeq++, error: null }));
  fake.setRpc('next_invoice_no', () => ({ data: invSeq++, error: null }));

  fake.authGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
  for (const t of [
    'product_sales', 'inventory_products', 'customers', 'employee_accounts', 'roles',
    'invoices', 'invoice_lines', 'payments', 'page_settings', 'stock_movements', 'transactions',
    'customer_product_balances', 'wallet_txns', 'branches',
  ]) {
    fake.seed(t, []);
  }
  fake.seed('employee_accounts', [{ id: EMP_ID, auth_user_id: USER_ID, role_name: 'reception', email: 'r@test.com' }]);
  fake.seed('roles', [{ name: 'reception', permissions: [] }]);
  fake.seed('customers', [{ id: CUSTOMER_ID, name: 'Test Patient', wallet_balance: 0, spent_amount: 0, outstanding: 0 }]);
  fake.seed('inventory_products', [
    { id: PRODUCT_ID, name: 'Sunscreen SPF 50', role: 'retail', stock_quantity: 10, cost_price: 40, deleted_at: null },
  ]);
});

describe('product existence (RISK-076)', () => {
  it('rejects a product_id that matches nothing, instead of selling a phantom product', async () => {
    const res = await POST(saleReq(baseSale({ product_id: 'prod-1756000000000' })));
    expect(res.status).toBe(404);
    // Nothing financial may be written for a product that does not exist.
    expect(fake.rows('product_sales')).toHaveLength(0);
    expect(fake.rows('invoices')).toHaveLength(0);
    expect(fake.rows('payments')).toHaveLength(0);
  });

  it('still rejects a soft-deleted product', async () => {
    fake.seed('inventory_products', [
      { id: PRODUCT_ID, name: 'Old', role: 'retail', stock_quantity: 10, deleted_at: '2026-01-01' },
    ]);
    const res = await POST(saleReq(baseSale()));
    expect(res.status).toBe(410);
  });

  it('still refuses to sell a consumable to a patient', async () => {
    fake.seed('inventory_products', [
      { id: PRODUCT_ID, name: 'Gel', role: 'consumable', stock_quantity: 10, deleted_at: null },
    ]);
    const res = await POST(saleReq(baseSale()));
    expect(res.status).toBe(400);
  });

  it('still refuses to oversell beyond stock on hand', async () => {
    fake.seed('inventory_products', [
      { id: PRODUCT_ID, name: 'Sunscreen SPF 50', role: 'retail', stock_quantity: 1, deleted_at: null },
    ]);
    const res = await POST(saleReq(baseSale({ quantity: 5 })));
    expect(res.status).toBe(409);
  });

  it('rejects an unknown customer', async () => {
    const res = await POST(saleReq(baseSale({ customer_id: 'nobody' })));
    expect(res.status).toBe(404);
  });
});

describe('a valid sale', () => {
  it('records the sale, an invoice, a payment and the customer history rows', async () => {
    const res = await POST(saleReq(baseSale()));
    expect(res.status).toBe(200);

    expect(fake.rows('product_sales')).toHaveLength(1);
    expect(fake.rows('invoices')).toHaveLength(1);
    expect(fake.rows('payments')[0].amount).toBe(200);

    const txns = fake.rows('transactions');
    expect(txns.find((t) => t.type === 'product_purchase')!.amount).toBe(200);
    expect(txns.find((t) => t.type === 'payment')!.amount).toBe(200);
  });

  it('deducts the sold quantity from stock', async () => {
    await POST(saleReq(baseSale({ quantity: 3 })));
    expect(fake.rows('inventory_products')[0].stock_quantity).toBe(7);
  });
});

describe('track_balance — one call does the sale and the patient balance (RISK-076)', () => {
  it('writes the patient product balance when asked', async () => {
    const res = await POST(saleReq(baseSale({ track_balance: true })));
    expect(res.status).toBe(200);

    const balances = fake.rows('customer_product_balances');
    expect(balances).toHaveLength(1);
    expect(balances[0]).toMatchObject({
      customer_id: CUSTOMER_ID,
      product_id: PRODUCT_ID,
      purchased_quantity: 2,
      remaining_quantity: 2,
    });
  });

  it('does not write a balance when not asked — other callers are unaffected', async () => {
    await POST(saleReq(baseSale()));
    expect(fake.rows('customer_product_balances')).toHaveLength(0);
  });

  it('a rejected sale writes no balance — money and tracking cannot diverge', async () => {
    const res = await POST(saleReq(baseSale({ product_id: 'ghost', track_balance: true })));
    expect(res.status).toBe(404);
    expect(fake.rows('customer_product_balances')).toHaveLength(0);
  });
});
