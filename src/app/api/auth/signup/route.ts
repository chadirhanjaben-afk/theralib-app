import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY!;

/**
 * POST /api/auth/signup
 *
 * Server-side registration: creates user via Firebase REST API,
 * sets display name, creates Firestore doc, and returns session cookie.
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password, name, role } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 });
    }

    // 1. Create account via Firebase REST API
    const signUpRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );

    const signUpData = await signUpRes.json();

    if (!signUpRes.ok) {
      const msg = signUpData.error?.message || 'SIGNUP_FAILED';
      const codeMap: Record<string, string> = {
        EMAIL_EXISTS: 'auth/email-already-in-use',
        WEAK_PASSWORD: 'auth/weak-password',
        INVALID_EMAIL: 'auth/invalid-email',
        TOO_MANY_ATTEMPTS_TRY_LATER: 'auth/too-many-requests',
      };
      return NextResponse.json(
        { error: msg, code: codeMap[msg] || 'auth/unknown' },
        { status: 400 }
      );
    }

    const { idToken, localId: uid } = signUpData;

    // 2. Update display name via REST API
    if (name) {
      await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${FIREBASE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken, displayName: name }),
        }
      );
    }

    // 3. Create Firestore user document
    const now = new Date();
    // Security: only allow 'client' or 'professional' roles via signup
    const ALLOWED_ROLES = ['client', 'professional'];
    const userRole = ALLOWED_ROLES.includes(role) ? role : 'client';
    const userData = {
      uid,
      email,
      displayName: name || '',
      photoURL: '',
      role: userRole,
      isActive: true,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    await adminDb.collection('users').doc(uid).set({
      email,
      displayName: name || '',
      photoURL: '',
      role: userRole,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // 4. Create session cookie (14 days)
    const expiresIn = 60 * 60 * 24 * 14 * 1000;
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

    // 5. Return user data + set session cookie + role cookie
    const response = NextResponse.json({ user: userData });
    response.cookies.set('__session', sessionCookie, {
      maxAge: expiresIn / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
    });
    response.cookies.set('__role', userRole, {
      maxAge: expiresIn / 1000,
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
    });

    return response;
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[Signup API] Error:', errorMsg);
    return NextResponse.json(
      { error: 'Erreur serveur', code: 'auth/internal-error' },
      { status: 500 }
    );
  }
}
