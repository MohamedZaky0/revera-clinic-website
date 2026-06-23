import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
}

export const supabaseServer = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    flowType: "pkce",
  },
});

export function getSupabaseServer() {
  return supabaseServer;
}
