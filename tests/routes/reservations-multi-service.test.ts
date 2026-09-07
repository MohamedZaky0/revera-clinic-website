/**
 * Route-level tests for POST /api/reservations — multi-service bookings (RISK-081 / CORRUPT-U06).
 *
 * The public booking flow used to support only a single serviceId per session, while /admin and
 * this same route's PATCH handler already supported a service_ids array. Adds additionalServiceIds
 * (optional, on top of the required primary serviceId) so a patient can add more than one service
 * to the same session: total price and duration sum across every selected service, and the created
 * row's service_ids array carries the full set for downstream code (checkout, doctor payroll,
 * consumption) that already reads it.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createSupabaseFake } from '../helpers/supabaseFake';

const fake = createSupabaseFake();

vi.mock('@/lib/supabaseServer', () => ({
  supabaseServer: {
    auth: { getUser: (...args: any[]) => fake.authGetUser(...args) },
    from: (table: string) => fake.client.from(table),
    rpc: (name: string, args?: any) => fake.client.rpc(name, args),
  },
}));

import { POST } from '@/app/api/reservations/route';

const SERVICE_A = 10; // 30 min, 500 EGP
const SERVICE_B = 20; // 45 min, 300 EGP

function bookingReq(overrides: Record<string, any> = {}) {
  return new Request('http://localhost:3000/api/reservations', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      serviceId: SERVICE_A,
      date: '2099-01-10',
      requestedTime: '10:00',
      name: 'Patient A',
      email: 'patient@test.com',
      phone: '01035595691',
      sessionType: 'in_person',
      ...overrides,
    }),
  });
}

beforeEach(() => {
  fake.reset();
  fake.seed('services', [
    { id: SERVICE_A, duration: null, duration_minutes: 30, price: 500, branch_pricing: null, en: 'Facial' },
    { id: SERVICE_B, duration: null, duration_minutes: 45, price: 300, branch_pricing: null, en: 'Massage' },
  ]);
});

describe('POST /api/reservations — multi-service booking', () => {
  it('a single serviceId (no additionalServiceIds) behaves exactly as before', async () => {
    const res = await POST(bookingReq());
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.serviceIds).toEqual([SERVICE_A]);
  });

  it('additionalServiceIds sums price and duration across every selected service', async () => {
    const res = await POST(bookingReq({ additionalServiceIds: [SERVICE_B], amountLeft: undefined }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.serviceIds).toEqual(expect.arrayContaining([SERVICE_A, SERVICE_B]));
    expect(body.serviceIds).toHaveLength(2);
    // amountLeft defaults to the full service price when not explicitly supplied — proves the
    // combined price (500 + 300 = 800) was actually computed, not just the primary service's 500.
    expect(Number(body.amountLeft)).toBe(800);
  });

  it('a duplicate id in additionalServiceIds matching the primary service is not double-counted', async () => {
    const res = await POST(bookingReq({ additionalServiceIds: [SERVICE_A, SERVICE_B] }));
    const body = await res.json();
    expect(body.serviceIds.filter((id: number) => id === SERVICE_A)).toHaveLength(1);
  });

  it('serviceId is still the primary/first entry for backward-compatible single-service readers', async () => {
    const res = await POST(bookingReq({ additionalServiceIds: [SERVICE_B] }));
    const body = await res.json();
    expect(body.serviceId).toBe(SERVICE_A);
  });
});
