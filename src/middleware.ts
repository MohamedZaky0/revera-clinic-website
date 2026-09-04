import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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

    const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: supabaseAnonKey,
        authorization: `Bearer ${token}`,
      },
    });

    if (!authResponse.ok) {
      return NextResponse.json({ error: 'Unauthorized: Invalid or expired session.' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
