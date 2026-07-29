"use client";

import { useEffect, useMemo, useState } from "react";
import { Banknote, ArrowDownCircle, ArrowUpCircle, AlertCircle, Info } from "lucide-react";
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

interface CashFlowResponse {
  range: { label: string; from: string; to: string };
  branchId: string | null;
  note: string;
  cashReceived: { total: number; byMethod: Record<string, number> };
  cashPaidOut: {
    total: number;
    expenses: { total: number; byCategory: CategoryAmount[] };
    purchases: number;
    purchasesExcluded: boolean;
    loanInstallments: number;
    loanInstallmentsExcluded: boolean;
  };
  netCashFlow: number;
}

interface CashFlowScreenProps {
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

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  wallet: "Wallet",
  instapay: "InstaPay",
  transfer: "Transfer",
};

export function CashFlowScreen({ accessToken, branches = [] }: CashFlowScreenProps) {
  const [period, setPeriod] = useState(currentPeriod());
  const [branchId, setBranchId] = useState("");
  const [data, setData] = useState<CashFlowResponse | null>(null);
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
        const res = await fetch(`/api/finance/cashflow?${params}`, { headers, cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "Unable to load cash flow.");
        if (!cancelled) setData(json);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Failed to load cash flow.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [period, branchId, headers]);

  const methodBars = useMemo(
    () =>
      Object.entries(data?.cashReceived.byMethod || {})
        .filter(([, v]) => v > 0)
        .map(([label, value]) => ({ label: METHOD_LABELS[label] || label, value })),
    [data]
  );

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
          This is <strong>cash that actually moved</strong> — not the same as revenue on the P&L page. A
          package sale shows up here in full when paid, even though its revenue is recognised gradually as
          sessions are used.
        </span>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-muted-foreground">Loading cash flow...</div>
      ) : data ? (
        <>
          <div className="grid gap-6 sm:grid-cols-3">
            <StatTile label="Cash Received" value={egp(data.cashReceived.total)} icon={<ArrowDownCircle size={18} />} accent="accent" />
            <StatTile label="Cash Paid Out" value={egp(data.cashPaidOut.total)} icon={<ArrowUpCircle size={18} />} />
            <StatTile
              label={`Net Cash Flow (${data.netCashFlow >= 0 ? "cash increased" : "cash decreased"})`}
              value={egp(data.netCashFlow)}
              icon={<Banknote size={18} />}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div
              className="rounded-[32px] border p-6 shadow-sm"
              style={{ backgroundColor: "var(--cr-white)", borderColor: "var(--cr-divider)" }}
            >
              <h3 className="mb-4 text-lg font-semibold" style={{ color: "var(--cr-dark)" }}>
                Cash received, by method
              </h3>
              <BarChart data={methodBars} valueLabel="EGP" height={220} />
            </div>
            <div
              className="rounded-[32px] border p-6 shadow-sm"
              style={{ backgroundColor: "var(--cr-white)", borderColor: "var(--cr-divider)" }}
            >
              <h3 className="mb-1 text-lg font-semibold" style={{ color: "var(--cr-dark)" }}>
                Cash paid out
              </h3>
              <p className="mb-4 text-xs text-muted-foreground">
                Purchases {data.cashPaidOut.purchasesExcluded ? "not shown for this branch" : egp(data.cashPaidOut.purchases)} · Loan
                payments {data.cashPaidOut.loanInstallmentsExcluded ? "not shown for this branch" : egp(data.cashPaidOut.loanInstallments)}
              </p>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Expenses by category</p>
              <BarChart
                data={data.cashPaidOut.expenses.byCategory.map((c) => ({ label: c.category, value: c.amount }))}
                valueLabel="EGP"
                height={200}
                color="var(--cr-primary)"
              />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
