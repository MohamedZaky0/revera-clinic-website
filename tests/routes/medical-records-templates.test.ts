/**
 * Route-level tests for /api/medical-records/templates.
 *
 * RISK-086: this route used to treat a local JSON file as its primary store, with Supabase as a
 * best-effort mirror — broken on Vercel, where the deployed filesystem is read-only (see RISKS.md
 * for the full failure chain). It now uses Supabase as the only store, matching every other route
 * in the codebase, so this test file needs no filesystem mocking at all — the shared Supabase fake
 * is enough.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseFake } from '../helpers/supabaseFake';

const fake = createSupabaseFake();

vi.mock('@/lib/supabaseServer', () => ({
  supabaseServer: {
    auth: { getUser: (...args: any[]) => fake.authGetUser(...args) },
    from: (table: string) => fake.client.from(table),
  },
}));

import { GET, POST, PUT, DELETE } from '@/app/api/medical-records/templates/route';

const USER_ID = 'staff-user';
const EMP_ID = 'emp-1';

function makeReq(opts: { method?: string; auth?: string; body?: any; query?: string } = {}): Request {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (opts.auth) headers.set('Authorization', `Bearer ${opts.auth}`);
  const qs = opts.query ? `?${opts.query}` : '';
  const init: RequestInit = { method: opts.method || 'GET', headers };
  if (opts.body !== undefined) init.body = JSON.stringify(opts.body);
  return new Request(`http://localhost:3000/api/medical-records/templates${qs}`, init);
}

function staffReq(opts: { method?: string; body?: any; query?: string } = {}) {
  return makeReq({ ...opts, auth: 'staff-token' });
}

function seedStaffAuth() {
  fake.authGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
  fake.seed('employee_accounts', [{ id: EMP_ID, auth_user_id: USER_ID, role_name: 'reception' }]);
  fake.seed('roles', [{ name: 'reception', permissions: [] }]);
}

/** Triggers the route's own first-run seeding (empty table → insert the 3 built-in defaults). */
async function seedDefaultsViaFirstRead() {
  await GET(staffReq());
}

beforeEach(() => {
  fake.reset();
  fake.seed('employee_accounts', []);
  fake.seed('roles', []);
  fake.seed('medical_record_templates', []);
});

describe('auth', () => {
  it('GET with no token → 401', async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });
  it('POST with no token → 401', async () => {
    const res = await POST(makeReq({ method: 'POST', body: { title: 'x' } }));
    expect(res.status).toBe(401);
  });
  it('PUT with no token → 401', async () => {
    const res = await PUT(makeReq({ method: 'PUT', body: { id: 'x' } }));
    expect(res.status).toBe(401);
  });
  it('DELETE with no token → 401', async () => {
    const res = await DELETE(makeReq({ method: 'DELETE', query: 'id=x' }));
    expect(res.status).toBe(401);
  });
});

describe('GET — reads', () => {
  beforeEach(() => seedStaffAuth());

  it('with an empty table, seeds Supabase with the 3 built-in defaults and returns them', async () => {
    const res = await GET(staffReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.templates).toHaveLength(3);
    expect(body.templates.map((t: any) => t.id)).toContain('tmpl-general');
    // Confirms the seed actually landed in the store, not just in the response body.
    expect(fake.rows('medical_record_templates')).toHaveLength(3);
  });

  it('a second GET does not re-seed — reads the same 3 rows back', async () => {
    await seedDefaultsViaFirstRead();
    await GET(staffReq());
    expect(fake.rows('medical_record_templates')).toHaveLength(3);
  });

  it('?id= looks up one template by id', async () => {
    await seedDefaultsViaFirstRead();
    const res = await GET(staffReq({ query: 'id=tmpl-laser' }));
    const body = await res.json();
    expect(body.template.id).toBe('tmpl-laser');
  });

  it('?id= for an unknown id → 404', async () => {
    await seedDefaultsViaFirstRead();
    const res = await GET(staffReq({ query: 'id=nonexistent' }));
    expect(res.status).toBe(404);
  });

  it('?serviceId= matches a template whose service_ids includes it', async () => {
    await seedDefaultsViaFirstRead();
    await POST(staffReq({ method: 'POST', body: { title: 'Laser Add-on', service_ids: [42], fields: [] } }));
    const res = await GET(staffReq({ query: 'serviceId=42' }));
    const body = await res.json();
    expect(body.template.title).toBe('Laser Add-on');
    expect(body.matchType).toBe('exact_service');
  });

  it('?serviceId= with no match falls back to the default template', async () => {
    await seedDefaultsViaFirstRead();
    const res = await GET(staffReq({ query: 'serviceId=99999' }));
    const body = await res.json();
    expect(body.matchType).toBe('default_fallback');
    expect(body.template.is_default).toBe(true);
  });

  it('a Supabase error surfaces as a 500, not a silent empty list', async () => {
    seedStaffAuth();
    const originalFrom = fake.client.from;
    (fake.client as any).from = (table: string) => {
      if (table !== 'medical_record_templates') return originalFrom(table);
      return { select: () => ({ order: () => Promise.resolve({ data: null, error: { message: 'db down' } }) }) };
    };
    const res = await GET(staffReq());
    expect(res.status).toBe(500);
    (fake.client as any).from = originalFrom;
  });
});

