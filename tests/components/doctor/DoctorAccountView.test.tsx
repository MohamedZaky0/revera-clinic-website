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
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createFetchFake } from '../../helpers/fetchFake';
import { createSupabaseFake } from '../../helpers/supabaseFake';

const fetchFake = createFetchFake();
const fake = createSupabaseFake();
const mockShowConfirm = vi.fn();
const tablesRead: string[] = [];

// The app wraps everything in AlertConfirmProvider (src/app/layout.tsx); a bare render has none.
vi.mock('@/contexts/AlertConfirmContext', () => ({
  useAlertConfirm: () => ({ showConfirm: (...args: any[]) => mockShowConfirm(...args), showAlert: vi.fn(), showDeleteConfirm: vi.fn() }),
}));

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: { getSession: async () => ({ data: { session: { access_token: 'test-token' } } }) },
    from: (table: string) => {
      tablesRead.push(table);
      return fake.client.from(table);
    },
    channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
    removeChannel: () => {},
  },
}));

import DoctorAccountView from '@/components/admin/DoctorAccountView';

beforeEach(() => {
  tablesRead.length = 0;
  mockShowConfirm.mockReset();
  mockShowConfirm.mockResolvedValue(true);
  fetchFake.reset();
  fake.reset();
  vi.stubGlobal('fetch', fetchFake.fetch);
  fake.seed('providers', [{ id: 'doc-1', name: 'Dr. Sara Adel' }]);
  fake.seed('branches', [{ id: 'b1', name_en: 'Maadi' }]);
  fetchFake.on('GET', '/api/inventory/devices', () => ({ status: 200, body: [] }));
  fetchFake.on('GET', '/api/services', () => ({ status: 200, body: [] }));
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

// `handleCompleteTreatment` (added 4acad04) now blocks completion outright for a first-visit
// patient — no medical record AND no prior completed visit for the same customer/phone/name —
// until an intake form is filled and saved. That's a real clinical-safety gate, not a bug, so
// these tests seed a prior completed visit for the same `customer_id` to represent a returning
// patient, which is what "close out a checkout" is actually testing here. A separate describe
// block below covers the first-visit guard itself.
describe('checkout — handleCompleteTreatment', () => {
  it('PATCHes /api/reservations with status completed and amountLeft = invoice total minus amount already paid', async () => {
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

    // The component silently re-fetches /api/reservations on mount and overwrites its own
    // `reservations` state with whatever this returns — an empty-array mock would wipe out
    // `priorVisit` before the click ever happens, since the first-visit guard reads from that
    // same state it fetched.
    const priorVisit = reservation({ id: 'res-0', status: 'completed', date: '2026-01-01' });
    fetchFake.on('GET', '/api/reservations', () => ({ status: 200, body: [priorVisit, reservation({})] }));
    fetchFake.on('GET', '/api/medical-records', () => ({ status: 200, body: null }));
    fetchFake.on('GET', '/api/inventory/products', () => ({ status: 200, body: [] }));
    fetchFake.on('GET', '/api/medical-records/templates', () => ({ status: 200, body: [] }));

    render(<DoctorAccountView {...BASE_PROPS} />);

    await user.click(screen.getByTitle('Ongoing Session'));
    await user.click(await screen.findByText('Complete Treatment'));

    await waitFor(() => expect(fetchFake.calls.some((c) => c.method === 'PATCH' && c.path === '/api/reservations')).toBe(true));
    expect(alertSpy).toHaveBeenCalledWith('Session completed successfully! Laser pulses, products & charges recorded.');
  });

  it('shows the server error instead of a false success alert when the completion PATCH fails', async () => {
    fetchFake.on('PATCH', '/api/reservations', () => ({ status: 400, body: { error: 'Reservation already completed.' } }));
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const user = userEvent.setup();

    // The component silently re-fetches /api/reservations on mount and overwrites its own
    // `reservations` state with whatever this returns — an empty-array mock would wipe out
    // `priorVisit` before the click ever happens, since the first-visit guard reads from that
    // same state it fetched.
    const priorVisit = reservation({ id: 'res-0', status: 'completed', date: '2026-01-01' });
    fetchFake.on('GET', '/api/reservations', () => ({ status: 200, body: [priorVisit, reservation({})] }));
    fetchFake.on('GET', '/api/medical-records', () => ({ status: 200, body: null }));
    fetchFake.on('GET', '/api/inventory/products', () => ({ status: 200, body: [] }));
    fetchFake.on('GET', '/api/medical-records/templates', () => ({ status: 200, body: [] }));

    render(<DoctorAccountView {...BASE_PROPS} />);

    await user.click(screen.getByTitle('Ongoing Session'));
    await user.click(await screen.findByText('Complete Treatment'));

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Reservation already completed.'));
  });
});

describe('checkout — first-visit medical intake guard (4acad04)', () => {
  it('blocks completion for a first-visit patient with no medical record and no prior completed visit', async () => {
    fetchFake.on('GET', '/api/reservations', () => ({ status: 200, body: [reservation({})] }));
    fetchFake.on('GET', '/api/medical-records', () => ({ status: 200, body: null }));
    fetchFake.on('GET', '/api/inventory/products', () => ({ status: 200, body: [] }));
    fetchFake.on('GET', '/api/medical-records/templates', () => ({ status: 200, body: [] }));
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const user = userEvent.setup();

    render(<DoctorAccountView {...BASE_PROPS} />);

    await user.click(screen.getByTitle('Ongoing Session'));
    await user.click(await screen.findByText('Complete Treatment'));

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith(
      'Cannot complete treatment: Medical record intake is strictly required for first-visit patients. Please complete and save the intake form before ending the session.'
    ));
    expect(fetchFake.calls.some((c) => c.method === 'PATCH' && c.path === '/api/reservations')).toBe(false);
  });
});

// RISK-123: the Ongoing Session panel keeps its own copy of the started booking. When reception completed
// the booking the polled list updated, but the copy still said "started", so the panel (and its
// clinical-note box) stayed open on a finished session. The realtime handler already closed it for the
// same statuses; the polling path did not.
describe('ongoing session — booking ended by someone else (RISK-123)', () => {
  function stubSessionRoutes(reservations: () => any[]) {
    fetchFake.on('GET', '/api/reservations', () => ({ status: 200, body: reservations() }));
    fetchFake.on('GET', '/api/medical-records', () => ({ status: 200, body: null }));
    fetchFake.on('GET', '/api/inventory/products', () => ({ status: 200, body: [] }));
    fetchFake.on('GET', '/api/medical-records/templates', () => ({ status: 200, body: [] }));
  }

  it('closes the panel when the polled list says the started booking is now completed', async () => {
    const priorVisit = reservation({ id: 'res-0', status: 'completed', date: '2026-01-01' });
    let current = reservation({ status: 'started' });
    stubSessionRoutes(() => [priorVisit, current]);
    const user = userEvent.setup();

    render(<DoctorAccountView {...BASE_PROPS} />);
    await user.click(screen.getByTitle('Ongoing Session'));
    await screen.findByText('Complete Treatment');

    // reception completes the booking; the doctor's screen learns about it through the next poll
    current = reservation({ status: 'completed' });
    act(() => {
      window.dispatchEvent(new Event('revera-booking-change'));
    });

    await waitFor(() => expect(screen.queryByText('Complete Treatment')).not.toBeInTheDocument());
  });

  it('keeps the panel open while the polled list still shows the booking as started', async () => {
    const priorVisit = reservation({ id: 'res-0', status: 'completed', date: '2026-01-01' });
    const current = reservation({ status: 'started' });
    stubSessionRoutes(() => [priorVisit, current]);
    const user = userEvent.setup();

    render(<DoctorAccountView {...BASE_PROPS} />);
    await user.click(screen.getByTitle('Ongoing Session'));
    await screen.findByText('Complete Treatment');

    act(() => {
      window.dispatchEvent(new Event('revera-booking-change'));
    });
    await waitFor(() => expect(fetchFake.calls.filter((c) => c.method === 'GET' && c.path === '/api/reservations').length).toBeGreaterThan(1));

    expect(screen.getByText('Complete Treatment')).toBeInTheDocument();
  });
});

// The doctor's screen learns about reception's changes through this poll (realtime does not reach the browser
// for reservations). It must not stack requests on top of a slow one or keep running in a hidden tab.
describe('reservations poll (every 3 s)', () => {
  const reservationCalls = () => fetchFake.calls.filter((c) => c.method === 'GET' && c.path === '/api/reservations').length;
  const setVisibility = (state: 'visible' | 'hidden') =>
    Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  const advance = async (ms: number) => {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ms);
    });
  };

  beforeEach(() => {
    vi.useFakeTimers();
    setVisibility('visible');
    fetchFake.on('GET', '/api/medical-records', () => ({ status: 200, body: null }));
    fetchFake.on('GET', '/api/inventory/products', () => ({ status: 200, body: [] }));
    fetchFake.on('GET', '/api/medical-records/templates', () => ({ status: 200, body: [] }));
  });

  afterEach(() => {
    vi.useRealTimers();
    setVisibility('visible');
  });

  it('polls every 3 s when each request finishes in time', async () => {
    fetchFake.on('GET', '/api/reservations', () => ({ status: 200, body: [reservation({})] }));
    render(<DoctorAccountView {...BASE_PROPS} />);
    await advance(0);
    const afterMount = reservationCalls();

    await advance(9000);
    expect(reservationCalls() - afterMount).toBe(3);
  });

  it('skips a tick while the previous request is still running', async () => {
    let release: () => void = () => {};
    fetchFake.on('GET', '/api/reservations', () => new Promise((resolve) => { release = () => resolve({ status: 200, body: [reservation({})] }); }));
    render(<DoctorAccountView {...BASE_PROPS} />);
    await advance(0);
    const afterMount = reservationCalls();

    await advance(15000);
    expect(reservationCalls()).toBe(afterMount);

    release();
    await advance(0);
    await advance(3000);
    expect(reservationCalls()).toBe(afterMount + 1);
  });

  it('does not poll while the tab is hidden and refreshes when it becomes visible again', async () => {
    fetchFake.on('GET', '/api/reservations', () => ({ status: 200, body: [reservation({})] }));
    render(<DoctorAccountView {...BASE_PROPS} />);
    await advance(0);

    setVisibility('hidden');
    const beforeHidden = reservationCalls();
    await advance(30000);
    expect(reservationCalls()).toBe(beforeHidden);

    setVisibility('visible');
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await advance(0);
    expect(reservationCalls()).toBe(beforeHidden + 1);
  });
});

