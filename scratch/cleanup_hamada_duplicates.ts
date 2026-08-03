import { config } from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
config({ path: path.resolve(__dirname, '..', '.env.local'), quiet: true });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', process.env.SUPABASE_SERVICE_ROLE_KEY ?? '', { auth: { persistSession: false } });

// Relinks the two reservations created against trailing-space-duplicate "Hamada" customers
// back to the correct canonical customer record, then deletes the now-orphaned duplicates.
// Confirmed via scratch/check_hamada_package.ts before running this.

const RELINKS = [
  { reservationId: '962bfb01-63d3-4042-a6be-50722f94e13a', correctCustomerId: '88851926-3c8b-4b79-b47f-0296c26ae935', label: 'Hamada Patient booking -> correct Hamada Patient (owns the package)' },
  { reservationId: 'd3b27099-4a11-4789-99d7-3e3682b397aa', correctCustomerId: 'd77f209d-791c-4218-9375-b9da9b2af25b', label: 'Hamada Meeting booking -> correct Hamada Meeting (owns packages)' },
];

const DUPLICATE_CUSTOMER_IDS = [
  '94d1cd05-aada-4bac-8b53-3de9fa67cd3b', // Hamada Patient, "01231456123 " (trailing space)
  '6f27a983-5607-40c8-9256-e9aa8c73c6de', // Hamada Meeting, "01234567890 " (trailing space)
];

async function main() {
  for (const r of RELINKS) {
    const { data, error } = await supabase
      .from('reservations')
      .update({ customer_id: r.correctCustomerId })
      .eq('id', r.reservationId)
      .select('id, customer_id');
    console.log(`Relink: ${r.label}`, JSON.stringify(data), error ? `ERROR: ${error.message}` : 'OK');
  }

  for (const id of DUPLICATE_CUSTOMER_IDS) {
    // Safety: confirm zero reservations still reference this customer before deleting.
    const { data: remaining, error: checkErr } = await supabase
      .from('reservations')
      .select('id')
      .eq('customer_id', id);
    if (checkErr) {
      console.error(`Check error for ${id}:`, checkErr.message);
      continue;
    }
    if (remaining && remaining.length > 0) {
      console.log(`SKIP delete ${id} — still referenced by ${remaining.length} reservation(s)`);
      continue;
    }
    const { error: delErr } = await supabase.from('customers').delete().eq('id', id);
    console.log(`Delete duplicate customer ${id}:`, delErr ? `ERROR: ${delErr.message}` : 'OK');
  }
}
main();
