"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";

const NAV_LINKS = [
  { key: "home" as const, href: "/" },
  { key: "about" as const, href: "/about" },
  { key: "services" as const, href: "/services" },
  { key: "blog" as const, href: "/blog" },
  { key: "medicalTourism" as const, href: "/" },
  { key: "contact" as const, href: "/contact" },
];

export function Navbar() {
  const { t, language, isRTL, setLanguage } = useLanguage();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleBooking = () => {
    window.dispatchEvent(new CustomEvent("open-booking"));
    setMenuOpen(false);
  };

  const handleAuth = () => {
    window.dispatchEvent(new CustomEvent("open-auth"));
    setMenuOpen(false);
  };

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        transition: "background 0.3s ease, box-shadow 0.3s ease",
        background: scrolled ? "rgba(255,255,255,0.98)" : "transparent",
        boxShadow: scrolled ? "0 2px 20px rgba(90,61,52,0.08)" : "none",
      }}
    >
      <div className="cr-container">
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexDirection: isRTL ? "row-reverse" : "row",
            height: "80px",
            gap: "24px",
          }}
        >
          {/* Logo */}
          <Link href="/" style={{ flexShrink: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo.png" alt="Crystal Rose Clinics" style={{ width: "auto", height: "44px" }} />
          </Link>

          {/* Desktop nav links */}
          <ul
            style={{
              display: "flex",
              alignItems: "center",
              flexDirection: isRTL ? "row-reverse" : "row",
              gap: "4px",
              listStyle: "none",
              margin: 0,
              padding: 0,
              flex: 1,
              justifyContent: "center",
            }}
            className="hidden md:flex"
          >
            {NAV_LINKS.map(({ key, href }) => (
              <li key={key}>
                <Link
                  href={href}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "6px",
                    fontSize: "14px",
                    fontWeight: isActive(href) ? 600 : 400,
                    color: "var(--cr-primary)",
                    opacity: isActive(href) ? 1 : 0.75,
                    transition: "all 0.2s ease",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.opacity = "1";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive(href)) {
                      (e.currentTarget as HTMLAnchorElement).style.opacity =
                        "0.75";
                    }
                  }}
                >
                  {t.nav[key]}
                </Link>
              </li>
            ))}
          </ul>

          {/* Right controls */}
          <div
            style={{
              alignItems: "center",
              flexDirection: isRTL ? "row-reverse" : "row",
              gap: "12px",
              flexShrink: 0,
            }}
            className="hidden md:flex"
          >
            {/* Language switcher */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <button
                onClick={() => setLanguage("en")}
                style={{
                  background: "none",
                  border: "none",
                  padding: "2px",
                  cursor: "pointer",
                  opacity: language === "en" ? 1 : 0.45,
                  transition: "opacity 0.2s ease",
                  borderRadius: "3px",
                  outline: language === "en" ? "2px solid var(--cr-accent)" : "none",
                  outlineOffset: "2px",
                }}
                aria-label="Switch to English"
              >
                <Image
                  src="/images/flag/en.png"
                  alt="English"
                  width={24}
                  height={24}
                  style={{ display: "block", borderRadius: "2px" }}
                />
              </button>
              <button
                onClick={() => setLanguage("ar")}
                style={{
                  background: "none",
                  border: "none",
                  padding: "2px",
                  cursor: "pointer",
                  opacity: language === "ar" ? 1 : 0.45,
                  transition: "opacity 0.2s ease",
                  borderRadius: "3px",
                  outline: language === "ar" ? "2px solid var(--cr-accent)" : "none",
                  outlineOffset: "2px",
                }}
                aria-label="Switch to Arabic"
              >
                <Image
                  src="/images/flag/ar.png"
                  alt="عربي"
                  width={24}
                  height={24}
                  style={{ display: "block", borderRadius: "2px" }}
                />
              </button>
            </div>

            <button onClick={handleAuth} className="btn-outline">
              {t.nav.login}
            </button>

            <button onClick={handleBooking} className="btn-primary">
              {t.nav.makeAppointment}
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "8px",
              flexDirection: "column",
              gap: "5px",
            }}
            className="flex md:hidden"
          >
            <span
              style={{
                display: "block",
                width: "22px",
                height: "2px",
                background: "var(--cr-primary)",
                borderRadius: "2px",
                transition: "transform 0.25s ease, opacity 0.25s ease",
                transform: menuOpen ? "translateY(7px) rotate(45deg)" : "none",
              }}
            />
            <span
              style={{
                display: "block",
                width: "22px",
                height: "2px",
                background: "var(--cr-primary)",
                borderRadius: "2px",
                transition: "opacity 0.25s ease",
                opacity: menuOpen ? 0 : 1,
              }}
            />
            <span
              style={{
                display: "block",
                width: "22px",
                height: "2px",
                background: "var(--cr-primary)",
                borderRadius: "2px",
                transition: "transform 0.25s ease, opacity 0.25s ease",
                transform: menuOpen ? "translateY(-7px) rotate(-45deg)" : "none",
              }}
            />
          </button>
        </nav>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div
            style={{
              background: "rgba(255,255,255,0.98)",
              borderTop: "1px solid var(--cr-divider)",
              paddingBottom: "20px",
            }}
          >
            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: "8px 0",
                direction: isRTL ? "rtl" : "ltr",
              }}
            >
              {NAV_LINKS.map(({ key, href }) => (
                <li key={key}>
                  <Link
                    href={href}
                    onClick={() => setMenuOpen(false)}
                    style={{
                      display: "block",
                      padding: "12px 16px",
                      fontSize: "15px",
                      fontWeight: isActive(href) ? 600 : 400,
                      color: "var(--cr-primary)",
                      opacity: isActive(href) ? 1 : 0.8,
                    }}
                  >
                    {t.nav[key]}
                  </Link>
                </li>
              ))}
            </ul>

            <div
              style={{
                padding: "0 16px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button
                  onClick={() => setLanguage("en")}
                  style={{
                    background: "none",
                    border: "none",
                    padding: "2px",
                    cursor: "pointer",
                    opacity: language === "en" ? 1 : 0.45,
                    borderRadius: "3px",
                    outline: language === "en" ? "2px solid var(--cr-accent)" : "none",
                    outlineOffset: "2px",
                  }}
                  aria-label="Switch to English"
                >
                  <Image
                    src="/images/flag/en.png"
                    alt="English"
                    width={24}
                    height={16}
                    style={{ display: "block", borderRadius: "2px", height: "auto" }}
                  />
                </button>
                <button
                  onClick={() => setLanguage("ar")}
                  style={{
                    background: "none",
                    border: "none",
                    padding: "2px",
                    cursor: "pointer",
                    opacity: language === "ar" ? 1 : 0.45,
                    borderRadius: "3px",
                    outline: language === "ar" ? "2px solid var(--cr-accent)" : "none",
                    outlineOffset: "2px",
                  }}
                  aria-label="Switch to Arabic"
                >
                  <Image
                    src="/images/flag/ar.png"
                    alt="عربي"
                    width={24}
                    height={16}
                    style={{ display: "block", borderRadius: "2px", height: "auto" }}
                  />
                </button>
              </div>

              <button onClick={handleAuth} className="btn-outline" style={{ textAlign: "center", justifyContent: "center" }}>
                {t.nav.login}
              </button>
              <button onClick={handleBooking} className="btn-primary" style={{ textAlign: "center", justifyContent: "center" }}>
                {t.nav.makeAppointment}
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
