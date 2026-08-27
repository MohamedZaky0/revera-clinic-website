"use client";

import React, { useState } from "react";
import {
  ArrowLeft,
  BookUser,
  Lock,
  User,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  Briefcase,
  Compass,
  MapPin,
  Building2,
  Building,
  Signpost,
  Wallet,
  Coins,
  ShieldCheck,
  Receipt,
  Loader2,
} from "lucide-react";
import { adminTranslations } from "@/components/admin/translations";

interface CustomerFormModalProps {
  setShowCustomerFormModal: (v: boolean) => void;
  selectedCustomerForEdit: any;
  authenticatedJsonHeaders: { "Content-Type": string; Authorization: string };
  fetchCustomers: () => void;
  lang: "en" | "ar";
  t: typeof adminTranslations["en"]["patients"]["customerFormModal"];
}

export default function CustomerFormModal({
  setShowCustomerFormModal,
  selectedCustomerForEdit,
  authenticatedJsonHeaders,
  fetchCustomers,
  lang,
  t,
}: CustomerFormModalProps) {
  const c = selectedCustomerForEdit || {};
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [customerFormError, setCustomerFormError] = useState("");
  const [custName, setCustName] = useState(c.name || "");
  const [custMobile, setCustMobile] = useState(c.mobile || c.phone || "");
  const [custEmail, setCustEmail] = useState(c.email || "");
  const [custGender, setCustGender] = useState<"Male" | "Female" | "">((c.gender as any) || "");
  const [custActive, setCustActive] = useState(c.active !== undefined ? c.active : true);
  const [custSpent, setCustSpent] = useState(String(c.spent_amount !== undefined ? c.spent_amount : c.spent || 0));
  const [custOutstanding, setCustOutstanding] = useState(String(c.outstanding || 0));
  const [custWallet, setCustWallet] = useState(String(c.wallet_balance || c.wallet || 0));
  const [custArea, setCustArea] = useState(c.area || "");
  const [custLocationName, setCustLocationName] = useState(c.location_name || "");
  const [custStreet, setCustStreet] = useState(c.street_name || "");
  const [custBuilding, setCustBuilding] = useState(c.building_no || "");
  const [custFloor, setCustFloor] = useState(c.floor_no || "");
  const [custNote, setCustNote] = useState("");
  const [isCustomerWhatsappSame, setIsCustomerWhatsappSame] = useState(true);
  const [customerWhatsapp, setCustomerWhatsapp] = useState("");
  const [custAge, setCustAge] = useState(c.age !== undefined && c.age !== null ? String(c.age) : "");
  const [custNationalId, setCustNationalId] = useState(c.national_id || "");
  const [custAddress, setCustAddress] = useState(c.address || "");
  const [custReferral, setCustReferral] = useState(c.referral || "");
  const [custOccupation, setCustOccupation] = useState(c.occupation || "");

  // Initialize WhatsApp/note parsing for edit mode
  React.useEffect(() => {
    if (selectedCustomerForEdit) {
      const rawNote = selectedCustomerForEdit.note || "";
      const waMatch = rawNote.match(/\[WhatsApp:\s*([^\]]+)\]/);
      if (waMatch) {
        setIsCustomerWhatsappSame(false);
        setCustomerWhatsapp(waMatch[1].trim());
        setCustNote(rawNote.replace(/\[WhatsApp:\s*([^\]]+)\]\n?/, "").trim());
      } else {
        setIsCustomerWhatsappSame(true);
        setCustomerWhatsapp("");
        setCustNote(rawNote);
      }
    }
  }, [selectedCustomerForEdit]);

  function handleSaveCustomer() {
    if (!custName.trim()) {
      setCustomerFormError(t.nameRequiredErr);
      return;
    }
    if (!custMobile.trim()) {
      setCustomerFormError(t.mobileRequiredErr);
      return;
    }

    // Validate Egyptian mobile number format
    let cleanedMobile = custMobile.trim();
    if (cleanedMobile.startsWith("+20")) {
      cleanedMobile = "0" + cleanedMobile.slice(3);
    } else if (cleanedMobile.startsWith("0020")) {
      cleanedMobile = "0" + cleanedMobile.slice(4);
    }
    if (!/^01[0125]\d{8}$/.test(cleanedMobile)) {
      setCustomerFormError(t.mobileFormatErr);
      return;
    }
    if (!isCustomerWhatsappSame) {
      let cleanedWA = customerWhatsapp.trim();
      if (cleanedWA.startsWith("+20")) {
        cleanedWA = "0" + cleanedWA.slice(3);
      } else if (cleanedWA.startsWith("0020")) {
        cleanedWA = "0" + cleanedWA.slice(4);
      }
      if (!/^01[0125]\d{8}$/.test(cleanedWA)) {
        setCustomerFormError(t.whatsappFormatErr);
        return;
      }
    }

    setSavingCustomer(true);
    setCustomerFormError("");

    const finalNote = isCustomerWhatsappSame
      ? custNote.trim()
      : `[WhatsApp: ${customerWhatsapp.trim()}]${custNote.trim() ? "\n" : ""}${custNote.trim()}`;

    const payload = {
      id: selectedCustomerForEdit?.id || undefined,
      name: custName.trim(),
      mobile: cleanedMobile,
      email: custEmail.trim() || null,
      gender: custGender || null,
      active: custActive,
      spent_amount: parseFloat(custSpent) || 0,
      outstanding: parseFloat(custOutstanding) || 0,
      wallet_balance: parseFloat(custWallet) || 0,
      area: custArea.trim() || null,
      location_name: custLocationName.trim() || null,
      street_name: custStreet.trim() || null,
      building_no: custBuilding.trim() || null,
      floor_no: custFloor.trim() || null,
      note: finalNote || null,
      // demographic fields
      age: custAge ? parseInt(custAge) : null,
      national_id: custNationalId.trim() || null,
      address: custAddress.trim() || null,
      referral: custReferral.trim() || null,
      occupation: custOccupation.trim() || null,
    };

    fetch("/api/customers", {
      method: "POST",
      headers: authenticatedJsonHeaders,
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || t.saveFailedErr);
        }
        return data;
      })
      .then(() => {
        fetchCustomers();
        setShowCustomerFormModal(false);
      })
      .catch((err) => {
        console.error("handleSaveCustomer error:", err);
        setCustomerFormError(err.message || t.saveErrorErr);
      })
      .finally(() => {
        setSavingCustomer(false);
      });
  }

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} className="space-y-6 animate-fadeIn pb-12">
      {/* Top Navigation & Action Header */}
      <div className="space-y-3">
        <div>
          <button
            type="button"
            onClick={() => setShowCustomerFormModal(false)}
            className="flex items-center gap-1.5 text-xs font-bold text-[#5A6A51] hover:text-[#414E36] outline-none transition uppercase tracking-wider cursor-pointer"
          >
            <ArrowLeft size={14} className={lang === "ar" ? "rotate-180" : ""} /> {t.backBtn}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold text-[#1F251A] tracking-tight">
              {selectedCustomerForEdit ? t.editTitle : t.addTitle}
            </h3>
            <p className="text-xs text-[#5A6A51] mt-0.5">
              {selectedCustomerForEdit ? t.editSubtitle : t.addSubtitle}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setShowCustomerFormModal(false)}
              className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-xs hover:bg-gray-50 transition cursor-pointer"
            >
              {t.cancelBtn}
            </button>
            <button
              type="button"
              onClick={handleSaveCustomer}
              disabled={savingCustomer}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#203D20] px-6 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-[#182E18] transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {savingCustomer ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{t.savingBtn}</span>
                </>
              ) : (
                <span>{selectedCustomerForEdit ? (t.saveChangesBtn || "Save Changes") : t.saveBtn}</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Form Container */}
      <div className="w-full bg-white rounded-3xl border border-[#414E36]/10 p-6 sm:p-8 shadow-sm space-y-8">
        {customerFormError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {customerFormError}
          </div>
        )}

        {/* ── SECTION 1: Contact Information ── */}
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#EBF1E8] text-[#414E36] flex items-center justify-center shrink-0">
              <BookUser size={20} className="text-[#414E36]" />
            </div>
            <div>
              <h4 className="text-base font-bold text-[#1F251A]">{t.contactSectionTitle || "Contact Information"}</h4>
              <p className="text-xs text-[#5A6A51]">{t.contactSectionSubtitle || "Manage the customer's contact details."}</p>
            </div>
          </div>

          {/* Edit Mode Lock Banner */}
          {selectedCustomerForEdit && (
            <div className="flex items-center gap-2.5 rounded-xl bg-[#F0F6EE] border border-[#D5E5D1] px-4 py-3 text-xs sm:text-sm font-medium text-[#2E5233]">
              <Lock size={15} className="shrink-0 text-[#2E5233]" />
              <span>{t.nameCannotBeEdited || "Customer name cannot be edited."}</span>
            </div>
          )}

          {/* Customer Name */}
          <div>
            <label className="block text-xs font-semibold text-[#5A6A51] mb-1.5">
              {t.nameLabel} {!selectedCustomerForEdit && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 rtl:left-auto rtl:right-0 rtl:pl-0 rtl:pr-3.5 text-gray-400">
                <User size={16} />
              </div>
              <input
                type="text"
                value={custName}
                onChange={(e) => setCustName(e.target.value)}
                readOnly={Boolean(selectedCustomerForEdit)}
                disabled={Boolean(selectedCustomerForEdit)}
                placeholder={t.namePlaceholder}
                className={`w-full rounded-xl border px-3.5 py-2.5 pl-10 rtl:pl-3.5 rtl:pr-10 text-sm outline-none transition ${
                  selectedCustomerForEdit
                    ? "bg-[#F7F7F6] text-gray-700 border-gray-200 cursor-not-allowed font-medium"
                    : "bg-white text-[#1F251A] border-[#414E36]/15 focus:border-[#414E36] focus:ring-1 focus:ring-[#414E36]"
                }`}
                required={!selectedCustomerForEdit}
              />
            </div>
          </div>

          {/* Mobile Number & Email Address */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-[#5A6A51] mb-1.5">
                {t.mobileLabel} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 rtl:left-auto rtl:right-0 rtl:pl-0 rtl:pr-3.5 text-gray-400">
                  <Phone size={16} />
                </div>
                <input
                  type="text"
                  value={custMobile}
                  onChange={(e) => setCustMobile(e.target.value)}
                  placeholder={t.mobilePlaceholder}
                  className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3.5 py-2.5 pl-10 rtl:pl-3.5 rtl:pr-10 text-sm text-[#1F251A] outline-none transition focus:border-[#414E36] focus:ring-1 focus:ring-[#414E36]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5A6A51] mb-1.5">
                {t.emailLabel}
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 rtl:left-auto rtl:right-0 rtl:pl-0 rtl:pr-3.5 text-gray-400">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  value={custEmail}
                  onChange={(e) => setCustEmail(e.target.value)}
                  placeholder={t.emailPlaceholder}
                  className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3.5 py-2.5 pl-10 rtl:pl-3.5 rtl:pr-10 text-sm text-[#1F251A] outline-none transition focus:border-[#414E36] focus:ring-1 focus:ring-[#414E36]"
                />
              </div>
            </div>
          </div>

          {/* WhatsApp Same Checkbox & WhatsApp Input */}
          <div className="space-y-2">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-[#414E36] select-none">
              <input
                type="checkbox"
                checked={isCustomerWhatsappSame}
                onChange={(e) => setIsCustomerWhatsappSame(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-[#203D20] focus:ring-[#203D20] accent-[#203D20] cursor-pointer"
              />
              <span>{t.whatsappSameLabel}</span>
            </label>
            {!isCustomerWhatsappSame && (
              <div className="animate-fadeIn mt-2">
                <label className="block text-xs font-semibold text-[#5A6A51] mb-1.5">
                  {t.whatsappLabel} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 rtl:left-auto rtl:right-0 rtl:pl-0 rtl:pr-3.5 text-gray-400">
                    <Phone size={16} />
                  </div>
                  <input
                    type="text"
                    value={customerWhatsapp}
                    onChange={(e) => setCustomerWhatsapp(e.target.value)}
                    placeholder={t.mobilePlaceholder}
                    className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3.5 py-2.5 pl-10 rtl:pl-3.5 rtl:pr-10 text-sm text-[#1F251A] outline-none transition focus:border-[#414E36] focus:ring-1 focus:ring-[#414E36]"
                    required
                  />
                </div>
              </div>
            )}
          </div>

          {/* Demographics & Personal Attributes */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-[#5A6A51] mb-1.5">{t.ageLabel}</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 rtl:left-auto rtl:right-0 rtl:pl-0 rtl:pr-3.5 text-gray-400">
                  <Calendar size={16} />
                </div>
                <input
                  type="number"
                  value={custAge}
                  onChange={(e) => setCustAge(e.target.value)}
                  placeholder={t.agePlaceholder}
                  className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3.5 py-2.5 pl-10 rtl:pl-3.5 rtl:pr-10 text-sm text-[#1F251A] outline-none transition focus:border-[#414E36] focus:ring-1 focus:ring-[#414E36]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5A6A51] mb-1.5">{t.genderLabel}</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 rtl:left-auto rtl:right-0 rtl:pl-0 rtl:pr-3.5 text-gray-400">
                  <User size={16} />
                </div>
                <select
                  value={custGender}
                  onChange={(e) => setCustGender(e.target.value as any)}
                  className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3.5 py-2.5 pl-10 rtl:pl-3.5 rtl:pr-10 text-sm text-[#1F251A] outline-none transition focus:border-[#414E36] focus:ring-1 focus:ring-[#414E36] cursor-pointer"
                >
                  <option value="">{t.genderSelectPlaceholder}</option>
                  <option value="Male">{t.genderMale}</option>
                  <option value="Female">{t.genderFemale}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5A6A51] mb-1.5">{t.nationalIdLabel}</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 rtl:left-auto rtl:right-0 rtl:pl-0 rtl:pr-3.5 text-gray-400">
                  <CreditCard size={16} />
                </div>
                <input
                  type="text"
                  value={custNationalId}
                  onChange={(e) => setCustNationalId(e.target.value)}
                  placeholder={t.nationalIdPlaceholder}
                  className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3.5 py-2.5 pl-10 rtl:pl-3.5 rtl:pr-10 text-sm text-[#1F251A] outline-none transition focus:border-[#414E36] focus:ring-1 focus:ring-[#414E36]"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-[#5A6A51] mb-1.5">{t.referralLabel}</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 rtl:left-auto rtl:right-0 rtl:pl-0 rtl:pr-3.5 text-gray-400">
                  <Compass size={16} />
                </div>
                <select
                  value={custReferral}
                  onChange={(e) => setCustReferral(e.target.value)}
                  className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3.5 py-2.5 pl-10 rtl:pl-3.5 rtl:pr-10 text-sm text-[#1F251A] outline-none transition focus:border-[#414E36] focus:ring-1 focus:ring-[#414E36] cursor-pointer"
                >
                  <option value="">{t.referralSelectPlaceholder}</option>
                  <option value="Facebook">{t.referralSources["Facebook"]}</option>
                  <option value="Instagram">{t.referralSources["Instagram"]}</option>
                  <option value="TikTok">{t.referralSources["TikTok"]}</option>
                  <option value="Google Search">{t.referralSources["Google Search"]}</option>
                  <option value="Friend / Word of Mouth">{t.referralSources["Friend / Word of Mouth"]}</option>
                  <option value="Walk-in">{t.referralSources["Walk-in"]}</option>
                  <option value="Website">{t.referralSources["Website"]}</option>
                  <option value="Other">{t.referralSources["Other"]}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5A6A51] mb-1.5">{t.occupationLabel}</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 rtl:left-auto rtl:right-0 rtl:pl-0 rtl:pr-3.5 text-gray-400">
                  <Briefcase size={16} />
                </div>
                <input
                  type="text"
                  value={custOccupation}
                  onChange={(e) => setCustOccupation(e.target.value)}
                  placeholder={t.occupationPlaceholder}
                  className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3.5 py-2.5 pl-10 rtl:pl-3.5 rtl:pr-10 text-sm text-[#1F251A] outline-none transition focus:border-[#414E36] focus:ring-1 focus:ring-[#414E36]"
                />
              </div>
            </div>
          </div>
        </div>

        <hr className="border-[#414E36]/10" />

        {/* ── SECTION 2: Address Information ── */}
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#EBF1E8] text-[#414E36] flex items-center justify-center shrink-0">
              <MapPin size={20} className="text-[#414E36]" />
            </div>
            <div>
              <h4 className="text-base font-bold text-[#1F251A]">{t.addressSectionTitle || "Address Information"}</h4>
              <p className="text-xs text-[#5A6A51]">{t.addressSectionSubtitle || "Manage the customer's address details."}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-[#5A6A51] mb-1.5">{t.cityLabel}</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 rtl:left-auto rtl:right-0 rtl:pl-0 rtl:pr-3.5 text-gray-400">
                  <Building2 size={16} />
                </div>
                <input
                  type="text"
                  value={custArea}
                  onChange={(e) => setCustArea(e.target.value)}
                  placeholder={t.cityPlaceholder}
                  className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3.5 py-2.5 pl-10 rtl:pl-3.5 rtl:pr-10 text-sm text-[#1F251A] outline-none transition focus:border-[#414E36] focus:ring-1 focus:ring-[#414E36]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5A6A51] mb-1.5">{t.streetLabel}</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 rtl:left-auto rtl:right-0 rtl:pl-0 rtl:pr-3.5 text-gray-400">
                  <Signpost size={16} />
                </div>
                <input
                  type="text"
                  value={custStreet}
                  onChange={(e) => setCustStreet(e.target.value)}
                  placeholder={t.streetPlaceholder}
                  className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3.5 py-2.5 pl-10 rtl:pl-3.5 rtl:pr-10 text-sm text-[#1F251A] outline-none transition focus:border-[#414E36] focus:ring-1 focus:ring-[#414E36]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5A6A51] mb-1.5">{t.buildingLabel}</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 rtl:left-auto rtl:right-0 rtl:pl-0 rtl:pr-3.5 text-gray-400">
                  <Building size={16} />
                </div>
                <input
                  type="text"
                  value={custBuilding}
                  onChange={(e) => setCustBuilding(e.target.value)}
                  placeholder={t.buildingPlaceholder}
                  className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3.5 py-2.5 pl-10 rtl:pl-3.5 rtl:pr-10 text-sm text-[#1F251A] outline-none transition focus:border-[#414E36] focus:ring-1 focus:ring-[#414E36]"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-[#5A6A51] mb-1.5">{t.floorLabel || "Floor / Apt (Optional)"}</label>
              <input
                type="text"
                value={custFloor}
                onChange={(e) => setCustFloor(e.target.value)}
                placeholder={t.floorPlaceholder || "e.g. Floor 2, Apt 4"}
                className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3.5 py-2.5 text-sm text-[#1F251A] outline-none transition focus:border-[#414E36] focus:ring-1 focus:ring-[#414E36]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5A6A51] mb-1.5">
                {lang === "ar" ? "تفاصيل إضافية للعنوان (اختياري)" : "Additional Address Details (Optional)"}
              </label>
              <input
                type="text"
                value={custAddress}
                onChange={(e) => setCustAddress(e.target.value)}
                placeholder={lang === "ar" ? "مثال: بجوار مول التسعين" : "e.g. Near Downtown Mall"}
                className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3.5 py-2.5 text-sm text-[#1F251A] outline-none transition focus:border-[#414E36] focus:ring-1 focus:ring-[#414E36]"
              />
            </div>
          </div>
        </div>

        <hr className="border-[#414E36]/10" />

        {/* ── SECTION 3: Financial Balances ── */}
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#EBF1E8] text-[#414E36] flex items-center justify-center shrink-0">
              <Wallet size={20} className="text-[#414E36]" />
            </div>
            <div>
              <h4 className="text-base font-bold text-[#1F251A]">{t.financialSectionTitle || "Financial Information"}</h4>
              <p className="text-xs text-[#5A6A51]">
                {selectedCustomerForEdit
                  ? (t.financialSectionSubtitle || "View the customer's wallet, total spend, and outstanding balances.")
                  : (t.financialSectionSubtitleAdd || "Set an opening balance if this customer already has wallet credit, prior spend, or an outstanding debt.")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-[#5A6A51] mb-1.5">{t.walletLabel}</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 rtl:left-auto rtl:right-0 rtl:pl-0 rtl:pr-3.5 text-gray-400">
                  <Wallet size={16} />
                </div>
                <input
                  type={selectedCustomerForEdit ? "text" : "number"}
                  min={selectedCustomerForEdit ? undefined : "0"}
                  readOnly={Boolean(selectedCustomerForEdit)}
                  disabled={Boolean(selectedCustomerForEdit)}
                  value={selectedCustomerForEdit ? Number(custWallet || 0).toLocaleString("en-US") : custWallet}
                  onChange={(e) => setCustWallet(e.target.value)}
                  placeholder="0"
                  className={`w-full rounded-xl border px-3.5 py-2.5 pl-10 rtl:pl-3.5 rtl:pr-10 text-sm outline-none transition ${
                    selectedCustomerForEdit
                      ? "border-gray-200 bg-[#F7F7F6] font-semibold text-gray-700 cursor-not-allowed select-none"
                      : "bg-white text-[#1F251A] border-[#414E36]/15 focus:border-[#414E36] focus:ring-1 focus:ring-[#414E36]"
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5A6A51] mb-1.5">{t.spentLabel}</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 rtl:left-auto rtl:right-0 rtl:pl-0 rtl:pr-3.5 text-gray-400">
                  <Coins size={16} />
                </div>
                <input
                  type={selectedCustomerForEdit ? "text" : "number"}
                  min={selectedCustomerForEdit ? undefined : "0"}
                  readOnly={Boolean(selectedCustomerForEdit)}
                  disabled={Boolean(selectedCustomerForEdit)}
                  value={selectedCustomerForEdit ? Number(custSpent || 0).toLocaleString("en-US") : custSpent}
                  onChange={(e) => setCustSpent(e.target.value)}
                  placeholder="0"
                  className={`w-full rounded-xl border px-3.5 py-2.5 pl-10 rtl:pl-3.5 rtl:pr-10 text-sm outline-none transition ${
                    selectedCustomerForEdit
                      ? "border-gray-200 bg-[#F7F7F6] font-semibold text-gray-700 cursor-not-allowed select-none"
                      : "bg-white text-[#1F251A] border-[#414E36]/15 focus:border-[#414E36] focus:ring-1 focus:ring-[#414E36]"
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5A6A51] mb-1.5">{t.outstandingLabel}</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 rtl:left-auto rtl:right-0 rtl:pl-0 rtl:pr-3.5 text-gray-400">
                  <Receipt size={16} />
                </div>
                <input
                  type={selectedCustomerForEdit ? "text" : "number"}
                  min={selectedCustomerForEdit ? undefined : "0"}
                  readOnly={Boolean(selectedCustomerForEdit)}
                  disabled={Boolean(selectedCustomerForEdit)}
                  value={selectedCustomerForEdit ? Number(custOutstanding || 0).toLocaleString("en-US") : custOutstanding}
                  onChange={(e) => setCustOutstanding(e.target.value)}
                  placeholder="0"
                  className={`w-full rounded-xl border px-3.5 py-2.5 pl-10 rtl:pl-3.5 rtl:pr-10 text-sm outline-none transition ${
                    selectedCustomerForEdit
                      ? "border-gray-200 bg-[#F7F7F6] font-semibold text-gray-700 cursor-not-allowed select-none"
                      : "bg-white text-[#1F251A] border-[#414E36]/15 focus:border-[#414E36] focus:ring-1 focus:ring-[#414E36]"
                  }`}
                />
              </div>
            </div>
          </div>
        </div>

        <hr className="border-[#414E36]/10" />

        {/* ── SECTION 4: Status & Internal Notes ── */}
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#EBF1E8] text-[#414E36] flex items-center justify-center shrink-0">
              <ShieldCheck size={20} className="text-[#414E36]" />
            </div>
            <div>
              <h4 className="text-base font-bold text-[#1F251A]">{t.statusSectionTitle || "Status"}</h4>
              <p className="text-xs text-[#5A6A51]">{t.statusSectionSubtitle || "Manage the customer account status."}</p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={custActive}
                onChange={(e) => setCustActive(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#203D20] focus:ring-[#203D20] accent-[#203D20] cursor-pointer"
              />
              <div>
                <span className="block text-sm font-bold text-[#1F251A]">{t.activeLabel}</span>
                <span className="block text-xs text-[#5A6A51] mt-0.5">{t.activeProfileHelp || "Uncheck to deactivate this customer profile"}</span>
              </div>
            </label>

            <div>
              <label className="block text-xs font-semibold text-[#5A6A51] mb-1.5">{t.notesLabel}</label>
              <textarea
                value={custNote}
                onChange={(e) => setCustNote(e.target.value)}
                placeholder={t.notesPlaceholder}
                rows={3}
                className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3.5 py-2.5 text-sm text-[#1F251A] outline-none transition focus:border-[#414E36] focus:ring-1 focus:ring-[#414E36] resize-none"
              />
            </div>
          </div>
        </div>

        {/* Bottom Action Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-[#414E36]/10 pt-6">
          <button
            type="button"
            onClick={() => setShowCustomerFormModal(false)}
            className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-xs hover:bg-gray-50 transition cursor-pointer"
          >
            {t.cancelBtn}
          </button>
          <button
            type="button"
            onClick={handleSaveCustomer}
            disabled={savingCustomer}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#203D20] px-6 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-[#182E18] transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {savingCustomer ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>{t.savingBtn}</span>
              </>
            ) : (
              <span>{selectedCustomerForEdit ? (t.saveChangesBtn || "Save Changes") : t.saveBtn}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

