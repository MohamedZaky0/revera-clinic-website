"use client";

import React, { useMemo } from "react";
import {
  ArrowLeft,
  Camera,
  X,
  ShoppingBag,
  Package,
  Plus,
  Pencil,
  FileText,
  Trash2,
  Printer,
  Calendar,
  User,
  ReceiptText,
  History,
  Phone,
  Mail,
  Wallet,
  CreditCard,
  Info,
  Zap,
} from "lucide-react";
import MedicalFormModal from "@/components/admin/patients/MedicalFormModal";
import MedicalReportModal from "@/components/admin/patients/MedicalReportModal";
import { PatientTransactionsHistoryTab } from "@/components/admin/patients/PatientTransactionsHistoryTab";
import { NewManualTransactionView } from "@/components/admin/transactions/NewManualTransactionView";
import type { Customer } from "@/components/admin/patients/useCustomerProfile";

interface CustomerProfileDrawerProps {
  onNavigateToNewTransaction?: (patientId: string, patientName: string) => void;
  onAddPreviousBooking?: (patient: Customer) => void;
  // Hook state
  viewingCustomerProfile: Customer | null;
  setViewingCustomerProfile: (v: Customer | null) => void;
  setPrescriptionBookingContext: (v: string | null) => void;
  medicalRecordForm: any;
  setMedicalRecordForm: React.Dispatch<React.SetStateAction<any>>;
  medicalReports: any[];
  setMedicalReports: React.Dispatch<React.SetStateAction<any[]>>;
  showMedicalFormModal: boolean;
  setShowMedicalFormModal: (v: boolean) => void;
  showMedicalReportModal: boolean;
  setShowMedicalReportModal: (v: boolean) => void;
  customerProfileTab: string;
  setCustomerProfileTab: any;
  customerRecordsSubTab: string;
  setCustomerRecordsSubTab: any;
  customerPrescriptions: any[];
  loadingPrescriptions: boolean;
  prescriptionEditMode: boolean;
  setPrescriptionEditMode: (v: boolean) => void;
  editingPrescription: any;
  customerProductsSubTab: string;
  setCustomerProductsSubTab: any;
  customerProductBalances: any[];
  loadingCustomerProducts: boolean;
  logUsageModalBalance: any;
  setLogUsageModalBalance: (v: any) => void;
  logUsageQty: number;
  setLogUsageQty: (v: number) => void;
  logUsageNotes: string;
  setLogUsageNotes: (v: string) => void;
  savingUsageLog: boolean;
  showAddPatientProductModal: boolean;
  setShowAddPatientProductModal: (v: boolean) => void;
  selectedAddProductId: string;
  setSelectedAddProductId: (v: string) => void;
  selectedAddProductName: string;
  setSelectedAddProductName: (v: string) => void;
  selectedAddProductQty: number;
  setSelectedAddProductQty: (v: number) => void;
  selectedAddProductUnitPrice: number;
  setSelectedAddProductUnitPrice: (v: number) => void;
  addingProductToPatient: boolean;
  customerPackagesSubTab: string;
  setCustomerPackagesSubTab: any;
  customerProfilePackages: any[];
  loadingCustomerPackages: boolean;
  showSellPackageModal: boolean;
  setShowSellPackageModal: (v: boolean) => void;
  availablePackageOffers: any[];
  selectedSellPackageId: string;
  setSelectedSellPackageId: (v: string) => void;
  sellPackagePaymentMethod: string;
  setSellPackagePaymentMethod: (v: string) => void;
  sellingPackage: boolean;
  customerPackageRedemptions: any[];
  rxDiagnosis: string;
  setRxDiagnosis: (v: string) => void;
  rxMedications: any[];
  setRxMedications: (v: any[]) => void;
  rxMedInput: string;
  setRxMedInput: (v: string) => void;
  rxMedDropdown: string;
  setRxMedDropdown: (v: string) => void;
  rxGeneralNotes: string;
  setRxGeneralNotes: (v: string) => void;
  rxDocNotes: string;
  setRxDocNotes: (v: string) => void;
  rxFollowUpDate: string;
  setRxFollowUpDate: (v: string) => void;
  savingPrescription: boolean;
  historyModalOpen?: boolean;
  setHistoryModalOpen?: (v: boolean) => void;
  historyPrescriptions?: any[];
  loadingHistory?: boolean;
  selectedHistoryRx?: any;
  handleOpenPrescriptionHistory?: (rx: any) => void;
  handleClosePrescriptionHistory?: () => void;

  // Hook functions
  fetchAvailablePackageOffers: () => void;
  handleSellPackageToCustomer: () => void;
  handleSaveUsageLog: () => void;
  handleAddProductToPatient: () => void;
  handleStartCreatePrescription: () => void;
  handleStartEditPrescription: (rx: any) => void;
  handleAddMedication: () => void;
  handleRemoveMedication: (idx: number) => void;
  handleSavePrescription: () => void;
  handleDeletePrescription: (id: string) => void;
  handleOpenMedicalFormModal: () => void;
  handleOpenMedicalReportModal: () => void;
  handleDeleteMedicalReport: (id: string) => void;
  handlePrintPrescription: (rx: any) => void;

  // Page-level props
  hasPermission: (perm: string) => boolean;
  adminRole: string | null;
  handleOpenEditCustomer: (c: Customer) => void;
  customerAvatars: Record<string, string>;
  handleAvatarUpload: (id: string, file: File) => void;
  handleAvatarRemove: (id: string) => void;
  allReservations: any[];
  localServices: any[];
  rooms: any[];
  onViewBooking?: (booking: any) => void;
  getStatusBadgeClass: (status: string) => string;
  productSalesHistory: any[];
  inventoryProducts: any[];
  authenticatedJsonHeaders: { "Content-Type": string; Authorization: string };
  lang: "en" | "ar";
  adminTranslations: any;
  defaultPricePerPulse?: number;
  MOCK_MEDICINES: any[];
}

