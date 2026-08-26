"use client";

import React, { useState } from "react";
import { X, AlertCircle } from "lucide-react";
import { adminTranslations } from "@/components/admin/translations";

interface DoctorStatusModalProps {
  doctor: any;
  onClose: () => void;
  onSave: (doctor: any, newStatus: boolean) => Promise<void>;
  lang: "en" | "ar";
  t: typeof adminTranslations["en"]["doctors"]["doctorStatusModal"];
}

export default function DoctorStatusModal({
  doctor,
  onClose,
  onSave,
  lang,
  t,
}: DoctorStatusModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<boolean>(doctor?.active !== false);
  const [saving, setSaving] = useState<boolean>(false);

  if (!doctor) return null;

  const doctorName = doctor.name || "Doctor";
  const doctorSpecialty = doctor.specialty || doctor.department || "General Specialist";
  const initial = doctorName.replace(/^Dr\.\s*/i, "").charAt(0).toUpperCase() || "D";

  async function handleConfirmSave() {
    setSaving(true);
    try {
      await onSave(doctor, selectedStatus);
      onClose();
    } catch (err) {
      console.error("Failed to save doctor status:", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      dir={lang === "ar" ? "rtl" : "ltr"}
      className="fixed inset-0 z-50 flex items-center justify-center bg-transparent p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-[0_25px_70px_rgba(0,0,0,0.18)] flex flex-col gap-4.5 text-start border border-[#414E36]/15"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-[#1F251A]">{t.title}</h3>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-full p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Doctor Info Card */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-[#1F251A]">{t.doctorLabel}</span>
          <div className="flex items-center gap-3.5 rounded-2xl border border-[#414E36]/10 bg-[#F9F9F7] p-3.5">
            <div className="h-10 w-10 rounded-full bg-[#E5EAE3] text-[#414E36] flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden border border-[#414E36]/10">
              {doctor.avatar_url || doctor.image ? (
                <img src={doctor.avatar_url || doctor.image} alt={doctorName} className="h-full w-full object-cover" />
              ) : (
                <span>{initial}</span>
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-[#1F251A] text-sm leading-tight truncate">{doctorName}</span>
              <span className="text-xs text-[#5A6A51] truncate mt-0.5">{doctorSpecialty}</span>
            </div>
          </div>
        </div>

        {/* Account Status Section */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-[#1F251A]">{t.accountStatusLabel}</span>
          <div className="grid grid-cols-2 gap-3">
            {/* Active Card */}
            <div
              onClick={() => setSelectedStatus(true)}
              className={`flex flex-col gap-2 rounded-2xl border p-4 cursor-pointer transition select-none ${
                selectedStatus === true
                  ? "border-[#414E36] bg-[#F2F5F0] ring-1 ring-[#414E36]"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`flex h-4.5 w-4.5 items-center justify-center rounded-full border ${
                  selectedStatus === true ? "border-[#414E36] bg-white" : "border-gray-300 bg-white"
                }`}>
                  {selectedStatus === true && <div className="h-2.5 w-2.5 rounded-full bg-[#414E36]" />}
                </div>
                <span className="text-sm font-bold text-[#1F251A]">{t.active}</span>
              </div>
              <p className="text-[11px] leading-tight text-[#5A6A51]">
                {t.activeDescription}
              </p>
            </div>

            {/* Inactive Card */}
            <div
              onClick={() => setSelectedStatus(false)}
              className={`flex flex-col gap-2 rounded-2xl border p-4 cursor-pointer transition select-none ${
                selectedStatus === false
                  ? "border-[#414E36] bg-[#F2F5F0] ring-1 ring-[#414E36]"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`flex h-4.5 w-4.5 items-center justify-center rounded-full border ${
                  selectedStatus === false ? "border-[#414E36] bg-white" : "border-gray-300 bg-white"
                }`}>
                  {selectedStatus === false && <div className="h-2.5 w-2.5 rounded-full bg-[#414E36]" />}
                </div>
                <span className="text-sm font-bold text-[#1F251A]">{t.inactive}</span>
              </div>
              <p className="text-[11px] leading-tight text-[#5A6A51]">
                {t.inactiveDescription}
              </p>
            </div>
          </div>
        </div>

        {/* Notice Alert Banner */}
        <div className="flex items-center gap-2.5 rounded-2xl border border-[#FDE68A] bg-[#FFF9EE] px-3.5 py-3 text-[#92400E]">
          <AlertCircle size={16} className="text-[#D97706] shrink-0" />
          <span className="text-xs font-medium leading-normal">
            {t.inactiveWarning}
          </span>
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-xs font-bold text-[#1F251A] hover:bg-gray-50 transition cursor-pointer disabled:opacity-50"
          >
            {t.cancelBtn}
          </button>
          <button
            type="button"
            onClick={handleConfirmSave}
            disabled={saving}
            className="rounded-xl bg-[#37442D] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#2A3423] shadow-sm transition cursor-pointer disabled:opacity-50 flex items-center justify-center min-w-[72px]"
          >
            {saving ? t.savingBtn : t.saveBtn}
          </button>
        </div>
      </div>
    </div>
  );
}
