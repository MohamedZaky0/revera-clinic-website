"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { cachedFetch, clearFetchCache } from "@/lib/fetchCache";

type AuthHeaders = { "Content-Type": string; Authorization: string };

interface UsePageSettingsParams {
  authenticatedJsonHeaders: AuthHeaders;
}

/**
 * Shared hook for the five settings screens that persist via POST /api/page-settings.
 * Provides one loader and one `savePartial(key, payload)` writer so screens don't
 * duplicate fetch/save boilerplate.
 *
 * Defects preserved verbatim per Brief 26 Part 1:
 * - savePartial returns the Response; callers decide whether to check res.ok.
 *   Booking/Notification/Queue callers do NOT check (fire-and-forget) — preserved.
 * - The loader does NOT hydrate `notifications` or `queue` keys (fetchPageSettings
 *   has no branch for them) — preserved.
 */
export function usePageSettings({ authenticatedJsonHeaders }: UsePageSettingsParams) {
  const [loadingPageSettings, setLoadingPageSettings] = useState(false);
  const [savingPageSettings, setSavingPageSettings] = useState(false);
  const headersRef = useRef(authenticatedJsonHeaders);
  useEffect(() => { headersRef.current = authenticatedJsonHeaders; }, [authenticatedJsonHeaders]);

  /**
   * Fetches the full settings blob from /api/page-settings.
   * Returns the raw data; the caller is responsible for distributing it to
   * individual state setters (many of which belong to other briefs/screens).
   */
  const loadSettings = useCallback(async (): Promise<any | null> => {
    setLoadingPageSettings(true);
    try {
      const data = await cachedFetch("/api/page-settings", 15000, headersRef.current);
      return data ?? null;
    } catch (err) {
      console.error("usePageSettings loadSettings error:", err);
      return null;
    } finally {
      setLoadingPageSettings(false);
    }
  }, []);

  /**
   * POSTs a partial payload keyed on one top-level property.
   * Returns the Response so callers can decide how to handle success/failure.
   *
   * NOTE: The API handler merges shallowly ({ ...existing?.value, ...body }),
   * so a partial write that omits a sibling field inside a key destroys it.
   * This is a known defect — see RISKS.md.
   */
  const savePartial = useCallback(
    async (key: string, payload: Record<string, any>): Promise<Response> => {
      setSavingPageSettings(true);
      try {
        const res = await fetch("/api/page-settings", {
          method: "POST",
          headers: headersRef.current,
          body: JSON.stringify({ [key]: payload }),
        });
        return res;
      } finally {
        setSavingPageSettings(false);
      }
    },
    [],
  );

  /**
   * Convenience wrapper: savePartial + check res.ok + alert + clear cache + refetch.
   * Used by Deposit and Inactivity screens (which already had this behavior).
   * Booking/Notification/Queue intentionally do NOT use this — they are fire-and-forget.
   */
  const savePartialWithFeedback = useCallback(
    async (
      key: string,
      payload: Record<string, any>,
      successMsg: string,
      errorMsg: string,
      onRefetch?: () => void,
    ): Promise<boolean> => {
      try {
        const res = await savePartial(key, payload);
        if (res.ok) {
          alert(successMsg);
          clearFetchCache();
          onRefetch?.();
          return true;
        } else {
          alert(errorMsg);
          return false;
        }
      } catch (err) {
        console.error(`savePartialWithFeedback (${key}) error:`, err);
        alert(`Error saving ${key} settings.`);
        return false;
      }
    },
    [savePartial],
  );

  return {
    loadingPageSettings,
    savingPageSettings,
    loadSettings,
    savePartial,
    savePartialWithFeedback,
    clearFetchCache,
  };
}
