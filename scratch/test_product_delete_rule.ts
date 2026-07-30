import { config } from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
config({ path: path.resolve(__dirname, '..', '.env.local'), quiet: true });

const BASE_URL = 'http://localhost:3000';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const serviceRole = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY ?? '', { auth: { persistSession: false } });
const anonClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });

const SUPERADMIN_EMAIL = 'saif@superadmin.com';
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD ?? '';
const ADMIN_EMAIL = 'saifuldeennaser@gmail.com';

async function getSuperadminToken(): Promise<string> {
  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: SUPERADMIN_EMAIL, password: SUPERADMIN_PASSWORD }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error('Superadmin sign-in failed: ' + JSON.stringify(data));
  return data.access_token;
}

// Non-destructive: generates a magiclink token for an existing user and redeems it, without
// touching their password, so we can test as a real non-superadmin role.
async function getAdminToken(): Promise<string> {
  const { data: linkData, error: linkError } = await serviceRole.auth.admin.generateLink({
    type: 'magiclink',
    email: ADMIN_EMAIL,
  });
  if (linkError || !linkData) throw new Error('generateLink failed: ' + linkError?.message);
  const hashedToken = (linkData.properties as any).hashed_token;
  const { data: verifyData, error: verifyError } = await anonClient.auth.verifyOtp({
    token_hash: hashedToken,
    type: 'email',
  } as any);
  if (verifyError || !verifyData.session) throw new Error('verifyOtp failed: ' + verifyError?.message);
  return verifyData.session.access_token;
}

async function createTestProduct(token: string, name: string) {
  const res = await fetch(`${BASE_URL}/api/inventory/products`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, purchase_price: 1, selling_price: 2, stock_quantity: 0, role: 'retail' }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error('createTestProduct failed: ' + JSON.stringify(body));
  return body.id as string;
}

async function del(token: string, id: string, hard: boolean) {
  const res = await fetch(`${BASE_URL}/api/inventory/products?id=${id}${hard ? '&hard=true' : ''}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function main() {
  if (!SUPERADMIN_PASSWORD) {
    console.error('Set SUPERADMIN_PASSWORD env var (not stored anywhere) to run this check.');
    process.exit(1);
  }

  const superadminToken = await getSuperadminToken();
  const adminToken = await getAdminToken();
  console.log('Got both tokens.\n');

  const productA = await createTestProduct(superadminToken, 'ZZTEST_SoftDelete_A');
  const productB = await createTestProduct(superadminToken, 'ZZTEST_HardDelete_B');
  console.log('Created test products:', productA, productB, '\n');

  // 1. Non-superadmin (admin) soft-deletes product A -> expect 200, mode: soft
  const r1 = await del(adminToken, productA, false);
  console.log('1) admin soft-delete productA:', r1.status, r1.body);

  // 2. Non-superadmin (admin) tries hard-delete on product B -> expect 403
  const r2 = await del(adminToken, productB, true);
  console.log('2) admin HARD-delete productB (should be 403):', r2.status, r2.body);

  // 3. Superadmin hard-deletes product B (no history) -> expect 200, mode: hard
  const r3 = await del(superadminToken, productB, true);
  console.log('3) superadmin hard-delete productB (should succeed):', r3.status, r3.body);

  // 4. Superadmin tries hard-delete on a product WITH consumption history -> expect 409, not silent success
  const r4 = await del(superadminToken, 'prod-1785167878662-821', true);
  console.log('4) superadmin hard-delete product WITH consumption history (should be 409):', r4.status, r4.body);

  // 5. Verify DB state directly
  const { data: rowA } = await serviceRole.from('inventory_products').select('id, deleted_at').eq('id', productA).maybeSingle();
  const { data: rowB } = await serviceRole.from('inventory_products').select('id, deleted_at').eq('id', productB).maybeSingle();
  console.log('\n5) DB state — productA (should exist, deleted_at set):', rowA);
  console.log('   DB state — productB (should be null/gone):', rowB);

  // 6. Verify GET excludes soft-deleted productA
  const listRes = await fetch(`${BASE_URL}/api/inventory/products`, { headers: { Authorization: `Bearer ${superadminToken}` } });
  const listBody = await listRes.json();
  const stillListed = (listBody.products || []).some((p: any) => p.id === productA);
  console.log('\n6) productA still appears in GET listing (should be false):', stillListed);

  // Cleanup: fully remove the soft-deleted test product from the DB (test artifact only).
  await serviceRole.from('inventory_products').delete().eq('id', productA);
  await serviceRole.from('page_settings').select('value').eq('key', 'inventory_products').maybeSingle().then(async ({ data }) => {
    if (data?.value?.products) {
      const cleaned = data.value.products.filter((p: any) => p.id !== productA && p.id !== productB);
      await serviceRole.from('page_settings').update({ value: { products: cleaned } }).eq('key', 'inventory_products');
    }
  });
  console.log('\nCleaned up test products.');
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
