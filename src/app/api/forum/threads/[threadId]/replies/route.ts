import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { FieldValue } from 'firebase-admin/firestore';

// ─── POST /api/forum/threads/[threadId]/replies ───
// Pro + Admin only: add reply to thread
export async function POST(
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

    if (user.role !== 'professional' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Accès réservé aux professionnels' }, { status: 403 });
    }

    const { threadId } = await params;

    // Verify thread exists and is not locked
    const threadRef = adminDb.collection(COLLECTIONS.FORUM_THREADS).doc(threadId);
    const threadDoc = await threadRef.get();

    if (!threadDoc.exists) {
      return NextResponse.json({ error: 'Discussion introuvable' }, { status: 404 });
    }

    const thread = threadDoc.data()!;
    if (thread.isLocked && user.role !== 'admin') {
      return NextResponse.json({ error: 'Cette discussion est verrouillée' }, { status: 403 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Le contenu est requis' }, { status: 400 });
    }

    if (content.trim().length > 5000) {
      return NextResponse.json({ error: 'Le contenu ne doit pas dépasser 5000 caractères' }, { status: 400 });
    }

    const now = FieldValue.serverTimestamp();
    const authorName = user.displayName || 'Anonyme';

    // Create reply
    const replyRef = adminDb.collection(COLLECTIONS.FORUM_REPLIES).doc();
    await replyRef.set({
      threadId,
      content: content.trim(),
      authorId: uid,
      authorName,
      authorRole: user.role,
      likes: [],
      createdAt: now,
      updatedAt: now,
    });

    // Update thread metadata
    await threadRef.update({
      replyCount: FieldValue.increment(1),
      lastReplyAt: now,
      lastReplyByName: authorName,
      updatedAt: now,
    });

    return NextResponse.json({ id: replyRef.id }, { status: 201 });
  } catch (error) {
    console.error('[Forum reply POST]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
