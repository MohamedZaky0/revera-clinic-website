"use client";

import React from "react";
import {
  X,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Edit,
  Receipt,
  CreditCard,
  Package,
  DollarSign,
  FileText,
  Play
} from "lucide-react";
import { parseBookingNotes } from "../utils";

interface DoctorSessionDrawerProps {
  scheduleModalBooking: any;
  setScheduleModalBooking: (booking: any) => void;
  selectedDateStr: string;
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
  clinicalNote: string;
  setClinicalNote: (note: string) => void;
  handleSaveClinicalNote: (booking: any) => void;
  savingNote: boolean;
  setShowPrescriptionModal: (show: boolean) => void;
  handleCompleteTreatment: (booking: any) => void;
  setActiveSessionBooking?: (booking: any) => void;
  setActiveTab?: (tab: any) => void;
  t: any;
}

export default function DoctorSessionDrawer({
  scheduleModalBooking,
  setScheduleModalBooking,
  selectedDateStr,
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
  clinicalNote,
  setClinicalNote,
  handleSaveClinicalNote,
  savingNote,
  setShowPrescriptionModal,
  handleCompleteTreatment,
  setActiveSessionBooking,
  setActiveTab,
  t
}: DoctorSessionDrawerProps) {
  if (!scheduleModalBooking) return null;
  const parsedNotes = parseBookingNotes(scheduleModalBooking.notes || "");

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/50 backdrop-blur-sm transition-opacity animate-fadeIn">
      {/* Click backdrop overlay to close */}
      <div 
        className="absolute inset-0 cursor-pointer" 
        onClick={() => setScheduleModalBooking(null)} 
      />

      {/* Right Drawer Panel */}
      <div className="relative w-full max-w-2xl h-full bg-white shadow-2xl z-10 flex flex-col overflow-hidden border-l border-[#414E36]/15 animate-slideLeft">
        
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-5 px-6 border-b border-[#414E36]/10 bg-[#FBFBF9]">
          <div className="flex items-center gap-3.5">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#414E36] text-white font-black text-base shadow-md border-2 border-white">
              {(scheduleModalBooking.name || scheduleModalBooking.customer_name || "P").slice(0, 2).toUpperCase()}
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white shadow-sm" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-[#1F251A]">
                  {scheduleModalBooking.name || scheduleModalBooking.customer_name || t.patientSessionDrawerTitle}
                </h3>
                <span className="rounded-full bg-[#414E36]/10 px-2.5 py-0.5 text-[10px] font-extrabold text-[#414E36] capitalize">
                  {scheduleModalBooking.status || "Scheduled"}
                </span>
              </div>
              <p className="text-xs text-[#5A6A51] mt-0.5 font-medium flex items-center gap-2 flex-wrap">
                <span className="font-bold text-[#414E36]">{scheduleModalBooking.service || scheduleModalBooking.service_name || "Clinical Session"}</span>
                <span>•</span>
                <span>{scheduleModalBooking.room || scheduleModalBooking.room_name || "Treatment Room"}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setScheduleModalBooking(null)}
            className="rounded-2xl p-2.5 text-[#5A6A51] hover:bg-[#414E36]/10 hover:text-[#414E36] transition"
            title={t.closeDrawerBtn}
          >
            <X size={20} />
          </button>
        </div>

        {/* Drawer Main Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* 1. Quick Info Overview Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-2xl bg-[#F4F5F1] p-4 border border-[#414E36]/10 text-xs">
            <div>
              <span className="text-[10px] font-bold text-[#5A6A51] uppercase">{t.timeSlotHeader}</span>
              <p className="font-bold text-[#1F251A] mt-0.5">{scheduleModalBooking.time || scheduleModalBooking.time_slot || "09:00 AM"}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#5A6A51] uppercase">{t.dateHeader}</span>
              <p className="font-bold text-[#1F251A] mt-0.5">{scheduleModalBooking.date || selectedDateStr}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#5A6A51] uppercase">Phone</span>
              <p className="font-mono text-[#1F251A] mt-0.5">{scheduleModalBooking.phone || "N/A"}</p>
            </div>
          </div>

          {/* 2. Medical Record Card */}
          <div className="rounded-2xl border border-[#414E36]/10 bg-[#FBFBF9] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-[#1F251A] uppercase tracking-wider flex items-center gap-2">
                <AlertCircle size={15} className="text-[#414E36]" /> {t.patientMedicalRecordTitle}
              </h4>
              {medicalRecord ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                  <CheckCircle2 size={11} /> {t.onFileStatus}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold text-rose-800 animate-pulse">
                  <AlertTriangle size={11} /> {t.intakeRequiredStatus}
                </span>
              )}
            </div>

            {medicalRecordLoading ? (
              <p className="text-xs text-[#5A6A51]">{t.loadingMedicalRecord}</p>
            ) : medicalRecord && !showMedicalForm ? (
              <div className="space-y-2.5 text-xs bg-white p-4 rounded-xl border border-[#414E36]/10">
                <div className="flex justify-between items-center border-b border-[#414E36]/10 pb-2">
                  <span className="text-[#5A6A51] font-medium">{t.skinTypeLabel}:</span>
                  <span className="font-bold text-[#1F251A] bg-[#414E36]/10 px-2.5 py-0.5 rounded-lg">{medicalRecord.skin_type || "Normal"}</span>
                </div>
                <div className="flex justify-between items-center border-b border-[#414E36]/10 pb-2">
                  <span className="text-[#5A6A51] font-medium">{t.allergiesLabel}:</span>
                  <span className={`font-bold px-2.5 py-0.5 rounded-lg ${medicalRecord.allergies && medicalRecord.allergies !== "None" ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"}`}>
                    {medicalRecord.allergies || "None"}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-[#414E36]/10 pb-2">
                  <span className="text-[#5A6A51] font-medium">{t.currentMedicationLabel}:</span>
                  <span className="font-semibold text-[#1F251A]">{medicalRecord.medication_details || "None"}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMedicalForm(true)}
                  className="mt-1 inline-flex items-center gap-1.5 text-xs font-bold text-[#414E36] hover:underline pt-1"
                >
                  <Edit size={13} /> {t.updateMedicalRecordBtn}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSaveMedicalRecord} className="space-y-3 pt-1 text-xs bg-white p-4 rounded-xl border border-[#414E36]/10">
                {!medicalRecord && (
                  <p className="text-[11px] font-bold text-amber-900 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                    {t.firstVisitNotice}
                  </p>
                )}
                <div>
                  <label className="block text-[10px] font-bold text-[#5A6A51] uppercase mb-1">{t.skinTypeLabel}</label>
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
                  <label className="block text-[10px] font-bold text-[#5A6A51] uppercase mb-1">{t.allergiesLabel}</label>
                  <input
                    type="text"
                    placeholder="e.g. Latex, Aspirin, None"
                    value={formAllergies}
                    onChange={(e) => setFormAllergies(e.target.value)}
                    className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2 text-xs text-[#1F251A] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#5A6A51] uppercase mb-1">{t.currentMedicationLabel}</label>
                  <input
                    type="text"
                    placeholder="e.g. Roaccutane, None"
                    value={formMedicationDetails}
                    onChange={(e) => setFormMedicationDetails(e.target.value)}
                    className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2 text-xs text-[#1F251A] outline-none"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={savingMedicalRecord}
                    className="rounded-xl bg-[#414E36] px-4 py-2 text-xs font-bold text-white hover:bg-[#343F2B]"
                  >
                    {savingMedicalRecord ? "..." : t.saveMedicalRecordBtn}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* 3. System Metadata Cards */}
          {(parsedNotes.instaPayLog || parsedNotes.productsLog || parsedNotes.invoiceLog) && (
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold text-[#1F251A] uppercase tracking-wider flex items-center gap-2">
                <Receipt size={15} className="text-[#414E36]" /> {t.sessionConsumablesTitle}
              </h4>

              {parsedNotes.instaPayLog && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 text-xs space-y-1">
                  <div className="flex items-center gap-2 font-bold text-blue-900">
                    <CreditCard size={14} className="text-blue-700" />
                    <span>InstaPay Payment Information</span>
                  </div>
                  <p className="font-mono text-blue-800 text-[11px] pt-1">
                    {parsedNotes.instaPayLog.replace(/\[|\]/g, "")}
                  </p>
                </div>
              )}

              {parsedNotes.productsLog && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-xs space-y-1">
                  <div className="flex items-center gap-2 font-bold text-emerald-900">
                    <Package size={14} className="text-emerald-700" />
                    <span>{t.productsUsedTitle}</span>
                  </div>
                  <pre className="font-mono text-emerald-800 text-[11px] pt-1 whitespace-pre-wrap leading-relaxed">
                    {parsedNotes.productsLog.replace(/^\[Products Used During Session\]:\s*/i, "")}
                  </pre>
                </div>
              )}

              {parsedNotes.invoiceLog && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <DollarSign size={14} className="text-slate-600" />
                    <span>{t.updatedInvoiceTotal}</span>
                  </div>
                  <span className="font-extrabold text-sm text-[#414E36]">
                    {parsedNotes.invoiceLog.replace(/^\[Invoice Total Updated\]:\s*/i, "")}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 4. Clinical Observations & Doctor Notes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-[#1F251A] uppercase tracking-wider flex items-center gap-2">
                <FileText size={15} className="text-[#414E36]" /> {t.doctorNotesTitle}
              </h4>
            </div>

            <textarea
              rows={6}
              value={clinicalNote}
              onChange={(e) => setClinicalNote(e.target.value)}
              placeholder={t.doctorNotesPlaceholder}
              className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] p-4 text-xs text-[#1F251A] outline-none focus:border-[#414E36] focus:ring-2 focus:ring-[#414E36]/20 font-sans leading-relaxed"
            />
          </div>

        </div>

        {/* Drawer Action Sticky Footer */}
        <div className="p-4 px-6 bg-[#FBFBF9] border-t border-[#414E36]/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveSessionBooking?.(scheduleModalBooking);
                setActiveTab?.("ongoing");
                setScheduleModalBooking(null);
              }}
              className="rounded-2xl bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 text-xs font-bold transition shadow-sm flex items-center gap-1.5"
            >
              <Play size={14} />
              <span>{t.startOngoingSessionBtn}</span>
            </button>

            <button
              type="button"
              onClick={() => handleSaveClinicalNote(scheduleModalBooking)}
              disabled={savingNote}
              className="rounded-2xl border border-[#414E36]/20 bg-white px-4 py-2.5 text-xs font-bold text-[#414E36] hover:bg-[#414E36] hover:text-white transition shadow-sm disabled:opacity-50"
            >
              {savingNote ? "..." : t.saveClinicalNotesBtn}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPrescriptionModal(true)}
              className="rounded-2xl border border-[#414E36]/20 bg-white px-4 py-2.5 text-xs font-bold text-[#414E36] hover:bg-[#F4F5F1] transition shadow-sm"
            >
              {t.writePrescriptionBtn}
            </button>

            <button
              type="button"
              onClick={() => handleCompleteTreatment(scheduleModalBooking)}
              className="rounded-2xl bg-[#414E36] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#343F2B] transition"
            >
              {t.completeTreatmentBtn}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
