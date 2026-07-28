import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Package, X, Loader2 } from "lucide-react";

export type PackageItem = {
  id?: string;
  serviceId: number;
  serviceName?: string;
  qty: number;
};

export type PackageOffer = {
  id: string;
  name: string;
  nameAr: string | null;
  branchId: string | null;
  price: number;
  taxRate: number;
  validityDays: number;
  onExpiry: "recognise_revenue" | "extend";
  extensionDays: number;
  active: boolean;
  showOnWebsite: boolean;
  items: PackageItem[];
};

type BranchOption = {
  id: string;
  name_en?: string;
  name?: string;
};

type ServiceOption = {
  id: number;
  en: string;
  ar?: string;
};

export function PackageAdminPanel({ session }: { session: any }) {
  const [packages, setPackages] = useState<PackageOffer[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    nameAr: "",
    branchId: "",
    price: "",
    taxRate: "",
    validityDays: "",
    onExpiry: "recognise_revenue" as "recognise_revenue" | "extend",
    extensionDays: "",
    active: true,
    showOnWebsite: false,
  });
  const [items, setItems] = useState<{ serviceId: string; qty: string; id?: string }[]>([{ serviceId: "", qty: "1" }]);

  const accessToken = session?.access_token || "";

  const loadData = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const [packagesRes, branchesRes, servicesRes] = await Promise.all([
        fetch("/api/packages", { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" }),
        fetch("/api/branches", { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" }),
        fetch("/api/services", { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" }),
      ]);
      if (!packagesRes.ok) throw new Error("Failed to load packages.");
      if (!branchesRes.ok) throw new Error("Failed to load branches.");
      if (!servicesRes.ok) throw new Error("Failed to load services.");
      const [packagesData, branchesData, servicesData] = await Promise.all([
        packagesRes.json(),
        branchesRes.json(),
        servicesRes.json(),
      ]);
      setPackages(Array.isArray(packagesData) ? packagesData : []);
      setBranches(Array.isArray(branchesData) ? branchesData : []);
      setServices(Array.isArray(servicesData) ? servicesData : []);
    } catch (err: any) {
      setError(err.message || "Error loading data.");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      name: "",
      nameAr: "",
      branchId: "",
      price: "",
      taxRate: "",
      validityDays: "",
      onExpiry: "recognise_revenue",
      extensionDays: "",
      active: true,
      showOnWebsite: false,
    });
    setItems([{ serviceId: "", qty: "1" }]);
  };

  const openAdd = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (pkg: PackageOffer) => {
    setEditingId(pkg.id);
    setForm({
      name: pkg.name,
      nameAr: pkg.nameAr || "",
      branchId: pkg.branchId || "",
      price: String(pkg.price),
      taxRate: String(pkg.taxRate),
      validityDays: String(pkg.validityDays),
      onExpiry: pkg.onExpiry,
      extensionDays: String(pkg.extensionDays),
      active: pkg.active,
      showOnWebsite: pkg.showOnWebsite,
    });
    setItems(
      pkg.items && pkg.items.length > 0
        ? pkg.items.map((it) => ({ id: it.id, serviceId: String(it.serviceId), qty: String(it.qty) }))
        : [{ serviceId: "", qty: "1" }]
    );
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const handleSave = async () => {
    if (!accessToken) return;
    const mappedItems = items
      .filter((it) => it.serviceId && Number(it.qty) > 0)
      .map((it) => ({ serviceId: Number(it.serviceId), qty: Number(it.qty), id: it.id }));
    if (mappedItems.length === 0) {
      setError("Add at least one service item with a positive quantity.");
      return;
    }
    const payload = {
      id: editingId || undefined,
      name: form.name.trim(),
      nameAr: form.nameAr.trim() || null,
      branchId: form.branchId || null,
      price: Number(form.price || 0),
      taxRate: Number(form.taxRate || 0),
      validityDays: Number(form.validityDays || 0),
      onExpiry: form.onExpiry,
      extensionDays: Number(form.extensionDays || 0),
      active: form.active,
      showOnWebsite: form.showOnWebsite,
      items: mappedItems,
    };
    setSaving(true);
    try {
      const res = await fetch("/api/packages", {
        method: editingId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save package.");
      await loadData();
      setModalOpen(false);
    } catch (err: any) {
      setError(err.message || "Error saving package.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!accessToken) return;
    if (!confirm("Delete this package? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/packages?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete package.");
      }
      await loadData();
    } catch (err: any) {
      setError(err.message || "Error deleting package.");
    }
  };

  const addItem = () => setItems([...items, { serviceId: "", qty: "1" }]);
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));
  const updateItem = (index: number, field: "serviceId" | "qty", value: string) => {
    const next = [...items];
    next[index][field] = value;
    setItems(next);
  };

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-3 text-xs font-semibold underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[#1F251A]">Package Offers</h3>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-lg bg-[#414E36] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#31382b]"
        >
          <Plus size={16} /> Add Package
        </button>
      </div>

      {loading && <div className="text-sm text-[#5A6A51]"><Loader2 className="inline mr-2 h-4 w-4 animate-spin" /> Loading packages…</div>}

      {!loading && packages.length === 0 && (
        <div className="rounded-2xl border border-[#414E36]/10 bg-white p-8 text-center text-sm text-[#5A6A51]">
          No packages yet. Create one to bundle services.
        </div>
      )}

      {packages.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-[#414E36]/10 bg-white shadow-sm">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-[#F9F9F7]">
              <tr>
                <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-[#5A6A51]">Name</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-[#5A6A51]">Branch</th>
                <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-[#5A6A51]">Price</th>
                <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-[#5A6A51]">Tax</th>
                <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-[#5A6A51]">Validity</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-[#5A6A51]">On Expiry</th>
                <th className="px-5 py-3 text-center text-[10px] font-semibold uppercase tracking-widest text-[#5A6A51]">Items</th>
                <th className="px-5 py-3 text-center text-[10px] font-semibold uppercase tracking-widest text-[#5A6A51]">Active</th>
                <th className="px-5 py-3 text-center text-[10px] font-semibold uppercase tracking-widest text-[#5A6A51]">Website</th>
                <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-[#5A6A51]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#414E36]/6">
              {packages.map((pkg) => (
                <tr key={pkg.id} className="hover:bg-[#F9F9F7]">
                  <td className="px-5 py-3 font-medium text-[#1F251A]">{pkg.name}</td>
                  <td className="px-5 py-3 text-[#5A6A51]">
                    {branches.find((b) => b.id === pkg.branchId)?.name_en || branches.find((b) => b.id === pkg.branchId)?.name || "All branches"}
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-[#C4AE7C]">EGP {Number(pkg.price).toLocaleString()}</td>
                  <td className="px-5 py-3 text-right text-[#5A6A51]">{Number(pkg.taxRate).toFixed(1)}%</td>
                  <td className="px-5 py-3 text-right text-[#5A6A51]">{pkg.validityDays}d</td>
                  <td className="px-5 py-3 text-left text-[#5A6A51]">
                    {pkg.onExpiry === "extend" ? "Auto-extend" : "Recognise revenue"}
                  </td>
                  <td className="px-5 py-3 text-center text-[#5A6A51]">{pkg.items?.length || 0}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${pkg.active ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"}`}>
                      {pkg.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${pkg.showOnWebsite ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-500"}`}>
                      {pkg.showOnWebsite ? "Visible" : "Hidden"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(pkg)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#414E36]/15 text-[#5A6A51] transition hover:border-[#C4AE7C] hover:text-[#414E36]"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(pkg.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-200 text-red-600 transition hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl border border-[#414E36]/10">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EDF1EC]">
                  <Package size={20} className="text-[#414E36]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#1F251A]">{editingId ? "Edit Package" : "Add Package"}</h3>
                  <p className="text-sm text-[#5A6A51]">Bundle services, set validity and expiry behaviour.</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#414E36]/15 text-[#5A6A51] hover:bg-[#F9F9F7]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">Package Name *</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-xl border border-[#414E36]/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#C4AE7C] focus:ring-2 focus:ring-[#C4AE7C]/20"
                    placeholder="e.g. Summer Glow Bundle"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">Package Name (Arabic)</label>
                  <input
                    value={form.nameAr}
                    onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                    dir="rtl"
                    className="w-full rounded-xl border border-[#414E36]/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#C4AE7C] focus:ring-2 focus:ring-[#C4AE7C]/20"
                    placeholder="مثال: باقة صيفية"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">Branch</label>
                  <select
                    value={form.branchId}
                    onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                    className="w-full rounded-xl border border-[#414E36]/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#C4AE7C]"
                  >
                    <option value="">All branches</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name_en || b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">Price (EGP) *</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full rounded-xl border border-[#414E36]/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#C4AE7C] focus:ring-2 focus:ring-[#C4AE7C]/20"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">Tax Rate (%)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    value={form.taxRate}
                    onChange={(e) => setForm({ ...form, taxRate: e.target.value })}
                    className="w-full rounded-xl border border-[#414E36]/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#C4AE7C] focus:ring-2 focus:ring-[#C4AE7C]/20"
                    placeholder="0.0"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">Validity Days</label>
                  <input
                    type="number"
                    min={0}
                    value={form.validityDays}
                    onChange={(e) => setForm({ ...form, validityDays: e.target.value })}
                    className="w-full rounded-xl border border-[#414E36]/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#C4AE7C] focus:ring-2 focus:ring-[#C4AE7C]/20"
                    placeholder="365"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">On Expiry</label>
                  <select
                    value={form.onExpiry}
                    onChange={(e) => setForm({ ...form, onExpiry: e.target.value as any })}
                    className="w-full rounded-xl border border-[#414E36]/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#C4AE7C]"
                  >
                    <option value="recognise_revenue">Recognise revenue</option>
                    <option value="extend">Auto-extend</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">Extension Days</label>
                  <input
                    type="number"
                    min={0}
                    value={form.extensionDays}
                    onChange={(e) => setForm({ ...form, extensionDays: e.target.value })}
                    className="w-full rounded-xl border border-[#414E36]/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#C4AE7C] focus:ring-2 focus:ring-[#C4AE7C]/20"
                    placeholder="0"
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-[#1F251A]">
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(e) => setForm({ ...form, active: e.target.checked })}
                      className="h-4 w-4 rounded border-[#414E36]/20 text-[#414E36] focus:ring-[#C4AE7C]"
                    />
                    Active
                  </label>
                </div>
                <div className="flex flex-col justify-end pb-2">
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-[#1F251A]">
                    <input
                      type="checkbox"
                      checked={form.showOnWebsite}
                      onChange={(e) => setForm({ ...form, showOnWebsite: e.target.checked })}
                      className="h-4 w-4 rounded border-[#414E36]/20 text-[#414E36] focus:ring-[#C4AE7C]"
                    />
                    Show on Website
                  </label>
                  <span className="mt-1 text-[11px] text-[#5A6A51]">Separate from Active — controls public visibility only.</span>
                </div>
              </div>

              <div className="rounded-xl border border-[#414E36]/10 bg-[#F9F9F7] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#414E36]">Included Services</h4>
                  <button
                    type="button"
                    onClick={addItem}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#414E36]/20 bg-white px-2.5 py-1.5 text-xs font-medium text-[#414E36] transition hover:bg-[#EDF1EC]"
                  >
                    <Plus size={12} /> Add Service
                  </button>
                </div>
                <div className="space-y-3">
                  {items.map((it, idx) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-[1fr,120px,40px] gap-3 items-end">
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#5A6A51]">Service</label>
                        <select
                          value={it.serviceId}
                          onChange={(e) => updateItem(idx, "serviceId", e.target.value)}
                          className="w-full rounded-lg border border-[#414E36]/15 bg-white px-3 py-2 text-sm outline-none focus:border-[#C4AE7C]"
                        >
                          <option value="">Select service</option>
                          {services.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.en} {s.ar ? `(${s.ar})` : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#5A6A51]">Quantity</label>
                        <input
                          type="number"
                          min={1}
                          value={it.qty}
                          onChange={(e) => updateItem(idx, "qty", e.target.value)}
                          className="w-full rounded-lg border border-[#414E36]/15 bg-white px-3 py-2 text-sm outline-none focus:border-[#C4AE7C]"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="mb-0.5 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-[#414E36]/10 pt-4">
                <button
                  onClick={closeModal}
                  className="rounded-lg border border-[#414E36]/15 px-4 py-2 text-sm font-medium text-[#414E36] transition hover:bg-[#F9F9F7]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#414E36] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#31382b] disabled:opacity-60"
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {editingId ? "Save Changes" : "Create Package"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
