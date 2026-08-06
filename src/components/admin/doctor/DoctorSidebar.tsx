"use client";

import React from "react";
import Image from "next/image";
import {
  CalendarDays,
  Stethoscope,
  Users,
  BarChart3,
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
  lang: "en" | "ar";
  setLang: (lang: "en" | "ar") => void;
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
  lang,
  setLang,
  onFetchReservations,
  onLogout
}: DoctorSidebarProps) {
  return (
    <aside className="w-full md:w-[280px] bg-[#414E36] text-[#FBFBF9] flex flex-col justify-between shrink-0 h-auto md:h-screen sticky top-0 px-6 py-8 shadow-[0_0_70px_rgba(0,0,0,0.08)] overflow-y-auto">
      {/* Top: Logo & Branding */}
      <div className="space-y-6">
        {/* Logo Header */}
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-white shadow-md p-2">
            <Image
              src="/images/main_logo.png"
              alt="Revera Clinics"
              fill
              style={{ objectFit: "contain", padding: "4px" }}
            />
          </div>
          <div className="flex flex-col justify-center min-w-0">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#FBFBF9]/60 leading-none mb-1">
              Revera Clinics
            </p>
            <h1 className="text-lg font-bold text-[#FBFBF9] leading-tight truncate">
              {t.portalTitle}
            </h1>
          </div>
        </div>

        {/* Global Language Toggle Switcher */}
        <div className="flex items-center rounded-2xl bg-black/20 p-1 border border-white/10 shadow-inner w-full">
          <button
            type="button"
            onClick={() => setLang("en")}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition text-center ${
              lang === "en"
                ? "bg-[#FBFBF9] text-[#414E36] shadow-sm"
                : "text-[#FBFBF9]/70 hover:text-white hover:bg-white/10"
            }`}
          >
            {t.englishViewBtn}
          </button>
          <button
            type="button"
            onClick={() => setLang("ar")}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition text-center ${
              lang === "ar"
                ? "bg-[#FBFBF9] text-[#414E36] shadow-sm"
                : "text-[#FBFBF9]/70 hover:text-white hover:bg-white/10"
            }`}
          >
            {t.arabicViewBtn}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1.5">
          <p className="px-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#FBFBF9]/50 mb-2">
            {t.menu}
          </p>

          {/* Tab 1: Schedule */}
          <button
            type="button"
            onClick={() => setActiveTab("schedule")}
            title={t.schedule}
            className={`group flex w-full items-center gap-3.5 rounded-3xl px-4 py-3 text-xs font-semibold transition-all duration-200 ${
              activeTab === "schedule"
                ? "bg-[#FBFBF9] text-[#414E36] shadow-lg font-bold"
                : "text-[#FBFBF9]/80 hover:bg-[#FBFBF9]/10 hover:text-[#FBFBF9]"
            }`}
          >
            <div
              className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl transition ${
                activeTab === "schedule"
                  ? "bg-[#414E36]/10 text-[#414E36]"
                  : "bg-white/10 text-[#FBFBF9] group-hover:bg-white/20"
              }`}
            >
              <CalendarDays size={18} />
            </div>
            <span className="tracking-wide text-sm">{t.schedule}</span>
          </button>

          {/* Tab 2: Ongoing Session */}
          <button
            type="button"
            onClick={() => setActiveTab("ongoing")}
            title={t.ongoingSession}
            className={`group flex w-full items-center justify-between gap-3.5 rounded-3xl px-4 py-3 text-xs font-semibold transition-all duration-200 ${
              activeTab === "ongoing"
                ? "bg-[#FBFBF9] text-[#414E36] shadow-lg font-bold"
                : "text-[#FBFBF9]/80 hover:bg-[#FBFBF9]/10 hover:text-[#FBFBF9]"
            }`}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div
                className={`relative inline-flex h-9 w-9 items-center justify-center rounded-2xl transition ${
                  activeTab === "ongoing"
                    ? "bg-[#414E36]/10 text-[#414E36]"
                    : "bg-white/10 text-[#FBFBF9] group-hover:bg-white/20"
                }`}
              >
                <Stethoscope size={18} />
                {receptionistStartedSession && activeSessionBooking?.status !== "completed" && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                  </span>
                )}
              </div>
              <span className="tracking-wide text-sm truncate">{t.ongoingSession}</span>
            </div>
            {receptionistStartedSession && activeSessionBooking?.status !== "completed" && (
              <span className="rounded-full bg-amber-400 h-2 w-2 shrink-0"></span>
            )}
          </button>

          {/* Tab 3: Patients */}
          <button
            type="button"
            onClick={() => setActiveTab("patients")}
            title={t.patients}
            className={`group flex w-full items-center justify-between gap-3.5 rounded-3xl px-4 py-3 text-xs font-semibold transition-all duration-200 ${
              activeTab === "patients"
                ? "bg-[#FBFBF9] text-[#414E36] shadow-lg font-bold"
                : "text-[#FBFBF9]/80 hover:bg-[#FBFBF9]/10 hover:text-[#FBFBF9]"
            }`}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div
                className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl transition ${
                  activeTab === "patients"
                    ? "bg-[#414E36]/10 text-[#414E36]"
                    : "bg-white/10 text-[#FBFBF9] group-hover:bg-white/20"
                }`}
              >
                <Users size={18} />
              </div>
              <span className="tracking-wide text-sm truncate">{t.patients}</span>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                activeTab === "patients"
                  ? "bg-[#414E36]/15 text-[#414E36]"
                  : "bg-white/15 text-[#FBFBF9]"
              }`}
            >
              {doctorPatientsCount}
            </span>
          </button>

          {/* Tab 4: Analytics */}
          <button
            type="button"
            onClick={() => setActiveTab("analytics")}
            title={t.analytics}
            className={`group flex w-full items-center gap-3.5 rounded-3xl px-4 py-3 text-xs font-semibold transition-all duration-200 ${
              activeTab === "analytics"
                ? "bg-[#FBFBF9] text-[#414E36] shadow-lg font-bold"
                : "text-[#FBFBF9]/80 hover:bg-[#FBFBF9]/10 hover:text-[#FBFBF9]"
            }`}
          >
            <div
              className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl transition ${
                activeTab === "analytics"
                  ? "bg-[#414E36]/10 text-[#414E36]"
                  : "bg-white/10 text-[#FBFBF9] group-hover:bg-white/20"
              }`}
            >
              <BarChart3 size={18} />
            </div>
            <span className="tracking-wide text-sm">{t.analytics}</span>
          </button>
        </nav>
      </div>

      {/* Bottom: Doctor Profile & Actions */}
      <div className="pt-4 border-t border-white/10 space-y-3 mt-6">
        {/* Doctor Account Card */}
        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          title="View Doctor Profile & Security Settings"
          className={`flex w-full items-center gap-3 rounded-2xl p-3 transition-all text-left group cursor-pointer ${
            activeTab === "profile"
              ? "bg-[#FBFBF9] text-[#414E36] shadow-md"
              : "bg-black/20 text-[#FBFBF9] border border-white/10 hover:bg-white/10"
          }`}
        >
          <div
            className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl font-bold text-xs shadow-xs transition-transform group-hover:scale-105 ${
              activeTab === "profile"
                ? "bg-[#414E36] text-[#FBFBF9]"
                : "bg-[#FBFBF9] text-[#414E36]"
            }`}
          >
            {(doctorName.replace(/^Dr\.?\s*/i, '') || "D").slice(0, 2).toUpperCase()}
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-[#414E36]" />
          </div>
          <div className="text-left min-w-0 flex-1">
            <p
              className={`text-xs font-bold tracking-tight leading-tight truncate ${
                activeTab === "profile" ? "text-[#414E36]" : "text-[#FBFBF9]"
              }`}
            >
              {doctorName}
            </p>
            <p
              className={`text-[10px] font-medium leading-none mt-0.5 truncate ${
                activeTab === "profile" ? "text-[#414E36]/70" : "text-[#FBFBF9]/60"
              }`}
            >
              {doctorEmail}
            </p>
          </div>
        </button>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 h-9 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 hover:text-white transition text-xs font-semibold"
            title={t.signOut}
          >
            <LogOut size={15} />
            <span>{t.signOut}</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
