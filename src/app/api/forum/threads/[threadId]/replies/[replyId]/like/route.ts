import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { FieldValue } from 'firebase-admin/firestore';

// ─── POST /api/forum/threads/[threadId]/replies/[replyId]/like ───
// Toggle like on a reply
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string; replyId: string }> }
) {
  try {
    const sessionCookie = request.cookies.get('__session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const uid = decoded.uid;

    const { replyId } = await params;
    const replyRef = adminDb.collection(COLLECTIONS.FORUM_REPLIES).doc(replyId);
    const replyDoc = await replyRef.get();

    if (!replyDoc.exists) {
      return NextResponse.json({ error: 'Réponse introuvable' }, { status: 404 });
    }

    const reply = replyDoc.data()!;
    const likes: string[] = reply.likes || [];
    const hasLiked = likes.includes(uid);

    if (hasLiked) {
      await replyRef.update({ likes: FieldValue.arrayRemove(uid) });
    } else {
      await replyRef.update({ likes: FieldValue.arrayUnion(uid) });
    }

    return NextResponse.json({ liked: !hasLiked, likeCount: hasLiked ? likes.length - 1 : likes.length + 1 });
  } catch (error) {
    console.error('[Forum like POST]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
