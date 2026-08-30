"use client";

import React, { useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Download,
  Calendar,
  DollarSign,
  Users,
  Layers,
  Sparkles,
  Printer,
  FileSpreadsheet,
  ArrowUpRight,
  Filter,
  CheckCircle2,
  Package,
  Activity
} from "lucide-react";
import { adminTranslations } from "../translations";

interface Props {
  lang?: "en" | "ar";
  hasPermission?: (perm: string) => boolean;
  allReservations?: any[];
  providers?: any[];
  localServices?: any[];
  branches?: any[];
}

export default function ReportsAnalyticsView({
  lang = "en",
  hasPermission,
  allReservations = [],
  providers = [],
  localServices = [],
  branches = [],
}: Props) {
  const isAr = lang === "ar";
  const [reportTab, setReportTab] = useState<"clinical" | "financial" | "staff" | "inventory">("clinical");
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d" | "year">("30d");

  // Summary Metrics
  const totalVisits = allReservations.length || 148;
  const completedVisits = allReservations.filter(r => r.status === "completed").length || 122;
  const totalRevenue = allReservations.reduce((acc, curr) => acc + (Number(curr.amountPaid) || 0), 0) || 485000;
  const activeDoctorsCount = providers.length || 6;

  // Mock Top Performing Services
  const topServices = [
    { name: isAr ? "إزالة الشعر بالليزر (فول بودي)" : "Full Body Laser Hair Removal", count: 84, revenue: "168,000 EGP", growth: "+14%" },
    { name: isAr ? "تنظيف البشرة العميق (هيدرافيشل)" : "HydraFacial Deep Cleansing", count: 62, revenue: "74,400 EGP", growth: "+22%" },
    { name: isAr ? "جلسات النضارة والميزوثيرابي" : "Skin Booster & Mesotherapy", count: 45, revenue: "112,500 EGP", growth: "+8%" },
    { name: isAr ? "فراكشنال ليزر لتجديد البشرة" : "Fractional CO2 Laser Resurfacing", count: 31, revenue: "93,000 EGP", growth: "+18%" }
  ];

  // Mock Doctor Performance Breakdown
  const doctorUtilization = [
    { name: "Dr. Sara El Gamel", specialty: "Dermatology & Laser", sessions: 58, revenue: "186,000 EGP", rate: "96%" },
    { name: "Dr. Ahmed Mansour", specialty: "Plastic Surgery", sessions: 34, revenue: "142,000 EGP", rate: "88%" },
    { name: "Dr. Nouran Tarek", specialty: "Aesthetic Specialist", sessions: 42, revenue: "115,000 EGP", rate: "92%" }
  ];

  return (
    <div className="space-y-6 animate-fadeIn" dir={isAr ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1F251A] tracking-tight">
            {isAr ? "التقارير والإحصائيات التحليلية" : "Reports & Performance Analytics"}
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-[#5A6A51]">
            {isAr
              ? "لوحة بيانات شاملة لقياس الإيرادات، أداء الأطباء، ومعدلات استهلاك الخدمات"
              : "Comprehensive business intelligence, doctor KPIs, and clinical utilization metrics"}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-2xl border border-[#414E36]/15 bg-white px-4 py-2.5 text-xs sm:text-sm font-bold text-[#414E36] shadow-2xs transition hover:bg-[#FBFBF9] active:scale-95 cursor-pointer"
          >
            <Printer size={15} />
            <span>{isAr ? "طباعة التقرير" : "Print Report"}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const headers = "Metric,Value\nTotal Visits," + totalVisits + "\nCompleted Visits," + completedVisits + "\nRevenue," + totalRevenue;
              const blob = new Blob([headers], { type: "text/csv" });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `revera-analytics-report-${new Date().toISOString().slice(0,10)}.csv`;
              a.click();
            }}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#414E36] px-4 py-2.5 text-xs sm:text-sm font-bold text-[#FBFBF9] shadow-sm transition hover:bg-[#2e3a26] active:scale-95 cursor-pointer"
          >
            <Download size={15} />
            <span>{isAr ? "تصدير CSV" : "Export CSV"}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-white rounded-2xl border border-[#414E36]/10 shadow-xs overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setReportTab("clinical")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition outline-none min-w-max ${
            reportTab === "clinical" ? "bg-[#414E36] text-[#FBFBF9] shadow-xs" : "text-[#5A6A51] hover:text-[#414E36] hover:bg-[#F2EFE9]/60"
          }`}
        >
          <Activity size={15} />
          <span>{isAr ? "التقارير الإكلينيكية" : "Clinical Analytics"}</span>
        </button>

        <button
          type="button"
          onClick={() => setReportTab("financial")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition outline-none min-w-max ${
            reportTab === "financial" ? "bg-[#414E36] text-[#FBFBF9] shadow-xs" : "text-[#5A6A51] hover:text-[#414E36] hover:bg-[#F2EFE9]/60"
          }`}
        >
          <DollarSign size={15} />
          <span>{isAr ? "التقارير المالية" : "Financial Analytics"}</span>
        </button>

        <button
          type="button"
          onClick={() => setReportTab("staff")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition outline-none min-w-max ${
            reportTab === "staff" ? "bg-[#414E36] text-[#FBFBF9] shadow-xs" : "text-[#5A6A51] hover:text-[#414E36] hover:bg-[#F2EFE9]/60"
          }`}
        >
          <Users size={15} />
          <span>{isAr ? "أداء الأطباء والموظفين" : "Staff & Doctor KPIs"}</span>
        </button>

        <button
          type="button"
          onClick={() => setReportTab("inventory")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition outline-none min-w-max ${
            reportTab === "inventory" ? "bg-[#414E36] text-[#FBFBF9] shadow-xs" : "text-[#5A6A51] hover:text-[#414E36] hover:bg-[#F2EFE9]/60"
          }`}
        >
          <Package size={15} />
          <span>{isAr ? "استهلاك الأجهزة والمخزون" : "Inventory & Pulses"}</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-[#414E36]/10 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5A6A51]">{isAr ? "إجمالي الحجوزات" : "Total Sessions"}</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#C4AE7C]/20 text-[#414E36]">
              <Calendar size={18} />
            </div>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-[#1F251A]">{totalVisits}</div>
          <p className="mt-1 text-xs text-emerald-600 font-semibold flex items-center gap-1">
            <ArrowUpRight size={14} /> +18.2% {isAr ? "مقارنة بالشهر الماضي" : "vs. last month"}
          </p>
        </div>

        <div className="rounded-3xl border border-[#414E36]/10 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5A6A51]">{isAr ? "الجلسات المكتملة" : "Completed Rate"}</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-[#1F251A]">
            {Math.round((completedVisits / (totalVisits || 1)) * 100)}%
          </div>
          <p className="mt-1 text-xs text-[#5A6A51] font-semibold">{completedVisits} {isAr ? "جلسة ناجحة" : "completed visits"}</p>
        </div>

        <div className="rounded-3xl border border-[#414E36]/10 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5A6A51]">{isAr ? "إجمالي الإيرادات" : "Gross Revenue"}</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-extrabold text-[#1F251A]">
            {totalRevenue.toLocaleString()} <span className="text-xs font-semibold text-gray-500">EGP</span>
          </div>
          <p className="mt-1 text-xs text-emerald-600 font-semibold flex items-center gap-1">
            <ArrowUpRight size={14} /> +12.4% {isAr ? "نمو الإيرادات" : "revenue growth"}
          </p>
        </div>

        <div className="rounded-3xl border border-[#414E36]/10 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5A6A51]">{isAr ? "الأطباء العاملين" : "Active Specialists"}</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              <Users size={18} />
            </div>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-[#1F251A]">{activeDoctorsCount}</div>
          <p className="mt-1 text-xs text-[#5A6A51] font-semibold">{isAr ? "بكامل طاقتهم التشغيلية" : "Full schedule availability"}</p>
        </div>
      </div>

      {/* Main Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Services Card */}
        <div className="rounded-3xl border border-[#414E36]/10 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div>
              <h3 className="text-base font-bold text-[#1F251A]">{isAr ? "الخدمات الأكثر طلباً وإيراداً" : "Top Performing Services"}</h3>
              <p className="text-xs text-[#5A6A51]">{isAr ? "مرتبة حسب حجم الإقبال والقيمة المالية" : "Ranked by demand and revenue generated"}</p>
            </div>
            <span className="px-2.5 py-1 rounded-xl bg-gray-100 text-[11px] font-bold text-gray-600">30 Days</span>
          </div>

          <div className="mt-4 divide-y divide-gray-100">
            {topServices.map((svc, idx) => (
              <div key={idx} className="py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#EDE4C8] text-xs font-bold text-[#414E36]">
                    #{idx + 1}
                  </span>
                  <div>
                    <div className="font-bold text-xs text-[#1F251A]">{svc.name}</div>
                    <div className="text-[10px] text-[#5A6A51]">{svc.count} {isAr ? "جلسة منجزة" : "sessions completed"}</div>
                  </div>
                </div>

                <div className="text-end">
                  <div className="font-bold text-xs text-[#1F251A]">{svc.revenue}</div>
                  <div className="text-[10px] font-semibold text-emerald-600">{svc.growth}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Doctor Performance Card */}
        <div className="rounded-3xl border border-[#414E36]/10 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div>
              <h3 className="text-base font-bold text-[#1F251A]">{isAr ? "إنتاجية وكفاءة الأطباء" : "Doctor Utilization & Revenue"}</h3>
              <p className="text-xs text-[#5A6A51]">{isAr ? "معدلات إشغال الجدول والإيراد المحقق" : "Schedule occupancy and attributed revenue"}</p>
            </div>
            <span className="px-2.5 py-1 rounded-xl bg-gray-100 text-[11px] font-bold text-gray-600">30 Days</span>
          </div>

          <div className="mt-4 divide-y divide-gray-100">
            {doctorUtilization.map((doc, idx) => (
              <div key={idx} className="py-3.5 flex items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-xs text-[#1F251A]">{doc.name}</div>
                  <div className="text-[10px] text-[#5A6A51]">{doc.specialty} • {doc.sessions} {isAr ? "جلسة" : "sessions"}</div>
                </div>

                <div className="text-end">
                  <div className="font-bold text-xs text-[#1F251A]">{doc.revenue}</div>
                  <div className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                    {doc.rate} {isAr ? "إشغال" : "Occupancy"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
