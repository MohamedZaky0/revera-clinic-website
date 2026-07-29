"use client";

import { useEffect, useMemo, useState } from "react";
import { HandCoins, AlertCircle, Info, CheckCircle2, AlertTriangle } from "lucide-react";
import { StatTile } from "./charts";

interface PayoutRow {
  providerId: string;
  providerName: string;
  ledgerCommission: number;
  payroll: { commission: number; status: string; paymentDate: string | null } | null;
  variance: number | null;
  status: "payroll_not_run" | "matches" | "mismatch";
}

interface CommissionPayoutsResponse {
  period: string;
  providers: PayoutRow[];
}

interface CommissionPayoutsScreenProps {
  accessToken?: string;
}

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function egp(n: number): string {
  return `EGP ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function CommissionPayoutsScreen({ accessToken }: CommissionPayoutsScreenProps) {
  const [period, setPeriod] = useState(currentPeriod());
  const [data, setData] = useState<CommissionPayoutsResponse | null>(null);
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
        const res = await fetch(`/api/finance/commission-payouts?period=${period}`, { headers, cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "Unable to load commission payouts.");
        if (!cancelled) setData(json);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Failed to load commission payouts.");
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
    const rows = data?.providers || [];
    return {
      ledgerTotal: rows.reduce((s, r) => s + r.ledgerCommission, 0),
      mismatchCount: rows.filter((r) => r.status === "mismatch").length,
      notRunCount: rows.filter((r) => r.status === "payroll_not_run").length,
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
          Compares what the booking system says each doctor earned this month (&quot;Booking Ledger&quot;)
          against what HR&apos;s payroll run actually recorded for them. A mismatch usually means payroll
          was run before every booking was in, or a booking changed afterward.
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
            <StatTile label="Commission Owed (Booking Ledger)" value={egp(totals.ledgerTotal)} icon={<HandCoins size={18} />} accent="accent" />
            <StatTile label="Doctors With A Mismatch" value={totals.mismatchCount.toString()} icon={<AlertTriangle size={18} />} />
            <StatTile label="Payroll Not Run Yet" value={totals.notRunCount.toString()} icon={<AlertTriangle size={18} />} />
          </div>

          <div
            className="rounded-[32px] border p-6 shadow-sm"
            style={{ backgroundColor: "var(--cr-white)", borderColor: "var(--cr-divider)" }}
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--cr-divider)] bg-[var(--cr-divider)] text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    <th className="px-6 py-4 text-left">Doctor</th>
                    <th className="px-6 py-4 text-right">Booking Ledger</th>
                    <th className="px-6 py-4 text-right">Payroll Recorded</th>
                    <th className="px-6 py-4 text-right">Difference</th>
                    <th className="px-6 py-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--cr-divider)] text-[var(--cr-primary)]">
                  {data.providers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                        No doctor commission activity this month.
                      </td>
                    </tr>
                  ) : (
                    data.providers.map((row) => (
                      <tr key={row.providerId} className="transition hover:bg-[var(--cr-divider)]">
                        <td className="px-6 py-5 font-semibold text-[var(--cr-dark)]">{row.providerName}</td>
                        <td className="px-6 py-5 text-right text-[var(--cr-dark)]">{egp(row.ledgerCommission)}</td>
                        <td className="px-6 py-5 text-right text-muted-foreground">
                          {row.payroll ? `${egp(row.payroll.commission)} (${row.payroll.status})` : "—"}
                        </td>
                        <td
                          className="px-6 py-5 text-right font-semibold"
                          style={{ color: row.variance && row.variance !== 0 ? "var(--cr-error)" : "var(--cr-success)" }}
                        >
                          {row.variance !== null ? egp(row.variance) : "—"}
                        </td>
                        <td className="px-6 py-5 text-center">
                          {row.status === "matches" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                              <CheckCircle2 size={13} /> Matches
                            </span>
                          ) : row.status === "payroll_not_run" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                              <AlertTriangle size={13} /> Not run yet
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                              <AlertTriangle size={13} /> Mismatch
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
        </>
      ) : null}
    </div>
  );
}
