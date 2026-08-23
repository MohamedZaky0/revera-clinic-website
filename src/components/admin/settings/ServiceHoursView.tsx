"use client";

import { Branch } from "@/types";
import { adminTranslations } from "@/components/admin/translations";

type ServiceHour = {
  day: string;
  dayAr: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
};

interface ServiceHoursViewProps {
  branches: Branch[];
  selectedBranchForHoursId: string;
  setSelectedBranchForHoursId: (v: string) => void;
  serviceHours: ServiceHour[];
  setServiceHours: (v: ServiceHour[]) => void;
  handleSaveBranchServiceHours: () => Promise<void>;
  savingBranchHours: boolean;
  lang: "en" | "ar";
  t: (typeof adminTranslations)["en"]["settingsScreens"]["serviceHours"];
}

export default function ServiceHoursView({
  branches,
  selectedBranchForHoursId,
  setSelectedBranchForHoursId,
  serviceHours,
  setServiceHours,
  handleSaveBranchServiceHours,
  savingBranchHours,
  lang,
  t,
}: ServiceHoursViewProps) {
  return (
    <div className="space-y-6" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-semibold text-[#1F251A]">{t.title}</h2>
          <p className="mt-2 text-sm text-[#5A6A51]">{t.subtitle}</p>

          {/* Branch selector select dropdown */}
          <div className="mt-4 flex items-center gap-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">{t.activeBranch}</label>
            <select
              value={selectedBranchForHoursId}
              onChange={(e) => setSelectedBranchForHoursId(e.target.value)}
              className="rounded-xl border border-[#414E36]/15 bg-white px-3 py-1.5 text-xs text-[#1F251A] outline-none transition focus:border-[#C4AE7C] font-semibold"
            >
              {branches.map(b => (
                <option key={b.id} value={b.id}>{lang === "ar" ? `${b.name_ar} (${b.name_en})` : `${b.name_en} (${b.name_ar})`}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={() => handleSaveBranchServiceHours()}
          disabled={savingBranchHours || !selectedBranchForHoursId}
          className="inline-flex items-center gap-2 rounded-3xl bg-[#414E36] px-5 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26] disabled:opacity-50"
        >
          {savingBranchHours ? t.savingBtn : t.saveBtn}
        </button>
      </div>
      <div className="rounded-[40px] bg-white p-8 shadow-[0_30px_80px_rgba(47,61,41,0.07)] max-w-2xl space-y-4">
        {serviceHours.map((sh, idx) => (
          <div key={idx} className="flex items-center justify-between border-b border-[#F2EFE9] pb-3 last:border-b-0 last:pb-0">
            <span className="font-semibold text-[#1F251A] w-28">{lang === "ar" ? sh.dayAr : sh.day}</span>
            <div className="flex items-center gap-4 flex-1 justify-end">
              <label className="flex items-center gap-2 cursor-pointer mr-2">
                <input
                  type="checkbox"
                  checked={sh.isOpen}
                  onChange={(e) => {
                    const newHours = [...serviceHours];
                    newHours[idx].isOpen = e.target.checked;
                    setServiceHours(newHours);
                  }}
                  className="accent-[#414E36] w-4 h-4 cursor-pointer"
                />
                <span className="text-sm text-[#5A6A51]">{sh.isOpen ? t.open : t.closed}</span>
              </label>
              {sh.isOpen && (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={sh.openTime}
                    onChange={(e) => {
                      const newHours = [...serviceHours];
                      newHours[idx].openTime = e.target.value;
                      setServiceHours(newHours);
                    }}
                    className="rounded-lg border border-[#414E36]/15 px-2 py-1 text-sm outline-none w-28"
                  />
                  <span className="text-sm text-[#5A6A51]">{t.to}</span>
                  <input
                    type="time"
                    value={sh.closeTime}
                    onChange={(e) => {
                      const newHours = [...serviceHours];
                      newHours[idx].closeTime = e.target.value;
                      setServiceHours(newHours);
                    }}
                    className="rounded-lg border border-[#414E36]/15 px-2 py-1 text-sm outline-none w-28"
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
