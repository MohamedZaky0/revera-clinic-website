import { config } from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
config({ path: path.resolve(__dirname, '..', '.env.local'), quiet: true });

const BASE_URL = 'http://localhost:3000';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const serviceRole = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY ?? '', { auth: { persistSession: false } });

const SUPERADMIN_EMAIL = 'saif@superadmin.com';
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD ?? '';

async function getSuperadminToken(): Promise<string> {
  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: SUPERADMIN_EMAIL, password: SUPERADMIN_PASSWORD }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error('Superadmin sign-in failed: ' + JSON.stringify(data));
  return data.access_token;
}

async function main() {
  if (!SUPERADMIN_PASSWORD) {
    console.error('Set SUPERADMIN_PASSWORD env var.');
    process.exit(1);
  }
  const token = await getSuperadminToken();

  // Create a throwaway product with real stock, then soft-delete it.
  const createRes = await fetch(`${BASE_URL}/api/inventory/products`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'ZZTEST_FinanceGuard', purchase_price: 10, selling_price: 20, stock_quantity: 5, role: 'retail' }),
  });
  const product = await createRes.json();
  console.log('Created product:', product.id);

  const delRes = await fetch(`${BASE_URL}/api/inventory/products?id=${product.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('Soft-delete result:', await delRes.json());

  // Try to sell the soft-deleted product.
  const { data: anyCustomer } = await serviceRole.from('customers').select('id').limit(1).maybeSingle();
  const saleRes = await fetch(`${BASE_URL}/api/inventory/products/sales`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      product_id: product.id, product_name: 'ZZTEST_FinanceGuard', customer_id: anyCustomer?.id,
      customer_name: 'Test', customer_mobile: '0100000000', quantity: 1, unit_price: 20, total_amount: 20,
    }),
  });
  console.log('Sell attempt on deleted product — status:', saleRes.status, 'body:', await saleRes.json());

  // Try to restock (purchase) the soft-deleted product.
  const purchaseRes = await fetch(`${BASE_URL}/api/purchases`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ lines: [{ productId: product.id, qty: 5, unitCost: 10 }], paid: 0 }),
  });
  console.log('Purchase attempt on deleted product — status:', purchaseRes.status, 'body:', await purchaseRes.json());

  // Confirm stock_quantity never moved (still 5) despite both attempts.
  const { data: finalRow } = await serviceRole.from('inventory_products').select('stock_quantity, deleted_at').eq('id', product.id).maybeSingle();
  console.log('Final stock_quantity (should still be 5, deleted_at still set):', finalRow);

  // Cleanup.
  await serviceRole.from('inventory_products').delete().eq('id', product.id);
  const { data: ps } = await serviceRole.from('page_settings').select('value').eq('key', 'inventory_products').maybeSingle();
  if (ps?.value?.products) {
    const cleaned = ps.value.products.filter((p: any) => p.id !== product.id);
    await serviceRole.from('page_settings').update({ value: { products: cleaned } }).eq('key', 'inventory_products');
  }
  console.log('Cleaned up.');
}

main().catch((err) => { console.error('Test failed:', err); process.exit(1); });
