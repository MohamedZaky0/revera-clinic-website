import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseFake } from '../helpers/supabaseFake';

const fake = createSupabaseFake();

vi.mock('@/lib/supabaseServer', () => {
  const server = {
    auth: { getUser: (...args: any[]) => fake.authGetUser(...args) },
    from: (table: string) => fake.client.from(table),
    rpc: (name: string, args?: any) => fake.client.rpc(name, args),
  };
  return {
    supabaseServer: server,
    getSupabaseServer: () => server,
  };
});

import { GET, POST, DELETE } from '@/app/api/categories/route';
import { SERVICES, CATEGORY_LABELS } from '@/lib/services';
import { getDynamicCategories, getDynamicServices } from '@/lib/serviceStore';

describe('Categories API & Zero-Fake-Data Contract', () => {
  beforeEach(() => {
    fake.reset();
  });

  it('SERVICES and CATEGORY_LABELS constants are empty arrays/objects by default with 0 mock data', () => {
    expect(SERVICES).toEqual([]);
    expect(CATEGORY_LABELS).toEqual({});
  });

  it('getDynamicCategories() and getDynamicServices() return empty arrays if storage is empty', () => {
    expect(getDynamicCategories()).toEqual([]);
    expect(getDynamicServices()).toEqual([]);
  });

  it('GET /api/categories returns empty array and does NOT auto-seed fake records when table is empty', async () => {
    fake.seed('categories', []);
    const req = new Request('http://localhost:3000/api/categories');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual([]);
    expect(fake.rows('categories').length).toBe(0);
  });

  it('GET /api/categories returns existing categories from the database', async () => {
    fake.seed('categories', [
      { key: 'custom_cat', en: 'Custom Category', ar: 'قسم مخصص', sort_order: 1 }
    ]);

    const req = new Request('http://localhost:3000/api/categories');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual([
      { key: 'custom_cat', en: 'Custom Category', ar: 'قسم مخصص', sortOrder: 1 }
    ]);
  });

  it('DELETE /api/categories?key=... deletes the category and associated services', async () => {
    fake.authGetUser.mockResolvedValue({
      data: { user: { id: 'admin-1', email: 'admin@revera.com' } },
      error: null,
    });
    fake.seed('employee_accounts', [
      { id: 'emp-1', auth_user_id: 'admin-1', role_name: 'admin', is_active: true }
    ]);
    fake.seed('roles', [
      { name: 'admin', permissions: ['*'] }
    ]);

    fake.seed('categories', [
      { key: 'laser', en: 'Laser', ar: 'ليزر', sort_order: 0 }
    ]);

    fake.seed('services', [
      { id: 101, en: 'Laser Hair Removal', ar: 'ازالة الشعر', cat: 'laser', unit: 'in_clinic', price: 500, sort_order: 0 }
    ]);

    const req = new Request('http://localhost:3000/api/categories?key=laser', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer valid-staff-token' },
    });

    const res = await DELETE(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);

    expect(fake.rows('categories').find(c => c.key === 'laser')).toBeUndefined();
    expect(fake.rows('services').find(s => s.cat === 'laser')).toBeUndefined();
  });
});
