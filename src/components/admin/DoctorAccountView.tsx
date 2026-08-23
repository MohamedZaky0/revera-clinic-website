"use client";

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { DoctorAccountViewProps, DoctorTab, DoctorPatient, UsedProduct } from "./doctor/types";
import { doctorTranslations } from "./doctor/translations";
import { adminTranslations } from "./translations";
import { parseBookingNotes, getAuthHeaders } from "./doctor/utils";
import DoctorSidebar from "./doctor/DoctorSidebar";
import DoctorScheduleTab from "./doctor/tabs/DoctorScheduleTab";
import DoctorOngoingSessionTab, { AdditionalServiceItem } from "./doctor/tabs/DoctorOngoingSessionTab";
import DoctorPatientsTab from "./doctor/tabs/DoctorPatientsTab";
import DoctorAnalyticsTab from "./doctor/tabs/DoctorAnalyticsTab";
import DoctorSettingsTab from "./doctor/tabs/DoctorSettingsTab";
import DoctorProfileTab from "./doctor/tabs/DoctorProfileTab";
import UserProfileView from "./UserProfileView";
import DoctorSessionDrawer from "./doctor/modals/DoctorSessionDrawer";
import DoctorPatientHistoryDrawer from "./doctor/modals/DoctorPatientHistoryDrawer";

