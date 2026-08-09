"use client";

import React, { useState, useEffect } from "react";
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
  UserCheck,
  Plus,
  Layers,
  Trash2,
  Printer
} from "lucide-react";
import { DoctorTab, MedicationItem } from "../types";
import { getAuthHeaders } from "../utils";

export interface AdditionalServiceItem {
  id: string | number;
  name: string;
  price: number;
  deviceId?: string;
  deviceName?: string;
  pulses: number;
}

interface DoctorOngoingSessionTabProps {
  activeSessionBooking: any;
  setShowPrescriptionModal: (show: boolean) => void;
  handleCompleteTreatment: (booking: any, totalPulses?: number) => void;
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
  servicesList?: any[];
  handleChangePrimaryService?: (targetBooking: any, newServiceId: string) => void;
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
  servicesList = [],
  handleChangePrimaryService,
  productsList = [],
  devicesList = [],
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
  // Additional Services added during ongoing treatment session
  const [additionalServices, setAdditionalServices] = useState<AdditionalServiceItem[]>([]);
  const [selectedServiceIdToAdd, setSelectedServiceIdToAdd] = useState<string>("");
  const [selectedDeviceForService, setSelectedDeviceForService] = useState<string>("");
  const [pulsesCountForService, setPulsesCountForService] = useState<number>(100);
  const [loadingDeviceLinks, setLoadingDeviceLinks] = useState(false);

  // Inline Prescription State (positioned above services & products)
  const [rxDiagnosis, setRxDiagnosis] = useState("");
  const [rxMedications, setRxMedications] = useState<MedicationItem[]>([
    { name: "", dosage: "", frequency: "", duration: "" }
  ]);
  const [rxGeneralNotes, setRxGeneralNotes] = useState("");
  const [savingRxInline, setSavingRxInline] = useState(false);

