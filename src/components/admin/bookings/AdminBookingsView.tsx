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
  Loader2,
  List,
  Coins,
  DollarSign,
  History,
  CalendarPlus
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { getSessionStaleness } from "@/lib/services";
import { adminTranslations } from "@/components/admin/translations";

interface ReservationItem {
  id: string | number;
  date: string;
  time?: string;
  customer_name: string;
  customer_phone: string;
  service_name: string;
  service_variant?: string;
  doctor_name: string;
  doctorSpecialty?: string;
  room?: string;
  status: string;
  paymentStatus: string;
  isStaleSession?: boolean;
  staleElapsedLabel?: string | null;
  raw?: any;
}

interface AdminBookingsViewProps {
  allReservations?: any[];
  requests?: any[];
  providers?: any[];
  localServices?: any[];
  userName?: string;
  onNewBooking?: () => void;
  onAddPreviousBooking?: () => void;
  onPendingApprovalsClick?: () => void;
  onFilterClick?: () => void;
  onViewBookingDetails?: (booking: any) => void;
  onPrint?: () => void;
  onExportCSV?: () => void;
  onApproveBooking?: (booking: any) => void;
  onRejectBooking?: (booking: any) => void;
  /** SuperAdmin-configured "Stale Session Alert" from Booking Settings. Defaults to 2 hours. */
  staleSessionThresholdHours?: number;
  lang?: "en" | "ar";
  t?: any;
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
  onAddPreviousBooking,
  onPendingApprovalsClick,
  onFilterClick,
  onViewBookingDetails,
  onPrint,
  onExportCSV,
  onApproveBooking,
  onRejectBooking,
  staleSessionThresholdHours,
  lang = "en",
  t,
}) => {
  const tr = t || adminTranslations[lang].bookings.adminBookingsView;
  // View Mode State: 'calendar' (Default) vs 'pending' vs 'all'
  const [viewMode, setViewMode] = useState<"pending" | "calendar" | "all">("calendar");
  // All Appointments View Filter & Search State
  const [allAppointmentsSearch, setAllAppointmentsSearch] = useState("");
  const [allAppointmentsStatusFilter, setAllAppointmentsStatusFilter] = useState("All");
  const [allAppointmentsDoctorFilter, setAllAppointmentsDoctorFilter] = useState("All");
  const [allAppointmentsPage, setAllAppointmentsPage] = useState(1);
  const [allAppointmentsPerPage, setAllAppointmentsPerPage] = useState(10);
  const [showAllAppointmentsFilters, setShowAllAppointmentsFilters] = useState(false);

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

  // Today's Schedule Inline Filter State (Inventory style)
  const [showTodayFilters, setShowTodayFilters] = useState(false);
  const [todayStatusFilter, setTodayStatusFilter] = useState("All");
  const [todayDoctorFilter, setTodayDoctorFilter] = useState("All");
  const [todayServiceFilter, setTodayServiceFilter] = useState("All");
  const [todayPaymentFilter, setTodayPaymentFilter] = useState("All");

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

  // RISK-043: SuperAdmin-configured threshold (Booking Settings → "Stale Session Alert"), falling
  // back to the 2-hour default when the setting hasn't been set or is invalid.
  const staleThresholdMs = useMemo(() => {
    const hours = Number(staleSessionThresholdHours);
    return Number.isFinite(hours) && hours > 0 ? hours * 60 * 60 * 1000 : undefined;
  }, [staleSessionThresholdHours]);

  // Combine prop reservations with database reservations (strict real data)
  const mergedAppointments = useMemo(() => {
    const combinedMap = new Map<string, any>();

    // Add items from allReservations prop
    (allReservations || []).forEach((r, idx) => {
      const id = String(r.id || `prop-${idx}`);
      combinedMap.set(id, r);
    });

    // Add/merge items from dbReservations state (local updates take priority)
    (dbReservations || []).forEach((r, idx) => {
      const id = String(r.id || `db-${idx}`);
      const existing = combinedMap.get(id) || {};
      combinedMap.set(id, { ...existing, ...r });
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

      // amount_left is nullable in the DB (mapRow returns it as `?? null`), so a missing value
      // must stay "unknown" — coercing it to 0 would render "Paid" for a booking whose balance
      // was never recorded, which is the exact fabrication this block was rewritten to remove.
      const rawPaid = r.amountPaid ?? r.amount_paid;
      const rawLeft = r.amountLeft ?? r.amount_left;
      const amtPaid = Number(rawPaid);
      const amtLeft = Number(rawLeft);
      let paySt: string;
      if (rawPaid === null || rawPaid === undefined || Number.isNaN(amtPaid)) {
        paySt = "—";
      } else if (amtPaid <= 0) {
        paySt = "Unpaid";
      } else if (rawLeft === null || rawLeft === undefined || Number.isNaN(amtLeft)) {
        paySt = "—";
      } else if (amtLeft > 0) {
        paySt = "Partially Paid";
      } else {
        paySt = "Paid";
      }

      const bookingDate = String(r.date || selectedDateStr).slice(0, 10);

      // RISK-043: a session the doctor never completed stays `started` forever. Computed off the
      // raw status, not the normalised `st`, so the check reads the state the DB actually holds.
      // Threshold is SuperAdmin-configurable (Booking Settings → "Stale Session Alert"); falls
      // back to the 2-hour default when unset.
      const staleness = getSessionStaleness(r.status, r.startedAt ?? r.started_at, bookingDate, staleThresholdMs);

      return {
        ...r,
        id: r.id || `res-${idx}`,
        date: bookingDate,
        time: formatDisplayTime(r.start_time || r.time || r.timeSlot || r.time_slot),
        customer_name: pName,
        customer_phone: phone,
        service_name: sName,
        service_variant: sVariant,
        doctor_name: doc,
        room: rm,
        status: st,
        paymentStatus: paySt,
        isStaleSession: staleness.isStale,
        staleElapsedLabel: staleness.elapsedLabel
      };
    });
  }, [allReservations, dbReservations, dbProviders, localServices, providers, selectedDateStr, staleThresholdMs]);

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

  // Unique doctors and services for dropdown filters
  const uniqueDoctors = useMemo(() => {
    const docSet = new Set<string>();
    (providers || []).forEach((p: any) => {
      if (p.name) docSet.add(p.name);
    });
    (dbProviders || []).forEach((p: any) => {
      if (p.name) docSet.add(p.name);
    });
    mergedAppointments.forEach((a: any) => {
      if (a.doctor_name && a.doctor_name !== "—" && a.doctor_name !== "-") {
        docSet.add(a.doctor_name);
      }
    });
    return Array.from(docSet).sort();
  }, [providers, dbProviders, mergedAppointments]);

  const uniqueServices = useMemo(() => {
    const srvSet = new Set<string>();
    (localServices || []).forEach((s: any) => {
      if (s.en) srvSet.add(s.en);
      else if (s.name) srvSet.add(s.name);
    });
    mergedAppointments.forEach((a: any) => {
      if (a.service_name && a.service_name !== "—" && a.service_name !== "-") {
        srvSet.add(a.service_name);
      }
    });
    return Array.from(srvSet).sort();
  }, [localServices, mergedAppointments]);

  // Filter & sort appointments strictly for the selected date according to Flow Order & active filters
  const selectedDayAppointments = useMemo(() => {
    let dayList = mergedAppointments.filter(r => r.date === selectedDateStr);

    // 1. Status filter
    if (todayStatusFilter !== "All") {
      dayList = dayList.filter(r => {
        const st = (r.status || "").toLowerCase();
        if (todayStatusFilter === "pending") return ["pending", "waiting", "pending_deposit"].includes(st);
        if (todayStatusFilter === "confirmed") return ["confirmed", "approved"].includes(st);
        if (todayStatusFilter === "in_progress") return ["in_progress", "started"].includes(st);
        if (todayStatusFilter === "completed") return ["completed", "done"].includes(st);
        if (todayStatusFilter === "postponed") return ["postponed", "rescheduled"].includes(st);
        if (todayStatusFilter === "canceled") return ["canceled", "cancelled", "rejected"].includes(st);
        return st === todayStatusFilter.toLowerCase();
      });
    }

    // 2. Doctor filter
    if (todayDoctorFilter !== "All") {
      dayList = dayList.filter(r => {
        return String(r.doctor_name || "").toLowerCase() === todayDoctorFilter.toLowerCase();
      });
    }

    // 3. Service filter
    if (todayServiceFilter !== "All") {
      dayList = dayList.filter(r => {
        const sName = (r.service_name || r.service || "").toLowerCase();
        return sName.includes(todayServiceFilter.toLowerCase());
      });
    }

    // 4. Payment filter
    if (todayPaymentFilter !== "All") {
      dayList = dayList.filter(r => {
        const payStr = (r.paymentStatus || "").toLowerCase();
        if (todayPaymentFilter === "paid") return payStr === "paid";
        if (todayPaymentFilter === "outstanding") return payStr === "unpaid" || payStr === "partial" || payStr === "—";
        return true;
      });
    }

    // Sort by Flow Order rank then time
    return [...dayList].sort((a, b) => {
      const rankA = FLOW_ORDER[(a.status || "").toLowerCase()] || 99;
      const rankB = FLOW_ORDER[(b.status || "").toLowerCase()] || 99;
      if (rankA !== rankB) return rankA - rankB;
      return (a.time || "").localeCompare(b.time || "");
    });
  }, [mergedAppointments, selectedDateStr, todayStatusFilter, todayDoctorFilter, todayServiceFilter, todayPaymentFilter]);

  // Pagination calculation
  const totalAppointments = selectedDayAppointments.length;
  const totalPages = Math.max(1, Math.ceil(totalAppointments / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * rowsPerPage;

  const paginatedAppointments = useMemo(() => {
    return selectedDayAppointments.slice(startIndex, startIndex + rowsPerPage);
  }, [selectedDayAppointments, startIndex, rowsPerPage]);

  // Filter & sort for All Appointments Directory view
  const filteredAllAppointments = useMemo(() => {
    let list = [...mergedAppointments];

    // 1. Search Query
    if (allAppointmentsSearch.trim()) {
      const q = allAppointmentsSearch.toLowerCase().trim();
      list = list.filter((item) => {
        const pName = String(item.customer_name || "").toLowerCase();
        const phone = String(item.customer_phone || "").toLowerCase();
        const sName = String(item.service_name || "").toLowerCase();
        const dName = String(item.doctor_name || "").toLowerCase();
        const aptId = String(item.id || "").toLowerCase();
        const nationalId = String(item.national_id || item.nationalId || "").toLowerCase();
        return (
          pName.includes(q) ||
          phone.includes(q) ||
          sName.includes(q) ||
          dName.includes(q) ||
          aptId.includes(q) ||
          nationalId.includes(q)
        );
      });
    }

    // 2. Status Filter
    if (allAppointmentsStatusFilter !== "All") {
      list = list.filter((item) => {
        const st = (item.status || "").toLowerCase();
        if (allAppointmentsStatusFilter === "pending") return ["pending", "waiting", "pending_deposit"].includes(st);
        if (allAppointmentsStatusFilter === "confirmed") return ["confirmed", "approved"].includes(st);
        if (allAppointmentsStatusFilter === "in_progress") return ["in_progress", "started"].includes(st);
        if (allAppointmentsStatusFilter === "postponed") return ["postponed", "rescheduled"].includes(st);
        if (allAppointmentsStatusFilter === "canceled") return ["canceled", "cancelled", "rejected"].includes(st);
        return st === allAppointmentsStatusFilter.toLowerCase();
      });
    }

    // 3. Doctor Filter
    if (allAppointmentsDoctorFilter !== "All") {
      list = list.filter((item) => {
        return String(item.doctor_name || "").toLowerCase() === allAppointmentsDoctorFilter.toLowerCase();
      });
    }

    // Sort by date (descending) then time
    return list.sort((a, b) => {
      const dateA = a.date || "";
      const dateB = b.date || "";
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      return (a.time || "").localeCompare(b.time || "");
    });
  }, [mergedAppointments, allAppointmentsSearch, allAppointmentsStatusFilter, allAppointmentsDoctorFilter]);

  const totalAllAppointments = filteredAllAppointments.length;
  const totalAllPages = Math.max(1, Math.ceil(totalAllAppointments / allAppointmentsPerPage));
  const safeAllPage = Math.min(allAppointmentsPage, totalAllPages);
  const allAppointmentsStartIndex = (safeAllPage - 1) * allAppointmentsPerPage;

  const paginatedAllAppointments = useMemo(() => {
    return filteredAllAppointments.slice(allAppointmentsStartIndex, allAppointmentsStartIndex + allAppointmentsPerPage);
  }, [filteredAllAppointments, allAppointmentsStartIndex, allAppointmentsPerPage]);

  // Analytics counts calculation (Strict DB data)
  //
  // Analytics counts calculation (Daily Only across all views)
  const stats = useMemo(() => {
    const todays = mergedAppointments.filter(r => r.date === selectedDateStr);

    const upcomingToday = todays.filter(r =>
      ["confirmed", "approved", "pending", "waiting", "checked_in", "in_progress", "started"].includes(
        (r.status || "").toLowerCase()
      )
    );
    // Sort upcoming today chronologically by time to find the next appointment
    const sortedUpcoming = [...upcomingToday].sort((a, b) => (a.time || "").localeCompare(b.time || ""));
    const nextTime = sortedUpcoming.length > 0 ? (sortedUpcoming[0].time || "—") : "—";

    const completedToday = todays.filter(r =>
      ["completed", "done"].includes((r.status || "").toLowerCase())
    );

    const canceledToday = todays.filter(r =>
      ["canceled", "cancelled", "rejected"].includes((r.status || "").toLowerCase())
    );

    const dayRevenue = todays.reduce((sum, r) => {
      const paid = Number(r.amountPaid ?? r.amount_paid ?? 0);
      if (paid > 0) return sum + paid;
      if (["completed", "done"].includes((r.status || "").toLowerCase())) {
        const total = Number(r.total_price ?? r.totalPrice ?? r.final_price ?? r.price ?? 0);
        return sum + total;
      }
      return sum;
    }, 0);

    return {
      todayCount: todays.length,
      nextTime: nextTime,
      upcomingCount: upcomingToday.length,
      dayRevenue: dayRevenue,
      completedCount: completedToday.length,
      canceledCount: canceledToday.length
    };
  }, [mergedAppointments, selectedDateStr]);

  // RISK-043: every session still sitting in `started` past the threshold, newest first. Scoped to
  // the whole loaded set rather than the selected day on purpose — the point of this list is to
  // surface sessions from days nobody is looking at any more.
  const staleSessions = useMemo(
    () => mergedAppointments.filter(r => r.isStaleSession),
    [mergedAppointments]
  );

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
        return { label: tr.statusLabels.pending, bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500", border: "border-l-orange-500" };
      case "checked_in":
        return { label: tr.statusLabels.checkedIn, bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500", border: "border-l-blue-500" };
      case "in_progress":
      case "started":
        return { label: tr.statusLabels.inProgress, bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-500", border: "border-l-purple-500" };
      case "completed":
        return { label: tr.statusLabels.completed, bg: "bg-teal-50", text: "text-teal-700", dot: "bg-teal-500", border: "border-l-teal-500" };
      case "postponed":
      case "rescheduled":
        return { label: tr.statusLabels.postponed, bg: "bg-indigo-50", text: "text-indigo-700", dot: "bg-indigo-500", border: "border-l-indigo-500" };
      case "canceled":
      case "cancelled":
      case "rejected":
        return { label: tr.statusLabels.canceled, bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500", border: "border-l-rose-500" };
      case "no_show":
        return { label: tr.statusLabels.noShow, bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-500", border: "border-l-gray-500" };
      case "confirmed":
      case "approved":
      default:
        return { label: tr.statusLabels.confirmed, bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", border: "border-l-emerald-500" };
    }
  };

  const getPaymentStyle = (payStatus?: string) => {
    if (payStatus === "Paid") return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (payStatus === "Deposit Paid") return "bg-amber-100 text-amber-800 border-amber-200";
    return "bg-gray-100 text-gray-700 border-gray-200";
  };

  const paymentStatusLabel = (payStatus?: string): string => {
    if (!payStatus) return "";
    return tr.paymentStatusLabels[payStatus] ?? payStatus;
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
  const [rejectedIds, setRejectedIds] = useState<Set<string>>(new Set());
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set());
  const [rejectedObjects, setRejectedObjects] = useState<Set<any>>(new Set());
  const [approvedObjects, setApprovedObjects] = useState<Set<any>>(new Set());

  // Compute pending list items
  const pendingApprovalsList = useMemo(() => {
    const sourceList = (requests && requests.length > 0) ? requests : mergedAppointments;
    const rawPending = sourceList.filter(r => {
      if (rejectedObjects.has(r) || approvedObjects.has(r)) return false;

      const idStr = String(r.id || "");
      if (idStr && (rejectedIds.has(idStr) || approvedIds.has(idStr))) return false;

      return ["pending", "waiting", "pending_deposit"].includes((r.status || "pending").toLowerCase());
    });

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
  }, [requests, mergedAppointments, selectedDateStr, rejectedIds, approvedIds, rejectedObjects, approvedObjects]);

  const startIndexPending = (pendingPage - 1) * pendingRowsPerPage;
  const paginatedPendingList = useMemo(() => {
    return pendingApprovalsList.slice(startIndexPending, startIndexPending + pendingRowsPerPage);
  }, [pendingApprovalsList, startIndexPending, pendingRowsPerPage]);

  const handleApproveItem = async (item: any) => {
    try {
      const rawObj = item.raw || item;
      const targetId = String(rawObj?.id || item.id || "");

      setApprovedObjects(prev => new Set(prev).add(rawObj));
      if (targetId) {
        setApprovedIds(prev => new Set(prev).add(targetId));
        await supabase.from("reservations").update({ status: "approved" }).eq("id", targetId);
      }
      setDbReservations(prev => {
        const exists = prev.some(r => String(r.id) === String(targetId));
        if (exists) {
          return prev.map(r => String(r.id) === String(targetId) ? { ...r, status: "approved" } : r);
        }
        return [...prev, { ...rawObj, id: targetId, status: "approved" }];
      });
      if (onApproveBooking) {
        onApproveBooking({ ...rawObj, id: targetId, status: "approved" });
      }
    } catch (e) {
      console.error("Approve error:", e);
    }
  };

  const handleRejectItem = async (item: any) => {
    try {
      const rawObj = item.raw || item;
      const targetId = String(rawObj?.id || item.id || "");

      setRejectedObjects(prev => new Set(prev).add(rawObj));
      if (targetId) {
        setRejectedIds(prev => new Set(prev).add(targetId));
        await supabase.from("reservations").update({ status: "rejected" }).eq("id", targetId);
      }
      setDbReservations(prev => {
        const exists = prev.some(r => String(r.id) === String(targetId));
        if (exists) {
          return prev.map(r => String(r.id) === String(targetId) ? { ...r, status: "rejected" } : r);
        }
        return [...prev, { ...rawObj, id: targetId, status: "rejected" }];
      });
      if (onRejectBooking) {
        onRejectBooking({ ...rawObj, id: targetId, status: "rejected" });
      }
    } catch (e) {
      console.error("Reject error:", e);
    }
  };

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} className="w-full space-y-6 pb-12 text-[#1F251A] relative">
      
      {/* ── TOP HEADER BAR ── */}
      <div className="relative z-10 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#111827] flex items-center gap-2 sm:text-2xl">
            {tr.greeting} {userName} <span className="inline-block">👋</span>
          </h1>
          <p className="text-xs text-[#6B7280]">
            {tr.subtitle}
          </p>
        </div>
      </div>

      {/* ── 4 ANALYTIC SUMMARY CARDS (DAILY) ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        
        {/* Card 1: Today's Appointments with (next appointment) */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
              {tr.cardTodayAppointments || "Today's Appointments"}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-[#1E3A2B]">
              <CalendarIcon size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-[#111827]">{stats.todayCount}</span>
            <span className="text-xs font-medium text-[#6B7280]">
              {tr.nextPrefix || "Next:"} {stats.nextTime}
            </span>
          </div>
        </div>

        {/* Card 2: Upcoming */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
              {tr.cardUpcoming || "Upcoming"}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Clock size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-[#111827]">{stats.upcomingCount}</span>
            <span className="text-xs font-semibold text-blue-600">{tr.todayLabel || "Today"}</span>
          </div>
        </div>

        {/* Card 3: Complete with (revenue) */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
              {tr.cardCompleted || "Completed"}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-[#111827]">{stats.completedCount}</span>
            <span className="text-xs font-bold text-emerald-700">
              EGP {stats.dayRevenue.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Card 4: Canceled */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
              {tr.cardCanceled || "Canceled"}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <XCircle size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-[#111827]">{stats.canceledCount}</span>
            <span className="text-xs font-semibold text-rose-600">{tr.todayLabel || "Today"}</span>
          </div>
        </div>
      </div>

      {/* ── CONTROLS BAR (DIRECTLY ABOVE CALENDAR & TABLE) ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        {/* VIEW MODE TOGGLE */}
        <div className="inline-flex items-center rounded-2xl bg-[#F2EFE9] border border-[#414E36]/10 p-1 gap-1 shadow-2xs">
          <button
            type="button"
            onClick={() => setViewMode("pending")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold cursor-pointer ${
              viewMode === "pending"
                ? "bg-[#C4AE7C] text-[#414E36] shadow-xs"
                : "text-[#5A6A51] hover:bg-white/80 hover:text-[#1F251A]"
            }`}
          >
            <Clock size={15} />
            <span>{tr.pendingToggle}</span>
            {pendingApprovalsCount > 0 && (
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold bg-[#EF4444] text-white">
                {pendingApprovalsCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setViewMode("calendar")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold cursor-pointer ${
              viewMode === "calendar"
                ? "bg-[#C4AE7C] text-[#414E36] shadow-xs"
                : "text-[#5A6A51] hover:bg-white/80 hover:text-[#1F251A]"
            }`}
          >
            <CalendarIcon size={15} />
            <span>{tr.calendarViewToggle}</span>
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
            <span>{tr.newBookingBtn}</span>
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
              title={tr.moreOptionsTitle}
            >
              <MoreVertical size={18} className="text-[#6B7280]" />
            </button>

            {isMoreMenuOpen && (
              <div className="absolute end-0 top-full z-30 mt-2 w-52 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg">
                <button
                  onClick={() => { onPrint?.(); setIsMoreMenuOpen(false); }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-[#374151] hover:bg-gray-50 transition cursor-pointer"
                >
                  <Printer size={15} className="text-[#6B7280]" />
                  {tr.printScheduleBtn}
                </button>
                <div className="mx-4 border-t border-gray-100" />
                <button
                  onClick={() => { onExportCSV?.(); setIsMoreMenuOpen(false); }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-[#374151] hover:bg-gray-50 transition cursor-pointer"
                >
                  <Download size={15} className="text-[#6B7280]" />
                  {tr.exportCsvBtn}
                </button>
                <div className="mx-4 border-t border-gray-100" />
                <button
                  onClick={() => { onAddPreviousBooking?.(); setIsMoreMenuOpen(false); }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-[#374151] hover:bg-[#F4F7F2] hover:text-[#2D3F2A] transition cursor-pointer"
                >
                  <History size={15} className="text-[#3D5A45]" />
                  <span>{tr.addPreviousBookingBtn || "Add Previous Booking"}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── NEEDS ATTENTION: sessions left open (RISK-043) ── */}
      {staleSessions.length > 0 && (
        <div className="rounded-3xl border border-red-200 bg-red-50/60 p-5 shadow-xs space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100">
              <AlertCircle size={17} className="text-red-600" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-red-900">
                {tr.needsAttentionPrefix} — {staleSessions.length} {staleSessions.length !== 1 ? tr.sessionsPlural : tr.sessionSingular} {tr.leftOpenSuffix}
              </h2>
              <p className="text-xs text-red-700/80 mt-0.5">
                {tr.attentionBodyPrefix} {staleSessionThresholdHours || 2} {(staleSessionThresholdHours || 2) !== 1 ? tr.hoursPlural : tr.hourSingular}. {tr.attentionBodySuffix}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {staleSessions.map((row) => (
              <button
                key={`stale-${row.id}`}
                onClick={() => onViewBookingDetails && onViewBookingDetails(row)}
                className="flex w-full items-center justify-between gap-3 rounded-2xl border border-red-200 bg-white px-4 py-2.5 text-start transition hover:border-red-300 hover:bg-red-50/50"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-xs font-bold text-[#111827]">{row.customer_name}</span>
                  <span className="truncate text-[10px] font-medium text-[#6B7280]">
                    {row.service_name} · {row.doctor_name} · {row.date}
                  </span>
                </div>
                <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                  {row.staleElapsedLabel ? `${tr.openPrefix} ${row.staleElapsedLabel}` : tr.leftOpenBadge}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── CONDITIONAL VIEW: PENDING APPROVALS or CALENDAR+SCHEDULE ── */}
      {viewMode === "pending" ? (
      <div id="pending-approvals-section" className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xs space-y-4">
        {/* Section Header */}
        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-[#111827]">{tr.pendingApprovalsHeading}</h2>
            <p className="text-xs text-[#6B7280] mt-0.5">{pendingApprovalsList.length} {pendingApprovalsList.length !== 1 ? tr.bookingsPlural : tr.bookingSingular} {tr.awaitingReviewSuffix}</p>
          </div>
        </div>
        {/* Table Container */}
        <div className="w-full overflow-hidden">
          <table className="w-full text-start text-xs border-collapse table-fixed">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] font-bold text-[#6B7280]">
                <th className="py-3 px-2 text-start w-[16%]">{tr.colPatient} ˅</th>
                <th className="py-3 px-2 text-start w-[15%]">{tr.colService}</th>
                <th className="py-3 px-2 text-start w-[14%]">{tr.colDoctor}</th>
                <th className="py-3 px-2 text-start w-[14%]">{tr.colDateTime}</th>
                <th className="py-3 px-2 text-start w-[15%]">{tr.colBranch}</th>
                <th className="py-3 px-2 text-start w-[10%]">{tr.colStatus}</th>
                <th className="py-3 px-2 text-start w-[11%]">{tr.colRequestedAt}</th>
                <th className="py-3 px-2 text-start w-[5%]">{tr.colActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedPendingList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm text-[#6B7280]">
                    {tr.noPendingRequests}
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
                  <td className="py-3 px-2">
                    <div className="min-w-0">
                      <span className="font-extrabold text-[#111827] text-xs block truncate">{item.patientName}</span>
                      <span className="text-[11px] font-mono text-gray-500 font-medium block truncate">{item.phone}</span>
                      {item.patientAge && <span className="text-[11px] text-gray-400 font-medium block truncate">{item.patientAge} {tr.yearsSuffix}</span>}
                    </div>
                  </td>

                  {/* 2. Service */}
                  <td className="py-3 px-2">
                    <span className="font-extrabold text-[#111827] text-xs block truncate">{item.serviceName}</span>
                    <span className="text-[11px] text-gray-400 font-medium block truncate">{item.serviceVariant}</span>
                  </td>

                  {/* 3. Doctor */}
                  <td className="py-3 px-2">
                    <div className="min-w-0">
                      <span className="font-extrabold text-[#111827] text-xs block truncate">{item.doctorName}</span>
                      <span className="text-[11px] text-gray-400 font-medium block truncate">{item.doctorSpecialty}</span>
                    </div>
                  </td>

                  {/* 4. Date & Time */}
                  <td className="py-3 px-2">
                    <span className="font-extrabold text-[#111827] text-xs block truncate">{item.dateFormatted}</span>
                    <span className="text-[11px] font-bold text-emerald-800 block truncate">{item.time}</span>
                  </td>

                  {/* 5. Branch */}
                  <td className="py-3 px-2">
                    <span className="font-extrabold text-[#111827] text-xs block truncate">{item.branchName}</span>
                  </td>

                  {/* 6. Status */}
                  <td className="py-3 px-2">
                    <span className="inline-flex items-center rounded-xl bg-orange-50 px-2 py-0.5 text-[11px] font-bold text-orange-700 border border-orange-200 truncate">
                      {tr.statusLabels.pending}
                    </span>
                  </td>

                  {/* 7. Requested At */}
                  <td className="py-3 px-2 text-[11px] font-medium text-gray-500">
                    <span className="font-extrabold text-[#111827] text-xs block truncate">{item.requestedDate}</span>
                    <span className="block truncate">{item.requestedTime}</span>
                  </td>

                  {/* 8. Actions */}
                  <td className="py-3 px-2 text-start">
                    <div className="flex items-center justify-start gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApproveItem(item);
                        }}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-xl border border-emerald-600 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition active:scale-95 shadow-2xs cursor-pointer"
                        title={tr.approveTitle}
                      >
                        <Check size={14} strokeWidth={2.5} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRejectItem(item);
                        }}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-xl border border-rose-300 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition active:scale-95 shadow-2xs cursor-pointer"
                        title={tr.rejectTitle}
                      >
                        <X size={14} strokeWidth={2.5} />
                      </button>
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
            {tr.showingPrefix} {pendingApprovalsList.length > 0 ? startIndexPending + 1 : 0} {tr.toWord} {Math.min(startIndexPending + pendingRowsPerPage, pendingApprovalsList.length)} {tr.ofWord} {pendingApprovalsList.length} {tr.pendingApprovalsSuffix}
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
              <span>{tr.rowsPerPageLabel}</span>
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
      ) : viewMode === "all" ? (
        /* ── ALL APPOINTMENTS DIRECTORY VIEW ── */
        <div id="all-appointments-section" className="rounded-3xl border border-[#414E36]/10 bg-white p-6 shadow-sm space-y-5">
          {/* Top Header & Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <h2 className="text-xl font-bold text-[#111827]">{tr.allAppointmentsHeading || "All Appointments Directory"}</h2>
              <p className="text-xs text-[#5A6A51] mt-0.5">
                {filteredAllAppointments.length} {filteredAllAppointments.length !== 1 ? tr.appointmentsSuffix || "appointments" : tr.bookingSingular || "booking"}
              </p>
            </div>

            {/* Search and Filters */}
            <div className="flex items-center gap-2.5 flex-1 sm:max-w-md justify-end">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={allAppointmentsSearch}
                  onChange={(e) => {
                    setAllAppointmentsSearch(e.target.value);
                    setAllAppointmentsPage(1);
                  }}
                  placeholder={tr.searchPlaceholder || "Search by name, phone, national ID..."}
                  className="w-full rounded-2xl border border-gray-200 bg-[#FBFBF9] pl-10 pr-8 py-2.5 text-xs text-[#1F251A] outline-none focus:border-[#414E36] focus:bg-white transition"
                />
                {allAppointmentsSearch && (
                  <button
                    onClick={() => { setAllAppointmentsSearch(""); setAllAppointmentsPage(1); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Filter Button */}
              <button
                type="button"
                onClick={() => setShowAllAppointmentsFilters(prev => !prev)}
                className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition shadow-xs cursor-pointer ${
                  showAllAppointmentsFilters || allAppointmentsStatusFilter !== "All" || allAppointmentsDoctorFilter !== "All"
                    ? "bg-[#414E36] text-white border-[#414E36]"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
                title={tr.filterTitle || "Filter"}
              >
                <Filter size={16} />
              </button>
            </div>
          </div>

          {/* Expandable Filter Bar */}
          {showAllAppointmentsFilters && (
            <div className="p-4 rounded-2xl bg-[#FBFBF9] border border-[#414E36]/10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs animate-fadeIn">
              <div>
                <label className="block font-bold text-[#1F251A] mb-1">{tr.colStatus || "Status"}</label>
                <select
                  value={allAppointmentsStatusFilter}
                  onChange={(e) => { setAllAppointmentsStatusFilter(e.target.value); setAllAppointmentsPage(1); }}
                  className="w-full rounded-xl border border-gray-200 bg-white p-2 text-xs font-semibold text-[#1F251A] outline-none"
                >
                  <option value="All">{tr.filterStatusAll || "All Statuses"}</option>
                  <option value="pending">{tr.statusLabels?.pending || "Pending"}</option>
                  <option value="confirmed">{tr.statusLabels?.confirmed || "Confirmed"}</option>
                  <option value="checked_in">{tr.statusLabels?.checkedIn || "Checked In"}</option>
                  <option value="in_progress">{tr.statusLabels?.inProgress || "In Progress"}</option>
                  <option value="completed">{tr.statusLabels?.completed || "Completed"}</option>
                  <option value="postponed">{tr.statusLabels?.postponed || "Postponed"}</option>
                  <option value="canceled">{tr.statusLabels?.canceled || "Canceled"}</option>
                  <option value="no_show">{tr.statusLabels?.noShow || "No Show"}</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-[#1F251A] mb-1">{tr.colDoctor || "Doctor"}</label>
                <select
                  value={allAppointmentsDoctorFilter}
                  onChange={(e) => { setAllAppointmentsDoctorFilter(e.target.value); setAllAppointmentsPage(1); }}
                  className="w-full rounded-xl border border-gray-200 bg-white p-2 text-xs font-semibold text-[#1F251A] outline-none"
                >
                  <option value="All">{tr.filterDoctorAll || "All Doctors"}</option>
                  {Array.from(new Set(mergedAppointments.map(r => r.doctor_name).filter(Boolean))).map((doc: any) => (
                    <option key={doc} value={doc}>{doc}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => {
                    setAllAppointmentsSearch("");
                    setAllAppointmentsStatusFilter("All");
                    setAllAppointmentsDoctorFilter("All");
                    setAllAppointmentsPage(1);
                  }}
                  className="w-full rounded-xl border border-gray-200 bg-white py-2 text-xs font-bold text-[#5A6A51] hover:bg-gray-100 transition"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          )}

          {/* Table Container */}
          <div className="w-full overflow-hidden rounded-2xl border border-gray-100">
            <table className="w-full text-start text-xs border-collapse table-fixed">
              <thead>
                <tr className="border-b border-gray-100 bg-[#F9F9F7] text-[10px] uppercase font-bold tracking-tight text-[#9CA3AF]">
                  <th className="py-3 px-2.5 text-start font-bold w-[14%]">{tr.colDateTime || "DATE & TIME"}</th>
                  <th className="py-3 px-2.5 text-start font-bold w-[20%]">{tr.colPatient || "PATIENT"}</th>
                  <th className="py-3 px-2.5 text-start font-bold w-[18%]">{tr.colService || "SERVICE"}</th>
                  <th className="py-3 px-2.5 text-start font-bold w-[16%]">{tr.colDoctor || "DOCTOR"}</th>
                  <th className="py-3 px-2.5 text-start font-bold w-[8%]">{tr.colRoom || "ROOM"}</th>
                  <th className="py-3 px-2.5 text-start font-bold w-[12%]">{tr.colStatus || "STATUS"}</th>
                  <th className="py-3 px-2.5 text-start font-bold w-[10%]">{tr.colPayment || "PAYMENT"}</th>
                  <th className="py-3 px-2.5 text-start font-bold w-[12%]">{tr.colAmount || "AMOUNT"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {paginatedAllAppointments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-14 text-center text-sm text-[#5A6A51]">
                      {tr.noAllAppointmentsFound || "No appointments match your search or filter criteria."}
                    </td>
                  </tr>
                ) : (
                  paginatedAllAppointments.map((item) => {
                    const stConfig = getStatusConfig(item.status);
                    const payStyle = getPaymentStyle(item.paymentStatus);
                    const displayTimeStr = formatDisplayTime(item.time);
                    const rawAmt = Number(item.total_price || item.totalPrice || item.final_price || item.price || (Number(item.amountPaid || 0) + Number(item.amountLeft || 0))) || 0;

                    return (
                      <tr
                        key={item.id}
                        onClick={() => onViewBookingDetails ? onViewBookingDetails(item.raw || item) : null}
                        className="hover:bg-[#FBFBF9] transition cursor-pointer group"
                      >
                        {/* 1. Date & Time */}
                        <td className="py-3 px-2.5">
                          <span className="font-extrabold text-[#111827] text-xs block truncate">{item.date}</span>
                          <span className="text-[11px] font-bold text-[#414E36] block truncate">{displayTimeStr}</span>
                        </td>

                        {/* 2. Patient & Phone */}
                        <td className="py-3 px-2.5">
                          <div className="min-w-0">
                            <span className="font-extrabold text-[#111827] text-xs block truncate">{item.customer_name}</span>
                            <span className="text-[11px] font-mono text-gray-500 font-medium block truncate">{item.customer_phone}</span>
                          </div>
                        </td>

                        {/* 3. Service */}
                        <td className="py-3 px-2.5">
                          <div className="min-w-0">
                            <span className="font-extrabold text-[#111827] text-xs block truncate">{item.service_name}</span>
                            <span className="text-[10px] text-gray-400 font-medium truncate block">{item.service_variant}</span>
                          </div>
                        </td>

                        {/* 4. Doctor */}
                        <td className="py-3 px-2.5">
                          <div className="min-w-0">
                            <span className="font-extrabold text-[#111827] text-xs block truncate">{item.doctor_name}</span>
                            <span className="text-[10px] text-gray-400 font-medium block truncate">{item.doctorSpecialty || "Specialist"}</span>
                          </div>
                        </td>

                        {/* 5. Room */}
                        <td className="py-3 px-2.5 text-[#6B7280] font-medium text-xs truncate">
                          {item.room}
                        </td>

                        {/* 6. Status */}
                        <td className="py-3 px-2.5">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${stConfig.bg} ${stConfig.text}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${stConfig.dot}`}></span>
                            {stConfig.label}
                          </span>
                        </td>

                        {/* 7. Payment */}
                        <td className="py-3 px-2.5">
                          <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${payStyle}`}>
                            {paymentStatusLabel(item.paymentStatus)}
                          </span>
                        </td>

                        {/* 8. Amount */}
                        <td className="py-3 px-2.5 font-extrabold text-[#111827] text-xs">
                          {rawAmt > 0 ? `EGP ${rawAmt.toLocaleString()}` : "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs text-[#6B7280] border-t border-gray-100 pt-3">
            <div>
              {tr.showingPrefix || "Showing"} <span className="font-semibold text-[#111827]">{totalAllAppointments > 0 ? allAppointmentsStartIndex + 1 : 0}</span> {tr.toWord || "to"}{" "}
              <span className="font-semibold text-[#111827]">{Math.min(allAppointmentsStartIndex + allAppointmentsPerPage, totalAllAppointments)}</span>{" "}
              {tr.ofWord || "of"} <span className="font-semibold text-[#111827]">{totalAllAppointments}</span> {tr.appointmentsSuffix || "appointments"}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span>{tr.rowsPerPageLabel || "Rows per page:"}</span>
                <select
                  value={allAppointmentsPerPage}
                  onChange={(e) => { setAllAppointmentsPerPage(Number(e.target.value)); setAllAppointmentsPage(1); }}
                  className="rounded-lg border border-gray-200 bg-white px-2 py-1 font-semibold text-[#374151] outline-none"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={allAppointmentsPage <= 1}
                  onClick={() => setAllAppointmentsPage(prev => Math.max(1, prev - 1))}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white font-semibold text-[#374151] hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  ‹
                </button>
                {Array.from({ length: Math.min(5, totalAllPages) }, (_, i) => {
                  let pageNum = i + 1;
                  if (totalAllPages > 5 && allAppointmentsPage > 3) {
                    pageNum = Math.min(totalAllPages - 4 + i, allAppointmentsPage - 2 + i);
                  }
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setAllAppointmentsPage(pageNum)}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition ${
                        allAppointmentsPage === pageNum
                          ? "bg-[#414E36] text-white shadow-xs"
                          : "border border-gray-200 bg-white text-[#374151] hover:bg-gray-50"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  type="button"
                  disabled={allAppointmentsPage >= totalAllPages}
                  onClick={() => setAllAppointmentsPage(prev => Math.min(totalAllPages, prev + 1))}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white font-semibold text-[#374151] hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  ›
                </button>
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
                  {tr.todayBtn}
                </button>
              </div>

              {/* Weekday Labels */}
              <div className="grid grid-cols-7 text-center text-xs font-semibold text-[#6B7280] mb-2">
                {[tr.weekdays.sun, tr.weekdays.mon, tr.weekdays.tue, tr.weekdays.wed, tr.weekdays.thu, tr.weekdays.fri, tr.weekdays.sat].map((d, wIdx) => <span key={wIdx}>{d}</span>)}
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
                    { color: "#F97316", label: tr.statusLabels.pending },
                    { color: "#22C55E", label: tr.statusLabels.confirmed },
                    { color: "#3B82F6", label: tr.statusLabels.checkedIn },
                    { color: "#A855F7", label: tr.statusLabels.inProgress },
                    { color: "#0D9488", label: tr.statusLabels.completed },
                    { color: "#6366F1", label: tr.statusLabels.postponed },
                    { color: "#EF4444", label: tr.statusLabels.canceled },
                    { color: "#6B7280", label: tr.statusLabels.noShow },
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
                  <h2 className="text-xl font-bold text-[#111827]">{tr.todaysScheduleHeading}</h2>
                  <p className="text-xs font-medium text-[#6B7280]">{formattedHeaderDate}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setViewMode("all")}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-[#374151] hover:bg-gray-50 active:scale-95 cursor-pointer"
                  >
                    <span>{tr.allAppointmentsBtn}</span>
                    <ArrowRight size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTodayFilters(prev => !prev)}
                    title={tr.filterTitle || "Filter"}
                    className={`relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition cursor-pointer shadow-2xs ${
                      showTodayFilters || todayStatusFilter !== "All" || todayDoctorFilter !== "All" || todayServiceFilter !== "All" || todayPaymentFilter !== "All"
                        ? "border-[#C4AE7C] bg-[#EDE4C8] text-[#414E36]"
                        : "border-gray-200 bg-white text-[#374151] hover:bg-gray-50 active:scale-95"
                    }`}
                  >
                    <Filter size={15} />
                    {(todayStatusFilter !== "All" || todayDoctorFilter !== "All" || todayServiceFilter !== "All" || todayPaymentFilter !== "All") && (
                      <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#414E36] text-[9px] font-bold text-white">!</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Expandable Filter Panel (Inventory style) */}
              {showTodayFilters && (
                <div className="mb-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 rounded-2xl border border-[#414E36]/10 bg-[#F9F9F7] p-4 shadow-2xs animate-fadeIn">
                  {/* Status Filter */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#5A6A51]">
                      {tr.colStatus || "Status"}
                    </label>
                    <select
                      value={todayStatusFilter}
                      onChange={(e) => {
                        setTodayStatusFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2 text-xs font-semibold text-[#1F251A] outline-none focus:border-[#C4AE7C] transition"
                    >
                      <option value="All">{tr.filterAllStatuses || "All Statuses"}</option>
                      <option value="pending">{tr.statusPending || "Pending"}</option>
                      <option value="confirmed">{tr.statusConfirmed || "Confirmed"}</option>
                      <option value="in_progress">{tr.statusInProgress || "In Progress"}</option>
                      <option value="completed">{tr.statusCompleted || "Completed"}</option>
                      <option value="postponed">{tr.statusPostponed || "Postponed"}</option>
                      <option value="canceled">{tr.statusCanceled || "Canceled"}</option>
                    </select>
                  </div>

                  {/* Doctor Filter */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#5A6A51]">
                      {tr.colDoctor || "Doctor / Provider"}
                    </label>
                    <select
                      value={todayDoctorFilter}
                      onChange={(e) => {
                        setTodayDoctorFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2 text-xs font-semibold text-[#1F251A] outline-none focus:border-[#C4AE7C] transition"
                    >
                      <option value="All">{tr.filterAllDoctors || "All Doctors"}</option>
                      {uniqueDoctors.map(doc => (
                        <option key={doc} value={doc}>{doc}</option>
                      ))}
                    </select>
                  </div>

                  {/* Service Filter */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#5A6A51]">
                      {tr.colService || "Service"}
                    </label>
                    <select
                      value={todayServiceFilter}
                      onChange={(e) => {
                        setTodayServiceFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2 text-xs font-semibold text-[#1F251A] outline-none focus:border-[#C4AE7C] transition"
                    >
                      <option value="All">{tr.filterAllServices || "All Services"}</option>
                      {uniqueServices.map(srv => (
                        <option key={srv} value={srv}>{srv}</option>
                      ))}
                    </select>
                  </div>

                  {/* Payment Filter & Reset */}
                  <div className="flex flex-col gap-1.5 justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#5A6A51]">
                      {tr.colPayment || "Payment"}
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={todayPaymentFilter}
                        onChange={(e) => {
                          setTodayPaymentFilter(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2 text-xs font-semibold text-[#1F251A] outline-none focus:border-[#C4AE7C] transition"
                      >
                        <option value="All">All Payments</option>
                        <option value="paid">{tr.paymentPaid || "Paid"}</option>
                        <option value="outstanding">{tr.paymentOutstanding || "Outstanding"}</option>
                      </select>
                      {(todayStatusFilter !== "All" || todayDoctorFilter !== "All" || todayServiceFilter !== "All" || todayPaymentFilter !== "All") && (
                        <button
                          type="button"
                          onClick={() => {
                            setTodayStatusFilter("All");
                            setTodayDoctorFilter("All");
                            setTodayServiceFilter("All");
                            setTodayPaymentFilter("All");
                            setCurrentPage(1);
                          }}
                          className="shrink-0 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100 transition cursor-pointer"
                        >
                          {tr.resetFilters || "Reset"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Table */}
              <div className="w-full overflow-hidden">
                <table className="w-full text-start border-collapse text-xs table-fixed">
                  <thead>
                    <tr className="border-b border-gray-100 text-[10px] uppercase font-bold tracking-tight text-[#9CA3AF]">
                      <th className="py-2.5 px-2 text-start font-bold w-[12%]">{tr.colTime}</th>
                      <th className="py-2.5 px-2 text-start font-bold w-[20%]">{tr.colPatient}</th>
                      <th className="py-2.5 px-2 text-start font-bold w-[18%]">{tr.colService}</th>
                      <th className="py-2.5 px-2 text-start font-bold w-[16%]">{tr.colDoctor}</th>
                      <th className="py-2.5 px-2 text-start font-bold w-[10%]">{tr.colRoom}</th>
                      <th className="py-2.5 px-2 text-start font-bold w-[12%]">{tr.colStatus}</th>
                      <th className="py-2.5 px-2 text-start font-bold w-[12%]">{tr.colPayment}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {loadingDb ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-xs text-[#5A6A51]">
                          <Loader2 size={20} className="animate-spin mx-auto mb-2 text-[#1E3A2B]" />
                          {tr.loadingAppointments}
                        </td>
                      </tr>
                    ) : paginatedAppointments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-sm text-[#6B7280]">
                          <div className="max-w-sm mx-auto space-y-3">
                            <p className="font-semibold text-[#111827]">{tr.noAppointmentsPrefix} {formattedHeaderDate}.</p>
                            <button
                              type="button"
                              onClick={onNewBooking}
                              className="inline-flex items-center gap-2 rounded-xl bg-[#1E3A2B] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#162C20]"
                            >
                              <Plus size={14} />
                              <span>{tr.createNewBookingBtn}</span>
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
                            className="group cursor-pointer transition hover:bg-emerald-50/50"
                          >
                            <td className="py-2.5 px-2 font-bold text-[#111827] text-[11px] whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span className={`w-1 h-3.5 rounded-full shrink-0 ${stConfig.dot}`}></span>
                                <span>{displayTimeStr}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-2">
                              <div className="min-w-0">
                                <span className="font-semibold text-[#111827] block text-xs truncate">{row.customer_name}</span>
                                <span className="text-[10px] font-mono text-gray-500 font-medium block truncate">{row.customer_phone}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-2">
                              <div className="flex flex-col min-w-0">
                                <span className="font-bold text-[#111827] text-xs truncate">{row.service_name}</span>
                                <span className="text-[10px] font-medium text-[#9CA3AF] truncate">{row.service_variant}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-2">
                              <span className="font-medium text-[#374151] text-xs truncate block">{row.doctor_name}</span>
                            </td>
                            <td className="py-2.5 px-2 text-[#6B7280] font-medium text-xs truncate">{row.room}</td>
                            <td className="py-2.5 px-2">
                              <div className="flex flex-col items-start gap-0.5">
                                <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${stConfig.bg} ${stConfig.text} whitespace-nowrap`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${stConfig.dot}`}></span>
                                  {stConfig.label}
                                </span>
                                {row.isStaleSession && (
                                  <span
                                    title={
                                      row.staleElapsedLabel
                                        ? `${tr.staleTooltipPrefix} ${row.staleElapsedLabel} ${tr.staleTooltipSuffix}`
                                        : tr.staleTooltipNoElapsed
                                    }
                                    className="inline-flex items-center gap-1 rounded-full bg-red-50 px-1.5 py-0.5 text-[9px] font-bold text-red-700 border border-red-200 whitespace-nowrap"
                                  >
                                    <AlertCircle size={9} />
                                    {row.staleElapsedLabel ? `${tr.openPrefix} ${row.staleElapsedLabel}` : tr.leftOpenBadge}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-2">
                              <span className={`inline-flex items-center rounded-md border px-1 py-0.5 text-[9px] font-bold ${payStyle} whitespace-nowrap`}>
                                {paymentStatusLabel(row.paymentStatus)}
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
                  {tr.showingPrefix} <span className="font-semibold text-[#111827]">{totalAppointments > 0 ? startIndex + 1 : 0}</span> {tr.toWord}{" "}
                  <span className="font-semibold text-[#111827]">{Math.min(startIndex + rowsPerPage, totalAppointments)}</span>{" "}
                  {tr.ofWord} <span className="font-semibold text-[#111827]">{totalAppointments}</span> {tr.appointmentsSuffix}
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span>{tr.rowsPerPageLabel}</span>
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
                    <span className="px-2 font-semibold text-[#111827]">{tr.pageLabel} {safePage} {tr.ofWord} {totalPages}</span>
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
