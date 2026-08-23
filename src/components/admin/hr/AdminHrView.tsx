"use client";

import {
  Users,
  CalendarDays,
  DollarSign,
  Search,
  Filter,
  Plus,
  Eye,
  Check,
  RotateCcw,
  Star,
  Trash2,
  Download,
  MoreVertical,
  X,
} from "lucide-react";
import { clearFetchCache } from "@/lib/fetchCache";
import { adminTranslations } from "@/components/admin/translations";
interface AdminHrViewProps {
  // HR sub-tab and data states (kept in page.tsx)
  hrActiveSubTab: string;
  setHrActiveSubTab: (v: string) => void;
  payrollList: any[];
  setPayrollList: (v: any[] | ((prev: any[]) => any[])) => void;
  loadingPayroll: boolean;
  leavesList: any[];
  loadingLeaves: boolean;
  performanceReviews: any[];
  loadingPerformance: boolean;
  doctorPayrollList: any[];
  loadingDoctorPayroll: boolean;
  selectedDoctorPayrollMonth: string;
  setSelectedDoctorPayrollMonth: (v: string) => void;
  doctorPayrollSearchQuery: string;
  setDoctorPayrollSearchQuery: (v: string) => void;
  doctorPayrollFilterStatus: string;
  setDoctorPayrollFilterStatus: (v: string) => void;
  doctorPayrollCurrentPage: number;
  setDoctorPayrollCurrentPage: (v: number | ((prev: number) => number)) => void;
  selectedPayrollMonth: string;
  setSelectedPayrollMonth: (v: string) => void;
  payrollSearchQuery: string;
  setPayrollSearchQuery: (v: string) => void;
  payrollFilterDepartment: string;
  setPayrollFilterDepartment: (v: string) => void;
  payrollFilterStatus: string;
  setPayrollFilterStatus: (v: string) => void;
  payrollCurrentPage: number;
  setPayrollCurrentPage: (v: number | ((prev: number) => number)) => void;
  newLeaveEmployeeId: string;
  setNewLeaveEmployeeId: (v: string) => void;
  newLeaveType: string;
  setNewLeaveType: (v: string) => void;
  newLeaveStartDate: string;
  setNewLeaveStartDate: (v: string) => void;
  newLeaveEndDate: string;
  setNewLeaveEndDate: (v: string) => void;
  newLeaveReason: string;
  setNewLeaveReason: (v: string) => void;
  newReviewEmployeeId: string;
  setNewReviewEmployeeId: (v: string) => void;
  newReviewRating: number;
  setNewReviewRating: (v: number) => void;
  newReviewComments: string;
  setNewReviewComments: (v: string) => void;
  newReviewGoals: string;
  setNewReviewGoals: (v: string) => void;

  // Target edit modal state
  editingTargetEmployee: any | null;
  setEditingTargetEmployee: (v: any | null) => void;
  targetAmountInput: string;
  setTargetAmountInput: (v: string) => void;
  bonusPercentageInput: string;
  setBonusPercentageInput: (v: string) => void;
  targetTypeInput: "reservations" | "revenue";
  setTargetTypeInput: (v: "reservations" | "revenue") => void;
  bonusTypeInput: "percentage" | "fixed";
  setBonusTypeInput: (v: "percentage" | "fixed") => void;

  // Shared / global data and handlers
  employeesList: any[];
  attendanceList: any[];
  loadingAttendance: boolean;
  activeMissingAlerts: any[];
  setViewingEmployee: (v: any | null) => void;
  session: any;
  adminEmail?: string;
  branches: any[];
  localServices: any[];
  allReservations: any[];
  showConfirm: (msg: string) => Promise<boolean>;
  fetchHrPayroll: () => Promise<void> | void;
  fetchDoctorPayroll: () => Promise<void> | void;
  fetchHrLeaves: () => Promise<void> | void;
  fetchHrPerformance: () => Promise<void> | void;
  fetchHrAttendance: () => Promise<void> | void;
  fetchHrAlerts: () => Promise<void> | void;
  fetchRolesAndEmployees: () => Promise<void> | void;
  lang: "en" | "ar";
  t: typeof adminTranslations["en"]["hr"];
}

