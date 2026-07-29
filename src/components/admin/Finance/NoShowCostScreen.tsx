"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarX, AlertCircle, Info } from "lucide-react";
import { StatTile, BarChart } from "./charts";

export interface BranchOption {
  id: string;
  name_en: string;
  name_ar?: string;
}

interface StatusBucket {
  count: number;
  estimatedLostRevenue: number;
}

interface NoShowCostResponse {
  range: { label: string; from: string; to: string };
  branchId: string | null;
  totalCount: number;
  totalEstimatedLostRevenue: number;
  byStatus: { no_show: StatusBucket; cancelled: StatusBucket; postponed: StatusBucket };
  byBranch: Array<{ branchId: string | null; branchName: string; count: number; estimatedLostRevenue: number }>;
}

interface NoShowCostScreenProps {
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

const STATUS_LABELS: Record<string, string> = {
  no_show: "No-shows",
  cancelled: "Cancelled",
  postponed: "Postponed",
};

export function NoShowCostScreen({ accessToken, branches = [] }: NoShowCostScreenProps) {
  const [period, setPeriod] = useState(currentPeriod());
  const [branchId, setBranchId] = useState("");
  const [data, setData] = useState<NoShowCostResponse | null>(null);
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
        const res = await fetch(`/api/finance/no-show-cost?${params}`, { headers, cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "Unable to load no-show cost.");
        if (!cancelled) setData(json);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Failed to load no-show cost.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [period, branchId, headers]);

  const statusBars = useMemo(() => {
    if (!data) return [];
    return (["no_show", "cancelled", "postponed"] as const)
      .map((s) => ({ label: STATUS_LABELS[s], value: data.byStatus[s].estimatedLostRevenue }))
      .filter((b) => b.value > 0);
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

      <div className="flex items-start gap-2 rounded-xl bg-blue-50 p-4 text-sm text-blue-900">
        <Info size={18} className="mt-0.5 flex-shrink-0" />
        <span>
          <strong>Estimated</strong> — based on today&apos;s list price for the booked service(s), not a
          stored record of what would have been charged. Use this to judge whether a deposit policy is worth
          it, not as an accounting figure.
        </span>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-muted-foreground">Loading...</div>
      ) : data ? (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="Bookings Lost"
              value={data.totalCount.toString()}
              icon={<CalendarX size={18} />}
              accent="accent"
            />
            <StatTile label="Estimated Revenue Lost" value={egp(data.totalEstimatedLostRevenue)} icon={<CalendarX size={18} />} />
            <StatTile label="No-shows" value={`${data.byStatus.no_show.count} (${egp(data.byStatus.no_show.estimatedLostRevenue)})`} />
            <StatTile label="Cancelled" value={`${data.byStatus.cancelled.count} (${egp(data.byStatus.cancelled.estimatedLostRevenue)})`} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div
              className="rounded-[32px] border p-6 shadow-sm"
              style={{ backgroundColor: "var(--cr-white)", borderColor: "var(--cr-divider)" }}
            >
              <h3 className="mb-4 text-lg font-semibold" style={{ color: "var(--cr-dark)" }}>
                Lost revenue by reason
              </h3>
              <BarChart data={statusBars} valueLabel="EGP" height={220} />
            </div>
            <div
              className="rounded-[32px] border p-6 shadow-sm"
              style={{ backgroundColor: "var(--cr-white)", borderColor: "var(--cr-divider)" }}
            >
              <h3 className="mb-4 text-lg font-semibold" style={{ color: "var(--cr-dark)" }}>
                By branch
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[400px] text-sm">
                  <thead>
                    <tr className="border-b border-[var(--cr-divider)] text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      <th className="px-4 py-3 text-left">Branch</th>
                      <th className="px-4 py-3 text-right">Count</th>
                      <th className="px-4 py-3 text-right">Estimated Loss</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--cr-divider)]">
                    {data.byBranch.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                          No lost bookings this month.
                        </td>
                      </tr>
                    ) : (
                      data.byBranch.map((b) => (
                        <tr key={b.branchId || "unattributed"}>
                          <td className="px-4 py-3 font-semibold text-[var(--cr-dark)]">{b.branchName}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{b.count}</td>
                          <td className="px-4 py-3 text-right text-[var(--cr-dark)]">{egp(b.estimatedLostRevenue)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
