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
}

function methodOf(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) return init.method.toUpperCase();
  if (typeof Request !== 'undefined' && input instanceof Request) return input.method.toUpperCase();
  return 'GET';
}

export function createStallGuardFetch(options: StallGuardOptions = {}): typeof fetch {
  const stallMs = options.stallMs ?? 8000;
  const retries = options.retries ?? 2;

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
      } finally {
        clearTimeout(timer);
        outer?.removeEventListener('abort', forwardAbort);
      }
    }
  };
}
