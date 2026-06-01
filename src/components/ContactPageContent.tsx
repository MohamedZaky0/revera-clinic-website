"use client";

import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

const MAP_SRC =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d6904.937408173035!2d31.344078574424366!3d30.08076017747633!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14583f0a0ca9dc7b%3A0x6f41d86e4d54e318!2sCrystal%20Rose%20Clinics!5e0!3m2!1sar!2seg!4v1770066634433!5m2!1sar!2seg";

export function ContactPageContent() {
  const { t, isRTL } = useLanguage();
  const [form, setForm] = useState({ fname: "", lname: "", phone: "", email: "", message: "" });

  const infoItems = [
    {
      icon: "/images/icon-location.svg",
      title: t.contactPage.locationTitle,
      value: t.contactPage.locationText,
      href: "https://maps.app.goo.gl/QGDpn48cHuDUSpYB7",
    },
    {
      icon: "/images/icon-phone.svg",
      title: t.contactPage.contactTitle,
      value: t.contactPage.phone,
      href: `tel:${t.contactPage.phone.replace(/\s/g, "")}`,
    },
    {
      icon: "/images/icon-mail.svg",
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
    padding: "14px 18px",
    borderRadius: 10,
    border: "1px solid var(--cr-divider)",
    background: "#fff",
    fontSize: 14,
    fontFamily: "var(--font-sora), sans-serif",
    color: "var(--cr-primary)",
    outline: "none",
  };

  return (
    <>
      {/* Info row */}
      <section className="section-padding bg-white">
        <div className="cr-container">
          <div
            className="contact-info-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 2fr",
              gap: 40,
              alignItems: "center",
              direction: isRTL ? "rtl" : "ltr",
            }}
          >
            <div style={{ textAlign: isRTL ? "right" : "left" }}>
              <h2 className="mb-4">{t.contactPage.reachOutHeading}</h2>
              <p className="text-sm leading-relaxed" style={{ color: "var(--cr-muted-foreground, #8a6d62)" }}>
                {t.contactPage.reachOutDescription}
              </p>
            </div>

            <div
              className="contact-cards"
              style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}
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
                    gap: 12,
                    padding: "28px 22px",
                    borderRadius: 16,
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
                      background: "#fff",
                    }}
                  >
                    <img src={item.icon} alt="" aria-hidden="true" style={{ width: 24, height: 24 }} />
                  </span>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--cr-primary)", textTransform: "capitalize" }}>
                    {item.title}
                  </h3>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--cr-muted-foreground, #8a6d62)", wordBreak: "break-word" }}>
                    {item.value}
                  </p>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Form + map */}
      <section className="section-padding bg-section" style={{ paddingTop: 0 }}>
        <div className="cr-container">
          <div
            className="contact-form-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 0,
              borderRadius: 20,
              overflow: "hidden",
              boxShadow: "0 8px 40px rgba(90,61,52,0.08)",
              background: "#fff",
              direction: isRTL ? "rtl" : "ltr",
            }}
          >
            {/* Form */}
            <div style={{ padding: "48px 44px", textAlign: isRTL ? "right" : "left" }}>
              <h2 className="mb-6">{t.contactPage.formHeading}</h2>
              <form onSubmit={handleSubmit}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <input
                    style={inputStyle}
                    type="text"
                    placeholder={t.contactPage.fields.firstName}
                    value={form.fname}
                    onChange={(e) => setForm({ ...form, fname: e.target.value })}
                    required
                  />
                  <input
                    style={inputStyle}
                    type="text"
                    placeholder={t.contactPage.fields.lastName}
                    value={form.lname}
                    onChange={(e) => setForm({ ...form, lname: e.target.value })}
                    required
                  />
                  <input
                    style={inputStyle}
                    type="tel"
                    placeholder={t.contactPage.fields.phone}
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    required
                  />
                  <input
                    style={inputStyle}
                    type="email"
                    placeholder={t.contactPage.fields.email}
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>
                <textarea
                  style={{ ...inputStyle, marginBottom: 24, resize: "vertical", minHeight: 120 }}
                  rows={4}
                  placeholder={t.contactPage.fields.message}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                />
                <button type="submit" className="btn-primary">
                  {t.contactPage.submitBtn}
                </button>
              </form>
            </div>

            {/* Map */}
            <div style={{ minHeight: 480 }}>
              <iframe
                src={MAP_SRC}
                title="Crystal Rose Clinics location"
                style={{ border: 0, width: "100%", height: "100%", minHeight: 480 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </section>

      <style>{`
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
