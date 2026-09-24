/**
 * jsdom test for LaserDeficitPrompt (Brief 35 / DEC-079): the reception-side deficit
 * resolution prompt. Fetch is stubbed at the boundary — the route itself is covered
 * separately in tests/routes/reservations-laser-deficit.test.ts.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import LaserDeficitPrompt from '@/components/admin/bookings/LaserDeficitPrompt';

const RES_ID = '11111111-1111-1111-1111-111111111111';
const HEADERS = { 'Content-Type': 'application/json', Authorization: 'Bearer staff-token' };

function deficitInfo(overrides: Record<string, any> = {}) {
  return {
    success: true, resolved: false, resolution: null,
    deficitPulses: 5000, deliveredPulses: 10000, remainingPulses: 0,
    sourceCustomerPackageId: 'pkg-1', quotaMissing: false, expired: false,
    noActivePackage: false, resolvedRate: 2,
    ...overrides,
  };
}

function mockFetch(info: any) {
  return vi.fn(async (input: any) => {
    const url = String(input?.url || input);
    if (url.includes('/api/reservations/laser-deficit')) {
      return new Response(JSON.stringify(info), { status: 200 });
    }
    if (url.includes('/api/packages')) {
      return new Response(JSON.stringify({ packages: [] }), { status: 200 });
    }
    return new Response('{}', { status: 404 });
  }) as any;
}

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch(deficitInfo()));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('LaserDeficitPrompt', () => {
  it('renders delivered/balance/deficit and reports unresolved to the parent', async () => {
    const onStateChange = vi.fn();
    render(<LaserDeficitPrompt reservationId={RES_ID} headers={HEADERS} onStateChange={onStateChange} />);

    await waitFor(() => expect(screen.getByText(/Package Pulse Deficit/i)).toBeInTheDocument());
    expect(screen.getByText('10,000')).toBeInTheDocument(); // delivered
    expect(screen.getByText('5,000')).toBeInTheDocument(); // deficit
    expect(onStateChange).toHaveBeenCalledWith({ unresolved: true, deficitPulses: 5000 });
  });

  it('renders nothing when there is no deficit', async () => {
    vi.stubGlobal('fetch', mockFetch(deficitInfo({ deficitPulses: 0 })));
    const { container } = render(<LaserDeficitPrompt reservationId={RES_ID} headers={HEADERS} />);
    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalled());
    await waitFor(() => {
      expect(container.querySelector('.border-amber-300')).toBeNull();
    });
  });

  it('shows "already resolved" and never offers choices when the marker is set', async () => {
    vi.stubGlobal('fetch', mockFetch(deficitInfo({ resolved: true, resolution: 'PAY_PER_PULSE' })));
    render(<LaserDeficitPrompt reservationId={RES_ID} headers={HEADERS} />);
    await waitFor(() => expect(screen.getByText(/already resolved/i)).toBeInTheDocument());
    expect(screen.queryByText(/Buy New Package/i)).toBeNull();
  });

  it('POSTs only the choice — no amounts — when resolving pay-per-pulse', async () => {
    const fetchMock = mockFetch(deficitInfo());
    vi.stubGlobal('fetch', fetchMock);
    const onResolved = vi.fn();
    render(<LaserDeficitPrompt reservationId={RES_ID} headers={HEADERS} onResolved={onResolved} />);

    await waitFor(() => expect(screen.getByText(/Pay Per Pulse/i)).toBeInTheDocument());
    await userEvent.click(screen.getByText(/Pay Per Pulse/i));
    await userEvent.click(screen.getByText(/Resolve Deficit/i));

    await waitFor(() => {
      const posts = fetchMock.mock.calls.filter(
        (c: any[]) => String(c[0]?.url || c[0]).includes('/api/reservations/laser-deficit') && c[1]?.method === 'POST'
      );
      expect(posts).toHaveLength(1);
      const body = JSON.parse(posts[0][1].body);
      expect(body.choice).toBe('PAY_PER_PULSE');
      expect(body.reservationId).toBe(RES_ID);
      expect(body.deficitPulses).toBeUndefined();
      expect(body.amount).toBeUndefined();
    });
  });

  it('disables the pay-per-pulse resolve button when no rate is configured', async () => {
    vi.stubGlobal('fetch', mockFetch(deficitInfo({ resolvedRate: null })));
    render(<LaserDeficitPrompt reservationId={RES_ID} headers={HEADERS} />);
    await waitFor(() => expect(screen.getByText(/Pay Per Pulse/i)).toBeInTheDocument());
    await userEvent.click(screen.getByText(/Pay Per Pulse/i));
    expect(screen.getByText(/Resolve Deficit/i)).toBeDisabled();
    expect(screen.getByText(/rate not configured/i)).toBeInTheDocument();
  });
});
