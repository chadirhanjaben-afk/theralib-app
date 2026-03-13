import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { FieldValue } from 'firebase-admin/firestore';

interface RouteContext {
  params: Promise<{ ticketId: string }>;
}

/**
 * POST /api/support/tickets/[ticketId]/messages
 * Add a reply to a ticket
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { ticketId } = await context.params;
    const sessionCookie = request.cookies.get('__session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const uid = decoded.uid;

    // Get user info
    const userSnap = await adminDb.collection(COLLECTIONS.USERS).doc(uid).get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }
    const user = userSnap.data()!;

    // Get ticket
    const ticketRef = adminDb.collection(COLLECTIONS.SUPPORT_TICKETS).doc(ticketId);
    const ticketSnap = await ticketRef.get();

    if (!ticketSnap.exists) {
      return NextResponse.json({ error: 'Ticket introuvable' }, { status: 404 });
    }

    const ticketData = ticketSnap.data()!;

    // Check access: owner or admin
    if (user.role !== 'admin' && ticketData.userId !== uid) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // Check ticket is not closed
    if (ticketData.status === 'closed') {
      return NextResponse.json(
        { error: 'Ce ticket est fermé, vous ne pouvez plus y répondre' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { content } = body as { content: string };

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Le message ne peut pas être vide' }, { status: 400 });
    }

    const now = FieldValue.serverTimestamp();

    // Add message
    const msgRef = await ticketRef.collection('messages').add({
      ticketId,
      senderId: uid,
      senderName: user.displayName || user.email,
      senderRole: user.role,
      content: content.trim(),
      createdAt: now,
    });

    // Update ticket timestamp and status
    const ticketUpdate: Record<string, unknown> = {
      updatedAt: now,
    };

    // If admin replies to an open ticket, auto-set to in_progress
    if (user.role === 'admin' && ticketData.status === 'open') {
      ticketUpdate.status = 'in_progress';
      if (!ticketData.assignedTo) {
        ticketUpdate.assignedTo = uid;
      }
    }

    await ticketRef.update(ticketUpdate);

    // Notify the other party
    const notifyUserId =
      user.role === 'admin' ? ticketData.userId : null; // notify ticket owner when admin replies

    if (notifyUserId) {
      await adminDb.collection(COLLECTIONS.NOTIFICATIONS).add({
        userId: notifyUserId,
        title: 'Nouvelle réponse à votre ticket',
        body: `L'équipe support a répondu à votre ticket "${ticketData.subject}"`,
        type: 'system',
        isRead: false,
        actionUrl: `/dashboard/${ticketData.userRole}/support/${ticketId}`,
        createdAt: now,
      });
    } else if (user.role !== 'admin') {
      // Notify admins when user replies
      const adminsSnap = await adminDb
        .collection(COLLECTIONS.USERS)
        .where('role', '==', 'admin')
        .get();

      const notifPromises = adminsSnap.docs.map((adminDoc) =>
        adminDb.collection(COLLECTIONS.NOTIFICATIONS).add({
          userId: adminDoc.id,
          title: 'Réponse sur un ticket',
          body: `${user.displayName || user.email} a répondu au ticket "${ticketData.subject}"`,
          type: 'system',
          isRead: false,
          actionUrl: `/dashboard/admin/support/${ticketId}`,
          createdAt: now,
        })
      );
      await Promise.all(notifPromises);
    }

    return NextResponse.json({ messageId: msgRef.id }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[support/tickets/[id]/messages POST] Error:', msg);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
