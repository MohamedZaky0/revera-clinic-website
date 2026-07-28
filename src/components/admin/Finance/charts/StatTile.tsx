"use client";

import { ReactNode } from "react";

interface StatTileProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
  accent?: "primary" | "accent";
}

export function StatTile({
  label,
  value,
  icon,
  trend,
  accent = "primary",
}: StatTileProps) {
  const accentColor =
    accent === "accent" ? "var(--cr-accent, #C4AE7C)" : "var(--cr-primary, #414E36)";

  return (
    <div
      className="flex flex-col rounded-2xl border p-5"
      style={{
        backgroundColor: "var(--cr-white, #fff)",
        borderColor: "rgba(90, 106, 81, 0.12)",
      }}
    >
      <div className="mb-3 flex items-center gap-3">
        {icon && (
          <span
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
          >
            {icon}
          </span>
        )}
        <span
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--cr-primary, #1F251A)", opacity: 0.65 }}
        >
          {label}
        </span>
      </div>
      <div
        className="text-2xl font-semibold"
        style={{ color: "var(--cr-primary, #1F251A)" }}
      >
        {value}
      </div>
      {trend && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span
            style={{
              color: trend.positive ? "var(--cr-success, #16a34a)" : "var(--cr-danger, #dc2626)",
            }}
          >
            {trend.positive ? "+" : ""}
            {trend.value}%
          </span>
          <span style={{ color: "var(--cr-primary, #1F251A)", opacity: 0.6 }}>
            {trend.label}
          </span>
        </div>
      )}
    </div>
  );
}
