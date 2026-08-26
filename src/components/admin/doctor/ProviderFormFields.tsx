"use client";

import React, { useRef } from "react";
import {
  User,
  Mail,
  Phone,
  Upload,
  Briefcase,
  Clock,
  Plus,
  Trash2,
  Calendar,
  CreditCard,
  Star,
  Stethoscope,
  Check,
  X,
  AlertCircle,
  ShieldCheck,
  Building2,
  Globe,
} from "lucide-react";
import { Branch } from "@/types";
import {
  DoctorServiceCommissionEditor,
  DefaultCommissionType,
} from "@/components/admin/services/DoctorServiceCommissionEditor";
import { UseProviderFormReturn } from "@/components/admin/doctor/useProviderForm";
import { adminTranslations } from "@/components/admin/translations";

interface ProviderFormFieldsProps {
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
  t: typeof adminTranslations["en"]["doctors"]["providerFormFields"];
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function ProviderFormFields({
  providerForm,
  branches,
  allServicesList,
  getDoctorFirstReservationDate,
  allReservations,
  parseEgyptianNationalId,
  lang,
  t,
}: ProviderFormFieldsProps) {
  const {
    providerFormName,
    setProviderFormName,
    providerFormSpecialty,
    setProviderFormSpecialty,
    providerFormPhone,
    setProviderFormPhone,
    providerFormEmail,
    setProviderFormEmail,
    providerFormEmploymentType,
    setProviderFormEmploymentType,
    providerFormLanguages,
    setProviderFormLanguages,
    providerFormSessionType,
    setProviderFormSessionType,
    providerFormNationalId,
    setProviderFormNationalId,
    providerFormGender,
    setProviderFormGender,
    providerFormBranchIds,
    setProviderFormBranchIds,
    providerFormSelectedScheduleBranchId,
    setProviderFormSelectedScheduleBranchId,
    handleScheduleBranchChange,
    providerFormStartDate,
    providerFormRating,
    setProviderFormRating,
    providerFormImage,
    setProviderFormImage,
    providerFormFixedSalary,
    setProviderFormFixedSalary,
    providerFormSelectedServices,
    setProviderFormSelectedServices,
    providerFormServiceCommissions,
    setProviderFormServiceCommissions,
    providerFormCommissionType,
    setProviderFormCommissionType,
    providerFormCommissionValue,
    setProviderFormCommissionValue,
    providerFormCommissionBase,
    setProviderFormCommissionBase,
    providerFormCommissionFixedComponent,
    setProviderFormCommissionFixedComponent,
    providerFormScheduleTab,
    setProviderFormScheduleTab,
    providerFormWorkingDaysHours,
    setProviderFormWorkingDaysHours,
    providerFormOnlineWorkingDaysHours,
    setProviderFormOnlineWorkingDaysHours,
    editingDoctorInline,
    setEditingDoctorInline,
    savingProvider,
    handleSaveProvider,
  } = providerForm;

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-calculated National ID Data
  const nidCheck = parseEgyptianNationalId(providerFormNationalId || "");

  // Real Doctor Info
  const doctorName = providerFormName || editingDoctorInline?.name || "Doctor";
  const doctorInitial = (doctorName.replace(/^Dr\.\s*/i, "").charAt(0) || "D").toUpperCase();
  const doctorEmployeeId = editingDoctorInline?.id ? `DOC-${editingDoctorInline.id.slice(0, 4)}` : "DOC-PROV";
  const doctorActive = editingDoctorInline?.active !== false;

  // Active Schedule Tab based on session
  const activeSched = providerFormScheduleTab === "in_person" ? providerFormWorkingDaysHours : providerFormOnlineWorkingDaysHours;
  const setActiveSched = providerFormScheduleTab === "in_person" ? setProviderFormWorkingDaysHours : setProviderFormOnlineWorkingDaysHours;

  // Language toggle handler
  function toggleLanguage(langName: string) {
    if (langName === "Both") {
      setProviderFormLanguages(["Arabic", "English"]);
      return;
    }
    if (providerFormLanguages.includes(langName)) {
      if (providerFormLanguages.length > 1) {
        setProviderFormLanguages(providerFormLanguages.filter((l) => l !== langName));
      }
    } else {
      setProviderFormLanguages([...providerFormLanguages, langName]);
    }
  }

  // Handle Photo Upload
  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("File size exceeds 2MB limit.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setProviderFormImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} className="space-y-6">
      {/* ── TOP DOCTOR SUMMARY HERO CARD ── */}
      <div className="rounded-2xl border border-[#414E36]/10 bg-white p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Left: Avatar, Name & Status */}
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div className="h-12 w-12 rounded-full bg-[#2A3423] text-white flex items-center justify-center text-base font-bold shrink-0 overflow-hidden border border-[#414E36]/15 shadow-2xs">
              {providerFormImage ? (
                <img src={providerFormImage} alt={doctorName} className="h-full w-full object-cover" />
              ) : (
                <span>{doctorInitial}</span>
              )}
            </div>
            <span
              className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
                doctorActive ? "bg-emerald-500" : "bg-red-500"
              }`}
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#1F251A] text-lg leading-tight">{doctorName}</span>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold border ${
                  doctorActive
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-red-50 text-red-700 border-red-200"
                }`}
              >
                {doctorActive ? (lang === "ar" ? "نشط" : "Active") : (lang === "ar" ? "غير نشط" : "Inactive")}
              </span>
            </div>
            <span className="inline-block text-xs font-semibold text-[#5A6A51] bg-[#F7F9F6] px-2 py-0.5 rounded-md border border-[#414E36]/10">
              Employee ID: {doctorEmployeeId}
            </span>
          </div>
        </div>

