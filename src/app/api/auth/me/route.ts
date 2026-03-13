import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

/**
 * GET /api/auth/me
 *
 * Verifies the session cookie and returns the current user's data.
 * Used on page load/refresh to restore auth state without depending
 * on the Firebase JS SDK's onAuthStateChanged.
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('__session')?.value;

    if (!sessionCookie) {
      return NextResponse.json({ user: null });
    }

    // Verify the session cookie
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);

    // Fetch user data from Firestore
    const userDoc = await adminDb.collection('users').doc(decoded.uid).get();

    if (!userDoc.exists) {
      return NextResponse.json({ user: null });
    }

    const data = userDoc.data()!;
    const userData = {
      uid: decoded.uid,
      email: data.email || decoded.email || '',
      displayName: data.displayName || '',
      photoURL: data.photoURL || '',
      role: data.role || 'client',
      phone: data.phone || '',
      isActive: data.isActive ?? true,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    };

    return NextResponse.json({ user: userData });
  } catch (error: any) {
    const code = error?.code || error?.errorInfo?.code || '';
    const message = error?.message || '';
    console.error('[Me API] Error:', code, message);

    // Only clear the cookie for actual auth errors (expired/revoked/invalid token)
    // Do NOT clear for transient errors (network, Firestore timeout, etc.)
    const isAuthError =
      code === 'auth/session-cookie-expired' ||
      code === 'auth/session-cookie-revoked' ||
      code === 'auth/argument-error' ||
      code === 'auth/invalid-session-cookie' ||
      message.includes('Decoding Firebase session cookie failed') ||
      message.includes('Firebase session cookie has expired');

    const response = NextResponse.json({ user: null });

    if (isAuthError) {
      console.warn('[Me API] Auth error — clearing session cookie');
      response.cookies.set('__session', '', { maxAge: 0, path: '/' });
      response.cookies.set('__role', '', { maxAge: 0, path: '/' });
    }

    return response;
  }
}
