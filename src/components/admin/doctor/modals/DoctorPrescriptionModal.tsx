"use client";

import React from "react";
import { X, Plus } from "lucide-react";
import { MedicationItem } from "../types";

interface DoctorPrescriptionModalProps {
  showPrescriptionModal: boolean;
  setShowPrescriptionModal: (show: boolean) => void;
  targetBooking: any;
  rxDiagnosis: string;
  setRxDiagnosis: (val: string) => void;
  rxMedications: MedicationItem[];
  setRxMedications: (meds: MedicationItem[]) => void;
  rxGeneralNotes: string;
  setRxGeneralNotes: (val: string) => void;
  savingRx: boolean;
  handleCreatePrescription: (e: React.FormEvent, booking: any) => void;
  t: any;
}

export default function DoctorPrescriptionModal({
  showPrescriptionModal,
  setShowPrescriptionModal,
  targetBooking,
  rxDiagnosis,
  setRxDiagnosis,
  rxMedications,
  setRxMedications,
  rxGeneralNotes,
  setRxGeneralNotes,
  savingRx,
  handleCreatePrescription,
  t
}: DoctorPrescriptionModalProps) {
  if (!showPrescriptionModal || !targetBooking) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-[32px] bg-white p-6 shadow-2xl space-y-5 border border-[#414E36]/20">
        <div className="flex items-center justify-between border-b border-[#414E36]/10 pb-3">
          <div>
            <h3 className="text-lg font-bold text-[#1F251A]">{t.digitalPrescriptionTitle}</h3>
            <p className="text-xs text-[#5A6A51]">
              {t.patientNameHeader}: <strong className="text-[#414E36]">{targetBooking.name || targetBooking.customer_name}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowPrescriptionModal(false)}
            className="rounded-full p-2 text-[#5A6A51] hover:bg-[#F4F5F1]"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={(e) => handleCreatePrescription(e, targetBooking)} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#5A6A51] mb-1">{t.clinicalDiagnosisLabel}</label>
            <input
              type="text"
              required
              placeholder="e.g. Post-laser inflammation, Acne Vulgaris Grade II"
              value={rxDiagnosis}
              onChange={(e) => setRxDiagnosis(e.target.value)}
              className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-xs text-[#1F251A] outline-none focus:border-[#414E36]"
            />
          </div>

          {/* Medications List */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#5A6A51]">{t.prescribedMedicationsLabel}</label>
            {rxMedications.map((med, idx) => (
              <div key={idx} className="grid grid-cols-4 gap-2">
                <input
                  type="text"
                  placeholder={t.medicationNamePlaceholder}
                  value={med.name}
                  onChange={(e) => {
                    const updated = [...rxMedications];
                    updated[idx].name = e.target.value;
                    setRxMedications(updated);
                  }}
                  className="rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2 text-xs text-[#1F251A] outline-none focus:border-[#414E36]"
                />
                <input
                  type="text"
                  placeholder={t.dosagePlaceholder}
                  value={med.dosage}
                  onChange={(e) => {
                    const updated = [...rxMedications];
                    updated[idx].dosage = e.target.value;
                    setRxMedications(updated);
                  }}
                  className="rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2 text-xs text-[#1F251A] outline-none focus:border-[#414E36]"
                />
                <input
                  type="text"
                  placeholder={t.frequencyPlaceholder}
                  value={med.frequency}
                  onChange={(e) => {
                    const updated = [...rxMedications];
                    updated[idx].frequency = e.target.value;
                    setRxMedications(updated);
                  }}
                  className="rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2 text-xs text-[#1F251A] outline-none focus:border-[#414E36]"
                />
                <input
                  type="text"
                  placeholder={t.durationPlaceholder}
                  value={med.duration}
                  onChange={(e) => {
                    const updated = [...rxMedications];
                    updated[idx].duration = e.target.value;
                    setRxMedications(updated);
                  }}
                  className="rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2 text-xs text-[#1F251A] outline-none focus:border-[#414E36]"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => setRxMedications([...rxMedications, { name: "", dosage: "", frequency: "", duration: "" }])}
              className="text-xs font-bold text-[#414E36] flex items-center gap-1 mt-1 hover:underline"
            >
              <Plus size={14} /> {t.addAnotherMedicationBtn}
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#5A6A51] mb-1">{t.generalInstructionsLabel}</label>
            <textarea
              rows={3}
              placeholder="e.g. Apply sunscreen SPF 50 daily, avoid direct sun exposure for 48 hours..."
              value={rxGeneralNotes}
              onChange={(e) => setRxGeneralNotes(e.target.value)}
              className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] p-3 text-xs text-[#1F251A] outline-none focus:border-[#414E36]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setShowPrescriptionModal(false)}
              className="rounded-xl border border-[#414E36]/20 bg-white px-4 py-2 text-xs font-bold text-[#5A6A51] hover:bg-[#F4F5F1]"
            >
              {t.cancelBtn}
            </button>
            <button
              type="submit"
              disabled={savingRx}
              className="rounded-xl bg-[#414E36] px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#343F2B] transition disabled:opacity-50"
            >
              {savingRx ? "..." : t.saveAndPrintRxBtn}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
