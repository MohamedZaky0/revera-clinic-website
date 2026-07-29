// Regression check for task 5.1 (PROPOSAL-002 Phase 5): reservations.approved_at/completed_at/
// cancelled_at must be written by PATCH /api/reservations on the matching transition, and stay
// NULL otherwise -- this is what task 5.5's utilization math (booked minutes = completed_at set,
// excluding cancelled_at set) depends on.
//
//   npm run dev   (in one terminal)
//   npx tsx scratch/phase5statustimestampscheck.ts   (in another)
import { config } from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: path.resolve(__dirname, '..', '.env.local'), quiet: true });

const BASE_URL = process.env.PHASE5_CHECK_BASE_URL || 'http://localhost:3000';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

let failed = 0;
function checkTrue(label: string, ok: boolean, detail?: unknown) {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(70)}${detail !== undefined ? ' ' + JSON.stringify(detail) : ''}`);
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

async function api(token: string, method: string, apiPath: string, body?: any) {
  const res = await fetch(`${BASE_URL}${apiPath}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* no body */ }
  return { status: res.status, json };
}

async function main() {
  const stamp = Date.now();

  const email = `phase5-check-${stamp}@example.test`;
  const password = `Phase5Check!${stamp}`;
  const { data: created, error: createErr } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (createErr || !created.user) throw new Error(`createUser failed: ${createErr?.message}`);
  cleanup.push(async () => { await admin.auth.admin.deleteUser(created.user!.id); });
  const { error: empErr } = await admin.from('employee_accounts').insert({
    auth_user_id: created.user.id,
    employee_id: `PHASE5-${stamp}`,
    role_name: 'superadmin',
    email,
    name: 'Phase5 Check (temp)',
  });
  if (empErr) throw new Error(`employee_accounts insert failed: ${empErr.message}`);
  cleanup.push(async () => { await admin.from('employee_accounts').delete().eq('auth_user_id', created.user!.id); });
  const anon = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const { data: signIn, error: signInErr } = await anon.auth.signInWithPassword({ email, password });
  if (signInErr || !signIn.session) throw new Error(`signIn failed: ${signInErr?.message}`);
  const token = signIn.session.access_token;

  const { data: service, error: svcErr } = await admin
    .from('services')
    .insert({ en: `Phase5 Check Service ${stamp}`, ar: `Phase5 Check Service ${stamp}`, price: 100, unit: 'session', duration_minutes: 30 })
    .select()
    .single();
  if (svcErr || !service) throw new Error(`service insert failed: ${svcErr?.message}`);
  cleanup.push(async () => { await admin.from('services').delete().eq('id', service.id); });

  // --- Reservation A: approve, then complete ---
  const { data: resA, error: resAErr } = await admin
    .from('reservations')
    .insert({
      service_id: service.id,
      service_ids: [service.id],
      date: '2026-01-01',
      requested_time: '10:00',
      name: `Phase5 Check A ${stamp}`,
      status: 'pending',
      amount_paid: 0,
      is_manual: true,
    })
    .select()
    .single();
  if (resAErr || !resA) throw new Error(`reservation A insert failed: ${resAErr?.message}`);
  cleanup.push(async () => { await admin.from('reservations').delete().eq('id', resA.id); });

  checkTrue('A: fresh reservation has all three timestamps NULL', !resA.approved_at && !resA.completed_at && !resA.cancelled_at, resA);

  const approveRes = await api(token, 'PATCH', `/api/reservations?id=${resA.id}`, { action: 'approve', timeSlot: '10:00' });
  checkTrue('A: approve PATCH => 200', approveRes.status === 200, approveRes.json);
  // mapRow() (the API response shape) does not surface these columns yet -- verified at the DB
  // level directly below, which is what actually matters for the capacity math consuming them.

  const { data: afterApprove } = await admin.from('reservations').select('approved_at, completed_at, cancelled_at').eq('id', resA.id).single();
  checkTrue('A: DB row -- approved_at set', !!afterApprove?.approved_at, afterApprove);
  checkTrue('A: DB row -- completed_at still NULL', !afterApprove?.completed_at, afterApprove);
  checkTrue('A: DB row -- cancelled_at still NULL', !afterApprove?.cancelled_at, afterApprove);

  const completeRes = await api(token, 'PATCH', `/api/reservations?id=${resA.id}`, { status: 'completed', amountPaid: 100, amountLeft: 0 });
  checkTrue('A: complete PATCH => 200', completeRes.status === 200, completeRes.json);
  await new Promise((r) => setTimeout(r, 300));

  const { data: afterComplete } = await admin.from('reservations').select('approved_at, completed_at, cancelled_at').eq('id', resA.id).single();
  checkTrue('A: DB row -- approved_at unchanged (still set)', !!afterComplete?.approved_at, afterComplete);
  checkTrue('A: DB row -- completed_at now set', !!afterComplete?.completed_at, afterComplete);
  checkTrue('A: DB row -- cancelled_at still NULL', !afterComplete?.cancelled_at, afterComplete);
  if (afterComplete) cleanup.push(async () => { await admin.from('invoices').delete().eq('reservation_id', resA.id); });

  // Re-firing an amount-only PATCH on an already-completed booking must not move completed_at.
  const firstCompletedAt = afterComplete?.completed_at;
  await new Promise((r) => setTimeout(r, 1100));
  await api(token, 'PATCH', `/api/reservations?id=${resA.id}`, { amountPaid: 100, amountLeft: 0 });
  const { data: afterRefire } = await admin.from('reservations').select('completed_at').eq('id', resA.id).single();
  checkTrue('A: completed_at unchanged by a later money-only PATCH', afterRefire?.completed_at === firstCompletedAt, { firstCompletedAt, now: afterRefire?.completed_at });

  // --- Reservation B: cancel ---
  const { data: resB, error: resBErr } = await admin
    .from('reservations')
    .insert({
      service_id: service.id,
      service_ids: [service.id],
      date: '2026-01-01',
      requested_time: '11:00',
      name: `Phase5 Check B ${stamp}`,
      status: 'approved',
      amount_paid: 0,
      is_manual: true,
    })
    .select()
    .single();
  if (resBErr || !resB) throw new Error(`reservation B insert failed: ${resBErr?.message}`);
  cleanup.push(async () => { await admin.from('reservations').delete().eq('id', resB.id); });

  const cancelRes = await api(token, 'PATCH', `/api/reservations?id=${resB.id}`, { action: 'cancel' });
  checkTrue('B: cancel PATCH => 200', cancelRes.status === 200, cancelRes.json);

  const { data: afterCancel } = await admin.from('reservations').select('approved_at, completed_at, cancelled_at').eq('id', resB.id).single();
  checkTrue('B: DB row -- cancelled_at set', !!afterCancel?.cancelled_at, afterCancel);
  checkTrue('B: DB row -- completed_at still NULL', !afterCancel?.completed_at, afterCancel);

  // --- Reservation C: no_show ---
  const { data: resC, error: resCErr } = await admin
    .from('reservations')
    .insert({
      service_id: service.id,
      service_ids: [service.id],
      date: '2026-01-01',
      requested_time: '12:00',
      name: `Phase5 Check C ${stamp}`,
      status: 'approved',
      amount_paid: 0,
      is_manual: true,
    })
    .select()
    .single();
  if (resCErr || !resC) throw new Error(`reservation C insert failed: ${resCErr?.message}`);
  cleanup.push(async () => { await admin.from('reservations').delete().eq('id', resC.id); });

  const noShowRes = await api(token, 'PATCH', `/api/reservations?id=${resC.id}`, { action: 'no_show' });
  checkTrue('C: no_show PATCH => 200', noShowRes.status === 200, noShowRes.json);

  const { data: afterNoShow } = await admin.from('reservations').select('cancelled_at').eq('id', resC.id).single();
  checkTrue('C: DB row -- cancelled_at set (reused for no_show, no dedicated column)', !!afterNoShow?.cancelled_at, afterNoShow);

  await runCleanup();
  console.log(failed === 0 ? '\nALL PASS' : `\n${failed} FAILED`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.error('Unhandled error:', err);
  await runCleanup();
  process.exit(1);
});
