"use client";

import React, { useState, useEffect } from "react";
import { X, Loader2, AlertCircle, Receipt, Calendar, User, Sparkles, CheckCircle2, ChevronRight } from "lucide-react";
import { getAuthHeaders } from "@/lib/authHeaders";

interface UnpaidSession {
  id: string;
  type: string;
  date: string;
  time?: string | null;
  serviceName: string;
  doctorName?: string | null;
  totalPrice: number;
  amountPaid: number;
  amountLeft: number;
  status?: string | null;
  invoiceNo?: string | null;
}

interface SettleDebtModalProps {
  customer: { id?: string; name?: string; outstanding?: number };
  onClose: () => void;
  onSettled: () => void;
  lang?: "en" | "ar";
}

const PAYMENT_METHODS = [
  { id: "cash", label: "Cash", ar: "كاش / نقدي" },
  { id: "card", label: "Card", ar: "بطاقة دفع" },
  { id: "instapay", label: "InstaPay", ar: "إنستاباي" },
  { id: "vodafone_cash", label: "Vodafone Cash", ar: "فودافون كاش" },
  { id: "bank_transfer", label: "Bank Transfer", ar: "تحويل بنكي" },
];

export default function SettleDebtModal({ customer, onClose, onSettled, lang = "en" }: SettleDebtModalProps) {
  const outstanding = Number(customer.outstanding || 0);
  const isAr = lang === "ar";
  const currency = isAr ? "ج.م" : "EGP";

  const [unpaidSessions, setUnpaidSessions] = useState<UnpaidSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const [amount, setAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [note, setNote] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    settled: number;
    unallocated: number;
    outstandingAfter: number;
    sessionTitle?: string;
  } | null>(null);

  // Load patient's unpaid sessions on mount
  useEffect(() => {
    let isMounted = true;
    const fetchUnpaidSessions = async () => {
      if (!customer.id || outstanding <= 0) {
        setLoadingSessions(false);
        return;
      }
      try {
        setLoadingSessions(true);
        const headers = await getAuthHeaders();
        const res = await fetch(`/api/customers/settle-debt?customerId=${encodeURIComponent(customer.id)}`, {
          headers,
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            const list: UnpaidSession[] = Array.isArray(data.unpaidSessions) ? data.unpaidSessions : [];
            setUnpaidSessions(list);
            if (list.length > 0) {
              setSelectedSessionId(list[0].id);
              setAmount(String(list[0].amountLeft));
            } else {
              setSelectedSessionId(null);
              setAmount(String(outstanding));
            }
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          if (isMounted) {
            console.warn("Could not fetch unpaid sessions:", errData?.error);
            setSelectedSessionId(null);
            setAmount(String(outstanding));
          }
        }
      } catch (err) {
        console.error("Failed to load unpaid sessions for settlement:", err);
      } finally {
        if (isMounted) setLoadingSessions(false);
      }
    };

    fetchUnpaidSessions();
    return () => {
      isMounted = false;
    };
  }, [customer.id, outstanding]);

  const selectedSession = unpaidSessions.find((s) => s.id === selectedSessionId);
  const maxAllowedAmount = selectedSession ? selectedSession.amountLeft : outstanding;
  const numericAmount = Math.max(0, parseFloat(amount) || 0);

  const handleSelectSession = (sessionId: string | null) => {
    setError(null);
    setSelectedSessionId(sessionId);
    if (sessionId) {
      const sess = unpaidSessions.find((s) => s.id === sessionId);
      if (sess) {
        setAmount(String(sess.amountLeft));
      }
    } else {
      setAmount(String(outstanding));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (numericAmount <= 0) {
      setError(isAr ? "يرجى إدخال مبلغ صحيح أكبر من 0." : "Please enter a valid amount greater than 0.");
      return;
    }
    if (numericAmount > maxAllowedAmount) {
      setError(
        isAr
          ? `المبلغ يتجاوز الرصيد المستحق (${maxAllowedAmount.toLocaleString()} ${currency}).`
          : `Amount exceeds the balance of ${currency} ${maxAllowedAmount.toLocaleString()}.`
      );
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
          reservationId: selectedSessionId || undefined,
          amount: numericAmount,
          paymentMethod,
          note: note.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || (isAr ? "تعذر تسوية المبلغ. يرجى المحاولة مرة أخرى." : "Could not settle the balance. Please try again."));
        return;
      }
      setResult({
        settled: data.settled,
        unallocated: data.unallocated || 0,
        outstandingAfter: data.outstandingAfter,
        sessionTitle: selectedSession ? `${selectedSession.serviceName} (${selectedSession.date})` : undefined,
      });
      onSettled();
    } catch {
      setError(isAr ? "تعذر الاتصال بالخادم. يرجى المحاولة لاحقاً." : "Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-fadeIn">
      <div
        dir={isAr ? "rtl" : "ltr"}
        className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute end-4 top-4 text-gray-400 hover:text-gray-700 transition cursor-pointer"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="h-11 w-11 rounded-2xl bg-[#EBF1E8] text-[var(--cr-primary)] flex items-center justify-center shrink-0">
            <Receipt size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--cr-dark)]">
              {isAr ? "تسوية المديونية المستحقة" : "Settle Outstanding Balance"}
            </h3>
            <p className="text-xs text-[var(--color-brand-secondary)] font-medium">{customer.name}</p>
          </div>
        </div>

        {/* Zero Debt Guard */}
        {outstanding <= 0 ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-emerald-900">
                  {isAr ? "لا توجد مديونية مستحقة" : "No Outstanding Balance"}
                </p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  {isAr
                    ? "هذا المريض ليس لديه أي جلسات غير مدفوعة أو مديونية مستحقة للتسوية."
                    : "This patient currently has zero outstanding balance and all sessions are fully paid."}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-2xl bg-[var(--cr-primary)] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#36412D] transition cursor-pointer"
            >
              {isAr ? "إغلاق" : "Close"}
            </button>
          </div>
        ) : result ? (
          /* Success Screen */
          <div className="space-y-4">
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200/60 p-4 space-y-1">
              <p className="text-sm font-bold text-emerald-800">
                {isAr
                  ? `تم تسوية ${result.settled.toLocaleString()} ${currency}`
                  : `Settled ${currency} ${result.settled.toLocaleString()}`}
              </p>
              {result.sessionTitle && (
                <p className="text-xs text-emerald-700 font-medium">
                  {isAr ? `الجلسة: ${result.sessionTitle}` : `Session: ${result.sessionTitle}`}
                </p>
              )}
              <p className="text-xs text-emerald-700">
                {isAr
                  ? `المتبقي في حساب المريض: ${result.outstandingAfter.toLocaleString()} ${currency}`
                  : `Remaining balance: ${currency} ${result.outstandingAfter.toLocaleString()}`}
              </p>
            </div>
            {result.unallocated > 0 && (
              <div className="rounded-2xl bg-amber-50 border border-amber-200/60 p-4 flex gap-2.5">
                <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">
                  {isAr
                    ? `لم يتم مطابقة ${result.unallocated.toLocaleString()} ${currency} بجلسة محددة.`
                    : `${currency} ${result.unallocated.toLocaleString()} could not be matched to an unpaid session.`}
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-2xl bg-[var(--cr-primary)] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#36412D] transition cursor-pointer"
            >
              {isAr ? "تم" : "Done"}
            </button>
          </div>
        ) : (
          /* Settlement Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Summary card */}
            <div className="rounded-2xl bg-[var(--color-brand-light)] border border-[var(--cr-primary)]/10 p-3.5 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-[var(--color-brand-secondary)] block">
                  {isAr ? "إجمالي المديونية الحالية" : "Current Total Outstanding"}
                </span>
                <span className="text-[11px] text-[var(--color-brand-secondary)]">
                  {unpaidSessions.length > 0
                    ? isAr
                      ? `${unpaidSessions.length} جلسة غير مسددة بالكامل`
                      : `${unpaidSessions.length} session(s) with remaining balance`
                    : isAr ? "جاري فحص الجلسات..." : "Loading sessions..."}
                </span>
              </div>
              <span className="text-lg font-black text-rose-600">
                {outstanding.toLocaleString()} {currency}
              </span>
            </div>

            {/* Unpaid Sessions Selector */}
            {loadingSessions ? (
              <div className="py-6 flex flex-col items-center justify-center gap-2 text-xs text-[var(--color-brand-secondary)]">
                <Loader2 size={18} className="animate-spin text-[var(--cr-primary)]" />
                <span>{isAr ? "جاري تحميل تفاصيل الجلسات غير المسددة..." : "Loading unpaid sessions..."}</span>
              </div>
            ) : unpaidSessions.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-gray-700">
                    {isAr ? "اختر الجلسة المراد تسويتها" : "Select Session to Settle"}
                  </label>
                  {unpaidSessions.length > 1 && (
                    <span className="text-[11px] font-semibold text-[var(--cr-primary)]">
                      {isAr ? `${unpaidSessions.length} عناصر متاحة` : `${unpaidSessions.length} items available`}
                    </span>
                  )}
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pe-1">
                  {/* All Sessions FIFO option */}
                  {unpaidSessions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleSelectSession(null)}
                      className={`w-full text-start p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                        selectedSessionId === null
                          ? "border-[var(--cr-primary)] bg-[var(--color-brand-light)] ring-1 ring-[var(--cr-primary)]"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <div>
                        <span className="font-bold text-xs text-[var(--cr-dark)] block">
                          {isAr ? "جميع الجلسات (تسوية تلقائية من الأقدم)" : "All Unpaid Sessions (FIFO Allocation)"}
                        </span>
                        <span className="text-[11px] text-[var(--color-brand-secondary)]">
                          {isAr
                            ? `توزيع السداد تلقائياً عبر جميع الجلسات المتبقية`
                            : `Distribute payment across oldest unpaid sessions`}
                        </span>
                      </div>
                      <span className="text-xs font-black text-rose-600 shrink-0">
                        {outstanding.toLocaleString()} {currency}
                      </span>
                    </button>
                  )}

                  {/* Individual Unpaid Sessions */}
                  {unpaidSessions.map((session) => {
                    const isSelected = selectedSessionId === session.id;
                    return (
                      <button
                        key={session.id}
                        type="button"
                        onClick={() => handleSelectSession(session.id)}
                        className={`w-full text-start p-3 rounded-2xl border transition cursor-pointer space-y-1.5 ${
                          isSelected
                            ? "border-[var(--cr-primary)] bg-[var(--color-brand-light)] ring-1 ring-[var(--cr-primary)]"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className={`h-2 w-2 rounded-full shrink-0 ${session.type === 'invoice' ? 'bg-sky-500' : 'bg-amber-500'}`} />
                            <span className="font-bold text-xs text-[var(--cr-dark)] truncate">
                              {session.serviceName}
                            </span>
                            {session.invoiceNo && session.type !== 'invoice' && (
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 shrink-0">
                                {session.invoiceNo}
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-black text-rose-600 shrink-0">
                            {session.amountLeft.toLocaleString()} {currency}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-[var(--color-brand-secondary)]">
                          <div className="flex items-center gap-2">
                            {session.date && (
                              <span className="flex items-center gap-1">
                                <Calendar size={11} className="text-gray-400" />
                                <span>{session.date}</span>
                              </span>
                            )}
                            {session.doctorName && (
                              <span className="flex items-center gap-1">
                                <User size={11} className="text-gray-400" />
                                <span>{session.doctorName}</span>
                              </span>
                            )}
                          </div>
                          <span className="font-medium text-[10px] text-gray-500">
                            {isAr
                              ? `المدفوع: ${session.amountPaid.toLocaleString()} / الإجمالي: ${session.totalPrice.toLocaleString()}`
                              : `Paid: ${session.amountPaid.toLocaleString()} / Total: ${session.totalPrice.toLocaleString()}`}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-amber-900">
                    {isAr ? "تسوية رصيد المديونية المباشر" : "Direct Account Balance Settlement"}
                  </span>
                  <span className="text-xs font-black text-rose-600">
                    {outstanding.toLocaleString()} {currency}
                  </span>
                </div>
                <p className="text-[11px] text-amber-800/80">
                  {isAr
                    ? "سيتم تسجيل الدفعة في السجل المالي وخصمها مباشرة من رصيد مديونية المريض."
                    : "Payment will be recorded in the financial ledger and deducted directly from the patient's outstanding balance."}
                </p>
              </div>
            )}

            {/* Amount input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-gray-700">
                  {isAr ? "المبلغ المدفوع للتسوية" : "Amount to Settle"} <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setAmount(String(maxAllowedAmount))}
                  className="text-[11px] font-bold text-[var(--cr-primary)] hover:underline cursor-pointer"
                >
                  {isAr
                    ? selectedSession
                      ? `سداد كامل الجلسة (${maxAllowedAmount.toLocaleString()} ${currency})`
                      : `سداد كامل المديونية (${maxAllowedAmount.toLocaleString()} ${currency})`
                    : selectedSession
                      ? `Pay full session (${maxAllowedAmount.toLocaleString()} ${currency})`
                      : `Pay full balance (${maxAllowedAmount.toLocaleString()} ${currency})`}
                </button>
              </div>

              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max={maxAllowedAmount}
                  step="0.01"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setError(null);
                  }}
                  placeholder="0"
                  autoFocus
                  className="w-full rounded-xl border border-gray-200 bg-white ps-3.5 pe-12 py-2.5 text-sm font-semibold text-[var(--cr-dark)] outline-none focus:border-[var(--cr-primary)] focus:ring-1 focus:ring-[var(--cr-primary)] transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="absolute end-3.5 top-2.5 text-xs font-bold text-gray-400 pointer-events-none select-none">
                  {currency}
                </span>
              </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">
                {isAr ? "طريقة الدفع" : "Payment Method"}
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-[var(--cr-dark)] outline-none focus:border-[var(--cr-primary)] transition"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {isAr ? m.ar : m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Optional Note */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">
                {isAr ? "ملاحظات / رقم الإيصال (اختياري)" : "Note / Receipt Reference (Optional)"}
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={isAr ? "رقم إيصال أو مرجع..." : "Receipt number, reference..."}
                className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-[var(--cr-dark)] outline-none focus:border-[var(--cr-primary)] transition"
              />
            </div>

            {/* Balance after payment preview */}
            {numericAmount > 0 && numericAmount <= maxAllowedAmount && (
              <div className="rounded-xl bg-[#F3F6F1] border border-[var(--cr-primary)]/10 p-3 text-xs flex items-center justify-between">
                <span className="text-[var(--color-brand-secondary)] font-semibold">
                  {selectedSession
                    ? isAr ? "المتبقي من هذه الجلسة بعد السداد" : "Session balance after payment"
                    : isAr ? "إجمالي المديونية بعد السداد" : "Total balance after payment"}
                </span>
                <span className="font-bold text-[var(--cr-dark)]">
                  {(maxAllowedAmount - numericAmount).toLocaleString()} {currency}
                </span>
              </div>
            )}

            {/* Error banner */}
            {error && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 flex gap-2 text-xs text-rose-700">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
              >
                {isAr ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="submit"
                disabled={submitting || numericAmount <= 0}
                className="flex-1 rounded-2xl bg-[var(--cr-primary)] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#36412D] disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer inline-flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                <span>
                  {submitting
                    ? isAr ? "جاري التسجيل..." : "Recording..."
                    : isAr ? "تسجيل الدفع" : "Record Payment"}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