        {/* Right: Meta Info Stats */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 divide-x rtl:divide-x-reverse divide-[#414E36]/10 text-xs">
          <div className="space-y-0.5 ps-2">
            <span className="block text-[11px] font-medium text-[#5A6A51]">Specialty / Role</span>
            <span className="block font-bold text-[#1F251A]">{providerFormSpecialty || "Specialist"}</span>
          </div>

          <div className="space-y-0.5 ps-4 sm:ps-6">
            <span className="block text-[11px] font-medium text-[#5A6A51]">{t.employmentTypeLabel || "Employment Type"}</span>
            <span className="block font-bold text-[#1F251A]">{providerFormEmploymentType || "Full Time"}</span>
          </div>

          <div className="space-y-0.5 ps-4 sm:ps-6">
            <span className="block text-[11px] font-medium text-[#5A6A51]">{t.languagesLabel || "Languages"}</span>
            <span className="block font-bold text-[#1F251A]">{providerFormLanguages.join(", ") || "Arabic, English"}</span>
          </div>

          <div className="space-y-0.5 ps-4 sm:ps-6">
            <span className="block text-[11px] font-medium text-[#5A6A51]">{t.ratingLabel || "Rating"}</span>
            <span className="inline-flex items-center gap-1 font-bold text-[#1F251A]">
              <Star size={13} className="text-[#C4AE7C] fill-[#C4AE7C]" />
              {providerFormRating || 5}
            </span>
          </div>
        </div>
      </div>

      {/* ── CARD 1: PERSONAL INFORMATION ── */}
      <div className="rounded-2xl border border-[#414E36]/10 bg-white p-6 shadow-xs space-y-6">
        {/* Section Header */}
        <div className="flex items-center gap-3 border-b border-[#414E36]/8 pb-4">
          <div className="h-8 w-8 rounded-full bg-[#EDF1EC] text-[#414E36] flex items-center justify-center shrink-0">
            <User size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#1F251A]">{t.personalInfoTitle || "Personal Information"}</h3>
            <p className="text-xs text-[#5A6A51]">{t.personalInfoSubtitle || "Update doctor personal details"}</p>
          </div>
        </div>

        {/* Profile Photo & Contact Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Profile Photo */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-[#1F251A]">{t.profilePhotoLabel || "Profile Photo"}</label>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-[#2A3423] text-white flex items-center justify-center text-lg font-bold shrink-0 overflow-hidden border border-[#414E36]/15 shadow-2xs">
                {providerFormImage ? (
                  <img src={providerFormImage} alt={doctorName} className="h-full w-full object-cover" />
                ) : (
                  <span>{doctorInitial}</span>
                )}
              </div>
              <div className="space-y-1.5">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoUpload}
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-[#1F251A] hover:bg-gray-50 shadow-2xs transition cursor-pointer"
                >
                  <Upload size={13} className="text-[#5A6A51]" />
                  <span>{t.changePhotoBtn || "Change Photo"}</span>
                </button>
                <p className="text-[10px] text-[#5A6A51]">
                  {t.photoLimitNote || "JPG, PNG or WEBP. Max size 2MB"}
                </p>
              </div>
            </div>
          </div>

          {/* Email & Phone */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#1F251A] mb-1.5">
                {t.emailLabel || "Email"} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail size={14} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-[#5A6A51] pointer-events-none" />
                <input
                  type="email"
                  placeholder={t.emailPlaceholder || "doctor@example.com"}
                  value={providerFormEmail}
                  onChange={(e) => setProviderFormEmail(e.target.value)}
                  className="w-full rounded-2xl border border-[#414E36]/15 bg-white py-2.5 ps-9 pe-4 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1F251A] mb-1.5">
                {t.phoneLabel || "Phone Number"} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone size={14} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-[#5A6A51] pointer-events-none" />
                <input
                  type="text"
                  placeholder={t.phonePlaceholder || "010 1234 5678"}
                  value={providerFormPhone}
                  onChange={(e) => setProviderFormPhone(e.target.value)}
                  className="w-full rounded-2xl border border-[#414E36]/15 bg-white py-2.5 ps-9 pe-4 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Languages Selection */}
        <div className="flex flex-col gap-2 pt-1 border-t border-[#414E36]/8">
          <label className="text-xs font-bold text-[#1F251A]">
            {t.languagesLabel || "Languages"} <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div
                onClick={() => toggleLanguage("Arabic")}
                className={`flex h-4.5 w-4.5 items-center justify-center rounded-md border transition ${
                  providerFormLanguages.includes("Arabic")
                    ? "border-[#414E36] bg-[#414E36] text-white"
                    : "border-gray-300 bg-white"
                }`}
              >
                {providerFormLanguages.includes("Arabic") && <Check size={12} strokeWidth={3} />}
              </div>
              <span className="text-xs font-medium text-[#1F251A]">{t.langArabic || "Arabic"}</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div
                onClick={() => toggleLanguage("English")}
                className={`flex h-4.5 w-4.5 items-center justify-center rounded-md border transition ${
                  providerFormLanguages.includes("English")
                    ? "border-[#414E36] bg-[#414E36] text-white"
                    : "border-gray-300 bg-white"
                }`}
              >
                {providerFormLanguages.includes("English") && <Check size={12} strokeWidth={3} />}
              </div>
              <span className="text-xs font-medium text-[#1F251A]">{t.langEnglish || "English"}</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div
                onClick={() => toggleLanguage("Both")}
                className={`flex h-4.5 w-4.5 items-center justify-center rounded-md border transition ${
                  providerFormLanguages.includes("Arabic") && providerFormLanguages.includes("English")
                    ? "border-[#414E36] bg-[#414E36] text-white"
                    : "border-gray-300 bg-white"
                }`}
              >
                {providerFormLanguages.includes("Arabic") && providerFormLanguages.includes("English") && (
                  <Check size={12} strokeWidth={3} />
                )}
              </div>
              <span className="text-xs font-medium text-[#1F251A]">{t.langBoth || "Both"}</span>
            </label>
          </div>
        </div>

        {/* Doctor Name, Specialty, National ID, Gender Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          {/* Doctor Name */}
          <div>
            <label className="block text-xs font-bold text-[#1F251A] mb-1.5">
              {t.nameLabel} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User size={14} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-[#5A6A51] pointer-events-none" />
              <input
                type="text"
                placeholder={t.namePlaceholder}
                value={providerFormName}
                onChange={(e) => setProviderFormName(e.target.value)}
                className="w-full rounded-2xl border border-[#414E36]/15 bg-white py-2.5 ps-9 pe-4 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
              />
            </div>
          </div>

          {/* Specialty */}
          <div>
            <label className="block text-xs font-bold text-[#1F251A] mb-1.5">
              {t.specialtyLabel} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Stethoscope size={14} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-[#5A6A51] pointer-events-none" />
              <input
                type="text"
                placeholder={t.specialtyPlaceholder}
                value={providerFormSpecialty}
                onChange={(e) => setProviderFormSpecialty(e.target.value)}
                className="w-full rounded-2xl border border-[#414E36]/15 bg-white py-2.5 ps-9 pe-4 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
              />
            </div>
          </div>

          {/* National ID */}
          <div>
            <label className="block text-xs font-bold text-[#1F251A] mb-1.5">
              {t.nationalIdLabel}
            </label>
            <div className="relative">
              <CreditCard size={14} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-[#5A6A51] pointer-events-none" />
              <input
                type="text"
                placeholder={t.nationalIdPlaceholder}
                value={providerFormNationalId}
                onChange={(e) => setProviderFormNationalId(e.target.value)}
                className="w-full rounded-2xl border border-[#414E36]/15 bg-white py-2.5 ps-9 pe-4 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
              />
            </div>
          </div>

          {/* Gender */}
          <div>
            <label className="block text-xs font-bold text-[#1F251A] mb-1.5">
              {t.genderLabel}
            </label>
            <select
              value={providerFormGender}
              onChange={(e) => setProviderFormGender(e.target.value as "Male" | "Female" | "")}
              className="w-full rounded-2xl border border-[#414E36]/15 bg-white px-3.5 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
            >
              <option value="">{t.genderSelectPlaceholder}</option>
              <option value="Male">{t.genderMale}</option>
              <option value="Female">{t.genderFemale}</option>
            </select>
          </div>
        </div>

        {/* Auto-Calculated Age / DOB & Start Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#1F251A] mb-1.5">{t.ageDobLabel}</label>
            {nidCheck.isValid ? (
              <div className="w-full rounded-2xl border border-[#414E36]/15 bg-[#EDF1EC]/70 px-4 py-2 text-xs text-[#1F251A] font-semibold flex items-center justify-between min-h-[42px]">
                <span>{nidCheck.age} {t.ageYearsSuffix} • {t.dobPrefix} {nidCheck.dobFormatted}</span>
                <span className="text-[10px] text-[#414E36] font-bold bg-white px-2 py-0.5 rounded-full border border-[#414E36]/10">{t.nationalIdValidBadge}</span>
              </div>
            ) : (
              <div className="w-full rounded-2xl border border-[#414E36]/15 bg-gray-50 px-4 py-2.5 text-xs text-[#5A6A51] italic min-h-[42px] flex items-center">
                {t.autoCalculatedNote}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1F251A] mb-1.5">{t.startDateLabel}</label>
            <div className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 flex items-center justify-between min-h-[42px]">
              {(() => {
                const autoDate = getDoctorFirstReservationDate(providerFormName, allReservations);
                const displayDate = autoDate || providerFormStartDate;
                if (displayDate) {
                  return (
                    <div className="flex items-center justify-between w-full">
                      <span className="text-sm font-semibold text-[#1F251A]">{displayDate}</span>
                      <span className="text-[10px] font-bold text-[#414E36] bg-[#EDF1EC] px-2.5 py-0.5 rounded-full border border-[#414E36]/15 flex items-center gap-1">
                        {t.autoFromFirstBooking}
                      </span>
                    </div>
                  );
                }
                return (
                  <span className="text-xs italic text-[#5A6A51]/70">
                    {t.willAutoSetNote}
                  </span>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* ── CARD 2: WORK INFORMATION ── */}
      <div className="rounded-2xl border border-[#414E36]/10 bg-white p-6 shadow-xs space-y-6">
        {/* Section Header */}
        <div className="flex items-center gap-3 border-b border-[#414E36]/8 pb-4">
          <div className="h-8 w-8 rounded-full bg-[#EDF1EC] text-[#414E36] flex items-center justify-center shrink-0">
            <Briefcase size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#1F251A]">{t.workInfoTitle || "Work Information"}</h3>
            <p className="text-xs text-[#5A6A51]">{t.workInfoSubtitle || "Update working details"}</p>
          </div>
        </div>

        {/* Employment Type & Branches Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Employment Type */}
          <div>
            <label className="block text-xs font-bold text-[#1F251A] mb-1.5">
              {t.employmentTypeLabel || "Employment Type"} <span className="text-red-500">*</span>
            </label>
            <select
              value={providerFormEmploymentType}
              onChange={(e) => setProviderFormEmploymentType(e.target.value)}
              className="w-full rounded-2xl border border-[#414E36]/15 bg-white px-3.5 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
            >
              <option value="Full Time">{t.empFullTime || "Full Time"}</option>
              <option value="Part Time">{t.empPartTime || "Part Time"}</option>
              <option value="Visiting">{t.empVisiting || "Visiting"}</option>
              <option value="Consultant">{t.empConsultant || "Consultant"}</option>
            </select>
          </div>

          {/* Branches (Multi-select pills) */}
          <div>
            <label className="block text-xs font-bold text-[#1F251A] mb-1.5">
              {t.branchesLabel} <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap items-center gap-2 p-2 rounded-2xl border border-[#414E36]/15 bg-white min-h-[44px]">
              {branches.map((b) => {
                const isSelected = providerFormBranchIds.includes(b.id);
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        if (providerFormBranchIds.length <= 1) {
                          alert(t.atLeastOneBranchAlert);
                          return;
                        }
                        const nextIds = providerFormBranchIds.filter((id) => id !== b.id);
                        setProviderFormBranchIds(nextIds);
                        if (providerFormSelectedScheduleBranchId === b.id) {
                          handleScheduleBranchChange(nextIds[0]);
                        }
                      } else {
                        const nextIds = [...providerFormBranchIds, b.id];
                        setProviderFormBranchIds(nextIds);
                        if (!providerFormSelectedScheduleBranchId) {
                          setProviderFormSelectedScheduleBranchId(b.id);
                        }
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition ${
                      isSelected
                        ? "bg-[#414E36] text-white border-[#414E36]"
                        : "bg-[#414E36]/5 text-[#414E36] border-transparent hover:bg-[#414E36]/10"
                    }`}
                  >
                    <span>{b.name_en}</span>
                    {isSelected ? <X size={12} /> : <Plus size={12} />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Session Type & Fixed Salary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Session Type */}
          <div>
            <label className="block text-xs font-bold text-[#1F251A] mb-1.5">
              {t.sessionTypeLabel || "Session Type"} <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "in_clinic", label: t.sessionInClinic || "In-Clinic" },
                { id: "online", label: t.sessionOnline || "Online" },
                { id: "both", label: t.sessionBoth || "Both" },
              ].map((sess) => (
                <div
                  key={sess.id}
                  onClick={() => setProviderFormSessionType(sess.id as any)}
                  className={`flex items-center justify-center gap-2 rounded-2xl border py-2.5 px-3 cursor-pointer transition select-none ${
                    providerFormSessionType === sess.id
                      ? "border-[#414E36] bg-[#F2F5F0] text-[#414E36] font-bold ring-1 ring-[#414E36]"
                      : "border-gray-200 bg-white text-[#5A6A51] hover:border-gray-300 font-medium"
                  }`}
                >
                  <div className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border ${
                    providerFormSessionType === sess.id ? "border-[#414E36]" : "border-gray-300"
                  }`}>
                    {providerFormSessionType === sess.id && <div className="h-1.5 w-1.5 rounded-full bg-[#414E36]" />}
                  </div>
                  <span className="text-xs">{sess.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Fixed Salary */}
          <div>
            <label className="block text-xs font-bold text-[#1F251A] mb-1.5">{t.fixedSalaryLabel}</label>
            <input
              type="number"
              placeholder={t.fixedSalaryPlaceholder}
              value={providerFormFixedSalary}
              onChange={(e) => setProviderFormFixedSalary(e.target.value)}
              className="w-full rounded-2xl border border-[#414E36]/15 bg-white px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
            />
          </div>
        </div>

        {/* Services & Commission Editor */}
        <div className="pt-2 border-t border-[#414E36]/8">
          <DoctorServiceCommissionEditor
            allServices={allServicesList}
            services={providerFormSelectedServices}
            commissions={providerFormServiceCommissions}
            defaultType={providerFormCommissionType as DefaultCommissionType}
            defaultValue={providerFormCommissionValue}
            defaultBase={providerFormCommissionBase}
            defaultFixedComponent={providerFormCommissionFixedComponent}
            onServicesChange={setProviderFormSelectedServices}
            onCommissionsChange={setProviderFormServiceCommissions}
            onDefaultTypeChange={setProviderFormCommissionType}
            onDefaultValueChange={setProviderFormCommissionValue}
            onDefaultBaseChange={setProviderFormCommissionBase}
            onDefaultFixedComponentChange={setProviderFormCommissionFixedComponent}
          />
        </div>
      </div>

      {/* ── CARD 3: WORKING SCHEDULE ── */}
      <div className="rounded-2xl border border-[#414E36]/10 bg-white p-6 shadow-xs space-y-5">
        {/* Section Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#414E36]/8 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-[#EDF1EC] text-[#414E36] flex items-center justify-center shrink-0">
              <Clock size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1F251A]">{t.workingScheduleTitle || "Working Schedule"}</h3>
              <p className="text-xs text-[#5A6A51]">{t.workingScheduleSubtitle || "Set weekly working days, multiple shifts, and break times"}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {providerFormBranchIds.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#5A6A51]">{t.configureBranchSchedule}</span>
                <select
                  value={providerFormSelectedScheduleBranchId}
                  onChange={(e) => handleScheduleBranchChange(e.target.value)}
                  className="rounded-xl border border-[#414E36]/15 bg-white px-2.5 py-1 text-xs text-[#1F251A] font-semibold outline-none focus:border-[#C4AE7C] shadow-2xs cursor-pointer"
                >
                  {providerFormBranchIds.map((bId) => {
                    const br = branches.find((b) => b.id === bId);
                    return (
                      <option key={bId} value={bId}>
                        {br ? br.name_en : bId}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            <div className="flex rounded-xl border border-[#414E36]/15 p-0.5 bg-[#F9F9F7] text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setProviderFormScheduleTab("in_person")}
                className={`px-3 py-1 rounded-lg transition ${
                  providerFormScheduleTab === "in_person"
                    ? "bg-[#414E36] text-white shadow-2xs"
                    : "text-[#5A6A51] hover:text-[#414E36]"
                }`}
              >
                {t.inClinicTab}
              </button>
              <button
                type="button"
                onClick={() => setProviderFormScheduleTab("online")}
                className={`px-3 py-1 rounded-lg transition ${
                  providerFormScheduleTab === "online"
                    ? "bg-[#414E36] text-white shadow-2xs"
                    : "text-[#5A6A51] hover:text-[#414E36]"
                }`}
              >
                {t.onlineTab}
              </button>
            </div>
          </div>
        </div>

        {/* Schedule Matrix Table */}
        <div className="overflow-x-auto rounded-2xl border border-[#414E36]/10 bg-white scrollbar-none">
          <table className="w-full min-w-[700px] text-xs">
            <thead>
              <tr className="border-b border-[#414E36]/10 bg-[#F9F9F7] text-[#5A6A51] uppercase font-bold text-[10px] tracking-wider">
                <th className="px-4 py-3 text-start w-[14%]">{t.colDay || "DAY"}</th>
                <th className="px-4 py-3 text-center w-[12%]">{t.colWorking || "WORKING"}</th>
                <th className="px-4 py-3 text-start w-[44%]">{t.colShifts || "SHIFTS"}</th>
                <th className="px-4 py-3 text-start w-[20%]">{t.colBreakTime || "BREAK TIME"}</th>
                <th className="px-4 py-3 text-center w-[10%]">{t.colActions || "ACTIONS"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#414E36]/8">
              {WEEKDAYS.map((day) => {
                const sched = activeSched[day] || { isOpen: false, start: "09:00", end: "17:00", shifts: [] };
                const dayShifts = (sched.shifts && sched.shifts.length > 0)
                  ? sched.shifts
                  : [{ start: sched.start || "09:00", end: sched.end || "17:00" }];

                return (
                  <tr key={day} className="transition hover:bg-[#FBFBF9]/60">
                    {/* Day Name */}
                    <td className="px-4 py-3.5 font-bold text-[#1F251A]">
                      {(t.dayNames as Record<string, string>)[day] || day}
                    </td>

                    {/* Working Toggle Switch */}
                    <td className="px-4 py-3.5 text-center">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={sched.isOpen}
                        onClick={() => {
                          setActiveSched({
                            ...activeSched,
                            [day]: { ...sched, isOpen: !sched.isOpen }
                          });
                        }}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          sched.isOpen ? "bg-[#414E36]" : "bg-gray-200"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            sched.isOpen ? (lang === "ar" ? "-translate-x-4" : "translate-x-4") : "translate-x-0"
                          }`}
                        />
                      </button>
                    </td>

                    {/* Shifts Column */}
                    <td className="px-4 py-3.5">
                      {sched.isOpen ? (
                        <div className="flex flex-col gap-2">
                          {dayShifts.map((shft: any, shiftIdx: number) => (
                            <div key={shiftIdx} className="flex items-center gap-2">
                              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#EDF1EC] text-[10px] font-bold text-[#414E36] shrink-0">
                                {shiftIdx + 1}
                              </span>
                              <input
                                type="time"
                                value={shft.start || "09:00"}
                                onChange={(e) => {
                                  const updated = [...dayShifts];
                                  updated[shiftIdx] = { ...updated[shiftIdx], start: e.target.value };
                                  setActiveSched({
                                    ...activeSched,
                                    [day]: {
                                      ...sched,
                                      start: updated[0].start,
                                      end: updated[0].end,
                                      shifts: updated
                                    }
                                  });
                                }}
                                className="rounded-lg border border-[#414E36]/15 bg-white px-2 py-1 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                              />
                              <span className="text-[#5A6A51] text-xs font-semibold">-</span>
                              <input
                                type="time"
                                value={shft.end || "17:00"}
                                onChange={(e) => {
                                  const updated = [...dayShifts];
                                  updated[shiftIdx] = { ...updated[shiftIdx], end: e.target.value };
                                  setActiveSched({
                                    ...activeSched,
                                    [day]: {
                                      ...sched,
                                      start: updated[0].start,
                                      end: updated[0].end,
                                      shifts: updated
                                    }
                                  });
                                }}
                                className="rounded-lg border border-[#414E36]/15 bg-white px-2 py-1 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                              />
                              {dayShifts.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const filtered = dayShifts.filter((_: any, i: number) => i !== shiftIdx);
                                    setActiveSched({
                                      ...activeSched,
                                      [day]: {
                                        ...sched,
                                        start: filtered[0]?.start || "09:00",
                                        end: filtered[0]?.end || "17:00",
                                        shifts: filtered
                                      }
                                    });
                                  }}
                                  className="inline-flex h-6 w-6 items-center justify-center rounded-md text-red-500 hover:bg-red-50 hover:text-red-700 transition cursor-pointer shrink-0"
                                  title="Delete this shift"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          ))}

                          {dayShifts.length < 3 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newShifts = [...dayShifts, { start: "17:00", end: "21:00" }];
                                setActiveSched({
                                  ...activeSched,
                                  [day]: {
                                    ...sched,
                                    shifts: newShifts
                                  }
                                });
                              }}
                              className="self-start inline-flex items-center gap-1 text-[11px] font-bold text-[#414E36] hover:text-[#2e3a26] transition cursor-pointer mt-0.5"
                            >
                              <Plus size={12} /> {t.addShiftBtn || "Add Shift"}
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-[#5A6A51] italic text-xs">{t.notWorkingText || "Not working"}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveSched({
                                ...activeSched,
                                [day]: { ...sched, isOpen: true }
                              });
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-dashed border-[#414E36]/25 px-2 py-0.5 text-[10px] font-bold text-[#414E36] hover:bg-[#EDF1EC]/50 transition cursor-pointer"
                          >
                            <Plus size={10} /> {t.addShiftBtn || "Add Shift"}
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Break Time Column */}
                    <td className="px-4 py-3.5">
                      {sched.isOpen ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="time"
                            value={sched.breakStart || "13:00"}
                            onChange={(e) => {
                              setActiveSched({
                                ...activeSched,
                                [day]: { ...sched, breakStart: e.target.value }
                              });
                            }}
                            className="rounded-lg border border-[#414E36]/15 bg-white px-1.5 py-1 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C] w-20"
                          />
                          <span className="text-[#5A6A51] text-xs font-semibold">-</span>
                          <input
                            type="time"
                            value={sched.breakEnd || "14:00"}
                            onChange={(e) => {
                              setActiveSched({
                                ...activeSched,
                                [day]: { ...sched, breakEnd: e.target.value }
                              });
                            }}
                            className="rounded-lg border border-[#414E36]/15 bg-white px-1.5 py-1 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C] w-20"
                          />
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>

                    {/* Actions Column */}
                    <td className="px-4 py-3.5 text-center">
                      {sched.isOpen ? (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveSched({
                              ...activeSched,
                              [day]: { ...sched, isOpen: false }
                            });
                          }}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 transition cursor-pointer"
                          title="Clear shifts for this day"
                        >
                          <Trash2 size={13} />
                        </button>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Schedule Helper Note */}
        <div className="flex items-center gap-2 text-[11px] text-[#5A6A51] font-medium pt-1">
          <AlertCircle size={13} className="text-[#5A6A51] shrink-0" />
          <span>{t.maxShiftsNote || "You can add up to 3 shifts per day."}</span>
        </div>
      </div>

      {/* ── BOTTOM ACTION BUTTONS ── */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#414E36]/10">
        <button
          type="button"
          onClick={() => setEditingDoctorInline(null)}
          disabled={savingProvider}
          className="rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-xs font-bold text-[#1F251A] hover:bg-gray-50 transition cursor-pointer disabled:opacity-50"
        >
          {t.cancelBtn || "Cancel"}
        </button>
        <button
          type="button"
          onClick={handleSaveProvider}
          disabled={savingProvider}
          className="rounded-xl bg-[#37442D] px-7 py-2.5 text-xs font-bold text-white hover:bg-[#2A3423] shadow-sm transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
        >
          {savingProvider ? (t.savingBtn || "Saving...") : (t.saveChangesBtn || "Save Changes")}
        </button>
      </div>
    </div>
  );
}
