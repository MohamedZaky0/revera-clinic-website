"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Filter,
  ArrowRight,
  Printer,
  Download,
  MoreVertical,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Check,
  X,
  User,
  Phone,
  Sparkles,
  Search,
  ChevronDown,
  Eye,
  Loader2
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface ReservationItem {
  id: string | number;
  date: string;
  time?: string;
  customer_name: string;
  customer_phone: string;
  service_name: string;
  service_variant?: string;
  doctor_name: string;
  room?: string;
  status: string; // checked_in, waiting, in_progress, confirmed, completed, canceled, no_show
  paymentStatus?: string; // Paid, Deposit Paid, Unpaid
  avatar_url?: string;
  doctor_avatar?: string;
}

interface AdminBookingsViewProps {
  allReservations?: any[];
  requests?: any[];
  providers?: any[];
  localServices?: any[];
  userName?: string;
  onNewBooking?: () => void;
  onPendingApprovalsClick?: () => void;
  onFilterClick?: () => void;
  onViewBookingDetails?: (booking: any) => void;
  onPrint?: () => void;
  onExportCSV?: () => void;
  onApproveBooking?: (booking: any) => void;
  onRejectBooking?: (booking: any) => void;
}

const formatDisplayTime = (timeStr?: string): string => {
  if (!timeStr) return "09:00 AM";
  const trimmed = String(timeStr).trim();
  if (!trimmed) return "09:00 AM";
  if (trimmed.toLowerCase().includes("am") || trimmed.toLowerCase().includes("pm")) {
    return trimmed;
  }
  const startPart = trimmed.split("-")[0].trim();
  const parts = startPart.split(":");
  if (parts.length >= 2) {
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1].slice(0, 2);
    if (!isNaN(hours)) {
      const period = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
      const formattedHours = String(hours).padStart(2, "0");
      return `${formattedHours}:${minutes} ${period}`;
    }
  }
  return trimmed;
};

