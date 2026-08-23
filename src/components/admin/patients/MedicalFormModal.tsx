"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import { adminTranslations } from "@/components/admin/translations";

interface MedicalFormModalProps {
  setShowMedicalFormModal: (v: boolean) => void;
  viewingCustomerProfile: any;
  adminRole: string | null;
  authenticatedJsonHeaders: { "Content-Type": string; Authorization: string };
  medicalRecordForm: any;
  setMedicalRecordForm: React.Dispatch<React.SetStateAction<any>>;
  lang: "en" | "ar";
  t: typeof adminTranslations["en"]["patients"]["medicalFormModal"];
}

export default function MedicalFormModal({
  setShowMedicalFormModal,
  viewingCustomerProfile,
  adminRole,
  authenticatedJsonHeaders,
  medicalRecordForm,
  setMedicalRecordForm,
  lang,
  t,
}: MedicalFormModalProps) {
  const data = medicalRecordForm || {};
  const [savingMedicalForm, setSavingMedicalForm] = useState(false);
  const [formSkinType, setFormSkinType] = useState<string>(data.skin_type || "Normal");
  const [formMainConcerns, setFormMainConcerns] = useState<string[]>(data.main_concerns || []);
  const [formOtherConcernsDetails, setFormOtherConcernsDetails] = useState(data.other_concerns_details || "");
  const [formHasPreviousTreatments, setFormHasPreviousTreatments] = useState(Boolean(data.has_previous_treatments));
  const [formPreviousTreatmentsDetails, setFormPreviousTreatmentsDetails] = useState(data.previous_treatments_details || "");
  const [formHasMedicalConditions, setFormHasMedicalConditions] = useState(Boolean(data.has_medical_conditions));
  const [formMedicalConditionsDetails, setFormMedicalConditionsDetails] = useState(data.medical_conditions_details || "");
  const [formIsTakingMedication, setFormIsTakingMedication] = useState(Boolean(data.is_taking_medication));
  const [formMedicationDetails, setFormMedicationDetails] = useState(data.medication_details || "");
  const [formAllergies, setFormAllergies] = useState(data.allergies || "");

  async function handleSaveMedicalForm() {
    if (!viewingCustomerProfile?.id) return;
    setSavingMedicalForm(true);
    try {
      const payload = {
        customer_id: viewingCustomerProfile.id,
        skin_type: formSkinType,
        main_concerns: formMainConcerns,
        other_concerns_details: formOtherConcernsDetails,
        has_previous_treatments: formHasPreviousTreatments,
        previous_treatments_details: formPreviousTreatmentsDetails,
        has_medical_conditions: formHasMedicalConditions,
        medical_conditions_details: formMedicalConditionsDetails,
        is_taking_medication: formIsTakingMedication,
        medication_details: formMedicationDetails,
        allergies: formAllergies,
        recorded_by: adminRole || "admin",
        recorded_at: new Date().toISOString(),
      };

      const reqHeaders: Record<string, string> = { ...(authenticatedJsonHeaders as any || {}) };
      if (!reqHeaders["Authorization"] && !reqHeaders["authorization"]) {
        try {
          const { supabase } = await import("@/lib/supabaseClient");
          const { data } = await supabase.auth.getSession();
          if (data?.session?.access_token) {
            reqHeaders["Authorization"] = `Bearer ${data.session.access_token}`;
          }
        } catch {}
      }

      const res = await fetch("/api/medical-records", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...reqHeaders },
        body: JSON.stringify({ type: "form", data: payload }),
      });

      if (res.ok) {
        const saved = await res.json();
        setMedicalRecordForm(saved.form || payload);
        setShowMedicalFormModal(false);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || t.saveFailedAlert);
      }
    } catch (err: any) {
      console.error("Error saving medical form:", err);
      alert(err.message || t.saveErrorAlert);
    } finally {
      setSavingMedicalForm(false);
    }
  }

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl bg-white p-6 md:p-8 shadow-2xl border border-[#414E36]/15 space-y-6 my-8">
        <div className="flex items-center justify-between border-b border-[#414E36]/10 pb-4">
          <div>
            <h3 className="text-xl font-bold text-[#1F251A]">{t.title}</h3>
            <p className="text-xs text-[#5A6A51] mt-0.5">{t.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowMedicalFormModal(false)}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 max-h-[70vh] overflow-y-auto pe-1">
          {/* Skin Type */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#C4AE7C] mb-2">{t.skinClassificationLabel}</label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {["Normal", "Dry", "Oily", "Combination", "Sensitive"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormSkinType(type)}
                  className={`py-2 px-3 text-xs font-semibold rounded-xl border transition ${
                    formSkinType === type
                      ? "bg-[#414E36] text-[#FBFBF9] border-[#414E36]"
                      : "bg-white text-[#1F251A] border-[#414E36]/20 hover:border-[#414E36]"
                  }`}
                >
                  {t.skinTypes[type as keyof typeof t.skinTypes]}
                </button>
              ))}
            </div>
          </div>

          {/* Main Concerns */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#C4AE7C] mb-2">{t.primaryConcernsLabel}</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {[
                "Acne & Blemishes",
                "Pigmentation & Dark Spots",
                "Aging & Fine Lines",
                "Dullness & Uneven Tone",
                "Rosacea & Redness",
                "Enlarged Pores",
                "Sagging & Loss of Volume",
              ].map((concern) => {
                const isSelected = formMainConcerns.includes(concern);
                return (
                  <button
                    key={concern}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setFormMainConcerns(formMainConcerns.filter((c) => c !== concern));
                      } else {
                        setFormMainConcerns([...formMainConcerns, concern]);
                      }
                    }}
                    className={`py-1.5 px-3 text-xs font-medium rounded-lg border transition ${
                      isSelected
                        ? "bg-[#414E36]/15 text-[#414E36] border-[#414E36]/40 font-semibold"
                        : "bg-white text-gray-700 border-gray-200 hover:border-[#414E36]/30"
                    }`}
                  >
                    {isSelected ? "✓ " : "+ "}{t.concerns[concern as keyof typeof t.concerns]}
                  </button>
                );
              })}
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5A6A51] mb-1">{t.additionalConcernLabel}</label>
              <input
                type="text"
                value={formOtherConcernsDetails}
                onChange={(e) => setFormOtherConcernsDetails(e.target.value)}
                placeholder={t.additionalConcernPlaceholder}
                className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3.5 py-2 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C]"
              />
            </div>
          </div>

          {/* Previous Treatments */}
          <div className="bg-[#FBFBF9] p-4 rounded-2xl border border-[#414E36]/10 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-[#1F251A]">{t.previousTreatmentsLabel}</label>
                <p className="text-[11px] text-[#5A6A51]">{t.previousTreatmentsDesc}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFormHasPreviousTreatments(true)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg border ${
                    formHasPreviousTreatments ? "bg-[#414E36] text-white border-[#414E36]" : "bg-white text-gray-600 border-gray-200"
                  }`}
                >
                  {t.yes}
                </button>
                <button
                  type="button"
                  onClick={() => setFormHasPreviousTreatments(false)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg border ${
                    !formHasPreviousTreatments ? "bg-gray-200 text-gray-800 border-gray-300" : "bg-white text-gray-600 border-gray-200"
                  }`}
                >
                  {t.no}
                </button>
              </div>
            </div>
            {formHasPreviousTreatments && (
              <textarea
                rows={2}
                value={formPreviousTreatmentsDetails}
                onChange={(e) => setFormPreviousTreatmentsDetails(e.target.value)}
                placeholder={t.previousTreatmentsPlaceholder}
                className="w-full rounded-xl border border-[#414E36]/15 bg-white p-3 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C]"
              />
            )}
          </div>

          {/* Medical Conditions */}
          <div className="bg-[#FBFBF9] p-4 rounded-2xl border border-[#414E36]/10 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-[#1F251A]">{t.medicalConditionsLabel}</label>
                <p className="text-[11px] text-[#5A6A51]">{t.medicalConditionsDesc}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFormHasMedicalConditions(true)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg border ${
                    formHasMedicalConditions ? "bg-[#414E36] text-white border-[#414E36]" : "bg-white text-gray-600 border-gray-200"
                  }`}
                >
                  {t.yes}
                </button>
                <button
                  type="button"
                  onClick={() => setFormHasMedicalConditions(false)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg border ${
                    !formHasMedicalConditions ? "bg-gray-200 text-gray-800 border-gray-300" : "bg-white text-gray-600 border-gray-200"
                  }`}
                >
                  {t.no}
                </button>
              </div>
            </div>
            {formHasMedicalConditions && (
              <textarea
                rows={2}
                value={formMedicalConditionsDetails}
                onChange={(e) => setFormMedicalConditionsDetails(e.target.value)}
                placeholder={t.medicalConditionsPlaceholder}
                className="w-full rounded-xl border border-[#414E36]/15 bg-white p-3 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C]"
              />
            )}
          </div>

          {/* Medications */}
          <div className="bg-[#FBFBF9] p-4 rounded-2xl border border-[#414E36]/10 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-[#1F251A]">{t.medicationsLabel}</label>
                <p className="text-[11px] text-[#5A6A51]">{t.medicationsDesc}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFormIsTakingMedication(true)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg border ${
                    formIsTakingMedication ? "bg-[#414E36] text-white border-[#414E36]" : "bg-white text-gray-600 border-gray-200"
                  }`}
                >
                  {t.yes}
                </button>
                <button
                  type="button"
                  onClick={() => setFormIsTakingMedication(false)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg border ${
                    !formIsTakingMedication ? "bg-gray-200 text-gray-800 border-gray-300" : "bg-white text-gray-600 border-gray-200"
                  }`}
                >
                  {t.no}
                </button>
              </div>
            </div>
            {formIsTakingMedication && (
              <textarea
                rows={2}
                value={formMedicationDetails}
                onChange={(e) => setFormMedicationDetails(e.target.value)}
                placeholder={t.medicationsPlaceholder}
                className="w-full rounded-xl border border-[#414E36]/15 bg-white p-3 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C]"
              />
            )}
          </div>

          {/* Allergies */}
          <div>
            <label className="block text-xs font-bold text-[#1F251A] mb-1">{t.allergiesLabel}</label>
            <input
              type="text"
              value={formAllergies}
              onChange={(e) => setFormAllergies(e.target.value)}
              placeholder={t.allergiesPlaceholder}
              className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3.5 py-2.5 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C]"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#414E36]/10">
          <button
            type="button"
            onClick={() => setShowMedicalFormModal(false)}
            className="rounded-xl border border-[#414E36]/15 px-5 py-2.5 text-xs font-semibold text-[#414E36] hover:bg-[#EDF1EC] transition"
          >
            {t.cancelBtn}
          </button>
          <button
            type="button"
            onClick={handleSaveMedicalForm}
            disabled={savingMedicalForm}
            className="rounded-xl bg-[#414E36] px-6 py-2.5 text-xs font-semibold text-[#FBFBF9] hover:bg-[#2e3a26] transition disabled:opacity-50"
          >
            {savingMedicalForm ? t.savingBtn : t.saveBtn}
          </button>
        </div>
      </div>
    </div>
  );
}
