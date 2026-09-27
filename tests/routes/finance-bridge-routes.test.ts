/**
 * DEC-088 item 9: GET /api/finance/revenue-bridge (cash received + the part that paid for packages) and
 * GET /api/finance/deferred-packages (money owed to customers for undelivered pulses/sessions). The arithmetic is
 * covered in tests/lib/financeBridge.test.ts; here the routes are checked for what they read, filter and gate on.
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

import { GET as bridgeGET } from '@/app/api/finance/revenue-bridge/route';
import { GET as deferredGET } from '@/app/api/finance/deferred-packages/route';

const USER_ID = 'u1';

function req(path: string, withAuth = true): Request {
  return new Request(`http://localhost:3000${path}`, { headers: withAuth ? { Authorization: 'Bearer t' } : {} });
}
function seedRole(roleName: string, permissions: string[] = []) {
  fake.authGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
  fake.seed('employee_accounts', [{ id: 'e1', auth_user_id: USER_ID, role_name: roleName, email: 'a@test.com' }]);
  fake.seed('roles', [{ name: roleName, permissions }]);
}

beforeEach(() => fake.reset());

describe('GET /api/finance/revenue-bridge', () => {
  beforeEach(() => {
    seedRole('superadmin');
    fake.seed('invoices', [
      { id: 'pkg', status: 'issued', grand_total: 5000, is_opening: false, branch_id: 'b1' },
      { id: 'mixed', status: 'issued', grand_total: 2000, is_opening: null, branch_id: 'b1' },
      { id: 'svc', status: 'issued', grand_total: 1000, is_opening: false, branch_id: 'b2' },
      { id: 'backfill', status: 'issued', grand_total: 9000, is_opening: true, branch_id: 'b1' },
      { id: 'void', status: 'void', grand_total: 700, is_opening: false, branch_id: 'b1' },
    ]);
    fake.seed('invoice_lines', [
      { id: 'l1', invoice_id: 'pkg', line_type: 'package', line_total: 5000 },
      { id: 'l2', invoice_id: 'mixed', line_type: 'package', line_total: 1500 },
      { id: 'l3', invoice_id: 'mixed', line_type: 'service', line_total: 500 },
      { id: 'l4', invoice_id: 'svc', line_type: 'service', line_total: 1000 },
      { id: 'l5', invoice_id: 'backfill', line_type: 'package', line_total: 9000 },
    ]);
    fake.seed('payments', [
      { id: 'p1', invoice_id: 'pkg', amount: 5000, received_at: '2026-09-10T10:00:00Z' },
      { id: 'p2', invoice_id: 'mixed', amount: 2000, received_at: '2026-09-11T10:00:00Z' },
      { id: 'p3', invoice_id: 'svc', amount: 1000, received_at: '2026-09-12T10:00:00Z' },
      { id: 'p4', invoice_id: 'backfill', amount: 9000, received_at: '2026-09-13T10:00:00Z' },
      { id: 'p5', invoice_id: 'void', amount: 700, received_at: '2026-09-14T10:00:00Z' },
      { id: 'p6', invoice_id: 'pkg', amount: 111, received_at: '2026-10-02T10:00:00Z' }, // next month
    ]);
  });

  it('cash received and the package part, for the month — excluding backfilled, void and other-month payments', async () => {
    const res = await bridgeGET(req('/api/finance/revenue-bridge?period=2026-09'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.cashReceived).toBe(8000);            // 5,000 + 2,000 + 1,000
    expect(json.packageCashReceived).toBe(6500);     // 5,000 + 2,000 × 1,500/2,000
    expect(json.range.label).toBe('2026-09');
  });

  it('honours the branch filter', async () => {
    const res = await bridgeGET(req('/api/finance/revenue-bridge?period=2026-09&branchId=b2'));
    const json = await res.json();
    expect(json.cashReceived).toBe(1000);
    expect(json.packageCashReceived).toBe(0);
  });

  it('an empty month is zeros, not an error', async () => {
    const res = await bridgeGET(req('/api/finance/revenue-bridge?period=2026-01'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json).toMatchObject({ cashReceived: 0, packageCashReceived: 0 });
  });

  it('requires finance access', async () => {
    fake.reset();
    seedRole('receptionist');
    const res = await bridgeGET(req('/api/finance/revenue-bridge?period=2026-09'));
    expect(res.status).toBe(403);
  });

  it('rejects an unauthenticated request', async () => {
    const res = await bridgeGET(req('/api/finance/revenue-bridge?period=2026-09', false));
    expect([401, 403]).toContain(res.status);
  });

  it('rejects a malformed period with a 500 message rather than a wrong number', async () => {
    const res = await bridgeGET(req('/api/finance/revenue-bridge?period=september'));
    expect(res.status).toBe(500);
  });
});

describe('GET /api/finance/deferred-packages', () => {
  beforeEach(() => {
    seedRole('superadmin');
    fake.seed('customers', [{ id: 'c1', name: 'Mona' }, { id: 'c2', name: 'Sara' }, { id: 'c3', name: 'Randa' }]);
    fake.seed('packages', [{ id: 'cat-pulses', name: '10,000 Pulses' }, { id: 'cat-body', name: 'Body Bundle' }]);
    fake.seed('services', [{ id: 1, en: 'Underarm', ar: 'إبط' }, { id: 2, en: 'Full Body', ar: 'جسم كامل' }]);
    fake.seed('customer_packages', [
      { id: 'a', customer_id: 'c1', package_id: 'cat-pulses', status: 'active', price_paid: 5000, price_pending: false, package_type: 'pulses', total_pulses: 10000, pulses_remaining: 6000, expires_at: '2099-01-01T00:00:00Z' },
      { id: 'b', customer_id: 'c2', package_id: 'cat-body', status: 'active', price_paid: 1100, price_pending: false, package_type: 'services', total_pulses: 0, pulses_remaining: 0, expires_at: '2099-01-01T00:00:00Z' },
      { id: 'c', customer_id: 'c3', package_id: 'cat-pulses', status: 'active', price_paid: 0, price_pending: true, package_type: 'pulses', total_pulses: 2500, pulses_remaining: 2500, expires_at: '2099-01-01T00:00:00Z' },
      { id: 'd', customer_id: 'c1', package_id: 'cat-pulses', status: 'fully_used', price_paid: 2000, price_pending: false, package_type: 'pulses', total_pulses: 2500, pulses_remaining: 0, expires_at: null },
    ]);
    fake.seed('customer_package_items', [
      { customer_package_id: 'b', service_id: 1, qty_total: 5, qty_remaining: 5 },
      { customer_package_id: 'b', service_id: 2, qty_total: 6, qty_remaining: 6 },
    ]);
  });

  it('breaks the deferred balance down by what it is owed for and lists the pending package separately', async () => {
    const res = await deferredGET(req('/api/finance/deferred-packages'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.pulses).toEqual({ packages: 1, pulsesRemaining: 6000, amount: 3000 });
    expect(json.services).toEqual([
      { serviceId: 2, serviceName: 'Full Body', sessionsRemaining: 6, amount: 600 },
      { serviceId: 1, serviceName: 'Underarm', sessionsRemaining: 5, amount: 500 },
    ]);
    expect(json.total).toBe(4100);
    expect(json.pending.count).toBe(1);
    expect(json.pending.packages[0]).toMatchObject({ id: 'c', customerName: 'Randa', packageName: '10,000 Pulses', remaining: 2500 });
    expect(typeof json.asOf).toBe('string');
  });

  it('a clinic with no packages returns an empty breakdown, not an error', async () => {
    fake.seed('customer_packages', []);
    const res = await deferredGET(req('/api/finance/deferred-packages'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json).toMatchObject({ total: 0, services: [], pending: { count: 0 } });
  });

  it('requires finance access', async () => {
    fake.reset();
    seedRole('receptionist');
    const res = await deferredGET(req('/api/finance/deferred-packages'));
    expect(res.status).toBe(403);
  });
});
