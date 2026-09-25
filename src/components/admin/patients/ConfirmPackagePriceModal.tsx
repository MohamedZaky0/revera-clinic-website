"use client";

import { useState } from "react";
import { X, Zap } from "lucide-react";

/**
 * DEC-088 item 6: "Enter invoice value" for a historical package whose price was left pending (no invoice value was
 * entered when the past booking was added). Staff enter what the patient actually paid for the package and, for a
 * pulses package, how many pulses were already used before the clinic started using the system. The catalog price is
 * shown only as a suggestion — it is never saved unless staff press "Use catalog price" and then save.
 * Self-contained like LaserDeficitPrompt: it calls PATCH /api/customers/packages { action: 'confirm_package_price' }.
 */

export type ConfirmablePackage = {
  id: string;
  packageName?: string;
  packageType?: string;
  totalPulses?: number;
  pulsesRemaining?: number;
  purchasedAt?: string;
};

type Props = {
  pkg: ConfirmablePackage;
  suggestedPrice?: number | null;
  headers: Record<string, string>;
  isRTL?: boolean;
  onClose: () => void;
  onSaved: (result: { pricePaid: number; pulsesUsed: number; pulsesRemaining: number }) => void;
};

export default function ConfirmPackagePriceModal({ pkg, suggestedPrice, headers, isRTL = false, onClose, onSaved }: Props) {
  const isPulses = pkg.packageType === "pulses";
  const remaining = Math.max(0, Number(pkg.pulsesRemaining ?? 0));
  const [price, setPrice] = useState("");
  const [pulsesUsed, setPulsesUsed] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tr = (en: string, ar: string) => (isRTL ? ar : en);

  const priceNum = price.trim() === "" ? NaN : Number(price);
  const usedNum = pulsesUsed.trim() === "" ? 0 : Number(pulsesUsed);
  const priceValid = Number.isFinite(priceNum) && priceNum >= 0;
  const usedValid = !isPulses || (Number.isInteger(usedNum) && usedNum >= 0 && usedNum <= remaining);
  const canSave = priceValid && usedValid && !submitting;
  const balanceAfter = isPulses && usedValid ? remaining - usedNum : null;

  async function save() {
    if (!canSave) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/customers/packages", {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          action: "confirm_package_price",
          customer_package_id: pkg.id,
          price_paid: priceNum,
          pulses_used_before: isPulses ? usedNum : 0,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        setError(data?.error || tr("Could not save the invoice value. Try again.", "تعذّر حفظ قيمة الفاتورة. حاول مرة أخرى."));
        return;
      }
      onSaved({ pricePaid: Number(data.pricePaid), pulsesUsed: Number(data.pulsesUsed), pulsesRemaining: Number(data.pulsesRemaining) });
      onClose();
    } catch {
      setError(tr("Network error. The value was not saved.", "خطأ في الاتصال. لم يتم حفظ القيمة."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" dir={isRTL ? "rtl" : "ltr"}>
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-package-price-title"
        className="relative z-10 w-full max-w-md space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between border-b border-gray-100 pb-3">
          <div>
            <h4 id="confirm-package-price-title" className="text-base font-bold text-gray-900">
              {tr("Enter invoice value", "أدخل قيمة الفاتورة")}
            </h4>
            <p className="mt-0.5 text-xs text-gray-600">
              {pkg.packageName || tr("Package", "باقة")}
              {pkg.purchasedAt ? ` · ${new Date(pkg.purchasedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}` : ""}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label={tr("Close", "إغلاق")} className="text-gray-400 transition hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="confirm-package-price" className="block text-xs font-semibold text-gray-700">
            {tr("Amount the patient actually paid for this package (EGP)", "المبلغ الذي دفعه المريض فعلاً في هذه الباقة (جنيه)")}
          </label>
          <input
            id="confirm-package-price"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-[var(--cr-accent)]"
          />
          {suggestedPrice != null && suggestedPrice > 0 && (
            <p className="flex flex-wrap items-center gap-1.5 text-[11px] text-gray-500">
              <span>
                {tr("Catalog price", "سعر الكتالوج")}: EGP {Number(suggestedPrice).toLocaleString()} —{" "}
                {tr("a suggestion only, not saved unless you use it", "اقتراح فقط، ولا يُحفظ إلا إذا استخدمته")}
              </span>
              <button
                type="button"
                onClick={() => setPrice(String(suggestedPrice))}
                className="font-semibold text-[var(--cr-primary)] underline underline-offset-2"
              >
                {tr("Use catalog price", "استخدم سعر الكتالوج")}
              </button>
            </p>
          )}
        </div>

        {isPulses && (
          <div className="space-y-1.5">
            <label htmlFor="confirm-package-pulses" className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
              <Zap size={12} className="text-amber-600" />
              {tr("Pulses already used before the clinic started using the system", "النبضات المستخدمة قبل بدء العيادة على النظام")}
            </label>
            <input
              id="confirm-package-pulses"
              type="number"
              inputMode="numeric"
              min={0}
              max={remaining}
              step={1}
              value={pulsesUsed}
              onChange={(e) => setPulsesUsed(e.target.value)}
              placeholder="0"
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-[var(--cr-accent)]"
            />
            <p className="text-[11px] text-gray-500">
              {tr("Current balance", "الرصيد الحالي")}: {remaining.toLocaleString()} {tr("pulses", "نبضة")}
              {balanceAfter !== null && usedNum > 0 && (
                <>
                  {" · "}
                  <span className="font-semibold text-gray-800">
                    {tr("Balance after saving", "الرصيد بعد الحفظ")}: {balanceAfter.toLocaleString()}
                  </span>
                </>
              )}
            </p>
            {!usedValid && (
              <p role="alert" className="text-[11px] font-semibold text-red-700">
                {tr(`Enter a whole number from 0 to ${remaining.toLocaleString()}.`, `أدخل رقماً صحيحاً من 0 إلى ${remaining.toLocaleString()}.`)}
              </p>
            )}
            <p className="text-[11px] text-gray-500">
              {tr(
                "Pulses used before launch are not counted as revenue in the reports — only pulses used from now on are.",
                "النبضات المستخدمة قبل البدء لا تُحسب إيراداً في التقارير — فقط النبضات المستخدمة من الآن."
              )}
            </p>
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-3.5 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50">
            {tr("Cancel", "إلغاء")}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!canSave}
            className="rounded-lg bg-[var(--cr-primary)] px-3.5 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? tr("Saving…", "جارٍ الحفظ…") : tr("Save invoice value", "حفظ قيمة الفاتورة")}
          </button>
        </div>
      </div>
    </div>
  );
}
