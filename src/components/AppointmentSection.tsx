"use client";

import Image from "next/image";
import { useLanguage } from "@/contexts/LanguageContext";

export function AppointmentSection() {
  const { t, isRTL } = useLanguage();

  return (
    <section className="bg-section section-padding relative overflow-hidden">
      {/* Decorative background shape */}
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
        <Image
          src="/images/appointment-bg-shape.svg"
          alt=""
          fill
          sizes="100vw"
          className="object-contain object-right opacity-20"
        />
      </div>

      <div className="cr-container relative z-10">
        <div
          className={`flex flex-col gap-12 lg:gap-20 ${
            isRTL ? "lg:flex-row-reverse" : "lg:flex-row"
          } lg:items-start`}
        >
          {/* Left: Contact info */}
          <div className="flex-1">
            <span className="section-tag">{t.appointment.tag}</span>
            <h2 className="mt-3 mb-8">{t.appointment.heading}</h2>

            {/* Contact items */}
            <div className="flex flex-col gap-5 mb-8">
              {/* Address */}
              <div className={`flex items-start gap-4 ${isRTL ? "flex-row-reverse" : ""}`}>
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: "var(--cr-primary)" }}
                >
                  <Image
                    src="/images/icon-location.svg"
                    alt="location"
                    width={18}
                    height={18}
                  />
                </div>
                <div className={isRTL ? "text-right" : "text-left"}>
                  <p className="mb-0 text-sm font-medium" style={{ color: "var(--cr-primary)" }}>
                    Cairo, Egypt — Maadi &amp; Nasr City branches
                  </p>
                </div>
              </div>

              {/* Phone */}
              <div className={`flex items-start gap-4 ${isRTL ? "flex-row-reverse" : ""}`}>
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: "var(--cr-primary)" }}
                >
                  <Image
                    src="/images/icon-phone.svg"
                    alt="phone"
                    width={18}
                    height={18}
                  />
                </div>
                <div className={isRTL ? "text-right" : "text-left"}>
                  <a
                    href="tel:+201125787019"
                    className="text-sm font-medium"
                    style={{ color: "var(--cr-primary)" }}
                  >
                    (+20) 01125787019
                  </a>
                </div>
              </div>

              {/* Email */}
              <div className={`flex items-start gap-4 ${isRTL ? "flex-row-reverse" : ""}`}>
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: "var(--cr-primary)" }}
                >
                  <Image
                    src="/images/icon-mail.svg"
                    alt="email"
                    width={18}
                    height={18}
                  />
                </div>
                <div className={isRTL ? "text-right" : "text-left"}>
                  <a
                    href="mailto:info@crystalroseclinics.com"
                    className="text-sm font-medium"
                    style={{ color: "var(--cr-primary)" }}
                  >
                    info@crystalroseclinics.com
                  </a>
                </div>
              </div>
            </div>

            {/* Working hours */}
            <div
              className="rounded-2xl p-6"
              style={{ backgroundColor: "var(--cr-white)", border: "1.5px solid var(--cr-accent)" }}
            >
              <p
                className="mb-1 text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--cr-accent)" }}
              >
                Working Hours
              </p>
              <p className="mb-0.5 text-sm font-medium" style={{ color: "var(--cr-primary)" }}>
                Daily: 12:00 PM – 8:00 PM
              </p>
              <p className="mb-0 text-sm" style={{ color: "var(--cr-accent)" }}>
                Friday – Day Off
              </p>
            </div>
          </div>

          {/* Right: Form */}
          <div className="flex-1">
            <form
              onSubmit={(e) => e.preventDefault()}
              className="flex flex-col gap-4"
              noValidate
            >
              {/* First Name + Last Name */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <input
                  type="text"
                  className="cr-input"
                  placeholder={t.appointment.fields.firstName}
                  aria-label={t.appointment.fields.firstName}
                />
                <input
                  type="text"
                  className="cr-input"
                  placeholder={t.appointment.fields.lastName}
                  aria-label={t.appointment.fields.lastName}
                />
              </div>

              {/* Email + Phone */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <input
                  type="email"
                  className="cr-input"
                  placeholder={t.appointment.fields.email}
                  aria-label={t.appointment.fields.email}
                />
                <input
                  type="tel"
                  className="cr-input"
                  placeholder={t.appointment.fields.phone}
                  aria-label={t.appointment.fields.phone}
                />
              </div>

              {/* Message */}
              <textarea
                className="cr-input resize-none"
                rows={5}
                placeholder={t.appointment.fields.message}
                aria-label={t.appointment.fields.message}
              />

              {/* Submit */}
              <button type="submit" className="btn-primary w-full justify-center">
                {t.appointment.sendBtn}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
