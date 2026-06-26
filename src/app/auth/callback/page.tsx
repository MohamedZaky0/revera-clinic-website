"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!supabase) {
      router.push("/admin");
      return;
    }

    // 1. Listen for auth state changes. When signed in, redirect to next (or /admin).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: any) => {
      if (session) {
        const next = searchParams.get("next") ?? "/admin";
        router.push(next);
      }
    });

    // 2. Also check if we already have a session.
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      if (session) {
        const next = searchParams.get("next") ?? "/admin";
        router.push(next);
      } else {
        // If there's no code and no session, we can't authenticate, redirect to admin.
        const code = searchParams.get("code");
        if (!code) {
          router.push("/admin");
        }
      }
    });

    // 3. Safety timeout: if auth takes too long, fallback to redirect to admin.
    const timeout = setTimeout(() => {
      router.push("/admin");
    }, 6000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [router, searchParams]);

  return (
    <div className="preloader" style={{ position: "fixed", inset: 0, zIndex: 9999 }}>
      <div className="preloader-inner" style={{ display: "flex", flexDirection: "column", gap: "25px", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "relative", width: "260px", height: "260px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg className="arc arc1" viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="110" cy="110" r="90" strokeWidth="3" strokeDasharray="280 400" transform="rotate(-20 110 110)" />
          </svg>
          <svg className="arc arc2" viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="80" cy="80" r="60" strokeWidth="2" strokeDasharray="160 400" transform="rotate(10 80 80)" />
          </svg>
          <img src="/images/main_logo.png" alt="logo" className="preloader-logo" />
        </div>
        <div style={{ textAlign: "center", color: "#FFFFFF", fontFamily: "var(--font-primary, sans-serif)", zIndex: 10, marginTop: "10px" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 500, color: "#C4AE7C", marginBottom: "0.5rem", letterSpacing: "1px" }}>Authenticating...</h2>
          <p style={{ fontSize: "0.875rem", opacity: 0.8, color: "#E0E0E0" }}>Setting up your secure session.</p>
        </div>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="preloader" style={{ position: "fixed", inset: 0, zIndex: 9999 }}>
        <div className="preloader-inner">
          <img src="/images/main_logo.png" alt="logo" className="preloader-logo" />
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
