"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { Phone, ChevronDown } from "lucide-react";

const NAV_LINKS = [
  { key: "home" as const, href: "/" },
  { key: "about" as const, href: "/about" },
  { key: "services" as const, href: "/services" },
  { key: "blog" as const, href: "/blog" },
  { key: "contact" as const, href: "/contact" },
];

export function Navbar() {
  const { t, language, isRTL, setLanguage } = useLanguage();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = () => {
      setLangOpen(false);
    };
    if (langOpen) {
      document.addEventListener("click", handleClickOutside);
    }
    return () => document.removeEventListener("click", handleClickOutside);
  }, [langOpen]);

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
            height: "112px",
            gap: "28px",
          }}
        >
          {/* Logo */}
          <Link href="/" style={{ flexShrink: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/main_logo.png" alt="Revera Clinics" style={{ width: "auto", height: "72px" }} />
          </Link>

          {/* Desktop nav links */}
          <ul
            style={{
              display: "flex",
              alignItems: "center",
              flexDirection: isRTL ? "row-reverse" : "row",
              gap: "10px",
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
                    padding: "10px 18px",
                    borderRadius: "8px",
                    fontSize: "16px",
                    fontWeight: isActive(href) ? 700 : 500,
                    color: "var(--cr-primary)",
                    opacity: isActive(href) ? 1 : 0.85,
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

            {/* Make Appointment CTA next to Contact */}
            <li>
              <button
                onClick={handleBooking}
                style={{
                  padding: "10px 16px",
                  borderRadius: "8px",
                  background: "var(--cr-primary)",
                  color: "var(--cr-white)",
                  border: "none",
                  fontSize: "15px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "transform 0.12s ease, opacity 0.12s ease",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.opacity = "0.9";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.opacity = "1";
                }}
              >
                {t.nav.makeAppointment}
              </button>
              </li>
          </ul>

          {/* Right controls */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              flexDirection: isRTL ? "row-reverse" : "row",
              gap: "24px",
              flexShrink: 0,
            }}
            className="hidden md:flex"
          >
            {/* Phone */}
            <a
              href="tel:+201125787019"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                color: "var(--cr-primary)",
                textDecoration: "none",
                fontSize: "15px",
                fontWeight: 500,
                transition: "opacity 0.2s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.opacity = "0.7";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.opacity = "1";
              }}
            >
              <Phone size={18} strokeWidth={1.5} />
              <span>(+20) 01125787019</span>
            </a>

            {/* Language dropdown */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setLangOpen(!langOpen)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "8px 14px",
                  color: "var(--cr-primary)",
                  fontSize: "15px",
                  fontWeight: 500,
                  borderRadius: "8px",
                  transition: "background 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(90,61,52,0.05)";
                }}
                onMouseLeave={(e) => {
                  if (!langOpen) {
                    (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  }
                }}
              >
                <Image
                  src="/images/flag/en.png"
                  alt="English"
                  width={20}
                  height={14}
                  style={{ borderRadius: "2px" }}
                />
                <span>English</span>
                <ChevronDown size={16} />
              </button>

              {langOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: isRTL ? "auto" : 0,
                    left: isRTL ? 0 : "auto",
                    marginTop: "8px",
                    background: "white",
                    border: "1px solid var(--cr-divider)",
                    borderRadius: "8px",
                    boxShadow: "0 4px 12px rgba(90,61,52,0.1)",
                    zIndex: 1000,
                    minWidth: "150px",
                    overflow: "hidden",
                  }}
                >
                  <button
                    onClick={() => {
                      setLanguage("en");
                      setLangOpen(false);
                    }}
                    style={{
                      width: "100%",
                      padding: "10px 16px",
                      background: language === "en" ? "rgba(90,61,52,0.05)" : "transparent",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      color: "var(--cr-primary)",
                      fontSize: "14px",
                      textAlign: isRTL ? "right" : "left",
                      transition: "background 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (language !== "en") {
                        (e.currentTarget as HTMLButtonElement).style.background = "rgba(90,61,52,0.03)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (language !== "en") {
                        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                      }
                    }}
                  >
                    <Image src="/images/flag/en.png" alt="English" width={18} height={12} style={{ borderRadius: "2px" }} />
                    <span>English</span>
                  </button>
                  <button
                    onClick={() => {
                      setLanguage("ar");
                      setLangOpen(false);
                    }}
                    style={{
                      width: "100%",
                      padding: "10px 16px",
                      background: language === "ar" ? "rgba(90,61,52,0.05)" : "transparent",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      color: "var(--cr-primary)",
                      fontSize: "14px",
                      textAlign: isRTL ? "right" : "left",
                      transition: "background 0.2s ease",
                      borderTop: "1px solid var(--cr-divider)",
                    }}
                    onMouseEnter={(e) => {
                      if (language !== "ar") {
                        (e.currentTarget as HTMLButtonElement).style.background = "rgba(90,61,52,0.03)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (language !== "ar") {
                        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                      }
                    }}
                  >
                    <Image src="/images/flag/ar.png" alt="عربي" width={18} height={12} style={{ borderRadius: "2px" }} />
                    <span>العربية</span>
                  </button>
                </div>
              )}
            </div>

            {/* Login button */}
            <button
              disabled
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "transparent",
                color: "rgba(65, 78, 54, 0.45)",
                border: "1.5px solid rgba(65, 78, 54, 0.25)",
                padding: "10px 20px",
                borderRadius: "6px",
                cursor: "not-allowed",
                fontSize: "14px",
                fontWeight: 600,
                transition: "all 0.2s ease",
                whiteSpace: "nowrap",
                opacity: 0.65,
              }}
            >
              {/* TODO: Add login icon */}
              {t.nav.login}
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
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                borderTop: "1px solid var(--cr-divider)",
              }}
            >
              {/* Mobile Make Appointment */}
              <button
                onClick={() => handleBooking()}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  background: "var(--cr-primary)",
                  color: "var(--cr-white)",
                  border: "none",
                  padding: "12px 20px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "15px",
                  fontWeight: 600,
                  transition: "all 0.12s ease",
                  width: "100%",
                }}
              >
                {t.nav.makeAppointment}
              </button>

              {/* Mobile phone */}
              <a
                href="tel:+201125787019"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "var(--cr-primary)",
                  textDecoration: "none",
                  fontSize: "14px",
                  fontWeight: 500,
                }}
              >
                <Phone size={18} strokeWidth={1.5} />
                <span>(+20) 01125787019</span>
              </a>

              {/* Mobile language selector */}
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button
                  onClick={() => setLanguage("en")}
                  style={{
                    background: language === "en" ? "rgba(90,61,52,0.1)" : "transparent",
                    border: "1px solid var(--cr-accent)",
                    padding: "8px 12px",
                    cursor: "pointer",
                    borderRadius: "4px",
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    fontSize: "13px",
                    color: "var(--cr-primary)",
                    fontWeight: language === "en" ? 600 : 400,
                    transition: "all 0.2s ease",
                  }}
                  aria-label="Switch to English"
                >
                  <Image
                    src="/images/flag/en.png"
                    alt="English"
                    width={16}
                    height={12}
                    style={{ borderRadius: "2px" }}
                  />
                  <span>English</span>
                </button>
                <button
                  onClick={() => setLanguage("ar")}
                  style={{
                    background: language === "ar" ? "rgba(90,61,52,0.1)" : "transparent",
                    border: "1px solid var(--cr-accent)",
                    padding: "8px 12px",
                    cursor: "pointer",
                    borderRadius: "4px",
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    fontSize: "13px",
                    color: "var(--cr-primary)",
                    fontWeight: language === "ar" ? 600 : 400,
                    transition: "all 0.2s ease",
                  }}
                  aria-label="Switch to Arabic"
                >
                  <Image
                    src="/images/flag/ar.png"
                    alt="عربي"
                    width={16}
                    height={12}
                    style={{ borderRadius: "2px" }}
                  />
                  <span>العربية</span>
                </button>
              </div>

              {/* Mobile login button */}
              <button
                disabled
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  background: "rgba(65, 78, 54, 0.12)",
                  color: "rgba(255, 255, 255, 0.7)",
                  border: "none",
                  padding: "12px 20px",
                  borderRadius: "6px",
                  cursor: "not-allowed",
                  fontSize: "14px",
                  fontWeight: 600,
                  transition: "all 0.2s ease",
                  width: "100%",
                  opacity: 0.65,
                }}
              >
                {t.nav.login}
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
