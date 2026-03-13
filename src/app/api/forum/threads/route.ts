import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { FieldValue } from 'firebase-admin/firestore';
import { requireAuth, isAuthError, apiError, isRateLimited, getClientIp } from '@/lib/utils/api-helpers';

// ─── GET /api/forum/threads ───
// Pro + Admin only: list threads, with optional ?category= filter
export async function GET(request: NextRequest) {
  try {
    // Auth: pro + admin only
    const authResult = await requireAuth(request, ['professional', 'admin']);
    if (isAuthError(authResult)) return authResult;

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = 20;

    let query = adminDb
      .collection(COLLECTIONS.FORUM_THREADS)
      .orderBy('isPinned', 'desc')
      .orderBy('lastReplyAt', 'desc');

    if (category && category !== 'all') {
      query = adminDb
        .collection(COLLECTIONS.FORUM_THREADS)
        .where('category', '==', category)
        .orderBy('isPinned', 'desc')
        .orderBy('lastReplyAt', 'desc');
    }

    const snapshot = await query.limit(limit + 1).offset((page - 1) * limit).get();
    const threads = snapshot.docs.slice(0, limit).map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title,
        slug: data.slug,
        category: data.category,
        authorName: data.authorName,
        authorRole: data.authorRole,
        isPinned: data.isPinned || false,
        isLocked: data.isLocked || false,
        replyCount: data.replyCount || 0,
        viewCount: data.viewCount || 0,
        lastReplyAt: data.lastReplyAt,
        lastReplyByName: data.lastReplyByName,
        createdAt: data.createdAt,
      };
    });

    const hasMore = snapshot.docs.length > limit;

    return NextResponse.json({ threads, hasMore, page });
  } catch (error) {
    console.error('[Forum threads GET]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// ─── POST /api/forum/threads ───
// Pro + Admin only: create a new thread
export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 threads per minute per IP
    const ip = getClientIp(request);
    if (isRateLimited(`forum-create:${ip}`, 5, 60_000)) {
      return apiError('Trop de requêtes, réessayez dans une minute', 429);
    }

    const authResult = await requireAuth(request, ['professional', 'admin']);
    if (isAuthError(authResult)) return authResult;
    const { user } = authResult;

    const body = await request.json();
    const { title, content, category } = body;

    if (!title?.trim() || !content?.trim() || !category) {
      return apiError('Titre, contenu et catégorie requis', 400);
    }

    if (title.trim().length > 150) {
      return apiError('Le titre ne doit pas dépasser 150 caractères', 400);
    }

    if (content.trim().length > 10000) {
      return apiError('Le contenu ne doit pas dépasser 10 000 caractères', 400);
    }

    const validCategories = [
      'bien-etre', 'meditation', 'nutrition', 'yoga', 'massage',
      'naturopathie', 'sophrologie', 'psychologie', 'pratique-pro', 'general',
    ];
    if (!validCategories.includes(category)) {
      return apiError('Catégorie invalide', 400);
    }

    const uid = user.uid;

    // Generate slug
    const baseSlug = title
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80);

    const slug = `${baseSlug}-${Date.now().toString(36)}`;
    const now = FieldValue.serverTimestamp();

    const docRef = adminDb.collection(COLLECTIONS.FORUM_THREADS).doc();
    await docRef.set({
      title: title.trim(),
      slug,
      content: content.trim(),
      category,
      authorId: uid,
      authorName: user.displayName || 'Anonyme',
      authorRole: user.role,
      isPinned: false,
      isLocked: false,
      replyCount: 0,
      viewCount: 0,
      lastReplyAt: now,
      lastReplyByName: user.displayName || 'Anonyme',
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({ id: docRef.id, slug }, { status: 201 });
  } catch (error) {
    console.error('[Forum threads POST]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
