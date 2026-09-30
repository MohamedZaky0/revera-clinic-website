import { Hourglass, Clock, Check, MapPin, Info, ShieldCheck, MapPinOff } from "lucide-react";
import { adminTranslations } from "@/components/admin/translations";

interface ActiveInfoFeature {
  title: string;
  description: string;
}

interface InactivitySettingsViewProps {
  inactivityThreshold: number;
  setInactivityThreshold: (v: number) => void;
  inactivityCountdown: number;
  setInactivityCountdown: (v: number) => void;
  enableGpsShift: boolean;
  setEnableGpsShift: (v: boolean) => void;
  handleSaveInactivitySettings: () => Promise<void>;
  savingInactivitySettings: boolean;
  setActiveInfoFeature?: (f: ActiveInfoFeature) => void;
  lang: "en" | "ar";
  t: (typeof adminTranslations)["en"]["settingsScreens"]["inactivitySettings"];
}

export default function InactivitySettingsView({
  inactivityThreshold,
  setInactivityThreshold,
  inactivityCountdown,
  setInactivityCountdown,
  enableGpsShift,
  setEnableGpsShift,
  handleSaveInactivitySettings,
  savingInactivitySettings,
  setActiveInfoFeature,
  lang,
  t,
}: InactivitySettingsViewProps) {
  return (
    <div className="space-y-6" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-semibold text-[var(--cr-dark)]">{t.title}</h2>
          <p className="mt-2 text-sm text-[var(--color-brand-secondary)]">{t.subtitle}</p>
        </div>
        <button
          onClick={handleSaveInactivitySettings}
          disabled={savingInactivitySettings}
          className="rounded-3xl bg-[var(--cr-primary)] px-6 py-3 text-sm font-semibold text-[var(--color-brand-light)] transition hover:bg-[#2e3a26] disabled:opacity-50 shadow-md"
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
              <h3 className="text-lg font-bold text-[var(--cr-dark)]">{t.inactivityDuration}</h3>
              <p className="text-xs text-[var(--color-brand-secondary)]">{t.inactivityDurationDesc}</p>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-brand-secondary)] mb-2">
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
                className="flex-1 accent-[var(--cr-primary)] h-2 rounded-full cursor-pointer"
              />
              <div className="w-20 rounded-2xl border border-[var(--cr-primary)]/15 bg-[var(--color-brand-light)] px-3 py-2 text-center text-sm font-bold text-[var(--cr-dark)]">
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
                  className={`rounded-xl py-2 text-xs font-semibold transition border ${inactivityThreshold === val ? 'bg-[var(--cr-primary)] text-white border-[var(--cr-primary)]' : 'bg-[#F5F5F0] text-[var(--color-brand-secondary)] border-transparent hover:border-[var(--cr-primary)]/30'}`}
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
              <h3 className="text-lg font-bold text-[var(--cr-dark)]">{t.countdownDuration}</h3>
              <p className="text-xs text-[var(--color-brand-secondary)]">{t.countdownDurationDesc}</p>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-brand-secondary)] mb-2">
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
                className="flex-1 accent-[var(--cr-primary)] h-2 rounded-full cursor-pointer"
              />
              <div className="w-20 rounded-2xl border border-[var(--cr-primary)]/15 bg-[var(--color-brand-light)] px-3 py-2 text-center text-sm font-bold text-[var(--cr-dark)]">
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
                  className={`rounded-xl py-2 text-xs font-semibold transition border ${inactivityCountdown === val ? 'bg-[var(--cr-primary)] text-white border-[var(--cr-primary)]' : 'bg-[#F5F5F0] text-[var(--color-brand-secondary)] border-transparent hover:border-[var(--cr-primary)]/30'}`}
                >
                  {val}s
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* GPS Location Shift Verification Card */}
      <div className="rounded-[40px] bg-white p-8 shadow-[0_30px_80px_rgba(47,61,41,0.07)] space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 flex items-center justify-center rounded-full bg-[#EBF0E6] text-[var(--cr-primary)] border border-[var(--cr-primary)]/10 shrink-0">
              <MapPin size={20} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-lg font-bold text-[var(--cr-dark)]">{t.enableGpsShiftInfoTitle || t.enableGpsShift}</h3>
                {setActiveInfoFeature && (
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
                    className="text-[var(--color-brand-secondary)]/60 hover:text-[var(--cr-primary)] transition-colors p-0.5 rounded-full hover:bg-[var(--color-brand-tint)] flex"
                    title={t.clickForInfo || "Click for info"}
                  >
                    <Info size={14} />
                  </button>
                )}
              </div>
              <p className="text-xs text-[var(--color-brand-secondary)]">{t.enableGpsShiftHint}</p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enableGpsShift}
              onChange={(e) => setEnableGpsShift(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--cr-primary)]"></div>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`p-4 rounded-2xl border transition-all ${enableGpsShift ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' : 'bg-gray-50 border-gray-200 opacity-60 text-gray-600'}`}>
            <div className="flex items-center gap-2.5 mb-1.5">
              <ShieldCheck size={18} className={enableGpsShift ? 'text-emerald-700' : 'text-gray-400'} />
              <h4 className="text-sm font-bold">{lang === "ar" ? "التحقق الجغرافي مفعل" : "Geofencing Active"}</h4>
            </div>
            <p className="text-xs leading-relaxed">
              {lang === "ar"
                ? "يجب تواجد الموظفين وموظفي الاستقبال فعلياً داخل نطاق الفرع (1000 متر) لبدء الوردية وتسجيل الحضور اليومي."
                : "Staff and receptionists must be physically present inside the clinic branch perimeter (1000m) to start their daily shift."}
            </p>
          </div>

          <div className={`p-4 rounded-2xl border transition-all ${!enableGpsShift ? 'bg-amber-50/70 border-amber-200 text-amber-900' : 'bg-gray-50 border-gray-200 opacity-60 text-gray-600'}`}>
            <div className="flex items-center gap-2.5 mb-1.5">
              <MapPinOff size={18} className={!enableGpsShift ? 'text-amber-700' : 'text-gray-400'} />
              <h4 className="text-sm font-bold">{lang === "ar" ? "تجاوز الموقع مفعل" : "Location Bypass Active"}</h4>
            </div>
            <p className="text-xs leading-relaxed">
              {lang === "ar"
                ? "يمكن للموظفين بدء الوردية وتسجيل الحضور من أي مكان دون الحاجة للتحقق من الموقع الجغرافي أو إذن الـ GPS."
                : "Staff can start their shift and clock in from any location without requiring GPS geolocation permission."}
            </p>
          </div>
        </div>
      </div>

      {/* Preview Card */}
      <div className="rounded-[40px] bg-white p-8 shadow-[0_30px_80px_rgba(47,61,41,0.07)]">
        <h3 className="text-lg font-bold text-[var(--cr-dark)] border-b border-gray-100 pb-4 mb-6">{t.alertPreview}</h3>
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="flex-1 bg-[var(--color-brand-light)] rounded-3xl p-6 border border-[var(--cr-primary)]/10">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-brand-secondary)] mb-3">{t.alertPreviewDesc}</p>
            <div className="rounded-[24px] bg-white border border-[var(--cr-primary)]/10 p-6 text-center space-y-4 shadow-md max-w-xs mx-auto">
              <div className="h-12 w-12 mx-auto flex items-center justify-center rounded-full bg-amber-50 text-amber-600 border border-amber-100">
                <Clock size={24} />
              </div>
              <h4 className="text-lg font-bold text-[var(--cr-dark)]">{t.activityVerification}</h4>
              <p className="text-xs text-[var(--color-brand-secondary)]">{t.activityVerificationDesc}</p>
              <div className="text-4xl font-bold text-[var(--cr-primary)]">{inactivityCountdown}s</div>
              <p className="text-[10px] text-[#8A9A81]">{t.alertSentToAdmin}</p>
              <div className="rounded-2xl bg-[var(--cr-primary)] py-2 px-4 text-xs font-bold text-white">{t.iAmPresent}</div>
            </div>
          </div>
          <div className="flex-1 space-y-4">
            <div className="flex items-start gap-3 rounded-2xl bg-amber-50 border border-amber-100 p-4">
              <Hourglass size={16} className="mt-0.5 text-amber-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-[var(--cr-dark)]">{t.alertTriggersAfter} {inactivityThreshold} {t.minutes}</p>
                <p className="text-xs text-[var(--color-brand-secondary)] mt-0.5">{t.alertTriggersAfterHint}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl bg-rose-50 border border-rose-100 p-4">
              <Clock size={16} className="mt-0.5 text-rose-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-[var(--cr-dark)]">{t.employeeHas} {inactivityCountdown} {t.seconds} {t.toRespond}</p>
                <p className="text-xs text-[var(--color-brand-secondary)] mt-0.5">{t.employeeHasHint}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 border border-emerald-100 p-4">
              <Check size={16} className="mt-0.5 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-[var(--cr-dark)]">{t.appliesToStandard}</p>
                <p className="text-xs text-[var(--color-brand-secondary)] mt-0.5">{t.appliesToStandardHint}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
