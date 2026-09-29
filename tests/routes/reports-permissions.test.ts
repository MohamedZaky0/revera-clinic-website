/**
 * DEC-097: Reports permission gates. Moved endpoints should accept both legacy finance permissions
 * and new reports permissions for backward compatibility.
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

import { GET as trendGET } from '@/app/api/finance/trend/route';
import { GET as serviceMarginGET } from '@/app/api/finance/service-margin/route';
import { GET as newVsReturningGET } from '@/app/api/finance/new-vs-returning/route';
import { GET as capacityGET } from '@/app/api/finance/capacity/route';
import { GET as pnlGET } from '@/app/api/finance/pnl/route';
import { GET as cashflowGET } from '@/app/api/finance/cashflow/route';

const USER_ID = 'u1';

function req(path: string, withAuth = true): Request {
  return new Request(`http://localhost:3000${path}`, { headers: withAuth ? { Authorization: 'Bearer t' } : {} });
}

function seedRole(roleName: string, permissions: string[] = []) {
  fake.authGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
  fake.seed('employee_accounts', [{ id: 'e1', auth_user_id: USER_ID, role_name: roleName, email: 'a@test.com' }]);
  fake.seed('roles', [{ name: roleName, permissions }]);
}

function seedMinimalData() {
  // Seed empty tables that routes read
  fake.seed('invoices', []);
  fake.seed('invoice_lines', []);
  fake.seed('package_revenue_recognitions', []);
  fake.seed('expenses', []);
  fake.seed('fixed_assets', []);
  fake.seed('depreciation_entries', []);
  fake.seed('loan_schedule', []);
  fake.seed('branches', [{ id: 'b1', name_en: 'Main', status: 'active' }]);
  fake.seed('reservations', []);
  fake.seed('customer_packages', []);
  fake.seed('services', []);
  fake.seed('providers', []);
  fake.seed('rooms', []);
  fake.seed('holiday_calendar', []);
}

beforeEach(() => fake.reset());

describe('Reports permission gates (DEC-097)', () => {
  describe('with reports.view_financial_reports permission', () => {
    beforeEach(() => {
      seedRole('analyst', ['reports.view_financial_reports']);
      seedMinimalData();
    });

    it('trend returns 200', async () => {
      const res = await trendGET(req('/api/finance/trend?months=6'));
      expect(res.status).toBe(200);
    });

    it('service-margin returns 200', async () => {
      const res = await serviceMarginGET(req('/api/finance/service-margin?period=2026-09'));
      expect(res.status).toBe(200);
    });

    it('new-vs-returning returns 200', async () => {
      const res = await newVsReturningGET(req('/api/finance/new-vs-returning?period=2026-09'));
      expect(res.status).toBe(200);
    });

    it('pnl returns 403 (not a reports endpoint)', async () => {
      const res = await pnlGET(req('/api/finance/pnl?period=2026-09'));
      expect(res.status).toBe(403);
    });

    it('cashflow returns 403 (not a reports endpoint)', async () => {
      const res = await cashflowGET(req('/api/finance/cashflow?period=2026-09'));
      expect(res.status).toBe(403);
    });

    it('capacity returns 403 (requires reports.view_analytics)', async () => {
      const res = await capacityGET(req('/api/finance/capacity?period=2026-09'));
      expect(res.status).toBe(403);
    });
  });

  describe('with reports.view_analytics permission', () => {
    beforeEach(() => {
      seedRole('ops_analyst', ['reports.view_analytics']);
      seedMinimalData();
    });

    it('capacity returns 200', async () => {
      const res = await capacityGET(req('/api/finance/capacity?period=2026-09'));
      expect(res.status).toBe(200);
    });

    it('trend returns 403 (requires reports.view_financial_reports)', async () => {
      const res = await trendGET(req('/api/finance/trend?months=6'));
      expect(res.status).toBe(403);
    });
  });

  describe('with legacy finance.view_pnl permission (backward compat)', () => {
    beforeEach(() => {
      seedRole('finance_admin', ['finance.view_pnl']);
      seedMinimalData();
    });

    it('trend returns 200', async () => {
      const res = await trendGET(req('/api/finance/trend?months=6'));
      expect(res.status).toBe(200);
    });
  });

  describe('with no permissions', () => {
    beforeEach(() => {
      seedRole('reception', []);
      seedMinimalData();
    });

    it('trend returns 403', async () => {
      const res = await trendGET(req('/api/finance/trend?months=6'));
      expect(res.status).toBe(403);
    });
  });
});
