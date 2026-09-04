"use client";

import { useEffect, useMemo, useState } from "react";
import { Target, AlertCircle, AlertTriangle } from "lucide-react";
import { StatTile } from "./charts";

export interface BranchOption {
  id: string;
  name_en: string;
  name_ar?: string;
}

interface BudgetItem {
  budgetLineId: string;
  categoryId: string;
  categoryName: string;
  branchId: string | null;
  period: string;
  budgeted: number;
  actual: number;
  variance: number;
  status: "under_or_on_budget" | "over_budget";
}

interface UnbudgetedItem {
  categoryId: string;
  categoryName: string;
  actual: number;
}

interface BudgetVsActualResponse {
  period: string;
  branchId: string | null;
  items: BudgetItem[];
  unbudgeted: UnbudgetedItem[];
}

interface BudgetVsActualScreenProps {
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

export function BudgetVsActualScreen({ accessToken, branches = [] }: BudgetVsActualScreenProps) {
  const [period, setPeriod] = useState(currentPeriod());
  const [branchId, setBranchId] = useState("");
  const [data, setData] = useState<BudgetVsActualResponse | null>(null);
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
        const res = await fetch(`/api/finance/budget-vs-actual?${params}`, { headers, cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "Unable to load budget vs actual.");
        if (!cancelled) setData(json);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Failed to load budget vs actual.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [period, branchId, headers]);

  const totals = useMemo(() => {
    const items = data?.items || [];
    return {
      budgeted: items.reduce((s, i) => s + i.budgeted, 0),
      actual: items.reduce((s, i) => s + i.actual, 0),
      overBudgetCount: items.filter((i) => i.status === "over_budget").length,
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

      {loading ? (
        <div className="p-12 text-center text-muted-foreground">Loading...</div>
      ) : data ? (
        <>
          <div className="grid gap-6 sm:grid-cols-3">
            <StatTile label="Total Budgeted" value={egp(totals.budgeted)} icon={<Target size={18} />} accent="accent" />
            <StatTile label="Total Actual" value={egp(totals.actual)} icon={<Target size={18} />} />
            <StatTile label="Categories Over Budget" value={totals.overBudgetCount.toString()} icon={<AlertTriangle size={18} />} />
          </div>

          <div
            className="rounded-[32px] border p-6 shadow-sm"
            style={{ backgroundColor: "var(--cr-white)", borderColor: "var(--cr-divider)" }}
          >
            <h3 className="mb-4 text-lg font-semibold" style={{ color: "var(--cr-dark)" }}>
              Budget vs actual by category
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--cr-divider)] bg-[var(--cr-divider)] text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    <th className="px-6 py-4 text-left">Category</th>
                    <th className="px-6 py-4 text-left">Scope</th>
                    <th className="px-6 py-4 text-right">Budgeted</th>
                    <th className="px-6 py-4 text-right">Actual</th>
                    <th className="px-6 py-4 text-right">Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--cr-divider)] text-[var(--cr-primary)]">
                  {data.items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                        No budgets set for this month.
                      </td>
                    </tr>
                  ) : (
                    data.items.map((item) => (
                      <tr key={item.budgetLineId} className="transition hover:bg-[var(--cr-divider)]">
                        <td className="px-6 py-5 font-semibold text-[var(--cr-dark)]">{item.categoryName}</td>
                        <td className="px-6 py-5 text-muted-foreground">
                          {item.branchId ? branches.find((b) => b.id === item.branchId)?.name_en || "Branch" : "All branches"}
                        </td>
                        <td className="px-6 py-5 text-right text-muted-foreground">{egp(item.budgeted)}</td>
                        <td className="px-6 py-5 text-right text-[var(--cr-dark)]">{egp(item.actual)}</td>
                        <td
                          className="px-6 py-5 text-right font-semibold"
                          style={{ color: item.status === "over_budget" ? "var(--cr-error)" : "var(--cr-success)" }}
                        >
                          {egp(item.variance)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {data.unbudgeted.length > 0 && (
            <div
              className="rounded-[32px] border p-6 shadow-sm"
              style={{ backgroundColor: "var(--cr-white)", borderColor: "var(--cr-divider)" }}
            >
              <h3 className="mb-1 flex items-center gap-2 text-lg font-semibold" style={{ color: "var(--cr-dark)" }}>
                <AlertTriangle size={18} className="text-amber-600" />
                Spent, but no budget set
              </h3>
              <p className="mb-4 text-xs text-muted-foreground">
                These categories had real expenses this month but no budget line to compare against.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px] text-sm">
                  <thead>
                    <tr className="border-b border-[var(--cr-divider)] text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      <th className="px-6 py-3 text-left">Category</th>
                      <th className="px-6 py-3 text-right">Actual Spend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--cr-divider)]">
                    {data.unbudgeted.map((u) => (
                      <tr key={u.categoryId}>
                        <td className="px-6 py-3 font-semibold text-[var(--cr-dark)]">{u.categoryName}</td>
                        <td className="px-6 py-3 text-right text-amber-700">{egp(u.actual)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
