"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, AlertTriangle, FlaskConical } from "lucide-react";

type Product = {
  id: string;
  name: string;
  unit: string;
  role: "retail" | "consumable" | "both";
};

type RecipeItem = {
  product_id: string;
  standard_qty: number;
  inventory_products?: { name: string; unit: string } | null;
};

type Props = {
  serviceId: number;
  authHeaders: Record<string, string>;
};

export default function ServiceRecipeEditor({ serviceId, authHeaders }: Props) {
  const [items, setItems] = useState<RecipeItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const [newProductId, setNewProductId] = useState("");
  const [newQty, setNewQty] = useState("1");

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId]);

  async function loadAll() {
    setLoading(true);
    try {
      const [recipeRes, productsRes] = await Promise.all([
        fetch(`/api/service-consumables?serviceId=${serviceId}`, { headers: authHeaders }),
        fetch("/api/inventory/products", { headers: authHeaders }),
      ]);
      const recipeJson = await recipeRes.json();
      const productsJson = await productsRes.json();

      if (!recipeRes.ok) throw new Error(recipeJson.error || "Failed to load recipe.");
      if (!productsRes.ok) throw new Error(productsJson.error || "Failed to load products.");

      setItems(recipeJson.consumables || []);
      setProducts(productsJson.products || []);
      setDirty(false);
      setError(null);
    } catch (e: any) {
      setError(e.message || "Failed to load recipe.");
    } finally {
      setLoading(false);
    }
  }

  const eligibleProducts = products.filter((p) => p.role === "consumable" || p.role === "both");
  const usedProductIds = new Set(items.map((i) => i.product_id));
  const pickableProducts = eligibleProducts.filter((p) => !usedProductIds.has(p.id));

  function addItem() {
    if (!newProductId) return;
    const qty = Number(newQty);
    if (!Number.isFinite(qty) || qty <= 0) {
      setError("Standard quantity must be greater than 0.");
      return;
    }
    const product = products.find((p) => p.id === newProductId);
    setItems((prev) => [
      ...prev,
      {
        product_id: newProductId,
        standard_qty: qty,
        inventory_products: product ? { name: product.name, unit: product.unit } : null,
      },
    ]);
    setNewProductId("");
    setNewQty("1");
    setDirty(true);
    setError(null);
  }

  function removeItem(productId: string) {
    setItems((prev) => prev.filter((i) => i.product_id !== productId));
    setDirty(true);
  }

  function updateQty(productId: string, qty: number) {
    setItems((prev) => prev.map((i) => (i.product_id === productId ? { ...i, standard_qty: qty } : i)));
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/service-consumables", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          serviceId,
          items: items.map((i) => ({ productId: i.product_id, standardQty: i.standard_qty })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save recipe.");
      setDirty(false);
      await loadAll();
    } catch (e: any) {
      setError(e.message || "Failed to save recipe.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[#414E36]/10 bg-[#FBFBF9] p-4 space-y-3">
      <div className="flex items-center gap-2 text-[#414E36] font-semibold text-xs uppercase tracking-wider">
        <FlaskConical size={14} /> Consumables Recipe
      </div>
      <p className="text-[11px] text-[#8C9A84]">
        Standard materials consumed by one session of this service. Staff can still adjust the actual
        quantity used at checkout — this sets the default.
      </p>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
          <AlertTriangle size={13} /> {error}
        </div>
      )}

      {loading ? (
        <p className="text-xs text-[#5A6A51]">Loading recipe...</p>
      ) : (
        <>
          {items.length === 0 ? (
            <p className="text-xs text-[#5A6A51] italic">No consumables defined for this service yet.</p>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.product_id} className="flex items-center gap-2">
                  <span className="flex-1 text-sm text-[#1F251A] font-medium truncate">
                    {item.inventory_products?.name || item.product_id}
                  </span>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    value={item.standard_qty}
                    onChange={(e) => updateQty(item.product_id, Number(e.target.value) || 0)}
                    className="w-24 rounded-lg border border-[#414E36]/15 bg-white px-2.5 py-1.5 text-sm text-[#1F251A] focus:outline-none focus:ring-2 focus:ring-[#414E36]"
                  />
                  <span className="text-xs text-[#5A6A51] w-16">{item.inventory_products?.unit || ""}</span>
                  <button
                    type="button"
                    onClick={() => removeItem(item.product_id)}
                    className="rounded-lg border border-rose-100 p-1.5 text-rose-600 transition hover:bg-rose-50"
                    title="Remove"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 pt-2 border-t border-[#414E36]/10">
            <select
              value={newProductId}
              onChange={(e) => setNewProductId(e.target.value)}
              className="flex-1 rounded-lg border border-[#414E36]/15 bg-white px-2.5 py-1.5 text-sm text-[#1F251A] focus:outline-none focus:ring-2 focus:ring-[#414E36]"
            >
              <option value="">
                {pickableProducts.length === 0 ? "No eligible consumable products" : "Select product..."}
              </option>
              {pickableProducts.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
              ))}
            </select>
            <input
              type="number"
              min="0.01"
              step="any"
              value={newQty}
              onChange={(e) => setNewQty(e.target.value)}
              placeholder="Qty"
              className="w-20 rounded-lg border border-[#414E36]/15 bg-white px-2.5 py-1.5 text-sm text-[#1F251A] focus:outline-none focus:ring-2 focus:ring-[#414E36]"
            />
            <button
              type="button"
              onClick={addItem}
              disabled={!newProductId}
              className="inline-flex items-center gap-1 rounded-lg bg-[#414E36] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#2e3a26] disabled:opacity-40"
            >
              <Plus size={13} /> Add
            </button>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !dirty}
            className="w-full rounded-lg bg-[#414E36] py-2 text-xs font-semibold text-white transition hover:bg-[#2e3a26] disabled:opacity-40"
          >
            {saving ? "Saving Recipe..." : "Save Recipe"}
          </button>
        </>
      )}
    </div>
  );
}
