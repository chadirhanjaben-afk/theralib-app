import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { FieldValue } from 'firebase-admin/firestore';

// ─── GET /api/forum/threads/[threadId] ───
// Pro + Admin only: get thread detail + replies. threadId can be doc ID or slug.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    // Auth: pro + admin only
    const sessionCookie = request.cookies.get('__session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const userDoc = await adminDb.collection(COLLECTIONS.USERS).doc(decoded.uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }
    const userRole = userDoc.data()!.role;
    if (userRole !== 'professional' && userRole !== 'admin') {
      return NextResponse.json({ error: 'Accès réservé aux professionnels' }, { status: 403 });
    }

    const { threadId } = await params;

    // Try by doc ID first, then by slug
    let threadDoc = await adminDb.collection(COLLECTIONS.FORUM_THREADS).doc(threadId).get();

    if (!threadDoc.exists) {
      const bySlug = await adminDb
        .collection(COLLECTIONS.FORUM_THREADS)
        .where('slug', '==', threadId)
        .limit(1)
        .get();
      if (bySlug.empty) {
        return NextResponse.json({ error: 'Discussion introuvable' }, { status: 404 });
      }
      threadDoc = bySlug.docs[0];
    }

    // Increment view count
    await threadDoc.ref.update({ viewCount: FieldValue.increment(1) });

    const thread = { id: threadDoc.id, ...threadDoc.data() };

    // Fetch replies
    const repliesSnap = await adminDb
      .collection(COLLECTIONS.FORUM_REPLIES)
      .where('threadId', '==', threadDoc.id)
      .orderBy('createdAt', 'asc')
      .get();

    const replies = repliesSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ thread, replies });
  } catch (error) {
    console.error('[Forum thread GET]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// ─── PATCH /api/forum/threads/[threadId] ───
// Admin: pin/unpin, lock/unlock. Author: edit title/content.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const sessionCookie = request.cookies.get('__session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const uid = decoded.uid;

    const userDoc = await adminDb.collection(COLLECTIONS.USERS).doc(uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }
    const user = userDoc.data()!;

    const { threadId } = await params;
    const threadRef = adminDb.collection(COLLECTIONS.FORUM_THREADS).doc(threadId);
    const threadDoc = await threadRef.get();

    if (!threadDoc.exists) {
      return NextResponse.json({ error: 'Discussion introuvable' }, { status: 404 });
    }

    const thread = threadDoc.data()!;
    const body = await request.json();
    const updates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };

    // Admin actions: pin, lock
    if (user.role === 'admin') {
      if (typeof body.isPinned === 'boolean') updates.isPinned = body.isPinned;
      if (typeof body.isLocked === 'boolean') updates.isLocked = body.isLocked;
    }

    // Author can edit title/content
    if (thread.authorId === uid || user.role === 'admin') {
      if (body.title?.trim()) updates.title = body.title.trim();
      if (body.content?.trim()) updates.content = body.content.trim();
    }

    if (Object.keys(updates).length <= 1) {
      return NextResponse.json({ error: 'Aucune modification autorisée' }, { status: 403 });
    }

    await threadRef.update(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Forum thread PATCH]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// ─── DELETE /api/forum/threads/[threadId] ───
// Admin only or author
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const sessionCookie = request.cookies.get('__session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const uid = decoded.uid;

    const userDoc = await adminDb.collection(COLLECTIONS.USERS).doc(uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }
    const user = userDoc.data()!;

    const { threadId } = await params;
    const threadRef = adminDb.collection(COLLECTIONS.FORUM_THREADS).doc(threadId);
    const threadDoc = await threadRef.get();

    if (!threadDoc.exists) {
      return NextResponse.json({ error: 'Discussion introuvable' }, { status: 404 });
    }

    const thread = threadDoc.data()!;
    if (thread.authorId !== uid && user.role !== 'admin') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    // Delete all replies first
    const repliesSnap = await adminDb
      .collection(COLLECTIONS.FORUM_REPLIES)
      .where('threadId', '==', threadId)
      .get();

    const batch = adminDb.batch();
    repliesSnap.docs.forEach((doc) => batch.delete(doc.ref));
    batch.delete(threadRef);
    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Forum thread DELETE]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
