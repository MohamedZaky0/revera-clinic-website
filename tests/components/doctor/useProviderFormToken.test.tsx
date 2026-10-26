import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// RISK-140: GET /api/providers only returns salaries, national ids and commission settings to a valid
// staff token. The admin Doctors screen's list loader must therefore send the bearer token, and it
// must read the token when it runs (the mount effect calls it before the `session` prop is filled).

vi.mock('@/lib/authHeaders', () => ({
  getAuthHeaders: vi.fn(async () => ({ 'Content-Type': 'application/json', Authorization: 'Bearer staff-token' })),
}));

import { useProviderForm } from '@/components/admin/doctor/useProviderForm';

let calls: { url: string; init: any }[];

beforeEach(() => {
  calls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, init?: any) => {
      calls.push({ url, init });
      return Promise.resolve({ ok: true, json: async () => [{ id: 'p1', name: 'Dr A', fixedSalary: 9000 }] } as any);
    }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useProviderForm.fetchProviders sends the staff token (RISK-140)', () => {
  it('GET /api/providers carries Authorization even when the session prop is still null', async () => {
    const { result } = renderHook(() =>
      useProviderForm({
        branches: [],
        session: null,
        authenticatedJsonHeaders: { 'Content-Type': 'application/json', Authorization: 'Bearer ' },
        showConfirm: async () => true,
        fetchRolesAndEmployees: () => {},
        getDoctorFirstReservationDate: () => null,
        allReservations: [],
        activeNav: 'Doctors',
        adminRole: 'superadmin',
        hasPermission: () => true,
      }),
    );

    await act(async () => {
      result.current.fetchProviders();
      await new Promise((r) => setTimeout(r, 30));
    });

    const gets = calls.filter((c) => c.url === '/api/providers');
    expect(gets).toHaveLength(1);
    expect(gets[0].init.headers.Authorization).toBe('Bearer staff-token');
    expect(result.current.providers).toEqual([{ id: 'p1', name: 'Dr A', fixedSalary: 9000 }]);
  });
});
