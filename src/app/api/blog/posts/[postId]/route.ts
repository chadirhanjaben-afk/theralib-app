import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { FieldValue } from 'firebase-admin/firestore';

interface RouteContext {
  params: Promise<{ postId: string }>;
}

/**
 * GET /api/blog/posts/[postId]
 * Get a single post by ID or slug (public for published, admin for all)
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { postId } = await context.params;

    // Try by ID first, then by slug
    let postSnap = await adminDb.collection(COLLECTIONS.BLOG_POSTS).doc(postId).get();

    if (!postSnap.exists) {
      // Try by slug
      const slugQuery = await adminDb
        .collection(COLLECTIONS.BLOG_POSTS)
        .where('slug', '==', postId)
        .limit(1)
        .get();

      if (slugQuery.empty) {
        return NextResponse.json({ error: 'Article introuvable' }, { status: 404 });
      }
      postSnap = slugQuery.docs[0];
    }

    const post = { id: postSnap.id, ...postSnap.data() };
    const postData = postSnap.data()!;

    // If draft, only admin can see
    if (postData.status === 'draft') {
      const sessionCookie = request.cookies.get('__session')?.value;
      if (!sessionCookie) {
        return NextResponse.json({ error: 'Article introuvable' }, { status: 404 });
      }
      try {
        const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
        const userSnap = await adminDb.collection(COLLECTIONS.USERS).doc(decoded.uid).get();
        if (!userSnap.exists || userSnap.data()?.role !== 'admin') {
          return NextResponse.json({ error: 'Article introuvable' }, { status: 404 });
        }
      } catch {
        return NextResponse.json({ error: 'Article introuvable' }, { status: 404 });
      }
    } else {
      // Increment view count for published posts (fire-and-forget)
      adminDb
        .collection(COLLECTIONS.BLOG_POSTS)
        .doc(postSnap.id)
        .update({ viewCount: FieldValue.increment(1) })
        .catch(() => {});
    }

    return NextResponse.json({ post });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[blog/posts/[id] GET] Error:', msg);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * PUT /api/blog/posts/[postId]
 * Admin only: update a blog post
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { postId } = await context.params;
    const sessionCookie = request.cookies.get('__session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const uid = decoded.uid;

    const userSnap = await adminDb.collection(COLLECTIONS.USERS).doc(uid).get();
    if (!userSnap.exists || userSnap.data()?.role !== 'admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const postRef = adminDb.collection(COLLECTIONS.BLOG_POSTS).doc(postId);
    const postSnap = await postRef.get();

    if (!postSnap.exists) {
      return NextResponse.json({ error: 'Article introuvable' }, { status: 404 });
    }

    const body = await request.json();
    const {
      title, slug, excerpt, content, coverImage,
      category, tags, status, seoTitle, seoDescription,
    } = body;

    const update: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (title !== undefined) update.title = title.trim();
    if (slug !== undefined) {
      // Check uniqueness if slug changed
      const currentSlug = postSnap.data()?.slug;
      if (slug !== currentSlug) {
        const existing = await adminDb
          .collection(COLLECTIONS.BLOG_POSTS)
          .where('slug', '==', slug.trim())
          .limit(1)
          .get();
        if (!existing.empty) {
          return NextResponse.json({ error: 'Ce slug existe déjà' }, { status: 400 });
        }
        update.slug = slug.trim().toLowerCase();
      }
    }
    if (excerpt !== undefined) update.excerpt = excerpt.trim();
    if (content !== undefined) {
      update.content = content;
      // Re-calculate reading time
      const wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).length;
      update.readingTime = Math.max(1, Math.round(wordCount / 200));
    }
    if (coverImage !== undefined) update.coverImage = coverImage || null;
    if (category !== undefined) update.category = category;
    if (tags !== undefined) update.tags = tags;
    if (seoTitle !== undefined) update.seoTitle = seoTitle || null;
    if (seoDescription !== undefined) update.seoDescription = seoDescription || null;

    // Handle publish transition
    if (status !== undefined) {
      update.status = status;
      const currentStatus = postSnap.data()?.status;
      if (status === 'published' && currentStatus === 'draft') {
        update.publishedAt = FieldValue.serverTimestamp();
      }
    }

    await postRef.update(update);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[blog/posts/[id] PUT] Error:', msg);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * DELETE /api/blog/posts/[postId]
 * Admin only: delete a blog post
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { postId } = await context.params;
    const sessionCookie = request.cookies.get('__session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const uid = decoded.uid;

    const userSnap = await adminDb.collection(COLLECTIONS.USERS).doc(uid).get();
    if (!userSnap.exists || userSnap.data()?.role !== 'admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const postRef = adminDb.collection(COLLECTIONS.BLOG_POSTS).doc(postId);
    const postSnap = await postRef.get();

    if (!postSnap.exists) {
      return NextResponse.json({ error: 'Article introuvable' }, { status: 404 });
    }

    await postRef.delete();

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[blog/posts/[id] DELETE] Error:', msg);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
