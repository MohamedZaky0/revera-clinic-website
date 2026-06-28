"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function AuthRedirectHandler() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    // Catch any Supabase auth token in the URL hash and route to the setup page
    if (hash.includes("access_token=")) {
      router.replace(`/auth/setup${hash}`);
    }
  }, [router]);

  return null;
}
