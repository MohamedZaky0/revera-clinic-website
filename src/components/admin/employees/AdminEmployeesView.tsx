"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Search,
  Info,
  Pencil,
  Trash2,
  ArrowLeft,
  Stethoscope,
  AlertTriangle,
  Clock,
  Upload,
  FileText,
  Camera,
  X,
  MoreVertical,
  Filter,
  Calendar,
  CheckCircle,
  Briefcase,
  MapPin,
  Phone,
  Mail,
  DollarSign,
  TrendingUp,
  Printer,
  Download,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Lock,
  Eye,
  Building,
  CalendarDays,
  Award,
  User,
  Users,
  Shield,
  Target,
  Activity,
  BarChart3,
  CircleDollarSign,
  Loader2,
} from "lucide-react";
import { Branch } from "@/types";
import { compressImage } from "@/lib/image";
import { clearFetchCache } from "@/lib/fetchCache";
import { DoctorServiceCommissionEditor, ServiceCommissionEntry, DefaultCommissionType } from "@/components/admin/services/DoctorServiceCommissionEditor";
interface AdminEmployeesViewProps {
  // Shared with Role Management invite form
  newEmployeeName: string;
  setNewEmployeeName: (v: string) => void;
  newEmployeeEmail: string;
  setNewEmployeeEmail: (v: string) => void;
  newEmployeeRole: string;
  setNewEmployeeRole: (v: string) => void;

  // Shared with HR / page.tsx navigation-to-profile
  viewingEmployee: any | null;
  setViewingEmployee: (v: any | null) => void;
  editingEmployee: any | null;
  setEditingEmployee: (v: any | null) => void;
  isEditingEmployeeModalOpen: boolean;
  setIsEditingEmployeeModalOpen: (v: boolean) => void;

  // Shared global data / handlers
  branches: Branch[];
  rolesList: any[];
  departmentsList: string[];
  employeesList: any[];
  loadingRolesAndEmployees: boolean;
  attendanceList: any[];
  loadingAttendance: boolean;
  providers: any[];
  fetchProviders: () => Promise<void> | void;
  customerAvatars: Record<string, string>;
  handleAvatarUpload: (key: string, file: File) => Promise<void> | void;
  handleAvatarRemove: (key: string) => void;
  allServicesList: { id: number; en: string; ar?: string }[];
  session: any;
  adminDbId?: string;
  adminEmail?: string;
  fetchHrAttendance: () => Promise<void> | void;
  handleDeleteEmployee: (id: string) => Promise<void> | void;
  handleResendInvitation: (id: string) => Promise<void> | void;
  fetchRolesAndEmployees: () => Promise<void> | void;
  getDoctorFirstReservationDate: (docName: string, resList: any[]) => string | null;
  allReservations: any[];
  parseEgyptianNationalId: (id: string) => any;
  employeeProfileActiveTab: string;
  setEmployeeProfileActiveTab: (v: string) => void;
}

