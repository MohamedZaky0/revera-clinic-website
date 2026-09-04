"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import { BarChart, LineAreaChart, StatTile } from "./charts";

export interface Expense {
  id: string;
  category_id: string;
  branch_id: string | null;
  incurred_on: string;
  amount: number;
  vendor: string | null;
  note: string | null;
  is_recurring: boolean;
}

export interface ExpenseCategory {
  id: string;
  name: string;
}

export interface FixedAsset {
  id: string;
  purchased_on: string;
  cost: number;
  current_book_value?: number;
}

export interface Loan {
  id: string;
  principal: number;
  remaining_balance?: number;
}

interface FinanceOverviewProps {
  accessToken?: string;
}

export function FinanceOverview({ accessToken }: FinanceOverviewProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const headers = useMemo(
    () => (accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined),
    [accessToken]
  );

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [expRes, catRes, assetRes, loanRes] = await Promise.all([
          fetch("/api/expenses", { headers, cache: "no-store" }),
          fetch("/api/expenses/categories", { headers, cache: "no-store" }),
          fetch("/api/assets", { headers, cache: "no-store" }),
          fetch("/api/loans", { headers, cache: "no-store" }),
        ]);
        if (!expRes.ok) throw new Error("Unable to load expenses.");
        if (!catRes.ok) throw new Error("Unable to load expense categories.");
        if (!assetRes.ok) throw new Error("Unable to load assets.");
        if (!loanRes.ok) throw new Error("Unable to load loans.");
        const [expData, catData, assetData, loanData] = await Promise.all([
          expRes.json(),
          catRes.json(),
          assetRes.json(),
          loanRes.json(),
        ]);
        setExpenses(Array.isArray(expData) ? expData : []);
        setCategories(Array.isArray(catData) ? catData : []);
        setAssets(Array.isArray(assetData) ? assetData : []);
        setLoans(Array.isArray(loanData) ? loanData : []);
      } catch (err: any) {
        setError(err?.message || "Failed to load finance overview data.");
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const totalExpensesThisMonth = useMemo(() => {
    const now = new Date();
    const month = now.toISOString().slice(0, 7);
    return expenses
      .filter((e) => e.incurred_on?.startsWith(month))
      .reduce((s, e) => s + Number(e.amount), 0);
  }, [expenses]);

  const totalExpenses = useMemo(
    () => expenses.reduce((s, e) => s + Number(e.amount), 0),
    [expenses]
  );
  const totalAssets = useMemo(
    () => assets.reduce((s, a) => s + Number(a.cost), 0),
    [assets]
  );
  const totalLoans = useMemo(
    () => loans.reduce((s, l) => s + Number(l.principal), 0),
    [loans]
  );

  const expensesByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expenses) {
      map.set(e.category_id, (map.get(e.category_id) || 0) + Number(e.amount));
    }
    return Array.from(map.entries()).map(([id, value]) => ({
      label: categories.find((c) => c.id === id)?.name || "Unknown",
      value,
    }));
  }, [expenses, categories]);

  const assetCostByMonth = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of assets) {
      const month = a.purchased_on?.slice(0, 7) || "Unknown";
      map.set(month, (map.get(month) || 0) + Number(a.cost));
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, value]) => ({ label, value }));
  }, [assets]);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Expenses This Month"
          value={`EGP ${totalExpensesThisMonth.toLocaleString()}`}
          accent="accent"
        />
        <StatTile label="Total Expenses" value={`EGP ${totalExpenses.toLocaleString()}`} />
        <StatTile label="Total Asset Cost" value={`EGP ${totalAssets.toLocaleString()}`} />
        <StatTile label="Total Loans" value={`EGP ${totalLoans.toLocaleString()}`} />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-muted-foreground">Loading overview...</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div
            className="rounded-[32px] border p-6 shadow-sm"
            style={{ backgroundColor: "var(--cr-white)", borderColor: "var(--cr-divider)" }}
          >
            <h3 className="mb-4 text-lg font-semibold" style={{ color: "var(--cr-dark)" }}>
              Expenses by Category
            </h3>
            <BarChart data={expensesByCategory} valueLabel="EGP" />
          </div>
          <div
            className="rounded-[32px] border p-6 shadow-sm"
            style={{ backgroundColor: "var(--cr-white)", borderColor: "var(--cr-divider)" }}
          >
            <h3 className="mb-4 text-lg font-semibold" style={{ color: "var(--cr-dark)" }}>
              Asset Cost by Month
            </h3>
            <LineAreaChart data={assetCostByMonth} valueLabel="EGP" />
          </div>
        </div>
      )}
    </div>
  );
}
