"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  CalendarDays,
  Stethoscope,
  Settings,
  LogOut,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  FileText,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  MapPin,
  Search,
  Plus,
  Play,
  Check,
  UserCheck,
  Lock,
  Bell,
  Award,
  DollarSign
} from "lucide-react";

interface DoctorAccountViewProps {
  doctorName?: string;
  doctorEmail?: string;
  doctorBranch?: string;
  onLogout: () => void;
}

type DoctorTab = "schedule" | "ongoing" | "settings";

export default function DoctorAccountView({
  doctorName = "Dr. Clinic Provider",
  doctorEmail = "doctor@revera.com",
  doctorBranch = "Main Branch",
  onLogout
}: DoctorAccountViewProps) {
  const [activeTab, setActiveTab] = useState<DoctorTab>("schedule");

  // Sample schedule state
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSessionPatient, setActiveSessionPatient] = useState<any>({
    name: "Sarah Johnson",
    age: 29,
    service: "HydraFacial Deluxe + Laser Therapy",
    time: "10:30 AM - 11:30 AM",
    room: "Room 102",
    status: "In Progress",
    notes: "Patient requested extra hydration serum. Previous treatment 3 weeks ago.",
    medicalAlerts: ["Sensitive Skin", "No Aspirin"]
  });

  return (
    <div className="min-h-screen bg-[#F4F5F1] text-[#1F251A] font-sans flex flex-col">
      {/* ── TOP HEADER & FLOATING NAVIGATION BAR ── */}
      <header className="sticky top-0 z-50 w-full bg-[#F4F5F1]/80 backdrop-blur-md px-6 py-4 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Left: Brand Logo & Doctor Badge */}
          <div className="flex items-center gap-3">
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl bg-[#414E36] p-2 shadow-md">
              <Image
                src="/images/main_logo.png"
                alt="Revera Clinics"
                fill
                style={{ objectFit: "contain", padding: "2px" }}
              />
            </div>
            <div className="hidden sm:flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-extrabold uppercase tracking-widest text-[#414E36]">
                  Doctor Portal
                </span>
                <span className="inline-flex items-center rounded-md bg-[#414E36]/10 px-2 py-0.5 text-[10px] font-bold text-[#414E36]">
                  <MapPin size={10} className="mr-1 inline" />
                  {doctorBranch}
                </span>
              </div>
              <h1 className="text-sm font-bold text-[#1F251A]">{doctorName}</h1>
            </div>
          </div>

          {/* ── CENTER FLOATING NAV BAR (ICON-ONLY WHEN UNSELECTED, EXPANDS ON CLICK) ── */}
          <nav className="flex items-center justify-center">
            <div className="flex items-center gap-1.5 rounded-full border border-[#414E36]/20 bg-white/90 p-1.5 shadow-[0_12px_40px_rgba(65,78,54,0.1)] backdrop-blur-2xl transition-all duration-300 hover:border-[#414E36]/40 hover:shadow-[0_16px_50px_rgba(65,78,54,0.16)]">
              
              {/* Tab 1: Schedule */}
              <button
                type="button"
                onClick={() => setActiveTab("schedule")}
                title="Schedule"
                className={`group relative flex items-center justify-center rounded-full transition-all duration-300 ease-out ${
                  activeTab === "schedule"
                    ? "bg-[#414E36] px-5 py-2.5 text-white shadow-md shadow-[#414E36]/30 font-bold text-xs gap-2"
                    : "px-3.5 py-2.5 text-[#5A6A51] hover:bg-[#414E36]/10 hover:text-[#414E36]"
                }`}
              >
                <CalendarDays size={18} className="shrink-0 transition-transform duration-300 group-hover:scale-110" />
                {activeTab === "schedule" && (
                  <span className="animate-fadeIn whitespace-nowrap tracking-wide">Schedule</span>
                )}
              </button>

              {/* Tab 2: Ongoing Session */}
              <button
                type="button"
                onClick={() => setActiveTab("ongoing")}
                title="Ongoing Session"
                className={`group relative flex items-center justify-center rounded-full transition-all duration-300 ease-out ${
                  activeTab === "ongoing"
                    ? "bg-[#414E36] px-5 py-2.5 text-white shadow-md shadow-[#414E36]/30 font-bold text-xs gap-2"
                    : "px-3.5 py-2.5 text-[#5A6A51] hover:bg-[#414E36]/10 hover:text-[#414E36]"
                }`}
              >
                <Stethoscope size={18} className="shrink-0 transition-transform duration-300 group-hover:scale-110" />
                {activeTab === "ongoing" && (
                  <span className="animate-fadeIn whitespace-nowrap tracking-wide">Ongoing Session</span>
                )}
              </button>

              {/* Tab 3: Settings */}
              <button
                type="button"
                onClick={() => setActiveTab("settings")}
                title="Settings"
                className={`group relative flex items-center justify-center rounded-full transition-all duration-300 ease-out ${
                  activeTab === "settings"
                    ? "bg-[#414E36] px-5 py-2.5 text-white shadow-md shadow-[#414E36]/30 font-bold text-xs gap-2"
                    : "px-3.5 py-2.5 text-[#5A6A51] hover:bg-[#414E36]/10 hover:text-[#414E36]"
                }`}
              >
                <Settings size={18} className="shrink-0 transition-transform duration-300 group-hover:scale-110" />
                {activeTab === "settings" && (
                  <span className="animate-fadeIn whitespace-nowrap tracking-wide">Settings</span>
                )}
              </button>

            </div>
          </nav>

          {/* Right: Quick Doctor Profile & Logout */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 rounded-2xl bg-white border border-[#414E36]/15 px-3 py-1.5 shadow-sm">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#414E36]/10 text-[#414E36] font-bold text-xs">
                Dr
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-[#1F251A] leading-none">{doctorName}</p>
                <p className="text-[10px] text-[#5A6A51] font-medium mt-0.5">{doctorEmail}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onLogout}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50/60 text-rose-700 hover:bg-rose-100 hover:text-rose-800 transition shadow-sm"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>

        </div>
      </header>

      {/* ── MAIN CONTENT AREA ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6 animate-fadeIn">
        
        {/* ── TAB 1: SCHEDULE VIEW ── */}
        {activeTab === "schedule" && (
          <div className="space-y-6">
            
            {/* Header Title & Date Picker */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-[#1F251A]">Today&apos;s Appointments & Patient Queue</h2>
                <p className="text-xs text-[#5A6A51] mt-1">
                  Manage your daily clinic shift schedule, patient arrivals, and treatment progress.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-3 text-[#5A6A51]" />
                  <input
                    type="text"
                    placeholder="Search patient name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="rounded-2xl border border-[#414E36]/15 bg-white pl-9 pr-4 py-2 text-xs text-[#1F251A] focus:outline-none focus:ring-2 focus:ring-[#414E36]"
                  />
                </div>

                <div className="flex items-center gap-2 rounded-2xl border border-[#414E36]/15 bg-white px-4 py-2 text-xs font-bold text-[#414E36] shadow-sm">
                  <Clock size={14} />
                  <span>Today ({new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})</span>
                </div>
              </div>
            </div>

            {/* Quick Status Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-3xl border border-[#414E36]/10 bg-white p-4 shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-[#5A6A51]">Scheduled Today</span>
                <div className="mt-2 text-2xl font-extrabold text-[#1F251A]">6 Patients</div>
              </div>
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Completed</span>
                <div className="mt-2 text-2xl font-extrabold text-emerald-800">2 Sessions</div>
              </div>
              <div className="rounded-3xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700">In Treatment</span>
                <div className="mt-2 text-2xl font-extrabold text-amber-800">1 Active</div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50/50 p-4 shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Upcoming Queue</span>
                <div className="mt-2 text-2xl font-extrabold text-slate-700">3 Waiting</div>
              </div>
            </div>

            {/* Patients Schedule Table */}
            <div className="overflow-hidden rounded-[32px] border border-[#414E36]/10 bg-white shadow-[0_20px_50px_rgba(47,61,41,0.05)]">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#414E36]/10 bg-[#FBFBF9] text-xs uppercase tracking-wider text-[#5A6A51]">
                    <tr>
                      <th className="px-6 py-4 font-bold">Time Slot</th>
                      <th className="px-6 py-4 font-bold">Patient Name</th>
                      <th className="px-6 py-4 font-bold">Requested Service</th>
                      <th className="px-6 py-4 font-bold">Room</th>
                      <th className="px-6 py-4 font-bold text-center">Status</th>
                      <th className="px-6 py-4 font-bold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#414E36]/05 text-[#1F251A]">
                    {[
                      {
                        time: "09:00 AM - 10:00 AM",
                        name: "Emma Watson",
                        service: "Laser Skin Resurfacing",
                        room: "Room 101",
                        status: "Completed"
                      },
                      {
                        time: "10:30 AM - 11:30 AM",
                        name: "Sarah Johnson",
                        service: "HydraFacial Deluxe + Laser Therapy",
                        room: "Room 102",
                        status: "In Progress"
                      },
                      {
                        time: "12:00 PM - 01:00 PM",
                        name: "Michael Brown",
                        service: "Botox Consultation & Injection",
                        room: "Room 103",
                        status: "Arrived"
                      },
                      {
                        time: "02:00 PM - 03:00 PM",
                        name: "Jessica Alba",
                        service: "Chemical Peel Treatment",
                        room: "Room 101",
                        status: "Scheduled"
                      }
                    ]
                      .filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((item, idx) => (
                        <tr key={idx} className="hover:bg-[#FBFBF9]/80 transition">
                          <td className="px-6 py-4 font-bold text-[#414E36]">{item.time}</td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-sm text-[#1F251A]">{item.name}</div>
                          </td>
                          <td className="px-6 py-4 font-medium text-[#5A6A51]">{item.service}</td>
                          <td className="px-6 py-4 font-semibold text-[#414E36]">{item.room}</td>
                          <td className="px-6 py-4 text-center">
                            {item.status === "Completed" && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-800">
                                <CheckCircle2 size={12} /> Completed
                              </span>
                            )}
                            {item.status === "In Progress" && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold text-amber-800 animate-pulse">
                                <Play size={12} /> In Session
                              </span>
                            )}
                            {item.status === "Arrived" && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-[11px] font-bold text-blue-800">
                                <UserCheck size={12} /> Arrived
                              </span>
                            )}
                            {item.status === "Scheduled" && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-700">
                                Scheduled
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => setActiveTab("ongoing")}
                              className="rounded-xl border border-[#414E36]/20 bg-white px-3.5 py-1.5 text-xs font-bold text-[#414E36] hover:bg-[#414E36] hover:text-white transition"
                            >
                              Open Session
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: ONGOING SESSION VIEW ── */}
        {activeTab === "ongoing" && (
          <div className="space-y-6">
            
            {/* Header Info */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-6 border border-[#414E36]/10 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#414E36]/10 text-[#414E36] font-bold text-lg">
                  SJ
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold text-[#1F251A]">{activeSessionPatient.name}</h2>
                    <span className="rounded-full bg-amber-100 px-3 py-0.5 text-xs font-bold text-amber-800">
                      Active Session
                    </span>
                  </div>
                  <p className="text-xs text-[#5A6A51] mt-1">
                    {activeSessionPatient.service} • {activeSessionPatient.time} • <strong className="text-[#414E36]">{activeSessionPatient.room}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => alert("Prescription modal opened")}
                  className="flex items-center gap-2 rounded-2xl border border-[#414E36]/20 bg-white px-4 py-2.5 text-xs font-bold text-[#414E36] hover:bg-[#F4F5F1] transition shadow-sm"
                >
                  <FileText size={14} /> Write Prescription
                </button>
                <button
                  type="button"
                  onClick={() => alert("Session completed!")}
                  className="flex items-center gap-2 rounded-2xl bg-[#414E36] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#343F2B] transition"
                >
                  <Check size={16} /> Complete Treatment
                </button>
              </div>
            </div>

            {/* Treatment & Clinical Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Left Column: Medical Alerts & History */}
              <div className="space-y-6">
                <div className="rounded-3xl border border-[#414E36]/10 bg-white p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-[#1F251A] uppercase tracking-wider mb-4 flex items-center gap-2">
                    <AlertCircle size={16} className="text-rose-600" /> Patient Medical Alerts
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {activeSessionPatient.medicalAlerts.map((alertItem: string, i: number) => (
                      <span key={i} className="rounded-xl bg-rose-100 px-3 py-1.5 text-xs font-bold text-rose-800">
                        ⚠️ {alertItem}
                      </span>
                    ))}
                  </div>

                  <div className="mt-6 border-t border-[#414E36]/10 pt-4 space-y-2">
                    <span className="text-xs font-bold text-[#5A6A51]">Patient Notes:</span>
                    <p className="text-xs text-[#1F251A] leading-relaxed bg-[#F4F5F1] p-3 rounded-2xl">
                      {activeSessionPatient.notes}
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Doctor Treatment Notes & Consumable Usage */}
              <div className="md:col-span-2 space-y-6">
                <div className="rounded-3xl border border-[#414E36]/10 bg-white p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-[#1F251A] uppercase tracking-wider flex items-center gap-2">
                    <FileText size={16} className="text-[#414E36]" /> Doctor Clinical & Procedure Notes
                  </h3>
                  <textarea
                    rows={5}
                    placeholder="Enter clinical observations, laser pulse settings, skin reaction, and post-care advice..."
                    className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] p-4 text-xs text-[#1F251A] outline-none focus:border-[#414E36] focus:ring-2 focus:ring-[#414E36]/20"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => alert("Notes saved successfully!")}
                      className="rounded-xl bg-[#414E36] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#343F2B] transition"
                    >
                      Save Clinical Note
                    </button>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ── TAB 3: SETTINGS VIEW ── */}
        {activeTab === "settings" && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-[#1F251A]">Doctor Account & Shift Settings</h2>
              <p className="text-xs text-[#5A6A51] mt-1">
                Manage your credentials, branch assignments, and personal preferences.
              </p>
            </div>

            {/* Profile Overview Card */}
            <div className="rounded-3xl border border-[#414E36]/10 bg-white p-6 shadow-sm flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#414E36] text-white font-extrabold text-xl shadow-md">
                  Dr
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1F251A]">{doctorName}</h3>
                  <p className="text-xs text-[#5A6A51]">{doctorEmail}</p>
                  <span className="mt-2 inline-block rounded-xl bg-[#414E36]/10 px-3 py-1 text-xs font-bold text-[#414E36]">
                    Primary Branch: {doctorBranch}
                  </span>
                </div>
              </div>
            </div>

            {/* Password & Security Card */}
            <div className="rounded-3xl border border-[#414E36]/10 bg-white p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-[#1F251A] uppercase tracking-wider flex items-center gap-2">
                <Lock size={16} className="text-[#414E36]" /> Security & Password
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#5A6A51] mb-1">New Password</label>
                  <input
                    type="password"
                    placeholder="Enter new password"
                    className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-xs text-[#1F251A] outline-none focus:border-[#414E36]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#5A6A51] mb-1">Confirm Password</label>
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-xs text-[#1F251A] outline-none focus:border-[#414E36]"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => alert("Password updated successfully!")}
                className="rounded-xl bg-[#414E36] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#343F2B] transition"
              >
                Update Password
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
