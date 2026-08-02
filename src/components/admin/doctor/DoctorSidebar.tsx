"use client";

import React from "react";
import Image from "next/image";
import {
  CalendarDays,
  Stethoscope,
  Users,
  BarChart3,
  Settings,
  RefreshCw,
  LogOut
} from "lucide-react";
import { DoctorTab } from "./types";

interface DoctorSidebarProps {
  activeTab: DoctorTab;
  setActiveTab: (tab: DoctorTab) => void;
  doctorName: string;
  doctorEmail: string;
  doctorPatientsCount: number;
  receptionistStartedSession: boolean;
  activeSessionBooking: any;
  loading: boolean;
  t: any;
  onFetchReservations: () => void;
  onLogout: () => void;
}

export default function DoctorSidebar({
  activeTab,
  setActiveTab,
  doctorName,
  doctorEmail,
  doctorPatientsCount,
  receptionistStartedSession,
  activeSessionBooking,
  loading,
  t,
  onFetchReservations,
  onLogout
}: DoctorSidebarProps) {
  return (
    <aside className="w-full md:w-64 lg:w-72 bg-white/90 backdrop-blur-xl border-b md:border-b-0 md:border-r border-[#414E36]/15 flex flex-col justify-between shrink-0 h-auto md:h-full p-5 shadow-sm overflow-y-auto">
      {/* Top: Logo & Branding */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 pb-5 border-b border-[#414E36]/10">
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl bg-white border border-[#414E36]/20 p-1.5 shadow-sm">
            <Image
              src="/images/main_logo.png"
              alt="Revera Clinics"
              fill
              style={{ objectFit: "contain", padding: "2px" }}
            />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#414E36]">
              {t.portalTitle}
            </span>
            <h1 className="text-sm font-bold text-[#1F251A] truncate max-w-[160px]">{doctorName}</h1>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1.5">
          <p className="px-3 text-[10px] font-extrabold uppercase tracking-widest text-[#5A6A51]/70 mb-2">
            {t.menu}
          </p>

          {/* Tab 1: Schedule */}
          <button
            type="button"
            onClick={() => setActiveTab("schedule")}
            title={t.schedule}
            className={`group relative flex w-full items-center gap-3.5 rounded-2xl px-4 py-3 text-xs font-bold transition-all duration-300 ${
              activeTab === "schedule"
                ? "bg-[#414E36] text-white shadow-md shadow-[#414E36]/25 translate-x-1"
                : "text-[#5A6A51] hover:bg-[#414E36]/10 hover:text-[#414E36] hover:translate-x-0.5"
            }`}
          >
            <CalendarDays size={20} className="shrink-0 transition-transform duration-300 group-hover:scale-110" />
            <span className="tracking-wide text-sm">{t.schedule}</span>
          </button>

          {/* Tab 2: Ongoing Session */}
          <button
            type="button"
            onClick={() => setActiveTab("ongoing")}
            title={t.ongoingSession}
            className={`group relative flex w-full items-center gap-3.5 rounded-2xl px-4 py-3 text-xs font-bold transition-all duration-300 ${
              activeTab === "ongoing"
                ? "bg-[#414E36] text-white shadow-md shadow-[#414E36]/25 translate-x-1"
                : "text-[#5A6A51] hover:bg-[#414E36]/10 hover:text-[#414E36] hover:translate-x-0.5"
            }`}
          >
            <div className="relative">
              <Stethoscope size={20} className="shrink-0 transition-transform duration-300 group-hover:scale-110" />
              {receptionistStartedSession && activeSessionBooking?.status !== "completed" && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                </span>
              )}
            </div>
            <span className="tracking-wide text-sm flex-1 text-left flex items-center justify-between">
              {t.ongoingSession}
              {receptionistStartedSession && activeSessionBooking?.status !== "completed" && (
                <span className="rounded-full bg-amber-400 h-2 w-2"></span>
              )}
            </span>
          </button>

          {/* Tab 3: Patients */}
          <button
            type="button"
            onClick={() => setActiveTab("patients")}
            title={t.patients}
            className={`group relative flex w-full items-center gap-3.5 rounded-2xl px-4 py-3 text-xs font-bold transition-all duration-300 ${
              activeTab === "patients"
                ? "bg-[#414E36] text-white shadow-md shadow-[#414E36]/25 translate-x-1"
                : "text-[#5A6A51] hover:bg-[#414E36]/10 hover:text-[#414E36] hover:translate-x-0.5"
            }`}
          >
            <Users size={20} className="shrink-0 transition-transform duration-300 group-hover:scale-110" />
            <span className="tracking-wide text-sm flex-1 text-left flex items-center justify-between">
              {t.patients}
              <span className="rounded-full bg-[#414E36]/10 px-2 py-0.5 text-[10px] font-bold text-[#414E36] group-hover:bg-white/20 group-hover:text-white">
                {doctorPatientsCount}
              </span>
            </span>
          </button>

          {/* Tab 4: Analytics */}
          <button
            type="button"
            onClick={() => setActiveTab("analytics")}
            title={t.analytics}
            className={`group relative flex w-full items-center gap-3.5 rounded-2xl px-4 py-3 text-xs font-bold transition-all duration-300 ${
              activeTab === "analytics"
                ? "bg-[#414E36] text-white shadow-md shadow-[#414E36]/25 translate-x-1"
                : "text-[#5A6A51] hover:bg-[#414E36]/10 hover:text-[#414E36] hover:translate-x-0.5"
            }`}
          >
            <BarChart3 size={20} className="shrink-0 transition-transform duration-300 group-hover:scale-110" />
            <span className="tracking-wide text-sm">{t.analytics}</span>
          </button>

          {/* Tab 5: Settings */}
          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            title={t.settings}
            className={`group relative flex w-full items-center gap-3.5 rounded-2xl px-4 py-3 text-xs font-bold transition-all duration-300 ${
              activeTab === "settings"
                ? "bg-[#414E36] text-white shadow-md shadow-[#414E36]/25 translate-x-1"
                : "text-[#5A6A51] hover:bg-[#414E36]/10 hover:text-[#414E36] hover:translate-x-0.5"
            }`}
          >
            <Settings size={20} className="shrink-0 transition-transform duration-300 group-hover:scale-110" />
            <span className="tracking-wide text-sm">{t.settings}</span>
          </button>
        </nav>
      </div>

      {/* Bottom: Doctor Profile & Actions */}
      <div className="pt-4 border-t border-[#414E36]/10 space-y-3 mt-4 md:mt-0">
        {/* Doctor Account Card */}
        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          title="View Doctor Profile & Security Settings"
          className={`flex w-full items-center gap-3 rounded-2xl border p-2.5 shadow-sm transition-all text-left group cursor-pointer ${
            activeTab === "profile"
              ? "border-[#414E36] bg-[#414E36]/10"
              : "border-[#414E36]/15 bg-[#F9F9F7] hover:bg-white hover:border-[#414E36]/30"
          }`}
        >
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#414E36] text-white font-black text-xs shadow-md border-2 border-white group-hover:scale-105 transition-transform">
            {(doctorName.replace(/^Dr\.?\s*/i, '') || "D").slice(0, 2).toUpperCase()}
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
          </div>
          <div className="text-left min-w-0 flex-1">
            <p className="text-xs font-black text-[#1F251A] tracking-tight leading-tight truncate group-hover:text-[#414E36]">{doctorName}</p>
            <p className="text-[10px] font-semibold text-[#5A6A51] leading-none mt-0.5 truncate">{doctorEmail}</p>
          </div>
        </button>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onFetchReservations}
            className="flex-1 flex items-center justify-center gap-2 h-9 rounded-xl border border-[#414E36]/15 bg-white text-[#414E36] hover:bg-[#F4F5F1] transition shadow-sm text-xs font-semibold"
            title={t.refresh}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>{t.refresh}</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="flex h-9 w-9 items-center justify-center shrink-0 rounded-xl border border-rose-200 bg-rose-50/60 text-rose-700 hover:bg-rose-100 hover:text-rose-800 transition shadow-sm"
            title={t.signOut}
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
