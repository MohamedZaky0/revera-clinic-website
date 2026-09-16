"use client";

import { Info, Zap, Sparkles, CheckCircle2, Lock } from "lucide-react";
import { adminTranslations } from "@/components/admin/translations";

interface ActiveInfoFeature {
  title: string;
  description: string;
}

interface BookingSettingsViewProps {
  bookingMinAdvance: number;
  setBookingMinAdvance: (v: number) => void;
  bookingMaxAdvance: number;
  setBookingMaxAdvance: (v: number) => void;
  bookingCancelWindow: number;
  setBookingCancelWindow: (v: number) => void;
  bookingMaxPerSlot: number;
  setBookingMaxPerSlot: (v: number) => void;
  bookingInstantApproval: boolean;
  setBookingInstantApproval: (v: boolean) => void;
  bookingShowDoctorNotes: boolean;
  setBookingShowDoctorNotes: (v: boolean) => void;
  bookingStaleSessionHours: number;
  setBookingStaleSessionHours: (v: number) => void;
  bookingFollowUpLeadDays?: number;
  setBookingFollowUpLeadDays?: (v: number) => void;
  globalEndingSession?: boolean;
  setGlobalEndingSession?: (v: boolean) => void;
  handleSaveBookingSettings: () => Promise<void>;
  savingBookingSettings: boolean;
  setActiveInfoFeature: (f: ActiveInfoFeature) => void;
  lang: "en" | "ar";
  t: (typeof adminTranslations)["en"]["settingsScreens"]["bookingSettings"];
}

