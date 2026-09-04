"use client";

import React, { useState, useMemo } from "react";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Phone,
  User,
  Layers,
  CreditCard,
  Info,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  Clock,
  Sparkles,
  Stethoscope
} from "lucide-react";
import { adminTranslations } from "@/components/admin/translations";
import { getAuthHeaders } from "@/lib/authHeaders";

interface ServiceItem {
  id: string | number;
  en?: string;
  ar?: string;
  name?: string;
  title?: string;
  price?: number;
}

interface ProviderItem {
  id: string | number;
  name: string;
  specialty?: string;
}

interface CustomerItem {
  id?: string | number;
  name?: string;
  mobile?: string;
  phone?: string;
}

interface AdminAddPreviousBookingViewProps {
  onClose: () => void;
  onBookingCreated?: () => void;
  services?: any[];
  providers?: any[];
  customers?: any[];
  branches?: any[];
  activeBranchId?: string;
  lang?: "en" | "ar";
  t?: any;
}

function cleanPhone(raw: string): string {
  let p = raw.trim();
  if (p.startsWith("+20")) {
    p = "0" + p.slice(3);
  } else if (p.startsWith("0020")) {
    p = "0" + p.slice(4);
  } else if (p.startsWith("20") && p.length === 12) {
    p = "0" + p.slice(2);
  }
  return p;
}

function isValidPhone(raw: string): boolean {
  if (!raw) return false;
  const p = cleanPhone(raw);
  // Egyptian mobile format: 010, 011, 012, 015 followed by 8 digits
  if (/^01[0125]\d{8}$/.test(p)) return true;
  // Generic international format (8-15 digits)
  if (/^\+?\d{8,15}$/.test(raw.trim())) return true;
  return false;
}

