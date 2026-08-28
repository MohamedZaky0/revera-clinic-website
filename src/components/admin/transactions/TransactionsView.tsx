"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Wallet,
  FileText,
  CreditCard,
  Plus,
  Search,
  Filter,
  Download,
  MoreVertical,
  Calendar,
  Clock,
  ArrowUpDown,
  RotateCcw,
  Sliders,
  Printer,
  Eye,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Building2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RefreshCw,
  Coins
} from "lucide-react";
import {
  TransactionItem,
  TransactionStats,
  TransactionFilterState,
  TransactionType,
  PaymentMethod,
  TransactionStatus
} from "./types";
import { getAuthHeaders } from "@/lib/authHeaders";
import { TransactionDetailsModal } from "./TransactionDetailsModal";
import { TransactionAuditLogsModal } from "./TransactionAuditLogsModal";

interface TransactionsViewProps {
  onNewTransaction: () => void;
  staffName?: string;
  branches?: { id: string; name_en: string; name_ar?: string }[];
  currentBranchId?: string;
  lang?: "en" | "ar";
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  onNewTransaction,
  staffName = "Staff User",
  branches = [],
  currentBranchId,
  lang = "en",
}) => {
  // Filters & Pagination State
  const [filters, setFilters] = useState<TransactionFilterState>({
    search: "",
    dateRange: "all",
    type: "all",
    paymentMethod: "all",
    status: "all",
    branchId: currentBranchId || "all",
    amountRange: "all",
    sortBy: "date",
    sortOrder: "desc",
    page: 1,
    limit: 10,
  });

  const [showFilterDrawer, setShowFilterDrawer] = useState(true);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState(true);

  // Overview Stats
  // Zeroed until the real figures load — never seeded with placeholder numbers, which previously
  // meant the cards showed convincing-but-fabricated totals whenever the fetch failed (RISK-076).
  const [stats, setStats] = useState<TransactionStats>({
    todayNetPayments: 0,
    todayPaymentsCount: 0,
    totalOutstanding: 0,
    outstandingCount: 0,
    totalWalletBalance: 0,
    activeWalletCount: 0,
  });

  // Modals state
  const [selectedTxnForDetails, setSelectedTxnForDetails] = useState<TransactionItem | null>(null);
  const [showAuditLogsModal, setShowAuditLogsModal] = useState(false);
  const [activeDropdownTxnId, setActiveDropdownTxnId] = useState<string | null>(null);

  // Close 3-dots dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = () => setActiveDropdownTxnId(null);
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  // Fetch Transactions and Stats
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.search) params.set("search", filters.search);
      if (filters.dateRange !== "all") params.set("dateRange", filters.dateRange);
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);
      if (filters.type !== "all") params.set("type", filters.type);
      if (filters.paymentMethod !== "all") params.set("paymentMethod", filters.paymentMethod);
      if (filters.status !== "all") params.set("status", filters.status);
      if (filters.branchId !== "all") params.set("branchId", filters.branchId);
      if (filters.amountRange !== "all") params.set("amountRange", filters.amountRange);
      params.set("sortBy", filters.sortBy);
      params.set("sortOrder", filters.sortOrder);
      params.set("page", String(filters.page));
      params.set("limit", String(filters.limit));

      const headers = await getAuthHeaders();
      const res = await fetch(`/api/transactions?${params.toString()}`, { headers });
      const data = await res.json();
      if (data.transactions) {
        setTransactions(data.transactions);
        setTotalCount(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Error fetching transactions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [filters]);

  const handleClearFilters = () => {
    setFilters({
      search: "",
      dateRange: "all",
      type: "all",
      paymentMethod: "all",
      status: "all",
      branchId: "all",
      amountRange: "all",
      sortBy: "date",
      sortOrder: "desc",
      page: 1,
      limit: 10,
    });
  };

  const toggleSortOrder = () => {
    setFilters((prev) => ({
      ...prev,
      sortOrder: prev.sortOrder === "asc" ? "desc" : "asc",
      page: 1,
    }));
  };

  const handleExportCSV = () => {
    if (transactions.length === 0) return;
    const headers = ["Transaction ID", "Date", "Patient", "Phone", "Type", "Description", "Payment Method", "Amount", "Status", "Source"];
    const rows = transactions.map((t) => [
      t.transaction_id,
      new Date(t.occurred_at).toLocaleDateString(),
      t.customer?.name || "General",
      t.customer?.phone || "",
      t.type,
      t.description,
      t.payment_method,
      t.amount,
      t.status,
      t.source || "manual",
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `clinic_transactions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Badge Color Resolvers
  const getTypeBadge = (type: TransactionType) => {
    switch (type) {
      case "payment":
        return "bg-emerald-50 text-emerald-700 border border-emerald-200/60";
      case "wallet_topup":
        return "bg-sky-50 text-sky-700 border border-sky-200/60";
      case "outstanding_payment":
        return "bg-amber-50 text-amber-700 border border-amber-200/60";
      case "refund":
        return "bg-rose-50 text-rose-700 border border-rose-200/60";
      case "service_charge":
        return "bg-indigo-50 text-indigo-700 border border-indigo-200/60";
      case "wallet_deduction":
        return "bg-purple-50 text-purple-700 border border-purple-200/60";
      case "product_purchase":
        return "bg-teal-50 text-teal-700 border border-teal-200/60";
      case "adjustment":
        return "bg-slate-50 text-slate-700 border border-slate-200/60";
      default:
        return "bg-gray-50 text-gray-700 border border-gray-200/60";
    }
  };

  const getStatusBadge = (status: TransactionStatus) => {
    switch (status) {
      case "completed":
        return "bg-emerald-50 text-emerald-700 border border-emerald-200";
      case "pending":
        return "bg-amber-50 text-amber-700 border border-amber-200";
      case "outstanding":
        return "bg-orange-50 text-orange-700 border border-orange-200";
      case "refunded":
        return "bg-purple-50 text-purple-700 border border-purple-200";
      case "failed":
        return "bg-rose-50 text-rose-700 border border-rose-200";
      default:
        return "bg-gray-50 text-gray-700 border border-gray-200";
    }
  };

  const formatPaymentMethod = (method: PaymentMethod) => {
    switch (method) {
      case "cash":
        return (
          <span className="flex items-center gap-1.5 font-medium text-gray-700">
            <Wallet size={13} className="text-gray-500" /> Cash
          </span>
        );
      case "instapay":
        return (
          <span className="flex items-center gap-1.5 font-medium text-[#7D3C98]">
            <span className="text-[10px] font-black italic tracking-tighter">instapay</span> Instapay
          </span>
        );
      case "vodafone_cash":
        return (
          <span className="flex items-center gap-1.5 font-medium text-red-600">
            <span className="h-2.5 w-2.5 rounded-full bg-red-600 inline-block" /> Vodafone Cash
          </span>
        );
      case "card":
        return (
          <span className="flex items-center gap-1.5 font-bold text-blue-700">
            <span className="font-serif italic font-black text-xs">VISA</span> Visa
          </span>
        );
      case "wallet":
        return (
          <span className="flex items-center gap-1.5 font-medium text-purple-700">
            <Coins size={13} /> Wallet
          </span>
        );
      case "none":
        return <span className="text-gray-400 font-bold">—</span>;
      default:
        return <span className="capitalize text-gray-600 font-medium">{method.replace(/_/g, " ")}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1F251A]">
            Transactions
          </h2>
          <p className="text-xs text-gray-500">
            Track and manage all clinic financial transactions
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onNewTransaction}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#313A28] hover:bg-[#1F251A] text-[#FBFBF9] font-bold text-xs shadow-sm transition-all"
          >
            <Plus size={15} />
            <span>New Transaction</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAuditLogsModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs shadow-2xs transition-colors"
          >
            <ShieldCheck size={15} className="text-gray-500" />
            <span>Audit Logs</span>
          </button>
        </div>
      </div>

      {/* ── Quick Overview Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Today's Payments */}
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow">
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
            <Wallet size={24} />
          </div>
          <div className="space-y-1">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
              Today's Payments
            </span>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">
              EGP {stats.todayNetPayments.toLocaleString()}
            </div>
            <p className="text-xs text-gray-400 font-medium">
              {stats.todayPaymentsCount} transactions
            </p>
            {stats.todayEstimatedTotal !== undefined && stats.todayEstimatedTotal > 0 && (
              <p className="text-[11px] font-semibold text-gray-500">
                Estimated today:{" "}
                <span className="text-gray-700">EGP {stats.todayEstimatedTotal.toLocaleString()}</span>
                <span className="font-normal text-gray-400"> charged</span>
              </p>
            )}
          </div>
        </div>

        {/* Card 2: Outstanding */}
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow">
          <div className="h-12 w-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold shrink-0">
            <FileText size={24} />
          </div>
          <div className="space-y-1">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
              Outstanding
            </span>
            <div className="text-2xl sm:text-3xl font-black text-rose-600 tracking-tight">
              EGP {stats.totalOutstanding.toLocaleString()}
            </div>
            <p className="text-xs text-gray-400 font-medium">
              {stats.outstandingCount} patients
            </p>
          </div>
        </div>

        {/* Card 3: Wallet Balance */}
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow">
          <div className="h-12 w-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold shrink-0">
            <Coins size={24} />
          </div>
          <div className="space-y-1">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
              Wallet Balance
            </span>
            <div className="text-2xl sm:text-3xl font-black text-sky-600 tracking-tight">
              EGP {stats.totalWalletBalance.toLocaleString()}
            </div>
            <p className="text-xs text-gray-400 font-medium">
              {stats.activeWalletCount} patients
            </p>
          </div>
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value, page: 1 }))}
              placeholder="Search patient, transaction or invoice..."
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 pe-10 text-xs font-medium text-gray-800 placeholder-gray-400 focus:border-[#414E36] focus:outline-none focus:ring-1 focus:ring-[#414E36] transition-all shadow-2xs"
            />
            <div className="absolute right-3.5 top-3 text-gray-400">
              <Search size={15} />
            </div>
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFilterDrawer(!showFilterDrawer)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                showFilterDrawer
                  ? "bg-[#313A28]/10 text-[#313A28] border-[#313A28]/20"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 shadow-2xs"
              }`}
            >
              <Filter size={14} />
              <span>Filters</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs shadow-2xs transition-colors"
            >
              <Download size={14} />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Filter Dropdowns Row */}
        {showFilterDrawer && (
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-xs space-y-3 animate-in fade-in duration-150">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
              {/* Date Filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Date</label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => setFilters((prev) => ({ ...prev, dateRange: e.target.value as any, page: 1 }))}
                  className="w-full rounded-xl border border-gray-200 bg-[#FBFBF9] px-3 py-2 text-xs font-semibold text-gray-800"
                >
                  <option value="all">All Dates</option>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">This Month</option>
                </select>
              </div>

              {/* Transaction Type Filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Transaction Type</label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value as any, page: 1 }))}
                  className="w-full rounded-xl border border-gray-200 bg-[#FBFBF9] px-3 py-2 text-xs font-semibold text-gray-800"
                >
                  <option value="all">All Types</option>
                  <option value="payment">Payment</option>
                  <option value="outstanding_payment">Outstanding Payment</option>
                  <option value="wallet_topup">Wallet Top-up</option>
                  <option value="wallet_deduction">Wallet Deduction</option>
                  <option value="service_charge">Service Charge</option>
                  <option value="product_purchase">Product Purchase</option>
                  <option value="refund">Refund</option>
                  <option value="adjustment">Adjustment</option>
                </select>
              </div>

              {/* Payment Method Filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Payment Method</label>
                <select
                  value={filters.paymentMethod}
                  onChange={(e) => setFilters((prev) => ({ ...prev, paymentMethod: e.target.value as any, page: 1 }))}
                  className="w-full rounded-xl border border-gray-200 bg-[#FBFBF9] px-3 py-2 text-xs font-semibold text-gray-800"
                >
                  <option value="all">All Methods</option>
                  <option value="cash">Cash</option>
                  <option value="card">Visa / Card</option>
                  <option value="instapay">Instapay</option>
                  <option value="vodafone_cash">Vodafone Cash</option>
                  <option value="wallet">Wallet</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value as any, page: 1 }))}
                  className="w-full rounded-xl border border-gray-200 bg-[#FBFBF9] px-3 py-2 text-xs font-semibold text-gray-800"
                >
                  <option value="all">All Statuses</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="outstanding">Outstanding</option>
                  <option value="refunded">Refunded</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              {/* Branch Filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Branch</label>
                <select
                  value={filters.branchId}
                  onChange={(e) => setFilters((prev) => ({ ...prev, branchId: e.target.value, page: 1 }))}
                  className="w-full rounded-xl border border-gray-200 bg-[#FBFBF9] px-3 py-2 text-xs font-semibold text-gray-800"
                >
                  <option value="all">All Branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name_en}</option>
                  ))}
                </select>
              </div>

              {/* Amount Range Filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Amount</label>
                <select
                  value={filters.amountRange}
                  onChange={(e) => setFilters((prev) => ({ ...prev, amountRange: e.target.value as any, page: 1 }))}
                  className="w-full rounded-xl border border-gray-200 bg-[#FBFBF9] px-3 py-2 text-xs font-semibold text-gray-800"
                >
                  <option value="all">All Amounts</option>
                  <option value="under500">Under 500 EGP</option>
                  <option value="500_1000">500 - 1,000 EGP</option>
                  <option value="1000_5000">1,000 - 5,000 EGP</option>
                  <option value="above5000">Above 5,000 EGP</option>
                </select>
              </div>
            </div>

            {/* Clear Filters Row */}
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw size={12} />
                <span>Clear Filters</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Transactions Table ── */}
      <div className="overflow-hidden rounded-3xl border border-[#414E36]/10 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-[#F9F9F7] text-[11px] font-bold uppercase tracking-wider text-gray-500">
                <th className="py-3.5 px-4 text-start">
                  <button
                    type="button"
                    onClick={toggleSortOrder}
                    className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors uppercase font-bold"
                  >
                    <span>Date & Time</span>
                    <ArrowUpDown size={12} />
                  </button>
                </th>
                <th className="py-3.5 px-4 text-start">Patient</th>
                <th className="py-3.5 px-4 text-start">Transaction Type</th>
                <th className="py-3.5 px-4 text-start">Description</th>
                <th className="py-3.5 px-4 text-start">Payment Method</th>
                <th className="py-3.5 px-4 text-start">Amount</th>
                <th className="py-3.5 px-4 text-start">Status</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-gray-400">
                    <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                    <span>Loading transactions...</span>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-gray-400">
                    <AlertCircle className="mx-auto mb-2 text-gray-300" size={32} />
                    <p className="font-bold text-gray-600">No transactions found.</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Try clearing filters or recording a new transaction.</p>
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const patientInitial = (tx.customer?.name || "P").charAt(0).toUpperCase();
                  const isNegative = Number(tx.amount) < 0;
                  const absAmt = Math.abs(Number(tx.amount || 0));
                  const isDropdownOpen = activeDropdownTxnId === tx.id;

                  return (
                    <tr
                      key={tx.id}
                      onClick={() => setSelectedTxnForDetails(tx)}
                      className="hover:bg-[#F9F9F7]/70 transition-colors cursor-pointer"
                    >
                      {/* Date & Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-gray-900">
                          {new Date(tx.occurred_at).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                        <div className="text-[11px] text-gray-400">
                          {new Date(tx.occurred_at).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>

                      {/* Patient */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-[#EAE8E3] text-[#414E36] font-bold text-xs flex items-center justify-center shrink-0">
                            {patientInitial}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900">
                              {tx.customer?.name || "Clinic General Patient"}
                            </div>
                            <div className="text-[11px] text-gray-400">
                              {tx.customer?.phone || "—"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Transaction Type */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold capitalize ${getTypeBadge(tx.type)}`}>
                          {tx.type.replace(/_/g, " ")}
                        </span>
                      </td>

                      {/* Description */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-gray-900 line-clamp-1">
                          {tx.description}
                        </div>
                        {tx.reference_no && (
                          <div className="text-[10px] text-gray-400 font-mono">
                            Ref: {tx.reference_no}
                          </div>
                        )}
                      </td>

                      {/* Payment Method */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {formatPaymentMethod(tx.payment_method)}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`font-extrabold ${isNegative ? "text-rose-600" : "text-emerald-700"}`}>
                          {isNegative ? `- EGP ${absAmt.toLocaleString()}` : Number(tx.amount) > 0 ? `+ EGP ${absAmt.toLocaleString()}` : `EGP ${absAmt.toLocaleString()}`}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize ${getStatusBadge(tx.status)}`}>
                          {tx.status}
                        </span>
                      </td>

                      {/* Action Menu */}
                      <td
                        className="py-3.5 px-4 text-center relative whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropdownTxnId(isDropdownOpen ? null : tx.id);
                          }}
                          className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                        >
                          <MoreVertical size={16} />
                        </button>

                        {/* 3-Dots Dropdown */}
                        {isDropdownOpen && (
                          <div className="absolute right-4 top-10 z-30 w-44 rounded-2xl border border-gray-200 bg-white p-1.5 shadow-xl text-xs text-start animate-in fade-in duration-100">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTxnForDetails(tx);
                                setActiveDropdownTxnId(null);
                              }}
                              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-gray-700 hover:bg-[#F9F9F7] font-semibold"
                            >
                              <Eye size={14} className="text-gray-500" />
                              <span>View Details</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTxnForDetails(tx);
                                setActiveDropdownTxnId(null);
                              }}
                              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-gray-700 hover:bg-[#F9F9F7] font-semibold"
                            >
                              <Printer size={14} className="text-gray-500" />
                              <span>Print Receipt</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Table Footer & Pagination ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-100 bg-[#F9F9F7] p-4 text-xs font-semibold text-gray-500">
          <div>
            Showing {transactions.length === 0 ? 0 : (filters.page - 1) * filters.limit + 1} to{" "}
            {Math.min(filters.page * filters.limit, totalCount)} of {totalCount} transactions
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={filters.page <= 1}
              onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
              className="h-8 w-8 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .slice(0, 5)
              .map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, page: p }))}
                  className={`h-8 w-8 rounded-xl text-xs font-bold transition-all ${
                    filters.page === p
                      ? "bg-[#313A28] text-white shadow-xs"
                      : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {p}
                </button>
              ))}

            {totalPages > 5 && (
              <>
                <span className="px-1 text-gray-400">...</span>
                <button
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, page: totalPages }))}
                  className={`h-8 w-8 rounded-xl text-xs font-bold transition-all ${
                    filters.page === totalPages
                      ? "bg-[#313A28] text-white shadow-xs"
                      : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {totalPages}
                </button>
              </>
            )}

            <button
              type="button"
              disabled={filters.page >= totalPages}
              onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
              className="h-8 w-8 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Transaction Details Modal ── */}
      {selectedTxnForDetails && (
        <TransactionDetailsModal
          transaction={selectedTxnForDetails}
          onClose={() => setSelectedTxnForDetails(null)}
          onIssueRefund={() => {
            setSelectedTxnForDetails(null);
            onNewTransaction();
          }}
          onAdjustment={() => {
            setSelectedTxnForDetails(null);
            onNewTransaction();
          }}
        />
      )}

      {/* ── Audit Logs Modal ── */}
      {showAuditLogsModal && (
        <TransactionAuditLogsModal onClose={() => setShowAuditLogsModal(false)} />
      )}
    </div>
  );
};
