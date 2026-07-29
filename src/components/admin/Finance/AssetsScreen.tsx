"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Search,
  Plus,
  Trash2,
  Edit3,
  Layers,
  Loader2,
} from "lucide-react";
import { StatTile } from "./charts";

export interface FixedAsset {
  id: string;
  branch_id: string | null;
  category: "furniture" | "medical_device" | "it" | "leasehold_improvement";
  name: string;
  purchased_on: string;
  cost: number;
  useful_life_months: number;
  salvage_value: number;
  device_id: string | null;
  status: "active" | "disposed" | "fully_depreciated";
  is_opening: boolean;
  current_book_value?: number;
}

export interface DeviceOption {
  id: string;
  name: string;
}

export interface BranchOption {
  id: string;
  name_en: string;
  name_ar?: string;
}

const CATEGORY_LABELS: Record<FixedAsset["category"], string> = {
  furniture: "Furniture",
  medical_device: "Medical Device",
  it: "IT Equipment",
  leasehold_improvement: "Leasehold Improvement",
};

const STATUS_LABELS: Record<FixedAsset["status"], string> = {
  active: "Active",
  disposed: "Disposed",
  fully_depreciated: "Fully Depreciated",
};

interface AssetsScreenProps {
  accessToken?: string;
  branches?: BranchOption[];
}

