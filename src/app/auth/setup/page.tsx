"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function SetupContent() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [employeeName, setEmployeeName] = useState("");

  useEffect(() => {
    if (!supabase) return;

    // Supabase puts the access_token in the URL hash after the invite link is clicked.
    // The client SDK automatically picks it up and fires onAuthStateChange.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: any) => {
        if (session) {
          // Try to get the name from user metadata
          const name = session.user?.user_metadata?.full_name || session.user?.email || "";
          setEmployeeName(name);
          setSessionReady(true);
          setChecking(false);
        } else {
          setChecking(false);
        }
      }
    );

    // Also try immediately
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      if (session) {
        const name = session.user?.user_metadata?.full_name || session.user?.email || "";
        setEmployeeName(name);
        setSessionReady(true);
      }
      setChecking(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || !confirmPassword) {
      setError("Please fill in both fields.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { error: updateError } = await supabase!.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      setSuccess("Password set! Taking you to the dashboard…");
      setTimeout(() => router.push("/admin"), 2000);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
      setLoading(false);
    }
  }

  // Checking session...
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F1EC]">
        <div className="text-center space-y-3">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#414E36] border-t-transparent" />
          <p className="text-sm text-[#5A6A51] font-medium">Verifying your invitation…</p>
        </div>
      </div>
    );
  }

  // Session not found (link expired or invalid)
  if (!sessionReady && !checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F1EC] p-4">
        <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl p-10 text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[#1F251A]">Invitation Link Expired</h2>
          <p className="text-sm text-[#5A6A51]">
            This invitation link has expired or is no longer valid. Please ask your admin to resend the invitation.
          </p>
          <button
            onClick={() => router.push("/")}
            className="inline-block mt-2 text-sm font-semibold text-[#414E36] underline"
          >
            Return to Homepage
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F1EC] p-4">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#1F251A] to-[#414E36] px-8 py-10 text-center">
          <img src="/images/main_logo.png" alt="Revera Clinics" className="mx-auto mb-5 h-14 w-14 object-contain" />
          <p className="text-xs uppercase tracking-[0.25em] text-[#C4AE7C] font-semibold mb-1">Revera Clinics</p>
          <h1 className="text-2xl font-bold text-white mb-2">Complete Your Setup</h1>
          {employeeName && (
            <p className="text-sm text-[#C4AE7C]/80">
              Welcome, <strong className="text-[#C4AE7C]">{employeeName}</strong>! Set a password to access the dashboard.
            </p>
          )}
        </div>

        {/* Form */}
        <div className="px-8 py-8">
          {success ? (
            <div className="text-center space-y-4 py-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#16a34a" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="font-semibold text-green-700">{success}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#5A6A51] mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full rounded-xl border border-[#414E36]/15 bg-[#F9F9F7] px-4 py-3 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C] focus:ring-2 focus:ring-[#C4AE7C]/20"
                  disabled={loading}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#5A6A51] mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className="w-full rounded-xl border border-[#414E36]/15 bg-[#F9F9F7] px-4 py-3 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C] focus:ring-2 focus:ring-[#C4AE7C]/20"
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-medium">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#414E36] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#2e3a26] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Setting password…
                  </span>
                ) : "Confirm & Access Dashboard"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SetupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#F4F1EC]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#414E36] border-t-transparent" />
      </div>
    }>
      <SetupContent />
    </Suspense>
  );
}
