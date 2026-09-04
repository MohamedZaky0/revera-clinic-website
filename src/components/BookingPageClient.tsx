"use client";

import Link from "next/link";
import Image from "next/image";
import { BookingModal } from "@/components/BookingModal";
import { useLanguage } from "@/contexts/LanguageContext";
import { CLIENT } from "@/config/client";

type BookingPageClientProps = {
  initialServiceId: number | null;
};

/**
 * Minimal, focused shell for the /book landing page — logo + language toggle only, no full
 * site nav/footer, so ad traffic lands on the booking flow itself with nothing else competing
 * for attention. Service/category browsing already happens inside BookingModal's Step 1.
 */
export function BookingPageClient({ initialServiceId }: BookingPageClientProps) {
  const { language, setLanguage, isRTL } = useLanguage();

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "var(--cr-divider)" }}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <header className="flex items-center justify-between px-4 sm:px-8 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src={CLIENT.logoPath} alt={CLIENT.name} width={36} height={36} style={{ objectFit: "contain" }} />
          <span className="font-semibold text-sm sm:text-base" style={{ color: "var(--cr-primary)" }}>
            {CLIENT.name}
          </span>
        </Link>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setLanguage("en")}
            aria-label="Switch to English"
            className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors"
            style={{
              borderColor: "var(--cr-accent)",
              color: "var(--cr-primary)",
              background: language === "en" ? "rgba(90,61,52,0.1)" : "transparent",
              fontWeight: language === "en" ? 600 : 400,
            }}
          >
            <Image src="/images/flag/en.png" alt="English" width={16} height={12} style={{ width: "auto", height: "auto", borderRadius: "2px" }} />
            <span>English</span>
          </button>
          <button
            type="button"
            onClick={() => setLanguage("ar")}
            aria-label="Switch to Arabic"
            className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors"
            style={{
              borderColor: "var(--cr-accent)",
              color: "var(--cr-primary)",
              background: language === "ar" ? "rgba(90,61,52,0.1)" : "transparent",
              fontWeight: language === "ar" ? 600 : 400,
            }}
          >
            <Image src="/images/flag/ar.png" alt="عربي" width={16} height={12} style={{ width: "auto", height: "auto", borderRadius: "2px" }} />
            <span>عربي</span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-start sm:items-center justify-center px-4 py-6 sm:py-10">
        <BookingModal variant="page" initialServiceId={initialServiceId} />
      </main>
    </div>
  );
}
