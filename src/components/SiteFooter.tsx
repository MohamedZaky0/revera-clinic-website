"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

const QUICK_LINK_HREFS = ["/", "/about", "/services", "/contact"];

function IconInstagram() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconFacebook() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

const SOCIAL_LINKS = [
  { label: "Facebook", href: "https://www.facebook.com/profile.php?id=61587039173147", Icon: IconFacebook },
  { label: "Instagram", href: "https://www.instagram.com/reveraclinics/", Icon: IconInstagram },
];

export function SiteFooter() {
  const { t, isRTL } = useLanguage();

  return (
    <footer
      className="bg-white"
      style={{ padding: "0 0 40px 0", overflow: "hidden" }}
    >
      <div className="cr-container" style={{ maxWidth: "1480px" }}>
        {/* Curved Card Container with Dark Brown Background */}
        <div
          className="ft-rounded-card"
          style={{
            position: "relative",
            backgroundColor: "var(--cr-primary, #414E36)",
            borderRadius: "60px",
            border: "1px solid rgba(196,174,124,0.35)",
            overflow: "hidden",
            padding: "clamp(40px, 6vw, 70px) clamp(24px, 5vw, 64px)",
          }}
        >
          {/* Leaf corner decorations (four corners) */}
          {/* Top-Right */}
          <div
            className="pointer-events-none absolute select-none opacity-[0.05] w-[280px] h-[280px]"
            style={{
              top: "-50px",
              right: "-50px",
              transform: isRTL ? "scaleX(-1)" : "none",
            }}
          >
            <Image
              src="/images/footer-bg-shape.svg"
              alt=""
              fill
              className="object-contain"
            />
          </div>

          {/* Bottom-Left */}
          <div
            className="pointer-events-none absolute select-none opacity-[0.05] w-[280px] h-[280px]"
            style={{
              bottom: "-50px",
              left: "-50px",
              transform: isRTL ? "scaleX(-1) rotate(90deg)" : "rotate(90deg)",
            }}
          >
            <Image
              src="/images/footer-bg-shape.svg"
              alt=""
              fill
              className="object-contain"
            />
          </div>

          {/* Top-Left */}
          <div
            className="pointer-events-none absolute select-none opacity-[0.05] w-[260px] h-[260px]"
            style={{
              top: "-30px",
              left: "-30px",
              transform: "rotate(-90deg)",
            }}
          >
            <Image
              src="/images/footer-bg-shape.svg"
              alt=""
              fill
              className="object-contain"
            />
          </div>

          {/* Bottom-Right */}
          <div
            className="pointer-events-none absolute select-none opacity-[0.05] w-[260px] h-[260px]"
            style={{
              bottom: "-30px",
              right: "-30px",
              transform: "rotate(180deg)",
            }}
          >
            <Image
              src="/images/footer-bg-shape.svg"
              alt=""
              fill
              className="object-contain"
            />
          </div>

          <style>{`
            .ft-top-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              gap: 32px;
              margin-bottom: 48px;
            }
            .ft-newsletter-wrapper {
              display: flex;
              align-items: center;
              background-color: #1F251A;
              border: 1px solid rgba(255, 255, 255, 0.1);
              border-radius: 30px;
              padding: 5px;
              padding-left: 20px;
              width: 100%;
              max-width: 400px;
              transition: border-color 0.3s ease;
            }
            .ft-newsletter-wrapper:focus-within {
              border-color: var(--color-brand-sand);
            }
            .ft-newsletter-input {
              background: transparent;
              border: none;
              outline: none;
              color: #fff;
              font-size: 14px;
              flex-grow: 1;
              font-family: inherit;
            }
            .ft-newsletter-input::placeholder {
              color: rgba(255, 255, 255, 0.4);
            }
            
            .ft-columns-grid {
              display: grid;
              grid-template-columns: 1.2fr 0.9fr 0.9fr;
              gap: 48px;
              margin-bottom: 32px;
            }
            
            .ft-social-btn {
              width: 38px;
              height: 38px;
              border-radius: 50%;
              border: 1.5px solid rgba(255,255,255,0.25);
              display: flex;
              align-items: center;
              justify-content: center;
              color: rgba(255,255,255,0.8);
              transition: all 0.25s ease;
              flex-shrink: 0;
            }
            .ft-social-btn:hover {
              background: rgba(255,255,255,0.1);
              color: #fff;
              border-color: rgba(255,255,255,0.5);
            }

            .ft-contact-section {
              border-top: 1px solid rgba(255,255,255,0.1);
              padding-top: 32px;
              margin-bottom: 32px;
              display: flex;
              flex-direction: column;
              gap: 20px;
            }
            .ft-contact-subrow {
              display: flex;
              flex-wrap: wrap;
              gap: 40px;
              align-items: center;
            }
            .ft-contact-item {
              display: flex;
              flex-direction: column;
              gap: 6px;
            }
            .ft-contact-row-content {
              display: flex;
              align-items: center;
              gap: 10px;
            }
            .ft-contact-divider {
              width: 1px;
              height: 28px;
              background-color: rgba(255, 255, 255, 0.15);
            }

            /* RTL adjustments */
            .rtl .ft-top-row {
              flex-direction: row-reverse;
            }
            .rtl .ft-newsletter-wrapper {
              padding-left: 5px;
              padding-right: 20px;
              flex-direction: row-reverse;
            }
            .rtl .ft-newsletter-input {
              text-align: right;
            }
            .rtl .ft-columns-grid {
              direction: rtl;
            }
            .rtl .ft-contact-section {
              direction: rtl;
            }
            .rtl .ft-contact-subrow {
              flex-direction: row-reverse;
            }
            .rtl .ft-contact-row-content {
              flex-direction: row-reverse;
            }
            .rtl .ft-bottom-bar {
              flex-direction: row-reverse;
              direction: rtl;
            }

            @media (max-width: 1024px) {
              .ft-top-row {
                flex-direction: column;
                align-items: center;
                text-align: center;
                gap: 24px;
              }
              .rtl .ft-top-row {
                flex-direction: column;
              }
              .ft-columns-grid {
                grid-template-columns: 1fr;
                gap: 40px;
                text-align: center;
              }
              .rtl .ft-columns-grid {
                text-align: center;
              }
              .ft-col-1-desc {
                margin: 0 auto !important;
              }
              .ft-social-row {
                justify-content: center !important;
              }
              .ft-links-list {
                justify-content: center !important;
              }
              .ft-hours-row {
                justify-content: center !important;
              }
              .ft-contact-subrow {
                flex-direction: column !important;
                align-items: center;
                gap: 20px;
              }
              .ft-contact-divider {
                display: none;
              }
              .ft-contact-item {
                align-items: center;
              }
              .ft-contact-row-content {
                justify-content: center !important;
              }
            }
          `}</style>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              direction: isRTL ? "rtl" : "ltr",
            }}
          >
            {/* ── Top Row: Tagline & Newsletter ── */}
            <div className="ft-top-row">
              {/* Heading */}
              <h2
                className="font-heading"
                style={{
                  margin: 0,
                  fontSize: "clamp(24px, 3.5vw, 36px)",
                  lineHeight: 1.15,
                  color: "#fff",
                  fontWeight: 400,
                  maxWidth: "460px",
                  textAlign: isRTL ? "right" : "left",
                }}
              >
                {isRTL
                  ? "أحدث الرؤى والأفكار في مجال الجمال والرعاية الطبية"
                  : "Latest insights on beauty & medical care"}
              </h2>

              {/* Newsletter subscription form */}
              <div className="ft-newsletter-wrapper">
                <input
                  type="email"
                  className="ft-newsletter-input"
                  placeholder={isRTL ? "أدخل بريدك الإلكتروني" : "Enter your email"}
                  aria-label="Email address"
                />
                <button
                  type="button"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "38px",
                    height: "38px",
                    borderRadius: "50%",
                    backgroundColor: "var(--color-brand-sand)",
                    color: "var(--color-brand-dark, #1F251A)",
                    border: "none",
                    cursor: "pointer",
                    transition: "transform 0.25s ease",
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.08)"}
                  onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                >
                  <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                    <path
                      d="M5 13L13 5M13 5H6M13 5V12"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* ── Middle Row: Columns Grid ── */}
            <div className="ft-columns-grid">
              {/* Column 1: Description & Social */}
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <p
                  className="ft-col-1-desc"
                  style={{
                    fontSize: "14px",
                    lineHeight: 1.75,
                    color: "rgba(255,255,255,0.72)",
                    margin: 0,
                    maxWidth: "340px",
                  }}
                >
                  {isRTL
                    ? "نغير حياتك من خلال طب الجلدية والجراحة التجميلية المتخصصة وعلاجات الليزر ورعاية الأسنان المتكاملة."
                    : "Transforming lives with expert dermatology, cosmetic surgery, laser treatments, and comprehensive dental care."}
                </p>
                <div
                  className="ft-social-row"
                  style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}
                >
                  {SOCIAL_LINKS.map(({ label, href, Icon }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      className="ft-social-btn"
                    >
                      <Icon />
                    </a>
                  ))}
                </div>
              </div>

              {/* Column 2: Quick Links (arranged horizontally) */}
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <h4
                  style={{
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "var(--color-brand-sand)",
                    margin: 0,
                    textTransform: "capitalize",
                  }}
                >
                  {t.footer.quickLinks}
                </h4>
                <ul
                  className="ft-links-list"
                  style={{
                    listStyle: "none",
                    margin: 0,
                    padding: 0,
                    display: "flex",
                    flexDirection: "row",
                    gap: "20px",
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  {t.footer.links.map((label, i) => (
                    <li key={i}>
                      <Link
                        href={QUICK_LINK_HREFS[i] ?? "#"}
                        style={{
                          fontSize: "14px",
                          color: "rgba(255,255,255,0.72)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "8px",
                          transition: "color 0.2s ease",
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = "#fff"}
                        onMouseLeave={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.72)"}
                      >
                        <span
                          style={{
                            width: "5px",
                            height: "5px",
                            borderRadius: "50%",
                            background: "var(--color-brand-sand)",
                            flexShrink: 0,
                          }}
                        />
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Column 3: Open Hours (arranged horizontally) */}
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <h4
                  style={{
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "var(--color-brand-sand)",
                    margin: 0,
                  }}
                >
                  {t.footer.openHours}
                </h4>
                <div
                  className="ft-hours-row"
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    gap: "24px",
                    flexWrap: "wrap",
                  }}
                >
                  <p style={{ margin: 0, fontSize: "14px", color: "rgba(255,255,255,0.72)" }}>
                    {t.footer.hoursLine1}
                  </p>
                  <p style={{ margin: 0, fontSize: "14px", color: "var(--color-brand-sand)", fontWeight: 500 }}>
                    {t.footer.hoursLine2}
                  </p>
                </div>
              </div>
            </div>

            {/* ── Contact Info Section (divided into Row 1: Contact/E-Mail, Row 2: Address) ── */}
            <div className="ft-contact-section">
              {/* Row 1: Phone and E-Mail */}
              <div className="ft-contact-subrow">
                {/* Contact phone */}
                <div className="ft-contact-item">
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "var(--color-brand-sand)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {isRTL ? "اتصل بنا:" : "Contact:"}
                  </span>
                  <div className="ft-contact-row-content">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--color-brand-sand)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <a
                        href="tel:+201035595691"
                        style={{ fontSize: "14px", color: "rgba(255,255,255,0.85)", textDecoration: "none", fontWeight: 500 }}
                        className="hover:underline"
                      >
                        {isRTL ? "القاهرة الجديدة: (+20) 01035595691" : "New Cairo: (+20) 01035595691"}
                      </a>
                      <a
                        href="tel:+201023122323"
                        style={{ fontSize: "14px", color: "rgba(255,255,255,0.85)", textDecoration: "none", fontWeight: 500 }}
                        className="hover:underline"
                      >
                        {isRTL ? "الشيخ زايد: (+20) 01023122323" : "Sheikh Zayed: (+20) 01023122323"}
                      </a>
                    </div>
                  </div>
                </div>

                {/* Vertical Divider */}
                <div className="ft-contact-divider" />

                {/* E-Mail */}
                <div className="ft-contact-item">
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "var(--color-brand-sand)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {isRTL ? "البريد الإلكتروني:" : "E-Mail:"}
                  </span>
                  <div className="ft-contact-row-content">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--color-brand-sand)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    <a
                      href="mailto:info@reveraclinics.com"
                      style={{
                        fontSize: "14px",
                        color: "rgba(255,255,255,0.85)",
                        textDecoration: "none",
                        fontWeight: 500,
                      }}
                      className="hover:underline"
                    >
                      info@reveraclinics.com
                    </a>
                  </div>
                </div>
              </div>

              {/* Row 2: Address (full width below phone/email) */}
              <div className="ft-contact-item">
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "var(--color-brand-sand)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {isRTL ? "العنوان:" : "Address:"}
                </span>
                <div className="ft-contact-row-content">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--color-brand-sand)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>
                      {isRTL ? "القاهرة الجديدة: مركز أوزون الطبي، C261" : "New Cairo: Ozone Medical Center, C261"}
                    </span>
                    <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>
                      {isRTL ? "الشيخ زايد: عيادات النداء، بيفرلي هيلز 209" : "Sheikh Zayed: Elnada Clinics, Beverly Hills 209"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Bottom Bar: Copyright & Powered By ── */}
            <div
              className="ft-bottom-bar"
              style={{
                borderTop: "1px solid rgba(255,255,255,0.1)",
                paddingTop: "24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: "13px",
                  color: "rgba(255,255,255,0.55)",
                }}
              >
                {t.footer.copyright}
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: "13px",
                  color: "rgba(255,255,255,0.55)",
                }}
              >
                {isRTL ? (
                  <>
                    تطوير بواسطة{" "}
                    <span style={{ color: "var(--color-brand-sand)", fontWeight: 700 }}>
                      IOX Solutions
                    </span>
                  </>
                ) : (
                  <>
                    Powered by{" "}
                    <span style={{ color: "var(--color-brand-sand)", fontWeight: 700 }}>
                      IOX Solutions
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
