"use client";

import { X } from "lucide-react";
import { Branch } from "@/types";
import { UseProviderFormReturn } from "@/components/admin/doctor/useProviderForm";
import ProviderFormFields from "@/components/admin/doctor/ProviderFormFields";
import { adminTranslations } from "@/components/admin/translations";

interface ProviderFormModalProps {
  providerForm: UseProviderFormReturn;
  branches: Branch[];
  allServicesList: { id: number; en: string; ar?: string }[];
  getDoctorFirstReservationDate: (docName: string, resList: any[]) => string | null;
  allReservations: any[];
  parseEgyptianNationalId: (id: string) => {
    isValid: boolean;
    reason?: string;
    age: number | null;
    dobIso: string | null;
    dobFormatted: string | null;
    gender: string | null;
    governorate: string | null;
  };
  lang: "en" | "ar";
  t: typeof adminTranslations["en"]["doctors"]["providerFormModal"];
  tFormFields: typeof adminTranslations["en"]["doctors"]["providerFormFields"];
}

export default function ProviderFormModal({
  providerForm,
  branches,
  allServicesList,
  getDoctorFirstReservationDate,
  allReservations,
  parseEgyptianNationalId,
  lang,
  t,
  tFormFields,
}: ProviderFormModalProps) {
  const {
    showProviderModal,
    setShowProviderModal,
    providerModalMode,
    savingProvider,
    handleSaveProvider,
  } = providerForm;

  if (!showProviderModal) return null;

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F251A]/50 p-4 animate-fadeIn">
      <div className="w-full max-w-xl rounded-[32px] bg-[#FBFBF9] p-6 shadow-[0_20px_60px_rgba(31,37,26,0.25)] max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="mb-5 flex items-center justify-between border-b border-[#414E36]/10 pb-4 shrink-0">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-[#5A6A51]/80 font-bold">
              {providerModalMode === "edit" ? t.editHeaderLabel : t.addHeaderLabel}
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-[#1F251A]">
              {providerModalMode === "edit" ? t.editTitle : t.addTitle}
            </h3>
          </div>
          <button
            onClick={() => setShowProviderModal(false)}
            className="rounded-full bg-[#F2EFE9] p-2.5 text-[#414E36] transition hover:bg-[#e4e0d6]"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto space-y-5 pe-1">
          <ProviderFormFields
            providerForm={providerForm}
            branches={branches}
            allServicesList={allServicesList}
            getDoctorFirstReservationDate={getDoctorFirstReservationDate}
            allReservations={allReservations}
            parseEgyptianNationalId={parseEgyptianNationalId}
            lang={lang}
            t={tFormFields}
          />
        </div>

        {/* Footer Actions */}
        <div className="border-t border-[#414E36]/10 pt-4 mt-4 flex gap-3 shrink-0">
          <button
            onClick={handleSaveProvider}
            disabled={savingProvider}
            className="flex-1 rounded-3xl bg-[#414E36] py-3 text-sm font-bold text-[#FBFBF9] hover:bg-[#2e3a26] disabled:opacity-50 text-center"
          >
            {savingProvider ? t.savingBtn : providerModalMode === "edit" ? t.saveChangesBtn : t.addProviderBtn}
          </button>
          <button
            onClick={() => setShowProviderModal(false)}
            className="flex-1 rounded-3xl border border-[#414E36]/20 bg-[#fff] py-3 text-sm font-bold text-[#414E36] hover:bg-[#f7f6f2] text-center"
          >
            {t.cancelBtn}
          </button>
        </div>

      </div>
    </div>
  );
}
