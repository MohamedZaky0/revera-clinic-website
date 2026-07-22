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

    // Allow requests with an Authorization header token or Supabase session cookie
    const hasToken = !!token || request.cookies.has('sb-access-token') || request.headers.has('x-supabase-auth');

    if (!hasToken) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required for administrative endpoint.' },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
