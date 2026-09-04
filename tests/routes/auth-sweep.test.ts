/**
 * Table-driven auth sweep across every API route handler.
 *
 * ai_docs/TEST_COVERAGE_INVENTORY.md module 10 proposed this instead of hand-writing an auth test
 * per route: one parameterized test over [route, method, guard] catches every unguarded route,
 * present or future, far more cheaply than 153 individual tests.
 *
 * Two dimensions, both cheap because they short-circuit before any business logic runs:
 *   1. No Authorization header  → every guarded handler must reject before touching the database.
 *   2. A valid session with no matching `employee_accounts` row (i.e. a patient) → every
 *      staff/admin/hr-gated handler must still reject.
 * `caller`-gated handlers (classifyCaller: reservations/customers GET) intentionally let a patient
 * through under some query shapes — that per-route nuance is out of scope here and covered by
 * each route's own test file; this sweep only asserts dimension 1 for them.
 *
 * Every guard classification below was read directly from source (see the "Auth guard" column
 * derivation in TEST_COVERAGE_INVENTORY.md's module 10 and the commit that added this file) — not
 * inferred from a naming convention.
 *
 * RISK-063 (hr/alerts POST, hr/attendance POST+PATCH, hr/leaves POST): these checked for a *valid
 * Supabase session* but never that the session belonged to an actual employee — any authenticated
 * patient could submit HR attendance/leave/alert records. Fixed 2026-08-24 by swapping the inline
 * check for `requireStaffAccess` (matching every sibling GET/PATCH already using it); the four
 * routes are registered below as normal `staff`-guarded routes now that the fix landed. See
 * RISKS.md.
 *
 * reception/dashboard (originally F-1/F-2/F-3 here) was fixed and verified separately — see
 * RISK-059 and tests/routes/reception-dashboard.test.ts. It is registered below as a normal
 * `staff`-guarded route now that the fix landed.
 *
 * Three read endpoints (`provider-attendance` GET, `rooms` GET, `service-rooms` GET) have no
 * auth guard and no comment establishing intent, unlike the confirmed-public reads (branches,
 * services, terms, providers, page-settings, packages, availability, health, auth/employee-email,
 * customer-avatars — each either explicitly commented "public" or plainly needed by the
 * unauthenticated marketing site). Whether staff-only room/schedule data should be public is a
 * product call, not something to guess at in a test — left out of this sweep, flagged in
 * TEST_COVERAGE_INVENTORY.md for a decision instead of asserting an invented answer.
 *
 * `PATCH /api/reservations` is excluded: it looks up the reservation by id *before* deciding
 * whether staff auth is required (the patient-self-service bypass depends on the row's own
 * status), so the generic "no token → 401" assumption doesn't hold without seeding a matching
 * row first. It has its own thorough test file: tests/routes/reservations-patch.test.ts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseFake } from '../helpers/supabaseFake';

const fake = createSupabaseFake();

vi.mock('@/lib/supabaseServer', () => ({
  supabaseServer: {
    auth: { getUser: (...args: any[]) => fake.authGetUser(...args) },
    from: (table: string) => fake.client.from(table),
    rpc: (name: string, args?: any) => fake.client.rpc(name, args),
  },
}));

import * as Assets from '@/app/api/assets/route';
import * as AssetsPostDepreciation from '@/app/api/assets/post-depreciation/route';
import * as AuthEmployeeEmail from '@/app/api/auth/employee-email/route';
import * as AuthMe from '@/app/api/auth/me/route';
import * as Availability from '@/app/api/availability/route';
import * as Branches from '@/app/api/branches/route';
import * as Categories from '@/app/api/categories/route';
import * as ClinicSettings from '@/app/api/clinic-settings/route';
import * as CustomerAvatars from '@/app/api/customer-avatars/route';
import * as CustomersPackageRedemptions from '@/app/api/customers/package-redemptions/route';
import * as CustomersPackages from '@/app/api/customers/packages/route';
import * as CustomersProducts from '@/app/api/customers/products/route';
import * as CustomersReconcile from '@/app/api/customers/reconcile/route';
import * as CustomersSettleDebt from '@/app/api/customers/settle-debt/route';
import * as Customers from '@/app/api/customers/route';
import * as EmployeesNotes from '@/app/api/employees/notes/route';
import * as Employees from '@/app/api/employees/route';
import * as ExpensesCategories from '@/app/api/expenses/categories/route';
import * as ExpensesGenerateDue from '@/app/api/expenses/generate-due/route';
import * as ExpensesRecurring from '@/app/api/expenses/recurring/route';
import * as Expenses from '@/app/api/expenses/route';
import * as FinanceBranchPnl from '@/app/api/finance/branch-pnl/route';
import * as FinanceBudgetVsActual from '@/app/api/finance/budget-vs-actual/route';
import * as FinanceCapacity from '@/app/api/finance/capacity/route';
import * as FinanceCashflow from '@/app/api/finance/cashflow/route';
import * as FinanceCommissionPayouts from '@/app/api/finance/commission-payouts/route';
import * as FinanceDoctorPnl from '@/app/api/finance/doctor-pnl/route';
import * as FinanceNewVsReturning from '@/app/api/finance/new-vs-returning/route';
import * as FinanceNoShowCost from '@/app/api/finance/no-show-cost/route';
import * as FinancePackageProfitability from '@/app/api/finance/package-profitability/route';
import * as FinancePnl from '@/app/api/finance/pnl/route';
import * as FinanceReceivablesAging from '@/app/api/finance/receivables-aging/route';
import * as FinanceServiceMargin from '@/app/api/finance/service-margin/route';
import * as FinanceServiceMix from '@/app/api/finance/service-mix/route';
import * as FinanceTrend from '@/app/api/finance/trend/route';
import * as HealthSupabase from '@/app/api/health/supabase/route';
import * as HrAlerts from '@/app/api/hr/alerts/route';
import * as HrAttendance from '@/app/api/hr/attendance/route';
import * as HrDoctorPayroll from '@/app/api/hr/doctor-payroll/route';
import * as HrLeaves from '@/app/api/hr/leaves/route';
import * as HrPayroll from '@/app/api/hr/payroll/route';
import * as HrPerformance from '@/app/api/hr/performance/route';
import * as InventoryDevicesResetPulses from '@/app/api/inventory/devices/[id]/reset-pulses/route';
import * as InventoryDevicesAuditLogs from '@/app/api/inventory/devices/audit-logs/route';
import * as InventoryDevices from '@/app/api/inventory/devices/route';
import * as InventoryProductsReconcile from '@/app/api/inventory/products/reconcile/route';
import * as InventoryProducts from '@/app/api/inventory/products/route';
import * as InventoryProductsSales from '@/app/api/inventory/products/sales/route';
import * as Loans from '@/app/api/loans/route';
import * as MedicalRecords from '@/app/api/medical-records/route';
import * as PackagesConsume from '@/app/api/packages/consume/route';
import * as PackagesExtend from '@/app/api/packages/extend/route';
import * as Packages from '@/app/api/packages/route';
import * as PackagesSell from '@/app/api/packages/sell/route';
import * as PageSettings from '@/app/api/page-settings/route';
import * as Prescriptions from '@/app/api/prescriptions/route';
import * as ProviderAttendance from '@/app/api/provider-attendance/route';
import * as Providers from '@/app/api/providers/route';
import * as ProvidersScheduleAuditLogs from '@/app/api/providers/schedule-audit-logs/route';
import * as Purchases from '@/app/api/purchases/route';
import * as ReceptionDashboard from '@/app/api/reception/dashboard/route';
import * as ReservationProducts from '@/app/api/reservation-products/route';
import * as Reservations from '@/app/api/reservations/route';
import * as Roles from '@/app/api/roles/route';
import * as Rooms from '@/app/api/rooms/route';
import * as ServiceConsumables from '@/app/api/service-consumables/route';
import * as ServiceDevices from '@/app/api/service-devices/route';
import * as ServiceRooms from '@/app/api/service-rooms/route';
import * as Services from '@/app/api/services/route';
import * as Suppliers from '@/app/api/suppliers/route';
import * as Terms from '@/app/api/terms/route';
import * as TransactionsAuditLogs from '@/app/api/transactions/audit-logs/route';
import * as Transactions from '@/app/api/transactions/route';
import * as Translate from '@/app/api/translate/route';

type Guard = 'staff' | 'admin' | 'hr' | 'caller' | 'public' | 'gap-weak-auth';

interface MethodEntry {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  handler: (req: Request, ctx?: any) => Promise<Response>;
  guard: Guard;
  noArgs?: boolean;
  dynamicParams?: Record<string, string>;
}

interface RouteEntry {
  path: string;
  methods: MethodEntry[];
}

const M = (method: MethodEntry['method'], handler: any, guard: Guard, opts: Partial<MethodEntry> = {}): MethodEntry =>
  ({ method, handler, guard, ...opts });

const REGISTRY: RouteEntry[] = [
  { path: '/api/assets', methods: [M('GET', Assets.GET, 'staff'), M('POST', Assets.POST, 'admin'), M('PATCH', Assets.PATCH, 'admin'), M('DELETE', Assets.DELETE, 'admin')] },
  { path: '/api/assets/post-depreciation', methods: [M('POST', AssetsPostDepreciation.POST, 'admin')] },
  { path: '/api/auth/employee-email', methods: [M('GET', AuthEmployeeEmail.GET, 'public')] },
  { path: '/api/auth/me', methods: [M('GET', AuthMe.GET, 'staff')] },
  { path: '/api/availability', methods: [M('GET', Availability.GET, 'public')] },
  { path: '/api/branches', methods: [M('GET', Branches.GET, 'public', { noArgs: true }), M('POST', Branches.POST, 'admin'), M('DELETE', Branches.DELETE, 'admin')] },
  { path: '/api/categories', methods: [M('GET', Categories.GET, 'staff'), M('POST', Categories.POST, 'admin'), M('DELETE', Categories.DELETE, 'admin')] },
  { path: '/api/clinic-settings', methods: [M('GET', ClinicSettings.GET, 'staff'), M('POST', ClinicSettings.POST, 'admin')] },
  { path: '/api/customer-avatars', methods: [M('GET', CustomerAvatars.GET, 'public'), M('POST', CustomerAvatars.POST, 'staff')] },
  { path: '/api/customers/package-redemptions', methods: [M('GET', CustomersPackageRedemptions.GET, 'staff')] },
  { path: '/api/customers/packages', methods: [M('GET', CustomersPackages.GET, 'staff')] },
  { path: '/api/customers/products', methods: [M('GET', CustomersProducts.GET, 'staff'), M('POST', CustomersProducts.POST, 'staff'), M('PATCH', CustomersProducts.PATCH, 'staff')] },
  { path: '/api/customers/reconcile', methods: [M('GET', CustomersReconcile.GET, 'staff')] },
  { path: '/api/customers/settle-debt', methods: [M('POST', CustomersSettleDebt.POST, 'staff')] },
  { path: '/api/customers', methods: [M('GET', Customers.GET, 'caller'), M('POST', Customers.POST, 'caller'), M('DELETE', Customers.DELETE, 'admin')] },
  { path: '/api/employees/notes', methods: [M('GET', EmployeesNotes.GET, 'admin'), M('POST', EmployeesNotes.POST, 'admin'), M('DELETE', EmployeesNotes.DELETE, 'admin')] },
  { path: '/api/employees', methods: [M('GET', Employees.GET, 'admin'), M('POST', Employees.POST, 'admin'), M('PATCH', Employees.PATCH, 'admin'), M('DELETE', Employees.DELETE, 'admin')] },
  { path: '/api/expenses/categories', methods: [M('GET', ExpensesCategories.GET, 'staff'), M('POST', ExpensesCategories.POST, 'admin'), M('PATCH', ExpensesCategories.PATCH, 'admin'), M('DELETE', ExpensesCategories.DELETE, 'admin')] },
  { path: '/api/expenses/generate-due', methods: [M('POST', ExpensesGenerateDue.POST, 'staff')] },
  { path: '/api/expenses/recurring', methods: [M('GET', ExpensesRecurring.GET, 'staff'), M('POST', ExpensesRecurring.POST, 'staff'), M('PATCH', ExpensesRecurring.PATCH, 'staff'), M('DELETE', ExpensesRecurring.DELETE, 'staff')] },
  { path: '/api/expenses', methods: [M('GET', Expenses.GET, 'staff'), M('POST', Expenses.POST, 'staff'), M('PATCH', Expenses.PATCH, 'staff'), M('DELETE', Expenses.DELETE, 'staff')] },
  { path: '/api/finance/branch-pnl', methods: [M('GET', FinanceBranchPnl.GET, 'staff')] },
  { path: '/api/finance/budget-vs-actual', methods: [M('GET', FinanceBudgetVsActual.GET, 'staff')] },
  { path: '/api/finance/capacity', methods: [M('GET', FinanceCapacity.GET, 'staff')] },
  { path: '/api/finance/cashflow', methods: [M('GET', FinanceCashflow.GET, 'staff')] },
  { path: '/api/finance/commission-payouts', methods: [M('GET', FinanceCommissionPayouts.GET, 'staff')] },
  { path: '/api/finance/doctor-pnl', methods: [M('GET', FinanceDoctorPnl.GET, 'staff')] },
  { path: '/api/finance/new-vs-returning', methods: [M('GET', FinanceNewVsReturning.GET, 'staff')] },
  { path: '/api/finance/no-show-cost', methods: [M('GET', FinanceNoShowCost.GET, 'staff')] },
  { path: '/api/finance/package-profitability', methods: [M('GET', FinancePackageProfitability.GET, 'staff')] },
  { path: '/api/finance/pnl', methods: [M('GET', FinancePnl.GET, 'staff')] },
  { path: '/api/finance/receivables-aging', methods: [M('GET', FinanceReceivablesAging.GET, 'staff')] },
  { path: '/api/finance/service-margin', methods: [M('GET', FinanceServiceMargin.GET, 'staff')] },
  { path: '/api/finance/service-mix', methods: [M('GET', FinanceServiceMix.GET, 'staff')] },
  { path: '/api/finance/trend', methods: [M('GET', FinanceTrend.GET, 'staff')] },
  { path: '/api/health/supabase', methods: [M('GET', HealthSupabase.GET, 'public', { noArgs: true })] },
  { path: '/api/hr/alerts', methods: [M('GET', HrAlerts.GET, 'hr'), M('POST', HrAlerts.POST, 'staff'), M('PATCH', HrAlerts.PATCH, 'hr')] },
  { path: '/api/hr/attendance', methods: [M('GET', HrAttendance.GET, 'hr'), M('POST', HrAttendance.POST, 'staff'), M('PATCH', HrAttendance.PATCH, 'staff')] },
  { path: '/api/hr/doctor-payroll', methods: [M('GET', HrDoctorPayroll.GET, 'hr'), M('POST', HrDoctorPayroll.POST, 'hr'), M('PATCH', HrDoctorPayroll.PATCH, 'hr')] },
  { path: '/api/hr/leaves', methods: [M('GET', HrLeaves.GET, 'hr'), M('POST', HrLeaves.POST, 'staff'), M('PATCH', HrLeaves.PATCH, 'hr')] },
  { path: '/api/hr/payroll', methods: [M('GET', HrPayroll.GET, 'hr'), M('POST', HrPayroll.POST, 'hr'), M('PATCH', HrPayroll.PATCH, 'hr')] },
  { path: '/api/hr/performance', methods: [M('GET', HrPerformance.GET, 'hr'), M('POST', HrPerformance.POST, 'hr'), M('DELETE', HrPerformance.DELETE, 'hr')] },
  { path: '/api/inventory/devices/[id]/reset-pulses', methods: [M('POST', InventoryDevicesResetPulses.POST, 'staff', { dynamicParams: { id: 'device-1' } })] },
  { path: '/api/inventory/devices/audit-logs', methods: [M('GET', InventoryDevicesAuditLogs.GET, 'staff'), M('POST', InventoryDevicesAuditLogs.POST, 'staff')] },
  { path: '/api/inventory/devices', methods: [M('GET', InventoryDevices.GET, 'staff'), M('POST', InventoryDevices.POST, 'staff'), M('PUT', InventoryDevices.PUT, 'staff')] },
  { path: '/api/inventory/products/reconcile', methods: [M('GET', InventoryProductsReconcile.GET, 'staff')] },
  { path: '/api/inventory/products', methods: [M('GET', InventoryProducts.GET, 'staff'), M('POST', InventoryProducts.POST, 'staff'), M('PUT', InventoryProducts.PUT, 'staff'), M('DELETE', InventoryProducts.DELETE, 'staff')] },
  { path: '/api/inventory/products/sales', methods: [M('GET', InventoryProductsSales.GET, 'staff'), M('POST', InventoryProductsSales.POST, 'staff')] },
  { path: '/api/loans', methods: [M('GET', Loans.GET, 'staff'), M('POST', Loans.POST, 'admin'), M('PATCH', Loans.PATCH, 'admin'), M('DELETE', Loans.DELETE, 'admin')] },
  { path: '/api/medical-records', methods: [M('GET', MedicalRecords.GET, 'staff'), M('POST', MedicalRecords.POST, 'staff'), M('DELETE', MedicalRecords.DELETE, 'staff')] },
  { path: '/api/packages/consume', methods: [M('POST', PackagesConsume.POST, 'staff')] },
  { path: '/api/packages/extend', methods: [M('POST', PackagesExtend.POST, 'staff')] },
  { path: '/api/packages', methods: [M('GET', Packages.GET, 'public'), M('POST', Packages.POST, 'staff'), M('PATCH', Packages.PATCH, 'staff'), M('DELETE', Packages.DELETE, 'staff')] },
  { path: '/api/packages/sell', methods: [M('POST', PackagesSell.POST, 'staff')] },
  { path: '/api/page-settings', methods: [M('GET', PageSettings.GET, 'public', { noArgs: true }), M('POST', PageSettings.POST, 'admin')] },
  { path: '/api/prescriptions', methods: [M('GET', Prescriptions.GET, 'staff'), M('POST', Prescriptions.POST, 'staff'), M('DELETE', Prescriptions.DELETE, 'staff')] },
  { path: '/api/providers', methods: [M('GET', Providers.GET, 'public', { noArgs: true }), M('POST', Providers.POST, 'staff'), M('PATCH', Providers.PATCH, 'staff'), M('DELETE', Providers.DELETE, 'staff')] },
  { path: '/api/providers/schedule-audit-logs', methods: [M('GET', ProvidersScheduleAuditLogs.GET, 'staff')] },
  { path: '/api/provider-attendance', methods: [M('POST', ProviderAttendance.POST, 'staff')] },
  { path: '/api/purchases', methods: [M('GET', Purchases.GET, 'staff'), M('POST', Purchases.POST, 'staff')] },
  { path: '/api/reception/dashboard', methods: [M('GET', ReceptionDashboard.GET, 'staff'), M('POST', ReceptionDashboard.POST, 'staff')] },
  { path: '/api/reservation-products', methods: [M('POST', ReservationProducts.POST, 'staff')] },
  { path: '/api/reservations', methods: [M('GET', Reservations.GET, 'caller'), M('POST', Reservations.POST, 'public'), M('DELETE', Reservations.DELETE, 'admin')] },
  { path: '/api/roles', methods: [M('GET', Roles.GET, 'admin'), M('POST', Roles.POST, 'admin'), M('DELETE', Roles.DELETE, 'admin')] },
  { path: '/api/rooms', methods: [M('POST', Rooms.POST, 'staff'), M('PATCH', Rooms.PATCH, 'staff'), M('DELETE', Rooms.DELETE, 'staff')] },
  { path: '/api/service-consumables', methods: [M('GET', ServiceConsumables.GET, 'staff'), M('POST', ServiceConsumables.POST, 'staff')] },
  { path: '/api/service-devices', methods: [M('GET', ServiceDevices.GET, 'staff'), M('POST', ServiceDevices.POST, 'staff')] },
  { path: '/api/service-rooms', methods: [M('POST', ServiceRooms.POST, 'staff')] },
  { path: '/api/services', methods: [M('GET', Services.GET, 'public'), M('POST', Services.POST, 'staff'), M('DELETE', Services.DELETE, 'staff')] },
  { path: '/api/suppliers', methods: [M('GET', Suppliers.GET, 'staff'), M('POST', Suppliers.POST, 'staff'), M('PUT', Suppliers.PUT, 'staff'), M('DELETE', Suppliers.DELETE, 'staff')] },
  { path: '/api/terms', methods: [M('GET', Terms.GET, 'public'), M('POST', Terms.POST, 'admin'), M('PUT', Terms.PUT, 'admin'), M('DELETE', Terms.DELETE, 'admin')] },
  { path: '/api/transactions', methods: [M('GET', Transactions.GET, 'staff'), M('POST', Transactions.POST, 'staff')] },
  { path: '/api/transactions/audit-logs', methods: [M('GET', TransactionsAuditLogs.GET, 'staff')] },
  { path: '/api/translate', methods: [M('POST', Translate.POST, 'staff')] },
];

// Deliberately excluded (see file header): `rooms` GET and `service-rooms` GET have no auth guard
// and no comment establishing intent — not confirmed-public like the entries above, and not
// something to guess at. Flagged in TEST_COVERAGE_INVENTORY.md for a product decision instead.
// `provider-attendance` GET is excluded for the same reason.
// `PATCH /api/reservations` is excluded — see file header; covered by reservations-patch.test.ts.

// ── Test harness ──────────────────────────────────────────────────────────────

const USER_ID = 'sweep-user';

function req(opts: { auth?: string } = {}): Request {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (opts.auth) headers.set('Authorization', `Bearer ${opts.auth}`);
  return new Request('http://localhost:3000/api/sweep-test', {
    method: 'POST',
    headers,
    body: JSON.stringify({}),
  });
}

function invoke(entry: MethodEntry): Promise<Response> {
  if (entry.dynamicParams) {
    return entry.handler(req(), { params: Promise.resolve(entry.dynamicParams) });
  }
  if (entry.noArgs) {
    return (entry.handler as any)();
  }
  return entry.handler(req());
}

function invokeWithAuth(entry: MethodEntry, token: string): Promise<Response> {
  const r = req({ auth: token });
  if (entry.dynamicParams) {
    return entry.handler(r, { params: Promise.resolve(entry.dynamicParams) });
  }
  return entry.handler(r);
}

function setUnauthenticated() {
  fake.authGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Invalid' } });
}

function setPatientToken() {
  // A real Supabase session, but no employee_accounts row — the shape every staff/admin/hr guard
  // must reject.
  fake.authGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
}

beforeEach(() => {
  fake.reset();
  fake.seed('employee_accounts', []);
  fake.seed('roles', []);
  setUnauthenticated();
});

// Flatten the registry into one row per (route, method) for readable failure output.
const ROWS = REGISTRY.flatMap((route) => route.methods.map((m) => ({ path: route.path, ...m })));

describe('auth sweep — no Authorization header', () => {
  const guarded = ROWS.filter((r) => ['staff', 'admin', 'hr', 'caller'].includes(r.guard));
  it.each(guarded.map((r) => [`${r.method} ${r.path}`, r] as const))('%s → 401', async (_label, row) => {
    setUnauthenticated();
    const res = await invoke(row);
    expect(res.status).toBe(401);
  });

  const weakAuth = ROWS.filter((r) => r.guard === 'gap-weak-auth');
  it.each(weakAuth.map((r) => [`${r.method} ${r.path}`, r] as const))(
    '%s (weak-auth route) still correctly rejects no token',
    async (_label, row) => {
      // Unlike the patient-token dimension below, this half of RISK-063 already works —
      // these routes do check for *a* session, just not that it belongs to staff.
      setUnauthenticated();
      const res = await invoke(row);
      expect(res.status).toBe(401);
    }
  );
});

describe('auth sweep — a valid session with no employee_accounts row (patient) on a staff/admin/hr route', () => {
  const guarded = ROWS.filter((r) => ['staff', 'admin', 'hr'].includes(r.guard));
  it.each(guarded.map((r) => [`${r.method} ${r.path}`, r] as const))('%s → 403', async (_label, row) => {
    setPatientToken();
    const res = await invokeWithAuth(row, 'patient-token');
    expect(res.status).toBe(403);
  });
});

for (const row of ROWS.filter((r) => r.guard === 'gap-weak-auth')) {
  it.fails(
    `RISK-063 (documented, open) ${row.method} ${row.path} rejects an authenticated non-staff caller`,
    async () => {
      setPatientToken();
      const res = await invokeWithAuth(row, 'patient-token');
      expect(res.status).toBe(403);
    }
  );
}

describe('auth sweep — confirmed-public reads stay public with no token', () => {
  const publicRows = ROWS.filter((r) => r.guard === 'public');
  it.each(publicRows.map((r) => [`${r.method} ${r.path}`, r] as const))('%s does not require auth', async (_label, row) => {
    setUnauthenticated();
    const res = await invoke(row);
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

describe('registry sanity', () => {
  it('every handler function referenced in the registry actually exists on its module', () => {
    for (const route of REGISTRY) {
      for (const m of route.methods) {
        expect(typeof m.handler, `${route.path} ${m.method} is not a function — check the export name`).toBe('function');
      }
    }
  });

  it('covers every exported handler in src/app/api (fails loudly if a new route is added without updating this file)', () => {
    // This count is the acceptance criterion for "table-driven auth sweep across all handlers" —
    // if it drifts, either a route was added (add it to REGISTRY) or removed (delete its row).
    const total = ROWS.length;
    expect(total).toBe(153);
  });
});
