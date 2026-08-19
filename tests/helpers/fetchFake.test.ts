/**
 * Tests for the test helper itself.
 *
 * Every component test built on `createFetchFake` inherits its correctness. A fake that silently
 * matches the wrong route, or drops the request body, would let a component test pass while the
 * component actually sent the wrong request — the exact failure this fake exists to catch. So the
 * fake gets tested like production code, mirroring `tests/helpers/supabaseFake.test.ts`.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createFetchFake } from './fetchFake';

const fetchFake = createFetchFake();

beforeEach(() => {
  fetchFake.reset();
});

describe('routing', () => {
  it('matches method + exact path and ignores the query string when matching', async () => {
    fetchFake.on('GET', '/api/assets', () => ({ status: 200, body: { assets: [1, 2] } }));
    const res = await fetchFake.fetch('/api/assets?branchId=b1');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ assets: [1, 2] });
  });

  it('a RegExp matcher matches dynamic path segments', async () => {
    fetchFake.on('POST', /^\/api\/inventory\/devices\/[^/]+\/reset-pulses$/, () => ({ status: 200, body: { ok: true } }));
    const res = await fetchFake.fetch('/api/inventory/devices/dev-1/reset-pulses', { method: 'POST' });
    expect(res.status).toBe(200);
  });

  it('an unregistered route throws rather than resolving silently', async () => {
    await expect(fetchFake.fetch('/api/nowhere')).rejects.toThrow(/no handler registered/);
  });

  it('defaults to GET when no method is given', async () => {
    fetchFake.on('GET', '/api/x', () => ({ status: 200, body: {} }));
    await fetchFake.fetch('/api/x');
    expect(fetchFake.calls[0].method).toBe('GET');
  });

  it('re-registering on() for the same method+path replaces the previous handler', async () => {
    fetchFake.on('GET', '/api/x', () => ({ status: 200, body: { v: 1 } }));
    fetchFake.on('GET', '/api/x', () => ({ status: 200, body: { v: 2 } }));
    const res = await fetchFake.fetch('/api/x');
    expect(await res.json()).toEqual({ v: 2 });
  });
});

describe('onOnce', () => {
  it('is consumed after one matching call, then falls back to on()', async () => {
    fetchFake.on('GET', '/api/x', () => ({ status: 200, body: { v: 'steady' } }));
    fetchFake.onOnce('GET', '/api/x', () => ({ status: 200, body: { v: 'first' } }));

    const first = await fetchFake.fetch('/api/x');
    expect(await first.json()).toEqual({ v: 'first' });

    const second = await fetchFake.fetch('/api/x');
    expect(await second.json()).toEqual({ v: 'steady' });
  });
});

describe('call recording', () => {
  it('records method, path, query, headers, and parsed JSON body', async () => {
    fetchFake.on('POST', '/api/assets', () => ({ status: 200, body: {} }));
    await fetchFake.fetch('/api/assets?branchId=b1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok-1' },
      body: JSON.stringify({ name: 'Laser', cost: 5000 }),
    });

    expect(fetchFake.calls).toHaveLength(1);
    const call = fetchFake.calls[0];
    expect(call.method).toBe('POST');
    expect(call.path).toBe('/api/assets');
    expect(call.query.get('branchId')).toBe('b1');
    expect(call.headers['authorization']).toBe('Bearer tok-1');
    expect(call.body).toEqual({ name: 'Laser', cost: 5000 });
  });

  it('a non-JSON body is kept as the raw string', async () => {
    fetchFake.on('POST', '/api/x', () => ({ status: 200, body: {} }));
    await fetchFake.fetch('/api/x', { method: 'POST', body: 'plain text' });
    expect(fetchFake.calls[0].body).toBe('plain text');
  });

  it('reset() clears the call log and every handler', async () => {
    fetchFake.on('GET', '/api/x', () => ({ status: 200, body: {} }));
    await fetchFake.fetch('/api/x');
    fetchFake.reset();
    expect(fetchFake.calls).toHaveLength(0);
    await expect(fetchFake.fetch('/api/x')).rejects.toThrow(/no handler registered/);
  });
});

describe('response shape', () => {
  it('ok reflects the 2xx status range', async () => {
    fetchFake.on('GET', '/api/ok', () => ({ status: 200, body: {} }));
    fetchFake.on('GET', '/api/bad', () => ({ status: 400, body: { error: 'nope' } }));
    expect((await fetchFake.fetch('/api/ok')).ok).toBe(true);
    const bad = await fetchFake.fetch('/api/bad');
    expect(bad.ok).toBe(false);
    expect(await bad.json()).toEqual({ error: 'nope' });
  });

  it('status defaults to 200 when the handler omits it', async () => {
    fetchFake.on('GET', '/api/x', () => ({ body: { ok: true } }));
    const res = await fetchFake.fetch('/api/x');
    expect(res.status).toBe(200);
  });
});
