import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * /auth/callback
 *
 * Supabase redirects here after a user accepts an email invitation
 * or resets their password via an email link.
 *
 * Supabase sends a PKCE `code` in the query string.
 * We exchange it for a session, then redirect to `next` (default: /admin).
 *
 * NOTE: The session is stored in the browser (localStorage) by the
 * client-side supabase instance. This server route just validates the
 * code and passes control back to the client by redirecting with the
 * tokens encoded in the URL hash — which the client picks up via
 * onAuthStateChange.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/admin';

  if (!code) {
    // No code — just go to admin (user will see login if not authenticated)
    return NextResponse.redirect(`${origin}${next}`);
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('[auth/callback] exchangeCodeForSession error:', error.message);
      return NextResponse.redirect(
        `${origin}/admin?auth_error=${encodeURIComponent(error.message)}`
      );
    }

    // Session exchanged — redirect to the intended destination
    return NextResponse.redirect(`${origin}${next}`);
  } catch (err: any) {
    console.error('[auth/callback] unexpected error:', err);
    return NextResponse.redirect(`${origin}/admin`);
  }
}
