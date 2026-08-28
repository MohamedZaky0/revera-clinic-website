"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Wallet,
  FileText,
  CreditCard,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Calendar,
  Clock,
  ArrowUpDown,
  Coins,
  Eye,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertCircle
} from "lucide-react";
import {
  TransactionItem,
  TransactionType,
  PaymentMethod,
  TransactionStatus
} from "../transactions/types";
import { TransactionDetailsModal } from "../transactions/TransactionDetailsModal";
import { getAuthHeaders } from "@/lib/authHeaders";

interface PatientTransactionsHistoryTabProps {
  patientId: string;
  patientName: string;
  onAddTransaction: () => void;
  lang?: "en" | "ar";
}

export const PatientTransactionsHistoryTab: React.FC<PatientTransactionsHistoryTabProps> = ({
  patientId,
  patientName,
  onAddTransaction,
  lang = "en",
}) => {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [sortBy, setSortBy] = useState<"date" | "amount">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Summary Metrics
  const [stats, setStats] = useState({
    totalSpent: 0,
    outstanding: 0,
    walletBalance: 0,
  });

  const [selectedTxnForDetails, setSelectedTxnForDetails] = useState<TransactionItem | null>(null);
  const [activeDropdownTxnId, setActiveDropdownTxnId] = useState<string | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = () => setActiveDropdownTxnId(null);
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  const fetchPatientTransactions = async () => {
    if (!patientId) return;
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("customerId", patientId);
      if (search) params.set("search", search);
      if (typeFilter !== "all") params.set("type", typeFilter);
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);
      params.set("page", String(page));
      params.set("limit", String(limit));

      const headers = await getAuthHeaders();
      const res = await fetch(`/api/transactions?${params.toString()}`, { headers });
      const data = await res.json();
      if (data.transactions) {
        setTransactions(data.transactions);
        setTotalCount(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
      if (data.stats) {
        // Real values only — an absent stat means zero, never a placeholder figure (RISK-076).
        setStats({
          totalSpent: data.stats.totalSpent ?? 0,
          outstanding: data.stats.patientOutstanding ?? 0,
          walletBalance: data.stats.patientWalletBalance ?? 0,
        });
      }
    } catch (err) {
      console.error("Error fetching patient transactions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatientTransactions();
  }, [patientId, search, typeFilter, sortBy, sortOrder, page, limit]);

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  // Badge styles
  const getTypeBadge = (type: TransactionType) => {
    switch (type) {
      case "payment":
        return "bg-emerald-50 text-emerald-700 border border-emerald-200/60";
      case "wallet_topup":
        return "bg-purple-50 text-purple-700 border border-purple-200/60";
      case "outstanding_payment":
        return "bg-amber-50 text-amber-700 border border-amber-200/60";
      case "refund":
        return "bg-rose-50 text-rose-700 border border-rose-200/60";
      case "wallet_deduction":
        return "bg-violet-50 text-violet-700 border border-violet-200/60";
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
      case "refunded":
        return "bg-rose-50 text-rose-700 border border-rose-200";
      default:
        return "bg-gray-50 text-gray-700 border border-gray-200";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── 3 Summary Cards matching Screenshot 3 ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* TOTAL SPENT */}
        <div className="rounded-2xl border border-[#414E36]/10 bg-white p-5 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Wallet size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              TOTAL SPENT
            </span>
            <div className="text-2xl font-black text-gray-900 tracking-tight">
              EGP {stats.totalSpent.toLocaleString()}
            </div>
            <p className="text-[11px] text-gray-400">
              Total amount paid by the patient
            </p>
          </div>
        </div>

        {/* OUTSTANDING */}
        <div className="rounded-2xl border border-[#414E36]/10 bg-white p-5 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <FileText size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              OUTSTANDING
            </span>
            <div className="text-2xl font-black text-gray-900 tracking-tight">
              EGP {stats.outstanding.toLocaleString()}
            </div>
            <p className="text-[11px] text-gray-400">
              Current amount owed by patient
            </p>
          </div>
        </div>

        {/* WALLET BALANCE */}
        <div className="rounded-2xl border border-[#414E36]/10 bg-white p-5 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Coins size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              WALLET BALANCE
            </span>
            <div className="text-2xl font-black text-gray-900 tracking-tight">
              EGP {stats.walletBalance.toLocaleString()}
            </div>
            <p className="text-[11px] text-gray-400">
              Available balance in wallet
            </p>
          </div>
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-1 max-w-lg">
          {/* Search bar */}
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search transactions..."
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 pe-9 text-xs font-medium text-gray-800 placeholder-gray-400 focus:border-[#414E36] focus:outline-none focus:ring-1 focus:ring-[#414E36] transition-all shadow-2xs"
            />
            <div className="absolute right-3 top-3 text-gray-400">
              <Search size={14} />
            </div>
          </div>

          {/* Filter dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs shadow-2xs transition-colors"
            >
              <Filter size={13} />
              <span>Filter</span>
            </button>

            {showFilterDropdown && (
              <div className="absolute left-0 top-full mt-1.5 z-20 w-44 rounded-2xl border border-gray-200 bg-white p-1.5 shadow-xl text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setTypeFilter("all");
                    setShowFilterDropdown(false);
                  }}
                  className={`w-full text-start px-3 py-1.5 rounded-xl font-semibold ${typeFilter === "all" ? "bg-emerald-50 text-emerald-800" : "text-gray-700 hover:bg-gray-50"}`}
                >
                  All Types
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTypeFilter("payment");
                    setShowFilterDropdown(false);
                  }}
                  className={`w-full text-start px-3 py-1.5 rounded-xl font-semibold ${typeFilter === "payment" ? "bg-emerald-50 text-emerald-800" : "text-gray-700 hover:bg-gray-50"}`}
                >
                  Payment
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTypeFilter("outstanding_payment");
                    setShowFilterDropdown(false);
                  }}
                  className={`w-full text-start px-3 py-1.5 rounded-xl font-semibold ${typeFilter === "outstanding_payment" ? "bg-emerald-50 text-emerald-800" : "text-gray-700 hover:bg-gray-50"}`}
                >
                  Outstanding Payment
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTypeFilter("wallet_topup");
                    setShowFilterDropdown(false);
                  }}
                  className={`w-full text-start px-3 py-1.5 rounded-xl font-semibold ${typeFilter === "wallet_topup" ? "bg-emerald-50 text-emerald-800" : "text-gray-700 hover:bg-gray-50"}`}
                >
                  Wallet Deposit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTypeFilter("refund");
                    setShowFilterDropdown(false);
                  }}
                  className={`w-full text-start px-3 py-1.5 rounded-xl font-semibold ${typeFilter === "refund" ? "bg-emerald-50 text-emerald-800" : "text-gray-700 hover:bg-gray-50"}`}
                >
                  Refund
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Add Transaction CTA */}
        <button
          type="button"
          onClick={onAddTransaction}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#313A28] hover:bg-[#1F251A] text-[#FBFBF9] font-bold text-xs shadow-sm transition-all shrink-0"
        >
          <Plus size={14} />
          <span>Add Transaction</span>
        </button>
      </div>

      {/* ── Patient Transactions Table ── */}
      <div className="overflow-hidden rounded-2xl border border-[#414E36]/10 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-[#F9F9F7] text-[11px] font-bold uppercase tracking-wider text-gray-500">
                <th className="py-3 px-4 text-start">
                  <button
                    type="button"
                    onClick={toggleSortOrder}
                    className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors uppercase font-bold"
                  >
                    <span>Date & Time</span>
                    <ArrowUpDown size={11} />
                  </button>
                </th>
                <th className="py-3 px-4 text-start">Transaction Type</th>
                <th className="py-3 px-4 text-start">Description</th>
                <th className="py-3 px-4 text-start">Payment Method</th>
                <th className="py-3 px-4 text-start">Amount</th>
                <th className="py-3 px-4 text-start">Status</th>
                <th className="py-3 px-4 text-start">Source</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <Loader2 className="animate-spin mx-auto mb-2" size={20} />
                    <span>Loading patient transactions...</span>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <AlertCircle className="mx-auto mb-2 text-gray-300" size={28} />
                    <p className="font-bold text-gray-600">No transactions yet</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">This patient doesn't have any financial transactions.</p>
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
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
                        <div className="font-semibold text-gray-900">
                          {new Date(tx.occurred_at).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}, {new Date(tx.occurred_at).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>

                      {/* Transaction Type */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize ${getTypeBadge(tx.type)}`}>
                          {tx.type.replace(/_/g, " ")}
                        </span>
                      </td>

                      {/* Description */}
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-gray-800 line-clamp-1">
                          {tx.description}
                        </span>
                      </td>

                      {/* Payment Method */}
                      <td className="py-3.5 px-4 whitespace-nowrap capitalize text-gray-700">
                        {tx.payment_method.replace(/_/g, " ")}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`font-extrabold ${isNegative ? "text-rose-600" : "text-emerald-700"}`}>
                          {isNegative ? `- EGP ${absAmt.toLocaleString()}` : `EGP ${absAmt.toLocaleString()}`}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize ${getStatusBadge(tx.status)}`}>
                          {tx.status}
                        </span>
                      </td>

                      {/* Source */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold capitalize bg-gray-100 text-gray-700">
                          {tx.source || "Manual"}
                        </span>
                      </td>

                      {/* Actions */}
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
                          <MoreVertical size={15} />
                        </button>

                        {isDropdownOpen && (
                          <div className="absolute right-4 top-10 z-30 w-40 rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl text-xs text-start animate-in fade-in duration-100">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTxnForDetails(tx);
                                setActiveDropdownTxnId(null);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-gray-700 hover:bg-[#F9F9F7] font-semibold"
                            >
                              <Eye size={13} className="text-gray-500" />
                              <span>View Transaction</span>
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
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-100 bg-[#F9F9F7] p-3 text-xs font-semibold text-gray-500">
          <div>
            Showing {transactions.length === 0 ? 0 : (page - 1) * limit + 1} to{" "}
            {Math.min(page * limit, totalCount)} of {totalCount} transactions
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="h-7 w-7 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={13} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .slice(0, 5)
              .map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={`h-7 w-7 rounded-lg text-xs font-bold transition-all ${
                    page === p
                      ? "bg-[#313A28] text-white shadow-xs"
                      : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {p}
                </button>
              ))}

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="h-7 w-7 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Transaction Details Modal ── */}
      {selectedTxnForDetails && (
        <TransactionDetailsModal
          transaction={selectedTxnForDetails}
          onClose={() => setSelectedTxnForDetails(null)}
        />
      )}
    </div>
  );
};
