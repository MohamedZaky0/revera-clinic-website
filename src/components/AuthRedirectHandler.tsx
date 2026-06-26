"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function AuthRedirectHandler() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash) {
      const hash = window.location.hash;
      if (
        hash.includes("access_token=") &&
        (hash.includes("type=invite") ||
          hash.includes("type=recovery") ||
          hash.includes("type=signup"))
      ) {
        // Redirect to /auth/callback with the hash so Supabase client can consume it
        router.push(`/auth/callback${hash}`);
      }
    }
  }, [router]);

  return null;
}
