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

// RISK-134: no network call here any more. The middleware only rejects what is plainly unusable (no token,
// not a 3-part JWT, past its exp); the route handler of every protected prefix verifies the token properly
// (src/lib/verifyToken.ts) and then checks the employee row, so a second verification here only doubled the
// Auth-server load. jose is not imported: it is not a direct dependency.
function decodeExp(token: string): number | null | 'malformed' {
  const parts = token.split('.');
  if (parts.length !== 3 || parts.some((p) => !/^[A-Za-z0-9_-]+$/.test(p))) return 'malformed';
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)), (c) => c.charCodeAt(0))));
    return typeof payload?.exp === 'number' ? payload.exp : null;
  } catch {
    return 'malformed';
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtectedApi = PROTECTED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (isProtectedApi) {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required for administrative endpoint.' },
        { status: 401 }
      );
    }

    const exp = decodeExp(token);
    if (exp === 'malformed' || exp === null || exp * 1000 <= Date.now()) {
      return NextResponse.json({ error: 'Unauthorized: Invalid or expired session.' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
