/**
 * jsdom tests for the DEC-088 item 9 Finance cards: the cash -> revenue bridge and the deferred package balance.
 * Fetch is stubbed at the boundary; the routes and the arithmetic are tested separately.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';

import { RevenueBridgeCard } from '@/components/admin/Finance/RevenueBridgeCard';
import { DeferredPackagesCard } from '@/components/admin/Finance/DeferredPackagesCard';

function stubFetch(handler: (url: string) => { status: number; body: any }) {
  const mock = vi.fn(async (input: any) => {
    const { status, body } = handler(String(input?.url || input));
    return new Response(JSON.stringify(body), { status });
  });
  vi.stubGlobal('fetch', mock);
  return mock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('RevenueBridgeCard', () => {
  it("explains 50,000 collected vs 10,000 earned, and its lines add up to the revenue figure", async () => {
    const fetchMock = stubFetch(() => ({ status: 200, body: { cashReceived: 50000, packageCashReceived: 40000 } }));
    render(<RevenueBridgeCard period="2026-09" branchId="" accessToken="tok" revenueEarned={10000} packageRecognised={0} />);

    const card = await screen.findByTestId('revenue-bridge');
    await waitFor(() => expect(within(card).getByText('EGP 50,000')).toBeTruthy());
    expect(within(card).getByText('Cash received')).toBeTruthy();
    expect(within(card).getByText('Paid for packages, not yet delivered')).toBeTruthy();
    expect(within(card).getByText('EGP 40,000')).toBeTruthy();
    expect(within(card).getByText('Revenue earned')).toBeTruthy();
    expect(within(card).getByText('EGP 10,000')).toBeTruthy();
    // Arabic labels sit beside the English ones
    expect(within(card).getByText('المقبوض')).toBeTruthy();
    expect(within(card).getByText('الإيراد المُحقَّق')).toBeTruthy();

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/api/finance/revenue-bridge?period=2026-09');
    expect((init as any).headers).toEqual({ Authorization: 'Bearer tok' });
  });

  it('passes the branch filter through', async () => {
    const fetchMock = stubFetch(() => ({ status: 200, body: { cashReceived: 1, packageCashReceived: 0 } }));
    render(<RevenueBridgeCard period="2026-09" branchId="b2" revenueEarned={1} packageRecognised={0} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(String(fetchMock.mock.calls[0][0])).toContain('branchId=b2');
  });

  it('shows the residual "other timing" so unpaid billing is not hidden', async () => {
    stubFetch(() => ({ status: 200, body: { cashReceived: 5000, packageCashReceived: 0 } }));
    render(<RevenueBridgeCard period="2026-09" branchId="" revenueEarned={8000} packageRecognised={0} />);
    const card = await screen.findByTestId('revenue-bridge');
    await waitFor(() => expect(within(card).getByText(/Other timing/)).toBeTruthy());
    expect(within(card).getByText('EGP 3,000')).toBeTruthy();
  });

  it('shows the server error instead of a wrong bridge', async () => {
    stubFetch(() => ({ status: 403, body: { error: 'Finance P&L access is required.' } }));
    render(<RevenueBridgeCard period="2026-09" branchId="" revenueEarned={10000} packageRecognised={0} />);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/Finance P&L access is required/));
    expect(screen.queryByText('Cash received')).toBeNull();
  });
});

const DEFERRED = {
  asOf: '2026-09-26T00:00:00Z',
  total: 40000, activeTotal: 40000, expiredTotal: 0,
  pulses: { packages: 2, pulsesRemaining: 30000, amount: 30000 },
  services: [
    { serviceId: 2, serviceName: 'Full Body', sessionsRemaining: 6, amount: 6000 },
    { serviceId: 1, serviceName: 'Underarm', sessionsRemaining: 5, amount: 4000 },
  ],
  pending: { count: 0, packages: [] },
};

describe('DeferredPackagesCard', () => {
  it("shows the owner's example: 40,000 = 30,000 pulses + 5 Underarm sessions + 6 Full Body sessions", async () => {
    stubFetch(() => ({ status: 200, body: DEFERRED }));
    render(<DeferredPackagesCard accessToken="tok" />);
    expect((await screen.findByTestId('deferred-total')).textContent).toBe('EGP 40,000');
    const summary = screen.getByTestId('deferred-summary').textContent || '';
    expect(summary).toContain('30,000 pulses');
    expect(summary).toContain('6 Full Body sessions');
    expect(summary).toContain('5 Underarm sessions');
    const card = screen.getByTestId('deferred-packages');
    expect(within(card).getByText('Laser pulses')).toBeTruthy();
    expect(within(card).getByText('EGP 6,000')).toBeTruthy();
    expect(screen.queryByTestId('deferred-pending')).toBeNull();
    expect(screen.queryByTestId('deferred-expired')).toBeNull();
  });

  it('lists packages with no invoice value separately, with where to fix it — never as zero in the total', async () => {
    stubFetch(() => ({
      status: 200,
      body: { ...DEFERRED, total: 0, pulses: { packages: 0, pulsesRemaining: 0, amount: 0 }, services: [],
        pending: { count: 2, packages: [
          { id: 'a', customerName: 'Randa', packageName: '2,500 Pulses', packageType: 'pulses', remaining: 2500 },
          { id: 'b', customerName: 'Khaled', packageName: '10,000 Pulses', packageType: 'pulses', remaining: 10000 },
        ] } },
    }));
    render(<DeferredPackagesCard />);
    const pending = await screen.findByTestId('deferred-pending');
    expect(pending.textContent).toMatch(/2 packages with no invoice value yet — not counted above/);
    expect(pending.textContent).toMatch(/Randa — 2,500 Pulses \(2,500 pulses left\)/);
    expect(pending.textContent).toMatch(/Khaled — 10,000 Pulses \(10,000 pulses left\)/);
    expect(screen.getByTestId('deferred-summary').textContent).toMatch(/Nothing is owed to customers right now/);
  });

  it('mentions balances on expired packages that are still deferred', async () => {
    stubFetch(() => ({ status: 200, body: { ...DEFERRED, expiredTotal: 3000, activeTotal: 37000 } }));
    render(<DeferredPackagesCard />);
    expect((await screen.findByTestId('deferred-expired')).textContent).toMatch(/EGP 3,000.*past their expiry date/);
  });

  it('shows the server error', async () => {
    stubFetch(() => ({ status: 500, body: { error: 'boom' } }));
    render(<DeferredPackagesCard />);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/boom/));
  });
});
