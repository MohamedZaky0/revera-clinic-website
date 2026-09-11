"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  ArrowLeft,
  Wallet,
  User,
  CreditCard,
  Calendar,
  Clock,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Info,
  Loader2,
  ChevronDown,
  RotateCcw,
  Sliders,
  DollarSign,
  FileText,
  Package as PackageIcon,
  ShoppingBag,
  HelpCircle,
  Coins,
} from "lucide-react";
import {
  TransactionType,
  PaymentMethod,
  NewManualTransactionInput,
  TransactionItem,
} from "./types";
import { getAuthHeaders } from "@/lib/authHeaders";

/**
 * Combines the date and time the user actually picked into an ISO timestamp.
 */
function buildOccurredAt(dateStr: string, timeStr: string): string {
  const match = (timeStr || "").trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!dateStr || !match) return new Date().toISOString();

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3]?.toUpperCase();
  if (period === "PM" && hours < 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  if (hours > 23 || minutes > 59) return new Date().toISOString();

  const local = new Date(
    `${dateStr}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`
  );
  return isNaN(local.getTime()) ? new Date().toISOString() : local.toISOString();
}

/**
 * Manual transaction types strictly limited to 3 options per specification:
 * 1. Refund
 * 2. Service Charge
 * 3. Product / Package Purchase
 * Direct payments and wallet balance adjustments are automated system operations.
 */
const MANUAL_TRANSACTION_TYPES = [
  { id: "refund", labelEn: "Refund", labelAr: "استرداد" },
  { id: "service_charge", labelEn: "Service Charge", labelAr: "رسوم خدمة" },
  { id: "product_purchase", labelEn: "Product / Package Purchase", labelAr: "شراء منتج / باقة" },
] as const;

interface CustomerOption {
  id: string;
  name: string;
  mobile?: string;
  wallet_balance?: number;
  outstanding?: number;
  spent_amount?: number;
}

interface InventoryProductOption {
  id: string;
  name: string;
  arabic_name?: string;
  selling_price: number;
  stock_quantity: number;
  sku?: string;
}

interface PackageOption {
  id: string;
  name: string;
  nameAr?: string | null;
  price: number;
  active: boolean;
}

interface NewManualTransactionViewProps {
  onBack: () => void;
  onSuccess: () => void;
  preSelectedCustomerId?: string;
  preSelectedCustomerName?: string;
  staffName?: string;
  branches?: { id: string; name_en: string; name_ar?: string }[];
  onAddNewPatient?: () => void;
  lang?: "en" | "ar";
}