// Local Date Helper to avoid UTC conversion shifts
const getLocalDateString = (d: Date = new Date()): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export default function DoctorAccountView({
  doctorDbId,
  doctorName = "Doctor",
  doctorEmail = "doctor@revera.com",
  doctorBranch = "Main Branch",
  branches = [],
  initialReservations = [],
  onLogout
}: DoctorAccountViewProps) {
  const [lang, setLang] = useState<"en" | "ar">("en");
  const t = doctorTranslations[lang];
  const [activeTab, setActiveTab] = useState<DoctorTab>("schedule");
  const [scheduleViewMode, setScheduleViewMode] = useState<"calendar" | "list">("calendar");
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => new Date());
  // Helper to exclude rejected and cancelled bookings from doctor view
  const filterValidDoctorBookings = (list: any[]) => {
    if (!Array.isArray(list)) return [];
    return list.filter((r: any) => {
      const st = String(r?.status || "").toLowerCase().trim();
      return st !== "rejected" && st !== "cancelled" && st !== "canceled";
    });
  };

  const [reservations, setReservations] = useState<any[]>(() => filterValidDoctorBookings(initialReservations));
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [patientSearchQuery, setPatientSearchQuery] = useState("");
  const [selectedPatientHistory, setSelectedPatientHistory] = useState<DoctorPatient | null>(null);
  const [branchList, setBranchList] = useState<any[]>(branches || []);

  useEffect(() => {
    if (branches && branches.length > 0) {
      setBranchList(branches);
    } else {
      fetch("/api/branches")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setBranchList(data);
          else if (data && Array.isArray(data.branches)) setBranchList(data.branches);
        })
        .catch(() => {});
    }
  }, [branches]);

  const [providerRecord, setProviderRecord] = useState<any>(null);
  const [providerBranches, setProviderBranches] = useState<string[]>([]);

  useEffect(() => {
    async function loadProviderDetails() {
      try {
        const cleanName = doctorName ? doctorName.replace(/^Dr\.?\s*/i, "").trim() : "";
        let query = supabase.from("providers").select("*");
        if (doctorDbId) {
          query = query.eq("id", doctorDbId);
        } else if (cleanName) {
          query = query.ilike("name", `%${cleanName}%`);
        }
        const { data } = await query.maybeSingle();
        if (data) {
          setProviderRecord(data);

          // Extract multi-branch assignments from provider record
          let bIds: string[] = [];
          if (data.working_days_hours && typeof data.working_days_hours === "object" && Array.isArray(data.working_days_hours.branch_ids)) {
            bIds = data.working_days_hours.branch_ids;
          } else if (Array.isArray(data.branch_ids)) {
            bIds = data.branch_ids;
          } else if (data.branch_id) {
            bIds = [data.branch_id];
          }

          const { data: branchRows } = await supabase.from("branches").select("id, name_en, name");
          const allClinicNames = (branchRows || []).map((b: any) => b.name_en || b.name).filter(Boolean);

          let names: string[] = [];
          if (bIds.length > 0) {
            names = bIds.map((id: any) => {
              const match = (branchRows || []).find((b: any) => String(b.id) === String(id) || String(b.name_en).toLowerCase() === String(id).toLowerCase());
              if (match) return match.name_en || match.name;
              const lower = String(id).toLowerCase().trim();
              if (lower === "home") return null;
              if (lower === "main") return "Main Branch";
              return String(id);
            }).filter(Boolean) as string[];
          }

          if (names.length === 0) {
            names = allClinicNames.length > 0 ? allClinicNames : ["Main Branch"];
          }
          setProviderBranches(names);
        }
      } catch (e) {
        console.error("Error loading doctor database provider record:", e);
      }
    }
    loadProviderDetails();
  }, [doctorDbId, doctorName]);

  const resolvedBranchName = useMemo(() => {
    if (!doctorBranch) return "Main Branch";
    const match = branchList.find(
      (b) => b.id === doctorBranch || b.name_en === doctorBranch
    );
    if (match) return match.name_en || match.name || "Main Branch";

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      doctorBranch.trim()
    );
    if (isUuid) {
      if (branchList.length > 0) {
        return branchList[0].name_en || branchList[0].name || "Main Branch";
      }
      return "Main Branch";
    }
    return doctorBranch;
  }, [doctorBranch, branchList]);

  // Derived Doctor Patients List from Reservations
  const doctorPatientsList = useMemo(() => {
    const patientMap = new Map<string, DoctorPatient>();

    reservations.forEach((r) => {
      const key = r.customer_id || r.customer_phone || r.phone || r.name || r.id;
      if (!key) return;

      const pName = r.name || r.customer_name || r.patient_name || "Patient";
      const pPhone = r.phone || r.customer_phone || "N/A";
      const pEmail = r.email || r.customer_email || "";
      const serviceName = r.service_name || r.service || (Array.isArray(r.services) ? r.services.join(", ") : "Clinical Session");
      const visitDate = r.date || "";

      if (!patientMap.has(key)) {
        patientMap.set(key, {
          id: String(key),
          name: pName,
          phone: pPhone,
          email: pEmail,
          totalVisits: 1,
          lastVisitDate: visitDate,
          recentServices: [serviceName],
          bookings: [r]
        });
      } else {
        const existing = patientMap.get(key)!;
        existing.totalVisits += 1;
        if (visitDate && visitDate > (existing.lastVisitDate || "")) {
          existing.lastVisitDate = visitDate;
        }
        if (!existing.recentServices.includes(serviceName)) {
          existing.recentServices.push(serviceName);
        }
        existing.bookings.push(r);
      }
    });

    return Array.from(patientMap.values());
  }, [reservations]);

  // Filtered Patients List for Search
  const filteredPatientsList = useMemo(() => {
    if (!patientSearchQuery.trim()) return doctorPatientsList;
    const q = patientSearchQuery.toLowerCase();
    return doctorPatientsList.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.phone.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.recentServices.some((s) => s.toLowerCase().includes(q))
    );
  }, [doctorPatientsList, patientSearchQuery]);

  // Analytics Metrics Computation
  const analyticsData = useMemo(() => {
    const totalBookings = reservations.length;
    let totalRevenue = 0;
    let completedCount = 0;
    let confirmedCount = 0;
    let pendingCount = 0;
    let cancelledCount = 0;
    const serviceDataMap: Record<string, { count: number; revenue: number }> = {};
    const monthlyDataMap: Record<string, { count: number; revenue: number }> = {};

    reservations.forEach((r) => {
      const price = Number(r.price || r.total_price || r.amount || 0);
      totalRevenue += price;

      const st = String(r.status || "confirmed").toLowerCase();
      if (st === "completed" || st === "done") completedCount++;
      else if (st === "confirmed" || st === "arrived" || st === "started") confirmedCount++;
      else if (st === "pending") pendingCount++;
      else if (st === "cancelled" || st === "canceled") cancelledCount++;

      const serviceName = r.service_name || r.service || "Clinical Consultation";
      if (!serviceDataMap[serviceName]) serviceDataMap[serviceName] = { count: 0, revenue: 0 };
      serviceDataMap[serviceName].count += 1;
      serviceDataMap[serviceName].revenue += price;

      const monthKey = (r.date || "").slice(0, 7);
      if (monthKey) {
        if (!monthlyDataMap[monthKey]) monthlyDataMap[monthKey] = { count: 0, revenue: 0 };
        monthlyDataMap[monthKey].count += 1;
        monthlyDataMap[monthKey].revenue += price;
      }
    });

    const avgSessionValue = completedCount > 0 ? Math.round(totalRevenue / completedCount) : 0;
    const completionRate = totalBookings > 0 ? Math.round((completedCount / totalBookings) * 100) : 0;

    const topServices = Object.entries(serviceDataMap)
      .map(([name, data]) => ({ name, count: data.count, revenue: data.revenue }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const monthlyTrend = Object.entries(monthlyDataMap)
      .map(([month, data]) => ({ month, revenue: data.revenue, count: data.count }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      totalRevenue,
      completedCount,
      confirmedCount,
      pendingCount,
      cancelledCount,
      totalBookings,
      avgSessionValue,
      completionRate,
      topServices,
      monthlyTrend
    };
  }, [reservations]);

  // Date Selector State for Schedule (Using local date strings to prevent day shifts)
  const todayStr = useMemo(() => getLocalDateString(new Date()), []);

  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return getLocalDateString(d);
  }, []);

  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return getLocalDateString(d);
  }, []);

  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr);

  // Active Session State (Ongoing Tab)
  const [activeSessionBooking, setActiveSessionBooking] = useState<any | null>(null);
  const [clinicalNote, setClinicalNote] = useState("");
  const [medicalRecord, setMedicalRecord] = useState<any | null>(null);
  const [medicalRecordLoading, setMedicalRecordLoading] = useState(false);
  const [resolvedCustomerId, setResolvedCustomerId] = useState<string | null>(null);
  const [savingNote, setSavingNote] = useState(false);

  // Catalog State (Services, Inventory Products & Devices)
  const [servicesList, setServicesList] = useState<any[]>([]);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [devicesList, setDevicesList] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedProductQty, setSelectedProductQty] = useState<number>(1);
  const [usedProducts, setUsedProducts] = useState<UsedProduct[]>([]);
  const [additionalServices, setAdditionalServices] = useState<AdditionalServiceItem[]>([]);

  // Extra Device Pulses State
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [extraPulsesCount, setExtraPulsesCount] = useState<number>(0);
  const [pricePerPulse, setPricePerPulse] = useState<number>(0);

  // Medical Record Form State
  const [showMedicalForm, setShowMedicalForm] = useState(false);
  const [formSkinType, setFormSkinType] = useState("Normal");
  const [formAllergies, setFormAllergies] = useState("");
  const [formMedicationDetails, setFormMedicationDetails] = useState("");
  const [formMedicalConditionsDetails, setFormMedicalConditionsDetails] = useState("");
  const [formPreviousTreatmentsDetails, setFormPreviousTreatmentsDetails] = useState("");
  const [savingMedicalRecord, setSavingMedicalRecord] = useState(false);

  // In-Page Session Modal State (Schedule Tab)
  const [scheduleModalBooking, setScheduleModalBooking] = useState<any | null>(null);


  // Password Update State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Fetch inventory products, devices & services catalog on mount
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const headers = await getAuthHeaders();
        const [prodRes, devRes, srvRes] = await Promise.all([
          fetch("/api/inventory/products", { headers }),
          fetch("/api/inventory/devices", { headers }),
          fetch("/api/services", { headers })
        ]);
        if (prodRes.ok) {
          const pData = await prodRes.json();
          setProductsList(Array.isArray(pData) ? pData : pData.products || []);
        }
        if (devRes.ok) {
          const dData = await devRes.json();
          setDevicesList(Array.isArray(dData) ? dData : dData.devices || []);
        }
        if (srvRes.ok) {
          const sData = await srvRes.json();
          setServicesList(Array.isArray(sData) ? sData : sData.services || []);
        }
      } catch (err) {
        console.error("Error loading doctor catalog:", err);
      }
    };
    fetchInventory();
  }, []);

  // Fetch Doctor Reservations from DB
  const fetchDoctorReservations = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      let queryUrl = "/api/reservations?limit=150";
      if (doctorDbId) {
        queryUrl += `&doctorId=${encodeURIComponent(doctorDbId)}`;
      } else if (doctorName && doctorName !== "Doctor") {
        queryUrl += `&doctorName=${encodeURIComponent(doctorName)}`;
      }

      const headers = await getAuthHeaders();
      const res = await fetch(queryUrl, { headers });
      if (res.ok) {
        const data = await res.json();
        let resList = Array.isArray(data) ? data : data.reservations || [];
        resList = filterValidDoctorBookings(resList);
        if (doctorName && doctorName !== "Doctor" && resList.length > 0) {
          const docLower = doctorName.toLowerCase().replace(/^dr\.?\s*/i, "").trim();
          resList = resList.filter((r: any) => {
            if (!r.doctorName) return true;
            const rDocLower = String(r.doctorName).toLowerCase().replace(/^dr\.?\s*/i, "").trim();
            return rDocLower.includes(docLower) || docLower.includes(rDocLower);
          });
        }
        setReservations(resList);
      }
    } catch (err) {
      console.error("Error fetching doctor reservations:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Silent 3-second background polling
  useEffect(() => {
    fetchDoctorReservations();
    const interval = setInterval(() => {
      fetchDoctorReservations(true);
    }, 3000);
    return () => clearInterval(interval);
  }, [doctorDbId, doctorName]);

  // Persistent Real-time Subscriptions for Started Sessions & Bookings
  useEffect(() => {
    const channel = supabase
      .channel("doctor-realtime-reservations")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reservations" },
        (payload: any) => {
          if (payload.new) {
            const updated: any = payload.new;
            setReservations((prev) => {
              const idx = prev.findIndex((item) => item.id === updated.id);
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = { ...next[idx], ...updated };
                return next;
              }
              return [updated, ...prev];
            });

            const st = String(updated.status || "").toLowerCase().trim();
            const isActive = st === "started" || st === "in-progress" || st === "in_progress" || st === "active" || st === "in treatment";
            if (isActive) {
              setActiveSessionBooking(updated);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Auto-detect receptionist started session
  const receptionistStartedSession = useMemo(() => {
    return reservations.find((r) => {
      const st = String(r.status || "").toLowerCase().trim();
      return st === "started" || st === "in-progress" || st === "in_progress" || st === "active" || st === "in treatment";
    });
  }, [reservations]);

  useEffect(() => {
    if (receptionistStartedSession) {
      if (!activeSessionBooking || activeSessionBooking.id !== receptionistStartedSession.id) {
        setActiveSessionBooking(receptionistStartedSession);
      }
    } else if (activeSessionBooking) {
      const st = String(activeSessionBooking.status || "").toLowerCase().trim();
      if (st === "completed" || st === "done" || st === "cancelled" || st === "canceled") {
        setActiveSessionBooking(null);
      }
    }
  }, [receptionistStartedSession, reservations, activeSessionBooking]);

  // Sync active session clinical notes
  useEffect(() => {
    if (activeSessionBooking) {
      const existingNotes = activeSessionBooking.notes || activeSessionBooking.doctor_notes || "";
      const parsed = parseBookingNotes(existingNotes);
      setClinicalNote(parsed.cleanDoctorNote || (parsed as any).cleanNote || "");
    }
  }, [activeSessionBooking]);

  // Auto-fetch Patient Medical Record
  useEffect(() => {
    const fetchPatientMedicalRecord = async () => {
      if (!activeSessionBooking) return;

      const custId = activeSessionBooking.customer_id || activeSessionBooking.customerId || activeSessionBooking.id;
      if (!custId) return;

      setResolvedCustomerId(custId);
      setMedicalRecordLoading(true);

      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`/api/medical-records?customerId=${encodeURIComponent(custId)}`, { headers });
        if (res.ok) {
          const data = await res.json();
          const record = data.form || data.medicalRecord || (Array.isArray(data) ? data[0] : null);
          setMedicalRecord(record);

          if (record) {
            setFormSkinType(record.skin_type || "Normal");
            setFormAllergies(record.allergies || "");
            setFormMedicationDetails(record.medication_details || "");
            setFormMedicalConditionsDetails(record.medical_conditions_details || "");
            setFormPreviousTreatmentsDetails(record.previous_treatments_details || "");
            setShowMedicalForm(false);
          }
        }
      } catch (err) {
        console.error("Error loading medical record:", err);
      } finally {
        setMedicalRecordLoading(false);
      }
    };

    fetchPatientMedicalRecord();
  }, [activeSessionBooking]);

  // Month navigation handlers
  const handlePrevCalendarMonth = () => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const handleNextCalendarMonth = () => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };
  const handleTodayCalendarMonth = () => {
    setCalendarMonth(new Date());
    setSelectedDateStr(todayStr);
  };

  // Group reservations by date
  const reservationsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    reservations.forEach((r) => {
      const dStr = r.date || todayStr;
      if (!map[dStr]) map[dStr] = [];
      map[dStr].push(r);
    });
    return map;
  }, [reservations, todayStr]);

  // Generate calendar days for month grid using local date strings
  const calendarDaysList = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const d = new Date(year, month - 1, dayNum);
      days.push({
        dateStr: getLocalDateString(d),
        dayNum,
        isCurrentMonth: false
      });
    }

    // Current month days
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const d = new Date(year, month, dayNum);
      days.push({
        dateStr: getLocalDateString(d),
        dayNum,
        isCurrentMonth: true
      });
    }

    // Next month padding to fill 35/42 cells grid
    const totalCells = days.length > 35 ? 42 : 35;
    const remaining = totalCells - days.length;
    for (let dayNum = 1; dayNum <= remaining; dayNum++) {
      const d = new Date(year, month + 1, dayNum);
      days.push({
        dateStr: getLocalDateString(d),
        dayNum,
        isCurrentMonth: false
      });
    }

    return days;
  }, [calendarMonth]);

  // Filter appointments for selected date & search query
  const filteredSchedule = useMemo(() => {
    const listForDate = reservationsByDate[selectedDateStr] || [];
    if (!searchQuery.trim()) return listForDate;
    const q = searchQuery.toLowerCase();
    return listForDate.filter((r) => {
      const pName = (r.name || r.customer_name || "").toLowerCase();
      const sName = (r.service || r.service_name || "").toLowerCase();
      const rName = (r.room || r.room_name || "").toLowerCase();
      const phone = (r.phone || "").toLowerCase();
      return pName.includes(q) || sName.includes(q) || rName.includes(q) || phone.includes(q);
    });
  }, [reservationsByDate, selectedDateStr, searchQuery]);

  // Quick stats summary (Properly contextualized for Calendar Month vs Queue List Date)
  const stats = useMemo(() => {
    let list = reservations;
    if (scheduleViewMode === "calendar") {
      // Month view stats
      const currentMonthKey = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, "0")}`;
      list = reservations.filter((r) => (r.date || "").startsWith(currentMonthKey));
    } else {
      // Queue List view stats: filter by selectedDateStr
      list = reservationsByDate[selectedDateStr] || [];
    }
    const total = list.length;
    const completed = list.filter((r) => r.status === "completed" || r.status === "done").length;
    const inProgress = list.filter((r) => r.status === "started" || r.status === "in-progress").length;
    const upcoming = list.filter((r) => ["pending", "approved", "confirmed", "arrived"].includes(r.status)).length;
    return { total, completed, inProgress, upcoming };
  }, [reservations, scheduleViewMode, calendarMonth, selectedDateStr, reservationsByDate]);

  // Open Schedule Details Drawer Modal
  const handleOpenScheduleModal = (booking: any) => {
    setScheduleModalBooking(booking);
  };

  // Add Product to Session Consumables
  const handleAddProductToSession = () => {
    if (!selectedProductId) return;
    const prod = productsList.find((p) => p.id === selectedProductId);
    if (!prod) return;

    const unitPrice = Number(prod.price || prod.unit_price || prod.selling_price || 0);
    const total = unitPrice * selectedProductQty;

    setUsedProducts((prev) => [
      ...prev,
      {
        id: prod.id,
        name: prod.name,
        qty: selectedProductQty,
        unitPrice,
        total
      }
    ]);
    setSelectedProductId("");
    setSelectedProductQty(1);
  };

  const handleRemoveProductFromSession = (idx: number) => {
    setUsedProducts((prev) => prev.filter((_, i) => i !== idx));
  };

  // Subtotals
  // RISK-056: activeSessionBooking is populated straight from GET /api/reservations (mapRow shape)
  // or a raw Supabase realtime row — neither ever carries a `.price`/`.total_price`/`.amount`
  // field. Those only appear locally after handleChangePrimaryService() sets them as a side
  // effect of switching the service dropdown. Until a doctor actually touches that dropdown,
  // this fell straight to `|| 0`, silently dropping the reserved service's real price from the
  // completed invoice (e.g. a 110 EGP Therapeutic Laser session invoiced for 0 + whatever
  // products/add-ons were logged). Fall back to looking the price up from the booking's own
  // service id via servicesList, same source handleChangePrimaryService already uses.
  const bookingServiceId =
    activeSessionBooking?.serviceId ??
    activeSessionBooking?.service_id ??
    (Array.isArray(activeSessionBooking?.serviceIds) ? activeSessionBooking.serviceIds[0] : undefined) ??
    (Array.isArray(activeSessionBooking?.service_ids) ? activeSessionBooking.service_ids[0] : undefined);
  const bookingServiceFromList = servicesList.find((s) => String(s.id) === String(bookingServiceId));
  const baseBookingPrice = Number(
    activeSessionBooking?.price ||
    activeSessionBooking?.total_price ||
    activeSessionBooking?.amount ||
    activeSessionBooking?.services?.price ||
    bookingServiceFromList?.price ||
    0
  );
  const productsSubtotal = usedProducts.reduce((sum, item) => sum + item.total, 0);
  const extraPulsesSubtotal = extraPulsesCount * pricePerPulse;
  const additionalServicesSubtotal = additionalServices.reduce((sum, item) => sum + item.price, 0);
  const updatedInvoiceTotal = baseBookingPrice + additionalServicesSubtotal + productsSubtotal + extraPulsesSubtotal;

  // Change Primary Service for Active Session or Drawer Booking
  const handleChangePrimaryService = async (targetBooking: any, newServiceId: string) => {
    if (!targetBooking || !newServiceId) return;
    const newService = servicesList.find((s) => String(s.id) === String(newServiceId));
    if (!newService) return;

    const newServiceName = newService.en || newService.name || newService.title || newService.name_en || newService.ar || "Clinical Service";
    const newServicePrice = Number(newService.price || 0);

    const updatedBooking = {
      ...targetBooking,
      service: newServiceName,
      service_name: newServiceName,
      service_id: newService.id,
      price: newServicePrice,
      total_price: newServicePrice
    };

    if (activeSessionBooking && String(activeSessionBooking.id) === String(targetBooking.id)) {
      setActiveSessionBooking(updatedBooking);
    }
    if (scheduleModalBooking && String(scheduleModalBooking.id) === String(targetBooking.id)) {
      setScheduleModalBooking(updatedBooking);
    }

    try {
      const headers = await getAuthHeaders();
      await fetch(`/api/reservations?id=${encodeURIComponent(targetBooking.id)}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          service: newServiceName,
          service_name: newServiceName,
          service_id: newService.id,
          price: newServicePrice
        })
      });
      fetchDoctorReservations(true);
    } catch (err) {
      console.error("Error updating primary booking service:", err);
    }
  };

  // Save Medical Record Intake
  const handleSaveMedicalRecord = async (customData?: any) => {
    if (customData && typeof customData.preventDefault === "function") {
      customData.preventDefault();
    }
    const targetBooking = activeSessionBooking || scheduleModalBooking;
    if (!targetBooking) return;
    const custId = resolvedCustomerId || targetBooking.customer_id || targetBooking.customerId || targetBooking.id;

    setSavingMedicalRecord(true);
    try {
      const headers = await getAuthHeaders();
      const payload: any = {
        customer_id: custId,
        patient_name: targetBooking.name || targetBooking.customer_name || "Patient",
        skin_type: customData?.skin_type || formSkinType,
        allergies: customData?.allergies || formAllergies,
        medication_details: customData?.medication_details || formMedicationDetails,
        medical_conditions_details: customData?.medical_conditions_details || formMedicalConditionsDetails,
        previous_treatments_details: customData?.previous_treatments_details || formPreviousTreatmentsDetails
      };

      if (customData && typeof customData === "object" && !customData.nativeEvent) {
        if (customData.template_id) payload.template_id = customData.template_id;
        if (customData.responses) payload.responses = customData.responses;
      }

      const res = await fetch("/api/medical-records", {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        const savedRecord = data.medicalRecord || data.form || data;
        setMedicalRecord(savedRecord);
        setShowMedicalForm(false);
      } else {
        const err = await res.json().catch(() => ({}));
        console.error("Error saving medical record:", err);
      }
    } catch (err: any) {
      console.error("Error saving medical record:", err);
    } finally {
      setSavingMedicalRecord(false);
    }
  };

  // Save Doctor Clinical Notes
  const handleSaveClinicalNote = async (targetBooking: any) => {
    if (!targetBooking) return;

    setSavingNote(true);
    let sessionAddonsSummary = "";
    if (additionalServices.length > 0) {
      sessionAddonsSummary += `\n[Additional Services Used]: ${additionalServices.map((s) => `${s.name} (Qty: 1 x ${s.price} EGP = ${s.price} EGP)`).join(", ")}`;
    }
    if (usedProducts.length > 0) {
      sessionAddonsSummary += `\n[Products Used During Session]: ${usedProducts.map((p) => `${p.name} (Qty: ${p.qty} x ${p.unitPrice} EGP = ${p.total} EGP)`).join(", ")}`;
    }
    if (extraPulsesCount > 0 && selectedDeviceId) {
      const devObj = devicesList.find((d) => d.id === selectedDeviceId);
      sessionAddonsSummary += `\n[Extra Device Pulses]: ${devObj?.name || 'Device'} — ${extraPulsesCount} pulses @ ${pricePerPulse} EGP/pulse (+${extraPulsesSubtotal} EGP)`;
    }
    if (additionalServicesSubtotal + productsSubtotal + extraPulsesSubtotal > 0) {
      sessionAddonsSummary += `\n[Invoice Total Updated]: ${updatedInvoiceTotal} EGP (Base: ${baseBookingPrice} EGP + Services: ${additionalServicesSubtotal} EGP + Consumables: ${productsSubtotal + extraPulsesSubtotal} EGP)`;
    }

    const fullNotes = (clinicalNote || "") + sessionAddonsSummary;

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/reservations?id=${encodeURIComponent(targetBooking.id)}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          notes: fullNotes
        })
      });

      if (res.ok) {
        alert("Doctor clinical notes saved successfully!");
        fetchDoctorReservations();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || err.message || "Failed to save clinical note.");
      }
    } catch (err: any) {
      console.error("Error saving clinical note:", err);
      alert(err.message || "Error saving clinical note.");
    } finally {
      setSavingNote(false);
    }
  };

  // DEC-042: writes real reservation_products rows for everything accumulated in local session
  // state (products, additional services, extra device pulses) so writeCheckoutInvoice
  // (src/app/api/reservations/route.ts) can fold them into real invoice_lines when the completing
  // PATCH below flips status to 'completed'. Must resolve before that PATCH fires -- it only reads
  // reservation_products rows that already exist at the moment of the status transition. The
  // notes-text summary built further down is kept alongside this, unchanged -- a human-readable
  // audit trail and a safety net for the regex-based display fallback (RISK-057), not replaced.
  // Failures here are logged, not thrown -- a doctor completing a session must not be blocked by
  // this new write path failing; the pre-existing amountLeft/notes PATCH is still the number that
  // matters to the patient's balance.
  const persistSessionLineItems = async (targetBooking: any, pulsesToDeduct: number, deviceName: string) => {
    const headers = await getAuthHeaders();
    const reservationId = targetBooking?.id || targetBooking?.booking_id || targetBooking?.bookingId;
    if (!reservationId) return;

    const writes: Promise<any>[] = [];
    for (const p of usedProducts) {
      writes.push(
        fetch("/api/reservation-products", {
          method: "POST",
          headers,
          body: JSON.stringify({
            reservationId,
            lineType: "product",
            productId: p.id,
            description: p.name,
            qty: p.qty,
            unitPrice: p.unitPrice,
            addedByRole: "doctor_session",
          }),
        })
      );
    }
    for (const s of additionalServices) {
      const realServiceId = s.serviceId || (typeof s.id === 'number' && s.id < 1000000 ? s.id : null);
      writes.push(
        fetch("/api/reservation-products", {
          method: "POST",
          headers,
          body: JSON.stringify({
            reservationId,
            lineType: "additional_service",
            serviceId: realServiceId ? Number(realServiceId) : null,
            description: s.name,
            qty: 1,
            unitPrice: s.price,
            addedByRole: "doctor_session",
          }),
        })
      );
    }
    if (pulsesToDeduct > 0) {
      writes.push(
        fetch("/api/reservation-products", {
          method: "POST",
          headers,
          body: JSON.stringify({
            reservationId,
            lineType: "device_pulses",
            description: `${deviceName} — ${pulsesToDeduct} pulses`,
            qty: pulsesToDeduct,
            unitPrice: pricePerPulse,
            addedByRole: "doctor_session",
          }),
        })
      );
    }

    if (writes.length === 0) return;
    const results = await Promise.allSettled(writes);
    const failed = results.filter((r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok));
    if (failed.length > 0) {
      console.error(`persistSessionLineItems: ${failed.length}/${writes.length} reservation_products writes failed for reservation ${reservationId}`);
    }
  };

  // Complete Treatment Session
  const handleCompleteTreatment = async (targetBooking: any, overrideSessionPulses?: number) => {
    if (!targetBooking) return;

    const custId = resolvedCustomerId || targetBooking.customer_id || targetBooking.customerId || targetBooking.id;
    const phone = targetBooking.phone || targetBooking.customer_phone;
    const name = (targetBooking.name || targetBooking.customer_name || "").toLowerCase().trim();

    // Verify if patient is a first-visit patient without prior medical record
    const pastCompletedVisits = reservations.filter((r) => {
      if (String(r.id) === String(targetBooking.id)) return false;
      const isFinished = r.status === "completed" || r.status === "done";
      if (!isFinished) return false;

      const rCustId = r.customer_id || r.customerId;
      const rPhone = r.phone || r.customer_phone;
      const rName = (r.name || r.customer_name || "").toLowerCase().trim();

      if (custId && rCustId && String(custId) === String(rCustId)) return true;
      if (phone && rPhone && phone === rPhone) return true;
      if (name && rName && name === rName) return true;
      return false;
    });

    const isFirstVisitPatient = !medicalRecord && pastCompletedVisits.length === 0;

    // Strict guard: Block completion if first visit patient has no medical record intake
    if (isFirstVisitPatient && !medicalRecord) {
      if (formSkinType || formAllergies || formMedicationDetails || formMedicalConditionsDetails || formPreviousTreatmentsDetails) {
        try {
          const headers = await getAuthHeaders();
          const medRes = await fetch("/api/medical-records", {
            method: "POST",
            headers,
            body: JSON.stringify({
              customer_id: custId,
              patient_name: targetBooking.name || targetBooking.customer_name || "Patient",
              skin_type: formSkinType || "Normal",
              allergies: formAllergies,
              medication_details: formMedicationDetails,
              medical_conditions_details: formMedicalConditionsDetails,
              previous_treatments_details: formPreviousTreatmentsDetails
            })
          });
          if (medRes.ok) {
            const mData = await medRes.json();
            setMedicalRecord(mData.form || mData.medicalRecord || mData);
          } else {
            alert("Cannot complete treatment: Medical record intake is strictly required for first-visit patients. Please complete and save the intake form.");
            setShowMedicalForm(true);
            return;
          }
        } catch (e) {
          alert("Cannot complete treatment: Medical record intake is required for first-visit patients. Please save the intake form first.");
          setShowMedicalForm(true);
          return;
        }
      } else {
        alert("Cannot complete treatment: Medical record intake is strictly required for first-visit patients. Please complete and save the intake form before ending the session.");
        setShowMedicalForm(true);
        return;
      }
    }

    // 2. Deduct Used Products from Inventory Stock DB via /api/inventory/products/sales
    if (usedProducts && usedProducts.length > 0) {
      try {
        const headers = await getAuthHeaders();
        for (const item of usedProducts) {
          const prodId = item.id || (item as any).productId;
          if (prodId) {
            await fetch("/api/inventory/products/sales", {
              method: "POST",
              headers,
              body: JSON.stringify({
                product_id: prodId,
                product_name: item.name,
                quantity: Number(item.qty) || 1,
                unit_price: Number(item.unitPrice) || 0,
                total_amount: Number(item.total) || 0,
                customer_id: targetBooking.customer_id || targetBooking.customerId || "",
                customer_name: targetBooking.name || targetBooking.customer_name || "Patient",
                customer_mobile: targetBooking.phone || targetBooking.customer_phone || "N/A",
                notes: `Consumable deducted during clinical session (Booking #${targetBooking.id})`
              })
            });
          }
        }
      } catch (e) {
        console.error("Error deducting used products from inventory stock:", e);
      }
    }

    // 3. Deduct Device Pulses from DB via PUT /api/inventory/devices (Uses Total Session Pulses)
    const pulsesToDeduct = Number(overrideSessionPulses || extraPulsesCount || 0);
    if (selectedDeviceId && pulsesToDeduct > 0) {
      try {
        const headers = await getAuthHeaders();
        const devObj = devicesList.find((d) => String(d.id) === String(selectedDeviceId));
        if (devObj) {
          const currentPulses = Number(devObj.current_pulse_count || devObj.total_pulses || 0);
          const newPulseCount = currentPulses + pulsesToDeduct;
          await fetch("/api/inventory/devices", {
            method: "PUT",
            headers,
            body: JSON.stringify({
              id: devObj.id,
              current_pulse_count: newPulseCount,
              notes: `Session pulse usage for ${targetBooking.name || 'Patient'} (${pulsesToDeduct} pulses deducted)`
            })
          });
        }
      } catch (e) {
        console.error("Error updating device pulses in DB:", e);
      }
    }

    let sessionAddonsSummary = "";
    if (additionalServices.length > 0) {
      sessionAddonsSummary += `\n[Additional Services Used]: ${additionalServices.map((s) => `${s.name} (Qty: 1 x ${s.price} EGP = ${s.price} EGP)`).join(", ")}`;
    }
    if (usedProducts.length > 0) {
      sessionAddonsSummary += `\n[Products Used During Session]: ${usedProducts.map((p) => `${p.name} (Qty: ${p.qty} x ${p.unitPrice} EGP = ${p.total} EGP)`).join(", ")}`;
    }
    if (pulsesToDeduct > 0 && selectedDeviceId) {
      const devObj = devicesList.find((d) => String(d.id) === String(selectedDeviceId));
      sessionAddonsSummary += `\n[Device Pulses Deducted]: ${devObj?.name || 'Device'} — ${pulsesToDeduct} total session pulses deducted`;
    }
    if (additionalServicesSubtotal + productsSubtotal + extraPulsesSubtotal > 0) {
      sessionAddonsSummary += `\n[Invoice Total Updated]: ${updatedInvoiceTotal} EGP (Base: ${baseBookingPrice} EGP + Services: ${additionalServicesSubtotal} EGP + Consumables: ${productsSubtotal + extraPulsesSubtotal} EGP)`;
    }

    const finalNotes = (clinicalNote || "") + sessionAddonsSummary;

    const bookingTargetId = targetBooking?.id || targetBooking?.booking_id || targetBooking?.bookingId || targetBooking?._id || targetBooking?.reservation_id;
    if (!bookingTargetId) {
      alert("Booking ID is missing. Cannot complete treatment session.");
      return;
    }

    try {
      const deviceNameForPulses = devicesList.find((d) => String(d.id) === String(selectedDeviceId))?.name || "Device";
      await persistSessionLineItems({ ...targetBooking, id: bookingTargetId }, pulsesToDeduct, deviceNameForPulses);
    } catch (e) {
      console.error("persistSessionLineItems threw (non-fatal, continuing to complete treatment):", e);
    }

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/reservations?id=${encodeURIComponent(bookingTargetId)}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          id: bookingTargetId,
          status: "completed",
          notes: finalNotes,
          amountLeft: updatedInvoiceTotal - Number(targetBooking.amountPaid ?? 0)
        })
      });

      if (res.ok) {
        alert("Session completed successfully! Product stock & device pulses deducted.");
        setReservations((prev) =>
          prev.map((r) =>
            String(r.id) === String(bookingTargetId)
              ? {
                  ...r,
                  status: "completed",
                  notes: finalNotes,
                  amountLeft: updatedInvoiceTotal - Number(targetBooking.amountPaid ?? 0)
                }
              : r
          )
        );
        setActiveSessionBooking(null);
        setScheduleModalBooking(null);
        setUsedProducts([]);
        setAdditionalServices([]);
        setExtraPulsesCount(0);
        setSelectedDeviceId("");
        setClinicalNote("");
        setActiveTab("schedule");
        await fetchDoctorReservations(true);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || err.message || "Failed to complete treatment session.");
      }
    } catch (err: any) {
      console.error("Error completing session:", err);
      alert(err.message || "Error completing session.");
    }
  };

  return (
    <div className="h-screen w-full bg-[#FBFBF9] text-[#1F251A] font-sans flex flex-col md:flex-row overflow-hidden" dir={lang === "ar" ? "rtl" : "ltr"}>
      {/* SIDEBAR NAVIGATION */}
      <DoctorSidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setSelectedPatientHistory(null);
          setActiveTab(tab);
        }}
        doctorName={doctorName}
        doctorEmail={doctorEmail}
        doctorPatientsCount={doctorPatientsList.length}
        receptionistStartedSession={!!receptionistStartedSession}
        activeSessionBooking={activeSessionBooking}
        loading={loading}
        t={t}
        lang={lang}
        setLang={setLang}
        onFetchReservations={fetchDoctorReservations}
        onLogout={onLogout}
      />

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 w-full h-full overflow-y-auto px-6 md:px-8 py-6 animate-fadeIn flex flex-col min-w-0">
        {/* TAB 1: SCHEDULE VIEW */}
        {activeTab === "schedule" && (
          <DoctorScheduleTab
            selectedDateStr={selectedDateStr}
            setSelectedDateStr={setSelectedDateStr}
            todayStr={todayStr}
            yesterdayStr={yesterdayStr}
            tomorrowStr={tomorrowStr}
            lang={lang}
            setLang={setLang}
            scheduleViewMode={scheduleViewMode}
            setScheduleViewMode={setScheduleViewMode}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            calendarMonth={calendarMonth}
            handlePrevCalendarMonth={handlePrevCalendarMonth}
            handleTodayCalendarMonth={handleTodayCalendarMonth}
            handleNextCalendarMonth={handleNextCalendarMonth}
            calendarDaysList={calendarDaysList}
            reservationsByDate={reservationsByDate}
            stats={stats}
            filteredSchedule={filteredSchedule}
            handleOpenScheduleModal={handleOpenScheduleModal}
            t={t}
          />
        )}

        {/* TAB 2: ONGOING SESSION VIEW */}
        {activeTab === "ongoing" && (
          <DoctorOngoingSessionTab
            activeSessionBooking={activeSessionBooking}
            handleCompleteTreatment={handleCompleteTreatment}
            medicalRecord={medicalRecord}
            medicalRecordLoading={medicalRecordLoading}
            showMedicalForm={showMedicalForm}
            setShowMedicalForm={setShowMedicalForm}
            formSkinType={formSkinType}
            setFormSkinType={setFormSkinType}
            formAllergies={formAllergies}
            setFormAllergies={setFormAllergies}
            formMedicationDetails={formMedicationDetails}
            setFormMedicationDetails={setFormMedicationDetails}
            formMedicalConditionsDetails={formMedicalConditionsDetails}
            setFormMedicalConditionsDetails={setFormMedicalConditionsDetails}
            formPreviousTreatmentsDetails={formPreviousTreatmentsDetails}
            setFormPreviousTreatmentsDetails={setFormPreviousTreatmentsDetails}
            savingMedicalRecord={savingMedicalRecord}
            handleSaveMedicalRecord={handleSaveMedicalRecord}
            clinicalNote={clinicalNote}
            setClinicalNote={setClinicalNote}
            savingNote={savingNote}
            handleSaveClinicalNote={handleSaveClinicalNote}
            productsList={productsList}
            selectedProductId={selectedProductId}
            setSelectedProductId={setSelectedProductId}
            selectedProductQty={selectedProductQty}
            setSelectedProductQty={setSelectedProductQty}
            handleAddProductToSession={handleAddProductToSession}
            handleRemoveProductFromSession={handleRemoveProductFromSession}
            setActiveTab={setActiveTab}
            usedProducts={usedProducts}
            devicesList={devicesList}
            servicesList={servicesList}
            handleChangePrimaryService={handleChangePrimaryService}
            selectedDeviceId={selectedDeviceId}
            setSelectedDeviceId={setSelectedDeviceId}
            extraPulsesCount={extraPulsesCount}
            setExtraPulsesCount={setExtraPulsesCount}
            pricePerPulse={pricePerPulse}
            setPricePerPulse={setPricePerPulse}
            baseBookingPrice={baseBookingPrice}
            productsSubtotal={productsSubtotal}
            extraPulsesSubtotal={extraPulsesSubtotal}
            updatedInvoiceTotal={updatedInvoiceTotal}
            onAdditionalServicesChange={setAdditionalServices}
            reservations={reservations}
            t={t}
          />
        )}

        {/* TAB 3: PATIENTS DIRECTORY VIEW */}
        {activeTab === "patients" && (
          <DoctorPatientsTab
            patientSearchQuery={patientSearchQuery}
            setPatientSearchQuery={setPatientSearchQuery}
            filteredPatients={filteredPatientsList}
            doctorPatientsList={doctorPatientsList}
            reservations={reservations}
            setSelectedPatientHistory={setSelectedPatientHistory}
            t={t}
          />
        )}

        {/* TAB 4: ANALYTICS & INSIGHTS VIEW */}
        {activeTab === "analytics" && (
          <DoctorAnalyticsTab analyticsData={analyticsData} doctorPatientsList={doctorPatientsList} reservations={reservations} t={t} />
        )}

        {/* TAB 5: ACCOUNT & SYSTEM SETTINGS VIEW */}
        {activeTab === "settings" && (
          <DoctorSettingsTab t={t} />
        )}

        {/* TAB 6: SECURITY & PROFILE VIEW */}
        {activeTab === "profile" && (
          <UserProfileView
            user={{
              id: doctorDbId || providerRecord?.id,
              name: doctorName || providerRecord?.name || "Doctor Account",
              email: doctorEmail || providerRecord?.email || "",
              phone: providerRecord?.phone || "",
              address: providerRecord?.address || "",
              role: "Doctor / Specialist",
              branch: providerBranches.length > 0 ? providerBranches.join(", ") : resolvedBranchName,
              branchesList: providerBranches.length > 0 ? providerBranches : [resolvedBranchName],
              department: "Doctor",
              employeeId: doctorDbId ? `DOC-${String(doctorDbId).slice(0, 5).toUpperCase()}` : (providerRecord?.id ? `DOC-${providerRecord.id.slice(0, 5).toUpperCase()}` : "DOC-001"),
              joiningDate: providerRecord?.created_at
                ? new Date(providerRecord.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
                : "—",
              shiftType: providerRecord?.shift || (providerRecord?.working_days_hours ? "Multi-Shift Schedule" : "Day"),
              workingDays: providerRecord?.working_days || null,
              workingHours: providerRecord?.working_hours || null,
              workingDaysHours: providerRecord?.working_days_hours,
              basicSalary: Number(providerRecord?.fixed_salary || providerRecord?.salary || 0),
              bonuses: 0,
              deductions: 0,
              monthlyTarget: Number(providerRecord?.target_amount || providerRecord?.required_target_amount || 0)
            }}
            isDoctorView={true}
            lang={lang}
            t={adminTranslations[lang].userProfile as any}
          />
        )}
      </main>

      {/* MODAL 1: SCHEDULE DETAILS DRAWER */}
      {scheduleModalBooking && (
        <DoctorSessionDrawer
          scheduleModalBooking={scheduleModalBooking}
          setScheduleModalBooking={setScheduleModalBooking}
          selectedDateStr={selectedDateStr}
          medicalRecord={medicalRecord}
          medicalRecordLoading={medicalRecordLoading}
          showMedicalForm={showMedicalForm}
          setShowMedicalForm={setShowMedicalForm}
          formSkinType={formSkinType}
          setFormSkinType={setFormSkinType}
          formAllergies={formAllergies}
          setFormAllergies={setFormAllergies}
          formMedicationDetails={formMedicationDetails}
          setFormMedicationDetails={setFormMedicationDetails}
          formMedicalConditionsDetails={formMedicalConditionsDetails}
          setFormMedicalConditionsDetails={setFormMedicalConditionsDetails}
          formPreviousTreatmentsDetails={formPreviousTreatmentsDetails}
          setFormPreviousTreatmentsDetails={setFormPreviousTreatmentsDetails}
          savingMedicalRecord={savingMedicalRecord}
          handleSaveMedicalRecord={handleSaveMedicalRecord}
          clinicalNote={clinicalNote}
          setClinicalNote={setClinicalNote}
          handleSaveClinicalNote={handleSaveClinicalNote}
          savingNote={savingNote}
          handleCompleteTreatment={handleCompleteTreatment}
          setActiveSessionBooking={setActiveSessionBooking}
          setActiveTab={setActiveTab}
          servicesList={servicesList}
          handleChangePrimaryService={handleChangePrimaryService}
          t={t}
        />
      )}

      {/* MODAL 3: PATIENT HISTORY & VISITS DRAWER */}
      {selectedPatientHistory && (
        <DoctorPatientHistoryDrawer
          selectedPatientHistory={selectedPatientHistory}
          setSelectedPatientHistory={setSelectedPatientHistory}
          handleOpenScheduleModal={handleOpenScheduleModal}
          t={t}
          lang={lang}
          doctorName={doctorName}
          adminRole="doctor"
        />
      )}
    </div>
  );
}
