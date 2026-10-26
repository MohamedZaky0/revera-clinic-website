import { CLIENT } from "@/config/client";

/**
 * One shared, browser-side read of GET /api/page-settings for the public site (RISK-137 / DEC-131).
 *
 * LanguageProvider, Navbar and BookingModal each fetched this endpoint on their own, and Navbar
 * refetched it on every window focus and visibilitychange. All callers now share:
 *  - one in-flight request (concurrent callers get the same promise), and
 *  - a short in-memory copy, reused for `maxAgeMs` (default 5 minutes).
 *
 * The copy is dropped as soon as the admin panel announces a settings change (same-tab custom
 * event, cross-tab storage event, BroadcastChannel), so a CMS save in this browser shows up at once.
 * Failures are never cached: the caller gets `null` and the next call tries again.
 */

export const PUBLIC_SETTINGS_TTL_MS = 5 * 60 * 1000;

let cached: { data: any; at: number } | null = null;
let inflight: Promise<any | null> | null = null;
let generation = 0;

export function invalidatePublicPageSettings(): void {
  cached = null;
  generation += 1;
}

export type PublicSettingsOptions = {
  /** Skip the copy and the in-flight request, always go to the network. */
  force?: boolean;
  /** Reuse a copy younger than this many ms. Defaults to 5 minutes. */
  maxAgeMs?: number;
};

export async function getPublicPageSettings(opts: PublicSettingsOptions = {}): Promise<any | null> {
  const maxAge = opts.maxAgeMs ?? PUBLIC_SETTINGS_TTL_MS;
  if (!opts.force) {
    if (cached && Date.now() - cached.at < maxAge) return cached.data;
    if (inflight) return inflight;
  }

  const startedIn = generation;
  const request: Promise<any | null> = (async () => {
    try {
      const res = await fetch("/api/page-settings");
      if (!res.ok) return null;
      const data = await res.json();
      // An invalidation that happened while this request was in the air means the body may be
      // older than the change: hand it to the caller, but do not keep it.
      if (data && startedIn === generation) cached = { data, at: Date.now() };
      return data ?? null;
    } catch {
      return null;
    }
  })();

  inflight = request;
  try {
    return await request;
  } finally {
    if (inflight === request) inflight = null;
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("revera-settings-change", invalidatePublicPageSettings);
  window.addEventListener("storage", (e: StorageEvent) => {
    if (e.key === `${CLIENT.storagePrefix}_settings_sync`) invalidatePublicPageSettings();
  });
  if (typeof BroadcastChannel !== "undefined") {
    try {
      const bc = new BroadcastChannel(`${CLIENT.storagePrefix}_channel`);
      bc.addEventListener("message", (ev: MessageEvent) => {
        if (ev.data?.type === "settings_updated") invalidatePublicPageSettings();
      });
    } catch {
      /* BroadcastChannel unavailable: the 5 minute TTL still bounds staleness */
    }
  }
}
