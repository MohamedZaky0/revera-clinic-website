// Live end-to-end verification for Phase 4 reporting endpoints (tasks 4.6, 4.7, 4.8, 4.9, 4.10,
// 4.11) against the dev database.
//
//   npm run dev   (in one terminal)
//   npx tsx scratch/phase4endpointcheck.ts   (in another)
//
// Creates a fully isolated fixture set (temp branch, provider, service, product, category,
// invoices/lines/payments, expense, fixed asset + depreciation, loan, budget line, customer) all
// dated 2030-01 -- far enough from any real dev data that this script's expected values never
// drift as unrelated dev data changes -- exercises every endpoint against hand-computed
// expectations, checks the doctor-pnl/branch-pnl reconciliation invariants against 4.6's
// whole-clinic totals, checks the finance.* permission gate on every endpoint, then deletes
// everything it created (including the temp auth users) regardless of pass/fail.
import { config } from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: path.resolve(__dirname, '..', '.env.local'), quiet: true });

const BASE_URL = process.env.PHASE4_CHECK_BASE_URL || 'http://localhost:3000';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

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
    try {
      await fn();
    } catch (e) {
      console.error('cleanup error:', e);
    }
  }
}

async function createTempUser(roleName: string | null, stamp: number, tag: string) {
  const email = `phase4-check-${tag}-${stamp}@example.test`;
  const password = `Ph4se4Check!${stamp}`;

  const { data: created, error: createError } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (createError || !created.user) throw new Error(`createUser(${tag}) failed: ${createError?.message}`);
  cleanup.push(async () => {
    await admin.auth.admin.deleteUser(created.user!.id);
  });

  if (roleName) {
    const { error: employeeError } = await admin.from('employee_accounts').insert({
      auth_user_id: created.user.id,
      employee_id: `PH4CHK-${tag}-${stamp}`,
      role_name: roleName,
      email,
      name: `Phase 4 Check ${tag} (temp)`,
    });
    if (employeeError) throw new Error(`employee_accounts insert(${tag}) failed: ${employeeError.message}`);
    cleanup.push(async () => {
      await admin.from('employee_accounts').delete().eq('auth_user_id', created.user!.id);
    });
  }

  const anon = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const { data: signIn, error: signInError } = await anon.auth.signInWithPassword({ email, password });
  if (signInError || !signIn.session) throw new Error(`signIn(${tag}) failed: ${signInError?.message}`);

  return signIn.session.access_token;
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

  // finance.* is superadmin-bypass or explicit grant only -- "admin" alone does NOT pass
  // hasFinancePermission (matches task 4.2's "does not short-circuit on admin role" rule), so the
  // permission-denial half of this check uses a receptionist, not an unprivileged admin.
  const superadminToken = await createTempUser('superadmin', stamp, 'admin');
  const receptionistToken = await createTempUser('receptionist', stamp, 'staff');

  // ================= Isolated fixtures, all dated 2030-01 =================
  const PERIOD = '2030-01';
  const ISSUED_AT = '2030-01-15T00:00:00.000Z';
  const INCURRED_ON = '2030-01-15';

  const { data: branch, error: branchError } = await admin
    .from('branches')
    .insert({ name_en: `Phase4Check Branch ${stamp}`, name_ar: `Phase4Check Branch ${stamp}`, address_en: 'X', address_ar: 'X', status: 'active' })
    .select()
    .single();
  if (branchError || !branch) throw new Error(`branches insert failed: ${branchError?.message}`);
  cleanup.push(async () => {
    await admin.from('branches').delete().eq('id', branch.id);
  });

  const { data: category } = await admin
    .from('expense_categories')
    .insert({ name: `Phase4Check Rent ${stamp}`, kind: 'fixed' })
    .select()
    .single();
  cleanup.push(async () => {
    await admin.from('expense_categories').delete().eq('id', category.id);
  });

  const { data: provider } = await admin.from('providers').insert({ name: `Phase4Check Dr ${stamp}` }).select().single();
  cleanup.push(async () => {
    await admin.from('providers').delete().eq('id', provider.id);
  });

  const { data: service, error: serviceError } = await admin
    .from('services')
    .insert({ en: `Phase4Check Service ${stamp}`, ar: `Phase4Check Service ${stamp}`, price: 200, duration_minutes: 20, unit: 'session' })
    .select()
    .single();
  if (serviceError || !service) throw new Error(`services insert failed: ${serviceError?.message}`);
  cleanup.push(async () => {
    await admin.from('services').delete().eq('id', service.id);
  });

  const productId = `phase4check-prod-${stamp}`;
  await admin.from('inventory_products').insert({
    id: productId,
    name: `Phase4Check Product ${stamp}`,
    category: `Phase4Check Category ${stamp}`,
    price: 100,
    cost_price: 40,
    role: 'retail',
  });
  cleanup.push(async () => {
    await admin.from('inventory_products').delete().eq('id', productId);
  });

  const { data: customer } = await admin
    .from('customers')
    .insert({ name: `Phase4Check Customer ${stamp}`, mobile: `01${String(stamp).slice(-9)}` })
    .select()
    .single();
  cleanup.push(async () => {
    await admin.from('customers').delete().eq('id', customer.id);
  });

  // Invoice 1: service line, fully costed (cogs 50, commission 20), attributed to the temp
  // provider, partially paid (150 of 200) so receivables-aging has a known-outstanding invoice.
  const { data: invoice1 } = await admin
    .from('invoices')
    .insert({
      invoice_no: `PH4CHK-1-${stamp}`,
      customer_id: customer.id,
      branch_id: branch.id,
      issued_at: ISSUED_AT,
      subtotal: 200,
      discount_total: 0,
      grand_total: 200,
      status: 'issued',
    })
    .select()
    .single();
  cleanup.push(async () => {
    await admin.from('invoices').delete().eq('id', invoice1.id);
  });
  await admin.from('invoice_lines').insert({
    invoice_id: invoice1.id,
    line_type: 'service',
    service_id: service.id,
    description: 'Phase4Check service line',
    qty: 1,
    unit_price: 200,
    line_total: 200,
    cogs_snapshot: 50,
    commission_snapshot: 20,
    provider_id: provider.id,
  });
  await admin.from('payments').insert({
    invoice_id: invoice1.id,
    received_at: ISSUED_AT,
    amount: 150,
    method: 'cash',
  });

  // Invoice 2: product line, deliberately uncosted (NULL cogs/commission -- tests the
  // partiallyCosted/partiallyCommissioned flags and the "unattributed" doctor bucket), paid in full.
  const { data: invoice2 } = await admin
    .from('invoices')
    .insert({
      invoice_no: `PH4CHK-2-${stamp}`,
      customer_id: customer.id,
      branch_id: branch.id,
      issued_at: ISSUED_AT,
      subtotal: 100,
      discount_total: 0,
      grand_total: 100,
      status: 'issued',
    })
    .select()
    .single();
  cleanup.push(async () => {
    await admin.from('invoices').delete().eq('id', invoice2.id);
  });
  await admin.from('invoice_lines').insert({
    invoice_id: invoice2.id,
    line_type: 'product',
    product_id: productId,
    description: 'Phase4Check product line',
    qty: 1,
    unit_price: 100,
    line_total: 100,
    cogs_snapshot: null,
    commission_snapshot: null,
    provider_id: null,
  });
  await admin.from('payments').insert({
    invoice_id: invoice2.id,
    received_at: ISSUED_AT,
    amount: 100,
    method: 'card',
  });

  // Overhead fixtures: expense (branch-scoped), fixed asset + posted depreciation (branch-scoped),
  // loan (clinic-wide -- no branch_id column exists on loans anywhere in the schema).
  const expenseRes = await api(superadminToken, 'POST', '/api/expenses', {
    categoryId: category.id,
    branchId: branch.id,
    incurredOn: INCURRED_ON,
    amount: 500,
    vendor: 'Phase4Check Vendor',
  });
  checkTrue('fixture: create expense => 201', expenseRes.status === 201, expenseRes);
  const expenseId = expenseRes.json?.id;
  if (expenseId) cleanup.push(async () => { await admin.from('expenses').delete().eq('id', expenseId); });

  const assetRes = await api(superadminToken, 'POST', '/api/assets', {
    branchId: branch.id,
    category: 'furniture',
    name: `Phase4Check Asset ${stamp}`,
    purchasedOn: '2029-01-15',
    cost: 1200,
    usefulLifeMonths: 12,
    salvageValue: 0,
  });
  checkTrue('fixture: create fixed asset => 201', assetRes.status === 201, assetRes);
  const assetId = assetRes.json?.id;
  if (assetId) cleanup.push(async () => { await admin.from('fixed_assets').delete().eq('id', assetId); });

  // Inserted directly rather than via POST /api/assets/post-depreciation -- that endpoint posts
  // depreciation for EVERY active asset in the whole dev DB, not just this fixture's, which would
  // pollute unrelated real assets with an extra 2030-01 entry every time this script runs.
  const { error: depError } = await admin
    .from('depreciation_entries')
    .insert({ asset_id: assetId, period: PERIOD, amount: 100, book_value_after: 1100 });
  checkTrue(`fixture: depreciation inserted for ${PERIOD} (1200/12)`, !depError, depError);

  const loanRes = await api(superadminToken, 'POST', '/api/loans', {
    lender: `Phase4Check Bank ${stamp}`,
    principal: 1200,
    annualRate: 10,
    termMonths: 6,
    startedOn: '2029-11-01',
    installment: 210,
  });
  checkTrue('fixture: create loan => 201', loanRes.status === 201, loanRes);
  const loanId = loanRes.json?.loan?.id;
  if (loanId) cleanup.push(async () => { await admin.from('loans').delete().eq('id', loanId); });
  const loanScheduleRow = (loanRes.json?.schedule || []).find((row: any) => row.period === PERIOD);
  checkTrue(`fixture: loan schedule has a ${PERIOD} row`, !!loanScheduleRow, loanRes.json?.schedule);
  const expectedLoanInterest = Number(loanScheduleRow?.interest_part || 0);

  const budgetRes = await admin
    .from('budget_lines')
    .insert({ category_id: category.id, branch_id: branch.id, period: PERIOD, budgeted: 300 })
    .select()
    .single();
  if (budgetRes.data) cleanup.push(async () => { await admin.from('budget_lines').delete().eq('id', budgetRes.data.id); });

  // ================= 4.6 — GET /api/finance/pnl =================

  const noTokenPnl = await api(null, 'GET', `/api/finance/pnl?period=${PERIOD}&branchId=${branch.id}`);
  checkTrue('pnl: no token => 401', noTokenPnl.status === 401, noTokenPnl);
  const deniedPnl = await api(receptionistToken, 'GET', `/api/finance/pnl?period=${PERIOD}&branchId=${branch.id}`);
  checkTrue('pnl: receptionist (no finance.view_pnl) => 403', deniedPnl.status === 403, deniedPnl);

  const branchPnl = await api(superadminToken, 'GET', `/api/finance/pnl?period=${PERIOD}&branchId=${branch.id}`);
  checkTrue('pnl (branch-scoped): 200', branchPnl.status === 200, branchPnl);
  check('pnl (branch-scoped): revenue.services.total', branchPnl.json?.revenue?.services?.total, 200);
  check('pnl (branch-scoped): revenue.products.total', branchPnl.json?.revenue?.products?.total, 100);
  check('pnl (branch-scoped): revenue.total', branchPnl.json?.revenue?.total, 300);
  check('pnl (branch-scoped): cogs.total', branchPnl.json?.cogs?.total, 50);
  check('pnl (branch-scoped): cogs.partiallyCosted', branchPnl.json?.cogs?.partiallyCosted, true);
  check('pnl (branch-scoped): commission.total', branchPnl.json?.commission?.total, 20);
  check('pnl (branch-scoped): fixedOverhead.expenses.total', branchPnl.json?.fixedOverhead?.expenses?.total, 500);
  check('pnl (branch-scoped): fixedOverhead.depreciation', branchPnl.json?.fixedOverhead?.depreciation, 100);
  check('pnl (branch-scoped): fixedOverhead.loanInterestExcluded', branchPnl.json?.fixedOverhead?.loanInterestExcluded, true);
  check('pnl (branch-scoped): views.contributionMargin.value', branchPnl.json?.views?.contributionMargin?.value, 230);

  const wholeClinicPnl = await api(superadminToken, 'GET', `/api/finance/pnl?period=${PERIOD}`);
  checkTrue('pnl (whole-clinic): 200', wholeClinicPnl.status === 200, wholeClinicPnl);
  check('pnl (whole-clinic): fixedOverhead.total', wholeClinicPnl.json?.fixedOverhead?.total, round2(600 + expectedLoanInterest));
  check('pnl (whole-clinic): views.fullyLoadedProfit.value', wholeClinicPnl.json?.views?.fullyLoadedProfit?.value, round2(-370 - expectedLoanInterest));

  // ================= 4.7 — GET /api/finance/service-margin =================

  const deniedMargin = await api(receptionistToken, 'GET', `/api/finance/service-margin?period=${PERIOD}&branchId=${branch.id}`);
  checkTrue('service-margin: receptionist => 403', deniedMargin.status === 403, deniedMargin);

  const margin = await api(superadminToken, 'GET', `/api/finance/service-margin?period=${PERIOD}&branchId=${branch.id}&serviceId=${service.id}`);
  checkTrue('service-margin: 200', margin.status === 200, margin);
  const marginRow = (margin.json?.services || []).find((s: any) => s.serviceId === service.id);
  checkTrue('service-margin: temp service present', !!marginRow, margin.json);
  check('service-margin: sessionCount', marginRow?.sessionCount, 1);
  check('service-margin: contributionMarginPerSession (200-50-20)', marginRow?.contributionMarginPerSession, 130);
  check('service-margin: cmPerMinute (130/20)', marginRow?.cmPerMinute, 6.5);
  check('service-margin: durationIsFallback', marginRow?.durationIsFallback, false);

  // ================= 4.9 — GET /api/finance/cashflow =================

  const deniedCashflow = await api(receptionistToken, 'GET', `/api/finance/cashflow?period=${PERIOD}&branchId=${branch.id}`);
  checkTrue('cashflow: receptionist => 403', deniedCashflow.status === 403, deniedCashflow);

  const cashflow = await api(superadminToken, 'GET', `/api/finance/cashflow?period=${PERIOD}&branchId=${branch.id}`);
  checkTrue('cashflow: 200', cashflow.status === 200, cashflow);
  check('cashflow: cashReceived.total (150+100)', cashflow.json?.cashReceived?.total, 250);
  check('cashflow: cashReceived.byMethod.cash', cashflow.json?.cashReceived?.byMethod?.cash, 150);
  check('cashflow: cashReceived.byMethod.card', cashflow.json?.cashReceived?.byMethod?.card, 100);
  check('cashflow: cashPaidOut.expenses.total', cashflow.json?.cashPaidOut?.expenses?.total, 500);
  check('cashflow: cashPaidOut.purchasesExcluded (branch-scoped)', cashflow.json?.cashPaidOut?.purchasesExcluded, true);
  check('cashflow: cashPaidOut.total', cashflow.json?.cashPaidOut?.total, 500);
  check('cashflow: netCashFlow (250-500)', cashflow.json?.netCashFlow, -250);

  // ================= 4.10 — GET /api/finance/receivables-aging =================

  const deniedAging = await api(receptionistToken, 'GET', `/api/finance/receivables-aging?branchId=${branch.id}`);
  checkTrue('receivables-aging: receptionist => 403', deniedAging.status === 403, deniedAging);

  const aging = await api(superadminToken, 'GET', `/api/finance/receivables-aging?branchId=${branch.id}&asOf=2030-01-20`);
  checkTrue('receivables-aging: 200', aging.status === 200, aging);
  const agingItem = (aging.json?.items || []).find((i: any) => i.invoiceId === invoice1.id);
  checkTrue('receivables-aging: invoice1 (partially paid) present', !!agingItem, aging.json);
  check('receivables-aging: outstanding (200-150)', agingItem?.outstanding, 50);
  check('receivables-aging: ageDays (Jan 20 - Jan 15)', agingItem?.ageDays, 5);
  check('receivables-aging: bucket', agingItem?.bucket, '0-30');
  checkTrue(
    'receivables-aging: invoice2 (fully paid) absent',
    !(aging.json?.items || []).some((i: any) => i.invoiceId === invoice2.id)
  );

  // ================= 4.11 — GET /api/finance/budget-vs-actual =================

  const deniedBudget = await api(receptionistToken, 'GET', `/api/finance/budget-vs-actual?period=${PERIOD}&branchId=${branch.id}`);
  checkTrue('budget-vs-actual: receptionist => 403', deniedBudget.status === 403, deniedBudget);

  const budget = await api(superadminToken, 'GET', `/api/finance/budget-vs-actual?period=${PERIOD}&branchId=${branch.id}`);
  checkTrue('budget-vs-actual: 200', budget.status === 200, budget);
  const budgetItem = (budget.json?.items || [])[0];
  check('budget-vs-actual: budgeted', budgetItem?.budgeted, 300);
  check('budget-vs-actual: actual', budgetItem?.actual, 500);
  check('budget-vs-actual: variance (300-500)', budgetItem?.variance, -200);
  check('budget-vs-actual: status', budgetItem?.status, 'over_budget');

  // ================= 4.8 — GET /api/finance/doctor-pnl, GET /api/finance/branch-pnl =================

  const deniedDoctor = await api(receptionistToken, 'GET', `/api/finance/doctor-pnl?period=${PERIOD}&branchId=${branch.id}`);
  checkTrue('doctor-pnl: receptionist => 403', deniedDoctor.status === 403, deniedDoctor);
  const deniedBranchPnl = await api(receptionistToken, 'GET', `/api/finance/branch-pnl?period=${PERIOD}`);
  checkTrue('branch-pnl: receptionist => 403', deniedBranchPnl.status === 403, deniedBranchPnl);

  const doctorPnl = await api(superadminToken, 'GET', `/api/finance/doctor-pnl?period=${PERIOD}&branchId=${branch.id}`);
  checkTrue('doctor-pnl: 200', doctorPnl.status === 200, doctorPnl);
  const providerSlice = (doctorPnl.json?.providers || []).find((p: any) => p.providerId === provider.id);
  checkTrue('doctor-pnl: temp provider slice present', !!providerSlice, doctorPnl.json);
  check('doctor-pnl: provider slice revenue.total', providerSlice?.revenue?.total, 200);
  check('doctor-pnl: provider slice contributionMargin (200-50-20)', providerSlice?.contributionMargin, 130);
  check('doctor-pnl: unattributed revenue.total (uncosted product line)', doctorPnl.json?.unattributed?.revenue?.total, 100);
  check('doctor-pnl: unattributed contributionMargin', doctorPnl.json?.unattributed?.contributionMargin, 100);
  checkTrue(
    'doctor-pnl RECONCILIATION: provider + unattributed contributionMargin == pnl contributionMargin',
    round2((providerSlice?.contributionMargin || 0) + (doctorPnl.json?.unattributed?.contributionMargin || 0)) ===
      branchPnl.json?.views?.contributionMargin?.value,
    { doctorSum: round2((providerSlice?.contributionMargin || 0) + (doctorPnl.json?.unattributed?.contributionMargin || 0)), pnl: branchPnl.json?.views?.contributionMargin?.value }
  );

  const branchPnlAll = await api(superadminToken, 'GET', `/api/finance/branch-pnl?period=${PERIOD}`);
  checkTrue('branch-pnl: 200', branchPnlAll.status === 200, branchPnlAll);
  const branchSlice = (branchPnlAll.json?.branches || []).find((b: any) => b.branchId === branch.id);
  checkTrue('branch-pnl: temp branch slice present', !!branchSlice, branchPnlAll.json?.branches);
  check('branch-pnl: branch slice revenue.total', branchSlice?.revenue?.total, 300);
  check('branch-pnl: branch slice fixedOverhead.total (500+100+0)', branchSlice?.fixedOverhead?.total, 600);
  check('branch-pnl: branch slice fullyLoadedProfit (230-600)', branchSlice?.fullyLoadedProfit, -370);
  check('branch-pnl: unattributed fixedOverhead.loanInterest', branchPnlAll.json?.unattributed?.fixedOverhead?.loanInterest, expectedLoanInterest);
  checkTrue(
    'branch-pnl RECONCILIATION: branch + unattributed fullyLoadedProfit == whole-clinic pnl fullyLoadedProfit',
    round2((branchSlice?.fullyLoadedProfit || 0) + (branchPnlAll.json?.unattributed?.fullyLoadedProfit || 0)) ===
      wholeClinicPnl.json?.views?.fullyLoadedProfit?.value,
    {
      branchSum: round2((branchSlice?.fullyLoadedProfit || 0) + (branchPnlAll.json?.unattributed?.fullyLoadedProfit || 0)),
      wholeClinic: wholeClinicPnl.json?.views?.fullyLoadedProfit?.value,
    }
  );

  await runCleanup();
  console.log(failed === 0 ? '\nALL PASS' : `\n${failed} FAILED`);
  process.exit(failed === 0 ? 0 : 1);
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

main().catch(async (err) => {
  console.error('Unhandled error:', err);
  await runCleanup();
  process.exit(1);
});
