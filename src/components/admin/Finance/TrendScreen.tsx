"use client";

import { useEffect, useMemo, useState } from "react";
import { LineChart as LineChartIcon, AlertCircle } from "lucide-react";
import { StatTile, LineAreaChart } from "./charts";

export interface BranchOption {
  id: string;
  name_en: string;
  name_ar?: string;
}

interface MonthRow {
  period: string;
  revenue: number;
  cogs: number;
  commission: number;
  fixedOverhead: number;
  contributionMargin: number;
  fullyLoadedProfit: number;
}

interface TrendResponse {
  branchId: string | null;
  months: MonthRow[];
}

interface TrendScreenProps {
  accessToken?: string;
  branches?: BranchOption[];
}

function egp(n: number): string {
  return `EGP ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function monthLabel(period: string): string {
  const [y, m] = period.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(undefined, { month: "short", year: "2-digit", timeZone: "UTC" });
}

export function TrendScreen({ accessToken, branches = [] }: TrendScreenProps) {
  const [months, setMonths] = useState(6);
  const [branchId, setBranchId] = useState("");
  const [data, setData] = useState<TrendResponse | null>(null);
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
        const params = new URLSearchParams({ months: String(months) });
        if (branchId) params.set("branchId", branchId);
        const res = await fetch(`/api/finance/trend?${params}`, { headers, cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "Unable to load trend.");
        if (!cancelled) setData(json);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Failed to load trend.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [months, branchId, headers]);

  const revenueSeries = useMemo(
    () => (data?.months || []).map((m) => ({ label: monthLabel(m.period), value: m.revenue })),
    [data]
  );
  const profitSeries = useMemo(
    () => (data?.months || []).map((m) => ({ label: monthLabel(m.period), value: m.fullyLoadedProfit })),
    [data]
  );

  const latest = data?.months[data.months.length - 1];
  const previous = data?.months[data.months.length - 2];
  const revenueChangePct =
    latest && previous && previous.revenue !== 0 ? round1(((latest.revenue - previous.revenue) / previous.revenue) * 100) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">Months</label>
          <select
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            className="rounded-xl border border-[var(--cr-primary)]/15 bg-white px-3 py-2.5 text-sm text-[var(--cr-dark)] outline-none focus:border-[var(--cr-accent)]"
          >
            {[3, 6, 12, 24].map((n) => (
              <option key={n} value={n}>
                Last {n} months
              </option>
            ))}
          </select>
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
          <div className="grid gap-6 sm:grid-cols-3">
            <StatTile label="This Month's Revenue" value={latest ? egp(latest.revenue) : "—"} icon={<LineChartIcon size={18} />} accent="accent" />
            <StatTile label="This Month's Fully-Loaded Profit" value={latest ? egp(latest.fullyLoadedProfit) : "—"} icon={<LineChartIcon size={18} />} />
            <StatTile
              label="Revenue vs Last Month"
              value={revenueChangePct === null ? "—" : `${revenueChangePct > 0 ? "+" : ""}${revenueChangePct}%`}
              icon={<LineChartIcon size={18} />}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div
              className="rounded-[32px] border p-6 shadow-sm"
              style={{ backgroundColor: "var(--cr-white)", borderColor: "var(--cr-divider)" }}
            >
              <h3 className="mb-4 text-lg font-semibold" style={{ color: "var(--cr-dark)" }}>
                Revenue over time
              </h3>
              <LineAreaChart data={revenueSeries} valueLabel="EGP" height={260} />
            </div>
            <div
              className="rounded-[32px] border p-6 shadow-sm"
              style={{ backgroundColor: "var(--cr-white)", borderColor: "var(--cr-divider)" }}
            >
              <h3 className="mb-4 text-lg font-semibold" style={{ color: "var(--cr-dark)" }}>
                Fully-loaded profit over time
              </h3>
              <LineAreaChart data={profitSeries} valueLabel="EGP" height={260} color="var(--cr-accent)" />
            </div>
          </div>

          <div
            className="rounded-[32px] border p-6 shadow-sm"
            style={{ backgroundColor: "var(--cr-white)", borderColor: "var(--cr-divider)" }}
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--cr-divider)] bg-[var(--cr-divider)] text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    <th className="px-6 py-4 text-left">Month</th>
                    <th className="px-6 py-4 text-right">Revenue</th>
                    <th className="px-6 py-4 text-right">Overhead</th>
                    <th className="px-6 py-4 text-right">Contribution Margin</th>
                    <th className="px-6 py-4 text-right">Fully-Loaded Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--cr-divider)] text-[var(--cr-primary)]">
                  {data.months.map((m) => (
                    <tr key={m.period} className="transition hover:bg-[var(--cr-divider)]">
                      <td className="px-6 py-4 font-semibold text-[var(--cr-dark)]">{monthLabel(m.period)}</td>
                      <td className="px-6 py-4 text-right text-[var(--cr-dark)]">{egp(m.revenue)}</td>
                      <td className="px-6 py-4 text-right text-muted-foreground">{egp(m.fixedOverhead)}</td>
                      <td
                        className="px-6 py-4 text-right font-semibold"
                        style={{ color: m.contributionMargin >= 0 ? "var(--cr-success)" : "var(--cr-error)" }}
                      >
                        {egp(m.contributionMargin)}
                      </td>
                      <td
                        className="px-6 py-4 text-right font-semibold"
                        style={{ color: m.fullyLoadedProfit >= 0 ? "var(--cr-success)" : "var(--cr-error)" }}
                      >
                        {egp(m.fullyLoadedProfit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
