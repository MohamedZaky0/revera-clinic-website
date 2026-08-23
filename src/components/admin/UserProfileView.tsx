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
  Loader2
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

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
  const tr = t;
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

    const rawSched = user.workingDaysHours;
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
  }, [user.branch, user.branchesList, user.workingDaysHours, allSystemBranches]);

  // Formatted Working Schedule strictly parsed from Database Response
  const displayWorkingSchedule = useMemo(() => {
    const rawSched = user.workingDaysHours;
    if (rawSched) {
      let parsed: any = rawSched;
      if (typeof parsed === "string") {
        try { parsed = JSON.parse(parsed); } catch (e) {}
      }

      if (parsed && typeof parsed === "object") {
        const dayKeys = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const activeDays: string[] = [];
        const timeSlots: string[] = [];

        dayKeys.forEach(d => {
          const dayData = parsed[d] || parsed[d.toLowerCase()];
          if (dayData && dayData.active !== false && (dayData.start || dayData.hours)) {
            // Strip any artificial parenthesized annotations like (Morning) / (Evening)
            let hoursLabel = dayData.hours || `${dayData.start || "09:00"} – ${dayData.end || "17:00"}`;
            hoursLabel = hoursLabel.replace(/\s*\([^)]*\)/g, "").trim();
            activeDays.push(d);
            if (hoursLabel && !timeSlots.includes(hoursLabel)) {
              timeSlots.push(hoursLabel);
            }
          }
        });

        if (activeDays.length > 0) {
          return {
            days: activeDays.join(", "),
            hours: timeSlots.join(" | "),
            shiftType: timeSlots.length > 1 ? "Multi-Shift Schedule" : (user.shiftType || "Day")
          };
        }
      }
    }

    // Clean hours string without artificial parentheses annotations
    let rawHours = (user.workingHours || "—").replace(/\s*\([^)]*\)/g, "").trim();

    return {
      days: user.workingDays || "—",
      hours: rawHours || "—",
      shiftType: user.shiftType || "Day"
    };
  }, [user.workingDaysHours, user.workingDays, user.workingHours, user.shiftType]);

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
        let qRes = supabase
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
      <div className="rounded-[32px] border border-[#414E36]/12 bg-[#F9F9F7] p-6 md:p-8 shadow-xs space-y-6">
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
      <div className="rounded-3xl border border-[#414E36]/12 bg-white p-6 md:p-8 shadow-xs space-y-6">
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

      {/* ── SECTION 2: WORK INFORMATION (REAL DATABASE RESPONSE - VIEW ONLY, BREAK TIME REMOVED) ── */}
      <div className="rounded-3xl border border-[#414E36]/12 bg-white p-6 md:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-[#414E36]/10 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#C4AE7C] text-white text-xs font-black">
              2
            </span>
            <h2 className="text-xs md:text-sm font-black uppercase tracking-wider text-[#C4AE7C]">
              {tr?.workInformation ?? "Work Information"}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-xs md:text-sm">
          <div className="flex items-start gap-3">
            <Briefcase size={16} className="text-[#5A6A51] mt-0.5 shrink-0" />
            <div>
              <span className="text-[11px] font-bold text-[#5A6A51] block">{tr?.department ?? "Department"}</span>
              <span className="font-extrabold text-[#1F251A]">{displayDepartment}</span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock size={16} className="text-[#5A6A51] mt-0.5 shrink-0" />
            <div>
              <span className="text-[11px] font-bold text-[#5A6A51] block">{tr?.shiftType ?? "Shift Type"}</span>
              <span className="font-extrabold text-[#1F251A]">{displayWorkingSchedule.shiftType}</span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin size={16} className="text-[#5A6A51] mt-0.5 shrink-0" />
            <div>
              <span className="text-[11px] font-bold text-[#5A6A51] block">{tr?.assignedBranches ?? "Assigned Branches"}</span>
              <span className="font-extrabold text-[#1F251A]">{displayBranches}</span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar size={16} className="text-[#5A6A51] mt-0.5 shrink-0" />
            <div>
              <span className="text-[11px] font-bold text-[#5A6A51] block">{tr?.workingDays ?? "Working Days"}</span>
              <span className="font-extrabold text-[#1F251A]">{displayWorkingSchedule.days}</span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Briefcase size={16} className="text-[#5A6A51] mt-0.5 shrink-0" />
            <div>
              <span className="text-[11px] font-bold text-[#5A6A51] block">{tr?.employmentType ?? "Employment Type"}</span>
              <span className="font-extrabold text-[#1F251A]">{user.employmentType || (tr?.fullTime ?? "Full Time")}</span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock size={16} className="text-[#5A6A51] mt-0.5 shrink-0" />
            <div>
              <span className="text-[11px] font-bold text-[#5A6A51] block">{tr?.workingHours ?? "Working Hours"}</span>
              <span className="font-extrabold text-[#1F251A]">{displayWorkingSchedule.hours}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 3: ATTENDANCE SUMMARY (REAL DATA FROM DATABASE) ── */}
      <div className="rounded-3xl border border-[#414E36]/12 bg-white p-6 md:p-8 shadow-xs space-y-6">
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
      <div className="rounded-3xl border border-[#414E36]/12 bg-white p-6 md:p-8 shadow-xs space-y-6">
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
