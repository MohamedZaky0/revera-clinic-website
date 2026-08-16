"use client";

import React, { useState, useEffect } from "react";
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
  CheckCircle2,
  AlertCircle
} from "lucide-react";

interface ReceptionDashboardViewProps {
  receptionistName?: string;
  receptionistRole?: string;
  employeeId?: string;
  email?: string;
  onNavigateTab?: (tabName: string) => void;
  onLogout?: () => void;
}

export default function ReceptionDashboardView({
  receptionistName = "Zaki Mohamed",
  receptionistRole = "Receptionist",
  employeeId,
  email,
  onNavigateTab,
  onLogout
}: ReceptionDashboardViewProps) {
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [shiftProcessing, setShiftProcessing] = useState(false);
  const [liveElapsedSeconds, setLiveElapsedSeconds] = useState(0);

  // Fetch Reception Dashboard data from backend API
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (employeeId) params.set("employeeId", employeeId);
      if (email) params.set("email", email);

      const res = await fetch(`/api/reception/dashboard?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setDashboardData(data);
        if (data.shift?.elapsedSeconds) {
          setLiveElapsedSeconds(data.shift.elapsedSeconds);
        }
      }
    } catch (err) {
      console.error("Failed to load reception dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [employeeId, email]);

  // Live timer for elapsed shift time ticker when shift is active
  useEffect(() => {
    if (dashboardData?.shift?.status !== "started") return;

    const interval = setInterval(() => {
      setLiveElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [dashboardData?.shift?.status]);

  const handleShiftAction = async () => {
    try {
      setShiftProcessing(true);
      const currentStatus = dashboardData?.shift?.status;
      const targetAction = currentStatus === "started" ? "end_shift" : "start_shift";

      const res = await fetch("/api/reception/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: targetAction,
          employeeId,
          email
        })
      });

      const result = await res.json();
      if (result.success) {
        await fetchDashboardData();
      }
    } catch (err) {
      console.error("Shift action failed:", err);
    } finally {
      setShiftProcessing(false);
    }
  };

  // Helper to format live elapsed time
  const formatElapsedTime = (totalSecs: number) => {
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    return `${hours}h ${mins}m`;
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
    scheduleHours: "8 Hours",
    shiftFromTo: "09:00 AM – 05:00 PM",
    actualStartingTime: "--:--",
    elapsedTime: "0h 0m",
    status: "not_started"
  };

  const targetInfo = dashboardData?.target || {
    targetAmount: 0,
    achievedAmount: 0,
    progressPercentage: 0,
    remainingAmount: 0
  };

  const bookingsInfo = dashboardData?.bookings || {
    todayCount: 0,
    pendingCount: 0,
    list: []
  };

  return (
    <div className="space-y-6 pb-8">
        {/* ── 1. Today's Shift Card ── */}
        <div className="bg-white rounded-3xl p-6 border border-[#EBE8E0] shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-[#F0F4EC] text-[#45523A] flex items-center justify-center">
                <Calendar size={20} />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-[#1F251A]">Today's Shift</h3>
                <p className="text-xs text-[#788272]">Your scheduled working hours</p>
              </div>
            </div>

            <button
              type="button"
              disabled={shiftProcessing}
              onClick={handleShiftAction}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm ${
                shiftInfo.status === "started"
                  ? "bg-[#26331E] text-white hover:bg-[#35452C]"
                  : "bg-[#45523A] text-white hover:bg-[#35452C]"
              } disabled:opacity-50`}
            >
              <LogOut size={15} />
              <span>{shiftProcessing ? "Updating..." : shiftInfo.status === "started" ? "End Shift" : "Start Shift"}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-2 border-t border-[#F3F0E8]">
            {/* Metric 1: Shift From - To */}
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-[#F7F5F0] text-[#55634B] flex items-center justify-center shrink-0 mt-0.5">
                <Clock size={18} />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-[#8C9686] uppercase tracking-wider">Shift From – To</p>
                <p className="text-sm font-bold text-[#1F251A] mt-0.5">{shiftInfo.shiftFromTo}</p>
                <p className="text-xs text-[#8C9686]">({shiftInfo.scheduleHours})</p>
              </div>
            </div>

            {/* Metric 2: Actual Starting Time */}
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-[#F7F5F0] text-[#55634B] flex items-center justify-center shrink-0 mt-0.5">
                <Play size={18} />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-[#8C9686] uppercase tracking-wider">Actual Starting Time</p>
                <p className="text-sm font-bold text-[#1F251A] mt-0.5">{shiftInfo.actualStartingTime}</p>
              </div>
            </div>

            {/* Metric 3: Elapsed Time */}
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-[#F7F5F0] text-[#55634B] flex items-center justify-center shrink-0 mt-0.5">
                <Timer size={18} />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-[#8C9686] uppercase tracking-wider">Elapsed Time</p>
                <p className="text-sm font-bold text-[#1F251A] mt-0.5">
                  {shiftInfo.status === "started" ? formatElapsedTime(liveElapsedSeconds) : shiftInfo.elapsedTime}
                </p>
                <p className="text-xs text-[#8C9686]">
                  {shiftInfo.actualStartingTime !== "--:--" ? `Since ${shiftInfo.actualStartingTime}` : "Shift Not Started"}
                </p>
              </div>
            </div>

            {/* Metric 4: Status */}
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-[#F0F4EC] text-[#3B662C] flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-[#8C9686] uppercase tracking-wider">Status</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${shiftInfo.status === "started" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                  <p className={`text-sm font-bold ${shiftInfo.status === "started" ? "text-emerald-700" : "text-amber-700"}`}>
                    {shiftInfo.status === "started" ? "Shift Started" : shiftInfo.status === "ended" ? "Shift Ended" : "Not Started"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 2. My Personal Target Card ── */}
        <div className="bg-white rounded-3xl p-6 border border-[#EBE8E0] shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-[#F0F4EC] text-[#45523A] flex items-center justify-center">
                <Target size={20} />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-[#1F251A]">My Personal Target</h3>
                <p className="text-xs text-[#788272]">Track your target progress this month</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab && onNavigateTab("HR")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-[#45523A] border border-[#D5DDD0] hover:bg-[#F0F4EC] transition"
            >
              <span>View My Target</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center pt-2">
            {/* Left: Target */}
            <div>
              <p className="text-[11px] font-semibold text-[#8C9686] uppercase tracking-wider">Target</p>
              <p className="text-2xl font-black text-[#1F251A] mt-1">EGP {targetInfo.targetAmount?.toLocaleString()}</p>
            </div>

            {/* Middle: Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-[#8C9686]">Progress</span>
                <span className="text-[#45523A]">{targetInfo.progressPercentage}%</span>
              </div>
              <div className="h-3 w-full bg-[#F3F0E8] rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full bg-[#526346] rounded-full transition-all duration-500"
                  style={{ width: `${targetInfo.progressPercentage}%` }}
                />
              </div>
              <p className="text-xs text-[#788272] font-medium">EGP {targetInfo.achievedAmount?.toLocaleString()} achieved</p>
            </div>

            {/* Right: Remaining */}
            <div>
              <p className="text-[11px] font-semibold text-[#8C9686] uppercase tracking-wider">Remaining</p>
              <p className="text-2xl font-black text-[#45523A] mt-1">EGP {targetInfo.remainingAmount?.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* ── 3. Bookings Section ── */}
        <div className="bg-white rounded-3xl p-6 border border-[#EBE8E0] shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-[#F0F4EC] text-[#45523A] flex items-center justify-center">
                <Calendar size={20} />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-[#1F251A]">Bookings</h3>
                <p className="text-xs text-[#788272]">Quick overview of today's bookings</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab && onNavigateTab("Bookings")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-[#45523A] border border-[#D5DDD0] hover:bg-[#F0F4EC] transition"
            >
              <span>View All Bookings</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Badges Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Today's Bookings Card */}
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#F7F9F5] border border-[#E4EBE0]">
              <div className="h-12 w-12 rounded-xl bg-[#45523A] text-white flex items-center justify-center shrink-0">
                <Calendar size={22} />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#788272]">Today's Bookings</p>
                <p className="text-2xl font-black text-[#1F251A]">{bookingsInfo.todayCount}</p>
              </div>
            </div>

            {/* Pending Approval Card */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-[#FFF9F0] border border-[#FEEBD0]">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-[#D97706] text-white flex items-center justify-center shrink-0">
                  <Clock size={22} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#854D0E]">Pending Approval</p>
                  <p className="text-2xl font-black text-[#B45309]">{bookingsInfo.pendingCount}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab && onNavigateTab("Bookings")}
                className="text-xs font-bold text-[#D97706] hover:underline flex items-center gap-1"
              >
                <span>Review Pending Approval</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>

          {/* Bookings Table */}
          <div className="overflow-x-auto rounded-2xl border border-[#EBE8E0]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F5] text-[#8C9686] font-semibold border-b border-[#EBE8E0]">
                <tr>
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Doctor</th>
                  <th className="py-3 px-4">Service</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F0E8] text-[#1F251A] font-medium">
                {bookingsInfo.list.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-[#8C9686]">
                      No bookings scheduled for today.
                    </td>
                  </tr>
                ) : (
                  bookingsInfo.list.map((row: any) => {
                    const isConfirmed = String(row.status).toLowerCase() === "confirmed" || String(row.status).toLowerCase() === "approved";
                    return (
                      <tr
                        key={row.id}
                        onClick={() => onNavigateTab && onNavigateTab("Bookings")}
                        className="hover:bg-[#F9F8F5] transition cursor-pointer"
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2 text-[#55634B]">
                            <Clock size={14} />
                            <span>{row.time}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-bold">
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
                            {isConfirmed ? "Confirmed" : "Pending Approval"}
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
    </div>
  );
}
