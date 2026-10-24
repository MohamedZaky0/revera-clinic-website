"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import { isClockSkewed, splitSkew } from "@/lib/clockSkew";

interface ClockSkewBannerProps {
  /** This computer's clock minus the server's, in ms; null while unknown. */
  skewMs: number | null;
  lang: "en" | "ar";
}

/**
 * Shown when this computer's clock is clearly out compared with the server (RISK-130). A clock that
 * is about an hour out drops staff logins at random; the person at that computer is the only one who
 * can fix it, so it says exactly what to do.
 */
export default function ClockSkewBanner({ skewMs, lang }: ClockSkewBannerProps) {
  if (!isClockSkewed(skewMs)) return null;
  const { hours, minutes, ahead } = splitSkew(skewMs as number);

  const en = {
    amount: [hours ? `${hours} hour${hours === 1 ? "" : "s"}` : "", minutes ? `${minutes} min` : ""].filter(Boolean).join(" "),
    direction: ahead ? "ahead of" : "behind",
  };
  const ar = {
    amount: [hours ? `${hours} ساعة` : "", minutes ? `${minutes} دقيقة` : ""].filter(Boolean).join(" و"),
    direction: ahead ? "متقدمة عن" : "متأخرة عن",
  };

  return (
    <div
      role="alert"
      data-testid="clock-skew-banner"
      dir={lang === "ar" ? "rtl" : "ltr"}
      className="mt-2 flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs sm:text-sm text-amber-900"
    >
      <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" />
      <p className="leading-relaxed">
        {lang === "ar" ? (
          <>
            ساعة هذا الجهاز {ar.direction} الوقت الحقيقي بحوالي {ar.amount}، وقد يؤدي ذلك إلى تسجيل خروجك فجأة. افتح إعدادات Windows، ثم الوقت واللغة،
            ثم التاريخ والوقت، وفعّل «ضبط الوقت تلقائيًا» واضغط «المزامنة الآن»، ولا تغيّر الوقت يدويًا، ثم أعد تحميل الصفحة.
          </>
        ) : (
          <>
            This computer&apos;s clock is about {en.amount} {en.direction} the real time, which can sign you out without warning. Open Windows
            Settings, then Time &amp; language, then Date &amp; time, turn on &quot;Set time automatically&quot;, press &quot;Sync now&quot;, do not set
            the time by hand, and reload this page.
          </>
        )}
      </p>
    </div>
  );
}
