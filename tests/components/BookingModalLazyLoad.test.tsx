/**
 * RISK-137 / DEC-131: BookingModal sits in the root layout, so it used to fire six API reads on
 * every page view (including /admin and /login) while closed. It now loads them on first open.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { createFetchFake } from '../helpers/fetchFake';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/',
}));

vi.mock('@/contexts/LanguageContext', async () => {
  const { translations } = await import('@/lib/translations');
  const value = { t: translations.en, isRTL: false, language: 'en', direction: 'ltr', setLanguage: () => {} };
  return { useLanguage: () => value };
});

import { BookingModal } from '@/components/BookingModal';
import { invalidatePublicPageSettings } from '@/lib/publicPageSettings';

const fetchFake = createFetchFake();

function register() {
  fetchFake.on('GET', '/api/categories', () => ({ status: 200, body: [{ key: 'laser', en: 'Laser', ar: 'ليزر', sortOrder: 1 }] }));
  fetchFake.on('GET', '/api/services', () => ({ status: 200, body: [] }));
  fetchFake.on('GET', '/api/branches', () => ({ status: 200, body: [] }));
  fetchFake.on('GET', '/api/providers', () => ({ status: 200, body: [] }));
  fetchFake.on('GET', '/api/page-settings', () => ({ status: 200, body: {} }));
  fetchFake.on('GET', '/api/terms', () => ({ status: 200, body: { terms: [] } }));
}

const PATHS = ['/api/categories', '/api/services', '/api/branches', '/api/providers', '/api/page-settings', '/api/terms'];

const scrollIntoView = vi.fn();

beforeEach(() => {
  scrollIntoView.mockClear();
  (Element.prototype as any).scrollIntoView = scrollIntoView;
  fetchFake.reset();
  invalidatePublicPageSettings();
  register();
  vi.stubGlobal('fetch', fetchFake.fetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('BookingModal data loading', () => {
  it('makes no request on mount while the popup is closed', async () => {
    render(<BookingModal />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(fetchFake.calls).toHaveLength(0);
  });

  it('loads all six reads the first time the popup is opened, and only once', async () => {
    render(<BookingModal />);
    expect(fetchFake.calls).toHaveLength(0);

    await act(async () => {
      window.dispatchEvent(new CustomEvent('open-booking'));
    });
    await waitFor(() => {
      for (const p of PATHS) expect(fetchFake.calls.some((c) => c.path === p)).toBe(true);
    });
    const afterFirstOpen = fetchFake.calls.length;
    expect(afterFirstOpen).toBe(PATHS.length);

    // a second open must not refetch
    await act(async () => {
      window.dispatchEvent(new CustomEvent('open-booking'));
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(fetchFake.calls).toHaveLength(afterFirstOpen);
  });

  it('page variant (/book) loads immediately on mount', async () => {
    render(<BookingModal variant="page" />);
    await waitFor(() => {
      for (const p of PATHS) expect(fetchFake.calls.some((c) => c.path === p)).toBe(true);
    });
    // none of the public reads forces no-store any more
    for (const c of fetchFake.calls) {
      expect(c.headers['cache-control']).toBeUndefined();
    }
  });

  it('the deferred open is replayed once data arrived: the popup preselects the requested service', async () => {
    fetchFake.on('GET', '/api/services', () => ({
      status: 200,
      body: [{ id: 7, en: 'Peel', ar: 'تقشير', cat: 'laser', unit: 'in_clinic', price: 50, visible: true, active: true, showOnWebsite: true }],
    }));
    render(<BookingModal />);
    await act(async () => {
      window.dispatchEvent(new CustomEvent('open-booking', { detail: { serviceId: 7 } }));
    });
    // the popup is open and the service list rendered from the freshly loaded data
    await waitFor(() => expect(screen.getAllByText(/Peel/).length).toBeGreaterThan(0));
    // serviceId was applied by the replayed event (its effect scrolls to the date section)
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled());
  });
});
