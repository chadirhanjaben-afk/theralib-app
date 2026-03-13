import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { FieldValue } from 'firebase-admin/firestore';
import { requireAuth, isAuthError, apiError } from '@/lib/utils/api-helpers';

/**
 * PATCH /api/promos/[promoId]
 * Update a promo code (admin only) — toggle active, edit fields
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ promoId: string }> }
) {
  try {
    const authResult = await requireAuth(request, ['admin']);
    if (isAuthError(authResult)) return authResult;

    const { promoId } = await params;
    const body = await request.json();

    const docRef = adminDb.collection(COLLECTIONS.PROMO_CODES).doc(promoId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return apiError('Code promo introuvable', 404);
    }

    const allowedFields = [
      'description',
      'discountType',
      'discountValue',
      'minBookingAmount',
      'maxUses',
      'isActive',
      'expiresAt',
    ];

    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'expiresAt' && body[field]) {
          updates[field] = new Date(body[field]);
        } else {
          updates[field] = body[field];
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return apiError('Aucun champ à mettre à jour', 400);
    }

    updates.updatedAt = FieldValue.serverTimestamp();
    await docRef.update(updates);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('[promos PATCH] Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * DELETE /api/promos/[promoId]
 * Delete a promo code (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ promoId: string }> }
) {
  try {
    const authResult = await requireAuth(request, ['admin']);
    if (isAuthError(authResult)) return authResult;

    const { promoId } = await params;
    const docRef = adminDb.collection(COLLECTIONS.PROMO_CODES).doc(promoId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return apiError('Code promo introuvable', 404);
    }

    await docRef.delete();
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('[promos DELETE] Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
