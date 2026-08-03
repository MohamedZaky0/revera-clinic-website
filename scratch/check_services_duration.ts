import { config } from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
config({ path: path.resolve(__dirname, '..', '.env.local'), quiet: true });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', process.env.SUPABASE_SERVICE_ROLE_KEY ?? '', { auth: { persistSession: false } });

async function main() {
  const { data: services, error } = await supabase
    .from('services')
    .select('id, en, duration, duration_minutes, price, branch_pricing')
    .order('id', { ascending: true });
  if (error) {
    console.error('Error fetching services:', error);
    return;
  }
  for (const s of services || []) {
    const bad = typeof s.duration_minutes !== 'number' || !Number.isFinite(s.duration_minutes) || s.duration_minutes <= 0 || s.duration_minutes > 1440;
    if (bad) {
      console.log(`SUSPECT id=${s.id} en=${s.en} duration_minutes=${s.duration_minutes} duration=${s.duration}`);
    }
  }
  console.log('Total services checked:', services?.length);
}
main();