// RISK-128: the doctor's provider record used to be read straight from the browser (providers /
// employee_accounts / branches) with the public key. It now comes from GET /api/profile, matched to the
// signed-in account on the server. The record decides which bookings are this doctor's: a booking assigned
// to their provider id belongs to them even when the name on it differs, and one assigned to a different
// provider does not.
describe('provider record comes from the profile API (RISK-128)', () => {
  const MY_PROVIDER = { id: 'prov-1', name: 'Dr. Sara Adel', branch_ids: ['b1'] };

  function stubApis(reservations: any[]) {
    fetchFake.on('GET', '/api/reservations', () => ({ status: 200, body: reservations }));
    fetchFake.on('GET', '/api/profile', () => ({ status: 200, body: { employee: { id: 'doc-1' }, provider: MY_PROVIDER } }));
    fetchFake.on('GET', '/api/branches', () => ({ status: 200, body: [{ id: 'b1', name_en: 'Maadi' }] }));
  }

  it('asks the API for the provider record with the bearer token and reads no table for it', async () => {
    stubApis([]);
    render(<DoctorAccountView {...BASE_PROPS} />);

    await waitFor(() => expect(fetchFake.calls.some((c) => c.path === '/api/profile')).toBe(true));
    const call = fetchFake.calls.find((c) => c.path === '/api/profile')!;
    expect(call.headers.authorization || call.headers.Authorization).toBe('Bearer test-token');
    expect(tablesRead).not.toContain('providers');
    expect(tablesRead).not.toContain('employee_accounts');
    expect(tablesRead).not.toContain('branches');
  });

  it('shows a booking assigned to this doctor\'s provider id even though another name is on it', async () => {
    stubApis([reservation({ id: 'r1', status: 'completed', name: 'Assigned By Id', customer_id: 'c1', doctorName: 'Dr. Totally Different', doctor_id: undefined, provider_id: 'prov-1' })]);
    const user = userEvent.setup();
    render(<DoctorAccountView {...BASE_PROPS} />);

    await user.click(screen.getByTitle('Patients'));
    expect(await screen.findByText('Assigned By Id')).toBeInTheDocument();
  });

  it('does not show a booking assigned to a different provider even when the doctor\'s name is on it', async () => {
    stubApis([
      reservation({ id: 'r1', status: 'completed', name: 'Mine', customer_id: 'c1', provider_id: 'prov-1' }),
      reservation({ id: 'r2', status: 'completed', name: 'Someone Elses', customer_id: 'c2', doctorName: 'Dr. Sara Adel', provider_id: 'prov-9' }),
    ]);
    const user = userEvent.setup();
    render(<DoctorAccountView {...BASE_PROPS} />);

    await user.click(screen.getByTitle('Patients'));
    expect(await screen.findByText('Mine')).toBeInTheDocument();
    await waitFor(() => expect(fetchFake.calls.some((c) => c.path === '/api/profile')).toBe(true));
    expect(screen.queryByText('Someone Elses')).not.toBeInTheDocument();
  });

  it('still works when the profile request fails: no provider record, matching falls back to the name', async () => {
    fetchFake.on('GET', '/api/reservations', () => ({ status: 200, body: [reservation({ id: 'r1', status: 'completed', name: 'By Name', customer_id: 'c1' })] }));
    fetchFake.on('GET', '/api/profile', () => ({ status: 500, body: { error: 'boom' } }));
    const user = userEvent.setup();
    render(<DoctorAccountView {...BASE_PROPS} />);

    await user.click(screen.getByTitle('Patients'));
    expect(await screen.findByText('By Name')).toBeInTheDocument();
  });
});

