"use client";

import { useState, type ReactNode } from "react";
import { CircleDollarSign, TrendingUp, Wallet, Landmark } from "lucide-react";
import { ExpensesScreen } from "./ExpensesScreen";
import { AssetsScreen } from "./AssetsScreen";
import { LoansScreen } from "./LoansScreen";

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
          <h2 className="text-2xl font-semibold" style={{ color: "var(--cr-primary, #1F251A)" }}>
            Finance
          </h2>
          <p className="mt-2 text-sm" style={{ color: "var(--cr-primary, #1F251A)", opacity: 0.7 }}>
            Reporting and management for clinic P&L, margins, cash flow, and budgets.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-[#E6E9EB] pb-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex items-center gap-2 rounded-t-xl px-4 py-2.5 text-sm font-semibold transition ${
              activeTab === tab.id
                ? "border-b-2 border-[#C4AE7C] text-[#1F251A]"
                : "text-[#5A6A51] hover:text-[#1F251A]"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div
          className="flex flex-col items-center justify-center rounded-2xl border p-12 text-center"
          style={{
            backgroundColor: "var(--cr-white, #fff)",
            borderColor: "rgba(90, 106, 81, 0.15)",
          }}
        >
          <span
            className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ backgroundColor: "rgba(196, 174, 124, 0.15)", color: "var(--cr-accent, #C4AE7C)" }}
          >
            <CircleDollarSign size={32} />
          </span>
          <h3 className="mb-2 text-lg font-semibold" style={{ color: "var(--cr-primary, #1F251A)" }}>
            Finance overview
          </h3>
          <p className="max-w-md text-sm" style={{ color: "var(--cr-primary, #1F251A)", opacity: 0.7 }}>
            Reporting dashboards will be available here in task 4.15. Use the tabs above to manage
            expenses, fixed assets and loans.
          </p>
        </div>
      )}

      {activeTab === "expenses" && <ExpensesScreen accessToken={accessToken} branches={branches} />}
      {activeTab === "assets" && <AssetsScreen accessToken={accessToken} branches={branches} />}
      {activeTab === "loans" && <LoansScreen accessToken={accessToken} />}
    </div>
  );
}
