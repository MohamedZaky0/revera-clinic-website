"use client";

import React from "react";
import {
  Play,
  FileText,
  Check,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Edit,
  Save,
  Sparkles,
  ShoppingBag,
  Zap,
  X
} from "lucide-react";
import { DoctorTab } from "../types";

interface DoctorOngoingSessionTabProps {
  activeSessionBooking: any;
  setShowPrescriptionModal: (show: boolean) => void;
  handleCompleteTreatment: (booking: any) => void;
  medicalRecord: any;
  medicalRecordLoading: boolean;
  showMedicalForm: boolean;
  setShowMedicalForm: (show: boolean) => void;
  formSkinType: string;
  setFormSkinType: (val: string) => void;
  formAllergies: string;
  setFormAllergies: (val: string) => void;
  formMedicationDetails: string;
  setFormMedicationDetails: (val: string) => void;
  formMedicalConditionsDetails: string;
  setFormMedicalConditionsDetails: (val: string) => void;
  formPreviousTreatmentsDetails: string;
  setFormPreviousTreatmentsDetails: (val: string) => void;
  savingMedicalRecord: boolean;
  handleSaveMedicalRecord: (e: React.FormEvent) => void;
  productsList: any[];
  devicesList: any[];
  selectedProductId: string;
  setSelectedProductId: (id: string) => void;
  selectedProductQty: number;
  setSelectedProductQty: (qty: number) => void;
  usedProducts: { id: string; name: string; qty: number; unitPrice: number; total: number }[];
  handleAddProductToSession: () => void;
  handleRemoveProductFromSession: (index: number) => void;
  selectedDeviceId: string;
  setSelectedDeviceId: (id: string) => void;
  extraPulsesCount: number;
  setExtraPulsesCount: (count: number) => void;
  pricePerPulse: number;
  setPricePerPulse: (price: number) => void;
  baseBookingPrice: number;
  productsSubtotal: number;
  extraPulsesSubtotal: number;
  updatedInvoiceTotal: number;
  clinicalNote: string;
  setClinicalNote: (note: string) => void;
  handleSaveClinicalNote: (booking: any) => void;
  savingNote: boolean;
  setActiveTab: (tab: DoctorTab) => void;
}

