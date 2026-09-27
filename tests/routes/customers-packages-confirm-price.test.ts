/**
 * DEC-088 item 6: PATCH /api/customers/packages { action: 'confirm_package_price' } — "Enter invoice value" for a
 * historical package left price_pending. The route validates, gates on role and delegates the atomic work to the
 * confirm_historical_package_price RPC (its SQL is covered by scripts/db_tests/confirm_historical_package_price.test.sql).
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

import { PATCH } from '@/app/api/customers/packages/route';

const USER_ID = 'staff-user';
const PKG = '11111111-1111-1111-1111-111111111111';

function patch(body: any): Request {
  return new Request('http://localhost:3000/api/customers/packages', {
    method: 'PATCH',
    headers: new Headers({ 'content-type': 'application/json', Authorization: 'Bearer staff-token' }),
    body: JSON.stringify(body),
  });
}

function seedRole(roleName: string) {
  fake.authGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
  fake.seed('employee_accounts', [{ id: 'emp-1', auth_user_id: USER_ID, role_name: roleName, email: 'x@test.com' }]);
  fake.seed('roles', [{ name: roleName, permissions: [] }]);
}

let calls: any[];
function rpcOk(result: any) {
  calls = [];
  fake.setRpc('confirm_historical_package_price', (args: any) => {
    calls.push(args);
    return { data: result, error: null };
  });
}
function rpcError(message: string) {
  fake.setRpc('confirm_historical_package_price', () => ({ data: null, error: { message } }));
}

beforeEach(() => {
  fake.reset();
  calls = [];
});

describe('confirm_package_price', () => {
  it('reception saves the price and the pre-launch pulses through the RPC and gets the new balances back', async () => {
    seedRole('receptionist');
    rpcOk({ already_confirmed: false, price_paid: 5000, pulses_used: 3000, pulses_remaining: 7000, recognition_rows: 0 });
    const res = await PATCH(patch({ action: 'confirm_package_price', customer_package_id: PKG, price_paid: 5000, pulses_used_before: 3000 }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json).toMatchObject({ success: true, alreadyConfirmed: false, pricePaid: 5000, pulsesUsed: 3000, pulsesRemaining: 7000, recognitionRows: 0 });
    expect(calls).toEqual([{ p_customer_package_id: PKG, p_price: 5000, p_pulses_used: 3000, p_employee_id: 'emp-1' }]);
  });

  it('accepts camelCase fields and treats a missing pulses count as 0', async () => {
    seedRole('admin');
    rpcOk({ already_confirmed: false, price_paid: 800, pulses_used: 0, pulses_remaining: 100, recognition_rows: 1 });
    const res = await PATCH(patch({ action: 'confirm_package_price', customer_package_id: PKG, pricePaid: '800' }));
    expect(res.status).toBe(200);
    expect(calls[0]).toMatchObject({ p_price: 800, p_pulses_used: 0 });
  });

  it('a doctor cannot enter a package invoice value (money)', async () => {
    seedRole('doctor');
    rpcOk({});
    const res = await PATCH(patch({ action: 'confirm_package_price', customer_package_id: PKG, price_paid: 5000 }));
    expect(res.status).toBe(403);
    expect(calls).toHaveLength(0);
  });

  it.each([
    ['missing price', { customer_package_id: PKG }],
    ['blank price', { customer_package_id: PKG, price_paid: '' }],
    ['negative price', { customer_package_id: PKG, price_paid: -1 }],
    ['non-numeric price', { customer_package_id: PKG, price_paid: 'abc' }],
    ['fractional pulses', { customer_package_id: PKG, price_paid: 100, pulses_used_before: 2.5 }],
    ['negative pulses', { customer_package_id: PKG, price_paid: 100, pulses_used_before: -3 }],
    ['non-uuid package id', { customer_package_id: 'not-a-uuid', price_paid: 100 }],
  ])('rejects %s with 400 and never calls the RPC', async (_label, extra) => {
    seedRole('receptionist');
    rpcOk({});
    const res = await PATCH(patch({ action: 'confirm_package_price', ...extra }));
    expect(res.status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it('a price of 0 is allowed (a free package)', async () => {
    seedRole('receptionist');
    rpcOk({ already_confirmed: false, price_paid: 0, pulses_used: 0, pulses_remaining: 50, recognition_rows: 0 });
    const res = await PATCH(patch({ action: 'confirm_package_price', customer_package_id: PKG, price_paid: 0 }));
    expect(res.status).toBe(200);
  });

  it.each([
    ['customer package not found', 404],
    ['package price is already confirmed', 409],
    ['pulses used exceeds the remaining balance', 400],
    ['pulses do not apply to a services package', 400],
    ['price must be zero or more', 400],
  ])('maps the RPC error "%s" to HTTP %i', async (message, status) => {
    seedRole('receptionist');
    rpcError(message);
    const res = await PATCH(patch({ action: 'confirm_package_price', customer_package_id: PKG, price_paid: 100 }));
    const json = await res.json();
    expect(res.status).toBe(status);
    expect(json.success).toBe(false);
  });

  it('an unexpected RPC failure is a 500 with a message, not a silent success', async () => {
    seedRole('receptionist');
    rpcError('connection reset');
    const res = await PATCH(patch({ action: 'confirm_package_price', customer_package_id: PKG, price_paid: 100 }));
    expect(res.status).toBe(500);
  });
});
