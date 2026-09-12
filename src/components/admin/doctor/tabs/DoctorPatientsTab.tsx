"use client";

import React from "react";
import { Search, Users, CheckCircle2, Clock, ChevronRight } from "lucide-react";
import { DoctorPatient } from "../types";

interface DoctorPatientsTabProps {
  patientSearchQuery: string;
  setPatientSearchQuery: (q: string) => void;
  doctorPatientsList: DoctorPatient[];
  filteredPatients: DoctorPatient[];
  reservations: any[];
  setSelectedPatientHistory: (patient: DoctorPatient) => void;
  t: any;
}

export default function DoctorPatientsTab({
  patientSearchQuery,
  setPatientSearchQuery,
  doctorPatientsList,
  filteredPatients,
  reservations,
  setSelectedPatientHistory,
  t
}: DoctorPatientsTabProps) {
  return (
    <div className="w-full space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#1F251A]">{t.patientsDirectoryTitle}</h2>
          <p className="text-xs text-[#5A6A51] mt-0.5">
            {t.patientsDirectorySubtitle}
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute start-3 top-3 text-[#5A6A51]" />
            <input
              type="text"
              placeholder={t.searchPatientsPlaceholder}
              value={patientSearchQuery}
              onChange={(e) => setPatientSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-[#414E36]/15 bg-white ps-9 pe-4 py-2 text-xs text-[#1F251A] focus:outline-none focus:ring-2 focus:ring-[#414E36] shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="rounded-2xl sm:rounded-3xl border border-[#414E36]/10 bg-white p-4 sm:p-5 shadow-sm flex items-center gap-3.5 sm:gap-4">
          <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-[#414E36]/10 text-[#414E36] shrink-0">
            <Users size={22} />
          </div>
          <div>
            <p className="text-[11px] sm:text-xs font-bold text-[#5A6A51]">{t.totalAssignedPatients}</p>
            <p className="text-xl sm:text-2xl font-extrabold text-[#1F251A] mt-0.5">{doctorPatientsList.length}</p>
          </div>
        </div>

        <div className="rounded-2xl sm:rounded-3xl border border-[#414E36]/10 bg-white p-4 sm:p-5 shadow-sm flex items-center gap-3.5 sm:gap-4">
          <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 shrink-0">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <p className="text-[11px] sm:text-xs font-bold text-[#5A6A51]">{t.completedPatientVisits}</p>
            <p className="text-xl sm:text-2xl font-extrabold text-[#1F251A] mt-0.5">
              {reservations.filter(r => r.status === "completed").length}
            </p>
          </div>
        </div>

        <div className="rounded-2xl sm:rounded-3xl border border-[#414E36]/10 bg-white p-4 sm:p-5 shadow-sm flex items-center gap-3.5 sm:gap-4">
          <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 shrink-0">
            <Clock size={22} />
          </div>
          <div>
            <p className="text-[11px] sm:text-xs font-bold text-[#5A6A51]">{t.scheduledAndQueue}</p>
            <p className="text-xl sm:text-2xl font-extrabold text-[#1F251A] mt-0.5">
              {reservations.filter(r => r.status !== "completed" && r.status !== "cancelled").length}
            </p>
          </div>
        </div>
      </div>

      {/* Patients List Grid */}
      {filteredPatients.length === 0 ? (
        <div className="rounded-2xl sm:rounded-3xl border border-[#414E36]/10 bg-white p-8 sm:p-12 text-center text-[#5A6A51] space-y-3 shadow-sm">
          <div className="h-12 w-12 sm:h-14 sm:w-14 mx-auto flex items-center justify-center rounded-2xl bg-[#414E36]/10 text-[#414E36]">
            <Users size={24} />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-[#1F251A]">{t.noPatientsFoundTitle}</h3>
          <p className="text-xs text-[#5A6A51] max-w-sm mx-auto">
            {patientSearchQuery ? t.noPatientsSearchDesc : t.noPatientsDesc}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filteredPatients.map((patient) => (
            <div
              key={patient.id}
              onClick={() => setSelectedPatientHistory(patient)}
              className="rounded-2xl sm:rounded-3xl border border-[#414E36]/12 bg-white p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-[#414E36]/40 hover:scale-[1.01] cursor-pointer transition-all flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl bg-[#414E36] text-white font-extrabold text-xs sm:text-sm shadow-sm group-hover:scale-105 transition-transform">
                      {patient.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-[#1F251A] truncate group-hover:text-[#414E36] transition-colors">{patient.name}</h4>
                      <p className="text-[11px] sm:text-xs text-[#5A6A51] truncate font-mono">{patient.phone}</p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-xl bg-[#414E36]/10 px-2 sm:px-2.5 py-1 text-[10px] font-bold text-[#414E36]">
                    {patient.totalVisits} {patient.totalVisits === 1 ? t.visit : t.visits}
                  </span>
                </div>

                {/* Services */}
                <div className="space-y-1">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#5A6A51]/70">{t.servicesReceivedHeader}</p>
                  <div className="flex flex-wrap gap-1">
                    {patient.recentServices.slice(0, 3).map((srv, idx) => (
                      <span key={idx} className="rounded-lg bg-[#F4F5F1] px-2 py-0.5 text-[10px] font-semibold text-[#414E36] truncate max-w-[180px]">
                        {srv}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer / Action */}
              <div className="pt-3 border-t border-[#414E36]/10 flex items-center justify-between text-xs gap-2">
                <span className="text-[10px] sm:text-[11px] text-[#5A6A51] truncate">
                  {t.lastVisitLabel} <strong>{patient.lastVisitDate || "N/A"}</strong>
                </span>
                <div className="shrink-0 rounded-xl bg-[#414E36]/10 group-hover:bg-[#414E36] text-[#414E36] group-hover:text-white px-2.5 sm:px-3.5 py-1.5 font-bold transition flex items-center gap-1 text-[11px] sm:text-xs shadow-xs">
                  <span>{t.viewDetailsBtn}</span>
                  <ChevronRight size={13} className="rtl:rotate-180 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
