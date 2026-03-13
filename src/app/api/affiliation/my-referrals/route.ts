import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

/**
 * GET /api/affiliation/my-referrals
 *
 * Returns the authenticated user's referral code, referral stats,
 * and list of people they referred.
 */
export async function GET(request: NextRequest) {
  try {
    // Verify session
    const sessionCookie = request.cookies.get('__session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const uid = decoded.uid;

    // Get user's referral code
    const userDoc = await adminDb.collection('users').doc(uid).get();
    const userData = userDoc.data();
    const referralCode = userData?.referralCode || null;

    // Get all affiliations where this user is the referrer
    const affiliationsSnap = await adminDb
      .collection('affiliations')
      .where('referrerId', '==', uid)
      .get();

    const referrals: {
      id: string;
      referredName: string;
      referredEmail: string;
      status: string;
      commission: number;
      createdAt: string;
    }[] = [];

    let totalCommission = 0;
    let pendingCount = 0;
    let activeCount = 0;
    let paidCount = 0;

    for (const affDoc of affiliationsSnap.docs) {
      const data = affDoc.data();

      // Get referred user info
      let referredName = 'Utilisateur';
      let referredEmail = '';
      try {
        const referredDoc = await adminDb.collection('users').doc(data.referredId).get();
        if (referredDoc.exists) {
          const rd = referredDoc.data()!;
          referredName = rd.displayName || 'Utilisateur';
          referredEmail = rd.email || '';
        }
      } catch {
        // Skip if user not found
      }

      referrals.push({
        id: affDoc.id,
        referredName,
        referredEmail,
        status: data.status,
        commission: data.commission || 0,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      });

      totalCommission += data.commission || 0;
      if (data.status === 'pending') pendingCount++;
      if (data.status === 'active') activeCount++;
      if (data.status === 'paid') paidCount++;
    }

    // Sort by date descending
    referrals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Also check if this user was referred by someone
    let referredBy = null;
    if (userData?.referredBy) {
      try {
        const referrerDoc = await adminDb.collection('users').doc(userData.referredBy).get();
        if (referrerDoc.exists) {
          referredBy = {
            name: referrerDoc.data()!.displayName || 'Un utilisateur',
            code: userData.referralCodeUsed || '',
          };
        }
      } catch {
        // Skip
      }
    }

    return NextResponse.json({
      referralCode,
      referredBy,
      stats: {
        totalReferrals: referrals.length,
        pendingCount,
        activeCount,
        paidCount,
        totalCommission,
      },
      referrals,
    });
  } catch (error: any) {
    console.error('[my-referrals] Error:', error?.message || error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
