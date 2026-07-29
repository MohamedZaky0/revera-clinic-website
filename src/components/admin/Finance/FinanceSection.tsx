"use client";

import { useState, type ReactNode } from "react";
import { CircleDollarSign, TrendingUp, Wallet, Landmark } from "lucide-react";
import { ExpensesScreen } from "./ExpensesScreen";
import { AssetsScreen } from "./AssetsScreen";
import { LoansScreen } from "./LoansScreen";
import { FinanceOverview } from "./FinanceOverview";

export type FinanceTab = "overview" | "expenses" | "assets" | "loans";

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
    </div>
  );
}
