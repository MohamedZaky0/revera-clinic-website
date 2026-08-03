import { config } from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
config({ path: path.resolve(__dirname, '..', '.env.local'), quiet: true });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', process.env.SUPABASE_SERVICE_ROLE_KEY ?? '', { auth: { persistSession: false } });

async function main() {
  const { data: services, error } = await supabase
    .from('services')
    .select('id, en, branch_pricing')
    .order('id', { ascending: true });
  if (error) {
    console.error('Error fetching services:', error);
    return;
  }
  console.log(`Total services: ${services?.length}`);
  const withPromo = (services || []).filter((s: any) =>
    Array.isArray(s.branch_pricing) && s.branch_pricing.some((bp: any) => bp.promotion)
  );
  console.log(`Services with a promotion object in branch_pricing: ${withPromo.length}`);
  console.log(JSON.stringify(withPromo, null, 2));
}
main();
