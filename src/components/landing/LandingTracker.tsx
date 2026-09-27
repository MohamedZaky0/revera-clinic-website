"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

const ATTRIBUTION_KEYS = ["gclid", "gbraid", "wbraid", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
const DEPTHS = [25, 50, 75, 90];

function push(event: string, params: Record<string, unknown> = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...params });
}

/**
 * Pushes the landing page's conversion events to dataLayer (read by Google Tag Manager when
 * NEXT_PUBLIC_GTM_ID is set; harmless otherwise). Anchors opt in with data-lp-event /
 * data-lp-placement so the server-rendered markup stays free of handlers.
 */
export function LandingTracker({ variant }: { variant: string }) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    try {
      ATTRIBUTION_KEYS.forEach((key) => {
        const value = params.get(key);
        if (value) sessionStorage.setItem(key, value);
      });
    } catch {
      /* storage blocked — attribution is best-effort */
    }

    push("landing_view", { variant });

    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-lp-event]");
      if (!el) return;
      push(el.dataset.lpEvent as string, { placement: el.dataset.lpPlacement, variant });
    };
    document.addEventListener("click", onClick);

    const fired = new Set<number>();
    const onScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      const pct = (window.scrollY / scrollable) * 100;
      DEPTHS.forEach((d) => {
        if (pct >= d && !fired.has(d)) {
          fired.add(d);
          push("scroll_depth", { depth: String(d), variant });
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("scroll", onScroll);
    };
  }, [variant]);

  return null;
}
