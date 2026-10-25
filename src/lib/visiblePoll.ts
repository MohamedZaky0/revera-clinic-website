// A background poll that does not waste requests (RISK-136).
//
// A plain setInterval/setTimeout chain keeps calling the server for as long as the tab exists, also
// when nobody is looking at it. Every call to our API costs at least one Supabase Auth request, so a
// handful of forgotten admin tabs add up to tens of thousands of requests an hour.
//
// startVisiblePoll runs `task` every `intervalMs` while the tab is visible and:
//   - does nothing while the tab is hidden (no timer is kept either),
//   - when the tab becomes visible again, runs the task once straight away if the data is older than
//     one interval, otherwise just waits for the rest of the interval (a quick alt-tab costs nothing),
//   - never starts a run while the previous run has not finished (a slow server cannot pile up calls),
//   - runs the next cycle `intervalMs` after the previous run FINISHED (like the old setTimeout chain).
//
// Returns a stop function. Safe to call where there is no document (it then simply never pauses).

export type VisiblePollOptions = {
  // Run once as soon as the poll starts (only if the tab is visible; otherwise on the first
  // visible event). Default false: the caller has already loaded the data once itself.
  immediate?: boolean;
};

function tabIsHidden(): boolean {
  return typeof document !== 'undefined' && document.hidden === true;
}

export function startVisiblePoll(
  task: () => unknown | Promise<unknown>,
  intervalMs: number,
  options: VisiblePollOptions = {},
): () => void {
  let stopped = false;
  let inFlight = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  // When the data was last requested. -Infinity for an immediate poll so the first visible moment runs it.
  let lastRunAt = options.immediate ? Number.NEGATIVE_INFINITY : Date.now();

  const clearTimer = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const schedule = (delay: number = intervalMs) => {
    clearTimer();
    if (stopped || tabIsHidden()) return;
    timer = setTimeout(tick, delay);
  };

  const run = async () => {
    if (inFlight) return;
    inFlight = true;
    lastRunAt = Date.now();
    try {
      await task();
    } catch (err) {
      console.error('Background poll failed:', err);
    } finally {
      inFlight = false;
    }
  };

  async function tick() {
    timer = null;
    if (stopped || tabIsHidden()) return;
    await run();
    schedule();
  }

  const onVisibilityChange = () => {
    if (stopped) return;
    if (tabIsHidden()) {
      clearTimer();
      return;
    }
    const age = Date.now() - lastRunAt;
    if (age >= intervalMs) {
      clearTimer();
      void run().then(() => schedule());
    } else if (!inFlight) {
      schedule(intervalMs - age);
    }
  };

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibilityChange);
  }

  if (options.immediate) {
    if (!tabIsHidden()) void tick();
  } else {
    schedule();
  }

  return () => {
    stopped = true;
    clearTimer();
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onVisibilityChange);
    }
  };
}
