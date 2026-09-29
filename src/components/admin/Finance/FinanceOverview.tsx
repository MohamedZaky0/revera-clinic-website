"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import { StatTile } from "./charts";

export interface BranchOption {
  id: string;
  name_en: string;
  name_ar?: string;
}

interface FinanceOverviewProps {
  accessToken?: string;
  lang?: "en" | "ar";
  branches?: BranchOption[];
}

interface PnlResponse {
  revenue: { total: number };
  cogs: { partiallyCosted: boolean };
  commission: { partiallyCommissioned: boolean };
  fixedOverhead: { expenses: { total: number } };
  views: { contributionMargin: { value: number }; fullyLoadedProfit: { value: number } };
}

interface RevenueBridgeResponse {
  cashReceived: number;
}

interface CashFlowResponse {
  netCashFlow: number;
}

interface ReceivablesAgingResponse {
  totalOutstanding: number;
}

interface DeferredPackagesResponse {
  total: number;
  pending: { count: number };
}

interface AssetsResponse {
  [key: string]: any;
}

interface LoansResponse {
  [key: string]: any;
}

type FetchResult<T> = { success: true; data: T } | { success: false; status?: number };

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatEgp(value: number, lang: "en" | "ar" = "en"): string {
  const formatted = value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return lang === "ar" ? `${formatted} ج.م` : `EGP ${formatted}`;
}

