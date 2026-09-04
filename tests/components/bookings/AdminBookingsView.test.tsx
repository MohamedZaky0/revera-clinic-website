/**
 * The main bookings calendar/table and the pending-approvals queue. This component reads and
 * WRITES `reservations` directly via the browser-side Supabase client (`@/lib/supabaseClient`,
 * anon key) instead of going through `PATCH /api/reservations` like every other approve/reject path
 * documented in ai_docs/TEST_COVERAGE_INVENTORY.md module 1 — see the batch report re: RISKS.md
 * RISK-019 drift. The `paymentStatus` derivation below is a regression guard for RISK-039
 * ("AdminBookingsView Fabricates Payment Status... (RESOLVED)") — the comment at
 * AdminBookingsView.tsx:231-234 explicitly warns against reintroducing the fabrication this test
 * pins against.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createSupabaseFake } from '../../helpers/supabaseFake';

const fake = createSupabaseFake();

vi.mock('@/lib/supabaseClient', () => ({
  supabase: { from: (table: string) => fake.client.from(table) },
}));

import { AdminBookingsView } from '@/components/admin/bookings/AdminBookingsView';

beforeEach(() => {
  fake.reset();
  fake.seed('reservations', []);
  fake.seed('providers', []);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function reservation(overrides: Record<string, any>) {
  return {
    id: 'r1',
    customer_name: 'Mona Ali',
    status: 'confirmed',
    ...overrides,
  };
}

describe('payment status derivation (RISK-039 regression guard)', () => {
  it('shows "—" (unknown) rather than "Paid" when amountPaid was never recorded', async () => {
    render(<AdminBookingsView allReservations={[reservation({ id: 'r1', customer_name: 'No Data Patient' })]} />);
    await screen.findByText('No Data Patient');
    const row = screen.getByText('No Data Patient').closest('tr') as HTMLElement;
    expect(row.textContent).toContain('—');
  });

  it('shows "Unpaid" when amountPaid is zero', async () => {
    render(
      <AdminBookingsView
        allReservations={[reservation({ id: 'r1', customer_name: 'Unpaid Patient', amountPaid: 0, amountLeft: 500 })]}
      />
    );
    await screen.findByText('Unpaid Patient');
    expect(screen.getByText('Unpaid')).toBeInTheDocument();
  });

  it('shows "—" (unknown), not "Paid", when amountPaid is recorded but amountLeft was never recorded', async () => {
    render(
      <AdminBookingsView allReservations={[reservation({ id: 'r1', customer_name: 'Partial Data Patient', amountPaid: 300 })]} />
    );
    await screen.findByText('Partial Data Patient');
    const row = screen.getByText('Partial Data Patient').closest('tr') as HTMLElement;
    expect(row.textContent).toContain('—');
  });

  it('shows "Partially Paid" when a balance remains', async () => {
    render(
      <AdminBookingsView
        allReservations={[reservation({ id: 'r1', customer_name: 'Partial Payer', amountPaid: 300, amountLeft: 200 })]}
      />
    );
    await screen.findByText('Partial Payer');
    expect(screen.getByText('Partially Paid')).toBeInTheDocument();
  });

  it('shows "Paid" only when both amountPaid is positive and amountLeft is zero', async () => {
    render(
      <AdminBookingsView
        allReservations={[reservation({ id: 'r1', customer_name: 'Full Payer', amountPaid: 500, amountLeft: 0 })]}
      />
    );
    await screen.findByText('Full Payer');
    expect(screen.getByText('Paid')).toBeInTheDocument();
  });
});

describe('doctor name resolution', () => {
  it('uses the raw doctor name on the reservation when present', async () => {
    render(
      <AdminBookingsView allReservations={[reservation({ id: 'r1', customer_name: 'Patient X', doctor_name: 'Dr. Omar' })]} />
    );
    await screen.findByText('Patient X');
    expect(screen.getByText('Dr. Omar')).toBeInTheDocument();
  });

  it('falls back to looking up the provider by id when no doctor name is present on the reservation', async () => {
    render(
      <AdminBookingsView
        allReservations={[reservation({ id: 'r1', customer_name: 'Patient Y', provider_id: 'prov-1' })]}
        providers={[{ id: 'prov-1', name: 'Dr. Hana' }]}
      />
    );
    await screen.findByText('Patient Y');
    expect(screen.getByText('Dr. Hana')).toBeInTheDocument();
  });

  it('shows "—" when no doctor name and no matching provider can be found', async () => {
    render(<AdminBookingsView allReservations={[reservation({ id: 'r1', customer_name: 'Patient Z', provider_id: 'ghost' })]} />);
    await screen.findByText('Patient Z');
    const row = screen.getByText('Patient Z').closest('tr') as HTMLElement;
    expect(row.textContent).toContain('—');
  });
});

describe('pending approvals — approve/reject', () => {
  it('approve writes status=approved directly to Supabase for that reservation id and calls onApproveBooking', async () => {
    fake.seed('reservations', [{ id: 'req-1', status: 'pending' }]);
    const onApproveBooking = vi.fn();
    const user = userEvent.setup();
    render(
      <AdminBookingsView
        requests={[{ id: 'req-1', patientName: 'Pending Patient' }]}
        onApproveBooking={onApproveBooking}
      />
    );

    await user.click(screen.getByRole('button', { name: /Pending/ }));
    await screen.findByText('Pending Patient');
    await user.click(screen.getByTitle('Approve'));

    await waitFor(() => expect(fake.rows('reservations').find((r) => r.id === 'req-1')?.status).toBe('approved'));
    expect(onApproveBooking).toHaveBeenCalledWith(expect.objectContaining({ id: 'req-1' }));
  });

  it('reject writes status=rejected directly to Supabase for that reservation id and calls onRejectBooking', async () => {
    fake.seed('reservations', [{ id: 'req-2', status: 'pending' }]);
    const onRejectBooking = vi.fn();
    const user = userEvent.setup();
    render(
      <AdminBookingsView
        requests={[{ id: 'req-2', patientName: 'Another Pending Patient' }]}
        onRejectBooking={onRejectBooking}
      />
    );

    await user.click(screen.getByRole('button', { name: /Pending/ }));
    await screen.findByText('Another Pending Patient');
    await user.click(screen.getByTitle('Reject'));

    await waitFor(() => expect(fake.rows('reservations').find((r) => r.id === 'req-2')?.status).toBe('rejected'));
    expect(onRejectBooking).toHaveBeenCalledWith(expect.objectContaining({ id: 'req-2' }));
  });
});
