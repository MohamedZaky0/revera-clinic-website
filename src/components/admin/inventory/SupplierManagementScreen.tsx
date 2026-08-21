"use client";

import { useState } from "react";
import { Truck, PackageCheck } from "lucide-react";
import SuppliersScreen from "./SuppliersScreen";
import PurchasesScreen from "./PurchasesScreen";

type Props = {
  authHeaders: Record<string, string>;
  canManage?: boolean;
};

export default function SupplierManagementScreen({ authHeaders, canManage = true }: Props) {
  const [tab, setTab] = useState<"suppliers" | "purchases">("suppliers");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1.5 p-1 bg-[#F2EFE9] rounded-xl w-fit mb-2">
        <button
          type="button"
          onClick={() => setTab("suppliers")}
          className={`flex items-center gap-1.5 text-xs font-bold transition px-3.5 py-1.5 rounded-lg ${
            tab === "suppliers"
              ? "bg-[#414E36] text-[#FBFBF9] shadow-xs font-bold"
              : "text-[#5A6A51] hover:text-[#414E36]"
          }`}
        >
          <Truck size={14} /> Suppliers
        </button>
        <button
          type="button"
          onClick={() => setTab("purchases")}
          className={`flex items-center gap-1.5 text-xs font-bold transition px-3.5 py-1.5 rounded-lg ${
            tab === "purchases"
              ? "bg-[#414E36] text-[#FBFBF9] shadow-xs font-bold"
              : "text-[#5A6A51] hover:text-[#414E36]"
          }`}
        >
          <PackageCheck size={14} /> Purchases
        </button>
      </div>

      {tab === "suppliers" ? (
        <SuppliersScreen authHeaders={authHeaders} canManage={canManage} />
      ) : (
        <PurchasesScreen authHeaders={authHeaders} canManage={canManage} />
      )}
    </div>
  );
}
