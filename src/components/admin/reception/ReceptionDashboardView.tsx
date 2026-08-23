"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  PieChart,
  History,
  Bell,
  Wrench,
  X
} from "lucide-react";

interface ReceptionDashboardViewProps {
  receptionistName?: string;
  receptionistRole?: string;
  employeeId?: string;
  email?: string;
  accessToken?: string;
  onNavigateTab?: (tabName: string) => void;
  onLogout?: () => void;
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
  onLogout,
  lang = "en",
  t
}: ReceptionDashboardViewProps) {
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [dashboardData, setDashboardData] = useState<any>(null);
  const effectiveName = dashboardData?.receptionist?.name || receptionistName || "Employee";
  const [loading, setLoading] = useState(true);
  const [shiftProcessing, setShiftProcessing] = useState(false);
  const [liveElapsedSeconds, setLiveElapsedSeconds] = useState(0);
  const [showStartShiftPopup, setShowStartShiftPopup] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [hasAutoPrompted, setHasAutoPrompted] = useState(false);

  // Accordion open/close states matching design
  const [isShiftExpanded, setIsShiftExpanded] = useState(true);
  const [isAlertsExpanded, setIsAlertsExpanded] = useState(true);
  const [isBookingsExpanded, setIsBookingsExpanded] = useState(false);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [isActivitiesExpanded, setIsActivitiesExpanded] = useState(false);

  // Notifications modal & filter state
  const [showAllAlertsModal, setShowAllAlertsModal] = useState(false);
  const [alertFilter, setAlertFilter] = useState<"all" | "low_stock" | "maintenance" | "expired">("all");

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
      setLocationError("permission_denied");
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
              setLocationError("out_of_location");
            } else if (result.error === "location_permission_denied" || (result.message && result.message.includes("permission"))) {
              setLocationError("permission_denied");
            } else {
              setLocationError("generic");
            }
          }
        } catch (err: any) {
          console.error("Start shift network/server error:", err);
          setLocationError("generic");
        } finally {
          setShiftProcessing(false);
        }
      },
      (geoErr) => {
        setShiftProcessing(false);
        if (geoErr.code === geoErr.PERMISSION_DENIED || geoErr.code === 1) {
          setLocationError("permission_denied");
        } else {
          setLocationError("permission_denied");
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
    scheduleHours: "—",
    shiftFromTo: "—",
    actualStartingTime: "--:--",
    elapsedTime: "00h 00m",
    status: "not_started"
  };

  const bookingsInfo = dashboardData?.bookings || {
    todayCount: 0,
    pendingCount: 0,
    list: []
  };

  const notificationsList = Array.isArray(dashboardData?.notifications) ? dashboardData.notifications : [];

  const formattedActualStartingTime = useMemo(() => {
    const rawCheckIn = dashboardData?.shift?.checkInTime;
    if (!rawCheckIn) return shiftInfo.actualStartingTime || "--:--";
    try {
      const d = new Date(rawCheckIn);
      if (isNaN(d.getTime())) return shiftInfo.actualStartingTime || "--:--";
      return d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });
    } catch {
      return shiftInfo.actualStartingTime || "--:--";
    }
  }, [dashboardData?.shift?.checkInTime, shiftInfo.actualStartingTime]);

  const filteredAlerts = notificationsList.filter((a: any) => {
    if (alertFilter === "low_stock") return a.type === "low_stock";
    if (alertFilter === "maintenance") return a.type?.includes("maintenance");
    if (alertFilter === "expired") return a.type === "expired_item";
    return true;
  });

  const dir = lang === "ar" ? "rtl" : "ltr";
  const tr = t || {};
  const resolveLocationError = (code: string | null) => {
    if (!code) return null;
    return tr?.errors?.[code] ?? code;
  };
  const resolveAlertTitle = (alert: any) => {
    const alertType = alert?.type;
    if (alertType && tr?.alerts?.[alertType]?.title) return tr.alerts[alertType].title;
    return alert?.title || "—";
  };

  return (
    <div dir={dir} className="space-y-4 pb-8">
      {/* ── 1. Today's Shift Card ── */}
      <div className="bg-white rounded-3xl p-6 border border-[#EBE8E0] shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-full bg-[#F0F4EC] text-[#45523A] flex items-center justify-center shrink-0">
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#1F251A]">{tr.shiftTitle ?? "Today's Shift"}</h3>
              <p className="text-xs text-[#788272]">{tr.shiftSubtitle ?? "Your scheduled working hours"}</p>
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
              <span>{shiftProcessing ? (tr.updating ?? "Updating...") : shiftInfo.status === "started" ? (tr.endShift ?? "End Shift") : (tr.startShift ?? "Start Shift")}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsShiftExpanded(!isShiftExpanded)}
              className="p-2 text-[#45523A] hover:bg-[#F0F4EC] rounded-xl transition cursor-pointer"
              title={isShiftExpanded ? (tr.collapseSection ?? "Collapse section") : (tr.expandSection ?? "Expand section")}
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
                <Play size={18} fill="#45523A" className="ms-0.5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-[#8C9686] uppercase tracking-wider">{tr.actualStartingTime ?? "Actual Starting Time"}</p>
                <p className="text-2xl font-black text-[#1F251A] mt-1">{formattedActualStartingTime}</p>
              </div>
            </div>

            {/* Metric 2: Elapsed Time */}
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-[#F0F4EC] text-[#45523A] flex items-center justify-center shrink-0">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-[#8C9686] uppercase tracking-wider">{tr.elapsedTime ?? "Elapsed Time"}</p>
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
                <p className="text-[11px] font-bold text-[#8C9686] uppercase tracking-wider">{tr.status ?? "Status"}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${shiftInfo.status === "started" ? "bg-emerald-600 animate-pulse" : "bg-amber-500"}`} />
                  <p className={`text-base font-extrabold ${shiftInfo.status === "started" ? "text-emerald-700" : "text-amber-700"}`}>
                    {shiftInfo.status === "started" ? (tr.shiftStarted ?? "Shift Started") : shiftInfo.status === "ended" ? (tr.shiftEnded ?? "Shift Ended") : (tr.notStarted ?? "Not Started")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 2. Notifications & Alerts Section ── */}
      <div className="bg-white rounded-3xl p-6 border border-[#EBE8E0] shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-full bg-[#F0F4EC] text-[#45523A] flex items-center justify-center shrink-0">
              <Bell size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#1F251A]">{tr.notificationsTitle ?? "Notifications & Alerts"}</h3>
              <p className="text-xs text-[#788272]">{tr.notificationsSubtitle ?? "Important updates that require your attention"}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowAllAlertsModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-[#45523A] border border-[#D5DDD0] hover:bg-[#F0F4EC] transition cursor-pointer"
            >
              <span>{tr.viewAllAlerts ?? "View All Alerts"}</span>
              <ArrowRight size={14} />
            </button>

            <button
              type="button"
              onClick={() => setIsAlertsExpanded(!isAlertsExpanded)}
              className="p-2 text-[#45523A] hover:bg-[#F0F4EC] rounded-xl transition cursor-pointer"
              title={isAlertsExpanded ? (tr.collapseSection ?? "Collapse section") : (tr.expandSection ?? "Expand section")}
            >
              {isAlertsExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>
        </div>

        {isAlertsExpanded && (
          <div className="space-y-2.5 pt-2 border-t border-[#F3F0E8] animate-in fade-in duration-200">
            {notificationsList.length === 0 ? (
              <p className="text-xs text-[#8C9686] italic py-4 text-center">{tr.noActiveAlerts ?? "No active notifications or alerts."}</p>
            ) : (
              notificationsList.slice(0, 4).map((alert: any) => {
                const isLowStock = alert.type === "low_stock";
                const isExpired = alert.type === "expired_item";
                const isMaintDue = alert.type === "maintenance_due";
                const isMaintOverdue = alert.type === "maintenance_overdue";
                const isMaintDone = alert.type === "maintenance_completed";

                // Border accent color
                const borderAccent =
                  isLowStock || isExpired || isMaintOverdue
                    ? "border-l-4 border-l-red-500"
                    : isMaintDue
                    ? "border-l-4 border-l-amber-500"
                    : "border-l-4 border-l-emerald-500";

                // Icon selection
                const iconColor =
                  isLowStock || isExpired || isMaintOverdue
                    ? "text-red-500"
                    : isMaintDue
                    ? "text-amber-500"
                    : "text-emerald-600";

                const titleColor =
                  isLowStock || isExpired || isMaintOverdue
                    ? "text-red-600"
                    : isMaintDue
                    ? "text-amber-600"
                    : "text-emerald-700";

                return (
                  <div
                    key={alert.id}
                    onClick={() => onNavigateTab && onNavigateTab(alert.targetTab || "Inventory")}
                    className={`flex items-center justify-between p-3.5 sm:px-5 rounded-2xl bg-white border border-[#EBE8E0] ${borderAccent} hover:bg-[#FAF9F5] transition cursor-pointer group`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className={`shrink-0 ${iconColor}`}>
                        {isLowStock && <AlertTriangle size={18} />}
                        {isExpired && <Package size={18} />}
                        {(isMaintDue || isMaintOverdue) && <Wrench size={18} />}
                        {isMaintDone && <CheckCircle2 size={18} />}
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-6 min-w-0">
                        <span className={`text-xs sm:text-sm font-bold shrink-0 ${titleColor}`}>
                          {resolveAlertTitle(alert)}
                        </span>
                        <span className="text-xs text-[#5A6A51] font-medium truncate">
                          {alert.message}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 ms-4">
                      <span className="text-xs text-[#8C9686] whitespace-nowrap">{alert.time}</span>
                      <ChevronRight size={16} className="text-[#8C9686] group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ── 3. Bookings Section ── */}
      <div className="bg-white rounded-3xl p-6 border border-[#EBE8E0] shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-full bg-[#F0F4EC] text-[#45523A] flex items-center justify-center shrink-0">
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#1F251A]">{tr.bookingsTitle ?? "Bookings"}</h3>
              <p className="text-xs text-[#788272]">{tr.bookingsSubtitle ?? "Quick overview of today's bookings"}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigateTab && onNavigateTab("Bookings")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-[#45523A] border border-[#D5DDD0] hover:bg-[#F0F4EC] transition"
            >
              <span>{tr.viewAllBookings ?? "View All Bookings"}</span>
              <ArrowRight size={14} />
            </button>

            <button
              type="button"
              onClick={() => setIsBookingsExpanded(!isBookingsExpanded)}
              className="p-2 text-[#45523A] hover:bg-[#F0F4EC] rounded-xl transition cursor-pointer"
              title={isBookingsExpanded ? (tr.collapseSection ?? "Collapse section") : (tr.expandSection ?? "Expand section")}
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
                <p className="text-[11px] font-semibold text-[#8C9686] uppercase tracking-wider">{tr.totalBookings ?? "Total Bookings"}</p>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-2xl font-black text-[#1F251A]">{bookingsInfo.todayCount}</p>
                  <Calendar size={18} className="text-[#8C9686]" />
                </div>
              </div>

              <div className="bg-[#FAF9F5] p-4 rounded-2xl border border-[#EBE8E0]">
                <p className="text-[11px] font-semibold text-[#8C9686] uppercase tracking-wider">{tr.pendingApproval ?? "Pending Approval"}</p>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-2xl font-black text-[#1F251A]">{bookingsInfo.pendingCount}</p>
                  <Clock size={18} className="text-[#D97706]" />
                </div>
              </div>

              <div className="bg-[#FAF9F5] p-4 rounded-2xl border border-[#EBE8E0]">
                <p className="text-[11px] font-semibold text-[#8C9686] uppercase tracking-wider">{tr.confirmed ?? "Confirmed"}</p>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-2xl font-black text-[#1F251A]">
                    {bookingsInfo.list.filter((b: any) => String(b.status).toLowerCase() === "confirmed" || String(b.status).toLowerCase() === "checked_in").length}
                  </p>
                  <CheckCircle2 size={18} className="text-[#1E7E34]" />
                </div>
              </div>

              <div className="bg-[#FAF9F5] p-4 rounded-2xl border border-[#EBE8E0]">
                <p className="text-[11px] font-semibold text-[#8C9686] uppercase tracking-wider">{tr.completed ?? "Completed"}</p>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-2xl font-black text-[#1F251A]">
                    {bookingsInfo.list.filter((b: any) => String(b.status).toLowerCase() === "completed").length}
                  </p>
                  <UserCheck size={18} className="text-[#45523A]" />
                </div>
              </div>

              <div className="bg-[#FAF9F5] p-4 rounded-2xl border border-[#EBE8E0]">
                <p className="text-[11px] font-semibold text-[#8C9686] uppercase tracking-wider">{tr.cancelled ?? "Cancelled"}</p>
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
              <table className="w-full text-start text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#F0EEE6] text-[#8C9686] uppercase text-[10px] font-extrabold tracking-wider">
                    <th className="py-3 px-4">{tr.time ?? "Time"}</th>
                    <th className="py-3 px-4">{tr.patient ?? "Patient"}</th>
                    <th className="py-3 px-4">{tr.doctor ?? "Doctor"}</th>
                    <th className="py-3 px-4">{tr.service ?? "Service"}</th>
                    <th className="py-3 px-4">{tr.status ?? "Status"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F7F5F0]">
                  {bookingsInfo.list.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-[#8C9686] italic">
                        {tr.noBookingsToday ?? "No bookings scheduled for today."}
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
                              {isConfirmed ? (tr.confirmedBadge ?? "Confirmed") : (tr.pendingBadge ?? "Pending Approval")}
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
              <h3 className="text-lg font-bold text-[#1F251A]">{tr.summaryTitle ?? "Today's Summary"}</h3>
              <p className="text-xs text-[#788272]">{tr.summarySubtitle ?? "Overview of your daily performance"}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
            className="p-2 text-[#45523A] hover:bg-[#F0F4EC] rounded-xl transition cursor-pointer"
            title={isSummaryExpanded ? (tr.collapseSection ?? "Collapse section") : (tr.expandSection ?? "Expand section")}
          >
            {isSummaryExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>

        {isSummaryExpanded && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-[#F3F0E8] animate-in fade-in duration-200">
            <div className="bg-[#FAF9F5] p-4 rounded-2xl border border-[#EBE8E0]">
              <p className="text-[11px] font-semibold text-[#8C9686] uppercase tracking-wider">{tr.scheduledToday ?? "Scheduled Today"}</p>
              <p className="text-2xl font-black text-[#1F251A] mt-1">{bookingsInfo.todayCount}</p>
            </div>
            <div className="bg-[#FAF9F5] p-4 rounded-2xl border border-[#EBE8E0]">
              <p className="text-[11px] font-semibold text-[#8C9686] uppercase tracking-wider">{tr.confirmedRate ?? "Confirmed Rate"}</p>
              <p className="text-2xl font-black text-emerald-700 mt-1">
                {bookingsInfo.todayCount > 0
                  ? `${Math.round((bookingsInfo.list.filter((b: any) => b.status === "confirmed").length / bookingsInfo.todayCount) * 100)}%`
                  : "100%"}
              </p>
            </div>
            <div className="bg-[#FAF9F5] p-4 rounded-2xl border border-[#EBE8E0]">
              <p className="text-[11px] font-semibold text-[#8C9686] uppercase tracking-wider">{tr.completed ?? "Completed"}</p>
              <p className="text-2xl font-black text-[#45523A] mt-1">
                {bookingsInfo.list.filter((b: any) => String(b.status).toLowerCase() === "completed").length}
              </p>
            </div>
            <div className="bg-[#FAF9F5] p-4 rounded-2xl border border-[#EBE8E0]">
              <p className="text-[11px] font-semibold text-[#8C9686] uppercase tracking-wider">{tr.currentStatus ?? "Current Status"}</p>
              <p className="text-2xl font-black text-[#1F251A] mt-1 capitalize">
                {shiftInfo.status === "started" ? (tr.active ?? "Active") : (tr.idle ?? "Idle")}
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
              <h3 className="text-lg font-bold text-[#1F251A]">{tr.activitiesTitle ?? "Recent Activities"}</h3>
              <p className="text-xs text-[#788272]">{tr.activitiesSubtitle ?? "Your latest actions and updates"}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsActivitiesExpanded(!isActivitiesExpanded)}
            className="p-2 text-[#45523A] hover:bg-[#F0F4EC] rounded-xl transition cursor-pointer"
            title={isActivitiesExpanded ? (tr.collapseSection ?? "Collapse section") : (tr.expandSection ?? "Expand section")}
          >
            {isActivitiesExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>

        {isActivitiesExpanded && (
          <div className="pt-4 border-t border-[#F3F0E8] animate-in fade-in duration-200">
            {bookingsInfo.list.length === 0 ? (
              <p className="text-xs text-[#8C9686] italic py-4 text-center">{tr.noRecentActivities ?? "No recent actions recorded today."}</p>
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
                onClick={handleStartShiftWithLocation}
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

      {/* ── ALL NOTIFICATIONS & ALERTS MODAL ── */}
      {showAllAlertsModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-2xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#F0EEE6] pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-[#F0F4EC] text-[#45523A] flex items-center justify-center">
                  <Bell size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1F251A]">{tr.allAlertsTitle ?? "All Notifications & Alerts"}</h3>
                  <p className="text-xs text-[#788272]">{tr.allAlertsSubtitle ?? "System alerts for inventory, maintenance, and clinical updates"}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAllAlertsModal(false)}
                className="p-2 text-[#8C9686] hover:text-[#1F251A] hover:bg-[#F0F4EC] rounded-xl transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {[
                { id: "all", label: tr.filterAll ?? "All Alerts" },
                { id: "low_stock", label: tr.filterLowStock ?? "Low Stock" },
                { id: "maintenance", label: tr.filterMaintenance ?? "Maintenance" },
                { id: "expired", label: tr.filterExpired ?? "Expired Items" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setAlertFilter(tab.id as any)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    alertFilter === tab.id
                      ? "bg-[#414E36] text-white"
                      : "bg-[#F0F4EC] text-[#5A6A51] hover:bg-[#E2EADF]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Modal Alerts List */}
            <div className="overflow-y-auto space-y-2.5 flex-1 pr-1">
              {filteredAlerts.length === 0 ? (
                <p className="text-xs text-[#8C9686] italic py-8 text-center">{tr.noAlertsInCategory ?? "No alerts in this category."}</p>
              ) : (
                filteredAlerts.map((alert: any) => {
                  const isLowStock = alert.type === "low_stock";
                  const isExpired = alert.type === "expired_item";
                  const isMaintDue = alert.type === "maintenance_due";
                  const isMaintOverdue = alert.type === "maintenance_overdue";
                  const isMaintDone = alert.type === "maintenance_completed";

                  const borderAccent =
                    isLowStock || isExpired || isMaintOverdue
                      ? "border-l-4 border-l-red-500"
                      : isMaintDue
                      ? "border-l-4 border-l-amber-500"
                      : "border-l-4 border-l-emerald-500";

                  const iconColor =
                    isLowStock || isExpired || isMaintOverdue
                      ? "text-red-500"
                      : isMaintDue
                      ? "text-amber-500"
                      : "text-emerald-600";

                  const titleColor =
                    isLowStock || isExpired || isMaintOverdue
                      ? "text-red-600"
                      : isMaintDue
                      ? "text-amber-600"
                      : "text-emerald-700";

                  return (
                    <div
                      key={alert.id}
                      className={`flex items-center justify-between p-3.5 rounded-2xl bg-white border border-[#EBE8E0] ${borderAccent} hover:bg-[#FAF9F5] transition`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`shrink-0 ${iconColor}`}>
                          {isLowStock && <AlertTriangle size={18} />}
                          {isExpired && <Package size={18} />}
                          {(isMaintDue || isMaintOverdue) && <Wrench size={18} />}
                          {isMaintDone && <CheckCircle2 size={18} />}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-xs sm:text-sm font-bold ${titleColor}`}>{resolveAlertTitle(alert)}</p>
                          <p className="text-xs text-[#5A6A51] font-medium mt-0.5">{alert.message}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 ms-4">
                        <span className="text-xs text-[#8C9686]">{alert.time}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAllAlertsModal(false);
                            if (onNavigateTab) onNavigateTab(alert.targetTab || "Inventory");
                          }}
                          className="text-xs font-bold text-[#414E36] hover:underline px-2 py-1 rounded-lg hover:bg-[#F0F4EC] transition cursor-pointer"
                        >
                          {tr.resolve ?? "Resolve"}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-[#F0EEE6] pt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAllAlertsModal(false)}
                className="px-5 py-2.5 rounded-xl font-bold text-xs text-[#1F251A] border border-[#E6E9EB] hover:bg-[#F2EFE9] transition cursor-pointer"
              >
                <span>{tr.close ?? "Close"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
