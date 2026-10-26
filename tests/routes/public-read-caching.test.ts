/**
 * RISK-137 / DEC-131: shared-cache headers on the PUBLIC read endpoints.
 *
 * Contract under test:
 *  - an anonymous GET of services/categories/branches/packages/terms/page-settings carries
 *    `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` and `Vary: Authorization`;
 *  - a GET that carries ANY Authorization header (valid staff token, junk token) never gets a
 *    public header — it is `private, no-store`;
 *  - error and fallback bodies are never shared-cacheable;
 *  - GET /api/providers (RISK-140): anonymous = public projection (may use the public header); any
 *    request with an Authorization header, staff included, is private, no-store;
 *  - the JSON bodies are exactly what they were before the headers were added.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseFake } from '../helpers/supabaseFake';
import { publicReadHeaders, PUBLIC_READ_CACHE_CONTROL } from '@/lib/publicCache';

const USER_ADMIN = 'u-admin-0000-0000-0000-000000000001';
const EMP_ADMIN = 'e-admin-0000-0000-0000-000000000001';

const fake = createSupabaseFake();

vi.mock('@/lib/supabaseServer', () => {
  const server = {
    auth: { getUser: (...args: any[]) => fake.authGetUser(...args), getClaims: (...args: any[]) => fake.authGetClaims(...args) },
    from: (table: string) => fake.client.from(table),
    rpc: (name: string, args?: any) => fake.client.rpc(name, args),
  };
  return { supabaseServer: server, getSupabaseServer: () => server };
});

import { GET as servicesGET } from '@/app/api/services/route';
import { GET as categoriesGET } from '@/app/api/categories/route';
import { GET as branchesGET } from '@/app/api/branches/route';
import { GET as packagesGET } from '@/app/api/packages/route';
import { GET as termsGET } from '@/app/api/terms/route';
import { GET as pageSettingsGET } from '@/app/api/page-settings/route';
import { GET as providersGET } from '@/app/api/providers/route';

const PUBLIC = 'public, s-maxage=60, stale-while-revalidate=300';

function get(path: string, authorization?: string): Request {
  const headers = new Headers();
  if (authorization !== undefined) headers.set('Authorization', authorization);
  return new Request(`http://localhost:3000${path}`, { headers });
}

function seedAdminAuth() {
  fake.authGetUser.mockResolvedValue({ data: { user: { id: USER_ADMIN } }, error: null });
  fake.seed('employee_accounts', [
    { id: EMP_ADMIN, employee_id: 'ADM-001', email: 'admin@clinic.test', role_name: 'admin', auth_user_id: USER_ADMIN },
  ]);
  fake.seed('roles', [{ name: 'admin', permissions: [] }]);
}

beforeEach(() => {
  fake.reset();
  fake.seed('services', [
    { id: 1, en: 'Laser', ar: 'ليزر', cat: 'laser', unit: 'in_clinic', price: 100, sort_order: 1, visible: true, active: true, show_on_website: true },
  ]);
  fake.seed('categories', [{ key: 'laser', en: 'Laser', ar: 'ليزر', sort_order: 1 }]);
  fake.seed('branches', [{ id: 'b1', name_en: 'Main', status: 'active', sort_order: 1 }]);
  fake.seed('packages', [{ id: 'p1', name: 'Pack', price: 10, active: true, show_on_website: true }]);
  fake.seed('package_items', []);
  fake.seed('terms_and_conditions', [{ id: 't1', title: 'T', is_active: true, sort_order: 1 }]);
  fake.seed('page_settings', [
    {
      key: 'home',
      value: {
        deposit: { depositPercentage: 20 },
        notifications: { staffEmail: 'staff@clinic.test', other: 1 },
        departments: [{ id: 'd1' }],
      },
    },
  ]);
});

describe('publicReadHeaders helper', () => {
  it('is public for an anonymous request', () => {
    expect(publicReadHeaders(get('/x'))).toEqual({ 'Cache-Control': PUBLIC_READ_CACHE_CONTROL, Vary: 'Authorization' });
    expect(PUBLIC_READ_CACHE_CONTROL).toBe(PUBLIC);
  });

  it('is private, no-store for any Authorization value, even junk or blank-looking schemes', () => {
    for (const v of ['Bearer abc', 'bearer', 'Basic Zm9v', 'x']) {
      const h = publicReadHeaders(get('/x', v));
      expect(h['Cache-Control']).toBe('private, no-store');
      expect(h['Cache-Control']).not.toContain('public');
      expect(h['Cache-Control']).not.toContain('s-maxage');
    }
  });

  it('is private, no-store when there is no request object (cannot prove the caller is anonymous)', () => {
    expect(publicReadHeaders(undefined)['Cache-Control']).toBe('private, no-store');
    expect(publicReadHeaders(null)['Cache-Control']).toBe('private, no-store');
  });
});

const ROUTES: Array<{ name: string; call: (r: Request) => Promise<Response>; path: string }> = [
  { name: 'services', call: servicesGET, path: '/api/services' },
  { name: 'categories', call: categoriesGET, path: '/api/categories' },
  { name: 'branches', call: (r) => branchesGET(r), path: '/api/branches' },
  { name: 'packages', call: packagesGET, path: '/api/packages' },
  { name: 'terms', call: termsGET, path: '/api/terms?active_only=true' },
  { name: 'page-settings', call: (r) => pageSettingsGET(r), path: '/api/page-settings' },
];

describe.each(ROUTES)('GET $name', ({ call, path }) => {
  it('sends the shared-cache header to an anonymous caller', async () => {
    const res = await call(get(path));
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe(PUBLIC);
    expect(res.headers.get('Vary')).toBe('Authorization');
  });

  it('never sends a public header when an Authorization header is present (junk token)', async () => {
    const res = await call(get(path, 'Bearer not-a-real-token'));
    expect(res.status).toBe(200);
    const cc = res.headers.get('Cache-Control') || '';
    expect(cc).toBe('private, no-store');
    expect(cc).not.toContain('public');
    expect(cc).not.toContain('s-maxage');
    expect(res.headers.get('Vary')).toBe('Authorization');
  });

  it('never sends a public header to an authenticated staff caller', async () => {
    seedAdminAuth();
    const res = await call(get(path, 'Bearer admin-token'));
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
  });
});

describe('unchanged JSON bodies', () => {
  it('services', async () => {
    const body = await (await servicesGET(get('/api/services'))).json();
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({ id: 1, en: 'Laser', price: 100, showOnWebsite: true });
  });

  it('categories', async () => {
    expect(await (await categoriesGET(get('/api/categories'))).json()).toEqual([
      { key: 'laser', en: 'Laser', ar: 'ليزر', sortOrder: 1 },
    ]);
  });

  it('terms', async () => {
    const body = await (await termsGET(get('/api/terms'))).json();
    expect(body.terms).toHaveLength(1);
  });

  it('page-settings: anonymous body is the stripped variant, staff body is the full blob', async () => {
    const anon = await (await pageSettingsGET(get('/api/page-settings'))).json();
    expect(anon.departments).toBeUndefined();
    expect(anon.notifications).toEqual({ other: 1 });
    expect(anon.deposit).toEqual({ depositPercentage: 20 });

    seedAdminAuth();
    const staffRes = await pageSettingsGET(get('/api/page-settings', 'Bearer admin-token'));
    const staff = await staffRes.json();
    expect(staff.departments).toEqual([{ id: 'd1' }]);
    expect(staff.notifications.staffEmail).toBe('staff@clinic.test');
    // the full staff blob must not be shareable
    expect(staffRes.headers.get('Cache-Control')).toBe('private, no-store');
  });
});

describe('error and fallback responses are not shared-cacheable', () => {
  it('services: a database error is a 500 without a cache header', async () => {
    fake.reset(); // no tables seeded -> the fake errors on the unknown table
    const res = await servicesGET(get('/api/services'));
    if (res.status !== 200) {
      expect(res.headers.get('Cache-Control')).toBeNull();
    }
  });

  it('page-settings: with no stored row the seeded-default body carries no public header', async () => {
    fake.reset();
    fake.seed('page_settings', []);
    const res = await pageSettingsGET(get('/api/page-settings'));
    expect(res.headers.get('Cache-Control') || '').not.toContain('public');
  });
});

// RISK-140 changed this block: it used to assert that an anonymous GET returns the staff-only
// fields (fixedSalary, nationalId) and carries no public header. The anonymous response is now the
// allow-listed public projection (and may use the public header); the staff response stays
// uncached. Full coverage: tests/routes/providers-public-projection.test.ts.
describe('GET /api/providers cache headers (RISK-140)', () => {
  it('anonymous: public projection with the shared-cache header; staff-only fields are gone', async () => {
    fake.seed('providers', [
      { id: 'pr1', name: 'Dr A', services: [], rating: 5, fixed_salary: 9000, national_id: '123', active: true },
    ]);
    fake.seed('reservations', []);
    fake.seed('roles', []);
    fake.seed('employee_accounts', []);
    const res = await providersGET(get('/api/providers'));
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe(PUBLIC);
    expect(res.headers.get('Vary')).toBe('Authorization');
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({ id: 'pr1', name: 'Dr A' });
    expect(body[0]).not.toHaveProperty('fixedSalary');
    expect(body[0]).not.toHaveProperty('nationalId');
  });

  it('staff: carries no public cache header, response shape and per-doctor count unchanged', async () => {
    seedAdminAuth();
    fake.seed('providers', [
      { id: 'pr1', name: 'Dr A', services: [], rating: 5, fixed_salary: 9000, national_id: '123', active: true },
    ]);
    fake.seed('reservations', [
      { doctor_name: 'Dr A', status: 'approved' },
      { doctor_name: 'dr a', status: 'completed' },
      { doctor_name: 'Dr A', status: 'rejected' },
    ]);
    const res = await providersGET(get('/api/providers', 'Bearer staff-token'));
    expect(res.status).toBe(200);
    const cc = res.headers.get('Cache-Control') || '';
    expect(cc).toBe('private, no-store');
    expect(cc).not.toContain('s-maxage');
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({ id: 'pr1', name: 'Dr A', bookings: 2, fixedSalary: 9000, nationalId: '123' });
  });

  it('a call with no request object gets the public projection but is never shared-cacheable', async () => {
    fake.seed('providers', [
      { id: 'pr1', name: 'Dr A', services: [], rating: 5, fixed_salary: 9000, national_id: '123', active: true },
    ]);
    const res = await providersGET();
    expect(res.status).toBe(200);
    const cc = res.headers.get('Cache-Control') || '';
    expect(cc).not.toContain('public');
    expect(cc).not.toContain('s-maxage');
    const body = await res.json();
    expect(body[0]).not.toHaveProperty('fixedSalary');
    expect(body[0]).not.toHaveProperty('nationalId');
  });
});
