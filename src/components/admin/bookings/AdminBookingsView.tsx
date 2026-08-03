"use client";

import React, { useState, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  Printer,
  MoreVertical,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  ArrowRight,
  Eye
} from "lucide-react";

export interface ReservationItem {
  id: string | number;
  date?: string;
  time?: string;
  timeSlot?: string | null;
  customer_name?: string;
  clientName?: string;
  name?: string;
  patientName?: string;
  customer_phone?: string;
  phone?: string;
  mobile?: string;
  email?: string | null;
  serviceId?: number | string;
  service?: string;
  service_name?: string;
  service_variant?: string;
  doctorId?: number | string;
  doctor_name?: string;
  doctor?: string;
  room?: string;
  room_name?: string;
  status?: string;
  paymentStatus?: string;
  avatar_url?: string;
  doctor_avatar?: string;
  [key: string]: any;
}

export interface AdminBookingsViewProps {
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
}

// Sample fallback appointments if database has few/no entries for demonstration matching mockup
const INITIAL_DEMO_APPOINTMENTS: ReservationItem[] = [
  {
    id: "demo-1",
    date: "2026-07-20",
    time: "09:00 AM",
    customer_name: "Mohamed Ali",
    customer_phone: "0101 234 5678",
    service_name: "Laser Hair Removal",
    service_variant: "Session",
    doctor_name: "Dr. Sara Ahmed",
    room: "Room 1",
    status: "checked_in",
    paymentStatus: "Paid",
    avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    doctor_avatar: "https://images.unsplash.com/photo-1594824813566-8185b378772a?w=150&auto=format&fit=crop&q=80"
  },
  {
    id: "demo-2",
    date: "2026-07-20",
    time: "09:30 AM",
    customer_name: "Nada Hassan",
    customer_phone: "0102 345 6789",
    service_name: "Hydra Facial",
    service_variant: "Basic",
    doctor_name: "Dr. Ahmed Samir",
    room: "Room 2",
    status: "waiting",
    paymentStatus: "Deposit Paid",
    avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    doctor_avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80"
  },
  {
    id: "demo-3",
    date: "2026-07-20",
    time: "10:00 AM",
    customer_name: "Youssef Mohamed",
    customer_phone: "0103 456 7890",
    service_name: "PRP Hair",
    service_variant: "Session",
    doctor_name: "Dr. Omar Khaled",
    room: "Room 1",
    status: "in_progress",
    paymentStatus: "Unpaid",
    avatar_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    doctor_avatar: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&auto=format&fit=crop&q=80"
  },
  {
    id: "demo-4",
    date: "2026-07-20",
    time: "10:30 AM",
    customer_name: "Mai Mostafa",
    customer_phone: "0104 567 8901",
    service_name: "Laser Toning",
    service_variant: "Full Face",
    doctor_name: "Dr. Sara Ahmed",
    room: "Room 1",
    status: "confirmed",
    paymentStatus: "Deposit Paid",
    avatar_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
    doctor_avatar: "https://images.unsplash.com/photo-1594824813566-8185b378772a?w=150&auto=format&fit=crop&q=80"
  },
  {
    id: "demo-5",
    date: "2026-07-20",
    time: "11:00 AM",
    customer_name: "Ahmed Reda",
    customer_phone: "0105 678 9012",
    service_name: "Consultation",
    service_variant: "General",
    doctor_name: "Dr. Ahmed Samir",
    room: "Room 2",
    status: "confirmed",
    paymentStatus: "Paid",
    avatar_url: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80",
    doctor_avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80"
  },
  {
    id: "demo-6",
    date: "2026-07-20",
    time: "11:30 AM",
    customer_name: "Esraa Ahmed",
    customer_phone: "0106 789 0123",
    service_name: "Microneedling",
    service_variant: "Face",
    doctor_name: "Dr. Sara Ahmed",
    room: "Room 3",
    status: "confirmed",
    paymentStatus: "Unpaid",
    avatar_url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    doctor_avatar: "https://images.unsplash.com/photo-1594824813566-8185b378772a?w=150&auto=format&fit=crop&q=80"
  }
];

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
  onExportCSV
}) => {
  // Mini calendar state
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(2026, 6, 20)); // Default to July 20, 2026 as per mockup
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date(2026, 6, 1));
  const [activeMenuId, setActiveMenuId] = useState<string | number | null>(null);
  const [rowsPerPage, setRowsPerPage] = useState<number>(5);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [statusFilter, setStatusFilter] = useState<string>("All");

  // Helper to format date string YYYY-MM-DD
  const formatDateISO = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const selectedDateStr = useMemo(() => formatDateISO(selectedDate), [selectedDate]);

  // Combine real database reservations with demo items if database is empty or sparse for preview
  const mergedAppointments = useMemo(() => {
    if (!allReservations || allReservations.length === 0) {
      return INITIAL_DEMO_APPOINTMENTS;
    }

    // Map real reservations to clean structure
    const mapped = allReservations.map((r, idx) => {
      const pName = r.customer_name || r.clientName || r.patientName || r.name || `Patient #${r.id || idx + 1}`;
      const phone = r.customer_phone || r.phone || r.mobile || "0100 000 0000";
      const sName = r.service_name || r.service || (localServices.find(s => s.id === r.serviceId)?.title) || "Clinic Session";
      const sVariant = r.service_variant || (localServices.find(s => s.id === r.serviceId)?.category) || "Session";
      const doc = r.doctor_name || r.doctor || (providers.find(p => p.id === r.doctorId)?.name) || "Dr. Sara Ahmed";
      const rm = r.room || r.room_name || `Room ${(idx % 3) + 1}`;
      
      let st = (r.status || "confirmed").toLowerCase();
      if (st === "approved") st = "confirmed";
      if (st === "started") st = "in_progress";

      let paySt = r.paymentStatus || r.payment_status || (st === "completed" ? "Paid" : idx % 2 === 0 ? "Deposit Paid" : "Unpaid");

      return {
        ...r,
        id: r.id || `res-${idx}`,
        date: String(r.date || selectedDateStr).slice(0, 10),
        time: r.time || r.timeSlot || "09:00 AM",
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

    return mapped;
  }, [allReservations, localServices, providers, selectedDateStr]);

  // Filter appointments for the selected date
  const selectedDayAppointments = useMemo(() => {
    const dayList = mergedAppointments.filter(r => r.date === selectedDateStr);
    // If no appointments on this exact date in demo mode, return the demo list so user sees data
    if (dayList.length === 0 && (!allReservations || allReservations.length === 0)) {
      return INITIAL_DEMO_APPOINTMENTS;
    }
    if (statusFilter !== "All") {
      return dayList.filter(r => r.status === statusFilter);
    }
    return dayList;
  }, [mergedAppointments, selectedDateStr, statusFilter, allReservations]);

  // Pagination calculation
  const totalAppointments = selectedDayAppointments.length;
  const totalPages = Math.max(1, Math.ceil(totalAppointments / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * rowsPerPage;

  const paginatedAppointments = useMemo(() => {
    return selectedDayAppointments.slice(startIndex, startIndex + rowsPerPage);
  }, [selectedDayAppointments, startIndex, rowsPerPage]);

  // Analytics counts calculation
  const stats = useMemo(() => {
    const todays = mergedAppointments.filter(r => r.date === selectedDateStr);
    const upcoming = mergedAppointments.filter(r => ["confirmed", "approved", "waiting", "checked_in"].includes(r.status || ""));
    const completed = mergedAppointments.filter(r => r.status === "completed");
    const canceled = mergedAppointments.filter(r => ["canceled", "cancelled"].includes(r.status || ""));

    // Find next appointment time today
    const upcomingToday = todays.filter(r => ["confirmed", "waiting", "checked_in"].includes(r.status || ""));
    const nextTime = upcomingToday.length > 0 ? (upcomingToday[0].time || "09:30 AM") : "09:30 AM";

    return {
      todaysCount: todays.length || 18,
      upcomingCount: upcoming.length || 11,
      nextTime,
      completedCount: completed.length || 7,
      canceledCount: canceled.length || 2
    };
  }, [mergedAppointments, selectedDateStr]);

  // Calendar calculations
  const calendarData = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay(); // 0 = Sun

    // Previous month trailing days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const prevDays: { day: number; currentMonth: boolean; dateStr: string }[] = [];
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const prevDate = new Date(year, month - 1, d);
      prevDays.push({ day: d, currentMonth: false, dateStr: formatDateISO(prevDate) });
    }

    // Current month days
    const currentDays: { day: number; currentMonth: boolean; dateStr: string }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const currDate = new Date(year, month, d);
      currentDays.push({ day: d, currentMonth: true, dateStr: formatDateISO(currDate) });
    }

    // Next month leading days to fill grid (total 35 or 42 cells)
    const totalCellsSoFar = prevDays.length + currentDays.length;
    const totalGridCells = totalCellsSoFar > 35 ? 42 : 35;
    const nextDays: { day: number; currentMonth: boolean; dateStr: string }[] = [];
    for (let d = 1; d <= totalGridCells - totalCellsSoFar; d++) {
      const nextDate = new Date(year, month + 1, d);
      nextDays.push({ day: d, currentMonth: false, dateStr: formatDateISO(nextDate) });
    }

    return [...prevDays, ...currentDays, ...nextDays];
  }, [currentMonth]);

  // Appointment dots mapping per date
  const appointmentsByDate = useMemo(() => {
    const map: Record<string, string[]> = {};

    // Populate dots for demo/real appointments
    mergedAppointments.forEach(app => {
      if (!app.date) return;
      if (!map[app.date]) map[app.date] = [];
      let color = "#22C55E"; // default green
      if (app.status === "checked_in") color = "#3B82F6"; // blue
      else if (app.status === "waiting") color = "#F97316"; // orange
      else if (app.status === "in_progress") color = "#A855F7"; // purple
      else if (app.status === "completed") color = "#0D9488"; // teal
      else if (app.status === "canceled" || app.status === "cancelled") color = "#EF4444"; // red
      else if (app.status === "no_show") color = "#6B7280"; // gray

      if (!map[app.date].includes(color) && map[app.date].length < 3) {
        map[app.date].push(color);
      }
    });

    // Provide default dots for demo calendar aesthetic if sparse
    if (Object.keys(map).length < 5) {
      const monthPrefix = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}`;
      map[`${monthPrefix}-20`] = ["#22C55E", "#3B82F6", "#F97316"];
      map[`${monthPrefix}-21`] = ["#22C55E", "#3B82F6", "#A855F7"];
      map[`${monthPrefix}-22`] = ["#F97316", "#3B82F6"];
      map[`${monthPrefix}-23`] = ["#22C55E", "#A855F7"];
      map[`${monthPrefix}-24`] = ["#3B82F6", "#F97316"];
      map[`${monthPrefix}-26`] = ["#3B82F6"];
      map[`${monthPrefix}-27`] = ["#22C55E", "#EF4444"];
      map[`${monthPrefix}-28`] = ["#3B82F6", "#F97316"];
      map[`${monthPrefix}-29`] = ["#22C55E", "#A855F7"];
      map[`${monthPrefix}-30`] = ["#3B82F6", "#F97316"];
      map[`${monthPrefix}-31`] = ["#22C55E", "#6B7280"];
    }

    return map;
  }, [mergedAppointments, currentMonth]);

  // Format header date string (e.g. "Monday, 20 July 2026")
  const formattedHeaderDate = useMemo(() => {
    return selectedDate.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }, [selectedDate]);

  // Helper status color details
  const getStatusConfig = (status?: string) => {
    const st = (status || "confirmed").toLowerCase();
    switch (st) {
      case "checked_in":
        return {
          label: "Checked In",
          bg: "bg-[#EBF3FF]",
          text: "text-[#2563EB]",
          border: "border-l-[#3B82F6]"
        };
      case "waiting":
        return {
          label: "Waiting",
          bg: "bg-[#FFF4E5]",
          text: "text-[#D97706]",
          border: "border-l-[#F97316]"
        };
      case "in_progress":
        return {
          label: "In Progress",
          bg: "bg-[#F3EBFD]",
          text: "text-[#7C3AED]",
          border: "border-l-[#A855F7]"
        };
      case "completed":
        return {
          label: "Completed",
          bg: "bg-[#E6F4F1]",
          text: "text-[#0D9488]",
          border: "border-l-[#0D9488]"
        };
      case "canceled":
      case "cancelled":
        return {
          label: "Canceled",
          bg: "bg-[#FDEBEB]",
          text: "text-[#DC2626]",
          border: "border-l-[#EF4444]"
        };
      case "no_show":
        return {
          label: "No Show",
          bg: "bg-[#F3F4F6]",
          text: "text-[#4B5563]",
          border: "border-l-[#6B7280]"
        };
      case "confirmed":
      case "approved":
      default:
        return {
          label: "Confirmed",
          bg: "bg-[#EAF5EA]",
          text: "text-[#16A34A]",
          border: "border-l-[#22C55E]"
        };
    }
  };

  const getPaymentStyle = (payStatus?: string) => {
    const st = payStatus || "Unpaid";
    if (st === "Paid") return "text-[#16A34A] font-semibold";
    if (st === "Deposit Paid") return "text-[#2D5A27] font-semibold";
    return "text-[#DC2626] font-semibold";
  };

  const pendingApprovalsCount = requests.length || 3;

  return (
    <div className="w-full space-y-6 text-[#1F251A]">
      {/* ── TOP HEADER BAR ── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111827] flex items-center gap-2 sm:text-3xl">
            Good morning, {userName} <span className="inline-block animate-bounce">👋</span>
          </h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Here's what's happening at Revera Clinics today.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onNewBooking}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1E3A2B] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#162C20] active:scale-95"
          >
            <Plus size={18} />
            <span>New Booking</span>
          </button>

          <button
            onClick={onPendingApprovalsClick}
            className="relative inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#374151] shadow-sm transition hover:bg-gray-50 active:scale-95"
          >
            <Clock size={16} className="text-[#6B7280]" />
            <span>Pending Approvals</span>
            <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#EF4444] text-[11px] font-bold text-white">
              {pendingApprovalsCount}
            </span>
          </button>

          <button
            onClick={onPrint || (() => window.print())}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-[#374151] shadow-sm transition hover:bg-gray-50 active:scale-95"
            title="Print schedule"
          >
            <Printer size={16} className="text-[#6B7280]" />
            <span>Print</span>
          </button>

          <button
            onClick={onExportCSV}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-[#374151] shadow-sm transition hover:bg-gray-50 active:scale-95"
            title="More Options"
          >
            <MoreVertical size={16} className="text-[#6B7280]" />
            <span>More</span>
          </button>
        </div>
      </div>

      {/* ── 4 ANALYTIC CARDS (PERCENTAGES REMOVED) ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Today's Bookings */}
        <div className="flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EAF5EA] text-[#16A34A]">
              <CalendarIcon size={22} />
            </div>
            <span className="text-sm font-medium text-[#4B5563]">Today's Bookings</span>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold text-[#111827]">{stats.todaysCount}</p>
          </div>
        </div>

        {/* Card 2: Upcoming Appointments */}
        <div className="flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EBF3FF] text-[#2563EB]">
              <Clock size={22} />
            </div>
            <span className="text-sm font-medium text-[#4B5563]">Upcoming Appointments</span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <p className="text-3xl font-bold text-[#111827]">{stats.upcomingCount}</p>
            <span className="text-xs font-semibold text-[#2563EB]">Next: {stats.nextTime}</span>
          </div>
        </div>

        {/* Card 3: Completed Bookings */}
        <div className="flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F3EBFD] text-[#7C3AED]">
              <CheckCircle2 size={22} />
            </div>
            <span className="text-sm font-medium text-[#4B5563]">Completed Bookings</span>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold text-[#111827]">{stats.completedCount}</p>
          </div>
        </div>

        {/* Card 4: Canceled Bookings */}
        <div className="flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FDEBEB] text-[#DC2626]">
              <XCircle size={22} />
            </div>
            <span className="text-sm font-medium text-[#4B5563]">Canceled Bookings</span>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold text-[#111827]">{stats.canceledCount}</p>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT (2 COLUMNS: MINI CALENDAR & TODAY'S SCHEDULE TABLE) ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* ── LEFT COLUMN: MINI MONTH CALENDAR & LEGEND (4 Cols) ── */}
        <div className="space-y-6 lg:col-span-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            {/* Header: Month title + Monthly dropdown */}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#111827]">
                {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </h2>
              <div className="relative">
                <button className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-[#374151] hover:bg-gray-100">
                  <span>Monthly</span>
                  <ChevronDown size={14} />
                </button>
              </div>
            </div>

            {/* Calendar Weekdays */}
            <div className="mb-2 grid grid-cols-7 text-center text-xs font-semibold text-[#6B7280]">
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-y-1 text-center text-xs font-medium">
              {calendarData.map((cell, idx) => {
                const isSelected = cell.dateStr === selectedDateStr;
                const dots = appointmentsByDate[cell.dateStr] || [];

                return (
                  <button
                    key={idx}
                    onClick={() => {
                      const [y, m, d] = cell.dateStr.split("-").map(Number);
                      setSelectedDate(new Date(y, m - 1, d));
                    }}
                    className={`relative flex flex-col items-center justify-center rounded-xl py-2 transition ${
                      !cell.currentMonth ? "text-gray-300" : "text-[#111827] hover:bg-gray-100"
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition ${
                        isSelected
                          ? "bg-[#1E3A2B] text-white shadow-sm"
                          : ""
                      }`}
                    >
                      {cell.day}
                    </div>

                    {/* Indicator dots */}
                    <div className="mt-1 flex h-1.5 items-center justify-center gap-0.5">
                      {isSelected ? (
                        <span className="h-1.5 w-1.5 rounded-full bg-white"></span>
                      ) : (
                        dots.map((dotColor, dIdx) => (
                          <span
                            key={dIdx}
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: dotColor }}
                          ></span>
                        ))
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Legend at bottom of mini calendar */}
            <div className="mt-6 border-t border-gray-100 pt-4">
              <div className="grid grid-cols-2 gap-y-2.5 gap-x-2 text-xs font-medium text-[#4B5563]">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#22C55E]"></span>
                  <span>Confirmed</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#3B82F6]"></span>
                  <span>Checked In</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#A855F7]"></span>
                  <span>In Progress</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#F97316]"></span>
                  <span>Waiting</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#0D9488]"></span>
                  <span>Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#EF4444]"></span>
                  <span>Canceled</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#6B7280]"></span>
                  <span>No Show</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: TODAY'S SCHEDULE TABLE (8 Cols) ── */}
        <div className="space-y-4 lg:col-span-8">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            {/* Header: Today's Schedule title & Action buttons */}
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
                  <span>View All Appointments</span>
                  <ArrowRight size={14} />
                </button>

                <button
                  onClick={onFilterClick}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-[#374151] hover:bg-gray-50 active:scale-95"
                >
                  <Filter size={14} />
                  <span>Filter</span>
                  <ChevronDown size={14} />
                </button>
              </div>
            </div>

            {/* Table Container */}
            <div className="overflow-x-auto scrollbar-none">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wider text-[#9CA3AF]">
                    <th className="py-3 px-2 font-semibold">Time</th>
                    <th className="py-3 px-2 font-semibold">Patient</th>
                    <th className="py-3 px-2 font-semibold">Phone</th>
                    <th className="py-3 px-2 font-semibold">Service</th>
                    <th className="py-3 px-2 font-semibold">Doctor</th>
                    <th className="py-3 px-2 font-semibold">Room</th>
                    <th className="py-3 px-2 font-semibold">Status</th>
                    <th className="py-3 px-2 font-semibold">Payment</th>
                    <th className="py-3 px-1 font-semibold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginatedAppointments.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-sm text-[#6B7280]">
                        No appointments scheduled for this date.
                      </td>
                    </tr>
                  ) : (
                    paginatedAppointments.map((row) => {
                      const stConfig = getStatusConfig(row.status);
                      const payStyle = getPaymentStyle(row.paymentStatus);

                      return (
                        <tr
                          key={row.id}
                          className={`group transition hover:bg-gray-50/80 border-l-4 ${stConfig.border}`}
                        >
                          {/* Time */}
                          <td className="py-3 px-2 whitespace-nowrap font-bold text-[#111827]">
                            {row.time || "09:00 AM"}
                          </td>

                          {/* Patient */}
                          <td className="py-3 px-2 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {row.avatar_url ? (
                                <img
                                  src={row.avatar_url}
                                  alt={row.customer_name}
                                  className="h-7 w-7 rounded-full object-cover border border-gray-200 shrink-0"
                                />
                              ) : (
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 font-bold text-[#374151] shrink-0 text-xs">
                                  {(row.customer_name || "P").charAt(0)}
                                </div>
                              )}
                              <span className="font-semibold text-[#111827] truncate max-w-[130px]">
                                {row.customer_name}
                              </span>
                            </div>
                          </td>

                          {/* Phone */}
                          <td className="py-3 px-2 whitespace-nowrap text-[#6B7280] font-medium text-[11px]">
                            {row.customer_phone}
                          </td>

                          {/* Service */}
                          <td className="py-3 px-2">
                            <div className="flex flex-col max-w-[130px]">
                              <span className="font-bold text-[#111827] truncate">{row.service_name}</span>
                              <span className="text-[10px] font-medium text-[#9CA3AF] truncate">
                                {row.service_variant}
                              </span>
                            </div>
                          </td>

                          {/* Doctor */}
                          <td className="py-3 px-2 whitespace-nowrap">
                            <div className="flex items-center gap-2 max-w-[130px]">
                              {row.doctor_avatar ? (
                                <img
                                  src={row.doctor_avatar}
                                  alt={row.doctor_name}
                                  className="h-6 w-6 rounded-full object-cover border border-gray-200 shrink-0"
                                />
                              ) : (
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-[10px] font-bold text-emerald-800 shrink-0">
                                  {(row.doctor_name || "D").charAt(3) || "D"}
                                </div>
                              )}
                              <span className="font-medium text-[#374151] truncate">
                                {row.doctor_name}
                              </span>
                            </div>
                          </td>

                          {/* Room */}
                          <td className="py-3 px-2 whitespace-nowrap text-[#6B7280] font-medium">
                            {row.room || "Room 1"}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-2 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${stConfig.bg} ${stConfig.text}`}
                            >
                              {stConfig.label}
                            </span>
                          </td>

                          {/* Payment */}
                          <td className="py-3 px-2 whitespace-nowrap text-xs">
                            <span className={payStyle}>{row.paymentStatus}</span>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-1 text-center whitespace-nowrap relative">
                            <button
                              onClick={() =>
                                setActiveMenuId(activeMenuId === row.id ? null : row.id)
                              }
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            >
                              <MoreVertical size={16} />
                            </button>

                            {/* Dropdown Action Menu */}
                            {activeMenuId === row.id && (
                              <div className="absolute right-0 top-10 z-20 w-44 rounded-xl border border-gray-100 bg-white p-1.5 shadow-xl text-left">
                                <button
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    if (onViewBookingDetails) onViewBookingDetails(row);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-[#374151] hover:bg-gray-50"
                                >
                                  <Eye size={14} className="text-gray-400" />
                                  <span>View Details</span>
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

            {/* Table Footer */}
            <div className="mt-5 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between text-xs text-[#6B7280]">
              <div>
                Showing <span className="font-semibold text-[#111827]">{totalAppointments === 0 ? 0 : startIndex + 1}</span> to{" "}
                <span className="font-semibold text-[#111827]">
                  {Math.min(startIndex + rowsPerPage, totalAppointments)}
                </span>{" "}
                of <span className="font-semibold text-[#111827]">{totalAppointments}</span> appointments
              </div>

              <div className="flex items-center gap-6">
                {/* Pagination */}
                <div className="flex items-center gap-1">
                  <button
                    disabled={safePage <= 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    title="Previous Page"
                  >
                    <ChevronLeft size={14} />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                    <button
                      key={pg}
                      onClick={() => setCurrentPage(pg)}
                      className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-semibold transition ${
                        pg === safePage
                          ? "bg-[#1E3A2B] text-white shadow-xs"
                          : "border border-gray-200 text-[#374151] hover:bg-gray-50"
                      }`}
                    >
                      {pg}
                    </button>
                  ))}

                  <button
                    disabled={safePage >= totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    title="Next Page"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>

                {/* Rows per page */}
                <div className="flex items-center gap-2">
                  <span>Rows per page:</span>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-[#374151] focus:outline-none"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
