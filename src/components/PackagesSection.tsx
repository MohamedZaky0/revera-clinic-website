"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { ServiceItem, getEffectiveServicePrice } from "@/lib/services";
import { CLIENT } from "@/config/client";

type PackageItemApi = {
  id?: string;
  serviceId: number;
  serviceName?: string;
  serviceNameAr?: string;
  qty: number;
};

type PackageOfferApi = {
  id: string;
  name: string;
  nameAr: string | null;
  price: number;
  active: boolean;
  showOnWebsite: boolean;
  items: PackageItemApi[];
};

interface PackageCardProps {
  pkg: PackageOfferApi;
  alacarteTotal: number;
  isRTL: boolean;
  lang: string;
}

function PackageCard({ pkg, alacarteTotal, isRTL, lang }: PackageCardProps) {
  const [hovered, setHovered] = useState(false);
  const title = isRTL && pkg.nameAr ? pkg.nameAr : pkg.name;
  const hasSavings = alacarteTotal > pkg.price;
  const savings = Math.round(alacarteTotal - pkg.price);
  const currency = lang === "ar" ? "ج.م" : "EGP";

  const handleInquire = () => {
    const message = isRTL
      ? `مرحباً، أنا مهتم بباقة "${title}".`
      : `Hello, I'm interested in the "${title}" package.`;
    let cleanWhatsapp = (CLIENT.whatsappNumber || "").replace(/[^0-9]/g, "");
    if (cleanWhatsapp.startsWith("200")) {
      cleanWhatsapp = "20" + cleanWhatsapp.slice(3);
    } else if (cleanWhatsapp.startsWith("0")) {
      cleanWhatsapp = "20" + cleanWhatsapp.slice(1);
    }
    window.open(`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(message)}`, "_blank");
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: "var(--cr-secondary)",
        borderRadius: 24,
        overflow: "hidden",
        border: `1px solid ${hovered ? "rgba(90, 106, 81, 0.5)" : "rgba(90, 106, 81, 0.2)"}`,
        boxShadow: hovered
          ? "0 16px 48px rgba(90, 61, 52, 0.18), 0 4px 12px rgba(90, 61, 52, 0.10)"
          : "0 2px 20px rgba(90, 61, 52, 0.08)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        transform: hovered ? "translateY(-5px)" : "translateY(0)",
        transition: "box-shadow 0.35s cubic-bezier(0.16, 1, 0.3, 1), transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.35s ease",
        padding: 24,
      }}
    >
      <h3
        style={{
          margin: 0,
          fontFamily: "var(--font-marcellus), serif",
          fontSize: 22,
          fontWeight: 400,
          color: "var(--cr-primary)",
          lineHeight: 1.2,
        }}
      >
        {title}
      </h3>

      <ul
        style={{
          margin: "14px 0 0",
          padding: 0,
          listStyle: "none",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          fontFamily: "var(--font-sora), sans-serif",
          fontSize: 13,
          color: "var(--color-brand-secondary)",
        }}
      >
        {pkg.items.map((it, idx) => {
          const itemName = isRTL && it.serviceNameAr ? it.serviceNameAr : it.serviceName || "";
          return (
            <li key={it.id || idx} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span>{itemName}</span>
              <span style={{ opacity: 0.7 }}>{isRTL ? `×${it.qty}` : `×${it.qty}`}</span>
            </li>
          );
        })}
      </ul>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8,
          marginTop: 18,
          fontFamily: "var(--font-sora), sans-serif",
        }}
      >
        <span style={{ fontSize: 18, fontWeight: 700, color: "#C4AE7C" }}>
          {pkg.price.toLocaleString()} {currency}
        </span>
        {hasSavings && (
          <>
            <span
              style={{
                fontSize: 13,
                fontWeight: 400,
                color: "rgba(90, 106, 81, 0.45)",
                textDecoration: "line-through",
              }}
            >
              {alacarteTotal.toLocaleString()} {currency}
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#FFFFFF",
                backgroundColor: "#C4AE7C",
                padding: "2px 6px",
                borderRadius: 6,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {isRTL ? `وفر ${savings.toLocaleString()} ${currency}` : `SAVE ${savings.toLocaleString()} ${currency}`}
            </span>
          </>
        )}
      </div>

      <button
        onClick={handleInquire}
        style={{
          marginTop: 20,
          padding: "12px 20px",
          borderRadius: 50,
          border: "none",
          backgroundColor: "var(--cr-primary)",
          color: "var(--cr-white)",
          fontFamily: "var(--font-sora), sans-serif",
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
          transition: "opacity 0.3s ease",
          opacity: hovered ? 0.9 : 1,
        }}
      >
        {isRTL ? "استفسر عبر واتساب" : "Inquire on WhatsApp"}
      </button>
    </div>
  );
}

export function PackagesSection() {
  const { t, language, isRTL } = useLanguage();
  const [packages, setPackages] = useState<PackageOfferApi[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/packages").then((res) => (res.ok ? res.json() : [])),
      fetch("/api/services").then((res) => (res.ok ? res.json() : [])),
    ])
      .then(([packagesData, servicesData]) => {
        setPackages(Array.isArray(packagesData) ? packagesData : []);
        setServices(Array.isArray(servicesData) ? servicesData : []);
      })
      .catch(() => {
        setPackages([]);
        setServices([]);
      })
      .finally(() => setLoaded(true));
  }, []);

  const visiblePackages = packages.filter((pkg) => pkg.active && pkg.showOnWebsite);

  if (loaded && visiblePackages.length === 0) return null;

  const serviceMap = new Map<number, ServiceItem>();
  services.forEach((s) => serviceMap.set(Number(s.id), s));

  return (
    <section id="packages" className="bg-white section-padding" style={{ overflow: "hidden", paddingBottom: "100px" }}>
      <div className="cr-container" style={{ maxWidth: "1480px" }}>
        <div
          style={{
            position: "relative",
            backgroundColor: "var(--cr-secondary)",
            borderRadius: "32px",
            border: "1px solid rgba(90, 106, 81, 0.25)",
            overflow: "hidden",
            padding: "80px 48px",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <span
              className="section-tag mb-0"
              style={{ fontSize: "20px", letterSpacing: isRTL ? "normal" : "0.15em" }}
            >
              {t.packages.tag}
            </span>
            <h2
              style={{
                maxWidth: 760,
                margin: "14px auto 0",
                lineHeight: 1.2,
                fontFamily: "var(--font-marcellus), serif",
                color: "var(--cr-primary)",
                fontSize: "clamp(26px, 4vw, 42px)",
                fontWeight: 400,
              }}
            >
              {t.packages.heading}
            </h2>
          </div>

          <div
            className="pkg-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(180px, 1fr))",
              gap: 40,
            }}
          >
            {visiblePackages.map((pkg) => {
              const alacarteTotal = pkg.items.reduce((sum, it) => {
                const svc = serviceMap.get(it.serviceId);
                return sum + (svc ? getEffectiveServicePrice(svc) * it.qty : 0);
              }, 0);
              return (
                <PackageCard key={pkg.id} pkg={pkg} alacarteTotal={alacarteTotal} isRTL={isRTL} lang={language} />
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .pkg-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 480px) {
          .pkg-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
