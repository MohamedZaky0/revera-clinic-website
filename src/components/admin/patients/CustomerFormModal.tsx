"use client";

import React, { useState } from "react";
import { ArrowLeft } from "lucide-react";
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
  }, []);

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
      // new demographic fields
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
    <div dir={lang === "ar" ? "rtl" : "ltr"} className="space-y-6 animate-fadeIn">
      <div>
        <button
          type="button"
          onClick={() => setShowCustomerFormModal(false)}
          className="flex items-center gap-1.5 text-xs font-bold text-[#5A6A51] hover:text-[#414E36] outline-none transition uppercase tracking-wider"
        >
          <ArrowLeft size={14} /> {t.backBtn}
        </button>
      </div>
      <div className="w-full bg-white rounded-3xl border border-[#414E36]/10 p-8 shadow-sm">
        <h3 className="text-2xl font-bold text-[#1F251A] mb-1">
          {selectedCustomerForEdit ? t.editTitle : t.addTitle}
        </h3>
        <p className="text-xs text-[#5A6A51] mb-6">
          {selectedCustomerForEdit ? `${t.editSubtitle} ${custName}` : t.addSubtitle}
        </p>
        {customerFormError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 mb-5">{customerFormError}</div>
        )}
        <div className="space-y-5">
          <div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-[#5A6A51] mb-1">{t.nameLabel} <span className="text-red-500">*</span></label>
                <input type="text" value={custName} onChange={(e) => setCustName(e.target.value)} placeholder={t.namePlaceholder} className="w-full rounded-lg border border-[#414E36]/15 bg-white px-3 py-2 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C]" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5A6A51] mb-1">{t.mobileLabel} <span className="text-red-500">*</span></label>
                <input type="text" value={custMobile} onChange={(e) => setCustMobile(e.target.value)} placeholder={t.mobilePlaceholder} className="w-full rounded-lg border border-[#414E36]/15 bg-white px-3 py-2 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C]" required />
              </div>
              <div className="col-span-1 sm:col-span-2 space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-[#414E36]">
                  <input type="checkbox" checked={isCustomerWhatsappSame} onChange={(e) => setIsCustomerWhatsappSame(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-[#414E36] focus:ring-[#414E36]" />
                  <span>{t.whatsappSameLabel}</span>
                </label>
                {!isCustomerWhatsappSame && (
                  <div className="animate-fadeIn mt-2">
                    <label className="block text-xs font-semibold text-[#5A6A51] mb-1">{t.whatsappLabel} <span className="text-red-500">*</span></label>
                    <input type="text" value={customerWhatsapp} onChange={(e) => setCustomerWhatsapp(e.target.value)} placeholder={t.mobilePlaceholder} className="w-full rounded-lg border border-[#414E36]/15 bg-white px-3 py-2 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C]" required />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5A6A51] mb-1">{t.emailLabel}</label>
                <input type="email" value={custEmail} onChange={(e) => setCustEmail(e.target.value)} placeholder={t.emailPlaceholder} className="w-full rounded-lg border border-[#414E36]/15 bg-white px-3 py-2 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5A6A51] mb-1">{t.ageLabel}</label>
                <input type="number" value={custAge} onChange={(e) => setCustAge(e.target.value)} placeholder={t.agePlaceholder} className="w-full rounded-lg border border-[#414E36]/15 bg-white px-3 py-2 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5A6A51] mb-1">{t.genderLabel}</label>
                <select value={custGender} onChange={(e) => setCustGender(e.target.value as any)} className="w-full rounded-lg border border-[#414E36]/15 bg-white px-3 py-2 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C]">
                  <option value="">{t.genderSelectPlaceholder}</option>
                  <option value="Male">{t.genderMale}</option>
                  <option value="Female">{t.genderFemale}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5A6A51] mb-1">{t.nationalIdLabel}</label>
                <input type="text" value={custNationalId} onChange={(e) => setCustNationalId(e.target.value)} placeholder={t.nationalIdPlaceholder} className="w-full rounded-lg border border-[#414E36]/15 bg-white px-3 py-2 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5A6A51] mb-1">{t.referralLabel}</label>
                <select value={custReferral} onChange={(e) => setCustReferral(e.target.value)} className="w-full rounded-lg border border-[#414E36]/15 bg-white px-3 py-2 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C] cursor-pointer">
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
              <div>
                <label className="block text-xs font-semibold text-[#5A6A51] mb-1">{t.occupationLabel}</label>
                <input type="text" value={custOccupation} onChange={(e) => setCustOccupation(e.target.value)} placeholder={t.occupationPlaceholder} className="w-full rounded-lg border border-[#414E36]/15 bg-white px-3 py-2 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C]" />
              </div>
            </div>
          </div>
          <hr className="border-[#414E36]/10" />
          <div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-[#5A6A51] mb-1">{t.cityLabel}</label>
                <input type="text" value={custArea} onChange={(e) => setCustArea(e.target.value)} placeholder={t.cityPlaceholder} className="w-full rounded-lg border border-[#414E36]/15 bg-white px-3 py-2 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5A6A51] mb-1">{t.streetLabel}</label>
                <input type="text" value={custStreet} onChange={(e) => setCustStreet(e.target.value)} placeholder={t.streetPlaceholder} className="w-full rounded-lg border border-[#414E36]/15 bg-white px-3 py-2 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5A6A51] mb-1">{t.buildingLabel}</label>
                <input type="text" value={custBuilding} onChange={(e) => setCustBuilding(e.target.value)} placeholder={t.buildingPlaceholder} className="w-full rounded-lg border border-[#414E36]/15 bg-white px-3 py-2 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C]" />
              </div>
            </div>
          </div>
          <hr className="border-[#414E36]/10" />
          <div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-[#5A6A51] mb-1">{t.walletLabel}</label>
                <input type="number" min="0" value={custWallet} onChange={(e) => setCustWallet(e.target.value)} placeholder="0.00" className="w-full rounded-lg border border-[#414E36]/15 bg-white px-3 py-2 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5A6A51] mb-1">{t.spentLabel}</label>
                <input type="number" min="0" value={custSpent} onChange={(e) => setCustSpent(e.target.value)} placeholder="0.00" className="w-full rounded-lg border border-[#414E36]/15 bg-white px-3 py-2 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5A6A51] mb-1">{t.outstandingLabel}</label>
                <input type="number" min="0" value={custOutstanding} onChange={(e) => setCustOutstanding(e.target.value)} placeholder="0.00" className="w-full rounded-lg border border-[#414E36]/15 bg-white px-3 py-2 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C]" />
              </div>
            </div>
          </div>
          <hr className="border-[#414E36]/10" />
          <div>
            <div className="space-y-4">
              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={custActive} onChange={(e) => setCustActive(e.target.checked)} className="h-4 w-4 rounded border-[#414E36]/15 text-[#414E36] focus:ring-[#C4AE7C] cursor-pointer" />
                  <span className="text-sm font-semibold text-[#1F251A]">{t.activeLabel}</span>
                </label>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5A6A51] mb-1">{t.notesLabel}</label>
                <textarea value={custNote} onChange={(e) => setCustNote(e.target.value)} placeholder={t.notesPlaceholder} rows={3} className="w-full rounded-lg border border-[#414E36]/15 bg-white px-3 py-2 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C] resize-none" />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-[#414E36]/10 pt-5">
            <button type="button" onClick={() => setShowCustomerFormModal(false)} className="rounded-lg border border-[#414E36]/15 px-4 py-2 text-sm font-medium text-[#414E36] transition hover:bg-[#EDF1EC]">{t.cancelBtn}</button>
            <button type="button" onClick={handleSaveCustomer} disabled={savingCustomer} className="inline-flex items-center gap-2 rounded-lg bg-[#414E36] px-5 py-2.5 text-sm font-semibold text-[#FBFBF9] shadow-sm transition hover:bg-[#2e3a26] disabled:opacity-60 disabled:cursor-not-allowed">{savingCustomer ? t.savingBtn : t.saveBtn}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
