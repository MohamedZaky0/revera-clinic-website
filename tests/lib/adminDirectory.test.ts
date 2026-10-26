/**
 * RISK-136: reception, doctors, HR and custom roles used to call GET /api/roles and /api/employees
 * (admin-only on the server), get 403, wait 2 s and call again. canLoadAdminDirectory mirrors
 * requireAdministratorAccess; loadAdminDirectory never asks for a role that would be refused and
 * never repeats a 401/403.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { canLoadAdminDirectory, fetchJsonWithOneRetry, loadAdminDirectory } from '@/lib/adminDirectory';

type Reply = { status: number; body?: unknown } | 'network-error';

function fakeFetch(replies: Record<string, Reply[]>) {
  const calls: string[] = [];
  const fn = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    const queue = replies[url] ?? [{ status: 200, body: [] }];
    const reply = queue.length > 1 ? queue.shift()! : queue[0];
    if (reply === 'network-error') throw new TypeError('Failed to fetch');
    return { ok: reply.status >= 200 && reply.status < 300, status: reply.status, json: async () => reply.body } as Response;
  });
  return { fn: fn as unknown as typeof fetch, calls };
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('canLoadAdminDirectory', () => {
  it('is true only for the owner and admins, the roles the server lets through', () => {
    expect(canLoadAdminDirectory('superadmin')).toBe(true);
    expect(canLoadAdminDirectory('admin')).toBe(true);
  });

  it.each(['Receptionist', 'reception', 'Doctor', 'HR', 'Supervisor', 'Consultant', 'Admin Assistant', '', null, undefined])(
    'is false for %s',
    (role) => {
      expect(canLoadAdminDirectory(role as string | null | undefined)).toBe(false);
    },
  );
});

describe('loadAdminDirectory', () => {
  it('sends no request at all for a non-admin role', async () => {
    const { fn, calls } = fakeFetch({});
    for (const role of ['Receptionist', 'Doctor', 'HR', null]) {
      const result = await loadAdminDirectory({ role, accessToken: 'tok', fetchImpl: fn });
      expect(result).toBeNull();
    }
    expect(calls).toEqual([]);
  });

  it('sends no request without an access token', async () => {
    const { fn, calls } = fakeFetch({});
    expect(await loadAdminDirectory({ role: 'admin', accessToken: null, fetchImpl: fn })).toBeNull();
    expect(calls).toEqual([]);
  });

  it('asks for both lists once, with the bearer token, for an admin', async () => {
    const { fn, calls } = fakeFetch({
      '/api/roles': [{ status: 200, body: [{ name: 'admin' }] }],
      '/api/employees': [{ status: 200, body: [{ id: 'e1' }] }],
    });
    const result = await loadAdminDirectory({ role: 'admin', accessToken: 'tok', fetchImpl: fn });

    expect(calls.sort()).toEqual(['/api/employees', '/api/roles']);
    expect(result?.roles).toEqual({ status: 'fulfilled', value: [{ name: 'admin' }] });
    expect(result?.employees).toEqual({ status: 'fulfilled', value: [{ id: 'e1' }] });
    const init = (fn as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
  });
});

describe('fetchJsonWithOneRetry', () => {
  it.each([401, 403])('does not retry a %i', async (status) => {
    const { fn, calls } = fakeFetch({ '/api/roles': [{ status }] });
    const run = fetchJsonWithOneRetry('/api/roles', { headers: {}, fetchImpl: fn });
    const outcome = expect(run).rejects.toThrow(String(status));
    await vi.advanceTimersByTimeAsync(10000);
    await outcome;
    expect(calls).toEqual(['/api/roles']);
  });

  it('retries a 500 once after the pause, and returns the second answer', async () => {
    const { fn, calls } = fakeFetch({ '/api/roles': [{ status: 500 }, { status: 200, body: ['ok'] }] });
    const run = fetchJsonWithOneRetry('/api/roles', { headers: {}, fetchImpl: fn, retryDelayMs: 2000 });

    await vi.advanceTimersByTimeAsync(1999);
    expect(calls).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(await run).toEqual(['ok']);
    expect(calls).toHaveLength(2);
  });

  it('retries a network error once and then gives up (two requests in total)', async () => {
    const { fn, calls } = fakeFetch({ '/api/employees': ['network-error'] });
    const run = fetchJsonWithOneRetry('/api/employees', { headers: {}, fetchImpl: fn });
    const outcome = expect(run).rejects.toThrow('Failed to fetch');
    await vi.advanceTimersByTimeAsync(10000);
    await outcome;
    expect(calls).toHaveLength(2);
  });
});
