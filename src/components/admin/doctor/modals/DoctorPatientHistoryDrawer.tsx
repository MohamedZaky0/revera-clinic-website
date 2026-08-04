"use client";

import React, { useState, useEffect } from "react";
import { X, Clock, CheckCircle2, Play, ChevronRight, Pill, FileText, Package, AlertCircle, User, Phone, Mail, Calendar, ShieldAlert, MapPin, Hash, Sparkles } from "lucide-react";
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
  const [customerFullData, setCustomerFullData] = useState<any | null>(null);
  const [loadingCustomerData, setLoadingCustomerData] = useState(false);
  const [activeTab, setActiveTab] = useState<"history" | "medical" | "personal">("history");

  useEffect(() => {
    if (!selectedPatientHistory) {
      setPatientRxList([]);
      setMedicalRecordData(null);
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

    // 2. Check cached medical record or fetch from API
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

  if (!selectedPatientHistory) return null;

  const phoneDisplay = customerFullData?.mobile || selectedPatientHistory.phone || "N/A";
  const emailDisplay = customerFullData?.email || selectedPatientHistory.email || "N/A";
  const genderDisplay = customerFullData?.gender || "Not Specified";
  const dobDisplay = customerFullData?.dob || customerFullData?.date_of_birth || "Not Specified";
  const addressDisplay = customerFullData?.address || "Not Specified";
  const memberSince = customerFullData?.created_at ? customerFullData.created_at.slice(0, 10) : "N/A";

  return (
    <div className="fixed inset-0 z-[105] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm transition-opacity animate-fadeIn">
      {/* Backdrop overlay */}
      <div 
        className="absolute inset-0 cursor-pointer" 
        onClick={() => setSelectedPatientHistory(null)} 
      />

      {/* Full Centered Modal View */}
      <div className="relative w-full max-w-5xl h-[92vh] bg-white rounded-3xl shadow-2xl z-10 flex flex-col overflow-hidden border border-[#414E36]/20 animate-scaleUp">
        
        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between p-6 px-8 border-b border-[#414E36]/10 bg-[#FBFBF9]">
          <div className="flex items-center gap-5">
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#414E36] text-white font-black text-2xl shadow-md border-2 border-white">
              {(selectedPatientHistory.name || "P").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-extrabold text-[#1F251A]">
                  {selectedPatientHistory.name}
                </h2>
                <span className="rounded-full bg-[#414E36]/10 px-3 py-1 text-xs font-extrabold text-[#414E36]">
                  {selectedPatientHistory.totalVisits} {selectedPatientHistory.totalVisits === 1 ? t.visit : t.visits}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-[#5A6A51] mt-1">
                <span className="flex items-center gap-1.5 font-mono font-medium">
                  <Phone size={14} className="text-[#414E36]" /> {phoneDisplay}
                </span>
                {emailDisplay !== "N/A" && (
                  <span className="flex items-center gap-1.5 font-medium">
                    <Mail size={14} className="text-[#414E36]" /> {emailDisplay}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSelectedPatientHistory(null)}
            className="rounded-2xl p-3 text-[#5A6A51] hover:bg-[#414E36]/10 hover:text-[#414E36] transition"
            title={t.closeDrawerBtn}
          >
            <X size={22} />
          </button>
        </div>

        {/* 3 Sub-Navigation Tabs */}
        <div className="flex items-center bg-[#FBFBF9] px-8 border-b border-[#414E36]/10 gap-3">
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`py-4 px-6 text-sm font-bold border-b-2 transition flex items-center gap-2.5 ${
              activeTab === "history"
                ? "border-[#414E36] text-[#414E36] bg-white rounded-t-2xl shadow-xs"
                : "border-transparent text-[#5A6A51] hover:text-[#1F251A]"
            }`}
          >
            <Clock size={16} />
            <span>Clinical History & Visits ({selectedPatientHistory.bookings.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("medical")}
            className={`py-4 px-6 text-sm font-bold border-b-2 transition flex items-center gap-2.5 ${
              activeTab === "medical"
                ? "border-[#414E36] text-[#414E36] bg-white rounded-t-2xl shadow-xs"
                : "border-transparent text-[#5A6A51] hover:text-[#1F251A]"
            }`}
          >
            <ShieldAlert size={16} />
            <span>Medical Record & Intake</span>
            {medicalRecordData?.allergies && (
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("personal")}
            className={`py-4 px-6 text-sm font-bold border-b-2 transition flex items-center gap-2.5 ${
              activeTab === "personal"
                ? "border-[#414E36] text-[#414E36] bg-white rounded-t-2xl shadow-xs"
                : "border-transparent text-[#5A6A51] hover:text-[#1F251A]"
            }`}
          >
            <User size={16} />
            <span>Personal Info</span>
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-[#F4F5F1]/30">
          
          {/* Quick Doctor Summary Banner */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 rounded-3xl bg-white p-5 border border-[#414E36]/10 text-sm shadow-xs">
            <div>
              <span className="text-xs font-bold text-[#5A6A51] uppercase tracking-wider block mb-1">{t.completedPatientVisits}</span>
              <p className="font-extrabold text-[#1F251A] text-base">{selectedPatientHistory.totalVisits} {t.sessionsUnit}</p>
            </div>
            <div>
              <span className="text-xs font-bold text-[#5A6A51] uppercase tracking-wider block mb-1">{t.lastVisitLabel}</span>
              <p className="font-extrabold text-[#414E36] text-base">{selectedPatientHistory.lastVisitDate || "N/A"}</p>
            </div>
            <div className="col-span-2 md:col-span-1">
              <span className="text-xs font-bold text-[#5A6A51] uppercase tracking-wider block mb-1">{t.servicesReceivedHeader}</span>
              <p className="font-bold text-[#1F251A] text-base truncate">{selectedPatientHistory.recentServices.join(", ") || "General Consultation"}</p>
            </div>
          </div>

          {/* TAB 1: CLINICAL HISTORY & VISITS */}
          {activeTab === "history" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-2 border-b border-[#414E36]/10">
                <h3 className="text-sm font-extrabold text-[#1F251A] uppercase tracking-wider flex items-center gap-2">
                  <Clock size={18} className="text-[#414E36]" /> {t.patientHistoryDrawerTitle}
                </h3>
                <span className="text-xs font-bold text-[#414E36] bg-[#414E36]/10 px-3 py-1 rounded-full">
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
                    className="rounded-3xl border border-[#414E36]/15 bg-white p-6 space-y-5 shadow-xs hover:border-[#414E36]/40 transition"
                  >
                    {/* Visit Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#414E36]/10 pb-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#414E36] text-white font-black text-xs shadow-xs">
                          #{selectedPatientHistory.bookings.length - idx}
                        </span>
                        <div>
                          <span className="text-sm font-bold text-[#1F251A]">
                            {booking.date || "Date Unspecified"} • {booking.time || booking.time_slot || "Time Unspecified"}
                          </span>
                          <p className="text-xs text-[#5A6A51] font-semibold mt-0.5">
                            {booking.service || booking.service_name || "Clinical Session"} • <span className="text-[#414E36] font-extrabold">{booking.room || booking.room_name || "Treatment Room"}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {isCompleted && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800">
                            <CheckCircle2 size={13} /> {t.completedStatus}
                          </span>
                        )}
                        {isInSession && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-bold text-amber-800 animate-pulse">
                            <Play size={13} /> {t.inSessionStatus}
                          </span>
                        )}
                        {!isCompleted && !isInSession && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 capitalize">
                            {booking.status || "Scheduled"}
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPatientHistory(null);
                            handleOpenScheduleModal(booking);
                          }}
                          className="rounded-2xl border border-[#414E36]/20 bg-white px-4 py-1.5 text-xs font-bold text-[#414E36] hover:bg-[#414E36] hover:text-white transition shadow-xs flex items-center gap-1.5"
                        >
                          <span>{t.inspectBtn}</span>
                          <ChevronRight size={14} className="rtl:rotate-180 transition-transform" />
                        </button>
                      </div>
                    </div>

                    {/* Issued Digital Prescription for this visit */}
                    {matchingRx && (
                      <div className="bg-[#FBFBF9] p-4 rounded-2xl border border-[#414E36]/10 space-y-2.5 text-xs">
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
                              <div key={mIdx} className="bg-white p-2.5 rounded-xl text-xs flex justify-between gap-3 border border-gray-200">
                                <span className="font-bold text-[#1F251A]">{m.name}</span>
                                <span className="text-[#5A6A51] font-mono font-medium">{m.dosage} • {m.frequency} • {m.duration}</span>
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
                      <span className="text-xs font-extrabold uppercase tracking-wider text-[#5A6A51] flex items-center gap-1.5">
                        <FileText size={14} /> {t.doctorNotesTitle}:
                      </span>
                      <p className="text-sm text-[#1F251A] bg-[#FBFBF9] p-4 rounded-2xl border border-[#414E36]/10 font-sans leading-relaxed">
                        {parsed.cleanDoctorNote || t.noBookingNotes}
                      </p>
                    </div>

                    {/* Session Consumables Log */}
                    {parsed.productsLog && (
                      <div className="text-xs font-medium text-[#374151] bg-[#F7F7F9] p-3 rounded-2xl border border-gray-200 flex items-center gap-2">
                        <Package size={15} className="text-[#414E36] shrink-0" />
                        <span>{parsed.productsLog.replace(/^\[Products Used During Session\]:\s*/i, "Consumables Used: ")}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: MEDICAL RECORD & INTAKE */}
          {activeTab === "medical" && (
            <div className="space-y-6">
              <div className="rounded-3xl bg-white p-7 border border-[#414E36]/15 space-y-6 shadow-xs">
                <div className="flex items-center justify-between border-b border-[#414E36]/10 pb-4">
                  <h3 className="text-base font-extrabold text-[#1F251A] uppercase tracking-wider flex items-center gap-2.5">
                    <ShieldAlert size={20} className="text-[#414E36]" /> {t.patientMedicalRecordTitle}
                  </h3>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
                    <CheckCircle2 size={13} /> {t.onFileStatus}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
                  <div className="bg-[#FBFBF9] p-5 rounded-2xl border border-[#414E36]/10">
                    <span className="text-xs font-bold text-[#5A6A51] uppercase tracking-wider block mb-1.5">{t.skinTypeLabel}</span>
                    <span className="font-extrabold text-[#1F251A] text-base">{medicalRecordData?.skin_type || 'Normal / Unspecified'}</span>
                  </div>

                  <div className="bg-rose-50/70 p-5 rounded-2xl border border-rose-200">
                    <span className="text-xs font-bold text-rose-700 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                      <AlertCircle size={14} /> {t.allergiesLabel}
                    </span>
                    <span className="font-extrabold text-rose-800 text-base">{medicalRecordData?.allergies || 'No known allergies'}</span>
                  </div>

                  <div className="bg-[#FBFBF9] p-5 rounded-2xl border border-[#414E36]/10 col-span-1 md:col-span-2">
                    <span className="text-xs font-bold text-[#5A6A51] uppercase tracking-wider block mb-1.5">{t.currentMedicationLabel}</span>
                    <span className="font-semibold text-[#1F251A] text-sm leading-relaxed">{medicalRecordData?.medication_details || 'None reported'}</span>
                  </div>

                  <div className="bg-[#FBFBF9] p-5 rounded-2xl border border-[#414E36]/10 col-span-1 md:col-span-2">
                    <span className="text-xs font-bold text-[#5A6A51] uppercase tracking-wider block mb-1.5">{t.medicalConditionsLabel}</span>
                    <span className="font-semibold text-[#1F251A] text-sm leading-relaxed">{medicalRecordData?.medical_conditions_details || 'None reported'}</span>
                  </div>

                  <div className="bg-[#FBFBF9] p-5 rounded-2xl border border-[#414E36]/10 col-span-1 md:col-span-2">
                    <span className="text-xs font-bold text-[#5A6A51] uppercase tracking-wider block mb-1.5">{t.previousTreatmentsLabel || "Previous Treatments & Procedures"}</span>
                    <span className="font-semibold text-[#1F251A] text-sm leading-relaxed">{medicalRecordData?.previous_treatments_details || 'None reported'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PERSONAL INFO (Patient Personal Details Profile) */}
          {activeTab === "personal" && (
            <div className="space-y-6">
              <div className="rounded-3xl bg-white p-7 border border-[#414E36]/15 space-y-6 shadow-xs">
                <div className="flex items-center justify-between border-b border-[#414E36]/10 pb-4">
                  <h3 className="text-base font-extrabold text-[#1F251A] uppercase tracking-wider flex items-center gap-2.5">
                    <User size={20} className="text-[#414E36]" /> Patient Personal Profile
                  </h3>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#414E36]/10 px-3 py-1 text-xs font-bold text-[#414E36]">
                    ID: #{selectedPatientHistory.id}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
                  <div className="bg-[#FBFBF9] p-5 rounded-2xl border border-[#414E36]/10">
                    <span className="text-xs font-bold text-[#5A6A51] uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                      <User size={13} className="text-[#414E36]" /> Full Name
                    </span>
                    <span className="font-extrabold text-[#1F251A] text-base">{selectedPatientHistory.name}</span>
                  </div>

                  <div className="bg-[#FBFBF9] p-5 rounded-2xl border border-[#414E36]/10">
                    <span className="text-xs font-bold text-[#5A6A51] uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                      <Phone size={13} className="text-[#414E36]" /> Mobile Phone
                    </span>
                    <span className="font-mono font-extrabold text-[#1F251A] text-base">{phoneDisplay}</span>
                  </div>

                  <div className="bg-[#FBFBF9] p-5 rounded-2xl border border-[#414E36]/10">
                    <span className="text-xs font-bold text-[#5A6A51] uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                      <Mail size={13} className="text-[#414E36]" /> Email Address
                    </span>
                    <span className="font-semibold text-[#1F251A] text-sm">{emailDisplay}</span>
                  </div>

                  <div className="bg-[#FBFBF9] p-5 rounded-2xl border border-[#414E36]/10">
                    <span className="text-xs font-bold text-[#5A6A51] uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                      <Sparkles size={13} className="text-[#414E36]" /> Gender
                    </span>
                    <span className="font-bold text-[#1F251A] text-sm capitalize">{genderDisplay}</span>
                  </div>

                  <div className="bg-[#FBFBF9] p-5 rounded-2xl border border-[#414E36]/10">
                    <span className="text-xs font-bold text-[#5A6A51] uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                      <Calendar size={13} className="text-[#414E36]" /> Date of Birth / Age
                    </span>
                    <span className="font-bold text-[#1F251A] text-sm">{dobDisplay}</span>
                  </div>

                  <div className="bg-[#FBFBF9] p-5 rounded-2xl border border-[#414E36]/10">
                    <span className="text-xs font-bold text-[#5A6A51] uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                      <MapPin size={13} className="text-[#414E36]" /> Address / Location
                    </span>
                    <span className="font-semibold text-[#1F251A] text-sm">{addressDisplay}</span>
                  </div>

                  <div className="bg-[#FBFBF9] p-5 rounded-2xl border border-[#414E36]/10">
                    <span className="text-xs font-bold text-[#5A6A51] uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                      <Calendar size={13} className="text-[#414E36]" /> Registration Date
                    </span>
                    <span className="font-bold text-[#1F251A] text-sm">{memberSince}</span>
                  </div>

                  <div className="bg-[#FBFBF9] p-5 rounded-2xl border border-[#414E36]/10">
                    <span className="text-xs font-bold text-[#5A6A51] uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                      <Hash size={13} className="text-[#414E36]" /> Total Clinic Visits
                    </span>
                    <span className="font-extrabold text-[#414E36] text-base">{selectedPatientHistory.totalVisits} Completed Visits</span>
                  </div>
                </div>

                {customerFullData?.notes && (
                  <div className="bg-[#FBFBF9] p-5 rounded-2xl border border-[#414E36]/10">
                    <span className="text-xs font-bold text-[#5A6A51] uppercase tracking-wider block mb-1.5">Internal Patient Notes</span>
                    <p className="text-sm text-[#1F251A] leading-relaxed">{customerFullData.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-5 px-8 bg-[#FBFBF9] border-t border-[#414E36]/10 flex items-center justify-between text-sm text-[#5A6A51]">
          <span className="font-medium">{selectedPatientHistory.name} • Clinical Profile</span>
          <button
            type="button"
            onClick={() => setSelectedPatientHistory(null)}
            className="rounded-2xl bg-[#414E36] px-6 py-2.5 font-bold text-white shadow-md hover:bg-[#343F2B] transition"
          >
            {t.closeTimelineBtn}
          </button>
        </div>
      </div>
    </div>
  );
}