export const AdminBookingsView: React.FC<AdminBookingsViewProps> = ({
  allReservations = [],
  requests = [],
  providers = [],
  localServices = [],
  userName = "Sara",
  onNewBooking,
  onPendingApprovalsClick,
  onFilterClick,
  onViewBookingDetails,
  onPrint,
  onExportCSV,
  onApproveBooking,
  onRejectBooking
}) => {
  // View Mode State: 'calendar' (Default main view) vs 'pending'
  const [viewMode, setViewMode] = useState<"pending" | "calendar">("calendar");
  // Mini calendar state - Default to REAL CURRENT DATE
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date());
  const [activeMenuId, setActiveMenuId] = useState<string | number | null>(null);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Close More dropdown on outside click or global dropdown toggle
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };
    const globalHandler = (e: any) => {
      if (e.detail !== "bookingsMore") {
        setIsMoreMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    window.addEventListener("close-admin-dropdowns", globalHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      window.removeEventListener("close-admin-dropdowns", globalHandler);
    };
  }, []);
  const [rowsPerPage, setRowsPerPage] = useState<number>(5);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [statusFilter, setStatusFilter] = useState<string>("All");

  // Direct Supabase database fallback state
  const [dbReservations, setDbReservations] = useState<any[]>([]);
  const [dbProviders, setDbProviders] = useState<any[]>(providers);
  const [loadingDb, setLoadingDb] = useState(false);

  // Fetch real reservations & providers directly from database on mount
  useEffect(() => {
    async function fetchRealData() {
      setLoadingDb(true);
      try {
        const [resResponse, provResponse] = await Promise.all([
          supabase.from("reservations").select("*").order("date", { ascending: false }),
          supabase.from("providers").select("*").order("name", { ascending: true })
        ]);

        if (!resResponse.error && resResponse.data) {
          setDbReservations(resResponse.data);
        }
        if (!provResponse.error && provResponse.data && provResponse.data.length > 0) {
          setDbProviders(provResponse.data);
        }
      } catch (err) {
        console.error("Error fetching database reservations/providers:", err);
      } finally {
        setLoadingDb(false);
      }
    }
    fetchRealData();
  }, []);

  // Helper to format date string YYYY-MM-DD
  const formatDateISO = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const selectedDateStr = useMemo(() => formatDateISO(selectedDate), [selectedDate]);

  // Combine prop reservations with database reservations (strict real data)
  const mergedAppointments = useMemo(() => {
    const combinedMap = new Map<string, any>();

    // Add items from allReservations prop
    (allReservations || []).forEach((r, idx) => {
      const id = String(r.id || `prop-${idx}`);
      combinedMap.set(id, r);
    });

    // Add items from dbReservations state
    (dbReservations || []).forEach((r, idx) => {
      const id = String(r.id || `db-${idx}`);
      if (!combinedMap.has(id)) {
        combinedMap.set(id, r);
      }
    });

    const rawList = Array.from(combinedMap.values());
    const allProv = dbProviders.length > 0 ? dbProviders : (providers || []);

    // Map real reservations to clean structure
    return rawList.map((r, idx) => {
      const pName = r.customer_name || r.patient_name || r.clientName || r.patientName || r.name || `Patient #${r.id || idx + 1}`;
      const phone = r.customer_phone || r.phone || r.mobile || "—";
      const sName = r.service_name || r.service || (localServices.find(s => String(s.id) === String(r.service_id || r.serviceId))?.en) || "Clinic Session";
      const sVariant = r.service_variant || (localServices.find(s => String(s.id) === String(r.service_id || r.serviceId))?.cat) || "Session";
      
      // Thorough Doctor Name Resolution
      const rawDoc = r.doctor_name || r.doctorName || (typeof r.doctor === "string" && r.doctor !== "Doctor" ? r.doctor : r.doctor?.name) || r.provider_name || r.providerName || (typeof r.provider === "string" && r.provider !== "Doctor" ? r.provider : r.provider?.name);

      const targetProvId = String(r.provider_id || r.providerId || r.doctorId || r.doctor_id || "");
      let doc = rawDoc;

      if ((!doc || doc === "Doctor") && targetProvId && allProv.length > 0) {
        const matchedP = allProv.find(p => String(p.id) === targetProvId || String(p.provider_id) === targetProvId);
        if (matchedP) {
          doc = matchedP.name || matchedP.full_name || matchedP.name_en;
        }
      }

      if (!doc || doc === "Doctor") doc = "—";

      const rm = r.room || r.room_name || "—";
      
      let st = (r.status || "confirmed").toLowerCase();
      if (st === "approved") st = "confirmed";
      if (st === "started") st = "in_progress";

      const amtPaid = Number(r.amountPaid ?? 0);
      const amtLeft = Number(r.amountLeft ?? 0);
      let paySt: string;
      if (isNaN(amtPaid) || isNaN(amtLeft)) {
        paySt = "—";
      } else if (amtPaid <= 0) {
        paySt = "Unpaid";
      } else if (amtLeft > 0) {
        paySt = "Partially Paid";
      } else {
        paySt = "Paid";
      }

      return {
        ...r,
        id: r.id || `res-${idx}`,
        date: String(r.date || selectedDateStr).slice(0, 10),
        time: formatDisplayTime(r.start_time || r.time || r.timeSlot || r.time_slot),
        customer_name: pName,
        customer_phone: phone,
        service_name: sName,
        service_variant: sVariant,
        doctor_name: doc,
        room: rm,
        status: st,
        paymentStatus: paySt
      };
    });
  }, [allReservations, dbReservations, dbProviders, localServices, providers, selectedDateStr]);

  // Chronological Booking Flow Order
  const FLOW_ORDER: Record<string, number> = {
    pending: 1,
    waiting: 1,
    pending_deposit: 1,
    confirmed: 2,
    approved: 2,
    checked_in: 3,
    in_progress: 4,
    started: 4,
    completed: 5,
    postponed: 6,
    rescheduled: 6,
    canceled: 7,
    cancelled: 7,
    rejected: 7,
    no_show: 8
  };

  // Filter & sort appointments strictly for the selected date according to Flow Order
  const selectedDayAppointments = useMemo(() => {
    let dayList = mergedAppointments.filter(r => r.date === selectedDateStr);
    if (statusFilter !== "All") {
      dayList = dayList.filter(r => {
        const st = (r.status || "").toLowerCase();
        if (statusFilter === "pending") return ["pending", "waiting", "pending_deposit"].includes(st);
        if (statusFilter === "confirmed") return ["confirmed", "approved"].includes(st);
        if (statusFilter === "in_progress") return ["in_progress", "started"].includes(st);
        if (statusFilter === "postponed") return ["postponed", "rescheduled"].includes(st);
        if (statusFilter === "canceled") return ["canceled", "cancelled", "rejected"].includes(st);
        return st === statusFilter.toLowerCase();
      });
    }

    // Sort by Flow Order rank then time
    return [...dayList].sort((a, b) => {
      const rankA = FLOW_ORDER[(a.status || "").toLowerCase()] || 99;
      const rankB = FLOW_ORDER[(b.status || "").toLowerCase()] || 99;
      if (rankA !== rankB) return rankA - rankB;
      return (a.time || "").localeCompare(b.time || "");
    });
  }, [mergedAppointments, selectedDateStr, statusFilter]);

  // Pagination calculation
  const totalAppointments = selectedDayAppointments.length;
  const totalPages = Math.max(1, Math.ceil(totalAppointments / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * rowsPerPage;

  const paginatedAppointments = useMemo(() => {
    return selectedDayAppointments.slice(startIndex, startIndex + rowsPerPage);
  }, [selectedDayAppointments, startIndex, rowsPerPage]);

  // Analytics counts calculation (Strict DB data)
  const stats = useMemo(() => {
    const todays = mergedAppointments.filter(r => r.date === selectedDateStr);
    const upcoming = mergedAppointments.filter(r => ["confirmed", "approved", "pending", "waiting", "checked_in"].includes(r.status || ""));
    const completed = mergedAppointments.filter(r => r.status === "completed");
    const canceled = mergedAppointments.filter(r => ["canceled", "cancelled", "postponed"].includes(r.status || ""));

    const upcomingToday = todays.filter(r => ["confirmed", "approved", "pending", "waiting", "checked_in"].includes(r.status || ""));
    const nextTime = upcomingToday.length > 0 ? (upcomingToday[0].time || "09:30 AM") : "—";

    return {
      todayCount: todays.length,
      nextTime: nextTime,
      upcomingCount: upcoming.length,
      completedCount: completed.length,
      canceledCount: canceled.length
    };
  }, [mergedAppointments, selectedDateStr]);

  // Pending approvals count
  const pendingApprovalsCount = useMemo(() => {
    if (requests && requests.length > 0) return requests.length;
    return mergedAppointments.filter(r => ["pending", "waiting", "pending_deposit"].includes((r.status || "").toLowerCase())).length;
  }, [requests, mergedAppointments]);

  // Mini Calendar grid generation
  const calendarCells = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const prevDays: { day: number; currentMonth: boolean; dateStr: string }[] = [];
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, d);
      prevDays.push({ day: d, currentMonth: false, dateStr: formatDateISO(prevDate) });
    }

    const currentDays: { day: number; currentMonth: boolean; dateStr: string }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const cDate = new Date(year, month, d);
      currentDays.push({ day: d, currentMonth: true, dateStr: formatDateISO(cDate) });
    }

    const totalCellsSoFar = prevDays.length + currentDays.length;
    const totalGridCells = totalCellsSoFar > 35 ? 42 : 35;

    const nextDays: { day: number; currentMonth: boolean; dateStr: string }[] = [];
    for (let d = 1; d <= totalGridCells - totalCellsSoFar; d++) {
      const nextDate = new Date(year, month + 1, d);
      nextDays.push({ day: d, currentMonth: false, dateStr: formatDateISO(nextDate) });
    }

    return [...prevDays, ...currentDays, ...nextDays];
  }, [currentMonth]);

  // Real Database Appointment dots mapping per date
  const appointmentsByDate = useMemo(() => {
    const map: Record<string, string[]> = {};

    mergedAppointments.forEach(app => {
      if (!app.date) return;
      if (!map[app.date]) map[app.date] = [];
      const st = (app.status || "").toLowerCase();

      let color = "#22C55E"; // green for confirmed/approved
      if (st === "pending" || st === "waiting" || st === "pending_deposit") color = "#F97316"; // orange
      else if (st === "checked_in") color = "#3B82F6"; // blue
      else if (st === "in_progress" || st === "started") color = "#A855F7"; // purple
      else if (st === "completed") color = "#0D9488"; // teal
      else if (st === "postponed" || st === "rescheduled") color = "#6366F1"; // indigo
      else if (st === "canceled" || st === "cancelled" || st === "rejected") color = "#EF4444"; // red
      else if (st === "no_show") color = "#6B7280"; // gray

      if (!map[app.date].includes(color) && map[app.date].length < 3) {
        map[app.date].push(color);
      }
    });

    return map;
  }, [mergedAppointments]);

  // Format header date string (e.g. "Wednesday, 6 August 2026")
  const formattedHeaderDate = useMemo(() => {
    return selectedDate.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }, [selectedDate]);

  // Helper status color details (Flow Order: Pending -> Confirmed -> Checked In -> In Progress -> Completed -> Postponed -> Canceled -> No Show)
  const getStatusConfig = (status?: string) => {
    switch ((status || "").toLowerCase()) {
      case "pending":
      case "waiting":
      case "pending_deposit":
        return { label: "Pending", bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500", border: "border-l-orange-500" };
      case "checked_in":
        return { label: "Checked In", bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500", border: "border-l-blue-500" };
      case "in_progress":
      case "started":
        return { label: "In Progress", bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-500", border: "border-l-purple-500" };
      case "completed":
        return { label: "Completed", bg: "bg-teal-50", text: "text-teal-700", dot: "bg-teal-500", border: "border-l-teal-500" };
      case "postponed":
      case "rescheduled":
        return { label: "Postponed", bg: "bg-indigo-50", text: "text-indigo-700", dot: "bg-indigo-500", border: "border-l-indigo-500" };
      case "canceled":
      case "cancelled":
      case "rejected":
        return { label: "Canceled", bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500", border: "border-l-rose-500" };
      case "no_show":
        return { label: "No Show", bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-500", border: "border-l-gray-500" };
      case "confirmed":
      case "approved":
      default:
        return { label: "Confirmed", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", border: "border-l-emerald-500" };
    }
  };

  const getPaymentStyle = (payStatus?: string) => {
    if (payStatus === "Paid") return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (payStatus === "Deposit Paid") return "bg-amber-100 text-amber-800 border-amber-200";
    return "bg-gray-100 text-gray-700 border-gray-200";
  };

  const handlePrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Pending Approvals List State & Pagination
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingRowsPerPage, setPendingRowsPerPage] = useState(10);

  // Compute pending list items
  const pendingApprovalsList = useMemo(() => {
    const rawPending = (requests && requests.length > 0)
      ? requests
      : mergedAppointments.filter(r => ["pending", "waiting", "pending_deposit"].includes((r.status || "").toLowerCase()));

    return rawPending.map((item: any, idx: number) => {
      const code = item.bookingCode || item.code || item.id || `#BK-${idx + 1}`;
      const pName = item.patientName || item.customer_name || item.name || `Patient #${idx + 1}`;
      const pPhone = item.phone || item.customer_phone || item.mobile || "—";
      const sName = item.serviceName || item.service_name || item.service || "Clinic Session";
      const sVariant = item.serviceVariant || item.service_variant || "Session";
      const dName = item.doctorName || item.doctor_name || item.doctor || "—";
      const dSpec = item.doctorSpecialty || "Specialist";
      const dFormatted = item.dateFormatted || item.date || selectedDateStr;
      const tSlot = item.time || item.start_time || item.requestedTime || "09:00 AM";
      const bName = item.branchName || item.branch_name || "New Cairo Branch";
      const reqDate = item.requestedDate || item.created_at?.slice(0, 10) || dFormatted;
      const reqTime = item.requestedTime || item.created_at?.slice(11, 16) || "08:45 AM";

      return {
        id: item.id || `pending-${idx}`,
        code: code,
        bookingType: item.bookingType || "New Booking",
        patientName: pName,
        patientAge: item.patientAge || item.age || "",
        patientAvatar: item.patientAvatar || item.avatar_url,
        phone: pPhone,
        serviceName: sName,
        serviceVariant: sVariant,
        doctorName: dName,
        doctorSpecialty: dSpec,
        doctorAvatar: item.doctorAvatar || item.doctor_avatar,
        dateFormatted: dFormatted,
        time: tSlot,
        branchName: bName,
        status: "pending",
        requestedDate: reqDate,
        requestedTime: reqTime,
        raw: item
      };
    });
  }, [requests, mergedAppointments, selectedDateStr]);

  const startIndexPending = (pendingPage - 1) * pendingRowsPerPage;
  const paginatedPendingList = useMemo(() => {
    return pendingApprovalsList.slice(startIndexPending, startIndexPending + pendingRowsPerPage);
  }, [pendingApprovalsList, startIndexPending, pendingRowsPerPage]);

  const handleApproveItem = async (item: any) => {
    try {
      if (item.raw?.id) {
        await supabase.from("reservations").update({ status: "approved" }).eq("id", item.raw.id);
      }
      setDbReservations(prev => prev.map(r => String(r.id) === String(item.raw?.id) ? { ...r, status: "approved" } : r));
      if (onApproveBooking) {
        onApproveBooking(item.raw);
      }
    } catch (e) {
      console.error("Approve error:", e);
    }
  };

  const handleRejectItem = async (item: any) => {
    try {
      if (item.raw?.id) {
        await supabase.from("reservations").update({ status: "rejected" }).eq("id", item.raw.id);
      }
      setDbReservations(prev => prev.map(r => String(r.id) === String(item.raw?.id) ? { ...r, status: "rejected" } : r));
      if (onRejectBooking) {
        onRejectBooking(item.raw);
      }
    } catch (e) {
      console.error("Reject error:", e);
    }
  };

  return (
    <div className="w-full space-y-6 animate-fadeIn pb-12 text-[#1F251A] relative">
      
      {/* ── TOP HEADER BAR ── */}
      <div className="relative z-10 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#111827] flex items-center gap-2 sm:text-2xl">
            Good morning, {userName} <span className="inline-block animate-bounce">👋</span>
          </h1>
          <p className="text-xs text-[#6B7280]">
            Here's what's happening at Revera Clinics today.
          </p>
        </div>
      </div>

      {/* ── 4 ANALYTIC SUMMARY CARDS ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        
        {/* Card 1: Today's Appointments */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
              Today's Appointments
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-[#1E3A2B]">
              <CalendarIcon size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-[#111827]">{stats.todayCount}</span>
            <span className="text-xs font-medium text-[#6B7280]">Next: {stats.nextTime}</span>
          </div>
        </div>

        {/* Card 2: Upcoming */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
              Upcoming
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Clock size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-[#111827]">{stats.upcomingCount}</span>
            <span className="text-xs font-semibold text-blue-600">Active</span>
          </div>
        </div>

        {/* Card 3: Completed */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
              Completed
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-[#111827]">{stats.completedCount}</span>
            <span className="text-xs font-semibold text-teal-600">Finished</span>
          </div>
        </div>

        {/* Card 4: Canceled */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
              Canceled
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <XCircle size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-[#111827]">{stats.canceledCount}</span>
            <span className="text-xs font-semibold text-rose-600">Cancelled / Postponed</span>
          </div>
        </div>
      </div>

      {/* ── CONTROLS BAR (DIRECTLY ABOVE CALENDAR & TABLE) ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        {/* VIEW MODE TOGGLE */}
        <div className="inline-flex items-center rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setViewMode("pending")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition ${
              viewMode === "pending"
                ? "bg-[#C4AE7C] text-[#414E36]"
                : "text-[#374151] hover:bg-gray-50"
            }`}
          >
            <Clock size={15} />
            <span>Pending</span>
            {pendingApprovalsCount > 0 && (
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold bg-[#EF4444] text-white">
                {pendingApprovalsCount}
              </span>
            )}
          </button>
          <div className="w-px h-8 bg-gray-200" />
          <button
            type="button"
            onClick={() => setViewMode("calendar")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition ${
              viewMode === "calendar"
                ? "bg-[#C4AE7C] text-[#414E36]"
                : "text-[#374151] hover:bg-gray-50"
            }`}
          >
            <CalendarIcon size={15} />
            <span>Calendar View</span>
          </button>
        </div>

        {/* RIGHT ACTIONS: NEW BOOKING + 3 DOTS MENU */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onNewBooking}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1E3A2B] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#162C20] active:scale-95 cursor-pointer"
          >
            <Plus size={16} />
            <span>New Booking</span>
          </button>

          <div className="relative" ref={moreMenuRef}>
            <button
              type="button"
              onClick={() => {
                setIsMoreMenuOpen(prev => {
                  const nextState = !prev;
                  if (nextState) {
                    window.dispatchEvent(new CustomEvent("close-admin-dropdowns", { detail: "bookingsMore" }));
                  }
                  return nextState;
                });
              }}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-[#374151] shadow-sm transition hover:bg-gray-50 active:scale-95 cursor-pointer"
              title="More options"
            >
              <MoreVertical size={18} className="text-[#6B7280]" />
            </button>

            {isMoreMenuOpen && (
              <div className="absolute right-0 top-full z-30 mt-2 w-44 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg">
                <button
                  onClick={() => { onPrint?.(); setIsMoreMenuOpen(false); }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-[#374151] hover:bg-gray-50 transition cursor-pointer"
                >
                  <Printer size={15} className="text-[#6B7280]" />
                  Print Schedule
                </button>
                <div className="mx-4 border-t border-gray-100" />
                <button
                  onClick={() => { onExportCSV?.(); setIsMoreMenuOpen(false); }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-[#374151] hover:bg-gray-50 transition cursor-pointer"
                >
                  <Download size={15} className="text-[#6B7280]" />
                  Export CSV
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── CONDITIONAL VIEW: PENDING APPROVALS or CALENDAR+SCHEDULE ── */}
      {viewMode === "pending" ? (
      <div id="pending-approvals-section" className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xs space-y-4">
        {/* Section Header */}
        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-[#111827]">Pending Approvals</h2>
            <p className="text-xs text-[#6B7280] mt-0.5">{pendingApprovalsList.length} booking{pendingApprovalsList.length !== 1 ? 's' : ''} awaiting review</p>
          </div>
        </div>
        {/* Table Container */}
        <div className="overflow-x-auto scrollbar-none">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] font-bold text-[#6B7280]">
                <th className="py-3 px-3 whitespace-nowrap">Patient ˅</th>
                <th className="py-3 px-3 whitespace-nowrap">Service</th>
                <th className="py-3 px-3 whitespace-nowrap">Doctor</th>
                <th className="py-3 px-3 whitespace-nowrap">Date &amp; Time</th>
                <th className="py-3 px-3 whitespace-nowrap">Branch</th>
                <th className="py-3 px-3 whitespace-nowrap">Status</th>
                <th className="py-3 px-3 whitespace-nowrap">Requested At</th>
                <th className="py-3 px-3 whitespace-nowrap text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedPendingList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm text-[#6B7280]">
                    No pending approval requests.
                  </td>
                </tr>
              ) : (
                paginatedPendingList.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => onViewBookingDetails ? onViewBookingDetails(item.raw) : null}
                    className="hover:bg-gray-50/70 transition cursor-pointer"
                  >
                    {/* 1. Patient */}
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <div>
                      <span className="font-extrabold text-[#111827] text-xs block">{item.patientName}</span>
                      <span className="text-[11px] font-mono text-gray-500 font-medium block">{item.phone}</span>
                      {item.patientAge && <span className="text-[11px] text-gray-400 font-medium">{item.patientAge} years</span>}
                    </div>
                  </td>

                  {/* 4. Service */}
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <span className="font-extrabold text-[#111827] text-xs block">{item.serviceName}</span>
                    <span className="text-[11px] text-gray-400 font-medium">{item.serviceVariant}</span>
                  </td>

                  {/* 5. Doctor */}
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <div>
                      <span className="font-extrabold text-[#111827] text-xs block">{item.doctorName}</span>
                      <span className="text-[11px] text-gray-400 font-medium">{item.doctorSpecialty}</span>
                    </div>
                  </td>

                  {/* 6. Date & Time */}
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <span className="font-extrabold text-[#111827] text-xs block">{item.dateFormatted}</span>
                    <span className="text-[11px] font-bold text-emerald-800">{item.time}</span>
                  </td>

                  {/* 7. Branch */}
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <span className="font-extrabold text-[#111827] text-xs block">{item.branchName}</span>
                  </td>

                  {/* 8. Status */}
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <span className="inline-flex items-center rounded-xl bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-700 border border-orange-200">
                      Pending
                    </span>
                  </td>

                  {/* 9. Requested At */}
                  <td className="py-3.5 px-3 whitespace-nowrap text-[11px] font-medium text-gray-500">
                    <span className="font-extrabold text-[#111827] text-xs block">{item.requestedDate}</span>
                    <span>{item.requestedTime}</span>
                  </td>

                  {/* 10. Actions */}
                  <td className="py-3.5 px-3 whitespace-nowrap text-left">
                    <div className="flex items-center justify-start gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApproveItem(item);
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-600 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition active:scale-95 shadow-xs"
                        title="Approve"
                      >
                        <Check size={16} strokeWidth={2.5} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRejectItem(item);
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-rose-300 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition active:scale-95 shadow-xs"
                        title="Reject"
                      >
                        <X size={16} strokeWidth={2.5} />
                      </button>
                      <div className="relative dropdown-action-menu">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId((prev) => (prev === item.id ? null : item.id));
                          }}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-[#6B7280] transition dropdown-action-menu cursor-pointer"
                          title="More actions"
                        >
                          <MoreVertical size={16} />
                        </button>

                        {activeMenuId === item.id && (
                          <div className="absolute right-0 top-8 z-50 w-44 rounded-xl border border-gray-100 bg-white p-1 shadow-xl text-xs animate-in fade-in duration-150 dropdown-action-menu text-left">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(null);
                                if (onViewBookingDetails) onViewBookingDetails(item.raw);
                              }}
                              className="flex w-full items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-50 font-semibold text-gray-700 transition cursor-pointer"
                            >
                              <Eye size={14} className="text-gray-500" />
                              <span>View Details</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(null);
                                handleApproveItem(item);
                              }}
                              className="flex w-full items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-emerald-50 font-semibold text-emerald-700 transition cursor-pointer"
                            >
                              <Check size={14} className="text-emerald-600" />
                              <span>Approve Booking</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(null);
                                handleRejectItem(item);
                              }}
                              className="flex w-full items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-rose-50 font-semibold text-rose-600 transition cursor-pointer"
                            >
                              <X size={14} className="text-rose-500" />
                              <span>Reject Booking</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            )}
            </tbody>
          </table>
        </div>

        {/* Bottom Pagination Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-gray-100 pt-4 gap-3 text-xs font-semibold text-gray-500">
          <div>
            Showing {pendingApprovalsList.length > 0 ? startIndexPending + 1 : 0} to {Math.min(startIndexPending + pendingRowsPerPage, pendingApprovalsList.length)} of {pendingApprovalsList.length} pending approvals
          </div>
          
          <div className="flex items-center gap-4">
            {/* Pagination controls */}
            <div className="flex items-center gap-1">
              <button
                disabled={pendingPage === 1}
                onClick={() => setPendingPage(p => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-3 py-1 bg-[#1E3A2B] text-white font-bold rounded-lg text-xs">
                {pendingPage}
              </span>
              <button
                disabled={pendingPage >= Math.ceil(pendingApprovalsList.length / pendingRowsPerPage)}
                onClick={() => setPendingPage(p => p + 1)}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Rows per page */}
            <div className="flex items-center gap-1.5">
              <span>Rows per page:</span>
              <select
                value={pendingRowsPerPage}
                onChange={(e) => {
                  setPendingRowsPerPage(Number(e.target.value));
                  setPendingPage(1);
                }}
                className="rounded-xl border border-gray-200 bg-white px-2.5 py-1 text-xs font-bold text-[#111827] outline-none cursor-pointer"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      ) : (
        /* ── CALENDAR VIEW: MINI CALENDAR + TODAY'S SCHEDULE ── */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">

          {/* ── LEFT: MINI CALENDAR ── */}
          <div className="space-y-4 lg:col-span-4">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              {/* Month & View Switcher Header */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button onClick={handlePrevMonth} className="rounded-lg p-1 text-[#6B7280] hover:bg-gray-100">
                    <ChevronLeft size={18} />
                  </button>
                  <h3 className="text-base font-bold text-[#111827]">
                    {currentMonth.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
                  </h3>
                  <button onClick={handleNextMonth} className="rounded-lg p-1 text-[#6B7280] hover:bg-gray-100">
                    <ChevronRight size={18} />
                  </button>
                </div>
                <button
                  onClick={() => {
                    setSelectedDate(new Date());
                    setCurrentMonth(new Date());
                  }}
                  className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-[#374151] hover:bg-gray-50 transition"
                >
                  Today
                </button>
              </div>

              {/* Weekday Labels */}
              <div className="grid grid-cols-7 text-center text-xs font-semibold text-[#6B7280] mb-2">
                {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => <span key={d}>{d}</span>)}
              </div>

              {/* Day Grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarCells.map((cell, idx) => {
                  const isSelected = cell.dateStr === selectedDateStr;
                  const dots = appointmentsByDate[cell.dateStr] || [];
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        const [y, m, d] = cell.dateStr.split("-").map(Number);
                        setSelectedDate(new Date(y, m - 1, d));
                        setCurrentPage(1);
                      }}
                      className="group flex flex-col items-center justify-center py-1 transition cursor-pointer outline-none bg-transparent hover:bg-transparent focus:bg-transparent"
                    >
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs transition-all ${
                          !cell.currentMonth
                            ? "text-gray-300 group-hover:bg-gray-100/60"
                            : isSelected
                            ? "bg-[#1E3A2B] text-white font-bold shadow-xs group-hover:bg-[#162C20]"
                            : "text-[#374151] font-semibold group-hover:bg-gray-100 group-hover:text-[#111827]"
                        }`}
                      >
                        {cell.day}
                      </div>
                      <div className="mt-1 flex h-1.5 min-h-[6px] items-center justify-center gap-0.5">
                        {dots.map((dotColor, dIdx) => (
                          <span
                            key={dIdx}
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: dotColor }}
                          />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-6 border-t border-gray-100 pt-4">
                <div className="grid grid-cols-2 gap-y-2.5 gap-x-2 text-xs font-medium text-[#4B5563]">
                  {[
                    { color: "#F97316", label: "Pending" },
                    { color: "#22C55E", label: "Confirmed" },
                    { color: "#3B82F6", label: "Checked In" },
                    { color: "#A855F7", label: "In Progress" },
                    { color: "#0D9488", label: "Completed" },
                    { color: "#6366F1", label: "Postponed" },
                    { color: "#EF4444", label: "Canceled" },
                    { color: "#6B7280", label: "No Show" },
                  ].map(({ color, label }) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }}></span>
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT: TODAY'S SCHEDULE TABLE ── */}
          <div className="space-y-4 lg:col-span-8">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              {/* Header */}
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-[#111827]">Today's Schedule</h2>
                  <p className="text-xs font-medium text-[#6B7280]">{formattedHeaderDate}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setStatusFilter("All")}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-[#374151] hover:bg-gray-50 active:scale-95"
                  >
                    <span>All Appointments</span>
                    <ArrowRight size={14} />
                  </button>
                  <button
                    onClick={onFilterClick}
                    title="Filter"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-[#374151] hover:bg-gray-50 active:scale-95 cursor-pointer"
                  >
                    <Filter size={15} />
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="w-full overflow-hidden">
                <table className="w-full text-left border-collapse text-xs table-fixed">
                  <thead>
                    <tr className="border-b border-gray-100 text-[10px] uppercase font-bold tracking-tight text-[#9CA3AF]">
                      <th className="py-2.5 px-1 font-bold w-[11%]">Time</th>
                      <th className="py-2.5 px-1 font-bold w-[19%]">Patient</th>
                      <th className="py-2.5 px-1 font-bold w-[19%]">Service</th>
                      <th className="py-2.5 px-1 font-bold w-[16%]">Doctor</th>
                      <th className="py-2.5 px-1 font-bold w-[9%]">Room</th>
                      <th className="py-2.5 px-1 font-bold w-[13%]">Status</th>
                      <th className="py-2.5 px-1 font-bold w-[13%]">Payment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {loadingDb ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-xs text-[#5A6A51]">
                          <Loader2 size={20} className="animate-spin mx-auto mb-2 text-[#1E3A2B]" />
                          Loading appointments...
                        </td>
                      </tr>
                    ) : paginatedAppointments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-sm text-[#6B7280]">
                          <div className="max-w-sm mx-auto space-y-3">
                            <p className="font-semibold text-[#111827]">No appointments for {formattedHeaderDate}.</p>
                            <button
                              type="button"
                              onClick={onNewBooking}
                              className="inline-flex items-center gap-2 rounded-xl bg-[#1E3A2B] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#162C20]"
                            >
                              <Plus size={14} />
                              <span>Create New Booking</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedAppointments.map((row) => {
                        const stConfig = getStatusConfig(row.status);
                        const payStyle = getPaymentStyle(row.paymentStatus);
                        const displayTimeStr = formatDisplayTime(row.time);
                        return (
                          <tr
                            key={row.id}
                            onClick={() => onViewBookingDetails && onViewBookingDetails(row)}
                            className={`group cursor-pointer transition hover:bg-emerald-50/50 border-l-4 ${stConfig.border}`}
                          >
                            <td className="py-2.5 px-1 font-bold text-[#111827] text-[11px] whitespace-nowrap">{displayTimeStr}</td>
                            <td className="py-2.5 px-1">
                              <div className="min-w-0">
                                <span className="font-semibold text-[#111827] block text-xs truncate">{row.customer_name}</span>
                                <span className="text-[10px] font-mono text-gray-500 font-medium block truncate">{row.customer_phone}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-1">
                              <div className="flex flex-col min-w-0">
                                <span className="font-bold text-[#111827] text-xs truncate">{row.service_name}</span>
                                <span className="text-[10px] font-medium text-[#9CA3AF] truncate">{row.service_variant}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-1">
                              <span className="font-medium text-[#374151] text-xs truncate block">{row.doctor_name}</span>
                            </td>
                            <td className="py-2.5 px-1 text-[#6B7280] font-medium text-xs truncate">{row.room}</td>
                            <td className="py-2.5 px-1">
                              <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${stConfig.bg} ${stConfig.text} whitespace-nowrap`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${stConfig.dot}`}></span>
                                {stConfig.label}
                              </span>
                            </td>
                            <td className="py-2.5 px-1">
                              <span className={`inline-flex items-center rounded-md border px-1 py-0.5 text-[9px] font-bold ${payStyle} whitespace-nowrap`}>
                                {row.paymentStatus}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs text-[#6B7280] border-t border-gray-100 pt-3">
                <div>
                  Showing <span className="font-semibold text-[#111827]">{totalAppointments > 0 ? startIndex + 1 : 0}</span> to{" "}
                  <span className="font-semibold text-[#111827]">{Math.min(startIndex + rowsPerPage, totalAppointments)}</span>{" "}
                  of <span className="font-semibold text-[#111827]">{totalAppointments}</span> appointments
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span>Rows per page:</span>
                    <select
                      value={rowsPerPage}
                      onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                      className="rounded-lg border border-gray-200 bg-white px-2 py-1 font-semibold text-[#374151] outline-none"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={safePage <= 1}
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-[#374151] hover:bg-gray-50 disabled:opacity-40"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <span className="px-2 font-semibold text-[#111827]">Page {safePage} of {totalPages}</span>
                    <button
                      disabled={safePage >= totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-[#374151] hover:bg-gray-50 disabled:opacity-40"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
