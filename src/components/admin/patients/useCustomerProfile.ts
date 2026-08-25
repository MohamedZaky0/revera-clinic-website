"use client";

import { useState, useEffect, useCallback } from "react";

export type Customer = {
  id?: string;
  email: string;
  name: string;
  phone: string;
  createdAt: string;
  lastBookingDate?: string | null;
  lastBookingTime?: string | null;
  bookings: number;
  spent: number;
  outstanding: number;
  wallet: number;
  mobile?: string;
  gender?: string | null;
  number_of_bookings?: number;
  registration_date?: string;
  active?: boolean;
  spent_amount?: number;
  wallet_balance?: number;
  area?: string | null;
  location_name?: string | null;
  street_name?: string | null;
  building_no?: string | null;
  floor_no?: string | null;
  city?: string | null;
  street?: string | null;
  building?: string | null;
  note?: string | null;
  created_at?: string;
  updated_at?: string;
  age?: number | null;
  national_id?: string | null;
  address?: string | null;
  referral?: string | null;
  avatar_url?: string | null;
  occupation?: string | null;
};

interface UseCustomerProfileParams {
  session: any;
  authenticatedJsonHeaders: Record<string, string>;
  fetchInventoryProducts: () => Promise<void>;
  fetchProductSalesHistory: () => Promise<void>;
  fetchCustomerPackagesInto: (customerId: string, setter: (data: any[]) => void) => Promise<void>;
  showConfirm: (message: string) => Promise<boolean>;
}