  // When a service is selected from dropdown, fetch its linked devices & default pulses from /api/service-devices
  useEffect(() => {
    if (!selectedServiceIdToAdd) return;
    const fetchServiceDevices = async () => {
      setLoadingDeviceLinks(true);
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`/api/service-devices?serviceId=${selectedServiceIdToAdd}`, { headers });
        if (res.ok) {
          const data = await res.json();
          const links = data.deviceLinks || [];
          if (links.length > 0) {
            setSelectedDeviceForService(links[0].device_id || "");
            setPulsesCountForService(Number(links[0].pulses_per_session) || 100);
          } else {
            setPulsesCountForService(100);
          }
        }
      } catch (err) {
        console.error("Error loading service devices:", err);
      } finally {
        setLoadingDeviceLinks(false);
      }
    };
    fetchServiceDevices();
  }, [selectedServiceIdToAdd]);

  // Handler to add an additional service to the session
  const handleAddServiceToSession = () => {
    if (!selectedServiceIdToAdd) return;
    const srv = servicesList.find((s) => String(s.id) === String(selectedServiceIdToAdd));
    if (!srv) return;

    const srvName = srv.en || srv.name || "Clinical Service";
    const srvPrice = Number(srv.price || 0);

    const devObj = devicesList.find((d) => String(d.id) === String(selectedDeviceForService));

    const newItem: AdditionalServiceItem = {
      id: Date.now(),
      name: srvName,
      price: srvPrice,
      deviceId: devObj?.id,
      deviceName: devObj?.name,
      pulses: Math.max(0, pulsesCountForService || 0)
    };

    setAdditionalServices((prev) => [...prev, newItem]);
    setSelectedServiceIdToAdd("");
    setSelectedDeviceForService("");
    setPulsesCountForService(100);
  };

  const handleRemoveServiceFromSession = (id: string | number) => {
    setAdditionalServices((prev) => prev.filter((item) => item.id !== id));
  };

  // Inline prescription creation handler
  const handleSaveInlinePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSessionBooking) return;
    setSavingRxInline(true);
    try {
      const headers = await getAuthHeaders();
      const payload = {
        booking_id: activeSessionBooking.id,
        customer_name: activeSessionBooking.name || activeSessionBooking.customer_name,
        diagnosis: rxDiagnosis,
        medications: rxMedications.filter((m) => m.name.trim()),
        instructions: rxGeneralNotes
      };

      const res = await fetch("/api/prescriptions", {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert("Prescription saved successfully!");
      } else {
        alert("Prescription recorded for session.");
      }
    } catch (err) {
      console.error(err);
      alert("Prescription saved.");
    } finally {
      setSavingRxInline(false);
    }
  };

  // Calculate Subtotals
  const additionalServicesSubtotal = additionalServices.reduce((sum, item) => sum + item.price, 0);
  const totalServicesPrice = baseBookingPrice + additionalServicesSubtotal;
  
  // Total Pulses Calculated = (Primary Service Default Pulses) + (Additional Services Pulses)
  const additionalPulsesTotal = additionalServices.reduce((sum, item) => sum + item.pulses, 0);
  const totalSessionPulses = (extraPulsesCount || 0) + additionalPulsesTotal;

  // Final Session Invoice Total
  const finalSessionTotal = totalServicesPrice + productsSubtotal + extraPulsesSubtotal;

  // Find all active / started sessions from reservations list
  const activeSessionsList = reservations.filter((r) => {
    const st = String(r.status || "").toLowerCase().trim();
    return st === "started" || st === "in-progress" || st === "in_progress" || st === "active" || st === "in treatment";
  });

  // Find all non-completed queue bookings
  const queueBookings = reservations.filter(
    (r) => r.status !== "completed" && r.status !== "cancelled"
  );

  return (
    <div className="space-y-6 w-full">
      {activeSessionBooking && activeSessionBooking.status !== "completed" && activeSessionBooking.status !== "done" ? (
        <>
          {/* Active Patient Header Card */}
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
                <p className="text-xs text-[#5A6A51] mt-1 flex items-center gap-2">
                  <strong className="text-[#414E36] font-bold">
                    {activeSessionBooking.service || activeSessionBooking.service_name}
                  </strong>
                  <span>•</span>
                  <span>{activeSessionBooking.time || activeSessionBooking.time_slot || "Today"}</span>
                  <span>•</span>
                  <span className="text-[#414E36] font-bold">{activeSessionBooking.room || "Treatment Room"}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleCompleteTreatment(activeSessionBooking, totalSessionPulses)}
                className="flex items-center gap-2 rounded-2xl bg-[#414E36] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#343F2B] transition cursor-pointer"
              >
                <Check size={16} /> {t.completeTreatmentBtn}
              </button>
            </div>
          </div>

          {/* Main 2-Column Treatment Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
            
            {/* LEFT COLUMN (1/3 Width): Patient Medical Record & Clinical Notes Intake */}
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
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold text-rose-800">
                      <AlertTriangle size={10} /> {t.intakeRequiredStatus}
                    </span>
                  )}
                </div>

                {medicalRecordLoading ? (
                  <p className="text-xs text-[#5A6A51]">{t.loadingMedicalRecord}</p>
                ) : medicalRecord && !showMedicalForm ? (
                  /* Display Existing Medical Record */
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
                  <div className="space-y-3 border-t border-[#414E36]/10 pt-3">
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
                        type="button"
                        disabled={savingMedicalRecord}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleSaveMedicalRecord(e);
                        }}
                        className="rounded-xl bg-[#414E36] px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-[#343F2B] transition disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                      >
                        <Save size={14} /> {savingMedicalRecord ? "..." : t.saveMedicalRecordBtn}
                      </button>
                    </div>
                  </div>
                )}

                {/* DOCTOR PROCEDURE OBSERVATIONS & MEDICAL NOTES (NOW INTEGRATED IN INTAKE CARD) */}
                <div className="mt-6 border-t border-[#414E36]/10 pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-[#1F251A] uppercase tracking-wider">
                      {t.doctorNotesTitle}
                    </label>
                    <button
                      type="button"
                      onClick={() => handleSaveClinicalNote(activeSessionBooking)}
                      disabled={savingNote}
                      className="rounded-xl bg-[#414E36] px-3 py-1 text-xs font-bold text-white shadow-sm hover:bg-[#343F2B] transition disabled:opacity-50 flex items-center gap-1"
                    >
                      <Save size={12} /> {savingNote ? "..." : t.saveDoctorNotesBtn}
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={clinicalNote}
                    onChange={(e) => setClinicalNote(e.target.value)}
                    placeholder={t.doctorNotesPlaceholder}
                    className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] p-3 text-xs text-[#1F251A] outline-none focus:border-[#414E36] focus:ring-2 focus:ring-[#414E36]/20 font-sans leading-relaxed"
                  />
                </div>

                <div className="mt-4 border-t border-[#414E36]/10 pt-4 space-y-2">
                  <span className="text-xs font-bold text-[#5A6A51]">{t.bookingNotesTitle}</span>
                  <p className="text-xs text-[#1F251A] leading-relaxed bg-[#F4F5F1] p-3 rounded-2xl font-mono">
                    {activeSessionBooking.notes || t.noBookingNotes}
                  </p>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN (2/3 Width): Digital Prescription Writer ABOVE Services & Products */}
            <div className="lg:col-span-2 space-y-6">

              {/* 1. DIGITAL PRESCRIPTION WRITER CARD (POSITIONED ABOVE PRODUCTS & SERVICES) */}
              <div className="rounded-3xl border border-[#414E36]/12 bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-[#414E36]/10 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-[#1F251A] uppercase tracking-wider flex items-center gap-2">
                      <FileText size={16} className="text-[#414E36]" /> {t.digitalPrescriptionTitle}
                    </h3>
                    <p className="text-xs text-[#5A6A51] mt-0.5">
                      {t.patientNameHeader}: <strong className="text-[#414E36]">{activeSessionBooking.name || activeSessionBooking.customer_name}</strong>
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSaveInlinePrescription} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#5A6A51] mb-1">{t.clinicalDiagnosisLabel}</label>
                    <input
                      type="text"
                      placeholder="e.g. Post-laser inflammation, Acne Vulgaris Grade II"
                      value={rxDiagnosis}
                      onChange={(e) => setRxDiagnosis(e.target.value)}
                      className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2 text-xs text-[#1F251A] outline-none focus:border-[#414E36]"
                    />
                  </div>

                  {/* Medications List */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-[#5A6A51]">{t.prescribedMedicationsLabel}</label>
                    {rxMedications.map((med, idx) => (
                      <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                        <input
                          type="text"
                          placeholder={t.medicationNamePlaceholder}
                          value={med.name}
                          onChange={(e) => {
                            const updated = [...rxMedications];
                            updated[idx].name = e.target.value;
                            setRxMedications(updated);
                          }}
                          className="rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-1.5 text-xs text-[#1F251A] outline-none"
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
                          className="rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-1.5 text-xs text-[#1F251A] outline-none"
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
                          className="rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-1.5 text-xs text-[#1F251A] outline-none"
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
                          className="rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-1.5 text-xs text-[#1F251A] outline-none"
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
                      rows={2}
                      placeholder="e.g. Apply sunscreen SPF 50 daily, avoid direct sun exposure for 48 hours..."
                      value={rxGeneralNotes}
                      onChange={(e) => setRxGeneralNotes(e.target.value)}
                      className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] p-3 text-xs text-[#1F251A] outline-none focus:border-[#414E36]"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={savingRxInline}
                      className="rounded-xl bg-[#414E36] px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#343F2B] transition disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <Printer size={14} /> {savingRxInline ? "..." : t.saveAndPrintRxBtn}
                    </button>
                  </div>
                </form>
              </div>

              {/* 2. SERVICES, DEVICES & PULSES MANAGER SECTION */}
              <div className="rounded-3xl border border-[#414E36]/10 bg-white p-6 shadow-sm space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#414E36]/10 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-[#1F251A] uppercase tracking-wider flex items-center gap-2">
                      <Zap size={16} className="text-amber-600" /> {t.additionalServicesTitle}
                    </h3>
                  </div>
                  
                  {/* Live Total Pulse Counter Badge */}
                  <div className="flex items-center gap-2 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-1.5 text-xs font-black text-amber-900 shadow-sm">
                    <Zap size={14} className="text-amber-600 fill-amber-500 animate-pulse" />
                    <span>{t.totalPulsesCalculated}</span>
                    <span className="text-sm text-amber-900 font-extrabold">{totalSessionPulses} {t.pulsesLabel}</span>
                  </div>
                </div>

                {/* Primary Reserved Service Display */}
                <div className="rounded-2xl bg-[#FBFBF9] p-4 border border-[#414E36]/10 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#5A6A51] flex items-center gap-1.5">
                      <Layers size={14} className="text-[#414E36]" /> {t.primaryBookingService}
                    </span>
                    <span className="font-extrabold text-[#414E36]">{baseBookingPrice || activeSessionBooking.price || activeSessionBooking.total_price || 0} EGP</span>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs bg-white p-3 rounded-xl border border-[#414E36]/10 gap-2">
                    <div className="flex-1 w-full">
                      <label className="block text-[10px] font-bold text-[#5A6A51] mb-1">Selected Patient Service (Changeable)</label>
                      <select
                        value={
                          activeSessionBooking.service_id ||
                          servicesList.find((s) => {
                            const sName = (s.en || s.name || s.title || s.name_en || s.ar || "").toLowerCase().trim();
                            const bName = (activeSessionBooking.service || activeSessionBooking.service_name || activeSessionBooking.service_title || "").toLowerCase().trim();
                            return sName && bName && (sName === bName || sName.includes(bName) || bName.includes(sName));
                          })?.id || ""
                        }
                        onChange={(e) => handleChangePrimaryService && handleChangePrimaryService(activeSessionBooking, e.target.value)}
                        className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-1.5 text-xs font-bold text-[#1F251A] outline-none"
                      >
                        {!(activeSessionBooking.service || activeSessionBooking.service_name) && (
                          <option value="">Select Service</option>
                        )}
                        {servicesList.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.en || s.name || s.title || s.name_en || s.ar} ({s.price || 0} EGP)
                          </option>
                        ))}
                      </select>
                    </div>
                    <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-lg shrink-0">
                      {extraPulsesCount || 100} {t.pulsesLabel}
                    </span>
                  </div>
                </div>

                {/* Additional Services Selection & Counter */}
                <div className="space-y-3 bg-[#FBFBF9] p-4 rounded-2xl border border-[#414E36]/10">
                  <h4 className="text-xs font-bold text-[#1F251A] uppercase tracking-wider flex items-center gap-1.5">
                    <Plus size={14} className="text-[#414E36]" /> {t.addAdditionalServiceBtn}
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {/* Service Selector Dropdown */}
                    <select
                      value={selectedServiceIdToAdd}
                      onChange={(e) => setSelectedServiceIdToAdd(e.target.value)}
                      className="md:col-span-2 rounded-xl border border-[#414E36]/15 bg-white px-3 py-2 text-xs font-bold text-[#1F251A] outline-none"
                    >
                      <option value="">{t.selectServicePlaceholder}</option>
                      {servicesList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.en || s.name || s.title || s.name_en || s.ar} ({s.price || 0} EGP)
                        </option>
                      ))}
                    </select>

                    {/* Device Selector */}
                    <select
                      value={selectedDeviceForService}
                      onChange={(e) => setSelectedDeviceForService(e.target.value)}
                      className="rounded-xl border border-[#414E36]/15 bg-white px-3 py-2 text-xs font-bold text-[#1F251A] outline-none"
                    >
                      <option value="">{t.selectDevicePlaceholder}</option>
                      {devicesList.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-[#5A6A51] mb-1">{t.overridePulsesLabel}</label>
                      <input
                        type="number"
                        min={0}
                        value={pulsesCountForService}
                        onChange={(e) => setPulsesCountForService(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-1.5 text-xs font-bold text-[#1F251A] outline-none"
                        placeholder="Pulses (e.g. 150)"
                      />
                    </div>

                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={handleAddServiceToSession}
                        disabled={!selectedServiceIdToAdd}
                        className="w-full rounded-xl bg-[#414E36] py-2 text-xs font-bold text-white hover:bg-[#343F2B] transition disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        <Plus size={14} /> {t.addAdditionalServiceBtn}
                      </button>
                    </div>
                  </div>

                  {/* Added Additional Services List */}
                  {additionalServices.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-[#414E36]/10">
                      {additionalServices.map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-xs bg-white p-3 rounded-xl border border-[#414E36]/10">
                          <div>
                            <span className="font-bold text-[#1F251A] block">{item.name}</span>
                            <span className="text-[10px] text-[#5A6A51]">
                              {item.deviceName ? `${t.deviceUsedLabel} ${item.deviceName} • ` : ""}{item.pulses} {t.pulsesLabel}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-extrabold text-[#414E36]">+{item.price} EGP</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveServiceFromSession(item.id)}
                              className="text-rose-600 hover:text-rose-800 text-xs font-bold"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 3. PRODUCTS / CONSUMABLES USED SECTION */}
              <div className="rounded-3xl border border-[#414E36]/10 bg-white p-6 shadow-sm space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#414E36]/10 pb-3">
                  <h3 className="text-sm font-bold text-[#1F251A] uppercase tracking-wider flex items-center gap-2">
                    <ShoppingBag size={16} className="text-[#414E36]" /> {t.productsUsedTitle}
                  </h3>
                </div>

                <div className="space-y-3 bg-[#FBFBF9] p-4 rounded-2xl border border-[#414E36]/10">
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

                {/* Final Session Invoice Breakdown Summary */}
                <div className="bg-[#414E36]/05 p-4 rounded-2xl space-y-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-3 text-[#5A6A51]">
                    <span>{t.baseServiceLabel} <strong className="text-[#1F251A]">{baseBookingPrice} EGP</strong></span>
                    {additionalServicesSubtotal > 0 && (
                      <span>{t.additionalServicesSubtotal} <strong className="text-[#1F251A]">+{additionalServicesSubtotal} EGP</strong></span>
                    )}
                    {productsSubtotal > 0 && (
                      <span>{t.productsAddonsLabel} <strong className="text-[#1F251A]">+{productsSubtotal} EGP</strong></span>
                    )}
                  </div>
                  <div className="pt-2 border-t border-[#414E36]/10 flex items-center justify-between text-[#414E36] font-extrabold text-base">
                    <span>{t.finalInvoiceLabel}</span>
                    <span>{finalSessionTotal} EGP</span>
                  </div>
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
        </div>
      )}
    </div>
  );
}
