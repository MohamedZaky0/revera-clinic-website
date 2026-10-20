import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getConfirmationMap, resetConfirmationCache } from '@/lib/employeeConfirmation';

const confirmed = (id: string) => Promise.resolve({ data: { user: { id, email_confirmed_at: '2026-10-01T00:00:00Z' } }, error: null });
const invited = (id: string) => Promise.resolve({ data: { user: { id, email_confirmed_at: null } }, error: null });

beforeEach(() => resetConfirmationCache());

describe('getConfirmationMap', () => {
  it('reads each employee by id, with no 50-user ceiling', async () => {
    const ids = Array.from({ length: 120 }, (_, i) => `u${i}`);
    const get = vi.fn((id: string) => (Number(id.slice(1)) % 2 === 0 ? confirmed(id) : invited(id)));
    const { map, complete } = await getConfirmationMap(get, ids);
    expect(complete).toBe(true);
    expect(map.size).toBe(120);
    expect(map.get('u0')).toBe('2026-10-01T00:00:00Z');
    expect(map.get('u1')).toBeNull();
    expect(get).toHaveBeenCalledTimes(120);
  });

  it('skips empty ids and de-duplicates', async () => {
    const get = vi.fn(confirmed);
    await getConfirmationMap(get, ['a', null, undefined, 'a', '']);
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('remembers confirmed users, but asks again about uninvited ones', async () => {
    const get = vi.fn((id: string) => (id === 'done' ? confirmed(id) : invited(id)));
    await getConfirmationMap(get, ['done', 'waiting']);
    get.mockClear();
    const { map } = await getConfirmationMap(get, ['done', 'waiting']);
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith('waiting');
    expect(map.get('done')).toBe('2026-10-01T00:00:00Z');
  });

  it('gives up at the deadline and returns what it already has instead of hanging', async () => {
    const get = vi.fn((id: string) => (id === 'fast' ? confirmed(id) : new Promise<any>(() => {})));
    const started = Date.now();
    const { map, complete } = await getConfirmationMap(get, ['fast', 'stuck'], { deadlineMs: 50 });
    expect(Date.now() - started).toBeLessThan(1000);
    expect(complete).toBe(false);
    expect(map.get('fast')).toBe('2026-10-01T00:00:00Z');
    expect(map.has('stuck')).toBe(false);
  });

  it('reports incomplete when a lookup errors, without throwing', async () => {
    const get = vi.fn((id: string) => (id === 'bad' ? Promise.reject(new Error('boom')) : confirmed(id)));
    const { map, complete } = await getConfirmationMap(get, ['ok', 'bad']);
    expect(complete).toBe(false);
    expect(map.get('ok')).toBe('2026-10-01T00:00:00Z');
    expect(map.has('bad')).toBe(false);
  });
});
