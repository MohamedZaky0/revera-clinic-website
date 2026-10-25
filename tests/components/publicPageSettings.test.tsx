/**
 * RISK-137 / DEC-131: the shared browser-side read of /api/page-settings (Navbar, LanguageProvider,
 * BookingModal). One request per page load; a re-read only after 5 minutes, a forced refresh, or a
 * settings-change event; failures are never cached.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getPublicPageSettings, invalidatePublicPageSettings } from '@/lib/publicPageSettings';

let calls = 0;
let responder: () => Response;

beforeEach(() => {
  calls = 0;
  invalidatePublicPageSettings();
  responder = () => new Response(JSON.stringify({ header: { showCustomerLogin: true } }), { status: 200 });
  vi.stubGlobal('fetch', vi.fn(async () => {
    calls += 1;
    return responder();
  }));
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('getPublicPageSettings', () => {
  it('shares one request between concurrent callers', async () => {
    const [a, b, c] = await Promise.all([getPublicPageSettings(), getPublicPageSettings(), getPublicPageSettings()]);
    expect(calls).toBe(1);
    expect(a).toEqual(b);
    expect(b).toEqual(c);
  });

  it('does not refetch on repeated focus/visibility calls inside 5 minutes', async () => {
    await getPublicPageSettings();
    for (let i = 0; i < 10; i++) await getPublicPageSettings();
    expect(calls).toBe(1);
  });

  it('refetches once the copy is older than 5 minutes', async () => {
    await getPublicPageSettings();
    vi.advanceTimersByTime(5 * 60 * 1000 + 1);
    await getPublicPageSettings();
    expect(calls).toBe(2);
  });

  it('a settings-change event drops the copy', async () => {
    await getPublicPageSettings();
    window.dispatchEvent(new CustomEvent('revera-settings-change'));
    await getPublicPageSettings();
    expect(calls).toBe(2);
  });

  it('force bypasses the copy', async () => {
    await getPublicPageSettings();
    await getPublicPageSettings({ force: true });
    expect(calls).toBe(2);
  });

  it('never caches a failure', async () => {
    responder = () => new Response('boom', { status: 500 });
    expect(await getPublicPageSettings()).toBeNull();
    responder = () => new Response(JSON.stringify({ ok: 1 }), { status: 200 });
    expect(await getPublicPageSettings()).toEqual({ ok: 1 });
    expect(calls).toBe(2);
  });

  it('sends no Authorization header and no cache override', async () => {
    await getPublicPageSettings();
    expect((fetch as any).mock.calls[0]).toEqual(['/api/page-settings']);
  });
});
