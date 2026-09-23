/**
 * Route-level tests for PATCH /api/customers/packages after Brief 34B — the pulse balance now lives
 * on the customer_packages columns and is mutated by the consume_package_pulses RPC
 * (supabase/migrations/20260922000000_package_pulse_balance_to_columns.sql), not the shared
 * page_settings 'customer_package_pulses' blob.
 *
 * The fake cannot prove atomicity (that needs a real Postgres — see
 * ai_docs/manual_tests/LASER_PULSE_BALANCE_BRIEF_34B_MANUAL_TESTS.md). What it proves here: the route
 * calls the RPC and never reads or writes page_settings for the pulse balance; the response keys
 * match the pre-34B contract in every branch; clamp, idempotency, expiry, and UUID guarding all
 * behave as before.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

const USER_ID = '10000000-0000-4000-8000-000000000001';
const EMPLOYEE_ID = '20000000-0000-4000-8000-000000000002';
const PACKAGE_ID = '30000000-0000-4000-8000-000000000003';
const RESERVATION_ID = '50000000-0000-4000-8000-000000000005';
const UNKNOWN_PACKAGE_ID = '40000000-0000-4000-8000-000000000004';

function request(body: Record<string, unknown>, authenticated = true) {
  return new Request('http://localhost:3000/api/customers/packages', {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      ...(authenticated ? { Authorization: 'Bearer staff-token' } : {}),
    },
    body: JSON.stringify(body),
  });
}

function consumeBody(overrides: Record<string, unknown> = {}) {
  return {
    action: 'consume_package_pulses',
    customer_package_id: PACKAGE_ID,
    quantity_used: 5_000,
    booking_id: RESERVATION_ID,
    ...overrides,
  };
}

function seedPackage(options: { remaining?: number; total?: number; used?: number; expiresAt?: string } = {}) {
  const total = options.total ?? 10_000;
  const remaining = options.remaining ?? total;
  const used = options.used ?? total - remaining;
  fake.seed('customer_packages', [{
    id: PACKAGE_ID,
    total_pulses: total,
    pulses_used: used,
    pulses_remaining: remaining,
    expires_at: options.expiresAt ?? '2099-01-01T00:00:00.000Z',
    status: 'active',
  }]);
}

/**
 * Mirrors the migration's consume_package_pulses(): FOR UPDATE semantics cannot be simulated, but
 * the clamp, idempotency, and 'fully_used' transition can — and the route's response must reflect
 * whatever the RPC returns, verbatim.
 */
function installRealisticRpc() {
  fake.setRpc('consume_package_pulses', (args: any) => {
    const row = (fake.db['customer_packages'] || []).find((r) => r.id === args.p_customer_package_id);
    if (!row) return { data: null, error: { message: 'customer package not found' } };

    const usageRows = fake.db['package_pulse_usage'] || [];
    const prior = args.p_reservation_id
      ? usageRows.find((u) => u.customer_package_id === row.id && u.reservation_id === args.p_reservation_id)
      : undefined;
    if (prior) {
      return {
        data: {
          consumed: prior.quantity_used, requested: args.p_qty, remaining: row.pulses_remaining,
          already_deducted: true, used_total: row.pulses_used, total_pulses: row.total_pulses,
        },
        error: null,
      };
    }

    if (args.p_qty <= 0) return { data: null, error: { message: 'quantity of pulses to consume must be greater than 0' } };
    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
      return { data: null, error: { message: 'package has expired' } };
    }
    if (!row.total_pulses || row.total_pulses <= 0) {
      return { data: null, error: { message: 'package pulse quota is not configured' } };
    }
    if (!row.pulses_remaining || row.pulses_remaining <= 0) {
      return { data: null, error: { message: 'package has 0 remaining pulses' } };
    }

    const consumed = Math.min(args.p_qty, Math.max(row.pulses_remaining, 0));
    row.pulses_used = (row.pulses_used || 0) + consumed;
    row.pulses_remaining = Math.max(0, row.pulses_remaining - consumed);
    if (row.pulses_remaining <= 0) row.status = 'fully_used';
    (fake.db['package_pulse_usage'] ||= []).push({
      id: `ppu-${usageRows.length + 1}`,
      customer_package_id: row.id,
      reservation_id: args.p_reservation_id,
      quantity_used: consumed,
      remaining_after: row.pulses_remaining,
      used_by: args.p_used_by,
      treatment_area: args.p_treatment_area,
      notes: args.p_notes,
      created_at: new Date().toISOString(),
    });
    return {
      data: {
        consumed, requested: args.p_qty, remaining: row.pulses_remaining,
        already_deducted: false, used_total: row.pulses_used, total_pulses: row.total_pulses,
      },
      error: null,
    };
  });
}

beforeEach(() => {
  fake.reset();
  installRealisticRpc();
  fake.authGetUser.mockResolvedValue({ data: { user: { id: USER_ID, email: 'staff@test.com' } }, error: null });
  fake.seed('employee_accounts', [{ id: EMPLOYEE_ID, auth_user_id: USER_ID, role_name: 'reception' }]);
  fake.seed('roles', [{ name: 'reception', permissions: [] }]);
  fake.seed('customer_packages', []);
  fake.seed('package_pulse_usage', []);
  // Sentinel: if the route still reads/writes the blob, this row would be mutated or consulted.
  fake.seed('page_settings', [{
    key: 'customer_package_pulses',
    value: { [PACKAGE_ID]: { included_pulses: 999, used_pulses: 0, remaining_pulses: 999, usage_history: [] } },
  }]);
});

