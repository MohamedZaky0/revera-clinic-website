"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Search, Truck, AlertTriangle } from "lucide-react";
import { useAlertConfirm } from "@/contexts/AlertConfirmContext";

type Supplier = {
  id: string;
  name: string;
  contact: string | null;
  payment_terms: string | null;
  active: boolean;
  created_at: string;
};

type Props = {
  authHeaders: Record<string, string>;
  canManage?: boolean;
};

const EMPTY_FORM = { name: "", contact: "", payment_terms: "", active: true };

export default function SuppliersScreen({ authHeaders, canManage = true }: Props) {
  const { showConfirm } = useAlertConfirm();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [modal, setModal] = useState<{ open: boolean; mode: "add" | "edit"; id: string | null; form: typeof EMPTY_FORM }>({
    open: false,
    mode: "add",
    id: null,
    form: EMPTY_FORM,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSuppliers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchSuppliers() {
    setLoading(true);
    try {
      const res = await fetch("/api/suppliers", { headers: authHeaders });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load suppliers.");
      setSuppliers(json.suppliers || []);
      setError(null);
    } catch (e: any) {
      setError(e.message || "Failed to load suppliers.");
    } finally {
      setLoading(false);
    }
  }

  function openAddModal() {
    setModal({ open: true, mode: "add", id: null, form: EMPTY_FORM });
  }

  function openEditModal(supplier: Supplier) {
    setModal({
      open: true,
      mode: "edit",
      id: supplier.id,
      form: {
        name: supplier.name,
        contact: supplier.contact || "",
        payment_terms: supplier.payment_terms || "",
        active: supplier.active,
      },
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!modal.form.name.trim()) return;

    setSaving(true);
    try {
      const method = modal.mode === "add" ? "POST" : "PUT";
      const body = modal.mode === "add" ? modal.form : { id: modal.id, ...modal.form };

      const res = await fetch("/api/suppliers", {
        method,
        headers: authHeaders,
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save supplier.");

      setModal({ open: false, mode: "add", id: null, form: EMPTY_FORM });
      await fetchSuppliers();
    } catch (e: any) {
      alert(e.message || "Failed to save supplier.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(supplier: Supplier) {
    const confirmed = await showConfirm(`Delete supplier "${supplier.name}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/suppliers?id=${supplier.id}`, { method: "DELETE", headers: authHeaders });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete supplier.");
      await fetchSuppliers();
    } catch (e: any) {
      alert(e.message || "Failed to delete supplier.");
    }
  }

  const filteredSuppliers = suppliers.filter((s) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return s.name.toLowerCase().includes(q) || (s.contact || "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-[#1F251A]">Suppliers</h3>
          <p className="text-xs text-[#5A6A51]">Manage vendors used to restock products and supplies.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5A6A51]" />
            <input
              type="text"
              placeholder="Search by name, contact..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-[#E6E9EB] bg-white py-2 pl-9 pr-4 text-xs text-[#1F251A] focus:border-[#414E36] focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className={`${canManage ? "inline-flex" : "hidden"} items-center gap-1.5 rounded-2xl bg-[#414E36] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#2e3a26]`}
          >
            <Plus size={14} /> Add Supplier
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      <div className="overflow-hidden rounded-[32px] border border-[#E6E9EB] bg-white">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="border-b border-[#E6E9EB] bg-[#F7F7F9] text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5A6A51]">
              <th className="px-6 py-4 text-left">Supplier</th>
              <th className="px-6 py-4 text-left">Contact</th>
              <th className="px-6 py-4 text-left">Payment Terms</th>
              <th className="px-6 py-4 text-left">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E6E9EB] text-[#414E36]">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-[#5A6A51]">Loading suppliers...</td>
              </tr>
            ) : filteredSuppliers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-[#5A6A51]">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Truck size={32} className="text-[#A3B19B]" />
                    <p className="font-semibold text-[#1F251A]">No suppliers found</p>
                    <p className="text-xs text-[#5A6A51]">Try adjusting your search, or add a new supplier.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredSuppliers.map((s) => (
                <tr key={s.id} className="transition hover:bg-[#F9F9F7]">
                  <td className="px-6 py-4 font-semibold text-[#1F251A]">{s.name}</td>
                  <td className="px-6 py-4 text-[#5A6A51]">{s.contact || "—"}</td>
                  <td className="px-6 py-4 text-[#5A6A51]">{s.payment_terms || "—"}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        s.active
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-gray-100 text-gray-600 border border-gray-200"
                      }`}
                    >
                      {s.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(s)}
                        className={`${canManage ? "inline-flex" : "hidden"} rounded-xl border border-[#E6E9EB] p-2 text-[#5A6A51] transition hover:bg-[#EBF0E6] hover:text-[#414E36]`}
                        title="Edit Supplier"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(s)}
                        className={`${canManage ? "inline-flex" : "hidden"} rounded-xl border border-rose-100 p-2 text-rose-600 transition hover:bg-rose-50 hover:text-rose-700`}
                        title="Delete Supplier"
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

      {modal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-[#414E36]/10">
            <div className="flex items-center justify-between border-b border-[#414E36]/10 pb-4 mb-4">
              <h3 className="text-xl font-bold text-[#1F251A]">
                {modal.mode === "add" ? "Add Supplier" : "Edit Supplier"}
              </h3>
              <button
                type="button"
                onClick={() => setModal({ open: false, mode: "add", id: null, form: EMPTY_FORM })}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#5A6A51] uppercase tracking-wider mb-1">Supplier Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DermaCare Pharma"
                  value={modal.form.name}
                  onChange={(e) => setModal((prev) => ({ ...prev, form: { ...prev.form, name: e.target.value } }))}
                  className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#414E36]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5A6A51] uppercase tracking-wider mb-1">Contact</label>
                <input
                  type="text"
                  placeholder="Phone, email, or contact name"
                  value={modal.form.contact}
                  onChange={(e) => setModal((prev) => ({ ...prev, form: { ...prev.form, contact: e.target.value } }))}
                  className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#414E36]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5A6A51] uppercase tracking-wider mb-1">Payment Terms</label>
                <input
                  type="text"
                  placeholder="e.g. Net 30, Cash on delivery"
                  value={modal.form.payment_terms}
                  onChange={(e) => setModal((prev) => ({ ...prev, form: { ...prev.form, payment_terms: e.target.value } }))}
                  className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#414E36]"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-[#1F251A]">
                <input
                  type="checkbox"
                  checked={modal.form.active}
                  onChange={(e) => setModal((prev) => ({ ...prev, form: { ...prev.form, active: e.target.checked } }))}
                  className="h-4 w-4 rounded border-[#414E36]/30 text-[#414E36] accent-[#414E36]"
                />
                Active
              </label>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-3xl bg-[#414E36] py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26] disabled:opacity-50 mt-2"
              >
                {saving ? "Saving..." : modal.mode === "add" ? "Create Supplier" : "Save Changes"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
