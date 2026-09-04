"use client";

import React, { useState } from "react";
import { X, Loader2, AlertCircle, Receipt } from "lucide-react";
import { getAuthHeaders } from "@/lib/authHeaders";

interface SettleDebtModalProps {
  customer: { id: string; name: string; outstanding?: number };
  onClose: () => void;
  onSettled: () => void;
  lang?: "en" | "ar";
}

const PAYMENT_METHODS = [
  { id: "cash", label: "Cash" },
  { id: "card", label: "Card" },
  { id: "instapay", label: "InstaPay" },
  { id: "vodafone_cash", label: "Vodafone Cash" },
  { id: "bank_transfer", label: "Bank Transfer" },
];

/**
 * Collects a walk-in debt payment. The amount is allocated server-side against the patient's
 * unpaid bookings oldest-first, so the bookings and the aggregate balance stay in step — see
 * `POST /api/customers/settle-debt`.
 */
export default function SettleDebtModal({ customer, onClose, onSettled, lang = "en" }: SettleDebtModalProps) {
  const outstanding = Number(customer.outstanding || 0);
  const [amount, setAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [note, setNote] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ settled: number; unallocated: number; outstandingAfter: number } | null>(null);

  const numericAmount = Math.max(0, parseFloat(amount) || 0);
  const currency = lang === "ar" ? "ج.م" : "EGP";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (numericAmount <= 0) {
      setError("Please enter a valid amount greater than 0.");
      return;
    }
    if (numericAmount > outstanding) {
      setError(`Amount exceeds the outstanding balance of ${currency} ${outstanding.toLocaleString()}.`);
      return;
    }

    try {
      setSubmitting(true);
      const headers = await getAuthHeaders();
      const res = await fetch("/api/customers/settle-debt", {
        method: "POST",
        headers,
        body: JSON.stringify({
          customerId: customer.id,
          amount: numericAmount,
          paymentMethod,
          note: note.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Could not settle the balance. Please try again.");
        return;
      }
      setResult({
        settled: data.settled,
        unallocated: data.unallocated,
        outstandingAfter: data.outstandingAfter,
      });
      onSettled();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div
        dir={lang === "ar" ? "rtl" : "ltr"}
        className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-gray-100"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute end-4 top-4 text-gray-400 hover:text-gray-700 transition cursor-pointer"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="h-11 w-11 rounded-2xl bg-[#EBF1E8] text-[#414E36] flex items-center justify-center shrink-0">
            <Receipt size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#1F251A]">Settle Outstanding Balance</h3>
            <p className="text-xs text-[#5A6A51]">{customer.name}</p>
          </div>
        </div>

        {result ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200/60 p-4 space-y-1">
              <p className="text-sm font-bold text-emerald-800">
                Settled {currency} {result.settled.toLocaleString()}
              </p>
              <p className="text-xs text-emerald-700">
                Remaining balance: {currency} {result.outstandingAfter.toLocaleString()}
              </p>
            </div>
            {result.unallocated > 0 && (
              <div className="rounded-2xl bg-amber-50 border border-amber-200/60 p-4 flex gap-2.5">
                <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">
                  {currency} {result.unallocated.toLocaleString()} could not be matched to an unpaid
                  booking and was <strong>not</strong> collected. The recorded debt is higher than the
                  bookings account for — worth reviewing this patient&apos;s history.
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-2xl bg-[#414E36] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#36412D] transition cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-2xl bg-[#FBFBF9] border border-[#414E36]/10 p-3.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-[#5A6A51]">Current Outstanding</span>
              <span className="text-lg font-black text-rose-600">
                {currency} {outstanding.toLocaleString()}
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">
                Amount Paid <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                max={outstanding}
                step="0.01"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setError(null); }}
                placeholder="0"
                autoFocus
                className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-[#1F251A] outline-none focus:border-[#414E36] focus:ring-1 focus:ring-[#414E36] transition"
              />
              <button
                type="button"
                onClick={() => setAmount(String(outstanding))}
                className="text-[11px] font-bold text-[#414E36] hover:underline cursor-pointer"
              >
                Pay full balance
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-[#1F251A] outline-none focus:border-[#414E36] transition"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">Note (Optional)</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Receipt number, reference..."
                className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#414E36] transition"
              />
            </div>

            {numericAmount > 0 && numericAmount <= outstanding && (
              <div className="rounded-xl bg-[#F3F6F1] border border-[#414E36]/10 p-3 text-xs flex items-center justify-between">
                <span className="text-[#5A6A51] font-semibold">Balance after payment</span>
                <span className="font-bold text-[#1F251A]">
                  {currency} {(outstanding - numericAmount).toLocaleString()}
                </span>
              </div>
            )}

            {error && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 flex gap-2 text-xs text-rose-700">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || numericAmount <= 0}
                className="flex-1 rounded-2xl bg-[#414E36] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#36412D] disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer inline-flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                <span>{submitting ? "Recording..." : "Record Payment"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
