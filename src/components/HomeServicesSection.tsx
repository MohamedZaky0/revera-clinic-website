"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Category, ServiceItem } from "@/lib/services";
import { 
  getServiceToggles, 
  isServiceActive, 
  ServiceToggleState, 
  getDynamicServices, 
  getDynamicCategories, 
  LocalCategory 
} from "@/lib/serviceStore";

// ── Service categories and items for Revera Clinics

// ── Flower icon (inline SVG matching original) ─────────────────────────────

function FlowerIcon() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/images/main_logo.png"
      alt="Clinic Logo"
      width={44}
      height={44}
      style={{ objectFit: "contain", display: "block" }}
    />
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
        <path d="M4 14L14 4M14 4H6M14 4V12" stroke="#414E36" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

// ── Category card (phase 1) ───────────────────────────────────────────────────

const CATEGORY_IMAGES: Record<string, string> = {
  dermatology: "/images/services/dermatology-service.jpg",
  gynecology: "/images/services/gyna-service.jpg",
  physiotherapy: "/images/services/physicaltherapy_service.png",
  osteopathy: "/images/services/nutrition_service.png",
};

interface CategoryCardProps {
  label: string;
  sublabel: string;
  image: string;
  onClick: () => void;
}

function CategoryCard({ label, sublabel, image, onClick }: CategoryCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1,
        minWidth: 280,
        padding: "48px 32px",
        borderRadius: 24,
        border: hovered ? "1.5px solid var(--cr-primary)" : "1.5px solid rgba(90, 106, 81, 0.15)",
        background: "var(--cr-white)",
        color: "var(--cr-primary)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
        cursor: "pointer",
        transition: "all 0.3s ease",
        textAlign: "center",
        position: "relative",
        boxShadow: hovered 
          ? "0 12px 30px rgba(90, 61, 52, 0.08)" 
          : "0 4px 12px rgba(90, 61, 52, 0.02)",
      }}
    >
      <div style={{ width: "100%", height: 140, borderRadius: 16, overflow: "hidden", marginBottom: 4 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      <div>
        <div style={{
          fontFamily: "var(--font-marcellus), serif",
          fontSize: 22,
          color: "var(--cr-primary)",
          transition: "color 0.3s",
          marginBottom: 6,
          fontWeight: 400,
        }}>
          {label}
        </div>
        <div style={{
          fontFamily: "var(--font-sora), sans-serif",
          fontSize: 13,
          color: "var(--color-brand-secondary)",
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
  isRTL: boolean;
}

function ServiceCard({ service, lang, descText, isRTL }: ServiceCardProps) {
  const [hovered, setHovered] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [showCursor, setShowCursor] = useState(false);
  const title = lang === "ar" ? service.ar : service.en;
  const arrowTransform = isRTL
    ? `scaleX(-1) rotate(${hovered ? 45 : 0}deg)`
    : `rotate(${hovered ? 45 : 0}deg)`;
  // const price = `${service.cost.toLocaleString()} EGP`;

  return (
    <div
      className="service-card"
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
        cursor: "pointer",
        willChange: "transform, box-shadow",
      }}>
      <div style={{ padding: 24, flex: 1, display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14 }}>
          <h3 style={{
            margin: 0,
            fontFamily: "var(--font-marcellus), serif",
            fontSize: 24,
            fontWeight: 400,
            color: "var(--cr-primary)",
            lineHeight: 1.1,
            flex: 1,
          }}>
            {title}
          </h3>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            backgroundColor: hovered ? "rgba(65, 78, 54, 0.20)" : "rgba(90, 106, 81, 0.12)",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
            transition: "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.28s ease",
            transform: arrowTransform,
            transformOrigin: "center center",
          }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M4 14L14 4M14 4H6M14 4V12" stroke="#414E36" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        <p style={{
          margin: 0,
          fontFamily: "var(--font-sora), sans-serif",
          fontSize: 14,
          color: "var(--color-brand-secondary)",
          lineHeight: 1.8,
          minHeight: 74,
        }}>
          {descText}
        </p>

        <div
          style={{ position: "relative", width: "100%", height: 220, borderRadius: 24, overflow: "hidden", cursor: showCursor ? "none" : "pointer" }}
          onClick={() => {
            const msg = encodeURIComponent(`Hello Revera, I'm interested in booking "${service.en}". Please let me know your availability at your New Cairo branch. Thank you.`);
            window.open(`https://wa.me/201035595691?text=${msg}`, '_blank');
          }}
          onMouseEnter={() => {
            setShowCursor(true);
            if (typeof document !== 'undefined') {
              document.body.classList.add('hide-global-cursor');
              document.body.style.cursor = 'none';
              document.documentElement.style.cursor = 'none';
              try {
                (document.activeElement as HTMLElement | null)?.style && ((document.activeElement as HTMLElement).style.cursor = 'none');
              } catch (e) {}
            }
          }}
          onMouseMove={(e) => {
            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
            setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
            setShowCursor(true);
          }}
          onMouseLeave={() => {
            setShowCursor(false);
            if (typeof document !== 'undefined') {
              document.body.classList.remove('hide-global-cursor');
              document.body.style.cursor = '';
              document.documentElement.style.cursor = '';
              try {
                (document.activeElement as HTMLElement | null)?.style && ((document.activeElement as HTMLElement).style.cursor = '');
              } catch (e) {}
            }
          }}
        >
          <img
            src={service.img}
            alt={title}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              transition: "transform 0.4s ease, filter 0.4s ease, opacity 0.4s ease",
              willChange: "transform",
            }}
          />

          <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
            background: "linear-gradient(180deg, rgba(255,255,255,0) 40%, rgba(0,0,0,0.12) 100%)",
            opacity: hovered ? 1 : 0, transition: "opacity 420ms ease", pointerEvents: "none" }} />

          <div style={{ position: "absolute", right: 16, bottom: 16, width: 48, height: 48, borderRadius: 12,
            background: "rgba(255,255,255,0.92)", display: "grid", placeItems: "center",
            transform: hovered ? "translateY(0) scale(1)" : "translateY(8px) scale(0.9)",
            transition: "transform 420ms cubic-bezier(0.2,0.9,0.2,1), opacity 420ms",
            opacity: hovered ? 1 : 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14M12 5l7 7-7 7" stroke="#414E36" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <div style={{
            position: "absolute",
            left: cursorPos.x,
            top: cursorPos.y,
            transform: "translate(-50%, -50%)",
            width: hovered ? 80 : 0,
            height: hovered ? 80 : 0,
            borderRadius: "50%",
            background: "transparent",
            border: hovered ? "2px solid rgba(255,255,255,0.95)" : "none",
            color: "rgba(255,255,255,0.95)",
            display: showCursor && hovered ? "block" : "none",
            fontWeight: 700,
            fontSize: 13,
            pointerEvents: "none",
            transition: "width 180ms ease, height 180ms ease, border 180ms ease, opacity 180ms ease, transform 180ms ease",
            opacity: showCursor && hovered ? 1 : 0,
            boxShadow: hovered ? "0 6px 18px rgba(0, 0, 0, 0.76)" : "none",
          }}>
            <div style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              display: "grid",
              placeItems: "center",
              width: 80,
              height: 80,
              zIndex: 2,
              color: "rgb(255, 255, 255)",
              fontWeight: 700,
              fontSize: 13,
              pointerEvents: "none",
            }}>{hovered ? "Book" : null}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HomeServicesSection() {
  const { t, language, isRTL } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [serviceToggles, setServiceToggles] = useState<ServiceToggleState>({});
  const [dynamicServices, setDynamicServices] = useState<ServiceItem[]>([]);
  const [dynamicCategories, setDynamicCategories] = useState<LocalCategory[]>([]);

  // Sync with admin localStorage on mount and when admin changes toggles
  useEffect(() => {
    setServiceToggles(getServiceToggles());
    setDynamicServices(getDynamicServices());
    setDynamicCategories(getDynamicCategories());

    const handleStorage = () => {
      setServiceToggles(getServiceToggles());
      setDynamicServices(getDynamicServices());
      setDynamicCategories(getDynamicCategories());
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // Only show services that are active & visible in admin
  const activeServices = dynamicServices.filter(s => isServiceActive(s.id, serviceToggles));
  const filtered = activeCategory ? activeServices.filter(s => s.cat === activeCategory) : [];

  const descText = language === "ar"
    ? "اكتشف خدماتنا الطبية المتخصصة المصممة لتعزيز صحتك وجمالك العام."
    : "Discover our specialized medical services designed to support your health and overall wellness.";

  return (
    <section
      id="services"
      className="bg-white section-padding"
      style={{ overflow: "hidden", paddingBottom: "100px" }}
    >
      <div className="cr-container" style={{ maxWidth: "1480px" }}>
        <div
          className="services-card-wrapper"
          style={{
            position: "relative",
            backgroundColor: "var(--cr-secondary)",
            borderRadius: "32px",
            border: "1px solid rgba(90, 106, 81, 0.25)",
            overflow: "hidden",
          }}
        >
          {/* Decorative shapes */}
          {/* Top-Left: Leaves */}
          <div
            className="absolute top-0 pointer-events-none select-none opacity-[0.08] w-[260px] h-[260px]"
            style={{
              left: isRTL ? "auto" : 0,
              right: isRTL ? 0 : "auto",
              transform: isRTL ? "scaleX(-1)" : "none",
            }}
          >
            <img src="/images/why-choose-bg-shape.svg" alt="" className="w-full h-full object-contain" />
          </div>

          {/* Top-Right: Dots */}
          <div
            className="absolute top-10 pointer-events-none select-none opacity-[0.12] w-[180px] h-[180px]"
            style={{
              left: isRTL ? "40px" : "auto",
              right: isRTL ? "auto" : "40px",
            }}
          >
            <img src="/images/faq-dot-img.svg" alt="" className="w-full h-full object-contain" />
          </div>

          {/* Bottom-Right: Waves */}
          <div
            className="absolute bottom-0 pointer-events-none select-none opacity-[0.06] w-[280px] h-[200px]"
            style={{
              left: isRTL ? 0 : "auto",
              right: isRTL ? "auto" : 0,
              transform: isRTL ? "scaleX(-1)" : "none",
            }}
          >
            <img src="/images/approach-bg-shape.svg" alt="" className="w-full h-full object-contain" />
          </div>

          <div style={{ position: "relative", zIndex: 10 }} className="services-card-inner">
            {/* ── Header ── */}
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  marginBottom: 14,
                  direction: isRTL ? "rtl" : "ltr",
                }}
              >
                <img 
                  src="/images/main_logo.png" 
                  alt="" 
                  style={{ width: 44, height: 44, objectFit: "contain", opacity: 0.8, flexShrink: 0 }} 
                />
                <span 
                  className="section-tag mb-0"
                  style={{ fontSize: "20px", letterSpacing: isRTL ? "normal" : "0.15em" }}
                >
                  {t.services.tag}
                </span>
              </div>
              <h2 style={{
                maxWidth: 760,
                margin: "0 auto 14px",
                lineHeight: 1.2,
                fontFamily: "var(--font-marcellus), serif",
                color: "var(--cr-primary)",
                fontSize: "clamp(26px, 4vw, 42px)",
                fontWeight: 400,
              }}>
                {t.services.heading}
              </h2>
              {!activeCategory && (
                <p style={{
                  margin: "0 auto",
                  fontFamily: "var(--font-sora), sans-serif",
                  fontSize: "14px",
                  color: "var(--color-brand-secondary)",
                  fontWeight: 500,
                }}>
                  {t.services.selectCategory}
                </p>
              )}
            </div>

            {/* ── Phase 1: category picker ── */}
            {!activeCategory && (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                    gap: 24,
                    maxWidth: 1400,
                    margin: "0 auto",
                    width: "100%",
                    justifyContent: "center",
                    position: "relative",
                  }}
                  className="services-cat-grid hs-cat-grid"
                >
                  {dynamicCategories.length === 0 ? (
                    <div style={{ textAlign: "center", gridColumn: "1 / -1", padding: "40px 0", color: "var(--color-brand-secondary)" }}>
                      {language === "ar" ? "لا توجد أقسام متاحة حالياً" : "No categories available yet."}
                    </div>
                  ) : (
                    dynamicCategories.map((cat) => (
                      <CategoryCard
                        key={cat.key}
                        label={language === "ar" && cat.ar ? cat.ar : cat.en}
                        sublabel={language === "ar" ? "اضغط للتفاصيل" : "Click for details"}
                        image={CATEGORY_IMAGES[cat.key] || "/images/services/dermatology-service.jpg"}
                        onClick={() => setActiveCategory(cat.key)}
                      />
                    ))
                  )}
                </div>

                {/* ── Bottom CTA banner row ── */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    marginTop: "48px",
                    fontSize: "14px",
                    fontFamily: "var(--font-sora), sans-serif",
                    color: "var(--cr-primary)",
                    flexWrap: "wrap",
                    textAlign: "center",
                  }}
                >
                  <span
                    style={{
                      backgroundColor: "var(--color-brand-secondary)",
                      color: "#fff",
                      padding: "4px 10px",
                      borderRadius: "20px",
                      fontSize: "11px",
                      fontWeight: 600,
                      textTransform: "uppercase",
                    }}
                  >
                    {t.services.freeLabel}
                  </span>
                  <span style={{ fontWeight: 500 }}>
                    {t.services.ctaText}{" "}
                    <a
                      href="#appointment"
                      style={{
                        fontWeight: 600,
                        textDecoration: "underline",
                        cursor: "pointer",
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        window.dispatchEvent(new CustomEvent("open-booking"));
                      }}
                    >
                      {t.services.ctaBtn}
                    </a>
                  </span>
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
                  {dynamicCategories.map((cat) => {
                    const isActive = cat.key === activeCategory;
                    const label = language === "ar" && cat.ar ? cat.ar : cat.en;
                    return (
                      <button
                        key={cat.key}
                        onClick={() => setActiveCategory(cat.key)}
                        style={{
                          padding: "10px 28px",
                          borderRadius: 50,
                          border: `1.5px solid ${isActive ? "var(--cr-primary)" : "rgba(90, 106, 81, 0.4)"}`,
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

                {/* Services grid */}
                <div style={{ marginBottom: 48 }} className="services-grid-wrap">
                  <div className="hs-svc-grid" style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(180px, 1fr))",
                    gap: 40,
                  }}>
                    {filtered.map((svc) => (
                      <ServiceCard key={svc.id} service={svc} lang={language} descText={descText} isRTL={isRTL} />
                    ))}
                  </div>
                </div>
              </>
            )}

          </div>
        </div>
      </div>

      <style>{`
        .services-card-wrapper {
          padding: 80px 48px;
        }
        @media (max-width: 768px) {
          .services-card-wrapper {
            padding: 48px 24px 30px;
            border-radius: 24px !important;
          }
          .hs-cat-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .hs-svc-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 480px) {
          .hs-cat-grid {
            grid-template-columns: 1fr !important;
            max-width: 320px !important;
          }
          .hs-svc-grid {
            grid-template-columns: 1fr !important;
          }
        }
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
