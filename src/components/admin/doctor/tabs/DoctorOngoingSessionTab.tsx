"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Play,
  FileText,
  Check,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Edit,
  Save,
  Sparkles,
  ShoppingBag,
  Zap,
  X,
  Clock,
  ChevronRight,
  UserCheck,
  Plus,
  Layers,
  Trash2,
  Printer,
  Loader2,
  Calendar
} from "lucide-react";
import { DoctorTab, MedicationItem } from "../types";
import { getAuthHeaders } from "../utils";
import { MedicalRecordTemplate, IntakeField } from "@/app/api/medical-records/templates/route";
import { checkIsLaserService } from "@/components/admin/bookings/BookingDetailsModal";
import { computeDeficitInvoiceImpact, computePackageDeficit, resolveDeliveredPulses } from "@/lib/laserDeficit";

export interface AdditionalServiceItem {
  id: string | number;
  serviceId?: number | string;
  name: string;
  price: number;
  deviceId?: string;
  deviceName?: string;
  pulses?: number;
  isLaser?: boolean;
}

interface DoctorOngoingSessionTabProps {
  activeSessionBooking: any;
  handleCompleteTreatment: (booking: any, totalPulses?: number, laserData?: any) => Promise<void>;
  medicalRecord: any;
  medicalRecordLoading: boolean;
  showMedicalForm: boolean;
  setShowMedicalForm: (show: boolean) => void;
  formSkinType: string;
  setFormSkinType: (val: string) => void;
  formAllergies: string;
  setFormAllergies: (val: string) => void;
  formMedicationDetails: string;
  setFormMedicationDetails: (val: string) => void;
  formMedicalConditionsDetails: string;
  setFormMedicalConditionsDetails: (val: string) => void;
  formPreviousTreatmentsDetails: string;
  setFormPreviousTreatmentsDetails: (val: string) => void;
  savingMedicalRecord: boolean;
  handleSaveMedicalRecord: (customData?: any) => void;
  servicesList?: any[];
  handleChangePrimaryService?: (targetBooking: any, newServiceId: string) => void;
  productsList: any[];
  devicesList: any[];
  selectedProductId: string;
  setSelectedProductId: (id: string) => void;
  selectedProductQty: number;
  setSelectedProductQty: (qty: number) => void;
  usedProducts: { id: string; name: string; qty: number; unitPrice: number; total: number }[];
  handleAddProductToSession: () => void;
  handleRemoveProductFromSession: (index: number) => void;
  selectedDeviceId: string;
  setSelectedDeviceId: (id: string) => void;
  extraPulsesCount: number;
  setExtraPulsesCount: (count: number) => void;
  pricePerPulse: number;
  setPricePerPulse: (price: number) => void;
  baseBookingPrice: number;
  productsSubtotal: number;
  extraPulsesSubtotal: number;
  updatedInvoiceTotal: number;
  clinicalNote: string;
  setClinicalNote: (note: string) => void;
  handleSaveClinicalNote: (booking: any) => void;
  savingNote: boolean;
  setActiveTab: (tab: DoctorTab) => void;
  reservations?: any[];
  setActiveSessionBooking?: (booking: any) => void;
  onStartOngoingSession?: (booking: any) => void;
  onAdditionalServicesChange?: (services: AdditionalServiceItem[]) => void;
  t: any;
}

