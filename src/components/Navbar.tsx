"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { Phone, ChevronDown, User, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const NAV_LINKS = [
  { key: "home" as const, href: "/" },
  { key: "about" as const, href: "/about" },
  { key: "services" as const, href: "/services" },
  // { key: "blog" as const, href: "/blog" },
  { key: "contact" as const, href: "/contact" },
];

export function Navbar() {
  const { t, language, isRTL, setLanguage } = useLanguage();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [user, setUser] = useState<{ id?: string; name?: string; mobile?: string; email?: string; gender?: string | null } | null>(null);
  const isProfileIncomplete = !!(user && (!user.gender || !user.mobile || user.mobile.startsWith("guest_")));

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  useEffect(() => {
    const checkUser = () => {
      const stored = localStorage.getItem("revera_user");
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    };
    checkUser();

    window.addEventListener("revera-auth-change", checkUser);

    if (supabase) {
      supabase.auth.onAuthStateChange(async (event: any, session: any) => {
        if (!session?.user) {
          if (event === "SIGNED_OUT") {
            localStorage.removeItem("revera_user");
            sessionStorage.removeItem("revera_profile_prompted");
            setUser(null);
            window.dispatchEvent(new CustomEvent("revera-auth-change"));
          }
        }
      });
    }

    return () => {
      window.removeEventListener("revera-auth-change", checkUser);
    };
  }, []);

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

  const handleLogout = async () => {
    localStorage.removeItem("revera_user");
    setUser(null);
    window.dispatchEvent(new CustomEvent("revera-auth-change"));
    if (supabase) {
      await supabase.auth.signOut();
    }
  };

  const handleCompleteProfile = () => {
    if (user) {
      const nameParts = (user.name || "").trim().split(/\s+/);
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";
      
      const phoneVal = user.mobile || "";
      const cleanedPhone = phoneVal.startsWith("guest_") ? "" : phoneVal;
      
      window.dispatchEvent(new CustomEvent("open-auth", {
        detail: {
          step: 3,
          email: user.email || "",
          firstName: firstName,
          lastName: lastName,
          phone: cleanedPhone,
          customerId: user.id || null,
          gender: user.gender || null
        }
      }));
    }
  };

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        transition: "background 0.3s ease, box-shadow 0.3s ease",
        background: (pathname === "/profile" || scrolled) ? "rgba(255,255,255,0.98)" : "transparent",
        boxShadow: (pathname === "/profile" || scrolled) ? "0 2px 20px rgba(90,61,52,0.08)" : "none",
      }}
    >
      <div className="cr-container">
        <nav
          className="h-16 lg:h-28 flex items-center justify-between gap-4 lg:gap-7 flex-row"
        >
          {/* Logo */}
          <Link href="/" className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/main_logo.png" alt="Revera Clinics" className="h-10 lg:h-[72px] w-auto" />
          </Link>

          {/* Desktop nav links */}
          <ul
            className="hidden lg:flex items-center flex-1 justify-center flex-row"
            style={{
              gap: "10px",
              listStyle: "none",
              margin: 0,
              padding: 0,
            }}
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
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("open-booking"));
                }}
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
                  display: "inline-block",
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
            className="hidden lg:flex items-center shrink-0 flex-row"
            style={{
              gap: user ? "12px" : "24px",
            }}
          >
            {/* Phone */}
            {!user && (
              <a
                href="tel:+201035595691"
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
                <span>(+20) 01035595691</span>
              </a>
            )}

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
                  src={language === "en" ? "/images/flag/en.png" : "/images/flag/ar.png"}
                  alt={language === "en" ? "English" : "العربية"}
                  width={20}
                  height={14}
                  style={{ width: "auto", height: "auto", borderRadius: "2px" }}
                />
                <span>{language === "en" ? "English" : "العربية"}</span>
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
                    <Image src="/images/flag/en.png" alt="English" width={18} height={12} style={{ width: "auto", height: "auto", borderRadius: "2px" }} />
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

            {/* Login / User info button */}
            {user ? (
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <Link
                  href="/profile"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    background: "rgba(90,61,52,0.05)",
                    padding: "8px 14px",
                    borderRadius: "8px",
                    color: "var(--cr-primary)",
                    fontSize: "14px",
                    fontWeight: 600,
                    textDecoration: "none",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "rgba(90,61,52,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "rgba(90,61,52,0.05)";
                  }}
                >
                  <User size={16} />
                  <span>{user.name || user.mobile}</span>
                </Link>
                {isProfileIncomplete && (
                  <button
                    onClick={handleCompleteProfile}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "rgba(196,174,124,0.15)",
                      color: "var(--cr-primary)",
                      border: "1.5px solid var(--cr-accent)",
                      padding: "8px 14px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: 600,
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "var(--cr-accent)";
                      (e.currentTarget as HTMLButtonElement).style.color = "white";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "rgba(196,174,124,0.15)";
                      (e.currentTarget as HTMLButtonElement).style.color = "var(--cr-primary)";
                    }}
                  >
                    <span>{isRTL ? "إكمال الملف" : "Complete Profile"}</span>
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "transparent",
                    color: "var(--cr-primary)",
                    border: "1.5px solid var(--cr-primary)",
                    padding: "8px 14px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: 600,
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "var(--cr-primary)";
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--cr-white)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--cr-primary)";
                  }}
                >
                  <LogOut size={14} />
                  <span>{isRTL ? "خروج" : "Logout"}</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleAuth}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "transparent",
                  color: "var(--cr-primary)",
                  border: "1.5px solid var(--cr-primary)",
                  padding: "10px 20px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: 600,
                  transition: "all 0.2s ease",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "var(--cr-primary)";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--cr-white)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--cr-primary)";
                }}
              >
                <User size={16} />
                <span>{t.nav.login}</span>
              </button>
            )}
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
            className="flex lg:hidden"
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
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("open-booking"));
                  setMenuOpen(false);
                }}
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
                href="tel:+201035595691"
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
                <span>(+20) 01035595691</span>
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
                    style={{ width: "auto", height: "auto", borderRadius: "2px" }}
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

              {/* Mobile login / user info button */}
              {user ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <Link
                    href="/profile"
                    onClick={() => setMenuOpen(false)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      background: "rgba(90,61,52,0.05)",
                      padding: "12px 16px",
                      borderRadius: "6px",
                      color: "var(--cr-primary)",
                      fontSize: "14px",
                      fontWeight: 600,
                      textDecoration: "none",
                      cursor: "pointer",
                    }}
                  >
                    <User size={16} />
                    <span>{user.name || user.mobile}</span>
                  </Link>
                  {isProfileIncomplete && (
                    <button
                      onClick={() => {
                        handleCompleteProfile();
                        setMenuOpen(false);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        background: "rgba(196,174,124,0.15)",
                        color: "var(--cr-primary)",
                        border: "1.5px solid var(--cr-accent)",
                        padding: "12px 16px",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: 600,
                        width: "100%",
                      }}
                    >
                      <span>{isRTL ? "إكمال الملف الشخصي" : "Complete Profile"}</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      handleLogout();
                      setMenuOpen(false);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      background: "transparent",
                      color: "var(--cr-primary)",
                      border: "1.5px solid var(--cr-primary)",
                      padding: "12px 20px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: 600,
                      transition: "all 0.2s ease",
                      width: "100%",
                    }}
                  >
                    <LogOut size={16} />
                    <span>{isRTL ? "تسجيل الخروج" : "Logout"}</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleAuth}
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
                    fontSize: "14px",
                    fontWeight: 600,
                    transition: "all 0.2s ease",
                    width: "100%",
                  }}
                >
                  <User size={16} />
                  <span>{t.nav.login}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
