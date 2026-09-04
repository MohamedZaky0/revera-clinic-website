import { config } from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: path.resolve(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const siteUrl = process.env.INVITE_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

const TARGET_EMAIL = 'mohamed.zaky.anwar@gmail.com';

async function main() {
  // The user already exists in auth.users (unconfirmed, from inviteUserByEmail) — type: 'invite'
  // would error "user already registered" for an existing user. 'magiclink' works for an existing,
  // unconfirmed user: clicking it establishes a session directly (confirming the email as a side
  // effect) and lands on the same /auth/setup redirect the original invite flow used, so the
  // "set your password" step is unchanged from the normal product flow.
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: TARGET_EMAIL,
    options: {
      redirectTo: `${siteUrl}/auth/callback?next=/auth/setup`,
    },
  });

  if (error) {
    console.error('generateLink error:', error.message);
    process.exit(1);
  }

  console.log('Direct link (no email involved) — open this in your browser:');
  console.log(data.properties?.action_link);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
