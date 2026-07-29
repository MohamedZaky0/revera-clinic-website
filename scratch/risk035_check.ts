// Live end-to-end verification for RISK-035 (package-redeemed visits were double-billed:
// checkout invoiced them at full price in addition to the correct package_revenue_recognitions
// entry, and the unpaid phantom invoice showed as a fake outstanding debt).
//
//   npm run dev   (in one terminal)
//   npx tsx scratch/risk035_check.ts   (in another)
import { config } from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: path.resolve(__dirname, '..', '.env.local'), quiet: true });

const BASE_URL = process.env.RISK035_CHECK_BASE_URL || 'http://localhost:3000';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

let failed = 0;
function check(label: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(60)} got=${JSON.stringify(got)} want=${JSON.stringify(want)}`);
}
function checkTrue(label: string, ok: boolean, detail?: unknown) {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(60)}${detail !== undefined ? ' ' + JSON.stringify(detail) : ''}`);
}

const cleanup: Array<() => Promise<void>> = [];
async function runCleanup() {
  for (const fn of cleanup.slice().reverse()) {
    try {
      await fn();
    } catch (e) {
      console.error('cleanup error:', e);
    }
  }
}

async function api(token: string | null, method: string, path: string, body?: any) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* no body */
  }
  return { status: res.status, json };
}

async function main() {
  const stamp = Date.now();

  const email = `risk035-check-${stamp}@example.test`;
  const password = `Risk035Check!${stamp}`;
  const { data: created, error: createErr } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (createErr || !created.user) throw new Error(`createUser failed: ${createErr?.message}`);
  cleanup.push(async () => { await admin.auth.admin.deleteUser(created.user!.id); });
  const { error: empErr } = await admin.from('employee_accounts').insert({
    auth_user_id: created.user.id,
    employee_id: `RISK035-${stamp}`,
    role_name: 'superadmin',
    email,
    name: 'RISK-035 Check (temp)',
  });
  if (empErr) throw new Error(`employee_accounts insert failed: ${empErr.message}`);
  cleanup.push(async () => { await admin.from('employee_accounts').delete().eq('auth_user_id', created.user!.id); });
  const anon = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const { data: signIn, error: signInErr } = await anon.auth.signInWithPassword({ email, password });
  if (signInErr || !signIn.session) throw new Error(`signIn failed: ${signInErr?.message}`);
  const token = signIn.session.access_token;

  // Fixtures: a service (price 300, no recipe -- cogs_snapshot will be 0, that's fine, this test
  // is about revenue/receivables, not costing), a customer, and a package covering that service.
  const { data: service, error: svcErr } = await admin
    .from('services')
    .insert({ en: `RISK035 Service ${stamp}`, ar: `RISK035 Service ${stamp}`, price: 300, unit: 'session' })
    .select()
    .single();
  if (svcErr || !service) throw new Error(`service insert failed: ${svcErr?.message}`);
  cleanup.push(async () => { await admin.from('services').delete().eq('id', service.id); });

  const { data: customer, error: custErr } = await admin
    .from('customers')
    .insert({ name: `RISK035 Customer ${stamp}`, mobile: `019${String(stamp).slice(-9)}` })
    .select()
    .single();
  if (custErr || !customer) throw new Error(`customer insert failed: ${custErr?.message}`);
  cleanup.push(async () => { await admin.from('customers').delete().eq('id', customer.id); });

  // A reservation representing a visit that redeems one session from an existing package --
  // status starts 'approved' (bypassing the booking-creation/approval flow, which isn't what
  // this check is verifying) and gets completed through the real PATCH endpoint below.
  const { data: reservation, error: resErr } = await admin
    .from('reservations')
    .insert({
      service_id: service.id,
      service_ids: [service.id],
      date: '2026-01-01',
      requested_time: '10:00',
      name: customer.name,
      customer_id: customer.id,
      status: 'approved',
      amount_paid: 0,
      is_manual: true,
    })
    .select()
    .single();
  if (resErr || !reservation) throw new Error(`reservation insert failed: ${resErr?.message}`);
  cleanup.push(async () => { await admin.from('reservations').delete().eq('id', reservation.id); });

  // Complete the checkout exactly as the admin UI now does for a fully package-redeemed visit:
  // amountPaid 0 (frontend already excludes redeemed items from what's charged) plus the new
  // redeemedServiceIds field this fix adds.
  const completeRes = await api(token, 'PATCH', `/api/reservations?id=${reservation.id}`, {
    status: 'completed',
    amountPaid: 0,
    amountLeft: 0,
    redeemedServiceIds: [service.id],
  });
  checkTrue('checkout PATCH => 200', completeRes.status === 200, completeRes);

  await new Promise((r) => setTimeout(r, 500)); // dual-write invoice is fire-and-forget-ish inside the handler

  const { data: invoice } = await admin.from('invoices').select('*').eq('reservation_id', reservation.id).maybeSingle();
  checkTrue('an invoice was written for the audit trail', !!invoice, invoice);
  if (invoice) cleanup.push(async () => { await admin.from('invoices').delete().eq('id', invoice.id); });
  check('invoice.grand_total is 0 (not the full 300 price)', invoice ? Number(invoice.grand_total) : null, 0);

  const { data: lines } = await admin.from('invoice_lines').select('*').eq('invoice_id', invoice?.id || '');
  const line = (lines || [])[0];
  checkTrue('exactly one invoice line written', (lines || []).length === 1, lines);
  check('line.unit_price is the real list price (300) -- kept for the audit trail', line ? Number(line.unit_price) : null, 300);
  check('line.discount fully offsets the price (300)', line ? Number(line.discount) : null, 300);
  check('line.line_total is 0 -- this is the actual fix', line ? Number(line.line_total) : null, 0);
  checkTrue('line description flags it as a package redemption', (line?.description || '').includes('package redemption'), line?.description);

  const { data: payments } = await admin.from('payments').select('*').eq('invoice_id', invoice?.id || '');
  check('no payment row was created (nothing was actually charged)', (payments || []).length, 0);

  // Receivables aging must not show this as an outstanding debt.
  const aging = await api(token, 'GET', '/api/finance/receivables-aging?asOf=2026-01-05');
  const agingItem = (aging.json?.items || []).find((i: any) => i.invoiceId === invoice?.id);
  checkTrue('receivables-aging does NOT list this invoice as outstanding', !agingItem, agingItem);

  await runCleanup();
  console.log(failed === 0 ? '\nALL PASS' : `\n${failed} FAILED`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.error('Unhandled error:', err);
  await runCleanup();
  process.exit(1);
});
