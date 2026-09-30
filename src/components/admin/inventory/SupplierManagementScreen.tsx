"use client";

import { useState } from "react";
import { Truck, PackageCheck } from "lucide-react";
import SuppliersScreen from "./SuppliersScreen";
import PurchasesScreen from "./PurchasesScreen";
import { adminTranslations } from "../translations";

type Props = {
  authHeaders: Record<string, string>;
  canManage?: boolean;
  lang: "en" | "ar";
  t: typeof adminTranslations["en"]["inventory"];
};

export default function SupplierManagementScreen({ authHeaders, canManage = true, lang, t }: Props) {
  const [tab, setTab] = useState<"suppliers" | "purchases">("suppliers");

  return (
    <div className="space-y-6" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="flex items-center gap-1.5 p-1 bg-[var(--color-brand-sand)] rounded-xl w-fit mb-2">
        <button
          type="button"
          onClick={() => setTab("suppliers")}
          className={`flex items-center gap-1.5 text-xs font-bold transition px-3.5 py-1.5 rounded-lg ${
            tab === "suppliers"
              ? "bg-[var(--cr-primary)] text-[var(--color-brand-light)] shadow-xs font-bold"
              : "text-[var(--color-brand-secondary)] hover:text-[var(--cr-primary)]"
          }`}
        >
          <Truck size={14} /> {t.supplierMgmt.suppliersTab}
        </button>
        <button
          type="button"
          onClick={() => setTab("purchases")}
          className={`flex items-center gap-1.5 text-xs font-bold transition px-3.5 py-1.5 rounded-lg ${
            tab === "purchases"
              ? "bg-[var(--cr-primary)] text-[var(--color-brand-light)] shadow-xs font-bold"
              : "text-[var(--color-brand-secondary)] hover:text-[var(--cr-primary)]"
          }`}
        >
          <PackageCheck size={14} /> {t.supplierMgmt.purchasesTab}
        </button>
      </div>

      {tab === "suppliers" ? (
        <SuppliersScreen authHeaders={authHeaders} canManage={canManage} lang={lang} t={t.suppliers} />
      ) : (
        <PurchasesScreen authHeaders={authHeaders} canManage={canManage} lang={lang} t={t.purchases} />
      )}
    </div>
  );
}
