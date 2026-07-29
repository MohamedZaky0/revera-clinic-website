// Live end-to-end verification for task 5.9 (GET /api/finance/capacity).
// Seeds an isolated branch (2 clinical rooms, 1 broken/unavailable room), one provider with a
// split shift, a holiday_calendar closure for the provider on one of the two test days, and one
// completed reservation -- then hand-computes the expected roomMinutes/doctorMinutes/
// bottleneckMinutes/bookedMinutes/utilization and confirms the endpoint matches exactly.
//
//   npm run dev   (in one terminal)
//   npx tsx scratch/phase5capacityendpointcheck.ts   (in another)
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
function check(label: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(70)} got=${JSON.stringify(got)} want=${JSON.stringify(want)}`);
}
function checkTrue(label: string, ok: boolean, detail?: unknown) {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(70)}${detail !== undefined ? ' ' + JSON.stringify(detail) : ''}`);
}

const cleanup: Array<() => Promise<void>> = [];
async function runCleanup() {
  for (const fn of cleanup.slice().reverse()) {
    try { await fn(); } catch (e) { console.error('cleanup error:', e); }
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

  const email = `phase5-capacity-check-${stamp}@example.test`;
  const password = `Phase5Cap!${stamp}`;
  const { data: created, error: createErr } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (createErr || !created.user) throw new Error(`createUser failed: ${createErr?.message}`);
  cleanup.push(async () => { await admin.auth.admin.deleteUser(created.user!.id); });
  const { error: empErr } = await admin.from('employee_accounts').insert({
    auth_user_id: created.user.id, employee_id: `PHASE5CAP-${stamp}`, role_name: 'superadmin', email, name: 'Phase5 Capacity Check (temp)',
  });
  if (empErr) throw new Error(`employee_accounts insert failed: ${empErr.message}`);
  cleanup.push(async () => { await admin.from('employee_accounts').delete().eq('auth_user_id', created.user!.id); });
  const anon = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const { data: signIn, error: signInErr } = await anon.auth.signInWithPassword({ email, password });
  if (signInErr || !signIn.session) throw new Error(`signIn failed: ${signInErr?.message}`);
  const token = signIn.session.access_token;

  const { data: branch, error: branchErr } = await admin
    .from('branches')
    .insert({ name_en: `Phase5 Cap Branch ${stamp}`, name_ar: `Phase5 Cap Branch ${stamp}`, address_en: 'x', address_ar: 'x', status: 'active' })
    .select().single();
  if (branchErr || !branch) throw new Error(`branch insert failed: ${branchErr?.message}`);
  cleanup.push(async () => { await admin.from('branches').delete().eq('id', branch.id); });

  const { data: room1 } = await admin.from('rooms').insert({ name: `Cap Room 1 ${stamp}`, type: 'clinical', status: 'available', branch_id: branch.id }).select().single();
  const { data: room2 } = await admin.from('rooms').insert({ name: `Cap Room 2 ${stamp}`, type: 'clinical', status: 'available', branch_id: branch.id }).select().single();
  const { data: room3 } = await admin.from('rooms').insert({ name: `Cap Room 3 (broken) ${stamp}`, type: 'clinical', status: 'has_issue', branch_id: branch.id }).select().single();
  for (const r of [room1, room2, room3]) if (r) cleanup.push(async () => { await admin.from('rooms').delete().eq('id', r.id); });

  const { data: service, error: svcErr } = await admin
    .from('services')
    .insert({ en: `Phase5 Cap Service ${stamp}`, ar: `Phase5 Cap Service ${stamp}`, price: 100, unit: 'session', duration_minutes: 60 })
    .select().single();
  if (svcErr || !service) throw new Error(`service insert failed: ${svcErr?.message}`);
  cleanup.push(async () => { await admin.from('services').delete().eq('id', service.id); });

  // Two consecutive test days -- pick two dates far in the past so no other test data collides,
  // and compute their real weekday names the same way the route does.
  const day1 = '2020-03-02'; // Monday
  const day2 = '2020-03-03'; // Tuesday
  const weekday1 = new Date(`${day1}T00:00:00.000Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
  const weekday2 = new Date(`${day2}T00:00:00.000Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
  checkTrue('fixture sanity: day1 is Monday, day2 is Tuesday', weekday1 === 'Monday' && weekday2 === 'Tuesday', { weekday1, weekday2 });

  // Provider: split shift 09:00-13:00 + 16:00-20:00 on BOTH weekdays (8h/day), on leave (holiday)
  // on day2 only.
  const { data: provider, error: provErr } = await admin
    .from('providers')
    .insert({
      name: `Phase5 Cap Provider ${stamp}`,
      services: [],
      branch_id: branch.id,
      working_days_hours: {
        [weekday1]: { isOpen: true, start: '09:00', end: '20:00', shifts: [{ start: '09:00', end: '13:00' }, { start: '16:00', end: '20:00' }] },
        [weekday2]: { isOpen: true, start: '09:00', end: '20:00', shifts: [{ start: '09:00', end: '13:00' }, { start: '16:00', end: '20:00' }] },
      },
    })
    .select().single();
  if (provErr || !provider) throw new Error(`provider insert failed: ${provErr?.message}`);
  cleanup.push(async () => { await admin.from('providers').delete().eq('id', provider.id); });

  const { data: holiday, error: holErr } = await admin
    .from('holiday_calendar')
    .insert({ provider_id: provider.id, date: day2, reason: 'test leave' })
    .select().single();
  if (holErr) throw new Error(`holiday insert failed: ${holErr.message}`);
  if (holiday) cleanup.push(async () => { await admin.from('holiday_calendar').delete().eq('id', holiday.id); });

  // One completed reservation on day1 for this branch/service (60 min booked).
  const { data: reservation, error: resErr } = await admin
    .from('reservations')
    .insert({
      service_id: service.id, service_ids: [service.id], date: day1, requested_time: '10:00',
      name: `Phase5 Cap Patient ${stamp}`, status: 'completed', branch_id: branch.id,
      amount_paid: 100, amount_left: 0, is_manual: true, completed_at: `${day1}T10:00:00.000Z`,
    })
    .select().single();
  if (resErr || !reservation) throw new Error(`reservation insert failed: ${resErr?.message}`);
  cleanup.push(async () => { await admin.from('reservations').delete().eq('id', reservation.id); });

  const res = await api(token, 'GET', `/api/finance/capacity?from=${day1}&to=${day2}&branchId=${branch.id}`);
  checkTrue('GET /api/finance/capacity => 200', res.status === 200, res.json);
  const slice = res.json?.byBranch?.[0];
  checkTrue('byBranch has exactly one entry for this branch', res.json?.byBranch?.length === 1 && slice?.branchId === branch.id, res.json?.byBranch);

  // roomMinutes: 2 available rooms x 660 min/day (default 09:00-20:00) x 2 days = 2640.
  check('roomMinutes: 2 available rooms (not the broken 3rd) x 660 min x 2 days', slice?.roomMinutes, 2 * 660 * 2);

  // doctorMinutes: day1 8h (480) + day2 0 (on leave) = 480.
  check('doctorMinutes: 480 on day1 (split shift), 0 on day2 (on leave)', slice?.doctorMinutes, 480);

  // bottleneckMinutes: day1 min(1320, 480)=480, day2 min(1320, 0)=0 -> total 480.
  check('bottleneckMinutes: min(rooms,doctors) per day, summed', slice?.bottleneckMinutes, 480);

  // bookedMinutes: one 60-min completed reservation.
  check('bookedMinutes: one 60-min completed reservation', slice?.bookedMinutes, 60);

  // utilization: 60 / 480.
  check('utilization: bookedMinutes / bottleneckMinutes', slice?.utilization, Math.round((60 / 480) * 10000) / 10000);

  check('noShowCount: 0 (no no-shows seeded)', slice?.noShowCount, 0);
  check('completedCount: 1', slice?.completedCount, 1);
  check('noShowRate: 0 no-shows of 1 completed', slice?.noShowRate, 0);

  // Permission gate: a receptionist (no finance.* permissions) must be refused.
  const recEmail = `phase5-capacity-receptionist-${stamp}@example.test`;
  const recPassword = `Phase5CapRec!${stamp}`;
  const { data: recCreated, error: recCreateErr } = await admin.auth.admin.createUser({ email: recEmail, password: recPassword, email_confirm: true });
  if (recCreateErr || !recCreated.user) throw new Error(`receptionist createUser failed: ${recCreateErr?.message}`);
  cleanup.push(async () => { await admin.auth.admin.deleteUser(recCreated.user!.id); });
  const { error: recEmpErr } = await admin.from('employee_accounts').insert({
    auth_user_id: recCreated.user.id, employee_id: `PHASE5CAPREC-${stamp}`, role_name: 'receptionist', email: recEmail, name: 'Phase5 Capacity Receptionist Check (temp)',
  });
  if (recEmpErr) throw new Error(`receptionist employee_accounts insert failed: ${recEmpErr.message}`);
  cleanup.push(async () => { await admin.from('employee_accounts').delete().eq('auth_user_id', recCreated.user!.id); });
  const { data: recSignIn, error: recSignInErr } = await anon.auth.signInWithPassword({ email: recEmail, password: recPassword });
  if (recSignInErr || !recSignIn.session) throw new Error(`receptionist signIn failed: ${recSignInErr?.message}`);
  const recRes = await api(recSignIn.session.access_token, 'GET', `/api/finance/capacity?from=${day1}&to=${day2}&branchId=${branch.id}`);
  checkTrue('receptionist (no finance.view_capacity) => 403', recRes.status === 403, recRes.json);

  checkTrue('byDay has exactly 2 entries (day1, day2)', Array.isArray(slice?.byDay) && slice.byDay.length === 2, slice?.byDay);
  const bd1 = slice?.byDay?.find((d: any) => d.date === day1);
  const bd2 = slice?.byDay?.find((d: any) => d.date === day2);
  check('byDay[day1].doctorMinutes', bd1?.doctorMinutes, 480);
  check('byDay[day2].doctorMinutes (on leave)', bd2?.doctorMinutes, 0);
  check('byDay[day2].bottleneckMinutes (on leave -> 0)', bd2?.bottleneckMinutes, 0);

  await runCleanup();
  console.log(failed === 0 ? '\nALL PASS' : `\n${failed} FAILED`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.error('Unhandled error:', err);
  await runCleanup();
  process.exit(1);
});
