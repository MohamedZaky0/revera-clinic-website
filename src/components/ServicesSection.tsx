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
import { prefetchUrl } from "@/lib/fetchCache";

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
        border: hovered ? "1.5px solid var(--cr-primary)" : "1.5px solid rgba(90, 106, 81, 0.18)",
        background: hovered ? "var(--cr-white)" : "var(--cr-secondary)",
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
          : "none",
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
}

function ServiceCard({ service, lang, descText }: ServiceCardProps) {
  const [hovered, setHovered] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [showCursor, setShowCursor] = useState(false);
  const title = lang === "ar" ? service.ar : service.en;
  const isRTL = lang === "ar";
  // const price = `${service.cost.toLocaleString()} EGP`;

  return (
    <div
      onMouseEnter={() => {
        setHovered(true);
        // Prefetch availability on hover so calendar loads instantly when user opens modal
        prefetchUrl(`/api/availability?serviceId=${service.id}&days=30`, 30000);
      }}
      onMouseLeave={() => setHovered(false)}
      onClick={() => {
        window.dispatchEvent(new CustomEvent("open-booking", { detail: { serviceId: service.id } }));
      }}
      style={{
        backgroundColor: "var(--cr-secondary)",
        borderRadius: 24,
        overflow: "hidden",
        border: "1px solid rgba(90, 106, 81, 0.2)",
        boxShadow: "0 2px 20px rgba(90,61,52,0.08)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        padding: 24,
        cursor: "pointer",
        position: "relative",
      }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 24 }}>
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
            backgroundColor: "rgba(90, 106, 81, 0.12)",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
            transition: "transform 0.28s ease, background-color 0.28s ease",
            transform: `${isRTL ? "scaleX(-1)" : ""} ${hovered ? "rotate(45deg)" : "rotate(0deg)"}`,
          }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M4 14L14 4M14 4H6M14 4V12" stroke="#414E36" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
        {service.price !== undefined && service.price !== null && Number(service.price) > 0 && (
          <div style={{
            fontFamily: "var(--font-sora), sans-serif",
            fontSize: 16,
            fontWeight: 650,
            color: "#C4AE7C",
            marginTop: -12,
            marginBottom: -12,
          }}>
            {lang === "ar" ? `${Number(service.price).toLocaleString()} ج.م` : `${Number(service.price).toLocaleString()} EGP`}
          </div>
        )}

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
            window.dispatchEvent(new CustomEvent("open-booking", { detail: { serviceId: service.id } }));
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
              transform: hovered ? "scale(1.06) rotate(-1deg)" : "scale(1) rotate(0deg)",
              transition: "transform 700ms cubic-bezier(0.2,0.9,0.2,1)",
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
            boxShadow: hovered ? "0 6px 18px rgba(0,0,0,0.12)" : "none",
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

export function ServicesSection() {
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

  const handleBook = () => window.dispatchEvent(new CustomEvent("open-booking"));

  return (
    <section
      id="services"
      className="bg-white section-padding"
      style={{ overflow: "hidden", paddingBottom: activeCategory ? "100px" : "20px" }}
    >
      <div className="cr-container" style={{ maxWidth: "1480px" }}>
        <div
          className={`services-card-wrapper ${!activeCategory ? "phase-1" : ""}`}
          style={{
            position: "relative",
            backgroundColor: "transparent",
            borderRadius: "32px",
            border: "none",
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
              {activeCategory ? (
                <>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                  </div>
                  <h2 style={{ maxWidth: 640, margin: "0 auto", lineHeight: 1.2, fontFamily: "var(--font-marcellus), serif", color: "var(--cr-primary)",fontSize: "clamp(20px, 3.5vw, 24px)",fontWeight: 400, }}>
                    {t.services.selectCategory}
                  </h2>
                </>
              ) : (
                <h2 style={{
                  maxWidth: 640,
                  margin: "0 auto",
                  lineHeight: 1.2,
                  fontFamily: "var(--font-marcellus), serif",
                  color: "var(--cr-primary)",
                  fontSize: "clamp(20px, 3.5vw, 24px)",
                  fontWeight: 400,
                }}>
                  {t.services.selectCategory}
                </h2>
              )}
            </div>

            {/* ── Phase 1: category picker ── */}
            {!activeCategory && (
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
                className="services-cat-grid"
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
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(180px, 1fr))",
                    gap: 40,
                  }}>
                    {filtered.map((svc) => (
                      <ServiceCard key={svc.id} service={svc} lang={language} descText={descText} />
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
          padding: 80px 48px 40px;
        }
        .services-card-wrapper.phase-1 {
          padding: 80px 48px 10px;
        }
        @media (max-width: 768px) {
          .services-card-wrapper {
            padding: 48px 24px 30px;
            border-radius: 24px !important;
          }
          .services-card-wrapper.phase-1 {
            padding: 48px 24px 10px;
          }
          .services-cat-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 480px) {
          .services-cat-grid {
            grid-template-columns: 1fr !important;
            max-width: 320px !important;
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
