"use client";

import { useState, type ReactNode } from "react";
import {
  TrendingUp,
  Activity,
  Users,
  Gift,
  Clock,
  Target,
  CalendarX,
  UserPlus,
} from "lucide-react";
import { TrendScreen } from "./TrendScreen";
import { ServiceMarginScreen } from "./ServiceMarginScreen";
import { DoctorBranchPnlScreen } from "./DoctorBranchPnlScreen";
import { PackageProfitabilityScreen } from "./PackageProfitabilityScreen";
import { CapacityScreen } from "./CapacityScreen";
import { ServiceMixScreen } from "./ServiceMixScreen";
import { NoShowCostScreen } from "./NoShowCostScreen";
import { NewVsReturningScreen } from "./NewVsReturningScreen";
import type { BranchOption } from "../Finance/FinanceSection";

export type ReportsTab =
  | "trend"
  | "service-margin"
  | "doctor-branch-pnl"
  | "package-profitability"
  | "capacity"
  | "service-mix"
  | "no-show-cost"
  | "new-vs-returning";


interface ReportsSectionProps {
  accessToken?: string;
  branches?: BranchOption[];
  lang?: 'en' | 'ar';
  canViewFinancialReports: boolean;
  canViewAnalytics: boolean;
}

interface TabDef {
  id: ReportsTab;
  label: string;
  labelAr: string;
  group: 'performance' | 'operations' | 'patients';
  permissionKey: 'financial' | 'analytics';
  icon: ReactNode;
}

const TABS: TabDef[] = [
  // Performance group
  { id: "trend", label: "Trend", labelAr: "الاتجاه", group: 'performance', permissionKey: 'financial', icon: <TrendingUp size={16} /> },
  { id: "service-margin", label: "Service Margins", labelAr: "هوامش الخدمات", group: 'performance', permissionKey: 'financial', icon: <Activity size={16} /> },
  { id: "doctor-branch-pnl", label: "Doctor / Branch P&L", labelAr: "أرباح الأطباء والفروع", group: 'performance', permissionKey: 'financial', icon: <Users size={16} /> },
  { id: "package-profitability", label: "Package Profitability", labelAr: "ربحية الباقات", group: 'performance', permissionKey: 'financial', icon: <Gift size={16} /> },

  // Operations group
  { id: "capacity", label: "Capacity", labelAr: "الطاقة الاستيعابية", group: 'operations', permissionKey: 'analytics', icon: <Clock size={16} /> },
  { id: "service-mix", label: "Service Mix", labelAr: "مزيج الخدمات", group: 'operations', permissionKey: 'financial', icon: <Target size={16} /> },
  { id: "no-show-cost", label: "No-Show / Cancellations", labelAr: "تكلفة عدم الحضور والإلغاء", group: 'operations', permissionKey: 'financial', icon: <CalendarX size={16} /> },

  // Patients group
  { id: "new-vs-returning", label: "New vs Returning", labelAr: "المرضى الجدد والعائدون", group: 'patients', permissionKey: 'financial', icon: <UserPlus size={16} /> },
];

function hasPermission(tab: TabDef, canViewFinancialReports: boolean, canViewAnalytics: boolean): boolean {
  if (tab.permissionKey === 'financial') return canViewFinancialReports;
  if (tab.permissionKey === 'analytics') return canViewAnalytics;
  return false;
}

export function ReportsSection({ accessToken, branches = [], lang = 'en', canViewFinancialReports, canViewAnalytics }: ReportsSectionProps) {
  const isAr = lang === 'ar';

  // Get visible tabs
  const visibleTabs = TABS.filter(tab => hasPermission(tab, canViewFinancialReports, canViewAnalytics));

  // Get visible groups
  const groups = ['performance', 'operations', 'patients'] as const;
  const visibleGroups = groups.filter(group =>
    visibleTabs.some(tab => tab.group === group)
  );

  // Set default tab to first visible
  const [activeTab, setActiveTab] = useState<ReportsTab>(
    visibleTabs.length > 0 ? visibleTabs[0].id : 'trend'
  );

  const groupLabels: Record<string, { en: string; ar: string }> = {
    performance: { en: 'Performance', ar: 'الأداء' },
    operations: { en: 'Operations', ar: 'التشغيل' },
    patients: { en: 'Patients', ar: 'المرضى' },
  };

  if (visibleTabs.length === 0) {
    return (
      <div className="space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold" style={{ color: "var(--cr-primary, var(--cr-dark))" }}>
              {isAr ? 'التقارير' : 'Reports'}
            </h2>
            <p className="mt-2 text-sm" style={{ color: "var(--cr-primary, var(--cr-dark))", opacity: 0.7 }}>
              {isAr ? 'تحليل وتقارير لاتخاذ القرارات.' : 'Analysis and reporting for decision-making.'}
            </p>
          </div>
        </div>
        <div className="p-6 rounded-lg border border-gray-200 bg-gray-50">
          <p className="text-gray-600">{isAr ? 'أنت لا تملك إذن الوصول لأي تقرير.' : 'You do not have access to any report'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold" style={{ color: "var(--cr-primary, var(--cr-dark))" }}>
            {isAr ? 'التقارير' : 'Reports'}
          </h2>
          <p className="mt-2 text-sm" style={{ color: "var(--cr-primary, var(--cr-dark))", opacity: 0.7 }}>
            {isAr ? 'تحليل وتقارير لاتخاذ القرارات.' : 'Analysis and reporting for decision-making.'}
          </p>
        </div>
      </div>

      {/* Tab groups */}
      {visibleGroups.map((group) => {
        const groupTabs = visibleTabs.filter(t => t.group === group);
        if (groupTabs.length === 0) return null;

        return (
          <div key={group}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--cr-primary, var(--cr-dark))" }}>
              {isAr ? groupLabels[group].ar : groupLabels[group].en}
            </h3>
            <div className="flex items-center gap-1.5 p-1.5 bg-white rounded-2xl border border-[var(--cr-primary)]/10 shadow-xs overflow-x-auto no-scrollbar w-full mb-6">
              {groupTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-150 min-w-max ${
                    activeTab === tab.id
                      ? "bg-[var(--cr-primary)] text-[var(--color-brand-light)] font-bold shadow-xs"
                      : "text-[var(--color-brand-secondary)] hover:text-[var(--cr-primary)] hover:bg-[var(--color-brand-sand)]/60"
                  }`}
                >
                  {tab.icon}
                  {isAr ? tab.labelAr : tab.label}
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {/* Tab content */}
      <div>
        {activeTab === "trend" && <TrendScreen accessToken={accessToken} branches={branches} />}
        {activeTab === "service-margin" && <ServiceMarginScreen accessToken={accessToken} branches={branches} />}
        {activeTab === "doctor-branch-pnl" && <DoctorBranchPnlScreen accessToken={accessToken} branches={branches} />}
        {activeTab === "package-profitability" && <PackageProfitabilityScreen accessToken={accessToken} />}
        {activeTab === "capacity" && <CapacityScreen accessToken={accessToken} branches={branches} />}
        {activeTab === "service-mix" && <ServiceMixScreen accessToken={accessToken} branches={branches} />}
        {activeTab === "no-show-cost" && <NoShowCostScreen accessToken={accessToken} branches={branches} />}
        {activeTab === "new-vs-returning" && <NewVsReturningScreen accessToken={accessToken} branches={branches} />}
      </div>
    </div>
  );
}
