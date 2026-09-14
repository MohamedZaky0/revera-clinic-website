import { Hourglass, Clock, Check, MapPin, Info, ShieldCheck, MapPinOff, Zap, Sparkles, Activity, ShieldAlert, CheckCircle2, Lock } from "lucide-react";
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
  globalEndingSession?: boolean;
  setGlobalEndingSession?: (v: boolean) => void;
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
  globalEndingSession = false,
  setGlobalEndingSession,
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

      {/* GPS Location Shift Verification Card */}
      <div className="rounded-[40px] bg-white p-8 shadow-[0_30px_80px_rgba(47,61,41,0.07)] space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 flex items-center justify-center rounded-full bg-[#EBF0E6] text-[#414E36] border border-[#414E36]/10 shrink-0">
              <MapPin size={20} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-lg font-bold text-[#1F251A]">{t.enableGpsShiftInfoTitle || t.enableGpsShift}</h3>
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
                    className="text-[#5A6A51]/60 hover:text-[#414E36] transition-colors p-0.5 rounded-full hover:bg-[#EDF1EC] flex"
                    title={t.clickForInfo || "Click for info"}
                  >
                    <Info size={14} />
                  </button>
                )}
              </div>
              <p className="text-xs text-[#5A6A51]">{t.enableGpsShiftHint}</p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enableGpsShift}
              onChange={(e) => setEnableGpsShift(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#414E36]"></div>
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

      {/* Futuristic Global Ending Session Control Card */}
      <div className="relative overflow-hidden rounded-[40px] bg-white p-8 shadow-[0_30px_80px_rgba(47,61,41,0.07)] border border-[#414E36]/10 space-y-6">
        {/* Futuristic Ambient Glow Effect */}
        <div className={`absolute top-0 end-0 -mt-12 -me-12 h-48 w-48 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${globalEndingSession ? 'bg-emerald-400/20' : 'bg-gray-200/20'}`} />
        
        <div className="relative flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-5">
          <div className="flex items-center gap-3.5">
            <div className={`h-12 w-12 flex items-center justify-center rounded-2xl transition-all duration-500 shadow-sm shrink-0 ${
              globalEndingSession 
                ? 'bg-gradient-to-br from-[#1F251A] via-[#414E36] to-[#0F3826] text-emerald-300 ring-4 ring-emerald-500/20 shadow-emerald-900/10' 
                : 'bg-gray-100 text-gray-400 border border-gray-200'
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
                    : 'bg-gray-100 text-gray-500 border border-gray-200'
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
              ? 'bg-gradient-to-br from-emerald-50/90 via-[#F4F8F1] to-emerald-50/50 border-emerald-300/80 text-emerald-950 shadow-xs' 
              : 'bg-gray-50 border-gray-200 opacity-60 text-gray-500'
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
              <span className="inline-block rounded-lg bg-white/80 px-2 py-0.5 text-[10px] font-bold text-[#414E36] border border-[#414E36]/15">
                ✓ Medical Intake
              </span>
              <span className="inline-block rounded-lg bg-white/80 px-2 py-0.5 text-[10px] font-bold text-[#414E36] border border-[#414E36]/15">
                ✓ Digital Rx
              </span>
              <span className="inline-block rounded-lg bg-white/80 px-2 py-0.5 text-[10px] font-bold text-[#414E36] border border-[#414E36]/15">
                ✓ Consumables &amp; Pulses
              </span>
              <span className="inline-block rounded-lg bg-white/80 px-2 py-0.5 text-[10px] font-bold text-[#414E36] border border-[#414E36]/15">
                ✓ Doctor Auto-Exit
              </span>
            </div>
          </div>

          <div className={`p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden ${
            !globalEndingSession 
              ? 'bg-gradient-to-br from-amber-50/90 via-[#FDFBF7] to-amber-50/50 border-amber-300/80 text-amber-950 shadow-xs' 
              : 'bg-gray-50 border-gray-200 opacity-60 text-gray-500'
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
            <p className="text-xs leading-relaxed text-[#4A3D2A]">
              {t.globalEndingSessionRestrictedDesc}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="inline-block rounded-lg bg-white/80 px-2 py-0.5 text-[10px] font-bold text-[#5A6A51] border border-gray-200">
                • Booking Details View Only
              </span>
              <span className="inline-block rounded-lg bg-white/80 px-2 py-0.5 text-[10px] font-bold text-[#5A6A51] border border-gray-200">
                • Doctor-Only Intake
              </span>
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
