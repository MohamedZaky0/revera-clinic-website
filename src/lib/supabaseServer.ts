import { createClient } from "@supabase/supabase-js";

let clientInstance: ReturnType<typeof createClient> | null = null;

export function getSupabaseServer(): any {
  if (!clientInstance) {
    const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const serviceRoleKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase environment variables: SUPABASE_SECRET_KEY/SUPABASE_SERVICE_ROLE_KEY.");
    }

    clientInstance = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        flowType: "pkce",
      },
    });
  }
  return clientInstance;
}
