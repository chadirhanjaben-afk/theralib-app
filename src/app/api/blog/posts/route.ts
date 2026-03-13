import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * GET /api/blog/posts
 * Public: returns published posts. Admin: returns all posts.
 */
export async function GET(request: NextRequest) {
  try {
    // Check if admin (optional auth)
    let isAdmin = false;
    const sessionCookie = request.cookies.get('__session')?.value;
    if (sessionCookie) {
      try {
        const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
        const userSnap = await adminDb.collection(COLLECTIONS.USERS).doc(decoded.uid).get();
        if (userSnap.exists && userSnap.data()?.role === 'admin') {
          isAdmin = true;
        }
      } catch {
        // Not admin, continue as public
      }
    }

    let query: FirebaseFirestore.Query = adminDb.collection(COLLECTIONS.BLOG_POSTS);

    if (!isAdmin) {
      // Public: only published, sorted by publishedAt
      query = query.where('status', '==', 'published').orderBy('publishedAt', 'desc');
    } else {
      // Admin: all posts, sorted by updatedAt
      query = query.orderBy('updatedAt', 'desc');
    }

    // Pagination
    const limitParam = request.nextUrl.searchParams.get('limit');
    const limit = Math.min(parseInt(limitParam || '20', 10), 50);
    query = query.limit(limit);

    const snap = await query.get();
    const posts = snap.docs.map((doc) => {
      const data = doc.data();
      // Don't send full content in list
      return {
        id: doc.id,
        title: data.title,
        slug: data.slug,
        excerpt: data.excerpt,
        coverImage: data.coverImage || null,
        category: data.category,
        tags: data.tags || [],
        authorName: data.authorName,
        status: data.status,
        publishedAt: data.publishedAt,
        readingTime: data.readingTime,
        viewCount: data.viewCount || 0,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    });

    return NextResponse.json({ posts });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[blog/posts GET] Error:', msg);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * POST /api/blog/posts
 * Admin only: create a new blog post
 */
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('__session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const uid = decoded.uid;

    // Check admin
    const userSnap = await adminDb.collection(COLLECTIONS.USERS).doc(uid).get();
    if (!userSnap.exists || userSnap.data()?.role !== 'admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }
    const user = userSnap.data()!;

    const body = await request.json();
    const {
      title, slug, excerpt, content, coverImage,
      category, tags, status, seoTitle, seoDescription,
    } = body as {
      title: string;
      slug: string;
      excerpt: string;
      content: string;
      coverImage?: string;
      category: string;
      tags?: string[];
      status: 'draft' | 'published';
      seoTitle?: string;
      seoDescription?: string;
    };

    // Validation
    if (!title?.trim() || !slug?.trim() || !content?.trim()) {
      return NextResponse.json(
        { error: 'Titre, slug et contenu sont requis' },
        { status: 400 }
      );
    }

    // Check slug uniqueness
    const existing = await adminDb
      .collection(COLLECTIONS.BLOG_POSTS)
      .where('slug', '==', slug.trim())
      .limit(1)
      .get();

    if (!existing.empty) {
      return NextResponse.json({ error: 'Ce slug existe déjà' }, { status: 400 });
    }

    // Estimate reading time (average 200 words/min in French)
    const wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).length;
    const readingTime = Math.max(1, Math.round(wordCount / 200));

    const now = FieldValue.serverTimestamp();

    const postData: Record<string, unknown> = {
      title: title.trim(),
      slug: slug.trim().toLowerCase(),
      excerpt: excerpt?.trim() || '',
      content,
      coverImage: coverImage || null,
      category: category || 'bien-etre',
      tags: tags || [],
      authorId: uid,
      authorName: user.displayName || user.email,
      status: status || 'draft',
      seoTitle: seoTitle || null,
      seoDescription: seoDescription || null,
      readingTime,
      viewCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    if (status === 'published') {
      postData.publishedAt = now;
    }

    const ref = await adminDb.collection(COLLECTIONS.BLOG_POSTS).add(postData);

    return NextResponse.json({ postId: ref.id }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[blog/posts POST] Error:', msg);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
