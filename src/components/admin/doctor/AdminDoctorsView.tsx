"use client";

import React, { useState } from "react";
import {
  ArrowLeft,
  Trash2,
  Search,
  Filter,
  ClipboardList,
  Star,
  MoreVertical,
  Pencil,
  Power,
} from "lucide-react";
import { Branch } from "@/types";
import { DoctorProfileDetailsView } from "@/components/admin/doctor/DoctorProfileDetailsView";
import { UseProviderFormReturn } from "@/components/admin/doctor/useProviderForm";
import ProviderFormFields from "@/components/admin/doctor/ProviderFormFields";
import DoctorStatusModal from "@/components/admin/doctor/DoctorStatusModal";
import { adminTranslations } from "@/components/admin/translations";

interface AdminDoctorsViewProps {
  providerForm: UseProviderFormReturn;
  branches: Branch[];
  allReservations: any[];
  localServices: any[];
  allServicesList: { id: number; en: string; ar?: string }[];
  getDoctorFirstReservationDate: (docName: string, resList: any[]) => string | null;
  parseEgyptianNationalId: (id: string) => {
    isValid: boolean;
    reason?: string;
    age: number | null;
    dobIso: string | null;
    dobFormatted: string | null;
    gender: string | null;
    governorate: string | null;
  };
  uniqueSpecialties: string[];
  filteredProviders: any[];
  expandedDoctorServices: Record<string, boolean>;
  toggleExpandedDoctorServices: (docKey: string) => void;
  activeDoctorRowMenuId: string | null;
  setActiveDoctorRowMenuId: (id: string | null | ((prev: string | null) => string | null)) => void;
  showAuditLogsModal: boolean;
  setShowAuditLogsModal: (show: boolean) => void;
  hasPermission: (perm: string) => boolean;
  lang: "en" | "ar";
  t: typeof adminTranslations["en"]["doctors"]["adminDoctorsView"];
  tFormFields: typeof adminTranslations["en"]["doctors"]["providerFormFields"];
}

