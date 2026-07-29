"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Landmark,
  Search,
  Plus,
  Trash2,
  Eye,
  X,
  CalendarDays,
  TrendingDown,
} from "lucide-react";
import { StatTile } from "./charts";

export interface Loan {
  id: string;
  lender: string;
  principal: number;
  annual_rate: number;
  term_months: number;
  started_on: string;
  installment: number;
  is_opening: boolean;
  remaining_balance?: number;
}

export interface LoanScheduleRow {
  period: string;
  installment: number;
  interest_part: number;
  principal_part: number;
  balance_after: number;
  is_opening: boolean;
}

interface LoansScreenProps {
  accessToken?: string;
}

export function LoansScreen({ accessToken }: LoansScreenProps) {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [viewing, setViewing] = useState<{
    loan: Loan;
    schedule: LoanScheduleRow[];
  } | null>(null);

  const [form, setForm] = useState({
    lender: "",
    principal: "",
    annualRate: "",
    termMonths: "",
    startedOn: new Date().toISOString().split("T")[0],
    installment: "",
    isOpening: false,
    openingBalance: "",
    openingAsOf: new Date().toISOString().slice(0, 7),
  });

  const headers = useMemo(
    () => (accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined),
    [accessToken]
  );

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/loans", { headers, cache: "no-store" });
      if (!res.ok) throw new Error("Unable to load loans.");
      const data = await res.json();
      setLoans(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || "Failed to load loans.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return loans.filter((l) => l.lender.toLowerCase().includes(q));
  }, [loans, search]);

  const totalPrincipal = useMemo(
    () => loans.reduce((s, l) => s + Number(l.principal), 0),
    [loans]
  );
  const totalRemaining = useMemo(
    () => loans.reduce((s, l) => s + Number(l.remaining_balance ?? l.principal), 0),
    [loans]
  );

  function resetForm() {
    setForm({
      lender: "",
      principal: "",
      annualRate: "",
      termMonths: "",
      startedOn: new Date().toISOString().split("T")[0],
      installment: "",
      isOpening: false,
      openingBalance: "",
      openingAsOf: new Date().toISOString().slice(0, 7),
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const principalNum = Number(form.principal);
    const rateNum = Number(form.annualRate) || 0;
    const termNum = Number(form.termMonths);
    const installmentNum = Number(form.installment);
    if (!form.lender.trim() || !Number.isFinite(principalNum) || principalNum <= 0 ||
      !Number.isFinite(termNum) || termNum <= 0 ||
      !Number.isFinite(installmentNum) || installmentNum <= 0) {
      alert("Lender, positive principal, positive term and positive installment are required.");
      return;
    }
    const payload: any = {
      lender: form.lender.trim(),
      principal: principalNum,
      annualRate: rateNum,
      termMonths: termNum,
      startedOn: form.startedOn,
      installment: installmentNum,
      isOpening: form.isOpening,
    };
    if (form.isOpening) {
      const openingBalanceNum = Number(form.openingBalance);
      if (!Number.isFinite(openingBalanceNum) || openingBalanceNum <= 0 || openingBalanceNum > principalNum) {
        alert("Opening balance must be positive and no greater than principal.");
        return;
      }
      if (!/^\d{4}-\d{2}$/.test(form.openingAsOf)) {
        alert("Opening as-of must be YYYY-MM.");
        return;
      }
      payload.openingBalance = openingBalanceNum;
      payload.openingAsOf = form.openingAsOf;
    }
    try {
      const res = await fetch("/api/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Save failed");
      await load();
      setShowForm(false);
      resetForm();
    } catch (err: any) {
      alert(err?.message || "Failed to save loan.");
    }
  }

  async function handleDelete(loan: Loan) {
    if (!confirm(`Delete loan from "${loan.lender}"?`)) return;
    try {
      const res = await fetch(`/api/loans?id=${loan.id}`, { method: "DELETE", headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Delete failed");
      await load();
    } catch (err: any) {
      alert(err?.message || "Failed to delete loan.");
    }
  }

  async function viewSchedule(loan: Loan) {
    try {
      const res = await fetch(`/api/loans?id=${loan.id}`, { headers, cache: "no-store" });
      if (!res.ok) throw new Error("Unable to load loan schedule.");
      const data = await res.json();
      setViewing({ loan: data.loan, schedule: data.schedule || [] });
    } catch (err: any) {
      alert(err?.message || "Failed to load schedule.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Total Principal"
          value={`EGP ${totalPrincipal.toLocaleString()}`}
          icon={<Landmark size={18} />}
          accent="accent"
        />
        <StatTile
          label="Remaining Balance"
          value={`EGP ${totalRemaining.toLocaleString()}`}
          icon={<TrendingDown size={18} />}
        />
        <StatTile
          label="Active Loans"
          value={loans.length.toString()}
          icon={<CalendarDays size={18} />}
        />
      </div>

      <div
        className="rounded-[32px] border p-6 shadow-sm"
        style={{ backgroundColor: "var(--cr-white, #fff)", borderColor: "rgba(90, 106, 81, 0.15)" }}
      >
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5A6A51]/50"
            />
            <input
              type="text"
              placeholder="Search loans by lender..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-[#414E36]/15 bg-white py-3 pl-12 pr-4 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C] focus:ring-2 focus:ring-[#C4AE7C]/20"
            />
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="inline-flex items-center gap-2 rounded-3xl bg-[#414E36] px-5 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26]"
          >
            <Plus size={16} /> Add Loan
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {showForm && (
          <form
            onSubmit={handleSave}
            className="mb-6 grid gap-4 rounded-2xl border border-[#E6E9EB] bg-[#FBFBF9] p-5"
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="mb-1 block text-xs font-semibold text-[#5A6A51]">Lender</label>
                <input
                  type="text"
                  value={form.lender}
                  onChange={(e) => setForm({ ...form, lender: e.target.value })}
                  className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#5A6A51]">Principal (EGP)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.principal}
                  onChange={(e) => setForm({ ...form, principal: e.target.value })}
                  className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#5A6A51]">Annual Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.annualRate}
                  onChange={(e) => setForm({ ...form, annualRate: e.target.value })}
                  className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#5A6A51]">Term (months)</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.termMonths}
                  onChange={(e) => setForm({ ...form, termMonths: e.target.value })}
                  className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#5A6A51]">Started On</label>
                <input
                  type="date"
                  value={form.startedOn}
                  onChange={(e) => setForm({ ...form, startedOn: e.target.value })}
                  className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#5A6A51]">Installment (EGP)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.installment}
                  onChange={(e) => setForm({ ...form, installment: e.target.value })}
                  className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                  required
                />
              </div>
              <div className="flex items-center gap-2 sm:col-span-3">
                <input
                  type="checkbox"
                  id="isOpening"
                  checked={form.isOpening}
                  onChange={(e) => setForm({ ...form, isOpening: e.target.checked })}
                  className="h-4 w-4 accent-[#414E36]"
                />
                <label htmlFor="isOpening" className="text-xs font-semibold text-[#5A6A51]">
                  Opening loan (already in progress at go-live)
                </label>
              </div>
              {form.isOpening && (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#5A6A51]">Opening Balance (EGP)</label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={form.openingBalance}
                      onChange={(e) => setForm({ ...form, openingBalance: e.target.value })}
                      className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#5A6A51]">Opening As-Of (YYYY-MM)</label>
                    <input
                      type="text"
                      pattern="\d{4}-\d{2}"
                      value={form.openingAsOf}
                      onChange={(e) => setForm({ ...form, openingAsOf: e.target.value })}
                      className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                      required
                    />
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="rounded-xl bg-[#414E36] px-5 py-2.5 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26]"
              >
                Add Loan
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="rounded-xl border border-[#414E36]/15 bg-white px-5 py-2.5 text-sm font-semibold text-[#414E36] transition hover:bg-[#FBFBF9]"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-[#E6E9EB] bg-[#F7F7F9] text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5A6A51]">
                <th className="px-6 py-4 text-left">Lender</th>
                <th className="px-6 py-4 text-right">Principal</th>
                <th className="px-6 py-4 text-right">Rate</th>
                <th className="px-6 py-4 text-left">Started</th>
                <th className="px-6 py-4 text-left">Term</th>
                <th className="px-6 py-4 text-right">Remaining</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E9EB] text-[#414E36]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-[#5A6A51]">
                    Loading...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-[#5A6A51]">
                    No loans found.
                  </td>
                </tr>
              ) : (
                filtered.map((loan) => (
                  <tr key={loan.id} className="transition hover:bg-[#F9F9F7]">
                    <td className="px-6 py-5 font-semibold text-[#1F251A]">{loan.lender}</td>
                    <td className="px-6 py-5 text-right font-semibold text-[#1F251A]">
                      EGP {Number(loan.principal).toLocaleString()}
                    </td>
                    <td className="px-6 py-5 text-right text-[#5A6A51]">
                      {Number(loan.annual_rate).toFixed(2)}%
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-[#5A6A51]">{loan.started_on}</td>
                    <td className="px-6 py-5 text-[#5A6A51]">{loan.term_months} months</td>
                    <td className="px-6 py-5 text-right font-semibold text-[#414E36]">
                      EGP {Number(loan.remaining_balance ?? loan.principal).toLocaleString()}
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => viewSchedule(loan)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#5A6A51] transition hover:bg-[#EDF1EC] hover:text-[#414E36]"
                          title="View schedule"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(loan)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-red-500 transition hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(31, 37, 26, 0.4)" }}
          onClick={() => setViewing(null)}
        >
          <div
            className="max-h-[80vh] w-full max-w-3xl overflow-y-auto rounded-2xl border bg-white p-6 shadow-2xl"
            style={{ borderColor: "rgba(90, 106, 81, 0.15)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-[#1F251A]">
                {viewing.loan.lender} — Amortization Schedule
              </h3>
              <button
                onClick={() => setViewing(null)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#5A6A51] transition hover:bg-[#EDF1EC]"
              >
                <X size={18} />
              </button>
            </div>
            <div className="overflow-x-auto rounded-xl border border-[#E6E9EB]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E6E9EB] bg-[#F7F7F9] text-[11px] font-semibold uppercase tracking-wider text-[#5A6A51]">
                    <th className="px-4 py-3 text-left">Period</th>
                    <th className="px-4 py-3 text-right">Installment</th>
                    <th className="px-4 py-3 text-right">Interest</th>
                    <th className="px-4 py-3 text-right">Principal</th>
                    <th className="px-4 py-3 text-right">Balance After</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6E9EB] text-[#414E36]">
                  {viewing.schedule.map((row) => (
                    <tr key={row.period} className={row.is_opening ? "bg-amber-50/50" : ""}>
                      <td className="px-4 py-3 text-[#1F251A]">
                        {row.period}
                        {row.is_opening && (
                          <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                            opening
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        EGP {Number(row.installment).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-red-600">
                        EGP {Number(row.interest_part).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-green-600">
                        EGP {Number(row.principal_part).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-[#1F251A]">
                        EGP {Number(row.balance_after).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
