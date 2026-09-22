"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  User,
  Camera,
  Briefcase,
  Calendar,
  Clock,
  MapPin,
  Shield,
  Phone,
  Mail,
  Edit2,
  CalendarCheck,
  CalendarX,
  Clock3,
  LogOut,
  Timer,
  CheckCircle2,
  Lock,
  X,
  DollarSign,
  Loader2,
  Sun,
  Moon,
  Coffee,
  Check,
  Building2,
  Sparkles,
  Layers,
  ChevronDown
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { adminTranslations } from "./translations";

export interface UserProfileData {
  id?: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  address?: string;
  role: string;
  department?: string;
  branch?: string;
  branchesList?: string[];
  employeeId?: string;
  employmentType?: string;
  joiningDate?: string;
  shiftType?: string;
  workingDays?: string;
  workingHours?: string;
  workingDaysHours?: any;
  working_days_hours?: any;
  basicSalary?: number;
  bonuses?: number;
  deductions?: number;
  monthlyTarget?: number;
  targetProgressAmount?: number;
  avatarUrl?: string | null;
  status?: string;
}

export interface UserProfileViewTranslations {
  personalProfile: string;
  active: string;
  uploadProfilePicture: string;
  jobTitle: string;
  currentBranch: string;
  status: string;
  employeeId: string;
  employmentType: string;
  joiningDate: string;
  fullTime: string;
  personalInformation: string;
  edit: string;
  firstName: string;
  lastName: string;
  address: string;
  phoneNumber: string;
  email: string;
  workInformation: string;
  department: string;
  shiftType: string;
  assignedBranches: string;
  workingDays: string;
  workingHours: string;
  weeklySchedule?: string;
  weeklyOffDay?: string;
  totalWeeklyHours?: string;
  activeDay?: string;
  offDay?: string;
  restDay?: string;
  today?: string;
  shiftLabel?: string;
  hoursPerWeek?: string;
  daysCount?: string;
  allBranches?: string;
  selectBranchSchedule?: string;
  dayNames?: Record<string, string>;
  dayNamesShort?: Record<string, string>;
  shiftTypes?: Record<string, string>;
  attendanceSummary: string;
  presentDays: string;
  absentDays: string;
  lateArrivals: string;
  earlyLeaves: string;
  overtime: string;
  totalWorkingHours: string;
  viewAttendanceHistory: string;
  attendanceStatus: Record<string, string>;
  payrollSummary: string;
  doctorPayrollSummary: string;
  fixedBasicSalary: string;
  bonuses: string;
  commissionsAndBonuses: string;
  deductions: string;
  monthlyTarget: string;
  targetProgress: string;
  netSalary: string;
  changePassword: string;
  newPassword: string;
  confirmNewPassword: string;
  enterNewPassword: string;
  confirmNewPasswordPlaceholder: string;
  passwordTooShort: string;
  passwordsDoNotMatch: string;
  passwordUpdated: string;
  passwordUpdateFailed: string;
  updating: string;
  cancel: string;
  updatePassword: string;
  editContactInformation: string;
  emailAddress: string;
  homeAddress: string;
  saveChanges: string;
  saving: string;
  attendanceHistory: string;
  noAttendanceRecords: string;
  close: string;
  thisMonth: string;
  lastMonth: string;
  thisYear: string;
  doctor: string;
  receptionist: string;
  staff: string;
}

interface UserProfileViewProps {
  user: UserProfileData;
  onUpdateUser?: (updatedData: Partial<UserProfileData>) => Promise<void> | void;
  onUpdatePassword?: (newPassword: string) => Promise<void> | void;
  onAvatarUpload?: (file: File) => Promise<void> | void;
  onAvatarRemove?: () => Promise<void> | void;
  isDoctorView?: boolean;
  lang?: "en" | "ar";
  t?: UserProfileViewTranslations;
}

interface AttendanceRecord {
  id?: string;
  date: string;
  check_in_time?: string | null;
  check_out_time?: string | null;
  status: string;
  hours?: string;
}

