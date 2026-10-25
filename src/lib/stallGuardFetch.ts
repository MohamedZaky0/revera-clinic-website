/**
 * RISK-131: on production a request from a server function to Supabase now and then simply stalls
 * (most are answered in about 0.2 s; some take 20 s, 45 s, or the platform kills the function after
 * 25 s). The staff login ("Verifying administrator session...") and every screen that loads data
 * then hang or fail with 504 / "Failed to fetch", although the next identical request is fast.
 *
 * A read can safely be asked again, so reads that have not answered within `stallMs` are cut and
 * repeated (up to `retries` times); the repeat nearly always lands on a healthy connection. Anything
 * that changes data (POST, PATCH, PUT, DELETE) is never repeated, because a stalled write may have
 * been applied and a second one would duplicate it; those keep the normal behaviour.
 */
export interface StallGuardOptions {
  baseFetch?: typeof fetch;
  stallMs?: number;
  retries?: number;
  /** Called each time a read is cut and about to be asked again (for the server log). */
  onRetry?: (info: { url: string; attempt: number; stalled: boolean }) => void;
}

/** Host and path only: never the query string, which can carry personal data. */
function describeUrl(input: RequestInfo | URL): string {
  try {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
    const u = new URL(raw);
    return `${u.host}${u.pathname}`;
  } catch {
    return 'unknown';
  }
}

function methodOf(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) return init.method.toUpperCase();
  if (typeof Request !== 'undefined' && input instanceof Request) return input.method.toUpperCase();
  return 'GET';
}

export function createStallGuardFetch(options: StallGuardOptions = {}): typeof fetch {
  // A healthy Supabase answer takes 0.1-0.5 s, so 3.5 s is generous; 3 repeats keep the worst case
  // (4 x 3.5 s = 14 s) under the 25 s the platform allows a function.
  const stallMs = options.stallMs ?? 3500;
  const retries = options.retries ?? 3;

  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const baseFetch = options.baseFetch ?? fetch;
    const method = methodOf(input, init);
    if (method !== 'GET' && method !== 'HEAD') return baseFetch(input, init);

    const outer = init?.signal ?? (typeof Request !== 'undefined' && input instanceof Request ? input.signal : undefined);

    for (let attempt = 0; ; attempt++) {
      const controller = new AbortController();
      const forwardAbort = () => controller.abort(outer?.reason);
      if (outer) {
        if (outer.aborted) controller.abort(outer.reason);
        else outer.addEventListener('abort', forwardAbort, { once: true });
      }
      let stalled = false;
      const timer = setTimeout(() => {
        stalled = true;
        controller.abort(new Error(`Supabase request stalled for ${stallMs} ms`));
      }, stallMs);

      try {
        return await baseFetch(input, { ...init, signal: controller.signal });
      } catch (error) {
        // the caller's own cancellation, or out of attempts: report it as it is
        if (outer?.aborted || attempt >= retries) throw error;
        if (!stalled && !(error instanceof TypeError)) throw error;
        // a stall or a dropped connection: ask again
        options.onRetry?.({ url: describeUrl(input), attempt: attempt + 1, stalled });
      } finally {
        clearTimeout(timer);
        outer?.removeEventListener('abort', forwardAbort);
      }
    }
  };
}
