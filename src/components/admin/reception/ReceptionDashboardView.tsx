"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Calendar,
  Clock,
  Play,
  LogOut,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  CreditCard,
  User,
  Plus,
  ChevronRight,
  MoreVertical,
  DollarSign,
  Zap,
  Wallet,
  Building2,
  ChevronDown,
  X,
  Sparkles,
  UserX,
  FileText,
  Eye,
  Bell,
  Package,
  Wrench,
  Check
} from "lucide-react";

interface ReceptionDashboardViewProps {
  receptionistName?: string;
  receptionistRole?: string;
  employeeId?: string;
  email?: string;
  accessToken?: string;
  onNavigateTab?: (tabName: string) => void;
  onNewBooking?: () => void;
  onNewPatient?: () => void;
  onViewBookingDetails?: (booking: any) => void;
  onViewTransactions?: () => void;
  onPendingApprovalsClick?: () => void;
  onLogout?: () => void;
  activeBranchName?: string;
  activeBranchNameAr?: string;
  branchId?: string | null;
  todayReservations?: any[];
  lang?: "en" | "ar";
  t?: any;
}

export default function ReceptionDashboardView({
  receptionistName = "",
  receptionistRole = "",
  employeeId,
  email,
  accessToken,
  onNavigateTab,
  onNewBooking,
  onNewPatient,
  onViewBookingDetails,
  onViewTransactions,
  onPendingApprovalsClick,
  onLogout,
  activeBranchName = "New Cairo Branch",
  activeBranchNameAr = "فرع التجمع الخامس",
  branchId,
  todayReservations,
  lang = "en",
  t
}: ReceptionDashboardViewProps) {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const effectiveName = dashboardData?.receptionist?.name || receptionistName || "Employee";
  const [loading, setLoading] = useState(true);
  const [shiftProcessing, setShiftProcessing] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showStartShiftPopup, setShowStartShiftPopup] = useState(false);
  const [showEndShiftModal, setShowEndShiftModal] = useState(false);
  const [showAllAlertsModal, setShowAllAlertsModal] = useState(false);
  const [alertsFilter, setAlertsFilter] = useState<string>("all");
  const [liveElapsedSeconds, setLiveElapsedSeconds] = useState(0);
  const [hasAutoPrompted, setHasAutoPrompted] = useState(false);
  const [activeBookingMenuId, setActiveBookingMenuId] = useState<string | number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close 3-dots row menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveBookingMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch Reception Dashboard data from backend API
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (employeeId) params.set("employeeId", employeeId);
      if (email) params.set("email", email);
      if (branchId && branchId !== "All") params.set("branchId", branchId);

      // Send local client date in YYYY-MM-DD
      const now = new Date();
      const localTodayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      params.set("date", localTodayStr);

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

    const handleRefresh = () => {
      fetchDashboardData();
    };

    window.addEventListener("focus", handleRefresh);
    window.addEventListener("revera-booking-change", handleRefresh);

    return () => {
      window.removeEventListener("focus", handleRefresh);
      window.removeEventListener("revera-booking-change", handleRefresh);
    };
  }, [employeeId, email, accessToken, branchId]);

  // Real-time live timer calculated from shift interval start
  useEffect(() => {
    const shiftStatus = dashboardData?.shift?.status;
    const sessionStartIso = dashboardData?.shift?.currentSessionStart || dashboardData?.shift?.checkInTime;
    const pastSeconds = Number(dashboardData?.shift?.pastSessionsSeconds || 0);

    if (shiftStatus !== "started" || !sessionStartIso) {
      if (dashboardData?.shift?.elapsedSeconds !== undefined) {
        setLiveElapsedSeconds(dashboardData.shift.elapsedSeconds);
      }
      return;
    }

    const calculateElapsed = () => {
      const sessionStartMs = new Date(sessionStartIso).getTime();
      if (isNaN(sessionStartMs)) return;
      const nowMs = Date.now();
      const currentSessionSec = Math.max(0, Math.floor((nowMs - sessionStartMs) / 1000));
      setLiveElapsedSeconds(pastSeconds + currentSessionSec);
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
  }, [
    dashboardData?.shift?.status,
    dashboardData?.shift?.currentSessionStart,
    dashboardData?.shift?.checkInTime,
    dashboardData?.shift?.pastSessionsSeconds,
    dashboardData?.shift?.elapsedSeconds
  ]);

  // Execute Start Shift
  const handleStartShift = async () => {
    setLocationError(null);
    setShiftProcessing(true);

    const isGpsRequired = dashboardData?.shift?.gpsShiftEnabled !== false;

    if (!isGpsRequired) {
      try {
        const res = await fetch("/api/reception/dashboard", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
          },
          body: JSON.stringify({
            action: "start_shift",
            employeeId,
            email
          })
        });

        const result = await res.json();
        if (result.success) {
          setShowStartShiftPopup(false);
          setLocationError(null);
          await fetchDashboardData();
        } else {
          setLocationError(result.error || result.message || "generic");
        }
      } catch (err) {
        console.error("Direct start shift error:", err);
        setLocationError("generic");
      } finally {
        setShiftProcessing(false);
      }
      return;
    }

    if (typeof window === "undefined" || !navigator.geolocation) {
      setLocationError("permission_denied");
      setShiftProcessing(false);
      return;
    }

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
              setLocationError("out_of_location");
            } else if (result.error === "location_permission_denied" || (result.message && result.message.includes("permission"))) {
              setLocationError("permission_denied");
            } else {
              setLocationError(result.error || result.message || "generic");
            }
            setShowStartShiftPopup(true);
          }
        } catch (err: any) {
          console.error("Start shift network/server error:", err);
          setLocationError("generic");
          setShowStartShiftPopup(true);
        } finally {
          setShiftProcessing(false);
        }
      },
      (geoErr) => {
        setShiftProcessing(false);
        if (geoErr.code === geoErr.PERMISSION_DENIED || geoErr.code === 1) {
          setLocationError("permission_denied");
        } else if (geoErr.code === geoErr.POSITION_UNAVAILABLE || geoErr.code === 2) {
          setLocationError("position_unavailable");
        } else if (geoErr.code === geoErr.TIMEOUT || geoErr.code === 3) {
          setLocationError("timeout");
        } else {
          setLocationError("permission_denied");
        }
        setShowStartShiftPopup(true);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Confirm End Shift
  const handleConfirmEndShift = async () => {
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
        setShowEndShiftModal(false);
        await fetchDashboardData();
      }
    } catch (err) {
      console.error("End shift failed:", err);
    } finally {
      setShiftProcessing(false);
    }
  };

  // Helpers
  const formatElapsedTime = (totalSecs: number) => {
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  const formatCurrency = (val?: number) => {
    const num = Number(val || 0);
    return `${num.toLocaleString()} EGP`;
  };

  const dir = lang === "ar" ? "rtl" : "ltr";
  const tr = t || {};

  // Status mapping
  const rawStatus = dashboardData?.shift?.status || "not_started";
  const isNotStarted = rawStatus === "not_started";
  const isInProgress = rawStatus === "started" || rawStatus === "in_progress";
  const isCompleted = rawStatus === "ended" || rawStatus === "completed";

  // Branch Name resolution
  const displayBranchName = lang === "ar" 
    ? (dashboardData?.receptionist?.branchNameAr || activeBranchNameAr)
    : (dashboardData?.receptionist?.branchNameEn || activeBranchName);

  // Formatted current date
  const todayFormatted = useMemo(() => {
    const d = new Date();
    if (lang === "ar") {
      return d.toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "short", day: "numeric" });
    }
    return d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "short", day: "numeric" });
  }, [lang]);

  const todayShortDate = useMemo(() => {
    const d = new Date();
    if (lang === "ar") {
      return d.toLocaleDateString("ar-EG", { month: "short", day: "numeric", year: "numeric" });
    }
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }, [lang]);

  // Dynamic greeting based on time of day
  const greetingData = useMemo(() => {
    if (isCompleted) {
      return {
        title: tr.shiftCompletedGreeting ?? "Shift Completed",
        subtitle: tr.shiftCompletedSubtitle ?? "Great work today! Here's a summary of your shift.",
        icon: "✅"
      };
    }
    const currentHour = new Date().getHours();
    if (currentHour < 12) {
      return {
        title: tr.goodMorning ?? "Good Morning",
        subtitle: tr.morningSubtitle ?? "Let's make today a great day at Revera Clinics.",
        icon: "👋"
      };
    }
    return {
      title: tr.goodAfternoon ?? "Good Afternoon",
      subtitle: tr.afternoonSubtitle ?? "You're doing great! Keep it up.",
      icon: "👋"
    };
  }, [isCompleted, tr]);

  // Current live time for End Shift Modal
  const currentTimeFormatted = useMemo(() => {
    return new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  }, []);

  // Fallback today bookings from props if dashboard API is loading or returned empty
  const fallbackBookingsList = useMemo(() => {
    if (!Array.isArray(todayReservations) || todayReservations.length === 0) return [];
    const now = new Date();
    const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const egyptToday = now.toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });
    const utcToday = now.toISOString().split("T")[0];

    return todayReservations
      .filter((r: any) => {
        if (!r.date) return false;
        const dStr = String(r.date).slice(0, 10);
        return dStr === localToday || dStr === egyptToday || dStr === utcToday;
      })
      .map((r: any) => ({
        id: r.id,
        time: r.timeSlot || r.time_slot || r.requestedTime || r.requested_time || "09:00 AM",
        patientName: r.name || r.patient_name || r.patientName || "Patient",
        patientPhone: r.phone || r.mobile || "—",
        doctorName: r.doctorName || r.doctor_name || "Dr. Assigned",
        doctorSpecialty: r.specialty || "Specialist",
        doctorImage: null,
        service: r.serviceName || r.service || (r.serviceId ? `Service #${r.serviceId}` : "Consultation"),
        status: r.status || "confirmed",
        paymentStatus: r.amountPaid && Number(r.amountPaid) > 0 ? "Paid" : "Unpaid",
        amountPaid: Number(r.amountPaid || r.amount_paid || 0),
        amountLeft: Number(r.amountLeft || r.amount_left || 0),
        totalPrice: Number(r.cost || r.totalPrice || r.amountPaid || 0),
        raw: r
      }));
  }, [todayReservations]);

  // Bookings list
  const bookingsList = (Array.isArray(dashboardData?.bookings?.list) && dashboardData.bookings.list.length > 0)
    ? dashboardData.bookings.list
    : fallbackBookingsList;

  // Overview metrics
  const todayBookingsCount = dashboardData?.overview?.todayBookingsCount ?? dashboardData?.bookings?.todayCount ?? bookingsList.length;
  const pendingApprovalCount = dashboardData?.overview?.pendingApprovalCount ?? dashboardData?.bookings?.pendingCount ?? 0;
  const expectedPayments = dashboardData?.overview?.expectedPayments ?? 0;
  const upcomingConfirmationsCount = dashboardData?.overview?.upcomingConfirmationsCount ?? 0;

  // Performance metrics (End of day)
  const completedCount = dashboardData?.performance?.completedCount ?? 0;
  const cancelledCount = dashboardData?.performance?.cancelledCount ?? 0;
  const noShowsCount = dashboardData?.performance?.noShowsCount ?? 0;

  // Payments received breakdown
  const payments = dashboardData?.payments || {
    cash: 0,
    visa: 0,
    instapay: 0,
    wallet: 0,
    totalPayments: 0
  };

  // Pending items count
  const pendingItemsCount = dashboardData?.pendingItems?.pendingBookingsCount ?? pendingApprovalCount;

  const resolveLocationError = (code: string | null) => {
    if (!code) return null;
    return tr?.errors?.[code] ?? code;
  };

  return (
    <div dir={dir} className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* ── TOP HEADER / GREETING BAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1F251A] tracking-tight flex items-center gap-2">
            <span>{greetingData.title}</span>
            <span>{greetingData.icon}</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#788272] mt-1 font-medium">
            {greetingData.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl border border-[#EBE8E0] shadow-xs shrink-0 self-start sm:self-auto">
          <div className="h-9 w-9 rounded-xl bg-[#F0F4EC] text-[#414E36] flex items-center justify-center shrink-0">
            <Calendar size={18} />
          </div>
          <div>
            <p className="text-xs font-bold text-[#1F251A]">{todayFormatted}</p>
            <p className="text-[11px] text-[#788272] font-medium">{displayBranchName}</p>
          </div>
        </div>
      </div>

      {/* ── 1. TODAY'S SHIFT / SHIFT SUMMARY CARD ── */}
      <div className="bg-white rounded-3xl p-6 border border-[#EBE8E0] shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F3F0E8]">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-full bg-[#F0F4EC] text-[#414E36] flex items-center justify-center shrink-0">
              <Clock size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#1F251A]">
                {isCompleted ? (tr.shiftSummaryTitle ?? "Shift Summary") : (tr.shiftTitle ?? "Today's Shift")}
              </h3>
              <p className="text-xs text-[#788272]">
                {isCompleted
                  ? (tr.completedStatus ?? "Completed")
                  : isInProgress
                  ? (tr.shiftInProgress ?? "Shift in Progress")
                  : (tr.shiftSubtitle ?? "Your scheduled working hours")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Shift Status Pill Badge */}
            {isNotStarted && (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200/60">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                <span>{tr.notStarted ?? "Not Started"}</span>
              </span>
            )}

            {isInProgress && (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{tr.shiftInProgress ?? "Shift in Progress"}</span>
              </span>
            )}

            {isCompleted && (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                <Check size={14} className="text-emerald-700" />
                <span>{tr.completedStatus ?? "Completed"}</span>
              </span>
            )}

            {/* Shift Action CTA Button */}
            {isNotStarted && (
              <button
                type="button"
                disabled={shiftProcessing}
                onClick={handleStartShift}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#414E36] hover:bg-[#343e2b] text-white shadow-sm transition disabled:opacity-50 cursor-pointer"
              >
                <Play size={14} fill="currentColor" />
                <span>{shiftProcessing ? (tr.updating ?? "Updating...") : (tr.startShift ?? "Start Shift")}</span>
              </button>
            )}

            {isInProgress && (
              <button
                type="button"
                disabled={shiftProcessing}
                onClick={() => setShowEndShiftModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-white border border-[#E0DCCE] hover:bg-[#F2EFE9] text-[#1F251A] shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                <LogOut size={14} />
                <span>{shiftProcessing ? (tr.updating ?? "Updating...") : (tr.endShift ?? "End Shift")}</span>
              </button>
            )}
          </div>
        </div>

        {/* Location Error In-Card Alert Banner */}
        {locationError && isNotStarted && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200/80 p-3.5 text-start flex items-start gap-2.5 text-xs text-amber-900 animate-in fade-in duration-150">
            <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-bold">{tr.errors?.out_of_location || "Location verification failed"}</p>
              <p className="text-[11px] text-amber-800/90 mt-0.5 font-medium">{resolveLocationError(locationError)}</p>
            </div>
            <button
              type="button"
              onClick={() => setLocationError(null)}
              className="text-amber-600 hover:text-amber-900 p-1 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* 4 Shift Metrics Columns */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {/* 1. Today's Date */}
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-[#F0F4EC] text-[#414E36] flex items-center justify-center shrink-0">
              <Calendar size={18} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#8C9686] uppercase tracking-wider">{tr.todayDate ?? "Today's Date"}</p>
              <p className="text-base sm:text-lg font-black text-[#1F251A] mt-0.5">{todayShortDate}</p>
            </div>
          </div>

          {/* 2. Shift Start */}
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-[#F0F4EC] text-[#414E36] flex items-center justify-center shrink-0">
              <Clock size={18} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#8C9686] uppercase tracking-wider">{tr.shiftStart ?? "Shift Start"}</p>
              <p className="text-base sm:text-lg font-black text-[#1F251A] mt-0.5">
                {isNotStarted ? "—" : (dashboardData?.shift?.actualStartingTime || "--:--")}
              </p>
            </div>
          </div>

          {/* 3. Shift End */}
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-[#F0F4EC] text-[#414E36] flex items-center justify-center shrink-0">
              <Clock size={18} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#8C9686] uppercase tracking-wider">{tr.shiftEnd ?? "Shift End"}</p>
              <p className="text-base sm:text-lg font-black text-[#1F251A] mt-0.5">
                {isCompleted
                  ? (dashboardData?.shift?.actualEndingTime || "--:--")
                  : (dashboardData?.shift?.scheduledEnd || "06:00 PM")}
              </p>
            </div>
          </div>

          {/* 4. Working Hours */}
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-[#F0F4EC] text-[#414E36] flex items-center justify-center shrink-0">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#8C9686] uppercase tracking-wider">{tr.workingHours ?? "Working Hours"}</p>
              <p className="text-base sm:text-lg font-black text-[#1F251A] mt-0.5">
                {isNotStarted
                  ? "—"
                  : isInProgress
                  ? formatElapsedTime(liveElapsedSeconds)
                  : (dashboardData?.shift?.totalWorkingHours || "0h 0m")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── STATES 1 & 2: NOT STARTED & IN PROGRESS CONTENT ── */}
      {!isCompleted && (
        <>
          {/* ── 2. TODAY'S OVERVIEW (3 COMPACT KPI CARDS) ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-[#414E36]" />
              <h2 className="text-base font-bold text-[#1F251A]">{tr.todaysOverview ?? "Today's Overview"}</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              {/* Card 1: Today's Bookings */}
              <div
                onClick={() => onNavigateTab ? onNavigateTab("Bookings") : null}
                className="bg-white p-5 rounded-3xl border border-[#EBE8E0] shadow-xs flex items-center gap-4 hover:shadow-md transition cursor-pointer"
              >
                <div className="h-14 w-14 rounded-2xl bg-[#EBF0E6] text-[#414E36] flex items-center justify-center shrink-0">
                  <Calendar size={24} />
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-black text-[#1F251A]">{todayBookingsCount}</p>
                  <p className="text-xs font-bold text-[#1F251A] mt-0.5">{tr.todaysBookings ?? "Today's Bookings"}</p>
                  <p className="text-[11px] text-[#788272] font-medium">{tr.scheduledForToday ?? "Scheduled for today"}</p>
                </div>
              </div>

              {/* Card 2: Pending Approval */}
              <div
                onClick={() => {
                  if (onPendingApprovalsClick) onPendingApprovalsClick();
                  else if (onNavigateTab) onNavigateTab("Bookings");
                }}
                className="bg-white p-5 rounded-3xl border border-[#EBE8E0] shadow-xs flex items-center gap-4 hover:shadow-md transition cursor-pointer"
              >
                <div className="h-14 w-14 rounded-2xl bg-[#FEF3E6] text-[#D97706] flex items-center justify-center shrink-0">
                  <Clock size={24} />
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-black text-[#1F251A]">{pendingApprovalCount}</p>
                  <p className="text-xs font-bold text-[#1F251A] mt-0.5">{tr.pendingApproval ?? "Pending Approval"}</p>
                  <p className="text-[11px] text-[#788272] font-medium">{tr.bookingsWaitingForAction ?? "Bookings waiting for action"}</p>
                </div>
              </div>

              {/* Card 3: Expected Payments */}
              <div
                onClick={() => onViewTransactions ? onViewTransactions() : onNavigateTab?.("Finance")}
                className="bg-white p-5 rounded-3xl border border-[#EBE8E0] shadow-xs flex items-center gap-4 hover:shadow-md transition cursor-pointer"
              >
                <div className="h-14 w-14 rounded-2xl bg-[#EAF2FA] text-[#2563EB] flex items-center justify-center shrink-0">
                  <CreditCard size={24} />
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-black text-[#1F251A]">{formatCurrency(expectedPayments)}</p>
                  <p className="text-xs font-bold text-[#1F251A] mt-0.5">{tr.expectedPayments ?? "Expected Payments"}</p>
                  <p className="text-[11px] text-[#788272] font-medium">{tr.toBeCollectedToday ?? "To be collected today"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── 3. 2-COLUMN OPERATIONAL GRID: QUICK ACTIONS & ATTENTION NEEDED ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Quick Actions Card */}
            <div className="bg-white rounded-3xl p-6 border border-[#EBE8E0] shadow-sm space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-[#F0F4EC] text-[#414E36] flex items-center justify-center shrink-0">
                  <Plus size={18} />
                </div>
                <h3 className="text-base font-bold text-[#1F251A]">{tr.quickActions ?? "Quick Actions"}</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => onNewBooking ? onNewBooking() : onNavigateTab?.("Bookings")}
                  className="w-full bg-[#414E36] hover:bg-[#343e2b] text-white py-3.5 px-4 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                >
                  <Plus size={16} />
                  <span>{tr.newBooking ?? "New Booking"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onNewPatient ? onNewPatient() : onNavigateTab?.("Patients")}
                  className="w-full bg-white border border-[#E0DCCE] hover:bg-[#FAF9F5] text-[#1F251A] py-3.5 px-4 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-2xs transition cursor-pointer"
                >
                  <Plus size={16} />
                  <span>{tr.newPatient ?? "New Patient"}</span>
                </button>
              </div>
            </div>

            {/* Attention Needed Card */}
            <div className="bg-white rounded-3xl p-6 border border-[#EBE8E0] shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                    <AlertCircle size={18} />
                  </div>
                  <h3 className="text-base font-bold text-[#1F251A]">{tr.attentionNeeded ?? "Attention Needed"}</h3>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigateTab ? onNavigateTab("Bookings") : null}
                  className="text-xs font-bold text-[#414E36] hover:underline cursor-pointer"
                >
                  {tr.viewAll ?? "View All"}
                </button>
              </div>

              <div className="space-y-2.5 pt-1">
                {/* Item 1: Pending Approval */}
                <div
                  onClick={() => {
                    if (onPendingApprovalsClick) onPendingApprovalsClick();
                    else if (onNavigateTab) onNavigateTab("Bookings");
                  }}
                  className="flex items-center justify-between p-3 rounded-2xl bg-[#FAF9F5] border border-[#EBE8E0] hover:bg-[#F2EFE9] transition cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-[#FEF3E6] text-[#D97706] flex items-center justify-center shrink-0">
                      <Clock size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#1F251A]">
                        {pendingApprovalCount} {tr.bookingsPendingApproval ?? "bookings pending approval"}
                      </p>
                      <p className="text-[11px] text-[#788272] font-medium">{tr.needYourConfirmation ?? "Need your confirmation"}</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-[#8C9686] group-hover:translate-x-0.5 transition-transform shrink-0" />
                </div>

                {/* Item 2: Upcoming Confirmation */}
                <div
                  onClick={() => onNavigateTab ? onNavigateTab("Bookings") : null}
                  className="flex items-center justify-between p-3 rounded-2xl bg-[#FAF9F5] border border-[#EBE8E0] hover:bg-[#F2EFE9] transition cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-[#EAF2FA] text-[#2563EB] flex items-center justify-center shrink-0">
                      <Calendar size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#1F251A]">
                        {upcomingConfirmationsCount} {tr.upcomingConfirmations ?? "upcoming confirmations"}
                      </p>
                      <p className="text-[11px] text-[#788272] font-medium">{tr.inTheNext30Minutes ?? "In the next 30 minutes"}</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-[#8C9686] group-hover:translate-x-0.5 transition-transform shrink-0" />
                </div>
              </div>
            </div>
          </div>

          {/* ── 4. TODAY'S BOOKINGS TABLE ── */}
          <div className="bg-white rounded-3xl p-6 border border-[#EBE8E0] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-[#F0F4EC] text-[#414E36] flex items-center justify-center shrink-0">
                  <Calendar size={18} />
                </div>
                <h3 className="text-base font-bold text-[#1F251A]">{tr.todaysBookings ?? "Today's Bookings"}</h3>
              </div>

              <button
                type="button"
                onClick={() => onNavigateTab ? onNavigateTab("Bookings") : null}
                className="text-xs font-bold text-[#414E36] hover:underline cursor-pointer"
              >
                {tr.viewAll ?? "View All"}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#F0EEE6] text-[#8C9686] uppercase text-[10px] font-extrabold tracking-wider">
                    <th className="py-3 px-3.5 text-start">{tr.time ?? "Time"}</th>
                    <th className="py-3 px-3.5 text-start">{tr.patient ?? "Patient"}</th>
                    <th className="py-3 px-3.5 text-start">{tr.doctor ?? "Doctor"}</th>
                    <th className="py-3 px-3.5 text-start">{tr.service ?? "Service"}</th>
                    <th className="py-3 px-3.5 text-start">{tr.status ?? "Status"}</th>
                    <th className="py-3 px-3.5 text-start">{tr.payment ?? "Payment"}</th>
                    <th className="py-3 px-3.5 text-end">{tr.action ?? "Action"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F7F5F0]">
                  {bookingsList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[#8C9686] italic">
                        {tr.noBookingsToday ?? "No bookings scheduled for today."}
                      </td>
                    </tr>
                  ) : (
                    bookingsList.map((row: any) => {
                      const stLower = String(row.status || "").toLowerCase();
                      const isConfirmed = stLower === "confirmed" || stLower === "approved";
                      const isPending = stLower === "pending" || stLower === "pending_approval";
                      const isCompletedRow = stLower === "completed";
                      const isCancelled = stLower === "cancelled" || stLower === "rejected";
                      const isNoShow = stLower === "no_show";

                      const paySt = row.paymentStatus || "Unpaid";
                      const isPaid = paySt === "Paid";
                      const isPartial = paySt === "Partial";

                      return (
                        <tr
                          key={row.id}
                          onClick={() => onViewBookingDetails ? onViewBookingDetails(row.raw || row) : onNavigateTab?.("Bookings")}
                          className="hover:bg-[#FAF9F5] transition cursor-pointer group"
                        >
                          {/* 1. Time */}
                          <td className="py-3.5 px-3.5 font-black text-[#1F251A] whitespace-nowrap">
                            {row.time}
                          </td>

                          {/* 2. Patient */}
                          <td className="py-3.5 px-3.5">
                            <div>
                              <p className="font-bold text-[#1F251A]">{row.patientName}</p>
                              <p className="text-[11px] text-[#8C9686] font-medium">{row.patientPhone}</p>
                            </div>
                          </td>

                          {/* 3. Doctor */}
                          <td className="py-3.5 px-3.5">
                            <div className="flex items-center gap-2.5">
                              {row.doctorImage ? (
                                <img
                                  src={row.doctorImage}
                                  alt={row.doctorName}
                                  className="h-7 w-7 rounded-full object-cover border border-[#EBE8E0]"
                                />
                              ) : (
                                <div className="h-7 w-7 rounded-full bg-[#EBF0E6] text-[#414E36] flex items-center justify-center text-[10px] font-bold shrink-0">
                                  {row.doctorName?.slice(0, 2)?.toUpperCase() || "DR"}
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-[#1F251A] whitespace-nowrap">{row.doctorName}</p>
                                <p className="text-[10px] text-[#8C9686] font-medium">{row.doctorSpecialty}</p>
                              </div>
                            </div>
                          </td>

                          {/* 4. Service */}
                          <td className="py-3.5 px-3.5 font-medium text-[#414E36] whitespace-nowrap">
                            {row.service}
                          </td>

                          {/* 5. Status Badge */}
                          <td className="py-3.5 px-3.5 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                isConfirmed
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                                  : isPending
                                  ? "bg-amber-50 text-amber-700 border border-amber-200/60"
                                  : isCompletedRow
                                  ? "bg-stone-100 text-stone-700"
                                  : isCancelled
                                  ? "bg-red-50 text-red-700"
                                  : isNoShow
                                  ? "bg-purple-50 text-purple-700"
                                  : "bg-emerald-50 text-emerald-700"
                              }`}
                            >
                              {isConfirmed ? (tr.confirmed ?? "Confirmed") : isPending ? (tr.pendingApproval ?? "Pending") : isCompletedRow ? (tr.completed ?? "Completed") : row.status}
                            </span>
                          </td>

                          {/* 6. Payment Status Badge */}
                          <td className="py-3.5 px-3.5 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                isPaid
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                                  : isPartial
                                  ? "bg-blue-50 text-blue-700 border border-blue-200/60"
                                  : "bg-red-50 text-red-700 border border-red-200/60"
                              }`}
                            >
                              {isPaid ? (tr.paid ?? "Paid") : isPartial ? (tr.partial ?? "Partial") : (tr.unpaid ?? "Unpaid")}
                            </span>
                          </td>

                          {/* 7. Action 3-dots */}
                          <td className="py-3.5 px-3.5 text-end relative" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => setActiveBookingMenuId(activeBookingMenuId === row.id ? null : row.id)}
                              className="p-1.5 rounded-xl hover:bg-[#F0F4EC] text-[#8C9686] hover:text-[#1F251A] transition cursor-pointer"
                            >
                              <MoreVertical size={16} />
                            </button>

                            {activeBookingMenuId === row.id && (
                              <div
                                ref={menuRef}
                                className={`absolute z-30 ${dir === "rtl" ? "left-0" : "right-0"} mt-1 w-40 rounded-2xl bg-white border border-[#EBE8E0] shadow-xl p-1.5 space-y-1 animate-in fade-in zoom-in-95`}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveBookingMenuId(null);
                                    if (onViewBookingDetails) onViewBookingDetails(row.raw || row);
                                    else if (onNavigateTab) onNavigateTab("Bookings");
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-[#1F251A] hover:bg-[#F0F4EC] rounded-xl transition cursor-pointer"
                                >
                                  <Eye size={14} />
                                  <span>{tr.viewBookingDetails ?? "View Details"}</span>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── STATE 3: COMPLETED / END OF DAY CONTENT ── */}
      {isCompleted && (
        <>
          {/* ── 2. TODAY'S PERFORMANCE (3 COMPACT KPI CARDS) ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-[#414E36]" />
              <h2 className="text-base font-bold text-[#1F251A]">{tr.todaysPerformance ?? "Today's Performance"}</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              {/* Card 1: Completed Bookings */}
              <div className="bg-white p-5 rounded-3xl border border-[#EBE8E0] shadow-xs flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-[#EBF0E6] text-[#414E36] flex items-center justify-center shrink-0">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-black text-[#1F251A]">{completedCount}</p>
                  <p className="text-xs font-bold text-[#1F251A] mt-0.5">{tr.completedBookings ?? "Completed"}</p>
                  <p className="text-[11px] text-[#788272] font-medium">{tr.bookingsFinished ?? "Bookings finished"}</p>
                </div>
              </div>

              {/* Card 2: Cancelled */}
              <div className="bg-white p-5 rounded-3xl border border-[#EBE8E0] shadow-xs flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                  <X size={24} />
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-black text-[#1F251A]">{cancelledCount}</p>
                  <p className="text-xs font-bold text-[#1F251A] mt-0.5">{tr.cancelled ?? "Cancelled"}</p>
                  <p className="text-[11px] text-[#788272] font-medium">{tr.bookingsCancelled ?? "Bookings cancelled"}</p>
                </div>
              </div>

              {/* Card 3: No Shows */}
              <div className="bg-white p-5 rounded-3xl border border-[#EBE8E0] shadow-xs flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <UserX size={24} />
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-black text-[#1F251A]">{noShowsCount}</p>
                  <p className="text-xs font-bold text-[#1F251A] mt-0.5">{tr.noShows ?? "No Shows"}</p>
                  <p className="text-[11px] text-[#788272] font-medium">{tr.didNotAttend ?? "Did not attend"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── 3. PAYMENTS RECEIVED (BREAKDOWN + TOTAL BANNER) ── */}
          <div className="bg-white rounded-3xl p-6 border border-[#EBE8E0] shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-[#F0F4EC] text-[#414E36] flex items-center justify-center shrink-0">
                  <CreditCard size={18} />
                </div>
                <h3 className="text-base font-bold text-[#1F251A]">{tr.paymentsReceived ?? "Payments Received"}</h3>
              </div>

              <button
                type="button"
                onClick={() => onViewTransactions ? onViewTransactions() : onNavigateTab?.("Finance")}
                className="text-xs font-bold text-[#414E36] hover:underline cursor-pointer"
              >
                {tr.viewDetails ?? "View Details"}
              </button>
            </div>

            {/* 4 Method Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Cash */}
              <div className="bg-[#FAF9F5] p-4 rounded-2xl border border-[#EBE8E0] flex items-center gap-3.5">
                <div className="h-11 w-11 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <DollarSign size={20} />
                </div>
                <div>
                  <p className="text-base sm:text-lg font-black text-[#1F251A]">{formatCurrency(payments.cash)}</p>
                  <p className="text-[11px] font-bold text-[#8C9686]">{tr.cash ?? "Cash"}</p>
                </div>
              </div>

              {/* InstaPay */}
              <div className="bg-[#FAF9F5] p-4 rounded-2xl border border-[#EBE8E0] flex items-center gap-3.5">
                <div className="h-11 w-11 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center shrink-0">
                  <Zap size={20} />
                </div>
                <div>
                  <p className="text-base sm:text-lg font-black text-[#1F251A]">{formatCurrency(payments.instapay)}</p>
                  <p className="text-[11px] font-bold text-[#8C9686]">{tr.instapay ?? "InstaPay"}</p>
                </div>
              </div>

              {/* Visa */}
              <div className="bg-[#FAF9F5] p-4 rounded-2xl border border-[#EBE8E0] flex items-center gap-3.5">
                <div className="h-11 w-11 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                  <CreditCard size={20} />
                </div>
                <div>
                  <p className="text-base sm:text-lg font-black text-[#1F251A]">{formatCurrency(payments.visa)}</p>
                  <p className="text-[11px] font-bold text-[#8C9686]">{tr.visa ?? "Visa"}</p>
                </div>
              </div>

              {/* Wallet */}
              <div className="bg-[#FAF9F5] p-4 rounded-2xl border border-[#EBE8E0] flex items-center gap-3.5">
                <div className="h-11 w-11 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <Wallet size={20} />
                </div>
                <div>
                  <p className="text-base sm:text-lg font-black text-[#1F251A]">{formatCurrency(payments.wallet)}</p>
                  <p className="text-[11px] font-bold text-[#8C9686]">{tr.wallet ?? "Wallet"}</p>
                </div>
              </div>
            </div>

            {/* Total Payments Received Banner */}
            <div className="bg-[#EBF0E6]/70 border border-[#D5DDD0] rounded-2xl p-5 text-center space-y-1">
              <p className="text-2xl sm:text-3xl font-black text-[#1F251A]">
                {formatCurrency(payments.totalPayments)}
              </p>
              <p className="text-xs font-bold text-[#45523A] uppercase tracking-wider">
                {tr.totalPaymentsReceived ?? "Total Payments Received"}
              </p>
            </div>
          </div>

          {/* ── 4. PENDING ITEMS ALERT BANNER ── */}
          {pendingItemsCount > 0 && (
            <div className="rounded-2xl bg-amber-50 border border-amber-200/80 p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <AlertCircle size={20} className="text-amber-600 shrink-0" />
                <p className="text-xs sm:text-sm font-bold text-amber-900">
                  {(tr.pendingBookingsAlert ?? "There are {count} pending bookings that were not completed today.").replace("{count}", String(pendingItemsCount))}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onNavigateTab ? onNavigateTab("Bookings") : null}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 transition cursor-pointer shrink-0"
              >
                {tr.view ?? "View"}
              </button>
            </div>
          )}
        </>
      )}

      {/* ── END SHIFT CONFIRMATION MODAL ── */}
      {showEndShiftModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-[#1F251A]">{tr.endShiftModalTitle ?? "End Shift"}</h3>
                <p className="text-xs text-[#788272] mt-1">
                  {tr.endShiftModalSubtitle ?? "Are you sure you want to end your shift? Please review the summary below before confirming."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowEndShiftModal(false)}
                className="p-2 text-[#8C9686] hover:text-[#1F251A] hover:bg-[#F0F4EC] rounded-xl transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Shift Summary Box */}
            <div className="bg-[#FAF9F5] p-4 rounded-2xl border border-[#EBE8E0] space-y-3">
              <p className="text-xs font-bold text-[#1F251A] uppercase tracking-wider">{tr.shiftSummaryTitle ?? "Shift Summary"}</p>
              <div className="grid grid-cols-3 gap-3 text-start">
                <div>
                  <p className="text-[10px] text-[#8C9686] font-semibold">{tr.shiftStart ?? "Shift Start"}</p>
                  <p className="text-sm font-black text-[#1F251A] mt-0.5">{dashboardData?.shift?.actualStartingTime || "--:--"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#8C9686] font-semibold">{tr.currentTime ?? "Current Time"}</p>
                  <p className="text-sm font-black text-[#1F251A] mt-0.5">{currentTimeFormatted}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#8C9686] font-semibold">{tr.workingHours ?? "Working Hours"}</p>
                  <p className="text-sm font-black text-[#1F251A] mt-0.5">{formatElapsedTime(liveElapsedSeconds)}</p>
                </div>
              </div>
            </div>

            {/* Today's Performance Box */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-[#1F251A] uppercase tracking-wider">{tr.todaysPerformance ?? "Today's Performance"}</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50 border border-emerald-200/60 p-3 rounded-2xl text-center">
                  <p className="text-lg font-black text-emerald-800">{completedCount}</p>
                  <p className="text-[11px] font-bold text-emerald-700">{tr.completed ?? "Completed"}</p>
                </div>
                <div className="bg-red-50 border border-red-200/60 p-3 rounded-2xl text-center">
                  <p className="text-lg font-black text-red-800">{cancelledCount}</p>
                  <p className="text-[11px] font-bold text-red-700">{tr.cancelled ?? "Cancelled"}</p>
                </div>
                <div className="bg-purple-50 border border-purple-200/60 p-3 rounded-2xl text-center">
                  <p className="text-lg font-black text-purple-800">{noShowsCount}</p>
                  <p className="text-[11px] font-bold text-purple-700">{tr.noShows ?? "No Shows"}</p>
                </div>
              </div>
            </div>

            {/* Payments Received Breakdown */}
            <div className="bg-[#FAF9F5] p-4 rounded-2xl border border-[#EBE8E0] space-y-2.5">
              <p className="text-xs font-bold text-[#1F251A] uppercase tracking-wider">{tr.paymentsReceived ?? "Payments Received"}</p>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between py-1">
                  <span className="text-[#5A6A51] flex items-center gap-1.5 font-medium">
                    <DollarSign size={14} className="text-emerald-700" />
                    {tr.cash ?? "Cash"}
                  </span>
                  <span className="font-bold text-[#1F251A]">{formatCurrency(payments.cash)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#5A6A51] flex items-center gap-1.5 font-medium">
                    <Zap size={14} className="text-purple-700" />
                    {tr.instapay ?? "InstaPay"}
                  </span>
                  <span className="font-bold text-[#1F251A]">{formatCurrency(payments.instapay)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#5A6A51] flex items-center gap-1.5 font-medium">
                    <CreditCard size={14} className="text-blue-700" />
                    {tr.visa ?? "Visa"}
                  </span>
                  <span className="font-bold text-[#1F251A]">{formatCurrency(payments.visa)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#5A6A51] flex items-center gap-1.5 font-medium">
                    <Wallet size={14} className="text-amber-700" />
                    {tr.wallet ?? "Wallet"}
                  </span>
                  <span className="font-bold text-[#1F251A]">{formatCurrency(payments.wallet)}</span>
                </div>
                <div className="border-t border-[#EBE8E0] pt-2 flex justify-between font-black text-sm text-[#1F251A]">
                  <span>{tr.totalPayments ?? "Total Payments"}</span>
                  <span>{formatCurrency(payments.totalPayments)}</span>
                </div>
              </div>
            </div>

            {/* Warning Callout if Pending Items Remain */}
            {pendingItemsCount > 0 && (
              <div className="rounded-2xl bg-amber-50 border border-amber-200/80 p-3.5 flex items-start gap-2.5 text-xs text-amber-900">
                <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="font-semibold leading-snug">
                  {(tr.endShiftWarningIncomplete ?? "You have {count} pending bookings that were not completed.").replace("{count}", String(pendingItemsCount))}
                </p>
              </div>
            )}

            {/* Modal Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                disabled={shiftProcessing}
                onClick={() => setShowEndShiftModal(false)}
                className="py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm text-[#1F251A] border border-[#E6E9EB] hover:bg-[#F2EFE9] transition cursor-pointer"
              >
                {tr.cancel ?? "Cancel"}
              </button>

              <button
                type="button"
                disabled={shiftProcessing}
                onClick={handleConfirmEndShift}
                className="py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm text-white bg-[#414E36] hover:bg-[#343e2b] shadow-md transition disabled:opacity-50 cursor-pointer"
              >
                {shiftProcessing ? (tr.updating ?? "Ending Shift...") : (tr.endShift ?? "End Shift")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── START SHIFT POPUP MODAL ON LOAD (IF NOT STARTED) ── */}
      {showStartShiftPopup && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-sm rounded-[32px] bg-white p-8 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Waving Hand Emoji */}
            <div className="h-20 w-20 rounded-full bg-[#EBF0E6] flex items-center justify-center mx-auto text-4xl shadow-inner select-none">
              👋
            </div>

            {/* Title and Subtitle */}
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-[#1F251A] flex items-center justify-center gap-1.5">
                {tr.startShiftGreeting ?? "Hi,"} {effectiveName} <span className="inline-block text-xl">👋</span>
              </h3>
              <p className="text-xs sm:text-sm text-[#5A6A51] leading-relaxed max-w-[260px] mx-auto">
                {tr.startShiftPrompt ?? "Start your shift now to track your work and stay organized."}
              </p>
            </div>

            {/* Error Message Box */}
            {locationError && (
              <div className="rounded-2xl bg-amber-50 border border-amber-200/80 p-3.5 text-start flex items-start gap-2.5 text-xs text-amber-900 animate-in fade-in duration-150">
                <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="font-semibold leading-snug">{resolveLocationError(locationError)}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                disabled={shiftProcessing}
                onClick={handleStartShift}
                className="w-full flex items-center justify-center gap-3 bg-[#414E36] hover:bg-[#323D2A] text-white py-3.5 px-6 rounded-2xl font-bold text-sm shadow-md transition disabled:opacity-60 cursor-pointer"
              >
                {shiftProcessing ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center">
                    <Play size={12} fill="white" className="ms-0.5" />
                  </div>
                )}
                <span>{shiftProcessing ? (tr.verifyingLocation ?? "Verifying Location...") : (tr.startShift ?? "Start Shift")}</span>
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
                <span>{tr.cancel ?? "Cancel"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
