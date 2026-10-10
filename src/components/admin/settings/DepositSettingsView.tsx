"use client";

import { adminTranslations } from "@/components/admin/translations";
import { CLIENT } from "@/config/client";

interface DepositSettingsViewProps {
  instapayName: string;
  setInstapayName: (v: string) => void;
  instapayAddress: string;
  setInstapayAddress: (v: string) => void;
  instapayLink: string;
  setInstapayLink: (v: string) => void;
  walletEnabled: boolean;
  setWalletEnabled: (v: boolean) => void;
  walletName: string;
  setWalletName: (v: string) => void;
  walletNumber: string;
  setWalletNumber: (v: string) => void;
  walletLink: string;
  setWalletLink: (v: string) => void;
  bookingDepositPercentage: number;
  setBookingDepositPercentage: (v: number) => void;
  handleSaveDepositSettings: () => Promise<void>;
  savingDepositSettings: boolean;
  lang: "en" | "ar";
  t: (typeof adminTranslations)["en"]["settingsScreens"]["depositSettings"];
}

export default function DepositSettingsView({
  instapayName,
  setInstapayName,
  instapayAddress,
  setInstapayAddress,
  instapayLink,
  setInstapayLink,
  walletEnabled,
  setWalletEnabled,
  walletName,
  setWalletName,
  walletNumber,
  setWalletNumber,
  walletLink,
  setWalletLink,
  bookingDepositPercentage,
  setBookingDepositPercentage,
  handleSaveDepositSettings,
  savingDepositSettings,
  lang,
  t,
}: DepositSettingsViewProps) {
  return (
    <div className="space-y-6" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="mb-4 sm:mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-4xl font-semibold text-[var(--cr-dark)]">{t.title}</h2>
          <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-[var(--color-brand-secondary)]">{t.subtitle}</p>
        </div>
        <button
          onClick={handleSaveDepositSettings}
          disabled={savingDepositSettings}
          className="rounded-3xl bg-[var(--cr-primary)] px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-[var(--color-brand-light)] transition hover:bg-[#2e3a26] disabled:opacity-50 shadow-md w-full sm:w-auto"
        >
          {savingDepositSettings ? t.savingBtn : t.saveBtn}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        {/* Left Column: Form Settings */}
        <div className="lg:col-span-7 rounded-2xl sm:rounded-[32px] md:rounded-[40px] bg-white p-4 sm:p-6 md:p-8 shadow-[0_30px_80px_rgba(47,61,41,0.07)] space-y-4 sm:space-y-6">
          {/* InstaPay Details */}
          <h3 className="text-lg sm:text-xl font-bold text-[var(--cr-dark)] border-b border-gray-100 pb-3">{t.instapayDetails}</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-brand-secondary)] mb-2">{t.instapayName}</label>
              <input
                type="text"
                value={instapayName}
                onChange={(e) => setInstapayName(e.target.value)}
                placeholder={CLIENT.name}
                className="w-full rounded-2xl border border-[var(--cr-primary)]/15 bg-[var(--color-brand-light)] px-4 py-3 text-sm text-[var(--cr-dark)] placeholder:text-[#B0BCA7] outline-none focus:border-[var(--cr-primary)] transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-brand-secondary)] mb-2">{t.instapayAddress}</label>
              <input
                type="text"
                value={instapayAddress}
                onChange={(e) => setInstapayAddress(e.target.value)}
                placeholder="revera@instapay"
                className="w-full rounded-2xl border border-[var(--cr-primary)]/15 bg-[var(--color-brand-light)] px-4 py-3 text-sm text-[var(--cr-dark)] placeholder:text-[#B0BCA7] outline-none focus:border-[var(--cr-primary)] transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-brand-secondary)] mb-2">{t.instapayLink}</label>
              <input
                type="text"
                value={instapayLink}
                onChange={(e) => setInstapayLink(e.target.value)}
                placeholder="e.g. https://www.instapay.eg or deep link"
                className="w-full rounded-2xl border border-[var(--cr-primary)]/15 bg-[var(--color-brand-light)] px-4 py-3 text-sm text-[var(--cr-dark)] placeholder:text-[#B0BCA7] outline-none focus:border-[var(--cr-primary)] transition"
              />
              <span className="text-[11px] text-[#8A9A81] mt-1 block">{t.instapayLinkHint}</span>
            </div>
          </div>

          {/* Mobile Wallet Details */}
          <h3 className="text-xl font-bold text-[var(--cr-dark)] border-b border-gray-100 pb-3 pt-2">{t.walletSettings}</h3>

          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer p-3.5 rounded-2xl bg-[var(--color-brand-light)] border border-[var(--cr-primary)]/10 hover:border-[var(--cr-primary)]/30 transition">
              <input
                type="checkbox"
                checked={walletEnabled}
                onChange={(e) => setWalletEnabled(e.target.checked)}
                className="h-5 w-5 rounded accent-[var(--cr-primary)]"
              />
              <div>
                <span className="text-sm font-bold text-[var(--cr-dark)]">{t.walletEnabled}</span>
                <p className="text-[11px] text-[#8A9A81]">{t.walletEnabledHint}</p>
              </div>
            </label>

            {walletEnabled && (
              <div className="space-y-4 ps-3 border-s-2 border-[var(--cr-primary)]/15 mt-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-brand-secondary)] mb-2">{t.walletName}</label>
                  <input
                    type="text"
                    value={walletName}
                    onChange={(e) => setWalletName(e.target.value)}
                    placeholder="e.g. Vodafone Cash / Smart Wallet"
                    className="w-full rounded-2xl border border-[var(--cr-primary)]/15 bg-[var(--color-brand-light)] px-4 py-3 text-sm text-[var(--cr-dark)] outline-none focus:border-[var(--cr-primary)] transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-brand-secondary)] mb-2">{t.walletNumber}</label>
                  <input
                    type="text"
                    value={walletNumber}
                    onChange={(e) => setWalletNumber(e.target.value)}
                    placeholder="e.g. 01012345678"
                    className="w-full rounded-2xl border border-[var(--cr-primary)]/15 bg-[var(--color-brand-light)] px-4 py-3 text-sm text-[var(--cr-dark)] outline-none focus:border-[var(--cr-primary)] transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-brand-secondary)] mb-2">{t.walletLink}</label>
                  <input
                    type="text"
                    value={walletLink}
                    onChange={(e) => setWalletLink(e.target.value)}
                    placeholder="e.g. https://..."
                    className="w-full rounded-2xl border border-[var(--cr-primary)]/15 bg-[var(--color-brand-light)] px-4 py-3 text-sm text-[var(--cr-dark)] outline-none focus:border-[var(--cr-primary)] transition"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Prepayment Rule */}
          <h3 className="text-xl font-bold text-[var(--cr-dark)] border-b border-gray-100 pb-3 pt-2">{t.prepaymentRules}</h3>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-brand-secondary)] mb-2">{t.depositPercentage}</label>
            <input
              type="number"
              min={0}
              max={100}
              value={bookingDepositPercentage}
              onChange={(e) => setBookingDepositPercentage(Math.max(0, Math.min(100, Number(e.target.value))))}
              className="w-full rounded-2xl border border-[var(--cr-primary)]/15 bg-[var(--color-brand-light)] px-4 py-3 text-sm text-[var(--cr-dark)] outline-none focus:border-[var(--cr-primary)] transition"
            />
            <span className="text-[11px] text-[#8A9A81] mt-1 block">{t.depositPercentageHint}</span>
          </div>
        </div>

        {/* Right Column: Live QR Preview */}
        <div className="lg:col-span-5 rounded-2xl sm:rounded-[32px] md:rounded-[40px] bg-white p-4 sm:p-6 md:p-8 shadow-[0_30px_80px_rgba(47,61,41,0.07)] text-center flex flex-col items-center">
          <h3 className="text-lg sm:text-xl font-bold text-[var(--cr-dark)] border-b border-gray-100 pb-3 w-full mb-4 sm:mb-6">{t.liveQrPreview}</h3>
          <div className="bg-white p-4 rounded-3xl border border-[var(--cr-accent)]/20 shadow-md inline-block mb-4">
            <img
              src={instapayLink && instapayLink !== "https://www.instapay.eg"
                ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(instapayLink)}`
                : "/images/instapay_qr.png"}
              alt="InstaPay QR Preview"
              className="w-40 h-40 sm:w-48 sm:h-48 object-contain"
            />
          </div>
          <p className="text-xs text-[var(--color-brand-secondary)] font-semibold uppercase tracking-wider mb-2">{t.generatedQr}</p>
          <p className="text-[10px] text-[#8A9A81] max-w-xs">{t.qrHint}</p>
        </div>
      </div>
    </div>
  );
}
