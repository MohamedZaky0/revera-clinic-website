"use client";

import { Plus, X, MapIcon } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { Branch } from "@/types";
import { adminTranslations } from "@/components/admin/translations";

type BranchModalState = { open: boolean; mode: "add" | "edit"; branch: Partial<Branch> };

interface BranchesViewProps {
  branches: Branch[];
  loadingBranches: boolean;
  branchModal: BranchModalState;
  setBranchModal: Dispatch<SetStateAction<BranchModalState>>;
  savingBranch: boolean;
  deletingBranchId: string | null;
  toggleBranchStatus: (br: Branch) => Promise<void>;
  deleteBranch: (br: Branch) => Promise<void>;
  saveBranchFromModal: () => Promise<boolean>;
  lang: "en" | "ar";
  t: (typeof adminTranslations)["en"]["settingsScreens"]["branches"];
}

export default function BranchesView({
  branches,
  loadingBranches,
  branchModal,
  setBranchModal,
  savingBranch,
  deletingBranchId,
  toggleBranchStatus,
  deleteBranch,
  saveBranchFromModal,
  lang,
  t,
}: BranchesViewProps) {
  return (
    <div className="space-y-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-semibold text-[#1F251A]">{t.title}</h2>
          <p className="mt-2 text-sm text-[#5A6A51]">{t.subtitle}</p>
        </div>
        <button
          onClick={() => setBranchModal({ open: true, mode: "add", branch: { status: "active", sort_order: branches.length } })}
          className="inline-flex items-center gap-2 rounded-3xl bg-[#414E36] px-5 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26]"
        >
          <Plus size={16} /> {t.addBranch}
        </button>
      </div>

      {loadingBranches ? (
        <div className="text-center py-16 text-[#5A6A51]">{t.loading}</div>
      ) : branches.length === 0 ? (
        <div className="text-center py-16 text-[#5A6A51]">
          <MapIcon size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">{t.noBranches}</p>
        </div>
      ) : (
        <div className="rounded-[40px] bg-[#FBFBF9] p-6 shadow-[0_30px_80px_rgba(47,61,41,0.07)] grid gap-6 md:grid-cols-2">
          {branches.map((br) => (
            <div key={br.id} className="rounded-[32px] border border-[#E6E9EB] bg-white p-6 shadow-sm flex flex-col justify-between min-h-[180px]">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-[#1F251A] text-base">{lang === "ar" ? br.name_ar : br.name_en}</h3>
                  <span className={`shrink-0 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    br.status === "active" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
                  }`}>{br.status === "active" ? t.active : t.inactive}</span>
                </div>
                <p className="text-xs text-[#5A6A51] mt-1">{lang === "ar" ? br.name_en : br.name_ar}</p>
                <p className="text-xs text-[#5A6A51] mt-2 leading-relaxed">{br.address_en}</p>
                {br.phone && <p className="text-xs text-[#5A6A51] mt-1">{br.phone}</p>}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-[#F2EFE9] pt-4 gap-2">
                <button
                  onClick={() => toggleBranchStatus(br)}
                  className="text-xs font-semibold text-[#5A6A51] hover:text-[#414E36] border border-[#E6E9EB] rounded-full px-3 py-1 transition"
                >
                  {br.status === "active" ? t.setInactive : t.setActive}
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => setBranchModal({ open: true, mode: "edit", branch: { ...br } })}
                    className="text-xs font-bold text-[#414E36] hover:underline"
                  >{t.edit}</button>
                  <button
                    onClick={() => deleteBranch(br)}
                    className="text-xs font-bold text-red-500 hover:underline disabled:opacity-50"
                    disabled={deletingBranchId === br.id}
                  >{deletingBranchId === br.id ? t.deleting : t.delete}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Branch Add/Edit Modal */}
      {branchModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-semibold text-[#1F251A]">
                {branchModal.mode === "add" ? t.addBranch : t.editBranch}
              </h3>
              <button onClick={() => setBranchModal({ open: false, mode: "add", branch: {} })} className="p-2 rounded-full hover:bg-[#F2EFE9]">
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await saveBranchFromModal();
              }}
              className="space-y-4"
            >
              {([
                { field: "name_en", label: t.fields.nameEn, placeholder: "e.g. New Cairo Branch", required: true },
                { field: "name_ar", label: t.fields.nameAr, placeholder: "مثال: فرع القاهرة الجديدة", required: true, dir: "rtl" },
                { field: "address_en", label: t.fields.addressEn, placeholder: "e.g. 5th Settlement, New Cairo", required: true },
                { field: "address_ar", label: t.fields.addressAr, placeholder: "مثال: التجمع الخامس، القاهرة الجديدة", required: true, dir: "rtl" },
                { field: "phone", label: t.fields.phone, placeholder: "e.g. +201035595691" },
                { field: "maps_embed", label: t.fields.mapsEmbed, placeholder: "https://www.google.com/maps/embed?pb=…" },
                { field: "maps_link", label: t.fields.mapsLink, placeholder: "https://maps.app.goo.gl/…" },
              ] as Array<{ field: keyof Branch; label: string; placeholder: string; required?: boolean; dir?: string }>).map(({ field, label, placeholder, required, dir }) => (
                <div key={field}>
                  <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-[#5A6A51] mb-1.5">{label}</label>
                  <input
                    type="text"
                    required={required}
                    dir={dir}
                    placeholder={placeholder}
                    value={(branchModal.branch[field] as string) ?? ""}
                    onChange={(e) => setBranchModal(prev => ({ ...prev, branch: { ...prev.branch, [field]: e.target.value } }))}
                    className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm text-[#1F251A] outline-none focus:border-[#414E36] transition"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-[#5A6A51] mb-1.5">{t.status}</label>
                <select
                  value={branchModal.branch.status ?? "active"}
                  onChange={(e) => setBranchModal(prev => ({ ...prev, branch: { ...prev.branch, status: e.target.value as "active" | "inactive" } }))}
                  className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm text-[#1F251A] outline-none"
                >
                  <option value="active">{t.active}</option>
                  <option value="inactive">{t.inactive}</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={savingBranch}
                className="w-full rounded-3xl bg-[#414E36] py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26] disabled:opacity-50 mt-2"
              >
                {savingBranch ? t.savingBtn : branchModal.mode === "add" ? t.addBranch : t.saveChanges}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
