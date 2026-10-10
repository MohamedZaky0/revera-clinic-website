"use client";

import React, { useState } from "react";
import { CLIENT } from "@/config/client";

interface ClinicProfileSettingsViewProps {
  authenticatedJsonHeaders: { "Content-Type": string; Authorization: string };
}

export default function ClinicProfileSettingsView({ authenticatedJsonHeaders }: ClinicProfileSettingsViewProps) {
  const [clinicName, setClinicName] = useState<string>(CLIENT.name);
  const [clinicNameAr, setClinicNameAr] = useState("ريفيرا كلينك");
  const [clinicLocation, setClinicLocation] = useState("Sheikh Zayed City, Giza");
  const [clinicLocationAr, setClinicLocationAr] = useState("مدينة الشيخ زايد، الجيزة");
  const [clinicEmail, setClinicEmail] = useState("info@reveraclinics.com");
  const [clinicPhone, setClinicPhone] = useState("+20 2 3796 2200");
  const [clinicWhatsapp, setClinicWhatsapp] = useState<string>(CLIENT.phoneTel);
  const [savingClinicProfile, setSavingClinicProfile] = useState(false);

  async function handleSaveClinicProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingClinicProfile(true);
    try {
      await fetch("/api/page-settings", {
        method: "POST",
        headers: authenticatedJsonHeaders,
        body: JSON.stringify({
          clinic: { name: clinicName, name_ar: clinicNameAr, location: clinicLocation, location_ar: clinicLocationAr, email: clinicEmail, phone: clinicPhone, whatsapp: clinicWhatsapp }
        }),
      });
    } catch (err) {
      console.error("handleSaveClinicProfile error:", err);
    } finally {
      setSavingClinicProfile(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="mb-4 sm:mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-4xl font-semibold text-[var(--cr-dark)]">Clinic Profile Settings</h2>
          <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-[var(--color-brand-secondary)]">Configure the core identity, contact details, and localization of your clinic.</p>
        </div>
        <button
          form="clinic-profile-form"
          type="submit"
          disabled={savingClinicProfile}
          className="rounded-3xl bg-[var(--cr-primary)] px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-[var(--color-brand-light)] transition hover:bg-[#2e3a26] disabled:opacity-50 shadow-md w-full sm:w-auto"
        >
          {savingClinicProfile ? "Saving..." : "Save Profile"}
        </button>
      </div>
      <div className="rounded-2xl sm:rounded-[32px] md:rounded-[40px] bg-white p-4 sm:p-6 md:p-8 shadow-[0_30px_80px_rgba(47,61,41,0.07)] max-w-2xl">
        <form id="clinic-profile-form" className="space-y-6" onSubmit={handleSaveClinicProfile}>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-brand-secondary)] mb-2">Clinic Brand Name (EN)</label>
              <input
                type="text"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                className="w-full rounded-2xl border border-[var(--cr-primary)]/15 bg-[var(--color-brand-light)] px-4 py-3 text-sm text-[var(--cr-dark)] outline-none focus:border-[var(--cr-primary)] transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-brand-secondary)] mb-2 text-right">اسم العلامة التجارية (AR)</label>
              <input
                type="text"
                dir="rtl"
                value={clinicNameAr}
                onChange={(e) => setClinicNameAr(e.target.value)}
                className="w-full rounded-2xl border border-[var(--cr-primary)]/15 bg-[var(--color-brand-light)] px-4 py-3 text-sm text-[var(--cr-dark)] outline-none focus:border-[var(--cr-primary)] transition text-right"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-brand-secondary)] mb-2">Primary Location (EN)</label>
              <input
                type="text"
                value={clinicLocation}
                onChange={(e) => setClinicLocation(e.target.value)}
                className="w-full rounded-2xl border border-[var(--cr-primary)]/15 bg-[var(--color-brand-light)] px-4 py-3 text-sm text-[var(--cr-dark)] outline-none focus:border-[var(--cr-primary)] transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-brand-secondary)] mb-2 text-right">الموقع الرئيسي (AR)</label>
              <input
                type="text"
                dir="rtl"
                value={clinicLocationAr}
                onChange={(e) => setClinicLocationAr(e.target.value)}
                className="w-full rounded-2xl border border-[var(--cr-primary)]/15 bg-[var(--color-brand-light)] px-4 py-3 text-sm text-[var(--cr-dark)] outline-none focus:border-[var(--cr-primary)] transition text-right"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-brand-secondary)] mb-2">Inquiries Email</label>
              <input
                type="email"
                value={clinicEmail}
                onChange={(e) => setClinicEmail(e.target.value)}
                className="w-full rounded-2xl border border-[var(--cr-primary)]/15 bg-[var(--color-brand-light)] px-4 py-3 text-sm text-[var(--cr-dark)] outline-none focus:border-[var(--cr-primary)] transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-brand-secondary)] mb-2">Inquiries Phone</label>
              <input
                type="text"
                value={clinicPhone}
                onChange={(e) => setClinicPhone(e.target.value)}
                className="w-full rounded-2xl border border-[var(--cr-primary)]/15 bg-[var(--color-brand-light)] px-4 py-3 text-sm text-[var(--cr-dark)] outline-none focus:border-[var(--cr-primary)] transition"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-brand-secondary)] mb-2">WhatsApp Number</label>
              <input
                type="text"
                value={clinicWhatsapp}
                onChange={(e) => setClinicWhatsapp(e.target.value)}
                className="w-full rounded-2xl border border-[var(--cr-primary)]/15 bg-[var(--color-brand-light)] px-4 py-3 text-sm text-[var(--cr-dark)] outline-none focus:border-[var(--cr-primary)] transition"
              />
              <span className="text-[11px] text-[#8A9A81] mt-1 block">Used for the WhatsApp floating chat button visible on all public pages.</span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
