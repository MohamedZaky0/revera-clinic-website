/**
 * Route-level tests for POST /api/services — RISK-088: the "Add Service" flow in
 * AdminServicesView.tsx POSTs the entire services array (every existing service, each carrying a
 * real `id`, plus the one brand-new row being created, which has no `id` yet) as a single bulk
 * sync call. The route used to run that whole array through one `.upsert()` call, which against
 * real Postgres/PostgREST fails the new row with a `services.id` NOT NULL violation — PostgREST
 * builds one SQL statement from the array and sends any column missing on a given row as an
 * explicit `NULL` for that row rather than omitting it, so the identity column never gets a chance
 * to auto-generate. See RISKS.md RISK-088 for the full story and the live-reproduction steps.
 *
 * Note: `supabaseFake`'s `.upsert()` does not reproduce that Postgres-specific failure (it always
 * assigns an id when one is missing, regardless of whether the real column would have been sent as
 * an explicit NULL), so this suite cannot exercise the original bug directly — that was verified by
 * live reproduction against the dev server instead (see RISK-088). What this suite locks in is the
 * post-fix *contract*: a mixed array of existing + brand-new services must create exactly one new
 * row and must not lose or duplicate any existing row.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseFake } from '../helpers/supabaseFake';

const fake = createSupabaseFake();

vi.mock('@/lib/supabaseServer', () => ({
  supabaseServer: { auth: { getUser: (...args: any[]) => fake.authGetUser(...args) }, from: (t: string) => fake.client.from(t) },
  getSupabaseServer: () => ({ auth: { getUser: (...args: any[]) => fake.authGetUser(...args) }, from: (t: string) => fake.client.from(t) }),
}));

import { POST } from '@/app/api/services/route';

const USER_ID = 'user-1';
const EMP_ID = 'emp-1';

function postReq(body: unknown) {
  return new Request('http://localhost/api/services', {
    method: 'POST',
    headers: { Authorization: 'Bearer staff-token', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function seedStaff(roleName: string, permissions: string[]) {
  fake.authGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
  fake.seed('employee_accounts', [{ id: EMP_ID, auth_user_id: USER_ID, role_name: roleName, email: 'staff@test.com' }]);
  fake.seed('roles', [{ name: roleName, permissions }]);
}

const EXISTING_SERVICE = {
  id: 1,
  en: 'Skin Dermatology Clinics',
  ar: 'عيادات الجلدية',
  cat: 'dermatology',
  unit: 'both',
  price: 100,
  sortOrder: 0,
  duration: '1:00 Hours',
  duration_minutes: 60,
  descriptionEn: '',
  descriptionAr: '',
  isShared: false,
  enableReminder: true,
  branchPricing: [],
};

// No `id` at all — this is exactly the shape AdminServicesView.tsx builds for a brand-new service
// (RISK-088's `id: 0` placeholder is stripped by `mapServiceToDb` before it ever reaches the API).
const NEW_SERVICE = {
  en: 'Test Diagnostic Service',
  ar: 'خدمة تجريبية',
  cat: 'dermatology',
  unit: 'both',
  price: 150,
  sortOrder: 1,
  duration: '1:00 Hours',
  duration_minutes: 60,
  descriptionEn: '',
  descriptionAr: '',
  isShared: false,
  enableReminder: true,
  branchPricing: [],
};

beforeEach(() => {
  fake.reset();
  fake.seed('services', [{ ...EXISTING_SERVICE }]);
});

describe('POST /api/services — mixed create+update array (RISK-088)', () => {
  it('creates exactly one new row for the service missing an id, and preserves the existing row', async () => {
    seedStaff('superadmin', []);

    const res = await POST(postReq([EXISTING_SERVICE, NEW_SERVICE]));
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(2);

    // Existing row: same id, no duplicate created.
    const existingRows = fake.db.services.filter((s: any) => s.en === EXISTING_SERVICE.en);
    expect(existingRows).toHaveLength(1);
    expect(existingRows[0].id).toBe(EXISTING_SERVICE.id);

    // New row: created with a DB-assigned id, distinct from the existing one.
    const newRows = fake.db.services.filter((s: any) => s.en === NEW_SERVICE.en);
    expect(newRows).toHaveLength(1);
    expect(newRows[0].id).toBeDefined();
    expect(newRows[0].id).not.toBe(EXISTING_SERVICE.id);

    expect(fake.db.services).toHaveLength(2);
  });

  it('a single brand-new service (no array) is still created via the same code path', async () => {
    seedStaff('superadmin', []);

    const res = await POST(postReq(NEW_SERVICE));
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.en).toBe(NEW_SERVICE.en);
    expect(body.id).toBeDefined();

    expect(fake.db.services).toHaveLength(2); // the pre-seeded existing row + this new one
  });

  it('rejects a role with no services create/edit permission', async () => {
    seedStaff('receptionist', []);
    const res = await POST(postReq(NEW_SERVICE));
    expect(res.status).toBe(403);
    expect(fake.db.services).toHaveLength(1); // nothing created
  });
});
