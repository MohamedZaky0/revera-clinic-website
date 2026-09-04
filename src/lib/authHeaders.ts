import { supabase } from "@/lib/supabaseClient";

/**
 * Builds the JSON + bearer-token headers every authenticated `/api/*` call needs.
 *
 * Every admin API route goes through `requireStaffAccess` (or a stricter guard), which reads the
 * Supabase access token off the Authorization header — a fetch without it is rejected with a 401
 * regardless of who is logged in. This has been a recurring source of "the feature silently does
 * nothing" bugs (RISK-021, RISK-076), so prefer this helper over hand-rolling the header.
 */
export const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }
  return headers;
};
