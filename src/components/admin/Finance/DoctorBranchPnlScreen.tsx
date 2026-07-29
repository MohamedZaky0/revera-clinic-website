"use client";

import { useEffect, useMemo, useState } from "react";
import { Stethoscope, Building2, AlertCircle } from "lucide-react";

export interface BranchOption {
  id: string;
  name_en: string;
  name_ar?: string;
}

interface DoctorSlice {
  providerId: string | null;
  providerName: string;
  revenue: { total: number };
  cogs: { total: number; partiallyCosted: boolean };
  commission: { total: number; partiallyCommissioned: boolean };
  contributionMargin: number;
}

interface DoctorPnlResponse {
  range: { label: string; from: string; to: string };
  branchId: string | null;
  note: string;
  providers: DoctorSlice[];
  unattributed: DoctorSlice;
}

interface BranchSlice {
  branchId: string | null;
  branchName: string;
  revenue: { total: number };
  cogs: { total: number; partiallyCosted: boolean };
  commission: { total: number; partiallyCommissioned: boolean };
  fixedOverhead: { total: number; expenses: number; depreciation: number; loanInterest: number };
  contributionMargin: number;
  fullyLoadedProfit: number;
}

interface BranchPnlResponse {
  range: { label: string; from: string; to: string };
  note: string;
  branches: BranchSlice[];
  unattributed: BranchSlice;
}