export default function CustomerProfileDrawer({
  onNavigateToNewTransaction,
  onAddPreviousBooking,
  viewingCustomerProfile,
  setViewingCustomerProfile,
  setPrescriptionBookingContext,
  medicalRecordForm,
  setMedicalRecordForm,
  medicalReports,
  setMedicalReports,
  showMedicalFormModal,
  setShowMedicalFormModal,
  showMedicalReportModal,
  setShowMedicalReportModal,
  customerProfileTab,
  setCustomerProfileTab,
  customerRecordsSubTab,
  setCustomerRecordsSubTab,
  customerPrescriptions,
  loadingPrescriptions,
  prescriptionEditMode,
  setPrescriptionEditMode,
  editingPrescription,
  customerProductsSubTab,
  setCustomerProductsSubTab,
  customerProductBalances,
  loadingCustomerProducts,
  logUsageModalBalance,
  setLogUsageModalBalance,
  logUsageQty,
  setLogUsageQty,
  logUsageNotes,
  setLogUsageNotes,
  savingUsageLog,
  showAddPatientProductModal,
  setShowAddPatientProductModal,
  selectedAddProductId,
  setSelectedAddProductId,
  selectedAddProductName,
  setSelectedAddProductName,
  selectedAddProductQty,
  setSelectedAddProductQty,
  selectedAddProductUnitPrice,
  setSelectedAddProductUnitPrice,
  addingProductToPatient,
  customerPackagesSubTab,
  setCustomerPackagesSubTab,
  customerProfilePackages,
  loadingCustomerPackages,
  showSellPackageModal,
  setShowSellPackageModal,
  availablePackageOffers,
  selectedSellPackageId,
  setSelectedSellPackageId,
  sellPackagePaymentMethod,
  setSellPackagePaymentMethod,
  sellingPackage,
  customerPackageRedemptions,
  rxDiagnosis,
  setRxDiagnosis,
  rxMedications,
  setRxMedications,
  rxMedInput,
  setRxMedInput,
  rxMedDropdown,
  setRxMedDropdown,
  rxGeneralNotes,
  setRxGeneralNotes,
  rxDocNotes,
  setRxDocNotes,
  rxFollowUpDate,
  setRxFollowUpDate,
  savingPrescription,
  historyModalOpen = false,
  setHistoryModalOpen,
  historyPrescriptions = [],
  loadingHistory = false,
  selectedHistoryRx = null,
  fetchAvailablePackageOffers,
  handleSellPackageToCustomer,
  handleSaveUsageLog,
  handleAddProductToPatient,
  handleStartCreatePrescription,
  handleStartEditPrescription,
  handleOpenPrescriptionHistory,
  handleClosePrescriptionHistory,
  handleAddMedication,
  handleRemoveMedication,
  handleSavePrescription,
  handleDeletePrescription,
  handleOpenMedicalFormModal,
  handleOpenMedicalReportModal,
  handleDeleteMedicalReport,
  handlePrintPrescription,
  hasPermission,
  adminRole,
  handleOpenEditCustomer,
  customerAvatars,
  handleAvatarUpload,
  handleAvatarRemove,
  allReservations,
  localServices,
  rooms,
  onViewBooking,
  getStatusBadgeClass,
  productSalesHistory,
  inventoryProducts,
  authenticatedJsonHeaders,
  lang,
  adminTranslations,
  defaultPricePerPulse = 5,
  MOCK_MEDICINES,
}: CustomerProfileDrawerProps) {
  if (!viewingCustomerProfile) return null;

  const [showInlineManualTxnModal, setShowInlineManualTxnModal] = React.useState(false);

  // Laser Pulse Counter Engine states
  const [laserLogs, setLaserLogs] = React.useState<any[]>([]);
  const [loadingLaserLogs, setLoadingLaserLogs] = React.useState(false);
  const [laserStats, setLaserStats] = React.useState<any>(null);

  // Fetch unified laser history logs for this customer
  React.useEffect(() => {
    if (!viewingCustomerProfile?.id) {
      setLaserLogs([]);
      setLaserStats(null);
      return;
    }

    const fetchLaser = async () => {
      setLoadingLaserLogs(true);
      try {
        const res = await fetch(`/api/laser-pulses?customerId=${encodeURIComponent(viewingCustomerProfile.id || "")}`, {
          headers: authenticatedJsonHeaders
        });
        if (res.ok) {
          const data = await res.json();
          setLaserLogs(Array.isArray(data.logs) ? data.logs : []);
          setLaserStats(data.stats || null);
        }
      } catch (err) {
        console.error("Error fetching patient laser history:", err);
      } finally {
        setLoadingLaserLogs(false);
      }
    };
    fetchLaser();

    const handleLaserChange = () => fetchLaser();
    window.addEventListener("revera-laser-change", handleLaserChange);
    return () => window.removeEventListener("revera-laser-change", handleLaserChange);
  }, [viewingCustomerProfile?.id]);

  const t = adminTranslations[lang].patients.customerProfileDrawer;
  const mf = adminTranslations[lang].patients.medicalFormModal;

  const totalActiveRetailPulses = useMemo(() => {
    if (!Array.isArray(customerProductBalances)) return 0;
    return customerProductBalances.reduce((sum: number, bal: any) => {
      const isPulse = bal.category === "laser_pulses" || bal.is_pulse_product || (bal.product_name && bal.product_name.toLowerCase().includes("pulse"));
      if (!isPulse) return sum;
      const totalPurchased = bal.purchased_quantity ?? bal.total_purchased ?? bal.quantity ?? 0;
      const totalUsed = bal.used_quantity ?? bal.total_used ?? bal.quantity_used ?? 0;
      const remaining = bal.remaining_quantity ?? bal.remaining_balance ?? (totalPurchased - totalUsed);
      return sum + Math.max(0, remaining);
    }, 0);
  }, [customerProductBalances]);

  const combinedPatientProductSales = useMemo(() => {
    if (!viewingCustomerProfile) return [];
    const sales: Array<{
      id: string;
      date: string;
      product_name: string;
      quantity: number;
      unit_price: number;
      total_amount: number;
      source?: string;
    }> = [];

    const custId = viewingCustomerProfile.id;
    const custCleanPhone = (viewingCustomerProfile.phone || '').trim().replace(/\D/g, '');

    // 1. Include direct POS / product sales
    if (Array.isArray(productSalesHistory)) {
      for (const s of productSalesHistory) {
        const sPhone = (s.customer_phone || s.phone || '').trim().replace(/\D/g, '');
        if (s.customer_id === custId || (custCleanPhone && sPhone && sPhone === custCleanPhone)) {
          sales.push({
            // A composite of the sale's own fields, matching the `${res.id}-${name}` ids the
            // reservation branches below build. It used to fall back to Math.random(), which is
            // impure during render and, because it always returns something truthy, also defeated
            // the `key={sale.id || idx}` fallback at the render site: every recompute of this memo
            // handed those rows brand-new keys, so React remounted them instead of updating them.
            id: String(s.id || `pos-${s.created_at || s.date || ''}-${s.product_name || s.name || 'Product'}`),
            date: s.created_at || s.date || '',
            product_name: s.product_name || s.name || 'Product',
            quantity: Number(s.quantity) || 1,
            unit_price: Number(s.unit_price) || 0,
            total_amount: Number(s.total_amount) || (Number(s.quantity || 1) * Number(s.unit_price || 0)),
            source: 'Direct Sale'
          });
        }
      }
    }

    // 2. Include products purchased/consumed in past reservations
    if (Array.isArray(allReservations)) {
      for (const res of allReservations) {
        const resCustId = res.customerId || res.customer_id;
        const resPhone = (res.phone || res.customer_phone || '').trim().replace(/\D/g, '');
        const isMatch = (custId && resCustId && resCustId === custId) || (custCleanPhone && resPhone && resPhone === custCleanPhone);

        if (isMatch) {
          const resDate = res.date || res.created_at || '';
          const resLabel = res.id ? `Booking #${String(res.id).slice(0, 8).toUpperCase()}` : 'Booking';
          const addedNames = new Set<string>();

          // a) Structured attachedProducts
          if (Array.isArray(res.attachedProducts)) {
            for (const p of res.attachedProducts) {
              const name = String(p.name || p.product_name || 'Product').replace(/^[,\s-]+/, '').trim();
              const qty = Number(p.qty || p.quantity) || 1;
              const unitPrice = Number(p.unitPrice || p.price || p.unit_price || 0);
              const total = Number(p.total || p.total_price) || (qty * unitPrice);
              const lineType = p.lineType || p.line_type || (p.serviceId ? 'additional_service' : 'product');

              // Skip zero-cost pulses or additional services
              const isPulse = lineType === 'device_pulses' || name.toLowerCase().includes('pulse');
              if (isPulse && (total === 0 || unitPrice === 0)) continue;
              if (lineType === 'additional_service') continue;

              addedNames.add(name.toLowerCase());
              sales.push({
                id: String(p.id || `${res.id}-${name}`),
                date: p.created_at || resDate,
                product_name: name,
                quantity: qty,
                unit_price: unitPrice,
                total_amount: total,
                source: resLabel
              });
            }
          }

          // b) Notes parsing (safety net for historical bookings)
          if (res.notes) {
            const notesStr = String(res.notes);
            const prodBlockMatch = notesStr.match(/\[(?:Products|Consumables|Products \/ Consumables|Attached Products)(?: Used)?(?: During Session)?\]:\s*([\s\S]*?)(?=\n\s*\[|$)/i);
            if (prodBlockMatch) {
              const rawBlock = prodBlockMatch[1];
              const items = rawBlock.split(/(?:,|\n)(?![^(]*\))/);
              for (const item of items) {
                const trimmed = item.trim();
                if (!trimmed || trimmed.startsWith("[")) continue;
                // Format: Name (Qty: 1 x 200 EGP = 200 EGP)
                const m1 = trimmed.match(/^(.+?)\s*\(Qty:\s*(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*EGP\s*=\s*(\d+(?:\.\d+)?)\s*EGP\)/i);
                if (m1) {
                  const name = m1[1].replace(/^[,\s-]+/, '').trim();
                  const qty = Number(m1[2]) || 1;
                  const unitPrice = Number(m1[3]) || 0;
                  const total = Number(m1[4]) || (qty * unitPrice);
                  if (!addedNames.has(name.toLowerCase())) {
                    addedNames.add(name.toLowerCase());
                    sales.push({
                      id: `${res.id}-note-${name}`,
                      date: resDate,
                      product_name: name,
                      quantity: qty,
                      unit_price: unitPrice,
                      total_amount: total,
                      source: resLabel
                    });
                  }
                } else {
                  // Format: Name (Qty: 1) or Name - 200 EGP
                  const m2 = trimmed.match(/^(.+?)(?:\s*\(Qty:\s*(\d+)\))?(?:\s*[-–]\s*(\d+(?:\.\d+)?)\s*EGP)?$/i);
                  if (m2) {
                    const name = m2[1].replace(/^[,\s-]+/, '').trim();
                    const qty = Number(m2[2]) || 1;
                    const price = Number(m2[3]) || 0;
                    if (!addedNames.has(name.toLowerCase()) && name.length > 1) {
                      addedNames.add(name.toLowerCase());
                      sales.push({
                        id: `${res.id}-note-${name}`,
                        date: resDate,
                        product_name: name,
                        quantity: qty,
                        unit_price: price > 0 ? price / qty : 0,
                        total_amount: price,
                        source: resLabel
                      });
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    // Sort descending by date
    return sales.sort((a, b) => {
      const tA = a.date ? new Date(a.date).getTime() : 0;
      const tB = b.date ? new Date(b.date).getTime() : 0;
      return tB - tA;
    });
  }, [viewingCustomerProfile, productSalesHistory, allReservations]);

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} className="space-y-6 animate-fadeIn">
      {/* Back button & Action buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            setViewingCustomerProfile(null);
            setPrescriptionBookingContext(null);
          }}
          className="flex items-center gap-1.5 text-xs font-bold text-[#5A6A51] hover:text-[#414E36] outline-none transition uppercase tracking-wider"
        >
          <ArrowLeft size={14} /> {t.backBtn}
        </button>
        <div className="flex items-center gap-2">
          {(!hasPermission || hasPermission("bookings.action_add_previous") || hasPermission("bookings.create")) && onAddPreviousBooking && (
            <button
              onClick={() => onAddPreviousBooking(viewingCustomerProfile)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#414E36]/15 bg-[#EDF1EC]/40 px-3 py-1.5 text-xs font-semibold text-[#414E36] transition hover:bg-[#EDF1EC]"
              title={t.addPreviousBookingBtn || "Add Previous Booking"}
            >
              <History size={12} className="shrink-0 text-[#414E36]" />
              <span>{t.addPreviousBookingBtn || "Add Previous Booking"}</span>
            </button>
          )}
          {hasPermission("customers.edit") && (
            <button
              onClick={() => {
                handleOpenEditCustomer(viewingCustomerProfile);
                setViewingCustomerProfile(null);
                setPrescriptionBookingContext(null);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#414E36]/15 bg-[#EDF1EC]/40 px-3 py-1.5 text-xs font-semibold text-[#414E36] transition hover:bg-[#EDF1EC]"
            >
              <Pencil size={12} /> {t.editProfileBtn}
            </button>
          )}
        </div>
      </div>

      {/* Profile Header Banner */}
      <div className="bg-white rounded-3xl border border-[#414E36]/10 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left Column: Avatar & Patient Details */}
          <div className="flex items-start sm:items-center gap-4.5 min-w-0">
            <div className="relative group shrink-0">
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-[#EDF1EC] text-[#414E36] border border-[#414E36]/10 flex items-center justify-center text-2xl sm:text-3xl font-bold font-serif overflow-hidden shadow-xs">
                {(viewingCustomerProfile.id && customerAvatars[viewingCustomerProfile.id]) || viewingCustomerProfile.avatar_url ? (
                  <img
                    src={(viewingCustomerProfile.id && customerAvatars[viewingCustomerProfile.id]) || viewingCustomerProfile.avatar_url || ""}
                    alt={viewingCustomerProfile.name || "Customer"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>{viewingCustomerProfile.name ? viewingCustomerProfile.name.charAt(0).toUpperCase() : "P"}</span>
                )}
              </div>
              <label
                className="absolute -bottom-1 -end-1 p-1.5 rounded-full bg-[#414E36] text-white cursor-pointer shadow-md hover:bg-[#2e3a26] transition flex items-center justify-center"
                title={t.uploadPhotoTitle}
              >
                <Camera size={12} />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && viewingCustomerProfile.id) {
                      handleAvatarUpload(viewingCustomerProfile.id, file);
                    }
                  }}
                />
              </label>
              {((viewingCustomerProfile.id && customerAvatars[viewingCustomerProfile.id]) || viewingCustomerProfile.avatar_url) && (
                <button
                  type="button"
                  onClick={() => viewingCustomerProfile.id && handleAvatarRemove(viewingCustomerProfile.id)}
                  className="absolute -top-1 -end-1 p-1 rounded-full bg-red-600 text-white shadow-xs hover:bg-red-700 transition"
                  title={t.removePhotoTitle}
                >
                  <X size={10} />
                </button>
              )}
            </div>

            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="text-xl sm:text-2xl font-bold text-[#1F251A] leading-tight truncate">
                  {viewingCustomerProfile.name}
                </h3>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold shrink-0 ${
                  viewingCustomerProfile.active !== false ? "bg-[#EDF1EC] text-[#414E36]" : "bg-red-50 text-red-600"
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${viewingCustomerProfile.active !== false ? "bg-[#414E36]" : "bg-red-500"}`} />
                  {viewingCustomerProfile.active !== false ? t.activePatientBadge : t.inactiveBadge}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs font-medium text-[#5A6A51]">
                <span className="inline-flex items-center gap-1.5">
                  <Phone size={13} className="text-[#5A6A51] shrink-0" />
                  <span className="font-semibold text-[#1F251A]">{viewingCustomerProfile.mobile || viewingCustomerProfile.phone || "—"}</span>
                </span>
                {viewingCustomerProfile.email && (
                  <span className="inline-flex items-center gap-1.5 truncate">
                    <Mail size={13} className="text-[#5A6A51] shrink-0" />
                    <span className="text-[#5A6A51] truncate">{viewingCustomerProfile.email}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Center Divider */}
          <div className="hidden lg:block h-20 w-px bg-[#414E36]/10 self-center" />

          {/* Right Column: Financial Summary */}
          <div className="lg:max-w-xl w-full">
            <p className="text-[11px] font-bold text-[#5A6A51] uppercase tracking-wider mb-2.5">
              {t.financialSummary || "Financial Summary"}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Total Spend */}
              <div className="rounded-2xl border border-emerald-100 bg-[#F0FDF4]/70 p-3.5 flex flex-col justify-between transition hover:shadow-xs">
                <div className="flex items-center justify-between text-xs font-semibold text-emerald-800">
                  <span className="flex items-center gap-1.5">
                    <Wallet size={14} className="text-emerald-600 shrink-0" />
                    <span>{t.totalSpend || "Total Spend"}</span>
                  </span>
                  <span title={t.totalSpend || "Total Spend"}>
                    <Info size={12} className="text-emerald-500 opacity-60" />
                  </span>
                </div>
                <div className="mt-2 text-lg sm:text-xl font-black text-[#1F251A] tracking-tight">
                  {Number(viewingCustomerProfile.spent_amount !== undefined ? viewingCustomerProfile.spent_amount : viewingCustomerProfile.spent || 0).toLocaleString()} <span className="text-xs font-bold text-[#5A6A51]">{t.egp || "EGP"}</span>
                </div>
                <div className="text-[11px] text-[#5A6A51] mt-0.5 font-medium">
                  {t.allTime || "All time"}
                </div>
              </div>

              {/* Wallet */}
              <div className="rounded-2xl border border-sky-100 bg-[#F0F9FF]/70 p-3.5 flex flex-col justify-between transition hover:shadow-xs">
                <div className="flex items-center justify-between text-xs font-semibold text-sky-800">
                  <span className="flex items-center gap-1.5">
                    <Wallet size={14} className="text-sky-600 shrink-0" />
                    <span>{t.wallet || "Wallet"}</span>
                  </span>
                  <span title={t.wallet || "Wallet"}>
                    <Info size={12} className="text-sky-500 opacity-60" />
                  </span>
                </div>
                <div className="mt-2 text-lg sm:text-xl font-black text-sky-700 tracking-tight">
                  {Number(viewingCustomerProfile.wallet_balance !== undefined ? viewingCustomerProfile.wallet_balance : viewingCustomerProfile.wallet || 0).toLocaleString()} <span className="text-xs font-bold text-sky-600">{t.egp || "EGP"}</span>
                </div>
                <div className="text-[11px] text-[#5A6A51] mt-0.5 font-medium">
                  {t.availableBalance || "Available balance"}
                </div>
              </div>

              {/* Outstanding */}
              <div className="rounded-2xl border border-amber-100 bg-[#FFF7ED]/70 p-3.5 flex flex-col justify-between transition hover:shadow-xs">
                <div className="flex items-center justify-between text-xs font-semibold text-amber-800">
                  <span className="flex items-center gap-1.5">
                    <CreditCard size={14} className="text-amber-600 shrink-0" />
                    <span>{t.outstanding || "Outstanding"}</span>
                  </span>
                  <span title={t.outstanding || "Outstanding"}>
                    <Info size={12} className="text-amber-500 opacity-60" />
                  </span>
                </div>
                <div className={`mt-2 text-lg sm:text-xl font-black tracking-tight ${
                  Number(viewingCustomerProfile.outstanding || 0) > 0 ? "text-rose-600" : "text-[#1F251A]"
                }`}>
                  {Number(viewingCustomerProfile.outstanding || 0).toLocaleString()} <span className="text-xs font-bold text-rose-500">{t.egp || "EGP"}</span>
                </div>
                <div className="text-[11px] text-[#5A6A51] mt-0.5 font-medium">
                  {t.unpaidAmount || "Unpaid amount"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1.5 p-1.5 bg-white rounded-2xl border border-[#414E36]/10 shadow-xs overflow-x-auto no-scrollbar w-full">
        <button
          onClick={() => setCustomerProfileTab("info")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 outline-none min-w-max ${
            customerProfileTab === "info"
              ? "bg-[#414E36] text-[#FBFBF9] font-bold shadow-xs"
              : "text-[#5A6A51] hover:text-[#414E36] hover:bg-[#F2EFE9]/60"
          }`}
        >
          <User size={15} />
          {t.tabInfo}
        </button>
        <button
          onClick={() => setCustomerProfileTab("history")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 outline-none min-w-max ${
            customerProfileTab === "history"
              ? "bg-[#414E36] text-[#FBFBF9] font-bold shadow-xs"
              : "text-[#5A6A51] hover:text-[#414E36] hover:bg-[#F2EFE9]/60"
          }`}
        >
          <Calendar size={15} />
          {t.tabHistory}
        </button>
        <button
          onClick={() => setCustomerProfileTab("prescription")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 outline-none min-w-max ${
            customerProfileTab === "prescription"
              ? "bg-[#414E36] text-[#FBFBF9] font-bold shadow-xs"
              : "text-[#5A6A51] hover:text-[#414E36] hover:bg-[#F2EFE9]/60"
          }`}
        >
          <FileText size={15} />
          {t.tabPrescription}
        </button>
        <button
          onClick={() => setCustomerProfileTab("transactions")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 outline-none min-w-max ${
            customerProfileTab === "transactions"
              ? "bg-[#414E36] text-[#FBFBF9] font-bold shadow-xs"
              : "text-[#5A6A51] hover:text-[#414E36] hover:bg-[#F2EFE9]/60"
          }`}
        >
          <ReceiptText size={15} />
          {t.tabTransactionsHistory || "Transactions History"}
        </button>
        <button
          onClick={() => setCustomerProfileTab("products")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 outline-none min-w-max ${
            customerProfileTab === "products"
              ? "bg-[#414E36] text-[#FBFBF9] font-bold shadow-xs"
              : "text-[#5A6A51] hover:text-[#414E36] hover:bg-[#F2EFE9]/60"
          }`}
        >
          <ShoppingBag size={15} />
          {t.tabProducts}
        </button>
        <button
          onClick={() => {
            setCustomerProfileTab("packages");
            fetchAvailablePackageOffers();
          }}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 outline-none min-w-max ${
            customerProfileTab === "packages"
              ? "bg-[#414E36] text-[#FBFBF9] font-bold shadow-xs"
              : "text-[#5A6A51] hover:text-[#414E36] hover:bg-[#F2EFE9]/60"
          }`}
        >
          <Package size={15} />
          {t.tabPackages}
        </button>
        <button
          onClick={() => setCustomerProfileTab("laser")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 outline-none min-w-max ${
            customerProfileTab === "laser"
              ? "bg-[#414E36] text-[#FBFBF9] font-bold shadow-xs"
              : "text-[#5A6A51] hover:text-[#414E36] hover:bg-[#F2EFE9]/60"
          }`}
        >
          <Zap size={15} className="text-amber-500" />
          <span>Laser History {laserLogs.length > 0 ? `(${laserLogs.length})` : ""}</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Tab 1: Info */}
        {customerProfileTab === "info" && (
          <div className="bg-white rounded-2xl border border-[#414E36]/10 p-5 space-y-4">
            <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
              <div>
                <span className="block text-xs font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">{t.phoneLabel}</span>
                <span className="font-semibold text-[#1F251A]">{viewingCustomerProfile.mobile || viewingCustomerProfile.phone || "—"}</span>
              </div>
              <div>
                <span className="block text-xs font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">{t.emailLabel}</span>
                <span className="font-semibold text-[#1F251A] break-all">{viewingCustomerProfile.email || "—"}</span>
              </div>
              <div>
                <span className="block text-xs font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">{t.ageLabel}</span>
                <span className="font-semibold text-[#1F251A]">{viewingCustomerProfile.age || "—"}</span>
              </div>
              <div>
                <span className="block text-xs font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">{t.genderLabel}</span>
                <span className="font-semibold text-[#1F251A]">{viewingCustomerProfile.gender || "—"}</span>
              </div>
              <div>
                <span className="block text-xs font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">{t.nationalIdLabel}</span>
                <span className="font-semibold text-[#1F251A] font-mono">{viewingCustomerProfile.national_id || "—"}</span>
              </div>
              <div>
                <span className="block text-xs font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">{t.referralLabel}</span>
                <span className="font-semibold text-[#1F251A]">{viewingCustomerProfile.referral || "—"}</span>
              </div>
              <div>
                <span className="block text-xs font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">{t.occupationLabel}</span>
                <span className="font-semibold text-[#1F251A]">{viewingCustomerProfile.occupation || "—"}</span>
              </div>

              {/* Divided Address into City, Street, Building */}
              {(() => {
                let cCity = viewingCustomerProfile.city || viewingCustomerProfile.area || viewingCustomerProfile.location_name || "";
                let cStreet = viewingCustomerProfile.street || viewingCustomerProfile.street_name || "";
                let cBuilding = viewingCustomerProfile.building || viewingCustomerProfile.building_no || viewingCustomerProfile.floor_no || "";

                if (!cCity && !cStreet && !cBuilding && viewingCustomerProfile.address) {
                  const parts = viewingCustomerProfile.address.split(",").map((s: string) => s.trim()).filter(Boolean);
                  if (parts.length >= 3) {
                    cCity = parts[0];
                    cStreet = parts[1];
                    cBuilding = parts[2];
                  } else if (parts.length === 2) {
                    cCity = parts[0];
                    cStreet = parts[1];
                  } else if (parts.length === 1) {
                    cCity = parts[0];
                  }
                }

                return (
                  <>
                    <div>
                      <span className="block text-xs font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">{t.cityLabel}</span>
                      <span className="font-semibold text-[#1F251A] block bg-[#F9F9F7] px-3 py-2 rounded-lg border border-[#414E36]/5">
                        {cCity || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">{t.streetLabel}</span>
                      <span className="font-semibold text-[#1F251A] block bg-[#F9F9F7] px-3 py-2 rounded-lg border border-[#414E36]/5">
                        {cStreet || "—"}
                      </span>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <span className="block text-xs font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">{t.buildingLabel}</span>
                      <span className="font-semibold text-[#1F251A] block bg-[#F9F9F7] px-3 py-2 rounded-lg border border-[#414E36]/5">
                        {cBuilding || "—"}
                      </span>
                    </div>
                  </>
                );
              })()}
              {viewingCustomerProfile.note && (
                <div className="col-span-2">
                  <span className="block text-xs font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">{t.notesLabel}</span>
                  <p className="text-xs text-[#5A6A51] bg-amber-50/40 border border-amber-200/50 rounded-xl p-3 leading-relaxed">
                    {viewingCustomerProfile.note}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: History */}
        {customerProfileTab === "history" && (
          <div className="bg-white rounded-2xl border border-[#414E36]/10 p-5 space-y-4">
            <div className="flex items-center justify-between pb-1">
              {(!hasPermission || hasPermission("bookings.action_add_previous") || hasPermission("bookings.create")) && onAddPreviousBooking ? (
                <button
                  type="button"
                  onClick={() => onAddPreviousBooking(viewingCustomerProfile)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#414E36]/15 bg-[#EDF1EC]/40 px-3 py-1.5 text-xs font-semibold text-[#414E36] transition hover:bg-[#EDF1EC]"
                >
                  <History size={12} className="shrink-0 text-[#414E36]" />
                  <span>{t.addPreviousBookingBtn || "Add Previous Booking"}</span>
                </button>
              ) : <div />}
              <span className="text-xs font-semibold bg-[#EDF1EC] text-[#414E36] px-2.5 py-1 rounded-md">
                {t.totalLabel} {
                  allReservations.filter(
                    (r) =>
                      r.phone === (viewingCustomerProfile.mobile || viewingCustomerProfile.phone) ||
                      r.customerId === viewingCustomerProfile.id
                  ).length
                }
              </span>
            </div>
            <div className="overflow-x-auto rounded-xl border border-[#E6E9EB]">
              <table className="w-full text-xs min-w-[650px]">
                <thead>
                  <tr className="border-b border-[#E6E9EB] bg-[#F7F7F9] font-bold text-[#5A6A51] uppercase tracking-wider text-[10px]">
                    <th className="px-4 py-3 text-start">{t.colDateSlot}</th>
                    <th className="px-4 py-3 text-start">{t.colService}</th>
                    <th className="px-4 py-3 text-start">{t.colProvider}</th>
                    <th className="px-4 py-3 text-start">{t.colRoom}</th>
                    <th className="px-4 py-3 text-center">{t.colPayment}</th>
                    <th className="px-4 py-3 text-center">{t.colStatus}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6E9EB] text-[#414E36]">
                  {(() => {
                    const history = allReservations.filter(
                      (r) =>
                        r.phone === (viewingCustomerProfile.mobile || viewingCustomerProfile.phone) ||
                        r.customerId === viewingCustomerProfile.id
                    );
                    if (history.length === 0) {
                      return (
                        <tr>
                          <td colSpan={6} className="px-4 py-6 text-center text-gray-400 italic">
                            {t.noHistory}
                          </td>
                        </tr>
                      );
                    }
                    return history.map((res) => {
                      const resDt = new Date(res.date);
                      const formattedDate = resDt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
                      const serv = localServices.find(s => s.id === res.serviceId)?.en || `Service #${res.serviceId}`;
                      const statusClass = getStatusBadgeClass(res.status);
                      const pricesMap: Record<number, number> = {
                        1: 400, 2: 500, 3: 450, 4: 600, 5: 800, 6: 700, 7: 1500,
                        11: 600, 12: 500, 13: 800, 14: 1200, 15: 1500, 16: 1000, 17: 400,
                        21: 300, 22: 350, 23: 300,
                        31: 400, 32: 350, 33: 400, 34: 500
                      };
                      const serviceCost = localServices.find(s => s.id === res.serviceId)?.price ?? pricesMap[res.serviceId] ?? 500;
                      const spent = res.amountPaid ?? 0;
                      const left = res.amountLeft !== undefined && res.amountLeft !== null ? res.amountLeft : Math.max(0, serviceCost - spent);
                      const redemptions = customerPackageRedemptions.filter((r: any) => r.reservationId === res.id);
                      const roomName = rooms.find((rm: any) => rm.id === res.roomId)?.name || "—";
                      const paymentStatus: "paid" | "partial" | "unpaid" = spent <= 0 ? "unpaid" : (left > 0 ? "partial" : "paid");
                      const paymentBadgeClass =
                        paymentStatus === "paid"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : paymentStatus === "partial"
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : "bg-red-50 text-red-700 border border-red-200";
                      return (
                        <tr
                          key={res.id}
                          onClick={() => onViewBooking && onViewBooking(res)}
                          className={`hover:bg-[#F9F9F7] ${onViewBooking ? "cursor-pointer" : ""}`}
                        >
                          <td className="px-4 py-3">
                            <span className="block font-semibold text-[#1F251A]">{formattedDate}</span>
                            <span className="text-[10px] text-[#5A6A51]">{res.timeSlot || res.requestedTime || "—"}</span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-[#1F251A]">{serv}</td>
                          <td className="px-4 py-3">{res.doctorName || "—"}</td>
                          <td className="px-4 py-3">{roomName}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${paymentBadgeClass}`}>
                              {t.paymentStatusLabels[paymentStatus]}
                            </span>
                            {redemptions.map((r: any, idx: number) => (
                              <span key={idx} className="block text-[9px] font-semibold text-[#C4AE7C] mt-0.5 whitespace-nowrap">
                                {t.viaLabel} {r.packageName}
                                {r.packagePurchasedAt && ` (${t.boughtLabel} ${new Date(r.packagePurchasedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })})`}
                              </span>
                            ))}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${statusClass}`}>
                              {(t.statusLabels as Record<string, string>)[res.status] || res.status}
                            </span>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Medical Records & Prescriptions */}
        {customerProfileTab === "prescription" && (
          <div className="space-y-6">
            {/* Sub-tab Navigation Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#414E36]/10">
              <div className="flex items-center gap-1 bg-[#F2EFE9] p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setCustomerRecordsSubTab("prescriptions")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                    customerRecordsSubTab === "prescriptions"
                      ? "bg-[#414E36] text-[#FBFBF9] shadow-xs font-bold"
                      : "text-[#5A6A51] hover:text-[#414E36]"
                  }`}
                >
                  💊 {t.subtabPrescriptions} ({customerPrescriptions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerRecordsSubTab("reports")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                    customerRecordsSubTab === "reports"
                      ? "bg-[#414E36] text-[#FBFBF9] shadow-xs font-bold"
                      : "text-[#5A6A51] hover:text-[#414E36]"
                  }`}
                >
                  📄 {t.subtabReports} ({medicalReports.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerRecordsSubTab("intake")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                    customerRecordsSubTab === "intake"
                      ? "bg-[#414E36] text-[#FBFBF9] shadow-xs font-bold"
                      : "text-[#5A6A51] hover:text-[#414E36]"
                  }`}
                >
                  📋 {t.subtabIntake}
                </button>
              </div>

              {customerRecordsSubTab === "prescriptions" && !prescriptionEditMode && (adminRole === "superadmin" || adminRole === "admin" || adminRole === "doctor" || adminRole === "receptionist" || adminRole === "reception" || adminRole === "Receptionist" || !hasPermission || hasPermission("bookings.manage_prescriptions") || hasPermission("clinical.create_prescriptions")) && (
                <button
                  type="button"
                  onClick={handleStartCreatePrescription}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#414E36] px-3.5 py-2 text-xs font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26] shadow-sm shrink-0"
                >
                  <Plus size={14} /> {t.writePrescriptionBtn}
                </button>
              )}

              {customerRecordsSubTab === "reports" && (
                <button
                  type="button"
                  onClick={handleOpenMedicalReportModal}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#414E36] px-3.5 py-2 text-xs font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26] shadow-sm shrink-0"
                >
                  <Plus size={14} /> {t.uploadReportBtn}
                </button>
              )}

              {customerRecordsSubTab === "intake" && (
                <button
                  type="button"
                  onClick={handleOpenMedicalFormModal}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#414E36] px-3.5 py-2 text-xs font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26] shadow-sm shrink-0"
                >
                  <Pencil size={13} /> {medicalRecordForm ? t.editIntakeBtn : t.fillIntakeBtn}
                </button>
              )}
            </div>

            {/* Sub-tab 1: Medical Intake & History */}
            {customerRecordsSubTab === "intake" && (
              <div className="space-y-4">
                {medicalRecordForm ? (
                  <div className="bg-white rounded-2xl border border-[#414E36]/10 p-6 space-y-6">
                    <div className="border-b border-[#414E36]/10 pb-3">
                      <h4 className="text-sm font-bold text-[#1F251A]">{t.intakeFormTitle}</h4>
                      <p className="text-xs text-[#5A6A51]">{t.intakeFormSubtitle}</p>
                    </div>

                    <div className="space-y-6 text-sm">
                      {/* SECTION 1: Skin & Beauty Profile */}
                      <div className="bg-[#FBFBF9] p-5 rounded-xl border border-[#414E36]/10 space-y-4">
                        <h5 className="text-xs font-bold uppercase tracking-wider text-[#C4AE7C] border-b border-[#414E36]/10 pb-2">
                          {t.skinBeautyProfileHeading}
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <span className="text-[11px] font-semibold text-[#5A6A51] block mb-1">{t.skinTypeLabel}</span>
                            <span className="inline-block bg-[#414E36]/10 text-[#414E36] font-bold text-xs px-3 py-1 rounded-lg">
                              {mf.skinTypes[medicalRecordForm.skin_type as keyof typeof mf.skinTypes] || medicalRecordForm.skin_type || mf.skinTypes["Normal"]}
                            </span>
                          </div>

                          <div>
                            <span className="text-[11px] font-semibold text-[#5A6A51] block mb-1">{t.mainConcernsLabel}</span>
                            <div className="flex flex-wrap gap-1.5">
                              {medicalRecordForm.main_concerns && medicalRecordForm.main_concerns.length > 0 ? (
                                medicalRecordForm.main_concerns.map((c: string, idx: number) => (
                                  <span key={idx} className="bg-white border border-[#414E36]/20 text-[#1F251A] text-xs font-medium px-2.5 py-1 rounded-lg">
                                    {mf.concerns[c as keyof typeof mf.concerns] || c}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-gray-400 italic">{t.noneSpecified}</span>
                              )}
                            </div>
                            {medicalRecordForm.other_concerns_details && (
                              <p className="text-xs text-[#1F251A] mt-1.5 italic">
                                {t.detailsPrefix} {medicalRecordForm.other_concerns_details}
                              </p>
                            )}
                          </div>

                          <div className="md:col-span-2 pt-2 border-t border-[#414E36]/5">
                            <span className="text-[11px] font-semibold text-[#5A6A51] block">{t.previousTreatmentsLabel}</span>
                            <p className="text-xs font-medium text-[#1F251A] mt-0.5">
                              {medicalRecordForm.has_previous_treatments || medicalRecordForm.previous_treatments ? (
                                <span className="text-emerald-800 font-semibold">{t.yesLabel} — {medicalRecordForm.previous_treatments_details || medicalRecordForm.previous_treatments || t.specifiedFallback}</span>
                              ) : (
                                <span className="text-gray-500">{t.noLabel}</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* SECTION 2: Medical Information */}
                      <div className="bg-[#FBFBF9] p-5 rounded-xl border border-[#414E36]/10 space-y-4">
                        <h5 className="text-xs font-bold uppercase tracking-wider text-[#C4AE7C] border-b border-[#414E36]/10 pb-2">
                          {t.medicalInfoHeading}
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <span className="text-[11px] font-semibold text-[#5A6A51] block">{t.medicalConditionsLabel}</span>
                            <p className="text-xs font-medium text-[#1F251A] mt-0.5">
                              {medicalRecordForm.has_medical_conditions || medicalRecordForm.medical_conditions ? (
                                <span className="text-amber-900 font-semibold">{t.yesLabel} — {medicalRecordForm.medical_conditions_details || medicalRecordForm.medical_conditions || t.specifiedFallback}</span>
                              ) : (
                                <span className="text-gray-500">{t.noLabel}</span>
                              )}
                            </p>
                          </div>

                          <div>
                            <span className="text-[11px] font-semibold text-[#5A6A51] block">{t.currentMedicationLabel}</span>
                            <p className="text-xs font-medium text-[#1F251A] mt-0.5">
                              {medicalRecordForm.is_taking_medication || medicalRecordForm.medications ? (
                                <span className="text-amber-900 font-semibold">{t.yesLabel} — {medicalRecordForm.medication_details || medicalRecordForm.medications || t.specifiedFallback}</span>
                              ) : (
                                <span className="text-gray-500">{t.noLabel}</span>
                              )}
                            </p>
                          </div>

                          <div className="md:col-span-2 pt-2 border-t border-[#414E36]/5">
                            <span className="text-[11px] font-semibold text-[#5A6A51] block">{t.allergiesLabel}</span>
                            <p className="text-xs font-medium text-amber-900 mt-0.5">
                              {medicalRecordForm.allergies || t.noAllergiesReported}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-white rounded-2xl border border-[#414E36]/10 space-y-3">
                    <FileText size={36} className="mx-auto text-[#8A9A81]" />
                    <div>
                      <p className="text-sm font-semibold text-[#1F251A]">{t.noIntakeTitle}</p>
                      <p className="text-xs text-[#5A6A51]">{t.noIntakeSubtitle}</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenMedicalFormModal}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#414E36] px-4 py-2 text-xs font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26] shadow-sm"
                    >
                      {t.fillIntakeBtn}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Sub-tab 2: Prescriptions */}
            {customerRecordsSubTab === "prescriptions" && (
              <div className="space-y-4">
                {prescriptionEditMode ? (
                  <div className="bg-white rounded-2xl border border-[#414E36]/10 p-5 space-y-4">
                    <h5 className="text-sm font-bold text-[#1F251A] border-b border-[#414E36]/5 pb-2">
                      {editingPrescription ? t.editPrescriptionTitle : t.newPrescriptionTitle}
                    </h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] mb-1.5">{t.patientNameAutoLabel}</label>
                        <input type="text" readOnly value={viewingCustomerProfile.name} className="w-full rounded-xl border border-[#414E36]/15 bg-gray-50 px-3.5 py-2 text-sm text-gray-500 outline-none" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] mb-1.5">{t.dateAutoLabel}</label>
                        <input type="text" readOnly value={new Date().toISOString().slice(0, 10)} className="w-full rounded-xl border border-[#414E36]/15 bg-gray-50 px-3.5 py-2 text-sm text-gray-500 outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] mb-1.5">{t.diagnosisLabel}</label>
                      <textarea placeholder={t.diagnosisPlaceholder} value={rxDiagnosis} onChange={(e) => setRxDiagnosis(e.target.value)} rows={3} className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3.5 py-2 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C] transition" />
                    </div>
                    <div className="border border-[#414E36]/10 rounded-xl p-4 bg-[#FBFBF9] space-y-3">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[#414E36]">{t.prescribedMedicationsLabel}</label>
                      <div className="flex gap-2">
                        <div className="flex-1 space-y-2">
                          <div className="flex gap-2">
                            <select value={rxMedDropdown} onChange={(e) => { const val = e.target.value; setRxMedDropdown(val); if (val && val !== "Custom") { setRxMedInput(val); } }} className="rounded-xl border border-[#414E36]/15 bg-white px-3.5 py-2 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C] transition">
                              <option value="">{t.chooseCatalogOption}</option>
                              {MOCK_MEDICINES.map((med) => (<option key={med.id} value={med.name}>{med.name}</option>))}
                              <option value="Custom">{t.customMedicationOption}</option>
                            </select>
                            <input type="text" placeholder={t.medNamePlaceholder} value={rxMedInput} onChange={(e) => setRxMedInput(e.target.value)} className="flex-1 rounded-xl border border-[#414E36]/15 bg-white px-3.5 py-2 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C] transition" />
                          </div>
                        </div>
                        <button type="button" onClick={handleAddMedication} className="rounded-xl bg-[#414E36] px-4 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26] shrink-0">{t.addBtn}</button>
                      </div>
                      {rxMedications.length > 0 ? (
                        <div className="space-y-2 pt-2 border-t border-[#414E36]/5">
                          {rxMedications.map((med, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-[#414E36]/10 text-sm">
                              <div className="flex-1">
                                <span className="font-semibold text-[#1F251A]">{med.name}</span>
                                <input type="text" placeholder={t.dosagePlaceholder} value={med.instructions} onChange={(e) => { const newMeds = [...rxMedications]; newMeds[idx].instructions = e.target.value; setRxMedications(newMeds); }} className="w-full mt-1 bg-transparent text-xs text-[#5A6A51] border-b border-transparent hover:border-[#414E36]/15 focus:border-[#C4AE7C] outline-none py-0.5" />
                              </div>
                              <button type="button" onClick={() => handleRemoveMedication(idx)} className="text-red-500 hover:text-red-700 transition p-1 ms-2"><Trash2 size={14} /></button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-[#8A9A81] italic text-center py-2">{t.noMedsYet}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] mb-1.5">{t.generalNotesLabel}</label>
                      <textarea placeholder={t.generalNotesPlaceholder} value={rxGeneralNotes} onChange={(e) => setRxGeneralNotes(e.target.value)} rows={2} className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3.5 py-2 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C] transition" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-800">📝 {t.doctorNotesLabel}</label>
                        <span className="text-[9px] font-semibold text-amber-700 uppercase bg-amber-50 px-1.5 py-0.5 rounded">{t.hiddenFromPrintBadge}</span>
                      </div>
                      <textarea placeholder={t.doctorNotesPlaceholder} value={rxDocNotes} onChange={(e) => setRxDocNotes(e.target.value)} rows={2} className="w-full rounded-xl border border-amber-300/40 bg-amber-50/20 px-3.5 py-2 text-sm text-[#1F251A] outline-none focus:border-amber-400 transition" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] mb-1.5">{t.followUpDateLabel}</label>
                      <input type="date" value={rxFollowUpDate} onChange={(e) => setRxFollowUpDate(e.target.value)} className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3.5 py-2 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C] transition" />
                    </div>
                    <div className="flex items-center justify-end gap-3 border-t border-[#414E36]/10 pt-4">
                      <button type="button" onClick={() => setPrescriptionEditMode(false)} className="rounded-lg border border-[#414E36]/15 px-4 py-2 text-sm font-medium text-[#414E36] transition hover:bg-[#EDF1EC]">{t.cancelBtn}</button>
                      <button type="button" onClick={handleSavePrescription} disabled={savingPrescription} className="rounded-lg bg-[#414E36] px-5 py-2 text-sm font-semibold text-[#FBFBF9] shadow-sm transition hover:bg-[#2e3a26] disabled:opacity-60">{savingPrescription ? t.savingBtn : (editingPrescription ? (t.saveAsNewVersionBtn || "Save Changes as New Version") : t.saveRecordBtn)}</button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {loadingPrescriptions ? (
                      <div className="text-center py-12 text-[#5A6A51] text-sm">{t.loadingRecords}</div>
                    ) : customerPrescriptions.length === 0 ? (
                      <div className="text-center py-12 bg-white rounded-2xl border border-[#414E36]/10 space-y-3">
                        <FileText size={36} className="mx-auto text-[#8A9A81]" />
                        <div>
                          <p className="text-sm font-semibold text-[#1F251A]">{t.noPrescriptionsTitle}</p>
                          <p className="text-xs text-[#5A6A51]">{t.noPrescriptionsSubtitle}</p>
                        </div>
                        {(adminRole === "superadmin" || adminRole === "admin" || adminRole === "doctor" || adminRole === "receptionist" || adminRole === "reception" || adminRole === "Receptionist" || !hasPermission || hasPermission("bookings.manage_prescriptions") || hasPermission("clinical.create_prescriptions")) && (
                          <button
                            type="button"
                            onClick={handleStartCreatePrescription}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#414E36] px-4 py-2 text-xs font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26] shadow-sm"
                          >
                            <Plus size={14} /> {t.writePrescriptionBtn}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {customerPrescriptions.map((rx) => {
                          const rxDate = new Date(rx.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
                          const isDocUser = adminRole === "superadmin" || adminRole === "admin" || adminRole === "doctor" || adminRole === "receptionist" || adminRole === "reception" || adminRole === "Receptionist" || !hasPermission || hasPermission("bookings.manage_prescriptions") || hasPermission("clinical.create_prescriptions");
                          return (
                            <div key={rx.id} className="bg-white rounded-2xl border border-[#414E36]/10 p-5 space-y-4 relative overflow-hidden">
                              <div className="flex items-start sm:items-center justify-between border-b border-[#414E36]/5 pb-3 flex-wrap gap-2">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-[#1F251A] text-sm">{rxDate}</span>
                                    <span className="inline-flex items-center gap-1 rounded-full bg-[#414E36]/10 px-2 py-0.5 text-[11px] font-bold text-[#414E36]">
                                      {t.versionBadge || "Version"} {rx.version || 1}
                                      {rx.is_latest !== false && (
                                        <span className="bg-[#414E36] text-[#FBFBF9] text-[9px] px-1.5 py-0.2 rounded-full font-medium">
                                          {t.currentVersionBadge || "Current"}
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                  <span className="text-xs text-[#8A9A81] block">
                                    {rx.doctor_name ? (
                                      <span>{t.editedByDoctor || "Doctor / Staff:"} <strong className="text-[#1F251A] font-semibold">{rx.doctor_name}</strong></span>
                                    ) : (
                                      t.recordedByTeam
                                    )}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  {handleOpenPrescriptionHistory && (
                                    <button
                                      type="button"
                                      title={t.prescriptionHistoryTooltip || "View previous versions of this prescription."}
                                      onClick={() => handleOpenPrescriptionHistory(rx)}
                                      className="inline-flex items-center gap-1 rounded-lg border border-[#414E36]/15 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#414E36] hover:bg-[#EDF1EC] transition shadow-2xs"
                                    >
                                      <History size={13} className="text-[#414E36]" /> {t.prescriptionHistoryBtn || "Prescription History"}
                                    </button>
                                  )}
                                  <button type="button" onClick={() => handlePrintPrescription(rx)} className="inline-flex items-center gap-1 rounded-lg border border-[#414E36]/15 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#414E36] hover:bg-[#EDF1EC] transition"><Printer size={13} /> {t.printBtn}</button>
                                  {isDocUser && (
                                    <>
                                      <button
                                        type="button"
                                        title={t.editPrescriptionTooltip || "Update this prescription. Previous versions will remain available in history."}
                                        onClick={() => handleStartEditPrescription(rx)}
                                        className="inline-flex items-center gap-1 rounded-lg border border-[#414E36]/15 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#414E36] hover:bg-[#EDF1EC] transition"
                                      >
                                        <Pencil size={12} /> {t.editBtn}
                                      </button>
                                      <button type="button" onClick={() => handleDeletePrescription(rx.id)} className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition"><Trash2 size={13} /></button>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="space-y-3 text-sm">
                                {rx.diagnosis && (<div><span className="block text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">{t.diagnosisFieldLabel}</span><p className="text-[#1F251A] font-medium leading-relaxed">{rx.diagnosis}</p></div>)}
                                {rx.medications && rx.medications.length > 0 && (<div><span className="block text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider mb-1">{t.medicationsPrescribedLabel}</span><ul className="space-y-2 bg-[#FBFBF9] rounded-xl border border-[#414E36]/5 p-3">{rx.medications.map((m: any, idx: number) => (<li key={idx} className="flex flex-col"><span className="font-semibold text-[#1F251A]">{m.name}</span>{m.instructions && (<span className="text-xs text-[#5A6A51] italic">{m.instructions}</span>)}</li>))}</ul></div>)}
                                {rx.general_notes && (<div><span className="block text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">{t.generalNotesFieldLabel}</span><p className="text-xs text-[#5A6A51] bg-[#FBFBF9] rounded-xl p-3 border border-[#414E36]/5 leading-relaxed">{rx.general_notes}</p></div>)}
                                {rx.doctor_notes && isDocUser && (<div className="border border-amber-300/40 bg-amber-50/20 rounded-xl p-3.5 space-y-1"><div className="flex items-center justify-between"><span className="text-[10px] font-bold text-amber-800">🔒 {t.doctorNotesFieldLabel}</span><span className="text-[9px] font-semibold text-amber-700 uppercase bg-amber-50 px-1 py-0.5 rounded">{t.hiddenFromPrintBadge}</span></div><p className="text-xs text-amber-900 leading-relaxed">{rx.doctor_notes}</p></div>)}
                                {rx.follow_up_date && (<div className="flex items-center gap-1.5 text-xs text-[#414E36] font-semibold bg-[#EDF1EC]/60 px-3 py-2 rounded-xl w-fit"><Calendar size={13} />{t.nextFollowUpPrefix} {new Date(rx.follow_up_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Sub-tab 3: Reports & Documents */}
            {customerRecordsSubTab === "reports" && (
              <div className="space-y-4">
                {medicalReports.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-2xl border border-[#414E36]/10 space-y-3">
                    <FileText size={36} className="mx-auto text-[#8A9A81]" />
                    <div>
                      <p className="text-sm font-semibold text-[#1F251A]">{t.noReportsTitle}</p>
                      <p className="text-xs text-[#5A6A51]">{t.noReportsSubtitle}</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenMedicalReportModal}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#414E36] px-4 py-2 text-xs font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26] shadow-sm"
                    >
                      <Plus size={14} /> {t.uploadReportBtn}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {medicalReports.map((report) => (
                      <div key={report.id} className="bg-white rounded-2xl border border-[#414E36]/10 p-5 space-y-3 relative">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <h5 className="font-bold text-[#1F251A] text-sm">{report.report_title}</h5>
                            <span className="text-[10px] font-semibold text-[#5A6A51] uppercase bg-[#EDF1EC] px-2 py-0.5 rounded-md">
                              {report.report_type || t.generalDocumentLabel}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteMedicalReport(report.id)}
                            className="text-red-500 hover:text-red-700 p-1 transition"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        {report.notes && (
                          <p className="text-xs text-[#5A6A51] line-clamp-2">{report.notes}</p>
                        )}
                        <div className="flex items-center justify-between pt-2 border-t border-[#414E36]/5 text-xs text-[#8A9A81]">
                          <span>{report.report_date ? new Date(report.report_date).toLocaleDateString() : new Date(report.created_at).toLocaleDateString()}</span>
                          {report.file_url && (
                            <a
                              href={report.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[#414E36] font-semibold hover:underline"
                            >
                              {t.viewFileLink}
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Transactions History */}
        {customerProfileTab === "transactions" && (
          <PatientTransactionsHistoryTab
            patientId={viewingCustomerProfile.id || ""}
            patientName={viewingCustomerProfile.name}
            onAddTransaction={() => {
              if (onNavigateToNewTransaction && viewingCustomerProfile.id) {
                onNavigateToNewTransaction(viewingCustomerProfile.id, viewingCustomerProfile.name);
              } else {
                setShowInlineManualTxnModal(true);
              }
            }}
            lang={lang}
          />
        )}

        {/* Tab 5: Purchased Products & Cart */}
        {customerProfileTab === "products" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-[#414E36]/10">
              <div className="flex items-center gap-3">
                <div className="flex bg-[#F2EFE9] p-1 rounded-xl gap-1 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setCustomerProductsSubTab("current")}
                    className={`px-3.5 py-1.5 rounded-lg transition ${
                      customerProductsSubTab === "current"
                        ? "bg-[#414E36] text-[#FBFBF9] shadow-xs font-bold"
                        : "text-[#5A6A51] hover:text-[#414E36]"
                    }`}
                  >
                    {t.activeBalancesTab}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerProductsSubTab("history")}
                    className={`px-3.5 py-1.5 rounded-lg transition ${
                      customerProductsSubTab === "history"
                        ? "bg-[#414E36] text-[#FBFBF9] shadow-xs font-bold"
                        : "text-[#5A6A51] hover:text-[#414E36]"
                    }`}
                  >
                    {t.purchaseHistoryTab}
                  </button>
                </div>
              </div>

              {(adminRole === "superadmin" || adminRole === "admin" || adminRole === "receptionist" || adminRole === "doctor") && (
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      setSelectedAddProductId("");
                      setSelectedAddProductName("");
                      setSelectedAddProductQty(1);
                      setSelectedAddProductUnitPrice(0);
                      setShowAddPatientProductModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#414E36] px-3.5 py-2 text-xs font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26] shadow-sm w-fit"
                  >
                    <Plus size={14} /> {t.addProductBtn}
                  </button>
                </div>
              )}
            </div>

            {customerProductsSubTab === "current" && (
              <div className="space-y-4">
                {/* General Active Laser Pulse Balance Banner (FIFO) */}
                {totalActiveRetailPulses > 0 && (
                  <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent rounded-2xl border border-amber-300/60 p-4.5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-xs shrink-0 mt-0.5">
                        <Zap size={20} />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-[#1F251A]">{t.generalActivePulseBalance || "General Active Pulse Balance"}</h4>
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">FIFO Engine</span>
                        </div>
                        <p className="text-xs text-[#5A6A51] max-w-xl leading-relaxed">
                          {t.fifoNotice || "Pulses are consumed automatically using FIFO (oldest active purchases consumed first)."}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                      <div className="text-end">
                        <span className="block text-xl font-black text-amber-900 tracking-tight">
                          {totalActiveRetailPulses.toLocaleString()}
                        </span>
                        <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">{t.totalAvailablePulses || "Pulses Available"}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-2xl border border-[#414E36]/10 overflow-hidden shadow-sm">
                {loadingCustomerProducts ? (
                  <div className="p-8 text-center text-sm text-[#5A6A51]">{t.loadingProductBalances}</div>
                ) : customerProductBalances.length === 0 ? (
                  <div className="p-12 text-center space-y-3">
                    <div className="mx-auto w-12 h-12 rounded-full bg-[#EDF1EC] flex items-center justify-center text-[#414E36]">
                      <ShoppingBag size={24} />
                    </div>
                    <p className="text-sm font-semibold text-[#1F251A]">{t.noProductBalancesTitle}</p>
                    <p className="text-xs text-[#5A6A51] max-w-sm mx-auto">
                      {t.noProductBalancesSubtitle}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAddProductId("");
                        setSelectedAddProductName("");
                        setSelectedAddProductQty(1);
                        setSelectedAddProductUnitPrice(0);
                        setShowAddPatientProductModal(true);
                      }}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#414E36] px-3.5 py-2 text-xs font-semibold text-[#FBFBF9] hover:bg-[#2e3a26] transition"
                    >
                      <Plus size={14} /> {t.sellAssignProductBtn}
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-start text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[#414E36]/10 bg-[#FBFBF9] text-[#5A6A51] font-bold uppercase tracking-wider">
                          <th className="py-3 px-4">{t.colProductName}</th>
                          <th className="py-3 px-4 text-center">{t.colPurchasedQty}</th>
                          <th className="py-3 px-4 text-center">{t.colUsedQty}</th>
                          <th className="py-3 px-4 text-center">{t.colRemainingBalance}</th>
                          <th className="py-3 px-4 text-center">{t.colStatus}</th>
                          <th className="py-3 px-4 text-end">{t.colActions}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#414E36]/5">
                        {customerProductBalances.map((bal: any) => {
                          const totalPurchased = bal.purchased_quantity ?? bal.total_purchased ?? bal.quantity ?? 0;
                          const totalUsed = bal.used_quantity ?? bal.total_used ?? bal.quantity_used ?? 0;
                          const remaining = bal.remaining_quantity ?? bal.remaining_balance ?? (totalPurchased - totalUsed);
                          const isDepleted = bal.status ? bal.status === "Depleted" || remaining <= 0 : remaining <= 0;

                          return (
                            <tr key={bal.id} className="hover:bg-[#FBFBF9]/60 transition">
                              <td className="py-3.5 px-4 font-bold text-[#1F251A]">
                                {bal.product_name}
                              </td>
                              <td className="py-3.5 px-4 text-center font-semibold text-[#1F251A]">
                                {totalPurchased}
                              </td>
                              <td className="py-3.5 px-4 text-center text-[#5A6A51]">
                                {totalUsed}
                              </td>
                              <td className="py-3.5 px-4 text-center font-bold">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                  remaining > 0 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-gray-100 text-gray-500"
                                }`}>
                                  {remaining} {t.leftSuffix}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                  !isDepleted ? "bg-emerald-100/80 text-emerald-800" : "bg-amber-100 text-amber-800"
                                }`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${!isDepleted ? "bg-emerald-600" : "bg-amber-600"}`} />
                                  {!isDepleted ? t.activeBalanceBadge : t.fullyConsumedBadge}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-end">
                                {!isDepleted ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setLogUsageModalBalance(bal);
                                      setLogUsageQty(1);
                                      setLogUsageNotes("");
                                    }}
                                    className="inline-flex items-center gap-1 rounded-lg bg-[#414E36] px-3 py-1.5 text-xs font-semibold text-[#FBFBF9] hover:bg-[#2e3a26] transition shadow-xs"
                                  >
                                    {t.deductLogUsageBtn}
                                  </button>
                                ) : (
                                  <span className="text-[11px] text-gray-400 italic">{t.noRemainingSessions}</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

            {customerProductsSubTab === "history" && (
              <div className="bg-white rounded-2xl border border-[#414E36]/10 overflow-hidden shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-[#5A6A51]">{t.recentSalesHeading}</h5>
                  {combinedPatientProductSales.length > 0 && (
                    <span className="text-xs text-[#5A6A51] font-semibold bg-[#EDF1EC]/60 px-2.5 py-1 rounded-lg">
                      {combinedPatientProductSales.length} {combinedPatientProductSales.length === 1 ? "Record" : "Records"}
                    </span>
                  )}
                </div>
                {combinedPatientProductSales.length === 0 ? (
                  <p className="text-xs text-[#8A9A81] italic text-center py-6">{t.noSalesHistory}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-start text-xs border-collapse min-w-[600px]">
                      <thead>
                        <tr className="border-b border-[#414E36]/10 text-[#5A6A51] font-bold uppercase bg-[#FBFBF9]">
                          <th className="py-2.5 px-3">{t.colDate}</th>
                          <th className="py-2.5 px-3">{t.colProduct}</th>
                          <th className="py-2.5 px-3">Channel / Source</th>
                          <th className="py-2.5 px-3 text-center">{t.colQty}</th>
                          <th className="py-2.5 px-3 text-end">{t.colUnitPrice}</th>
                          <th className="py-2.5 px-3 text-end">{t.colTotal}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#414E36]/5">
                        {combinedPatientProductSales.map((sale: any, idx: number) => (
                          <tr key={sale.id || idx} className="hover:bg-[#FBFBF9]/70 transition">
                            <td className="py-2.5 px-3 text-[#5A6A51]">
                              {sale.date
                                ? new Date(sale.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
                                : "—"}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-[#1F251A]">{sale.product_name}</td>
                            <td className="py-2.5 px-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                sale.source && sale.source.startsWith('Booking')
                                  ? 'bg-[#414E36]/10 text-[#414E36]'
                                  : 'bg-[#C4AE7C]/15 text-[#8C7643]'
                              }`}>
                                {sale.source || 'Direct Sale'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-semibold">{sale.quantity}</td>
                            <td className="py-2.5 px-3 text-end">EGP {Number(sale.unit_price || 0).toLocaleString()}</td>
                            <td className="py-2.5 px-3 text-end font-bold text-[#414E36]">EGP {Number(sale.total_amount || 0).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Packages */}
        {customerProfileTab === "packages" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-[#414E36]/10">
              <div className="flex items-center gap-3">
                <div className="flex bg-[#F2EFE9] p-1 rounded-xl gap-1 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setCustomerPackagesSubTab("current")}
                    className={`px-3.5 py-1.5 rounded-lg transition ${
                      customerPackagesSubTab === "current"
                        ? "bg-[#414E36] text-[#FBFBF9] shadow-xs font-bold"
                        : "text-[#5A6A51] hover:text-[#414E36]"
                    }`}
                  >
                    {t.activePackagesTab}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerPackagesSubTab("history")}
                    className={`px-3.5 py-1.5 rounded-lg transition ${
                      customerPackagesSubTab === "history"
                        ? "bg-[#414E36] text-[#FBFBF9] shadow-xs font-bold"
                        : "text-[#5A6A51] hover:text-[#414E36]"
                    }`}
                  >
                    {t.historyTab}
                  </button>
                </div>
              </div>

              {(adminRole === "superadmin" || adminRole === "admin" || adminRole === "receptionist" || adminRole === "doctor") && (
                <button
                  onClick={() => {
                    setSelectedSellPackageId("");
                    setShowSellPackageModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#414E36] px-3.5 py-2 text-xs font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26] shadow-sm w-fit"
                >
                  <Plus size={14} /> {t.sellPackageBtn}
                </button>
              )}
            </div>

            {customerPackagesSubTab === "current" && (
              <div className="bg-white rounded-2xl border border-[#414E36]/10 overflow-hidden shadow-sm">
                {loadingCustomerPackages ? (
                  <div className="p-8 text-center text-sm text-[#5A6A51]">{t.loadingPackages}</div>
                ) : customerProfilePackages.filter((p: any) => p.status === "active").length === 0 ? (
                  <div className="p-12 text-center space-y-3">
                    <div className="mx-auto w-12 h-12 rounded-full bg-[#EDF1EC] flex items-center justify-center text-[#414E36]">
                      <Package size={24} />
                    </div>
                    <p className="text-sm font-semibold text-[#1F251A]">{t.noActivePackagesTitle}</p>
                    <p className="text-xs text-[#5A6A51] max-w-sm mx-auto">
                      {t.noActivePackagesSubtitle}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSellPackageId("");
                        setShowSellPackageModal(true);
                      }}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#414E36] px-3.5 py-2 text-xs font-semibold text-[#FBFBF9] hover:bg-[#2e3a26] transition"
                    >
                      <Plus size={14} /> {t.sellPackageShortBtn}
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-[#414E36]/5">
                    {customerProfilePackages.filter((p: any) => p.status === "active").map((pkg: any) => {
                      const isExpired = pkg.expiresAt && new Date(pkg.expiresAt) < new Date();
                      const isPulses = pkg.packageType === "pulses" || Number(pkg.totalPulses) > 0 || Number(pkg.includedPulses) > 0 || Number(pkg.remainingPulses) > 0 || Number(pkg.pulsesRemaining) > 0 || (pkg.items || []).length === 0;
                      const totalPulsesVal = Number(pkg.totalPulses ?? pkg.includedPulses ?? 0);
                      const remainingPulsesVal = pkg.pulsesRemaining !== undefined && pkg.pulsesRemaining !== null
                        ? Number(pkg.pulsesRemaining)
                        : pkg.remainingPulses !== undefined && pkg.remainingPulses !== null
                        ? Number(pkg.remainingPulses)
                        : totalPulsesVal;
                      const usedPulsesVal = Number(pkg.usedPulses ?? pkg.pulsesUsed ?? Math.max(0, totalPulsesVal - remainingPulsesVal));
                      const effectiveTotal = totalPulsesVal > 0 ? totalPulsesVal : remainingPulsesVal;

                      return (
                        <div key={pkg.id} className="p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold text-[#1F251A] text-sm">{pkg.packageName}</p>
                              {isPulses && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300/50 px-2 py-0.5 text-[10px] font-bold">
                                  <Zap size={11} className="text-amber-600" />
                                  {lang === "ar" ? "باقة نبضات ليزر" : "Laser Pulses Package"}
                                </span>
                              )}
                            </div>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              isExpired ? "bg-amber-100 text-amber-800" : "bg-emerald-100/80 text-emerald-800"
                            }`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${isExpired ? "bg-amber-600" : "bg-emerald-600"}`} />
                              {isExpired ? t.expiredBadge : t.packageActiveBadge}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#5A6A51]">
                            {t.purchasedPrefix} {new Date(pkg.purchasedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                            {pkg.expiresAt && ` · ${t.expiresPrefix} ${new Date(pkg.expiresAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}`}
                            {` · EGP ${Number(pkg.pricePaid).toLocaleString()} ${t.paidSuffix}`}
                          </p>
                          {isPulses ? (
                            <div className="flex items-center gap-3 bg-amber-50/70 border border-amber-200/80 rounded-xl p-2.5 max-w-md">
                              <div className="p-1.5 bg-amber-500 text-white rounded-lg shrink-0 shadow-xs">
                                <Zap size={14} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-amber-900">{lang === "ar" ? "رصيد النبضات المتبقي" : "Remaining Pulses"}</span>
                                    {usedPulsesVal > 0 && (
                                      <span className="text-[10px] text-amber-700 font-medium">
                                        ({usedPulsesVal.toLocaleString()} {lang === "ar" ? "مستخدمة" : "used"})
                                      </span>
                                    )}
                                  </div>
                                  <span className="font-black text-amber-900">
                                    {Number(remainingPulsesVal).toLocaleString()} / {Number(effectiveTotal).toLocaleString()}
                                  </span>
                                </div>
                                <div className="w-full bg-amber-200/60 rounded-full h-1.5 mt-1.5 overflow-hidden">
                                  <div
                                    className="bg-amber-500 h-full rounded-full transition-all duration-500"
                                    style={{
                                      width: `${effectiveTotal > 0 ? Math.min(100, Math.max(0, (remainingPulsesVal / effectiveTotal) * 100)) : (remainingPulsesVal > 0 ? 100 : 0)}%`
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {(pkg.items || []).map((it: any) => (
                                <span key={it.id} className="inline-flex items-center gap-1.5 rounded-full bg-[#F9F9F7] border border-[#414E36]/10 px-2.5 py-1 text-[11px] font-semibold text-[#414E36]">
                                  {it.serviceName || `Service #${it.serviceId}`}
                                  <span className={`font-bold ${it.qtyRemaining > 0 ? "text-emerald-700" : "text-gray-400"}`}>
                                    {it.qtyUsed}/{it.qtyTotal} {t.usedSuffix}
                                  </span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {customerPackagesSubTab === "history" && (
              <div className="bg-white rounded-2xl border border-[#414E36]/10 overflow-hidden shadow-sm p-6 space-y-4">
                <h5 className="text-xs font-bold uppercase tracking-wider text-[#5A6A51]">{t.expiredPackagesHeading}</h5>
                {customerProfilePackages.filter((p: any) => p.status !== "active").length === 0 ? (
                  <p className="text-xs text-[#8A9A81] italic text-center py-6">{t.noPackageHistory}</p>
                ) : (
                  <div className="space-y-3">
                    {customerProfilePackages.filter((p: any) => p.status !== "active").map((pkg: any) => (
                      <div key={pkg.id} className="flex items-center justify-between rounded-xl border border-[#414E36]/10 p-3">
                        <div>
                          <p className="font-semibold text-[#1F251A] text-sm">{pkg.packageName}</p>
                          <p className="text-[11px] text-[#5A6A51]">
                            {t.purchasedPrefix} {new Date(pkg.purchasedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                          </p>
                        </div>
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-bold text-gray-500 capitalize">
                          {(t.packageStatusLabels as Record<string, string>)[String(pkg.status)] || String(pkg.status).replace("_", " ")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 7: Laser History */}
        {customerProfileTab === "laser" && (
          <div className="space-y-6">
            {/* Lifetime KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-2xl border border-amber-200/70 bg-amber-50/50 p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs font-semibold text-amber-800">
                  <span>{t.totalLaserSessions || "Total Laser Sessions"}</span>
                  <Zap size={14} className="text-amber-600" />
                </div>
                <div className="mt-2 text-xl font-black text-[#1F251A]">
                  {laserStats?.totalSessions ?? laserLogs.length}
                </div>
                <div className="text-[11px] text-[#5A6A51] mt-0.5">Lifetime sessions</div>
              </div>

              <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/50 p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs font-semibold text-emerald-800">
                  <span>{t.totalPulsesDelivered || "Total Pulses Delivered"}</span>
                  <Zap size={14} className="text-emerald-600" />
                </div>
                <div className="mt-2 text-xl font-black text-emerald-900">
                  {(laserStats?.totalPulsesDelivered ?? laserLogs.reduce((acc, l) => acc + (Number(l.pulses_used) || 0), 0)).toLocaleString()}
                </div>
                <div className="text-[11px] text-[#5A6A51] mt-0.5">All service & pulse logs</div>
              </div>

              <div className="rounded-2xl border border-sky-200/70 bg-sky-50/50 p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs font-semibold text-sky-800">
                  <span>{t.totalAdditionalPulses || "Total Additional Pulses"}</span>
                  <Plus size={14} className="text-sky-600" />
                </div>
                <div className="mt-2 text-xl font-black text-sky-900">
                  {(laserStats?.totalAdditionalPulses ?? laserLogs.reduce((acc, l) => acc + (Number(l.additional_pulses) || 0), 0)).toLocaleString()}
                </div>
                <div className="text-[11px] text-[#5A6A51] mt-0.5">Extra billed pulses</div>
              </div>

              <div className="rounded-2xl border border-purple-200/70 bg-purple-50/50 p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs font-semibold text-purple-800">
                  <span>Total Extra Billed</span>
                  <Wallet size={14} className="text-purple-600" />
                </div>
                <div className="mt-2 text-xl font-black text-purple-900">
                  EGP {(laserStats?.totalAdditionalCharge ?? laserLogs.reduce((acc, l) => acc + (Number(l.additional_charge) || 0), 0)).toLocaleString()}
                </div>
                <div className="text-[11px] text-[#5A6A51] mt-0.5">Surcharge revenue</div>
              </div>
            </div>

            {/* Laser Logs Feed / Table */}
            <div className="bg-white rounded-2xl border border-[#414E36]/10 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-[#414E36]/10 bg-[#FBFBF9] flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-[#1F251A]">{t.tabLaserHistory || "Laser History"}</h4>
                  <p className="text-xs text-[#5A6A51]">Comprehensive audit log of all laser treatments and pulse consumptions</p>
                </div>
                {laserLogs.length > 0 && (
                  <span className="text-xs font-bold text-[#414E36] bg-[#EDF1EC] px-2.5 py-1 rounded-lg">
                    {laserLogs.length} {laserLogs.length === 1 ? "Session" : "Sessions"}
                  </span>
                )}
              </div>

              {loadingLaserLogs ? (
                <div className="p-8 text-center text-sm text-[#5A6A51]">Loading laser history...</div>
              ) : laserLogs.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <div className="mx-auto w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                    <Zap size={24} />
                  </div>
                  <p className="text-sm font-semibold text-[#1F251A]">{t.noLaserHistoryTitle || "No Laser Sessions Recorded Yet"}</p>
                  <p className="text-xs text-[#5A6A51] max-w-sm mx-auto">
                    {t.noLaserHistorySubtitle || "Recorded laser pulse sessions and history logs for this patient will appear here."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-start text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#414E36]/10 bg-[#FBFBF9] text-[#5A6A51] font-bold uppercase tracking-wider">
                        <th className="py-3 px-4">{t.colDate || "Date / Time"}</th>
                        <th className="py-3 px-4">{t.colTreatmentArea || "Treatment Area"}</th>
                        <th className="py-3 px-4 text-center">{t.colSource || "Sale Type"}</th>
                        <th className="py-3 px-4 text-center">{t.colPulsesUsed || "Pulses Used"}</th>
                        <th className="py-3 px-4 text-center">{t.colAdditionalPulses || "Additional Pulses"}</th>
                        <th className="py-3 px-4 text-center">Remaining Balance</th>
                        <th className="py-3 px-4 text-end">{t.colDoctorStaff || "Doctor / Staff"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#414E36]/5">
                      {laserLogs.map((log: any) => {
                        const dateStr = log.created_at || log.session_date
                          ? new Date(log.created_at || log.session_date).toLocaleString(lang === "ar" ? "ar-EG" : "en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })
                          : "—";

                        return (
                          <tr key={log.id} className="hover:bg-[#FBFBF9]/60 transition">
                            <td className="py-3.5 px-4 font-medium text-[#1F251A] whitespace-nowrap">
                              {dateStr}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="inline-flex items-center font-bold text-[#1F251A] bg-gray-100 px-2.5 py-1 rounded-md">
                                {log.treatment_area || "Standard Area"}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {log.pulse_type === "SERVICE" ? (
                                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                  {t.sourceService || "Laser Service"}
                                </span>
                              ) : log.pulse_type === "PACKAGE" ? (
                                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                  {t.sourcePackage || "Package Pulses"}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  {t.sourcePulsePurchase || "Pulse Purchase (FIFO)"}
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-center font-bold text-[#1F251A]">
                              <span className="text-sm">{Number(log.pulses_used || 0).toLocaleString()}</span> <span className="text-[10px] text-[#5A6A51]">pulses</span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {Number(log.additional_pulses || 0) > 0 ? (
                                <div className="inline-flex flex-col items-center">
                                  <span className="font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md text-xs">
                                    +{Number(log.additional_pulses).toLocaleString()} pulses
                                  </span>
                                  {Number(log.additional_charge || 0) > 0 && (
                                    <span className="text-[10px] text-rose-700 font-semibold mt-0.5">
                                      +EGP {Number(log.additional_charge).toLocaleString()}
                                    </span>
                                  )}
                                  {log.additional_reason && (
                                    <span className="text-[9px] text-[#5A6A51] italic max-w-[120px] truncate" title={log.additional_reason}>
                                      {log.additional_reason}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[#8A9A81]">—</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-center font-semibold">
                              {log.remaining_balance_after !== null && log.remaining_balance_after !== undefined ? (
                                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-xs font-bold">
                                  {Number(log.remaining_balance_after).toLocaleString()} left
                                </span>
                              ) : (
                                <span className="text-[#8A9A81] text-[11px]">N/A (Fixed Service)</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-end">
                              <div className="font-semibold text-[#1F251A]">{log.doctor_name || "Doctor"}</div>
                              {log.device_name && (
                                <div className="text-[10px] text-[#5A6A51]">{log.device_name}</div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Log Usage Modal */}
      {logUsageModalBalance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setLogUsageModalBalance(null)} />
          <div className="relative z-10 w-full max-w-md bg-white rounded-2xl border border-[#414E36]/15 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#414E36]/10 pb-3">
              <h4 className="text-base font-bold text-[#1F251A]">{t.logUsageModalTitle}</h4>
              <button
                type="button"
                onClick={() => setLogUsageModalBalance(null)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-[#EDF1EC]/60 p-3.5 rounded-xl space-y-1 text-xs">
              <span className="block text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider">{t.productItemLabel}</span>
              <p className="font-bold text-[#1F251A] text-sm">{logUsageModalBalance.product_name}</p>
              <p className="text-[#5A6A51]">
                {t.currentRemainingLabel} <strong className="text-[#414E36]">
                  {logUsageModalBalance.remaining_quantity ?? logUsageModalBalance.remaining_balance ?? ((logUsageModalBalance.purchased_quantity || logUsageModalBalance.total_purchased || logUsageModalBalance.quantity || 0) - (logUsageModalBalance.used_quantity || logUsageModalBalance.total_used || logUsageModalBalance.quantity_used || 0))}
                </strong>
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#5A6A51] mb-1">{t.qtyUsedLabel}</label>
                <input
                  type="number"
                  min="1"
                  max={logUsageModalBalance.remaining_quantity ?? logUsageModalBalance.remaining_balance ?? 99}
                  value={logUsageQty}
                  onChange={(e) => setLogUsageQty(Math.max(1, Number(e.target.value)))}
                  className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3.5 py-2 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5A6A51] mb-1">{t.usageNotesLabel}</label>
                <textarea
                  placeholder={t.usageNotesPlaceholder}
                  value={logUsageNotes}
                  onChange={(e) => setLogUsageNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3.5 py-2 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C] resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#414E36]/10">
              <button
                type="button"
                onClick={() => setLogUsageModalBalance(null)}
                className="rounded-xl border border-[#414E36]/15 px-4 py-2 text-xs font-semibold text-[#414E36] hover:bg-[#EDF1EC] transition"
              >
                {t.cancelBtn}
              </button>
              <button
                type="button"
                onClick={handleSaveUsageLog}
                disabled={savingUsageLog}
                className="rounded-xl bg-[#414E36] px-5 py-2 text-xs font-semibold text-[#FBFBF9] hover:bg-[#2e3a26] transition disabled:opacity-50"
              >
                {savingUsageLog ? t.deductingBtn : t.confirmUsageBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Product to Patient / Cart Modal */}
      {showAddPatientProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowAddPatientProductModal(false)} />
          <div className="relative z-10 w-full max-w-lg bg-white rounded-2xl border border-[#414E36]/15 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#414E36]/10 pb-3">
              <div>
                <h4 className="text-base font-bold text-[#1F251A]">{t.addProductModalTitle}</h4>
                <p className="text-xs text-[#5A6A51]">{t.assignProductBalanceTo} {viewingCustomerProfile.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddPatientProductModal(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#5A6A51] mb-1">{t.selectProductLabel}</label>
                <select
                  value={selectedAddProductId}
                  onChange={(e) => {
                    const prodId = e.target.value;
                    setSelectedAddProductId(prodId);
                    const found = inventoryProducts.find((p) => p.id === prodId);
                    if (found) {
                      setSelectedAddProductName(found.name);
                      setSelectedAddProductUnitPrice(found.selling_price || found.price || 0);
                    }
                  }}
                  className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3.5 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                >
                  <option value="">{t.chooseProductOption}</option>
                  {inventoryProducts.filter((p) => p.role !== "consumable").map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.category || t.productFallbackCategory}) - EGP {p.selling_price || p.price || 0}
                    </option>
                  ))}
                  <option value="custom">{t.customItemOption}</option>
                </select>
              </div>

              {(!selectedAddProductId || selectedAddProductId === "custom") && (
                <div>
                  <label className="block text-xs font-semibold text-[#5A6A51] mb-1">{t.customProductNameLabel}</label>
                  <input
                    type="text"
                    placeholder={t.customProductNamePlaceholder}
                    value={selectedAddProductName}
                    onChange={(e) => setSelectedAddProductName(e.target.value)}
                    className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3.5 py-2 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#5A6A51] mb-1">{t.quantityLabel}</label>
                  <input
                    type="number"
                    min="1"
                    value={selectedAddProductQty}
                    onChange={(e) => setSelectedAddProductQty(Math.max(1, Number(e.target.value)))}
                    className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3.5 py-2 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5A6A51] mb-1">{t.unitPriceLabel}</label>
                  <input
                    type="number"
                    min="0"
                    value={selectedAddProductUnitPrice}
                    onChange={(e) => setSelectedAddProductUnitPrice(Number(e.target.value))}
                    className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3.5 py-2 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                  />
                </div>
              </div>

              <div className="bg-[#EDF1EC]/60 p-3.5 rounded-xl flex items-center justify-between text-xs font-semibold text-[#1F251A]">
                <span>{t.totalAmountLabel}</span>
                <span className="text-base font-bold text-[#414E36]">
                  EGP {(selectedAddProductQty * selectedAddProductUnitPrice).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#414E36]/10">
              <button
                type="button"
                onClick={() => setShowAddPatientProductModal(false)}
                className="rounded-xl border border-[#414E36]/15 px-4 py-2 text-xs font-semibold text-[#414E36] hover:bg-[#EDF1EC] transition"
              >
                {t.cancelBtn}
              </button>
              <button
                type="button"
                onClick={handleAddProductToPatient}
                disabled={addingProductToPatient || !selectedAddProductName}
                className="rounded-xl bg-[#414E36] px-5 py-2 text-xs font-semibold text-[#FBFBF9] hover:bg-[#2e3a26] transition disabled:opacity-50"
              >
                {addingProductToPatient ? t.addingBtn : t.addToPatientCartBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Sell Package to Patient ── */}
      {showSellPackageModal && viewingCustomerProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowSellPackageModal(false)} />
          <div className="relative z-10 w-full max-w-lg bg-white rounded-2xl border border-[#414E36]/15 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#414E36]/10 pb-3">
              <div>
                <h4 className="text-base font-bold text-[#1F251A]">{t.sellPackageBtn}</h4>
                <p className="text-xs text-[#5A6A51]">{t.assignPackageTo} {viewingCustomerProfile.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowSellPackageModal(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#5A6A51] mb-1">{t.selectPackageLabel}</label>
                <select
                  value={selectedSellPackageId}
                  onChange={(e) => setSelectedSellPackageId(e.target.value)}
                  className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3.5 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                >
                  <option value="">{t.choosePackageOption}</option>
                  {availablePackageOffers.map((pkg: any) => {
                    const isPulses = pkg.packageType === "pulses" || Number(pkg.totalPulses) > 0 || (pkg.items?.length || 0) === 0;
                    return (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.name} - EGP {Number(pkg.price).toLocaleString()} ({isPulses ? `⚡ ${(pkg.totalPulses || 0).toLocaleString()} ${lang === "ar" ? "نبضة" : "Pulses"}` : `${pkg.items?.length || 0} ${t.servicesCountSuffix}`})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5A6A51] mb-1">{t.paymentMethodLabel}</label>
                <select
                  value={sellPackagePaymentMethod}
                  onChange={(e) => setSellPackagePaymentMethod(e.target.value)}
                  className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3.5 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                >
                  <option value="cash">{t.paymentMethods.cash}</option>
                  <option value="card">{t.paymentMethods.card}</option>
                  <option value="wallet">{t.paymentMethods.wallet}</option>
                  <option value="instapay">{t.paymentMethods.instapay}</option>
                  <option value="transfer">{t.paymentMethods.transfer}</option>
                </select>
              </div>

              {selectedSellPackageId && (() => {
                const pkg = availablePackageOffers.find((p: any) => p.id === selectedSellPackageId);
                if (!pkg) return null;
                const isPulses = pkg.packageType === "pulses" || Number(pkg.totalPulses) > 0 || (pkg.items?.length || 0) === 0;
                return (
                  <div className="bg-[#EDF1EC]/60 p-3.5 rounded-xl space-y-2 text-xs text-[#1F251A]">
                    <div className="flex items-center justify-between font-semibold">
                      <span>{t.priceLabel}</span>
                      <span className="text-base font-bold text-[#414E36]">EGP {Number(pkg.price).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{t.validityLabel}</span>
                      <span className="font-semibold">{pkg.validityDays} {t.daysSuffix}</span>
                    </div>
                    {isPulses ? (
                      <div className="pt-1 flex items-center justify-between bg-amber-500/10 border border-amber-300/60 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-1.5 font-bold text-amber-900">
                          <Zap size={14} className="text-amber-600" />
                          <span>{lang === "ar" ? "رصيد النبضات المتضمن" : "Included Pulses Quota"}</span>
                        </div>
                        <span className="text-sm font-black text-amber-900">
                          {(pkg.totalPulses || 0).toLocaleString()} {lang === "ar" ? "نبضة" : "Pulses"}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {(pkg.items || []).map((it: any) => (
                          <span key={it.id} className="inline-flex rounded-full bg-white border border-[#414E36]/10 px-2 py-0.5 font-semibold">
                            {it.serviceName || `Service #${it.serviceId}`} ×{it.qty}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#414E36]/10">
              <button
                type="button"
                onClick={() => setShowSellPackageModal(false)}
                className="rounded-xl border border-[#414E36]/15 px-4 py-2 text-xs font-semibold text-[#414E36] hover:bg-[#EDF1EC] transition"
              >
                {t.cancelBtn}
              </button>
              <button
                type="button"
                onClick={handleSellPackageToCustomer}
                disabled={sellingPackage || !selectedSellPackageId}
                className="rounded-xl bg-[#414E36] px-5 py-2 text-xs font-semibold text-[#FBFBF9] hover:bg-[#2e3a26] transition disabled:opacity-50"
              >
                {sellingPackage ? t.sellingBtn : t.sellPackageShortBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Medical Intake Form ── */}
      {showMedicalFormModal && (
        <MedicalFormModal
          setShowMedicalFormModal={setShowMedicalFormModal}
          viewingCustomerProfile={viewingCustomerProfile}
          adminRole={adminRole}
          authenticatedJsonHeaders={authenticatedJsonHeaders}
          medicalRecordForm={medicalRecordForm}
          setMedicalRecordForm={setMedicalRecordForm}
          lang={lang}
          t={adminTranslations[lang].patients.medicalFormModal}
        />
      )}

      {/* ── Modal: Medical Report / Document Upload ── */}
      {showMedicalReportModal && (
        <MedicalReportModal
          setShowMedicalReportModal={setShowMedicalReportModal}
          viewingCustomerProfile={viewingCustomerProfile}
          adminRole={adminRole}
          authenticatedJsonHeaders={authenticatedJsonHeaders}
          setMedicalReports={setMedicalReports}
          lang={lang}
          t={adminTranslations[lang].patients.medicalReportModal}
        />
      )}

      {/* ── Modal: Add Manual Transaction ── */}
      {showInlineManualTxnModal && viewingCustomerProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-4xl rounded-3xl bg-white p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto my-8">
            <NewManualTransactionView
              onBack={() => setShowInlineManualTxnModal(false)}
              onSuccess={() => {
                setShowInlineManualTxnModal(false);
              }}
              preSelectedCustomerId={viewingCustomerProfile.id}
              preSelectedCustomerName={viewingCustomerProfile.name}
              staffName="Staff"
              lang={lang}
            />
          </div>
        </div>
      )}

      {/* ── Modal: Prescription Version History Timeline ── */}
      {historyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl border border-[#414E36]/15 flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-[#414E36]/10 flex items-center justify-between bg-[#FBFBF9]">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <History size={18} className="text-[#414E36]" />
                  <h3 className="text-base font-bold text-[#1F251A]">{t.historyTimelineTitle || "Prescription Version History"}</h3>
                </div>
                <p className="text-xs text-[#5A6A51]">{t.historyTimelineSubtitle || "Complete chronological audit log of all previous edits to this prescription"}</p>
              </div>
              <button
                type="button"
                onClick={handleClosePrescriptionHistory}
                className="p-1.5 text-gray-400 hover:text-[#1F251A] rounded-xl hover:bg-[#EDF1EC] transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Banner Notice */}
            <div className="bg-amber-50/70 border-b border-amber-200/60 px-6 py-2.5 text-xs text-amber-900 flex items-center gap-2">
              <span className="font-semibold">{t.cannotEditHistoryWarning || "Previous versions are archived for audit purposes and cannot be edited directly."}</span>
            </div>

            {/* Modal Content - History Timeline */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {loadingHistory ? (
                <div className="text-center py-12 text-[#5A6A51] text-sm">{t.loadingRecords || "Loading history..."}</div>
              ) : (!historyPrescriptions || historyPrescriptions.length === 0) ? (
                <div className="text-center py-12 text-[#5A6A51] text-sm">{t.noHistoryRecorded || "No previous versions recorded for this prescription."}</div>
              ) : (
                <div className="space-y-4">
                  {historyPrescriptions.map((histRx, idx) => {
                    const isLatest = histRx.is_latest !== false && idx === 0;
                    const histDate = histRx.created_at || histRx.date ? new Date(histRx.created_at || histRx.date).toLocaleString(lang === "ar" ? "ar-EG" : "en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
                    return (
                      <div
                        key={histRx.id || idx}
                        className={`rounded-2xl border p-5 space-y-3 transition ${
                          isLatest
                            ? "border-[#414E36]/30 bg-[#FBFBF9] shadow-xs"
                            : "border-gray-200 bg-gray-50/50 opacity-90"
                        }`}
                      >
                        <div className="flex items-center justify-between border-b border-[#414E36]/5 pb-2.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${isLatest ? "bg-[#414E36] text-[#FBFBF9]" : "bg-gray-200 text-gray-700"}`}>
                              {t.versionBadge || "Version"} {histRx.version || (historyPrescriptions.length - idx)}
                            </span>
                            {isLatest ? (
                              <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
                                {t.currentVersionBadge || "Current"}
                              </span>
                            ) : (
                              <span className="bg-gray-100 text-gray-600 border border-gray-200 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                                {t.readOnlyHistoryBadge || "Read-Only History"}
                              </span>
                            )}
                            <span className="text-xs text-[#8A9A81]">{histDate}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handlePrintPrescription(histRx)}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#414E36]/15 bg-white px-2.5 py-1 text-xs font-semibold text-[#414E36] hover:bg-[#EDF1EC] transition"
                          >
                            <Printer size={12} /> {t.printBtn}
                          </button>
                        </div>

                        {histRx.doctor_name && (
                          <div className="text-xs text-[#5A6A51]">
                            <span className="font-semibold text-[#1F251A]">{t.editedByDoctor || "Doctor / Staff:"}</span> {histRx.doctor_name}
                          </div>
                        )}

                        {histRx.diagnosis && (
                          <div>
                            <span className="block text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">{t.diagnosisFieldLabel}</span>
                            <p className="text-xs text-[#1F251A] font-medium leading-relaxed bg-white p-2.5 rounded-xl border border-gray-100">{histRx.diagnosis}</p>
                          </div>
                        )}

                        {Array.isArray(histRx.medications) && histRx.medications.length > 0 && (
                          <div>
                            <span className="block text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider mb-1">{t.medicationsPrescribedLabel}</span>
                            <div className="space-y-1.5 bg-white rounded-xl border border-gray-100 p-2.5">
                              {histRx.medications.map((m: any, mIdx: number) => (
                                <div key={mIdx} className="text-xs text-[#1F251A] flex flex-col">
                                  <span className="font-semibold">{m.name}</span>
                                  {(m.dosage || m.instructions) && (
                                    <span className="text-[11px] text-[#5A6A51] italic">{[m.dosage, m.instructions].filter(Boolean).join(" • ")}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {histRx.general_notes && (
                          <div>
                            <span className="block text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">{t.generalNotesFieldLabel}</span>
                            <p className="text-xs text-[#5A6A51] bg-white rounded-xl p-2.5 border border-gray-100 italic leading-relaxed">{histRx.general_notes}</p>
                          </div>
                        )}

                        {histRx.follow_up_date && (
                          <div className="text-xs text-[#414E36] font-semibold flex items-center gap-1.5">
                            <Calendar size={12} /> {t.nextFollowUpPrefix} {new Date(histRx.follow_up_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-[#414E36]/10 bg-[#FBFBF9] flex justify-end">
              <button
                type="button"
                onClick={handleClosePrescriptionHistory}
                className="rounded-xl bg-[#414E36] px-5 py-2 text-xs font-semibold text-[#FBFBF9] hover:bg-[#2e3a26] transition shadow-xs"
              >
                {t.cancelBtn || "Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Sell Laser Pulses to Patient (FIFO Active Balance) ── */}
    </div>
  );
}