export default function AdminHrView({
  hrActiveSubTab,
  setHrActiveSubTab,
  payrollList,
  setPayrollList,
  loadingPayroll,
  leavesList,
  loadingLeaves,
  performanceReviews,
  loadingPerformance,
  doctorPayrollList,
  loadingDoctorPayroll,
  selectedDoctorPayrollMonth,
  setSelectedDoctorPayrollMonth,
  doctorPayrollSearchQuery,
  setDoctorPayrollSearchQuery,
  doctorPayrollFilterStatus,
  setDoctorPayrollFilterStatus,
  doctorPayrollCurrentPage,
  setDoctorPayrollCurrentPage,
  selectedPayrollMonth,
  setSelectedPayrollMonth,
  payrollSearchQuery,
  setPayrollSearchQuery,
  payrollFilterDepartment,
  setPayrollFilterDepartment,
  payrollFilterStatus,
  setPayrollFilterStatus,
  payrollCurrentPage,
  setPayrollCurrentPage,
  newLeaveEmployeeId,
  setNewLeaveEmployeeId,
  newLeaveType,
  setNewLeaveType,
  newLeaveStartDate,
  setNewLeaveStartDate,
  newLeaveEndDate,
  setNewLeaveEndDate,
  newLeaveReason,
  setNewLeaveReason,
  newReviewEmployeeId,
  setNewReviewEmployeeId,
  newReviewRating,
  setNewReviewRating,
  newReviewComments,
  setNewReviewComments,
  newReviewGoals,
  setNewReviewGoals,
  editingTargetEmployee,
  setEditingTargetEmployee,
  targetAmountInput,
  setTargetAmountInput,
  bonusPercentageInput,
  setBonusPercentageInput,
  targetTypeInput,
  setTargetTypeInput,
  bonusTypeInput,
  setBonusTypeInput,
  employeesList,
  attendanceList,
  loadingAttendance,
  activeMissingAlerts,
  setViewingEmployee,
  session,
  adminEmail,
  branches,
  localServices,
  allReservations,
  showConfirm,
  fetchHrPayroll,
  fetchDoctorPayroll,
  fetchHrLeaves,
  fetchHrPerformance,
  fetchHrAttendance,
  fetchHrAlerts,
  fetchRolesAndEmployees,
  lang,
  t,
}: AdminHrViewProps) {
  return (
<>
    <div className="space-y-6 animate-fadeIn" dir={lang === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-4xl font-semibold text-[#1F251A]">{t.heading}</h2>
          <p className="mt-2 text-sm text-[#5A6A51]">{t.subtitle}</p>
        </div>
      </div>
    
      {/* Sub-navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 bg-white rounded-2xl border border-[#414E36]/10 shadow-xs overflow-x-auto no-scrollbar">
        {(["overview", "payroll", "doctor-payroll", "leaves", "performance", "attendance", "targets"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setHrActiveSubTab(tab)}
            className={`px-4 py-2 text-xs sm:text-sm font-semibold capitalize transition-all rounded-xl outline-none whitespace-nowrap ${
              hrActiveSubTab === tab
                ? "bg-[#414E36] text-[#FBFBF9] font-bold shadow-xs"
                : "text-[#5A6A51] hover:text-[#414E36] hover:bg-[#F2EFE9]/60"
            }`}
          >
            {tab === "overview" ? t.tabOverview : tab === "payroll" ? t.tabPayroll : tab === "doctor-payroll" ? t.tabDoctorPayroll : tab === "leaves" ? t.tabLeaves : tab === "performance" ? t.tabPerformance : tab === "attendance" ? t.tabAttendance : t.tabTargets}
          </button>
        ))}
      </div>
    
      {/* Overview Sub-tab */}
      {hrActiveSubTab === "overview" && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="rounded-[32px] border border-[#414E36]/10 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-[#5A6A51]">{t.overview.activeEmployees}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-3xl font-semibold text-[#1F251A]">{employeesList.length}</span>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#C4AE7C]/10 text-[#414E36]">
                  <Users size={18} />
                </span>
              </div>
            </div>
    
            <div className="rounded-[32px] border border-[#414E36]/10 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-[#5A6A51]">{t.overview.approvedLeavesThisMonth}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-3xl font-semibold text-[#1F251A]">
                  {leavesList.filter(l => l.status === "Approved").length}
                </span>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#C4AE7C]/10 text-[#414E36]">
                  <CalendarDays size={18} />
                </span>
              </div>
            </div>
    
            <div className="rounded-[32px] border border-[#414E36]/10 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-[#5A6A51]">{t.overview.totalPayrollRun(selectedPayrollMonth)}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-3xl font-semibold text-[#1F251A]">
                  {t.egp} {payrollList
                    .filter(p => p.month === selectedPayrollMonth)
                    .reduce((sum, p) => sum + Number(p.net_salary || 0), 0)
                    .toLocaleString("en-GB")}
                </span>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#C4AE7C]/10 text-[#414E36]">
                  <DollarSign size={18} />
                </span>
              </div>
            </div>
          </div>
    
          {/* Employees Directory Card */}
          <div className="rounded-[32px] bg-white border border-[#414E36]/10 shadow-[0_20px_60px_rgba(47,61,41,0.06)] overflow-hidden">
            <div className="p-6 border-b border-[#414E36]/10 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#1F251A]">{t.overview.workforceDirectory}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                   <tr className="border-b border-[#414E36]/10 bg-[#F9F9F7]">
                     <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51] whitespace-nowrap">{t.overview.employeeInfo}</th>
                     <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51] whitespace-nowrap">{t.overview.department}</th>
                     <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51] whitespace-nowrap">{t.overview.systemRole}</th>
                     <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51] whitespace-nowrap">{t.overview.branch}</th>
                     <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51] whitespace-nowrap">{t.overview.baseSalary}</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-[#414E36]/5">
                  {employeesList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-16 text-center text-sm text-[#5A6A51] font-medium">
                        {t.overview.noActiveEmployees}
                      </td>
                    </tr>
                  ) : (
                    employeesList.map((emp: any) => (
                       <tr key={emp.id} className="transition hover:bg-[#F9F9F7]">
                         <td className="px-5 py-4">
                           <div className="flex items-center gap-3">
                             <div className="h-8 w-8 rounded-full bg-[#EDF1EC] text-[#414E36] border border-[#414E36]/10 flex items-center justify-center text-xs font-bold font-serif shrink-0">
                               {emp.name ? emp.name.charAt(0).toUpperCase() : "E"}
                             </div>
                             <div>
                               <div className="font-semibold text-[#1F251A] text-sm">{emp.name}</div>
                               <div className="text-xs text-[#5A6A51]">{emp.email}</div>
                             </div>
                           </div>
                         </td>
                         <td className="px-5 py-4"><span className="inline-block rounded-lg bg-[#C4AE7C]/15 px-2.5 py-1 text-xs font-semibold text-[#8B7544]">{emp.department || "—"}</span></td>
                         <td className="px-5 py-4 text-xs font-semibold text-[#1F251A]">{emp.role_name || "—"}</td>
                         <td className="px-5 py-4"><span className="inline-block rounded-lg bg-[#414E36]/10 px-2.5 py-1 text-xs font-semibold text-[#414E36]">{branches.find(b => b.id === emp.branch_id)?.name_en || "—"}</span></td>
                         <td className="px-5 py-4 text-xs font-mono font-bold text-[#1F251A]">
                           {t.egp} {Number(emp.salary || 0).toLocaleString("en-GB")}
                         </td>
                       </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    
      {/* Payroll Sub-tab */}
      {hrActiveSubTab === "payroll" && (() => {
        // Filter payroll records
        const filtered = payrollList.filter((pay: any) => {
          // 0. Exclude Superadmin and Doctor accounts (Doctors are managed in Doctor Payroll)
          const roleName = String(pay.employee_accounts?.role_name || "").toLowerCase();
          const deptName = String(pay.employee_accounts?.department || "").toLowerCase();
          if (roleName === "superadmin" || roleName === "doctor" || roleName === "doctors" || deptName === "doctors" || deptName === "doctor") {
            return false;
          }
    
          // 1. Search Query
          if (payrollSearchQuery.trim()) {
            const q = payrollSearchQuery.toLowerCase();
            const nameMatch = pay.employee_accounts?.name?.toLowerCase().includes(q);
            const emailMatch = pay.employee_accounts?.email?.toLowerCase().includes(q);
            const idMatch = pay.employee_accounts?.employee_id?.toLowerCase().includes(q);
            if (!nameMatch && !emailMatch && !idMatch) return false;
          }
    
          // 2. Department
          if (payrollFilterDepartment !== "All") {
            if (pay.employee_accounts?.department !== payrollFilterDepartment) return false;
          }
    
          // 3. Month
          if (selectedPayrollMonth !== "All" && selectedPayrollMonth) {
            if (pay.month !== selectedPayrollMonth) return false;
          }
    
          // 4. Status
          if (payrollFilterStatus !== "All") {
            const status = pay.status || "Unpaid";
            if (payrollFilterStatus === "Paid" && status !== "Paid") return false;
            if (payrollFilterStatus === "Pending" && status === "Paid") return false;
            if (payrollFilterStatus === "Overdue" && status === "Paid") return false;
          }
    
          return true;
        });
    
        // Pagination calculations
        const itemsPerPage = 10;
        const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
        const activePage = Math.min(payrollCurrentPage, totalPages);
        const startIndex = (activePage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paged = filtered.slice(startIndex, endIndex);
    
        const getPaymentDate = (monthStr: string) => {
          if (!monthStr) return "—";
          const parts = monthStr.split("-");
          if (parts.length < 2) return "—";
          const year = parts[0];
          const monthNum = parseInt(parts[1], 10);
          const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          const monthName = months[monthNum - 1] || "May";
          return `05 ${monthName} ${year}`;
        };
    
        return (
          <div className="space-y-6 animate-fadeIn">
            {/* Title & Action Buttons Row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-4xl font-semibold text-[#1F251A]">{t.payroll.heading}</h2>
                <p className="mt-1 text-xs text-[#8A9A81] font-medium">{t.payroll.breadcrumb}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={async () => {
                    if (selectedPayrollMonth === "All") {
                      alert(t.payroll.selectMonthAlert);
                      return;
                    }
                    try {
                      const res = await fetch('/api/hr/payroll', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${session?.access_token}`
                        },
                        body: JSON.stringify({ month: selectedPayrollMonth })
                      });
                      if (res.ok) {
                        const result = await res.json();
                        alert(result.skippedPaid > 0
                          ? t.payroll.refreshedMsg(result.skippedPaid)
                          : t.payroll.successMsg);
                        fetchHrPayroll();
                      } else {
                        const err = await res.json();
                        alert(err.error || t.payroll.failedMsg);
                      }
                    } catch (err) {
                      alert(t.payroll.apiFailed);
                    }
                  }}
                  className="rounded-xl bg-[#414E36] px-4 py-2.5 text-xs font-bold text-[#FBFBF9] hover:bg-[#2e3a26] transition flex items-center gap-2 shadow-xs"
                >
                  <Plus size={14} /> {t.payroll.addPayroll}
                </button>
                <button
                  onClick={() => window.print()}
                  className="rounded-xl bg-white border border-[#414E36]/15 px-4 py-2.5 text-xs font-bold text-[#414E36] hover:bg-[#EDF1EC]/20 transition flex items-center gap-2 shadow-xs"
                >
                  <Download size={14} /> {t.payroll.export}
                </button>
                <button
                  title={t.payroll.filterTitle}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-[#414E36]/15 text-[#414E36] hover:bg-[#EDF1EC]/20 transition shadow-xs cursor-pointer"
                >
                  <Filter size={15} />
                </button>
              </div>
            </div>
    
            {/* Search & Filter Bar */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 p-4 rounded-3xl border border-[#414E36]/10 bg-white shadow-xs">
              <div className="relative md:col-span-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5A6A51]/65" />
                <input
                  type="text"
                  placeholder={t.payroll.searchPlaceholder}
                  value={payrollSearchQuery}
                  onChange={(e) => {
                    setPayrollSearchQuery(e.target.value);
                    setPayrollCurrentPage(1);
                  }}
                  className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] pl-10 pr-4 py-2.5 text-xs font-semibold text-[#1F251A] outline-none focus:border-[#C4AE7C] transition placeholder:text-gray-400"
                />
              </div>
    
              <div>
                <select
                  value={payrollFilterDepartment}
                  onChange={(e) => {
                    setPayrollFilterDepartment(e.target.value);
                    setPayrollCurrentPage(1);
                  }}
                  className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3.5 py-2.5 text-xs font-semibold text-[#414E36] outline-none focus:border-[#C4AE7C] cursor-pointer"
                >
                  <option value="All">{t.payroll.allDepartments}</option>
                  <option value="Doctors">{t.payroll.deptDoctors}</option>
                  <option value="Nursing">{t.payroll.deptNursing}</option>
                  <option value="Admin">{t.payroll.deptAdmin}</option>
                  <option value="Reception">{t.payroll.deptReception}</option>
                  <option value="Lab">{t.payroll.deptLab}</option>
                </select>
              </div>
    
              <div>
                <select
                  value={selectedPayrollMonth}
                  onChange={(e) => {
                    setSelectedPayrollMonth(e.target.value);
                    setPayrollCurrentPage(1);
                  }}
                  className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3.5 py-2.5 text-xs font-semibold text-[#414E36] outline-none focus:border-[#C4AE7C] cursor-pointer"
                >
                  <option value="All">{t.payroll.allMonths}</option>
                  <option value="2026-05">May 2026</option>
                  <option value="2026-06">June 2026</option>
                  <option value="2026-07">July 2026</option>
                  <option value="2026-08">August 2026</option>
                </select>
              </div>
    
              <div>
                <select
                  value={payrollFilterStatus}
                  onChange={(e) => {
                    setPayrollFilterStatus(e.target.value);
                    setPayrollCurrentPage(1);
                  }}
                  className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3.5 py-2.5 text-xs font-semibold text-[#414E36] outline-none focus:border-[#C4AE7C] cursor-pointer"
                >
                  <option value="All">{t.payroll.allStatus}</option>
                  <option value="Paid">{t.payroll.paid}</option>
                  <option value="Pending">{t.payroll.pending}</option>
                  <option value="Overdue">{t.payroll.overdue}</option>
                </select>
              </div>
    
              <button
                onClick={() => {
                  setPayrollSearchQuery("");
                  setPayrollFilterDepartment("All");
                  setSelectedPayrollMonth("2026-07");
                  setPayrollFilterStatus("All");
                  setPayrollCurrentPage(1);
                }}
                className="w-full rounded-xl bg-white border border-gray-250 hover:bg-gray-50 px-4 py-2.5 text-xs font-bold text-gray-700 transition flex items-center justify-center gap-1.5 shadow-xs"
              >
                <RotateCcw size={12} /> {t.payroll.clear}
              </button>
            </div>
    
            {/* Main Table */}
            <div className="rounded-[32px] bg-white border border-[#414E36]/10 shadow-[0_20px_60px_rgba(47,61,41,0.06)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                     <tr className="border-b border-[#414E36]/10 bg-[#F9F9F7]">
                       <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51] whitespace-nowrap">{t.payroll.employee}</th>
                       <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51] whitespace-nowrap">{t.payroll.department}</th>
                       <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51] whitespace-nowrap">{t.payroll.role}</th>
                       <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51] whitespace-nowrap">{t.payroll.workingHours}</th>
                       <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51] whitespace-nowrap">{t.payroll.basicSalary}</th>
                       <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51] whitespace-nowrap">{t.payroll.bonuses}</th>
                       <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51] whitespace-nowrap">{t.payroll.deductions}</th>
                       <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51] whitespace-nowrap">{t.payroll.target}</th>
                       <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51] whitespace-nowrap">{t.payroll.perfBonus}</th>
                       <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51] whitespace-nowrap">{t.payroll.netSalary}</th>
                       <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51] whitespace-nowrap text-center">{t.payroll.status}</th>
                       <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51] whitespace-nowrap">{t.payroll.date}</th>
                       <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51] whitespace-nowrap">{t.payroll.actions}</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-[#414E36]/5">
                    {paged.length === 0 ? (
                      <tr>
                        <td colSpan={14} className="px-6 py-16 text-center text-sm text-[#5A6A51] font-medium">
                          {t.payroll.noRecords}
                        </td>
                      </tr>
                    ) : (
                      paged.map((pay: any) => {
                        const empObj = pay.employee_accounts || {};
                        const isPaid = pay.status === "Paid";
                        const isPast = pay.month < "2026-07";
                        const statusLabel = isPaid ? "Paid" : (isPast ? "Overdue" : "Pending");
                        const statusDisplay = isPaid ? t.payroll.paid : (isPast ? t.payroll.overdue : t.payroll.pending);
                        
                        const initials = empObj.name ? empObj.name.split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase() : "EM";
    
                        return (
                          <tr key={pay.id} className="transition hover:bg-[#F9F9F7]">
                            {/* Employee Name (Avatar + Name + Email) */}
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-[#EDF1EC] text-[#414E36] border border-[#414E36]/10 flex items-center justify-center text-[10px] font-bold shrink-0">
                                  {initials}
                                </div>
                                <div>
                                  <div className="font-semibold text-[#1F251A] text-sm">{empObj.name || "—"}</div>
                                  <div className="text-[10px] text-[#5A6A51]">{empObj.email || "—"}</div>
                                </div>
                              </div>
                            </td>
                            {/* Department */}
                            <td className="px-5 py-4 whitespace-nowrap">
                              <span className="inline-block rounded-lg bg-[#C4AE7C]/15 px-2.5 py-1 text-xs font-semibold text-[#8B7544]">
                                {empObj.department || "Reception"}
                              </span>
                            </td>
                            {/* Role */}
                            <td className="px-5 py-4 whitespace-nowrap text-xs font-semibold text-[#1F251A]">
                              {empObj.role_name || "Staff"}
                            </td>
                            {/* Working Hours */}
                            <td className="px-5 py-4 whitespace-nowrap">
                              <div className="text-xs font-semibold text-[#1F251A]">{t.payroll.sunThu}</div>
                              <div className="text-[10px] text-[#5A6A51]">
                                {empObj.shift === "Night" ? t.payroll.nightShiftHours : t.payroll.dayShiftHours}
                              </div>
                            </td>
                            {/* Basic Salary */}
                            <td className="px-5 py-4 whitespace-nowrap text-xs font-mono font-bold text-[#1F251A]">
                              {t.egp} {Number(pay.basic_salary || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            {/* Bonuses */}
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1.5 bg-[#FBFBF9] border border-[#414E36]/15 rounded-lg px-2 py-1 w-24">
                                <span className="text-[10px] font-bold text-[#5A6A51]">{t.egp}</span>
                                <input
                                  type="number"
                                  value={pay.bonuses}
                                  disabled={isPaid}
                                  onChange={async (e) => {
                                    const val = Number(e.target.value);
                                    setPayrollList(prev => prev.map(p => p.id === pay.id ? { ...p, bonuses: val, net_salary: p.basic_salary + val - p.deductions } : p));
                                    await fetch('/api/hr/payroll', {
                                      method: 'PATCH',
                                      headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${session?.access_token}`
                                      },
                                      body: JSON.stringify({ id: pay.id, bonuses: val })
                                    });
                                  }}
                                  className="w-full bg-transparent text-right text-xs font-mono font-bold text-[#1F251A] outline-none disabled:opacity-60"
                                />
                              </div>
                            </td>
                            {/* Deductions */}
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1.5 bg-[#FBFBF9] border border-[#414E36]/15 rounded-lg px-2 py-1 w-24">
                                <span className="text-[10px] font-bold text-[#5A6A51]">{t.egp}</span>
                                <input
                                  type="number"
                                  value={pay.deductions}
                                  disabled={isPaid}
                                  onChange={async (e) => {
                                    const val = Number(e.target.value);
                                    setPayrollList(prev => prev.map(p => p.id === pay.id ? { ...p, deductions: val, net_salary: p.basic_salary + p.bonuses - val } : p));
                                    await fetch('/api/hr/payroll', {
                                      method: 'PATCH',
                                      headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${session?.access_token}`
                                      },
                                      body: JSON.stringify({ id: pay.id, deductions: val })
                                    });
                                  }}
                                  className="w-full bg-transparent text-right text-xs font-mono font-bold text-[#1F251A] outline-none disabled:opacity-60"
                                />
                              </div>
                            </td>
                            {/* Target Progress */}
                            <td className="px-6 py-4">
                              {pay.target_amount_snapshot > 0 ? (
                                <div className="text-xs">
                                  <div className="font-semibold text-[#1F251A]">
                                    {t.egp} {Number(pay.achieved_revenue || 0).toLocaleString("en-GB")}
                                  </div>
                                  <div className="text-[10px] text-[#5A6A51] font-medium">
                                    {t.payroll.of} {t.egp} {Number(pay.target_amount_snapshot).toLocaleString("en-GB")}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-[#5A6A51]/60 font-semibold">—</span>
                              )}
                            </td>
                            {/* Performance Bonus */}
                            <td className="px-6 py-4">
                              <div className="text-xs font-semibold text-[#1F251A]">
                                {t.egp} {Number(pay.calculated_bonus || 0).toLocaleString("en-GB")}
                                {Number(pay.calculated_bonus || 0) > 0 && (
                                  <div className="text-[9px] font-bold text-green-700">
                                    ({pay.bonus_percentage_snapshot}%)
                                  </div>
                                )}
                              </div>
                            </td>
                            {/* Net Salary */}
                            <td className="px-5 py-4 whitespace-nowrap text-xs font-mono font-bold text-[#1F251A]">
                              {t.egp} {Number(pay.net_salary || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            {/* Payment Status (Badges with Dot) */}
                            <td className="px-6 py-4 text-center">
                              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                                statusLabel === "Paid"
                                  ? "bg-[#EDF1EC] text-[#414E36] border border-[#414E36]/15"
                                  : statusLabel === "Overdue"
                                  ? "bg-red-50 text-red-700 border border-red-100"
                                  : "bg-[#EDE4C8] text-[#8B7544] border border-[#C4AE7C]/30"
                              }`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${
                                  statusLabel === "Paid" ? "bg-[#414E36]" : statusLabel === "Overdue" ? "bg-red-650" : "bg-[#C4AE7C]"
                                }`} />
                                {statusDisplay}
                              </span>
                            </td>
                            {/* Payment Date */}
                            <td className="px-6 py-4 text-xs font-semibold text-[#1F251A]">
                              {isPaid ? getPaymentDate(pay.month) : "—"}
                            </td>
                            {/* Actions */}
                             <td className="px-5 py-4 text-right whitespace-nowrap">
                               <div className="flex items-center justify-end gap-1.5">
                                 <button
                                   onClick={() => {
                                     if (empObj.id) {
                                       setViewingEmployee(empObj);
                                     }
                                   }}
                                   title={t.payroll.viewDetails}
                                   className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#414E36]/15 text-[#5A6A51] transition hover:border-[#C4AE7C] hover:text-[#414E36]"
                                 >
                                   <Eye size={14} />
                                 </button>
                                 
                                 {!isPaid ? (
                                   <button
                                     onClick={async () => {
                                       if (!(await showConfirm(t.payroll.payConfirm(empObj.name || "—")))) return;
                                       try {
                                         const res = await fetch('/api/hr/payroll', {
                                           method: 'PATCH',
                                           headers: {
                                             'Content-Type': 'application/json',
                                             'Authorization': `Bearer ${session?.access_token}`
                                           },
                                           body: JSON.stringify({ id: pay.id, status: 'Paid' })
                                         });
                                         if (res.ok) {
                                           fetchHrPayroll();
                                         }
                                       } catch (e) {
                                         alert(t.payroll.payFailed);
                                       }
                                     }}
                                     className="inline-flex h-7 px-2.5 items-center justify-center rounded-full border border-emerald-200/60 bg-emerald-50/50 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100/80"
                                   >
                                     {t.payroll.pay}
                                   </button>
                                 ) : (
                                   <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-green-200/60 bg-green-50 text-green-700">
                                     <Check size={13} />
                                   </span>
                                 )}
                               </div>
                             </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
    
              {/* Pagination Footer */}
              {filtered.length > 0 && (
                <div className="p-6 border-t border-[#414E36]/10 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white">
                  <span className="text-xs font-semibold text-[#5A6A51]">
                    {t.payroll.showingResults(startIndex + 1, Math.min(endIndex, filtered.length), filtered.length)}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={activePage === 1}
                      onClick={() => setPayrollCurrentPage(prev => Math.max(prev - 1, 1))}
                      className="p-2 rounded-lg border border-gray-250 hover:bg-[#EDF1EC]/20 text-[#5A6A51] disabled:opacity-40 disabled:hover:bg-transparent transition text-xs font-bold"
                    >
                      &lt;
                    </button>
                    {Array.from({ length: totalPages }).map((_, i) => {
                      const pNum = i + 1;
                      return (
                        <button
                          key={pNum}
                          onClick={() => setPayrollCurrentPage(pNum)}
                          className={`h-8 w-8 rounded-lg text-xs font-bold transition flex items-center justify-center ${
                            activePage === pNum
                              ? "bg-[#414E36] text-white"
                              : "border border-gray-250 text-[#5A6A51] hover:bg-[#EDF1EC]/20"
                          }`}
                        >
                          {pNum}
                        </button>
                      );
                    })}
                    <button
                      disabled={activePage === totalPages}
                      onClick={() => setPayrollCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      className="p-2 rounded-lg border border-gray-250 hover:bg-[#EDF1EC]/20 text-[#5A6A51] disabled:opacity-40 disabled:hover:bg-transparent transition text-xs font-bold"
                    >
                      &gt;
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    
      {/* Doctor Payroll Sub-tab */}
      {hrActiveSubTab === "doctor-payroll" && (() => {
        // Filter doctor payroll records
        const filtered = doctorPayrollList.filter((pay: any) => {
          // Search Query
          if (doctorPayrollSearchQuery.trim()) {
            const q = doctorPayrollSearchQuery.toLowerCase();
            const nameMatch = pay.doctor?.name?.toLowerCase().includes(q);
            const emailMatch = pay.doctor?.email?.toLowerCase().includes(q);
            const idMatch = pay.doctor?.employee_id?.toLowerCase().includes(q);
            if (!nameMatch && !emailMatch && !idMatch) return false;
          }
    
          // Month
          if (selectedDoctorPayrollMonth !== "All" && selectedDoctorPayrollMonth) {
            if (pay.month !== selectedDoctorPayrollMonth) return false;
          }
    
          // Status
          if (doctorPayrollFilterStatus !== "All") {
            const status = pay.status || "Unpaid";
            if (doctorPayrollFilterStatus === "Paid" && status !== "Paid") return false;
            if (doctorPayrollFilterStatus === "Pending" && status === "Paid") return false;
          }
    
          return true;
        });
    
        // Pagination calculations
        const itemsPerPage = 10;
        const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
        const activePage = Math.min(doctorPayrollCurrentPage, totalPages);
        const startIndex = (activePage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paged = filtered.slice(startIndex, endIndex);
    
        const getPaymentDate = (monthStr: string) => {
          if (!monthStr) return "—";
          const parts = monthStr.split("-");
          if (parts.length < 2) return "—";
          const year = parts[0];
          const monthNum = parseInt(parts[1], 10);
          const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          const monthName = months[monthNum - 1] || "May";
          return `05 ${monthName} ${year}`;
        };
    
        return (
          <div className="space-y-6 animate-fadeIn">
            {/* Title & Action Buttons Row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-4xl font-semibold text-[#1F251A]">{t.doctorPayroll.heading}</h2>
                <p className="mt-1 text-xs text-[#8A9A81] font-medium">{t.doctorPayroll.breadcrumb}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={async () => {
                    if (selectedDoctorPayrollMonth === "All") {
                      alert(t.doctorPayroll.selectMonthAlert);
                      return;
                    }
                    try {
                      const res = await fetch('/api/hr/doctor-payroll', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${session?.access_token}`
                        },
                        body: JSON.stringify({ month: selectedDoctorPayrollMonth })
                      });
                      if (res.ok) {
                        alert(t.doctorPayroll.successMsg);
                        fetchDoctorPayroll();
                      } else {
                        const err = await res.json();
                        alert(err.error || t.doctorPayroll.failedMsg);
                      }
                    } catch (err) {
                      alert(t.doctorPayroll.apiFailed);
                    }
                  }}
                  className="rounded-xl bg-[#414E36] px-4 py-2.5 text-xs font-bold text-[#FBFBF9] hover:bg-[#2e3a26] transition flex items-center gap-2 shadow-xs"
                >
                  <Plus size={14} /> {t.doctorPayroll.add}
                </button>
                <button
                  onClick={() => window.print()}
                  className="rounded-xl bg-white border border-[#414E36]/15 px-4 py-2.5 text-xs font-bold text-[#414E36] hover:bg-[#EDF1EC]/20 transition flex items-center gap-2 shadow-xs"
                >
                  <Download size={14} /> {t.doctorPayroll.export}
                </button>
              </div>
            </div>
    
            {/* Search & Filter Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 rounded-3xl border border-[#414E36]/10 bg-white shadow-xs">
              <div className="relative md:col-span-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5A6A51]/65" />
                <input
                  type="text"
                  placeholder={t.doctorPayroll.searchPlaceholder}
                  value={doctorPayrollSearchQuery}
                  onChange={(e) => {
                    setDoctorPayrollSearchQuery(e.target.value);
                    setDoctorPayrollCurrentPage(1);
                  }}
                  className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] pl-10 pr-4 py-2.5 text-xs font-semibold text-[#1F251A] outline-none focus:border-[#C4AE7C] transition placeholder:text-gray-400"
                />
              </div>
    
              <div>
                <select
                  value={selectedDoctorPayrollMonth}
                  onChange={(e) => {
                    setSelectedDoctorPayrollMonth(e.target.value);
                    setDoctorPayrollCurrentPage(1);
                  }}
                  className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3.5 py-2.5 text-xs font-semibold text-[#414E36] outline-none focus:border-[#C4AE7C] cursor-pointer"
                >
                  <option value="All">{t.doctorPayroll.allMonths}</option>
                  <option value="2026-05">May 2026</option>
                  <option value="2026-06">June 2026</option>
                  <option value="2026-07">July 2026</option>
                  <option value="2026-08">August 2026</option>
                </select>
              </div>
    
              <div>
                <select
                  value={doctorPayrollFilterStatus}
                  onChange={(e) => {
                    setDoctorPayrollFilterStatus(e.target.value);
                    setDoctorPayrollCurrentPage(1);
                  }}
                  className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3.5 py-2.5 text-xs font-semibold text-[#414E36] outline-none focus:border-[#C4AE7C] cursor-pointer"
                >
                  <option value="All">{t.doctorPayroll.allStatus}</option>
                  <option value="Paid">{t.doctorPayroll.paid}</option>
                  <option value="Pending">{t.doctorPayroll.pending}</option>
                </select>
              </div>
    
              <button
                onClick={() => {
                  setDoctorPayrollSearchQuery("");
                  setSelectedDoctorPayrollMonth("2026-07");
                  setDoctorPayrollFilterStatus("All");
                  setDoctorPayrollCurrentPage(1);
                }}
                className="w-full rounded-xl bg-white border border-gray-250 hover:bg-gray-50 px-4 py-2.5 text-xs font-bold text-gray-700 transition flex items-center justify-center gap-1.5 shadow-xs"
              >
                <RotateCcw size={12} /> {t.doctorPayroll.clear}
              </button>
            </div>
    
            {/* Main Table */}
            <div className="rounded-[32px] bg-white border border-[#414E36]/10 shadow-[0_20px_60px_rgba(47,61,41,0.06)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="bg-[#EDF1EC] text-[10px] font-bold uppercase tracking-widest text-[#414E36] border-b border-[#414E36]/10">
                      <th className="px-6 py-4">{t.doctorPayroll.doctorId}</th>
                      <th className="px-6 py-4">{t.doctorPayroll.doctorName}</th>
                      <th className="px-6 py-4">{t.doctorPayroll.month}</th>
                      <th className="px-6 py-4">{t.doctorPayroll.fixedSalary}</th>
                      <th className="px-6 py-4">{t.doctorPayroll.bookingsCount}</th>
                      <th className="px-6 py-4">{t.doctorPayroll.totalBookingValue}</th>
                      <th className="px-6 py-4">{t.doctorPayroll.commission}</th>
                      <th className="px-6 py-4">{t.doctorPayroll.netSalary}</th>
                      <th className="px-6 py-4 text-center">{t.doctorPayroll.paymentStatus}</th>
                      <th className="px-6 py-4">{t.doctorPayroll.paymentDate}</th>
                      <th className="px-6 py-4 text-right">{t.doctorPayroll.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#414E36]/5">
                    {paged.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="px-6 py-16 text-center text-sm text-[#5A6A51] font-medium">
                          {t.doctorPayroll.noRecords}
                        </td>
                      </tr>
                    ) : (
                      paged.map((pay: any) => {
                        const docObj = pay.doctor || {};
                        const isPaid = pay.status === "Paid";
                        const statusLabel = isPaid ? "Paid" : "Pending";
                        const statusDisplay = isPaid ? t.doctorPayroll.paid : t.doctorPayroll.pending;
                        const initials = docObj.name ? docObj.name.split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase() : "DR";
    
                        return (
                          <tr key={pay.id} className="hover:bg-[#EDF1EC]/30 transition-colors">
                            <td className="px-6 py-4 text-xs font-mono font-bold text-[#5A6A51] uppercase">
                              {docObj.employee_id || `DR-${pay.id?.slice(0, 3)}`}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-[#EDF1EC] text-[#414E36] border border-[#414E36]/10 flex items-center justify-center text-[10px] font-bold shrink-0">
                                  {initials}
                                </div>
                                <div>
                                  <div className="font-semibold text-[#1F251A] text-sm">{docObj.name || "—"}</div>
                                  <div className="text-[10px] text-[#5A6A51]">{docObj.specialization || docObj.role_name || "Doctor"}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-xs font-semibold text-[#1F251A]">
                              {pay.month}
                            </td>
                            <td className="px-6 py-4 text-xs font-mono font-bold text-[#1F251A]">
                              {t.egp} {Number(pay.fixed_salary_snapshot || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4 text-xs font-semibold text-[#1F251A]">
                              {pay.reservations_count || 0}
                            </td>
                            <td className="px-6 py-4 text-xs font-mono font-bold text-[#1F251A]">
                              {t.egp} {Number(pay.total_reservations_value || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-xs font-semibold text-[#1F251A]">
                                {t.egp} {Number(pay.calculated_commission || 0).toLocaleString("en-GB")}
                                {pay.commission_type_snapshot !== "none" && (
                                  <div className="text-[9px] font-bold text-[#8B7544]">
                                    ({pay.commission_type_snapshot === "percentage" ? `${pay.commission_value_snapshot}%` : `${t.egp} ${pay.commission_value_snapshot} ${t.doctorPayroll.each}`})
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-xs font-mono font-bold text-[#1F251A]">
                              {t.egp} {Number(pay.net_salary || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                                isPaid
                                  ? "bg-[#EDF1EC] text-[#414E36] border border-[#414E36]/15"
                                  : "bg-[#EDE4C8] text-[#8B7544] border border-[#C4AE7C]/30"
                              }`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${
                                  isPaid ? "bg-[#414E36]" : "bg-[#C4AE7C]"
                                }`} />
                                {statusDisplay}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-xs font-semibold text-[#1F251A]">
                              {isPaid ? getPaymentDate(pay.month) : "—"}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {!isPaid ? (
                                  <button
                                    onClick={async () => {
                                      if (!(await showConfirm(t.doctorPayroll.payConfirm(docObj.name || "—")))) return;
                                      try {
                                        const res = await fetch('/api/hr/doctor-payroll', {
                                          method: 'PATCH',
                                          headers: {
                                            'Content-Type': 'application/json',
                                            'Authorization': `Bearer ${session?.access_token}`
                                          },
                                          body: JSON.stringify({ id: pay.id, status: 'Paid' })
                                        });
                                        if (res.ok) {
                                          fetchDoctorPayroll();
                                        }
                                      } catch (e) {
                                        alert(t.doctorPayroll.payFailed);
                                      }
                                    }}
                                    className="rounded-lg bg-[#414E36] hover:bg-[#2e3a26] text-[#FBFBF9] px-3.5 py-1.5 text-xs font-bold transition shadow-xs"
                                  >
                                    {t.doctorPayroll.pay}
                                  </button>
                                ) : (
                                  <button
                                    disabled
                                    className="p-2 text-gray-300 cursor-not-allowed"
                                  >
                                    <MoreVertical size={14} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
    
              {/* Pagination Footer */}
              {filtered.length > 0 && (
                <div className="p-6 border-t border-[#414E36]/10 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white">
                  <span className="text-xs font-semibold text-[#5A6A51]">
                    {t.doctorPayroll.showingResults(startIndex + 1, Math.min(endIndex, filtered.length), filtered.length)}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={activePage === 1}
                      onClick={() => setDoctorPayrollCurrentPage(prev => Math.max(prev - 1, 1))}
                      className="p-2 rounded-lg border border-gray-250 hover:bg-[#EDF1EC]/20 text-[#5A6A51] disabled:opacity-40 disabled:hover:bg-transparent transition text-xs font-bold"
                    >
                      &lt;
                    </button>
                    {Array.from({ length: totalPages }).map((_, i) => {
                      const pNum = i + 1;
                      return (
                        <button
                          key={pNum}
                          onClick={() => setDoctorPayrollCurrentPage(pNum)}
                          className={`h-8 w-8 rounded-lg text-xs font-bold transition flex items-center justify-center ${
                            activePage === pNum
                              ? "bg-[#414E36] text-white"
                              : "border border-gray-250 text-[#5A6A51] hover:bg-[#EDF1EC]/20"
                          }`}
                        >
                          {pNum}
                        </button>
                      );
                    })}
                    <button
                      disabled={activePage === totalPages}
                      onClick={() => setDoctorPayrollCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      className="p-2 rounded-lg border border-gray-250 hover:bg-[#EDF1EC]/20 text-[#5A6A51] disabled:opacity-40 disabled:hover:bg-transparent transition text-xs font-bold"
                    >
                      &gt;
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    
      {/* Leaves Sub-tab */}
      {hrActiveSubTab === "leaves" && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Leave Request List */}
          <div className="lg:col-span-2">
            <div className="overflow-x-auto rounded-2xl border border-[#414E36]/10 bg-white shadow-sm">
              <div className="px-5 py-4 border-b border-[#414E36]/10 flex items-center justify-between">
                <h3 className="text-base font-bold text-[#1F251A]">{t.leaves.heading}</h3>
              </div>
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="border-b border-[#414E36]/10 bg-[#F9F9F7]">
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51] whitespace-nowrap">{t.leaves.employee}</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51] whitespace-nowrap">{t.leaves.type}</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51] whitespace-nowrap">{t.leaves.dates}</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51] whitespace-nowrap">{t.leaves.days}</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51] whitespace-nowrap">{t.leaves.reason}</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51] whitespace-nowrap">{t.leaves.status}</th>
                    <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51] whitespace-nowrap">{t.leaves.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#414E36]/5">
                  {leavesList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center text-sm text-[#5A6A51] font-medium">
                        {t.leaves.noRecords}
                      </td>
                    </tr>
                  ) : (
                    leavesList.map((leave: any) => (
                      <tr key={leave.id} className="transition hover:bg-[#F9F9F7]">
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-[#EDF1EC] text-[#414E36] border border-[#414E36]/10 flex items-center justify-center text-xs font-bold font-serif shrink-0">
                              {leave.employee_accounts?.name ? leave.employee_accounts.name.charAt(0).toUpperCase() : "E"}
                            </div>
                            <div>
                              <div className="font-semibold text-[#1F251A] text-sm">{leave.employee_accounts?.name || "—"}</div>
                              <div className="text-xs text-[#5A6A51]">{leave.employee_accounts?.role_name || "—"}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-xs font-semibold text-[#1F251A]">{leave.leave_type}</td>
                        <td className="px-5 py-4 whitespace-nowrap text-xs text-[#1F251A]">
                          {leave.start_date} → {leave.end_date}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-xs font-mono font-bold text-[#1F251A]">{leave.days_count}d</td>
                        <td className="px-5 py-4 text-xs text-[#5A6A51] max-w-[140px] truncate" title={leave.reason}>{leave.reason || "—"}</td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                            leave.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' :
                            leave.status === 'Rejected' ? 'bg-rose-50 text-rose-700 border-rose-200/60' :
                            'bg-amber-50 text-amber-700 border-amber-200/60'
                          }`}>
                            {leave.status === 'Approved' ? t.leaves.statusApproved : leave.status === 'Rejected' ? t.leaves.statusRejected : t.leaves.statusPending}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          {leave.status === "Pending" ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={async () => {
                                  const profileEmployee = employeesList.find(emp => emp.email?.toLowerCase() === adminEmail?.toLowerCase());
                                  await fetch('/api/hr/leaves', {
                                    method: 'PATCH',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      'Authorization': `Bearer ${session?.access_token}`
                                    },
                                    body: JSON.stringify({ id: leave.id, status: 'Approved', approvedBy: profileEmployee?.id || null })
                                  });
                                  fetchHrLeaves();
                                }}
                                title={t.leaves.approve}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-emerald-200/60 text-emerald-700 bg-emerald-50 transition hover:bg-emerald-100"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                onClick={async () => {
                                  const profileEmployee = employeesList.find(emp => emp.email?.toLowerCase() === adminEmail?.toLowerCase());
                                  await fetch('/api/hr/leaves', {
                                    method: 'PATCH',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      'Authorization': `Bearer ${session?.access_token}`
                                    },
                                    body: JSON.stringify({ id: leave.id, status: 'Rejected', approvedBy: profileEmployee?.id || null })
                                  });
                                  fetchHrLeaves();
                                }}
                                title={t.leaves.reject}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-rose-200/60 text-rose-700 bg-rose-50 transition hover:bg-rose-100"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-[#5A6A51]/50 font-medium">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
    
          {/* Submit Leave Request */}
          <div className="rounded-[32px] bg-white border border-[#414E36]/10 p-6 shadow-sm h-fit">
            <h3 className="text-lg font-bold text-[#1F251A] mb-4">{t.leaves.requestLeave}</h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newLeaveEmployeeId || !newLeaveStartDate || !newLeaveEndDate) {
                  alert(t.leaves.allFieldsRequired);
                  return;
                }
                try {
                  const res = await fetch('/api/hr/leaves', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${session?.access_token}`
                    },
                    body: JSON.stringify({
                      employeeId: newLeaveEmployeeId,
                      leaveType: newLeaveType,
                      startDate: newLeaveStartDate,
                      endDate: newLeaveEndDate,
                      reason: newLeaveReason
                    })
                  });
                  if (res.ok) {
                    setNewLeaveStartDate("");
                    setNewLeaveEndDate("");
                    setNewLeaveReason("");
                    fetchHrLeaves();
                    alert(t.leaves.submitSuccess);
                  } else {
                    const err = await res.json();
                    alert(err.error || t.leaves.submitFailed);
                  }
                } catch (err) {
                  alert(t.leaves.submitFailed);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-[#5A6A51] mb-1.5">{t.leaves.employee}</label>
                <select
                  value={newLeaveEmployeeId}
                  onChange={(e) => setNewLeaveEmployeeId(e.target.value)}
                  className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm text-[#414E36] outline-none"
                  required
                >
                  <option value="">{t.leaves.selectEmployee}</option>
                  {employeesList.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>
    
              <div>
                <label className="block text-xs font-bold text-[#5A6A51] mb-1.5">{t.leaves.type}</label>
                <select
                  value={newLeaveType}
                  onChange={(e) => setNewLeaveType(e.target.value)}
                  className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm text-[#414E36] outline-none"
                >
                  <option value="Sick">{t.leaves.sickLeave}</option>
                  <option value="Annual">{t.leaves.annualLeave}</option>
                  <option value="Casual">{t.leaves.casualLeave}</option>
                  <option value="Unpaid">{t.leaves.unpaidLeave}</option>
                </select>
              </div>
    
              <div className="grid gap-4 grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-[#5A6A51] mb-1.5">{t.leaves.startDate}</label>
                  <input
                    type="date"
                    value={newLeaveStartDate}
                    onChange={(e) => setNewLeaveStartDate(e.target.value)}
                    className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm text-[#414E36] outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#5A6A51] mb-1.5">{t.leaves.endDate}</label>
                  <input
                    type="date"
                    value={newLeaveEndDate}
                    onChange={(e) => setNewLeaveEndDate(e.target.value)}
                    className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm text-[#414E36] outline-none"
                    required
                  />
                </div>
              </div>
    
              <div>
                <label className="block text-xs font-bold text-[#5A6A51] mb-1.5">{t.leaves.reason}</label>
                <textarea
                  placeholder={t.leaves.reasonPlaceholder}
                  value={newLeaveReason}
                  onChange={(e) => setNewLeaveReason(e.target.value)}
                  className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm text-[#1F251A] outline-none h-20 resize-none"
                />
              </div>
    
              <button
                type="submit"
                className="w-full rounded-2xl bg-[#414E36] py-3 text-sm font-bold text-[#FBFBF9] hover:bg-[#2e3a26] transition"
              >
                {t.leaves.submit}
              </button>
            </form>
          </div>
        </div>
      )}
    
      {/* Performance Reviews Sub-tab */}
      {hrActiveSubTab === "performance" && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Reviews Timeline List */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-xl font-bold text-[#1F251A] mb-2">{t.performance.heading}</h3>
            {performanceReviews.length === 0 ? (
              <div className="rounded-[32px] border border-[#414E36]/10 bg-white p-12 text-center text-sm text-[#5A6A51]">
                {t.performance.noReviews}
              </div>
            ) : (
              performanceReviews.map((rev: any) => (
                <div key={rev.id} className="rounded-[32px] border border-[#414E36]/10 bg-white p-6 shadow-sm relative hover:border-[#414E36]/30 transition-all">
                  <button
                    onClick={async () => {
                      if (!(await showConfirm(t.performance.deleteConfirm))) return;
                      await fetch(`/api/hr/performance?id=${rev.id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${session?.access_token}` }
                      });
                      fetchHrPerformance();
                    }}
                    className="absolute top-6 right-6 text-rose-600 hover:text-rose-700 transition"
                    title={t.performance.deleteTitle}
                  >
                    <Trash2 size={16} />
                  </button>
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-[#C4AE7C]/15 text-[#414E36] flex items-center justify-center font-bold text-sm shrink-0">
                      {rev.employee_accounts?.name?.slice(0, 2).toUpperCase() || "??"}
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-[#1F251A]">{rev.employee_accounts?.name || "—"}</h4>
                      <p className="text-xs text-[#5A6A51]">{t.performance.roleLabel} {rev.employee_accounts?.role_name || "—"}</p>
                      <div className="flex items-center gap-1.5 py-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={14}
                            className={i < rev.rating ? "text-amber-400 fill-amber-400" : "text-gray-300"}
                          />
                        ))}
                        <span className="text-xs text-[#5A6A51] ml-1 font-semibold">{rev.review_date}</span>
                      </div>
                      <div className="mt-3 text-sm text-[#1F251A] bg-[#FBFBF9] p-3 rounded-2xl border border-[#414E36]/5">
                        <p className="font-semibold text-xs text-[#5A6A51] mb-1">{t.performance.evaluatorNotes}</p>
                        <p className="leading-relaxed">{rev.comments || t.performance.noComments}</p>
                      </div>
                      {rev.goals && (
                        <div className="mt-2 text-sm text-[#1F251A] bg-[#C4AE7C]/5 p-3 rounded-2xl border border-[#C4AE7C]/10">
                          <p className="font-semibold text-xs text-[#8B7544] mb-1">{t.performance.targetGoals}</p>
                          <p className="leading-relaxed">{rev.goals}</p>
                        </div>
                      )}
                      <p className="text-[10px] text-[#5A6A51] mt-3">{t.performance.evaluatedBy} {rev.reviewer?.name || t.performance.systemFallback}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
    
          {/* Create Review Form */}
          <div className="rounded-[32px] bg-white border border-[#414E36]/10 p-6 shadow-sm h-fit">
            <h3 className="text-lg font-bold text-[#1F251A] mb-4">{t.performance.addReview}</h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newReviewEmployeeId) {
                  alert(t.performance.selectEmployeeAlert);
                  return;
                }
                const profileEmployee = employeesList.find(emp => emp.email?.toLowerCase() === adminEmail?.toLowerCase());
                try {
                  const res = await fetch('/api/hr/performance', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${session?.access_token}`
                    },
                    body: JSON.stringify({
                      employeeId: newReviewEmployeeId,
                      reviewerId: profileEmployee?.id || newReviewEmployeeId,
                      rating: newReviewRating,
                      comments: newReviewComments,
                      goals: newReviewGoals
                    })
                  });
                  if (res.ok) {
                    setNewReviewComments("");
                    setNewReviewGoals("");
                    fetchHrPerformance();
                    alert(t.performance.createSuccess);
                  } else {
                    const err = await res.json();
                    alert(err.error || t.performance.createFailed);
                  }
                } catch (err) {
                  alert(t.performance.submitFailed);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-[#5A6A51] mb-1.5">{t.performance.employeeUnderReview}</label>
                <select
                  value={newReviewEmployeeId}
                  onChange={(e) => setNewReviewEmployeeId(e.target.value)}
                  className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm text-[#414E36] outline-none"
                  required
                >
                  <option value="">{t.performance.selectEmployee}</option>
                  {employeesList.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>
    
              <div>
                <label className="block text-xs font-bold text-[#5A6A51] mb-1.5">{t.performance.ratingLabel}</label>
                <select
                  value={newReviewRating}
                  onChange={(e) => setNewReviewRating(Number(e.target.value))}
                  className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm text-[#414E36] outline-none"
                >
                  <option value={5}>{t.performance.rating5}</option>
                  <option value={4}>{t.performance.rating4}</option>
                  <option value={3}>{t.performance.rating3}</option>
                  <option value={2}>{t.performance.rating2}</option>
                  <option value={1}>{t.performance.rating1}</option>
                </select>
              </div>
    
              <div>
                <label className="block text-xs font-bold text-[#5A6A51] mb-1.5">{t.performance.comments}</label>
                <textarea
                  placeholder={t.performance.commentsPlaceholder}
                  value={newReviewComments}
                  onChange={(e) => setNewReviewComments(e.target.value)}
                  className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm text-[#1F251A] outline-none h-24 resize-none"
                  required
                />
              </div>
    
              <div>
                <label className="block text-xs font-bold text-[#5A6A51] mb-1.5">{t.performance.goalsLabel}</label>
                <textarea
                  placeholder={t.performance.goalsPlaceholder}
                  value={newReviewGoals}
                  onChange={(e) => setNewReviewGoals(e.target.value)}
                  className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm text-[#1F251A] outline-none h-20 resize-none"
                />
              </div>
    
              <button
                type="submit"
                className="w-full rounded-2xl bg-[#414E36] py-3 text-sm font-bold text-[#FBFBF9] hover:bg-[#2e3a26] transition"
              >
                {t.performance.submit}
              </button>
            </form>
          </div>
        </div>
      )}
    
      {/* Attendance Sub-tab */}
      {hrActiveSubTab === "attendance" && (
        <div className="space-y-6">
          <div className="rounded-[32px] bg-white border border-[#414E36]/10 shadow-[0_20px_60px_rgba(47,61,41,0.06)] overflow-hidden">
            <div className="p-6 border-b border-[#414E36]/10">
              <h3 className="text-lg font-bold text-[#1F251A]">{t.attendance.heading}</h3>
              <p className="mt-1 text-xs text-[#5A6A51]">{t.attendance.subtitle}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-[#EDF1EC] text-[10px] font-bold uppercase tracking-widest text-[#414E36] border-b border-[#414E36]/10">
                    <th className="px-6 py-4">{t.attendance.employee}</th>
                    <th className="px-6 py-4">{t.attendance.date}</th>
                    <th className="px-6 py-4">{t.attendance.shift}</th>
                    <th className="px-6 py-4">{t.attendance.checkInTime}</th>
                    <th className="px-6 py-4">{t.attendance.checkOutTime}</th>
                    <th className="px-6 py-4">{t.attendance.onLeave}</th>
                    <th className="px-6 py-4">{t.attendance.locationGps}</th>
                    <th className="px-6 py-4">{t.attendance.status}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#414E36]/5">
                  {loadingAttendance ? (
                    <tr><td colSpan={8} className="px-6 py-16 text-center text-sm text-[#5A6A51]">{t.attendance.loadingRecords}</td></tr>
                  ) : attendanceList.length === 0 ? (
                    <tr><td colSpan={8} className="px-6 py-16 text-center text-sm text-[#5A6A51] font-medium">{t.attendance.noRecords}</td></tr>
                  ) : (
                    attendanceList.map((rec: any) => (
                      <tr key={rec.id} className="hover:bg-[#EDF1EC]/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-[#1F251A]">{rec.employee_accounts?.name || "—"}</div>
                          <div className="text-xs text-[#5A6A51]">{rec.employee_accounts?.role_name || "—"}</div>
                        </td>
                        <td className="px-6 py-4 text-xs text-[#1F251A]">{rec.date}</td>
                        <td className="px-6 py-4 text-xs">
                          <span className={`inline-block rounded-xl px-2.5 py-1 text-xs font-bold ${
                            (rec.employee_accounts?.shift || "").toLowerCase().includes("night") || (rec.employee_accounts?.shift || "").toLowerCase().includes("pm")
                              ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                              : "bg-amber-50 text-amber-700 border border-amber-100"
                          }`}>
                            {rec.employee_accounts?.shift || t.attendance.dayFallback}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-mono text-[#1F251A]">
                          {rec.check_in_time ? new Date(rec.check_in_time).toLocaleTimeString("en-GB", { hour: '2-digit', minute: '2-digit' }) : "—"}
                        </td>
                        <td className="px-6 py-4 text-xs font-mono text-[#1F251A]">
                          {rec.check_out_time ? new Date(rec.check_out_time).toLocaleTimeString("en-GB", { hour: '2-digit', minute: '2-digit' }) : "—"}
                        </td>
                        <td className="px-6 py-4 text-xs">
                          <span className={`inline-block rounded-xl px-2.5 py-1 text-xs font-bold ${
                            rec.leave_status && rec.leave_status !== 'No'
                              ? 'bg-purple-50 text-purple-700 border border-purple-100'
                              : 'text-[#5A6A51]'
                          }`}>
                            {rec.leave_status || t.attendance.noLeave}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-[#5A6A51]">
                          {rec.latitude && rec.longitude
                            ? `${Number(rec.latitude).toFixed(4)}, ${Number(rec.longitude).toFixed(4)}`
                            : "—"}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-block rounded-xl px-2.5 py-1 text-xs font-bold ${
                            rec.status === 'Present' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                            rec.status === 'Late' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                            'bg-rose-50 text-rose-700 border border-rose-100'
                          }`}>
                            {rec.status === 'Present' ? t.attendance.present : rec.status === 'Late' ? t.attendance.late : t.attendance.absent}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
    
          {/* Missing Alerts Log */}
          <div className="rounded-[32px] bg-white border border-[#414E36]/10 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-[#414E36]/10">
              <h3 className="text-lg font-bold text-[#1F251A]">{t.attendance.inactivityAlerts}</h3>
              <p className="mt-1 text-xs text-[#5A6A51]">{t.attendance.inactivitySubtitle}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-[#EDF1EC] text-[10px] font-bold uppercase tracking-widest text-[#414E36] border-b border-[#414E36]/10">
                    <th className="px-6 py-4">{t.attendance.employee}</th>
                    <th className="px-6 py-4">{t.attendance.alertTime}</th>
                    <th className="px-6 py-4">{t.attendance.status}</th>
                    <th className="px-6 py-4 text-right">{t.leaves.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#414E36]/5">
                  {activeMissingAlerts.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-sm text-[#5A6A51] font-medium">{t.attendance.noAlerts}</td></tr>
                  ) : (
                    activeMissingAlerts.map((a: any) => (
                      <tr key={a.id} className="hover:bg-rose-50/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-[#1F251A]">{a.employee_accounts?.name || "—"}</div>
                          <div className="text-xs text-[#5A6A51]">{a.employee_accounts?.role_name || "—"}</div>
                        </td>
                        <td className="px-6 py-4 text-xs text-[#1F251A]">{new Date(a.timestamp).toLocaleString("en-GB")}</td>
                        <td className="px-6 py-4">
                          <span className="inline-block rounded-xl px-2.5 py-1 text-xs font-bold bg-rose-50 text-rose-700 border border-rose-100">
                            {t.attendance.unresolved}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={async () => {
                              const res = await fetch('/api/hr/alerts', {
                                method: 'PATCH',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${session?.access_token}`
                                },
                                body: JSON.stringify({ id: a.id, resolved: true })
                              });
                              if (res.ok) fetchHrAlerts();
                            }}
                            className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition"
                          >
                            {t.attendance.resolve}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    
      {hrActiveSubTab === "targets" && (
        <div className="space-y-6 animate-fadeIn">
          {/* Title & Info */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-4xl font-semibold text-[#1F251A]">{t.targets.heading}</h2>
              <p className="mt-1 text-xs text-[#8A9A81] font-medium">{t.targets.breadcrumb}</p>
            </div>
          </div>
    
          <div className="rounded-[32px] bg-white border border-[#414E36]/10 shadow-[0_20px_60px_rgba(47,61,41,0.06)] overflow-hidden">
            <div className="p-6 border-b border-[#414E36]/10">
              <h3 className="text-lg font-bold text-[#1F251A]">{t.targets.title}</h3>
              <p className="mt-1 text-xs text-[#5A6A51]">{t.targets.subtitle}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-[#EDF1EC] text-[10px] font-bold uppercase tracking-widest text-[#414E36] border-b border-[#414E36]/10">
                    <th className="px-6 py-4">{t.targets.employeeInfo}</th>
                    <th className="px-6 py-4">{t.targets.monthlyTarget}</th>
                    <th className="px-6 py-4">{t.targets.targetType}</th>
                    <th className="px-6 py-4">{t.targets.bonusTarget}</th>
                    <th className="px-6 py-4">{t.targets.achieved}</th>
                    <th className="px-6 py-4">{t.targets.progress}</th>
                    <th className="px-6 py-4 text-right">{t.targets.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#414E36]/5">
                  {employeesList.map((emp: any) => {
                    const targetType = emp.targetType || "reservations";
                    const bonusType = emp.bonusType || "percentage";
                    const targetAmount = Number(emp.requiredTargetAmount || 0);
                    const bonusVal = Number(emp.bonusPercentage || 0);
    
                    const currentMonthStr = new Date().toISOString().slice(0, 7);
                    const currentMonthBookings = allReservations.filter((b) => {
                      const isApprovedOrCompleted = b.status === "approved" || b.status === "completed";
                      return b.createdByEmployeeId === emp.id && isApprovedOrCompleted && b.date && b.date.startsWith(currentMonthStr);
                    });
                    const achievedCount = currentMonthBookings.length;
                    const achievedRevenue = currentMonthBookings.reduce((sum, b) => {
                      const svc = localServices.find(s => s.id === b.serviceId);
                      const price = Number(b.amountPaid || 0) + Number(b.amountLeft || 0) || Number(svc?.price || 0);
                      return sum + price;
                    }, 0);
    
                    const achievedVal = targetType === "revenue" ? achievedRevenue : achievedCount;
                    const progressPercent = targetAmount > 0 ? Math.min(100, Math.round((achievedVal / targetAmount) * 100)) : 0;
                    const hasAchievedTarget = targetAmount > 0 && achievedVal >= targetAmount;
    
                    return (
                      <tr key={emp.id} className="hover:bg-[#EDF1EC]/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-[#1F251A]">{emp.name}</div>
                          <div className="text-xs text-[#5A6A51]">{emp.email} • {emp.role_name || t.targets.staffFallback}</div>
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold text-[#1F251A]">
                          {targetAmount > 0 ? (
                            targetType === "revenue" ? `${t.egp} ${targetAmount.toLocaleString("en-GB")}` : `${targetAmount} ${t.targets.reservationsLabel}`
                          ) : t.targets.noTarget}
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold text-[#1F251A] capitalize">
                          {targetType}
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold text-[#1F251A]">
                          {bonusVal > 0 ? (
                            bonusType === "fixed" ? `${t.egp} ${bonusVal.toLocaleString("en-GB")}` : `${bonusVal}% ${t.targets.ofSalary}`
                          ) : t.targets.noBonus}
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold text-[#1F251A]">
                          {targetType === "revenue" ? `${t.egp} ${achievedRevenue.toLocaleString("en-GB")}` : `${achievedCount} ${t.targets.reservationsLabel}`}
                        </td>
                        <td className="px-6 py-4 text-xs">
                          {targetAmount > 0 ? (
                            <div className="space-y-1 w-44">
                              <div className="flex items-center justify-between font-semibold text-[#5A6A51] text-[10px]">
                                <span>{progressPercent}%</span>
                                {hasAchievedTarget && <span className="text-green-700 font-bold">{t.targets.met}</span>}
                              </div>
                              <div className="w-full bg-gray-150 h-2 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full transition-all duration-500 rounded-full ${hasAchievedTarget ? "bg-green-600" : "bg-[#C4AE7C]"}`}
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-[#5A6A51] italic text-xs">{t.targets.na}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => {
                              setEditingTargetEmployee(emp);
                              setTargetAmountInput(String(emp.requiredTargetAmount || 0));
                              setBonusPercentageInput(String(emp.bonusPercentage || 0));
                              setTargetTypeInput(emp.targetType || "reservations");
                              setBonusTypeInput(emp.bonusType || "percentage");
                            }}
                            className="rounded-xl border border-[#414E36]/15 bg-white px-3.5 py-1.5 text-xs font-bold text-[#414E36] hover:bg-[#EDF1EC] transition shadow-xs"
                          >
                            {t.targets.editTarget}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
    {editingTargetEmployee && (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" dir={lang === "ar" ? "rtl" : "ltr"}>
        <div className="w-full max-w-md rounded-3xl bg-[#FBFBF9] p-6 shadow-2xl border border-[#414E36]/10">
          <div className="mb-5 flex items-center justify-between border-b border-[#414E36]/10 pb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C4AE7C]">{t.editTargetModal.title}</p>
              <h3 className="text-xl font-bold text-[#1F251A] mt-1">{editingTargetEmployee.name}</h3>
            </div>
            <button
              onClick={() => setEditingTargetEmployee(null)}
              className="rounded-full bg-gray-100 p-2 text-gray-500 hover:bg-gray-200 transition"
            >
              <X size={18} />
            </button>
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const res = await fetch('/api/employees', {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + (session?.access_token || '')
                  },
                  body: JSON.stringify({
                    id: editingTargetEmployee.id,
                    requiredTargetAmount: Number(targetAmountInput),
                    bonusPercentage: Number(bonusPercentageInput),
                    targetType: targetTypeInput,
                    bonusType: bonusTypeInput
                  })
                });
                if (res.ok) {
                  alert(t.editTargetModal.updateSuccess);
                  setEditingTargetEmployee(null);
                  clearFetchCache();
                  await fetchRolesAndEmployees();
                } else {
                  const err = await res.json();
                  alert(err.error || t.editTargetModal.updateFailed);
                }
              } catch (err) {
                alert(t.editTargetModal.updateError);
              }
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-bold text-[#5A6A51] mb-1.5">{t.editTargetModal.targetTypeLabel}</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTargetTypeInput("reservations")}
                  className={`rounded-2xl py-2.5 text-xs font-bold transition border ${
                    targetTypeInput === "reservations"
                      ? "bg-[#414E36] text-[#FBFBF9] border-[#414E36]"
                      : "bg-white text-[#5A6A51] border-[#414E36]/15 hover:bg-[#EDF1EC]"
                  }`}
                >
                  {t.editTargetModal.reservations}
                </button>
                <button
                  type="button"
                  onClick={() => setTargetTypeInput("revenue")}
                  className={`rounded-2xl py-2.5 text-xs font-bold transition border ${
                    targetTypeInput === "revenue"
                      ? "bg-[#414E36] text-[#FBFBF9] border-[#414E36]"
                      : "bg-white text-[#5A6A51] border-[#414E36]/15 hover:bg-[#EDF1EC]"
                  }`}
                >
                  {t.editTargetModal.revenue}
                </button>
              </div>
            </div>
    
            <div>
              <label className="block text-xs font-bold text-[#5A6A51] mb-1.5">
                {targetTypeInput === "revenue" ? t.editTargetModal.revenueLabel : t.editTargetModal.reservationsLabel}
              </label>
              <input
                type="number"
                value={targetAmountInput}
                onChange={(e) => setTargetAmountInput(e.target.value)}
                className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C] transition"
                min="0"
                required
              />
            </div>
    
            <div>
              <label className="block text-xs font-bold text-[#5A6A51] mb-1.5">{t.editTargetModal.bonusTypeLabel}</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setBonusTypeInput("percentage")}
                  className={`rounded-2xl py-2.5 text-xs font-bold transition border ${
                    bonusTypeInput === "percentage"
                      ? "bg-[#414E36] text-[#FBFBF9] border-[#414E36]"
                      : "bg-white text-[#5A6A51] border-[#414E36]/15 hover:bg-[#EDF1EC]"
                  }`}
                >
                  {t.editTargetModal.percentage}
                </button>
                <button
                  type="button"
                  onClick={() => setBonusTypeInput("fixed")}
                  className={`rounded-2xl py-2.5 text-xs font-bold transition border ${
                    bonusTypeInput === "fixed"
                      ? "bg-[#414E36] text-[#FBFBF9] border-[#414E36]"
                      : "bg-white text-[#5A6A51] border-[#414E36]/15 hover:bg-[#EDF1EC]"
                  }`}
                >
                  {t.editTargetModal.fixedAmount}
                </button>
              </div>
            </div>
    
            <div>
              <label className="block text-xs font-bold text-[#5A6A51] mb-1.5">
                {bonusTypeInput === "fixed" ? t.editTargetModal.bonusFixedLabel : t.editTargetModal.bonusPercentageLabel}
              </label>
              <input
                type="number"
                value={bonusPercentageInput}
                onChange={(e) => setBonusPercentageInput(e.target.value)}
                className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C] transition"
                min="0"
                {...(bonusTypeInput === "percentage" ? { max: "100" } : {})}
                required
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingTargetEmployee(null)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-50 transition"
              >
                {t.editTargetModal.cancel}
              </button>
              <button
                type="submit"
                className="rounded-xl bg-[#414E36] px-5 py-2 text-xs font-bold text-[#FBFBF9] hover:bg-[#2e3a26] transition shadow-md"
              >
                {t.editTargetModal.save}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
</>
  );
}
