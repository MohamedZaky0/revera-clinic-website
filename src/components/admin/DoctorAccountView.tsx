"use client";

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { DoctorAccountViewProps, DoctorTab, DoctorPatient, UsedProduct, MedicationItem } from "./doctor/types";
import { doctorTranslations } from "./doctor/translations";
import { parseBookingNotes, getAuthHeaders } from "./doctor/utils";
import DoctorSidebar from "./doctor/DoctorSidebar";
import DoctorScheduleTab from "./doctor/tabs/DoctorScheduleTab";
import DoctorOngoingSessionTab from "./doctor/tabs/DoctorOngoingSessionTab";
import DoctorPatientsTab from "./doctor/tabs/DoctorPatientsTab";
import DoctorAnalyticsTab from "./doctor/tabs/DoctorAnalyticsTab";
import DoctorSettingsTab from "./doctor/tabs/DoctorSettingsTab";
import DoctorProfileTab from "./doctor/tabs/DoctorProfileTab";
import DoctorSessionDrawer from "./doctor/modals/DoctorSessionDrawer";
import DoctorPrescriptionModal from "./doctor/modals/DoctorPrescriptionModal";
import DoctorPatientHistoryDrawer from "./doctor/modals/DoctorPatientHistoryDrawer";

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
  const [reservations, setReservations] = useState<any[]>(initialReservations);
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
        existing.bookings.push(r);
        if (serviceName && !existing.recentServices.includes(serviceName)) {
          existing.recentServices.push(serviceName);
        }
        if (visitDate && visitDate > existing.lastVisitDate) {
          existing.lastVisitDate = visitDate;
        }
      }
    });

    return Array.from(patientMap.values());
  }, [reservations]);

  const filteredPatients = useMemo(() => {
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

  // Derived Analytics Data
  const analyticsData = useMemo(() => {
    let totalRevenue = 0;
    let completedCount = 0;
    let pendingCount = 0;
    let confirmedCount = 0;
    let cancelledCount = 0;
    const serviceBreakdown: Record<string, { count: number; revenue: number }> = {};
    const monthlyRevenue: Record<string, { month: string; revenue: number; count: number }> = {};

    reservations.forEach((r) => {
      const price = Number(r.total_price || r.amount || r.price || 0);
      const status = (r.status || "pending").toLowerCase();
      const serviceName = r.service_name || r.service || (Array.isArray(r.services) ? r.services.join(", ") : "Clinical Session");
      const dateStr = r.date || new Date().toISOString().slice(0, 10);
      const monthKey = dateStr.slice(0, 7);

      if (status === "completed") {
        totalRevenue += price;
        completedCount += 1;

        if (!serviceBreakdown[serviceName]) {
          serviceBreakdown[serviceName] = { count: 0, revenue: 0 };
        }
        serviceBreakdown[serviceName].count += 1;
        serviceBreakdown[serviceName].revenue += price;

        if (!monthlyRevenue[monthKey]) {
          const dateObj = new Date(dateStr + "T00:00:00");
          const monthLabel = isNaN(dateObj.getTime())
            ? monthKey
            : dateObj.toLocaleDateString("en-US", { month: "short", year: "numeric" });
          monthlyRevenue[monthKey] = { month: monthLabel, revenue: 0, count: 0 };
        }
        monthlyRevenue[monthKey].revenue += price;
        monthlyRevenue[monthKey].count += 1;
      } else if (status === "confirmed" || status === "started" || status === "approved") {
        confirmedCount += 1;
      } else if (status === "cancelled" || status === "rejected") {
        cancelledCount += 1;
      } else {
        pendingCount += 1;
      }
    });

    const avgSessionValue = completedCount > 0 ? Math.round(totalRevenue / completedCount) : 0;
    const totalBookings = reservations.length;
    const completionRate = totalBookings > 0 ? Math.round((completedCount / totalBookings) * 100) : 0;

    const topServices = Object.entries(serviceBreakdown)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue);

    const monthlyTrend = Object.values(monthlyRevenue).sort((a, b) => a.month.localeCompare(b.month));

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

  // Date Selector State for Schedule
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }, []);

  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }, []);

  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr);

  // Active Session State (Ongoing Tab)
  const [activeSessionBooking, setActiveSessionBooking] = useState<any | null>(null);
  const [clinicalNote, setClinicalNote] = useState("");
  const [medicalRecord, setMedicalRecord] = useState<any | null>(null);
  const [medicalRecordLoading, setMedicalRecordLoading] = useState(false);
  const [resolvedCustomerId, setResolvedCustomerId] = useState<string | null>(null);
  const [savingNote, setSavingNote] = useState(false);

  // Consumables & Devices Inventory State
  const [productsList, setProductsList] = useState<any[]>([]);
  const [devicesList, setDevicesList] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedProductQty, setSelectedProductQty] = useState<number>(1);
  const [usedProducts, setUsedProducts] = useState<UsedProduct[]>([]);

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

  // Prescription Modal State
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [rxDiagnosis, setRxDiagnosis] = useState("");
  const [rxMedications, setRxMedications] = useState<MedicationItem[]>([
    { name: "", dosage: "", frequency: "", duration: "" }
  ]);
  const [rxGeneralNotes, setRxGeneralNotes] = useState("");
  const [savingRx, setSavingRx] = useState(false);

  // Password Update State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Fetch inventory products & devices on mount
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const headers = await getAuthHeaders();
        const [prodRes, devRes] = await Promise.all([
          fetch("/api/inventory/products", { headers }),
          fetch("/api/inventory/devices", { headers })
        ]);
        if (prodRes.ok) {
          const pData = await prodRes.json();
          setProductsList(Array.isArray(pData) ? pData : pData.products || []);
        }
        if (devRes.ok) {
          const dData = await devRes.json();
          setDevicesList(Array.isArray(dData) ? dData : dData.devices || []);
        }
      } catch (err) {
        console.error("Error loading doctor inventory:", err);
      }
    };
    fetchInventory();
  }, []);

  // Fetch Doctor Reservations from DB
  const fetchDoctorReservations = async () => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorReservations();
  }, [doctorDbId, doctorName]);

  // Real-time Subscriptions for Started Sessions & Bookings
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

            if (updated.status === "started" && (!activeSessionBooking || activeSessionBooking.status === "completed")) {
              setActiveSessionBooking(updated);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeSessionBooking]);

  // Receptionist Started Session Auto-Detect
  const receptionistStartedSession = useMemo(() => {
    return reservations.find(
      (r) =>
        (r.status === "started" || r.status === "in-progress") &&
        r.status !== "completed"
    );
  }, [reservations]);

  useEffect(() => {
    if (receptionistStartedSession && (!activeSessionBooking || activeSessionBooking.id !== receptionistStartedSession.id)) {
      setActiveSessionBooking(receptionistStartedSession);
    }
  }, [receptionistStartedSession, activeSessionBooking]);

  // Load Patient Medical Record whenever target booking changes
  const targetBookingForMedicalRecord = activeSessionBooking || scheduleModalBooking;

  useEffect(() => {
    if (!targetBookingForMedicalRecord) {
      setMedicalRecord(null);
      setResolvedCustomerId(null);
      return;
    }

    const loadMedicalRecord = async () => {
      setMedicalRecordLoading(true);
      try {
        let custId = targetBookingForMedicalRecord.customer_id || targetBookingForMedicalRecord.customerId;
        const custPhone = targetBookingForMedicalRecord.phone || targetBookingForMedicalRecord.customer_phone;
        const headers = await getAuthHeaders();

        if (!custId && custPhone) {
          const custRes = await fetch(`/api/customers?phone=${encodeURIComponent(custPhone)}`, { headers });
          if (custRes.ok) {
            const custData = await custRes.json();
            const matchingCust = Array.isArray(custData) ? custData[0] : custData.customers?.[0];
            if (matchingCust?.id) {
              custId = matchingCust.id;
            }
          }
        }

        setResolvedCustomerId(custId || null);

        if (custId) {
          const medRes = await fetch(`/api/medical-records?customer_id=${encodeURIComponent(custId)}`, { headers });
          if (medRes.ok) {
            const medData = await medRes.json();
            const record = Array.isArray(medData) ? medData[0] : medData.medicalRecord || medData.record;
            if (record) {
              setMedicalRecord(record);
              setFormSkinType(record.skin_type || "Normal");
              setFormAllergies(record.allergies || "");
              setFormMedicationDetails(record.medication_details || "");
              setFormMedicalConditionsDetails(record.medical_conditions_details || "");
              setFormPreviousTreatmentsDetails(record.previous_treatments_details || "");
              setShowMedicalForm(false);
            } else {
              setMedicalRecord(null);
              setShowMedicalForm(true);
            }
          }
        } else {
          setMedicalRecord(null);
          setShowMedicalForm(true);
        }
      } catch (err) {
        console.error("Error loading medical record:", err);
      } finally {
        setMedicalRecordLoading(false);
      }
    };

    loadMedicalRecord();
  }, [targetBookingForMedicalRecord]);

  // Load existing Doctor Notes into editor
  useEffect(() => {
    const target = activeSessionBooking || scheduleModalBooking;
    if (target) {
      const parsed = parseBookingNotes(target.notes || "");
      setClinicalNote(parsed.cleanDoctorNote);
    } else {
      setClinicalNote("");
    }
    setUsedProducts([]);
    setSelectedProductId("");
    setSelectedProductQty(1);
    setSelectedDeviceId("");
    setExtraPulsesCount(0);
    setPricePerPulse(0);
  }, [activeSessionBooking, scheduleModalBooking]);

  // Calendar Navigation Handlers
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

  // Generate calendar days for month grid
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
        dateStr: d.toISOString().slice(0, 10),
        dayNum,
        isCurrentMonth: false
      });
    }

    // Current month days
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const d = new Date(year, month, dayNum);
      days.push({
        dateStr: d.toISOString().slice(0, 10),
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
        dateStr: d.toISOString().slice(0, 10),
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

  // Quick stats summary
  const stats = useMemo(() => {
    let list = reservations;
    if (scheduleViewMode === "calendar") {
      const currentMonthKey = calendarMonth.toISOString().slice(0, 7);
      list = reservations.filter((r) => (r.date || "").startsWith(currentMonthKey));
    }
    const total = list.length;
    const completed = list.filter((r) => r.status === "completed" || r.status === "done").length;
    const inProgress = list.filter((r) => r.status === "started" || r.status === "in-progress").length;
    const upcoming = list.filter((r) => ["pending", "approved", "confirmed", "arrived"].includes(r.status)).length;
    return { total, completed, inProgress, upcoming };
  }, [reservations, scheduleViewMode, calendarMonth]);

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

  const handleRemoveProductFromSession = (index: number) => {
    setUsedProducts((prev) => prev.filter((_, i) => i !== index));
  };

  // Financial Calculations for Active Session
  const activeBookingTarget = activeSessionBooking || scheduleModalBooking;
  const baseBookingPrice = Number(activeBookingTarget?.total_price || activeBookingTarget?.amount || activeBookingTarget?.price || 0);
  const productsSubtotal = usedProducts.reduce((sum, item) => sum + item.total, 0);
  const extraPulsesSubtotal = extraPulsesCount * pricePerPulse;
  const updatedInvoiceTotal = baseBookingPrice + productsSubtotal + extraPulsesSubtotal;

  // Save Medical Record
  const handleSaveMedicalRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetBooking = activeSessionBooking || scheduleModalBooking;
    if (!targetBooking) return;

    setSavingMedicalRecord(true);
    try {
      const custId = resolvedCustomerId || targetBooking.customer_id || targetBooking.customerId || targetBooking.id;
      const headers = await getAuthHeaders();
      const res = await fetch("/api/medical-records", {
        method: "POST",
        headers,
        body: JSON.stringify({
          customer_id: custId,
          patient_name: targetBooking.name || targetBooking.customer_name || "Patient",
          skin_type: formSkinType,
          allergies: formAllergies,
          medication_details: formMedicationDetails,
          medical_conditions_details: formMedicalConditionsDetails,
          previous_treatments_details: formPreviousTreatmentsDetails
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMedicalRecord(data.medicalRecord || data.record || data);
        setShowMedicalForm(false);
        alert("Patient medical record saved successfully!");
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || err.message || "Failed to save medical record.");
      }
    } catch (err: any) {
      console.error("Error saving medical record:", err);
      alert(err.message || "Error saving medical record.");
    } finally {
      setSavingMedicalRecord(false);
    }
  };

  // Save Clinical Note only
  const handleSaveClinicalNote = async (targetBooking: any) => {
    if (!targetBooking) return;
    setSavingNote(true);
    try {
      const parsedOld = parseBookingNotes(targetBooking.notes || "");
      let fullNotes = clinicalNote.trim();
      if (parsedOld.instaPayLog) fullNotes += `\n${parsedOld.instaPayLog}`;
      if (parsedOld.productsLog) fullNotes += `\n${parsedOld.productsLog}`;
      if (parsedOld.invoiceLog) fullNotes += `\n${parsedOld.invoiceLog}`;
      if (parsedOld.extraLogs.length > 0) fullNotes += `\n${parsedOld.extraLogs.join("\n")}`;

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

  // Complete Treatment Session
  const handleCompleteTreatment = async (targetBooking: any) => {
    if (!targetBooking) return;

    if (!medicalRecord) {
      alert("ATTENTION: Patient medical intake record is required on file before completing treatment. Please fill out the medical form.");
      setShowMedicalForm(true);
      return;
    }

    let sessionAddonsSummary = "";
    if (usedProducts.length > 0) {
      sessionAddonsSummary += `\n[Products Used During Session]: ${usedProducts.map((p) => `${p.name} (Qty: ${p.qty} x ${p.unitPrice} EGP = ${p.total} EGP)`).join(", ")}`;
    }
    if (extraPulsesCount > 0 && selectedDeviceId) {
      const devObj = devicesList.find((d) => d.id === selectedDeviceId);
      sessionAddonsSummary += `\n[Extra Device Pulses]: ${devObj?.name || 'Device'} — ${extraPulsesCount} pulses @ ${pricePerPulse} EGP/pulse (+${extraPulsesSubtotal} EGP)`;
    }
    if (productsSubtotal + extraPulsesSubtotal > 0) {
      sessionAddonsSummary += `\n[Invoice Total Updated]: ${updatedInvoiceTotal} EGP (Base: ${baseBookingPrice} EGP + Consumables: ${productsSubtotal + extraPulsesSubtotal} EGP)`;
    }

    const finalNotes = (clinicalNote || "") + sessionAddonsSummary;

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/reservations?id=${encodeURIComponent(targetBooking.id)}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          status: "completed",
          notes: finalNotes,
          amountLeft: updatedInvoiceTotal - Number(targetBooking.amount_paid || 0),
          attachedProducts: usedProducts
        })
      });

      if (res.ok) {
        alert(`Treatment session marked as COMPLETED!\nInvoice Total Updated to: ${updatedInvoiceTotal} EGP`);
        setActiveSessionBooking(null);
        setScheduleModalBooking(null);
        fetchDoctorReservations();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || errData.message || "Failed to complete treatment.");
      }
    } catch (err: any) {
      console.error("Error completing treatment:", err);
      alert(err.message || "Error completing treatment.");
    }
  };

  // Create real prescription in DB
  const handleCreatePrescription = async (e: React.FormEvent, targetBooking: any) => {
    e.preventDefault();
    if (!targetBooking) return;

    const customerId = resolvedCustomerId || targetBooking.customer_id || targetBooking.customerId || targetBooking.id;
    const patientName = targetBooking.name || targetBooking.customer_name || "Patient";

    setSavingRx(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/prescriptions", {
        method: "POST",
        headers,
        body: JSON.stringify({
          customer_id: customerId,
          patient_name: patientName,
          date: new Date().toISOString().slice(0, 10),
          diagnosis: rxDiagnosis,
          medications: rxMedications.filter((m) => m.name.trim() !== ""),
          general_notes: rxGeneralNotes,
          doctor_notes: clinicalNote
        })
      });

      if (res.ok) {
        alert("Digital Prescription created successfully!");
        setShowPrescriptionModal(false);
        setRxDiagnosis("");
        setRxMedications([{ name: "", dosage: "", frequency: "", duration: "" }]);
        setRxGeneralNotes("");
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || err.message || "Failed to create prescription.");
      }
    } catch (err: any) {
      console.error("Error creating prescription:", err);
      alert(err.message || "Error saving prescription.");
    } finally {
      setSavingRx(false);
    }
  };

  return (
    <div className="h-screen w-full bg-[#F4F5F1] text-[#1F251A] font-sans flex flex-col md:flex-row overflow-hidden" dir={lang === "ar" ? "rtl" : "ltr"}>
      {/* SIDEBAR NAVIGATION */}
      <DoctorSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        doctorName={doctorName}
        doctorEmail={doctorEmail}
        doctorPatientsCount={doctorPatientsList.length}
        receptionistStartedSession={!!receptionistStartedSession}
        activeSessionBooking={activeSessionBooking}
        loading={loading}
        t={t}
        onFetchReservations={fetchDoctorReservations}
        onLogout={onLogout}
      />

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 w-full h-full overflow-y-auto px-6 md:px-8 py-6 animate-fadeIn flex flex-col">
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
            setShowPrescriptionModal={setShowPrescriptionModal}
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
            productsList={productsList}
            devicesList={devicesList}
            selectedProductId={selectedProductId}
            setSelectedProductId={setSelectedProductId}
            selectedProductQty={selectedProductQty}
            setSelectedProductQty={setSelectedProductQty}
            usedProducts={usedProducts}
            handleAddProductToSession={handleAddProductToSession}
            handleRemoveProductFromSession={handleRemoveProductFromSession}
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
            clinicalNote={clinicalNote}
            setClinicalNote={setClinicalNote}
            handleSaveClinicalNote={handleSaveClinicalNote}
            savingNote={savingNote}
            setActiveTab={setActiveTab}
          />
        )}

        {/* TAB 3: PATIENTS DIRECTORY VIEW */}
        {activeTab === "patients" && (
          <DoctorPatientsTab
            patientSearchQuery={patientSearchQuery}
            setPatientSearchQuery={setPatientSearchQuery}
            doctorPatientsList={doctorPatientsList}
            filteredPatients={filteredPatients}
            reservations={reservations}
            setSelectedPatientHistory={setSelectedPatientHistory}
          />
        )}

        {/* TAB 4: ANALYTICS & FINANCIAL ANALYSIS VIEW */}
        {activeTab === "analytics" && (
          <DoctorAnalyticsTab
            analyticsData={analyticsData}
            doctorPatientsList={doctorPatientsList}
            reservations={reservations}
          />
        )}

        {/* TAB 5: SETTINGS VIEW */}
        {activeTab === "settings" && <DoctorSettingsTab />}

        {/* TAB 6: DOCTOR PROFILE VIEW */}
        {activeTab === "profile" && (
          <DoctorProfileTab
            doctorName={doctorName}
            doctorEmail={doctorEmail}
            resolvedBranchName={resolvedBranchName}
            newPassword={newPassword}
            setNewPassword={setNewPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
          />
        )}
      </main>

      {/* MODALS & DRAWERS */}
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
        setShowPrescriptionModal={setShowPrescriptionModal}
        handleCompleteTreatment={handleCompleteTreatment}
      />

      <DoctorPrescriptionModal
        showPrescriptionModal={showPrescriptionModal}
        setShowPrescriptionModal={setShowPrescriptionModal}
        targetBooking={activeSessionBooking || scheduleModalBooking}
        rxDiagnosis={rxDiagnosis}
        setRxDiagnosis={setRxDiagnosis}
        rxMedications={rxMedications}
        setRxMedications={setRxMedications}
        rxGeneralNotes={rxGeneralNotes}
        setRxGeneralNotes={setRxGeneralNotes}
        savingRx={savingRx}
        handleCreatePrescription={handleCreatePrescription}
      />

      <DoctorPatientHistoryDrawer
        selectedPatientHistory={selectedPatientHistory}
        setSelectedPatientHistory={setSelectedPatientHistory}
        handleOpenScheduleModal={handleOpenScheduleModal}
      />
    </div>
  );
}
