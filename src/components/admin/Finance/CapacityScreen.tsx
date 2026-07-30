"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, AlertCircle, Info, DoorOpen, Stethoscope, CalendarX } from "lucide-react";
import { StatTile, BarChart } from "./charts";

export interface BranchOption {
  id: string;
  name_en: string;
  name_ar?: string;
}

interface DayFigures {
  date: string;
  roomMinutes: number;
  doctorMinutes: number;
  bottleneckMinutes: number;
}

interface BranchSlice {
  branchId: string;
  branchName: string;
  roomMinutes: number;
  doctorMinutes: number;
  bottleneckMinutes: number;
  bookedMinutes: number;
  utilization: number | null;
  noShowRate: number | null;
  noShowCount: number;
  completedCount: number;
  byDay: DayFigures[];
}

interface CapacityResponse {
  range: { label: string; from: string; to: string };
  branchId: string | null;
  note: string;
  clinicWide: {
    roomMinutes: number;
    doctorMinutes: number;
    bottleneckMinutes: number;
    bookedMinutes: number;
    noShowCount: number;
    completedCount: number;
    utilization: number | null;
    noShowRate: number | null;
  };
  byBranch: BranchSlice[];
}

interface CapacityScreenProps {
  accessToken?: string;
  branches?: BranchOption[];
}

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function pct(n: number | null): string {
  if (n === null) return "—";
  return `${Math.round(n * 1000) / 10}%`;
}

function hours(minutes: number): string {
  return `${Math.round((minutes / 60) * 10) / 10}h`;
}

export function CapacityScreen({ accessToken, branches = [] }: CapacityScreenProps) {
  const [period, setPeriod] = useState(currentPeriod());
  const [branchId, setBranchId] = useState("");
  const [data, setData] = useState<CapacityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const headers = useMemo(
    () => (accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined),
    [accessToken]
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ period });
        if (branchId) params.set("branchId", branchId);
        const res = await fetch(`/api/finance/capacity?${params}`, { headers, cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "Unable to load capacity.");
        if (!cancelled) setData(json);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Failed to load capacity.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [period, branchId, headers]);

  const dayBars = useMemo(() => {
    if (!data) return [];
    const slice = branchId ? data.byBranch.find((b) => b.branchId === branchId) : data.byBranch[0];
    if (!slice) return [];
    return slice.byDay.map((d) => ({ label: d.date.slice(5), value: d.bottleneckMinutes }));
  }, [data, branchId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">Month</label>
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-xl border border-[var(--cr-primary)]/15 bg-white px-3 py-2.5 text-sm text-[var(--cr-dark)] outline-none focus:border-[var(--cr-accent)]"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">Branch</label>
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="rounded-xl border border-[var(--cr-primary)]/15 bg-white px-3 py-2.5 text-sm text-[var(--cr-dark)] outline-none focus:border-[var(--cr-accent)]"
          >
            <option value="">All branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name_en}
              </option>
            ))}
          </select>
        </div>
      </div>

      {data?.note && (
        <div className="flex items-start gap-2 rounded-xl bg-blue-50 p-4 text-sm text-blue-900">
          <Info size={18} className="mt-0.5 flex-shrink-0" />
          <span>{data.note}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-muted-foreground">Loading capacity...</div>
      ) : data ? (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="Utilization"
              value={pct(data.clinicWide.utilization)}
              icon={<Clock size={18} />}
              accent="accent"
            />
            <StatTile label="Room Capacity" value={hours(data.clinicWide.roomMinutes)} icon={<DoorOpen size={18} />} />
            <StatTile label="Doctor Capacity" value={hours(data.clinicWide.doctorMinutes)} icon={<Stethoscope size={18} />} />
            <StatTile label="No-Show Rate" value={pct(data.clinicWide.noShowRate)} icon={<CalendarX size={18} />} />
          </div>

          <div
            className="grid gap-6 rounded-[32px] border p-6 shadow-sm sm:grid-cols-2"
            style={{ backgroundColor: "var(--cr-white)", borderColor: "var(--cr-divider)" }}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Booked time</p>
              <p className="mt-1 text-lg font-semibold" style={{ color: "var(--cr-dark)" }}>
                {hours(data.clinicWide.bookedMinutes)}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Out of {hours(data.clinicWide.bottleneckMinutes)} the clinic could actually deliver this month
                (the smaller of room time and doctor time available).
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Completed vs. no-show
              </p>
              <p className="mt-1 text-lg font-semibold" style={{ color: "var(--cr-dark)" }}>
                {data.clinicWide.completedCount} completed, {data.clinicWide.noShowCount} no-shows
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                A high no-show rate quietly eats into utilization even when the schedule looks full.
              </p>
            </div>
          </div>

          <div
            className="rounded-[32px] border p-6 shadow-sm"
            style={{ backgroundColor: "var(--cr-white)", borderColor: "var(--cr-divider)" }}
          >
            <h3 className="mb-1 text-lg font-semibold" style={{ color: "var(--cr-dark)" }}>
              Deliverable minutes by day
            </h3>
            <p className="mb-4 text-xs text-muted-foreground">
              {branchId ? "Selected branch" : "First branch shown"} — the room/doctor bottleneck each day this
              month.
            </p>
            <BarChart data={dayBars} valueLabel="min" height={200} />
          </div>

          <div
            className="rounded-[32px] border p-6 shadow-sm"
            style={{ backgroundColor: "var(--cr-white)", borderColor: "var(--cr-divider)" }}
          >
            <h3 className="mb-4 text-lg font-semibold" style={{ color: "var(--cr-dark)" }}>
              By branch
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--cr-divider)] text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    <th className="px-4 py-3 text-left">Branch</th>
                    <th className="px-4 py-3 text-right">Utilization</th>
                    <th className="px-4 py-3 text-right">Booked</th>
                    <th className="px-4 py-3 text-right">Capacity</th>
                    <th className="px-4 py-3 text-right">No-Show Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--cr-divider)]">
                  {data.byBranch.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                        No branch data for this month.
                      </td>
                    </tr>
                  ) : (
                    data.byBranch.map((b) => (
                      <tr key={b.branchId}>
                        <td className="px-4 py-3 font-semibold text-[var(--cr-dark)]">{b.branchName}</td>
                        <td className="px-4 py-3 text-right text-[var(--cr-dark)]">{pct(b.utilization)}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{hours(b.bookedMinutes)}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{hours(b.bottleneckMinutes)}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{pct(b.noShowRate)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
