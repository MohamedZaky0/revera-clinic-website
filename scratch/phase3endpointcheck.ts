// Live end-to-end verification for Phase 3 endpoints (tasks 3.10-3.12) against the dev database.
//
//   npm run dev   (in one terminal)
//   npx tsx scratch/phase3endpointcheck.ts   (in another)
//
// Creates temporary Supabase Auth users + employee_accounts rows (superadmin, staff-only, and
// staff-with-no-employee-row) to exercise real bearer tokens against every new route, including
// the allowed/denied-role paths, then deletes every row it created — including the temp users.
import { config } from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: path.resolve(__dirname, '..', '.env.local'), quiet: true });

const BASE_URL = process.env.PHASE3_CHECK_BASE_URL || 'http://localhost:3000';
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
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(64)} got=${JSON.stringify(got)} want=${JSON.stringify(want)}`);
}
function checkTrue(label: string, ok: boolean, detail?: unknown) {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(64)}${detail !== undefined ? ' ' + JSON.stringify(detail) : ''}`);
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
  const email = `phase3-check-${tag}-${stamp}@example.test`;
  const password = `Ph4se3Check!${stamp}`;

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError || !created.user) throw new Error(`createUser(${tag}) failed: ${createError?.message}`);
  cleanup.push(async () => {
    await admin.auth.admin.deleteUser(created.user!.id);
  });

  if (roleName) {
    const { error: employeeError } = await admin.from('employee_accounts').insert({
      auth_user_id: created.user.id,
      employee_id: `PH3CHK-${tag}-${stamp}`,
      role_name: roleName,
      email,
      name: `Phase 3 Check ${tag} (temp)`,
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
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
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

  const superadminToken = await createTempUser('superadmin', stamp, 'admin');
  const receptionistToken = await createTempUser('receptionist', stamp, 'staff');
  const noEmployeeToken = await createTempUser(null, stamp, 'noemp');

  // --- Denied-role sanity checks, run first, against routes that will exist regardless ---
  const noTokenRes = await api(null, 'GET', '/api/expenses');
  checkTrue('GET /api/expenses with no token => 401', noTokenRes.status === 401, noTokenRes);

  const nonStaffRes = await api(noEmployeeToken, 'GET', '/api/expenses');
  checkTrue('GET /api/expenses as authenticated non-staff => 403', nonStaffRes.status === 403, nonStaffRes);

  // ================= 3.10 — expenses / categories / recurring / generate-due =================

  const catRes = await api(superadminToken, 'POST', '/api/expenses/categories', {
    name: `Test Utilities ${stamp}`,
    kind: 'fixed',
  });
  checkTrue('create expense category (staff) => 201', catRes.status === 201, catRes);
  const categoryId = catRes.json?.id;
  if (categoryId) cleanup.push(async () => { await admin.from('expense_categories').delete().eq('id', categoryId); });

  const badCatRes = await api(superadminToken, 'POST', '/api/expenses/categories', { name: 'Bad kind', kind: 'bogus' });
  checkTrue('reject invalid category kind => 400', badCatRes.status === 400, badCatRes);

  const patchCatRes = await api(superadminToken, 'PATCH', `/api/expenses/categories?id=${categoryId}`, {
    name: `Test Utilities Renamed ${stamp}`,
  });
  checkTrue('rename expense category => 200', patchCatRes.status === 200, patchCatRes);
  check('renamed category name persisted', patchCatRes.json?.name, `Test Utilities Renamed ${stamp}`);

  const expenseRes = await api(superadminToken, 'POST', '/api/expenses', {
    categoryId,
    incurredOn: '2026-01-15',
    amount: 500,
    vendor: 'Test Vendor',
  });
  checkTrue('create expense (staff) => 201', expenseRes.status === 201, expenseRes);
  const expenseId = expenseRes.json?.id;
  if (expenseId) cleanup.push(async () => { await admin.from('expenses').delete().eq('id', expenseId); });

  const badAmountRes = await api(superadminToken, 'POST', '/api/expenses', {
    categoryId,
    incurredOn: '2026-01-15',
    amount: 0,
  });
  checkTrue('reject amount <= 0 => 400', badAmountRes.status === 400, badAmountRes);

  const listRes = await api(superadminToken, 'GET', `/api/expenses?categoryId=${categoryId}`);
  checkTrue('list expenses filtered by categoryId includes the created row', (listRes.json || []).some((e: any) => e.id === expenseId), listRes);

  const restrictRes = await api(superadminToken, 'DELETE', `/api/expenses/categories?id=${categoryId}`);
  checkTrue('deleting a category with expenses against it is restricted => 409', restrictRes.status === 409, restrictRes);

  // Recurring expense: nextDueOn just before "today" so one cadence step lands after it.
  const recurringRes = await api(superadminToken, 'POST', '/api/expenses/recurring', {
    categoryId,
    amount: 250,
    cadence: 'monthly',
    nextDueOn: '2026-07-20',
  });
  checkTrue('create recurring expense => 201', recurringRes.status === 201, recurringRes);
  const recurringId = recurringRes.json?.id;
  if (recurringId) cleanup.push(async () => { await admin.from('recurring_expenses').delete().eq('id', recurringId); });

  const badCadenceRes = await api(superadminToken, 'POST', '/api/expenses/recurring', {
    categoryId,
    amount: 100,
    cadence: 'daily',
    nextDueOn: '2026-07-20',
  });
  checkTrue('reject invalid cadence => 400', badCadenceRes.status === 400, badCadenceRes);

  const genRes1 = await api(superadminToken, 'POST', '/api/expenses/generate-due', { asOf: '2026-07-27' });
  const firstGenerated = (genRes1.json?.generated || []).find((e: any) => e.recurring_id === recurringId);
  checkTrue('generate-due creates exactly one row for the overdue template', !!firstGenerated, genRes1);
  if (firstGenerated) cleanup.push(async () => { await admin.from('expenses').delete().eq('id', firstGenerated.id); });
  check('generated expense is dated on the template\'s pre-advance next_due_on', firstGenerated?.incurred_on, '2026-07-20');

  const { data: afterFirstGen } = await admin.from('recurring_expenses').select('next_due_on').eq('id', recurringId).single();
  check('next_due_on advances by exactly one month', afterFirstGen?.next_due_on, '2026-08-20');

  const genRes2 = await api(superadminToken, 'POST', '/api/expenses/generate-due', { asOf: '2026-07-27' });
  const secondGenerated = (genRes2.json?.generated || []).filter((e: any) => e.recurring_id === recurringId);
  check('calling generate-due again the same day does not duplicate (now-future next_due_on)', secondGenerated.length, 0);

  // ================= 3.11 — fixed assets + depreciation posting =================

  const assetDeniedRes = await api(receptionistToken, 'POST', '/api/assets', {
    category: 'it',
    name: 'Denied asset',
    purchasedOn: '2026-01-01',
    cost: 100,
    usefulLifeMonths: 12,
  });
  checkTrue('create asset as staff (non-admin) is denied => 403', assetDeniedRes.status === 403, assetDeniedRes);

  const assetRes = await api(superadminToken, 'POST', '/api/assets', {
    category: 'it',
    name: `Test Laptop ${stamp}`,
    purchasedOn: '2026-01-01',
    cost: 1200,
    usefulLifeMonths: 24,
    salvageValue: 0,
  });
  checkTrue('create fixed asset (admin) => 201', assetRes.status === 201, assetRes);
  const assetId = assetRes.json?.id;
  if (assetId) cleanup.push(async () => { await admin.from('fixed_assets').delete().eq('id', assetId); });

  const badCategoryAssetRes = await api(superadminToken, 'POST', '/api/assets', {
    category: 'bogus',
    name: 'Bad category',
    purchasedOn: '2026-01-01',
    cost: 100,
    usefulLifeMonths: 12,
  });
  checkTrue('reject invalid asset category => 400', badCategoryAssetRes.status === 400, badCategoryAssetRes);

  const postRes1 = await api(superadminToken, 'POST', '/api/assets/post-depreciation', { period: '2026-08' });
  const postedEntry = (postRes1.json?.posted || []).find((e: any) => e.asset_id === assetId);
  checkTrue('first post-depreciation call posts this asset', !!postedEntry, postRes1);
  check('posted amount matches straight-line formula: (1200-0)/24', postedEntry?.amount, 50);
  check('book value after first posting', postedEntry?.book_value_after, 1150);

  const postRes2 = await api(superadminToken, 'POST', '/api/assets/post-depreciation', { period: '2026-08' });
  const skippedEntry = (postRes2.json?.skipped || []).find((e: any) => e.assetId === assetId);
  checkTrue('second post-depreciation call for same period skips it (idempotent)', !!skippedEntry, postRes2);
  const { data: entryRowsForPeriod } = await admin
    .from('depreciation_entries')
    .select('id')
    .eq('asset_id', assetId)
    .eq('period', '2026-08');
  check('exactly one depreciation_entries row exists for this asset/period', (entryRowsForPeriod || []).length, 1);

  // Dedicated short-lived asset to exercise the fully_depreciated status flip within 2 periods.
  const shortAssetRes = await api(superadminToken, 'POST', '/api/assets', {
    category: 'it',
    name: `Test Short-Life Device ${stamp}`,
    purchasedOn: '2026-01-01',
    cost: 100,
    usefulLifeMonths: 2,
    salvageValue: 0,
  });
  const shortAssetId = shortAssetRes.json?.id;
  if (shortAssetId) cleanup.push(async () => { await admin.from('fixed_assets').delete().eq('id', shortAssetId); });

  await api(superadminToken, 'POST', '/api/assets/post-depreciation', { period: '2026-09' });
  const secondPostRes = await api(superadminToken, 'POST', '/api/assets/post-depreciation', { period: '2026-10' });
  const finalEntry = (secondPostRes.json?.posted || []).find((e: any) => e.asset_id === shortAssetId);
  checkTrue('short-life asset posts its second and final period', !!finalEntry, secondPostRes);
  check('book value reaches exactly salvage value (0) after full useful life', finalEntry?.book_value_after, 0);

  const { data: shortAssetAfter } = await admin.from('fixed_assets').select('status').eq('id', shortAssetId).single();
  check('status flips to fully_depreciated once book value reaches salvage_value', shortAssetAfter?.status, 'fully_depreciated');

  const thirdPostRes = await api(superadminToken, 'POST', '/api/assets/post-depreciation', { period: '2026-11' });
  // Once status flips to fully_depreciated, the asset is no longer 'active' and is correctly
  // excluded from the query entirely — it won't appear in either posted or skipped. The real
  // invariant is that no further depreciation_entries row gets created for it.
  const touchedThirdRun = [...(thirdPostRes.json?.posted || []), ...(thirdPostRes.json?.skipped || [])].some(
    (e: any) => (e.asset_id || e.assetId) === shortAssetId
  );
  checkTrue('a fully depreciated asset is no longer touched by later posting runs', !touchedThirdRun, thirdPostRes);
  const { data: shortAssetEntriesAfter } = await admin.from('depreciation_entries').select('period').eq('asset_id', shortAssetId);
  check('fully depreciated asset still has exactly its 2 historical entries, no more', (shortAssetEntriesAfter || []).length, 2);

  // ================= 3.12 — loans + schedule generation =================

  const loanDeniedRes = await api(receptionistToken, 'POST', '/api/loans', {
    lender: 'Denied Bank',
    principal: 1000,
    termMonths: 12,
    startedOn: '2026-01-01',
    installment: 100,
  });
  checkTrue('create loan as staff (non-admin) is denied => 403', loanDeniedRes.status === 403, loanDeniedRes);

  const loanRes = await api(superadminToken, 'POST', '/api/loans', {
    lender: `Test Bank ${stamp}`,
    principal: 12000,
    annualRate: 0,
    termMonths: 12,
    startedOn: '2026-01-01',
    installment: 1000,
  });
  checkTrue('create loan (admin) => 201', loanRes.status === 201, loanRes);
  const loanId = loanRes.json?.loan?.id;
  if (loanId) cleanup.push(async () => { await admin.from('loans').delete().eq('id', loanId); });

  const schedule = loanRes.json?.schedule || [];
  const principalSum = Math.round(schedule.reduce((sum: number, row: any) => sum + Number(row.principal_part), 0) * 100) / 100;
  check('schedule principal_part sums exactly to principal', principalSum, 12000);
  check('final period balance_after is exactly 0', schedule[schedule.length - 1]?.balance_after, 0);

  const tooLowInstallmentRes = await api(superadminToken, 'POST', '/api/loans', {
    lender: 'Bad Loan',
    principal: 10000,
    annualRate: 12,
    termMonths: 12,
    startedOn: '2026-01-01',
    installment: 50, // interest alone is 100/month — this can never amortize
  });
  checkTrue('installment below period interest is rejected before any DB write => 400', tooLowInstallmentRes.status === 400, tooLowInstallmentRes);
  const { data: badLoanRows } = await admin.from('loans').select('id').eq('lender', 'Bad Loan');
  check('rejected loan creation left no orphaned loan row', (badLoanRows || []).length, 0);

  const getLoanRes = await api(superadminToken, 'GET', `/api/loans?id=${loanId}`);
  check('GET single loan returns the full persisted schedule', (getLoanRes.json?.schedule || []).length, schedule.length);

  const patchRejectRes = await api(superadminToken, 'PATCH', `/api/loans?id=${loanId}`, { principal: 99999 });
  checkTrue("PATCH rejects changing principal after schedule generation => 400", patchRejectRes.status === 400, patchRejectRes);

  const patchLenderRes = await api(superadminToken, 'PATCH', `/api/loans?id=${loanId}`, { lender: 'Renamed Bank' });
  checkTrue('PATCH allows renaming the lender => 200', patchLenderRes.status === 200, patchLenderRes);

  // Opening loan: single lump entry, then continues amortizing from the remaining balance.
  const openingLoanRes = await api(superadminToken, 'POST', '/api/loans', {
    lender: `Test Opening Bank ${stamp}`,
    principal: 50000,
    annualRate: 12,
    termMonths: 24,
    startedOn: '2025-01-01',
    installment: 2500,
    isOpening: true,
    openingBalance: 30000,
    openingAsOf: '2026-07',
  });
  checkTrue('create opening loan => 201', openingLoanRes.status === 201, openingLoanRes);
  const openingLoanId = openingLoanRes.json?.loan?.id;
  if (openingLoanId) cleanup.push(async () => { await admin.from('loans').delete().eq('id', openingLoanId); });

  const openingSchedule = openingLoanRes.json?.schedule || [];
  check('opening loan: first schedule row is the lump opening entry', openingSchedule[0]?.is_opening, true);
  check('opening loan: lump entry balance_after equals openingBalance', openingSchedule[0]?.balance_after, 30000);
  check(
    'opening loan: lump entry principal_part equals principal - openingBalance',
    openingSchedule[0]?.principal_part,
    20000
  );
  checkTrue(
    'opening loan: all subsequent rows are not is_opening',
    openingSchedule.slice(1).every((row: any) => row.is_opening === false)
  );

  await runCleanup();
  console.log(failed === 0 ? '\nALL PASS' : `\n${failed} FAILED`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.error('Unhandled error:', err);
  await runCleanup();
  process.exit(1);
});
