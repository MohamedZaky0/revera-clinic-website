"use client";

import { useState, type ReactNode } from "react";
import {
  CircleDollarSign,
  TrendingUp,
  Wallet,
  Landmark,
  FileBarChart2,
  Activity,
  Users,
  Banknote,
  Clock,
  Target,
  Gift,
  CalendarX,
  HandCoins,
  LineChart as LineChartIcon,
  UserPlus,
  Gauge,
  PieChart,
} from "lucide-react";
import { ExpensesScreen } from "./ExpensesScreen";
import { AssetsScreen } from "./AssetsScreen";
import { LoansScreen } from "./LoansScreen";
import { FinanceOverview } from "./FinanceOverview";
import { PnlScreen } from "./PnlScreen";
import { ServiceMarginScreen } from "./ServiceMarginScreen";
import { DoctorBranchPnlScreen } from "./DoctorBranchPnlScreen";
import { CashFlowScreen } from "./CashFlowScreen";
import { ReceivablesAgingScreen } from "./ReceivablesAgingScreen";
import { BudgetVsActualScreen } from "./BudgetVsActualScreen";
import { PackageProfitabilityScreen } from "./PackageProfitabilityScreen";
import { NoShowCostScreen } from "./NoShowCostScreen";
import { CommissionPayoutsScreen } from "./CommissionPayoutsScreen";
import { TrendScreen } from "./TrendScreen";
import { NewVsReturningScreen } from "./NewVsReturningScreen";
import { CapacityScreen } from "./CapacityScreen";
import { ServiceMixScreen } from "./ServiceMixScreen";

export type FinanceTab =
  | "overview"
  | "expenses"
  | "assets"
  | "loans"
  | "pnl"
  | "service-margin"
  | "doctor-branch-pnl"
  | "cashflow"
  | "receivables-aging"
  | "budget-vs-actual"
  | "package-profitability"
  | "no-show-cost"
  | "commission-payouts"
  | "trend"
  | "new-vs-returning"
  | "capacity"
  | "service-mix";

export interface BranchOption {
  id: string;
  name_en: string;
  name_ar?: string;
}

interface FinanceSectionProps {
  accessToken?: string;
  branches?: BranchOption[];
}

const TABS: { id: FinanceTab; label: string; icon: ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <CircleDollarSign size={16} /> },
  { id: "expenses", label: "Expenses", icon: <Wallet size={16} /> },
  { id: "assets", label: "Assets & Depreciation", icon: <TrendingUp size={16} /> },
  { id: "loans", label: "Loans", icon: <Landmark size={16} /> },
  { id: "pnl", label: "P&L", icon: <FileBarChart2 size={16} /> },
  { id: "service-margin", label: "Service Margins", icon: <Activity size={16} /> },
  { id: "doctor-branch-pnl", label: "Doctor / Branch P&L", icon: <Users size={16} /> },
  { id: "cashflow", label: "Cash Flow", icon: <Banknote size={16} /> },
  { id: "receivables-aging", label: "Receivables Aging", icon: <Clock size={16} /> },
  { id: "budget-vs-actual", label: "Budget vs Actual", icon: <Target size={16} /> },
  { id: "package-profitability", label: "Package Profitability", icon: <Gift size={16} /> },
  { id: "no-show-cost", label: "No-Show / Cancellation Cost", icon: <CalendarX size={16} /> },
  { id: "commission-payouts", label: "Commission Payouts", icon: <HandCoins size={16} /> },
  { id: "trend", label: "Trend", icon: <LineChartIcon size={16} /> },
  { id: "new-vs-returning", label: "New vs Returning", icon: <UserPlus size={16} /> },
  { id: "capacity", label: "Capacity", icon: <Gauge size={16} /> },
  { id: "service-mix", label: "Service Mix", icon: <PieChart size={16} /> },
];

export function FinanceSection({ accessToken, branches = [] }: FinanceSectionProps) {
  const [activeTab, setActiveTab] = useState<FinanceTab>("overview");

  return (
    <div className="space-y-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold" style={{ color: "var(--cr-primary, var(--cr-dark))" }}>
            Finance
          </h2>
          <p className="mt-2 text-sm" style={{ color: "var(--cr-primary, var(--cr-dark))", opacity: 0.7 }}>
            Reporting and management for clinic P&L, margins, cash flow, and budgets.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-[var(--cr-divider)] pb-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex items-center gap-2 rounded-t-xl px-4 py-2.5 text-sm font-semibold transition ${
              activeTab === tab.id
                ? "border-b-2 border-[var(--cr-accent)] text-[var(--cr-dark)]"
                : "text-muted-foreground hover:text-[var(--cr-dark)]"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && <FinanceOverview accessToken={accessToken} />}

      {activeTab === "expenses" && <ExpensesScreen accessToken={accessToken} branches={branches} />}
      {activeTab === "assets" && <AssetsScreen accessToken={accessToken} branches={branches} />}
      {activeTab === "loans" && <LoansScreen accessToken={accessToken} />}

      {activeTab === "pnl" && <PnlScreen accessToken={accessToken} branches={branches} />}
      {activeTab === "service-margin" && <ServiceMarginScreen accessToken={accessToken} branches={branches} />}
      {activeTab === "doctor-branch-pnl" && <DoctorBranchPnlScreen accessToken={accessToken} branches={branches} />}
      {activeTab === "cashflow" && <CashFlowScreen accessToken={accessToken} branches={branches} />}
      {activeTab === "receivables-aging" && <ReceivablesAgingScreen accessToken={accessToken} branches={branches} />}
      {activeTab === "budget-vs-actual" && <BudgetVsActualScreen accessToken={accessToken} branches={branches} />}

      {activeTab === "package-profitability" && <PackageProfitabilityScreen accessToken={accessToken} />}
      {activeTab === "no-show-cost" && <NoShowCostScreen accessToken={accessToken} branches={branches} />}
      {activeTab === "commission-payouts" && <CommissionPayoutsScreen accessToken={accessToken} />}
      {activeTab === "trend" && <TrendScreen accessToken={accessToken} branches={branches} />}
      {activeTab === "new-vs-returning" && <NewVsReturningScreen accessToken={accessToken} branches={branches} />}
      {activeTab === "capacity" && <CapacityScreen accessToken={accessToken} branches={branches} />}
      {activeTab === "service-mix" && <ServiceMixScreen accessToken={accessToken} branches={branches} />}
    </div>
  );
}
