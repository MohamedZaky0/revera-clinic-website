"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import { computeRevenueBridge, type RevenueBridge } from "@/lib/financeBridge";

/**
 * DEC-088 item 9: explains, on the P&L itself, why cash received and revenue earned are different numbers — so an owner
 * who collected 50,000 and sees 10,000 of revenue reads the reason instead of concluding the system is wrong.
 * Cash and package cash come from /api/finance/revenue-bridge; revenue earned and package revenue recognised come from
 * the P&L the parent already loaded, so the bridge always adds up to the figure shown above it.
 */

interface Props {
  period: string;
  branchId: string;
  accessToken?: string;
  revenueEarned: number;
  packageRecognised: number;
}

function egp(n: number): string {
  return `EGP ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function RevenueBridgeCard({ period, branchId, accessToken, revenueEarned, packageRecognised }: Props) {
  const [cash, setCash] = useState<{ cashReceived: number; packageCashReceived: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const headers = useMemo(
    () => (accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined),
    [accessToken]
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ period });
        if (branchId) params.set("branchId", branchId);
        const res = await fetch(`/api/finance/revenue-bridge?${params}`, { headers, cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "Unable to load the revenue bridge.");
        if (!cancelled) setCash({ cashReceived: Number(json.cashReceived || 0), packageCashReceived: Number(json.packageCashReceived || 0) });
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Failed to load the revenue bridge.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [period, branchId, headers]);

  const bridge: RevenueBridge | null = cash
    ? computeRevenueBridge({ ...cash, packageRecognised, revenueEarned })
    : null;

  const rows: { key: string; label: string; labelAr: string; value: number; sign: "" | "−" | "+" | "="; hint?: string; strong?: boolean }[] = bridge
    ? [
        { key: "cash", label: "Cash received", labelAr: "المقبوض", value: bridge.cashReceived, sign: "", hint: "Everything customers paid this month — the Cash Flow figure." },
        { key: "pkgcash", label: "Paid for packages, not yet delivered", labelAr: "مدفوع لباقات لم تُنفَّذ بعد", value: bridge.packageCashReceived, sign: "−", hint: "Owed back as sessions or pulses. It becomes revenue as they are delivered." },
        { key: "recognised", label: "Earned this month from packages", labelAr: "إيراد باقات تم تنفيذه هذا الشهر", value: bridge.packageRecognised, sign: "+", hint: "Sessions and pulses delivered this month, from packages paid for now or earlier." },
        { key: "timing", label: "Other timing (unpaid or paid in another month)", labelAr: "فروق توقيت أخرى (غير مدفوع أو مدفوع في شهر آخر)", value: bridge.otherTiming, sign: bridge.otherTiming < 0 ? "−" : "+", hint: "Services and products billed but not paid yet, or paid in a different month." },
        { key: "revenue", label: "Revenue earned", labelAr: "الإيراد المُحقَّق", value: bridge.revenueEarned, sign: "=", strong: true },
      ]
    : [];

  return (
    <div
      className="rounded-[32px] border p-6 shadow-sm"
      style={{ backgroundColor: "var(--cr-white)", borderColor: "var(--cr-divider)" }}
      data-testid="revenue-bridge"
    >
      <h3 className="mb-1 text-lg font-semibold" style={{ color: "var(--cr-dark)" }}>
        From cash received to revenue earned
        <span className="ms-2 text-sm font-medium text-muted-foreground" dir="rtl">من المقبوض إلى الإيراد المُحقَّق</span>
      </h3>
      <p className="mb-4 text-sm text-muted-foreground">
        Cash received and revenue earned are different on purpose: money paid for a package is collected now but earned
        only as its sessions or pulses are delivered.
      </p>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700" role="alert">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {loading && !cash ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : bridge ? (
        <table className="w-full text-sm">
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className={r.strong ? "border-t-2" : "border-t"} style={{ borderColor: "var(--cr-divider)" }}>
                <td className="w-8 py-2.5 text-center font-semibold text-muted-foreground" aria-hidden="true">{r.sign}</td>
                <td className="py-2.5 pe-4">
                  <span className={r.strong ? "font-semibold" : ""} style={{ color: "var(--cr-dark)" }}>{r.label}</span>
                  <span className="ms-2 text-xs text-muted-foreground" dir="rtl">{r.labelAr}</span>
                  {r.hint && <p className="text-xs text-muted-foreground">{r.hint}</p>}
                </td>
                <td className={`whitespace-nowrap py-2.5 text-end tabular-nums ${r.strong ? "font-semibold" : ""}`} style={{ color: "var(--cr-dark)" }}>
                  {egp(Math.abs(r.value))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
