/**
 * In-memory stand-in for the global `fetch`, for component-level tests.
 *
 * Components in this codebase call the API via `fetch("/api/whatever", { method, headers, body })`
 * rather than talking to Supabase directly. Mocking each call site's return value individually
 * (`vi.fn().mockResolvedValueOnce(...)`) produces tests that pass even when the component built the
 * wrong request — the mock returns whatever the test author expected regardless of what URL, method,
 * or body the component actually sent. This fake instead behaves like a tiny router: register a
 * handler per method + path, and it records every call (method, full URL, parsed query, headers,
 * parsed JSON body) so a test can assert on the *request* a button click or form submit produced, not
 * just on the response the component rendered afterwards.
 *
 * It deliberately does not try to be a server: no persistence beyond what a handler closes over, no
 * routing precedence rules beyond exact-path-then-regex. A component that fetches a path with no
 * registered handler gets a thrown error inside `fetch()` (surfaced as a rejected promise) rather
 * than a silent 404 or `undefined` — a silently-unmatched route is exactly the failure mode this file
 * exists to prevent, mirroring `tests/helpers/supabaseFake.ts`.
 *
 * Usage:
 *
 *   import { createFetchFake } from '../helpers/fetchFake';
 *
 *   const fetchFake = createFetchFake();
 *   beforeEach(() => {
 *     fetchFake.reset();
 *     vi.stubGlobal('fetch', fetchFake.fetch);
 *   });
 *
 *   fetchFake.on('GET', '/api/assets', () => ({ status: 200, body: { assets: [...] } }));
 *   fetchFake.on('POST', '/api/assets', (call) => {
 *     expect(call.body).toEqual({ name: 'Laser Device', purchase_cost: 5000 });
 *     return { status: 200, body: { id: 'asset-1', ...call.body } };
 *   });
 *
 *   // ... render component, user-event click ...
 *
 *   expect(fetchFake.calls.some((c) => c.method === 'DELETE' && c.path === '/api/assets')).toBe(true);
 *
 * `on()` re-registers for the same method+path replace the previous handler (last write wins), so a
 * test can override the module-level `beforeEach` seed for one specific case. Use `onOnce()` when a
 * component fires the same GET twice (initial load, then a refetch after a mutation) and each call
 * must answer differently — queued handlers are consumed in order, then fall back to any `on()`
 * handler registered for the same method+path.
 */

import { vi, type Mock } from 'vitest';

export interface FetchCall {
  method: string;
  /** Full URL as passed to fetch, resolved against a fake http://localhost base. */
  url: string;
  /** Path only, no query string — what routes are matched against. */
  path: string;
  query: URLSearchParams;
  headers: Record<string, string>;
  /** Parsed JSON body when Content-Type is JSON (or the body looks like JSON), else the raw string. */
  body: any;
}

export interface FetchHandlerResult {
  status?: number;
  body?: any;
  /** Set true to simulate a network-level failure (fetch rejects) rather than a non-ok response. */
  networkError?: boolean;
}

export type FetchHandler = (call: FetchCall) => FetchHandlerResult | Promise<FetchHandlerResult>;

interface Registration {
  method: string;
  matcher: string | RegExp;
  handler: FetchHandler;
}

function matchPath(matcher: string | RegExp, path: string): boolean {
  return typeof matcher === 'string' ? matcher === path : matcher.test(path);
}

function parseBody(rawBody: unknown, headers: Record<string, string>): any {
  if (rawBody === undefined || rawBody === null) return undefined;
  if (typeof rawBody !== 'string') return rawBody;
  const contentType = (headers['content-type'] || headers['Content-Type'] || '').toLowerCase();
  if (contentType.includes('application/json') || /^\s*[[{]/.test(rawBody)) {
    try {
      return JSON.parse(rawBody);
    } catch {
      return rawBody;
    }
  }
  return rawBody;
}

function headersToObject(init?: HeadersInit): Record<string, string> {
  const out: Record<string, string> = {};
  if (!init) return out;
  new Headers(init).forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

function makeResponse(result: FetchHandlerResult): Response {
  const status = result.status ?? 200;
  const body = result.body ?? {};
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return typeof body === 'string' ? JSON.parse(body) : body;
    },
    async text() {
      return text;
    },
  } as Response;
}

export interface FetchFake {
  /** Drop-in replacement for global `fetch`. */
  fetch: Mock<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>;
  /** Every call made through `fetch`, in order. Read this in assertions. */
  calls: FetchCall[];
  /** Register a handler for method+path (or method+RegExp). Replaces any existing `on()` handler for the same pair. */
  on(method: string, matcher: string | RegExp, handler: FetchHandler): void;
  /** Queue a one-shot handler consumed by the next matching call, then discarded. */
  onOnce(method: string, matcher: string | RegExp, handler: FetchHandler): void;
  /** Clear registered handlers, queues, and the call log. */
  reset(): void;
}

export function createFetchFake(): FetchFake {
  const registrations: Registration[] = [];
  const onceQueue: Registration[] = [];
  const calls: FetchCall[] = [];

  const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const rawUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
    const method = (init?.method || 'GET').toUpperCase();
    const url = new URL(rawUrl, 'http://localhost');
    const headers = headersToObject(init?.headers);
    const body = parseBody(init?.body, headers);

    const call: FetchCall = {
      method,
      url: url.toString(),
      path: url.pathname,
      query: url.searchParams,
      headers,
      body,
    };
    calls.push(call);

    const onceIdx = onceQueue.findIndex((r) => r.method === method && matchPath(r.matcher, call.path));
    if (onceIdx >= 0) {
      const [reg] = onceQueue.splice(onceIdx, 1);
      return makeResponse(await reg.handler(call));
    }

    const reg = [...registrations].reverse().find((r) => r.method === method && matchPath(r.matcher, call.path));
    if (!reg) {
      throw new Error(
        `fetchFake: no handler registered for ${method} ${call.path}. Call fetchFake.on("${method}", "${call.path}", ...) ` +
          `before the component under test fires this request — an unmatched route silently returning nothing would ` +
          `hide the component sending the wrong request.`
      );
    }
    return makeResponse(await reg.handler(call));
  });

  return {
    fetch: fetchImpl,
    calls,
    on(method: string, matcher: string | RegExp, handler: FetchHandler) {
      registrations.push({ method: method.toUpperCase(), matcher, handler });
    },
    onOnce(method: string, matcher: string | RegExp, handler: FetchHandler) {
      onceQueue.push({ method: method.toUpperCase(), matcher, handler });
    },
    reset() {
      registrations.length = 0;
      onceQueue.length = 0;
      calls.length = 0;
      fetchImpl.mockClear();
    },
  };
}
