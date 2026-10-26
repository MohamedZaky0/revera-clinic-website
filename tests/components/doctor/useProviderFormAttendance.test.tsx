import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProviderForm } from '@/components/admin/doctor/useProviderForm';

// RISK-135: Doctors > Attendance fired GET /api/provider-attendance in an endless loop because
// `fetchAttendance` was a new function on every render and sat in the fetch effect's dependencies,
// while the fetch itself sets state (which re-renders the host and re-runs the effect).

type Deferred = { resolve: (rows: any[]) => void };

let calls: { method: string; url: string }[];
let pending: Deferred[];
let holdResponses: boolean;

function attendanceGets() {
  return calls.filter((c) => c.method === 'GET' && c.url.startsWith('/api/provider-attendance'));
}

function installFetch() {
  calls = [];
  pending = [];
  holdResponses = false;
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, init?: any) => {
      const method = init?.method || 'GET';
      calls.push({ method, url });
      const respond = (rows: any[]) => ({ ok: true, json: async () => rows }) as any;
      if (method === 'POST') return Promise.resolve(respond([]));
      if (holdResponses) {
        return new Promise((resolve) => pending.push({ resolve: (rows) => resolve(respond(rows)) }));
      }
      // A fresh array each time, like a real response, so every fetch really changes state.
      return Promise.resolve(respond([{ provider_id: 'p1', status: 'Present' }]));
    }),
  );
}

/** Mounts the hook the way AdminPage does: every render hands it brand-new props objects/functions. */
function mountHook() {
  return renderHook(() =>
    useProviderForm({
      branches: [],
      session: null,
      authenticatedJsonHeaders: { 'Content-Type': 'application/json', Authorization: 'Bearer test' },
      showConfirm: async () => true,
      fetchRolesAndEmployees: () => {},
      getDoctorFirstReservationDate: () => null,
      allReservations: [],
      activeNav: 'Doctors',
      adminRole: 'superadmin',
      hasPermission: () => true,
    }),
  );
}

const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 60)); });

describe('useProviderForm attendance fetching (RISK-135)', () => {
  beforeEach(() => {
    vi.useRealTimers();
    installFetch();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('does not fetch attendance while the Doctors tab is showing', async () => {
    mountHook();
    await settle();
    expect(attendanceGets()).toHaveLength(0);
  });

  it('fetches once when the Attendance tab opens and does not refetch after its own state update re-renders', async () => {
    const { result } = mountHook();
    act(() => { result.current.setProviderTab('Attendance'); });
    await settle();

    expect(attendanceGets()).toHaveLength(1);
    expect(attendanceGets()[0].url).toBe(`/api/provider-attendance?date=${result.current.attendanceDate}`);
    // The response was stored and the loading flag cleared, i.e. the re-renders really happened.
    expect(result.current.attendanceRecords).toEqual([{ provider_id: 'p1', status: 'Present' }]);
    expect(result.current.loadingProviderAttendance).toBe(false);

    // Idle: still one request, however long we wait.
    await settle();
    await settle();
    expect(attendanceGets()).toHaveLength(1);
  });

  it('exposes a fetchAttendance with a stable identity across renders', async () => {
    const { result, rerender } = mountHook();
    const first = result.current.fetchAttendance;
    rerender();
    act(() => { result.current.setProviderTab('Attendance'); });
    await settle();
    expect(result.current.fetchAttendance).toBe(first);
  });

  it('fetches again exactly once when the selected date changes', async () => {
    const { result } = mountHook();
    act(() => { result.current.setProviderTab('Attendance'); });
    await settle();
    expect(attendanceGets()).toHaveLength(1);

    act(() => { result.current.setAttendanceDate('2026-10-20'); });
    await settle();
    await settle();

    expect(attendanceGets()).toHaveLength(2);
    expect(attendanceGets()[1].url).toBe('/api/provider-attendance?date=2026-10-20');
  });

  it('refetches after the user saves attendance (one POST, then one GET)', async () => {
    const { result } = mountHook();
    act(() => { result.current.setProviderTab('Attendance'); });
    await settle();
    expect(attendanceGets()).toHaveLength(1);

    await act(async () => { await result.current.handleToggleAttendance('p1', 'Absent'); });
    await settle();
    await settle();

    const posts = calls.filter((c) => c.method === 'POST');
    expect(posts).toHaveLength(1);
    expect(attendanceGets()).toHaveLength(2);
    expect(result.current.savingAttendanceId).toBeNull();
  });

  it('skips an overlapping call for the same date while one is in flight', async () => {
    const { result } = mountHook();
    holdResponses = true;
    act(() => { result.current.setProviderTab('Attendance'); });
    await settle();
    expect(attendanceGets()).toHaveLength(1); // first request is still pending

    await act(async () => {
      void result.current.fetchAttendance(result.current.attendanceDate);
      void result.current.fetchAttendance(result.current.attendanceDate);
    });
    expect(attendanceGets()).toHaveLength(1); // both skipped

    await act(async () => { pending[0].resolve([{ provider_id: 'p1', status: 'Present' }]); });
    await settle();
    expect(result.current.loadingProviderAttendance).toBe(false);

    // Once it has finished, a new call is allowed again.
    await act(async () => { void result.current.fetchAttendance(result.current.attendanceDate); });
    await settle();
    expect(attendanceGets()).toHaveLength(2);
  });

  it('a slow response for an older date cannot overwrite the newer date', async () => {
    const { result } = mountHook();
    holdResponses = true;
    act(() => { result.current.setProviderTab('Attendance'); });
    await settle();
    act(() => { result.current.setAttendanceDate('2026-10-20'); });
    await settle();
    expect(attendanceGets()).toHaveLength(2); // different date is not blocked by the guard

    await act(async () => { pending[1].resolve([{ provider_id: 'new', status: 'Present' }]); });
    await act(async () => { pending[0].resolve([{ provider_id: 'old', status: 'Absent' }]); });
    await settle();

    expect(result.current.attendanceRecords).toEqual([{ provider_id: 'new', status: 'Present' }]);
    expect(result.current.loadingProviderAttendance).toBe(false);
  });
});
