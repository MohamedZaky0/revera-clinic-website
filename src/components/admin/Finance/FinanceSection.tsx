"use client";

import { CircleDollarSign } from "lucide-react";

export function FinanceSection() {
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
          Finance section is under construction
        </h3>
        <p className="max-w-md text-sm" style={{ color: "var(--cr-primary, #1F251A)", opacity: 0.7 }}>
          The reporting engine and management screens are being built in follow-up
          tasks. This module is now permission-gated and reachable from the sidebar.
        </p>
      </div>
    </div>
  );
}
