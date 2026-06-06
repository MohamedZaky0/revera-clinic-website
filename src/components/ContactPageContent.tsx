"use client";

import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

const MAP_SRC_HELIOPOLIS =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d6904.937408173035!2d31.344078574424366!3d30.08076017747633!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14583f0a0ca9dc7b%3A0x6f41d86e4d54e318!2sCrystal%20Rose%20Clinics!5e0!3m2!1sar!2seg!4v1770066634433!5m2!1sar!2seg";

const MAP_SRC_ZAYED =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d13818.175141203006!2d30.985958!3d30.025114!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x145857211db4ab09%3A0x3b1cc70bf9561bd0!2sSheikh%20Zayed%20City%2C%20Giza%20Governorate!5e0!3m2!1sen!2seg!4v1717392211904!5m2!1sen!2seg";

export function ContactPageContent() {
  const { t, isRTL, language } = useLanguage();
  const [activeLocation, setActiveLocation] = useState<"heliopolis" | "zayed">("heliopolis");
  const [form, setForm] = useState({ fname: "", lname: "", phone: "", email: "", message: "" });

  const infoItems = [
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      ),
      title: t.contactPage.locationTitle,
      value: activeLocation === "heliopolis" 
        ? t.contactPage.locationText 
        : (language === "ar" ? "مجمع زايد ديونز، بلوك 2، مدينة الشيخ زايد، الجيزة." : "Zayed Dunes Complex, Block 2, Sheikh Zayed City, Giza."),
      href: activeLocation === "heliopolis" 
        ? "https://maps.app.goo.gl/QGDpn48cHuDUSpYB7" 
        : "https://maps.app.goo.gl/H4vJmSND2oN2sD8T9",
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
          <path d="M15 2h7v7M22 2l-8 8" />
        </svg>
      ),
      title: t.contactPage.contactTitle,
      value: t.contactPage.phone,
      href: `tel:${t.contactPage.phone.replace(/\s/g, "")}`,
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
      ),
      title: t.contactPage.emailTitle,
      value: t.contactPage.email,
      href: `mailto:${t.contactPage.email}`,
    },
  ];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent("open-booking"));
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "16px 20px",
    borderRadius: 12,
    border: "1px solid rgba(90, 106, 81, 0.35)",
    background: "#fff",
    fontSize: 14,
    fontFamily: "var(--font-sora), sans-serif",
    color: "var(--cr-primary)",
    outline: "none",
    transition: "border-color 0.3s ease",
  };

  return (
    <>
      {/* Info row */}
      <section className="section-padding bg-white">
        <div className="cr-container" style={{ maxWidth: "1480px" }}>
          <div
            className="contact-info-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 2.5fr",
              gap: 40,
              alignItems: "center",
              direction: isRTL ? "rtl" : "ltr",
            }}
          >
            <div style={{ textAlign: isRTL ? "right" : "left" }}>
              <h2 className="mb-4">{t.contactPage.reachOutHeading}</h2>
              <p className="text-sm leading-relaxed" style={{ color: "var(--cr-muted-foreground, #5A6A51)" }}>
                {t.contactPage.reachOutDescription}
              </p>
            </div>

            <div
              className="contact-cards"
              style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}
            >
              {infoItems.map((item) => (
                <a
                  key={item.title}
                  href={item.href}
                  target={item.href.startsWith("http") ? "_blank" : undefined}
                  rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                    padding: "36px 28px",
                    borderRadius: 24,
                    background: "var(--cr-secondary)",
                    textDecoration: "none",
                    transition: "transform 0.3s ease",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 52,
                      height: 52,
                      borderRadius: "50%",
                      background: "var(--cr-primary)",
                      color: "#fff",
                    }}
                  >
                    {item.icon}
                  </span>
                  <h3 style={{
                    margin: 0,
                    fontFamily: "var(--font-marcellus), serif",
                    fontSize: 20,
                    fontWeight: 400,
                    color: "var(--cr-primary)",
                  }}>
                    {item.title}
                  </h3>
                  <p style={{
                    margin: 0,
                    fontFamily: "var(--font-sora), sans-serif",
                    fontSize: 14,
                    color: "var(--cr-primary)",
                    opacity: 0.85,
                    lineHeight: 1.5,
                    wordBreak: "break-word",
                  }}>
                    {item.value}
                  </p>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Form + map (Biege rounded container on a white background) */}
      <section className="section-padding bg-white" style={{ paddingTop: 0 }}>
        <div className="cr-container">
          <div
            className="contact-form-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 24,
              borderRadius: 32,
              padding: 24,
              background: "var(--cr-secondary)",
              border: "1px solid rgba(90, 106, 81, 0.25)",
              boxShadow: "0 12px 40px rgba(90,61,52,0.05)",
              direction: isRTL ? "rtl" : "ltr",
            }}
          >
            {/* Form */}
            <div style={{ padding: "24px 20px", textAlign: isRTL ? "right" : "left" }}>
              <h2
                style={{
                  fontFamily: "var(--font-marcellus), serif",
                  fontSize: "36px",
                  color: "var(--cr-primary)",
                  marginBottom: "24px",
                  fontWeight: 400,
                }}
              >
                {t.contactPage.formHeading}
              </h2>
              <form onSubmit={handleSubmit}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <input
                    className="contact-input"
                    style={inputStyle}
                    type="text"
                    placeholder={t.contactPage.fields.firstName}
                    value={form.fname}
                    onChange={(e) => setForm({ ...form, fname: e.target.value })}
                    required
                  />
                  <input
                    className="contact-input"
                    style={inputStyle}
                    type="text"
                    placeholder={t.contactPage.fields.lastName}
                    value={form.lname}
                    onChange={(e) => setForm({ ...form, lname: e.target.value })}
                    required
                  />
                  <input
                    className="contact-input"
                    style={inputStyle}
                    type="tel"
                    placeholder={t.contactPage.fields.phone}
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    required
                  />
                  <input
                    className="contact-input"
                    style={inputStyle}
                    type="email"
                    placeholder={t.contactPage.fields.email}
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>
                <textarea
                  className="contact-input"
                  style={{ ...inputStyle, marginBottom: 24, resize: "vertical", minHeight: 120 }}
                  rows={4}
                  placeholder={t.contactPage.fields.message}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                />
                
                <button
                  type="submit"
                  style={{
                    width: "100%",
                    padding: "16px 32px",
                    borderRadius: 50,
                    backgroundColor: "var(--color-brand-primary)",
                    color: "#ffffff",
                    fontFamily: "var(--font-sora), sans-serif",
                    fontSize: 15,
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    boxShadow: "0 4px 12px rgba(65, 78, 54, 0.15)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--color-brand-primary-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--color-brand-primary)";
                  }}
                >
                  {t.contactPage.submitBtn}
                </button>
              </form>
            </div>

            {/* Map column with branch switcher */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Branch switcher pills */}
              <div 
                style={{ 
                  display: "flex", 
                  gap: 8, 
                  backgroundColor: "rgba(90, 61, 52, 0.05)", 
                  padding: 6, 
                  borderRadius: 50,
                  alignSelf: "center",
                }}
              >
                <button
                  type="button"
                  onClick={() => setActiveLocation("heliopolis")}
                  style={{
                    padding: "8px 24px",
                    borderRadius: 50,
                    border: "none",
                    fontFamily: "var(--font-sora), sans-serif",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    backgroundColor: activeLocation === "heliopolis" ? "var(--cr-primary)" : "transparent",
                    color: activeLocation === "heliopolis" ? "#ffffff" : "var(--cr-primary)",
                  }}
                >
                  {language === "ar" ? "فرع مصر الجديدة" : "Heliopolis Branch"}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLocation("zayed")}
                  style={{
                    padding: "8px 24px",
                    borderRadius: 50,
                    border: "none",
                    fontFamily: "var(--font-sora), sans-serif",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    backgroundColor: activeLocation === "zayed" ? "var(--cr-primary)" : "transparent",
                    color: activeLocation === "zayed" ? "#ffffff" : "var(--cr-primary)",
                  }}
                >
                  {language === "ar" ? "فرع الشيخ زايد" : "Sheikh Zayed Branch"}
                </button>
              </div>

              {/* Map embed */}
              <div 
                style={{ 
                  borderRadius: 24, 
                  overflow: "hidden", 
                  position: "relative", 
                  flex: 1,
                  minHeight: 440,
                  border: "1px solid rgba(90, 106, 81, 0.2)",
                }}
              >
                <iframe
                  src={activeLocation === "heliopolis" ? MAP_SRC_HELIOPOLIS : MAP_SRC_ZAYED}
                  title="Revera Clinics location"
                  style={{ border: 0, width: "100%", height: "100%", minHeight: 440 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>

          </div>
        </div>
      </section>

      <style>{`
        .contact-input:focus {
          border-color: var(--cr-primary) !important;
        }
        @media (max-width: 992px) {
          .contact-info-grid { grid-template-columns: 1fr !important; }
          .contact-form-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 600px) {
          .contact-cards { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