export const NewManualTransactionView: React.FC<NewManualTransactionViewProps> = ({
  onBack,
  onSuccess,
  preSelectedCustomerId,
  preSelectedCustomerName,
  staffName = "Staff User",
  branches = [],
  onAddNewPatient,
  lang = "en",
}) => {
  const isAr = lang === "ar";

  // Form Type State (default to refund or service_charge)
  const [transactionType, setTransactionType] = useState<"refund" | "service_charge" | "product_purchase">("refund");
  
  // Patient Selection State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(preSelectedCustomerId || "");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [patientSearch, setPatientSearch] = useState<string>(preSelectedCustomerName || "");
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  // Common Fields
  const [amount, setAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [branchId, setBranchId] = useState<string>(branches[0]?.id || "");
  const [referenceNo, setReferenceNo] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [refundDestination, setRefundDestination] = useState<"cash" | "wallet">("cash");

  // Product / Package Purchase Fields
  const [itemType, setItemType] = useState<"product" | "package">("product");
  const [productsList, setProductsList] = useState<InventoryProductOption[]>([]);
  const [packagesList, setPackagesList] = useState<PackageOption[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(0);

  // Date & Time states
  const now = new Date();
  const defaultDate = now.toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });
  const defaultHours = String(now.getHours() % 12 || 12).padStart(2, "0");
  const defaultMinutes = String(now.getMinutes()).padStart(2, "0");
  const defaultPeriod = now.getHours() >= 12 ? "PM" : "AM";

  const [txnDate, setTxnDate] = useState<string>(defaultDate);
  const [txnTime, setTxnTime] = useState<string>(`${defaultHours}:${defaultMinutes} ${defaultPeriod}`);

  // Original Transactions for Refund selection
  const [patientTxns, setPatientTxns] = useState<TransactionItem[]>([]);
  const [selectedOriginalTxnId, setSelectedOriginalTxnId] = useState<string>("");
  const [loadingOriginalTxns, setLoadingOriginalTxns] = useState(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close patient dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Fetch Patients for Autocomplete
  useEffect(() => {
    const searchPatients = async () => {
      if (!patientSearch.trim() && !preSelectedCustomerId) return;
      try {
        setLoadingCustomers(true);
        const headers = await getAuthHeaders();
        const res = await fetch(
          `/api/customers?search=${encodeURIComponent(patientSearch)}&limit=8`,
          { headers }
        );
        const data = await res.json();
        const list: CustomerOption[] = Array.isArray(data) ? data : [];
        setCustomerOptions(list);
        if (preSelectedCustomerId && !selectedCustomer) {
          const found = list.find((c) => c.id === preSelectedCustomerId);
          if (found) {
            setSelectedCustomer(found);
            setSelectedCustomerId(found.id);
          }
        }
      } catch (err) {
        console.error("Error searching patients:", err);
      } finally {
        setLoadingCustomers(false);
      }
    };

    const timeout = setTimeout(searchPatients, 250);
    return () => clearTimeout(timeout);
  }, [patientSearch, preSelectedCustomerId]);

  // Fetch patient completed transactions for refund lookup
  useEffect(() => {
    if (transactionType === "refund" && selectedCustomerId) {
      const fetchPatientTxns = async () => {
        try {
          setLoadingOriginalTxns(true);
          const headers = await getAuthHeaders();
          const res = await fetch(`/api/transactions?customerId=${selectedCustomerId}&limit=50`, { headers });
          const data = await res.json();
          if (data.transactions) {
            setPatientTxns(data.transactions);
            const eligible = data.transactions.filter(
              (t: TransactionItem) => t.status === "completed" && Number(t.amount) > 0
            );
            if (eligible.length > 0 && !selectedOriginalTxnId) {
              setSelectedOriginalTxnId(eligible[0].id);
            }
          }
        } catch (err) {
          console.error("Error fetching patient transactions for refund:", err);
        } finally {
          setLoadingOriginalTxns(false);
        }
      };
      fetchPatientTxns();
    }
  }, [transactionType, selectedCustomerId]);

  // Fetch products and packages catalog when product_purchase is selected
  useEffect(() => {
    if (transactionType === "product_purchase") {
      const fetchCatalog = async () => {
        try {
          setLoadingCatalog(true);
          const headers = await getAuthHeaders();
          const [prodRes, pkgRes] = await Promise.all([
            fetch("/api/inventory/products", { headers }),
            fetch("/api/packages", { headers }),
          ]);
          
          if (prodRes.ok) {
            const prodData = await prodRes.json();
            const list = Array.isArray(prodData) ? prodData : (prodData.products || []);
            setProductsList(list);
          }
          if (pkgRes.ok) {
            const pkgData = await pkgRes.json();
            const list = Array.isArray(pkgData) ? pkgData : (pkgData.packages || []);
            setPackagesList(list);
          }
        } catch (err) {
          console.error("Error fetching catalog items:", err);
        } finally {
          setLoadingCatalog(false);
        }
      };
      fetchCatalog();
    }
  }, [transactionType]);

  // Compute eligible positive transactions for refund and remaining refundable amount
  const eligibleCompletedPayments = useMemo(() => {
    return patientTxns.filter((t) => t.status === "completed" && Number(t.amount) > 0);
  }, [patientTxns]);

  const selectedOriginalTxn = useMemo(() => {
    return eligibleCompletedPayments.find((t) => t.id === selectedOriginalTxnId) || null;
  }, [eligibleCompletedPayments, selectedOriginalTxnId]);

  const refundableAmount = useMemo(() => {
    if (!selectedOriginalTxn) return 0;
    const origAmt = Math.abs(Number(selectedOriginalTxn.amount || 0));
    // Find all refunds linked to this original transaction
    const priorRefunds = patientTxns.filter(
      (t) => t.related_transaction_id === selectedOriginalTxn.id && t.type === "refund"
    );
    const totalRefunded = priorRefunds.reduce((sum, r) => sum + Math.abs(Number(r.amount || 0)), 0);
    return Math.max(0, origAmt - totalRefunded);
  }, [selectedOriginalTxn, patientTxns]);

  // When selecting an original transaction in Refund, default amount to refundable amount
  useEffect(() => {
    if (transactionType === "refund" && refundableAmount > 0 && !amount) {
      setAmount(String(refundableAmount));
    }
  }, [transactionType, refundableAmount]);

  // Handle Product / Package selection change
  const handleItemSelect = (id: string) => {
    setSelectedItemId(id);
    if (!id) {
      setUnitPrice(0);
      setAmount("");
      return;
    }

    if (itemType === "product") {
      const prod = productsList.find((p) => p.id === id);
      if (prod) {
        const price = Number(prod.selling_price || 0);
        setUnitPrice(price);
        const total = price * quantity;
        setAmount(total > 0 ? String(total) : "");
        const nameText = isAr && prod.arabic_name ? prod.arabic_name : prod.name;
        setDescription(`${nameText} (Qty: ${quantity})`);
      }
    } else {
      const pkg = packagesList.find((p) => p.id === id);
      if (pkg) {
        const price = Number(pkg.price || 0);
        setUnitPrice(price);
        const total = price * quantity;
        setAmount(total > 0 ? String(total) : "");
        const nameText = isAr && pkg.nameAr ? pkg.nameAr : pkg.name;
        setDescription(`${nameText} (Qty: ${quantity})`);
      }
    }
  };

  // When quantity changes, update calculated total amount
  const handleQuantityChange = (newQty: number) => {
    const validQty = Math.max(1, newQty || 1);
    setQuantity(validQty);
    if (unitPrice > 0) {
      setAmount(String(unitPrice * validQty));
    }
    // Update description qty if applicable
    if (selectedItemId) {
      if (itemType === "product") {
        const prod = productsList.find((p) => p.id === selectedItemId);
        if (prod) {
          const nameText = isAr && prod.arabic_name ? prod.arabic_name : prod.name;
          setDescription(`${nameText} (Qty: ${validQty})`);
        }
      } else {
        const pkg = packagesList.find((p) => p.id === selectedItemId);
        if (pkg) {
          const nameText = isAr && pkg.nameAr ? pkg.nameAr : pkg.name;
          setDescription(`${nameText} (Qty: ${validQty})`);
        }
      }
    }
  };

  const handleSelectCustomer = (cust: CustomerOption) => {
    setSelectedCustomer(cust);
    setSelectedCustomerId(cust.id);
    setPatientSearch(cust.name);
    setShowCustomerDropdown(false);
    setErrorMsg(null);
  };

  const numericAmount = Math.max(0, parseFloat(amount) || 0);
  const currentWalletBalance = Number(selectedCustomer?.wallet_balance || 0);
  const currentOutstanding = Number(selectedCustomer?.outstanding || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validations
    if (!selectedCustomerId) {
      setErrorMsg(isAr ? "يرجى اختيار مريض لهذه المعاملة." : "Please select a patient for this transaction.");
      return;
    }

    if (numericAmount <= 0) {
      setErrorMsg(isAr ? "يرجى إدخال مبلغ صحيح أكبر من 0 ج.م." : "Please enter a valid amount greater than 0 EGP.");
      return;
    }

    if (transactionType === "refund") {
      if (!reason.trim()) {
        setErrorMsg(isAr ? "سبب الاسترداد مطلوب." : "A reason is required for refunds.");
        return;
      }
      if (selectedOriginalTxn && numericAmount > refundableAmount) {
        setErrorMsg(
          isAr
            ? `مبلغ الاسترداد لا يمكن أن يتجاوز المبلغ المتبقي القابل للاسترداد (${refundableAmount.toLocaleString()} ج.م).`
            : `Refund amount cannot exceed the remaining refundable amount of EGP ${refundableAmount.toLocaleString()}.`
        );
        return;
      }
    }

    if (transactionType === "service_charge" && !description.trim()) {
      setErrorMsg(isAr ? "وصف رسوم الخدمة مطلوب." : "A description is required for service charges.");
      return;
    }

    let selectedItemName: string | undefined;
    if (transactionType === "product_purchase" && selectedItemId) {
      if (itemType === "product") {
        const p = productsList.find((x) => x.id === selectedItemId);
        if (p) selectedItemName = isAr && p.arabic_name ? p.arabic_name : p.name;
      } else {
        const pk = packagesList.find((x) => x.id === selectedItemId);
        if (pk) selectedItemName = isAr && pk.nameAr ? pk.nameAr : pk.name;
      }
    }

    try {
      setSubmitting(true);
      const payload: NewManualTransactionInput = {
        transaction_type: transactionType,
        customer_id: selectedCustomerId,
        amount: numericAmount,
        payment_method: paymentMethod,
        branch_id: branchId || undefined,
        reference_no: referenceNo || undefined,
        related_transaction_id: transactionType === "refund" ? (selectedOriginalTxnId || undefined) : undefined,
        description: description || undefined,
        reason: reason || undefined,
        refund_destination: transactionType === "refund" ? refundDestination : undefined,
        item_type: transactionType === "product_purchase" ? itemType : undefined,
        item_id: transactionType === "product_purchase" ? selectedItemId || undefined : undefined,
        item_name: selectedItemName,
        quantity: transactionType === "product_purchase" ? quantity : undefined,
        unit_price: transactionType === "product_purchase" ? unitPrice : undefined,
        occurred_at: buildOccurredAt(txnDate, txnTime),
      };

      const headers = await getAuthHeaders();
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setErrorMsg(data.error || (isAr ? "فشل إنشاء المعاملة." : "Transaction could not be created. Please try again."));
        return;
      }

      setSuccessMsg(isAr ? "تم تسجيل المعاملة بنجاح!" : "Transaction created successfully!");
      setTimeout(() => {
        onSuccess();
      }, 800);
    } catch (err: any) {
      console.error("Create transaction error:", err);
      setErrorMsg(isAr ? "حدث خطأ غير متوقع أثناء تسجيل المعاملة." : "An unexpected error occurred while creating the transaction.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in duration-200" dir={isAr ? "rtl" : "ltr"}>
      {/* Top Navigation & Title */}
      <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
        <button
          type="button"
          onClick={onBack}
          className="h-10 w-10 rounded-2xl bg-white border border-gray-200 hover:bg-gray-50 flex items-center justify-center text-gray-700 transition-colors shadow-2xs"
          title={isAr ? "رجوع" : "Back"}
        >
          <ArrowLeft size={18} className={isAr ? "rotate-180" : ""} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-[#1F251A]">
            {isAr ? "إضافة معاملة يدوية" : "Add Manual Transaction"}
          </h2>
          <p className="text-xs text-gray-500">
            {isAr
              ? "تسجيل معاملة مالية يدوية (استرداد، رسوم خدمة، شراء منتج / باقة)"
              : "Record a manual financial transaction (Refund, Service Charge, Product / Package Purchase)"}
          </p>
        </div>
      </div>

      {/* Form Container */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error / Success Alerts */}
        {errorMsg && (
          <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs font-semibold text-rose-700 flex items-center gap-2.5 animate-in slide-in-from-top-2">
            <AlertCircle size={16} className="shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-semibold text-emerald-700 flex items-center gap-2.5 animate-in slide-in-from-top-2">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Card 1: Transaction Information */}
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
            <div className="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <Wallet size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1F251A]">
                {isAr ? "بيانات المعاملة" : "Transaction Information"}
              </h3>
              <p className="text-xs text-gray-500">
                {isAr
                  ? "حدد نوع المعاملة والمريض والبيانات المالية المطلوبة."
                  : "Specify transaction type, patient, and financial details."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Transaction Type Dropdown */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <label className="block text-xs font-bold text-gray-700">
                  {isAr ? "نوع المعاملة" : "Transaction Type"} <span className="text-rose-500">*</span>
                </label>
                <div
                  className="group relative cursor-pointer"
                  title={
                    isAr
                      ? "المعاملات اليدوية تقتصر على الاسترداد ورسوم الخدمات وشراء المنتجات/الباقات. المدفوعات المباشرة وحركات المحفظة تتم تلقائياً."
                      : "Manual transactions are strictly limited to Refunds, Service Charges, and Product/Package Purchases. Direct payments and wallet adjustments are automated via bookings."
                  }
                >
                  <HelpCircle size={13} className="text-gray-400 hover:text-gray-600 transition-colors" />
                </div>
              </div>
              <div className="relative">
                <select
                  value={transactionType}
                  onChange={(e) => {
                    setTransactionType(e.target.value as any);
                    setErrorMsg(null);
                  }}
                  className="w-full appearance-none rounded-2xl border border-gray-200 bg-[#FBFBF9] px-4 py-3 text-xs font-semibold text-gray-800 focus:border-[#414E36] focus:outline-none focus:ring-1 focus:ring-[#414E36] transition-all"
                >
                  {MANUAL_TRANSACTION_TYPES.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {isAr ? opt.labelAr : opt.labelEn}
                    </option>
                  ))}
                </select>
                <ChevronDown size={15} className={`pointer-events-none absolute top-3.5 text-gray-400 ${isAr ? "left-3.5" : "right-3.5"}`} />
              </div>
              <p className="text-[10px] text-gray-400">
                {isAr
                  ? "ملاحظة: المدفوعات المباشرة وحركات المحفظة تُسجل آلياً عبر مسارات الحجوزات وملفات المرضى."
                  : "Direct payments & wallet deposits/withdrawals are automated system operations."}
              </p>
            </div>

            {/* Patient Search & Autocomplete */}
            <div className="space-y-1.5 relative" ref={dropdownRef}>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-gray-700">
                  {isAr ? "المريض" : "Patient"} <span className="text-rose-500">*</span>
                </label>
                {onAddNewPatient && (
                  <button
                    type="button"
                    onClick={onAddNewPatient}
                    className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1"
                  >
                    <Plus size={12} />
                    {isAr ? "إضافة مريض جديد" : "Add New Patient"}
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={patientSearch}
                  onChange={(e) => {
                    setPatientSearch(e.target.value);
                    setShowCustomerDropdown(true);
                    if (!e.target.value) {
                      setSelectedCustomerId("");
                      setSelectedCustomer(null);
                    }
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  placeholder={isAr ? "ابحث بالاسم أو رقم الهاتف..." : "Search patient by name or phone..."}
                  className="w-full rounded-2xl border border-gray-200 bg-[#FBFBF9] px-4 py-3 pe-10 text-xs font-semibold text-gray-800 placeholder-gray-400 focus:border-[#414E36] focus:outline-none focus:ring-1 focus:ring-[#414E36] transition-all"
                />
                <div className={`absolute top-3.5 text-gray-400 ${isAr ? "left-3.5" : "right-3.5"}`}>
                  {loadingCustomers ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
                </div>
              </div>

              {/* Autocomplete Dropdown List */}
              {showCustomerDropdown && customerOptions.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-1.5 shadow-xl">
                  {customerOptions.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectCustomer(c)}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-start text-xs hover:bg-[#F9F9F7] transition-colors"
                    >
                      <div>
                        <div className="font-bold text-gray-800">{c.name}</div>
                        <div className="text-[11px] text-gray-400">{c.mobile}</div>
                      </div>
                      <div className="text-end text-[11px]">
                        <div className="text-emerald-700 font-semibold">
                          {isAr ? "المحفظة:" : "Wallet:"} EGP {(c.wallet_balance || 0).toLocaleString()}
                        </div>
                        {Number(c.outstanding || 0) > 0 && (
                          <div className="text-rose-600 font-semibold">
                            {isAr ? "مستحق:" : "Due:"} EGP {(c.outstanding || 0).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Selected Patient Banner with Wallet Info */}
          {selectedCustomer && (
            <div className="rounded-2xl bg-[#F7F9F6] p-4 border border-emerald-100 text-xs flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center">
                  <User size={15} />
                </div>
                <div>
                  <div className="font-bold text-gray-900">{selectedCustomer.name}</div>
                  <div className="text-[11px] text-gray-500">{selectedCustomer.mobile || "—"}</div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div
                  className="flex items-center gap-1.5 text-xs text-emerald-800 font-bold bg-white px-3 py-1.5 rounded-xl border border-emerald-100 shadow-2xs"
                  title={isAr ? "الرصيد المتاح في محفظة المريض" : "Available credit in patient wallet"}
                >
                  <Coins size={14} className="text-emerald-600" />
                  <span>{isAr ? "رصيد المحفظة:" : "Wallet Balance:"}</span>
                  <span className="font-extrabold text-emerald-700">EGP {currentWalletBalance.toLocaleString()}</span>
                </div>

                {currentOutstanding > 0 && (
                  <div className="text-xs text-rose-700 font-bold bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100">
                    <span>{isAr ? "المبلغ المستحق:" : "Outstanding:"}</span>{" "}
                    <span>EGP {currentOutstanding.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Type 1: REFUND Specific Section ── */}
          {transactionType === "refund" && (
            <div className="space-y-4 rounded-2xl bg-[#FBFBF9] p-5 border border-gray-200/80 animate-in fade-in">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-800 pb-1 border-b border-gray-200">
                <RotateCcw size={15} />
                <span>{isAr ? "بيانات الاسترداد" : "Refund Details"}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Original Transaction Selector */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-700">
                    {isAr ? "المعاملة الأصلية" : "Original Transaction"} <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={selectedOriginalTxnId}
                      onChange={(e) => {
                        setSelectedOriginalTxnId(e.target.value);
                        setAmount("");
                      }}
                      className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-gray-800 focus:border-[#414E36] focus:outline-none"
                    >
                      {eligibleCompletedPayments.length === 0 ? (
                        <option value="">
                          {selectedCustomerId
                            ? isAr ? "لا توجد مدفوعات مكتملة لهذا المريض" : "No completed payments found for this patient"
                            : isAr ? "اختر مريضاً أولاً لعرض المعاملات" : "Select a patient first to view transactions"}
                        </option>
                      ) : (
                        eligibleCompletedPayments.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.transaction_id} — {t.description} (EGP {Number(t.amount).toLocaleString()})
                          </option>
                        ))
                      )}
                    </select>
                    <ChevronDown size={14} className={`pointer-events-none absolute top-3 text-gray-400 ${isAr ? "left-3" : "right-3"}`} />
                  </div>
                </div>

                {/* Refund Destination */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-700">
                    {isAr ? "طريقة استرجاع المبلغ" : "Refund Destination"} <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { id: "cash", labelEn: "Cash Back", labelAr: "استرداد نقدي", hintEn: "Handed to patient", hintAr: "تسليم نقدي للمريض" },
                      { id: "wallet", labelEn: "Wallet Credit", labelAr: "إيداع في المحفظة", hintEn: "Kept for future visit", hintAr: "رصيد لزيارة قادمة" },
                    ] as const).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setRefundDestination(opt.id)}
                        className={`rounded-xl border px-3 py-2 text-start transition cursor-pointer ${
                          refundDestination === opt.id
                            ? "border-[#414E36] bg-[#F3F6F1]"
                            : "border-gray-200 bg-white hover:bg-gray-50"
                        }`}
                      >
                        <span className="block text-xs font-bold text-gray-800">
                          {isAr ? opt.labelAr : opt.labelEn}
                        </span>
                        <span className="block text-[10px] text-gray-500">
                          {isAr ? opt.hintAr : opt.hintEn}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Original & Refundable Amount Summary */}
              {selectedOriginalTxn && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-white border border-gray-100 text-xs">
                  <div>
                    <span className="text-gray-400 font-bold uppercase text-[10px] block">
                      {isAr ? "المبلغ الأصلي للمدفوعات" : "Original Payment Amount"}
                    </span>
                    <span className="font-extrabold text-gray-800">
                      EGP {Number(selectedOriginalTxn.amount).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-bold uppercase text-[10px] block">
                      {isAr ? "المبلغ القابل للاسترداد" : "Refundable Amount"}
                    </span>
                    <span className="font-extrabold text-emerald-700">
                      EGP {refundableAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Refund Reason */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700">
                  {isAr ? "سبب الاسترداد" : "Refund Reason"} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={isAr ? "مثال: إلغاء الحجز، عدم الرضا عن الخدمة، خطأ في الحساب..." : "e.g. Appointment cancelled, service dissatisfaction, billing correction..."}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-gray-800 placeholder-gray-400 focus:border-[#414E36] focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* ── Type 2: PRODUCT / PACKAGE PURCHASE Specific Section ── */}
          {transactionType === "product_purchase" && (
            <div className="space-y-4 rounded-2xl bg-[#FBFBF9] p-5 border border-gray-200/80 animate-in fade-in">
              <div className="flex items-center gap-2 text-xs font-bold text-teal-800 pb-1 border-b border-gray-200">
                <ShoppingBag size={15} />
                <span>{isAr ? "تفاصيل شراء المنتج أو الباقة" : "Product / Package Purchase Details"}</span>
              </div>

              {/* Item Type Switcher (Product vs Package) */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-600">{isAr ? "نوع العنصر:" : "Item Type:"}</span>
                <div className="flex rounded-xl bg-white border border-gray-200 p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setItemType("product");
                      setSelectedItemId("");
                      setUnitPrice(0);
                      setAmount("");
                    }}
                    className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                      itemType === "product" ? "bg-[#313A28] text-white shadow-xs" : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {isAr ? "منتج تجميلي / علاجي" : "Retail Product"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setItemType("package");
                      setSelectedItemId("");
                      setUnitPrice(0);
                      setAmount("");
                    }}
                    className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                      itemType === "package" ? "bg-[#313A28] text-white shadow-xs" : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {isAr ? "باقة جلسات" : "Treatment Package"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Item Selector Dropdown */}
                <div className="md:col-span-2 space-y-1.5">
                  <label className="block text-xs font-bold text-gray-700">
                    {itemType === "product" ? (isAr ? "اختر المنتج" : "Select Product") : (isAr ? "اختر الباقة" : "Select Package")}
                  </label>
                  <div className="relative">
                    <select
                      value={selectedItemId}
                      onChange={(e) => handleItemSelect(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-gray-800 focus:border-[#414E36] focus:outline-none"
                    >
                      <option value="">
                        {loadingCatalog
                          ? (isAr ? "جاري تحميل القائمة..." : "Loading catalog...")
                          : (isAr ? "-- اختر من القائمة --" : "-- Select from catalog --")}
                      </option>
                      {itemType === "product"
                        ? productsList.map((p) => (
                            <option key={p.id} value={p.id}>
                              {isAr && p.arabic_name ? p.arabic_name : p.name} — EGP {Number(p.selling_price).toLocaleString()} ({p.stock_quantity} in stock)
                            </option>
                          ))
                        : packagesList.map((pkg) => (
                            <option key={pkg.id} value={pkg.id}>
                              {isAr && pkg.nameAr ? pkg.nameAr : pkg.name} — EGP {Number(pkg.price).toLocaleString()}
                            </option>
                          ))}
                    </select>
                    <ChevronDown size={14} className={`pointer-events-none absolute top-3 text-gray-400 ${isAr ? "left-3" : "right-3"}`} />
                  </div>
                </div>

                {/* Quantity */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-700">
                    {isAr ? "الكمية" : "Quantity"} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={quantity}
                    onChange={(e) => handleQuantityChange(parseInt(e.target.value, 10))}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs font-bold text-gray-800 focus:border-[#414E36] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Amount and Payment Method */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">
                {isAr ? "المبلغ" : "Amount"} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-2xl border border-gray-200 bg-[#FBFBF9] px-4 py-3 pe-14 text-xs font-extrabold text-gray-900 focus:border-[#414E36] focus:outline-none focus:ring-1 focus:ring-[#414E36] transition-all"
                />
                <span className={`pointer-events-none absolute top-3 text-xs font-extrabold text-gray-400 ${isAr ? "left-4" : "right-4"}`}>
                  EGP
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">
                {isAr ? "طريقة الدفع" : "Payment Method"} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full appearance-none rounded-2xl border border-gray-200 bg-[#FBFBF9] px-4 py-3 text-xs font-semibold text-gray-800 focus:border-[#414E36] focus:outline-none focus:ring-1 focus:ring-[#414E36] transition-all"
                >
                  <option value="cash">{isAr ? "نقدي (Cash)" : "Cash"}</option>
                  <option value="card">{isAr ? "بطاقة بنكية (Visa / Card)" : "Card (Visa / Mastercard)"}</option>
                  <option value="instapay">Instapay</option>
                  <option value="vodafone_cash">Vodafone Cash</option>
                  <option value="bank_transfer">{isAr ? "تحويل بنكي" : "Bank Transfer"}</option>
                  <option value="wallet">{isAr ? "رصيد المحفظة" : "Wallet Balance"}</option>
                  <option value="online_payment">{isAr ? "دفع أونلاين" : "Online Payment"}</option>
                  <option value="other">{isAr ? "أخرى" : "Other"}</option>
                </select>
                <ChevronDown size={15} className={`pointer-events-none absolute top-3.5 text-gray-400 ${isAr ? "left-3.5" : "right-3.5"}`} />
              </div>
            </div>
          </div>

          {/* Reference & Description */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <label className="block text-xs font-bold text-gray-700">
                  {isAr ? "المرجع (حجز / فاتورة / إيصال)" : "Reference (Booking / Invoice / Receipt)"}
                </label>
                <div
                  className="cursor-pointer text-gray-400 hover:text-gray-600"
                  title={isAr ? "أدخل رقم مرجعي مثل كود الحجز أو رقم الإيصال للتتبع" : "Enter a reference number such as booking ID or invoice receipt"}
                >
                  <HelpCircle size={13} />
                </div>
              </div>
              <input
                type="text"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder={isAr ? "مثال: REC-10023 أو INV-002048" : "e.g. REC-10023 or INV-002048"}
                className="w-full rounded-2xl border border-gray-200 bg-[#FBFBF9] px-4 py-3 text-xs font-semibold text-gray-800 placeholder-gray-400 focus:border-[#414E36] focus:outline-none focus:ring-1 focus:ring-[#414E36] transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-gray-700">
                  {isAr ? "الوصف" : "Description"} {transactionType === "service_charge" ? <span className="text-rose-500">*</span> : (isAr ? "(اختياري)" : "(Optional)")}
                </label>
                <span className="text-[10px] text-gray-400">{description.length} / 250</span>
              </div>
              <textarea
                value={description}
                maxLength={250}
                rows={2}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  transactionType === "service_charge"
                    ? (isAr ? "أدخل وصف رسوم الخدمة (مطلوب)..." : "Enter service charge description (required)...")
                    : (isAr ? "أضف وصفاً لهذه المعاملة..." : "Add a description for this transaction...")
                }
                className="w-full rounded-2xl border border-gray-200 bg-[#FBFBF9] p-3 text-xs font-medium text-gray-800 placeholder-gray-400 focus:border-[#414E36] focus:outline-none focus:ring-1 focus:ring-[#414E36] transition-all resize-none"
              />
            </div>
          </div>

          {/* Transaction Date & Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">
                {isAr ? "تاريخ المعاملة" : "Transaction Date"} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={txnDate}
                  onChange={(e) => setTxnDate(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-[#FBFBF9] px-4 py-3 text-xs font-semibold text-gray-800 focus:border-[#414E36] focus:outline-none focus:ring-1 focus:ring-[#414E36] transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">
                {isAr ? "وقت المعاملة" : "Transaction Time"} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={txnTime}
                  onChange={(e) => setTxnTime(e.target.value)}
                  placeholder="11:59 AM"
                  className="w-full rounded-2xl border border-gray-200 bg-[#FBFBF9] px-4 py-3 text-xs font-semibold text-gray-800 focus:border-[#414E36] focus:outline-none focus:ring-1 focus:ring-[#414E36] transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Transaction Summary & System Generated Metadata */}
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
            <div className="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <Info size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1F251A]">
                {isAr ? "ملخص المعاملة وبيانات النظام" : "Transaction Summary & System Metadata"}
              </h3>
              <p className="text-xs text-gray-500">
                {isAr
                  ? "مراجعة التفاصيل وبيانات التتبع التي سيولدها النظام تلقائياً."
                  : "Review the transaction details and system-generated audit metadata."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Metadata Table */}
            <div className="md:col-span-2 rounded-2xl bg-[#F9F9F7] p-4 border border-gray-100 grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
              <div>
                <span className="text-gray-400 font-bold uppercase text-[10px] block">
                  {isAr ? "معرف المعاملة" : "Transaction ID"}
                </span>
                <span className="font-mono font-bold text-gray-700">Auto (TXN-XXXXXX)</span>
              </div>

              <div>
                <span className="text-gray-400 font-bold uppercase text-[10px] block">
                  {isAr ? "نوع المعاملة" : "Transaction Type"}
                </span>
                <span className="font-bold text-gray-800 capitalize">
                  {MANUAL_TRANSACTION_TYPES.find((t) => t.id === transactionType)?.[isAr ? "labelAr" : "labelEn"]}
                </span>
              </div>

              <div>
                <span className="text-gray-400 font-bold uppercase text-[10px] block">
                  {isAr ? "المصدر" : "Source"}
                </span>
                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {isAr ? "يدوي (Manual)" : "Manual"}
                </span>
              </div>

              <div>
                <span className="text-gray-400 font-bold uppercase text-[10px] block">
                  {isAr ? "الحالة (يحددها النظام)" : "Status (System-set)"}
                </span>
                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  transactionType === "refund"
                    ? "bg-purple-50 text-purple-800 border border-purple-200"
                    : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                }`}>
                  {transactionType === "refund" ? (isAr ? "مسترد (Refunded)" : "Refunded") : (isAr ? "مكتمل (Completed)" : "Completed")}
                </span>
              </div>

              <div>
                <span className="text-gray-400 font-bold uppercase text-[10px] block">
                  {isAr ? "أنشئت بواسطة" : "Created By"}
                </span>
                <span className="font-bold text-gray-800">{staffName}</span>
              </div>

              <div>
                <span className="text-gray-400 font-bold uppercase text-[10px] block">
                  {isAr ? "تاريخ ووقت الإنشاء" : "Created Date & Time"}
                </span>
                <span className="font-semibold text-gray-700">{txnDate}, {txnTime}</span>
              </div>
            </div>

            {/* Note Box */}
            <div className="rounded-2xl bg-[#F7F9F6] p-4 border border-emerald-100 text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                <Info size={14} />
                <span>{isAr ? "إرشادات هامة" : "Important Note"}</span>
              </div>
              <ul className="space-y-1 text-[11px] text-gray-600 list-disc ps-4 leading-relaxed">
                <li>{isAr ? "يتم تعيين الحالة ومعرف المعاملة آلياً بواسطة النظام." : "Status & Transaction ID are assigned automatically."}</li>
                <li>{isAr ? "تسجيل المبيعات والاستردادات يحدث أثراً مباشراً في السجل المالي للمريض." : "Purchases and refunds immediately update the patient financial ledger."}</li>
                <li>{isAr ? "المدفوعات المباشرة تُسجل آلياً عند تأكيد الحجوزات أو تسويتها." : "Direct booking payments are automatically recorded via the booking flow."}</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-2.5 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs transition-colors shadow-2xs"
          >
            {isAr ? "إلغاء" : "Cancel"}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 rounded-2xl bg-[#313A28] hover:bg-[#1F251A] text-[#FBFBF9] font-bold text-xs flex items-center gap-2 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>{isAr ? "جاري الحفظ..." : "Saving Transaction..."}</span>
              </>
            ) : (
              <>
                <Wallet size={14} />
                <span>{isAr ? "تسجيل المعاملة" : "Create Transaction"}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