export default function DoctorOngoingSessionTab({
  activeSessionBooking,
  setShowPrescriptionModal,
  handleCompleteTreatment,
  medicalRecord,
  medicalRecordLoading,
  showMedicalForm,
  setShowMedicalForm,
  formSkinType,
  setFormSkinType,
  formAllergies,
  setFormAllergies,
  formMedicationDetails,
  setFormMedicationDetails,
  formMedicalConditionsDetails,
  setFormMedicalConditionsDetails,
  formPreviousTreatmentsDetails,
  setFormPreviousTreatmentsDetails,
  savingMedicalRecord,
  handleSaveMedicalRecord,
  productsList,
  devicesList,
  selectedProductId,
  setSelectedProductId,
  selectedProductQty,
  setSelectedProductQty,
  usedProducts,
  handleAddProductToSession,
  handleRemoveProductFromSession,
  selectedDeviceId,
  setSelectedDeviceId,
  extraPulsesCount,
  setExtraPulsesCount,
  pricePerPulse,
  setPricePerPulse,
  baseBookingPrice,
  productsSubtotal,
  extraPulsesSubtotal,
  updatedInvoiceTotal,
  clinicalNote,
  setClinicalNote,
  handleSaveClinicalNote,
  savingNote,
  setActiveTab
}: DoctorOngoingSessionTabProps) {
  return (
    <div className="space-y-6 w-full">
      {activeSessionBooking && activeSessionBooking.status !== "completed" ? (
        <>
          {/* Active Patient Card */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-6 border border-[#414E36]/10 shadow-sm w-full">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#414E36] text-white font-bold text-xl shadow-md">
                {(activeSessionBooking.name || "P").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold text-[#1F251A]">
                    {activeSessionBooking.name || activeSessionBooking.customer_name || "Patient"}
                  </h2>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-0.5 text-xs font-bold text-amber-800 animate-pulse">
                    <Play size={12} /> Session Started by Reception
                  </span>
                </div>
                <p className="text-xs text-[#5A6A51] mt-1">
                  {activeSessionBooking.service || activeSessionBooking.service_name} • {activeSessionBooking.time || activeSessionBooking.time_slot || "Today"} • <strong className="text-[#414E36]">{activeSessionBooking.room || "Treatment Room"}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowPrescriptionModal(true)}
                className="flex items-center gap-2 rounded-2xl border border-[#414E36]/20 bg-white px-4 py-2.5 text-xs font-bold text-[#414E36] hover:bg-[#F4F5F1] transition shadow-sm"
              >
                <FileText size={14} /> Write Prescription
              </button>
              <button
                type="button"
                onClick={() => handleCompleteTreatment(activeSessionBooking)}
                className="flex items-center gap-2 rounded-2xl bg-[#414E36] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#343F2B] transition"
              >
                <Check size={16} /> Complete Treatment
              </button>
            </div>
          </div>

          {/* Treatment Details & Notes */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
            {/* Patient Medical Record & Intake Section */}
            <div className="space-y-6">
              <div className="rounded-3xl border border-[#414E36]/10 bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#1F251A] uppercase tracking-wider flex items-center gap-2">
                    <AlertCircle size={16} className="text-[#414E36]" /> Patient Medical Record
                  </h3>

                  {medicalRecord ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                      <CheckCircle2 size={10} /> On File
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold text-rose-800 animate-pulse">
                      <AlertTriangle size={10} /> Intake Required
                    </span>
                  )}
                </div>

                {medicalRecordLoading ? (
                  <p className="text-xs text-[#5A6A51]">Loading patient medical record...</p>
                ) : medicalRecord && !showMedicalForm ? (
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between border-b border-[#414E36]/10 pb-2">
                      <span className="font-bold text-[#5A6A51]">Skin Type:</span>
                      <span className="font-bold text-[#1F251A]">{medicalRecord.skin_type || "Normal"}</span>
                    </div>
                    <div className="flex justify-between border-b border-[#414E36]/10 pb-2">
                      <span className="font-bold text-[#5A6A51]">Allergies:</span>
                      <span className="font-bold text-rose-700">{medicalRecord.allergies || "None reported"}</span>
                    </div>
                    <div className="flex justify-between border-b border-[#414E36]/10 pb-2">
                      <span className="font-bold text-[#5A6A51]">Current Medication:</span>
                      <span className="font-semibold text-[#1F251A]">{medicalRecord.medication_details || "None"}</span>
                    </div>
                    <div className="flex justify-between border-b border-[#414E36]/10 pb-2">
                      <span className="font-bold text-[#5A6A51]">Medical Conditions:</span>
                      <span className="font-semibold text-[#1F251A]">{medicalRecord.medical_conditions_details || "None"}</span>
                    </div>
                    <div className="flex justify-between border-b border-[#414E36]/10 pb-2">
                      <span className="font-bold text-[#5A6A51]">Previous Treatments:</span>
                      <span className="font-semibold text-[#1F251A]">{medicalRecord.previous_treatments_details || "None"}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowMedicalForm(true)}
                      className="mt-2 flex items-center gap-1.5 text-xs font-bold text-[#414E36] hover:underline"
                    >
                      <Edit size={14} /> Update Medical Record
                    </button>
                  </div>
                ) : (
                  /* Medical Intake Form */
                  <form onSubmit={handleSaveMedicalRecord} className="space-y-3 border-t border-[#414E36]/10 pt-3">
                    {!medicalRecord && (
                      <div className="rounded-2xl bg-amber-50 p-3 text-xs text-amber-900 border border-amber-200">
                        <strong className="block font-bold">First Visit Detected!</strong>
                        Patient medical record intake is required before completing treatment.
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-bold text-[#5A6A51] mb-1">Skin Type</label>
                      <select
                        value={formSkinType}
                        onChange={(e) => setFormSkinType(e.target.value)}
                        className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2 text-xs font-bold text-[#1F251A] outline-none"
                      >
                        <option value="Normal">Normal</option>
                        <option value="Dry">Dry</option>
                        <option value="Oily">Oily</option>
                        <option value="Sensitive">Sensitive</option>
                        <option value="Combination">Combination</option>
                        <option value="Acne-Prone">Acne-Prone</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#5A6A51] mb-1">Known Allergies</label>
                      <input
                        type="text"
                        placeholder="e.g. Latex, Aspirin, None"
                        value={formAllergies}
                        onChange={(e) => setFormAllergies(e.target.value)}
                        className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2 text-xs text-[#1F251A] outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#5A6A51] mb-1">Current Medications</label>
                      <input
                        type="text"
                        placeholder="e.g. Roaccutane, Blood thinners, None"
                        value={formMedicationDetails}
                        onChange={(e) => setFormMedicationDetails(e.target.value)}
                        className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2 text-xs text-[#1F251A] outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#5A6A51] mb-1">Chronic Medical Conditions</label>
                      <input
                        type="text"
                        placeholder="e.g. Diabetes, Eczema, None"
                        value={formMedicalConditionsDetails}
                        onChange={(e) => setFormMedicalConditionsDetails(e.target.value)}
                        className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2 text-xs text-[#1F251A] outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#5A6A51] mb-1">Previous Aesthetic Treatments</label>
                      <input
                        type="text"
                        placeholder="e.g. Chemical Peel 3 mos ago, None"
                        value={formPreviousTreatmentsDetails}
                        onChange={(e) => setFormPreviousTreatmentsDetails(e.target.value)}
                        className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2 text-xs text-[#1F251A] outline-none"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      {medicalRecord && (
                        <button
                          type="button"
                          onClick={() => setShowMedicalForm(false)}
                          className="rounded-xl border border-[#414E36]/20 bg-white px-3 py-1.5 text-xs font-bold text-[#5A6A51]"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={savingMedicalRecord}
                        className="rounded-xl bg-[#414E36] px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-[#343F2B] transition disabled:opacity-50 flex items-center gap-1"
                      >
                        <Save size={14} /> {savingMedicalRecord ? "Saving..." : "Save Medical Record"}
                      </button>
                    </div>
                  </form>
                )}

                <div className="mt-6 border-t border-[#414E36]/10 pt-4 space-y-2">
                  <span className="text-xs font-bold text-[#5A6A51]">Booking Notes:</span>
                  <p className="text-xs text-[#1F251A] leading-relaxed bg-[#F4F5F1] p-3 rounded-2xl font-mono">
                    {activeSessionBooking.notes || "No booking notes provided."}
                  </p>
                </div>
              </div>
            </div>

            {/* Doctor Clinical Notes & Session Consumables Section */}
            <div className="lg:col-span-2 space-y-6">
              {/* SESSION CONSUMABLES & EXTRA PULSES SECTION */}
              <div className="rounded-3xl border border-[#414E36]/10 bg-white p-6 shadow-sm space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#414E36]/10 pb-3">
                  <h3 className="text-sm font-bold text-[#1F251A] uppercase tracking-wider flex items-center gap-2">
                    <Sparkles size={16} className="text-[#414E36]" /> Session Consumables & Extra Device Pulses
                  </h3>
                  <div className="flex items-center gap-2 rounded-2xl bg-[#414E36]/10 px-3.5 py-1.5 text-xs font-black text-[#414E36]">
                    <span>Updated Invoice Total:</span>
                    <span className="text-sm text-[#414E36] font-extrabold">{updatedInvoiceTotal} EGP</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Products Used */}
                  <div className="space-y-3 bg-[#FBFBF9] p-4 rounded-2xl border border-[#414E36]/10">
                    <h4 className="text-xs font-bold text-[#1F251A] uppercase tracking-wider flex items-center gap-1.5">
                      <ShoppingBag size={14} className="text-[#414E36]" /> Products Used in Treatment
                    </h4>
                    
                    <div className="grid grid-cols-3 gap-2">
                      <select
                        value={selectedProductId}
                        onChange={(e) => setSelectedProductId(e.target.value)}
                        className="col-span-2 rounded-xl border border-[#414E36]/15 bg-white px-2.5 py-1.5 text-xs font-bold text-[#1F251A] outline-none"
                      >
                        <option value="">-- Select Product --</option>
                        {productsList.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.price || p.unit_price || p.selling_price || 0} EGP)
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        min={1}
                        value={selectedProductQty}
                        onChange={(e) => setSelectedProductQty(Math.max(1, parseInt(e.target.value) || 1))}
                        className="rounded-xl border border-[#414E36]/15 bg-white px-2.5 py-1.5 text-xs font-bold text-[#1F251A] outline-none"
                        placeholder="Qty"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleAddProductToSession}
                      className="w-full rounded-xl bg-[#414E36] py-1.5 text-xs font-bold text-white hover:bg-[#343F2B] transition"
                    >
                      + Add Product to Invoice
                    </button>

                    {usedProducts.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-[#414E36]/10">
                        {usedProducts.map((item, i) => (
                          <div key={i} className="flex items-center justify-between text-xs bg-white p-2 rounded-xl border border-[#414E36]/10">
                            <div>
                              <span className="font-bold text-[#1F251A]">{item.name}</span>
                              <span className="text-[10px] text-[#5A6A51] block">Qty: {item.qty} x {item.unitPrice} EGP</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-[#414E36]">{item.total} EGP</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveProductFromSession(i)}
                                className="text-rose-600 hover:text-rose-800 text-xs font-bold"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Extra Device Pulses */}
                  <div className="space-y-3 bg-[#FBFBF9] p-4 rounded-2xl border border-[#414E36]/10">
                    <h4 className="text-xs font-bold text-[#1F251A] uppercase tracking-wider flex items-center gap-1.5">
                      <Zap size={14} className="text-amber-600" /> Extra Device Pulses
                    </h4>

                    <div>
                      <label className="block text-[10px] font-bold text-[#5A6A51] mb-1">Select Laser / Aesthetic Device</label>
                      <select
                        value={selectedDeviceId}
                        onChange={(e) => setSelectedDeviceId(e.target.value)}
                        className="w-full rounded-xl border border-[#414E36]/15 bg-white px-2.5 py-1.5 text-xs font-bold text-[#1F251A] outline-none"
                      >
                        <option value="">-- Select Device --</option>
                        {devicesList.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.status || 'Active'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-[#5A6A51] mb-1">Extra Pulses Count</label>
                        <input
                          type="number"
                          min={0}
                          value={extraPulsesCount}
                          onChange={(e) => setExtraPulsesCount(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full rounded-xl border border-[#414E36]/15 bg-white px-2.5 py-1.5 text-xs font-bold text-[#1F251A] outline-none"
                          placeholder="e.g. 50"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[#5A6A51] mb-1">Price per Pulse (EGP)</label>
                        <input
                          type="number"
                          min={0}
                          value={pricePerPulse}
                          onChange={(e) => setPricePerPulse(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-full rounded-xl border border-[#414E36]/15 bg-white px-2.5 py-1.5 text-xs font-bold text-[#1F251A] outline-none"
                          placeholder="e.g. 2.5"
                        />
                      </div>
                    </div>

                    {extraPulsesSubtotal > 0 && (
                      <div className="text-xs bg-amber-50 p-2.5 rounded-xl border border-amber-200 flex justify-between font-bold text-amber-900">
                        <span>Extra Pulses Subtotal:</span>
                        <span>+{extraPulsesSubtotal} EGP</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Invoice Breakdown Summary */}
                <div className="bg-[#414E36]/05 p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-4 text-[#5A6A51]">
                    <span>Base Service: <strong className="text-[#1F251A]">{baseBookingPrice} EGP</strong></span>
                    <span>Products Addons: <strong className="text-[#1F251A]">+{productsSubtotal} EGP</strong></span>
                    <span>Pulses Addons: <strong className="text-[#1F251A]">+{extraPulsesSubtotal} EGP</strong></span>
                  </div>
                  <div className="text-[#414E36] font-extrabold text-sm">
                    Final Invoice: {updatedInvoiceTotal} EGP
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-[#414E36]/10 bg-white p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-[#1F251A] uppercase tracking-wider flex items-center gap-2">
                  <FileText size={16} className="text-[#414E36]" /> Doctor Procedure Observations & Medical Notes
                </h3>
                <textarea
                  rows={8}
                  value={clinicalNote}
                  onChange={(e) => setClinicalNote(e.target.value)}
                  placeholder="Enter clinical observations, laser pulse parameters, skin reactions, and post-procedure recommendations..."
                  className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] p-4 text-xs text-[#1F251A] outline-none focus:border-[#414E36] focus:ring-2 focus:ring-[#414E36]/20 font-sans"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleSaveClinicalNote(activeSessionBooking)}
                    disabled={savingNote}
                    className="rounded-xl bg-[#414E36] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#343F2B] transition disabled:opacity-50"
                  >
                    {savingNote ? "Saving..." : "Save Clinical Notes"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-3xl border border-[#414E36]/10 bg-white p-12 text-center text-[#5A6A51] space-y-4">
          <div className="h-16 w-16 mx-auto flex items-center justify-center rounded-full bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
            <Play size={28} />
          </div>
          <h3 className="text-xl font-bold text-[#1F251A]">Waiting for Receptionist to Start Session</h3>
          <p className="text-xs text-[#5A6A51] max-w-md mx-auto leading-relaxed">
            When the receptionist clicks <strong>&quot;Start Session&quot;</strong> on a patient booking assigned to you, the patient treatment portal will automatically open here in real-time.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setActiveTab("schedule")}
              className="rounded-2xl bg-[#414E36] px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#343F2B] transition"
            >
              View Today&apos;s Patient Queue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
