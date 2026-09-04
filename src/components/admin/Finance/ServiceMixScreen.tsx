"use client";

import { useEffect, useMemo, useState } from "react";
import { Target, AlertCircle, Info, TrendingUp, Gauge } from "lucide-react";
import { StatTile, BarChart } from "./charts";

export interface BranchOption {
  id: string;
  name_en: string;
  name_ar?: string;
}

interface RankedService {
  id: number;
  serviceName: string;
  durationMinutes: number;
  price: number;
  revenueTotal: number;
  sessionCount: number;
  cmPerMinute: number;
}

interface ServiceMixResponse {
  range: { label: string; from: string; to: string };
  branchId: string | null;
  note: string;
  breakEven: { value: number | null; fixedOverhead: number; cmRatio: number };
  rankedServices: RankedService[];
  capacity: { bottleneckMinutes: number; undeliveredPackageMinutes: number; sellableMinutes: number; sellableClampedAtZero: boolean };
  allocation: { serviceId: number; sessionsAllocated: number }[];
  maxPotentialRevenue: number;
  actualServiceRevenue: number;
  gapToPotential: number;
  gapDecomposition: {
    idleCapacityValue: number;
    suboptimalMixValue: number;
    noShowLostRevenue: number;
    mixEstimateExceededGap: boolean;
  };
}

interface ServiceMixScreenProps {
  accessToken?: string;
  branches?: BranchOption[];
}

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function egp(n: number): string {
  return `EGP ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function ServiceMixScreen({ accessToken, branches = [] }: ServiceMixScreenProps) {
  const [period, setPeriod] = useState(currentPeriod());
  const [branchId, setBranchId] = useState("");
  const [data, setData] = useState<ServiceMixResponse | null>(null);
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
        const res = await fetch(`/api/finance/service-mix?${params}`, { headers, cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "Unable to load service mix.");
        if (!cancelled) setData(json);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Failed to load service mix.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [period, branchId, headers]);

  const rankBars = useMemo(() => {
    if (!data) return [];
    return data.rankedServices.slice(0, 8).map((s) => ({ label: s.serviceName, value: s.cmPerMinute }));
  }, [data]);

  const gapBars = useMemo(() => {
    if (!data) return [];
    return [
      { label: "Idle capacity", value: data.gapDecomposition.idleCapacityValue },
      { label: "Suboptimal mix", value: data.gapDecomposition.suboptimalMixValue },
      { label: "No-shows/cancellations", value: data.gapDecomposition.noShowLostRevenue },
    ].filter((b) => b.value > 0);
  }, [data]);

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
        <div className="p-12 text-center text-muted-foreground">Loading service mix...</div>
      ) : data ? (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="Break-Even Revenue"
              value={data.breakEven.value === null ? "—" : egp(data.breakEven.value)}
              icon={<Target size={18} />}
              accent="accent"
            />
            <StatTile label="Actual Revenue" value={egp(data.actualServiceRevenue)} icon={<TrendingUp size={18} />} />
            <StatTile label="Max Potential Revenue" value={egp(data.maxPotentialRevenue)} icon={<Gauge size={18} />} />
            <StatTile label="Gap to Potential" value={egp(data.gapToPotential)} />
          </div>

          <div
            className="rounded-[32px] border p-6 shadow-sm"
            style={{ backgroundColor: "var(--cr-white)", borderColor: "var(--cr-divider)" }}
          >
            <h3 className="mb-1 text-lg font-semibold" style={{ color: "var(--cr-dark)" }}>
              Services ranked by value per minute
            </h3>
            <p className="mb-4 text-xs text-muted-foreground">
              Contribution margin per minute of clinic time — not margin percentage. A service that ties up a
              room for hours can rank below a quicker, lower-margin one.
            </p>
            <BarChart data={rankBars} valueLabel="EGP/min" height={220} />
          </div>

          {gapBars.length > 0 && (
            <div
              className="rounded-[32px] border p-6 shadow-sm"
              style={{ backgroundColor: "var(--cr-white)", borderColor: "var(--cr-divider)" }}
            >
              <h3 className="mb-1 text-lg font-semibold" style={{ color: "var(--cr-dark)" }}>
                Where the gap to potential comes from
              </h3>
              <p className="mb-4 text-xs text-muted-foreground">
                An estimate, not an exact accounting split — use it to see what to fix first, not as a precise
                figure.
                {data.gapDecomposition.mixEstimateExceededGap &&
                  " Idle capacity and no-shows alone already explain this month's whole gap — mix isn't the limiting factor right now."}
              </p>
              <BarChart data={gapBars} valueLabel="EGP" height={180} color="var(--cr-primary)" />
            </div>
          )}

          <div
            className="rounded-[32px] border p-6 shadow-sm"
            style={{ backgroundColor: "var(--cr-white)", borderColor: "var(--cr-divider)" }}
          >
            <h3 className="mb-4 text-lg font-semibold" style={{ color: "var(--cr-dark)" }}>
              Services this month
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--cr-divider)] text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    <th className="px-4 py-3 text-left">Service</th>
                    <th className="px-4 py-3 text-right">CM/min</th>
                    <th className="px-4 py-3 text-right">Duration</th>
                    <th className="px-4 py-3 text-right">Sessions</th>
                    <th className="px-4 py-3 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--cr-divider)]">
                  {data.rankedServices.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                        No costed services delivered this month.
                      </td>
                    </tr>
                  ) : (
                    data.rankedServices.map((s) => (
                      <tr key={s.id}>
                        <td className="px-4 py-3 font-semibold text-[var(--cr-dark)]">{s.serviceName}</td>
                        <td className="px-4 py-3 text-right text-[var(--cr-dark)]">{egp(s.cmPerMinute)}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{s.durationMinutes} min</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{s.sessionCount}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{egp(s.revenueTotal)}</td>
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
