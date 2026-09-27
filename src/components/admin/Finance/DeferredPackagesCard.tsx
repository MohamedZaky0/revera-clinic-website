"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Package } from "lucide-react";
import type { DeferredBreakdown } from "@/lib/financeBridge";

/**
 * DEC-088 item 9: the deferred package balance — money customers paid for services the clinic has not delivered yet —
 * and what it is owed for, e.g. "EGP 40,000 = 30,000 pulses + 5 Underarm sessions + 6 Full Body sessions". A balance as
 * of now (not a period figure), clinic-wide. Packages whose price is still pending are listed, never counted as 0.
 */

type Response = DeferredBreakdown & { asOf: string };

function egp(n: number): string {
  return `EGP ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function DeferredPackagesCard({ accessToken }: { accessToken?: string }) {
  const [data, setData] = useState<Response | null>(null);
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
        const res = await fetch("/api/finance/deferred-packages", { headers, cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "Unable to load the deferred package balance.");
        if (!cancelled) setData(json);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Failed to load the deferred package balance.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [headers]);

  const parts: string[] = [];
  if (data && data.pulses.pulsesRemaining > 0) parts.push(`${data.pulses.pulsesRemaining.toLocaleString()} pulses`);
  if (data) for (const s of data.services) parts.push(`${s.sessionsRemaining.toLocaleString()} ${s.serviceName} session${s.sessionsRemaining === 1 ? "" : "s"}`);

  return (
    <div
      className="rounded-[32px] border p-6 shadow-sm"
      style={{ backgroundColor: "var(--cr-white)", borderColor: "var(--cr-divider)" }}
      data-testid="deferred-packages"
    >
      <div className="mb-1 flex items-center gap-2">
        <Package size={18} style={{ color: "var(--cr-accent)" }} />
        <h3 className="text-lg font-semibold" style={{ color: "var(--cr-dark)" }}>
          Package balance owed to customers
          <span className="ms-2 text-sm font-medium text-muted-foreground" dir="rtl">رصيد الباقات المؤجل</span>
        </h3>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Money already collected for pulses and sessions the clinic has not delivered yet. It is not lost — it becomes
        revenue as each pulse or session is delivered. As of now, all branches.
      </p>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700" role="alert">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {loading && !data ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : data ? (
        <div className="space-y-4">
          <div>
            <p className="text-2xl font-semibold tabular-nums" style={{ color: "var(--cr-dark)" }} data-testid="deferred-total">
              {egp(data.total)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground" data-testid="deferred-summary">
              {parts.length > 0 ? `= paid for ${parts.join(" + ")}` : "Nothing is owed to customers right now."}
            </p>
          </div>

          {(data.pulses.pulsesRemaining > 0 || data.services.length > 0) && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="pb-2 text-start font-semibold">Owed for</th>
                  <th className="pb-2 text-end font-semibold">Remaining</th>
                  <th className="pb-2 text-end font-semibold">Worth</th>
                </tr>
              </thead>
              <tbody>
                {data.pulses.pulsesRemaining > 0 && (
                  <tr className="border-t" style={{ borderColor: "var(--cr-divider)" }}>
                    <td className="py-2" style={{ color: "var(--cr-dark)" }}>Laser pulses <span className="text-xs text-muted-foreground">({data.pulses.packages} package{data.pulses.packages === 1 ? "" : "s"})</span></td>
                    <td className="py-2 text-end tabular-nums">{data.pulses.pulsesRemaining.toLocaleString()} pulses</td>
                    <td className="py-2 text-end tabular-nums">{egp(data.pulses.amount)}</td>
                  </tr>
                )}
                {data.services.map((s) => (
                  <tr key={`${s.serviceId ?? s.serviceName}`} className="border-t" style={{ borderColor: "var(--cr-divider)" }}>
                    <td className="py-2" style={{ color: "var(--cr-dark)" }}>{s.serviceName}</td>
                    <td className="py-2 text-end tabular-nums">{s.sessionsRemaining.toLocaleString()} session{s.sessionsRemaining === 1 ? "" : "s"}</td>
                    <td className="py-2 text-end tabular-nums">{egp(s.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {data.expiredTotal > 0 && (
            <p className="text-xs text-muted-foreground" data-testid="deferred-expired">
              Includes {egp(data.expiredTotal)} on packages past their expiry date. It stays here until expired balances
              are recognised as revenue — that is not built yet.
            </p>
          )}

          {data.pending.count > 0 && (
            <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900" data-testid="deferred-pending">
              <p className="flex items-center gap-2 font-semibold">
                <AlertCircle size={16} />
                {data.pending.count} package{data.pending.count === 1 ? "" : "s"} with no invoice value yet — not counted above
              </p>
              <p className="mt-1 text-xs text-amber-800">
                Enter the amount paid in the patient&apos;s profile → Packages → &quot;Enter value&quot;. Until then no revenue is
                recognised for them.
              </p>
              <ul className="mt-2 space-y-0.5 text-xs">
                {data.pending.packages.map((p) => (
                  <li key={p.id}>
                    {p.customerName} — {p.packageName} ({p.remaining.toLocaleString()} {p.packageType === "pulses" ? "pulses" : "sessions"} left)
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
