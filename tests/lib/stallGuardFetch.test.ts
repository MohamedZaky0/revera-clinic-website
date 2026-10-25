import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createStallGuardFetch } from '@/lib/stallGuardFetch';

/** A fetch that never answers until its signal is aborted, like a stalled connection. */
function hangingFetch() {
  return vi.fn((_input: any, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(init.signal!.reason ?? new Error('aborted')));
    })
  );
}

describe('createStallGuardFetch (RISK-131)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('passes a normal read straight through', async () => {
    const base = vi.fn().mockResolvedValue(new Response('ok'));
    const guarded = createStallGuardFetch({ baseFetch: base as any, stallMs: 1000 });
    const res = await guarded('https://x.test/a');
    expect(await res.text()).toBe('ok');
    expect(base).toHaveBeenCalledTimes(1);
  });

  it('cuts a stalled read and asks again; the second answer is used', async () => {
    const base = hangingFetch();
    base.mockImplementationOnce(base.getMockImplementation()!);
    base.mockImplementationOnce(() => Promise.resolve(new Response('second')));
    const guarded = createStallGuardFetch({ baseFetch: base as any, stallMs: 1000, retries: 2 });
    const p = guarded('https://x.test/a');
    await vi.advanceTimersByTimeAsync(1001);
    expect(await (await p).text()).toBe('second');
    expect(base).toHaveBeenCalledTimes(2);
  });

  it('gives up after the allowed repeats and reports the stall', async () => {
    const base = hangingFetch();
    const guarded = createStallGuardFetch({ baseFetch: base as any, stallMs: 500, retries: 2 });
    const p = guarded('https://x.test/a').then(() => 'resolved', (e) => String(e.message ?? e));
    await vi.advanceTimersByTimeAsync(1600);
    expect(await p).toMatch(/stalled for 500 ms/);
    expect(base).toHaveBeenCalledTimes(3);
  });

  it('never repeats a write', async () => {
    for (const method of ['POST', 'PATCH', 'PUT', 'DELETE']) {
      const base = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
      const guarded = createStallGuardFetch({ baseFetch: base as any, stallMs: 500 });
      await expect(guarded('https://x.test/a', { method })).rejects.toThrow('fetch failed');
      expect(base).toHaveBeenCalledTimes(1);
    }
  });

  it('does not set its own timer on a write (a slow write is left to finish)', async () => {
    const base = vi.fn(() => new Promise<Response>((resolve) => setTimeout(() => resolve(new Response('late')), 5000)));
    const guarded = createStallGuardFetch({ baseFetch: base as any, stallMs: 500 });
    const p = guarded('https://x.test/a', { method: 'POST', body: '{}' });
    await vi.advanceTimersByTimeAsync(5001);
    expect(await (await p).text()).toBe('late');
    expect(base).toHaveBeenCalledTimes(1);
  });

  it('repeats a read after a dropped connection (TypeError) but not after an ordinary error', async () => {
    const dropped = vi.fn().mockRejectedValueOnce(new TypeError('fetch failed')).mockResolvedValueOnce(new Response('ok'));
    const g1 = createStallGuardFetch({ baseFetch: dropped as any, stallMs: 500 });
    expect(await (await g1('https://x.test/a')).text()).toBe('ok');
    expect(dropped).toHaveBeenCalledTimes(2);

    const other = vi.fn().mockRejectedValue(new Error('boom'));
    const g2 = createStallGuardFetch({ baseFetch: other as any, stallMs: 500 });
    await expect(g2('https://x.test/a')).rejects.toThrow('boom');
    expect(other).toHaveBeenCalledTimes(1);
  });

  it("respects the caller's own cancellation (no repeat)", async () => {
    const base = hangingFetch();
    const guarded = createStallGuardFetch({ baseFetch: base as any, stallMs: 5000 });
    const ctrl = new AbortController();
    const p = guarded('https://x.test/a', { signal: ctrl.signal }).then(() => 'resolved', () => 'aborted');
    ctrl.abort(new Error('user left'));
    expect(await p).toBe('aborted');
    expect(base).toHaveBeenCalledTimes(1);
  });
});
