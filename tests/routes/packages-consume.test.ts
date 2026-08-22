/**
 * Route-level tests for POST /api/packages/consume — burning one pre-paid package session.
 *
 * Module 4 (Packages, P0) of ai_docs/TEST_COVERAGE_INVENTORY.md, which recorded:
 * "Revenue is recognised as sessions are consumed — recognisedRevenueSoFar / deferredBalance are
 * already unit-tested in tests/lib/packages.test.ts, but the **endpoint wiring is not**."
 * This file closes that gap.
 *
 * Why it matters: this endpoint is the only thing standing between a patient's remaining pre-paid
 * sessions and a wrong decrement. A session burned here is money the clinic already collected and
 * a visit the patient no longer gets — there is no UI anywhere to hand one back.
 *
 * The route tries an RPC (`consume_customer_package_session`) and falls back to direct table
 * updates when it errors. The fallback is the path that actually runs in this deployment (see
 * commit eaee305, "add direct DB consume fallback"), so it is the default here; one test pins the
 * RPC-succeeds path so the branch isn't silently dropped later.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseFake } from '../helpers/supabaseFake';

// ── Fixed ids ─────────────────────────────────────────────────────────────────
const EMP_RECEPTION = 'e1111111-1111-1111-1111-111111111111';
const USER_RECEPTION = 'u1111111-1111-1111-1111-111111111111';
const CUSTOMER_A = 'c1111111-1111-1111-1111-111111111111';
const CUSTOMER_B = 'c2222222-2222-2222-2222-222222222222';
const PKG = 'p1111111-1111-1111-1111-111111111111';
const ITEM = 'i1111111-1111-1111-1111-111111111111';
const ITEM_SIBLING = 'i2222222-2222-2222-2222-222222222222';
const RESERVATION = 'r1111111-1111-1111-1111-111111111111';

const SERVICE_LASER = 501;
const SERVICE_FACIAL = 502;

const fake = createSupabaseFake();
const mockDb = fake.db;
const mockAuthGetUser = fake.authGetUser;

vi.mock('@/lib/supabaseServer', () => ({
  supabaseServer: {
    auth: { getUser: (...args: any[]) => fake.authGetUser(...args) },
    from: (table: string) => fake.client.from(table),
    rpc: (name: string, args?: any) => fake.client.rpc(name, args),
  },
}));

import { POST } from '@/app/api/packages/consume/route';

// ── Helpers ───────────────────────────────────────────────────────────────────

function req(body: any, token: string | null = 'reception-token'): Request {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return new Request('http://localhost:3000/api/packages/consume', {
    method: 'POST', headers, body: JSON.stringify(body),
  });
}

function seedStaffAuth() {
  mockAuthGetUser.mockResolvedValue({ data: { user: { id: USER_RECEPTION } }, error: null });
  mockDb.employee_accounts.push({
    id: EMP_RECEPTION, employee_id: 'EMP-001', email: 'reception@clinic.test',
    role_name: 'receptionist', auth_user_id: USER_RECEPTION,
  });
  mockDb.roles.push({ name: 'receptionist', permissions: {} });
}

/**
 * One active package for CUSTOMER_A holding 3 laser sessions, none used yet.
 *
 * The route reads the owner through PostgREST's embedded-select syntax
 * (`customer_packages!inner(customer_id)`), which the fake does not resolve — its `select()` is a
 * no-op that returns whole rows. The nested `customer_packages` object below is therefore the
 * stand-in for that join, mirroring exactly what PostgREST would return, not invented data: it is
 * kept consistent with the real `customer_packages` row seeded alongside it.
 */
function seedPackage(itemOverrides: Record<string, any> = {}) {
  mockDb.customer_packages.push({ id: PKG, customer_id: CUSTOMER_A, status: 'active' });
  mockDb.customer_package_items.push({
    id: ITEM, customer_package_id: PKG, service_id: SERVICE_LASER,
    qty_used: 0, qty_remaining: 3,
    customer_packages: { customer_id: CUSTOMER_A },
    ...itemOverrides,
  });
}

