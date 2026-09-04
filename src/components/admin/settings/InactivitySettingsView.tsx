"use client";

import { Hourglass, Clock, Check } from "lucide-react";
import { adminTranslations } from "@/components/admin/translations";

interface InactivitySettingsViewProps {
  inactivityThreshold: number;
  setInactivityThreshold: (v: number) => void;
  inactivityCountdown: number;
  setInactivityCountdown: (v: number) => void;
  handleSaveInactivitySettings: () => Promise<void>;
  savingInactivitySettings: boolean;
  lang: "en" | "ar";
  t: (typeof adminTranslations)["en"]["settingsScreens"]["inactivitySettings"];
}

export default function InactivitySettingsView({
  inactivityThreshold,
  setInactivityThreshold,
  inactivityCountdown,
  setInactivityCountdown,
  handleSaveInactivitySettings,
  savingInactivitySettings,
  lang,
  t,
}: InactivitySettingsViewProps) {
  return (
    <div className="space-y-6" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-semibold text-[#1F251A]">{t.title}</h2>
          <p className="mt-2 text-sm text-[#5A6A51]">{t.subtitle}</p>
        </div>
        <button
          onClick={handleSaveInactivitySettings}
          disabled={savingInactivitySettings}
          className="rounded-3xl bg-[#414E36] px-6 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26] disabled:opacity-50 shadow-md"
        >
          {savingInactivitySettings ? t.savingBtn : t.saveBtn}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Inactivity Threshold */}
        <div className="rounded-[40px] bg-white p-8 shadow-[0_30px_80px_rgba(47,61,41,0.07)] space-y-6">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
            <div className="h-10 w-10 flex items-center justify-center rounded-full bg-amber-50 text-amber-600 border border-amber-100">
              <Hourglass size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#1F251A]">{t.inactivityDuration}</h3>
              <p className="text-xs text-[#5A6A51]">{t.inactivityDurationDesc}</p>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51] mb-2">
              {t.alertThreshold}
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={5}
                max={120}
                step={5}
                value={inactivityThreshold}
                onChange={(e) => setInactivityThreshold(Number(e.target.value))}
                className="flex-1 accent-[#414E36] h-2 rounded-full cursor-pointer"
              />
              <div className="w-20 rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2 text-center text-sm font-bold text-[#1F251A]">
                {inactivityThreshold} {t.min}
              </div>
            </div>
            <p className="text-[11px] text-[#8A9A81] mt-2">
              {t.alertThresholdHint} <strong>{inactivityThreshold} {t.minutes}</strong>, {t.alertThresholdHint2}
            </p>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {[10, 15, 30, 60].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setInactivityThreshold(val)}
                  className={`rounded-xl py-2 text-xs font-semibold transition border ${inactivityThreshold === val ? 'bg-[#414E36] text-white border-[#414E36]' : 'bg-[#F5F5F0] text-[#5A6A51] border-transparent hover:border-[#414E36]/30'}`}
                >
                  {val} {t.min}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Alert Countdown Duration */}
        <div className="rounded-[40px] bg-white p-8 shadow-[0_30px_80px_rgba(47,61,41,0.07)] space-y-6">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
            <div className="h-10 w-10 flex items-center justify-center rounded-full bg-rose-50 text-rose-600 border border-rose-100">
              <Clock size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#1F251A]">{t.countdownDuration}</h3>
              <p className="text-xs text-[#5A6A51]">{t.countdownDurationDesc}</p>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51] mb-2">
              {t.countdownLabel}
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={5}
                max={60}
                step={5}
                value={inactivityCountdown}
                onChange={(e) => setInactivityCountdown(Number(e.target.value))}
                className="flex-1 accent-[#414E36] h-2 rounded-full cursor-pointer"
              />
              <div className="w-20 rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2 text-center text-sm font-bold text-[#1F251A]">
                {inactivityCountdown}s
              </div>
            </div>
            <p className="text-[11px] text-[#8A9A81] mt-2">
              {t.countdownHint} <strong>{inactivityCountdown} {t.seconds}</strong> {t.countdownHint2}
            </p>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {[5, 10, 30, 60].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setInactivityCountdown(val)}
                  className={`rounded-xl py-2 text-xs font-semibold transition border ${inactivityCountdown === val ? 'bg-[#414E36] text-white border-[#414E36]' : 'bg-[#F5F5F0] text-[#5A6A51] border-transparent hover:border-[#414E36]/30'}`}
                >
                  {val}s
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Preview Card */}
      <div className="rounded-[40px] bg-white p-8 shadow-[0_30px_80px_rgba(47,61,41,0.07)]">
        <h3 className="text-lg font-bold text-[#1F251A] border-b border-gray-100 pb-4 mb-6">{t.alertPreview}</h3>
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="flex-1 bg-[#FBFBF9] rounded-3xl p-6 border border-[#414E36]/10">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#5A6A51] mb-3">{t.alertPreviewDesc}</p>
            <div className="rounded-[24px] bg-white border border-[#414E36]/10 p-6 text-center space-y-4 shadow-md max-w-xs mx-auto">
              <div className="h-12 w-12 mx-auto flex items-center justify-center rounded-full bg-amber-50 text-amber-600 border border-amber-100">
                <Clock size={24} />
              </div>
              <h4 className="text-lg font-bold text-[#1F251A]">{t.activityVerification}</h4>
              <p className="text-xs text-[#5A6A51]">{t.activityVerificationDesc}</p>
              <div className="text-4xl font-bold text-[#414E36]">{inactivityCountdown}s</div>
              <p className="text-[10px] text-[#8A9A81]">{t.alertSentToAdmin}</p>
              <div className="rounded-2xl bg-[#414E36] py-2 px-4 text-xs font-bold text-white">{t.iAmPresent}</div>
            </div>
          </div>
          <div className="flex-1 space-y-4">
            <div className="flex items-start gap-3 rounded-2xl bg-amber-50 border border-amber-100 p-4">
              <Hourglass size={16} className="mt-0.5 text-amber-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-[#1F251A]">{t.alertTriggersAfter} {inactivityThreshold} {t.minutes}</p>
                <p className="text-xs text-[#5A6A51] mt-0.5">{t.alertTriggersAfterHint}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl bg-rose-50 border border-rose-100 p-4">
              <Clock size={16} className="mt-0.5 text-rose-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-[#1F251A]">{t.employeeHas} {inactivityCountdown} {t.seconds} {t.toRespond}</p>
                <p className="text-xs text-[#5A6A51] mt-0.5">{t.employeeHasHint}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 border border-emerald-100 p-4">
              <Check size={16} className="mt-0.5 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-[#1F251A]">{t.appliesToStandard}</p>
                <p className="text-xs text-[#5A6A51] mt-0.5">{t.appliesToStandardHint}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
