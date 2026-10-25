import { createClient } from "@supabase/supabase-js";
import { createStallGuardFetch } from "@/lib/stallGuardFetch";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!supabaseUrl || !serviceRoleKey) {
  console.warn("WARNING: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
}

export const supabaseServer = (supabaseUrl && serviceRoleKey)
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        flowType: "pkce",
      },
      // RISK-131: a read to Supabase that stalls is cut after a few seconds and asked again.
      global: {
        fetch: createStallGuardFetch({
          onRetry: ({ url, attempt, stalled }) =>
            console.warn(`[supabase-stall] ${stalled ? 'no answer' : 'connection dropped'} from ${url}, attempt ${attempt} cut, asking again`),
        }),
      },
    })
  : null as any;

export function getSupabaseServer() {
  return supabaseServer;
}
