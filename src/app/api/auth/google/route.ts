import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

/**
 * POST /api/auth/google
 *
 * Receives an idToken from the client-side Google popup sign-in,
 * creates a session cookie, and ensures a Firestore user doc exists.
 */
export async function POST(request: NextRequest) {
  try {
    const { idToken, role } = await request.json();

    if (!idToken) {
      return NextResponse.json({ error: 'idToken requis' }, { status: 400 });
    }

    // 1. Verify the idToken with Admin SDK
    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    // 2. Create session cookie (14 days)
    const expiresIn = 60 * 60 * 24 * 14 * 1000;
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

    // 3. Fetch or create Firestore user document
    const userDoc = await adminDb.collection('users').doc(uid).get();
    let userData: Record<string, unknown>;

    if (userDoc.exists) {
      const data = userDoc.data()!;
      userData = {
        uid,
        email: data.email || decoded.email || '',
        displayName: data.displayName || decoded.name || '',
        photoURL: data.photoURL || decoded.picture || '',
        role: data.role || 'client',
        phone: data.phone || '',
        isActive: data.isActive ?? true,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      };
    } else {
      const now = new Date();
      const userRole = role || 'client';
      userData = {
        uid,
        email: decoded.email || '',
        displayName: decoded.name || '',
        photoURL: decoded.picture || '',
        role: userRole,
        isActive: true,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      await adminDb.collection('users').doc(uid).set({
        email: decoded.email || '',
        displayName: decoded.name || '',
        photoURL: decoded.picture || '',
        role: userRole,
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
    response.cookies.set('__role', (userData.role as string) || 'client', {
      maxAge: expiresIn / 1000,
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
    });

    return response;
  } catch (error: any) {
    console.error('[Google Auth API] Error:', error?.message || error);
    return NextResponse.json(
      { error: 'Erreur serveur', code: 'auth/internal-error' },
      { status: 500 }
    );
  }
}
