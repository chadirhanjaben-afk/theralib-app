import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { FieldValue } from 'firebase-admin/firestore';
import type { TicketCategory, TicketPriority } from '@/types';
import { requireAuth, isAuthError, apiError, isRateLimited, getClientIp } from '@/lib/utils/api-helpers';

/**
 * GET /api/support/tickets
 * List tickets for the authenticated user (or all for admin)
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (isAuthError(authResult)) return authResult;
    const { user } = authResult;

    let query: FirebaseFirestore.Query = adminDb.collection(COLLECTIONS.SUPPORT_TICKETS);

    if (user.role === 'admin') {
      // Admin sees all tickets, sorted by most recent
      query = query.orderBy('updatedAt', 'desc');
    } else {
      // Client/Pro only see their own tickets
      query = query.where('userId', '==', user.uid).orderBy('updatedAt', 'desc');
    }

    const snap = await query.get();
    const tickets = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ tickets });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[support/tickets GET] Error:', message);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * POST /api/support/tickets
 * Create a new support ticket
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limit: 3 tickets per minute per IP
    const ip = getClientIp(request);
    if (isRateLimited(`ticket-create:${ip}`, 3, 60_000)) {
      return apiError('Trop de requêtes, réessayez dans une minute', 429);
    }

    const authResult = await requireAuth(request);
    if (isAuthError(authResult)) return authResult;
    const authUser = authResult.user;

    // Get full user info from Firestore
    const userSnap = await adminDb.collection(COLLECTIONS.USERS).doc(authUser.uid).get();
    if (!userSnap.exists) {
      return apiError('Utilisateur introuvable', 404);
    }
    const user = userSnap.data()!;

    const body = await request.json();
    const { subject, category, message, bookingId } = body as {
      subject: string;
      category: TicketCategory;
      message: string;
      bookingId?: string;
    };

    // Validation
    if (!subject?.trim() || !category || !message?.trim()) {
      return apiError('Sujet, catégorie et message sont requis', 400);
    }

    if (subject.trim().length > 200) {
      return apiError('Le sujet ne doit pas dépasser 200 caractères', 400);
    }

    if (message.trim().length > 5000) {
      return apiError('Le message ne doit pas dépasser 5000 caractères', 400);
    }

    const validCategories: TicketCategory[] = ['booking', 'payment', 'account', 'technical', 'other'];
    if (!validCategories.includes(category)) {
      return apiError('Catégorie invalide', 400);
    }

    // Auto-assign priority based on category
    let priority: TicketPriority = 'medium';
    if (category === 'payment') priority = 'high';
    if (category === 'other') priority = 'low';

    const now = FieldValue.serverTimestamp();

    // Create ticket
    const ticketRef = await adminDb.collection(COLLECTIONS.SUPPORT_TICKETS).add({
      userId: authUser.uid,
      userName: user.displayName || user.email,
      userEmail: user.email,
      userRole: user.role,
      subject: subject.trim(),
      category,
      priority,
      status: 'open',
      bookingId: bookingId || null,
      createdAt: now,
      updatedAt: now,
    });

    // Add initial message
    await adminDb
      .collection(COLLECTIONS.SUPPORT_TICKETS)
      .doc(ticketRef.id)
      .collection('messages')
      .add({
        ticketId: ticketRef.id,
        senderId: authUser.uid,
        senderName: user.displayName || user.email,
        senderRole: user.role,
        content: message.trim(),
        createdAt: now,
      });

    // Notify admins
    const adminsSnap = await adminDb
      .collection(COLLECTIONS.USERS)
      .where('role', '==', 'admin')
      .get();

    const notifPromises = adminsSnap.docs.map((adminDoc) =>
      adminDb.collection(COLLECTIONS.NOTIFICATIONS).add({
        userId: adminDoc.id,
        title: 'Nouveau ticket de support',
        body: `${user.displayName || user.email} a ouvert un ticket : "${subject.trim()}"`,
        type: 'system',
        isRead: false,
        actionUrl: '/dashboard/admin/support',
        createdAt: now,
      })
    );
    await Promise.all(notifPromises);

    return NextResponse.json({ ticketId: ticketRef.id }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[support/tickets POST] Error:', message);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
