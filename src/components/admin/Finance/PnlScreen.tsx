"use client";

import { useEffect, useMemo, useState } from "react";
import { TrendingUp, DollarSign, Package, Receipt, AlertCircle } from "lucide-react";
import { StatTile, BarChart } from "./charts";

export interface BranchOption {
  id: string;
  name_en: string;
  name_ar?: string;
}

interface CategoryAmount {
  category: string;
  amount: number;
}

interface PnlResponse {
  range: { label: string; from: string; to: string };
  branchId: string | null;
  revenue: {
    total: number;
    services: { total: number; byCategory: CategoryAmount[] };
    products: { total: number; byCategory: CategoryAmount[] };
    packageRecognised: number;
  };
  cogs: { total: number; costedLineCount: number; uncostedLineCount: number; partiallyCosted: boolean };
  commission: {
    total: number;
    commissionedLineCount: number;
    uncommissionedLineCount: number;
    partiallyCommissioned: boolean;
  };
  fixedOverhead: {
    total: number;
    expenses: { total: number; byCategory: CategoryAmount[] };
    depreciation: number;
    loanInterest: number;
    loanInterestExcluded: boolean;
  };
  views: {
    contributionMargin: { value: number; formula: string; label: string };
    fullyLoadedProfit: { value: number; formula: string; label: string };
  };
}

interface PnlScreenProps {
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

export function PnlScreen({ accessToken, branches = [] }: PnlScreenProps) {
  const [period, setPeriod] = useState(currentPeriod());
  const [branchId, setBranchId] = useState("");
  const [data, setData] = useState<PnlResponse | null>(null);
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
        const res = await fetch(`/api/finance/pnl?${params}`, { headers, cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "Unable to load P&L.");
        if (!cancelled) setData(json);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Failed to load P&L.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [period, branchId, headers]);

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
        <div className="p-12 text-center text-muted-foreground">Loading P&L...</div>
      ) : data ? (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <StatTile label="Total Revenue" value={egp(data.revenue.total)} icon={<DollarSign size={18} />} accent="accent" />
            <StatTile label="Cost of Materials & Devices" value={egp(data.cogs.total)} icon={<Package size={18} />} />
            <StatTile label="Doctor Commission" value={egp(data.commission.total)} icon={<Receipt size={18} />} />
          </div>

          {(data.cogs.partiallyCosted || data.commission.partiallyCommissioned) && (
            <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-4 text-sm font-medium text-amber-800">
              <AlertCircle size={18} />
              {data.cogs.uncostedLineCount + data.commission.uncommissionedLineCount > 0 &&
                `Some sales aren't costed yet (${data.cogs.uncostedLineCount} without a material/device cost, ${data.commission.uncommissionedLineCount} without a commission figure) — the numbers above may understate true cost.`}
            </div>
          )}

          <div
            className="grid gap-6 rounded-[32px] border p-6 shadow-sm sm:grid-cols-2"
            style={{ backgroundColor: "var(--cr-white)", borderColor: "var(--cr-divider)" }}
          >
            <div>
              <div className="mb-1 flex items-center gap-2">
                <TrendingUp size={18} style={{ color: "var(--cr-accent)" }} />
                <h3 className="text-lg font-semibold" style={{ color: "var(--cr-dark)" }}>
                  {egp(data.views.contributionMargin.value)}
                </h3>
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Contribution Margin — use this for decisions
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Revenue minus materials, devices and doctor commission. What each sale actually contributes
                before overhead like rent — the number to use for pricing and service-mix decisions.
              </p>
            </div>
            <div>
              <div className="mb-1 flex items-center gap-2">
                <TrendingUp size={18} style={{ color: "var(--cr-primary)" }} />
                <h3 className="text-lg font-semibold" style={{ color: "var(--cr-dark)" }}>
                  {egp(data.views.fullyLoadedProfit.value)}
                </h3>
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Fully-Loaded Profit — full picture, not for pricing
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Contribution margin minus rent, depreciation and loan interest for the period. The true
                bottom line — useful for "are we actually profitable," not for pricing one service.
                {data.fixedOverhead.loanInterestExcluded &&
                  " Loan interest isn't shown for a single branch — loans aren't tracked per branch."}
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div
              className="rounded-[32px] border p-6 shadow-sm"
              style={{ backgroundColor: "var(--cr-white)", borderColor: "var(--cr-divider)" }}
            >
              <h3 className="mb-1 text-lg font-semibold" style={{ color: "var(--cr-dark)" }}>
                Where the money came from
              </h3>
              <p className="mb-4 text-xs text-muted-foreground">
                Services {egp(data.revenue.services.total)} · Products {egp(data.revenue.products.total)} · Package
                sessions delivered {egp(data.revenue.packageRecognised)}
              </p>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Services by category</p>
              <BarChart
                data={data.revenue.services.byCategory.map((c) => ({ label: c.category, value: c.amount }))}
                valueLabel="EGP"
                height={180}
              />
              <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Products by category</p>
              <BarChart
                data={data.revenue.products.byCategory.map((c) => ({ label: c.category, value: c.amount }))}
                valueLabel="EGP"
                height={180}
              />
            </div>
            <div
              className="rounded-[32px] border p-6 shadow-sm"
              style={{ backgroundColor: "var(--cr-white)", borderColor: "var(--cr-divider)" }}
            >
              <h3 className="mb-1 text-lg font-semibold" style={{ color: "var(--cr-dark)" }}>
                Where the money went (overhead)
              </h3>
              <p className="mb-4 text-xs text-muted-foreground">
                Total {egp(data.fixedOverhead.total)} · Depreciation {egp(data.fixedOverhead.depreciation)} · Loan
                interest {data.fixedOverhead.loanInterestExcluded ? "not shown for this branch" : egp(data.fixedOverhead.loanInterest)}
              </p>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Expenses by category</p>
              <BarChart
                data={data.fixedOverhead.expenses.byCategory.map((c) => ({ label: c.category, value: c.amount }))}
                valueLabel="EGP"
                height={180}
                color="var(--cr-primary)"
              />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