describe('reservation filtering', () => {
  it('excludes rejected and cancelled bookings from the doctor patients list', async () => {
    const reservations = [
      reservation({ id: 'r1', status: 'completed', name: 'Kept Patient', customer_id: 'c1' }),
      reservation({ id: 'r2', status: 'rejected', name: 'Rejected Patient', customer_id: 'c2' }),
      reservation({ id: 'r3', status: 'cancelled', name: 'Cancelled Patient', customer_id: 'c3' }),
    ];
    fetchFake.on('GET', '/api/reservations', () => ({ status: 200, body: reservations }));
    const user = userEvent.setup();
    render(<DoctorAccountView {...BASE_PROPS} />);

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
    render(<DoctorAccountView {...BASE_PROPS} />);

    await user.click(screen.getByTitle('Patients'));
    expect(await screen.findByText('Repeat Patient')).toBeInTheDocument();
    // "2 Visits" legitimately appears twice: the patient card badge and the "View Details" button.
    expect(screen.getAllByText(/2\s+Visits/).length).toBeGreaterThan(0);
  });
});

describe('first load never shows other doctors\' patients', () => {
  it('shows nothing from a clinic-wide list passed in as a prop while the doctor\'s own fetch is still pending', async () => {
    const other = reservation({ id: 'x1', doctor_id: 'doc-9', doctorName: 'Dr. Someone Else', status: 'completed', name: 'Other Doctors Patient', customer_id: 'c77' });
    // never answers: the view is stuck on its first load
    fetchFake.on('GET', '/api/reservations', () => new Promise(() => {}) as any);
    const user = userEvent.setup();
    // an old caller still passing the shell's list must not leak it (the prop no longer exists)
    render(<DoctorAccountView {...BASE_PROPS} {...({ initialReservations: [other] } as any)} />);

    await user.click(screen.getByTitle('Patients'));
    expect(screen.queryByText('Other Doctors Patient')).not.toBeInTheDocument();
  });

  it('shows only this doctor\'s bookings once they arrive, even if the clinic-wide answer contains others', async () => {
    const mine = reservation({ id: 'm1', status: 'completed', name: 'My Patient', customer_id: 'c1' });
    const other = reservation({ id: 'x1', doctor_id: 'doc-9', doctorName: 'Dr. Someone Else', status: 'completed', name: 'Other Doctors Patient', customer_id: 'c77' });
    fetchFake.on('GET', '/api/reservations', () => ({ status: 200, body: [mine, other] }));
    const user = userEvent.setup();
    render(<DoctorAccountView {...BASE_PROPS} />);

    await user.click(screen.getByTitle('Patients'));
    expect(await screen.findByText('My Patient')).toBeInTheDocument();
    expect(screen.queryByText('Other Doctors Patient')).not.toBeInTheDocument();
  });
});

