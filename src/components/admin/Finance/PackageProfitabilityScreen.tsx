"use client";

import { useEffect, useMemo, useState } from "react";
import { Gift, AlertCircle, Info } from "lucide-react";
import { StatTile } from "./charts";

interface PackageRow {
  packageId: string;
  packageName: string;
  sessionsDelivered: number;
  uncostedSessionCount: number;
  revenueRecognised: number;
  costToDeliver: number;
  commissionAttributed: number;
  contributionMargin: number;
  soldInRange: { count: number; cash: number };
  outstanding: { activeCustomerPackages: number; deferredLiability: number };
}

interface PackageProfitabilityResponse {
  range: { label: string; from: string; to: string };
  packages: PackageRow[];
}

interface PackageProfitabilityScreenProps {
  accessToken?: string;
}

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function egp(n: number): string {
  return `EGP ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function PackageProfitabilityScreen({ accessToken }: PackageProfitabilityScreenProps) {
  const [period, setPeriod] = useState(currentPeriod());
  const [data, setData] = useState<PackageProfitabilityResponse | null>(null);
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
        const res = await fetch(`/api/finance/package-profitability?period=${period}`, { headers, cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "Unable to load package profitability.");
        if (!cancelled) setData(json);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Failed to load package profitability.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [period, headers]);

  const totals = useMemo(() => {
    const rows = data?.packages || [];
    return {
      revenue: rows.reduce((s, r) => s + r.revenueRecognised, 0),
      margin: rows.reduce((s, r) => s + r.contributionMargin, 0),
      deferredLiability: rows.reduce((s, r) => s + r.outstanding.deferredLiability, 0),
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
      </div>

      <div className="flex items-start gap-2 rounded-xl bg-blue-50 p-4 text-sm text-blue-900">
        <Info size={18} className="mt-0.5 flex-shrink-0" />
        <span>
          <strong>Delivered, not sold.</strong> Revenue and cost here are counted when a session is actually
          used, not when the package is bought — a package sold this month but not yet used shows up under
          &quot;Sold This Month&quot; and &quot;Outstanding&quot; below, not in the margin.
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
          <div className="grid gap-6 sm:grid-cols-3">
            <StatTile label="Revenue Delivered This Month" value={egp(totals.revenue)} icon={<Gift size={18} />} accent="accent" />
            <StatTile label="Total Margin" value={egp(totals.margin)} icon={<Gift size={18} />} />
            <StatTile label="Owed To Customers (Outstanding)" value={egp(totals.deferredLiability)} icon={<Gift size={18} />} />
          </div>

          <div
            className="rounded-[32px] border p-6 shadow-sm"
            style={{ backgroundColor: "var(--cr-white)", borderColor: "var(--cr-divider)" }}
          >
            <h3 className="mb-1 text-lg font-semibold" style={{ color: "var(--cr-dark)" }}>
              Package profitability
            </h3>
            <p className="mb-4 text-xs text-muted-foreground">
              Sorted by margin. &quot;Cost to Deliver&quot; is the real materials/device cost of the sessions
              used this month, from the same costing used everywhere else in Finance.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--cr-divider)] bg-[var(--cr-divider)] text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    <th className="px-6 py-4 text-left">Package</th>
                    <th className="px-6 py-4 text-right">Sessions Used</th>
                    <th className="px-6 py-4 text-right">Revenue Delivered</th>
                    <th className="px-6 py-4 text-right">Cost to Deliver</th>
                    <th className="px-6 py-4 text-right">Margin</th>
                    <th className="px-6 py-4 text-right">Sold This Month</th>
                    <th className="px-6 py-4 text-right">Outstanding (Owed)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--cr-divider)] text-[var(--cr-primary)]">
                  {data.packages.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                        No package sessions delivered or sold this month.
                      </td>
                    </tr>
                  ) : (
                    data.packages.map((row) => (
                      <tr key={row.packageId} className="transition hover:bg-[var(--cr-divider)]">
                        <td className="px-6 py-5 font-semibold text-[var(--cr-dark)]">
                          {row.packageName}
                          {row.uncostedSessionCount > 0 && (
                            <div className="text-xs font-normal text-amber-700">
                              {row.uncostedSessionCount} session(s) not yet costed
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-5 text-right text-muted-foreground">{row.sessionsDelivered}</td>
                        <td className="px-6 py-5 text-right text-[var(--cr-dark)]">{egp(row.revenueRecognised)}</td>
                        <td className="px-6 py-5 text-right text-muted-foreground">{egp(row.costToDeliver)}</td>
                        <td
                          className="px-6 py-5 text-right font-semibold"
                          style={{ color: row.contributionMargin >= 0 ? "var(--cr-success)" : "var(--cr-error)" }}
                        >
                          {egp(row.contributionMargin)}
                        </td>
                        <td className="px-6 py-5 text-right text-muted-foreground">
                          {row.soldInRange.count > 0 ? `${egp(row.soldInRange.cash)} (${row.soldInRange.count})` : "—"}
                        </td>
                        <td className="px-6 py-5 text-right text-muted-foreground">
                          {row.outstanding.activeCustomerPackages > 0
                            ? `${egp(row.outstanding.deferredLiability)} (${row.outstanding.activeCustomerPackages} active)`
                            : "—"}
                        </td>
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
