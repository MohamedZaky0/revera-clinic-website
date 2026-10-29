import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import SettleDebtModal from '@/components/admin/patients/SettleDebtModal';

vi.mock('@/lib/authHeaders', () => ({
  getAuthHeaders: vi.fn().mockResolvedValue({ Authorization: 'Bearer test' }),
}));

describe('SettleDebtModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders zero debt banner when outstanding <= 0', () => {
    const onClose = vi.fn();
    const onSettled = vi.fn();
    render(
      <SettleDebtModal
        customer={{ id: 'c1', name: 'Nour Ali', outstanding: 0 }}
        onClose={onClose}
        onSettled={onSettled}
      />
    );

    expect(screen.getByText(/No Outstanding Balance/i)).toBeInTheDocument();
  });

  it('loads and displays unpaid sessions list when API succeeds', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        customer: { id: 'c1', name: 'Nour Ali', outstanding: 200 },
        unpaidSessions: [
          {
            id: 'res-1',
            type: 'reservation',
            date: '2026-10-01',
            serviceName: 'Hydrafacial Cleanse',
            doctorName: 'Dr. Sara',
            totalPrice: 500,
            amountPaid: 300,
            amountLeft: 200,
            status: 'completed',
          },
        ],
      }),
    } as any);

    render(
      <SettleDebtModal
        customer={{ id: 'c1', name: 'Nour Ali', outstanding: 200 }}
        onClose={vi.fn()}
        onSettled={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Hydrafacial Cleanse')).toBeInTheDocument();
    });
    expect(screen.getByText(/Paid: 300/i)).toBeInTheDocument();
  });

  it('shows direct balance fallback when patient has debt but unpaid sessions list is empty', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        customer: { id: 'c1', name: 'Nour Ali', outstanding: 150 },
        unpaidSessions: [],
      }),
    } as any);

    render(
      <SettleDebtModal
        customer={{ id: 'c1', name: 'Nour Ali', outstanding: 150 }}
        onClose={vi.fn()}
        onSettled={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Direct Account Balance Settlement/i)).toBeInTheDocument();
    });
  });
});
