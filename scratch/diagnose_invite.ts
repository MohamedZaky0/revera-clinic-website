import { config } from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: path.resolve(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

const TARGET_EMAIL = 'mohamed.zaky.anwar@gmail.com';

async function main() {
  console.log('--- roles table: does "superadmin" exist? ---');
  const { data: roles, error: rolesErr } = await supabase.from('roles').select('name, permissions');
  if (rolesErr) console.error('roles query error:', rolesErr.message);
  else console.log(roles);

  console.log('\n--- employee_accounts row for target email ---');
  const { data: emp, error: empErr } = await supabase
    .from('employee_accounts')
    .select('*')
    .eq('email', TARGET_EMAIL)
    .maybeSingle();
  if (empErr) console.error('employee_accounts query error:', empErr.message);
  else console.log(emp);

  console.log('\n--- customers row for target email (would block invite) ---');
  const { data: cust, error: custErr } = await supabase
    .from('customers')
    .select('id, email')
    .eq('email', TARGET_EMAIL)
    .maybeSingle();
  if (custErr) console.error('customers query error:', custErr.message);
  else console.log(cust);

  console.log('\n--- Supabase Auth user for target email ---');
  const { data: authList, error: authErr } = await supabase.auth.admin.listUsers();
  if (authErr) {
    console.error('listUsers error:', authErr.message);
  } else {
    const match = authList.users.find((u: any) => (u.email || '').toLowerCase() === TARGET_EMAIL.toLowerCase());
    if (match) {
      console.log({
        id: match.id,
        email: match.email,
        invited_at: (match as any).invited_at,
        confirmed_at: match.confirmed_at,
        email_confirmed_at: (match as any).email_confirmed_at,
        last_sign_in_at: match.last_sign_in_at,
        created_at: match.created_at,
        app_metadata: match.app_metadata,
        user_metadata: match.user_metadata,
      });
    } else {
      console.log('No Supabase Auth user found for this email at all.');
    }
  }
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
