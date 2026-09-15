"use client";

import React, { useState, useEffect } from "react";
import {
  User,
  Phone,
  FileText,
  ShoppingBag,
  Calendar,
  Clock,
  MapPin,
  Box,
  Plus,
  Wallet,
  Info,
  Pencil,
  Check,
  Copy,
  X,
  Eye,
  MessageSquare,
  Printer,
  Receipt,
  XCircle,
  UserX,
  Play,
  ChevronLeft,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Edit,
  Save,
  Zap,
  Layers,
  Trash2,
  Loader2,
  Sparkles,
  Pill,
  Send,
  Search,
  ChevronDown,
  ArrowRight,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAlertConfirm } from "@/contexts/AlertConfirmContext";
import { supabase } from "@/lib/supabaseClient";
import { ServiceItem, getEffectiveServicePrice } from "@/lib/services";
import { printInvoice, printPrescription } from "@/lib/printUtils";
import { Branch } from "@/types";
import { adminTranslations } from "../translations";
import type { Req } from "@/app/admin/page";

export interface AdditionalServiceItem {
  id: string | number;
  serviceId?: number | string;
  name: string;
  price: number;
  deviceId?: string;
  deviceName?: string;
  pulses: number;
}

interface BookingDetailsModalProps {
  booking: Req;
  onClose: () => void;
  setBooking: React.Dispatch<React.SetStateAction<Req | null>>;
  rooms: any[];
  branches: Branch[];
  dbCustomers: any[];
  employeesList: any[];
  inventoryProducts: any[];
  localServices: ServiceItem[];
  hasPermission: (perm: string) => boolean;
  authenticatedJsonHeaders: { "Content-Type": string; Authorization: string };
  fetchRequests: (showSpinner?: boolean) => void;
  fetchAllReservations: (useCache?: boolean) => void;
  fetchCustomers: () => void;
  fetchInventoryProducts: () => void;
  saveNotes: (newNotes: string) => Promise<void>;
  setActiveNav: (nav: string) => void;
  setViewingCustomerProfile: (c: any) => void;
  setPrescriptionBookingContext: (v: string | null) => void;
  setCheckoutBooking: (b: any) => void;
  setInvoiceBooking: (b: any) => void;
  setPostponeBooking: (b: any) => void;
  setPostponeMode: (m: "reschedule" | "followup") => void;
  setPostponeNewDate: (d: string) => void;
  setPostponeNewTime: (t: string) => void;
  setPostponeFollowUpDate: (d: string) => void;
  globalEndingSession?: boolean;
}

