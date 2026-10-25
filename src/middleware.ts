import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createStallGuardFetch } from '@/lib/stallGuardFetch';

// Protected administrative API path prefixes that require authentication
const PROTECTED_API_PREFIXES = [
  '/api/employees',
  '/api/hr/',
  '/api/roles',
  '/api/providers/schedule-audit-logs',
];

// Deliberately NOT added to the prefix list above: the admin panel's GET call for POS sales
// history (fetchProductSalesHistory, admin/page.tsx:3539) sends no Authorization header
// today, so a blanket prefix match on '/api/inventory/products/sales' would 401 that read
// and break the sales history display. The POST (creating a sale) is instead protected at
// the handler level in that route file. See RISK-018 / FINANCE_TRACKER 0.10.

// RISK-131: this check calls Supabase for every protected request; a stalled call used to hold the
// request until the platform killed it after 25 s. A read that has not answered is cut and repeated.
const stallGuardedFetch = createStallGuardFetch({
  onRetry: ({ url, attempt, stalled }) =>
    console.warn(`[supabase-stall] middleware: ${stalled ? 'no answer' : 'connection dropped'} from ${url}, attempt ${attempt} cut, asking again`),
});

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtectedApi = PROTECTED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (isProtectedApi) {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required for administrative endpoint.' },
        { status: 401 }
      );
    }
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Authentication service is not configured.' }, { status: 500 });
    }

    let authResponse: Response;
    try {
      authResponse = await stallGuardedFetch(`${supabaseUrl}/auth/v1/user`, {
        headers: {
          apikey: supabaseAnonKey,
          authorization: `Bearer ${token}`,
        },
      });
    } catch {
      // Supabase unreachable: the session was not judged invalid, so this is not a 401.
      return NextResponse.json({ error: 'Could not verify the session right now. Please try again.' }, { status: 503 });
    }

    // Only an answer that says the token is bad is a 401. A rate limit or an upstream failure says
    // nothing about the login, and a 401 here reads to the client as "your session is over".
    if (authResponse.status === 429 || authResponse.status >= 500) {
      return NextResponse.json({ error: 'Could not verify the session right now. Please try again.' }, { status: 503 });
    }
    if (!authResponse.ok) {
      return NextResponse.json({ error: 'Unauthorized: Invalid or expired session.' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
