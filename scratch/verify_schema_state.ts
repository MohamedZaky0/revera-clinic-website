import { config } from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
config({ path: path.resolve(__dirname, '..', '.env.local'), quiet: true });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', process.env.SUPABASE_SERVICE_ROLE_KEY ?? '', { auth: { persistSession: false } });

async function main() {
  // Check reservations.follow_up_date exists, and whether no_show/postponed are accepted.
  const { error: colErr } = await supabase.from('reservations').select('follow_up_date').limit(1);
  console.log('follow_up_date column query error (null = column exists):', colErr?.message ?? null);

  // Try a real constraint probe: attempt to select a row and just check the CHECK constraint
  // definition via information_schema through a raw query isn't available via supabase-js
  // directly, so instead check pg_constraint via a Postgres function isn't available either.
  // Fallback: attempt a dry insert/rollback is risky - instead just check for any existing rows
  // with these statuses (if any exist, the constraint must already allow them).
  const { data: statusRows, error: statusErr } = await supabase
    .from('reservations')
    .select('id, status')
    .in('status', ['no_show', 'postponed'])
    .limit(5);
  console.log('rows with no_show/postponed status:', statusRows, statusErr?.message ?? null);

  // Check providers.service_commissions column existence.
  const { error: provErr } = await supabase.from('providers').select('service_commissions').limit(1);
  console.log('providers.service_commissions column query error (null = exists):', provErr?.message ?? null);
}
main();
