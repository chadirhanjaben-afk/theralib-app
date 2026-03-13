import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { FieldValue } from 'firebase-admin/firestore';
import type { TicketStatus, TicketPriority } from '@/types';

interface RouteContext {
  params: Promise<{ ticketId: string }>;
}

/**
 * GET /api/support/tickets/[ticketId]
 * Get a single ticket with its messages
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { ticketId } = await context.params;
    const sessionCookie = request.cookies.get('__session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const uid = decoded.uid;

    // Get user role
    const userSnap = await adminDb.collection(COLLECTIONS.USERS).doc(uid).get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }
    const userRole = userSnap.data()!.role;

    // Get ticket
    const ticketSnap = await adminDb
      .collection(COLLECTIONS.SUPPORT_TICKETS)
      .doc(ticketId)
      .get();

    if (!ticketSnap.exists) {
      return NextResponse.json({ error: 'Ticket introuvable' }, { status: 404 });
    }

    const ticket = { id: ticketSnap.id, ...ticketSnap.data() };

    // Check access: owner or admin
    if (userRole !== 'admin' && ticketSnap.data()!.userId !== uid) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // Get messages
    const messagesSnap = await adminDb
      .collection(COLLECTIONS.SUPPORT_TICKETS)
      .doc(ticketId)
      .collection('messages')
      .orderBy('createdAt', 'asc')
      .get();

    const messages = messagesSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ ticket, messages });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[support/tickets/[id] GET] Error:', msg);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * PATCH /api/support/tickets/[ticketId]
 * Update ticket status/priority/assignee (admin only, or owner can close)
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { ticketId } = await context.params;
    const sessionCookie = request.cookies.get('__session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const uid = decoded.uid;

    // Get user role
    const userSnap = await adminDb.collection(COLLECTIONS.USERS).doc(uid).get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }
    const userRole = userSnap.data()!.role;

    // Get ticket
    const ticketRef = adminDb.collection(COLLECTIONS.SUPPORT_TICKETS).doc(ticketId);
    const ticketSnap = await ticketRef.get();

    if (!ticketSnap.exists) {
      return NextResponse.json({ error: 'Ticket introuvable' }, { status: 404 });
    }

    const ticketData = ticketSnap.data()!;
    const body = await request.json();
    const { status, priority, assignedTo } = body as {
      status?: TicketStatus;
      priority?: TicketPriority;
      assignedTo?: string;
    };

    // Build update object
    const update: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Non-admin can only close their own ticket
    if (userRole !== 'admin') {
      if (ticketData.userId !== uid) {
        return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
      }
      if (status && status !== 'closed') {
        return NextResponse.json(
          { error: 'Vous ne pouvez que fermer votre ticket' },
          { status: 403 }
        );
      }
      if (status === 'closed') {
        update.status = 'closed';
        update.closedAt = FieldValue.serverTimestamp();
      }
    } else {
      // Admin can update everything
      if (status) {
        const validStatuses: TicketStatus[] = ['open', 'in_progress', 'resolved', 'closed'];
        if (!validStatuses.includes(status)) {
          return NextResponse.json({ error: 'Statut invalide' }, { status: 400 });
        }
        update.status = status;
        if (status === 'closed' || status === 'resolved') {
          update.closedAt = FieldValue.serverTimestamp();
        }
      }
      if (priority) {
        const validPriorities: TicketPriority[] = ['low', 'medium', 'high'];
        if (!validPriorities.includes(priority)) {
          return NextResponse.json({ error: 'Priorité invalide' }, { status: 400 });
        }
        update.priority = priority;
      }
      if (assignedTo !== undefined) {
        update.assignedTo = assignedTo;
      }
    }

    await ticketRef.update(update);

    // Notify ticket owner about status change (if admin changed it)
    if (userRole === 'admin' && status && ticketData.userId !== uid) {
      const statusLabels: Record<string, string> = {
        open: 'Ouvert',
        in_progress: 'En cours',
        resolved: 'Résolu',
        closed: 'Fermé',
      };
      await adminDb.collection(COLLECTIONS.NOTIFICATIONS).add({
        userId: ticketData.userId,
        title: 'Mise à jour de votre ticket',
        body: `Votre ticket "${ticketData.subject}" est passé en statut : ${statusLabels[status] || status}`,
        type: 'system',
        isRead: false,
        actionUrl: `/dashboard/${ticketData.userRole}/support/${ticketId}`,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[support/tickets/[id] PATCH] Error:', msg);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
