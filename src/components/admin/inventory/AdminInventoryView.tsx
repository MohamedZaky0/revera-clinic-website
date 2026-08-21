"use client";

import { useRef, useState } from "react";
import { Gauge, ShoppingBag, Truck, Plus, ClipboardList } from "lucide-react";
import InventoryDevicesTab, { type InventoryDevicesTabRef } from "./InventoryDevicesTab";
import InventoryProductsTab, { type InventoryProductsTabRef } from "./InventoryProductsTab";
import SupplierManagementScreen from "./SupplierManagementScreen";

type Branch = { id: string; name_en: string };

type Customer = {
  id?: string;
  name: string;
  mobile?: string;
  phone?: string;
  spent_amount?: number;
};

type Props = {
  authHeaders: Record<string, string>;
  branches: Branch[];
  customers: Customer[];
  products: any[];
  canManageDevices: boolean;
  canManageProducts: boolean;
  canManageSuppliers: boolean;
  isSuperadmin: boolean;
  onRefreshProducts: () => Promise<void> | void;
  onCustomerSpentChange?: (customerId: string, newSpentAmount: number) => void;
  productsTabRef?: React.Ref<InventoryProductsTabRef>;
};

export default function AdminInventoryView({
  authHeaders,
  branches,
  customers,
  products,
  canManageDevices,
  canManageProducts,
  canManageSuppliers,
  isSuperadmin,
  onRefreshProducts,
  onCustomerSpentChange,
  productsTabRef,
}: Props) {
  const [inventorySubTab, setInventorySubTab] = useState<"devices" | "products" | "suppliers">("devices");
  const [deviceCount, setDeviceCount] = useState(0);
  const [productCount, setProductCount] = useState(0);
  const devicesTabRef = useRef<InventoryDevicesTabRef>(null);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-4xl font-semibold text-[#1F251A]">Inventory &amp; Clinic Equipment</h2>
          <p className="mt-2 text-sm text-[#5A6A51]">Manage clinic devices, track pulse counts, configure maintenance alerts, and monitor stock.</p>
        </div>
        <div className="flex items-center gap-3">
          {inventorySubTab === "devices" && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  devicesTabRef.current?.openAuditLogs();
                }}
                className={`${canManageDevices ? "inline-flex" : "hidden"} items-center gap-2 rounded-3xl border border-[#414E36]/30 bg-white px-4 py-2.5 text-xs font-semibold text-[#414E36] transition hover:bg-[#EBF0E6] shadow-sm`}
              >
                <ClipboardList size={15} /> Audit Logs
              </button>
              <button
                type="button"
                onClick={() => {
                  devicesTabRef.current?.openAddDevice();
                }}
                className={`${canManageDevices ? "inline-flex" : "hidden"} items-center gap-2 rounded-3xl bg-[#414E36] px-5 py-2.5 text-xs font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26] shadow-sm`}
              >
                <Plus size={15} /> Add Device
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 bg-white rounded-2xl border border-[#414E36]/10 shadow-xs overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setInventorySubTab("devices")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 outline-none shrink-0 ${
            inventorySubTab === "devices"
              ? "bg-[#414E36] text-[#FBFBF9] font-bold shadow-xs"
              : "text-[#5A6A51] hover:text-[#414E36] hover:bg-[#F2EFE9]/60"
          }`}
        >
          <Gauge size={15} /> Clinic Devices &amp; Pulse Track
          <span className={`ml-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
            inventorySubTab === "devices" ? "bg-white/20 text-[#FBFBF9]" : "bg-[#EDF1EC] text-[#414E36]"
          }`}>
            {deviceCount}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setInventorySubTab("products")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 outline-none shrink-0 ${
            inventorySubTab === "products"
              ? "bg-[#414E36] text-[#FBFBF9] font-bold shadow-xs"
              : "text-[#5A6A51] hover:text-[#414E36] hover:bg-[#F2EFE9]/60"
          }`}
        >
          <ShoppingBag size={15} /> Products &amp; Supplies
          <span className={`ml-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
            inventorySubTab === "products" ? "bg-white/20 text-[#FBFBF9]" : "bg-[#EDF1EC] text-[#414E36]"
          }`}>
            {productCount}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setInventorySubTab("suppliers")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 outline-none shrink-0 ${
            inventorySubTab === "suppliers"
              ? "bg-[#414E36] text-[#FBFBF9] font-bold shadow-xs"
              : "text-[#5A6A51] hover:text-[#414E36] hover:bg-[#F2EFE9]/60"
          }`}
        >
          <Truck size={15} /> Suppliers
        </button>
      </div>

      {/* TAB 1: CLINIC DEVICES */}
      {inventorySubTab === "devices" && (
        <InventoryDevicesTab
          ref={devicesTabRef}
          authHeaders={authHeaders}
          branches={branches}
          canManage={canManageDevices}
          onDeviceCountChange={setDeviceCount}
        />
      )}

      {/* TAB 2: PRODUCTS & SUPPLIES */}
      {inventorySubTab === "products" && (
        <InventoryProductsTab
          ref={productsTabRef}
          authHeaders={authHeaders}
          branches={branches}
          customers={customers}
          products={products}
          canManage={canManageProducts}
          isSuperadmin={isSuperadmin}
          onRefreshProducts={onRefreshProducts}
          onProductCountChange={setProductCount}
          onCustomerSpentChange={onCustomerSpentChange}
        />
      )}

      {/* TAB 3: SUPPLIERS & PURCHASES */}
      {inventorySubTab === "suppliers" && (
        <div className="rounded-[40px] bg-[#FBFBF9] p-6 shadow-[0_30px_80px_rgba(47,61,41,0.07)] border border-[#E6E9EB]">
          <SupplierManagementScreen authHeaders={authHeaders} canManage={canManageSuppliers} />
        </div>
      )}
    </div>
  );
}
