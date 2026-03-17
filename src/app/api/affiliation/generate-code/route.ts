import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

/**
 * POST /api/affiliation/generate-code
 *
 * Generates a unique referral code for the authenticated user.
 * If the user already has one, returns the existing code.
 * Code format: THERA-XXXX (where XXXX is alphanumeric)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify session
    const sessionCookie = request.cookies.get('__session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const uid = decoded.uid;

    // Check if user already has a referral code
    const userDoc = await adminDb.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    const userData = userDoc.data()!;

    if (userData.referralCode) {
      return NextResponse.json({ code: userData.referralCode });
    }

    // Generate a unique code
    let code = '';
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I/O/0/1 to avoid confusion
      let suffix = '';
      for (let i = 0; i < 5; i++) {
        suffix += chars[Math.floor(Math.random() * chars.length)];
      }
      code = `THERA-${suffix}`;

      // Check uniqueness
      const existing = await adminDb
        .collection('users')
        .where('referralCode', '==', code)
        .limit(1)
        .get();

      if (existing.empty) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      return NextResponse.json({ error: 'Impossible de générer un code unique' }, { status: 500 });
    }

    // Save to user document
    await adminDb.collection('users').doc(uid).update({
      referralCode: code,
      updatedAt: new Date(),
    });

    return NextResponse.json({ code });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[generate-code] Error:', errorMsg);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
