"use client";

import { useEffect, useState, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

type AuthStep = 1 | 2 | 3;

const EGYPTIAN_PHONE_REGEX = /^01[0-9]{9}$/;
const OTP_REGEX = /^[0-9]{6}$/;

export function AuthModal() {
  const { t, isRTL } = useLanguage();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<AuthStep>(1);

  // Step 1
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [phoneError, setPhoneError] = useState("");

  // Step 2
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");

  // Step 3
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "">("");

  const resetState = useCallback(() => {
    setStep(1);
    setPhone("");
    setSending(false);
    setPhoneError("");
    setOtp("");
    setOtpError("");
    setFirstName("");
    setLastName("");
    setEmail("");
    setGender("");
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    resetState();
  }, [resetState]);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-auth", handler);
    return () => window.removeEventListener("open-auth", handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, handleClose]);

  function handleSendOtp() {
    const cleaned = phone.replace(/\s+/g, "");
    if (!EGYPTIAN_PHONE_REGEX.test(cleaned)) {
      setPhoneError(t.auth.phoneHint);
      return;
    }
    setPhoneError("");
    setSending(true);
    // Simulate async OTP send
    setTimeout(() => {
      setSending(false);
      setStep(2);
    }, 1200);
  }

  function handleVerifyOtp() {
    if (!OTP_REGEX.test(otp)) {
      setOtpError(t.auth.otpHint);
      return;
    }
    setOtpError("");
    setStep(3);
  }

  function handleResendOtp() {
    setOtp("");
    setOtpError("");
    setSending(true);
    setTimeout(() => setSending(false), 1200);
  }

  function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    // UI-only: just close
    handleClose();
  }

  return (
    <div
      className={`modal-overlay${open ? " open" : ""}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={t.auth.title}
    >
      <div className="modal-box" dir={isRTL ? "rtl" : "ltr"}>
        {/* Header */}
        <div className={`flex items-start justify-between mb-6 ${isRTL ? "flex-row-reverse" : ""}`}>
          <div>
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full mb-3"
              style={{ backgroundColor: "var(--cr-secondary)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/main_logo.png" alt="Revera" width={28} height={28} style={{ objectFit: "contain" }} />
            </div>
            <h3 className="text-lg font-semibold" style={{ color: "var(--cr-primary)" }}>
              {t.auth.title}
            </h3>
            <p className="text-xs mt-1" style={{ color: "var(--cr-accent)" }}>
              {step === 1 && t.auth.subtitle}
              {step === 2 && t.auth.otpHint}
              {step === 3 && t.auth.gender}
            </p>
          </div>
          <button
            onClick={handleClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-xl transition-colors hover:bg-gray-100"
            style={{ color: "var(--cr-accent)" }}
          >
            ×
          </button>
        </div>

        {/* Step 1: Phone */}
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <div>
              <input
                type="tel"
                className="cr-input"
                placeholder={t.auth.phonePlaceholder}
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (phoneError) setPhoneError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSendOtp();
                }}
                aria-label={t.auth.phonePlaceholder}
                autoFocus
              />
              {phoneError && (
                <p className="mt-1.5 text-xs" style={{ color: "var(--cr-error)" }}>
                  {phoneError}
                </p>
              )}
              <p className="mt-1.5 text-xs" style={{ color: "var(--cr-accent)" }}>
                {t.auth.phoneHint}
              </p>
            </div>

            <button
              onClick={handleSendOtp}
              disabled={sending}
              className="btn-primary w-full justify-center"
              style={{ opacity: sending ? 0.6 : 1, cursor: sending ? "not-allowed" : "pointer" }}
            >
              {sending ? t.auth.sending : t.auth.sendOtp}
            </button>
          </div>
        )}

        {/* Step 2: OTP */}
        {step === 2 && (
          <div className="flex flex-col gap-4">
            <div>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                className="cr-input text-center tracking-widest text-lg"
                placeholder={t.auth.otpPlaceholder}
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                  if (otpError) setOtpError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleVerifyOtp();
                }}
                aria-label={t.auth.otpPlaceholder}
                autoFocus
              />
              {otpError && (
                <p className="mt-1.5 text-xs" style={{ color: "var(--cr-error)" }}>
                  {otpError}
                </p>
              )}
            </div>

            <button
              onClick={handleVerifyOtp}
              className="btn-primary w-full justify-center"
            >
              Verify
            </button>

            <button
              onClick={handleResendOtp}
              disabled={sending}
              className="text-xs text-center underline cursor-pointer bg-transparent border-none"
              style={{ color: "var(--cr-accent)", opacity: sending ? 0.5 : 1 }}
            >
              {sending ? t.auth.sending : t.auth.resendOtp}
            </button>
          </div>
        )}

        {/* Step 3: Registration */}
        {step === 3 && (
          <form onSubmit={handleRegister} className="flex flex-col gap-4" noValidate>
            {/* Name row */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <input
                type="text"
                className="cr-input"
                placeholder={t.auth.firstName}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                aria-label={t.auth.firstName}
                required
              />
              <input
                type="text"
                className="cr-input"
                placeholder={t.auth.lastName}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                aria-label={t.auth.lastName}
                required
              />
            </div>

            {/* Email */}
            <input
              type="email"
              className="cr-input"
              placeholder={t.auth.email}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-label={t.auth.email}
            />

            {/* Gender */}
            <div>
              <p
                className="mb-2 text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--cr-accent)" }}
              >
                {t.auth.gender}
              </p>
              <div className={`flex gap-4 ${isRTL ? "flex-row-reverse" : ""}`}>
                {(["female", "male"] as const).map((g) => (
                  <label
                    key={g}
                    className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-colors ${isRTL ? "flex-row-reverse" : ""}`}
                    style={{
                      backgroundColor: gender === g ? "var(--cr-primary)" : "var(--cr-secondary)",
                      color: gender === g ? "var(--cr-white)" : "var(--cr-primary)",
                      border: gender === g ? "none" : "1.5px solid var(--cr-accent)",
                    }}
                  >
                    <input
                      type="radio"
                      name="gender"
                      value={g}
                      checked={gender === g}
                      onChange={() => setGender(g)}
                      className="sr-only"
                    />
                    {g === "female" ? t.auth.female : t.auth.male}
                  </label>
                ))}
              </div>
            </div>

            <button type="submit" className="btn-primary w-full justify-center mt-2">
              {t.nav.makeAppointment}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