export default function AdminDoctorsView({
  providerForm,
  branches,
  allReservations,
  localServices,
  allServicesList,
  getDoctorFirstReservationDate,
  parseEgyptianNationalId,
  uniqueSpecialties,
  filteredProviders,
  expandedDoctorServices,
  toggleExpandedDoctorServices,
  activeDoctorRowMenuId,
  setActiveDoctorRowMenuId,
  setShowAuditLogsModal,
  hasPermission,
  lang,
  t,
  tFormFields,
}: AdminDoctorsViewProps) {
  const {
    viewingDoctorDetails,
    setViewingDoctorDetails,
    editingDoctorInline,
    setEditingDoctorInline,
    providerFormName,
    savingProvider,
    handleSaveProvider,
    openEditProviderModal,
    handleDeleteProvider,
    handleToggleProviderStatus,
    showProviderFilterPanel,
    setShowProviderFilterPanel,
    providerFilterBranchId,
    setProviderFilterBranchId,
    providerFilterSpecialty,
    setProviderFilterSpecialty,
    providerFilterGender,
    setProviderFilterGender,
    providerSearchQuery,
    setProviderSearchQuery,
  } = providerForm;

  const [statusModalDoctor, setStatusModalDoctor] = useState<any | null>(null);

  return (
    <section dir={lang === "ar" ? "rtl" : "ltr"} className="space-y-6">
      {viewingDoctorDetails ? (
        <DoctorProfileDetailsView
          doctor={viewingDoctorDetails}
          onBack={() => setViewingDoctorDetails(null)}
          onEdit={(doc) => {
            setViewingDoctorDetails(null);
            openEditProviderModal(doc);
          }}
          reservations={allReservations}
          branches={branches}
          localServices={localServices}
        />
      ) : editingDoctorInline ? (
        <div className="space-y-6">
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setEditingDoctorInline(null)}
              className="inline-flex items-center gap-2 self-start rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-[#1F251A] shadow-xs transition hover:bg-gray-50 cursor-pointer"
            >
              <ArrowLeft size={14} /> {lang === "ar" ? "العودة لملف الطبيب" : "Back to Doctor Profile"}
            </button>
            <div>
              <h1 className="text-2xl font-bold text-[#1F251A]">{lang === "ar" ? "تعديل بيانات الطبيب" : "Edit Doctor"}</h1>
              <p className="text-xs text-[#5A6A51] mt-0.5">{lang === "ar" ? "تحديث معلومات الطبيب وتفاصيل العمل" : "Update doctor information and working details"}</p>
            </div>
          </div>

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
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-[#1F251A]">{t.doctorsHeading}</h2>
              <p className="text-xs text-[#5A6A51]">{t.doctorsSubtitle}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowAuditLogsModal(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-[#414E36]/15 bg-white px-4 py-2 text-sm font-semibold text-[#414E36] transition hover:bg-[#FBFBF9]"
              >
                <ClipboardList size={14} /> {t.auditLogsBtn}
              </button>
            </div>
          </div>

          {/* Search Bar Row above Table */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-[#5A6A51] z-10 pointer-events-none" />
              <input
                type="text"
                value={providerSearchQuery}
                onChange={(e) => setProviderSearchQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full rounded-xl border border-[#414E36]/15 bg-[#F9F9F7] py-2.5 ps-10 pe-4 text-sm outline-none transition focus:border-[#C4AE7C] focus:bg-white focus:ring-2 focus:ring-[#C4AE7C]/15"
              />
            </div>
            <button
              onClick={() => setShowProviderFilterPanel(prev => !prev)}
              title={t.filterTitle}
              className={`relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition cursor-pointer ${
                showProviderFilterPanel || providerFilterBranchId !== "All" || providerFilterSpecialty !== "All" || providerFilterGender !== "All"
                  ? "border-[#C4AE7C] bg-[#EDE4C8] text-[#414E36]"
                  : "border-[#414E36]/15 bg-white text-[#414E36] hover:bg-[#FBFBF9]"
              }`}
            >
              <Filter size={16} />
              {(providerFilterBranchId !== "All" || providerFilterSpecialty !== "All" || providerFilterGender !== "All") && (
                <span className="absolute -top-1 -end-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#414E36] text-[9px] font-bold text-white">!</span>
              )}
            </button>
          </div>

          {/* Dynamic Filters Drawer */}
          {showProviderFilterPanel && (
            <div className="mb-6 grid grid-cols-1 gap-4 rounded-3xl border border-[#414E36]/10 bg-[#F9F9F7] p-5 md:grid-cols-3 items-end shadow-sm animate-fadeIn">
              {/* Branch Dropdown */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#5A6A51]">{t.branchFilterLabel}</label>
                <select
                  value={providerFilterBranchId}
                  onChange={(e) => setProviderFilterBranchId(e.target.value)}
                  className="w-full rounded-2xl border border-[#E6E9EB] bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[#C4AE7C]"
                >
                  <option value="All">{t.allBranches}</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name_en}</option>
                  ))}
                </select>
              </div>

              {/* Specialty Dropdown */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#5A6A51]">{t.specialtyFilterLabel}</label>
                <select
                  value={providerFilterSpecialty}
                  onChange={(e) => setProviderFilterSpecialty(e.target.value)}
                  className="w-full rounded-2xl border border-[#E6E9EB] bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[#C4AE7C]"
                >
                  <option value="All">{t.allSpecialties}</option>
                  {uniqueSpecialties.map((spec) => (
                    <option key={spec} value={spec}>{spec}</option>
                  ))}
                </select>
              </div>

              {/* Gender and Clear Options */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#5A6A51]">{t.genderFilterLabel}</label>
                  <select
                    value={providerFilterGender}
                    onChange={(e) => setProviderFilterGender(e.target.value)}
                    className="w-full rounded-2xl border border-[#E6E9EB] bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[#C4AE7C]"
                  >
                    <option value="All">{t.allGenders}</option>
                    <option value="Male">{t.genderMale}</option>
                    <option value="Female">{t.genderFemale}</option>
                  </select>
                </div>
                <button
                  onClick={() => {
                    setProviderFilterBranchId("All");
                    setProviderFilterSpecialty("All");
                    setProviderFilterGender("All");
                    setProviderSearchQuery("");
                  }}
                  className="h-[42px] w-full rounded-2xl border border-red-200 bg-red-50/50 text-xs font-bold text-red-600 hover:bg-red-100/70 transition"
                >
                  {t.clearBtn}
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto rounded-2xl border border-[#414E36]/10 bg-white shadow-sm scrollbar-none">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b border-[#414E36]/10 bg-[#F9F9F7]">
                  <th className="px-5 py-3 text-start text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51] whitespace-nowrap">{t.colDoctorName}</th>
                  <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51] whitespace-nowrap">{t.colBookings}</th>
                  <th className="px-5 py-3 text-start text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51] whitespace-nowrap">{t.colServices}</th>
                  <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51] whitespace-nowrap">{t.colRating}</th>
                  <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51] whitespace-nowrap">{t.colStatus || "Status"}</th>
                  <th className="px-4 py-3 whitespace-nowrap"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#414E36]/8">
                {filteredProviders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-[#5A6A51]">
                      {t.noProvidersFound}
                    </td>
                  </tr>
                ) : (
                  filteredProviders.map((provider, index) => {
                    const docKey = provider.id || provider.name;
                    const isExpanded = !!expandedDoctorServices[docKey];
                    const displayServices = isExpanded ? provider.services : provider.services.slice(0, 2);
                    const hasMore = provider.services.length > 2;
                    const isNearBottom = index >= filteredProviders.length - 2 && filteredProviders.length > 2;

                    return (
                      <tr
                        key={docKey}
                        onClick={() => setViewingDoctorDetails(provider)}
                        className="transition hover:bg-[#F9F9F7] cursor-pointer"
                      >
                        <td className="px-5 py-4 font-semibold text-[#1F251A]">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-[#EDF1EC] text-[#414E36] border border-[#414E36]/10 flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden">
                              {provider.avatar_url || provider.image ? (
                                <img src={provider.avatar_url || provider.image} alt={provider.name} className="h-full w-full object-cover" />
                              ) : (
                                <span>{(provider.name || "D").charAt(0).toUpperCase()}</span>
                              )}
                            </div>
                            <span>{provider.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center font-medium text-[#1F251A]">{provider.bookings}</td>
                        <td className="px-5 py-4 text-[#5A6A51]">
                          <div className="flex flex-wrap items-center gap-1.5 max-w-md">
                            {displayServices.map((service: string) => (
                              <span key={service} className="inline-block rounded-full border border-[#414E36]/15 bg-[#EDF1EC]/60 px-2.5 py-0.5 text-[11px] font-medium text-[#414E36]">
                                {service}
                              </span>
                            ))}
                            {hasMore && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleExpandedDoctorServices(docKey);
                                }}
                                className="inline-flex items-center gap-1 rounded-full bg-[#C4AE7C]/20 hover:bg-[#C4AE7C]/35 border border-[#C4AE7C]/40 px-2.5 py-0.5 text-[11px] font-bold text-[#414E36] transition active:scale-95 cursor-pointer shadow-2xs"
                                title={isExpanded ? t.showFewerTitle : t.showAllTitle}
                              >
                                {isExpanded ? t.showLess : `${t.morePrefix}${provider.services.length - 2}${t.moreSuffix}`}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className="inline-flex items-center justify-center gap-1.5 text-[#1F251A] font-semibold text-xs">
                            <Star size={13} className="text-[#C4AE7C] fill-[#C4AE7C]" />
                            {provider.rating}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold border ${provider.active !== false ? "bg-green-50 text-green-700 border-green-200/50" : "bg-red-50 text-red-700 border-red-200/50"}`}>
                            {provider.active !== false ? (t.activeBadge || "Active") : (t.inactiveBadge || "Inactive")}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="dropdown-action-menu relative inline-block text-start">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDoctorRowMenuId(prev => prev === docKey ? null : docKey);
                              }}
                              className={`inline-flex h-7 w-7 items-center justify-center rounded-full border transition cursor-pointer dropdown-action-menu ${
                                activeDoctorRowMenuId === docKey
                                  ? "border-[#414E36] bg-[#414E36] text-white"
                                  : "border-[#414E36]/15 bg-white text-[#5A6A51] hover:border-[#C4AE7C] hover:text-[#414E36]"
                              }`}
                              title={t.actionsTitle}
                            >
                              <MoreVertical size={13} />
                            </button>

                            {activeDoctorRowMenuId === docKey && (
                              <div className={`absolute end-0 ${isNearBottom ? "bottom-8" : "top-8"} z-[9999] w-36 rounded-xl bg-white p-1 shadow-2xl border border-[#414E36]/15 text-xs text-start dropdown-action-menu`}>
                                {hasPermission("providers.edit") && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveDoctorRowMenuId(null);
                                      openEditProviderModal(provider);
                                    }}
                                    className="w-full text-start px-3 py-2 rounded-lg hover:bg-[#FBFBF9] font-semibold text-[#1F251A] flex items-center gap-2 transition cursor-pointer"
                                  >
                                    <Pencil size={13} className="text-[#5A6A51]" />
                                    <span>{t.editDoctorBtn}</span>
                                  </button>
                                )}
                                {hasPermission("providers.edit") && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveDoctorRowMenuId(null);
                                      setStatusModalDoctor(provider);
                                    }}
                                    className="w-full text-start px-3 py-2 rounded-lg hover:bg-[#FBFBF9] font-semibold text-[#1F251A] flex items-center gap-2 transition cursor-pointer"
                                  >
                                    <Power size={13} className="text-[#5A6A51]" />
                                    <span>{t.changeStatusBtn || "Change Status"}</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {statusModalDoctor && (
        <DoctorStatusModal
          doctor={statusModalDoctor}
          onClose={() => setStatusModalDoctor(null)}
          onSave={async (doc, newStatus) => {
            await handleToggleProviderStatus(doc, newStatus);
            setStatusModalDoctor(null);
          }}
          lang={lang}
          t={adminTranslations[lang].doctors.doctorStatusModal}
        />
      )}
    </section>
  );
}
