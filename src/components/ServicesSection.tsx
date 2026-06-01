"use client";

import { useState } from "react";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import { useLanguage } from "@/contexts/LanguageContext";

// ── Types ─────────────────────────────────────────────────────────────────────

type Category = "dermatology" | "dental";

interface ServiceItem {
  id: number;
  en: string;
  ar: string;
  cost: number;
  img: string;
  cat: Category;
  unit: string;
}

// ── Real service data from Octopii API ────────────────────────────────────────

const SERVICES: ServiceItem[] = [
  // Dermatology
  { id: 40, en: "Consultation", ar: "كشف", cost: 800, img: "https://octopii-prod-space.ams3.cdn.digitaloceanspaces.com/uploads/services/69b14740791dd.jfif", cat: "dermatology", unit: "session" },
  { id: 41, en: "Follow Up", ar: "إعادة كشف", cost: 400, img: "https://octopii-prod-space.ams3.cdn.digitaloceanspaces.com/uploads/services/69b145bf8a5d8.jpg", cat: "dermatology", unit: "session" },
  { id: 9,  en: "Botox", ar: "بوتوكس", cost: 5750, img: "https://octopii-prod-space.ams3.cdn.digitaloceanspaces.com/uploads/services/69b13668aa956.jpg", cat: "dermatology", unit: "session" },
  { id: 30, en: "Laser HR Face", ar: "ليزر وجه", cost: 300, img: "https://octopii-prod-space.ams3.cdn.digitaloceanspaces.com/uploads/services/69b140dc917ce.jpg", cat: "dermatology", unit: "session" },
  { id: 32, en: "Laser HR Underarms", ar: "ليزر إبط", cost: 200, img: "https://octopii-prod-space.ams3.cdn.digitaloceanspaces.com/uploads/services/69b15909e6605.jpg", cat: "dermatology", unit: "session" },
  { id: 3,  en: "Chemical Peeling", ar: "تقشير كيميائي", cost: 700, img: "https://octopii-prod-space.ams3.cdn.digitaloceanspaces.com/uploads/services/69b147c7d1149.jpg", cat: "dermatology", unit: "session" },
  { id: 8,  en: "Skin Tag Removal", ar: "إزالة الزوائد الجلدية", cost: 700, img: "https://octopii-prod-space.ams3.cdn.digitaloceanspaces.com/uploads/services/69b158ea64e65.jpg", cat: "dermatology", unit: "session" },
  { id: 12, en: "Lip Filler (France)", ar: "فيلر الشفايف فرنسي", cost: 7000, img: "https://octopii-prod-space.ams3.cdn.digitaloceanspaces.com/uploads/services/69b1699d40d92.jpg", cat: "dermatology", unit: "session" },
  { id: 7,  en: "HIFU", ar: "هايفو", cost: 6000, img: "https://octopii-prod-space.ams3.cdn.digitaloceanspaces.com/uploads/services/69b164f794a42.jpg", cat: "dermatology", unit: "session" },
  { id: 10, en: "Skin Booster", ar: "سكين بوستر", cost: 8500, img: "https://octopii-prod-space.ams3.cdn.digitaloceanspaces.com/uploads/services/69b167b6acadc.jpg", cat: "dermatology", unit: "session" },
  { id: 23, en: "Laser 2000 Pulses Package", ar: "باكدج 2000 نبضة", cost: 1200, img: "https://octopii-prod-space.ams3.cdn.digitaloceanspaces.com/uploads/services/69b1672cb2d0a.jpeg", cat: "dermatology", unit: "session" },
  { id: 24, en: "Laser 5000 Pulses Package", ar: "باكدج 5000 نبضة", cost: 2500, img: "https://octopii-prod-space.ams3.cdn.digitaloceanspaces.com/uploads/services/69b140dc917ce.jpg", cat: "dermatology", unit: "session" },
  { id: 36, en: "Laser Full Legs", ar: "ليزر ساق كامل", cost: 1500, img: "https://octopii-prod-space.ams3.cdn.digitaloceanspaces.com/uploads/services/69b158ea64e65.jpg", cat: "dermatology", unit: "session" },
  // Dental
  { id: 62, en: "Consultation", ar: "كشف", cost: 400, img: "https://octopii-prod-space.ams3.cdn.digitaloceanspaces.com/uploads/services/69b164f794a42.jpg", cat: "dental", unit: "session" },
  { id: 63, en: "Follow Up", ar: "إعادة كشف", cost: 200, img: "https://octopii-prod-space.ams3.cdn.digitaloceanspaces.com/uploads/services/69b167b6acadc.jpg", cat: "dental", unit: "session" },
  { id: 46, en: "Scaling & Polishing", ar: "تنظيف وتلميع الأسنان", cost: 1000, img: "https://octopii-prod-space.ams3.cdn.digitaloceanspaces.com/uploads/services/69b1672cb2d0a.jpeg", cat: "dental", unit: "session" },
  { id: 45, en: "Teeth Whitening", ar: "تبييض الأسنان", cost: 5500, img: "https://octopii-prod-space.ams3.cdn.digitaloceanspaces.com/uploads/services/69b14740791dd.jfif", cat: "dental", unit: "session" },
  { id: 43, en: "E-Max Veneer / Zircon Crown", ar: "فينير إيماكس أو تركيبة زيركون", cost: 5500, img: "https://octopii-prod-space.ams3.cdn.digitaloceanspaces.com/uploads/services/69b145bf8a5d8.jpg", cat: "dental", unit: "session" },
  { id: 53, en: "Simple Extraction", ar: "خلع عادي", cost: 1500, img: "https://octopii-prod-space.ams3.cdn.digitaloceanspaces.com/uploads/services/69b158ea64e65.jpg", cat: "dental", unit: "session" },
  { id: 54, en: "Surgical Extraction", ar: "خلع جراحي", cost: 3500, img: "https://octopii-prod-space.ams3.cdn.digitaloceanspaces.com/uploads/services/69b15909e6605.jpg", cat: "dental", unit: "session" },
  { id: 49, en: "Root Canal (One Canal)", ar: "علاج عصب قناة واحدة", cost: 2000, img: "https://octopii-prod-space.ams3.cdn.digitaloceanspaces.com/uploads/services/69b147c7d1149.jpg", cat: "dental", unit: "session" },
  { id: 47, en: "Composite Filling", ar: "حشو تجميلي", cost: 1400, img: "https://octopii-prod-space.ams3.cdn.digitaloceanspaces.com/uploads/services/69b1699d40d92.jpg", cat: "dental", unit: "session" },
  { id: 55, en: "Egyptian Implant", ar: "زراعة أسنان مصري", cost: 15000, img: "https://octopii-prod-space.ams3.cdn.digitaloceanspaces.com/uploads/services/69b13668aa956.jpg", cat: "dental", unit: "session" },
  { id: 56, en: "Megagen Implant (Korea)", ar: "زراعة ميجاجين – كوري", cost: 17000, img: "https://octopii-prod-space.ams3.cdn.digitaloceanspaces.com/uploads/services/69b140dc917ce.jpg", cat: "dental", unit: "session" },
  { id: 42, en: "Orthodontics", ar: "تقويم أسنان", cost: 45000, img: "https://octopii-prod-space.ams3.cdn.digitaloceanspaces.com/uploads/services/69b164f794a42.jpg", cat: "dental", unit: "session" },
  { id: 64, en: "Panorama X-Ray", ar: "أشعة بانوراما", cost: 300, img: "https://octopii-prod-space.ams3.cdn.digitaloceanspaces.com/uploads/services/69b167b6acadc.jpg", cat: "dental", unit: "session" },
];

