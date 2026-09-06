"use client";

import { Info } from "lucide-react";
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
  enableGpsShift: boolean;
  setEnableGpsShift: (v: boolean) => void;
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
  enableGpsShift,
  setEnableGpsShift,
  handleSaveBookingSettings,
  savingBookingSettings,
  setActiveInfoFeature,
  lang,
  t,
}: BookingSettingsViewProps) {
  return (
    <div className="space-y-6" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-semibold text-[#1F251A]">{t.title}</h2>
          <p className="mt-2 text-sm text-[#5A6A51]">{t.subtitle}</p>
        </div>
        <button
          onClick={handleSaveBookingSettings}
          disabled={savingBookingSettings}
          className="rounded-3xl bg-[#414E36] px-6 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26] disabled:opacity-50 shadow-md"
        >
          {savingBookingSettings ? t.savingBtn : t.saveBtn}
        </button>
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

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={enableGpsShift}
                onChange={(e) => setEnableGpsShift(e.target.checked)}
                className="accent-[#414E36] w-4 h-4 cursor-pointer"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-[#1F251A]">{t.enableGpsShift}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setActiveInfoFeature({
                        title: t.enableGpsShiftInfoTitle || t.enableGpsShift,
                        description: t.enableGpsShiftInfoDesc || "When enabled, employees and receptionists must be physically present inside the clinic branch location (within 800m-1000m) to clock in and start their daily shift. When disabled, staff can clock in and start shifts from anywhere without GPS restriction."
                      });
                    }}
                    className="text-[#5A6A51]/60 hover:text-[#414E36] transition-colors p-0.5 rounded-full hover:bg-[#EDF1EC] flex"
                    title={t.clickForInfo}
                  >
                    <Info size={13} />
                  </button>
                </div>
                <span className="text-xs text-[#5A6A51]">{t.enableGpsShiftHint}</span>
              </div>
            </label>
          </div>
        </div>
    </div>
  );
}
