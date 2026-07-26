import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(__dirname, '..', '.env.local'), quiet: true });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const email = process.env.LOGIN_EMAIL ?? '';
const password = process.env.LOGIN_PASSWORD ?? '';

if (!supabaseUrl || !anonKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}
if (!email || !password) {
  console.error('Set LOGIN_EMAIL and LOGIN_PASSWORD env vars for this run (not stored anywhere).');
  process.exit(1);
}

async function main() {
  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error('Sign-in failed:', data);
    process.exit(1);
  }
  // Only the token is printed — never the password.
  console.log(data.access_token);
}

main();
