/**
 * Route-level tests for POST /api/customers' date_of_birth handling (DEC-041 follow-up, 2026-10-04):
 * `date_of_birth` is now wired into the form, and the route must never let a customer end up with
 * both a live `age` and a live `date_of_birth` — once a real date exists, `age` is nulled so there
 * is exactly one source of truth going forward (the legacy `age` column stays for old records that
 * never got a date_of_birth).
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

import { POST } from '@/app/api/customers/route';

const USER_ID = 'staff-user';

function seedStaffAuth() {
  fake.authGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
  fake.seed('employee_accounts', [{ id: 'emp-1', auth_user_id: USER_ID, role_name: 'reception' }]);
  fake.seed('roles', [{ name: 'reception', permissions: [] }]);
}

function postReq(body: Record<string, unknown>): Request {
  return new Request('http://localhost:3000/api/customers', {
    method: 'POST',
    headers: { Authorization: 'Bearer staff-token', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  fake.reset();
  seedStaffAuth();
});

describe('POST /api/customers — date_of_birth vs. legacy age', () => {
  it('stores date_of_birth and nulls age when both are sent', async () => {
    const res = await POST(postReq({ name: 'Sara', mobile: '01012345678', age: '30', date_of_birth: '1995-05-15' }));
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.date_of_birth).toBe('1995-05-15');
    expect(data.age).toBeNull();
  });

  it('keeps the legacy free-entry age when no date_of_birth is sent', async () => {
    const res = await POST(postReq({ name: 'Omar', mobile: '01098765432', age: '45' }));
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.age).toBe(45);
    expect(data.date_of_birth).toBeNull();
  });

  it('rejects a date_of_birth in the future', async () => {
    const res = await POST(postReq({ name: 'Lina', mobile: '01011112222', date_of_birth: '2099-01-01' }));
    expect(res.status).toBe(400);
  });

  it('rejects a malformed date_of_birth', async () => {
    const res = await POST(postReq({ name: 'Nour', mobile: '01033334444', date_of_birth: 'not-a-date' }));
    expect(res.status).toBe(400);
  });

  it('allows omitting date_of_birth and age entirely', async () => {
    const res = await POST(postReq({ name: 'Youssef', mobile: '01055556666' }));
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.age).toBeNull();
    expect(data.date_of_birth).toBeNull();
  });
});
