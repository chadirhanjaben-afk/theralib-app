import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY!;

/**
 * POST /api/auth/login
 *
 * Server-side login: authenticates via Firebase REST API,
 * creates a session cookie, and returns user data.
 *
 * This bypasses the Firebase JS SDK entirely (which hangs due to
 * reCAPTCHA Enterprise on the project) and handles everything server-side
 * using the Admin SDK.
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 });
    }

    // 1. Authenticate via Firebase REST API
    const authRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );

    const authData = await authRes.json();

    if (!authRes.ok) {
      const msg = authData.error?.message || 'UNKNOWN_ERROR';
      const statusMap: Record<string, number> = {
        EMAIL_NOT_FOUND: 401,
        INVALID_PASSWORD: 401,
        INVALID_LOGIN_CREDENTIALS: 401,
        USER_DISABLED: 403,
        TOO_MANY_ATTEMPTS_TRY_LATER: 429,
      };
      const codeMap: Record<string, string> = {
        EMAIL_NOT_FOUND: 'auth/user-not-found',
        INVALID_PASSWORD: 'auth/wrong-password',
        INVALID_LOGIN_CREDENTIALS: 'auth/invalid-credential',
        USER_DISABLED: 'auth/user-disabled',
        TOO_MANY_ATTEMPTS_TRY_LATER: 'auth/too-many-requests',
        INVALID_EMAIL: 'auth/invalid-email',
      };
      return NextResponse.json(
        { error: msg, code: codeMap[msg] || 'auth/unknown' },
        { status: statusMap[msg] || 401 }
      );
    }

    const { idToken, localId: uid } = authData;

    // 2. Create session cookie (14 days)
    const expiresIn = 60 * 60 * 24 * 14 * 1000;
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

    // 3. Fetch user data from Firestore (via Admin SDK — bypasses security rules)
    const userDoc = await adminDb.collection('users').doc(uid).get();
    let userData: Record<string, unknown>;

    if (userDoc.exists) {
      const data = userDoc.data()!;
      userData = {
        uid,
        email: data.email || email,
        displayName: data.displayName || '',
        photoURL: data.photoURL || '',
        role: data.role || 'client',
        phone: data.phone || '',
        isActive: data.isActive ?? true,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      };
    } else {
      // New user — create document
      const now = new Date();
      userData = {
        uid,
        email,
        displayName: authData.displayName || '',
        photoURL: '',
        role: 'client',
        isActive: true,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      await adminDb.collection('users').doc(uid).set({
        email,
        displayName: authData.displayName || '',
        photoURL: '',
        role: 'client',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    // 4. Return user data + set session cookie + role cookie
    const response = NextResponse.json({ user: userData });
    response.cookies.set('__session', sessionCookie, {
      maxAge: expiresIn / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
    });
    // Lightweight role cookie for middleware route protection (not httpOnly so Edge can read it)
    response.cookies.set('__role', (userData.role as string) || 'client', {
      maxAge: expiresIn / 1000,
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
    });

    return response;
  } catch (error: any) {
    console.error('[Login API] Error:', error?.message || error);
    return NextResponse.json(
      { error: 'Erreur serveur', code: 'auth/internal-error' },
      { status: 500 }
    );
  }
}
