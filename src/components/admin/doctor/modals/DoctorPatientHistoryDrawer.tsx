"use client";

import React from "react";
import { X, Clock, CheckCircle2, Play, ChevronRight } from "lucide-react";
import { DoctorPatient } from "../types";
import { parseBookingNotes } from "../utils";

interface DoctorPatientHistoryDrawerProps {
  selectedPatientHistory: DoctorPatient | null;
  setSelectedPatientHistory: (patient: DoctorPatient | null) => void;
  handleOpenScheduleModal: (booking: any) => void;
  t: any;
}

export default function DoctorPatientHistoryDrawer({
  selectedPatientHistory,
  setSelectedPatientHistory,
  handleOpenScheduleModal,
  t
}: DoctorPatientHistoryDrawerProps) {
  if (!selectedPatientHistory) return null;

  return (
    <div className="fixed inset-0 z-[105] flex justify-end bg-black/50 backdrop-blur-sm transition-opacity animate-fadeIn">
      {/* Backdrop overlay */}
      <div 
        className="absolute inset-0 cursor-pointer" 
        onClick={() => setSelectedPatientHistory(null)} 
      />

      {/* Right Drawer Container */}
      <div className="relative w-full max-w-2xl h-full bg-white shadow-2xl z-10 flex flex-col overflow-hidden border-l border-[#414E36]/15 animate-slideLeft">
        
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-5 px-6 border-b border-[#414E36]/10 bg-[#FBFBF9]">
          <div className="flex items-center gap-3.5">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#414E36] text-white font-black text-base shadow-md border-2 border-white">
              {(selectedPatientHistory.name || "P").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-[#1F251A]">
                  {selectedPatientHistory.name}
                </h3>
                <span className="rounded-full bg-[#414E36]/10 px-2.5 py-0.5 text-[10px] font-extrabold text-[#414E36]">
                  {selectedPatientHistory.totalVisits} {selectedPatientHistory.totalVisits === 1 ? t.visit : t.visits}
                </span>
              </div>
              <p className="text-xs text-[#5A6A51] mt-0.5 font-mono">
                Phone: {selectedPatientHistory.phone || "N/A"} {selectedPatientHistory.email ? `• ${selectedPatientHistory.email}` : ""}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSelectedPatientHistory(null)}
            className="rounded-2xl p-2.5 text-[#5A6A51] hover:bg-[#414E36]/10 hover:text-[#414E36] transition"
            title={t.closeDrawerBtn}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content: Patient Overview & All Visits Timeline */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Patient Quick Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-2xl bg-[#F4F5F1] p-4 border border-[#414E36]/10 text-xs">
            <div>
              <span className="text-[10px] font-bold text-[#5A6A51] uppercase">{t.completedPatientVisits}</span>
              <p className="font-extrabold text-[#1F251A] mt-0.5">{selectedPatientHistory.totalVisits} {t.sessionsUnit}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#5A6A51] uppercase">{t.lastVisitLabel}</span>
              <p className="font-extrabold text-[#414E36] mt-0.5">{selectedPatientHistory.lastVisitDate || "N/A"}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#5A6A51] uppercase">{t.servicesReceivedHeader}</span>
              <p className="font-bold text-[#1F251A] mt-0.5 truncate">{selectedPatientHistory.recentServices.join(", ") || "General"}</p>
            </div>
          </div>

          {/* Complete Visits Timeline List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#414E36]/10">
              <h4 className="text-xs font-extrabold text-[#1F251A] uppercase tracking-wider flex items-center gap-2">
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

              return (
                <div
                  key={booking.id || idx}
                  className="rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] p-5 space-y-3 shadow-sm hover:border-[#414E36]/30 transition"
                >
                  {/* Visit Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#414E36]/10 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#414E36] text-white font-extrabold text-xs">
                        #{selectedPatientHistory.bookings.length - idx}
                      </span>
                      <div>
                        <span className="text-xs font-black text-[#1F251A]">
                          {booking.date || "Date Unspecified"} • {booking.time || booking.time_slot || "Time Unspecified"}
                        </span>
                        <p className="text-[11px] text-[#5A6A51] font-bold">
                          {booking.service || booking.service_name || "Clinical Session"} • <span className="text-[#414E36]">{booking.room || booking.room_name || "Treatment Room"}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isCompleted && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                          <CheckCircle2 size={11} /> {t.completedStatus}
                        </span>
                      )}
                      {isInSession && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 animate-pulse">
                          <Play size={11} /> {t.inSessionStatus}
                        </span>
                      )}
                      {!isCompleted && !isInSession && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700 capitalize">
                          {booking.status || "Scheduled"}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPatientHistory(null);
                          handleOpenScheduleModal(booking);
                        }}
                        className="rounded-xl border border-[#414E36]/20 bg-white px-3 py-1 text-xs font-bold text-[#414E36] hover:bg-[#414E36] hover:text-white transition shadow-sm flex items-center gap-1"
                      >
                        <span>{t.inspectBtn}</span>
                        <ChevronRight size={12} className="rtl:rotate-180 transition-transform" />
                      </button>
                    </div>
                  </div>

                  {/* Doctor Notes for this specific visit */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#5A6A51]">{t.doctorNotesTitle}:</span>
                    <p className="text-xs text-[#1F251A] mt-1 bg-white p-3 rounded-xl border border-[#414E36]/10 font-sans leading-relaxed">
                      {parsed.cleanDoctorNote || t.noBookingNotes}
                    </p>
                  </div>

                  {/* System Callout summary if products/invoice present */}
                  {parsed.productsLog && (
                    <div className="text-[11px] font-mono text-emerald-800 bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200/60">
                      {parsed.productsLog.replace(/^\[Products Used During Session\]:\s*/i, "Consumables Used: ")}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 px-6 bg-[#FBFBF9] border-t border-[#414E36]/10 flex items-center justify-between text-xs text-[#5A6A51]">
          <span>{t.patientHistoryDrawerTitle}</span>
          <button
            type="button"
            onClick={() => setSelectedPatientHistory(null)}
            className="rounded-xl bg-[#414E36] px-4 py-2 font-bold text-white shadow-sm hover:bg-[#343F2B] transition"
          >
            {t.closeTimelineBtn}
          </button>
        </div>
      </div>
    </div>
  );
}