export function FinanceOverview({ accessToken, lang = "en", branches = [] }: FinanceOverviewProps) {
  const isAr = lang === "ar";
  const [period, setPeriod] = useState(currentPeriod());
  const [branchId, setBranchId] = useState("");

  const [revenue, setRevenue] = useState<FetchResult<PnlResponse>>({ success: false });
  const [cashReceived, setCashReceived] = useState<FetchResult<RevenueBridgeResponse>>({ success: false });
  const [cashFlow, setCashFlow] = useState<FetchResult<CashFlowResponse>>({ success: false });
  const [receivables, setReceivables] = useState<FetchResult<ReceivablesAgingResponse>>({ success: false });
  const [deferred, setDeferred] = useState<FetchResult<DeferredPackagesResponse>>({ success: false });
  const [assets, setAssets] = useState<FetchResult<AssetsResponse>>({ success: false });
  const [loans, setLoans] = useState<FetchResult<LoansResponse>>({ success: false });
  const [loading, setLoading] = useState(true);

  const headers = useMemo(
    () => (accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined),
    [accessToken]
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const baseParams = new URLSearchParams({ period });
        if (branchId) baseParams.set("branchId", branchId);

        const results = await Promise.allSettled([
          fetch(`/api/finance/pnl?${baseParams}`, { headers, cache: "no-store" }).then(async (res) => {
            const json = await res.json().catch(() => ({}));
            if (!res.ok) return { success: false as const, status: res.status };
            return { success: true as const, data: json as PnlResponse };
          }),
          fetch(`/api/finance/revenue-bridge?${baseParams}`, { headers, cache: "no-store" }).then(async (res) => {
            const json = await res.json().catch(() => ({}));
            if (!res.ok) return { success: false as const, status: res.status };
            return { success: true as const, data: json as RevenueBridgeResponse };
          }),
          fetch(`/api/finance/cashflow?${baseParams}`, { headers, cache: "no-store" }).then(async (res) => {
            const json = await res.json().catch(() => ({}));
            if (!res.ok) return { success: false as const, status: res.status };
            return { success: true as const, data: json as CashFlowResponse };
          }),
          fetch(`/api/finance/receivables-aging?branchId=${branchId}`, { headers, cache: "no-store" }).then(async (res) => {
            const json = await res.json().catch(() => ({}));
            if (!res.ok) return { success: false as const, status: res.status };
            return { success: true as const, data: json as ReceivablesAgingResponse };
          }),
          fetch("/api/finance/deferred-packages", { headers, cache: "no-store" }).then(async (res) => {
            const json = await res.json().catch(() => ({}));
            if (!res.ok) return { success: false as const, status: res.status };
            return { success: true as const, data: json as DeferredPackagesResponse };
          }),
          fetch("/api/assets", { headers, cache: "no-store" }).then(async (res) => {
            const json = await res.json().catch(() => ({}));
            if (!res.ok) return { success: false as const, status: res.status };
            return { success: true as const, data: json as AssetsResponse };
          }),
          fetch("/api/loans", { headers, cache: "no-store" }).then(async (res) => {
            const json = await res.json().catch(() => ({}));
            if (!res.ok) return { success: false as const, status: res.status };
            return { success: true as const, data: json as LoansResponse };
          }),
        ]);

        if (!cancelled) {
          setRevenue(results[0].status === "fulfilled" ? results[0].value : { success: false });
          setCashReceived(results[1].status === "fulfilled" ? results[1].value : { success: false });
          setCashFlow(results[2].status === "fulfilled" ? results[2].value : { success: false });
          setReceivables(results[3].status === "fulfilled" ? results[3].value : { success: false });
          setDeferred(results[4].status === "fulfilled" ? results[4].value : { success: false });
          setAssets(results[5].status === "fulfilled" ? results[5].value : { success: false });
          setLoans(results[6].status === "fulfilled" ? results[6].value : { success: false });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [period, branchId, headers]);

  const totalAssets = useMemo(() => {
    if (!assets.success) return 0;
    return Array.isArray(assets.data) ? assets.data.reduce((s: number, a: any) => s + Number(a.cost || 0), 0) : 0;
  }, [assets]);

  const totalLoans = useMemo(() => {
    if (!loans.success) return 0;
    return Array.isArray(loans.data) ? loans.data.reduce((s: number, l: any) => s + Number(l.principal || 0), 0) : 0;
  }, [loans]);

  const labels = {
    month: isAr ? "الشهر" : "Month",
    branch: isAr ? "الفرع" : "Branch",
    allBranches: isAr ? "جميع الفروع" : "All branches",
    revenueEarned: isAr ? "الإيراد المكتسب" : "Revenue earned",
    cashReceived: isAr ? "الكاش المستلم" : "Cash received",
    contributionMargin: isAr ? "هامش المساهمة" : "Contribution margin",
    profitAfterOverheads: isAr ? "الربح بعد المصروفات الثابتة" : "Profit after overheads",
    expensesThisMonth: isAr ? "مصروفات الشهر" : "Expenses this month",
    netCashFlow: isAr ? "صافي التدفق النقدي" : "Net cash flow",
    owedByPatients: isAr ? "مديونيات المرضى" : "Owed by patients",
    deferredPackages: isAr ? "باقات مدفوعة لم تُقدَّم بعد" : "Prepaid packages not yet delivered",
    totalAssetCost: isAr ? "إجمالي تكلفة الأصول" : "Total asset cost",
    totalLoans: isAr ? "إجمالي القروض" : "Total loans",
    noExpensesThisMonth: isAr
      ? "لا توجد مصروفات مسجلة هذا الشهر"
      : "No expenses recorded this month",
    profitOverstated: isAr
      ? "بعض المبيعات بدون تكلفة مسجلة — الربح أعلى من الحقيقي"
      : "Some sales have no cost recorded yet — profit is overstated",
    pendingPackages: isAr
      ? "باقة بدون سعر مؤكد وغير محسوبة"
      : "packages have no confirmed price and are not counted",
  };

  // Only hide PnL tiles if we got a 403 (permission denied). Show them with values if 200, or with "—" if error.
  const pnlPermissionDenied = !revenue.success && revenue.status === 403;

  return (
    <div className="space-y-6" dir={isAr ? "rtl" : "ltr"}>
      {/* Month and Branch Selectors */}
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="overview-month" className="mb-1 block text-xs font-semibold text-muted-foreground">{labels.month}</label>
          <input
            id="overview-month"
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-xl border border-[var(--cr-primary)]/15 bg-white px-3 py-2.5 text-sm text-[var(--cr-dark)] outline-none focus:border-[var(--cr-accent)]"
          />
        </div>
        <div>
          <label htmlFor="overview-branch" className="mb-1 block text-xs font-semibold text-muted-foreground">{labels.branch}</label>
          <select
            id="overview-branch"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="rounded-xl border border-[var(--cr-primary)]/15 bg-white px-3 py-2.5 text-sm text-[var(--cr-dark)] outline-none focus:border-[var(--cr-accent)]"
          >
            <option value="">{labels.allBranches}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {isAr ? b.name_ar || b.name_en : b.name_en}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-muted-foreground">
          {isAr ? "جاري التحميل..." : "Loading overview..."}
        </div>
      ) : (
        <>
          {/* Main stat tiles row */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Revenue earned - only show if no 403 */}
            {!pnlPermissionDenied && (
              <StatTile
                label={labels.revenueEarned}
                value={revenue.success ? formatEgp(revenue.data.revenue.total, lang) : "—"}
                accent="accent"
              />
            )}

            {/* Cash received */}
            {!cashReceived.success && cashReceived.status === 403 ? null : (
              <StatTile
                label={labels.cashReceived}
                value={cashReceived.success ? formatEgp(cashReceived.data.cashReceived, lang) : "—"}
                accent="accent"
              />
            )}

            {/* Contribution margin - only show if no 403 */}
            {!pnlPermissionDenied && (
              <StatTile
                label={labels.contributionMargin}
                value={revenue.success ? formatEgp(revenue.data.views.contributionMargin.value, lang) : "—"}
              />
            )}

            {/* Profit after overheads - only show if no 403 */}
            {!pnlPermissionDenied && (
              <StatTile
                label={labels.profitAfterOverheads}
                value={revenue.success ? formatEgp(revenue.data.views.fullyLoadedProfit.value, lang) : "—"}
              />
            )}
          </div>

          {/* Conditional warnings/messages under Profit after overheads */}
          {!pnlPermissionDenied && revenue.success && (
            <>
              {(revenue.data.cogs.partiallyCosted || revenue.data.commission.partiallyCommissioned) && (
                <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-4 text-sm font-medium text-amber-800">
                  <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                  <span>{labels.profitOverstated}</span>
                </div>
              )}
              {revenue.data.fixedOverhead.expenses.total === 0 && (
                <div className="rounded-xl bg-blue-50 p-4 text-sm font-medium text-blue-800">
                  {labels.noExpensesThisMonth}
                </div>
              )}
            </>
          )}

          {/* Second row: Expenses, Net Cash Flow, Receivables, Deferred */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Expenses this month - only show if no 403 */}
            {!pnlPermissionDenied && (
              <StatTile
                label={labels.expensesThisMonth}
                value={revenue.success ? formatEgp(revenue.data.fixedOverhead.expenses.total, lang) : "—"}
              />
            )}

            {/* Net cash flow */}
            {!cashFlow.success && cashFlow.status === 403 ? null : (
              <StatTile
                label={labels.netCashFlow}
                value={cashFlow.success ? formatEgp(cashFlow.data.netCashFlow, lang) : "—"}
              />
            )}

            {/* Owed by patients */}
            {!receivables.success && receivables.status === 403 ? null : (
              <StatTile
                label={labels.owedByPatients}
                value={receivables.success ? formatEgp(receivables.data.totalOutstanding, lang) : "—"}
              />
            )}

            {/* Prepaid packages not yet delivered */}
            {!deferred.success && deferred.status === 403 ? null : (
              <StatTile
                label={labels.deferredPackages}
                value={deferred.success ? formatEgp(deferred.data.total, lang) : "—"}
              />
            )}
          </div>

          {/* Conditional message under Prepaid packages */}
          {deferred.success && deferred.data.pending.count > 0 && (
            <div className="rounded-xl bg-blue-50 p-4 text-sm font-medium text-blue-800">
              {deferred.data.pending.count} {labels.pendingPackages}
            </div>
          )}

          {/* Third row: Total Asset Cost and Total Loans (all-time) */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
            {/* A failed load shows "—", a 403 hides the tile — never a fabricated 0. */}
            {!assets.success && assets.status === 403 ? null : (
              <StatTile label={labels.totalAssetCost} value={assets.success ? formatEgp(totalAssets, lang) : "—"} />
            )}
            {!loans.success && loans.status === 403 ? null : (
              <StatTile label={labels.totalLoans} value={loans.success ? formatEgp(totalLoans, lang) : "—"} />
            )}
          </div>
        </>
      )}
    </div>
  );
}
