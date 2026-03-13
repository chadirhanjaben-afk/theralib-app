import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { requireAuth, isAuthError, apiError } from '@/lib/utils/api-helpers';

const TRIAL_DAYS = 14;

/**
 * POST /api/stripe/trial
 * Activate a 14-day free trial of the Professional plan
 * No Stripe payment required — just sets the tier and trialEndsAt
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, ['professional']);
    if (isAuthError(authResult)) return authResult;
    const { user } = authResult;

    // Get professional profile
    const proSnap = await adminDb
      .collection(COLLECTIONS.PROFESSIONALS)
      .where('userId', '==', user.uid)
      .limit(1)
      .get();

    if (proSnap.empty) {
      return apiError('Profil professionnel introuvable', 404);
    }

    const proDoc = proSnap.docs[0];
    const proData = proDoc.data();

    // Check if already on a paid plan
    if (proData.subscriptionTier !== 'starter') {
      return apiError('Vous avez déjà un abonnement actif', 400);
    }

    // Check if trial was already used
    if (proData.trialEndsAt) {
      return apiError('Vous avez déjà utilisé votre période d\'essai gratuite', 400);
    }

    // Check if user ever had a subscription (prevent re-trial after cancel)
    if (proData.subscriptionStatus && proData.subscriptionStatus !== 'incomplete') {
      return apiError('L\'essai gratuit est réservé aux nouveaux utilisateurs', 400);
    }

    // Calculate trial end date
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);

    // Activate trial
    await proDoc.ref.update({
      subscriptionTier: 'professional',
      subscriptionStatus: 'trialing',
      trialEndsAt: Timestamp.fromDate(trialEnd),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Send notification
    await adminDb.collection(COLLECTIONS.NOTIFICATIONS).add({
      userId: proData.userId || user.uid,
      title: 'Essai gratuit activé !',
      body: `Votre essai gratuit de 14 jours du plan Professionnel est actif. Il expire le ${trialEnd.toLocaleDateString('fr-FR')}.`,
      type: 'system',
      isRead: false,
      actionUrl: '/dashboard/pro/subscription',
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      tier: 'professional',
      trialEndsAt: trialEnd.toISOString(),
      trialDays: TRIAL_DAYS,
    });
  } catch (error: unknown) {
    console.error('[STRIPE TRIAL] Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
