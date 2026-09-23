"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Package, Zap } from "lucide-react";

/**
 * Brief 35 / DEC-079: the ONLY place a laser-pulse deficit is resolved is reception.
 * Rendered inside the Checkout modal (page.tsx) and the End-Session flow
 * (BookingDetailsModal.tsx) for PACKAGE-mode laser bookings. Self-contained: it fetches
 * the deficit preview itself from GET /api/reservations/laser-deficit and reports
 * { unresolved } up through onStateChange so the parent can block its money write.
 */

type DeficitInfo = {
  resolved: boolean;
  resolution: string | null;
  deficitPulses: number;
  deliveredPulses: number;
  remainingPulses: number;
  sourceCustomerPackageId: string | null;
  quotaMissing: boolean;
  expired: boolean;
  noActivePackage: boolean;
  resolvedRate: number | null;
};

type CatalogPackage = {
  id: string | number;
  name?: string;
  name_ar?: string;
  title?: string;
  price?: number;
  totalPulses?: number;
  total_pulses?: number;
  packageType?: string;
  package_type?: string;
};

export default function LaserDeficitPrompt({
  reservationId,
  headers,
  isRTL = false,
  onStateChange,
  onResolved,
}: {
  reservationId: string;
  headers: Record<string, string>;
  isRTL?: boolean;
  onStateChange?: (s: { unresolved: boolean; deficitPulses: number }) => void;
  onResolved?: (result: any) => void;
}) {
  const [info, setInfo] = useState<DeficitInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [choice, setChoice] = useState<"BUY_NEW_PACKAGE" | "PAY_PER_PULSE" | null>(null);
  const [catalogPackages, setCatalogPackages] = useState<CatalogPackage[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountPaid, setAmountPaid] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [resolvedResult, setResolvedResult] = useState<any>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/reservations/laser-deficit?reservationId=${encodeURIComponent(reservationId)}`, { headers });
        const data = await res.json().catch(() => null);
        if (!active) return;
        if (!res.ok) {
          setError(data?.error || "Failed to load laser deficit state.");
          onStateChange?.({ unresolved: false, deficitPulses: 0 });
          return;
        }
        setInfo(data);
        onStateChange?.({ unresolved: !data.resolved && data.deficitPulses > 0, deficitPulses: data.deficitPulses || 0 });
      } catch {
        if (active) {
          setError("Failed to load laser deficit state.");
          onStateChange?.({ unresolved: false, deficitPulses: 0 });
        }
      }
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservationId]);

  // Catalog packages are only needed for the buy-new-package choice.
  useEffect(() => {
    if (choice !== "BUY_NEW_PACKAGE") return;
    let active = true;
    fetch("/api/packages", { headers })
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        const list: CatalogPackage[] = data.packages || data || [];
        setCatalogPackages(list.filter((p) => p.packageType === "pulses" || p.package_type === "pulses" || Number(p.totalPulses ?? p.total_pulses ?? 0) > 0));
      })
      .catch(() => { if (active) setCatalogPackages([]); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choice]);

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-300 bg-rose-50/90 p-3.5 text-xs text-rose-900">
        {error}
      </div>
    );
  }
  if (!info || info.noActivePackage || info.deficitPulses <= 0) return null;

  if (info.resolved || resolvedResult) {
    return (
      <div className="rounded-2xl border border-emerald-300 bg-emerald-50/90 p-3.5 text-xs text-emerald-900 font-semibold">
        {isRTL ? "تمت تسوية عجز النبضات بالفعل لهذا الحجز." : "The pulse deficit for this booking is already resolved."}
      </div>
    );
  }

  const selectedPkg = catalogPackages.find((p) => String(p.id) === selectedPackageId);
  const rate = info.resolvedRate;

  const submit = async () => {
    if (!choice) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/reservations/laser-deficit", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          reservationId,
          choice,
          packageId: choice === "BUY_NEW_PACKAGE" ? selectedPackageId : undefined,
          sourceCustomerPackageId: info.sourceCustomerPackageId || undefined,
          paymentMethod,
          amountPaid: amountPaid !== "" ? Number(amountPaid) : undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || (isRTL ? "فشلت تسوية العجز." : "Failed to resolve the deficit."));
        return;
      }
      setResolvedResult(data);
      onStateChange?.({ unresolved: false, deficitPulses: 0 });
      onResolved?.(data);
    } catch {
      setError(isRTL ? "فشلت تسوية العجز." : "Failed to resolve the deficit.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-4 text-xs text-amber-950 space-y-3 animate-fadeIn">
      <div className="flex items-center gap-1.5 font-bold">
        <AlertTriangle size={15} className="text-amber-600 shrink-0" />
        <span>{isRTL ? "عجز في نبضات الباقة — يلزم التسوية قبل إتمام الدفع" : "Package Pulse Deficit — must be resolved before checkout"}</span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-white/70 border border-amber-200 p-2">
          <div className="text-[10px] font-bold text-amber-700 uppercase">{isRTL ? "النبضات المسجلة" : "Delivered"}</div>
          <div className="font-black text-sm">{info.deliveredPulses.toLocaleString()}</div>
        </div>
        <div className="rounded-xl bg-white/70 border border-amber-200 p-2">
          <div className="text-[10px] font-bold text-amber-700 uppercase">{isRTL ? "رصيد الباقة" : "Balance"}</div>
          <div className="font-black text-sm">{info.remainingPulses.toLocaleString()}</div>
        </div>
        <div className="rounded-xl bg-amber-100 border border-amber-300 p-2">
          <div className="text-[10px] font-bold text-amber-800 uppercase">{isRTL ? "العجز" : "Deficit"}</div>
          <div className="font-black text-sm text-amber-900">{info.deficitPulses.toLocaleString()}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setChoice("BUY_NEW_PACKAGE")}
          className={`rounded-xl border-2 p-3 text-start transition ${choice === "BUY_NEW_PACKAGE" ? "border-purple-600 bg-purple-50" : "border-amber-200 bg-white/70 hover:bg-white"}`}
        >
          <div className="flex items-center gap-1.5 font-bold text-purple-950">
            <Package size={14} /> {isRTL ? "شراء باقة جديدة" : "Buy New Package"}
          </div>
          <p className="mt-1 text-[11px] text-amber-800">
            {isRTL ? "يُخصم العجز من الباقة الجديدة وسعرها على الفاتورة" : "Deficit deducts from the new package; its price goes on the invoice"}
          </p>
        </button>
        <button
          type="button"
          onClick={() => setChoice("PAY_PER_PULSE")}
          className={`rounded-xl border-2 p-3 text-start transition ${choice === "PAY_PER_PULSE" ? "border-amber-600 bg-white" : "border-amber-200 bg-white/70 hover:bg-white"}`}
        >
          <div className="flex items-center gap-1.5 font-bold text-amber-950">
            <Zap size={14} /> {isRTL ? "الدفع بالنبضة" : "Pay Per Pulse"}
          </div>
          <p className="mt-1 text-[11px] text-amber-800">
            {rate !== null
              ? (isRTL
                  ? `${info.deficitPulses.toLocaleString()} نبضة × ${rate} ج.م = ${(info.deficitPulses * rate).toLocaleString()} ج.م`
                  : `${info.deficitPulses.toLocaleString()} pulses × ${rate} EGP = ${(info.deficitPulses * rate).toLocaleString()} EGP`)
              : (isRTL ? "سعر النبضة غير مضبوط — اضبطه في إعدادات الحجز" : "Per-pulse rate not configured — set it in Booking Settings")}
          </p>
        </button>
      </div>

      {choice === "BUY_NEW_PACKAGE" && (
        <div className="space-y-2">
          <label className="block text-[11px] font-bold text-amber-800">
            {isRTL ? "اختر الباقة الجديدة" : "Select the new package"} <span className="text-purple-700">*</span>
          </label>
          <select
            value={selectedPackageId}
            onChange={(e) => setSelectedPackageId(e.target.value)}
            className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-[#1F251A] outline-none focus:border-purple-600"
          >
            <option value="">{isRTL ? "— اختر —" : "— select —"}</option>
            {catalogPackages.map((p) => {
              const quota = Number(p.totalPulses ?? p.total_pulses ?? 0);
              return (
                <option key={String(p.id)} value={String(p.id)} disabled={quota <= 0}>
                  {(isRTL && p.name_ar ? p.name_ar : p.name || p.title)} ({quota > 0 ? `${quota.toLocaleString()} pulses` : (isRTL ? "بدون حصة" : "no quota configured")} · {Number(p.price || 0).toLocaleString()} EGP)
                </option>
              );
            })}
          </select>
        </div>
      )}

      {choice && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-bold text-amber-800 mb-1">{isRTL ? "طريقة الدفع" : "Payment method"}</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-[#1F251A] outline-none"
            >
              <option value="cash">{isRTL ? "نقدي" : "Cash"}</option>
              <option value="card">{isRTL ? "بطاقة" : "Card"}</option>
              <option value="instapay">{isRTL ? "إنستاباي" : "InstaPay"}</option>
              <option value="transfer">{isRTL ? "تحويل" : "Transfer"}</option>
              <option value="wallet">{isRTL ? "محفظة" : "Wallet"}</option>
            </select>
          </div>
          {choice === "BUY_NEW_PACKAGE" && (
            <div>
              <label className="block text-[11px] font-bold text-amber-800 mb-1">{isRTL ? "المدفوع الآن (اختياري)" : "Paid now (optional)"}</label>
              <input
                type="number"
                min={0}
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                placeholder={String(Number(selectedPkg?.price || 0))}
                className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-[#1F251A] outline-none"
              />
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        disabled={submitting || !choice || (choice === "BUY_NEW_PACKAGE" && !selectedPackageId) || (choice === "PAY_PER_PULSE" && rate === null)}
        onClick={submit}
        className="w-full rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs py-2.5 transition"
      >
        {submitting
          ? (isRTL ? "جارٍ التسوية…" : "Resolving…")
          : (isRTL ? "تسوية العجز" : "Resolve Deficit")}
      </button>
    </div>
  );
}
