import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { requireAuth, isAuthError, apiError } from '@/lib/utils/api-helpers';

/**
 * POST /api/promos/validate
 * Validate a promo code for a given booking amount
 * Returns discount info if valid
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, ['client']);
    if (isAuthError(authResult)) return authResult;
    const { user } = authResult;

    const body = await request.json();
    const { code, bookingAmount, serviceId } = body as {
      code: string;
      bookingAmount: number;
      serviceId?: string;
    };

    if (!code?.trim()) {
      return apiError('Code promo requis', 400);
    }

    if (typeof bookingAmount !== 'number' || bookingAmount <= 0) {
      return apiError('Montant de réservation invalide', 400);
    }

    const normalizedCode = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

    // Find the promo code
    const snapshot = await adminDb
      .collection(COLLECTIONS.PROMO_CODES)
      .where('code', '==', normalizedCode)
      .where('isActive', '==', true)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return apiError('Code promo invalide ou expiré', 404);
    }

    const promoDoc = snapshot.docs[0];
    const promo = promoDoc.data();

    // Check expiration
    if (promo.expiresAt) {
      const expiresAt = promo.expiresAt.toDate ? promo.expiresAt.toDate() : new Date(promo.expiresAt);
      if (expiresAt < new Date()) {
        return apiError('Ce code promo a expiré', 400);
      }
    }

    // Check start date
    if (promo.startsAt) {
      const startsAt = promo.startsAt.toDate ? promo.startsAt.toDate() : new Date(promo.startsAt);
      if (startsAt > new Date()) {
        return apiError('Ce code promo n\'est pas encore actif', 400);
      }
    }

    // Check max uses
    if (promo.maxUses !== -1 && promo.currentUses >= promo.maxUses) {
      return apiError('Ce code promo a atteint son nombre maximum d\'utilisations', 400);
    }

    // Check if user already used it
    if (promo.usedBy && promo.usedBy.includes(user.uid)) {
      return apiError('Vous avez déjà utilisé ce code promo', 400);
    }

    // Check minimum booking amount
    if (promo.minBookingAmount && bookingAmount < promo.minBookingAmount) {
      return apiError(
        `Le montant minimum de réservation est de ${promo.minBookingAmount}€ pour ce code`,
        400
      );
    }

    // Check applicable services
    if (
      promo.applicableServices &&
      promo.applicableServices.length > 0 &&
      serviceId &&
      !promo.applicableServices.includes(serviceId)
    ) {
      return apiError('Ce code promo ne s\'applique pas à ce service', 400);
    }

    // Calculate discount
    let discountAmount: number;
    if (promo.discountType === 'percentage') {
      discountAmount = Math.round((bookingAmount * promo.discountValue) / 100 * 100) / 100;
    } else {
      discountAmount = Math.min(promo.discountValue, bookingAmount);
    }

    const finalAmount = Math.max(0, Math.round((bookingAmount - discountAmount) * 100) / 100);

    return NextResponse.json({
      valid: true,
      promoId: promoDoc.id,
      code: promo.code,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      discountAmount,
      originalAmount: bookingAmount,
      finalAmount,
    });
  } catch (error: unknown) {
    console.error('[promos/validate POST] Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
