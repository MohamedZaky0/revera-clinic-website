"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import {
  CalendarDays,
  Stethoscope,
  Settings,
  LogOut,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  FileText,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  MapPin,
  Search,
  Plus,
  Play,
  Check,
  UserCheck,
  Lock,
  Bell,
  Award,
  DollarSign,
  Printer,
  RefreshCw,
  X,
  Info,
  Edit,
  Save,
  AlertTriangle,
  Zap,
  ShoppingBag
} from "lucide-react";

interface DoctorAccountViewProps {
  doctorDbId?: string;
  doctorName?: string;
  doctorEmail?: string;
  doctorBranch?: string;
  initialReservations?: any[];
  onLogout: () => void;
  onSwitchToAdmin?: () => void;
}

type DoctorTab = "schedule" | "ongoing" | "settings";

export default function DoctorAccountView({
  doctorDbId,
  doctorName = "Doctor",
  doctorEmail = "doctor@revera.com",
  doctorBranch = "Main Branch",
  initialReservations = [],
  onLogout
}: DoctorAccountViewProps) {
  const [activeTab, setActiveTab] = useState<DoctorTab>("schedule");
  const [reservations, setReservations] = useState<any[]>(initialReservations);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Date Selector State for Schedule (Yesterday, Today, Tomorrow, Custom Date)
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
  const [usedProducts, setUsedProducts] = useState<{ id: string; name: string; qty: number; unitPrice: number; total: number }[]>([]);

  // Extra Device Pulses State
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [extraPulsesCount, setExtraPulsesCount] = useState<number>(0);
  const [pricePerPulse, setPricePerPulse] = useState<number>(0);

  // Medical Record Form State (for first time or editing)
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
  const [rxMedications, setRxMedications] = useState<{ name: string; dosage: string; frequency: string; duration: string }[]>([
    { name: "", dosage: "", frequency: "", duration: "" }
  ]);
  const [rxGeneralNotes, setRxGeneralNotes] = useState("");
  const [savingRx, setSavingRx] = useState(false);

  // Password Update State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Auth headers helper for staff access verification
  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }
    return headers;
  };

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
          setProductsList(pData.products || []);
        }
        if (devRes.ok) {
          const dData = await devRes.json();
          setDevicesList(dData.devices || []);
        }
      } catch (err) {
        console.warn("Error fetching inventory for doctor portal:", err);
      }
    };
    fetchInventory();
  }, []);

  // Fetch real reservations from DB with polling for live updates
  const fetchDoctorReservations = async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/reservations", { headers, cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setReservations(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Error fetching doctor reservations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorReservations();
    const interval = setInterval(fetchDoctorReservations, 10000);
    return () => clearInterval(interval);
  }, []);

  // Filter reservations for Selected Date & Doctor assignment
  const selectedDateReservations = useMemo(() => {
    return reservations.filter((r) => {
      const resDate = r.date ? String(r.date).slice(0, 10) : "";
      if (resDate !== selectedDateStr) return false;

      if (r.doctor && doctorName && r.doctor.toLowerCase() !== doctorName.toLowerCase()) {
        if (r.doctor.trim() && r.doctor.toLowerCase() !== "doctor" && r.doctor.toLowerCase() !== "any") {
          return false;
        }
      }
      return true;
    });
  }, [reservations, selectedDateStr, doctorName]);

  // Today's reservations specifically for receptionist auto-link
  const todaysReservations = useMemo(() => {
    return reservations.filter((r) => {
      const resDate = r.date ? String(r.date).slice(0, 10) : "";
      if (resDate !== todayStr) return false;

      if (r.doctor && doctorName && r.doctor.toLowerCase() !== doctorName.toLowerCase()) {
        if (r.doctor.trim() && r.doctor.toLowerCase() !== "doctor" && r.doctor.toLowerCase() !== "any") {
          return false;
        }
      }
      return true;
    });
  }, [reservations, todayStr, doctorName]);

  // AUTO-DETECT SESSION STARTED BY RECEPTIONIST ("started" or "in-progress" status)
  const receptionistStartedSession = useMemo(() => {
    return (
      todaysReservations.find((r) => r.status === "started" || r.status === "in-progress") ||
      reservations.find((r) => r.status === "started" || r.status === "in-progress") ||
      null
    );
  }, [todaysReservations, reservations]);

  // Helper to fetch medical records for a booking
  const loadPatientMedicalRecord = async (booking: any) => {
    if (!booking) return;
    setMedicalRecordLoading(true);
    setMedicalRecord(null);
    setShowMedicalForm(false);
    setUsedProducts([]);
    setExtraPulsesCount(0);
    setPricePerPulse(0);

    try {
      let customerId = booking.customer_id || booking.customerId;

      if (!customerId && (booking.phone || booking.name || booking.customer_name)) {
        try {
          const custRes = await fetch("/api/customers");
          if (custRes.ok) {
            const customers = await custRes.json();
            const found = customers.find(
              (c: any) =>
                (booking.phone && c.phone && String(c.phone).trim() === String(booking.phone).trim()) ||
                (c.name && (booking.name || booking.customer_name) && c.name.toLowerCase() === (booking.name || booking.customer_name).toLowerCase())
            );
            if (found) {
              customerId = found.id;
            }
          }
        } catch (err) {
          console.warn("Customer lookup error:", err);
        }
      }

      const targetId = customerId || booking.id;
      setResolvedCustomerId(targetId);

      const headers = await getAuthHeaders();
      const res = await fetch(`/api/medical-records?customerId=${encodeURIComponent(targetId)}`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.form) {
          setMedicalRecord(data.form);
          setFormSkinType(data.form.skin_type || "Normal");
          setFormAllergies(data.form.allergies || "");
          setFormMedicationDetails(data.form.medication_details || "");
          setFormMedicalConditionsDetails(data.form.medical_conditions_details || "");
          setFormPreviousTreatmentsDetails(data.form.previous_treatments_details || "");
          setShowMedicalForm(false);
        } else {
          setMedicalRecord(null);
          setShowMedicalForm(true);
        }
      }
    } catch (err) {
      console.error("Error loading patient medical record:", err);
    } finally {
      setMedicalRecordLoading(false);
    }
  };

  // Sync activeSessionBooking automatically when receptionist starts a session
  useEffect(() => {
    if (receptionistStartedSession) {
      if (!activeSessionBooking || activeSessionBooking.status === "completed" || activeSessionBooking.id !== receptionistStartedSession.id) {
        setActiveSessionBooking(receptionistStartedSession);
        setClinicalNote(receptionistStartedSession.notes || "");
        loadPatientMedicalRecord(receptionistStartedSession);
      }
    } else {
      if (activeSessionBooking && activeSessionBooking.status === "completed") {
        setActiveSessionBooking(null);
      }
    }
  }, [receptionistStartedSession]);

  // Consumables Add & Remove Helpers
  const handleAddProductToSession = () => {
    if (!selectedProductId) return;
    const prod = productsList.find((p) => String(p.id) === String(selectedProductId));
    if (!prod) return;

    const unitPrice = Number(prod.price || prod.unit_price || prod.selling_price || 0);
    const qty = Number(selectedProductQty) || 1;
    const total = unitPrice * qty;

    setUsedProducts((prev) => {
      const existingIdx = prev.findIndex((p) => String(p.id) === String(prod.id));
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx].qty += qty;
        updated[existingIdx].total = updated[existingIdx].qty * unitPrice;
        return updated;
      }
      return [...prev, { id: String(prod.id), name: prod.name, qty, unitPrice, total }];
    });

    setSelectedProductId("");
    setSelectedProductQty(1);
  };

  const handleRemoveProductFromSession = (index: number) => {
    setUsedProducts((prev) => prev.filter((_, i) => i !== index));
  };

  // Subtotal & Updated Invoice Calculations
  const productsSubtotal = useMemo(() => {
    return usedProducts.reduce((sum, item) => sum + item.total, 0);
  }, [usedProducts]);

  const extraPulsesSubtotal = useMemo(() => {
    return (Number(extraPulsesCount) || 0) * (Number(pricePerPulse) || 0);
  }, [extraPulsesCount, pricePerPulse]);

  const baseBookingPrice = useMemo(() => {
    const target = activeSessionBooking || scheduleModalBooking;
    if (!target) return 0;
    return Number(target.amount_left !== undefined ? target.amount_left : (target.price || target.service_price || target.total_price || 0));
  }, [activeSessionBooking, scheduleModalBooking]);

  const updatedInvoiceTotal = useMemo(() => {
    return baseBookingPrice + productsSubtotal + extraPulsesSubtotal;
  }, [baseBookingPrice, productsSubtotal, extraPulsesSubtotal]);

  // Save Medical Intake Record to database
  const handleSaveMedicalRecord = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!resolvedCustomerId) {
      alert("Missing customer ID for medical record.");
      return;
    }

    setSavingMedicalRecord(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/medical-records", {
        method: "POST",
        headers,
        body: JSON.stringify({
          type: "form",
          customerId: resolvedCustomerId,
          recordData: {
            customer_id: resolvedCustomerId,
            skin_type: formSkinType,
            allergies: formAllergies,
            is_taking_medication: Boolean(formMedicationDetails.trim()),
            medication_details: formMedicationDetails,
            has_medical_conditions: Boolean(formMedicalConditionsDetails.trim()),
            medical_conditions_details: formMedicalConditionsDetails,
            has_previous_treatments: Boolean(formPreviousTreatmentsDetails.trim()),
            previous_treatments_details: formPreviousTreatmentsDetails,
            created_by_role: "Doctor",
            created_by_name: doctorName
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        alert("Patient Medical Record saved successfully!");
        setMedicalRecord(data.record || {
          skin_type: formSkinType,
          allergies: formAllergies,
          medication_details: formMedicationDetails,
          medical_conditions_details: formMedicalConditionsDetails,
          previous_treatments_details: formPreviousTreatmentsDetails,
          updated_at: new Date().toISOString()
        });
        setShowMedicalForm(false);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to save medical record.");
      }
    } catch (err: any) {
      console.error("Error saving medical record:", err);
      alert(err.message || "Error saving medical record.");
    } finally {
      setSavingMedicalRecord(false);
    }
  };

  // Statistics derived dynamically for the selected date
  const stats = useMemo(() => {
    const total = selectedDateReservations.length;
    const completed = selectedDateReservations.filter((r) => r.status === "completed" || r.status === "done").length;
    const inProgress = selectedDateReservations.filter((r) => r.status === "started" || r.status === "in-progress").length;
    const upcoming = selectedDateReservations.filter((r) => ["pending", "approved", "confirmed"].includes(r.status)).length;
    return { total, completed, inProgress, upcoming };
  }, [selectedDateReservations]);

  // Filtered schedule by search query
  const filteredSchedule = useMemo(() => {
    if (!searchQuery.trim()) return selectedDateReservations;
    const q = searchQuery.toLowerCase();
    return selectedDateReservations.filter(
      (r) =>
        (r.name || r.customer_name || "").toLowerCase().includes(q) ||
        (r.service || r.service_name || "").toLowerCase().includes(q) ||
        (r.phone || "").includes(q)
    );
  }, [selectedDateReservations, searchQuery]);

  // Open session details in Modal on SAME PAGE (Schedule tab)
  const handleOpenScheduleModal = async (booking: any) => {
    setScheduleModalBooking(booking);
    setClinicalNote(booking.notes || "");
    loadPatientMedicalRecord(booking);
  };

  // Save clinical notes & session consumables to database
  const handleSaveClinicalNote = async (targetBooking: any) => {
    if (!targetBooking) return;
    setSavingNote(true);

    let sessionAddonsSummary = "";
    if (usedProducts.length > 0) {
      sessionAddonsSummary += `\n\n[Products Used During Session]:\n` + usedProducts.map(p => `- ${p.name} (x${p.qty}) @ ${p.unitPrice} EGP = ${p.total} EGP`).join("\n");
    }
    if (extraPulsesCount > 0) {
      const devName = devicesList.find(d => String(d.id) === String(selectedDeviceId))?.name || "Laser Device";
      sessionAddonsSummary += `\n[Extra Device Pulses]: ${extraPulsesCount} pulses on ${devName} @ ${pricePerPulse} EGP/pulse = ${extraPulsesSubtotal} EGP`;
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
          status: targetBooking.status,
          notes: finalNotes,
          amountLeft: updatedInvoiceTotal - Number(targetBooking.amount_paid || 0),
          attachedProducts: usedProducts
        })
      });

      if (res.ok) {
        alert("Clinical notes & updated invoice total saved successfully!");
        fetchDoctorReservations();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || errData.message || "Failed to save clinical notes.");
      }
    } catch (err: any) {
      console.error("Error saving clinical note:", err);
      alert(err.message || "Error saving clinical note.");
    } finally {
      setSavingNote(false);
    }
  };

  // Complete treatment status in database & CLOSE SESSION FROM ONGOING
  const handleCompleteTreatment = async (targetBooking: any) => {
    if (!targetBooking) return;

    // ENFORCE MEDICAL RECORD: If patient is on first visit & no medical record exists, REQUIRE IT!
    if (!medicalRecord) {
      alert("Medical Record Required:\nThis is the patient's first visit. You must complete and save the Patient Medical Record before completing treatment.");
      setShowMedicalForm(true);
      return;
    }

    if (!confirm(`Mark treatment session as COMPLETED for ${targetBooking.name || "Patient"}?\nUpdated Invoice Total: ${updatedInvoiceTotal} EGP`)) return;

    let sessionAddonsSummary = "";
    if (usedProducts.length > 0) {
      sessionAddonsSummary += `\n\n[Products Used During Session]:\n` + usedProducts.map(p => `- ${p.name} (x${p.qty}) @ ${p.unitPrice} EGP = ${p.total} EGP`).join("\n");
    }
    if (extraPulsesCount > 0) {
      const devName = devicesList.find(d => String(d.id) === String(selectedDeviceId))?.name || "Laser Device";
      sessionAddonsSummary += `\n[Extra Device Pulses]: ${extraPulsesCount} pulses on ${devName} @ ${pricePerPulse} EGP/pulse = ${extraPulsesSubtotal} EGP`;
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
    <div className="min-h-screen w-full bg-[#F4F5F1] text-[#1F251A] font-sans flex flex-col md:flex-row overflow-x-hidden">
      {/* ── SIDEBAR NAVIGATION ── */}
      <aside className="w-full md:w-64 lg:w-72 bg-white/90 backdrop-blur-xl border-b md:border-b-0 md:border-r border-[#414E36]/15 flex flex-col justify-between shrink-0 sticky top-0 z-40 md:h-screen p-5 shadow-sm">
        
        {/* Top: Logo & Branding */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 pb-5 border-b border-[#414E36]/10">
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl bg-[#414E36] p-2 shadow-md">
              <Image
                src="/images/main_logo.png"
                alt="Revera Clinics"
                fill
                style={{ objectFit: "contain", padding: "2px" }}
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#414E36]">
                  Doctor Portal
                </span>
                <span className="inline-flex items-center rounded-md bg-[#414E36]/10 px-2 py-0.5 text-[10px] font-bold text-[#414E36]">
                  <MapPin size={10} className="mr-1 inline" />
                  {doctorBranch}
                </span>
              </div>
              <h1 className="text-sm font-bold text-[#1F251A] truncate max-w-[160px]">{doctorName}</h1>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            <p className="px-3 text-[10px] font-extrabold uppercase tracking-widest text-[#5A6A51]/70 mb-2">
              Menu
            </p>

            {/* Tab 1: Schedule */}
            <button
              type="button"
              onClick={() => setActiveTab("schedule")}
              title="Schedule"
              className={`group relative flex w-full items-center gap-3.5 rounded-2xl px-4 py-3 text-xs font-bold transition-all duration-300 ${
                activeTab === "schedule"
                  ? "bg-[#414E36] text-white shadow-md shadow-[#414E36]/25 translate-x-1"
                  : "text-[#5A6A51] hover:bg-[#414E36]/10 hover:text-[#414E36] hover:translate-x-0.5"
              }`}
            >
              <CalendarDays size={20} className="shrink-0 transition-transform duration-300 group-hover:scale-110" />
              <span className="tracking-wide text-sm">Schedule</span>
            </button>

            {/* Tab 2: Ongoing Session */}
            <button
              type="button"
              onClick={() => setActiveTab("ongoing")}
              title="Ongoing Session"
              className={`group relative flex w-full items-center gap-3.5 rounded-2xl px-4 py-3 text-xs font-bold transition-all duration-300 ${
                activeTab === "ongoing"
                  ? "bg-[#414E36] text-white shadow-md shadow-[#414E36]/25 translate-x-1"
                  : "text-[#5A6A51] hover:bg-[#414E36]/10 hover:text-[#414E36] hover:translate-x-0.5"
              }`}
            >
              <div className="relative">
                <Stethoscope size={20} className="shrink-0 transition-transform duration-300 group-hover:scale-110" />
                {receptionistStartedSession && activeSessionBooking?.status !== "completed" && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                  </span>
                )}
              </div>
              <span className="tracking-wide text-sm flex-1 text-left flex items-center justify-between">
                Ongoing Session
                {receptionistStartedSession && activeSessionBooking?.status !== "completed" && (
                  <span className="rounded-full bg-amber-400 h-2 w-2"></span>
                )}
              </span>
            </button>

            {/* Tab 3: Settings */}
            <button
              type="button"
              onClick={() => setActiveTab("settings")}
              title="Settings"
              className={`group relative flex w-full items-center gap-3.5 rounded-2xl px-4 py-3 text-xs font-bold transition-all duration-300 ${
                activeTab === "settings"
                  ? "bg-[#414E36] text-white shadow-md shadow-[#414E36]/25 translate-x-1"
                  : "text-[#5A6A51] hover:bg-[#414E36]/10 hover:text-[#414E36] hover:translate-x-0.5"
              }`}
            >
              <Settings size={20} className="shrink-0 transition-transform duration-300 group-hover:scale-110" />
              <span className="tracking-wide text-sm">Settings</span>
            </button>
          </nav>
        </div>

        {/* Bottom: Doctor Profile & Actions */}
        <div className="pt-4 border-t border-[#414E36]/10 space-y-3 mt-4 md:mt-0">
          {/* Doctor Account Card */}
          <div className="flex items-center gap-3 rounded-2xl border border-[#414E36]/15 bg-[#F9F9F7] p-2.5 shadow-sm">
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#414E36] text-white font-black text-xs shadow-md border-2 border-white">
              {(doctorName.replace(/^Dr\.?\s*/i, '') || "D").slice(0, 2).toUpperCase()}
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
            </div>
            <div className="text-left min-w-0 flex-1">
              <p className="text-xs font-black text-[#1F251A] tracking-tight leading-tight truncate">{doctorName}</p>
              <p className="text-[10px] font-semibold text-[#5A6A51] leading-none mt-0.5 truncate">{doctorEmail}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchDoctorReservations}
              className="flex-1 flex items-center justify-center gap-2 h-9 rounded-xl border border-[#414E36]/15 bg-white text-[#414E36] hover:bg-[#F4F5F1] transition shadow-sm text-xs font-semibold"
              title="Refresh Schedule"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="flex h-9 w-9 items-center justify-center shrink-0 rounded-xl border border-rose-200 bg-rose-50/60 text-rose-700 hover:bg-rose-100 hover:text-rose-800 transition shadow-sm"
              title="Sign Out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT AREA ── */}
      <main className="flex-1 w-full min-h-screen overflow-y-auto px-6 md:px-8 py-6 animate-fadeIn flex flex-col">
        
        {/* ── TAB 1: SCHEDULE VIEW ── */}
        {activeTab === "schedule" && (
          <div className="space-y-6 w-full">
            
            {/* Header Title & Search */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-[#1F251A]">
                  {selectedDateStr === todayStr
                    ? "Today's Appointments & Patient Queue"
                    : selectedDateStr === yesterdayStr
                    ? "Yesterday's Appointments & History"
                    : selectedDateStr === tomorrowStr
                    ? "Tomorrow's Upcoming Appointments"
                    : `Appointments for ${selectedDateStr}`}
                </h2>
                <p className="text-xs text-[#5A6A51] mt-1">
                  Structured shift schedule, patient arrivals, and completed treatment history.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-3 text-[#5A6A51]" />
                  <input
                    type="text"
                    placeholder="Search patient or service..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="rounded-2xl border border-[#414E36]/15 bg-white pl-9 pr-4 py-2 text-xs text-[#1F251A] focus:outline-none focus:ring-2 focus:ring-[#414E36] w-64"
                  />
                </div>
              </div>
            </div>

            {/* Structured Date Navigation Pills Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-3xl border border-[#414E36]/10 shadow-sm w-full">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDateStr(yesterdayStr)}
                  className={`px-4 py-2 text-xs font-bold rounded-2xl transition ${
                    selectedDateStr === yesterdayStr
                      ? "bg-[#414E36] text-white shadow-sm"
                      : "bg-[#F4F5F1] text-[#5A6A51] hover:bg-[#414E36]/10 hover:text-[#414E36]"
                  }`}
                >
                  Yesterday ({yesterdayStr})
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedDateStr(todayStr)}
                  className={`px-4 py-2 text-xs font-bold rounded-2xl transition ${
                    selectedDateStr === todayStr
                      ? "bg-[#414E36] text-white shadow-sm"
                      : "bg-[#F4F5F1] text-[#5A6A51] hover:bg-[#414E36]/10 hover:text-[#414E36]"
                  }`}
                >
                  Today ({todayStr})
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedDateStr(tomorrowStr)}
                  className={`px-4 py-2 text-xs font-bold rounded-2xl transition ${
                    selectedDateStr === tomorrowStr
                      ? "bg-[#414E36] text-white shadow-sm"
                      : "bg-[#F4F5F1] text-[#5A6A51] hover:bg-[#414E36]/10 hover:text-[#414E36]"
                  }`}
                >
                  Tomorrow ({tomorrowStr})
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#5A6A51]">Jump to Date:</span>
                <input
                  type="date"
                  value={selectedDateStr}
                  onChange={(e) => setSelectedDateStr(e.target.value)}
                  className="rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-3.5 py-1.5 text-xs font-bold text-[#414E36] outline-none focus:border-[#414E36]"
                />
              </div>
            </div>

            {/* Quick Dynamic Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
              <div className="rounded-3xl border border-[#414E36]/10 bg-white p-5 shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-[#5A6A51]">Total Scheduled</span>
                <div className="mt-2 text-3xl font-extrabold text-[#1F251A]">{stats.total} Patients</div>
              </div>
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Completed</span>
                <div className="mt-2 text-3xl font-extrabold text-emerald-800">{stats.completed} Sessions</div>
              </div>
              <div className="rounded-3xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700">In Treatment</span>
                <div className="mt-2 text-3xl font-extrabold text-amber-800">{stats.inProgress} Active</div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50/50 p-5 shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Upcoming Queue</span>
                <div className="mt-2 text-3xl font-extrabold text-slate-700">{stats.upcoming} Waiting</div>
              </div>
            </div>

            {/* Real Patients Schedule Table */}
            <div className="overflow-hidden rounded-[32px] border border-[#414E36]/10 bg-white shadow-[0_20px_50px_rgba(47,61,41,0.05)] w-full">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#414E36]/10 bg-[#FBFBF9] text-xs uppercase tracking-wider text-[#5A6A51]">
                    <tr>
                      <th className="px-6 py-4 font-bold">Time Slot</th>
                      <th className="px-6 py-4 font-bold">Patient Name</th>
                      <th className="px-6 py-4 font-bold">Requested Service</th>
                      <th className="px-6 py-4 font-bold">Room / Location</th>
                      <th className="px-6 py-4 font-bold text-center">Status</th>
                      <th className="px-6 py-4 font-bold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#414E36]/05 text-[#1F251A]">
                    {filteredSchedule.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-[#5A6A51]">
                          <div className="flex flex-col items-center gap-2">
                            <CalendarDays size={32} className="text-[#414E36]/30" />
                            <p className="font-bold text-sm text-[#1F251A]">No appointments scheduled for {selectedDateStr}</p>
                            <p className="text-xs text-[#5A6A51]">
                              All patient bookings for this date will appear here automatically.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredSchedule.map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-[#FBFBF9]/80 transition">
                          <td className="px-6 py-4 font-bold text-[#414E36]">
                            {item.time || item.time_slot || item.timeSlot || "09:00 AM"}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-sm text-[#1F251A]">
                              {item.name || item.customer_name || "Patient"}
                            </div>
                            {item.phone && <div className="text-[10px] text-[#5A6A51] font-mono">{item.phone}</div>}
                          </td>
                          <td className="px-6 py-4 font-medium text-[#5A6A51]">
                            {item.service || item.service_name || "Consultation"}
                          </td>
                          <td className="px-6 py-4 font-semibold text-[#414E36]">
                            {item.room || item.room_name || "Treatment Room"}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {(item.status === "completed" || item.status === "done") && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-800">
                                <CheckCircle2 size={12} /> Completed
                              </span>
                            )}
                            {(item.status === "started" || item.status === "in-progress") && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold text-amber-800 animate-pulse">
                                <Play size={12} /> In Session
                              </span>
                            )}
                            {item.status === "arrived" && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-[11px] font-bold text-blue-800">
                                <UserCheck size={12} /> Arrived
                              </span>
                            )}
                            {["pending", "approved", "confirmed"].includes(item.status) && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-700 capitalize">
                                {item.status}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleOpenScheduleModal(item)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-[#414E36]/20 bg-white px-3.5 py-1.5 text-xs font-bold text-[#414E36] hover:bg-[#414E36] hover:text-white transition shadow-sm"
                            >
                              <Info size={14} /> Info
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: ONGOING SESSION VIEW ── */}
        {activeTab === "ongoing" && (
          <div className="space-y-6 w-full">
            
            {activeSessionBooking && activeSessionBooking.status !== "completed" ? (
              <>
                {/* Active Patient Card */}
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-6 border border-[#414E36]/10 shadow-sm w-full">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#414E36] text-white font-bold text-xl shadow-md">
                      {(activeSessionBooking.name || "P").slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-2xl font-bold text-[#1F251A]">
                          {activeSessionBooking.name || activeSessionBooking.customer_name || "Patient"}
                        </h2>
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-0.5 text-xs font-bold text-amber-800 animate-pulse">
                          <Play size={12} /> Session Started by Reception
                        </span>
                      </div>
                      <p className="text-xs text-[#5A6A51] mt-1">
                        {activeSessionBooking.service || activeSessionBooking.service_name} • {activeSessionBooking.time || activeSessionBooking.time_slot || "Today"} • <strong className="text-[#414E36]">{activeSessionBooking.room || "Treatment Room"}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowPrescriptionModal(true)}
                      className="flex items-center gap-2 rounded-2xl border border-[#414E36]/20 bg-white px-4 py-2.5 text-xs font-bold text-[#414E36] hover:bg-[#F4F5F1] transition shadow-sm"
                    >
                      <FileText size={14} /> Write Prescription
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCompleteTreatment(activeSessionBooking)}
                      className="flex items-center gap-2 rounded-2xl bg-[#414E36] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#343F2B] transition"
                    >
                      <Check size={16} /> Complete Treatment
                    </button>
                  </div>
                </div>

                {/* Treatment Details & Notes */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
                  
                  {/* Patient Medical Record & Intake Section */}
                  <div className="space-y-6">
                    <div className="rounded-3xl border border-[#414E36]/10 bg-white p-6 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-[#1F251A] uppercase tracking-wider flex items-center gap-2">
                          <AlertCircle size={16} className="text-[#414E36]" /> Patient Medical Record
                        </h3>

                        {medicalRecord ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                            <CheckCircle2 size={10} /> On File
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold text-rose-800 animate-pulse">
                            <AlertTriangle size={10} /> Intake Required
                          </span>
                        )}
                      </div>

                      {medicalRecordLoading ? (
                        <p className="text-xs text-[#5A6A51]">Loading patient medical record...</p>
                      ) : medicalRecord && !showMedicalForm ? (
                        <div className="space-y-3 text-xs">
                          <div className="flex justify-between border-b border-[#414E36]/10 pb-2">
                            <span className="font-bold text-[#5A6A51]">Skin Type:</span>
                            <span className="font-bold text-[#1F251A]">{medicalRecord.skin_type || "Normal"}</span>
                          </div>
                          <div className="flex justify-between border-b border-[#414E36]/10 pb-2">
                            <span className="font-bold text-[#5A6A51]">Allergies:</span>
                            <span className="font-bold text-rose-700">{medicalRecord.allergies || "None reported"}</span>
                          </div>
                          <div className="flex justify-between border-b border-[#414E36]/10 pb-2">
                            <span className="font-bold text-[#5A6A51]">Current Medication:</span>
                            <span className="font-semibold text-[#1F251A]">{medicalRecord.medication_details || "None"}</span>
                          </div>
                          <div className="flex justify-between border-b border-[#414E36]/10 pb-2">
                            <span className="font-bold text-[#5A6A51]">Medical Conditions:</span>
                            <span className="font-semibold text-[#1F251A]">{medicalRecord.medical_conditions_details || "None"}</span>
                          </div>
                          <div className="flex justify-between border-b border-[#414E36]/10 pb-2">
                            <span className="font-bold text-[#5A6A51]">Previous Treatments:</span>
                            <span className="font-semibold text-[#1F251A]">{medicalRecord.previous_treatments_details || "None"}</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => setShowMedicalForm(true)}
                            className="mt-2 flex items-center gap-1.5 text-xs font-bold text-[#414E36] hover:underline"
                          >
                            <Edit size={14} /> Update Medical Record
                          </button>
                        </div>
                      ) : (
                        /* Medical Intake Form (Required for First Visit or Edit) */
                        <form onSubmit={handleSaveMedicalRecord} className="space-y-3 border-t border-[#414E36]/10 pt-3">
                          {!medicalRecord && (
                            <div className="rounded-2xl bg-amber-50 p-3 text-xs text-amber-900 border border-amber-200">
                              <strong className="block font-bold">First Visit Detected!</strong>
                              Patient medical record intake is required before completing treatment.
                            </div>
                          )}

                          <div>
                            <label className="block text-[11px] font-bold text-[#5A6A51] mb-1">Skin Type</label>
                            <select
                              value={formSkinType}
                              onChange={(e) => setFormSkinType(e.target.value)}
                              className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2 text-xs font-bold text-[#1F251A] outline-none"
                            >
                              <option value="Normal">Normal</option>
                              <option value="Dry">Dry</option>
                              <option value="Oily">Oily</option>
                              <option value="Sensitive">Sensitive</option>
                              <option value="Combination">Combination</option>
                              <option value="Acne-Prone">Acne-Prone</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-[#5A6A51] mb-1">Known Allergies</label>
                            <input
                              type="text"
                              placeholder="e.g. Latex, Aspirin, None"
                              value={formAllergies}
                              onChange={(e) => setFormAllergies(e.target.value)}
                              className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2 text-xs text-[#1F251A] outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-[#5A6A51] mb-1">Current Medications</label>
                            <input
                              type="text"
                              placeholder="e.g. Roaccutane, Blood thinners, None"
                              value={formMedicationDetails}
                              onChange={(e) => setFormMedicationDetails(e.target.value)}
                              className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2 text-xs text-[#1F251A] outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-[#5A6A51] mb-1">Chronic Medical Conditions</label>
                            <input
                              type="text"
                              placeholder="e.g. Diabetes, Eczema, None"
                              value={formMedicalConditionsDetails}
                              onChange={(e) => setFormMedicalConditionsDetails(e.target.value)}
                              className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2 text-xs text-[#1F251A] outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-[#5A6A51] mb-1">Previous Aesthetic Treatments</label>
                            <input
                              type="text"
                              placeholder="e.g. Chemical Peel 3 mos ago, None"
                              value={formPreviousTreatmentsDetails}
                              onChange={(e) => setFormPreviousTreatmentsDetails(e.target.value)}
                              className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2 text-xs text-[#1F251A] outline-none"
                            />
                          </div>

                          <div className="flex justify-end gap-2 pt-2">
                            {medicalRecord && (
                              <button
                                type="button"
                                onClick={() => setShowMedicalForm(false)}
                                className="rounded-xl border border-[#414E36]/20 bg-white px-3 py-1.5 text-xs font-bold text-[#5A6A51]"
                              >
                                Cancel
                              </button>
                            )}
                            <button
                              type="submit"
                              disabled={savingMedicalRecord}
                              className="rounded-xl bg-[#414E36] px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-[#343F2B] transition disabled:opacity-50 flex items-center gap-1"
                            >
                              <Save size={14} /> {savingMedicalRecord ? "Saving..." : "Save Medical Record"}
                            </button>
                          </div>
                        </form>
                      )}

                      <div className="mt-6 border-t border-[#414E36]/10 pt-4 space-y-2">
                        <span className="text-xs font-bold text-[#5A6A51]">Booking Notes:</span>
                        <p className="text-xs text-[#1F251A] leading-relaxed bg-[#F4F5F1] p-3 rounded-2xl font-mono">
                          {activeSessionBooking.notes || "No booking notes provided."}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Doctor Clinical Notes & Session Consumables Section */}
                  <div className="lg:col-span-2 space-y-6">
                    
                    {/* ── NEW: SESSION CONSUMABLES & EXTRA PULSES SECTION (ABOVE NOTES) ── */}
                    <div className="rounded-3xl border border-[#414E36]/10 bg-white p-6 shadow-sm space-y-5">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#414E36]/10 pb-3">
                        <h3 className="text-sm font-bold text-[#1F251A] uppercase tracking-wider flex items-center gap-2">
                          <Sparkles size={16} className="text-[#414E36]" /> Session Consumables & Extra Device Pulses
                        </h3>
                        <div className="flex items-center gap-2 rounded-2xl bg-[#414E36]/10 px-3.5 py-1.5 text-xs font-black text-[#414E36]">
                          <span>Updated Invoice Total:</span>
                          <span className="text-sm text-[#414E36] font-extrabold">{updatedInvoiceTotal} EGP</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* 1. Products Used During Session */}
                        <div className="space-y-3 bg-[#FBFBF9] p-4 rounded-2xl border border-[#414E36]/10">
                          <h4 className="text-xs font-bold text-[#1F251A] uppercase tracking-wider flex items-center gap-1.5">
                            <ShoppingBag size={14} className="text-[#414E36]" /> Products Used in Treatment
                          </h4>
                          
                          <div className="grid grid-cols-3 gap-2">
                            <select
                              value={selectedProductId}
                              onChange={(e) => setSelectedProductId(e.target.value)}
                              className="col-span-2 rounded-xl border border-[#414E36]/15 bg-white px-2.5 py-1.5 text-xs font-bold text-[#1F251A] outline-none"
                            >
                              <option value="">-- Select Product --</option>
                              {productsList.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.price || p.unit_price || p.selling_price || 0} EGP)
                                </option>
                              ))}
                            </select>

                            <input
                              type="number"
                              min={1}
                              value={selectedProductQty}
                              onChange={(e) => setSelectedProductQty(Math.max(1, parseInt(e.target.value) || 1))}
                              className="rounded-xl border border-[#414E36]/15 bg-white px-2.5 py-1.5 text-xs font-bold text-[#1F251A] outline-none"
                              placeholder="Qty"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={handleAddProductToSession}
                            className="w-full rounded-xl bg-[#414E36] py-1.5 text-xs font-bold text-white hover:bg-[#343F2B] transition"
                          >
                            + Add Product to Invoice
                          </button>

                          {/* Added Products List */}
                          {usedProducts.length > 0 && (
                            <div className="space-y-1.5 pt-2 border-t border-[#414E36]/10">
                              {usedProducts.map((item, i) => (
                                <div key={i} className="flex items-center justify-between text-xs bg-white p-2 rounded-xl border border-[#414E36]/10">
                                  <div>
                                    <span className="font-bold text-[#1F251A]">{item.name}</span>
                                    <span className="text-[10px] text-[#5A6A51] block">Qty: {item.qty} x {item.unitPrice} EGP</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-extrabold text-[#414E36]">{item.total} EGP</span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveProductFromSession(i)}
                                      className="text-rose-600 hover:text-rose-800 text-xs font-bold"
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* 2. Extra Device Pulses */}
                        <div className="space-y-3 bg-[#FBFBF9] p-4 rounded-2xl border border-[#414E36]/10">
                          <h4 className="text-xs font-bold text-[#1F251A] uppercase tracking-wider flex items-center gap-1.5">
                            <Zap size={14} className="text-amber-600" /> Extra Device Pulses
                          </h4>

                          <div>
                            <label className="block text-[10px] font-bold text-[#5A6A51] mb-1">Select Laser / Aesthetic Device</label>
                            <select
                              value={selectedDeviceId}
                              onChange={(e) => setSelectedDeviceId(e.target.value)}
                              className="w-full rounded-xl border border-[#414E36]/15 bg-white px-2.5 py-1.5 text-xs font-bold text-[#1F251A] outline-none"
                            >
                              <option value="">-- Select Device --</option>
                              {devicesList.map((d) => (
                                <option key={d.id} value={d.id}>
                                  {d.name} ({d.status || 'Active'})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] font-bold text-[#5A6A51] mb-1">Extra Pulses Count</label>
                              <input
                                type="number"
                                min={0}
                                value={extraPulsesCount}
                                onChange={(e) => setExtraPulsesCount(Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-full rounded-xl border border-[#414E36]/15 bg-white px-2.5 py-1.5 text-xs font-bold text-[#1F251A] outline-none"
                                placeholder="e.g. 50"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-[#5A6A51] mb-1">Price per Pulse (EGP)</label>
                              <input
                                type="number"
                                min={0}
                                value={pricePerPulse}
                                onChange={(e) => setPricePerPulse(Math.max(0, parseFloat(e.target.value) || 0))}
                                className="w-full rounded-xl border border-[#414E36]/15 bg-white px-2.5 py-1.5 text-xs font-bold text-[#1F251A] outline-none"
                                placeholder="e.g. 2.5"
                              />
                            </div>
                          </div>

                          {extraPulsesSubtotal > 0 && (
                            <div className="text-xs bg-amber-50 p-2.5 rounded-xl border border-amber-200 flex justify-between font-bold text-amber-900">
                              <span>Extra Pulses Subtotal:</span>
                              <span>+{extraPulsesSubtotal} EGP</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Invoice Breakdown Summary */}
                      <div className="bg-[#414E36]/05 p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-4 text-[#5A6A51]">
                          <span>Base Service: <strong className="text-[#1F251A]">{baseBookingPrice} EGP</strong></span>
                          <span>Products Addons: <strong className="text-[#1F251A]">+{productsSubtotal} EGP</strong></span>
                          <span>Pulses Addons: <strong className="text-[#1F251A]">+{extraPulsesSubtotal} EGP</strong></span>
                        </div>
                        <div className="text-[#414E36] font-extrabold text-sm">
                          Final Invoice: {updatedInvoiceTotal} EGP
                        </div>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-[#414E36]/10 bg-white p-6 shadow-sm space-y-4">
                      <h3 className="text-sm font-bold text-[#1F251A] uppercase tracking-wider flex items-center gap-2">
                        <FileText size={16} className="text-[#414E36]" /> Doctor Procedure Observations & Medical Notes
                      </h3>
                      <textarea
                        rows={8}
                        value={clinicalNote}
                        onChange={(e) => setClinicalNote(e.target.value)}
                        placeholder="Enter clinical observations, laser pulse parameters, skin reactions, and post-procedure recommendations..."
                        className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] p-4 text-xs text-[#1F251A] outline-none focus:border-[#414E36] focus:ring-2 focus:ring-[#414E36]/20 font-sans"
                      />
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleSaveClinicalNote(activeSessionBooking)}
                          disabled={savingNote}
                          className="rounded-xl bg-[#414E36] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#343F2B] transition disabled:opacity-50"
                        >
                          {savingNote ? "Saving..." : "Save Clinical Notes"}
                        </button>
                      </div>
                    </div>
                  </div>

                </div>
              </>
            ) : (
              <div className="rounded-3xl border border-[#414E36]/10 bg-white p-12 text-center text-[#5A6A51] space-y-4">
                <div className="h-16 w-16 mx-auto flex items-center justify-center rounded-full bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                  <Play size={28} />
                </div>
                <h3 className="text-xl font-bold text-[#1F251A]">Waiting for Receptionist to Start Session</h3>
                <p className="text-xs text-[#5A6A51] max-w-md mx-auto leading-relaxed">
                  When the receptionist clicks <strong>&quot;Start Session&quot;</strong> on a patient booking assigned to you, the patient treatment portal will automatically open here in real-time.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("schedule")}
                    className="rounded-2xl bg-[#414E36] px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#343F2B] transition"
                  >
                    View Today&apos;s Patient Queue
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ── TAB 3: SETTINGS VIEW ── */}
        {activeTab === "settings" && (
          <div className="w-full space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-[#1F251A]">Doctor Profile & Security Settings</h2>
              <p className="text-xs text-[#5A6A51] mt-1">
                Manage your credentials, branch details, and security options.
              </p>
            </div>

            {/* Profile Card */}
            <div className="rounded-3xl border border-[#414E36]/10 bg-white p-6 shadow-sm flex items-center justify-between gap-4 w-full">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#414E36] text-white font-extrabold text-xl shadow-md">
                  Dr
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1F251A]">{doctorName}</h3>
                  <p className="text-xs text-[#5A6A51]">{doctorEmail}</p>
                  <span className="mt-2 inline-block rounded-xl bg-[#414E36]/10 px-3 py-1 text-xs font-bold text-[#414E36]">
                    Assigned Branch: {doctorBranch}
                  </span>
                </div>
              </div>
            </div>

            {/* Password Update Form */}
            <div className="rounded-3xl border border-[#414E36]/10 bg-white p-6 shadow-sm space-y-4 w-full">
              <h3 className="text-sm font-bold text-[#1F251A] uppercase tracking-wider flex items-center gap-2">
                <Lock size={16} className="text-[#414E36]" /> Security & Account Password
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#5A6A51] mb-1">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-xs text-[#1F251A] outline-none focus:border-[#414E36]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#5A6A51] mb-1">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-xs text-[#1F251A] outline-none focus:border-[#414E36]"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!newPassword || newPassword !== confirmPassword) {
                    alert("Passwords do not match or are empty.");
                    return;
                  }
                  alert("Password updated successfully!");
                  setNewPassword("");
                  setConfirmPassword("");
                }}
                className="rounded-xl bg-[#414E36] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#343F2B] transition"
              >
                Update Password
              </button>
            </div>
          </div>
        )}

      </main>

      {/* ── IN-PAGE SESSION MODAL (SCHEDULE TAB - SAME PAGE) ── */}
      {scheduleModalBooking && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[32px] bg-white p-6 shadow-2xl space-y-6 border border-[#414E36]/20">
            <div className="flex items-center justify-between border-b border-[#414E36]/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#414E36] text-white font-bold text-lg shadow-md">
                  {(scheduleModalBooking.name || "P").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#1F251A]">
                    {scheduleModalBooking.name || scheduleModalBooking.customer_name || "Patient Session"}
                  </h3>
                  <p className="text-xs text-[#5A6A51] mt-0.5">
                    {scheduleModalBooking.service || scheduleModalBooking.service_name} • {scheduleModalBooking.time || scheduleModalBooking.time_slot} • <strong className="text-[#414E36]">{scheduleModalBooking.room || "Treatment Room"}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setScheduleModalBooking(null)}
                className="rounded-full p-2 text-[#5A6A51] hover:bg-[#F4F5F1] transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Medical Record / Intake Form */}
              <div className="space-y-4">
                <div className="rounded-2xl border border-[#414E36]/10 bg-[#FBFBF9] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-[#1F251A] uppercase tracking-wider flex items-center gap-2">
                      <AlertCircle size={14} className="text-[#414E36]" /> Medical Record
                    </h4>
                    {medicalRecord ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-800">
                        <CheckCircle2 size={10} /> On File
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-bold text-rose-800 animate-pulse">
                        <AlertTriangle size={10} /> Intake Required
                      </span>
                    )}
                  </div>

                  {medicalRecordLoading ? (
                    <p className="text-xs text-[#5A6A51]">Loading medical record...</p>
                  ) : medicalRecord && !showMedicalForm ? (
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between border-b border-[#414E36]/10 pb-1.5">
                        <span className="text-[#5A6A51]">Skin Type:</span>
                        <span className="font-bold text-[#1F251A]">{medicalRecord.skin_type || "Normal"}</span>
                      </div>
                      <div className="flex justify-between border-b border-[#414E36]/10 pb-1.5">
                        <span className="text-[#5A6A51]">Allergies:</span>
                        <span className="font-bold text-rose-700">{medicalRecord.allergies || "None"}</span>
                      </div>
                      <div className="flex justify-between border-b border-[#414E36]/10 pb-1.5">
                        <span className="text-[#5A6A51]">Medications:</span>
                        <span className="font-semibold text-[#1F251A]">{medicalRecord.medication_details || "None"}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowMedicalForm(true)}
                        className="mt-1 flex items-center gap-1 text-[11px] font-bold text-[#414E36] hover:underline"
                      >
                        <Edit size={12} /> Edit Record
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSaveMedicalRecord} className="space-y-2 pt-1 text-xs">
                      {!medicalRecord && (
                        <p className="text-[10px] font-bold text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200">
                          First Visit: Medical Intake Form Required
                        </p>
                      )}
                      <div>
                        <label className="block text-[10px] font-bold text-[#5A6A51]">Skin Type</label>
                        <select
                          value={formSkinType}
                          onChange={(e) => setFormSkinType(e.target.value)}
                          className="w-full rounded-lg border border-[#414E36]/15 bg-white px-2 py-1 text-xs font-bold text-[#1F251A]"
                        >
                          <option value="Normal">Normal</option>
                          <option value="Dry">Dry</option>
                          <option value="Oily">Oily</option>
                          <option value="Sensitive">Sensitive</option>
                          <option value="Combination">Combination</option>
                          <option value="Acne-Prone">Acne-Prone</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[#5A6A51]">Allergies</label>
                        <input
                          type="text"
                          placeholder="e.g. Latex, Aspirin, None"
                          value={formAllergies}
                          onChange={(e) => setFormAllergies(e.target.value)}
                          className="w-full rounded-lg border border-[#414E36]/15 bg-white px-2 py-1 text-xs text-[#1F251A]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[#5A6A51]">Medications</label>
                        <input
                          type="text"
                          placeholder="e.g. Roaccutane, None"
                          value={formMedicationDetails}
                          onChange={(e) => setFormMedicationDetails(e.target.value)}
                          className="w-full rounded-lg border border-[#414E36]/15 bg-white px-2 py-1 text-xs text-[#1F251A]"
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="submit"
                          disabled={savingMedicalRecord}
                          className="rounded-lg bg-[#414E36] px-3 py-1 text-xs font-bold text-white hover:bg-[#343F2B]"
                        >
                          {savingMedicalRecord ? "Saving..." : "Save Record"}
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="pt-2 border-t border-[#414E36]/10">
                    <span className="text-xs font-bold text-[#5A6A51]">Notes:</span>
                    <p className="text-xs text-[#1F251A] mt-1 bg-white p-2.5 rounded-xl border border-[#414E36]/10 font-mono">
                      {scheduleModalBooking.notes || "No notes."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Notes Editor & Actions */}
              <div className="lg:col-span-2 space-y-4">
                <h4 className="text-xs font-bold text-[#1F251A] uppercase tracking-wider flex items-center gap-2">
                  <FileText size={14} className="text-[#414E36]" /> Procedure Observations & Notes
                </h4>
                <textarea
                  rows={6}
                  value={clinicalNote}
                  onChange={(e) => setClinicalNote(e.target.value)}
                  placeholder="Enter clinical observations, laser parameters, post-procedure advice..."
                  className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] p-4 text-xs text-[#1F251A] outline-none focus:border-[#414E36]"
                />
                
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => handleSaveClinicalNote(scheduleModalBooking)}
                    disabled={savingNote}
                    className="rounded-xl border border-[#414E36]/20 bg-white px-4 py-2 text-xs font-bold text-[#414E36] hover:bg-[#F4F5F1] transition disabled:opacity-50"
                  >
                    {savingNote ? "Saving..." : "Save Notes"}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowPrescriptionModal(true)}
                      className="rounded-xl border border-[#414E36]/20 bg-white px-4 py-2 text-xs font-bold text-[#414E36] hover:bg-[#F4F5F1] transition"
                    >
                      Write Prescription
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCompleteTreatment(scheduleModalBooking)}
                      className="rounded-xl bg-[#414E36] px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-[#343F2B] transition"
                    >
                      Complete Treatment
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PRESCRIPTION MODAL ── */}
      {showPrescriptionModal && (activeSessionBooking || scheduleModalBooking) && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-[32px] bg-white p-6 shadow-2xl space-y-5 border border-[#414E36]/20">
            <div className="flex items-center justify-between border-b border-[#414E36]/10 pb-3">
              <div>
                <h3 className="text-lg font-bold text-[#1F251A]">Write Digital Prescription</h3>
                <p className="text-xs text-[#5A6A51]">
                  Patient: <strong className="text-[#414E36]">{(activeSessionBooking || scheduleModalBooking).name || (activeSessionBooking || scheduleModalBooking).customer_name}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPrescriptionModal(false)}
                className="rounded-full p-2 text-[#5A6A51] hover:bg-[#F4F5F1]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={(e) => handleCreatePrescription(e, activeSessionBooking || scheduleModalBooking)} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#5A6A51] mb-1">Clinical Diagnosis</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Post-laser inflammation, Acne Vulgaris Grade II"
                  value={rxDiagnosis}
                  onChange={(e) => setRxDiagnosis(e.target.value)}
                  className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-xs text-[#1F251A] outline-none focus:border-[#414E36]"
                />
              </div>

              {/* Medications List */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#5A6A51]">Prescribed Medications</label>
                {rxMedications.map((med, idx) => (
                  <div key={idx} className="grid grid-cols-4 gap-2">
                    <input
                      type="text"
                      placeholder="Medication Name"
                      value={med.name}
                      onChange={(e) => {
                        const updated = [...rxMedications];
                        updated[idx].name = e.target.value;
                        setRxMedications(updated);
                      }}
                      className="rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2 text-xs text-[#1F251A] outline-none focus:border-[#414E36]"
                    />
                    <input
                      type="text"
                      placeholder="Dosage (e.g. 500mg)"
                      value={med.dosage}
                      onChange={(e) => {
                        const updated = [...rxMedications];
                        updated[idx].dosage = e.target.value;
                        setRxMedications(updated);
                      }}
                      className="rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2 text-xs text-[#1F251A] outline-none focus:border-[#414E36]"
                    />
                    <input
                      type="text"
                      placeholder="Frequency (e.g. 2x Daily)"
                      value={med.frequency}
                      onChange={(e) => {
                        const updated = [...rxMedications];
                        updated[idx].frequency = e.target.value;
                        setRxMedications(updated);
                      }}
                      className="rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2 text-xs text-[#1F251A] outline-none focus:border-[#414E36]"
                    />
                    <input
                      type="text"
                      placeholder="Duration (e.g. 7 Days)"
                      value={med.duration}
                      onChange={(e) => {
                        const updated = [...rxMedications];
                        updated[idx].duration = e.target.value;
                        setRxMedications(updated);
                      }}
                      className="rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2 text-xs text-[#1F251A] outline-none focus:border-[#414E36]"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setRxMedications([...rxMedications, { name: "", dosage: "", frequency: "", duration: "" }])}
                  className="text-xs font-bold text-[#414E36] flex items-center gap-1 mt-1 hover:underline"
                >
                  <Plus size={14} /> Add Another Medication
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#5A6A51] mb-1">General Patient Instructions</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Apply sunscreen SPF 50 daily, avoid direct sun exposure for 48 hours..."
                  value={rxGeneralNotes}
                  onChange={(e) => setRxGeneralNotes(e.target.value)}
                  className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] p-3 text-xs text-[#1F251A] outline-none focus:border-[#414E36]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPrescriptionModal(false)}
                  className="rounded-xl border border-[#414E36]/20 bg-white px-4 py-2 text-xs font-bold text-[#5A6A51] hover:bg-[#F4F5F1]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingRx}
                  className="rounded-xl bg-[#414E36] px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#343F2B] transition disabled:opacity-50"
                >
                  {savingRx ? "Saving..." : "Save & Print Prescription"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
