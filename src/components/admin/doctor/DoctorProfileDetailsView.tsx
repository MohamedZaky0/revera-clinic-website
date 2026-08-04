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
  X
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
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState<number>(5);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedVisit, setSelectedVisit] = useState<any | null>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("All");

  // Real Doctor Data Normalization
  const doctorName = doctor?.name || "Doctor";
  const doctorSpecialty = doctor?.specialty || doctor?.department || "General Specialist";
  const doctorSubSpecialty = doctor?.sub_specialty || doctor?.specialty || doctor?.role || "Dermatology";
  const doctorEmployeeId = doctor?.employee_id || (doctor?.id ? `DOC-${String(doctor?.id).slice(-3).padStart(3, "0")}` : "DOC-PROV");
  const doctorAvatar = doctor?.image || doctor?.avatar || doctor?.avatar_url || doctor?.photo || null;
  const languages = doctor?.languages || "Arabic, English";
  const employmentType = doctor?.employment_type || doctor?.employmentType || "Full Time";

  // Formatted Doctor Branches
  const doctorBranches = useMemo(() => {
    let bIds: string[] = [];
    const rawSched = doctor?.workingDaysHours || doctor?.working_days_hours;
    if (rawSched && typeof rawSched === "object" && Array.isArray(rawSched.branch_ids)) {
      bIds = rawSched.branch_ids;
    } else if (doctor?.branch_ids || doctor?.branchIds) {
      bIds = doctor?.branch_ids || doctor?.branchIds;
    } else if (doctor?.branch_id || doctor?.branchId) {
      bIds = [doctor.branch_id || doctor.branchId];
    }

    const formatBranchName = (str: string) => {
      if (!str) return "Branch";
      const lower = str.trim().toLowerCase();
      if (lower === "home") return "Home Visit";
      if (lower === "main") return "Main Branch";
      return str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    };

    if (Array.isArray(bIds) && bIds.length > 0) {
      const mapped = bIds.map((id: any) => {
        const found = branches.find((b: any) => String(b.id) === String(id) || String(b.branch_id) === String(id) || String(b.name).toLowerCase() === String(id).toLowerCase());
        if (found) {
          return formatBranchName(found.name_en || found.name || `Branch ${id}`);
        }
        return formatBranchName(String(id));
      }).filter(Boolean);
      if (mapped.length > 0) return mapped;
    }

    if (Array.isArray(branches) && branches.length > 0) {
      return branches.map((b: any) => formatBranchName(b.name_en || b.name || "Branch"));
    }

    return ["Main Clinic Branch"];
  }, [doctor, branches]);

  // Aggregated Multi-Shift Schedule (Sorted Chronologically with Branch Names per Shift)
  const activeSchedule = useMemo(() => {
    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const rawSched = doctor?.workingDaysHours || doctor?.working_days_hours || doctor?.schedule;

    let parsed: any = rawSched;
    if (typeof parsed === "string") {
      try { parsed = JSON.parse(parsed); } catch (e) {}
    }

    const parseTimeToMinutes = (tStr: string): number => {
      if (!tStr) return 0;
      const clean = tStr.trim().toUpperCase();
      const isPM = clean.includes("PM");
      const isAM = clean.includes("AM");
      const numPart = clean.replace(/AM|PM/g, "").trim();
      const parts = numPart.split(":").map(Number);
      let hours = parts[0] || 0;
      const mins = parts[1] || 0;

      if (isPM && hours < 12) hours += 12;
      if (isAM && hours === 12) hours = 0;

      return hours * 60 + mins;
    };

    const formatTime = (t: string) => {
      if (!t) return "";
      if (t.includes("AM") || t.includes("PM")) return t;
      const [h, m] = t.split(":").map(Number);
      if (isNaN(h)) return t;
      const ampm = h >= 12 ? "PM" : "AM";
      const h12 = h % 12 || 12;
      return `${String(h12).padStart(2, "0")}:${String(m || 0).padStart(2, "0")} ${ampm}`;
    };

    const getBranchLabel = (bId: string) => {
      if (!bId || bId === "default") return "";
      const found = branches.find((b: any) => String(b.id) === String(bId) || String(b.branch_id) === String(bId) || String(b.name).toLowerCase() === String(bId).toLowerCase());
      if (found) return found.name_en || found.name || `Branch ${bId}`;
      const lower = String(bId).trim().toLowerCase();
      if (lower === "home") return "Home Visit";
      if (lower === "main") return "Main Branch";
      return String(bId).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    };

    const extractShiftsFromNode = (dayData: any, branchLabel: string): Array<{ branchName: string; timeStr: string; startMinutes: number }> => {
      if (!dayData) return [];
      if (typeof dayData === "string") {
        if (dayData.toLowerCase() === "off") return [];
        const startMins = parseTimeToMinutes(dayData.split("-")[0]);
        return [{ branchName: branchLabel, timeStr: dayData, startMinutes: startMins }];
      }

      const isOpen = dayData.isOpen ?? dayData.active ?? dayData.open ?? true;
      if (!isOpen || dayData.hours === "Off" || dayData.off) return [];

      const result: Array<{ branchName: string; timeStr: string; startMinutes: number }> = [];

      if (Array.isArray(dayData.shifts) && dayData.shifts.length > 0) {
        dayData.shifts.forEach((s: any) => {
          if (s.start && s.end) {
            const tStr = `${formatTime(s.start)} - ${formatTime(s.end)}`;
            result.push({ branchName: branchLabel, timeStr: tStr, startMinutes: parseTimeToMinutes(s.start) });
          } else if (typeof s === "string") {
            result.push({ branchName: branchLabel, timeStr: s, startMinutes: parseTimeToMinutes(s) });
          }
        });
      } else if (dayData.start && dayData.end) {
        const tStr = `${formatTime(dayData.start)} - ${formatTime(dayData.end)}`;
        result.push({ branchName: branchLabel, timeStr: tStr, startMinutes: parseTimeToMinutes(dayData.start) });
      } else if (dayData.hours && dayData.hours !== "Off") {
        result.push({ branchName: branchLabel, timeStr: dayData.hours, startMinutes: parseTimeToMinutes(dayData.hours) });
      }

      if (dayData.hours2) {
        const tStr = formatTime(dayData.hours2);
        result.push({ branchName: branchLabel, timeStr: tStr, startMinutes: parseTimeToMinutes(dayData.hours2) });
      }

      return result;
    };

    const dayShiftsMap: Record<string, Array<{ branchName: string; timeStr: string; startMinutes: number }>> = {
      Sunday: [],
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Saturday: [],
    };

    let isConfiguredInDb = false;

    if (parsed && typeof parsed === "object") {
      const branchScheds = parsed.branch_schedules;
      if (branchScheds && typeof branchScheds === "object" && Object.keys(branchScheds).length > 0) {
        isConfiguredInDb = true;
        Object.entries(branchScheds).forEach(([bId, bSched]: [string, any]) => {
          if (!bSched || typeof bSched !== "object") return;
          const modeNode = scheduleType === "In-Clinic" ? bSched.in_person : bSched.online;
          const bLabel = getBranchLabel(bId);

          if (modeNode && typeof modeNode === "object") {
            daysOfWeek.forEach((day) => {
              const dayData = modeNode[day] || modeNode[day.toLowerCase()];
              if (dayData) {
                const extracted = extractShiftsFromNode(dayData, bLabel);
                extracted.forEach((s) => {
                  const exists = dayShiftsMap[day].some((existing) => existing.timeStr === s.timeStr && existing.branchName === s.branchName);
                  if (!exists) {
                    dayShiftsMap[day].push(s);
                  }
                });
              }
            });
          }
        });
      } else {
        const topNode = scheduleType === "In-Clinic" ? (parsed.in_person || parsed) : parsed.online;
        if (topNode && typeof topNode === "object") {
          isConfiguredInDb = true;
          const defaultBranchLabel = doctorBranches[0] || "Clinic";
          daysOfWeek.forEach((day) => {
            const dayData = topNode[day] || topNode[day.toLowerCase()];
            if (dayData) {
              const extracted = extractShiftsFromNode(dayData, defaultBranchLabel);
              extracted.forEach((s) => {
                const exists = dayShiftsMap[day].some((existing) => existing.timeStr === s.timeStr && existing.branchName === s.branchName);
                if (!exists) {
                  dayShiftsMap[day].push(s);
                }
              });
            }
          });
        }
      }
    }

    if (Array.isArray(parsed) && parsed.length > 0) {
      isConfiguredInDb = true;
      const defaultBranchLabel = doctorBranches[0] || "Clinic";
      parsed.forEach((item: any) => {
        if (item.day && dayShiftsMap[item.day]) {
          if (item.hours && item.hours !== "Off") {
            dayShiftsMap[item.day].push({
              branchName: defaultBranchLabel,
              timeStr: item.hours,
              startMinutes: parseTimeToMinutes(item.hours)
            });
          }
        }
      });
    }

    return daysOfWeek.map((day) => {
      const shifts = [...dayShiftsMap[day]];
      // Sort shifts chronologically by startMinutes ascending (09:00 AM before 04:00 PM)
      shifts.sort((a, b) => a.startMinutes - b.startMinutes);

      if (shifts.length > 0) {
        return { day, shifts };
      }

      // Default clinic hours ONLY if no schedule configured in DB at all for In-Clinic
      if (!isConfiguredInDb && scheduleType === "In-Clinic") {
        if (day === "Friday") return { day, shifts: [] };
        if (day === "Saturday") return { day, shifts: [{ branchName: doctorBranches[0] || "Main Clinic", timeStr: "10:00 AM - 04:00 PM", startMinutes: 600 }] };
        return { day, shifts: [{ branchName: doctorBranches[0] || "Main Clinic", timeStr: "10:00 AM - 06:00 PM", startMinutes: 600 }] };
      }

      return { day, shifts: [] };
    });
  }, [doctor, scheduleType, branches, doctorBranches]);

  // Services Provided (Derived from real doctor.services / doctor.service_ids or localServices)
  const servicesProvided = useMemo(() => {
    const rawServices = doctor?.services || doctor?.service_ids || [];
    if (Array.isArray(rawServices) && rawServices.length > 0) {
      return rawServices.map((s: any) => {
        if (typeof s === "string") return s;
        if ((typeof s === "number" || typeof s === "string") && Array.isArray(localServices) && localServices.length > 0) {
          const found = localServices.find((ls: any) => String(ls.id) === String(s));
          if (found) return found.name || found.name_en;
        }
        return s?.name || s?.title || String(s);
      });
    }
    return [];
  }, [doctor, localServices]);

  // Real Database Visit History (Filtered for this specific doctor)
  const allVisits = useMemo(() => {
    if (!Array.isArray(reservations) || reservations.length === 0) return [];
    const docNameClean = (doctor?.name || "").trim().toLowerCase();
    const docIdStr = String(doctor?.id || "").trim();

    const matched = reservations.filter((r: any) => {
      if (!r) return false;
      const rDocName = (r.doctorName || r.doctor_name || r.doctor || r.provider_name || "").trim().toLowerCase();
      const rDocId = String(r.doctor_id || r.doctorId || r.provider_id || "").trim();

      if (docIdStr && rDocId && rDocId === docIdStr) return true;
      if (docNameClean && rDocName && (rDocName === docNameClean || rDocName.includes(docNameClean) || docNameClean.includes(rDocName))) return true;
      return false;
    });

    return matched.map((r: any, idx: number) => ({
      id: r.id || `RES-${idx + 1}`,
      date: r.date || (r.created_at ? new Date(r.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-"),
      patientName: r.customer_name || r.clientName || r.patientName || r.name || "Patient",
      patientPhone: r.customer_phone || r.phone || r.mobile || "-",
      service: r.service_name || r.serviceName || r.service || "Clinical Session",
      variant: r.service_variant || r.variant || "-",
      branch: r.branch_name || r.branchName || r.branch || "-",
      sessionType: r.session_type || r.type || "In-Clinic",
      status: r.status ? (r.status.charAt(0).toUpperCase() + r.status.slice(1)) : "Confirmed",
      notes: r.notes || r.doctor_notes || r.comments || "Session recorded in system."
    }));
  }, [reservations, doctor]);

  // Filter visits (Search, Status, and Interactive Date Filter)
  const filteredVisits = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    
    // Start of current week
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // Start of current month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    return allVisits.filter((v) => {
      // 1. Search filter
      if (visitSearch.trim()) {
        const query = visitSearch.toLowerCase();
        const matchesSearch =
          v.patientName.toLowerCase().includes(query) ||
          v.patientPhone.toLowerCase().includes(query) ||
          v.service.toLowerCase().includes(query) ||
          v.branch.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // 2. Status filter
      if (statusFilter !== "All" && v.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }

      // 3. Date range filter
      if (v.date && v.date !== "-") {
        const visitDate = new Date(v.date);
        if (!isNaN(visitDate.getTime())) {
          if (dateFilter === "Today") {
            const vDateStr = visitDate.toISOString().slice(0, 10);
            if (vDateStr !== todayStr) return false;
          } else if (dateFilter === "This Week") {
            if (visitDate < startOfWeek) return false;
          } else if (dateFilter === "This Month") {
            if (visitDate < startOfMonth) return false;
          } else if (dateFilter === "Custom") {
            if (customStartDate) {
              const start = new Date(customStartDate);
              start.setHours(0, 0, 0, 0);
              if (visitDate < start) return false;
            }
            if (customEndDate) {
              const end = new Date(customEndDate);
              end.setHours(23, 59, 59, 999);
              if (visitDate > end) return false;
            }
          }
        }
      }

      return true;
    });
  }, [allVisits, visitSearch, statusFilter, dateFilter, customStartDate, customEndDate]);

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
            {doctorAvatar && typeof doctorAvatar === "string" && doctorAvatar.trim() ? (
              <img
                src={doctorAvatar}
                alt={doctorName}
                className="h-20 w-20 rounded-full object-cover border-2 border-white shadow-md"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#1E3A2B] text-white text-2xl font-bold uppercase border-2 border-white shadow-md">
                {doctorName ? doctorName.replace(/^Dr\.\s*/i, "").charAt(0) : "D"}
              </div>
            )}
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
                <span className="text-[#9CA3AF] block mb-1 font-medium">Languages</span>
                <span className="font-semibold text-[#1F251A]">{languages}</span>
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
                  <th className="py-2.5 px-4 font-semibold w-1/4">Day</th>
                  <th className="py-2.5 px-4 font-semibold w-3/4">Working Hours ({scheduleType})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-[#374151]">
                {activeSchedule.map((item: any, idx: number) => (
                  <tr key={item.day || idx} className="hover:bg-gray-50/50">
                    <td className="py-3 px-4 font-semibold text-[#1F251A] align-middle">{item.day}</td>
                    <td className="py-3 px-4 font-medium align-middle">
                      {!item.shifts || item.shifts.length === 0 ? (
                        <span className="inline-block rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-500">
                          Off
                        </span>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2.5">
                          {item.shifts.map((shiftObj: any, sIdx: number) => (
                            <div
                              key={sIdx}
                              className="flex flex-col gap-0.5 rounded-xl border border-[#E6E9EB] bg-[#F2EFE9]/60 px-3 py-1.5 transition hover:bg-[#F2EFE9]"
                            >
                              {shiftObj.branchName ? (
                                <span className="text-[9px] font-bold uppercase tracking-wider text-[#5A6A51]">
                                  {shiftObj.branchName}
                                </span>
                              ) : null}
                              <span className="text-xs font-semibold text-[#1E3A2B]">
                                {shiftObj.timeStr}
                              </span>
                            </div>
                          ))}
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
              {servicesProvided.length === 0 ? (
                <span className="text-xs font-medium text-[#9CA3AF]">
                  No specific services assigned to this provider.
                </span>
              ) : (
                servicesProvided.map((service: string, idx: number) => (
                  <span
                    key={idx}
                    className="rounded-xl border border-gray-100 bg-[#F7F7F9] px-3.5 py-1.5 text-xs font-semibold text-[#374151] hover:bg-[#F2EFE9] transition"
                  >
                    {service}
                  </span>
                ))
              )}
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
        <div className="flex flex-col gap-3 mb-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
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
                  onClick={() => {
                    setDateFilter(tab);
                    setCurrentPage(1);
                  }}
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

          {/* Custom Date Inputs Range */}
          {dateFilter === "Custom" && (
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[#6B7280]">From:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => {
                    setCustomStartDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-xl border border-gray-200 bg-[#FFFFFF] px-3 py-1.5 text-xs text-[#1F251A] outline-none focus:border-[#1E3A2B]"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[#6B7280]">To:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => {
                    setCustomEndDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-xl border border-gray-200 bg-[#FFFFFF] px-3 py-1.5 text-xs text-[#1F251A] outline-none focus:border-[#1E3A2B]"
                />
              </div>
              {(customStartDate || customEndDate) && (
                <button
                  onClick={() => {
                    setCustomStartDate("");
                    setCustomEndDate("");
                    setCurrentPage(1);
                  }}
                  className="text-xs font-semibold text-red-600 hover:underline"
                >
                  Clear Range
                </button>
              )}
            </div>
          )}
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
                  <td colSpan={7} className="py-12 text-center text-xs font-medium text-[#9CA3AF]">
                    No visit history found in database for this doctor for the selected period.
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
