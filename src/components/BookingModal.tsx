"use client";

import { useEffect, useState, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cachedFetch, prefetchUrl } from "@/lib/fetchCache";
import { Category, ServiceItem, ALL_15MIN_SLOTS, getDurationInMinutes, normaliseTo24hSlot } from "@/lib/services";
import { 
  getServiceToggles, 
  isServiceActive, 
  ServiceToggleState, 
  getDynamicServices, 
  getDynamicCategories, 
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

function to12h(slot24h: string): string {
  const [hhStr, mmStr] = slot24h.split(':');
  let hh = parseInt(hhStr, 10);
  const mm = parseInt(mmStr, 10);
  const ampm = hh >= 12 ? 'PM' : 'AM';
  hh = hh % 12;
  if (hh === 0) hh = 12;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} ${ampm}`;
}

const TIME_SLOTS = ALL_15MIN_SLOTS.map(to12h);

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

function timeToMinutes(timeStr: string): number {
  const norm = normaliseTo24hSlot(timeStr);
  if (!norm) return 0;
  const [hh, mm] = norm.split(":").map(Number);
  return hh * 60 + mm;
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
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<string>("");
  const [reservationsForDate, setReservationsForDate] = useState<any[]>([]);
  const [depositPercentage, setDepositPercentage] = useState(20);
  const [isPaying, setIsPaying] = useState(false);
  const [showPaymentGate, setShowPaymentGate] = useState(false);
  const [createdReservation, setCreatedReservation] = useState<any>(null);

  const [branches, setBranches] = useState<any[]>([]);
  const [branchId, setBranchId] = useState<string | null>(null);

  const days = getNext30Days();

  const resetState = useCallback(() => {
    setStep(1);
    setSelectedCategory("dermatology");
    setServiceId(null);
    setBranchId(branches[0]?.id ?? null);
    setSelectedDate(null);
    setSelectedTime(null);
    setSelectedDoctor("");
    setReservationsForDate([]);
    setName('');
    setEmail('');
    setPhone('');
    setNotes("");
    setSessionType("in_person");
    setConfirmed(false);
    setIsPaying(false);
    setShowPaymentGate(false);
    setCreatedReservation(null);
  }, [branches]);

  const handleClose = useCallback(() => {
    setOpen(false);
    resetState();
  }, [resetState]);

  useEffect(() => {
    setSelectedTime(null);
  }, [selectedDate]);

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

  useEffect(() => {
    if (open) {
      const stored = localStorage.getItem("revera_user");
      if (stored) {
        try {
          const cust = JSON.parse(stored);
          if (cust.name) setName(cust.name);
          if (cust.mobile) setPhone(cust.mobile);
          if (cust.email) setEmail(cust.email);
        } catch (err) {
          console.error("Error reading revera_user in BookingModal:", err);
        }
      }
    }
  }, [open]);

  // Sync service toggle state from admin localStorage
  const [serviceToggles, setServiceToggles] = useState<ServiceToggleState>({});
  const [dynamicServices, setDynamicServices] = useState<ServiceItem[]>([]);
  const [dynamicCategories, setDynamicCategories] = useState<LocalCategory[]>([]);

  // Derived from dynamicServices — must be declared before useEffects that depend on it
  const selectedService = serviceId ? dynamicServices.find((service) => service.id === serviceId) : undefined;

  useEffect(() => {
    setServiceToggles(getServiceToggles());
    setDynamicServices(getDynamicServices());
    setDynamicCategories(getDynamicCategories());

    const handleStorage = () => {
      setServiceToggles(getServiceToggles());
      setDynamicServices(getDynamicServices());
      setDynamicCategories(getDynamicCategories());
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // Load branches
  useEffect(() => {
    fetch("/api/branches")
      .then((r) => r.json())
      .then((data) => {
        const activeBranches = (data || []).filter((b: any) => b.status === "active");
        setBranches(activeBranches);
        if (activeBranches.length > 0) {
          setBranchId(activeBranches[0].id);
        }
      })
      .catch(() => {});
  }, []);

  // Load doctors
  useEffect(() => {
    fetch("/api/providers")
      .then((r) => r.json())
      .then((data) => {
        setDoctors(data || []);
      })
      .catch(() => {});
  }, []);

  // Load deposit percentage settings
  useEffect(() => {
    fetch("/api/page-settings")
      .then((r) => r.json())
      .then((data) => {
        if (data && data.booking && data.booking.depositPercentage !== undefined) {
          setDepositPercentage(Number(data.booking.depositPercentage));
        }
      })
      .catch(() => {});
  }, []);

  // Prefetch 30-day availability the moment serviceId + branchId are known
  // — fires BEFORE the user even clicks "Next", so the calendar is warm
  useEffect(() => {
    if (!serviceId) return;
    const branchQuery = branchId ? `&branchId=${branchId}` : "";
    const url = `/api/availability?serviceId=${serviceId}&days=30${branchQuery}`;
    prefetchUrl(url, 30000);
  }, [serviceId, branchId]);

  // Consume the cached 30-day data when the user actually reaches step 2 (date picker)
  useEffect(() => {
    if (!open || !serviceId) return;
    const branchQuery = branchId ? `&branchId=${branchId}` : "";
    cachedFetch(`/api/availability?serviceId=${serviceId}&days=30${branchQuery}`, 30000).then((data) => {
      const map: Record<string, number> = {};
      if (Array.isArray(data)) {
        data.forEach((d: { date: string; approvedCount: number; isAvailable?: boolean }) => { 
          map[d.date] = d.isAvailable === false ? 99 : 0; 
        });
      } else {
        console.error("Fetch availability expected array, got", data);
      }
      setDisabledDates(map);
    }).catch(()=>{});
  }, [open, serviceId, branchId]);

  // Prefetch slots for the currently selected date so step 3 renders instantly
  useEffect(() => {
    if (!serviceId || !selectedDate) return;
    const date = toLocalDateStr(selectedDate);
    const branchQuery = branchId ? `&branchId=${branchId}` : "";
    prefetchUrl(`/api/availability?date=${date}&serviceId=${serviceId}${branchQuery}`, 5000);
  }, [serviceId, selectedDate, branchId]);

  // Fetch taken time slots for a single selected date and calculate duration-based availability
  useEffect(() => {
    let active = true;
    if (!serviceId || !selectedDate) {
      Promise.resolve().then(() => {
        if (active) {
          setTakenSlots([]);
          setReservationsForDate([]);
        }
      });
      return;
    }
    const date = toLocalDateStr(selectedDate);
    const branchQuery = branchId ? `&branchId=${branchId}` : "";
    cachedFetch(`/api/availability?date=${date}&serviceId=${serviceId}${branchQuery}`, 5000)
      .then((data) => {
        if (active) {
          if (data && Array.isArray(data.unavailableSlots)) {
            setTakenSlots(data.unavailableSlots);
          } else {
            setTakenSlots([]);
          }
          setReservationsForDate([]);
        }
      })
      .catch(() => {
        if (active) {
          setTakenSlots([]);
          setReservationsForDate([]);
        }
      });
    return () => {
      active = false;
    };
  }, [serviceId, selectedDate, branchId, selectedService]);

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

  const getDayOperatingHours = useCallback((date: Date) => {
    if (!date || !selectedService) return { start: "09:00", end: "20:00" };
    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const weekdayName = weekdays[date.getDay()];
    
    // Find active branch specific service hours
    const selectedBranch = branches.find(b => b.id === branchId);
    const activeHours = selectedBranch && Array.isArray(selectedBranch.service_hours) && selectedBranch.service_hours.length > 0
      ? selectedBranch.service_hours
      : (t.footer?.serviceHours || []);

    const clinicDay = activeHours.find(
      (sh: any) => sh.day?.toLowerCase() === weekdayName.toLowerCase()
    );

    let clinicStartMins = 9 * 60; // 09:00 default
    let clinicEndMins = 20 * 60;  // 20:00 default
    let clinicClosed = false;

    if (clinicDay) {
      if (!clinicDay.isOpen) {
        clinicClosed = true;
      } else {
        const [csh, csm] = clinicDay.openTime.split(":").map(Number);
        const [ceh, cem] = clinicDay.closeTime.split(":").map(Number);
        clinicStartMins = csh * 60 + csm;
        clinicEndMins = ceh * 60 + cem;
      }
    }

    if (clinicClosed) {
      return { start: "23:59", end: "23:59" }; // clinic closed
    }

    let minStart = 24 * 60; // in minutes
    let maxEnd = 0; // in minutes
    let found = false;

    doctors.forEach((doc) => {
      // Check branch
      if (branchId && doc.branchId && doc.branchId !== branchId) return;
      
      // Check service
      if (doc.services && doc.services.length > 0) {
        if (!doc.services.includes(selectedService.en)) return;
      }

      // Check working days & hours
      if (doc.workingDaysHours) {
        const dayConfig = doc.workingDaysHours[weekdayName];
        if (dayConfig && dayConfig.isOpen) {
          const [sh, sm] = dayConfig.start.split(":").map(Number);
          const [eh, em] = dayConfig.end.split(":").map(Number);
          const startMins = sh * 60 + sm;
          const endMins = eh * 60 + em;
          if (startMins < minStart) minStart = startMins;
          if (endMins > maxEnd) maxEnd = endMins;
          found = true;
        }
      } else {
        if (clinicStartMins < minStart) minStart = clinicStartMins;
        if (clinicEndMins > maxEnd) maxEnd = clinicEndMins;
        found = true;
      }
    });

    if (found) {
      if (minStart < clinicStartMins) minStart = clinicStartMins;
      if (maxEnd > clinicEndMins) maxEnd = clinicEndMins;
    } else {
      minStart = clinicStartMins;
      maxEnd = clinicEndMins;
    }

    const formatMins = (totalMins: number) => {
      const h = Math.floor(totalMins / 60);
      const m = totalMins % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    return {
      start: formatMins(minStart),
      end: formatMins(maxEnd)
    };
  }, [doctors, branchId, selectedService, t, branches]);

  const getAvailableDoctors = useCallback(() => {
    if (!selectedDate || !selectedTime || !selectedService) return [];

    const startNew = timeToMinutes(selectedTime);
    const durationNew = getDurationInMinutes(selectedService.duration);
    const endNew = startNew + durationNew;

    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const weekdayName = weekdays[selectedDate.getDay()];

    return doctors.filter((doctor) => {
      if (branchId && doctor.branchId && doctor.branchId !== branchId) {
        return false;
      }

      if (doctor.services && doctor.services.length > 0) {
        if (!doctor.services.includes(selectedService.en)) {
          return false;
        }
      }

      if (doctor.workingDaysHours) {
        const dayConfig = doctor.workingDaysHours[weekdayName];
        if (!dayConfig || !dayConfig.isOpen) {
          return false;
        }
        
        const [sh, sm] = dayConfig.start.split(":").map(Number);
        const [eh, em] = dayConfig.end.split(":").map(Number);
        const shiftStart = sh * 60 + sm;
        const shiftEnd = eh * 60 + em;

        if (startNew < shiftStart || endNew > shiftEnd) {
          return false;
        }
      }

      const hasOverlap = reservationsForDate.some((res) => {
        if (res.doctorName && res.doctorName === doctor.name && res.status !== "rejected") {
          if (res.timeSlot) {
            const startRes = timeToMinutes(res.timeSlot);
            const resService = dynamicServices.find((s) => s.id === res.serviceId);
            const durationRes = getDurationInMinutes(resService?.duration);
            const endRes = startRes + durationRes;

            if (startNew < endRes && startRes < endNew) {
              return true;
            }
          }
        }
        return false;
      });

      return !hasOverlap;
    });
  }, [selectedDate, selectedTime, selectedService, doctors, branchId, reservationsForDate, dynamicServices]);

  function handleConfirm() {
    if (!serviceId || !selectedDate || !selectedTime || !name || !email || !phone) return;
    const payload = {
      serviceId,
      date: toLocalDateStr(selectedDate),
      requestedTime: selectedTime,
      name, email, phone, notes,
      sessionType,
      branchId,
      doctorName: selectedDoctor || null,
    };
    fetch('/api/reservations', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } })
      .then(r => {
        if (!r.ok) throw new Error("Failed to create reservation");
        return r.json();
      })
      .then((data) => {
        if (data && data.status === 'pending_deposit') {
          setCreatedReservation(data);
          setShowPaymentGate(true);
        } else {
          setConfirmed(true);
        }
      })
      .catch(() => setConfirmed(true));
  }

  function handlePayDeposit() {
    if (!createdReservation || !selectedService) return;
    setIsPaying(true);
    
    const svcPrice = selectedService.price || 0;
    const depAmount = Math.round(svcPrice * (depositPercentage / 100));
    const remBalance = svcPrice - depAmount;

    setTimeout(() => {
      fetch(`/api/reservations?id=${createdReservation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'pending',
          amountPaid: depAmount,
          amountLeft: remBalance
        })
      })
        .then(r => {
          if (!r.ok) throw new Error("Failed to process payment");
          return r.json();
        })
        .then(() => {
          setIsPaying(false);
          setShowPaymentGate(false);
          setConfirmed(true);
        })
        .catch((err) => {
          console.error("Payment registration error:", err);
          setIsPaying(false);
          setConfirmed(true);
        });
    }, 1500);
  }

  // Filter out services that admin marked as inactive or hidden
  const activeServices = dynamicServices.filter(s => isServiceActive(s.id, serviceToggles));
  const servicesForCategory = activeServices.filter((service) => service.cat === selectedCategory);

  const canNext =
    (step === 1 && serviceId !== null && (branches.length === 0 || branchId !== null)) ||
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
        <div className="flex items-center justify-between mb-6">
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
                 {branchId && (
                  <p className="mb-1">
                    <span className="font-semibold">{isRTL ? "الفرع" : "Branch"}: </span>
                    {(() => {
                      const b = branches.find(x => x.id === branchId);
                      return b ? (isRTL ? b.name_ar : b.name_en) : "";
                    })()}
                  </p>
                )}
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
            <div className="flex items-center justify-between mb-8">
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
                {branches.length > 0 && (
                  <div className="mb-6">
                    <p className="mb-3 text-sm font-semibold" style={{ color: "var(--cr-primary)" }}>
                      {isRTL ? "اختر الفرع" : "Select Branch"}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {branches.map((branch) => {
                        const label = isRTL ? branch.name_ar : branch.name_en;
                        const isActive = branchId === branch.id;
                        return (
                          <button
                            key={branch.id}
                            type="button"
                            onClick={() => setBranchId(branch.id)}
                            className="rounded-full px-4 py-2 text-xs font-semibold transition-colors"
                            style={{
                              backgroundColor: isActive ? "var(--cr-primary)" : "var(--cr-secondary)",
                              color: isActive ? "var(--cr-white)" : "var(--cr-primary)",
                              border: isActive ? "none" : "1.5px solid rgba(65, 78, 54, 0.18)",
                            }}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

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
                  {(() => {
                    if (!selectedDate) return null;
                    const { start, end } = getDayOperatingHours(selectedDate);
                    const filteredSlots = TIME_SLOTS.filter((slot) => {
                      const slot24 = normaliseTo24hSlot(slot) ?? "";
                      return slot24 >= start && slot24 < end;
                    });
                    
                    return filteredSlots.map((slot) => {
                      const isSelected = selectedTime === slot;
                      const slot24 = normaliseTo24hSlot(slot) ?? "";
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
                    });
                  })()}
                </div>
              </div>
            )}

            {/* Step 4: Confirm */}
            {step === 4 && (
              <div>
                {showPaymentGate ? (
                  <div className="space-y-4">
                    <p className="text-sm font-semibold text-[#1F251A]">
                      {isRTL ? "بوابة دفع عربون الحجز الآمنة" : "Secure Reservation Deposit Payment"}
                    </p>
                    <p className="text-xs text-[#5A6A51] leading-relaxed">
                      {isRTL 
                        ? "لتأكيد حجزك، يرجى دفع عربون الحجز المقدر بـ 20% من إجمالي قيمة الخدمة. سيتم خصم هذا المبلغ من إجمالي الفاتورة النهائية." 
                        : "To secure your reservation, please pay the required deposit (default 20%). This deposit will be deducted from your final invoice."
                      }
                    </p>

                    {/* Price Breakdown */}
                    <div className="rounded-2xl border border-[#C4AE7C]/20 bg-[#FBFBF9] p-4 text-xs space-y-2 text-[#1F251A]">
                      <div className="flex justify-between">
                        <span className="opacity-70">{isRTL ? "سعر الخدمة الإجمالي:" : "Service Price:"}</span>
                        <span className="font-semibold">EGP {selectedService?.price || 0}</span>
                      </div>
                      <div className="flex justify-between text-purple-700 font-semibold">
                        <span>{isRTL ? `عربون الحجز المطلـوب (${depositPercentage}%):` : `Required Deposit (${depositPercentage}%):`}</span>
                        <span>EGP {Math.round((selectedService?.price || 0) * (depositPercentage / 100))}</span>
                      </div>
                      <div className="border-t border-dashed border-[#C4AE7C]/20 pt-2 flex justify-between font-semibold">
                        <span>{isRTL ? "المبلغ المتبقي بالعيادة:" : "Remaining Balance (Pay at Clinic):"}</span>
                        <span>EGP {(selectedService?.price || 0) - Math.round((selectedService?.price || 0) * (depositPercentage / 100))}</span>
                      </div>
                    </div>

                    {/* Credit Card Input Layout */}
                    <div className="space-y-3 pt-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#5A6A51] mb-1 uppercase tracking-wider">{isRTL ? "اسم حامل البطاقة" : "Cardholder Name"}</label>
                        <input 
                          type="text" 
                          placeholder="Saifuldeen Naser" 
                          disabled={isPaying}
                          className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2 text-xs text-[#1F251A] outline-none focus:border-[#414E36]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#5A6A51] mb-1 uppercase tracking-wider">{isRTL ? "رقم البطاقة" : "Card Number"}</label>
                        <input 
                          type="text" 
                          placeholder="4000 1234 5678 9010" 
                          disabled={isPaying}
                          className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2 text-xs text-[#1F251A] outline-none focus:border-[#414E36]"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-[#5A6A51] mb-1 uppercase tracking-wider">{isRTL ? "تاريخ الانتهاء" : "Expiry Date"}</label>
                          <input 
                            type="text" 
                            placeholder="MM/YY" 
                            disabled={isPaying}
                            className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2 text-xs text-[#1F251A] outline-none focus:border-[#414E36]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-[#5A6A51] mb-1 uppercase tracking-wider">CVV</label>
                          <input 
                            type="password" 
                            placeholder="•••" 
                            disabled={isPaying}
                            className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2 text-xs text-[#1F251A] outline-none focus:border-[#414E36]"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handlePayDeposit}
                      disabled={isPaying}
                      className="btn-primary w-full justify-center mt-4"
                      style={{ backgroundColor: "#25D366", borderColor: "#25D366" }}
                    >
                      {isPaying ? (
                        <span className="flex items-center gap-2">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          {isRTL ? "جاري معالجة الدفع الآمن..." : "Processing Secure Payment..."}
                        </span>
                      ) : (
                        <span>{isRTL ? `تأكيد ودفع ${Math.round((selectedService?.price || 0) * (depositPercentage / 100))} ج.م` : `Confirm & Pay Deposit EGP ${Math.round((selectedService?.price || 0) * (depositPercentage / 100))}`}</span>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setShowPaymentGate(false);
                        setCreatedReservation(null);
                      }}
                      disabled={isPaying}
                      className="btn-outline w-full justify-center text-xs mt-1"
                    >
                      {isRTL ? "إلغاء والعودة" : "Cancel & Return"}
                    </button>
                  </div>
                ) : (
                  <>
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
                      {branchId && (
                        <p className="mb-0">
                          <span className="font-semibold">{isRTL ? "الفرع" : "Branch"}: </span>
                          {(() => {
                            const b = branches.find(x => x.id === branchId);
                            return b ? (isRTL ? b.name_ar : b.name_en) : "";
                          })()}
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
                      {selectedDoctor && (
                        <p className="mb-0">
                          <span className="font-semibold">{isRTL ? "الطبيب" : "Doctor"}: </span>
                          {selectedDoctor}
                        </p>
                      )}
                      {selectedService && depositPercentage > 0 && (
                        <div className="mt-2 border-t border-[#414E36]/10 pt-2 text-xs space-y-1 text-[#414E36] font-medium">
                          <p>
                            <span className="font-semibold text-purple-800">{isRTL ? "عربون الحجز المطلـوب:" : "Required Deposit:"} </span>
                            EGP {Math.round((selectedService.price || 0) * (depositPercentage / 100))} ({depositPercentage}%)
                          </p>
                        </div>
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

                    {/* Doctor Selection (Optional) */}
                    <label className="block mb-1 text-xs font-semibold" style={{ color: "var(--cr-accent)" }}>
                      {isRTL ? "الطبيب المعالج (اختياري)" : "Select Doctor (Optional)"}
                    </label>
                    <select
                      className="cr-input mb-3 bg-white text-[#1F251A] font-medium"
                      value={selectedDoctor}
                      onChange={(e) => setSelectedDoctor(e.target.value)}
                    >
                      <option value="">
                        {isRTL ? "أي طبيب / لا يوجد تفضيل" : "Any Doctor / No Preference"}
                      </option>
                      {getAvailableDoctors().map((doc: any) => (
                        <option key={doc.id} value={doc.name}>
                          {doc.name}
                        </option>
                      ))}
                    </select>

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
                  </>
                )}
              </div>
            )}

            {/* Navigation */}
            {!showPaymentGate && (
              <div
                className={`flex mt-6 gap-3 ${
                  step === 1 ? "justify-end" : "justify-between"
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
            )}
          </>
        )}
      </div>
    </div>
  );
}
