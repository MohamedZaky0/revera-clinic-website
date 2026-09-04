"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, AlertCircle, Search } from "lucide-react";
import { StatTile } from "./charts";

export interface BranchOption {
  id: string;
  name_en: string;
  name_ar?: string;
}

interface ServiceMarginRow {
  serviceId: number;
  serviceName: string;
  durationMinutes: number;
  durationIsFallback: boolean;
  sessionCount: number;
  costedSessionCount: number;
  partiallyCosted: boolean;
  revenueTotal: number;
  contributionMarginTotal: number;
  contributionMarginPerSession: number | null;
  cmPerMinute: number | null;
}

interface ServiceMarginResponse {
  range: { label: string; from: string; to: string };
  branchId: string | null;
  services: ServiceMarginRow[];
}

interface ServiceMarginScreenProps {
  accessToken?: string;
  branches?: BranchOption[];
}

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function egp(n: number | null): string {
  if (n === null) return "—";
  return `EGP ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function ServiceMarginScreen({ accessToken, branches = [] }: ServiceMarginScreenProps) {
  const [period, setPeriod] = useState(currentPeriod());
  const [branchId, setBranchId] = useState("");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<ServiceMarginResponse | null>(null);
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
        const res = await fetch(`/api/finance/service-margin?${params}`, { headers, cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "Unable to load service margins.");
        if (!cancelled) setData(json);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Failed to load service margins.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [period, branchId, headers]);

  const filtered = useMemo(() => {
    const rows = data?.services || [];
    const q = search.toLowerCase();
    return rows.filter((r) => r.serviceName.toLowerCase().includes(q));
  }, [data, search]);

  const totals = useMemo(() => {
    const rows = data?.services || [];
    return {
      sessionCount: rows.reduce((s, r) => s + r.sessionCount, 0),
      revenueTotal: rows.reduce((s, r) => s + r.revenueTotal, 0),
      partiallyCostedCount: rows.filter((r) => r.partiallyCosted).length,
    };
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

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-3">
        <StatTile label="Sessions in Range" value={totals.sessionCount.toString()} icon={<Activity size={18} />} accent="accent" />
        <StatTile label="Total Revenue" value={egp(totals.revenueTotal)} icon={<Activity size={18} />} />
        <StatTile label="Services Not Fully Costed" value={totals.partiallyCostedCount.toString()} icon={<AlertCircle size={18} />} />
      </div>

      <div
        className="rounded-[32px] border p-6 shadow-sm"
        style={{ backgroundColor: "var(--cr-white)", borderColor: "var(--cr-divider)" }}
      >
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
            <input
              type="text"
              placeholder="Search services..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-[var(--cr-primary)]/15 bg-white py-3 pl-12 pr-4 text-sm text-[var(--cr-dark)] outline-none transition focus:border-[var(--cr-accent)] focus:ring-2 focus:ring-[var(--cr-accent)]/20"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Sorted by profit-per-minute — the number that tells you which service is worth booking more of.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-[var(--cr-divider)] bg-[var(--cr-divider)] text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                <th className="px-6 py-4 text-left">Service</th>
                <th className="px-6 py-4 text-right">Sessions</th>
                <th className="px-6 py-4 text-right">Revenue</th>
                <th className="px-6 py-4 text-right">Profit / Session</th>
                <th className="px-6 py-4 text-right">Profit / Minute</th>
                <th className="px-6 py-4 text-center">Costing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--cr-divider)] text-[var(--cr-primary)]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    Loading...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    No services with sales in this range.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.serviceId} className="transition hover:bg-[var(--cr-divider)]">
                    <td className="px-6 py-5 font-semibold text-[var(--cr-dark)]">
                      {row.serviceName}
                      <div className="text-xs font-normal text-muted-foreground">
                        {row.durationMinutes} min{row.durationIsFallback ? " (estimated)" : ""}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right text-muted-foreground">{row.sessionCount}</td>
                    <td className="px-6 py-5 text-right text-[var(--cr-dark)]">{egp(row.revenueTotal)}</td>
                    <td
                      className="px-6 py-5 text-right font-semibold"
                      style={{ color: (row.contributionMarginPerSession ?? 0) >= 0 ? "var(--cr-success)" : "var(--cr-error)" }}
                    >
                      {egp(row.contributionMarginPerSession)}
                    </td>
                    <td
                      className="px-6 py-5 text-right font-semibold"
                      style={{ color: (row.cmPerMinute ?? 0) >= 0 ? "var(--cr-success)" : "var(--cr-error)" }}
                    >
                      {egp(row.cmPerMinute)}
                    </td>
                    <td className="px-6 py-5 text-center">
                      {row.partiallyCosted ? (
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                          {row.costedSessionCount}/{row.sessionCount} costed
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                          Fully costed
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
