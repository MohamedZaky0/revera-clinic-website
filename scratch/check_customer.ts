import { config } from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
config({ path: path.resolve(__dirname, '..', '.env.local'), quiet: true });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', process.env.SUPABASE_SERVICE_ROLE_KEY ?? '', { auth: { persistSession: false } });

async function main() {
  const { data: customers, error: custErr } = await supabase
    .from('customers')
    .select('*')
    .or('mobile.eq.01234567890,email.eq.12842184712@gmail.com,name.ilike.%Botox%');
  console.log('=== customers matching phone/email/name ===');
  console.log(JSON.stringify(customers, null, 2));
  if (custErr) console.error('customers error:', custErr);

  const { data: reservations, error: resErr } = await supabase
    .from('reservations')
    .select('id, name, email, phone, customer_id, status, service_id, date')
    .or('phone.eq.01234567890,email.eq.12842184712@gmail.com')
    .order('created_at', { ascending: false })
    .limit(5);
  console.log('=== reservations matching phone/email ===');
  console.log(JSON.stringify(reservations, null, 2));
  if (resErr) console.error('reservations error:', resErr);
}
main();
