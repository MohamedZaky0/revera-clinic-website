import { NextResponse } from "next/server";
import { requireAdministratorAccess } from "@/lib/access";
import { getSupabaseServer } from "@/lib/supabaseServer";

/**
 * Administrator-gated: this reports which Supabase env vars are wired and under what names, which
 * is infrastructure detail no anonymous caller should be able to fingerprint. Backs TC-001 in the
 * Admin System Test Suite, whose runner already sends the bearer token.
 *
 * Secret-key values are never echoed — only whether the var is present and which name supplied it.
 * (The previous `valuePreview` on `supabaseSecret` returned the first 10 characters of the service
 * role key.)
 */
export async function GET(req: Request) {
  const access = await requireAdministratorAccess(req);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const checks = {
    supabaseUrl: {
      present: !!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL),
      source: process.env.SUPABASE_URL ? "SUPABASE_URL" : process.env.NEXT_PUBLIC_SUPABASE_URL ? "NEXT_PUBLIC_SUPABASE_URL" : null,
      valuePreview: (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").slice(0, 20) + "...",
    },
    supabaseSecret: {
      present: !!(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY),
      source: process.env.SUPABASE_SECRET_KEY ? "SUPABASE_SECRET_KEY" : process.env.SUPABASE_SERVICE_ROLE_KEY ? "SUPABASE_SERVICE_ROLE_KEY" : null,
    },
    supabasePublishable: {
      present: !!(process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      source: process.env.SUPABASE_PUBLISHABLE_KEY ? "SUPABASE_PUBLISHABLE_KEY" : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "NEXT_PUBLIC_SUPABASE_ANON_KEY" : null,
    },
  };

  try {
    const client = getSupabaseServer();
    const { data, error } = await client.from("services").select("id").limit(1);

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          connected: false,
          error: error.message,
          checks,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      connected: true,
      timestamp: new Date().toISOString(),
      checks,
      sample: data,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        connected: false,
        error: err?.message || String(err),
        checks,
      },
      { status: 500 }
    );
  }
}
