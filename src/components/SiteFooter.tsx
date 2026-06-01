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

function IconWhatsApp() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.554 4.12 1.524 5.849L.057 23.571a.5.5 0 0 0 .614.614l5.782-1.497A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.694-.504-5.232-1.385l-.374-.218-3.883 1.005 1.032-3.768-.236-.387A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
    </svg>
  );
}

const SOCIAL_LINKS: Array<{ label: string; href: string; Icon: () => React.JSX.Element }> = [
  { label: "Instagram", href: "https://instagram.com", Icon: IconInstagram },
  { label: "Facebook", href: "https://facebook.com", Icon: IconFacebook },
  { label: "WhatsApp", href: "https://wa.me/201125787019", Icon: IconWhatsApp },
];

export function SiteFooter() {
  const { t, isRTL } = useLanguage();

  return (
    <footer
      className="dark-section"
      style={{ position: "relative", overflow: "hidden" }}
    >
      {/* Background shape */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          right: isRTL ? "auto" : 0,
          left: isRTL ? 0 : "auto",
          width: "400px",
          height: "400px",
          opacity: 0.1,
          pointerEvents: "none",
        }}
      >
        <Image
          src="/images/footer-bg-shape.svg"
          alt=""
          width={400}
          height={400}
          style={{ objectFit: "contain" }}
          aria-hidden
        />
      </div>

      <div className="cr-container" style={{ position: "relative" }}>
        {/* Main 4-column grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "48px",
            padding: "80px 0 60px",
            direction: isRTL ? "rtl" : "ltr",
          }}
        >
          {/* Column 1: Logo + description + social */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <Link href="/" style={{ display: "inline-block" }}>
              <Image
                src="/images/logo.png"
                alt="Crystal Rose Clinics"
                width={140}
                height={48}
                style={{ objectFit: "contain" }}
              />
            </Link>
            <p
              style={{
                fontSize: "14px",
                lineHeight: 1.75,
                color: "rgba(255,255,255,0.72)",
                margin: 0,
                maxWidth: "280px",
              }}
            >
              {t.footer.description}
            </p>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              {SOCIAL_LINKS.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "50%",
                    border: "1.5px solid rgba(255,255,255,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "rgba(255,255,255,0.75)",
                    transition: "all 0.25s ease",
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.background = "rgba(255,255,255,0.15)";
                    el.style.color = "#fff";
                    el.style.borderColor = "rgba(255,255,255,0.5)";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.background = "transparent";
                    el.style.color = "rgba(255,255,255,0.75)";
                    el.style.borderColor = "rgba(255,255,255,0.2)";
                  }}
                >
                  <Icon />
                </a>
              ))}
            </div>
          </div>

          {/* Column 2: Quick links */}
          <div>
            <h4
              style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "#fff",
                marginBottom: "20px",
                fontFamily: "var(--font-sora), sans-serif",
                textTransform: "capitalize",
              }}
            >
              {t.footer.quickLinks}
            </h4>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
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
                      transition: "color 0.2s ease, gap 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLAnchorElement;
                      el.style.color = "#fff";
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLAnchorElement;
                      el.style.color = "rgba(255,255,255,0.72)";
                    }}
                  >
                    <span
                      style={{
                        width: "5px",
                        height: "5px",
                        borderRadius: "50%",
                        background: "var(--cr-accent)",
                        flexShrink: 0,
                      }}
                    />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Open hours */}
          <div>
            <h4
              style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "#fff",
                marginBottom: "20px",
                fontFamily: "var(--font-sora), sans-serif",
              }}
            >
              {t.footer.openHours}
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div
                style={{
                  padding: "14px 16px",
                  borderRadius: "10px",
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <p style={{ margin: 0, fontSize: "14px", color: "rgba(255,255,255,0.9)" }}>
                  {t.footer.hoursLine1}
                </p>
              </div>
              <div
                style={{
                  padding: "14px 16px",
                  borderRadius: "10px",
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <p style={{ margin: 0, fontSize: "14px", color: "rgba(255,255,255,0.9)" }}>
                  {t.footer.hoursLine2}
                </p>
              </div>
            </div>
          </div>

          {/* Column 4: Contact info */}
          <div>
            <h4
              style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "#fff",
                marginBottom: "20px",
                fontFamily: "var(--font-sora), sans-serif",
              }}
            >
              {t.footer.contact}
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Phone */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", flexDirection: isRTL ? "row-reverse" : "row" }}>
                <Image
                  src="/images/icon-phone.svg"
                  alt=""
                  width={18}
                  height={18}
                  style={{ marginTop: "2px", opacity: 0.8, flexShrink: 0 }}
                  aria-hidden
                />
                <div>
                  <p style={{ margin: 0, fontSize: "14px", color: "rgba(255,255,255,0.72)" }}>
                    <a
                      href="tel:+201125787019"
                      style={{ color: "inherit", transition: "color 0.2s ease" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#fff"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.72)"; }}
                    >
                      (+20) 01125787019
                    </a>
                  </p>
                </div>
              </div>

              {/* Email */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", flexDirection: isRTL ? "row-reverse" : "row" }}>
                <Image
                  src="/images/icon-mail.svg"
                  alt=""
                  width={18}
                  height={18}
                  style={{ marginTop: "2px", opacity: 0.8, flexShrink: 0 }}
                  aria-hidden
                />
                <div>
                  <p style={{ margin: "0 0 2px", fontSize: "12px", color: "var(--cr-accent)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {t.footer.email}
                  </p>
                  <p style={{ margin: 0, fontSize: "14px", color: "rgba(255,255,255,0.72)" }}>
                    <a
                      href="mailto:info@crystalroseclinics.com"
                      style={{ color: "inherit", transition: "color 0.2s ease" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#fff"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.72)"; }}
                    >
                      info@crystalroseclinics.com
                    </a>
                  </p>
                </div>
              </div>

              {/* Address */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", flexDirection: isRTL ? "row-reverse" : "row" }}>
                <Image
                  src="/images/icon-location.svg"
                  alt=""
                  width={18}
                  height={18}
                  style={{ marginTop: "2px", opacity: 0.8, flexShrink: 0 }}
                  aria-hidden
                />
                <div>
                  <p style={{ margin: "0 0 2px", fontSize: "12px", color: "var(--cr-accent)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {t.footer.address}
                  </p>
                  <p style={{ margin: 0, fontSize: "14px", color: "rgba(255,255,255,0.72)" }}>
                    Cairo, Egypt
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.1)",
            padding: "24px 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexDirection: isRTL ? "row-reverse" : "row",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <p style={{ margin: 0, fontSize: "13px", color: "rgba(255,255,255,0.55)" }}>
            {t.footer.copyright}
          </p>
          <p style={{ margin: 0, fontSize: "13px", color: "rgba(255,255,255,0.55)" }}>
            {t.footer.poweredBy}
          </p>
        </div>
      </div>
    </footer>
  );
}
