"use client";

import React, { useRef } from "react";
import {
  X,
  Printer,
  Calendar,
  CreditCard,
  User,
  Building2,
  Receipt,
  FileText,
  Clock,
  ShieldCheck,
  RotateCcw,
  Sliders,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { TransactionItem } from "./types";

interface TransactionDetailsModalProps {
  transaction: TransactionItem | null;
  onClose: () => void;
  onIssueRefund?: (transaction: TransactionItem) => void;
  onAdjustment?: (transaction: TransactionItem) => void;
  lang?: "en" | "ar";
}

export const TransactionDetailsModal: React.FC<TransactionDetailsModalProps> = ({
  transaction,
  onClose,
  onIssueRefund,
  onAdjustment,
  lang = "en",
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!transaction) return null;

  const handlePrint = () => {
    window.print();
  };

  const isRefundable =
    transaction.status === "completed" &&
    transaction.type !== "refund" &&
    Number(transaction.amount) > 0;

  const formatAmount = (amt: number) => {
    const num = Number(amt || 0);
    const prefix = num > 0 ? "+ " : num < 0 ? "- " : "";
    return `${prefix}EGP ${Math.abs(num).toLocaleString()}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <Receipt size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-[#1F251A]">
                  Transaction Details
                </h3>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 font-semibold">
                  {transaction.transaction_id}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Created on {new Date(transaction.created_at || transaction.occurred_at).toLocaleString()}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Printable Receipt Body */}
        <div ref={printRef} className="space-y-6">
          {/* Top Amount Banner */}
          <div className="rounded-2xl bg-[#F9F9F7] p-5 border border-gray-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Transaction Amount
              </span>
              <div className={`text-3xl font-black mt-0.5 ${
                Number(transaction.amount) < 0 ? "text-rose-600" : "text-emerald-700"
              }`}>
                {formatAmount(transaction.amount)}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize border ${
                transaction.status === "completed"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : transaction.status === "pending"
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : transaction.status === "refunded"
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : "bg-gray-50 text-gray-700 border-gray-200"
              }`}>
                {transaction.status}
              </span>
              <span className="text-[11px] font-semibold text-gray-500 uppercase">
                Source: {transaction.source || "Manual"}
              </span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl border border-gray-100 bg-white space-y-1">
              <span className="text-gray-400 font-bold uppercase text-[10px]">Transaction Type</span>
              <div className="font-semibold text-gray-800 capitalize flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {transaction.type.replace(/_/g, " ")}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-gray-100 bg-white space-y-1">
              <span className="text-gray-400 font-bold uppercase text-[10px]">Payment Method</span>
              <div className="font-semibold text-gray-800 capitalize flex items-center gap-1.5">
                <CreditCard size={13} className="text-gray-500" />
                {transaction.payment_method.replace(/_/g, " ")}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-gray-100 bg-white space-y-1">
              <span className="text-gray-400 font-bold uppercase text-[10px]">Patient</span>
              <div className="font-bold text-[#1F251A]">
                {transaction.customer?.name || "Clinic General Patient"}
              </div>
              {transaction.customer?.phone && (
                <div className="text-gray-500 text-[11px]">
                  {transaction.customer.phone}
                </div>
              )}
            </div>

            <div className="p-3.5 rounded-xl border border-gray-100 bg-white space-y-1">
              <span className="text-gray-400 font-bold uppercase text-[10px]">Branch / Location</span>
              <div className="font-semibold text-gray-800 flex items-center gap-1.5">
                <Building2 size={13} className="text-gray-500" />
                {transaction.branch?.name_en || "Main Branch"}
              </div>
            </div>
          </div>

          {/* Description & Reference */}
          <div className="p-4 rounded-xl border border-gray-100 bg-white space-y-2">
            <span className="text-gray-400 font-bold uppercase text-[10px]">Description</span>
            <p className="text-xs font-medium text-gray-800 leading-relaxed">
              {transaction.description || "No description provided."}
            </p>
            {transaction.reference_no && (
              <div className="pt-2 border-t border-gray-100 flex items-center gap-2 text-xs">
                <span className="text-gray-400 font-bold">Reference / Receipt:</span>
                <span className="font-mono text-gray-700 font-semibold">{transaction.reference_no}</span>
              </div>
            )}
            {transaction.reason && (
              <div className="pt-2 border-t border-gray-100 flex items-center gap-2 text-xs text-rose-700">
                <span className="font-bold">Reason:</span>
                <span>{transaction.reason}</span>
              </div>
            )}
          </div>

          {/* Audit Metadata */}
          <div className="rounded-xl bg-gray-50 p-3 text-[11px] text-gray-500 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <User size={12} className="text-gray-400" />
              <span>Created by: <strong className="text-gray-700">{transaction.created_by_name || "Staff"}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock size={12} className="text-gray-400" />
              <span>{new Date(transaction.occurred_at).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 font-semibold text-xs hover:bg-gray-50 transition-colors shadow-2xs"
          >
            <Printer size={14} />
            Print Receipt
          </button>

          <div className="flex items-center gap-2">
            {isRefundable && onIssueRefund && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onIssueRefund(transaction);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 font-semibold text-xs hover:bg-rose-100 transition-colors"
              >
                <RotateCcw size={13} />
                Issue Refund
              </button>
            )}

            {onAdjustment && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onAdjustment(transaction);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 font-semibold text-xs hover:bg-amber-100 transition-colors"
              >
                <Sliders size={13} />
                Create Adjustment
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