describe('POST — create', () => {
  beforeEach(() => seedStaffAuth());

  it('missing title → 400', async () => {
    const res = await POST(staffReq({ method: 'POST', body: {} }));
    expect(res.status).toBe(400);
  });

  it('creates a new template directly in Supabase, retrievable afterward', async () => {
    const res = await POST(staffReq({ method: 'POST', body: { title: 'Peel Intake', description: 'x', fields: [] } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.template.title).toBe('Peel Intake');
    expect(fake.rows('medical_record_templates').map((t) => t.title)).toContain('Peel Intake');

    const getRes = await GET(staffReq({ query: `id=${body.template.id}` }));
    const getBody = await getRes.json();
    expect(getBody.template.title).toBe('Peel Intake');
  });

  it('marking a new template as default unmarks every other template as default', async () => {
    await seedDefaultsViaFirstRead(); // tmpl-general starts as the default
    await POST(staffReq({ method: 'POST', body: { title: 'New Default', is_default: true, fields: [] } }));
    const defaults = fake.rows('medical_record_templates').filter((t) => t.is_default);
    expect(defaults).toHaveLength(1);
    expect(defaults[0].title).toBe('New Default');
  });

  it('the template just created is immediately editable — the exact bug RISK-086 describes', async () => {
    // On the old local-file implementation this would 404: the write "succeeded" via the
    // Supabase-only best-effort mirror while the local file (what PUT/DELETE actually read from
    // in production) never saw it. There is only one store now, so this must just work.
    const createRes = await POST(staffReq({ method: 'POST', body: { title: 'Fresh Template', fields: [] } }));
    const created = (await createRes.json()).template;

    const putRes = await PUT(staffReq({ method: 'PUT', body: { id: created.id, title: 'Fresh Template Edited' } }));
    expect(putRes.status).toBe(200);

    const deleteRes = await DELETE(staffReq({ method: 'DELETE', query: `id=${created.id}` }));
    expect(deleteRes.status).toBe(200);
  });
});

describe('PUT — update', () => {
  beforeEach(async () => {
    seedStaffAuth();
    await seedDefaultsViaFirstRead();
  });

  it('missing id → 400', async () => {
    const res = await PUT(staffReq({ method: 'PUT', body: { title: 'x' } }));
    expect(res.status).toBe(400);
  });

  it('unknown id → 404', async () => {
    const res = await PUT(staffReq({ method: 'PUT', body: { id: 'nonexistent', title: 'x' } }));
    expect(res.status).toBe(404);
  });

  it('updates the title of an existing template, leaving its fields untouched', async () => {
    const res = await PUT(staffReq({ method: 'PUT', body: { id: 'tmpl-laser', title: 'Laser Intake v2' } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.template.title).toBe('Laser Intake v2');
    expect(body.template.fields.length).toBeGreaterThan(0); // unchanged, not wiped
  });

  it('setting is_default on one template clears it from every other', async () => {
    await PUT(staffReq({ method: 'PUT', body: { id: 'tmpl-laser', is_default: true } }));
    const defaults = fake.rows('medical_record_templates').filter((t) => t.is_default);
    expect(defaults).toHaveLength(1);
    expect(defaults[0].id).toBe('tmpl-laser');
  });
});

describe('DELETE — remove', () => {
  beforeEach(async () => {
    seedStaffAuth();
    await seedDefaultsViaFirstRead();
  });

  it('missing id → 400', async () => {
    const res = await DELETE(staffReq({ method: 'DELETE' }));
    expect(res.status).toBe(400);
  });

  it('deletes a non-default template', async () => {
    const res = await DELETE(staffReq({ method: 'DELETE', query: 'id=tmpl-injectables' }));
    expect(res.status).toBe(200);
    const getRes = await GET(staffReq({ query: 'id=tmpl-injectables' }));
    expect(getRes.status).toBe(404);
  });

  it('refuses to delete the default template while other templates still exist', async () => {
    const res = await DELETE(staffReq({ method: 'DELETE', query: 'id=tmpl-general' })); // the seeded default
    expect(res.status).toBe(400);
    const getRes = await GET(staffReq({ query: 'id=tmpl-general' }));
    expect(getRes.status).toBe(200); // still there
  });
});
