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
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAlertConfirm } from "@/contexts/AlertConfirmContext";
import { supabase } from "@/lib/supabaseClient";
import { ServiceItem, getEffectiveServicePrice } from "@/lib/services";
import { printInvoice, printPrescription } from "@/lib/printUtils";
import { Branch } from "@/types";
import type { Req } from "@/app/admin/page";

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
  setCheckoutBooking: (b: any) => void;
  setInvoiceBooking: (b: any) => void;
  setPostponeBooking: (b: any) => void;
  setPostponeMode: (m: "reschedule" | "followup") => void;
  setPostponeNewDate: (d: string) => void;
  setPostponeNewTime: (t: string) => void;
  setPostponeFollowUpDate: (d: string) => void;
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
  setCheckoutBooking,
  setInvoiceBooking,
  setPostponeBooking,
  setPostponeMode,
  setPostponeNewDate,
  setPostponeNewTime,
  setPostponeFollowUpDate,
}: BookingDetailsModalProps) {
  const { isRTL } = useLanguage();
  const { showConfirm } = useAlertConfirm();

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

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-5 animate-fadeIn">
            <div className="w-full max-w-6xl rounded-[32px] bg-[#FBFBF9] p-6 sm:p-8 shadow-[0_20px_60px_rgba(31,37,26,0.25)] max-h-[92vh] overflow-y-auto custom-scrollbar border border-[#414E36]/15 space-y-6">
              
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

                    {/* Status Badge */}
                    <span className={`rounded-full px-3 py-0.5 text-[11px] font-extrabold uppercase tracking-wider ${
                      booking.status === 'approved' || booking.status === 'confirmed'
                        ? 'bg-[#EBF7EE] text-[#1E7E34] border border-[#C3E6CB]' 
                        : booking.status === 'rejected' 
                          ? 'bg-red-100 text-red-800' 
                          : booking.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : booking.status === 'started'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>
                      {booking.status === 'approved' ? 'CONFIRMED' : booking.status.toUpperCase()}
                    </span>

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
                      <div className="flex items-center gap-1.5 text-[#0F3826] font-extrabold text-[10px] uppercase tracking-wider">
                        <ShoppingBag size={13} className="text-[#0F3826]" />
                        <span>SERVICE</span>
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
                      {booking.status === 'approved' && (
                        <div className="grid grid-cols-2 gap-2.5">
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const res = await fetch(`/api/reservations?id=${booking.id}`, {
                                  method: 'PATCH',
                                  headers: authenticatedJsonHeaders,
                                  body: JSON.stringify({ status: 'confirmed' })
                                });
                                if (res.ok) {
                                  const updated = await res.json();
                                  setBooking(prev => prev ? { ...prev, ...updated, status: 'confirmed' } : null);
                                  fetchRequests();
                                  fetchAllReservations();
                                }
                              } catch (err) {
                                console.error(err);
                              }
                            }}
                            className="w-full rounded-2xl border border-[#414E36]/20 bg-white py-3 text-xs font-bold text-[#1F251A] hover:bg-gray-50 transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                          >
                            <Check size={14} className="text-[#0F3826]" />
                            <span>Confirm</span>
                          </button>
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
                        </div>
                      )}

                      {booking.status === 'confirmed' && (
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
                        <div className="w-full rounded-2xl bg-amber-50 border border-amber-200 p-3 text-center text-xs font-extrabold text-amber-900 flex items-center justify-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                          <span>Treatment In Session</span>
                        </div>
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
    </>
  );
}
