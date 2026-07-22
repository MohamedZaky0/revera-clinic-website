import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Protected administrative API path prefixes that require authentication
const PROTECTED_API_PREFIXES = [
  '/api/employees',
  '/api/hr/',
  '/api/roles',
  '/api/providers/schedule-audit-logs',
];

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