export function useCustomerProfile({
  session,
  authenticatedJsonHeaders,
  fetchInventoryProducts,
  fetchProductSalesHistory,
  fetchCustomerPackagesInto,
  showConfirm,
}: UseCustomerProfileParams) {
  // ── Customer Profile details drawer state ──
  const [viewingCustomerProfile, setViewingCustomerProfile] = useState<Customer | null>(null);

  // ── Medical Record Center & Intake Form states ──
  const [medicalRecordForm, setMedicalRecordForm] = useState<any | null>(null);
  const [medicalReports, setMedicalReports] = useState<any[]>([]);
  const [loadingMedicalRecords, setLoadingMedicalRecords] = useState(false);

  // ── Medical Intake Form Modal state ──
  const [showMedicalFormModal, setShowMedicalFormModal] = useState(false);

  // ── Medical Report Modal state ──
  const [showMedicalReportModal, setShowMedicalReportModal] = useState(false);

  // ── Profile tab states ──
  const [customerProfileTab, setCustomerProfileTab] = useState<"info" | "history" | "prescription" | "products" | "packages">("info");
  const [customerRecordsSubTab, setCustomerRecordsSubTab] = useState<"intake" | "prescriptions" | "reports">("intake");
  const [customerPrescriptions, setCustomerPrescriptions] = useState<any[]>([]);
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);
  const [prescriptionEditMode, setPrescriptionEditMode] = useState(false);
  const [editingPrescription, setEditingPrescription] = useState<any | null>(null);

  // ── Patient Product Balances state ──
  const [customerProductsSubTab, setCustomerProductsSubTab] = useState<"current" | "history">("current");
  const [customerProductBalances, setCustomerProductBalances] = useState<any[]>([]);
  const [loadingCustomerProducts, setLoadingCustomerProducts] = useState(false);
  const [logUsageModalBalance, setLogUsageModalBalance] = useState<any | null>(null);
  const [logUsageQty, setLogUsageQty] = useState<number>(1);
  const [logUsageNotes, setLogUsageNotes] = useState<string>("");
  const [savingUsageLog, setSavingUsageLog] = useState(false);
  const [showAddPatientProductModal, setShowAddPatientProductModal] = useState(false);
  const [selectedAddProductId, setSelectedAddProductId] = useState<string>("");
  const [selectedAddProductName, setSelectedAddProductName] = useState<string>("");
  const [selectedAddProductQty, setSelectedAddProductQty] = useState<number>(1);
  const [selectedAddProductUnitPrice, setSelectedAddProductUnitPrice] = useState<number>(0);
  const [addingProductToPatient, setAddingProductToPatient] = useState(false);

  // ── Patient Packages state ──
  const [customerPackagesSubTab, setCustomerPackagesSubTab] = useState<"current" | "history">("current");
  const [customerProfilePackages, setCustomerProfilePackages] = useState<any[]>([]);
  const [loadingCustomerPackages, setLoadingCustomerPackages] = useState(false);
  const [showSellPackageModal, setShowSellPackageModal] = useState(false);
  const [availablePackageOffers, setAvailablePackageOffers] = useState<any[]>([]);
  const [selectedSellPackageId, setSelectedSellPackageId] = useState<string>("");
  const [sellPackagePaymentMethod, setSellPackagePaymentMethod] = useState<string>("cash");
  const [sellingPackage, setSellingPackage] = useState(false);

  // ── Package redemptions (for Booking History display) ──
  const [customerPackageRedemptions, setCustomerPackageRedemptions] = useState<any[]>([]);

  // ── Prescription Form states ──
  const [rxDiagnosis, setRxDiagnosis] = useState("");
  const [rxMedications, setRxMedications] = useState<{ name: string; dosage: string; instructions: string }[]>([]);
  const [rxMedInput, setRxMedInput] = useState("");
  const [rxMedDropdown, setRxMedDropdown] = useState("");
  const [rxGeneralNotes, setRxGeneralNotes] = useState("");
  const [rxDocNotes, setRxDocNotes] = useState("");
  const [rxFollowUpDate, setRxFollowUpDate] = useState("");
  const [savingPrescription, setSavingPrescription] = useState(false);

  // ════════════════════════════════════════════════════════════════
  // Effects
  // ════════════════════════════════════════════════════════════════

  // Fetch prescriptions and medical records when viewing customer profile changes
  useEffect(() => {
    if (!viewingCustomerProfile?.id) {
      setCustomerPrescriptions([]);
      setMedicalRecordForm(null);
      setMedicalReports([]);
      setCustomerProfileTab("info");
      setPrescriptionEditMode(false);
      setEditingPrescription(null);
      return;
    }

    const fetchRx = async () => {
      setLoadingPrescriptions(true);
      try {
        const res = await fetch(`/api/prescriptions?customerId=${viewingCustomerProfile.id}`, { headers: authenticatedJsonHeaders });
        if (res.ok) {
          const data = await res.json();
          setCustomerPrescriptions(data);
        }
      } catch (err) {
        console.error("Error fetching prescriptions:", err);
      } finally {
        setLoadingPrescriptions(false);
      }
    };

    const fetchMedicalRecords = async () => {
      setLoadingMedicalRecords(true);
      try {
        const res = await fetch(`/api/medical-records?customerId=${viewingCustomerProfile.id}`, { headers: authenticatedJsonHeaders });
        if (res.ok) {
          const data = await res.json();
          setMedicalRecordForm(data.form || null);
          setMedicalReports(data.reports || []);
        }
      } catch (err) {
        console.error("Error fetching medical records:", err);
      } finally {
        setLoadingMedicalRecords(false);
      }
    };

    fetchRx();
    fetchMedicalRecords();
  }, [viewingCustomerProfile?.id]);

  // Fetch customer product balances
  const fetchCustomerProductBalances = useCallback(async (customerId: string) => {
    try {
      setLoadingCustomerProducts(true);
      if (!session?.access_token) return;
      const res = await fetch(`/api/customers/products?customer_id=${encodeURIComponent(customerId)}`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCustomerProductBalances(data.balances || []);
      }
    } catch (err) {
      console.error("Error fetching customer product balances:", err);
    } finally {
      setLoadingCustomerProducts(false);
    }
  }, [session]);

  useEffect(() => {
    if (viewingCustomerProfile?.id) {
      fetchCustomerProductBalances(viewingCustomerProfile.id);
    }
  }, [viewingCustomerProfile?.id, fetchCustomerProductBalances]);

  // Fetch customer profile packages
  const fetchCustomerProfilePackages = useCallback(async (customerId: string) => {
    setLoadingCustomerPackages(true);
    await fetchCustomerPackagesInto(customerId, setCustomerProfilePackages);
    setLoadingCustomerPackages(false);
  }, [fetchCustomerPackagesInto]);

  useEffect(() => {
    if (viewingCustomerProfile?.id) {
      fetchCustomerProfilePackages(viewingCustomerProfile.id);
    }
  }, [viewingCustomerProfile?.id, fetchCustomerProfilePackages]);

  // Fetch customer package redemptions
  const fetchCustomerPackageRedemptions = useCallback(async (customerId: string) => {
    try {
      if (!session?.access_token) return;
      const res = await fetch(`/api/customers/package-redemptions?customer_id=${encodeURIComponent(customerId)}`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCustomerPackageRedemptions(data.redemptions || []);
      }
    } catch (err) {
      console.error("Error fetching customer package redemptions:", err);
    }
  }, [session]);

  useEffect(() => {
    if (viewingCustomerProfile?.id) {
      fetchCustomerPackageRedemptions(viewingCustomerProfile.id);
    } else {
      setCustomerPackageRedemptions([]);
    }
  }, [viewingCustomerProfile?.id, fetchCustomerPackageRedemptions]);

  // ════════════════════════════════════════════════════════════════
  // Handlers
  // ════════════════════════════════════════════════════════════════

  const fetchAvailablePackageOffers = useCallback(async () => {
    try {
      const res = await fetch("/api/packages");
      if (res.ok) {
        const data = await res.json();
        setAvailablePackageOffers(Array.isArray(data) ? data.filter((p: any) => p.active) : []);
      }
    } catch (err) {
      console.error("Error fetching package offers:", err);
    }
  }, []);

  const handleSellPackageToCustomer = async () => {
    if (!viewingCustomerProfile?.id || !selectedSellPackageId) return;
    const customerId = viewingCustomerProfile.id;
    setSellingPackage(true);
    try {
      const res = await fetch("/api/packages/sell", {
        method: "POST",
        headers: authenticatedJsonHeaders,
        body: JSON.stringify({
          customerId,
          packageId: selectedSellPackageId,
          branchId: null,
          paymentMethod: sellPackagePaymentMethod,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchCustomerProfilePackages(customerId);
        setShowSellPackageModal(false);
        setSelectedSellPackageId("");
        setSellPackagePaymentMethod("cash");
        alert(`Package sold successfully!${data.invoice?.invoice_no ? ` Invoice ${data.invoice.invoice_no}` : ""}`);
      } else {
        alert(data.error || "Failed to sell package.");
      }
    } catch (err) {
      console.error("Error selling package:", err);
      alert("Error selling package.");
    } finally {
      setSellingPackage(false);
    }
  };

  const handleSaveUsageLog = async () => {
    if (!logUsageModalBalance || !logUsageQty || logUsageQty <= 0) return;
    try {
      setSavingUsageLog(true);
      const res = await fetch("/api/customers/products", {
        method: "PATCH",
        headers: authenticatedJsonHeaders,
        body: JSON.stringify({
          balance_id: logUsageModalBalance.id,
          quantity_used: Number(logUsageQty),
          used_by: session?.user?.email || "Staff",
          notes: logUsageNotes
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && viewingCustomerProfile?.id) {
          await fetchCustomerProductBalances(viewingCustomerProfile.id);
          setLogUsageModalBalance(null);
          setLogUsageQty(1);
          setLogUsageNotes("");
        }
      }
    } catch (err) {
      console.error("Error logging product usage:", err);
    } finally {
      setSavingUsageLog(false);
    }
  };

  const handleAddProductToPatient = async () => {
    if (!viewingCustomerProfile || !selectedAddProductName || !selectedAddProductQty || selectedAddProductQty <= 0) return;
    try {
      setAddingProductToPatient(true);
      const totalAmt = Number(selectedAddProductUnitPrice || 0) * Number(selectedAddProductQty || 1);
      const res = await fetch("/api/customers/products", {
        method: "POST",
        headers: authenticatedJsonHeaders,
        body: JSON.stringify({
          customer_id: viewingCustomerProfile.id,
          customer_name: viewingCustomerProfile.name || '',
          customer_mobile: viewingCustomerProfile.mobile || viewingCustomerProfile.phone || '',
          product_id: selectedAddProductId || `prod-${Date.now()}`,
          product_name: selectedAddProductName,
          quantity: Number(selectedAddProductQty),
          unit_price: Number(selectedAddProductUnitPrice || 0),
          total_amount: Number(totalAmt || 0)
        })
      });

      if (res.ok) {
        // Also record in product sales history
        await fetch("/api/inventory/products/sales", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
          },
          body: JSON.stringify({
            product_id: selectedAddProductId || `prod-${Date.now()}`,
            product_name: selectedAddProductName,
            customer_id: viewingCustomerProfile.id,
            customer_name: viewingCustomerProfile.name || '',
            customer_mobile: viewingCustomerProfile.mobile || viewingCustomerProfile.phone || '',
            quantity: Number(selectedAddProductQty),
            unit_price: Number(selectedAddProductUnitPrice || 0),
            total_amount: Number(totalAmt || 0),
            sold_by: session?.user?.email || "Admin/Receptionist"
          })
        });

        if (viewingCustomerProfile.id) {
          await fetchCustomerProductBalances(viewingCustomerProfile.id);
        }
        await fetchProductSalesHistory();
        await fetchInventoryProducts();
        setShowAddPatientProductModal(false);
        setSelectedAddProductId("");
        setSelectedAddProductName("");
        setSelectedAddProductQty(1);
        setSelectedAddProductUnitPrice(0);
      }
    } catch (err) {
      console.error("Error adding product to patient:", err);
    } finally {
      setAddingProductToPatient(false);
    }
  };

  function handleStartCreatePrescription() {
    setEditingPrescription(null);
    setRxDiagnosis("");
    setRxMedications([]);
    setRxMedInput("");
    setRxMedDropdown("");
    setRxGeneralNotes("");
    setRxDocNotes("");
    setRxFollowUpDate("");
    setPrescriptionEditMode(true);
  }

  function handleStartEditPrescription(rx: any) {
    setEditingPrescription(rx);
    setRxDiagnosis(rx.diagnosis || "");
    setRxMedications(rx.medications || []);
    setRxMedInput("");
    setRxMedDropdown("");
    setRxGeneralNotes(rx.general_notes || "");
    setRxDocNotes(rx.doctor_notes || "");
    setRxFollowUpDate(rx.follow_up_date || "");
    setPrescriptionEditMode(true);
  }

  function handleAddMedication() {
    if (!rxMedInput.trim()) return;
    setRxMedications(prev => [
      ...prev,
      {
        name: rxMedInput.trim(),
        dosage: "",
        instructions: ""
      }
    ]);
    setRxMedInput("");
    setRxMedDropdown("");
  }

  function handleRemoveMedication(index: number) {
    setRxMedications(prev => prev.filter((_, idx) => idx !== index));
  }

  async function handleSavePrescription() {
    if (!viewingCustomerProfile?.id) return;
    setSavingPrescription(true);

    const payload = {
      id: editingPrescription?.id || undefined,
      customer_id: viewingCustomerProfile.id,
      patient_name: viewingCustomerProfile.name,
      date: new Date().toISOString().slice(0, 10),
      diagnosis: rxDiagnosis.trim() || null,
      medications: rxMedications,
      general_notes: rxGeneralNotes.trim() || null,
      doctor_notes: rxDocNotes.trim() || null,
      follow_up_date: rxFollowUpDate || null
    };

    try {
      const res = await fetch("/api/prescriptions", {
        method: "POST",
        headers: authenticatedJsonHeaders,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save prescription");
      }

      // Re-fetch prescriptions
      const rxRes = await fetch(`/api/prescriptions?customerId=${viewingCustomerProfile.id}`, { headers: authenticatedJsonHeaders });
      if (rxRes.ok) {
        const rxData = await rxRes.json();
        setCustomerPrescriptions(rxData);
      }

      setPrescriptionEditMode(false);
      setEditingPrescription(null);
    } catch (err: any) {
      console.error("handleSavePrescription error:", err);
      alert(err.message || "An error occurred while saving the prescription.");
    } finally {
      setSavingPrescription(false);
    }
  }

  async function handleDeletePrescription(id: string) {
    if (!(await showConfirm("Are you sure you want to delete this prescription?"))) return;
    try {
      const res = await fetch(`/api/prescriptions?id=${id}`, {
        method: "DELETE",
        headers: authenticatedJsonHeaders,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete prescription");
      }

      // Re-fetch prescriptions
      if (viewingCustomerProfile?.id) {
        const rxRes = await fetch(`/api/prescriptions?customerId=${viewingCustomerProfile.id}`, { headers: authenticatedJsonHeaders });
        if (rxRes.ok) {
          const rxData = await rxRes.json();
          setCustomerPrescriptions(rxData);
        }
      }
    } catch (err: any) {
      console.error("handleDeletePrescription error:", err);
      alert(err.message || "An error occurred while deleting the prescription.");
    }
  }

  function handleOpenMedicalFormModal() {
    setShowMedicalFormModal(true);
  }

  function handleOpenMedicalReportModal() {
    setShowMedicalReportModal(true);
  }

  async function handleDeleteMedicalReport(reportId: string) {
    if (!confirm("Are you sure you want to delete this report?")) return;
    try {
      setMedicalReports((prev) => prev.filter((r) => r.id !== reportId));
      await fetch(`/api/medical-records?reportId=${encodeURIComponent(reportId)}`, {
        method: "DELETE",
        headers: authenticatedJsonHeaders,
      });
    } catch (err) {
      console.error("Error deleting medical report:", err);
    }
  }

  function handlePrintPrescription(rx: any) {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to print prescriptions.");
      return;
    }

    const rxDate = new Date(rx.date).toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric"
    });

    const followUpDateStr = rx.follow_up_date
      ? new Date(rx.follow_up_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
      : "";

    const medsHtml = rx.medications && rx.medications.length > 0
      ? `<ol style="margin-left: 20px; font-size: 16px; line-height: 1.8;">
          ${rx.medications.map((m: any) => `
            <li style="margin-bottom: 12px;">
              <strong>${m.name}</strong>
              ${m.instructions ? `<br/><span style="color: #555; font-size: 14px; font-style: italic;">${m.instructions}</span>` : ""}
            </li>
          `).join("")}
         </ol>`
      : `<p style="color: #666; font-style: italic;">No medications prescribed.</p>`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Prescription - ${rx.patient_name}</title>
        <style>
          body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            color: #1F251A;
            margin: 0;
            padding: 40px;
            background-color: #fff;
          }
          .letterhead {
            text-align: center;
            border-bottom: 2px solid #414E36;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 28px;
            font-weight: 700;
            letter-spacing: 0.1em;
            color: #414E36;
            margin: 0;
            text-transform: uppercase;
          }
          .tagline {
            font-size: 12px;
            color: #8A9A81;
            margin: 5px 0 0 0;
            letter-spacing: 0.15em;
            text-transform: uppercase;
          }
          .meta-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 40px;
            font-size: 14px;
            border-bottom: 1px solid #E6E9EB;
            padding-bottom: 20px;
          }
          .meta-label {
            font-weight: bold;
            color: #5A6A51;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.1em;
            margin-bottom: 5px;
          }
          .meta-value {
            font-size: 16px;
            font-weight: 600;
            color: #1F251A;
          }
          .section-title {
            font-size: 14px;
            font-weight: bold;
            color: #414E36;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            border-bottom: 1px solid #F2EFE9;
            padding-bottom: 8px;
            margin-top: 30px;
            margin-bottom: 15px;
          }
          .content-block {
            font-size: 15px;
            line-height: 1.6;
            color: #333;
            margin-bottom: 20px;
          }
          .footer {
            margin-top: 80px;
            border-top: 1px solid #E6E9EB;
            padding-top: 20px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .signature-area {
            text-align: center;
            width: 200px;
          }
          .signature-line {
            border-bottom: 1px solid #1F251A;
            margin-bottom: 5px;
            height: 40px;
          }
          .signature-label {
            font-size: 12px;
            color: #5A6A51;
            font-weight: 500;
          }
          .clinic-info {
            font-size: 11px;
            color: #8A9A81;
            line-height: 1.5;
          }
          @media print {
            body { padding: 0; }
            @page { margin: 20mm; }
          }
        </style>
      </head>
      <body>
        <div class="letterhead">
          <h1 class="logo">Revera Clinic</h1>
          <p class="tagline">Aesthetic & Medical Center</p>
        </div>

        <div class="meta-grid">
          <div>
            <div class="meta-label">Patient Name</div>
            <div class="meta-value">${rx.patient_name}</div>
          </div>
          <div style="text-align: right;">
            <div class="meta-label">Date</div>
            <div class="meta-value">${rxDate}</div>
          </div>
        </div>

        ${rx.diagnosis ? `
          <div class="section-title">Diagnosis</div>
          <div class="content-block" style="white-space: pre-wrap;">${rx.diagnosis}</div>
        ` : ''}

        <div class="section-title" style="margin-top: 40px;">Rx (Prescribed Medications)</div>
        <div class="content-block">${medsHtml}</div>

        ${rx.general_notes ? `
          <div class="section-title">General Notes</div>
          <div class="content-block" style="white-space: pre-wrap;">${rx.general_notes}</div>
        ` : ''}

        ${followUpDateStr ? `
          <div class="section-title">Next Follow-Up Date</div>
          <div class="content-block" style="font-weight: 600; color: #414E36;">${followUpDateStr}</div>
        ` : ''}

        <div class="footer">
          <div class="clinic-info">
            <strong>Revera Clinic Cairo</strong><br/>
            El-Ghad St, Pyramids, Giza<br/>
            Tel: +20 100 000 0000 | info@revera.com
          </div>
          <div class="signature-area">
            <div class="signature-line"></div>
            <div class="signature-label">Doctor's Signature / Stamp</div>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }

  return {
    // State
    viewingCustomerProfile,
    setViewingCustomerProfile,
    medicalRecordForm,
    setMedicalRecordForm,
    medicalReports,
    setMedicalReports,
    loadingMedicalRecords,
    showMedicalFormModal,
    setShowMedicalFormModal,
    showMedicalReportModal,
    setShowMedicalReportModal,
    customerProfileTab,
    setCustomerProfileTab,
    customerRecordsSubTab,
    setCustomerRecordsSubTab,
    customerPrescriptions,
    setCustomerPrescriptions,
    loadingPrescriptions,
    prescriptionEditMode,
    setPrescriptionEditMode,
    editingPrescription,
    setEditingPrescription,
    customerProductsSubTab,
    setCustomerProductsSubTab,
    customerProductBalances,
    setCustomerProductBalances,
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
    setCustomerProfilePackages,
    loadingCustomerPackages,
    showSellPackageModal,
    setShowSellPackageModal,
    availablePackageOffers,
    setAvailablePackageOffers,
    selectedSellPackageId,
    setSelectedSellPackageId,
    sellPackagePaymentMethod,
    setSellPackagePaymentMethod,
    sellingPackage,
    customerPackageRedemptions,
    setCustomerPackageRedemptions,
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

    // Functions
    fetchCustomerProductBalances,
    fetchCustomerProfilePackages,
    fetchCustomerPackageRedemptions,
    fetchAvailablePackageOffers,
    handleSellPackageToCustomer,
    handleSaveUsageLog,
    handleAddProductToPatient,
    handleStartCreatePrescription,
    handleStartEditPrescription,
    handleAddMedication,
    handleRemoveMedication,
    handleSavePrescription,
    handleDeletePrescription,
    handleOpenMedicalFormModal,
    handleOpenMedicalReportModal,
    handleDeleteMedicalReport,
    handlePrintPrescription,
  };
}