/** A completed booking for CUSTOMER_A that includes the laser service. */
function seedReservation(overrides: Record<string, any> = {}) {
  mockDb.reservations.push({
    id: RESERVATION, customer_id: CUSTOMER_A, service_id: null,
    service_ids: [SERVICE_LASER], status: 'completed', ...overrides,
  });
}

function currentItem() {
  return mockDb.customer_package_items.find((i: any) => i.id === ITEM);
}

beforeEach(() => {
  vi.clearAllMocks();
  fake.reset();
  for (const t of [
    'employee_accounts', 'roles', 'customers', 'customer_packages',
    'customer_package_items', 'reservations', 'reservation_products',
  ]) {
    fake.seed(t, []);
  }
  // Default: the Postgres function is absent in this deployment, so the route takes its
  // direct-table fallback. Individual tests override this to exercise the RPC branch.
  fake.setRpc('consume_customer_package_session', () => ({
    data: null, error: { message: 'function consume_customer_package_session does not exist' },
  }));
});

// ── Auth ──────────────────────────────────────────────────────────────────────

describe('auth', () => {
  it('rejects an unauthenticated request', async () => {
    const res = await POST(req({ customerPackageItemId: ITEM, reservationId: RESERVATION }, null));
    expect(res.status).toBe(401);
  });

  it('rejects a token with no staff account behind it', async () => {
    mockAuthGetUser.mockResolvedValue({ data: { user: { id: 'stranger' } }, error: null });
    const res = await POST(req({ customerPackageItemId: ITEM, reservationId: RESERVATION }));
    expect(res.status).toBe(403);
  });
});

// ── Input validation ──────────────────────────────────────────────────────────

describe('input validation', () => {
  beforeEach(seedStaffAuth);

  it('requires both ids', async () => {
    expect((await POST(req({ reservationId: RESERVATION }))).status).toBe(400);
    expect((await POST(req({ customerPackageItemId: ITEM }))).status).toBe(400);
  });

  it('404s on an unknown package item', async () => {
    seedReservation();
    const res = await POST(req({ customerPackageItemId: 'nope', reservationId: RESERVATION }));
    expect(res.status).toBe(404);
  });

  it('404s on an unknown reservation', async () => {
    seedPackage();
    const res = await POST(req({ customerPackageItemId: ITEM, reservationId: 'nope' }));
    expect(res.status).toBe(404);
  });
});

// ── The core rule: one call burns exactly one session ─────────────────────────

