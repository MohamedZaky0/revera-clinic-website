/**
 * Route-level authorization tests (TASK-0.4).
 *
 * Mocks @/lib/supabaseServer at the module boundary so no live database is touched.
 * Tests the SHAPE of auth responses — status code and that no data body is returned
 * on rejection — not the data itself.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock infrastructure ──────────────────────────────────────────────────────

const mockAuthGetUser = vi.fn();
const mockFromData = vi.fn();

function createChain(): any {
  const chain: any = {};
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'ilike', 'or', 'order', 'limit', 'gt', 'lt', 'gte', 'lte', 'in'];
  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }
  chain.maybeSingle = vi.fn(async () => mockFromData('maybeSingle'));
  chain.single = vi.fn(async () => mockFromData('single'));
  // For queries that are awaited directly (not via maybeSingle/single)
  chain.then = vi.fn((resolve: any) => Promise.resolve(mockFromData('query')).then(resolve));
  return chain;
}

vi.mock('@/lib/supabaseServer', () => ({
  supabaseServer: {
    auth: { getUser: (...args: any[]) => mockAuthGetUser(...args) },
    from: (_table: string) => createChain(),
  },
}));

// Import routes AFTER mocks are set up
import { GET as getMedicalRecords } from '@/app/api/medical-records/route';
import { GET as getTerms } from '@/app/api/terms/route';
import { GET as getBranches } from '@/app/api/branches/route';
import { GET as getProviders } from '@/app/api/providers/route';
import { GET as getReservations, POST as postReservations } from '@/app/api/reservations/route';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(url: string, opts: { headers?: Record<string, string>; body?: any } = {}): Request {
  const headers = new Headers(opts.headers);
  if (opts.body !== undefined) {
    return new Request(`http://localhost:3000${url}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(opts.body),
    });
  }
  return new Request(`http://localhost:3000${url}`, { headers });
}

function noAuthReq(url = ''): Request {
  return makeReq(url);
}

function patientAuthReq(url = ''): Request {
  return makeReq(url, { headers: { Authorization: 'Bearer patient-token' } });
}

beforeEach(() => {
  vi.clearAllMocks();
  setupUnauthenticated();
  mockFromData.mockReturnValue({ data: null, error: null });
});

// ── Configure auth responses per caller type ─────────────────────────────────

function setupUnauthenticated() {
  mockAuthGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Invalid' } });
}

function setupPatient() {
  // First call (requireStaffAccess) fails at employee lookup → 403
  // Second call (requireAuthenticatedUser) succeeds → patient
  mockAuthGetUser
    .mockResolvedValueOnce({ data: { user: { id: 'patient-1' } }, error: null })
    .mockResolvedValueOnce({ data: { user: { id: 'patient-1', phone: '01035595691', email: 'patient@test.com' } }, error: null });
  mockFromData.mockImplementation((kind: string) => {
    if (kind === 'maybeSingle') {
      return { data: null, error: null };
    }
    return { data: null, error: null };
  });
}

// ── Tests: No Authorization header → 401 ─────────────────────────────────────

describe('Auth: no Authorization header produces 401', () => {
  it('GET /api/medical-records with no token returns 401', async () => {
    setupUnauthenticated();
    const res = await getMedicalRecords(noAuthReq());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).not.toHaveProperty('data');
    expect(body).not.toHaveProperty('records');
  });

  it('GET /api/reservations with no token returns 401', async () => {
    setupUnauthenticated();
    const res = await getReservations(noAuthReq());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });
});

// ── Tests: Patient token on staff-only route → 403 ───────────────────────────

describe('Auth: patient token on staff-only route produces 403', () => {
  it('GET /api/medical-records with patient token returns 403', async () => {
    // medical-records uses requireStaffAccess directly.
    // Auth succeeds but employee_accounts lookup returns null → 403.
    mockAuthGetUser.mockResolvedValue({
      data: { user: { id: 'patient-1', phone: '01035595691' } },
      error: null,
    });
    mockFromData.mockImplementation(() => ({ data: null, error: null }));
    const res = await getMedicalRecords(patientAuthReq());
    expect(res.status).toBe(403);
  });
});

// ── Tests: Patient requesting another patient data → empty, not data ─────────

describe('Auth: patient requesting other patient reservations gets empty array', () => {
  it('GET /api/reservations with patient token and mismatched phone returns empty array', async () => {
    setupPatient();
    const res = await getReservations(patientAuthReq('?phone=01222222222'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(0);
  });

  it('GET /api/reservations with patient token and no filter returns 403', async () => {
    setupPatient();
    const res = await getReservations(patientAuthReq());
    expect(res.status).toBe(403);
  });
});

// ── Tests: Public reads stay public ──────────────────────────────────────────

describe('Auth: public reads stay public (no token returns 200)', () => {
  it('GET /api/branches with no token returns 200', async () => {
    mockFromData.mockReturnValue({ data: [], error: null });
    const res = await getBranches();
    expect(res.status).toBe(200);
  });

  it('GET /api/terms with no token returns 200', async () => {
    mockFromData.mockReturnValue({ data: [], error: null });
    const res = await getTerms(noAuthReq());
    expect(res.status).toBe(200);
  });

  it('GET /api/providers with no token returns 200', async () => {
    mockFromData.mockReturnValue({ data: [], error: null });
    const res = await getProviders();
    expect(res.status).toBe(200);
  });
});

// ── Tests: POST /api/reservations with no token → succeeds (public booking) ──

describe('Auth: POST /api/reservations with no token does not return 401 or 403', () => {
  it('POST /api/reservations with valid body and no token is accepted', async () => {
    // POST does not call requireStaffAccess — it is the public booking endpoint.
    mockFromData.mockImplementation((kind: string) => {
      if (kind === 'maybeSingle') {
        return { data: null, error: null };
      }
      if (kind === 'single') {
        return {
          data: {
            id: 'res-1', status: 'pending', service_id: 1, service_ids: [],
            date: '2026-08-20', time_slot: '10:00', name: 'Test',
            email: 'test@test.com', phone: '01035595691',
            amount_paid: 0, amount_left: null, room_id: null, rooms: [],
            created_by_employee_id: null, doctor_name: null, provider_id: null,
            session_type: 'in_clinic', branch_id: null, customer_id: null,
            notes: '', is_manual: false, follow_up_date: null,
            started_at: null, actual_duration_minutes: null,
            created_at: new Date().toISOString(), requested_time: '10:00',
          },
          error: null,
        };
      }
      return { data: [], error: null };
    });

    const res = await postReservations(
      makeReq('', {
        body: {
          serviceId: 1,
          date: '2026-08-20',
          name: 'Test Patient',
          email: 'test@test.com',
          phone: '01035595691',
          requestedTime: '10:00',
          sessionType: 'in_clinic',
        },
      })
    );
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});
