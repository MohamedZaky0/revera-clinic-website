"use client";

import React, { useState } from "react";
import { ArrowLeft } from "lucide-react";

interface CustomerFormModalProps {
  setShowCustomerFormModal: (v: boolean) => void;
  selectedCustomerForEdit: any;
  authenticatedJsonHeaders: { "Content-Type": string; Authorization: string };
  fetchCustomers: () => void;
}

export default function CustomerFormModal({
  setShowCustomerFormModal,
  selectedCustomerForEdit,
  authenticatedJsonHeaders,
  fetchCustomers,
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
      setCustomerFormError("Customer name is required.");
      return;
    }
    if (!custMobile.trim()) {
      setCustomerFormError("Mobile number is required.");
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
      setCustomerFormError("Please enter a valid Egyptian mobile number (11 digits, starting with 010, 011, 012, or 015).");
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
        setCustomerFormError("Please enter a valid Egyptian mobile number for WhatsApp (11 digits, starting with 010, 011, 012, or 015).");
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
          throw new Error(data.error || "Failed to save customer");
        }
        return data;
      })
      .then(() => {
        fetchCustomers();
        setShowCustomerFormModal(false);
      })
      .catch((err) => {
        console.error("handleSaveCustomer error:", err);
        setCustomerFormError(err.message || "An error occurred while saving the customer.");
      })
      .finally(() => {
        setSavingCustomer(false);
      });
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <button
          type="button"
          onClick={() => setShowCustomerFormModal(false)}
          className="flex items-center gap-1.5 text-xs font-bold text-[#5A6A51] hover:text-[#414E36] outline-none transition uppercase tracking-wider"
        >
          <ArrowLeft size={14} /> Back to Patients
        </button>
      </div>
      <div className="w-full bg-white rounded-3xl border border-[#414E36]/10 p-8 shadow-sm">
        <h3 className="text-2xl font-bold text-[#1F251A] mb-1">
          {selectedCustomerForEdit ? "Edit Customer Details" : "Add New Customer"}
        </h3>
        <p className="text-xs text-[#5A6A51] mb-6">
          {selectedCustomerForEdit ? `Editing profile of ${custName}` : "Create a new customer profile"}
        </p>
        {customerFormError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 mb-5">{customerFormError}</div>
        )}
        <div className="space-y-5">
          <div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-[#5A6A51] mb-1">Customer Name <span className="text-red-500">*</span></label>
                <input type="text" value={custName} onChange={(e) => setCustName(e.target.value)} placeholder="e.g. Mohamed Aly" className="w-full rounded-lg border border-[#414E36]/15 bg-white px-3 py-2 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C]" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5A6A51] mb-1">Mobile Number <span className="text-red-500">*</span></label>
                <input type="text" value={custMobile} onChange={(e) => setCustMobile(e.target.value)} placeholder="e.g. 01012345678" className="w-full rounded-lg border border-[#414E36]/15 bg-white px-3 py-2 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C]" required />
              </div>
              <div className="col-span-1 sm:col-span-2 space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-[#414E36]">
                  <input type="checkbox" checked={isCustomerWhatsappSame} onChange={(e) => setIsCustomerWhatsappSame(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-[#414E36] focus:ring-[#414E36]" />
                  <span>This is the WhatsApp number too</span>
                </label>
                {!isCustomerWhatsappSame && (
                  <div className="animate-fadeIn mt-2">
                    <label className="block text-xs font-semibold text-[#5A6A51] mb-1">WhatsApp Number <span className="text-red-500">*</span></label>
                    <input type="text" value={customerWhatsapp} onChange={(e) => setCustomerWhatsapp(e.target.value)} placeholder="e.g. 01012345678" className="w-full rounded-lg border border-[#414E36]/15 bg-white px-3 py-2 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C]" required />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5A6A51] mb-1">Email Address</label>
                <input type="email" value={custEmail} onChange={(e) => setCustEmail(e.target.value)} placeholder="e.g. mohamed@example.com" className="w-full rounded-lg border border-[#414E36]/15 bg-white px-3 py-2 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5A6A51] mb-1">Age</label>
                <input type="number" value={custAge} onChange={(e) => setCustAge(e.target.value)} placeholder="e.g. 28" className="w-full rounded-lg border border-[#414E36]/15 bg-white px-3 py-2 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5A6A51] mb-1">Gender</label>
                <select value={custGender} onChange={(e) => setCustGender(e.target.value as any)} className="w-full rounded-lg border border-[#414E36]/15 bg-white px-3 py-2 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C]">
                  <option value="">Select Gender</option>
                  <option value="Male">Male / ذكر</option>
                  <option value="Female">Female / أنثى</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5A6A51] mb-1">National ID</label>
                <input type="text" value={custNationalId} onChange={(e) => setCustNationalId(e.target.value)} placeholder="Enter 14-digit National ID" className="w-full rounded-lg border border-[#414E36]/15 bg-white px-3 py-2 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5A6A51] mb-1">Referral Source</label>
                <select value={custReferral} onChange={(e) => setCustReferral(e.target.value)} className="w-full rounded-lg border border-[#414E36]/15 bg-white px-3 py-2 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C] cursor-pointer">
                  <option value="">Select Referral Source...</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Instagram">Instagram</option>
                  <option value="TikTok">TikTok</option>
                  <option value="Google Search">Google Search</option>
                  <option value="Friend / Word of Mouth">Friend / Word of Mouth</option>
                  <option value="Walk-in">Walk-in</option>
                  <option value="Website">Website</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5A6A51] mb-1">Occupation</label>
                <input type="text" value={custOccupation} onChange={(e) => setCustOccupation(e.target.value)} placeholder="e.g. Engineer, Doctor" className="w-full rounded-lg border border-[#414E36]/15 bg-white px-3 py-2 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C]" />
              </div>
            </div>
          </div>
          <hr className="border-[#414E36]/10" />
          <div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-[#5A6A51] mb-1">City / Area</label>
                <input type="text" value={custArea} onChange={(e) => setCustArea(e.target.value)} placeholder="e.g. New Cairo" className="w-full rounded-lg border border-[#414E36]/15 bg-white px-3 py-2 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5A6A51] mb-1">Street</label>
                <input type="text" value={custStreet} onChange={(e) => setCustStreet(e.target.value)} placeholder="e.g. 90th Street" className="w-full rounded-lg border border-[#414E36]/15 bg-white px-3 py-2 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5A6A51] mb-1">Building</label>
                <input type="text" value={custBuilding} onChange={(e) => setCustBuilding(e.target.value)} placeholder="e.g. Building 14" className="w-full rounded-lg border border-[#414E36]/15 bg-white px-3 py-2 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C]" />
              </div>
            </div>
          </div>
          <hr className="border-[#414E36]/10" />
          <div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-[#5A6A51] mb-1">Wallet Balance (EGP)</label>
                <input type="number" min="0" value={custWallet} onChange={(e) => setCustWallet(e.target.value)} placeholder="0.00" className="w-full rounded-lg border border-[#414E36]/15 bg-white px-3 py-2 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5A6A51] mb-1">Total Spent (EGP)</label>
                <input type="number" min="0" value={custSpent} onChange={(e) => setCustSpent(e.target.value)} placeholder="0.00" className="w-full rounded-lg border border-[#414E36]/15 bg-white px-3 py-2 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5A6A51] mb-1">Outstanding Balance (EGP)</label>
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
                  <span className="text-sm font-semibold text-[#1F251A]">Active Profile</span>
                </label>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5A6A51] mb-1">Internal Notes (Optional)</label>
                <textarea value={custNote} onChange={(e) => setCustNote(e.target.value)} placeholder="Add patient history, clinic preferences..." rows={3} className="w-full rounded-lg border border-[#414E36]/15 bg-white px-3 py-2 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C] resize-none" />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-[#414E36]/10 pt-5">
            <button type="button" onClick={() => setShowCustomerFormModal(false)} className="rounded-lg border border-[#414E36]/15 px-4 py-2 text-sm font-medium text-[#414E36] transition hover:bg-[#EDF1EC]">Cancel</button>
            <button type="button" onClick={handleSaveCustomer} disabled={savingCustomer} className="inline-flex items-center gap-2 rounded-lg bg-[#414E36] px-5 py-2.5 text-sm font-semibold text-[#FBFBF9] shadow-sm transition hover:bg-[#2e3a26] disabled:opacity-60 disabled:cursor-not-allowed">{savingCustomer ? "Saving..." : "Save Customer"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
