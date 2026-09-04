import { config } from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
config({ path: path.resolve(__dirname, '..', '.env.local'), quiet: true });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', process.env.SUPABASE_SERVICE_ROLE_KEY ?? '', { auth: { persistSession: false } });

async function main() {
  const { data: customers, error: custErr } = await supabase
    .from('customers')
    .select('*')
    .or('mobile.eq.01231456123,name.ilike.%Hamada%');
  console.log('=== customers matching phone/name ===');
  console.log(JSON.stringify(customers, null, 2));
  if (custErr) console.error('customers error:', custErr);

  const { data: reservations, error: resErr } = await supabase
    .from('reservations')
    .select('id, name, phone, customer_id, status, service_id, service_ids, amount_paid, amount_left, branch_id, created_at')
    .or('phone.eq.01231456123,name.ilike.%Hamada%')
    .order('created_at', { ascending: false })
    .limit(10);
  console.log('=== reservations matching phone/name ===');
  console.log(JSON.stringify(reservations, null, 2));
  if (resErr) console.error('reservations error:', resErr);

  const customerIds = (customers || []).map((c: any) => c.id);
  if (customerIds.length > 0) {
    const { data: custPkgs, error: cpErr } = await supabase
      .from('customer_packages')
      .select('id, customer_id, package_id, status, purchased_at, expires_at, price_paid, packages(name)')
      .in('customer_id', customerIds);
    console.log('=== customer_packages for matched customers ===');
    console.log(JSON.stringify(custPkgs, null, 2));
    if (cpErr) console.error('customer_packages error:', cpErr);

    const cpIds = (custPkgs || []).map((cp: any) => cp.id);
    if (cpIds.length > 0) {
      const { data: cpItems, error: cpiErr } = await supabase
        .from('customer_package_items')
        .select('id, customer_package_id, service_id, qty_total, qty_used, qty_remaining')
        .in('customer_package_id', cpIds);
      console.log('=== customer_package_items ===');
      console.log(JSON.stringify(cpItems, null, 2));
      if (cpiErr) console.error('customer_package_items error:', cpiErr);
    }
  }
}
main();
