"use client";

import React, { useState, useMemo } from "react";
import {
  ArrowLeft,
  Printer,
  User,
  Clock,
  ShoppingBag,
  MapPin,
  ClipboardList,
  Filter,
  Download,
  Search,
  Calendar,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Stethoscope
} from "lucide-react";

export interface DoctorProfileDetailsViewProps {
  doctor: any;
  onBack: () => void;
  reservations?: any[];
  branches?: any[];
  localServices?: any[];
}

export const DoctorProfileDetailsView: React.FC<DoctorProfileDetailsViewProps> = ({
  doctor,
  onBack,
  reservations = [],
  branches = [],
  localServices = []
}) => {
  // State
  const [scheduleType, setScheduleType] = useState<"In-Clinic" | "Online">("In-Clinic");
  const [visitSearch, setVisitSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<"Today" | "This Week" | "This Month" | "Custom">("This Month");
  const [rowsPerPage, setRowsPerPage] = useState<number>(5);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedVisit, setSelectedVisit] = useState<any | null>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("All");

  // Doctor Data Normalization
  const doctorName = doctor?.name || "Dr. Sara El Gamel";
  const doctorSpecialty = doctor?.specialty || "Dermatologist • Laser Specialist";
  const doctorSubSpecialty = doctor?.sub_specialty || "Dermatologist";
  const doctorEmployeeId = doctor?.employee_id || doctor?.id ? `DOC-${String(doctor?.id).slice(-3).padStart(3, "0")}` : "DOC-002";
  const doctorAvatar = doctor?.avatar || doctor?.avatar_url || "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300&auto=format&fit=crop&q=80";
  const roomName = doctor?.room || doctor?.room_name || "Room 4";
  const yearsExp = doctor?.years_of_experience || "8 Years";
  const languages = doctor?.languages || "Arabic, English";
  const employmentType = doctor?.employment_type || "Full Time";

  // Working Hours Mock / Real Data
  const defaultSchedule = [
    { day: "Sunday", hours: "09:00 AM - 01:00 PM", hours2: "03:00 PM - 07:00 PM" },
    { day: "Monday", hours: "10:00 AM - 06:00 PM" },
    { day: "Tuesday", hours: "Off" },
    { day: "Wednesday", hours: "09:00 AM - 01:00 PM", hours2: "03:00 PM - 07:00 PM" },
    { day: "Thursday", hours: "10:00 AM - 06:00 PM" },
    { day: "Friday", hours: "09:00 AM - 01:00 PM", hours2: "03:00 PM - 07:00 PM" },
    { day: "Saturday", hours: "10:00 AM - 02:00 PM" },
  ];

  // Services Provided
  const servicesProvided = useMemo(() => {
    if (Array.isArray(doctor?.services) && doctor.services.length > 0) {
      return doctor.services;
    }
    return [
      "Laser Hair Removal",
      "Botox",
      "Fillers",
      "PRP",
      "Skin Rejuvenation",
      "Chemical Peels",
      "Microneedling",
      "Acne Treatment",
      "Mesotherapy"
    ];
  }, [doctor]);

  // Doctor Branches
  const doctorBranches = useMemo(() => {
    if (branches && branches.length > 0) {
      return branches.slice(0, 3).map((b) => b.name_en || b.name || "Branch");
    }
    return ["New Cairo Branch", "Nasr City Branch", "Sheikh Zayed Branch"];
  }, [branches]);

  // Demo Visit History
  const demoVisits = [
    {
      id: "V-101",
      date: "03 Aug 2026",
      patientName: "Mohamed Ahmed",
      patientPhone: "01012345678",
      service: "Laser Hair Removal",
      variant: "Full Body",
      branch: "New Cairo Branch",
      sessionType: "In-Clinic",
      status: "Completed",
      notes: "Full body session completed smoothly. Next touchup in 4 weeks."
    },
    {
      id: "V-102",
      date: "02 Aug 2026",
      patientName: "Ahmed Ali",
      patientPhone: "01123456789",
      service: "Botox",
      variant: "Face",
      branch: "New Cairo Branch",
      sessionType: "In-Clinic",
      status: "Completed",
      notes: "Forehead and crow's feet injection (24 units)."
    },
    {
      id: "V-103",
      date: "01 Aug 2026",
      patientName: "Sara Hassan",
      patientPhone: "01098765432",
      service: "PRP",
      variant: "Hair",
      branch: "Sheikh Zayed Branch",
      sessionType: "In-Clinic",
      status: "Completed",
      notes: "Scalp PRP session 2 of 4."
    },
    {
      id: "V-104",
      date: "30 Jul 2026",
      patientName: "Omar Tarek",
      patientPhone: "01024681357",
      service: "Fillers",
      variant: "Lips",
      branch: "Nasr City Branch",
      sessionType: "In-Clinic",
      status: "Completed",
      notes: "1ml Juvederm lip contouring."
    },
    {
      id: "V-105",
      date: "29 Jul 2026",
      patientName: "Mariam Adel",
      patientPhone: "01011223344",
      service: "Skin Rejuvenation",
      variant: "Face",
      branch: "New Cairo Branch",
      sessionType: "In-Clinic",
      status: "Completed",
      notes: "Dermapen session with hyaluronic serum."
    },
    {
      id: "V-106",
      date: "28 Jul 2026",
      patientName: "Khaled Youssef",
      patientPhone: "01234567890",
      service: "Acne Treatment",
      variant: "Face",
      branch: "New Cairo Branch",
      sessionType: "In-Clinic",
      status: "Completed",
      notes: "Salicylic peel applied."
    }
  ];

  // Combined Visit List (Filter real reservations matching doctor or fallback demoVisits)
  const allVisits = useMemo(() => {
    if (Array.isArray(reservations) && reservations.length > 0) {
      const filtered = reservations.filter((r) => {
        if (!r) return false;
        const docMatch = r.doctor_name || r.doctor || "";
        return docMatch.toLowerCase().includes(doctorName.toLowerCase()) || docMatch.toLowerCase().includes("sara");
      });
      if (filtered.length > 0) {
        return filtered.map((r, idx) => ({
          id: r.id || `RES-${idx}`,
          date: r.date || "03 Aug 2026",
          patientName: r.customer_name || r.clientName || r.patientName || "Patient",
          patientPhone: r.customer_phone || r.phone || r.mobile || "01012345678",
          service: r.service_name || r.service || "Dermatology Session",
          variant: r.service_variant || "Standard",
          branch: r.branch_name || "New Cairo Branch",
          sessionType: "In-Clinic",
          status: r.status ? (r.status.charAt(0).toUpperCase() + r.status.slice(1)) : "Completed",
          notes: r.notes || "Routine clinical session."
        }));
      }
    }
    return demoVisits;
  }, [reservations, doctorName]);

  // Filter visits
  const filteredVisits = useMemo(() => {
    return allVisits.filter((v) => {
      // Search term
      if (visitSearch.trim()) {
        const query = visitSearch.toLowerCase();
        const matchesSearch =
          v.patientName.toLowerCase().includes(query) ||
          v.patientPhone.toLowerCase().includes(query) ||
          v.service.toLowerCase().includes(query) ||
          v.branch.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }
      // Status filter
      if (statusFilter !== "All" && v.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }
      return true;
    });
  }, [allVisits, visitSearch, statusFilter]);

  // Pagination
  const totalResults = filteredVisits.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * rowsPerPage;

  const paginatedVisits = useMemo(() => {
    return filteredVisits.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredVisits, startIndex, rowsPerPage]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = ["Date", "Patient Name", "Phone", "Service", "Variant", "Branch", "Session Type", "Status"];
    const rows = filteredVisits.map((v) => [
      v.date,
      `"${v.patientName}"`,
      `"${v.patientPhone}"`,
      `"${v.service}"`,
      `"${v.variant}"`,
      `"${v.branch}"`,
      v.sessionType,
      v.status
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${doctorName.replace(/\s+/g, "_")}_Visit_History.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12 font-sans bg-[#FBFBF9] p-2 sm:p-6 rounded-[36px]">
      {/* ── TOP HEADER / NAV BAR ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-2xl border border-[#E6E9EB] bg-white px-4 py-2 text-xs font-semibold text-[#1F251A] shadow-xs transition hover:bg-[#F2EFE9]"
        >
          <ArrowLeft size={16} />
          <span>Back to Doctors</span>
        </button>

        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-2xl border border-[#E6E9EB] bg-white px-4.5 py-2 text-xs font-semibold text-[#1F251A] shadow-xs transition hover:bg-[#F2EFE9]"
        >
          <Printer size={16} className="text-[#5A6A51]" />
          <span>Print Profile</span>
        </button>
      </div>

      {/* ── DOCTOR HERO CARD ── */}
      <div className="rounded-[32px] border border-[#E6E9EB] bg-white p-6 shadow-[0_10px_30px_rgba(47,61,41,0.03)]">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          {/* Avatar with Status Dot */}
          <div className="relative h-20 w-20 shrink-0">
            <img
              src={doctorAvatar}
              alt={doctorName}
              className="h-20 w-20 rounded-full object-cover border-2 border-white shadow-md"
            />
            <span
              className="absolute bottom-1 right-1 h-4 w-4 rounded-full bg-emerald-500 border-2 border-white"
              title="Active / Online"
            />
          </div>

          {/* Info Details */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-[#1F251A]">{doctorName}</h1>
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200/60">
                Active
              </span>
            </div>

            <p className="text-xs font-medium text-[#5A6A51]">
              {doctorSpecialty}
            </p>

            <div className="pt-1">
              <span className="inline-flex items-center rounded-lg bg-[#F7F7F9] px-2.5 py-1 text-[11px] font-semibold text-[#374151] border border-gray-100">
                Employee ID: {doctorEmployeeId}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── MIDDLE SECTION: PERSONAL INFO & WORKING SCHEDULE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Personal Information */}
        <div className="rounded-[32px] border border-[#E6E9EB] bg-white p-6 shadow-[0_10px_30px_rgba(47,61,41,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 border-b border-gray-100 pb-4 mb-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F2EFE9] text-[#1E3A2B]">
                <User size={16} />
              </div>
              <h2 className="text-base font-bold text-[#1F251A]">Personal Information</h2>
            </div>

            <div className="grid grid-cols-2 gap-y-4 gap-x-4 text-xs">
              <div>
                <span className="text-[#9CA3AF] block mb-1 font-medium">Full Name</span>
                <span className="font-semibold text-[#1F251A]">{doctorName}</span>
              </div>

              <div>
                <span className="text-[#9CA3AF] block mb-1 font-medium">Specialty</span>
                <span className="font-semibold text-[#1F251A]">{doctorSubSpecialty}</span>
              </div>

              <div>
                <span className="text-[#9CA3AF] block mb-1 font-medium">Employment Type</span>
                <span className="font-semibold text-[#1F251A]">{employmentType}</span>
              </div>

              <div>
                <span className="text-[#9CA3AF] block mb-1 font-medium">Years of Experience</span>
                <span className="font-semibold text-[#1F251A]">{yearsExp}</span>
              </div>

              <div>
                <span className="text-[#9CA3AF] block mb-1 font-medium">Languages</span>
                <span className="font-semibold text-[#1F251A]">{languages}</span>
              </div>

              <div>
                <span className="text-[#9CA3AF] block mb-1 font-medium">Room / Clinic</span>
                <span className="font-semibold text-[#1F251A]">{roomName}</span>
              </div>

              <div>
                <span className="text-[#9CA3AF] block mb-1 font-medium">Status</span>
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                  Active
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Working Schedule */}
        <div className="rounded-[32px] border border-[#E6E9EB] bg-white p-6 shadow-[0_10px_30px_rgba(47,61,41,0.03)]">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F2EFE9] text-[#1E3A2B]">
                <Clock size={16} />
              </div>
              <h2 className="text-base font-bold text-[#1F251A]">Working Schedule</h2>
            </div>

            {/* In-Clinic / Online Toggle */}
            <div className="flex items-center rounded-xl bg-[#F7F7F9] p-1 border border-gray-100">
              <button
                onClick={() => setScheduleType("In-Clinic")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition ${
                  scheduleType === "In-Clinic"
                    ? "bg-white text-[#1E3A2B] shadow-xs border border-gray-200"
                    : "text-[#6B7280] hover:text-[#1F251A]"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-emerald-600" />
                In-Clinic
              </button>
              <button
                onClick={() => setScheduleType("Online")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition ${
                  scheduleType === "Online"
                    ? "bg-white text-[#1E3A2B] shadow-xs border border-gray-200"
                    : "text-[#6B7280] hover:text-[#1F251A]"
                }`}
              >
                Online
              </button>
            </div>
          </div>

          {/* Schedule Table */}
          <div className="overflow-hidden rounded-2xl border border-gray-100">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F7F7F9] text-[11px] font-semibold text-[#9CA3AF] border-b border-gray-100">
                  <th className="py-2.5 px-4 font-semibold">Day</th>
                  <th className="py-2.5 px-4 font-semibold">Working Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-[#374151]">
                {defaultSchedule.map((item) => (
                  <tr key={item.day} className="hover:bg-gray-50/50">
                    <td className="py-2.5 px-4 font-semibold text-[#1F251A]">{item.day}</td>
                    <td className="py-2.5 px-4 font-medium">
                      {item.hours === "Off" ? (
                        <span className="inline-block rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-500">
                          Off
                        </span>
                      ) : (
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="rounded-md bg-[#F2EFE9]/70 px-2 py-0.5 text-[11px] font-semibold text-[#1E3A2B]">
                            {item.hours}
                          </span>
                          {item.hours2 && (
                            <span className="rounded-md bg-[#F2EFE9]/70 px-2 py-0.5 text-[11px] font-semibold text-[#1E3A2B]">
                              {item.hours2}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── THIRD SECTION: SERVICES & BRANCHES ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Services Provided Card (Spans 2 cols) */}
        <div className="lg:col-span-2 rounded-[32px] border border-[#E6E9EB] bg-white p-6 shadow-[0_10px_30px_rgba(47,61,41,0.03)]">
          <div className="flex items-center gap-2.5 border-b border-gray-100 pb-4 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F2EFE9] text-[#1E3A2B]">
              <ShoppingBag size={16} />
            </div>
            <h2 className="text-base font-bold text-[#1F251A]">Services & Branches</h2>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">
              Services Provided
            </h3>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {servicesProvided.map((service: string, idx: number) => (
                <span
                  key={idx}
                  className="rounded-xl border border-gray-100 bg-[#F7F7F9] px-3.5 py-1.5 text-xs font-semibold text-[#374151] hover:bg-[#F2EFE9] transition"
                >
                  {service}
                </span>
              ))}
              <span className="rounded-xl bg-[#EDE4C8] px-3 py-1.5 text-xs font-bold text-[#414E36]">
                + 8 More
              </span>
            </div>
          </div>
        </div>

        {/* Branches Card (Spans 1 col) */}
        <div className="rounded-[32px] border border-[#E6E9EB] bg-white p-6 shadow-[0_10px_30px_rgba(47,61,41,0.03)]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF] mb-4">
            Branches
          </h3>

          <div className="space-y-2.5">
            {doctorBranches.map((bName: string, idx: number) => (
              <div
                key={idx}
                className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-[#F7F7F9] p-3 transition hover:border-gray-200"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white text-[#1E3A2B] shadow-xs">
                  <MapPin size={14} />
                </div>
                <span className="text-xs font-bold text-[#1F251A]">{bName}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── FOURTH SECTION: PATIENT VISIT HISTORY ── */}
      <div className="rounded-[32px] border border-[#E6E9EB] bg-white p-6 shadow-[0_10px_30px_rgba(47,61,41,0.03)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-5 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F2EFE9] text-[#1E3A2B]">
              <ClipboardList size={16} />
            </div>
            <h2 className="text-base font-bold text-[#1F251A]">Patient Visit History</h2>
          </div>

          {/* Action Buttons: Filter & Export */}
          <div className="flex items-center gap-2.5 relative">
            <div className="relative">
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-[#374151] hover:bg-gray-50 transition shadow-xs"
              >
                <Filter size={14} className="text-[#5A6A51]" />
                <span>Filter</span>
                <ChevronDown size={14} className="text-[#9CA3AF]" />
              </button>

              {showFilterDropdown && (
                <div className="absolute right-0 top-10 z-30 w-44 rounded-2xl border border-gray-100 bg-white p-2 shadow-xl text-xs space-y-1">
                  <button
                    onClick={() => { setStatusFilter("All"); setShowFilterDropdown(false); }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 font-medium ${statusFilter === "All" ? "bg-emerald-50 text-emerald-900 font-bold" : "text-[#374151] hover:bg-gray-50"}`}
                  >
                    <span>All Statuses</span>
                  </button>
                  <button
                    onClick={() => { setStatusFilter("Completed"); setShowFilterDropdown(false); }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 font-medium ${statusFilter === "Completed" ? "bg-emerald-50 text-emerald-900 font-bold" : "text-[#374151] hover:bg-gray-50"}`}
                  >
                    <span>Completed</span>
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-[#374151] hover:bg-gray-50 transition shadow-xs"
            >
              <Download size={14} className="text-[#5A6A51]" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Search & Date Filter Bar */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-5">
          {/* Search Input */}
          <div className="relative max-w-sm flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              type="text"
              value={visitSearch}
              onChange={(e) => {
                setVisitSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by patient name or phone..."
              className="w-full rounded-2xl border border-gray-200 bg-white py-2 pl-9 pr-4 text-xs outline-none transition focus:border-[#1E3A2B] focus:ring-1 focus:ring-[#1E3A2B]"
            />
          </div>

          {/* Date Pills */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#F7F7F9] p-1 rounded-2xl border border-gray-100">
            {(["Today", "This Week", "This Month", "Custom"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setDateFilter(tab)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  dateFilter === tab
                    ? "bg-white text-[#1E3A2B] border border-gray-200 shadow-xs"
                    : "text-[#6B7280] hover:text-[#1F251A]"
                }`}
              >
                {tab === "Custom" && <Calendar size={12} />}
                <span>{tab === "Custom" ? "Custom Date" : tab}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto scrollbar-none rounded-2xl border border-gray-100">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-[#F7F7F9] text-[11px] uppercase tracking-wider text-[#9CA3AF] border-b border-gray-100">
                <th className="py-3 px-3 font-semibold">Date</th>
                <th className="py-3 px-3 font-semibold">Patient</th>
                <th className="py-3 px-3 font-semibold">Service</th>
                <th className="py-3 px-3 font-semibold">Branch</th>
                <th className="py-3 px-3 font-semibold">Session Type</th>
                <th className="py-3 px-3 font-semibold">Status</th>
                <th className="py-3 px-2 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-[#374151]">
              {paginatedVisits.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-xs text-[#9CA3AF]">
                    No patient visits recorded for this period.
                  </td>
                </tr>
              ) : (
                paginatedVisits.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50/60 transition">
                    <td className="py-3.5 px-3 whitespace-nowrap font-medium text-[#1F251A]">
                      {v.date}
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-semibold text-[#1F251A]">{v.patientName}</span>
                        <span className="text-[11px] font-medium text-[#9CA3AF]">
                          {v.patientPhone}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="flex flex-col max-w-[140px]">
                        <span className="font-semibold text-[#1F251A] truncate">{v.service}</span>
                        <span className="text-[11px] font-medium text-[#9CA3AF] truncate">
                          {v.variant}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap font-medium text-[#374151]">
                      {v.branch}
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap font-medium text-[#374151]">
                      {v.sessionType}
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200/50">
                        {v.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-2 text-center whitespace-nowrap">
                      <button
                        onClick={() => setSelectedVisit(v)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-[#1F251A] transition"
                        title="View Visit Details"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer / Pagination */}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs text-[#6B7280]">
          <div>
            Showing <span className="font-semibold text-[#111827]">{totalResults === 0 ? 0 : startIndex + 1}</span> to{" "}
            <span className="font-semibold text-[#111827]">
              {Math.min(startIndex + rowsPerPage, totalResults)}
            </span>{" "}
            of <span className="font-semibold text-[#111827]">{totalResults}</span> results
          </div>

          <div className="flex items-center gap-6">
            {/* Page Buttons */}
            <div className="flex items-center gap-1">
              <button
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
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
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Rows per page */}
            <div className="flex items-center gap-2">
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-[#374151] focus:outline-none"
              >
                <option value={5}>5 / page</option>
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ── VISIT DETAILS MODAL ── */}
      {selectedVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-[#1F251A]">Patient Visit Details</h3>
              <button
                onClick={() => setSelectedVisit(null)}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-[#9CA3AF]">Patient</span>
                <span className="font-bold text-[#1F251A]">{selectedVisit.patientName} ({selectedVisit.patientPhone})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-[#9CA3AF]">Date</span>
                <span className="font-semibold text-[#1F251A]">{selectedVisit.date}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-[#9CA3AF]">Service</span>
                <span className="font-semibold text-[#1F251A]">{selectedVisit.service} ({selectedVisit.variant})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-[#9CA3AF]">Branch</span>
                <span className="font-semibold text-[#1F251A]">{selectedVisit.branch}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-[#9CA3AF]">Session Type</span>
                <span className="font-semibold text-[#1F251A]">{selectedVisit.sessionType}</span>
              </div>
              <div className="py-1">
                <span className="text-[#9CA3AF] block mb-1">Doctor Clinical Notes</span>
                <p className="rounded-xl bg-[#F7F7F9] p-3 text-xs text-[#374151] font-medium border border-gray-100">
                  {selectedVisit.notes}
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedVisit(null)}
                className="rounded-xl bg-[#1E3A2B] px-4 py-2 text-xs font-semibold text-white hover:bg-[#14261d] transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
