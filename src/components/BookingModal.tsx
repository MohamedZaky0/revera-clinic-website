"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cachedFetch, prefetchUrl } from "@/lib/fetchCache";
import { Category, ServiceItem, ALL_15MIN_SLOTS, getServiceDurationMinutes, normaliseTo24hSlot } from "@/lib/services";
import { 
  getServiceToggles, 
  isServiceActive, 
  ServiceToggleState, 
  getDynamicServices, 
  getDynamicCategories, 
  LocalCategory 
} from "@/lib/serviceStore";
import TermsModal from "./TermsModal";
import { MaterialDatePicker } from "./ui/MaterialDatePicker";
import { MaterialTimePicker } from "./ui/MaterialTimePicker";
import { ShieldCheck, FileText, ExternalLink, Undo2 } from "lucide-react";
import { CLIENT } from "@/config/client";

type Step = 1 | 2 | 3;

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
  const [isWhatsappSame, setIsWhatsappSame] = useState(true);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [serviceHours, setServiceHours] = useState<any[]>([]);
  const [instapayName, setInstapayName] = useState("Revera Clinics");
  const [instapayAddress, setInstapayAddress] = useState("revera@instapay");
  const [instapayLink, setInstapayLink] = useState("https://www.instapay.eg");
  const [walletEnabled, setWalletEnabled] = useState(true);
  const [walletName, setWalletName] = useState("Vodafone Cash / Mobile Wallet");
  const [walletNumber, setWalletNumber] = useState("01035595691");
  const [walletLink, setWalletLink] = useState("");
  const [selectedDepositMethod, setSelectedDepositMethod] = useState<"instapay" | "wallet">("instapay");
  const [customerPaymentSender, setCustomerPaymentSender] = useState("");
  const [zoomQr, setZoomQr] = useState(false);

  // Update serviceHours when translations load
  useEffect(() => {
    if (t.footer?.serviceHours) {
      setServiceHours(t.footer.serviceHours);
    }
  }, [t]);
  const [sessionType, setSessionType] = useState<"in_person" | "online">("in_person");
  const [confirmed, setConfirmed] = useState(false);
  const [disabledDates, setDisabledDates] = useState<Record<string, number>>({});
  const [takenSlots, setTakenSlots] = useState<string[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<string>("");
  const [reservationsForDate, setReservationsForDate] = useState<any[]>([]);
  const [depositPercentage, setDepositPercentage] = useState(20);
  const [isPaying, setIsPaying] = useState(false);
  const [isCreatingReservation, setIsCreatingReservation] = useState(false);
  const [createdReservation, setCreatedReservation] = useState<any>(null);
  const [clinicWhatsapp, setClinicWhatsapp] = useState(CLIENT.phoneTel);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [termsText, setTermsText] = useState("");
  const [hasTerms, setHasTerms] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const [branches, setBranches] = useState<any[]>([]);
  const [branchId, setBranchId] = useState<string | null>(null);

  const stepsList = useMemo(() => {
    const isPaymentRequired = depositPercentage > 0;
    if (isPaymentRequired) {
      return isRTL 
        ? ["الخدمة والموعد", "تأكيد", "الدفع"]
        : ["Service & Schedule", "Confirm", "Payment"];
    } else {
      return isRTL
        ? ["الخدمة والموعد", "تأكيد"]
        : ["Service & Schedule", "Confirm"];
    }
  }, [depositPercentage, isRTL]);

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
    setCreatedReservation(null);
    setInstapayAddress("");
    setCopiedAddress(false);
    setAcceptedTerms(false);
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
        if (selected) {
          let allowedType = selected.unit?.toLowerCase() || "both";
          if (allowedType !== "both" && allowedType !== "in_clinic" && allowedType !== "online") {
            allowedType = "both";
          }
          if (allowedType === "in_clinic") {
            setSessionType("in_person");
          } else if (allowedType === "online") {
            setSessionType("online");
          }
        }
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

  // Clear serviceId if it doesn't support the selected sessionType
  useEffect(() => {
    if (serviceId !== null) {
      const selected = dynamicServices.find(s => s.id === serviceId);
      if (selected) {
        let allowedType = selected.unit?.toLowerCase() || "both";
        if (allowedType !== "both" && allowedType !== "in_clinic" && allowedType !== "online") {
          allowedType = "both";
        }
        const isValidForSession = sessionType === "online" 
          ? (allowedType === "online" || allowedType === "both")
          : (allowedType === "in_clinic" || allowedType === "both");
        if (!isValidForSession) {
          setServiceId(null);
        }
      }
    }
  }, [sessionType, serviceId, dynamicServices]);

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
        if (data && data.deposit) {
          if (data.deposit.depositPercentage !== undefined) {
            setDepositPercentage(Number(data.deposit.depositPercentage));
          }
          if (data.deposit.instapayName) {
            setInstapayName(data.deposit.instapayName);
          }
          if (data.deposit.instapayAddress) {
            setInstapayAddress(data.deposit.instapayAddress);
          }
          if (data.deposit.instapayLink) {
            setInstapayLink(data.deposit.instapayLink);
          }
          if (data.deposit.walletEnabled !== undefined) {
            setWalletEnabled(Boolean(data.deposit.walletEnabled));
          } else {
            setWalletEnabled(true);
          }
          if (data.deposit.walletName) {
            setWalletName(data.deposit.walletName);
          } else {
            setWalletName("Vodafone Cash / Mobile Wallet");
          }
          if (data.deposit.walletNumber) {
            setWalletNumber(data.deposit.walletNumber);
          } else {
            setWalletNumber("01035595691");
          }
          if (data.deposit.walletLink) {
            setWalletLink(data.deposit.walletLink);
          }
        } else if (data && data.booking && data.booking.depositPercentage !== undefined) {
          setDepositPercentage(Number(data.booking.depositPercentage));
        }
        if (data && data.clinic && data.clinic.whatsapp) {
          setClinicWhatsapp(data.clinic.whatsapp);
        }
        if (data && data.booking && data.booking.termsText) {
          setTermsText(data.booking.termsText);
        }
        if (data && data.footer && Array.isArray(data.footer.serviceHours)) {
          setServiceHours(data.footer.serviceHours);
        }
      })
      .catch(() => {});

    fetch('/api/terms?active_only=true')
      .then(res => res.json())
      .then(data => {
        if (data.terms && Array.isArray(data.terms)) {
          setHasTerms(data.terms.length > 0);
        }
      })
      .catch(() => {});
  }, []);

  // Prefetch 30-day availability
  useEffect(() => {
    if (!serviceId) return;
    const branchQuery = branchId ? `&branchId=${branchId}` : "";
    const url = `/api/availability?serviceId=${serviceId}&days=30${branchQuery}&sessionType=${sessionType}`;
    prefetchUrl(url, 30000);
  }, [serviceId, branchId, sessionType]);

  // Consume cached 30-day availability
  useEffect(() => {
    if (!open || !serviceId) return;
    const branchQuery = branchId ? `&branchId=${branchId}` : "";
    cachedFetch(`/api/availability?serviceId=${serviceId}&days=30${branchQuery}&sessionType=${sessionType}`).then((data) => {
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
  }, [open, serviceId, branchId, sessionType]);

  // Prefetch slots for selected date
  useEffect(() => {
    if (!serviceId || !selectedDate) return;
    const date = toLocalDateStr(selectedDate);
    const branchQuery = branchId ? `&branchId=${branchId}` : "";
    prefetchUrl(`/api/availability?date=${date}&serviceId=${serviceId}${branchQuery}&sessionType=${sessionType}`, 5000);
  }, [serviceId, selectedDate, branchId, sessionType]);

  // Fetch taken time slots for selected date
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
    cachedFetch(`/api/availability?date=${date}&serviceId=${serviceId}${branchQuery}&sessionType=${sessionType}`, 5000)
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
  }, [serviceId, selectedDate, branchId, selectedService, sessionType]);

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
    if (step === 1 && serviceId !== null && selectedDate !== null && selectedTime !== null) {
      setStep(2);
    }
  }

  function handleBack() {
    if (step === 2) setStep(1);
    if (step === 3) {
      setStep(2);
      setCreatedReservation(null);
    }
  }

  const getDayOperatingHours = useCallback((date: Date) => {
    if (!date || !selectedService) return { start: "09:00", end: "20:00" };
    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const weekdayName = weekdays[date.getDay()];
    
    // Find active branch specific service hours
    const selectedBranch = branches.find(b => b.id === branchId);
    const activeHours = selectedBranch && Array.isArray(selectedBranch.service_hours) && selectedBranch.service_hours.length > 0
      ? selectedBranch.service_hours
      : (serviceHours.length > 0 ? serviceHours : (t.footer?.serviceHours || []));

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
      if (branchId) {
        const wdh = doc.workingDaysHours;
        if (wdh && typeof wdh === 'object' && Array.isArray(wdh.branch_ids)) {
          if (!wdh.branch_ids.includes(branchId)) return;
        } else if (doc.branchId && doc.branchId !== branchId) {
          return;
        }
      }
      
      // Check service
      if (doc.services && doc.services.length > 0) {
        if (!doc.services.includes(selectedService.en)) return;
      }
 
      // Check working days & hours
      if (doc.workingDaysHours) {
        const wdh = doc.workingDaysHours;
        let config = wdh;
        if (wdh.branch_schedules && branchId && wdh.branch_schedules[branchId]) {
          config = wdh.branch_schedules[branchId];
        }

        let dayConfig = config[weekdayName];
        if (!dayConfig) {
          const typeKey = sessionType === 'online' ? 'online' : 'in_person';
          dayConfig = config[typeKey]?.[weekdayName] || 
                      config.in_person?.[weekdayName] || 
                      config.online?.[weekdayName];
        }
        if (dayConfig && dayConfig.isOpen) {
          if (dayConfig.shifts && Array.isArray(dayConfig.shifts) && dayConfig.shifts.length > 0) {
            dayConfig.shifts.forEach((shft: any) => {
              if (shft.start && shft.end) {
                const [sh, sm] = shft.start.split(":").map(Number);
                const [eh, em] = shft.end.split(":").map(Number);
                const startMins = sh * 60 + sm;
                const endMins = eh * 60 + em;
                if (startMins < minStart) minStart = startMins;
                if (endMins > maxEnd) maxEnd = endMins;
                found = true;
              }
            });
          } else {
            const [sh, sm] = dayConfig.start.split(":").map(Number);
            const [eh, em] = dayConfig.end.split(":").map(Number);
            const startMins = sh * 60 + sm;
            const endMins = eh * 60 + em;
            if (startMins < minStart) minStart = startMins;
            if (endMins > maxEnd) maxEnd = endMins;
            found = true;
          }
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
  }, [doctors, branchId, selectedService, t, branches, serviceHours]);

  const getAvailableDoctors = useCallback(() => {
    if (!selectedDate || !selectedTime || !selectedService) return [];

    const startNew = timeToMinutes(selectedTime);
    const durationNew = getServiceDurationMinutes(selectedService);
    const endNew = startNew + durationNew;

    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const weekdayName = weekdays[selectedDate.getDay()];

    return doctors.filter((doctor) => {
      if (branchId) {
        const wdh = doctor.workingDaysHours;
        if (wdh && typeof wdh === 'object' && Array.isArray(wdh.branch_ids)) {
          if (!wdh.branch_ids.includes(branchId)) {
            return false;
          }
        } else if (doctor.branchId && doctor.branchId !== branchId) {
          return false;
        }
      }
 
      if (doctor.services && doctor.services.length > 0) {
        if (!doctor.services.includes(selectedService.en)) {
          return false;
        }
      }
 
      if (doctor.workingDaysHours) {
        const wdh = doctor.workingDaysHours;
        let config = wdh;
        if (wdh.branch_schedules && branchId && wdh.branch_schedules[branchId]) {
          config = wdh.branch_schedules[branchId];
        }

        let dayConfig = config[weekdayName];
        if (!dayConfig) {
          const typeKey = sessionType === 'online' ? 'online' : 'in_person';
          dayConfig = config[typeKey]?.[weekdayName] || 
                      config.in_person?.[weekdayName] || 
                      config.online?.[weekdayName];
        }
        if (!dayConfig || !dayConfig.isOpen) {
          return false;
        }
        
        if (dayConfig.shifts && Array.isArray(dayConfig.shifts) && dayConfig.shifts.length > 0) {
          const slotFitsAnyShift = dayConfig.shifts.some((shft: any) => {
            if (!shft.start || !shft.end) return false;
            const [sh, sm] = shft.start.split(":").map(Number);
            const [eh, em] = shft.end.split(":").map(Number);
            const shiftStart = sh * 60 + sm;
            const shiftEnd = eh * 60 + em;
            return startNew >= shiftStart && endNew <= shiftEnd;
          });
          if (!slotFitsAnyShift) return false;
        } else {
          const [sh, sm] = dayConfig.start.split(":").map(Number);
          const [eh, em] = dayConfig.end.split(":").map(Number);
          const shiftStart = sh * 60 + sm;
          const shiftEnd = eh * 60 + em;
   
          if (startNew < shiftStart || endNew > shiftEnd) {
            return false;
          }
        }
      }

      const hasOverlap = reservationsForDate.some((res) => {
        if (res.doctorName && res.doctorName === doctor.name && res.status !== "rejected") {
          if (res.timeSlot) {
            const startRes = timeToMinutes(res.timeSlot);
            const resService = dynamicServices.find((s) => s.id === res.serviceId);
            const durationRes = getServiceDurationMinutes(resService);
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
  }, [selectedDate, selectedTime, selectedService, doctors, branchId, reservationsForDate, dynamicServices, sessionType]);

  function handleConfirm() {
    if (!serviceId || !selectedDate || !selectedTime || !name || !email || !phone) return;
    setIsCreatingReservation(true);
    const finalNotes = isWhatsappSame 
      ? notes 
      : `${notes ? notes + "\n" : ""}[WhatsApp: ${whatsappNumber}]`;
    const payload = {
      serviceId,
      date: toLocalDateStr(selectedDate),
      requestedTime: selectedTime,
      name, email, phone, notes: finalNotes,
      sessionType,
      branchId,
      doctorName: selectedDoctor || null,
    };
    fetch('/api/reservations', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } })
      .then(async r => {
        const data = await r.json().catch(() => null);
        if (!r.ok) {
          throw new Error((data && data.error) || "Failed to create reservation");
        }
        return data;
      })
      .then((data) => {
        setIsCreatingReservation(false);
        if (data && (data.status === 'pending_deposit' || data.requiresDeposit || depositPercentage > 0)) {
          setCreatedReservation(data);
          setStep(3); // Step 3 is Payment
        } else {
          setConfirmed(true);
        }
      })
      .catch((err) => {
        setIsCreatingReservation(false);
        console.error("Failed to create reservation:", err);
        alert(err.message || (isRTL ? "حدث خطأ أثناء إنشاء الحجز، يرجى المحاولة مرة أخرى." : "Failed to create reservation. Please try again."));
      });
  }

  function handlePayDeposit() {
    if (!createdReservation || !selectedService) return;
    if (termsText.trim() !== "" && !acceptedTerms) {
      alert(isRTL ? "يرجى الموافقة على الشروط والأحكام أولاً" : "Please agree to the Terms & Conditions first");
      return;
    }
    if (!customerPaymentSender.trim()) {
      alert(isRTL 
        ? (selectedDepositMethod === 'wallet' ? "يرجى إدخال رقم المحفظة الإلكترونية التي قمت بالتحويل منها" : "يرجى إدخال عنوان إنستاباي الخاص بك") 
        : (selectedDepositMethod === 'wallet' ? "Please enter your Mobile Wallet number sent from" : "Please enter your InstaPay address"));
      return;
    }
    
    setIsPaying(true);
    
    const svcPrice = selectedService.price || 0;
    const depAmount = Math.round(svcPrice * (depositPercentage / 100));
    const remBalance = svcPrice - depAmount;
    
    const methodLabel = selectedDepositMethod === 'wallet' ? `Mobile Wallet (${walletName || 'Wallet'})` : 'InstaPay';
    const updatedNotes = notes 
      ? `${notes}\n[${methodLabel} Sent From: ${customerPaymentSender}]`
      : `[${methodLabel} Sent From: ${customerPaymentSender}]`;

    const formattedDate = selectedDate ? formatDate(selectedDate) : "";
    const svcName = isRTL ? selectedService.ar : selectedService.en;
    
    const textMessage = `Hello Revera Clinics,

I have paid the reservation deposit for my booking:
• Patient: ${name}
• Phone: ${phone}${isWhatsappSame ? "" : ` (WhatsApp: ${whatsappNumber})`}
• Service: ${svcName}
• Date: ${formattedDate} at ${selectedTime}
• Deposit Amount: EGP ${depAmount}
• Payment Method: ${methodLabel}
• Sent From: ${customerPaymentSender}

Attached is my payment transaction receipt photo.`;

    const cleanWhatsapp = clinicWhatsapp.replace(/[^0-9]/g, "");
    const whatsappLink = `https://wa.me/${cleanWhatsapp || CLIENT.whatsappNumber}?text=${encodeURIComponent(textMessage)}`;

    setTimeout(() => {
      fetch(`/api/reservations?id=${createdReservation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'pending',
          amountPaid: depAmount,
          amountLeft: remBalance,
          notes: updatedNotes
        })
      })
        .then(r => {
          if (!r.ok) throw new Error("Failed to process payment");
          return r.json();
        })
        .then(() => {
          setIsPaying(false);
          setConfirmed(true);
          window.open(whatsappLink, '_blank');
        })
        .catch((err) => {
          console.error("Payment registration error:", err);
          setIsPaying(false);
          setConfirmed(true);
          window.open(whatsappLink, '_blank');
        });
    }, 1500);
  }

  // Filter out services that admin marked as inactive or hidden
  const activeServices = dynamicServices.filter(s => isServiceActive(s.id, serviceToggles));
  const servicesForCategory = activeServices.filter((service) => {
    if (service.cat !== selectedCategory) return false;
    let serviceType = service.unit?.toLowerCase() || "both";
    if (serviceType !== "both" && serviceType !== "in_clinic" && serviceType !== "online") {
      serviceType = "both";
    }
    if (sessionType === "online") {
      return serviceType === "online" || serviceType === "both";
    } else {
      return serviceType === "in_clinic" || serviceType === "both";
    }
  });

  const filteredTimeSlots = useMemo(() => {
    if (!selectedDate) return [];
    const { start, end } = getDayOperatingHours(selectedDate);

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const selStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    const isToday = selStr === todayStr;
    const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    return TIME_SLOTS.filter((slot) => {
      const slot24 = normaliseTo24hSlot(slot) ?? "";
      const taken = takenSlots.includes(slot24);
      const isPast = isToday && slot24 <= currentHHMM;
      return slot24 >= start && slot24 < end && !taken && !isPast;
    });
  }, [selectedDate, getDayOperatingHours, takenSlots]);

  // Auto-select first available time slot when valid slots load
  useEffect(() => {
    if (filteredTimeSlots.length > 0) {
      if (!selectedTime || !filteredTimeSlots.includes(selectedTime)) {
        setSelectedTime(filteredTimeSlots[0]);
      }
    } else if (selectedDate) {
      setSelectedTime(null);
    }
  }, [filteredTimeSlots, selectedDate]);

  const canNext =
    step === 1 &&
    serviceId !== null &&
    selectedDate !== null &&
    selectedTime !== null &&
    filteredTimeSlots.length > 0 &&
    filteredTimeSlots.includes(selectedTime) &&
    (branches.length === 0 || sessionType === "online" || branchId !== null);

  const instapayQrUrl = instapayLink && instapayLink !== "https://www.instapay.eg" 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(instapayLink)}` 
    : "/images/instapay_qr.png";

  const walletQrUrl = walletLink 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(walletLink)}`
    : `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(walletNumber || "01035595691")}`;

  const currentQrUrl = selectedDepositMethod === "wallet" ? walletQrUrl : instapayQrUrl;
  const currentPaymentLink = selectedDepositMethod === "wallet" ? (walletLink || `tel:${walletNumber || "01035595691"}`) : instapayLink;

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
      <div className="modal-box max-w-4xl" dir={isRTL ? "rtl" : "ltr"}>
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
            className="flex h-8 w-8 items-center justify-center rounded-full text-xl transition-colors hover:bg-gray-100 cursor-pointer"
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
            <div className="relative mb-8">
              <div 
                className="absolute top-4 left-0 right-0 h-0.5 bg-[#414E36]/10 -translate-y-1/2 z-0" 
                style={{
                  left: `${100 / (stepsList.length * 2)}%`,
                  right: `${100 / (stepsList.length * 2)}%`
                }}
              />
              <div 
                className="grid relative z-10"
                style={{ gridTemplateColumns: `repeat(${stepsList.length}, minmax(0, 1fr))` }}
              >
                {stepsList.map((label, i) => {
                  const stepNum = (i + 1) as Step;
                  const isActive = step === stepNum;
                  const isDone = step > stepNum;
                  return (
                    <div key={i} className="flex flex-col items-center gap-1.5">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors border-2"
                        style={{
                          backgroundColor: isActive || isDone ? "var(--cr-primary)" : "#ffffff",
                          color: isActive || isDone ? "#ffffff" : "var(--cr-accent)",
                          borderColor: isActive || isDone ? "var(--cr-primary)" : "var(--cr-secondary)"
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
                        className="text-center text-[11px] leading-tight font-semibold px-1 whitespace-nowrap"
                        style={{ color: isActive ? "var(--cr-primary)" : "var(--cr-accent)" }}
                      >
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 1: Combined Service & Schedule (Service + Date + Time) */}
            {step === 1 && (
              <div className="space-y-6">
                {/* Session Type Switcher */}
                <div>
                  <p className="mb-2.5 text-sm font-semibold" style={{ color: "var(--cr-primary)" }}>
                    {isRTL ? "نوع الجلسة" : "Session Type"}
                  </p>
                  <div className="flex rounded-3xl border border-[#414E36]/15 p-1 bg-[#F2EFE9]/30">
                    <button
                      type="button"
                      onClick={() => setSessionType("in_person")}
                      className={`flex-1 rounded-2xl py-2.5 text-xs font-bold transition-all ${
                        sessionType === "in_person"
                          ? "bg-[#414E36] text-[#FBFBF9] shadow-sm"
                          : "text-[#5A6A51] hover:text-[#414E36]"
                      }`}
                    >
                      {isRTL ? "بالعيادة (حضوري)" : "In-Clinic (In-Person)"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSessionType("online")}
                      className={`flex-1 rounded-2xl py-2.5 text-xs font-bold transition-all ${
                        sessionType === "online"
                          ? "bg-[#414E36] text-[#FBFBF9] shadow-sm"
                          : "text-[#5A6A51] hover:text-[#414E36]"
                      }`}
                    >
                      {isRTL ? "استشارة عبر الإنترنت" : "Online Consultation"}
                    </button>
                  </div>
                </div>

                {/* Branch Picker or Online Info */}
                {sessionType === "online" ? (
                  <div className="rounded-2xl border border-[#414E36]/15 bg-[#EDF1EC] p-3.5 flex items-start gap-2.5 text-xs text-[#414E36]">
                    <svg className="w-5 h-5 shrink-0 text-[#C4AE7C] mt-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <p className="font-bold mb-0.5">
                        {isRTL ? "استشارة فيديو افتراضية" : "Virtual Video Consultation"}
                      </p>
                      <p className="opacity-90">
                        {isRTL 
                          ? "تُجرى هذه الجلسة افتراضياً عبر الإنترنت. لا داعي لزيارة مقر العيادة."
                          : "This session is conducted virtually. You do not need to visit any clinic location."
                        }
                      </p>
                    </div>
                  </div>
                ) : (
                  branches.length > 0 && (
                    <div>
                      <p className="mb-2 text-sm font-semibold" style={{ color: "var(--cr-primary)" }}>
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
                  )
                )}

                {/* Service Category & Selection */}
                <div>
                  <p className="mb-2 text-sm font-semibold" style={{ color: "var(--cr-primary)" }}>
                    {t.booking.labels.service}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {dynamicCategories.map((category) => {
                      const label = isRTL && category.ar ? category.ar : category.en;
                      const isActive = selectedCategory === category.key;
                      return (
                        <button
                          key={category.key}
                          type="button"
                          onClick={() => setSelectedCategory(category.key)}
                          className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors"
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

                {/* Inline MD3 Date & Time Pickers */}
                {serviceId !== null && (
                  <div className="pt-4 border-t border-gray-200/80">
                    <p className="mb-4 text-sm font-semibold" style={{ color: "var(--cr-primary)" }}>
                      {isRTL ? "اختر التاريخ والوقت المناسب" : "Select Date & Time"}
                    </p>
                    <div className="flex flex-col items-center gap-6 w-full max-w-md mx-auto">
                      {/* Date Picker */}
                      <MaterialDatePicker
                        selectedDate={selectedDate}
                        onSelectDate={setSelectedDate}
                        disabledDates={disabledDates}
                        isClosedDay={(d) => getDayOperatingHours(d).start === "23:59"}
                        isRTL={isRTL}
                      />

                      {/* Time Picker */}
                      <MaterialTimePicker
                        selectedTime={selectedTime}
                        onSelectTime={setSelectedTime}
                        availableSlots={filteredTimeSlots}
                        takenSlots={takenSlots}
                        isRTL={isRTL}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Confirm (Patient details, Doctor choice, Notes, Terms) */}
            {step === 2 && (
              <div>
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
                <input className="cr-input mb-2" value={phone} onChange={(e)=>setPhone(e.target.value)} />

                <div className="mb-4 space-y-2 text-left">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[#414E36]">
                    <input 
                      type="checkbox" 
                      checked={isWhatsappSame} 
                      onChange={(e) => setIsWhatsappSame(e.target.checked)} 
                      className="h-4 w-4 rounded accent-[#414E36]"
                    />
                    <span>{isRTL ? "هذا الرقم هو رقم الواتساب أيضاً" : "This is the WhatsApp number too"}</span>
                  </label>

                  {!isWhatsappSame && (
                    <div className="animate-fadeIn mt-2">
                      <label className="block mb-1 text-xs font-semibold">{isRTL ? "رقم الواتساب" : "WhatsApp Number"}</label>
                      <input 
                        type="tel" 
                        required 
                        placeholder={isRTL ? "أدخل رقم الواتساب" : "Enter WhatsApp number"} 
                        className="cr-input" 
                        value={whatsappNumber} 
                        onChange={(e) => setWhatsappNumber(e.target.value)} 
                      />
                    </div>
                  )}
                </div>

                {/* Terms & Conditions Gate (Step 2 fallback when no payment step required) */}
                {(hasTerms || termsText.trim() !== "") && depositPercentage === 0 && (
                  <div className="mb-5 text-left" dir={isRTL ? "rtl" : "ltr"}>
                    <div className="rounded-2xl border border-gray-200/90 bg-white p-5 space-y-4 shadow-2xs">
                      <div className="flex items-center gap-2 text-[#2D522D] font-bold text-xs tracking-wider uppercase">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full border border-[#2D522D]/40 text-[#2D522D]">
                          <ShieldCheck size={14} />
                        </div>
                        <span>{isRTL ? "الشروط والأحكام" : "TERMS & CONDITIONS"}</span>
                      </div>

                      <p className="text-xs text-gray-700 font-medium leading-relaxed">
                        {isRTL ? "بالمتابعة، فإنك توافق على الشروط والأحكام الخاصة بنا." : "By continuing, you agree to our Terms & Conditions."}
                      </p>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-gray-200/80 bg-[#F4F8F4] p-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E2EBE2] text-[#2D522D]">
                            <FileText size={16} />
                          </div>
                          <span className="text-xs text-gray-600 font-normal leading-normal">
                            {isRTL ? "يرجى قراءة الشروط والأحكام بعناية قبل المتابعة." : "Please read our Terms & Conditions carefully before proceeding."}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowTermsModal(true)}
                          className="flex items-center gap-1 text-xs font-semibold text-[#2D522D] underline underline-offset-2 hover:opacity-80 shrink-0 self-end sm:self-auto cursor-pointer"
                        >
                          <span>{isRTL ? "عرض الشروط والأحكام" : "View Terms & Conditions"}</span>
                          <ExternalLink size={13} />
                        </button>
                      </div>

                      <div className="border-t border-gray-200/80 my-2" />

                      <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <div className="relative flex items-center">
                          <input
                            type="checkbox"
                            checked={acceptedTerms}
                            onChange={(e) => setAcceptedTerms(e.target.checked)}
                            className="peer h-4 w-4 appearance-none rounded border-2 border-gray-300 bg-white checked:border-[#2D522D] checked:bg-[#2D522D] focus:outline-none transition cursor-pointer"
                          />
                          <svg
                            className="pointer-events-none absolute left-0.5 top-0.5 hidden h-3 w-3 stroke-white peer-checked:block"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="3.5"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        </div>
                        <span className="text-xs text-gray-800 font-normal">
                          {isRTL ? "لقد قرأت وأوافق على " : "I have read and agree to the "}
                          <button
                            type="button"
                            onClick={() => setShowTermsModal(true)}
                            className="font-semibold text-[#2D522D] underline underline-offset-2 hover:opacity-80 cursor-pointer"
                          >
                            {isRTL ? "الشروط والأحكام" : "Terms & Conditions"}
                          </button>
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleConfirm}
                  disabled={isCreatingReservation || (depositPercentage === 0 && (hasTerms || termsText.trim() !== "") && !acceptedTerms)}
                  className="btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                >
                  {isCreatingReservation ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      {isRTL ? "جاري الحفظ..." : "Creating Reservation..."}
                    </>
                  ) : depositPercentage > 0 ? (
                    isRTL ? "الذهاب للدفع" : "Proceed to Payment"
                  ) : (
                    t.booking.confirmBtn
                  )}
                </button>
              </div>
            )}

            {/* Step 3: Payment (Deposit Payment) */}
            {step === 3 && (
              <div className="space-y-4">
                <p className="text-sm font-bold text-[#1F251A]">
                  {selectedDepositMethod === "wallet"
                    ? (isRTL ? "دفع عربون الحجز عبر المحفظة الإلكترونية" : "Reservation Deposit via Mobile Wallet")
                    : (isRTL ? "دفع عربون الحجز عبر إنستاباي" : "Reservation Deposit via InstaPay")
                  }
                </p>
                <p className="text-xs text-[#5A6A51] leading-relaxed">
                  {selectedDepositMethod === "wallet"
                    ? (isRTL 
                        ? `لتأكيد حجزك، يرجى تحويل عربون الحجز المطلـوب (${depositPercentage}%) إلى رقم المحفظة أدناه، ثم أدخل رقم الهاتف وأرسل صورة التحويل عبر الواتساب.` 
                        : `To secure your reservation, please pay the required deposit (${depositPercentage}%) to the wallet number below, enter your mobile number, and send the transaction screenshot on WhatsApp.`)
                    : (isRTL 
                        ? `لتأكيد حجزك، يرجى تحويل عربون الحجز المطلـوب (${depositPercentage}%) عبر تطبيق إنستاباي، ثم أدخل اسم حسابك وأرسل صورة التحويل عبر الواتساب.` 
                        : `To secure your reservation, please pay the required deposit (${depositPercentage}%) via InstaPay, then input your account name below and send the transaction screenshot on WhatsApp.`)
                  }
                </p>

                {/* Payment Method Selector Tab */}
                <div className="space-y-1.5 pt-1">
                  <label className="block text-[11px] font-bold text-[#5A6A51] uppercase tracking-wider">
                    {isRTL ? "اختر طريقة دفع العربون" : "Select Payment Method"}
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-[#EDF1EC] border border-[#414E36]/15">
                    <button
                      type="button"
                      onClick={() => setSelectedDepositMethod("instapay")}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        selectedDepositMethod === "instapay"
                          ? "bg-white text-[#414E36] shadow-sm border border-[#414E36]/10"
                          : "text-[#5A6A51] hover:text-[#1F251A]"
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full ${selectedDepositMethod === "instapay" ? "bg-[#C4AE7C]" : "bg-gray-400"}`}></span>
                      {isRTL ? "إنستاباي (InstaPay)" : "InstaPay"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedDepositMethod("wallet")}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        selectedDepositMethod === "wallet"
                          ? "bg-white text-[#414E36] shadow-sm border border-[#414E36]/10"
                          : "text-[#5A6A51] hover:text-[#1F251A]"
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full ${selectedDepositMethod === "wallet" ? "bg-emerald-600" : "bg-gray-400"}`}></span>
                      {walletName ? (isRTL ? `محفظة ${walletName}` : `${walletName} Wallet`) : (isRTL ? "محفظة إلكترونية" : "Mobile Wallet")}
                    </button>
                  </div>
                </div>

                {/* Deposit Awareness Banner */}
                {depositPercentage > 0 && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-3.5 flex items-start gap-2.5 text-xs text-amber-800 leading-relaxed font-medium">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-amber-700">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <div>
                      <p className="font-bold mb-0.5 text-amber-900">
                        {isRTL ? "تنبيه هام حول تأكيد الحجز" : "Important Booking Confirmation Notice"}
                      </p>
                      <p className="opacity-90">
                        {isRTL 
                          ? `يرجى العلم أن حجزك لا يعتبر مؤكداً حتى يتم سداد عربون الحجز (${depositPercentage}%). سيبقى الحجز معلقاً لحين إتمام التحويل وإرسال الصورة.` 
                          : `Please note that your booking is not confirmed until the required ${depositPercentage}% reservation deposit is paid. It will remain pending deposit until the transfer is made and receipt screenshot is received.`
                        }
                      </p>
                    </div>
                  </div>
                )}

                {/* Price Breakdown */}
                <div className="rounded-2xl border border-[#C4AE7C]/20 bg-[#FBFBF9] p-4 text-xs space-y-2 text-[#1F251A]">
                  <div className="flex justify-between">
                    <span className="opacity-70">{isRTL ? "سعر الخدمة الإجمالي:" : "Service Price:"}</span>
                    <span className="font-semibold">EGP {selectedService?.price || 0}</span>
                  </div>
                  <div className="flex justify-between text-purple-700 font-bold">
                    <span>{isRTL ? `عربون الحجز المطلـوب (${depositPercentage}%):` : `Required Deposit (${depositPercentage}%):`}</span>
                    <span>EGP {Math.round((selectedService?.price || 0) * (depositPercentage / 100))}</span>
                  </div>
                  <div className="border-t border-dashed border-[#C4AE7C]/20 pt-2 flex justify-between font-bold">
                    <span>{isRTL ? "المبلغ المتبقي بالعيادة:" : "Remaining Balance (Pay at Clinic):"}</span>
                    <span>EGP {(selectedService?.price || 0) - Math.round((selectedService?.price || 0) * (depositPercentage / 100))}</span>
                  </div>
                </div>

                {selectedDepositMethod === "instapay" ? (
                  /* Clinic InstaPay Info Box */
                  <div className="rounded-2xl border border-[#414E36]/15 bg-[#EDF1EC] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider">{isRTL ? "عنوان إنستاباي الخاص بالعيادة" : "CLINIC INSTAPAY ADDRESS"}</p>
                        <p className="text-xs font-bold text-[#1F251A] mt-0.5">{instapayAddress}</p>
                        {instapayName && <p className="text-[10px] font-bold text-[#5A6A51] mt-0.5">{instapayName}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(instapayAddress);
                          setCopiedAddress(true);
                          setTimeout(() => setCopiedAddress(false), 2000);
                        }}
                        className="rounded-xl border border-[#414E36]/20 bg-white px-3 py-1.5 text-xs font-bold text-[#414E36] hover:bg-[#f7f6f2] transition cursor-pointer"
                      >
                        {copiedAddress ? (isRTL ? "تم النسخ!" : "Copied!") : (isRTL ? "نسخ" : "Copy")}
                      </button>
                    </div>

                    {instapayLink && (
                      <div className="border-t border-[#414E36]/10 pt-2 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider">{isRTL ? "رابط تحويل إنستاباي" : "INSTAPAY QUICK LINK"}</span>
                        <a 
                          href={instapayLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-[#C4AE7C] hover:underline"
                        >
                          {isRTL ? "فتح تطبيق إنستاباي" : "Open InstaPay"} &rarr;
                        </a>
                      </div>
                    )}

                    {/* InstaPay QR Code */}
                    <div className="pt-2 text-center">
                      <p className="text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider mb-2">{isRTL ? "امسح رمز الاستجابة السريعة (QR) [انقر للتكبير]" : "SCAN QR CODE TO PAY [Click to Zoom]"}</p>
                      <div 
                        onClick={() => setZoomQr(true)}
                        className="inline-block rounded-2xl bg-white p-2 border border-[#C4AE7C]/20 shadow-sm hover:border-[#C4AE7C] hover:scale-105 transition duration-200 cursor-pointer"
                        title={isRTL ? "انقر لتكبير رمز الاستجابة السريعة" : "Click to zoom QR Code"}
                      >
                        <img 
                          src={instapayQrUrl} 
                          alt="InstaPay QR Code" 
                          className="w-32 h-32 object-contain"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Clinic Wallet Info Box */
                  <div className="rounded-2xl border border-[#414E36]/15 bg-[#EDF1EC] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider">{walletName ? (isRTL ? `رقم محفظة ${walletName}` : `CLINIC ${walletName.toUpperCase()} NUMBER`) : (isRTL ? "رقم المحفظة الإلكترونية للعيادة" : "CLINIC WALLET NUMBER")}</p>
                        <p className="text-sm font-extrabold text-[#1F251A] mt-0.5 tracking-wider">{walletNumber}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(walletNumber);
                          setCopiedAddress(true);
                          setTimeout(() => setCopiedAddress(false), 2000);
                        }}
                        className="rounded-xl border border-[#414E36]/20 bg-white px-3 py-1.5 text-xs font-bold text-[#414E36] hover:bg-[#f7f6f2] transition cursor-pointer"
                      >
                        {copiedAddress ? (isRTL ? "تم النسخ!" : "Copied!") : (isRTL ? "نسخ" : "Copy")}
                      </button>
                    </div>

                    <div className="border-t border-[#414E36]/10 pt-2 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider">{isRTL ? "رابط المحفظة الإلكترونية" : "WALLET QUICK LINK"}</span>
                      <a 
                        href={currentPaymentLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-[#C4AE7C] hover:underline"
                      >
                        {walletLink ? (isRTL ? "فتح رابط المحفظة" : "Open Wallet") : (isRTL ? "اتصال بالرقم" : "Dial Number")} &rarr;
                      </a>
                    </div>

                    {/* Wallet QR Code */}
                    <div className="pt-2 text-center">
                      <p className="text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider mb-2">
                        {isRTL ? "امسح رمز الاستجابة السريعة للمحفظة (QR) [انقر للتكبير]" : "SCAN WALLET QR CODE TO PAY [Click to Zoom]"}
                      </p>
                      <div 
                        onClick={() => setZoomQr(true)}
                        className="inline-block rounded-2xl bg-white p-2 border border-[#C4AE7C]/20 shadow-sm hover:border-[#C4AE7C] hover:scale-105 transition duration-200 cursor-pointer"
                        title={isRTL ? "انقر لتكبير رمز الاستجابة السريعة" : "Click to zoom QR Code"}
                      >
                        <img 
                          src={currentQrUrl} 
                          alt="Wallet QR Code" 
                          className="w-32 h-32 object-contain"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Patient's Account / Phone Input */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-[#5A6A51] uppercase tracking-wider">
                    {selectedDepositMethod === "wallet"
                      ? (isRTL ? "رقم المحفظة الإلكترونية الخاص بك (الذي قمت بالتحويل منه)" : "Your Wallet Mobile Number (Sent From)")
                      : (isRTL ? "عنوان إنستاباي الخاص بك (الذي قمت بالتحويل منه)" : "Your InstaPay Address (Sent From)")}
                  </label>
                  <input 
                    type="text" 
                    placeholder={selectedDepositMethod === "wallet" ? "010xxxxxxxx" : "name@instapay"} 
                    value={customerPaymentSender}
                    onChange={(e) => setCustomerPaymentSender(e.target.value)}
                  />
                </div>

                {/* Terms & Conditions Gate on Payment Page */}
                {(hasTerms || termsText.trim() !== "") && (
                  <div className="mt-4 text-left" dir={isRTL ? "rtl" : "ltr"}>
                    <div className="rounded-2xl border border-gray-200/90 bg-white p-4 space-y-3 shadow-2xs">
                      <div className="flex items-center gap-2 text-[#2D522D] font-bold text-xs tracking-wider uppercase">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full border border-[#2D522D]/40 text-[#2D522D]">
                          <ShieldCheck size={13} />
                        </div>
                        <span>{isRTL ? "الشروط والأحكام" : "TERMS & CONDITIONS"}</span>
                      </div>

                      <div className="flex items-center justify-between gap-2 rounded-xl border border-gray-200/80 bg-[#F4F8F4] p-2.5">
                        <span className="text-xs text-gray-600 font-normal">
                          {isRTL ? "يرجى قراءة الشروط والأحكام قبل إتمام الدفع." : "Please read our Terms & Conditions before paying."}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowTermsModal(true)}
                          className="flex items-center gap-1 text-xs font-semibold text-[#2D522D] underline shrink-0 cursor-pointer"
                        >
                          <span>{isRTL ? "عرض" : "View"}</span>
                          <ExternalLink size={12} />
                        </button>
                      </div>

                      <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <div className="relative flex items-center">
                          <input
                            type="checkbox"
                            checked={acceptedTerms}
                            onChange={(e) => setAcceptedTerms(e.target.checked)}
                            className="peer h-4 w-4 appearance-none rounded border-2 border-gray-300 bg-white checked:border-[#2D522D] checked:bg-[#2D522D] focus:outline-none transition cursor-pointer"
                          />
                          <svg
                            className="pointer-events-none absolute left-0.5 top-0.5 hidden h-3 w-3 stroke-white peer-checked:block"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="3.5"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        </div>
                        <span className="text-xs text-gray-800 font-normal">
                          {isRTL ? "لقد قرأت وأوافق على " : "I have read and agree to the "}
                          <button
                            type="button"
                            onClick={() => setShowTermsModal(true)}
                            className="font-semibold text-[#2D522D] underline hover:opacity-80 cursor-pointer"
                          >
                            {isRTL ? "الشروط والأحكام" : "Terms & Conditions"}
                          </button>
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Submit Deposit Button */}
                <div className="pt-2 space-y-2">
                  <button
                    type="button"
                    onClick={handlePayDeposit}
                    disabled={isPaying || ((hasTerms || termsText.trim() !== "") && !acceptedTerms)}
                    className="w-full justify-center rounded-2xl py-3.5 px-4 text-xs sm:text-sm font-extrabold text-white bg-[#414E36] transition shadow-md flex items-center justify-center gap-2 hover:bg-[#2e3a26] disabled:opacity-50 cursor-pointer"
                  >
                    {isPaying ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        {isRTL ? "جاري الحفظ والتحويل..." : "Saving & Redirecting..."}
                      </>
                    ) : (
                      <>
                        <div className="flex h-5 w-5 items-center justify-center rounded-full border-1.5 border-white">
                          <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.835-4.322c1.7.925 3.328 1.459 5.166 1.46 5.485.001 9.948-4.462 9.951-9.95.002-2.658-1.031-5.158-2.906-7.037C17.228 2.275 14.73 1.24 12.072 1.24a9.957 9.957 0 0 0-9.951 9.956c-.001 1.93.513 3.567 1.492 5.093l-.999 3.65 3.743-.981zM17.476 14.398c-.329-.165-1.947-.961-2.245-1.07-.3-.109-.518-.165-.736.165-.218.329-.844 1.07-1.034 1.289-.19.217-.38.244-.709.079a8.932 8.932 0 0 1-2.736-1.688 9.842 9.842 0 0 1-1.893-2.358c-.19-.329-.02-.507.145-.671.148-.148.33-.382.495-.572.164-.19.219-.328.328-.547.11-.219.055-.41-.027-.574-.082-.164-.736-1.776-1.009-2.433-.266-.64-.539-.553-.736-.563-.19-.01-.409-.012-.627-.012s-.573.082-.873.409c-.3.329-1.145 1.12-1.145 2.732s1.173 3.17 1.336 3.389c.164.22 2.308 3.525 5.59 4.945.78.337 1.39.539 1.86.688.784.248 1.498.213 2.062.128.629-.094 1.947-.796 2.219-1.564.272-.767.272-1.424.19-1.564-.081-.138-.3-.22-.629-.385z" />
                          </svg>
                        </div>
                        <span>{isRTL ? "تأكيد وإرسال صورة التحويل" : "Confirm & Send Screenshot"}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStep(2);
                      setCreatedReservation(null);
                    }}
                    disabled={isPaying}
                    className="w-full justify-center rounded-2xl py-3.5 px-4 text-xs sm:text-sm font-semibold text-gray-800 bg-white border border-gray-300 transition flex items-center justify-center gap-2 hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
                  >
                    <Undo2 size={16} className="text-gray-700" />
                    <span>{isRTL ? "إلغاء والعودة" : "Cancel & Return"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            {step < 3 && (
              <div
                className={`flex mt-6 gap-3 ${
                  step === 1 ? "justify-end" : "justify-between"
                }`}
              >
                {step > 1 && (
                  <button
                    onClick={handleBack}
                    className="btn-outline cursor-pointer"
                  >
                    {t.booking.backBtn}
                  </button>
                )}
                {step === 1 && (
                  <button
                    onClick={handleNext}
                    disabled={!canNext}
                    className="btn-primary cursor-pointer"
                    style={{ opacity: canNext ? 1 : 0.4, cursor: canNext ? "pointer" : "not-allowed" }}
                  >
                    {isRTL ? "التالي: التأكيد" : "Next: Confirm"}
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Zoomed QR Overlay */}
      {zoomQr && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm transition-all cursor-pointer"
          onClick={() => setZoomQr(false)}
        >
          <div className="relative max-w-sm w-full bg-white rounded-3xl p-6 shadow-2xl flex flex-col items-center border border-[#414E36]/10 animate-scaleIn cursor-default" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setZoomQr(false)}
              className="absolute right-6 top-6 h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition font-bold text-lg cursor-pointer"
            >
              &times;
            </button>
            <p className="text-sm font-bold text-[#414E36] mb-4 uppercase tracking-wider text-center">
              {selectedDepositMethod === "wallet"
                ? (isRTL ? `رمز الاستجابة السريعة للمحفظة` : `SCAN WALLET QR CODE`)
                : (isRTL ? "رمز الاستجابة السريعة (InstaPay)" : "SCAN INSTAPAY QR CODE")
              }
            </p>
            <div className="bg-white p-3 rounded-2xl border border-[#C4AE7C]/20 shadow-inner">
              <img 
                src={currentQrUrl} 
                alt="QR Code Zoomed" 
                className="w-64 h-64 object-contain"
              />
            </div>
            {currentPaymentLink && (
              <a 
                href={currentPaymentLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 rounded-xl bg-[#414E36] px-5 py-2 text-xs font-bold text-white hover:bg-[#2e3a26] transition shadow"
              >
                {selectedDepositMethod === "wallet"
                  ? (walletLink ? (isRTL ? "فتح رابط المحفظة" : "Open Wallet App") : (isRTL ? "اتصال بالرقم" : "Dial Number"))
                  : (isRTL ? "فتح تطبيق إنستاباي" : "Open InstaPay App")
                }
              </a>
            )}
            <p className="text-[11px] text-[#8A9A81] mt-3 text-center">
              {isRTL ? "انقر في أي مكان للإغلاق" : "Click anywhere outside to close"}
            </p>
          </div>
        </div>
      )}

      {/* Terms & Conditions Modal */}
      <TermsModal 
        isOpen={showTermsModal} 
        onClose={() => setShowTermsModal(false)} 
        defaultLang={isRTL ? "ar" : "en"} 
      />
    </div>
  );
}
