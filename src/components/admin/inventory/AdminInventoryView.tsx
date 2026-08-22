"use client";

import { useRef, useState } from "react";
import { Gauge, ShoppingBag, Truck, Plus, ClipboardList } from "lucide-react";
import InventoryDevicesTab, { type InventoryDevicesTabRef } from "./InventoryDevicesTab";
import InventoryProductsTab, { type InventoryProductsTabRef } from "./InventoryProductsTab";
import SupplierManagementScreen from "./SupplierManagementScreen";
import { adminTranslations } from "../translations";

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
  lang: "en" | "ar";
  t: typeof adminTranslations["en"]["inventory"];
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
  lang,
  t,
}: Props) {
  const [inventorySubTab, setInventorySubTab] = useState<"devices" | "products" | "suppliers">("devices");
  const [deviceCount, setDeviceCount] = useState(0);
  const [productCount, setProductCount] = useState(0);
  const devicesTabRef = useRef<InventoryDevicesTabRef>(null);

  return (
    <div className="space-y-6 animate-fadeIn" dir={lang === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-4xl font-semibold text-[#1F251A]">{t.heading}</h2>
          <p className="mt-2 text-sm text-[#5A6A51]">{t.subtitle}</p>
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
                <ClipboardList size={15} /> {t.auditLogsBtn}
              </button>
              <button
                type="button"
                onClick={() => {
                  devicesTabRef.current?.openAddDevice();
                }}
                className={`${canManageDevices ? "inline-flex" : "hidden"} items-center gap-2 rounded-3xl bg-[#414E36] px-5 py-2.5 text-xs font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26] shadow-sm`}
              >
                <Plus size={15} /> {t.addDeviceBtn}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center border-b border-[#E6E9EB] gap-8">
        <button
          type="button"
          onClick={() => setInventorySubTab("devices")}
          className={`flex items-center gap-2 py-3 text-sm font-semibold border-b-2 transition ${
            inventorySubTab === "devices"
              ? "border-[#414E36] text-[#414E36]"
              : "border-transparent text-[#5A6A51] hover:text-[#1F251A]"
          }`}
        >
          <Gauge size={16} /> {t.devicesTab}
          <span className="ms-1.5 rounded-full bg-[#EBF0E6] px-2 py-0.5 text-xs text-[#414E36] font-bold">
            {deviceCount}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setInventorySubTab("products")}
          className={`flex items-center gap-2 py-3 text-sm font-semibold border-b-2 transition ${
            inventorySubTab === "products"
              ? "border-[#414E36] text-[#414E36]"
              : "border-transparent text-[#5A6A51] hover:text-[#1F251A]"
          }`}
        >
          <ShoppingBag size={16} /> {t.productsTab}
          <span className="ms-1.5 rounded-full bg-[#EBF0E6] px-2 py-0.5 text-xs text-[#414E36] font-bold">
            {productCount}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setInventorySubTab("suppliers")}
          className={`flex items-center gap-2 py-3 text-sm font-semibold border-b-2 transition ${
            inventorySubTab === "suppliers"
              ? "border-[#414E36] text-[#414E36]"
              : "border-transparent text-[#5A6A51] hover:text-[#1F251A]"
          }`}
        >
          <Truck size={16} /> {t.suppliersTab}
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
          lang={lang}
          t={t.devices}
          auditLogsT={t.auditLogs}
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
          lang={lang}
          t={t.products}
        />
      )}

      {/* TAB 3: SUPPLIERS & PURCHASES */}
      {inventorySubTab === "suppliers" && (
        <div className="rounded-[40px] bg-[#FBFBF9] p-6 shadow-[0_30px_80px_rgba(47,61,41,0.07)] border border-[#E6E9EB]">
          <SupplierManagementScreen authHeaders={authHeaders} canManage={canManageSuppliers} lang={lang} t={t} />
        </div>
      )}
    </div>
  );
}
