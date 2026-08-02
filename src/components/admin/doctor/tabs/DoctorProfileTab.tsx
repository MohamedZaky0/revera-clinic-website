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
}

export default function DoctorProfileTab({
  doctorName,
  doctorEmail,
  resolvedBranchName,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword
}: DoctorProfileTabProps) {
  return (
    <div className="w-full space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1F251A]">Doctor Profile & Security Settings</h2>
        <p className="text-xs text-[#5A6A51] mt-1">
          Manage your credentials, branch details, and security options.
        </p>
      </div>

      {/* Profile Card */}
      <div className="rounded-3xl border border-[#414E36]/10 bg-white p-6 shadow-sm flex items-center justify-between gap-4 w-full">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#414E36] text-white font-extrabold text-xl shadow-md">
            {(doctorName.replace(/^Dr\.?\s*/i, '') || "D").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#1F251A]">{doctorName}</h3>
            <p className="text-xs text-[#5A6A51]">{doctorEmail}</p>
            <span className="mt-2 inline-block rounded-xl bg-[#414E36]/10 px-3 py-1 text-xs font-bold text-[#414E36]">
              Assigned Branch: {resolvedBranchName}
            </span>
          </div>
        </div>
      </div>

      {/* Password Update Form */}
      <div className="rounded-3xl border border-[#414E36]/10 bg-white p-6 shadow-sm space-y-4 w-full">
        <h3 className="text-sm font-bold text-[#1F251A] uppercase tracking-wider flex items-center gap-2">
          <Lock size={16} className="text-[#414E36]" /> Security & Account Password
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#5A6A51] mb-1">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-xs text-[#1F251A] outline-none focus:border-[#414E36]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#5A6A51] mb-1">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
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
          className="rounded-xl bg-[#414E36] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#343F2B] transition"
        >
          Update Password
        </button>
      </div>
    </div>
  );
}
