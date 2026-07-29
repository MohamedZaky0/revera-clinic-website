// Live end-to-end verification for task 5.10 (GET /api/finance/service-mix).
// Seeds an isolated branch/room/provider, two services with a deliberately inverted
// margin-percentage-vs-per-minute relationship (matching capacity.ts's own worked example), real
// invoices/invoice_lines for both, and a no-show reservation -- then hand-computes ranking,
// capacity, allocation, revenue, and the gap decomposition, matching against the shared pure
// functions (already unit-tested in 5.8) fed with independently-fetched real inputs.
//
//   npm run dev   (in one terminal)
//   npx tsx scratch/phase5servicemixendpointcheck.ts   (in another)
import { config } from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { sellableCapacity, allocateGreedy, maxPotentialRevenue, gapToPotential, rankByContributionMarginPerMinute } from '../src/lib/serviceMix';

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

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

async function main() {
  const stamp = Date.now();

  const email = `phase5-mix-check-${stamp}@example.test`;
  const password = `Phase5Mix!${stamp}`;
  const { data: created, error: createErr } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (createErr || !created.user) throw new Error(`createUser failed: ${createErr?.message}`);
  cleanup.push(async () => { await admin.auth.admin.deleteUser(created.user!.id); });
  const { error: empErr } = await admin.from('employee_accounts').insert({
    auth_user_id: created.user.id, employee_id: `PHASE5MIX-${stamp}`, role_name: 'superadmin', email, name: 'Phase5 Mix Check (temp)',
  });
  if (empErr) throw new Error(`employee_accounts insert failed: ${empErr.message}`);
  cleanup.push(async () => { await admin.from('employee_accounts').delete().eq('auth_user_id', created.user!.id); });
  const anon = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const { data: signIn, error: signInErr } = await anon.auth.signInWithPassword({ email, password });
  if (signInErr || !signIn.session) throw new Error(`signIn failed: ${signInErr?.message}`);
  const token = signIn.session.access_token;

  const { data: branch, error: branchErr } = await admin
    .from('branches')
    .insert({ name_en: `Phase5 Mix Branch ${stamp}`, name_ar: `Phase5 Mix Branch ${stamp}`, address_en: 'x', address_ar: 'x', status: 'active' })
    .select().single();
  if (branchErr || !branch) throw new Error(`branch insert failed: ${branchErr?.message}`);
  cleanup.push(async () => { await admin.from('branches').delete().eq('id', branch.id); });

  const { data: room } = await admin.from('rooms').insert({ name: `Mix Room ${stamp}`, type: 'clinical', status: 'available', branch_id: branch.id }).select().single();
  if (room) cleanup.push(async () => { await admin.from('rooms').delete().eq('id', room.id); });

  const day1 = '2021-05-03'; // Monday
  const day2 = '2021-05-04'; // Tuesday
  const weekday1 = new Date(`${day1}T00:00:00.000Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
  const weekday2 = new Date(`${day2}T00:00:00.000Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
  checkTrue('fixture sanity: day1 Monday, day2 Tuesday', weekday1 === 'Monday' && weekday2 === 'Tuesday', { weekday1, weekday2 });

  const { data: provider, error: provErr } = await admin
    .from('providers')
    .insert({
      name: `Phase5 Mix Provider ${stamp}`, services: [], branch_id: branch.id,
      working_days_hours: {
        [weekday1]: { isOpen: true, start: '09:00', end: '17:00', shifts: [{ start: '09:00', end: '17:00' }] },
        [weekday2]: { isOpen: true, start: '09:00', end: '17:00', shifts: [{ start: '09:00', end: '17:00' }] },
      },
    })
    .select().single();
  if (provErr || !provider) throw new Error(`provider insert failed: ${provErr?.message}`);
  cleanup.push(async () => { await admin.from('providers').delete().eq('id', provider.id); });

  // Service A: 200 price, 60 min, CM 150/session -> 2.5/min (high total CM, low per-minute).
  // Service B: 100 price, 20 min, CM 80/session -> 4/min (lower total CM, higher per-minute).
  // B must rank ahead of A -- the same insight capacity.ts's own regression check verifies.
  const { data: svcA, error: svcAErr } = await admin.from('services').insert({ en: `Mix Svc A ${stamp}`, ar: `Mix Svc A ${stamp}`, price: 200, unit: 'session', duration_minutes: 60 }).select().single();
  if (svcAErr || !svcA) throw new Error(`svcA insert failed: ${svcAErr?.message}`);
  cleanup.push(async () => { await admin.from('services').delete().eq('id', svcA.id); });
  const { data: svcB, error: svcBErr } = await admin.from('services').insert({ en: `Mix Svc B ${stamp}`, ar: `Mix Svc B ${stamp}`, price: 100, unit: 'session', duration_minutes: 20 }).select().single();
  if (svcBErr || !svcB) throw new Error(`svcB insert failed: ${svcBErr?.message}`);
  cleanup.push(async () => { await admin.from('services').delete().eq('id', svcB.id); });

  async function makeInvoice(service: any, unitPrice: number, cogs: number, commission: number) {
    const invoiceNo = `MIXCHK-${stamp}-${service.id}-${Math.random().toString(36).slice(2, 8)}`;
    const { data: invoice, error: invErr } = await admin
      .from('invoices')
      .insert({ invoice_no: invoiceNo, branch_id: branch.id, issued_at: `${day1}T10:00:00.000Z`, subtotal: unitPrice, discount_total: 0, grand_total: unitPrice, status: 'issued' })
      .select().single();
    if (invErr || !invoice) throw new Error(`invoice insert failed: ${invErr?.message}`);
    cleanup.push(async () => { await admin.from('invoice_lines').delete().eq('invoice_id', invoice.id); await admin.from('invoices').delete().eq('id', invoice.id); });
    const { error: lineErr } = await admin.from('invoice_lines').insert({
      invoice_id: invoice.id, line_type: 'service', service_id: service.id, description: service.en,
      qty: 1, unit_price: unitPrice, discount: 0, line_total: unitPrice, cogs_snapshot: cogs, commission_snapshot: commission,
    });
    if (lineErr) throw new Error(`invoice_line insert failed: ${lineErr.message}`);
  }

  await makeInvoice(svcA, 200, 20, 30);
  await makeInvoice(svcA, 200, 20, 30); // A delivered twice
  await makeInvoice(svcB, 100, 10, 10);
  await makeInvoice(svcB, 100, 10, 10);
  await makeInvoice(svcB, 100, 10, 10); // B delivered three times

  // One no-show for service A (lost revenue = list price 200).
  const { data: noShowRes, error: noShowErr } = await admin
    .from('reservations')
    .insert({ service_id: svcA.id, service_ids: [svcA.id], date: day1, requested_time: '11:00', name: `Mix NoShow ${stamp}`, status: 'no_show', branch_id: branch.id, amount_paid: 0, is_manual: true })
    .select().single();
  if (noShowErr || !noShowRes) throw new Error(`no-show reservation insert failed: ${noShowErr?.message}`);
  cleanup.push(async () => { await admin.from('reservations').delete().eq('id', noShowRes.id); });

  // Independently fetch the REAL clinic-wide undelivered-package-minutes figure right before
  // calling the endpoint, since customer_packages is not branch-scoped (documented simplification
  // in the endpoint) -- this fixture cannot isolate that part, so it is measured, not assumed.
  const { data: activeCPs } = await admin.from('customer_packages').select('id').eq('status', 'active');
  let realUndeliveredMinutes = 0;
  if ((activeCPs || []).length > 0) {
    const { data: cpItems } = await admin.from('customer_package_items').select('service_id, qty_remaining').in('customer_package_id', (activeCPs || []).map((c: any) => c.id));
    const svcIds = Array.from(new Set((cpItems || []).map((i: any) => i.service_id)));
    const { data: svcDurations } = svcIds.length > 0 ? await admin.from('services').select('id, duration, duration_minutes').in('id', svcIds) : { data: [] as any[] };
    const durMap = new Map<number, number>((svcDurations || []).map((s: any) => [s.id, Number(s.duration_minutes) || 30]));
    for (const item of cpItems || []) {
      const qty = Number(item.qty_remaining || 0);
      if (qty > 0) realUndeliveredMinutes += qty * (durMap.get(item.service_id) ?? 30);
    }
  }

  const res = await api(token, 'GET', `/api/finance/service-mix?from=${day1}&to=${day2}&branchId=${branch.id}`);
  checkTrue('GET /api/finance/service-mix => 200', res.status === 200, res.json);
  const body = res.json;

  // Ranking: B (4/min) ahead of A (2.5/min).
  const rankedIds = (body?.rankedServices || []).map((s: any) => s.id);
  check('rankedServices: B ranked ahead of A (higher CM per minute wins, not higher total CM)', rankedIds, [svcB.id, svcA.id]);
  check('rankedServices: A cmPerMinute = 150/60', body?.rankedServices?.find((s: any) => s.id === svcA.id)?.cmPerMinute, 2.5);
  check('rankedServices: B cmPerMinute = 80/20', body?.rankedServices?.find((s: any) => s.id === svcB.id)?.cmPerMinute, 4);

  // Capacity: 1 room x 660 min x 2 days, 1 provider x 480 min x 2 days -> bottleneck 480x2=960.
  check('capacity.bottleneckMinutes: 1 room, 1 provider (8h/day) x 2 days', body?.capacity?.bottleneckMinutes, 960);
  check('capacity.undeliveredPackageMinutes matches independently-measured clinic-wide figure', body?.capacity?.undeliveredPackageMinutes, realUndeliveredMinutes);

  const expectedSellable = sellableCapacity(960, realUndeliveredMinutes);
  check('capacity.sellableMinutes matches sellableCapacity(960, realUndelivered) directly', body?.capacity?.sellableMinutes, expectedSellable.sellableMinutes);

  // Allocation: ranked [B(4/min,20min,cap3), A(2.5/min,60min,cap2)], sellable minutes as above.
  const expectedAllocation = allocateGreedy(
    [
      { id: svcB.id, cmPerMinute: 4, durationMinutes: 20, monthlyDemandCap: 3 },
      { id: svcA.id, cmPerMinute: 2.5, durationMinutes: 60, monthlyDemandCap: 2 },
    ],
    expectedSellable.sellableMinutes
  );
  check('allocation matches allocateGreedy() fed the same real inputs', body?.allocation, expectedAllocation);

  const expectedPrices: Record<string, number> = { [String(svcA.id)]: 200, [String(svcB.id)]: 100 };
  const expectedPotential = maxPotentialRevenue(expectedAllocation, expectedPrices);
  check('maxPotentialRevenue matches maxPotentialRevenue() with real allocation+prices', body?.maxPotentialRevenue, expectedPotential);

  // Actual service revenue: A 2x200=400, B 3x100=300 -> 700.
  check('actualServiceRevenue: A 400 + B 300', body?.actualServiceRevenue, 700);
  const expectedGap = gapToPotential(expectedPotential, 700);
  check('gapToPotential matches gapToPotential(potential, 700)', body?.gapToPotential, expectedGap);

  // No-show lost revenue: exactly the one seeded no-show, service A's list price 200.
  check('gapDecomposition.noShowLostRevenue: one no-show at service A list price 200', body?.gapDecomposition?.noShowLostRevenue, 200);

  const idlePlusNoShow = round2((body?.gapDecomposition?.idleCapacityValue || 0) + (body?.gapDecomposition?.noShowLostRevenue || 0));
  const expectedSuboptimal = idlePlusNoShow > expectedGap ? 0 : round2(expectedGap - idlePlusNoShow);
  check('gapDecomposition.suboptimalMixValue matches gap - idle - noShow (or 0 if that overshoots)', body?.gapDecomposition?.suboptimalMixValue, expectedSuboptimal);

  // Break-even: fixed overhead is 0 for this fresh branch (no expenses/assets seeded, loan
  // interest skipped for a branch-scoped query) -- so break-even revenue must be exactly 0.
  check('breakEven.fixedOverhead: 0 (fresh isolated branch, no expenses/assets seeded)', body?.breakEven?.fixedOverhead, 0);
  check('breakEven.value: 0 fixed overhead -> 0 break-even revenue', body?.breakEven?.value, 0);

  // Permission gate.
  const recEmail = `phase5-mix-receptionist-${stamp}@example.test`;
  const recPassword = `Phase5MixRec!${stamp}`;
  const { data: recCreated, error: recCreateErr } = await admin.auth.admin.createUser({ email: recEmail, password: recPassword, email_confirm: true });
  if (recCreateErr || !recCreated.user) throw new Error(`receptionist createUser failed: ${recCreateErr?.message}`);
  cleanup.push(async () => { await admin.auth.admin.deleteUser(recCreated.user!.id); });
  const { error: recEmpErr } = await admin.from('employee_accounts').insert({
    auth_user_id: recCreated.user.id, employee_id: `PHASE5MIXREC-${stamp}`, role_name: 'receptionist', email: recEmail, name: 'Phase5 Mix Receptionist Check (temp)',
  });
  if (recEmpErr) throw new Error(`receptionist employee_accounts insert failed: ${recEmpErr.message}`);
  cleanup.push(async () => { await admin.from('employee_accounts').delete().eq('auth_user_id', recCreated.user!.id); });
  const { data: recSignIn, error: recSignInErr } = await anon.auth.signInWithPassword({ email: recEmail, password: recPassword });
  if (recSignInErr || !recSignIn.session) throw new Error(`receptionist signIn failed: ${recSignInErr?.message}`);
  const recRes = await api(recSignIn.session.access_token, 'GET', `/api/finance/service-mix?from=${day1}&to=${day2}&branchId=${branch.id}`);
  checkTrue('receptionist (no finance.view_margins) => 403', recRes.status === 403, recRes.json);

  await runCleanup();
  console.log(failed === 0 ? '\nALL PASS' : `\n${failed} FAILED`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.error('Unhandled error:', err);
  await runCleanup();
  process.exit(1);
});