describe('PATCH /api/customers/packages consume_package_pulses (columns + RPC)', () => {
  it('requires a staff session', async () => {
    const response = await PATCH(request(consumeBody(), false));
    expect(response.status).toBe(401);
  });

  it('clamps a request above the remaining balance and reports consumed versus requested', async () => {
    seedPackage({ remaining: 5_000, used: 5_000 });
    const response = await PATCH(request(consumeBody({ quantity_used: 10_000 })));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toMatchObject({ success: true, consumed: 5_000, requested: 10_000, remainingPulses: 0 });
    expect(body.packagePulses).toMatchObject({ included_pulses: 10_000, used_pulses: 10_000, remaining_pulses: 0 });
  });

  it('consumes an exactly equal balance and leaves the package fully_used', async () => {
    seedPackage({ remaining: 5_000, used: 5_000 });
    const response = await PATCH(request(consumeBody()));
    expect(response.status).toBe(200);
    expect(fake.rows('customer_packages')[0].status).toBe('fully_used');
  });

  it('rejects a depleted package', async () => {
    seedPackage({ remaining: 0, used: 10_000 });
    const response = await PATCH(request(consumeBody({ quantity_used: 1 })));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ success: false });
  });

  it.each([0, -1])('rejects quantity_used %s', async (quantityUsed) => {
    seedPackage();
    const response = await PATCH(request(consumeBody({ quantity_used: quantityUsed })));
    expect(response.status).toBe(400);
  });

  it('rejects an expired package', async () => {
    seedPackage({ expiresAt: '2020-01-01T00:00:00.000Z' });
    const response = await PATCH(request(consumeBody({ quantity_used: 1 })));
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error).toContain('expired');
  });

  it('rejects a package with no configured pulse quota instead of fabricating one', async () => {
    seedPackage({ total: 0, remaining: 0, used: 0 });
    const response = await PATCH(request(consumeBody({ quantity_used: 1 })));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ success: false });
  });

  it('rejects a synthetic/non-UUID package id without a 22P02', async () => {
    const response = await PATCH(request(consumeBody({ customer_package_id: 'pb-synthetic-package' })));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ success: false });
  });

  it('rejects a non-UUID booking_id without letting a 22P02 leak from the RPC cast', async () => {
    seedPackage();
    const response = await PATCH(request(consumeBody({ booking_id: 'booking-1' })));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ success: false });
  });

  it('rejects an unknown UUID package id', async () => {
    const response = await PATCH(request(consumeBody({ customer_package_id: UNKNOWN_PACKAGE_ID, quantity_used: 1 })));
    expect(response.status).toBe(400);
  });

  it('returns alreadyDeducted on a repeated booking and does not deduct twice', async () => {
    seedPackage({ remaining: 5_000, used: 5_000 });
    await PATCH(request(consumeBody({ quantity_used: 2_000 })));
    const response = await PATCH(request(consumeBody({ quantity_used: 3_000 })));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toMatchObject({ alreadyDeducted: true, consumed: 2_000, remainingPulses: 3_000 });
    expect(fake.rows('package_pulse_usage')).toHaveLength(1);
    expect(fake.rows('customer_packages')[0].pulses_remaining).toBe(3_000);
  });

  it('returns usage history from package_pulse_usage rows in the old blob field names', async () => {
    seedPackage({ remaining: 5_000, used: 5_000 });
    const response = await PATCH(request(consumeBody({ quantity_used: 2_000, treatment_area: 'Face' })));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.packagePulses.usage_history).toHaveLength(1);
    expect(body.packagePulses.usage_history[0]).toMatchObject({
      quantity_used: 2_000,
      booking_id: RESERVATION_ID,
      treatment_area: 'Face',
      remaining_after: 3_000,
    });
  });

  it('an RPC failure is a real error, never success:true', async () => {
    seedPackage();
    fake.setRpc('consume_package_pulses', () => ({ data: null, error: { message: 'connection reset' } }));
    const response = await PATCH(request(consumeBody()));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({ success: false });
  });

  it('never reads or writes the page_settings pulse blob', async () => {
    seedPackage({ remaining: 5_000, used: 5_000 });
    await PATCH(request(consumeBody({ quantity_used: 2_000 })));
    // The sentinel blob row must be untouched — the route has no business near it.
    const sentinel = fake.rows('page_settings').find((r) => r.key === 'customer_package_pulses');
    expect(sentinel?.value?.[PACKAGE_ID]?.remaining_pulses).toBe(999);
  });
});

describe('PATCH /api/customers/packages set_included_pulses (columns)', () => {
  it('writes total_pulses/pulses_remaining on the row, not the blob', async () => {
    seedPackage({ total: 0, remaining: 0, used: 0 });
    const response = await PATCH(request({
      action: 'set_included_pulses',
      customer_package_id: PACKAGE_ID,
      included_pulses: 8_000,
    }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.packagePulses).toMatchObject({ included_pulses: 8_000, used_pulses: 0, remaining_pulses: 8_000 });
    const row = fake.rows('customer_packages')[0];
    expect(row.total_pulses).toBe(8_000);
    expect(row.pulses_remaining).toBe(8_000);
    const sentinel = fake.rows('page_settings').find((r) => r.key === 'customer_package_pulses');
    expect(sentinel?.value?.[PACKAGE_ID]?.remaining_pulses).toBe(999);
  });

  it('rejects a synthetic package id', async () => {
    const response = await PATCH(request({
      action: 'set_included_pulses',
      customer_package_id: 'pb-synthetic-package',
      included_pulses: 8_000,
    }));
    expect(response.status).toBe(400);
  });
});
