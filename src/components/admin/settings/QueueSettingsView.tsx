"use client";

import { Info } from "lucide-react";
import { adminTranslations } from "@/components/admin/translations";

interface ActiveInfoFeature {
  title: string;
  description: string;
}

interface QueueSettingsViewProps {
  queueVirtualRoom: boolean;
  setQueueVirtualRoom: (v: boolean) => void;
  queueShowOnScreens: boolean;
  setQueueShowOnScreens: (v: boolean) => void;
  queueAutoCheckIn: boolean;
  setQueueAutoCheckIn: (v: boolean) => void;
  queueAlertThreshold: number;
  setQueueAlertThreshold: (v: number) => void;
  queueAvgSessionDuration: number;
  setQueueAvgSessionDuration: (v: number) => void;
  handleSaveQueueSettings: () => Promise<void>;
  savingQueueSettings: boolean;
  setActiveInfoFeature: (f: ActiveInfoFeature) => void;
  lang: "en" | "ar";
  t: (typeof adminTranslations)["en"]["settingsScreens"]["queueSettings"];
}

export default function QueueSettingsView({
  queueVirtualRoom,
  setQueueVirtualRoom,
  queueShowOnScreens,
  setQueueShowOnScreens,
  queueAutoCheckIn,
  setQueueAutoCheckIn,
  queueAlertThreshold,
  setQueueAlertThreshold,
  queueAvgSessionDuration,
  setQueueAvgSessionDuration,
  handleSaveQueueSettings,
  savingQueueSettings,
  setActiveInfoFeature,
  lang,
  t,
}: QueueSettingsViewProps) {
  return (
    <div className="space-y-6" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-semibold text-[#1F251A]">{t.title}</h2>
          <p className="mt-2 text-sm text-[#5A6A51]">{t.subtitle}</p>
        </div>
        <button
          onClick={handleSaveQueueSettings}
          disabled={savingQueueSettings}
          className="rounded-3xl bg-[#414E36] px-6 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26] disabled:opacity-50 shadow-md"
        >
          {savingQueueSettings ? t.savingBtn : t.saveBtn}
        </button>
      </div>

      <div className="rounded-[40px] bg-white p-8 shadow-[0_30px_80px_rgba(47,61,41,0.07)] max-w-2xl space-y-6">
        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={queueVirtualRoom}
              onChange={(e) => setQueueVirtualRoom(e.target.checked)}
              className="accent-[#414E36] w-4 h-4 cursor-pointer"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-[#1F251A]">{t.virtualRoom}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveInfoFeature({
                      title: t.virtualRoom,
                      description: "When enabled, patients who have checked in can open the clinic's web portal on their phone and see a live view of their position in the queue (e.g. '3rd in line'). They receive automatic updates as the queue progresses, allowing them to wait comfortably outside the clinic."
                    });
                  }}
                  className="text-[#5A6A51]/60 hover:text-[#414E36] transition-colors p-0.5 rounded-full hover:bg-[#EDF1EC] flex"
                  title={t.clickForInfo}
                >
                  <Info size={13} />
                </button>
              </div>
              <span className="text-xs text-[#5A6A51]">{t.virtualRoomHint}</span>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={queueShowOnScreens}
              onChange={(e) => setQueueShowOnScreens(e.target.checked)}
              className="accent-[#414E36] w-4 h-4 cursor-pointer"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-[#1F251A]">{t.showOnScreens}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveInfoFeature({
                      title: t.showOnScreens,
                      description: "When enabled, a real-time queue board is projected onto TV screens in the clinic lobby, showing patients' ticket numbers and current calling status. This reduces reception desk inquiries and keeps the lobby atmosphere calm and organized."
                    });
                  }}
                  className="text-[#5A6A51]/60 hover:text-[#414E36] transition-colors p-0.5 rounded-full hover:bg-[#EDF1EC] flex"
                  title={t.clickForInfo}
                >
                  <Info size={13} />
                </button>
              </div>
              <span className="text-xs text-[#5A6A51]">{t.showOnScreensHint}</span>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={queueAutoCheckIn}
              onChange={(e) => setQueueAutoCheckIn(e.target.checked)}
              className="accent-[#414E36] w-4 h-4 cursor-pointer"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-[#1F251A]">{t.autoCheckIn}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveInfoFeature({
                      title: t.autoCheckIn,
                      description: "When enabled, the system automatically detects a patient's arrival using GPS geofencing (when they enter the clinic's location boundary) or by scanning a QR code at reception. This eliminates manual check-in steps and instantly places the patient in the queue."
                    });
                  }}
                  className="text-[#5A6A51]/60 hover:text-[#414E36] transition-colors p-0.5 rounded-full hover:bg-[#EDF1EC] flex"
                  title={t.clickForInfo}
                >
                  <Info size={13} />
                </button>
              </div>
              <span className="text-xs text-[#5A6A51]">{t.autoCheckInHint}</span>
            </div>
          </label>
        </div>

        <div className="border-t border-[#F2EFE9] pt-6 grid gap-6 md:grid-cols-2">
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51]">{t.alertThreshold}</label>
              <button
                type="button"
                onClick={() => setActiveInfoFeature({
                  title: t.alertThreshold,
                  description: "Set how many patients ahead of them the system should send a heads-up SMS alert to notify the next patient to return to the waiting room. For example, set to '2 Patients Ahead' so the patient is alerted when there are only 2 people before their turn."
                })}
                className="text-[#5A6A51]/60 hover:text-[#414E36] transition-colors p-0.5 rounded-full hover:bg-[#EDF1EC] flex"
                title={t.clickForInfo}
              >
                <Info size={13} />
              </button>
            </div>
            <select
              value={queueAlertThreshold}
              onChange={(e) => setQueueAlertThreshold(Number(e.target.value))}
              className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm text-[#1F251A] outline-none focus:border-[#414E36] transition"
            >
              <option value={1}>1 {t.patientAhead}</option>
              <option value={2}>2 {t.patientsAhead}</option>
              <option value={3}>3 {t.patientsAhead}</option>
              <option value={4}>4 {t.patientsAhead}</option>
              <option value={5}>5 {t.patientsAhead}</option>
            </select>
            <span className="text-[11px] text-[#8A9A81] mt-1 block">{t.alertThresholdHint}</span>
          </div>

          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51]">{t.avgSessionDuration}</label>
              <button
                type="button"
                onClick={() => setActiveInfoFeature({
                  title: t.avgSessionDuration,
                  description: "Enter the average time in minutes that a doctor's appointment or treatment session typically takes. This value is used to calculate estimated wait times for patients in the queue. For example, if set to 20 minutes and there are 3 patients ahead, the system estimates a 60-minute wait."
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
              value={queueAvgSessionDuration}
              onChange={(e) => setQueueAvgSessionDuration(Number(e.target.value))}
              className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm text-[#1F251A] outline-none focus:border-[#414E36] transition"
            />
            <span className="text-[11px] text-[#8A9A81] mt-1 block">{t.avgSessionDurationHint}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
