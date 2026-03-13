import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { FieldValue } from 'firebase-admin/firestore';
import { requireAuth, isAuthError, apiError } from '@/lib/utils/api-helpers';

/**
 * GET /api/promos
 * List promo codes (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, ['admin']);
    if (isAuthError(authResult)) return authResult;

    const snapshot = await adminDb
      .collection(COLLECTIONS.PROMO_CODES)
      .orderBy('createdAt', 'desc')
      .get();

    const promos = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ promos });
  } catch (error: unknown) {
    console.error('[promos GET] Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * POST /api/promos
 * Create a new promo code (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, ['admin']);
    if (isAuthError(authResult)) return authResult;
    const { user } = authResult;

    const body = await request.json();
    const {
      code,
      description,
      discountType,
      discountValue,
      minBookingAmount,
      maxUses,
      expiresAt,
    } = body;

    // Validate
    if (!code?.trim() || !description?.trim()) {
      return apiError('Code et description sont requis', 400);
    }

    const normalizedCode = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (normalizedCode.length < 3 || normalizedCode.length > 20) {
      return apiError('Le code doit contenir entre 3 et 20 caractères alphanumériques', 400);
    }

    if (!discountType || !['percentage', 'fixed'].includes(discountType)) {
      return apiError('Type de réduction invalide', 400);
    }

    if (typeof discountValue !== 'number' || discountValue <= 0) {
      return apiError('La valeur de réduction doit être positive', 400);
    }

    if (discountType === 'percentage' && discountValue > 100) {
      return apiError('Le pourcentage ne peut pas dépasser 100%', 400);
    }

    // Check uniqueness
    const existing = await adminDb
      .collection(COLLECTIONS.PROMO_CODES)
      .where('code', '==', normalizedCode)
      .limit(1)
      .get();

    if (!existing.empty) {
      return apiError('Ce code promo existe déjà', 400);
    }

    const now = FieldValue.serverTimestamp();

    const docRef = await adminDb.collection(COLLECTIONS.PROMO_CODES).add({
      code: normalizedCode,
      description: description.trim(),
      discountType,
      discountValue,
      minBookingAmount: minBookingAmount || 0,
      maxUses: maxUses || -1,
      currentUses: 0,
      usedBy: [],
      isActive: true,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdBy: user.uid,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({ id: docRef.id, code: normalizedCode }, { status: 201 });
  } catch (error: unknown) {
    console.error('[promos POST] Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
