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
  Play,
  Pill,
  Check
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
  handleSaveMedicalRecord: (e?: React.FormEvent) => void;
  clinicalNote: string;
  setClinicalNote: (note: string) => void;
  handleSaveClinicalNote: (booking: any) => void;
  savingNote: boolean;
  handleCompleteTreatment: (booking: any, totalPulses?: number) => void;
  setActiveSessionBooking?: (booking: any) => void;
  setActiveTab?: (tab: any) => void;
  prescriptionsMap?: Record<string, any[]>;
  servicesList?: any[];
  handleChangePrimaryService?: (targetBooking: any, newServiceId: string) => void;
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
  handleCompleteTreatment,
  setActiveSessionBooking,
  setActiveTab,
  prescriptionsMap = {},
  servicesList = [],
  handleChangePrimaryService,
  t
}: DoctorSessionDrawerProps) {
  if (!scheduleModalBooking) return null;
  const parsedNotes = parseBookingNotes(scheduleModalBooking.notes || "");
  const isCompleted = scheduleModalBooking.status === "completed" || scheduleModalBooking.status === "done";

  // Lookup prescriptions for this customer/booking
  const customerId = scheduleModalBooking.customer_id || scheduleModalBooking.customerId;
  const bookingId = scheduleModalBooking.id;
  const customerRxList = (customerId && prescriptionsMap[customerId]) || (bookingId && prescriptionsMap[bookingId]) || [];
  const activeRx = customerRxList.length > 0 ? customerRxList[0] : null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-6 bg-black/40 isolate">
      {/* Click backdrop overlay to close */}
      <div 
        className="absolute inset-0 cursor-pointer" 
        onClick={() => setScheduleModalBooking(null)} 
      />

      {/* Centered Modal Panel */}
      <div 
        className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-3xl z-10 flex flex-col border border-[#414E36]/20 shadow-xl overflow-hidden [transform:translateZ(0)] [backface-visibility:hidden]"
        style={{
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
          transform: "translateZ(0)"
        }}
      >
        
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-5 px-6 border-b border-[#414E36]/10 bg-[#FBFBF9]">
          <div className="flex items-center gap-3.5">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#414E36] text-white font-black text-base shadow-md border-2 border-white">
              {(scheduleModalBooking.name || scheduleModalBooking.customer_name || "P").slice(0, 2).toUpperCase()}
              <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full ring-2 ring-white shadow-sm ${
                isCompleted ? "bg-emerald-500" : "bg-amber-500"
              }`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-[#1F251A]">
                  {scheduleModalBooking.name || scheduleModalBooking.customer_name}
                </h3>
                {isCompleted ? (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-800 flex items-center gap-1">
                    <CheckCircle2 size={12} /> {t.completedStatus}
                  </span>
                ) : (
                  <span className="rounded-full bg-[#414E36]/10 px-2.5 py-0.5 text-[10px] font-extrabold text-[#414E36] capitalize">
                    {scheduleModalBooking.status || "Scheduled"}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#5A6A51] mt-0.5 font-mono">
                {scheduleModalBooking.service || scheduleModalBooking.service_name} • {scheduleModalBooking.time || scheduleModalBooking.time_slot || "Today"}
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

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Primary Reserved Service Selector Card */}
          <div className="rounded-3xl border border-[#414E36]/10 bg-[#FBFBF9] p-4 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#5A6A51] flex items-center gap-1.5">
                <FileText size={14} className="text-[#414E36]" /> {t.primaryBookingService || "Primary Reserved Service"}
              </span>
              <span className="font-extrabold text-[#414E36]">{scheduleModalBooking.price || scheduleModalBooking.total_price || 0} EGP</span>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs bg-white p-3 rounded-2xl border border-[#414E36]/10 gap-2">
              <div className="flex-1 w-full">
                <label className="block text-[10px] font-bold text-[#5A6A51] mb-1">Selected Patient Service (Changeable)</label>
                <select
                  value={
                    scheduleModalBooking.service_id ||
                    servicesList.find((s) => {
                      const sName = (s.en || s.name || s.title || s.name_en || s.ar || "").toLowerCase().trim();
                      const bName = (scheduleModalBooking.service || scheduleModalBooking.service_name || scheduleModalBooking.service_title || "").toLowerCase().trim();
                      return sName && bName && (sName === bName || sName.includes(bName) || bName.includes(sName));
                    })?.id || ""
                  }
                  onChange={(e) => handleChangePrimaryService && handleChangePrimaryService(scheduleModalBooking, e.target.value)}
                  className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-1.5 text-xs font-bold text-[#1F251A] outline-none"
                >
                  {!(scheduleModalBooking.service || scheduleModalBooking.service_name) && (
                    <option value="">Select Service</option>
                  )}
                  {servicesList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.en || s.name || s.title || s.name_en || s.ar} ({s.price || 0} EGP)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 1. Patient Medical Record Intake Card */}
          <div className="rounded-3xl border border-[#414E36]/10 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-[#1F251A] uppercase tracking-wider flex items-center gap-2">
                <AlertCircle size={15} className="text-[#414E36]" /> {t.patientMedicalRecordTitle}
              </h4>
              {medicalRecord ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                  <CheckCircle2 size={10} /> {t.onFileStatus}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold text-rose-800">
                  <AlertTriangle size={10} /> {t.intakeRequiredStatus}
                </span>
              )}
            </div>

            {medicalRecordLoading ? (
              <p className="text-xs text-[#5A6A51]">{t.loadingMedicalRecord}</p>
            ) : medicalRecord && !showMedicalForm ? (
              <div className="space-y-2 text-xs bg-[#FBFBF9] p-4 rounded-2xl border border-[#414E36]/10">
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
                <div className="flex justify-between">
                  <span className="font-bold text-[#5A6A51]">{t.previousTreatmentsLabel}:</span>
                  <span className="font-semibold text-[#1F251A]">{medicalRecord.previous_treatments_details || "None"}</span>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveMedicalRecord} className="space-y-3 bg-[#FBFBF9] p-4 rounded-2xl border border-[#414E36]/10">
                <div>
                  <label className="block text-[11px] font-bold text-[#5A6A51] mb-1">{t.skinTypeLabel}</label>
                  <select
                    value={formSkinType}
                    onChange={(e) => setFormSkinType(e.target.value)}
                    className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-1.5 text-xs font-bold text-[#1F251A] outline-none"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Dry">Dry</option>
                    <option value="Oily">Oily</option>
                    <option value="Sensitive">Sensitive</option>
                    <option value="Combination">Combination</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#5A6A51] mb-1">{t.allergiesLabel}</label>
                  <input
                    type="text"
                    value={formAllergies}
                    onChange={(e) => setFormAllergies(e.target.value)}
                    className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-1.5 text-xs text-[#1F251A] outline-none"
                    placeholder="None reported"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#5A6A51] mb-1">{t.currentMedicationLabel}</label>
                  <input
                    type="text"
                    value={formMedicationDetails}
                    onChange={(e) => setFormMedicationDetails(e.target.value)}
                    className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-1.5 text-xs text-[#1F251A] outline-none"
                    placeholder="None"
                  />
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={savingMedicalRecord}
                    className="rounded-xl bg-[#414E36] px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-[#343F2B] transition"
                  >
                    {savingMedicalRecord ? "..." : t.saveMedicalRecordBtn}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* 2. Issued Digital Prescription Display */}
          <div className="rounded-3xl border border-[#414E36]/10 bg-white p-5 shadow-sm space-y-3">
            <h4 className="text-xs font-extrabold text-[#1F251A] uppercase tracking-wider flex items-center gap-2">
              <Pill size={15} className="text-[#414E36]" /> {t.savedPrescriptionTitle}
            </h4>

            {activeRx ? (
              <div className="bg-[#FBFBF9] p-4 rounded-2xl border border-[#414E36]/10 space-y-3 text-xs">
                {activeRx.diagnosis && (
                  <div>
                    <span className="font-bold text-[#5A6A51] text-[11px]">{t.diagnosisLabel}:</span>
                    <p className="font-bold text-[#1F251A] mt-0.5">{activeRx.diagnosis}</p>
                  </div>
                )}

                {Array.isArray(activeRx.medications) && activeRx.medications.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="font-bold text-[#5A6A51] text-[11px]">{t.prescribedMedsTable}:</span>
                    <div className="space-y-1">
                      {activeRx.medications.map((m: any, idx: number) => (
                        <div key={idx} className="bg-white p-2.5 rounded-xl border border-[#414E36]/10 flex flex-wrap justify-between gap-2">
                          <span className="font-bold text-[#1F251A]">{m.name}</span>
                          <span className="text-[11px] text-[#5A6A51] font-mono">
                            {m.dosage} • {m.frequency} • {m.duration}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeRx.general_notes && (
                  <div className="pt-2 border-t border-[#414E36]/10">
                    <span className="font-bold text-[#5A6A51] text-[11px]">{t.instructionsLabel}:</span>
                    <p className="text-[#1F251A] mt-0.5 font-sans leading-relaxed">{activeRx.general_notes}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-[#5A6A51] bg-[#FBFBF9] p-3.5 rounded-2xl border border-[#414E36]/10 italic">
                {t.noPrescriptionOnRecord}
              </p>
            )}
          </div>

          {/* 3. Session Consumables & Financial Breakdown */}
          {(parsedNotes.productsLog || parsedNotes.invoiceLog) && (
            <div className="rounded-3xl border border-[#414E36]/10 bg-white p-5 shadow-sm space-y-3">
              <h4 className="text-xs font-extrabold text-[#1F251A] uppercase tracking-wider flex items-center gap-2">
                <Receipt size={15} className="text-[#414E36]" /> {t.sessionSummaryTitle}
              </h4>

              {parsedNotes.productsLog && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-xs">
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

            {isCompleted ? (
              <p className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] p-4 text-xs text-[#1F251A] font-sans leading-relaxed">
                {parsedNotes.cleanDoctorNote || t.noBookingNotes}
              </p>
            ) : (
              <textarea
                rows={5}
                value={clinicalNote}
                onChange={(e) => setClinicalNote(e.target.value)}
                placeholder={t.doctorNotesPlaceholder}
                className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] p-4 text-xs text-[#1F251A] outline-none focus:border-[#414E36] focus:ring-2 focus:ring-[#414E36]/20 font-sans leading-relaxed"
              />
            )}
          </div>

        </div>

        {/* Drawer Action Sticky Footer */}
        <div className="p-4 px-6 bg-[#FBFBF9] border-t border-[#414E36]/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {isCompleted ? (
            <div className="flex items-center justify-between w-full">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-800">
                <CheckCircle2 size={14} /> {t.completedSessionRecord}
              </span>
              <button
                type="button"
                onClick={() => setScheduleModalBooking(null)}
                className="rounded-2xl bg-[#414E36] px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#343F2B] transition"
              >
                {t.closeDrawerBtn}
              </button>
            </div>
          ) : (
            <>
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
                {/* "Write Prescription" was removed from here — it opened a second, disconnected
                    prescription form (customers/doctor:2026-08-16). The only prescription editor
                    now is the one inside the Ongoing Session tab, which is what's actually used. */}
                <button
                  type="button"
                  onClick={() => handleCompleteTreatment(scheduleModalBooking)}
                  className="rounded-2xl bg-[#414E36] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#343F2B] transition"
                >
                  {t.completeTreatmentBtn}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
