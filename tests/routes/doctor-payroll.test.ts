/**
 * Route-level tests for GET/POST/PATCH /api/hr/doctor-payroll.
 *
 * This is the "doctor finishes a session → commission shows up in payroll → HR
 * marks it paid" flow: a reservation is completed, `computeCommission()` (see
 * tests/lib/costing.test.ts) writes a `commission_snapshot` onto that reservation's
 * invoice_lines at checkout time, and this route later sums those snapshots per
 * doctor/month into `doctor_payroll` rows.
 *
 * Mocks @/lib/supabaseServer with a tiny in-memory table store (not a real DB) so
 * these run without Supabase — good enough to exercise this route's actual
 * filtering/aggregation logic, which is the part with no coverage at all today.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseFake } from '../helpers/supabaseFake';

// ── Fixed UUIDs (route validates id format with a UUID regex) ───────────────
const PROV_A = '11111111-1111-1111-1111-111111111111';
const PROV_B = '22222222-2222-2222-2222-222222222222';
const RES_1 = 'a1111111-1111-1111-1111-111111111111'; // prov A, completed, Jan
const RES_2 = 'a2222222-2222-2222-2222-222222222222'; // prov A, completed, Jan
const RES_3 = 'a3333333-3333-3333-3333-333333333333'; // prov A, pending (not completed), Jan
const RES_4 = 'a4444444-4444-4444-4444-444444444444'; // prov B, completed, Jan — must not leak into A's total
const INV_1 = 'b1111111-1111-1111-1111-111111111111';
const INV_2 = 'b2222222-2222-2222-2222-222222222222';
const INV_4 = 'b4444444-4444-4444-4444-444444444444';
const DP_1 = 'c1111111-1111-1111-1111-111111111111';
const EMP_HR = 'd1111111-1111-1111-1111-111111111111';
const EMP_RECEPTION = 'd2222222-2222-2222-2222-222222222222';
const USER_HR = 'e1111111-1111-1111-1111-111111111111';
const USER_RECEPTION = 'e2222222-2222-2222-2222-222222222222';

// ── In-memory Supabase (shared helper) ───────────────────────────────────────

const fake = createSupabaseFake();
const mockDb = fake.db;
const mockAuthGetUser = fake.authGetUser;

vi.mock('@/lib/supabaseServer', () => ({
  supabaseServer: {
    auth: { getUser: (...args: any[]) => fake.authGetUser(...args) },
    from: (table: string) => fake.client.from(table),
  },
}));

import { GET, POST, PATCH } from '@/app/api/hr/doctor-payroll/route';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(opts: { headers?: Record<string, string>; body?: any } = {}): Request {
  const headers = new Headers(opts.headers);
  if (opts.body !== undefined) {
    headers.set('content-type', 'application/json');
    return new Request('http://localhost:3000/api/hr/doctor-payroll', {
      method: 'POST',
      headers,
      body: JSON.stringify(opts.body),
    });
  }
  return new Request('http://localhost:3000/api/hr/doctor-payroll', { headers });
}

function hrReq(opts: { body?: any } = {}) {
  return makeReq({ ...opts, headers: { Authorization: 'Bearer hr-token' } });
}

function seedHrAuth() {
  mockAuthGetUser.mockResolvedValue({ data: { user: { id: USER_HR } }, error: null });
  mockDb.employee_accounts.push({ id: EMP_HR, role_name: 'hr', auth_user_id: USER_HR });
}

function seedNonHrAuth() {
  mockAuthGetUser.mockResolvedValue({ data: { user: { id: USER_RECEPTION } }, error: null });
  mockDb.employee_accounts.push({ id: EMP_RECEPTION, role_name: 'reception', auth_user_id: USER_RECEPTION });
}

beforeEach(() => {
  vi.clearAllMocks();
  fake.reset();
  for (const t of ['employee_accounts', 'providers', 'reservations', 'services', 'invoices', 'invoice_lines', 'doctor_payroll']) {
    fake.seed(t, []);
  }
});

// ── Auth guard ────────────────────────────────────────────────────────────────

describe('auth guard', () => {
  it('GET with no Authorization header → 401', async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it('GET with a non-HR staff token → 403', async () => {
    seedNonHrAuth();
    const res = await GET(hrReq());
    expect(res.status).toBe(403);
  });

  it('POST with no Authorization header → 401', async () => {
    const res = await POST(makeReq({ body: { month: '2026-02' } }));
    expect(res.status).toBe(401);
  });

  it('PATCH with no Authorization header → 401', async () => {
    const res = await PATCH(makeReq({ body: { id: DP_1, status: 'Paid' } }));
    expect(res.status).toBe(401);
  });
});

// ── GET: aggregation across doctors/months ───────────────────────────────────

describe('GET /api/hr/doctor-payroll — commission aggregation', () => {
  beforeEach(() => {
    seedHrAuth();
    mockDb.doctor_payroll.push({
      id: DP_1, provider_id: PROV_A, month: '2026-01',
      fixed_salary: 5000, commission_type: 'percentage', commission_value: 15,
      completed_services_count: 0, total_commission_earned: 0, net_salary: 0, status: 'Draft',
    });
    mockDb.providers.push(
      { id: PROV_A, name: 'Dr. Sara', specialty: 'Dermatology' },
      { id: PROV_B, name: 'Dr. Omar', specialty: 'Dermatology' },
    );
    mockDb.reservations.push(
      { id: RES_1, provider_id: PROV_A, status: 'completed', date: '2026-01-10', amount_paid: 500, amount_left: 0, service_id: 1 },
      { id: RES_2, provider_id: PROV_A, status: 'completed', date: '2026-01-15', amount_paid: 300, amount_left: 0, service_id: 1 },
      { id: RES_3, provider_id: PROV_A, status: 'pending', date: '2026-01-20', amount_paid: 0, amount_left: 0, service_id: 1 },
      { id: RES_4, provider_id: PROV_B, status: 'completed', date: '2026-01-11', amount_paid: 400, amount_left: 0, service_id: 1 },
    );
    mockDb.services.push({ id: 1, price: 500 });
    mockDb.invoices.push(
      { id: INV_1, reservation_id: RES_1 },
      { id: INV_2, reservation_id: RES_2 },
      { id: INV_4, reservation_id: RES_4 },
    );
    mockDb.invoice_lines.push(
      { invoice_id: INV_1, commission_snapshot: 75 },
      { invoice_id: INV_2, commission_snapshot: 45 },
      { invoice_id: INV_4, commission_snapshot: 1000 }, // belongs to Dr. Omar — must not leak into Dr. Sara's total
    );
  });

  it('sums only this doctor\'s completed-reservation commission snapshots for the month', async () => {
    const res = await GET(hrReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    const row = body[0];
    expect(row.calculated_commission).toBe(120); // 75 + 45, NOT +1000 from Dr. Omar
    expect(row.net_salary).toBe(5120); // 5000 fixed + 120 commission
  });

  it('excludes non-completed reservations from the count and value', async () => {
    const res = await GET(hrReq());
    const body = await res.json();
    const row = body[0];
    expect(row.reservations_count).toBe(2); // RES_1, RES_2 — RES_3 is still pending
    expect(row.total_reservations_value).toBe(800); // 500 + 300, RES_3 excluded
  });
});

// ── POST: run payroll for a month ────────────────────────────────────────────

describe('POST /api/hr/doctor-payroll — run payroll', () => {
  beforeEach(() => {
    seedHrAuth();
    mockDb.providers.push({
      id: PROV_A, name: 'Dr. Sara', fixed_salary: 5000,
      commission_type: 'percentage', commission_value: 15, commission_fixed_component: 0,
    });
    mockDb.reservations.push(
      { id: RES_1, provider_id: PROV_A, status: 'completed', date: '2026-02-05', amount_paid: 1000, amount_left: 0, service_id: 1 },
      { id: RES_2, provider_id: PROV_A, status: 'cancelled', date: '2026-02-06', amount_paid: 0, amount_left: 0, service_id: 1 },
    );
    mockDb.services.push({ id: 1, price: 1000 });
    mockDb.invoices.push({ id: INV_1, reservation_id: RES_1 });
    mockDb.invoice_lines.push({ invoice_id: INV_1, commission_snapshot: 150 });
  });

  it('rejects a malformed month without touching payroll', async () => {
    const res = await POST(hrReq({ body: { month: '02-2026' } }));
    expect(res.status).toBe(400);
    expect(mockDb.doctor_payroll).toHaveLength(0);
  });

  it('creates a Draft payroll row summing commission from completed reservations only', async () => {
    const res = await POST(hrReq({ body: { month: '2026-02' } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.count).toBe(1);

    const row = mockDb.doctor_payroll.find((r) => r.provider_id === PROV_A && r.month === '2026-02');
    expect(row).toBeDefined();
    expect(row!.completed_services_count).toBe(1); // cancelled RES_2 excluded
    expect(row!.total_commission_earned).toBe(150);
    expect(row!.net_salary).toBe(5150); // 5000 + 150
    expect(row!.status).toBe('Draft');
  });

  it('re-running the same month upserts instead of duplicating', async () => {
    await POST(hrReq({ body: { month: '2026-02' } }));
    await POST(hrReq({ body: { month: '2026-02' } }));
    const rows = mockDb.doctor_payroll.filter((r) => r.provider_id === PROV_A && r.month === '2026-02');
    expect(rows).toHaveLength(1);
  });
});

// ── PATCH: mark paid / recompute ─────────────────────────────────────────────

describe('PATCH /api/hr/doctor-payroll — status changes and recompute', () => {
  beforeEach(() => {
    seedHrAuth();
    mockDb.doctor_payroll.push({
      id: DP_1, provider_id: PROV_A, month: '2026-01',
      fixed_salary: 5000, commission_type: 'percentage', commission_value: 15,
      completed_services_count: 0, total_commission_earned: 0, net_salary: 5000, status: 'Draft',
    });
    mockDb.reservations.push(
      { id: RES_1, provider_id: PROV_A, status: 'completed', date: '2026-01-10' },
      { id: RES_2, provider_id: PROV_A, status: 'completed', date: '2026-01-15' },
    );
    mockDb.invoices.push({ id: INV_1, reservation_id: RES_1 }, { id: INV_2, reservation_id: RES_2 });
    mockDb.invoice_lines.push(
      { invoice_id: INV_1, commission_snapshot: 75 },
      { invoice_id: INV_2, commission_snapshot: 45 },
    );
  });

  it('requires an id', async () => {
    const res = await PATCH(hrReq({ body: { status: 'Paid' } }));
    expect(res.status).toBe(400);
  });

  it('404s for an unknown id', async () => {
    const res = await PATCH(hrReq({ body: { id: 'does-not-exist', status: 'Paid' } }));
    expect(res.status).toBe(404);
  });

  it('marking Paid sets payment_date and recomputes commission from live invoice_lines', async () => {
    const res = await PATCH(hrReq({ body: { id: DP_1, status: 'Paid' } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('Paid');
    expect(body.payment_date).toBeTruthy();
    expect(body.total_commission_earned).toBe(120); // 75 + 45, recomputed even though not supplied
    expect(body.net_salary).toBe(5120);
  });

  it('moving away from Paid clears payment_date', async () => {
    await PATCH(hrReq({ body: { id: DP_1, status: 'Paid' } }));
    const res = await PATCH(hrReq({ body: { id: DP_1, status: 'Draft' } }));
    const body = await res.json();
    expect(body.status).toBe('Draft');
    expect(body.payment_date).toBeNull();
  });

  it('explicit total_commission_earned override is respected, not recomputed', async () => {
    const res = await PATCH(hrReq({ body: { id: DP_1, status: 'Paid', total_commission_earned: 999 } }));
    const body = await res.json();
    expect(body.total_commission_earned).toBe(999);
    expect(body.net_salary).toBe(5999); // 5000 + 999, using the override
  });

  // KNOWN FAILURE — RISK-015. Once payroll is paid out, the figure is a record of money that
  // actually left the clinic; a session completed afterwards must land in a later month's payroll,
  // not silently rewrite what was already paid. The route currently recomputes on every PATCH
  // (doctor-payroll/route.ts:286-315), so this fails today. `it.fails` keeps the suite honest:
  // it goes red the moment the bug is fixed, which is the signal to delete this marker and let the
  // test guard the fixed behaviour for real.
  it.fails('a Paid payroll record is immutable — a later session does not change what was paid', async () => {
    await PATCH(hrReq({ body: { id: DP_1, status: 'Paid' } })); // Paid, total_commission_earned = 120

    // A third session for the same doctor/month completes after payout.
    const RES_3_LOCAL = 'a3333333-3333-3333-3333-333333333333';
    const INV_3_LOCAL = 'b3333333-3333-3333-3333-333333333333';
    mockDb.reservations.push({ id: RES_3_LOCAL, provider_id: PROV_A, status: 'completed', date: '2026-01-20' });
    mockDb.invoices.push({ id: INV_3_LOCAL, reservation_id: RES_3_LOCAL });
    mockDb.invoice_lines.push({ invoice_id: INV_3_LOCAL, commission_snapshot: 60 });

    const res = await PATCH(hrReq({ body: { id: DP_1, status: 'Paid' } }));
    const body = await res.json();
    expect(body.total_commission_earned).toBe(120); // unchanged — the 60 belongs to a later payroll run — the 60 belongs to a later payroll run
  });
});
