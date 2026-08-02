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
  X,
  Clock,
  ChevronRight,
  UserCheck
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
  reservations?: any[];
  setActiveSessionBooking?: (booking: any) => void;
  t: any;
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
  setActiveTab,
  reservations = [],
  setActiveSessionBooking,
  t
}: DoctorOngoingSessionTabProps) {
  // Find all active / started sessions from reservations list
  const activeSessionsList = reservations.filter((r) => {
    const st = String(r.status || "").toLowerCase().trim();
    return (
      st === "started" || st === "in-progress" || st === "in_progress" || st === "active" || st === "in treatment"
    );
  });

  // Find all non-completed queue bookings
  const queueBookings = reservations.filter(
    (r) => r.status !== "completed" && r.status !== "cancelled"
  );

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
                    <Play size={12} /> {t.sessionStartedByReception}
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
                <FileText size={14} /> {t.writePrescriptionBtn}
              </button>
              <button
                type="button"
                onClick={() => handleCompleteTreatment(activeSessionBooking)}
                className="flex items-center gap-2 rounded-2xl bg-[#414E36] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#343F2B] transition"
              >
                <Check size={16} /> {t.completeTreatmentBtn}
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
                    <AlertCircle size={16} className="text-[#414E36]" /> {t.patientMedicalRecordTitle}
                  </h3>

                  {medicalRecord ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                      <CheckCircle2 size={10} /> {t.onFileStatus}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold text-rose-800 animate-pulse">
                      <AlertTriangle size={10} /> {t.intakeRequiredStatus}
                    </span>
                  )}
                </div>

                {medicalRecordLoading ? (
                  <p className="text-xs text-[#5A6A51]">{t.loadingMedicalRecord}</p>
                ) : medicalRecord && !showMedicalForm ? (
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between border-b border-[#414E36]/10 pb-2">
                      <span className="font-bold text-[#5A6A51]">{t.skinTypeLabel}:</span>
                      <span className="font-bold text-[#1F251A]">{medicalRecord.skin_type || "Normal"}</span>
                    </div>
                    <div className="flex justify-between border-b border-[#414E36]/10 pb-2">
                      <span className="font-bold text-[#5A6A51]">{t.allergiesLabel}:</span>
                      <span className="font-bold text-rose-700">{medicalRecord.allergies || "None reported"}</span>
                    </div>
                    <div className="flex justify-between border-b border-[#414E36]/10 pb-2">
                      <span className="font-bold text-[#5A6A51]">{t.currentMedicationLabel}:</span>
                      <span className="font-semibold text-[#1F251A]">{medicalRecord.medication_details || "None"}</span>
                    </div>
                    <div className="flex justify-between border-b border-[#414E36]/10 pb-2">
                      <span className="font-bold text-[#5A6A51]">{t.medicalConditionsLabel}:</span>
                      <span className="font-semibold text-[#1F251A]">{medicalRecord.medical_conditions_details || "None"}</span>
                    </div>
                    <div className="flex justify-between border-b border-[#414E36]/10 pb-2">
                      <span className="font-bold text-[#5A6A51]">{t.previousTreatmentsLabel}:</span>
                      <span className="font-semibold text-[#1F251A]">{medicalRecord.previous_treatments_details || "None"}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowMedicalForm(true)}
                      className="mt-2 flex items-center gap-1.5 text-xs font-bold text-[#414E36] hover:underline"
                    >
                      <Edit size={14} /> {t.updateMedicalRecordBtn}
                    </button>
                  </div>
                ) : (
                  /* Medical Intake Form */
                  <form onSubmit={handleSaveMedicalRecord} className="space-y-3 border-t border-[#414E36]/10 pt-3">
                    {!medicalRecord && (
                      <div className="rounded-2xl bg-amber-50 p-3 text-xs text-amber-900 border border-amber-200">
                        <strong className="block font-bold">{t.firstVisitDetected}</strong>
                        {t.firstVisitNotice}
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-bold text-[#5A6A51] mb-1">{t.skinTypeLabel}</label>
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
                      <label className="block text-[11px] font-bold text-[#5A6A51] mb-1">{t.allergiesLabel}</label>
                      <input
                        type="text"
                        placeholder="e.g. Latex, Aspirin, None"
                        value={formAllergies}
                        onChange={(e) => setFormAllergies(e.target.value)}
                        className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2 text-xs text-[#1F251A] outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#5A6A51] mb-1">{t.currentMedicationLabel}</label>
                      <input
                        type="text"
                        placeholder="e.g. Roaccutane, Blood thinners, None"
                        value={formMedicationDetails}
                        onChange={(e) => setFormMedicationDetails(e.target.value)}
                        className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2 text-xs text-[#1F251A] outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#5A6A51] mb-1">{t.medicalConditionsLabel}</label>
                      <input
                        type="text"
                        placeholder="e.g. Diabetes, Eczema, None"
                        value={formMedicalConditionsDetails}
                        onChange={(e) => setFormMedicalConditionsDetails(e.target.value)}
                        className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2 text-xs text-[#1F251A] outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#5A6A51] mb-1">{t.previousTreatmentsLabel}</label>
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
                          {t.cancelBtn}
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={savingMedicalRecord}
                        className="rounded-xl bg-[#414E36] px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-[#343F2B] transition disabled:opacity-50 flex items-center gap-1"
                      >
                        <Save size={14} /> {savingMedicalRecord ? "..." : t.saveMedicalRecordBtn}
                      </button>
                    </div>
                  </form>
                )}

                <div className="mt-6 border-t border-[#414E36]/10 pt-4 space-y-2">
                  <span className="text-xs font-bold text-[#5A6A51]">{t.bookingNotesTitle}</span>
                  <p className="text-xs text-[#1F251A] leading-relaxed bg-[#F4F5F1] p-3 rounded-2xl font-mono">
                    {activeSessionBooking.notes || t.noBookingNotes}
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
                    <Sparkles size={16} className="text-[#414E36]" /> {t.sessionConsumablesTitle}
                  </h3>
                  <div className="flex items-center gap-2 rounded-2xl bg-[#414E36]/10 px-3.5 py-1.5 text-xs font-black text-[#414E36]">
                    <span>{t.updatedInvoiceTotal}</span>
                    <span className="text-sm text-[#414E36] font-extrabold">{updatedInvoiceTotal} EGP</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Products Used */}
                  <div className="space-y-3 bg-[#FBFBF9] p-4 rounded-2xl border border-[#414E36]/10">
                    <h4 className="text-xs font-bold text-[#1F251A] uppercase tracking-wider flex items-center gap-1.5">
                      <ShoppingBag size={14} className="text-[#414E36]" /> {t.productsUsedTitle}
                    </h4>
                    
                    <div className="grid grid-cols-3 gap-2">
                      <select
                        value={selectedProductId}
                        onChange={(e) => setSelectedProductId(e.target.value)}
                        className="col-span-2 rounded-xl border border-[#414E36]/15 bg-white px-2.5 py-1.5 text-xs font-bold text-[#1F251A] outline-none"
                      >
                        <option value="">{t.selectProductPlaceholder}</option>
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
                      {t.addProductToInvoiceBtn}
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
                      <Zap size={14} className="text-amber-600" /> {t.extraDevicePulsesTitle}
                    </h4>

                    <div>
                      <label className="block text-[10px] font-bold text-[#5A6A51] mb-1">{t.selectDevicePlaceholder}</label>
                      <select
                        value={selectedDeviceId}
                        onChange={(e) => {
                          const devId = e.target.value;
                          setSelectedDeviceId(devId);
                          const dev = devicesList.find((d) => d.id === devId);
                          if (dev) {
                            const pPrice = Number(dev.price_per_pulse || dev.pulse_price || dev.cost_per_pulse || 2.5);
                            setPricePerPulse(pPrice);
                          } else {
                            setPricePerPulse(0);
                          }
                        }}
                        className="w-full rounded-xl border border-[#414E36]/15 bg-white px-2.5 py-1.5 text-xs font-bold text-[#1F251A] outline-none"
                      >
                        <option value="">{t.selectDevicePlaceholder}</option>
                        {devicesList.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.status || 'Active'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#5A6A51] mb-1">{t.extraPulsesCountLabel}</label>
                      <input
                        type="number"
                        min={0}
                        value={extraPulsesCount}
                        onChange={(e) => setExtraPulsesCount(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2 text-xs font-bold text-[#1F251A] outline-none focus:border-[#414E36]"
                        placeholder="e.g. 50"
                      />
                    </div>

                    {extraPulsesSubtotal > 0 && (
                      <div className="text-xs bg-amber-50 p-2.5 rounded-xl border border-amber-200 flex justify-between font-bold text-amber-900">
                        <span>{t.extraPulsesSubtotal} ({extraPulsesCount} pulses @ {pricePerPulse} EGP)</span>
                        <span>+{extraPulsesSubtotal} EGP</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Invoice Breakdown Summary */}
                <div className="bg-[#414E36]/05 p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-4 text-[#5A6A51]">
                    <span>{t.baseServiceLabel} <strong className="text-[#1F251A]">{baseBookingPrice} EGP</strong></span>
                    <span>{t.productsAddonsLabel} <strong className="text-[#1F251A]">+{productsSubtotal} EGP</strong></span>
                    <span>{t.pulsesAddonsLabel} <strong className="text-[#1F251A]">+{extraPulsesSubtotal} EGP</strong></span>
                  </div>
                  <div className="text-[#414E36] font-extrabold text-sm">
                    {t.finalInvoiceLabel} {updatedInvoiceTotal} EGP
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-[#414E36]/10 bg-white p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-[#1F251A] uppercase tracking-wider flex items-center gap-2">
                  <FileText size={16} className="text-[#414E36]" /> {t.doctorNotesTitle}
                </h3>
                <textarea
                  rows={8}
                  value={clinicalNote}
                  onChange={(e) => setClinicalNote(e.target.value)}
                  placeholder={t.doctorNotesPlaceholder}
                  className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] p-4 text-xs text-[#1F251A] outline-none focus:border-[#414E36] focus:ring-2 focus:ring-[#414E36]/20 font-sans"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleSaveClinicalNote(activeSessionBooking)}
                    disabled={savingNote}
                    className="rounded-xl bg-[#414E36] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#343F2B] transition disabled:opacity-50"
                  >
                    {savingNote ? "..." : t.saveClinicalNotesBtn}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-6">
          {/* Active Sessions Banner if any found */}
          {activeSessionsList.length > 0 && (
            <div className="rounded-3xl border-2 border-amber-300 bg-amber-50 p-6 shadow-md space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-white font-bold text-lg shadow-sm animate-pulse">
                    <Play size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-amber-950">{t.activeSessionDetectedTitle}</h3>
                    <p className="text-xs text-amber-800 font-bold mt-0.5">
                      {activeSessionsList[0].name || activeSessionsList[0].customer_name} • {activeSessionsList[0].service || activeSessionsList[0].service_name} • <strong className="text-amber-950">{activeSessionsList[0].room || activeSessionsList[0].room_name || "Treatment Room"}</strong>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSessionBooking?.(activeSessionsList[0])}
                  className="rounded-2xl bg-[#414E36] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#343F2B] transition flex items-center gap-2"
                >
                  <UserCheck size={16} /> {t.openActiveSessionBtn}
                </button>
              </div>
            </div>
          )}

          {/* Standard Waiting Screen */}
          <div className="rounded-3xl border border-[#414E36]/10 bg-white p-12 text-center text-[#5A6A51] space-y-4 shadow-sm">
            <div className="h-16 w-16 mx-auto flex items-center justify-center rounded-full bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
              <Play size={28} />
            </div>
            <h3 className="text-xl font-bold text-[#1F251A]">{t.waitingForReceptionistTitle}</h3>
            <p className="text-xs text-[#5A6A51] max-w-md mx-auto leading-relaxed">
              {t.waitingForReceptionistDesc}
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setActiveTab("schedule")}
                className="rounded-2xl bg-[#414E36] px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#343F2B] transition"
              >
                {t.viewTodayQueueBtn}
              </button>
            </div>
          </div>

          {/* Queue & Available Bookings Launcher List */}
          {queueBookings.length > 0 && (
            <div className="rounded-3xl border border-[#414E36]/12 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#414E36]/10 pb-3">
                <h4 className="text-sm font-extrabold text-[#1F251A] uppercase tracking-wider flex items-center gap-2">
                  <Clock size={16} className="text-[#414E36]" /> {t.todayAvailableBookings}
                </h4>
                <span className="rounded-full bg-[#414E36]/10 px-3 py-1 text-xs font-bold text-[#414E36]">
                  {queueBookings.length} {t.totalScheduledCard}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {queueBookings.map((booking: any, idx: number) => {
                  const st = String(booking.status || "").toLowerCase().trim();
                  const isStarted = st === "started" || st === "in-progress" || st === "in_progress" || st === "active";

                  return (
                    <div
                      key={booking.id || idx}
                      className={`rounded-2xl border p-4 shadow-sm flex flex-col justify-between space-y-3 transition ${
                        isStarted ? "border-amber-300 bg-amber-50/50" : "border-[#414E36]/15 bg-[#FBFBF9]"
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <h5 className="text-sm font-bold text-[#1F251A] truncate">
                            {booking.name || booking.customer_name || "Patient"}
                          </h5>
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold capitalize ${
                            isStarted ? "bg-amber-200 text-amber-900 animate-pulse" : "bg-[#414E36]/10 text-[#414E36]"
                          }`}>
                            {booking.status || "Scheduled"}
                          </span>
                        </div>
                        <p className="text-xs text-[#5A6A51]">
                          {booking.service || booking.service_name} • {booking.time || booking.time_slot || "Today"}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveSessionBooking?.(booking)}
                        className="w-full rounded-xl bg-[#414E36] hover:bg-[#343F2B] text-white py-2 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <Play size={13} /> {t.openSessionBtn}
                        <ChevronRight size={13} className="rtl:rotate-180" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
