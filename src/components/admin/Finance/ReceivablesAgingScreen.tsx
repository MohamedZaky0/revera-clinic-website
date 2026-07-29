"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, AlertCircle } from "lucide-react";
import { StatTile } from "./charts";

export interface BranchOption {
  id: string;
  name_en: string;
  name_ar?: string;
}

interface AgingItem {
  customerId: string | null;
  customerName: string;
  invoiceId: string;
  invoiceNo: string;
  issuedAt: string;
  outstanding: number;
  ageDays: number;
  bucket: "0-30" | "31-60" | "61-90" | "90+";
}

interface AgingResponse {
  asOf: string;
  branchId: string | null;
  totalOutstanding: number;
  buckets: Record<"0-30" | "31-60" | "61-90" | "90+", number>;
  items: AgingItem[];
}

interface ReceivablesAgingScreenProps {
  accessToken?: string;
  branches?: BranchOption[];
}

function egp(n: number): string {
  return `EGP ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const BUCKET_STYLE: Record<string, string> = {
  "0-30": "bg-emerald-50 text-emerald-700",
  "31-60": "bg-amber-50 text-amber-800",
  "61-90": "bg-orange-50 text-orange-800",
  "90+": "bg-red-50 text-red-700",
};

export function ReceivablesAgingScreen({ accessToken, branches = [] }: ReceivablesAgingScreenProps) {
  const [asOf, setAsOf] = useState(today());
  const [branchId, setBranchId] = useState("");
  const [data, setData] = useState<AgingResponse | null>(null);
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
        const params = new URLSearchParams({ asOf });
        if (branchId) params.set("branchId", branchId);
        const res = await fetch(`/api/finance/receivables-aging?${params}`, { headers, cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "Unable to load receivables aging.");
        if (!cancelled) setData(json);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Failed to load receivables aging.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [asOf, branchId, headers]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">As of</label>
          <input
            type="date"
            value={asOf}
            onChange={(e) => setAsOf(e.target.value)}
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
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            <StatTile label="Total Outstanding" value={egp(data.totalOutstanding)} icon={<Clock size={18} />} accent="accent" />
            <StatTile label="0-30 days" value={egp(data.buckets["0-30"])} />
            <StatTile label="31-60 days" value={egp(data.buckets["31-60"])} />
            <StatTile label="61-90 days" value={egp(data.buckets["61-90"])} />
            <StatTile label="90+ days" value={egp(data.buckets["90+"])} />
          </div>

          <div
            className="rounded-[32px] border p-6 shadow-sm"
            style={{ backgroundColor: "var(--cr-white)", borderColor: "var(--cr-divider)" }}
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--cr-divider)] bg-[var(--cr-divider)] text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    <th className="px-6 py-4 text-left">Patient</th>
                    <th className="px-6 py-4 text-left">Invoice</th>
                    <th className="px-6 py-4 text-left">Date</th>
                    <th className="px-6 py-4 text-right">Outstanding</th>
                    <th className="px-6 py-4 text-center">Age</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--cr-divider)] text-[var(--cr-primary)]">
                  {data.items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                        No outstanding balances.
                      </td>
                    </tr>
                  ) : (
                    data.items.map((item) => (
                      <tr key={item.invoiceId} className="transition hover:bg-[var(--cr-divider)]">
                        <td className="px-6 py-5 font-semibold text-[var(--cr-dark)]">{item.customerName}</td>
                        <td className="px-6 py-5 text-muted-foreground">{item.invoiceNo}</td>
                        <td className="px-6 py-5 whitespace-nowrap text-muted-foreground">
                          {new Date(item.issuedAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-5 text-right font-semibold text-[var(--cr-dark)]">{egp(item.outstanding)}</td>
                        <td className="px-6 py-5 text-center">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${BUCKET_STYLE[item.bucket]}`}>
                            {item.ageDays}d · {item.bucket}
                          </span>
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
