"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getRoleSlug, getRoleDisplayName } from "@/lib/roleUtils";
import { Lock, Mail, Eye, EyeOff, ShieldCheck, ArrowLeft, Building2 } from "lucide-react";

export default function UnifiedStaffLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);
  const [redirectingTo, setRedirectingTo] = useState<string | null>(null);

  // Check if staff member already has an active authenticated session
  useEffect(() => {
    let isMounted = true;

    async function checkExistingSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          const res = await fetch("/api/auth/me", {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });

          if (res.ok) {
            const authData = await res.json();
            if (authData.role && isMounted) {
              const roleSlug = getRoleSlug(authData.role);
              const targetPath = roleSlug === "admin" ? "/admin" : `/${roleSlug}`;
              setRedirectingTo(getRoleDisplayName(authData.role));
              if (typeof window !== "undefined") {
                sessionStorage.setItem("revera_admin_session_active", "true");
              }
              router.replace(targetPath);
              return;
            }
          }
        }
      } catch (err) {
        console.error("Session verification error:", err);
      } finally {
        if (isMounted) setCheckingSession(false);
      }
    }

    checkExistingSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError("Please enter your Email / Employee ID and password.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      let emailToSign = identifier.trim();

      // If user typed Employee ID instead of Email (e.g. REV-1001)
      if (!emailToSign.includes("@")) {
        try {
          const res = await fetch(`/api/auth/employee-email?id=${encodeURIComponent(emailToSign)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.email) {
              emailToSign = data.email;
            } else {
              setError("Employee ID not found. Please verify your ID or enter your clinic email.");
              setLoading(false);
              return;
            }
          } else {
            setError("Employee ID not found. Please verify your ID or enter your clinic email.");
            setLoading(false);
            return;
          }
        } catch (err) {
          setError("Failed to look up Employee ID. Please enter your full email address.");
          setLoading(false);
          return;
        }
      }

      // Customer account guard
      try {
        const checkRes = await fetch(`/api/customers?email=${encodeURIComponent(emailToSign)}`);
        if (checkRes.ok) {
          const customer = await checkRes.json();
          if (customer) {
            setError("This email belongs to a patient account and cannot be used for clinic staff access.");
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error("Customer verification check error:", err);
      }

      // Authenticate with Supabase
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: emailToSign,
        password: password,
      });

      if (authError || !data.session) {
        setError(authError?.message || "Invalid credentials. Please verify your email/ID and password.");
        setLoading(false);
        return;
      }

      if (typeof window !== "undefined") {
        sessionStorage.setItem("revera_admin_session_active", "true");
      }

      // Inspect role via /api/auth/me and redirect to corresponding portal
      const meRes = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${data.session.access_token}` },
      });

      if (meRes.ok) {
        const authData = await meRes.json();
        const roleSlug = getRoleSlug(authData.role);
        const targetPath = roleSlug === "admin" ? "/admin" : `/${roleSlug}`;
        setRedirectingTo(getRoleDisplayName(authData.role));
        router.replace(targetPath);
      } else {
        const errData = await meRes.json().catch(() => ({}));
        setError(errData.error || "No active staff role assigned to this account.");
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F1EA] px-4">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-4 border-[#C4AE7C] border-t-transparent animate-spin" />
          <p className="text-sm font-semibold tracking-wider text-[#414E36]">
            {redirectingTo ? `Redirecting to ${redirectingTo} workspace...` : "Verifying staff session..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F4F1EA] text-[#1F251A] px-4 py-8">
      {/* Top Bar */}
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#5A6A51] hover:text-[#1F251A] transition-colors py-2 px-3 rounded-lg hover:bg-white/50"
        >
          <ArrowLeft size={16} />
          <span>Return to Website</span>
        </Link>
        <div className="flex items-center gap-2 text-xs font-semibold text-[#8B9882]">
          <ShieldCheck size={16} className="text-[#C4AE7C]" />
          <span>Secure Staff Portal</span>
        </div>
      </div>

      {/* Main Form Container */}
      <div className="max-w-md w-full mx-auto my-auto py-6">
        <div className="bg-[#FAF9F5] border border-[#E7E2D6] rounded-[28px] p-8 shadow-[0_20px_60px_rgba(31,37,26,0.08)]">
          {/* Logo & Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="h-16 w-16 rounded-2xl bg-[#414E36] p-3 shadow-md flex items-center justify-center mb-4 ring-1 ring-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/main_logo.png"
                alt="Revera Clinic"
                className="w-full h-full object-contain brightness-0 invert"
              />
            </div>
            <span className="text-[11px] uppercase tracking-[0.25em] font-bold text-[#8B9882]">
              Revera Clinics
            </span>
            <h1 className="text-2xl font-serif font-bold text-[#1F251A] mt-1">
              Staff &amp; Doctors Portal
            </h1>
            <p className="text-xs text-[#6B7564] mt-1.5 max-w-xs">
              Unified login for Doctors, Receptionists, HR, and System Administrators.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4" noValidate>
            <div>
              <label className="block text-xs uppercase tracking-wider font-bold text-[#5A6A51] mb-1.5">
                Email Address or Employee ID
              </label>
              <div className="relative flex items-center">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5A6A51]">
                  <Mail size={18} />
                </div>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. dr.name@revera.com or REV-1001"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (error) setError("");
                  }}
                  className="w-full rounded-2xl border border-[#D9D3C7] bg-white pl-11 pr-4 py-3.5 text-sm font-medium text-[#1F251A] placeholder-[#8B9882] shadow-2xs outline-none transition focus:border-[#414E36] focus:ring-2 focus:ring-[#414E36]/15"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs uppercase tracking-wider font-bold text-[#5A6A51]">
                  Password
                </label>
              </div>
              <div className="relative flex items-center">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5A6A51]">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Enter your account password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError("");
                  }}
                  className="w-full rounded-2xl border border-[#D9D3C7] bg-white pl-11 pr-11 py-3.5 text-sm font-medium text-[#1F251A] placeholder-[#8B9882] shadow-2xs outline-none transition focus:border-[#414E36] focus:ring-2 focus:ring-[#414E36]/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#8B9882] hover:text-[#1F251A] cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2 animate-shake">
                <span className="text-sm">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#414E36] py-3.5 text-sm font-bold text-[#FAF9F5] shadow hover:bg-[#343F2C] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Signing in &amp; Routing...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={16} />
                  <span>Sign In to Workspace</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Info */}
          <div className="mt-6 pt-5 border-t border-[#E7E2D6] text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs text-[#7A8871]">
              <Building2 size={14} />
              <span>Auto-routes to /doctor, /reception, /admin, or /superadmin</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-6xl w-full mx-auto text-center text-xs text-[#8B9882] py-2">
        &copy; {new Date().getFullYear()} Revera Clinics. All rights reserved. Confidential staff portal.
      </div>
    </div>
  );
}
