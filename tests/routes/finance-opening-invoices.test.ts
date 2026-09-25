/**
 * DEC-086: backfilled historical invoices are flagged `is_opening = true` and must feed customer
 * value / reconciliation but NEVER the revenue, margin or cash-flow reports (no COGS/commission,
 * they predate the ledger). Two layers:
 *  - behaviour: /api/finance/pnl and /api/finance/cashflow ignore an is_opening invoice;
 *  - source guard: every finance report that sums invoice revenue/cash keeps the exclusion filter,
 *    so a new report or a refactor cannot silently start counting backfilled history.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createSupabaseFake } from '../helpers/supabaseFake';

const fake = createSupabaseFake();

vi.mock('@/lib/supabaseServer', () => ({
  supabaseServer: {
    auth: { getUser: (...args: any[]) => fake.authGetUser(...args) },
    from: (table: string) => fake.client.from(table),
    rpc: (name: string, args?: any) => fake.client.rpc(name, args),
  },
}));

import { GET as pnlGET } from '@/app/api/finance/pnl/route';
import { GET as cashflowGET } from '@/app/api/finance/cashflow/route';

const USER_ID = '66666666-6666-6666-6666-666666666666';
const EMP_ID = '55555555-5555-5555-5555-555555555555';

function financeReq(path: string): Request {
  return new Request(`http://localhost:3000${path}`, { headers: { Authorization: 'Bearer staff-token' } });
}

function seedStaffAndInvoices() {
  fake.authGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
  fake.seed('employee_accounts', [{ id: EMP_ID, auth_user_id: USER_ID, role_name: 'superadmin', email: 'a@test.com' }]);
  fake.seed('roles', [{ name: 'superadmin', permissions: [] }]);
  fake.seed('invoices', [
    { id: 'inv-live', status: 'issued', issued_at: '2026-09-10T10:00:00Z', is_opening: false, branch_id: null },
    { id: 'inv-null', status: 'issued', issued_at: '2026-09-11T10:00:00Z', is_opening: null, branch_id: null },
    { id: 'inv-backfill', status: 'issued', issued_at: '2026-09-12T10:00:00Z', is_opening: true, branch_id: null },
  ]);
  fake.seed('invoice_lines', [
    { id: 'l1', invoice_id: 'inv-live', line_type: 'service', line_total: 1000, service_id: null },
    { id: 'l2', invoice_id: 'inv-null', line_type: 'service', line_total: 200, service_id: null },
    { id: 'l3', invoice_id: 'inv-backfill', line_type: 'service', line_total: 5000, service_id: null },
  ]);
  fake.seed('payments', [
    { id: 'p1', invoice_id: 'inv-live', amount: 1000, method: 'cash', received_at: '2026-09-10T10:00:00Z' },
    { id: 'p2', invoice_id: 'inv-null', amount: 200, method: 'cash', received_at: '2026-09-11T10:00:00Z' },
    { id: 'p3', invoice_id: 'inv-backfill', amount: 5000, method: 'cash', received_at: '2026-09-12T10:00:00Z' },
  ]);
}

describe('finance reports ignore is_opening (backfilled) invoices', () => {
  beforeEach(() => {
    fake.reset();
    seedStaffAndInvoices();
  });

  it('cashflow: cash received excludes the backfilled payment but keeps NULL/false invoices', async () => {
    const res = await cashflowGET(financeReq('/api/finance/cashflow?period=2026-09'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.cashReceived.total).toBe(1200);
  });

  it('pnl: revenue excludes the backfilled invoice line but keeps NULL/false invoices', async () => {
    const res = await pnlGET(financeReq('/api/finance/pnl?period=2026-09'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.revenue.services.total).toBe(1200);
  });
});

describe('every invoice-revenue finance report keeps the exclusion filter', () => {
  const routes = ['pnl', 'trend', 'branch-pnl', 'service-mix', 'service-margin', 'doctor-pnl', 'cashflow', 'new-vs-returning'];
  it.each(routes)('finance/%s excludes is_opening invoices', (name) => {
    const src = readFileSync(join(process.cwd(), 'src/app/api/finance', name, 'route.ts'), 'utf8');
    expect(src).toContain('.or(EXCLUDE_OPENING_INVOICES)');
    expect(src).toContain("from '@/lib/ledger'");
  });
});
