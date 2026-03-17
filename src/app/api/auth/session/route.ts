import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';

// POST: Create session cookie from ID token
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idToken } = body;

    if (!idToken) {
      return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });
    }

    // Verify the ID token
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    // Create a session cookie (expires in 14 days)
    const expiresIn = 60 * 60 * 24 * 14 * 1000; // 14 days
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

    const response = NextResponse.json({ status: 'success', uid: decodedToken.uid });
    response.cookies.set('__session', sessionCookie, {
      maxAge: expiresIn / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
    });

    return response;
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[Session API] Cookie creation failed:', errorMsg);
    return NextResponse.json(
      { error: errorMsg || 'Session creation failed' },
      { status: 401 }
    );
  }
}

// DELETE: Clear session cookie + role cookie (logout)
export async function DELETE() {
  const response = NextResponse.json({ status: 'success' });
  response.cookies.set('__session', '', {
    maxAge: 0,
    httpOnly: true,
    path: '/',
  });
  response.cookies.set('__role', '', {
    maxAge: 0,
    path: '/',
  });
  return response;
}