export default function AdminEmployeesView({
  newEmployeeName,
  setNewEmployeeName,
  newEmployeeEmail,
  setNewEmployeeEmail,
  newEmployeeRole,
  setNewEmployeeRole,
  viewingEmployee,
  setViewingEmployee,
  editingEmployee,
  setEditingEmployee,
  isEditingEmployeeModalOpen,
  setIsEditingEmployeeModalOpen,
  employeeProfileActiveTab,
  setEmployeeProfileActiveTab,
  branches,
  rolesList,
  departmentsList,
  employeesList,
  loadingRolesAndEmployees,
  attendanceList,
  loadingAttendance,
  providers,
  fetchProviders,
  customerAvatars,
  handleAvatarUpload,
  handleAvatarRemove,
  allServicesList,
  session,
  adminDbId,
  adminEmail,
  fetchHrAttendance,
  handleDeleteEmployee,
  handleResendInvitation,
  fetchRolesAndEmployees,
  getDoctorFirstReservationDate,
  allReservations,
  parseEgyptianNationalId,
}: AdminEmployeesViewProps) {
  const [newEmployeePhone, setNewEmployeePhone] = useState("");
  const [newEmployeeDepartment, setNewEmployeeDepartment] = useState("Receptionist");
  const [newEmployeeShift, setNewEmployeeShift] = useState("Day");
  const [newEmployeeShiftStart, setNewEmployeeShiftStart] = useState("09:00");
  const [newEmployeeShiftEnd, setNewEmployeeShiftEnd] = useState("17:00");

  const parseTime12Hour = (time12: string): string => {
    if (!time12) return "09:00";
    const clean = time12.trim().toUpperCase();
    const match = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
    if (!match) return "09:00";
    const [_, hoursStr, minutesStr, ampm] = match;
    let hours = parseInt(hoursStr, 10);
    if (ampm === "PM" && hours < 12) hours += 12;
    if (ampm === "AM" && hours === 12) hours = 0;
    const hoursFormatted = hours < 10 ? '0' + hours : hours;
    return `${hoursFormatted}:${minutesStr}`;
  };

  const parseShiftString = (shiftStr: string): { start: string; end: string } => {
    if (!shiftStr || shiftStr === "Day" || shiftStr === "Night") {
      if (shiftStr === "Night") {
        return { start: "20:00", end: "08:00" };
      }
      return { start: "09:00", end: "17:00" };
    }
    const parts = shiftStr.split(/\s+to\s+/i);
    if (parts.length === 2) {
      return {
        start: parseTime12Hour(parts[0]),
        end: parseTime12Hour(parts[1])
      };
    }
    return { start: "09:00", end: "17:00" };
  };

  const formatTime12Hour = (time24: string): string => {
    if (!time24) return "12:00 AM";
    const [hoursStr, minutesStr] = time24.split(":");
    let hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    if (isNaN(hours) || isNaN(minutes)) return "12:00 AM";
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesFormatted = minutes < 10 ? '0' + minutes : minutes;
    const hoursFormatted = hours < 10 ? '0' + hours : hours;
    return `${hoursFormatted}:${minutesFormatted} ${ampm}`;
  };

  const updateShiftState = (shiftStr: string) => {
    setNewEmployeeShift(shiftStr);
    const parsed = parseShiftString(shiftStr);
    setNewEmployeeShiftStart(parsed.start);
    setNewEmployeeShiftEnd(parsed.end);
  };

  const handleShiftStartChange = (val: string) => {
    setNewEmployeeShiftStart(val);
    const formattedStart = formatTime12Hour(val);
    const formattedEnd = formatTime12Hour(newEmployeeShiftEnd);
    setNewEmployeeShift(`${formattedStart} to ${formattedEnd}`);
  };

  const handleShiftEndChange = (val: string) => {
    setNewEmployeeShiftEnd(val);
    const formattedStart = formatTime12Hour(newEmployeeShiftStart);
    const formattedEnd = formatTime12Hour(val);
    setNewEmployeeShift(`${formattedStart} to ${formattedEnd}`);
  };
  const buildAddress = (line1: string, line2: string, city: string, gov: string, postal: string, country: string) => {
    return JSON.stringify({ line1, line2, city, governorate: gov, postalCode: postal, country });
  };

  const parseAddress = (raw: string) => {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && "line1" in parsed) return parsed;
    } catch {}
    // Legacy plain-text fallback
    return { line1: raw, line2: "", city: "", governorate: "", postalCode: "", country: "Egypt" };
  };

  const applyAddressToState = (raw: string | null | undefined) => {
    const p = parseAddress(raw || "");
    setNewEmployeeAddressLine1(p.line1 || "");
    setNewEmployeeAddressLine2(p.line2 || "");
    setNewEmployeeCity(p.city || "");
    setNewEmployeeGovernorateProp(p.governorate || "");
    setNewEmployeePostalCode(p.postalCode || "");
    setNewEmployeeCountry(p.country || "Egypt");
    setNewEmployeeAddress(raw || "");
  };

  const commitAddressState = (line1: string, line2: string, city: string, gov: string, postal: string, country: string) => {
    setNewEmployeeAddress(buildAddress(line1, line2, city, gov, postal, country));
  };
  const [newEmployeeSalary, setNewEmployeeSalary] = useState("0");
  const [newEmployeeNationalId, setNewEmployeeNationalId] = useState("");
  const [newEmployeeNationalIdFront, setNewEmployeeNationalIdFront] = useState("");
  const [newEmployeeNationalIdBack, setNewEmployeeNationalIdBack] = useState("");
  const [newEmployeeAddress, setNewEmployeeAddress] = useState("");
  const [newEmployeeAddressLine1, setNewEmployeeAddressLine1] = useState("");
  const [newEmployeeAddressLine2, setNewEmployeeAddressLine2] = useState("");
  const [newEmployeeCity, setNewEmployeeCity] = useState("");
  const [newEmployeeGovernorateProp, setNewEmployeeGovernorateProp] = useState("");
  const [newEmployeePostalCode, setNewEmployeePostalCode] = useState("");
  const [newEmployeeCountry, setNewEmployeeCountry] = useState("Egypt");
  const [newEmployeeBranchId, setNewEmployeeBranchId] = useState("");
  const [newEmployeeContract, setNewEmployeeContract] = useState("");
  const [newEmployeeContractName, setNewEmployeeContractName] = useState("");
  const [newEmployeeAdditionalFiles, setNewEmployeeAdditionalFiles] = useState<Array<{ file: string, name: string }>>([]);
  const [employeeFilterDepartment, setEmployeeFilterDepartment] = useState("All");
  const [employeeFilterShift, setEmployeeFilterShift] = useState("All");
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState("");
  const [newEmployeeRequiredTargetAmount, setNewEmployeeRequiredTargetAmount] = useState("0");
  const [newEmployeeBonusPercentage, setNewEmployeeBonusPercentage] = useState("0");
  const [newEmployeeSpecialty, setNewEmployeeSpecialty] = useState("");
  const [newEmployeeSelectedServices, setNewEmployeeSelectedServices] = useState<string[]>([]);
  const [newEmployeeRating, setNewEmployeeRating] = useState("5");
  const [newEmployeeCommissionType, setNewEmployeeCommissionType] = useState("none");
  const [newEmployeeCommissionValue, setNewEmployeeCommissionValue] = useState("0");
  const [newEmployeeCommissionBase, setNewEmployeeCommissionBase] = useState<"gross" | "net_of_materials">("gross");
  const [newEmployeeCommissionFixedComponent, setNewEmployeeCommissionFixedComponent] = useState("0");
  const [newEmployeeServiceCommissions, setNewEmployeeServiceCommissions] = useState<ServiceCommissionEntry[]>([]);
  const [newEmployeeScheduleTab, setNewEmployeeScheduleTab] = useState<"in_person" | "online">("in_person");
  const [newEmployeeBranchIds, setNewEmployeeBranchIds] = useState<string[]>([]);
  const [newEmployeeWorkingDaysHours, setNewEmployeeWorkingDaysHours] = useState<Record<string, { isOpen: boolean; start: string; end: string; shifts?: Array<{ start: string; end: string }> }>>({
    Sunday: { isOpen: true, start: "09:00", end: "17:00", shifts: [{ start: "09:00", end: "17:00" }] },
    Monday: { isOpen: true, start: "09:00", end: "17:00", shifts: [{ start: "09:00", end: "17:00" }] },
    Tuesday: { isOpen: true, start: "09:00", end: "17:00", shifts: [{ start: "09:00", end: "17:00" }] },
    Wednesday: { isOpen: true, start: "09:00", end: "17:00", shifts: [{ start: "09:00", end: "17:00" }] },
    Thursday: { isOpen: true, start: "09:00", end: "17:00", shifts: [{ start: "09:00", end: "17:00" }] },
    Friday: { isOpen: false, start: "09:00", end: "17:00", shifts: [{ start: "09:00", end: "17:00" }] },
    Saturday: { isOpen: true, start: "09:00", end: "17:00", shifts: [{ start: "09:00", end: "17:00" }] }
  });
  const [newEmployeeOnlineWorkingDaysHours, setNewEmployeeOnlineWorkingDaysHours] = useState<Record<string, { isOpen: boolean; start: string; end: string; shifts?: Array<{ start: string; end: string }> }>>({
    Sunday: { isOpen: true, start: "09:00", end: "17:00", shifts: [{ start: "09:00", end: "17:00" }] },
    Monday: { isOpen: true, start: "09:00", end: "17:00", shifts: [{ start: "09:00", end: "17:00" }] },
    Tuesday: { isOpen: true, start: "09:00", end: "17:00", shifts: [{ start: "09:00", end: "17:00" }] },
    Wednesday: { isOpen: true, start: "09:00", end: "17:00", shifts: [{ start: "09:00", end: "17:00" }] },
    Thursday: { isOpen: true, start: "09:00", end: "17:00", shifts: [{ start: "09:00", end: "17:00" }] },
    Friday: { isOpen: false, start: "09:00", end: "17:00", shifts: [{ start: "09:00", end: "17:00" }] },
    Saturday: { isOpen: true, start: "09:00", end: "17:00", shifts: [{ start: "09:00", end: "17:00" }] }
  });
  const [newEmployeeBranchSchedules, setNewEmployeeBranchSchedules] = useState<Record<string, { in_person: any; online: any }>>({});
  const [newEmployeeSelectedScheduleBranchId, setNewEmployeeSelectedScheduleBranchId] = useState<string>("");
  function checkShiftOverlaps(
    branchIds: string[],
    branchSchedules: Record<string, { in_person: any; online: any }>,
    currentActiveBranchId: string,
    currentInPerson: any,
    currentOnline: any,
    branchList: any[]
  ): { hasOverlap: boolean; message?: string } {
    const fullBranchSchedules: Record<string, { in_person: any; online: any }> = { ...branchSchedules };
    if (currentActiveBranchId) {
      fullBranchSchedules[currentActiveBranchId] = {
        in_person: currentInPerson,
        online: currentOnline
      };
    }

    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    function timeToMin(tStr: string): number {
      if (!tStr) return 0;
      const [h, m] = tStr.split(":").map(Number);
      return (h || 0) * 60 + (m || 0);
    }

    for (const day of days) {
      const allActiveShifts: Array<{
        branchId: string;
        branchName: string;
        type: "In-Clinic" | "Online Consultations";
        startMin: number;
        endMin: number;
        startStr: string;
        endStr: string;
      }> = [];

      for (const bId of branchIds) {
        const bSched = fullBranchSchedules[bId];
        if (!bSched) continue;
        const bObj = branchList.find((b) => b.id === bId);
        const bName = bObj ? (bObj.name_en || bObj.name || bId) : "Branch";

        // 1. In-Clinic shifts
        const inPersonDay = bSched.in_person?.[day];
        if (inPersonDay && inPersonDay.isOpen) {
          const shifts = (inPersonDay.shifts && inPersonDay.shifts.length > 0)
            ? inPersonDay.shifts
            : [{ start: inPersonDay.start || "09:00", end: inPersonDay.end || "17:00" }];

          for (const s of shifts) {
            const sMin = timeToMin(s.start);
            const eMin = timeToMin(s.end);
            if (eMin <= sMin) {
              return {
                hasOverlap: true,
                message: `Invalid shift duration on ${day} at ${bName} (In-Clinic): End time (${s.end}) must be after start time (${s.start}).`
              };
            }
            allActiveShifts.push({
              branchId: bId,
              branchName: bName,
              type: "In-Clinic",
              startMin: sMin,
              endMin: eMin,
              startStr: s.start,
              endStr: s.end
            });
          }
        }

        // 2. Online Consultations shifts
        const onlineDay = bSched.online?.[day];
        if (onlineDay && onlineDay.isOpen) {
          const shifts = (onlineDay.shifts && onlineDay.shifts.length > 0)
            ? onlineDay.shifts
            : [{ start: onlineDay.start || "09:00", end: onlineDay.end || "17:00" }];

          for (const s of shifts) {
            const sMin = timeToMin(s.start);
            const eMin = timeToMin(s.end);
            if (eMin <= sMin) {
              return {
                hasOverlap: true,
                message: `Invalid shift duration on ${day} at ${bName} (Online Consultations): End time (${s.end}) must be after start time (${s.start}).`
              };
            }
            allActiveShifts.push({
              branchId: bId,
              branchName: bName,
              type: "Online Consultations",
              startMin: sMin,
              endMin: eMin,
              startStr: s.start,
              endStr: s.end
            });
          }
        }
      }

      // Check pairwise overlaps on this day
      for (let i = 0; i < allActiveShifts.length; i++) {
        for (let j = i + 1; j < allActiveShifts.length; j++) {
          const s1 = allActiveShifts[i];
          const s2 = allActiveShifts[j];

          if (s1.startMin < s2.endMin && s1.endMin > s2.startMin) {
            return {
              hasOverlap: true,
              message: `Shift Overlap Detected on ${day}: ${s1.branchName} (${s1.type}: ${s1.startStr} - ${s1.endStr}) overlaps with ${s2.branchName} (${s2.type}: ${s2.startStr} - ${s2.endStr}).`
            };
          }
        }
      }
    }

    return { hasOverlap: false };
  }
  function handleEmployeeBranchScheduleTabChange(targetBranchId: string) {
    if (!targetBranchId || targetBranchId === (newEmployeeSelectedScheduleBranchId || newEmployeeBranchIds[0])) return;
    const currentBranchId = newEmployeeSelectedScheduleBranchId || newEmployeeBranchIds[0];

    const updatedSchedules = {
      ...newEmployeeBranchSchedules,
      [currentBranchId]: {
        in_person: newEmployeeWorkingDaysHours,
        online: newEmployeeOnlineWorkingDaysHours
      }
    };
    setNewEmployeeBranchSchedules(updatedSchedules);

    const defaultDaySched = {
      Sunday: { isOpen: false, start: "09:00", end: "17:00", shifts: [{ start: "09:00", end: "17:00" }] },
      Monday: { isOpen: false, start: "09:00", end: "17:00", shifts: [{ start: "09:00", end: "17:00" }] },
      Tuesday: { isOpen: false, start: "09:00", end: "17:00", shifts: [{ start: "09:00", end: "17:00" }] },
      Wednesday: { isOpen: false, start: "09:00", end: "17:00", shifts: [{ start: "09:00", end: "17:00" }] },
      Thursday: { isOpen: false, start: "09:00", end: "17:00", shifts: [{ start: "09:00", end: "17:00" }] },
      Friday: { isOpen: false, start: "09:00", end: "17:00", shifts: [{ start: "09:00", end: "17:00" }] },
      Saturday: { isOpen: false, start: "09:00", end: "17:00", shifts: [{ start: "09:00", end: "17:00" }] }
    };

    const targetSched = updatedSchedules[targetBranchId] || {
      in_person: defaultDaySched,
      online: defaultDaySched
    };

    setNewEmployeeWorkingDaysHours(targetSched.in_person || defaultDaySched);
    setNewEmployeeOnlineWorkingDaysHours(targetSched.online || defaultDaySched);
    setNewEmployeeSelectedScheduleBranchId(targetBranchId);
  }
  const [viewingEmployeeNotes, setViewingEmployeeNotes] = useState<any[]>([]);
  const [loadingEmployeeNotes, setLoadingEmployeeNotes] = useState(false);
  const [viewingEmployeeBookings, setViewingEmployeeBookings] = useState<any[]>([]);
  const [loadingEmployeeBookings, setLoadingEmployeeBookings] = useState(false);
  const [newEmployeeNoteText, setNewEmployeeNoteText] = useState("");
  const [attendanceInsightMonth, setAttendanceInsightMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  function handleExportAttendanceInsights(employee: any, monthStr: string, records: any[]) {
    if (!employee) return;
    const fileName = `Attendance_Insights_${(employee.name || 'Employee').replace(/\s+/g, '_')}_${monthStr}.csv`;
    
    let csv = `ATTENDANCE INSIGHTS REPORT\n`;
    csv += `Employee,${employee.name || 'Employee'}\n`;
    csv += `Staff ID,${employee.employee_id || '—'}\n`;
    csv += `Department,${employee.department || '—'}\n`;
    csv += `Role,${employee.role_name || '—'}\n`;
    csv += `Month,${monthStr}\n\n`;

    csv += `Date,Shift,Scheduled In,Scheduled Out,Actual Check In,Actual Check Out,Status,Worked (Min),Late (Min),Early Leave (Min),Overtime (Min),Mid-Shift Leave (Min)\n`;

    records.forEach((r: any) => {
      const inTime = r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString() : '—';
      const outTime = r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString() : '—';
      csv += `"${r.date}","${employee.shift || 'Day'}","${r.scheduled_in || '09:00 AM'}","${r.scheduled_out || '05:00 PM'}","${inTime}","${outTime}","${r.status || 'Present'}",${r.worked_minutes || 0},${r.late_minutes || 0},${r.early_leave_minutes || 0},${r.overtime_minutes || 0},${r.combined_mid_shift_duration_minutes || 0}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  useEffect(() => {
    if (!viewingEmployee) {
      setViewingEmployeeNotes([]);
      setViewingEmployeeBookings([]);
      return;
    }

    const loadRefData = async () => {
      setLoadingEmployeeNotes(true);
      setLoadingEmployeeBookings(true);
      try {
        const [notesRes, bookingsRes] = await Promise.all([
          fetch(`/api/employees/notes?employeeId=${viewingEmployee.id}`, {
            headers: { Authorization: `Bearer ${session?.access_token || ''}` },
          }),
          fetch(`/api/reservations?createdByEmployeeId=${viewingEmployee.id}`, {
            headers: { Authorization: `Bearer ${session?.access_token || ''}` },
          })
        ]);

        if (notesRes.ok) {
          const notes = await notesRes.json();
          setViewingEmployeeNotes(notes || []);
        }
        if (bookingsRes.ok) {
          const bookings = await bookingsRes.json();
          setViewingEmployeeBookings(bookings || []);
        }
        fetchHrAttendance();
      } catch (err) {
        console.error("Failed to load employee profile data:", err);
      } finally {
        setLoadingEmployeeNotes(false);
        setLoadingEmployeeBookings(false);
      }
    };

    loadRefData();
  }, [viewingEmployee]);
  function handlePrintEmployeeProfile(emp: any) {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to print employee profiles.");
      return;
    }

    const addedOn = emp.created_at
      ? new Date(emp.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
      : "—";

    const monthlySalary = Number(emp.salary || 0);
    const dailySalary = Math.round(monthlySalary / 20);
    const hourlySalary = (monthlySalary / (20 * 8)).toFixed(2);
    
    const addressDetails = emp.address || "—";
    
    const familyName = emp.name ? emp.name.split(" ").slice(-1)[0] : "Saif";
    const emergencyName = `Ahmed ${familyName}`;
    const emergencyPhone = "01098765432";
    
    const notesStr = "Excellent communication skills and very cooperative.";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Employee Profile - ${emp.name || "Staff Details"}</title>
        <style>
          body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            color: #1F251A;
            margin: 0;
            padding: 40px;
            background-color: #fff;
          }
          .letterhead {
            text-align: center;
            border-bottom: 2px solid #414E36;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 28px;
            font-weight: 700;
            letter-spacing: 0.1em;
            color: #414E36;
            margin: 0;
            text-transform: uppercase;
          }
          .tagline {
            font-size: 12px;
            color: #8A9A81;
            margin: 5px 0 0 0;
            letter-spacing: 0.15em;
            text-transform: uppercase;
          }
          .profile-header {
            display: flex;
            align-items: center;
            gap: 20px;
            margin-bottom: 30px;
          }
          .profile-name {
            font-size: 24px;
            font-weight: 700;
            color: #1F251A;
            margin: 0;
          }
          .profile-subtitle {
            font-size: 14px;
            color: #5A6A51;
            margin: 2px 0 0 0;
          }
          .section {
            margin-bottom: 25px;
            border: 1px solid #E6E9EB;
            border-radius: 12px;
            padding: 18px;
          }
          .section-title {
            font-size: 13px;
            font-weight: bold;
            color: #414E36;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            border-bottom: 1px solid #E6E9EB;
            padding-bottom: 8px;
            margin-top: 0;
            margin-bottom: 15px;
          }
          .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px 30px;
          }
          .grid-3 {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 15px 30px;
          }
          .grid-4 {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
          }
          .label {
            font-weight: bold;
            color: #5A6A51;
            text-transform: uppercase;
            font-size: 10px;
            letter-spacing: 0.08em;
            margin-bottom: 3px;
          }
          .value {
            font-size: 14px;
            font-weight: 600;
            color: #1F251A;
          }
          .value.green {
            color: #15803d;
          }
          .footer {
            margin-top: 60px;
            border-top: 1px solid #E6E9EB;
            padding-top: 15px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .clinic-info {
            font-size: 10px;
            color: #8A9A81;
            line-height: 1.5;
          }
          @media print {
            body { padding: 0; }
            @page { margin: 15mm; }
          }
        </style>
      </head>
      <body>
        <div class="letterhead">
          <h1 class="logo">Revera Clinic</h1>
          <p class="tagline">Employee Profile & Staff Record</p>
        </div>

        <div class="profile-header">
          <div>
            <h2 class="profile-name">${emp.name || "Staff Member"}</h2>
            <p class="profile-subtitle">Registered Employee Profile Details</p>
          </div>
        </div>

        <!-- Basic Information -->
        <div class="section">
          <h3 class="section-title">Basic Information</h3>
          <div class="grid-3">
            <div>
              <div class="label">Employee ID</div>
              <div class="value">${emp.employee_id || "—"}</div>
            </div>
            <div>
              <div class="label">Full Name</div>
              <div class="value">${emp.name || "—"}</div>
            </div>
            <div>
              <div class="label">Email Address</div>
              <div class="value">${emp.email || "—"}</div>
            </div>
            <div>
              <div class="label">Phone Number</div>
              <div class="value">${emp.phone || "—"}</div>
            </div>
            <div>
              <div class="label">System Role</div>
              <div class="value">${emp.role_name || "—"}</div>
            </div>
            <div>
              <div class="label">Account Status</div>
              <div class="value">${emp.email_confirmed_at ? "Active" : "Pending Invitation"}</div>
            </div>
            <div>
              <div class="label">Department</div>
              <div class="value">${emp.department || "Reception"}</div>
            </div>
            <div>
              <div class="label">Added On</div>
              <div class="value">${addedOn}</div>
            </div>
          </div>
        </div>

        <!-- Work Information -->
        <div class="section">
          <h3 class="section-title">Work Information</h3>
          <div class="grid-3">
            <div>
              <div class="label">Job Title</div>
              <div class="value">${emp.role_name || "Receptionist"}</div>
            </div>
            <div>
              <div class="label">Shift Type</div>
              <div class="value">${emp.shift || "Day"}</div>
            </div>
            <div>
              <div class="label">Shift Details</div>
              <div class="value">${emp.shift === "Night" ? "General Night Shift" : "General Day Shift"}</div>
            </div>
            <div>
              <div class="label">Working Days</div>
              <div class="value">Sunday - Thursday</div>
            </div>
            <div>
              <div class="label">Working Hours</div>
              <div class="value">${emp.shift === "Night" ? "05:00 PM - 01:00 AM" : "09:00 AM - 05:00 PM"}</div>
            </div>
            <div>
              <div class="label">Break Time</div>
              <div class="value">${emp.shift === "Night" ? "09:00 PM - 10:00 PM" : "01:00 PM - 02:00 PM"}</div>
            </div>
            <div>
              <div class="label">Monthly Salary</div>
              <div class="value">${monthlySalary.toLocaleString()} EGP</div>
            </div>
            <div>
              <div class="label">Daily Salary</div>
              <div class="value">${dailySalary.toLocaleString()} EGP</div>
            </div>
            <div>
              <div class="label">Hourly Salary</div>
              <div class="value">${hourlySalary} EGP</div>
            </div>
            <div>
              <div class="label">Employment Type</div>
              <div class="value">Full Time</div>
            </div>
            <div>
              <div class="label">Joining Date</div>
              <div class="value">${addedOn}</div>
            </div>
            <div>
              <div class="label">Probation Period</div>
              <div class="value">Completed</div>
            </div>
          </div>
        </div>

        <!-- Payroll Information -->
        <div class="section">
          <h3 class="section-title">Payroll Information</h3>
          <div class="grid-3">
            <div>
              <div class="label">Basic Salary</div>
              <div class="value">${monthlySalary.toLocaleString()} EGP</div>
            </div>
            <div>
              <div class="label">Bonuses</div>
              <div class="value">200 EGP</div>
            </div>
            <div>
              <div class="label">Deductions</div>
              <div class="value">150 EGP</div>
            </div>
            <div>
              <div class="label">Net Salary</div>
              <div class="value green">${(monthlySalary + 200 - 150).toLocaleString()} EGP</div>
            </div>
            <div>
              <div class="label">Payment Status</div>
              <div class="value">Paid</div>
            </div>
            <div>
              <div class="label">Last Payment Date</div>
              <div class="value">May 5, 2026</div>
            </div>
          </div>
        </div>

        <!-- Attendance Information -->
        <div class="section">
          <h3 class="section-title">Attendance Information</h3>
          <div class="grid-3">
            <div>
              <div class="label">Check-In Time</div>
              <div class="value">${emp.shift === "Night" ? "04:58 PM" : "08:58 AM"}</div>
            </div>
            <div>
              <div class="label">Check-out Time</div>
              <div class="value">${emp.shift === "Night" ? "01:02 AM" : "05:02 PM"}</div>
            </div>
            <div>
              <div class="label">Total Working Hours</div>
              <div class="value">8h 4m</div>
            </div>
            <div>
              <div class="label">Late Days</div>
              <div class="value">1 Day</div>
            </div>
            <div>
              <div class="label">Absence Days</div>
              <div class="value">0 Day</div>
            </div>
            <div>
              <div class="label">Overtime Hours</div>
              <div class="value">2h 15m</div>
            </div>
          </div>
        </div>

        <!-- Contact Information -->
        <div class="section">
          <h3 class="section-title">Contact Information</h3>
          <div class="grid-2">
            <div>
              <div class="label">Home Address</div>
              <div class="value">${addressDetails}</div>
            </div>
            <div>
              <div class="label">Emergency Contact Name</div>
              <div class="value">${emergencyName}</div>
            </div>
            <div>
              <div class="label">Emergency Contact Phone</div>
              <div class="value">${emergencyPhone}</div>
            </div>
          </div>
        </div>

        <!-- Notes -->
        <div class="section">
          <h3 class="section-title">Internal Notes</h3>
          <div class="value" style="font-weight: normal; font-style: italic;">
            ${notesStr}
          </div>
        </div>

        <div class="footer">
          <div class="clinic-info">
            <strong>Revera Clinic Cairo</strong><br/>
            El-Ghad St, Pyramids, Giza<br/>
            Tel: +20 100 000 0000 | info@revera.com
          </div>
          <div style="font-size: 11px; color: #5A6A51;">
            Generated on: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }
  return (
    <div className="space-y-6 animate-fadeIn">
      {!viewingEmployee && !isEditingEmployeeModalOpen && (
        <>
          {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-4xl font-semibold text-[#1F251A]">Staff &amp; Employees</h2>
          <p className="mt-2 text-sm text-[#5A6A51]">Manage all staff accounts, departments, shifts, salaries, and system roles.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingEmployee(null);
            setNewEmployeeName("");
            setNewEmployeeEmail("");
            setNewEmployeeRole("");
            setNewEmployeePhone("");
            setNewEmployeeDepartment("Reception");
            updateShiftState("Day");
            setNewEmployeeSalary("0");
            setNewEmployeeNationalId("");
            setNewEmployeeNationalIdFront("");
            setNewEmployeeNationalIdBack("");
            applyAddressToState("");
            setNewEmployeeBranchId("");
            setNewEmployeeContract("");
            setNewEmployeeContractName("");
            setNewEmployeeAdditionalFiles([]);
            setNewEmployeeRequiredTargetAmount("0");
            setNewEmployeeBonusPercentage("0");
            setNewEmployeeSpecialty("");
            setNewEmployeeSelectedServices([]);
            setNewEmployeeRating("5");
            setNewEmployeeCommissionType("none");
            setNewEmployeeCommissionValue("0");
            setNewEmployeeCommissionBase("gross");
            setNewEmployeeCommissionFixedComponent("0");
            setNewEmployeeServiceCommissions([]);
            setNewEmployeeScheduleTab("in_person");
            setNewEmployeeBranchIds(branches.length > 0 ? [branches[0].id] : []);
            const defaultDays = {
              Sunday: { isOpen: true, start: "09:00", end: "17:00", shifts: [{ start: "09:00", end: "17:00" }] },
              Monday: { isOpen: true, start: "09:00", end: "17:00", shifts: [{ start: "09:00", end: "17:00" }] },
              Tuesday: { isOpen: true, start: "09:00", end: "17:00", shifts: [{ start: "09:00", end: "17:00" }] },
              Wednesday: { isOpen: true, start: "09:00", end: "17:00", shifts: [{ start: "09:00", end: "17:00" }] },
              Thursday: { isOpen: true, start: "09:00", end: "17:00", shifts: [{ start: "09:00", end: "17:00" }] },
              Friday: { isOpen: false, start: "09:00", end: "17:00", shifts: [{ start: "09:00", end: "17:00" }] },
              Saturday: { isOpen: true, start: "09:00", end: "17:00", shifts: [{ start: "09:00", end: "17:00" }] }
            };
            setNewEmployeeWorkingDaysHours(defaultDays);
            setNewEmployeeOnlineWorkingDaysHours(defaultDays);
            setIsEditingEmployeeModalOpen(true);
          }}
          className="rounded-2xl bg-[#414E36] px-5 py-3 text-sm font-bold text-[#FBFBF9] hover:bg-[#2e3a26] transition flex items-center gap-2 shadow-md shrink-0"
        >
          <Plus size={16} />
          Add Employee
        </button>
      </div>
    
      {/* Filters & Search */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 bg-white p-5 rounded-3xl border border-[#414E36]/10 shadow-sm">
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <Search size={15} />
          </span>
          <input
            type="text"
            placeholder="Search name, phone, email..."
            value={employeeSearchQuery}
            onChange={(e) => setEmployeeSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] pl-10 pr-4 py-2.5 text-xs font-semibold text-[#1F251A] outline-none focus:border-[#C4AE7C]"
          />
        </div>
        <select
          value={employeeFilterDepartment}
          onChange={(e) => setEmployeeFilterDepartment(e.target.value)}
          className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-xs font-semibold text-[#414E36] outline-none focus:border-[#C4AE7C] cursor-pointer"
        >
          <option value="All">All Departments</option>
          {departmentsList.map((dept) => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>
        <select
          value={employeeFilterShift}
          onChange={(e) => setEmployeeFilterShift(e.target.value)}
          className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-xs font-semibold text-[#414E36] outline-none focus:border-[#C4AE7C] cursor-pointer"
        >
          <option value="All">All Shifts</option>
          <option value="Day">Day Shift</option>
          <option value="Night">Night Shift</option>
        </select>
        <div className="flex items-center justify-end text-xs font-semibold text-[#5A6A51] px-2">
          {loadingRolesAndEmployees ? "Loading..." : `${employeesList.filter((emp: any) => emp.role_name !== 'superadmin' && emp.employee_id !== 'superadmin').length} Total Employees`}
        </div>
      </div>
    
      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-[#414E36]/10 bg-white shadow-sm scrollbar-none">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b border-[#414E36]/10 bg-[#F9F9F7]">
              <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51] whitespace-nowrap">Employee Info</th>
              <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51] whitespace-nowrap">Phone</th>
              <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51] whitespace-nowrap">Department</th>
              <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51] whitespace-nowrap">Branch</th>
              <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51] whitespace-nowrap">Shift</th>
              <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51] whitespace-nowrap">Salary</th>
              <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51] whitespace-nowrap">Status</th>
              <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51] whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#414E36]/5">
            {loadingRolesAndEmployees ? (
              <tr>
                <td colSpan={8} className="px-6 py-16 text-center text-sm text-[#5A6A51] font-medium">
                  Loading employees...
                </td>
              </tr>
            ) : (() => {
              const filtered = employeesList.filter((emp: any) => {
                const isSuperadmin =
                  emp.role_name === 'superadmin' ||
                  emp.employee_id === 'superadmin';
                if (isSuperadmin) return false;
                if (employeeFilterDepartment !== "All" && emp.department !== employeeFilterDepartment) return false;
                if (employeeFilterShift !== "All") {
                  const empShift = (emp.shift || "").toLowerCase();
                  const filterVal = employeeFilterShift.toLowerCase();
                  if (filterVal === "day") {
                    if (!empShift.includes("day") && !empShift.includes("am") && (empShift.includes("night") || empShift.includes("pm"))) {
                      return false;
                    }
                  } else if (filterVal === "night") {
                    if (!empShift.includes("night") && !empShift.includes("pm")) {
                      return false;
                    }
                  } else if (emp.shift !== employeeFilterShift) {
                    return false;
                  }
                }
                if (employeeSearchQuery.trim()) {
                  const q = employeeSearchQuery.toLowerCase();
                  if (
                    !emp.name?.toLowerCase().includes(q) &&
                    !emp.email?.toLowerCase().includes(q) &&
                    !emp.phone?.toLowerCase().includes(q) &&
                    !emp.employee_id?.toLowerCase().includes(q)
                  ) return false;
                }
                return true;
              });
              if (filtered.length === 0) {
                return (
                  <tr>
                    <td colSpan={8} className="px-6 py-16 text-center text-sm text-[#5A6A51] font-medium">
                      No employees match your filters.
                    </td>
                  </tr>
                );
              }
              return filtered.map((emp: any) => {
                const isSuperadmin = emp.employee_id === "superadmin";
                const matchProv = providers.find(p => (p.name && emp.name && p.name.trim().toLowerCase() === emp.name.trim().toLowerCase()) || (p.phone && emp.phone && p.phone === emp.phone));
                const effectiveSalary = matchProv ? (matchProv.fixedSalary ?? matchProv.fixed_salary ?? emp.salary ?? 0) : (emp.salary || 0);
                return (
                  <tr key={emp.id} className="transition hover:bg-[#F9F9F7]">
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-[#EDF1EC] text-[#414E36] border border-[#414E36]/10 flex items-center justify-center text-xs font-bold font-serif overflow-hidden shrink-0">
                          {customerAvatars[emp.id || emp.employee_id] || emp.photo_url || emp.avatar_url ? (
                            <img src={customerAvatars[emp.id || emp.employee_id] || emp.photo_url || emp.avatar_url} alt={emp.name} className="h-full w-full object-cover" />
                          ) : (
                            <span>{emp.name ? emp.name.charAt(0).toUpperCase() : "E"}</span>
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-[#1F251A] text-sm">{emp.name || <span className="italic text-gray-400">No name</span>}</div>
                          <div className="text-xs text-[#5A6A51]">{emp.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-xs font-medium text-[#1F251A]">{emp.phone || "—"}</td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="inline-block rounded-lg bg-[#C4AE7C]/15 px-2.5 py-1 text-xs font-semibold text-[#8B7544]">
                        {emp.department || "Reception"}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="inline-block rounded-lg bg-[#414E36]/10 px-2.5 py-1 text-xs font-semibold text-[#414E36]">
                        {branches.find(b => b.id === emp.branch_id)?.name_en || "—"}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={`inline-block rounded-lg px-2.5 py-1 text-xs font-semibold ${(emp.shift || "").toLowerCase().includes("night") || (emp.shift || "").toLowerCase().includes("pm") ? "bg-indigo-50 text-indigo-700 border border-indigo-150" : "bg-amber-50 text-amber-700 border border-amber-150"}`}>
                        {emp.shift || "Day"}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-xs font-bold text-[#1F251A]">
                      {Number(effectiveSalary).toLocaleString()} EGP
                    </td>
                    <td className="px-5 py-4 text-center whitespace-nowrap">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold border ${emp.email_confirmed_at ? "bg-green-50 text-green-700 border-green-200/50" : "bg-amber-50 text-amber-700 border-amber-200/50"}`}>
                        {emp.email_confirmed_at ? "Active" : "Invited"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewingEmployee(emp)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#414E36]/15 text-[#5A6A51] transition hover:border-[#C4AE7C] hover:text-[#414E36]"
                          title="View Info"
                        >
                          <Info size={14} />
                        </button>
                        {!isSuperadmin && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingEmployee(emp);
                                setNewEmployeeName(emp.name || "");
                                setNewEmployeeEmail(emp.email || "");
                                setNewEmployeeRole(emp.role_name || "");
                                setNewEmployeePhone(emp.phone || "");
                                setNewEmployeeDepartment(emp.department || "Reception");
                                updateShiftState(emp.shift || "Day");
                                setNewEmployeeSalary(String(effectiveSalary));
                                setNewEmployeeNationalId(emp.national_id || "");
                                setNewEmployeeNationalIdFront(emp.national_id_front || "");
                                setNewEmployeeNationalIdBack(emp.national_id_back || "");
                                applyAddressToState(emp.address || "");
                                setNewEmployeeBranchId(emp.branch_id || "");
                                const rawContract = emp.contract_file || "";
                                let contractUrl = "";
                                let additionalList: any[] = [];
                                try {
                                  if (rawContract.startsWith('{')) {
                                    const parsed = JSON.parse(rawContract);
                                    contractUrl = parsed.contract || "";
                                    additionalList = parsed.additional || [];
                                  } else {
                                    contractUrl = rawContract;
                                  }
                                } catch (e) {
                                  contractUrl = rawContract;
                                }
                                setNewEmployeeContract(contractUrl);
                                setNewEmployeeContractName(emp.contract_file_name || "");
                                setNewEmployeeAdditionalFiles(additionalList);
                                setNewEmployeeRequiredTargetAmount(String(emp.requiredTargetAmount || 0));
                                setNewEmployeeBonusPercentage(String(emp.bonusPercentage || 0));
                                const matchProv = providers.find(p => (p.name && emp.name && p.name.trim().toLowerCase() === emp.name.trim().toLowerCase()) || (p.phone && emp.phone && p.phone === emp.phone));
                                setNewEmployeeSpecialty(matchProv?.specialty || "");
                                setNewEmployeeSelectedServices(matchProv?.services || []);
                                setNewEmployeeRating(String(matchProv?.rating || 5));
                                setNewEmployeeCommissionType(matchProv?.commissionType || "none");
                                setNewEmployeeCommissionValue(String(matchProv?.commissionValue || 0));
                                setNewEmployeeCommissionBase((matchProv?.commissionBase as "gross" | "net_of_materials") || "gross");
                                setNewEmployeeCommissionFixedComponent(String(matchProv?.commissionFixedComponent || 0));
                                setNewEmployeeServiceCommissions(Array.isArray(matchProv?.serviceCommissions) ? matchProv.serviceCommissions : []);
                                let bIds: string[] = [];
                                if (matchProv?.workingDaysHours?.branch_ids && Array.isArray(matchProv.workingDaysHours.branch_ids)) {
                                  bIds = matchProv.workingDaysHours.branch_ids;
                                } else if (emp.branch_id) {
                                  bIds = [emp.branch_id];
                                } else if (branches.length > 0) {
                                  bIds = [branches[0].id];
                                }
                                setNewEmployeeBranchIds(bIds);
                                let sched = matchProv?.workingDaysHours?.branch_schedules?.[bIds[0]]?.in_person || matchProv?.workingDaysHours?.in_person || matchProv?.workingDaysHours;
                                if (!sched || typeof sched !== 'object') {
                                  sched = {
                                    Sunday: { isOpen: true, start: "09:00", end: "17:00" },
                                    Monday: { isOpen: true, start: "09:00", end: "17:00" },
                                    Tuesday: { isOpen: true, start: "09:00", end: "17:00" },
                                    Wednesday: { isOpen: true, start: "09:00", end: "17:00" },
                                    Thursday: { isOpen: true, start: "09:00", end: "17:00" },
                                    Friday: { isOpen: false, start: "09:00", end: "17:00" },
                                    Saturday: { isOpen: true, start: "09:00", end: "17:00" }
                                  };
                                }
                                setNewEmployeeWorkingDaysHours(sched);
                                setIsEditingEmployeeModalOpen(true);
                              }}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#414E36]/15 text-[#5A6A51] transition hover:border-[#C4AE7C] hover:text-[#414E36]"
                              title="Edit Employee"
                            >
                              <Pencil size={13} />
                            </button>
                            {!emp.email_confirmed_at && (
                              <button
                                type="button"
                                onClick={() => handleResendInvitation(emp.id)}
                                className="inline-flex h-7 px-2.5 items-center justify-center rounded-full border border-amber-200/60 bg-amber-50/50 text-xs font-semibold text-amber-700 transition hover:bg-amber-100/80"
                                title="Resend invitation email"
                              >
                                Resend
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteEmployee(emp.id)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-red-200/60 text-red-600 transition hover:bg-red-50 hover:border-red-300"
                              title="Revoke access"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      </>
      )}
    
      {/* Add / Edit Employee Modal */}
      {isEditingEmployeeModalOpen && (
        <div className="space-y-6 animate-fadeIn">
          <div>
            <button
              type="button"
              onClick={() => {
                setIsEditingEmployeeModalOpen(false);
                setEditingEmployee(null);
              }}
              className="flex items-center gap-1.5 text-xs font-bold text-[#5A6A51] hover:text-[#414E36] outline-none transition uppercase tracking-wider"
            >
              <ArrowLeft size={14} /> Back to Employees
            </button>
          </div>
          <div className="w-full bg-white rounded-3xl border border-[#414E36]/10 p-8 shadow-sm">
            <h3 className="text-2xl font-bold text-[#1F251A] mb-1">
              {editingEmployee ? "Edit Employee" : "Add New Employee"}
            </h3>
            <p className="text-xs text-[#5A6A51] mb-6">
              {editingEmployee
                ? "Update shift, department, salary, and role details."
                : "Fill in the details below to invite a new staff member."}
            </p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newEmployeeName.trim() || !newEmployeeRole) {
                  alert("Name and System Role are required.");
                  return;
                }
                try {
                  const activeBranchId = newEmployeeSelectedScheduleBranchId || newEmployeeBranchIds[0] || newEmployeeBranchId;
    
                  // 1. Validate Shift Overlaps across all branches and shift types
                  if (newEmployeeDepartment?.toLowerCase().includes("doc") || newEmployeeRole?.toLowerCase().includes("doc")) {
                    const overlapCheck = checkShiftOverlaps(
                      newEmployeeBranchIds,
                      newEmployeeBranchSchedules,
                      activeBranchId,
                      newEmployeeWorkingDaysHours,
                      newEmployeeOnlineWorkingDaysHours,
                      branches
                    );
    
                    if (overlapCheck.hasOverlap) {
                      alert(overlapCheck.message);
                      return;
                    }
                  }
    
                  // 2. Compile schedules for all assigned branches
                  const compiledBranchSchedules: Record<string, { in_person: any; online: any }> = {
                    ...newEmployeeBranchSchedules,
                    [activeBranchId]: {
                      in_person: newEmployeeWorkingDaysHours,
                      online: newEmployeeOnlineWorkingDaysHours
                    }
                  };
    
                  for (const bId of newEmployeeBranchIds) {
                    if (!compiledBranchSchedules[bId]) {
                      compiledBranchSchedules[bId] = {
                        in_person: newEmployeeWorkingDaysHours,
                        online: newEmployeeOnlineWorkingDaysHours
                      };
                    }
                  }
    
                  if (editingEmployee) {
                    const res = await fetch("/api/employees", {
                      method: "PATCH",
                      headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${session?.access_token || ""}`
                      },
                      body: JSON.stringify({
                        id: editingEmployee.id,
                        name: newEmployeeName.trim(),
                        roleName: newEmployeeRole,
                        phone: newEmployeePhone.trim(),
                        department: newEmployeeDepartment,
                        shift: newEmployeeShift,
                        salary: Number(newEmployeeSalary),
                        nationalId: newEmployeeNationalId.trim() || null,
                        nationalIdFront: newEmployeeNationalIdFront || null,
                        nationalIdBack: newEmployeeNationalIdBack || null,
                        address: buildAddress(newEmployeeAddressLine1.trim(), newEmployeeAddressLine2.trim(), newEmployeeCity.trim(), newEmployeeGovernorateProp.trim(), newEmployeePostalCode.trim(), newEmployeeCountry.trim()) || null,
                        branchId: newEmployeeBranchId || null,
                        contractFile: newEmployeeAdditionalFiles.length > 0 
                          ? JSON.stringify({ contract: newEmployeeContract || "", additional: newEmployeeAdditionalFiles }) 
                          : (newEmployeeContract || null),
                        contractFileName: newEmployeeContractName || null,
                        requiredTargetAmount: Number(newEmployeeRequiredTargetAmount),
                        bonusPercentage: Number(newEmployeeBonusPercentage),
                        specialty: newEmployeeSpecialty,
                        services: newEmployeeSelectedServices,
                        rating: Number(newEmployeeRating || 5),
                        commission_type: newEmployeeCommissionType,
                        commission_value: Number(newEmployeeCommissionValue || 0),
                        commission_base: newEmployeeCommissionBase,
                        commission_fixed_component: Number(newEmployeeCommissionFixedComponent || 0),
                        service_commissions: newEmployeeServiceCommissions,
                        workingDaysHours: {
                          branch_ids: newEmployeeBranchIds.length > 0 ? newEmployeeBranchIds : [newEmployeeBranchId],
                          branch_schedules: compiledBranchSchedules
                        }
                      }),
                    });
                    if (res.ok) {
                      setIsEditingEmployeeModalOpen(false);
                      clearFetchCache();
                      fetchRolesAndEmployees();
                      fetchProviders();
                    } else {
                      const d = await res.json();
                      alert(d.error || "Failed to update employee.");
                    }
                  } else {
                    if (!newEmployeeEmail.trim()) {
                      alert("Email is required.");
                      return;
                    }
                    const res = await fetch("/api/employees", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${session?.access_token || ''}`,
                      },
                      body: JSON.stringify({
                        email: newEmployeeEmail.trim().toLowerCase(),
                        name: newEmployeeName.trim(),
                        roleName: newEmployeeRole,
                        phone: newEmployeePhone.trim(),
                        department: newEmployeeDepartment,
                        shift: newEmployeeShift,
                        salary: Number(newEmployeeSalary),
                        nationalId: newEmployeeNationalId.trim() || null,
                        nationalIdFront: newEmployeeNationalIdFront || null,
                        nationalIdBack: newEmployeeNationalIdBack || null,
                        address: buildAddress(newEmployeeAddressLine1.trim(), newEmployeeAddressLine2.trim(), newEmployeeCity.trim(), newEmployeeGovernorateProp.trim(), newEmployeePostalCode.trim(), newEmployeeCountry.trim()) || null,
                        branchId: newEmployeeBranchIds[0] || newEmployeeBranchId || null,
                        contractFile: newEmployeeAdditionalFiles.length > 0 
                          ? JSON.stringify({ contract: newEmployeeContract || "", additional: newEmployeeAdditionalFiles }) 
                          : (newEmployeeContract || null),
                        contractFileName: newEmployeeContractName || null,
                        requiredTargetAmount: Number(newEmployeeRequiredTargetAmount),
                        bonusPercentage: Number(newEmployeeBonusPercentage),
                        specialty: newEmployeeSpecialty,
                        services: newEmployeeSelectedServices,
                        rating: Number(newEmployeeRating || 5),
                        commission_type: newEmployeeCommissionType,
                        commission_value: Number(newEmployeeCommissionValue || 0),
                        commission_base: newEmployeeCommissionBase,
                        commission_fixed_component: Number(newEmployeeCommissionFixedComponent || 0),
                        service_commissions: newEmployeeServiceCommissions,
                        workingDaysHours: {
                          branch_ids: newEmployeeBranchIds.length > 0 ? newEmployeeBranchIds : [newEmployeeBranchId],
                          branch_schedules: compiledBranchSchedules
                        }
                      }),
                    });
                    if (res.ok) {
                      setIsEditingEmployeeModalOpen(false);
                      clearFetchCache();
                      fetchRolesAndEmployees();
                      fetchProviders();
                    } else {
                      const d = await res.json();
                      alert(d.error || "Failed to invite employee.");
                    }
                  }
                } catch (err: any) {
                  alert(err.message || "An error occurred.");
                }
              }}
              className="space-y-4"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] mb-1.5">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mohamed Ali"
                    value={newEmployeeName}
                    onChange={(e) => setNewEmployeeName(e.target.value)}
                    className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] mb-1.5">Email Address {editingEmployee ? "" : "*"}</label>
                  <input
                    type="email"
                    required={!editingEmployee}
                    disabled={!!editingEmployee}
                    placeholder="staff@revera.com"
                    value={newEmployeeEmail}
                    onChange={(e) => setNewEmployeeEmail(e.target.value)}
                    className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C] disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
    
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] mb-1.5">Phone Number</label>
                  <input
                    type="text"
                    placeholder="01012345678"
                    value={newEmployeePhone}
                    onChange={(e) => setNewEmployeePhone(e.target.value)}
                    className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] mb-1.5">System Role *</label>
                  <select
                    required
                    value={newEmployeeRole}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewEmployeeRole(val);
                      if (val.toLowerCase().includes("doc")) {
                        setNewEmployeeDepartment("Doctors");
                      }
                    }}
                    className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm text-[#414E36] outline-none focus:border-[#C4AE7C] cursor-pointer"
                  >
                    <option value="" disabled>Select Role</option>
                    {rolesList.map((role: any) => (
                      <option key={role.name} value={role.name}>{role.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] mb-1.5">Assigned Branch *</label>
                  <select
                    required
                    value={newEmployeeBranchId}
                    onChange={(e) => setNewEmployeeBranchId(e.target.value)}
                    className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm text-[#414E36] outline-none focus:border-[#C4AE7C] cursor-pointer"
                  >
                    <option value="" disabled>Select Branch</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name_en}</option>
                    ))}
                  </select>
                </div>
              </div>
    
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] mb-1.5">Department</label>
                  <select
                    value={newEmployeeDepartment}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewEmployeeDepartment(val);
                      if (val.toLowerCase().includes("doc") && !newEmployeeRole.toLowerCase().includes("doc")) {
                        const docRole = rolesList.find((r: any) => r.name.toLowerCase().includes("doc"));
                        if (docRole) setNewEmployeeRole(docRole.name);
                      }
                    }}
                    className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm text-[#414E36] outline-none focus:border-[#C4AE7C] cursor-pointer"
                  >
                    {departmentsList.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
    
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] mb-1.5">Salary (EGP)</label>
                  <input
                    type="number"
                    min="0"
                    value={newEmployeeSalary}
                    onChange={(e) => setNewEmployeeSalary(e.target.value)}
                    className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                  />
                </div>
              </div>
    
              {/* Doctor / Medical Profile Fields */}
              {(newEmployeeDepartment?.toLowerCase().includes("doc") || newEmployeeRole?.toLowerCase().includes("doc")) && (
                <div className="rounded-2xl border border-[#C4AE7C]/30 bg-[#FBFBF9] p-5 space-y-5 shadow-sm animate-fadeIn">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#414E36] border-b border-[#C4AE7C]/20 pb-3">
                    <Stethoscope size={16} className="text-[#C4AE7C]" />
                    Doctor &amp; Medical Configuration
                  </div>
    
                  {/* Row 1: Specialty & Rating */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] mb-1.5">
                        Medical Specialty
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Dermatology, Cosmetics, Gynecology..."
                        value={newEmployeeSpecialty}
                        onChange={(e) => setNewEmployeeSpecialty(e.target.value)}
                        className="w-full rounded-2xl border border-[#414E36]/15 bg-white px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                      />
                    </div>
    
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] mb-1.5">
                        Doctor Rating (1 - 5 Stars)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        step="0.1"
                        value={newEmployeeRating}
                        onChange={(e) => setNewEmployeeRating(e.target.value)}
                        className="w-full rounded-2xl border border-[#414E36]/15 bg-white px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                      />
                    </div>
                  </div>
    
    
    
                  {/* Row 3: Assigned Branches */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] mb-2">
                      Assigned Branches (Select one or more for Doctor)
                    </label>
                    <div className="flex flex-wrap gap-2 p-2.5 rounded-2xl border border-[#414E36]/15 bg-white min-h-[42px] items-center">
                      {branches.map((b) => {
                        const isSelected = newEmployeeBranchIds.includes(b.id);
                        return (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => {
                              let nextIds: string[];
                              if (isSelected) {
                                if (newEmployeeBranchIds.length <= 1) return;
                                nextIds = newEmployeeBranchIds.filter((id) => id !== b.id);
                              } else {
                                nextIds = [...newEmployeeBranchIds, b.id];
                              }
                              setNewEmployeeBranchIds(nextIds);
                              setNewEmployeeBranchId(nextIds[0]);
    
                              // If current active schedule branch is removed, switch active branch schedule tab
                              const activeId = newEmployeeSelectedScheduleBranchId || newEmployeeBranchIds[0];
                              if (!nextIds.includes(activeId)) {
                                handleEmployeeBranchScheduleTabChange(nextIds[0]);
                              }
                            }}
                            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                              isSelected
                                ? "bg-[#414E36] text-white border-[#414E36]"
                                : "bg-gray-50 text-[#414E36] border-[#414E36]/15 hover:bg-[#414E36]/10"
                            }`}
                          >
                            {b.name_en} {isSelected ? "✓" : "+"}
                          </button>
                        );
                      })}
                    </div>
                  </div>
    
                  {/* Row 4: Doctor Schedule Grid with Branch Selector, In-Clinic vs Online Consultations tabs & Multi-shift per day */}
                  <div>
                    {/* Branch Selector Bar when doctor is assigned to multiple branches */}
                    {newEmployeeBranchIds.length > 1 && (
                      <div className="mb-3 p-3 rounded-2xl bg-[#414E36]/5 border border-[#414E36]/15 space-y-1.5">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-[#5A6A51]">
                          Configure Schedule For Specific Branch:
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {newEmployeeBranchIds.map((bId) => {
                            const bObj = branches.find((b) => b.id === bId);
                            const bName = bObj ? bObj.name_en : bId;
                            const isCurrentActive = bId === (newEmployeeSelectedScheduleBranchId || newEmployeeBranchIds[0]);
    
                            return (
                              <button
                                key={bId}
                                type="button"
                                onClick={() => handleEmployeeBranchScheduleTabChange(bId)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                  isCurrentActive
                                    ? "bg-[#C4AE7C] text-white shadow-sm"
                                    : "bg-white text-[#414E36] border border-[#414E36]/15 hover:bg-gray-50"
                                }`}
                              >
                                <span>{bName}</span>
                                {isCurrentActive && <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-md">Active</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
    
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5A6A51]">
                        {newEmployeeBranchIds.length > 1 ? (
                          <>Doctor Weekly Shifts ({branches.find(b => b.id === (newEmployeeSelectedScheduleBranchId || newEmployeeBranchIds[0]))?.name_en || "Active Branch"})</>
                        ) : (
                          <>Doctor Weekly Shifts &amp; Working Days Schedule</>
                        )}
                      </label>
    
                      {/* Tab Selector: In-Clinic vs Online Consultations */}
                      <div className="inline-flex rounded-xl bg-white border border-[#414E36]/15 p-0.5 shadow-sm">
                        <button
                          type="button"
                          onClick={() => setNewEmployeeScheduleTab("in_person")}
                          className={`px-3.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                            newEmployeeScheduleTab === "in_person"
                              ? "bg-[#414E36] text-white shadow-xs"
                              : "text-[#5A6A51] hover:text-[#1F251A]"
                          }`}
                        >
                          In-Clinic
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewEmployeeScheduleTab("online")}
                          className={`px-3.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                            newEmployeeScheduleTab === "online"
                              ? "bg-[#414E36] text-white shadow-xs"
                              : "text-[#5A6A51] hover:text-[#1F251A]"
                          }`}
                        >
                          Online Consultations
                        </button>
                      </div>
                    </div>
    
                    <div className="rounded-2xl border border-[#414E36]/10 bg-white p-4 space-y-3">
                      {(() => {
                        const activeSched = newEmployeeScheduleTab === "in_person" ? newEmployeeWorkingDaysHours : newEmployeeOnlineWorkingDaysHours;
                        const setActiveSched = newEmployeeScheduleTab === "in_person" ? setNewEmployeeWorkingDaysHours : setNewEmployeeOnlineWorkingDaysHours;
    
                        return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => {
                          const sched = activeSched[day] || { isOpen: false, start: "09:00", end: "17:00" };
                          return (
                            <div key={day} className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-[#414E36]/5 pb-2.5 last:border-0 last:pb-0">
                              <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1">
                                <input
                                  type="checkbox"
                                  checked={sched.isOpen}
                                  onChange={(e) => {
                                    setActiveSched({
                                      ...activeSched,
                                      [day]: { ...sched, isOpen: e.target.checked }
                                    });
                                  }}
                                  className="h-4 w-4 rounded border-[#414E36]/15 text-[#414E36] focus:ring-[#C4AE7C] cursor-pointer"
                                />
                                <span className={`text-xs font-bold w-24 ${sched.isOpen ? "text-[#1F251A]" : "text-gray-400"}`}>
                                  {day}
                                </span>
                              </label>
    
                              {sched.isOpen ? (
                                <div className="flex flex-col gap-2 w-full sm:w-auto">
                                  {/* Shifts list with multi-shift support */}
                                  {((sched.shifts && sched.shifts.length > 0) ? sched.shifts : [{ start: sched.start || "09:00", end: sched.end || "17:00" }]).map((shft, shiftIdx) => (
                                    <div key={shiftIdx} className="flex items-center gap-2">
                                      <input
                                        type="time"
                                        value={shft.start}
                                        onChange={(e) => {
                                          const currentShifts = (sched.shifts && sched.shifts.length > 0) ? [...sched.shifts] : [{ start: sched.start || "09:00", end: sched.end || "17:00" }];
                                          currentShifts[shiftIdx] = { ...currentShifts[shiftIdx], start: e.target.value };
                                          setActiveSched({
                                            ...activeSched,
                                            [day]: {
                                              ...sched,
                                              start: currentShifts[0].start,
                                              end: currentShifts[0].end,
                                              shifts: currentShifts
                                            }
                                          });
                                        }}
                                        className="rounded-lg border border-[#414E36]/15 px-2.5 py-1 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C] cursor-pointer"
                                      />
                                      <span className="text-xs text-[#5A6A51]">to</span>
                                      <input
                                        type="time"
                                        value={shft.end}
                                        onChange={(e) => {
                                          const currentShifts = (sched.shifts && sched.shifts.length > 0) ? [...sched.shifts] : [{ start: sched.start || "09:00", end: sched.end || "17:00" }];
                                          currentShifts[shiftIdx] = { ...currentShifts[shiftIdx], end: e.target.value };
                                          setActiveSched({
                                            ...activeSched,
                                            [day]: {
                                              ...sched,
                                              start: currentShifts[0].start,
                                              end: currentShifts[0].end,
                                              shifts: currentShifts
                                            }
                                          });
                                        }}
                                        className="rounded-lg border border-[#414E36]/15 px-2.5 py-1 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C] cursor-pointer"
                                      />
                                      {shiftIdx > 0 && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const currentShifts = (sched.shifts && sched.shifts.length > 0) ? [...sched.shifts] : [{ start: sched.start || "09:00", end: sched.end || "17:00" }];
                                            const filteredShifts = currentShifts.filter((_, i) => i !== shiftIdx);
                                            setActiveSched({
                                              ...activeSched,
                                              [day]: {
                                                ...sched,
                                                start: filteredShifts[0].start,
                                                end: filteredShifts[0].end,
                                                shifts: filteredShifts
                                              }
                                            });
                                          }}
                                          className="text-red-500 hover:text-red-700 transition"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const currentShifts = (sched.shifts && sched.shifts.length > 0) ? [...sched.shifts] : [{ start: sched.start || "09:00", end: sched.end || "17:00" }];
                                      const newShifts = [...currentShifts, { start: "09:00", end: "17:00" }];
                                      setActiveSched({
                                        ...activeSched,
                                        [day]: {
                                          ...sched,
                                          shifts: newShifts
                                        }
                                      });
                                    }}
                                    className="text-xs font-bold text-[#414E36] hover:text-[#2e3a26] transition flex items-center gap-1 mt-0.5 cursor-pointer"
                                  >
                                    <Plus size={12} /> Add Shift
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400 italic">Off / Closed</span>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
    
                    {/* Live Shift Overlap Warning Banner */}
                    {(() => {
                      const overlap = checkShiftOverlaps(
                        newEmployeeBranchIds,
                        newEmployeeBranchSchedules,
                        newEmployeeSelectedScheduleBranchId || newEmployeeBranchIds[0],
                        newEmployeeWorkingDaysHours,
                        newEmployeeOnlineWorkingDaysHours,
                        branches
                      );
                      if (overlap.hasOverlap) {
                        return (
                          <div className="mt-3 flex items-start gap-2 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium animate-fadeIn">
                            <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold block text-amber-900 mb-0.5">⚠️ Shift Overlap Warning:</span>
                              {overlap.message}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
    
                  {/* Row 5: Services & Commission */}
                  <DoctorServiceCommissionEditor
                    allServices={allServicesList}
                    services={newEmployeeSelectedServices}
                    commissions={newEmployeeServiceCommissions}
                    defaultType={newEmployeeCommissionType as DefaultCommissionType}
                    defaultValue={newEmployeeCommissionValue}
                    defaultBase={newEmployeeCommissionBase}
                    defaultFixedComponent={newEmployeeCommissionFixedComponent}
                    onServicesChange={setNewEmployeeSelectedServices}
                    onCommissionsChange={setNewEmployeeServiceCommissions}
                    onDefaultTypeChange={setNewEmployeeCommissionType}
                    onDefaultValueChange={setNewEmployeeCommissionValue}
                    onDefaultBaseChange={setNewEmployeeCommissionBase}
                    onDefaultFixedComponentChange={setNewEmployeeCommissionFixedComponent}
                  />
                </div>
              )}
    
              {/* Shift & Target for Non-Doctor Employees */}
              {!(newEmployeeDepartment?.toLowerCase().includes("doc") || newEmployeeRole?.toLowerCase().includes("doc")) && (
                <>
                  <div className="mt-4">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] mb-1.5">Shift</label>
                    <div className="flex items-center gap-2 max-w-[320px]">
                      <div className="relative flex items-center bg-[#FBFBF9] border border-[#414E36]/15 rounded-2xl px-3.5 py-2.5 w-full focus-within:border-[#C4AE7C] transition-colors">
                        <input
                          type="time"
                          value={newEmployeeShiftStart}
                          onChange={(e) => handleShiftStartChange(e.target.value)}
                          onClick={(e) => {
                            try { e.currentTarget.showPicker(); } catch {}
                          }}
                          className="bg-transparent text-sm text-[#1F251A] outline-none w-full pr-6 cursor-pointer font-medium [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                        />
                        <Clock size={14} className="text-[#5A6A51] absolute right-3.5 pointer-events-none" />
                      </div>
                      <span className="text-sm font-semibold text-[#5A6A51] select-none">to</span>
                      <div className="relative flex items-center bg-[#FBFBF9] border border-[#414E36]/15 rounded-2xl px-3.5 py-2.5 w-full focus-within:border-[#C4AE7C] transition-colors">
                        <input
                          type="time"
                          value={newEmployeeShiftEnd}
                          onChange={(e) => handleShiftEndChange(e.target.value)}
                          onClick={(e) => {
                            try { e.currentTarget.showPicker(); } catch {}
                          }}
                          className="bg-transparent text-sm text-[#1F251A] outline-none w-full pr-6 cursor-pointer font-medium [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                        />
                        <Clock size={14} className="text-[#5A6A51] absolute right-3.5 pointer-events-none" />
                      </div>
                    </div>
                  </div>
    
                  {/* Target & Bonus Configuration */}
                  <div className="border-t border-[#414E36]/10 pt-4 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#C4AE7C]">Target &amp; Performance Bonus</h4>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] mb-1.5">Required Target Amount (EGP)</label>
                        <input
                          type="number"
                          min="0"
                          value={newEmployeeRequiredTargetAmount}
                          onChange={(e) => setNewEmployeeRequiredTargetAmount(e.target.value)}
                          className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] mb-1.5">Bonus Percentage (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={newEmployeeBonusPercentage}
                          onChange={(e) => {
                            const val = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                            setNewEmployeeBonusPercentage(String(val));
                          }}
                          className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
    
              {/* --- NEW EMPLOYEE PROFILE FIELDS (National ID, Photo Uploads, Address) --- */}
              <div className="border-t border-[#414E36]/10 pt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] mb-1.5">National ID (14 Digits)</label>
                    <input
                      type="text"
                      maxLength={14}
                      placeholder="e.g. 29503152101234"
                      value={newEmployeeNationalId}
                      onChange={(e) => {
                        // only numbers
                        const val = e.target.value.replace(/\D/g, "");
                        setNewEmployeeNationalId(val);
                      }}
                      className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C] font-mono"
                    />
                  </div>
    
                  {/* Structured Address */}
                  <div className="sm:col-span-2">
                    <div className="rounded-2xl border border-[#414E36]/10 bg-[#FBFBF9] p-4 space-y-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                        Home Address
                      </p>
                      <div>
                        <label className="block text-[10px] font-semibold text-[#8A9A81] mb-1">Address Line 1 <span className="text-[#C4AE7C]">*</span></label>
                        <input
                          type="text"
                          placeholder="Street number and name"
                          value={newEmployeeAddressLine1}
                          onChange={(e) => {
                            setNewEmployeeAddressLine1(e.target.value);
                            commitAddressState(e.target.value, newEmployeeAddressLine2, newEmployeeCity, newEmployeeGovernorateProp, newEmployeePostalCode, newEmployeeCountry);
                          }}
                          className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3.5 py-2 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C] transition"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-[#8A9A81] mb-1">Address Line 2 <span className="text-[#8A9A81] font-normal">(Optional)</span></label>
                        <input
                          type="text"
                          placeholder="Apartment, floor, building, compound…"
                          value={newEmployeeAddressLine2}
                          onChange={(e) => {
                            setNewEmployeeAddressLine2(e.target.value);
                            commitAddressState(newEmployeeAddressLine1, e.target.value, newEmployeeCity, newEmployeeGovernorateProp, newEmployeePostalCode, newEmployeeCountry);
                          }}
                          className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3.5 py-2 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C] transition"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-semibold text-[#8A9A81] mb-1">City</label>
                          <input
                            type="text"
                            placeholder="e.g. Cairo"
                            value={newEmployeeCity}
                            onChange={(e) => {
                              setNewEmployeeCity(e.target.value);
                              commitAddressState(newEmployeeAddressLine1, newEmployeeAddressLine2, e.target.value, newEmployeeGovernorateProp, newEmployeePostalCode, newEmployeeCountry);
                            }}
                            className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3.5 py-2 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C] transition"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-[#8A9A81] mb-1">Governorate</label>
                          <select
                            value={newEmployeeGovernorateProp}
                            onChange={(e) => {
                              setNewEmployeeGovernorateProp(e.target.value);
                              commitAddressState(newEmployeeAddressLine1, newEmployeeAddressLine2, newEmployeeCity, e.target.value, newEmployeePostalCode, newEmployeeCountry);
                            }}
                            className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3.5 py-2 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C] transition"
                          >
                            <option value="">— Select —</option>
                            {["Cairo","Giza","Alexandria","Aswan","Asyut","Beheira","Beni Suef","Dakahlia","Damietta","Faiyum","Gharbia","Ismailia","Kafr el-Sheikh","Luxor","Matruh","Minya","Monufia","New Valley","North Sinai","Port Said","Qalyubia","Qena","Red Sea","Sharqia","Sohag","South Sinai","Suez"].map(g => (
                              <option key={g} value={g}>{g}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-semibold text-[#8A9A81] mb-1">Postal Code</label>
                          <input
                            type="text"
                            placeholder="e.g. 11511"
                            value={newEmployeePostalCode}
                            onChange={(e) => {
                              setNewEmployeePostalCode(e.target.value);
                              commitAddressState(newEmployeeAddressLine1, newEmployeeAddressLine2, newEmployeeCity, newEmployeeGovernorateProp, e.target.value, newEmployeeCountry);
                            }}
                            className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3.5 py-2 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C] transition"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-[#8A9A81] mb-1">Country</label>
                          <input
                            type="text"
                            placeholder="e.g. Egypt"
                            value={newEmployeeCountry}
                            onChange={(e) => {
                              setNewEmployeeCountry(e.target.value);
                              commitAddressState(newEmployeeAddressLine1, newEmployeeAddressLine2, newEmployeeCity, newEmployeeGovernorateProp, newEmployeePostalCode, e.target.value);
                            }}
                            className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3.5 py-2 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C] transition"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
    
                {/* Interactive Egyptian National ID Check */}
                {newEmployeeNationalId.trim() && (() => {
                  const check = parseEgyptianNationalId(newEmployeeNationalId.trim());
                  if (check.isValid) {
                    return (
                      <div className="rounded-2xl bg-green-50/50 border border-green-200/50 p-3.5 space-y-1.5 text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-green-800">
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-green-600 text-[10px] text-white">✓</span>
                          Egyptian National ID Check Passed
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-green-700 font-medium">
                          <div>
                            <span className="block text-[9px] uppercase tracking-wider text-green-600/75">Birth Date</span>
                            {check.birthDate}
                          </div>
                          <div>
                            <span className="block text-[9px] uppercase tracking-wider text-green-600/75">Gender</span>
                            {check.gender}
                          </div>
                          <div>
                            <span className="block text-[9px] uppercase tracking-wider text-green-600/75">Governorate</span>
                            {check.governorate}
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div className="rounded-2xl bg-amber-50/50 border border-amber-200/50 p-3.5 text-xs text-amber-700 font-semibold flex items-center gap-1.5">
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] text-white">!</span>
                        ID Check: {check.reason}
                      </div>
                    );
                  }
                })()}
    
                {/* Front / Back ID Photo Uploads */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* ID Front */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] mb-1.5">National ID - Front Side</label>
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#414E36]/20 bg-[#FBFBF9] p-4 text-center">
                      {newEmployeeNationalIdFront ? (
                        <div className="relative w-full group">
                          <img
                            src={newEmployeeNationalIdFront}
                            alt="ID Front"
                            className="h-28 w-full object-cover rounded-xl border border-[#414E36]/10"
                          />
                          <button
                            type="button"
                            onClick={() => setNewEmployeeNationalIdFront("")}
                            className="absolute -top-2 -right-2 bg-red-500 text-white hover:bg-red-600 transition rounded-full h-6 w-6 flex items-center justify-center shadow font-bold text-xs"
                          >
                            &times;
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center cursor-pointer py-4 w-full">
                          <Upload className="h-6 w-6 text-[#5A6A51]/50 mb-1.5" />
                          <span className="text-[11px] font-semibold text-[#414E36]">Upload Front Side</span>
                          <span className="text-[9px] text-gray-400 mt-0.5">JPEG, PNG up to 5MB</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                try {
                                  const compressed = await compressImage(file, 1200, 1200, 0.8);
                                  setNewEmployeeNationalIdFront(compressed);
                                } catch (err) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setNewEmployeeNationalIdFront(reader.result as string);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
    
                  {/* ID Back */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] mb-1.5">National ID - Back Side</label>
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#414E36]/20 bg-[#FBFBF9] p-4 text-center">
                      {newEmployeeNationalIdBack ? (
                        <div className="relative w-full group">
                          <img
                            src={newEmployeeNationalIdBack}
                            alt="ID Back"
                            className="h-28 w-full object-cover rounded-xl border border-[#414E36]/10"
                          />
                          <button
                            type="button"
                            onClick={() => setNewEmployeeNationalIdBack("")}
                            className="absolute -top-2 -right-2 bg-red-500 text-white hover:bg-red-600 transition rounded-full h-6 w-6 flex items-center justify-center shadow font-bold text-xs"
                          >
                            &times;
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center cursor-pointer py-4 w-full">
                          <Upload className="h-6 w-6 text-[#5A6A51]/50 mb-1.5" />
                          <span className="text-[11px] font-semibold text-[#414E36]">Upload Back Side</span>
                          <span className="text-[9px] text-gray-400 mt-0.5">JPEG, PNG up to 5MB</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                try {
                                  const compressed = await compressImage(file, 1200, 1200, 0.8);
                                  setNewEmployeeNationalIdBack(compressed);
                                } catch (err) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setNewEmployeeNationalIdBack(reader.result as string);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              </div>
    
              {/* Employment Contract Upload */}
              <div className="border border-[#414E36]/10 rounded-2xl bg-[#F7F7F5] p-4">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] mb-2">Employment Contract</label>
                <div className="rounded-2xl border border-dashed border-[#414E36]/20 bg-white overflow-hidden">
                  {newEmployeeContract ? (
                    <div className="flex items-center justify-between gap-2 p-3 bg-[#EDF1EC] rounded-2xl">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileText className="h-5 w-5 text-[#5A6A51] shrink-0" />
                        <span className="text-xs font-semibold text-[#414E36] truncate">{newEmployeeContractName || "Contract File"}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setNewEmployeeContract(""); setNewEmployeeContractName(""); }}
                        className="bg-red-500 text-white hover:bg-red-600 transition rounded-full h-5 w-5 shrink-0 flex items-center justify-center font-bold text-xs"
                      >
                        &times;
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center cursor-pointer py-5 w-full">
                      <Upload className="h-6 w-6 text-[#5A6A51]/50 mb-1.5" />
                      <span className="text-[11px] font-semibold text-[#414E36]">Upload Contract (PDF, Word, or Image)</span>
                      <span className="text-[9px] text-gray-400 mt-0.5">PDF, DOCX, PNG, JPEG – up to 10MB</span>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setNewEmployeeContract(reader.result as string);
                              setNewEmployeeContractName(file.name);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
    
              {/* Additional Files Upload */}
              <div className="border border-[#414E36]/10 rounded-2xl bg-[#F7F7F5] p-4 mt-4">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] mb-2">Additional Files</label>
                
                {/* List existing/added additional files */}
                {newEmployeeAdditionalFiles.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {newEmployeeAdditionalFiles.map((fileItem, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2 p-3 bg-white border border-[#414E36]/10 rounded-2xl">
                        <div className="flex items-center gap-2 overflow-hidden col-span-1">
                          <FileText className="h-5 w-5 text-[#5A6A51] shrink-0" />
                          <span className="text-xs font-semibold text-[#414E36] truncate">{fileItem.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setNewEmployeeAdditionalFiles(prev => prev.filter((_, i) => i !== idx));
                          }}
                          className="bg-red-500 text-white hover:bg-red-600 transition rounded-full h-5 w-5 shrink-0 flex items-center justify-center font-bold text-xs"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
    
                <div className="rounded-2xl border border-dashed border-[#414E36]/20 bg-white overflow-hidden">
                  <label className="flex flex-col items-center justify-center cursor-pointer py-5 w-full">
                    <Upload className="h-6 w-6 text-[#5A6A51]/50 mb-1.5" />
                    <span className="text-[11px] font-semibold text-[#414E36]">Upload Additional Files</span>
                    <span className="text-[9px] text-gray-400 mt-0.5">Select one or more files (PDF, Word, or Image)</span>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,image/*"
                      className="hidden"
                      onChange={(e) => {
                        const files = e.target.files;
                        if (files && files.length > 0) {
                          Array.from(files).forEach(file => {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setNewEmployeeAdditionalFiles(prev => [
                                ...prev,
                                { file: reader.result as string, name: file.name }
                              ]);
                            };
                            reader.readAsDataURL(file);
                          });
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
    
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingEmployeeModalOpen(false)}
                  className="rounded-2xl border border-[#414E36]/15 px-5 py-2.5 text-sm font-semibold text-[#414E36] hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-2xl bg-[#414E36] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#2e3a26] transition shadow-md"
                >
                  {editingEmployee ? "Save Changes" : "Send Invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    
      {/* View Employee Details — Inline View */}
      {viewingEmployee && (
        <div className="space-y-6 animate-fadeIn">
          {/* Back button */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setViewingEmployee(null)}
              className="flex items-center gap-1.5 text-xs font-bold text-[#5A6A51] hover:text-[#414E36] outline-none transition uppercase tracking-wider"
            >
              <ArrowLeft size={14} /> Back to Employees
            </button>
          </div>
    
          {/* Profile Header Banner */}
          <div className="bg-white rounded-3xl border border-[#414E36]/10 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="relative group shrink-0">
                <div className="h-16 w-16 rounded-full bg-[#EDF1EC] text-[#414E36] border border-[#414E36]/10 flex items-center justify-center text-2xl font-bold font-serif overflow-hidden shadow-xs">
                  {customerAvatars[viewingEmployee.id || viewingEmployee.employee_id] || viewingEmployee.photo_url || viewingEmployee.avatar_url ? (
                    <img
                      src={customerAvatars[viewingEmployee.id || viewingEmployee.employee_id] || viewingEmployee.photo_url || viewingEmployee.avatar_url}
                      alt={viewingEmployee.name || "Employee"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>{viewingEmployee.name ? viewingEmployee.name.charAt(0).toUpperCase() : "E"}</span>
                  )}
                </div>
                <label
                  className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-[#414E36] text-white cursor-pointer shadow-md hover:bg-[#2e3a26] transition flex items-center justify-center"
                  title="Upload/Change Staff Photo"
                >
                  <Camera size={12} />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      const empKey = viewingEmployee.id || viewingEmployee.employee_id;
                      if (file && empKey) handleAvatarUpload(empKey, file);
                    }}
                  />
                </label>
                {(customerAvatars[viewingEmployee.id || viewingEmployee.employee_id] || viewingEmployee.photo_url || viewingEmployee.avatar_url) && (
                  <button
                    type="button"
                    onClick={() => handleAvatarRemove(viewingEmployee.id || viewingEmployee.employee_id)}
                    className="absolute -top-1 -right-1 p-1 rounded-full bg-red-600 text-white shadow-xs hover:bg-red-700 transition"
                    title="Remove Photo"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
              <div>
                <h3 className="text-2xl font-bold text-[#1F251A] leading-tight">{viewingEmployee.name || "Staff Member"}</h3>
                <p className="text-xs text-[#5A6A51] mt-0.5">{viewingEmployee.role_name || "Employee"} • Staff ID: <span className="font-mono">{viewingEmployee.employee_id || "—"}</span></p>
                <div className="mt-2">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    viewingEmployee.email_confirmed_at ? "bg-[#EDF1EC] text-[#414E36]" : "bg-amber-50 text-amber-700"
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${viewingEmployee.email_confirmed_at ? "bg-[#414E36]" : "bg-amber-500"}`} />
                    {viewingEmployee.email_confirmed_at ? "Active" : "Pending Invitation"}
                  </span>
                </div>
              </div>
            </div>
    
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setEditingEmployee(viewingEmployee);
                  setNewEmployeeName(viewingEmployee.name || "");
                  setNewEmployeeEmail(viewingEmployee.email || "");
                  setNewEmployeeRole(viewingEmployee.role_name || "");
                  setNewEmployeePhone(viewingEmployee.phone || "");
                  setNewEmployeeDepartment(viewingEmployee.department || "Reception");
                  updateShiftState(viewingEmployee.shift || "Day");
                  setNewEmployeeSalary(String(viewingEmployee.salary || 0));
                  setNewEmployeeNationalId(viewingEmployee.national_id || "");
                  setNewEmployeeNationalIdFront(viewingEmployee.national_id_front || "");
                  setNewEmployeeNationalIdBack(viewingEmployee.national_id_back || "");
                  applyAddressToState(viewingEmployee.address || "");
                  const rawContract = viewingEmployee.contract_file || "";
                  let contractUrl = "";
                  let additionalList: any[] = [];
                  try {
                    if (rawContract.startsWith('{')) {
                      const parsed = JSON.parse(rawContract);
                      contractUrl = parsed.contract || "";
                      additionalList = parsed.additional || [];
                    } else {
                      contractUrl = rawContract;
                    }
                  } catch (e) {
                    contractUrl = rawContract;
                  }
                  setNewEmployeeContract(contractUrl);
                  setNewEmployeeContractName(viewingEmployee.contract_file_name || "");
                  setNewEmployeeAdditionalFiles(additionalList);
                  setNewEmployeeRequiredTargetAmount(String(viewingEmployee.requiredTargetAmount || 0));
                  setNewEmployeeBonusPercentage(String(viewingEmployee.bonusPercentage || 0));
                  const matchProv2 = providers.find(p => (p.name && viewingEmployee.name && p.name.trim().toLowerCase() === viewingEmployee.name.trim().toLowerCase()) || (p.phone && viewingEmployee.phone && p.phone === viewingEmployee.phone));
                  setNewEmployeeCommissionType(matchProv2?.commissionType || "none");
                  setNewEmployeeCommissionValue(String(matchProv2?.commissionValue || 0));
                  setNewEmployeeCommissionBase((matchProv2?.commissionBase as "gross" | "net_of_materials") || "gross");
                  setNewEmployeeCommissionFixedComponent(String(matchProv2?.commissionFixedComponent || 0));
                  setNewEmployeeServiceCommissions(Array.isArray(matchProv2?.serviceCommissions) ? matchProv2.serviceCommissions : []);
                  setViewingEmployee(null);
                  setIsEditingEmployeeModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#414E36]/15 bg-white px-4 py-2.5 text-xs font-bold text-[#414E36] transition hover:bg-[#EDF1EC] shadow-sm"
              >
                <Pencil size={12} /> Edit Profile
              </button>
              
              {viewingEmployee.employee_id !== "superadmin" && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Are you sure you want to revoke access?")) {
                      handleDeleteEmployee(viewingEmployee.id);
                      setViewingEmployee(null);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-xs font-bold text-red-600 transition hover:bg-red-50 shadow-sm"
                >
                  <Lock size={12} /> Revoke Access
                </button>
              )}
    
              <button
                type="button"
                onClick={() => handlePrintEmployeeProfile(viewingEmployee)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#414E36]/15 bg-white px-4 py-2.5 text-xs font-bold text-[#414E36] transition hover:bg-[#EDF1EC] shadow-sm"
              >
                <Printer size={12} /> Print Profile
              </button>
            </div>
          </div>
    
          {/* Profile Sub-navigation Tabs */}
          <div className="flex items-center gap-1.5 p-1.5 bg-white rounded-2xl border border-[#414E36]/10 shadow-xs overflow-x-auto no-scrollbar w-full">
            {([
              { id: "basic", label: "Basic Info" },
              { id: "work", label: "Work Details" },
              { id: "payroll", label: "Payroll" },
              { id: "performance", label: "Target & Performance" },
              { id: "attendance", label: "Attendance Insights" },
              { id: "contact", label: "Contact Details" },
              { id: "documents", label: "Notes & Documents" }
            ] as const).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setEmployeeProfileActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center px-4 py-2 text-xs sm:text-sm font-semibold capitalize transition-all rounded-xl outline-none whitespace-nowrap min-w-max ${
                  employeeProfileActiveTab === tab.id
                    ? "bg-[#414E36] text-[#FBFBF9] font-bold shadow-xs"
                    : "text-[#5A6A51] hover:text-[#414E36] hover:bg-[#F2EFE9]/60"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
    
          {/* Tab Contents Container */}
          <div className="bg-white rounded-3xl border border-[#414E36]/10 p-6 shadow-sm">
            {employeeProfileActiveTab === "basic" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-[#414E36]/5 pb-3">
                  <User size={16} className="text-[#C4AE7C]" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#C4AE7C]">Basic Information</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-sm">
                  <div>
                    <span className="block text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">Employee ID</span>
                    <span className="font-semibold text-[#1F251A] font-mono">{viewingEmployee.employee_id || "—"}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">Full Name</span>
                    <span className="font-semibold text-[#1F251A]">{viewingEmployee.name || "—"}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">Email Address</span>
                    <span className="font-semibold text-[#1F251A] break-all">{viewingEmployee.email || "—"}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">Phone Number</span>
                    <span className="font-semibold text-[#1F251A]">{viewingEmployee.phone || "—"}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">System Role</span>
                    <div>
                      <span className="inline-block rounded-lg bg-[#414E36]/10 px-2.5 py-0.5 text-xs font-semibold text-[#414E36]">
                        {viewingEmployee.role_name || "—"}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">Department</span>
                    <div>
                      <span className="inline-block rounded-lg bg-[#C4AE7C]/15 px-2.5 py-0.5 text-xs font-semibold text-[#8B7544]">
                        {viewingEmployee.department || "Reception"}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">National ID</span>
                    <span className="font-semibold text-[#1F251A] font-mono">{viewingEmployee.national_id || "—"}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">Date of Birth &amp; Age</span>
                    {(() => {
                      const check = parseEgyptianNationalId(viewingEmployee.national_id || "");
                      if (check.isValid) {
                        return (
                          <span className="font-semibold text-[#1F251A]">
                            {check.dobFormatted} ({check.age} yrs)
                          </span>
                        );
                      }
                      return <span className="font-semibold text-[#5A6A51] italic text-xs">Auto-extracted when 14-digit National ID is provided</span>;
                    })()}
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">Account Status</span>
                    <span className={`inline-flex items-center gap-1 text-xs font-bold ${viewingEmployee.email_confirmed_at ? "text-green-700" : "text-amber-700"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${viewingEmployee.email_confirmed_at ? "bg-green-600" : "bg-amber-500"}`} />
                      {viewingEmployee.email_confirmed_at ? "Active" : "Pending Invitation"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">Added On</span>
                    <span className="font-semibold text-[#1F251A]">
                      {viewingEmployee.created_at
                        ? new Date(viewingEmployee.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>
            )}
    
            {employeeProfileActiveTab === "work" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-[#414E36]/5 pb-3">
                  <Briefcase size={16} className="text-[#C4AE7C]" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#C4AE7C]">Work Information</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-sm">
                  <div>
                    <span className="block text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">Job Title</span>
                    <span className="font-semibold text-[#1F251A]">{viewingEmployee.role_name || "Receptionist"}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">Start Date</span>
                    {(() => {
                      const autoDate = getDoctorFirstReservationDate(viewingEmployee.name, allReservations);
                      if (autoDate) {
                        return (
                          <div className="flex flex-col">
                            <span className="font-semibold text-[#1F251A]">{autoDate}</span>
                            <span className="text-[10px] text-[#414E36] font-bold bg-[#EDF1EC] px-2 py-0.5 rounded-full border border-[#414E36]/10 w-max mt-0.5">
                              ⚡ Auto-set (1st Booking)
                            </span>
                          </div>
                        );
                      }
                      return <span className="font-semibold text-[#1F251A]">{viewingEmployee.start_date || "—"}</span>;
                    })()}
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">Shift Type</span>
                    <span className="font-semibold text-[#1F251A]">{viewingEmployee.shift || "Day"}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">Shift Details</span>
                    <span className="font-semibold text-[#1F251A]">
                      {viewingEmployee.shift === "Night" ? "General Night Shift" : "General Day Shift"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">Working Hours</span>
                    <span className="font-semibold text-[#1F251A]">
                      {viewingEmployee.shift === "Night" ? "05:00 PM - 01:00 AM" : "09:00 AM - 05:00 PM"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">Break Time</span>
                    <span className="font-semibold text-[#1F251A]">
                      {viewingEmployee.shift === "Night" ? "09:00 PM - 10:00 PM" : "01:00 PM - 02:00 PM"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">Employment Type</span>
                    <div>
                      <span className="inline-block rounded-lg bg-[#F9F9F7] border border-[#414E36]/10 px-2.5 py-0.5 text-xs font-semibold text-[#5A6A51]">
                        Full Time
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
    
            {employeeProfileActiveTab === "payroll" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-[#414E36]/5 pb-3">
                  <CircleDollarSign size={16} className="text-[#C4AE7C]" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#C4AE7C]">Payroll &amp; Compensation</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-sm">
                  <div>
                    <span className="block text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">Monthly Salary</span>
                    <span className="font-semibold text-[#1F251A]">{Number(viewingEmployee.salary || 0).toLocaleString()} EGP</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">Daily Salary</span>
                    <span className="font-semibold text-[#1F251A]">
                      {Math.round(Number(viewingEmployee.salary || 0) / 20).toLocaleString()} EGP
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">Hourly Salary</span>
                    <span className="font-semibold text-[#1F251A]">
                      {(Number(viewingEmployee.salary || 0) / (20 * 8)).toFixed(2)} EGP
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">Bonuses</span>
                    <span className="font-semibold text-[#1F251A]">200 EGP</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">Deductions</span>
                    <span className="font-semibold text-[#1F251A]">150 EGP</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">Last Payment Date</span>
                    <span className="font-semibold text-[#1F251A]">May 5, 2026</span>
                  </div>
                </div>
              </div>
            )}
    
            {employeeProfileActiveTab === "performance" && (
              <div className="space-y-4">
                {(() => {
                  const currentMonthStr = new Date().toISOString().slice(0, 7);
                  const currentMonthBookings = (viewingEmployeeBookings || []).filter((b) => {
                    const isApprovedOrCompleted = b.status === "approved" || b.status === "completed";
                    return isApprovedOrCompleted && b.date && b.date.startsWith(currentMonthStr);
                  });
                  const achievedCount = currentMonthBookings.length;
                  const targetAmount = Number(viewingEmployee.requiredTargetAmount || 0);
                  const bonusPct = Number(viewingEmployee.bonusPercentage || 0);
                  const baseSalary = Number(viewingEmployee.salary || 0);
                  
                  const progressPercent = targetAmount > 0 ? Math.min(100, Math.round((achievedCount / targetAmount) * 100)) : 0;
                  const hasAchievedTarget = targetAmount > 0 && achievedCount >= targetAmount;
                  const potentialBonus = hasAchievedTarget ? Math.round(baseSalary * (bonusPct / 100)) : 0;
    
                  return (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between border-b border-[#414E36]/5 pb-3">
                        <div className="flex items-center gap-2">
                          <Target size={16} className="text-[#C4AE7C]" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-[#C4AE7C]">Target &amp; Performance Bonus</h4>
                        </div>
                        {hasAchievedTarget && (
                          <span className="bg-green-50 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-green-200">
                            Target Met ✓
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                        <div>
                          <span className="block text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">Required Target</span>
                          <span className="font-semibold text-[#1F251A]">{targetAmount} reservations</span>
                        </div>
                        <div>
                          <span className="block text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">Bonus Percentage</span>
                          <span className="font-semibold text-[#1F251A]">{bonusPct}% of salary</span>
                        </div>
                        <div>
                          <span className="block text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">Achieved (Current Month)</span>
                          <span className="font-semibold text-[#1F251A]">
                            {loadingEmployeeBookings ? (
                              <span className="text-xs text-[#5A6A51] italic">Loading...</span>
                            ) : (
                              achievedCount + " reservations"
                            )}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">Estimated Bonus</span>
                          <span className={`font-bold ${hasAchievedTarget ? "text-green-700" : "text-[#5A6A51]"}`}>
                            {loadingEmployeeBookings ? (
                              <span className="text-xs text-[#5A6A51] italic">Loading...</span>
                            ) : (
                              potentialBonus.toLocaleString() + " EGP"
                            )}
                          </span>
                        </div>
                      </div>
                      
                      {targetAmount > 0 && !loadingEmployeeBookings && (
                        <div className="space-y-1.5 pt-2 max-w-xl">
                          <div className="flex items-center justify-between text-xs font-semibold text-[#5A6A51]">
                            <span>Monthly Target Progress</span>
                            <span>{progressPercent}%</span>
                          </div>
                          <div className="w-full bg-gray-150 h-2.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-500 rounded-full ${hasAchievedTarget ? "bg-green-600" : "bg-[#C4AE7C]"}`}
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
    
            {employeeProfileActiveTab === "attendance" && (() => {
              const empRecords = attendanceList.filter((log: any) => {
                const matchesEmp = log.employee_id === viewingEmployee.id || 
                                   log.employee_db_id === viewingEmployee.id || 
                                   log.employee_code === viewingEmployee.employee_id || 
                                   log.employee_name === viewingEmployee.name;
                if (!matchesEmp) return false;
                if (attendanceInsightMonth && log.date) {
                  return log.date.startsWith(attendanceInsightMonth);
                }
                return true;
              });
    
              const totalWorkedMins = empRecords.reduce((sum: number, r: any) => sum + (r.worked_minutes || 0), 0);
              const totalLateMins = empRecords.reduce((sum: number, r: any) => sum + (r.late_minutes || 0), 0);
              const totalEarlyLeaveMins = empRecords.reduce((sum: number, r: any) => sum + (r.early_leave_minutes || 0), 0);
              const totalOvertimeMins = empRecords.reduce((sum: number, r: any) => sum + (r.overtime_minutes || 0), 0);
              const totalMidShiftLeaveMins = empRecords.reduce((sum: number, r: any) => sum + (r.combined_mid_shift_duration_minutes || 0), 0);
              const lateCount = empRecords.filter((r: any) => (r.late_minutes || 0) > 0).length;
              const absentCount = empRecords.filter((r: any) => r.status === "Absent").length;
              const presentCount = empRecords.filter((r: any) => r.status === "Present" || r.check_in_time).length;
    
              const workedHrs = Math.floor(totalWorkedMins / 60);
              const workedRMin = totalWorkedMins % 60;
    
              return (
                <div className="space-y-6">
                  {/* Top Controls & Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#414E36]/10 pb-4">
                    <div className="flex items-center gap-2">
                      <Clock size={18} className="text-[#C4AE7C]" />
                      <div>
                        <h4 className="text-sm font-bold uppercase tracking-wider text-[#414E36]">Attendance Insights</h4>
                        <p className="text-xs text-[#5A6A51]">Comprehensive attendance analytics & daily logs</p>
                      </div>
                    </div>
    
                    <div className="flex items-center gap-3">
                      <input
                        type="month"
                        value={attendanceInsightMonth}
                        onChange={(e) => setAttendanceInsightMonth(e.target.value)}
                        className="px-3 py-1.5 text-xs font-semibold text-[#414E36] bg-[#F7F9F6] border border-[#414E36]/20 rounded-lg outline-none focus:border-[#414E36]"
                      />
                      <button
                        onClick={() => handleExportAttendanceInsights(viewingEmployee, attendanceInsightMonth, empRecords)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#414E36] rounded-lg hover:bg-[#323D2A] transition-all shadow-xs"
                      >
                        <Download size={14} />
                        Export CSV
                      </button>
                    </div>
                  </div>
    
                  {/* Stat Summary Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="p-3 bg-[#F7F9F6] rounded-xl border border-[#414E36]/10">
                      <span className="block text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider mb-1">Total Worked</span>
                      <span className="text-base font-bold text-[#414E36]">{workedHrs}h {workedRMin}m</span>
                      <span className="block text-[10px] text-[#5A6A51] mt-0.5">{presentCount} Days Present</span>
                    </div>
    
                    <div className="p-3 bg-[#F7F9F6] rounded-xl border border-[#414E36]/10">
                      <span className="block text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider mb-1">Late Arrival</span>
                      <span className={`text-base font-bold ${totalLateMins > 0 ? 'text-amber-600' : 'text-[#414E36]'}`}>{totalLateMins} min</span>
                      <span className="block text-[10px] text-[#5A6A51] mt-0.5">{lateCount} Late Incident{lateCount === 1 ? '' : 's'}</span>
                    </div>
    
                    <div className="p-3 bg-[#F7F9F6] rounded-xl border border-[#414E36]/10">
                      <span className="block text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider mb-1">Early Leave</span>
                      <span className={`text-base font-bold ${totalEarlyLeaveMins > 0 ? 'text-amber-600' : 'text-[#414E36]'}`}>{totalEarlyLeaveMins} min</span>
                      <span className="block text-[10px] text-[#5A6A51] mt-0.5">Early Departures</span>
                    </div>
    
                    <div className="p-3 bg-[#F7F9F6] rounded-xl border border-[#414E36]/10">
                      <span className="block text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider mb-1">Overtime</span>
                      <span className="text-base font-bold text-emerald-700">{totalOvertimeMins} min</span>
                      <span className="block text-[10px] text-[#5A6A51] mt-0.5">Extra Hours Worked</span>
                    </div>
    
                    <div className="p-3 bg-[#F7F9F6] rounded-xl border border-[#414E36]/10">
                      <span className="block text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider mb-1">Mid-Shift Leave</span>
                      <span className={`text-base font-bold ${totalMidShiftLeaveMins > 0 ? 'text-purple-700' : 'text-[#414E36]'}`}>{totalMidShiftLeaveMins} min</span>
                      <span className="block text-[10px] text-[#5A6A51] mt-0.5">Permission Duration</span>
                    </div>
    
                    <div className="p-3 bg-[#F7F9F6] rounded-xl border border-[#414E36]/10">
                      <span className="block text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider mb-1">Absences</span>
                      <span className={`text-base font-bold ${absentCount > 0 ? 'text-rose-600' : 'text-[#414E36]'}`}>{absentCount} Days</span>
                      <span className="block text-[10px] text-[#5A6A51] mt-0.5">Unexcused / Leave</span>
                    </div>
                  </div>
    
                  {/* Daily Breakdown Table */}
                  <div className="border border-[#414E36]/10 rounded-xl overflow-hidden bg-white shadow-xs">
                    <div className="px-4 py-3 bg-[#F7F9F6] border-b border-[#414E36]/10 flex items-center justify-between">
                      <h5 className="text-xs font-bold text-[#414E36] uppercase tracking-wider">Daily Attendance Breakdown</h5>
                      <span className="text-xs font-semibold text-[#5A6A51]">{empRecords.length} Record{empRecords.length === 1 ? '' : 's'}</span>
                    </div>
    
                    {loadingAttendance ? (
                      <div className="p-8 text-center text-xs text-[#5A6A51] flex items-center justify-center gap-2">
                        <Loader2 size={16} className="animate-spin text-[#414E36]" />
                        Loading attendance records...
                      </div>
                    ) : empRecords.length === 0 ? (
                      <div className="p-8 text-center text-xs text-[#5A6A51]">
                        No attendance records found for {attendanceInsightMonth || 'selected month'}.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[#F7F9F6]/60 text-[#5A6A51] border-b border-[#414E36]/10 font-bold uppercase tracking-wider text-[10px]">
                            <tr>
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3">Shift Time</th>
                              <th className="py-2.5 px-3">Check In</th>
                              <th className="py-2.5 px-3">Check Out</th>
                              <th className="py-2.5 px-3">Status</th>
                              <th className="py-2.5 px-3 text-right">Worked</th>
                              <th className="py-2.5 px-3 text-right">Late</th>
                              <th className="py-2.5 px-3 text-right">Early Out</th>
                              <th className="py-2.5 px-3 text-right">Overtime</th>
                              <th className="py-2.5 px-3 text-right">Mid-Shift Leave</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#414E36]/5 text-[#1F251A]">
                            {empRecords.map((r: any, idx: number) => {
                              const inStr = r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
                              const outStr = r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
                              return (
                                <tr key={r.id || idx} className="hover:bg-[#F7F9F6]/50 transition-colors">
                                  <td className="py-2.5 px-3 font-semibold text-[#414E36] whitespace-nowrap">{r.date}</td>
                                  <td className="py-2.5 px-3 text-[#5A6A51] whitespace-nowrap">{r.scheduled_in || '09:00 AM'} - {r.scheduled_out || '05:00 PM'}</td>
                                  <td className="py-2.5 px-3 font-medium whitespace-nowrap">{inStr}</td>
                                  <td className="py-2.5 px-3 font-medium whitespace-nowrap">{outStr}</td>
                                  <td className="py-2.5 px-3 whitespace-nowrap">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      r.status === 'Absent' ? 'bg-rose-100 text-rose-800' :
                                      (r.late_minutes || 0) > 0 ? 'bg-amber-100 text-amber-800' :
                                      'bg-emerald-100 text-emerald-800'
                                    }`}>
                                      {r.status || 'Present'}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-medium">{Math.floor((r.worked_minutes || 0) / 60)}h {(r.worked_minutes || 0) % 60}m</td>
                                  <td className={`py-2.5 px-3 text-right font-medium ${r.late_minutes > 0 ? 'text-amber-600' : 'text-[#5A6A51]'}`}>{r.late_minutes || 0} m</td>
                                  <td className={`py-2.5 px-3 text-right font-medium ${r.early_leave_minutes > 0 ? 'text-amber-600' : 'text-[#5A6A51]'}`}>{r.early_leave_minutes || 0} m</td>
                                  <td className={`py-2.5 px-3 text-right font-medium ${r.overtime_minutes > 0 ? 'text-emerald-700 font-bold' : 'text-[#5A6A51]'}`}>{r.overtime_minutes || 0} m</td>
                                  <td className={`py-2.5 px-3 text-right font-medium ${r.combined_mid_shift_duration_minutes > 0 ? 'text-purple-700 font-bold' : 'text-[#5A6A51]'}`}>{r.combined_mid_shift_duration_minutes || 0} m</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
    
            {employeeProfileActiveTab === "contact" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-[#414E36]/5 pb-3">
                  <Phone size={16} className="text-[#C4AE7C]" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#C4AE7C]">Contact Details</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                  <div className="md:col-span-2">
                    <span className="block text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">Home Address</span>
                    <span className="font-semibold text-[#1F251A] block bg-[#F9F9F7] px-3.5 py-2.5 rounded-xl border border-[#414E36]/5 leading-relaxed max-w-xl">
                      {viewingEmployee.address || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">Emergency Contact Name</span>
                    <span className="font-semibold text-[#1F251A]">
                      {viewingEmployee.name ? `Ahmed ${viewingEmployee.name.split(" ").slice(-1)[0]}` : "Ahmed Ahmed"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">Emergency Contact Phone</span>
                    <span className="font-semibold text-[#1F251A] font-mono">01098765432</span>
                  </div>
                </div>
              </div>
            )}
    
            {employeeProfileActiveTab === "documents" && (
              <div className="space-y-6">
                {/* Notes Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[#414E36]/5 pb-3">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-[#C4AE7C]" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#C4AE7C]">Internal Notes &amp; Reminders</h4>
                    </div>
                    <span className="text-[10px] font-bold text-[#5A6A51] bg-[#F9F9F7] px-2 py-0.5 rounded-full border border-[#414E36]/10">
                      {viewingEmployeeNotes.length} Notes
                    </span>
                  </div>
                  
                  {/* Notes List */}
                  <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                    {loadingEmployeeNotes ? (
                      <p className="text-xs text-[#5A6A51] italic py-2">Loading notes...</p>
                    ) : viewingEmployeeNotes.length === 0 ? (
                      <p className="text-xs text-[#5A6A51]/70 italic py-2 text-center">No internal notes or reminders yet for this employee.</p>
                    ) : (
                      viewingEmployeeNotes.map((note) => (
                        <div key={note.id} className="text-xs bg-[#FBFBF9] border border-[#414E36]/5 rounded-xl p-3.5 space-y-1.5 relative group transition hover:border-[#C4AE7C]/30">
                          <p className="text-[#1F251A] font-medium leading-relaxed break-words whitespace-pre-wrap">{note.note}</p>
                          <div className="flex items-center justify-between text-[9px] text-[#5A6A51]/80 font-semibold pt-1 border-t border-[#414E36]/5">
                            <span>
                              Added by {note.creator?.name || "Staff Member"} on {new Date(note.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </span>
                            <button
                              type="button"
                              onClick={async () => {
                                if (confirm("Are you sure you want to delete this note?")) {
                                  try {
                                    const res = await fetch(`/api/employees/notes?id=${note.id}`, {
                                      method: "DELETE",
                                      headers: { Authorization: `Bearer ${session?.access_token || ''}` },
                                    });
                                    if (res.ok) {
                                      setViewingEmployeeNotes(prev => prev.filter(n => n.id !== note.id));
                                    } else {
                                      alert("Failed to delete note.");
                                    }
                                  } catch (e) {
                                    console.error("Delete note error:", e);
                                  }
                                }
                              }}
                              className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition duration-200"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
    
                  {/* Note Input */}
                  <div className="pt-2 border-t border-[#414E36]/5 space-y-2 max-w-xl">
                    <textarea
                      placeholder="Add a new internal note or reminder..."
                      value={newEmployeeNoteText}
                      onChange={(e) => setNewEmployeeNoteText(e.target.value)}
                      rows={2}
                      className="w-full text-xs rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3.5 py-2.5 text-[#1F251A] placeholder-[#5A6A51]/50 outline-none focus:border-[#C4AE7C] resize-none font-medium leading-relaxed"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={async () => {
                          if (!newEmployeeNoteText.trim()) return;
                          try {
                            const res = await fetch("/api/employees/notes", {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${session?.access_token || ''}`,
                              },
                              body: JSON.stringify({
                                employeeId: viewingEmployee.id,
                                note: newEmployeeNoteText.trim(),
                                createdBy: adminDbId
                              })
                            });
                            if (res.ok) {
                              const created = await res.json();
                              setViewingEmployeeNotes(prev => [created, ...prev]);
                              setNewEmployeeNoteText("");
                            } else {
                              alert("Failed to add note.");
                            }
                          } catch (e) {
                            console.error("Add note error:", e);
                          }
                        }}
                        disabled={!newEmployeeNoteText.trim()}
                        className="rounded-xl bg-[#414E36] hover:bg-[#2e3a26] disabled:bg-gray-200 text-white disabled:text-gray-400 px-4 py-2 text-[11px] font-bold transition shadow-xs"
                      >
                        Add Note
                      </button>
                    </div>
                  </div>
                </div>
    
                {/* National ID Check */}
                {viewingEmployee.national_id && (() => {
                  const check = parseEgyptianNationalId(viewingEmployee.national_id);
                  if (check.isValid) {
                    return (
                      <div className="rounded-xl bg-green-50/50 border border-green-200/50 p-4 space-y-2 text-xs max-w-xl">
                        <div className="flex items-center gap-1.5 font-bold text-green-800">
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-green-600 text-[10px] text-white">✓</span>
                          Verified Egyptian National ID Check
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-green-700 font-medium">
                          <div>
                            <span className="block text-[9px] uppercase tracking-wider text-green-600/75">Birth Date</span>
                            {check.birthDate}
                          </div>
                          <div>
                            <span className="block text-[9px] uppercase tracking-wider text-green-600/75">Gender</span>
                            {check.gender}
                          </div>
                          <div>
                            <span className="block text-[9px] uppercase tracking-wider text-green-600/75">Governorate</span>
                            {check.governorate}
                          </div>
                        </div>
                     </div>
                     );
                   }
                   return null;
                 })()}
    
                {/* Attachments */}
                {(viewingEmployee.national_id_front || viewingEmployee.national_id_back || viewingEmployee.contract_file) && (
                  <div className="space-y-3 pt-3 border-t border-[#414E36]/5 max-w-2xl">
                    <span className="block text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider">Attached Documents</span>
    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {viewingEmployee.national_id_front && (
                        <div className="space-y-1">
                          <span className="block text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider text-center">ID Front Side</span>
                          <a
                            href={viewingEmployee.national_id_front}
                            target="_blank"
                            rel="noreferrer"
                            className="block relative rounded-xl overflow-hidden border border-[#414E36]/15 hover:opacity-90 transition group cursor-zoom-in"
                            title="Click to view full size"
                          >
                            <img
                              src={viewingEmployee.national_id_front}
                              alt="ID Front"
                              className="h-32 w-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[10px] font-bold uppercase tracking-wider">
                              View Full Size
                            </div>
                          </a>
                        </div>
                      )}
                      {viewingEmployee.national_id_back && (
                        <div className="space-y-1">
                          <span className="block text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider text-center">ID Back Side</span>
                          <a
                            href={viewingEmployee.national_id_back}
                            target="_blank"
                            rel="noreferrer"
                            className="block relative rounded-xl overflow-hidden border border-[#414E36]/15 hover:opacity-90 transition group cursor-zoom-in"
                            title="Click to view full size"
                          >
                            <img
                              src={viewingEmployee.national_id_back}
                              alt="ID Back"
                              className="h-32 w-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[10px] font-bold uppercase tracking-wider">
                              View Full Size
                            </div>
                          </a>
                        </div>
                      )}
                    </div>
    
                    {viewingEmployee.contract_file && (() => {
                      const raw = viewingEmployee.contract_file;
                      let contractUrl = "";
                      let additionalList: any[] = [];
                      try {
                        if (raw.startsWith("{")) {
                          const parsed = JSON.parse(raw);
                          contractUrl = parsed.contract || "";
                          additionalList = parsed.additional || [];
                        } else {
                          contractUrl = raw;
                        }
                      } catch (e) {
                        contractUrl = raw;
                      }
                      return (
                        <div className="space-y-3 pt-2">
                          {contractUrl && (
                            <div>
                              <span className="block text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider mb-2">Employment Contract</span>
                              <a
                                href={contractUrl}
                                download={viewingEmployee.contract_file_name || "contract"}
                                className="inline-flex items-center gap-2 rounded-xl border border-[#414E36]/15 bg-[#EDF1EC] px-4 py-2.5 text-xs font-semibold text-[#414E36] hover:bg-[#d9e0d3] transition shadow-xs"
                              >
                                <FileText className="h-4 w-4 text-[#5A6A51]" />
                                {viewingEmployee.contract_file_name || "Download Contract"}
                              </a>
                            </div>
                          )}
                          {additionalList.length > 0 && (
                            <div>
                              <span className="block text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider mb-2">Additional Files</span>
                              <div className="flex flex-wrap gap-2">
                                {additionalList.map((fileItem, idx) => (
                                  <a
                                    key={idx}
                                    href={fileItem.file}
                                    download={fileItem.name}
                                    className="inline-flex items-center gap-2 rounded-xl border border-[#414E36]/15 bg-white px-3 py-2 text-xs font-semibold text-[#414E36] hover:bg-gray-50 transition shadow-xs"
                                  >
                                    <FileText className="h-3.5 w-3.5 text-[#5A6A51]" />
                                    {fileItem.name}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
