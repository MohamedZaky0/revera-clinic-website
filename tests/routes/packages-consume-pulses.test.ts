/**
 * Route-level tests for PATCH /api/customers/packages `consume_package_pulses`.
 *
 * Originally written for Brief 34 against the page_settings blob store; updated for Brief 34B,
 * which moved the balance to the customer_packages columns behind the consume_package_pulses RPC.
 * Contract coverage beyond this file lives in packages-consume-pulses-columns.test.ts.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseFake } from '../helpers/supabaseFake';

const fake = createSupabaseFake();

vi.mock('@/lib/supabaseServer', () => ({
  supabaseServer: {
    auth: { getUser: (...args: any[]) => fake.authGetUser(...args), getClaims: (...args: any[]) => fake.authGetClaims(...args) },
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

function installRealisticRpc() {
  fake.setRpc('consume_package_pulses', (args: any) => {
    const row = (fake.db['customer_packages'] || []).find((r) => r.id === args.p_customer_package_id);
    if (!row) return { data: null, error: { message: 'customer package not found' } };
    const prior = args.p_reservation_id
      ? (fake.db['package_pulse_usage'] || []).find((u) => u.customer_package_id === row.id && u.reservation_id === args.p_reservation_id)
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
      id: `ppu-${(fake.db['package_pulse_usage'] || []).length}`,
      customer_package_id: row.id,
      reservation_id: args.p_reservation_id,
      quantity_used: consumed,
      remaining_after: row.pulses_remaining,
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
  fake.seed('page_settings', []);
});

describe('PATCH /api/customers/packages consume_package_pulses', () => {
  it('requires a staff session', async () => {
    const response = await PATCH(request(consumeBody(), false));
    expect(response.status).toBe(401);
  });

  it('clamps a request above the remaining balance and reports consumed versus requested', async () => {
    seedPackage({ remaining: 5_000, used: 5_000 });

    const response = await PATCH(request(consumeBody({ quantity_used: 10_000 })));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ consumed: 5_000, requested: 10_000, remainingPulses: 0 });
  });

  it('consumes an exactly equal balance', async () => {
    seedPackage({ remaining: 5_000, used: 5_000 });

    const response = await PATCH(request(consumeBody()));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ consumed: 5_000, requested: 5_000, remainingPulses: 0 });
  });

  it('rejects a package whose balance is already zero', async () => {
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

  it('rejects a synthetic package id cleanly — there is no blob for it to live in anymore', async () => {
    const response = await PATCH(request(consumeBody({ customer_package_id: 'pb-synthetic-package', quantity_used: 25 })));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ success: false });
  });

  it('rejects an unknown UUID instead of fabricating a pulse quota', async () => {
    const response = await PATCH(request(consumeBody({ customer_package_id: UNKNOWN_PACKAGE_ID, quantity_used: 1 })));
    expect(response.status).toBe(400);
  });

  it('returns the booking idempotency result without deducting twice', async () => {
    seedPackage({ remaining: 5_000, used: 5_000 });
    fake.seed('package_pulse_usage', [{
      id: 'usage-1',
      customer_package_id: PACKAGE_ID,
      reservation_id: RESERVATION_ID,
      quantity_used: 1_000,
      remaining_after: 5_000,
      created_at: '2026-09-21T00:00:00.000Z',
    }]);

    const response = await PATCH(request(consumeBody({ quantity_used: 2_000 })));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ alreadyDeducted: true, consumed: 1_000, remainingPulses: 5_000 });
    expect(fake.rows('customer_packages')[0].pulses_remaining).toBe(5_000);
  });
});