export function AssetsScreen({ accessToken, branches = [] }: AssetsScreenProps) {
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [devices, setDevices] = useState<DeviceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FixedAsset | null>(null);

  const [form, setForm] = useState({
    branchId: "",
    category: "furniture" as FixedAsset["category"],
    name: "",
    purchasedOn: new Date().toISOString().split("T")[0],
    cost: "",
    usefulLifeMonths: "",
    salvageValue: "",
    deviceId: "",
  });

  const headers = useMemo(
    () => (accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined),
    [accessToken]
  );

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [assetsRes, devicesRes] = await Promise.all([
        fetch("/api/assets", { headers, cache: "no-store" }),
        fetch("/api/inventory/devices", { headers, cache: "no-store" }),
      ]);
      if (!assetsRes.ok) throw new Error("Unable to load fixed assets.");
      if (!devicesRes.ok) throw new Error("Unable to load devices.");
      const [assetsData, devicesData] = await Promise.all([assetsRes.json(), devicesRes.json()]);
      setAssets(Array.isArray(assetsData) ? assetsData : []);
      const mappedDevices = (Array.isArray(devicesData) ? devicesData : []).map((d: any) => ({
        id: d.id,
        name: d.name,
      }));
      setDevices(mappedDevices);
    } catch (err: any) {
      setError(err?.message || "Failed to load assets data.");
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
    return assets.filter((a) =>
      a.name.toLowerCase().includes(q) ||
      CATEGORY_LABELS[a.category].toLowerCase().includes(q) ||
      STATUS_LABELS[a.status].toLowerCase().includes(q)
    );
  }, [assets, search]);

  const totalCost = useMemo(
    () => assets.reduce((s, a) => s + Number(a.cost), 0),
    [assets]
  );
  const totalBookValue = useMemo(
    () => assets.reduce((s, a) => s + Number(a.current_book_value ?? a.cost), 0),
    [assets]
  );
  const totalDepreciated = useMemo(() => totalCost - totalBookValue, [totalCost, totalBookValue]);

  function resetForm() {
    setForm({
      branchId: "",
      category: "furniture",
      name: "",
      purchasedOn: new Date().toISOString().split("T")[0],
      cost: "",
      usefulLifeMonths: "",
      salvageValue: "",
      deviceId: "",
    });
  }

  function startEdit(asset: FixedAsset) {
    setEditing(asset);
    setForm({
      branchId: asset.branch_id || "",
      category: asset.category,
      name: asset.name,
      purchasedOn: asset.purchased_on,
      cost: String(asset.cost),
      usefulLifeMonths: String(asset.useful_life_months),
      salvageValue: String(asset.salvage_value),
      deviceId: asset.device_id || "",
    });
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const costNum = Number(form.cost);
    const lifeNum = Number(form.usefulLifeMonths);
    const salvageNum = Number(form.salvageValue) || 0;
    if (!form.name.trim() || !Number.isFinite(costNum) || costNum < 0 || !Number.isFinite(lifeNum) || lifeNum <= 0) {
      alert("Name, a non-negative cost and a positive useful life are required.");
      return;
    }
    if (salvageNum > costNum) {
      alert("Salvage value cannot exceed cost.");
      return;
    }
    const payload = {
      branchId: form.branchId || undefined,
      category: form.category,
      name: form.name.trim(),
      purchasedOn: form.purchasedOn,
      cost: costNum,
      usefulLifeMonths: lifeNum,
      salvageValue: salvageNum,
      deviceId: form.deviceId || undefined,
    };
    try {
      const res = await fetch("/api/assets" + (editing ? `?id=${editing.id}` : ""), {
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
      alert(err?.message || "Failed to save asset.");
    }
  }

  async function handleDelete(asset: FixedAsset) {
    if (!confirm(`Delete fixed asset "${asset.name}"?`)) return;
    try {
      const res = await fetch(`/api/assets?id=${asset.id}`, { method: "DELETE", headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Delete failed");
      await load();
    } catch (err: any) {
      alert(err?.message || "Failed to delete asset.");
    }
  }

  async function handlePostDepreciation() {
    const period = prompt("Period to post (YYYY-MM):", new Date().toISOString().slice(0, 7));
    if (!period) return;
    setPosting(true);
    try {
      const res = await fetch("/api/assets/post-depreciation", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ period }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Post failed");
      alert(`Posted: ${data.posted?.length || 0}, skipped: ${data.skipped?.length || 0}`);
      await load();
    } catch (err: any) {
      alert(err?.message || "Failed to post depreciation.");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Total Asset Cost"
          value={`EGP ${totalCost.toLocaleString()}`}
          icon={<Building2 size={18} />}
          accent="accent"
        />
        <StatTile
          label="Total Book Value"
          value={`EGP ${totalBookValue.toLocaleString()}`}
          icon={<Layers size={18} />}
        />
        <StatTile
          label="Accumulated Depreciation"
          value={`EGP ${totalDepreciated.toLocaleString()}`}
          icon={<Loader2 size={18} />}
        />
      </div>

      <div
        className="rounded-[32px] border p-6 shadow-sm"
        style={{ backgroundColor: "var(--cr-white)", borderColor: "rgba(90, 106, 81, 0.15)" }}
      >
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50"
            />
            <input
              type="text"
              placeholder="Search assets by name, category or status..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-[var(--cr-primary)]/15 bg-white py-3 pl-12 pr-4 text-sm text-[var(--cr-dark)] outline-none transition focus:border-[var(--cr-accent)] focus:ring-2 focus:ring-[var(--cr-accent)]/20"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handlePostDepreciation}
              disabled={posting}
              className="inline-flex items-center gap-2 rounded-3xl border border-[var(--cr-primary)]/15 bg-[var(--cr-white)] px-5 py-3 text-sm font-semibold text-[var(--cr-primary)] transition hover:bg-[var(--cr-divider)] disabled:opacity-50"
            >
              {posting ? <Loader2 size={16} className="animate-spin" /> : <Layers size={16} />}
              Post Depreciation
            </button>
            <button
              onClick={() => {
                setEditing(null);
                resetForm();
                setShowForm(true);
              }}
              className="inline-flex items-center gap-2 rounded-3xl bg-[var(--cr-primary)] px-5 py-3 text-sm font-semibold text-[var(--cr-white)] transition hover:bg-[var(--color-brand-primary-hover)]"
            >
              <Plus size={16} /> Add Asset
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {showForm && (
          <form
            onSubmit={handleSave}
            className="mb-6 grid gap-4 rounded-2xl border border-[var(--cr-divider)] bg-[var(--cr-white)] p-5"
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Asset Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-xl border border-[var(--cr-primary)]/15 bg-white px-3 py-2.5 text-sm text-[var(--cr-dark)] outline-none focus:border-[var(--cr-accent)]"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as FixedAsset["category"] })}
                  className="w-full rounded-xl border border-[var(--cr-primary)]/15 bg-white px-3 py-2.5 text-sm text-[var(--cr-dark)] outline-none focus:border-[var(--cr-accent)]"
                  required
                >
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Branch (optional)</label>
                <select
                  value={form.branchId}
                  onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                  className="w-full rounded-xl border border-[var(--cr-primary)]/15 bg-white px-3 py-2.5 text-sm text-[var(--cr-dark)] outline-none focus:border-[var(--cr-accent)]"
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
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Purchased On</label>
                <input
                  type="date"
                  value={form.purchasedOn}
                  onChange={(e) => setForm({ ...form, purchasedOn: e.target.value })}
                  className="w-full rounded-xl border border-[var(--cr-primary)]/15 bg-white px-3 py-2.5 text-sm text-[var(--cr-dark)] outline-none focus:border-[var(--cr-accent)]"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Cost (EGP)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.cost}
                  onChange={(e) => setForm({ ...form, cost: e.target.value })}
                  className="w-full rounded-xl border border-[var(--cr-primary)]/15 bg-white px-3 py-2.5 text-sm text-[var(--cr-dark)] outline-none focus:border-[var(--cr-accent)]"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Useful Life (months)</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.usefulLifeMonths}
                  onChange={(e) => setForm({ ...form, usefulLifeMonths: e.target.value })}
                  className="w-full rounded-xl border border-[var(--cr-primary)]/15 bg-white px-3 py-2.5 text-sm text-[var(--cr-dark)] outline-none focus:border-[var(--cr-accent)]"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Salvage Value (EGP)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.salvageValue}
                  onChange={(e) => setForm({ ...form, salvageValue: e.target.value })}
                  className="w-full rounded-xl border border-[var(--cr-primary)]/15 bg-white px-3 py-2.5 text-sm text-[var(--cr-dark)] outline-none focus:border-[var(--cr-accent)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Linked Device (optional)</label>
                <select
                  value={form.deviceId}
                  onChange={(e) => setForm({ ...form, deviceId: e.target.value })}
                  className="w-full rounded-xl border border-[var(--cr-primary)]/15 bg-white px-3 py-2.5 text-sm text-[var(--cr-dark)] outline-none focus:border-[var(--cr-accent)]"
                >
                  <option value="">None</option>
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="rounded-xl bg-[var(--cr-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--cr-white)] transition hover:bg-[var(--color-brand-primary-hover)]"
              >
                {editing ? "Update Asset" : "Add Asset"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
                  resetForm();
                }}
                className="rounded-xl border border-[var(--cr-primary)]/15 bg-white px-5 py-2.5 text-sm font-semibold text-[var(--cr-primary)] transition hover:bg-[var(--cr-white)]"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-[var(--cr-divider)] bg-[var(--cr-divider)] text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                <th className="px-6 py-4 text-left">Asset</th>
                <th className="px-6 py-4 text-left">Category</th>
                <th className="px-6 py-4 text-left">Branch</th>
                <th className="px-6 py-4 text-left">Purchased</th>
                <th className="px-6 py-4 text-right">Cost</th>
                <th className="px-6 py-4 text-right">Book Value</th>
                <th className="px-6 py-4 text-left">Status</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--cr-divider)] text-[var(--cr-primary)]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">
                    Loading...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">
                    No fixed assets found.
                  </td>
                </tr>
              ) : (
                filtered.map((asset) => (
                  <tr key={asset.id} className="transition hover:bg-[var(--cr-divider)]">
                    <td className="px-6 py-5 font-semibold text-[var(--cr-dark)]">{asset.name}</td>
                    <td className="px-6 py-5 text-muted-foreground">{CATEGORY_LABELS[asset.category]}</td>
                    <td className="px-6 py-5 text-muted-foreground">
                      {branches.find((b) => b.id === asset.branch_id)?.name_en ||
                        (asset.branch_id ? "Unknown" : "—")}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-muted-foreground">{asset.purchased_on}</td>
                    <td className="px-6 py-5 text-right font-semibold text-[var(--cr-dark)]">
                      EGP {Number(asset.cost).toLocaleString()}
                    </td>
                    <td className="px-6 py-5 text-right font-semibold text-[var(--cr-primary)]">
                      EGP {Number(asset.current_book_value ?? asset.cost).toLocaleString()}
                    </td>
                    <td className="px-6 py-5">
                      <span
                        className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                          asset.status === "active"
                            ? "bg-green-50 text-green-700"
                            : asset.status === "disposed"
                            ? "bg-gray-100 text-gray-600"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {STATUS_LABELS[asset.status]}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => startEdit(asset)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-[var(--cr-secondary)] hover:text-[var(--cr-primary)]"
                          title="Edit"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(asset)}
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
