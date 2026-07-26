import { config } from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: path.resolve(__dirname, '..', '.env.local'), quiet: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  { auth: { persistSession: false } }
);

async function main() {
  const tables: Array<[string, string, number]> = [
    ['customers', 'id, name, email, phone, outstanding, spent_amount, wallet_balance', 5],
    ['services', 'id, en, price, branch_pricing, duration_minutes', 5],
    ['branches', 'id, name_en', 10],
    ['providers', 'id, name, commission_type, commission_value, commission_base, commission_fixed_component, branch_id', 5],
    ['reservations', 'id, status, customer_id, service_id, service_ids, provider_id, amount_paid, amount_left, date', 5],
    ['inventory_products', 'id, name, role, cost_price, price, stock_quantity', 8],
    ['inventory_devices', 'id, name, lamp_replacement_cost, max_pulses_limit', 5],
    ['service_consumables', 'service_id, product_id, standard_qty', 10],
    ['service_devices', 'service_id, device_id, pulses_per_session', 10],
    ['packages', 'id, name, branch_id, price, tax_rate, validity_days, active', 5],
    ['package_items', 'package_id, service_id, qty', 10],
    ['customer_packages', 'id, customer_id, package_id, status, expires_at, price_paid', 5],
    ['customer_package_items', 'id, customer_package_id, service_id, qty_total, qty_used, qty_remaining', 5],
    ['suppliers', 'id, name', 5],
    ['invoices', 'id, invoice_no, reservation_id, customer_id, grand_total, status', 5],
    ['employee_accounts', 'id, name, email, role_name', 5],
  ];

  for (const [table, cols, limit] of tables) {
    const { data, error } = await supabase.from(table).select(cols).limit(limit);
    console.log(`\n=== ${table} ===`);
    if (error) console.error('ERROR:', error.message);
    else console.log(JSON.stringify(data, null, 2));
  }
}

main();
