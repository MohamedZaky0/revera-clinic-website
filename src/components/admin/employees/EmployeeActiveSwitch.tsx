"use client";

import React from "react";

interface EmployeeActiveSwitchProps {
  active: boolean;
  disabled?: boolean;
  /** what the switch does, read by screen readers and shown as the tooltip */
  label: string;
  onChange: (next: boolean) => void;
}

/** Active / Inactive toggle for an employee account (DEC-117). */
export default function EmployeeActiveSwitch({ active, disabled = false, label, onChange }: EmployeeActiveSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={() => onChange(!active)}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cr-accent)] ${
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
      }`}
      style={{ backgroundColor: active ? "var(--cr-primary)" : "#CBD5E1" }}
    >
      <span
        className="absolute top-[3px] h-[14px] w-[14px] rounded-full bg-white shadow transition-all duration-200"
        style={{ left: active ? "19px" : "3px" }}
      />
    </button>
  );
}
