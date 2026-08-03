"use client";

import React from "react";
import { Settings } from "lucide-react";

interface DoctorSettingsTabProps {
  t: any;
}

export default function DoctorSettingsTab({ t }: DoctorSettingsTabProps) {
  return (
    <div className="w-full space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1F251A]">{t.settingsTitle}</h2>
        <p className="text-xs text-[#5A6A51] mt-1">
          {t.settingsSubtitle}
        </p>
      </div>

      <div className="rounded-3xl border border-[#414E36]/10 bg-white p-16 text-center text-[#5A6A51] space-y-3 shadow-sm">
        <div className="h-16 w-16 mx-auto flex items-center justify-center rounded-2xl bg-[#414E36]/10 text-[#414E36]">
          <Settings size={28} />
        </div>
        <h3 className="text-lg font-bold text-[#1F251A]">{t.noSettingsAvailableTitle}</h3>
        <p className="text-xs text-[#5A6A51] max-w-sm mx-auto leading-relaxed">
          {t.noSettingsAvailableDesc}
        </p>
      </div>
    </div>
  );
}
