import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * POST /api/bookings/mark-paid
 * Allows a professional to mark an on-site booking as paid.
 * Only the pro who owns the booking can mark it as paid.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify auth
    const sessionCookie = request.cookies.get('__session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const uid = decoded.uid;

    // Parse body
    const { bookingId } = await request.json();
    if (!bookingId || typeof bookingId !== 'string') {
      return NextResponse.json({ error: 'bookingId requis' }, { status: 400 });
    }

    // Get booking
    const bookingRef = adminDb.collection(COLLECTIONS.BOOKINGS).doc(bookingId);
    const bookingSnap = await bookingRef.get();

    if (!bookingSnap.exists) {
      return NextResponse.json({ error: 'Réservation introuvable' }, { status: 404 });
    }

    const booking = bookingSnap.data()!;

    // Verify the user is the professional for this booking
    if (booking.professionalId !== uid) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // Only allow marking as paid for confirmed or completed bookings with on-site payment
    const allowedStatuses = ['pending', 'confirmed', 'completed'];
    if (!allowedStatuses.includes(booking.status)) {
      return NextResponse.json(
        { error: `Impossible de marquer comme payé une réservation avec le statut "${booking.status}"` },
        { status: 400 }
      );
    }

    // Check it's not already marked as paid
    if (booking.paymentStatus === 'paid') {
      return NextResponse.json({ error: 'Cette réservation est déjà marquée comme payée' }, { status: 400 });
    }

    // Update booking
    await bookingRef.update({
      paymentStatus: 'paid',
      paidAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Send notification to client
    if (booking.clientId) {
      // Get pro name for notification
      const proSnap = await adminDb.collection(COLLECTIONS.PROFESSIONALS).doc(uid).get();
      const proName = proSnap.data()?.businessName || 'Votre professionnel';

      await adminDb.collection(COLLECTIONS.NOTIFICATIONS).add({
        userId: booking.clientId,
        title: 'Paiement confirmé',
        body: `${proName} a confirmé la réception de votre paiement sur place.`,
        type: 'booking',
        isRead: false,
        actionUrl: '/dashboard/client/bookings',
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[mark-paid] Error:', errorMsg);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
