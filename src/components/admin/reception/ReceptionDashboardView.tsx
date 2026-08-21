"use client";

import React, { useState, useEffect } from "react";
import {
  LayoutGrid,
  Calendar,
  Users,
  UserCheck,
  CreditCard,
  Package,
  BarChart3,
  Settings,
  LogOut,
  Clock,
  Play,
  Timer,
  Target,
  ArrowRight,
  User,
  Sparkles,
  Stethoscope,
  ChevronDown,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

interface ReceptionDashboardViewProps {
  receptionistName?: string;
  receptionistRole?: string;
  employeeId?: string;
  email?: string;
  accessToken?: string;
  onNavigateTab?: (tabName: string) => void;
  onLogout?: () => void;
}

export default function ReceptionDashboardView({
  receptionistName = "Zaki Mohamed",
  receptionistRole = "Receptionist",
  employeeId,
  email,
  accessToken,
  onNavigateTab,
  onLogout
}: ReceptionDashboardViewProps) {
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [shiftProcessing, setShiftProcessing] = useState(false);
  const [liveElapsedSeconds, setLiveElapsedSeconds] = useState(0);
  const [showStartShiftPopup, setShowStartShiftPopup] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [hasAutoPrompted, setHasAutoPrompted] = useState(false);

  // Fetch Reception Dashboard data from backend API
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (employeeId) params.set("employeeId", employeeId);
      if (email) params.set("email", email);

      const res = await fetch(`/api/reception/dashboard?${params.toString()}`, {
        cache: "no-store",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
      });
      const data = await res.json();
      if (data.success) {
        setDashboardData(data);
        if (data.shift?.elapsedSeconds) {
          setLiveElapsedSeconds(data.shift.elapsedSeconds);
        }
        if (!hasAutoPrompted && data.shift?.status === "not_started") {
          setShowStartShiftPopup(true);
          setHasAutoPrompted(true);
        }
      }
    } catch (err) {
      console.error("Failed to load reception dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!accessToken) return;
    fetchDashboardData();
  }, [employeeId, email, accessToken]);

  // Live timer for elapsed shift time ticker when shift is active
  useEffect(() => {
    if (dashboardData?.shift?.status !== "started") return;

    const interval = setInterval(() => {
      setLiveElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [dashboardData?.shift?.status]);

  // Execute Start Shift with geolocation check
  const handleStartShiftWithLocation = () => {
    setLocationError(null);

    if (typeof window === "undefined" || !navigator.geolocation) {
      setLocationError("Location permission is required to start your shift.");
      return;
    }

    setShiftProcessing(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude, accuracy } = position.coords;
          const res = await fetch("/api/reception/dashboard", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
            },
            body: JSON.stringify({
              action: "start_shift",
              employeeId,
              email,
              latitude,
              longitude,
              accuracy
            })
          });

          const result = await res.json();
          if (result.success) {
            setShowStartShiftPopup(false);
            setLocationError(null);
            await fetchDashboardData();
          } else {
            if (result.error === "out_of_location" || (result.message && result.message.includes("working location"))) {
              setLocationError("You must be in a working location to start your shift.");
            } else if (result.error === "location_permission_denied" || (result.message && result.message.includes("permission"))) {
              setLocationError("Location permission is required to start your shift.");
            } else {
              setLocationError(result.message || result.error || "You must be in a working location to start your shift.");
            }
          }
        } catch (err: any) {
          console.error("Start shift network/server error:", err);
          setLocationError("You must be in a working location to start your shift.");
        } finally {
          setShiftProcessing(false);
        }
      },
      (geoErr) => {
        setShiftProcessing(false);
        if (geoErr.code === geoErr.PERMISSION_DENIED || geoErr.code === 1) {
          setLocationError("Location permission is required to start your shift.");
        } else {
          setLocationError("Location permission is required to start your shift.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleShiftAction = async () => {
    const currentStatus = dashboardData?.shift?.status;
    if (currentStatus !== "started") {
      setLocationError(null);
      setShowStartShiftPopup(true);
      return;
    }

    // Ending active shift
    try {
      setShiftProcessing(true);
      const res = await fetch("/api/reception/dashboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify({
          action: "end_shift",
          employeeId,
          email
        })
      });

      const result = await res.json();
      if (result.success) {
        await fetchDashboardData();
      }
    } catch (err) {
      console.error("End shift failed:", err);
    } finally {
      setShiftProcessing(false);
    }
  };

  // Helper to format live elapsed time
  const formatElapsedTime = (totalSecs: number) => {
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  const navItems = [
    { label: "Dashboard", icon: LayoutGrid, navTarget: "Dashboard" },
    { label: "Appointments", icon: Calendar, navTarget: "Bookings" },
    { label: "Patients", icon: Users, navTarget: "Patients" },
    { label: "Queue", icon: UserCheck, navTarget: "Queue Settings" },
    { label: "Payments", icon: CreditCard, navTarget: "Finance" },
    { label: "Inventory", icon: Package, navTarget: "Inventory" },
    { label: "Reports", icon: BarChart3, navTarget: "Insights" },
    { label: "Settings", icon: Settings, navTarget: "Clinic Profile" }
  ];

  const shiftInfo = dashboardData?.shift || {
    scheduleHours: "8 Hours",
    shiftFromTo: "09:00 AM – 05:00 PM",
    actualStartingTime: "--:--",
    elapsedTime: "0h 0m",
    status: "not_started"
  };

  const targetInfo = dashboardData?.target || {
    targetAmount: 0,
    achievedAmount: 0,
    progressPercentage: 0,
    remainingAmount: 0
  };

  const bookingsInfo = dashboardData?.bookings || {
    todayCount: 0,
    pendingCount: 0,
    list: []
  };

  return (
    <div className="space-y-6 pb-8">
        {/* ── 1. Today's Shift Card ── */}
        <div className="bg-white rounded-3xl p-6 border border-[#EBE8E0] shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-[#F0F4EC] text-[#45523A] flex items-center justify-center">
                <Calendar size={20} />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-[#1F251A]">Today's Shift</h3>
                <p className="text-xs text-[#788272]">Your scheduled working hours</p>
              </div>
            </div>

            <button
              type="button"
              disabled={shiftProcessing}
              onClick={handleShiftAction}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm ${
                shiftInfo.status === "started"
                  ? "bg-[#26331E] text-white hover:bg-[#35452C]"
                  : "bg-[#45523A] text-white hover:bg-[#35452C]"
              } disabled:opacity-50`}
            >
              <LogOut size={15} />
              <span>{shiftProcessing ? "Updating..." : shiftInfo.status === "started" ? "End Shift" : "Start Shift"}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-2 border-t border-[#F3F0E8]">
            {/* Metric 1: Shift From - To */}
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-[#F7F5F0] text-[#55634B] flex items-center justify-center shrink-0 mt-0.5">
                <Clock size={18} />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-[#8C9686] uppercase tracking-wider">Shift From – To</p>
                <p className="text-sm font-bold text-[#1F251A] mt-0.5">{shiftInfo.shiftFromTo}</p>
                <p className="text-xs text-[#8C9686]">({shiftInfo.scheduleHours})</p>
              </div>
            </div>

            {/* Metric 2: Actual Starting Time */}
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-[#F7F5F0] text-[#55634B] flex items-center justify-center shrink-0 mt-0.5">
                <Play size={18} />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-[#8C9686] uppercase tracking-wider">Actual Starting Time</p>
                <p className="text-sm font-bold text-[#1F251A] mt-0.5">{shiftInfo.actualStartingTime}</p>
              </div>
            </div>

            {/* Metric 3: Elapsed Time */}
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-[#F7F5F0] text-[#55634B] flex items-center justify-center shrink-0 mt-0.5">
                <Timer size={18} />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-[#8C9686] uppercase tracking-wider">Elapsed Time</p>
                <p className="text-sm font-bold text-[#1F251A] mt-0.5">
                  {shiftInfo.status === "started" ? formatElapsedTime(liveElapsedSeconds) : shiftInfo.elapsedTime}
                </p>
                <p className="text-xs text-[#8C9686]">
                  {shiftInfo.actualStartingTime !== "--:--" ? `Since ${shiftInfo.actualStartingTime}` : "Shift Not Started"}
                </p>
              </div>
            </div>

            {/* Metric 4: Status */}
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-[#F0F4EC] text-[#3B662C] flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-[#8C9686] uppercase tracking-wider">Status</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${shiftInfo.status === "started" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                  <p className={`text-sm font-bold ${shiftInfo.status === "started" ? "text-emerald-700" : "text-amber-700"}`}>
                    {shiftInfo.status === "started" ? "On Shift" : shiftInfo.status === "ended" ? "Shift Ended" : "Not Started"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 2. My Personal Target Card ── */}
        <div className="bg-white rounded-3xl p-6 border border-[#EBE8E0] shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-[#F0F4EC] text-[#45523A] flex items-center justify-center">
                <Target size={20} />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-[#1F251A]">My Personal Target</h3>
                <p className="text-xs text-[#788272]">Track your target progress this month</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab && onNavigateTab("HR")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-[#45523A] border border-[#D5DDD0] hover:bg-[#F0F4EC] transition"
            >
              <span>View My Target</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center pt-2">
            {/* Left: Target */}
            <div>
              <p className="text-[11px] font-semibold text-[#8C9686] uppercase tracking-wider">Target</p>
              <p className="text-2xl font-black text-[#1F251A] mt-1">EGP {targetInfo.targetAmount?.toLocaleString()}</p>
            </div>

            {/* Middle: Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-[#8C9686]">Progress</span>
                <span className="text-[#45523A]">{targetInfo.progressPercentage}%</span>
              </div>
              <div className="h-3 w-full bg-[#F3F0E8] rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full bg-[#526346] rounded-full transition-all duration-500"
                  style={{ width: `${targetInfo.progressPercentage}%` }}
                />
              </div>
              <p className="text-xs text-[#788272] font-medium">EGP {targetInfo.achievedAmount?.toLocaleString()} achieved</p>
            </div>

            {/* Right: Remaining */}
            <div>
              <p className="text-[11px] font-semibold text-[#8C9686] uppercase tracking-wider">Remaining</p>
              <p className="text-2xl font-black text-[#45523A] mt-1">EGP {targetInfo.remainingAmount?.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* ── 3. Bookings Section ── */}
        <div className="bg-white rounded-3xl p-6 border border-[#EBE8E0] shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-[#F0F4EC] text-[#45523A] flex items-center justify-center">
                <Calendar size={20} />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-[#1F251A]">Bookings</h3>
                <p className="text-xs text-[#788272]">Quick overview of today's bookings</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab && onNavigateTab("Bookings")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-[#45523A] border border-[#D5DDD0] hover:bg-[#F0F4EC] transition"
            >
              <span>View All Bookings</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-2">
            <div className="bg-[#FAF9F5] p-4 rounded-2xl border border-[#EBE8E0]">
              <p className="text-[11px] font-semibold text-[#8C9686] uppercase tracking-wider">Total Bookings</p>
              <div className="flex items-center justify-between mt-2">
                <p className="text-2xl font-black text-[#1F251A]">{bookingsInfo.todayCount}</p>
                <Calendar size={18} className="text-[#8C9686]" />
              </div>
            </div>

            <div className="bg-[#FAF9F5] p-4 rounded-2xl border border-[#EBE8E0]">
              <p className="text-[11px] font-semibold text-[#8C9686] uppercase tracking-wider">Pending Approval</p>
              <div className="flex items-center justify-between mt-2">
                <p className="text-2xl font-black text-[#1F251A]">{bookingsInfo.pendingCount}</p>
                <Clock size={18} className="text-[#D97706]" />
              </div>
            </div>

            <div className="bg-[#FAF9F5] p-4 rounded-2xl border border-[#EBE8E0]">
              <p className="text-[11px] font-semibold text-[#8C9686] uppercase tracking-wider">Confirmed</p>
              <div className="flex items-center justify-between mt-2">
                <p className="text-2xl font-black text-[#1F251A]">
                  {bookingsInfo.list.filter((b: any) => String(b.status).toLowerCase() === "confirmed" || String(b.status).toLowerCase() === "checked_in").length}
                </p>
                <CheckCircle2 size={18} className="text-[#1E7E34]" />
              </div>
            </div>

            <div className="bg-[#FAF9F5] p-4 rounded-2xl border border-[#EBE8E0]">
              <p className="text-[11px] font-semibold text-[#8C9686] uppercase tracking-wider">Completed</p>
              <div className="flex items-center justify-between mt-2">
                <p className="text-2xl font-black text-[#1F251A]">
                  {bookingsInfo.list.filter((b: any) => String(b.status).toLowerCase() === "completed").length}
                </p>
                <UserCheck size={18} className="text-[#45523A]" />
              </div>
            </div>

            <div className="bg-[#FAF9F5] p-4 rounded-2xl border border-[#EBE8E0]">
              <p className="text-[11px] font-semibold text-[#8C9686] uppercase tracking-wider">Cancelled</p>
              <div className="flex items-center justify-between mt-2">
                <p className="text-2xl font-black text-[#1F251A]">
                  {bookingsInfo.list.filter((b: any) => String(b.status).toLowerCase() === "cancelled" || String(b.status).toLowerCase() === "rejected").length}
                </p>
                <AlertCircle size={18} className="text-[#DC2626]" />
              </div>
            </div>
          </div>

          {/* Today's Table */}
          <div className="overflow-x-auto pt-2">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#F0EEE6] text-[#8C9686] uppercase text-[10px] font-extrabold tracking-wider">
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Doctor</th>
                  <th className="py-3 px-4">Service</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F7F5F0]">
                {bookingsInfo.list.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#8C9686] italic">
                      No bookings scheduled for today.
                    </td>
                  </tr>
                ) : (
                  bookingsInfo.list.map((row: any, idx: number) => {
                    const isConfirmed = String(row.status || "").toLowerCase() === "confirmed";
                    return (
                      <tr key={`book-row-${idx}`} className="hover:bg-[#FAF9F5] transition">
                        <td className="py-3.5 px-4 font-bold text-[#1F251A]">{row.time}</td>
                        <td className="py-3.5 px-4 font-bold text-[#1F251A]">
                          <div className="flex items-center gap-2">
                            <User size={14} className="text-[#8C9686]" />
                            <span>{row.patientName}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <Stethoscope size={14} className="text-[#8C9686]" />
                            <span>{row.doctorName}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <Sparkles size={14} className="text-[#8C9686]" />
                            <span>{row.service}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold ${
                              isConfirmed
                                ? "bg-[#E6F4EA] text-[#1E7E34]"
                                : "bg-[#FEF3C7] text-[#D97706]"
                            }`}
                          >
                            {isConfirmed ? "Confirmed" : "Pending Approval"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      {/* ── START SHIFT POPUP MODAL WITH FADED BACKGROUND ── */}
      {showStartShiftPopup && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-sm rounded-[32px] bg-white p-8 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Waving Hand Emoji Circle */}
            <div className="h-20 w-20 rounded-full bg-[#EBF0E6] flex items-center justify-center mx-auto text-4xl shadow-inner select-none">
              👋
            </div>

            {/* Title and Subtitle */}
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-[#1F251A] flex items-center justify-center gap-1.5">
                Hi, {receptionistName} <span className="inline-block text-xl">👋</span>
              </h3>
              <p className="text-xs sm:text-sm text-[#5A6A51] leading-relaxed max-w-[260px] mx-auto">
                Start your shift now to track your work and stay organized.
              </p>
            </div>

            {/* Error Message Box */}
            {locationError && (
              <div className="rounded-2xl bg-amber-50 border border-amber-200/80 p-3.5 text-left flex items-start gap-2.5 text-xs text-amber-900 animate-in fade-in duration-150">
                <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="font-semibold leading-snug">{locationError}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                disabled={shiftProcessing}
                onClick={handleStartShiftWithLocation}
                className="w-full flex items-center justify-center gap-3 bg-[#414E36] hover:bg-[#323D2A] text-white py-3.5 px-6 rounded-2xl font-bold text-sm shadow-md transition disabled:opacity-60 cursor-pointer"
              >
                {shiftProcessing ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center">
                    <Play size={12} fill="white" className="ml-0.5" />
                  </div>
                )}
                <span>{shiftProcessing ? "Verifying Location..." : "Start Shift"}</span>
              </button>

              <button
                type="button"
                disabled={shiftProcessing}
                onClick={() => {
                  setShowStartShiftPopup(false);
                  setLocationError(null);
                }}
                className="w-full py-3 px-6 rounded-2xl font-bold text-sm text-[#1F251A] border border-[#E6E9EB] hover:bg-[#F2EFE9] transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