// ── Flower icon (inline SVG matching original) ─────────────────────────────

function FlowerIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 8C20 8 16 12 16 16C16 18.2 17.8 20 20 20C22.2 20 24 18.2 24 16C24 12 20 8 20 8Z" fill="#5a3d34" opacity="0.7"/>
      <path d="M20 32C20 32 16 28 16 24C16 21.8 17.8 20 20 20C22.2 20 24 21.8 24 24C24 28 20 32 20 32Z" fill="#5a3d34" opacity="0.7"/>
      <path d="M8 20C8 20 12 16 16 16C18.2 16 20 17.8 20 20C20 22.2 18.2 24 16 24C12 24 8 20 8 20Z" fill="#5a3d34" opacity="0.7"/>
      <path d="M32 20C32 20 28 16 24 16C21.8 16 20 17.8 20 20C20 22.2 21.8 24 24 24C28 24 32 20 32 20Z" fill="#5a3d34" opacity="0.7"/>
      <circle cx="20" cy="20" r="3" fill="#5a3d34"/>
    </svg>
  );
}

// ── Arrow icon (circle with ↗ arrow) ─────────────────────────────────────────

function ArrowIcon() {
  return (
    <div style={{
      width: 44,
      height: 44,
      borderRadius: "50%",
      backgroundColor: "var(--cr-secondary)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    }}>
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M4 14L14 4M14 4H6M14 4V12" stroke="#5a3d34" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

// ── Category card (phase 1) ───────────────────────────────────────────────────

interface CategoryCardProps {
  label: string;
  sublabel: string;
  onClick: () => void;
}

function CategoryCard({ label, sublabel, onClick }: CategoryCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1,
        minWidth: 260,
        padding: "48px 32px",
        borderRadius: 20,
        border: `1.5px solid ${hovered ? "var(--cr-primary)" : "rgba(196,178,159,0.5)"}`,
        background: hovered ? "var(--cr-primary)" : "var(--cr-white)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
        cursor: "pointer",
        transition: "all 0.3s ease",
        textAlign: "center",
      }}
    >
      <div style={{ opacity: hovered ? 0 : 1, transition: "opacity 0.3s", position: "absolute" }}>
        <FlowerIcon />
      </div>
      <div style={{ width: 40, height: 40 }} />
      <div>
        <div style={{
          fontFamily: "var(--font-marcellus), serif",
          fontSize: 22,
          color: hovered ? "var(--cr-white)" : "var(--cr-primary)",
          transition: "color 0.3s",
          marginBottom: 6,
        }}>
          {label}
        </div>
        <div style={{
          fontFamily: "var(--font-sora), sans-serif",
          fontSize: 13,
          color: hovered ? "rgba(255,255,255,0.7)" : "var(--cr-accent)",
          transition: "color 0.3s",
        }}>
          {sublabel}
        </div>
      </div>
    </button>
  );
}

// ── Service card (phase 2) ────────────────────────────────────────────────────

interface ServiceCardProps {
  service: ServiceItem;
  lang: string;
  descText: string;
}

function ServiceCard({ service, lang, descText }: ServiceCardProps) {
  const title = lang === "ar" ? service.ar : service.en;
  const price = `${service.cost.toLocaleString()} EGP`;

  return (
    <div style={{
      backgroundColor: "var(--cr-white)",
      borderRadius: 20,
      overflow: "hidden",
      border: "1px solid rgba(196,178,159,0.25)",
      boxShadow: "0 2px 16px rgba(90,61,52,0.06)",
      display: "flex",
      flexDirection: "column",
      height: "100%",
    }}>
      {/* Card body */}
      <div style={{ padding: "24px 24px 16px", flex: 1 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
          <ArrowIcon />
          <h3 style={{
            margin: 0,
            fontFamily: "var(--font-marcellus), serif",
            fontSize: 18,
            fontWeight: 400,
            color: "var(--cr-primary)",
            lineHeight: 1.3,
            flex: 1,
          }}>
            {title}
          </h3>
        </div>
        <p style={{
          margin: "0 0 12px",
          fontFamily: "var(--font-sora), sans-serif",
          fontSize: 13,
          color: "var(--cr-accent)",
          lineHeight: 1.6,
        }}>
          {descText}
        </p>
        <span style={{
          display: "inline-block",
          fontFamily: "var(--font-sora), sans-serif",
          fontSize: 12,
          fontWeight: 600,
          color: "var(--cr-primary)",
          backgroundColor: "rgba(196,178,159,0.15)",
          borderRadius: 50,
          padding: "4px 12px",
        }}>
          {price}
        </span>
      </div>
      {/* Image */}
      <div style={{ position: "relative", height: 200, flexShrink: 0 }}>
        <Image
          src={service.img}
          alt={service.en}
          fill
          style={{ objectFit: "cover" }}
          unoptimized
        />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ServicesSection() {
  const { t, language, isRTL } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);

  const filtered = activeCategory ? SERVICES.filter(s => s.cat === activeCategory) : [];

  const descText = language === "ar"
    ? "اكتشف علاجاتنا الطبية المتخصصة المصممة لتعزيز جمالك الطبيعي."
    : "Discover our professional aesthetic treatment designed to enhance your natural beauty.";

  const handleBook = () => window.dispatchEvent(new CustomEvent("open-booking"));

  return (
    <section
      id="services"
      className="bg-section section-padding"
      style={{ position: "relative", overflow: "hidden" }}
    >
      {/* Decorative shapes */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/service-bg-shape.svg" alt="" aria-hidden="true" style={{
        position: "absolute", right: 0, top: 0, opacity: 0.08,
        pointerEvents: "none", maxWidth: 500,
      }} />

      <div className="cr-container" style={{ position: "relative" }}>

        {/* ── Header ── */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Image src="/images/logo.png" alt="" width={18} height={18} style={{ objectFit: "contain", opacity: 0.7 }} />
            <span className="section-tag">{t.services.tag}</span>
          </div>
          <h2 style={{ maxWidth: 640, margin: "0 auto", lineHeight: 1.2 }}>
            {t.services.heading}
          </h2>
        </div>

        {/* ── Phase 1: category picker ── */}
        {!activeCategory && (
          <>
            <p style={{
              textAlign: isRTL ? "left" : "right",
              fontFamily: "var(--font-sora), sans-serif",
              fontSize: 14,
              color: "var(--cr-accent)",
              marginBottom: 32,
            }}>
              {t.services.selectCategory}
            </p>
            <div style={{
              display: "flex",
              gap: 24,
              flexWrap: "wrap",
              justifyContent: "center",
              position: "relative",
            }}>
              <CategoryCard
                label={language === "ar" ? "قسم الجلدية" : "Dermatology"}
                sublabel={language === "ar" ? "ديرما" : "Derma"}
                onClick={() => setActiveCategory("dermatology")}
              />
              <CategoryCard
                label={language === "ar" ? "عيادة الأسنان" : "Dental Clinic"}
                sublabel={language === "ar" ? "عام" : "General"}
                onClick={() => setActiveCategory("dental")}
              />
            </div>
          </>
        )}

        {/* ── Phase 2: pill tabs + swiper ── */}
        {activeCategory && (
          <>
            {/* Pill tabs */}
            <div style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              marginBottom: 40,
              flexWrap: "wrap",
            }}>
              {(["dermatology", "dental"] as Category[]).map((cat) => {
                const isActive = cat === activeCategory;
                const label = cat === "dermatology"
                  ? (language === "ar" ? "قسم الجلدية" : "Dermatology")
                  : (language === "ar" ? "عيادة الأسنان" : "Dental Clinic");
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    style={{
                      padding: "10px 28px",
                      borderRadius: 50,
                      border: `1.5px solid ${isActive ? "var(--cr-primary)" : "rgba(196,178,159,0.5)"}`,
                      backgroundColor: isActive ? "var(--cr-primary)" : "transparent",
                      color: isActive ? "var(--cr-white)" : "var(--cr-primary)",
                      fontFamily: "var(--font-sora), sans-serif",
                      fontSize: 14,
                      fontWeight: 500,
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Services swiper */}
            <div style={{ marginBottom: 48 }} className="services-swiper-wrap">
              <Swiper
                modules={[Navigation]}
                navigation
                spaceBetween={24}
                breakpoints={{
                  0:    { slidesPerView: 1 },
                  640:  { slidesPerView: 2 },
                  1024: { slidesPerView: 3 },
                }}
                dir={isRTL ? "rtl" : "ltr"}
                key={activeCategory + language}
                style={{ paddingBottom: 8 }}
              >
                {filtered.map((svc) => (
                  <SwiperSlide key={svc.id} style={{ height: "auto" }}>
                    <ServiceCard service={svc} lang={language} descText={descText} />
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
          </>
        )}

        {/* ── CTA bar ── */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          flexWrap: "wrap",
          paddingTop: activeCategory ? 0 : 40,
        }}>
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            backgroundColor: "rgba(196,178,159,0.25)",
            color: "var(--cr-primary)",
            fontFamily: "var(--font-sora), sans-serif",
            fontSize: 12,
            fontWeight: 600,
            padding: "4px 14px",
            borderRadius: 50,
          }}>
            {t.services.freeLabel}
          </span>
          <span style={{
            fontFamily: "var(--font-sora), sans-serif",
            fontSize: 14,
            color: "var(--cr-primary)",
          }}>
            {t.services.ctaText}
          </span>
          <button
            onClick={handleBook}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              fontFamily: "var(--font-sora), sans-serif",
              fontSize: 14,
              fontWeight: 600,
              color: "var(--cr-primary)",
              textDecoration: "underline",
              cursor: "pointer",
            }}
          >
            {t.services.ctaBtn}
          </button>
        </div>

      </div>

      <style>{`
        .services-swiper-wrap .swiper-button-prev,
        .services-swiper-wrap .swiper-button-next {
          color: var(--cr-primary);
          background: var(--cr-white);
          width: 44px;
          height: 44px;
          border-radius: 50%;
          box-shadow: 0 2px 12px rgba(90,61,52,0.15);
        }
        .services-swiper-wrap .swiper-button-prev::after,
        .services-swiper-wrap .swiper-button-next::after {
          font-size: 16px;
          font-weight: 700;
        }
        .services-swiper-wrap .swiper-button-disabled {
          opacity: 0.3;
        }
      `}</style>
    </section>
  );
}
