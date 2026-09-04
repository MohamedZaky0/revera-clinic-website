import { config } from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
config({ path: path.resolve(__dirname, '..', '.env.local'), quiet: true });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', process.env.SUPABASE_SERVICE_ROLE_KEY ?? '', { auth: { persistSession: false } });
async function main() {
  for (const table of ['expense_categories', 'expenses', 'recurring_expenses', 'fixed_assets', 'depreciation_entries', 'loans', 'loan_schedule']) {
    const { data } = await supabase.from(table).select('*');
    console.log(table, '-> remaining rows:', data?.length);
  }
}
main();
