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
  FileText
} from "lucide-react";
import {
  TransactionType,
  PaymentMethod,
  NewManualTransactionInput,
  TransactionItem
} from "./types";
import { getAuthHeaders } from "@/lib/authHeaders";

/**
 * Combines the date and time the user actually picked into an ISO timestamp.
 *
 * Built as a *local* Date (no trailing `Z`) then converted, so the moment stored is the one the
 * staff member meant in clinic time rather than being reinterpreted as UTC. An earlier version
 * hardcoded `T12:00:00.000Z` and silently discarded the time field entirely, while the form's own
 * confirmation line still echoed the picked time back to the user (RISK-076).
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

/** Shape returned by `GET /api/customers` — raw `customers` rows (`mobile`, `outstanding`). */
interface CustomerOption {
  id: string;
  name: string;
  mobile?: string;
  wallet_balance?: number;
  outstanding?: number;
  spent_amount?: number;
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
  // Form State
  const [transactionType, setTransactionType] = useState<TransactionType>("payment");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(preSelectedCustomerId || "");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [patientSearch, setPatientSearch] = useState<string>(preSelectedCustomerName || "");
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  const [amount, setAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [branchId, setBranchId] = useState<string>(branches[0]?.id || "");
  const [referenceNo, setReferenceNo] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [adjustmentDirection, setAdjustmentDirection] = useState<"increase" | "decrease">("increase");
  
  // Date & Time states
  const now = new Date();
  const defaultDate = now.toISOString().split("T")[0];
  const defaultHours = String(now.getHours() % 12 || 12).padStart(2, "0");
  const defaultMinutes = String(now.getMinutes()).padStart(2, "0");
  const defaultPeriod = now.getHours() >= 12 ? "PM" : "AM";

  const [txnDate, setTxnDate] = useState<string>(defaultDate);
  const [txnTime, setTxnTime] = useState<string>(`${defaultHours}:${defaultMinutes} ${defaultPeriod}`);

  // Original Transactions for Refund selection
  const [completedTxns, setCompletedTxns] = useState<TransactionItem[]>([]);
  const [selectedOriginalTxnId, setSelectedOriginalTxnId] = useState<string>("");
  const [loadingOriginalTxns, setLoadingOriginalTxns] = useState(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
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
        // GET /api/customers returns a bare array of customer rows, not { customers: [...] }.
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

  // Fetch patient completed transactions for refund
  useEffect(() => {
    if (transactionType === "refund" && selectedCustomerId) {
      const fetchPatientTxns = async () => {
        try {
          setLoadingOriginalTxns(true);
          const headers = await getAuthHeaders();
          const res = await fetch(`/api/transactions?customerId=${selectedCustomerId}&limit=20`, { headers });
          const data = await res.json();
          if (data.transactions) {
            const eligible = data.transactions.filter(
              (t: TransactionItem) => t.status === "completed" && Number(t.amount) > 0
            );
            setCompletedTxns(eligible);
            if (eligible.length > 0) {
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

  // Selected Original Transaction
  const selectedOriginalTxn = useMemo(() => {
    return completedTxns.find((t) => t.id === selectedOriginalTxnId) || null;
  }, [completedTxns, selectedOriginalTxnId]);

  // Dynamic Balance Calculations
  const numericAmount = Math.max(0, parseFloat(amount) || 0);
  const currentWalletBalance = Number(selectedCustomer?.wallet_balance || 0);
  const currentOutstanding = Number(selectedCustomer?.outstanding || 0);

  const projectedWalletBalance = useMemo(() => {
    if (transactionType === "wallet_topup") {
      return currentWalletBalance + numericAmount;
    }
    if (transactionType === "wallet_deduction") {
      return Math.max(0, currentWalletBalance - numericAmount);
    }
    return currentWalletBalance;
  }, [transactionType, currentWalletBalance, numericAmount]);

  const handleSelectCustomer = (cust: CustomerOption) => {
    setSelectedCustomer(cust);
    setSelectedCustomerId(cust.id);
    setPatientSearch(cust.name);
    setShowCustomerDropdown(false);
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validations
    if (!selectedCustomerId) {
      setErrorMsg("Please select a patient for this transaction.");
      return;
    }

    if (numericAmount <= 0) {
      setErrorMsg("Please enter a valid amount greater than 0 EGP.");
      return;
    }

    if (transactionType === "outstanding_payment" && numericAmount > currentOutstanding) {
      setErrorMsg(`Amount exceeds the patient's outstanding balance of EGP ${currentOutstanding.toLocaleString()}.`);
      return;
    }

    if (transactionType === "wallet_deduction" && numericAmount > currentWalletBalance) {
      setErrorMsg(`Insufficient wallet balance. Available: EGP ${currentWalletBalance.toLocaleString()}.`);
      return;
    }

    if (transactionType === "refund") {
      if (!reason.trim()) {
        setErrorMsg("A reason is required for refunds.");
        return;
      }
      if (selectedOriginalTxn) {
        const origAmt = Number(selectedOriginalTxn.amount);
        if (numericAmount > origAmt) {
          setErrorMsg(`Refund amount cannot exceed the original payment of EGP ${origAmt.toLocaleString()}.`);
          return;
        }
      }
    }

    if (transactionType === "adjustment" && !description.trim() && !reason.trim()) {
      setErrorMsg("A description explaining the adjustment is required.");
      return;
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
        related_transaction_id: selectedOriginalTxnId || undefined,
        description: description || undefined,
        reason: reason || undefined,
        adjustment_direction: adjustmentDirection,
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
        setErrorMsg(data.error || "Transaction could not be created. Please try again.");
        return;
      }

      setSuccessMsg("Transaction created successfully!");
      setTimeout(() => {
        onSuccess();
      }, 800);
    } catch (err: any) {
      console.error("Create transaction error:", err);
      setErrorMsg("An unexpected error occurred while creating the transaction.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* Top Navigation & Title */}
      <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
        <button
          type="button"
          onClick={onBack}
          className="h-10 w-10 rounded-2xl bg-white border border-gray-200 hover:bg-gray-50 flex items-center justify-center text-gray-700 transition-colors shadow-2xs"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-[#1F251A]">
            New Manual Transaction
          </h2>
          <p className="text-xs text-gray-500">
            Create a manual financial transaction
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
                Transaction Information
              </h3>
              <p className="text-xs text-gray-500">
                Record a manual financial transaction.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Transaction Type Dropdown */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">
                Transaction Type <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={transactionType}
                  onChange={(e) => {
                    setTransactionType(e.target.value as TransactionType);
                    setErrorMsg(null);
                  }}
                  className="w-full appearance-none rounded-2xl border border-gray-200 bg-[#FBFBF9] px-4 py-3 text-xs font-semibold text-gray-800 focus:border-[#414E36] focus:outline-none focus:ring-1 focus:ring-[#414E36] transition-all"
                >
                  <option value="payment">Payment</option>
                  <option value="outstanding_payment">Outstanding Payment</option>
                  <option value="refund">Refund</option>
                  <option value="wallet_topup">Wallet Deposit (Top-up)</option>
                  <option value="wallet_deduction">Wallet Withdrawal</option>
                  <option value="adjustment">Adjustment</option>
                  <option value="service_charge">Service Charge</option>
                  <option value="product_purchase">Product Purchase</option>
                </select>
                <ChevronDown size={15} className="pointer-events-none absolute right-3.5 top-3.5 text-gray-400" />
              </div>
            </div>

            {/* Patient Search & Autocomplete */}
            <div className="space-y-1.5 relative" ref={dropdownRef}>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-gray-700">
                  Patient <span className="text-rose-500">*</span>
                </label>
                {onAddNewPatient && (
                  <button
                    type="button"
                    onClick={onAddNewPatient}
                    className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1"
                  >
                    <Plus size={12} />
                    Add New Patient
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
                  placeholder="Search patient by name or phone..."
                  className="w-full rounded-2xl border border-gray-200 bg-[#FBFBF9] px-4 py-3 pe-10 text-xs font-semibold text-gray-800 placeholder-gray-400 focus:border-[#414E36] focus:outline-none focus:ring-1 focus:ring-[#414E36] transition-all"
                />
                <div className="absolute right-3.5 top-3.5 text-gray-400">
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
                        <div className="text-emerald-700 font-semibold">Wallet: EGP {(c.wallet_balance || 0).toLocaleString()}</div>
                        {Number(c.outstanding || 0) > 0 && (
                          <div className="text-rose-600 font-semibold">Due: EGP {(c.outstanding || 0).toLocaleString()}</div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Dynamic Calculation Cards based on Transaction Type ── */}
          {selectedCustomer && (
            <div className="rounded-2xl bg-[#F7F9F6] p-4 border border-emerald-100 text-xs space-y-2 animate-in fade-in">
              {transactionType === "outstanding_payment" && (
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-600">Patient Outstanding Balance:</span>
                  <span className="text-sm font-black text-rose-600">
                    EGP {currentOutstanding.toLocaleString()}
                  </span>
                </div>
              )}

              {transactionType === "wallet_topup" && (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-xl bg-white border border-gray-100">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Current Balance</span>
                    <span className="font-bold text-gray-700">EGP {currentWalletBalance.toLocaleString()}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-gray-100">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Deposit Amount</span>
                    <span className="font-bold text-emerald-600">+ EGP {numericAmount.toLocaleString()}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200">
                    <span className="text-[10px] text-emerald-800 font-bold uppercase block">New Wallet Balance</span>
                    <span className="font-extrabold text-emerald-700">EGP {projectedWalletBalance.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {transactionType === "wallet_deduction" && (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-xl bg-white border border-gray-100">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Current Balance</span>
                    <span className="font-bold text-gray-700">EGP {currentWalletBalance.toLocaleString()}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-gray-100">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Withdrawal</span>
                    <span className="font-bold text-rose-600">- EGP {numericAmount.toLocaleString()}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-purple-50 border border-purple-200">
                    <span className="text-[10px] text-purple-800 font-bold uppercase block">New Wallet Balance</span>
                    <span className="font-extrabold text-purple-700">EGP {projectedWalletBalance.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {transactionType === "refund" && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">
                      Original Transaction <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={selectedOriginalTxnId}
                      onChange={(e) => setSelectedOriginalTxnId(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-800"
                    >
                      {completedTxns.length === 0 ? (
                        <option value="">No completed payments found for this patient</option>
                      ) : (
                        completedTxns.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.transaction_id} — {t.description} (EGP {Number(t.amount).toLocaleString()})
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  {selectedOriginalTxn && (
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-gray-500">Original Amount: <strong>EGP {Number(selectedOriginalTxn.amount).toLocaleString()}</strong></span>
                      <span className="text-emerald-700 font-bold">Refundable Amount: EGP {Number(selectedOriginalTxn.amount).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Amount and Payment Method */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">
                Amount <span className="text-rose-500">*</span>
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
                <span className="pointer-events-none absolute right-4 top-3 text-xs font-extrabold text-gray-400">
                  EGP
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">
                Payment Method <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full appearance-none rounded-2xl border border-gray-200 bg-[#FBFBF9] px-4 py-3 text-xs font-semibold text-gray-800 focus:border-[#414E36] focus:outline-none focus:ring-1 focus:ring-[#414E36] transition-all"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card (Visa / Mastercard)</option>
                  <option value="instapay">Instapay</option>
                  <option value="vodafone_cash">Vodafone Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="wallet">Wallet Balance</option>
                  <option value="online_payment">Online Payment</option>
                  <option value="other">Other</option>
                </select>
                <ChevronDown size={15} className="pointer-events-none absolute right-3.5 top-3.5 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Reference & Description */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">
                Reference (Booking / Invoice / Receipt)
              </label>
              <input
                type="text"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="e.g. REC-10023 or INV-002048"
                className="w-full rounded-2xl border border-gray-200 bg-[#FBFBF9] px-4 py-3 text-xs font-semibold text-gray-800 placeholder-gray-400 focus:border-[#414E36] focus:outline-none focus:ring-1 focus:ring-[#414E36] transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-gray-700">
                  Description {transactionType === "adjustment" ? <span className="text-rose-500">*</span> : "(Optional)"}
                </label>
                <span className="text-[10px] text-gray-400">{description.length} / 250</span>
              </div>
              <textarea
                value={description}
                maxLength={250}
                rows={2}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description for this transaction..."
                className="w-full rounded-2xl border border-gray-200 bg-[#FBFBF9] p-3 text-xs font-medium text-gray-800 placeholder-gray-400 focus:border-[#414E36] focus:outline-none focus:ring-1 focus:ring-[#414E36] transition-all resize-none"
              />
            </div>
          </div>

          {/* Transaction Date & Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">
                Transaction Date <span className="text-rose-500">*</span>
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
                Transaction Time <span className="text-rose-500">*</span>
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

        {/* Card 2: Transaction Summary */}
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
            <div className="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <Info size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1F251A]">
                Transaction Summary
              </h3>
              <p className="text-xs text-gray-500">
                Review the transaction details before saving.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Metadata Table */}
            <div className="md:col-span-2 rounded-2xl bg-[#F9F9F7] p-4 border border-gray-100 grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
              <div>
                <span className="text-gray-400 font-bold uppercase text-[10px] block">Transaction Type</span>
                <span className="font-bold text-gray-800 capitalize">{transactionType.replace(/_/g, " ")}</span>
              </div>

              <div>
                <span className="text-gray-400 font-bold uppercase text-[10px] block">Status (System will set)</span>
                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  {transactionType === "refund" ? "Refunded" : "Completed"}
                </span>
              </div>

              <div>
                <span className="text-gray-400 font-bold uppercase text-[10px] block">Action</span>
                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Manual
                </span>
              </div>

              <div>
                <span className="text-gray-400 font-bold uppercase text-[10px] block">Created By</span>
                <span className="font-bold text-gray-800">{staffName}</span>
              </div>

              <div>
                <span className="text-gray-400 font-bold uppercase text-[10px] block">Source</span>
                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Manual
                </span>
              </div>

              <div>
                <span className="text-gray-400 font-bold uppercase text-[10px] block">Created Date & Time</span>
                <span className="font-semibold text-gray-700">{txnDate}, {txnTime}</span>
              </div>
            </div>

            {/* Note Box */}
            <div className="rounded-2xl bg-[#F7F9F6] p-4 border border-emerald-100 text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                <Info size={14} />
                <span>Note</span>
              </div>
              <ul className="space-y-1 text-[11px] text-gray-600 list-disc ps-4 leading-relaxed">
                <li>Status is set automatically by the system.</li>
                <li>You can only create manual transactions here.</li>
                <li>Automatic transactions are created by the system based on events.</li>
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
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 rounded-2xl bg-[#313A28] hover:bg-[#1F251A] text-[#FBFBF9] font-bold text-xs flex items-center gap-2 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Saving Transaction...</span>
              </>
            ) : (
              <>
                <Wallet size={14} />
                <span>Create Transaction</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
