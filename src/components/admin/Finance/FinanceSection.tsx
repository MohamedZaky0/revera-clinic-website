"use client";

import { useState, type ReactNode } from "react";
import {
  CircleDollarSign,
  Wallet,
  Landmark,
  FileBarChart2,
  Banknote,
  Clock,
  HandCoins,
} from "lucide-react";
import { ExpensesScreen } from "./ExpensesScreen";
import { AssetsScreen } from "./AssetsScreen";
import { LoansScreen } from "./LoansScreen";
import { FinanceOverview } from "./FinanceOverview";
import { PnlScreen } from "./PnlScreen";
import { CashFlowScreen } from "./CashFlowScreen";
import { ReceivablesAgingScreen } from "./ReceivablesAgingScreen";
// DEC-097: hidden, see the TABS comment below.
// import { BudgetVsActualScreen } from "./BudgetVsActualScreen";
import { CommissionPayoutsScreen } from "./CommissionPayoutsScreen";

export type FinanceTab =
  | "overview"
  | "expenses"
  | "assets"
  | "loans"
  | "pnl"
  | "cashflow"
  | "receivables-aging"
  | "budget-vs-actual"
  | "commission-payouts";

export interface BranchOption {
  id: string;
  name_en: string;
  name_ar?: string;
}

interface FinanceSectionProps {
  accessToken?: string;
  branches?: BranchOption[];
  lang?: 'en' | 'ar';
}

interface TabDef {
  id: FinanceTab;
  label: string;
  labelAr: string;
  group: 'overview' | 'records' | 'statements';
  icon: ReactNode;
}

const TABS: TabDef[] = [
  { id: "overview", label: "Overview", labelAr: "نظرة عامة", group: 'overview', icon: <CircleDollarSign size={16} /> },
  { id: "expenses", label: "Expenses", labelAr: "المصروفات", group: 'records', icon: <Wallet size={16} /> },
  { id: "assets", label: "Assets & Depreciation", labelAr: "الأصول والإهلاك", group: 'records', icon: <Wallet size={16} /> },
  { id: "loans", label: "Loans", labelAr: "القروض", group: 'records', icon: <Landmark size={16} /> },
  { id: "pnl", label: "P&L", labelAr: "قائمة الأرباح والخسائر", group: 'statements', icon: <FileBarChart2 size={16} /> },
  { id: "cashflow", label: "Cash Flow", labelAr: "التدفق النقدي", group: 'statements', icon: <Banknote size={16} /> },
  { id: "receivables-aging", label: "Receivables Aging", labelAr: "أعمار المديونيات", group: 'statements', icon: <Clock size={16} /> },
  { id: "commission-payouts", label: "Commission Payouts", labelAr: "مستحقات العمولات", group: 'statements', icon: <HandCoins size={16} /> },
  // DEC-097: Budget vs Actual hidden — no budget entry exists yet. Planned: study whether the feature is worth
  // building (budget entry UI + route) before re-enabling. Screen: ./BudgetVsActualScreen.tsx, route: /api/finance/budget-vs-actual.
];

export function FinanceSection({ accessToken, branches = [], lang = 'en' }: FinanceSectionProps) {
  const isAr = lang === 'ar';
  const [activeTab, setActiveTab] = useState<FinanceTab>("overview");

  const groupLabels: Record<string, { en: string; ar: string }> = {
    overview: { en: 'Overview', ar: 'نظرة عامة' },
    records: { en: 'Records', ar: 'السجلات' },
    statements: { en: 'Statements', ar: 'القوائم' },
  };

  return (
    <div className="space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold" style={{ color: "var(--cr-primary, var(--cr-dark))" }}>
            {isAr ? 'الماليات' : 'Finance'}
          </h2>
          <p className="mt-2 text-sm" style={{ color: "var(--cr-primary, var(--cr-dark))", opacity: 0.7 }}>
            {isAr ? 'تسجيل وإدارة الأرباح والخسائر والتدفق النقدي والميزانية.' : 'Reporting and management for clinic P&L, cash flow, and budgets.'}
          </p>
        </div>
      </div>

      {/* Overview group */}
      {TABS.filter(t => t.group === 'overview').length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--cr-primary, var(--cr-dark))" }}>
            {isAr ? groupLabels.overview.ar : groupLabels.overview.en}
          </h3>
          <div className="flex items-center gap-1.5 p-1.5 bg-white rounded-2xl border border-[var(--cr-primary)]/10 shadow-xs overflow-x-auto no-scrollbar w-full mb-6">
            {TABS.filter(t => t.group === 'overview').map((tab) => (
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
      )}

      {/* Records group */}
      {TABS.filter(t => t.group === 'records').length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--cr-primary, var(--cr-dark))" }}>
            {isAr ? groupLabels.records.ar : groupLabels.records.en}
          </h3>
          <div className="flex items-center gap-1.5 p-1.5 bg-white rounded-2xl border border-[var(--cr-primary)]/10 shadow-xs overflow-x-auto no-scrollbar w-full mb-6">
            {TABS.filter(t => t.group === 'records').map((tab) => (
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
      )}

      {/* Statements group */}
      {TABS.filter(t => t.group === 'statements').length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--cr-primary, var(--cr-dark))" }}>
            {isAr ? groupLabels.statements.ar : groupLabels.statements.en}
          </h3>
          <div className="flex items-center gap-1.5 p-1.5 bg-white rounded-2xl border border-[var(--cr-primary)]/10 shadow-xs overflow-x-auto no-scrollbar w-full mb-6">
            {TABS.filter(t => t.group === 'statements').map((tab) => (
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
      )}

      {activeTab === "overview" && <FinanceOverview accessToken={accessToken} lang={lang} branches={branches} />}

      {activeTab === "expenses" && <ExpensesScreen accessToken={accessToken} branches={branches} />}
      {activeTab === "assets" && <AssetsScreen accessToken={accessToken} branches={branches} />}
      {activeTab === "loans" && <LoansScreen accessToken={accessToken} />}

      {activeTab === "pnl" && <PnlScreen accessToken={accessToken} branches={branches} />}
      {activeTab === "cashflow" && <CashFlowScreen accessToken={accessToken} branches={branches} />}
      {activeTab === "receivables-aging" && <ReceivablesAgingScreen accessToken={accessToken} branches={branches} />}
      {/* {activeTab === "budget-vs-actual" && <BudgetVsActualScreen accessToken={accessToken} branches={branches} />} */}
      {activeTab === "commission-payouts" && <CommissionPayoutsScreen accessToken={accessToken} />}
    </div>
  );
}
