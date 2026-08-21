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
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  PieChart,
  History
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

  // Accordion open/close states matching design
  const [isShiftExpanded, setIsShiftExpanded] = useState(true);
  const [isBookingsExpanded, setIsBookingsExpanded] = useState(false);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [isActivitiesExpanded, setIsActivitiesExpanded] = useState(false);

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

  // Real-time live timer calculated strictly from the recorded check-in timestamp
  // Works seamlessly when switching tabs, minimizing browser, or refreshing page
  useEffect(() => {
    const checkInTimeIso = dashboardData?.shift?.checkInTime;
    if (dashboardData?.shift?.status !== "started" || !checkInTimeIso) return;

    const calculateElapsed = () => {
      const checkInMs = new Date(checkInTimeIso).getTime();
      if (isNaN(checkInMs)) return;
      const nowMs = Date.now();
      const elapsedSec = Math.max(0, Math.floor((nowMs - checkInMs) / 1000));
      setLiveElapsedSeconds(elapsedSec);
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, 1000);

    const handleSync = () => {
      calculateElapsed();
    };

    window.addEventListener("focus", handleSync);
    window.addEventListener("pageshow", handleSync);
    document.addEventListener("visibilitychange", handleSync);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleSync);
      window.removeEventListener("pageshow", handleSync);
      document.removeEventListener("visibilitychange", handleSync);
    };
  }, [dashboardData?.shift?.status, dashboardData?.shift?.checkInTime]);

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

  // Helper to format live elapsed time as 02h 37m
  const formatElapsedTime = (totalSecs: number) => {
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const paddedHours = hours.toString().padStart(2, "0");
    const paddedMins = mins.toString().padStart(2, "0");
    return `${paddedHours}h ${paddedMins}m`;
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
    <div className="space-y-4 pb-8">
      {/* ── 1. Today's Shift Card ── */}
      <div className="bg-white rounded-3xl p-6 border border-[#EBE8E0] shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-full bg-[#F0F4EC] text-[#45523A] flex items-center justify-center shrink-0">
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#1F251A]">Today's Shift</h3>
              <p className="text-xs text-[#788272]">Your scheduled working hours</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={shiftProcessing}
              onClick={handleShiftAction}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm ${
                shiftInfo.status === "started"
                  ? "bg-[#1E2918] text-white hover:bg-[#2F3D27]"
                  : "bg-[#45523A] text-white hover:bg-[#35452C]"
              } disabled:opacity-50 cursor-pointer`}
            >
              <LogOut size={15} />
              <span>{shiftProcessing ? "Updating..." : shiftInfo.status === "started" ? "End Shift" : "Start Shift"}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsShiftExpanded(!isShiftExpanded)}
              className="p-2 text-[#45523A] hover:bg-[#F0F4EC] rounded-xl transition cursor-pointer"
              title={isShiftExpanded ? "Collapse section" : "Expand section"}
            >
              {isShiftExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>
        </div>

        {isShiftExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-[#F3F0E8] animate-in fade-in duration-200">
            {/* Metric 1: Actual Starting Time */}
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-[#F0F4EC] text-[#45523A] flex items-center justify-center shrink-0">
                <Play size={18} fill="#45523A" className="ml-0.5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-[#8C9686] uppercase tracking-wider">Actual Starting Time</p>
                <p className="text-2xl font-black text-[#1F251A] mt-1">{shiftInfo.actualStartingTime}</p>
              </div>
            </div>

            {/* Metric 2: Elapsed Time */}
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-[#F0F4EC] text-[#45523A] flex items-center justify-center shrink-0">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-[#8C9686] uppercase tracking-wider">Elapsed Time</p>
                <p className="text-2xl font-black text-[#1F251A] mt-1">
                  {shiftInfo.status === "started" ? formatElapsedTime(liveElapsedSeconds) : shiftInfo.elapsedTime}
                </p>
              </div>
            </div>

            {/* Metric 3: Status */}
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-[#F0F4EC] text-[#45523A] flex items-center justify-center shrink-0">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-[#8C9686] uppercase tracking-wider">Status</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${shiftInfo.status === "started" ? "bg-emerald-600 animate-pulse" : "bg-amber-500"}`} />
                  <p className={`text-base font-extrabold ${shiftInfo.status === "started" ? "text-emerald-700" : "text-amber-700"}`}>
                    {shiftInfo.status === "started" ? "Shift Started" : shiftInfo.status === "ended" ? "Shift Ended" : "Not Started"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 2. Bookings Section ── */}
      <div className="bg-white rounded-3xl p-6 border border-[#EBE8E0] shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-full bg-[#F0F4EC] text-[#45523A] flex items-center justify-center shrink-0">
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#1F251A]">Bookings</h3>
              <p className="text-xs text-[#788272]">Quick overview of today's bookings</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigateTab && onNavigateTab("Bookings")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-[#45523A] border border-[#D5DDD0] hover:bg-[#F0F4EC] transition"
            >
              <span>View All Bookings</span>
              <ArrowRight size={14} />
            </button>

            <button
              type="button"
              onClick={() => setIsBookingsExpanded(!isBookingsExpanded)}
              className="p-2 text-[#45523A] hover:bg-[#F0F4EC] rounded-xl transition cursor-pointer"
              title={isBookingsExpanded ? "Collapse section" : "Expand section"}
            >
              {isBookingsExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>
        </div>

        {isBookingsExpanded && (
          <div className="space-y-4 pt-4 border-t border-[#F3F0E8] animate-in fade-in duration-200">
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
        )}
      </div>

      {/* ── 4. Today's Summary Card ── */}
      <div className="bg-white rounded-3xl p-6 border border-[#EBE8E0] shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-full bg-[#F0F4EC] text-[#45523A] flex items-center justify-center shrink-0">
              <PieChart size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#1F251A]">Today's Summary</h3>
              <p className="text-xs text-[#788272]">Overview of your daily performance</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
            className="p-2 text-[#45523A] hover:bg-[#F0F4EC] rounded-xl transition cursor-pointer"
            title={isSummaryExpanded ? "Collapse section" : "Expand section"}
          >
            {isSummaryExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>

        {isSummaryExpanded && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-[#F3F0E8] animate-in fade-in duration-200">
            <div className="bg-[#FAF9F5] p-4 rounded-2xl border border-[#EBE8E0]">
              <p className="text-[11px] font-semibold text-[#8C9686] uppercase tracking-wider">Scheduled Today</p>
              <p className="text-2xl font-black text-[#1F251A] mt-1">{bookingsInfo.todayCount}</p>
            </div>
            <div className="bg-[#FAF9F5] p-4 rounded-2xl border border-[#EBE8E0]">
              <p className="text-[11px] font-semibold text-[#8C9686] uppercase tracking-wider">Confirmed Rate</p>
              <p className="text-2xl font-black text-emerald-700 mt-1">
                {bookingsInfo.todayCount > 0
                  ? `${Math.round((bookingsInfo.list.filter((b: any) => b.status === "confirmed").length / bookingsInfo.todayCount) * 100)}%`
                  : "100%"}
              </p>
            </div>
            <div className="bg-[#FAF9F5] p-4 rounded-2xl border border-[#EBE8E0]">
              <p className="text-[11px] font-semibold text-[#8C9686] uppercase tracking-wider">Completed</p>
              <p className="text-2xl font-black text-[#45523A] mt-1">
                {bookingsInfo.list.filter((b: any) => String(b.status).toLowerCase() === "completed").length}
              </p>
            </div>
            <div className="bg-[#FAF9F5] p-4 rounded-2xl border border-[#EBE8E0]">
              <p className="text-[11px] font-semibold text-[#8C9686] uppercase tracking-wider">Current Status</p>
              <p className="text-2xl font-black text-[#1F251A] mt-1 capitalize">
                {shiftInfo.status === "started" ? "Active" : "Idle"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── 4. Recent Activities Card ── */}
      <div className="bg-white rounded-3xl p-6 border border-[#EBE8E0] shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-full bg-[#F0F4EC] text-[#45523A] flex items-center justify-center shrink-0">
              <History size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#1F251A]">Recent Activities</h3>
              <p className="text-xs text-[#788272]">Your latest actions and updates</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsActivitiesExpanded(!isActivitiesExpanded)}
            className="p-2 text-[#45523A] hover:bg-[#F0F4EC] rounded-xl transition cursor-pointer"
            title={isActivitiesExpanded ? "Collapse section" : "Expand section"}
          >
            {isActivitiesExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>

        {isActivitiesExpanded && (
          <div className="pt-4 border-t border-[#F3F0E8] animate-in fade-in duration-200">
            {bookingsInfo.list.length === 0 ? (
              <p className="text-xs text-[#8C9686] italic py-4 text-center">No recent actions recorded today.</p>
            ) : (
              <div className="space-y-3">
                {bookingsInfo.list.slice(0, 5).map((b: any, bIdx: number) => (
                  <div key={`act-${bIdx}`} className="flex items-center justify-between bg-[#FAF9F5] p-3 rounded-2xl border border-[#EBE8E0] text-xs">
                    <div className="flex items-center gap-3">
                      <span className="h-2 w-2 rounded-full bg-[#45523A]" />
                      <span className="font-bold text-[#1F251A]">{b.patientName}</span>
                      <span className="text-[#8C9686]">— {b.service}</span>
                    </div>
                    <span className="font-semibold text-[#5A6A51]">{b.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
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
