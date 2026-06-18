"use client";

import { useEffect, useState, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Category, ServiceItem } from "@/lib/services";
import { 
  getServiceToggles, 
  isServiceActive, 
  ServiceToggleState, 
  getDynamicServices, 
  getDynamicCategories, 
  sortServices,
  LocalCategory 
} from "@/lib/serviceStore";

type Step = 1 | 2 | 3 | 4;

function getNext30Days(): Date[] {
  const days: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}

// 8 sessions every 30 minutes starting at 12:00 PM: 12:00, 12:30, 13:00 ... 15:30
const TIME_SLOTS = [
  '12:00 PM','12:30 PM','01:00 PM','01:30 PM','02:00 PM','02:30 PM','03:00 PM','03:30 PM'
];

function to24(slot: string) {
  // input like "12:30 PM" -> return "12:30" or "15:30"
  const dt = new Date('1970-01-01 ' + slot);
  const hh = String(dt.getHours()).padStart(2, '0');
  const mm = String(dt.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/** Format a local Date to YYYY-MM-DD without UTC conversion */
function toLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function BookingModal() {
  const { t, isRTL } = useLanguage();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [selectedCategory, setSelectedCategory] = useState<Category>("dermatology");
  const [serviceId, setServiceId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState("");
  const [sessionType, setSessionType] = useState<"in_person" | "online">("in_person");
  const [confirmed, setConfirmed] = useState(false);
  const [disabledDates, setDisabledDates] = useState<Record<string, number>>({});
  const [takenSlots, setTakenSlots] = useState<string[]>([]);

  const days = getNext30Days();

  const resetState = useCallback(() => {
    setStep(1);
    setSelectedCategory("dermatology");
    setServiceId(null);
    setSelectedDate(null);
    setSelectedTime(null);
    setName('');
    setEmail('');
    setPhone('');
    setNotes("");
    setSessionType("in_person");
    setConfirmed(false);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    resetState();
  }, [resetState]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { serviceId?: number } | null;
      const id = detail?.serviceId ?? null;
      setServiceId(id);
      if (id) {
        const svcs = getDynamicServices();
        const selected = svcs.find((service) => service.id === id);
        const cats = getDynamicCategories();
        setSelectedCategory(selected?.cat ?? cats[0]?.key ?? "dermatology");
      } else {
        const cats = getDynamicCategories();
        setSelectedCategory(cats[0]?.key ?? "dermatology");
      }
      setOpen(true);
    };
    window.addEventListener("open-booking", handler);
    return () => window.removeEventListener("open-booking", handler);
  }, []);

  // Sync service toggle state from admin localStorage
  const [serviceToggles, setServiceToggles] = useState<ServiceToggleState>({});
  const [dynamicServices, setDynamicServices] = useState<ServiceItem[]>([]);
  const [dynamicCategories, setDynamicCategories] = useState<LocalCategory[]>([]);

  useEffect(() => {
    setServiceToggles(getServiceToggles());
    setDynamicServices(getDynamicServices());
    setDynamicCategories(getDynamicCategories());

    fetch("/api/services")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const sorted = sortServices(data);
          setDynamicServices(sorted);
          localStorage.setItem("revera_dynamic_services", JSON.stringify(sorted));
        }
      })
      .catch((err) => console.error("BookingModal: fetch services failed", err));

    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const sortedCats = data.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
          setDynamicCategories(sortedCats);
          localStorage.setItem("revera_dynamic_categories", JSON.stringify(sortedCats));
          setDynamicServices(prev => sortServices(prev));
        }
      })
      .catch((err) => console.error("BookingModal: fetch categories failed", err));

    const handleStorage = () => {
      setServiceToggles(getServiceToggles());
      setDynamicServices(getDynamicServices());
      setDynamicCategories(getDynamicCategories());
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // Fetch availability for next 30 days when modal opens or service changes
  useEffect(() => {
    if (!open || !serviceId) return;
    fetch(`/api/availability?serviceId=${serviceId}&days=30`).then(r => r.json()).then((data) => {
      const map: Record<string, number> = {};
      if (Array.isArray(data)) {
        data.forEach((d: { date: string; approvedCount: number }) => { map[d.date] = d.approvedCount; });
      } else {
        console.error("Fetch availability expected array, got", data);
      }
      setDisabledDates(map);
    }).catch(()=>{});
  }, [open, serviceId]);

  // Fetch taken time slots for a single selected date
  useEffect(() => {
    let active = true;
    if (!serviceId || !selectedDate) {
      Promise.resolve().then(() => {
        if (active) setTakenSlots([]);
      });
      return;
    }
    const date = toLocalDateStr(selectedDate);
    fetch(`/api/reservations?serviceId=${serviceId}&date=${date}&status=approved`)
      .then(r=>r.json())
      .then((list)=>{
        if (active) {
          if (Array.isArray(list)) {
            const slots = list.map((i: { timeSlot?: string | null }) => i.timeSlot).filter(Boolean) as string[];
            setTakenSlots(slots);
          } else {
            console.error("Fetch reservations expected array, got", list);
            setTakenSlots([]);
          }
        }
      })
      .catch(()=>{
        if (active) setTakenSlots([]);
      });
    return () => {
      active = false;
    };
  }, [serviceId, selectedDate]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, handleClose]);

  function handleNext() {
    if (step === 1 && serviceId !== null) setStep(2);
    if (step === 2 && selectedDate) setStep(3);
    if (step === 3 && selectedTime) setStep(4);
  }

  function handleBack() {
    if (step === 2) setStep(1);
    if (step === 3) setStep(2);
    if (step === 4) setStep(3);
  }

  function handleConfirm() {
    if (!serviceId || !selectedDate || !selectedTime || !name || !email || !phone) return;
    const payload = {
      serviceId,
      date: toLocalDateStr(selectedDate),
      requestedTime: selectedTime,
      name, email, phone, notes,
      sessionType,
    };
    fetch('/api/reservations', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } })
      .then(r => r.json())
      .then(() => setConfirmed(true))
      .catch(() => setConfirmed(true));
  }

  const selectedService = serviceId ? dynamicServices.find((service) => service.id === serviceId) : undefined;
  // Filter out services that admin marked as inactive or hidden
  const activeServices = dynamicServices.filter(s => isServiceActive(s.id, serviceToggles));
  const servicesForCategory = activeServices.filter((service) => service.cat === selectedCategory);

  const canNext =
    (step === 1 && serviceId !== null) ||
    (step === 2 && selectedDate !== null) ||
    (step === 3 && selectedTime !== null);

  return (
    <div
      className={`modal-overlay${open ? " open" : ""}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={t.booking.title}
    >
      <div className="modal-box" dir={isRTL ? "rtl" : "ltr"}>
        {/* Header */}
        <div className={`flex items-center justify-between mb-6 ${isRTL ? "flex-row-reverse" : ""}`}>
          <div>
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full mb-2"
              style={{ backgroundColor: "var(--cr-secondary)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/main_logo.png" alt="Revera" width={28} height={28} style={{ objectFit: "contain" }} />
            </div>
            <h3 className="text-lg font-semibold" style={{ color: "var(--cr-primary)" }}>
              {t.booking.title}
            </h3>
            {!confirmed && (
              <p className="text-xs mt-0.5" style={{ color: "var(--cr-accent)" }}>
                {t.booking.subtitle}
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            aria-label={t.booking.closeBtn}
            className="flex h-8 w-8 items-center justify-center rounded-full text-xl transition-colors hover:bg-gray-100"
            style={{ color: "var(--cr-accent)" }}
          >
            ×
          </button>
        </div>

        {/* Success screen */}
        {confirmed ? (
          <div className="flex flex-col items-center text-center py-8 gap-4">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full"
              style={{ backgroundColor: "var(--cr-secondary)" }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--cr-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 style={{ color: "var(--cr-primary)" }}>{t.booking.successTitle}</h3>
            <p className="text-sm" style={{ color: "var(--cr-accent)" }}>
              {t.booking.successSubtitle}
            </p>
            {selectedDate && selectedTime && (
              <div
                className="w-full rounded-xl p-4 text-sm text-left"
                style={{ backgroundColor: "var(--cr-secondary)" }}
                dir={isRTL ? "rtl" : "ltr"}
              >
                <p className="mb-1">
                  <span className="font-semibold">{t.booking.labels.date}: </span>
                  {formatDate(selectedDate)}
                </p>
                <p className="mb-0">
                  <span className="font-semibold">{t.booking.labels.time}: </span>
                  {selectedTime}
                </p>
              </div>
            )}
            <button onClick={handleClose} className="btn-primary mt-2">
              {t.booking.closeBtn}
            </button>
          </div>
        ) : (
          <>
            {/* Step progress */}
            <div className={`flex items-center justify-between mb-8 ${isRTL ? "flex-row-reverse" : ""}`}>
              {t.booking.steps.map((label, i) => {
                const stepNum = (i + 1) as Step;
                const isActive = step === stepNum;
                const isDone = step > stepNum;
                return (
                  <div key={i} className={`flex flex-1 flex-col items-center gap-1.5 ${isRTL ? "items-center" : ""}`}>
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors"
                      style={{
                        backgroundColor: isActive || isDone ? "var(--cr-primary)" : "var(--cr-secondary)",
                        color: isActive || isDone ? "var(--cr-white)" : "var(--cr-accent)",
                      }}
                    >
                      {isDone ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        stepNum
                      )}
                    </div>
                    <span
                      className="text-center text-xs leading-tight"
                      style={{ color: isActive ? "var(--cr-primary)" : "var(--cr-accent)" }}
                    >
                      {label}
                    </span>
                    {i < t.booking.steps.length - 1 && (
                      <div
                        className={`hidden sm:block h-px flex-1 absolute`}
                        aria-hidden="true"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Step 1: Service selection */}
            {step === 1 && (
              <div>
                <p className="mb-4 text-sm font-semibold" style={{ color: "var(--cr-primary)" }}>
                  {t.booking.labels.service}
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {dynamicCategories.map((category) => {
                    const label = isRTL && category.ar ? category.ar : category.en;
                    const isActive = selectedCategory === category.key;
                    return (
                      <button
                        key={category.key}
                        onClick={() => setSelectedCategory(category.key)}
                        className="rounded-full px-4 py-2 text-xs font-semibold transition-colors"
                        style={{
                          backgroundColor: isActive ? "var(--cr-primary)" : "var(--cr-secondary)",
                          color: isActive ? "var(--cr-white)" : "var(--cr-primary)",
                          border: isActive ? "none" : "1px solid rgba(65, 78, 54, 0.18)",
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <select
                  value={serviceId ?? ""}
                  onChange={(e) => setServiceId(e.target.value ? Number(e.target.value) : null)}
                  className="cr-input"
                  style={{
                    appearance: "none",
                    WebkitAppearance: "none",
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23414e36' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: isRTL ? "left 12px center" : "right 12px center",
                    paddingRight: isRTL ? "12px" : "40px",
                    paddingLeft: isRTL ? "40px" : "12px",
                    cursor: "pointer",
                  }}
                >
                  <option value="" disabled>
                    {isRTL ? "— اختر خدمة —" : "— Select a service —"}
                  </option>
                  {servicesForCategory.map((service) => (
                    <option key={service.id} value={service.id}>
                      {isRTL ? service.ar : service.en} · {service.unit}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Step 2: Date grid */}
            {step === 2 && (
              <div>
                <p className="mb-4 text-sm font-semibold" style={{ color: "var(--cr-primary)" }}>
                  {t.booking.selectDate}
                </p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                  {days.map((day, i) => {
                    const isSelected =
                      selectedDate?.toDateString() === day.toDateString();
                    const key = toLocalDateStr(day);
                    const isDisabled = (disabledDates[key] ?? 0) >= 8;
                    return (
                      <button
                        key={i}
                        onClick={() => !isDisabled && setSelectedDate(day)}
                        className="flex flex-col items-center rounded-xl py-2 px-1 text-center text-xs transition-colors"
                        style={{
                          backgroundColor: isSelected ? "var(--cr-primary)" : "var(--cr-secondary)",
                          color: isSelected ? "var(--cr-white)" : "var(--cr-primary)",
                          border: isSelected ? "none" : "1.5px solid var(--cr-accent)",
                          opacity: isDisabled ? 0.45 : 1,
                        }}
                      >
                        <span className="font-semibold">
                          {day.toLocaleDateString("en-GB", { day: "2-digit" })}
                        </span>
                        <span className="opacity-70">
                          {day.toLocaleDateString("en-GB", { month: "short" })}
                        </span>
                        <span className="opacity-60 text-[10px]">
                          {day.toLocaleDateString("en-GB", { weekday: "short" })}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 3: Time slots */}
            {step === 3 && (
              <div>
                <p className="mb-4 text-sm font-semibold" style={{ color: "var(--cr-primary)" }}>
                  {t.booking.selectTime}
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {TIME_SLOTS.map((slot) => {
                    const isSelected = selectedTime === slot;
                    const slot24 = to24(slot);
                    const taken = takenSlots.includes(slot24);
                    return (
                      <button
                        key={slot}
                        onClick={() => !taken && setSelectedTime(slot)}
                        className="rounded-xl py-3 text-center text-sm font-medium transition-colors"
                        style={{
                          backgroundColor: isSelected ? "var(--cr-primary)" : "var(--cr-secondary)",
                          color: isSelected ? "var(--cr-white)" : "var(--cr-primary)",
                          border: isSelected ? "none" : "1.5px solid var(--cr-accent)",
                          opacity: taken ? 0.45 : 1,
                        }}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 4: Confirm */}
            {step === 4 && (
              <div>
                <p className="mb-4 text-sm font-semibold" style={{ color: "var(--cr-primary)" }}>
                  {t.booking.confirmTitle}
                </p>

                {/* Summary */}
                <div
                  className="rounded-xl p-4 mb-5 text-sm flex flex-col gap-2"
                  style={{ backgroundColor: "var(--cr-secondary)" }}
                >
                  {selectedService && (
                    <p className="mb-0">
                      <span className="font-semibold">{t.booking.labels.service}: </span>
                      {isRTL ? selectedService.ar : selectedService.en}
                    </p>
                  )}
                  {selectedDate && (
                    <p className="mb-0">
                      <span className="font-semibold">{t.booking.labels.date}: </span>
                      {formatDate(selectedDate)}
                    </p>
                  )}
                  {selectedTime && (
                    <p className="mb-0">
                      <span className="font-semibold">{t.booking.labels.time}: </span>
                      {selectedTime}
                    </p>
                  )}
                </div>

                {/* Notes */}
                <label className="block mb-1 text-xs font-semibold" style={{ color: "var(--cr-accent)" }}>
                  {t.booking.notes}
                </label>
                <textarea
                  className="cr-input resize-none mb-3"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t.booking.notes}
                />

                {/* Session Type Selectors */}
                <label className="block mb-2 text-xs font-semibold" style={{ color: "var(--cr-accent)" }}>
                  {isRTL ? "مكان الجلسة" : "Session Type"}
                </label>
                <div className="flex gap-4 mb-4">
                  <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer text-[#1F251A]">
                    <input
                      type="radio"
                      name="sessionType"
                      value="in_person"
                      checked={sessionType === "in_person"}
                      onChange={() => setSessionType("in_person")}
                      className="accent-[#414E36]"
                    />
                    {isRTL ? "في العيادة (In Person)" : "In Person"}
                  </label>
                  <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer text-[#1F251A]">
                    <input
                      type="radio"
                      name="sessionType"
                      value="online"
                      checked={sessionType === "online"}
                      onChange={() => setSessionType("online")}
                      className="accent-[#414E36]"
                    />
                    {isRTL ? "أونلاين (Online)" : "Online"}
                  </label>
                </div>

                <label className="block mb-1 text-xs font-semibold">Name</label>
                <input className="cr-input mb-2" value={name} onChange={(e)=>setName(e.target.value)} />
                <label className="block mb-1 text-xs font-semibold">Email</label>
                <input className="cr-input mb-2" value={email} onChange={(e)=>setEmail(e.target.value)} />
                <label className="block mb-1 text-xs font-semibold">Phone</label>
                <input className="cr-input mb-4" value={phone} onChange={(e)=>setPhone(e.target.value)} />

                <button
                  onClick={handleConfirm}
                  className="btn-primary w-full justify-center"
                >
                  {t.booking.confirmBtn}
                </button>
              </div>
            )}

            {/* Navigation */}
            <div
              className={`flex mt-6 gap-3 ${
                step === 1 ? "justify-end" : isRTL ? "flex-row-reverse justify-between" : "justify-between"
              }`}
            >
              {step > 1 && (
                <button
                  onClick={handleBack}
                  className="btn-outline"
                >
                  {t.booking.backBtn}
                </button>
              )}
              {step < 4 && (
                <button
                  onClick={handleNext}
                  disabled={!canNext}
                  className="btn-primary"
                  style={{ opacity: canNext ? 1 : 0.4, cursor: canNext ? "pointer" : "not-allowed" }}
                >
                  {t.booking.nextBtn}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
