/**
 * RISK-136 / DEC-130: background polls must not run in a hidden tab, must not overlap, and must
 * refresh once when the tab is shown again. The admin shell's booking poll (15 s) and HR-alert poll
 * (30 s) both use startVisiblePoll from an effect; the harness below mounts it the same way.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useEffect } from 'react';
import { render, act } from '@testing-library/react';
import { startVisiblePoll } from '@/lib/visiblePoll';

let hidden = false;

function setHidden(value: boolean) {
  hidden = value;
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (hidden ? 'hidden' : 'visible') });
  document.dispatchEvent(new Event('visibilitychange'));
}

const advance = async (ms: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};

function Harness({ task, intervalMs, immediate = false, enabled = true }: {
  task: () => unknown;
  intervalMs: number;
  immediate?: boolean;
  enabled?: boolean;
}) {
  useEffect(() => {
    if (!enabled) return;
    return startVisiblePoll(task, intervalMs, { immediate });
  }, [task, intervalMs, immediate, enabled]);
  return null;
}

beforeEach(() => {
  vi.useFakeTimers();
  hidden = false;
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (hidden ? 'hidden' : 'visible') });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('startVisiblePoll: interval', () => {
  it('first run after one interval, then one run per interval (booking poll, 15 s)', async () => {
    const task = vi.fn(async () => {});
    render(<Harness task={task} intervalMs={15000} />);

    await advance(14999);
    expect(task).toHaveBeenCalledTimes(0);
    await advance(1);
    expect(task).toHaveBeenCalledTimes(1);
    await advance(45000);
    expect(task).toHaveBeenCalledTimes(4);
  });

  it('immediate polls (HR alerts) run at once and then every interval (30 s)', async () => {
    const task = vi.fn(async () => {});
    render(<Harness task={task} intervalMs={30000} immediate />);

    await advance(0);
    expect(task).toHaveBeenCalledTimes(1);
    await advance(29999);
    expect(task).toHaveBeenCalledTimes(1);
    await advance(1);
    expect(task).toHaveBeenCalledTimes(2);
  });

  it('stops for good when the component unmounts', async () => {
    const task = vi.fn(async () => {});
    const { unmount } = render(<Harness task={task} intervalMs={15000} />);
    await advance(15000);
    expect(task).toHaveBeenCalledTimes(1);

    unmount();
    await advance(120000);
    setHidden(true);
    setHidden(false);
    await advance(120000);
    expect(task).toHaveBeenCalledTimes(1);
  });
});

describe('startVisiblePoll: hidden tab', () => {
  it('makes no request while the tab is hidden', async () => {
    const task = vi.fn(async () => {});
    render(<Harness task={task} intervalMs={15000} />);
    await advance(15000);
    expect(task).toHaveBeenCalledTimes(1);

    setHidden(true);
    await advance(10 * 60 * 1000);
    expect(task).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('refetches once when the tab becomes visible after a long absence, then resumes the interval', async () => {
    const task = vi.fn(async () => {});
    render(<Harness task={task} intervalMs={15000} />);
    await advance(15000);
    setHidden(true);
    await advance(5 * 60 * 1000);
    expect(task).toHaveBeenCalledTimes(1);

    setHidden(false);
    await advance(0);
    expect(task).toHaveBeenCalledTimes(2);

    await advance(14999);
    expect(task).toHaveBeenCalledTimes(2);
    await advance(1);
    expect(task).toHaveBeenCalledTimes(3);
  });

  it('a quick switch away and back does not refetch data that is still fresh', async () => {
    const task = vi.fn(async () => {});
    render(<Harness task={task} intervalMs={15000} />);
    await advance(5000);
    setHidden(true);
    await advance(2000);
    setHidden(false);
    await advance(0);
    expect(task).toHaveBeenCalledTimes(0);

    // the original schedule still holds: due 15 s after the start
    await advance(7999);
    expect(task).toHaveBeenCalledTimes(0);
    await advance(1);
    expect(task).toHaveBeenCalledTimes(1);
  });

  it('an immediate poll started in a hidden tab waits for the tab to be shown', async () => {
    setHidden(true);
    const task = vi.fn(async () => {});
    render(<Harness task={task} intervalMs={30000} immediate />);
    await advance(120000);
    expect(task).toHaveBeenCalledTimes(0);

    setHidden(false);
    await advance(0);
    expect(task).toHaveBeenCalledTimes(1);
  });

  it('several visibility events in a row cause a single refetch', async () => {
    const task = vi.fn(() => new Promise<void>(() => {})); // never finishes
    render(<Harness task={task} intervalMs={15000} />);
    await advance(15000);
    expect(task).toHaveBeenCalledTimes(1);
    setHidden(true);
    await advance(60000);
    setHidden(false);
    setHidden(true);
    setHidden(false);
    await advance(0);
    expect(task).toHaveBeenCalledTimes(1); // the first run is still in flight
  });
});

describe('startVisiblePoll: in-flight guard', () => {
  it('does not start a second run while the first has not finished, then continues after it does', async () => {
    let release: () => void = () => {};
    const task = vi.fn(() => new Promise<void>((resolve) => { release = resolve; }));
    render(<Harness task={task} intervalMs={30000} immediate />);

    await advance(0);
    expect(task).toHaveBeenCalledTimes(1);
    await advance(5 * 30000);
    expect(task).toHaveBeenCalledTimes(1);

    release();
    await advance(0);
    await advance(30000);
    expect(task).toHaveBeenCalledTimes(2);
  });

  it('keeps polling after a run throws', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const task = vi.fn(async () => { throw new Error('network down'); });
    render(<Harness task={task} intervalMs={15000} />);
    await advance(30000);
    expect(task).toHaveBeenCalledTimes(2);
    errorSpy.mockRestore();
  });
});

describe('startVisiblePoll: disabled (doctor workspace shown)', () => {
  it('a poll that is not started makes no request, and starts when enabled', async () => {
    const task = vi.fn(async () => {});
    const { rerender } = render(<Harness task={task} intervalMs={15000} enabled={false} />);
    await advance(120000);
    expect(task).toHaveBeenCalledTimes(0);

    rerender(<Harness task={task} intervalMs={15000} enabled />);
    await advance(15000);
    expect(task).toHaveBeenCalledTimes(1);
  });
});
