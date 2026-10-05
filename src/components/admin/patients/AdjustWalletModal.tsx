"use client";

import React, { useState } from "react";
import { X, Loader2, AlertCircle, Wallet, ShieldCheck, ArrowRight, Plus, Minus, CheckCircle2 } from "lucide-react";
import { getAuthHeaders } from "@/lib/authHeaders";

interface AdjustWalletModalProps {
  customer: {
    id?: string;
    name?: string;
    mobile?: string;
    phone?: string;
    wallet_balance?: number;
    wallet?: number;
    email?: string;
    note?: string | null;
    [key: string]: any;
  };
  onClose: () => void;
  onUpdated: (newBalance: number) => void;
  lang?: "en" | "ar";
}

export default function AdjustWalletModal({
  customer,
  onClose,
  onUpdated,
  lang = "en",
}: AdjustWalletModalProps) {
  const currentWallet = Number(customer.wallet_balance !== undefined ? customer.wallet_balance : customer.wallet || 0);
  const [mode, setMode] = useState<"set" | "delta">("set");
  const [newBalanceInput, setNewBalanceInput] = useState<string>(String(currentWallet));
  const [deltaType, setDeltaType] = useState<"add" | "deduct">("add");
  const [deltaAmount, setDeltaAmount] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const currency = lang === "ar" ? "ج.م" : "EGP";

  // Calculate the target wallet balance based on active mode
  const targetBalance = mode === "set"
    ? Math.max(0, parseFloat(newBalanceInput) || 0)
    : Math.max(
        0,
        deltaType === "add"
          ? currentWallet + (parseFloat(deltaAmount) || 0)
          : currentWallet - (parseFloat(deltaAmount) || 0)
      );

  const delta = targetBalance - currentWallet;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isNaN(targetBalance) || targetBalance < 0) {
      setError(lang === "ar" ? "يرجى إدخال مبلغ صحيح." : "Please enter a valid non-negative balance.");
      return;
    }

    if (!customer.id) {
      setError(lang === "ar" ? "معرّف المريض مفقود." : "Customer ID is missing.");
      return;
    }

    try {
      setSubmitting(true);
      const headers = await getAuthHeaders();

      const noteText = reason.trim()
        ? `[Superadmin Wallet Adjustment]: ${reason.trim()}`
        : "[Superadmin Wallet Adjustment]";

      const payload: Record<string, any> = {
        id: customer.id,
        name: customer.name || "Patient",
        mobile: customer.mobile || customer.phone || "",
        email: customer.email || null,
        wallet_balance: targetBalance,
        note: customer.note ? `${customer.note}\n${noteText}` : noteText,
      };

      const res = await fetch("/api/customers", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || (lang === "ar" ? "تعذر تعديل رصيد المحفظة. يرجى المحاولة مجدداً." : "Failed to adjust wallet balance. Please try again."));
        return;
      }

      setSuccess(true);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("revera-wallet-change"));
      }

      setTimeout(() => {
        onUpdated(targetBalance);
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err?.message || (lang === "ar" ? "تعذر الاتصال بالخادم." : "Could not reach the server. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-fadeIn">
      <div
        dir={lang === "ar" ? "rtl" : "ltr"}
        className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-gray-100 space-y-5"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute end-4 top-4 text-gray-400 hover:text-gray-700 transition cursor-pointer p-1 rounded-full hover:bg-gray-100"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-sky-50 text-sky-700 border border-sky-100 flex items-center justify-center shrink-0">
            <Wallet size={22} className="text-sky-600" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-base sm:text-lg font-bold text-[#111827]">
                {lang === "ar" ? "تعديل رصيد المحفظة" : "Adjust Patient Wallet"}
              </h3>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded-md flex items-center gap-0.5">
                <ShieldCheck size={10} className="text-amber-600" />
                {lang === "ar" ? "سوبر أدمن" : "Superadmin"}
              </span>
            </div>
            <p className="text-xs text-[#5A6A51] font-semibold truncate max-w-[240px]">
              {customer.name}
            </p>
          </div>
        </div>

        {/* Current Balance Card */}
        <div className="rounded-2xl bg-[#F0F9FF] border border-sky-100 p-3.5 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-sky-800">
              {lang === "ar" ? "الرصيد الحالي بالمحفظة" : "Current Wallet Balance"}
            </span>
            <div className="text-xl font-black text-sky-900 mt-0.5">
              {currentWallet.toLocaleString()} <span className="text-xs font-bold text-sky-600">{currency}</span>
            </div>
          </div>
          <div className="text-end">
            <span className="text-[11px] font-bold text-sky-700 uppercase tracking-wider">
              {lang === "ar" ? "الرصيد الجديد" : "New Balance"}
            </span>
            <div className="text-xl font-black text-emerald-700 mt-0.5">
              {targetBalance.toLocaleString()} <span className="text-xs font-bold text-emerald-600">{currency}</span>
            </div>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="grid grid-cols-2 gap-1.5 bg-gray-100 p-1 rounded-xl text-xs font-bold">
          <button
            type="button"
            onClick={() => setMode("set")}
            className={`py-2 rounded-lg transition cursor-pointer ${
              mode === "set" ? "bg-white text-[#111827] shadow-xs" : "text-gray-500 hover:text-gray-900"
            }`}
          >
            {lang === "ar" ? "تحديد رصيد محدد" : "Set Exact Balance"}
          </button>
          <button
            type="button"
            onClick={() => setMode("delta")}
            className={`py-2 rounded-lg transition cursor-pointer ${
              mode === "delta" ? "bg-white text-[#111827] shadow-xs" : "text-gray-500 hover:text-gray-900"
            }`}
          >
            {lang === "ar" ? "إضافة / خصم مبلغ" : "Add / Deduct Amount"}
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-800">
            <AlertCircle size={15} className="shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-bold text-emerald-800">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
            <span>{lang === "ar" ? "تم تحديث رصيد المحفظة بنجاح!" : "Wallet balance updated successfully!"}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "set" ? (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#111827]">
                {lang === "ar" ? "الرصيد الجديد المطلوب (ج.م) *" : "New Wallet Balance (EGP) *"}
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={newBalanceInput}
                  onChange={(e) => setNewBalanceInput(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-bold text-[#111827] outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDeltaType("add")}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                    deltaType === "add"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-400"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Plus size={14} />
                  <span>{lang === "ar" ? "إضافة رصيد (شحن)" : "Add Credit (+)"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeltaType("deduct")}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                    deltaType === "deduct"
                      ? "border-rose-500 bg-rose-50 text-rose-800 ring-1 ring-rose-400"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Minus size={14} />
                  <span>{lang === "ar" ? "خصم رصيد (استقطاع)" : "Deduct Balance (-)"}</span>
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#111827]">
                  {deltaType === "add"
                    ? (lang === "ar" ? "المبلغ المراد إضافته (ج.م) *" : "Amount to Add (EGP) *")
                    : (lang === "ar" ? "المبلغ المراد خصمه (ج.م) *" : "Amount to Deduct (EGP) *")}
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={deltaAmount}
                  onChange={(e) => setDeltaAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-bold text-[#111827] outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
                />
              </div>
            </div>
          )}

          {/* Delta Preview Badge */}
          {delta !== 0 && (
            <div className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between ${
              delta > 0
                ? "bg-emerald-50/70 border-emerald-200 text-emerald-800"
                : "bg-rose-50/70 border-rose-200 text-rose-800"
            }`}>
              <span>{lang === "ar" ? "التأثير على المحفظة:" : "Wallet Impact:"}</span>
              <span className="font-bold">
                {delta > 0 ? `+${delta.toLocaleString()}` : delta.toLocaleString()} {currency}
              </span>
            </div>
          )}

          {/* Reason / Notes */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#111827]">
              {lang === "ar" ? "سبب التعديل / ملاحظات (اختياري)" : "Adjustment Reason / Note (Optional)"}
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={lang === "ar" ? "مثال: تصحيح رصيد يدوي، هدية ولاء، تسوية..." : "e.g. Manual correction, loyalty bonus, compensation..."}
              className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-medium text-[#111827] outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
            >
              {lang === "ar" ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>{lang === "ar" ? "جاري الحفظ..." : "Saving..."}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  <span>{lang === "ar" ? "حفظ وتحديث المحفظة" : "Save & Update Wallet"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
