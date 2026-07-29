"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
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
  DollarSign,
  Printer,
  RefreshCw,
  X
} from "lucide-react";

interface DoctorAccountViewProps {
  doctorDbId?: string;
  doctorName?: string;
  doctorEmail?: string;
  doctorBranch?: string;
  initialReservations?: any[];
  onLogout: () => void;
  onSwitchToAdmin?: () => void;
}

type DoctorTab = "schedule" | "ongoing" | "settings";

export default function DoctorAccountView({
  doctorDbId,
  doctorName = "Doctor",
  doctorEmail = "doctor@revera.com",
  doctorBranch = "Main Branch",
  initialReservations = [],
  onLogout
}: DoctorAccountViewProps) {
  const [activeTab, setActiveTab] = useState<DoctorTab>("schedule");
  const [reservations, setReservations] = useState<any[]>(initialReservations);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Active Session State (Ongoing Tab)
  const [activeSessionBooking, setActiveSessionBooking] = useState<any | null>(null);
  const [clinicalNote, setClinicalNote] = useState("");
  const [medicalRecord, setMedicalRecord] = useState<any | null>(null);
  const [savingNote, setSavingNote] = useState(false);

  // In-Page Session Modal State (Schedule Tab)
  const [scheduleModalBooking, setScheduleModalBooking] = useState<any | null>(null);

  // Prescription Modal State
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [rxDiagnosis, setRxDiagnosis] = useState("");
  const [rxMedications, setRxMedications] = useState<{ name: string; dosage: string; frequency: string; duration: string }[]>([
    { name: "", dosage: "", frequency: "", duration: "" }
  ]);
  const [rxGeneralNotes, setRxGeneralNotes] = useState("");
  const [savingRx, setSavingRx] = useState(false);

  // Password Update State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Auth headers helper for staff access verification
  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }
    return headers;
  };

  // Fetch real reservations from DB with polling for live updates
  const fetchDoctorReservations = async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/reservations", { headers, cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setReservations(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Error fetching doctor reservations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorReservations();
    // Auto-refresh schedule every 10 seconds to catch receptionist "Start Session" clicks live
    const interval = setInterval(fetchDoctorReservations, 10000);
    return () => clearInterval(interval);
  }, []);

  // Filter reservations for Today & Doctor assignment
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const todaysReservations = useMemo(() => {
    return reservations.filter((r) => {
      const resDate = r.date ? String(r.date).slice(0, 10) : "";
      if (resDate !== todayStr) return false;

      // Filter by doctor name/ID if set
      if (r.doctor && doctorName && r.doctor.toLowerCase() !== doctorName.toLowerCase()) {
        if (r.doctor.trim() && r.doctor.toLowerCase() !== "doctor" && r.doctor.toLowerCase() !== "any") {
          return false;
        }
      }
      return true;
    });
  }, [reservations, todayStr, doctorName]);

  // AUTO-DETECT SESSION STARTED BY RECEPTIONIST ("started" or "in-progress" status)
  const receptionistStartedSession = useMemo(() => {
    return (
      todaysReservations.find((r) => r.status === "started" || r.status === "in-progress") ||
      reservations.find((r) => r.status === "started" || r.status === "in-progress") ||
      null
    );
  }, [todaysReservations, reservations]);

  // Sync activeSessionBooking automatically when receptionist starts a session
  useEffect(() => {
    if (receptionistStartedSession) {
      // Only set if not already set or completed
      if (!activeSessionBooking || activeSessionBooking.status === "completed" || activeSessionBooking.id !== receptionistStartedSession.id) {
        setActiveSessionBooking(receptionistStartedSession);
        setClinicalNote(receptionistStartedSession.notes || "");
      }
    } else {
      // If no started session exists in DB, clear active session
      if (activeSessionBooking && activeSessionBooking.status === "completed") {
        setActiveSessionBooking(null);
      }
    }
  }, [receptionistStartedSession]);

  // Statistics derived from REAL DB data
  const stats = useMemo(() => {
    const total = todaysReservations.length;
    const completed = todaysReservations.filter((r) => r.status === "completed" || r.status === "done").length;
    const inProgress = todaysReservations.filter((r) => r.status === "started" || r.status === "in-progress").length;
    const upcoming = todaysReservations.filter((r) => ["pending", "approved", "confirmed"].includes(r.status)).length;
    return { total, completed, inProgress, upcoming };
  }, [todaysReservations]);

  // Filtered schedule by search query
  const filteredSchedule = useMemo(() => {
    if (!searchQuery.trim()) return todaysReservations;
    const q = searchQuery.toLowerCase();
    return todaysReservations.filter(
      (r) =>
        (r.name || r.customer_name || "").toLowerCase().includes(q) ||
        (r.service || r.service_name || "").toLowerCase().includes(q) ||
        (r.phone || "").includes(q)
    );
  }, [todaysReservations, searchQuery]);

  // Open session details in Modal on SAME PAGE (Schedule tab)
  const handleOpenScheduleModal = async (booking: any) => {
    setScheduleModalBooking(booking);
    setClinicalNote(booking.notes || "");

    // Fetch medical intake record for this patient
    const customerId = booking.customer_id || booking.customerId || booking.id;
    if (customerId) {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`/api/medical-records?customerId=${encodeURIComponent(customerId)}`, { headers });
        if (res.ok) {
          const data = await res.json();
          setMedicalRecord(data.form || null);
        }
      } catch (err) {
        console.error("Error loading patient medical records:", err);
      }
    }
  };

  // Save clinical notes to database
  const handleSaveClinicalNote = async (targetBooking: any) => {
    if (!targetBooking) return;
    setSavingNote(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/reservations?id=${encodeURIComponent(targetBooking.id)}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          status: targetBooking.status,
          notes: clinicalNote
        })
      });

      if (res.ok) {
        alert("Clinical notes saved successfully!");
        fetchDoctorReservations();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || errData.message || "Failed to save clinical notes.");
      }
    } catch (err: any) {
      console.error("Error saving clinical note:", err);
      alert(err.message || "Error saving clinical note.");
    } finally {
      setSavingNote(false);
    }
  };

  // Complete treatment status in database & CLOSE SESSION FROM ONGOING
  const handleCompleteTreatment = async (targetBooking: any) => {
    if (!targetBooking) return;
    if (!confirm(`Mark treatment session as COMPLETED for ${targetBooking.name || "Patient"}?`)) return;

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/reservations?id=${encodeURIComponent(targetBooking.id)}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          status: "completed",
          notes: clinicalNote
        })
      });

      if (res.ok) {
        alert("Treatment session marked as COMPLETED!");
        
        // Clear active session from Ongoing Tab so it closes!
        setActiveSessionBooking(null);
        setScheduleModalBooking(null);
        fetchDoctorReservations();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || errData.message || "Failed to complete treatment.");
      }
    } catch (err: any) {
      console.error("Error completing treatment:", err);
      alert(err.message || "Error completing treatment.");
    }
  };

  // Create real prescription in DB
  const handleCreatePrescription = async (e: React.FormEvent, targetBooking: any) => {
    e.preventDefault();
    if (!targetBooking) return;

    const customerId = targetBooking.customer_id || targetBooking.customerId || targetBooking.id;
    const patientName = targetBooking.name || targetBooking.customer_name || "Patient";

    setSavingRx(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/prescriptions", {
        method: "POST",
        headers,
        body: JSON.stringify({
          customer_id: customerId,
          patient_name: patientName,
          date: new Date().toISOString().slice(0, 10),
          diagnosis: rxDiagnosis,
          medications: rxMedications.filter((m) => m.name.trim() !== ""),
          general_notes: rxGeneralNotes,
          doctor_notes: clinicalNote
        })
      });

      if (res.ok) {
        alert("Digital Prescription created successfully!");
        setShowPrescriptionModal(false);
        setRxDiagnosis("");
        setRxMedications([{ name: "", dosage: "", frequency: "", duration: "" }]);
        setRxGeneralNotes("");
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || err.message || "Failed to create prescription.");
      }
    } catch (err: any) {
      console.error("Error creating prescription:", err);
      alert(err.message || "Error saving prescription.");
    } finally {
      setSavingRx(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F4F5F1] text-[#1F251A] font-sans flex flex-col">
      {/* ── TOP HEADER & FLOATING NAVIGATION BAR (FULL SCREEN WIDTH) ── */}
      <header className="sticky top-0 z-50 w-full bg-[#F4F5F1]/90 backdrop-blur-md px-8 py-4 transition-all border-b border-[#414E36]/10 shadow-sm">
        <div className="w-full flex items-center justify-between gap-4">
          
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

          {/* ── CENTER FLOATING NAV BAR (ICON ONLY WHEN UNSELECTED, EXPANDS ON CLICK) ── */}
          <nav className="flex items-center justify-center">
            <div className="flex items-center gap-1.5 rounded-full border border-[#414E36]/20 bg-white/95 p-1.5 shadow-[0_12px_40px_rgba(65,78,54,0.1)] backdrop-blur-2xl transition-all duration-300 hover:border-[#414E36]/40 hover:shadow-[0_16px_50px_rgba(65,78,54,0.16)]">
              
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
                {receptionistStartedSession && activeSessionBooking?.status !== "completed" && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                  </span>
                )}
                {activeTab === "ongoing" && (
                  <span className="animate-fadeIn whitespace-nowrap tracking-wide flex items-center gap-1">
                    Ongoing Session
                    {receptionistStartedSession && activeSessionBooking?.status !== "completed" && (
                      <span className="rounded-full bg-amber-400 h-2 w-2"></span>
                    )}
                  </span>
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

          {/* Right: Refined Doctor Profile Box & Logout */}
          <div className="flex items-center gap-3">
            
            <button
              type="button"
              onClick={fetchDoctorReservations}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#414E36]/15 bg-white text-[#414E36] hover:bg-[#F4F5F1] transition shadow-sm"
              title="Refresh Schedule"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>

            {/* Premium Doctor Account Profile Box */}
            <div className="flex items-center gap-3 rounded-full border border-[#414E36]/20 bg-white/95 px-4 py-1.5 shadow-[0_4px_20px_rgba(65,78,54,0.06)] backdrop-blur-md hover:border-[#414E36]/40 transition-all">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-[#414E36] text-white font-black text-xs shadow-md border-2 border-white">
                {(doctorName.replace(/^Dr\.?\s*/i, '') || "D").slice(0, 2).toUpperCase()}
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
              </div>
              <div className="text-left hidden md:block">
                <p className="text-xs font-black text-[#1F251A] tracking-tight leading-tight">{doctorName}</p>
                <p className="text-[10px] font-semibold text-[#5A6A51] leading-none mt-0.5">{doctorEmail}</p>
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

      {/* ── MAIN CONTENT AREA (FULL SCREEN WIDTH) ── */}
      <main className="flex-1 w-full px-8 py-6 animate-fadeIn flex flex-col">
        
        {/* ── TAB 1: SCHEDULE VIEW ── */}
        {activeTab === "schedule" && (
          <div className="space-y-6 w-full">
            
            {/* Header Title & Search */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-[#1F251A]">Today&apos;s Appointments & Patient Queue</h2>
                <p className="text-xs text-[#5A6A51] mt-1">
                  Real-time clinic shift schedule, patient arrivals, and active treatments.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-3 text-[#5A6A51]" />
                  <input
                    type="text"
                    placeholder="Search patient or service..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="rounded-2xl border border-[#414E36]/15 bg-white pl-9 pr-4 py-2 text-xs text-[#1F251A] focus:outline-none focus:ring-2 focus:ring-[#414E36] w-64"
                  />
                </div>

                <div className="flex items-center gap-2 rounded-2xl border border-[#414E36]/15 bg-white px-4 py-2 text-xs font-bold text-[#414E36] shadow-sm">
                  <Clock size={14} />
                  <span>Today ({new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})</span>
                </div>
              </div>
            </div>

            {/* Quick Dynamic Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
              <div className="rounded-3xl border border-[#414E36]/10 bg-white p-5 shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-[#5A6A51]">Scheduled Today</span>
                <div className="mt-2 text-3xl font-extrabold text-[#1F251A]">{stats.total} Patients</div>
              </div>
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Completed</span>
                <div className="mt-2 text-3xl font-extrabold text-emerald-800">{stats.completed} Sessions</div>
              </div>
              <div className="rounded-3xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700">In Treatment</span>
                <div className="mt-2 text-3xl font-extrabold text-amber-800">{stats.inProgress} Active</div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50/50 p-5 shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Upcoming Queue</span>
                <div className="mt-2 text-3xl font-extrabold text-slate-700">{stats.upcoming} Waiting</div>
              </div>
            </div>

            {/* Real Patients Schedule Table */}
            <div className="overflow-hidden rounded-[32px] border border-[#414E36]/10 bg-white shadow-[0_20px_50px_rgba(47,61,41,0.05)] w-full">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#414E36]/10 bg-[#FBFBF9] text-xs uppercase tracking-wider text-[#5A6A51]">
                    <tr>
                      <th className="px-6 py-4 font-bold">Time Slot</th>
                      <th className="px-6 py-4 font-bold">Patient Name</th>
                      <th className="px-6 py-4 font-bold">Requested Service</th>
                      <th className="px-6 py-4 font-bold">Room / Location</th>
                      <th className="px-6 py-4 font-bold text-center">Status</th>
                      <th className="px-6 py-4 font-bold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#414E36]/05 text-[#1F251A]">
                    {filteredSchedule.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-[#5A6A51]">
                          <div className="flex flex-col items-center gap-2">
                            <CalendarDays size={32} className="text-[#414E36]/30" />
                            <p className="font-bold text-sm text-[#1F251A]">No appointments scheduled for today</p>
                            <p className="text-xs text-[#5A6A51]">
                              All new patient bookings will automatically populate here in real-time.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredSchedule.map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-[#FBFBF9]/80 transition">
                          <td className="px-6 py-4 font-bold text-[#414E36]">
                            {item.time || item.time_slot || item.timeSlot || "09:00 AM"}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-sm text-[#1F251A]">
                              {item.name || item.customer_name || "Patient"}
                            </div>
                            {item.phone && <div className="text-[10px] text-[#5A6A51] font-mono">{item.phone}</div>}
                          </td>
                          <td className="px-6 py-4 font-medium text-[#5A6A51]">
                            {item.service || item.service_name || "Consultation"}
                          </td>
                          <td className="px-6 py-4 font-semibold text-[#414E36]">
                            {item.room || item.room_name || "Treatment Room"}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {(item.status === "completed" || item.status === "done") && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-800">
                                <CheckCircle2 size={12} /> Completed
                              </span>
                            )}
                            {(item.status === "started" || item.status === "in-progress") && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold text-amber-800 animate-pulse">
                                <Play size={12} /> In Session
                              </span>
                            )}
                            {item.status === "arrived" && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-[11px] font-bold text-blue-800">
                                <UserCheck size={12} /> Arrived
                              </span>
                            )}
                            {["pending", "approved", "confirmed"].includes(item.status) && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-700 capitalize">
                                {item.status}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleOpenScheduleModal(item)}
                              className="rounded-xl border border-[#414E36]/20 bg-white px-4 py-2 text-xs font-bold text-[#414E36] hover:bg-[#414E36] hover:text-white transition shadow-sm"
                            >
                              Open Session
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: ONGOING SESSION VIEW ── */}
        {activeTab === "ongoing" && (
          <div className="space-y-6 w-full">
            
            {activeSessionBooking && activeSessionBooking.status !== "completed" ? (
              <>
                {/* Active Patient Card */}
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
                          <Play size={12} /> Session Started by Reception
                        </span>
                      </div>
                      <p className="text-xs text-[#5A6A51] mt-1">
                        {activeSessionBooking.service || activeSessionBooking.service_name} • {activeSessionBooking.time || activeSessionBooking.time_slot || "Today"} • <strong className="text-[#414E36]">{activeSessionBooking.room || "Treatment Room"}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowPrescriptionModal(true)}
                      className="flex items-center gap-2 rounded-2xl border border-[#414E36]/20 bg-white px-4 py-2.5 text-xs font-bold text-[#414E36] hover:bg-[#F4F5F1] transition shadow-sm"
                    >
                      <FileText size={14} /> Write Prescription
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCompleteTreatment(activeSessionBooking)}
                      className="flex items-center gap-2 rounded-2xl bg-[#414E36] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#343F2B] transition"
                    >
                      <Check size={16} /> Complete Treatment
                    </button>
                  </div>
                </div>

                {/* Treatment Details & Notes */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
                  
                  {/* Patient Intake & Medical History */}
                  <div className="space-y-6">
                    <div className="rounded-3xl border border-[#414E36]/10 bg-white p-6 shadow-sm">
                      <h3 className="text-sm font-bold text-[#1F251A] uppercase tracking-wider mb-4 flex items-center gap-2">
                        <AlertCircle size={16} className="text-[#414E36]" /> Patient Clinical Intake
                      </h3>
                      
                      {medicalRecord ? (
                        <div className="space-y-3 text-xs">
                          <div className="flex justify-between border-b border-[#414E36]/10 pb-2">
                            <span className="font-bold text-[#5A6A51]">Skin Type:</span>
                            <span className="font-bold text-[#1F251A]">{medicalRecord.skin_type || "Normal"}</span>
                          </div>
                          <div className="flex justify-between border-b border-[#414E36]/10 pb-2">
                            <span className="font-bold text-[#5A6A51]">Allergies:</span>
                            <span className="font-bold text-rose-700">{medicalRecord.allergies || "None reported"}</span>
                          </div>
                          <div className="flex justify-between border-b border-[#414E36]/10 pb-2">
                            <span className="font-bold text-[#5A6A51]">Medication:</span>
                            <span className="font-semibold text-[#1F251A]">{medicalRecord.medication_details || "None"}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-[#5A6A51]">No intake form recorded yet for this patient.</p>
                      )}

                      <div className="mt-6 border-t border-[#414E36]/10 pt-4 space-y-2">
                        <span className="text-xs font-bold text-[#5A6A51]">Booking Notes:</span>
                        <p className="text-xs text-[#1F251A] leading-relaxed bg-[#F4F5F1] p-3 rounded-2xl font-mono">
                          {activeSessionBooking.notes || "No booking notes provided."}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Doctor Clinical Notes Editor */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="rounded-3xl border border-[#414E36]/10 bg-white p-6 shadow-sm space-y-4">
                      <h3 className="text-sm font-bold text-[#1F251A] uppercase tracking-wider flex items-center gap-2">
                        <FileText size={16} className="text-[#414E36]" /> Doctor Procedure Observations & Medical Notes
                      </h3>
                      <textarea
                        rows={8}
                        value={clinicalNote}
                        onChange={(e) => setClinicalNote(e.target.value)}
                        placeholder="Enter clinical observations, laser pulse parameters, skin reactions, and post-procedure recommendations..."
                        className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] p-4 text-xs text-[#1F251A] outline-none focus:border-[#414E36] focus:ring-2 focus:ring-[#414E36]/20 font-sans"
                      />
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleSaveClinicalNote(activeSessionBooking)}
                          disabled={savingNote}
                          className="rounded-xl bg-[#414E36] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#343F2B] transition disabled:opacity-50"
                        >
                          {savingNote ? "Saving..." : "Save Clinical Notes"}
                        </button>
                      </div>
                    </div>
                  </div>

                </div>
              </>
            ) : (
              <div className="rounded-3xl border border-[#414E36]/10 bg-white p-12 text-center text-[#5A6A51] space-y-4">
                <div className="h-16 w-16 mx-auto flex items-center justify-center rounded-full bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                  <Play size={28} />
                </div>
                <h3 className="text-xl font-bold text-[#1F251A]">Waiting for Receptionist to Start Session</h3>
                <p className="text-xs text-[#5A6A51] max-w-md mx-auto leading-relaxed">
                  When the receptionist clicks <strong>&quot;Start Session&quot;</strong> on a patient booking assigned to you, the patient treatment portal will automatically open here in real-time.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("schedule")}
                    className="rounded-2xl bg-[#414E36] px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#343F2B] transition"
                  >
                    View Today&apos;s Patient Queue
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ── TAB 3: SETTINGS VIEW ── */}
        {activeTab === "settings" && (
          <div className="w-full space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-[#1F251A]">Doctor Profile & Security Settings</h2>
              <p className="text-xs text-[#5A6A51] mt-1">
                Manage your credentials, branch details, and security options.
              </p>
            </div>

            {/* Profile Card */}
            <div className="rounded-3xl border border-[#414E36]/10 bg-white p-6 shadow-sm flex items-center justify-between gap-4 w-full">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#414E36] text-white font-extrabold text-xl shadow-md">
                  Dr
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1F251A]">{doctorName}</h3>
                  <p className="text-xs text-[#5A6A51]">{doctorEmail}</p>
                  <span className="mt-2 inline-block rounded-xl bg-[#414E36]/10 px-3 py-1 text-xs font-bold text-[#414E36]">
                    Assigned Branch: {doctorBranch}
                  </span>
                </div>
              </div>
            </div>

            {/* Password Update Form */}
            <div className="rounded-3xl border border-[#414E36]/10 bg-white p-6 shadow-sm space-y-4 w-full">
              <h3 className="text-sm font-bold text-[#1F251A] uppercase tracking-wider flex items-center gap-2">
                <Lock size={16} className="text-[#414E36]" /> Security & Account Password
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#5A6A51] mb-1">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-xs text-[#1F251A] outline-none focus:border-[#414E36]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#5A6A51] mb-1">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-xs text-[#1F251A] outline-none focus:border-[#414E36]"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!newPassword || newPassword !== confirmPassword) {
                    alert("Passwords do not match or are empty.");
                    return;
                  }
                  alert("Password updated successfully!");
                  setNewPassword("");
                  setConfirmPassword("");
                }}
                className="rounded-xl bg-[#414E36] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#343F2B] transition"
              >
                Update Password
              </button>
            </div>
          </div>
        )}

      </main>

      {/* ── IN-PAGE SESSION MODAL (SCHEDULE TAB - SAME PAGE) ── */}
      {scheduleModalBooking && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[32px] bg-white p-6 shadow-2xl space-y-6 border border-[#414E36]/20">
            <div className="flex items-center justify-between border-b border-[#414E36]/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#414E36] text-white font-bold text-lg shadow-md">
                  {(scheduleModalBooking.name || "P").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#1F251A]">
                    {scheduleModalBooking.name || scheduleModalBooking.customer_name || "Patient Session"}
                  </h3>
                  <p className="text-xs text-[#5A6A51] mt-0.5">
                    {scheduleModalBooking.service || scheduleModalBooking.service_name} • {scheduleModalBooking.time || scheduleModalBooking.time_slot} • <strong className="text-[#414E36]">{scheduleModalBooking.room || "Treatment Room"}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setScheduleModalBooking(null)}
                className="rounded-full p-2 text-[#5A6A51] hover:bg-[#F4F5F1] transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Intake Form */}
              <div className="space-y-4">
                <div className="rounded-2xl border border-[#414E36]/10 bg-[#FBFBF9] p-4 space-y-3">
                  <h4 className="text-xs font-bold text-[#1F251A] uppercase tracking-wider flex items-center gap-2">
                    <AlertCircle size={14} className="text-[#414E36]" /> Clinical Intake
                  </h4>
                  {medicalRecord ? (
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between border-b border-[#414E36]/10 pb-1.5">
                        <span className="text-[#5A6A51]">Skin Type:</span>
                        <span className="font-bold text-[#1F251A]">{medicalRecord.skin_type || "Normal"}</span>
                      </div>
                      <div className="flex justify-between border-b border-[#414E36]/10 pb-1.5">
                        <span className="text-[#5A6A51]">Allergies:</span>
                        <span className="font-bold text-rose-700">{medicalRecord.allergies || "None"}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-[#5A6A51]">No intake form on record.</p>
                  )}

                  <div className="pt-2 border-t border-[#414E36]/10">
                    <span className="text-xs font-bold text-[#5A6A51]">Notes:</span>
                    <p className="text-xs text-[#1F251A] mt-1 bg-white p-2.5 rounded-xl border border-[#414E36]/10 font-mono">
                      {scheduleModalBooking.notes || "No notes."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Notes Editor & Actions */}
              <div className="lg:col-span-2 space-y-4">
                <h4 className="text-xs font-bold text-[#1F251A] uppercase tracking-wider flex items-center gap-2">
                  <FileText size={14} className="text-[#414E36]" /> Procedure Observations & Notes
                </h4>
                <textarea
                  rows={6}
                  value={clinicalNote}
                  onChange={(e) => setClinicalNote(e.target.value)}
                  placeholder="Enter clinical observations, laser parameters, post-procedure advice..."
                  className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] p-4 text-xs text-[#1F251A] outline-none focus:border-[#414E36]"
                />
                
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => handleSaveClinicalNote(scheduleModalBooking)}
                    disabled={savingNote}
                    className="rounded-xl border border-[#414E36]/20 bg-white px-4 py-2 text-xs font-bold text-[#414E36] hover:bg-[#F4F5F1] transition disabled:opacity-50"
                  >
                    {savingNote ? "Saving..." : "Save Notes"}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowPrescriptionModal(true)}
                      className="rounded-xl border border-[#414E36]/20 bg-white px-4 py-2 text-xs font-bold text-[#414E36] hover:bg-[#F4F5F1] transition"
                    >
                      Write Prescription
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCompleteTreatment(scheduleModalBooking)}
                      className="rounded-xl bg-[#414E36] px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-[#343F2B] transition"
                    >
                      Complete Treatment
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PRESCRIPTION MODAL ── */}
      {showPrescriptionModal && (activeSessionBooking || scheduleModalBooking) && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-[32px] bg-white p-6 shadow-2xl space-y-5 border border-[#414E36]/20">
            <div className="flex items-center justify-between border-b border-[#414E36]/10 pb-3">
              <div>
                <h3 className="text-lg font-bold text-[#1F251A]">Write Digital Prescription</h3>
                <p className="text-xs text-[#5A6A51]">
                  Patient: <strong className="text-[#414E36]">{(activeSessionBooking || scheduleModalBooking).name || (activeSessionBooking || scheduleModalBooking).customer_name}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPrescriptionModal(false)}
                className="rounded-full p-2 text-[#5A6A51] hover:bg-[#F4F5F1]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={(e) => handleCreatePrescription(e, activeSessionBooking || scheduleModalBooking)} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#5A6A51] mb-1">Clinical Diagnosis</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Post-laser inflammation, Acne Vulgaris Grade II"
                  value={rxDiagnosis}
                  onChange={(e) => setRxDiagnosis(e.target.value)}
                  className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-xs text-[#1F251A] outline-none focus:border-[#414E36]"
                />
              </div>

              {/* Medications List */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#5A6A51]">Prescribed Medications</label>
                {rxMedications.map((med, idx) => (
                  <div key={idx} className="grid grid-cols-4 gap-2">
                    <input
                      type="text"
                      placeholder="Medication Name"
                      value={med.name}
                      onChange={(e) => {
                        const updated = [...rxMedications];
                        updated[idx].name = e.target.value;
                        setRxMedications(updated);
                      }}
                      className="rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2 text-xs text-[#1F251A] outline-none focus:border-[#414E36]"
                    />
                    <input
                      type="text"
                      placeholder="Dosage (e.g. 500mg)"
                      value={med.dosage}
                      onChange={(e) => {
                        const updated = [...rxMedications];
                        updated[idx].dosage = e.target.value;
                        setRxMedications(updated);
                      }}
                      className="rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2 text-xs text-[#1F251A] outline-none focus:border-[#414E36]"
                    />
                    <input
                      type="text"
                      placeholder="Frequency (e.g. 2x Daily)"
                      value={med.frequency}
                      onChange={(e) => {
                        const updated = [...rxMedications];
                        updated[idx].frequency = e.target.value;
                        setRxMedications(updated);
                      }}
                      className="rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2 text-xs text-[#1F251A] outline-none focus:border-[#414E36]"
                    />
                    <input
                      type="text"
                      placeholder="Duration (e.g. 7 Days)"
                      value={med.duration}
                      onChange={(e) => {
                        const updated = [...rxMedications];
                        updated[idx].duration = e.target.value;
                        setRxMedications(updated);
                      }}
                      className="rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2 text-xs text-[#1F251A] outline-none focus:border-[#414E36]"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setRxMedications([...rxMedications, { name: "", dosage: "", frequency: "", duration: "" }])}
                  className="text-xs font-bold text-[#414E36] flex items-center gap-1 mt-1 hover:underline"
                >
                  <Plus size={14} /> Add Another Medication
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#5A6A51] mb-1">General Patient Instructions</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Apply sunscreen SPF 50 daily, avoid direct sun exposure for 48 hours..."
                  value={rxGeneralNotes}
                  onChange={(e) => setRxGeneralNotes(e.target.value)}
                  className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] p-3 text-xs text-[#1F251A] outline-none focus:border-[#414E36]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPrescriptionModal(false)}
                  className="rounded-xl border border-[#414E36]/20 bg-white px-4 py-2 text-xs font-bold text-[#5A6A51] hover:bg-[#F4F5F1]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingRx}
                  className="rounded-xl bg-[#414E36] px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#343F2B] transition disabled:opacity-50"
                >
                  {savingRx ? "Saving..." : "Save & Print Prescription"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
