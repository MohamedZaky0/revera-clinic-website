"use client";

import React from "react";
import { Lock } from "lucide-react";

interface DoctorProfileTabProps {
  doctorName: string;
  doctorEmail: string;
  resolvedBranchName: string;
  newPassword: string;
  setNewPassword: (val: string) => void;
  confirmPassword: string;
  setConfirmPassword: (val: string) => void;
  t: any;
}

export default function DoctorProfileTab({
  doctorName,
  doctorEmail,
  resolvedBranchName,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  t
}: DoctorProfileTabProps) {
  return (
    <div className="w-full space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-[#1F251A]">{t.profileTitle}</h2>
        <p className="text-xs text-[#5A6A51] mt-0.5">
          {t.profileSubtitle}
        </p>
      </div>

      {/* Profile Card */}
      <div className="rounded-2xl sm:rounded-3xl border border-[#414E36]/10 bg-white p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
        <div className="flex items-center gap-3.5 sm:gap-4">
          <div className="flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-[#414E36] text-white font-extrabold text-lg sm:text-xl shadow-md shrink-0">
            {(doctorName.replace(/^Dr\.?\s*/i, '') || "D").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[#1F251A]">{doctorName}</h3>
            <p className="text-xs text-[#5A6A51]">{doctorEmail}</p>
            <span className="mt-1.5 sm:mt-2 inline-block rounded-xl bg-[#414E36]/10 px-3 py-1 text-xs font-bold text-[#414E36]">
              {t.assignedBranch} {resolvedBranchName}
            </span>
          </div>
        </div>
      </div>

      {/* Password Update Form */}
      <div className="rounded-2xl sm:rounded-3xl border border-[#414E36]/10 bg-white p-4 sm:p-6 shadow-sm space-y-4 w-full">
        <h3 className="text-xs sm:text-sm font-bold text-[#1F251A] uppercase tracking-wider flex items-center gap-2">
          <Lock size={16} className="text-[#414E36]" /> {t.securityPasswordTitle}
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="block text-xs font-bold text-[#5A6A51] mb-1">{t.newPasswordLabel}</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t.newPasswordPlaceholder}
              className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-xs text-[#1F251A] outline-none focus:border-[#414E36]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#5A6A51] mb-1">{t.confirmPasswordLabel}</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t.confirmPasswordPlaceholder}
              className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-xs text-[#1F251A] outline-none focus:border-[#414E36]"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            if (!newPassword || newPassword !== confirmPassword) {
              alert("Passwords do not match or are empty.");
              return;
            }
            alert("Password updated successfully!");
            setNewPassword("");
            setConfirmPassword("");
          }}
          className="w-full sm:w-auto rounded-xl bg-[#414E36] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#343F2B] transition cursor-pointer"
        >
          {t.updatePasswordBtn}
        </button>
      </div>
    </div>
  );
}
