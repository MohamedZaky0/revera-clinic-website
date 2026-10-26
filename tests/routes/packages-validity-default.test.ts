/**
 * POST /api/packages: a package created without a validity used to be stored with 0 days, and
 * packages/sell computes expires_at = purchased_at + validity_days, so such a package expired the
 * moment it was sold, while the admin form's field only SHOWED a "365" placeholder. The default is
 * now 365 days (an explicit value, including 0, is still honoured).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseFake } from '../helpers/supabaseFake';

const fake = createSupabaseFake();

vi.mock('@/lib/supabaseServer', () => ({
  supabaseServer: {
    auth: { getUser: (...args: any[]) => fake.authGetUser(...args), getClaims: (...args: any[]) => fake.authGetClaims(...args) },
    from: (table: string) => fake.client.from(table),
    rpc: (name: string, args?: any) => fake.client.rpc(name, args),
  },
}));

import { POST } from '@/app/api/packages/route';

const USER_ID = 'staff-user';

function createReq(body: Record<string, any>): Request {
  return new Request('http://localhost:3000/api/packages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', Authorization: 'Bearer staff-token' },
    body: JSON.stringify(body),
  });
}

const BASE = {
  name: 'Glow 6 sessions',
  price: 3000,
  onExpiry: 'recognise_revenue',
  items: [{ serviceId: 1, qty: 6 }],
};

beforeEach(() => {
  fake.reset();
  fake.authGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
  fake.seed('employee_accounts', [{ id: 'emp-1', auth_user_id: USER_ID, role_name: 'reception' }]);
  fake.seed('roles', [{ name: 'reception', permissions: [] }]);
  fake.seed('packages', []);
  fake.seed('package_items', []);
});

describe('POST /api/packages — validity default', () => {
  it.each([
    ['omitted', {}],
    ['null', { validityDays: null }],
    ['an empty string', { validityDays: '' }],
  ])('validityDays %s is stored as 365', async (_label, extra) => {
    const res = await POST(createReq({ ...BASE, ...extra }));
    expect(res.status).toBe(201);
    expect(fake.rows('packages')[0].validity_days).toBe(365);
  });

  it('an explicit validity is kept', async () => {
    const res = await POST(createReq({ ...BASE, validityDays: 90 }));
    expect(res.status).toBe(201);
    expect(fake.rows('packages')[0].validity_days).toBe(90);
  });

  it('an explicit 0 is still honoured (it is a choice, not a missing value)', async () => {
    const res = await POST(createReq({ ...BASE, validityDays: 0 }));
    expect(res.status).toBe(201);
    expect(fake.rows('packages')[0].validity_days).toBe(0);
  });

  it('a negative or fractional validity is still rejected', async () => {
    expect((await POST(createReq({ ...BASE, validityDays: -5 }))).status).toBe(400);
    expect((await POST(createReq({ ...BASE, validityDays: 1.5 }))).status).toBe(400);
  });
});
