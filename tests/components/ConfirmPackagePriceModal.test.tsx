/**
 * jsdom test for ConfirmPackagePriceModal (DEC-088 item 6): the "Enter invoice value" dialog for a historical
 * package left price_pending. Fetch is stubbed at the boundary; the route and the SQL are covered elsewhere
 * (tests/routes/customers-packages-confirm-price.test.ts, scripts/db_tests/confirm_historical_package_price.test.sql).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ConfirmPackagePriceModal from '@/components/admin/patients/ConfirmPackagePriceModal';

const HEADERS = { 'Content-Type': 'application/json', Authorization: 'Bearer staff-token' };
const PULSES_PKG = { id: 'pkg-1', packageName: '10,000 Pulses', packageType: 'pulses', totalPulses: 10000, pulsesRemaining: 10000, purchasedAt: '2026-04-16T12:00:00Z' };
const SERVICES_PKG = { id: 'pkg-2', packageName: 'Laser 6 Sessions', packageType: 'services', purchasedAt: '2026-05-11T12:00:00Z' };

let fetchMock: ReturnType<typeof vi.fn>;
function stubFetch(status: number, body: any) {
  fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal('fetch', fetchMock);
}

beforeEach(() => stubFetch(200, { success: true, pricePaid: 5000, pulsesUsed: 3000, pulsesRemaining: 7000 }));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function setup(props: Record<string, any> = {}) {
  const onClose = vi.fn();
  const onSaved = vi.fn();
  render(<ConfirmPackagePriceModal pkg={PULSES_PKG} suggestedPrice={8000} headers={HEADERS} onClose={onClose} onSaved={onSaved} {...props} />);
  return { onClose, onSaved, user: userEvent.setup() };
}

describe('ConfirmPackagePriceModal', () => {
  it('shows the catalog price as a suggestion only — the price field starts empty and Save is disabled', () => {
    setup();
    expect(screen.getByLabelText(/Amount the patient actually paid/i)).toHaveValue(null);
    expect(screen.getByText(/EGP 8,000/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Save invoice value/i })).toBeDisabled();
  });

  it('"Use catalog price" fills the field, and only saving sends it', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: /Use catalog price/i }));
    expect(screen.getByLabelText(/Amount the patient actually paid/i)).toHaveValue(8000);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends the entered price and pulses to the confirm_package_price action, then reports saved and closes', async () => {
    const { user, onSaved, onClose } = setup();
    await user.type(screen.getByLabelText(/Amount the patient actually paid/i), '5000');
    await user.type(screen.getByLabelText(/Pulses already used/i), '3000');
    await user.click(screen.getByRole('button', { name: /Save invoice value/i }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith({ pricePaid: 5000, pulsesUsed: 3000, pulsesRemaining: 7000 }));
    expect(onClose).toHaveBeenCalled();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/customers/packages');
    expect(init.method).toBe('PATCH');
    expect(init.headers).toEqual(HEADERS);
    expect(JSON.parse(init.body)).toEqual({ action: 'confirm_package_price', customer_package_id: 'pkg-1', price_paid: 5000, pulses_used_before: 3000 });
  });

  it('previews the balance after saving and leaves pulses at 0 when the field is blank', async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText(/Amount the patient actually paid/i), '5000');
    await user.type(screen.getByLabelText(/Pulses already used/i), '3000');
    expect(screen.getByText(/Balance after saving: 7,000/)).toBeTruthy();
    await user.clear(screen.getByLabelText(/Pulses already used/i));
    await user.click(screen.getByRole('button', { name: /Save invoice value/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).pulses_used_before).toBe(0);
  });

  it('refuses pulses above the balance or fractional, with a visible message, and does not call the API', async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText(/Amount the patient actually paid/i), '5000');
    await user.type(screen.getByLabelText(/Pulses already used/i), '10001');
    expect(screen.getByRole('alert').textContent).toMatch(/whole number from 0 to 10,000/);
    expect(screen.getByRole('button', { name: /Save invoice value/i })).toBeDisabled();
    await user.clear(screen.getByLabelText(/Pulses already used/i));
    await user.type(screen.getByLabelText(/Pulses already used/i), '2.5');
    expect(screen.getByRole('button', { name: /Save invoice value/i })).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('a price of 0 is accepted (a free package)', async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText(/Amount the patient actually paid/i), '0');
    expect(screen.getByRole('button', { name: /Save invoice value/i })).toBeEnabled();
  });

  it('shows the server error and keeps the dialog open (nothing was saved)', async () => {
    stubFetch(409, { success: false, error: 'This package price was already confirmed.' });
    const { user, onClose, onSaved } = setup();
    await user.type(screen.getByLabelText(/Amount the patient actually paid/i), '5000');
    await user.click(screen.getByRole('button', { name: /Save invoice value/i }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/already confirmed/));
    expect(onSaved).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('a services package has no pulses field and always sends pulses_used_before = 0', async () => {
    stubFetch(200, { success: true, pricePaid: 3000, pulsesUsed: 0, pulsesRemaining: 0 });
    const { user } = setup({ pkg: SERVICES_PKG, suggestedPrice: null });
    expect(screen.queryByLabelText(/Pulses already used/i)).toBeNull();
    expect(screen.queryByText(/Catalog price/i)).toBeNull();
    await user.type(screen.getByLabelText(/Amount the patient actually paid/i), '3000');
    await user.click(screen.getByRole('button', { name: /Save invoice value/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ customer_package_id: 'pkg-2', price_paid: 3000, pulses_used_before: 0 });
  });

  it('renders Arabic copy and right-to-left direction when isRTL', () => {
    setup({ isRTL: true });
    expect(screen.getByRole('dialog').parentElement?.getAttribute('dir')).toBe('rtl');
    expect(screen.getByText('أدخل قيمة الفاتورة')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'حفظ قيمة الفاتورة' })).toBeDisabled();
  });
});
