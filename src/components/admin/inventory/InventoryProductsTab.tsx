"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import {
  ShoppingBag,
  Plus,
  Pencil,
  Trash2,
  Tag,
  Receipt,
  Search,
  CheckCircle,
  AlertTriangle,
  Package,
  X,
  Archive,
} from "lucide-react";

type Branch = { id: string; name_en: string };

type Customer = {
  id?: string;
  name: string;
  mobile?: string;
  phone?: string;
  spent_amount?: number;
};

export type InventoryProductsTabRef = {
  openAddProduct: () => void;
  refreshSalesHistory: () => Promise<void>;
};

type Props = {
  authHeaders: Record<string, string>;
  branches: Branch[];
  customers: Customer[];
  products: any[];
  canManage: boolean;
  isSuperadmin: boolean;
  onRefreshProducts: () => Promise<void> | void;
  onProductCountChange?: (count: number) => void;
  onCustomerSpentChange?: (customerId: string, newSpentAmount: number) => void;
};

const InventoryProductsTab = forwardRef<InventoryProductsTabRef, Props>(
  function InventoryProductsTab(
    {
      authHeaders,
      branches,
      customers,
      products,
      canManage,
      isSuperadmin,
      onRefreshProducts,
      onProductCountChange,
      onCustomerSpentChange,
    },
    ref
  ) {
    const [productSubTab, setProductSubTab] = useState<"catalog" | "sales_history">("catalog");

    // Catalog filters
    const [productSearchQuery, setProductSearchQuery] = useState("");
    const [productBranchFilter, setProductBranchFilter] = useState("all");
    const [productStatusFilter, setProductStatusFilter] = useState("all");
    const [productCategoryFilter, setProductCategoryFilter] = useState("all");

    // Add / Edit Product modal
    const [showAddProductModal, setShowAddProductModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<any | null>(null);
    const [prodName, setProdName] = useState("");
    const [prodNameAr, setProdNameAr] = useState("");
    const [prodCategory, setProdCategory] = useState("Skincare");
    const [prodUnit, setProdUnit] = useState("Bottle");
    const [prodPurchasePrice, setProdPurchasePrice] = useState("");
    const [prodSellingPrice, setProdSellingPrice] = useState("");
    const [prodStockQuantity, setProdStockQuantity] = useState("10");
    const [prodMinReorder, setProdMinReorder] = useState("5");
    const [prodBranchId, setProdBranchId] = useState("");
    const [prodStatus, setProdStatus] = useState<"Active" | "Inactive" | "Out of Stock" | "Discontinued">("Active");
    const [prodRole, setProdRole] = useState<"retail" | "consumable" | "both">("retail");
    const [prodNotes, setProdNotes] = useState("");
    const [prodSku, setProdSku] = useState("");
    const [savingProduct, setSavingProduct] = useState(false);

    // Delete Product modal
    const [productPendingDelete, setProductPendingDelete] = useState<{ id: string; name: string; mode: "soft" | "hard" } | null>(null);
    const [deletingProduct, setDeletingProduct] = useState(false);
    const [productDeleteError, setProductDeleteError] = useState<string | null>(null);

    // Sales history
    const [productSalesHistory, setProductSalesHistory] = useState<any[]>([]);
    const [productSalesLoading, setProductSalesLoading] = useState(false);

    // Sell Product modal
    const [showSellProductModal, setShowSellProductModal] = useState(false);
    const [selectedSellProduct, setSelectedSellProduct] = useState<any | null>(null);
    const [sellCustomerId, setSellCustomerId] = useState("");
    const [sellPaymentMethod, setSellPaymentMethod] = useState("Cash");
    const [sellNotes, setSellNotes] = useState("");
    const [sellQuantity, setSellQuantity] = useState<number>(1);
    const [sellPatientPhone, setSellPatientPhone] = useState("");
    const [searchedPatient, setSearchedPatient] = useState<any | null>(null);
    const [searchPatientAttempted, setSearchPatientAttempted] = useState(false);
    const [submittingSellProduct, setSubmittingSellProduct] = useState(false);

    const fetchProductSalesHistory = useCallback(async () => {
      try {
        setProductSalesLoading(true);
        const res = await fetch("/api/inventory/products/sales", {
          headers: authHeaders,
        });
        if (res.ok) {
          const data = await res.json();
          setProductSalesHistory(data.sales || []);
        }
      } catch (err) {
        console.error("Error fetching product sales history:", err);
      } finally {
        setProductSalesLoading(false);
      }
    }, [authHeaders]);

    useEffect(() => {
      fetchProductSalesHistory();
    }, [fetchProductSalesHistory]);

    useEffect(() => {
      onProductCountChange?.(products.length);
    }, [products.length, onProductCountChange]);

    const filteredInventoryProducts = useMemo(() => {
      return products.filter((p) => {
        const q = productSearchQuery.toLowerCase().trim();
        const matchesSearch =
          !q ||
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.sku && p.sku.toLowerCase().includes(q)) ||
          (p.category && p.category.toLowerCase().includes(q));

        const matchesCat =
          productCategoryFilter.toLowerCase() === "all" ||
          p.category?.toLowerCase() === productCategoryFilter.toLowerCase();

        const matchesStatus =
          productStatusFilter.toLowerCase() === "all" ||
          p.status?.toLowerCase() === productStatusFilter.toLowerCase();

        const matchesBranch =
          productBranchFilter.toLowerCase() === "all" ||
          p.branch_id === productBranchFilter;

        return matchesSearch && matchesCat && matchesStatus && matchesBranch;
      });
    }, [products, productSearchQuery, productCategoryFilter, productStatusFilter, productBranchFilter]);

    const resetProductForm = () => {
      setEditingProduct(null);
      setProdName("");
      setProdNameAr("");
      setProdCategory("Skincare");
      setProdUnit("Bottle");
      setProdPurchasePrice("");
      setProdSellingPrice("");
      setProdStockQuantity("10");
      setProdMinReorder("5");
      setProdBranchId("");
      setProdStatus("Active");
      setProdRole("retail");
      setProdNotes("");
      setProdSku(`SKU-${Date.now().toString().slice(-4)}`);
    };

    useImperativeHandle(ref, () => ({
      openAddProduct: () => {
        resetProductForm();
        setShowAddProductModal(true);
      },
      refreshSalesHistory: fetchProductSalesHistory,
    }));

    const openEditProductModal = (product: any) => {
      setEditingProduct(product);
      setProdName(product.name || "");
      setProdNameAr(product.arabic_name || "");
      setProdCategory(product.category || "Skincare");
      setProdUnit(product.unit || "Piece");
      setProdPurchasePrice(String(product.purchase_price ?? ""));
      setProdSellingPrice(String(product.selling_price ?? ""));
      setProdStockQuantity(String(product.stock_quantity ?? "0"));
      setProdMinReorder(String(product.min_reorder_quantity ?? "5"));
      setProdBranchId(product.branch_id || "");
      setProdStatus(product.status || "Active");
      setProdRole(product.role || "retail");
      setProdNotes(product.notes || "");
      setProdSku(product.sku || "");
      setShowAddProductModal(true);
    };

    const handleSaveProduct = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!prodName.trim()) {
        alert("Product name is required.");
        return;
      }
      setSavingProduct(true);
      try {
        const payload = {
          id: editingProduct?.id,
          name: prodName,
          arabic_name: prodNameAr,
          category: prodCategory,
          unit: prodUnit,
          purchase_price: parseFloat(prodPurchasePrice) || 0,
          selling_price: parseFloat(prodSellingPrice) || 0,
          stock_quantity: parseInt(prodStockQuantity) || 0,
          min_reorder_quantity: parseInt(prodMinReorder) || 5,
          branch_id: prodBranchId || null,
          status: prodStatus,
          role: prodRole,
          notes: prodNotes,
          sku: prodSku,
        };
        const res = await fetch("/api/inventory/products", {
          method: editingProduct ? "PUT" : "POST",
          headers: authHeaders,
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          setShowAddProductModal(false);
          resetProductForm();
          await onRefreshProducts();
        } else {
          alert("Failed to save product.");
        }
      } catch (err) {
        console.error("Error saving product:", err);
        alert("Error saving product.");
      } finally {
        setSavingProduct(false);
      }
    };

    const requestDeleteProduct = (id: string, name: string, mode: "soft" | "hard") => {
      setProductDeleteError(null);
      setProductPendingDelete({ id, name, mode });
    };

    const confirmProductDelete = async () => {
      if (!productPendingDelete) return;
      const { id, mode } = productPendingDelete;
      setDeletingProduct(true);
      setProductDeleteError(null);
      try {
        const authHeader = authHeaders["Authorization"] || authHeaders["authorization"] || "";
        const res = await fetch(`/api/inventory/products?id=${id}${mode === "hard" ? "&hard=true" : ""}`, {
          method: "DELETE",
          headers: { Authorization: authHeader },
        });
        const resBody = await res.json().catch(() => ({}));
        if (res.ok) {
          await onRefreshProducts();
          setProductPendingDelete(null);
        } else {
          setProductDeleteError(resBody?.error || "Failed to delete product.");
        }
      } catch (err) {
        console.error("Error deleting product:", err);
        setProductDeleteError("Error deleting product.");
      } finally {
        setDeletingProduct(false);
      }
    };

    const handleOpenSellProductModal = (prod: any) => {
      if (prod?.role === "consumable") {
        alert("Consumable products are reserved for clinic service usage and cannot be sold to patients.");
        return;
      }
      setSelectedSellProduct(prod);
      setSellQuantity(1);
      setSellPatientPhone("");
      setSearchedPatient(null);
      setSearchPatientAttempted(false);
      setShowSellProductModal(true);
    };

    const handleSearchPatientByPhone = (phone: string) => {
      const cleanPhone = phone.replace(/\D/g, "");
      if (!cleanPhone) {
        setSearchedPatient(null);
        setSearchPatientAttempted(true);
        return;
      }
      const found = customers.find((c) => {
        const cMobile = (c.mobile || c.phone || "").replace(/\D/g, "");
        return cMobile && (cMobile.includes(cleanPhone) || cleanPhone.includes(cMobile));
      });
      setSearchedPatient(found || null);
      setSearchPatientAttempted(true);
    };

    const handleConfirmSellProduct = async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      const targetPatient = searchedPatient || customers.find((c) => c.id === sellCustomerId);
      if (!selectedSellProduct || !targetPatient || sellQuantity <= 0) {
        alert("Please select a valid patient and product quantity.");
        return;
      }
      if (sellQuantity > selectedSellProduct.stock_quantity) {
        alert(`Cannot sell ${sellQuantity} items. Only ${selectedSellProduct.stock_quantity} available in stock.`);
        return;
      }

      try {
        setSubmittingSellProduct(true);
        const unitPrice = selectedSellProduct.selling_price || 0;
        const totalAmount = unitPrice * sellQuantity;

        const saleRes = await fetch("/api/inventory/products/sales", {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            product_id: selectedSellProduct.id,
            product_name: selectedSellProduct.name,
            product_sku: selectedSellProduct.sku || "",
            customer_id: targetPatient.id,
            customer_name: targetPatient.name,
            customer_mobile: targetPatient.mobile || targetPatient.phone || "",
            quantity: sellQuantity,
            unit_price: unitPrice,
            total_amount: totalAmount,
            sold_by: "Admin/Receptionist",
            payment_method: sellPaymentMethod,
            notes: sellNotes,
          }),
        });

        if (!saleRes.ok) {
          const errorData = await saleRes.json();
          throw new Error(errorData.error || "Failed to record sale.");
        }

        const newSpentAmount = (Number(targetPatient.spent_amount) || 0) + totalAmount;
        if (targetPatient.id) {
          onCustomerSpentChange?.(targetPatient.id, newSpentAmount);
        }

        await fetchProductSalesHistory();
        await onRefreshProducts();
        setShowSellProductModal(false);
        setSelectedSellProduct(null);
        alert(`Sale confirmed! ${sellQuantity} x ${selectedSellProduct.name} recorded for ${targetPatient.name}.`);
      } catch (err: any) {
        console.error("Error completing product sale:", err);
        alert(err.message || "An error occurred while confirming the sale.");
      } finally {
        setSubmittingSellProduct(false);
      }
    };

    return (
      <div className="space-y-6">
        {/* Stats Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-[28px] bg-white p-5 border border-[#E6E9EB] shadow-sm flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EBF0E6] text-[#414E36]">
              <ShoppingBag size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#5A6A51] uppercase tracking-wider">Total Products</p>
              <p className="text-2xl font-bold text-[#1F251A]">{products.length}</p>
            </div>
          </div>

          <div className="rounded-[28px] bg-white p-5 border border-[#E6E9EB] shadow-sm flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100">
              <CheckCircle size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#5A6A51] uppercase tracking-wider">Active Catalog</p>
              <p className="text-2xl font-bold text-[#1F251A]">
                {products.filter((p) => p.status === "Active").length}
              </p>
            </div>
          </div>

          <div className="rounded-[28px] bg-white p-5 border border-[#E6E9EB] shadow-sm flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 border border-amber-100">
              <AlertTriangle size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#5A6A51] uppercase tracking-wider">Low Stock Alerts</p>
              <p className="text-2xl font-bold text-amber-700">
                {products.filter((p) => p.stock_quantity <= p.min_reorder_quantity).length}
              </p>
            </div>
          </div>

          <div className="rounded-[28px] bg-white p-5 border border-[#E6E9EB] shadow-sm flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 border border-blue-100">
              <Package size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#5A6A51] uppercase tracking-wider">Stock Valuation</p>
              <p className="text-xl font-bold text-[#1F251A]">
                EGP {products.reduce((sum, p) => sum + (p.stock_quantity * p.purchase_price), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {/* Main Container */}
        <div className="rounded-[40px] bg-[#FBFBF9] p-6 shadow-[0_30px_80px_rgba(47,61,41,0.07)] border border-[#E6E9EB] space-y-6">
          {/* Sub-tabs for Catalog vs Sales History */}
          <div className="flex items-center gap-1.5 p-1 bg-[#F2EFE9] rounded-xl w-fit mb-6">
            <button
              type="button"
              onClick={() => setProductSubTab("catalog")}
              className={`text-xs font-bold transition px-3.5 py-1.5 rounded-lg ${
                productSubTab === "catalog"
                  ? "bg-[#414E36] text-[#FBFBF9] shadow-xs font-bold"
                  : "text-[#5A6A51] hover:text-[#414E36]"
              }`}
            >
              Products Catalog ({filteredInventoryProducts.length})
            </button>
            <button
              type="button"
              onClick={() => setProductSubTab("sales_history")}
              className={`text-xs font-bold transition px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 ${
                productSubTab === "sales_history"
                  ? "bg-[#414E36] text-[#FBFBF9] shadow-xs font-bold"
                  : "text-[#5A6A51] hover:text-[#414E36]"
              }`}
            >
              <Receipt size={14} /> Product Sales History ({productSalesHistory.length})
            </button>
          </div>

          {productSubTab === "catalog" ? (
            <>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-[#1F251A]">Medical Consumables &amp; Products</h3>
                  <p className="text-xs text-[#5A6A51]">Manage injectable stock, skincare supplies, cost price, selling price, and sell products directly to patients.</p>
                </div>

                {/* Search & Filter controls */}
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  <div className="relative flex-1 md:w-64">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5A6A51]" />
                    <input
                      type="text"
                      placeholder="Search by name, SKU..."
                      value={productSearchQuery}
                      onChange={(e) => setProductSearchQuery(e.target.value)}
                      className="w-full rounded-2xl border border-[#E6E9EB] bg-white py-2 pl-9 pr-4 text-xs text-[#1F251A] focus:border-[#414E36] focus:outline-none"
                    />
                  </div>

                  <select
                    value={productCategoryFilter}
                    onChange={(e) => setProductCategoryFilter(e.target.value)}
                    className="rounded-2xl border border-[#E6E9EB] bg-white py-2 px-3 text-xs text-[#1F251A] focus:border-[#414E36] focus:outline-none"
                  >
                    <option value="All">All Categories</option>
                    <option value="Injectables">Injectables</option>
                    <option value="Skincare">Skincare</option>
                    <option value="Supplies">Supplies</option>
                    <option value="Equipment">Equipment</option>
                    <option value="General">General</option>
                  </select>

                  <select
                    value={productStatusFilter}
                    onChange={(e) => setProductStatusFilter(e.target.value)}
                    className="rounded-2xl border border-[#E6E9EB] bg-white py-2 px-3 text-xs text-[#1F251A] focus:border-[#414E36] focus:outline-none"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Out of Stock">Out of Stock</option>
                    <option value="Discontinued">Discontinued</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      resetProductForm();
                      setShowAddProductModal(true);
                    }}
                    className={`${canManage ? "inline-flex" : "hidden"} items-center gap-1.5 rounded-2xl bg-[#414E36] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#2e3a26]`}
                  >
                    <Plus size={14} /> Add Item
                  </button>
                </div>
              </div>

              {/* Table View */}
              <div className="overflow-hidden rounded-[32px] border border-[#E6E9EB] bg-white">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="border-b border-[#E6E9EB] bg-[#F7F7F9] text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5A6A51]">
                      <th className="px-6 py-4 text-left">Product Item &amp; SKU</th>
                      <th className="px-6 py-4 text-left">Category &amp; Unit</th>
                      <th className="px-6 py-4 text-right">Cost Price</th>
                      <th className="px-6 py-4 text-right">Selling Price</th>
                      <th className="px-6 py-4 text-center">Stock Level</th>
                      <th className="px-6 py-4 text-left">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6E9EB] text-[#414E36]">
                    {filteredInventoryProducts.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-[#5A6A51]">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <ShoppingBag size={32} className="text-[#A3B19B]" />
                            <p className="font-semibold text-[#1F251A]">No products found</p>
                            <p className="text-xs text-[#5A6A51]">Try adjusting your search query or add a new product item.</p>
                            <button
                              type="button"
                              onClick={() => {
                                resetProductForm();
                                setShowAddProductModal(true);
                              }}
                              className={`mt-2 ${canManage ? "inline-flex" : "hidden"} items-center gap-1.5 rounded-2xl bg-[#414E36] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#2e3a26] cursor-pointer`}
                            >
                              <Plus size={14} /> Add Item
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredInventoryProducts.map((prod) => {
                        const isLowStock = prod.stock_quantity <= prod.min_reorder_quantity;
                        return (
                          <tr key={prod.id} className="transition hover:bg-[#F9F9F7]">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EBF0E6] text-[#414E36] font-bold">
                                  <ShoppingBag size={18} />
                                </div>
                                <div>
                                  <p className="font-semibold text-[#1F251A]">{prod.name}</p>
                                  {prod.name_ar && (
                                    <p className="text-xs text-[#5A6A51] dir-rtl font-sans">{prod.name_ar}</p>
                                  )}
                                  {prod.sku && (
                                    <span className="inline-block mt-0.5 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-mono text-gray-600">
                                      SKU: {prod.sku}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center rounded-full bg-[#EBF0E6] px-2.5 py-0.5 text-xs font-medium text-[#414E36]">
                                {prod.category}
                              </span>
                              <p className="text-xs text-[#5A6A51] mt-1 font-mono">Unit: {prod.unit}</p>
                            </td>
                            <td className="px-6 py-4 text-right font-mono font-semibold text-[#1F251A]">
                              EGP {prod.purchase_price.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 text-right font-mono font-semibold text-[#414E36]">
                              EGP {prod.selling_price.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="inline-flex flex-col items-center">
                                <span className={`font-mono font-bold ${isLowStock ? "text-amber-700" : "text-[#1F251A]"}`}>
                                  {prod.stock_quantity} {prod.unit}s
                                </span>
                                {isLowStock && (
                                  <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 border border-amber-200">
                                    <AlertTriangle size={10} /> Reorder (Min {prod.min_reorder_quantity})
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                  prod.status === "Active"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : prod.status === "Out of Stock"
                                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                                    : "bg-gray-100 text-gray-600 border border-gray-200"
                                }`}
                              >
                                {prod.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleOpenSellProductModal(prod)}
                                  disabled={prod.stock_quantity <= 0 || prod.role === "consumable"}
                                  className={`${canManage ? "inline-flex" : "hidden"} items-center gap-1 rounded-xl bg-[#414E36] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#2e3a26] disabled:opacity-40 disabled:cursor-not-allowed`}
                                  title={prod.role === "consumable" ? "Consumable Only (Used in services only, not for retail sale)" : prod.stock_quantity <= 0 ? "Out of Stock" : "Sell Product"}
                                >
                                  <Tag size={13} /> {prod.role === "consumable" ? "Consumable Only" : "Sell Product"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openEditProductModal(prod)}
                                  className={`${canManage ? "inline-flex" : "hidden"} rounded-xl border border-[#E6E9EB] p-2 text-[#5A6A51] transition hover:bg-[#EBF0E6] hover:text-[#414E36]`}
                                  title="Edit Product"
                                >
                                  <Pencil size={15} />
                                </button>
                                {canManage && isSuperadmin ? (
                                  <>
                                    <button
                                      type="button"
                                      data-testid={`soft-delete-product-${prod.id}`}
                                      onClick={() => requestDeleteProduct(prod.id, prod.name, "soft")}
                                      className="inline-flex rounded-xl border border-amber-200 p-2 text-amber-600 transition hover:bg-amber-50 hover:text-amber-700"
                                      title="Soft Delete (hide, reversible)"
                                    >
                                      <Archive size={15} />
                                    </button>
                                    <button
                                      type="button"
                                      data-testid={`hard-delete-product-${prod.id}`}
                                      onClick={() => requestDeleteProduct(prod.id, prod.name, "hard")}
                                      className="inline-flex rounded-xl border border-rose-100 p-2 text-rose-600 transition hover:bg-rose-50 hover:text-rose-700"
                                      title="Permanently Delete (superadmin only)"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </>
                                ) : canManage ? (
                                  <button
                                    type="button"
                                    data-testid={`soft-delete-product-${prod.id}`}
                                    onClick={() => requestDeleteProduct(prod.id, prod.name, "soft")}
                                    className="inline-flex rounded-xl border border-rose-100 p-2 text-rose-600 transition hover:bg-rose-50 hover:text-rose-700"
                                    title="Delete Product"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            /* PRODUCT SALES HISTORY TAB */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-[#1F251A]">Product Sales History</h3>
                  <p className="text-xs text-[#5A6A51]">Complete log of all products sold to clinic patients.</p>
                </div>
              </div>

              <div className="overflow-hidden rounded-[32px] border border-[#E6E9EB] bg-white">
                <table className="w-full min-w-[800px] text-sm">
                  <thead>
                    <tr className="border-b border-[#E6E9EB] bg-[#F7F7F9] text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5A6A51]">
                      <th className="px-6 py-4 text-left">Date &amp; Time</th>
                      <th className="px-6 py-4 text-left">Product</th>
                      <th className="px-6 py-4 text-left">Patient Details</th>
                      <th className="px-6 py-4 text-center">Qty</th>
                      <th className="px-6 py-4 text-right">Unit Price</th>
                      <th className="px-6 py-4 text-right">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6E9EB] text-[#414E36]">
                    {productSalesHistory.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-[#5A6A51]">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Receipt size={32} className="text-[#A3B19B]" />
                            <p className="font-semibold text-[#1F251A]">No sales recorded yet</p>
                            <p className="text-xs text-[#5A6A51]">Products sold to patients will appear here automatically.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      productSalesHistory.map((sale) => (
                        <tr key={sale.id} className="transition hover:bg-[#F9F9F7]">
                          <td className="px-6 py-4 font-mono text-xs text-[#5A6A51]">
                            {new Date(sale.created_at).toLocaleString(undefined, {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-semibold text-[#1F251A]">{sale.product_name}</p>
                            {sale.product_sku && (
                              <span className="inline-block mt-0.5 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-mono text-gray-600">
                                SKU: {sale.product_sku}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-semibold text-[#1F251A]">{sale.customer_name}</p>
                            <p className="text-xs text-[#5A6A51] font-mono">{sale.customer_mobile}</p>
                          </td>
                          <td className="px-6 py-4 text-center font-bold font-mono text-[#1F251A]">
                            {sale.quantity}
                          </td>
                          <td className="px-6 py-4 text-right font-mono text-xs text-[#5A6A51]">
                            EGP {(sale.unit_price || 0).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-right font-mono font-bold text-[#414E36]">
                            EGP {(sale.total_amount || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ── MODAL: ADD / EDIT PRODUCT ITEM ── */}
        {showAddProductModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="w-full max-w-2xl rounded-[36px] bg-white p-6 sm:p-8 shadow-2xl border border-[#E6E9EB] space-y-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[#E6E9EB] pb-4">
                <div>
                  <h3 className="text-2xl font-bold text-[#1F251A]">
                    {editingProduct ? "Edit Product Item" : "Add New Product Item"}
                  </h3>
                  <p className="text-xs text-[#5A6A51] mt-1">
                    Manage item details, pricing, unit of measurement, stock levels, and reorder warnings.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="rounded-full p-2 text-[#5A6A51] hover:bg-gray-100 transition"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveProduct} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#1F251A] mb-1">Product Name (English) *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Botox Type A (100U)"
                      value={prodName}
                      onChange={(e) => setProdName(e.target.value)}
                      className="w-full rounded-xl border border-[#E6E9EB] bg-white px-3.5 py-2.5 text-sm text-[#1F251A] focus:outline-none focus:ring-2 focus:ring-[#414E36]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1F251A] mb-1">Product Name (Arabic)</label>
                    <input
                      type="text"
                      placeholder="e.g. بوتوكس نوع أ"
                      value={prodNameAr}
                      onChange={(e) => setProdNameAr(e.target.value)}
                      className="w-full rounded-xl border border-[#E6E9EB] bg-white px-3.5 py-2.5 text-sm text-[#1F251A] focus:outline-none focus:ring-2 focus:ring-[#414E36] dir-rtl font-sans"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#1F251A] mb-1">SKU / Item Code</label>
                    <input
                      type="text"
                      placeholder="e.g. BTX-100U"
                      value={prodSku}
                      onChange={(e) => setProdSku(e.target.value)}
                      className="w-full rounded-xl border border-[#E6E9EB] bg-white px-3.5 py-2.5 text-sm font-mono text-[#1F251A] focus:outline-none focus:ring-2 focus:ring-[#414E36]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1F251A] mb-1">Category</label>
                    <select
                      value={prodCategory}
                      onChange={(e) => setProdCategory(e.target.value)}
                      className="w-full rounded-xl border border-[#E6E9EB] bg-white px-3.5 py-2.5 text-sm text-[#1F251A] focus:outline-none focus:ring-2 focus:ring-[#414E36]"
                    >
                      <option value="Injectables">Injectables</option>
                      <option value="Skincare">Skincare</option>
                      <option value="Supplies">Supplies</option>
                      <option value="Equipment">Equipment</option>
                      <option value="General">General</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1F251A] mb-1">Unit of Measure</label>
                    <input
                      type="text"
                      placeholder="vial, box, ml, piece"
                      value={prodUnit}
                      onChange={(e) => setProdUnit(e.target.value)}
                      className="w-full rounded-xl border border-[#E6E9EB] bg-white px-3.5 py-2.5 text-sm text-[#1F251A] focus:outline-none focus:ring-2 focus:ring-[#414E36]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#1F251A] mb-1">Cost Price (EGP) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="0.00"
                      value={prodPurchasePrice}
                      onChange={(e) => setProdPurchasePrice(e.target.value)}
                      className="w-full rounded-xl border border-[#E6E9EB] bg-white px-3.5 py-2.5 text-sm font-mono text-[#1F251A] focus:outline-none focus:ring-2 focus:ring-[#414E36]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1F251A] mb-1">Selling / Retail Price (EGP)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={prodSellingPrice}
                      onChange={(e) => setProdSellingPrice(e.target.value)}
                      className="w-full rounded-xl border border-[#E6E9EB] bg-white px-3.5 py-2.5 text-sm font-mono text-[#1F251A] focus:outline-none focus:ring-2 focus:ring-[#414E36]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#1F251A] mb-1">Stock Quantity</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={prodStockQuantity}
                      onChange={(e) => setProdStockQuantity(e.target.value)}
                      className="w-full rounded-xl border border-[#E6E9EB] bg-white px-3.5 py-2.5 text-sm font-mono text-[#1F251A] focus:outline-none focus:ring-2 focus:ring-[#414E36]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1F251A] mb-1">Min Reorder Level</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="5"
                      value={prodMinReorder}
                      onChange={(e) => setProdMinReorder(e.target.value)}
                      className="w-full rounded-xl border border-[#E6E9EB] bg-white px-3.5 py-2.5 text-sm font-mono text-[#1F251A] focus:outline-none focus:ring-2 focus:ring-[#414E36]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1F251A] mb-1">Status</label>
                    <select
                      value={prodStatus}
                      onChange={(e) => setProdStatus(e.target.value as any)}
                      className="w-full rounded-xl border border-[#E6E9EB] bg-white px-3.5 py-2.5 text-sm text-[#1F251A] focus:outline-none focus:ring-2 focus:ring-[#414E36]"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Out of Stock">Out of Stock</option>
                      <option value="Discontinued">Discontinued</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#1F251A] mb-1">Assigned Branch</label>
                    <select
                      value={prodBranchId}
                      onChange={(e) => setProdBranchId(e.target.value)}
                      className="w-full rounded-xl border border-[#E6E9EB] bg-white px-3.5 py-2.5 text-sm text-[#1F251A] focus:outline-none focus:ring-2 focus:ring-[#414E36]"
                    >
                      <option value="">All Branches / Central Warehouse</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name_en}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1F251A] mb-1">Role</label>
                    <select
                      value={prodRole}
                      onChange={(e) => setProdRole(e.target.value as any)}
                      className="w-full rounded-xl border border-[#E6E9EB] bg-white px-3.5 py-2.5 text-sm text-[#1F251A] focus:outline-none focus:ring-2 focus:ring-[#414E36]"
                    >
                      <option value="retail">Retail (sold to patients only)</option>
                      <option value="consumable">Consumable (used in services only)</option>
                      <option value="both">Both</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1F251A] mb-1">Description &amp; Storage Notes</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Keep refrigerated between 2-8°C."
                    value={prodNotes}
                    onChange={(e) => setProdNotes(e.target.value)}
                    className="w-full rounded-xl border border-[#E6E9EB] bg-white px-3.5 py-2 text-sm text-[#1F251A] focus:outline-none focus:ring-2 focus:ring-[#414E36]"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E6E9EB]">
                  <button
                    type="button"
                    onClick={() => setShowAddProductModal(false)}
                    className="rounded-2xl border border-[#E6E9EB] px-5 py-2.5 text-sm font-semibold text-[#5A6A51] hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingProduct}
                    className="rounded-2xl bg-[#414E36] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#2e3a26] transition shadow-sm disabled:opacity-50"
                  >
                    {savingProduct ? "Saving..." : editingProduct ? "Save Changes" : "Create Product"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── MODAL: DELETE / SOFT-DELETE PRODUCT CONFIRM (DEC-038) ── */}
        {productPendingDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
            <div
              role="dialog"
              aria-modal="true"
              data-testid="product-delete-modal"
              className="w-full max-w-md rounded-[32px] bg-white p-6 sm:p-8 shadow-2xl border border-[#E6E9EB] space-y-5"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl ${
                    productPendingDelete.mode === "hard" ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"
                  }`}
                >
                  {productPendingDelete.mode === "hard" ? <Trash2 size={22} /> : <Archive size={22} />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1F251A]">
                    {productPendingDelete.mode === "hard" ? "Permanently delete this product?" : "Delete this product?"}
                  </h3>
                  <p className="mt-1.5 text-sm text-[#5A6A51]">
                    {productPendingDelete.mode === "hard" ? (
                      <>
                        This will permanently erase <strong>&quot;{productPendingDelete.name}&quot;</strong> from the
                        database. This cannot be undone, and will be rejected if it has sales, purchase, or
                        consumption history attached — use soft delete for those.
                      </>
                    ) : (
                      <>
                        <strong>&quot;{productPendingDelete.name}&quot;</strong> will be hidden from the catalog and
                        every report. Its sales, stock, and consumption history are preserved.
                      </>
                    )}
                  </p>
                </div>
              </div>
              {productDeleteError && (
                <div className="flex items-start gap-2 rounded-2xl bg-rose-50 border border-rose-100 p-3 text-xs text-rose-700">
                  <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
                  <span>{productDeleteError}</span>
                </div>
              )}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  data-testid="product-delete-modal-cancel"
                  onClick={() => setProductPendingDelete(null)}
                  disabled={deletingProduct}
                  className="rounded-2xl border border-[#E6E9EB] px-5 py-2.5 text-sm font-semibold text-[#5A6A51] transition hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  data-testid="product-delete-modal-confirm"
                  onClick={confirmProductDelete}
                  disabled={deletingProduct}
                  className={`rounded-2xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition disabled:opacity-60 ${
                    productPendingDelete.mode === "hard" ? "bg-rose-600 hover:bg-rose-700" : "bg-[#414E36] hover:bg-[#2e3a26]"
                  }`}
                >
                  {deletingProduct ? "Deleting..." : productPendingDelete.mode === "hard" ? "Permanently Delete" : "Delete (Soft)"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL: SELL PRODUCT TO PATIENT ── */}
        {showSellProductModal && selectedSellProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="w-full max-w-lg rounded-[36px] bg-white p-6 sm:p-8 shadow-2xl border border-[#E6E9EB] space-y-6">
              <div className="flex items-center justify-between border-b border-[#E6E9EB] pb-4">
                <div>
                  <h3 className="text-xl font-bold text-[#1F251A]">Sell Product to Patient</h3>
                  <p className="text-xs text-[#5A6A51] mt-1">{selectedSellProduct.name} — Stock: {selectedSellProduct.stock_quantity} {selectedSellProduct.unit}s</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowSellProductModal(false);
                    setSelectedSellProduct(null);
                  }}
                  className="rounded-full p-2 text-[#5A6A51] hover:bg-gray-100 transition"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleConfirmSellProduct} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1F251A] mb-1">Select Patient *</label>
                  <select
                    required
                    value={sellCustomerId}
                    onChange={(e) => setSellCustomerId(e.target.value)}
                    className="w-full rounded-xl border border-[#E6E9EB] bg-white px-3.5 py-2.5 text-sm text-[#1F251A] focus:outline-none focus:ring-2 focus:ring-[#414E36]"
                  >
                    <option value="">-- Choose Patient --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.mobile ? `(${c.mobile})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#1F251A] mb-1">Unit Selling Price</label>
                    <input
                      type="text"
                      disabled
                      value={`EGP ${selectedSellProduct.selling_price.toFixed(2)}`}
                      className="w-full rounded-xl border border-[#E6E9EB] bg-gray-50 px-3.5 py-2.5 text-sm font-mono font-bold text-[#414E36]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1F251A] mb-1">Quantity *</label>
                    <input
                      type="number"
                      min="1"
                      max={selectedSellProduct.stock_quantity}
                      required
                      value={sellQuantity}
                      onChange={(e) => setSellQuantity(Math.max(1, Number(e.target.value)))}
                      className="w-full rounded-xl border border-[#E6E9EB] bg-white px-3.5 py-2.5 text-sm font-mono font-bold text-[#1F251A] focus:outline-none focus:ring-2 focus:ring-[#414E36]"
                    />
                  </div>
                </div>

                <div className="rounded-2xl bg-[#F7F7F9] p-4 border border-[#E6E9EB] flex items-center justify-between">
                  <div>
                    <p className="text-xs text-[#5A6A51]">Total Amount Due</p>
                    <p className="text-xs font-medium text-[#1F251A]">{sellQuantity} x EGP {selectedSellProduct.selling_price.toFixed(2)}</p>
                  </div>
                  <p className="text-xl font-bold font-mono text-[#414E36]">
                    EGP {(sellQuantity * selectedSellProduct.selling_price).toFixed(2)}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1F251A] mb-1">Payment Method</label>
                  <select
                    value={sellPaymentMethod}
                    onChange={(e) => setSellPaymentMethod(e.target.value)}
                    className="w-full rounded-xl border border-[#E6E9EB] bg-white px-3.5 py-2.5 text-sm text-[#1F251A] focus:outline-none focus:ring-2 focus:ring-[#414E36]"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Visa / Card">Visa / Card</option>
                    <option value="InstaPay">InstaPay</option>
                    <option value="Vodafone Cash">Vodafone Cash</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1F251A] mb-1">Notes / Instructions</label>
                  <input
                    type="text"
                    placeholder="e.g. Recommended usage twice daily after cleansing"
                    value={sellNotes}
                    onChange={(e) => setSellNotes(e.target.value)}
                    className="w-full rounded-xl border border-[#E6E9EB] bg-white px-3.5 py-2 text-sm text-[#1F251A] focus:outline-none focus:ring-2 focus:ring-[#414E36]"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E6E9EB]">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSellProductModal(false);
                      setSelectedSellProduct(null);
                    }}
                    className="rounded-2xl border border-[#E6E9EB] px-5 py-2.5 text-sm font-semibold text-[#5A6A51] hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingSellProduct}
                    className="rounded-2xl bg-[#414E36] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#2e3a26] transition shadow-sm disabled:opacity-50"
                  >
                    {submittingSellProduct ? "Recording Sale..." : "Confirm & Sell"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }
);

export default InventoryProductsTab;
