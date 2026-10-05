"use client";

import React, { useState, useEffect } from "react";
import { X, Loader2, AlertCircle, Wallet, ShieldCheck, Plus, Minus, CheckCircle2, Coins, Receipt } from "lucide-react";
import { getAuthHeaders } from "@/lib/authHeaders";

export type FinancialMetric = "wallet" | "spent" | "outstanding";

export interface AdjustWalletModalProps {
  customer: {
    id?: string;
    name?: string;
    mobile?: string;
    phone?: string;
    wallet_balance?: number;
    wallet?: number;
    spent_amount?: number;
    spent?: number;
    outstanding?: number;
    email?: string;
    note?: string | null;
    [key: string]: any;
  };
  initialMetric?: FinancialMetric;
  onClose: () => void;
  onUpdated: (updates: { wallet_balance?: number; spent_amount?: number; outstanding?: number } | number) => void;
  lang?: "en" | "ar";
}

export default function AdjustWalletModal({
  customer,
  initialMetric = "wallet",
  onClose,
  onUpdated,
  lang = "en",
}: AdjustWalletModalProps) {
  const [activeMetric, setActiveMetric] = useState<FinancialMetric>(initialMetric);

  const currentWallet = Number(customer.wallet_balance !== undefined ? customer.wallet_balance : customer.wallet || 0);
  const currentSpent = Number(customer.spent_amount !== undefined ? customer.spent_amount : customer.spent || 0);
  const currentOutstanding = Number(customer.outstanding !== undefined ? customer.outstanding : 0);

  const getCurrentValue = (metric: FinancialMetric) => {
    switch (metric) {
      case "wallet":
        return currentWallet;
      case "spent":
        return currentSpent;
      case "outstanding":
        return currentOutstanding;
    }
  };

  const activeCurrentValue = getCurrentValue(activeMetric);

  const [mode, setMode] = useState<"set" | "delta">("set");
  const [newBalanceInput, setNewBalanceInput] = useState<string>(String(activeCurrentValue));
  const [deltaType, setDeltaType] = useState<"add" | "deduct">("add");
  const [deltaAmount, setDeltaAmount] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  // Sync state whenever activeMetric changes
  useEffect(() => {
    const val = getCurrentValue(activeMetric);
    setNewBalanceInput(String(val));
    setDeltaAmount("");
    setError(null);
    setSuccess(false);
  }, [activeMetric]);

  const currency = lang === "ar" ? "ج.م" : "EGP";

  // Calculate the target balance based on active mode
  const targetBalance = mode === "set"
    ? Math.max(0, parseFloat(newBalanceInput) || 0)
    : Math.max(
        0,
        deltaType === "add"
          ? activeCurrentValue + (parseFloat(deltaAmount) || 0)
          : activeCurrentValue - (parseFloat(deltaAmount) || 0)
      );

  const delta = targetBalance - activeCurrentValue;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isNaN(targetBalance) || targetBalance < 0) {
      setError(lang === "ar" ? "يرجى إدخال مبلغ صحيح." : "Please enter a valid non-negative amount.");
      return;
    }

    if (!customer.id) {
      setError(lang === "ar" ? "معرّف المريض مفقود." : "Customer ID is missing.");
      return;
    }

    try {
      setSubmitting(true);
      const headers = await getAuthHeaders();

      let metricTag = "Superadmin Wallet Adjustment";
      if (activeMetric === "spent") metricTag = "Superadmin Total Spend Adjustment";
      if (activeMetric === "outstanding") metricTag = "Superadmin Outstanding Debt Adjustment";

      const noteText = reason.trim()
        ? `[${metricTag}]: ${reason.trim()}`
        : `[${metricTag}]`;

      const payload: Record<string, any> = {
        id: customer.id,
        name: customer.name || "Patient",
        mobile: customer.mobile || customer.phone || "",
        email: customer.email || null,
        wallet_balance: activeMetric === "wallet" ? targetBalance : currentWallet,
        spent_amount: activeMetric === "spent" ? targetBalance : currentSpent,
        outstanding: activeMetric === "outstanding" ? targetBalance : currentOutstanding,
        note: customer.note ? `${customer.note}\n${noteText}` : noteText,
      };

      const res = await fetch("/api/customers", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || (lang === "ar" ? "تعذر تعديل القيمة المالية. يرجى المحاولة مجدداً." : "Failed to adjust financial metric. Please try again."));
        return;
      }

      setSuccess(true);
      if (activeMetric === "wallet" && typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("revera-wallet-change"));
      }

      const updates: Record<string, number> = {};
      if (activeMetric === "wallet") updates.wallet_balance = targetBalance;
      if (activeMetric === "spent") updates.spent_amount = targetBalance;
      if (activeMetric === "outstanding") updates.outstanding = targetBalance;

      setTimeout(() => {
        onUpdated(updates as any);
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err?.message || (lang === "ar" ? "تعذر الاتصال بالخادم." : "Could not reach the server. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const getMetricConfig = () => {
    switch (activeMetric) {
      case "wallet":
        return {
          title: lang === "ar" ? "تعديل رصيد المحفظة" : "Adjust Patient Wallet",
          icon: <Wallet size={20} className="text-sky-600" />,
          badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
          cardBg: "bg-[#F0F9FF] border-sky-100",
          currentLabel: lang === "ar" ? "الرصيد الحالي بالمحفظة" : "Current Wallet Balance",
          newLabel: lang === "ar" ? "الرصيد الجديد بالمحفظة" : "New Wallet Balance",
          impactLabel: lang === "ar" ? "التأثير على المحفظة:" : "Wallet Impact:",
          addBtnLabel: lang === "ar" ? "إضافة رصيد (شحن +)" : "Add Credit (+)",
          deductBtnLabel: lang === "ar" ? "خصم رصيد (استقطاع -)" : "Deduct Balance (-)",
          inputLabel: lang === "ar" ? "رصيد المحفظة الجديد (ج.م) *" : "New Wallet Balance (EGP) *",
          addInputLabel: lang === "ar" ? "المبلغ المراد شحنه (ج.م) *" : "Amount to Add (EGP) *",
          deductInputLabel: lang === "ar" ? "المبلغ المراد خصمه (ج.م) *" : "Amount to Deduct (EGP) *",
          saveBtnText: lang === "ar" ? "حفظ وتحديث المحفظة" : "Save & Update Wallet",
          successText: lang === "ar" ? "تم تحديث رصيد المحفظة بنجاح!" : "Wallet balance updated successfully!",
          themeColor: "sky",
          btnColor: "bg-sky-700 hover:bg-sky-800",
        };
      case "spent":
        return {
          title: lang === "ar" ? "تعديل إجمالي الإنفاق" : "Adjust Total Spent",
          icon: <Coins size={20} className="text-emerald-600" />,
          badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
          cardBg: "bg-[#F0FDF4] border-emerald-100",
          currentLabel: lang === "ar" ? "إجمالي الإنفاق الحالي" : "Current Total Spent",
          newLabel: lang === "ar" ? "إجمالي الإنفاق الجديد" : "New Total Spent",
          impactLabel: lang === "ar" ? "التأثير على إجمالي الإنفاق:" : "Spend Impact:",
          addBtnLabel: lang === "ar" ? "إضافة إنفاق (+)" : "Add Spend (+)",
          deductBtnLabel: lang === "ar" ? "خصم إنفاق (-)" : "Deduct Spend (-)",
          inputLabel: lang === "ar" ? "إجمالي الإنفاق الجديد (ج.م) *" : "New Total Spent (EGP) *",
          addInputLabel: lang === "ar" ? "المبلغ المراد إضافته للإنفاق (ج.م) *" : "Amount to Add (EGP) *",
          deductInputLabel: lang === "ar" ? "المبلغ المراد خصمه من الإنفاق (ج.م) *" : "Amount to Deduct (EGP) *",
          saveBtnText: lang === "ar" ? "حفظ وتحديث إجمالي الإنفاق" : "Save & Update Total Spent",
          successText: lang === "ar" ? "تم تحديث إجمالي الإنفاق بنجاح!" : "Total spent updated successfully!",
          themeColor: "emerald",
          btnColor: "bg-emerald-700 hover:bg-emerald-800",
        };
      case "outstanding":
        return {
          title: lang === "ar" ? "تعديل المديونية المستحقة" : "Adjust Outstanding Debt",
          icon: <Receipt size={20} className="text-amber-600" />,
          badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
          cardBg: "bg-[#FFF7ED] border-amber-100",
          currentLabel: lang === "ar" ? "المديونية الحالية" : "Current Outstanding Debt",
          newLabel: lang === "ar" ? "المديونية الجديدة" : "New Outstanding Debt",
          impactLabel: lang === "ar" ? "التأثير على المديونية:" : "Debt Impact:",
          addBtnLabel: lang === "ar" ? "إضافة مديونية (+)" : "Add Debt (+)",
          deductBtnLabel: lang === "ar" ? "سداد / تخفيض مديونية (-)" : "Settle / Deduct Debt (-)",
          inputLabel: lang === "ar" ? "المديونية الجديدة (ج.م) *" : "New Outstanding Debt (EGP) *",
          addInputLabel: lang === "ar" ? "المبلغ المراد إضافته كمديونية (ج.م) *" : "Amount to Add as Debt (EGP) *",
          deductInputLabel: lang === "ar" ? "المبلغ المراد سداده / خصمه (ج.م) *" : "Amount to Settle / Deduct (EGP) *",
          saveBtnText: lang === "ar" ? "حفظ وتحديث المديونية" : "Save & Update Outstanding",
          successText: lang === "ar" ? "تم تحديث المديونية المستحقة بنجاح!" : "Outstanding debt updated successfully!",
          themeColor: "amber",
          btnColor: "bg-amber-700 hover:bg-amber-800",
        };
    }
  };

  const cfg = getMetricConfig();

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-fadeIn">
      <div
        dir={lang === "ar" ? "rtl" : "ltr"}
        className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-gray-100 space-y-4"
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
          <div className="h-12 w-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
            {cfg.icon}
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-[#111827]">
                {cfg.title}
              </h3>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                <ShieldCheck size={10} className="text-amber-600" />
                {lang === "ar" ? "سوبر أدمن" : "Superadmin"}
              </span>
            </div>
            <p className="text-xs text-[#5A6A51] font-semibold truncate max-w-[240px]">
              {customer.name}
            </p>
          </div>
        </div>

        {/* Metric Switcher Tabs */}
        <div className="grid grid-cols-3 gap-1 bg-gray-100/80 p-1 rounded-xl text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setActiveMetric("wallet")}
            className={`py-1.5 px-2 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer ${
              activeMetric === "wallet" ? "bg-white text-sky-800 shadow-xs ring-1 ring-sky-200" : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <Wallet size={12} />
            <span>{lang === "ar" ? "المحفظة" : "Wallet"}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMetric("spent")}
            className={`py-1.5 px-2 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer ${
              activeMetric === "spent" ? "bg-white text-emerald-800 shadow-xs ring-1 ring-emerald-200" : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <Coins size={12} />
            <span>{lang === "ar" ? "الإنفاق" : "Spend"}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMetric("outstanding")}
            className={`py-1.5 px-2 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer ${
              activeMetric === "outstanding" ? "bg-white text-amber-900 shadow-xs ring-1 ring-amber-200" : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <Receipt size={12} />
            <span>{lang === "ar" ? "المديونية" : "Debt"}</span>
          </button>
        </div>

        {/* Current Balance Card */}
        <div className={`rounded-2xl border p-3.5 flex items-center justify-between ${cfg.cardBg}`}>
          <div>
            <span className="text-xs font-semibold text-gray-700">
              {cfg.currentLabel}
            </span>
            <div className="text-xl font-black text-gray-900 mt-0.5">
              {activeCurrentValue.toLocaleString()} <span className="text-xs font-bold text-gray-500">{currency}</span>
            </div>
          </div>
          <div className="text-end">
            <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
              {cfg.newLabel}
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
            {lang === "ar" ? "تحديد مبلغ محدد" : "Set Exact Amount"}
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
            <span>{cfg.successText}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === "set" ? (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#111827]">
                {cfg.inputLabel}
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
                  <span>{cfg.addBtnLabel}</span>
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
                  <span>{cfg.deductBtnLabel}</span>
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#111827]">
                  {deltaType === "add" ? cfg.addInputLabel : cfg.deductInputLabel}
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
              <span>{cfg.impactLabel}</span>
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
              placeholder={lang === "ar" ? "مثال: تسوية يدوية، تصحيح محاسبي، تسوية رصيد..." : "e.g. Manual correction, accounting adjustment, audit..."}
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
              className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${cfg.btnColor}`}
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>{lang === "ar" ? "جاري الحفظ..." : "Saving..."}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  <span>{cfg.saveBtnText}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