describe('consuming a session', () => {
  beforeEach(seedStaffAuth);

  it('decrements remaining by exactly one and increments used by exactly one', async () => {
    seedPackage();
    seedReservation();

    const res = await POST(req({ customerPackageItemId: ITEM, reservationId: RESERVATION }));
    expect(res.status).toBe(200);

    expect(currentItem()!.qty_remaining).toBe(2);
    expect(currentItem()!.qty_used).toBe(1);
  });

  it('refuses to consume an already-exhausted item rather than driving it negative', async () => {
    seedPackage({ qty_used: 3, qty_remaining: 0 });
    seedReservation();

    const res = await POST(req({ customerPackageItemId: ITEM, reservationId: RESERVATION }));
    expect(res.status).toBe(409);

    expect(currentItem()!.qty_remaining).toBe(0);
    expect(currentItem()!.qty_used).toBe(3);
  });

  it('only completed reservations may consume a session', async () => {
    seedPackage();
    seedReservation({ status: 'started' });

    const res = await POST(req({ customerPackageItemId: ITEM, reservationId: RESERVATION }));
    expect(res.status).toBe(409);
    expect(currentItem()!.qty_remaining).toBe(3);
  });

  it("closes the package once its last remaining session across all items is spent", async () => {
    // Two items, one already empty — spending the last one on this item empties the package.
    seedPackage({ qty_used: 2, qty_remaining: 1 });
    mockDb.customer_package_items.push({
      id: ITEM_SIBLING, customer_package_id: PKG, service_id: SERVICE_FACIAL,
      qty_used: 4, qty_remaining: 0,
    });
    seedReservation();

    const res = await POST(req({ customerPackageItemId: ITEM, reservationId: RESERVATION }));
    expect(res.status).toBe(200);

    expect(mockDb.customer_packages.find((p: any) => p.id === PKG)!.status).toBe('completed');
  });

  it('leaves the package active while any item still has sessions left', async () => {
    seedPackage({ qty_used: 2, qty_remaining: 1 });
    mockDb.customer_package_items.push({
      id: ITEM_SIBLING, customer_package_id: PKG, service_id: SERVICE_FACIAL,
      qty_used: 0, qty_remaining: 2,
    });
    seedReservation();

    await POST(req({ customerPackageItemId: ITEM, reservationId: RESERVATION }));
    expect(mockDb.customer_packages.find((p: any) => p.id === PKG)!.status).toBe('active');
  });

  it('uses the RPC result when the Postgres function is available, without touching tables itself', async () => {
    seedPackage();
    seedReservation();
    fake.setRpc('consume_customer_package_session', () => ({
      data: [{ customer_package_id: PKG, qty_used: 1, qty_remaining: 2, package_status: 'active' }],
      error: null,
    }));

    const res = await POST(req({ customerPackageItemId: ITEM, reservationId: RESERVATION }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.consumption).toEqual({
      customer_package_id: PKG, qty_used: 1, qty_remaining: 2, package_status: 'active',
    });

    // The RPC owns the decrement in this branch; the route must not also apply its fallback,
    // which would double-spend the session.
    expect(currentItem()!.qty_remaining).toBe(3);
  });
});

// ── Ownership: a package belongs to one patient ───────────────────────────────

describe('customer ownership', () => {
  beforeEach(seedStaffAuth);

  it("refuses to spend one patient's package on another patient's booking", async () => {
    seedPackage();
    seedReservation({ customer_id: CUSTOMER_B });

    const res = await POST(req({ customerPackageItemId: ITEM, reservationId: RESERVATION }));
    expect(res.status).toBe(409);
    expect(currentItem()!.qty_remaining).toBe(3);
  });

  it('matches on phone when the booking was never linked to a customer id, and backfills the link', async () => {
    // RISK-032's fork in miniature: a booking taken by phone with no customer_id attached. The
    // package owner is identified by the same number, so redemption should still work — and the
    // reservation should come away correctly linked so it never has to be re-guessed.
    seedPackage();
    seedReservation({ customer_id: null, phone: '0123 145 6123' });
    mockDb.customers.push({ id: CUSTOMER_A, phone: '01231456123' });

    const res = await POST(req({ customerPackageItemId: ITEM, reservationId: RESERVATION }));
    expect(res.status).toBe(200);

    expect(currentItem()!.qty_remaining).toBe(2);
    expect(mockDb.reservations.find((r: any) => r.id === RESERVATION)!.customer_id).toBe(CUSTOMER_A);
  });
});

// ── The service actually has to be on the booking ────────────────────────────

describe('service must be on the reservation', () => {
  beforeEach(seedStaffAuth);

  it('accepts a service attached to the booking as an additional service (reservation_products)', async () => {
    // Added by e79a691: services added mid-visit land in `reservation_products`, not in the
    // reservation's own `service_ids`, so a package covering one of them must still redeem.
    seedPackage();
    seedReservation({ service_ids: [SERVICE_FACIAL] });
    mockDb.reservation_products.push({ reservation_id: RESERVATION, service_id: SERVICE_LASER });

    const res = await POST(req({ customerPackageItemId: ITEM, reservationId: RESERVATION }));
    expect(res.status).toBe(200);
    expect(currentItem()!.qty_remaining).toBe(2);
  });

  // RISK-065, fixed 2026-08-22. e79a691 (2026-08-21) had refactored the original early-return
  // guard into a `hasService` flag (to make room for the reservation_products fallback above) but
  // never restored the return, so the route fell through and consumed a session for any service
  // regardless of whether it was on the booking. Restored as
  // `if (!hasService) return 409` right after the fallback block.
  it('refuses to burn a session for a service that is not on the booking at all', async () => {
    seedPackage();
    seedReservation({ service_ids: [SERVICE_FACIAL] });
    // Nothing in reservation_products either — the laser session simply was not delivered here.

    const res = await POST(req({ customerPackageItemId: ITEM, reservationId: RESERVATION }));
    expect(res.status).toBe(409);
  });
});