export default function BookingDetailsModal({
  booking,
  onClose,
  setBooking,
  rooms,
  branches,
  dbCustomers,
  employeesList,
  inventoryProducts,
  localServices,
  hasPermission,
  authenticatedJsonHeaders,
  fetchRequests,
  fetchAllReservations,
  fetchCustomers,
  fetchInventoryProducts,
  saveNotes,
  setActiveNav,
  setViewingCustomerProfile,
  setPrescriptionBookingContext,
  setCheckoutBooking,
  setInvoiceBooking,
  setPostponeBooking,
  setPostponeMode,
  setPostponeNewDate,
  setPostponeNewTime,
  setPostponeFollowUpDate,
  globalEndingSession = false,
}: BookingDetailsModalProps) {
  const { isRTL } = useLanguage();
  const { showConfirm } = useAlertConfirm();
  const tr = (adminTranslations[isRTL ? "ar" : "en"] || adminTranslations.en).bookingControl;

  // ── Receptionist Service Editing & Booking Control States ──
  const [showChangeServiceModal, setShowChangeServiceModal] = useState<boolean>(false);
  const [selectedNewServiceId, setSelectedNewServiceId] = useState<number | string>("");
  const [serviceSearchTerm, setServiceSearchTerm] = useState<string>("");
  const [serviceSelectedCategory, setServiceSelectedCategory] = useState<string>("All");
  const [showPriceConfirmModal, setShowPriceConfirmModal] = useState<boolean>(false);
  const [isSavingServiceChange, setIsSavingServiceChange] = useState<boolean>(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  const [copiedBookingRef, setCopiedBookingRef] = useState<boolean>(false);
  const [drawerPrescriptions, setDrawerPrescriptions] = useState<any[]>([]);
  const [showDrawerPrescriptionModal, setShowDrawerPrescriptionModal] = useState(false);
  const [showDrawerProductModal, setShowDrawerProductModal] = useState(false);
  const [selectedDrawerProductId, setSelectedDrawerProductId] = useState("");
  const [selectedDrawerProductQty, setSelectedDrawerProductQty] = useState(1);
  const [drawerRxDiagnosis, setDrawerRxDiagnosis] = useState("");
  const [drawerRxMeds, setDrawerRxMeds] = useState<{ name: string; dosage: string; frequency: string; duration: string }[]>([
    { name: "", dosage: "", frequency: "", duration: "" }
  ]);
  const [drawerRxNotes, setDrawerRxNotes] = useState("");
  const [savingDrawerRx, setSavingDrawerRx] = useState(false);

  // ── Global Ending Session & Clinical Finalization View State ──
  const [viewMode, setViewMode] = useState<"details" | "end_session">("details");
  const [isGlobalEndingSessionActive, setIsGlobalEndingSessionActive] = useState<boolean>(Boolean(globalEndingSession));

  // Medical record intake states
  const [medicalRecord, setMedicalRecord] = useState<any>(null);
  const [medicalRecordLoading, setMedicalRecordLoading] = useState<boolean>(false);
  const [showMedicalForm, setShowMedicalForm] = useState<boolean>(false);
  const [activeTemplate, setActiveTemplate] = useState<any | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState<boolean>(false);
  const [dynamicResponses, setDynamicResponses] = useState<Record<string, any>>({});
  const [formSkinType, setFormSkinType] = useState<string>("Normal");
  const [formAllergies, setFormAllergies] = useState<string>("");
  const [formMedicationDetails, setFormMedicationDetails] = useState<string>("");
  const [formMedicalConditionsDetails, setFormMedicalConditionsDetails] = useState<string>("");
  const [formPreviousTreatmentsDetails, setFormPreviousTreatmentsDetails] = useState<string>("");
  const [savingMedicalRecord, setSavingMedicalRecord] = useState<boolean>(false);

  // Clinical procedure notes state
  const [clinicalNote, setClinicalNote] = useState<string>("");
  const [savingClinicalNote, setSavingClinicalNote] = useState<boolean>(false);

  // Inline prescription state
  const [rxDiagnosis, setRxDiagnosis] = useState<string>("");
  const [rxMedications, setRxMedications] = useState<{ name: string; dosage: string; frequency: string; duration: string }[]>([
    { name: "", dosage: "", frequency: "", duration: "" }
  ]);
  const [rxGeneralNotes, setRxGeneralNotes] = useState<string>("");
  const [savingRxInline, setSavingRxInline] = useState<boolean>(false);

  // Services & Pulses state
  const [primaryServiceId, setPrimaryServiceId] = useState<string>("");
  const [additionalServices, setAdditionalServices] = useState<AdditionalServiceItem[]>([]);
  const [selectedServiceIdToAdd, setSelectedServiceIdToAdd] = useState<string>("");
  const [selectedDeviceForService, setSelectedDeviceForService] = useState<string>("");
  const [pulsesCountForService, setPulsesCountForService] = useState<number>(0);
  const [loadingDeviceLinks, setLoadingDeviceLinks] = useState<boolean>(false);
  const [devicesList, setDevicesList] = useState<any[]>([]);

  // Products / Consumables state
  const [usedProducts, setUsedProducts] = useState<{ id: string; name: string; qty: number; unitPrice: number; total: number }[]>([]);
  const [selectedSessionProductId, setSelectedSessionProductId] = useState<string>("");
  const [selectedSessionProductQty, setSelectedSessionProductQty] = useState<number>(1);

  // Device pulses state
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [extraPulsesCount, setExtraPulsesCount] = useState<number>(0);
  const [pricePerPulse, setPricePerPulse] = useState<number>(0);

  // Finalizing state
  const [finalizingSession, setFinalizingSession] = useState<boolean>(false);

  // Sync globalEndingSession prop
  useEffect(() => {
    setIsGlobalEndingSessionActive(Boolean(globalEndingSession));
  }, [globalEndingSession]);

  // Real-time custom event listener for instant zero-reload reactivity
  useEffect(() => {
    const handleSettingsChange = (e: any) => {
      if (e?.detail && typeof e.detail.globalEndingSession === "boolean") {
        setIsGlobalEndingSessionActive(e.detail.globalEndingSession);
      } else {
        try {
          const stored = localStorage.getItem("revera_global_ending_session") || localStorage.getItem("revera_inactivity_settings");
          if (stored) {
            const parsed = JSON.parse(stored);
            if (typeof parsed === "boolean") setIsGlobalEndingSessionActive(parsed);
            else if (typeof parsed?.globalEndingSession === "boolean") setIsGlobalEndingSessionActive(parsed.globalEndingSession);
          }
        } catch (err) {}
      }
    };
    window.addEventListener("revera-settings-change", handleSettingsChange as EventListener);
    return () => {
      window.removeEventListener("revera-settings-change", handleSettingsChange as EventListener);
    };
  }, []);

  // Initialize booking details and state
  useEffect(() => {
    if (!booking) {
      setViewMode("details");
      setMedicalRecord(null);
      setClinicalNote("");
      setAdditionalServices([]);
      setUsedProducts([]);
      return;
    }
    const note = booking.doctorNotes || (booking as any).doctor_notes || "";
    setClinicalNote(note);
    const initialSvcId = String(booking.serviceId || (booking.serviceIds && booking.serviceIds[0]) || "");
    setPrimaryServiceId(initialSvcId);
  }, [booking?.id]);

  // Load Devices List
  useEffect(() => {
    fetch("/api/inventory/devices", { headers: authenticatedJsonHeaders })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.devices && Array.isArray(data.devices)) {
          setDevicesList(data.devices);
        } else if (Array.isArray(data)) {
          setDevicesList(data);
        }
      })
      .catch((err) => console.warn("Error loading devices in modal:", err));
  }, []);

  // Load Medical Record for patient
  useEffect(() => {
    if (!booking) return;
    const custId = booking.customerId || (booking as any).customer_id;
    const bookId = booking.id;
    setMedicalRecordLoading(true);

    const params = new URLSearchParams();
    if (custId) params.set("customerId", String(custId));
    if (bookId) params.set("reservationId", String(bookId));

    fetch(`/api/medical-records?${params.toString()}`, { headers: authenticatedJsonHeaders })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.form) {
          setMedicalRecord(data.form);
        } else if (data && !data.error && !Array.isArray(data)) {
          setMedicalRecord(data);
        } else {
          setMedicalRecord(null);
        }
      })
      .catch((err) => {
        console.warn("Error fetching medical record:", err);
        setMedicalRecord(null);
      })
      .finally(() => setMedicalRecordLoading(false));
  }, [booking?.id, booking?.customerId, (booking as any)?.customer_id]);

  // Load specialized intake template matching current service
  useEffect(() => {
    if (!booking) return;
    const currentSvcId = primaryServiceId || booking.serviceId || (booking.serviceIds && booking.serviceIds[0]);

    const fetchMatchingTemplate = async () => {
      setLoadingTemplate(true);
      try {
        const url = currentSvcId
          ? `/api/medical-records/templates?serviceId=${encodeURIComponent(String(currentSvcId))}`
          : `/api/medical-records/templates`;
        const res = await fetch(url, { headers: authenticatedJsonHeaders });
        if (res.ok) {
          const data = await res.json();
          const tmpl = data.template || (data.templates && data.templates[0]);
          if (tmpl) {
            setActiveTemplate(tmpl);
          }
        }
      } catch (err) {
        console.error("Error loading service intake template:", err);
      } finally {
        setLoadingTemplate(false);
      }
    };

    fetchMatchingTemplate();
  }, [booking?.id, primaryServiceId]);

  // Sync dynamic responses from medicalRecord / activeTemplate
  useEffect(() => {
    if (!activeTemplate) return;
    const initial: Record<string, any> = {};
    const existingResponses = medicalRecord?.responses || {};

    (activeTemplate.fields || []).forEach((f: any) => {
      if (existingResponses[f.id] !== undefined) {
        initial[f.id] = existingResponses[f.id];
      } else if (f.id === "skin_type") {
        initial[f.id] = medicalRecord?.skin_type || formSkinType || "Normal";
      } else if (f.id === "allergies") {
        initial[f.id] = medicalRecord?.allergies || formAllergies || "";
      } else if (f.id === "medications" || f.id === "current_medication") {
        initial[f.id] = medicalRecord?.medication_details || formMedicationDetails || "";
      } else if (f.id === "medical_conditions") {
        initial[f.id] = medicalRecord?.medical_conditions_details || formMedicalConditionsDetails || "";
      } else if (f.id === "previous_treatments") {
        initial[f.id] = medicalRecord?.previous_treatments_details || formPreviousTreatmentsDetails || "";
      } else if (f.type === "select" && f.options?.length) {
        initial[f.id] = f.options[0];
      } else if (f.type === "checkbox") {
        initial[f.id] = false;
      } else {
        initial[f.id] = "";
      }
    });

    setDynamicResponses(initial);
  }, [medicalRecord, activeTemplate]);

  // Service device lookup when selecting an additional service
  useEffect(() => {
    if (!selectedServiceIdToAdd) return;
    setLoadingDeviceLinks(true);
    fetch(`/api/service-devices?serviceId=${selectedServiceIdToAdd}`, { headers: authenticatedJsonHeaders })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const links = data?.deviceLinks || [];
        if (links.length > 0) {
          setSelectedDeviceForService(links[0].device_id || "");
          setPulsesCountForService(Number(links[0].pulses_per_session) || 100);
        } else {
          setSelectedDeviceForService("");
          setPulsesCountForService(0);
        }
      })
      .catch((err) => console.warn("Error loading service devices:", err))
      .finally(() => setLoadingDeviceLinks(false));
  }, [selectedServiceIdToAdd]);

  useEffect(() => {
    if (booking) {
      const bookId = booking.id || "";
      const params = new URLSearchParams();
      if (bookId) {
        params.set("bookingId", String(bookId));
      }

      fetch(`/api/prescriptions?${params.toString()}`, { headers: authenticatedJsonHeaders })
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => setDrawerPrescriptions(Array.isArray(data) ? data : []))
        .catch((err) => console.warn("Error fetching drawer prescriptions:", err));
    } else {
      setDrawerPrescriptions([]);
    }
  }, [booking?.id]);

  function handleSendPrescriptionWhatsApp(rx: any, booking: any) {
    const rawPhone = String(booking?.phone || rx?.patient_phone || rx?.phone || '').trim();
    if (!rawPhone) {
      alert("No phone number found for this patient.");
      return;
    }
    let cleanPhone = rawPhone.replace(/\D/g, '');
    if (cleanPhone.startsWith('01')) {
      cleanPhone = '20' + cleanPhone.slice(1);
    } else if (cleanPhone.startsWith('00')) {
      cleanPhone = cleanPhone.slice(2);
    } else if (!cleanPhone.startsWith('20') && cleanPhone.length === 10) {
      cleanPhone = '20' + cleanPhone;
    }

    const patientName = rx.patient_name || rx.customer_name || booking?.name || 'Patient';
    const doctorName = rx.doctor_name || booking?.doctorName || 'Treating Doctor';
    const rxDate = rx.date ? String(rx.date).slice(0, 10) : new Date().toISOString().slice(0, 10);
    const diagnosis = rx.diagnosis || 'Clinical Consultation';
    const notes = rx.general_notes || rx.instructions || rx.doctor_notes || rx.notes || '';

    const medsList: any[] = Array.isArray(rx.medications) && rx.medications.length > 0
      ? rx.medications
      : (Array.isArray(rx.items) ? rx.items : []);

    const medsText = medsList.length > 0
      ? medsList.map((m: any, idx: number) => 
          `${idx + 1}. *${m.name || m.medicine_name || m.medicine || 'Medication'}* ${m.dosage ? `(${m.dosage})` : ''}\n   ⏱️ التكرار / Frequency: ${m.frequency || 'حسب الإرشادات'}\n   ⏳ المدة / Duration: ${m.duration || 'حسب الحاجة'}`
        ).join('\n\n')
      : 'لا توجد أدوية مسجلة';

    const msg = 
`*REVERA CLINICS | روشتة طبية إلكترونية*
━━━━━━━━━━━━━━━━━━━━
👤 *المريض / Patient:* ${patientName}
📅 *التاريخ / Date:* ${rxDate}
👨‍⚕️ *الطبيب / Doctor:* ${doctorName}
${diagnosis ? `🩺 *التشخيص / Diagnosis:* ${diagnosis}\n` : ''}━━━━━━━━━━━━━━━━━━━━
💊 *الأدوية الموصوفة / Prescribed Medications:*

${medsText}
━━━━━━━━━━━━━━━━━━━━
${notes ? `📝 *تعليمات الطبيب / Doctor Instructions:*\n${notes}\n━━━━━━━━━━━━━━━━━━━━\n` : ''}✨ مع تمنياتنا لكم بالشفاء العاجل ودوام الصحة والعافية.
📍 *Revera Clinics* — Sheikh Zayed & New Cairo
📞 (+20) 01035595691`;

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  }

  const handleSaveDrawerPrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;
    setSavingDrawerRx(true);
    try {
      const custId = booking.customerId || (booking as any).customer_id || null;
      const res = await fetch("/api/prescriptions", {
        method: "POST",
        headers: authenticatedJsonHeaders,
        body: JSON.stringify({
          booking_id: booking.id,
          customer_id: custId ? String(custId) : null,
          patient_name: booking.name || "Patient",
          customer_name: booking.name || "Patient",
          doctor_name: booking.doctorName || null,
          date: booking.date || new Date().toISOString().slice(0, 10),
          diagnosis: drawerRxDiagnosis,
          medications: drawerRxMeds.filter((m) => m.name.trim() !== ""),
          instructions: drawerRxNotes,
          general_notes: drawerRxNotes,
          doctor_notes: booking.notes || ""
        })
      });

      if (res.ok) {
        alert("Digital Prescription saved successfully!");
        setShowDrawerPrescriptionModal(false);
        setDrawerRxDiagnosis("");
        setDrawerRxMeds([{ name: "", dosage: "", frequency: "", duration: "" }]);
        setDrawerRxNotes("");

        const params = new URLSearchParams();
        if (booking.id) params.set("bookingId", String(booking.id));

        const rxRes = await fetch(`/api/prescriptions?${params.toString()}`, { headers: authenticatedJsonHeaders });
        if (rxRes.ok) {
          const rxData = await rxRes.json();
          setDrawerPrescriptions(Array.isArray(rxData) ? rxData : []);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to save prescription.");
      }
    } catch (err: any) {
      console.error("Error saving prescription:", err);
      alert(err.message || "Error saving prescription.");
    } finally {
      setSavingDrawerRx(false);
    }
  };

  const handleAddProductToBooking = async () => {
    if (!booking || !selectedDrawerProductId) return;
    const prod = (inventoryProducts || []).find((p: any) => String(p.id) === String(selectedDrawerProductId));
    if (!prod) return;

    const unitPrice = Number(prod.price || prod.unit_price || prod.selling_price || 0);
    const qty = Number(selectedDrawerProductQty) || 1;
    const total = unitPrice * qty;

    const currentProducts = Array.isArray((booking as any).attachedProducts) ? [...(booking as any).attachedProducts] : [];
    currentProducts.push({
      id: String(prod.id),
      name: prod.name,
      qty,
      unitPrice,
      total
    });

    // Calculate total base services cost
    const svcIds = Array.isArray(booking.serviceIds) ? booking.serviceIds : (booking.serviceId ? [booking.serviceId] : []);
    const baseServicesCost = svcIds.reduce((sum: number, id: number) => {
      const s = localServices.find(srv => srv.id === id);
      return sum + (s ? getEffectiveServicePrice(s, booking.branchId, branches) : 500);
    }, 0);

    // Calculate total attached products cost including newly added product
    const totalProductsCost = currentProducts.reduce((sum: number, p: any) => sum + (Number(p.total) || (Number(p.qty || 1) * Number(p.unitPrice || p.price || 0))), 0);
    const grandTotalCost = baseServicesCost + totalProductsCost;

    const sessionPaid = Number(booking.amountPaid || 0);
    const newLeft = Math.max(0, grandTotalCost - sessionPaid);

    const updatedNotes = (booking.notes || "") + `\n[Added Product]: ${prod.name} (x${qty}) - ${total} EGP`;

    // DEC-042: real reservation_products row, replacing free-text notes as the source of truth
    // for the drawer's Products panel / invoice line items (RISK-038, RISK-057). Notes append
    // above is kept as a human-readable audit trail and legacy display fallback, not removed.
    // If this reservation is already completed/invoiced, the endpoint folds the line into the
    // existing invoice immediately; otherwise it's picked up by writeCheckoutInvoice whenever this
    // booking is later completed.
    try {
      await fetch("/api/reservation-products", {
        method: "POST",
        headers: authenticatedJsonHeaders,
        body: JSON.stringify({
          reservationId: booking.id,
          lineType: "product",
          productId: prod.id,
          description: prod.name,
          qty,
          unitPrice,
          addedByRole: "receptionist",
        }),
      });
    } catch (err) {
      console.error("Error persisting reservation_products row (non-fatal, amountLeft/notes PATCH still applies):", err);
    }

    try {
      const res = await fetch(`/api/reservations?id=${booking.id}`, {
        method: "PATCH",
        headers: authenticatedJsonHeaders,
        body: JSON.stringify({
          amountLeft: newLeft,
          notes: updatedNotes,
          attachedProducts: currentProducts
        })
      });

      if (res.ok) {
        setBooking((prev) =>
          prev
            ? {
                ...prev,
                amountLeft: newLeft,
                amount_left: newLeft,
                notes: updatedNotes,
                attachedProducts: currentProducts
              }
            : null
        );
        setShowDrawerProductModal(false);
        setSelectedDrawerProductId("");
        setSelectedDrawerProductQty(1);
        fetchAllReservations();
        fetchInventoryProducts();
        alert(`Product "${prod.name}" added to booking invoice!`);
      }
    } catch (err) {
      console.error("Error adding product to booking:", err);
    }
  };
  const [isEditingService, setIsEditingService] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");

  // Sync real-time reservation_products (products, additional services, pulses) on modal opens
  useEffect(() => {
    const activeId = booking?.id;
    if (!activeId) return;

    supabase
      .from('reservation_products')
      .select('*')
      .eq('reservation_id', activeId)
      .then((res: any) => {
        const { data, error } = res || {};
        if (!error && data && data.length > 0) {
          const mapped = data.map((p: any) => ({
            id: p.id,
            name: p.description,
            qty: Number(p.qty) || 1,
            unitPrice: Number(p.unit_price) || 0,
            total: Number(p.total) || (Number(p.qty || 1) * Number(p.unit_price || 0)),
            addedBy: p.added_by_role === 'doctor_session' ? 'Doctor Session' : 'Receptionist',
            lineType: p.line_type || (p.service_id ? 'additional_service' : 'product'),
            serviceId: p.service_id ?? null,
          }));
          setBooking((prev: any) => {
            if (prev && String(prev.id) === String(activeId)) {
              return { ...prev, attachedProducts: mapped };
            }
            return prev;
          });
        }
      });
  }, [booking?.id]);

  // ── Receptionist Full Booking Status Control ──
  const handleUpdateBookingStatus = async (newStatus: string) => {
    if (!booking || isUpdatingStatus) return;
    if (!hasPermission("bookings.edit")) {
      alert(isRTL ? "ليس لديك صلاحية لتعديل الحجز" : "You do not have permission to edit bookings.");
      return;
    }

    if (newStatus === "cancelled") {
      if (!(await showConfirm(isRTL ? "هل أنت متأكد من إلغاء هذا الحجز؟ سيتم استرداد أي عربون مدفوع إلى محفظة المريض." : "Cancel this booking? Any deposit paid will be refunded to the patient's wallet."))) return;
    } else if (newStatus === "no_show") {
      if (!(await showConfirm(isRTL ? "هل أنت متأكد من تحديد هذا الحجز كعدم حضور؟ سيتم مصادرة أي عربون كرسوم إلغاء." : "Mark this booking as a no-show? Any deposit paid will be forfeited as a cancellation fee, not refunded."))) return;
    }

    setIsUpdatingStatus(true);
    try {
      const payload: any = { status: newStatus };
      if (newStatus === "cancelled") payload.action = "cancel";
      if (newStatus === "no_show") payload.action = "no_show";

      const res = await fetch(`/api/reservations?id=${encodeURIComponent(booking.id)}`, {
        method: "PATCH",
        headers: authenticatedJsonHeaders,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const updated = await res.json().catch(() => ({}));
        setBooking((prev) => (prev ? { ...prev, ...updated, status: newStatus } : null));
        fetchAllReservations();
        fetchRequests();
        fetchCustomers();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || err.message || (isRTL ? "فشل تحديث حالة الحجز" : "Failed to update booking status."));
      }
    } catch (err: any) {
      console.error("Error updating booking status:", err);
      alert(err.message || (isRTL ? "حدث خطأ أثناء تحديث حالة الحجز" : "Error updating booking status."));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // ── Receptionist Booked Service Editing & Price Recalculation ──
  const handleConfirmServiceChange = async () => {
    if (!booking || !selectedNewServiceId || isSavingServiceChange) return;
    const newSvc = localServices.find((s) => String(s.id) === String(selectedNewServiceId));
    if (!newSvc) return;

    setIsSavingServiceChange(true);
    try {
      const newServiceName = (isRTL ? newSvc.ar : newSvc.en) || newSvc.en || newSvc.ar;
      const res = await fetch(`/api/reservations?id=${encodeURIComponent(booking.id)}`, {
        method: "PATCH",
        headers: authenticatedJsonHeaders,
        body: JSON.stringify({
          serviceId: Number(selectedNewServiceId),
          service_name: newServiceName,
          changedBy: "Receptionist",
        }),
      });

      if (res.ok) {
        const updated = await res.json().catch(() => ({}));
        setBooking((prev) => (prev ? { ...prev, ...updated } : null));
        setPrimaryServiceId(String(selectedNewServiceId));
        setShowPriceConfirmModal(false);
        setShowChangeServiceModal(false);
        setSelectedNewServiceId("");
        setServiceSearchTerm("");
        fetchAllReservations();
        fetchRequests();
        alert(tr.serviceUpdatedSuccess);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || err.message || (isRTL ? "فشل تغيير الخدمة" : "Failed to update service."));
      }
    } catch (err: any) {
      console.error("Error updating service:", err);
      alert(err.message || (isRTL ? "حدث خطأ أثناء تغيير الخدمة" : "Error updating service."));
    } finally {
      setIsSavingServiceChange(false);
    }
  };

  // ── Standalone Handlers for Global Ending Session View ──
  const handleSaveMedicalRecordStandalone = async (customData?: any) => {
    if (!booking) return;
    setSavingMedicalRecord(true);
    try {
      const custId = booking.customerId || (booking as any).customer_id || booking.id;
      const patientName = booking.name || (booking as any).customer_name || "Patient";

      const payload = customData || {
        customer_id: custId ? String(custId) : null,
        reservation_id: booking.id,
        patient_name: patientName,
        template_id: activeTemplate?.id || null,
        responses: dynamicResponses,
        skin_type: dynamicResponses.skin_type || dynamicResponses.fitzpatrick_scale || formSkinType || "Normal",
        allergies: dynamicResponses.allergies || formAllergies || "",
        medication_details: dynamicResponses.medications || dynamicResponses.photosensitizing_drugs || formMedicationDetails || "",
        medical_conditions_details: dynamicResponses.medical_conditions || dynamicResponses.bleeding_disorders || formMedicalConditionsDetails || "",
        previous_treatments_details: dynamicResponses.previous_treatments || dynamicResponses.previous_injectables || formPreviousTreatmentsDetails || ""
      };

      const res = await fetch("/api/medical-records", {
        method: "POST",
        headers: authenticatedJsonHeaders,
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        setMedicalRecord(data.form || data.medicalRecord || data);
        setShowMedicalForm(false);
        alert(isRTL ? "تم حفظ السجل الطبي للمريض بنجاح!" : "Patient medical record saved successfully!");
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

  const handleSaveInlinePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;
    setSavingRxInline(true);
    try {
      const custId = booking.customerId || (booking as any).customer_id || null;
      const patientName = booking.name || (booking as any).customer_name || "Patient";
      const payload = {
        booking_id: booking.id,
        customer_id: custId ? String(custId) : null,
        patient_name: patientName,
        customer_name: patientName,
        doctor_name: booking.doctorName || "Treating Doctor",
        diagnosis: rxDiagnosis,
        medications: rxMedications.filter((m) => m.name.trim() !== ""),
        instructions: rxGeneralNotes,
        general_notes: rxGeneralNotes,
        date: booking.date || new Date().toISOString().slice(0, 10),
      };

      const res = await fetch("/api/prescriptions", {
        method: "POST",
        headers: authenticatedJsonHeaders,
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const newRx = await res.json().catch(() => payload);
        alert(isRTL ? "تم حفظ الروشتة الإلكترونية بنجاح!" : "Prescription saved successfully!");
        printPrescription(newRx, booking);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to save prescription.");
      }
    } catch (err: any) {
      console.error("Error saving prescription:", err);
      alert(err.message || "Error saving prescription.");
    } finally {
      setSavingRxInline(false);
    }
  };

  const handleAddServiceToSession = () => {
    if (!selectedServiceIdToAdd) return;
    const srv = localServices.find((s) => String(s.id) === String(selectedServiceIdToAdd));
    if (!srv) return;

    const srvName = (isRTL ? srv.ar : srv.en) || srv.en || srv.ar || "Clinical Service";
    const srvPrice = getEffectiveServicePrice(srv, booking?.branchId, branches);
    const devObj = devicesList.find((d) => String(d.id) === String(selectedDeviceForService));

    const newItem: AdditionalServiceItem = {
      id: Date.now() + Math.random(),
      serviceId: srv.id,
      name: srvName,
      price: srvPrice,
      deviceId: devObj?.id ? String(devObj.id) : undefined,
      deviceName: devObj?.name,
      pulses: Math.max(0, Number(pulsesCountForService) || 0)
    };

    setAdditionalServices((prev) => [...prev, newItem]);
    setSelectedServiceIdToAdd("");
    setSelectedDeviceForService("");
    setPulsesCountForService(0);
  };

  const handleRemoveServiceFromSession = (id: string | number) => {
    setAdditionalServices((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddProductToSession = () => {
    if (!selectedSessionProductId) return;
    const prod = (inventoryProducts || []).find((p: any) => String(p.id) === String(selectedSessionProductId));
    if (!prod) return;

    const unitPrice = Number(prod.price || prod.unit_price || prod.selling_price || 0);
    const qty = Number(selectedSessionProductQty) || 1;
    const total = unitPrice * qty;

    setUsedProducts((prev) => [
      ...prev,
      {
        id: String(prod.id),
        name: prod.name,
        qty,
        unitPrice,
        total
      }
    ]);
    setSelectedSessionProductId("");
    setSelectedSessionProductQty(1);
  };

  const handleRemoveProductFromSession = (index: number) => {
    setUsedProducts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveClinicalNoteStandalone = async () => {
    if (!booking) return;
    setSavingClinicalNote(true);
    try {
      const res = await fetch(`/api/reservations?id=${encodeURIComponent(booking.id)}`, {
        method: "PATCH",
        headers: authenticatedJsonHeaders,
        body: JSON.stringify({
          doctorNotes: clinicalNote
        })
      });
      if (res.ok) {
        setBooking((prev: any) => prev ? { ...prev, doctorNotes: clinicalNote } : null);
        alert(isRTL ? "تم حفظ الملاحظات الطبية بنجاح!" : "Clinical notes saved successfully!");
      }
    } catch (err) {
      console.error("Error saving clinical notes:", err);
    } finally {
      setSavingClinicalNote(false);
    }
  };

  const handleConfirmEndSession = async (
    calculatedInvoiceTotal: number,
    paidAmount: number
  ) => {
    if (!booking) return;
    setFinalizingSession(true);

    try {
      const custId = booking.customerId || (booking as any).customer_id || booking.id;
      const patientName = booking.name || (booking as any).customer_name || "Patient";

      // 1. Strict guard: Check if first visit patient has no medical record intake
      const customerRecord = (dbCustomers || []).find((c: any) =>
        (custId && String(c.id) === String(custId)) ||
        (booking.phone && c.phone === booking.phone)
      );
      const pastVisits = Number(customerRecord?.visit_count ?? customerRecord?.visitCount ?? customerRecord?.total_bookings ?? 0);
      const isFirstVisitPatient = !medicalRecord && pastVisits <= 1;

      if (isFirstVisitPatient && !medicalRecord) {
        const hasIntakeData = Boolean(
          formSkinType || formAllergies || formMedicationDetails ||
          formMedicalConditionsDetails || formPreviousTreatmentsDetails ||
          (Object.keys(dynamicResponses).length > 0 && Object.values(dynamicResponses).some((v) => Boolean(v)))
        );

        if (!hasIntakeData) {
          alert(isRTL ? "لا يمكن إنهاء الجلسة: تسجيل بيانات الفحص الطبي مطلوب إجبارياً لمرضى الزيارة الأولى. يرجى ملء نموذج الفحص الطبي أولاً." : "Cannot complete treatment: Medical record intake is strictly required for first-visit patients. Please complete the intake form before ending the session.");
          setShowMedicalForm(true);
          setFinalizingSession(false);
          return;
        }
      }

      // 2. Save Medical Record if filled or updated
      const hasAnyIntakeInput = Boolean(
        formSkinType || formAllergies || formMedicationDetails ||
        formMedicalConditionsDetails || formPreviousTreatmentsDetails ||
        (Object.keys(dynamicResponses).length > 0 && Object.values(dynamicResponses).some((v) => Boolean(v)))
      );

      if (hasAnyIntakeInput && (showMedicalForm || !medicalRecord)) {
        try {
          const medPayload = {
            customer_id: custId ? String(custId) : null,
            reservation_id: booking.id,
            patient_name: patientName,
            template_id: activeTemplate?.id || null,
            responses: dynamicResponses,
            skin_type: dynamicResponses.skin_type || dynamicResponses.fitzpatrick_scale || formSkinType || "Normal",
            allergies: dynamicResponses.allergies || formAllergies || "",
            medication_details: dynamicResponses.medications || dynamicResponses.photosensitizing_drugs || formMedicationDetails || "",
            medical_conditions_details: dynamicResponses.medical_conditions || dynamicResponses.bleeding_disorders || formMedicalConditionsDetails || "",
            previous_treatments_details: dynamicResponses.previous_treatments || dynamicResponses.previous_injectables || formPreviousTreatmentsDetails || ""
          };
          const medRes = await fetch("/api/medical-records", {
            method: "POST",
            headers: authenticatedJsonHeaders,
            body: JSON.stringify(medPayload)
          });
          if (medRes.ok) {
            const mData = await medRes.json();
            setMedicalRecord(mData.form || mData.medicalRecord || mData);
          }
        } catch (mErr) {
          console.error("Error saving medical record during global end session:", mErr);
        }
      }

      // 3. Save Prescription if entered
      const validMeds = rxMedications.filter((m) => m.name.trim() !== "");
      if (rxDiagnosis.trim() || validMeds.length > 0 || rxGeneralNotes.trim()) {
        try {
          const rxPayload = {
            booking_id: booking.id,
            customer_id: custId ? String(custId) : null,
            patient_name: patientName,
            customer_name: patientName,
            doctor_name: booking.doctorName || "Treating Doctor",
            diagnosis: rxDiagnosis,
            medications: validMeds,
            instructions: rxGeneralNotes,
            general_notes: rxGeneralNotes,
            date: booking.date || new Date().toISOString().slice(0, 10),
          };
          await fetch("/api/prescriptions", {
            method: "POST",
            headers: authenticatedJsonHeaders,
            body: JSON.stringify(rxPayload)
          });
        } catch (rxErr) {
          console.error("Error saving prescription during global end session:", rxErr);
        }
      }

      // 4. Deduct Used Products from Inventory Stock
      if (usedProducts.length > 0) {
        for (const item of usedProducts) {
          try {
            await fetch("/api/inventory/products/sales", {
              method: "POST",
              headers: authenticatedJsonHeaders,
              body: JSON.stringify({
                product_id: item.id,
                product_name: item.name,
                quantity: Number(item.qty) || 1,
                unit_price: Number(item.unitPrice) || 0,
                total_amount: Number(item.total) || 0,
                customer_id: custId || "",
                customer_name: patientName,
                customer_mobile: booking.phone || "N/A",
                notes: `Consumable deducted via Global Ending Session (Booking #${booking.id})`
              })
            });
          } catch (pErr) {
            console.error("Error deducting product stock:", pErr);
          }
        }
      }

      // 5. Deduct Device Pulses from DB
      const totalPulses = (Number(extraPulsesCount) || 0) + additionalServices.reduce((sum, s) => sum + Number(s.pulses || 0), 0);
      const targetDevId = selectedDeviceId || additionalServices.find((s) => s.deviceId)?.deviceId;
      if (targetDevId && totalPulses > 0) {
        try {
          const devObj = devicesList.find((d) => String(d.id) === String(targetDevId));
          if (devObj) {
            const currentPulses = Number(devObj.current_pulse_count || devObj.total_pulses || 0);
            const newPulseCount = currentPulses + totalPulses;
            await fetch("/api/inventory/devices", {
              method: "PUT",
              headers: authenticatedJsonHeaders,
              body: JSON.stringify({
                id: devObj.id,
                current_pulse_count: newPulseCount,
                notes: `Global Ending Session pulse usage for ${patientName} (${totalPulses} pulses deducted)`
              })
            });
          }
        } catch (dErr) {
          console.error("Error updating device pulses:", dErr);
        }
      }

      // 6. Persist Line Items to reservation_products
      const lineItemWrites: Promise<any>[] = [];
      for (const p of usedProducts) {
        lineItemWrites.push(
          fetch("/api/reservation-products", {
            method: "POST",
            headers: authenticatedJsonHeaders,
            body: JSON.stringify({
              reservationId: booking.id,
              lineType: "product",
              productId: p.id,
              description: p.name,
              qty: p.qty,
              unitPrice: p.unitPrice,
              addedByRole: "receptionist_global_ending",
            }),
          })
        );
      }
      for (const s of additionalServices) {
        const realServiceId = s.serviceId || (typeof s.id === "number" && s.id < 1000000 ? s.id : null);
        lineItemWrites.push(
          fetch("/api/reservation-products", {
            method: "POST",
            headers: authenticatedJsonHeaders,
            body: JSON.stringify({
              reservationId: booking.id,
              lineType: "additional_service",
              serviceId: realServiceId ? Number(realServiceId) : null,
              description: s.name,
              qty: 1,
              unitPrice: s.price,
              addedByRole: "receptionist_global_ending",
            }),
          })
        );
      }
      if (totalPulses > 0) {
        const devName = devicesList.find((d) => String(d.id) === String(targetDevId))?.name || "Laser Device";
        lineItemWrites.push(
          fetch("/api/reservation-products", {
            method: "POST",
            headers: authenticatedJsonHeaders,
            body: JSON.stringify({
              reservationId: booking.id,
              lineType: "device_pulses",
              description: `${devName} — ${totalPulses} pulses`,
              qty: totalPulses,
              unitPrice: pricePerPulse,
              addedByRole: "receptionist_global_ending",
            }),
          })
        );
      }
      await Promise.allSettled(lineItemWrites);

      // 7. Update Reservation Status to 'completed' with clinical notes and updated invoice
      const finalInvoiceAmount = calculatedInvoiceTotal;
      const finalAmountLeft = Math.max(0, finalInvoiceAmount - paidAmount);

      // Build structured notes summary
      let updatedNotes = String(booking.notes || "");
      if (additionalServices.length > 0) {
        const addSvcString = `\n[Additional Services Used]: ${additionalServices.map((s) => `${s.name} (Qty: 1 x ${s.price} EGP = ${s.price} EGP)`).join(", ")}`;
        updatedNotes = updatedNotes.replace(/\[Additional Services(?: Used)?(?: During Session)?\]:[^\n\[]*/gi, "").trim() + addSvcString;
      }
      if (usedProducts.length > 0) {
        const prodString = `\n[Products Used During Session]: ${usedProducts.map((p) => `${p.name} (Qty: ${p.qty} x ${p.unitPrice} EGP = ${p.total} EGP)`).join(", ")}`;
        updatedNotes = updatedNotes.replace(/\[Products Used During Session\]:[^\n\[]*/gi, "").trim() + prodString;
      }
      if (totalPulses > 0) {
        const pulseString = `\n[Extra Device Pulses]: ${totalPulses} pulses = ${(Number(extraPulsesCount) || 0) * (Number(pricePerPulse) || 0)} EGP`;
        updatedNotes = updatedNotes.replace(/\[Extra Device Pulses\]:[^\n\[]*/gi, "").trim() + pulseString;
      }

      const patchRes = await fetch(`/api/reservations?id=${encodeURIComponent(booking.id)}`, {
        method: "PATCH",
        headers: authenticatedJsonHeaders,
        body: JSON.stringify({
          id: booking.id,
          status: "completed",
          doctorNotes: clinicalNote || (booking.doctorNotes ?? ""),
          notes: updatedNotes,
          amountLeft: finalAmountLeft,
          total_price: finalInvoiceAmount,
          price: finalInvoiceAmount
        })
      });

      if (patchRes.ok) {
        const updatedBookingData = await patchRes.json().catch(() => ({}));
        setBooking((prev: any) =>
          prev
            ? {
                ...prev,
                ...updatedBookingData,
                status: "completed",
                doctorNotes: clinicalNote || (prev.doctorNotes ?? ""),
                notes: updatedNotes,
                amountLeft: finalAmountLeft,
                total_price: finalInvoiceAmount,
                price: finalInvoiceAmount
              }
            : null
        );

        fetchAllReservations();
        fetchRequests();
        fetchCustomers();
        fetchInventoryProducts();

        alert(isRTL ? "تم إنهاء الجلسة بنجاح! تم حفظ السجلات الطبية وخصم المخزون والنبضات وتحديث الفاتورة." : "Session completed successfully! Clinical records saved, inventory deducted, and invoice updated.");
        setViewMode("details");
      } else {
        const err = await patchRes.json().catch(() => ({}));
        alert(err.error || err.message || "Failed to complete treatment session.");
      }
    } catch (err: any) {
      console.error("Error finalizing session:", err);
      alert(err.message || "Error finalizing treatment session.");
    } finally {
      setFinalizingSession(false);
    }
  };
  return (
    <>
      {booking && (() => {
        const selectedServiceIds: number[] = Array.isArray(booking.serviceIds) 
          ? booking.serviceIds 
          : (booking.serviceId ? [Number(booking.serviceId)] : []);
        
        // Price Details map in EGP
        const prices: Record<number, number> = {
          1: 400, 2: 500, 3: 450, 4: 600, 5: 800, 6: 700, 7: 1500,
          11: 600, 12: 500, 13: 800, 14: 1200, 15: 1500, 16: 1000, 17: 400,
          21: 300, 22: 350, 23: 300,
          31: 400, 32: 350, 33: 400, 34: 500
        };

        const bookingServices = selectedServiceIds.map(id => {
          const s = localServices.find(item => item.id === id);
          return {
            id,
            name: s ? s.en : `Service #${id}`,
            price: s ? getEffectiveServicePrice(s, booking.branchId, branches) : (prices[id] ?? 500)
          };
        });

        const serviceNames = bookingServices.map(bs => bs.name).join(", ");
        const servicesCost = bookingServices.reduce((sum, bs) => sum + bs.price, 0);

        // Compute attached products and additional services from attachedProducts and notes
        const rawAttached: any[] = Array.isArray((booking as any).attachedProducts)
          ? [...(booking as any).attachedProducts]
          : [];

        const additionalServicesList: Array<{ name: string; qty: number; unitPrice: number; total: number; lineType: string }> = [];
        const productsConsumablesList: Array<{ name: string; qty: number; unitPrice: number; total: number; lineType: string; addedBy?: string }> = [];
        const existingNames = new Set<string>();

        // 1. Process structured attachedProducts
        for (const item of rawAttached) {
          const name = String(item.name || 'Item').replace(/^[,\s-]+/, '').trim();
          const qty = Number(item.qty) || 1;
          const unitPrice = Number(item.unitPrice || item.price || 0);
          const total = Number(item.total) || (qty * unitPrice);
          const lineType = item.lineType || (item.serviceId ? 'additional_service' : 'product');

          // Skip zero-cost device pulse counter tracking from billing products list
          const isPulse = lineType === 'device_pulses' || name.toLowerCase().includes('pulse');
          if (isPulse && (total === 0 || unitPrice === 0)) {
            continue;
          }

          if (!existingNames.has(name.toLowerCase())) {
            existingNames.add(name.toLowerCase());
            if (lineType === 'additional_service') {
              additionalServicesList.push({ name, qty, unitPrice, total, lineType });
            } else {
              productsConsumablesList.push({
                name,
                qty,
                unitPrice,
                total,
                lineType,
                addedBy: item.addedBy || (item.added_by_role === 'doctor_session' ? 'Doctor Session' : 'Receptionist')
              });
            }
          }
        }

        // 2. Parse from notes (safety net & historical support)
        if (booking.notes) {
          const notesStr = String(booking.notes);

          // a) Check for [Additional Services Used] or [Additional Services]
          const addSvcBlockMatch = notesStr.match(/\[(?:Additional Services|Extra Services|Services Used|Added Services)(?: Used)?(?: During Session)?\]:\s*([\s\S]*?)(?=\n\s*\[|$)/i);
          if (addSvcBlockMatch) {
            const rawBlock = addSvcBlockMatch[1];
            // Split by comma or newline outside parentheses
            const items = rawBlock.split(/(?:,|\n)(?![^(]*\))/);
            for (const item of items) {
              const trimmed = item.trim();
              if (!trimmed || trimmed.startsWith("[")) continue;
              // Format 1: Name (Qty: 1 x 200 EGP = 200 EGP)
              const m1 = trimmed.match(/^(.+?)\s*\(Qty:\s*(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*EGP\s*=\s*(\d+(?:\.\d+)?)\s*EGP\)/i);
              if (m1) {
                const name = m1[1].replace(/^[,\s-]+/, '').trim();
                const qty = Number(m1[2]) || 1;
                const unitPrice = Number(m1[3]) || 0;
                const total = Number(m1[4]) || (qty * unitPrice);
                if (!existingNames.has(name.toLowerCase())) {
                  existingNames.add(name.toLowerCase());
                  additionalServicesList.push({ name, qty, unitPrice, total, lineType: 'additional_service' });
                }
                continue;
              }
              // Format 2: Name (Qty: 1 x 200 EGP)
              const m2 = trimmed.match(/^(.+?)\s*\(Qty:\s*(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*EGP\)/i);
              if (m2) {
                const name = m2[1].replace(/^[,\s-]+/, '').trim();
                const qty = Number(m2[2]) || 1;
                const unitPrice = Number(m2[3]) || 0;
                const total = qty * unitPrice;
                if (!existingNames.has(name.toLowerCase())) {
                  existingNames.add(name.toLowerCase());
                  additionalServicesList.push({ name, qty, unitPrice, total, lineType: 'additional_service' });
                }
                continue;
              }
              // Format 3: Name - 200 EGP or Name (200 EGP) or Name: 200 EGP or Name @ 200 EGP
              const m3 = trimmed.match(/^(.+?)(?:\s*\(x(\d+)\))?\s*(?:-|\(|\s+at\s+|:\s*|@\s*)(\d+(?:\.\d+)?)\s*(?:EGP|\))/i);
              if (m3) {
                const name = m3[1].replace(/^[,\s-]+/, '').trim();
                const qty = m3[2] ? Number(m3[2]) : 1;
                const total = Number(m3[3]) || 0;
                const unitPrice = qty > 0 ? total / qty : total;
                if (!existingNames.has(name.toLowerCase())) {
                  existingNames.add(name.toLowerCase());
                  additionalServicesList.push({ name, qty, unitPrice, total, lineType: 'additional_service' });
                }
                continue;
              }
            }
          }

          // b) Added Service format: [Added Service]: Name - 350 EGP or [Additional Service]: Name - 200 EGP
          const addedServiceMatches = notesStr.matchAll(/\[(?:Added Service|Additional Service|Extra Service)\]:\s+(.*?)(?=\n|$)/gi);
          for (const match of addedServiceMatches) {
            const rawLine = match[1].trim();
            const m1 = rawLine.match(/^(.+?)\s*\(Qty:\s*(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*EGP\s*=\s*(\d+(?:\.\d+)?)\s*EGP\)/i);
            if (m1) {
              const name = m1[1].replace(/^[,\s-]+/, '').trim();
              const qty = Number(m1[2]) || 1;
              const unitPrice = Number(m1[3]) || 0;
              const total = Number(m1[4]) || (qty * unitPrice);
              if (!existingNames.has(name.toLowerCase())) {
                existingNames.add(name.toLowerCase());
                additionalServicesList.push({ name, qty, unitPrice, total, lineType: 'additional_service' });
              }
              continue;
            }
            const m2 = rawLine.match(/^(.*?)(?:\s*\(x(\d+)\))?\s*(?:-|\(|\s+at\s+|:\s*|@\s*)(\d+(?:\.\d+)?)\s*(?:EGP|\))/i);
            if (m2) {
              const name = m2[1].replace(/^[,\s-]+/, '').trim();
              const qty = m2[2] ? Number(m2[2]) : 1;
              const total = Number(m2[3]);
              const unitPrice = qty > 0 ? total / qty : total;
              if (!existingNames.has(name.toLowerCase())) {
                existingNames.add(name.toLowerCase());
                additionalServicesList.push({ name, qty, unitPrice, total, lineType: 'additional_service' });
              }
              continue;
            }
          }

          // c) Products Used in notes
          const prodBlockMatch = notesStr.match(/\[Products Used During Session\]:\s*([\s\S]*?)(?=\n\s*\[|$)/i);
          if (prodBlockMatch) {
            const rawProdBlock = prodBlockMatch[1];
            const items = rawProdBlock.split(/(?:,|\n)(?![^(]*\))/);
            for (const item of items) {
              const trimmed = item.trim();
              if (!trimmed || trimmed.startsWith("[")) continue;
              const m1 = trimmed.match(/^(.+?)\s*\(Qty:\s*(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*EGP\s*=\s*(\d+(?:\.\d+)?)\s*EGP\)/i);
              if (m1) {
                const name = m1[1].replace(/^[,\s-]+/, '').trim();
                const qty = Number(m1[2]) || 1;
                const unitPrice = Number(m1[3]) || 0;
                const total = Number(m1[4]) || (qty * unitPrice);
                if (!existingNames.has(name.toLowerCase())) {
                  existingNames.add(name.toLowerCase());
                  productsConsumablesList.push({ name, qty, unitPrice, total, lineType: 'product', addedBy: 'Doctor Session' });
                }
                continue;
              }
            }
          }

          // d) Receptionist Added Product: [Added Product]: Name (x2) - 1400 EGP
          const receptionistMatches = notesStr.matchAll(/\[Added Product\]:\s+(.*?)(?:\s*\(x(\d+)\))?\s*-\s+(\d+(?:\.\d+)?)\s+EGP/gi);
          for (const match of receptionistMatches) {
            const name = match[1].replace(/^[,\s-]+/, '').trim();
            const qty = match[2] ? Number(match[2]) : 1;
            const total = Number(match[3]);
            const unitPrice = qty > 0 ? total / qty : total;
            if (!existingNames.has(name.toLowerCase())) {
              existingNames.add(name.toLowerCase());
              productsConsumablesList.push({ name, qty, unitPrice, total, lineType: 'product', addedBy: 'Receptionist' });
            }
          }

          // e) Extra Device Pulses matches
          const pulseMatches = notesStr.matchAll(/\[(?:Extra Device Pulses|Device Pulses Deducted)\]:\s*(.*?)=\s*(\d+(?:\.\d+)?)\s*EGP/gi);
          for (const match of pulseMatches) {
            const name = "Extra Device Pulses";
            const total = parseFloat(match[2]) || 0;
            if (total > 0 && !existingNames.has(name.toLowerCase())) {
              existingNames.add(name.toLowerCase());
              productsConsumablesList.push({ name, qty: 1, unitPrice: total, total, lineType: 'device_pulses', addedBy: 'Doctor Session' });
            }
          }

          // f) Generic format: - Name (x2) @ 700 EGP
          const doctorMatches = notesStr.matchAll(/-\s+(.*?)\s+\(x(\d+)\)\s+@\s+(\d+(?:\.\d+)?)\s+EGP/gi);
          for (const match of doctorMatches) {
            const name = match[1].replace(/^[,\s-]+/, '').trim();
            const qty = Number(match[2]);
            const unitPrice = Number(match[3]);
            const total = qty * unitPrice;
            if (!existingNames.has(name.toLowerCase())) {
              existingNames.add(name.toLowerCase());
              productsConsumablesList.push({ name, qty, unitPrice, total, lineType: 'product', addedBy: 'Doctor Session' });
            }
          }
        }

        // 3. Fallback reconciliation: If notes or booking balance recorded a higher invoice total than the sum of parsed lines,
        // recover the missing additional services / session adjustments difference!
        const baseAndAttachedTotal = servicesCost + additionalServicesList.reduce((sum, s) => sum + s.total, 0) + productsConsumablesList.reduce((sum, p) => sum + p.total, 0);
        let targetInvoiceTotal = baseAndAttachedTotal;

        if (booking.notes) {
          const invMatch = String(booking.notes).match(/\[(?:Invoice Total Updated|Total Invoice|Final Invoice|Updated Invoice Total|Total Price|Invoice Total)\]:\s*(\d+(?:\.\d+)?)\s*EGP|Invoice Value:\s*(\d+(?:\.\d+)?)\s*EGP/i);
          if (invMatch) {
            const notedTotal = Number(invMatch[1] || invMatch[2]);
            if (notedTotal > targetInvoiceTotal) {
              targetInvoiceTotal = notedTotal;
            }
          }
        }

        const rawPaid = Number(booking.amountPaid || (booking as any).amount_paid || 0);
        const rawLeft = (booking as any).amountLeft ?? (booking as any).amount_left;
        const additionalServicesCost = additionalServicesList.reduce((sum, s) => sum + s.total, 0);
        const productsCost = productsConsumablesList.reduce((sum, p) => sum + p.total, 0);
        const calculatedTotal = servicesCost + additionalServicesCost + productsCost;
        const totalPrice = Math.max(
          calculatedTotal,
          targetInvoiceTotal,
          rawPaid + (rawLeft !== null && rawLeft !== undefined && !isNaN(Number(rawLeft)) ? Number(rawLeft) : 0)
        );

        const sessionPaid = rawPaid;
        const sessionLeft = (rawLeft !== null && rawLeft !== undefined && !isNaN(Number(rawLeft)))
          ? Number(rawLeft)
          : Math.max(0, totalPrice - sessionPaid);

        const isInvoicePaid = (rawLeft !== null && rawLeft !== undefined && Number(rawLeft) <= 0 && sessionPaid > 0) || (sessionLeft <= 0 && sessionPaid > 0) || (sessionPaid >= totalPrice && totalPrice > 0);

        // Primary effective service for end session
        const primaryServiceObj = localServices.find(
          (s) => String(s.id) === String(primaryServiceId || booking.serviceId || (booking.serviceIds && booking.serviceIds[0])) ||
                 (s.en && s.en === ((booking as any).service || (booking as any).service_name)) ||
                 (s.ar && s.ar === ((booking as any).service || (booking as any).service_name))
        );
        const baseBookingPrice = primaryServiceObj 
          ? getEffectiveServicePrice(primaryServiceObj, booking.branchId, branches)
          : (servicesCost || Number((booking as any).total_price || (booking as any).price || 0) || 500);

        const additionalServicesSubtotal = additionalServices.reduce((sum, item) => sum + Number(item.price || 0), 0);
        const productsSubtotal = usedProducts.reduce((sum, item) => sum + Number(item.total || 0), 0);
        const extraPulsesSubtotal = (Number(extraPulsesCount) || 0) * (Number(pricePerPulse) || 0);
        const additionalPulsesTotal = additionalServices.reduce((sum, item) => sum + Number(item.pulses || 0), 0);
        const totalSessionPulses = (Number(extraPulsesCount) || 0) + additionalPulsesTotal;
        const endSessionInvoiceTotal = baseBookingPrice + additionalServicesSubtotal + productsSubtotal + extraPulsesSubtotal;
        const endSessionAmountLeft = Math.max(0, endSessionInvoiceTotal - sessionPaid);

        // First visit check
        const customerRecord = (dbCustomers || []).find((c: any) =>
          (booking.customerId && String(c.id) === String(booking.customerId)) ||
          ((booking as any).customer_id && String(c.id) === String((booking as any).customer_id)) ||
          (booking.phone && c.phone === booking.phone)
        );
        const pastVisitsCount = Number(customerRecord?.visit_count ?? customerRecord?.visitCount ?? customerRecord?.total_bookings ?? 0);
        const isFirstVisit = !medicalRecord && pastVisitsCount <= 1;
        const isReturningPatient = !!medicalRecord || pastVisitsCount > 1;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-5 animate-fadeIn">
            <div className="w-full max-w-6xl rounded-[32px] bg-[#FBFBF9] p-6 sm:p-8 shadow-[0_20px_60px_rgba(31,37,26,0.25)] max-h-[92vh] overflow-y-auto custom-scrollbar border border-[#414E36]/15 space-y-6">
              
              {viewMode === "end_session" ? (
                /* ── COMPREHENSIVE CLINICAL INTAKE & SESSION FINALIZATION VIEW ── */
                <div className="space-y-6 w-full animate-fadeIn">
                  {/* TOP BAR WITH BACK BUTTON */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#414E36]/10 pb-5">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setViewMode("details")}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white hover:bg-[#F4F5F1] text-[#414E36] border border-[#414E36]/20 font-bold text-xs transition shadow-2xs cursor-pointer group"
                      >
                        <ChevronLeft size={16} className={`transition-transform group-hover:-translate-x-0.5 ${isRTL ? "rotate-180 group-hover:translate-x-0.5" : ""}`} />
                        <span>{isRTL ? "العودة إلى تفاصيل الحجز" : "Back to Booking Details"}</span>
                      </button>

                      <div>
                        <h2 className="text-xl sm:text-2xl font-black text-[#1F251A] tracking-tight flex items-center gap-2">
                          <span>{isRTL ? "إنهاء الجلسة وتسجيل الفحوصات الطبية" : "Clinical Session Finalization"}</span>
                          <span className="text-xs font-mono font-bold text-[#414E36] bg-[#EDF1EC] px-2.5 py-0.5 rounded-full">
                            #{booking.id}
                          </span>
                        </h2>
                        <p className="text-xs text-[#5A6A51] mt-0.5">
                          {isRTL ? "تسجيل الملاحظات والروشتة والأدوية وإنهاء الجلسة فورياً" : "Fill medical intake, write prescriptions, attach extra services/products, and end session."}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        setIsEditingService(false);
                      }}
                      className="h-9 w-9 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-800 flex items-center justify-center transition cursor-pointer shrink-0 self-end sm:self-auto"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* PATIENT HEADER BANNER */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl bg-gradient-to-r from-emerald-900 via-[#2C3524] to-[#414E36] p-5 sm:p-6 text-white shadow-md">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="flex h-13 w-13 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md text-white font-black text-xl border border-white/20 shadow-inner">
                        {(booking.name || "P").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg sm:text-xl font-black text-white truncate">
                            {booking.name || "Patient"}
                          </h3>
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 border border-emerald-400/40 px-3 py-0.5 text-[11px] font-bold text-emerald-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            {isRTL ? "جلسة نشطة • إنهاء الجلسة عبر الاستقبال" : "Live Session • Reception Finalization"}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-white/80 mt-1 font-medium">
                          <span>{booking.phone || "No phone"}</span>
                          <span>•</span>
                          <span className="text-emerald-200 font-bold">{(booking as any).service || (primaryServiceObj ? (isRTL ? primaryServiceObj.ar : primaryServiceObj.en) : "Clinical Service")}</span>
                          <span>•</span>
                          <span>{booking.date || "Today"} ({(booking as any).time || booking.timeSlot || ""})</span>
                          <span>•</span>
                          <span>{(booking as any).room || "Room 1"}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2-COLUMN CLINICAL GRID */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* LEFT COLUMN (1/3 Width): Medical Record & Clinical Notes */}
                    <div className="space-y-5">
                      {/* Medical Record Card */}
                      <div className="rounded-3xl border border-[#414E36]/10 bg-white p-5 sm:p-6 shadow-xs space-y-4">
                        <div className="flex items-center justify-between gap-2 flex-wrap border-b border-[#414E36]/10 pb-3">
                          <div className="space-y-0.5">
                            <h3 className="text-xs sm:text-sm font-bold text-[#1F251A] uppercase tracking-wider flex items-center gap-2">
                              <AlertCircle size={16} className="text-[#414E36]" />
                              <span>{isRTL ? "السجل الطبي للمريض" : "Patient Medical Record"}</span>
                            </h3>
                            {activeTemplate && (
                              <span className="text-[10px] font-extrabold text-[#414E36] bg-[#EDF1EC] px-2 py-0.5 rounded-md inline-block">
                                {activeTemplate.title}
                              </span>
                            )}
                          </div>

                          {medicalRecord ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 shrink-0">
                              <CheckCircle2 size={10} /> {isRTL ? "مسجل بالملف" : "On File"}
                            </span>
                          ) : isFirstVisit ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold text-rose-800 shrink-0 animate-pulse">
                              <AlertTriangle size={10} /> {isRTL ? "مطلوب (زيارة أولى)" : "Intake Required (1st Visit)"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200 shrink-0">
                              <CheckCircle2 size={10} /> {isRTL ? "مريض سابق" : "Returning Patient"}
                            </span>
                          )}
                        </div>

                        {medicalRecordLoading || loadingTemplate ? (
                          <p className="text-xs text-[#5A6A51] flex items-center gap-1.5 py-4 justify-center">
                            <Loader2 size={14} className="animate-spin text-[#414E36]" />
                            <span>{isRTL ? "جاري تحميل السجل الطبي..." : "Loading medical record..."}</span>
                          </p>
                        ) : medicalRecord && !showMedicalForm ? (
                          /* Display Existing Record */
                          <div className="space-y-2.5 text-xs bg-[#FBFBF9] p-3.5 sm:p-4 rounded-2xl border border-[#414E36]/10">
                            {(activeTemplate?.fields || []).length > 0 ? (
                              (activeTemplate?.fields || []).map((f: any) => {
                                const rawVal = medicalRecord.responses?.[f.id] !== undefined
                                  ? medicalRecord.responses[f.id]
                                  : (f.id === "skin_type" ? medicalRecord.skin_type
                                    : f.id === "allergies" ? medicalRecord.allergies
                                    : f.id === "medications" ? medicalRecord.medication_details
                                    : f.id === "medical_conditions" ? medicalRecord.medical_conditions_details
                                    : f.id === "previous_treatments" ? medicalRecord.previous_treatments_details
                                    : undefined);

                                const displayVal = typeof rawVal === "boolean"
                                  ? (rawVal ? "Yes" : "No")
                                  : (rawVal || "None reported");

                                return (
                                  <div key={f.id} className="flex justify-between items-start gap-2 border-b border-[#414E36]/10 pb-2 last:border-b-0 last:pb-0">
                                    <span className="font-bold text-[#5A6A51]">{f.label}:</span>
                                    <span className={`font-semibold text-right ${f.id === "allergies" || f.id === "laser_contraindications" || f.id === "bleeding_disorders" ? "text-rose-700 font-bold" : "text-[#1F251A]"}`}>
                                      {displayVal}
                                    </span>
                                  </div>
                                );
                              })
                            ) : (
                              <>
                                <div className="flex justify-between border-b border-[#414E36]/10 pb-2">
                                  <span className="font-bold text-[#5A6A51]">{isRTL ? "نوع البشرة" : "Skin Type"}:</span>
                                  <span className="font-bold text-[#1F251A]">{medicalRecord.skin_type || "Normal"}</span>
                                </div>
                                <div className="flex justify-between border-b border-[#414E36]/10 pb-2">
                                  <span className="font-bold text-[#5A6A51]">{isRTL ? "الحساسية" : "Allergies"}:</span>
                                  <span className="font-bold text-rose-700">{medicalRecord.allergies || "None reported"}</span>
                                </div>
                                <div className="flex justify-between border-b border-[#414E36]/10 pb-2">
                                  <span className="font-bold text-[#5A6A51]">{isRTL ? "الأدوية الحالية" : "Current Medications"}:</span>
                                  <span className="font-semibold text-[#1F251A]">{medicalRecord.medication_details || "None"}</span>
                                </div>
                                <div className="flex justify-between border-b border-[#414E36]/10 pb-2">
                                  <span className="font-bold text-[#5A6A51]">{isRTL ? "الحالات المزمنة" : "Medical Conditions"}:</span>
                                  <span className="font-semibold text-[#1F251A]">{medicalRecord.medical_conditions_details || "None"}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="font-bold text-[#5A6A51]">{isRTL ? "علاجات سابقة" : "Previous Treatments"}:</span>
                                  <span className="font-semibold text-[#1F251A]">{medicalRecord.previous_treatments_details || "None"}</span>
                                </div>
                              </>
                            )}

                            <button
                              type="button"
                              onClick={() => setShowMedicalForm(true)}
                              className="mt-2 flex items-center gap-1.5 text-xs font-bold text-[#414E36] hover:underline cursor-pointer"
                            >
                              <Edit size={14} /> {isRTL ? "تعديل بيانات السجل الطبي" : "Update Medical Record"}
                            </button>
                          </div>
                        ) : (
                          /* Medical Intake Form */
                          <div className="space-y-3 border-t border-[#414E36]/10 pt-3">
                            {isFirstVisit ? (
                              <div className="rounded-2xl bg-amber-50 p-3 text-xs text-amber-900 border border-amber-200">
                                <strong className="block font-bold">{isRTL ? "تم اكتشاف زيارة أولى" : "First Visit Detected"}</strong>
                                {isRTL ? "تسجيل الفحص الطبي مطلوب إجبارياً لتسجيل المريض لأول مرة." : "Medical intake form is required for first-time patient registration."}
                              </div>
                            ) : !medicalRecord && isReturningPatient ? (
                              <div className="rounded-2xl bg-[#EDF1EC] p-3 text-xs text-[#414E36] border border-[#414E36]/15">
                                <strong className="block font-bold">{isRTL ? "مريض سابق" : "Returning Patient"}</strong>
                                {isRTL ? "سجل المريض الطبي متاح سابقاً. يمكنك تدوين ملاحظات جديدة أو المتابعة مباشرة." : "Previous patient clinical history is on file. You can record specialized intake notes or proceed directly."}
                              </div>
                            ) : null}

                            {(activeTemplate?.fields || []).length > 0 ? (
                              (activeTemplate?.fields || []).map((f: any) => (
                                <div key={f.id}>
                                  <label className="block text-[11px] font-bold text-[#5A6A51] mb-1">
                                    {f.label} {f.required && <span className="text-red-500">*</span>}
                                  </label>
                                  {f.type === "select" ? (
                                    <select
                                      value={dynamicResponses[f.id] || (f.options?.[0] || "")}
                                      onChange={(e) => setDynamicResponses({ ...dynamicResponses, [f.id]: e.target.value })}
                                      className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2 text-xs font-bold text-[#1F251A] outline-none"
                                    >
                                      {(f.options || []).map((opt: string) => (
                                        <option key={opt} value={opt}>{opt}</option>
                                      ))}
                                    </select>
                                  ) : f.type === "textarea" ? (
                                    <textarea
                                      rows={2}
                                      value={dynamicResponses[f.id] || ""}
                                      onChange={(e) => setDynamicResponses({ ...dynamicResponses, [f.id]: e.target.value })}
                                      placeholder={f.placeholder || "Enter details..."}
                                      className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] p-2.5 text-xs text-[#1F251A] outline-none"
                                    />
                                  ) : f.type === "checkbox" ? (
                                    <label className="flex items-center gap-2 p-2.5 rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] text-xs font-semibold text-[#1F251A] cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={Boolean(dynamicResponses[f.id])}
                                        onChange={(e) => setDynamicResponses({ ...dynamicResponses, [f.id]: e.target.checked })}
                                        className="h-4 w-4 rounded accent-[#414E36]"
                                      />
                                      <span>{isRTL ? "نعم / مؤكد" : "Yes / Confirmed"}</span>
                                    </label>
                                  ) : (
                                    <input
                                      type={f.type === "number" ? "number" : "text"}
                                      value={dynamicResponses[f.id] || ""}
                                      onChange={(e) => setDynamicResponses({ ...dynamicResponses, [f.id]: e.target.value })}
                                      placeholder={f.placeholder || "Enter details..."}
                                      className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2 text-xs text-[#1F251A] outline-none"
                                    />
                                  )}
                                </div>
                              ))
                            ) : (
                              <>
                                <div>
                                  <label className="block text-[11px] font-bold text-[#5A6A51] mb-1">{isRTL ? "نوع البشرة" : "Skin Type"}</label>
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
                                  <label className="block text-[11px] font-bold text-[#5A6A51] mb-1">{isRTL ? "الحساسية" : "Known Allergies"}</label>
                                  <input
                                    type="text"
                                    placeholder="e.g. Latex, Aspirin, None"
                                    value={formAllergies}
                                    onChange={(e) => setFormAllergies(e.target.value)}
                                    className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2 text-xs text-[#1F251A] outline-none"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[11px] font-bold text-[#5A6A51] mb-1">{isRTL ? "الأدوية الحالية" : "Current Daily Medications"}</label>
                                  <input
                                    type="text"
                                    placeholder="e.g. Roaccutane, Blood thinners, None"
                                    value={formMedicationDetails}
                                    onChange={(e) => setFormMedicationDetails(e.target.value)}
                                    className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2 text-xs text-[#1F251A] outline-none"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[11px] font-bold text-[#5A6A51] mb-1">{isRTL ? "الحالات المزمنة" : "Medical Conditions"}</label>
                                  <input
                                    type="text"
                                    placeholder="e.g. Diabetes, Eczema, None"
                                    value={formMedicalConditionsDetails}
                                    onChange={(e) => setFormMedicalConditionsDetails(e.target.value)}
                                    className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2 text-xs text-[#1F251A] outline-none"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[11px] font-bold text-[#5A6A51] mb-1">{isRTL ? "علاجات سابقة" : "Previous Treatments"}</label>
                                  <input
                                    type="text"
                                    placeholder="e.g. Chemical Peel 3 mos ago, None"
                                    value={formPreviousTreatmentsDetails}
                                    onChange={(e) => setFormPreviousTreatmentsDetails(e.target.value)}
                                    className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2 text-xs text-[#1F251A] outline-none"
                                  />
                                </div>
                              </>
                            )}

                            <div className="flex justify-end gap-2 pt-2">
                              {medicalRecord && (
                                <button
                                  type="button"
                                  onClick={() => setShowMedicalForm(false)}
                                  className="rounded-xl border border-[#414E36]/20 bg-white px-3 py-1.5 text-xs font-bold text-[#5A6A51] cursor-pointer"
                                >
                                  {isRTL ? "إلغاء" : "Cancel"}
                                </button>
                              )}
                              <button
                                type="button"
                                disabled={savingMedicalRecord}
                                onClick={() => handleSaveMedicalRecordStandalone()}
                                className="rounded-xl bg-[#414E36] px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-[#343F2B] transition disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                              >
                                <Save size={14} /> {savingMedicalRecord ? "..." : (isRTL ? "حفظ السجل الطبي" : "Save Medical Record")}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* CLINICAL PROCEDURE NOTES */}
                        <div className="mt-4 border-t border-[#414E36]/10 pt-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="block text-xs font-bold text-[#1F251A] uppercase tracking-wider flex items-center gap-1.5">
                              <FileText size={14} className="text-[#414E36]" />
                              <span>{isRTL ? "ملاحظات الطبيب والإجراءات" : "Doctor / Procedure Notes"}</span>
                            </label>
                            <button
                              type="button"
                              onClick={handleSaveClinicalNoteStandalone}
                              disabled={savingClinicalNote}
                              className="rounded-xl bg-[#414E36] px-3 py-1 text-xs font-bold text-white shadow-sm hover:bg-[#343F2B] transition disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                            >
                              <Save size={12} /> {savingClinicalNote ? "..." : (isRTL ? "حفظ الملاحظات" : "Save Notes")}
                            </button>
                          </div>
                          <textarea
                            rows={3}
                            value={clinicalNote}
                            onChange={(e) => setClinicalNote(e.target.value)}
                            placeholder={isRTL ? "أدخل تفاصيل وملاحظات الجلسة والإرشادات..." : "Enter clinical findings, device settings, observations..."}
                            className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] p-3 text-xs text-[#1F251A] outline-none focus:border-[#414E36]"
                          />
                        </div>

                        {/* RECEPTION BOOKING NOTES PREVIEW */}
                        <div className="mt-3 border-t border-[#414E36]/10 pt-3 space-y-1.5">
                          <span className="text-[11px] font-bold text-[#5A6A51]">{isRTL ? "ملاحظات الاستقبال الأصلية" : "Original Booking Notes"}</span>
                          <p className="text-xs text-[#1F251A] bg-[#F4F5F1] p-3 rounded-2xl font-mono leading-relaxed">
                            {(booking.receptionNotes ?? (booking as any).reception_notes) || booking.notes || (isRTL ? "لا توجد ملاحظات سابقة" : "No booking notes")}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT COLUMN (2/3 Width): Prescription + Services/Pulses + Products + Invoice */}
                    <div className="lg:col-span-2 space-y-5">
                      
                      {/* 1. DIGITAL PRESCRIPTION WRITER */}
                      <div className="rounded-3xl border border-[#414E36]/12 bg-white p-5 sm:p-6 shadow-xs space-y-4">
                        <div className="flex items-center justify-between border-b border-[#414E36]/10 pb-3 flex-wrap gap-2">
                          <div>
                            <h3 className="text-xs sm:text-sm font-bold text-[#1F251A] uppercase tracking-wider flex items-center gap-2">
                              <Pill size={16} className="text-[#414E36]" />
                              <span>{isRTL ? "كتابة الروشتة الطبية الإلكترونية" : "Digital Prescription Writer"}</span>
                            </h3>
                            <p className="text-xs text-[#5A6A51] mt-0.5">
                              {isRTL ? "المريض" : "Patient"}: <strong className="text-[#414E36]">{booking.name || "Patient"}</strong>
                            </p>
                          </div>
                        </div>

                        <form onSubmit={handleSaveInlinePrescription} className="space-y-4">
                          <div>
                            <label className="block text-xs font-bold text-[#5A6A51] mb-1">{isRTL ? "التشخيص الطبي" : "Clinical Diagnosis"}</label>
                            <input
                              type="text"
                              placeholder={isRTL ? "مثال: التهاب ما بعد الليزر، حب شباب درجة ثانية" : "e.g. Post-laser erythema, Acne Vulgaris Grade II"}
                              value={rxDiagnosis}
                              onChange={(e) => setRxDiagnosis(e.target.value)}
                              className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2 text-xs text-[#1F251A] outline-none focus:border-[#414E36]"
                            />
                          </div>

                          {/* Medications List */}
                          <div className="space-y-2">
                            <label className="block text-xs font-bold text-[#5A6A51]">{isRTL ? "الأدوية الموصوفة" : "Prescribed Medications"}</label>
                            {rxMedications.map((med, idx) => (
                              <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                                <input
                                  type="text"
                                  placeholder={isRTL ? "اسم الدواء" : "Medication Name"}
                                  value={med.name}
                                  onChange={(e) => {
                                    const updated = [...rxMedications];
                                    updated[idx].name = e.target.value;
                                    setRxMedications(updated);
                                  }}
                                  className="rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-1.5 text-xs text-[#1F251A] outline-none"
                                />
                                <input
                                  type="text"
                                  placeholder={isRTL ? "الجرعة" : "Dosage (e.g. 500mg)"}
                                  value={med.dosage}
                                  onChange={(e) => {
                                    const updated = [...rxMedications];
                                    updated[idx].dosage = e.target.value;
                                    setRxMedications(updated);
                                  }}
                                  className="rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-1.5 text-xs text-[#1F251A] outline-none"
                                />
                                <input
                                  type="text"
                                  placeholder={isRTL ? "التكرار" : "Frequency (e.g. 2x daily)"}
                                  value={med.frequency}
                                  onChange={(e) => {
                                    const updated = [...rxMedications];
                                    updated[idx].frequency = e.target.value;
                                    setRxMedications(updated);
                                  }}
                                  className="rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-1.5 text-xs text-[#1F251A] outline-none"
                                />
                                <input
                                  type="text"
                                  placeholder={isRTL ? "المدة" : "Duration (e.g. 5 days)"}
                                  value={med.duration}
                                  onChange={(e) => {
                                    const updated = [...rxMedications];
                                    updated[idx].duration = e.target.value;
                                    setRxMedications(updated);
                                  }}
                                  className="rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-1.5 text-xs text-[#1F251A] outline-none"
                                />
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => setRxMedications([...rxMedications, { name: "", dosage: "", frequency: "", duration: "" }])}
                              className="text-xs font-bold text-[#414E36] flex items-center gap-1 mt-1 hover:underline cursor-pointer"
                            >
                              <Plus size={14} /> {isRTL ? "+ إضافة دواء آخر" : "+ Add Another Medication"}
                            </button>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-[#5A6A51] mb-1">{isRTL ? "إرشادات وتعليمات المريض" : "General Patient Instructions"}</label>
                            <textarea
                              rows={2}
                              placeholder={isRTL ? "مثال: استخدام واقي شمس SPF 50 يومياً، تجنب الشمس المباشرة 48 ساعة..." : "e.g. Apply sunscreen SPF 50 daily, avoid direct sun exposure for 48 hours..."}
                              value={rxGeneralNotes}
                              onChange={(e) => setRxGeneralNotes(e.target.value)}
                              className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] p-3 text-xs text-[#1F251A] outline-none focus:border-[#414E36]"
                            />
                          </div>

                          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                const rxPayload = {
                                  patient_name: booking.name,
                                  doctor_name: booking.doctorName,
                                  diagnosis: rxDiagnosis,
                                  medications: rxMedications.filter((m) => m.name.trim()),
                                  general_notes: rxGeneralNotes,
                                  date: new Date().toISOString().slice(0, 10)
                                };
                                handleSendPrescriptionWhatsApp(rxPayload, booking);
                              }}
                              className="rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 px-4 py-2 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                            >
                              <Send size={13} /> {isRTL ? "إرسال عبر واتساب" : "Send WhatsApp Rx"}
                            </button>
                            <button
                              type="submit"
                              disabled={savingRxInline}
                              className="rounded-xl bg-[#414E36] px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#343F2B] transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                            >
                              <Printer size={14} /> {savingRxInline ? "..." : (isRTL ? "حفظ وطباعة الروشتة" : "Save & Print Rx")}
                            </button>
                          </div>
                        </form>
                      </div>

                      {/* 2. SERVICES, DEVICES & PULSES MANAGER */}
                      <div className="rounded-3xl border border-[#414E36]/10 bg-white p-5 sm:p-6 shadow-xs space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#414E36]/10 pb-3">
                          <h3 className="text-xs sm:text-sm font-bold text-[#1F251A] uppercase tracking-wider flex items-center gap-2">
                            <Zap size={16} className="text-amber-600" />
                            <span>{isRTL ? "الخدمات الإضافية ونبضات الأجهزة" : "Services, Devices & Pulses"}</span>
                          </h3>

                          {(selectedDeviceId || additionalServices.some((s) => s.deviceId)) && (
                            <div className="flex items-center gap-2 rounded-2xl bg-amber-50 border border-amber-200 px-3.5 py-1.5 text-xs font-black text-amber-900 shadow-xs">
                              <Zap size={14} className="text-amber-600 fill-amber-500 animate-pulse" />
                              <span>{isRTL ? "إجمالي النبضات:" : "Total Pulses:"}</span>
                              <span className="text-sm text-amber-900 font-extrabold">{totalSessionPulses}</span>
                            </div>
                          )}
                        </div>

                        {/* Primary Service Display */}
                        <div className="rounded-2xl bg-[#FBFBF9] p-4 border border-[#414E36]/10 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-[#5A6A51] flex items-center gap-1.5">
                              <Layers size={14} className="text-[#414E36]" />
                              <span>{isRTL ? "الخدمة الأساسية المحجوزة" : "Primary Reserved Service"}</span>
                            </span>
                            <span className="font-extrabold text-[#414E36]">{baseBookingPrice} EGP</span>
                          </div>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs bg-white p-3 rounded-xl border border-[#414E36]/10 gap-2">
                            <div className="flex-1 w-full">
                              <label className="block text-[10px] font-bold text-[#5A6A51] mb-1">
                                {isRTL ? "تعديل الخدمة الأساسية للجلسة" : "Selected Patient Service (Changeable)"}
                              </label>
                              <select
                                value={primaryServiceId}
                                onChange={(e) => setPrimaryServiceId(e.target.value)}
                                className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-1.5 text-xs font-bold text-[#1F251A] outline-none"
                              >
                                {localServices.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {isRTL ? (s.ar || s.en) : (s.en || s.ar)} ({getEffectiveServicePrice(s, booking?.branchId, branches)} EGP)
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Additional Services Manager */}
                        <div className="space-y-3 bg-[#FBFBF9] p-4 rounded-2xl border border-[#414E36]/10">
                          <h4 className="text-xs font-bold text-[#1F251A] uppercase tracking-wider flex items-center gap-1.5">
                            <Plus size={14} className="text-[#414E36]" />
                            <span>{isRTL ? "إضافة خدمة إضافية للجلسة" : "Add Additional Service"}</span>
                          </h4>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <select
                              value={selectedServiceIdToAdd}
                              onChange={(e) => setSelectedServiceIdToAdd(e.target.value)}
                              className="sm:col-span-2 rounded-xl border border-[#414E36]/15 bg-white px-3 py-2 text-xs font-bold text-[#1F251A] outline-none"
                            >
                              <option value="">{isRTL ? "-- اختر الخدمة --" : "-- Select Additional Service --"}</option>
                              {localServices.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {isRTL ? (s.ar || s.en) : (s.en || s.ar)} ({getEffectiveServicePrice(s, booking?.branchId, branches)} EGP)
                                </option>
                              ))}
                            </select>

                            <select
                              value={selectedDeviceForService}
                              onChange={(e) => setSelectedDeviceForService(e.target.value)}
                              className="rounded-xl border border-[#414E36]/15 bg-white px-3 py-2 text-xs font-bold text-[#1F251A] outline-none"
                            >
                              <option value="">{isRTL ? "-- ربط الجهاز (اختياري) --" : "-- Linked Device --"}</option>
                              {devicesList.map((d) => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                              ))}
                            </select>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] font-bold text-[#5A6A51] mb-1">
                                {isRTL ? "عدد نبضات الجهاز" : "Device Pulses"}
                              </label>
                              <input
                                type="number"
                                min={0}
                                value={pulsesCountForService}
                                onChange={(e) => setPulsesCountForService(Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-1.5 text-xs font-bold text-[#1F251A] outline-none"
                                placeholder="Pulses (e.g. 150)"
                              />
                            </div>

                            <div className="flex items-end">
                              <button
                                type="button"
                                onClick={handleAddServiceToSession}
                                disabled={!selectedServiceIdToAdd}
                                className="w-full rounded-xl bg-[#414E36] py-2 text-xs font-bold text-white hover:bg-[#343F2B] transition disabled:opacity-50 flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <Plus size={14} /> {isRTL ? "إضافة الخدمة" : "Add Service"}
                              </button>
                            </div>
                          </div>

                          {/* Added Additional Services List */}
                          {additionalServices.length > 0 && (
                            <div className="space-y-2 pt-2 border-t border-[#414E36]/10">
                              {additionalServices.map((item) => (
                                <div key={item.id} className="flex items-center justify-between text-xs bg-white p-3 rounded-xl border border-[#414E36]/10 gap-2">
                                  <div className="min-w-0">
                                    <span className="font-bold text-[#1F251A] block truncate">{item.name}</span>
                                    <span className="text-[10px] text-[#5A6A51] block truncate">
                                      {item.deviceName ? `${item.deviceName} • ` : ""}{item.pulses} Pulses
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 shrink-0">
                                    <span className="font-extrabold text-[#414E36]">+{item.price} EGP</span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveServiceFromSession(item.id)}
                                      className="text-rose-600 hover:text-rose-800 text-xs font-bold cursor-pointer p-1"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 3. PRODUCTS & CONSUMABLES USED */}
                      <div className="rounded-3xl border border-[#414E36]/10 bg-white p-5 sm:p-6 shadow-xs space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#414E36]/10 pb-3">
                          <h3 className="text-xs sm:text-sm font-bold text-[#1F251A] uppercase tracking-wider flex items-center gap-2">
                            <ShoppingBag size={16} className="text-[#414E36]" />
                            <span>{isRTL ? "المنتجات والمستهلكات المستخدمة" : "Products & Consumables Used"}</span>
                          </h3>
                        </div>

                        <div className="space-y-3 bg-[#FBFBF9] p-4 rounded-2xl border border-[#414E36]/10">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <select
                              value={selectedSessionProductId}
                              onChange={(e) => setSelectedSessionProductId(e.target.value)}
                              className="sm:col-span-2 rounded-xl border border-[#414E36]/15 bg-white px-3 py-2 text-xs font-bold text-[#1F251A] outline-none"
                            >
                              <option value="">{isRTL ? "-- اختر المنتج --" : "-- Select Product / Consumable --"}</option>
                              {(inventoryProducts || []).map((p: any) => {
                                const isOutOfStock = Number(p.stock_quantity ?? p.stockQuantity ?? p.stock ?? p.quantity ?? 0) <= 0 || p.status === "Out of Stock";
                                return (
                                  <option key={p.id} value={p.id} disabled={isOutOfStock}>
                                    {p.name} ({p.price || p.unit_price || p.selling_price || 0} EGP){isOutOfStock ? " — Out of Stock" : ""}
                                  </option>
                                );
                              })}
                            </select>

                            <input
                              type="number"
                              min={1}
                              value={selectedSessionProductQty}
                              onChange={(e) => setSelectedSessionProductQty(Math.max(1, parseInt(e.target.value) || 1))}
                              className="rounded-xl border border-[#414E36]/15 bg-white px-3 py-2 text-xs font-bold text-[#1F251A] outline-none"
                              placeholder="Qty"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={handleAddProductToSession}
                            disabled={!selectedSessionProductId}
                            className="w-full rounded-xl bg-[#414E36] py-2 text-xs font-bold text-white hover:bg-[#343F2B] transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1"
                          >
                            <Plus size={14} /> {isRTL ? "إضافة المنتج للفاتورة وخصمه من المخزون" : "Add Product to Invoice & Deduct Stock"}
                          </button>

                          {usedProducts.length > 0 && (
                            <div className="space-y-1.5 pt-2 border-t border-[#414E36]/10">
                              {usedProducts.map((item, i) => (
                                <div key={i} className="flex items-center justify-between text-xs bg-white p-2.5 rounded-xl border border-[#414E36]/10 gap-2">
                                  <div className="min-w-0">
                                    <span className="font-bold text-[#1F251A] block truncate">{item.name}</span>
                                    <span className="text-[10px] text-[#5A6A51] block truncate">Qty: {item.qty} x {item.unitPrice} EGP</span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="font-extrabold text-[#414E36]">+{item.total} EGP</span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveProductFromSession(i)}
                                      className="text-rose-600 hover:text-rose-800 text-xs font-bold cursor-pointer p-1"
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* FINAL SESSION INVOICE SUMMARY */}
                        <div className="bg-[#414E36]/05 p-4 rounded-2xl space-y-2 text-xs border border-[#414E36]/10">
                          <div className="flex flex-wrap items-center justify-between gap-3 text-[#5A6A51]">
                            <span>{isRTL ? "الخدمة الأساسية:" : "Base Service:"} <strong className="text-[#1F251A]">{baseBookingPrice} EGP</strong></span>
                            {additionalServicesSubtotal > 0 && (
                              <span>{isRTL ? "خدمات إضافية:" : "Extra Services:"} <strong className="text-[#1F251A]">+{additionalServicesSubtotal} EGP</strong></span>
                            )}
                            {productsSubtotal > 0 && (
                              <span>{isRTL ? "منتجات ومستهلكات:" : "Products:"} <strong className="text-[#1F251A]">+{productsSubtotal} EGP</strong></span>
                            )}
                          </div>
                          <div className="pt-2 border-t border-[#414E36]/10 flex items-center justify-between text-[#414E36] font-extrabold text-sm sm:text-base">
                            <span>{isRTL ? "إجمالي فاتورة الجلسة النهائية:" : "Final Session Invoice:"}</span>
                            <span>{endSessionInvoiceTotal} EGP</span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-[#5A6A51] pt-1">
                            <span>{isRTL ? "المدفوع مسبقاً:" : "Paid:"} <strong className="text-emerald-700">{sessionPaid} EGP</strong></span>
                            <span>{isRTL ? "المتبقي للتحصيل:" : "Outstanding:"} <strong className={endSessionAmountLeft > 0 ? "text-rose-700 font-bold" : "text-emerald-700 font-bold"}>{endSessionAmountLeft} EGP</strong></span>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* BOTTOM CONFIRMATION BAR */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-3xl bg-white p-5 border border-[#414E36]/15 shadow-sm">
                    <div className="space-y-0.5 text-xs text-[#5A6A51]">
                      <p className="font-bold text-[#1F251A]">
                        {isRTL ? "تأكيد الإنهاء النهائي للجلسة" : "Confirm Session Termination"}
                      </p>
                      <p>
                        {isRTL ? "سيتم حفظ كافة البيانات وخصم المخزون والنبضات وإنهاء الجلسة فورياً لدى شاشة الطبيب دون إعادة تحميل" : "Persists intake, Rx, stock sales, pulses, and terminates doctor session in real-time."}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => setViewMode("details")}
                        className="w-full sm:w-auto px-5 py-3 rounded-2xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                      >
                        {isRTL ? "إلغاء والعودة" : "Back (Do Not End)"}
                      </button>

                      <button
                        type="button"
                        disabled={finalizingSession}
                        onClick={() => handleConfirmEndSession(endSessionInvoiceTotal, sessionPaid)}
                        className="w-full sm:w-auto justify-center flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 via-[#414E36] to-emerald-700 px-7 py-3 text-xs font-black text-white shadow-lg shadow-emerald-900/20 hover:brightness-110 active:scale-[0.99] transition disabled:opacity-50 cursor-pointer"
                      >
                        {finalizingSession ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>{isRTL ? "جاري الإنهاء والحفظ..." : "Finalizing Session..."}</span>
                          </>
                        ) : (
                          <>
                            <Check size={16} className="text-emerald-200" />
                            <span>{isRTL ? "تأكيد وإنهاء الجلسة فورياً" : "Confirm & End Session"}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── STANDARD DETAILS VIEW ── */
                <div className="space-y-6">
                  {/* ── HEADER ── */}
                  <div className="flex items-start justify-between border-b border-[#414E36]/10 pb-5">
                    <div className="space-y-1.5">
                      <h2 className="text-2xl sm:text-3xl font-black text-[#1F251A] tracking-tight">
                        Booking Details
                      </h2>
                  <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs">
                    <span className="font-semibold text-[#5A6A51] flex items-center gap-1.5">
                      <span>Reference ID:</span>
                      <span className="font-mono font-bold text-[#1F251A]">{booking.id}</span>
                      <button
                        type="button"
                        onClick={async () => {
                          const refId = String(booking.id);
                          let copied = false;
                          try {
                            await navigator.clipboard.writeText(refId);
                            copied = true;
                          } catch {
                            // navigator.clipboard can reject with NotAllowedError (permission
                            // denied by the browser/embedding context) rather than being merely
                            // unavailable — fall back to the legacy selection-based copy instead
                            // of silently claiming success.
                            try {
                              const textarea = document.createElement("textarea");
                              textarea.value = refId;
                              textarea.style.position = "fixed";
                              textarea.style.opacity = "0";
                              document.body.appendChild(textarea);
                              textarea.focus();
                              textarea.select();
                              copied = document.execCommand("copy");
                              document.body.removeChild(textarea);
                            } catch {
                              copied = false;
                            }
                          }
                          // Only claim success when a copy actually happened — showing the
                          // checkmark unconditionally previously left staff believing the
                          // reference ID was on their clipboard when the write had silently failed.
                          if (copied) {
                            setCopiedBookingRef(true);
                            setTimeout(() => setCopiedBookingRef(false), 2000);
                          }
                        }}
                        title="Copy Reference ID"
                        className="text-[#5A6A51] hover:text-[#1F251A] transition p-0.5 rounded cursor-pointer"
                      >
                        {copiedBookingRef ? <Check size={13} className="text-emerald-700 font-bold" /> : <Copy size={13} />}
                      </button>
                    </span>

                    {/* Interactive Status Selector / Badge */}
                    {hasPermission("bookings.edit") ? (
                      <div className="relative inline-flex items-center">
                        <select
                          value={booking.status === "approved" ? "confirmed" : booking.status}
                          disabled={isUpdatingStatus}
                          onChange={(e) => handleUpdateBookingStatus(e.target.value)}
                          className={`rounded-full py-0.5 ps-3 pe-6 text-[11px] font-extrabold uppercase tracking-wider outline-none cursor-pointer appearance-none border transition shadow-2xs ${
                            booking.status === 'approved' || booking.status === 'confirmed'
                              ? 'bg-[#EBF7EE] text-[#1E7E34] border-[#C3E6CB] hover:bg-[#d9f2de]' 
                              : booking.status === 'rejected' || booking.status === 'cancelled'
                                ? 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200' 
                                : booking.status === 'completed'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200'
                                  : booking.status === 'started'
                                    ? 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200'
                                    : booking.status === 'checked_in'
                                      ? 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200'
                                      : booking.status === 'no_show'
                                        ? 'bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-200'
                                        : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                          }`}
                          title={tr.statusSelectorLabel}
                        >
                          <option value="pending">{tr.statusOptions.pending}</option>
                          <option value="confirmed">{tr.statusOptions.confirmed}</option>
                          <option value="checked_in">{tr.statusOptions.checked_in}</option>
                          <option value="started">{tr.statusOptions.started}</option>
                          <option value="completed">{tr.statusOptions.completed}</option>
                          <option value="cancelled">{tr.statusOptions.cancelled}</option>
                          <option value="no_show">{tr.statusOptions.no_show}</option>
                        </select>
                        <ChevronDown size={11} className={`pointer-events-none absolute ${isRTL ? "left-2" : "right-2"} text-current opacity-70`} />
                      </div>
                    ) : (
                      <span className={`rounded-full px-3 py-0.5 text-[11px] font-extrabold uppercase tracking-wider ${
                        booking.status === 'approved' || booking.status === 'confirmed'
                          ? 'bg-[#EBF7EE] text-[#1E7E34] border border-[#C3E6CB]' 
                          : booking.status === 'rejected' || booking.status === 'cancelled'
                            ? 'bg-red-100 text-red-800' 
                            : booking.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : booking.status === 'started'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : booking.status === 'checked_in'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : booking.status === 'no_show'
                                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        {booking.status === 'approved' ? 'CONFIRMED' : (tr.statusOptions[booking.status as keyof typeof tr.statusOptions] || booking.status).toUpperCase()}
                      </span>
                    )}

                    {/* Source Badge */}
                    <span className={`rounded-full px-3 py-0.5 text-[11px] font-extrabold uppercase tracking-wider ${
                      booking.isManual 
                        ? 'bg-[#E8F0FE] text-[#1967D2]' 
                        : 'bg-[#FAF5EB] text-[#C4AE7C]'
                    }`}>
                      {booking.isManual ? "MANUAL BOOKING" : "WEBSITE BOOKING"}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    setIsEditingService(false);
                  }}
                  className="h-9 w-9 rounded-full bg-gray-100/90 text-gray-500 hover:bg-gray-200 hover:text-gray-800 flex items-center justify-center transition cursor-pointer shrink-0"
                >
                  <X size={18} />
                </button>
              </div>

              {/* ── 2-COLUMN MAIN GRID ── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                
                {/* ── LEFT COLUMN (2/3 width) ── */}
                <div className="lg:col-span-2 space-y-4">
                  
                  {/* 1. PATIENT INFORMATION CARD */}
                  <div className="rounded-2xl border border-[#414E36]/10 bg-white p-5 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[#0F3826] font-extrabold text-[11px] uppercase tracking-wider">
                        <User size={14} className="text-[#0F3826]" />
                        <span>PATIENT INFORMATION</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const cleanBookingPhone = (booking.phone || "").replace(/\D/g, "");
                          const customerRecord = dbCustomers.find(c => {
                            if (booking.customerId && c.id === booking.customerId) return true;
                            const cPhone = (c.mobile || c.phone || "").replace(/\D/g, "");
                            if (cPhone && cleanBookingPhone && (cPhone === cleanBookingPhone || cPhone.endsWith(cleanBookingPhone) || cleanBookingPhone.endsWith(cPhone))) {
                              return true;
                            }
                            if (c.name && booking.name && c.name.toLowerCase().trim() === booking.name.toLowerCase().trim()) {
                              return true;
                            }
                            return false;
                          });

                          const targetCustomer: any = customerRecord || {
                            id: booking.customerId || `cust_${Date.now()}`,
                            name: booking.name,
                            first_name: booking.name?.split(" ")[0] || "",
                            last_name: booking.name?.split(" ").slice(1).join(" ") || "",
                            mobile: booking.phone,
                            phone: booking.phone,
                            email: booking.email || ""
                          };

                          onClose();
                          setActiveNav("Patients");
                          setPrescriptionBookingContext(booking.id);
                          setViewingCustomerProfile(targetCustomer);
                        }}
                        className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-[#1F251A] hover:bg-gray-50 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <Eye size={13} />
                        <span>View Patient</span>
                      </button>
                    </div>

                    <div>
                      <h3 className="text-xl font-black text-[#1F251A]">
                        {booking.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-[#5A6A51] font-medium mt-1">
                        <span className="flex items-center gap-1">
                          <Phone size={13} className="text-[#5A6A51]" />
                          <span className="font-mono font-bold text-[#1F251A]">{booking.phone}</span>
                        </span>
                        <span>|</span>
                        <span className="flex items-center gap-1">
                          <FileText size={13} className="text-[#5A6A51]" />
                          <span>{booking.email || "No email provided"}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 2. 3-METRICS ROW: SERVICE, DATE & TIME, SESSION TYPE */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Card A: SERVICE */}
                    <div className="rounded-2xl border border-[#414E36]/10 bg-white p-4 space-y-1 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[#0F3826] font-extrabold text-[10px] uppercase tracking-wider">
                          <ShoppingBag size={13} className="text-[#0F3826]" />
                          <span>SERVICE</span>
                        </div>
                        {hasPermission("bookings.edit") && booking.status !== 'completed' && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedNewServiceId(String(booking.serviceId || (booking.serviceIds && booking.serviceIds[0]) || ""));
                              setShowChangeServiceModal(true);
                            }}
                            className="rounded-lg border border-[#414E36]/20 bg-[#414E36]/05 px-2 py-0.5 text-[10px] font-bold text-[#414E36] hover:bg-[#414E36]/15 transition flex items-center gap-1 cursor-pointer"
                            title={tr.changeServiceBtn}
                          >
                            <Edit size={10} />
                            <span>{tr.changeServiceBtn}</span>
                          </button>
                        )}
                      </div>
                      <p className="font-black text-sm text-[#1F251A] leading-snug line-clamp-1 pt-0.5" title={serviceNames}>
                        {bookingServices[0]?.name || serviceNames || "Clinic Service"}
                      </p>
                      <p className="text-xs text-[#5A6A51] font-medium line-clamp-1">
                        {bookingServices[0]?.name && bookingServices.length > 1 ? `+${bookingServices.length - 1} more service(s)` : "(Standard Procedure)"}
                      </p>
                    </div>

                    {/* Card B: DATE & TIME */}
                    <div className="rounded-2xl border border-[#414E36]/10 bg-white p-4 space-y-1 shadow-2xs">
                      <div className="flex items-center gap-1.5 text-[#0F3826] font-extrabold text-[10px] uppercase tracking-wider">
                        <Calendar size={13} className="text-[#0F3826]" />
                        <span>DATE &amp; TIME</span>
                      </div>
                      <p className="font-bold text-xs text-[#1F251A] flex items-center gap-1.5 pt-0.5">
                        <Clock size={12} className="text-[#5A6A51]" />
                        <span>
                          {(() => {
                            if (!booking.date) return "—";
                            try {
                              const d = new Date(booking.date);
                              const day = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
                              const weekday = d.toLocaleDateString("en-GB", { weekday: "short" });
                              return `${day} (${weekday})`;
                            } catch {
                              return booking.date;
                            }
                          })()}
                        </span>
                      </p>
                      <p className="font-bold text-xs text-[#1F251A] flex items-center gap-1.5">
                        <Clock size={12} className="text-[#5A6A51]" />
                        <span>{booking.timeSlot || booking.requestedTime || "09:00 AM"}</span>
                      </p>
                    </div>

                    {/* Card C: SESSION TYPE */}
                    <div className="rounded-2xl border border-[#414E36]/10 bg-white p-4 space-y-1 shadow-2xs">
                      <div className="flex items-center gap-1.5 text-[#0F3826] font-extrabold text-[10px] uppercase tracking-wider">
                        <User size={13} className="text-[#0F3826]" />
                        <span>SESSION TYPE</span>
                      </div>
                      <p className="font-black text-xs text-[#1F251A] pt-0.5">
                        {booking.sessionType === 'online' ? "Online Consultation" : "In Person"}
                      </p>
                      <p className="text-xs text-[#5A6A51] font-medium flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${booking.sessionType === 'online' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                        <span>{booking.sessionType === 'online' ? "Virtual Consultation" : "In Clinic Visit"}</span>
                      </p>
                    </div>
                  </div>

                  {/* 3. 2-METRICS ROW: DOCTOR & LOCATION */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Card A: DOCTOR */}
                    <div className="rounded-2xl border border-[#414E36]/10 bg-white p-4 space-y-1 shadow-2xs">
                      <div className="flex items-center gap-1.5 text-[#0F3826] font-extrabold text-[10px] uppercase tracking-wider">
                        <User size={13} className="text-[#0F3826]" />
                        <span>DOCTOR</span>
                      </div>
                      <p className="font-black text-sm text-[#1F251A] pt-0.5">
                        {booking.doctorName || "Treating Doctor"}
                      </p>
                      <div className="flex items-center gap-1 text-amber-500 text-xs font-bold">
                        {"★".repeat(5)}
                        <span className="text-[#5A6A51] text-[11px] font-semibold ml-0.5">5.0</span>
                      </div>
                    </div>

                    {/* Card B: LOCATION */}
                    <div className="rounded-2xl border border-[#414E36]/10 bg-white p-4 space-y-1 shadow-2xs">
                      <div className="flex items-center gap-1.5 text-[#0F3826] font-extrabold text-[10px] uppercase tracking-wider">
                        <MapPin size={13} className="text-[#0F3826]" />
                        <span>LOCATION</span>
                      </div>
                      <p className="font-black text-sm text-[#1F251A] pt-0.5">
                        {(() => {
                          const r = rooms.find(rm => rm.id === booking.roomId);
                          return r ? r.name : "Clinical Room";
                        })()}
                      </p>
                      <p className="text-xs text-[#5A6A51] font-medium">
                        {(() => {
                          const r = rooms.find(rm => rm.id === booking.roomId);
                          const b = branches.find(br => br.id === booking.branchId);
                          const roomType = r ? `${r.type.charAt(0).toUpperCase() + r.type.slice(1)} Room` : "Clinical Room";
                          const branchName = b ? (isRTL ? b.name_ar : b.name_en) : "Main Branch";
                          return `${roomType} • ${branchName}`;
                        })()}
                      </p>
                    </div>
                  </div>

                  {/* 4. SERVICE DETAILS CARD */}
                  <div className="rounded-2xl border border-[#414E36]/10 bg-white p-5 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[#0F3826] font-extrabold text-[11px] uppercase tracking-wider">
                        <Box size={14} className="text-[#0F3826]" />
                        <span>SERVICE DETAILS</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {hasPermission("bookings.edit") && booking.status !== 'completed' && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedNewServiceId(String(booking.serviceId || (booking.serviceIds && booking.serviceIds[0]) || ""));
                              setShowChangeServiceModal(true);
                            }}
                            className="rounded-xl border border-[#414E36]/20 bg-[#414E36]/05 px-2.5 py-1 text-xs font-bold text-[#414E36] hover:bg-[#414E36]/15 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                          >
                            <Edit size={12} />
                            <span>{tr.changeServiceBtn}</span>
                          </button>
                        )}
                        {!isEditingService && hasPermission("bookings.edit") && booking.status !== 'completed' && (
                          <button
                            type="button"
                            onClick={() => setIsEditingService(true)}
                            className="rounded-xl border border-gray-200 bg-white px-3 py-1 text-xs font-bold text-[#1F251A] hover:bg-gray-50 transition flex items-center gap-1 shadow-2xs cursor-pointer"
                          >
                            <Plus size={12} />
                            <span>Add Service</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Services List */}
                    <div className="space-y-2 text-xs">
                      {bookingServices.map((bs, index) => (
                        <div key={`bs-${bs.id}-${index}`} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
                          <span className="font-semibold text-[#1F251A]">
                            {index + 1}. {bs.name}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-[#1F251A]">{bs.price} EGP</span>
                            {bookingServices.length > 1 && hasPermission("bookings.edit") && booking.status !== 'completed' && (
                              <button
                                type="button"
                                onClick={async () => {
                                  const updatedIds = selectedServiceIds.filter((_, i) => i !== index);
                                  try {
                                    const res = await fetch(`/api/reservations?id=${booking.id}`, {
                                      method: "PATCH",
                                      headers: authenticatedJsonHeaders,
                                      body: JSON.stringify({ serviceIds: updatedIds }),
                                    });
                                    if (res.ok) {
                                      const updated = await res.json();
                                      setBooking(updated);
                                      fetchAllReservations();
                                    }
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }}
                                className="text-red-500 hover:text-red-700 font-bold px-1"
                                title="Remove Service"
                              >
                                &times;
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Additional Services from session */}
                      {additionalServicesList.map((as, asIdx) => (
                        <div key={`as-${asIdx}`} className="flex items-center justify-between py-1 border-b border-gray-50">
                          <span className="font-semibold text-[#1F251A]">
                            {bookingServices.length + asIdx + 1}. {as.name} <span className="text-[10px] text-[#5A6A51]">(x{as.qty})</span>
                          </span>
                          <span className="font-extrabold text-[#1F251A]">{as.total} EGP</span>
                        </div>
                      ))}

                      {/* Add Service Inline Selector */}
                      {isEditingService && (
                        <div className="pt-2 flex items-center gap-2">
                          <select
                            value=""
                            onChange={async (e) => {
                              const newServiceId = Number(e.target.value);
                              if (!newServiceId) return;
                              const updatedServiceIds = [...selectedServiceIds, newServiceId];
                              try {
                                const res = await fetch(`/api/reservations?id=${booking.id}`, {
                                  method: "PATCH",
                                  headers: authenticatedJsonHeaders,
                                  body: JSON.stringify({ serviceIds: updatedServiceIds }),
                                });
                                if (res.ok) {
                                  const updated = await res.json();
                                  setBooking(updated);
                                  fetchAllReservations();
                                  setIsEditingService(false);
                                }
                              } catch (err) {
                                console.error(err);
                              }
                            }}
                            className="rounded-xl border border-[#414E36]/20 bg-white px-3 py-1.5 text-xs text-[#1F251A] outline-none font-bold"
                          >
                            <option value="" disabled>Select service to add...</option>
                            {localServices
                              .filter(svc => !selectedServiceIds.includes(svc.id))
                              .map((svc) => (
                                <option key={svc.id} value={svc.id}>
                                  {svc.en}
                                </option>
                              ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => setIsEditingService(false)}
                            className="text-xs font-semibold text-[#5A6A51] hover:underline"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Total Price Row */}
                    <div className="pt-3 border-t border-[#414E36]/10 flex items-center justify-between">
                      <span className="font-black text-sm text-[#1F251A]">Total Price</span>
                      <span className="font-black text-base text-[#1F251A]">{totalPrice} EGP</span>
                    </div>
                  </div>

                  {/* 5. 2-METRICS ROW: PRODUCTS & CONSUMABLES and PRESCRIPTION */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Card A: PRODUCTS & CONSUMABLES */}
                    <div className="rounded-2xl border border-[#414E36]/10 bg-white p-4 space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[#0F3826] font-extrabold text-[10px] uppercase tracking-wider">
                          <Box size={13} className="text-[#0F3826]" />
                          <span>PRODUCTS &amp; CONSUMABLES</span>
                        </div>
                        <button
                          type="button"
                          disabled={isInvoicePaid}
                          onClick={() => !isInvoicePaid && setShowDrawerProductModal(true)}
                          className="rounded-xl border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-bold text-[#1F251A] hover:bg-gray-50 transition flex items-center gap-1 disabled:opacity-50 cursor-pointer shadow-2xs"
                        >
                          <Plus size={11} />
                          <span>Add Product</span>
                        </button>
                      </div>

                      {productsConsumablesList.length > 0 ? (
                        <div className="space-y-1.5 pt-1">
                          {productsConsumablesList.map((prod, pIdx) => (
                            <div key={pIdx} className="flex items-center justify-between text-xs py-1 border-b border-gray-50 last:border-0">
                              <span className="font-semibold text-[#1F251A] truncate">{prod.name} (x{prod.qty})</span>
                              <span className="font-extrabold text-[#1F251A]">{prod.total} EGP</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-[#5A6A51] font-medium pt-1">No products added</p>
                      )}
                    </div>

                    {/* Card B: PRESCRIPTION */}
                    <div className="rounded-2xl border border-[#414E36]/10 bg-white p-4 space-y-2.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[#0F3826] font-extrabold text-[10px] uppercase tracking-wider">
                          <FileText size={13} className="text-[#0F3826]" />
                          <span>PRESCRIPTION</span>
                        </div>
                        {drawerPrescriptions.length > 0 && (
                          <span className="text-[10px] font-bold text-[#5A6A51] bg-gray-100 px-2 py-0.5 rounded-full">
                            {drawerPrescriptions[0].date ? new Date(drawerPrescriptions[0].date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "Recorded"}
                          </span>
                        )}
                      </div>

                      {drawerPrescriptions.length > 0 ? (() => {
                        const rx = drawerPrescriptions[0];
                        const medsList: any[] = Array.isArray(rx.medications) && rx.medications.length > 0
                          ? rx.medications
                          : (Array.isArray(rx.items) ? rx.items : []);
                        const rxNotes = rx.general_notes || rx.instructions || rx.doctor_notes || rx.notes;

                        return (
                          <div className="space-y-2.5">
                            {/* Diagnosis Box */}
                            {rx.diagnosis && (
                              <div className="rounded-xl bg-[#F4F5F1] p-2.5 border border-[#414E36]/10">
                                <span className="text-[10px] font-extrabold text-[#5A6A51] uppercase tracking-wider block">
                                  Diagnosis
                                </span>
                                <p className="font-bold text-xs text-[#1F251A] mt-0.5">
                                  {rx.diagnosis}
                                </p>
                              </div>
                            )}

                            {/* Itemized Medications */}
                            {medsList.length > 0 ? (
                              <div className="space-y-1.5">
                                <span className="text-[10px] font-extrabold text-[#5A6A51] uppercase tracking-wider block">
                                  Prescribed Medications ({medsList.length})
                                </span>
                                <div className="space-y-1.5 max-h-40 overflow-y-auto pe-1">
                                  {medsList.map((med: any, mIdx: number) => (
                                    <div
                                      key={mIdx}
                                      className="rounded-xl border border-gray-100 bg-[#FAFAFA] p-2 text-xs space-y-1"
                                    >
                                      <div className="flex items-center justify-between gap-1">
                                        <span className="font-extrabold text-[#1F251A] flex items-center gap-1.5 truncate">
                                          <span className="h-4 w-4 rounded-full bg-[#0F3826]/10 text-[#0F3826] flex items-center justify-center text-[10px] font-bold shrink-0">
                                            {mIdx + 1}
                                          </span>
                                          <span className="truncate">{med.name || med.medicine_name || med.medicine || "Medication"}</span>
                                        </span>
                                        {med.dosage && (
                                          <span className="text-[10px] font-bold text-[#0F3826] bg-[#EBF7EE] px-1.5 py-0.5 rounded shrink-0">
                                            {med.dosage}
                                          </span>
                                        )}
                                      </div>

                                      {(med.frequency || med.duration) && (
                                        <div className="flex items-center gap-2 text-[11px] text-[#5A6A51] ps-5">
                                          {med.frequency && <span><strong>Freq:</strong> {med.frequency}</span>}
                                          {med.frequency && med.duration && <span>•</span>}
                                          {med.duration && <span><strong>Duration:</strong> {med.duration}</span>}
                                        </div>
                                      )}

                                      {med.instructions && (
                                        <p className="text-[11px] text-[#7A8A71] italic ps-5">
                                          ↳ {med.instructions}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : !rx.diagnosis && (
                              <p className="text-xs text-[#1F251A] font-bold">Prescription recorded</p>
                            )}

                            {/* Doctor Clinical Instructions */}
                            {rxNotes && (
                              <div className="rounded-xl bg-[#FBFBF9] p-2 border border-[#414E36]/10 text-xs">
                                <span className="text-[10px] font-extrabold text-[#5A6A51] uppercase tracking-wider block">
                                  Instructions
                                </span>
                                <p className="text-[11px] text-[#1F251A] mt-0.5 whitespace-pre-line leading-relaxed">
                                  {rxNotes}
                                </p>
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                              <button
                                type="button"
                                onClick={() => handleSendPrescriptionWhatsApp(rx, booking)}
                                className="flex-1 rounded-xl bg-[#25D366] text-white py-1.5 px-2.5 text-[11px] font-bold flex items-center justify-center gap-1 hover:bg-[#1EBE5D] transition shadow-2xs cursor-pointer"
                              >
                                <MessageSquare size={12} />
                                <span>WhatsApp</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => printPrescription(rx, booking)}
                                className="flex-1 rounded-xl bg-[#0F3826] text-white py-1.5 px-2.5 text-[11px] font-bold flex items-center justify-center gap-1 hover:bg-[#0A271A] transition shadow-2xs cursor-pointer"
                              >
                                <Printer size={12} />
                                <span>Print Rx</span>
                              </button>
                            </div>
                          </div>
                        );
                      })() : (
                        <div className="py-2">
                          <p className="font-bold text-xs text-[#1F251A]">No prescription recorded</p>
                          <p className="text-[11px] text-[#5A6A51] font-medium mt-0.5">No prescription was written for this session.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 6. BOOKING INFORMATION CARD */}
                  <div className="rounded-2xl border border-[#414E36]/10 bg-white p-4 space-y-3 shadow-2xs">
                    <div className="flex items-center gap-1.5 text-[#0F3826] font-extrabold text-[10px] uppercase tracking-wider">
                      <Info size={13} className="text-[#0F3826]" />
                      <span>BOOKING INFORMATION</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                      <div>
                        <span className="text-[#5A6A51] font-medium block">Booked By</span>
                        <span className="font-bold text-[#1F251A] mt-0.5 block">
                          {(() => {
                            const creator = employeesList.find(emp => emp.id === booking.createdByEmployeeId);
                            return creator ? creator.name : (booking.isManual ? "Employee" : "Patient");
                          })()}
                        </span>
                      </div>

                      <div>
                        <span className="text-[#5A6A51] font-medium block">Booking Source</span>
                        <span className="font-bold text-[#1F251A] mt-0.5 block">
                          {booking.isManual ? "Manual Booking" : "Website Booking"}
                        </span>
                      </div>

                      <div>
                        <span className="text-[#5A6A51] font-medium block">Created At</span>
                        <span className="font-bold text-[#1F251A] mt-0.5 block">
                          {(() => {
                            const dateVal = (booking as any).created_at || booking.createdAt || booking.date;
                            if (!dateVal) return "—";
                            try {
                              const d = new Date(dateVal);
                              const day = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
                              const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
                              return `${day} • ${time}`;
                            } catch {
                              return dateVal;
                            }
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* ── RIGHT COLUMN (1/3 width) ── */}
                <div className="lg:col-span-1 space-y-4">
                  
                  {/* 1. SESSION FLOW CARD */}
                  <div className="rounded-2xl border border-[#414E36]/10 bg-white p-5 space-y-4 shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-2xl bg-[#EBF7EE] text-[#1E7E34] flex items-center justify-center shrink-0">
                        <Calendar size={20} />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-xs uppercase tracking-wider text-[#0F3826]">
                          SESSION FLOW
                        </h4>
                        <p className="text-xs text-[#5A6A51] font-medium leading-tight mt-0.5">
                          {booking.status === 'completed'
                            ? (isInvoicePaid ? "Session completed and invoice fully settled." : "Treatment completed. Ready for invoice settlement.")
                            : booking.status === 'started'
                              ? "Treatment currently active with treating doctor."
                              : booking.status === 'checked_in'
                                ? "Customer is checked in and ready to start session."
                                : "The customer has arrived at the clinic and is ready for check-in."}
                        </p>
                      </div>
                    </div>

                    {/* Action Flow Buttons */}
                    <div className="space-y-2 pt-1">
                      {(booking.status === 'approved' || booking.status === 'confirmed') && (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const res = await fetch(`/api/reservations?id=${booking.id}`, {
                                method: 'PATCH',
                                headers: authenticatedJsonHeaders,
                                body: JSON.stringify({ status: 'checked_in' })
                              });
                              if (res.ok) {
                                const updated = await res.json();
                                setBooking(prev => prev ? { ...prev, ...updated } : null);
                                fetchRequests();
                                fetchAllReservations();
                              }
                            } catch (err) {
                              console.error(err);
                            }
                          }}
                          className="w-full rounded-2xl bg-[#0F3826] text-white py-3 text-xs font-bold hover:bg-[#0A271A] transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          <User size={14} />
                          <span>Check In</span>
                        </button>
                      )}

                      {booking.status === 'checked_in' && (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const res = await fetch(`/api/reservations?id=${booking.id}`, {
                                method: 'PATCH',
                                headers: authenticatedJsonHeaders,
                                body: JSON.stringify({ status: 'started' })
                              });
                              if (res.ok) {
                                const updated = await res.json();
                                setBooking(prev => prev ? { ...prev, ...updated, status: 'started' } : null);
                                fetchRequests();
                                fetchAllReservations();
                              }
                            } catch (err) {
                              console.error(err);
                            }
                          }}
                          className="w-full rounded-2xl bg-[#0F3826] text-white py-3 text-xs font-bold hover:bg-[#0A271A] transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          <Play size={14} />
                          <span>Start Session</span>
                        </button>
                      )}

                      {booking.status === 'started' && (
                        isGlobalEndingSessionActive ? (
                          <div className="space-y-2">
                            <button
                              type="button"
                              onClick={() => setViewMode("end_session")}
                              className="w-full rounded-2xl bg-gradient-to-r from-emerald-700 via-[#414E36] to-emerald-800 text-white py-3 px-3 text-xs font-black hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-md shadow-[#414E36]/25 cursor-pointer animate-pulse"
                            >
                              <Check size={16} className="text-emerald-300" />
                              <span>{isRTL ? "إنهاء الجلسة (الاستقبال)" : "End Session"}</span>
                            </button>
                            <div className="w-full rounded-xl bg-amber-50/80 border border-amber-200/80 py-1.5 text-center text-[10px] font-bold text-amber-900 flex items-center justify-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
                              <span>{isRTL ? "الجلسة جارية حالياً لدى الطبيب" : "Treatment In Session"}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full rounded-2xl bg-amber-50 border border-amber-200 p-3 text-center text-xs font-extrabold text-amber-900 flex items-center justify-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                            <span>{isRTL ? "جلسة العلاج جارية" : "Treatment In Session"}</span>
                          </div>
                        )
                      )}

                      {booking.status === 'completed' && (
                        !isInvoicePaid ? (
                          <button
                            type="button"
                            onClick={() => {
                              const b = booking;
                              onClose();
                              setCheckoutBooking(b);
                            }}
                            className="w-full rounded-2xl bg-[#0F3826] text-white py-3 text-xs font-bold hover:bg-[#0A271A] transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            <Receipt size={14} />
                            <span>Pay &amp; Settle Invoice</span>
                          </button>
                        ) : (
                          <div className="w-full rounded-2xl bg-[#EBF7EE] border border-[#C3E6CB] p-3 text-center text-xs font-extrabold text-[#1E7E34]">
                            ✓ Invoice Settled &amp; Paid
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  {/* 2. OTHER ACTIONS CARD */}
                  {!['completed', 'cancelled', 'rejected', 'no_show', 'started'].includes(booking.status) && hasPermission("bookings.edit") && (
                    <div className="rounded-2xl border border-[#414E36]/10 bg-white p-5 space-y-3 shadow-2xs">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#5A6A51]">OTHER ACTIONS</p>
                      
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setPostponeBooking(booking);
                            setPostponeMode("reschedule");
                            setPostponeNewDate(booking.date || "");
                            setPostponeNewTime(booking.timeSlot || "");
                            setPostponeFollowUpDate("");
                          }}
                          className="rounded-2xl border border-[#414E36]/20 bg-white py-2.5 px-2 text-xs font-bold text-[#1F251A] hover:bg-gray-50 transition flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <Clock size={13} className="text-[#5A6A51]" />
                          <span>Postpone</span>
                        </button>
                        
                        <button
                          type="button"
                          onClick={async () => {
                            if (!(await showConfirm("Cancel this booking? Any deposit paid will be refunded to the patient's wallet."))) return;
                            const res = await fetch(`/api/reservations?id=${booking.id}`, {
                              method: 'PATCH',
                              headers: authenticatedJsonHeaders,
                              body: JSON.stringify({ action: 'cancel' }),
                            });
                            if (res.ok) {
                              onClose();
                              fetchAllReservations();
                              fetchCustomers();
                            }
                          }}
                          className="rounded-2xl border border-[#414E36]/20 bg-white py-2.5 px-2 text-xs font-bold text-[#1F251A] hover:bg-gray-50 transition flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <XCircle size={13} className="text-[#5A6A51]" />
                          <span>Cancel</span>
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            if (!(await showConfirm("Mark this booking as a no-show? Any deposit paid will be forfeited as a cancellation fee, not refunded."))) return;
                            const res = await fetch(`/api/reservations?id=${booking.id}`, {
                              method: 'PATCH',
                              headers: authenticatedJsonHeaders,
                              body: JSON.stringify({ action: 'no_show' }),
                            });
                            if (res.ok) {
                              onClose();
                              fetchAllReservations();
                              fetchCustomers();
                            }
                          }}
                          className="rounded-2xl border border-[#FDE8E8] bg-[#FDF2F2] py-2.5 px-2 text-xs font-bold text-[#9B1C1C] hover:bg-rose-100 transition flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <UserX size={13} className="text-[#9B1C1C]" />
                          <span>No Show</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 3. PAYMENT SUMMARY CARD */}
                  <div className="rounded-2xl border border-[#414E36]/10 bg-white p-5 space-y-4 shadow-2xs">
                    <div className="flex items-center gap-1.5 text-[#0F3826] font-extrabold text-[11px] uppercase tracking-wider">
                      <Wallet size={14} className="text-[#0F3826]" />
                      <span>PAYMENT SUMMARY</span>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div className="flex justify-between items-center text-[#1F251A]">
                        <span className="font-semibold text-[#5A6A51]">Service Price</span>
                        <span className="font-bold">{totalPrice} EGP</span>
                      </div>

                      <div className="flex justify-between items-center text-[#1F251A]">
                        <span className="font-semibold text-[#5A6A51]">Paid Amount</span>
                        <span className="font-bold text-emerald-700">{sessionPaid} EGP</span>
                      </div>

                      <div className="flex justify-between items-center text-[#1F251A]">
                        <span className="font-semibold text-[#5A6A51]">Outstanding</span>
                        <span className={`font-bold ${sessionLeft > 0 ? 'text-[#9B1C1C]' : 'text-emerald-700'}`}>
                          {sessionLeft} EGP
                        </span>
                      </div>

                      <div className="pt-2 border-t border-[#414E36]/10 flex justify-between items-center">
                        <span className="font-semibold text-[#5A6A51]">Payment Status</span>
                        <span className={`rounded-full px-3 py-0.5 text-xs font-extrabold ${
                          isInvoicePaid 
                            ? 'bg-[#EBF7EE] text-[#1E7E34]' 
                            : 'bg-amber-50 text-amber-800'
                        }`}>
                          {isInvoicePaid ? "Paid" : "Unpaid"}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const b = booking;
                          onClose();
                          setInvoiceBooking(b);
                        }}
                        className="rounded-2xl border border-gray-200 bg-white py-2.5 px-2 text-xs font-bold text-[#1F251A] hover:bg-gray-50 transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <FileText size={13} className="text-[#5A6A51]" />
                        <span>View Invoice</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (booking) {
                            const branchObj = branches.find(br => br.id === booking.branchId);
                            const bName = branchObj ? (isRTL ? branchObj.name_ar : branchObj.name_en) : "Revera Clinics";
                            const allInvoiceItems = [
                              ...bookingServices,
                              ...additionalServicesList.map(s => ({ id: s.name, name: s.name, price: s.total })),
                              ...productsConsumablesList.map(p => ({ id: p.name, name: `${p.name} (x${p.qty})`, price: p.total }))
                            ];
                            printInvoice(booking as any, allInvoiceItems, totalPrice, 0, bName);
                          }
                        }}
                        className="rounded-2xl border border-gray-200 bg-white py-2.5 px-2 text-xs font-bold text-[#1F251A] hover:bg-gray-50 transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <Printer size={13} className="text-[#5A6A51]" />
                        <span>Print Invoice</span>
                      </button>
                    </div>
                  </div>

                  {/* 4. NOTES CARD (Under Payment Summary) */}
                  {(() => {
                    const cleanBookingNotes = (() => {
                      // Brief 33: prefer reception_notes (clean column) for post-migration bookings
                      const receptionNote = booking?.receptionNotes ?? null;
                      if (receptionNote !== null && receptionNote !== undefined) return String(receptionNote).trim();
                      // Fallback: regex-clean legacy notes for pre-migration bookings
                      if (!booking?.notes) return "";
                      let text = String(booking.notes);
                      text = text.replace(/\[Products Used During Session\]:[\s\S]*?(?=\[|$)/gi, "");
                      text = text.replace(/\[Additional Services(?: Used)?(?: During Session)?\]:[\s\S]*?(?=\[|$)/gi, "");
                      text = text.replace(/\[Device Pulses Deducted\]:[\s\S]*?(?=\[|$)/gi, "");
                      text = text.replace(/\[Extra Device Pulses\]:[\s\S]*?(?=\[|$)/gi, "");
                      text = text.replace(/\[Invoice Total Updated\]:[\s\S]*?(?=\[|$)/gi, "");
                      text = text.replace(/\[Total Invoice\]:[\s\S]*?(?=\[|$)/gi, "");
                      text = text.replace(/\[Added Product\]:[\s\S]*?(?=\[|$)/gi, "");
                      text = text.replace(/\[Added Service\]:[\s\S]*?(?=\[|$)/gi, "");
                      text = text.replace(/-\s+[\s\S]*?\(x\d+\)\s+@\s+\d+[\s\S]*?EGP/gi, "");
                      return text.trim();
                    })();

                    return (
                      <div className="rounded-2xl border border-[#414E36]/10 bg-white p-5 space-y-3 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-[#0F3826] font-extrabold text-[11px] uppercase tracking-wider">
                            <FileText size={14} className="text-[#0F3826]" />
                            <span>NOTES</span>
                          </div>
                          {hasPermission("bookings.edit") && booking.status !== 'completed' && !isEditingNotes && (
                            <button
                              type="button"
                              onClick={() => {
                                setNotesDraft(cleanBookingNotes);
                                setIsEditingNotes(true);
                              }}
                              className="rounded-xl border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-bold text-[#1F251A] hover:bg-gray-50 transition flex items-center gap-1 shadow-2xs cursor-pointer"
                            >
                              <Pencil size={11} />
                              <span>{cleanBookingNotes ? "Edit Note" : "+ Add Note"}</span>
                            </button>
                          )}
                        </div>

                        {isEditingNotes ? (
                          <div className="space-y-2 pt-1">
                            <textarea
                              rows={3}
                              value={notesDraft}
                              onChange={(e) => setNotesDraft(e.target.value)}
                              placeholder="Enter notes, observations, or instructions..."
                              className="w-full rounded-xl border border-[#414E36]/20 bg-[#FBFBF9] p-2.5 text-xs text-[#1F251A] outline-none focus:border-[#0F3826]"
                            />
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setIsEditingNotes(false)}
                                className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  const cleanNote = notesDraft.trim();
                                  await saveNotes(cleanNote);
                                  setBooking((prev: any) => prev ? { ...prev, receptionNotes: cleanNote } : null);
                                  setIsEditingNotes(false);
                                }}
                                className="px-3.5 py-1.5 rounded-xl bg-[#0F3826] text-white text-xs font-bold hover:bg-[#0A271A] transition shadow-xs cursor-pointer"
                              >
                                Save Note
                              </button>
                            </div>
                          </div>
                        ) : cleanBookingNotes ? (
                          <div className="rounded-xl bg-[#F7F7F3] border border-[#414E36]/10 p-3 text-xs text-[#1F251A] whitespace-pre-line leading-relaxed">
                            {cleanBookingNotes}
                          </div>
                        ) : (
                          <p className="text-xs text-[#5A6A51] font-medium pt-0.5">
                            No notes recorded for this booking.
                          </p>
                        )}
                      </div>
                    );
                  })()}

                </div>

              </div>

            </div>
          )}

            </div>
          </div>
        );
      })()}

      {/* Add Product Modal for Booking Drawer */}
      {showDrawerProductModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#414E36]/10 pb-3">
              <h3 className="text-base font-bold text-[#1F251A]">Add Product / Session Consumable</h3>
              <button
                onClick={() => {
                  setShowDrawerProductModal(false);
                  setSelectedDrawerProductId("");
                  setSelectedDrawerProductQty(1);
                }}
                className="rounded-full bg-gray-100 p-1.5 text-gray-500 hover:bg-gray-200 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#1F251A] mb-1">Select Skincare / Medical Product</label>
                <select
                  value={selectedDrawerProductId}
                  onChange={(e) => setSelectedDrawerProductId(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 p-2.5 text-xs font-semibold text-[#1F251A] outline-none focus:border-[#414E36]"
                >
                  <option value="">-- Select Product --</option>
                  {(inventoryProducts || [])
                    .filter((p: any) => p.role !== 'consumable')
                    .map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — EGP {p.price || p.unit_price || p.selling_price || 0} (Stock: {p.stock ?? p.quantity ?? p.stock_quantity ?? 'N/A'})
                      </option>
                  ))}
                </select>
              </div>

              {selectedDrawerProductId && (() => {
                const selectedProd = (inventoryProducts || [])
                  .find((p: any) => String(p.id) === String(selectedDrawerProductId));
                const unitPrice = Number(selectedProd?.price || selectedProd?.unit_price || selectedProd?.selling_price || 0);
                const totalCost = unitPrice * selectedDrawerProductQty;

                return (
                  <div className="rounded-xl bg-[#FBFBF9] p-3 space-y-2 border border-[#414E36]/10">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-600">Quantity:</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedDrawerProductQty(Math.max(1, selectedDrawerProductQty - 1))}
                          className="w-7 h-7 rounded-lg bg-gray-200 font-bold flex items-center justify-center hover:bg-gray-300 transition text-sm"
                        >
                          -
                        </button>
                        <span className="font-bold text-[#1F251A] px-2 text-sm">{selectedDrawerProductQty}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedDrawerProductQty(selectedDrawerProductQty + 1)}
                          className="w-7 h-7 rounded-lg bg-gray-200 font-bold flex items-center justify-center hover:bg-gray-300 transition text-sm"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs border-t border-gray-200 pt-2">
                      <span className="font-semibold text-gray-600">Unit Price:</span>
                      <span className="font-bold text-[#1F251A]">{unitPrice} EGP</span>
                    </div>
                    <div className="flex justify-between text-sm font-extrabold border-t border-gray-200 pt-2 text-[#414E36]">
                      <span>Added to Invoice:</span>
                      <span>{totalCost} EGP</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDrawerProductModal(false);
                  setSelectedDrawerProductId("");
                  setSelectedDrawerProductQty(1);
                }}
                className="w-1/2 rounded-xl border border-gray-300 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedDrawerProductId}
                onClick={handleAddProductToBooking}
                className="w-1/2 rounded-xl bg-[#414E36] py-2.5 text-xs font-bold text-white hover:bg-[#343F2B] transition disabled:opacity-50 shadow-sm"
              >
                Add to Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Prescription Modal for Booking Drawer */}
      {showDrawerPrescriptionModal && booking && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4 my-8 border border-[#414E36]/10">
            <div className="flex items-center justify-between border-b border-[#414E36]/10 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C4AE7C]">Digital Rx</span>
                <h3 className="text-base font-bold text-[#1F251A] mt-0.5">Add Prescription for {booking.name}</h3>
              </div>
              <button
                onClick={() => {
                  setShowDrawerPrescriptionModal(false);
                  setDrawerRxDiagnosis("");
                  setDrawerRxMeds([{ name: "", dosage: "", frequency: "", duration: "" }]);
                  setDrawerRxNotes("");
                }}
                className="rounded-full bg-gray-100 p-1.5 text-gray-500 hover:bg-gray-200 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveDrawerPrescription} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#1F251A] mb-1">Clinical Diagnosis / التشخيص</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Skin rejuvenation, Acne treatment, Post-laser care"
                  value={drawerRxDiagnosis}
                  onChange={(e) => setDrawerRxDiagnosis(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 p-2.5 text-xs font-semibold text-[#1F251A] outline-none focus:border-[#414E36]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-bold text-[#1F251A]">Prescribed Medications / الأدوية</label>
                  <button
                    type="button"
                    onClick={() => setDrawerRxMeds(prev => [...prev, { name: "", dosage: "", frequency: "", duration: "" }])}
                    className="text-[11px] font-bold text-[#414E36] hover:underline"
                  >
                    + Add Medication
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {drawerRxMeds.map((med, mIdx) => (
                    <div key={mIdx} className="p-2.5 rounded-xl bg-[#FBFBF9] border border-gray-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[11px] text-[#5A6A51]">Medication #{mIdx + 1}</span>
                        {drawerRxMeds.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setDrawerRxMeds(prev => prev.filter((_, i) => i !== mIdx))}
                            className="text-red-500 hover:text-red-700 font-bold text-xs"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          required
                          placeholder="Medication Name"
                          value={med.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDrawerRxMeds(prev => prev.map((item, i) => i === mIdx ? { ...item, name: val } : item));
                          }}
                          className="rounded-lg border border-gray-300 p-2 text-xs font-semibold text-[#1F251A] outline-none focus:border-[#414E36]"
                        />
                        <input
                          type="text"
                          placeholder="Dosage (e.g. 500mg, 1 tab)"
                          value={med.dosage}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDrawerRxMeds(prev => prev.map((item, i) => i === mIdx ? { ...item, dosage: val } : item));
                          }}
                          className="rounded-lg border border-gray-300 p-2 text-xs text-[#1F251A] outline-none focus:border-[#414E36]"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Frequency (e.g. Twice daily)"
                          value={med.frequency}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDrawerRxMeds(prev => prev.map((item, i) => i === mIdx ? { ...item, frequency: val } : item));
                          }}
                          className="rounded-lg border border-gray-300 p-2 text-xs text-[#1F251A] outline-none focus:border-[#414E36]"
                        />
                        <input
                          type="text"
                          placeholder="Duration (e.g. 7 days)"
                          value={med.duration}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDrawerRxMeds(prev => prev.map((item, i) => i === mIdx ? { ...item, duration: val } : item));
                          }}
                          className="rounded-lg border border-gray-300 p-2 text-xs text-[#1F251A] outline-none focus:border-[#414E36]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#1F251A] mb-1">Doctor Instructions & Advice / تعليمات الطبيب</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Avoid direct sunlight, apply sunscreen every 2 hours, drink plenty of water."
                  value={drawerRxNotes}
                  onChange={(e) => setDrawerRxNotes(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 p-2.5 text-xs text-[#1F251A] outline-none focus:border-[#414E36]"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowDrawerPrescriptionModal(false);
                    setDrawerRxDiagnosis("");
                    setDrawerRxMeds([{ name: "", dosage: "", frequency: "", duration: "" }]);
                    setDrawerRxNotes("");
                  }}
                  className="w-1/2 rounded-xl border border-gray-300 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingDrawerRx}
                  className="w-1/2 rounded-xl bg-[#414E36] py-2.5 text-xs font-bold text-white hover:bg-[#343F2B] transition disabled:opacity-50 shadow-sm"
                >
                  {savingDrawerRx ? "Saving..." : "Save Prescription"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Service Selection Picker Modal */}
      {showChangeServiceModal && booking && (() => {
        const serviceCategories = ["All", ...Array.from(new Set((localServices || []).map(s => s.cat || (s as any).category_ar || (s as any).category_en || (isRTL ? "خدمات عامة" : "General")).filter(Boolean)))];

        const filteredServicesList = (localServices || []).filter(svc => {
          const nameEn = (svc.en || "").toLowerCase();
          const nameAr = (svc.ar || "").toLowerCase();
          const cat = (svc.cat || (svc as any).category_en || (svc as any).category_ar || "").toLowerCase();
          const search = serviceSearchTerm.toLowerCase().trim();

          const matchesSearch = !search || nameEn.includes(search) || nameAr.includes(search) || cat.includes(search);
          const svcCat = svc.cat || (svc as any).category_en || (svc as any).category_ar || (isRTL ? "خدمات عامة" : "General");
          const matchesCategory = serviceSelectedCategory === "All" || svcCat === serviceSelectedCategory;

          return matchesSearch && matchesCategory;
        });

        return (
          <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-5 animate-fadeIn">
            <div className="w-full max-w-2xl rounded-3xl bg-[#FBFBF9] p-5 sm:p-6 shadow-2xl border border-[#414E36]/15 space-y-4 max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-[#414E36]/10 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#414E36] bg-[#EDF1EC] px-2.5 py-0.5 rounded-full">
                      {isRTL ? "الاستقبال • تعديل الحجز" : "Reception • Booking Update"}
                    </span>
                    <span className="text-xs font-mono font-bold text-[#5A6A51]">
                      #{booking.id}
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-[#1F251A] mt-1">
                    {tr.editServiceTitle}
                  </h3>
                  <p className="text-xs text-[#5A6A51] mt-0.5">
                    {isRTL ? "اختر الخدمة الجديدة ليتم تحديث الحجز وحساب السعر تلقائياً" : "Select a new clinical service to replace the currently booked procedure."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowChangeServiceModal(false);
                    setServiceSearchTerm("");
                    setSelectedNewServiceId("");
                  }}
                  className="h-9 w-9 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-800 flex items-center justify-center transition cursor-pointer shrink-0"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Search & Category Filter */}
              <div className="space-y-2.5">
                <div className="relative">
                  <Search size={15} className={`absolute ${isRTL ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 text-[#5A6A51]`} />
                  <input
                    type="text"
                    value={serviceSearchTerm}
                    onChange={(e) => setServiceSearchTerm(e.target.value)}
                    placeholder={tr.searchServicePlaceholder}
                    className={`w-full rounded-2xl border border-[#414E36]/20 bg-white py-2.5 text-xs text-[#1F251A] font-semibold outline-none focus:border-[#414E36] shadow-2xs ${isRTL ? "pr-9 pl-3" : "pl-9 pr-3"}`}
                  />
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs">
                  {serviceCategories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setServiceSelectedCategory(cat)}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold shrink-0 transition cursor-pointer ${
                        serviceSelectedCategory === cat
                          ? "bg-[#414E36] text-white shadow-2xs"
                          : "bg-white text-[#5A6A51] border border-[#414E36]/15 hover:bg-gray-50"
                      }`}
                    >
                      {cat === "All" ? (isRTL ? "جميع الخدمات" : "All Services") : cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Services Grid */}
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pe-1 max-h-[42vh]">
                {filteredServicesList.length === 0 ? (
                  <div className="text-center py-10 text-xs text-[#5A6A51]">
                    <p className="font-bold">{tr.noServicesFound}</p>
                  </div>
                ) : (
                  filteredServicesList.map((svc) => {
                    const isSelected = String(selectedNewServiceId) === String(svc.id);
                    const isCurrent = String(primaryServiceId || booking.serviceId) === String(svc.id);
                    const svcPrice = getEffectiveServicePrice(svc, booking.branchId, branches);
                    const svcName = (isRTL ? svc.ar : svc.en) || svc.en || svc.ar;
                    const catLabel = svc.cat || (svc as any).category_ar || (svc as any).category_en || "";

                    return (
                      <div
                        key={svc.id}
                        onClick={() => setSelectedNewServiceId(svc.id)}
                        className={`flex items-center justify-between p-3.5 rounded-2xl border transition cursor-pointer ${
                          isSelected
                            ? "bg-[#EBF7EE] border-[#1E7E34] shadow-xs"
                            : isCurrent
                              ? "bg-amber-50/70 border-amber-200 hover:bg-amber-50"
                              : "bg-white border-[#414E36]/10 hover:border-[#414E36]/30 hover:bg-[#F4F5F1]"
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-xs text-[#1F251A]">
                              {svcName}
                            </span>
                            {catLabel && (
                              <span className="text-[10px] font-bold text-[#5A6A51] bg-[#EDF1EC] px-2 py-0.5 rounded-md">
                                {catLabel}
                              </span>
                            )}
                            {isCurrent && (
                              <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                                {isRTL ? "الخدمة الحالية" : "Current Service"}
                              </span>
                            )}
                          </div>
                          {svc.duration && (
                            <span className="text-[11px] text-[#5A6A51] block mt-0.5">
                              ⏱ {svc.duration} {isRTL ? "دقيقة" : "min"}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-black text-sm text-[#414E36]">
                            {svcPrice} EGP
                          </span>
                          <div className={`h-5 w-5 rounded-full flex items-center justify-center border ${
                            isSelected ? "bg-[#1E7E34] border-[#1E7E34] text-white" : "border-gray-300 bg-white"
                          }`}>
                            {isSelected && <Check size={12} />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#414E36]/10">
                <button
                  type="button"
                  onClick={() => {
                    setShowChangeServiceModal(false);
                    setServiceSearchTerm("");
                    setSelectedNewServiceId("");
                  }}
                  className="px-4 py-2.5 rounded-2xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                >
                  {tr.cancelBtn}
                </button>

                <button
                  type="button"
                  disabled={!selectedNewServiceId || String(selectedNewServiceId) === String(primaryServiceId || booking.serviceId)}
                  onClick={() => setShowPriceConfirmModal(true)}
                  className="flex items-center gap-2 rounded-2xl bg-[#414E36] px-6 py-2.5 text-xs font-black text-white hover:bg-[#343F2B] transition disabled:opacity-40 cursor-pointer shadow-sm"
                >
                  <span>{isRTL ? "مراجعة وتأكيد السعر" : "Review & Confirm Price"}</span>
                  <ArrowRight size={14} className={isRTL ? "rotate-180" : ""} />
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Price Change Confirmation Modal */}
      {showPriceConfirmModal && booking && (() => {
        const currentPrimaryService = (localServices || []).find(
          (s) => String(s.id) === String(primaryServiceId || booking.serviceId || (booking.serviceIds && booking.serviceIds[0])) ||
                 (s.en && s.en === ((booking as any).service || (booking as any).service_name)) ||
                 (s.ar && s.ar === ((booking as any).service || (booking as any).service_name))
        );
        const currentServicePrice = currentPrimaryService
          ? getEffectiveServicePrice(currentPrimaryService, booking.branchId, branches)
          : (Number((booking as any).total_price || (booking as any).price || 0) || 500);
        const currentServiceName = currentPrimaryService
          ? (isRTL ? currentPrimaryService.ar : currentPrimaryService.en)
          : ((booking as any).service || (booking as any).service_name || "Current Service");

        const selectedNewSvcObj = (localServices || []).find((s) => String(s.id) === String(selectedNewServiceId));
        const selectedNewSvcPrice = selectedNewSvcObj
          ? getEffectiveServicePrice(selectedNewSvcObj, booking.branchId, branches)
          : 0;
        const selectedNewSvcName = selectedNewSvcObj
          ? (isRTL ? selectedNewSvcObj.ar : selectedNewSvcObj.en)
          : "";

        const effectivePaidAmount = Number(booking.amountPaid || (booking as any).amount_paid || (booking as any).deposit_amount || 0);
        const attachedProductsSubtotal = ((booking as any).attachedProducts || []).reduce((sum: number, p: any) => sum + Number(p.total || 0), 0);
        const projectedNewInvoiceTotal = selectedNewSvcPrice + attachedProductsSubtotal;
        const projectedNewAmountLeft = Math.max(0, projectedNewInvoiceTotal - effectivePaidAmount);

        return (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-5 animate-fadeIn">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-[#414E36]/20 space-y-5">
              {/* Top Banner */}
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-2xl bg-[#EBF7EE] text-[#1E7E34] flex items-center justify-center shrink-0">
                  <Sparkles size={22} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-black text-[#1F251A] tracking-tight">
                    {tr.confirmServiceChangeTitle}
                  </h3>
                  <p className="text-xs text-[#5A6A51] mt-1 leading-relaxed">
                    {tr.confirmServiceChangeDesc}
                  </p>
                </div>
              </div>

              {/* Comparison Grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* Old Service Card */}
                <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-3.5 space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500 block">
                    {tr.originalServiceLabel}
                  </span>
                  <p className="font-bold text-xs text-gray-800 line-clamp-2">
                    {currentServiceName}
                  </p>
                  <p className="font-extrabold text-sm text-gray-700 pt-1">
                    {currentServicePrice} EGP
                  </p>
                </div>

                {/* New Service Card */}
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3.5 space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 block">
                    {tr.newServiceLabel}
                  </span>
                  <p className="font-bold text-xs text-emerald-950 line-clamp-2">
                    {selectedNewSvcName}
                  </p>
                  <p className="font-extrabold text-sm text-emerald-800 pt-1">
                    {selectedNewSvcPrice} EGP
                  </p>
                </div>
              </div>

              {/* Financial Recalculation Summary */}
              <div className="rounded-2xl bg-[#FBFBF9] border border-[#414E36]/10 p-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between text-[#5A6A51]">
                  <span>{tr.paidAmountLabel}:</span>
                  <span className="font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                    {effectivePaidAmount} EGP (100% {isRTL ? "محفوظ" : "Preserved"})
                  </span>
                </div>

                <div className="flex items-center justify-between text-[#5A6A51]">
                  <span>{isRTL ? "إجمالي الفاتورة الجديد:" : "New Total Invoice:"}</span>
                  <span className="font-bold text-[#1F251A]">
                    {projectedNewInvoiceTotal} EGP
                  </span>
                </div>

                <div className="pt-2 border-t border-[#414E36]/10 flex items-center justify-between text-[#1F251A]">
                  <span className="font-extrabold text-xs sm:text-sm">
                    {tr.remainingDueLabel}:
                  </span>
                  <span className={`font-black text-sm sm:text-base ${projectedNewAmountLeft > 0 ? "text-rose-700" : "text-emerald-700"}`}>
                    {projectedNewAmountLeft} EGP
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={isSavingServiceChange}
                  onClick={() => setShowPriceConfirmModal(false)}
                  className="px-4 py-2.5 rounded-2xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                >
                  {isRTL ? "رجوع" : "Back"}
                </button>

                <button
                  type="button"
                  disabled={isSavingServiceChange}
                  onClick={handleConfirmServiceChange}
                  className="flex items-center gap-2 rounded-2xl bg-[#0F3826] px-6 py-2.5 text-xs font-black text-white hover:bg-[#0A271A] transition disabled:opacity-50 cursor-pointer shadow-md"
                >
                  {isSavingServiceChange ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>{tr.updatingService}</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>{tr.saveServiceChangeBtn}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