export default function DoctorOngoingSessionTab({
  activeSessionBooking,
  handleCompleteTreatment,
  medicalRecord,
  medicalRecordLoading,
  showMedicalForm,
  setShowMedicalForm,
  formSkinType,
  setFormSkinType,
  formAllergies,
  setFormAllergies,
  formMedicationDetails,
  setFormMedicationDetails,
  formMedicalConditionsDetails,
  setFormMedicalConditionsDetails,
  formPreviousTreatmentsDetails,
  setFormPreviousTreatmentsDetails,
  savingMedicalRecord,
  handleSaveMedicalRecord,
  servicesList = [],
  handleChangePrimaryService,
  productsList = [],
  devicesList = [],
  selectedProductId,
  setSelectedProductId,
  selectedProductQty,
  setSelectedProductQty,
  usedProducts,
  handleAddProductToSession,
  handleRemoveProductFromSession,
  selectedDeviceId,
  setSelectedDeviceId,
  extraPulsesCount,
  setExtraPulsesCount,
  pricePerPulse,
  setPricePerPulse,
  baseBookingPrice,
  productsSubtotal,
  extraPulsesSubtotal,
  updatedInvoiceTotal,
  clinicalNote,
  setClinicalNote,
  handleSaveClinicalNote,
  savingNote,
  setActiveTab,
  reservations = [],
  setActiveSessionBooking,
  onStartOngoingSession,
  onAdditionalServicesChange,
  t
}: DoctorOngoingSessionTabProps) {
  // Laser Pulse Counter Engine State
  const [laserMode, setLaserMode] = useState<"SERVICE" | "PER_PULSE" | "PACKAGE">("SERVICE");
  const [treatmentArea, setTreatmentArea] = useState<string>("Face");
  const [customTreatmentArea, setCustomTreatmentArea] = useState<string>("");
  const [standardPulsesDelivered, setStandardPulsesDelivered] = useState<number>(100);
  const [hasAdditionalPulses, setHasAdditionalPulses] = useState<boolean>(false);
  const [additionalPulsesQty, setAdditionalPulsesQty] = useState<number>(0);
  const [additionalPulseUnitPrice, setAdditionalPulseUnitPrice] = useState<number>(5);
  const [additionalPulsesReason, setAdditionalPulsesReason] = useState<string>("");
  const [patientActivePackages, setPatientActivePackages] = useState<any[]>([]);
  const [selectedLaserPackageId, setSelectedLaserPackageId] = useState<string>("");
  const [loadingLaserData, setLoadingLaserData] = useState<boolean>(false);

  // Deficit Spillover Choice: Choice 3A (Buy New Package) or Choice 3B (Pay Rest per Pulse)
  const [packageSpilloverChoice, setPackageSpilloverChoice] = useState<"BUY_NEW_PACKAGE" | "PAY_PER_PULSE">("PAY_PER_PULSE");
  const [allCatalogPackages, setAllCatalogPackages] = useState<any[]>([]);
  const [selectedNewPackageToBuy, setSelectedNewPackageToBuy] = useState<any>(null);

  // Auto-detect laser mode and pulse price from active session booking notes / metadata
  useEffect(() => {
    if (!activeSessionBooking) return;
    const notesStr = String(activeSessionBooking.notes || "").toLowerCase();
    const rawMode = activeSessionBooking.laserPaymentMode || activeSessionBooking.laser_payment_mode;
    if (rawMode === "PER_PULSE" || notesStr.includes("pay per pulse") || notesStr.includes("per_pulse")) {
      setLaserMode("PER_PULSE");
    } else if (rawMode === "PACKAGE" || notesStr.includes("pulse package") || notesStr.includes("package redemption")) {
      setLaserMode("PACKAGE");
    } else {
      setLaserMode("SERVICE");
    }
    if (activeSessionBooking.laserPricePerPulse || activeSessionBooking.laser_price_per_pulse) {
      setAdditionalPulseUnitPrice(Number(activeSessionBooking.laserPricePerPulse || activeSessionBooking.laser_price_per_pulse));
    }
  }, [activeSessionBooking]);

  // Load catalog packages for Choice 3A (Buy New Package)
  useEffect(() => {
    fetch("/api/packages")
      .then((r) => r.json())
      .then((data) => {
        const pkgs = Array.isArray(data) ? data : data.packages || [];
        setAllCatalogPackages(pkgs);
        if (pkgs.length > 0 && !selectedNewPackageToBuy) {
          setSelectedNewPackageToBuy(pkgs[0]);
        }
      })
      .catch(() => {});
  }, []);

  // Additional Services added during ongoing treatment session
  const [additionalServices, setAdditionalServices] = useState<AdditionalServiceItem[]>([]);
  const [selectedServiceIdToAdd, setSelectedServiceIdToAdd] = useState<string>("");

  // Intake Template state for the active booking's selected service
  const [activeTemplate, setActiveTemplate] = useState<MedicalRecordTemplate | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState<boolean>(false);
  const [dynamicResponses, setDynamicResponses] = useState<Record<string, any>>({});

  // Inline Prescription State (positioned above services & products)
  const [existingRxId, setExistingRxId] = useState<string | null>(null);
  const [loadingRx, setLoadingRx] = useState(false);
  const [rxDiagnosis, setRxDiagnosis] = useState("");
  const [rxMedications, setRxMedications] = useState<MedicationItem[]>([
    { name: "", dosage: "", frequency: "", duration: "" }
  ]);
  const [rxGeneralNotes, setRxGeneralNotes] = useState("");
  const [rxHasFollowUp, setRxHasFollowUp] = useState(false);
  const [rxFollowUpDate, setRxFollowUpDate] = useState("");
  const [rxFollowUpNotes, setRxFollowUpNotes] = useState("");
  const [savingRxInline, setSavingRxInline] = useState(false);

  // Fetch patient active packages for laser engine
  useEffect(() => {
    if (!activeSessionBooking) return;
    const custId = activeSessionBooking.customerId || activeSessionBooking.customer_id;
    if (!custId) return;

    setLoadingLaserData(true);
    getAuthHeaders().then(async (headers) => {
      try {
        // Fetch active packages
        const pkgRes = await fetch(`/api/customers/packages?customerId=${encodeURIComponent(custId)}`, { headers });
        if (pkgRes.ok) {
          const pkgData = await pkgRes.json();
          const pkgs = pkgData.customerPackages || pkgData.packages || [];
          const activePulsePkgs = pkgs.filter((p: any) => {
            const rem = Number(
              p.remainingPulses ??
              p.pulsesRemaining ??
              p.remaining_pulses ??
              p.pulses_remaining ??
              (Number(p.totalPulses ?? p.includedPulses ?? p.total_pulses ?? p.included_pulses ?? 0) - Number(p.usedPulses ?? p.used_pulses ?? 0))
            );
            const exp = p.expiresAt || p.expires_at;
            const isNotExpired = !exp || new Date(exp) >= new Date();
            const isPulseType = p.packageType === "pulses" || p.package_type === "pulses" || Number(p.totalPulses || p.total_pulses || 0) > 0 || (p.items || []).length === 0;
            return (p.status || "active").toLowerCase() === "active" && rem > 0 && isNotExpired && isPulseType;
          });
          setPatientActivePackages(activePulsePkgs);
          const bookingLinkedPkgId = activeSessionBooking.packageId || activeSessionBooking.package_id;
          if (bookingLinkedPkgId && activePulsePkgs.some((p: any) => String(p.id) === String(bookingLinkedPkgId))) {
            setSelectedLaserPackageId(String(bookingLinkedPkgId));
          } else if (activePulsePkgs.length > 0 && (!selectedLaserPackageId || !activePulsePkgs.some((p: any) => String(p.id) === String(selectedLaserPackageId)))) {
            setSelectedLaserPackageId(String(activePulsePkgs[0].id));
          }
        }
      } catch (err) {
        console.error("Error fetching patient laser pulse data:", err);
      } finally {
        setLoadingLaserData(false);
      }
    });
  }, [activeSessionBooking?.customerId, activeSessionBooking?.customer_id, activeSessionBooking?.packageId, activeSessionBooking?.package_id]);

  // Load clinic default price per pulse from booking settings
  useEffect(() => {
    fetch("/api/page-settings")
      .then((r) => r.json())
      .then((data) => {
        if (data?.booking?.defaultPricePerPulse !== undefined) {
          setAdditionalPulseUnitPrice(Number(data.booking.defaultPricePerPulse));
        }
      })
      .catch(() => {});
  }, []);

  const setFollowUpPresetDays = (days: number) => {
    const target = new Date();
    target.setDate(target.getDate() + days);
    const y = target.getFullYear();
    const m = String(target.getMonth() + 1).padStart(2, "0");
    const d = String(target.getDate()).padStart(2, "0");
    setRxFollowUpDate(`${y}-${m}-${d}`);
    setRxHasFollowUp(true);
  };

  // Preload existing prescription for the active session booking
  useEffect(() => {
    if (!activeSessionBooking?.id) {
      setExistingRxId(null);
      setRxDiagnosis("");
      setRxMedications([{ name: "", dosage: "", frequency: "", duration: "" }]);
      setRxGeneralNotes("");
      setRxHasFollowUp(false);
      setRxFollowUpDate("");
      setRxFollowUpNotes("");
      return;
    }

    const fetchExistingPrescription = async () => {
      setLoadingRx(true);
      try {
        const headers = await getAuthHeaders();
        const bookingId = activeSessionBooking.id;
        const res = await fetch(`/api/prescriptions?booking_id=${encodeURIComponent(bookingId)}`, { headers });
        if (res.ok) {
          const data = await res.json();
          const rxList = Array.isArray(data) ? data : data.prescriptions || [];
          const existing = rxList.find((rx: any) => String(rx.booking_id) === String(bookingId)) || (rxList.length > 0 ? rxList[0] : null);
          if (existing) {
            setExistingRxId(existing.id);
            setRxDiagnosis(existing.diagnosis || "");
            if (Array.isArray(existing.medications) && existing.medications.length > 0) {
              setRxMedications(existing.medications);
            }
            setRxGeneralNotes(existing.instructions || existing.general_notes || "");
            if (existing.follow_up_date) {
              setRxFollowUpDate(String(existing.follow_up_date).slice(0, 10));
              setRxHasFollowUp(true);
            }
            if (existing.follow_up_notes) {
              setRxFollowUpNotes(existing.follow_up_notes);
            }
          } else {
            setExistingRxId(null);
          }
        }
      } catch (err) {
        console.error("Error fetching existing prescription:", err);
      } finally {
        setLoadingRx(false);
      }
    };

    fetchExistingPrescription();
  }, [activeSessionBooking?.id]);

  // Sync follow-up from existing booking
  useEffect(() => {
    if (!activeSessionBooking) return;
    const existingFollowUp = activeSessionBooking.followUpDate || activeSessionBooking.follow_up_date;
    if (existingFollowUp) {
      setRxFollowUpDate(String(existingFollowUp).slice(0, 10));
      setRxHasFollowUp(true);
    }
  }, [activeSessionBooking?.id]);

  // Fetch specialized intake template matching current service
  useEffect(() => {
    if (!activeSessionBooking) return;
    const serviceName = activeSessionBooking.service || activeSessionBooking.service_name;
    const matchedSrv = servicesList?.find(
      (s) =>
        String(s.id) === String(activeSessionBooking.serviceId || activeSessionBooking.service_id) ||
        (s.en && s.en === serviceName) ||
        (s.ar && s.ar === serviceName) ||
        (s.name && s.name === serviceName) ||
        (s.name_en && s.name_en === serviceName) ||
        (s.name_ar && s.name_ar === serviceName) ||
        (s.title && s.title === serviceName) ||
        (s.title_en && s.title_en === serviceName)
    );
    const serviceId = activeSessionBooking.serviceId || activeSessionBooking.service_id || matchedSrv?.id;

    const fetchMatchingTemplate = async () => {
      setLoadingTemplate(true);
      try {
        const headers = await getAuthHeaders();
        const url = serviceId
          ? `/api/medical-records/templates?serviceId=${encodeURIComponent(String(serviceId))}`
          : `/api/medical-records/templates`;
        const res = await fetch(url, { headers });
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
  }, [activeSessionBooking?.service, activeSessionBooking?.service_name, activeSessionBooking?.serviceId, activeSessionBooking?.service_id, servicesList]);

  // Sync dynamic responses whenever medicalRecord or activeTemplate updates
  useEffect(() => {
    if (!activeTemplate) return;
    const initial: Record<string, any> = {};
    const existingResponses = medicalRecord?.responses || {};

    (activeTemplate.fields || []).forEach((f) => {
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



  // Preload any existing additional services from session booking notes
  useEffect(() => {
    if (!activeSessionBooking?.notes) return;
    const notesStr = String(activeSessionBooking.notes);
    const addSvcBlockMatch = notesStr.match(/\[Additional Services(?: Used)?(?: During Session)?\]:\s*([^\n\[]+)/i);
    if (addSvcBlockMatch) {
      const rawBlock = addSvcBlockMatch[1];
      const items = rawBlock.split(/,(?![^(]*\))/);
      const parsed: AdditionalServiceItem[] = [];
      for (const item of items) {
        const trimmed = item.trim();
        if (!trimmed) continue;
        const m1 = trimmed.match(/^(.+?)\s*\(Qty:\s*(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*EGP\s*=\s*(\d+(?:\.\d+)?)\s*EGP(?:\s*,\s*Pulses:\s*(\d+))?[^)]*\)/i);
        if (m1) {
          const srvName = m1[1].trim();
          const srvPrice = Number(m1[4]) || Number(m1[3]) || 0;
          const pulsesCount = m1[5] ? Number(m1[5]) : 0;
          parsed.push({
            id: Date.now() + Math.random(),
            name: srvName,
            price: srvPrice,
            pulses: pulsesCount
          });
        }
      }
      if (parsed.length > 0 && additionalServices.length === 0) {
        setAdditionalServices(parsed);
        onAdditionalServicesChange?.(parsed);
      }
    }
  }, [activeSessionBooking?.id]);

  // Helper to persist updated services to DB reservation notes & amountLeft immediately
  const autoSyncServicesToBooking = (updated: AdditionalServiceItem[]) => {
    const bookingId = activeSessionBooking?.id || (activeSessionBooking as any)?.booking_id;
    if (!bookingId) return;

    const addSvcString = updated.length > 0
      ? `\n[Additional Services Used]: ${updated.map(s => {
          const srv = servicesList.find((x) => String(x.id) === String(s.serviceId));
          const isLaser = s.isLaser || checkIsLaserService(srv);
          const effectivePrice = (laserMode === "PACKAGE" && isLaser) ? 0 : s.price;
          return `${s.name} (Qty: 1 x ${effectivePrice} EGP = ${effectivePrice} EGP${Number(s.pulses) > 0 ? `, Pulses: ${s.pulses}` : ""})`;
        }).join(", ")}`
      : "";
    
    let currentNotes = String(activeSessionBooking?.notes || "");
    currentNotes = currentNotes.replace(/\[Additional Services(?: Used)?(?: During Session)?\]:[^\n\[]*/gi, "").trim();
    const newNotes = currentNotes ? `${currentNotes}${addSvcString}` : addSvcString.trim();

    const addSubtotal = updated.reduce((sum, s) => {
      const srv = servicesList.find((x) => String(x.id) === String(s.serviceId));
      const isLaser = s.isLaser || checkIsLaserService(srv);
      if (laserMode === "PACKAGE" && isLaser) return sum;
      return sum + s.price;
    }, 0);
    const effectiveBase = laserMode === "PACKAGE" ? 0 : (laserMode === "PER_PULSE" ? (standardPulsesDelivered * additionalPulseUnitPrice) : baseBookingPrice);
    const newAmountLeft = Math.max(0, (effectiveBase + addSubtotal + productsSubtotal + extraPulsesSubtotal + laserAdditionalCharge) - Number(activeSessionBooking?.amountPaid || 0));

    getAuthHeaders().then(headers => {
      fetch(`/api/reservations?id=${encodeURIComponent(bookingId)}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          notes: newNotes,
          amountLeft: newAmountLeft
        })
      }).catch(err => console.error("Error auto-syncing additional services to session:", err));
    });
  };

  // Handler to add an additional service to the session
  const handleAddServiceToSession = () => {
    if (!selectedServiceIdToAdd) return;
    const srv = servicesList.find((s) => String(s.id) === String(selectedServiceIdToAdd));
    if (!srv) return;

    const srvName = srv.en || srv.name || srv.title || "Clinical Service";
    const isLaser = checkIsLaserService(srv);
    const srvPrice = (laserMode === "PACKAGE" && isLaser) ? 0 : Number(srv.price || 0);

    const newItem: AdditionalServiceItem = {
      id: Date.now(),
      serviceId: srv.id,
      name: srvName,
      price: srvPrice,
      isLaser: isLaser
    };

    const updated = [...additionalServices, newItem];
    setAdditionalServices(updated);
    onAdditionalServicesChange?.(updated);
    autoSyncServicesToBooking(updated);
    setSelectedServiceIdToAdd("");
  };

  const handleRemoveServiceFromSession = (id: string | number) => {
    const updated = additionalServices.filter((item) => item.id !== id);
    setAdditionalServices(updated);
    onAdditionalServicesChange?.(updated);
    autoSyncServicesToBooking(updated);
  };

  // Inline prescription creation handler
  const handleSaveInlinePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSessionBooking) return;
    setSavingRxInline(true);
    try {
      const headers = await getAuthHeaders();
      const payload: Record<string, any> = {
        booking_id: activeSessionBooking.id,
        customer_id: activeSessionBooking.customerId || (activeSessionBooking as any).customer_id || null,
        patient_name: activeSessionBooking.name || (activeSessionBooking as any).customer_name || "Patient",
        customer_name: activeSessionBooking.name || (activeSessionBooking as any).customer_name || "Patient",
        doctor_name: activeSessionBooking.doctorName || null,
        diagnosis: rxDiagnosis,
        medications: rxMedications.filter((m) => m.name.trim()),
        instructions: rxGeneralNotes,
        general_notes: rxGeneralNotes,
        date: activeSessionBooking.date || new Date().toISOString().slice(0, 10),
      };

      if (existingRxId) {
        payload.id = existingRxId;
      }
      if (rxHasFollowUp && rxFollowUpDate) {
        payload.follow_up_date = rxFollowUpDate;
      }
      if (rxHasFollowUp && rxFollowUpNotes) {
        payload.follow_up_notes = rxFollowUpNotes;
      }

      const res = await fetch("/api/prescriptions", {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const resData = await res.json().catch(() => null);
        if (resData?.id) {
          setExistingRxId(resData.id);
        } else if (resData?.prescription?.id) {
          setExistingRxId(resData.prescription.id);
        }

        // Also sync follow_up_date to the reservation record
        if (activeSessionBooking.id) {
          fetch(`/api/reservations?id=${encodeURIComponent(activeSessionBooking.id)}`, {
            method: "PATCH",
            headers,
            body: JSON.stringify({
              followUpDate: rxHasFollowUp && rxFollowUpDate ? rxFollowUpDate : null
            })
          }).catch(err => console.error("Error syncing follow_up_date to booking:", err));
        }

        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("revera-prescription-change"));
          window.dispatchEvent(new CustomEvent("revera-booking-change"));
        }

        alert("Prescription saved successfully!");
      } else {
        const errData = await res.json().catch(() => null);
        const errMsg = (errData as any)?.error || (errData as any)?.message || "Failed to save prescription. Please try again.";
        alert(errMsg);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save prescription. Please check your connection and try again.");
    } finally {
      setSavingRxInline(false);
    }
  };

  const TREATMENT_AREAS = [
    "Face",
    "Full Body",
    "Underarms",
    "Bikini",
    "Full Arms",
    "Half Arms",
    "Full Legs",
    "Half Legs",
    "Back",
    "Chest & Abdomen",
    "Full Beard",
    "Custom"
  ];

  // Active Package & Deficit Calculation
  const selectedPkg = patientActivePackages.find((p) => String(p.id) === String(selectedLaserPackageId)) || patientActivePackages[0];
  const availablePkgPulses = selectedPkg ? Number(
    selectedPkg.remainingPulses ??
    selectedPkg.pulsesRemaining ??
    selectedPkg.remaining_pulses ??
    selectedPkg.pulses_remaining ??
    (Number(selectedPkg.totalPulses ?? selectedPkg.includedPulses ?? selectedPkg.total_pulses ?? selectedPkg.included_pulses ?? 0) - Number(selectedPkg.usedPulses ?? selectedPkg.used_pulses ?? 0))
  ) : 0;
  const isNoActivePackage = patientActivePackages.length === 0;

  // Additional laser pulses delivered in this session
  const additionalLaserPulses = additionalServices.reduce((sum, item) => {
    const srv = servicesList.find((x) => String(x.id) === String(item.serviceId));
    const isLaser = item.isLaser || checkIsLaserService(srv);
    return sum + (isLaser ? Number(item.pulses || 0) : 0);
  }, 0);
  const totalLaserDeliveredPulses = resolveDeliveredPulses(standardPulsesDelivered, additionalLaserPulses);
  const packageDeficit = computePackageDeficit({
    deliveredPulses: totalLaserDeliveredPulses,
    remainingPulses: availablePkgPulses,
    hasActivePackage: !isNoActivePackage,
  });

  // Total pulses for the catalog package being purchased — the real total_pulses field only.
  // null means "no pulse quota configured" and must block the buy-new-package choice, never a guess.
  const newPackageTotalPulses: number | null = (() => {
    const raw = Number(
      selectedNewPackageToBuy?.total_pulses ??
      selectedNewPackageToBuy?.totalPulses ??
      selectedNewPackageToBuy?.included_pulses ??
      selectedNewPackageToBuy?.includedPulses ??
      0
    );
    return raw > 0 ? raw : null;
  })();

  // Calculate Subtotals
  const additionalServicesSubtotal = additionalServices.reduce((sum, item) => {
    const srv = servicesList.find((x) => String(x.id) === String(item.serviceId));
    const isLaser = item.isLaser || checkIsLaserService(srv);
    if (laserMode === "PACKAGE" && isLaser) return sum;
    return sum + (Number(item.price) || 0);
  }, 0);
  
  // Base Service Price:
  // Option 1 (SERVICE): Fixed base booking price
  // Option 2 (PER_PULSE): Dynamic price = standardPulsesDelivered * additionalPulseUnitPrice
  // Option 3 (PACKAGE): 0 EGP base (redeemed from package)
  const effectiveBaseServicePrice = laserMode === "SERVICE" ? baseBookingPrice : (laserMode === "PER_PULSE" ? (standardPulsesDelivered * additionalPulseUnitPrice) : 0);
  const totalServicesPrice = effectiveBaseServicePrice + additionalServicesSubtotal;
  
  // Laser Additional / Deficit Charges:
  // Scenario 1 (No Package): Patient pays only new package price (e.g. 7000 EGP)
  // Scenario 2 (Deficit): Choice 3A (Buy new package = new package price) or Choice 3B (Pay per pulse = deficit * rate)
  // Scenario 3 (Normal package redemption): 0 EGP
  const laserAdditionalCharge = laserMode === "SERVICE" && hasAdditionalPulses
    ? (additionalPulsesQty * additionalPulseUnitPrice)
    : laserMode === "PACKAGE"
    ? (isNoActivePackage
        ? Number(selectedNewPackageToBuy?.price || 0)
        : packageDeficit > 0
        ? computeDeficitInvoiceImpact({
            deficitPulses: packageDeficit,
            choice: packageSpilloverChoice,
            pricePerPulse: additionalPulseUnitPrice,
            newPackagePrice: selectedNewPackageToBuy?.price,
          })
        : 0)
    : 0;

  // Total Pulses Calculated = (Delivered Laser Pulses) + (Additional Services Pulses) + (Additional Pulses)
  const additionalPulsesTotal = additionalServices.reduce((sum, item) => sum + (item.pulses || 0), 0);
  const totalSessionPulses = standardPulsesDelivered + (hasAdditionalPulses && laserMode === "SERVICE" ? additionalPulsesQty : 0) + additionalPulsesTotal;

  // Final Session Invoice Total (mixed session: base/pulse + non-laser additional services + products + package/deficit charges)
  const finalSessionTotal = totalServicesPrice + productsSubtotal + laserAdditionalCharge;

  // Resolved active service name with catalog fallback
  const resolvedActiveServiceName = useMemo(() => {
    if (!activeSessionBooking) return "Clinical Session";
    if (activeSessionBooking.service) return activeSessionBooking.service;
    if (activeSessionBooking.service_name) return activeSessionBooking.service_name;
    const svcId = activeSessionBooking.service_id || activeSessionBooking.serviceId;
    if (svcId && Array.isArray(servicesList)) {
      const match = servicesList.find((s) => String(s.id) === String(svcId));
      if (match) return match.en || match.name || match.title || "Clinical Session";
    }
    return "Clinical Session";
  }, [activeSessionBooking, servicesList]);

  // Find all active / started sessions from reservations list
  const activeSessionsList = reservations.filter((r) => {
    const st = String(r.status || "").toLowerCase().trim();
    return st === "started" || st === "in-progress" || st === "in_progress" || st === "active" || st === "in treatment";
  });

  // Auto-sync active booking if currently null but active session exists
  useEffect(() => {
    if ((!activeSessionBooking || activeSessionBooking.status === "completed" || activeSessionBooking.status === "done") && activeSessionsList.length > 0 && setActiveSessionBooking) {
      setActiveSessionBooking(activeSessionsList[0]);
    }
  }, [activeSessionBooking, activeSessionsList, setActiveSessionBooking]);

  // Find all non-completed queue bookings
  const queueBookings = reservations.filter(
    (r) => r.status !== "completed" && r.status !== "cancelled"
  );

  // Determine if this is strictly the patient's first clinic visit
  const patientPastCompletedVisits = useMemo(() => {
    if (!activeSessionBooking) return [];
    const custId = activeSessionBooking.customer_id || activeSessionBooking.customerId;
    const phone = activeSessionBooking.phone || activeSessionBooking.customer_phone;
    const name = (activeSessionBooking.name || activeSessionBooking.customer_name || "").toLowerCase().trim();

    return reservations.filter((r) => {
      if (String(r.id) === String(activeSessionBooking.id)) return false;
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
  }, [activeSessionBooking, reservations]);

  const isFirstVisit = !medicalRecord && patientPastCompletedVisits.length === 0;
  const isReturningPatient = !!medicalRecord || patientPastCompletedVisits.length > 0;

  return (
    <div className="space-y-6 w-full">
      {activeSessionBooking && activeSessionBooking.status !== "completed" && activeSessionBooking.status !== "done" ? (
        <>
          {/* Active Patient Header Card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl sm:rounded-3xl bg-white p-4 sm:p-6 border border-[#414E36]/10 shadow-sm w-full">
            <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
              <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-[#414E36] text-white font-bold text-lg sm:text-xl shadow-md">
                {(activeSessionBooking.name || activeSessionBooking.customer_name || "P").slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-bold text-[#1F251A] truncate">
                    {activeSessionBooking.name || activeSessionBooking.customer_name || "Patient"}
                  </h2>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 sm:px-3 py-0.5 text-[11px] sm:text-xs font-bold text-amber-800 animate-pulse">
                    <Play size={11} /> {t.sessionStartedByReception}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-[#5A6A51] mt-1 flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <strong className="text-[#414E36] font-bold">
                    {resolvedActiveServiceName}
                  </strong>
                  <span>•</span>
                  <span>{activeSessionBooking.time || activeSessionBooking.time_slot || activeSessionBooking.requested_time || activeSessionBooking.requestedTime || "Today"}</span>
                  <span>•</span>
                  <span className="text-[#414E36] font-bold">{activeSessionBooking.room || activeSessionBooking.room_name || "Treatment Room"}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={async () => {
                  if (isFirstVisit && !medicalRecord) {
                    alert("Cannot complete treatment: Medical record intake is strictly required for first-visit patients. Please complete and save the intake form before ending the session.");
                    setShowMedicalForm(true);
                    return;
                  }

                  // Option 1 extra charge validation: mandatory reason
                  if (laserMode === "SERVICE" && hasAdditionalPulses && additionalPulsesQty > 0 && additionalPulseUnitPrice > 0 && !additionalPulsesReason.trim()) {
                    alert("Mandatory field missing: Please provide a reason for the additional pulse charge before completing the session.");
                    return;
                  }

                  // Option 2 validation: must have delivered pulses > 0
                  if (laserMode === "PER_PULSE" && standardPulsesDelivered <= 0) {
                    alert("Please enter the number of laser pulses delivered in this session.");
                    return;
                  }

                  // Option 3 package validation
                  if (laserMode === "PACKAGE") {
                    if (isNoActivePackage && !selectedNewPackageToBuy) {
                      alert("Please select a pulse package to purchase for this patient, or switch to Option 1/2.");
                      return;
                    }
                    if (standardPulsesDelivered <= 0) {
                      alert("Please enter the number of laser pulses delivered in this session.");
                      return;
                    }
                    const needsNewPackage = isNoActivePackage || (packageDeficit > 0 && packageSpilloverChoice === "BUY_NEW_PACKAGE");
                    if (needsNewPackage && selectedNewPackageToBuy && newPackageTotalPulses === null) {
                      alert("This package has no pulse quota configured — set Total Pulses in Admin → Packages.");
                      return;
                    }
                  }

                  const isInitialPurchase = laserMode === "PACKAGE" && isNoActivePackage;
                  const effectiveChoice = isInitialPurchase ? "BUY_NEW_PACKAGE" : packageSpilloverChoice;
                  const effectiveNewPackage = (isInitialPurchase || (laserMode === "PACKAGE" && packageDeficit > 0 && effectiveChoice === "BUY_NEW_PACKAGE")) ? selectedNewPackageToBuy : null;

                  const laserPulseData = {
                    pulseType: laserMode,
                    treatmentArea: treatmentArea === "Custom" ? customTreatmentArea || "Custom Area" : treatmentArea,
                    pulsesUsed: laserMode === "PACKAGE" ? totalLaserDeliveredPulses : standardPulsesDelivered,
                    additionalPulses: hasAdditionalPulses && laserMode === "SERVICE" ? additionalPulsesQty : (laserMode === "PACKAGE" && packageDeficit > 0 && effectiveChoice === "PAY_PER_PULSE" ? packageDeficit : 0),
                    pulseValue: additionalPulseUnitPrice,
                    additionalCharge: laserAdditionalCharge,
                    additionalReason: laserMode === "SERVICE"
                      ? additionalPulsesReason
                      : laserMode === "PACKAGE"
                      ? (isInitialPurchase
                          ? `Initial package purchase (${selectedNewPackageToBuy?.name || selectedNewPackageToBuy?.title || "Laser Pulses Package"}): ${standardPulsesDelivered} pulses redeemed from ${newPackageTotalPulses} total pulses`
                          : packageDeficit > 0
                          ? `Package deficit resolution (${packageDeficit} pulses via ${effectiveChoice})`
                          : `Package redemption from ${selectedPkg?.package_name || selectedPkg?.name || "Laser Package"}`)
                      : "Standard laser pulse delivery",
                    sourceId: laserMode === "PACKAGE" ? (selectedPkg?.id || null) : null,
                    sourceName: laserMode === "PACKAGE" ? (selectedPkg?.package_name || selectedPkg?.name || null) : null,
                    selectedPackage: selectedPkg,
                    deviceId: selectedDeviceId,
                    deviceName: devicesList.find(d => String(d.id) === String(selectedDeviceId))?.name,
                    deficitPulses: laserMode === "PACKAGE" ? packageDeficit : 0,
                    spilloverChoice: laserMode === "PACKAGE" ? effectiveChoice : null,
                    newPackageToBuy: effectiveNewPackage,
                    isInitialPackagePurchase: isInitialPurchase,
                    newPackageTotalPulses: newPackageTotalPulses
                  };

                  await handleCompleteTreatment(activeSessionBooking, totalSessionPulses, laserPulseData);
                }}
                className={`w-full sm:w-auto justify-center flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-bold transition cursor-pointer shadow-md ${
                  isFirstVisit && !medicalRecord
                    ? "bg-amber-700 hover:bg-amber-800 text-white"
                    : "bg-[#414E36] hover:bg-[#343F2B] text-white"
                }`}
                title={isFirstVisit && !medicalRecord ? "Medical Intake Required (First Visit)" : "Complete Treatment"}
              >
                <Check size={16} /> {t.completeTreatmentBtn}
              </button>
            </div>
          </div>

          {/* Main 2-Column Treatment Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 w-full">
            
            {/* LEFT COLUMN (1/3 Width): Patient Medical Record & Clinical Notes Intake */}
            <div className="space-y-4 sm:space-y-6">
              <div className="rounded-2xl sm:rounded-3xl border border-[#414E36]/10 bg-white p-4 sm:p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="space-y-0.5">
                    <h3 className="text-xs sm:text-sm font-bold text-[#1F251A] uppercase tracking-wider flex items-center gap-2">
                      <AlertCircle size={16} className="text-[#414E36]" /> {t.patientMedicalRecordTitle}
                    </h3>
                    {activeTemplate && (
                      <span className="text-[10px] font-extrabold text-[#414E36] bg-[#EDF1EC] px-2 py-0.5 rounded-md inline-block">
                        {activeTemplate.title}
                      </span>
                    )}
                  </div>

                  {medicalRecord ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 shrink-0">
                      <CheckCircle2 size={10} /> {t.onFileStatus}
                    </span>
                  ) : isFirstVisit ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold text-rose-800 shrink-0 animate-pulse">
                      <AlertTriangle size={10} /> Intake Required (1st Visit)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200 shrink-0">
                      <CheckCircle2 size={10} /> Returning Patient ({patientPastCompletedVisits.length} {patientPastCompletedVisits.length === 1 ? "visit" : "visits"})
                    </span>
                  )}
                </div>

                {medicalRecordLoading || loadingTemplate ? (
                  <p className="text-xs text-[#5A6A51] flex items-center gap-1.5 py-4 justify-center">
                    <Loader2 size={14} className="animate-spin text-[#414E36]" /> {t.loadingMedicalRecord}
                  </p>
                ) : medicalRecord && !showMedicalForm ? (
                  /* Display Existing Medical Record */
                  <div className="space-y-2.5 text-xs bg-[#FBFBF9] p-3.5 sm:p-4 rounded-2xl border border-[#414E36]/10">
                    {(activeTemplate?.fields || []).length > 0 ? (
                      (activeTemplate?.fields || []).map((f) => {
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
                          <span className="font-bold text-[#5A6A51]">{t.skinTypeLabel}:</span>
                          <span className="font-bold text-[#1F251A]">{medicalRecord.skin_type || "Normal"}</span>
                        </div>
                        <div className="flex justify-between border-b border-[#414E36]/10 pb-2">
                          <span className="font-bold text-[#5A6A51]">{t.allergiesLabel}:</span>
                          <span className="font-bold text-rose-700">{medicalRecord.allergies || "None reported"}</span>
                        </div>
                        <div className="flex justify-between border-b border-[#414E36]/10 pb-2">
                          <span className="font-bold text-[#5A6A51]">{t.currentMedicationLabel}:</span>
                          <span className="font-semibold text-[#1F251A]">{medicalRecord.medication_details || "None"}</span>
                        </div>
                        <div className="flex justify-between border-b border-[#414E36]/10 pb-2">
                          <span className="font-bold text-[#5A6A51]">{t.medicalConditionsLabel}:</span>
                          <span className="font-semibold text-[#1F251A]">{medicalRecord.medical_conditions_details || "None"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-bold text-[#5A6A51]">{t.previousTreatmentsLabel}:</span>
                          <span className="font-semibold text-[#1F251A]">{medicalRecord.previous_treatments_details || "None"}</span>
                        </div>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => setShowMedicalForm(true)}
                      className="mt-2 flex items-center gap-1.5 text-xs font-bold text-[#414E36] hover:underline cursor-pointer"
                    >
                      <Edit size={14} /> {t.updateMedicalRecordBtn}
                    </button>
                  </div>
                ) : (
                  /* Medical Intake Form */
                  <div className="space-y-3 border-t border-[#414E36]/10 pt-3">
                    {isFirstVisit ? (
                      <div className="rounded-2xl bg-amber-50 p-3 text-xs text-amber-900 border border-amber-200">
                        <strong className="block font-bold">{t.firstVisitDetected || "First Visit Detected"}</strong>
                        {t.firstVisitNotice || "Medical intake form is required for first-time patient registration."}
                      </div>
                    ) : !medicalRecord && isReturningPatient ? (
                      <div className="rounded-2xl bg-[#EDF1EC] p-3 text-xs text-[#414E36] border border-[#414E36]/15">
                        <strong className="block font-bold">Returning Patient ({patientPastCompletedVisits.length} past visits)</strong>
                        Previous patient clinical history is on file. You can record specialized intake notes or proceed directly with treatment.
                      </div>
                    ) : null}

                    {(activeTemplate?.fields || []).length > 0 ? (
                      (activeTemplate?.fields || []).map((f) => (
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
                              {(f.options || []).map((opt) => (
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
                              <span>Yes / Confirmed</span>
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
                          <label className="block text-[11px] font-bold text-[#5A6A51] mb-1">{t.skinTypeLabel}</label>
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
                          <label className="block text-[11px] font-bold text-[#5A6A51] mb-1">{t.allergiesLabel}</label>
                          <input
                            type="text"
                            placeholder="e.g. Latex, Aspirin, None"
                            value={formAllergies}
                            onChange={(e) => setFormAllergies(e.target.value)}
                            className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2 text-xs text-[#1F251A] outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-[#5A6A51] mb-1">{t.currentMedicationLabel}</label>
                          <input
                            type="text"
                            placeholder="e.g. Roaccutane, Blood thinners, None"
                            value={formMedicationDetails}
                            onChange={(e) => setFormMedicationDetails(e.target.value)}
                            className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2 text-xs text-[#1F251A] outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-[#5A6A51] mb-1">{t.medicalConditionsLabel}</label>
                          <input
                            type="text"
                            placeholder="e.g. Diabetes, Eczema, None"
                            value={formMedicalConditionsDetails}
                            onChange={(e) => setFormMedicalConditionsDetails(e.target.value)}
                            className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2 text-xs text-[#1F251A] outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-[#5A6A51] mb-1">{t.previousTreatmentsLabel}</label>
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
                          {t.cancelBtn}
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={savingMedicalRecord}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleSaveMedicalRecord({
                            template_id: activeTemplate?.id,
                            responses: dynamicResponses,
                            skin_type: dynamicResponses.skin_type || dynamicResponses.fitzpatrick_scale || formSkinType,
                            allergies: dynamicResponses.allergies || formAllergies,
                            medication_details: dynamicResponses.medications || dynamicResponses.photosensitizing_drugs || formMedicationDetails,
                            medical_conditions_details: dynamicResponses.medical_conditions || dynamicResponses.bleeding_disorders || formMedicalConditionsDetails,
                            previous_treatments_details: dynamicResponses.previous_treatments || dynamicResponses.previous_injectables || formPreviousTreatmentsDetails
                          });
                        }}
                        className="rounded-xl bg-[#414E36] px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-[#343F2B] transition disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                      >
                        <Save size={14} /> {savingMedicalRecord ? "..." : t.saveMedicalRecordBtn}
                      </button>
                    </div>
                  </div>
                )}

                {/* DOCTOR PROCEDURE OBSERVATIONS & MEDICAL NOTES (NOW INTEGRATED IN INTAKE CARD) */}
                <div className="mt-4 sm:mt-6 border-t border-[#414E36]/10 pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-[#1F251A] uppercase tracking-wider">
                      {t.doctorNotesTitle}
                    </label>
                    <button
                      type="button"
                      onClick={() => handleSaveClinicalNote(activeSessionBooking)}
                      disabled={savingNote}
                      className="rounded-xl bg-[#414E36] px-3 py-1 text-xs font-bold text-white shadow-sm hover:bg-[#343F2B] transition disabled:opacity-50 flex items-center gap-1"
                    >
                      <Save size={12} /> {savingNote ? "..." : t.saveDoctorNotesBtn}
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={clinicalNote}
                    onChange={(e) => setClinicalNote(e.target.value)}
                    placeholder={t.doctorNotesPlaceholder}
                    className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] p-3 text-xs text-[#1F251A] outline-none focus:border-[#414E36] focus:ring-2 focus:ring-[#414E36]/20 font-sans leading-relaxed"
                  />
                </div>

                <div className="mt-4 border-t border-[#414E36]/10 pt-4 space-y-2">
                  <span className="text-xs font-bold text-[#5A6A51]">{t.bookingNotesTitle}</span>
                  <p className="text-xs text-[#1F251A] leading-relaxed bg-[#F4F5F1] p-3 rounded-2xl font-mono">
                    {(activeSessionBooking.receptionNotes ?? activeSessionBooking.reception_notes) || activeSessionBooking.notes || t.noBookingNotes}
                  </p>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN (2/3 Width): Digital Prescription Writer ABOVE Services & Products */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">

              {/* 1. DIGITAL PRESCRIPTION WRITER CARD (POSITIONED ABOVE PRODUCTS & SERVICES) */}
              <div className="rounded-2xl sm:rounded-3xl border border-[#414E36]/12 bg-white p-4 sm:p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-[#414E36]/10 pb-3 flex-wrap gap-2">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-[#1F251A] uppercase tracking-wider flex items-center gap-2">
                      <FileText size={16} className="text-[#414E36]" /> {t.digitalPrescriptionTitle}
                    </h3>
                    <p className="text-xs text-[#5A6A51] mt-0.5">
                      {t.patientNameHeader}: <strong className="text-[#414E36]">{activeSessionBooking.name || activeSessionBooking.customer_name}</strong>
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSaveInlinePrescription} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#5A6A51] mb-1">{t.clinicalDiagnosisLabel}</label>
                    <input
                      type="text"
                      placeholder="e.g. Post-laser inflammation, Acne Vulgaris Grade II"
                      value={rxDiagnosis}
                      onChange={(e) => setRxDiagnosis(e.target.value)}
                      className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2 text-xs text-[#1F251A] outline-none focus:border-[#414E36]"
                    />
                  </div>

                  {/* Medications List */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-[#5A6A51]">{t.prescribedMedicationsLabel}</label>
                    {rxMedications.map((med, idx) => (
                      <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                        <input
                          type="text"
                          placeholder={t.medicationNamePlaceholder}
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
                          placeholder={t.dosagePlaceholder}
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
                          placeholder={t.frequencyPlaceholder}
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
                          placeholder={t.durationPlaceholder}
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
                      <Plus size={14} /> {t.addAnotherMedicationBtn}
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#5A6A51] mb-1">{t.generalInstructionsLabel}</label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Apply sunscreen SPF 50 daily, avoid direct sun exposure for 48 hours..."
                      value={rxGeneralNotes}
                      onChange={(e) => setRxGeneralNotes(e.target.value)}
                      className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] p-3 text-xs text-[#1F251A] outline-none focus:border-[#414E36]"
                    />
                  </div>

                  {/* Follow-Up Visit Specification */}
                  <div className="rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] p-3.5 sm:p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-[#1F251A] flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={rxHasFollowUp}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setRxHasFollowUp(checked);
                            if (checked && !rxFollowUpDate) {
                              setFollowUpPresetDays(7);
                            }
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-[#414E36] focus:ring-[#414E36] accent-[#414E36]"
                        />
                        <Calendar size={14} className="text-[#414E36]" />
                        <span>{t.requiresFollowUpLabel || "Requires Follow-Up / Consultation?"}</span>
                      </label>
                      {rxHasFollowUp && (
                        <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700">
                          {t.followUpRequiredBadge || "Follow-Up Recommended"}
                        </span>
                      )}
                    </div>

                    {rxHasFollowUp && (
                      <div className="space-y-3 pt-2 border-t border-[#414E36]/10 animate-fadeIn">
                        {/* Interval Presets */}
                        <div>
                          <span className="block text-[11px] font-bold text-[#5A6A51] mb-1.5">
                            Quick Interval Presets:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => setFollowUpPresetDays(3)}
                              className="px-2.5 py-1 rounded-xl text-[11px] font-bold border border-[#414E36]/20 bg-white text-[#414E36] hover:bg-[#414E36] hover:text-white transition cursor-pointer"
                            >
                              {t.preset3Days || "+3 Days"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setFollowUpPresetDays(7)}
                              className="px-2.5 py-1 rounded-xl text-[11px] font-bold border border-[#414E36]/20 bg-white text-[#414E36] hover:bg-[#414E36] hover:text-white transition cursor-pointer"
                            >
                              {t.preset1Week || "+1 Week"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setFollowUpPresetDays(14)}
                              className="px-2.5 py-1 rounded-xl text-[11px] font-bold border border-[#414E36]/20 bg-white text-[#414E36] hover:bg-[#414E36] hover:text-white transition cursor-pointer"
                            >
                              {t.preset2Weeks || "+2 Weeks"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setFollowUpPresetDays(30)}
                              className="px-2.5 py-1 rounded-xl text-[11px] font-bold border border-[#414E36]/20 bg-white text-[#414E36] hover:bg-[#414E36] hover:text-white transition cursor-pointer"
                            >
                              {t.preset1Month || "+1 Month"}
                            </button>
                          </div>
                        </div>

                        {/* Date Picker & Reason */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-[#5A6A51] mb-1">
                              {t.followUpDateLabel || "Recommended Follow-Up Date"}
                            </label>
                            <input
                              type="date"
                              value={rxFollowUpDate}
                              min={new Date().toISOString().slice(0, 10)}
                              onChange={(e) => setRxFollowUpDate(e.target.value)}
                              className="w-full rounded-xl border border-[#414E36]/20 bg-white px-3 py-1.5 text-xs text-[#1F251A] font-bold outline-none focus:border-[#414E36]"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-[#5A6A51] mb-1">
                              {t.followUpNotesLabel || "Follow-Up Instructions / Reason"}
                            </label>
                            <input
                              type="text"
                              value={rxFollowUpNotes}
                              onChange={(e) => setRxFollowUpNotes(e.target.value)}
                              placeholder={t.followUpNotesPlaceholder || "e.g. Check skin peeling, review lab results..."}
                              className="w-full rounded-xl border border-[#414E36]/20 bg-white px-3 py-1.5 text-xs text-[#1F251A] outline-none focus:border-[#414E36]"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={savingRxInline}
                      className="w-full sm:w-auto justify-center rounded-xl bg-[#414E36] px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#343F2B] transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer size={14} /> {savingRxInline ? "..." : t.saveAndPrintRxBtn}
                    </button>
                  </div>
                </form>
              </div>

              {/* 2. LASER PULSE COUNTER & ACCOUNTING ENGINE */}
              <div className="rounded-2xl sm:rounded-3xl border border-[#414E36]/10 bg-white p-4 sm:p-6 shadow-sm space-y-4 sm:space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#414E36]/10 pb-3">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-[#1F251A] uppercase tracking-wider flex items-center gap-2">
                      <Zap size={16} className="text-amber-600" /> {t.laserTreatmentTitle || "Laser Treatment & Pulse Counter Engine"}
                    </h3>
                    <p className="text-[11px] text-[#5A6A51] mt-0.5">
                      {laserMode === "SERVICE"
                        ? (t.laserModeServiceDesc || "Option 1: Fixed catalog price with hardware pulse tracking.")
                        : laserMode === "PER_PULSE"
                        ? (t.laserModePerPulseDesc || "Option 2: Pay per pulse deal agreed at reception (Pulses × Unit Price).")
                        : (t.laserModePackageDesc || "Option 3: Deduct from active package with automatic deficit spillover handling.")}
                    </p>
                  </div>

                  {/* Mode Selector Tabs */}
                  <div className="flex bg-[#F2EFE9] p-1 rounded-xl gap-1 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setLaserMode("SERVICE")}
                      className={`px-3 py-1.5 rounded-lg transition ${
                        laserMode === "SERVICE" ? "bg-[#414E36] text-white shadow-xs" : "text-[#5A6A51] hover:text-[#414E36]"
                      }`}
                    >
                      {t.type1Service || "Option 1: Service"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setLaserMode("PER_PULSE")}
                      className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                        laserMode === "PER_PULSE" ? "bg-[#414E36] text-white shadow-xs" : "text-[#5A6A51] hover:text-[#414E36]"
                      }`}
                    >
                      <span>{t.type2Pulse || "Option 2: Pay per Pulse"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLaserMode("PACKAGE")}
                      className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                        laserMode === "PACKAGE" ? "bg-[#414E36] text-white shadow-xs" : "text-[#5A6A51] hover:text-[#414E36]"
                      }`}
                    >
                      <span>{t.type3Package || "Option 3: Package"}</span>
                      {patientActivePackages.length > 0 && (
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${laserMode === "PACKAGE" ? "bg-white/20 text-white" : "bg-purple-100 text-purple-800"}`}>
                          {patientActivePackages.length}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Common Laser Settings: Treatment Area & Device */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#FBFBF9] p-3.5 sm:p-4 rounded-2xl border border-[#414E36]/10">
                  <div>
                    <label className="block text-[11px] font-bold text-[#5A6A51] mb-1">{t.treatmentAreaLabel || "Treatment Area"}</label>
                    <select
                      value={treatmentArea}
                      onChange={(e) => setTreatmentArea(e.target.value)}
                      className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2 text-xs font-bold text-[#1F251A] outline-none"
                    >
                      {TREATMENT_AREAS.map((area) => (
                        <option key={area} value={area}>{area}</option>
                      ))}
                    </select>
                    {treatmentArea === "Custom" && (
                      <input
                        type="text"
                        placeholder="Specify custom area..."
                        value={customTreatmentArea}
                        onChange={(e) => setCustomTreatmentArea(e.target.value)}
                        className="mt-2 w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-1.5 text-xs text-[#1F251A] outline-none"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#5A6A51] mb-1">
                      {t.deviceUsedLabel || "Laser Device (Hardware Counter)"}
                    </label>
                    <select
                      value={selectedDeviceId}
                      onChange={(e) => setSelectedDeviceId(e.target.value)}
                      className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2 text-xs font-bold text-[#1F251A] outline-none"
                    >
                      <option value="">Select Laser Device...</option>
                      {devicesList.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} {d.current_pulse_count ? `(${d.current_pulse_count} total pulses)` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* OPTION 1: PAY BY SERVICE (FIXED PRICE) */}
                {laserMode === "SERVICE" && (
                  <div className="space-y-4 bg-[#FBFBF9] p-4 rounded-2xl border border-[#414E36]/10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#414E36]/10 pb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1 rounded-md bg-[#414E36] text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                            {t.primaryBookingService || "Primary Booked Service"}
                          </span>
                          <span className="font-extrabold text-xs sm:text-sm text-[#1F251A]">
                            {resolvedActiveServiceName}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#5A6A51] mt-1">
                          Fixed Service Price: <strong className="text-[#414E36]">{baseBookingPrice} EGP</strong> (Standard pulses recorded for clinical tracking; 0 EGP price change).
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <label className="text-xs font-bold text-[#5A6A51]">{t.standardPulsesLabel || "Standard Pulses:"}</label>
                        <input
                          type="number"
                          min={0}
                          value={standardPulsesDelivered}
                          onChange={(e) => setStandardPulsesDelivered(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-28 rounded-xl border border-[#414E36]/20 bg-white px-3 py-1.5 text-xs font-bold text-[#1F251A] outline-none focus:border-[#414E36]"
                          placeholder="Pulses"
                        />
                      </div>
                    </div>

                    {/* Additional Pulses Toggle */}
                    <div className="space-y-3 pt-1">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#1F251A]">
                        <input
                          type="checkbox"
                          checked={hasAdditionalPulses}
                          onChange={(e) => setHasAdditionalPulses(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-[#414E36] accent-[#414E36]"
                        />
                        <Plus size={14} className="text-amber-700" />
                        <span>Add Additional Charged Pulses (Special Case)</span>
                      </label>

                      {hasAdditionalPulses && (
                        <div className="space-y-3 bg-white p-3.5 rounded-xl border border-amber-200">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[10px] font-bold text-[#5A6A51] mb-1">Additional Pulses Qty</label>
                              <input
                                type="number"
                                min={1}
                                value={additionalPulsesQty}
                                onChange={(e) => setAdditionalPulsesQty(Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-1.5 text-xs font-bold text-[#1F251A] outline-none"
                                placeholder="e.g. 100"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-[#5A6A51] mb-1">Price Per Pulse (EGP)</label>
                              <input
                                type="number"
                                min={0}
                                step={0.5}
                                value={additionalPulseUnitPrice}
                                onChange={(e) => setAdditionalPulseUnitPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                                className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-1.5 text-xs font-bold text-[#1F251A] outline-none"
                                placeholder="5"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-[#5A6A51] mb-1">Additional Charge</label>
                              <div className="w-full rounded-xl bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-black text-amber-900">
                                +{additionalPulsesQty * additionalPulseUnitPrice} EGP
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-[#5A6A51] mb-1">
                              Reason for Additional Pulses <span className="text-rose-600 font-bold">* (Mandatory)</span>
                            </label>
                            <input
                              type="text"
                              value={additionalPulsesReason}
                              onChange={(e) => setAdditionalPulsesReason(e.target.value)}
                              placeholder="e.g. Extended session for high hair density..."
                              className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-1.5 text-xs text-[#1F251A] outline-none focus:border-[#414E36]"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* OPTION 2: PAY PER PULSE (POST-SESSION ACTUALS) */}
                {laserMode === "PER_PULSE" && (
                  <div className="space-y-4 bg-[#FBFBF9] p-4 rounded-2xl border border-[#414E36]/10 animate-fadeIn">
                    <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider block">
                          Option 2: Pay per Pulse (Post-Session Actuals)
                        </span>
                        <span className="text-2xl font-black text-emerald-950">
                          {standardPulsesDelivered * additionalPulseUnitPrice} <span className="text-xs font-bold text-emerald-700">EGP Total Charge</span>
                        </span>
                        <p className="text-[11px] text-emerald-800 mt-1 font-medium">
                          Deal agreed at reception: <strong>{additionalPulseUnitPrice} EGP</strong> per delivered pulse.
                        </p>
                      </div>

                      <div className="bg-white px-3.5 py-2 rounded-xl border border-emerald-300 text-xs text-end font-bold text-emerald-950 shadow-xs">
                        <span className="block text-[10px] text-emerald-700 uppercase">Live Math</span>
                        {standardPulsesDelivered} Pulses × {additionalPulseUnitPrice} EGP
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-[#414E36]/10">
                      <div>
                        <label className="block text-[11px] font-bold text-[#5A6A51] mb-1">
                          Actual Pulses Delivered in This Session <span className="text-emerald-700 font-black">*</span>
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={standardPulsesDelivered}
                          onChange={(e) => setStandardPulsesDelivered(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full rounded-xl border border-[#414E36]/20 bg-[#FBFBF9] px-3.5 py-2 text-xs font-bold text-[#1F251A] outline-none focus:border-[#414E36]"
                          placeholder="e.g. 1000"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-[#5A6A51] mb-1">
                          Agreed Rate per Pulse (EGP)
                        </label>
                        <input
                          type="number"
                          min={0.1}
                          step={0.5}
                          value={additionalPulseUnitPrice}
                          onChange={(e) => setAdditionalPulseUnitPrice(Math.max(0.1, parseFloat(e.target.value) || 1))}
                          className="w-full rounded-xl border border-[#414E36]/20 bg-[#FBFBF9] px-3.5 py-2 text-xs font-bold text-[#1F251A] outline-none focus:border-[#414E36]"
                          placeholder="5"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* OPTION 3: PAY WITH PULSE PACKAGE (REDEMPTION + DEFICIT SPILLOVER) */}
                {laserMode === "PACKAGE" && (
                  <div className="space-y-4 bg-[#FBFBF9] p-4 rounded-2xl border border-[#414E36]/10 animate-fadeIn">
                    {patientActivePackages.length === 0 ? (
                      <div className="p-5 bg-white rounded-2xl border-2 border-purple-300 space-y-4 shadow-sm animate-fadeIn">
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center shrink-0">
                            <Sparkles size={20} className="text-purple-700" />
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 block">
                              Scenario 1: New Pulses Package Purchase
                            </span>
                            <h4 className="font-black text-sm text-[#1F251A]">
                              Patient has no active pulses package — Buy Package & Deduct Pulses
                            </h4>
                            <p className="text-[11px] text-[#5A6A51] mt-0.5 leading-relaxed">
                              Choose a pulses package. The session invoice will charge <strong>only the package price</strong>. Pulses used today are deducted immediately, and remaining pulses carry forward to upcoming sessions.
                            </p>
                          </div>
                        </div>

                        {allCatalogPackages.length > 0 ? (
                          <div className="space-y-3 pt-1">
                            <div>
                              <label className="block text-[11px] font-bold text-[#5A6A51] mb-1">
                                Select Pulses Package to Purchase <span className="text-purple-700 font-black">*</span>
                              </label>
                              <select
                                value={selectedNewPackageToBuy?.id || ""}
                                onChange={(e) => {
                                  const found = allCatalogPackages.find((p) => String(p.id) === String(e.target.value));
                                  if (found) setSelectedNewPackageToBuy(found);
                                }}
                                className="w-full rounded-xl border border-purple-200 bg-[#FBFBF9] px-3.5 py-2.5 text-xs font-black text-[#1F251A] outline-none focus:border-purple-600 shadow-2xs"
                              >
                                {allCatalogPackages.map((p) => {
                                  const pPulses = Number(p.total_pulses ?? p.totalPulses ?? p.included_pulses ?? p.includedPulses ?? 0);
                                  return (
                                    <option key={p.id} value={p.id}>
                                      {p.name || p.title} ({pPulses > 0 ? `${pPulses.toLocaleString()} pulses` : "no pulse quota configured"} · {Number(p.price || 0).toLocaleString()} EGP)
                                    </option>
                                  );
                                })}
                              </select>
                            </div>

                            {/* Pulses Used in This Session */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                              <div>
                                <label className="block text-[11px] font-bold text-[#5A6A51] mb-1">
                                  Pulses Used in This Session <span className="text-purple-700 font-black">*</span>
                                </label>
                                <input
                                  type="number"
                                  min={1}
                                  value={standardPulsesDelivered || ""}
                                  onChange={(e) => setStandardPulsesDelivered(Math.max(0, parseInt(e.target.value) || 0))}
                                  className="w-full rounded-xl border border-purple-200 bg-[#FBFBF9] px-3.5 py-2 text-xs font-black text-[#1F251A] outline-none focus:border-purple-600"
                                  placeholder="e.g. 5000"
                                />
                                <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                  {[500, 1000, 2000, 5000].map((preset) => (
                                    <button
                                      key={preset}
                                      type="button"
                                      onClick={() => setStandardPulsesDelivered(preset)}
                                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                                        standardPulsesDelivered === preset
                                          ? "bg-purple-700 text-white border-purple-700"
                                          : "bg-white text-[#5A6A51] border-gray-200 hover:bg-purple-50"
                                      }`}
                                    >
                                      {preset.toLocaleString()}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold text-[#5A6A51] mb-1">
                                  Package Balance After This Session
                                </label>
                                <div className="w-full rounded-xl px-3.5 py-2 text-xs font-black bg-purple-50 border border-purple-200 text-purple-950 flex flex-col justify-center min-h-[40px]">
                                  {newPackageTotalPulses === null ? (
                                    <span>— (no pulse quota configured — set Total Pulses in Admin → Packages)</span>
                                  ) : (
                                    <>
                                      <span>
                                        {Math.max(0, newPackageTotalPulses - standardPulsesDelivered).toLocaleString()} Pulses Remaining
                                      </span>
                                      <span className="text-[10px] font-semibold text-purple-700">
                                        ({standardPulsesDelivered.toLocaleString()} deducted from {newPackageTotalPulses.toLocaleString()} total)
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Live Math Impact Card */}
                            <div className="bg-purple-50/70 p-3 rounded-xl border border-purple-200 text-xs space-y-1.5">
                              <div className="flex items-center justify-between font-black text-purple-950">
                                <span>Charged for Laser on Session Invoice:</span>
                                <span className="text-sm text-purple-900">{Number(selectedNewPackageToBuy?.price || 0).toLocaleString()} EGP (Package Price Only)</span>
                              </div>
                              <p className="text-[11px] text-purple-800 leading-relaxed">
                                Base laser treatment is 100% covered. {newPackageTotalPulses === null
                                  ? "This package has no pulse quota configured — set Total Pulses in Admin → Packages."
                                  : <>The remaining <strong>{Math.max(0, newPackageTotalPulses - standardPulsesDelivered).toLocaleString()} pulses</strong> will be available for the patient in future sessions at 0 EGP.</>}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-amber-50 rounded-xl text-xs text-amber-800">
                            No catalog packages available in database. Please add packages under Admin Settings → Packages.
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="block text-[11px] font-bold text-[#5A6A51] mb-1">Select Active Pulse Package</label>
                          <select
                            value={selectedLaserPackageId}
                            onChange={(e) => setSelectedLaserPackageId(e.target.value)}
                            className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2 text-xs font-bold text-[#1F251A] outline-none focus:border-[#414E36]"
                          >
                            {patientActivePackages.map((pkg) => {
                              const rem = Number(
                                pkg.remainingPulses ??
                                pkg.pulsesRemaining ??
                                pkg.remaining_pulses ??
                                pkg.pulses_remaining ??
                                (Number(pkg.totalPulses ?? pkg.includedPulses ?? 0) - Number(pkg.usedPulses ?? pkg.used_pulses ?? 0))
                              );
                              const exp = pkg.expiresAt || pkg.expires_at;
                              return (
                                <option key={pkg.id} value={pkg.id}>
                                  {(pkg.packageNameAr || pkg.packageName || pkg.package_name || pkg.name)} ({rem.toLocaleString()} pulses remaining{exp ? ` · Exp: ${new Date(exp).toLocaleDateString()}` : ""})
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        {/* Selected Package Details */}
                        {selectedPkg && (
                          <div className="space-y-3 bg-white p-3.5 rounded-xl border border-[#414E36]/10">
                            <div className="grid grid-cols-3 gap-2 text-center text-xs">
                              <div className="bg-[#FBFBF9] p-2 rounded-lg border border-[#414E36]/10">
                                <span className="text-[10px] text-[#5A6A51] block">Included</span>
                                <span className="font-black text-[#1F251A]">{Number(selectedPkg.totalPulses ?? selectedPkg.includedPulses ?? selectedPkg.total_pulses ?? selectedPkg.included_pulses ?? 0).toLocaleString()}</span>
                              </div>
                              <div className="bg-[#FBFBF9] p-2 rounded-lg border border-[#414E36]/10">
                                <span className="text-[10px] text-[#5A6A51] block">Used</span>
                                <span className="font-black text-[#5A6A51]">{Number(selectedPkg.usedPulses ?? selectedPkg.used_pulses ?? 0).toLocaleString()}</span>
                              </div>
                              <div className="bg-purple-50 p-2 rounded-lg border border-purple-200">
                                <span className="text-[10px] text-purple-800 block">Remaining</span>
                                <span className="font-black text-purple-950">{availablePkgPulses.toLocaleString()}</span>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                              <div>
                                <label className="block text-[11px] font-bold text-[#5A6A51] mb-1">
                                  Pulses Used in This Session
                                </label>
                                <input
                                  type="number"
                                  min={1}
                                  value={standardPulsesDelivered}
                                  onChange={(e) => setStandardPulsesDelivered(Math.max(0, parseInt(e.target.value) || 0))}
                                  className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2 text-xs font-bold text-[#1F251A] outline-none"
                                  placeholder="Pulses"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold text-[#5A6A51] mb-1">
                                  Package Balance After Session
                                </label>
                                <div className={`w-full rounded-xl px-3 py-2 text-xs font-black border ${
                                  packageDeficit > 0
                                    ? "bg-amber-50 text-amber-900 border-amber-300"
                                    : "bg-purple-50 text-purple-900 border-purple-200"
                                }`}>
                                  {packageDeficit > 0
                                    ? `0 Pulses Left (${packageDeficit} Deficit)`
                                    : `${availablePkgPulses - standardPulsesDelivered} Pulses Remaining`}
                                </div>
                              </div>
                            </div>

                            {/* ── PACKAGE DEFICIT SPILLOVER INTERACTIVE CARD ── */}
                            {packageDeficit > 0 && (
                              <div className="mt-3 p-4 rounded-2xl bg-amber-50/80 border-2 border-amber-300 space-y-3 animate-fadeIn">
                                <div className="flex items-start gap-2.5">
                                  <AlertTriangle size={18} className="text-amber-700 shrink-0 mt-0.5" />
                                  <div>
                                    <h5 className="font-black text-xs text-amber-950">
                                      {t.deficitDetectedTitle || "Package Pulse Deficit Detected!"}
                                    </h5>
                                    <p className="text-[11px] text-amber-900 mt-0.5">
                                      {t.deficitExceeded || "Delivered pulses exceed package balance by"} <strong className="text-amber-950 font-black">{packageDeficit} pulses</strong>. Choose how to settle the excess:
                                    </p>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                  {/* Choice 3A: Buy a New Package */}
                                  <div
                                    onClick={() => setPackageSpilloverChoice("BUY_NEW_PACKAGE")}
                                    className={`p-3 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                                      packageSpilloverChoice === "BUY_NEW_PACKAGE"
                                        ? "border-amber-700 bg-white ring-2 ring-amber-700/20 shadow-xs"
                                        : "border-amber-200 bg-white/70 hover:bg-white"
                                    }`}
                                  >
                                    <div className="space-y-1">
                                      <div className="flex items-center justify-between">
                                        <span className="font-extrabold text-xs text-amber-950">
                                          {t.deficitChoiceA || "Choice 3A: Buy New Package"}
                                        </span>
                                        {packageSpilloverChoice === "BUY_NEW_PACKAGE" && (
                                          <Check size={14} className="text-amber-700 font-bold" />
                                        )}
                                      </div>
                                      <p className="text-[10px] text-amber-800/90 leading-relaxed">
                                        {t.deficitChoiceADesc || "Deduct the 2,000 pulse deficit from a new package and charge package price."}
                                      </p>
                                    </div>

                                    {packageSpilloverChoice === "BUY_NEW_PACKAGE" && allCatalogPackages.length > 0 && (
                                      <div className="pt-2 mt-2 border-t border-amber-100" onClick={(e) => e.stopPropagation()}>
                                        <select
                                          value={selectedNewPackageToBuy?.id || ""}
                                          onChange={(e) => {
                                            const found = allCatalogPackages.find((p) => String(p.id) === String(e.target.value));
                                            if (found) setSelectedNewPackageToBuy(found);
                                          }}
                                          className="w-full rounded-lg border border-amber-300 bg-amber-50/50 px-2 py-1 text-xs font-bold text-amber-950 outline-none"
                                        >
                                          {allCatalogPackages.map((p) => (
                                            <option key={p.id} value={p.id}>
                                              {p.name || p.title} (+{p.price} EGP)
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    )}
                                  </div>

                                  {/* Choice 3B: Pay Rest per Pulse */}
                                  <div
                                    onClick={() => setPackageSpilloverChoice("PAY_PER_PULSE")}
                                    className={`p-3 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                                      packageSpilloverChoice === "PAY_PER_PULSE"
                                        ? "border-amber-700 bg-white ring-2 ring-amber-700/20 shadow-xs"
                                        : "border-amber-200 bg-white/70 hover:bg-white"
                                    }`}
                                  >
                                    <div className="space-y-1">
                                      <div className="flex items-center justify-between">
                                        <span className="font-extrabold text-xs text-amber-950">
                                          {t.deficitChoiceB || "Choice 3B: Pay Rest per Pulse"}
                                        </span>
                                        {packageSpilloverChoice === "PAY_PER_PULSE" && (
                                          <Check size={14} className="text-amber-700 font-bold" />
                                        )}
                                      </div>
                                      <p className="text-[10px] text-amber-800/90 leading-relaxed">
                                        {t.deficitChoiceBDesc || "Bill the excess pulses directly on session invoice at per-pulse rate."}
                                      </p>
                                    </div>

                                    <div className="pt-2 mt-2 border-t border-amber-100 flex items-center justify-between font-black text-xs text-amber-950">
                                      <span className="text-[10px] text-amber-800">Excess Charge:</span>
                                      <span>+{packageDeficit * additionalPulseUnitPrice} EGP</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Additional Clinical Services Section */}
                <div className="space-y-3 bg-[#FBFBF9] p-3.5 sm:p-4 rounded-2xl border border-[#414E36]/10">
                  <h4 className="text-xs font-bold text-[#1F251A] uppercase tracking-wider flex items-center gap-1.5">
                    <Plus size={14} className="text-[#414E36]" /> {t.addAdditionalServiceBtn}
                  </h4>

                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <select
                      value={selectedServiceIdToAdd}
                      onChange={(e) => setSelectedServiceIdToAdd(e.target.value)}
                      className="w-full sm:flex-1 rounded-xl border border-[#414E36]/15 bg-white px-3 py-2 text-xs font-bold text-[#1F251A] outline-none"
                    >
                      <option value="">{t.selectServicePlaceholder}</option>
                      {servicesList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.en || s.name || s.title || s.name_en || s.ar} ({s.price || 0} EGP)
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={handleAddServiceToSession}
                      disabled={!selectedServiceIdToAdd}
                      className="w-full sm:w-auto rounded-xl bg-[#414E36] px-5 py-2 text-xs font-bold text-white hover:bg-[#343F2B] transition disabled:opacity-50 flex items-center justify-center gap-1 cursor-pointer shrink-0 shadow-xs"
                    >
                      <Plus size={14} /> {t.addAdditionalServiceBtn}
                    </button>
                  </div>

                  {/* Added Additional Services List */}
                  {additionalServices.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-[#414E36]/10">
                      {additionalServices.map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-xs bg-white p-3 rounded-xl border border-[#414E36]/10 gap-2">
                          <div className="min-w-0">
                            <span className="font-bold text-[#1F251A] block truncate">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            {(() => {
                              const srv = servicesList.find((s) => String(s.id) === String(item.serviceId));
                              const isLaser = item.isLaser || checkIsLaserService(srv);
                              if (laserMode === "PACKAGE" && isLaser) {
                                return <span className="font-extrabold text-purple-700">0 EGP (Package Redemption)</span>;
                              }
                              return <span className="font-extrabold text-[#414E36]">+{item.price} EGP</span>;
                            })()}
                            <button
                              type="button"
                              onClick={() => handleRemoveServiceFromSession(item.id)}
                              className="text-rose-600 hover:text-rose-800 text-xs font-bold cursor-pointer p-1"
                              title="Remove service"
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

              {/* 3. PRODUCTS / CONSUMABLES USED SECTION */}
              <div className="rounded-2xl sm:rounded-3xl border border-[#414E36]/10 bg-white p-4 sm:p-6 shadow-sm space-y-4 sm:space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#414E36]/10 pb-3">
                  <h3 className="text-xs sm:text-sm font-bold text-[#1F251A] uppercase tracking-wider flex items-center gap-2">
                    <ShoppingBag size={16} className="text-[#414E36]" /> {t.productsUsedTitle}
                  </h3>
                </div>

                <div className="space-y-3 bg-[#FBFBF9] p-3.5 sm:p-4 rounded-2xl border border-[#414E36]/10">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="sm:col-span-2 rounded-xl border border-[#414E36]/15 bg-white px-2.5 py-1.5 text-xs font-bold text-[#1F251A] outline-none"
                    >
                      <option value="">{t.selectProductPlaceholder}</option>
                      {productsList.map((p) => {
                        const isOutOfStock = Number(p.stock_quantity ?? p.stockQuantity ?? 0) <= 0 || p.status === "Out of Stock";
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
                      value={selectedProductQty}
                      onChange={(e) => setSelectedProductQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="rounded-xl border border-[#414E36]/15 bg-white px-2.5 py-1.5 text-xs font-bold text-[#1F251A] outline-none"
                      placeholder="Qty"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddProductToSession}
                    className="w-full rounded-xl bg-[#414E36] py-2 text-xs font-bold text-white hover:bg-[#343F2B] transition cursor-pointer"
                  >
                    {t.addProductToInvoiceBtn}
                  </button>

                  {usedProducts.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-[#414E36]/10">
                      {usedProducts.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-xs bg-white p-2 rounded-xl border border-[#414E36]/10 gap-2">
                          <div className="min-w-0">
                            <span className="font-bold text-[#1F251A] block truncate">{item.name}</span>
                            <span className="text-[10px] text-[#5A6A51] block truncate">Qty: {item.qty} x {item.unitPrice} EGP</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-extrabold text-[#414E36]">{item.total} EGP</span>
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

                {/* Final Session Invoice Breakdown Summary */}
                <div className="bg-[#414E36]/05 p-3.5 sm:p-4 rounded-2xl space-y-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 text-[#5A6A51]">
                    <span>
                      {t.baseServiceLabel}{" "}
                      <strong className="text-[#1F251A]">
                        {laserMode === "SERVICE" ? `${baseBookingPrice} EGP` : "0 EGP (Prepaid / Package Pulses)"}
                      </strong>
                    </span>
                    {laserAdditionalCharge > 0 && (
                      <span className="text-amber-800 font-bold">
                        {laserMode === "PACKAGE" && (isNoActivePackage || packageSpilloverChoice === "BUY_NEW_PACKAGE") ? (
                          <span>New Package: <strong className="text-purple-900">+{laserAdditionalCharge} EGP</strong></span>
                        ) : laserMode === "PACKAGE" && packageDeficit > 0 && packageSpilloverChoice === "PAY_PER_PULSE" ? (
                          <span>Deficit Pulses: <strong className="text-amber-900">+{laserAdditionalCharge} EGP</strong></span>
                        ) : (
                          <span>Extra Pulses: <strong className="text-amber-900">+{laserAdditionalCharge} EGP</strong></span>
                        )}
                      </span>
                    )}
                    {additionalServicesSubtotal > 0 && (
                      <span>{t.additionalServicesSubtotal} <strong className="text-[#1F251A]">+{additionalServicesSubtotal} EGP</strong></span>
                    )}
                    {productsSubtotal > 0 && (
                      <span>{t.productsAddonsLabel} <strong className="text-[#1F251A]">+{productsSubtotal} EGP</strong></span>
                    )}
                  </div>
                  <div className="pt-2 border-t border-[#414E36]/10 flex items-center justify-between text-[#414E36] font-extrabold text-sm sm:text-base">
                    <span>{t.finalInvoiceLabel}</span>
                    <span>{finalSessionTotal} EGP</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {/* Active Sessions Banner if any found */}
          {activeSessionsList.length > 0 && (
            <div className="rounded-2xl sm:rounded-3xl border-2 border-amber-300 bg-amber-50 p-4 sm:p-6 shadow-md space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-amber-500 text-white font-bold text-base sm:text-lg shadow-sm animate-pulse shrink-0">
                    <Play size={22} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-extrabold text-amber-950 truncate">{t.activeSessionDetectedTitle}</h3>
                    <p className="text-xs text-amber-800 font-bold mt-0.5 truncate">
                      {activeSessionsList[0].name || activeSessionsList[0].customer_name} • {activeSessionsList[0].service || activeSessionsList[0].service_name} • <strong className="text-amber-950">{activeSessionsList[0].room || activeSessionsList[0].room_name || "Treatment Room"}</strong>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSessionBooking?.(activeSessionsList[0])}
                  className="w-full sm:w-auto justify-center rounded-2xl bg-[#414E36] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#343F2B] transition flex items-center gap-2 cursor-pointer"
                >
                  <UserCheck size={16} /> {t.openActiveSessionBtn}
                </button>
              </div>
            </div>
          )}

          {/* Standard Waiting Screen */}
          <div className="rounded-2xl sm:rounded-3xl border border-[#414E36]/10 bg-white p-6 sm:p-8 text-center text-[#5A6A51] space-y-3 shadow-sm">
            <div className="h-12 w-12 sm:h-14 sm:w-14 mx-auto flex items-center justify-center rounded-full bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
              <Play size={22} />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-[#1F251A]">{t.waitingForReceptionistTitle}</h3>
            <p className="text-xs text-[#5A6A51] max-w-md mx-auto leading-relaxed">
              {t.waitingForReceptionistDesc}
            </p>
          </div>

          {/* Today's Doctor Queue with 1-Click Treatment Start */}
          {queueBookings.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-bold text-[#1F251A] uppercase tracking-wider flex items-center gap-2">
                  <Calendar size={15} className="text-[#414E36]" /> {t.todayAvailableBookings || "Today's Patient Queue"} ({queueBookings.length})
                </h3>
              </div>

              <div className="overflow-hidden rounded-2xl sm:rounded-3xl border border-[#414E36]/10 bg-white shadow-sm">
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-[#414E36]/10 bg-[#FBFBF9] text-[11px] uppercase tracking-wider text-[#5A6A51]">
                      <tr>
                        <th className="px-4 py-3 font-bold">{t.timeSlotHeader || "Time"}</th>
                        <th className="px-4 py-3 font-bold">{t.patientNameHeader || "Patient"}</th>
                        <th className="px-4 py-3 font-bold">{t.requestedServiceHeader || "Service"}</th>
                        <th className="px-4 py-3 font-bold">{t.roomLocationHeader || "Room"}</th>
                        <th className="px-4 py-3 font-bold text-center">{t.statusHeader || "Status"}</th>
                        <th className="px-4 py-3 font-bold text-right">{t.actionHeader || "Action"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#414E36]/05 text-[#1F251A]">
                      {queueBookings.map((item) => {
                        const st = String(item.status || "").toLowerCase().trim();
                        const isStarted = st === "started" || st === "in-progress" || st === "in_progress" || st === "active";
                        return (
                          <tr key={item.id} className="hover:bg-[#FBFBF9]/80 transition">
                            <td className="px-4 py-3 font-bold text-[#414E36]">
                              {item.time || item.time_slot || item.requested_time || "Today"}
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-bold text-xs text-[#1F251A]">{item.name || item.customer_name || "Patient"}</div>
                              {item.phone && <div className="text-[10px] text-[#5A6A51] font-mono">{item.phone}</div>}
                            </td>
                            <td className="px-4 py-3 font-medium text-[#5A6A51]">
                              {item.service || item.service_name || "Clinical Session"}
                            </td>
                            <td className="px-4 py-3 font-semibold text-[#414E36]">
                              {item.room || item.room_name || "Treatment Room"}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {isStarted ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 animate-pulse">
                                  <Play size={10} /> In Session
                                </span>
                              ) : st === "arrived" ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-800">
                                  <UserCheck size={10} /> Arrived
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700 capitalize">
                                  {item.status || "Scheduled"}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  if (onStartOngoingSession) {
                                    onStartOngoingSession(item);
                                  } else {
                                    setActiveSessionBooking?.(item);
                                  }
                                }}
                                className="inline-flex items-center gap-1 rounded-xl bg-[#414E36] text-white px-3 py-1.5 text-xs font-bold shadow-sm hover:bg-[#343F2B] active:scale-95 transition cursor-pointer"
                              >
                                <Play size={12} />
                                <span>{isStarted ? (t.openSessionBtn || "Open") : (t.startOngoingSessionBtn || "Start Session")}</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
