import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * POST /api/affiliation/apply-code
 *
 * Called after signup when a user has entered a referral code.
 * Creates an affiliation record linking the referrer to the new user.
 *
 * Body: { code: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify session
    const sessionCookie = request.cookies.get('__session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const referredId = decoded.uid;

    const { code } = await request.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Code de parrainage requis' }, { status: 400 });
    }

    const normalizedCode = code.trim().toUpperCase();

    // Find the referrer by code
    const referrerSnap = await adminDb
      .collection('users')
      .where('referralCode', '==', normalizedCode)
      .limit(1)
      .get();

    if (referrerSnap.empty) {
      return NextResponse.json({ error: 'Code de parrainage invalide' }, { status: 404 });
    }

    const referrerDoc = referrerSnap.docs[0];
    const referrerId = referrerDoc.id;

    // Cannot refer yourself
    if (referrerId === referredId) {
      return NextResponse.json({ error: 'Vous ne pouvez pas utiliser votre propre code' }, { status: 400 });
    }

    // Check if this user was already referred
    const existingAff = await adminDb
      .collection('affiliations')
      .where('referredId', '==', referredId)
      .limit(1)
      .get();

    if (!existingAff.empty) {
      return NextResponse.json({ error: 'Vous avez déjà utilisé un code de parrainage' }, { status: 400 });
    }

    // Create affiliation record
    const affRef = await adminDb.collection('affiliations').add({
      referrerId,
      referredId,
      code: normalizedCode,
      commission: 0,
      status: 'pending', // Will become 'active' after first paid booking
      createdAt: FieldValue.serverTimestamp(),
    });

    // Also store referredBy on the user doc for quick lookup
    await adminDb.collection('users').doc(referredId).update({
      referredBy: referrerId,
      referralCodeUsed: normalizedCode,
      updatedAt: new Date(),
    });

    // Notify the referrer
    await adminDb.collection('notifications').add({
      userId: referrerId,
      title: 'Nouveau filleul !',
      body: 'Quelqu\'un s\'est inscrit avec votre code de parrainage. Vous gagnerez une récompense lors de sa première réservation.',
      type: 'system',
      isRead: false,
      actionUrl: '/dashboard/client/affiliation',
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      affiliationId: affRef.id,
      referrerName: referrerDoc.data().displayName || 'Un utilisateur',
    });
  } catch (error: any) {
    console.error('[apply-code] Error:', error?.message || error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
