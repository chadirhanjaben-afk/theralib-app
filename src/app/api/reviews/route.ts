import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { FieldValue } from 'firebase-admin/firestore';
import { requireAuth, isAuthError, apiError, isRateLimited, getClientIp } from '@/lib/utils/api-helpers';

/**
 * GET /api/reviews?proId=xxx
 * Get reviews for a professional (public, no auth required)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const proId = searchParams.get('proId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = 10;

    if (!proId) {
      return apiError('proId est requis', 400);
    }

    const snapshot = await adminDb
      .collection(COLLECTIONS.REVIEWS)
      .where('professionalId', '==', proId)
      .orderBy('createdAt', 'desc')
      .limit(limit + 1)
      .offset((page - 1) * limit)
      .get();

    const reviews = snapshot.docs.slice(0, limit).map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        clientName: data.clientName || 'Client',
        rating: data.rating,
        comment: data.comment,
        photos: data.photos || [],
        isVerified: data.isVerified || false,
        response: data.response || null,
        respondedAt: data.respondedAt || null,
        helpfulCount: data.helpfulCount || 0,
        createdAt: data.createdAt,
      };
    });

    const hasMore = snapshot.docs.length > limit;

    return NextResponse.json({ reviews, hasMore, page });
  } catch (error: unknown) {
    console.error('[reviews GET] Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * POST /api/reviews
 * Create a review (client only, must have a completed booking)
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    if (isRateLimited(`review-create:${ip}`, 5, 60_000)) {
      return apiError('Trop de requêtes, réessayez dans une minute', 429);
    }

    const authResult = await requireAuth(request, ['client']);
    if (isAuthError(authResult)) return authResult;
    const { user } = authResult;

    const body = await request.json();
    const { bookingId, rating, comment, photos } = body as {
      bookingId: string;
      rating: number;
      comment: string;
      photos?: string[];
    };

    // Validate
    if (!bookingId || !rating || !comment?.trim()) {
      return apiError('Réservation, note et commentaire sont requis', 400);
    }

    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return apiError('La note doit être entre 1 et 5', 400);
    }

    if (comment.trim().length > 2000) {
      return apiError('Le commentaire ne doit pas dépasser 2000 caractères', 400);
    }

    if (photos && photos.length > 3) {
      return apiError('Maximum 3 photos par avis', 400);
    }

    // Verify booking exists and belongs to user
    const bookingSnap = await adminDb
      .collection(COLLECTIONS.BOOKINGS)
      .doc(bookingId)
      .get();

    if (!bookingSnap.exists) {
      return apiError('Réservation introuvable', 404);
    }

    const booking = bookingSnap.data()!;

    if (booking.clientId !== user.uid) {
      return apiError('Cette réservation ne vous appartient pas', 403);
    }

    // Check booking is completed
    const isVerified = booking.status === 'completed';

    // Check no duplicate review for this booking
    const existingReview = await adminDb
      .collection(COLLECTIONS.REVIEWS)
      .where('bookingId', '==', bookingId)
      .limit(1)
      .get();

    if (!existingReview.empty) {
      return apiError('Vous avez déjà laissé un avis pour cette réservation', 400);
    }

    // Get client name
    const userSnap = await adminDb.collection(COLLECTIONS.USERS).doc(user.uid).get();
    const clientName = userSnap.data()?.displayName || 'Client';

    const now = FieldValue.serverTimestamp();

    // Create review
    const reviewRef = await adminDb.collection(COLLECTIONS.REVIEWS).add({
      bookingId,
      clientId: user.uid,
      clientName,
      professionalId: booking.professionalId,
      rating,
      comment: comment.trim(),
      photos: photos || [],
      isVerified,
      helpfulCount: 0,
      helpfulBy: [],
      createdAt: now,
    });

    // Update professional's rating
    const reviewsSnap = await adminDb
      .collection(COLLECTIONS.REVIEWS)
      .where('professionalId', '==', booking.professionalId)
      .get();

    const allRatings = reviewsSnap.docs.map((d) => d.data().rating);
    allRatings.push(rating); // include the new one
    const avgRating = allRatings.reduce((a, b) => a + b, 0) / allRatings.length;

    await adminDb
      .collection(COLLECTIONS.PROFESSIONALS)
      .doc(booking.professionalId)
      .update({
        rating: Math.round(avgRating * 10) / 10,
        reviewCount: allRatings.length,
      });

    // Notify the pro
    await adminDb.collection(COLLECTIONS.NOTIFICATIONS).add({
      userId: booking.professionalId,
      title: 'Nouvel avis reçu',
      body: `${clientName} vous a laissé un avis ${rating}/5`,
      type: 'review',
      isRead: false,
      actionUrl: '/dashboard/pro/bookings',
      createdAt: now,
    });

    return NextResponse.json({ id: reviewRef.id }, { status: 201 });
  } catch (error: unknown) {
    console.error('[reviews POST] Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
