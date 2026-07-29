"use client";

import { useEffect, useMemo, useState } from "react";
import { UserPlus, Users2, AlertCircle, Info } from "lucide-react";
import { StatTile, BarChart } from "./charts";

export interface BranchOption {
  id: string;
  name_en: string;
  name_ar?: string;
}

interface NewVsReturningResponse {
  range: { label: string; from: string; to: string };
  branchId: string | null;
  new: { revenue: number; customerCount: number };
  returning: { revenue: number; customerCount: number };
  walkIn: { revenue: number; note: string };
}

interface NewVsReturningScreenProps {
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

export function NewVsReturningScreen({ accessToken, branches = [] }: NewVsReturningScreenProps) {
  const [period, setPeriod] = useState(currentPeriod());
  const [branchId, setBranchId] = useState("");
  const [data, setData] = useState<NewVsReturningResponse | null>(null);
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
        const res = await fetch(`/api/finance/new-vs-returning?${params}`, { headers, cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "Unable to load new vs returning revenue.");
        if (!cancelled) setData(json);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Failed to load new vs returning revenue.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [period, branchId, headers]);

  const bars = useMemo(() => {
    if (!data) return [];
    return [
      { label: "New patients", value: data.new.revenue },
      { label: "Returning patients", value: data.returning.revenue },
    ];
  }, [data]);

  const totalRevenue = (data?.new.revenue || 0) + (data?.returning.revenue || 0) + (data?.walkIn.revenue || 0);
  const newSharePct = totalRevenue > 0 ? Math.round(((data?.new.revenue || 0) / totalRevenue) * 100) : null;

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
          A patient counts as <strong>new</strong> if their very first invoice with the clinic falls in this
          month. Anyone who visited before, even a long time ago, counts as <strong>returning</strong>.
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
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <StatTile
              label="New Patients"
              value={`${egp(data.new.revenue)} (${data.new.customerCount})`}
              icon={<UserPlus size={18} />}
              accent="accent"
            />
            <StatTile
              label="Returning Patients"
              value={`${egp(data.returning.revenue)} (${data.returning.customerCount})`}
              icon={<Users2 size={18} />}
            />
            <StatTile
              label="Share From New Patients"
              value={newSharePct === null ? "—" : `${newSharePct}%`}
              icon={<UserPlus size={18} />}
            />
          </div>

          <div
            className="rounded-[32px] border p-6 shadow-sm"
            style={{ backgroundColor: "var(--cr-white)", borderColor: "var(--cr-divider)" }}
          >
            <h3 className="mb-4 text-lg font-semibold" style={{ color: "var(--cr-dark)" }}>
              Revenue: new vs. returning
            </h3>
            <BarChart data={bars} valueLabel="EGP" height={220} />
            {data.walkIn.revenue > 0 && (
              <p className="mt-4 text-xs text-muted-foreground">
                {egp(data.walkIn.revenue)} not shown above — {data.walkIn.note}
              </p>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