describe('sign out and profile entry points', () => {
  function renderView(overrides: Record<string, any> = {}) {
    fetchFake.on('GET', '/api/reservations', () => ({ status: 200, body: [] }));
    fetchFake.on('GET', '/api/medical-records/templates', () => ({ status: 200, body: [] }));
    fetchFake.on('GET', '/api/inventory/products', () => ({ status: 200, body: [] }));
    const onLogout = vi.fn();
    render(<DoctorAccountView {...BASE_PROPS} onLogout={onLogout} {...overrides} />);
    return onLogout;
  }

  it('Sign Out asks first and does nothing when the doctor cancels', async () => {
    mockShowConfirm.mockResolvedValue(false);
    const onLogout = renderView();
    const user = userEvent.setup();

    await user.click(screen.getAllByRole('button', { name: /Sign Out/ })[0]);

    await waitFor(() => expect(mockShowConfirm).toHaveBeenCalledTimes(1));
    expect(mockShowConfirm.mock.calls[0][0]).toMatch(/attendance check-out/);
    expect(onLogout).not.toHaveBeenCalled();
  });

  it('Sign Out logs out once the doctor confirms', async () => {
    mockShowConfirm.mockResolvedValue(true);
    const onLogout = renderView();
    const user = userEvent.setup();

    await user.click(screen.getAllByRole('button', { name: /Sign Out/ })[0]);

    await waitFor(() => expect(onLogout).toHaveBeenCalledTimes(1));
  });

  it('the profile entry points carry translated labels, not hardcoded English', () => {
    renderView();
    // sidebar account card and the mobile header avatar share the same tooltip
    expect(screen.getAllByTitle('View my profile, schedule and password').length).toBeGreaterThanOrEqual(2);
    // the mobile bottom bar tab label comes from the translations
    expect(screen.getAllByText('Profile').length).toBeGreaterThanOrEqual(1);
  });
});
