import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionTokenEdge } from './lib/sessionVerifyEdge';

export const SESSION_COOKIE_NAME = 'lrsys_session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow public static assets and system files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/avatars') ||
    pathname === '/favicon.ico' ||
    pathname === '/favicon.png' ||
    pathname === '/icon.png' ||
    pathname === '/apple-icon.png' ||
    pathname === '/logo.png'
  ) {
    return NextResponse.next();
  }

  // 2. Allow public auth endpoints
  if (pathname === '/api/auth/login' || pathname === '/api/auth/session') {
    return NextResponse.next();
  }

  // Read session cookie
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = sessionCookie ? await verifySessionTokenEdge(sessionCookie) : null;

  // 3. If accessing /login
  if (pathname === '/login') {
    if (session) {
      // Already authenticated, redirect to main cockpit
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // 4. Protect all other pages & API routes
  if (!session) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized. Valid Customs credentials required.' },
        { status: 401 }
      );
    }
    // Redirect unauthenticated web page visits to /login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Forward request with role header
  const response = NextResponse.next();
  response.headers.set('x-user-id', session.id);
  response.headers.set('x-user-role', session.role);
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     */
    '/((?!_next/static|_next/image).*)',
  ],
};

