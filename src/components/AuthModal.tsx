"use client";

import { useEffect, useState, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabaseClient";

type AuthStep = 1 | 2 | 3;

const OTP_REGEX = /^[0-9]{6}$/;

function convertArabicToEnglishDigits(str: string): string {
  const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return str.replace(/[٠-٩]/g, (w) => String(arabicDigits.indexOf(w)));
}

function cleanAndFormatPhone(rawPhone: string) {
  let cleaned = convertArabicToEnglishDigits(rawPhone);
  // Remove all non-digit characters except '+' (if present)
  cleaned = cleaned.replace(/[^\d+]/g, "");
  
  // If it starts with +2001, correct it to +201
  if (cleaned.startsWith("+2001")) {
    cleaned = "+201" + cleaned.slice(5);
  }
  // If it starts with 2001, correct it to 201
  else if (cleaned.startsWith("2001")) {
    cleaned = "201" + cleaned.slice(4);
  }

  // Convert to local 11-digit Egyptian format (starts with '01')
  let localPhone = "";
  if (cleaned.startsWith("+201") && cleaned.length === 13) {
    localPhone = "0" + cleaned.slice(3);
  } else if (cleaned.startsWith("201") && cleaned.length === 12) {
    localPhone = "0" + cleaned.slice(2);
  } else if (cleaned.startsWith("01") && cleaned.length === 11) {
    localPhone = cleaned;
  } else if (cleaned.startsWith("1") && cleaned.length === 10) {
    localPhone = "0" + cleaned;
  }

  // Format to E.164 format (+201XXXXXXXXX)
  let e164Phone = "";
  if (localPhone && localPhone.length === 11) {
    e164Phone = "+20" + localPhone.slice(1);
  }

  return { localPhone, e164Phone, isValid: localPhone !== "" };
}

export function AuthModal() {
  const { t, isRTL } = useLanguage();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<AuthStep>(1);
  const [demoMode, setDemoMode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [authType, setAuthType] = useState<"phone" | "email">("email");

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
  const [loadingProfileOnboarding, setLoadingProfileOnboarding] = useState(false);
  const [hasPhoneInDb, setHasPhoneInDb] = useState(false);

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
    setLoadingProfileOnboarding(false);
    setHasPhoneInDb(false);
    setDemoMode(false);
    setVerifying(false);
    setAuthType("email");
    setEmailInput("");
    setPasswordInput("");
    setIsSignUp(false);
    setEmailError("");
    setPasswordError("");
  }, []);

  const handleClose = useCallback(() => {
    if (loadingProfileOnboarding || step === 3) {
      sessionStorage.setItem("revera_profile_prompted", "true");
    }
    setOpen(false);
    resetState();
  }, [resetState, loadingProfileOnboarding, step]);

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
        if (phone) {
          setPhone(phone);
          if (!phone.startsWith("guest_")) {
            setHasPhoneInDb(true);
          }
        }
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
    if (!supabase) return;

    supabase.auth.getSession().then(({ data: { session } }: any) => {
      handleSessionCheck(session);
    }).catch((err: any) => {
      console.warn("AuthModal getSession error:", err);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: any, session: any) => {
      if (event === "SIGNED_IN") {
        sessionStorage.removeItem("revera_profile_prompted");
      }
      handleSessionCheck(session);
    });

    async function handleSessionCheck(session: any) {
      if (!session?.user) return;

      const emailVal = session.user.email;
      if (emailVal) {
        try {
          const checkEmpRes = await fetch(`/api/auth/employee-email?email=${encodeURIComponent(emailVal)}`);
          if (checkEmpRes.ok) {
            const { exists } = await checkEmpRes.json();
            if (exists) {
              const loginInProgress = typeof window !== "undefined" && sessionStorage.getItem("customer_login_in_progress");
              if (loginInProgress) {
                alert("This email is registered as an administrator/employee account and cannot be used for customer access.");
                await supabase.auth.signOut();
                localStorage.removeItem("revera_user");
                window.dispatchEvent(new CustomEvent("revera-auth-change"));
                setOpen(false);
                resetState();
              } else {
                localStorage.removeItem("revera_user");
                window.dispatchEvent(new CustomEvent("revera-auth-change"));
              }
              if (typeof window !== "undefined") {
                sessionStorage.removeItem("customer_login_in_progress");
              }
              return;
            }
          }
        } catch (err) {
          console.error("Employee verification check failed:", err);
        }
      }

      const stored = localStorage.getItem("revera_user");
      let parsedStored = null;
      if (stored) {
        try {
          parsedStored = JSON.parse(stored);
        } catch {}
      }

      const isIncompleteStored = !parsedStored || !parsedStored.gender || !parsedStored.mobile || parsedStored.mobile.startsWith("guest_");

      if (isIncompleteStored) {
        const promptedThisSession = sessionStorage.getItem("revera_profile_prompted");
        if (!promptedThisSession) {
          const meta = session.user.user_metadata || {};
          const fullName = meta.full_name || meta.name || session.user.email?.split('@')[0] || "";
          const nameParts = fullName.trim().split(/\s+/);
          const firstName = nameParts[0] || "";
          const lastName = nameParts.slice(1).join(" ") || "";
          const phoneVal = session.user.phone || "";
          const cleanedPhone = phoneVal ? (phoneVal.startsWith("+20") ? "0" + phoneVal.slice(3) : phoneVal) : "";

          setStep(3);
          setEmail(session.user.email || "");
          setEmailInput(session.user.email || "");
          setFirstName(firstName);
          setLastName(lastName);
          setPhone(cleanedPhone);
          setCustomerId(null);
          setGender("");
          setHasPhoneInDb(cleanedPhone !== "" && !cleanedPhone.startsWith("guest_"));
          setLoadingProfileOnboarding(true);
          setOpen(true);

          const phone = session.user.phone;
          const emailVal = session.user.email;
          let customer = null;

          try {
            if (phone) {
              let localMobile = phone;
              if (phone.startsWith("+20")) {
                localMobile = "0" + phone.slice(3);
              }
              const res = await fetch(`/api/customers?mobile=${localMobile}`);
              if (res.ok) customer = await res.json();
            }

            if (!customer && emailVal) {
              const res = await fetch(`/api/customers?email=${emailVal}`);
              if (res.ok) customer = await res.json();
            }

            const isDbProfileComplete = 
              customer && 
              customer.name && 
              customer.mobile && 
              !customer.mobile.startsWith("guest_") && 
              customer.gender;

            if (isDbProfileComplete) {
              localStorage.setItem("revera_user", JSON.stringify(customer));
              window.dispatchEvent(new CustomEvent("revera-auth-change"));
              setOpen(false);
              resetState();
            } else {
              if (customer) {
                const dbName = customer.name || "";
                if (dbName) {
                  const dbNameParts = dbName.trim().split(/\s+/);
                  setFirstName(dbNameParts[0] || "");
                  setLastName(dbNameParts.slice(1).join(" ") || "");
                }
                if (customer.mobile && !customer.mobile.startsWith("guest_")) {
                  setPhone(customer.mobile);
                  setHasPhoneInDb(true);
                }
                if (customer.gender) {
                  const g = customer.gender.toLowerCase();
                  if (g === "male" || g === "female") setGender(g);
                }
                setCustomerId(customer.id || null);
              }
              setLoadingProfileOnboarding(false);
            }
          } catch (err) {
            console.error("Background onboarding lookup failed:", err);
            setLoadingProfileOnboarding(false);
          }
        }
      }
    }

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, handleClose]);

  async function handleSendOtp() {
    const { localPhone, e164Phone, isValid } = cleanAndFormatPhone(phone);
    if (!isValid) {
      setPhoneError(t.auth.phoneHint);
      return;
    }
    setPhoneError("");
    setSending(true);

    // Normalize phone number in the UI/state to the 11-digit format
    setPhone(localPhone);

    if (supabase) {
      try {
        console.log("Sending SMS OTP via Supabase to:", e164Phone);
        const { error } = await supabase.auth.signInWithOtp({
          phone: e164Phone,
        });
        if (error) {
          setPhoneError(error.message || "Failed to send code. Please try again.");
          setSending(false);
          return;
        }
        console.log("Real Supabase OTP sent successfully!");
        setDemoMode(false);
      } catch (err: any) {
        setPhoneError(err.message || "An error occurred while sending the code.");
        setSending(false);
        return;
      }
    } else {
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

    const { localPhone, e164Phone, isValid } = cleanAndFormatPhone(phone);
    if (!isValid) {
      setOtpError("Invalid phone number state.");
      setVerifying(false);
      return;
    }
    let verifiedSuccess = false;

    if (!demoMode && supabase) {
      try {
        const { error } = await supabase.auth.verifyOtp({
          phone: e164Phone,
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
        setOtpError(err.message || "Verification failed. Please try again.");
        setVerifying(false);
        return;
      }
    } else {
      if (otp === "123456") {
        verifiedSuccess = true;
      } else {
        setOtpError("Verification error. Try using '123456' as a demo code.");
        setVerifying(false);
        return;
      }
    }

    if (verifiedSuccess) {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("customer_login_in_progress", "true");
      }
      try {
        const res = await fetch(`/api/customers?mobile=${localPhone}`);
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

      setHasPhoneInDb(true);
      setStep(3);
    }
    setVerifying(false);
  }

  async function handleResendOtp() {
    setOtp("");
    setOtpError("");
    setSending(true);
    const { e164Phone, isValid } = cleanAndFormatPhone(phone);

    if (!demoMode && supabase && isValid) {
      try {
        const { error } = await supabase.auth.signInWithOtp({
          phone: e164Phone,
        });
        if (error) {
          setOtpError(error.message);
        }
      } catch (err: any) {
        setOtpError(err.message || "Failed to resend code.");
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
    if (typeof window !== "undefined") {
      sessionStorage.setItem("customer_login_in_progress", "true");
    }

    try {
      const checkEmpRes = await fetch(`/api/auth/employee-email?email=${encodeURIComponent(emailInput)}`);
      if (checkEmpRes.ok) {
        const { exists } = await checkEmpRes.json();
        if (exists) {
          setEmailError("This email is registered as an administrator/employee account and cannot be used for customer access.");
          setVerifying(false);
          return;
        }
      }
    } catch (err) {
      console.error("Employee verification check failed:", err);
    }

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
      if (typeof window !== "undefined") {
        sessionStorage.setItem("customer_login_in_progress", "true");
      }
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
      alert(isRTL ? "يرجى ملء جميع الحقول المطلوبة" : "Please fill in all required fields");
      return;
    }
    const { localPhone, isValid } = cleanAndFormatPhone(phone);
    if (!isValid) {
      alert(isRTL ? "يرجى إدخال رقم هاتف مصري صحيح" : "Please enter a valid Egyptian phone number");
      return;
    }
    if (!email || !email.trim()) {
      alert(isRTL ? "البريد الإلكتروني مطلوب" : "Email Address is required");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      alert(isRTL ? "يرجى إدخال بريد إلكتروني صحيح" : "Please enter a valid email address");
      return;
    }
    setVerifying(true);

    const payload = {
      ...(customerId ? { id: customerId } : {}),
      name: `${firstName.trim()} ${lastName.trim()}`,
      mobile: localPhone,
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

        {/* Tab Buttons (Phone vs Email) - Hidden for now */}

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
            {isSignUp && (
              <>
                {/* Name row */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <input
                    type="text"
                    className="cr-input"
                    placeholder={t.auth.firstName}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                  <input
                    type="text"
                    className="cr-input"
                    placeholder={t.auth.lastName}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>

                {/* Mobile Phone */}
                <div>
                  <input
                    type="tel"
                    className="cr-input"
                    placeholder={t.auth.phonePlaceholder}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                  <p className="mt-1.5 text-xs text-gray-400">
                    {t.auth.phoneHint}
                  </p>
                </div>

                {/* Gender */}
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--cr-accent)" }}>
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
                          name="signup_gender"
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
              </>
            )}

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
                  const conv = convertArabicToEnglishDigits(e.target.value);
                  setOtp(conv.replace(/\D/g, "").slice(0, 6));
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
          loadingProfileOnboarding ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--cr-accent)]" style={{ borderColor: "var(--cr-accent) transparent transparent transparent" }}></div>
              <p className="text-xs font-semibold uppercase tracking-wider animate-pulse" style={{ color: "var(--cr-primary)" }}>
                {isRTL ? "جارٍ التحقق من حسابك..." : "Checking account status..."}
              </p>
            </div>
          ) : (
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
            {!hasPhoneInDb && (
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
                required
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
          )
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
