"use client";

import React, { useState, useEffect } from "react";
import { X, Clock, CheckCircle2, Play, ChevronRight, Pill, FileText, Package, AlertCircle, User, Phone, Mail, Calendar, ShieldAlert } from "lucide-react";
import { DoctorPatient } from "../types";
import { parseBookingNotes, getAuthHeaders } from "../utils";

interface DoctorPatientHistoryDrawerProps {
  selectedPatientHistory: DoctorPatient | null;
  setSelectedPatientHistory: (patient: DoctorPatient | null) => void;
  handleOpenScheduleModal: (booking: any) => void;
  medicalRecordsMap?: Record<string, any>;
  prescriptionsMap?: Record<string, any[]>;
  t: any;
}

export default function DoctorPatientHistoryDrawer({
  selectedPatientHistory,
  setSelectedPatientHistory,
  handleOpenScheduleModal,
  medicalRecordsMap = {},
  prescriptionsMap = {},
  t
}: DoctorPatientHistoryDrawerProps) {
  const [patientRxList, setPatientRxList] = useState<any[]>([]);
  const [medicalRecordData, setMedicalRecordData] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<"history" | "medical">("history");

  useEffect(() => {
    if (!selectedPatientHistory) {
      setPatientRxList([]);
      setMedicalRecordData(null);
      return;
    }

    const custId = selectedPatientHistory.id;

    // Check cached medical record or fetch from API
    if (medicalRecordsMap[custId]) {
      setMedicalRecordData(medicalRecordsMap[custId]);
    } else {
      const fetchMedicalRecord = async () => {
        try {
          const headers = await getAuthHeaders();
          const res = await fetch(`/api/medical-records?customerId=${encodeURIComponent(custId)}`, { headers });
          if (res.ok) {
            const data = await res.json();
            const record = data.medicalRecord || (Array.isArray(data) ? data[0] : null);
            if (record) setMedicalRecordData(record);
          }
        } catch (err) {
          console.error("Error loading patient medical record:", err);
        }
      };
      fetchMedicalRecord();
    }

    // Check cached prescriptions or fetch from API
    if (prescriptionsMap[custId]) {
      setPatientRxList(prescriptionsMap[custId]);
    } else {
      const fetchRx = async () => {
        try {
          const headers = await getAuthHeaders();
          const res = await fetch(`/api/prescriptions?customer_id=${encodeURIComponent(custId)}`, { headers });
          if (res.ok) {
            const data = await res.json();
            setPatientRxList(Array.isArray(data) ? data : data.prescriptions || []);
          }
        } catch (err) {
          console.error("Error loading patient prescriptions:", err);
        }
      };
      fetchRx();
    }
  }, [selectedPatientHistory, medicalRecordsMap, prescriptionsMap]);

  if (!selectedPatientHistory) return null;

  return (
    <div className="fixed inset-0 z-[105] flex justify-end bg-black/50 backdrop-blur-xs transition-opacity animate-fadeIn">
      {/* Backdrop overlay */}
      <div 
        className="absolute inset-0 cursor-pointer" 
        onClick={() => setSelectedPatientHistory(null)} 
      />

      {/* Right Drawer Container */}
      <div className="relative w-full max-w-2xl h-full bg-[#FBFBF9] shadow-2xl z-10 flex flex-col overflow-hidden border-l border-[#414E36]/15 animate-slideLeft">
        
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-5 px-6 border-b border-[#414E36]/10 bg-white">
          <div className="flex items-center gap-4">
            <div className="relative flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-[#414E36] text-white font-extrabold text-lg shadow-sm border-2 border-white">
              {(selectedPatientHistory.name || "P").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-xl font-bold text-[#1F251A]">
                  {selectedPatientHistory.name}
                </h3>
                <span className="rounded-full bg-[#414E36]/10 px-2.5 py-0.5 text-[10px] font-bold text-[#414E36]">
                  {selectedPatientHistory.totalVisits} {selectedPatientHistory.totalVisits === 1 ? t.visit : t.visits}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-[#5A6A51] mt-1">
                <span className="flex items-center gap-1 font-mono">
                  <Phone size={12} className="text-[#414E36]" /> {selectedPatientHistory.phone || "N/A"}
                </span>
                {selectedPatientHistory.email && (
                  <span className="flex items-center gap-1">
                    <Mail size={12} className="text-[#414E36]" /> {selectedPatientHistory.email}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSelectedPatientHistory(null)}
            className="rounded-2xl p-2.5 text-[#5A6A51] hover:bg-gray-100 hover:text-[#1F251A] transition"
            title={t.closeDrawerBtn}
          >
            <X size={20} />
          </button>
        </div>

        {/* Doctor Navigation Tabs (Session History vs Medical Intake) */}
        <div className="flex items-center bg-white px-6 border-b border-[#414E36]/10 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === "history"
                ? "border-[#414E36] text-[#414E36]"
                : "border-transparent text-[#5A6A51] hover:text-[#1F251A]"
            }`}
          >
            <Clock size={14} />
            <span>Clinical History & Visits ({selectedPatientHistory.bookings.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("medical")}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === "medical"
                ? "border-[#414E36] text-[#414E36]"
                : "border-transparent text-[#5A6A51] hover:text-[#1F251A]"
            }`}
          >
            <AlertCircle size={14} />
            <span>Medical Record & Intake</span>
            {medicalRecordData?.allergies && (
              <span className="h-2 w-2 rounded-full bg-rose-500" />
            )}
          </button>
        </div>

        {/* Scrollable Content: Doctor-Focused Patient Details */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Quick Doctor Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-2xl bg-white p-4 border border-[#414E36]/10 text-xs shadow-xs">
            <div>
              <span className="text-[10px] font-bold text-[#9CA3AF] uppercase block mb-0.5">{t.completedPatientVisits}</span>
              <p className="font-extrabold text-[#1F251A] text-sm">{selectedPatientHistory.totalVisits} {t.sessionsUnit}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#9CA3AF] uppercase block mb-0.5">{t.lastVisitLabel}</span>
              <p className="font-extrabold text-[#414E36] text-sm">{selectedPatientHistory.lastVisitDate || "N/A"}</p>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold text-[#9CA3AF] uppercase block mb-0.5">{t.servicesReceivedHeader}</span>
              <p className="font-bold text-[#1F251A] truncate">{selectedPatientHistory.recentServices.join(", ") || "General"}</p>
            </div>
          </div>

          {/* TAB 1: CLINICAL HISTORY & VISITS */}
          {activeTab === "history" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-[#414E36]/10">
                <h4 className="text-xs font-bold text-[#1F251A] uppercase tracking-wider flex items-center gap-2">
                  <Clock size={15} className="text-[#414E36]" /> {t.patientHistoryDrawerTitle}
                </h4>
                <span className="text-[10px] font-bold text-[#5A6A51] bg-[#414E36]/10 px-2.5 py-0.5 rounded-full">
                  {selectedPatientHistory.bookings.length} {t.totalScheduledCard}
                </span>
              </div>

              {selectedPatientHistory.bookings.map((booking: any, idx: number) => {
                const parsed = parseBookingNotes(booking.notes || "");
                const isCompleted = booking.status === "completed" || booking.status === "done";
                const isInSession = booking.status === "started" || booking.status === "in-progress";

                // Find prescription matching this booking or patient
                const matchingRx = patientRxList.find(
                  (p) => String(p.booking_id) === String(booking.id) || String(p.id) === String(booking.id)
                ) || patientRxList[idx];

                return (
                  <div
                    key={booking.id || idx}
                    className="rounded-2xl border border-[#E6E9EB] bg-white p-5 space-y-4 shadow-xs hover:border-[#414E36]/30 transition"
                  >
                    {/* Visit Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#414E36] text-white font-extrabold text-xs">
                          #{selectedPatientHistory.bookings.length - idx}
                        </span>
                        <div>
                          <span className="text-xs font-bold text-[#1F251A]">
                            {booking.date || "Date Unspecified"} • {booking.time || booking.time_slot || "Time Unspecified"}
                          </span>
                          <p className="text-[11px] text-[#5A6A51] font-medium">
                            {booking.service || booking.service_name || "Clinical Session"} • <span className="text-[#414E36] font-semibold">{booking.room || booking.room_name || "Treatment Room"}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isCompleted && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                            <CheckCircle2 size={11} /> {t.completedStatus}
                          </span>
                        )}
                        {isInSession && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200/60 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 animate-pulse">
                            <Play size={11} /> {t.inSessionStatus}
                          </span>
                        )}
                        {!isCompleted && !isInSession && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-semibold text-gray-700 capitalize">
                            {booking.status || "Scheduled"}
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPatientHistory(null);
                            handleOpenScheduleModal(booking);
                          }}
                          className="rounded-xl border border-gray-200 bg-white px-3 py-1 text-xs font-bold text-[#414E36] hover:bg-[#414E36] hover:text-white transition shadow-xs flex items-center gap-1"
                        >
                          <span>{t.inspectBtn}</span>
                          <ChevronRight size={12} className="rtl:rotate-180 transition-transform" />
                        </button>
                      </div>
                    </div>

                    {/* Issued Digital Prescription for this visit */}
                    {matchingRx ? (
                      <div className="bg-[#FBFBF9] p-3.5 rounded-xl border border-[#E6E9EB] space-y-2 text-xs">
                        <span className="font-extrabold text-[#414E36] flex items-center gap-1.5 text-[11px]">
                          <Pill size={13} /> {t.savedPrescriptionTitle}
                        </span>
                        {matchingRx.diagnosis && (
                          <p className="text-[11px] font-bold text-[#1F251A]">
                            <span className="text-[#9CA3AF] font-normal">{t.diagnosisLabel}:</span> {matchingRx.diagnosis}
                          </p>
                        )}
                        {Array.isArray(matchingRx.medications) && matchingRx.medications.length > 0 && (
                          <div className="space-y-1">
                            {matchingRx.medications.map((m: any, mIdx: number) => (
                              <div key={mIdx} className="bg-white p-2 rounded-lg text-[11px] flex justify-between gap-2 border border-gray-100">
                                <span className="font-bold text-[#1F251A]">{m.name}</span>
                                <span className="text-[#5A6A51] font-mono">{m.dosage} • {m.frequency} • {m.duration}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {matchingRx.general_notes && (
                          <p className="text-[11px] text-[#5A6A51] italic">{matchingRx.general_notes}</p>
                        )}
                      </div>
                    ) : null}

                    {/* Doctor Clinical Notes for this specific visit */}
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF] flex items-center gap-1">
                        <FileText size={12} /> {t.doctorNotesTitle}:
                      </span>
                      <p className="text-xs text-[#1F251A] mt-1 bg-[#FBFBF9] p-3 rounded-xl border border-[#E6E9EB] font-sans leading-relaxed">
                        {parsed.cleanDoctorNote || t.noBookingNotes}
                      </p>
                    </div>

                    {/* Consumables used during session */}
                    {parsed.productsLog && (
                      <div className="text-[11px] font-medium text-[#374151] bg-[#F7F7F9] p-2.5 rounded-xl border border-gray-100 flex items-center gap-1.5">
                        <Package size={13} className="text-[#5A6A51] shrink-0" />
                        <span>{parsed.productsLog.replace(/^\[Products Used During Session\]:\s*/i, "Consumables: ")}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: MEDICAL RECORD & INTAKE */}
          {activeTab === "medical" && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-white p-5 border border-[#E6E9EB] space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h4 className="text-xs font-extrabold text-[#1F251A] uppercase tracking-wider flex items-center gap-2">
                    <ShieldAlert size={15} className="text-[#414E36]" /> {t.patientMedicalRecordTitle}
                  </h4>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/50">
                    <CheckCircle2 size={11} /> {t.onFileStatus}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="bg-[#FBFBF9] p-3.5 rounded-xl border border-gray-100">
                    <span className="text-[#9CA3AF] block mb-1 font-semibold">{t.skinTypeLabel}</span>
                    <span className="font-bold text-[#1F251A] text-sm">{medicalRecordData?.skin_type || 'Normal / Unspecified'}</span>
                  </div>

                  <div className="bg-rose-50/50 p-3.5 rounded-xl border border-rose-200/60">
                    <span className="text-rose-700 block mb-1 font-bold flex items-center gap-1">
                      <AlertCircle size={12} /> {t.allergiesLabel}
                    </span>
                    <span className="font-bold text-rose-800 text-sm">{medicalRecordData?.allergies || 'No known allergies'}</span>
                  </div>

                  <div className="bg-[#FBFBF9] p-3.5 rounded-xl border border-gray-100 col-span-1 sm:col-span-2">
                    <span className="text-[#9CA3AF] block mb-1 font-semibold">{t.currentMedicationLabel}</span>
                    <span className="font-medium text-[#1F251A]">{medicalRecordData?.medication_details || 'None reported'}</span>
                  </div>

                  <div className="bg-[#FBFBF9] p-3.5 rounded-xl border border-gray-100 col-span-1 sm:col-span-2">
                    <span className="text-[#9CA3AF] block mb-1 font-semibold">{t.medicalConditionsLabel}</span>
                    <span className="font-medium text-[#1F251A]">{medicalRecordData?.medical_conditions_details || 'None reported'}</span>
                  </div>

                  <div className="bg-[#FBFBF9] p-3.5 rounded-xl border border-gray-100 col-span-1 sm:col-span-2">
                    <span className="text-[#9CA3AF] block mb-1 font-semibold">{t.previousTreatmentsLabel || "Previous Treatments & Procedures"}</span>
                    <span className="font-medium text-[#1F251A]">{medicalRecordData?.previous_treatments_details || 'None reported'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 px-6 bg-white border-t border-[#E6E9EB] flex items-center justify-between text-xs text-[#5A6A51]">
          <span>{selectedPatientHistory.name} • Clinical Profile</span>
          <button
            type="button"
            onClick={() => setSelectedPatientHistory(null)}
            className="rounded-xl bg-[#414E36] px-5 py-2 font-bold text-white shadow-xs hover:bg-[#343F2B] transition"
          >
            {t.closeTimelineBtn}
          </button>
        </div>
      </div>
    </div>
  );
}
