/**
 * Route-level tests for GET/POST /api/reception/dashboard — the reception shift start/end flow.
 *
 * Covers the three defects found during the test-coverage sweep (ai_docs/TEST_COVERAGE_INVENTORY.md
 * F-1/F-2/F-3, logged as RISK-059):
 *  - F-1: POST had no authentication at all.
 *  - F-2: with no `employeeId` supplied, the route guessed the first Reception-dept employee —
 *    two receptionists on shift meant one silently recorded the other's attendance.
 *  - F-3: `start_shift` upserted `check_out_time: null` unconditionally, wiping an already-ended
 *    shift's end time and reopening it.
 *
 * Mocks @/lib/supabaseServer with the shared in-memory fake so these run without a live database.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseFake } from '../helpers/supabaseFake';

// ── Fixed UUIDs ───────────────────────────────────────────────────────────────
const EMP_RECEPTION_A = 'a1111111-1111-1111-1111-111111111111'; // 'Reception' dept, role receptionist
const EMP_RECEPTION_B = 'a2222222-2222-2222-2222-222222222222'; // second receptionist, same dept
const EMP_HR = 'a3333333-3333-3333-3333-333333333333';
const EMP_DOCTOR = 'a4444444-4444-4444-4444-444444444444';
const USER_RECEPTION_A = 'b1111111-1111-1111-1111-111111111111';
const USER_RECEPTION_B = 'b2222222-2222-2222-2222-222222222222';
const USER_HR = 'b3333333-3333-3333-3333-333333333333';
const USER_DOCTOR = 'b4444444-4444-4444-4444-444444444444';

const TODAY = new Date().toISOString().split('T')[0];

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

import { GET, POST } from '@/app/api/reception/dashboard/route';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(opts: { method?: string; headers?: Record<string, string>; body?: any; url?: string } = {}): Request {
  const headers = new Headers(opts.headers);
  const url = opts.url || 'http://localhost:3000/api/reception/dashboard';
  if (opts.body !== undefined) {
    headers.set('content-type', 'application/json');
    return new Request(url, { method: opts.method || 'POST', headers, body: JSON.stringify(opts.body) });
  }
  return new Request(url, { method: opts.method || 'GET', headers });
}

function authedReq(token: string, opts: { method?: string; body?: any; url?: string } = {}) {
  return makeReq({ ...opts, headers: { Authorization: `Bearer ${token}` } });
}

function seedReceptionAuth() {
  mockAuthGetUser.mockResolvedValue({ data: { user: { id: USER_RECEPTION_A } }, error: null });
  mockDb.employee_accounts.push(
    { id: EMP_RECEPTION_A, role_name: 'receptionist', department: 'Reception', auth_user_id: USER_RECEPTION_A },
    { id: EMP_RECEPTION_B, role_name: 'receptionist', department: 'Reception', auth_user_id: USER_RECEPTION_B },
  );
}

function seedHrAuth() {
  mockAuthGetUser.mockResolvedValue({ data: { user: { id: USER_HR } }, error: null });
  mockDb.employee_accounts.push({ id: EMP_HR, role_name: 'hr', auth_user_id: USER_HR });
}

function seedDoctorAuth() {
  mockAuthGetUser.mockResolvedValue({ data: { user: { id: USER_DOCTOR } }, error: null });
  mockDb.employee_accounts.push({ id: EMP_DOCTOR, role_name: 'doctor', auth_user_id: USER_DOCTOR });
}

beforeEach(() => {
  vi.clearAllMocks();
  fake.reset();
  for (const t of ['employee_accounts', 'hr_attendance', 'reservations', 'services']) {
    fake.seed(t, []);
  }
});

// ── Auth guard (F-1) ──────────────────────────────────────────────────────────

describe('auth guard', () => {
  it('GET with no Authorization header → 401', async () => {
    const res = await GET(makeReq({ method: 'GET' }));
    expect(res.status).toBe(401);
  });

  it('POST with no Authorization header → 401', async () => {
    const res = await POST(makeReq({ body: { action: 'start_shift' } }));
    expect(res.status).toBe(401);
  });

  it('GET with a non-reception/non-HR (doctor) token → 403', async () => {
    seedDoctorAuth();
    const res = await GET(authedReq('doctor-token'));
    expect(res.status).toBe(403);
  });

  it('POST with a non-reception/non-HR (doctor) token → 403', async () => {
    seedDoctorAuth();
    const res = await POST(authedReq('doctor-token', { body: { action: 'start_shift' } }));
    expect(res.status).toBe(403);
  });

  it('GET with a valid reception token → 200', async () => {
    seedReceptionAuth();
    const res = await GET(authedReq('reception-token', { url: `http://localhost:3000/api/reception/dashboard?employeeId=${EMP_RECEPTION_A}` }));
    expect(res.status).toBe(200);
  });
});

// ── start_shift / end_shift happy path ────────────────────────────────────────

describe('POST start_shift / end_shift', () => {
  it("start_shift writes check_in_time and status Present for today", async () => {
    seedReceptionAuth();
    const res = await POST(authedReq('reception-token', { body: { action: 'start_shift' } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.attendance.status).toBe('Present');
    expect(body.attendance.check_in_time).toBeTruthy();
    expect(body.attendance.check_out_time).toBeNull();

    const row = mockDb.hr_attendance.find((r) => r.employee_id === EMP_RECEPTION_A && r.date === TODAY);
    expect(row).toBeDefined();
    expect(row!.check_in_time).toBeTruthy();
  });

  it("end_shift writes check_out_time for today's row only", async () => {
    seedReceptionAuth();
    // A row for yesterday must be untouched by end_shift.
    mockDb.hr_attendance.push(
      { id: 'att-yday', employee_id: EMP_RECEPTION_A, date: '2020-01-01', check_in_time: '2020-01-01T09:00:00.000Z', check_out_time: null, status: 'Present' },
    );
    await POST(authedReq('reception-token', { body: { action: 'start_shift' } }));
    const res = await POST(authedReq('reception-token', { body: { action: 'end_shift' } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.attendance.check_out_time).toBeTruthy();

    const todayRow = mockDb.hr_attendance.find((r) => r.employee_id === EMP_RECEPTION_A && r.date === TODAY);
    expect(todayRow!.check_out_time).toBeTruthy();
    const yesterdayRow = mockDb.hr_attendance.find((r) => r.date === '2020-01-01');
    expect(yesterdayRow!.check_out_time).toBeNull();
  });

  it('an invalid action returns 400 without touching hr_attendance', async () => {
    seedReceptionAuth();
    const res = await POST(authedReq('reception-token', { body: { action: 'bogus' } }));
    expect(res.status).toBe(400);
    expect(mockDb.hr_attendance).toHaveLength(0);
  });

  it('end_shift with no open shift returns a clear error rather than a 500', async () => {
    seedReceptionAuth();
    const res = await POST(authedReq('reception-token', { body: { action: 'end_shift' } }));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBeTruthy();
  });
});

// ── F-3: start_shift must not wipe an existing check_out_time ────────────────

describe('F-3 — start_shift idempotency', () => {
  it('start_shift on an already-ended shift does not erase check_out_time', async () => {
    seedReceptionAuth();
    mockDb.hr_attendance.push({
      id: 'att-1', employee_id: EMP_RECEPTION_A, date: TODAY,
      check_in_time: '2026-08-19T07:00:00.000Z', check_out_time: '2026-08-19T15:00:00.000Z', status: 'Present',
    });

    const res = await POST(authedReq('reception-token', { body: { action: 'start_shift' } }));
    expect(res.status).toBe(409);

    const row = mockDb.hr_attendance.find((r) => r.employee_id === EMP_RECEPTION_A && r.date === TODAY);
    expect(row!.check_out_time).toBe('2026-08-19T15:00:00.000Z');
  });

  it('re-firing start_shift while already in progress is a harmless no-op', async () => {
    seedReceptionAuth();
    mockDb.hr_attendance.push({
      id: 'att-1', employee_id: EMP_RECEPTION_A, date: TODAY,
      check_in_time: '2026-08-19T07:00:00.000Z', check_out_time: null, status: 'Present',
    });

    const res = await POST(authedReq('reception-token', { body: { action: 'start_shift' } }));
    expect(res.status).toBe(200);

    const row = mockDb.hr_attendance.find((r) => r.employee_id === EMP_RECEPTION_A && r.date === TODAY);
    expect(row!.check_in_time).toBe('2026-08-19T07:00:00.000Z'); // unchanged, not reset to "now"
    expect(row!.check_out_time).toBeNull();
  });
});

// ── F-2: must not guess the wrong receptionist ────────────────────────────────

describe('F-2 — employee resolution', () => {
  it('with two Reception employees and no employeeId, start_shift clocks in the authenticated caller, not an arbitrary one', async () => {
    seedReceptionAuth();
    mockAuthGetUser.mockResolvedValue({ data: { user: { id: USER_RECEPTION_B } }, error: null });

    const res = await POST(authedReq('reception-b-token', { body: { action: 'start_shift' } }));
    expect(res.status).toBe(200);

    const rowA = mockDb.hr_attendance.find((r) => r.employee_id === EMP_RECEPTION_A && r.date === TODAY);
    const rowB = mockDb.hr_attendance.find((r) => r.employee_id === EMP_RECEPTION_B && r.date === TODAY);
    expect(rowA).toBeUndefined();
    expect(rowB).toBeDefined();
  });

  it('a receptionist cannot clock in on behalf of another employeeId supplied in the body', async () => {
    seedReceptionAuth(); // authenticated as EMP_RECEPTION_A
    const res = await POST(authedReq('reception-token', { body: { action: 'start_shift', employeeId: EMP_RECEPTION_B } }));
    expect(res.status).toBe(200);

    // The body's employeeId is ignored for a receptionist caller — only their own session identity counts.
    const rowA = mockDb.hr_attendance.find((r) => r.employee_id === EMP_RECEPTION_A && r.date === TODAY);
    const rowB = mockDb.hr_attendance.find((r) => r.employee_id === EMP_RECEPTION_B && r.date === TODAY);
    expect(rowA).toBeDefined();
    expect(rowB).toBeUndefined();
  });

  it('HR may act on an explicit target employeeId', async () => {
    seedHrAuth();
    mockDb.employee_accounts.push({ id: EMP_RECEPTION_A, role_name: 'receptionist', department: 'Reception' });

    const res = await POST(authedReq('hr-token', { body: { action: 'start_shift', employeeId: EMP_RECEPTION_A } }));
    expect(res.status).toBe(200);

    const row = mockDb.hr_attendance.find((r) => r.employee_id === EMP_RECEPTION_A && r.date === TODAY);
    expect(row).toBeDefined();
  });
});