export default function BookingSettingsView({
  bookingMinAdvance,
  setBookingMinAdvance,
  bookingMaxAdvance,
  setBookingMaxAdvance,
  bookingCancelWindow,
  setBookingCancelWindow,
  bookingMaxPerSlot,
  setBookingMaxPerSlot,
  bookingInstantApproval,
  setBookingInstantApproval,
  bookingShowDoctorNotes,
  setBookingShowDoctorNotes,
  bookingStaleSessionHours,
  setBookingStaleSessionHours,
  bookingFollowUpLeadDays = 2,
  setBookingFollowUpLeadDays,
  globalEndingSession = false,
  setGlobalEndingSession,
  handleSaveBookingSettings,
  savingBookingSettings,
  setActiveInfoFeature,
  lang,
  t,
}: BookingSettingsViewProps) {
  return (
    <div className="space-y-6" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="mb-6">
        <h2 className="text-4xl font-semibold text-[#1F251A]">{t.title}</h2>
        <p className="mt-2 text-sm text-[#5A6A51]">{t.subtitle}</p>
      </div>

      <div className="max-w-4xl rounded-[40px] bg-white p-8 shadow-[0_30px_80px_rgba(47,61,41,0.07)] space-y-6">
        <h3 className="text-xl font-bold text-[#1F251A] border-b border-gray-100 pb-3">{t.bookingRules}</h3>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51]">{t.minAdvance}</label>
                <button
                  type="button"
                  onClick={() => setActiveInfoFeature({
                    title: t.minAdvance,
                    description: "This setting restricts how close to the appointment time a patient can book. For example, if set to 2 hours, patients cannot book an appointment that starts within the next 2 hours. This prevents last-minute surprise bookings and gives your staff sufficient lead time to prepare for the arriving patient."
                  })}
                  className="text-[#5A6A51]/60 hover:text-[#414E36] transition-colors p-0.5 rounded-full hover:bg-[#EDF1EC] flex"
                  title={t.clickForInfo}
                >
                  <Info size={13} />
                </button>
              </div>
              <select
                value={bookingMinAdvance}
                onChange={(e) => setBookingMinAdvance(Number(e.target.value))}
                className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm text-[#1F251A] outline-none focus:border-[#414E36] transition"
              >
                {[1, 2, 4, 6, 12, 24].map(h => <option key={h} value={h}>{h} {h === 1 ? t.hour : t.hours}</option>)}
              </select>
              <span className="text-[11px] text-[#8A9A81] mt-1 block">{t.minAdvanceHint}</span>
            </div>

            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51]">{t.maxAdvance}</label>
                <button
                  type="button"
                  onClick={() => setActiveInfoFeature({
                    title: t.maxAdvance,
                    description: "This setting defines how far in the future patients are allowed to book appointments. For example, if set to 30 Days, patients can only choose slots within the next 30 days. This keeps your schedule manageable and prevents patients from booking slots too far in advance, which are prone to cancellations."
                  })}
                  className="text-[#5A6A51]/60 hover:text-[#414E36] transition-colors p-0.5 rounded-full hover:bg-[#EDF1EC] flex"
                  title={t.clickForInfo}
                >
                  <Info size={13} />
                </button>
              </div>
              <select
                value={bookingMaxAdvance}
                onChange={(e) => setBookingMaxAdvance(Number(e.target.value))}
                className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm text-[#1F251A] outline-none focus:border-[#414E36] transition"
              >
                {[7, 14, 30, 60, 90].map(d => <option key={d} value={d}>{d} {t.days}</option>)}
              </select>
              <span className="text-[11px] text-[#8A9A81] mt-1 block">{t.maxAdvanceHint}</span>
            </div>

            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51]">{t.cancelWindow}</label>
                <button
                  type="button"
                  onClick={() => setActiveInfoFeature({
                    title: t.cancelWindow,
                    description: "This setting defines the minimum hours before an appointment that a patient can cancel or reschedule without penalty. For example, if set to 24 hours, patients must cancel at least 24 hours prior to the slot. Cancellations attempted inside this window may forfeit their deposit or require clinic intervention."
                  })}
                  className="text-[#5A6A51]/60 hover:text-[#414E36] transition-colors p-0.5 rounded-full hover:bg-[#EDF1EC] flex"
                  title={t.clickForInfo}
                >
                  <Info size={13} />
                </button>
              </div>
              <select
                value={bookingCancelWindow}
                onChange={(e) => setBookingCancelWindow(Number(e.target.value))}
                className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm text-[#1F251A] outline-none focus:border-[#414E36] transition"
              >
                {[1, 2, 4, 6, 12, 24].map(h => <option key={h} value={h}>{h} {h === 1 ? t.hour : t.hours} {t.before}</option>)}
              </select>
              <span className="text-[11px] text-[#8A9A81] mt-1 block">{t.cancelWindowHint}</span>
            </div>

            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51]">{t.maxPerSlot}</label>
                <button
                  type="button"
                  onClick={() => setActiveInfoFeature({
                    title: t.maxPerSlot,
                    description: "This setting defines the maximum number of appointments that can be scheduled concurrently in a single time slot for the clinic. It ensures you do not exceed clinic capacity or overwhelm staff. If the limit is reached, that slot will show as full and unavailable to other patients."
                  })}
                  className="text-[#5A6A51]/60 hover:text-[#414E36] transition-colors p-0.5 rounded-full hover:bg-[#EDF1EC] flex"
                  title={t.clickForInfo}
                >
                  <Info size={13} />
                </button>
              </div>
              <input
                type="number"
                min={1}
                max={10}
                value={bookingMaxPerSlot}
                onChange={(e) => setBookingMaxPerSlot(Number(e.target.value))}
                className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm text-[#1F251A] outline-none focus:border-[#414E36] transition"
              />
              <span className="text-[11px] text-[#8A9A81] mt-1 block">{t.maxPerSlotHint}</span>
            </div>

            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51]">{t.staleSession}</label>
                <button
                  type="button"
                  onClick={() => setActiveInfoFeature({
                    title: t.staleSession,
                    description: "If a doctor starts a session and forgets to mark it Completed, it stays 'In Progress' forever, keeping a room, slot and doctor tied up. This setting controls how many hours a session can stay In Progress before it is flagged in the Bookings screen's Needs Attention panel so staff can complete or cancel it."
                  })}
                  className="text-[#5A6A51]/60 hover:text-[#414E36] transition-colors p-0.5 rounded-full hover:bg-[#EDF1EC] flex"
                  title={t.clickForInfo}
                >
                  <Info size={13} />
                </button>
              </div>
              <select
                value={bookingStaleSessionHours}
                onChange={(e) => setBookingStaleSessionHours(Number(e.target.value))}
                className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm text-[#1F251A] outline-none focus:border-[#414E36] transition"
              >
                {[1, 2, 3, 4, 6, 8, 12].map(h => <option key={h} value={h}>{h} {h === 1 ? t.hour : t.hours}</option>)}
              </select>
              <span className="text-[11px] text-[#8A9A81] mt-1 block">{t.staleSessionHint}</span>
            </div>

            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51]">{t.followUpLeadDays}</label>
                <button
                  type="button"
                  onClick={() => setActiveInfoFeature({
                    title: t.followUpLeadDaysInfoTitle || t.followUpLeadDays,
                    description: t.followUpLeadDaysInfoDesc || "Controls how many days before the scheduled follow-up date the reminder notification appears on the receptionist bookings dashboard, giving receptionists time to contact and schedule the patient."
                  })}
                  className="text-[#5A6A51]/60 hover:text-[#414E36] transition-colors p-0.5 rounded-full hover:bg-[#EDF1EC] flex"
                  title={t.clickForInfo}
                >
                  <Info size={13} />
                </button>
              </div>
              <select
                value={bookingFollowUpLeadDays}
                onChange={(e) => setBookingFollowUpLeadDays && setBookingFollowUpLeadDays(Number(e.target.value))}
                className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm text-[#1F251A] outline-none focus:border-[#414E36] transition"
              >
                {[1, 2, 3, 4, 5, 7, 14].map(d => (
                  <option key={d} value={d}>
                    {d} {d === 1 ? (t.day || "Day") : t.days} {d === 2 ? (lang === "ar" ? "(افتراضي)" : "(Default)") : ""}
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-[#8A9A81] mt-1 block">{t.followUpLeadDaysHint}</span>
            </div>

          </div>

          <div className="border-t border-[#F2EFE9] pt-6 space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={bookingInstantApproval}
                onChange={(e) => setBookingInstantApproval(e.target.checked)}
                className="accent-[#414E36] w-4 h-4 cursor-pointer"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-[#1F251A]">{t.instantApproval}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setActiveInfoFeature({
                        title: t.instantApproval,
                        description: "When enabled, bookings made by patients are automatically marked as Approved and confirmed without requiring manual review by the clinic administrator. When disabled, bookings are marked as Pending and must be manually approved by your admin team."
                      });
                    }}
                    className="text-[#5A6A51]/60 hover:text-[#414E36] transition-colors p-0.5 rounded-full hover:bg-[#EDF1EC] flex"
                    title={t.clickForInfo}
                  >
                    <Info size={13} />
                  </button>
                </div>
                <span className="text-xs text-[#5A6A51]">{t.instantApprovalHint}</span>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={bookingShowDoctorNotes}
                onChange={(e) => setBookingShowDoctorNotes(e.target.checked)}
                className="accent-[#414E36] w-4 h-4 cursor-pointer"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-[#1F251A]">{t.showDoctorNotes}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setActiveInfoFeature({
                        title: t.showDoctorNotes,
                        description: "When enabled, post-visit summary notes written by the provider (e.g. diagnoses, advice, instructions) will be visible to the patient inside their personal profile dashboard. When disabled, notes remain strictly private for internal staff use."
                      });
                    }}
                    className="text-[#5A6A51]/60 hover:text-[#414E36] transition-colors p-0.5 rounded-full hover:bg-[#EDF1EC] flex"
                    title={t.clickForInfo}
                  >
                    <Info size={13} />
                  </button>
                </div>
                <span className="text-xs text-[#5A6A51]">{t.showDoctorNotesHint}</span>
              </div>
            </label>
          </div>

          {/* Futuristic Global Ending Session Control Card */}
          <div className="relative overflow-hidden rounded-[32px] bg-[#FBFBF9] p-6 sm:p-7 border border-[#414E36]/15 shadow-sm space-y-6">
            {/* Futuristic Ambient Glow Effect */}
            <div className={`absolute top-0 end-0 -mt-10 -me-10 h-40 w-40 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${globalEndingSession ? 'bg-emerald-400/25' : 'bg-gray-200/20'}`} />
            
            <div className="relative flex flex-wrap items-center justify-between gap-4 border-b border-[#414E36]/10 pb-5">
              <div className="flex items-center gap-3.5">
                <div className={`h-12 w-12 flex items-center justify-center rounded-2xl transition-all duration-500 shadow-sm shrink-0 ${
                  globalEndingSession 
                    ? 'bg-gradient-to-br from-[#1F251A] via-[#414E36] to-[#0F3826] text-emerald-300 ring-4 ring-emerald-500/20 shadow-emerald-900/10' 
                    : 'bg-white text-gray-400 border border-gray-200'
                }`}>
                  <Zap size={22} className={globalEndingSession ? 'animate-pulse text-emerald-400 fill-emerald-400/30' : ''} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg sm:text-xl font-black text-[#1F251A] tracking-tight">
                      {t.globalEndingSession}
                    </h3>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${
                      globalEndingSession 
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-xs' 
                        : 'bg-white text-gray-500 border border-gray-200'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${globalEndingSession ? 'bg-emerald-600 animate-ping' : 'bg-gray-400'}`} />
                      <span>{globalEndingSession ? (lang === "ar" ? "نشط وفوري" : "LIVE & REACTIVE") : (lang === "ar" ? "معطل" : "DISABLED")}</span>
                    </span>
                    {setActiveInfoFeature && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setActiveInfoFeature({
                            title: t.globalEndingSessionInfoTitle || t.globalEndingSession,
                            description: t.globalEndingSessionInfoDesc
                          });
                        }}
                        className="text-[#5A6A51]/60 hover:text-[#414E36] transition-colors p-1 rounded-full hover:bg-[#EDF1EC] flex cursor-pointer"
                        title={t.clickForInfo || "Click for info"}
                      >
                        <Info size={14} />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-[#5A6A51] mt-1 font-medium max-w-xl">
                    {t.globalEndingSessionHint}
                  </p>
                </div>
              </div>

              {/* Futuristic Cyber-Clinical Toggle Switch */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={globalEndingSession}
                  onClick={() => {
                    const nextVal = !globalEndingSession;
                    setGlobalEndingSession?.(nextVal);
                    if (typeof window !== "undefined") {
                      window.dispatchEvent(
                        new CustomEvent("revera-settings-change", {
                          detail: { globalEndingSession: nextVal }
                        })
                      );
                    }
                  }}
                  className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-full p-1 transition-colors duration-300 ease-in-out focus:outline-none ring-2 ${
                    globalEndingSession 
                      ? 'bg-gradient-to-r from-[#0F3826] to-[#414E36] ring-emerald-500/40 shadow-inner' 
                      : 'bg-gray-200 ring-transparent'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-flex h-6 w-6 transform items-center justify-center rounded-full bg-white shadow-md transition duration-300 ease-in-out ${
                      globalEndingSession 
                        ? 'translate-x-8 rtl:-translate-x-8 text-emerald-800' 
                        : 'translate-x-0 rtl:translate-x-0 text-gray-400'
                    }`}
                  >
                    {globalEndingSession ? <Sparkles size={13} className="text-emerald-700" /> : <Lock size={12} className="text-gray-400" />}
                  </span>
                </button>
              </div>
            </div>

            {/* Feature Capability Status Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden ${
                globalEndingSession 
                  ? 'bg-gradient-to-br from-emerald-50/90 via-white to-emerald-50/50 border-emerald-300/80 text-emerald-950 shadow-xs' 
                  : 'bg-white border-gray-200 opacity-60 text-gray-500'
              }`}>
                <div className="flex items-center gap-2.5 mb-2">
                  <div className={`h-7 w-7 rounded-xl flex items-center justify-center ${globalEndingSession ? 'bg-emerald-600 text-white shadow-xs' : 'bg-gray-200 text-gray-400'}`}>
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">{t.globalEndingSessionActive}</h4>
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800/80">Reception Full Control</span>
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-[#2C3825]">
                  {t.globalEndingSessionActiveDesc}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="inline-block rounded-lg bg-[#EDF1EC] px-2 py-0.5 text-[10px] font-bold text-[#414E36] border border-[#414E36]/15">
                    ✓ Medical Intake
                  </span>
                  <span className="inline-block rounded-lg bg-[#EDF1EC] px-2 py-0.5 text-[10px] font-bold text-[#414E36] border border-[#414E36]/15">
                    ✓ Digital Rx
                  </span>
                  <span className="inline-block rounded-lg bg-[#EDF1EC] px-2 py-0.5 text-[10px] font-bold text-[#414E36] border border-[#414E36]/15">
                    ✓ Consumables &amp; Pulses
                  </span>
                  <span className="inline-block rounded-lg bg-[#EDF1EC] px-2 py-0.5 text-[10px] font-bold text-[#414E36] border border-[#414E36]/15">
                    ✓ Doctor Auto-Exit
                  </span>
                </div>
              </div>

              <div className={`p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden ${
                !globalEndingSession 
                  ? 'bg-gradient-to-br from-amber-50/90 via-white to-amber-50/50 border-amber-300/80 text-amber-950 shadow-xs' 
                  : 'bg-white border-gray-200 opacity-60 text-gray-500'
              }`}>
                <div className="flex items-center gap-2.5 mb-2">
                  <div className={`h-7 w-7 rounded-xl flex items-center justify-center ${!globalEndingSession ? 'bg-amber-600 text-white shadow-xs' : 'bg-gray-200 text-gray-400'}`}>
                    <Lock size={15} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">{t.globalEndingSessionRestricted}</h4>
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-800/80">Doctor Portal Only</span>
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-[#4A3B2C]">
                  {t.globalEndingSessionRestrictedDesc}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="inline-block rounded-lg bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-900 border border-amber-200">
                    • Booking Details View Only
                  </span>
                  <span className="inline-block rounded-lg bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-900 border border-amber-200">
                    • Doctor-Only Intake
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Save Action */}
          <div className="border-t border-[#F2EFE9] pt-6 flex items-center justify-end">
            <button
              type="button"
              onClick={handleSaveBookingSettings}
              disabled={savingBookingSettings}
              className="rounded-3xl bg-[#414E36] px-8 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26] disabled:opacity-50 shadow-md cursor-pointer"
            >
              {savingBookingSettings ? t.savingBtn : t.saveBtn}
            </button>
          </div>
        </div>
    </div>
  );
}
