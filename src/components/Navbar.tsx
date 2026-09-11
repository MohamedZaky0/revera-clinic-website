"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { Phone, ChevronDown, User, LogOut, ShieldCheck, Lock } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { CLIENT } from "@/config/client";

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
  const [loginDropdownOpen, setLoginDropdownOpen] = useState(false);
  const [user, setUser] = useState<{ id?: string; name?: string; mobile?: string; email?: string; gender?: string | null } | null>(null);
  const [showCustomerLogin, setShowCustomerLogin] = useState(false);
  const isProfileIncomplete = !!(user && (!user.gender || !user.mobile || user.mobile.startsWith("guest_")));

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  useEffect(() => {
    let isMounted = true;
    const loadHeaderSettings = async () => {
      try {
        const res = await fetch("/api/page-settings", { cache: "no-store" });
        if (res.ok && isMounted) {
          const data = await res.json();
          setShowCustomerLogin(data?.header?.showCustomerLogin === true || data?.showCustomerLogin === true);
        }
      } catch (err) {
        console.warn("Failed to load header settings:", err);
      }
    };
    loadHeaderSettings();

    const handleSettingsChange = (e?: any) => {
      if (e?.detail?.showCustomerLogin !== undefined) {
        setShowCustomerLogin(e.detail.showCustomerLogin);
      } else {
        loadHeaderSettings();
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "revera_settings_sync" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed.showCustomerLogin !== undefined) {
            setShowCustomerLogin(parsed.showCustomerLogin);
            return;
          }
        } catch {}
        loadHeaderSettings();
      }
    };

    window.addEventListener("revera-settings-change", handleSettingsChange);
    window.addEventListener("storage", handleStorage);

    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      try {
        bc = new BroadcastChannel("revera_channel");
        bc.onmessage = (ev) => {
          if (ev.data?.type === "settings_updated") {
            if (ev.data.showCustomerLogin !== undefined) {
              setShowCustomerLogin(ev.data.showCustomerLogin);
            } else {
              loadHeaderSettings();
            }
          }
        };
      } catch {}
    }

    const handleFocus = () => {
      loadHeaderSettings();
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      isMounted = false;
      window.removeEventListener("revera-settings-change", handleSettingsChange);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
      if (bc) bc.close();
    };
  }, []);

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
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target && !target.closest(".lang-dropdown-container")) {
        setLangOpen(false);
      }
      if (target && !target.closest(".login-dropdown-container")) {
        setLoginDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
                href={`tel:${CLIENT.phoneTel}`}
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
                <span dir="ltr" className="ltr-num inline-block [direction:ltr] [unicode-bidi:isolate]">{CLIENT.phoneDisplay}</span>
              </a>
            )}

            {/* Language dropdown */}
            <div className="lang-dropdown-container" style={{ position: "relative" }}>
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
              <div className="login-dropdown-container" style={{ position: "relative" }}>
                <button
                  onClick={() => setLoginDropdownOpen((v) => !v)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    background: loginDropdownOpen ? "var(--cr-primary)" : "transparent",
                    color: loginDropdownOpen ? "var(--cr-white)" : "var(--cr-primary)",
                    border: "1.5px solid var(--cr-primary)",
                    padding: "9px 18px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: 600,
                    transition: "all 0.2s ease",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => {
                    if (!loginDropdownOpen) {
                      (e.currentTarget as HTMLButtonElement).style.background = "rgba(65, 78, 54, 0.08)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loginDropdownOpen) {
                      (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                    }
                  }}
                >
                  <User size={16} />
                  <span>{t.nav.login}</span>
                  <ChevronDown
                    size={14}
                    style={{
                      transform: loginDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s ease",
                    }}
                  />
                </button>

                {loginDropdownOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      right: isRTL ? "auto" : 0,
                      left: isRTL ? 0 : "auto",
                      marginTop: "10px",
                      background: "#FFFFFF",
                      border: "1px solid #EBE8E0",
                      borderRadius: "16px",
                      boxShadow: "0 12px 36px rgba(31, 37, 26, 0.12)",
                      zIndex: 1000,
                      minWidth: "290px",
                      padding: "8px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    {/* Option 1: Customer Login */}
                    <div
                      onClick={() => {
                        if (showCustomerLogin) {
                          setLoginDropdownOpen(false);
                          handleAuth();
                        }
                      }}
                      style={{
                        padding: "10px 12px",
                        borderRadius: "12px",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        cursor: showCustomerLogin ? "pointer" : "not-allowed",
                        opacity: showCustomerLogin ? 1 : 0.45,
                        background: showCustomerLogin ? "transparent" : "#F9F9F7",
                        transition: "all 0.2s ease",
                        textAlign: isRTL ? "right" : "left",
                        userSelect: "none",
                      }}
                      onMouseEnter={(e) => {
                        if (showCustomerLogin) {
                          (e.currentTarget as HTMLDivElement).style.background = "#F4F6F2";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (showCustomerLogin) {
                          (e.currentTarget as HTMLDivElement).style.background = "transparent";
                        }
                      }}
                      title={!showCustomerLogin ? (t.nav.loginDisabledNotice || "Customer login is temporarily disabled by administration") : undefined}
                    >
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "10px",
                          background: showCustomerLogin ? "#EBF0E6" : "#EBEBEB",
                          color: showCustomerLogin ? "#414E36" : "#888888",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <User size={18} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
                          <span style={{ fontSize: "13px", fontWeight: 700, color: "#1F251A" }}>
                            {t.nav.customerLogin || "Patient & Customer Login"}
                          </span>
                          {!showCustomerLogin && (
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: 700,
                                padding: "2px 6px",
                                borderRadius: "6px",
                                background: "#E5E7EB",
                                color: "#6B7280",
                              }}
                            >
                              {isRTL ? "معطل" : "Deactivated"}
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: "11px", color: "#788272", margin: "2px 0 0 0", lineHeight: "1.3" }}>
                          {t.nav.customerLoginDesc || "Access your appointments, profile & medical wallet"}
                        </p>
                      </div>
                    </div>

                    {/* Subtle Divider */}
                    <div style={{ height: "1px", background: "#F0EEE6", margin: "2px 4px" }} />

                    {/* Option 2: Staff Login */}
                    <Link
                      href="/login"
                      onClick={() => setLoginDropdownOpen(false)}
                      style={{
                        padding: "10px 12px",
                        borderRadius: "12px",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        cursor: "pointer",
                        textDecoration: "none",
                        transition: "all 0.2s ease",
                        textAlign: isRTL ? "right" : "left",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background = "#F4F6F2";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = "transparent";
                      }}
                    >
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "10px",
                          background: "#FAF0E6",
                          color: "#C4AE7C",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <ShieldCheck size={18} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
                          <span style={{ fontSize: "13px", fontWeight: 700, color: "#1F251A" }}>
                            {t.nav.staffLogin || "Clinic Staff & Doctors"}
                          </span>
                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: 700,
                              padding: "2px 6px",
                              borderRadius: "6px",
                              background: "rgba(65, 78, 54, 0.1)",
                              color: "#414E36",
                            }}
                          >
                            Portal
                          </span>
                        </div>
                        <p style={{ fontSize: "11px", color: "#788272", margin: "2px 0 0 0", lineHeight: "1.3" }}>
                          {t.nav.staffLoginDesc || "Admin, doctor & reception portal"}
                        </p>
                      </div>
                    </Link>
                  </div>
                )}
              </div>
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
                href={`tel:${CLIENT.phoneTel}`}
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
                <span dir="ltr" className="ltr-num inline-block [direction:ltr] [unicode-bidi:isolate]">{CLIENT.phoneDisplay}</span>
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

                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      background: "transparent",
                      color: "var(--cr-primary)",
                      border: "1px dashed var(--cr-divider)",
                      padding: "10px 16px",
                      borderRadius: "6px",
                      textDecoration: "none",
                      fontSize: "13px",
                      fontWeight: 500,
                      marginTop: "4px",
                    }}
                  >
                    <ShieldCheck size={15} />
                    <span>{t.nav.staffLogin || "Clinic Staff & Doctors"}</span>
                  </Link>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {/* Option 1: Customer Login */}
                  <button
                    onClick={() => {
                      if (showCustomerLogin) {
                        handleAuth();
                        setMenuOpen(false);
                      }
                    }}
                    disabled={!showCustomerLogin}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px",
                      background: showCustomerLogin ? "var(--cr-primary)" : "#F3F4F6",
                      color: showCustomerLogin ? "var(--cr-white)" : "#9CA3AF",
                      border: showCustomerLogin ? "none" : "1px solid #E5E7EB",
                      padding: "12px 16px",
                      borderRadius: "6px",
                      cursor: showCustomerLogin ? "pointer" : "not-allowed",
                      fontSize: "14px",
                      fontWeight: 600,
                      opacity: showCustomerLogin ? 1 : 0.65,
                      transition: "all 0.2s ease",
                      width: "100%",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <User size={16} />
                      <span>{t.nav.customerLogin || "Patient & Customer Login"}</span>
                    </div>
                    {!showCustomerLogin && (
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: "#E5E7EB",
                          color: "#6B7280",
                        }}
                      >
                        {isRTL ? "معطل" : "Deactivated"}
                      </span>
                    )}
                  </button>

                  {/* Option 2: Staff Login */}
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      background: "rgba(65, 78, 54, 0.08)",
                      color: "var(--cr-primary)",
                      border: "1px solid rgba(65, 78, 54, 0.2)",
                      padding: "12px 16px",
                      borderRadius: "6px",
                      textDecoration: "none",
                      fontSize: "14px",
                      fontWeight: 600,
                      transition: "all 0.2s ease",
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                  >
                    <ShieldCheck size={16} />
                    <span>{t.nav.staffLogin || "Clinic Staff & Doctors Portal"}</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