export const AdminAddPreviousBookingView: React.FC<AdminAddPreviousBookingViewProps> = ({
  onClose,
  onBookingCreated,
  services = [],
  providers = [],
  customers = [],
  branches = [],
  activeBranchId,
  lang = "en",
  t,
}) => {
  const tr = t || adminTranslations[lang].bookings.adminAddPreviousBooking;

  // Form State
  const [patientPhone, setPatientPhone] = useState("");
  const [patientName, setPatientName] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [selectedPaymentType, setSelectedPaymentType] = useState("");

  // UI & Feedback State
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{
    phone?: string;
    name?: string;
    date?: string;
    general?: string;
  }>({});
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Live match patient against customers array
  const matchedCustomer = useMemo(() => {
    if (!patientPhone || patientPhone.trim().length < 8) return null;
    const cleanInput = cleanPhone(patientPhone);
    return customers.find(c => {
      const cMobile = cleanPhone(c.mobile || c.phone || "");
      return cMobile && cMobile === cleanInput;
    }) || null;
  }, [patientPhone, customers]);

  // Handle phone change & auto-populate name if patient matched
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPatientPhone(val);
    if (errors.phone) {
      setErrors(prev => ({ ...prev, phone: undefined }));
    }

    if (val.trim().length >= 8) {
      const cleanVal = cleanPhone(val);
      const match = customers.find(c => {
        const cMobile = cleanPhone(c.mobile || c.phone || "");
        return cMobile && cMobile === cleanVal;
      });
      if (match && match.name && !patientName) {
        setPatientName(match.name);
      }
    }
  };

  // Helper to extract service name cleanly
  const getServiceName = (s: ServiceItem) => {
    if (lang === "ar" && s.ar) return s.ar;
    return s.en || s.name || s.title || `Service #${s.id}`;
  };

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const newErrors: typeof errors = {};

    // Validate Phone
    const trimmedPhone = patientPhone.trim();
    if (!trimmedPhone) {
      newErrors.phone = tr.requiredField;
    } else if (!isValidPhone(trimmedPhone)) {
      newErrors.phone = tr.invalidPhone;
    }

    // Validate Name
    const trimmedName = patientName.trim();
    if (!trimmedName) {
      newErrors.name = tr.requiredField;
    }

    // Validate Date
    if (!bookingDate) {
      newErrors.date = tr.requiredField;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setSaving(true);
    setSuccessMsg(null);

    try {
      const selectedDoc = providers.find(p => String(p.id) === String(selectedDoctorId));
      const selectedSrv = services.find(s => String(s.id) === String(selectedServiceId));

      const payload = {
        patientPhone: trimmedPhone,
        patientName: trimmedName,
        date: bookingDate,
        doctorId: selectedDoctorId || null,
        doctorName: selectedDoc?.name || null,
        serviceId: selectedServiceId ? Number(selectedServiceId) : null,
        serviceName: selectedSrv ? getServiceName(selectedSrv) : null,
        paymentType: selectedPaymentType || null,
        branchId: activeBranchId || null,
        amountPaid: selectedPaymentType && selectedSrv?.price ? selectedSrv.price : 0
      };

      // POST /api/reservations/previous is staff-gated, so the bearer token is required — a
      // plain Content-Type-only fetch now 401s and the form would silently fail to save.
      const res = await fetch("/api/reservations/previous", {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.field === "patientPhone") {
          setErrors({ phone: data.error || tr.invalidPhone });
        } else {
          setErrors({ general: data.error || tr.errorMessage });
        }
        setSaving(false);
        return;
      }

      setSuccessMsg(tr.successMessage);
      setTimeout(() => {
        onBookingCreated?.();
      }, 750);
    } catch (err: any) {
      console.error("Error creating previous booking:", err);
      setErrors({ general: tr.errorMessage });
      setSaving(false);
    }
  };

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} className="w-full max-w-5xl mx-auto space-y-6 pb-16 animate-fadeIn">
      {/* ── BACK BUTTON ── */}
      <div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#414E36] hover:text-[#283221] transition cursor-pointer"
        >
          <ArrowLeft size={14} className={lang === "ar" ? "rotate-180" : ""} />
          <span>{tr.backToBookings || "BACK TO ONBOARDING"}</span>
        </button>
      </div>

      {/* ── HEADER WITH ICON ── */}
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E8EFE5] text-[#344E41] shadow-2xs">
          <CalendarIcon size={28} className="text-[#384E34]" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#111827] tracking-tight">
            {tr.title}
          </h1>
          <p className="text-xs sm:text-sm text-[#5A6A51] mt-0.5 font-medium">
            {tr.subtitle}
          </p>
        </div>
      </div>

      {/* ── SUCCESS BANNER ── */}
      {successMsg && (
        <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-sm font-semibold text-emerald-800 shadow-xs">
          <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ── GENERAL ERROR BANNER ── */}
      {errors.general && (
        <div className="flex items-center gap-3 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-sm font-semibold text-rose-800 shadow-xs">
          <AlertCircle size={20} className="text-rose-600 shrink-0" />
          <span>{errors.general}</span>
        </div>
      )}

      {/* ── FORM CARD ── */}
      <form onSubmit={handleSubmit} className="rounded-3xl border border-gray-200/80 bg-white p-6 sm:p-8 shadow-xs space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* FIELD 1: PATIENT PHONE */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="patientPhone" className="text-xs sm:text-sm font-bold text-[#111827] flex items-center gap-1">
                {tr.patientPhoneLabel} <span className="text-red-500">*</span>
              </label>
              {matchedCustomer && (
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <CheckCircle2 size={12} /> {tr.existingPatientFound} {matchedCustomer.name}
                </span>
              )}
            </div>
            <div className="relative flex items-center">
              <div className="pointer-events-none absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 flex items-center pl-3.5 rtl:pl-0 rtl:pr-3.5 text-[#5A6A51] z-10">
                <Phone size={17} />
              </div>
              <input
                id="patientPhone"
                type="tel"
                value={patientPhone}
                onChange={handlePhoneChange}
                placeholder={tr.patientPhonePlaceholder}
                title={tr.patientPhoneTooltip}
                className={`w-full rounded-xl border bg-white py-3 pl-10 pr-4 rtl:pl-4 rtl:pr-10 text-sm font-medium text-[#111827] outline-none transition placeholder:text-[#9CA3AF] ${
                  errors.phone
                    ? "border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
                    : "border-gray-200 focus:border-[#414E36] focus:ring-2 focus:ring-[#414E36]/10"
                }`}
              />
            </div>
            {errors.phone ? (
              <p className="text-xs font-semibold text-rose-600 flex items-center gap-1 mt-1">
                <AlertCircle size={13} /> {errors.phone}
              </p>
            ) : (
              <p className="text-[11px] text-[#6B7280] font-normal leading-normal">
                {tr.patientPhoneHelp}
              </p>
            )}
          </div>

          {/* FIELD 2: DATE */}
          <div className="space-y-1.5">
            <label htmlFor="bookingDate" className="text-xs sm:text-sm font-bold text-[#111827] flex items-center gap-1">
              {tr.dateLabel} <span className="text-red-500">*</span>
            </label>
            <div className="relative flex items-center">
              <div className="pointer-events-none absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 flex items-center pl-3.5 rtl:pl-0 rtl:pr-3.5 text-[#5A6A51] z-10">
                <CalendarIcon size={17} />
              </div>
              <input
                id="bookingDate"
                type="date"
                value={bookingDate}
                onChange={(e) => {
                  setBookingDate(e.target.value);
                  if (errors.date) setErrors(prev => ({ ...prev, date: undefined }));
                }}
                title={tr.dateTooltip}
                placeholder={tr.datePlaceholder}
                className={`w-full rounded-xl border bg-white py-3 pl-10 pr-10 rtl:pl-10 rtl:pr-10 text-sm font-medium text-[#111827] outline-none transition placeholder:text-[#9CA3AF] ${
                  errors.date
                    ? "border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
                    : "border-gray-200 focus:border-[#414E36] focus:ring-2 focus:ring-[#414E36]/10"
                }`}
              />
              <div className="pointer-events-none absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 flex items-center pr-3.5 rtl:pr-0 rtl:pl-3.5 text-[#6B7280] z-10">
                <CalendarIcon size={16} className="text-[#9CA3AF]" />
              </div>
            </div>
            {errors.date && (
              <p className="text-xs font-semibold text-rose-600 flex items-center gap-1 mt-1">
                <AlertCircle size={13} /> {errors.date}
              </p>
            )}
          </div>

          {/* FIELD 3: PATIENT NAME */}
          <div className="space-y-1.5">
            <label htmlFor="patientName" className="text-xs sm:text-sm font-bold text-[#111827] flex items-center gap-1">
              {tr.patientNameLabel} <span className="text-red-500">*</span>
            </label>
            <div className="relative flex items-center">
              <div className="pointer-events-none absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 flex items-center pl-3.5 rtl:pl-0 rtl:pr-3.5 text-[#5A6A51] z-10">
                <User size={17} />
              </div>
              <input
                id="patientName"
                type="text"
                value={patientName}
                onChange={(e) => {
                  setPatientName(e.target.value);
                  if (errors.name) setErrors(prev => ({ ...prev, name: undefined }));
                }}
                placeholder={tr.patientNamePlaceholder}
                className={`w-full rounded-xl border bg-white py-3 pl-10 pr-4 rtl:pl-4 rtl:pr-10 text-sm font-medium text-[#111827] outline-none transition placeholder:text-[#9CA3AF] ${
                  errors.name
                    ? "border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
                    : "border-gray-200 focus:border-[#414E36] focus:ring-2 focus:ring-[#414E36]/10"
                }`}
              />
            </div>
            {errors.name && (
              <p className="text-xs font-semibold text-rose-600 flex items-center gap-1 mt-1">
                <AlertCircle size={13} /> {errors.name}
              </p>
            )}
          </div>

          {/* FIELD 4: SERVICE (OPTIONAL) */}
          <div className="space-y-1.5">
            <label htmlFor="serviceSelect" className="text-xs sm:text-sm font-bold text-[#111827]">
              {tr.serviceOptional || tr.serviceLabel}
            </label>
            <div className="relative flex items-center">
              <div className="pointer-events-none absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 flex items-center pl-3.5 rtl:pl-0 rtl:pr-3.5 text-[#5A6A51] z-10">
                <Layers size={17} />
              </div>
              <select
                id="serviceSelect"
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                className="w-full appearance-none rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-10 rtl:pl-10 rtl:pr-10 text-sm font-medium text-[#111827] outline-none transition focus:border-[#414E36] focus:ring-2 focus:ring-[#414E36]/10 cursor-pointer"
              >
                <option value="">{tr.selectServicePlaceholder}</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {getServiceName(s)} {s.price ? `(${s.price} EGP)` : ""}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 flex items-center pr-3.5 rtl:pr-0 rtl:pl-3.5 text-[#6B7280] z-10">
                <ChevronDown size={17} />
              </div>
            </div>
          </div>

          {/* FIELD 5: DOCTOR (OPTIONAL) */}
          <div className="space-y-1.5">
            <label htmlFor="doctorSelect" className="text-xs sm:text-sm font-bold text-[#111827]">
              {tr.doctorOptional || tr.doctorLabel}
            </label>
            <div className="relative flex items-center">
              <div className="pointer-events-none absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 flex items-center pl-3.5 rtl:pl-0 rtl:pr-3.5 text-[#5A6A51] z-10">
                <Stethoscope size={17} />
              </div>
              <select
                id="doctorSelect"
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className="w-full appearance-none rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-10 rtl:pl-10 rtl:pr-10 text-sm font-medium text-[#111827] outline-none transition focus:border-[#414E36] focus:ring-2 focus:ring-[#414E36]/10 cursor-pointer"
              >
                <option value="">{tr.selectDoctorPlaceholder}</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.specialty ? `— ${p.specialty}` : ""}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 flex items-center pr-3.5 rtl:pr-0 rtl:pl-3.5 text-[#6B7280] z-10">
                <ChevronDown size={17} />
              </div>
            </div>
          </div>

          {/* FIELD 6: PAYMENT TYPE (OPTIONAL) */}
          <div className="space-y-1.5">
            <label htmlFor="paymentTypeSelect" className="text-xs sm:text-sm font-bold text-[#111827]">
              {tr.paymentTypeOptional || tr.paymentTypeLabel}
            </label>
            <div className="relative flex items-center">
              <div className="pointer-events-none absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 flex items-center pl-3.5 rtl:pl-0 rtl:pr-3.5 text-[#5A6A51] z-10">
                <CreditCard size={17} />
              </div>
              <select
                id="paymentTypeSelect"
                value={selectedPaymentType}
                onChange={(e) => setSelectedPaymentType(e.target.value)}
                className="w-full appearance-none rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-10 rtl:pl-10 rtl:pr-10 text-sm font-medium text-[#111827] outline-none transition focus:border-[#414E36] focus:ring-2 focus:ring-[#414E36]/10 cursor-pointer"
              >
                <option value="">{tr.selectPaymentTypePlaceholder}</option>
                {Object.entries(tr.paymentTypes || {}).map(([key, label]: [string, any]) => (
                  <option key={key} value={label}>
                    {label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 flex items-center pr-3.5 rtl:pr-0 rtl:pl-3.5 text-[#6B7280] z-10">
                <ChevronDown size={17} />
              </div>
            </div>
          </div>
        </div>

        {/* ── SAGE CALLOUT BANNER ── */}
        <div className="rounded-2xl border border-[#D5DFD1] bg-[#F3F7F1] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[#384E34] text-[#384E34] font-bold">
              <Info size={16} />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-[#1F251A]">
                {tr.bannerTitle}
              </p>
              <p className="text-[11px] sm:text-xs text-[#5A6A51] mt-0.5">
                {tr.bannerSubtitle}
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2 border border-[#E3ECE0] text-[#5A6A51] shrink-0">
            <CalendarIcon size={18} className="text-[#384E34]" />
            <Clock size={14} className="text-[#6B7280]" />
          </div>
        </div>

        {/* ── ACTION BUTTONS ── */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-semibold text-[#374151] shadow-2xs hover:bg-gray-50 transition cursor-pointer disabled:opacity-60"
          >
            {tr.cancelBtn}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2D3F2A] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#1E2D1C] active:scale-98 transition cursor-pointer disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>{tr.savingBtn}</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>{tr.submitBtn}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminAddPreviousBookingView;
