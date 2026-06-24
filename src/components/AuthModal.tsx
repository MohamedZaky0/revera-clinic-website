"use client";

import { useEffect, useState, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabaseClient";

type AuthStep = 1 | 2 | 3;

const EGYPTIAN_PHONE_REGEX = /^01[0-9]{9}$/;
const OTP_REGEX = /^[0-9]{6}$/;

export function AuthModal() {
  const { t, isRTL } = useLanguage();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<AuthStep>(1);
  const [demoMode, setDemoMode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [authType, setAuthType] = useState<"phone" | "email">("phone");

  // Step 1: Phone Auth
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [phoneError, setPhoneError] = useState("");

  // Step 2: OTP
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");

  // Email Auth
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Step 3: Registration profile details
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [customerId, setCustomerId] = useState<string | null>(null);

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
    setCustomerId(null);
    setDemoMode(false);
    setVerifying(false);
    setAuthType("phone");
    setEmailInput("");
    setPasswordInput("");
    setIsSignUp(false);
    setEmailError("");
    setPasswordError("");
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    resetState();
  }, [resetState]);

  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent;
      resetState();
      if (customEvent.detail) {
        const { step, email, firstName, lastName, phone, customerId, gender } = customEvent.detail;
        if (step) setStep(step);
        if (email) {
          setEmail(email);
          setEmailInput(email);
        }
        if (firstName) setFirstName(firstName);
        if (lastName) setLastName(lastName);
        if (phone) setPhone(phone);
        if (customerId) setCustomerId(customerId);
        if (gender) {
          const g = gender.toLowerCase();
          if (g === "male" || g === "female") {
            setGender(g);
          }
        }
      }
      setOpen(true);
    };
    window.addEventListener("open-auth", handler as EventListener);
    return () => window.removeEventListener("open-auth", handler as EventListener);
  }, [resetState]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, handleClose]);

  async function handleSendOtp() {
    const cleaned = phone.replace(/\s+/g, "");
    if (!EGYPTIAN_PHONE_REGEX.test(cleaned)) {
      setPhoneError(t.auth.phoneHint);
      return;
    }
    setPhoneError("");
    setSending(true);

    const formattedPhone = `+20${cleaned.slice(1)}`;
    let useFallback = false;

    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithOtp({
          phone: formattedPhone,
        });
        if (error) {
          console.warn("Real Supabase OTP send failed. Falling back to Demo Mode:", error.message);
          useFallback = true;
        } else {
          console.log("Real Supabase OTP sent successfully!");
          setDemoMode(false);
        }
      } catch (err: any) {
        console.warn("Exception during real Supabase OTP send. Falling back to Demo Mode:", err);
        useFallback = true;
      }
    } else {
      useFallback = true;
    }

    if (useFallback) {
      setDemoMode(true);
    }

    setSending(false);
    setStep(2);
  }

  async function handleVerifyOtp() {
    if (!OTP_REGEX.test(otp)) {
      setOtpError(t.auth.otpHint);
      return;
    }
    setOtpError("");
    setVerifying(true);

    const cleaned = phone.replace(/\s+/g, "");
    const formattedPhone = `+20${cleaned.slice(1)}`;
    let verifiedSuccess = false;

    if (!demoMode && supabase) {
      try {
        const { data, error } = await supabase.auth.verifyOtp({
          phone: formattedPhone,
          token: otp,
          type: "sms",
        });
        if (error) {
          setOtpError(error.message);
          setVerifying(false);
          return;
        }
        verifiedSuccess = true;
      } catch (err: any) {
        console.warn("Real OTP verification exception. Falling back to demo check:", err);
        if (otp === "123456") {
          verifiedSuccess = true;
        } else {
          setOtpError("Verification error. Try using '123456' as a demo code.");
          setVerifying(false);
          return;
        }
      }
    } else {
      verifiedSuccess = true;
    }

    if (verifiedSuccess) {
      try {
        const res = await fetch(`/api/customers?mobile=${cleaned}`);
        if (res.ok) {
          const customer = await res.json();
          if (customer) {
            localStorage.setItem("revera_user", JSON.stringify(customer));
            window.dispatchEvent(new CustomEvent("revera-auth-change"));
            setVerifying(false);
            handleClose();
            return;
          }
        }
      } catch (err) {
        console.error("Error looking up customer profile:", err);
      }

      setStep(3);
    }
    setVerifying(false);
  }

  async function handleResendOtp() {
    setOtp("");
    setOtpError("");
    setSending(true);
    const cleaned = phone.replace(/\s+/g, "");
    const formattedPhone = `+20${cleaned.slice(1)}`;

    if (!demoMode && supabase) {
      try {
        await supabase.auth.signInWithOtp({
          phone: formattedPhone,
        });
      } catch (err) {
        console.warn("Error resending real OTP:", err);
      }
    }

    setTimeout(() => setSending(false), 1200);
  }

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    if (!emailInput || !passwordInput) {
      if (!emailInput) setEmailError("Email is required");
      if (!passwordInput) setPasswordError("Password is required");
      return;
    }
    setEmailError("");
    setPasswordError("");
    setVerifying(true);

    if (!supabase) {
      console.warn("Supabase not initialized. Using demo email auth fallback.");
      try {
        const res = await fetch(`/api/customers?email=${emailInput}`);
        if (res.ok) {
          const customer = await res.json();
          if (customer) {
            localStorage.setItem("revera_user", JSON.stringify(customer));
            window.dispatchEvent(new CustomEvent("revera-auth-change"));
            setVerifying(false);
            handleClose();
            return;
          }
        }
      } catch (err) {
        console.error("Demo email auth customer lookup error:", err);
      }
      
      setEmail(emailInput);
      setStep(3);
      setVerifying(false);
      return;
    }

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: emailInput,
          password: passwordInput,
        });
        if (error) {
          setEmailError(error.message);
          setVerifying(false);
          return;
        }
        setEmail(emailInput);
        setStep(3);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: emailInput,
          password: passwordInput,
        });
        if (error) {
          setEmailError(error.message);
          setVerifying(false);
          return;
        }

        const res = await fetch(`/api/customers?email=${emailInput}`);
        if (res.ok) {
          const customer = await res.json();
          if (customer) {
            localStorage.setItem("revera_user", JSON.stringify(customer));
            window.dispatchEvent(new CustomEvent("revera-auth-change"));
            setVerifying(false);
            handleClose();
            return;
          }
        }

        setEmail(emailInput);
        setStep(3);
      }
    } catch (err: any) {
      setEmailError(err.message || "An authentication error occurred.");
    } finally {
      setVerifying(false);
    }
  }

  async function handleOAuthLogin(provider: "google" | "facebook") {
    if (!supabase) {
      alert(`Supabase is not initialized. Cannot authenticate via ${provider}.`);
      return;
    }
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      alert(err.message || `Failed to log in with ${provider}`);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName || !lastName || !gender) {
      return;
    }
    const cleanedPhone = phone.replace(/\s+/g, "");
    if (!cleanedPhone) {
      alert(isRTL ? "رقم الهاتف مطلوب لإتمام التسجيل" : "Phone number is required to complete registration");
      return;
    }
    setVerifying(true);

    const payload = {
      ...(customerId ? { id: customerId } : {}),
      name: `${firstName.trim()} ${lastName.trim()}`,
      mobile: cleanedPhone,
      email: email.trim() || null,
      gender: gender === "male" ? "Male" : "Female",
    };

    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const customer = await res.json();
        localStorage.setItem("revera_user", JSON.stringify(customer));
        window.dispatchEvent(new CustomEvent("revera-auth-change"));
        setVerifying(false);
        handleClose();
      } else {
        const errData = await res.json();
        alert(errData.error || "Failed to register profile");
        setVerifying(false);
      }
    } catch (err: any) {
      console.error("Registration error:", err);
      alert("Network error. Failed to save registration.");
      setVerifying(false);
    }
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
        <div className="flex items-start justify-between mb-4">
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
              {step === 1 && (authType === "phone" ? t.auth.subtitle : (isSignUp ? (isRTL ? "قم بإنشاء حساب بالبريد الإلكتروني" : "Create an account with email") : (isRTL ? "قم بتسجيل الدخول بالبريد الإلكتروني" : "Sign in with your email")))}
              {step === 2 && t.auth.otpHint}
              {step === 3 && (isRTL ? "أكمل بيانات ملفك الشخصي" : "Complete your profile details")}
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

        {/* Tab Buttons (Phone vs Email) */}
        {step === 1 && (
          <div className="flex border-b border-gray-100 mb-5">
            <button
              onClick={() => setAuthType("phone")}
              className="flex-1 pb-2 text-sm font-semibold transition-colors border-b-2"
              style={{
                borderColor: authType === "phone" ? "var(--cr-primary)" : "transparent",
                color: authType === "phone" ? "var(--cr-primary)" : "var(--cr-accent)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                borderBottom: authType === "phone" ? "2px solid var(--cr-primary)" : "none"
              }}
            >
              {isRTL ? "الهاتف المحمول" : "Mobile Phone"}
            </button>
            <button
              onClick={() => setAuthType("email")}
              className="flex-1 pb-2 text-sm font-semibold transition-colors border-b-2"
              style={{
                borderColor: authType === "email" ? "var(--cr-primary)" : "transparent",
                color: authType === "email" ? "var(--cr-primary)" : "var(--cr-accent)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                borderBottom: authType === "email" ? "2px solid var(--cr-primary)" : "none"
              }}
            >
              {isRTL ? "البريد الإلكتروني" : "Email Address"}
            </button>
          </div>
        )}

        {/* Step 1: Phone Auth tab */}
        {step === 1 && authType === "phone" && (
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

        {/* Step 1: Email Auth tab */}
        {step === 1 && authType === "email" && (
          <form onSubmit={handleEmailAuth} className="flex flex-col gap-4" noValidate>
            <div>
              <input
                type="email"
                className="cr-input"
                placeholder={t.auth.email || "Email"}
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value);
                  if (emailError) setEmailError("");
                }}
                required
              />
              {emailError && (
                <p className="mt-1.5 text-xs" style={{ color: "var(--cr-error)" }}>
                  {emailError}
                </p>
              )}
            </div>

            <div>
              <input
                type="password"
                className="cr-input"
                placeholder={isRTL ? "كلمة المرور" : "Password"}
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  if (passwordError) setPasswordError("");
                }}
                required
              />
              {passwordError && (
                <p className="mt-1.5 text-xs" style={{ color: "var(--cr-error)" }}>
                  {passwordError}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={verifying}
              className="btn-primary w-full justify-center"
              style={{ opacity: verifying ? 0.6 : 1, cursor: verifying ? "not-allowed" : "pointer" }}
            >
              {verifying
                ? (isRTL ? "جارٍ التحميل..." : "Please wait...")
                : (isSignUp
                    ? (isRTL ? "إنشاء حساب" : "Sign Up")
                    : (isRTL ? "تسجيل الدخول" : "Sign In")
                  )}
            </button>

            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-xs text-center underline cursor-pointer bg-transparent border-none mt-1"
              style={{ color: "var(--cr-accent)" }}
            >
              {isSignUp
                ? (isRTL ? "لديك حساب بالفعل؟ تسجيل الدخول" : "Already have an account? Sign In")
                : (isRTL ? "ليس لديك حساب؟ إنشاء حساب جديد" : "Don't have an account? Sign Up")
              }
            </button>
          </form>
        )}

        {/* Step 2: OTP (Only for Phone) */}
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
              disabled={verifying}
              className="btn-primary w-full justify-center"
              style={{ opacity: verifying ? 0.6 : 1, cursor: verifying ? "not-allowed" : "pointer" }}
            >
              {verifying ? (isRTL ? "جارٍ التحقق..." : "Verifying...") : (isRTL ? "تحقق" : "Verify")}
            </button>

            <button
              onClick={handleResendOtp}
              disabled={sending}
              className="text-xs text-center underline cursor-pointer bg-transparent border-none"
              style={{ color: "var(--cr-accent)", opacity: sending ? 0.5 : 1 }}
            >
              {sending ? t.auth.sending : t.auth.resendOtp}
            </button>

            {demoMode && (
              <div
                className="text-xs p-3 rounded-lg text-center"
                style={{
                  backgroundColor: "rgba(196,174,124,0.1)",
                  color: "var(--cr-primary)",
                  border: "1px dashed var(--cr-primary)",
                  marginTop: "8px"
                }}
              >
                {isRTL
                  ? "وضع التجربة نشط: استخدم رمز التحقق 123456 للمتابعة."
                  : "Demo Mode Active: Enter verification code 123456 to continue."}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Registration Profile Details */}
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

            {/* Mobile (Only shown if they signed in via Email/OAuth and we don't have it) */}
            {(!phone || phone === "") && (
              <div>
                <input
                  type="tel"
                  className="cr-input"
                  placeholder={t.auth.phonePlaceholder}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  aria-label={t.auth.phonePlaceholder}
                  required
                />
                <p className="mt-1.5 text-xs text-gray-400">
                  {t.auth.phoneHint}
                </p>
              </div>
            )}

            {/* Email (Only shown if we don't have it) */}
            {(!email || email === "") && (
              <input
                type="email"
                className="cr-input"
                placeholder={t.auth.email}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-label={t.auth.email}
              />
            )}

            {/* Gender */}
            <div>
              <p
                className="mb-2 text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--cr-accent)" }}
              >
                {t.auth.gender}
              </p>
              <div className="flex gap-4">
                {(["female", "male"] as const).map((g) => (
                  <label
                    key={g}
                    className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-colors"
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

            <button
              type="submit"
              disabled={verifying}
              className="btn-primary w-full justify-center mt-2"
              style={{ opacity: verifying ? 0.6 : 1, cursor: verifying ? "not-allowed" : "pointer" }}
            >
              {verifying ? (isRTL ? "جارٍ حفظ البيانات..." : "Saving profile...") : (isRTL ? "إتمام التسجيل" : "Complete Registration")}
            </button>
          </form>
        )}

        {/* Divider and OAuth Buttons */}
        {step === 1 && (
          <>
            <div className="flex items-center my-5">
              <div className="flex-grow border-t border-gray-100"></div>
              <span className="mx-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                {isRTL ? "أو المتابعة باستخدام" : "Or continue with"}
              </span>
              <div className="flex-grow border-t border-gray-100"></div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handleOAuthLogin('google')}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold transition-colors hover:bg-gray-50"
                style={{ color: "var(--cr-primary)" }}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.56 5.56 0 0 1 8.423 13a5.56 5.56 0 0 1 5.568-5.514c1.472 0 2.802.557 3.827 1.486l3.227-3.227C19.123 3.842 16.79 3 13.99 3A10 10 0 0 0 4 13a10 10 0 0 0 9.99 10c5.556 0 9.998-4.048 9.998-10 0-.6-.056-1.172-.162-1.715H12.24Z"/>
                </svg>
                <span>Google</span>
              </button>
              <button
                type="button"
                onClick={() => handleOAuthLogin('facebook')}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold transition-colors hover:bg-gray-50"
                style={{ color: "var(--cr-primary)" }}
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" style={{ color: "#1877F2" }}>
                  <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z"/>
                </svg>
                <span>Facebook</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
