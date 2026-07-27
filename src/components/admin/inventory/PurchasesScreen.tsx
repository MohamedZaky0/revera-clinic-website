"use client";

import { useEffect, useState } from "react";
import { Plus, X, Search, PackageCheck, AlertTriangle, Trash2 } from "lucide-react";

type Supplier = {
  id: string;
  name: string;
  active: boolean;
};

type Product = {
  id: string;
  name: string;
  unit: string;
};

type PurchaseLine = {
  id: string;
  product_id: string;
  qty: number;
  unit_cost: number;
  inventory_products?: { name: string } | null;
};

type Purchase = {
  id: string;
  supplier_id: string | null;
  purchased_at: string;
  total: number;
  paid: number;
  due_date: string | null;
  suppliers?: { name: string } | null;
  purchase_lines: PurchaseLine[];
};

type Props = {
  authHeaders: Record<string, string>;
};

type FormLine = { productId: string; qty: string; unitCost: string };

const EMPTY_LINE: FormLine = { productId: "", qty: "", unitCost: "" };

export default function PurchasesScreen({ authHeaders }: Props) {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [lines, setLines] = useState<FormLine[]>([{ ...EMPTY_LINE }]);
  const [paid, setPaid] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [purchasesRes, suppliersRes, productsRes] = await Promise.all([
        fetch("/api/purchases", { headers: authHeaders }),
        fetch("/api/suppliers", { headers: authHeaders }),
        fetch("/api/inventory/products", { headers: authHeaders }),
      ]);
      const purchasesJson = await purchasesRes.json();
      const suppliersJson = await suppliersRes.json();
      const productsJson = await productsRes.json();

      if (!purchasesRes.ok) throw new Error(purchasesJson.error || "Failed to load purchases.");
      if (!suppliersRes.ok) throw new Error(suppliersJson.error || "Failed to load suppliers.");
      if (!productsRes.ok) throw new Error(productsJson.error || "Failed to load products.");

      setPurchases(purchasesJson.purchases || []);
      setSuppliers(suppliersJson.suppliers || []);
      setProducts(productsJson.products || []);
      setError(null);
    } catch (e: any) {
      setError(e.message || "Failed to load purchases.");
    } finally {
      setLoading(false);
    }
  }

  function openModal() {
    setSupplierId("");
    setLines([{ ...EMPTY_LINE }]);
    setPaid("");
    setDueDate("");
    setFormError(null);
    setModalOpen(true);
  }

  function updateLine(index: number, patch: Partial<FormLine>) {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function addLine() {
    setLines((prev) => [...prev, { ...EMPTY_LINE }]);
  }

  function removeLine(index: number) {
    setLines((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }

  const previewTotal = lines.reduce((sum, line) => {
    const qty = Number(line.qty) || 0;
    const unitCost = Number(line.unitCost) || 0;
    return sum + qty * unitCost;
  }, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const cleanLines = lines
      .filter((line) => line.productId)
      .map((line) => ({
        productId: line.productId,
        qty: Number(line.qty),
        unitCost: Number(line.unitCost),
      }));

    if (cleanLines.length === 0) {
      setFormError("Add at least one product line.");
      return;
    }
    if (cleanLines.some((line) => !Number.isFinite(line.qty) || line.qty <= 0)) {
      setFormError("Every line needs a quantity greater than 0.");
      return;
    }
    if (cleanLines.some((line) => !Number.isFinite(line.unitCost) || line.unitCost < 0)) {
      setFormError("Every line needs a non-negative unit cost.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          supplierId: supplierId || undefined,
          lines: cleanLines,
          paid: paid ? Number(paid) : 0,
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to record purchase.");

      setModalOpen(false);
      await loadAll();
    } catch (e: any) {
      setFormError(e.message || "Failed to record purchase.");
    } finally {
      setSaving(false);
    }
  }

  const filteredPurchases = purchases.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const supplierName = (p.suppliers?.name || "").toLowerCase();
    const itemNames = (p.purchase_lines || []).map((l) => (l.inventory_products?.name || "").toLowerCase()).join(" ");
    return supplierName.includes(q) || itemNames.includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-[#1F251A]">Purchases</h3>
          <p className="text-xs text-[#5A6A51]">Record stock received from suppliers and review purchase history.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5A6A51]" />
            <input
              type="text"
              placeholder="Search by supplier, product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-[#E6E9EB] bg-white py-2 pl-9 pr-4 text-xs text-[#1F251A] focus:border-[#414E36] focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={openModal}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-[#414E36] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#2e3a26]"
          >
            <Plus size={14} /> Record Purchase
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      <div className="overflow-hidden rounded-[32px] border border-[#E6E9EB] bg-white">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b border-[#E6E9EB] bg-[#F7F7F9] text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5A6A51]">
              <th className="px-6 py-4 text-left">Date</th>
              <th className="px-6 py-4 text-left">Supplier</th>
              <th className="px-6 py-4 text-left">Items</th>
              <th className="px-6 py-4 text-right">Total</th>
              <th className="px-6 py-4 text-right">Paid</th>
              <th className="px-6 py-4 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E6E9EB] text-[#414E36]">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-[#5A6A51]">Loading purchases...</td>
              </tr>
            ) : filteredPurchases.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-[#5A6A51]">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <PackageCheck size={32} className="text-[#A3B19B]" />
                    <p className="font-semibold text-[#1F251A]">No purchases recorded yet</p>
                    <p className="text-xs text-[#5A6A51]">Record a purchase to restock products and log a supplier bill.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredPurchases.map((p) => {
                const isPaid = p.paid >= p.total;
                const isPartial = p.paid > 0 && p.paid < p.total;
                return (
                  <tr key={p.id} className="transition hover:bg-[#F9F9F7]">
                    <td className="px-6 py-4 font-mono text-xs text-[#5A6A51]">
                      {new Date(p.purchased_at).toLocaleDateString(undefined, { dateStyle: "medium" })}
                    </td>
                    <td className="px-6 py-4 font-semibold text-[#1F251A]">{p.suppliers?.name || "—"}</td>
                    <td className="px-6 py-4 text-xs text-[#5A6A51]">
                      {(p.purchase_lines || [])
                        .map((l) => `${l.inventory_products?.name || "Unknown item"} (${l.qty})`)
                        .join(", ")}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-semibold text-[#1F251A]">
                      EGP {Number(p.total).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-xs text-[#5A6A51]">
                      EGP {Number(p.paid).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          isPaid
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : isPartial
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-gray-100 text-gray-600 border border-gray-200"
                        }`}
                      >
                        {isPaid ? "Paid" : isPartial ? "Partially Paid" : "Unpaid"}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl border border-[#414E36]/10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#414E36]/10 pb-4 mb-4">
              <h3 className="text-xl font-bold text-[#1F251A]">Record Purchase</h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#5A6A51] uppercase tracking-wider mb-1">Supplier</label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#414E36]"
                >
                  <option value="">No supplier / one-off</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#5A6A51] uppercase tracking-wider">Lines *</label>
                {lines.map((line, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <select
                      required
                      value={line.productId}
                      onChange={(e) => updateLine(index, { productId: e.target.value })}
                      className="flex-1 rounded-xl border border-[#414E36]/15 bg-white px-3 py-2 text-sm outline-none focus:border-[#414E36]"
                    >
                      <option value="" disabled>Select product</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      required
                      placeholder="Qty"
                      value={line.qty}
                      onChange={(e) => updateLine(index, { qty: e.target.value })}
                      className="w-24 rounded-xl border border-[#414E36]/15 bg-white px-3 py-2 text-sm outline-none focus:border-[#414E36]"
                    />
                    <input
                      type="number"
                      min="0"
                      step="any"
                      required
                      placeholder="Unit cost"
                      value={line.unitCost}
                      onChange={(e) => updateLine(index, { unitCost: e.target.value })}
                      className="w-28 rounded-xl border border-[#414E36]/15 bg-white px-3 py-2 text-sm outline-none focus:border-[#414E36]"
                    />
                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      disabled={lines.length === 1}
                      className="rounded-xl border border-rose-100 p-2 text-rose-600 transition hover:bg-rose-50 hover:text-rose-700 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Remove line"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addLine}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#414E36]/20 px-3 py-1.5 text-xs font-semibold text-[#414E36] transition hover:bg-[#EBF0E6]"
                >
                  <Plus size={13} /> Add Line
                </button>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-[#F7F7F9] px-4 py-2.5 text-sm">
                <span className="text-[#5A6A51]">Estimated total</span>
                <span className="font-mono font-bold text-[#1F251A]">EGP {previewTotal.toFixed(2)}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#5A6A51] uppercase tracking-wider mb-1">Paid Now (EGP)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0.00"
                    value={paid}
                    onChange={(e) => setPaid(e.target.value)}
                    className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#414E36]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5A6A51] uppercase tracking-wider mb-1">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#414E36]"
                  />
                </div>
              </div>

              {formError && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700">
                  <AlertTriangle size={14} /> {formError}
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-3xl bg-[#414E36] py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26] disabled:opacity-50 mt-2"
              >
                {saving ? "Recording..." : "Record Purchase"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
