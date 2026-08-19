/**
 * The doctor's own top-level shell. Money-relevant logic that lives HERE (not delegated to
 * DoctorOngoingSessionTab, already covered separately) is `handleCompleteTreatment`'s checkout
 * PATCH — the `amountLeft` calculation and status transition that actually closes out a session's
 * invoice (module 3 / F-4-adjacent of ai_docs/TEST_COVERAGE_INVENTORY.md) — plus the reservation
 * filtering/dedup that feeds every other tab.
 *
 * Like AdminBookingsView and UserProfileView, this component reads/writes Supabase directly from
 * the browser (providers/branches lookups, a realtime channel) in addition to calling `fetch()` for
 * the API routes — see the batch report re: RISKS.md RISK-019 drift.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createFetchFake } from '../../helpers/fetchFake';
import { createSupabaseFake } from '../../helpers/supabaseFake';

const fetchFake = createFetchFake();
const fake = createSupabaseFake();

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: { getSession: async () => ({ data: { session: { access_token: 'test-token' } } }) },
    from: (table: string) => fake.client.from(table),
    channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
    removeChannel: () => {},
  },
}));

import DoctorAccountView from '@/components/admin/DoctorAccountView';

beforeEach(() => {
  fetchFake.reset();
  fake.reset();
  vi.stubGlobal('fetch', fetchFake.fetch);
  fake.seed('providers', [{ id: 'doc-1', name: 'Dr. Sara Adel' }]);
  fake.seed('branches', [{ id: 'b1', name_en: 'Maadi' }]);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function reservation(overrides: Record<string, any>) {
  return {
    id: 'res-1',
    doctor_id: 'doc-1',
    doctorName: 'Dr. Sara Adel',
    status: 'started',
    date: '2026-08-10',
    name: 'Patient A',
    customer_id: 'c1',
    price: 800,
    amountPaid: 300,
    ...overrides,
  };
}

const BASE_PROPS = {
  doctorDbId: 'doc-1',
  doctorName: 'Dr. Sara Adel',
  doctorEmail: 'sara@clinic.com',
  doctorBranch: 'Main Branch',
  branches: [{ id: 'b1', name_en: 'Maadi' }],
  onLogout: vi.fn(),
};

describe('checkout — handleCompleteTreatment', () => {
  it('PATCHes /api/reservations with status completed and amountLeft = invoice total minus amount already paid', async () => {
    fetchFake.on('GET', '/api/reservations', () => ({ status: 200, body: [] }));
    fetchFake.on('PATCH', '/api/reservations', (call) => {
      expect(call.query.get('id')).toBe('res-1');
      expect(call.body).toMatchObject({
        id: 'res-1',
        status: 'completed',
        amountLeft: 500, // 800 (base price, no add-ons) - 300 already paid
      });
      return { status: 200, body: { success: true } };
    });
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const user = userEvent.setup();

    render(<DoctorAccountView {...BASE_PROPS} initialReservations={[reservation({})]} />);

    await user.click(screen.getByTitle('Ongoing Session'));
    await user.click(await screen.findByText('Complete Treatment'));

    await waitFor(() => expect(fetchFake.calls.some((c) => c.method === 'PATCH' && c.path === '/api/reservations')).toBe(true));
    expect(alertSpy).toHaveBeenCalledWith('Session completed successfully! Product stock & device pulses deducted.');
  });

  it('shows the server error instead of a false success alert when the completion PATCH fails', async () => {
    fetchFake.on('GET', '/api/reservations', () => ({ status: 200, body: [] }));
    fetchFake.on('PATCH', '/api/reservations', () => ({ status: 400, body: { error: 'Reservation already completed.' } }));
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const user = userEvent.setup();

    render(<DoctorAccountView {...BASE_PROPS} initialReservations={[reservation({})]} />);

    await user.click(screen.getByTitle('Ongoing Session'));
    await user.click(await screen.findByText('Complete Treatment'));

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Reservation already completed.'));
  });
});

describe('reservation filtering', () => {
  it('excludes rejected and cancelled bookings from the doctor patients list', async () => {
    const reservations = [
      reservation({ id: 'r1', status: 'completed', name: 'Kept Patient', customer_id: 'c1' }),
      reservation({ id: 'r2', status: 'rejected', name: 'Rejected Patient', customer_id: 'c2' }),
      reservation({ id: 'r3', status: 'cancelled', name: 'Cancelled Patient', customer_id: 'c3' }),
    ];
    // fetchDoctorReservations() re-fetches on mount and overwrites the initialReservations seed —
    // mirror it here so the background refresh doesn't wipe the fixture mid-test.
    fetchFake.on('GET', '/api/reservations', () => ({ status: 200, body: reservations }));
    const user = userEvent.setup();
    render(<DoctorAccountView {...BASE_PROPS} initialReservations={reservations} />);

    await user.click(screen.getByTitle('Patients'));
    expect(await screen.findByText('Kept Patient')).toBeInTheDocument();
    expect(screen.queryByText('Rejected Patient')).not.toBeInTheDocument();
    expect(screen.queryByText('Cancelled Patient')).not.toBeInTheDocument();
  });

  it('dedupes multiple bookings from the same customer into one patient with an accurate visit count', async () => {
    const reservations = [
      reservation({ id: 'r1', status: 'completed', name: 'Repeat Patient', customer_id: 'c9', date: '2026-08-01' }),
      reservation({ id: 'r2', status: 'completed', name: 'Repeat Patient', customer_id: 'c9', date: '2026-08-15' }),
    ];
    fetchFake.on('GET', '/api/reservations', () => ({ status: 200, body: reservations }));
    const user = userEvent.setup();
    render(<DoctorAccountView {...BASE_PROPS} initialReservations={reservations} />);

    await user.click(screen.getByTitle('Patients'));
    expect(await screen.findByText('Repeat Patient')).toBeInTheDocument();
    // "2 Visits" legitimately appears twice: the patient card badge and the "View Details" button.
    expect(screen.getAllByText(/2\s+Visits/).length).toBeGreaterThan(0);
  });
});