interface DoctorBranchPnlScreenProps {
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

export function DoctorBranchPnlScreen({ accessToken, branches = [] }: DoctorBranchPnlScreenProps) {
  const [view, setView] = useState<"doctor" | "branch">("doctor");
  const [period, setPeriod] = useState(currentPeriod());
  const [branchId, setBranchId] = useState("");
  const [doctorData, setDoctorData] = useState<DoctorPnlResponse | null>(null);
  const [branchData, setBranchData] = useState<BranchPnlResponse | null>(null);
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
        if (view === "doctor") {
          const params = new URLSearchParams({ period });
          if (branchId) params.set("branchId", branchId);
          const res = await fetch(`/api/finance/doctor-pnl?${params}`, { headers, cache: "no-store" });
          const json = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(json?.error || "Unable to load doctor P&L.");
          if (!cancelled) setDoctorData(json);
        } else {
          const params = new URLSearchParams({ period });
          const res = await fetch(`/api/finance/branch-pnl?${params}`, { headers, cache: "no-store" });
          const json = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(json?.error || "Unable to load branch P&L.");
          if (!cancelled) setBranchData(json);
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Failed to load report.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [view, period, branchId, headers]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="inline-flex gap-1 rounded-2xl border border-[var(--cr-divider)] bg-white p-1">
          <button
            onClick={() => setView("doctor")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              view === "doctor" ? "bg-[var(--cr-primary)] text-[var(--cr-white)]" : "text-muted-foreground"
            }`}
          >
            <Stethoscope size={16} /> By Doctor
          </button>
          <button
            onClick={() => setView("branch")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              view === "branch" ? "bg-[var(--cr-primary)] text-[var(--cr-white)]" : "text-muted-foreground"
            }`}
          >
            <Building2 size={16} /> By Branch
          </button>
        </div>

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
          {view === "doctor" && (
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
          )}
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
      ) : view === "doctor" && doctorData ? (
        <div
          className="rounded-[32px] border p-6 shadow-sm"
          style={{ backgroundColor: "var(--cr-white)", borderColor: "var(--cr-divider)" }}
        >
          <p className="mb-4 text-xs text-muted-foreground">
            Contribution margin only — no fixed overhead per doctor, since rent/depreciation can&apos;t be
            attributed to one doctor.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="border-b border-[var(--cr-divider)] bg-[var(--cr-divider)] text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <th className="px-6 py-4 text-left">Doctor</th>
                  <th className="px-6 py-4 text-right">Revenue</th>
                  <th className="px-6 py-4 text-right">Materials & Devices</th>
                  <th className="px-6 py-4 text-right">Commission</th>
                  <th className="px-6 py-4 text-right">Contribution Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--cr-divider)] text-[var(--cr-primary)]">
                {doctorData.providers.length === 0 && doctorData.unattributed.revenue.total === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                      No sales in this range.
                    </td>
                  </tr>
                ) : (
                  <>
                    {doctorData.providers.map((row) => (
                      <tr key={row.providerId} className="transition hover:bg-[var(--cr-divider)]">
                        <td className="px-6 py-5 font-semibold text-[var(--cr-dark)]">{row.providerName}</td>
                        <td className="px-6 py-5 text-right text-[var(--cr-dark)]">{egp(row.revenue.total)}</td>
                        <td className="px-6 py-5 text-right text-muted-foreground">{egp(row.cogs.total)}</td>
                        <td className="px-6 py-5 text-right text-muted-foreground">{egp(row.commission.total)}</td>
                        <td
                          className="px-6 py-5 text-right font-semibold"
                          style={{ color: row.contributionMargin >= 0 ? "var(--cr-success)" : "var(--cr-error)" }}
                        >
                          {egp(row.contributionMargin)}
                        </td>
                      </tr>
                    ))}
                    {doctorData.unattributed.revenue.total !== 0 && (
                      <tr className="bg-amber-50/50">
                        <td className="px-6 py-5 font-semibold text-amber-800">
                          Not linked to a doctor
                          <div className="text-xs font-normal">e.g. retail product sales</div>
                        </td>
                        <td className="px-6 py-5 text-right text-amber-800">{egp(doctorData.unattributed.revenue.total)}</td>
                        <td className="px-6 py-5 text-right text-amber-800">{egp(doctorData.unattributed.cogs.total)}</td>
                        <td className="px-6 py-5 text-right text-amber-800">{egp(doctorData.unattributed.commission.total)}</td>
                        <td className="px-6 py-5 text-right font-semibold text-amber-800">
                          {egp(doctorData.unattributed.contributionMargin)}
                        </td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : view === "branch" && branchData ? (
        <div
          className="rounded-[32px] border p-6 shadow-sm"
          style={{ backgroundColor: "var(--cr-white)", borderColor: "var(--cr-divider)" }}
        >
          <p className="mb-4 text-xs text-muted-foreground">
            Loan interest can&apos;t be attributed to a branch (loans aren&apos;t tracked per branch), so it
            always appears under &quot;Not linked to a branch&quot; below.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-[var(--cr-divider)] bg-[var(--cr-divider)] text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <th className="px-6 py-4 text-left">Branch</th>
                  <th className="px-6 py-4 text-right">Revenue</th>
                  <th className="px-6 py-4 text-right">Overhead</th>
                  <th className="px-6 py-4 text-right">Contribution Margin</th>
                  <th className="px-6 py-4 text-right">Fully-Loaded Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--cr-divider)] text-[var(--cr-primary)]">
                {branchData.branches.length === 0 && branchData.unattributed.revenue.total === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                      No activity in this range.
                    </td>
                  </tr>
                ) : (
                  <>
                    {branchData.branches.map((row) => (
                      <tr key={row.branchId} className="transition hover:bg-[var(--cr-divider)]">
                        <td className="px-6 py-5 font-semibold text-[var(--cr-dark)]">{row.branchName}</td>
                        <td className="px-6 py-5 text-right text-[var(--cr-dark)]">{egp(row.revenue.total)}</td>
                        <td className="px-6 py-5 text-right text-muted-foreground">{egp(row.fixedOverhead.total)}</td>
                        <td
                          className="px-6 py-5 text-right font-semibold"
                          style={{ color: row.contributionMargin >= 0 ? "var(--cr-success)" : "var(--cr-error)" }}
                        >
                          {egp(row.contributionMargin)}
                        </td>
                        <td
                          className="px-6 py-5 text-right font-semibold"
                          style={{ color: row.fullyLoadedProfit >= 0 ? "var(--cr-success)" : "var(--cr-error)" }}
                        >
                          {egp(row.fullyLoadedProfit)}
                        </td>
                      </tr>
                    ))}
                    {(branchData.unattributed.revenue.total !== 0 || branchData.unattributed.fixedOverhead.total !== 0) && (
                      <tr className="bg-amber-50/50">
                        <td className="px-6 py-5 font-semibold text-amber-800">
                          Not linked to a branch
                          <div className="text-xs font-normal">incl. loan interest</div>
                        </td>
                        <td className="px-6 py-5 text-right text-amber-800">{egp(branchData.unattributed.revenue.total)}</td>
                        <td className="px-6 py-5 text-right text-amber-800">{egp(branchData.unattributed.fixedOverhead.total)}</td>
                        <td className="px-6 py-5 text-right font-semibold text-amber-800">
                          {egp(branchData.unattributed.contributionMargin)}
                        </td>
                        <td className="px-6 py-5 text-right font-semibold text-amber-800">
                          {egp(branchData.unattributed.fullyLoadedProfit)}
                        </td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
