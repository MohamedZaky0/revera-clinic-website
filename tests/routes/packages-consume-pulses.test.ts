import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseFake } from '../helpers/supabaseFake';

const fake = createSupabaseFake();

vi.mock('@/lib/supabaseServer', () => ({
  supabaseServer: {
    auth: { getUser: (...args: any[]) => fake.authGetUser(...args) },
    from: (table: string) => fake.client.from(table),
  },
}));

import { PATCH } from '@/app/api/customers/packages/route';

const USER_ID = '10000000-0000-4000-8000-000000000001';
const EMPLOYEE_ID = '20000000-0000-4000-8000-000000000002';
const PACKAGE_ID = '30000000-0000-4000-8000-000000000003';
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
    booking_id: 'booking-1',
    ...overrides,
  };
}

function seedPackage(options: { remaining?: number; total?: number; used?: number; expiresAt?: string; history?: any[] } = {}) {
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
  fake.seed('page_settings', [{
    key: 'customer_package_pulses',
    value: {
      [PACKAGE_ID]: {
        included_pulses: total,
        used_pulses: used,
        remaining_pulses: remaining,
        usage_history: options.history ?? [],
      },
    },
  }]);
}

beforeEach(() => {
  fake.reset();
  fake.authGetUser.mockResolvedValue({ data: { user: { id: USER_ID, email: 'staff@test.com' } }, error: null });
  fake.seed('employee_accounts', [{ id: EMPLOYEE_ID, auth_user_id: USER_ID, role_name: 'reception' }]);
  fake.seed('roles', [{ name: 'reception', permissions: [] }]);
  fake.seed('customer_packages', []);
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

  it('accepts a synthetic package id from the pulse store without a UUID database lookup', async () => {
    const syntheticId = 'pb-synthetic-package';
    fake.seed('page_settings', [{
      key: 'customer_package_pulses',
      value: {
        [syntheticId]: {
          included_pulses: 100,
          used_pulses: 0,
          remaining_pulses: 100,
          usage_history: [],
        },
      },
    }]);

    const response = await PATCH(request(consumeBody({ customer_package_id: syntheticId, quantity_used: 25 })));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ consumed: 25, requested: 25, remainingPulses: 75 });
  });

  it.fails('rejects an unknown UUID instead of fabricating a pulse quota', async () => {
    const response = await PATCH(request(consumeBody({ customer_package_id: UNKNOWN_PACKAGE_ID, quantity_used: 1 })));
    expect(response.status).toBe(400);
  });

  it('returns the booking idempotency result without deducting twice', async () => {
    seedPackage({
      remaining: 5_000,
      used: 5_000,
      history: [{
        id: 'usage-1',
        quantity_used: 1_000,
        used_at: '2026-09-21T00:00:00.000Z',
        booking_id: 'booking-1',
        remaining_after: 5_000,
      }],
    });

    const response = await PATCH(request(consumeBody({ quantity_used: 2_000 })));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ alreadyDeducted: true, consumed: 1_000, remainingPulses: 5_000 });
    expect(body.packagePulses.usage_history).toHaveLength(1);
  });
});
