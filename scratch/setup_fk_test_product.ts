import { config } from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
config({ path: path.resolve(__dirname, '..', '.env.local'), quiet: true });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', process.env.SUPABASE_SERVICE_ROLE_KEY ?? '', { auth: { persistSession: false } });

async function main() {
  const now = new Date().toISOString();
  const productId = `prod-fktest-${Date.now()}`;
  const { error: prodErr } = await supabase.from('inventory_products').insert({
    id: productId, name: 'ZZTEST_FKBlockedProduct', sku: 'ZZTEST-FK', category: 'General',
    price: 10, cost_price: 5, stock_quantity: 0, min_stock_alert: 5, unit: 'Piece',
    status: 'Active', role: 'retail', created_at: now, updated_at: now,
  });
  if (prodErr) throw prodErr;

  const { data: existingPurchase } = await supabase.from('purchases').select('supplier_id').limit(1).maybeSingle();
  const supplierId = existingPurchase?.supplier_id;

  const { data: purchase, error: purchErr } = await supabase.from('purchases').insert({
    supplier_id: supplierId, purchased_at: now, total: 50, paid: 50, due_date: now, is_opening: false,
  }).select('id').single();
  if (purchErr) throw purchErr;

  const { error: lineErr } = await supabase.from('purchase_lines').insert({
    purchase_id: purchase.id, product_id: productId, qty: 5, unit_cost: 10,
  });
  if (lineErr) throw lineErr;

  console.log('Created FK-blocked test product:', productId, 'purchase:', purchase.id);
}
main().catch((e) => { console.error(e); process.exit(1); });
