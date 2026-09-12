"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ArrowLeft, Clock, CheckCircle2, Play, ChevronRight, Pill, FileText, Package, AlertCircle, User, Phone, Mail, Calendar, ShieldAlert, MapPin, Hash, Sparkles, Plus, Trash2, Loader2, Download, ExternalLink } from "lucide-react";
import { DoctorPatient } from "../types";
import { parseBookingNotes, getAuthHeaders } from "../utils";
import MedicalReportModal from "@/components/admin/patients/MedicalReportModal";
import { adminTranslations } from "@/components/admin/translations";

interface DoctorPatientHistoryDrawerProps {
  selectedPatientHistory: DoctorPatient | null;
  setSelectedPatientHistory: (patient: DoctorPatient | null) => void;
  handleOpenScheduleModal: (booking: any) => void;
  medicalRecordsMap?: Record<string, any>;
  prescriptionsMap?: Record<string, any[]>;
  t: any;
  lang?: "en" | "ar";
  doctorName?: string;
  adminRole?: string | null;
}

export default function DoctorPatientHistoryDrawer({
  selectedPatientHistory,
  setSelectedPatientHistory,
  handleOpenScheduleModal,
  medicalRecordsMap = {},
  prescriptionsMap = {},
  t,
  lang = "en",
  doctorName = "Doctor",
  adminRole = "doctor"
}: DoctorPatientHistoryDrawerProps) {
  const [patientRxList, setPatientRxList] = useState<any[]>([]);
  const [medicalRecordData, setMedicalRecordData] = useState<any | null>(null);
  const [medicalReports, setMedicalReports] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [showMedicalReportModal, setShowMedicalReportModal] = useState(false);
  const [customerFullData, setCustomerFullData] = useState<any | null>(null);
  const [loadingCustomerData, setLoadingCustomerData] = useState(false);
  const [activeTab, setActiveTab] = useState<"history" | "medical" | "reports" | "personal">("history");
  const [authHeadersObj, setAuthHeadersObj] = useState<{ "Content-Type": string; Authorization: string }>({
    "Content-Type": "application/json",
    Authorization: ""
  });

  const validBookings = useMemo(() => {
    if (!selectedPatientHistory?.bookings) return [];
    return selectedPatientHistory.bookings.filter((b: any) => {
      const st = String(b.status || "").toLowerCase().trim();
      return st !== "rejected" && st !== "cancelled" && st !== "canceled";
    });
  }, [selectedPatientHistory]);

  useEffect(() => {
    getAuthHeaders().then((h: any) => {
      setAuthHeadersObj({
        "Content-Type": "application/json",
        Authorization: h.Authorization || ""
      });
    });
  }, []);

  useEffect(() => {
    if (!selectedPatientHistory) {
      setPatientRxList([]);
      setMedicalRecordData(null);
      setMedicalReports([]);
      setCustomerFullData(null);
      return;
    }

    const custId = selectedPatientHistory.id;
    const phone = selectedPatientHistory.phone;

    // 1. Fetch full customer details from /api/customers
    const fetchFullCustomer = async () => {
      setLoadingCustomerData(true);
      try {
        const headers = await getAuthHeaders();
        const url = phone ? `/api/customers?mobile=${encodeURIComponent(phone)}` : `/api/customers`;
        const res = await fetch(url, { headers });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const found = data.find((c) => c.id === custId || c.mobile === phone);
            if (found) setCustomerFullData(found);
          } else if (data && typeof data === "object") {
            setCustomerFullData(data);
          }
        }
      } catch (err) {
        console.error("Error fetching full customer data:", err);
      } finally {
        setLoadingCustomerData(false);
      }
    };
    fetchFullCustomer();

    // 2. Fetch medical records & uploaded reports from /api/medical-records
    const fetchMedicalRecordAndReports = async () => {
      setLoadingReports(true);
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`/api/medical-records?customerId=${encodeURIComponent(custId)}`, { headers });
        if (res.ok) {
          const data = await res.json();
          const record = data.form || data.medicalRecord || (Array.isArray(data) ? data[0] : null);
          if (record) setMedicalRecordData(record);
          if (Array.isArray(data.reports)) {
            setMedicalReports(data.reports);
          }
        }
      } catch (err) {
        console.error("Error loading patient medical record & reports:", err);
      } finally {
        setLoadingReports(false);
      }
    };
    fetchMedicalRecordAndReports();

    // 3. Check cached prescriptions or fetch from API
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

  const handleDeleteMedicalReport = async (reportId: string) => {
    if (!confirm("Are you sure you want to delete this report?")) return;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/medical-records?reportId=${encodeURIComponent(reportId)}`, {
        method: "DELETE",
        headers
      });
      if (res.ok) {
        setMedicalReports((prev) => prev.filter((r) => r.id !== reportId));
      } else {
        alert("Failed to delete medical report.");
      }
    } catch (err) {
      console.error("Error deleting medical report:", err);
      alert("Error deleting medical report.");
    }
  };

  if (!selectedPatientHistory) return null;

  const phoneDisplay = customerFullData?.mobile || selectedPatientHistory.phone || "N/A";
  const emailDisplay = customerFullData?.email || selectedPatientHistory.email || "N/A";
  const genderDisplay = customerFullData?.gender || "Not Specified";
  const dobDisplay = customerFullData?.dob || customerFullData?.date_of_birth || "Not Specified";
  const addressDisplay = customerFullData?.address || "Not Specified";
  const memberSince = customerFullData?.created_at ? customerFullData.created_at.slice(0, 10) : "N/A";

  return (
    <div className="fixed inset-0 md:[inset-inline-start:220px] z-40 bg-[#FBFBF9] overflow-y-auto flex flex-col h-full text-[#1F251A] isolate">
      
      {/* Top Sticky Header Bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-[#414E36]/12 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shadow-xs">
        <button
          type="button"
          onClick={() => setSelectedPatientHistory(null)}
          className="flex items-center gap-2 rounded-2xl bg-[#414E36]/10 hover:bg-[#414E36] text-[#414E36] hover:text-white px-3.5 sm:px-4 py-2 font-bold text-xs transition shadow-xs cursor-pointer"
        >
          <ArrowLeft size={16} className="rtl:rotate-180" />
          <span>Back to Patients Directory</span>
        </button>

        <div className="flex items-center gap-3">
          <span className="rounded-full bg-[#414E36]/10 px-3 py-1 text-[11px] sm:text-xs font-bold text-[#414E36]">
            Patient Profile View
          </span>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 md:p-8 pb-24 md:pb-8 space-y-4 sm:space-y-6">
        
        {/* Patient Profile Hero Header Banner */}
        <div className="rounded-2xl sm:rounded-3xl bg-white p-4 sm:p-6 md:p-8 border border-[#414E36]/12 shadow-sm space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
            <div className="flex items-center gap-3.5 sm:gap-5">
              <div className="relative flex h-14 w-14 sm:h-20 sm:w-20 shrink-0 items-center justify-center rounded-2xl sm:rounded-3xl bg-[#414E36] text-white font-black text-xl sm:text-3xl shadow-md border-2 border-white">
                {(selectedPatientHistory.name || "P").slice(0, 2).toUpperCase()}
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-[#1F251A] truncate">
                    {selectedPatientHistory.name}
                  </h1>
                  <span className="rounded-full bg-[#414E36]/10 px-2.5 sm:px-3.5 py-0.5 sm:py-1 text-[10px] sm:text-xs font-extrabold text-[#414E36]">
                    {selectedPatientHistory.totalVisits} {selectedPatientHistory.totalVisits === 1 ? t.visit : t.visits}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs md:text-sm text-[#5A6A51] font-medium">
                  <span className="flex items-center gap-1.5 font-mono">
                    <Phone size={14} className="text-[#414E36]" /> {phoneDisplay}
                  </span>
                  {emailDisplay !== "N/A" && (
                    <span className="flex items-center gap-1.5 truncate max-w-[200px] sm:max-w-none">
                      <Mail size={14} className="text-[#414E36]" /> {emailDisplay}
                    </span>
                  )}
                  {addressDisplay !== "Not Specified" && (
                    <span className="flex items-center gap-1.5">
                      <MapPin size={14} className="text-[#414E36]" /> {addressDisplay}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <div className="flex-1 sm:flex-initial rounded-2xl bg-[#F4F5F1] p-2.5 sm:p-3 px-3 sm:px-5 text-center border border-[#414E36]/10">
                <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-[#5A6A51] block mb-0.5">{t.completedPatientVisits}</span>
                <span className="text-sm sm:text-lg font-black text-[#1F251A]">{selectedPatientHistory.totalVisits} Sessions</span>
              </div>
              <div className="flex-1 sm:flex-initial rounded-2xl bg-[#F4F5F1] p-2.5 sm:p-3 px-3 sm:px-5 text-center border border-[#414E36]/10">
                <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-[#5A6A51] block mb-0.5">{t.lastVisitLabel}</span>
                <span className="text-sm sm:text-lg font-black text-[#414E36]">{selectedPatientHistory.lastVisitDate || "N/A"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Sub-Navigation Tabs Bar */}
        <div className="flex items-center bg-white rounded-2xl sm:rounded-3xl p-1.5 sm:p-2 border border-[#414E36]/12 shadow-xs gap-1 sm:gap-2 overflow-x-auto no-scrollbar w-full">
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-2.5 sm:py-3.5 px-3 sm:px-4 text-xs sm:text-sm font-extrabold rounded-xl sm:rounded-2xl transition flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "history"
                ? "bg-[#414E36] text-white shadow-sm"
                : "text-[#5A6A51] hover:text-[#1F251A] hover:bg-[#F4F5F1]"
            }`}
          >
            <Clock size={16} />
            <span>Clinical History ({validBookings.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("medical")}
            className={`flex-1 py-2.5 sm:py-3.5 px-3 sm:px-4 text-xs sm:text-sm font-extrabold rounded-xl sm:rounded-2xl transition flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "medical"
                ? "bg-[#414E36] text-white shadow-sm"
                : "text-[#5A6A51] hover:text-[#1F251A] hover:bg-[#F4F5F1]"
            }`}
          >
            <ShieldAlert size={16} />
            <span>Medical Record</span>
            {medicalRecordData?.allergies && (
              <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-rose-400" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("reports")}
            className={`flex-1 py-2.5 sm:py-3.5 px-3 sm:px-4 text-xs sm:text-sm font-extrabold rounded-xl sm:rounded-2xl transition flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "reports"
                ? "bg-[#414E36] text-white shadow-sm"
                : "text-[#5A6A51] hover:text-[#1F251A] hover:bg-[#F4F5F1]"
            }`}
          >
            <FileText size={16} />
            <span>Documents ({medicalReports.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("personal")}
            className={`flex-1 py-2.5 sm:py-3.5 px-3 sm:px-4 text-xs sm:text-sm font-extrabold rounded-xl sm:rounded-2xl transition flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "personal"
                ? "bg-[#414E36] text-white shadow-sm"
                : "text-[#5A6A51] hover:text-[#1F251A] hover:bg-[#F4F5F1]"
            }`}
          >
            <User size={16} />
            <span>Personal Info</span>
          </button>
        </div>

        {/* Tab 1: Clinical History & Visits */}
        {activeTab === "history" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#414E36]/10">
              <h3 className="text-xs sm:text-sm font-extrabold text-[#1F251A] uppercase tracking-wider flex items-center gap-2">
                <Clock size={16} className="text-[#414E36]" /> {t.patientHistoryDrawerTitle}
              </h3>
              <span className="text-[11px] sm:text-xs font-bold text-[#414E36] bg-[#414E36]/10 px-2.5 sm:px-3 py-1 rounded-full">
                {validBookings.length} {t.totalScheduledCard}
              </span>
            </div>

            {validBookings.map((booking: any, idx: number) => {
              const parsed = parseBookingNotes(booking.notes || "");
              // Brief 33: prefer doctor_notes (clean column) for the clinical note display
              const dedicatedDrNote = booking.doctorNotes ?? booking.doctor_notes ?? null;
              if (dedicatedDrNote !== null && dedicatedDrNote !== undefined) {
                parsed.cleanDoctorNote = dedicatedDrNote;
              }
              const isCompleted = booking.status === "completed" || booking.status === "done";
              const isInSession = booking.status === "started" || booking.status === "in-progress";

              // Find prescription matching this booking or patient
              const matchingRx = patientRxList.find(
                (p) => String(p.booking_id) === String(booking.id) || String(p.id) === String(booking.id)
              ) || patientRxList[idx];

              return (
                <div
                  key={booking.id || idx}
                  className="rounded-2xl sm:rounded-3xl border border-[#414E36]/12 bg-white p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-xs hover:border-[#414E36]/30 transition"
                >
                  {/* Visit Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#414E36]/10 pb-3 sm:pb-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-2xl bg-[#414E36] text-white font-black text-xs sm:text-sm shadow-xs shrink-0">
                        #{validBookings.length - idx}
                      </span>
                      <div className="min-w-0">
                        <span className="text-sm sm:text-base font-bold text-[#1F251A] truncate block">
                          {booking.date || "Date Unspecified"} • {booking.time || booking.time_slot || "Time Unspecified"}
                        </span>
                        <p className="text-[11px] sm:text-xs text-[#5A6A51] font-semibold mt-0.5 truncate">
                          {booking.service || booking.service_name || "Clinical Session"} • <span className="text-[#414E36] font-extrabold">{booking.room || booking.room_name || "Treatment Room"}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                      {isCompleted && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 sm:px-3.5 py-1 text-[11px] sm:text-xs font-bold text-emerald-800">
                          <CheckCircle2 size={12} /> {t.completedStatus}
                        </span>
                      )}
                      {isInSession && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 sm:px-3.5 py-1 text-[11px] sm:text-xs font-bold text-amber-800 animate-pulse">
                          <Play size={12} /> {t.inSessionStatus}
                        </span>
                      )}
                      {!isCompleted && !isInSession && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 sm:px-3.5 py-1 text-[11px] sm:text-xs font-semibold text-gray-700 capitalize">
                          {booking.status || "Scheduled"}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          handleOpenScheduleModal(booking);
                        }}
                        className="rounded-2xl border border-[#414E36]/20 bg-white px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs font-bold text-[#414E36] hover:bg-[#414E36] hover:text-white transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>{t.inspectBtn}</span>
                        <ChevronRight size={14} className="rtl:rotate-180 transition-transform" />
                      </button>
                    </div>
                  </div>

                  {/* Issued Digital Prescription for this visit */}
                  {matchingRx && (
                    <div className="bg-[#FBFBF9] p-3.5 sm:p-4.5 rounded-2xl border border-[#414E36]/10 space-y-2 text-xs">
                      <span className="font-extrabold text-[#414E36] flex items-center gap-2 text-xs">
                        <Pill size={15} /> {t.savedPrescriptionTitle}
                      </span>
                      {matchingRx.diagnosis && (
                        <p className="text-xs font-bold text-[#1F251A]">
                          <span className="text-[#5A6A51] font-medium">{t.diagnosisLabel}:</span> {matchingRx.diagnosis}
                        </p>
                      )}
                      {Array.isArray(matchingRx.medications) && matchingRx.medications.length > 0 && (
                        <div className="space-y-1.5">
                          {matchingRx.medications.map((m: any, mIdx: number) => (
                            <div key={mIdx} className="bg-white p-2.5 sm:p-3 rounded-xl text-xs flex flex-wrap justify-between gap-2 border border-gray-200">
                              <span className="font-bold text-[#1F251A]">{m.name}</span>
                              <span className="text-[#5A6A51] font-mono font-medium text-[11px] sm:text-xs">{m.dosage} • {m.frequency} • {m.duration}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {matchingRx.general_notes && (
                        <p className="text-xs text-[#5A6A51] italic">{matchingRx.general_notes}</p>
                      )}
                    </div>
                  )}

                  {/* Doctor Clinical Notes for this specific visit */}
                  <div className="space-y-1">
                    <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-[#5A6A51] flex items-center gap-1.5">
                      <FileText size={14} /> {t.doctorNotesTitle}:
                    </span>
                    <p className="text-xs sm:text-sm text-[#1F251A] bg-[#FBFBF9] p-3.5 sm:p-4 rounded-2xl border border-[#414E36]/10 font-sans leading-relaxed">
                      {parsed.cleanDoctorNote || t.noBookingNotes}
                    </p>
                  </div>

                  {/* Session Consumables Log */}
                  {parsed.productsLog && (
                    <div className="text-xs font-medium text-[#374151] bg-[#F7F7F9] p-3 rounded-2xl border border-gray-200 flex items-center gap-2">
                      <Package size={15} className="text-[#414E36] shrink-0" />
                      <span className="truncate">{parsed.productsLog.replace(/^\[Products Used During Session\]:\s*/i, "Consumables Used: ")}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 2: Medical Record & Intake */}
        {activeTab === "medical" && (
          <div className="space-y-4 sm:space-y-6">
            <div className="rounded-2xl sm:rounded-3xl bg-white p-4 sm:p-6 md:p-8 border border-[#414E36]/12 space-y-4 sm:space-y-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-[#414E36]/10 pb-3 sm:pb-4 flex-wrap gap-2">
                <h3 className="text-sm sm:text-base font-extrabold text-[#1F251A] uppercase tracking-wider flex items-center gap-2.5">
                  <ShieldAlert size={18} className="text-[#414E36]" /> {t.patientMedicalRecordTitle}
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
                  <CheckCircle2 size={12} /> {t.onFileStatus}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6 text-sm">
                <div className="bg-[#FBFBF9] p-4 sm:p-6 rounded-2xl border border-[#414E36]/10">
                  <span className="text-[11px] sm:text-xs font-bold text-[#5A6A51] uppercase tracking-wider block mb-1 sm:mb-2">{t.skinTypeLabel}</span>
                  <span className="font-extrabold text-[#1F251A] text-base sm:text-lg">{medicalRecordData?.skin_type || 'Normal / Unspecified'}</span>
                </div>

                <div className="bg-rose-50/70 p-4 sm:p-6 rounded-2xl border border-rose-200">
                  <span className="text-[11px] sm:text-xs font-bold text-rose-700 uppercase tracking-wider block mb-1 sm:mb-2 flex items-center gap-1.5">
                    <AlertCircle size={14} /> {t.allergiesLabel}
                  </span>
                  <span className="font-extrabold text-rose-800 text-base sm:text-lg">{medicalRecordData?.allergies || 'No known allergies'}</span>
                </div>

                <div className="bg-[#FBFBF9] p-4 sm:p-6 rounded-2xl border border-[#414E36]/10 col-span-1 md:col-span-2">
                  <span className="text-[11px] sm:text-xs font-bold text-[#5A6A51] uppercase tracking-wider block mb-1 sm:mb-2">{t.currentMedicationLabel}</span>
                  <span className="font-semibold text-[#1F251A] text-sm sm:text-base leading-relaxed">{medicalRecordData?.medication_details || 'None reported'}</span>
                </div>

                <div className="bg-[#FBFBF9] p-4 sm:p-6 rounded-2xl border border-[#414E36]/10 col-span-1 md:col-span-2">
                  <span className="text-[11px] sm:text-xs font-bold text-[#5A6A51] uppercase tracking-wider block mb-1 sm:mb-2">{t.medicalConditionsLabel}</span>
                  <span className="font-semibold text-[#1F251A] text-sm sm:text-base leading-relaxed">{medicalRecordData?.medical_conditions_details || 'None reported'}</span>
                </div>

                <div className="bg-[#FBFBF9] p-4 sm:p-6 rounded-2xl border border-[#414E36]/10 col-span-1 md:col-span-2">
                  <span className="text-[11px] sm:text-xs font-bold text-[#5A6A51] uppercase tracking-wider block mb-1 sm:mb-2">{t.previousTreatmentsLabel || "Previous Treatments & Procedures"}</span>
                  <span className="font-semibold text-[#1F251A] text-sm sm:text-base leading-relaxed">{medicalRecordData?.previous_treatments_details || 'None reported'}</span>
                </div>

                {medicalRecordData?.responses && Object.keys(medicalRecordData.responses).length > 0 && (
                  <div className="bg-[#FBFBF9] p-4 sm:p-6 rounded-2xl border border-[#414E36]/10 col-span-1 md:col-span-2 space-y-3">
                    <span className="text-[11px] sm:text-xs font-bold text-[#5A6A51] uppercase tracking-wider block">Specialized Intake Questionnaire Responses</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                      {Object.entries(medicalRecordData.responses).map(([key, val]) => (
                        <div key={key} className="bg-white p-3 sm:p-3.5 rounded-xl border border-[#414E36]/8 space-y-0.5">
                          <span className="text-[10px] sm:text-[11px] font-bold text-[#5A6A51] capitalize block">{key.replace(/_/g, ' ')}</span>
                          <span className="text-xs font-bold text-[#1F251A] block">{typeof val === 'boolean' ? (val ? 'Yes / Confirmed' : 'No') : String(val || 'None')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Personal Info */}
        {activeTab === "personal" && (
          <div className="space-y-4 sm:space-y-6">
            <div className="rounded-2xl sm:rounded-3xl bg-white p-4 sm:p-6 md:p-8 border border-[#414E36]/12 space-y-4 sm:space-y-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-[#414E36]/10 pb-3 sm:pb-4 flex-wrap gap-2">
                <h3 className="text-sm sm:text-base font-extrabold text-[#1F251A] uppercase tracking-wider flex items-center gap-2.5">
                  <User size={18} className="text-[#414E36]" /> Patient Personal Profile Details
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#414E36]/10 px-3 py-1 text-xs font-bold text-[#414E36]">
                  ID: #{selectedPatientHistory.id}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 text-sm">
                <div className="bg-[#FBFBF9] p-4 sm:p-6 rounded-2xl border border-[#414E36]/10">
                  <span className="text-[11px] sm:text-xs font-bold text-[#5A6A51] uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                    <User size={14} className="text-[#414E36]" /> Full Name
                  </span>
                  <span className="font-black text-[#1F251A] text-base sm:text-lg">{selectedPatientHistory.name}</span>
                </div>

                <div className="bg-[#FBFBF9] p-4 sm:p-6 rounded-2xl border border-[#414E36]/10">
                  <span className="text-[11px] sm:text-xs font-bold text-[#5A6A51] uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                    <Phone size={14} className="text-[#414E36]" /> Mobile Phone
                  </span>
                  <span className="font-mono font-black text-[#1F251A] text-base sm:text-lg">{phoneDisplay}</span>
                </div>

                <div className="bg-[#FBFBF9] p-4 sm:p-6 rounded-2xl border border-[#414E36]/10">
                  <span className="text-[11px] sm:text-xs font-bold text-[#5A6A51] uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                    <Mail size={14} className="text-[#414E36]" /> Email Address
                  </span>
                  <span className="font-bold text-[#1F251A] text-sm sm:text-base truncate block">{emailDisplay}</span>
                </div>

                <div className="bg-[#FBFBF9] p-4 sm:p-6 rounded-2xl border border-[#414E36]/10">
                  <span className="text-[11px] sm:text-xs font-bold text-[#5A6A51] uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-[#414E36]" /> Gender
                  </span>
                  <span className="font-bold text-[#1F251A] text-sm sm:text-base capitalize">{genderDisplay}</span>
                </div>

                <div className="bg-[#FBFBF9] p-4 sm:p-6 rounded-2xl border border-[#414E36]/10">
                  <span className="text-[11px] sm:text-xs font-bold text-[#5A6A51] uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                    <Calendar size={14} className="text-[#414E36]" /> Date of Birth / Age
                  </span>
                  <span className="font-bold text-[#1F251A] text-sm sm:text-base">{dobDisplay}</span>
                </div>

                <div className="bg-[#FBFBF9] p-4 sm:p-6 rounded-2xl border border-[#414E36]/10">
                  <span className="text-[11px] sm:text-xs font-bold text-[#5A6A51] uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                    <MapPin size={14} className="text-[#414E36]" /> Address / Location
                  </span>
                  <span className="font-bold text-[#1F251A] text-sm sm:text-base">{addressDisplay}</span>
                </div>

                <div className="bg-[#FBFBF9] p-4 sm:p-6 rounded-2xl border border-[#414E36]/10">
                  <span className="text-[11px] sm:text-xs font-bold text-[#5A6A51] uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                    <Calendar size={14} className="text-[#414E36]" /> Member Since
                  </span>
                  <span className="font-bold text-[#1F251A] text-sm sm:text-base">{memberSince}</span>
                </div>

                <div className="bg-[#FBFBF9] p-4 sm:p-6 rounded-2xl border border-[#414E36]/10 col-span-1 sm:col-span-2">
                  <span className="text-[11px] sm:text-xs font-bold text-[#5A6A51] uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                    <Hash size={14} className="text-[#414E36]" /> Total Completed Visits
                  </span>
                  <span className="font-black text-[#414E36] text-base sm:text-lg">{selectedPatientHistory.totalVisits} Completed Clinic Visits</span>
                </div>
              </div>

              {customerFullData?.notes && (
                <div className="bg-[#FBFBF9] p-4 sm:p-6 rounded-2xl border border-[#414E36]/10">
                  <span className="text-xs font-bold text-[#5A6A51] uppercase tracking-wider block mb-2">Internal Patient Notes</span>
                  <p className="text-sm sm:text-base text-[#1F251A] leading-relaxed font-sans">{customerFullData.notes}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Reports & Documents */}
        {activeTab === "reports" && (
          <div className="space-y-4 sm:space-y-6 animate-fadeIn">
            {/* Header / Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-[#414E36]/12 shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-extrabold text-[#1F251A]">Reports & Documents ({medicalReports.length})</h3>
                  <span className="bg-[#EDF1EC] text-[#414E36] text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                    {medicalReports.length} {medicalReports.length === 1 ? "Document" : "Documents"}
                  </span>
                </div>
                <p className="text-xs text-[#5A6A51]">
                  Lab results, diagnostic scan reports, and external clinical documents uploaded by receptionists or doctors.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowMedicalReportModal(true)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#414E36] px-5 py-2.5 sm:py-3 text-xs font-bold text-[#FBFBF9] transition hover:bg-[#2e3a26] shadow-sm shrink-0 cursor-pointer w-full sm:w-auto"
              >
                <Plus size={16} /> Upload Report
              </button>
            </div>

            {/* Reports List */}
            {loadingReports ? (
              <div className="p-8 sm:p-12 text-center text-sm text-[#5A6A51] bg-white rounded-2xl sm:rounded-3xl border border-[#414E36]/12 flex items-center justify-center gap-2">
                <Loader2 size={18} className="animate-spin text-[#414E36]" /> Loading medical reports...
              </div>
            ) : medicalReports.length === 0 ? (
              <div className="text-center py-12 sm:py-16 bg-white rounded-2xl sm:rounded-3xl border border-[#414E36]/12 shadow-sm space-y-4 p-4 sm:p-6">
                <div className="h-14 w-14 sm:h-16 sm:w-16 mx-auto rounded-2xl sm:rounded-3xl bg-[#EDF1EC] text-[#414E36] flex items-center justify-center">
                  <FileText size={28} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm sm:text-base font-extrabold text-[#1F251A]">No medical reports uploaded yet</h3>
                  <p className="text-xs text-[#5A6A51] max-w-sm mx-auto">
                    Upload lab results, scan reports, or external clinical documents for this patient.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMedicalReportModal(true)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#414E36] px-5 py-2.5 sm:py-3 text-xs font-bold text-[#FBFBF9] transition hover:bg-[#2e3a26] shadow-sm cursor-pointer"
                >
                  <Plus size={16} /> Upload Report
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {medicalReports.map((report) => (
                  <div
                    key={report.id}
                    className="bg-white rounded-2xl sm:rounded-3xl border border-[#414E36]/12 p-4 sm:p-5 space-y-3.5 relative shadow-xs hover:border-[#414E36]/25 transition flex flex-col justify-between"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-2xl bg-[#EDF1EC] text-[#414E36] flex items-center justify-center shrink-0">
                            <FileText size={18} />
                          </div>
                          <div className="min-w-0">
                            <h5 className="font-extrabold text-[#1F251A] text-xs sm:text-sm truncate">
                              {report.title || report.report_title || "Medical Document"}
                            </h5>
                            <span className="text-[9px] sm:text-[10px] font-bold text-[#5A6A51] uppercase bg-[#F4F5F1] px-2 py-0.5 rounded-md inline-block mt-0.5 truncate">
                              {report.doctor_name ? `Uploaded by ${report.doctor_name}` : report.report_type || "Clinical Report"}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteMedicalReport(report.id)}
                          className="text-gray-400 hover:text-red-600 p-1.5 rounded-xl hover:bg-red-50 transition cursor-pointer shrink-0"
                          title="Delete Report"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {(report.description || report.notes) && (
                        <p className="text-xs text-[#5A6A51] bg-[#FBFBF9] p-3 rounded-xl border border-[#414E36]/8 leading-relaxed">
                          {report.description || report.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2.5 border-t border-[#414E36]/8 text-xs text-[#8A9A81] gap-2 flex-wrap">
                      <span className="font-medium text-[11px] sm:text-xs">
                        {report.date || (report.created_at ? new Date(report.created_at).toLocaleDateString() : "Recent")}
                      </span>
                      {report.file_url ? (
                        <a
                          href={report.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#414E36] font-bold hover:underline bg-[#EDF1EC] px-3 py-1.5 rounded-xl transition hover:bg-[#414E36] hover:text-white text-[11px] sm:text-xs"
                        >
                          <span>View Document</span>
                          <ExternalLink size={12} />
                        </a>
                      ) : (
                        <span className="text-[11px] text-gray-400 italic">No file attached</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── Medical Report Upload Modal ── */}
      {showMedicalReportModal && (
        <MedicalReportModal
          setShowMedicalReportModal={setShowMedicalReportModal}
          viewingCustomerProfile={customerFullData || selectedPatientHistory}
          adminRole={doctorName || adminRole || "Doctor"}
          authenticatedJsonHeaders={authHeadersObj}
          setMedicalReports={setMedicalReports}
          lang={lang}
          t={adminTranslations[lang].patients.medicalReportModal}
        />
      )}
    </div>
  );
}
