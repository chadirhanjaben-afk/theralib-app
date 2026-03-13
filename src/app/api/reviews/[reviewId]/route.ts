import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { FieldValue } from 'firebase-admin/firestore';
import { requireAuth, isAuthError, apiError } from '@/lib/utils/api-helpers';

/**
 * PATCH /api/reviews/[reviewId]
 * Pro can respond to a review, or user can mark as helpful
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  try {
    const { reviewId } = await params;
    const authResult = await requireAuth(request);
    if (isAuthError(authResult)) return authResult;
    const { user } = authResult;

    const body = await request.json();
    const { action } = body as { action: 'respond' | 'helpful' };

    const reviewRef = adminDb.collection(COLLECTIONS.REVIEWS).doc(reviewId);
    const reviewSnap = await reviewRef.get();

    if (!reviewSnap.exists) {
      return apiError('Avis introuvable', 404);
    }

    const review = reviewSnap.data()!;

    if (action === 'respond') {
      // Only the pro can respond
      if (user.role !== 'professional' && user.role !== 'admin') {
        return apiError('Seul le professionnel peut répondre', 403);
      }

      // Check this is the pro's review (by checking the professional profile)
      if (user.role === 'professional') {
        const proSnap = await adminDb
          .collection(COLLECTIONS.PROFESSIONALS)
          .where('userId', '==', user.uid)
          .limit(1)
          .get();

        if (proSnap.empty || proSnap.docs[0].id !== review.professionalId) {
          return apiError('Cet avis ne concerne pas votre profil', 403);
        }
      }

      const { response } = body as { response: string; action: string };

      if (!response?.trim()) {
        return apiError('La réponse ne peut pas être vide', 400);
      }

      if (response.trim().length > 1000) {
        return apiError('La réponse ne doit pas dépasser 1000 caractères', 400);
      }

      await reviewRef.update({
        response: response.trim(),
        respondedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({ success: true });
    }

    if (action === 'helpful') {
      const helpfulBy: string[] = review.helpfulBy || [];

      if (helpfulBy.includes(user.uid)) {
        // Remove helpful
        await reviewRef.update({
          helpfulBy: FieldValue.arrayRemove(user.uid),
          helpfulCount: FieldValue.increment(-1),
        });
      } else {
        // Add helpful
        await reviewRef.update({
          helpfulBy: FieldValue.arrayUnion(user.uid),
          helpfulCount: FieldValue.increment(1),
        });
      }

      return NextResponse.json({ success: true });
    }

    return apiError('Action invalide', 400);
  } catch (error: unknown) {
    console.error('[reviews PATCH] Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
