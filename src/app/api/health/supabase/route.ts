import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  const checks = {
    supabaseUrl: {
      present: !!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL),
      source: process.env.SUPABASE_URL ? "SUPABASE_URL" : process.env.NEXT_PUBLIC_SUPABASE_URL ? "NEXT_PUBLIC_SUPABASE_URL" : null,
      valuePreview: (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").slice(0, 20) + "...",
    },
    supabaseSecret: {
      present: !!(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY),
      source: process.env.SUPABASE_SECRET_KEY ? "SUPABASE_SECRET_KEY" : process.env.SUPABASE_SERVICE_ROLE_KEY ? "SUPABASE_SERVICE_ROLE_KEY" : null,
      valuePreview: (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").slice(0, 10) + "...",
    },
    supabasePublishable: {
      present: !!(process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      source: process.env.SUPABASE_PUBLISHABLE_KEY ? "SUPABASE_PUBLISHABLE_KEY" : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "NEXT_PUBLIC_SUPABASE_ANON_KEY" : null,
      valuePreview: (process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").slice(0, 10) + "...",
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
