import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js Middleware — Route Protection
 *
 * Runs at the Edge for every matched request.
 * 1. Checks if the user has a valid session cookie
 * 2. Redirects unauthenticated users away from /dashboard/*
 * 3. Enforces role-based access (pro, client, admin)
 *
 * Note: This does NOT fully verify the JWT (Edge has no Firebase Admin).
 * Full verification happens server-side in API routes. This is a UX guard.
 */

interface SessionPayload {
  uid?: string;
  sub?: string;
  email?: string;
  role?: string;
  exp?: number;
}

/**
 * Decode a Firebase session cookie (JWT) payload without verification.
 * We only need the role claim for routing decisions.
 */
function decodeSessionPayload(cookie: string): SessionPayload | null {
  try {
    const parts = cookie.split('.');
    if (parts.length !== 3) return null;

    // Base64url decode the payload (2nd part)
    const payload = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    const decoded = atob(padded);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

// Routes that require authentication
const PROTECTED_PREFIX = '/dashboard';

// Role-based route prefixes
const ROLE_ROUTES: Record<string, string[]> = {
  '/dashboard/pro': ['professional', 'admin'],
  '/dashboard/admin': ['admin'],
  '/dashboard/client': ['client', 'admin'],
};

// Where to redirect each role by default
const ROLE_HOME: Record<string, string> = {
  professional: '/dashboard/pro',
  client: '/dashboard/client',
  admin: '/dashboard/admin',
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ─── Skip non-dashboard routes ───
  if (!pathname.startsWith(PROTECTED_PREFIX)) {
    return NextResponse.next();
  }

  // ─── Check session cookie ───
  const sessionCookie = request.cookies.get('__session')?.value;

  if (!sessionCookie) {
    // No session → redirect to login with return URL
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ─── Decode JWT payload for role ───
  const payload = decodeSessionPayload(sessionCookie);

  if (!payload) {
    // Corrupted cookie → clear and redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.set('__session', '', { maxAge: 0, path: '/' });
    return response;
  }

  // Check expiration (basic check — full verification is server-side)
  if (payload.exp && payload.exp * 1000 < Date.now()) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    loginUrl.searchParams.set('expired', 'true');
    const response = NextResponse.redirect(loginUrl);
    response.cookies.set('__session', '', { maxAge: 0, path: '/' });
    return response;
  }

  // ─── Role-based access control ───
  // The role is stored in the Firestore user doc, not in the JWT claims directly.
  // Firebase session cookies contain Firebase Auth claims, not custom Firestore fields.
  // So we need to get the role from a different source.
  //
  // Strategy: We store the role in a lightweight cookie set during login.
  const roleCookie = request.cookies.get('__role')?.value;
  const userRole = roleCookie || 'client'; // default to client if no role cookie

  // Check if the user is accessing a role-restricted section
  for (const [prefix, allowedRoles] of Object.entries(ROLE_ROUTES)) {
    if (pathname.startsWith(prefix)) {
      if (!allowedRoles.includes(userRole)) {
        // Wrong role → redirect to their own dashboard
        const redirectUrl = new URL(ROLE_HOME[userRole] || '/dashboard/client', request.url);
        return NextResponse.redirect(redirectUrl);
      }
      break;
    }
  }

  // ─── Generic /dashboard route → redirect to role-specific home ───
  if (pathname === '/dashboard' || pathname === '/dashboard/') {
    const redirectUrl = new URL(ROLE_HOME[userRole] || '/dashboard/client', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
