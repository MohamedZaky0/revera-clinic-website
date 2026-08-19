/**
 * Fixed-asset CRUD plus "Post Depreciation" — module 8 of ai_docs/TEST_COVERAGE_INVENTORY.md (P1,
 * expenses/assets/loans). Book value and accumulated depreciation feed the P&L; a wrong total here
 * is a wrong balance sheet, and a mis-guarded save can record a salvage value larger than the asset
 * cost or a negative useful life.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createFetchFake } from '../../helpers/fetchFake';
import { AssetsScreen, type FixedAsset } from '@/components/admin/Finance/AssetsScreen';

const fetchFake = createFetchFake();

beforeEach(() => {
  fetchFake.reset();
  vi.stubGlobal('fetch', fetchFake.fetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// None of this form's <label> elements carry htmlFor/id (a real accessibility gap, out of scope
// for this pass), so getByLabelText can't resolve them. Each label's sibling input/select is found
// by DOM position instead.
function fieldNear(labelText: string): HTMLInputElement | HTMLSelectElement {
  const label = screen.getByText(labelText, { selector: 'label' });
  const field = label.parentElement?.querySelector('input, select, textarea');
  if (!field) throw new Error(`No field found near label "${labelText}"`);
  return field as HTMLInputElement | HTMLSelectElement;
}

function getForm(): HTMLFormElement {
  const form = document.querySelector('form');
  if (!form) throw new Error('Asset form is not open');
  return form as HTMLFormElement;
}

const ASSET_LASER: FixedAsset = {
  id: 'a1',
  branch_id: null,
  category: 'medical_device',
  name: 'Laser Machine',
  purchased_on: '2026-01-01',
  cost: 100000,
  useful_life_months: 60,
  salvage_value: 10000,
  device_id: null,
  status: 'active',
  is_opening: false,
  current_book_value: 85000,
};

const ASSET_DESK: FixedAsset = {
  id: 'a2',
  branch_id: null,
  category: 'furniture',
  name: 'Reception Desk',
  purchased_on: '2026-02-01',
  cost: 5000,
  useful_life_months: 36,
  salvage_value: 0,
  device_id: null,
  status: 'active',
  is_opening: false,
  // no current_book_value — must fall back to cost
};

function seed(assets: FixedAsset[]) {
  fetchFake.on('GET', '/api/assets', () => ({ status: 200, body: assets }));
  fetchFake.on('GET', '/api/inventory/devices', () => ({ status: 200, body: [] }));
}

describe('loading and totals', () => {
  it('renders total cost, total book value (falling back to cost when unset), and depreciation as the difference', async () => {
    seed([ASSET_LASER, ASSET_DESK]);
    render(<AssetsScreen accessToken="tok" />);

    await screen.findByText('Laser Machine');
    // total cost = 100000 + 5000 = 105000
    expect(screen.getByText('EGP 105,000')).toBeInTheDocument();
    // total book value = 85000 (snapshot) + 5000 (falls back to cost) = 90000
    expect(screen.getByText('EGP 90,000')).toBeInTheDocument();
    // accumulated depreciation = 105000 - 90000 = 15000
    expect(screen.getByText('EGP 15,000')).toBeInTheDocument();
  });

  it('shows the server error message when the assets fetch fails, without masking it as the devices error', async () => {
    fetchFake.on('GET', '/api/assets', () => ({ status: 500, body: {} }));
    fetchFake.on('GET', '/api/inventory/devices', () => ({ status: 200, body: [] }));
    render(<AssetsScreen accessToken="tok" />);
    expect(await screen.findByText('Unable to load fixed assets.')).toBeInTheDocument();
  });

  it('shows "No fixed assets found." for an empty list instead of a blank table', async () => {
    seed([]);
    render(<AssetsScreen accessToken="tok" />);
    expect(await screen.findByText('No fixed assets found.')).toBeInTheDocument();
  });
});

describe('search', () => {
  it('filters by name, category label, or status label, case-insensitively', async () => {
    seed([ASSET_LASER, ASSET_DESK]);
    const user = userEvent.setup();
    render(<AssetsScreen accessToken="tok" />);
    await screen.findByText('Laser Machine');

    await user.type(screen.getByPlaceholderText(/Search assets/), 'furniture');
    expect(screen.queryByText('Laser Machine')).not.toBeInTheDocument();
    expect(screen.getByText('Reception Desk')).toBeInTheDocument();
  });
});

describe('add asset — validation', () => {
  it('rejects a salvage value greater than cost without sending a request', async () => {
    seed([]);
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const user = userEvent.setup();
    render(<AssetsScreen accessToken="tok" />);
    await screen.findByText('No fixed assets found.');
    await user.click(screen.getByRole('button', { name: 'Add Asset' }));

    await user.type(fieldNear('Asset Name'), 'Overpriced Chair');
    await user.type(fieldNear('Cost (EGP)'), '1000');
    await user.type(fieldNear('Useful Life (months)'), '12');
    await user.type(fieldNear('Salvage Value (EGP)'), '5000');
    await user.click(within(getForm()).getByRole('button', { name: 'Add Asset' }));

    expect(alertSpy).toHaveBeenCalledWith('Salvage value cannot exceed cost.');
    expect(fetchFake.calls.some((c) => c.method === 'POST')).toBe(false);
  });

  it('POSTs the exact payload and refetches after a valid save', async () => {
    seed([]);
    const user = userEvent.setup();
    render(<AssetsScreen accessToken="tok" />);
    await screen.findByText('No fixed assets found.');

    fetchFake.on('POST', '/api/assets', (call) => {
      expect(call.body).toEqual({
        category: 'furniture',
        name: 'New Chair',
        purchasedOn: call.body.purchasedOn,
        cost: 1200,
        usefulLifeMonths: 24,
        salvageValue: 100,
      });
      expect(call.headers['content-type']).toBe('application/json');
      expect(call.headers.authorization).toBe('Bearer tok');
      return { status: 200, body: { id: 'a3' } };
    });

    await user.click(screen.getByRole('button', { name: 'Add Asset' }));
    await user.type(fieldNear('Asset Name'), 'New Chair');
    await user.type(fieldNear('Cost (EGP)'), '1200');
    await user.type(fieldNear('Useful Life (months)'), '24');
    await user.type(fieldNear('Salvage Value (EGP)'), '100');
    await user.click(within(getForm()).getByRole('button', { name: 'Add Asset' }));

    await waitFor(() => expect(fetchFake.calls.some((c) => c.method === 'POST' && c.path === '/api/assets')).toBe(true));
    // the form closes and load() is called again (a second GET /api/assets beyond the initial one)
    await waitFor(() => expect(fetchFake.calls.filter((c) => c.method === 'GET' && c.path === '/api/assets')).toHaveLength(2));
    expect(document.querySelector('form')).not.toBeInTheDocument();
  });
});

describe('edit asset', () => {
  it('PATCHes the same asset id with updated fields', async () => {
    seed([ASSET_DESK]);
    const user = userEvent.setup();
    render(<AssetsScreen accessToken="tok" />);
    await screen.findByText('Reception Desk');

    fetchFake.on('PATCH', '/api/assets', (call) => {
      expect(call.query.get('id')).toBe('a2');
      expect(call.body.cost).toBe(6000);
      return { status: 200, body: { id: 'a2' } };
    });

    await user.click(screen.getByTitle('Edit'));
    const costInput = fieldNear('Cost (EGP)');
    await user.clear(costInput);
    await user.type(costInput, '6000');
    await user.click(screen.getByRole('button', { name: 'Update Asset' }));

    await waitFor(() => expect(fetchFake.calls.some((c) => c.method === 'PATCH')).toBe(true));
  });
});

describe('delete asset', () => {
  it('does nothing when the confirm dialog is declined', async () => {
    seed([ASSET_DESK]);
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const user = userEvent.setup();
    render(<AssetsScreen accessToken="tok" />);
    await screen.findByText('Reception Desk');

    await user.click(screen.getByTitle('Delete'));
    expect(fetchFake.calls.some((c) => c.method === 'DELETE')).toBe(false);
  });

  it('DELETEs the asset by id when confirmed', async () => {
    seed([ASSET_DESK]);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    fetchFake.on('DELETE', '/api/assets', (call) => {
      expect(call.query.get('id')).toBe('a2');
      return { status: 200, body: { success: true } };
    });
    const user = userEvent.setup();
    render(<AssetsScreen accessToken="tok" />);
    await screen.findByText('Reception Desk');

    await user.click(screen.getByTitle('Delete'));
    await waitFor(() => expect(fetchFake.calls.some((c) => c.method === 'DELETE')).toBe(true));
  });
});

describe('post depreciation', () => {
  it('does not call the API when the period prompt is cancelled', async () => {
    seed([]);
    vi.spyOn(window, 'prompt').mockReturnValue(null);
    const user = userEvent.setup();
    render(<AssetsScreen accessToken="tok" />);
    await screen.findByText('No fixed assets found.');

    await user.click(screen.getByRole('button', { name: /Post Depreciation/ }));
    expect(fetchFake.calls.some((c) => c.path === '/api/assets/post-depreciation')).toBe(false);
  });

  it('POSTs the entered period and reports posted/skipped counts from the response', async () => {
    seed([]);
    vi.spyOn(window, 'prompt').mockReturnValue('2026-08');
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    fetchFake.on('POST', '/api/assets/post-depreciation', (call) => {
      expect(call.body).toEqual({ period: '2026-08' });
      return { status: 200, body: { posted: ['a1', 'a2'], skipped: ['a3'] } };
    });
    const user = userEvent.setup();
    render(<AssetsScreen accessToken="tok" />);
    await screen.findByText('No fixed assets found.');

    await user.click(screen.getByRole('button', { name: /Post Depreciation/ }));

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Posted: 2, skipped: 1'));
  });
});
