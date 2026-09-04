/**
 * `POST /api/finance/new-vs-returning` is read-only, but this screen is where a manager decides
 * whether the clinic's growth is coming from new patients or repeat visits — a wrong revenue split
 * or a silently-stale month picker misleads that decision (module 5 of
 * ai_docs/TEST_COVERAGE_INVENTORY.md, P1 finance screens).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createFetchFake } from '../../helpers/fetchFake';
import { NewVsReturningScreen, type BranchOption } from '@/components/admin/Finance/NewVsReturningScreen';

const fetchFake = createFetchFake();

// The component derives its default period from `new Date()` at render time. Faking the system
// clock deadlocks RTL's `waitFor`/`findBy` polling (a known vitest fake-timer interaction), so
// instead of pinning the date, this mirrors the component's own `currentPeriod()` computation to
// get the expected value from whatever "now" actually is when the test runs.
function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

beforeEach(() => {
  fetchFake.reset();
  vi.stubGlobal('fetch', fetchFake.fetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function respond(overrides: Partial<{ new: { revenue: number; customerCount: number }; returning: { revenue: number; customerCount: number }; walkIn: { revenue: number; note: string } }> = {}) {
  return {
    status: 200,
    body: {
      range: { label: 'Aug 2026', from: '2026-08-01', to: '2026-08-31' },
      branchId: null,
      new: { revenue: 1000, customerCount: 4 },
      returning: { revenue: 3000, customerCount: 10 },
      walkIn: { revenue: 0, note: 'no invoice, no linked customer' },
      ...overrides,
    },
  };
}

describe('NewVsReturningScreen', () => {
  it('fetches the current month on mount, with the Authorization header when a token is given', async () => {
    fetchFake.on('GET', '/api/finance/new-vs-returning', () => respond());
    render(<NewVsReturningScreen accessToken="tok-123" />);

    await waitFor(() => expect(fetchFake.calls).toHaveLength(1));
    const call = fetchFake.calls[0];
    expect(call.query.get('period')).toBe(currentPeriod());
    expect(call.query.has('branchId')).toBe(false);
    expect(call.headers['authorization']).toBe('Bearer tok-123');
  });

  it('omits the Authorization header when no token is supplied', async () => {
    fetchFake.on('GET', '/api/finance/new-vs-returning', () => respond());
    render(<NewVsReturningScreen />);
    await waitFor(() => expect(fetchFake.calls).toHaveLength(1));
    expect(fetchFake.calls[0].headers.authorization).toBeUndefined();
  });

  it('renders new vs returning revenue and patient counts from the response', async () => {
    fetchFake.on('GET', '/api/finance/new-vs-returning', () => respond());
    render(<NewVsReturningScreen accessToken="tok" />);

    expect(await screen.findByText(/EGP 1,000 \(4\)/)).toBeInTheDocument();
    expect(screen.getByText(/EGP 3,000 \(10\)/)).toBeInTheDocument();
  });

  it('computes the new-patient revenue share as a rounded percentage of total revenue (new + returning + walk-in)', async () => {
    fetchFake.on('GET', '/api/finance/new-vs-returning', () =>
      respond({ new: { revenue: 250, customerCount: 1 }, returning: { revenue: 750, customerCount: 3 }, walkIn: { revenue: 0, note: '' } })
    );
    render(<NewVsReturningScreen accessToken="tok" />);
    // 250 / (250 + 750 + 0) = 25%
    expect(await screen.findByText('25%')).toBeInTheDocument();
  });

  it('shows "—" for the share stat instead of dividing by zero when there is no revenue at all', async () => {
    fetchFake.on('GET', '/api/finance/new-vs-returning', () =>
      respond({ new: { revenue: 0, customerCount: 0 }, returning: { revenue: 0, customerCount: 0 }, walkIn: { revenue: 0, note: '' } })
    );
    render(<NewVsReturningScreen accessToken="tok" />);
    await screen.findByText('Share From New Patients');
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('surfaces the walk-in note only when walk-in revenue is greater than zero', async () => {
    fetchFake.on('GET', '/api/finance/new-vs-returning', () => respond({ walkIn: { revenue: 500, note: 'no linked customer' } }));
    render(<NewVsReturningScreen accessToken="tok" />);
    expect(await screen.findByText(/EGP 500 not shown above — no linked customer/)).toBeInTheDocument();
  });

  it('does not render a walk-in note when walk-in revenue is zero', async () => {
    fetchFake.on('GET', '/api/finance/new-vs-returning', () => respond({ walkIn: { revenue: 0, note: 'irrelevant' } }));
    render(<NewVsReturningScreen accessToken="tok" />);
    await screen.findByText('New Patients');
    expect(screen.queryByText(/not shown above/)).not.toBeInTheDocument();
  });

  it('shows the server error message and no stale data when the request fails', async () => {
    fetchFake.on('GET', '/api/finance/new-vs-returning', () => ({ status: 500, body: { error: 'Unable to load new vs returning revenue.' } }));
    render(<NewVsReturningScreen accessToken="tok" />);
    expect(await screen.findByText('Unable to load new vs returning revenue.')).toBeInTheDocument();
    expect(screen.queryByText('New Patients')).not.toBeInTheDocument();
  });

  it('selecting a branch refetches with branchId set and revenue re-renders for that branch', async () => {
    const user = userEvent.setup();
    const branches: BranchOption[] = [{ id: 'b1', name_en: 'Maadi' }, { id: 'b2', name_en: 'New Cairo' }];
    fetchFake.on('GET', '/api/finance/new-vs-returning', (call) =>
      call.query.get('branchId') === 'b2'
        ? respond({ new: { revenue: 999, customerCount: 2 }, returning: { revenue: 0, customerCount: 0 } })
        : respond()
    );
    render(<NewVsReturningScreen accessToken="tok" branches={branches} />);
    await screen.findByText('New Patients');

    // The Branch <select> has no htmlFor/id linking it to its <label> (a real accessibility gap,
    // out of scope for this pass), so it has to be targeted by role rather than getByLabelText.
    await user.selectOptions(screen.getByRole('combobox'), 'b2');

    await waitFor(() => expect(fetchFake.calls.some((c) => c.query.get('branchId') === 'b2')).toBe(true));
    expect(await screen.findByText(/EGP 999 \(2\)/)).toBeInTheDocument();
  });
});