export default function UserProfileView({
  user,
  onUpdateUser,
  onUpdatePassword,
  onAvatarUpload,
  onAvatarRemove,
  isDoctorView = false,
  lang = "en",
  t
}: UserProfileViewProps) {
  const tr = t || adminTranslations[lang]?.userProfile || adminTranslations.en.userProfile;

  // Background Database Fetched Records for complete schedule resolution
  const [fetchedEmployee, setFetchedEmployee] = useState<any>(null);
  const [fetchedProvider, setFetchedProvider] = useState<any>(null);
  const [selectedScheduleBranch, setSelectedScheduleBranch] = useState<string>("all");

  useEffect(() => {
    async function loadExtraDetails() {
      try {
        const email = user.email?.trim().toLowerCase();
        const userId = user.id?.trim();
        const phone = user.phone?.trim();
        const name = user.name?.trim();
        const isUUID = !!(userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId));

        if (email || userId || phone || name) {
          // 1. Employee query from /api/employees (which merges page_settings schedule)
          let empData: any = null;
          try {
            const empRes = await fetch("/api/employees", { cache: "no-store" });
            if (empRes.ok) {
              const allEmps = await empRes.json();
              if (Array.isArray(allEmps)) {
                empData = allEmps.find((e: any) =>
                  (email && e.email && e.email.toLowerCase() === email) ||
                  (userId && e.id === userId) ||
                  (userId && e.employee_id === userId) ||
                  (phone && e.phone && e.phone === phone) ||
                  (name && e.name && e.name.trim().toLowerCase() === name.toLowerCase())
                ) || null;
              }
            }
          } catch (apiErr) {
            console.warn("UserProfileView: /api/employees load notice:", apiErr);
          }

          // Fallback direct Supabase queries if API route was not accessible
          if (!empData) {
            if (email) {
              const { data } = await supabase.from("employee_accounts").select("*").eq("email", email).maybeSingle();
              if (data) empData = data;
            }
            if (!empData && isUUID) {
              const { data } = await supabase.from("employee_accounts").select("*").eq("id", userId).maybeSingle();
              if (data) empData = data;
            }
            if (!empData && userId && userId !== "my-profile" && !userId.includes("@")) {
              const { data } = await supabase.from("employee_accounts").select("*").eq("employee_id", userId).maybeSingle();
              if (data) empData = data;
            }
            if (!empData && phone) {
              const { data } = await supabase.from("employee_accounts").select("*").eq("phone", phone).maybeSingle();
              if (data) empData = data;
            }
          }

          if (empData) setFetchedEmployee(empData);

          // 2. Provider query (try UUID id, phone, name safely)
          let provData = null;
          if (isUUID) {
            const { data } = await supabase.from("providers").select("*").eq("id", userId).maybeSingle();
            if (data) provData = data;
          }
          if (!provData && phone) {
            const { data } = await supabase.from("providers").select("*").eq("phone", phone).maybeSingle();
            if (data) provData = data;
          }
          if (!provData && name && name !== "Employee Account" && name !== "zaki") {
            const { data } = await supabase.from("providers").select("*").ilike("name", `%${name}%`).maybeSingle();
            if (data) provData = data;
          }
          if (provData) setFetchedProvider(provData);
        }
      } catch (err) {
        console.warn("UserProfileView: background schedule load notice:", err);
      }
    }
    loadExtraDetails();
  }, [user.id, user.email, user.phone, user.name]);

  // Local edit states
  const [showEditPersonalModal, setShowEditPersonalModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showAttendanceHistoryModal, setShowAttendanceHistoryModal] = useState(false);

  // Form states - Only Email, Phone, Address can be edited
  const [editEmail, setEditEmail] = useState(user.email || "");
  const [editPhone, setEditPhone] = useState(user.phone || "");
  const [editAddress, setEditAddress] = useState(user.address || "");

  // Password modal states
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [savingUser, setSavingUser] = useState(false);

  // Time Period Filters
  const [attendancePeriod, setAttendancePeriod] = useState("This Month");
  const [payrollPeriod, setPayrollPeriod] = useState("This Month");

  // System Branches List
  const [allSystemBranches, setAllSystemBranches] = useState<string[]>([]);

  useEffect(() => {
    async function loadSystemBranches() {
      try {
        const { data } = await supabase.from("branches").select("id, name_en, name");
        if (data && data.length > 0) {
          const names = data.map((b: any) => b.name_en || b.name).filter(Boolean);
          setAllSystemBranches(names);
        }
      } catch (err) {
        console.error("Error fetching system branches:", err);
      }
    }
    loadSystemBranches();
  }, []);

  // Real Database Fetched Attendance Metrics
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceRecord[]>([]);
  const [attendanceMetrics, setAttendanceMetrics] = useState({
    presentDays: 0,
    absentDays: 0,
    lateArrivals: 0,
    earlyLeaves: 0,
    overtimeHours: "0h",
    totalWorkingHours: "0h"
  });

  // Real Database Fetched Payroll & Target Progress Metrics
  const [loadingPayroll, setLoadingPayroll] = useState(false);
  const [targetRevenue, setTargetRevenue] = useState<number>(0);
  const [payrollDetails, setPayrollDetails] = useState({
    salary: user.basicSalary || 0,
    target: user.monthlyTarget || 0,
    bonuses: user.bonuses || 0,
    deductions: user.deductions || 0
  });

  // Name resolution
  const nameParts = (user.name || "").trim().split(" ");
  const firstName = user.firstName || nameParts[0] || "Employee";
  const lastName = user.lastName || nameParts.slice(1).join(" ") || "Account";
  const displayName = user.name || `${firstName} ${lastName}`.trim();

  const displayRole = user.role || (isDoctorView ? (tr?.doctor ?? "Doctor") : (tr?.staff ?? "Staff"));
  const displayEmployeeId = user.employeeId || (isDoctorView ? "DOC-001" : "EMP-001");
  const displayJoiningDate = user.joiningDate || "—";
  
  // Department logic: Strictly from database record or Doctor/Receptionist
  const displayDepartment = user.department || (isDoctorView ? (tr?.doctor ?? "Doctor") : (tr?.receptionist ?? "Receptionist"));

  // Formatted Multi-Branch Display (Normalizing raw "home", "main", or resolving database branches)
  const displayBranches = useMemo(() => {
    if (Array.isArray(user.branchesList) && user.branchesList.length > 0) {
      const filtered = user.branchesList.map(b => {
        const clean = String(b).trim().toLowerCase();
        if (clean === "home") return null;
        if (clean === "main") return "Main Branch";
        return b;
      }).filter(Boolean);
      if (filtered.length > 0) return filtered.join(", ");
    }

    const rawSched = user.workingDaysHours || fetchedEmployee?.working_days_hours || fetchedProvider?.working_days_hours;
    if (rawSched && typeof rawSched === "object" && Array.isArray(rawSched.branch_ids) && rawSched.branch_ids.length > 0) {
      const filtered = rawSched.branch_ids.map((bId: any) => {
        const clean = String(bId).trim().toLowerCase();
        if (clean === "home") return null;
        if (clean === "main") return "Main Branch";
        return String(bId);
      }).filter(Boolean);
      if (filtered.length > 0) return filtered.join(", ");
    }

    if (user.branch && user.branch.toLowerCase() !== "home") {
      return user.branch;
    }

    return allSystemBranches.length > 0 ? allSystemBranches.join(", ") : "Main Branch";
  }, [user.branch, user.branchesList, user.workingDaysHours, fetchedEmployee, fetchedProvider, allSystemBranches]);

  // Current day index for "Today" highlighting (0 is Sun, 6 is Sat)
  const currentDayIndex = typeof window !== "undefined" ? new Date().getDay() : 0;

  // Available Branch Tabs for Schedule View
  const availableScheduleBranches = useMemo(() => {
    const rawSched = user.workingDaysHours || user.working_days_hours || fetchedEmployee?.working_days_hours || fetchedEmployee?.workingDaysHours || fetchedProvider?.working_days_hours || fetchedProvider?.workingDaysHours;
    let parsed: any = rawSched;
    if (typeof parsed === "string") {
      try { parsed = JSON.parse(parsed); } catch (e) {}
    }

    const branchIds = new Set<string>();
    if (parsed && typeof parsed === "object" && parsed.branch_schedules && typeof parsed.branch_schedules === "object") {
      Object.keys(parsed.branch_schedules).forEach(id => branchIds.add(id));
    }
    if (Array.isArray(user.branchesList)) {
      user.branchesList.forEach(b => branchIds.add(b));
    }
    if (user.branch && user.branch.toLowerCase() !== "home") {
      branchIds.add(user.branch);
    }

    const list: Array<{ id: string; name: string }> = [{ id: "all", name: tr?.allBranches || (lang === "ar" ? "جميع الفروع" : "All Branches") }];
    branchIds.forEach(bId => {
      const found = allSystemBranches.find(bName => bName.toLowerCase() === bId.toLowerCase());
      list.push({ id: bId, name: found || bId });
    });
    return list;
  }, [user.workingDaysHours, fetchedEmployee, fetchedProvider, user.branchesList, user.branch, allSystemBranches, tr, lang]);

  // Helper time parsing & formatting functions
  const parseTimeToMinutes = (tStr: string): number => {
    if (!tStr) return 0;
    const clean = String(tStr).trim().toUpperCase();
    const isPM = clean.includes("PM") || clean.includes("م");
    const isAM = clean.includes("AM") || clean.includes("ص");
    const numPart = clean.replace(/AM|PM|ص|م/gi, "").trim();
    const parts = numPart.split(":").map(Number);
    let hours = parts[0] || 0;
    const mins = parts[1] || 0;

    if (isPM && hours < 12) hours += 12;
    if (isAM && hours === 12) hours = 0;

    return hours * 60 + mins;
  };

  const formatTime12Hour = (timeStr?: string, targetLang: "en" | "ar" = "en"): string => {
    if (!timeStr) return "";
    const clean = String(timeStr).trim();
    if (clean.toLowerCase() === "off" || clean === "—") return "";
    
    if (clean.includes("AM") || clean.includes("PM") || clean.includes("ص") || clean.includes("م")) {
      if (targetLang === "ar") {
        return clean.replace(/AM/gi, "ص").replace(/PM/gi, "م");
      } else {
        return clean.replace(/ص/g, "AM").replace(/م/g, "PM");
      }
    }

    const parts = clean.split(":");
    if (parts.length >= 2) {
      const hour = parseInt(parts[0], 10);
      const min = parts[1].slice(0, 2);
      if (!isNaN(hour)) {
        const isPm = hour >= 12;
        const period = isPm ? (targetLang === "ar" ? "م" : "PM") : (targetLang === "ar" ? "ص" : "AM");
        let h12 = hour % 12;
        if (h12 === 0) h12 = 12;
        return `${String(h12).padStart(2, "0")}:${min} ${period}`;
      }
    }
    return clean;
  };

  const calcShiftHours = (start?: string, end?: string): number => {
    if (!start || !end) return 0;
    const startMins = parseTimeToMinutes(start);
    const endMins = parseTimeToMinutes(end);
    let diff = endMins - startMins;
    if (diff < 0) diff += 24 * 60;
    return Math.round((diff / 60) * 10) / 10;
  };

  // Comprehensive 7-Day Weekly Schedule Matrix (Saturday to Friday)
  const weeklyScheduleData = useMemo(() => {
    const WEEK_DAYS = [
      { key: "Saturday", short: "Sat", id: 6, arName: "السبت", arShort: "سبت" },
      { key: "Sunday", short: "Sun", id: 0, arName: "الأحد", arShort: "أحد" },
      { key: "Monday", short: "Mon", id: 1, arName: "الإثنين", arShort: "إثنين" },
      { key: "Tuesday", short: "Tue", id: 2, arName: "الثلاثاء", arShort: "ثلاثاء" },
      { key: "Wednesday", short: "Wed", id: 3, arName: "الأربعاء", arShort: "أربعاء" },
      { key: "Thursday", short: "Thu", id: 4, arName: "الخميس", arShort: "خميس" },
      { key: "Friday", short: "Fri", id: 5, arName: "الجمعة", arShort: "جمعة" },
    ];

    const rawSched = user.workingDaysHours || user.working_days_hours || fetchedEmployee?.working_days_hours || fetchedEmployee?.workingDaysHours || fetchedProvider?.working_days_hours || fetchedProvider?.workingDaysHours;
    let parsed: any = rawSched;
    if (typeof parsed === "string") {
      try { parsed = JSON.parse(parsed); } catch (e) {}
    }

    const shiftStr = user.shiftType || user.workingHours || fetchedEmployee?.shift || fetchedProvider?.shift || "";

    const parseShiftStringToTimes = (str: string): { start: string; end: string; formatted: string; duration: number } | null => {
      if (!str) return null;
      const clean = str.trim();
      const lower = clean.toLowerCase();

      // Check if time range exists inside the string first (e.g. "10:00 AM to 06:00 PM", "14:00 - 22:00", "Night Shift (08:00 PM – 04:00 AM, 8h)")
      const timeRangeRegex = /(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm|ص|م)?)\s*(?:to|–|-|إلى)\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm|ص|م)?)/i;
      const match = clean.match(timeRangeRegex);
      if (match && match[1] && match[2] && (clean.includes(":") || match[1].includes("AM") || match[1].includes("PM") || match[1].includes("ص") || match[1].includes("م"))) {
        const rawStart = match[1].trim();
        const rawEnd = match[2].trim();
        const startF = formatTime12Hour(rawStart, lang);
        const endF = formatTime12Hour(rawEnd, lang);
        const duration = calcShiftHours(rawStart, rawEnd);
        return { start: rawStart, end: rawEnd, formatted: `${startF} – ${endF}`, duration: duration || 8 };
      }

      if (lower === "night" || lower === "ليل" || lower === "مسائي" || lower === "night shift" || lower.startsWith("night shift")) {
        const startF = formatTime12Hour("20:00", lang);
        const endF = formatTime12Hour("04:00", lang);
        return { start: "20:00", end: "04:00", formatted: `${startF} – ${endF}`, duration: 8 };
      }

      if (lower === "morning" || lower === "morning shift" || lower === "صباح") {
        const startF = formatTime12Hour("08:00", lang);
        const endF = formatTime12Hour("16:00", lang);
        return { start: "08:00", end: "16:00", formatted: `${startF} – ${endF}`, duration: 8 };
      }

      if (lower === "evening" || lower === "evening shift" || lower === "مساء") {
        const startF = formatTime12Hour("16:00", lang);
        const endF = formatTime12Hour("00:00", lang);
        return { start: "16:00", end: "00:00", formatted: `${startF} – ${endF}`, duration: 8 };
      }

      if (lower === "day" || lower === "نهار" || lower === "صباحي" || lower === "day shift" || lower.startsWith("day shift")) {
        const startF = formatTime12Hour("09:00", lang);
        const endF = formatTime12Hour("17:00", lang);
        return { start: "09:00", end: "17:00", formatted: `${startF} – ${endF}`, duration: 8 };
      }

      return null;
    };

    const resolvedShift = parseShiftStringToTimes(shiftStr) || {
      start: "09:00",
      end: "17:00",
      formatted: `${formatTime12Hour("09:00", lang)} – ${formatTime12Hour("17:00", lang)}`,
      duration: 8
    };

    const extractShiftsFromDayNode = (dayData: any): Array<{ start: string; end: string; formatted: string; duration: number }> => {
      if (!dayData) return [];
      if (typeof dayData === "string") {
        if (dayData.toLowerCase() === "off" || dayData === "—" || dayData === "") return [];
        const parsedShift = parseShiftStringToTimes(dayData);
        if (parsedShift) return [parsedShift];
        return [{
          start: dayData,
          end: dayData,
          formatted: formatTime12Hour(dayData, lang),
          duration: 8
        }];
      }

      const isOpen = dayData.isOpen ?? dayData.active ?? dayData.open ?? (dayData.hours !== "Off" && !dayData.off);
      if (!isOpen || dayData.hours === "Off" || dayData.off === true) {
        return [];
      }

      const res: Array<{ start: string; end: string; formatted: string; duration: number }> = [];
      if (Array.isArray(dayData.shifts) && dayData.shifts.length > 0) {
        dayData.shifts.forEach((s: any) => {
          if (s.start && s.end) {
            const startF = formatTime12Hour(s.start, lang);
            const endF = formatTime12Hour(s.end, lang);
            res.push({
              start: s.start,
              end: s.end,
              formatted: `${startF} – ${endF}`,
              duration: calcShiftHours(s.start, s.end)
            });
          }
        });
      } else if (dayData.start && dayData.end) {
        const startF = formatTime12Hour(dayData.start, lang);
        const endF = formatTime12Hour(dayData.end, lang);
        res.push({
          start: dayData.start,
          end: dayData.end,
          formatted: `${startF} – ${endF}`,
          duration: calcShiftHours(dayData.start, dayData.end)
        });
      } else if (dayData.hours && dayData.hours !== "Off") {
        const parsedH = parseShiftStringToTimes(dayData.hours);
        if (parsedH) {
          res.push(parsedH);
        }
      }
      return res;
    };

    let hasExplicitDbSchedule = false;
    if (parsed && typeof parsed === "object") {
      if (parsed.branch_schedules && typeof parsed.branch_schedules === "object" && Object.keys(parsed.branch_schedules).length > 0) {
        hasExplicitDbSchedule = true;
      } else if (parsed.in_person && typeof parsed.in_person === "object") {
        hasExplicitDbSchedule = true;
      } else if (WEEK_DAYS.some(d => parsed[d.key] !== undefined || parsed[d.key.toLowerCase()] !== undefined)) {
        hasExplicitDbSchedule = true;
      }
    }

    const scheduleByDay: Record<string, {
      dayKey: string;
      dayShort: string;
      dayIndex: number;
      dayLabel: string;
      dayShortLabel: string;
      isOpen: boolean;
      shifts: Array<{ start: string; end: string; formatted: string; duration: number }>;
      totalDayHours: number;
    }> = {};

    WEEK_DAYS.forEach(day => {
      let dayShifts: Array<{ start: string; end: string; formatted: string; duration: number }> = [];

      if (parsed && typeof parsed === "object") {
        if (parsed.branch_schedules && typeof parsed.branch_schedules === "object") {
          Object.entries(parsed.branch_schedules).forEach(([bId, bSched]: [string, any]) => {
            if (selectedScheduleBranch !== "all" && bId !== selectedScheduleBranch) return;
            const modeNode = bSched?.in_person || bSched;
            if (modeNode && typeof modeNode === "object") {
              const dNode = modeNode[day.key] || modeNode[day.key.toLowerCase()];
              if (dNode) {
                const extracted = extractShiftsFromDayNode(dNode);
                extracted.forEach(s => {
                  if (!dayShifts.some(existing => existing.formatted === s.formatted)) {
                    dayShifts.push(s);
                  }
                });
              }
            }
          });
        } else {
          const topNode = parsed.in_person || parsed;
          if (topNode && typeof topNode === "object") {
            const dNode = topNode[day.key] || topNode[day.key.toLowerCase()];
            if (dNode !== undefined) {
              dayShifts = extractShiftsFromDayNode(dNode);
            }
          }
        }
      }

      // If no explicit structured schedule from database, apply employee's resolved real shift (Sat-Thu, Friday Off)
      if (!hasExplicitDbSchedule && day.key !== "Friday") {
        dayShifts.push(resolvedShift);
      }

      const isOpen = dayShifts.length > 0;
      const totalDayHours = dayShifts.reduce((sum, s) => sum + s.duration, 0);

      const dayLabel = lang === "ar"
        ? (tr?.dayNames?.[day.key.toLowerCase()] || day.arName)
        : (tr?.dayNames?.[day.key.toLowerCase()] || day.key);

      const dayShortLabel = lang === "ar"
        ? (tr?.dayNamesShort?.[day.short.toLowerCase()] || day.arShort)
        : (tr?.dayNamesShort?.[day.short.toLowerCase()] || day.short);

      scheduleByDay[day.key] = {
        dayKey: day.key,
        dayShort: day.short,
        dayIndex: day.id,
        dayLabel,
        dayShortLabel,
        isOpen,
        shifts: dayShifts,
        totalDayHours
      };
    });

    const activeDaysList = WEEK_DAYS.filter(d => scheduleByDay[d.key]?.isOpen);
    const offDaysList = WEEK_DAYS.filter(d => !scheduleByDay[d.key]?.isOpen);
    const totalWeeklyHours = Object.values(scheduleByDay).reduce((sum, d) => sum + d.totalDayHours, 0);

    let daysSummary = "";
    if (activeDaysList.length === 7) {
      daysSummary = lang === "ar" ? "طوال أيام الأسبوع (7 أيام)" : "All Week (7 Days)";
    } else if (activeDaysList.length === 6 && !scheduleByDay["Friday"]?.isOpen) {
      daysSummary = lang === "ar" ? "السبت – الخميس (6 أيام)" : "Saturday – Thursday (6 Days)";
    } else if (activeDaysList.length > 0) {
      daysSummary = activeDaysList.map(d => scheduleByDay[d.key].dayShortLabel).join(", ");
    } else {
      daysSummary = lang === "ar" ? "السبت – الخميس (6 أيام)" : "Saturday – Thursday (6 Days)";
    }

    let offDaysSummary = "";
    if (offDaysList.length > 0) {
      offDaysSummary = offDaysList.map(d => scheduleByDay[d.key].dayLabel).join(", ");
    } else {
      offDaysSummary = lang === "ar" ? "لا يوجد (دوام كامل)" : "None (Full Availability)";
    }

    const allDistinctHours = new Set<string>();
    Object.values(scheduleByDay).forEach(d => {
      d.shifts.forEach(s => allDistinctHours.add(s.formatted));
    });
    const hoursSummary = allDistinctHours.size > 0 
      ? Array.from(allDistinctHours).join(" | ")
      : resolvedShift.formatted;

    const rawShiftName = user.shiftType || fetchedEmployee?.shift || fetchedProvider?.shift || "Day";
    let shiftType = rawShiftName;
    if (allDistinctHours.size > 1) {
      shiftType = tr?.shiftTypes?.multiShift || (lang === "ar" ? "جدول متعدد الورديات" : "Multi-Shift Schedule");
    } else if (rawShiftName.toLowerCase().includes("night") || rawShiftName.toLowerCase().includes("ليل") || rawShiftName.toLowerCase().includes("مسائي")) {
      const hoursLabel = resolvedShift ? ` (${resolvedShift.formatted}, ${resolvedShift.duration}h)` : "";
      shiftType = (tr?.shiftTypes?.night || (lang === "ar" ? "وردية مسائية" : "Night Shift")) + hoursLabel;
    } else if (rawShiftName.toLowerCase().includes("morning") || rawShiftName.toLowerCase().includes("صباح")) {
      const hoursLabel = resolvedShift ? ` (${resolvedShift.formatted}, ${resolvedShift.duration}h)` : "";
      shiftType = (tr?.shiftTypes?.morning || (lang === "ar" ? "وردية صباحية" : "Morning Shift")) + hoursLabel;
    } else if (rawShiftName.toLowerCase().includes("evening") || rawShiftName.toLowerCase().includes("مساء")) {
      const hoursLabel = resolvedShift ? ` (${resolvedShift.formatted}, ${resolvedShift.duration}h)` : "";
      shiftType = (tr?.shiftTypes?.evening || (lang === "ar" ? "وردية مسائية" : "Evening Shift")) + hoursLabel;
    } else if (rawShiftName.toLowerCase() === "day" || rawShiftName.toLowerCase() === "day shift" || rawShiftName === "نهار") {
      const hoursLabel = resolvedShift ? ` (${resolvedShift.formatted}, ${resolvedShift.duration}h)` : "";
      shiftType = (tr?.shiftTypes?.day || (lang === "ar" ? "وردية نهارية" : "Day Shift")) + hoursLabel;
    } else if (resolvedShift) {
      shiftType = `${resolvedShift.formatted} (${resolvedShift.duration}h)`;
    }

    return {
      days: WEEK_DAYS.map(d => scheduleByDay[d.key]),
      activeDaysCount: activeDaysList.length,
      totalWeeklyHours,
      daysSummary,
      offDaysSummary,
      hoursSummary,
      shiftType
    };
  }, [user.workingDaysHours, user.shiftType, fetchedEmployee, fetchedProvider, selectedScheduleBranch, lang, tr]);

  // Helper to get date ranges based on selected period
  const getDateRange = (periodStr: string) => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (periodStr === "This Month") {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (periodStr === "Last Month") {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (periodStr === "This Year") {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31);
    }

    const startStr = start.toISOString().split("T")[0];
    const endStr = end.toISOString().split("T")[0];
    return { startStr, endStr };
  };

  // 1. Fetch Real Attendance Summary & Logs directly from Database
  useEffect(() => {
    async function fetchRealAttendance() {
      setLoadingAttendance(true);
      try {
        const { startStr, endStr } = getDateRange(attendancePeriod);
        
        let query = supabase
          .from("hr_attendance")
          .select("*")
          .gte("date", startStr)
          .lte("date", endStr)
          .order("date", { ascending: false });

        if (user.id) {
          query = query.or(`employee_id.eq.${user.id},employee_id.eq.${user.employeeId}`);
        }

        const { data, error } = await query;

        if (!error && data && data.length > 0) {
          let present = 0;
          let absent = 0;
          let late = 0;
          let early = 0;
          let totalMin = 0;
          let overtimeMin = 0;

          const formattedLogs: AttendanceRecord[] = data.map((rec: any) => {
            const st = (rec.status || "Present").trim();
            if (st === "Present") present++;
            if (st === "Absent") absent++;
            if (st === "Late") {
              present++;
              late++;
            }
            if (rec.early_leave_minutes > 0) early++;

            let rowHours = "8h 0m";
            if (rec.check_in_time && rec.check_out_time) {
              const inMs = new Date(rec.check_in_time).getTime();
              const outMs = new Date(rec.check_out_time).getTime();
              const diffMin = Math.max(0, Math.floor((outMs - inMs) / 60000));
              totalMin += diffMin;
              if (diffMin > 480) {
                overtimeMin += (diffMin - 480);
              }
              const h = Math.floor(diffMin / 60);
              const m = diffMin % 60;
              rowHours = `${h}h ${m}m`;
            } else if (st === "Present") {
              totalMin += 480;
            }

            return {
              id: rec.id,
              date: rec.date,
              check_in_time: rec.check_in_time ? new Date(rec.check_in_time).toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' }) : "—",
              check_out_time: rec.check_out_time ? new Date(rec.check_out_time).toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' }) : "—",
              status: st,
              hours: rowHours
            };
          });

          setAttendanceLogs(formattedLogs);
          setAttendanceMetrics({
            presentDays: present || data.length,
            absentDays: absent,
            lateArrivals: late,
            earlyLeaves: early,
            overtimeHours: `${Math.round(overtimeMin / 60)}h`,
            totalWorkingHours: `${Math.round(totalMin / 60)}h`
          });
        } else {
          setAttendanceLogs([]);
          setAttendanceMetrics({
            presentDays: 0,
            absentDays: 0,
            lateArrivals: 0,
            earlyLeaves: 0,
            overtimeHours: "0h",
            totalWorkingHours: "0h"
          });
        }
      } catch (err) {
        console.error("Error fetching database attendance records:", err);
      } finally {
        setLoadingAttendance(false);
      }
    }

    fetchRealAttendance();
  }, [attendancePeriod, user.id, user.employeeId]);

  // 2. Fetch Real Payroll Summary & Target Progress directly from Database
  useEffect(() => {
    async function fetchRealPayrollData() {
      setLoadingPayroll(true);
      try {
        const { startStr, endStr } = getDateRange(payrollPeriod);
        const monthStr = startStr.slice(0, 7);
        const cleanName = user.name ? user.name.replace(/^Dr\.?\s*/i, "").trim() : "";

        let salary = Number(user.basicSalary || 0);
        let target = Number(user.monthlyTarget || 0);
        let bonusComm = Number(user.bonuses || 0);
        let deds = Number(user.deductions || 0);

        if (isDoctorView) {
          // 1. Query providers table for Doctor Fixed Salary & Target
          let qProv = supabase.from("providers").select("*");
          if (user.id) qProv = qProv.eq("id", user.id);
          else if (cleanName) qProv = qProv.ilike("name", `%${cleanName}%`);
          const { data: prov } = await qProv.maybeSingle();

          if (prov) {
            salary = Number(prov.fixed_salary || prov.salary || salary || 15000);
            target = Number(prov.target_amount || prov.required_target_amount || target || 60000);
          } else if (salary === 0) {
            salary = 15000;
            target = 60000;
          }

          // 2. Query doctor_payroll for current month fixed salary & calculated commissions
          let qDocPay = supabase.from("doctor_payroll").select("*").eq("month", monthStr);
          if (user.id) qDocPay = qDocPay.eq("provider_id", user.id);
          else if (prov?.id) qDocPay = qDocPay.eq("provider_id", prov.id);
          const { data: docPay } = await qDocPay.maybeSingle();

          if (docPay) {
            salary = Number(docPay.fixed_salary || docPay.fixed_salary_snapshot || salary);
            bonusComm = Number(docPay.calculated_commission || docPay.commission_value || 0);
            deds = Number(docPay.deductions || 0);
          }
        } else {
          // Query employee_accounts & hr_payroll for Staff View
          let qEmp = supabase.from("employee_accounts").select("*");
          if (user.id) qEmp = qEmp.eq("id", user.id);
          else if (user.email) qEmp = qEmp.eq("email", user.email);
          const { data: emp } = await qEmp.maybeSingle();

          if (emp) {
            salary = Number(emp.salary || salary || 8000);
            target = Number(emp.required_target_amount || target || 50000);
            bonusComm = Number(emp.bonus || (emp.bonus_percentage ? (salary * emp.bonus_percentage / 100) : 0));
            deds = Number(emp.deductions || 0);
          } else if (salary === 0) {
            salary = 8000;
            target = 50000;
          }
        }

        setPayrollDetails({
          salary,
          target,
          bonuses: bonusComm,
          deductions: deds
        });

        // 3. Query reservations table for Target Progress (Completed/Confirmed Revenue)
        const qRes = supabase
          .from("reservations")
          .select("amount_paid, price, status, date, doctor_name, provider_id, created_by_employee_id")
          .gte("date", startStr)
          .lte("date", endStr)
          .in("status", ["completed", "confirmed", "approved", "started"]);

        const { data: resData, error: resErr } = await qRes;

        if (!resErr && resData && resData.length > 0) {
          const userRev = resData.filter((r: any) => {
            if (isDoctorView && cleanName) {
              return (
                (r.doctor_name && r.doctor_name.toLowerCase().includes(cleanName.toLowerCase())) ||
                r.provider_id === user.id
              );
            }
            if (user.id) {
              return r.created_by_employee_id === user.id || r.provider_id === user.id;
            }
            return true;
          });

          const totalRev = userRev.reduce((sum: number, r: any) => sum + Number(r.amount_paid || r.price || 0), 0);
          setTargetRevenue(totalRev);
        } else {
          setTargetRevenue(0);
        }
      } catch (err) {
        console.error("Error fetching live database payroll summary:", err);
      } finally {
        setLoadingPayroll(false);
      }
    }

    fetchRealPayrollData();
  }, [payrollPeriod, user.id, user.name, user.email, isDoctorView]);

  // Financial calculations strictly based on database metrics
  const basicSalary = Number(payrollDetails.salary || 0);
  const bonuses = Number(payrollDetails.bonuses || 0);
  const deductions = Number(payrollDetails.deductions || 0);
  const netSalary = basicSalary + bonuses - deductions;
  const monthlyTarget = Number(payrollDetails.target || 0);
  const targetProgressAmount = targetRevenue;
  const targetPct = monthlyTarget > 0 ? Math.min(100, Math.round((targetProgressAmount / monthlyTarget) * 100)) : 0;

  const handleOpenEditPersonal = () => {
    setEditEmail(user.email || "");
    setEditPhone(user.phone || "");
    setEditAddress(user.address || "");
    setShowEditPersonalModal(true);
  };

  const handleSavePersonalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingUser(true);
    try {
      if (onUpdateUser) {
        await onUpdateUser({
          email: editEmail,
          phone: editPhone,
          address: editAddress
        });
      }
      setShowEditPersonalModal(false);
    } catch (err) {
      console.error("Error updating personal profile:", err);
    } finally {
      setSavingUser(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!newPassword || newPassword.length < 6) {
      setPasswordError(tr?.passwordTooShort ?? "Password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(tr?.passwordsDoNotMatch ?? "Passwords do not match.");
      return;
    }

    setUpdatingPassword(true);
    try {
      if (onUpdatePassword) {
        await onUpdatePassword(newPassword);
      }
      setPasswordSuccess(tr?.passwordUpdated ?? "Password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess("");
      }, 1500);
    } catch (err: any) {
      setPasswordError(err.message || (tr?.passwordUpdateFailed ?? "Failed to update password."));
    } finally {
      setUpdatingPassword(false);
    }
  };

  const dir = lang === "ar" ? "rtl" : "ltr";

  return (
    <div dir={dir} className="w-full max-w-5xl mx-auto space-y-6 pb-12 animate-fadeIn text-[#1F251A] print:p-0 print:m-0 print:max-w-none">
      
      {/* ── HEADER USER PROFILE CARD ── */}
      <div className="rounded-[32px] border border-[#414E36]/12 bg-[#F9F9F7] p-4 sm:p-6 md:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-5">
            {/* Avatar Container with Camera Icon Overlay */}
            <div className="relative group shrink-0">
              <div className="h-24 w-24 rounded-full bg-[#EBEFE9] text-[#414E36] border-2 border-white shadow-md flex items-center justify-center text-3xl font-extrabold font-sans overflow-hidden">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  <span>{(displayName.replace(/^Dr\.?\s*/i, "") || "U").slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              {onAvatarUpload && (
                <label
                  className="absolute bottom-0 right-0 p-2 rounded-full bg-[#414E36] text-white cursor-pointer shadow-lg hover:scale-105 hover:bg-[#2e3a26] transition flex items-center justify-center border-2 border-white"
                  title={tr?.uploadProfilePicture ?? "Upload Profile Picture"}
                >
                  <Camera size={14} />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && onAvatarUpload) onAvatarUpload(file);
                    }}
                  />
                </label>
              )}
            </div>

            {/* Main Info */}
            <div className="text-center sm:text-start space-y-1.5">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <h1 className="text-2xl md:text-3xl font-black text-[#1F251A] tracking-tight">{displayName}</h1>
                <span className="rounded-xl bg-[#EDE4C8] px-3 py-1 text-xs font-bold text-[#414E36] border border-[#C4AE7C]/30 capitalize">
                  {displayRole}
                </span>
              </div>
              <p className="text-xs md:text-sm font-semibold text-[#5A6A51]">{tr?.personalProfile ?? "Personal Profile & Staff Details"}</p>
              <div className="flex justify-center sm:justify-start pt-0.5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-0.5 text-xs font-bold text-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  {tr?.active ?? "Active"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Details Grid (2 rows x 3 columns) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-[#414E36]/10 text-xs">
          <div className="bg-[#FBFBF9] p-3.5 rounded-2xl border border-[#414E36]/10 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#414E36]/10 text-[#414E36]">
              <Briefcase size={16} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] block">{tr?.jobTitle ?? "Job Title"}</span>
              <span className="font-extrabold text-[#1F251A]">{displayRole}</span>
            </div>
          </div>

          <div className="bg-[#FBFBF9] p-3.5 rounded-2xl border border-[#414E36]/10 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#414E36]/10 text-[#414E36]">
              <MapPin size={16} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] block">{tr?.currentBranch ?? "Current Branch"}</span>
              <span className="font-extrabold text-[#1F251A]">{displayBranches}</span>
            </div>
          </div>

          <div className="bg-[#FBFBF9] p-3.5 rounded-2xl border border-[#414E36]/10 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <CheckCircle2 size={16} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] block">{tr?.status ?? "Status"}</span>
              <span className="font-extrabold text-emerald-700 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {tr?.active ?? "Active"}
              </span>
            </div>
          </div>

          <div className="bg-[#FBFBF9] p-3.5 rounded-2xl border border-[#414E36]/10 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#414E36]/10 text-[#414E36]">
              <User size={16} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] block">{tr?.employeeId ?? "Employee ID"}</span>
              <span className="font-extrabold text-[#1F251A] font-mono">{displayEmployeeId}</span>
            </div>
          </div>

          <div className="bg-[#FBFBF9] p-3.5 rounded-2xl border border-[#414E36]/10 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#414E36]/10 text-[#414E36]">
              <Briefcase size={16} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] block">{tr?.employmentType ?? "Employment Type"}</span>
              <span className="font-extrabold text-[#1F251A]">{user.employmentType || (tr?.fullTime ?? "Full Time")}</span>
            </div>
          </div>

          <div className="bg-[#FBFBF9] p-3.5 rounded-2xl border border-[#414E36]/10 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#414E36]/10 text-[#414E36]">
              <Calendar size={16} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] block">{tr?.joiningDate ?? "Joining Date"}</span>
              <span className="font-extrabold text-[#1F251A]">{displayJoiningDate}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 1: PERSONAL INFORMATION ── */}
      <div className="rounded-3xl border border-[#414E36]/12 bg-white p-4 sm:p-6 md:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-[#414E36]/10 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#C4AE7C] text-white text-xs font-black">
              1
            </span>
            <h2 className="text-xs md:text-sm font-black uppercase tracking-wider text-[#C4AE7C]">
              {tr?.personalInformation ?? "Personal Information"}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleOpenEditPersonal}
            className="flex items-center gap-1.5 rounded-xl border border-[#414E36]/20 bg-white px-3.5 py-1.5 text-xs font-bold text-[#414E36] hover:bg-[#414E36] hover:text-white transition shadow-xs"
          >
            <Edit2 size={13} />
            <span>{tr?.edit ?? "Edit"}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-xs md:text-sm">
          <div className="flex items-start gap-3">
            <User size={16} className="text-[#5A6A51] mt-0.5 shrink-0" />
            <div>
              <span className="text-[11px] font-bold text-[#5A6A51] block">{tr?.firstName ?? "First Name"}</span>
              <span className="font-extrabold text-[#1F251A]">{firstName}</span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin size={16} className="text-[#5A6A51] mt-0.5 shrink-0" />
            <div>
              <span className="text-[11px] font-bold text-[#5A6A51] block">{tr?.address ?? "Address"}</span>
              <span className="font-extrabold text-[#1F251A]">{user.address || "—"}</span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <User size={16} className="text-[#5A6A51] mt-0.5 shrink-0" />
            <div>
              <span className="text-[11px] font-bold text-[#5A6A51] block">{tr?.lastName ?? "Last Name"}</span>
              <span className="font-extrabold text-[#1F251A]">{lastName}</span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Phone size={16} className="text-[#5A6A51] mt-0.5 shrink-0" />
            <div>
              <span className="text-[11px] font-bold text-[#5A6A51] block">{tr?.phoneNumber ?? "Phone Number"}</span>
              <span className="font-extrabold text-[#1F251A] font-mono">{user.phone || "—"}</span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Mail size={16} className="text-[#5A6A51] mt-0.5 shrink-0" />
            <div>
              <span className="text-[11px] font-bold text-[#5A6A51] block">{tr?.email ?? "Email"}</span>
              <span className="font-extrabold text-[#1F251A] break-all">{user.email || "—"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 2: WORK INFORMATION & WEEKLY SCHEDULE ── */}
      <div className="rounded-3xl border border-[#414E36]/12 bg-white p-4 sm:p-6 md:p-8 shadow-xs space-y-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#414E36]/10 pb-4 gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#C4AE7C] text-white text-xs font-black shadow-xs">
              2
            </span>
            <h2 className="text-xs md:text-sm font-black uppercase tracking-wider text-[#C4AE7C]">
              {tr?.workInformation ?? "Work Information & Weekly Schedule"}
            </h2>
          </div>

          {/* Quick Badges in Header */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Shift Badge */}
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#F9F9F7] border border-[#414E36]/15 px-3 py-1 text-xs font-extrabold text-[#414E36] shadow-2xs">
              {weeklyScheduleData.shiftType.toLowerCase().includes("night") || weeklyScheduleData.shiftType.toLowerCase().includes("evening") || weeklyScheduleData.shiftType.includes("مسائية") ? (
                <Moon size={13} className="text-indigo-500" />
              ) : weeklyScheduleData.shiftType.toLowerCase().includes("multi") || weeklyScheduleData.shiftType.includes("متعدد") ? (
                <Clock size={13} className="text-[#414E36]" />
              ) : (
                <Sun size={13} className="text-amber-500" />
              )}
              <span>{weeklyScheduleData.shiftType}</span>
            </span>

            {/* Total Weekly Hours Badge */}
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#EDE4C8] border border-[#C4AE7C]/40 px-3 py-1 text-xs font-black text-[#414E36] shadow-2xs">
              <Timer size={13} className="text-[#414E36]" />
              <span>{weeklyScheduleData.totalWeeklyHours} {tr?.hoursPerWeek ?? "hrs/week"}</span>
            </span>

            {/* Active Days Badge */}
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-extrabold text-emerald-800 shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{weeklyScheduleData.activeDaysCount} {tr?.daysCount ?? "Days Active"}</span>
            </span>
          </div>
        </div>

        {/* 6 Key Attribute Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 text-xs">
          {/* 1. Department */}
          <div className="bg-[#FBFBF9] p-3.5 rounded-2xl border border-[#414E36]/10 flex items-center gap-3 transition hover:border-[#414E36]/25">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#414E36]/10 text-[#414E36] shrink-0">
              <Briefcase size={16} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] block">{tr?.department ?? "Department"}</span>
              <span className="font-extrabold text-[#1F251A] truncate block">{displayDepartment}</span>
            </div>
          </div>

          {/* 2. Employment Type */}
          <div className="bg-[#FBFBF9] p-3.5 rounded-2xl border border-[#414E36]/10 flex items-center gap-3 transition hover:border-[#414E36]/25">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#414E36]/10 text-[#414E36] shrink-0">
              <Briefcase size={16} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] block">{tr?.employmentType ?? "Employment Type"}</span>
              <span className="font-extrabold text-[#1F251A] truncate block">{user.employmentType || (tr?.fullTime ?? "Full Time")}</span>
            </div>
          </div>

          {/* 3. Assigned Branches */}
          <div className="bg-[#FBFBF9] p-3.5 rounded-2xl border border-[#414E36]/10 flex items-center gap-3 transition hover:border-[#414E36]/25">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#414E36]/10 text-[#414E36] shrink-0">
              <MapPin size={16} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] block">{tr?.assignedBranches ?? "Assigned Branches"}</span>
              <span className="font-extrabold text-[#1F251A] truncate block">{displayBranches}</span>
            </div>
          </div>

          {/* 4. Active Working Days */}
          <div className="bg-[#FBFBF9] p-3.5 rounded-2xl border border-[#414E36]/10 flex items-center gap-3 transition hover:border-[#414E36]/25">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 shrink-0">
              <CalendarCheck size={16} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] block">{tr?.workingDays ?? "Working Days"}</span>
              <span className="font-extrabold text-[#1F251A] truncate block">{weeklyScheduleData.daysSummary}</span>
            </div>
          </div>

          {/* 5. Daily Working Hours */}
          <div className="bg-[#FBFBF9] p-3.5 rounded-2xl border border-[#414E36]/10 flex items-center gap-3 transition hover:border-[#414E36]/25">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#414E36]/10 text-[#414E36] shrink-0">
              <Clock3 size={16} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] block">{tr?.workingHours ?? "Working Hours"}</span>
              <span className="font-extrabold text-[#1F251A] font-mono text-[11px] truncate block">{weeklyScheduleData.hoursSummary}</span>
            </div>
          </div>

          {/* 6. Weekly Off Day */}
          <div className="bg-[#FBFBF9] p-3.5 rounded-2xl border border-[#414E36]/10 flex items-center gap-3 transition hover:border-[#414E36]/25">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 shrink-0">
              <CalendarX size={16} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] block">{tr?.weeklyOffDay ?? "Weekly Off Day"}</span>
              <span className="font-extrabold text-[#1F251A] truncate block">{weeklyScheduleData.offDaysSummary}</span>
            </div>
          </div>
        </div>

        {/* ── 7-Day Weekly Schedule Matrix Board ── */}
        <div className="pt-2 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#C4AE7C]" />
              <h3 className="text-xs font-black uppercase tracking-wider text-[#1F251A]">
                {tr?.weeklySchedule ?? "Weekly Schedule Matrix"}
              </h3>
            </div>

            {/* Branch Selector Switcher if multi-branch */}
            {availableScheduleBranches.length > 2 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                {availableScheduleBranches.map(b => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedScheduleBranch(b.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition whitespace-nowrap ${
                      selectedScheduleBranch === b.id
                        ? "bg-[#414E36] text-white shadow-xs"
                        : "bg-[#F5F5F3] text-[#5A6A51] hover:bg-[#EBEFE9] hover:text-[#1F251A]"
                    }`}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 7 Day Cards Grid (Saturday to Friday) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {weeklyScheduleData.days.map((day) => {
              const isCurrentDay = day.dayIndex === currentDayIndex;
              return (
                <div
                  key={day.dayKey}
                  className={`rounded-2xl p-3 border transition flex flex-col justify-between relative ${
                    isCurrentDay
                      ? "ring-2 ring-[#414E36] ring-offset-1 shadow-xs"
                      : ""
                  } ${
                    day.isOpen
                      ? "border-emerald-200/90 bg-emerald-50/25 hover:bg-emerald-50/50"
                      : "border-[#414E36]/10 bg-[#F9F9F7]/70 text-[#5A6A51]"
                  }`}
                >
                  {/* Top Day Header & Status */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-black text-[#1F251A]">{day.dayLabel}</span>
                      {isCurrentDay && (
                        <span className="px-1.5 py-0.5 rounded-md bg-[#414E36] text-white text-[8px] font-black uppercase tracking-wider">
                          {tr?.today ?? "Today"}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      {day.isOpen ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100/90 text-emerald-800 text-[10px] font-black">
                          <Check size={10} strokeWidth={3} />
                          <span>{tr?.activeDay ?? "Active"}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold">
                          <Coffee size={10} />
                          <span>{tr?.offDay ?? "Off"}</span>
                        </span>
                      )}

                      {day.isOpen && day.totalDayHours > 0 && (
                        <span className="text-[10px] font-bold text-[#5A6A51]">
                          {day.totalDayHours}h
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle: Shift Times / Rest Day */}
                  <div className="pt-3">
                    {day.isOpen ? (
                      <div className="space-y-1.5">
                        {day.shifts.map((shift, idx) => (
                          <div
                            key={idx}
                            className="px-2 py-1.5 rounded-xl bg-white border border-emerald-200/70 text-[10px] font-black text-[#1F251A] text-center font-mono shadow-2xs leading-tight"
                          >
                            {shift.formatted}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-2.5 text-center flex flex-col items-center justify-center gap-1 text-[#5A6A51]">
                        <Coffee size={14} className="opacity-40" />
                        <span className="text-[11px] font-semibold">{tr?.restDay ?? "Rest Day"}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── SECTION 3: ATTENDANCE SUMMARY (REAL DATA FROM DATABASE) ── */}
      <div className="rounded-3xl border border-[#414E36]/12 bg-white p-4 sm:p-6 md:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-[#414E36]/10 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#C4AE7C] text-white text-xs font-black">
              3
            </span>
            <h2 className="text-xs md:text-sm font-black uppercase tracking-wider text-[#C4AE7C]">
              {tr?.attendanceSummary ?? "Attendance Summary"}
            </h2>
            {loadingAttendance && <Loader2 size={14} className="animate-spin text-[#C4AE7C]" />}
          </div>

          <select
            value={attendancePeriod}
            onChange={(e) => setAttendancePeriod(e.target.value)}
            className="rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-1.5 text-xs font-bold text-[#1F251A] outline-none cursor-pointer hover:border-[#C4AE7C]"
          >
            <option value="This Month">{tr?.thisMonth ?? "This Month"}</option>
            <option value="Last Month">{tr?.lastMonth ?? "Last Month"}</option>
            <option value="This Year">{tr?.thisYear ?? "This Year"}</option>
          </select>
        </div>

        {/* 6 Attendance Metric Cards (Strict Real Data from DB) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3.5 text-center">
          <div className="rounded-2xl bg-[#FBFBF9] p-4 border border-[#414E36]/10 space-y-2">
            <div className="h-9 w-9 mx-auto flex items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <CalendarCheck size={18} />
            </div>
            <span className="text-[10px] font-bold text-[#5A6A51] block">{tr?.presentDays ?? "Present Days"}</span>
            <span className="text-xl font-black text-[#1F251A]">{attendanceMetrics.presentDays}</span>
          </div>

          <div className="rounded-2xl bg-[#FBFBF9] p-4 border border-[#414E36]/10 space-y-2">
            <div className="h-9 w-9 mx-auto flex items-center justify-center rounded-xl bg-rose-50 text-rose-700">
              <CalendarX size={18} />
            </div>
            <span className="text-[10px] font-bold text-[#5A6A51] block">{tr?.absentDays ?? "Absent Days"}</span>
            <span className="text-xl font-black text-[#1F251A]">{attendanceMetrics.absentDays}</span>
          </div>

          <div className="rounded-2xl bg-[#FBFBF9] p-4 border border-[#414E36]/10 space-y-2">
            <div className="h-9 w-9 mx-auto flex items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <Clock3 size={18} />
            </div>
            <span className="text-[10px] font-bold text-[#5A6A51] block">{tr?.lateArrivals ?? "Late Arrivals"}</span>
            <span className="text-xl font-black text-[#1F251A]">{attendanceMetrics.lateArrivals}</span>
          </div>

          <div className="rounded-2xl bg-[#FBFBF9] p-4 border border-[#414E36]/10 space-y-2">
            <div className="h-9 w-9 mx-auto flex items-center justify-center rounded-xl bg-purple-50 text-purple-700">
              <LogOut size={18} />
            </div>
            <span className="text-[10px] font-bold text-[#5A6A51] block">{tr?.earlyLeaves ?? "Early Leaves"}</span>
            <span className="text-xl font-black text-[#1F251A]">{attendanceMetrics.earlyLeaves}</span>
          </div>

          <div className="rounded-2xl bg-[#FBFBF9] p-4 border border-[#414E36]/10 space-y-2">
            <div className="h-9 w-9 mx-auto flex items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <Timer size={18} />
            </div>
            <span className="text-[10px] font-bold text-[#5A6A51] block">{tr?.overtime ?? "Overtime"}</span>
            <span className="text-xl font-black text-[#1F251A]">{attendanceMetrics.overtimeHours}</span>
          </div>

          <div className="rounded-2xl bg-[#FBFBF9] p-4 border border-[#414E36]/10 space-y-2">
            <div className="h-9 w-9 mx-auto flex items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <Briefcase size={18} />
            </div>
            <span className="text-[10px] font-bold text-[#5A6A51] block">{tr?.totalWorkingHours ?? "Total Working Hours"}</span>
            <span className="text-xl font-black text-[#1F251A]">{attendanceMetrics.totalWorkingHours}</span>
          </div>
        </div>

        {/* View Attendance History Button */}
        <button
          type="button"
          onClick={() => setShowAttendanceHistoryModal(true)}
          className="w-full flex items-center justify-center gap-2.5 rounded-2xl border border-[#414E36]/20 bg-white py-3 text-xs font-bold text-[#414E36] hover:bg-[#414E36] hover:text-white transition shadow-xs"
        >
          <Calendar size={16} />
          <span>{tr?.viewAttendanceHistory ?? "View Attendance History"}</span>
        </button>
      </div>

      {/* ── SECTION 4: PAYROLL SUMMARY (REAL DATA FROM DATABASE: DOCTOR PAYROLL VS STAFF PAYROLL) ── */}
      <div className="rounded-3xl border border-[#414E36]/12 bg-white p-4 sm:p-6 md:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-[#414E36]/10 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#C4AE7C] text-white text-xs font-black">
              4
            </span>
            <h2 className="text-xs md:text-sm font-black uppercase tracking-wider text-[#C4AE7C]">
              {isDoctorView ? (tr?.doctorPayrollSummary ?? "Doctor Payroll Summary") : (tr?.payrollSummary ?? "Payroll Summary")}
            </h2>
            {loadingPayroll && <Loader2 size={14} className="animate-spin text-[#C4AE7C]" />}
          </div>

          <select
            value={payrollPeriod}
            onChange={(e) => setPayrollPeriod(e.target.value)}
            className="rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-1.5 text-xs font-bold text-[#1F251A] outline-none cursor-pointer hover:border-[#C4AE7C]"
          >
            <option value="This Month">{tr?.thisMonth ?? "This Month"}</option>
            <option value="Last Month">{tr?.lastMonth ?? "Last Month"}</option>
            <option value="This Year">{tr?.thisYear ?? "This Year"}</option>
          </select>
        </div>

        {/* Payroll Breakdown Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs md:text-sm">
          <div className="space-y-3 bg-[#FBFBF9] p-5 rounded-2xl border border-[#414E36]/10">
            <div className="flex justify-between items-center pb-2 border-b border-[#414E36]/10">
              <span className="font-bold text-[#5A6A51]">{tr?.fixedBasicSalary ?? "Fixed / Basic Salary"}</span>
              <span className="font-black text-[#1F251A]">{basicSalary.toLocaleString()} EGP</span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-[#414E36]/10">
              <span className="font-bold text-[#5A6A51]">{isDoctorView ? (tr?.commissionsAndBonuses ?? "Commissions & Bonuses") : (tr?.bonuses ?? "Bonuses")}</span>
              <span className="font-black text-emerald-600">+{bonuses.toLocaleString()} EGP</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="font-bold text-[#5A6A51]">{tr?.deductions ?? "Deductions"}</span>
              <span className="font-black text-rose-600">-{deductions.toLocaleString()} EGP</span>
            </div>
          </div>

          <div className="space-y-3 bg-[#FBFBF9] p-5 rounded-2xl border border-[#414E36]/10">
            <div className="flex justify-between items-center pb-2 border-b border-[#414E36]/10">
              <span className="font-bold text-[#5A6A51]">{tr?.monthlyTarget ?? "Monthly Target"}</span>
              <span className="font-black text-[#1F251A]">{monthlyTarget.toLocaleString()} EGP</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-[#5A6A51]">{tr?.targetProgress ?? "Target Progress"}</span>
                <span className="text-[#414E36]">{targetProgressAmount.toLocaleString()} / {monthlyTarget.toLocaleString()} EGP ({targetPct}%)</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-[#414E36]/15 overflow-hidden">
                <div className="h-full bg-[#414E36] rounded-full transition-all duration-500" style={{ width: `${targetPct}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Net Salary Highlight Card */}
        <div className="rounded-2xl bg-[#EDE4C8]/40 border border-[#C4AE7C]/40 p-5 flex items-center justify-between">
          <span className="text-sm font-extrabold text-[#414E36]">{tr?.netSalary ?? "Net Salary"}</span>
          <span className="text-xl md:text-2xl font-black text-[#414E36]">{netSalary.toLocaleString()} EGP</span>
        </div>
      </div>

      {/* ── BOTTOM ACTION BUTTON: CHANGE PASSWORD ── */}
      <div className="pt-2 print:hidden">
        <button
          type="button"
          onClick={() => setShowPasswordModal(true)}
          className="w-full flex items-center justify-center gap-2.5 rounded-2xl border border-[#414E36]/20 bg-white py-3.5 text-xs font-bold text-[#1F251A] hover:bg-[#F9F9F7] transition shadow-xs"
        >
          <Lock size={16} className="text-[#414E36]" />
          <span>{tr?.changePassword ?? "Change Password"}</span>
        </button>
      </div>

      {/* ── MODAL 1: EDIT PERSONAL INFORMATION (EMAIL, PHONE & ADDRESS ONLY) ── */}
      {showEditPersonalModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl space-y-5 border border-[#414E36]/15">
            <div className="flex items-center justify-between border-b border-[#414E36]/10 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-[#1F251A]">{tr?.editContactInformation ?? "Edit Contact Information"}</h3>
              <button onClick={() => setShowEditPersonalModal(false)} className="p-2 rounded-xl text-[#5A6A51] hover:bg-[#FBFBF9]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePersonalSubmit} className="space-y-4 text-xs">
              {/* Display Read-Only Name */}
              <div className="grid grid-cols-2 gap-3 bg-[#FBFBF9] p-3 rounded-2xl border border-[#414E36]/10">
                <div>
                  <span className="block text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">{tr?.firstName ?? "First Name"}</span>
                  <span className="font-extrabold text-[#1F251A]">{firstName}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">{tr?.lastName ?? "Last Name"}</span>
                  <span className="font-extrabold text-[#1F251A]">{lastName}</span>
                </div>
              </div>

              {/* Editable Fields: Email, Phone, Address */}
              <div>
                <label className="block font-bold text-[#5A6A51] mb-1">{tr?.emailAddress ?? "Email Address *"}</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] p-2.5 font-bold text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#5A6A51] mb-1">{tr?.phoneNumber ?? "Phone Number"}</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="e.g. 01012345678"
                  className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] p-2.5 font-bold text-[#1F251A] outline-none focus:border-[#C4AE7C] font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-[#5A6A51] mb-1">{tr?.homeAddress ?? "Home Address"}</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="e.g. New Cairo, Cairo, Egypt"
                  className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] p-2.5 font-bold text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#414E36]/10">
                <button
                  type="button"
                  onClick={() => setShowEditPersonalModal(false)}
                  className="rounded-xl border border-[#414E36]/20 bg-white px-4 py-2 font-bold text-[#414E36]"
                >
                  {tr?.cancel ?? "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={savingUser}
                  className="rounded-xl bg-[#414E36] px-5 py-2 font-bold text-white hover:bg-[#2e3a26] transition disabled:opacity-50"
                >
                  {savingUser ? (tr?.saving ?? "Saving...") : (tr?.saveChanges ?? "Save Changes")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: CHANGE PASSWORD ── */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4 border border-[#414E36]/15">
            <div className="flex items-center justify-between border-b border-[#414E36]/10 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-[#1F251A] flex items-center gap-2">
                <Lock size={16} className="text-[#414E36]" /> {tr?.changePassword ?? "Change Password"}
              </h3>
              <button onClick={() => setShowPasswordModal(false)} className="p-2 rounded-xl text-[#5A6A51] hover:bg-[#FBFBF9]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#5A6A51] mb-1">{tr?.newPassword ?? "New Password"}</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={tr?.enterNewPassword ?? "Enter new password"}
                  className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] p-2.5 text-xs text-[#1F251A] outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-[#5A6A51] mb-1">{tr?.confirmNewPassword ?? "Confirm New Password"}</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={tr?.confirmNewPasswordPlaceholder ?? "Confirm new password"}
                  className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] p-2.5 text-xs text-[#1F251A] outline-none"
                />
              </div>

              {passwordError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-bold text-xs">
                  {passwordError}
                </div>
              )}

              {passwordSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs">
                  {passwordSuccess}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-[#414E36]/10">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="rounded-xl border border-[#414E36]/20 bg-white px-4 py-2 font-bold text-[#414E36]"
                >
                  {tr?.cancel ?? "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={updatingPassword}
                  className="rounded-xl bg-[#414E36] px-5 py-2 font-bold text-white hover:bg-[#2e3a26]"
                >
                  {updatingPassword ? (tr?.updating ?? "Updating...") : (tr?.updatePassword ?? "Update Password")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: ATTENDANCE HISTORY MODAL (REAL DATABASE LOGS) ── */}
      {showAttendanceHistoryModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl p-6 shadow-2xl space-y-4 border border-[#414E36]/15 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#414E36]/10 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-[#1F251A] flex items-center gap-2">
                <Calendar size={18} className="text-[#414E36]" /> {tr?.attendanceHistory ?? "Attendance History"} ({attendancePeriod})
              </h3>
              <button onClick={() => setShowAttendanceHistoryModal(false)} className="p-2 rounded-xl text-[#5A6A51] hover:bg-[#FBFBF9]">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 text-xs">
              {loadingAttendance ? (
                <div className="flex items-center justify-center py-12 text-[#5A6A51]">
                  <Loader2 size={24} className="animate-spin text-[#414E36]" />
                </div>
              ) : attendanceLogs.length === 0 ? (
                <div className="text-center py-12 text-gray-500 font-medium">
                  {tr?.noAttendanceRecords ?? "No attendance records logged in database for"} {attendancePeriod}.
                </div>
              ) : (
                attendanceLogs.map((log, idx) => (
                  <div key={log.id || idx} className="bg-[#FBFBF9] p-3.5 rounded-2xl border border-[#414E36]/10 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[#1F251A] text-xs">{log.date}</span>
                      <p className="text-[10px] text-[#5A6A51] font-mono">In: {log.check_in_time} • Out: {log.check_out_time}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-xs text-[#414E36]">{log.hours}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        log.status === "Present" ? "bg-emerald-100 text-emerald-800" :
                        log.status === "Late" ? "bg-amber-100 text-amber-800" :
                        log.status === "Overtime" ? "bg-blue-100 text-blue-800" : "bg-rose-100 text-rose-800"
                      }`}>
                        {tr?.attendanceStatus?.[log.status] ?? log.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-[#414E36]/10 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAttendanceHistoryModal(false)}
                className="rounded-xl bg-[#414E36] px-5 py-2 text-xs font-bold text-white"
              >
                <span>{tr?.close ?? "Close"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
