"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DollarSign,
  Search,
  Plus,
  Trash2,
  Edit3,
  CalendarDays,
  AlertCircle,
} from "lucide-react";
import { StatTile } from "./charts";

export interface Expense {
  id: string;
  category_id: string;
  branch_id: string | null;
  incurred_on: string;
  amount: number;
  vendor: string | null;
  note: string | null;
  is_opening: boolean;
  created_at?: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  kind: "fixed" | "variable";
  parent_id: string | null;
}

export interface BranchOption {
  id: string;
  name_en: string;
  name_ar?: string;
}

interface ExpensesScreenProps {
  accessToken?: string;
  branches?: BranchOption[];
}

export function ExpensesScreen({ accessToken, branches = [] }: ExpensesScreenProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);

  const [form, setForm] = useState({
    categoryId: "",
    branchId: "",
    incurredOn: new Date().toISOString().split("T")[0],
    amount: "",
    vendor: "",
    note: "",
  });

  const headers = useMemo(
    () => (accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined),
    [accessToken]
  );

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [expRes, catRes] = await Promise.all([
        fetch("/api/expenses", { headers, cache: "no-store" }),
        fetch("/api/expenses/categories", { headers, cache: "no-store" }),
      ]);
      if (!expRes.ok) throw new Error("Unable to load expenses.");
      if (!catRes.ok) throw new Error("Unable to load categories.");
      const [expData, catData] = await Promise.all([expRes.json(), catRes.json()]);
      setExpenses(Array.isArray(expData) ? expData : []);
      setCategories(Array.isArray(catData) ? catData : []);
    } catch (err: any) {
      setError(err?.message || "Failed to load expenses data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const categoryById = useMemo(() => {
    const map = new Map<string, ExpenseCategory>();
    for (const c of categories) map.set(c.id, c);
    return map;
  }, [categories]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return expenses.filter((e) => {
      const catName = categoryById.get(e.category_id)?.name?.toLowerCase() || "";
      const vendor = (e.vendor || "").toLowerCase();
      const note = (e.note || "").toLowerCase();
      return catName.includes(q) || vendor.includes(q) || note.includes(q);
    });
  }, [expenses, search, categoryById]);

  const totalMonth = useMemo(() => {
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return expenses
      .filter((e) => e.incurred_on.startsWith(period))
      .reduce((sum, e) => sum + Number(e.amount), 0);
  }, [expenses]);

  function resetForm() {
    setForm({
      categoryId: "",
      branchId: "",
      incurredOn: new Date().toISOString().split("T")[0],
      amount: "",
      vendor: "",
      note: "",
    });
  }

  function startEdit(exp: Expense) {
    setEditing(exp);
    setForm({
      categoryId: exp.category_id,
      branchId: exp.branch_id || "",
      incurredOn: exp.incurred_on,
      amount: String(exp.amount),
      vendor: exp.vendor || "",
      note: exp.note || "",
    });
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const amountNum = Number(form.amount);
    if (!form.categoryId || !form.incurredOn || !Number.isFinite(amountNum) || amountNum <= 0) {
      alert("Category, date and a positive amount are required.");
      return;
    }
    const payload = {
      categoryId: form.categoryId,
      branchId: form.branchId || undefined,
      incurredOn: form.incurredOn,
      amount: amountNum,
      vendor: form.vendor,
      note: form.note,
    };
    try {
      const res = await fetch("/api/expenses" + (editing ? `?id=${editing.id}` : ""), {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Save failed");
      await load();
      setShowForm(false);
      resetForm();
      setEditing(null);
    } catch (err: any) {
      alert(err?.message || "Failed to save expense.");
    }
  }

  async function handleDelete(exp: Expense) {
    if (!confirm(`Delete expense for ${exp.vendor || "(no vendor)"}?`)) return;
    try {
      const res = await fetch(`/api/expenses?id=${exp.id}`, { method: "DELETE", headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Delete failed");
      await load();
    } catch (err: any) {
      alert(err?.message || "Failed to delete expense.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Total Expenses This Month"
          value={`EGP ${totalMonth.toLocaleString()}`}
          icon={<DollarSign size={18} />}
          accent="accent"
        />
        <StatTile
          label="Total Expenses"
          value={`EGP ${expenses.reduce((s, e) => s + Number(e.amount), 0).toLocaleString()}`}
          icon={<CalendarDays size={18} />}
        />
        <StatTile
          label="Categories"
          value={categories.length.toString()}
          icon={<AlertCircle size={18} />}
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
              placeholder="Search expenses by category, vendor or note..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-[#414E36]/15 bg-white py-3 pl-12 pr-4 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C] focus:ring-2 focus:ring-[#C4AE7C]/20"
            />
          </div>
          <button
            onClick={() => {
              setEditing(null);
              resetForm();
              setShowForm(true);
            }}
            className="inline-flex items-center gap-2 rounded-3xl bg-[#414E36] px-5 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26]"
          >
            <Plus size={16} /> Add Expense
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
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#5A6A51]">Category</label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                  required
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#5A6A51]">Branch (optional)</label>
                <select
                  value={form.branchId}
                  onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                  className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                >
                  <option value="">All / Unassigned</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name_en}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#5A6A51]">Date</label>
                <input
                  type="date"
                  value={form.incurredOn}
                  onChange={(e) => setForm({ ...form, incurredOn: e.target.value })}
                  className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#5A6A51]">Amount (EGP)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#5A6A51]">Vendor / Merchant</label>
                <input
                  type="text"
                  value={form.vendor}
                  onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                  className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#5A6A51]">Note</label>
                <input
                  type="text"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="rounded-xl bg-[#414E36] px-5 py-2.5 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26]"
              >
                {editing ? "Update Expense" : "Add Expense"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
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
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-[#E6E9EB] bg-[#F7F7F9] text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5A6A51]">
                <th className="px-6 py-4 text-left">Date</th>
                <th className="px-6 py-4 text-left">Category</th>
                <th className="px-6 py-4 text-left">Branch</th>
                <th className="px-6 py-4 text-left">Vendor</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4 text-left">Note</th>
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
                    No expenses found.
                  </td>
                </tr>
              ) : (
                filtered.map((exp) => (
                  <tr key={exp.id} className="transition hover:bg-[#F9F9F7]">
                    <td className="px-6 py-5 whitespace-nowrap text-[#5A6A51]">{exp.incurred_on}</td>
                    <td className="px-6 py-5 font-semibold text-[#1F251A]">
                      {categoryById.get(exp.category_id)?.name || "Unknown"}
                    </td>
                    <td className="px-6 py-5 text-[#5A6A51]">
                      {branches.find((b) => b.id === exp.branch_id)?.name_en ||
                        (exp.branch_id ? "Unknown" : "—")}
                    </td>
                    <td className="px-6 py-5 text-[#1F251A]">{exp.vendor || "—"}</td>
                    <td className="px-6 py-5 text-right font-semibold text-red-600">
                      EGP {Number(exp.amount).toLocaleString()}
                    </td>
                    <td className="px-6 py-5 text-[#5A6A51]">{exp.note || "—"}</td>
                    <td className="px-6 py-5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => startEdit(exp)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#5A6A51] transition hover:bg-[#EDF1EC] hover:text-[#414E36]"
                          title="Edit"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(exp)}
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
    </div>
  );
}
