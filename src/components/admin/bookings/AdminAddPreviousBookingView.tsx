"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Phone,
  User,
  Layers,
  Package as PackageIcon,
  ShoppingBag,
  Receipt,
  CreditCard,
  Info,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  Clock,
  Sparkles,
  Stethoscope,
  Wallet,
  FileText,
  Coins
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
  outstanding?: number;
  wallet_balance?: number;
}

interface PackageItem {
  id: string | number;
  name: string;
  nameAr?: string | null;
  price?: number;
}

interface ProductItem {
  id: string | number;
  name: string;
  arabic_name?: string;
  selling_price?: number;
  price?: number;
}

interface AdminAddPreviousBookingViewProps {
  onClose: () => void;
  onBookingCreated?: () => void;
  initialCustomer?: CustomerItem | any;
  initialPatientPhone?: string;
  initialPatientName?: string;
  services?: any[];
  providers?: any[];
  customers?: any[];
  packages?: any[];
  products?: any[];
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
  initialCustomer,
  initialPatientPhone,
  initialPatientName,
  services = [],
  providers = [],
  customers = [],
  packages = [],
  products = [],
  branches = [],
  activeBranchId,
  lang = "en",
  t,
}) => {
  const tr = t || adminTranslations[lang].bookings.adminAddPreviousBooking;

  const initPhone = initialPatientPhone || initialCustomer?.mobile || initialCustomer?.phone || "";
  const initName = initialPatientName || initialCustomer?.name || "";

  // Row 1 State: Patient Phone *, Patient Name *, Doctor (Optional)
  const [patientPhone, setPatientPhone] = useState(initPhone);
  const [patientName, setPatientName] = useState(initName);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");

  useEffect(() => {
    const nextPhone = initialPatientPhone || initialCustomer?.mobile || initialCustomer?.phone;
    const nextName = initialPatientName || initialCustomer?.name;
    if (nextPhone) setPatientPhone(nextPhone);
    if (nextName) setPatientName(nextName);
  }, [initialCustomer, initialPatientPhone, initialPatientName]);

  // Row 2 State: Date *, Service (Optional), Package (Optional), Products (Optional)
  const [bookingDate, setBookingDate] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");

  // Row 3 State: Invoice Value, Actual Spent, Payment Method
  const [invoiceValue, setInvoiceValue] = useState<string>("");
  const [actualSpent, setActualSpent] = useState<string>("");
  const [selectedPaymentType, setSelectedPaymentType] = useState("");
  const [hasManuallyEditedSpent, setHasManuallyEditedSpent] = useState(false);

  // Row 4 State: Notes (Optional)
  const [notes, setNotes] = useState("");

  // Packages & Products Catalog State (auto-fetch if not passed as props)
  const [pkgList, setPkgList] = useState<PackageItem[]>(packages);
  const [prodList, setProdList] = useState<ProductItem[]>(products);

  useEffect(() => {
    if (packages && packages.length > 0) {
      setPkgList(packages);
    } else {
      fetch("/api/packages")
        .then(res => (res.ok ? res.json() : []))
        .then((data: any) => {
          if (Array.isArray(data)) setPkgList(data);
        })
        .catch(() => {});
    }
  }, [packages]);

  useEffect(() => {
    if (products && products.length > 0) {
      setProdList(products);
    } else {
      fetch("/api/inventory/products")
        .then(res => (res.ok ? res.json() : null))
        .then((data: any) => {
          if (data && Array.isArray(data.products)) setProdList(data.products);
          else if (Array.isArray(data)) setProdList(data);
        })
        .catch(() => {});
    }
  }, [products]);

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
    if (patientPhone && patientPhone.trim().length >= 8) {
      const cleanInput = cleanPhone(patientPhone);
      const found = customers.find(c => {
        const cMobile = cleanPhone(c.mobile || c.phone || "");
        return cMobile && cMobile === cleanInput;
      });
      if (found) return found;
    }
    if (initialCustomer && initialCustomer.name && (initialCustomer.mobile || initialCustomer.phone)) {
      return initialCustomer;
    }
    return null;
  }, [patientPhone, customers, initialCustomer]);

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

  // Helper to extract package name cleanly
  const getPackageName = (p: PackageItem) => {
    if (lang === "ar" && p.nameAr) return p.nameAr;
    return p.name || `Package #${p.id}`;
  };

  // Helper to extract product name cleanly
  const getProductName = (pr: ProductItem) => {
    if (lang === "ar" && pr.arabic_name) return pr.arabic_name;
    return pr.name || `Product #${pr.id}`;
  };

  // Recalculate invoice value when Service, Package, or Product changes
  const recalculateInvoice = (nextSrvId: string, nextPkgId: string, nextProdId: string) => {
    const srv = services.find(s => String(s.id) === String(nextSrvId));
    const pkg = pkgList.find(p => String(p.id) === String(nextPkgId));
    const prod = prodList.find(pr => String(pr.id) === String(nextProdId));

    const srvPrice = Number(srv?.price || 0);
    const pkgPrice = Number(pkg?.price || 0);
    const prodPrice = Number(prod?.selling_price ?? prod?.price ?? 0);

    const total = srvPrice + pkgPrice + prodPrice;
    const totalStr = total > 0 ? String(total) : "";

    setInvoiceValue(totalStr);
    if (!hasManuallyEditedSpent) {
      setActualSpent(totalStr);
    }
  };

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const newErrors: typeof errors = {};

    // Validate Phone (Required)
    const trimmedPhone = patientPhone.trim();
    if (!trimmedPhone) {
      newErrors.phone = tr.requiredField;
    } else if (!isValidPhone(trimmedPhone)) {
      newErrors.phone = tr.invalidPhone;
    }

    // Validate Name (Required)
    const trimmedName = patientName.trim();
    if (!trimmedName) {
      newErrors.name = tr.requiredField;
    }

    // Validate Date (Required)
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
      const selectedPkg = pkgList.find(p => String(p.id) === String(selectedPackageId));
      const selectedProd = prodList.find(pr => String(pr.id) === String(selectedProductId));

      const parsedInvoiceVal = invoiceValue !== "" ? parseFloat(invoiceValue) : 0;
      const parsedSpentVal = actualSpent !== "" ? parseFloat(actualSpent) : 0;

      const payload = {
        patientPhone: trimmedPhone,
        patientName: trimmedName,
        date: bookingDate,
        doctorId: selectedDoctorId || null,
        doctorName: selectedDoc?.name || null,
        serviceId: selectedServiceId ? Number(selectedServiceId) : null,
        serviceName: selectedSrv ? getServiceName(selectedSrv) : null,
        packageId: selectedPackageId || null,
        packageName: selectedPkg ? getPackageName(selectedPkg) : null,
        productId: selectedProductId || null,
        productName: selectedProd ? getProductName(selectedProd) : null,
        invoiceValue: isNaN(parsedInvoiceVal) ? 0 : parsedInvoiceVal,
        actualSpent: isNaN(parsedSpentVal) ? 0 : parsedSpentVal,
        paymentType: selectedPaymentType || null,
        notes: notes.trim() || null,
        branchId: activeBranchId || null
      };

      // POST /api/reservations/previous is staff-gated
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
        
        {/* ── ROW 1: 3 FIELDS (PATIENT PHONE *, PATIENT NAME *, DOCTOR OPTIONAL) ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* FIELD 1: PATIENT PHONE (REQUIRED) */}
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

          {/* FIELD 2: PATIENT NAME (REQUIRED) */}
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

          {/* FIELD 3: DOCTOR (OPTIONAL) */}
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
        </div>

        {/* ── ROW 2: 4 FIELDS (DATE *, SERVICE, PACKAGE, PRODUCTS) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* FIELD 4: DATE (REQUIRED) */}
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

          {/* FIELD 5: SERVICE (OPTIONAL) - No price written beside name */}
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
                onChange={(e) => {
                  const sId = e.target.value;
                  setSelectedServiceId(sId);
                  recalculateInvoice(sId, selectedPackageId, selectedProductId);
                }}
                className="w-full appearance-none rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-10 rtl:pl-10 rtl:pr-10 text-sm font-medium text-[#111827] outline-none transition focus:border-[#414E36] focus:ring-2 focus:ring-[#414E36]/10 cursor-pointer"
              >
                <option value="">{tr.selectServicePlaceholder}</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {getServiceName(s)}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 flex items-center pr-3.5 rtl:pr-0 rtl:pl-3.5 text-[#6B7280] z-10">
                <ChevronDown size={17} />
              </div>
            </div>
          </div>

          {/* FIELD 6: PACKAGE (OPTIONAL) */}
          <div className="space-y-1.5">
            <label htmlFor="packageSelect" className="text-xs sm:text-sm font-bold text-[#111827]">
              {tr.packageOptional || tr.packageLabel}
            </label>
            <div className="relative flex items-center">
              <div className="pointer-events-none absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 flex items-center pl-3.5 rtl:pl-0 rtl:pr-3.5 text-[#5A6A51] z-10">
                <PackageIcon size={17} />
              </div>
              <select
                id="packageSelect"
                value={selectedPackageId}
                onChange={(e) => {
                  const pId = e.target.value;
                  setSelectedPackageId(pId);
                  recalculateInvoice(selectedServiceId, pId, selectedProductId);
                }}
                className="w-full appearance-none rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-10 rtl:pl-10 rtl:pr-10 text-sm font-medium text-[#111827] outline-none transition focus:border-[#414E36] focus:ring-2 focus:ring-[#414E36]/10 cursor-pointer"
              >
                <option value="">{tr.selectPackagePlaceholder}</option>
                {pkgList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {getPackageName(p)}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 flex items-center pr-3.5 rtl:pr-0 rtl:pl-3.5 text-[#6B7280] z-10">
                <ChevronDown size={17} />
              </div>
            </div>
          </div>

          {/* FIELD 7: PRODUCTS (OPTIONAL) */}
          <div className="space-y-1.5">
            <label htmlFor="productSelect" className="text-xs sm:text-sm font-bold text-[#111827]">
              {tr.productsOptional || tr.productsLabel}
            </label>
            <div className="relative flex items-center">
              <div className="pointer-events-none absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 flex items-center pl-3.5 rtl:pl-0 rtl:pr-3.5 text-[#5A6A51] z-10">
                <ShoppingBag size={17} />
              </div>
              <select
                id="productSelect"
                value={selectedProductId}
                onChange={(e) => {
                  const prId = e.target.value;
                  setSelectedProductId(prId);
                  recalculateInvoice(selectedServiceId, selectedPackageId, prId);
                }}
                className="w-full appearance-none rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-10 rtl:pl-10 rtl:pr-10 text-sm font-medium text-[#111827] outline-none transition focus:border-[#414E36] focus:ring-2 focus:ring-[#414E36]/10 cursor-pointer"
              >
                <option value="">{tr.selectProductPlaceholder}</option>
                {prodList.map((pr) => (
                  <option key={pr.id} value={pr.id}>
                    {getProductName(pr)}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 flex items-center pr-3.5 rtl:pr-0 rtl:pl-3.5 text-[#6B7280] z-10">
                <ChevronDown size={17} />
              </div>
            </div>
          </div>
        </div>

        {/* ── ROW 3: 3 FIELDS (INVOICE VALUE, ACTUAL SPENT, PAYMENT METHOD) ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* FIELD 8: INVOICE VALUE (EDITABLE, AUTO-CALCULATED) */}
          <div className="space-y-1.5">
            <label htmlFor="invoiceValue" className="text-xs sm:text-sm font-bold text-[#111827]">
              {tr.invoiceValueLabel || "Invoice Value (EGP)"}
            </label>
            <div className="relative flex items-center">
              <div className="pointer-events-none absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 flex items-center pl-3.5 rtl:pl-0 rtl:pr-3.5 text-[#5A6A51] z-10">
                <Receipt size={17} />
              </div>
              <input
                id="invoiceValue"
                type="number"
                min="0"
                step="any"
                value={invoiceValue}
                onChange={(e) => {
                  const val = e.target.value;
                  setInvoiceValue(val);
                  if (!hasManuallyEditedSpent) {
                    setActualSpent(val);
                  }
                }}
                placeholder={tr.invoiceValuePlaceholder || "0.00"}
                title={tr.invoiceValueTooltip}
                className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 rtl:pl-4 rtl:pr-10 text-sm font-medium text-[#111827] outline-none transition focus:border-[#414E36] focus:ring-2 focus:ring-[#414E36]/10"
              />
            </div>
          </div>

          {/* FIELD 9: ACTUAL SPENT (AMOUNT PAID) */}
          <div className="space-y-1.5">
            <label htmlFor="actualSpent" className="text-xs sm:text-sm font-bold text-[#111827]">
              {tr.actualSpentLabel || "Actual Spent (EGP)"}
            </label>
            <div className="relative flex items-center">
              <div className="pointer-events-none absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 flex items-center pl-3.5 rtl:pl-0 rtl:pr-3.5 text-[#5A6A51] z-10">
                <Wallet size={17} />
              </div>
              <input
                id="actualSpent"
                type="number"
                min="0"
                step="any"
                value={actualSpent}
                onChange={(e) => {
                  setActualSpent(e.target.value);
                  setHasManuallyEditedSpent(true);
                }}
                placeholder={tr.actualSpentPlaceholder || "0.00"}
                title={tr.actualSpentTooltip}
                className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 rtl:pl-4 rtl:pr-10 text-sm font-medium text-[#111827] outline-none transition focus:border-[#414E36] focus:ring-2 focus:ring-[#414E36]/10"
              />
            </div>
          </div>

          {/* FIELD 10: PAYMENT METHOD (OPTIONAL) */}
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

        {/* ── ROW 4: NOTES (FULL WIDTH) ── */}
        <div className="space-y-1.5">
          <label htmlFor="bookingNotes" className="text-xs sm:text-sm font-bold text-[#111827] flex items-center gap-1.5">
            <FileText size={15} className="text-[#5A6A51]" />
            <span>{tr.notesLabel || "Notes (Optional)"}</span>
          </label>
          <div className="relative flex items-start">
            <textarea
              id="bookingNotes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={tr.notesPlaceholder || "Enter any notes or remarks regarding this historical booking..."}
              className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm font-medium text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#414E36] focus:ring-2 focus:ring-[#414E36]/10 resize-y"
            />
          </div>
        </div>

        {/* ── DYNAMIC FINANCIAL LEDGER IMPACT PREVIEW ── */}
        {(() => {
          const numInvoice = parseFloat(invoiceValue) || 0;
          const numSpent = parseFloat(actualSpent) || 0;
          const diff = numInvoice - numSpent;

          if (numInvoice === 0 && numSpent === 0) return null;

          return (
            <div className="rounded-2xl border border-gray-200/80 bg-[#F9FBF8] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
              <div className="flex items-center gap-2 font-semibold text-[#374151]">
                <Coins size={16} className="text-[#414E36] shrink-0" />
                <span>{tr.ledgerImpact || "Financial Ledger Preview:"}</span>
                <span className="text-[#6B7280] font-normal">
                  (Invoice: {numInvoice.toLocaleString()} EGP | Spent: {numSpent.toLocaleString()} EGP)
                </span>
              </div>
              <div>
                {diff > 0 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 border border-rose-200 px-3 py-1 font-bold text-rose-700">
                    <span>+{diff.toLocaleString()} EGP</span>
                    <span className="font-medium text-[11px] text-rose-600">({tr.ledgerDebt || "Added to Outstanding Debt"})</span>
                  </span>
                ) : diff < 0 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1 font-bold text-emerald-700">
                    <span>+{Math.abs(diff).toLocaleString()} EGP</span>
                    <span className="font-medium text-[11px] text-emerald-600">({tr.ledgerCredit || "Settles Debt & Credits Wallet"})</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1 font-bold text-emerald-700">
                    <CheckCircle2 size={13} />
                    <span>{tr.ledgerExact || "Fully Settled (0 EGP Debt)"}</span>
                  </span>
                )}
              </div>
            </div>
          );
        })()}

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


